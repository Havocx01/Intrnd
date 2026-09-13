import { FileText, Image, Link2, Paperclip } from "lucide-react";
import type { SubmissionItem } from "./SubmissionComposer";

export function SubmissionEvidenceList({ items }: { items?: SubmissionItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="app-evidence-list" aria-label="Submitted evidence">
      {items.map((item) => {
        const href = item.downloadUrl ?? item.url;
        const Icon = item.kind === "IMAGE" ? Image : item.kind === "DOCUMENT" ? FileText : item.url ? Link2 : Paperclip;
        return (
          <div key={item.id} className="app-evidence-row">
            <Icon size={14} aria-hidden />
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {item.originalFileName ?? item.url}
              </a>
            ) : (
              <span>{item.textValue}</span>
            )}
            <small>{item.kind.toLowerCase()}</small>
          </div>
        );
      })}
    </div>
  );
}
