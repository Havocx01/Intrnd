import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Info, X } from "lucide-react";
import { useAppData } from "./AppDataProvider";

export function AppToast() {
  const { notice, setNotice } = useAppData();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {notice ? (
        <motion.aside
          key={notice.id}
          className="app-toast"
          data-tone={notice.tone ?? "neutral"}
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live={notice.tone === "error" ? "assertive" : "polite"}
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}>
          <span className="app-toast-mark" aria-hidden>
            {notice.tone === "error" ? <X size={16} /> : notice.tone === "success" ? <CheckCircle2 size={16} /> : <Info size={16} />}
          </span>
          <div className="app-toast-body">
            <strong>{notice.title}</strong>
            <span>{notice.message}</span>
          </div>
          <button type="button" className="app-toast-close" onClick={() => setNotice(null)} aria-label="Dismiss notification">
            <X size={14} aria-hidden />
          </button>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
