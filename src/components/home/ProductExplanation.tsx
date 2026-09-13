import { motion, useReducedMotion } from "framer-motion";
import { Check, FileText, Search, ShieldCheck } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { easeOutSoft, inViewOnce, revealUp, staggerContainer, useMotionVariants } from "../../lib/motion";

const steps = [
  {
    icon: Search,
    title: "Find a project",
    description: "Choose at-home, on-campus, or third-party projects based on skills, major, time, and goals.",
    mini: <FindMini />,
  },
  {
    icon: FileText,
    title: "Complete the work",
    description: "Each project includes a brief, deliverables, success criteria, and progress tracking.",
    mini: <BuildMini />,
  },
  {
    icon: ShieldCheck,
    title: "Turn it into proof",
    description: "Finished projects become resume bullets, case studies, skill evidence, badges, and verification.",
    mini: <ProofMini />,
  },
];

export function ProductExplanation() {
  const reduced = useReducedMotion();
  const item = useMotionVariants(revealUp);
  const container = useMotionVariants(staggerContainer(0.1));

  return (
    <section className="hp-product hp-section" data-tone="surface" id="how-it-works" aria-label="How Intrnd works">
      <div className="hp-container">
        <SectionHeader
          kicker="How it works"
          title="One clear path from project to proof."
          description="No clutter. No fluff. Three steps that turn a brief into something a student can actually show."
          align="center"
        />

        <motion.div className="hp-product-grid" initial="hidden" whileInView="visible" viewport={inViewOnce} variants={container}>
          <Connector reduced={!!reduced} />
          {steps.map((step, index) => (
            <motion.article key={step.title} className="hp-product-step" variants={item}>
              <div className="hp-product-step-num">
                <strong>{index + 1}</strong>
                <step.icon size={16} aria-hidden="true" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              {step.mini}
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Connector({ reduced }: { reduced: boolean }) {
  return (
    <div className="hp-product-connector" aria-hidden="true">
      <svg viewBox="0 0 1000 4" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M0 2 L1000 2"
          initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0.3 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={inViewOnce}
          transition={{
            pathLength: { duration: 1.1, ease: easeOutSoft, delay: 0.2 },
            opacity: { duration: 0.5, ease: easeOutSoft, delay: 0.2 },
          }}
        />
      </svg>
    </div>
  );
}

function FindMini() {
  return (
    <div className="hp-product-mini" aria-hidden="true">
      <div className="hp-product-mini-row">
        <span className="hp-product-mini-pill" data-tone="brand">
          At-home
        </span>
        <span className="hp-product-mini-pill">On-campus</span>
        <span className="hp-product-mini-pill">Third-party</span>
      </div>
      <div className="hp-product-mini-row" style={{ color: "#5b6477" }}>
        <span style={{ fontSize: 12 }}>3 filters · 28 briefs match</span>
      </div>
    </div>
  );
}

function BuildMini() {
  return (
    <div className="hp-product-mini" aria-hidden="true">
      {["Read the brief", "Build the deliverable", "Submit for review"].map((label, idx) => (
        <div key={label} className="hp-product-mini-row">
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 5,
              border: "1px solid var(--hp-border-strong)",
              background: idx < 2 ? "var(--hp-success-soft)" : "transparent",
              color: "var(--hp-success)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            {idx < 2 ? <Check size={11} /> : null}
          </span>
          <span style={{ fontSize: 13 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ProofMini() {
  return (
    <div className="hp-product-mini" aria-hidden="true">
      <div className="hp-product-mini-row">
        <ShieldCheck size={14} color="var(--hp-success)" style={{ marginRight: 2 }} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Verified proof</span>
      </div>
      <div style={{ fontFamily: 'ui-serif, Georgia, "Times New Roman", serif', fontSize: 13, color: "var(--hp-ink)", lineHeight: 1.5 }}>
        "Built a landing page for a local cafe — wireframe, copy, and final page handed off in 6 hours."
      </div>
    </div>
  );
}
