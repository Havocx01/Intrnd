import { FormEvent, ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthUser } from "../../lib/auth";
import { isAddedApplicationStatus } from "../../lib/applicationStatus";
import { getAppDataCache, setAppDataCache } from "../../lib/appDataCache";
import type { SubmissionItem, SubmissionRequirement } from "./SubmissionComposer";
import type { MatchDetails } from "../../lib/recommendationScore";
import { isCurrentRecommendationResponse } from "../../lib/rankingResponse";
import type { RecommendationCacheMetadata } from "../../lib/appDataCache";
import { RoadmapStartDialog } from "./RoadmapStartDialog";

export type RoadmapSupportLevel = "GUIDED" | "STANDARD" | "ACCELERATED";
export type RoadmapPreferences = { weeklyHours: number; supportLevel: RoadmapSupportLevel };
export type RoadmapResource = { label: string; url: string };
export type PersonalizedCheckpoint = {
  id: string;
  title: string;
  objective: string;
  actions: string[];
  requiredOutput: string;
  definitionOfDone: string[];
  estimatedMinutes: number;
  resources: RoadmapResource[];
  requiredSkills: string[];
  knownSkills: string[];
  skillsToPrepare: string[];
  submissionRequirementKeys: string[];
  prerequisiteCheckpointIds: string[];
  completionMode: "CONFIRM" | "NOTE" | "EVIDENCE";
  weekNumber: number;
};
export type RoadmapSnapshot = {
  schemaVersion: 1 | 2;
  roadmapServiceVersion: "roadmap-v1" | "roadmap-v2";
  profileFeatureVersion?: "profile-v1";
  profileFeatureHash?: string;
  personalizationContext?: { currentSkills: string[]; desiredSkills: string[]; targetRoles: string[]; projectPreferences: string[] };
  personalizationSummary?: { pace: string; advantage: string; priority: string };
  projectId: string;
  projectTitle: string;
  canonicalPlanVersion: number;
  preferences: RoadmapPreferences;
  generatedAt: string;
  totalEstimatedMinutes: number;
  estimatedWeeks: number;
  checkpoints: PersonalizedCheckpoint[];
};
export type CheckpointProgressEntry = { checkpointId: string; completed: boolean; completedAt: string | null; note: string | null };
export type CheckpointProgress = { schemaVersion: 1; entries: CheckpointProgressEntry[] };

export type MarketplaceProject = {
  id: string;
  title: string;
  description: string;
  organizationName: string | null;
  sourceType?: string;
  sourceLabel?: string;
  moderationStatus?: string;
  schoolName?: string | null;
  externalUrl?: string | null;
  category: string | null;
  majorTags?: string[];
  interestTags?: string[];
  skillTags?: string[];
  estimatedHours: string | null;
  difficulty?: string | null;
  deliverable: string | null;
  submissionRequirements?: { version: 1; instructions?: string; items: SubmissionRequirement[] };
  skills: string[];
  verificationType?: string | null;
  verificationMethod: string | null;
  matchBand?: "STRONG" | "GOOD" | "EXPLORATORY";
  reasonCodes?: string[];
  recommendationLabel?: string;
  recommendationReason?: string;
  matchDetails?: MatchDetails;
  recommendationRank?: number;
  roadmapPreview?: {
    checkpointCount: number;
    totalEstimatedMinutes: number;
    effortLabel: string;
    scheduleLabel: string;
    weeklyHours: number;
    checkpoints: Array<{ id: string; title: string; objective: string; requiredOutput: string; estimatedMinutes: number }>;
  } | null;
  sourceVerification?: {
    status: "INTRND_AUTHORED" | "SOURCE_VERIFIED" | "CATALOG_ONLY";
    label: string;
    note: string;
    verifiedAt: string | null;
  };
  saved?: boolean;
  applicationStatus?: string | null;
  // Locked projects contain only server-sanitized teaser fields.
  locked?: boolean;
  lockedPreview?: { title: string; description: string; deliverable: string | null; skills: string[] };
  matchLabel?: string;
};

