import { BarChart3, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ScoreData = {
  id: string;
  overallScore: number;
  projectQuality: number;
  skillCoverage: number;
  careerAlignment: number;
  competitive: boolean;
  weakAreas: string | null;
  nextSteps: string | null;
  createdAt: string;
};

type ScoreDetails = {
  summary: string;
  strengths: string[];
  weakAreas: string[];
  nextSteps: string[];
  competitive: boolean;
  competitiveExplanation: string;
  missingExperiences: string[];
};

export default function ExperienceScorePage() {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [details, setDetails] = useState<ScoreDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchScore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/experience-score", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 503) {
          setError("AI features are not yet configured.");
          return;
        }
        throw new Error();
      }
      const data = await res.json();
      setScore(data.score ?? null);
    } catch {
      setError("Unable to load experience score.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  async function generateScore() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/ai/experience-score", { method: "POST", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate");
      }
      const data = await res.json();
      setScore(data.score ?? null);
      setDetails(data.details ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate score.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="app-page experience-score-page">
      <header className="experience-score-page__header">
        <div className="experience-score-page__title">
          <BarChart3 size={24} />
          <h1>Experience Score</h1>
        </div>
        <p className="experience-score-page__subtitle">
          A holistic assessment of your project portfolio, skill coverage, and internship readiness.
        </p>
        <button className="experience-score-page__refresh" onClick={generateScore} disabled={generating} aria-busy={generating}>
          <RefreshCw size={16} className={generating ? "spin" : ""} />
          {generating ? "Analyzing..." : score ? "Re-analyze" : "Generate Score"}
        </button>
      </header>

      {error && (
        <p className="experience-score-page__error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div className="experience-score-page__loading">
          <Sparkles size={20} />
          <span>Loading your score...</span>
        </div>
      )}

      {!loading && !score && !error && (
        <div className="experience-score-page__empty">
          <Target size={32} />
          <h2>No experience score yet</h2>
          <p>Add experiences to your profile, then click "Generate Score" for a full AI assessment.</p>
        </div>
      )}

      {score && (
        <div className="experience-score-page__content">
          <div className="score-overview">
            <ScoreCircle value={score.overallScore} label="Overall" />
            <ScoreCircle value={score.projectQuality} label="Quality" />
            <ScoreCircle value={score.skillCoverage} label="Skills" />
            <ScoreCircle value={score.careerAlignment} label="Alignment" />
          </div>

          <div className="score-competitive">
            <TrendingUp size={20} />
            <span>{score.competitive ? "You are competitive for your target roles." : "You are not yet competitive. Keep building."}</span>
          </div>

          {details && (
            <div className="score-details">
              <section>
                <h3>Summary</h3>
                <p>{details.summary}</p>
              </section>

              {details.competitiveExplanation && (
                <section>
                  <h3>Competitiveness</h3>
                  <p>{details.competitiveExplanation}</p>
                </section>
              )}

              {details.strengths.length > 0 && (
                <section>
                  <h3>Strengths</h3>
                  <ul>
                    {details.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </section>
              )}

              {details.weakAreas.length > 0 && (
                <section>
                  <h3>Weak Areas</h3>
                  <ul>
                    {details.weakAreas.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </section>
              )}

              {details.nextSteps.length > 0 && (
                <section>
                  <h3>What to Do Next</h3>
                  <ol>
                    {details.nextSteps.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ol>
                </section>
              )}

              {details.missingExperiences.length > 0 && (
                <section>
                  <h3>Missing Experiences</h3>
                  <ul>
                    {details.missingExperiences.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {!details && score.weakAreas && (
            <div className="score-details">
              <section>
                <h3>Weak Areas</h3>
                <ul>
                  {(JSON.parse(score.weakAreas) as string[]).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </section>
              {score.nextSteps && (
                <section>
                  <h3>Next Steps</h3>
                  <ol>
                    {(JSON.parse(score.nextSteps) as string[]).map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreCircle({ value, label }: { value: number; label: string }) {
  const color =
    value >= 70
      ? "var(--color-success, #22c55e)"
      : value >= 50
        ? "var(--color-primary, #6366f1)"
        : value >= 30
          ? "var(--color-warning, #f59e0b)"
          : "var(--color-danger, #ef4444)";

  return (
    <div className="score-circle">
      <svg viewBox="0 0 36 36" className="score-circle__svg">
        <path className="score-circle__bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path
          className="score-circle__fill"
          style={{ stroke: color, strokeDasharray: `${value}, 100` }}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <span className="score-circle__value">{value}</span>
      <span className="score-circle__label">{label}</span>
    </div>
  );
}
