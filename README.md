# Fastor CRM Backend

A Node.js REST API for employee/counselor accounts and prospective-student enquiries. Employees share unclaimed enquiries. Claiming an enquiry assigns one employee as its owner and removes it from the shared list. Only that employee sees it in their claimed-enquiries list.

Stack: Node.js 22+, Express 5, MongoDB/Mongoose, bcryptjs, JSON Web Tokens, Helmet, CORS and request rate limiting.

## 1. Project structure

```text
fastor-crm/
|-- src/
|   |-- app.js                 # Express routes, validation, JWT middleware, error handling
|   |-- config.js              # Environment configuration and startup validation
|   |-- models.js              # Employee/Enquiry schemas, indexes, response serializers
|   `-- server.js              # Connect MongoDB, initialize indexes, start/stop HTTP server
|-- test/
|   |-- config.test.js         # Invalid/missing configuration checks
|   `-- integration.test.js    # Real MongoDB API, ownership, race and restart checks
|-- scripts/
|   |-- start-mongo.ps1        # Start local MongoDB on port 27018 (Windows)
|   `-- check-local.ps1        # Start test MongoDB on port 27019, test, then stop it
|-- postman/
|   `-- Fastor-CRM.postman_collection.json
|-- .env.example              # Shareable environment placeholders
|-- .env                      # Local configuration/secrets; ignored by Git
|-- .gitignore
|-- package.json              # Scripts and dependencies
|-- package-lock.json         # Locked dependencies for npm ci
|-- README.md                 # This setup/API/testing guide
|-- VERIFICATION.md           # Previously executed verification results
|-- node_modules/             # Installed dependencies; ignored by Git
`-- .local/                   # Local database files/logs/test evidence; ignored by Git
    |-- mongo/
    `-- verification-mongo/
```

`.env`, `node_modules` and `.local` are generated/local files and are excluded from the source ZIP.

## 2. Requirements covered

| Assignment requirement | Implementation |
| --- | --- |
| Node.js backend and Express | Express REST API in src/app.js |
| PostgreSQL/MySQL/MongoDB database | Persistent MongoDB |
| JWT token authentication | Signed HS256 tokens with expiry, issuer and audience verification |
| Employee registration/login | POST /api/auth/register and POST /api/auth/login |
| Public enquiry form without authentication | POST /api/enquiries |
| Fetch unclaimed leads | GET /api/enquiries/unclaimed |
| Claim leads | PATCH /api/enquiries/:id/claim |
| Fetch leads owned by logged-in employee | GET /api/enquiries/mine |
| Claimed leads hidden from other employees | Owner-filtered list; claimed leads removed from shared list |

The delivery covers the backend assignment. No frontend, deployment or portal submission is included.

## 3. Setup and startup

### Prerequisites

- Node.js 22 or newer and npm.
- MongoDB 7 or newer installed locally, or a reachable MongoDB Atlas instance.
- Postman for manual API testing.

The local Windows helper defaults to `C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe`.

### Install dependencies

From PowerShell:

```powershell
cd E:\full_stack_project\fastor-crm
npm ci
```

### Configure .env

If `.env` already exists in your working folder, keep it. For a new checkout, create it:

```powershell
Copy-Item .env.example .env
```

Generate a random JWT secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

For the local MongoDB helper, edit `.env` to use:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27018/fastor_crm
JWT_SECRET=replace-this-with-the-generated-random-secret
JWT_EXPIRES_IN=1h
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
```

The displayed secret is a placeholder and must be replaced. Startup rejects secrets shorter than 32 characters and secrets starting with `replace-`.

| Variable | Purpose |
| --- | --- |
| MONGODB_URI | Required MongoDB connection URL; use port 27018 with npm run db |
| JWT_SECRET | Required random signing secret, at least 32 characters |
| JWT_EXPIRES_IN | Token lifetime; default 1h; positive durations such as 30m or 1h |
| PORT | HTTP port; default 3000 |
| CORS_ORIGINS | Optional comma-separated allowed browser origins |
| TEST_MONGODB_URI | MongoDB connection used by automated tests; passed through the shell |

`.env.example` uses port 27017 as a general MongoDB default. Change it to 27018 when using `npm run db`. An existing MongoDB service on 27017 or Atlas can also be used by setting its connection URL; in that case the local helper is unnecessary.

### Start MongoDB: terminal 1

```powershell
cd E:\full_stack_project\fastor-crm
npm run db
```

Keep this terminal open. If the project's MongoDB instance is already running on 27018, use that instance rather than starting another one.

To specify another MongoDB executable:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-mongo.ps1 -MongodPath 'C:\path\to\mongod.exe'
```

