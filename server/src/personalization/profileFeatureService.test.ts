import assert from "node:assert/strict";
import { buildProfileFeatures, PROFILE_FEATURE_VERSION, skillMatches } from "./profileFeatureService.js";

const first = buildProfileFeatures({
  major: "  Computer   Science ",
  careerInterests: "Software, software, Data",
  currentSkills: "JS, Postgres",
  experienceLevel: "beginner",
  skillsToBuild: "TypeScript, REST API",
  targetRoles: "Backend Engineer",
  roadmapDefaults: { weeklyHours: 7, supportLevel: "guided" },
});
const reordered = buildProfileFeatures({
  major: "computer science",
  careerInterests: "data, SOFTWARE",
  currentSkills: "postgresql; javascript",
  experienceLevel: "BEGINNER",
  skillsToBuild: "rest; ts",
  targetRoles: "backend engineer",
  roadmapDefaults: { weeklyHours: 7, supportLevel: "GUIDED" },
});

assert.equal(first.profileFeatureVersion, PROFILE_FEATURE_VERSION);
assert.deepEqual(first.features.currentSkills, ["javascript", "postgresql"]);
assert.equal(first.features.experienceLevel, "BEGINNER");
assert.deepEqual(first.features.desiredSkills, ["typescript", "rest api"]);
assert.equal(first.features.currentSkills.includes("typescript"), false, "desired skills must never become known skills");
assert.equal(first.features.major, "computer science");
assert.equal(first.features.weeklyHours, 7);
assert.equal(first.features.supportLevel, "GUIDED");
assert.equal(first.profileHash, reordered.profileHash, "equivalent saved profile values must share a stable hash");
assert.notEqual(first.profileHash, buildProfileFeatures({ currentSkills: "Python" }).profileHash);
assert.equal(skillMatches(first.features.currentSkills, "JavaScript"), true);
assert.equal(skillMatches(first.features.currentSkills, "TypeScript"), false);

console.log("profile feature normalization tests passed");
