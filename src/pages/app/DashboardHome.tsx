import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  FolderKanban,
  ListChecks,
  Send,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ActiveProjectCard } from "../../components/app/ActiveProjectCard";
import {
  MarketplaceProject,
  StudentApplication,
  deliverablesForProject,
  projectCheckpoints,
  projectProgress,
  useAppData,
} from "../../components/app/AppDataProvider";
import { AppProgressBar } from "../../components/app/ProgressBar";
import { AppButton, AppLinkButton } from "../../components/app/Button";
import { EmptyState } from "../../components/app/EmptyState";
import { HorizontalStepper } from "../../components/app/HorizontalStepper";
import { NextActionCard } from "../../components/app/NextActionCard";
import { ProjectCard } from "../../components/app/ProjectCard";
import { ProjectPreviewModal } from "../../components/app/ProjectPreviewModal";
import { StatTile } from "../../components/app/StatTile";
import { hasFullRecommendationAccess } from "../../lib/auth";
import { PRICING_ROUTE } from "../../lib/plans";
import { pickFreeStarterId } from "../../lib/recommendationAccess";
import { easeOutSoft } from "../../lib/motion";
import { useRecommendationImpression } from "../../hooks/useRecommendationImpression";

function nextDeliverableForApplication(
  application: StudentApplication | null,
): { label: string; reason: string; eta: string } | null {
  if (!application) return null;

  if (application.status === "SUBMITTED" || application.status === "VERIFIED") {
    return null;
  }

  if (application.status === "NEEDS_REVISION") {
    return {
      label: "Address the reviewer feedback",
      reason:
        application.reviewNotes?.trim() ||
        "Update the requested parts of your work, then submit the revised evidence for another review.",
      eta: "20-30 min",
    };
  }

  const checkpoints = projectCheckpoints(application);
  const progress = new Map((application.checkpointProgress?.entries ?? []).map((entry) => [entry.checkpointId, entry.completed]));
  const idx = checkpoints.findIndex((checkpoint) => !progress.get(checkpoint.id));
  if (idx === -1) {
    if (application.status === "ACTIVE") {
      return {
        label: "Submit your work",
        reason:
          "Every checkpoint is complete. Add the required evidence and send the project for review.",
        eta: "5–10 min",
      };
    }
    return null;
  }
  const checkpoint = checkpoints[idx];
  return {
    label: checkpoint.title,
    reason: checkpoint.objective,
    eta: `${Math.max(1, Math.round(checkpoint.estimatedMinutes / 60))} hr`,
  };
}

