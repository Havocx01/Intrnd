import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type GoogleAuthButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  loading?: boolean;
};

export const GoogleAuthButton = forwardRef<HTMLButtonElement, GoogleAuthButtonProps>(function GoogleAuthButton(
  { label, loading = false, disabled, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={["hp-auth-google", className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}>
      <span className="hp-auth-google-logo" aria-hidden="true">
        <GoogleGLogo />
      </span>
      <span className="hp-auth-google-label">{loading ? "Connecting…" : label}</span>
      {loading ? <span className="hp-auth-google-spinner" aria-hidden="true" /> : null}
    </button>
  );
});

// Preserve the official Google logo's colors and proportions.
function GoogleGLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" role="img" aria-label="Google">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
