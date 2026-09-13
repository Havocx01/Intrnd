export const roadmapSupportLevels = ["GUIDED", "STANDARD", "ACCELERATED"] as const;
export type RoadmapSupportLevel = (typeof roadmapSupportLevels)[number];

export const checkpointCompletionModes = ["CONFIRM", "NOTE", "EVIDENCE"] as const;
export type CheckpointCompletionMode = (typeof checkpointCompletionModes)[number];

export type RoadmapResource = { label: string; url: string };

export type CanonicalCheckpoint = {
  id: string;
  title: string;
  objective: string;
  actionsBySupport: Record<RoadmapSupportLevel, string[]>;
  requiredOutput: string;
  definitionOfDone: string[];
  estimatedMinutesBySupport: Record<RoadmapSupportLevel, number>;
  resourcesBySupport: Record<RoadmapSupportLevel, RoadmapResource[]>;
  requiredSkills: string[];
  submissionRequirementKeys: string[];
  prerequisiteCheckpointIds: string[];
  completionMode: CheckpointCompletionMode;
};

export type CanonicalRoadmapPlan = {
  schemaVersion: 1;
  projectId: string;
  projectTitle: string;
  version: number;
  authoredBy: string;
  reviewedBy: string;
  checkpoints: CanonicalCheckpoint[];
};

export type RoadmapPreferences = { weeklyHours: number; supportLevel: RoadmapSupportLevel };

export type PersonalizedCheckpoint = Omit<CanonicalCheckpoint, "actionsBySupport" | "estimatedMinutesBySupport" | "resourcesBySupport"> & {
  actions: string[];
  estimatedMinutes: number;
  resources: RoadmapResource[];
  knownSkills: string[];
  skillsToPrepare: string[];
  weekNumber: number;
};

export type RoadmapPersonalizationContext = {
  currentSkills: string[];
  desiredSkills: string[];
  targetRoles: string[];
  projectPreferences: string[];
};

export type RoadmapPersonalizationSummary = { pace: string; advantage: string; priority: string };

export type RoadmapSnapshotV1 = {
  schemaVersion: 1;
  roadmapServiceVersion: "roadmap-v1";
  projectId: string;
  projectTitle: string;
  canonicalPlanVersion: number;
  preferences: RoadmapPreferences;
  generatedAt: string;
  totalEstimatedMinutes: number;
  estimatedWeeks: number;
  checkpoints: PersonalizedCheckpoint[];
};

export type RoadmapSnapshotV2 = {
  schemaVersion: 2;
  roadmapServiceVersion: "roadmap-v2";
  profileFeatureVersion: "profile-v1";
  profileFeatureHash: string;
  personalizationContext: RoadmapPersonalizationContext;
  personalizationSummary: RoadmapPersonalizationSummary;
  projectId: string;
  projectTitle: string;
  canonicalPlanVersion: number;
  preferences: RoadmapPreferences;
  generatedAt: string;
  totalEstimatedMinutes: number;
  estimatedWeeks: number;
  checkpoints: PersonalizedCheckpoint[];
};

export type RoadmapSnapshot = RoadmapSnapshotV1 | RoadmapSnapshotV2;

export type CheckpointProgressEntry = { checkpointId: string; completed: boolean; completedAt: string | null; note: string | null };

export type CheckpointProgress = { schemaVersion: 1; entries: CheckpointProgressEntry[] };

export type RoadmapProfile = {
  major?: string | null;
  currentSkills?: string | null;
  skillsToBuild?: string | null;
  targetRoles?: string | null;
  projectPreferences?: string | null;
};
