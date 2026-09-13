import { matchBandLabel, type MatchBand } from "../../lib/recommendationScore";

function normalizeBand(value: MatchBand | string | null | undefined): MatchBand | null {
  if (value == null || value === "") return null;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "STRONG" || normalized === "GOOD" || normalized === "EXPLORATORY") {
    return normalized;
  }
  return null;
}

export function MatchBandBadge({
  band,
  label,
  className,
  title = "How well this project fits your profile, goals, skills, available time, and resume value.",
}: {
  band?: MatchBand | string | null;
  label?: string | null;
  className?: string;
  showIcon?: boolean;
  title?: string;
}) {
  const resolved = normalizeBand(band);
  const text = resolved ? matchBandLabel(resolved) : label?.trim() || null;
  if (!text) return null;

  return (
    <span className={["app-match-band", className].filter(Boolean).join(" ")} data-band={(resolved ?? "good").toLowerCase()} title={title}>
      {text}
    </span>
  );
}
