import { CheckCircle2, AlertTriangle, Lightbulb, FileText } from "lucide-react";
import { RatingBadge } from "./ScoreBadge";

type ReviewOutput = {
  overallRating: number;
  resumeStrength: string;
  feedback: { strengths: string[]; weaknesses: string[]; improvements: string[]; missingProof: string[] };
  resumeBullets: string[];
  portfolioSummary: string;
  nextProjects: string[];
  skillsValidated: string[];
  skillsMissing: string[];
};

type AiReviewCardProps = { review: ReviewOutput; experienceTitle: string };

export function AiReviewCard({ review, experienceTitle }: AiReviewCardProps) {
  return (
    <div className="ai-review-card">
      <header className="ai-review-card__header">
        <h3>AI Review: {experienceTitle}</h3>
        <div className="ai-review-card__meta">
          <RatingBadge rating={review.overallRating} />
          <span className={`ai-review-strength ai-review-strength--${review.resumeStrength.toLowerCase()}`}>{review.resumeStrength}</span>
        </div>
      </header>

      <section className="ai-review-card__section">
        <h4>
          <CheckCircle2 size={16} /> Strengths
        </h4>
        <ul>
          {review.feedback.strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="ai-review-card__section">
        <h4>
          <AlertTriangle size={16} /> Weaknesses
        </h4>
        <ul>
          {review.feedback.weaknesses.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </section>

      <section className="ai-review-card__section">
        <h4>
          <Lightbulb size={16} /> Improvements
        </h4>
        <ul>
          {review.feedback.improvements.map((imp, i) => (
            <li key={i}>{imp}</li>
          ))}
        </ul>
      </section>

      {review.feedback.missingProof.length > 0 && (
        <section className="ai-review-card__section ai-review-card__section--warning">
          <h4>Missing Proof</h4>
          <ul>
            {review.feedback.missingProof.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="ai-review-card__section">
        <h4>
          <FileText size={16} /> Resume Bullets
        </h4>
        <ul className="ai-review-card__bullets">
          {review.resumeBullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>

      {review.portfolioSummary && (
        <section className="ai-review-card__section">
          <h4>Portfolio Summary</h4>
          <p className="ai-review-card__portfolio">{review.portfolioSummary}</p>
        </section>
      )}

      <section className="ai-review-card__section">
        <h4>What to Build Next</h4>
        <ul>
          {review.nextProjects.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </section>

      <footer className="ai-review-card__skills">
        {review.skillsValidated.length > 0 && (
          <div>
            <strong>Validated:</strong>
            {review.skillsValidated.map((s, i) => (
              <span key={i} className="ai-review-skill ai-review-skill--valid">
                {s}
              </span>
            ))}
          </div>
        )}
        {review.skillsMissing.length > 0 && (
          <div>
            <strong>Unproven:</strong>
            {review.skillsMissing.map((s, i) => (
              <span key={i} className="ai-review-skill ai-review-skill--missing">
                {s}
              </span>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
