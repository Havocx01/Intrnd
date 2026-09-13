import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Card,
  Field,
  Grid,
  Heading,
  Table,
  Text,
  VStack,
  pixel,
  proportional,
} from "@astryxdesign/core";
import type { TableColumn } from "@astryxdesign/core";
import { CatalogReviewForm, emptyCatalogReviewDraft, type CatalogReviewDraft } from "../components/admin/CatalogReviewForm";

type AdminTable = {
  name: string;
  label: string;
  editableFields: string[];
  createDefaults: Record<string, unknown>;
  rows: Record<string, unknown>[];
  readOnly?: boolean;
};

type Overview = {
  cards: {
    activeSubscriptions: number;
    users: number;
    projects: number;
    payments: number;
    reports: number;
    waitlistEntries: number;
  };
  subscriptions: Record<string, unknown>[];
  recentActivity: Record<string, unknown>[];
};

type OnboardingRecord = Record<string, unknown>;
type ReviewSubmission = {
  id: string;
  status: string;
  deliverableUrl: string | null;
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
  items: Array<{
    id: string;
    kind: string;
    textValue: string | null;
    url: string | null;
    originalFileName: string | null;
    downloadUrl: string | null;
  }>;
  student: { id: string; email: string; name: string | null };
  project: {
    id: string;
    title: string;
    organizationName: string | null;
    deliverable: string | null;
    verificationMethod: string | null;
    skills: string | null;
  };
};

type SubmissionReviewDraft = {
  reviewNotes: string;
  verifiedSkills: string;
  resumeBullet: string;
  portfolioSummary: string;
};

type ProfileChangeRequestRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  reason: string | null;
  decisionNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    accountType: string | null;
    profileEditsUsed: number;
    profileEditsAllowed: number;
  };
};

type PilotAccessRequestRow = {
  id: string;
  status: string;
  requestedPlan: "PRO" | "PRO_PLUS";
  reason: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null; plan: string };
};

type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: "FREE" | "PRO" | "PRO_PLUS";
  onboardingCompleted: boolean;
  cohortId: string | null;
  cohort: { id: string; name: string } | null;
  createdAt: string;
  catalogReviewerProfile: CatalogReviewerProfile | null;
};

type CatalogReviewerProfile = {
  userId: string;
  reviewerKind: "HUMAN" | "AI_AGENT";
  reviewerTypes: string[];
  domainExpertiseIds: string[];
  careerExpertiseIds: string[];
  active: boolean;
};

type TaxonomyOption = { id: string; label: string; domainId?: string; relatedRoleIds?: string[] };
type CareerTaxonomy = {
  version: string;
  domains: TaxonomyOption[];
  roles: TaxonomyOption[];
  competencies: TaxonomyOption[];
  portfolioSignals: TaxonomyOption[];
  requiredTools: TaxonomyOption[];
  accessRequirements: TaxonomyOption[];
  experienceLevels: TaxonomyOption[];
  careerReviewerExpertise: TaxonomyOption[];
};

type PilotCohortRow = {
  id: string;
  name: string;
  reviewSlaHours: number;
  _count: { users: number };
};

type RoadmapValidationIssue = { code: string; message: string; checkpointId?: string };
type RoadmapAdminRow = {
  id: string;
  title: string;
  category: string | null;
  version: number;
  checkpointCount: number;
  valid: boolean;
  issues: RoadmapValidationIssue[];
  careerMappingVersion: number;
  careerMapping: { targetRoles: TaxonomyOption[]; competencies: TaxonomyOption[] };
  careerMappingIssues: PilotCatalogIssue[];
  pilotCatalogStatus: string;
};
type RoadmapCoverage = { total: number; valid: number; invalid: number };
type PilotCatalogIssue = { severity: "ERROR" | "WARNING"; code: string; message: string };
type PilotCatalogReview = {
  id: string;
  reviewerId: string;
  decision: "APPROVE" | "CHANGES_REQUESTED" | "REJECT";
  relevance: number;
  feasibility: number;
  proofValue: number;
  readiness: number;
  sourceTruth: boolean;
  resourceAccess: boolean;
  safeScope: boolean;
  issueCodes: string[];
  notes: string;
  reviewType: "DOMAIN" | "CAREER" | "UNQUALIFIED";
  confidence: number;
  conflictConfirmedAt: string | null;
  scoreJustifications: Record<string, string> | null;
  reviewerKind: "HUMAN" | "AI_AGENT" | string;
  modelLabel: string | null;
  updatedAt: string;
  reviewer: { id: string; name: string | null; email: string };
};
type CareerMappingDraft = {
  targetRoleIds: string[];
  competencyIds: string[];
  portfolioSignalIds: string[];
  requiredToolIds: string[];
  accessRequirementIds: string[];
  recommendedExperienceLevels: string[];
  careerTaxonomyVersion: string | null;
};
type CatalogReviewAssignment = {
  id: string;
  reviewType: "DOMAIN" | "CAREER";
  reviewerId: string;
  reviewer: { id: string; name: string | null; email: string; catalogReviewerProfile: CatalogReviewerProfile | null };
};
type QualifiedReviewer = CatalogReviewerProfile & { user: { id: string; name: string | null; email: string; role: string } };
type PilotCatalogProject = {
  id: string;
  title: string;
  description: string;
  organizationName: string | null;
  sourceType: string;
  externalUrl: string | null;
  category: string | null;
  difficulty: string | null;
  estimatedHours: string | null;
  deliverable: string | null;
  skills: string | null;
  verificationMethod: string | null;
  provenanceStatus: string;
  pilotCatalogStatus: "CANDIDATE" | "HOLD" | "PILOT_READY" | string;
  pilotCatalogReason: string | null;
  pilotCatalogRiskCodes: string[];
  projectFingerprint: string;
  pilotPublishedAt: string | null;
  careerMappingVersion: number;
  careerMapping: CareerMappingDraft;
  resolvedCareerMapping: {
    targetRoles: TaxonomyOption[]; competencies: TaxonomyOption[]; portfolioSignals: TaxonomyOption[];
    requiredTools: TaxonomyOption[]; accessRequirements: TaxonomyOption[]; recommendedExperienceLevels: TaxonomyOption[];
    domains: TaxonomyOption[];
  };
  careerMappingIssues: PilotCatalogIssue[];
  catalogReviewAssignments: CatalogReviewAssignment[];
  roadmapReview: { checkpoints: Array<{ id: string; title: string; requiredOutput: string; completionMode: string; resources: Array<{ label: string; url: string }> }> };
  catalogReviews: PilotCatalogReview[];
  issues: PilotCatalogIssue[];
  publishReadiness: {
    ready: boolean;
    reasons: string[];
    approvingReviewers: number;
    aiDomainApproved: boolean;
    aiCareerApproved: boolean;
    humanReviewRequired: boolean;
    humanDomainApproved: boolean;
    humanCareerApproved: boolean;
  };
};
type PilotCatalogResponse = {
  catalogVersion: number;
  currentReviewerId: string;
  mode: string;
  minimumReady: number;
  taxonomy: CareerTaxonomy;
  qualifiedReviewers: QualifiedReviewer[];
  summary: {
    manifestCandidates: number;
    syncedCandidates: number;
    ready: number;
    onHold: number;
    needsSecondReview: number;
    structurallyBlocked: number;
    publishableNow: number;
    mappingIncomplete: number;
    domainUnassigned: number;
    careerUnassigned: number;
  };
  missingProjectIds: string[];
  projects: PilotCatalogProject[];
};
type AdminRoadmapCheckpoint = {
  id: string;
  title: string;
  objective: string;
  actionsBySupport: Record<"GUIDED" | "STANDARD" | "ACCELERATED", string[]>;
  requiredOutput: string;
  definitionOfDone: string[];
  estimatedMinutesBySupport: Record<"GUIDED" | "STANDARD" | "ACCELERATED", number>;
  resourcesBySupport: Record<"GUIDED" | "STANDARD" | "ACCELERATED", Array<{ label: string; url: string }>>;
  requiredSkills: string[];
  submissionRequirementKeys: string[];
  prerequisiteCheckpointIds: string[];
  completionMode: "CONFIRM" | "NOTE" | "EVIDENCE";
};
type AdminRoadmapPlan = {
  schemaVersion: 1;
  projectId: string;
  projectTitle: string;
  version: number;
  authoredBy: string;
  reviewedBy: string;
  checkpoints: AdminRoadmapCheckpoint[];
};
type AdminRoadmapDetail = {
  project: { id: string; title: string; category: string | null; checkpointPlan: AdminRoadmapPlan; checkpointPlanVersion: number };
  versions: Array<{ version: number; publishedBy: string | null; createdAt: string }>;
};

type FunnelStage = {
  count: number;
  conversionFromPrevious: number | null;
  conversionFromEnrolled: number | null;
};

type CohortReport = {
  cohort: {
    id: string;
    name: string;
    reviewSlaHours: number;
    memberCount: number;
    startsAt: string | null;
    endsAt: string | null;
  };
  funnel: Record<"enrolled" | "recommendations" | "started" | "submitted" | "verified", FunnelStage>;
  stageTiming: Array<{ label: string; medianHours: number | null; sampleSize: number }>;
  reviewSla: { reviewed: number; withinSla: number; complianceRate: number | null; medianHours: number | null };
  revisionRate: number | null;
  reviewerWorkload: Array<{ reviewerId: string; reviewer: string; reviews: number }>;
  engagement: {
    proofViews: { total: number; uniqueUsers: number };
    resumeBulletCopies: { total: number; uniqueUsers: number };
  };
  eventIntegrity: { funnelEvents: number; duplicateFunnelEvents: number; noDuplicates: boolean };
  roadmaps: {
    checkpointDropoff: Array<{ checkpointId: string; viewedApplications: number; completedApplications: number; completionRate: number | null }>;
    completionTiming: { measurement: "ELAPSED_WALL_CLOCK"; sampleSize: number; medianActualMinutes: number | null; medianEstimatedMinutes: number | null; withinTwiceEstimateRate: number | null };
    evidenceValidationFailures: number;
    feedback: { responses: number; helpfulRate: number | null; issueCodes: Array<{ issueCode: string; count: number }> };
    outcomesBySupport: Array<{ supportLevel: string; configured: number; submitted: number; verified: number }>;
  };
};

interface ReviewerWorkloadRow extends Record<string, unknown> {
  id: string;
  reviewer: string;
  reviews: number;
  share: string;
}

interface CheckpointDropoffRow extends Record<string, unknown> {
  id: string;
  checkpoint: string;
  viewed: number;
  completed: number;
  completion: string;
}

type AdminView = "overview" | "projects" | "pilotCatalog" | "roadmaps" | "onboarding" | "users" | "subscriptions" | "database" | "payments" | "reports";

const adminNavGroups: ReadonlyArray<{ label: string; items: ReadonlyArray<{ id: AdminView; label: string }> }> = [
  {
    label: "Dashboard",
    items: [{ id: "overview", label: "Overview" }],
  },
  {
    label: "Review",
    items: [
      { id: "projects", label: "Submissions" },
      { id: "pilotCatalog", label: "Pilot catalog" },
      { id: "roadmaps", label: "Roadmaps" },
      { id: "onboarding", label: "Onboarding" },
    ],
  },
  {
    label: "Directory",
    items: [
      { id: "users", label: "Users" },
      { id: "subscriptions", label: "Subscriptions" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "database", label: "Database" },
      { id: "payments", label: "Payments" },
      { id: "reports", label: "Reports" },
    ],
  },
] as const;

const adminNavItems = adminNavGroups.flatMap((group) => group.items);

