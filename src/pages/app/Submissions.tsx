import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, ChevronRight, Clock3, Compass, ExternalLink, FileSearch, Folder, RefreshCw, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { StudentApplication, StudentSubmission, useAppData } from "../../components/app/AppDataProvider";
import { AppButton, AppLinkButton } from "../../components/app/Button";
import { EmptyState } from "../../components/app/EmptyState";
import { SubmissionEvidenceList } from "../../components/app/SubmissionEvidenceList";
import { StatusBadge, statusToneFromBackend, type StatusTone } from "../../components/app/StatusBadge";
import { easeOutSoft } from "../../lib/motion";

type SubmissionRecord = StudentSubmission & { application: StudentApplication; project: StudentApplication["project"] };

type StatusFilter = "all" | "review" | "needs-changes" | "verified";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "review", label: "In review" },
  { id: "needs-changes", label: "Needs changes" },
  { id: "verified", label: "Verified" },
];

function formatDate(value?: string | null): string {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function nextStepCopy(applicationStatus: string): string {
  if (applicationStatus === "VERIFIED") return "Open proof to copy your resume bullet";
  if (applicationStatus === "NEEDS_REVISION") return "Update your package and resubmit";
  return "Intrnd is reviewing — usually 1–3 days";
}

function nextStepTitle(applicationStatus: string): string {
  if (applicationStatus === "VERIFIED") return "Ready for your resume";
  if (applicationStatus === "NEEDS_REVISION") return "Changes requested";
  return "Waiting on review";
}

function filterBucket(status: string): Exclude<StatusFilter, "all"> {
  if (status === "VERIFIED") return "verified";
  if (status === "NEEDS_REVISION") return "needs-changes";
  return "review";
}

export default function Submissions() {
  const reduced = useReducedMotion();
  const { submissionRecords } = useAppData();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo<SubmissionRecord[]>(() => {
    return [...submissionRecords].sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }, [submissionRecords]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: sorted.length, review: 0, "needs-changes": 0, verified: 0 };
    for (const r of sorted) {
      c[filterBucket(r.application.status)]++;
    }
    return c;
  }, [sorted]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return sorted;
    return sorted.filter((r) => filterBucket(r.application.status) === statusFilter);
  }, [sorted, statusFilter]);

  return (
    <div className="app-page app-page--submissions">
      <header className="app-page-header">
        <h1>Submissions</h1>
        <p>Track every package you sent, what Intrnd decided, and the next move toward verified proof.</p>
      </header>

      {sorted.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Submit a deliverable from your project workspace. It shows up here with review status — most reviews take 1–3 days."
          actions={
            <>
              <AppLinkButton to="/dashboard/my-projects" variant="primary" size="sm" iconLeft={<Send size={14} aria-hidden />}>
                Open my workspace
              </AppLinkButton>
              <AppLinkButton to="/dashboard/browse" variant="secondary" size="sm" iconLeft={<Compass size={14} aria-hidden />}>
                Browse projects
              </AppLinkButton>
            </>
          }
          preview={
            <>
              <span className="app-empty-preview-tag">Preview</span>
              <strong>Ship a landing page a local business can use</strong>
              <p>Submitted with a working link. Intrnd reviews within 1–3 days.</p>
              <ol className="app-stepper" aria-hidden>
                {(
                  [
                    ["Submitted", "complete"],
                    ["In review", "current"],
                    ["Verified", "pending"],
                  ] as const
                ).map(([label, state], index) => (
                  <li key={label} className="app-stepper-step" data-state={state}>
                    <span className="app-stepper-circle">{index + 1}</span>
                    <span className="app-stepper-label">{label}</span>
                  </li>
                ))}
              </ol>
            </>
          }
        />
      ) : (
        <>
          <div className="app-submissions-toolbar">
            <LayoutGroup id="app-submissions-filter">
              <div className="app-filters-pills" role="tablist" aria-label="Submission status">
                {STATUS_FILTERS.map((entry) => {
                  const isActive = statusFilter === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className="app-filter-pill"
                      data-active={isActive ? "true" : "false"}
                      onClick={() => setStatusFilter(entry.id)}>
                      {isActive && !reduced ? (
                        <motion.span layoutId="app-submissions-filter-bg" className="app-filter-pill-bg" transition={{ duration: 0.32 }} />
                      ) : isActive ? (
                        <span className="app-filter-pill-bg" aria-hidden />
                      ) : null}
                      <span>{entry.label}</span>
                      <small>{counts[entry.id]}</small>
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
            <p className="app-submissions-hint">
              <Clock3 size={13} aria-hidden />
              Most reviews finish in 1–3 days
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No submissions match this filter"
              description="Try another status, or show everything you’ve sent."
              actions={
                <AppButton variant="secondary" size="sm" onClick={() => setStatusFilter("all")}>
                  Show all submissions
                </AppButton>
              }
            />
          ) : (
            <motion.section
              className="app-submission-list"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: easeOutSoft }}
              aria-label="Submission rows">
              <AnimatePresence initial={false}>
                {filtered.map((record) => (
                  <SubmissionRow
                    key={record.id}
                    record={record}
                    expanded={expandedId === record.id}
                    onToggle={() => setExpandedId((id) => (id === record.id ? null : record.id))}
                  />
                ))}
              </AnimatePresence>
            </motion.section>
          )}
        </>
      )}
    </div>
  );
}

