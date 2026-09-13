import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Building2,
  Check,
  Clock,
  GraduationCap,
  HeartHandshake,
  Lock,
  Rocket,
  Store,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthUser, ProfileChangeRequestSummary } from "../lib/auth";
import { clearAppDataCache } from "../lib/appDataCache";

type AccountTypeOption = { value: string; label: string; description: string; icon: LucideIcon };

const accountTypes: AccountTypeOption[] = [
  { value: "STUDENT", label: "Student", description: "Find projects and build resume-ready proof.", icon: GraduationCap },
  { value: "ORGANIZATION", label: "Campus Organization", description: "Post project briefs for students to complete.", icon: Building2 },
  { value: "PROFESSOR", label: "Professor", description: "Create opportunities tied to learning goals.", icon: BookOpen },
  { value: "NONPROFIT", label: "Nonprofit", description: "Get help with small operational or creative projects.", icon: HeartHandshake },
  { value: "STARTUP", label: "Startup", description: "Share real tasks students can contribute to.", icon: Rocket },
  {
    value: "LOCAL_BUSINESS",
    label: "Local Business",
    description: "Offer practical projects and receive useful deliverables.",
    icon: Store,
  },
];

const curatedMajorOptions = [
  "Computer Science",
  "Software Engineering",
  "Data Science",
  "Cybersecurity",
  "Information Systems",
  "Computer Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Construction Management",
  "Industrial Engineering",
  "Finance",
  "Accounting",
  "Economics",
  "Business Analytics",
  "Business Administration",
  "Marketing",
  "Supply Chain Management",
  "Human Resources",
  "Real Estate",
  "Entrepreneurship",
  "Public Health",
  "Healthcare Administration",
  "Biology",
  "Psychology",
  "Political Science",
  "Public Policy",
  "Legal Studies",
  "UX / Interaction Design",
  "Graphic Design",
  "Education",
  "Communications / Media",
];

const careerInterestOptions = [
  "Software engineering",
  "AI/ML",
  "Cybersecurity",
  "Data science",
  "App development",
  "Investment banking",
  "Fintech",
  "Private equity",
  "Corporate finance",
  "Accounting",
  "Consulting",
  "Operations",
  "Product management",
  "Marketing",
  "Entrepreneurship",
];

const experienceLevelOptions = ["Beginner", "Intermediate", "Advanced"];

const outcomeOptions = ["Resume bullet", "Portfolio case study", "Internship preparation", "Competition/project experience", "Skill proof"];

const roadmapSupportOptions = ["Guided", "Standard", "Accelerated"];
const roadmapSupportDescriptions: Record<string, string> = {
  Guided: "More explanation, preparation help, and resources.",
  Standard: "A focused workflow with balanced guidance.",
  Accelerated: "Concise actions when you already know the tools.",
};

const FIELD_OPTIONS_BY_MAJOR = [
  {
    keywords: ["computer", "software", "data science", "information", "informatics"],
    options: ["Software engineering", "AI/ML", "Cybersecurity", "Data science", "App development", "Product engineering"],
  },
  {
    keywords: ["finance", "accounting", "economics"],
    options: ["Investment banking", "Fintech", "Private equity", "Corporate finance", "Accounting", "Portfolio analysis"],
  },
  {
    keywords: ["business", "management", "entrepreneurship"],
    options: ["Entrepreneurship", "Consulting", "Operations", "Product management", "Marketing", "Business analytics"],
  },
  {
    keywords: ["mechanical", "electrical", "civil", "engineering", "aerospace", "manufacturing"],
    options: ["Robotics", "Aerospace", "Energy", "Product design", "Manufacturing", "Construction planning"],
  },
  {
    keywords: ["biology", "health", "medicine", "nursing", "public health"],
    options: ["Healthcare operations", "Research analysis", "Public health", "Patient workflow", "Health data", "Lab documentation"],
  },
  {
    keywords: ["psychology", "sociology", "political", "legal", "public policy"],
    options: ["Research writing", "Policy analysis", "Survey analysis", "Community programs", "Legal/public sector", "Program evaluation"],
  },
  {
    keywords: ["marketing", "media", "communications", "journalism"],
    options: ["Campaign analytics", "Content strategy", "Brand research", "SEO", "Social media analytics", "Audience research"],
  },
  {
    keywords: ["design", "art", "ux"],
    options: ["UX research", "Product design", "Visual design", "Accessibility", "Brand systems", "Portfolio case study"],
  },
];

