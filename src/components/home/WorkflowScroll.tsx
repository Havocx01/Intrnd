import type { ReactElement } from "react";
import { Briefcase, Check, CircleCheck, FileBadge, Search, ShieldCheck } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { SectionHeader } from "../ui/SectionHeader";
import { easeOutSoft, inViewOnce, revealUp } from "../../lib/motion";

type WorkflowStep = { index: string; title: string; description: string; icon: typeof Search; slide: () => ReactElement };

const steps: WorkflowStep[] = [
  {
    index: "01",
    title: "Choose a project",
    description: "Browse at-home, on-campus, or third-party projects by field, difficulty, time, and resume value.",
    icon: Search,
    slide: SlideChoose,
  },
  {
    index: "02",
    title: "Follow the brief",
    description: "See deliverables, success criteria, examples, timeline, and what proof you will earn.",
    icon: FileBadge,
    slide: SlideBrief,
  },
  {
    index: "03",
    title: "Build and submit",
    description: "Track progress, complete checkpoints, upload work, and finish the required deliverables.",
    icon: Briefcase,
    slide: SlideBuild,
  },
  {
    index: "04",
    title: "Get verified",
    description: "Receive a completion badge, skill breakdown, project proof, and validation status.",
    icon: ShieldCheck,
    slide: SlideVerify,
  },
  {
    index: "05",
    title: "Use it anywhere",
    description: "Turn the finished work into resume bullets, portfolio case studies, and interview talking points.",
    icon: CircleCheck,
    slide: SlideUse,
  },
];

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function WorkflowScroll() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const activeStepRef = useRef(0);

  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (reducedMotion) return;

    const mq = window.matchMedia("(min-width: 900px)");
    if (!mq.matches) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);

      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const section = sectionRef.current;
        const pin = pinRef.current;
        if (!section || !pin) return;

        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${pin.offsetHeight * (steps.length - 1)}`,
          pin: pin,
          pinSpacing: true,
          scrub: 0.4,
          onUpdate: (self) => {
            const next = self.progress;
            const fillEl = progressFillRef.current;
            if (fillEl) {
              fillEl.style.transform = `scaleX(${Math.min(next, 1)})`;
            }
            setProgress(next);
            const stepCount = steps.length;
            const idx = Math.min(stepCount - 1, Math.floor(next * stepCount * 0.999));
            if (idx !== activeStepRef.current) {
              activeStepRef.current = idx;
              setActiveStep(idx);
            }
          },
        });
      }, sectionRef);

      cleanup = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [reducedMotion]);

  const active = steps[activeStep];

  return (
    <section className="hp-workflow" id="workflow" aria-label="From project to proof" ref={sectionRef}>
      <div className="hp-container" style={{ paddingBlock: "0" }}>
        <div className="hp-workflow-pin" ref={pinRef}>
          <div className="hp-workflow-copy">
            <SectionHeader
              kicker="Signature workflow"
              title="From project to proof, step by step."
              description="A focused path. Pick a project, follow the brief, build the work, get it verified, and use the proof anywhere."
              animate={false}
            />

            <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`num-${activeStep}`}
                  className="hp-workflow-step-num"
                  initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.45, ease: easeOutSoft }}>
                  {active.index}
                </motion.div>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`copy-${activeStep}`}
                  initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
                  transition={{ duration: 0.5, ease: easeOutSoft }}
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ fontSize: 24 }}>{active.title}</h3>
                  <p>{active.description}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="hp-workflow-progress">
              <div className="hp-workflow-progress-bar">
                <div
                  ref={progressFillRef}
                  className="hp-workflow-progress-fill"
                  style={{ transform: `scaleX(${Math.max((activeStep + 1) / steps.length, progress)})` }}
                />
              </div>
              <div className="hp-workflow-stepdot-row" aria-hidden="true">
                {steps.map((step, idx) => (
                  <span
                    key={step.index}
                    className={["hp-workflow-stepdot", idx === activeStep ? "is-active" : "", idx < activeStep ? "is-complete" : ""]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="hp-workflow-stage">
            <div className="hp-workflow-frame" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`slide-${activeStep}`}
                  className="hp-workflow-slide is-active"
                  initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
                  transition={{ duration: 0.55, ease: easeOutSoft }}
                  style={{ position: "absolute", inset: 24 }}>
                  <active.slide />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <MobileTimeline />
      </div>
    </section>
  );
}

function MobileTimeline() {
  return (
    <div className="hp-workflow-mobile">
      {steps.map((step, idx) => (
        <motion.article
          key={step.index}
          className="hp-workflow-mobile-step"
          initial="hidden"
          whileInView="visible"
          viewport={inViewOnce}
          variants={revealUp}
          transition={{ delay: idx * 0.04 }}>
          <span className="hp-workflow-mobile-step-num">{idx + 1}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function SlideChoose() {
  return (
    <div className="hp-wfs">
      <div className="hp-wfs-head">
        <strong>Browse projects</strong>
        <span>Filter by category, time, and resume value</span>
      </div>
      <div className="hp-wfs-card">
        <div className="hp-wfs-pill-row">
          <Badge tone="brand">At-home</Badge>
          <Badge>On-campus</Badge>
          <Badge>Third-party</Badge>
          <Badge tone="muted">Web · Marketing · Data</Badge>
        </div>
        <div className="hp-wfs-pills">
          {["Cafe landing page", "Club Instagram audit", "Dataset dashboard", "Donor brief"].map((label, idx) => (
            <motion.div
              key={label}
              className="hp-wfs-mini"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: easeOutSoft, delay: 0.1 + idx * 0.06 }}>
              <Search size={14} color="var(--hp-muted)" />
              {label}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideBrief() {
  const rows = [
    { label: "Deliverable", value: "Wireframe + final page" },
    { label: "Time estimate", value: "5–8 hours" },
    { label: "Resume impact", value: "High", success: true },
    { label: "Verification", value: "Reviewer approval" },
  ];
  return (
    <div className="hp-wfs">
      <div className="hp-wfs-head">
        <strong>Project brief</strong>
        <span>Landing page for a local cafe</span>
      </div>
      <div className="hp-wfs-card">
        {rows.map((r, idx) => (
          <motion.div
            key={r.label}
            className="hp-wfs-row"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOutSoft, delay: 0.1 + idx * 0.07 }}>
            <span>{r.label}</span>
            <strong style={{ color: r.success ? "var(--hp-success)" : undefined }}>{r.value}</strong>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideBuild() {
  const tasks = [
    { label: "Read the brief", done: true },
    { label: "Draft homepage copy", done: true },
    { label: "Submit deliverable for review", done: false },
  ];
  return (
    <div className="hp-wfs">
      <div className="hp-wfs-head">
        <strong>Workspace</strong>
        <span>Track checkpoints and submit your work</span>
      </div>
      <div className="hp-wfs-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tasks.map((t, idx) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: easeOutSoft, delay: 0.1 + idx * 0.08 }}
              style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--hp-ink-soft)" }}>
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 6,
                  border: "1px solid var(--hp-border-strong)",
                  background: t.done ? "var(--hp-success-soft)" : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--hp-success)",
                }}>
                {t.done ? <Check size={11} /> : null}
              </span>
              <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--hp-muted-strong)" : "inherit" }}>
                {t.label}
              </span>
            </motion.div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <ProgressBar value={0.62} ariaLabel="Project progress" delay={0.35} />
        </div>
      </div>
    </div>
  );
}

function SlideVerify() {
  return (
    <div className="hp-wfs">
      <div className="hp-wfs-head">
        <strong>Verification</strong>
        <span>Reviewed against the brief, not auto-graded</span>
      </div>
      <div className="hp-wfs-card" style={{ alignItems: "center", textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.55, ease: easeOutSoft, delay: 0.05 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--hp-ink-soft), var(--hp-ink))",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "8px auto 6px",
            boxShadow: "0 12px 24px -10px rgba(15, 23, 42, 0.45)",
          }}>
          <ShieldCheck size={28} />
        </motion.div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--hp-ink)" }}>Verified completion</div>
        <div style={{ fontSize: 13, color: "var(--hp-muted)", marginTop: 4 }}>Reviewer: Local Cafe (third-party partner)</div>
        <motion.div
          className="hp-wfs-pill-row"
          style={{ justifyContent: "center", marginTop: 10 }}
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}>
          {["Web Design", "Copywriting", "Client work"].map((skill) => (
            <motion.span
              key={skill}
              variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOutSoft } } }}>
              <Badge tone="success">Skill: {skill}</Badge>
            </motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function SlideUse() {
  return (
    <div className="hp-wfs">
      <div className="hp-wfs-head">
        <strong>Use it anywhere</strong>
        <span>Resume, portfolio, and interview-ready</span>
      </div>
      <motion.div
        className="hp-wfs-resume"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOutSoft, delay: 0.1 }}>
        <strong>Project — Cafe Landing Page (Verified, Intrnd)</strong>
        Designed and shipped a marketing landing page for a local cafe in 6 hours. Wireframed three layouts, wrote homepage copy, and handed
        off the final page approved by the cafe owner.
        <small>Skills: Web Design · Copywriting · Client communication</small>
      </motion.div>
      <motion.div
        style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } } }}>
        {["Resume bullet", "Portfolio case study", "Interview story"].map((label) => (
          <motion.span
            key={label}
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOutSoft } } }}>
            <Badge tone="brand">{label}</Badge>
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