export type StudentSubmission = {
  id: string;
  status: string;
  deliverableUrl: string | null;
  notes: string | null;
  items?: SubmissionItem[];
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewerType?: string | null;
  reviewNotes?: string | null;
  resumeBullet?: string | null;
  portfolioSummary?: string | null;
  verifiedSkills?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type StudentApplication = {
  id: string;
  status: string;
  roadmapPreferences?: RoadmapPreferences | null;
  roadmapSnapshot?: RoadmapSnapshot | null;
  checkpointProgress?: CheckpointProgress | null;
  reviewedAt?: string | null;
  reviewerName?: string | null;
  reviewerType?: string | null;
  reviewNotes?: string | null;
  resumeBullet?: string | null;
  portfolioSummary?: string | null;
  project: MarketplaceProject;
  createdAt?: string;
  updatedAt?: string;
  submissions: StudentSubmission[];
};

export type ActionNotice = { id: number; title?: string; message: string; tone?: "success" | "error" | "neutral" };

export type SubmissionDraft = { deliverableUrl: string; notes: string };

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "In progress",
  SUBMITTED: "Submitted for review",
  VERIFIED: "Verified",
  NEEDS_REVISION: "Needs changes",
};

export type CatalogueSource = "ai" | "university" | "third-party";

export const SOURCE_LABELS: Record<CatalogueSource, string> = {
  ai: "Intrnd-created",
  university: "Campus-style",
  "third-party": "External catalog",
};

export function sourceFromProject(project: MarketplaceProject): CatalogueSource {
  if (["INTRND_CREATED", "AI_GENERATED"].includes(project.sourceType ?? "")) return "ai";
  if (["UNIVERSITY", "ON_CAMPUS", "STUDENT_SUBMITTED"].includes(project.sourceType ?? "")) {
    return "university";
  }
  return "third-party";
}

export function deliverablesForProject(project: MarketplaceProject, application?: StudentApplication | null): string[] {
  const roadmapTitles = application?.roadmapSnapshot?.checkpoints.map((checkpoint) => checkpoint.title) ?? [];
  if (roadmapTitles.length) return roadmapTitles;
  const requirementTitles = project.submissionRequirements?.items.map((requirement) => requirement.title) ?? [];
  return requirementTitles.length ? requirementTitles : [project.deliverable ?? "Finished project evidence"];
}

export function projectCheckpoints(application: StudentApplication): PersonalizedCheckpoint[] {
  return application.roadmapSnapshot?.checkpoints ?? [];
}

function normalizeApplicationRoadmap(application: StudentApplication): StudentApplication {
  const checkpoints = application.roadmapSnapshot?.checkpoints ?? [];
  const existing = new Map((application.checkpointProgress?.entries ?? []).map((entry) => [entry.checkpointId, entry]));
  return {
    ...application,
    checkpointProgress: {
      schemaVersion: 1,
      entries: checkpoints.map(
        (checkpoint) => existing.get(checkpoint.id) ?? { checkpointId: checkpoint.id, completed: false, completedAt: null, note: null },
      ),
    },
  };
}

export function resumeBulletForProject(project: MarketplaceProject): string {
  const skills = project.skills.slice(0, 2).join(" and ") || project.category || "project execution";
  return `Completed a ${project.category ?? "career"} project focused on ${skills}, producing ${
    project.deliverable ?? "a reviewed deliverable"
  }.`;
}

export function resumeBulletForApplication(application: StudentApplication): string {
  return application.submissions[0]?.resumeBullet ?? application.resumeBullet ?? resumeBulletForProject(application.project);
}

export function projectProgress(status: string, completedChecklistCount = 0, totalChecklistCount = 0): number {
  if (status === "VERIFIED") return 100;
  if (totalChecklistCount <= 0) return 0;
  return Math.round((completedChecklistCount / totalChecklistCount) * 100);
}

export function currentStepForStatus(status: string) {
  if (status === "VERIFIED") return "Verified";
  if (status === "SUBMITTED") return "Under review";
  if (status === "NEEDS_REVISION") return "Needs changes";
  return "In progress";
}

export function nextActionForStatus(status: string) {
  if (status === "VERIFIED") return "Add it to your resume";
  if (status === "SUBMITTED") return "Wait for review";
  if (status === "NEEDS_REVISION") return "Fix and resubmit";
  return "Finish the next step";
}

