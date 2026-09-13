import { ArrowRight, Building2, Handshake, Lightbulb, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

const organizationCards = [
  { title: "Post small projects", description: "Share clear, scoped work that a motivated student can complete.", icon: Lightbulb },
  {
    title: "Support emerging talent",
    description: "Help students build experience while getting useful project contributions.",
    icon: Users,
  },
  {
    title: "Fit many organization types",
    description: "Designed for campus organizations, nonprofits, professors, startups, and local businesses.",
    icon: Building2,
  },
  {
    title: "Keep expectations clear",
    description: "Define the deliverable, timeline, and review step before a student starts.",
    icon: Handshake,
  },
];

export default function ForOrganizations() {
  const [projectForm, setProjectForm] = useState({
    title: "",
    organizationName: "",
    category: "",
    estimatedHours: "",
    deliverable: "",
    description: "",
    skills: "",
  });
  const [projectMessage, setProjectMessage] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  function updateProjectField(field: keyof typeof projectForm, value: string) {
    setProjectForm((current) => ({ ...current, [field]: value }));
  }

  async function handleProjectPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProjectMessage("");
    setIsPosting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...projectForm, publish: true }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to post project.");
      }

      setProjectForm({ title: "", organizationName: "", category: "", estimatedHours: "", deliverable: "", description: "", skills: "" });
      setProjectMessage("Project brief submitted for beta review. If approved, it can be published for students.");
    } catch (error) {
      setProjectMessage(error instanceof Error ? error.message : "Unable to post project.");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <>
      <section className="zap-hero compact-hero">
        <div className="zap-hero-copy">
          <span className="zap-pill">For organizations</span>
          <h1>Post real work students can actually finish.</h1>
          <p>Intrnd is onboarding beta partners who want to turn small, useful needs into structured student experience.</p>
          <div className="hero-actions">
            <Link className="button" to="/sign-up">
              Submit a beta brief <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="zap-split organization-brief">
        <div className="project-browser">
          <div className="browser-toolbar">
            <span>Project brief</span>
            <strong>Simple scope</strong>
          </div>
          <article>
            <strong>What should a student deliver?</strong>
            <p>A short report, audit, asset, list, design draft, or recommendation.</p>
            <div>
              <span>Clear outcome</span>
              <span>Small timeline</span>
            </div>
          </article>
          <article>
            <strong>What makes it verified?</strong>
            <p>The work is tied to a real organization and has a visible completion record.</p>
            <div>
              <span>Reviewed</span>
              <span>Portfolio-ready</span>
            </div>
          </article>
        </div>
        <div>
          <span className="zap-pill">Good projects are small</span>
          <h2>Create a brief, not a full internship.</h2>
          <p>
            The best first projects are scoped tightly: one outcome, one expected deliverable, and one review point. That keeps the work
            useful for your team and approachable for a student.
          </p>
        </div>
      </section>

      <section className="product-tour-section">
        <div className="section-heading-centered">
          <span className="zap-pill">Beta partner preview</span>
          <h2>Post a small brief, review the work, verify completion.</h2>
        </div>
        <div className="workspace-mockup organization-mockup">
          <div className="mockup-sidebar">
            <strong>Intrnd</strong>
            <span className="is-active">Briefs</span>
            <span>Submissions</span>
            <span>Reviews</span>
          </div>
          <div className="mockup-main">
            <div className="mockup-topline">
              <span>Project brief draft</span>
              <strong>Small scope</strong>
            </div>
            <article>
              <h3>Landing page outline</h3>
              <p>Expected deliverable: wireframe, page sections, and homepage copy.</p>
              <div>
                <span>5-8 hours</span>
                <span>One review step</span>
                <span>Portfolio-friendly</span>
              </div>
            </article>
            <div className="mockup-progress">
              <span className="is-done">Define</span>
              <span className="is-done">Publish</span>
              <span>Review</span>
              <span>Verify</span>
            </div>
          </div>
        </div>
      </section>

      <section className="organization-post-section">
        <div>
          <span className="zap-pill">Beta intake</span>
          <h2>Submit a small brief for review.</h2>
          <p>
            This is the first working version of partner intake. Sign in as an organization account, fill out the brief, and Intrnd will
            review it before anything appears for students.
          </p>
        </div>
        <form className="organization-post-form" onSubmit={handleProjectPost}>
          <input
            placeholder="Project title"
            value={projectForm.title}
            onChange={(event) => updateProjectField("title", event.target.value)}
            required
          />
          <input
            placeholder="Organization name"
            value={projectForm.organizationName}
            onChange={(event) => updateProjectField("organizationName", event.target.value)}
          />
          <div>
            <input
              placeholder="Category"
              value={projectForm.category}
              onChange={(event) => updateProjectField("category", event.target.value)}
            />
            <input
              placeholder="Estimated hours"
              value={projectForm.estimatedHours}
              onChange={(event) => updateProjectField("estimatedHours", event.target.value)}
            />
          </div>
          <input
            placeholder="Expected deliverable"
            value={projectForm.deliverable}
            onChange={(event) => updateProjectField("deliverable", event.target.value)}
            required
          />
          <input
            placeholder="Skills, comma separated"
            value={projectForm.skills}
            onChange={(event) => updateProjectField("skills", event.target.value)}
          />
          <textarea
            placeholder="Describe the project in plain language"
            value={projectForm.description}
            onChange={(event) => updateProjectField("description", event.target.value)}
            required
          />
          <button type="submit" disabled={isPosting} aria-busy={isPosting}>
            {isPosting ? "Submitting..." : "Submit for review"}
          </button>
          {projectMessage && <p>{projectMessage}</p>}
        </form>
      </section>

      <section className="use-case-section">
        <div className="section-heading-centered">
          <span className="zap-pill">Built for flexible teams</span>
          <h2>Useful contributions without overbuilding the process.</h2>
        </div>
        <div className="feature-tile-grid">
          {organizationCards.map((card) => (
            <article key={card.title}>
              <card.icon size={24} />
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
