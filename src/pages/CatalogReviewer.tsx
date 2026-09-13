import { useEffect, useMemo, useState } from "react";
import { CatalogReviewForm, emptyCatalogReviewDraft, type CatalogReviewDraft } from "../components/admin/CatalogReviewForm";

type ReviewProject = {
  id: string; title: string; description: string; category: string | null; difficulty: string | null; estimatedHours: string | null;
  deliverable: string | null; skills: string | null; verificationMethod: string | null; provenanceStatus: string; sourceType: string; externalUrl: string | null;
  pilotCatalogStatus: string; careerMappingVersion: number; assignment: { id: string; reviewType: "DOMAIN" | "CAREER" };
  mapping: { targetRoles: Array<{ id: string; label: string }>; competencies: Array<{ id: string; label: string }>; portfolioSignals: Array<{ id: string; label: string }>; requiredTools: Array<{ id: string; label: string }>; accessRequirements: Array<{ id: string; label: string }> };
  issues: Array<{ severity: "ERROR" | "WARNING"; code: string; message: string }>;
  roadmapReview: { checkpoints: Array<{ id: string; title: string; requiredOutput: string; completionMode: string }> };
  catalogReviews: Array<{ reviewerId: string; decision: CatalogReviewDraft["decision"]; relevance: number; feasibility: number; proofValue: number; readiness: number; sourceTruth: boolean; resourceAccess: boolean; safeScope: boolean; issueCodes: string[]; notes: string; confidence: number; conflictConfirmedAt: string | null; scoreJustifications: CatalogReviewDraft["scoreJustifications"] | null }>;
};

export default function CatalogReviewer() {
  const [reviewerId, setReviewerId] = useState("");
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<CatalogReviewDraft>(emptyCatalogReviewDraft);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => projects.find((project) => project.id === selectedId) ?? projects[0] ?? null, [projects, selectedId]);

  async function load() {
    setError("");
    setAccessDenied(false);
    try {
      const response = await fetch("/api/reviewer/pilot-catalog", { credentials: "include" });
      if (response.status === 403) setAccessDenied(true);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load assigned reviews.");
      }
      setReviewerId(data.currentReviewerId ?? "");
      setProjects(data.projects ?? []);
      setSelectedId((current) => (data.projects ?? []).some((project: ReviewProject) => project.id === current) ? current : data.projects?.[0]?.id ?? "");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load assigned reviews."); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!selected) { setDraft(emptyCatalogReviewDraft()); return; }
    const review = selected.catalogReviews.find((entry) => entry.reviewerId === reviewerId);
    setDraft(review ? {
      decision: review.decision, relevance: review.relevance, feasibility: review.feasibility, proofValue: review.proofValue, readiness: review.readiness,
      sourceTruth: review.sourceTruth, resourceAccess: review.resourceAccess, safeScope: review.safeScope, issueCodes: review.issueCodes ?? [], notes: review.notes,
      confidence: review.confidence, noConflictConfirmed: Boolean(review.conflictConfirmedAt),
      scoreJustifications: { relevance: review.scoreJustifications?.relevance ?? "", feasibility: review.scoreJustifications?.feasibility ?? "", proofValue: review.scoreJustifications?.proofValue ?? "", readiness: review.scoreJustifications?.readiness ?? "" },
    } : emptyCatalogReviewDraft());
    setMessage(""); setError("");
  }, [reviewerId, selected?.id]);

  async function saveReview() {
    if (!selected) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/reviewer/pilot-catalog/${selected.id}/review`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save review.");
      await load(); setMessage("Review saved. The publishing admin can now see your decision.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save review."); }
    finally { setBusy(false); }
  }

  return (
    <section className="plain-admin">
      <main className="plain-admin-main">
        <div className="plain-admin-toolbar"><div><h1>Catalog review</h1><p>Review only the projects assigned to your qualified reviewer profile.</p></div><div className="plain-admin-toolbar-actions"><button type="button" className="plain-admin-btn" data-variant="secondary" onClick={() => void load()}>Refresh</button><button type="button" className="plain-admin-btn" data-variant="ghost" onClick={() => void fetch("/api/auth/sign-out", { method: "POST", credentials: "include" }).then(() => { window.location.href = "/sign-in"; })}>Sign out</button></div></div>
        {error && <p className="plain-admin-error" role="alert">{error}</p>}
        {message && <p className="plain-admin-success" role="status">{message}</p>}
        {!selected ? <section className="plain-admin-panel"><h2>{accessDenied ? "Reviewer access required" : "No assigned projects"}</h2><p>{accessDenied ? "Your account needs an active qualified reviewer profile before you can open assigned catalog work." : "An administrator must assign a domain or career review before it appears here."}</p></section> : <div className="plain-admin-catalog-layout">
          <section className="plain-admin-panel plain-admin-catalog-brief">
            <label className="plain-admin-field"><span>Assigned project</span><select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.assignment.reviewType} · {project.title}</option>)}</select></label>
            <div className="plain-admin-catalog-title-row"><div><h2>{selected.title}</h2><p>{selected.category ?? "Uncategorized"} · {selected.difficulty ?? "Difficulty not set"} · {selected.estimatedHours ?? "Time not set"}</p></div><span className="plain-admin-status">{selected.assignment.reviewType}</span></div>
            <p>{selected.description}</p>
            <dl className="plain-admin-catalog-facts"><div><dt>Deliverable</dt><dd>{selected.deliverable}</dd></div><div><dt>Skills</dt><dd>{selected.skills}</dd></div><div><dt>Verification</dt><dd>{selected.verificationMethod}</dd></div></dl>
            <div className="plain-admin-catalog-rationale"><h3>Career mapping · v{selected.careerMappingVersion}</h3><p><strong>Roles:</strong> {selected.mapping.targetRoles.map((entry) => entry.label).join(", ")}</p><p><strong>Competencies:</strong> {selected.mapping.competencies.map((entry) => entry.label).join(", ")}</p><p><strong>Portfolio proof:</strong> {selected.mapping.portfolioSignals.map((entry) => entry.label).join(", ")}</p><p><strong>Tools:</strong> {selected.mapping.requiredTools.map((entry) => entry.label).join(", ")}</p><p><strong>Access:</strong> {selected.mapping.accessRequirements.map((entry) => entry.label).join(", ")}</p></div>
            {selected.externalUrl ? <a href={selected.externalUrl} target="_blank" rel="noreferrer">Open original source ↗</a> : <p>No external source; review as an Intrnd practice project.</p>}
            {selected.issues.length > 0 && <ul className="plain-admin-issue-list">{selected.issues.map((issue) => <li key={`${issue.code}-${issue.message}`} data-severity={issue.severity.toLowerCase()}><strong>{issue.severity}</strong><span>{issue.message}</span></li>)}</ul>}
            <div className="plain-admin-catalog-checkpoints">{selected.roadmapReview.checkpoints.map((checkpoint, index) => <article key={checkpoint.id}><div><strong>{index + 1}. {checkpoint.title}</strong><span>{checkpoint.completionMode}</span></div><p>{checkpoint.requiredOutput}</p></article>)}</div>
          </section>
          <section className="plain-admin-panel plain-admin-catalog-review"><div className="plain-admin-panel-head"><h2>{selected.assignment.reviewType === "DOMAIN" ? "Domain review" : "Career and portfolio review"}</h2><p>Your type and expertise are attached server-side; the other review must come from a different person.</p></div><CatalogReviewForm draft={draft} onChange={setDraft} assigned busy={busy} onSave={() => void saveReview()} /></section>
        </div>}
      </main>
    </section>
  );
}
