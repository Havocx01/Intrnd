import assert from "node:assert/strict";
import { isAddedApplicationStatus } from "./applicationStatus.js";

for (const status of ["ACTIVE", "SUBMITTED", "NEEDS_REVISION", "VERIFIED"]) {
  assert.equal(isAddedApplicationStatus(status), true, `${status} should remain added`);
}
assert.equal(isAddedApplicationStatus("WITHDRAWN"), false);
assert.equal(isAddedApplicationStatus(null), false);
assert.equal(isAddedApplicationStatus(undefined), false);

console.log("application status display tests passed");
