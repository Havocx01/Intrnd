import { type MouseEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  ExternalLink,
  ListChecks,
  Paperclip,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  StudentApplication,
  projectCheckpoints,
  useAppData,
} from "./AppDataProvider";
import { easeOutSoft } from "../../lib/motion";

export interface DeliverableChecklistProps {
  application: StudentApplication;
}

const checkpointFeedbackIssues = [
  ["UNCLEAR", "Unclear"],
  ["TOO_BROAD", "Too broad"],
  ["WRONG_PROJECT", "Doesn't fit this project"],
  ["TIME_WRONG", "Time estimate is off"],
  ["MISSING_RESOURCE", "Missing a resource"],
  ["OTHER", "Something else"],
] as const;

function firstOpenCheckpoint(checks: boolean[], length: number) {
  const index = Array.from({ length }, (_, itemIndex) => itemIndex).find(
    (itemIndex) => !checks[itemIndex],
  );
  return index ?? Math.max(0, length - 1);
}

function shortStopLabel(title: string) {
  const trimmed = title.trim();
  if (trimmed.length <= 22) return trimmed;
  return `${trimmed.slice(0, 20).trimEnd()}…`;
}

function lastCompletedIndex(checks: boolean[]) {
  let last = -1;
  for (let index = 0; index < checks.length; index++) {
    if (checks[index]) last = index;
  }
  return last;
}

function readableRequirementLabel(key: string) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words
    ? `${words.charAt(0).toUpperCase()}${words.slice(1)}`
    : "Project evidence";
}

