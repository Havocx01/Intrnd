type AuthDividerProps = { label?: string };

export function AuthDivider({ label = "or continue with email" }: AuthDividerProps) {
  return (
    <div className="hp-auth-divider" role="separator" aria-orientation="horizontal">
      <span aria-hidden="true" />
      <span className="hp-auth-divider-label">{label}</span>
      <span aria-hidden="true" />
    </div>
  );
}
