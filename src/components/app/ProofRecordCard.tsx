import { BadgeCheck, Copy, Link2, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { StudentApplication, resumeBulletForApplication, useAppData } from "./AppDataProvider";
import { AppButton } from "./Button";
import { SubmissionEvidenceList } from "./SubmissionEvidenceList";
import { stamp } from "../../lib/motion";

export interface ProofRecordCardProps {
  application: StudentApplication;
}

function formatDate(value?: string | null) {
  if (!value) return "Recently verified";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function ProofRecordCard({ application }: ProofRecordCardProps) {
  const { copyResumeBullet, showNotice } = useAppData();
  const reduced = useReducedMotion();
  const project = application.project;
  const verifiedAt = application.reviewedAt ?? application.updatedAt ?? application.createdAt;
  const submission = application.submissions[0];
  const skills = submission?.verifiedSkills?.slice(0, 5) ?? [];
  const reviewerName = submission?.reviewerName ?? application.reviewerName ?? "Intrnd reviewer";
  const reviewerType = submission?.reviewerType ?? application.reviewerType ?? "Project review";
  const reviewNotes = submission?.reviewNotes ?? application.reviewNotes;

  useEffect(() => {
    void fetch("/api/users/me/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "PROOF_VIEWED", projectId: project.id, applicationId: application.id }),
    });
  }, [application.id, project.id]);

  async function handleCopyBullet() {
    try {
      await navigator.clipboard.writeText(resumeBulletForApplication(application));
      void fetch("/api/users/me/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "RESUME_BULLET_COPIED", projectId: project.id, applicationId: application.id }),
      });
      showNotice("Resume bullet copied.", "success");
    } catch {
      copyResumeBullet(project);
    }
  }

  return (
    <motion.article
      className="app-proof-preview"
      initial={reduced ? false : "hidden"}
      animate="visible"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={reduced ? undefined : stamp}>
      <div className="app-proof-preview-head">
        <div>
          <span className="app-card-eyebrow">Verified completion record</span>
          <h3 style={{ marginTop: 4 }}>{project.title}</h3>
          <p style={{ marginTop: 6, fontSize: 13.5 }}>
            Verified on {formatDate(verifiedAt)} · {project.category ?? "Project"}
          </p>
        </div>
        <span className="app-proof-preview-stamp" aria-label="Verified by Intrnd">
          <BadgeCheck size={28} />
        </span>
      </div>

      <div className="app-proof-block">
        <small>Resume bullet</small>
        <p>{resumeBulletForApplication(application)}</p>
      </div>

      <div className="app-proof-block">
        <small>Reviewer</small>
        <p>
          {reviewerName} · {reviewerType}
          {reviewNotes ? ` · ${reviewNotes}` : ""}
        </p>
      </div>

      <div className="app-proof-block">
        <small>
          <Sparkles size={11} aria-hidden style={{ display: "inline", marginRight: 4, marginBottom: -1 }} />
          Skills demonstrated
        </small>
        <div className="app-proof-skills" style={{ marginTop: 4 }}>
          {skills.length === 0 ? (
            <span className="app-proof-skill">Skills confirmed in the review</span>
          ) : (
            skills.map((skill) => (
              <span key={skill} className="app-proof-skill">
                {skill}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="app-proof-block">
        <small>Portfolio summary</small>
        <p>{submission?.portfolioSummary ?? application.portfolioSummary ?? project.description}</p>
      </div>

      {submission?.deliverableUrl ? (
        <ul className="app-proof-deliverables" aria-label="Deliverable links">
          <li>
            <Link2 size={14} aria-hidden />
            <a className="app-link-quiet" href={submission.deliverableUrl} target="_blank" rel="noreferrer">
              View submitted deliverable
            </a>
          </li>
        </ul>
      ) : null}
      <SubmissionEvidenceList items={submission?.items} />

      <div className="app-proof-actions">
        <AppButton variant="primary" size="sm" onClick={handleCopyBullet} iconLeft={<Copy size={14} aria-hidden />}>
          Copy bullet
        </AppButton>
      </div>
    </motion.article>
  );
}
