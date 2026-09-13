import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Clock, Layers, Lock, Sparkles, Target, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { MarketplaceProject, SOURCE_LABELS, sourceFromProject } from "./AppDataProvider";
import { AppButton } from "./Button";
import { MatchBandBadge } from "./MatchBandBadge";
import { easeOutSoft } from "../../lib/motion";

interface ProjectPreviewModalProps {
  project: MarketplaceProject | null;
  onClose: () => void;
  onStart?: (project: MarketplaceProject) => void;
  isStarting?: boolean;
  isApplied?: boolean;
}

function difficultyLabel(value: string | null | undefined): string {
  if (value === "ADVANCED") return "Advanced";
  if (value === "INTERMEDIATE") return "Intermediate";
  return "Beginner";
}

function proofTypeLabel(project: MarketplaceProject): string {
  const raw = (project.verificationType ?? "").trim();
  const map: Record<string, string> = {
    ORGANIZATION_REVIEW: "Organization review",
    INTRND_REVIEW: "Intrnd review",
    PEER_REVIEW: "Peer review",
    ADMIN_REVIEW: "Admin review",
    EXTERNAL_REVIEW: "External review",
  };
  if (map[raw.toUpperCase()]) return map[raw.toUpperCase()];
  if (raw)
    return raw
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
  if (project.organizationName) return "Organization review";
  return "Review required";
}

function checkpointTime(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
}

