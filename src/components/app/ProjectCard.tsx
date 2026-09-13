import { ArrowUpRight, Bookmark, Lock, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { MarketplaceProject, SOURCE_LABELS, sourceFromProject, useAppData } from "./AppDataProvider";
import { AppButton } from "./Button";
import { PRICING_ROUTE } from "../../lib/plans";
import { matchBandLabel, type MatchBand } from "../../lib/recommendationScore";

export interface ProjectCardProps {
  project: MarketplaceProject;
  onStart?: () => void;
  onPreview?: () => void;
  showSave?: boolean;
  bestPick?: boolean;
  locked?: boolean;
  freeStarter?: boolean;
  quietRestriction?: boolean;
  showLockedPreview?: boolean;
  compact?: boolean;
  recommendation?: { rank: number; matchBand: MatchBand; reason: string };
}

function difficultyLabel(project: MarketplaceProject): string {
  if (project.difficulty === "ADVANCED") return "Advanced";
  if (project.difficulty === "INTERMEDIATE") return "Intermediate";
  return "Beginner";
}

function timeLabel(project: MarketplaceProject): string {
  if (project.estimatedHours) return project.estimatedHours;
  return "Self-paced";
}

function deliverableType(project: MarketplaceProject): string {
  const d = (project.deliverable ?? "").toLowerCase();
  if (d.includes("page") || d.includes("site") || d.includes("landing")) return "Web page";
  if (d.includes("dashboard") || d.includes("data")) return "Data work";
  if (d.includes("plan") || d.includes("calendar") || d.includes("content")) return "Plan / content";
  if (d.includes("script") || d.includes("automation")) return "Automation";
  if (d.includes("design") || d.includes("brand") || d.includes("logo")) return "Design";
  return "Project artifact";
}

const LOCKED_DELIVERABLE_TYPES = new Set([
  "Analysis artifact",
  "Written artifact",
  "Presentation",
  "Design artifact",
  "Web artifact",
  "Technical artifact",
  "Recorded demonstration",
  "Project artifact",
]);

function lockedProjectTitle(project: MarketplaceProject): string {
  if (/^Locked\s+/i.test(project.title)) {
    return project.title.replace(/^Locked\s+/i, "");
  }

  const category = project.category?.trim() || "Portfolio";
  return `${difficultyLabel(project)} ${category} project`;
}

function lockedProjectDescription(matchBand: MatchBand | undefined): string {
  if (matchBand === "STRONG") {
    return "A strong-fit project selected for your goals and current experience level.";
  }
  if (matchBand === "GOOD") {
    return "A good-fit project selected from your personalized ranking.";
  }
  return "A project worth exploring based on your saved profile.";
}

const VERIFICATION_TYPE_LABELS: Record<string, string> = {
  ORGANIZATION_REVIEW: "Organization review",
  INTRND_REVIEW: "Intrnd review",
  PEER_REVIEW: "Peer review",
  ADMIN_REVIEW: "Admin review",
  EXTERNAL_REVIEW: "External review",
};

function humanizeEnumLabel(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (VERIFICATION_TYPE_LABELS[compact]) return VERIFICATION_TYPE_LABELS[compact];
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function proofType(project: MarketplaceProject): string {
  if (project.verificationType?.trim()) return humanizeEnumLabel(project.verificationType.trim());
  if (project.organizationName) return "Org review";
  return "Intrnd review";
}

export function ProjectCard({
  project,
  onStart,
  onPreview,
  showSave = true,
  bestPick = false,
  locked: lockedProp = false,
  freeStarter = false,
  quietRestriction = false,
  showLockedPreview = false,
  compact = false,
  recommendation,
}: ProjectCardProps) {
  // Honor the server lock even when the caller omits the locked prop.
  const locked = lockedProp || Boolean(project.locked);
  const { appliedProjectIds, pendingApplyProjectId, pendingSaveProjectIds, savedProjectIds, toggleSavedProject } = useAppData();
  const reduced = useReducedMotion();
  const isApplied = appliedProjectIds.has(project.id);
  const isApplying = pendingApplyProjectId === project.id;
  const isSaved = project.saved ?? savedProjectIds.includes(project.id);
  const isSaving = pendingSaveProjectIds.includes(project.id);
  const source = sourceFromProject(project);
  const sourceLabel = project.sourceLabel ?? SOURCE_LABELS[source];
  const hasLockedPreview = locked && showLockedPreview;
  const matchBand = recommendation?.matchBand ?? project.matchBand;
  const fitLabel = matchBand ? matchBandLabel(matchBand) : project.matchLabel?.trim() || null;
  const displayTitle = hasLockedPreview
    ? lockedProjectTitle(project)
    : locked && quietRestriction
      ? project.title.replace(/^Locked\s+/i, "")
      : project.title;
  const lockedDeliverable =
    project.lockedPreview?.deliverable && LOCKED_DELIVERABLE_TYPES.has(project.lockedPreview.deliverable)
      ? project.lockedPreview.deliverable
      : "Project artifact";

  const cardState = locked ? "locked" : isApplied ? "in-workspace" : bestPick ? "best-pick" : freeStarter ? "free-starter" : undefined;

  return (
    <motion.article
      className="app-project-card"
      data-state={cardState}
      data-locked={locked ? "true" : undefined}
      data-restriction={locked && quietRestriction ? "quiet" : undefined}
      data-locked-preview={hasLockedPreview ? "true" : undefined}
      data-density={compact ? "compact" : undefined}
      layout
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.32 }}
      aria-disabled={locked && !quietRestriction ? true : undefined}>
      <header className="app-project-card-top">
        <div className="app-project-card-tags">
          <span className="app-project-source" data-source={source}>
            {sourceLabel}
          </span>
          {freeStarter && !locked ? (
            <span className="app-project-starter" title="Your free starter recommendation">
              <Star size={11} aria-hidden />
              Starter recommendation
            </span>
          ) : null}
          {bestPick && !locked ? <span className="app-project-pick">Best first pick</span> : null}
          {isApplied && !locked ? <span className="app-project-state">In workspace</span> : null}
          {recommendation ? (
            <span className="app-project-rank" title={`Ranked #${recommendation.rank} for you`}>
              #{recommendation.rank}
            </span>
          ) : null}
          {!isApplied && !locked && isSaved ? (
            <span
              className="app-project-state"
              style={{ background: "var(--app-surface-2)", color: "var(--hp-muted-strong)", border: "1px solid var(--app-border)" }}>
              Saved
            </span>
          ) : null}
        </div>
        {hasLockedPreview ? (
          <span className="app-project-card-lock-indicator" title="Full project brief and actions are locked">
            <Lock size={13} aria-hidden />
            <span className="app-sr-only">Full project brief and actions are locked</span>
          </span>
        ) : showSave && !locked ? (
          <button
            type="button"
            className="app-project-save"
            data-saved={isSaved ? "true" : "false"}
            disabled={isSaving}
            onClick={() => void toggleSavedProject(project.id)}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from saved" : "Save project"}
            title={isSaved ? "Saved" : "Save project"}>
            <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
          </button>
        ) : null}
      </header>

      <h3 className={locked && !hasLockedPreview ? "app-project-card-title app-project-card-title--locked" : "app-project-card-title"}>
        {displayTitle}
      </h3>
      {hasLockedPreview ? (
        <p className="app-project-card-outcome">{lockedProjectDescription(matchBand)}</p>
      ) : locked ? (
        <p className="app-project-card-outcome app-project-card-outcome--locked">
          {quietRestriction ? "Project details are available with expanded access." : "Project brief and deliverables unlock with Pro."}
        </p>
      ) : (
        <p className="app-project-card-outcome">{project.deliverable ?? project.description}</p>
      )}

      <div className="app-project-card-body">
        <dl className="app-project-card-meta" aria-label="Project details">
          {fitLabel ? (
            <div>
              <dt>Fit</dt>
              <dd
                className="app-project-card-fit"
                data-band={matchBand?.toLowerCase() ?? "good"}
                title="How well this project fits the information saved in your profile and the proof this project creates.">
                {fitLabel}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Difficulty</dt>
            <dd>{difficultyLabel(project)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{timeLabel(project)}</dd>
          </div>
          {locked && !hasLockedPreview ? null : !compact ? (
            <>
              <div>
                <dt>Deliverable</dt>
                <dd className={hasLockedPreview ? "app-project-card-preview-detail" : undefined}>
                  {hasLockedPreview ? lockedDeliverable : deliverableType(project)}
                </dd>
              </div>
              {hasLockedPreview ? null : (
                <div>
                  <dt>Proof</dt>
                  <dd>{proofType(project)}</dd>
                </div>
              )}
            </>
          ) : null}
        </dl>

        {!locked && project.skills.length > 0 ? (
          <div className="app-project-card-skills">
            {project.skills.slice(0, compact ? 3 : 4).map((skill) => (
              <span key={skill} className="app-project-card-skill">
                {skill}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="app-project-card-actions">
        {hasLockedPreview ? (
          <div className="app-project-card-locked-footer">
            <span>
              <Lock size={12} aria-hidden />
              Project concept and actions are locked
            </span>
            <Link to={PRICING_ROUTE} state={{ plan: "PRO" }}>
              Request pilot access
            </Link>
          </div>
        ) : locked ? (
          <Link
            to={PRICING_ROUTE}
            state={{ plan: "PRO" }}
            className={`app-card-upgrade-cta${quietRestriction ? " app-card-upgrade-cta--quiet" : ""}`}
            aria-label="Request pilot access">
            {quietRestriction ? null : <Lock size={12} aria-hidden />}
            <span>{quietRestriction ? "View access" : "Request pilot access"}</span>
          </Link>
        ) : (
          <>
            {onPreview ? (
              <AppButton type="button" variant="secondary" size="sm" onClick={onPreview}>
                Preview
              </AppButton>
            ) : null}
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={onStart}
              disabled={isApplying}
              aria-busy={isApplying}
              iconRight={<ArrowUpRight size={14} aria-hidden />}>
              {isApplying ? "Adding..." : isApplied ? "Open in workspace" : "Add to workspace"}
            </AppButton>
          </>
        )}
      </div>
    </motion.article>
  );
}
