# Executed verification — 12 October 2026

Environment: Windows, Node.js 22.17.0, npm 10.8.1, locally installed MongoDB 7, real disk-backed isolated databases.

Result: **2 test groups passed, 0 failed, 0 skipped**. Final automated run completed in approximately 11.4 seconds. Full local TAP output is saved in ignored `.local/acceptance-results.txt`.

Passed checks:

- All six API routes and specified success/error statuses.
- Registration of distinct A/B employees, normalized emails, duplicate rejection, concurrent duplicate registration, bcrypt storage and no password hashes in responses.
- Valid login with expiring JWT, wrong-password/unknown-account rejection, missing/tampered/expired/wrong-secret/wrong-algorithm/non-expiring token rejection, malformed token subjects and deleted/nonexistent employee rejection.
- Anonymous enquiry creation, required-field/email/type validation, ownership-field injection ignored with null ownership/time persisted.
- Missing authentication rejected on every protected route; empty lists return 200 with empty arrays.
- Both employees see unclaimed enquiries. Claim removes the enquiry from both shared lists; only its owner's list includes it.
- Repeat/competing claims return 409, preserve owner, and disclose no owner identity.
- Five concurrent A/B claim races: exactly one 200 and one 409 per race, persisted owner matches the winner, loser cannot retrieve it through their list.
- Malformed IDs return 400, missing IDs return 404, no unrestricted detail endpoint.
- Malformed JSON returns 400, oversized body returns 413, no stack traces in responses.
- HTTP server stopped/restarted: claimed ownership/time and unclaimed enquiries persisted in real MongoDB.
- Missing/invalid configuration rejected early.
- Clean `npm ci` from package-lock passed; npm reported zero known vulnerabilities.
- Documented `node --env-file=.env src/server.js` command (used by `npm start`) connected to MongoDB and served the protected endpoint with the expected anonymous 401.
- JavaScript syntax checks and `git diff --check` passed.

Reproduce: `powershell -ExecutionPolicy Bypass -File scripts/check-local.ps1`, or set `TEST_MONGODB_URI` to a reachable test-capable MongoDB server and run `npm test`. Tests create/drop only randomly named disposable databases.

Failed/blocked acceptance checks: none on the final run. Submission portal requirements/deadline were not provided, so no submission was performed. Separate React assignment, deployment and undisclosed evaluator checks are outside this backend delivery. Distributed rate limiting and reverse-proxy configuration remain deployment-specific; see README.