export type AppDataContextValue = {
  user: AuthUser | null;
  projects: MarketplaceProject[];
  applications: StudentApplication[];
  savedProjectIds: string[];
  submissionDrafts: Record<string, SubmissionDraft>;
  isInitialLoading: boolean;
  isFetching: boolean;
  hasLoadedOnce: boolean;
  lastFetchedAt: number | null;
  isLoading: boolean;
  projectsError: string;
  notice: ActionNotice | null;

  pendingApplyProjectId: string | null;
  pendingRemoveProjectId: string | null;
  pendingSubmissionProjectId: string | null;
  pendingSaveProjectIds: string[];

  appliedProjectIds: Set<string>;
  activeApplications: StudentApplication[];
  submittedApplications: StudentApplication[];
  verifiedApplications: StudentApplication[];
  needsRevisionApplications: StudentApplication[];
  recommendedProject: MarketplaceProject | null;
  featuredApplication: StudentApplication | null;
  submissionRecords: Array<StudentSubmission & { application: StudentApplication; project: MarketplaceProject }>;

  setNotice: (notice: ActionNotice | null) => void;
  showNotice: (message: string, tone?: ActionNotice["tone"], title?: string) => void;
  applyToProject: (
    projectId: string,
    projectPreview?: Pick<MarketplaceProject, "title" | "difficulty" | "estimatedHours">,
  ) => Promise<boolean>;
  removeProject: (projectId: string) => Promise<void>;
  toggleSavedProject: (projectId: string) => Promise<void>;
  updateCheckpoint: (projectId: string, checkpointId: string, completed: boolean, note?: string) => Promise<boolean>;
  updateRoadmapPreferences: (projectId: string, preferences: RoadmapPreferences) => Promise<boolean>;
  submitWork: (event: FormEvent<HTMLFormElement>, projectId: string) => Promise<void>;
  setSubmissionDraft: (projectId: string, draft: SubmissionDraft) => void;
  refreshInBackground: () => Promise<void>;
  reload: () => Promise<void>;
  copyResumeBullet: (project: MarketplaceProject) => Promise<void>;
  // Request pilot access without changing the user's entitlement.
  requestPilotAccess: (plan: "PRO" | "PRO_PLUS") => Promise<boolean>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const cached = getAppDataCache<AuthUser, MarketplaceProject, StudentApplication>();
  const cachedApplications = (cached?.applications ?? [])
    .map(normalizeApplicationRoadmap)
    .filter((application) => isAddedApplicationStatus(application.status));
  const [user, setUser] = useState<AuthUser | null>(cached?.user ?? null);
  const [projects, setProjects] = useState<MarketplaceProject[]>(cached?.projects ?? []);
  const [applications, setApplications] = useState<StudentApplication[]>(cachedApplications);
  const [savedProjectIds, setSavedProjectIds] = useState<string[]>(cached?.savedProjectIds ?? []);
  const [submissionDrafts, setSubmissionDraftsState] = useState<Record<string, SubmissionDraft>>({});
  const [hasLoadedOnce, setHasLoadedOnce] = useState(Boolean(cached?.user));
  const [isInitialLoading, setIsInitialLoading] = useState(!cached?.user);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(cached?.fetchedAt ?? null);
  const [projectsError, setProjectsError] = useState("");
  const [notice, setNotice] = useState<ActionNotice | null>(null);

  const [pendingApplyProjectId, setPendingApplyProjectId] = useState<string | null>(null);
  const [pendingRemoveProjectId, setPendingRemoveProjectId] = useState<string | null>(null);
  const [pendingSubmissionProjectId, setPendingSubmissionProjectId] = useState<string | null>(null);
  const [pendingSaveProjectIds, setPendingSaveProjectIds] = useState<string[]>([]);
  const [startProjectRequest, setStartProjectRequest] = useState<{
    projectId: string;
    projectTitle: string;
    difficulty: string | null;
    estimatedHours: string | null;
  } | null>(null);

  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const userRef = useRef(user);
  const projectsRef = useRef(projects);
  const applicationsRef = useRef(applications);
  const savedProjectIdsRef = useRef(savedProjectIds);
  const hasLoadedOnceRef = useRef(hasLoadedOnce);
  const recommendationMetadataRef = useRef<RecommendationCacheMetadata | null>(cached?.recommendationMetadata ?? null);
  const initialLoadRetryRef = useRef(0);
  const startProjectResolverRef = useRef<((started: boolean) => void) | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  useEffect(() => {
    savedProjectIdsRef.current = savedProjectIds;
  }, [savedProjectIds]);

  useEffect(() => {
    hasLoadedOnceRef.current = hasLoadedOnce;
  }, [hasLoadedOnce]);

  const persistAppSnapshot = useCallback(
    (
      nextUser: AuthUser | null,
      nextProjects: MarketplaceProject[],
      nextApplications: StudentApplication[],
      nextSavedProjectIds: string[],
      recommendationMetadata: RecommendationCacheMetadata | null,
    ) => {
      const fetchedAt = Date.now();
      setAppDataCache({
        user: nextUser,
        projects: nextProjects,
        applications: nextApplications,
        savedProjectIds: nextSavedProjectIds,
        recommendationMetadata,
        fetchedAt,
      });
      setLastFetchedAt(fetchedAt);
      setHasLoadedOnce(Boolean(nextUser));
    },
    [],
  );

  const loadProjects = useCallback(
    async (options?: { background?: boolean; userOverride?: AuthUser | null }) => {
      const background = options?.background ?? hasLoadedOnceRef.current;
      if (background) {
        setIsFetching(true);
      } else {
        setIsInitialLoading(true);
      }
      setProjectsError("");
      try {
        const [projectsResponse, applicationsResponse] = await Promise.all([
          fetch("/api/recommendations", { credentials: "include" }),
          fetch("/api/projects/me", { credentials: "include" }),
        ]);

        const projectsData = await projectsResponse.json().catch(() => ({}));
        let nextProjects = projectsRef.current;
        let nextSavedProjectIds = savedProjectIdsRef.current;
        if (projectsResponse.ok && isCurrentRecommendationResponse(projectsData)) {
          nextProjects = projectsData.recommendations.map((recommendation) => ({
            ...recommendation.project,
            recommendationRank: recommendation.rank,
            matchBand: recommendation.matchBand,
            reasonCodes: recommendation.reasonCodes,
            recommendationReason: recommendation.reason,
            matchDetails: recommendation.matchDetails,
          }));
          recommendationMetadataRef.current = {
            rankerVersion: projectsData.rankerVersion,
            profileFeatureVersion: projectsData.profileFeatureVersion,
            catalogVersion: projectsData.catalogVersion,
            generatedAt: projectsData.generatedAt,
          };
          nextSavedProjectIds = nextProjects.filter((project) => project.saved).map((project) => project.id);
          projectsRef.current = nextProjects;
          savedProjectIdsRef.current = nextSavedProjectIds;
          setProjects(nextProjects);
          setSavedProjectIds(nextSavedProjectIds);
          initialLoadRetryRef.current = 0;
        } else {
          if (!hasLoadedOnceRef.current) {
            setProjects([]);
            nextProjects = [];
            nextSavedProjectIds = [];
            projectsRef.current = [];
            savedProjectIdsRef.current = [];
            setSavedProjectIds([]);
          }
          if (!background) {
            setProjectsError(projectsData.error ?? "Unable to load recommended projects.");
          }
        }

        let nextApplications = applicationsRef.current;
        if (applicationsResponse?.ok) {
          const applicationsData = await applicationsResponse.json().catch(() => ({}));
          nextApplications = (applicationsData.applications ?? [])
            .map(normalizeApplicationRoadmap)
            .filter((application: StudentApplication) => isAddedApplicationStatus(application.status));
          applicationsRef.current = nextApplications;
          setApplications(nextApplications);
        }
        if (projectsResponse.ok) {
          persistAppSnapshot(
            options?.userOverride ?? userRef.current,
            nextProjects,
            nextApplications,
            nextSavedProjectIds,
            recommendationMetadataRef.current,
          );
        }
      } catch {
        if (!background) {
          setProjectsError("Unable to load your workspace right now.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsInitialLoading(false);
          setIsFetching(false);
        }
      }
    },
    [persistAppSnapshot],
  );

  useEffect(() => {
    if (!projectsError || projects.length > 0 || initialLoadRetryRef.current >= 2) return;
    const retryNumber = initialLoadRetryRef.current + 1;
    const timeout = window.setTimeout(() => {
      initialLoadRetryRef.current = retryNumber;
      void loadProjects({ background: false });
    }, retryNumber * 1500);
    return () => window.clearTimeout(timeout);
  }, [loadProjects, projects.length, projectsError]);

  useEffect(() => {
    let cancelled = false;
    if (cached?.user) {
      void loadProjects({ background: true, userOverride: cached.user });
    }
    fetch("/api/users/me", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then(async (data) => {
        if (cancelled) return;
        if (!data?.user) {
          navigate("/sign-in");
          return;
        }
        if (!data.user.onboardingCompleted) {
          navigate("/onboarding");
          return;
        }
        setUser(data.user);
        await loadProjects({ background: Boolean(cached?.user), userOverride: data.user });
      })
      .catch(() => {
        if (!cancelled) {
          if (cached?.user) {
            setIsInitialLoading(false);
            return;
          }
          navigate("/sign-in");
        }
      })
      .finally(() => {
        if (!cancelled) setIsInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, loadProjects]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function noticeTitle(tone: ActionNotice["tone"]) {
    if (tone === "success") return "Done";
    if (tone === "error") return "Needs attention";
    return "Heads up";
  }

  const showNotice = useCallback((message: string, tone: ActionNotice["tone"] = "neutral", title?: string) => {
    setNotice({ id: Date.now(), title: title ?? noticeTitle(tone), message, tone });
  }, []);

  const completeProjectStart = useCallback(
    async (preferences: RoadmapPreferences) => {
      const projectId = startProjectRequest?.projectId;
      if (!projectId) return;
      setPendingApplyProjectId(projectId);
      try {
        const response = await fetch(`/api/projects/${projectId}/apply`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          showNotice(data.error ?? "Unable to apply to this project.", "error");
          startProjectResolverRef.current?.(false);
          return;
        }
        showNotice("Project added to My Projects. You can continue from your workspace.", "success", "Project started");
        await loadProjects();
        startProjectResolverRef.current?.(true);
      } catch {
        showNotice("Unable to start this project. Please try again.", "error");
        startProjectResolverRef.current?.(false);
      } finally {
        setPendingApplyProjectId(null);
        setStartProjectRequest(null);
        startProjectResolverRef.current = null;
      }
    },
    [loadProjects, showNotice, startProjectRequest],
  );

  const cancelProjectStart = useCallback(() => {
    if (pendingApplyProjectId) return;
    startProjectResolverRef.current?.(false);
    startProjectResolverRef.current = null;
    setStartProjectRequest(null);
  }, [pendingApplyProjectId]);

  const applyToProject = useCallback(
    (projectId: string, projectPreview?: Pick<MarketplaceProject, "title" | "difficulty" | "estimatedHours">) => {
      const project = projectPreview ?? projectsRef.current.find((entry) => entry.id === projectId);
      if (!project) {
        showNotice("Unable to find that project.", "error");
        return Promise.resolve(false);
      }
      if (startProjectResolverRef.current) startProjectResolverRef.current(false);
      return new Promise<boolean>((resolve) => {
        startProjectResolverRef.current = resolve;
        setStartProjectRequest({
          projectId,
          projectTitle: project.title,
          difficulty: project.difficulty ?? null,
          estimatedHours: project.estimatedHours ?? null,
        });
      });
    },
    [showNotice],
  );

  const removeProject = useCallback(
    async (projectId: string) => {
      setPendingRemoveProjectId(projectId);
      try {
        const response = await fetch(`/api/projects/${projectId}/apply`, { method: "DELETE", credentials: "include" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          showNotice(data.error ?? "Unable to remove this project.", "error");
          return;
        }
        setApplications((current) => current.filter((application) => application.project.id !== projectId));
        setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, applicationStatus: null } : project)));
        showNotice("Project removed from My Projects.", "success", "Project removed");
        await loadProjects();
      } catch {
        showNotice("Unable to remove this project. Please try again.", "error");
      } finally {
        setPendingRemoveProjectId(null);
      }
    },
    [loadProjects, showNotice],
  );

  const toggleSavedProject = useCallback(
    async (projectId: string) => {
      if (pendingSaveProjectIds.includes(projectId)) return;

      const project = projects.find((item) => item.id === projectId);
      const shouldUseBackend = Boolean(project);
      const isSaved = project?.saved ?? savedProjectIds.includes(projectId);

      setPendingSaveProjectIds((current) => [...new Set([...current, projectId])]);

      if (shouldUseBackend) {
        setProjects((current) => current.map((item) => (item.id === projectId ? { ...item, saved: !isSaved } : item)));
      }

      setSavedProjectIds((current) => (isSaved ? current.filter((id) => id !== projectId) : [...new Set([...current, projectId])]));

      if (!shouldUseBackend) {
        setPendingSaveProjectIds((current) => current.filter((id) => id !== projectId));
        return;
      }

      try {
        const response = await fetch(`/api/projects/${projectId}/save`, { method: isSaved ? "DELETE" : "POST", credentials: "include" });
        if (!response.ok) {
          throw new Error("Unable to update saved projects.");
        }
        showNotice(
          isSaved ? "Removed from your saved list." : "Saved. Find it again under the Saved tab.",
          "success",
          isSaved ? "Unsaved" : "Project saved",
        );
      } catch {
        // Roll back the optimistic update.
        setProjects((current) => current.map((item) => (item.id === projectId ? { ...item, saved: isSaved } : item)));
        setSavedProjectIds((current) => (isSaved ? [...new Set([...current, projectId])] : current.filter((id) => id !== projectId)));
        showNotice("Unable to update saved projects.", "error");
      } finally {
        setPendingSaveProjectIds((current) => current.filter((id) => id !== projectId));
      }
    },
    [pendingSaveProjectIds, projects, savedProjectIds, showNotice],
  );

  const updateCheckpoint = useCallback(
    async (projectId: string, checkpointId: string, completed: boolean, note?: string) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/checkpoints/${encodeURIComponent(checkpointId)}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed, note }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.checkpointProgress) {
          showNotice(data.error ?? "Unable to update this checkpoint.", "error");
          return false;
        }
        const progress = data.checkpointProgress as CheckpointProgress;
        setApplications((current) =>
          current.map((application) =>
            application.project.id === projectId ? { ...application, checkpointProgress: progress } : application,
          ),
        );
        if (progress.entries.length > 0 && progress.entries.every((entry) => entry.completed)) {
          showNotice("Every roadmap milestone is complete. Your evidence package is ready to submit.", "success", "Roadmap complete");
        }
        return true;
      } catch {
        showNotice("Unable to update this checkpoint. Please try again.", "error");
        return false;
      }
    },
    [showNotice],
  );

  const updateRoadmapPreferences = useCallback(
    async (projectId: string, preferences: RoadmapPreferences) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/roadmap-preferences`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.roadmapSnapshot) {
          showNotice(data.error ?? "Unable to update roadmap preferences.", "error");
          return false;
        }
        setApplications((current) =>
          current.map((application) =>
            application.project.id === projectId
              ? {
                  ...application,
                  roadmapPreferences: data.roadmapPreferences,
                  roadmapSnapshot: data.roadmapSnapshot,
                  checkpointProgress: data.checkpointProgress,
                }
              : application,
          ),
        );
        showNotice("Your roadmap schedule and guidance were updated.", "success");
        return true;
      } catch {
        showNotice("Unable to update roadmap preferences.", "error");
        return false;
      }
    },
    [showNotice],
  );

  const setSubmissionDraft = useCallback((projectId: string, draft: SubmissionDraft) => {
    setSubmissionDraftsState((current) => ({ ...current, [projectId]: draft }));
  }, []);

  const submitWork = useCallback(
    async (event: FormEvent<HTMLFormElement>, projectId: string) => {
      event.preventDefault();
      const draft = submissionDrafts[projectId] ?? { deliverableUrl: "", notes: "" };
      setPendingSubmissionProjectId(projectId);
      try {
        const response = await fetch(`/api/projects/${projectId}/submissions`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          showNotice(data.error ?? "Unable to submit work.", "error");
          return;
        }
        showNotice("Work submitted for review.", "success");
        setSubmissionDraftsState((current) => ({ ...current, [projectId]: { deliverableUrl: "", notes: "" } }));
        await loadProjects();
      } catch {
        showNotice("Unable to submit work. Please try again.", "error");
      } finally {
        setPendingSubmissionProjectId(null);
      }
    },
    [loadProjects, showNotice, submissionDrafts],
  );

  const copyResumeBullet = useCallback(
    async (project: MarketplaceProject) => {
      try {
        await navigator.clipboard.writeText(resumeBulletForProject(project));
        void fetch("/api/users/me/events", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: "RESUME_BULLET_COPIED", projectId: project.id }),
        });
        showNotice("Resume bullet copied.", "success");
      } catch {
        showNotice("Unable to copy right now.", "error");
      }
    },
    [showNotice],
  );

  const appliedProjectIds = useMemo(
    () =>
      new Set(
        applications.filter((application) => isAddedApplicationStatus(application.status)).map((application) => application.project.id),
      ),
    [applications],
  );

  const activeApplications = useMemo(() => applications.filter((application) => application.status === "ACTIVE"), [applications]);

  const submittedApplications = useMemo(() => applications.filter((application) => application.status === "SUBMITTED"), [applications]);

  const verifiedApplications = useMemo(() => applications.filter((application) => application.status === "VERIFIED"), [applications]);

  const needsRevisionApplications = useMemo(
    () => applications.filter((application) => application.status === "NEEDS_REVISION"),
    [applications],
  );

  const featuredApplication = useMemo(
    () =>
      applications.find((application) => application.status === "ACTIVE" || application.status === "NEEDS_REVISION") ??
      applications.find((application) => application.status === "SUBMITTED") ??
      applications[0] ??
      null,
    [applications],
  );

  const recommendedProject = useMemo(() => {
    return projects.find((project) => !appliedProjectIds.has(project.id)) ?? projects[0] ?? null;
  }, [projects, appliedProjectIds]);

  const submissionRecords = useMemo(
    () =>
      applications.flatMap((application) =>
        application.submissions.map((submission) => ({ ...submission, application, project: application.project })),
      ),
    [applications],
  );

  const refreshInBackground = useCallback(() => loadProjects({ background: true }), [loadProjects]);

  const isLoading = isInitialLoading;

  const value: AppDataContextValue = {
    user,
    projects,
    applications,
    savedProjectIds,
    submissionDrafts,
    isInitialLoading,
    isFetching,
    hasLoadedOnce,
    lastFetchedAt,
    isLoading,
    projectsError,
    notice,
    pendingApplyProjectId,
    pendingRemoveProjectId,
    pendingSubmissionProjectId,
    pendingSaveProjectIds,
    appliedProjectIds,
    activeApplications,
    submittedApplications,
    verifiedApplications,
    needsRevisionApplications,
    recommendedProject,
    featuredApplication,
    submissionRecords,
    setNotice,
    showNotice,
    applyToProject,
    removeProject,
    toggleSavedProject,
    updateCheckpoint,
    updateRoadmapPreferences,
    submitWork,
    setSubmissionDraft,
    refreshInBackground,
    reload: refreshInBackground,
    copyResumeBullet,
    requestPilotAccess: async (plan) => {
      try {
        const response = await fetch("/api/users/me/access-request", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestedPlan: plan }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.request) {
          showNotice(data?.error ?? "Unable to request pilot access.", "error");
          return false;
        }
        showNotice(
          data.duplicate ? "Your pilot access request is already pending." : "Pilot access requested. We will review it shortly.",
          "success",
        );
        return true;
      } catch {
        showNotice("Unable to request pilot access right now.", "error");
        return false;
      }
    },
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
      <RoadmapStartDialog
        request={startProjectRequest}
        defaultPreferences={user?.studentProfile?.roadmapDefaults ?? null}
        isStarting={Boolean(pendingApplyProjectId)}
        onCancel={cancelProjectStart}
        onStart={completeProjectStart}
      />
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used inside <AppDataProvider>");
  }
  return ctx;
}