export function DeliverableChecklist({ application }: DeliverableChecklistProps) {
  const { updateCheckpoint } = useAppData();
  const items = projectCheckpoints(application);
  const progressById = useMemo(
    () =>
      new Map(
        (application.checkpointProgress?.entries ?? []).map((entry) => [
          entry.checkpointId,
          entry,
        ]),
      ),
    [application.checkpointProgress],
  );
  const requirementLabelsByKey = useMemo(
    () =>
      new Map(
        (application.project.submissionRequirements?.items ?? []).map(
          (requirement) => [requirement.key, requirement.title],
        ),
      ),
    [application.project.submissionRequirements?.items],
  );
  const checks = items.map((checkpoint) =>
    Boolean(progressById.get(checkpoint.id)?.completed),
  );
  const projectId = application.project.id;
  const isVerified = application.status === "VERIFIED";
  const prefersReducedMotion = useReducedMotion();
  const [visibleIndex, setVisibleIndex] = useState(() =>
    firstOpenCheckpoint(checks, items.length),
  );
  const [guidanceExpanded, setGuidanceExpanded] = useState(true);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackState, setFeedbackState] = useState<
    "idle" | "choosing" | "sending" | "sent" | "error"
  >("idle");
  const [feedbackIssue, setFeedbackIssue] =
    useState<(typeof checkpointFeedbackIssues)[number][0]>("UNCLEAR");
  const [feedbackChoice, setFeedbackChoice] = useState<boolean | null>(null);

  useEffect(() => {
    setVisibleIndex(firstOpenCheckpoint(checks, items.length));
    setGuidanceExpanded(true);
    // Reset the route when switching projects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, items.length]);

  const safeIndex = Math.min(visibleIndex, Math.max(0, items.length - 1));
  const item = items[safeIndex];
  const isComplete = Boolean(item && progressById.get(item.id)?.completed);
  const prerequisitesComplete = Boolean(
    item?.prerequisiteCheckpointIds.every((id) => progressById.get(id)?.completed),
  );
  const furthestDone = lastCompletedIndex(checks);
  const routeProgress =
    items.length <= 1
      ? furthestDone >= 0
        ? 100
        : 0
      : furthestDone < 0
        ? 0
        : (furthestDone / (items.length - 1)) * 100;
  const doneCount = checks.filter(Boolean).length;

  useEffect(() => {
    if (!item) return;
    setNote(progressById.get(item.id)?.note ?? "");
    setFeedbackState("idle");
    setFeedbackIssue("UNCLEAR");
    setFeedbackChoice(null);
    void fetch(
      `/api/projects/${projectId}/checkpoints/${encodeURIComponent(item.id)}/view`,
      {
        method: "POST",
        credentials: "include",
      },
    );
  }, [item?.id, progressById, projectId]);

  function moveTo(index: number) {
    const nextIndex = Math.max(0, Math.min(items.length - 1, index));
    if (nextIndex === safeIndex) return;
    setGuidanceExpanded(true);
    setVisibleIndex(nextIndex);
  }

  function focusEvidenceWorkspace(
    event: MouseEvent<HTMLAnchorElement>,
  ) {
    const evidenceWorkspace = document.getElementById("project-evidence");
    if (!evidenceWorkspace) return;

    event.preventDefault();
    evidenceWorkspace.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    evidenceWorkspace.focus({ preventScroll: true });
  }

  async function toggleCurrentStep() {
    if (!item || isVerified || isSaving) return;
    setIsSaving(true);
    const succeeded = await updateCheckpoint(
      projectId,
      item.id,
      !isComplete,
      item.completionMode === "NOTE" ? note : undefined,
    );
    setIsSaving(false);
    if (succeeded && !isComplete && safeIndex < items.length - 1) {
      setGuidanceExpanded(true);
      setVisibleIndex(safeIndex + 1);
    }
  }

  async function sendFeedback(
    helpful: boolean,
    issueCode?: (typeof checkpointFeedbackIssues)[number][0],
  ) {
    if (!item || feedbackState === "sending") return;
    const previousChoice = feedbackChoice;
    setFeedbackChoice(helpful);
    setFeedbackState("sending");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/checkpoints/${encodeURIComponent(item.id)}/feedback`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            helpful,
            ...(!helpful && issueCode ? { issueCode } : {}),
          }),
        },
      );
      if (!response.ok) {
        setFeedbackChoice(previousChoice);
        setFeedbackState("error");
        return;
      }
      setFeedbackState(!helpful && !issueCode ? "choosing" : "sent");
    } catch {
      setFeedbackChoice(previousChoice);
      setFeedbackState("error");
    }
  }

  if (!item) return null;

  return (
    <section className="app-roadmap" aria-label="Personalized project roadmap">
      <div className="app-roadmap-map">
        <div className="app-roadmap-map-meta">
          <span>
            {doneCount} of {items.length} complete
          </span>
          <span>Week {item.weekNumber}</span>
        </div>

        <div
          className="app-roadmap-route"
          aria-label="Choose a checkpoint"
          style={{ ["--roadmap-stop-count" as string]: items.length }}
        >
          <div className="app-roadmap-road" aria-hidden>
            <motion.span
              className="app-roadmap-road-progress"
              animate={{ width: `${routeProgress}%` }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.4,
                ease: easeOutSoft,
              }}
            />
          </div>

          <div
            className="app-roadmap-stops"
            style={{
              gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
            }}
          >
            {items.map((checkpoint, index) => {
              const complete = Boolean(progressById.get(checkpoint.id)?.completed);
              const active = index === safeIndex;
              return (
                <button
                  type="button"
                  key={checkpoint.id}
                  className="app-roadmap-stop"
                  data-state={active ? "active" : complete ? "done" : "pending"}
                  data-complete={complete ? "true" : "false"}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Checkpoint ${index + 1}: ${checkpoint.title}. ${complete ? "Done" : "Not done yet"}`}
                  onClick={() => moveTo(index)}
                >
                  <span className="app-roadmap-stop-marker">
                    {complete ? (
                      <Check size={13} strokeWidth={2.6} aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="app-roadmap-stop-label">
                    {shortStopLabel(checkpoint.title)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="app-roadmap-mobile-step">
        <label htmlFor={`roadmap-step-${projectId}`}>Current checkpoint</label>
        <select
          id={`roadmap-step-${projectId}`}
          value={safeIndex}
          onChange={(event) => moveTo(Number(event.target.value))}
        >
          {items.map((checkpoint, index) => (
            <option key={checkpoint.id} value={index}>
              {index + 1}. {checkpoint.title}
              {progressById.get(checkpoint.id)?.completed ? " — Done" : ""}
            </option>
          ))}
        </select>
      </div>

      <div
        className="app-roadmap-stage"
        data-expanded={guidanceExpanded ? "true" : "false"}
        aria-live="polite"
      >
        <motion.div
          className="app-roadmap-track"
          initial={false}
          animate={{ x: `${safeIndex * -100}%` }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.42,
            ease: easeOutSoft,
          }}
        >
          {items.map((checkpoint, index) => {
            const complete = Boolean(progressById.get(checkpoint.id)?.completed);
            const active = index === safeIndex;
            const showObjective =
              checkpoint.objective.trim().toLocaleLowerCase() !==
              checkpoint.requiredOutput.trim().toLocaleLowerCase();
            const evidenceLabels = Array.from(
              new Set(
                checkpoint.submissionRequirementKeys.map(
                  (key) =>
                    requirementLabelsByKey.get(key) ??
                    readableRequirementLabel(key),
                ),
              ),
            );
            const hasOptionalDetails = Boolean(
              showObjective ||
                checkpoint.knownSkills.length ||
                checkpoint.skillsToPrepare.length ||
                checkpoint.resources.length ||
                evidenceLabels.length,
            );
            const status = complete
              ? "Done"
              : index === items.length - 1
                ? "Final step"
                : `Week ${checkpoint.weekNumber}`;

            return (
              <article
                key={checkpoint.id}
                className="app-roadmap-checkpoint"
                data-state={complete ? "done" : "active"}
                aria-hidden={!active}
              >
                <div className="app-roadmap-checkpoint-head">
                  <div className="app-roadmap-checkpoint-copy">
                    <p className="app-roadmap-checkpoint-status">
                      Step {index + 1} of {items.length}
                      <span aria-hidden="true"> · </span>
                      {status}
                    </p>
                    <h4>{checkpoint.title}</h4>
                    <p className="app-roadmap-checkpoint-summary">
                      {checkpoint.requiredOutput}
                    </p>
                  </div>

                  {active && !isVerified ? (
                    <div className="app-roadmap-checkpoint-actions">
                      <button
                        type="button"
                        className="app-btn app-roadmap-complete-action"
                        data-variant={complete ? "secondary" : "primary"}
                        data-size="sm"
                        aria-describedby={
                          !complete && !prerequisitesComplete
                            ? `checkpoint-action-help-${projectId}-${index}`
                            : !complete && checkpoint.completionMode === "EVIDENCE"
                              ? `checkpoint-evidence-help-${projectId}-${index}`
                              : undefined
                        }
                        disabled={
                          isSaving ||
                          (!complete && !prerequisitesComplete) ||
                          (!complete &&
                            checkpoint.completionMode === "NOTE" &&
                            note.trim().length < 20)
                        }
                        onClick={() => void toggleCurrentStep()}
                      >
                        {complete ? (
                          <span>Undo completion</span>
                        ) : (
                          <>
                            <Check size={14} aria-hidden />
                            <span>
                              {isSaving ? "Saving…" : "Mark step done"}
                            </span>
                          </>
                        )}
                      </button>
                      {!complete && !prerequisitesComplete ? (
                        <p
                          className="app-roadmap-action-help"
                          id={`checkpoint-action-help-${projectId}-${index}`}
                        >
                          Complete the previous step first.
                        </p>
                      ) : null}
                      {!complete && checkpoint.completionMode === "EVIDENCE" ? (
                        <a
                          className="app-btn app-roadmap-evidence-action"
                          data-variant="secondary"
                          data-size="sm"
                          href="#project-evidence"
                          onClick={focusEvidenceWorkspace}
                        >
                          <Paperclip size={14} aria-hidden />
                          <span>Add required evidence</span>
                        </a>
                      ) : null}
                      {!complete &&
                      prerequisitesComplete &&
                      checkpoint.completionMode === "EVIDENCE" ? (
                        <p
                          className="app-roadmap-action-help"
                          id={`checkpoint-evidence-help-${projectId}-${index}`}
                        >
                          Your saved evidence is checked when you mark this step
                          done.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {active &&
                checkpoint.completionMode === "NOTE" &&
                !complete &&
                !isVerified ? (
                  <label className="app-roadmap-note">
                    <span>Your decision, finding, or reflection</span>
                    <textarea
                      value={note}
                      minLength={20}
                      maxLength={1000}
                      rows={4}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Write at least 20 characters so this checkpoint captures your thinking."
                    />
                    <small>{note.trim().length}/1000 characters</small>
                  </label>
                ) : null}

                {active ? (
                  <button
                    type="button"
                    className="app-roadmap-guidance-toggle"
                    aria-expanded={guidanceExpanded}
                    aria-controls={`checkpoint-guidance-${projectId}-${index}`}
                    onClick={() =>
                      setGuidanceExpanded((expanded) => !expanded)
                    }
                  >
                    <span className="app-roadmap-guidance-toggle-copy">
                      <span className="app-roadmap-guidance-toggle-label">
                        {guidanceExpanded
                          ? "Hide step guidance"
                          : "Show step guidance"}
                      </span>
                      <span className="app-roadmap-guidance-toggle-hint">
                        {Math.max(
                          1,
                          Math.round(checkpoint.estimatedMinutes / 60),
                        )}
                        h estimated · actions, criteria, resources
                      </span>
                    </span>
                    <span
                      className="app-roadmap-guidance-toggle-chevron"
                      data-open={guidanceExpanded ? "true" : "false"}
                      aria-hidden
                    >
                      <ChevronDown size={16} strokeWidth={2.2} />
                    </span>
                  </button>
                ) : null}

                <AnimatePresence initial={false}>
                  {active && guidanceExpanded ? (
                    <motion.div
                        id={`checkpoint-guidance-${projectId}-${index}`}
                        className="app-roadmap-guidance"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                          prefersReducedMotion
                            ? undefined
                            : { opacity: 0, y: -4 }
                        }
                        transition={{
                          duration: prefersReducedMotion ? 0 : 0.22,
                          ease: easeOutSoft,
                        }}
                      >
                        <div className="app-roadmap-guidance-core">
                          <section className="app-roadmap-guidance-block app-roadmap-guidance-actions">
                            <h5>
                              <ListChecks size={16} strokeWidth={2.2} aria-hidden />
                              <span>Do this next</span>
                            </h5>
                            <ol>
                              {checkpoint.actions.map((action, actionIndex) => (
                                <li key={action}>
                                  <span
                                    className="app-roadmap-guidance-step"
                                    aria-hidden
                                  >
                                    {actionIndex + 1}
                                  </span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ol>
                          </section>

                          <section className="app-roadmap-guidance-completion">
                            <h5>
                              <CircleCheckBig
                                size={16}
                                strokeWidth={2.2}
                                aria-hidden
                              />
                              <span>You’re done when</span>
                            </h5>
                            <ul>
                              {checkpoint.definitionOfDone.map((criterion) => (
                                <li key={criterion}>
                                  <Check size={14} strokeWidth={2.4} aria-hidden />
                                  <span>{criterion}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        </div>

                        {hasOptionalDetails ? (
                          <details className="app-roadmap-guidance-details">
                          <summary>
                            <span className="app-roadmap-guidance-details-label">
                              More details and resources
                            </span>
                            <span
                              className="app-roadmap-guidance-details-chevron"
                              aria-hidden
                            >
                              <ChevronDown size={15} strokeWidth={2.2} />
                            </span>
                          </summary>

                          <div className="app-roadmap-guidance-details-body">
                            {showObjective ||
                            checkpoint.knownSkills.length ||
                            checkpoint.skillsToPrepare.length ? (
                              <dl className="app-roadmap-guidance-facts">
                                {showObjective ? (
                                  <div>
                                    <dt>Why it matters</dt>
                                    <dd>{checkpoint.objective}</dd>
                                  </div>
                                ) : null}
                                {checkpoint.knownSkills.length ? (
                                  <div>
                                    <dt>Skills you can use</dt>
                                    <dd>{checkpoint.knownSkills.join(", ")}</dd>
                                  </div>
                                ) : null}
                                {checkpoint.skillsToPrepare.length ? (
                                  <div>
                                    <dt>Skills to practice</dt>
                                    <dd>{checkpoint.skillsToPrepare.join(", ")}</dd>
                                  </div>
                                ) : null}
                              </dl>
                            ) : null}

                            {checkpoint.resources.length || evidenceLabels.length ? (
                              <div className="app-roadmap-guidance-support">
                                {checkpoint.resources.length ? (
                                  <section>
                                    <h5>Helpful resources</h5>
                                    <ul>
                                      {checkpoint.resources.map((resource) => (
                                        <li key={resource.url}>
                                          <a
                                            href={resource.url}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {resource.label}
                                            <ExternalLink size={12} aria-hidden />
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </section>
                                ) : null}

                                {evidenceLabels.length ? (
                                  <section>
                                    <h5>Evidence for review</h5>
                                    <ul>
                                      {evidenceLabels.map((label) => (
                                        <li key={label}>{label}</li>
                                      ))}
                                    </ul>
                                  </section>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          </details>
                        ) : null}

                        <aside
                          className="app-roadmap-feedback"
                          aria-label="Checkpoint feedback"
                          aria-busy={feedbackState === "sending"}
                        >
                          {feedbackState === "sent" ? (
                            <p className="app-roadmap-feedback-status" role="status">
                              Thanks — feedback saved.
                            </p>
                          ) : (
                            <>
                              <div className="app-roadmap-feedback-row">
                                <p className="app-roadmap-feedback-question">
                                  Was this checkpoint helpful?
                                </p>
                                <div
                                  className="app-roadmap-feedback-actions"
                                  role="group"
                                  aria-label="Rate this checkpoint"
                                >
                                  <button
                                    type="button"
                                    data-selected={
                                      feedbackChoice === true ? "true" : undefined
                                    }
                                    aria-pressed={feedbackChoice === true}
                                    disabled={feedbackState === "sending"}
                                    onClick={() => void sendFeedback(true)}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    data-selected={
                                      feedbackChoice === false ? "true" : undefined
                                    }
                                    aria-pressed={feedbackChoice === false}
                                    disabled={feedbackState === "sending"}
                                    onClick={() => void sendFeedback(false)}
                                  >
                                    Not really
                                  </button>
                                </div>
                              </div>

                              {feedbackState === "choosing" ? (
                                <div className="app-roadmap-feedback-followup">
                                  <label>
                                    <span>
                                      What could be better?{" "}
                                      <small>Optional</small>
                                    </span>
                                    <select
                                      value={feedbackIssue}
                                      onChange={(event) =>
                                        setFeedbackIssue(
                                          event.target
                                            .value as typeof feedbackIssue,
                                        )
                                      }
                                    >
                                      {checkpointFeedbackIssues.map(
                                        ([value, label]) => (
                                          <option key={value} value={value}>
                                            {label}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </label>
                                  <button
                                    type="button"
                                    className="app-btn"
                                    data-variant="secondary"
                                    data-size="sm"
                                    onClick={() =>
                                      void sendFeedback(false, feedbackIssue)
                                    }
                                  >
                                    Add detail
                                  </button>
                                </div>
                              ) : null}

                              {feedbackState === "error" ? (
                                <p
                                  className="app-roadmap-feedback-error"
                                  role="alert"
                                >
                                  Feedback could not be saved. Please try again.
                                </p>
                              ) : null}
                            </>
                          )}
                        </aside>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </motion.div>
      </div>

      <div className="app-roadmap-navigation">
        <button
          type="button"
          className="app-icon-btn"
          aria-label="Previous checkpoint"
          title="Previous checkpoint"
          disabled={safeIndex === 0}
          onClick={() => moveTo(safeIndex - 1)}
        >
          <ChevronLeft size={17} aria-hidden />
        </button>
        <span className="app-roadmap-navigation-label">
          {item.title}
        </span>
        <button
          type="button"
          className="app-icon-btn"
          aria-label="Next checkpoint"
          title="Next checkpoint"
          disabled={safeIndex === items.length - 1}
          onClick={() => moveTo(safeIndex + 1)}
        >
          <ChevronRight size={17} aria-hidden />
        </button>
      </div>
    </section>
  );
}
