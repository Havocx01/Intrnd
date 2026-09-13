import assert from "node:assert/strict";
import { rankCatalogProjectsWithRules, rankProjectsWithRules, RANKER_VERSION } from "./rankingService.js";
import { PERSONALIZATION_FACTOR_WEIGHTS } from "./personalizationScorer.js";

assert.deepEqual(PERSONALIZATION_FACTOR_WEIGHTS, {
  field: 25,
  major: 12,
  role: 15,
  outcome: 10,
  experience: 10,
  skills: 8,
  niche: 7,
  environment: 5,
  time: 4,
  proof: 4,
});

const input = {
  student_profile: { major: "Computer Science", currentSkills: ["JavaScript"], skillsToBuild: ["APIs"] },
  available_projects: [
    {
      project_id: "P002",
      project_title: "Marketing plan",
      target_field: "Marketing",
      skills_learned: ["Research"],
      deliverables: ["Report"],
    },
    {
      project_id: "P001",
      project_title: "Build a REST API",
      target_field: "Tech",
      skills_learned: ["JavaScript", "APIs"],
      deliverables: ["GitHub repository"],
      verification_type: "Intrnd review",
    },
    {
      project_id: "P003",
      project_title: "Data dashboard",
      target_field: "Data Analytics",
      skills_learned: ["SQL"],
      deliverables: ["Dashboard"],
    },
  ],
  field_intelligence: {},
  resume_success_patterns: {},
};

const first = rankProjectsWithRules(input);
const second = rankProjectsWithRules(input);
assert.deepEqual(first, second, "rules ranking must be deterministic");
assert.equal(first.rankerVersion, RANKER_VERSION);
assert.equal(first.rankedProjects[0].projectId, "P001");
assert.ok(first.rankedProjects.every((item) => item.reasonCodes.length > 0));
assert.ok(!JSON.stringify(first).includes("fit_percent"));
assert.ok(!JSON.stringify(first).includes("score_1_10"));

const catalogRanking = rankCatalogProjectsWithRules(
  { major: "Computer Science", careerInterests: "Backend software", currentSkills: "JavaScript", skillsToBuild: "APIs" },
  [
    {
      id: "P002",
      title: "Marketing plan",
      description: "Create a campaign plan.",
      sourceType: "INTRND_CREATED",
      category: "Marketing",
      estimatedHours: "2 weeks",
      difficulty: "BEGINNER",
      deliverable: "Report",
      skills: "Research",
      verificationType: "Intrnd review",
      verificationMethod: null,
      resumeValue: 5,
      proofQuality: 5,
    },
    {
      id: "P001",
      title: "Build a REST API",
      description: "Implement a backend API with JavaScript.",
      sourceType: "INTRND_CREATED",
      category: "Tech",
      estimatedHours: "3 weeks",
      difficulty: "BEGINNER",
      deliverable: "GitHub repository",
      skills: "JavaScript, APIs",
      verificationType: "Intrnd review",
      verificationMethod: null,
      resumeValue: 8,
      proofQuality: 8,
    },
  ],
);
assert.equal(catalogRanking.rankedProjects[0]?.projectId, "P001");
assert.ok(!JSON.stringify(catalogRanking).includes("fit_percent"));
assert.ok(!JSON.stringify(catalogRanking).includes("score_1_10"));
assert.ok(catalogRanking.rankedProjects[0]?.matchDetails.matchedOn.length);
assert.match(catalogRanking.rankedProjects[0]?.reason ?? "", /Computer Science|Backend software/i);

const personalizedCatalog = [
  {
    id: "AI-BEGINNER",
    title: "Accessible AI evaluation",
    description: "Evaluate an AI interface for accessibility and document model limitations.",
    sourceType: "INTRND_CREATED",
    category: "AI/ML",
    majorTags: "Computer Science",
    interestTags: "Accessible AI, responsible AI",
    skillTags: "Python, model evaluation, accessibility",
    estimatedHours: "3 weeks",
    difficulty: "BEGINNER",
    deliverable: "Portfolio case study and evaluation report",
    skills: "Python, model evaluation, accessibility",
    verificationType: "Intrnd review",
    verificationMethod: null,
    resumeValue: 8,
    proofQuality: 9,
  },
  {
    id: "AI-ADVANCED",
    title: "Advanced LLM training system",
    description: "Fine-tune and evaluate a language model training pipeline.",
    sourceType: "INTRND_CREATED",
    category: "AI/ML",
    majorTags: "Computer Science",
    interestTags: "Language models",
    skillTags: "Python, model training",
    estimatedHours: "8 weeks",
    difficulty: "ADVANCED",
    deliverable: "GitHub repository and technical report",
    skills: "Python, model training",
    verificationType: "Intrnd review",
    verificationMethod: null,
    resumeValue: 9,
    proofQuality: 9,
  },
  {
    id: "FINANCE",
    title: "Public company valuation",
    description: "Build a DCF model and investment recommendation.",
    sourceType: "INTRND_CREATED",
    category: "Finance",
    majorTags: "Finance",
    interestTags: "Investment banking, Goldman Sachs, valuation",
    skillTags: "Financial modeling, valuation",
    estimatedHours: "4 weeks",
    difficulty: "INTERMEDIATE",
    deliverable: "Excel model and investment memo",
    skills: "Financial modeling, valuation",
    verificationType: "Intrnd review",
    verificationMethod: null,
    resumeValue: 9,
    proofQuality: 8,
  },
];