For Linux/macOS, run your installed MongoDB service or use Atlas; `npm run db` is a Windows helper.

### Start the API: terminal 2

```powershell
cd E:\full_stack_project\fastor-crm
npm start
```

Expected output:

```text
Fastor CRM listening on port 3000
```

Development mode: `npm run dev`. Stop the API with Ctrl+C. Missing/invalid configuration or an unavailable database causes startup to fail. Database indexes are initialized before the server accepts requests.

## 4. Postman configuration

**Base URL:** `http://localhost:3000`

Select the HTTP method using the dropdown to the left of the URL. Enter only the URL in the URL field. For example, select POST and enter `http://localhost:3000/api/auth/register`; do not type `POST` inside the URL field.

For JSON requests, select **Body > raw > JSON**. Postman adds `Content-Type: application/json`; confirm it in Headers. For GET requests and the claim request, select **Body > none**.

For protected requests, select **Authorization > Bearer Token** and paste the full login token, without quotes or the word `Bearer`. Postman generates `Authorization: Bearer <token>` automatically. Avoid adding a second conflicting Authorization header manually.

### Optional Postman environment

Create/select an environment and define:

| Variable | Value |
| --- | --- |
| baseUrl | http://localhost:3000 |
| tokenA | Employee A's data.token from login |
| tokenB | Employee B's data.token from login |
| enquiryId | data.enquiry.id from anonymous enquiry creation |

URLs may then use `{{baseUrl}}`, `{{enquiryId}}`, and Bearer Token fields may use `{{tokenA}}` or `{{tokenB}}`. If a variable is unresolved, select the correct environment or paste the literal URL/token instead.

### Import the included collection

In Postman, import `postman/Fastor-CRM.postman_collection.json`. Its collection variables include baseUrl, token, enquiryId, employeeEmail and employeePassword. Successful login automatically saves the collection's token; successful submission saves enquiryId. The included protected requests use that single token variable.

For two-employee checks, save both login tokens and explicitly change each protected request's Bearer Token field to `{{tokenA}}` or `{{tokenB}}` in your selected environment. The detailed instructions below work with manual requests too.

## 5. API reference

| Method | Full URL | Authentication | Success |
| --- | --- | --- | --- |
| POST | http://localhost:3000/api/auth/register | No Auth | 201 |
| POST | http://localhost:3000/api/auth/login | No Auth | 200 |
| POST | http://localhost:3000/api/enquiries | No Auth | 201 |
| GET | http://localhost:3000/api/enquiries/unclaimed | Bearer token | 200 |
| PATCH | http://localhost:3000/api/enquiries/:id/claim | Bearer token | 200 |
| GET | http://localhost:3000/api/enquiries/mine | Bearer token | 200 |

Successful responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": { "message": "..." } }`. List responses contain arrays directly in data. Sample IDs/timestamps below are placeholders; use actual values returned by your server.

### API 1: Register employee

**Method:** POST  
**URL:** `http://localhost:3000/api/auth/register`  
**Authorization:** No Auth

Header:

```text
Content-Type: application/json
```

Body for employee A:

```json
{
  "name": "Counselor A",
  "email": "counselor.a@example.com",
  "password": "StrongPassword123!"
}
```

Expected **201 Created**:

```json
{
  "success": true,
  "data": {
    "employee": {
      "id": "<employee-A-id>",
      "name": "Counselor A",
      "email": "counselor.a@example.com",
      "createdAt": "<timestamp>"
    }
  }
}
```

Repeat with employee B's body:

```json
{
  "name": "Counselor B",
  "email": "counselor.b@example.com",
  "password": "StrongPassword123!"
}
```

A duplicate email returns **409** with `Email is already registered`. If these accounts already exist from earlier testing, proceed to login or use new email addresses.

### API 2: Employee login

**Method:** POST  
**URL:** `http://localhost:3000/api/auth/login`  
**Authorization:** No Auth

Header:

```text
Content-Type: application/json
```

Body:

```json
{
  "email": "counselor.a@example.com",
  "password": "StrongPassword123!"
}
```

Expected **200 OK**:

```json
{
  "success": true,
  "data": {
    "token": "<full-jwt-token>",
    "tokenType": "Bearer",
    "employee": {
      "id": "<employee-A-id>",
      "name": "Counselor A",
      "email": "counselor.a@example.com",
      "createdAt": "<timestamp>"
    }
  }
}
```

Save data.token as tokenA. Repeat with `counselor.b@example.com` and save its token as tokenB. A wrong password that meets input validation returns **401** with `Invalid email or password`. Invalid/missing input returns **400**.

### API 3: Submit public enquiry

**Method:** POST  
**URL:** `http://localhost:3000/api/enquiries`  
**Authorization:** No Auth; no Authorization header is required

