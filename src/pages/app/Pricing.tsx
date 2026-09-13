import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../components/app/AppDataProvider";
import { AppButton } from "../../components/app/Button";
import { easeOutSoft } from "../../lib/motion";
import { PLANS, type PlanDefinition, type PlanId, normalizePlanId } from "../../lib/plans";

export default function Pricing() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const { user, requestPilotAccess } = useAppData();
  const currentPlan: PlanId = normalizePlanId(user?.plan);
  const [pendingPlanId, setPendingPlanId] = useState<PlanId | null>(null);

  const hasPilotAccess = currentPlan === "PRO" || currentPlan === "PRO_PLUS";

  async function handlePlanCtaClick(plan: PlanDefinition) {
    if (hasPilotAccess || plan.id === "FREE" || pendingPlanId) return;
    setPendingPlanId(plan.id);
    await requestPilotAccess(plan.id);
    setPendingPlanId(null);
  }

  return (
    <motion.div
      className="app-page app-pricing"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: easeOutSoft }}>
      <header className="app-pricing-header">
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          className="app-pricing-back"
          iconLeft={<ArrowLeft size={14} strokeWidth={2.25} aria-hidden />}
          onClick={() => navigate(-1)}>
          Back
        </AppButton>
        <div>
          <h1>Pilot access</h1>
          <p>Intrnd is not charging during the beta. Request access and an admin will review your spot.</p>
        </div>
      </header>

      <section className="app-pricing-grid" aria-label="Available plans">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === "FREE" ? !hasPilotAccess : hasPilotAccess;
          const isRecommended = Boolean(plan.recommended);
          const isPending = pendingPlanId === plan.id;

          return (
            <article
              key={plan.id}
              className="app-pricing-card"
              data-recommended={isRecommended ? "true" : undefined}
              data-current={isCurrent ? "true" : undefined}>
              <header className="app-pricing-card-top">
                <div className="app-pricing-card-status">
                  {isRecommended ? (
                    <span className="app-pricing-card-badge">Beta cohort</span>
                  ) : (
                    <span className="app-pricing-card-badge-spacer" aria-hidden />
                  )}
                  {isCurrent ? <span className="app-pricing-card-current">Current</span> : null}
                </div>
                <h2>{plan.name}</h2>
                <p className="app-pricing-card-tagline">{plan.tagline}</p>
              </header>

              <ul className="app-pricing-card-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check className="app-pricing-check" size={14} strokeWidth={2.25} aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="app-pricing-card-cta">
                {isCurrent ? (
                  <AppButton type="button" variant="secondary" size="md" disabled>
                    Current plan
                  </AppButton>
                ) : plan.id === "PRO" ? (
                  <AppButton
                    type="button"
                    variant="primary"
                    size="md"
                    className="app-pricing-upgrade"
                    onClick={() => handlePlanCtaClick(plan)}
                    disabled={pendingPlanId !== null}
                    aria-busy={isPending}
                    iconRight={<ArrowUpRight size={15} aria-hidden />}>
                    {isPending ? "Requesting..." : plan.ctaLabel}
                  </AppButton>
                ) : (
                  <AppButton type="button" variant="secondary" size="md" disabled>
                    Included
                  </AppButton>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <footer className="app-pricing-footnote">
        Pilot access is granted manually so Intrnd can keep project reviews reliable during the beta.
      </footer>
    </motion.div>
  );
}
