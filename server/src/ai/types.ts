export interface StudentContext {
  major: string | null;
  gradYear: number | null;
  school: string | null;
  careerInterests: string | null;
  targetRoles: string | null;
  currentSkills: string | null;
  skillsToBuild: string | null;
}

export interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  category: string | null;
  skills: string | null;
  difficulty: string | null;
  estimatedHours: string | null;
  deliverable: string | null;
  organizationName: string | null;
  opportunityType: string;
}

export interface RecommendationItem {
  projectId: string | null;
  title: string;
  matchScore: number;
  reasoning: string;
  skillGaps: string[];
  resumeImpact: string;
}

export interface RecommendationResponse {
  recommendations: RecommendationItem[];
}

export interface ProjectReviewFeedback {
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  missingProof: string[];
}

export interface ProjectReviewResponse {
  overallRating: number;
  resumeStrength: "WEAK" | "MODERATE" | "STRONG" | "EXCEPTIONAL";
  feedback: ProjectReviewFeedback;
  resumeBullets: string[];
  portfolioSummary: string;
  nextProjects: string[];
  skillsValidated: string[];
  skillsMissing: string[];
}

export interface ResumeBulletsResponse {
  bullets: string[];
}

export interface ExperienceScoreResponse {
  overallScore: number;
  projectQuality: number;
  skillCoverage: number;
  careerAlignment: number;
  summary: string;
  strengths: string[];
  weakAreas: string[];
  nextSteps: string[];
  competitive: boolean;
  competitiveExplanation: string;
  missingExperiences: string[];
}

export interface ParsedOpportunity {
  title: string;
  type: string;
  description: string;
  url: string | null;
  deadline: string | null;
  skills: string[];
  majors: string[];
  timeCommitment: string | null;
}

export interface OpportunityParseResponse {
  opportunities: ParsedOpportunity[];
}
