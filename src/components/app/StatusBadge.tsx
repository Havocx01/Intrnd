import { CheckCircle2, FileSearch, RefreshCw } from "lucide-react";

export type StatusTone = "active" | "submitted" | "review" | "needs-changes" | "verified";

const TONE_LABEL: Record<StatusTone, string> = {
  active: "In progress",
  submitted: "Submitted",
  review: "In review",
  "needs-changes": "Needs changes",
  verified: "Verified",
};

const TONE_DESCRIPTION: Record<StatusTone, string> = {
  active: "currently being worked on",
  submitted: "submitted for review",
  review: "in review by Intrnd",
  "needs-changes": "needs revisions before resubmitting",
  verified: "verified and ready to share",
};

const TONE_ICON: Record<Exclude<StatusTone, "active" | "verified">, typeof CheckCircle2> = {
  submitted: FileSearch,
  review: FileSearch,
  "needs-changes": RefreshCw,
};

export function statusToneFromBackend(status: string): StatusTone {
  if (status === "VERIFIED") return "verified";
  if (status === "SUBMITTED") return "submitted";
  if (status === "NEEDS_REVISION") return "needs-changes";
  return "active";
}

export interface StatusBadgeProps {
  tone: StatusTone;
  label?: string;
  withIcon?: boolean;
}

export function StatusBadge({ tone, label, withIcon = true }: StatusBadgeProps) {
  const display = label ?? TONE_LABEL[tone];
  const Icon = tone !== "active" && tone !== "verified" ? TONE_ICON[tone] : null;

  return (
    <span className="app-status" data-tone={tone}>
      {withIcon && tone === "active" ? (
        <span className="app-status-dot" aria-hidden />
      ) : withIcon && Icon ? (
        <Icon size={12} aria-hidden />
      ) : null}
      {display}
      <span className="app-sr-only"> — {TONE_DESCRIPTION[tone]}</span>
    </span>
  );
}
