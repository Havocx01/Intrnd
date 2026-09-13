import { Component, ErrorInfo, ReactNode } from "react";

type ErrorBoundaryProps = { children: ReactNode };

type ErrorBoundaryState = { hasError: boolean };

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Intrnd render error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error">
          <section className="app-error-card">
            <span className="app-error-brand">Intrnd</span>
            <h1>Something went wrong.</h1>
            <p>Refresh and try again. If it keeps happening, the team needs to look at it.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
