import { ArrowLeft, Brain, FileText, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AiReviewCard } from "../../components/app/AiReviewCard";

type Experience = {
  id: string;
  title: string;
  experienceType: string;
  description: string | null;
  skills: string[];
  evidenceUrl: string | null;
  outcome: string | null;
  aiReviewStatus: string;
};

type ReviewRecord = {
  id: string;
  reviewType: string;
  status: string;
  createdAt: string;
  output: {
    overallRating: number;
    resumeStrength: string;
    feedback: { strengths: string[]; weaknesses: string[]; improvements: string[]; missingProof: string[] };
    resumeBullets: string[];
    portfolioSummary: string;
    nextProjects: string[];
    skillsValidated: string[];
    skillsMissing: string[];
  } | null;
};

export default function AiReview() {
  const { experienceId } = useParams<{ experienceId: string }>();
  const navigate = useNavigate();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingBullets, setGeneratingBullets] = useState(false);
  const [bullets, setBullets] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!experienceId) return;
    setLoading(true);
    try {
      const [expRes, reviewRes] = await Promise.all([
        fetch(`/api/experiences/${experienceId}`, { credentials: "include" }),
        fetch(`/api/ai/review/experience/${experienceId}`, { credentials: "include" }),
      ]);

      if (expRes.ok) {
        const data = await expRes.json();
        setExperience(data.experience);
      }

      if (reviewRes.ok) {
        const data = await reviewRes.json();
        setReviews(data.reviews ?? []);
      }
    } catch {
      setError("Failed to load experience data.");
    } finally {
      setLoading(false);
    }
  }, [experienceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function requestReview() {
    if (!experienceId) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/ai/review/experience/${experienceId}`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate review");
      }
      const data = await res.json();
      const newReview: ReviewRecord = {
        id: data.review.id,
        reviewType: data.review.reviewType,
        status: data.review.status,
        createdAt: data.review.createdAt,
        output: data.review.output,
      };
      setReviews((prev) => [newReview, ...prev]);
      if (experience) {
        setExperience({ ...experience, aiReviewStatus: "REVIEWED" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate review.");
    } finally {
      setGenerating(false);
    }
  }

  async function requestBullets() {
    if (!experienceId) return;
    setGeneratingBullets(true);
    try {
      const res = await fetch(`/api/ai/resume-bullets/${experienceId}`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBullets(data.bullets ?? []);
    } catch {
      setError("Failed to generate resume bullets.");
    } finally {
      setGeneratingBullets(false);
    }
  }

  if (loading) {
    return (
      <div className="app-page ai-review-page">
        <div className="ai-review-page__loading">
          <Sparkles size={20} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="app-page ai-review-page">
        <p className="ai-review-page__error">Experience not found.</p>
        <button onClick={() => navigate(-1)} className="ai-review-page__back">
          <ArrowLeft size={16} /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="app-page ai-review-page">
      <button onClick={() => navigate(-1)} className="ai-review-page__back">
        <ArrowLeft size={16} /> Back
      </button>

      <header className="ai-review-page__header">
        <h1>
          <Brain size={22} /> AI Review
        </h1>
        <h2>{experience.title}</h2>
        <div className="ai-review-page__meta">
          <span className="ai-review-page__type">{experience.experienceType}</span>
          {experience.aiReviewStatus === "REVIEWED" && <span className="ai-review-page__status">Reviewed</span>}
        </div>
      </header>

      <section className="ai-review-page__details">
        <h3>Experience Details</h3>
        {experience.description && <p>{experience.description}</p>}
        {experience.skills.length > 0 && (
          <div className="ai-review-page__skills">
            {experience.skills.map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        )}
        {experience.evidenceUrl && (
          <a href={experience.evidenceUrl} target="_blank" rel="noopener noreferrer">
            View evidence
          </a>
        )}
        {experience.outcome && (
          <p>
            <strong>Outcome:</strong> {experience.outcome}
          </p>
        )}
      </section>

      {error && (
        <p className="ai-review-page__error" role="alert">
          {error}
        </p>
      )}

      <div className="ai-review-page__actions">
        <button className="ai-review-page__generate" onClick={requestReview} disabled={generating} aria-busy={generating}>
          <RefreshCw size={16} className={generating ? "spin" : ""} />
          {generating ? "Generating review..." : reviews.length > 0 ? "Get New Review" : "Get AI Review"}
        </button>
        <button className="ai-review-page__bullets-btn" onClick={requestBullets} disabled={generatingBullets} aria-busy={generatingBullets}>
          <FileText size={16} />
          {generatingBullets ? "Writing..." : "Generate Resume Bullets"}
        </button>
      </div>

      {bullets && bullets.length > 0 && (
        <section className="ai-review-page__bullets">
          <h3>Resume Bullets</h3>
          <ul>
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="ai-review-page__reviews">
          {reviews.map((review) =>
            review.output ? <AiReviewCard key={review.id} review={review.output} experienceTitle={experience.title} /> : null,
          )}
        </section>
      )}
    </div>
  );
}
