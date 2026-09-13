import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { MarketplaceProject, SOURCE_LABELS, deliverablesForProject, sourceFromProject, useAppData } from "./AppDataProvider";
import { AppButton } from "./Button";
import { MatchBandBadge } from "./MatchBandBadge";

export interface FeaturedProjectCardProps {
  project: MarketplaceProject;
  onStart: () => void;
  onDetails?: () => void;
}

export function FeaturedProjectCard({ project, onStart, onDetails }: FeaturedProjectCardProps) {
  const { appliedProjectIds, pendingApplyProjectId } = useAppData();
  const reduced = useReducedMotion();
  const source = sourceFromProject(project);
  const sourceLabel = project.sourceLabel ?? SOURCE_LABELS[source];
  const isApplied = appliedProjectIds.has(project.id);
  const isApplying = pendingApplyProjectId === project.id;
  const deliverables = deliverablesForProject(project).slice(0, 4);

  return (
    <motion.section
      className="app-featured-project"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}>
      <div>
        <div className="app-featured-project-tags">
          <span className="app-project-source" data-source={source}>
            {sourceLabel}
          </span>
          <span className="app-project-pick">Best first pick</span>
        </div>
        <h2>{project.title}</h2>
        <p className="app-featured-project-detail">{project.deliverable ?? project.description}</p>
        <div className="app-featured-project-meta">
          {project.matchBand || project.matchLabel || project.recommendationLabel ? (
            <MatchBandBadge band={project.matchBand} label={project.matchLabel || project.recommendationLabel} />
          ) : null}
          <span>
            {project.difficulty === "ADVANCED" ? "Advanced" : project.difficulty === "INTERMEDIATE" ? "Intermediate" : "Beginner"}
          </span>
          <span>{project.estimatedHours ?? "Self-paced"}</span>
          {project.category ? <span>{project.category}</span> : null}
          {project.skills.slice(0, 2).map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <div className="app-featured-project-cta">
          <AppButton
            variant="primary"
            size="sm"
            onClick={onStart}
            disabled={isApplying}
            aria-busy={isApplying}
            iconRight={<ArrowUpRight size={14} aria-hidden />}>
            {isApplying ? "Adding..." : isApplied ? "Open in workspace" : "Add to workspace"}
          </AppButton>
          {onDetails ? (
            <AppButton variant="ghost" size="sm" onClick={onDetails}>
              View brief
            </AppButton>
          ) : null}
        </div>
      </div>

      <aside className="app-featured-project-list" aria-label="Walk-away deliverables">
        <h4>
          <Sparkles size={11} aria-hidden style={{ display: "inline", marginRight: 4, marginBottom: -1 }} />
          What you walk away with
        </h4>
        <ul>
          {deliverables.map((item) => (
            <li key={item}>
              <Check size={12} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </aside>
    </motion.section>
  );
}
