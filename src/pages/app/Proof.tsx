import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass, FolderKanban, Send } from "lucide-react";
import { useAppData } from "../../components/app/AppDataProvider";
import { AppLinkButton } from "../../components/app/Button";
import { EmptyState } from "../../components/app/EmptyState";
import { ProofPreviewCard } from "../../components/app/ProofPreviewCard";
import { ProofRecordCard } from "../../components/app/ProofRecordCard";
import { easeOutSoft } from "../../lib/motion";

export default function Proof() {
  const reduced = useReducedMotion();
  const { verifiedApplications, submittedApplications, activeApplications, needsRevisionApplications, featuredApplication } = useAppData();

  const hasSubmitted = submittedApplications.length > 0;
  const hasActive = activeApplications.length > 0 || needsRevisionApplications.length > 0;

  let emptyTitle = "No verified proof yet";
  let emptyDescription =
    "Once a project is reviewed and verified, you'll get a portable resume bullet, skills list, and case study that lives here. Pick your first project to start.";
  let emptyActions = (
    <>
      <AppLinkButton to="/dashboard/browse" variant="primary" size="sm" iconLeft={<Compass size={14} aria-hidden />}>
        Browse projects
      </AppLinkButton>
      <AppLinkButton to="/dashboard" variant="ghost" size="sm" iconRight={<ArrowRight size={14} aria-hidden />}>
        Back to workspace
      </AppLinkButton>
    </>
  );

  if (hasSubmitted) {
    emptyTitle = "Your proof is almost ready";
    emptyDescription =
      "You've submitted work. Your proof package will appear here after an Intrnd reviewer verifies the evidence and confirms the claims.";
    emptyActions = (
      <>
        <AppLinkButton to="/dashboard/submissions" variant="primary" size="sm" iconLeft={<Send size={14} aria-hidden />}>
          Check submissions
        </AppLinkButton>
        <AppLinkButton to="/dashboard/browse" variant="ghost" size="sm" iconLeft={<Compass size={14} aria-hidden />}>
          Browse next project
        </AppLinkButton>
      </>
    );
  } else if (hasActive) {
    emptyTitle = "Finish your project to unlock proof";
    emptyDescription =
      "You have an active project. Finish the deliverables, submit them for review, and your proof package will appear here.";
    emptyActions = (
      <>
        <AppLinkButton to="/dashboard/my-projects" variant="primary" size="sm" iconLeft={<FolderKanban size={14} aria-hidden />}>
          Continue project
        </AppLinkButton>
        <AppLinkButton to="/dashboard/browse" variant="ghost" size="sm" iconLeft={<Compass size={14} aria-hidden />}>
          Browse more
        </AppLinkButton>
      </>
    );
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <h1>Proof</h1>
        <p>Verified projects become reviewer-confirmed evidence you can use in resumes, portfolios, and applications.</p>
      </header>

      {verifiedApplications.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actions={emptyActions}
          preview={
            <ProofPreviewCard
              project={featuredApplication?.project}
              mode="placeholder"
              title={featuredApplication ? "Future proof for your project" : "Future verified record"}
            />
          }
        />
      ) : (
        <>
          <div className="app-section-title">
            <h2>
              {verifiedApplications.length} verified record
              {verifiedApplications.length === 1 ? "" : "s"}
            </h2>
            <small>Ready to use in applications</small>
          </div>
          <motion.section
            className="app-proof-grid"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: easeOutSoft }}
            aria-label="Verified proof records">
            {verifiedApplications.map((application) => (
              <ProofRecordCard key={application.id} application={application} />
            ))}
          </motion.section>
        </>
      )}
    </div>
  );
}
