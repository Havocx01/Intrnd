import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/app/AppLayout";
import Layout from "./components/Layout";
import About from "./pages/About";
import ForOrganizations from "./pages/ForOrganizations";
import ForStudents from "./pages/ForStudents";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { SignedOutOnly } from "./components/auth/SignedOutOnly";
import LoadingScreen from "./components/LoadingScreen";

const Admin = lazy(() => import("./pages/Admin"));
const CatalogReviewer = lazy(() => import("./pages/CatalogReviewer"));
const Account = lazy(() => import("./pages/app/Account"));
const AiReview = lazy(() => import("./pages/app/AiReview"));
const BrowseProjects = lazy(() => import("./pages/app/BrowseProjects"));
const DashboardHome = lazy(() => import("./pages/app/DashboardHome"));
const ExperienceScorePage = lazy(() => import("./pages/app/ExperienceScore"));
const MyProjects = lazy(() => import("./pages/app/MyProjects"));
const Pricing = lazy(() => import("./pages/app/Pricing"));
const Proof = lazy(() => import("./pages/app/Proof"));
const Submissions = lazy(() => import("./pages/app/Submissions"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const OrganizationOnboarding = lazy(() => import("./pages/OrganizationOnboarding"));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppRoutes />
    </Suspense>
  );
}

function AppRoutes() {
  useScrollReveal();
  const experimentalAiEnabled = import.meta.env.VITE_EXPERIMENTAL_AI_ENABLED === "true";

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/students" element={<ForStudents />} />
        <Route path="/organizations" element={<ForOrganizations />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/sign-in"
          element={
            <SignedOutOnly>
              <SignIn />
            </SignedOutOnly>
          }
        />
        <Route
          path="/sign-up"
          element={
            <SignedOutOnly>
              <SignUp />
            </SignedOutOnly>
          }
        />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/organization-onboarding" element={<OrganizationOnboarding />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/browse" element={<BrowseProjects />} />
          <Route path="/dashboard/my-projects" element={<MyProjects />} />
          <Route path="/dashboard/submissions" element={<Submissions />} />
          <Route path="/dashboard/proof" element={<Proof />} />
          {experimentalAiEnabled ? (
            <>
              <Route path="/dashboard/experience-score" element={<ExperienceScorePage />} />
              <Route path="/dashboard/experience/:experienceId/review" element={<AiReview />} />
            </>
          ) : null}
          <Route path="/dashboard/account" element={<Account />} />
          <Route path="/dashboard/pricing" element={<Pricing />} />
        </Route>
        <Route path="/admin" element={<Admin />} />
        <Route path="/review/catalog" element={<CatalogReviewer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
