export default function OrganizationOnboarding() {
  return (
    <div className="app-page" style={{ maxWidth: 760, margin: "0 auto", padding: "72px 24px" }}>
      <section className="app-card">
        <span className="app-card-eyebrow">Beta partner intake</span>
        <h1 style={{ marginTop: 8 }}>Your organization workspace is being reviewed.</h1>
        <p style={{ marginTop: 10, color: "var(--hp-muted-strong)", maxWidth: 560 }}>
          Intrnd is reviewing partner workflows before opening full organization dashboards. For now, submit a small project brief from the
          organizations page and we will review it before it appears for students.
        </p>
        <a
          className="app-btn"
          data-variant="primary"
          data-size="sm"
          href="/for-organizations"
          style={{ marginTop: 18, width: "fit-content" }}>
          Submit a beta brief
        </a>
      </section>
    </div>
  );
}
