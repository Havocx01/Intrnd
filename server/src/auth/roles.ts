export function roleForOnboarding(
  existingRole: string,
  accountType: "STUDENT" | "ORGANIZATION",
): "ADMIN" | "REVIEWER" | "STUDENT" | "ORGANIZATION" {
  if (existingRole === "ADMIN" || existingRole === "REVIEWER") return existingRole;
  return accountType;
}
