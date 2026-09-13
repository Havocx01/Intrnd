import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { AppDataProvider, useAppData } from "./AppDataProvider";
import { AppMobileNav } from "./AppMobileNav";
import { AppNav } from "./AppNav";
import { AppToast } from "./AppToast";
import LoadingScreen from "../LoadingScreen";
import { loadingVariantFromPath } from "../../lib/loadingSkeleton";
import { pageFade, useMotionVariants } from "../../lib/motion";

const LEGACY_HASH_TO_PATH: Record<string, string> = {
  "#home": "/dashboard",
  "#browse": "/dashboard/browse",
  "#my-projects": "/dashboard/my-projects",
  "#submissions": "/dashboard/submissions",
  "#resume-proof": "/dashboard/proof",
  "#proof": "/dashboard/proof",
  "#profile": "/dashboard/account",
};

function AppShellContent() {
  const { isInitialLoading, user } = useAppData();
  const location = useLocation();
  const outlet = useOutlet();
  const fade = useMotionVariants(pageFade);

  // Update the header through CSS without rerendering the page.
  useEffect(() => {
    const target = document.querySelector<HTMLElement>(".app-shell");
    if (!target) return;
    const update = () => {
      const scrolled = window.scrollY > 6;
      if (target.dataset.scrolled !== (scrolled ? "true" : "false")) {
        target.dataset.scrolled = scrolled ? "true" : "false";
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [location.pathname]);

  if (!user && isInitialLoading) {
    return (
      <div className="app-shell">
        <main className="app-main" id="app-main" tabIndex={-1}>
          <LoadingScreen label="Loading your workspace" mode="inline" variant={loadingVariantFromPath(location.pathname)} />
        </main>
      </div>
    );
  }

  if (!user) {
    // Keep the shell visible while useAppData redirects.
    return (
      <div className="app-shell">
        <main className="app-main" id="app-main" tabIndex={-1}>
          <LoadingScreen label="Loading your workspace" mode="inline" variant={loadingVariantFromPath(location.pathname)} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppNav />
      <AppMobileNav />
      <AppToast />

      <main className="app-main" id="app-main" tabIndex={-1}>
        <div className="app-page-transition-stack">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={location.pathname}
              className="app-page-transition"
              variants={fade}
              initial="initial"
              animate="animate"
              exit="exit">
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Map legacy hash routes to the new paths.
  useEffect(() => {
    if (location.pathname === "/dashboard" && location.hash && LEGACY_HASH_TO_PATH[location.hash]) {
      const target = LEGACY_HASH_TO_PATH[location.hash];
      if (target !== location.pathname) {
        navigate(target, { replace: true });
      }
    }
  }, [location.hash, location.pathname, navigate]);

  return (
    <AppDataProvider>
      <AppShellContent />
    </AppDataProvider>
  );
}
