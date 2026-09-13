export default function About() {
  return (
    <>
      <section className="zap-hero compact-hero">
        <div className="zap-hero-copy">
          <span className="zap-pill">About Intrnd</span>
          <h1>A cleaner bridge between learning and experience.</h1>
          <p>
            Intrnd helps students move from potential to proof by completing real, verified micro-projects for organizations that need
            useful contributions.
          </p>
        </div>
      </section>

      <section className="mission-band">
        <div>
          <span className="zap-pill">Why this exists</span>
          <h2>Students should not need experience before anyone lets them build experience.</h2>
        </div>
        <p>
          Many students need proof to earn opportunities, but need opportunities to create proof. Intrnd starts with a practical foundation:
          structured project briefs, clear scope, and records of completed work that can grow into stronger career stories.
        </p>
      </section>

      <section className="use-case-section">
        <div className="values-grid">
          <article>
            <span>01</span>
            <h3>Real work</h3>
            <p>Projects should be useful to an organization, not made-up practice.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Clear scope</h3>
            <p>Small, understandable tasks help students start without getting lost.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Portable proof</h3>
            <p>Completed work should help students explain what they did and why it mattered.</p>
          </article>
        </div>
      </section>
    </>
  );
}
