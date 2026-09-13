import { GraduationCap, Building2 } from "lucide-react";

export type AccountTypeValue = "STUDENT" | "ORGANIZATION";

type Option = { value: AccountTypeValue; title: string; description: string; icon: typeof GraduationCap };

const options: Option[] = [
  { value: "STUDENT", title: "Student", description: "Find and complete projects", icon: GraduationCap },
  { value: "ORGANIZATION", title: "Organization", description: "Post small project briefs", icon: Building2 },
];

type AccountTypeSelectorProps = { value: AccountTypeValue; onChange: (value: AccountTypeValue) => void; helperText?: string };

export function AccountTypeSelector({ value, onChange, helperText = "You can adjust this later." }: AccountTypeSelectorProps) {
  return (
    <fieldset className="hp-auth-typeselect">
      <legend>I'm joining as</legend>
      <div className="hp-auth-typeselect-grid" role="radiogroup">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              data-active={isActive ? "true" : "false"}
              className="hp-auth-typeselect-card"
              onClick={() => onChange(option.value)}>
              <span className="hp-auth-typeselect-icon" aria-hidden="true">
                <option.icon size={16} />
              </span>
              <span className="hp-auth-typeselect-text">
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </span>
              <span className="hp-auth-typeselect-radio" aria-hidden="true" data-on={isActive ? "true" : "false"} />
            </button>
          );
        })}
      </div>
      {helperText ? <p className="hp-auth-typeselect-helper">{helperText}</p> : null}
    </fieldset>
  );
}
