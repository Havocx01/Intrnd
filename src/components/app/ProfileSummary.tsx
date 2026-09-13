import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AuthUser } from "../../lib/auth";
import { AppLinkButton } from "./Button";
import { AppProgressBar } from "./ProgressBar";

export interface ProfileSummaryProps {
  user: AuthUser;
  profile?: {
    school?: string | null;
    major?: string | null;
    careerInterests?: string | null;
    skillsToBuild?: string | null;
    projectPreferences?: string | null;
    timeAvailability?: string | null;
    gradYear?: number | null;
  } | null;
}

type Field = {
  label: string;
  value: string | null | undefined;
};

function fieldFilled(value: string | null | undefined): boolean {
  return Boolean(value && String(value).trim().length > 0);
}

function recommendationFromInterests(
  interests: string | null | undefined,
): string {
  const fallback = "web design, data, operations, and marketing";
  if (!interests) return fallback;
  return interests;
}

export function ProfileSummary({ user, profile }: ProfileSummaryProps) {
  const reduced = useReducedMotion();

  const fields: Field[] = [
    {
      label: "Name",
      value: user.name ?? null,
    },
    { label: "Email", value: user.email },
    { label: "School", value: profile?.school ?? null },
    { label: "Major or field", value: profile?.major ?? null },
    {
      label: "Graduation year",
      value: profile?.gradYear ? String(profile.gradYear) : null,
    },
    { label: "Career goal", value: profile?.careerInterests ?? null },
    {
      label: "Skills you want to build",
      value: profile?.skillsToBuild ?? null,
    },
    {
      label: "Preferred project type",
      value: profile?.projectPreferences ?? null,
    },
    { label: "Time availability", value: profile?.timeAvailability ?? null },
  ];

  const filled = fields.filter((field) => fieldFilled(field.value)).length;
  const completion = Math.round((filled / fields.length) * 100);

  return (
    <motion.section
      className="app-section"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ gap: 14 }}
    >
      <article className="app-profile-completion">
        <div className="app-profile-completion-head">
          <div>
            <h3>Profile completion</h3>
            <p style={{ marginTop: 2, fontSize: 12.5 }}>
              {filled} of {fields.length} fields filled — every field improves
              your project matches.
            </p>
          </div>
          <span className="app-profile-completion-percent">{completion}%</span>
        </div>
        <AppProgressBar
          value={completion}
          showMeta
          metaLabel="Profile strength"
          showPercent
          ariaLabel={`Profile ${completion}% complete`}
        />

        <div className="app-profile-recommendation">
          <Sparkles size={13} aria-hidden />
          <span>
            Based on your profile we'll surface projects in{" "}
            <strong>{recommendationFromInterests(profile?.careerInterests)}</strong>.
          </span>
        </div>

        <AppLinkButton
          to="/onboarding?edit=true"
          variant="primary"
          size="sm"
          iconRight={<ArrowRight size={14} aria-hidden />}
          style={{ alignSelf: "flex-start" }}
        >
          {completion < 100 ? "Complete profile" : "Update preferences"}
        </AppLinkButton>
      </article>
    </motion.section>
  );
}
