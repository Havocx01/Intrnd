import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthSession } from "./AuthSessionProvider";

export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuthSession();

  if (status === "authenticated" && user) {
    return <Navigate to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} replace />;
  }

  return children;
}
