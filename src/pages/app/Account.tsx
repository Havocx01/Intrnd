import { motion, useReducedMotion } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession, planLabel } from "../../lib/auth";
import { useAppData } from "../../components/app/AppDataProvider";
import { AppButton, AppLinkButton } from "../../components/app/Button";
import { ProfileSummary } from "../../components/app/ProfileSummary";
import { easeOutSoft } from "../../lib/motion";

type StudentProfilePayload = {
  school?: string | null;
  major?: string | null;
  careerInterests?: string | null;
  skillsToBuild?: string | null;
  projectPreferences?: string | null;
  timeAvailability?: string | null;
  gradYear?: number | null;
};

export default function Account() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const { user } = useAppData();
  const [profile, setProfile] = useState<StudentProfilePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        const payload = data?.user?.studentProfile ?? null;
        if (payload) {
          setProfile({
            school: payload.school ?? null,
            major: payload.major ?? null,
            careerInterests: payload.careerInterests ?? null,
            skillsToBuild: payload.skillsToBuild ?? null,
            projectPreferences: payload.projectPreferences ?? null,
            timeAvailability: payload.timeAvailability ?? null,
            gradYear: payload.gradYear ?? null,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await clearAuthSession();
    navigate("/sign-in");
  }

  if (!user) return null;

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Account</h1>
        <p>The more we know, the better the project matches.</p>
      </header>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutSoft }}
      >
        <ProfileSummary user={user} profile={profile} />
      </motion.div>

      <section className="app-card" aria-label="Account actions">
        <header className="app-card-header">
          <div className="app-card-title">
            <span className="app-card-eyebrow">Session</span>
            <h3>Account access</h3>
          </div>
          <span
            className="app-plan-pill"
            data-plan={(user.plan ?? "FREE").toUpperCase()}
          >
            {planLabel(user.plan)}
          </span>
        </header>
        <p className="app-card-note">
          Signed in as <strong>{user.email}</strong> on the{" "}
          {planLabel(user.plan)}.
        </p>
        <div className="app-page-actions" style={{ marginTop: 10 }}>
          <AppLinkButton
            to="/onboarding?edit=true"
            variant="secondary"
            size="sm"
            iconLeft={<Settings size={14} aria-hidden />}
          >
            Update preferences
          </AppLinkButton>
          <AppButton
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            iconLeft={<LogOut size={14} aria-hidden />}
          >
            Sign out
          </AppButton>
        </div>
      </section>
    </div>
  );
}
