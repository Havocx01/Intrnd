import { motion } from "framer-motion";
import { ClipboardList, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { inViewOnce, revealUp, staggerContainer, useMotionVariants } from "../../lib/motion";

const items = [
  {
    icon: ClipboardList,
    title: "Structured projects, not random practice",
    description: "Every brief has clear deliverables, success criteria, and a timeline.",
  },
  {
    icon: GitBranch,
    title: "Progress tracking from brief to submission",
    description: "Checkpoints, deliverables, and submission state in one workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Verified proof you can use",
    description: "Completion records tied to the brief, the work, and a real review.",
  },
  {
    icon: Sparkles,
    title: "Built for resumes, portfolios, interviews",
    description: "Turn each finished project into bullets, case studies, and skill evidence.",
  },
];

export function ValueStrip() {
  const item = useMotionVariants(revealUp);
  const container = useMotionVariants(staggerContainer(0.08));

  return (
    <section className="hp-value-strip" aria-label="Why Intrnd">
      <div className="hp-container">
        <motion.div className="hp-value-grid" initial="hidden" whileInView="visible" viewport={inViewOnce} variants={container}>
          {items.map((entry) => (
            <motion.div key={entry.title} className="hp-value-item" variants={item}>
              <span className="hp-value-item-icon" aria-hidden="true">
                <entry.icon size={18} />
              </span>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
