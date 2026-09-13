import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActivityTimeline } from "../../components/app/ActivityTimeline";
import {
  STATUS_LABELS,
  StudentApplication,
  deliverablesForProject,
  nextActionForStatus,
  projectProgress,
  useAppData,
  type RoadmapSupportLevel,
} from "../../components/app/AppDataProvider";
import { AppLinkButton } from "../../components/app/Button";
import { DeliverableChecklist } from "../../components/app/DeliverableChecklist";
import { EmptyState } from "../../components/app/EmptyState";
import { MatchBandBadge } from "../../components/app/MatchBandBadge";
import { ProofPreviewCard } from "../../components/app/ProofPreviewCard";
import { RoadmapPaceDialog } from "../../components/app/RoadmapPaceDialog";
import { SubmissionComposer } from "../../components/app/SubmissionComposer";
import {
  StatusBadge,
  statusToneFromBackend,
} from "../../components/app/StatusBadge";
import { easeOutSoft } from "../../lib/motion";

type Tab = "active" | "submitted" | "verified";

const TAB_LABELS: Record<Tab, string> = {
  active: "Active",
  submitted: "Submitted",
  verified: "Verified",
};

export default function MyProjects() {
  const reduced = useReducedMotion();
  const {
    applications,
    activeApplications,
    submittedApplications,
    verifiedApplications,
    needsRevisionApplications,
    reload,
    showNotice,
    pendingRemoveProjectId,
    removeProject,
  } = useAppData();

  const tabBuckets = useMemo<Record<Tab, StudentApplication[]>>(() => {
    return {
      active: [...activeApplications, ...needsRevisionApplications],
      submitted: submittedApplications,
      verified: verifiedApplications,
    };
  }, [
    activeApplications,
    needsRevisionApplications,
    submittedApplications,
    verifiedApplications,
  ]);

  const availableTabs = (Object.keys(TAB_LABELS) as Tab[]).filter(
    (tab) => tabBuckets[tab].length > 0,
  );

  const [tab, setTab] = useState<Tab>(availableTabs[0] ?? "active");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!availableTabs.includes(tab) && availableTabs[0]) {
      setTab(availableTabs[0]);
    }
  }, [availableTabs, tab]);

  const tabApplications = tabBuckets[tab] ?? [];

  const activeApplication = useMemo(() => {
    if (tabApplications.length === 0) return null;
    if (selectedProjectId) {
      const found = tabApplications.find(
        (a) => a.project.id === selectedProjectId,
      );
      if (found) return found;
    }
    return tabApplications[0];
  }, [tabApplications, selectedProjectId]);

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>My Projects</h1>
        <p>Finish the steps, submit your work, and get a resume-ready record.</p>
      </header>

      {applications.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Browse projects, pick one, and start building something you can put on a resume."
          actions={
            <AppLinkButton
              to="/dashboard/browse"
              variant="primary"
              size="sm"
              iconLeft={<Compass size={14} aria-hidden />}
            >
              Browse projects
            </AppLinkButton>
          }
          preview={
            <>
              <span className="app-empty-preview-tag">
                <Sparkles size={12} aria-hidden /> Preview
              </span>
              <strong>
                Ship a landing page a local business can use
              </strong>
              <p>
                Add a project, finish the steps, and submit when you’re ready.
              </p>
              <div className="app-progress" aria-hidden>
                <div className="app-progress-track">
                  <div
                    className="app-progress-fill"
                    style={{ transform: "scaleX(0.42)" }}
                  />
                </div>
              </div>
            </>
          }
        />
      ) : (
        <>
          <section className="app-project-storage" aria-label="Project storage">
            {availableTabs.length > 1 ? (
              <div
                className="app-tabs app-project-storage-tabs"
                role="tablist"
                aria-label="Project status"
              >
                {availableTabs.map((entry) => {
                  const isActive = entry === tab;
                  return (
                    <button
                      key={entry}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className="app-tab"
                      data-active={isActive ? "true" : "false"}
                      onClick={() => {
                        setTab(entry);
                        setSelectedProjectId(null);
                      }}
                    >
                      <span>{TAB_LABELS[entry]}</span>
                      <small>{tabBuckets[entry].length}</small>
                      {isActive && !reduced ? (
                        <motion.span
                          layoutId="app-projects-tab"
                          className="app-tab-underline"
                          transition={{ duration: 0.32 }}
                        />
                      ) : isActive ? (
                        <span className="app-tab-underline" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="app-project-storage-label">
                <span>{TAB_LABELS[tab]}</span>
                <small>{tabApplications.length}</small>
              </div>
            )}

            {tabApplications.length > 0 ? (
              <div
                className="app-project-shelf"
                role="listbox"
                aria-label={`${TAB_LABELS[tab]} projects`}
              >
                {tabApplications.map((application) => {
                  const project = application.project;
                  const isSelected =
                    project.id === activeApplication?.project.id;
                  const tone = statusToneFromBackend(application.status);
                  const completedCount = application.checkpointProgress?.entries.filter((entry) => entry.completed).length ?? 0;
                  const totalCount = deliverablesForProject(project, application).length;
                  const progress = Math.max(
                    0.04,
                    projectProgress(
                      application.status,
                      completedCount,
                      totalCount,
                    ) / 100,
                  );
                  const meta =
                    application.status === "VERIFIED"
                      ? "Verified proof"
                      : application.status === "SUBMITTED"
                        ? "In review"
                        : application.status === "NEEDS_REVISION"
                          ? "Needs changes"
                          : totalCount > 0
                            ? `${completedCount}/${totalCount} steps`
                            : "In progress";

                  return (
                    <button
                      key={application.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className="app-project-shelf-item"
                      data-active={isSelected ? "true" : "false"}
                      data-tone={tone}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <span className="app-project-shelf-item-top">
                        <span className="app-project-shelf-item-eyebrow">
                          {project.category ?? "Project"}
                        </span>
                        {isSelected ? (
                          <span className="app-project-shelf-item-current">
                            Open
                          </span>
                        ) : null}
                      </span>
                      <span className="app-project-shelf-item-title">
                        {project.title}
                      </span>
                      <span className="app-project-shelf-item-meta">
                        {project.matchBand || project.matchLabel ? (
                          <>
                            <MatchBandBadge
                              band={project.matchBand}
                              label={project.matchLabel}
                            />
                            <span aria-hidden> · </span>
                          </>
                        ) : null}
                        {meta}
                      </span>
                      {application.status !== "VERIFIED" ? (
                        <span
                          className="app-project-shelf-item-progress"
                          aria-hidden
                        >
                          <span
                            className="app-project-shelf-item-progress-fill"
                            style={{ transform: `scaleX(${progress})` }}
                          />
                        </span>
                      ) : (
                        <span className="app-project-shelf-item-verified" aria-hidden>
                          Ready to use
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          {activeApplication ? (
            <WorkspacePanel
              key={activeApplication.id}
              application={activeApplication}
              onRemove={() => removeProject(activeApplication.project.id)}
              onSubmitted={reload}
              onNotice={showNotice}
              isRemoving={
                pendingRemoveProjectId === activeApplication.project.id
              }
            />
          ) : (
            <EmptyState
              title={`No ${TAB_LABELS[tab].toLowerCase()} projects`}
              description={
                tab === "submitted"
                  ? "Nothing waiting on review. Submit from Active when your work is ready."
                  : tab === "verified"
                    ? "Nothing verified yet. Finish and submit a project to get your first record."
                    : "Nothing in progress. Browse projects to add one."
              }
            />
          )}
        </>
      )}
    </div>
  );
}

interface WorkspacePanelProps {
  application: StudentApplication;
  onSubmitted: () => Promise<void>;
  onNotice: (message: string, tone?: "success" | "error" | "neutral") => void;
  onRemove: () => void;
  isRemoving: boolean;
}

function WorkspacePanel({
  application,
  onSubmitted,
  onNotice,
  onRemove,
  isRemoving,
}: WorkspacePanelProps) {
  const { updateRoadmapPreferences } = useAppData();
  const reduced = useReducedMotion();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editingRoadmap, setEditingRoadmap] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const project = application.project;
  const totalCount = deliverablesForProject(project, application).length;
  const completedCount = application.checkpointProgress?.entries.filter((entry) => entry.completed).length ?? 0;
  const tone = statusToneFromBackend(application.status);
  const latestSubmission = application.submissions[0];
  const isVerified = application.status === "VERIFIED";
  const isSubmitted = application.status === "SUBMITTED";
  const needsRevision = application.status === "NEEDS_REVISION";
  const isReady =
    completedCount === totalCount &&
    totalCount > 0 &&
    application.status !== "VERIFIED" &&
    application.status !== "SUBMITTED";
  useEffect(() => {
    setConfirmRemove(false);
    setEditingRoadmap(false);
  }, [application.id]);

  async function saveRoadmapPreferences(preferences: {
    weeklyHours: number;
    supportLevel: RoadmapSupportLevel;
  }) {
    setSavingPreferences(true);
    const saved = await updateRoadmapPreferences(project.id, preferences);
    setSavingPreferences(false);
    if (saved) setEditingRoadmap(false);
  }

  const nextDetail =
    needsRevision
      ? isReady
        ? "Use the reviewer’s notes, update your evidence, then resubmit below."
        : `Complete every checkpoint before resubmitting. You’re at ${completedCount}/${totalCount}.`
      : isSubmitted
        ? "Intrnd is reviewing your submission. We’ll update this when it’s done."
        : isVerified
          ? "Open your verified record and copy the reviewer-confirmed resume bullet."
          : isReady
            ? "All steps marked done. Add your link in Submit for review below."
            : `Work the next step below, then mark it done. Submission unlocks after all ${totalCount} checkpoints are complete.`;

  return (
    <motion.section
      className="app-workspace"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutSoft }}
    >
      <div className="app-workspace-main">
        <article className="app-card">
          <header className="app-active-project-head">
            <div className="app-active-project-copy">
              <span className="app-card-eyebrow">
                {project.category ?? "Project"}
              </span>
              <h2 style={{ fontSize: 19, marginTop: 4 }}>{project.title}</h2>
              <p style={{ marginTop: 6, fontSize: 13.5 }}>
                {project.deliverable ?? project.description}
              </p>
              <div className="app-active-project-meta" style={{ marginTop: 8 }}>
                {project.matchBand || project.matchLabel ? (
                  <span>
                    <MatchBandBadge
                      band={project.matchBand}
                      label={project.matchLabel}
                    />
                  </span>
                ) : null}
                <span>
                  {project.difficulty === "ADVANCED"
                    ? "Advanced"
                    : project.difficulty === "INTERMEDIATE"
                      ? "Intermediate"
                      : "Beginner"}
                </span>
                <span>{project.estimatedHours ?? "Self-paced"}</span>
                <span>{project.organizationName ?? "Intrnd project"}</span>
              </div>
              {project.recommendationReason ? (
                <p className="app-active-project-fit-reason">
                  {project.recommendationReason}
                </p>
              ) : null}
            </div>
            <StatusBadge tone={tone} />
          </header>

          <div className="app-next-strip" role="status">
            <div className="app-next-strip-copy">
              <small>Next</small>
              <strong>{nextActionForStatus(application.status)}</strong>
              <p>{nextDetail}</p>
            </div>
            {isVerified ? (
              <AppLinkButton
                to="/dashboard/proof"
                variant="primary"
                size="sm"
                iconRight={<ArrowRight size={14} aria-hidden />}
              >
                Open proof page
              </AppLinkButton>
            ) : isReady ? (
              <a
                className="app-btn"
                data-variant="secondary"
                data-size="sm"
                href="#submit-form"
              >
                <span>{needsRevision ? "Go to resubmit" : "Go to submit"}</span>
                <ArrowRight size={14} aria-hidden />
              </a>
            ) : null}
          </div>
        </article>

        <article className="app-card">
          <header className="app-card-header">
            <div className="app-card-title">
              <h3>Steps to finish</h3>
            </div>
            <div className="app-roadmap-card-tools">
              <span className="app-card-meta">{completedCount}/{totalCount} done</span>
              {!isVerified && !isSubmitted ? (
                <button
                  type="button"
                  className="app-btn"
                  data-variant="ghost"
                  data-size="sm"
                  aria-haspopup="dialog"
                  aria-expanded={editingRoadmap}
                  onClick={() => setEditingRoadmap(true)}
                >
                  <SlidersHorizontal size={14} aria-hidden />
                  <span>Change pace</span>
                </button>
              ) : null}
            </div>
          </header>
          <DeliverableChecklist application={application} />
        </article>

        <RoadmapPaceDialog
          open={editingRoadmap}
          projectTitle={project.title}
          preferences={application.roadmapPreferences ?? null}
          isSaving={savingPreferences}
          onCancel={() => {
            if (!savingPreferences) setEditingRoadmap(false);
          }}
          onSave={(preferences) => void saveRoadmapPreferences(preferences)}
        />

        {isVerified ? (
          <article className="app-card" data-tone="soft">
            <p className="app-card-note">
              Verified. Open your{" "}
              <AppLinkButton to="/dashboard/proof" variant="link" size="sm">
                proof page
              </AppLinkButton>{" "}
              to copy the reviewer-confirmed resume bullet.
            </p>
          </article>
        ) : isSubmitted ? (
          <article className="app-card" data-tone="soft">
            <p className="app-card-note">
              Submitted and under review. You can’t edit this submission until
              Intrnd finishes reviewing.
              {latestSubmission?.deliverableUrl ? (
                <>
                  {" "}
                  <a
                    className="app-link-quiet"
                    href={latestSubmission.deliverableUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open what you sent
                  </a>
                </>
              ) : null}
            </p>
          </article>
        ) : (
          <article
            className="app-card app-submit-panel"
            id={isReady ? "submit-form" : "project-evidence"}
            data-revision={needsRevision ? "true" : undefined}
            tabIndex={-1}
          >
            <header className="app-submit-panel-head">
              <div className="app-submit-panel-copy">
                <h3>
                  {isReady
                    ? needsRevision
                      ? "Fix and resubmit"
                      : "Submit for review"
                    : "Project evidence"}
                </h3>
                <p>
                  {isReady
                    ? needsRevision
                      ? "Update the evidence Intrnd asked for, then send it back for review."
                      : "Package the deliverable this project asks for. Review unlocks your verified proof."
                    : "Add evidence as you work. The review action appears after every checkpoint is complete."}
                </p>
              </div>
              {latestSubmission ? (
                <span className="app-submit-panel-meta">
                  Last package ·{" "}
                  {STATUS_LABELS[latestSubmission.status] ??
                    latestSubmission.status}
                </span>
              ) : (
                <span className="app-submit-panel-meta">
                  {isReady
                    ? "Final step"
                    : `${completedCount}/${totalCount} checkpoints`}
                </span>
              )}
            </header>

            {needsRevision && application.reviewNotes ? (
              <div className="app-submit-revision" role="status">
                <strong>Reviewer notes</strong>
                <p>{application.reviewNotes}</p>
              </div>
            ) : null}

            <SubmissionComposer
              projectId={project.id}
              checklistComplete={isReady}
              revision={needsRevision}
              onSubmitted={onSubmitted}
              onNotice={onNotice}
            />
          </article>
        )}
      </div>

      <aside className="app-workspace-side" aria-label="Proof and activity">
        <ProofPreviewCard
          project={project}
          mode={isVerified ? "verified" : "active"}
        />

        <section className="app-widget">
          <header className="app-widget-head">
            <h3>Project activity</h3>
          </header>
          <ActivityTimeline application={application} />
        </section>

        {!isVerified ? (
          confirmRemove ? (
            <div className="app-remove-confirm" role="group" aria-label="Confirm remove project">
              <p>
                Withdraw this project from your workspace? Your roadmap progress,
                notes, and draft evidence will be preserved if you start it again.
              </p>
              <div className="app-remove-confirm-actions">
                <button
                  type="button"
                  className="app-btn"
                  data-variant="danger"
                  data-size="sm"
                  onClick={onRemove}
                  disabled={isRemoving}
                  aria-busy={isRemoving}
                >
                  <Trash2 size={13} aria-hidden />
                  <span>{isRemoving ? "Removing…" : "Yes, remove"}</span>
                </button>
                <button
                  type="button"
                  className="app-btn"
                  data-variant="ghost"
                  data-size="sm"
                  onClick={() => setConfirmRemove(false)}
                  disabled={isRemoving}
                >
                  Keep project
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="app-btn"
              data-variant="danger"
              data-size="sm"
              onClick={() => setConfirmRemove(true)}
              disabled={isRemoving}
              style={{ alignSelf: "flex-start" }}
            >
              <Trash2 size={13} aria-hidden />
              <span>Remove project</span>
            </button>
          )
        ) : null}
      </aside>
    </motion.section>
  );
}
