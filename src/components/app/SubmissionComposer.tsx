import {
  Check,
  FileText,
  Image,
  Link2,
  LoaderCircle,
  Paperclip,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppButton } from "./Button";

export type SubmissionEvidenceKind =
  | "TEXT"
  | "FILE"
  | "IMAGE"
  | "DOCUMENT"
  | "REPOSITORY"
  | "LINK";
export type SubmissionRequirement = {
  key: string;
  title: string;
  instructions: string;
  kind: SubmissionEvidenceKind;
  required: boolean;
  minItems: number;
  maxItems: number;
  acceptedMimeTypes?: string[];
};
export type SubmissionItem = {
  id: string;
  requirementKey: string;
  kind: SubmissionEvidenceKind;
  textValue: string | null;
  url: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  downloadUrl: string | null;
};

type DraftResponse = {
  requirements: {
    version: 1;
    instructions?: string;
    items: SubmissionRequirement[];
  };
  draft: { id: string; notes: string | null; items: SubmissionItem[] };
};

export function SubmissionComposer({
  projectId,
  checklistComplete,
  revision,
  onSubmitted,
  onNotice,
}: {
  projectId: string;
  checklistComplete: boolean;
  revision?: boolean;
  onSubmitted: () => Promise<void>;
  onNotice: (message: string, tone?: "success" | "error" | "neutral") => void;
}) {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useRef(false);

  const nonFileItems = useMemo(
    () =>
      data?.requirements.items
        .filter((requirement) =>
          ["TEXT", "LINK", "REPOSITORY"].includes(requirement.kind),
        )
        .map((requirement) => ({
          requirementKey: requirement.key,
          kind: requirement.kind,
          textValue:
            requirement.kind === "TEXT" ? (values[requirement.key] ?? "") : null,
          url: requirement.kind === "TEXT" ? null : (values[requirement.key] ?? ""),
        }))
        .filter((item) => item.textValue || item.url) ?? [],
    [data, values],
  );

  const load = useCallback(async () => {
    setError("");
    const response = await fetch(`/api/projects/${projectId}/submission-draft`, {
      credentials: "include",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(payload.error ?? "Unable to load your submission draft.");
    const next = payload as DraftResponse;
    const nextValues: Record<string, string> = {};
    next.draft.items.forEach((item) => {
      if (item.kind === "TEXT" && item.textValue)
        nextValues[item.requirementKey] = item.textValue;
      if (["LINK", "REPOSITORY"].includes(item.kind) && item.url)
        nextValues[item.requirementKey] = item.url;
    });
    setData(next);
    setNotes(next.draft.notes ?? "");
    setValues(nextValues);
    hydrated.current = true;
  }, [projectId]);

  useEffect(() => {
    hydrated.current = false;
    load().catch((caught) =>
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load your submission draft.",
      ),
    );
  }, [load]);

  useEffect(() => {
    if (!hydrated.current || !data) return;
    const timer = window.setTimeout(async () => {
      const response = await fetch(
        `/api/projects/${projectId}/submission-draft`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, items: nonFileItems }),
        },
      );
      if (!response.ok) setError("Your latest evidence could not be autosaved.");
      else setError("");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [data, nonFileItems, notes, projectId]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    data?.requirements.items.forEach((requirement) => {
      const uploaded = data.draft.items.filter(
        (item) => item.requirementKey === requirement.key,
      ).length;
      const value = values[requirement.key]?.trim() ?? "";
      const typed =
        requirement.kind === "REPOSITORY"
          ? isValidRepository(value)
            ? 1
            : 0
          : requirement.kind === "LINK"
            ? isValidHttps(value)
              ? 1
              : 0
            : value
              ? 1
              : 0;
      result[requirement.key] = ["FILE", "IMAGE", "DOCUMENT"].includes(
        requirement.kind,
      )
        ? uploaded
        : typed;
    });
    return result;
  }, [data, values]);

  const missing =
    data?.requirements.items.filter(
      (requirement) =>
        requirement.required &&
        (counts[requirement.key] ?? 0) < requirement.minItems,
    ) ?? [];
  const ready =
    checklistComplete &&
    missing.length === 0 &&
    !Object.keys(uploadProgress).length;
  const readyCount = data
    ? data.requirements.items.length - missing.length
    : 0;
  const totalRequirements = data?.requirements.items.length ?? 0;

  const uploadFile = (requirement: SubmissionRequirement, file: File) => {
    const body = new FormData();
    body.append("requirementKey", requirement.key);
    body.append("file", file);
    const request = new XMLHttpRequest();
    const progressKey = `${requirement.key}:${file.name}`;
    setUploadProgress((current) => ({ ...current, [progressKey]: 0 }));
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        setUploadProgress((current) => ({
          ...current,
          [progressKey]: Math.round((event.loaded / event.total) * 100),
        }));
    });
    request.addEventListener("load", async () => {
      setUploadProgress((current) => {
        const next = { ...current };
        delete next[progressKey];
        return next;
      });
      if (request.status >= 200 && request.status < 300) await load();
      else {
        const payload = JSON.parse(request.responseText || "{}");
        onNotice(payload.error ?? "Unable to upload that file.", "error");
      }
    });
    request.addEventListener("error", () => {
      setUploadProgress((current) => {
        const next = { ...current };
        delete next[progressKey];
        return next;
      });
      onNotice("Upload failed. Check your connection and try again.", "error");
    });
    request.open("POST", `/api/projects/${projectId}/submission-draft/files`);
    request.withCredentials = true;
    request.send(body);
  };

  const removeItem = async (item: SubmissionItem) => {
    const response = await fetch(
      `/api/projects/${projectId}/submission-draft/items/${item.id}`,
      { method: "DELETE", credentials: "include" },
    );
    if (!response.ok) {
      onNotice("Unable to remove that attachment.", "error");
      return;
    }
    await load();
  };

  const finalize = async () => {
    setBusy(true);
    try {
      const saved = await fetch(
        `/api/projects/${projectId}/submission-draft`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, items: nonFileItems }),
        },
      );
      if (!saved.ok) throw new Error("Your latest evidence could not be saved.");
      const response = await fetch(`/api/projects/${projectId}/submissions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error ?? "Unable to submit your work.");
      onNotice(
        revision
          ? "Updated work submitted for review."
          : "Work submitted for review.",
        "success",
      );
      await onSubmitted();
    } catch (caught) {
      onNotice(
        caught instanceof Error ? caught.message : "Unable to submit your work.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  if (error && !data)
    return (
      <div className="app-submission-error">
        <p>{error}</p>
        <AppButton size="sm" variant="secondary" onClick={() => void load()}>
          Try again
        </AppButton>
      </div>
    );
  if (!data)
    return (
      <div className="app-submission-loading" role="status">
        <LoaderCircle size={18} aria-hidden /> Loading submission requirements…
      </div>
    );

  const statusCopy = missing.length
      ? `${missing.map((item) => item.title).join(", ")} still ${
          missing.length === 1 ? "needs" : "need"
        } evidence.`
      : "Your package is ready for review.";

  return (
    <div className="app-submission-composer">
      <div
        className="app-submission-progress"
        data-ready={missing.length === 0 ? "true" : undefined}
        aria-label={`${readyCount} of ${totalRequirements} evidence requirements complete`}
      >
        <div className="app-submission-progress-copy">
          <strong>
            {readyCount}/{totalRequirements} evidence ready
          </strong>
          {data.requirements.instructions ? (
            <span>{data.requirements.instructions}</span>
          ) : (
            <span>
              {checklistComplete
                ? "Add what this project asks for, then submit."
                : "Add what this project asks for as you complete the roadmap."}
            </span>
          )}
        </div>
        <div
          className="app-submission-progress-track"
          aria-hidden
        >
          <span
            style={{
              width: `${
                totalRequirements
                  ? Math.round((readyCount / totalRequirements) * 100)
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      <div className="app-submission-requirements">
        {data.requirements.items.map((requirement) => {
          const items = data.draft.items.filter(
            (item) => item.requirementKey === requirement.key,
          );
          const uploading = Object.entries(uploadProgress).filter(([key]) =>
            key.startsWith(`${requirement.key}:`),
          );
          const complete = (counts[requirement.key] ?? 0) >= requirement.minItems;
          return (
            <section
              key={requirement.key}
              className="app-submission-requirement"
              data-complete={complete ? "true" : undefined}
            >
              <div className="app-submission-requirement-head">
                <div className="app-submission-requirement-copy">
                  <strong>
                    {complete ? (
                      <Check size={14} aria-hidden className="app-submission-check" />
                    ) : null}
                    {requirement.title}
                  </strong>
                  <p>{requirement.instructions}</p>
                </div>
                <span
                  className="app-submission-req-tag"
                  data-required={requirement.required ? "true" : undefined}
                >
                  {requirement.required ? "Required" : "Optional"}
                </span>
              </div>
              {requirement.kind === "TEXT" ? (
                <textarea
                  aria-label={requirement.title}
                  value={values[requirement.key] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [requirement.key]: event.target.value,
                    }))
                  }
                  placeholder="Add the review-ready text here…"
                />
              ) : ["LINK", "REPOSITORY"].includes(requirement.kind) ? (
                <div className="app-submission-url">
                  <Link2 size={16} aria-hidden />
                  <input
                    type="url"
                    aria-label={requirement.title}
                    value={values[requirement.key] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [requirement.key]: event.target.value,
                      }))
                    }
                    placeholder={
                      requirement.kind === "REPOSITORY"
                        ? "https://github.com/you/project"
                        : "https://…"
                    }
                  />
                </div>
              ) : (
                <label className="app-submission-dropzone">
                  <UploadCloud size={18} aria-hidden />
                  <span>
                    Choose{" "}
                    {requirement.kind === "IMAGE" ? "images" : "files"}
                  </span>
                  <small>Up to 25 MB each</small>
                  <input
                    type="file"
                    multiple={requirement.maxItems > 1}
                    accept={requirement.acceptedMimeTypes?.join(",")}
                    onChange={(event) =>
                      Array.from(event.target.files ?? [])
                        .slice(0, requirement.maxItems - items.length)
                        .forEach((file) => uploadFile(requirement, file))
                    }
                  />
                </label>
              )}
              {items.length > 0 ? (
                <div className="app-submission-items">
                  {items.map((item) => (
                    <div key={item.id} className="app-submission-item">
                      {item.mimeType?.startsWith("image/") &&
                      item.downloadUrl ? (
                        <img
                          src={`${item.downloadUrl}?preview=1`}
                          alt="Uploaded evidence preview"
                        />
                      ) : item.kind === "IMAGE" ? (
                        <Image size={16} aria-hidden />
                      ) : item.kind === "DOCUMENT" ? (
                        <FileText size={16} aria-hidden />
                      ) : (
                        <Paperclip size={16} aria-hidden />
                      )}
                      <a
                        href={item.downloadUrl ?? item.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.originalFileName ?? item.url ?? item.textValue}
                      </a>
                      {item.sizeBytes ? (
                        <small>{formatBytes(item.sizeBytes)}</small>
                      ) : null}
                      {item.downloadUrl ? (
                        <button
                          type="button"
                          onClick={() => void removeItem(item)}
                          aria-label={`Remove ${item.originalFileName}`}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {uploading.map(([key, progress]) => (
                <div
                  key={key}
                  className="app-upload-progress"
                  role="status"
                  aria-live="polite"
                >
                  <span style={{ width: `${progress}%` }} />
                  <small>
                    {key.split(":").slice(1).join(":")} · {progress}%
                  </small>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <label className="app-submission-notes">
        <span>
          Note for the reviewer <small>Optional</small>
        </span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What did you finish, and where should the reviewer look first?"
        />
      </label>

      {error ? <p className="app-submission-inline-error">{error}</p> : null}

      {checklistComplete ? (
        <div
          className="app-submission-actions"
          data-ready={ready ? "true" : undefined}
        >
          <p>{statusCopy}</p>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            disabled={!ready || busy}
            aria-busy={busy}
            onClick={() => void finalize()}
          >
            {busy
              ? "Submitting…"
              : revision
                ? "Resubmit for review"
                : "Submit for review"}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024)
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidHttps(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isValidRepository(value: string) {
  if (!isValidHttps(value)) return false;
  const url = new URL(value);
  return (
    ["github.com", "gitlab.com", "bitbucket.org"].includes(
      url.hostname.toLowerCase(),
    ) && url.pathname.split("/").filter(Boolean).length >= 2
  );
}
