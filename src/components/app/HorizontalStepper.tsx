import { ChevronRight } from "lucide-react";

const STEPS = ["Browse", "Build", "Submit", "Verify", "Use as proof"] as const;

export function HorizontalStepper() {
  return (
    <ol className="app-flow" aria-label="How Intrnd works">
      {STEPS.map((label, index) => (
        <li key={label} className="app-flow-step">
          <span className="app-flow-num" aria-hidden>
            {index + 1}
          </span>
          <span className="app-flow-label">{label}</span>
          {index < STEPS.length - 1 ? <ChevronRight className="app-flow-arrow" size={13} aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}
