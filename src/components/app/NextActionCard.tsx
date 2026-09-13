import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass, FileSearch, Play, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useAppData } from "./AppDataProvider";
import { AppLinkButton } from "./Button";

type HeroState = "start" | "continue" | "revise" | "review" | "verified" | "next";

interface HeroContent {
  state: HeroState;
  eyebrow: string;
  icon: ReactNode;
  title: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function NextActionCard() {
  const { user, featuredApplication, verifiedApplications } = useAppData();
  const reduced = useReducedMotion();

  const firstName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  let content: HeroContent = {
    state: "start",
    eyebrow: `Welcome, ${firstName}`,
    icon: <Compass size={13} aria-hidden />,
    title: "Let's build your first proof of work.",
    detail: "Start with one structured project. Finish it, get it verified, put it on your resume.",
    primaryLabel: "Pick your first project",
    primaryHref: "/dashboard/browse",
  };

  if (featuredApplication) {
    const status = featuredApplication.status;
    const projectTitle = featuredApplication.project.title;
    if (status === "ACTIVE") {
      content = {
        state: "continue",
        eyebrow: `Welcome back, ${firstName}`,
        icon: <Play size={13} aria-hidden />,
        title: projectTitle,
        detail: "Pick up where you left off and finish the next deliverable.",
        primaryLabel: "Continue project",
        primaryHref: "/dashboard/my-projects",
        secondaryLabel: "Browse projects",
        secondaryHref: "/dashboard/browse",
      };
    } else if (status === "NEEDS_REVISION") {
      content = {
        state: "revise",
        eyebrow: "Reviewer feedback is in",
        icon: <FileSearch size={13} aria-hidden />,
        title: projectTitle,
        detail: "Your reviewer requested changes. Update your deliverable and resubmit — you're one revision away.",
        primaryLabel: "Update and resubmit",
        primaryHref: "/dashboard/my-projects",
        secondaryLabel: "Browse projects",
        secondaryHref: "/dashboard/browse",
      };
    } else if (status === "SUBMITTED") {
      content = {
        state: "review",
        eyebrow: "In review",
        icon: <FileSearch size={13} aria-hidden />,
        title: projectTitle,
        detail: "Your work is with a reviewer — typically 1–3 days. Line up your next project while you wait.",
        primaryLabel: "Check submission",
        primaryHref: "/dashboard/submissions",
        secondaryLabel: "Browse next project",
        secondaryHref: "/dashboard/browse",
      };
    } else if (status === "VERIFIED") {
      content = {
        state: "verified",
        eyebrow: "Verified work",
        icon: <ShieldCheck size={13} aria-hidden />,
        title: projectTitle,
        detail: "This one's confirmed. Copy the resume bullet and put it to work — then start the next project.",
        primaryLabel: "View your proof",
        primaryHref: "/dashboard/proof",
        secondaryLabel: "Browse next project",
        secondaryHref: "/dashboard/browse",
      };
    }
  } else if (verifiedApplications.length > 0) {
    content = {
      state: "next",
      eyebrow: `Keep going, ${firstName}`,
      icon: <Sparkles size={13} aria-hidden />,
      title: "Ready for your next project?",
      detail: `You have ${verifiedApplications.length} verified ${verifiedApplications.length === 1 ? "project" : "projects"}. Each new one adds a skill recruiters can check.`,
      primaryLabel: "Browse projects",
      primaryHref: "/dashboard/browse",
      secondaryLabel: "View your proof",
      secondaryHref: "/dashboard/proof",
    };
  }

  return (
    <motion.section
      className="app-hero"
      data-state={content.state}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Next action">
      <div className="app-hero-glow" aria-hidden />
      <div className="app-hero-body">
        <span className="app-hero-eyebrow">
          {content.icon} {content.eyebrow}
        </span>
        <h2 className="app-hero-title">{content.title}</h2>
        <p className="app-hero-detail">{content.detail}</p>
      </div>
      <div className="app-hero-cta">
        {content.secondaryLabel && content.secondaryHref ? (
          <AppLinkButton to={content.secondaryHref} variant="secondary" size="sm">
            {content.secondaryLabel}
          </AppLinkButton>
        ) : null}
        <AppLinkButton to={content.primaryHref} variant="primary" size="sm" iconRight={<ArrowRight size={14} aria-hidden />}>
          {content.primaryLabel}
        </AppLinkButton>
      </div>
    </motion.section>
  );
}
