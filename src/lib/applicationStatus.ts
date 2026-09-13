export function isAddedApplicationStatus(status: string | null | undefined): boolean {
  return Boolean(status && status !== "WITHDRAWN");
}
