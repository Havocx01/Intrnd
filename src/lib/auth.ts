import { clearAppDataCache } from "./appDataCache";

export type UserPlan = "FREE" | "PRO" | "PRO_PLUS";

export const PLAN_LABELS: Record<string, string> = { FREE: "Free access", PRO: "Pilot access", PRO_PLUS: "Pilot access" };

// Plans outside this set receive only the free starter recommendation.
const PLANS_WITH_FULL_RECOMMENDATIONS: ReadonlySet<string> = new Set(["PRO", "PRO_PLUS"]);

export function normalizePlan(plan: string | null | undefined): string {
  if (!plan) return "FREE";
  return plan.toUpperCase();
}

export function planLabel(plan: string | null | undefined): string {
  return PLAN_LABELS[normalizePlan(plan)] ?? PLAN_LABELS.FREE;
}

export function hasFullRecommendationAccess(plan: string | null | undefined): boolean {
  return PLANS_WITH_FULL_RECOMMENDATIONS.has(normalizePlan(plan));
}

export type ProfileChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ProfileChangeRequestSummary = {
  id: string;
  status: ProfileChangeRequestStatus;
  reason: string | null;
  decisionNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accountType: string | null;
  plan?: string | null;
  onboardingCompleted: boolean;
  profileEditsUsed?: number;
  profileEditsAllowed?: number;
  canEditProfile?: boolean;
  profileChangeRequest?: ProfileChangeRequestSummary | null;
  studentProfile?: {
    school: string | null;
    major: string | null;
    gradYear: number | null;
    careerInterests: string | null;
    skillsToBuild: string | null;
    projectPreferences: string | null;
    targetRoles: string | null;
    targetCompanies?: string | null;
    nicheInterests?: string | null;
    currentSkills: string | null;
    resumeStrength: string | null;
    roadmapDefaults?: { weeklyHours: number; supportLevel: "GUIDED" | "STANDARD" | "ACCELERATED" } | null;
  } | null;
};

export type AuthResponse = { user: AuthUser };

export const authSessionChangedEvent = "intrnd:auth-session-changed";

export function saveAuthSession(auth: AuthResponse) {
  // The credential stays in an httpOnly cookie; this event only updates UI state.
  window.dispatchEvent(new CustomEvent<AuthUser | null>(authSessionChangedEvent, { detail: auth.user }));
}

export function getAuthToken() {
  return null;
}

export async function clearAuthSession() {
  const response = await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });

  if (!response.ok) {
    throw new Error("Unable to securely end the session. Please try again.");
  }

  clearAppDataCache();
  window.dispatchEvent(new CustomEvent<AuthUser | null>(authSessionChangedEvent, { detail: null }));
}

export async function signUp(payload: {
  name?: string;
  email: string;
  password: string;
  accountType?: "STUDENT" | "ORGANIZATION";
  organizationName?: string;
}) {
  return authRequest("/api/auth/sign-up", payload);
}

export async function signIn(payload: { email: string; password: string }) {
  return authRequest("/api/auth/sign-in", payload);
}

export async function signInWithGoogle(payload: {
  credential?: string;
  accessToken?: string;
  accountType?: "STUDENT" | "ORGANIZATION";
  organizationName?: string;
}) {
  return authRequest("/api/auth/google", payload);
}

async function authRequest(path: string, payload: object): Promise<AuthResponse> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  }

  return data;
}
