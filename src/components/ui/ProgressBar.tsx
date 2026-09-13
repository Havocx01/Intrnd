import type { HTMLAttributes } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { easeOutSoft, onceInView } from "../../lib/motion";

type Tone = "ink" | "brand";

export interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"> {
  // Value from 0 to 1.
  value: number;
  tone?: Tone;
  ariaLabel?: string;
  animateOnView?: boolean;
  // Delay in seconds.
  delay?: number;
}

export function ProgressBar({ value, tone = "ink", ariaLabel, animateOnView = true, delay = 0, className, ...rest }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const reduced = useReducedMotion();

  return (
    <div
      className={["hp-progress", className].filter(Boolean).join(" ")}
      data-tone={tone}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      {...rest}>
      {animateOnView && !reduced ? (
        <motion.div
          className="hp-progress-fill"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: clamped }}
          viewport={onceInView}
          transition={{ duration: 0.9, ease: easeOutSoft, delay }}
        />
      ) : (
        <div className="hp-progress-fill" style={{ transform: `scaleX(${clamped})` }} />
      )}
    </div>
  );
}
