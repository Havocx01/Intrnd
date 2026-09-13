import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "./ui/Button";
import { easeOutSoft } from "../lib/motion";
import { useAuthSession } from "./auth/AuthSessionProvider";

const intrndLogoUrl = new URL("../../assets/logo/intrnd_logo_transparent.png", import.meta.url).href;

type NavItem = {
  label: string;
  to: string;
  type: "anchor" | "route";
};

const navItems: NavItem[] = [
  { label: "How it works", to: "#how-it-works", type: "anchor" },
  { label: "Projects", to: "#projects", type: "anchor" },
  { label: "Proof", to: "#proof", type: "anchor" },
  { label: "For partners", to: "#partners", type: "anchor" },
  { label: "FAQ", to: "#faq", type: "anchor" },
];

export default function Layout() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const drawerId = useId();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const { status: authStatus, user: authUser } = useAuthSession();
  const isAuthenticated = authStatus === "authenticated" && Boolean(authUser);

  const isHome = location.pathname === "/";
  const isShellRoute =
    !location.pathname.startsWith("/admin") &&
    !location.pathname.startsWith("/review") &&
    !location.pathname.startsWith("/dashboard") &&
    !location.pathname.startsWith("/onboarding");

  useEffect(() => {
    if (!isShellRoute) return;
    const handler = () => setIsStuck(window.scrollY > 8);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [isShellRoute]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
      }
      if (event.key === "Tab") {
        const node = drawerRef.current;
        if (!node) return;
        const focusable = node.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  if (!isShellRoute) {
    // Keep the dashboard provider mounted across route changes.
    const isDashboard = location.pathname.startsWith("/dashboard");
    return (
      <>
        <main className={isDashboard ? undefined : "page-transition-shell"} key={isDashboard ? "dashboard" : location.pathname}>
          <Outlet />
        </main>
      </>
    );
  }

  const headerInitial = reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 };
  const headerAnimate = { opacity: 1, y: 0 };
  const headerTransition = reducedMotion ? { duration: 0 } : { duration: 0.32, ease: easeOutSoft, delay: 0.05 };

  return (
    <div className="hp-shell">
      <motion.header
        className={`hp-header ${isStuck ? "is-stuck" : ""}`}
        initial={headerInitial}
        animate={headerAnimate}
        transition={headerTransition}>
        <div className="hp-header-inner">
          <NavLink to="/" className="hp-brand" aria-label="Intrnd home">
            <img src={intrndLogoUrl} alt="" className="hp-brand-logo" />
            <span style={{ position: "absolute", left: "-9999px" }}>Intrnd</span>
          </NavLink>

          <LayoutGroup id="hp-nav">
            <nav className="hp-nav" aria-label="Primary">
              {navItems.map((item) => {
                const isActive = item.type === "route" && location.pathname === item.to;
                return item.type === "anchor" ? (
                  <a key={item.to} className="hp-nav-link" href={isHome ? item.to : `/${item.to}`} data-active={false}>
                    {item.label}
                  </a>
                ) : (
                  <NavLink key={item.to} to={item.to} className="hp-nav-link" data-active={isActive ? "true" : "false"}>
                    {item.label}
                    {isActive && !reducedMotion ? (
                      <motion.span
                        layoutId="hp-nav-underline"
                        className="hp-nav-underline"
                        transition={{ duration: 0.32, ease: easeOutSoft }}
                      />
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
          </LayoutGroup>

          <div className="hp-header-cta hp-header-desktop">
            {isAuthenticated ? (
              <Button as="link" to="/dashboard" size="sm" iconRight={<ArrowRight size={16} className="hp-btn-arrow" />}>
                Open dashboard
              </Button>
            ) : (
              <>
                <NavLink to="/sign-in" className="hp-link-secondary">
                  Sign in
                </NavLink>
                <Button as="link" to="/sign-up" size="sm" iconRight={<ArrowRight size={16} className="hp-btn-arrow" />}>
                  Start building experience
                </Button>
              </>
            )}
          </div>

          <button
            className="hp-menu-toggle"
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls={drawerId}
            onClick={() => setIsOpen((prev) => !prev)}>
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={drawerId}
            ref={drawerRef}
            className="hp-mobile-drawer is-open"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: easeOutSoft }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}>
            <motion.div
              className="hp-mobile-drawer-panel"
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.22, ease: easeOutSoft }}>
              {navItems.map((item) =>
                item.type === "anchor" ? (
                  <a key={item.to} href={isHome ? item.to : `/${item.to}`} onClick={() => setIsOpen(false)}>
                    {item.label}
                  </a>
                ) : (
                  <NavLink key={item.to} to={item.to} onClick={() => setIsOpen(false)}>
                    {item.label}
                  </NavLink>
                ),
              )}
              <div className="hp-mobile-drawer-cta">
                {isAuthenticated ? (
                  <Button as="link" to="/dashboard" size="md" iconRight={<ArrowRight size={16} className="hp-btn-arrow" />}>
                    Open dashboard
                  </Button>
                ) : (
                  <>
                    <Button as="link" to="/sign-in" variant="secondary" size="md">
                      Sign in
                    </Button>
                    <Button as="link" to="/sign-up" size="md" iconRight={<ArrowRight size={16} className="hp-btn-arrow" />}>
                      Start building experience
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="page-transition-shell" key={location.pathname}>
        <Outlet />
      </main>

      <SiteFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}

function SiteFooter({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <footer className="hp-footer">
      <div className="hp-footer-inner">
        <div className="hp-footer-brand">
          <strong>Intrnd</strong>
          <p>Structured projects, guided progress, reviewed proof. Helping students build experience before their first internship.</p>
        </div>
        <div className="hp-footer-col">
          <h4>Product</h4>
          <a href="/#how-it-works">How it works</a>
          <a href="/#projects">Browse projects</a>
          <a href="/#proof">Proof</a>
          <a href="/#faq">FAQ</a>
        </div>
        <div className="hp-footer-col">
          <h4>For partners</h4>
          <a href="/#partners">Universities</a>
          <a href="/#partners">Organizations</a>
          <a href="mailto:partners@intrnd.app">Contact partners</a>
        </div>
        <div className="hp-footer-col">
          <h4>Account</h4>
          {isAuthenticated ? (
            <NavLink to="/dashboard">Open dashboard</NavLink>
          ) : (
            <>
              <NavLink to="/sign-in">Sign in</NavLink>
              <NavLink to="/sign-up">Start free</NavLink>
            </>
          )}
        </div>
        <div className="hp-footer-col">
          <h4>Contact</h4>
          <a href="mailto:hello@intrnd.app">Contact</a>
        </div>
      </div>
      <div className="hp-footer-base">
        <span>© {new Date().getFullYear()} Intrnd. Beta.</span>
        <span>Built for students, campus orgs, nonprofits and small teams.</span>
      </div>
    </footer>
  );
}
