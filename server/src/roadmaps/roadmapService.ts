import { createHash } from "node:crypto";
import {
  buildProfileFeatures,
  normalizedProfileContext,
  PROFILE_FEATURE_VERSION,
  skillMatches,
  type ProfileFeatureSnapshot,
} from "../personalization/profileFeatureService.js";
import type {
  CanonicalRoadmapPlan,
  CheckpointProgress,
  RoadmapPreferences,
  RoadmapProfile,
  RoadmapPersonalizationContext,
  RoadmapSnapshot,
  RoadmapSnapshotV2,
  RoadmapSupportLevel,
  PersonalizedCheckpoint,
} from "./types.js";

export const ROADMAP_SERVICE_VERSION = "roadmap-v2" as const;

export function normalizeRoadmapPreferences(value: unknown, difficulty?: string | null): RoadmapPreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const weeklyHours = Number(candidate.weeklyHours);
  const supportLevel = String(candidate.supportLevel ?? "").toUpperCase() as RoadmapSupportLevel;
  if (!Number.isInteger(weeklyHours) || weeklyHours < 1 || weeklyHours > 40) return null;
  if (!["GUIDED", "STANDARD", "ACCELERATED"].includes(supportLevel)) return null;
  return { weeklyHours, supportLevel };
}

export function defaultRoadmapPreferences(difficulty?: string | null): RoadmapPreferences {
  return { weeklyHours: 5, supportLevel: String(difficulty).toUpperCase() === "BEGINNER" ? "GUIDED" : "STANDARD" };
}

export function personalizeRoadmap(
  plan: CanonicalRoadmapPlan,
  preferences: RoadmapPreferences,
  profile: RoadmapProfile | ProfileFeatureSnapshot | null | undefined,
  generatedAt = new Date(),
): RoadmapSnapshotV2 {
  const featureSnapshot = isFeatureSnapshot(profile) ? profile : buildProfileFeatures(profile ?? null);
  return personalizeRoadmapFromContext(
    plan,
    preferences,
    normalizedProfileContext(featureSnapshot.features),
    featureSnapshot.profileHash,
    generatedAt,
  );
}

export function personalizeRoadmapFromContext(
  plan: CanonicalRoadmapPlan,
  preferences: RoadmapPreferences,
  context: RoadmapPersonalizationContext,
  profileFeatureHash = contextHash(context),
  generatedAt = new Date(),
): RoadmapSnapshotV2 {
  let elapsedMinutes = 0;
  const checkpoints = plan.checkpoints.map((checkpoint) => {
    const estimatedMinutes = checkpoint.estimatedMinutesBySupport[preferences.supportLevel];
    const weekNumber = Math.max(1, Math.floor(elapsedMinutes / (preferences.weeklyHours * 60)) + 1);
    elapsedMinutes += estimatedMinutes;
    const requiredSkills = checkpoint.requiredSkills.filter(Boolean);
    const knownSkills = requiredSkills.filter((skill) => skillMatches(context.currentSkills, skill));
    const skillsToPrepare = prioritizeMissingSkills(
      requiredSkills.filter((skill) => !knownSkills.includes(skill)),
      context,
    );
    return {
      id: checkpoint.id,
      title: checkpoint.title,
      objective: checkpoint.objective,
      actions: checkpoint.actionsBySupport[preferences.supportLevel],
      requiredOutput: checkpoint.requiredOutput,
      definitionOfDone: checkpoint.definitionOfDone,
      estimatedMinutes,
      resources: prioritizeResources(checkpoint.resourcesBySupport[preferences.supportLevel], context, skillsToPrepare),
      requiredSkills,
      knownSkills,
      skillsToPrepare,
      submissionRequirementKeys: checkpoint.submissionRequirementKeys,
      prerequisiteCheckpointIds: checkpoint.prerequisiteCheckpointIds,
      completionMode: checkpoint.completionMode,
      weekNumber,
    };
  });
  return {
    schemaVersion: 2,
    roadmapServiceVersion: ROADMAP_SERVICE_VERSION,
    profileFeatureVersion: PROFILE_FEATURE_VERSION,
    profileFeatureHash,
    personalizationContext: context,
    personalizationSummary: buildSummary(
      preferences,
      context,
      checkpoints.flatMap((checkpoint) => checkpoint.skillsToPrepare),
    ),
    projectId: plan.projectId,
    projectTitle: plan.projectTitle,
    canonicalPlanVersion: plan.version,
    preferences,
    generatedAt: generatedAt.toISOString(),
    totalEstimatedMinutes: elapsedMinutes,
    estimatedWeeks: Math.max(1, Math.ceil(elapsedMinutes / (preferences.weeklyHours * 60))),
    checkpoints,
  };
}

export function emptyCheckpointProgress(snapshot: RoadmapSnapshot): CheckpointProgress {
  return {
    schemaVersion: 1,
    entries: snapshot.checkpoints.map((checkpoint) => ({ checkpointId: checkpoint.id, completed: false, completedAt: null, note: null })),
  };
}

