import { ArrowRight, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { easeOutSoft, staggerContainer, useMotionVariants } from "../../lib/motion";

const heroItem = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: easeOutSoft } },
};

const previewVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.8, ease: easeOutSoft, delay: 0.18 } },
};

export function HeroSection() {
  const reduced = useReducedMotion();
  const item = useMotionVariants(heroItem);
  const preview = useMotionVariants(previewVariants);

  // Start the phrase emphasis after the headline animation settles.
  const [phraseActive, setPhraseActive] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setPhraseActive(true);
      return;
    }
    const id = window.setTimeout(() => setPhraseActive(true), 380);
    return () => window.clearTimeout(id);
  }, [reduced]);

  return (
    <section className="hp-hero">
      <div className="hp-container hp-hero-grid">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.085, 0.05)}>
          <motion.h1 variants={item}>
            <span className={`hp-hero-phrase ${phraseActive ? "is-active" : ""}`}>Build real experience</span> <br className="hp-hide-sm" />
            before your first internship.
          </motion.h1>

          <motion.p variants={item} className="hp-hero-sub">
            Intrnd helps students complete structured projects, track progress, and turn finished work into verified proof for resumes,
            portfolios, interviews, and internship applications.
          </motion.p>

          <motion.div variants={item} className="hp-hero-actions">
            <Button as="link" to="/sign-up" size="lg" iconRight={<ArrowRight size={18} className="hp-btn-arrow" />}>
              Start your first proof project
            </Button>
            <Button as="a" href="#projects" variant="secondary" size="lg">
              Browse projects
            </Button>
          </motion.div>

          <motion.div variants={item} className="hp-hero-support">
            <span className="hp-hero-support-dot" aria-hidden="true" />
            No internship required. Start with one structured project and turn it into proof.
          </motion.div>
        </motion.div>

        <motion.div
          className="hp-hero-preview"
          initial="hidden"
          animate="visible"
          variants={preview}
          whileHover={reduced ? undefined : { y: -3, transition: { duration: 0.2, ease: easeOutSoft } }}>
          <div className="hp-preview-head">
            <div className="hp-preview-head-left">
              <span className="hp-preview-head-dots" aria-hidden="true">
                <span /> <span /> <span />
              </span>
              <span>My workspace · Active project</span>
            </div>
            <Badge tone="muted">3 of 5 steps</Badge>
          </div>

          <div className="hp-preview-card">
            <div className="hp-preview-card-head">
              <div style={{ flex: 1 }}>
                <div className="hp-preview-card-title">Landing page for a local cafe</div>
                <div className="hp-preview-meta" style={{ marginTop: 8 }}>
                  <Badge tone="brand">At-home</Badge>
                  <Badge>Web · Marketing</Badge>
                  <Badge tone="muted">5–8 hrs</Badge>
                </div>
              </div>
              <span className="hp-preview-card-edited" aria-label="Last edited 2 hours ago">
                Edited 2h ago
              </span>
            </div>

            <div className="hp-preview-progress">
              <div className="hp-preview-progress-row">
                <span>Project progress</span>
                <strong>62%</strong>
              </div>
              <ProgressBar value={0.62} tone="ink" ariaLabel="Project progress" delay={1.0} />
            </div>

            <ChecklistAnimated reduced={!!reduced} />

            <motion.div
              className="hp-preview-card-cta"
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOutSoft, delay: 1.2 }}>
              <div>
                <strong>Next checkpoint</strong>
                <span>Submit deliverable for verification</span>
              </div>
              <span className="hp-preview-card-cta-btn" aria-hidden="true">
                Continue <ArrowUpRight size={14} />
              </span>
            </motion.div>
          </div>

          <motion.div
            className="hp-preview-verify"
            initial={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: easeOutSoft, delay: 1.45 }}>
            <span className="hp-preview-verify-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <div className="hp-preview-verify-text">
              <strong>Verified completion record</strong>
              <span>Resume bullet · Skill evidence · Deliverable links</span>
            </div>
            <span className="hp-preview-verify-meta">Reviewer: Local Cafe</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function ChecklistAnimated({ reduced }: { reduced: boolean }) {
  const items = [
    { label: "Read the project brief and success criteria", state: "done" },
    { label: "Draft homepage copy and section outline", state: "done" },
    { label: "Submit the deliverable for verification", state: "active" },
  ] as const;

  const item = useMotionVariants({
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: easeOutSoft } },
  });

  return (
    <motion.ul
      className="hp-preview-checklist"
      style={{ listStyle: "none", margin: 0, padding: 0 }}
      initial={reduced ? "visible" : "hidden"}
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.6 } } }}>
      {items.map((entry) => (
        <motion.li key={entry.label} className="hp-preview-check" data-state={entry.state} variants={item}>
          <span className="hp-preview-check-mark" aria-hidden="true">
            {entry.state === "done" ? (
              <Check size={12} />
            ) : (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
            )}
          </span>
          {entry.label}
        </motion.li>
      ))}
    </motion.ul>
  );
}
