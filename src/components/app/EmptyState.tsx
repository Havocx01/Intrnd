import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { easeOutSoft } from "../../lib/motion";

export interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  preview?: ReactNode;
  variant?: "default" | "compact";
}

export function EmptyState({ eyebrow, title, description, actions, preview, variant = "default" }: EmptyStateProps) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      className="app-empty"
      data-variant={variant === "compact" ? "compact" : undefined}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutSoft }}>
      <div className="app-empty-body">
        {eyebrow ? <span className="app-page-eyebrow">{eyebrow}</span> : null}
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        {actions ? <div className="app-empty-actions">{actions}</div> : null}
      </div>
      {preview ? <div className="app-empty-preview">{preview}</div> : null}
    </motion.section>
  );
}
