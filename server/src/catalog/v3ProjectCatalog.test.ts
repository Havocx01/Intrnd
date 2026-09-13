import assert from "node:assert/strict";
import { catalogSourceMetadataFor } from "./v3ProjectCatalog.js";

const cases = [
  ["At-home", "INTRND_CREATED", "Intrnd-created", "Intrnd"],
  ["Third-party", "THIRD_PARTY", "Third-party", null],
  ["Nonprofit/community", "COMMUNITY", "Community/nonprofit", null],
  ["On-campus", "ON_CAMPUS", "On-campus", null],
  ["Competition", "COMPETITION", "Competition-style", null],
  ["Research-style", "RESEARCH_STYLE", "Research-style", null],
  ["Local business", "LOCAL_BUSINESS", "Local-business", null],
] as const;

for (const [raw, sourceType, sourceLabel, organizationName] of cases) {
  assert.deepEqual(catalogSourceMetadataFor(raw), { sourceType, sourceLabel, organizationName, schoolName: null });
}

assert.deepEqual(catalogSourceMetadataFor("Unknown source"), {
  sourceType: "UNSPECIFIED",
  sourceLabel: "Source not specified",
  organizationName: null,
  schoolName: null,
});

console.log("v3ProjectCatalog provenance tests passed");
