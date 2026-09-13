import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../../lib/auth";
import { authSessionChangedEvent } from "../../lib/auth";

type AuthSessionStatus = "checking" | "authenticated" | "anonymous" | "unavailable";

type AuthSessionContextValue = { status: AuthSessionStatus; user: AuthUser | null; refresh: () => Promise<void> };

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

let cachedUser: AuthUser | null = null;
let hasCheckedSession = false;
let pendingSessionRequest: Promise<AuthUser | null> | null = null;

async function requestCurrentUser() {
  if (!pendingSessionRequest) {
    pendingSessionRequest = fetch("/api/users/me", { credentials: "include", headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Session check failed.");
        const payload = (await response.json()) as { user?: AuthUser };
        return payload.user ?? null;
      })
      .finally(() => {
        pendingSessionRequest = null;
      });
  }

  return pendingSessionRequest;
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [status, setStatus] = useState<AuthSessionStatus>(() =>
    hasCheckedSession ? (cachedUser ? "authenticated" : "anonymous") : "checking",
  );

  async function refresh() {
    try {
      const nextUser = await requestCurrentUser();
      cachedUser = nextUser;
      hasCheckedSession = true;
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "anonymous");
    } catch {
      // A temporary network failure is not proof that the session was revoked.
      setStatus(cachedUser ? "authenticated" : "unavailable");
    }
  }

  useEffect(() => {
    if (!hasCheckedSession) void refresh();

    const handleSessionChange = (event: Event) => {
      const nextUser = (event as CustomEvent<AuthUser | null>).detail ?? null;
      cachedUser = nextUser;
      hasCheckedSession = true;
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "anonymous");
    };

    window.addEventListener(authSessionChangedEvent, handleSessionChange);
    return () => window.removeEventListener(authSessionChangedEvent, handleSessionChange);
  }, []);

  const value = useMemo(() => ({ status, user, refresh }), [status, user]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  }
  return context;
}
