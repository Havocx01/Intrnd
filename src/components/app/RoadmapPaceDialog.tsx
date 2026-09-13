import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AppButton } from "./Button";
import { easeOutSoft } from "../../lib/motion";
import type { RoadmapPreferences, RoadmapSupportLevel } from "./AppDataProvider";

const SUPPORT_OPTIONS: Array<{ value: RoadmapSupportLevel; label: string; detail: string }> = [
  { value: "GUIDED", label: "Guided", detail: "Detailed actions and extra prep help." },
  { value: "STANDARD", label: "Standard", detail: "Focused workflow with normal guidance." },
  { value: "ACCELERATED", label: "Accelerated", detail: "Concise steps if you already know the tools." },
];

export function RoadmapPaceDialog({
  open,
  projectTitle,
  preferences,
  isSaving,
  onCancel,
  onSave,
}: {
  open: boolean;
  projectTitle: string;
  preferences: RoadmapPreferences | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (preferences: RoadmapPreferences) => Promise<void> | void;
}) {
  const reduced = useReducedMotion();
  const titleId = useId();
  const hoursId = useId();
  const initial = validPreferences(preferences) ? preferences : { weeklyHours: 5, supportLevel: "STANDARD" as RoadmapSupportLevel };
  const [weeklyHours, setWeeklyHours] = useState(String(initial.weeklyHours));
  const [supportLevel, setSupportLevel] = useState<RoadmapSupportLevel>(initial.supportLevel);
  const parsedHours = Number(weeklyHours);
  const hoursValid = Number.isInteger(parsedHours) && parsedHours >= 1 && parsedHours <= 40;

  useEffect(() => {
    if (!open) return;
    const next = validPreferences(preferences) ? preferences : { weeklyHours: 5, supportLevel: "STANDARD" as RoadmapSupportLevel };
    setWeeklyHours(String(next.weeklyHours));
    setSupportLevel(next.supportLevel);
  }, [open, preferences]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onCancel, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const scheduleCopy = useMemo(() => {
    if (!hoursValid) return "Enter a whole number from 1 to 40.";
    if (parsedHours <= 3) return "Lighter weekly pace.";
    if (parsedHours <= 8) return "Steady part-time pace.";
    return "More milestones grouped into each week.";
  }, [hoursValid, parsedHours]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="roadmap-pace-overlay"
          className="app-modal-overlay"
          role="presentation"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => {
            if (!isSaving) onCancel();
          }}>
          <motion.div
            className="app-roadmap-start"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: easeOutSoft }}
            onClick={(event) => event.stopPropagation()}>
            <header className="app-roadmap-start-header">
              <div className="app-roadmap-start-heading">
                <h2 id={titleId} className="app-roadmap-start-title">
                  Change pace
                </h2>
                <p className="app-roadmap-start-project">{projectTitle}</p>
              </div>
              <button type="button" className="app-roadmap-start-close" aria-label="Close" disabled={isSaving} onClick={onCancel}>
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </header>

            <div className="app-roadmap-start-body">
              <p className="app-roadmap-start-note">
                Required outputs and completed checkpoints stay the same. Only pacing and guidance change.
              </p>

              <div className="app-roadmap-start-fields">
                <div className="app-roadmap-start-field">
                  <label className="app-roadmap-start-label" htmlFor={hoursId}>
                    Hours each week
                  </label>
                  <input
                    id={hoursId}
                    className="app-roadmap-start-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={40}
                    step={1}
                    value={weeklyHours}
                    disabled={isSaving}
                    aria-invalid={!hoursValid}
                    onChange={(event) => setWeeklyHours(event.target.value)}
                  />
                  <p className={hoursValid ? "app-roadmap-start-hint" : "app-roadmap-start-hint app-roadmap-start-hint--error"}>
                    {hoursValid ? scheduleCopy : "Enter a whole number from 1 to 40."}
                  </p>
                </div>

                <fieldset className="app-roadmap-start-support" disabled={isSaving}>
                  <legend className="app-roadmap-start-label">Guidance</legend>
                  <div className="app-roadmap-start-support-list" role="radiogroup" aria-label="Guidance level">
                    {SUPPORT_OPTIONS.map((option) => {
                      const selected = supportLevel === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className="app-roadmap-start-support-option"
                          data-selected={selected ? "true" : undefined}
                          onClick={() => setSupportLevel(option.value)}>
                          <span className="app-roadmap-start-support-mark" aria-hidden />
                          <span className="app-roadmap-start-support-text">
                            <strong>{option.label}</strong>
                            <span>{option.detail}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </div>

            <footer className="app-roadmap-start-footer">
              <AppButton type="button" variant="secondary" size="md" disabled={isSaving} onClick={onCancel}>
                Cancel
              </AppButton>
              <AppButton
                type="button"
                variant="primary"
                size="md"
                disabled={!hoursValid || isSaving}
                onClick={() => {
                  void onSave({ weeklyHours: parsedHours, supportLevel });
                }}>
                {isSaving ? "Updating…" : "Update roadmap"}
              </AppButton>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function validPreferences(value: RoadmapPreferences | null | undefined): value is RoadmapPreferences {
  return Boolean(
    value &&
      Number.isInteger(value.weeklyHours) &&
      value.weeklyHours >= 1 &&
      value.weeklyHours <= 40 &&
      ["GUIDED", "STANDARD", "ACCELERATED"].includes(value.supportLevel),
  );
}