interface SubmissionRowProps {
  record: SubmissionRecord;
  expanded: boolean;
  onToggle: () => void;
}

function SubmissionRow({ record, expanded, onToggle }: SubmissionRowProps) {
  const reduced = useReducedMotion();
  const tone = statusToneFromBackend(record.application.status);
  const bucket = filterBucket(record.application.status);
  const stepStates = (() => {
    if (record.application.status === "VERIFIED") return ["complete", "complete", "complete"] as const;
    if (record.application.status === "NEEDS_REVISION") return ["complete", "complete", "error"] as const;
    return ["complete", "current", "pending"] as const;
  })();

  return (
    <article className="app-submission-entry" data-tone={tone} data-expanded={expanded ? "true" : "false"}>
      <div
        className="app-submission-row"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={expanded}
        aria-controls={`submission-detail-${record.id}`}>
        <span className="app-submission-mark" aria-hidden data-tone={tone}>
          <SubmissionMarkIcon tone={tone} />
        </span>

        <div className="app-submission-row-body">
          <div className="app-submission-row-title">{record.project.title}</div>
          <div className="app-submission-row-meta">
            <span>Submitted {formatDate(record.createdAt)}</span>
            {record.project.organizationName ? <span>{record.project.organizationName}</span> : null}
          </div>
        </div>

        <div className="app-submission-row-next">
          <strong>{nextStepTitle(record.application.status)}</strong>
          <span>{nextStepCopy(record.application.status)}</span>
        </div>

        <StatusBadge tone={tone} label={bucket === "review" && tone === "submitted" ? "In review" : undefined} />

        <button
          type="button"
          className="app-submission-row-toggle"
          aria-label={expanded ? "Collapse details" : "Expand details"}
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}>
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            id={`submission-detail-${record.id}`}
            className="app-submission-detail"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: easeOutSoft }}
            style={{ overflow: "hidden" }}>
            <div className="app-submission-detail-inner">
              <div className="app-submission-next" data-tone={tone}>
                <div>
                  <small>Next</small>
                  <strong>{nextStepTitle(record.application.status)}</strong>
                  <p>{nextStepCopy(record.application.status)}</p>
                  {record.application.reviewNotes && record.application.status === "NEEDS_REVISION" ? (
                    <p className="app-submission-review-notes">{record.application.reviewNotes}</p>
                  ) : null}
                </div>
                {record.application.status === "VERIFIED" ? (
                  <AppLinkButton to="/dashboard/proof" variant="primary" size="sm" iconLeft={<BadgeCheck size={14} aria-hidden />}>
                    Open proof
                  </AppLinkButton>
                ) : record.application.status === "NEEDS_REVISION" ? (
                  <AppLinkButton to="/dashboard/my-projects" variant="primary" size="sm" iconLeft={<RefreshCw size={14} aria-hidden />}>
                    Fix and resubmit
                  </AppLinkButton>
                ) : null}
              </div>

              {record.notes ? (
                <div className="app-submission-note-block">
                  <small>Your note to the reviewer</small>
                  <p>{record.notes}</p>
                </div>
              ) : null}

              <SubmissionEvidenceList items={record.items} />

              <ol className="app-stepper" aria-label="Review progress">
                {(["Submitted", "In review", "Verified"] as const).map((label, index) => {
                  const state = stepStates[index] ?? "pending";
                  return (
                    <li key={label} className="app-stepper-step" data-state={state}>
                      <span className="app-stepper-circle">{index + 1}</span>
                      <span className="app-stepper-label">{state === "error" && index === 2 ? "Needs changes" : label}</span>
                    </li>
                  );
                })}
              </ol>

              <div className="app-submission-detail-actions">
                <AppLinkButton to="/dashboard/my-projects" variant="secondary" size="sm" iconLeft={<Folder size={14} aria-hidden />}>
                  Open project
                </AppLinkButton>
                {record.deliverableUrl ? (
                  <a href={record.deliverableUrl} target="_blank" rel="noreferrer" className="app-btn" data-variant="ghost" data-size="sm">
                    <ExternalLink size={14} aria-hidden />
                    <span>View deliverable</span>
                  </a>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}

function SubmissionMarkIcon({ tone }: { tone: StatusTone }) {
  if (tone === "verified") return <BadgeCheck size={15} strokeWidth={2.2} />;
  if (tone === "needs-changes") return <RefreshCw size={14} strokeWidth={2.2} />;
  return <FileSearch size={14} strokeWidth={2.2} />;
}
