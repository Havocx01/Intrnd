import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Badge } from "../ui/Badge";
import { SectionHeader } from "../ui/SectionHeader";
import {
  easeOutSoft,
  onceInView,
  replayInView,
  revealUp,
  staggerContainer,
  useMotionVariants,
} from "../../lib/motion";

type ProjectCategory = "At-home" | "On-campus" | "Third-party";

type Project = {
  title: string;
  description: string;
  category: ProjectCategory;
  field: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hours: string;
  impact: number;
  skills: string[];
  verification: string;
};

const projects: Project[] = [
  {
    title: "Build a landing page for a local business",
    description: "Wireframe, copy, and a final page approved by the owner.",
    category: "Third-party",
    field: "Web · Marketing",
    difficulty: 2,
    hours: "5–8 hrs",
    impact: 0.85,
    skills: ["HTML", "Copywriting", "Client work"],
    verification: "Reviewer approval",
  },
  {
    title: "Inventory tracker for a campus organization",
    description: "Spreadsheet schema, formulas, and a usable dashboard.",
    category: "On-campus",
    field: "Operations · Data",
    difficulty: 2,
    hours: "4–6 hrs",
    impact: 0.7,
    skills: ["Spreadsheets", "Data design", "Process"],
    verification: "Org admin approval",
  },
  {
    title: "Social content plan for a student club",
    description: "Audit, content pillars, and a 4-week calendar.",
    category: "On-campus",
    field: "Marketing",
    difficulty: 1,
    hours: "3–5 hrs",
    impact: 0.6,
    skills: ["Brand voice", "Content strategy", "Calendar"],
    verification: "Faculty / Org review",
  },
  {
    title: "Public dataset dashboard",
    description: "Choose a dataset, ship a clean dashboard, write findings.",
    category: "At-home",
    field: "Data · Analytics",
    difficulty: 3,
    hours: "6–10 hrs",
    impact: 0.9,
    skills: ["SQL", "Charts", "Insight writing"],
    verification: "Submission review",
  },
  {
    title: "Automation for a nonprofit workflow",
    description: "Map a workflow, automate the repetitive part, document it.",
    category: "Third-party",
    field: "Operations",
    difficulty: 3,
    hours: "5–8 hrs",
    impact: 0.8,
    skills: ["Zapier / Make", "Process design", "Docs"],
    verification: "Nonprofit lead approval",
  },
  {
    title: "Donor brief for a community nonprofit",
    description: "Research, summarize, and produce a 2-page donor brief.",
    category: "Third-party",
    field: "Research · Writing",
    difficulty: 2,
    hours: "4–6 hrs",
    impact: 0.65,
    skills: ["Research", "Writing", "Pitching"],
    verification: "Reviewer approval",
  },
];

const categories: ("All" | ProjectCategory)[] = [
  "All",
  "At-home",
  "On-campus",
  "Third-party",
];

