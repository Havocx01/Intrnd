import { motion, useReducedMotion } from "framer-motion";

const APP_PROGRESS_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const APP_PROGRESS_DURATION = 0.65;

export interface AppProgressBarProps {
  // Value from 0 to 100.
  value: number;
  tone?: "brand" | "ink" | "success";
  showMeta?: boolean;
  metaLabel?: string;
  showPercent?: boolean;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
}

export function AppProgressBar({
  value,
  tone = "brand",
  showMeta = false,
  metaLabel,
  showPercent = false,
  ariaLabel,
  className,
  size = "sm",
}: AppProgressBarProps) {
  const reduced = useReducedMotion();
  const clamped = Math.min(Math.max(value, 0), 100);
  const fillScale = clamped / 100;
  const showMetaRow = showMeta || showPercent;
  const metaLeft = metaLabel ?? "Progress";

  return (
    <div
      className={["app-progress", size === "md" ? "app-progress--md" : "", className].filter(Boolean).join(" ")}
      data-tone={tone}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? (metaLabel ? `${metaLabel} ${Math.round(clamped)} percent` : `Progress ${Math.round(clamped)} percent`)}>
      <div className="app-progress-track">
        {reduced ? (
          <div className="app-progress-fill" style={{ transform: `scaleX(${fillScale})` }} />
        ) : (
          <motion.div
            className="app-progress-fill"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: fillScale }}
            transition={{ duration: APP_PROGRESS_DURATION, ease: APP_PROGRESS_EASE }}
          />
        )}
      </div>
      {showMetaRow ? (
        <div className="app-progress-meta">
          <span>{metaLeft}</span>
          <strong>{Math.round(clamped)}%</strong>
        </div>
      ) : null}
    </div>
  );
}