const beginnerAi = rankCatalogProjectsWithRules(
  {
    major: "Computer Science",
    careerInterests: "AI/ML",
    targetRoles: "ML engineer",
    targetCompanies: "AI startup",
    nicheInterests: "Accessible AI",
    experienceLevel: "BEGINNER",
    projectPreferences: "Portfolio case study",
  },
  personalizedCatalog,
);
assert.equal(beginnerAi.rankedProjects[0]?.projectId, "AI-BEGINNER");
assert.match(beginnerAi.rankedProjects[0]?.reason ?? "", /AI\/ML|Accessible AI|portfolio/i);

const financeStudent = rankCatalogProjectsWithRules(
  {
    major: "Finance",
    careerInterests: "Investment banking",
    targetRoles: "Investment banking analyst",
    targetCompanies: "Goldman Sachs",
    nicheInterests: "Valuation",
    experienceLevel: "INTERMEDIATE",
    projectPreferences: "Internship preparation",
  },
  personalizedCatalog,
);
assert.equal(financeStudent.rankedProjects[0]?.projectId, "FINANCE");
assert.ok(financeStudent.rankedProjects[0]?.reasonCodes.includes("ROLE_ALIGNMENT"));
assert.ok(financeStudent.rankedProjects[0]?.reasonCodes.includes("NICHE_ALIGNMENT"));
assert.equal("factors" in (financeStudent.rankedProjects[0]?.matchDetails ?? {}), false);

const canonicalBase = {
  description: "Build and document a bounded technical artifact.",
  sourceType: "INTRND_CREATED",
  category: "Tech",
  estimatedHours: "3 weeks",
  difficulty: "INTERMEDIATE",
  deliverable: "Repository and report",
  skills: "API design",
  verificationType: "Intrnd review",
  verificationMethod: null,
  resumeValue: 8,
  proofQuality: 8,
  careerTaxonomyVersion: "career-v1",
  careerMappingVersion: 1,
};
const canonicalRoleRanking = rankCatalogProjectsWithRules({ targetRoles: "Backend engineer", experienceLevel: "INTERMEDIATE" }, [
  {
    ...canonicalBase,
    id: "EXACT",
    title: "Backend service",
    targetRoleIds: ["backend-developer"],
    competencyIds: ["rest-api-design", "authentication"],
    portfolioSignalIds: ["code-repository"],
    recommendedExperienceLevels: ["INTERMEDIATE"],
  },
  {
    ...canonicalBase,
    id: "RELATED",
    title: "API service",
    targetRoleIds: ["api-developer"],
    competencyIds: ["rest-api-design", "api-documentation"],
    portfolioSignalIds: ["code-repository"],
    recommendedExperienceLevels: ["INTERMEDIATE"],
  },
  {
    ...canonicalBase,
    id: "SAME-DOMAIN",
    title: "Frontend service",
    targetRoleIds: ["frontend-developer"],
    competencyIds: ["react-development", "responsive-web-design"],
    portfolioSignalIds: ["code-repository"],
    recommendedExperienceLevels: ["INTERMEDIATE"],
  },
  {
    ...canonicalBase,
    id: "UNRELATED",
    title: "Finance memo",
    targetRoleIds: ["financial-analyst"],
    competencyIds: ["financial-modeling", "sensitivity-analysis"],
    portfolioSignalIds: ["strategy-memo"],
    recommendedExperienceLevels: ["INTERMEDIATE"],
  },
]);
assert.equal(canonicalRoleRanking.rankedProjects[0]?.projectId, "EXACT", "exact canonical roles must outrank related and unrelated roles");
assert.deepEqual(
  canonicalRoleRanking.rankedProjects.map((project) => project.projectId),
  ["EXACT", "RELATED", "SAME-DOMAIN", "UNRELATED"],
  "canonical role strength must be exact, related, same-domain, then unrelated",
);
assert.ok(canonicalRoleRanking.rankedProjects[0]?.reasonCodes.includes("ROLE_ALIGNMENT"));

