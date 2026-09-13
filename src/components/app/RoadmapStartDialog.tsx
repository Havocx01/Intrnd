import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AppButton } from "./Button";
import { easeOutSoft } from "../../lib/motion";
import type { RoadmapPreferences, RoadmapSupportLevel } from "./AppDataProvider";

type StartRequest = { projectId: string; projectTitle: string; difficulty: string | null; estimatedHours: string | null } | null;

const SUPPORT_OPTIONS: Array<{ value: RoadmapSupportLevel; label: string; detail: string }> = [
  { value: "GUIDED", label: "Guided", detail: "Detailed actions and extra prep help." },
  { value: "STANDARD", label: "Standard", detail: "Focused workflow with normal guidance." },
  { value: "ACCELERATED", label: "Accelerated", detail: "Concise steps if you already know the tools." },
];

export function RoadmapStartDialog({
  request,
  defaultPreferences,
  isStarting,
  onCancel,
  onStart,
}: {
  request: StartRequest;
  defaultPreferences: RoadmapPreferences | null;
  isStarting: boolean;
  onCancel: () => void;
  onStart: (preferences: RoadmapPreferences) => Promise<void>;
}) {
  const reduced = useReducedMotion();
  const titleId = useId();
  const hoursId = useId();
  const initialPreferences = validPreferences(defaultPreferences)
    ? defaultPreferences
    : { weeklyHours: 5, supportLevel: "STANDARD" as RoadmapSupportLevel };
  const [weeklyHours, setWeeklyHours] = useState(String(initialPreferences.weeklyHours));
  const [supportLevel, setSupportLevel] = useState<RoadmapSupportLevel>(initialPreferences.supportLevel);
  const [isEditing, setIsEditing] = useState(false);
  const parsedHours = Number(weeklyHours);
  const hoursValid = Number.isInteger(parsedHours) && parsedHours >= 1 && parsedHours <= 40;

  useEffect(() => {
    if (!request) return;
    const preferences = validPreferences(defaultPreferences)
      ? defaultPreferences
      : { weeklyHours: 5, supportLevel: "STANDARD" as RoadmapSupportLevel };
    setWeeklyHours(String(preferences.weeklyHours));
    setSupportLevel(preferences.supportLevel);
    setIsEditing(false);
  }, [defaultPreferences, request]);

  useEffect(() => {
    if (!request) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isStarting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStarting, onCancel, request]);

  useEffect(() => {
    if (!request) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [request]);

  const scheduleCopy = useMemo(() => {
    if (!hoursValid) return "Enter a whole number from 1 to 40.";
    if (parsedHours <= 3) return "Lighter weekly pace.";
    if (parsedHours <= 8) return "Steady part-time pace.";
    return "More milestones grouped into each week.";
  }, [hoursValid, parsedHours]);

  const durationCopy = useMemo(
    () => estimateDuration(request?.estimatedHours, hoursValid ? parsedHours : 5),
    [hoursValid, parsedHours, request?.estimatedHours],
  );

  const supportLabel = SUPPORT_OPTIONS.find((option) => option.value === supportLevel)?.label ?? "Standard";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {request ? (
        <motion.div
          key="roadmap-start-overlay"
          className="app-modal-overlay"
          role="presentation"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => {
            if (!isStarting) onCancel();
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
                  Add to workspace
                </h2>
                <p className="app-roadmap-start-project">{request.projectTitle}</p>
              </div>
              <button type="button" className="app-roadmap-start-close" aria-label="Close" disabled={isStarting} onClick={onCancel}>
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </header>

            <div className="app-roadmap-start-body">
              <div className="app-roadmap-start-pace">
                <div className="app-roadmap-start-pace-copy">
                  <p className="app-roadmap-start-pace-value">
                    {supportLabel}
                    <span aria-hidden="true"> · </span>
                    {hoursValid ? `${parsedHours} hrs/week` : "— hrs/week"}
                  </p>
                  <p className="app-roadmap-start-pace-meta">{durationCopy}</p>
                </div>
                <button
                  type="button"
                  className="app-roadmap-start-change"
                  aria-expanded={isEditing}
                  disabled={isStarting}
                  onClick={() => setIsEditing((current) => !current)}>
                  {isEditing ? "Done" : "Change"}
                </button>
              </div>

              {isEditing ? (
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
                      disabled={isStarting}
                      aria-invalid={!hoursValid}
                      onChange={(event) => setWeeklyHours(event.target.value)}
                    />
                    <p className={hoursValid ? "app-roadmap-start-hint" : "app-roadmap-start-hint app-roadmap-start-hint--error"}>
                      {hoursValid ? scheduleCopy : "Enter a whole number from 1 to 40."}
                    </p>
                  </div>

                  <fieldset className="app-roadmap-start-support" disabled={isStarting}>
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
              ) : (
                <p className="app-roadmap-start-note">
                  Uses your onboarding default. This project keeps its own settings after you add it.
                </p>
              )}
            </div>

            <footer className="app-roadmap-start-footer">
              <AppButton type="button" variant="secondary" size="md" disabled={isStarting} onClick={onCancel}>
                Cancel
              </AppButton>
              <AppButton
                type="button"
                variant="primary"
                size="md"
                disabled={!hoursValid || isStarting}
                onClick={() => {
                  void onStart({ weeklyHours: parsedHours, supportLevel });
                }}>
                {isStarting ? "Adding…" : "Add to workspace"}
              </AppButton>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function validPreferences(value: RoadmapPreferences | null): value is RoadmapPreferences {
  return Boolean(
    value &&
      Number.isInteger(value.weeklyHours) &&
      value.weeklyHours >= 1 &&
      value.weeklyHours <= 40 &&
      ["GUIDED", "STANDARD", "ACCELERATED"].includes(value.supportLevel),
  );
}

function estimateDuration(estimate: string | null | undefined, weeklyHours: number) {
  if (!estimate) return "Intrnd will build a weekly schedule for this project.";
  const normalized = estimate.toLowerCase();
  const values = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const average = values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
  let weeks: number | null = null;
  if (normalized.includes("semester")) weeks = (16 * 5) / weeklyHours;
  else if (normalized.includes("month") && average) weeks = (average * 4.3 * 5) / weeklyHours;
  else if (normalized.includes("week") && average) weeks = (average * 5) / weeklyHours;
  else if (normalized.includes("hour") && average) weeks = average / weeklyHours;
  if (!weeks) return `${estimate} estimated effort.`;
  const roundedWeeks = Math.max(1, Math.ceil(weeks));
  return `About ${roundedWeeks} ${roundedWeeks === 1 ? "week" : "weeks"} · ${estimate} total`;
}