export function normalizeCheckpointProgress(value: unknown, snapshot: RoadmapSnapshot): CheckpointProgress {
  const raw =
    value && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as CheckpointProgress).entries)
      ? (value as CheckpointProgress).entries
      : [];
  const byId = new Map(raw.map((entry) => [entry.checkpointId, entry]));
  return {
    schemaVersion: 1,
    entries: snapshot.checkpoints.map((checkpoint) => {
      const current = byId.get(checkpoint.id);
      return {
        checkpointId: checkpoint.id,
        completed: Boolean(current?.completed),
        completedAt: typeof current?.completedAt === "string" ? current.completedAt : null,
        note: typeof current?.note === "string" ? current.note : null,
      };
    }),
  };
}

export function parseRoadmapSnapshot(value: unknown): RoadmapSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<RoadmapSnapshot>;
  const validVersion =
    (candidate.schemaVersion === 1 && candidate.roadmapServiceVersion === "roadmap-v1") ||
    (candidate.schemaVersion === 2 && candidate.roadmapServiceVersion === ROADMAP_SERVICE_VERSION);
  if (!validVersion || !Array.isArray(candidate.checkpoints)) return null;
  return candidate as RoadmapSnapshot;
}

export function roadmapContextFromSnapshot(snapshot: RoadmapSnapshot): RoadmapPersonalizationContext {
  if (snapshot.schemaVersion === 2) return snapshot.personalizationContext;
  return {
    currentSkills: unique(snapshot.checkpoints.flatMap((checkpoint) => checkpoint.knownSkills)),
    desiredSkills: unique(snapshot.checkpoints.flatMap((checkpoint) => checkpoint.skillsToPrepare)),
    targetRoles: [],
    projectPreferences: [],
  };
}

export function parseRoadmapPreferences(value: unknown): RoadmapPreferences | null {
  return normalizeRoadmapPreferences(value);
}

export type CheckpointCompletionErrorCode =
  | "CHECKPOINT_PREREQUISITE_INCOMPLETE"
  | "CHECKPOINT_NOTE_REQUIRED"
  | "CHECKPOINT_EVIDENCE_REQUIRED";

export function checkpointCompletionError(input: {
  checkpoint: PersonalizedCheckpoint;
  progress: CheckpointProgress;
  completed: boolean;
  note: string | null;
  missingEvidenceKeys?: string[];
}): CheckpointCompletionErrorCode | null {
  if (!input.completed) return null;
  const completedIds = new Set(input.progress.entries.filter((entry) => entry.completed).map((entry) => entry.checkpointId));
  if (input.checkpoint.prerequisiteCheckpointIds.some((id) => !completedIds.has(id))) return "CHECKPOINT_PREREQUISITE_INCOMPLETE";
  const noteLength = input.note?.trim().length ?? 0;
  if (input.checkpoint.completionMode === "NOTE" && (noteLength < 20 || noteLength > 1000)) return "CHECKPOINT_NOTE_REQUIRED";
  if (input.checkpoint.completionMode === "EVIDENCE" && (input.missingEvidenceKeys?.length ?? 0) > 0) return "CHECKPOINT_EVIDENCE_REQUIRED";
  return null;
}

function isFeatureSnapshot(value: unknown): value is ProfileFeatureSnapshot {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as ProfileFeatureSnapshot).profileFeatureVersion === PROFILE_FEATURE_VERSION &&
      (value as ProfileFeatureSnapshot).features,
  );
}

function prioritizeMissingSkills(skills: string[], context: RoadmapPersonalizationContext) {
  return skills
    .map((skill, index) => ({
      skill,
      index,
      desired: skillMatches(context.desiredSkills, skill) ? 1 : 0,
      role: overlapScore(skill, context.targetRoles) > 0 ? 1 : 0,
    }))
    .sort((a, b) => b.desired - a.desired || b.role - a.role || a.index - b.index)
    .map((entry) => entry.skill);
}

function prioritizeResources<T extends { label: string; url: string }>(
  resources: T[],
  context: RoadmapPersonalizationContext,
  gaps: string[],
) {
  return resources
    .map((resource, index) => ({
      resource,
      index,
      score: overlapScore(resource.label, [...gaps, ...context.desiredSkills, ...context.targetRoles]),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.resource);
}

function buildSummary(preferences: RoadmapPreferences, context: RoadmapPersonalizationContext, missingSkills: string[]) {
  const advantages = unique(context.currentSkills).slice(0, 2);
  const priorities = unique(missingSkills).slice(0, 2);
  return {
    pace: `${preferences.supportLevel.toLowerCase()} guidance at ${preferences.weeklyHours} hours per week`,
    advantage: advantages.length
      ? `You can build from ${joinNatural(advantages)}.`
      : "The roadmap starts without assuming prior technical skills.",
    priority: priorities.length
      ? `Prioritize ${joinNatural(priorities)} as you work.`
      : "No project-specific skill gap was identified from your saved profile.",
  };
}

function overlapScore(value: string, candidates: string[]) {
  const tokens = new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((token) => token.length > 1),
  );
  return candidates.flatMap((candidate) => candidate.toLowerCase().split(/[^a-z0-9+#.]+/)).filter((token) => tokens.has(token)).length;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function joinNatural(values: string[]) {
  return values.length < 2 ? (values[0] ?? "") : `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

function contextHash(context: RoadmapPersonalizationContext) {
  return createHash("sha256").update(JSON.stringify(context)).digest("hex");
}
