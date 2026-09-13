import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Compass, FileSearch, FolderKanban, Home, LogOut, Settings, Sparkles, UserCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, planLabel } from "../../lib/auth";
import { normalizePlanId, PRICING_ROUTE } from "../../lib/plans";
import { useAppData } from "./AppDataProvider";

const intrndLogoUrl = new URL("../../../assets/logo/intrnd_logo_transparent.png", import.meta.url).href;

const NAV_ITEMS: readonly { to: string; label: string; icon: typeof Home; end?: boolean }[] = [
  { to: "/dashboard", label: "Home", icon: Home, end: true },
  { to: "/dashboard/browse", label: "Browse", icon: Compass },
  { to: "/dashboard/my-projects", label: "Projects", icon: FolderKanban },
  { to: "/dashboard/submissions", label: "Review", icon: FileSearch },
  { to: "/dashboard/proof", label: "Proof", icon: BadgeCheck },
];

export function AppMobileNav() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppData();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const currentPlan = normalizePlanId(user?.plan);

  useEffect(() => {
    setIsAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAccountOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAccountOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAccountOpen]);

  async function handleSignOut() {
    setIsAccountOpen(false);
    await clearAuthSession();
    navigate("/sign-in");
  }

  return (
    <>
      <div className="app-mobile-topbar">
        <NavLink to="/dashboard" className="app-brand" aria-label="Intrnd home">
          <img src={intrndLogoUrl} alt="Intrnd" />
        </NavLink>
        <div className="app-mobile-topbar-actions">
          {currentPlan === "FREE" ? (
            <Link to={PRICING_ROUTE} state={{ plan: "PRO" }} className="app-topbar-upgrade" aria-label="Request pilot access">
              <Sparkles size={13} strokeWidth={2.2} aria-hidden />
              <span>Pilot access</span>
            </Link>
          ) : null}
          <button
            type="button"
            className="app-account-button"
            onClick={() => setIsAccountOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isAccountOpen}>
            <span className="app-account-avatar" aria-hidden>
              {(user?.name?.[0] ?? user?.email?.[0] ?? "I").toUpperCase()}
            </span>
            <span>Account</span>
          </button>
        </div>
      </div>

      <nav className="app-mobilenav" aria-label="App mobile">
        <LayoutGroup id="app-mobile-nav">
          <div className="app-mobilenav-inner">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="app-mobilenav-item">
                {({ isActive }) => (
                  <>
                    {isActive && !reduced ? (
                      <motion.span layoutId="app-mobile-nav-pill" className="app-mobilenav-pill" transition={{ duration: 0.3 }} />
                    ) : isActive ? (
                      <span className="app-mobilenav-pill" aria-hidden />
                    ) : null}
                    <item.icon size={18} aria-hidden />
                    <span data-active={isActive ? "true" : "false"}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </LayoutGroup>
      </nav>

      <AnimatePresence>
        {isAccountOpen ? (
          <motion.div
            className="app-account-sheet-overlay"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsAccountOpen(false);
            }}>
            <motion.aside
              className="app-account-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Account menu"
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              exit={{ y: 30 }}
              transition={{ duration: 0.28 }}>
              <header>
                <span className="app-account-avatar" aria-hidden>
                  {(user?.name?.[0] ?? user?.email?.[0] ?? "I").toUpperCase()}
                </span>
                <div className="app-account-sheet-name">
                  <strong>{user?.name ?? "Intrnd student"}</strong>
                  <span>{user?.email ?? ""}</span>
                  <span className="app-plan-pill" data-plan={(user?.plan ?? "FREE").toUpperCase()}>
                    {planLabel(user?.plan)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAccountOpen(false)}
                  aria-label="Close account menu"
                  style={{
                    marginLeft: "auto",
                    background: "transparent",
                    border: 0,
                    padding: 6,
                    color: "var(--hp-muted)",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}>
                  <X size={18} aria-hidden />
                </button>
              </header>

              <NavLink to="/dashboard/account">
                <UserCircle size={16} aria-hidden />
                <span>Your profile</span>
              </NavLink>
              <NavLink to="/onboarding?edit=true">
                <Settings size={16} aria-hidden />
                <span>Update preferences</span>
              </NavLink>
              <button type="button" data-tone="signout" onClick={handleSignOut}>
                <LogOut size={16} aria-hidden />
                <span>Sign out</span>
              </button>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
