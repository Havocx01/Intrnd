import { getAIClient, getAIModel, getAIReasonerModel } from "./client.js";
import {
  buildExperienceScorePrompt,
  buildOpportunityParsePrompt,
  buildProjectReviewPrompt,
  buildRecommendationPrompt,
  buildResumeBulletsPrompt,
} from "./prompts.js";
import type {
  ExperienceScoreResponse,
  OpportunityParseResponse,
  ProjectReviewResponse,
  ProjectSummary,
  RecommendationResponse,
  ResumeBulletsResponse,
  StudentContext,
} from "./types.js";

// Skip optional parameters that some reasoning model endpoints reject.
function isReasoningModel(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes("r1") || m.includes("reasoner") || m.includes("o1") || m.includes("think");
}

async function callAI<T>(prompt: string, model: string): Promise<T> {
  const client = getAIClient();
  const reasoning = isReasoningModel(model);

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    ...(reasoning ? {} : { temperature: 0.7, response_format: { type: "json_object" as const } }),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from AI model");
  }

  return parseJsonLoose<T>(stripReasoning(content));
}

// Strip reasoning wrappers before parsing the answer as JSON.
function stripReasoning(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// Try strict JSON first, then recover JSON wrapped in fences or prose.
function parseJsonLoose<T>(raw: string): T {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim()) as T;
    } catch {
    }
  }

  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  const candidate = objMatch && (!arrMatch || objMatch.index! <= arrMatch.index!) ? objMatch[0] : arrMatch?.[0];

  if (candidate) {
    return JSON.parse(candidate) as T;
  }

  throw new Error("Failed to parse JSON from DeepSeek response");
}

export async function generateRecommendations(
  student: StudentContext,
  projects: ProjectSummary[],
  completedSummary: string,
): Promise<RecommendationResponse> {
  const prompt = buildRecommendationPrompt(student, projects, completedSummary);
  return callAI<RecommendationResponse>(prompt, getAIModel());
}

export async function reviewProject(
  experience: {
    title: string;
    description: string | null;
    experienceType: string;
    skills: string | null;
    evidenceUrl: string | null;
    outcome: string | null;
  },
  student: StudentContext,
): Promise<ProjectReviewResponse> {
  const prompt = buildProjectReviewPrompt(experience, student);
  return callAI<ProjectReviewResponse>(prompt, getAIReasonerModel());
}

export async function generateResumeBullets(
  experience: { title: string; description: string | null; skills: string | null; outcome: string | null },
  targetRoles: string | null,
): Promise<ResumeBulletsResponse> {
  const prompt = buildResumeBulletsPrompt(experience, targetRoles);
  return callAI<ResumeBulletsResponse>(prompt, getAIModel());
}

export async function scoreExperience(student: StudentContext, experiencesList: string): Promise<ExperienceScoreResponse> {
  const prompt = buildExperienceScorePrompt(student, experiencesList);
  return callAI<ExperienceScoreResponse>(prompt, getAIReasonerModel());
}

export async function parseOpportunities(url: string, schoolName: string, pageContent: string): Promise<OpportunityParseResponse> {
  const prompt = buildOpportunityParsePrompt(url, schoolName, pageContent);
  return callAI<OpportunityParseResponse>(prompt, getAIModel());
}

export function computeRankScore(
  project: {
    resumeValue: number | null;
    uniqueness: number | null;
    proofQuality: number | null;
    difficulty: string | null;
    estimatedHours: string | null;
  },
  student: StudentContext,
): number {
  const resumeVal = project.resumeValue ?? 5;
  const unique = project.uniqueness ?? 5;
  const proof = project.proofQuality ?? 5;

  const skillMatch = computeSkillMatch(project, student);
  const relevance = computeRelevance(project, student);
  const completionLikely = computeCompletionLikelihood(project, student);
  const difficultyFit = computeDifficultyFit(project, student);

  return (
    (resumeVal * 0.2 + skillMatch * 0.2 + relevance * 0.15 + unique * 0.15 + proof * 0.1 + completionLikely * 0.1 + difficultyFit * 0.1) /
    10
  );
}

function computeSkillMatch(_project: { difficulty: string | null; estimatedHours: string | null }, _student: StudentContext): number {
  return 6;
}

function computeRelevance(_project: { difficulty: string | null; estimatedHours: string | null }, _student: StudentContext): number {
  return 6;
}

function computeCompletionLikelihood(
  project: { difficulty: string | null; estimatedHours: string | null },
  _student: StudentContext,
): number {
  const hours = parseInt(project.estimatedHours ?? "10", 10);
  if (hours <= 5) return 9;
  if (hours <= 15) return 7;
  if (hours <= 30) return 5;
  return 3;
}

function computeDifficultyFit(project: { difficulty: string | null; estimatedHours: string | null }, student: StudentContext): number {
  const diff = (project.difficulty ?? "medium").toLowerCase();
  const year = student.gradYear ? new Date().getFullYear() - (student.gradYear - 4) : 2;

  if (diff === "beginner" || diff === "easy") {
    return year <= 1 ? 8 : year <= 2 ? 6 : 4;
  }
  if (diff === "intermediate" || diff === "medium") {
    return year <= 1 ? 5 : year <= 3 ? 8 : 6;
  }
  return year <= 2 ? 4 : 8;
}
