import { ArrowRight, BadgeCheck, FileCheck2, FileText, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const studentCards = [
  {
    title: "Gain experience",
    description: "Start with small, practical projects designed for students building momentum.",
    icon: GraduationCap,
  },
  { title: "Build portfolio projects", description: "Turn completed work into examples you can explain in interviews.", icon: FileText },
  {
    title: "Earn verification",
    description: "Submit work for review so the completion record is tied to a real organization.",
    icon: BadgeCheck,
  },
  {
    title: "Create resume bullets later",
    description: "Use the project, deliverable, and review status to write sharper career stories.",
    icon: FileCheck2,
  },
];

export default function ForStudents() {
  return (
    <>
      <section className="zap-hero compact-hero">
        <div className="zap-hero-copy">
          <span className="zap-pill">For students</span>
          <h1>Turn early effort into real proof.</h1>
          <p>
            Intrnd gives students a simpler way to gain experience, complete portfolio-ready projects, earn verification, and build better
            career stories over time.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/sign-up">
              Start onboarding <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="zap-split student-path">
        <div>
          <span className="zap-pill">A clearer start</span>
          <h2>Know exactly what to do next.</h2>
          <p>
            New students should not land in an empty dashboard and wonder what the product is for. Intrnd starts by learning your school,
            interests, skills, and project preferences so the first useful step feels obvious.
          </p>
        </div>
        <div className="path-stack">
          <article>
            <strong>1</strong>
            <span>Tell Intrnd what you are studying</span>
          </article>
          <article>
            <strong>2</strong>
            <span>Choose career interests and skills</span>
          </article>
          <article>
            <strong>3</strong>
            <span>Build toward a verified project record</span>
          </article>
        </div>
      </section>

      <section className="product-tour-section">
        <div className="section-heading-centered">
          <span className="zap-pill">Student workspace preview</span>
          <h2>A simple path from project to portfolio proof.</h2>
        </div>
        <div className="workspace-mockup student-mockup">
          <div className="mockup-sidebar">
            <strong>Intrnd</strong>
            <span className="is-active">Projects</span>
            <span>Submissions</span>
            <span>Proof</span>
          </div>
          <div className="mockup-main">
            <div className="mockup-topline">
              <span>Recommended starter project</span>
              <strong>3-5 hours</strong>
            </div>
            <article>
              <h3>Audit a campus club's Instagram</h3>
              <p>Submit a one-page audit with three practical improvements.</p>
              <div>
                <span>Marketing</span>
                <span>Research</span>
                <span>Communication</span>
              </div>
            </article>
            <div className="mockup-progress">
              <span className="is-done">Apply</span>
              <span className="is-done">Submit</span>
              <span>Review</span>
              <span>Verified</span>
            </div>
          </div>
        </div>
      </section>

      <section className="use-case-section">
        <div className="section-heading-centered">
          <span className="zap-pill">What students get</span>
          <h2>Less fluff, more useful proof.</h2>
        </div>
        <div className="feature-tile-grid">
          {studentCards.map((card) => (
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
