# Array of Sunshine Support — full-stack customer support app

A React/TypeScript frontend connected to a real Node.js HTTP backend and persistent SQLite database.
Business owners sign in with a password, manage approved FAQs, read conversations, and follow up
on inquiries. Visitors use a chat widget that answers from approved information or offers human handoff.

**The default app runs on your own computer without paid services, AWS credentials, or model calls.**
The assistant uses deterministic FAQ matching, not a generative AI model. Real authentication and
server-side persistence are implemented. This is a local portfolio application, not a production-hosted service.

## Run on Windows PowerShell

Requires **Node.js 24** and npm (SQLite is built into Node). No separate database installation.

```powershell
git clone https://github.com/mustafa-sarwari/array-of-sunshine-support.git
Set-Location array-of-sunshine-support
npm ci
npm run dev
```

If you already have the project:

```powershell
Set-Location "D:\AWS Project"
git pull --ff-only
npm ci
# Clear an old shell setting that selected the browser-only demo.
Remove-Item Env:VITE_BACKEND -ErrorAction SilentlyContinue
npm run dev
```

If an existing `.env.local` sets `VITE_BACKEND=local`, change it to `server` or remove that line.
Open **http://localhost:5173/**. This command starts Vite and the real backend on port 3001.
Stop old servers on those ports first (Ctrl+C in their terminal). Closing the new terminal stops both.

On the first backend startup, the terminal prints a randomly generated password for each fictional
sample owner. Save those passwords locally; they are shown only once:

- `owner@maplestreetbakery.demo`
- `owner@harborbikes.demo`

Use those credentials on the Owner sign-in page. There is no one-click authentication bypass.
Passwords are stored as salted scrypt hashes; session cookies are HttpOnly and SameSite=Strict,
expire after eight hours, and are revoked at sign-out. Session tokens are hashed in SQLite.

The database is created at `data/support.sqlite`, excluded from Git. It contains private conversations
and credentials; do not commit it. To reset this fictional local dataset and generate new passwords,
stop the server and delete the `data` folder, then restart. **This deletes the saved local data.**

## Features

- Password sign-in, server sessions, and server-enforced business membership.
- Approved FAQ create/edit/delete, draft exclusion, and answer preview.
- Public chat config, conversation creation, private visitor transcripts, and NDJSON replies.
- Inquiry handoff, status updates, conversations, and unanswered-question workflow.
- SQLite persistence across server restarts and across different browsers.
- Two fictional sample businesses, with tenant isolation enforced by the backend.
- Responsive dashboard and chat interface.
- Standalone `widget.js` built separately; configurable API endpoint.
- Request size limits, same-origin owner writes, origin allowlist, and per-IP request throttling.

### How the data flows

Frontend → `/api/auth/*`, `/api/owner`, `/api/chat` → Node HTTP service → SQLite.

Owners cannot select their tenant via the request: the service resolves it from a verified session
and membership record. Visitors must supply the random token for their own conversation; another
business's widget key or another visitor's token cannot read that conversation. Owner responses do
not include visitor tokens. Browser storage is used only for the visitor's own chat reference/cache.

The small single-process database stores application state as a JSON document in a SQLite table,
with separate relational tables for users and sessions. Each state update is committed immediately.
It is intentionally a simple local deployment; scaling to multiple workers would require a different
store design. Node's built-in SQLite API may print an experimental warning.

### Frontend and backend separately

```powershell
# Terminal 1
npm run dev:backend
# Terminal 2
npm run dev:frontend
```

### Run the built app with one server

```powershell
npm run build
npm run build:widget
npm start
```

Open **http://localhost:3001/**. Node serves both the static frontend and its APIs.
The service binds to loopback only. No public hosting is configured or required.

### Embed the widget

The Widget & profile screen generates a script with its API URL. Build `widget.js` first.
For local development, use the built-app URL at port 3001 or supply an absolute local API URL
in `data-api-url`. Other origins must be explicitly added to the backend allowlist before use.
The sample standalone widget browser smoke test uses a mock endpoint; the HTTP integration test
below exercises the real local chat endpoint. No deployed AWS widget is claimed.

## Verification

```powershell
npm run check
```

Runs frontend, server, and AWS scaffold type checks, unit tests, a real HTTP integration test,
both builds, and a widget size check. The integration test verifies invalid credentials, protected
endpoints, hostile origins, two-business isolation, visitor tokens, FAQ CRUD, unsupported questions,
drafts, handoffs, persistence after restart, and logout. It uses a temporary SQLite database.

Optional browser verification (installed Microsoft Edge):

```powershell
# Start the built local full-stack app first.
$env:BASE_URL = "http://localhost:3001"
$env:MAPLE_PASSWORD = "your-first-run-bakery-password"
$env:HARBOR_PASSWORD = "your-first-run-bike-shop-password"
npm run smoke:server
```

The historical `npm run smoke` is for the optional browser-only demo, not the default full-stack app.
An independent review ran the type checks, unit tests, HTTP integration tests and builds; browser
verification of this new mode is provided as a script and must be run on a machine with Edge.

## Optional modes and AWS scaffold

- Default/unset or `VITE_BACKEND=server`: real local Node + SQLite app, no paid services.
- `VITE_BACKEND=local`: historical simulated browser-only demo.
- `VITE_BACKEND=aws`: optional Cognito/AppSync/Lambda/Bedrock integration requiring deployment.

The AWS scaffold in `amplify/` remains **undeployed and unverified at runtime**. It is not needed
for local full-stack operation. Cloud deployment can incur charges and is not part of these setup steps.
See [AWS setup notes](docs/AWS_SETUP.md), [cost estimate](COST_ESTIMATE.md), and
[remaining cloud work](docs/PHASE_2_PLAN.md). Those notes describe the optional AWS path, not the default.

## Portfolio description

> Built a full-stack customer-support application using React, TypeScript, Node.js and SQLite,
> with password authentication, server-side tenant authorization, FAQ management, visitor chat,
> and inquiry workflows. Added HTTP integration tests for access control and persistence.
> Prepared a separate AWS Amplify backend scaffold (not deployed).

## Limits

FAQ matching is conservative and can reject unfamiliar wording; it does not provide general AI reasoning.
The application is intended for local portfolio use. Public production use needs HTTPS, secure cookies,
monitoring, retention controls for inquiries, privacy documentation, and a deployment/security review.
Sample seed records are fictional. Existing screenshots show the earlier browser-only demo and are not
proof that the new server mode passed browser tests. No AWS spending was authorized or performed.
