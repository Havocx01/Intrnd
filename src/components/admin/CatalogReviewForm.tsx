export type CatalogReviewDecision = "APPROVE" | "CHANGES_REQUESTED" | "REJECT";
export type CatalogReviewScoreKey = "relevance" | "feasibility" | "proofValue" | "readiness";
export type CatalogReviewDraft = {
  decision: CatalogReviewDecision;
  relevance: number;
  feasibility: number;
  proofValue: number;
  readiness: number;
  sourceTruth: boolean;
  resourceAccess: boolean;
  safeScope: boolean;
  issueCodes: string[];
  notes: string;
  confidence: number;
  noConflictConfirmed: boolean;
  scoreJustifications: Record<CatalogReviewScoreKey, string>;
};

export const catalogReviewScoreKeys: CatalogReviewScoreKey[] = ["relevance", "feasibility", "proofValue", "readiness"];

const issueOptions = [
  ["EXTERNAL_PARTNER_REQUIRED", "Needs a confirmed partner"],
  ["PAID_TOOL_REQUIRED", "Paid tool access"],
  ["HARDWARE_REQUIRED", "Hardware access"],
  ["LONG_DURATION", "Scope is too long"],
  ["SENSITIVE_DOMAIN", "Sensitive subject matter"],
  ["RESOURCE_ACCESS_CHECK", "Resources need checking"],
  ["SOURCE_CONTEXT_CHECK", "Source context needs checking"],
  ["OTHER", "Another blocking issue"],
] as const;

export function emptyCatalogReviewDraft(): CatalogReviewDraft {
  return {
    decision: "CHANGES_REQUESTED",
    relevance: 0,
    feasibility: 0,
    proofValue: 0,
    readiness: 0,
    sourceTruth: false,
    resourceAccess: false,
    safeScope: false,
    issueCodes: [],
    notes: "",
    confidence: 0,
    noConflictConfirmed: false,
    scoreJustifications: { relevance: "", feasibility: "", proofValue: "", readiness: "" },
  };
}

export function canSubmitCatalogReview(draft: CatalogReviewDraft, assigned: boolean) {
  return (
    assigned &&
    catalogReviewScoreKeys.every((key) => draft[key] >= 1) &&
    draft.confidence >= 1 &&
    draft.noConflictConfirmed &&
    catalogReviewScoreKeys.every((key) => draft[key] >= 4 || draft.scoreJustifications[key].trim().length >= 20) &&
    draft.notes.trim().length >= 30 &&
    (draft.decision !== "APPROVE" ||
      (catalogReviewScoreKeys.every((key) => draft[key] >= 4) &&
        draft.confidence >= 4 &&
        draft.sourceTruth &&
        draft.resourceAccess &&
        draft.safeScope &&
        draft.issueCodes.length === 0))
  );
}

export function CatalogReviewForm({
  draft,
  onChange,
  assigned,
  busy,
  onSave,
}: {
  draft: CatalogReviewDraft;
  onChange: (draft: CatalogReviewDraft) => void;
  assigned: boolean;
  busy: boolean;
  onSave: () => void;
}) {
  const label = (value: string) =>
    value
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase());
  return (
    <>
      <div className="plain-admin-form-grid">
        {catalogReviewScoreKeys.map((key) => (
          <div key={key} className="plain-admin-field">
            <label>
              <span>{label(key)}</span>
              <select value={draft[key]} onChange={(event) => onChange({ ...draft, [key]: Number(event.target.value) })}>
                <option value={0} disabled>
                  Choose a score
                </option>
                {[1, 2, 3, 4, 5].map((score) => (
                  <option key={score} value={score}>
                    {score} — {score >= 4 ? "pilot standard" : score === 3 ? "needs work" : "not viable"}
                  </option>
                ))}
              </select>
            </label>
            {draft[key] > 0 && draft[key] < 4 && (
              <label>
                <span>Why this score needs work</span>
                <textarea
                  minLength={20}
                  maxLength={500}
                  value={draft.scoreJustifications[key]}
                  onChange={(event) =>
                    onChange({ ...draft, scoreJustifications: { ...draft.scoreJustifications, [key]: event.target.value } })
                  }
                  placeholder="Explain the evidence and what must change."
                />
              </label>
            )}
          </div>
        ))}
      </div>
      <label className="plain-admin-field">
        <span>Review confidence</span>
        <select value={draft.confidence} onChange={(event) => onChange({ ...draft, confidence: Number(event.target.value) })}>
          <option value={0} disabled>
            Choose confidence
          </option>
          {[1, 2, 3, 4, 5].map((score) => (
            <option key={score} value={score}>
              {score} — {score >= 4 ? "confident" : score === 3 ? "moderate" : "low"}
            </option>
          ))}
        </select>
        <small>Approval requires confidence of 4 or 5.</small>
      </label>
      <fieldset className="plain-admin-checklist">
        <legend>Required confirmations</legend>
        {(
          [
            ["sourceTruth", "The source and provenance claims are accurate"],
            ["resourceAccess", "Students can access the required tools and resources"],
            ["safeScope", "The scope is safe, bounded, and reviewable"],
          ] as const
        ).map(([key, text]) => (
          <label key={key}>
            <input type="checkbox" checked={draft[key]} onChange={(event) => onChange({ ...draft, [key]: event.target.checked })} />
            <span>{text}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="plain-admin-checklist plain-admin-checklist--issues">
        <legend>Unresolved issues</legend>
        {issueOptions.map(([code, text]) => (
          <label key={code}>
            <input
              type="checkbox"
              checked={draft.issueCodes.includes(code)}
              onChange={(event) =>
                onChange({
                  ...draft,
                  issueCodes: event.target.checked ? [...draft.issueCodes, code] : draft.issueCodes.filter((entry) => entry !== code),
                })
              }
            />
            <span>{text}</span>
          </label>
        ))}
      </fieldset>
      <label className="plain-admin-field">
        <span>Decision</span>
        <select value={draft.decision} onChange={(event) => onChange({ ...draft, decision: event.target.value as CatalogReviewDecision })}>
          <option value="CHANGES_REQUESTED">Changes requested</option>
          <option value="APPROVE">Approve for pilot</option>
          <option value="REJECT">Reject and hold</option>
        </select>
      </label>
      <label className="plain-admin-field">
        <span>Evidence-based review note</span>
        <textarea
          value={draft.notes}
          minLength={30}
          maxLength={2000}
          placeholder="Name the evidence you checked, what is viable, and what must change."
          onChange={(event) => onChange({ ...draft, notes: event.target.value })}
        />
        <small>{draft.notes.trim().length} / 2,000 characters · minimum 30</small>
      </label>
      <label className="plain-admin-checklist">
        <input
          type="checkbox"
          checked={draft.noConflictConfirmed}
          onChange={(event) => onChange({ ...draft, noConflictConfirmed: event.target.checked })}
        />
        <span>I confirm that I have no undisclosed authorship, financial, personal, or organizational conflict with this project.</span>
      </label>
      <button
        type="button"
        className="plain-admin-btn"
        data-variant="primary"
        disabled={busy || !canSubmitCatalogReview(draft, assigned)}
        onClick={onSave}>
        {busy ? "Saving…" : "Save my review"}
      </button>
    </>
  );
}