const competencyRanking = rankCatalogProjectsWithRules(
  { targetRoles: "Backend engineer", skillsToBuild: "REST API design", experienceLevel: "INTERMEDIATE" },
  [
    {
      ...canonicalBase,
      id: "API",
      title: "API project",
      targetRoleIds: ["backend-developer"],
      competencyIds: ["rest-api-design", "api-documentation"],
      portfolioSignalIds: ["code-repository"],
      recommendedExperienceLevels: ["INTERMEDIATE"],
    },
    {
      ...canonicalBase,
      id: "UI",
      title: "UI project",
      targetRoleIds: ["backend-developer"],
      competencyIds: ["react-development", "responsive-web-design"],
      portfolioSignalIds: ["code-repository"],
      recommendedExperienceLevels: ["INTERMEDIATE"],
    },
  ],
);
assert.equal(competencyRanking.rankedProjects[0]?.projectId, "API", "desired skills must use canonical competency mappings");
assert.ok(competencyRanking.rankedProjects[0]?.matchDetails.builds.includes("REST API design"));

const knownSkillOnly = rankCatalogProjectsWithRules(
  { targetRoles: "Backend engineer", currentSkills: "React", experienceLevel: "INTERMEDIATE" },
  [
    {
      ...canonicalBase,
      id: "KNOWN",
      title: "Known skill",
      targetRoleIds: ["backend-developer"],
      competencyIds: ["react-development", "responsive-web-design"],
      portfolioSignalIds: ["code-repository"],
      recommendedExperienceLevels: ["INTERMEDIATE"],
    },
  ],
);
assert.equal(
  knownSkillOnly.rankedProjects[0]?.reasonCodes.includes("SKILL_BUILDING"),
  false,
  "current skills must not be presented as desired growth gaps",
);

const domainFixtures = [
  ["TECH", "Technology", "Software engineer", "INTERMEDIATE"],
  ["FIN", "Finance", "Investment banking analyst", "ADVANCED"],
  ["HEALTH", "Healthcare", "Public health analyst", "BEGINNER"],
  ["LEGAL", "Legal and policy", "Policy analyst", "INTERMEDIATE"],
  ["DESIGN", "UX design", "Product designer", "BEGINNER"],
  ["EDU", "Education", "Curriculum designer", "INTERMEDIATE"],
  ["MEDIA", "Media and communications", "Communications specialist", "BEGINNER"],
  ["ENG", "Mechanical engineering", "Mechanical engineer", "ADVANCED"],
] as const;
const crossDomainCatalog = domainFixtures.map(([id, category, role, difficulty]) => ({
  id,
  title: `${category} portfolio project`,
  description: `Complete a ${category} project for a ${role}.`,
  sourceType: "INTRND_CREATED",
  category,
  majorTags: category,
  interestTags: role,
  skillTags: category,
  estimatedHours: "3 weeks",
  difficulty,
  deliverable: "Portfolio case study",
  skills: category,
  verificationType: "Intrnd review",
  verificationMethod: null,
  resumeValue: 8,
  proofQuality: 8,
}));
for (const [id, category, role, difficulty] of domainFixtures) {
  const result = rankCatalogProjectsWithRules(
    { major: category, careerInterests: category, targetRoles: role, experienceLevel: difficulty, projectPreferences: "Portfolio" },
    crossDomainCatalog,
  );
  assert.equal(result.rankedProjects[0]?.projectId, id, `${category} fixture must stay within its domain`);
}

const availabilityCatalog = [
  { ...crossDomainCatalog[0], id: "LONG", title: "Long software engineering project", estimatedHours: "8 weeks" },
  { ...crossDomainCatalog[0], id: "SHORT", title: "Short software engineering project", estimatedHours: "1 week" },
];
const lowAvailability = rankProjectsWithRules({
  student_profile: { target_field: "Technology", target_roles: ["Software engineer"], available_time_per_week: "3 hours" },
  available_projects: availabilityCatalog.map((project) => ({
    project_id: project.id,
    project_title: project.title,
    target_field: project.category,
    difficulty: project.difficulty,
    estimated_time: project.estimatedHours,
    skills_learned: ["Technology"],
    deliverables: ["Portfolio case study"],
    resume_value_1_10: 8,
    portfolio_value_1_10: 8,
  })),
});
assert.equal(lowAvailability.rankedProjects[0]?.projectId, "SHORT", "weekly availability must favor feasible timing");

const perfCatalog = Array.from({ length: 139 }, (_, index) => ({
  ...crossDomainCatalog[index % crossDomainCatalog.length],
  id: `PERF-${String(index).padStart(3, "0")}`,
}));
const startedAt = performance.now();
rankCatalogProjectsWithRules({ major: "Computer Science", careerInterests: "Software", experienceLevel: "INTERMEDIATE" }, perfCatalog);
assert.ok(performance.now() - startedAt < 200, "full-catalog deterministic ranking must complete under 200 ms locally");
console.log("rankingService tests passed");