const MAJOR_PERSONALIZATION_DETAILS: Record<string, { companies: string[]; focuses: string[] }> = {
  "Computer Science": {
    companies: ["Google", "Microsoft", "Amazon", "Meta"],
    focuses: ["Developer tools", "Distributed systems", "AI applications", "Accessible software"],
  },
  "Software Engineering": {
    companies: ["Microsoft", "GitHub", "Atlassian", "Shopify"],
    focuses: ["Cloud platforms", "API design", "Developer experience", "Software testing"],
  },
  "Data Science": {
    companies: ["Databricks", "Snowflake", "Palantir", "Capital One"],
    focuses: ["Forecasting", "Experiment analysis", "Customer analytics", "Data storytelling"],
  },
  Cybersecurity: {
    companies: ["CrowdStrike", "Palo Alto Networks", "Cloudflare", "Mandiant"],
    focuses: ["Threat detection", "Cloud security", "Identity and access", "Security automation"],
  },
  "Information Systems": {
    companies: ["Salesforce", "ServiceNow", "Accenture", "IBM"],
    focuses: ["Business systems", "Workflow automation", "CRM operations", "Technology consulting"],
  },
  "Computer Engineering": {
    companies: ["NVIDIA", "Intel", "AMD", "Qualcomm"],
    focuses: ["Embedded systems", "Computer architecture", "Edge computing", "Hardware acceleration"],
  },
  "Electrical Engineering": {
    companies: ["Siemens", "Texas Instruments", "Eaton", "Northrop Grumman"],
    focuses: ["Power systems", "Signal processing", "Control systems", "Semiconductor design"],
  },
  "Mechanical Engineering": {
    companies: ["Boeing", "Caterpillar", "Tesla", "Honeywell"],
    focuses: ["Thermal systems", "Product design", "Manufacturing", "Robotics mechanisms"],
  },
  "Civil Engineering": {
    companies: ["AECOM", "Jacobs", "Bechtel", "WSP"],
    focuses: ["Transportation", "Structural design", "Water systems", "Sustainable infrastructure"],
  },
  "Construction Management": {
    companies: ["Turner Construction", "Skanska", "DPR Construction", "Kiewit"],
    focuses: ["Project scheduling", "Cost estimating", "Site safety", "Construction technology"],
  },
  "Industrial Engineering": {
    companies: ["Toyota", "Amazon Operations", "UPS", "General Electric"],
    focuses: ["Process improvement", "Quality systems", "Logistics", "Operations research"],
  },
  Finance: {
    companies: ["JPMorgan Chase", "Goldman Sachs", "Morgan Stanley", "BlackRock"],
    focuses: ["M&A advisory", "Equity research", "Portfolio risk", "Corporate valuation"],
  },
  Accounting: {
    companies: ["Deloitte", "PwC", "EY", "KPMG"],
    focuses: ["Audit analytics", "Tax strategy", "Forensic accounting", "Financial reporting"],
  },
  Economics: {
    companies: ["Federal Reserve", "World Bank", "Analysis Group", "Cornerstone Research"],
    focuses: ["Labor economics", "Economic policy", "Market research", "Causal analysis"],
  },
  "Business Analytics": {
    companies: ["Capital One", "Amazon", "Deloitte", "American Express"],
    focuses: ["KPI strategy", "Customer analytics", "Demand forecasting", "Decision dashboards"],
  },
  "Business Administration": {
    companies: ["Procter & Gamble", "Target", "Amazon", "JPMorgan Chase"],
    focuses: ["Business strategy", "Product operations", "Customer experience", "Growth planning"],
  },
  Marketing: {
    companies: ["Nike", "Coca-Cola", "Spotify", "HubSpot"],
    focuses: ["Brand strategy", "Campaign analytics", "Consumer behavior", "Growth marketing"],
  },
  "Supply Chain Management": {
    companies: ["Amazon", "Walmart", "UPS", "Procter & Gamble"],
    focuses: ["Inventory planning", "Supplier risk", "Last-mile delivery", "Demand forecasting"],
  },
  "Human Resources": {
    companies: ["Workday", "Deloitte", "Microsoft", "Marriott"],
    focuses: ["People analytics", "Recruiting operations", "Employee experience", "Learning programs"],
  },
  "Real Estate": {
    companies: ["CBRE", "JLL", "Cushman & Wakefield", "Zillow"],
    focuses: ["Property valuation", "Rental markets", "Commercial leasing", "Real estate analytics"],
  },
  Entrepreneurship: {
    companies: ["Y Combinator", "Techstars", "Shopify", "Stripe"],
    focuses: ["Startup validation", "Go-to-market", "Small business growth", "Venture research"],
  },
  "Public Health": {
    companies: ["CDC", "Kaiser Permanente", "UnitedHealth Group", "CVS Health"],
    focuses: ["Health equity", "Community health", "Disease prevention", "Program evaluation"],
  },
  "Healthcare Administration": {
    companies: ["Mayo Clinic", "HCA Healthcare", "Kaiser Permanente", "UnitedHealth Group"],
    focuses: ["Patient access", "Clinical operations", "Healthcare quality", "Revenue cycle"],
  },
  Biology: {
    companies: ["Pfizer", "Moderna", "Thermo Fisher Scientific", "Illumina"],
    focuses: ["Genomics", "Biotechnology", "Drug discovery", "Lab operations"],
  },
  Psychology: {
    companies: ["Kaiser Permanente", "Headspace", "BetterUp", "Pearson"],
    focuses: ["Behavioral research", "Mental health access", "User behavior", "Workplace wellbeing"],
  },
  "Political Science": {
    companies: ["U.S. Department of State", "Brookings Institution", "Pew Research Center", "Deloitte GPS"],
    focuses: ["International affairs", "Public opinion", "Campaign strategy", "Government programs"],
  },
  "Public Policy": {
    companies: ["RAND Corporation", "Urban Institute", "U.S. GAO", "Mathematica"],
    focuses: ["Education policy", "Housing policy", "Program evaluation", "Regulatory analysis"],
  },
  "Legal Studies": {
    companies: ["Latham & Watkins", "Kirkland & Ellis", "Baker McKenzie", "U.S. Department of Justice"],
    focuses: ["Legal research", "Compliance", "Contract analysis", "Public-interest law"],
  },
  "UX / Interaction Design": {
    companies: ["Figma", "Adobe", "Airbnb", "Google"],
    focuses: ["Design systems", "Accessibility", "Mobile UX", "User research"],
  },
  "Graphic Design": {
    companies: ["Adobe", "Canva", "Nike", "Pentagram"],
    focuses: ["Brand identity", "Editorial design", "Motion graphics", "Campaign design"],
  },
  Education: {
    companies: ["Google for Education", "Pearson", "Khan Academy", "Coursera"],
    focuses: ["Learning design", "Education technology", "Student success", "Curriculum research"],
  },
  "Communications / Media": {
    companies: ["Disney", "Warner Bros. Discovery", "Spotify", "Edelman"],
    focuses: ["Audience strategy", "Digital storytelling", "Public relations", "Media analytics"],
  },
};

