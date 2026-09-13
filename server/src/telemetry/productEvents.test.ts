import assert from "node:assert/strict";
import { buildProductEventDedupeKey, sanitizeEventProperties } from "./productEvents.js";

assert.deepEqual(
  sanitizeEventProperties({ rank: 1, matchBand: "STRONG", prompt: "private", evidence: "private", nested: { secret: true } }),
  { rank: 1, matchBand: "STRONG" },
);
assert.deepEqual(
  sanitizeEventProperties({
    checkpointId: "P001:v1:scope",
    completionMode: "NOTE",
    estimatedMinutes: 90,
    supportLevel: "GUIDED",
    weeklyHours: 5,
    note: "private student reflection",
    evidence: "private upload",
    prompt: "private model prompt",
  }),
  { checkpointId: "P001:v1:scope", completionMode: "NOTE", estimatedMinutes: 90, supportLevel: "GUIDED", weeklyHours: 5 },
);
assert.deepEqual(
  sanitizeEventProperties({ checkpointId: "P001:v1:scope", helpful: false, issueCode: "UNCLEAR", comment: "private free-form feedback" }),
  { checkpointId: "P001:v1:scope", helpful: false, issueCode: "UNCLEAR" },
);
assert.equal(
  buildProductEventDedupeKey({ eventType: "PROJECT_STARTED", userId: "u1", cohortId: "c1", scope: "a1" }),
  "PROJECT_STARTED|u1|c1|a1",
);
assert.notEqual(
  buildProductEventDedupeKey({ eventType: "SUBMISSION_FINALIZED", userId: "u1", cohortId: "c1", scope: "s1" }),
  buildProductEventDedupeKey({ eventType: "SUBMISSION_FINALIZED", userId: "u1", cohortId: "c1", scope: "s2" }),
);
console.log("productEvents privacy tests passed");
