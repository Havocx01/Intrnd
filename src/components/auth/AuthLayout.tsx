import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { easeOutSoft } from "../../lib/motion";

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ eyebrow, title, description, children, footer }: AuthLayoutProps) {
  const reduced = useReducedMotion();

  return (
    <section className="hp-auth-page" aria-labelledby="hp-auth-title">
      <div className="hp-auth-shell" data-variant="single">
        <motion.section
          className="hp-auth-card"
          aria-labelledby="hp-auth-title"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: easeOutSoft, delay: reduced ? 0 : 0.05 }}>
          <header className="hp-auth-card-head">
            <span className="hp-auth-eyebrow">{eyebrow}</span>
            <h1 id="hp-auth-title">{title}</h1>
            <p>{description}</p>
          </header>
          <div className="hp-auth-card-body">{children}</div>
          {footer ? <footer className="hp-auth-card-foot">{footer}</footer> : null}
        </motion.section>
      </div>
    </section>
  );
}
