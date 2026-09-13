import type { LoadingSkeletonVariant } from "../components/LoadingScreen";

export function loadingVariantFromPath(pathname: string): LoadingSkeletonVariant {
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/organization-onboarding")) {
    return "onboarding";
  }
  if (pathname.startsWith("/dashboard/browse")) return "browse";
  if (pathname.startsWith("/dashboard/my-projects")) return "projects";
  if (
    pathname.startsWith("/dashboard/submissions") ||
    pathname.startsWith("/dashboard/proof") ||
    pathname.startsWith("/dashboard/account") ||
    pathname.startsWith("/admin")
  ) {
    return "records";
  }
  if (pathname.startsWith("/dashboard")) return "workspace";
  return "marketing";
}
