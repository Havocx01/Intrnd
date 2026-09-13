import { parseOpportunities } from "../ai/service.js";
import type { ParsedOpportunity } from "../ai/types.js";
import { prisma } from "../db/prisma.js";
import { fetchPageContent } from "./fetcher.js";
import { extractTextContent } from "./parser.js";

export async function scrapeAndExtractOpportunities(
  sourceId: string,
): Promise<{ opportunities: ParsedOpportunity[]; projectsCreated: number }> {
  const source = await prisma.universityOpportunitySource.findUnique({ where: { id: sourceId } });

  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  const html = await fetchPageContent(source.url);
  const textContent = extractTextContent(html, source.url);
  const result = await parseOpportunities(source.url, source.schoolName, textContent);

  await prisma.universityOpportunitySource.update({ where: { id: sourceId }, data: { lastCheckedAt: new Date() } });

  let projectsCreated = 0;

  for (const opp of result.opportunities) {
    const existingProject = await prisma.project.findFirst({
      where: { title: opp.title, schoolName: source.schoolName, sourceType: "UNIVERSITY_SCRAPED" },
    });

    if (existingProject) {
      await prisma.project.update({ where: { id: existingProject.id }, data: { lastSeenAt: new Date() } });
      continue;
    }

    // Attribute imported projects to the first admin account.
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });

    if (!adminUser) continue;

    await prisma.project.create({
      data: {
        title: opp.title,
        description: opp.description,
        sourceType: "UNIVERSITY_SCRAPED",
        opportunityType: mapOpportunityType(opp.type),
        moderationStatus: "PENDING_REVIEW",
        visibility: "PUBLIC",
        schoolName: source.schoolName,
        externalUrl: opp.url,
        deadline: opp.deadline ? parseDateSafe(opp.deadline) : null,
        majorTags: opp.majors.join(", "),
        skillTags: opp.skills.join(", "),
        skills: opp.skills.join(", "),
        estimatedHours: opp.timeCommitment,
        status: "DRAFT",
        scrapedAt: new Date(),
        lastSeenAt: new Date(),
        createdById: adminUser.id,
      },
    });

    projectsCreated++;
  }

  return { opportunities: result.opportunities, projectsCreated };
}

export async function scrapeAllActiveSources(): Promise<{
  sourcesProcessed: number;
  totalOpportunities: number;
  totalProjectsCreated: number;
  errors: string[];
}> {
  const sources = await prisma.universityOpportunitySource.findMany({ where: { status: "ACTIVE" } });

  let totalOpportunities = 0;
  let totalProjectsCreated = 0;
  const errors: string[] = [];

  for (const source of sources) {
    try {
      const result = await scrapeAndExtractOpportunities(source.id);
      totalOpportunities += result.opportunities.length;
      totalProjectsCreated += result.projectsCreated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${source.sourceName} (${source.url}): ${message}`);
    }
  }

  return { sourcesProcessed: sources.length, totalOpportunities, totalProjectsCreated, errors };
}

function mapOpportunityType(type: string): string {
  const mapping: Record<string, string> = {
    COMPETITION: "COMPETITION",
    CLUB: "CLUB",
    RESEARCH: "RESEARCH",
    HACKATHON: "HACKATHON",
    PROJECT_TEAM: "PROJECT_TEAM",
    ORGANIZATION: "ORGANIZATION",
  };
  return mapping[type] ?? "PROJECT";
}

function parseDateSafe(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