export default function DashboardHome() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const {
    user,
    activeApplications,
    submittedApplications,
    verifiedApplications,
    needsRevisionApplications,
    featuredApplication,
    projects,
    applyToProject,
    appliedProjectIds,
    pendingApplyProjectId,
    isInitialLoading,
    projectsError,
    reload,
  } = useAppData();
  const [previewProject, setPreviewProject] =
    useState<MarketplaceProject | null>(null);
  const rankedProjects = projects.map(normalizeDashboardProject);

  const hasFullAccess = hasFullRecommendationAccess(user?.plan);
  const recommendationSource = rankedProjects;
  const recommendationSectionRef = useRecommendationImpression("HOME", recommendationSource.length > 0);
  // Use the same starter selection as Browse so both pages unlock the same project.
  const freeStarterId = hasFullAccess
    ? null
    : pickFreeStarterId(
        recommendationSource.map((p) => ({ id: p.id })),
      );

  const activeTotal =
    activeApplications.length + needsRevisionApplications.length;

  const workspaceProgressPct =
    featuredApplication != null
      ? projectProgress(
          featuredApplication.status,
          featuredApplication.checkpointProgress?.entries.filter((entry) => entry.completed).length ?? 0,
          deliverablesForProject(featuredApplication.project, featuredApplication).length,
        )
      : 0;

  const skillsDemonstrated = new Set(
    verifiedApplications.flatMap((application) => application.submissions[0]?.verifiedSkills ?? []),
  ).size;

  const recommended = (() => {
    const eligible = recommendationSource.filter((project) => !appliedProjectIds.has(project.id));
    if (hasFullAccess || !freeStarterId) return eligible.slice(0, 3);
    const starter = eligible.find((project) => project.id === freeStarterId);
    const rest = eligible.filter((project) => project.id !== freeStarterId);
    return starter ? [starter, ...rest].slice(0, 3) : eligible.slice(0, 3);
  })();

  const nextDeliverable = nextDeliverableForApplication(featuredApplication);

  const hasAnyActivity =
    activeTotal + submittedApplications.length + verifiedApplications.length >
    0;

  const journeySteps = [
    { label: "Create your account", done: true, href: null },
    {
      label: "Tell us your goals",
      done: Boolean(user?.onboardingCompleted),
      href: "/onboarding?edit=true",
    },
    {
      label: "Add your first project",
      done: appliedProjectIds.size > 0,
      href: "/dashboard/browse",
    },
    {
      label: "Submit your deliverable",
      done:
        submittedApplications.length + verifiedApplications.length > 0,
      href: "/dashboard/my-projects",
    },
    {
      label: "Get verified proof",
      done: verifiedApplications.length > 0,
      href: "/dashboard/proof",
    },
  ];
  const journeyDone = journeySteps.filter((step) => step.done).length;
  const journeyCurrentIdx = journeySteps.findIndex((step) => !step.done);

  return (
    <div className="app-page app-page--home">
      <NextActionCard />

      <div className="app-command-grid">
        <div className="app-command-main">
          {featuredApplication ? (
            <motion.section
              className="app-section app-section--workspace"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeOutSoft }}
              aria-label="Current workspace"
            >
              <div className="app-section-title">
                <h2>Current workspace</h2>
              </div>
              <ActiveProjectCard application={featuredApplication} />
            </motion.section>
          ) : null}

          {nextDeliverable ? (
            <motion.section
              className="app-section"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeOutSoft }}
              aria-label="Today's next step"
            >
              <div className="app-section-title">
                <h2>Today / next</h2>
                <small>Why it matters · Estimated time</small>
              </div>
              <div className="app-today">
                <span className="app-today-icon" aria-hidden>
                  <ListChecks size={18} />
                </span>
                <div className="app-today-body">
                  <strong>{nextDeliverable.label}</strong>
                  <span>{nextDeliverable.reason}</span>
                  <span className="app-today-meta">
                    <Clock3 size={11} aria-hidden /> {nextDeliverable.eta}
                  </span>
                </div>
                <AppLinkButton
                  to="/dashboard/my-projects"
                  variant="primary"
                  size="sm"
                  iconRight={<ArrowRight size={14} aria-hidden />}
                >
                  Continue
                </AppLinkButton>
              </div>
            </motion.section>
          ) : null}

          <motion.section
            ref={recommendationSectionRef}
            className="app-section"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOutSoft }}
            aria-label="Recommended next"
          >
            <div className="app-section-title">
              <h2>
                {featuredApplication ? "Recommended next" : "Picked for you"}
              </h2>
              <AppLinkButton
                to="/dashboard/browse"
                variant="link"
                size="sm"
                iconRight={<ArrowRight size={12} aria-hidden />}
              >
                See all
              </AppLinkButton>
            </div>

            {isInitialLoading && recommendationSource.length === 0 ? (
              <EmptyState
                title="Loading your recommendations"
                description="Intrnd is checking your saved profile and project catalog."
              />
            ) : recommendationSource.length === 0 ? (
              <EmptyState
                title={projectsError ? "Recommendations need a retry" : "No recommendations yet"}
                description={projectsError || "Complete your student profile to receive project recommendations."}
                actions={
                  projectsError ? (
                    <AppButton type="button" variant="primary" size="sm" onClick={() => void reload()}>
                      Reload recommendations
                    </AppButton>
                  ) : undefined
                }
              />
            ) : recommended.length === 0 ? (
              <EmptyState
                title="You've added every recommended project"
                description="Browse the full catalogue for more matches."
                actions={
                  <AppLinkButton to="/dashboard/browse" variant="primary" size="sm">
                    Browse projects
                  </AppLinkButton>
                }
              />
            ) : (
              <div className="app-project-grid app-project-grid--home">
                {recommended.map((project, idx) => {
                  const isStarter =
                    !hasFullAccess && project.id === freeStarterId;
                  const isLocked =
                    !hasFullAccess && project.id !== freeStarterId;
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      compact
                      locked={isLocked}
                      quietRestriction={isLocked}
                      showLockedPreview={isLocked}
                      freeStarter={isStarter}
                      bestPick={
                        !featuredApplication &&
                        idx === 0 &&
                        !isLocked &&
                        project.recommendationLabel === "Best first project"
                      }
                      onPreview={
                        isLocked ? undefined : () => setPreviewProject(project)
                      }
                      onStart={async () => {
                        if (isLocked) {
                          navigate(PRICING_ROUTE, { state: { plan: "PRO" } });
                          return;
                        }
                        const ok = await applyToProject(project.id, project);
                        if (ok) navigate("/dashboard/my-projects");
                      }}
                    />
                  );
                })}
              </div>
            )}
          </motion.section>

          <section
            className="app-section app-section--how-it-works"
            aria-label="How Intrnd works"
          >
            <div className="app-section-title">
              <h2>How it works</h2>
              <small>One project, one verified resume bullet</small>
            </div>
            <HorizontalStepper />
          </section>
        </div>

        <aside className="app-command-side" aria-label="Progress and quick actions">
          <div className="app-dashboard-side">
            {hasAnyActivity ? (
              <>
                <section
                  className="app-progress-summary"
                  aria-label="Progress summary"
                >
                  {featuredApplication ? (
                    <div className="app-progress-summary-bar">
                      <header>
                        <strong>Workspace momentum</strong>
                        <span>
                          Mirrors your checklist in{" "}
                          <Link
                            to="/dashboard/my-projects"
                            className="app-link-quiet"
                          >
                            My Projects
                          </Link>{" "}
                          — finish deliverables before you submit proof.
                        </span>
                      </header>
                      <AppProgressBar
                        value={workspaceProgressPct}
                        size="md"
                        showMeta
                        metaLabel="Checklist readiness"
                        showPercent
                        ariaLabel={`Workspace checklist readiness ${workspaceProgressPct} percent`}
                      />
                    </div>
                  ) : null}
                  <div className="app-stat-strip">
                    <StatTile
                      icon={FolderKanban}
                      value={activeTotal}
                      label="Active"
                      tone="active"
                      hint="You're building or addressing revisions."
                    />
                    <StatTile
                      icon={Send}
                      value={submittedApplications.length}
                      label="In review"
                      tone="review"
                      hint="Typically 1–3 days per review cycle."
                    />
                    <StatTile
                      icon={CheckCircle2}
                      value={verifiedApplications.length}
                      label="Verified"
                      tone="verified"
                      hint="Portfolio-ready Intrnd confirmations."
                    />
                    <StatTile
                      icon={Sparkles}
                      value={skillsDemonstrated}
                      label="Skills"
                      tone="skills"
                      hint="Distinct skills backed by verified work."
                    />
                  </div>
                </section>

                <section className="app-widget">
                  <header className="app-widget-head">
                    <h3>Submission status</h3>
                    <small>{submittedApplications.length} pending</small>
                  </header>
                  {submittedApplications.length === 0 &&
                  needsRevisionApplications.length === 0 ? (
                    <div className="app-widget-body">
                      <p>
                        Nothing in review yet. Submit your first deliverable to
                        start.
                      </p>
                    </div>
                  ) : (
                    <ul className="app-widget-list">
                      {submittedApplications.slice(0, 3).map((application) => (
                        <li
                          key={application.id}
                          className="app-widget-list-item"
                        >
                          <FileSearch size={14} aria-hidden />
                          <span className="app-widget-list-label">
                            {application.project.title}
                          </span>
                          <small>In review</small>
                        </li>
                      ))}
                      {needsRevisionApplications
                        .slice(0, 2)
                        .map((application) => (
                          <li
                            key={application.id}
                            className="app-widget-list-item"
                            data-tone="alert"
                          >
                            <FileSearch size={14} aria-hidden />
                            <span className="app-widget-list-label">
                              {application.project.title}
                            </span>
                            <small>Needs changes</small>
                          </li>
                        ))}
                    </ul>
                  )}
                  <AppLinkButton
                    to="/dashboard/submissions"
                    variant="ghost"
                    size="sm"
                    iconRight={<ArrowRight size={12} aria-hidden />}
                  >
                    View submissions
                  </AppLinkButton>
                </section>

                {skillsDemonstrated > 0 ? (
                  <section className="app-widget">
                    <header className="app-widget-head">
                      <h3>Skills with evidence</h3>
                      <small>{skillsDemonstrated}</small>
                    </header>
                    <div className="app-proof-skills">
                      {Array.from(
                        new Set(
                          verifiedApplications.flatMap((application) => application.submissions[0]?.verifiedSkills ?? []),
                        ),
                      )
                        .slice(0, 8)
                        .map((skill) => (
                          <span key={skill} className="app-proof-skill">
                            {skill}
                          </span>
                        ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <section className="app-widget app-journey" aria-label="Your path to proof">
                <header className="app-widget-head">
                  <h3>Your path to proof</h3>
                  <small>
                    {journeyDone}/{journeySteps.length}
                  </small>
                </header>
                <AppProgressBar
                  value={Math.round((journeyDone / journeySteps.length) * 100)}
                  size="sm"
                  ariaLabel={`Setup progress ${journeyDone} of ${journeySteps.length} steps`}
                />
                <ol className="app-journey-list">
                  {journeySteps.map((step, idx) => {
                    const state = step.done
                      ? "done"
                      : idx === journeyCurrentIdx
                        ? "current"
                        : "pending";
                    return (
                      <li
                        key={step.label}
                        className="app-journey-step"
                        data-state={state}
                      >
                        <span className="app-journey-marker" aria-hidden>
                          {step.done ? (
                            <CheckCircle2 size={15} strokeWidth={2.2} />
                          ) : (
                            <span className="app-journey-dot">{idx + 1}</span>
                          )}
                        </span>
                        {step.href && !step.done ? (
                          <Link to={step.href} className="app-journey-label">
                            {step.label}
                          </Link>
                        ) : (
                          <span className="app-journey-label">
                            {step.label}
                          </span>
                        )}
                        {state === "current" ? (
                          <small className="app-journey-now">You're here</small>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                <p className="app-journey-note">
                  Finish one project and walk away with{" "}
                  <strong>3 verified skills</strong> and{" "}
                  <strong>1 resume-ready bullet</strong>.
                </p>
              </section>
            )}
          </div>
        </aside>
      </div>

      <ProjectPreviewModal
        project={previewProject}
        onClose={() => setPreviewProject(null)}
        onStart={async (project) => {
          setPreviewProject(null);
          const ok = await applyToProject(project.id, project);
          if (ok) navigate("/dashboard/my-projects");
        }}
        isStarting={
          previewProject !== null &&
          pendingApplyProjectId === previewProject.id
        }
        isApplied={
          previewProject !== null && appliedProjectIds.has(previewProject.id)
        }
      />
    </div>
  );
}

function normalizeDashboardProject(project: MarketplaceProject): MarketplaceProject {
  return {
    ...project,
    title: project.title ?? "Untitled project",
    description: project.description ?? "",
    organizationName: project.organizationName ?? null,
    category: project.category ?? null,
    estimatedHours: project.estimatedHours ?? null,
    deliverable: project.deliverable ?? null,
    verificationMethod: project.verificationMethod ?? null,
    skills: Array.isArray(project.skills) ? project.skills : [],
  };
}
