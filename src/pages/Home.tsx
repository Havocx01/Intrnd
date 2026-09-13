import { FAQAccordion } from "../components/home/FAQAccordion";
import { FinalCTA } from "../components/home/FinalCTA";
import { HeroSection } from "../components/home/HeroSection";
import { OutcomeSection } from "../components/home/OutcomeSection";
import { PartnerSection } from "../components/home/PartnerSection";
import { ProductExplanation } from "../components/home/ProductExplanation";
import { ProjectsPreview } from "../components/home/ProjectsPreview";
import { ProofPreview } from "../components/home/ProofPreview";
import { ValueStrip } from "../components/home/ValueStrip";
import { WorkflowScroll } from "../components/home/WorkflowScroll";

export default function Home() {
  return (
    <div className="hp-page">
      <HeroSection />
      <ValueStrip />
      <ProductExplanation />
      <WorkflowScroll />
      <ProjectsPreview />
      <ProofPreview />
      <OutcomeSection />
      <PartnerSection />
      <FAQAccordion />
      <FinalCTA />
    </div>
  );
}
