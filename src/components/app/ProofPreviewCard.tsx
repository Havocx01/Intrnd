import { BadgeCheck, FileText, Link2, Lock, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { MarketplaceProject, resumeBulletForProject } from "./AppDataProvider";

export interface ProofPreviewCardProps {
  project?: MarketplaceProject;
  // Active proof stays locked until verification.
  mode?: "active" | "placeholder" | "verified";
  title?: string;
}

const PLACEHOLDER_SKILLS = ["Project scoping", "Communication", "Execution"];

export function ProofPreviewCard({ project, mode = project ? "active" : "placeholder", title }: ProofPreviewCardProps) {
  const reduced = useReducedMotion();
  const skills = project?.skills?.slice(0, 4) ?? PLACEHOLDER_SKILLS;
  const resumeBullet = project ? resumeBulletForProject(project) : null;
  const isVerified = mode === "verified";
  const isLocked = mode === "active";
  const resolvedTitle = title ?? (isVerified ? "Verified proof" : isLocked ? "Proof preview" : "Future verified record");

  useEffect(() => {
    if (!isVerified || !project) return;
    void fetch("/api/users/me/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "PROOF_VIEWED", projectId: project.id }),
    });
  }, [isVerified, project?.id]);

  return (
    <motion.section
      className="app-proof-preview"
      data-mode={mode}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.4 }}
      aria-label={isVerified ? "Verified proof" : "Proof preview"}>
      <div className="app-proof-preview-head">
        <div>
          <span className="app-card-eyebrow">{resolvedTitle}</span>
          <h3 style={{ marginTop: 4 }}>{project?.title ?? "Verified completion record"}</h3>
          <p style={{ marginTop: 6, fontSize: 13.5 }}>
            {isVerified
              ? "Private reviewed record — copy the resume bullet or use the summary in your portfolio."
              : isLocked
                ? "Unlocks after Intrnd verifies your submission. Finish every step, submit for review, then wait for verification."
                : "Add a project, finish the steps, and submit. Your verified proof will show up here."}
          </p>
        </div>
        <span className="app-proof-preview-stamp" aria-hidden>
          {isVerified ? <BadgeCheck size={26} /> : <Lock size={20} strokeWidth={2.2} />}
        </span>
      </div>

      <div className="app-proof-block">
        <small>
          <FileText size={11} aria-hidden style={{ display: "inline", marginRight: 4, marginBottom: -1 }} />
          Resume bullet
        </small>
        {mode === "placeholder" ? (
          <p>&nbsp;</p>
        ) : isLocked ? (
          <p className="app-proof-locked-copy">Available after verification</p>
        ) : (
          <p>{resumeBullet}</p>
        )}
      </div>

      <div className="app-proof-block">
        <small>
          <Sparkles size={11} aria-hidden style={{ display: "inline", marginRight: 4, marginBottom: -1 }} />
          Skills demonstrated
        </small>
        {isLocked ? (
          <p className="app-proof-locked-copy" style={{ marginTop: 4 }}>
            Listed here once your work is verified
          </p>
        ) : (
          <div className="app-proof-skills" style={{ marginTop: 4 }}>
            {skills.map((skill) => (
              <span key={skill} className="app-proof-skill">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="app-proof-block">
        <small>
          <Link2 size={11} aria-hidden style={{ display: "inline", marginRight: 4, marginBottom: -1 }} />
          Portfolio case study
        </small>
        {mode === "placeholder" ? (
          <p>&nbsp;</p>
        ) : isLocked ? (
          <p className="app-proof-locked-copy">Unlocks with your verified record</p>
        ) : (
          <p>One short page summarizing the brief, your approach, and the final deliverable — ready to link in applications.</p>
        )}
      </div>
    </motion.section>
  );
}
