import { motion } from "framer-motion";
import { ArrowRight, Building2, GraduationCap, Users } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { replayInView, revealUp, staggerContainer, useMotionVariants } from "../../lib/motion";

const audiences = [
  {
    icon: GraduationCap,
    eyebrow: "Universities",
    title: "Send students into structured project work",
    description:
      "Map projects to coursework outcomes. Students walk away with verified evidence beyond grades — useful for advisors, career centers, and applications.",
  },
  {
    icon: Users,
    eyebrow: "Campus orgs & nonprofits",
    title: "Post small needs, get vetted work back",
    description:
      "A landing page, a content plan, a dataset writeup. Drop a brief, get a structured deliverable back in 4–8 hours from a student who is held to a real review.",
  },
  {
    icon: Building2,
    eyebrow: "Businesses",
    title: "Run small briefs and meet future interns",
    description:
      "Source talent earlier. Watch students complete real briefs against real criteria, then offer interviews to the ones whose finished work actually impresses.",
  },
];

export function PartnerSection() {
  const item = useMotionVariants(revealUp);
  const container = useMotionVariants(staggerContainer(0.08));

  return (
    <section className="hp-partners hp-section" data-tone="surface" id="partners" aria-label="For universities and partners">
      <div className="hp-container">
        <SectionHeader
          kicker="For universities and partners"
          title="Help shape the next partner-backed projects."
          description="Intrnd currently uses structured practice briefs while beta partners are reviewed one at a time. Verified partner briefs will be labeled clearly before students begin them."
        />

        <motion.div className="hp-partners-grid" initial="hidden" whileInView="visible" viewport={replayInView} variants={container}>
          {audiences.map((aud) => (
            <motion.article key={aud.eyebrow} className="hp-partner-card" variants={item}>
              <span className="hp-partner-card-icon" aria-hidden="true">
                <aud.icon size={20} />
              </span>
              <span className="hp-partner-card-eyebrow">{aud.eyebrow}</span>
              <h3>{aud.title}</h3>
              <p>{aud.description}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          className="hp-partners-cta"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={replayInView}
          transition={{ duration: 0.5, delay: 0.1 }}>
          <div>
            <strong>Want Intrnd to source projects from your team?</strong>
            <span>We&apos;re onboarding partners during the beta. We&apos;d love to hear about the briefs you have.</span>
          </div>
          <a className="hp-partners-cta-link" href="mailto:partners@intrnd.app?subject=Partner%20with%20Intrnd" style={{ color: "white" }}>
            Get in touch <ArrowRight size={14} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
