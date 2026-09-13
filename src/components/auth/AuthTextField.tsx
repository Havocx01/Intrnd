import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

type AuthTextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  label: string;
  type?: "text" | "email" | "password";
  errorText?: string;
  hint?: string;
  trailing?: ReactNode;
  togglePassword?: boolean;
};

export const AuthTextField = forwardRef<HTMLInputElement, AuthTextFieldProps>(function AuthTextField(
  { label, type = "text", errorText, hint, trailing, togglePassword = false, className, ...inputProps },
  ref,
) {
  const reactId = useId();
  const inputId = `hp-auth-${reactId}`;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === "password";
  const effectiveType = isPassword && togglePassword && revealed ? "text" : type;

  const describedByIds: string[] = [];
  if (hint) describedByIds.push(`${inputId}-hint`);
  if (errorText) describedByIds.push(`${inputId}-error`);

  return (
    <div className={["hp-auth-field", errorText ? "is-invalid" : "", className].filter(Boolean).join(" ")}>
      <label htmlFor={inputId}>{label}</label>
      <div className="hp-auth-field-input">
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={describedByIds.length > 0 ? describedByIds.join(" ") : undefined}
          {...inputProps}
        />
        {isPassword && togglePassword ? (
          <button
            type="button"
            className="hp-auth-field-toggle"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            tabIndex={0}>
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
        {trailing ? <div className="hp-auth-field-trailing">{trailing}</div> : null}
      </div>
      {hint && !errorText ? (
        <p id={`${inputId}-hint`} className="hp-auth-field-hint">
          {hint}
        </p>
      ) : null}
      {errorText ? (
        <p id={`${inputId}-error`} className="hp-auth-field-error" role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
});