export default function Admin() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [adminBusyAction, setAdminBusyAction] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [onboardingRecords, setOnboardingRecords] = useState<OnboardingRecord[]>([]);
  const [changeRequests, setChangeRequests] = useState<ProfileChangeRequestRow[]>([]);
  const [pendingChangeRequests, setPendingChangeRequests] = useState(0);
  const [accessRequests, setAccessRequests] = useState<PilotAccessRequestRow[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [cohorts, setCohorts] = useState<PilotCohortRow[]>([]);
  const [roadmapCoverage, setRoadmapCoverage] = useState<RoadmapCoverage>({ total: 0, valid: 0, invalid: 0 });
  const [roadmaps, setRoadmaps] = useState<RoadmapAdminRow[]>([]);
  const [pilotCatalog, setPilotCatalog] = useState<PilotCatalogResponse | null>(null);
  const [reviewSubmissions, setReviewSubmissions] = useState<ReviewSubmission[]>([]);
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [activeTableName, setActiveTableName] = useState("users");
  const [activeView, setActiveView] = useState<AdminView>(() => {
    const saved = sessionStorage.getItem("intrnd-admin-view");
    return adminNavItems.some((item) => item.id === saved) ? saved as AdminView : "overview";
  });
  const [draft, setDraft] = useState("");
  const [createDraft, setCreateDraft] = useState("");
  const [selectedRowId, setSelectedRowId] = useState("");
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const activeTable = useMemo(
    () => tables.find((table) => table.name === activeTableName) ?? tables[0],
    [activeTableName, tables],
  );

  const selectedRow = useMemo(
    () => activeTable?.rows.find((row) => String(row.id) === selectedRowId),
    [activeTable, selectedRowId],
  );

  useEffect(() => {
    void loadAdminData();
  }, []);

  useEffect(() => {
    sessionStorage.setItem("intrnd-admin-view", activeView);
  }, [activeView]);

  useEffect(() => {
    if (!activeTable) {
      return;
    }

    const firstRow = activeTable.rows[0];
    setSelectedRowId(firstRow ? String(firstRow.id) : "");
    setCreateDraft(JSON.stringify(activeTable.createDefaults, null, 2));
  }, [activeTable?.name]);

  useEffect(() => {
    if (!selectedRow) {
      setDraft("");
      return;
    }

    const editableData = activeTable.editableFields.reduce<Record<string, unknown>>((data, field) => {
      data[field] = selectedRow[field] ?? null;
      return data;
    }, {});

    setDraft(JSON.stringify(editableData, null, 2));
  }, [activeTable, selectedRow]);

  async function loadAdminData() {
    setError("");
    setAdminBusyAction((current) => current || "refresh");

    try {
      const accountResponse = await adminFetch("/api/users/me");
      const accountData = await accountResponse.json() as { user?: { role?: string } };
      if (accountData.user?.role !== "ADMIN") throw Object.assign(new Error("This account is not authorized for the admin console."), { status: 403 });
      setIsSignedIn(true);

      const failures: string[] = [];
      try {
        const pilotCatalogResponse = await adminFetch("/api/admin/pilot-catalog");
        setPilotCatalog(await pilotCatalogResponse.json() as PilotCatalogResponse);
      } catch (caught) {
        failures.push(caught instanceof Error ? `Pilot catalog: ${caught.message}` : "Pilot catalog could not be loaded.");
      }

      try {
        const [overviewResponse, databaseResponse, onboardingResponse, changeRequestsResponse, accessRequestsResponse, usersResponse, cohortsResponse, roadmapsResponse] = await Promise.all([
          adminFetch("/api/admin/overview"),
          adminFetch("/api/admin/database"),
          adminFetch("/api/admin/onboarding"),
          adminFetch("/api/admin/onboarding-requests"),
          adminFetch("/api/admin/access-requests"),
          adminFetch("/api/admin/users"),
          adminFetch("/api/admin/cohorts"),
          adminFetch("/api/admin/roadmaps"),
        ]);
        const overviewData = await overviewResponse.json();
        const databaseData = await databaseResponse.json();
        const onboardingData = await onboardingResponse.json();
        const changeRequestsData = await changeRequestsResponse.json();
        const accessRequestsData = await accessRequestsResponse.json();
        const usersData = await usersResponse.json();
        const cohortsData = await cohortsResponse.json();
        const roadmapsData = await roadmapsResponse.json();

        setOverview(overviewData);
        setOnboardingRecords(onboardingData.records);
        setChangeRequests(changeRequestsData.requests ?? []);
        setPendingChangeRequests(changeRequestsData.pendingCount ?? 0);
        setAccessRequests(accessRequestsData.requests ?? []);
        setAdminUsers(usersData.users ?? []);
        setCohorts(cohortsData.cohorts ?? []);
        setRoadmapCoverage(roadmapsData.coverage ?? { total: 0, valid: 0, invalid: 0 });
        setRoadmaps(roadmapsData.roadmaps ?? []);
        setTables(databaseData.tables);
        setActiveTableName((current) =>
          databaseData.tables.some((table: AdminTable) => table.name === current)
            ? current
            : databaseData.tables[0]?.name ?? "users",
        );
      } catch (caught) {
        failures.push(caught instanceof Error ? `Other admin data: ${caught.message}` : "Other admin data could not be loaded.");
      }
      try {
        await loadReviewSubmissions();
      } catch (caught) {
        failures.push(caught instanceof Error ? `Submission queue: ${caught.message}` : "Submission queue could not be loaded.");
      }
      setError(failures.join(" "));
    } catch (caughtError) {
      const status = (caughtError as Error & { status?: number }).status;
      if (status === 401 || status === 403) setIsSignedIn(false);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load admin data.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleSave() {
    if (!activeTable || !selectedRowId) {
      return;
    }

    if (!window.confirm(`Save changes to ${activeTable.name}:${selectedRowId}? This will be audit logged.`)) {
      return;
    }

    try {
      setAdminBusyAction("save");
      const parsed = JSON.parse(draft);
      await adminFetch(`/api/admin/database/${activeTable.name}/${selectedRowId}`, {
        method: "PATCH",
        body: JSON.stringify({ data: parsed }),
      });
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save row.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleCreate() {
    if (!activeTable) {
      return;
    }

    if (!window.confirm(`Create a new row in ${activeTable.name}? This will be audit logged.`)) {
      return;
    }

    try {
      setAdminBusyAction("create");
      const parsed = JSON.parse(createDraft);
      await adminFetch(`/api/admin/database/${activeTable.name}`, {
        method: "POST",
        body: JSON.stringify({ data: parsed }),
      });
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create row.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleDelete() {
    if (!activeTable || !selectedRowId) {
      return;
    }

    if (!window.confirm(`Delete ${activeTable.name}:${selectedRowId}? This cannot be undone and will be audit logged.`)) {
      return;
    }

    try {
      setAdminBusyAction("delete");
      await adminFetch(`/api/admin/database/${activeTable.name}/${selectedRowId}`, {
        method: "DELETE",
      });
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete row.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function loadReviewSubmissions() {
    const response = await adminFetch("/api/admin/submissions");
    const data = await response.json();
    setReviewSubmissions(data.submissions ?? []);
  }

  async function handleReviewSubmission(
    submissionId: string,
    decision: "VERIFIED" | "NEEDS_REVISION",
    draft: SubmissionReviewDraft,
  ) {
    if (draft.reviewNotes.trim().length < 20) {
      setError("Add at least 20 characters explaining what the evidence shows or what needs revision.");
      return;
    }
    if (decision === "VERIFIED" && (!draft.verifiedSkills.trim() || draft.resumeBullet.trim().length < 30 || draft.portfolioSummary.trim().length < 60)) {
      setError("Before verifying, confirm at least one skill and review the resume bullet and portfolio summary.");
      return;
    }
    try {
      setAdminBusyAction(`review-${submissionId}`);
      await adminFetch(`/api/admin/submissions/${submissionId}/review`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reviewNotes: draft.reviewNotes.trim(),
          verifiedSkills: draft.verifiedSkills.trim(),
          resumeBullet: decision === "VERIFIED" ? draft.resumeBullet.trim() : null,
          portfolioSummary: decision === "VERIFIED" ? draft.portfolioSummary.trim() : null,
        }),
      });
      await loadReviewSubmissions();
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to review submission.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleDecideChangeRequest(
    requestId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    const actionLabel = decision === "APPROVED" ? "approve" : "reject";
    if (
      !window.confirm(
        decision === "APPROVED"
          ? "Approve this request and grant the student one additional profile edit?"
          : "Reject this onboarding-change request?",
      )
    ) {
      return;
    }

    try {
      setAdminBusyAction(`change-${requestId}`);
      await adminFetch(
        `/api/admin/onboarding-requests/${requestId}/${decision === "APPROVED" ? "approve" : "reject"}`,
        {
          method: "POST",
          body: JSON.stringify({ note: decisionNotes[requestId]?.trim() || null }),
        },
      );
      setDecisionNotes((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      await loadAdminData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `Unable to ${actionLabel} change request.`,
      );
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleDecideAccessRequest(requestId: string, decision: "APPROVE" | "REJECT") {
    try {
      setAdminBusyAction(`access-${requestId}`);
      await adminFetch(`/api/admin/access-requests/${requestId}/${decision.toLowerCase()}`, { method: "POST", body: "{}" });
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to decide access request.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleGrantPlan(userId: string, plan: "FREE" | "PRO" | "PRO_PLUS") {
    const reason = window.prompt(`Reason for changing this user to ${plan}:`, "Local Cycle 2 QA");
    if (!reason?.trim()) return;
    try {
      setAdminBusyAction(`plan-${userId}`);
      await adminFetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ plan, reason: reason.trim() }),
      });
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to change plan.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleAssignCohort(userId: string, cohortId: string) {
    if (!cohortId) return;
    try {
      setAdminBusyAction(`cohort-${userId}`);
      await adminFetch(`/api/admin/cohorts/${cohortId}/members/${userId}`, { method: "PATCH", body: "{}" });
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to assign cohort.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleSaveReviewerProfile(userId: string, profile: Omit<CatalogReviewerProfile, "userId" | "reviewerKind">) {
    try {
      setAdminBusyAction(`reviewer-${userId}`);
      await adminFetch(`/api/admin/catalog-reviewers/${userId}`, { method: "PUT", body: JSON.stringify(profile) });
      await loadAdminData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update reviewer access.");
    } finally {
      setAdminBusyAction("");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    setIsSignedIn(false);
    setOverview(null);
    setOnboardingRecords([]);
    setChangeRequests([]);
    setPendingChangeRequests(0);
    setAccessRequests([]);
    setAdminUsers([]);
    setCohorts([]);
    setRoadmapCoverage({ total: 0, valid: 0, invalid: 0 });
    setRoadmaps([]);
    setPilotCatalog(null);
    setDecisionNotes({});
    setTables([]);
    setReviewSubmissions([]);
  }

  if (!isSignedIn) {
    return (
      <section className="plain-admin plain-admin-login-layout">
        <main className="plain-admin-main plain-admin-main--login">
          <div className="plain-admin-login">
            <p className="plain-admin-kicker">Intrnd</p>
            <h1>Admin sign in</h1>
            <p className="plain-admin-login-copy">
              Review submissions, onboarding requests, and platform data.
            </p>
            {error && <p className="plain-admin-error">{error}</p>}
            <p>Sign in with an Intrnd account that has the ADMIN role.</p>
            <button
              type="button"
              className="plain-admin-btn"
              data-variant="primary"
              onClick={() => { window.location.href = "/sign-in"; }}
            >
              Go to account sign in
            </button>
          </div>
        </main>
      </section>
    );
  }

  return (
    <section className="plain-admin">
      <AdminSidebar
        activeView={activeView}
        onChangeView={setActiveView}
        badges={{
          overview: pendingChangeRequests,
          projects: reviewSubmissions.length,
          onboarding: pendingChangeRequests,
        }}
      />

      <main className="plain-admin-main">
        <div className="plain-admin-toolbar">
          <div>
            <h1>{getViewTitle(activeView)}</h1>
            <p>{getViewDescription(activeView)}</p>
          </div>
          <div className="plain-admin-toolbar-actions">
            <button
              type="button"
              className="plain-admin-btn"
              data-variant="secondary"
              onClick={() => loadAdminData()}
              disabled={adminBusyAction === "refresh"}
              aria-busy={adminBusyAction === "refresh"}
            >
              {adminBusyAction === "refresh" ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              className="plain-admin-btn"
              data-variant="ghost"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>

        {error && <p className="plain-admin-error">{error}</p>}

        <div className="plain-admin-stack">
          {activeView === "overview" && overview && (
            <OverviewView
              overview={overview}
              changeRequests={changeRequests}
              accessRequests={accessRequests}
              onDecideAccess={handleDecideAccessRequest}
              decisionNotes={decisionNotes}
              onChangeNote={(requestId, note) =>
                setDecisionNotes((current) => ({ ...current, [requestId]: note }))
              }
              onDecide={handleDecideChangeRequest}
              busyAction={adminBusyAction}
              onOpenOnboarding={() => setActiveView("onboarding")}
            />
          )}
          {activeView === "onboarding" && (
            <OnboardingView
              records={onboardingRecords}
              changeRequests={changeRequests}
              pendingCount={pendingChangeRequests}
              decisionNotes={decisionNotes}
              onChangeNote={(requestId, note) =>
                setDecisionNotes((current) => ({ ...current, [requestId]: note }))
              }
              onDecide={handleDecideChangeRequest}
              busyAction={adminBusyAction}
            />
          )}
          {activeView === "users" && (
            <UsersView
              users={adminUsers}
              cohorts={cohorts}
              busyAction={adminBusyAction}
              onGrantPlan={handleGrantPlan}
              onAssignCohort={handleAssignCohort}
              taxonomy={pilotCatalog?.taxonomy ?? null}
              onSaveReviewerProfile={handleSaveReviewerProfile}
            />
          )}
          {activeView === "subscriptions" && (
            <TableView table={getTableByName(tables, "subscriptions")} />
          )}
          {activeView === "projects" && (
            <SubmissionsReviewView
              submissions={reviewSubmissions}
              onReview={handleReviewSubmission}
              busyAction={adminBusyAction}
            />
          )}
          {activeView === "roadmaps" && (
            <RoadmapsView
              coverage={roadmapCoverage}
              roadmaps={roadmaps}
              onPublished={loadAdminData}
              onOpenCatalog={(projectId) => { sessionStorage.setItem("intrnd-admin-catalog-project", projectId); setActiveView("pilotCatalog"); }}
            />
          )}
          {activeView === "pilotCatalog" && pilotCatalog && (
            <PilotCatalogView catalog={pilotCatalog} onChanged={loadAdminData} />
          )}
          {activeView === "payments" && <ComingSoon title="Payments" />}
          {activeView === "reports" && <ReportsView cohorts={cohorts} />}
          {activeView === "database" && (
            <DatabaseTools
              tables={tables}
              activeTable={activeTable}
              activeTableName={activeTableName}
              selectedRowId={selectedRowId}
              draft={draft}
              createDraft={createDraft}
              onChangeTable={setActiveTableName}
              onSelectRow={setSelectedRowId}
              onChangeDraft={setDraft}
              onChangeCreateDraft={setCreateDraft}
              onSave={handleSave}
              onDelete={handleDelete}
              onCreate={handleCreate}
              busyAction={adminBusyAction}
            />
          )}
        </div>
      </main>
    </section>
  );
}

function AdminSidebar({
  activeView,
  onChangeView,
  badges = {},
}: {
  activeView?: AdminView;
  onChangeView?: (view: AdminView) => void;
  badges?: Partial<Record<AdminView, number>>;
}) {
  useEffect(() => {
    const active = document.querySelector<HTMLElement>(".plain-admin-nav button.is-active");
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeView]);

  return (
    <nav className="plain-admin-nav" aria-label="Admin pages">
      <div className="plain-admin-nav-brand">
        <strong>Intrnd Admin</strong>
        <span>Internal console</span>
      </div>
      {adminNavGroups.map((group) => (
        <div key={group.label} className="plain-admin-nav-group">
          <p className="plain-admin-nav-group-label">{group.label}</p>
          {group.items.map((item) => {
            const badge = badges[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                className={activeView === item.id ? "is-active" : ""}
                onClick={() => onChangeView?.(item.id)}
              >
                <span>{item.label}</span>
                {badge > 0 ? <small>{badge}</small> : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function OverviewView({
  overview,
  changeRequests,
  accessRequests,
  onDecideAccess,
  decisionNotes,
  onChangeNote,
  onDecide,
  busyAction,
  onOpenOnboarding,
}: {
  overview: Overview;
  changeRequests: ProfileChangeRequestRow[];
  accessRequests: PilotAccessRequestRow[];
  onDecideAccess: (requestId: string, decision: "APPROVE" | "REJECT") => void;
  decisionNotes: Record<string, string>;
  onChangeNote: (requestId: string, note: string) => void;
  onDecide: (requestId: string, decision: "APPROVED" | "REJECTED") => void;
  busyAction: string;
  onOpenOnboarding: () => void;
}) {
  const pendingRequests = changeRequests.filter((request) => request.status === "PENDING");
  const pendingAccess = accessRequests.filter((request) => request.status === "PENDING");

  return (
    <>
      <section className="plain-admin-panel">
        <header className="plain-admin-panel-head">
          <h2>Platform snapshot</h2>
          <p>Live counts across the core Intrnd tables.</p>
        </header>
        <div className="plain-admin-metrics">
          <Metric label="Active subscriptions" value={overview.cards.activeSubscriptions} />
          <Metric label="Users" value={overview.cards.users} />
          <Metric label="Projects" value={overview.cards.projects} />
          <Metric label="Waitlist" value={overview.cards.waitlistEntries} />
          <Metric label="Payments" value={overview.cards.payments} />
          <Metric label="Reports" value={overview.cards.reports} />
        </div>
      </section>

      <ChangeRequestsPanel
        title="Onboarding-change requests"
        description="Approve to grant one more profile edit, or reject with an optional note for the student."
        requests={pendingRequests}
        decisionNotes={decisionNotes}
        onChangeNote={onChangeNote}
        onDecide={onDecide}
        busyAction={busyAction}
        emptyMessage="No pending onboarding-change requests."
        footer={
          <button
            type="button"
            className="plain-admin-btn"
            data-variant="ghost"
            onClick={onOpenOnboarding}
          >
            Open full onboarding queue
          </button>
        }
      />

      <section className="plain-admin-panel">
        <header className="plain-admin-panel-head">
          <h2>Pilot access requests</h2>
          <p>Approve explicit access grants; students cannot change their own plans.</p>
        </header>
        {pendingAccess.length === 0 ? <p className="plain-admin-empty">No pending access requests.</p> : (
          <div className="plain-admin-review-list">
            {pendingAccess.map((request) => {
              const busy = busyAction === `access-${request.id}`;
              return <article key={request.id}>
                <div><h3>{request.user.name || request.user.email}</h3><p>{request.user.email} requested {request.requestedPlan}</p></div>
                <div className="plain-admin-review-actions">
                  <button type="button" className="plain-admin-btn" data-variant="primary" disabled={busy} onClick={() => onDecideAccess(request.id, "APPROVE")}>Approve</button>
                  <button type="button" className="plain-admin-btn" data-variant="danger" disabled={busy} onClick={() => onDecideAccess(request.id, "REJECT")}>Reject</button>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      <section className="plain-admin-panel">
        <header className="plain-admin-panel-head">
          <h2>Recent subscriptions</h2>
        </header>
        <DataTable rows={overview.subscriptions} />
      </section>

      <section className="plain-admin-panel">
        <header className="plain-admin-panel-head">
          <h2>Recent admin activity</h2>
        </header>
        <DataTable rows={overview.recentActivity} />
      </section>
    </>
  );
}

function OnboardingView({
  records,
  changeRequests,
  pendingCount,
  decisionNotes,
  onChangeNote,
  onDecide,
  busyAction,
}: {
  records: OnboardingRecord[];
  changeRequests: ProfileChangeRequestRow[];
  pendingCount: number;
  decisionNotes: Record<string, string>;
  onChangeNote: (requestId: string, note: string) => void;
  onDecide: (requestId: string, decision: "APPROVED" | "REJECTED") => void;
  busyAction: string;
}) {
  const completedCount = records.filter((record) => record.onboardingCompleted).length;
  const pendingRequests = changeRequests.filter((request) => request.status === "PENDING");
  const decidedRequests = changeRequests.filter((request) => request.status !== "PENDING");

  return (
    <>
      <section className="plain-admin-metrics plain-admin-metrics--inline">
        <Metric label="Onboarded users" value={completedCount} />
        <Metric label="Total users" value={records.length} />
        <Metric label="Pending change requests" value={pendingCount} />
      </section>

      <ChangeRequestsPanel
        title="Onboarding change requests"
        description="Students get one profile update after signup. Approve a request to grant one more edit; reject to keep the profile locked."
        requests={pendingRequests}
        decisionNotes={decisionNotes}
        onChangeNote={onChangeNote}
        onDecide={onDecide}
        busyAction={busyAction}
        emptyMessage="No pending change requests."
      />

      {decidedRequests.length > 0 ? (
        <section className="plain-admin-panel">
          <header className="plain-admin-panel-head">
            <h3>Recent decisions</h3>
          </header>
          <DataTable
            rows={decidedRequests.map((request) => ({
              id: request.id,
              status: request.status,
              email: request.user.email,
              name: request.user.name,
              reason: request.reason,
              decisionNote: request.decisionNote,
              reviewedBy: request.reviewedBy,
              reviewedAt: request.reviewedAt,
              createdAt: request.createdAt,
            }))}
          />
        </section>
      ) : null}

      <section className="plain-admin-panel">
        <header className="plain-admin-panel-head">
          <h2>Onboarding records</h2>
        </header>
        <DataTable rows={records} />
      </section>
    </>
  );
}

function SubmissionsReviewView({
  submissions,
  onReview,
  busyAction,
}: {
  submissions: ReviewSubmission[];
  onReview: (
    submissionId: string,
    decision: "VERIFIED" | "NEEDS_REVISION",
    draft: SubmissionReviewDraft,
  ) => void;
  busyAction: string;
}) {
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, SubmissionReviewDraft>>({});

  if (submissions.length === 0) {
    return (
      <section className="plain-admin-panel">
        <header className="plain-admin-panel-head">
          <h2>Project submissions</h2>
        </header>
        <p className="plain-admin-empty">No submissions are waiting for review.</p>
      </section>
    );
  }

  return (
    <section className="plain-admin-panel">
      <header className="plain-admin-panel-head">
        <h2>Project submissions</h2>
        <p>{submissions.length} waiting for a decision.</p>
      </header>
      <div className="plain-admin-review-list">
        {submissions.map((submission) => {
          const busy = busyAction === `review-${submission.id}`;
          const draft = reviewDrafts[submission.id] ?? defaultSubmissionReviewDraft(submission);
          const updateDraft = (field: keyof SubmissionReviewDraft, value: string) => {
            setReviewDrafts((current) => ({
              ...current,
              [submission.id]: { ...(current[submission.id] ?? defaultSubmissionReviewDraft(submission)), [field]: value },
            }));
          };
          return (
            <article key={submission.id} data-status={submission.status.toLowerCase()}>
              <div>
                <span className="plain-admin-status" data-tone="review">
                  {submission.status}
                </span>
                <h3>{submission.project.title}</h3>
                <p>{submission.student.email}</p>
                {submission.deliverableUrl && (
                  <a href={submission.deliverableUrl} target="_blank" rel="noreferrer">
                    Open deliverable
                  </a>
                )}
                {submission.notes && <p>{submission.notes}</p>}
                {submission.items?.length ? (
                  <div className="plain-admin-evidence">
                    {submission.items.map((item) => (
                      <p key={item.id}>
                        <strong>{item.kind.toLowerCase()}:</strong>{" "}
                        {item.downloadUrl || item.url ? (
                          <a href={item.downloadUrl ?? item.url ?? "#"} target="_blank" rel="noreferrer">
                            {item.originalFileName ?? item.url}
                          </a>
                        ) : item.textValue}
                      </p>
                    ))}
                  </div>
                ) : null}
                {submission.project.verificationMethod && (
                  <small>{submission.project.verificationMethod}</small>
                )}
                <div className="plain-admin-proof-fields">
                  <label className="plain-admin-note-field">
                    Evidence review note
                    <textarea
                      value={draft.reviewNotes}
                      rows={3}
                      placeholder="Name the evidence checked and what it demonstrates, or explain the exact revision needed."
                      onChange={(event) => updateDraft("reviewNotes", event.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className="plain-admin-note-field">
                    Confirmed skills
                    <input
                      value={draft.verifiedSkills}
                      placeholder="e.g. SQL, data visualization"
                      onChange={(event) => updateDraft("verifiedSkills", event.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className="plain-admin-note-field">
                    Reviewed resume bullet
                    <textarea
                      value={draft.resumeBullet}
                      rows={3}
                      onChange={(event) => updateDraft("resumeBullet", event.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className="plain-admin-note-field">
                    Reviewed portfolio summary
                    <textarea
                      value={draft.portfolioSummary}
                      rows={4}
                      onChange={(event) => updateDraft("portfolioSummary", event.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <small>Verification publishes only the claims you confirm here. Revision requests use the evidence review note.</small>
                </div>
              </div>
              <div className="plain-admin-review-actions">
                <button
                  type="button"
                  className="plain-admin-btn"
                  data-variant="primary"
                  onClick={() => onReview(submission.id, "VERIFIED", draft)}
                  disabled={busy}
                  aria-busy={busy}
                >
                  Verify
                </button>
                <button
                  type="button"
                  className="plain-admin-btn"
                  data-variant="secondary"
                  onClick={() => onReview(submission.id, "NEEDS_REVISION", draft)}
                  disabled={busy}
                  aria-busy={busy}
                >
                  Needs revision
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function defaultSubmissionReviewDraft(submission: ReviewSubmission): SubmissionReviewDraft {
  const skills = submission.project.skills?.split(",").map((skill) => skill.trim()).filter(Boolean) ?? [];
  const focus = skills.slice(0, 2).join(" and ") || "project execution";
  const deliverable = submission.project.deliverable ?? "a completed project deliverable";
  return {
    reviewNotes: "",
    verifiedSkills: "",
    resumeBullet: `Completed ${submission.project.title}, producing ${deliverable} and demonstrating ${focus}.`,
    portfolioSummary: `Completed ${submission.project.title} by following the project brief, documenting the approach, and submitting ${deliverable} for evidence-based review.`,
  };
}

function UsersView({
  users,
  cohorts,
  busyAction,
  onGrantPlan,
  onAssignCohort,
  taxonomy,
  onSaveReviewerProfile,
}: {
  users: AdminUserRow[];
  cohorts: PilotCohortRow[];
  busyAction: string;
  onGrantPlan: (userId: string, plan: "FREE" | "PRO" | "PRO_PLUS") => void;
  onAssignCohort: (userId: string, cohortId: string) => void;
  taxonomy: CareerTaxonomy | null;
  onSaveReviewerProfile: (userId: string, profile: Omit<CatalogReviewerProfile, "userId" | "reviewerKind">) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleUsers = users.filter((user) =>
    !normalizedQuery || `${user.name ?? ""} ${user.email}`.toLowerCase().includes(normalizedQuery),
  );

  return (
    <section className="plain-admin-panel">
      <header className="plain-admin-panel-head">
        <h2>User access and reviewers</h2>
        <p>Manage pilot access and grant least-privilege catalog-review assignments.</p>
      </header>
      <label>
        Search users
        <input
          type="search"
          value={query}
          placeholder="Name or email"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {visibleUsers.length === 0 ? (
        <p className="plain-admin-empty">No users match this search.</p>
      ) : (
        <section className="plain-admin-review-list" aria-label="User access controls">
          {visibleUsers.map((user) => {
            const busy = busyAction === `plan-${user.id}` || busyAction === `cohort-${user.id}`;
            return (
              <article key={user.id}>
                <header>
                  <span className="plain-admin-status" data-tone={user.role === "ADMIN" ? "review" : "neutral"}>{user.role}</span>
                  <h3>{user.name ?? user.email}</h3>
                  <p>{user.email}</p>
                </header>
                <p>Plan: <strong>{user.plan}</strong> · Cohort: <strong>{user.cohort?.name ?? "None"}</strong></p>
                <section className="plain-admin-review-actions" aria-label={`Access actions for ${user.email}`}>
                  <label>
                    Plan
                    <select
                      value={user.plan}
                      disabled={busy}
                      onChange={(event) => onGrantPlan(user.id, event.target.value as "FREE" | "PRO" | "PRO_PLUS")}
                    >
                      <option value="FREE">Free</option>
                      <option value="PRO">Pro</option>
                      <option value="PRO_PLUS">Pro Plus</option>
                    </select>
                  </label>
                  <label>
                    Pilot cohort
                    <select
                      value={user.cohortId ?? ""}
                      disabled={busy || cohorts.length === 0}
                      onChange={(event) => onAssignCohort(user.id, event.target.value)}
                    >
                      <option value="">No cohort</option>
                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={cohort.id}>{cohort.name} ({cohort._count.users})</option>
                      ))}
                    </select>
                  </label>
                </section>
                {taxonomy && (
                  <ReviewerProfileEditor
                    user={user}
                    taxonomy={taxonomy}
                    busy={busyAction === `reviewer-${user.id}`}
                    onSave={(profile) => onSaveReviewerProfile(user.id, profile)}
                  />
                )}
              </article>
            );
          })}
        </section>
      )}
    </section>
  );
}

function ReviewerProfileEditor({ user, taxonomy, busy, onSave }: {
  user: AdminUserRow;
  taxonomy: CareerTaxonomy;
  busy: boolean;
  onSave: (profile: Omit<CatalogReviewerProfile, "userId" | "reviewerKind">) => void;
}) {
  const empty = { reviewerTypes: [] as string[], domainExpertiseIds: [] as string[], careerExpertiseIds: [] as string[], active: false };
  const [draft, setDraft] = useState(user.catalogReviewerProfile ? {
    reviewerTypes: user.catalogReviewerProfile.reviewerTypes,
    domainExpertiseIds: user.catalogReviewerProfile.domainExpertiseIds,
    careerExpertiseIds: user.catalogReviewerProfile.careerExpertiseIds,
    active: user.catalogReviewerProfile.active,
  } : empty);
  useEffect(() => {
    setDraft(user.catalogReviewerProfile ? {
      reviewerTypes: user.catalogReviewerProfile.reviewerTypes,
      domainExpertiseIds: user.catalogReviewerProfile.domainExpertiseIds,
      careerExpertiseIds: user.catalogReviewerProfile.careerExpertiseIds,
      active: user.catalogReviewerProfile.active,
    } : empty);
  }, [user.catalogReviewerProfile]);
  const toggle = (key: "reviewerTypes" | "domainExpertiseIds" | "careerExpertiseIds", value: string) => {
    setDraft((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((entry) => entry !== value) : [...current[key], value] }));
  };
  return (
    <details className="plain-admin-catalog-evidence">
      <summary>Catalog reviewer profile</summary>
      <fieldset className="plain-admin-checklist">
        <legend>Permitted review types</legend>
        {[["DOMAIN", "Domain expert"], ["CAREER", "Career and portfolio expert"]].map(([value, label]) => (
          <label key={value}><input type="checkbox" checked={draft.reviewerTypes.includes(value)} onChange={() => toggle("reviewerTypes", value)} /><span>{label}</span></label>
        ))}
      </fieldset>
      {draft.reviewerTypes.includes("DOMAIN") && <TaxonomyMultiSelect label="Domain expertise" options={taxonomy.domains} values={draft.domainExpertiseIds} onChange={(values) => setDraft((current) => ({ ...current, domainExpertiseIds: values }))} />}
      {draft.reviewerTypes.includes("CAREER") && <TaxonomyMultiSelect label="Career-review expertise" options={taxonomy.careerReviewerExpertise} values={draft.careerExpertiseIds} onChange={(values) => setDraft((current) => ({ ...current, careerExpertiseIds: values }))} />}
      <label className="plain-admin-checklist"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} /><span>Reviewer access active</span></label>
      <button type="button" className="plain-admin-btn" data-variant="secondary" disabled={busy} onClick={() => onSave(draft)}>{busy ? "Saving…" : "Save reviewer profile"}</button>
    </details>
  );
}

function ReportsView({ cohorts }: { cohorts: PilotCohortRow[] }) {
  const [selectedCohortId, setSelectedCohortId] = useState(cohorts[0]?.id ?? "");
  const [report, setReport] = useState<CohortReport | null>(null);
  const [reportError, setReportError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedCohortId && cohorts[0]?.id) setSelectedCohortId(cohorts[0].id);
    if (selectedCohortId && !cohorts.some((cohort) => cohort.id === selectedCohortId)) {
      setSelectedCohortId(cohorts[0]?.id ?? "");
    }
  }, [cohorts, selectedCohortId]);

  useEffect(() => {
    if (!selectedCohortId) {
      setReport(null);
      return;
    }
    let active = true;
    setIsLoading(true);
    setReportError("");
    void adminFetch(`/api/admin/cohorts/${selectedCohortId}/metrics`)
      .then(async (response) => response.json() as Promise<CohortReport>)
      .then((data) => { if (active) setReport(data); })
      .catch((caughtError) => {
        if (active) setReportError(caughtError instanceof Error ? caughtError.message : "Unable to load cohort report.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [selectedCohortId]);

  if (cohorts.length === 0) {
    return (
      <Card padding={5}>
        <VStack gap={2}>
          <Heading level={2}>Pilot cohort report</Heading>
          <Text type="supporting">Create a pilot cohort and enroll students before viewing funnel metrics.</Text>
        </VStack>
      </Card>
    );
  }

  const stages = report ? [
    ["Enrolled", report.funnel.enrolled],
    ["Recommendations", report.funnel.recommendations],
    ["Started", report.funnel.started],
    ["Submitted", report.funnel.submitted],
    ["Verified", report.funnel.verified],
  ] as const : [];
  const reviewTotal = report?.reviewerWorkload.reduce((total, row) => total + row.reviews, 0) ?? 0;
  const workloadRows: ReviewerWorkloadRow[] = (report?.reviewerWorkload ?? []).map((row) => ({
    id: row.reviewer,
    reviewer: row.reviewer,
    reviews: row.reviews,
    share: reviewTotal ? formatPercent(row.reviews / reviewTotal) : "-",
  }));
  const workloadColumns: TableColumn<ReviewerWorkloadRow>[] = [
    { key: "reviewer", header: "Reviewer", width: proportional(2) },
    { key: "reviews", header: "Reviews", width: pixel(100), align: "end" },
    { key: "share", header: "Workload share", width: pixel(140), align: "end" },
  ];
  const checkpointRows: CheckpointDropoffRow[] = (report?.roadmaps.checkpointDropoff ?? [])
    .sort((left, right) => (left.completionRate ?? 1) - (right.completionRate ?? 1) || right.viewedApplications - left.viewedApplications)
    .slice(0, 12)
    .map((row) => ({
      id: row.checkpointId,
      checkpoint: row.checkpointId,
      viewed: row.viewedApplications,
      completed: row.completedApplications,
      completion: formatPercent(row.completionRate),
    }));
  const checkpointColumns: TableColumn<CheckpointDropoffRow>[] = [
    { key: "checkpoint", header: "Checkpoint ID", width: proportional(2) },
    { key: "viewed", header: "Viewed", width: pixel(90), align: "end" },
    { key: "completed", header: "Completed", width: pixel(105), align: "end" },
    { key: "completion", header: "Completion", width: pixel(110), align: "end" },
  ];

  return (
    <VStack gap={5}>
      <Card padding={5}>
        <VStack gap={3}>
          <Heading level={2}>Pilot cohort report</Heading>
          <Text type="supporting">Conversion, time-to-proof, review operations, engagement, and telemetry integrity.</Text>
          <Field label="Cohort" inputID="admin-report-cohort" width={360}>
            <select
              id="admin-report-cohort"
              value={selectedCohortId}
              onChange={(event) => setSelectedCohortId(event.target.value)}
            >
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>{cohort.name} ({cohort._count.users})</option>
              ))}
            </select>
          </Field>
          {isLoading ? <Text type="supporting">Loading report...</Text> : null}
          {reportError ? <Text color="accent">{reportError}</Text> : null}
        </VStack>
      </Card>

      {report ? (
        <>
          <VStack gap={3} as="section">
            <Heading level={2}>Student funnel</Heading>
            <Text type="supporting">Each stage counts unique enrolled students. Conversion compares each stage with the previous stage.</Text>
            <Grid gap={3} columns={{ minWidth: 170, repeat: "fit" }}>
              {stages.map(([label, stage], index) => (
                <Card key={label} padding={4} variant={index === stages.length - 1 ? "green" : "muted"}>
                  <VStack gap={1.5}>
                    <Text type="label">{label}</Text>
                    <Text type="display-3" hasTabularNumbers>{stage.count}</Text>
                    <Text type="supporting">
                      {index === 0 ? "Cohort baseline" : `${formatPercent(stage.conversionFromPrevious)} from previous`}
                    </Text>
                    <Text type="supporting">{formatPercent(stage.conversionFromEnrolled)} of enrolled</Text>
                  </VStack>
                </Card>
              ))}
            </Grid>
          </VStack>

          <VStack gap={3} as="section">
            <Heading level={2}>Median time between stages</Heading>
            <Grid gap={3} columns={{ minWidth: 220, repeat: "fit" }}>
              {report.stageTiming.map((stage) => (
                <Card key={stage.label} padding={4}>
                  <VStack gap={1.5}>
                    <Text type="label">{stage.label}</Text>
                    <Text type="display-3" hasTabularNumbers>{formatDuration(stage.medianHours)}</Text>
                    <Text type="supporting">{stage.sampleSize} matched student{stage.sampleSize === 1 ? "" : "s"}</Text>
                  </VStack>
                </Card>
              ))}
            </Grid>
          </VStack>

          <VStack gap={3} as="section">
            <Heading level={2}>Review operations</Heading>
            <Grid gap={3} columns={{ minWidth: 210, repeat: "fit" }}>
              <Card padding={4} variant="muted">
                <VStack gap={1.5}>
                  <Text type="label">48-hour SLA compliance</Text>
                  <Text type="display-3" hasTabularNumbers>{formatPercent(report.reviewSla.complianceRate)}</Text>
                  <Text type="supporting">{report.reviewSla.withinSla} of {report.reviewSla.reviewed} reviews</Text>
                </VStack>
              </Card>
              <Card padding={4}>
                <VStack gap={1.5}>
                  <Text type="label">Median review time</Text>
                  <Text type="display-3" hasTabularNumbers>{formatDuration(report.reviewSla.medianHours)}</Text>
                  <Text type="supporting">Target: {report.cohort.reviewSlaHours} hours</Text>
                </VStack>
              </Card>
              <Card padding={4}>
                <VStack gap={1.5}>
                  <Text type="label">Revision rate</Text>
                  <Text type="display-3" hasTabularNumbers>{formatPercent(report.revisionRate)}</Text>
                  <Text type="supporting">Reviewed attempts needing changes</Text>
                </VStack>
              </Card>
            </Grid>
            {workloadRows.length ? (
              <Card padding={0}>
                <Table
                  data={workloadRows}
                  columns={workloadColumns}
                  idKey="id"
                  density="compact"
                  dividers="rows"
                />
              </Card>
            ) : <Text type="supporting">No completed reviews yet.</Text>}
          </VStack>

          <VStack gap={3} as="section">
            <Heading level={2}>Proof engagement</Heading>
            <Grid gap={3} columns={{ minWidth: 220, repeat: "fit" }}>
              <Card padding={4}>
                <VStack gap={1.5}>
                  <Text type="label">Proof views</Text>
                  <Text type="display-3" hasTabularNumbers>{report.engagement.proofViews.total}</Text>
                  <Text type="supporting">{report.engagement.proofViews.uniqueUsers} unique students</Text>
                </VStack>
              </Card>
              <Card padding={4}>
                <VStack gap={1.5}>
                  <Text type="label">Resume bullet copies</Text>
                  <Text type="display-3" hasTabularNumbers>{report.engagement.resumeBulletCopies.total}</Text>
                  <Text type="supporting">{report.engagement.resumeBulletCopies.uniqueUsers} unique students</Text>
                </VStack>
              </Card>
              <Card padding={4} variant={report.eventIntegrity.noDuplicates ? "green" : "orange"}>
                <VStack gap={1.5}>
                  <Text type="label">Funnel event integrity</Text>
                  <Text type="large" weight="bold">{report.eventIntegrity.noDuplicates ? "No duplicates" : "Duplicates detected"}</Text>
                  <Text type="supporting">
                    {report.eventIntegrity.funnelEvents} events · {report.eventIntegrity.duplicateFunnelEvents} duplicates
                  </Text>
                </VStack>
              </Card>
            </Grid>
          </VStack>

          <VStack gap={3} as="section">
            <Heading level={2}>Roadmap quality</Heading>
            <Text type="supporting">Checkpoint drop-off, estimate accuracy, evidence friction, student feedback, and outcomes by guidance level.</Text>
            <Grid gap={3} columns={{ minWidth: 210, repeat: "fit" }}>
              <Card padding={4} variant="muted">
                <VStack gap={1.5}>
                  <Text type="label">Elapsed within twice the estimate</Text>
                  <Text type="display-3" hasTabularNumbers>{formatPercent(report.roadmaps.completionTiming.withinTwiceEstimateRate)}</Text>
                  <Text type="supporting">{report.roadmaps.completionTiming.sampleSize} measured checkpoints</Text>
                </VStack>
              </Card>
              <Card padding={4}>
                <VStack gap={1.5}>
                  <Text type="label">Median elapsed vs estimate</Text>
                  <Text type="large" weight="bold" hasTabularNumbers>{formatMinutes(report.roadmaps.completionTiming.medianActualMinutes)} / {formatMinutes(report.roadmaps.completionTiming.medianEstimatedMinutes)}</Text>
                  <Text type="supporting">Wall-clock time from first view to completion; inactive time is included</Text>
                </VStack>
              </Card>
              <Card padding={4} variant={report.roadmaps.evidenceValidationFailures === 0 ? "green" : "orange"}>
                <VStack gap={1.5}>
                  <Text type="label">Evidence validation failures</Text>
                  <Text type="display-3" hasTabularNumbers>{report.roadmaps.evidenceValidationFailures}</Text>
                  <Text type="supporting">Attempts blocked by missing required evidence</Text>
                </VStack>
              </Card>
              <Card padding={4}>
                <VStack gap={1.5}>
                  <Text type="label">Checkpoint helpfulness</Text>
                  <Text type="display-3" hasTabularNumbers>{formatPercent(report.roadmaps.feedback.helpfulRate)}</Text>
                  <Text type="supporting">{report.roadmaps.feedback.responses} student responses</Text>
                </VStack>
              </Card>
            </Grid>
            <Grid gap={3} columns={{ minWidth: 210, repeat: "fit" }}>
              {report.roadmaps.outcomesBySupport.map((outcome) => (
                <Card key={outcome.supportLevel} padding={4}>
                  <VStack gap={1.5}>
                    <Text type="label">{outcome.supportLevel.toLowerCase()} guidance</Text>
                    <Text type="large" weight="bold" hasTabularNumbers>{outcome.verified}/{outcome.configured} verified</Text>
                    <Text type="supporting">{outcome.submitted} submitted · {formatPercent(outcome.configured ? outcome.verified / outcome.configured : null)} verification rate</Text>
                  </VStack>
                </Card>
              ))}
            </Grid>
            {checkpointRows.length ? (
              <Card padding={0}>
                <Table data={checkpointRows} columns={checkpointColumns} idKey="id" density="compact" dividers="rows" />
              </Card>
            ) : <Text type="supporting">Checkpoint drop-off appears after students view and complete roadmap steps.</Text>}
          </VStack>
        </>
      ) : null}
    </VStack>
  );
}

function TableView({ table }: { table?: AdminTable }) {
  if (!table) {
    return <p className="plain-admin-empty">Loading…</p>;
  }

  return (
    <section className="plain-admin-panel">
      <header className="plain-admin-panel-head">
        <h2>{table.label}</h2>
        <p>{table.rows.length} rows</p>
      </header>
      <DataTable rows={table.rows} />
    </section>
  );
}

function DatabaseTools({
  tables,
  activeTable,
  activeTableName,
  selectedRowId,
  draft,
  createDraft,
  onChangeTable,
  onSelectRow,
  onChangeDraft,
  onChangeCreateDraft,
  onSave,
  onDelete,
  onCreate,
  busyAction,
}: {
  tables: AdminTable[];
  activeTable?: AdminTable;
  activeTableName: string;
  selectedRowId: string;
  draft: string;
  createDraft: string;
  onChangeTable: (table: string) => void;
  onSelectRow: (id: string) => void;
  onChangeDraft: (draft: string) => void;
  onChangeCreateDraft: (draft: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCreate: () => void;
  busyAction: string;
}) {
  return (
    <section className="plain-admin-panel">
      <div className="plain-admin-section-heading">
        <div>
          <h2>Database editor</h2>
          <p>Inspect rows and apply audited edits.</p>
        </div>
        <select value={activeTableName} onChange={(event) => onChangeTable(event.target.value)}>
          {tables.map((table) => (
            <option key={table.name} value={table.name}>
              {table.label}
            </option>
          ))}
        </select>
      </div>

      {activeTable && (
        <div className="plain-admin-db">
          <div>
            <DataTable
              rows={activeTable.rows}
              selectedRowId={selectedRowId}
              onSelectRow={onSelectRow}
            />
          </div>
          <div className="plain-admin-editor">
            <h3>Edit selected row</h3>
            {activeTable.readOnly ? (
              <p className="plain-admin-empty">
                This table is inspect-only. Use its dedicated admin workflow for audited changes.
              </p>
            ) : null}
            <textarea
              value={draft}
              onChange={(event) => onChangeDraft(event.target.value)}
              readOnly={activeTable.readOnly}
            />
            <div>
              <button
                type="button"
                className="plain-admin-btn"
                data-variant="primary"
                onClick={onSave}
                disabled={activeTable.readOnly || !selectedRowId || busyAction === "save"}
                aria-busy={busyAction === "save"}
              >
                {busyAction === "save" ? "Saving…" : "Save row"}
              </button>
              <button
                type="button"
                className="plain-admin-btn"
                data-variant="danger"
                onClick={onDelete}
                disabled={activeTable.readOnly || !selectedRowId || busyAction === "delete"}
                aria-busy={busyAction === "delete"}
              >
                {busyAction === "delete" ? "Deleting…" : "Delete row"}
              </button>
            </div>

            <h3>Create row</h3>
            <textarea
              value={createDraft}
              onChange={(event) => onChangeCreateDraft(event.target.value)}
              readOnly={activeTable.readOnly}
            />
            <button
              type="button"
              className="plain-admin-btn"
              data-variant="secondary"
              onClick={onCreate}
              disabled={activeTable.readOnly || busyAction === "create"}
              aria-busy={busyAction === "create"}
            >
              {busyAction === "create" ? "Creating…" : "Create row"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <section className="plain-admin-panel">
      <header className="plain-admin-panel-head">
        <h2>{title}</h2>
        <p>This admin page is coming soon.</p>
      </header>
    </section>
  );
}

function ChangeRequestsPanel({
  title,
  description,
  requests,
  decisionNotes,
  onChangeNote,
  onDecide,
  busyAction,
  emptyMessage,
  footer,
}: {
  title: string;
  description: string;
  requests: ProfileChangeRequestRow[];
  decisionNotes: Record<string, string>;
  onChangeNote: (requestId: string, note: string) => void;
  onDecide: (requestId: string, decision: "APPROVED" | "REJECTED") => void;
  busyAction: string;
  emptyMessage: string;
  footer?: ReactNode;
}) {
  return (
    <section className="plain-admin-panel">
      <header className="plain-admin-panel-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      {requests.length === 0 ? (
        <p className="plain-admin-empty">{emptyMessage}</p>
      ) : (
        <div className="plain-admin-review-list">
          {requests.map((request) => {
            const busy = busyAction === `change-${request.id}`;
            return (
              <article key={request.id} data-status={request.status.toLowerCase()}>
                <div>
                  <span className="plain-admin-status" data-tone="pending">
                    {request.status}
                  </span>
                  <h3>{request.user.name || request.user.email}</h3>
                  <p>{request.user.email}</p>
                  <p>
                    Edits used {request.user.profileEditsUsed} /{" "}
                    {request.user.profileEditsAllowed}
                    {request.user.accountType ? ` · ${request.user.accountType}` : ""}
                  </p>
                  {request.reason ? (
                    <p className="plain-admin-quote">&ldquo;{request.reason}&rdquo;</p>
                  ) : (
                    <p>No reason provided.</p>
                  )}
                  <small>Submitted {formatAdminDate(request.createdAt)}</small>
                  <label className="plain-admin-note-field">
                    Decision note (optional)
                    <textarea
                      value={decisionNotes[request.id] ?? ""}
                      placeholder="Shown to the student if you reject."
                      rows={2}
                      onChange={(event) => onChangeNote(request.id, event.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
                <div className="plain-admin-review-actions">
                  <button
                    type="button"
                    className="plain-admin-btn"
                    data-variant="primary"
                    onClick={() => onDecide(request.id, "APPROVED")}
                    disabled={busy}
                    aria-busy={busy}
                  >
                    {busy ? "Saving…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="plain-admin-btn"
                    data-variant="danger"
                    onClick={() => onDecide(request.id, "REJECTED")}
                    disabled={busy}
                    aria-busy={busy}
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {footer ? <div className="plain-admin-panel-footer">{footer}</div> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="plain-admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DataTable({
  rows,
  selectedRowId,
  onSelectRow,
}: {
  rows: Record<string, unknown>[];
  selectedRowId?: string;
  onSelectRow?: (id: string) => void;
}) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  if (rows.length === 0) {
    return <p>No records yet.</p>;
  }

  return (
    <div className="plain-admin-table-wrap">
      <table className="plain-admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={String(row.id)}
              className={String(row.id) === selectedRowId ? "is-selected" : ""}
              onClick={() => onSelectRow?.(String(row.id))}
            >
              {columns.map((column) => (
                <td key={column}>{formatCell(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error ?? "Admin request failed.") as Error & { issues?: RoadmapValidationIssue[]; status?: number };
    error.issues = Array.isArray(data.issues) ? data.issues : undefined;
    error.status = response.status;
    throw error;
  }

  return response;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPercent(value: number | null) {
  return value === null ? "No data" : `${Math.round(value * 100)}%`;
}

function formatDuration(hours: number | null) {
  if (hours === null) return "No data";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
  return `${(hours / 24).toFixed(1)} days`;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "No data";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(minutes < 600 ? 1 : 0)} hr`;
}

function getTableByName(tables: AdminTable[], name: string) {
  return tables.find((table) => table.name === name);
}

type PilotReviewDraft = CatalogReviewDraft;

function TaxonomyMultiSelect({ label, options, values, onChange }: { label: string; options: TaxonomyOption[]; values: string[]; onChange: (values: string[]) => void }) {
  const [query, setQuery] = useState("");
  const visible = options.filter((option) => !query.trim() || `${option.label} ${option.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (value: string) => onChange(values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]);
  return (
    <details className="plain-admin-catalog-evidence">
      <summary>{label} · {values.length} selected</summary>
      <label className="plain-admin-field"><span>Find {label.toLowerCase()}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} /></label>
      {values.length > 0 && <div className="plain-admin-chip-row">{values.map((value) => <button type="button" key={value} className="plain-admin-chip" onClick={() => toggle(value)} aria-label={`Remove ${options.find((option) => option.id === value)?.label ?? value}`}>{options.find((option) => option.id === value)?.label ?? value} ×</button>)}</div>}
      <fieldset className="plain-admin-checklist"><legend className="sr-only">{label}</legend>{visible.map((option) => <label key={option.id}><input type="checkbox" checked={values.includes(option.id)} onChange={() => toggle(option.id)} /><span>{option.label}</span></label>)}</fieldset>
    </details>
  );
}

function PilotCatalogView({
  catalog,
  onChanged,
}: {
  catalog: PilotCatalogResponse;
  onChanged: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem("intrnd-admin-catalog-project") ?? catalog.projects[0]?.id ?? "");
  const [draft, setDraft] = useState<PilotReviewDraft>(emptyCatalogReviewDraft);
  const [mappingDraft, setMappingDraft] = useState<CareerMappingDraft>({ targetRoleIds: [], competencyIds: [], portfolioSignalIds: [], requiredToolIds: [], accessRequirementIds: [], recommendedExperienceLevels: [], careerTaxonomyVersion: catalog.taxonomy.version });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState("ALL");
  const [finalReviewNotes, setFinalReviewNotes] = useState("");
  const selected = catalog.projects.find((project) => project.id === selectedId) ?? catalog.projects[0] ?? null;
  const visibleProjects = catalog.projects.filter((project) => {
    const matchesQuery = `${project.id} ${project.title} ${project.category ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const myReview = project.catalogReviews.find((review) => review.reviewerId === catalog.currentReviewerId);
    const myAssignment = project.catalogReviewAssignments.find((assignment) => assignment.reviewerId === catalog.currentReviewerId);
    const matchesQueue = queue === "ALL"
      || (queue === "MAPPING_INCOMPLETE" && project.careerMappingIssues.some((issue) => issue.severity === "ERROR"))
      || (queue === "UNASSIGNED" && project.publishReadiness.reasons.some((reason) => reason.endsWith("REVIEWER_UNASSIGNED")))
      || (queue === "NEEDS_MY_REVIEW" && myAssignment && !myReview)
      || (queue === "SECOND_REVIEW" && project.publishReadiness.approvingReviewers === 1 && myAssignment && !myReview)
      || (queue === "PUBLISHABLE" && project.publishReadiness.ready && project.pilotCatalogStatus !== "PILOT_READY")
      || (queue === "HOLD" && project.pilotCatalogStatus === "HOLD")
      || (queue === "READY" && project.pilotCatalogStatus === "PILOT_READY");
    return matchesQuery && matchesQueue;
  });
  const existingReview = selected?.catalogReviews.find((review) => review.reviewerId === catalog.currentReviewerId);
  const myAssignment = selected?.catalogReviewAssignments.find((assignment) => assignment.reviewerId === catalog.currentReviewerId) ?? null;
  const originalDraft = existingReview ? {
    decision: existingReview.decision,
    relevance: existingReview.relevance,
    feasibility: existingReview.feasibility,
    proofValue: existingReview.proofValue,
    readiness: existingReview.readiness,
    sourceTruth: existingReview.sourceTruth,
    resourceAccess: existingReview.resourceAccess,
    safeScope: existingReview.safeScope,
    issueCodes: existingReview.issueCodes,
    notes: existingReview.notes,
    confidence: existingReview.confidence,
    noConflictConfirmed: Boolean(existingReview.conflictConfirmedAt),
    scoreJustifications: {
      relevance: existingReview.scoreJustifications?.relevance ?? "",
      feasibility: existingReview.scoreJustifications?.feasibility ?? "",
      proofValue: existingReview.scoreJustifications?.proofValue ?? "",
      readiness: existingReview.scoreJustifications?.readiness ?? "",
    },
  } : emptyCatalogReviewDraft();
  const draftDirty = JSON.stringify(draft) !== JSON.stringify(originalDraft);
  const mappingDirty = Boolean(selected) && JSON.stringify(mappingDraft) !== JSON.stringify(selected.careerMapping);
  const finalReviewDirty = finalReviewNotes.trim().length > 0;

  useEffect(() => {
    if (!selectedId && catalog.projects[0]?.id) setSelectedId(catalog.projects[0].id);
    if (selectedId && !catalog.projects.some((project) => project.id === selectedId)) {
      setSelectedId(catalog.projects[0]?.id ?? "");
    }
  }, [catalog.projects, selectedId]);

  useEffect(() => {
    if (selectedId) sessionStorage.setItem("intrnd-admin-catalog-project", selectedId);
  }, [selectedId]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!draftDirty && !mappingDirty && !finalReviewDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [draftDirty, finalReviewDirty, mappingDirty]);

  useEffect(() => {
    if (!selected) return;
    const existing = selected.catalogReviews.find((review) => review.reviewerId === catalog.currentReviewerId);
    setDraft(existing ? {
      decision: existing.decision,
      relevance: existing.relevance,
      feasibility: existing.feasibility,
      proofValue: existing.proofValue,
      readiness: existing.readiness,
      sourceTruth: existing.sourceTruth,
      resourceAccess: existing.resourceAccess,
      safeScope: existing.safeScope,
      issueCodes: existing.issueCodes,
      notes: existing.notes,
      confidence: existing.confidence,
      noConflictConfirmed: Boolean(existing.conflictConfirmedAt),
      scoreJustifications: {
        relevance: existing.scoreJustifications?.relevance ?? "",
        feasibility: existing.scoreJustifications?.feasibility ?? "",
        proofValue: existing.scoreJustifications?.proofValue ?? "",
        readiness: existing.scoreJustifications?.readiness ?? "",
      },
    } : emptyCatalogReviewDraft());
    setMappingDraft(selected.careerMapping);
    setFinalReviewNotes("");
    setError("");
    setMessage("");
  }, [catalog.currentReviewerId, selected?.id, selected?.careerMappingVersion]);

  function chooseProject(projectId: string) {
    if (projectId === selectedId) return;
    if ((draftDirty || mappingDirty || finalReviewDirty) && !window.confirm("Discard unsaved catalog changes and open another project?")) return;
    setSelectedId(projectId);
  }

  async function saveReview() {
    if (!selected) return;
    setBusy("review");
    setError("");
    setMessage("");
    try {
      await adminFetch(`/api/admin/pilot-catalog/${selected.id}/review`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      await onChanged();
      setMessage("Your review was saved and added to the audit history.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the catalog review.");
    } finally {
      setBusy("");
    }
  }

  async function saveMapping() {
    if (!selected) return;
    setBusy("mapping"); setError(""); setMessage("");
    try {
      await adminFetch(`/api/admin/pilot-catalog/${selected.id}/career-mapping`, { method: "PUT", body: JSON.stringify({ ...mappingDraft, expectedVersion: selected.careerMappingVersion }) });
      await onChanged(); setMessage("Career mapping saved. Existing approvals are now stale until reviewers confirm the updated project.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save the career mapping."); }
    finally { setBusy(""); }
  }

  async function changeAssignment(reviewType: "DOMAIN" | "CAREER", reviewerId: string) {
    if (!selected) return;
    setBusy(`assignment-${reviewType}`); setError(""); setMessage("");
    try {
      await adminFetch(`/api/admin/pilot-catalog/${selected.id}/assignments/${reviewType}`, reviewerId
        ? { method: "PUT", body: JSON.stringify({ reviewerId }) }
        : { method: "DELETE" });
      await onChanged(); setMessage(`${friendlyCatalogLabel(reviewType)} reviewer assignment updated.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update the reviewer assignment."); }
    finally { setBusy(""); }
  }

  async function publishProject() {
    if (!selected) return;
    const notes = finalReviewNotes.trim();
    if (notes.length < 30) {
      setError("Add at least 30 characters explaining your human final-review decision.");
      return;
    }
    if (!window.confirm(`Confirm your final human review and publish ${selected.title} to the student pilot catalog?`)) return;
    setBusy("publish");
    setError("");
    setMessage("");
    try {
      await adminFetch(`/api/admin/pilot-catalog/${selected.id}/publish`, {
        method: "POST",
        body: JSON.stringify({
          projectFingerprint: selected.projectFingerprint,
          finalReviewNotes: notes,
        }),
      });
      await onChanged();
      setFinalReviewNotes("");
      setMessage("Human final review recorded. The project is now pilot-ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to publish this project.");
    } finally {
      setBusy("");
    }
  }

  async function holdProject() {
    if (!selected) return;
    const reason = window.prompt("Why should this project be held from the pilot?", "");
    if (!reason?.trim()) return;
    setBusy("hold");
    setError("");
    setMessage("");
    try {
      await adminFetch(`/api/admin/pilot-catalog/${selected.id}/hold`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await onChanged();
      setMessage("The project was placed on hold and removed from pilot eligibility.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to place this project on hold.");
    } finally {
      setBusy("");
    }
  }

  if (!selected) {
    return <section className="plain-admin-panel"><p className="plain-admin-empty">No pilot candidates are available. Sync the versioned manifest first.</p></section>;
  }

  const approvalCount = selected.publishReadiness.approvingReviewers;
  const selectedDomainIds = [...new Set(mappingDraft.targetRoleIds.map((roleId) => catalog.taxonomy.roles.find((role) => role.id === roleId)?.domainId).filter((value): value is string => Boolean(value)))];
  const eligibleReviewers = (reviewType: "DOMAIN" | "CAREER") => catalog.qualifiedReviewers.filter((reviewer) => (
    reviewer.reviewerKind === "HUMAN"
    &&
    reviewer.reviewerTypes.includes(reviewType)
    && (reviewType === "CAREER" || selectedDomainIds.some((domainId) => reviewer.domainExpertiseIds.includes(domainId)))
  ));
  return (
    <>
      <section className="plain-admin-metrics plain-admin-metrics--inline" aria-label="Pilot catalog readiness">
        <div className="plain-admin-metric"><span>Candidate pool</span><strong>{catalog.summary.syncedCandidates}</strong></div>
        <div className="plain-admin-metric"><span>Pilot-ready</span><strong>{catalog.summary.ready} / {catalog.minimumReady}</strong></div>
        <div className="plain-admin-metric"><span>Need second AI review</span><strong>{catalog.summary.needsSecondReview}</strong></div>
        <div className="plain-admin-metric"><span>Ready for human review</span><strong>{catalog.summary.publishableNow}</strong></div>
        <div className="plain-admin-metric"><span>On hold</span><strong>{catalog.summary.onHold}</strong></div>
        <div className="plain-admin-metric"><span>Structurally blocked</span><strong>{catalog.summary.structurallyBlocked}</strong></div>
        <div className="plain-admin-metric"><span>Mapping incomplete</span><strong>{catalog.summary.mappingIncomplete}</strong></div>
        <div className="plain-admin-metric"><span>Reviewer slots open</span><strong>{catalog.summary.domainUnassigned + catalog.summary.careerUnassigned}</strong></div>
      </section>

      <section className="plain-admin-panel plain-admin-catalog-overview">
        <div className="plain-admin-panel-head">
          <h2>Catalog gate</h2>
          <p>Version {catalog.catalogVersion} · {catalog.mode.replace(/_/g, " ")} mode. Every project needs two independent AI pre-reviews, then an explicit human final review before publication.</p>
        </div>
        {catalog.missingProjectIds.length > 0 && (
          <p className="plain-admin-error">Missing catalog records: {catalog.missingProjectIds.join(", ")}</p>
        )}
        <div className="plain-admin-catalog-picker">
          <label className="plain-admin-field">
            <span>Find a project</span>
            <input type="search" value={query} placeholder="Search by title, ID, or category" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="plain-admin-field">
            <span>Review queue</span>
            <select value={queue} onChange={(event) => setQueue(event.target.value)}>
              <option value="ALL">All candidates</option>
              <option value="MAPPING_INCOMPLETE">Mapping incomplete</option>
              <option value="UNASSIGNED">Reviewer unassigned</option>
              <option value="NEEDS_MY_REVIEW">Needs my review</option>
              <option value="SECOND_REVIEW">Needs me as second reviewer</option>
              <option value="PUBLISHABLE">Ready for human review</option>
              <option value="HOLD">On hold</option>
              <option value="READY">Pilot-ready</option>
            </select>
          </label>
          <label className="plain-admin-field plain-admin-catalog-project-select">
            <span>Project to review ({visibleProjects.length})</span>
            <select value={visibleProjects.some((project) => project.id === selected.id) ? selected.id : ""} onChange={(event) => chooseProject(event.target.value)}>
              {!visibleProjects.length && <option value="">No projects match this queue</option>}
              {visibleProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.id} · {project.title} · {pilotCatalogStatusLabel(project.pilotCatalogStatus)}
              </option>
            ))}
            </select>
          </label>
        </div>
      </section>

      <div className="plain-admin-catalog-layout">
        <section className="plain-admin-panel plain-admin-catalog-brief">
          <div className="plain-admin-catalog-title-row">
            <div>
              <h2>{selected.title}</h2>
              <p>{selected.id} · {selected.category ?? "Uncategorized"} · {friendlyCatalogLabel(selected.difficulty ?? "Unspecified")}</p>
            </div>
            <span className="plain-admin-status" data-status={selected.pilotCatalogStatus.toLowerCase()}>{pilotCatalogStatusLabel(selected.pilotCatalogStatus)}</span>
          </div>
          <dl className="plain-admin-catalog-facts">
            <div><dt>Time</dt><dd>{selected.estimatedHours ?? "Not set"}</dd></div>
            <div><dt>Provenance</dt><dd>{friendlyCatalogLabel(selected.provenanceStatus)}</dd></div>
            <div><dt>Deliverable</dt><dd>{selected.deliverable ?? "Not set"}</dd></div>
          </dl>
          <details className="plain-admin-catalog-evidence" open>
            <summary>Career mapping · version {selected.careerMappingVersion}</summary>
            <p>These controlled mappings drive role, competency, and experience matching. Saving changes invalidates prior approvals.</p>
            <TaxonomyMultiSelect label="Target roles" options={catalog.taxonomy.roles} values={mappingDraft.targetRoleIds} onChange={(values) => setMappingDraft((current) => ({ ...current, targetRoleIds: values }))} />
            <TaxonomyMultiSelect label="Competencies demonstrated" options={catalog.taxonomy.competencies} values={mappingDraft.competencyIds} onChange={(values) => setMappingDraft((current) => ({ ...current, competencyIds: values }))} />
            <TaxonomyMultiSelect label="Portfolio signals" options={catalog.taxonomy.portfolioSignals} values={mappingDraft.portfolioSignalIds} onChange={(values) => setMappingDraft((current) => ({ ...current, portfolioSignalIds: values }))} />
            <TaxonomyMultiSelect label="Required tools" options={catalog.taxonomy.requiredTools} values={mappingDraft.requiredToolIds} onChange={(values) => setMappingDraft((current) => ({ ...current, requiredToolIds: values }))} />
            <TaxonomyMultiSelect label="Access requirements" options={catalog.taxonomy.accessRequirements} values={mappingDraft.accessRequirementIds} onChange={(values) => setMappingDraft((current) => ({ ...current, accessRequirementIds: values }))} />
            <TaxonomyMultiSelect label="Recommended experience" options={catalog.taxonomy.experienceLevels} values={mappingDraft.recommendedExperienceLevels} onChange={(values) => setMappingDraft((current) => ({ ...current, recommendedExperienceLevels: values }))} />
            {selected.careerMappingIssues.length > 0 && <ul className="plain-admin-issue-list">{selected.careerMappingIssues.map((issue) => <li key={issue.code} data-severity={issue.severity.toLowerCase()}><strong>{issue.severity === "ERROR" ? "Blocking" : "Review"}</strong><span>{issue.message}</span></li>)}</ul>}
            <button type="button" className="plain-admin-btn" data-variant="primary" disabled={!mappingDirty || Boolean(busy)} onClick={() => void saveMapping()}>{busy === "mapping" ? "Saving…" : "Save career mapping"}</button>
          </details>
          {selected.publishReadiness.humanReviewRequired && (
            <section className="plain-admin-catalog-signals" aria-labelledby="reviewer-assignments-title">
              <h3 id="reviewer-assignments-title">Required specialist human reviewers</h3>
              <div className="plain-admin-form-grid">
                {(["DOMAIN", "CAREER"] as const).map((reviewType) => {
                  const assignment = selected.catalogReviewAssignments.find((entry) => entry.reviewType === reviewType && entry.reviewer.catalogReviewerProfile?.reviewerKind === "HUMAN");
                  return <label key={reviewType} className="plain-admin-field"><span>Human {friendlyCatalogLabel(reviewType).toLowerCase()} reviewer</span><select value={assignment?.reviewerId ?? ""} disabled={Boolean(busy)} onChange={(event) => void changeAssignment(reviewType, event.target.value)}><option value="">Unassigned</option>{eligibleReviewers(reviewType).map((reviewer) => <option key={reviewer.userId} value={reviewer.userId}>{reviewer.user.name ?? reviewer.user.email}</option>)}</select><small>{assignment ? `Assigned · ${assignment.reviewer.email}` : "Required after AI pre-review"}</small></label>;
                })}
              </div>
            </section>
          )}
          <div className="plain-admin-catalog-rationale">
            <h3>Student-facing brief</h3>
            <p>{selected.description}</p>
          </div>
          <div className="plain-admin-catalog-source">
            <strong>Source</strong>
            {selected.externalUrl ? <a href={selected.externalUrl} target="_blank" rel="noreferrer">Open original source ↗</a> : <span>No external source; review as an Intrnd practice scenario.</span>}
          </div>
          <div className="plain-admin-catalog-rationale">
            <h3>Why it entered the review pool</h3>
            <p>{selected.pilotCatalogReason}</p>
          </div>
          <details className="plain-admin-catalog-evidence" open>
            <summary>Review scope, proof, and resources</summary>
            <dl className="plain-admin-catalog-facts">
              <div><dt>Organization</dt><dd>{selected.organizationName ?? "Intrnd practice brief"}</dd></div>
              <div><dt>Source type</dt><dd>{friendlyCatalogLabel(selected.sourceType)}</dd></div>
              <div><dt>Skills</dt><dd>{selected.skills ?? "Not set"}</dd></div>
              <div><dt>Verification</dt><dd>{selected.verificationMethod ?? "Not set"}</dd></div>
            </dl>
            <div className="plain-admin-catalog-checkpoints">
              {selected.roadmapReview.checkpoints.map((checkpoint, index) => (
                <article key={checkpoint.id}>
                  <div><strong>{index + 1}. {checkpoint.title}</strong><span>{friendlyCatalogLabel(checkpoint.completionMode)}</span></div>
                  <p>{checkpoint.requiredOutput}</p>
                  {checkpoint.resources.length > 0 && <div>{checkpoint.resources.map((resource) => <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer">{resource.label} ↗</a>)}</div>}
                </article>
              ))}
            </div>
          </details>
          {(selected.pilotCatalogRiskCodes.length > 0 || selected.issues.length > 0) && (
            <div className="plain-admin-catalog-signals">
              <h3>Checks to resolve</h3>
              {selected.pilotCatalogRiskCodes.length > 0 && (
                <div className="plain-admin-chip-row">
                  {selected.pilotCatalogRiskCodes.map((code) => <span key={code} className="plain-admin-chip">{friendlyCatalogLabel(code)}</span>)}
                </div>
              )}
              {selected.issues.length > 0 && (
                <ul className="plain-admin-issue-list">
                  {selected.issues.map((issue) => (
                    <li key={`${issue.code}-${issue.message}`} data-severity={issue.severity.toLowerCase()}>
                      <strong>{issue.severity === "ERROR" ? "Blocking" : "Review"}</strong>
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="plain-admin-catalog-approval-state" role="status" aria-live="polite" aria-label={`${approvalCount} of 2 AI pre-approvals collected`}>
            <div><strong>{approvalCount} of 2 AI pre-approvals</strong><span>{selected.publishReadiness.ready ? "Ready for human final review" : selected.publishReadiness.reasons.map(friendlyCatalogLabel).join(" · ")}</span></div>
            <div className="plain-admin-approval-marks" aria-hidden="true"><span data-complete={approvalCount >= 1} /><span data-complete={approvalCount >= 2} /></div>
          </div>
          <div className="plain-admin-review-history">
            <h3>Review history</h3>
            {selected.catalogReviews.length === 0 ? <p className="plain-admin-empty">No reviews yet.</p> : selected.catalogReviews.map((review) => (
              <article key={review.id}>
                <div><strong>{review.reviewer.name ?? review.reviewer.email}</strong><span>{review.reviewerKind === "AI_AGENT" ? review.modelLabel ?? "AI reviewer" : "Human reviewer"} · {friendlyCatalogLabel(review.reviewType)} · confidence {review.confidence}/5 · {pilotReviewDecisionLabel(review.decision)} · {formatAdminDate(review.updatedAt)}</span></div>
                <p>{review.notes}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="plain-admin-panel plain-admin-catalog-review">
          <div className="plain-admin-panel-head">
            <h2>{myAssignment ? "Your specialist review" : "Review and publish"}</h2>
            <p>{myAssignment ? `Assigned as the human ${friendlyCatalogLabel(myAssignment.reviewType).toLowerCase()} reviewer.` : "Inspect the two AI reviews and the current project evidence before making the final human decision."}</p>
          </div>
          {error && <p className="plain-admin-error" role="alert">{error}</p>}
          {message && <p className="plain-admin-success" role="status">{message}</p>}
          {myAssignment && <CatalogReviewForm draft={draft} onChange={setDraft} assigned busy={busy === "review"} onSave={() => void saveReview()} />}
          <section className="plain-admin-catalog-signals plain-admin-final-review" aria-labelledby="human-final-review-title">
            <div>
              <h3 id="human-final-review-title">Human final review</h3>
              <p>
                Verify the current brief, evidence contract, AI reasoning, and open risks.
                {selected.publishReadiness.humanReviewRequired
                  ? " This sensitive project also needs qualified human domain and career approvals."
                  : " Your publish action is the required human signoff."}
              </p>
            </div>
            <label className="plain-admin-field">
              <span>Final-review note</span>
              <textarea
                value={finalReviewNotes}
                minLength={30}
                maxLength={2000}
                rows={5}
                disabled={Boolean(busy) || !selected.publishReadiness.ready || selected.pilotCatalogStatus === "PILOT_READY"}
                placeholder={selected.publishReadiness.ready
                  ? "Summarize what you verified and why this project is ready for students."
                  : "Complete the required reviews before writing the final decision."}
                onChange={(event) => setFinalReviewNotes(event.target.value)}
              />
              <small>{finalReviewNotes.trim().length} / 2,000 characters · minimum 30</small>
            </label>
          </section>
          <div className="plain-admin-catalog-actions">
            <button type="button" className="plain-admin-btn" data-variant="primary" disabled={Boolean(busy) || !selected.publishReadiness.ready || finalReviewNotes.trim().length < 30 || selected.pilotCatalogStatus === "PILOT_READY"} onClick={() => void publishProject()}>{busy === "publish" ? "Recording final review…" : selected.pilotCatalogStatus === "PILOT_READY" ? "Published to pilot" : "Approve and publish"}</button>
            <button type="button" className="plain-admin-btn" data-variant="danger" disabled={Boolean(busy) || selected.pilotCatalogStatus === "HOLD"} onClick={() => void holdProject()}>{busy === "hold" ? "Placing on hold…" : "Place on hold"}</button>
          </div>
        </section>
      </div>
    </>
  );
}

function friendlyCatalogLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase().replace(/^./, (letter: string) => letter.toUpperCase());
}

function pilotCatalogStatusLabel(status: string) {
  if (status === "PILOT_READY") return "Pilot-ready";
  if (status === "HOLD") return "On hold";
  return "Candidate";
}

function pilotReviewDecisionLabel(decision: PilotCatalogReview["decision"]) {
  if (decision === "APPROVE") return "Approved";
  if (decision === "REJECT") return "Rejected";
  return "Changes requested";
}

function RoadmapsView({
  coverage,
  roadmaps,
  onPublished,
  onOpenCatalog,
}: {
  coverage: RoadmapCoverage;
  roadmaps: RoadmapAdminRow[];
  onPublished: () => Promise<void>;
  onOpenCatalog: (projectId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(roadmaps[0]?.id ?? "");
  const [detail, setDetail] = useState<AdminRoadmapDetail | null>(null);
  const [plan, setPlan] = useState<AdminRoadmapPlan | null>(null);
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [supportLevel, setSupportLevel] = useState<"GUIDED" | "STANDARD" | "ACCELERATED">("STANDARD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [publishIssues, setPublishIssues] = useState<RoadmapValidationIssue[]>([]);

  useEffect(() => {
    if (!selectedId && roadmaps[0]?.id) setSelectedId(roadmaps[0].id);
  }, [roadmaps, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    void adminFetch(`/api/admin/projects/${selectedId}/checkpoint-plan`)
      .then((response) => response.json())
      .then((data: AdminRoadmapDetail) => {
        if (cancelled) return;
        setDetail(data);
        setPlan(JSON.parse(JSON.stringify(data.project.checkpointPlan)) as AdminRoadmapPlan);
        setCheckpointIndex(0);
        setPublishIssues([]);
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load roadmap."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const checkpoint = plan?.checkpoints[checkpointIndex] ?? null;
  const selectedSummary = roadmaps.find((roadmap) => roadmap.id === selectedId);

  function updatePlanField(field: "authoredBy" | "reviewedBy", value: string) {
    setPlan((current) => current ? { ...current, [field]: value } : current);
  }

  function updateCheckpoint(next: Partial<AdminRoadmapCheckpoint>) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        checkpoints: current.checkpoints.map((item, index) => index === checkpointIndex ? { ...item, ...next } : item),
      };
    });
  }

  async function publishRoadmap() {
    if (!plan || !selectedId) return;
    if (!window.confirm("Publish this roadmap as a new version? Existing applications will keep their current snapshot.")) return;
    setBusy(true);
    setError("");
    setPublishIssues([]);
    try {
      const response = await adminFetch(`/api/admin/projects/${selectedId}/checkpoint-plan`, {
        method: "PUT",
        body: JSON.stringify(plan),
      });
      const data = await response.json();
      setPlan(data.checkpointPlan);
      await onPublished();
      const detailResponse = await adminFetch(`/api/admin/projects/${selectedId}/checkpoint-plan`);
      setDetail(await detailResponse.json());
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Roadmap publishing failed.";
      setError(message);
      setPublishIssues((caught as Error & { issues?: RoadmapValidationIssue[] }).issues ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="plain-admin-metrics plain-admin-metrics--inline" aria-label="Roadmap catalog coverage">
        <Metric label="Published projects" value={coverage.total} />
        <Metric label="Valid roadmaps" value={coverage.valid} />
        <Metric label="Validation errors" value={coverage.invalid} />
        <Metric label="Career mappings blocked" value={roadmaps.filter((roadmap) => roadmap.careerMappingIssues.some((issue) => issue.severity === "ERROR")).length} />
      </section>

      <section className="plain-admin-panel">
        <header className="plain-admin-panel-head">
          <h2>Roadmap catalog</h2>
          <p>Review project-specific plans, preview support variants, and publish audited versions.</p>
        </header>
        <label className="plain-admin-field">
          <span>Project</span>
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {roadmaps.map((roadmap) => (
              <option key={roadmap.id} value={roadmap.id}>
                {roadmap.valid ? "Valid" : "Needs review"} · {roadmap.title} · v{roadmap.version}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="plain-admin-error">{error}</p> : null}
        {selectedSummary?.issues.length ? <ul className="plain-admin-errors">{selectedSummary.issues.map((issue) => <li key={`${issue.code}-${issue.checkpointId ?? "plan"}`}>{issue.code}: {issue.message}</li>)}</ul> : null}
        {selectedSummary && <div className="plain-admin-catalog-rationale"><h3>Career mapping · v{selectedSummary.careerMappingVersion}</h3><p><strong>Pilot readiness:</strong> {pilotCatalogStatusLabel(selectedSummary.pilotCatalogStatus)}</p><p><strong>Roles:</strong> {selectedSummary.careerMapping.targetRoles.map((entry) => entry.label).join(", ") || "Missing"}</p><p><strong>Competencies:</strong> {selectedSummary.careerMapping.competencies.map((entry) => entry.label).join(", ") || "Missing"}</p>{selectedSummary.careerMappingIssues.length > 0 && <ul className="plain-admin-errors">{selectedSummary.careerMappingIssues.map((issue) => <li key={issue.code}>{issue.code}: {issue.message}</li>)}</ul>}<button type="button" className="plain-admin-btn" data-variant="secondary" onClick={() => onOpenCatalog(selectedSummary.id)}>Edit mapping and assignments</button></div>}
        {publishIssues.length ? <ul className="plain-admin-errors">{publishIssues.map((issue) => <li key={`${issue.code}-${issue.checkpointId ?? "plan"}`}>{issue.code}: {issue.message}</li>)}</ul> : null}
      </section>

      {plan && checkpoint ? (
        <section className="plain-admin-panel">
          <header className="plain-admin-panel-head">
            <h2>{plan.projectTitle}</h2>
            <p>Editing v{plan.version}. Publishing creates v{plan.version + 1}; active student snapshots are unchanged.</p>
          </header>

          <div className="plain-admin-form-grid">
            <label className="plain-admin-field"><span>Primary author</span><input value={plan.authoredBy} onChange={(event) => updatePlanField("authoredBy", event.target.value)} /></label>
            <label className="plain-admin-field"><span>Independent reviewer</span><input value={plan.reviewedBy} onChange={(event) => updatePlanField("reviewedBy", event.target.value)} /></label>
            <label className="plain-admin-field"><span>Checkpoint</span><select value={checkpointIndex} onChange={(event) => setCheckpointIndex(Number(event.target.value))}>{plan.checkpoints.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.title}</option>)}</select></label>
            <label className="plain-admin-field"><span>Completion mode</span><select value={checkpoint.completionMode} onChange={(event) => updateCheckpoint({ completionMode: event.target.value as AdminRoadmapCheckpoint["completionMode"] })}><option value="CONFIRM">Confirm</option><option value="NOTE">Note</option><option value="EVIDENCE">Evidence</option></select></label>
          </div>

          <div className="plain-admin-form-grid plain-admin-form-grid--single">
            <label className="plain-admin-field"><span>Title</span><input value={checkpoint.title} onChange={(event) => updateCheckpoint({ title: event.target.value })} /></label>
            <label className="plain-admin-field"><span>Project-specific objective</span><textarea rows={3} value={checkpoint.objective} onChange={(event) => updateCheckpoint({ objective: event.target.value })} /></label>
            <label className="plain-admin-field"><span>Exact required output</span><textarea rows={3} value={checkpoint.requiredOutput} onChange={(event) => updateCheckpoint({ requiredOutput: event.target.value })} /></label>
            <label className="plain-admin-field"><span>Definition of done · one item per line</span><textarea rows={4} value={checkpoint.definitionOfDone.join("\n")} onChange={(event) => updateCheckpoint({ definitionOfDone: lines(event.target.value) })} /></label>
          </div>

          <div className="plain-admin-form-grid">
            <label className="plain-admin-field"><span>Support preview</span><select value={supportLevel} onChange={(event) => setSupportLevel(event.target.value as typeof supportLevel)}><option value="GUIDED">Guided</option><option value="STANDARD">Standard</option><option value="ACCELERATED">Accelerated</option></select></label>
            <label className="plain-admin-field"><span>Estimated minutes</span><input type="number" min={15} step={15} value={checkpoint.estimatedMinutesBySupport[supportLevel]} onChange={(event) => updateCheckpoint({ estimatedMinutesBySupport: { ...checkpoint.estimatedMinutesBySupport, [supportLevel]: Number(event.target.value) } })} /></label>
          </div>
          <div className="plain-admin-form-grid plain-admin-form-grid--single">
            <label className="plain-admin-field"><span>{supportLevel.toLowerCase()} actions · one item per line</span><textarea rows={6} value={checkpoint.actionsBySupport[supportLevel].join("\n")} onChange={(event) => updateCheckpoint({ actionsBySupport: { ...checkpoint.actionsBySupport, [supportLevel]: lines(event.target.value) } })} /></label>
            <label className="plain-admin-field"><span>{supportLevel.toLowerCase()} resources · Label | https://url per line</span><textarea rows={4} value={checkpoint.resourcesBySupport[supportLevel].map((resource) => `${resource.label} | ${resource.url}`).join("\n")} onChange={(event) => updateCheckpoint({ resourcesBySupport: { ...checkpoint.resourcesBySupport, [supportLevel]: resourceLines(event.target.value) } })} /></label>
            <label className="plain-admin-field"><span>Required skills · comma separated</span><input value={checkpoint.requiredSkills.join(", ")} onChange={(event) => updateCheckpoint({ requiredSkills: csv(event.target.value) })} /></label>
            <label className="plain-admin-field"><span>Submission requirement keys · comma separated</span><input value={checkpoint.submissionRequirementKeys.join(", ")} onChange={(event) => updateCheckpoint({ submissionRequirementKeys: csv(event.target.value) })} /></label>
            <label className="plain-admin-field"><span>Prerequisite checkpoint IDs · comma separated</span><input value={checkpoint.prerequisiteCheckpointIds.join(", ")} onChange={(event) => updateCheckpoint({ prerequisiteCheckpointIds: csv(event.target.value) })} /></label>
          </div>

          <div className="plain-admin-toolbar-actions">
            <button type="button" className="plain-admin-btn" data-variant="primary" disabled={busy} onClick={() => void publishRoadmap()}>{busy ? "Publishing…" : "Validate and publish new version"}</button>
          </div>
        </section>
      ) : busy ? <p className="plain-admin-empty">Loading roadmap…</p> : null}

      {detail?.versions.length ? (
        <section className="plain-admin-panel">
          <header className="plain-admin-panel-head"><h2>Version history</h2><p>Audit trail for this project roadmap.</p></header>
          <DataTable rows={detail.versions.map((version) => ({ id: `${detail.project.id}-v${version.version}`, version: version.version, publishedBy: version.publishedBy, createdAt: version.createdAt }))} />
        </section>
      ) : null}
    </>
  );
}

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function csv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function resourceLines(value: string) {
  return lines(value).map((item) => {
    const [label, ...urlParts] = item.split("|");
    return { label: label.trim(), url: urlParts.join("|").trim() };
  });
}

function getViewTitle(view: AdminView) {
  return adminNavItems.find((item) => item.id === view)?.label ?? "Admin";
}

function getViewDescription(view: AdminView) {
  const descriptions: Record<AdminView, string> = {
    overview: "Platform totals, pending onboarding-change requests, and recent activity.",
    onboarding:
      "Approve profile change requests and inspect onboarding answers.",
    users: "Browse users stored in the database.",
    subscriptions: "Browse subscription records and statuses.",
    projects: "Review student project submissions waiting on Intrnd.",
    pilotCatalog: "Review, hold, and publish a smaller evidence-backed catalog for the student pilot.",
    roadmaps: "Validate, preview, edit, and publish project-owned roadmap versions.",
    payments: "Payment tools will be added later.",
    reports: "Monitor pilot conversion, time-to-proof, review operations, engagement, and telemetry integrity.",
    database: "Inspect tables and make audited row changes.",
  };

  return descriptions[view];
}
