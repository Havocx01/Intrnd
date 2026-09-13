export const applicationStatuses = ["ACTIVE", "SUBMITTED", "NEEDS_REVISION", "VERIFIED", "WITHDRAWN"] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export function canEditSubmission(status: string): status is "ACTIVE" | "NEEDS_REVISION" {
  return status === "ACTIVE" || status === "NEEDS_REVISION";
}

export function applyTransition(status: string | null): "CREATE" | "REACTIVATE" | "UNCHANGED" | "REJECT" {
  if (!status) return "CREATE";
  if (status === "WITHDRAWN") return "REACTIVATE";
  if (status === "ACTIVE") return "UNCHANGED";
  return "REJECT";
}

export function transitionError(code: string, error: string) {
  return { code, error };
}
