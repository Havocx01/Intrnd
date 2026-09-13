import assert from "node:assert/strict";
import { applyTransition, canEditSubmission } from "./applicationLifecycle.js";

assert.equal(applyTransition(null), "CREATE");
assert.equal(applyTransition("ACTIVE"), "UNCHANGED");
assert.equal(applyTransition("WITHDRAWN"), "REACTIVATE");
for (const status of ["SUBMITTED", "NEEDS_REVISION", "VERIFIED"]) assert.equal(applyTransition(status), "REJECT");
assert.equal(canEditSubmission("ACTIVE"), true);
assert.equal(canEditSubmission("NEEDS_REVISION"), true);
assert.equal(canEditSubmission("SUBMITTED"), false);
assert.equal(canEditSubmission("VERIFIED"), false);
assert.equal(canEditSubmission("WITHDRAWN"), false);
console.log("applicationLifecycle tests passed");
