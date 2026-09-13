import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { LogOut, Sparkles } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearAuthSession, planLabel } from "../../lib/auth";
import { normalizePlanId, PRICING_ROUTE } from "../../lib/plans";
import { useAppData } from "./AppDataProvider";

const intrndLogoUrl = new URL("../../../assets/logo/intrnd_logo_transparent.png", import.meta.url).href;

interface NavEntry {
  to: string;
  label: string;
  status?: string | null;
  statusTone?: "active" | "review" | "verified";
  end?: boolean;
}

export function AppNav() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const { user, activeApplications, submittedApplications, needsRevisionApplications, verifiedApplications } = useAppData();

  const activeCount = activeApplications.length + needsRevisionApplications.length;
  const reviewCount = submittedApplications.length;
  const verifiedCount = verifiedApplications.length;
  const currentPlan = normalizePlanId(user?.plan);

  const navItems: NavEntry[] = [
    { to: "/dashboard", label: "Home", end: true },
    { to: "/dashboard/browse", label: "Browse" },
    {
      to: "/dashboard/my-projects",
      label: "My Projects",
      status: activeCount > 0 ? `${activeCount} active` : null,
      statusTone: activeCount > 0 ? "active" : undefined,
    },
    {
      to: "/dashboard/submissions",
      label: "Submissions",
      status: reviewCount > 0 ? `${reviewCount} in review` : null,
      statusTone: reviewCount > 0 ? "review" : undefined,
    },
    {
      to: "/dashboard/proof",
      label: "Proof",
      status: verifiedCount > 0 ? `${verifiedCount} verified` : null,
      statusTone: verifiedCount > 0 ? "verified" : undefined,
    },
  ];

  const initial = (user?.name?.[0] ?? user?.email?.[0] ?? "I").toUpperCase();

  async function handleSignOut() {
    await clearAuthSession();
    navigate("/sign-in");
  }

  return (
    <header className="app-topbar" role="banner">
      <div className="app-topbar-inner">
        <div className="app-topbar-left">
          <NavLink to="/dashboard" className="app-brand" aria-label="Intrnd home">
            <img src={intrndLogoUrl} alt="Intrnd" />
          </NavLink>
        </div>

        <div className="app-topbar-center">
          <LayoutGroup id="app-primary-nav">
            <nav className="app-nav" aria-label="App primary">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => ["app-nav-link", isActive ? "app-nav-link--active" : ""].filter(Boolean).join(" ")}>
                  {({ isActive }) => (
                    <>
                      {isActive && !reduced ? (
                        <motion.span
                          layoutId="app-nav-pill"
                          className="app-nav-link-pill"
                          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                        />
                      ) : isActive ? (
                        <span className="app-nav-link-pill" aria-hidden />
                      ) : null}
                      <span className="app-nav-label">{item.label}</span>
                      {item.status && item.statusTone ? (
                        <motion.span
                          key={item.status}
                          className="app-nav-status"
                          data-tone={item.statusTone}
                          initial={reduced ? false : { scale: 0.92, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
                          {item.status}
                        </motion.span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </LayoutGroup>
        </div>

        <div className="app-topbar-right">
          <div className="app-account-slot">
            {currentPlan === "FREE" ? (
              <Link
                to={PRICING_ROUTE}
                state={{ plan: "PRO" }}
                className="app-topbar-upgrade"
                aria-label="Request pilot access"
                title="Request pilot access">
                <Sparkles size={13} strokeWidth={2.2} aria-hidden />
                <span>Pilot access</span>
              </Link>
            ) : null}
            <div className="app-account-actions">
              <NavLink
                to="/dashboard/account"
                className="app-account-button"
                aria-label="Open account"
                title={user?.name ?? user?.email ?? "Account"}>
                <span className="app-account-avatar" aria-hidden>
                  {initial}
                </span>
                <span className="app-account-button-text">
                  <span className="app-account-button-name">{user?.name?.split(" ")[0] ?? user?.email ?? "Account"}</span>
                  <span className="app-account-button-plan" data-plan={(user?.plan ?? "FREE").toUpperCase()}>
                    {planLabel(user?.plan)}
                  </span>
                </span>
              </NavLink>
              <button type="button" className="app-signout-button" onClick={handleSignOut} aria-label="Sign out">
                <LogOut size={14} aria-hidden />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
