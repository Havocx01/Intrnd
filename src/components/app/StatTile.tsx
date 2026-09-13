import type { LucideIcon } from "lucide-react";

export type StatTone = "active" | "review" | "verified" | "skills" | "neutral";

export interface StatTileProps {
  icon?: LucideIcon;
  value: string | number;
  label: string;
  chip?: string;
  tone?: StatTone;
  hint?: string;
}

export function StatTile({ icon: Icon, value, label, chip, tone = "neutral", hint }: StatTileProps) {
  return (
    <article className="app-stat-strip-item" {...(tone !== "neutral" ? { "data-tone": tone as Exclude<StatTone, "neutral"> } : {})}>
      {Icon ? (
        <span className="app-stat-strip-iconWrap" aria-hidden>
          <Icon size={15} strokeWidth={2.25} />
        </span>
      ) : null}
      <div className="app-stat-strip-body">
        <span className="app-stat-strip-value">{value}</span>
        <span className="app-stat-strip-label">{label}</span>
        {chip ? <span className="app-stat-strip-chip">{chip}</span> : null}
        {hint ? <span className="app-stat-strip-hint">{hint}</span> : null}
      </div>
    </article>
  );
}
