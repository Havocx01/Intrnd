import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  StudentApplication,
  currentStepForStatus,
  deliverablesForProject,
  nextActionForStatus,
  projectProgress,
  useAppData,
} from "./AppDataProvider";
import { AppLinkButton } from "./Button";
import { AppProgressBar } from "./ProgressBar";
import { StatusBadge, statusToneFromBackend } from "./StatusBadge";

export interface ActiveProjectCardProps {
  application: StudentApplication;
}

// Progress steps: Started, Building, Submitted, Verified.
function stepStatesForApplication(application: StudentApplication) {
  const status = application.status;
  const checks = application.checkpointProgress?.entries.map((entry) => entry.completed) ?? [];
  const total = checks.length;
  const completed = checks.filter(Boolean).length;
  const buildingProgress = total > 0 ? completed / total : 0;

  if (status === "VERIFIED") {
    return ["complete", "complete", "complete", "complete"] as const;
  }
  if (status === "SUBMITTED") {
    return ["complete", "complete", "current", "pending"] as const;
  }
  if (status === "NEEDS_REVISION") {
    return ["complete", "current", "pending", "pending"] as const;
  }
  if (buildingProgress >= 0.5) {
    return ["complete", "current", "pending", "pending"] as const;
  }
  return ["current", "pending", "pending", "pending"] as const;
}

export function ActiveProjectCard({ application }: ActiveProjectCardProps) {
  const reduced = useReducedMotion();
  const project = application.project;
  const completedCount = application.checkpointProgress?.entries.filter((entry) => entry.completed).length ?? 0;
  const totalCount = deliverablesForProject(project, application).length;
  const progress = projectProgress(application.status, completedCount, totalCount);
  const tone = statusToneFromBackend(application.status);
  const stepStates = stepStatesForApplication(application);
  const stepLabels = ["Started", "Building", "Submitted", "Verified"];

  const ctaLabel =
    application.status === "VERIFIED"
      ? "View proof"
      : application.status === "SUBMITTED"
        ? "Check submission"
        : application.status === "NEEDS_REVISION"
          ? "Update project"
          : "Continue project";
  const ctaTo =
    application.status === "VERIFIED"
      ? "/dashboard/proof"
      : application.status === "SUBMITTED"
        ? "/dashboard/submissions"
        : "/dashboard/my-projects";

  return (
    <motion.article
      className="app-card app-active-project"
      data-interactive="true"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}>
      <div className="app-active-project-head">
        <div>
          <span className="app-card-eyebrow">Active project</span>
          <h3>{project.title}</h3>
          <div className="app-active-project-meta">
            <span>{project.category ?? "Project"}</span>
            <span>{project.estimatedHours ?? "Self-paced"}</span>
            <span>{project.organizationName ?? "Intrnd-reviewed"}</span>
          </div>
        </div>
        <StatusBadge tone={tone} />
      </div>

      <div className="app-section">
        <div className="app-step-progress" aria-hidden>
          {stepStates.map((state, i) => (
            <span key={i} className="app-step-progress-cell" data-state={state} />
          ))}
        </div>
        <div className="app-step-progress-labels">
          {stepLabels.map((label, i) => (
            <span key={label} className="app-step-progress-label" data-state={stepStates[i]}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <AppProgressBar
        value={progress}
        tone="brand"
        size="md"
        showMeta
        metaLabel="Deliverable readiness"
        showPercent
        ariaLabel={`Project deliverables ${progress} percent`}
      />

      <div className="app-step-row">
        <div className="app-step-block">
          <small>Current step</small>
          <strong>{currentStepForStatus(application.status)}</strong>
          <p>
            {completedCount}/{totalCount} deliverables · {progress}% complete
          </p>
        </div>
        <div className="app-step-block">
          <small>Next step</small>
          <strong>{nextActionForStatus(application.status)}</strong>
          <p>{project.deliverable ?? "Submit a deliverable link with a short note."}</p>
        </div>
      </div>

      <div className="app-active-project-actions">
        <AppLinkButton to={ctaTo} variant="primary" size="sm" iconRight={<ArrowRight size={14} aria-hidden />}>
          {ctaLabel}
        </AppLinkButton>
        <AppLinkButton to="/dashboard/my-projects" variant="ghost" size="sm">
          Open workspace
        </AppLinkButton>
      </div>
    </motion.article>
  );
}
