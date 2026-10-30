import assert from "node:assert/strict";
import {
  complaintOrigin,
  complaintHosts,
  complaintVerificationKey,
} from "../src/conduct/complaint-origin";
const configuration = {
  FRONTEND_URL:
    "https://unitedlinkgroup.com,https://www.unitedlinkgroup.com,https://unitedlinkgroup-1.onrender.com",
};
assert.equal(complaintOrigin(configuration), "https://www.unitedlinkgroup.com");
assert(complaintHosts(configuration).includes("www.unitedlinkgroup.com"));
assert(complaintHosts(configuration).includes("unitedlinkgroup.com"));
assert(!complaintHosts(configuration).includes("https"));
assert.equal(
  complaintOrigin({
    PUBLIC_WEB_URL: "https://customer.example",
    ...configuration,
  }),
  "https://customer.example",
);
assert.deepEqual(
  complaintHosts({
    TURNSTILE_ALLOWED_HOSTNAMES: "https://www.example.com/, example.com",
  }),
  ["www.example.com", "example.com"],
);
assert(!complaintHosts(configuration).includes("attacker.example"));
assert.equal(
  complaintOrigin({ FRONTEND_URL: "not a url" }),
  "https://www.unitedlinkgroup.com",
);
const original = complaintVerificationKey("submission", "expired-token"),
  fresh = complaintVerificationKey("submission", "fresh-human-token");
assert.notEqual(
  original,
  fresh,
  "a new challenge must not reuse a cached failure",
);
assert.equal(
  fresh,
  complaintVerificationKey("submission", "fresh-human-token"),
);
assert.notEqual(
  fresh,
  complaintVerificationKey("another-submission", "fresh-human-token"),
);
assert.match(
  fresh,
  /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
);
console.log(
  "Complaint hostname lists, canonical email links, explicit host restrictions and refreshed challenge retries passed",
);
