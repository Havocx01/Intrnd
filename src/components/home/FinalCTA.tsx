import { ArrowRight, FileBadge, Search, ShieldCheck, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { inViewOnce, revealUp, staggerContainer, useMotionVariants } from "../../lib/motion";

const journey = [
  { icon: Search, label: "Choose" },
  { icon: FileBadge, label: "Build" },
  { icon: ShieldCheck, label: "Verify" },
  { icon: Send, label: "Use" },
];

export function FinalCTA() {
  const item = useMotionVariants(revealUp);
  const container = useMotionVariants(staggerContainer(0.08));

  return (
    <section className="hp-final" aria-label="Get started">
      <div className="hp-container">
        <motion.div className="hp-final-card" initial="hidden" whileInView="visible" viewport={inViewOnce} variants={container}>
          <motion.span variants={item} className="hp-kicker">
            Ready when you are
          </motion.span>
          <motion.h2 variants={item}>Start with one project. Finish it well. Use it in applications.</motion.h2>
          <motion.p variants={item}>
            No internship required. Pick one structured brief, submit your work, get reviewed, and walk away with a record you can explain
            to employers.
          </motion.p>

          <motion.ol variants={item} className="hp-final-journey" aria-label="The Intrnd journey">
            {journey.map((step, idx) => (
              <li key={step.label}>
                <span className="hp-final-journey-step">
                  <step.icon size={14} aria-hidden="true" />
                  {step.label}
                </span>
                {idx < journey.length - 1 ? (
                  <span className="hp-final-journey-arrow" aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                ) : null}
              </li>
            ))}
          </motion.ol>

          <motion.div variants={item} className="hp-final-actions">
            <Button as="link" to="/sign-up" size="lg" iconRight={<ArrowRight size={18} className="hp-btn-arrow" />}>
              Start your first proof project
            </Button>
            <Button as="a" href="#projects" variant="secondary" size="lg">
              Browse projects
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
