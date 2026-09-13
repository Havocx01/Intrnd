import type { Transition, Variants } from "framer-motion";
import { useReducedMotion } from "framer-motion";

export const easeOutSoft: Transition["ease"] = [0.16, 1, 0.3, 1];

export const revealUp: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.65, ease: easeOutSoft } },
};

export const revealUpSm: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: easeOutSoft } },
};

export const revealInLeft: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: easeOutSoft } },
};

export const fadeIn: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5, ease: easeOutSoft } } };

// Keep the outgoing route visible during the crossfade to prevent background flashes.
export const pageFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 1, transition: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } },
};

export const stamp: Variants = {
  hidden: { opacity: 0, scale: 0.86, filter: "blur(4px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.65, ease: easeOutSoft } },
};

// Keep older imports working.
export const fadeUp = revealUp;
export const fadeUpSm = revealUpSm;

export function staggerContainer(stagger = 0.08, delayChildren = 0): Variants {
  return { hidden: {}, visible: { transition: { staggerChildren: stagger, delayChildren } } };
}

// Reset blur too, so reduced-motion users never see a stuck blurred element.
export function useMotionVariants<T extends Variants>(variants: T): T {
  const reduced = useReducedMotion();
  if (!reduced) return variants;

  const flat: Variants = {};
  for (const key of Object.keys(variants)) {
    flat[key] = { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, filter: "blur(0px)", transition: { duration: 0 } };
  }
  return flat as T;
}

// Replay section reveals, but run nested progress and chip animations only once.
export const replayInView = { once: false, amount: 0.18 } as const;
export const replayInViewEager = { once: false, amount: 0.1 } as const;
export const onceInView = replayInView;

export const inViewOnce = replayInView;
export const inViewOnceEager = replayInViewEager;
export const inViewOnceTall = { once: false, margin: "0px 0px -10% 0px" } as const;
