import { motion } from "framer-motion";
import { Award, FileText, LayoutGrid, Link2, ShieldCheck, Wrench } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Badge } from "../ui/Badge";
import { easeOutSoft, inViewOnce, onceInView, revealUpSm, staggerContainer, useMotionVariants } from "../../lib/motion";

const proofPoints = [
  { icon: Award, title: "Project brief", description: "A scoped task with the deliverable, time estimate, and review criteria." },
  { icon: FileText, title: "Student submission", description: "A link, document, design, or report attached to the original brief." },
  {
    icon: LayoutGrid,
    title: "Reviewer check",
    description: "An Intrnd reviewer or project owner checks whether the work matches the brief.",
  },
  { icon: Wrench, title: "Proof page", description: "The finished record shows the work, skills, reviewer, date, and summary." },
  { icon: Link2, title: "Resume bullet", description: "Students can copy a concrete bullet and talk through the work in interviews." },
];

const stampVariant = {
  hidden: { opacity: 0, scale: 0.82, filter: "blur(6px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: easeOutSoft } },
};

const deliverables = ["Wireframe (PDF)", "Final landing page", "Reviewer notes"];

export function ProofPreview() {
  const item = useMotionVariants(revealUpSm);
  const container = useMotionVariants(staggerContainer(0.08));
  const stampVariants = useMotionVariants(stampVariant);

  return (
    <section className="hp-proof" id="proof" aria-label="Verified proof demo">
      <div className="hp-container">
        <div className="hp-proof-grid">
          <div>
            <SectionHeader
              kicker="Labeled demo"
              title="See what one finished project becomes."
              description="A project on Intrnd is not just a task list. It ends as a clear record: what you built, who reviewed it, and how to use it in applications."
            />

            <motion.ul className="hp-proof-list" initial="hidden" whileInView="visible" viewport={inViewOnce} variants={container}>
              {proofPoints.map((point) => (
                <motion.li key={point.title} variants={item}>
                  <span aria-hidden="true">
                    <point.icon size={18} />
                  </span>
                  <div>
                    <strong>{point.title}</strong>
                    <p>{point.description}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <motion.article
            className="hp-proof-record"
            initial="hidden"
            whileInView="visible"
            viewport={onceInView}
            variants={stampVariants}
            aria-label="Demo verified project record">
            <header className="hp-proof-record-head">
              <div className="hp-proof-record-head-left">
                <span className="hp-proof-record-eyebrow">Demo verified record</span>
                <strong className="hp-proof-record-title">Cafe Landing Page</strong>
              </div>
              <span className="hp-proof-record-id" aria-hidden="true">
                ID · DEMO-2638
              </span>
            </header>

            <div className="hp-proof-record-stamp">
              <motion.span
                className="hp-proof-badge-icon"
                initial={{ scale: 0.6, rotate: -20 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={onceInView}
                transition={{ duration: 0.7, ease: easeOutSoft, delay: 0.15 }}>
                <ShieldCheck size={26} />
              </motion.span>
              <motion.span
                className="hp-proof-pulse"
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={onceInView}
                transition={{ delay: 0.3, duration: 0.4 }}
              />
              <div className="hp-proof-record-stamp-text">
                <strong>Reviewed and ready to use</strong>
                <span>Intrnd beta reviewer · Apr 12, 2026</span>
              </div>
            </div>

            <section className="hp-proof-record-block">
              <span className="hp-proof-record-label">Student submission</span>
              <p>Live page mockup, homepage copy, and a short note explaining the design choices.</p>
            </section>

            <section className="hp-proof-record-block">
              <span className="hp-proof-record-label">Reviewer</span>
              <p>Intrnd beta reviewer · Checked against the brief and marked ready for resume use.</p>
            </section>

            <section className="hp-proof-record-block">
              <span className="hp-proof-record-label">Resume bullet</span>
              <p className="hp-proof-record-bullet">
                Designed and shipped a marketing landing page for a local cafe in 6 hours, wireframed three layouts, wrote homepage copy,
                and handed off the final page approved by the owner.
              </p>
            </section>

            <section className="hp-proof-record-block">
              <span className="hp-proof-record-label">Skills demonstrated</span>
              <motion.div
                className="hp-proof-record-skills"
                initial="hidden"
                whileInView="visible"
                viewport={onceInView}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } }}>
                {["Web Design", "Copywriting", "Client work"].map((skill) => (
                  <motion.span
                    key={skill}
                    variants={{
                      hidden: { opacity: 0, y: 6, scale: 0.96 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: easeOutSoft } },
                    }}>
                    <Badge tone="success">{skill}</Badge>
                  </motion.span>
                ))}
              </motion.div>
            </section>

            <section className="hp-proof-record-block">
              <span className="hp-proof-record-label">Deliverables</span>
              <ul className="hp-proof-record-deliverables">
                {deliverables.map((label) => (
                  <li key={label}>
                    <span>
                      <FileText size={14} aria-hidden="true" />
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <footer className="hp-proof-record-foot">
              <span className="hp-proof-record-foot-meta">Sample private beta record</span>
            </footer>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
