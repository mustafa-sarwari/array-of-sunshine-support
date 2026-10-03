# Phase 2 plan: real sign-in, AWS data, and the embeddable widget

Prepared October 3, 2026. **Nothing in this plan has been deployed.** Commands that create AWS
resources are marked, and none of them have been run.

Goal: the owner dashboard signs in with Amazon Cognito and reads and writes through AppSync. The
chat widget talks to the `public-chat` Lambda and streams real Bedrock answers. A standalone
`widget.js` can be embedded on any approved website. The local demo keeps working for the
portfolio.

## Progress (October 3, 2026)

**Steps 0 to 4 are implemented in code. No AWS resources were created and no model calls were
made.** `npm run check` and `npm run smoke` pass. The AWS-mode frontend builds but has not run
against AWS, because there is no deployed backend yet. Where the code differs from the plan below:

- **Refreshing (Step 2).** The dashboard refetches when the window regains focus and after every
  change, instead of polling every 30 seconds, to avoid steady background AppSync traffic.
- **Widget loading (Step 4).** A single IIFE file can't be split, so the chat UI ships in
  `widget.js` (about 16 KB gzipped). The widget config is fetched on page load so the launcher can
  show the brand color, cached for 5 minutes per tab. A saved conversation is fetched only when
  the visitor opens the chat.
- **Widget cache header (Step 0).** `amplify.yml` serves `/widget.js` with a 5-minute cache and
  `stale-while-revalidate`, because the embed snippet uses an unversioned file name.
- **Tests (Step 2).** The HTTP chat client has unit tests with a mocked `fetch`. The AppSync data
  source has no mocked-client tests yet; it will be covered by the Step 5 integration tests.

## Decisions

All four recommendations were accepted on October 3, 2026.

