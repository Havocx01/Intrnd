import { motion } from "framer-motion";
import { BookOpenCheck, FileSignature, ShieldCheck, Sparkles } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { replayInView, revealUp, staggerContainer, useMotionVariants } from "../../lib/motion";

const outcomes = [
  {
    icon: FileSignature,
    title: "A resume bullet you can actually defend",
    description: "A specific, role-relevant line — what you built, who it was for, and what changed.",
  },
  {
    icon: BookOpenCheck,
    title: "A portfolio story",
    description: "Brief, process, deliverable, and outcome — packaged the way employers want to read it.",
  },
  {
    icon: Sparkles,
    title: "Skill evidence beyond GPA",
    description: "Real skills demonstrated through finished work, not a list copied from a syllabus.",
  },
  {
    icon: ShieldCheck,
    title: "A verified project record",
    description: "Reviewer name, date, confirmed skills, and deliverable links — use the record when describing your work.",
  },
];

export function OutcomeSection() {
  const item = useMotionVariants(revealUp);
  const container = useMotionVariants(staggerContainer(0.08));

  return (
    <section className="hp-outcomes hp-section" id="outcomes" aria-label="What you walk away with">
      <div className="hp-container">
        <SectionHeader
          kicker="What you walk away with"
          title="Four things you can actually use after one project."
          description="Intrnd is built so the work you finish becomes evidence, not just experience you hope someone notices."
          align="center"
        />

        <motion.div className="hp-outcomes-grid" initial="hidden" whileInView="visible" viewport={replayInView} variants={container}>
          {outcomes.map((outcome) => (
            <motion.article key={outcome.title} className="hp-outcome-card" variants={item}>
              <span className="hp-outcome-card-icon" aria-hidden="true">
                <outcome.icon size={20} />
              </span>
              <h3>{outcome.title}</h3>
              <p>{outcome.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