Header:

```text
Content-Type: application/json
```

Body:

```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "courseInterest": "Full Stack Development"
}
```

Expected **201 Created**:

```json
{
  "success": true,
  "data": {
    "enquiry": {
      "id": "<enquiry-id>",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "courseInterest": "Full Stack Development",
      "claimedBy": null,
      "claimedAt": null,
      "createdAt": "<timestamp>"
    }
  }
}
```

Save data.enquiry.id as enquiryId. Missing name/email/courseInterest or an invalid email returns **400**. Optional extra fields are ignored; claimedBy, claimedAt and employeeId cannot be injected through this form.

### API 4: Fetch unclaimed enquiries

**Method:** GET  
**URL:** `http://localhost:3000/api/enquiries/unclaimed`  
**Authorization:** Bearer Token `{{tokenA}}`  
**Body:** none

Generated header:

```text
Authorization: Bearer <employee-A-token>
```

Expected **200 OK**:

```json
{
  "success": true,
  "data": [
    {
      "id": "<enquiry-id>",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "courseInterest": "Full Stack Development",
      "claimedBy": null,
      "claimedAt": null,
      "createdAt": "<timestamp>"
    }
  ]
}
```

Repeat with tokenB. Both employees must see the enquiry before it is claimed. Empty results are **200** with `"data": []`. Missing/invalid/expired authentication returns **401**.

### API 5: Claim an enquiry

**Method:** PATCH (not GET or POST)  
**URL:** `http://localhost:3000/api/enquiries/{{enquiryId}}/claim`  
**Authorization:** Bearer Token `{{tokenA}}`  
**Body:** none

Replace {{enquiryId}} with the actual returned ID if not using variables. Do not keep the literal `:id` placeholder from the route table.

Generated header:

```text
Authorization: Bearer <employee-A-token>
```

Expected **200 OK**:

```json
{
  "success": true,
  "data": {
    "enquiry": {
      "id": "<enquiry-id>",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "courseInterest": "Full Stack Development",
      "claimedBy": "<employee-A-id>",
      "claimedAt": "<timestamp>",
      "createdAt": "<timestamp>"
    }
  }
}
```

Ownership comes from the verified JWT. Repeat with A or B: expect **409 Conflict**; ownership must remain A's.

```json
{
  "success": false,
  "error": {
    "message": "Enquiry is already claimed"
  }
}
```

Malformed ID: **400**. Valid-format ID not present in the database: **404**. Missing/invalid token: **401**.

### API 6: Fetch my claimed enquiries

**Method:** GET  
**URL:** `http://localhost:3000/api/enquiries/mine`  
**Authorization:** Bearer Token `{{tokenA}}`  
**Body:** none

Generated header:

```text
Authorization: Bearer <employee-A-token>
```

Expected **200 OK**: data is an array of enquiry objects with the same fields shown above. Employee A's list includes the claimed enquiry. Repeat with tokenB: B's list must exclude it. If B owns no leads:

```json
{
  "success": true,
  "data": []
}
```

There is no unrestricted single-enquiry detail endpoint.

## 6. Manual acceptance test: run in this order

1. Register employees A and B, then log in both. Save tokenA, tokenB and their employee IDs.
2. Submit an enquiry using No Auth. Save its enquiryId; claimedBy and claimedAt must be null.
3. GET /api/enquiries/unclaimed with A's token, then B's token. Both must see that enquiry.
4. PATCH /api/enquiries/{{enquiryId}}/claim with A's token. Expect 200 and claimedBy equal to A's ID.
5. GET /api/enquiries/unclaimed with each token. Neither list may contain the claimed enquiry.
6. GET /api/enquiries/mine with A's token. A must see it.
7. GET /api/enquiries/mine with B's token. B must not see it.
8. Repeat the claim with B and then A. Both must return 409 without changing its owner.
9. Stop/restart the API using Ctrl+C and npm start, leaving MongoDB running. A's enquiry and ownership must persist.
10. Submit a fresh enquiry before repeating the claim workflow; an already claimed enquiry cannot be claimed again.

### Negative/security checks

| Check | Request change | Expected |
| --- | --- | --- |
| Duplicate employee | Register the same email again, including alternate casing | 409 |
| Wrong password | Login with WrongPassword123! | 401 |
| Invalid form | Remove courseInterest or use email "invalid" | 400 |
| Missing auth | Select No Auth for either list or claim route | 401 |
| Invalid JWT | Use invalid-token as the Bearer token | 401 |
| Ownership injection | Add claimedBy/claimedAt/employeeId to an anonymous enquiry body | 201; ownership/time remain null |
| Malformed ID | PATCH /api/enquiries/abc/claim with a valid token | 400 |
| Missing ID | PATCH /api/enquiries/000000000000000000000000/claim with a valid token | 404 if that ID is absent |
| Wrong method | GET /api/enquiries/<actual-id>/claim | 404 Route not found |
| Malformed JSON | Send invalid raw JSON with application/json | 400 |
| No owned/shared results | Fetch either applicable empty list | 200 with data [] |