export function ProjectsPreview() {
  const [active, setActive] = useState<(typeof categories)[number]>("All");
  const reduced = useReducedMotion();

  const filtered = useMemo(() => {
    if (active === "All") return projects;
    return projects.filter((p) => p.category === active);
  }, [active]);

  const item = useMotionVariants(revealUp);
  const container = useMotionVariants(staggerContainer(0.07));

  return (
    <section
      className="hp-projects hp-section"
      id="projects"
      data-tone="dim"
      aria-label="Browse projects"
    >
      <div className="hp-container">
        <SectionHeader
          kicker="Projects"
          title="Real briefs students can actually finish."
          description="At-home prompts, on-campus needs, and third-party briefs from organizations. Pick one, finish it, walk away with proof."
        />

        <div className="hp-projects-toolbar" role="tablist" aria-label="Filter projects">
          <LayoutGroup id="hp-projects-pills">
            <div className="hp-projects-pills">
              {categories.map((cat) => {
                const isActive = active === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    className="hp-projects-pill"
                    role="tab"
                    aria-selected={isActive}
                    data-active={isActive ? "true" : "false"}
                    onClick={() => setActive(cat)}
                  >
                    {isActive && !reduced ? (
                      <motion.span
                        layoutId="hp-projects-pill-bg"
                        className="hp-projects-pill-bg"
                        transition={{ duration: 0.4, ease: easeOutSoft }}
                      />
                    ) : null}
                    <span style={{ position: "relative", zIndex: 1 }}>{cat}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
          <a
            href="/sign-up"
            className="hp-link-secondary"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--hp-ink-soft)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            View all <ArrowRight size={14} />
          </a>
        </div>

        <motion.div
          className="hp-projects-grid"
          initial="hidden"
          whileInView="visible"
          viewport={replayInView}
          variants={container}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((project) => (
              <motion.div
                key={project.title}
                variants={item}
                layout
                exit={
                  reduced
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        y: -8,
                        scale: 0.97,
                        transition: { duration: 0.25, ease: easeOutSoft },
                      }
                }
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

// Keep obfuscated text deterministic so repeated renders remain stable.
function obfuscateText(text: string, salt = 0): string {
  const filler = "abcdefghijklmnopqrstuvwxyz";
  let lastWasUpper = true;
  return text
    .split("")
    .map((ch, idx) => {
      if (ch === " ") {
        lastWasUpper = true;
        return " ";
      }
      if (/[^A-Za-z0-9]/.test(ch)) {
        lastWasUpper = false;
        return ch;
      }
      const offset = (idx * 7 + salt + ch.charCodeAt(0)) % filler.length;
      const letter = filler[offset];
      const result = lastWasUpper ? letter.toUpperCase() : letter;
      lastWasUpper = false;
      return result;
    })
    .join("");
}

function ProjectCard({ project }: { project: Project }) {
  const tone = project.category === "At-home" ? "brand" : "neutral";
  const reduced = useReducedMotion();
  const fakeTitle = obfuscateText(project.title, 11);
  const fakeDesc = obfuscateText(project.description, 29);
  return (
    <a
      href="/sign-up"
      className="hp-project-card"
      aria-label={`${project.category} project · sign up to view details`}
    >
      <div className="hp-project-card-row">
        <div className="hp-project-card-meta">
          <Badge tone={tone}>{project.category}</Badge>
          <Badge tone="muted">{project.field}</Badge>
        </div>
        <span className="hp-project-card-difficulty" aria-label={`Difficulty ${project.difficulty} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} data-on={n <= project.difficulty ? "true" : "false"} />
          ))}
        </span>
      </div>

      <h3 className="hp-project-card-locked-text" aria-hidden="true">
        {fakeTitle}
      </h3>
      <p
        className="hp-project-card-desc hp-project-card-locked-text"
        aria-hidden="true"
      >
        {fakeDesc}
      </p>

      <div className="hp-project-card-impact">
        <div className="hp-project-card-impact-row">
          <span className="hp-project-card-impact-label">
            Resume impact
            <span
              className="hp-tooltip"
              role="tooltip"
              aria-label="How likely this project is to translate into a resume bullet, portfolio piece, or interview talking point."
            >
              i
              <span className="hp-tooltip-bubble">
                How likely this project is to translate into a resume bullet,
                portfolio piece, or interview talking point.
              </span>
            </span>
          </span>
          <strong>{Math.round(project.impact * 100)}%</strong>
        </div>
        <div className="hp-progress" data-tone="brand" aria-hidden="true">
          {reduced ? (
            <div
              className="hp-progress-fill"
              style={{ width: `${project.impact * 100}%` }}
            />
          ) : (
            <motion.div
              className="hp-progress-fill"
              initial={{ width: "0%" }}
              whileInView={{ width: `${project.impact * 100}%` }}
              viewport={onceInView}
              transition={{ duration: 0.9, ease: easeOutSoft, delay: 0.15 }}
            />
          )}
        </div>
      </div>

      <motion.div
        className="hp-project-card-row"
        initial="hidden"
        whileInView="visible"
        viewport={onceInView}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.05, delayChildren: 0.2 },
          },
        }}
      >
        <div className="hp-project-card-skills">
          {project.skills.slice(0, 3).map((skill) => (
            <motion.span
              key={skill}
              className="hp-project-card-skill"
              variants={{
                hidden: { opacity: 0, y: 6 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.35, ease: easeOutSoft },
                },
              }}
            >
              {skill}
            </motion.span>
          ))}
        </div>
        <Badge tone="muted">{project.hours}</Badge>
      </motion.div>

      <div className="hp-project-card-footer">
        <span
          style={{
            fontSize: 12,
            color: "var(--hp-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ShieldCheck size={14} color="var(--hp-success)" />
          {project.verification}
        </span>
        <span className="hp-project-card-cta">
          <Lock size={12} aria-hidden="true" /> Sign up to view{" "}
          <ArrowRight size={14} />
        </span>
      </div>
    </a>
  );
}
