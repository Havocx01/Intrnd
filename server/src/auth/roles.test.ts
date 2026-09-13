import assert from "node:assert/strict";
import { roleForOnboarding } from "./roles.js";

assert.equal(roleForOnboarding("ADMIN", "STUDENT"), "ADMIN");
assert.equal(roleForOnboarding("ADMIN", "ORGANIZATION"), "ADMIN");
assert.equal(roleForOnboarding("REVIEWER", "STUDENT"), "REVIEWER");
assert.equal(roleForOnboarding("REVIEWER", "ORGANIZATION"), "REVIEWER");
assert.equal(roleForOnboarding("STUDENT", "ORGANIZATION"), "ORGANIZATION");
assert.equal(roleForOnboarding("ORGANIZATION", "STUDENT"), "STUDENT");

console.log("role authorization tests passed");
