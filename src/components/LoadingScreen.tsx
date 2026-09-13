export type LoadingSkeletonVariant = "marketing" | "workspace" | "browse" | "projects" | "records" | "onboarding";

export interface LoadingScreenProps {
  label?: string;
  mode?: "overlay" | "inline";
  variant?: LoadingSkeletonVariant;
}

export default function LoadingScreen({ label = "Loading Intrnd", mode = "overlay", variant = "workspace" }: LoadingScreenProps) {
  return (
    <div className="intrnd-loader" data-mode={mode} role="status" aria-live="polite" aria-label={label}>
      <div className="intrnd-skeleton-page" data-variant={variant} aria-hidden="true">
        {renderSkeleton(variant)}
      </div>
    </div>
  );
}

function renderSkeleton(variant: LoadingSkeletonVariant) {
  if (variant === "onboarding") return <OnboardingSkeleton />;
  if (variant === "marketing") return <MarketingSkeleton />;
  if (variant === "browse") return <BrowseSkeleton />;
  if (variant === "projects") return <ProjectsSkeleton />;
  if (variant === "records") return <RecordsSkeleton />;
  return <WorkspaceSkeleton />;
}

function PageHead({ wide = false }: { wide?: boolean }) {
  return (
    <section className={["intrnd-skeleton-head", wide ? "intrnd-skeleton-head--wide" : ""].filter(Boolean).join(" ")}>
      <span className="intrnd-skeleton-line intrnd-skeleton-line--label" />
      <span className="intrnd-skeleton-line intrnd-skeleton-line--title" />
      <span className="intrnd-skeleton-line intrnd-skeleton-line--copy" />
    </section>
  );
}

function BrowseSkeleton() {
  return (
    <main className="intrnd-skeleton-main">
      <PageHead />
      <section className="intrnd-skeleton-toolbar">
        <span />
        <span />
        <span />
      </section>
      <section className="intrnd-skeleton-grid">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <ProjectSkeletonCard key={card} />
        ))}
      </section>
    </main>
  );
}

function WorkspaceSkeleton() {
  return (
    <main className="intrnd-skeleton-main">
      <PageHead />
      <section className="intrnd-skeleton-dashboard">
        <div className="intrnd-skeleton-dashboard-main">
          <div className="intrnd-skeleton-panel intrnd-skeleton-panel--hero">
            <span />
            <strong />
            <p />
            <p />
            <div className="intrnd-skeleton-panel-grid">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="intrnd-skeleton-grid intrnd-skeleton-grid--compact">
            {[0, 1, 2].map((card) => (
              <ProjectSkeletonCard key={card} compact />
            ))}
          </div>
        </div>
        <aside className="intrnd-skeleton-side">
          <span />
          <strong />
          <p />
          <p />
          <i />
        </aside>
      </section>
    </main>
  );
}

function ProjectsSkeleton() {
  return (
    <main className="intrnd-skeleton-main">
      <PageHead />
      <section className="intrnd-skeleton-project-workspace">
        <div className="intrnd-skeleton-panel intrnd-skeleton-panel--hero">
          <span />
          <strong />
          <p />
          <div className="intrnd-skeleton-panel-grid">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="intrnd-skeleton-project-columns">
          <div className="intrnd-skeleton-panel">
            <span />
            {[0, 1, 2, 3].map((item) => (
              <p key={item} />
            ))}
          </div>
          <div className="intrnd-skeleton-panel">
            <span />
            <strong />
            <p />
            <p />
            <em />
          </div>
        </div>
      </section>
    </main>
  );
}

function RecordsSkeleton() {
  return (
    <main className="intrnd-skeleton-main intrnd-skeleton-main--narrow">
      <PageHead />
      <section className="intrnd-skeleton-records">
        {[0, 1, 2].map((row) => (
          <article key={row}>
            <div>
              <span />
              <strong />
              <p />
            </div>
            <aside>
              <span />
              <span />
            </aside>
          </article>
        ))}
      </section>
    </main>
  );
}

function OnboardingSkeleton() {
  return (
    <main className="intrnd-skeleton-onboarding">
      <aside>
        <span />
        <strong />
        <p />
        {[0, 1, 2, 3].map((step) => (
          <i key={step} />
        ))}
      </aside>
      <section>
        <PageHead wide />
        <div className="intrnd-skeleton-choice-grid">
          {[0, 1, 2, 3, 4, 5].map((choice) => (
            <article key={choice}>
              <span />
              <strong />
              <p />
            </article>
          ))}
        </div>
        <em />
      </section>
    </main>
  );
}

function MarketingSkeleton() {
  return (
    <main className="intrnd-skeleton-marketing">
      <PageHead wide />
      <div className="intrnd-skeleton-marketing-actions">
        <span />
        <span />
      </div>
      <section className="intrnd-skeleton-marketing-band">
        <span />
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}

function ProjectSkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <article className={["intrnd-skeleton-card", compact ? "intrnd-skeleton-card--compact" : ""].filter(Boolean).join(" ")}>
      <div className="intrnd-skeleton-card-top">
        <span />
        <i />
      </div>
      <strong />
      <p />
      <p />
      <div className="intrnd-skeleton-meta">
        <span />
        <span />
        <span />
        <span />
      </div>
      <em />
    </article>
  );
}