For simultaneous claiming, submit a fresh enquiry and send PATCH requests using A/B tokens concurrently. Exactly one request must return 200 and the other 409. The automated suite performs five such races and verifies the database owner.

## 7. Automated tests

With MongoDB already running on 27018:

```powershell
cd E:\full_stack_project\fastor-crm
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27018'
npm test
```

Or start/stop a separate isolated test MongoDB instance automatically:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-local.ps1
```

The helper defaults to MongoDB port 27019. Pass `-MongoPort` or `-MongodPath` if needed. npm test does not automatically load .env; set TEST_MONGODB_URI in the shell or use the helper. Without it, tests default to port 27017.

The suite creates a random disposable database, starts the real API on a free port, runs checks, and drops only that test database. It never drops fastor_crm. It verifies all six routes, hashing, duplicate registration races, anonymous submissions, authentication errors/expiry/algorithm, ownership injection, visibility, repeat claims, five concurrent claim races, ID/input validation, JSON errors and persistence after HTTP server restart. Configuration checks also cover invalid/missing URLs, secrets, ports and expiry settings.

Previous executed results: **2 test groups passed, 0 failed, 0 skipped**. See VERIFICATION.md. A local TAP transcript is stored in ignored .local/acceptance-results.txt.

## 8. Common issues

| Problem | Fix |
| --- | --- |
| Cannot connect to MongoDB | Start the configured MongoDB instance; check that .env uses the correct host/port. npm run db uses 27018. |
| Route not found on registration | Select POST, use exactly /api/auth/register, remove trailing whitespace/newlines from the URL. |
| Route not found on claim | Select PATCH and use /api/enquiries/<actual-id>/claim. |
| 401 Valid bearer authentication is required | Log in, copy the complete data.token, use Authorization > Bearer Token. Log in again if expired. |
| ENOTFOUND or unresolved {{baseUrl}} | Set/select the environment or use http://localhost:3000 directly; do not type the method in the URL. |
| 409 Email is already registered | Log in with that account or register a different email. |
| 409 Enquiry is already claimed | Create a new enquiry for another successful claim test. |
| data is an empty array | No matching enquiries exist; submit a new enquiry or check the employee token. |
| 429 Too many requests | Auth routes share 30 requests per 15 minutes per IP; public submissions have a separate 30-request limit; general API limit is 300. Wait for reset before more manual testing. |
| MongoDB port/data directory already in use | Use the already-running instance; do not launch another process against the same database directory. |
| HTTP port already in use | Stop the existing API you started or choose a free PORT and update Postman baseUrl. |

## 9. Data models and validation

**Employee:** id, name, normalized unique email, passwordHash, createdAt. Password hashes are excluded from all API responses.

**Enquiry:** id, name, email, courseInterest, claimedBy (null initially), claimedAt (null initially), createdAt.

Names allow 1-120 trimmed characters, courseInterest 1-200, emails up to 254 with basic format validation. Emails are trimmed/lowercased. Passwords require at least 8 characters and at most 72 UTF-8 bytes. Unknown request fields are ignored; public form fields are explicitly whitelisted.

Claim eligibility and assignment are one MongoDB operation:

```javascript
Enquiry.findOneAndUpdate(
  { _id: enquiryId, claimedBy: null },
  { $set: { claimedBy: authenticatedEmployeeId, claimedAt: new Date() } },
  { new: true, runValidators: true }
);
```

Only one concurrent claimant can update the matching enquiry. A failed update uses an existence-only query to distinguish 404 from 409. claimedBy is the only ownership source of truth; no redundant public/private flag is stored.

## 10. Security and operation

- bcrypt password hashing with cost 12.
- JWT signature/HS256/issuer/audience/expiry/subject verification, followed by employee lookup.
- Helmet response headers, 16 KB JSON limit, optional explicit CORS origins and rate limits.
- Consistent error responses without internal stack traces; claim conflicts disclose no owner identity.
- Local secrets, dependencies and database files excluded from Git/source archive.
- SIGINT/SIGTERM shutdown closes HTTP and MongoDB connections.

Before deployment configure HTTPS, authenticated/private MongoDB access, backups and secret management. Rate-limit counters are process-local; multiple API replicas require a shared store. Configure Express proxy trust for the actual proxy topology. Public employee registration follows the assignment contract.
