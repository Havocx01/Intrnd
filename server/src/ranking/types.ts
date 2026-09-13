export interface StudentRankingProfile {
  major?: string | null;
  academic_major?: string | null;
  target_field?: string | null;
  field_of_interest?: string | null;
  field?: string | null;
  careerInterests?: string | null;
  career_interests?: string | string[] | number | null;
  targetRoles?: string | null;
  target_roles?: string | string[] | number | null;
  targetCompanies?: string | null;
  target_companies?: string | string[] | number | null;
  nicheInterests?: string | null;
  niche_interests?: string | string[] | number | null;
  experience_level?: string | null;
  desired_outcome?: string | null;
  currentSkills?: string | string[] | null;
  current_skills?: string | string[] | null;
  skillsToBuild?: string | string[] | null;
  skills_to_build?: string | string[] | null;
  available_time_per_week?: string | null;
  available_time?: string | null;
  weekly_time?: string | null;
  project_preferences?: string | null;
  preferred_project_type?: string | null;
  resume_strength?: number | null;
  [key: string]: unknown;
}

export type PersonalizationFactorKey =
  | "field"
  | "major"
  | "role"
  | "outcome"
  | "experience"
  | "skills"
  | "niche"
  | "environment"
  | "time"
  | "proof";

export interface PersonalizationFactor {
  key: PersonalizationFactorKey;
  label: string;
  score: number;
  maxScore: number;
  detail: string;
}

export interface InternalMatchDetails {
  matchedOn: string[];
  builds: string[];
  outcome: string;
  whyNow: string;
  factors: PersonalizationFactor[];
}

export interface AvailableProject {
  project_id: string;
  project_title: string;
  target_field?: string | null;
  difficulty?: string | null;
  estimated_time?: string | null;
  skills_learned?: string[] | string | null;
  deliverables?: string[] | string | null;
  resume_value_1_10?: number | string | null;
  portfolio_value_1_10?: number | string | null;
  verification_type?: string | null;
  source_type?: string | null;
  career_signal?: string | null;
  role_ids?: string[] | null;
  competency_ids?: string[] | null;
  portfolio_signal_ids?: string[] | null;
  recommended_experience_levels?: string[] | null;
  career_taxonomy_version?: string | null;
  [key: string]: unknown;
}

export interface RankProjectsRequest {
  student_profile: StudentRankingProfile;
  available_projects: AvailableProject[];
  field_intelligence?: Record<string, unknown>;
  resume_success_patterns?: Record<string, unknown>;
}

export interface CompactRankProjectsRequest extends RankProjectsRequest {
  field_intelligence: Record<string, unknown>;
  resume_success_patterns: Record<string, unknown>;
}
