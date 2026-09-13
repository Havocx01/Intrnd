import type { UserPlan } from "./auth";

export type PlanId = UserPlan;

export type PlanDefinition = {
  id: "FREE" | "PRO";
  name: string;
  tagline: string;
  recommended?: boolean;
  ctaLabel: string;
  features: string[];
};

// Pilot access is granted manually; there is no paid checkout.
export const PLANS: PlanDefinition[] = [
  {
    id: "FREE",
    name: "Free access",
    tagline: "Start one personalized project and use the complete project workspace.",
    ctaLabel: "Included",
    features: [
      "One fully available starter recommendation",
      "Personalized roadmap and checkpoint guidance",
      "Evidence package and submission workflow",
      "Saved profile and project-match explanations",
    ],
  },
  {
    id: "PRO",
    name: "Pilot access",
    tagline: "Join the reviewed beta cohort and use the full personalized project set.",
    recommended: true,
    ctaLabel: "Request pilot access",
    features: [
      "Full personalized recommendation list",
      "Multiple active project workspaces",
      "Complete project briefs and evidence requirements",
      "Guided, standard, or accelerated roadmap support",
      "Intrnd submission review and reviewer-confirmed proof",
    ],
  },
];

export function findPlan(id: PlanId): PlanDefinition | undefined {
  return PLANS.find((plan) => plan.id === id || (id === "PRO_PLUS" && plan.id === "PRO"));
}

export function normalizePlanId(value: string | null | undefined): PlanId {
  const upper = (value ?? "").toUpperCase();
  if (upper === "PRO" || upper === "PRO_PLUS") return upper;
  return "FREE";
}

export const PRICING_ROUTE = "/dashboard/pricing";
