type ScoreBadgeProps = { score: number; label?: string; size?: "sm" | "md" | "lg" };

function scoreColor(score: number): string {
  if (score >= 0.8) return "var(--color-success, #22c55e)";
  if (score >= 0.6) return "var(--color-primary, #6366f1)";
  if (score >= 0.4) return "var(--color-warning, #f59e0b)";
  return "var(--color-muted, #94a3b8)";
}

export function ScoreBadge({ score, label, size = "md" }: ScoreBadgeProps) {
  const pct = Math.round(score * 100);
  const sizeClass = `score-badge--${size}`;

  return (
    <span
      className={`score-badge ${sizeClass}`}
      style={{ "--score-color": scoreColor(score) } as React.CSSProperties}
      title={label ? `${label}: ${pct}%` : `${pct}% match`}>
      <svg viewBox="0 0 36 36" className="score-badge__ring">
        <path className="score-badge__bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path
          className="score-badge__fill"
          strokeDasharray={`${pct}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <span className="score-badge__value">{pct}</span>
    </span>
  );
}

export function RatingBadge({ rating, max = 10 }: { rating: number; max?: number }) {
  const normalized = rating / max;
  const color = scoreColor(normalized);
  const label = normalized >= 0.8 ? "Strong" : normalized >= 0.6 ? "Good" : normalized >= 0.4 ? "Moderate" : "Weak";

  return (
    <span className="rating-badge" style={{ "--rating-color": color } as React.CSSProperties}>
      <strong>{rating}</strong>
      <span>/{max}</span>
      <small>{label}</small>
    </span>
  );
}
