import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

export interface SubmissionStorageProvider {
  scan?(buffer: Buffer): Promise<void>;
  put(buffer: Buffer, mimeType: string): Promise<string>;
  exists(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
  download(
    key: string,
    filename: string,
    mimeType: string,
    disposition?: "attachment" | "inline",
  ): Promise<{ url?: string; buffer?: Buffer }>;
}

let provider: SubmissionStorageProvider | null = null;

export function getSubmissionStorage() {
  provider ??= withMalwareScanner(env.submissionStorageProvider === "r2" ? createR2Storage() : createLocalStorage());
  return provider;
}

function withMalwareScanner(storage: SubmissionStorageProvider): SubmissionStorageProvider {
  if (!env.clamavHost) {
    if (env.nodeEnv === "production") {
      return {
        ...storage,
        async scan() {
          throw new Error("Uploads are unavailable until malware scanning is configured.");
        },
      };
    }
    return storage;
  }
  return { ...storage, scan: scanWithClamAV };
}

function scanWithClamAV(buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: env.clamavHost, port: env.clamavPort });
    const responseChunks: Buffer[] = [];
    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(8_000, () => fail(new Error("Malware scan timed out.")));
    socket.on("error", () => fail(new Error("Malware scanner is unavailable.")));
    socket.on("data", (chunk) => responseChunks.push(chunk));
    socket.on("end", () => {
      const result = Buffer.concat(responseChunks).toString("utf8");
      if (/\bOK\b/.test(result)) resolve();
      else if (/\bFOUND\b/.test(result)) reject(new Error("The uploaded file failed malware scanning."));
      else reject(new Error("Malware scanner returned an invalid response."));
    });
    socket.on("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0"));
      for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
        const chunk = buffer.subarray(offset, Math.min(buffer.length, offset + 64 * 1024));
        const length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
  });
}

function createLocalStorage(): SubmissionStorageProvider {
  const root = path.resolve(process.cwd(), ".local", "submission-uploads");
  return {
    async put(buffer) {
      await mkdir(root, { recursive: true });
      const key = randomUUID();
      await writeFile(path.join(root, key), buffer, { flag: "wx" });
      return key;
    },
    async exists(key) {
      try {
        await stat(safeLocalPath(root, key));
        return true;
      } catch {
        return false;
      }
    },
    async remove(key) {
      await rm(safeLocalPath(root, key), { force: true });
    },
    async download(key) {
      return { buffer: await readFile(safeLocalPath(root, key)) };
    },
  };
}

function createR2Storage(): SubmissionStorageProvider {
  const { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName } = env;
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
    throw new Error("R2 submission storage is not configured.");
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
  });
  return {
    async put(buffer, mimeType) {
      const key = randomUUID();
      await client.send(new PutObjectCommand({ Bucket: r2BucketName, Key: key, Body: buffer, ContentType: mimeType }));
      return key;
    },
    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: r2BucketName, Key: key }));
        return true;
      } catch {
        return false;
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: r2BucketName, Key: key }));
    },
    async download(key, filename, mimeType, disposition = "attachment") {
      const command = new GetObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        ResponseContentType: mimeType,
        ResponseContentDisposition: `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      });
      return { url: await getSignedUrl(client, command, { expiresIn: 300 }) };
    },
  };
}

function safeLocalPath(root: string, key: string) {
  if (!/^[a-f0-9-]{36}$/i.test(key)) throw new Error("Invalid storage key.");
  const resolved = path.resolve(root, key);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage path.");
  return resolved;
}