const DEFAULT_COMPANY_OPTIONS = ["Large company", "Startup", "Local organization", "Research team"];
const DEFAULT_FOCUS_OPTIONS = ["Community impact", "Small business", "Student services", "Emerging technology"];

const PERSONALIZATION_SUGGESTION_GROUPS = [
  {
    keywords: ["computer", "software", "data", "cyber", "ai/ml", "app development"],
    roles: ["Software engineer", "Data analyst", "Product engineer", "Security analyst"],
    niches: ["Developer tools", "Education technology", "Fintech", "Responsible AI"],
  },
  {
    keywords: ["finance", "accounting", "investment", "fintech", "private equity", "economics"],
    roles: ["Financial analyst", "Investment banking analyst", "FP&A analyst", "Accounting intern"],
    niches: ["Valuation", "M&A", "Public markets", "Financial modeling"],
  },
  {
    keywords: ["business", "consulting", "operations", "entrepreneur", "product management"],
    roles: ["Business analyst", "Consulting analyst", "Operations analyst", "Product associate"],
    niches: ["Market entry", "Process improvement", "Customer research", "Growth strategy"],
  },
  {
    keywords: ["engineering", "mechanical", "electrical", "civil", "construction", "robotics"],
    roles: ["Design engineer", "Project engineer", "Manufacturing engineer", "Systems engineer"],
    niches: ["Robotics", "Clean energy", "Manufacturing", "Infrastructure"],
  },
  {
    keywords: ["health", "biology", "patient", "clinical", "public health"],
    roles: ["Healthcare analyst", "Research assistant", "Operations coordinator", "Public health intern"],
    niches: ["Patient access", "Health equity", "Clinical workflows", "Community health"],
  },
  {
    keywords: ["policy", "political", "legal", "psychology", "research", "public sector"],
    roles: ["Policy analyst", "Research assistant", "Program analyst", "Legal intern"],
    niches: ["Local policy", "Program evaluation", "Civic technology", "Behavioral research"],
  },
  {
    keywords: ["marketing", "media", "communications", "content", "brand"],
    roles: ["Marketing analyst", "Content strategist", "Brand assistant", "Audience researcher"],
    niches: ["Creator economy", "Consumer behavior", "Social impact", "Digital campaigns"],
  },
  {
    keywords: ["design", "ux", "visual", "accessibility"],
    roles: ["UX designer", "Product designer", "UX researcher", "Visual designer"],
    niches: ["Accessibility", "Design systems", "Mobile products", "Service design"],
  },
];

const DEFAULT_PERSONALIZATION_SUGGESTIONS = {
  roles: ["Analyst", "Project coordinator", "Research assistant", "Operations intern"],
  niches: ["Local organizations", "Community impact", "Small business", "Student services"],
};

const studentStepLabels = [
  { label: "Welcome", description: "Start your project roadmap." },
  { label: "Major", description: "Your strongest recommendation signal." },
  { label: "Interest", description: "Narrow the kind of work you want." },
  { label: "Specifics", description: "Add optional roles, companies, or niches." },
  { label: "Level", description: "Match project difficulty." },
  { label: "Outcome", description: "Shape the final deliverable." },
  { label: "Pace", description: "Set your reusable roadmap default." },
];

const organizationStepLabels = [
  { label: "Role", description: "Choose what best describes you." },
  { label: "Profile", description: "Tell us about the organization." },
  { label: "Needs", description: "Choose useful project categories." },
  { label: "Ready", description: "Review your setup." },
];

const organizationHelpOptions = ["Research", "Marketing", "Design", "Events", "Operations", "Outreach", "Data cleanup", "Website help"];

