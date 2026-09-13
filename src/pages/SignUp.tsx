import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveAuthSession, signInWithGoogle, signUp } from "../lib/auth";
import { requestGoogleAccessToken } from "../lib/googleIdentity";
import { AuthLayout } from "../components/auth/AuthLayout";
import { GoogleAuthButton } from "../components/auth/GoogleAuthButton";
import { AuthDivider } from "../components/auth/AuthDivider";
import { AuthTextField } from "../components/auth/AuthTextField";
import { AccountTypeSelector, type AccountTypeValue } from "../components/auth/AccountTypeSelector";

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountTypeValue>("STUDENT");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const auth = await signUp({ name, email, password, accountType, organizationName });
      saveAuthSession(auth);
      navigate(auth.user.role === "ORGANIZATION" ? "/organization-onboarding" : "/onboarding");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setGoogleLoading(true);
    setGoogleNotice("");

    try {
      const accessToken = await requestGoogleAccessToken();
      const auth = await signInWithGoogle({ accessToken, accountType, organizationName });
      saveAuthSession(auth);
      navigate(
        auth.user.role === "ORGANIZATION" ? "/organization-onboarding" : auth.user.onboardingCompleted ? "/dashboard" : "/onboarding",
      );
    } catch (caughtError) {
      setGoogleNotice(caughtError instanceof Error ? caughtError.message : "Unable to continue with Google.");
    } finally {
      setGoogleLoading(false);
    }
  }

  const isOrganization = accountType === "ORGANIZATION";

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your Intrnd account"
      description="Start with one structured project and turn completed work into proof for your resume or portfolio."
      footer={
        <>
          Already have an account? <Link to="/sign-in">Sign in</Link>
        </>
      }>
      <GoogleAuthButton label="Sign up with Google" loading={googleLoading} onClick={handleGoogleAuth} />
      {googleNotice ? (
        <p className="hp-auth-google-note" role="status">
          <strong>Heads up · </strong>
          {googleNotice}
        </p>
      ) : null}

      <AccountTypeSelector value={accountType} onChange={setAccountType} helperText="You can adjust this later." />

      <AuthDivider label="or continue with email" />

      <form className="hp-auth-form" onSubmit={handleSubmit} noValidate>
        <AuthTextField
          label={isOrganization ? "Your name" : "Full name"}
          type="text"
          name="name"
          autoComplete="name"
          placeholder={isOrganization ? "Your name (the contact person)" : "Your name"}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        {isOrganization ? (
          <AuthTextField
            label="Organization name"
            type="text"
            name="organization"
            autoComplete="organization"
            placeholder="Campus org, nonprofit, startup…"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            required
          />
        ) : null}

        <AuthTextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <AuthTextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
          togglePassword
          hint="Use at least 8 characters."
        />

        {error ? (
          <p className="hp-auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="hp-auth-submit" type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
          {isSubmitting ? (
            <>
              <span className="hp-auth-submit-spinner" aria-hidden="true" />
              Creating account…
            </>
          ) : (
            "Create account with email"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