| # | Decision | Chosen | Why it matters |
|---|---|---|---|
| D1 | How to reach Nova Lite on the Free plan | **Keep the app in us-east-2 and call Bedrock in us-east-1** (option A in [COST_ESTIMATE.md](../COST_ESTIMATE.md#region-note-nova-lite-in-us-east-2-on-the-free-plan-decided-option-a)) | In us-east-2, Nova Lite shows only cross-Region quotas, which the Free plan blocks |
| D2 | Keep the local demo alongside AWS mode | **Yes:** a build-time switch `VITE_BACKEND=local` or `aws` | The public portfolio demo keeps working with no AWS cost or sign-in |
| D3 | How the widget's allowed websites are enforced | **Set function URL CORS to `*` and keep the per-business allow-list check in the Lambda** | Function URL CORS is fixed at deploy time, so each new customer website would otherwise need a redeploy. The Lambda already rejects origins that aren't on the business's list (403). |
| D4 | Widget bundle size | **Build the widget with Preact (`preact/compat`)** | React DOM alone is larger than the 40 KB target. Preact keeps the same component code. |

## Verified prerequisites (read-only, October 3, 2026)

| Check | Result | Impact |
|---|---|---|
| CDK bootstrap in us-east-2 | Not done (no `CDKToolkit` stack) | Must run once. It creates resources. |
| Existing CloudFormation stacks / Amplify apps / Lambda functions | None | No name collisions |
| Lambda concurrency limit (us-east-2) | 400 | Reserved concurrency (e.g. 5) for `public-chat` is safe |
| Bedrock access to Nova Lite (us-east-2) | Authorized, `ON_DEMAND` listed, but no in-Region quota | See D1 |
| Nova Lite quotas (us-east-1) | 2,000 requests/min, 4,000,000 tokens/min in-Region | Option A works on the Free plan |
| Amazon SES (us-east-2) | Sandbox (no production access), 200 emails/day | Fine for this phase. Owner notifications to arbitrary addresses need production access later. |
| AWS CLI profile `aws-project` | Short-term `aws login` credentials, region us-east-2 | Sessions expire. Run `aws login --profile aws-project` again if a deploy fails with expired credentials. |
| Services on the Free plan | Cognito, AppSync, Lambda, DynamoDB, S3, Bedrock, Amplify, CloudFront, WAF all supported | No upgrade needed for this phase |
| Client libraries | `aws-amplify` 6.22.1, `@aws-amplify/ui-react` 6.15.7 (React 19 supported) | |

## Work plan

### Step 0: Backend changes before the first deploy

1. **Bedrock region (D1).** Add a `BEDROCK_REGION` setting:
   - `amplify/backend.ts`: pass it to the function and use it in the IAM resource ARN, `arn:aws:bedrock:${bedrockRegion}::foundation-model/${modelId}`.
   - `amplify/functions/public-chat/handler.ts`: `new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION })`.
   - Add `bedrockRegion` to the outputs.
   - *Revised October 3, 2026:* `BEDROCK_REGION` is now an optional override with no hard-coded default. When it is unset, the Lambda and the IAM policy both use the app's deployment region. The deploy steps for this account still set it to `us-east-1` (D1). The IAM resources come from `amplify/bedrockAccess.ts`, which also covers cross-Region inference profile IDs.
2. **Dashboard data the API doesn't return yet.** The Overview and Conversations pages currently compute statistics from full message lists, but the API returns only summaries.
   - Have `public-chat` keep counters on the conversation item: `firstQuestion`, `visitorMessageCount`, `answeredCount`, `handoffOfferedCount`.
   - Add these fields to `ConversationSummary` in `amplify/data/resource.ts`.
   - Add a `getDashboardStats` query: conversations in the last 7 days, answer rate, new inquiries, open unanswered questions, and live approved answers.
3. **Widget origins (D3).** Function URL CORS `allowedOrigins: ['*']`. Keep `loadBusiness()`'s per-business origin check as the enforcement point. The `WIDGET_ALLOWED_ORIGINS` setting is no longer needed and was removed.
4. **`amplify.yml`** for Amplify Hosting:
   - Backend phase: `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID`.
   - Frontend phase: `VITE_BACKEND=aws npm run build`, `npm run build:widget`, `npm run size:widget`, with output in `dist/`.
   - A short cache header for `/widget.js` (see Progress).

### Step 1: Owner sign-in with Cognito

- Add `aws-amplify` and `@aws-amplify/ui-react`.
- `src/backend/aws/`: `Amplify.configure(outputs)` from `amplify_outputs.json`. The file is git-ignored and generated by the sandbox or by `ampx generate outputs`.
- `SignIn.tsx` in AWS mode: `<Authenticator hideSignUp>`. It handles the invited owner's first sign-in (`NEW_PASSWORD_REQUIRED`), optional TOTP MFA setup, and forgotten passwords. Style it to match the dashboard.
- `useOwnerSession()`: built on `getCurrentUser()`, `fetchUserAttributes()`, and a `Hub` listener for sign-in and sign-out events. `OwnerLayout` uses it as the route guard.
- In AWS mode, remove the "Demo sign-in" and "Simulated AI" badges and the reset buttons. Keep them in local mode.

### Step 2: Replace simulated persistence for the dashboard

- Define an async `OwnerDataSource` interface with the same operations as `src/lib/ownerApi.ts` (still no `businessId` anywhere) plus `getDashboardStats`.
  - **Local implementation:** wraps the existing `ownerApi.ts` and the demo session.
  - **AWS implementation:** `generateClient<Schema>({ authMode: 'userPool' })`, calling `client.queries.listKnowledge()`, `client.mutations.saveKnowledge(...)`, and so on.
- Add `@tanstack/react-query` for caching, loading and error states, and refreshing after changes. Refresh conversations and inquiries every 30 seconds; the custom operations have no subscriptions.
- Move the seven owner pages from synchronous `useDb()` reads to queries. Add loading and error states.
- Select the implementation at build time with `VITE_BACKEND`, so the AWS bundle doesn't include the demo database or `demoAuth.ts`, and vice versa.
- Tests:
  - Keep the existing local tests.
  - Add tests for the AWS implementation using a mocked client.

### Step 3: Real chat API for the widget

- Define a `PublicChatClient` interface: `getConfig`, `start`, `transcript`, `send` (an async stream of `delta`, `done`, and `error` events), and `handoff`.
  - **Local implementation:** wraps `src/lib/publicApi.ts`.
  - **HTTP implementation:** `fetch` POST to `publicChatUrl`. It reads the NDJSON stream with `response.body.getReader()` and `TextDecoder`, splitting on newlines. It maps 403, 429, and other error responses to friendly messages.
- `ChatWidget` receives the client as a prop. Keep the visitor's `{ conversationId, visitorToken }` in `localStorage` per widget key so a page reload resumes the chat.

### Step 4: Standalone embeddable widget

- Entry point `src/widget/main.tsx`:
  1. Read `data-widget-key` and an optional `data-api-url` from `document.currentScript`. The default URL is baked in at build time from `VITE_PUBLIC_CHAT_URL`.
  2. Create a host element and call `attachShadow({ mode: 'open' })`.
  3. Inject the compiled Tailwind CSS (`import css from './widget.css?inline'`) into the shadow root.
  4. Render the launcher button.
  5. Load the config and the full chat only when the visitor opens it.
- `vite.widget.config.ts`:
  - Library mode, `formats: ['iife']`, a single file `dist/widget.js`.
  - Alias `react` and `react-dom` to `preact/compat` (D4).
  - `define: { 'process.env.NODE_ENV': '"production"' }`.
- Add scripts:
  - `build:widget` builds the widget.
  - `size:widget` prints the gzipped size and fails above 40 KB.
- `public/widget-test.html`: a plain page that embeds the built script. Extend `npm run smoke` to test it.
- Update the embed snippet on the Widget & profile page:
  `<script src="https://<your-app-domain>/widget.js" data-widget-key="pk_..." async></script>`.

### Step 5: Integration tests against the sandbox

`scripts/integration.mjs`, run with `npm run test:integration`, reading `amplify_outputs.json`:

1. **Owner isolation:** sign in as each owner (Cognito `InitiateAuth` with test passwords). Confirm each one sees only their own data and that IDs from the other business return "not found".
2. **Visitor isolation:** read a transcript with a wrong or guessed visitor token (expect 404), and use a widget key from an origin that isn't allowed (expect 403).
3. **Rate limit:** send 25 requests in a minute from one client (expect 429 after 20).
4. **One real answer and one handoff:** a few model calls, fractions of a cent.
5. Run `npm run smoke` against an AWS-mode build pointed at the sandbox.

## Deployment commands (not run)

Everything below runs in PowerShell from the project folder. **Steps 2, 3, 5, 9 and 10 create AWS
resources. Steps 6 and 8 make a few paid model calls (fractions of a cent).**

```powershell
# 0. Credentials (read-only check; sign in again if expired)
aws sts get-caller-identity --profile aws-project
# aws login --profile aws-project

# 1. Settings read when the backend is synthesized
$env:AWS_PROFILE = "aws-project"
$env:AWS_REGION = "us-east-2"
$env:BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0"
$env:BEDROCK_REGION = "us-east-1"          # decision D1, option A (override; unset = app region)
$env:PUBLIC_CHAT_RESERVED_CONCURRENCY = "5" # account limit is 400, so this is safe

# 2. One-time CDK bootstrap of us-east-2 (CREATES RESOURCES)
$accountId = aws sts get-caller-identity --profile aws-project --query Account --output text
npx aws-cdk@latest bootstrap "aws://$accountId/us-east-2" --profile aws-project

# 3. Personal cloud sandbox (CREATES RESOURCES); writes amplify_outputs.json; keep it running
npx ampx sandbox --profile aws-project --identifier dev
```

In a second PowerShell window:

```powershell
$env:AWS_PROFILE = "aws-project"; $env:AWS_REGION = "us-east-2"
$out    = Get-Content .\amplify_outputs.json -Raw | ConvertFrom-Json
$poolId = $out.auth.user_pool_id
$table  = $out.custom.supportTableName

# 4. Invite both owners (use inboxes you control) and link them to their businesses
foreach ($o in @(@{ email = "owner-maple@example.com"; biz = "maple" }, @{ email = "owner-harbor@example.com"; biz = "harbor" })) {
  aws cognito-idp admin-create-user --user-pool-id $poolId --username $o.email `
    --user-attributes Name=email,Value=$($o.email) Name=email_verified,Value=true
  $sub = aws cognito-idp admin-get-user --user-pool-id $poolId --username $o.email `
    --query "UserAttributes[?Name=='sub'].Value | [0]" --output text
  npx tsx scripts/provision-business.ts --table $table --business $o.biz --owner-sub $sub `
    --origins "http://localhost:5173,http://localhost:4173"
}

# 5. Run the dashboard against the sandbox (WRITES TO THE SANDBOX TABLE)
$env:VITE_BACKEND = "aws"
npm run dev                                   # http://localhost:5173/owner/sign-in

# 6. Build and try the standalone widget against the sandbox (PAID MODEL CALLS when chatting)
$env:VITE_PUBLIC_CHAT_URL = $out.custom.publicChatUrl
npm run build:widget
npm run size:widget
npm run preview                               # open http://localhost:4173/widget-test.html

# 7. Checks
npm run check

# 8. Integration tests (A FEW PAID MODEL CALLS)
npm run test:integration
```

**Production hosting** (after the sandbox passes):

```powershell
# 9. Amplify Hosting (CREATES RESOURCES). Done in the console, because connecting GitHub
#    needs your authorization:
#    Amplify console > Create new app > GitHub > mustafa-sarwari/array-of-sunshine-support > main
#    Region us-east-2. Environment variables:
#      BEDROCK_MODEL_ID=amazon.nova-lite-v1:0  BEDROCK_REGION=us-east-1
#      PUBLIC_CHAT_RESERVED_CONCURRENCY=5
#    The build uses amplify.yml (Step 0), which sets VITE_BACKEND=aws for the app build.
#    Hosting > Rewrites and redirects: add the single-page-app rewrite from README section 4.
#    After the first deploy, add the Amplify domain to each business's --origins (step 4).

# Then fetch the production outputs and provision production owners as in step 4:
$appId = aws amplify list-apps --region us-east-2 --profile aws-project --query "apps[?name=='array-of-sunshine-support'].appId | [0]" --output text
npx ampx generate outputs --app-id $appId --branch main --profile aws-project --out-dir .\prod-outputs

# 10. Budget alert (CREATES A FREE BUDGET): see COST_ESTIMATE.md, "Recommended guardrails"
```

**Teardown** of the sandbox (the DynamoDB table is retained on purpose):

```powershell
npx ampx sandbox delete --profile aws-project --identifier dev --yes
aws dynamodb delete-table --table-name $table --region us-east-2 --profile aws-project
```

## Blockers and risks

| # | Item | Type | Resolution |
|---|---|---|---|
| B1 | Nova Lite probably unreachable from us-east-2 on the Free plan | Resolved in code | D1 option A: `BEDROCK_REGION=us-east-1` (Step 0.1). Confirmed only by the first real model call. |
| B2 | CDK bootstrap not done | **Needs your go-ahead** | Deployment step 2 (creates resources) |
| B3 | Amplify Hosting must be connected to GitHub in the console | **Needs your action** | Deployment step 9. It can't be done from the CLI without a GitHub token. |
| B4 | The backend has never been synthesized or deployed | Risk | Expect small fixes on the first `ampx sandbox`. Unverified: Amplify CLI with TypeScript 7.0.2, and `aws login` session credentials with the CDK toolkit. |
| B5 | Dashboard needs data the API doesn't return | Done | Step 0.2 (backend counters and `getDashboardStats`) |
| B6 | Function URL CORS is fixed at deploy time | Done | D3 |
| B7 | Widget size target (40 KB gzipped) with React | Done | D4: about 16 KB gzipped with Preact, enforced by `npm run size:widget` |
| B8 | The Free plan ends April 3, 2027, or when the $100 in credits runs out | Planning | Upgrade to the Paid plan before going live with real customers |
| B9 | SES is in the sandbox | Later | Needed only for inquiry notification emails (README step 9) |
| B10 | Cognito's default email sender has a low daily limit | Later | Fine for inviting a few owners. Use SES for real volumes. |
| B11 | Amplify Hosting needs a single-page-app rewrite | **Needs your action** | Console setting with deployment step 9; without it, reloading `/owner/...` returns 404 |
| B12 | Each business's allowed origins must include the Amplify domain | Work item | Re-run provisioning with `--origins` before owners edit anything; it also resets the profile and sample answers |
| B13 | Integration test script not written yet | Work item | Step 5 (`scripts/integration.mjs`), written against the sandbox once it exists |
| B14 | An organization-level policy on the account denies some services in us-east-1 (found October 3, 2026; DynamoDB, Lambda, Cognito, CloudFormation, Amplify listings denied) | Risk, reduced | The IAM policy simulator, which includes that policy (DynamoDB in us-east-1 shows as explicitly denied as a control), reports `bedrock:InvokeModelWithResponseStream` on Nova Lite as allowed in us-east-1 and us-east-2. A real call is still the only proof (deployment step 6). |

## Order of work

1. Step 0 (backend changes) and the D1 to D4 decisions.
2. Steps 1 and 2 (sign-in and dashboard data).
3. Steps 3 and 4 (chat client and standalone widget).
4. Deployment steps 2 and 3 (bootstrap and sandbox).
5. Step 5 (integration tests).
6. Deployment steps 9 and 10 (production hosting and budget).

Steps 0 to 4 need no AWS resources. They can be built and tested locally against the existing demo
data and mocked clients.