type OnboardingForm = {
  school: string;
  major: string;
  gradYear: string;
  careerInterests: string;
  targetRoles: string;
  targetCompanies: string;
  nicheInterests: string;
  experienceLevel: string;
  currentSkills: string;
  skillsToBuild: string;
  projectPreferences: string;
  organizationName: string;
  roleTitle: string;
  helpTopics: string;
  weeklyHours: string;
  supportLevel: string;
};

type OnboardingUserResponse = AuthUser & {
  studentProfile?: {
    school: string | null;
    major: string | null;
    gradYear: number | null;
    careerInterests: string | null;
    targetRoles: string | null;
    targetCompanies: string | null;
    nicheInterests: string | null;
    experienceLevel: string | null;
    currentSkills: string | null;
    skillsToBuild: string | null;
    projectPreferences: string | null;
    roadmapDefaults?: { weeklyHours: number; supportLevel: "GUIDED" | "STANDARD" | "ACCELERATED" } | null;
  } | null;
  organizationProfile?: { organizationName: string | null; roleTitle: string | null; helpTopics: string | null } | null;
};

const initialForm: OnboardingForm = {
  school: "",
  major: "",
  gradYear: "",
  careerInterests: "",
  targetRoles: "",
  targetCompanies: "",
  nicheInterests: "",
  experienceLevel: "",
  currentSkills: "",
  skillsToBuild: "",
  projectPreferences: "",
  organizationName: "",
  roleTitle: "",
  helpTopics: "",
  weeklyHours: "5",
  supportLevel: "STANDARD",
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState("STUDENT");
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [changeRequest, setChangeRequest] = useState<ProfileChangeRequestSummary | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const questionRegionRef = useRef<HTMLDivElement | null>(null);

  const isStudent = accountType === "STUDENT";
  const totalSteps = isStudent ? 7 : 4;
  const isFinalStep = step === totalSteps - 1;
  const progress = totalSteps <= 1 ? 100 : (step / (totalSteps - 1)) * 100;
  const currentStepLabels = isStudent ? studentStepLabels : organizationStepLabels;
  const editLocked = isEditMode && Boolean(user) && !canEdit;
  const hasPendingRequest = changeRequest?.status === "PENDING";

  const filteredMajors = useMemo(() => filterOptions(curatedMajorOptions, form.major), [form.major]);
  const fieldInterestOptions = useMemo(() => getFieldInterestOptions(form.major), [form.major]);
  const personalizationSuggestions = useMemo(
    () => getPersonalizationSuggestions(form.major, form.careerInterests),
    [form.careerInterests, form.major],
  );
  const majorPersonalizationDetails = useMemo(() => getMajorPersonalizationDetails(form.major), [form.major]);

  useEffect(() => {
    if (questionRegionRef.current) questionRegionRef.current.scrollTop = 0;
  }, [accountType, step]);

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: OnboardingUserResponse } | null) => {
        if (!data?.user) {
          navigate("/sign-in");
          return;
        }

        if (data.user.onboardingCompleted && !isEditMode) {
          navigate("/dashboard");
          return;
        }

        setUser(data.user);
        setCanEdit(data.user.canEditProfile ?? true);
        setChangeRequest(data.user.profileChangeRequest ?? null);
        setAccountType(data.user.accountType || "STUDENT");
        setForm({
          school: data.user.studentProfile?.school ?? "",
          major: data.user.studentProfile?.major ?? "",
          gradYear: data.user.studentProfile?.gradYear ? String(data.user.studentProfile.gradYear) : "",
          careerInterests: data.user.studentProfile?.careerInterests ?? "",
          targetRoles: data.user.studentProfile?.targetRoles ?? "",
          targetCompanies: data.user.studentProfile?.targetCompanies ?? "",
          nicheInterests: data.user.studentProfile?.nicheInterests ?? "",
          experienceLevel: data.user.studentProfile?.experienceLevel ? titleCase(data.user.studentProfile.experienceLevel) : "",
          currentSkills: data.user.studentProfile?.currentSkills ?? "",
          skillsToBuild: data.user.studentProfile?.skillsToBuild ?? "",
          projectPreferences: data.user.studentProfile?.projectPreferences ?? "",
          organizationName: data.user.organizationProfile?.organizationName ?? "",
          roleTitle: data.user.organizationProfile?.roleTitle ?? "",
          helpTopics: data.user.organizationProfile?.helpTopics ?? "",
          weeklyHours: String(data.user.studentProfile?.roadmapDefaults?.weeklyHours ?? 5),
          supportLevel: data.user.studentProfile?.roadmapDefaults?.supportLevel ?? "STANDARD",
        });
      })
      .catch(() => navigate("/sign-in"));
  }, [navigate, isEditMode]);

  useEffect(() => {
    if (!showDiscardConfirm && !showFinalizeConfirm) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setShowDiscardConfirm(false);
        setShowFinalizeConfirm(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, showDiscardConfirm, showFinalizeConfirm]);

  function updateField(field: keyof OnboardingForm, value: string) {
    setError("");
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleListValue(field: keyof OnboardingForm, value: string) {
    setError("");
    setForm((current) => {
      const values = listValues(current[field]);
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

      return { ...current, [field]: nextValues.join(", ") };
    });
  }

  function handleContinue() {
    setError("");

    if (isStudent) {
      const stepError = studentStepError(step, form);
      if (stepError) {
        setError(stepError);
        return;
      }
    }

    if (!isFinalStep) {
      setStep((current) => Math.min(current + 1, totalSteps - 1));
      return;
    }

    setShowFinalizeConfirm(true);
  }

  async function finalizeOnboarding() {
    setError("");

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users/onboarding", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          profile: { ...form, roadmapDefaults: { weeklyHours: Number(form.weeklyHours), supportLevel: form.supportLevel } },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save onboarding.");
      }

      clearAppDataCache();
      navigate("/dashboard");
    } catch (caughtError) {
      setShowFinalizeConfirm(false);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    setError("");
    if (step === 0) {
      setShowDiscardConfirm(true);
      return;
    }
    setStep((current) => Math.max(current - 1, 0));
  }

  function discardChanges() {
    setShowDiscardConfirm(false);
    navigate(isEditMode ? "/dashboard" : "/");
  }

  async function submitChangeRequest() {
    setRequestError("");
    setRequestBusy(true);

    try {
      const response = await fetch("/api/users/profile-change-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: requestReason }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit your request.");
      }

      setChangeRequest(data.request);
      setRequestReason("");
    } catch (caughtError) {
      setRequestError(caughtError instanceof Error ? caughtError.message : "Unable to submit your request.");
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <main className="onboarding-screen">
      <section className="onboarding-page">
        <header className="onboarding-page-chrome">
          <span className="onboarding-brand">Intrnd</span>
          {!editLocked ? (
            <span className="onboarding-step-count">
              Step {step + 1} of {totalSteps}
            </span>
          ) : null}
        </header>

        {editLocked ? (
          renderChangeRequestGate()
        ) : (
          <>
            <div
              className="onboarding-progress"
              aria-label={`Onboarding progress: ${Math.round(progress)}%`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}>
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="onboarding-card-body">
              <header className="onboarding-topline">
                <button className="onboarding-back" type="button" onClick={handleBack} aria-label="Go back">
                  <ArrowLeft size={18} />
                  Back
                </button>
              </header>

              <div className="onboarding-question" ref={questionRegionRef}>
                <div key={`${accountType}-${step}`} className="onboarding-step-panel">
                  {renderStep()}
                </div>
                {error ? (
                  <div className="onboarding-error" role="alert" aria-live="polite">
                    <AlertCircle size={19} strokeWidth={2.1} aria-hidden="true" />
                    <span>
                      <strong>{studentStepError(step, form) ? "Complete this step" : "We couldn't save your answers"}</strong>
                      <small>{error}</small>
                    </span>
                  </div>
                ) : null}
              </div>

              <footer className="onboarding-footer">
                <button
                  className="onboarding-continue"
                  type="button"
                  onClick={handleContinue}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}>
                  {isSubmitting ? "Saving..." : isFinalStep ? (isEditMode ? "Review and save" : "Review and finalize") : "Continue"}
                </button>
              </footer>
            </div>
          </>
        )}
      </section>

      {showDiscardConfirm ? (
        <div
          className="onboarding-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDiscardConfirm(false);
            }
          }}>
          <section
            className="onboarding-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-onboarding-title"
            aria-describedby="discard-onboarding-description">
            <h2 id="discard-onboarding-title">Discard your changes?</h2>
            <p id="discard-onboarding-description">Your onboarding answers have not been saved. You can return and start again later.</p>
            <div className="onboarding-dialog-actions">
              <button type="button" onClick={() => setShowDiscardConfirm(false)} autoFocus>
                Keep editing
              </button>
              <button className="is-discard" type="button" onClick={discardChanges}>
                Discard changes
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showFinalizeConfirm ? (
        <div
          className="onboarding-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setShowFinalizeConfirm(false);
            }
          }}>
          <section
            className="onboarding-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="finalize-onboarding-title"
            aria-describedby="finalize-onboarding-description">
            <h2 id="finalize-onboarding-title">{isEditMode ? "Save your profile update?" : "Ready to finalize your onboarding?"}</h2>
            <p id="finalize-onboarding-description">
              {isEditMode
                ? "This uses your available profile update. After you save, additional changes will need admin approval."
                : "Intrnd will use these answers for project ranking and your default roadmap pace. You can confirm or change the pace whenever you add a project."}
            </p>
            <div className="onboarding-dialog-actions">
              <button type="button" onClick={() => setShowFinalizeConfirm(false)} disabled={isSubmitting} autoFocus>
                Keep editing
              </button>
              <button className="is-primary" type="button" onClick={finalizeOnboarding} disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? (isEditMode ? "Saving..." : "Finalizing...") : isEditMode ? "Save profile update" : "Finalize onboarding"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );

  function renderChangeRequestGate() {
    return (
      <div className="onboarding-card-body">
        <header className="onboarding-topline">
          <button className="onboarding-back" type="button" onClick={() => navigate(isEditMode ? "/dashboard" : "/")} aria-label="Go back">
            <ArrowLeft size={18} />
            Back
          </button>
        </header>

        <div className="onboarding-question">
          <div className="onboarding-step-panel">
            <span className="onboarding-request-badge" aria-hidden="true">
              {hasPendingRequest ? <Clock size={18} /> : <Lock size={18} />}
            </span>
            <h1>{hasPendingRequest ? "Your change request is in review" : "Request another profile update"}</h1>
            <p>
              {hasPendingRequest
                ? "You've used your profile update, so an admin is reviewing your request to make more changes. We'll unlock editing as soon as it's approved."
                : "You've already used your one profile update after signup. Tell us what you'd like to change and an admin will review your request."}
            </p>

            {changeRequest?.status === "REJECTED" && changeRequest.decisionNote ? (
              <div className="onboarding-personalization-note">
                <span className="onboarding-personalization-note__icon" aria-hidden="true">
                  <AlertCircle size={19} strokeWidth={2} />
                </span>
                <span>
                  <strong>Your last request was declined</strong>
                  <small>{changeRequest.decisionNote}</small>
                </span>
              </div>
            ) : null}

            {hasPendingRequest ? (
              <div className="onboarding-request-status" role="status">
                <strong>Request submitted</strong>
                {changeRequest?.reason ? <p>&ldquo;{changeRequest.reason}&rdquo;</p> : null}
                <small>Submitted {formatRequestDate(changeRequest?.createdAt)}</small>
              </div>
            ) : (
              <label className="onboarding-large-input onboarding-request-input">
                <span>What would you like to change?</span>
                <textarea
                  value={requestReason}
                  placeholder="e.g. My major changed to Data Science, so my recommendations are off."
                  maxLength={1000}
                  onChange={(event) => {
                    setRequestError("");
                    setRequestReason(event.target.value);
                  }}
                />
              </label>
            )}

            {requestError ? (
              <div className="onboarding-error" role="alert" aria-live="polite">
                <AlertCircle size={19} strokeWidth={2.1} aria-hidden="true" />
                <span>
                  <strong>We couldn't submit your request</strong>
                  <small>{requestError}</small>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="onboarding-footer">
          {hasPendingRequest ? (
            <button className="onboarding-continue" type="button" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </button>
          ) : (
            <button
              className="onboarding-continue"
              type="button"
              onClick={submitChangeRequest}
              disabled={requestBusy || !requestReason.trim()}
              aria-busy={requestBusy}>
              {requestBusy ? "Submitting..." : "Submit request"}
            </button>
          )}
        </footer>
      </div>
    );
  }

  function renderStep() {
    if (!isStudent && step === 0) {
      return (
        <>
          <h1>What are you here to do?</h1>
          <p>Choose what best describes you. This sets up the right workspace.</p>
          <ChoiceList
            options={accountTypes}
            value={accountType}
            onSelect={(value) => {
              setAccountType(value);
              setStep(0);
            }}
          />
        </>
      );
    }

    if (!isStudent) {
      return renderOrganizationStep();
    }

    if (step === 0) {
      return (
        <>
          <h1>Ready to find projects that fit what you study?</h1>
          <p>A few short questions — then recommendations from the Intrnd catalog.</p>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <h1>What&apos;s your major or academic direction?</h1>
          <p>Choose the closest match. Your major is the strongest signal in your project ranking.</p>
          <LargeInput
            label="Search majors"
            value={form.major}
            placeholder="Try Computer Science, Finance, or Public Health"
            onChange={(value) => updateField("major", value)}
          />
          <div className="onboarding-major-summary" aria-live="polite">
            <strong>{filteredMajors.length}</strong>
            <span>of {curatedMajorOptions.length} relevant majors</span>
          </div>
          <MajorPicker
            options={filteredMajors}
            selectedValues={[form.major]}
            onToggle={(value) => {
              updateField("major", value);
              updateField("careerInterests", "");
            }}
          />
          {filteredMajors.length === 0 ? (
            <p className="onboarding-major-empty">No preset match. You can still continue with the major you entered.</p>
          ) : null}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <h1>Which field inside that major interests you most?</h1>
          <p>Pick one direction for this round of recommendations.</p>
          <ChoiceGrid
            options={fieldInterestOptions}
            value={form.careerInterests}
            onSelect={(value) => updateField("careerInterests", value)}
          />
          <LargeInput
            label="Or type a specific focus"
            value={fieldInterestOptions.includes(form.careerInterests) ? "" : form.careerInterests}
            placeholder="Type a niche, topic, or kind of work"
            onChange={(value) => updateField("careerInterests", value)}
          />
          <SuggestionChoices
            label="Or choose a more specific direction"
            options={majorPersonalizationDetails.focuses}
            selectedValues={[form.careerInterests]}
            onToggle={(value) => updateField("careerInterests", form.careerInterests === value ? "" : value)}
          />
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <h1>Fine-tune your project matches</h1>
          <p>This step is optional, but it helps Intrnd separate otherwise similar project matches.</p>
          <div className="onboarding-personalization-note">
            <span className="onboarding-personalization-note__icon" aria-hidden="true">
              <Target size={19} strokeWidth={2} />
            </span>
            <span>
              <strong>More context creates a more personal ranking</strong>
              <small>
                Roles, company environments, and niche interests improve the matching reasons you see. Skip anything you are unsure about.
              </small>
            </span>
          </div>
          <div className="onboarding-specificity-fields">
            <div className="onboarding-specificity-item">
              <LargeInput
                label="Roles you want"
                value={form.targetRoles}
                placeholder="Type a role or choose below"
                onChange={(value) => updateField("targetRoles", value)}
              />
              <SuggestionChoices
                label="Suggested roles"
                options={personalizationSuggestions.roles}
                selectedValues={listValues(form.targetRoles)}
                onToggle={(value) => toggleListValue("targetRoles", value)}
              />
            </div>
            <div className="onboarding-specificity-item">
              <LargeInput
                label="Companies or environments"
                value={form.targetCompanies}
                placeholder="Type one or choose below"
                onChange={(value) => updateField("targetCompanies", value)}
              />
              <SuggestionChoices
                label={`Popular employers for ${form.major || "your direction"}`}
                options={majorPersonalizationDetails.companies}
                selectedValues={listValues(form.targetCompanies)}
                onToggle={(value) => toggleListValue("targetCompanies", value)}
              />
            </div>
            <div className="onboarding-specificity-item">
              <LargeInput
                label="Niche interests"
                value={form.nicheInterests}
                placeholder="Type an interest or choose below"
                onChange={(value) => updateField("nicheInterests", value)}
              />
              <SuggestionChoices
                label="Ideas based on your direction"
                options={personalizationSuggestions.niches}
                selectedValues={listValues(form.nicheInterests)}
                onToggle={(value) => toggleListValue("nicheInterests", value)}
              />
            </div>
          </div>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <h1>What&apos;s your experience level?</h1>
          <p>Choose the difficulty that feels realistic, then add any skills you already have or want to practice.</p>
          <ChoiceGrid
            options={experienceLevelOptions}
            value={form.experienceLevel}
            onSelect={(value) => updateField("experienceLevel", value)}
          />
          <div className="onboarding-skill-fields">
            <LargeInput
              label="Skills you already have (optional)"
              value={form.currentSkills}
              placeholder="e.g. Excel, Python, Figma"
              onChange={(value) => updateField("currentSkills", value)}
            />
            <LargeInput
              label="Skills you want to practice (optional)"
              value={form.skillsToBuild}
              placeholder="e.g. SQL, user research, financial modeling"
              onChange={(value) => updateField("skillsToBuild", value)}
            />
          </div>
        </>
      );
    }

    if (step === 5)
      return (
        <>
          <h1>What should this first project help you create?</h1>
          <p>Choose the outcome you want from the work.</p>
          <ChoiceGrid
            options={outcomeOptions}
            value={form.projectPreferences}
            onSelect={(value) => updateField("projectPreferences", value)}
          />
        </>
      );

    const supportLabel = titleCase(form.supportLevel);
    return (
      <>
        <h1>What pace usually works for you?</h1>
        <p>We&apos;ll use this as your default. You can confirm or change it for each project.</p>
        <div className="onboarding-roadmap-defaults">
          <label className="onboarding-large-input">
            <span>Hours available each week</span>
            <input
              type="number"
              min={1}
              max={40}
              step={1}
              inputMode="numeric"
              value={form.weeklyHours}
              onChange={(event) => updateField("weeklyHours", event.target.value)}
            />
          </label>
          <div>
            <span className="onboarding-field-label">Preferred guidance</span>
            <ChoiceGrid
              options={roadmapSupportOptions}
              value={supportLabel}
              onSelect={(value) => updateField("supportLevel", value.toUpperCase())}
            />
          </div>
          <div className="onboarding-personalization-note" role="status">
            <span className="onboarding-personalization-note__icon" aria-hidden="true">
              <Clock size={19} strokeWidth={2} />
            </span>
            <span>
              <strong>
                {supportLabel} guidance · {form.weeklyHours || "0"} hours/week
              </strong>
              <small>{roadmapSupportDescriptions[supportLabel]} Intrnd will show the estimated schedule before adding a project.</small>
            </span>
          </div>
        </div>
      </>
    );
  }

  function renderOrganizationStep() {
    if (step === 1) {
      return (
        <>
          <h1>Tell us about your organization.</h1>
          <p>Just enough to set up your workspace.</p>
          <LargeInput
            label="Organization name"
            value={form.organizationName}
            placeholder="Organization name"
            onChange={(value) => updateField("organizationName", value)}
          />
          <LargeInput
            label="Your role"
            value={form.roleTitle}
            placeholder="Founder, advisor, director..."
            onChange={(value) => updateField("roleTitle", value)}
          />
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <h1>What kind of help might you need?</h1>
          <p>Choose the categories that fit your future projects.</p>
          <PillList
            options={organizationHelpOptions}
            selectedValues={listValues(form.helpTopics)}
            onToggle={(value) => toggleListValue("helpTopics", value)}
          />
        </>
      );
    }

    return (
      <>
        <h1>You&apos;re ready to continue.</h1>
        <p>Next we&apos;ll open your organization workspace.</p>
      </>
    );
  }
}

function ChoiceList({ options, value, onSelect }: { options: AccountTypeOption[]; value: string; onSelect: (value: string) => void }) {
  return (
    <div className="onboarding-choice-list">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={isSelected ? "is-selected" : ""}
            onClick={() => onSelect(option.value)}
            aria-pressed={isSelected}>
            <span className="onboarding-choice-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            <span className="onboarding-option-check" aria-hidden="true">
              <Check size={14} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PillList({
  options,
  selectedValues,
  onToggle,
}: {
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="onboarding-pill-list">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={selectedValues.includes(option) ? "is-selected" : ""}
          onClick={() => onToggle(option)}
          aria-pressed={selectedValues.includes(option)}>
          <span>{option}</span>
          <span className="onboarding-option-check" aria-hidden="true">
            <Check size={14} />
          </span>
        </button>
      ))}
    </div>
  );
}

