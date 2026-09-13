import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveAuthSession, signIn, signInWithGoogle } from "../lib/auth";
import { requestGoogleAccessToken } from "../lib/googleIdentity";
import { AuthLayout } from "../components/auth/AuthLayout";
import { GoogleAuthButton } from "../components/auth/GoogleAuthButton";
import { AuthDivider } from "../components/auth/AuthDivider";
import { AuthTextField } from "../components/auth/AuthTextField";

export default function SignIn() {
  const navigate = useNavigate();
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
      const auth = await signIn({ email, password });
      saveAuthSession(auth);
      navigate(signInDestination(auth.user));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setGoogleLoading(true);
    setGoogleNotice("");

    try {
      const accessToken = await requestGoogleAccessToken();
      const auth = await signInWithGoogle({ accessToken });
      saveAuthSession(auth);
      navigate(signInDestination(auth.user));
    } catch (caughtError) {
      setGoogleNotice(caughtError instanceof Error ? caughtError.message : "Unable to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to Intrnd"
      description="Continue building projects, tracking progress, and turning finished work into proof."
      footer={
        <>
          New to Intrnd? <Link to="/sign-up">Create an account</Link>
        </>
      }>
      <GoogleAuthButton label="Sign in with Google" loading={googleLoading} onClick={handleGoogleAuth} />
      {googleNotice ? (
        <p className="hp-auth-google-note" role="status">
          <strong>Heads up · </strong>
          {googleNotice}
        </p>
      ) : null}

      <AuthDivider label="or continue with email" />

      <form className="hp-auth-form" onSubmit={handleSubmit} noValidate>
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
          autoFocus
        />

        <AuthTextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          togglePassword
          required
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
              Signing in…
            </>
          ) : (
            "Sign in with email"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

function signInDestination(user: { role: string; onboardingCompleted: boolean }) {
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "REVIEWER") return "/review/catalog";
  return user.onboardingCompleted ? "/dashboard" : "/onboarding";
}
