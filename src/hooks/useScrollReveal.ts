import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const revealSelectors = [
  ".hp-hero",
  ".hp-value-strip",
  ".hp-section",
  ".hp-product",
  ".hp-workflow",
  ".hp-projects",
  ".hp-proof",
  ".hp-outcomes",
  ".hp-partners",
  ".hp-faq",
  ".hp-final",
  ".hp-value-item",
  ".hp-product-step",
  ".hp-workflow-mobile-step",
  ".hp-project-card",
  ".hp-proof-record",
  ".hp-proof-list li",
  ".hp-outcome-card",
  ".hp-partner-card",
  ".hp-faq-item",
  ".hp-final-card",
  ".zap-hero",
  ".home-section",
  ".homepage-proof-strip",
  ".proof-metric-grid article",
  ".proof-wall-container",
  ".proof-featured-card",
  ".proof-supporting-card",
  ".proof-quote-grid article",
  ".logo-band",
  ".feature-showcase",
  ".workflow-scroll-section",
  ".workflow-preview-card",
  ".workflow-step-list article",
  ".zap-split",
  ".simple-flow-list article",
  ".use-case-section",
  ".homepage-work-preview",
  ".work-preview-copy",
  ".testimonial-spotlight-section",
  ".testimonial-featured",
  ".testimonial-orbit article",
  ".testimonial-ribbon span",
  ".audience-router",
  ".pricing-note-section",
  ".social-proof-section",
  ".product-tour-section",
  ".final-cta",
  ".page-header",
  ".section",
  ".card",
  ".feature-showcase-grid article",
  ".use-case-grid article",
  ".audience-route-card",
  ".social-proof-grid article",
  ".project-browser article",
  ".student-main > section",
  ".student-panel",
  ".student-progress-grid article",
  ".student-project-list article",
  ".catalogue-card",
  ".catalogue-detail-panel",
  ".dashboard-summary-card",
  ".auth-card",
  ".onboarding-card-v2",
  ".onboarding-context",
].join(",");

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function smoothStep(edgeStart: number, edgeEnd: number, value: number) {
  const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart));
  return progress * progress * (3 - 2 * progress);
}

export function useScrollReveal() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let elements: HTMLElement[] = [];
    let animationFrame = 0;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const prepareElements = () => {
      elements = Array.from(document.querySelectorAll<HTMLElement>(revealSelectors)).filter((element) => !element.closest(".plain-admin"));

      elements.forEach((element) => {
        const parent = element.parentElement;
        const siblingRevealElements = parent ? Array.from(parent.children).filter((child) => elements.includes(child as HTMLElement)) : [];
        const siblingIndex = Math.max(siblingRevealElements.indexOf(element), 0);
        const delay = Math.min(siblingIndex, 6) * 55;

        element.style.setProperty("--reveal-delay", `${delay}ms`);
        element.classList.add("reveal-on-scroll");
        element.classList.add("scroll-fade-managed");

        if (
          element.matches(
            ".hp-hero, .hp-value-strip, .hp-section, .hp-product, .hp-workflow, .hp-projects, .hp-proof, .hp-outcomes, .hp-partners, .hp-faq, .hp-final, .homepage-proof-strip, .proof-wall-container, .feature-showcase, .workflow-scroll-section, .zap-split, .use-case-section, .homepage-work-preview, .testimonial-spotlight-section, .audience-router, .pricing-note-section, .social-proof-section, .final-cta",
          )
        ) {
          element.classList.add("reveal-section");
        }

        if (
          element.matches(
            ".hp-value-item, .hp-product-step, .hp-workflow-mobile-step, .hp-project-card, .hp-proof-record, .hp-proof-list li, .hp-outcome-card, .hp-partner-card, .hp-faq-item, .hp-final-card, .proof-metric-grid article, .proof-quote-grid article, .proof-featured-card, .proof-supporting-card, .testimonial-featured, .testimonial-orbit article, .feature-showcase-grid article, .workflow-preview-card, .workflow-step-list article, .simple-flow-list article, .use-case-grid article, .audience-route-card, .social-proof-grid article",
          )
        ) {
          element.classList.add("reveal-card");
        }
      });

      updateRevealState();
    };

    const updateRevealState = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (prefersReducedMotion) {
          elements.forEach((element) => {
            element.classList.add("is-revealed");
            element.style.setProperty("--scroll-opacity", "1");
            element.style.setProperty("--scroll-y", "0px");
            element.style.setProperty("--scroll-scale", "1");
          });
          return;
        }

        const viewportHeight = window.innerHeight;
        const enterStart = viewportHeight * 0.98;
        const enterEnd = viewportHeight * 0.68;
        const exitStart = viewportHeight * 0.02;
        const exitEnd = viewportHeight * 0.24;

        elements.forEach((element) => {
          const bounds = element.getBoundingClientRect();
          const enterOpacity = smoothStep(enterStart, enterEnd, bounds.top);
          const exitOpacity = smoothStep(exitStart, exitEnd, bounds.bottom);
          const opacity = clamp(Math.min(enterOpacity, exitOpacity));
          const isEntering = bounds.top > viewportHeight * 0.58;
          const isLeaving = bounds.bottom < viewportHeight * 0.3;
          const offset = isEntering ? (1 - opacity) * 12 : isLeaving ? (1 - opacity) * -10 : 0;
          const scale = 0.992 + opacity * 0.008;

          element.style.setProperty("--scroll-opacity", opacity.toFixed(3));
          element.style.setProperty("--scroll-y", `${offset.toFixed(2)}px`);
          element.style.setProperty("--scroll-scale", scale.toFixed(4));
          element.classList.toggle("is-revealed", opacity > 0.08);
        });
      });
    };

    window.requestAnimationFrame(prepareElements);
    window.addEventListener("scroll", updateRevealState, { passive: true });
    window.addEventListener("resize", updateRevealState);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateRevealState);
      window.removeEventListener("resize", updateRevealState);
    };
  }, [location.pathname, location.hash]);
}
