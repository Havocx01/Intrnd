import fetch from "node-fetch";

const cip2020BrowseUrl = "https://nces.ed.gov/ipeds/cipcode/browse.aspx?y=56";
const cacheTtlMs = 1000 * 60 * 60 * 24;

export type MajorOption = { cipCode: string; major: string };

let cachedMajors: MajorOption[] | null = null;
let cacheExpiresAt = 0;

const fallbackMajors: MajorOption[] = [
  { cipCode: "52.0201", major: "Business Administration and Management" },
  { cipCode: "11.0701", major: "Computer Science" },
  { cipCode: "30.7001", major: "Data Science" },
  { cipCode: "52.0801", major: "Finance" },
  { cipCode: "52.1401", major: "Marketing" },
  { cipCode: "51.2201", major: "Public Health" },
  { cipCode: "42.0101", major: "Psychology" },
  { cipCode: "24.0102", major: "General Studies" },
];

export async function getMajors() {
  const now = Date.now();

  if (cachedMajors && now < cacheExpiresAt) {
    return cachedMajors;
  }

  try {
    const response = await fetch(cip2020BrowseUrl);

    if (!response.ok) {
      throw new Error(`NCES CIP request failed with ${response.status}`);
    }

    const html = await response.text();
    const majors = parseCipMajors(html);

    cachedMajors = majors.length > 0 ? majors : fallbackMajors;
    cacheExpiresAt = now + cacheTtlMs;

    return cachedMajors;
  } catch (error) {
    console.error("Error fetching NCES CIP majors:", error);
    cachedMajors = cachedMajors ?? fallbackMajors;
    cacheExpiresAt = now + 1000 * 60 * 10;
    return cachedMajors;
  }
}

function parseCipMajors(html: string) {
  const matches = html.matchAll(/\b(\d{2}\.\d{4})\)\s*([^<\r\n]+)/g);
  const majorsByCode = new Map<string, MajorOption>();

  for (const match of matches) {
    const cipCode = match[1];
    const major = cleanMajorName(match[2]);

    if (!major || major.toLowerCase().includes("reserved")) {
      continue;
    }

    majorsByCode.set(cipCode, { cipCode, major });
  }

  return Array.from(majorsByCode.values()).sort((a, b) => a.major.localeCompare(b.major));
}

function cleanMajorName(value: string) {
  return decodeHtml(value).replace(/\s+/g, " ").replace(/\.$/, "").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
