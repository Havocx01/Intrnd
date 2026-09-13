import type { ProjectSummary, StudentContext } from "./types.js";

export function buildRecommendationPrompt(student: StudentContext, projects: ProjectSummary[], completedSummary: string): string {
  const projectList = projects
    .map(
      (p) =>
        `- ID: ${p.id} | "${p.title}" | Category: ${p.category ?? "General"} | Skills: ${p.skills ?? "Various"} | Difficulty: ${p.difficulty ?? "Medium"} | Hours: ${p.estimatedHours ?? "Unknown"} | Deliverable: ${p.deliverable ?? "Project output"}`,
    )
    .join("\n");

  return `You are an AI career advisor for college students. Given a student's profile, recommend 5 projects they should work on next.

Student Profile:
- Major: ${student.major ?? "Undeclared"}
- Year: ${student.gradYear ?? "Unknown"}
- School: ${student.school ?? "Unknown"}
- Career interests: ${student.careerInterests ?? "Exploring"}
- Target roles: ${student.targetRoles ?? "Not specified"}
- Current skills: ${student.currentSkills ?? "Not specified"}
- Skills to build: ${student.skillsToBuild ?? "Not specified"}
- Completed projects: ${completedSummary || "None yet"}

Available projects in our catalogue:
${projectList || "No projects available"}

For each recommendation, return JSON:
{
  "recommendations": [
    {
      "projectId": "id or null if custom suggestion",
      "title": "project title",
      "matchScore": 0.0-1.0,
      "reasoning": "2 sentences explaining why this is right for the student",
      "skillGaps": ["skills this builds that student is missing"],
      "resumeImpact": "how this helps their resume for target roles"
    }
  ]
}

Rules:
- Prioritize projects that fill skill gaps for target roles
- Mix difficulty levels (1-2 stretch projects, 2-3 achievable ones)
- Prefer unique projects over common ones (avoid generic to-do apps, calculators)
- If fewer than 5 catalogue projects match, suggest custom project ideas with null projectId
- Be honest - don't recommend projects that won't help for their target roles
- Return ONLY valid JSON, no markdown formatting`;
}

export function buildProjectReviewPrompt(
  experience: {
    title: string;
    description: string | null;
    experienceType: string;
    skills: string | null;
    evidenceUrl: string | null;
    outcome: string | null;
  },
  student: StudentContext,
): string {
  return `You are a strict but constructive career advisor reviewing a student's completed project. Rate honestly - most students over-estimate their project quality.

Student's submitted project:
- Title: ${experience.title}
- Description: ${experience.description ?? "No description provided"}
- Type: ${experience.experienceType}
- Skills used: ${experience.skills ?? "Not specified"}
- Evidence URL: ${experience.evidenceUrl ?? "None provided"}
- Outcome: ${experience.outcome ?? "Not specified"}

Student context:
- Major: ${student.major ?? "Undeclared"}
- Target roles: ${student.targetRoles ?? "Not specified"}

Provide a review as JSON:
{
  "overallRating": 1-10,
  "resumeStrength": "WEAK" | "MODERATE" | "STRONG" | "EXCEPTIONAL",
  "feedback": {
    "strengths": ["what's good about this project"],
    "weaknesses": ["honest gaps or problems"],
    "improvements": ["specific actionable suggestions"],
    "missingProof": ["evidence/assets the student should add"]
  },
  "resumeBullets": [
    "3 example resume bullet points using strong action verbs and quantified impact"
  ],
  "portfolioSummary": "2-3 sentence portfolio description",
  "nextProjects": ["2-3 suggestions for what to build next based on gaps"],
  "skillsValidated": ["skills this project actually demonstrates"],
  "skillsMissing": ["skills the student claims but project doesn't prove"]
}

Rules:
- Be honest. A to-do app with no users is a 3/10, not a 7.
- Resume bullets must use action verbs and include scope/impact.
- Missing proof = no link, no screenshots, no metrics, no users.
- Rate relative to what hiring managers at target companies expect.
- Return ONLY valid JSON, no markdown formatting`;
}

export function buildResumeBulletsPrompt(
  experience: { title: string; description: string | null; skills: string | null; outcome: string | null },
  targetRoles: string | null,
): string {
  return `Write 3 resume bullet points for this project. Each bullet must:
1. Start with a strong action verb
2. Include the what (deliverable/output)
3. Include scope or impact (quantified if possible)
4. Be 1 line, under 120 characters

Project: ${experience.title}
Description: ${experience.description ?? "No description"}
Skills: ${experience.skills ?? "Not specified"}
Outcome: ${experience.outcome ?? "Not specified"}
Target role: ${targetRoles ?? "General"}

Return JSON: { "bullets": ["bullet1", "bullet2", "bullet3"] }
Return ONLY valid JSON, no markdown formatting`;
}

export function buildExperienceScorePrompt(student: StudentContext, experiencesList: string): string {
  return `You are a career advisor reviewing a student's complete experience portfolio. Assess whether they are competitive for their target internships.

Student Profile:
- Major: ${student.major ?? "Undeclared"}, ${student.gradYear ?? "Unknown year"}
- Target roles: ${student.targetRoles ?? "Not specified"}
- School: ${student.school ?? "Unknown"}

All experiences:
${experiencesList || "No experiences recorded yet."}

Provide assessment as JSON:
{
  "overallScore": 0-100,
  "projectQuality": 0-100,
  "skillCoverage": 0-100,
  "careerAlignment": 0-100,
  "summary": "3 sentence honest assessment",
  "strengths": ["what's working"],
  "weakAreas": ["specific gaps"],
  "nextSteps": ["top 3 things to do next, in priority order"],
  "competitive": true or false,
  "competitiveExplanation": "honest assessment of competitiveness for target roles",
  "missingExperiences": ["types of experience they should seek"]
}

Rules:
- Compare against typical successful applicants for their target roles
- Be honest about competitiveness - most students are NOT ready after 1-2 projects
- Score 50 = average applicant, 70 = competitive, 85+ = exceptional
- Factor in major, school reputation, and role competitiveness
- Return ONLY valid JSON, no markdown formatting`;
}

export function buildOpportunityParsePrompt(url: string, schoolName: string, pageContent: string): string {
  return `Extract structured opportunity data from this university webpage content.

Page URL: ${url}
School: ${schoolName}
Raw content:
${pageContent.slice(0, 8000)}

Extract all student opportunities (clubs, competitions, research labs, project teams, hackathons, organizations). Return JSON:
{
  "opportunities": [
    {
      "title": "name of opportunity",
      "type": "COMPETITION" | "CLUB" | "RESEARCH" | "HACKATHON" | "PROJECT_TEAM" | "ORGANIZATION",
      "description": "1-2 sentence description",
      "url": "direct link if available",
      "deadline": "date string or null",
      "skills": ["relevant skills"],
      "majors": ["relevant majors or ALL"],
      "timeCommitment": "estimated hours/week or null"
    }
  ]
}

Rules:
- Only include real opportunities with enough info to be useful
- Skip generic links, navigation items, or unrelated content
- If the page has no extractable opportunities, return empty array
- Return ONLY valid JSON, no markdown formatting`;
}
