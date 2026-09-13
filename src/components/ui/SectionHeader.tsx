import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { inViewOnce, revealUp, revealUpSm, staggerContainer, useMotionVariants } from "../../lib/motion";

export interface SectionHeaderProps {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
  // Disable when the parent already controls the stagger.
  animate?: boolean;
}

export function SectionHeader({ kicker, title, description, align = "left", className, animate = true }: SectionHeaderProps) {
  const container = useMotionVariants(staggerContainer(0.07));
  const itemTitle = useMotionVariants(revealUp);
  const itemSecondary = useMotionVariants(revealUpSm);
  const cls = ["hp-section-header", className].filter(Boolean).join(" ");

  if (!animate) {
    return (
      <header className={cls} data-align={align}>
        {kicker ? <span className="hp-kicker">{kicker}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
    );
  }

  return (
    <motion.header className={cls} data-align={align} initial="hidden" whileInView="visible" viewport={inViewOnce} variants={container}>
      {kicker ? (
        <motion.span className="hp-kicker" variants={itemSecondary}>
          {kicker}
        </motion.span>
      ) : null}
      <motion.h2 variants={itemTitle}>{title}</motion.h2>
      {description ? <motion.p variants={itemSecondary}>{description}</motion.p> : null}
    </motion.header>
  );
}
