import { Navigate } from "react-router-dom";

// Keep legacy dashboard imports working while routes use the app pages.
export default function LegacyDashboardRedirect() {
  return <Navigate to="/dashboard" replace />;
}