export function ProjectPreviewModal({ project, onClose, onStart, isStarting = false, isApplied = false }: ProjectPreviewModalProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!project) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, onClose]);

  useEffect(() => {
    if (!project) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [project]);

  useEffect(() => {
    if (!project || project.locked) return;
    void fetch("/api/users/me/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "PROJECT_OPENED", projectId: project.id }),
    });
  }, [project?.id, project?.locked]);

  if (typeof document === "undefined") return null;

  const roadmap = project?.roadmapPreview ?? null;
  const isCatalogOnly = project?.sourceVerification?.status === "CATALOG_ONLY";

  return createPortal(
    <AnimatePresence>
      {project ? (
        <motion.div
          key="project-preview-overlay"
          className="app-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-preview-title"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}>
          <motion.article
            className="app-project-preview"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: easeOutSoft }}
            onClick={(event) => event.stopPropagation()}>
            <header className="app-project-preview-header">
              <div className="app-project-preview-top">
                <div className="app-project-preview-tags">
                  <span className="app-project-source" data-source={sourceFromProject(project)}>
                    {project.sourceLabel ?? SOURCE_LABELS[sourceFromProject(project)]}
                  </span>
                  {project.organizationName ? <span className="app-project-state">{project.organizationName}</span> : null}
                  {project.recommendationLabel ? <span className="app-project-pick">{project.recommendationLabel}</span> : null}
                </div>
                <button type="button" className="app-project-preview-close" onClick={onClose} aria-label="Close preview">
                  <X size={16} aria-hidden />
                </button>
              </div>

              <h2 id="project-preview-title">{project.title}</h2>
              {project.sourceVerification ? <p className="app-project-preview-source-note">{project.sourceVerification.note}</p> : null}
              {project.matchBand || project.matchLabel || project.recommendationReason ? (
                <p className="app-project-preview-reason">
                  <Sparkles size={13} aria-hidden />
                  <span>
                    <MatchBandBadge band={project.matchBand} label={project.matchLabel} />
                    {(project.matchBand || project.matchLabel) && project.recommendationReason ? " — " : null}
                    {project.recommendationReason}
                  </span>
                </p>
              ) : null}
            </header>

            <div className="app-project-preview-body">
              <div className="app-project-preview-meta">
                <div>
                  <span>
                    <Clock size={12} aria-hidden /> Time
                  </span>
                  <strong>{roadmap?.effortLabel ?? project.estimatedHours ?? "Self-paced"}</strong>
                  {roadmap ? <small>{roadmap.scheduleLabel}</small> : null}
                </div>
                <div>
                  <span>
                    <Target size={12} aria-hidden /> Difficulty
                  </span>
                  <strong>{difficultyLabel(project.difficulty)}</strong>
                </div>
                <div>
                  <span>
                    <Layers size={12} aria-hidden /> Category
                  </span>
                  <strong>{project.category ?? "General"}</strong>
                </div>
                <div>
                  <span>
                    <Lock size={12} aria-hidden /> Proof
                  </span>
                  <strong>{proofTypeLabel(project)}</strong>
                </div>
              </div>

              {project.matchDetails ? (
                <section className="app-project-preview-personalization" aria-labelledby="project-match-heading">
                  <h3 id="project-match-heading">Why this fits you</h3>
                  <dl>
                    {project.matchDetails.matchedOn.length ? (
                      <div>
                        <dt>Matched on</dt>
                        <dd>{project.matchDetails.matchedOn.join(" · ")}</dd>
                      </div>
                    ) : null}
                    {project.matchDetails.builds.length ? (
                      <div>
                        <dt>You’ll build</dt>
                        <dd>{project.matchDetails.builds.join(" · ")}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>{isCatalogOnly ? "Intended outcome" : "Project outcome"}</dt>
                      <dd>{project.matchDetails.outcome}</dd>
                    </div>
                    <div>
                      <dt>Why now</dt>
                      <dd>{project.matchDetails.whyNow}</dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              {project.description ? (
                <section className="app-project-preview-section">
                  <h3>{isCatalogOnly ? "Project scenario" : "About this project"}</h3>
                  <p>{project.description}</p>
                </section>
              ) : null}

              {project.deliverable ? (
                <section className="app-project-preview-section">
                  <h3>{isCatalogOnly ? "Planned deliverable" : "What you’ll deliver"}</h3>
                  <p>{project.deliverable}</p>
                </section>
              ) : null}

              {roadmap?.checkpoints.length ? (
                <section className="app-project-preview-section">
                  <h3>Roadmap preview</h3>
                  <p className="app-project-preview-section-intro">
                    {roadmap.checkpointCount} required milestones based on the project’s reviewed roadmap.
                  </p>
                  <ol className="app-project-preview-checklist">
                    {roadmap.checkpoints.map((checkpoint, index) => (
                      <li key={checkpoint.id}>
                        <span className="app-project-preview-step" aria-hidden>
                          {index + 1}
                        </span>
                        <span className="app-project-preview-checkpoint-copy">
                          <strong>{checkpoint.title}</strong>
                          <span>{checkpoint.objective}</span>
                          <small>
                            Output: {checkpoint.requiredOutput} · About {checkpointTime(checkpoint.estimatedMinutes)}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {project.skills.length > 0 ? (
                <section className="app-project-preview-section">
                  <h3>Skills you&rsquo;ll practice</h3>
                  <div className="app-project-card-skills">
                    {project.skills.map((skill) => (
                      <span key={skill} className="app-project-card-skill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {project.verificationMethod ? (
                <section className="app-project-preview-section">
                  <h3>How proof is verified</h3>
                  <p>{project.verificationMethod}</p>
                </section>
              ) : null}
            </div>

            <footer className="app-project-preview-actions">
              <AppButton type="button" variant="ghost" size="md" onClick={onClose}>
                Close
              </AppButton>
              {onStart ? (
                <AppButton
                  type="button"
                  variant={isApplied ? "secondary" : "primary"}
                  size="md"
                  onClick={() => onStart(project)}
                  disabled={isStarting || isApplied}
                  aria-busy={isStarting}
                  iconRight={isApplied ? undefined : <ArrowUpRight size={14} aria-hidden />}>
                  {isApplied ? "Already in workspace" : isStarting ? "Adding…" : "Add to workspace"}
                </AppButton>
              ) : null}
            </footer>
          </motion.article>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
