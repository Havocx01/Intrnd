import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthSessionProvider } from "./components/auth/AuthSessionProvider";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "./styles.css";
import "./styles/home.css";
import "./styles/auth.css";
import "./styles/app.css";

if (window.location.hostname === "localhost") {
  const canonicalLocalUrl = new URL(window.location.href);
  canonicalLocalUrl.hostname = "127.0.0.1";
  window.location.replace(canonicalLocalUrl.toString());
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthSessionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthSessionProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