function MajorPicker({
  options,
  selectedValues,
  onToggle,
}: {
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="onboarding-major-grid" aria-label="Relevant majors">
      {options.map((option) => {
        const isSelected = selectedValues.includes(option);

        return (
          <button
            key={option}
            type="button"
            className={isSelected ? "is-selected" : ""}
            onClick={() => onToggle(option)}
            aria-pressed={isSelected}>
            <span>{option}</span>
            <span className="onboarding-option-check" aria-hidden="true">
              <Check size={14} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChoiceGrid({ options, value, onSelect }: { options: string[]; value: string; onSelect: (value: string) => void }) {
  return (
    <div className="onboarding-choice-grid">
      {options.map((option) => {
        const isSelected = value === option;
        return (
          <button
            key={option}
            type="button"
            className={isSelected ? "is-selected" : ""}
            onClick={() => onSelect(option)}
            aria-pressed={isSelected}>
            <span>{option}</span>
            <span className="onboarding-option-check" aria-hidden="true">
              <Check size={14} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SuggestionChoices({
  label,
  options,
  selectedValues,
  onToggle,
}: {
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="onboarding-suggestions">
      <span>{label}</span>
      <div className="onboarding-suggestion-list">
        {options.map((option) => {
          const selected = selectedValues.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={selected ? "is-selected" : ""}
              onClick={() => onToggle(option)}
              aria-pressed={selected}>
              <span>{option}</span>
              {selected ? <Check size={12} strokeWidth={2.4} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LargeInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="onboarding-large-input">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function formatRequestDate(value: string | null | undefined) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function listValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function filterOptions(options: string[], value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return options;
  }

  return options.filter((option) => option.toLowerCase().includes(normalizedValue));
}

function getFieldInterestOptions(major: string) {
  const normalized = major.trim().toLowerCase();
  const match = FIELD_OPTIONS_BY_MAJOR.find((group) => group.keywords.some((keyword) => normalized.includes(keyword)));

  return match?.options ?? careerInterestOptions;
}

function getMajorPersonalizationDetails(major: string) {
  const exactMatch = MAJOR_PERSONALIZATION_DETAILS[major.trim()];

  if (exactMatch) {
    return exactMatch;
  }

  const normalized = major.trim().toLowerCase();
  const partialMatch = Object.entries(MAJOR_PERSONALIZATION_DETAILS).find(([majorName]) => {
    const normalizedMajorName = majorName.toLowerCase();
    return normalized.includes(normalizedMajorName) || normalizedMajorName.includes(normalized);
  });

  return partialMatch?.[1] ?? { companies: DEFAULT_COMPANY_OPTIONS, focuses: DEFAULT_FOCUS_OPTIONS };
}

function getPersonalizationSuggestions(major: string, careerInterest: string) {
  const signal = `${major} ${careerInterest}`.trim().toLowerCase();
  const match = PERSONALIZATION_SUGGESTION_GROUPS.find((group) => group.keywords.some((keyword) => signal.includes(keyword)));

  return match ?? DEFAULT_PERSONALIZATION_SUGGESTIONS;
}

function studentStepError(step: number, form: OnboardingForm) {
  if (step === 1 && !form.major.trim()) {
    return "Add your major so Intrnd can anchor the recommendations.";
  }

  if (step === 2 && !form.careerInterests.trim()) {
    return "Choose a field of interest so the recommendations feel specific.";
  }

  if (step === 4 && !form.experienceLevel.trim()) {
    return "Choose an experience level so Intrnd can match the project difficulty.";
  }

  if (step === 5 && !form.projectPreferences.trim()) {
    return "Choose the outcome you want from your first project.";
  }

  const weeklyHours = Number(form.weeklyHours);
  if (step === 6 && (!Number.isInteger(weeklyHours) || weeklyHours < 1 || weeklyHours > 40)) {
    return "Choose a weekly availability from 1 to 40 hours.";
  }

  if (step === 6 && !["GUIDED", "STANDARD", "ACCELERATED"].includes(form.supportLevel)) {
    return "Choose a guidance level.";
  }

  return "";
}

function titleCase(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Standard";
}
