import { BadgeCheck, FileCheck2, FolderPlus, Send } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { StudentApplication } from "./AppDataProvider";
import { easeOutSoft } from "../../lib/motion";

export interface ActivityTimelineProps {
  application: StudentApplication;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function ActivityTimeline({ application }: ActivityTimelineProps) {
  const reduced = useReducedMotion();
  const submission = application.submissions[0];
  const status = application.status;

  const items = [
    { label: "Project added", meta: formatDate(application.createdAt) ?? "Recently", icon: FolderPlus, state: "complete" as const },
    {
      label: "Steps in progress",
      meta: status === "ACTIVE" ? "Working through the steps" : "All steps done",
      icon: FileCheck2,
      state: status === "ACTIVE" ? ("current" as const) : ("complete" as const),
    },
    {
      label: "Submitted for review",
      meta: submission ? (formatDate(submission.createdAt) ?? "Sent") : "Not submitted yet",
      icon: Send,
      state: submission ? (status === "SUBMITTED" ? ("current" as const) : ("complete" as const)) : ("pending" as const),
    },
    {
      label: "Verified by Intrnd",
      meta:
        status === "VERIFIED"
          ? (formatDate(application.updatedAt) ?? "Verified")
          : status === "NEEDS_REVISION"
            ? "Changes requested"
            : "Waiting on review",
      icon: BadgeCheck,
      state: status === "VERIFIED" ? ("complete" as const) : status === "NEEDS_REVISION" ? ("error" as const) : ("pending" as const),
    },
  ];

  return (
    <ol className="app-timeline" aria-label="Project activity">
      {items.map((item, index) => (
        <motion.li
          key={item.label}
          className="app-timeline-item"
          data-state={item.state}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, ease: easeOutSoft, delay: reduced ? 0 : index * 0.05 }}>
          <span className="app-timeline-circle" aria-hidden>
            <item.icon size={14} />
          </span>
          <div className="app-timeline-body">
            <strong>{item.label}</strong>
            <span>{item.meta}</span>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
