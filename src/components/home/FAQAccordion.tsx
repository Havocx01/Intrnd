import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { easeOutSoft, inViewOnce, revealUpSm, staggerContainer, useMotionVariants } from "../../lib/motion";

const faqs = [
  {
    q: "Is Intrnd only for students who don't have an internship yet?",
    a: "It's built for that gap, but anyone preparing for an internship, a first role, or a portfolio review can use it. The point is finishing structured projects you can explain, not gating who is allowed to try.",
  },
  {
    q: "What kind of projects are on Intrnd?",
    a: "Intrnd currently focuses on structured practice briefs you can complete independently. A project is labeled partner-backed or live external only when Intrnd has a linked partner or a recently checked source.",
  },
  {
    q: "How is a project verified?",
    a: "During the beta, an authenticated Intrnd reviewer checks the submitted evidence against the brief, confirms the demonstrated skills, and either requests revisions or verifies the record.",
  },
  {
    q: "Can I use this on my resume?",
    a: "Yes. After verification, your Intrnd account shows a reviewer-confirmed resume bullet, portfolio summary, demonstrated skills, and submitted evidence. Public proof links are not available during the beta.",
  },
  {
    q: "Are projects from real organizations?",
    a: "Most current projects are Intrnd practice briefs based on realistic workflows. Partner-backed and live external projects are labeled separately only after their source is verified.",
  },
  {
    q: "How long does a project take?",
    a: "Most starter projects are 3–10 hours of focused work, broken into checkpoints. Time estimates are listed up front so you can pick something that fits your schedule.",
  },
  {
    q: "Is Intrnd for universities or partners too?",
    a: "Yes. Universities and student organizations can route students into structured projects. Businesses and nonprofits can post small needs and get vetted student work back. Partner setup is in the For partners section.",
  },
];

export function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();
  const item = useMotionVariants(revealUpSm);
  const container = useMotionVariants(staggerContainer(0.06));

  return (
    <section className="hp-faq hp-section" id="faq" aria-label="Frequently asked questions">
      <div className="hp-container">
        <div className="hp-faq-grid">
          <SectionHeader
            kicker="FAQ"
            title="Answers before you sign up."
            description="What students, partners, and universities most often ask about Intrnd."
          />

          <motion.div className="hp-faq-list" role="list" initial="hidden" whileInView="visible" viewport={inViewOnce} variants={container}>
            {faqs.map((entry, idx) => (
              <motion.div key={entry.q} className="hp-faq-item" data-open={open === idx ? "true" : "false"} role="listitem" variants={item}>
                <FAQItem
                  index={idx}
                  question={entry.q}
                  answer={entry.a}
                  isOpen={open === idx}
                  onToggle={() => setOpen((curr) => (curr === idx ? null : idx))}
                  reduced={!!reduced}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FAQItem({
  index,
  question,
  answer,
  isOpen,
  onToggle,
  reduced,
}: {
  index: number;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  reduced: boolean;
}) {
  const triggerId = useId();
  const panelId = useId();
  return (
    <>
      <button type="button" id={triggerId} aria-expanded={isOpen} aria-controls={panelId} className="hp-faq-trigger" onClick={onToggle}>
        <span>
          <span
            style={{
              display: "inline-block",
              fontVariantNumeric: "tabular-nums",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--hp-muted)",
              marginRight: 14,
              minWidth: 28,
              letterSpacing: "0.06em",
            }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          {question}
        </span>
        <span className="hp-faq-chevron" aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            className="hp-faq-panel"
            initial={reduced ? { height: "auto" } : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: reduced ? { duration: 0 } : { duration: 0.36, ease: easeOutSoft } }}
            exit={reduced ? { height: "auto" } : { height: 0, opacity: 0, transition: { duration: 0.26, ease: easeOutSoft } }}
            style={{ overflow: "hidden" }}>
            <motion.div
              className="hp-faq-panel-inner"
              initial={reduced ? { y: 0 } : { y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: reduced ? { duration: 0 } : { duration: 0.32, ease: easeOutSoft, delay: 0.05 } }}>
              {answer}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
