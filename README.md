# Array of Sunshine: AI customer-support assistant

**A portfolio demo.** This repository shows a customer-support assistant for small businesses: a
working browser demo with fictional businesses, plus an AWS backend that is written but has never
been deployed. It is not a hosted product, and nothing here is running on AWS.

Owners manage **approved** FAQs and service information in a dashboard. Visitors chat through a
floating widget on the business's website. The assistant answers **only** from approved
information. For anything else, it offers to hand the question to a person, and the question lands
in the owner's unanswered-question inbox.

The design goal is a support bot a small business can trust: it never invents prices, hours, or
policies, it keeps each business's data separate, and it is estimated (not measured) to cost a few
dollars a month to run on AWS.

**Status (October 3, 2026)**

- **Local demo: working.** React 19, TypeScript, Vite 8, Tailwind CSS 4. Data is stored in the browser.
- **AWS backend: prepared, never deployed.** Amplify Gen 2 with Cognito, AppSync, Lambda, DynamoDB, S3, and Amazon Bedrock (`ConverseStream`). The code is written and type-checked, but it has never been synthesized or deployed, and no model calls have been made. A read-only check of the AWS account on October 3, 2026 found no CloudFormation stacks (including recently deleted ones), Amplify apps, Cognito user pools, DynamoDB tables, Lambda functions, or S3 buckets.
- **Frontend AWS mode: written, not yet run against AWS.** A build with `VITE_BACKEND=aws` uses Cognito sign-in, the AppSync owner API, and the streaming public chat URL instead of the browser demo. It needs a deployed backend (`amplify_outputs.json`) before it can be tried.
- **Standalone `widget.js`: working.** One script tag embeds the chat on any website. It renders in a Shadow DOM, uses Preact, and is about 16 KB gzipped. The smoke test runs it against a mocked chat endpoint.
- **Cost (checked October 3, 2026):** estimated AWS usage of about **$0.53/month at 10 conversations a day** and **$1.75/month at 100 a day** (realistic case), plus about $8/month if AWS WAF is added. **Out-of-pocket cost today is $0.** The AWS account is on the Free plan with $100 in credits. The Free plan ends on April 3, 2027 or when the credits run out, whichever comes first. See [Cost and AWS account](#cost-and-aws-account).

> **Simulated in the local demo:** owner sign-in (no real security) and AI replies (no model is
> called). Both are labeled in the UI with "Demo sign-in" and "Simulated AI" badges. All data lives
> in your browser's `localStorage`. The businesses, people, emails, and phone numbers are fictional.

### What is real and what is simulated

| Part | State |
|---|---|
| Dashboard and widget UI, phone and desktop layouts | **Real and working** in the local demo |
| Answer matching against approved entries (`shared/retrieval.ts`) | **Real.** The same code is used by the demo and the Lambda. |
| Per-business data separation and visitor tokens | **Real in the local demo's API contract.** Enforced in the browser only, so it is not a security boundary there. |
| Standalone `widget.js` (Shadow DOM, Preact) | **Real build.** Tested only against a mocked chat endpoint. |
| Owner sign-in | **Simulated** in the demo. The Cognito version is written but has never run. |
| AI replies | **Simulated** in the demo: the approved text is streamed back. The Bedrock version is written but has never been called. |
| Data storage | **Simulated** with browser `localStorage`. The DynamoDB and S3 versions are written but have never run. |
| Inquiry notification emails, budget alerts, WAF, integration tests | **Not built yet** (see [Remaining work](#5-remaining-work-before-production)) |

## Customization service

I can adapt this assistant for a small business, for example a bakery, salon, repair shop, or
clinic front desk:

- Load the business's FAQs, hours, prices, and policies as approved answers, and set up its branding.
- Deploy the backend **into the client's own AWS account**, connect owner sign-in, and run the
  integration tests that this demo doesn't have yet.
- Embed the widget on the client's website and show the owner how to use the dashboard.
- Make changes to fit the business, such as extra fields, handoff routing, or inquiry emails.

**Hosting and AI costs.** Real AWS hosting and AI model usage run in the client's AWS account and
are billed by AWS to the client, within a monthly budget agreed in writing before deployment. An
AWS Budgets alert is set at that amount. Development work is quoted separately. The cost figures in
this README are estimates for a demo-sized workload, not a quote.

![Widget answering from approved info and offering a handoff](docs/screenshots/widget-desktop.png)

## Screenshots

| Owner dashboard | Approved answers |
|---|---|
| ![Owner dashboard overview](docs/screenshots/dashboard-desktop.png) | ![Approved answers editor](docs/screenshots/knowledge-desktop.png) |
| **Conversation transcript with handoff** | **Demo home** |
| ![Conversation transcript](docs/screenshots/conversations-desktop.png) | ![Demo home page](docs/screenshots/home-desktop.png) |

| Mobile website | Mobile widget (full screen) | Mobile dashboard menu |
|---|---|---|
| ![Demo website on a phone](docs/screenshots/site-mobile.png) | ![Chat widget on a phone](docs/screenshots/widget-mobile.png) | ![Dashboard menu on a phone](docs/screenshots/dashboard-menu-mobile.png) |

Screenshots are produced by `npm run smoke` (see [Checks](#2-checks)).

## Features in the local demo

- **Public chat widget.** A floating widget on two sample business websites (Maple Street Bakery and Harbor Bike Repair). Replies stream word by word. On phones it opens full screen.
- **Answers only from approved information.** Grounded replies are marked "From approved business information", and the owner's transcript shows which entry each reply used. Drafts are never used. Questions with no approved answer get an honest "I don't know" plus a handoff offer.
- **Human handoff.** Visitors can leave a name, contact details, and a message. The request appears in the owner's **Inquiries** list, linked to the conversation.
- **Owner dashboard** (demo sign-in):
  - **Overview:** conversation and answer-rate stats, recent chats, and the questions that need an answer.
  - **Approved answers:** add, edit, search, filter, approve, or draft FAQs and service info. A **Test the assistant** box shows what a question will match.
  - **Conversations:** full transcripts with filters, showing which answer was used for each reply.
  - **Inquiries:** handoff requests with status tracking.
  - **Unanswered:** an inbox of questions the assistant couldn't answer. One click turns a question into a new approved answer.
  - **Widget & profile:** business name, tagline, brand color, widget greeting, contact details, and the embed snippet.
- **Data separation between businesses.** Two sample businesses with separate owners. The local owner API derives the business from the signed-in session and never accepts a business ID from the page, the same contract as the AWS backend.
- **Visitor isolation.** A visitor can read only their own conversation, using a secret visitor token.
- **Responsive layouts** for phones, tablets, and desktops. Tabs stay in sync.
- **Embeddable widget build.** `npm run build:widget` produces `dist/widget.js`, a single script that mounts the same chat widget inside a Shadow DOM so the host site's CSS can't affect it. `public/widget-test.html` is a deliberately badly styled page for trying it.

---

## 1. Run the local demo (Windows PowerShell)

Prerequisites: [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/) 20 or newer (tested
with Node 24.13.0 and npm 11.4.2). No AWS account is needed for the demo.

```powershell
git clone https://github.com/mustafa-sarwari/array-of-sunshine-support.git
Set-Location .\array-of-sunshine-support
npm ci

# Development server with hot reload: http://localhost:5173
npm run dev
```

Or run the production build locally:

```powershell
npm run build
npm run preview          # http://localhost:4173
```

| Page | URL (preview) |
|---|---|
| Demo home | http://localhost:4173/ |
| Maple Street Bakery website + widget | http://localhost:4173/demo/maple-street-bakery |
| Harbor Bike Repair website + widget | http://localhost:4173/demo/harbor-bike-repair |
| Open a demo site with the chat already open | add `?chat=open`, for example http://localhost:4173/demo/maple-street-bakery?chat=open |
| Owner sign-in (demo) | http://localhost:4173/owner/sign-in |

**Demo owner accounts** (simulated; the sign-in page has one-click buttons). These are not real
credentials. They exist only in the browser demo.

| Business | Email | Password |
|---|---|---|
| Maple Street Bakery | `owner@maplestreetbakery.demo` | `demo-bakery` |
| Harbor Bike Repair | `owner@harborbikes.demo` | `demo-bikes` |

To start over, use **Reset demo data** on the home page or the dashboard overview.

### Two-minute walkthrough

1. Open the Maple Street Bakery site and ask "Are you open on Sunday?". The answer comes from the approved hours entry.
2. Ask "Do you have keto cupcakes?". The assistant says it has no approved information and offers a handoff. Click **Yes, contact the team** and send the form.
3. In another tab, sign in as the bakery owner. The question appears under **Unanswered**, and the request appears under **Inquiries**.
4. On **Unanswered**, click **Write approved answer**, save it, then ask the widget again (use **New chat**).

### Testing data separation

- Ask the bakery widget "How much is a tune-up?". It refuses, because that answer belongs to Harbor Bike Repair.
- Sign in as each owner. Each one sees only their own answers, conversations, inquiries, and unanswered questions.
- The bakery's "Holiday pie pre-orders" entry is a **draft**. The widget never uses it until it is approved.

## 2. Checks

```powershell
npm run check            # typechecks, unit tests, app build, widget build, widget size budget (40 KB gzip)
npm run test             # unit tests only (retrieval, data separation, visitor isolation, chat stream parsing)
npm audit --omit=dev     # audit of the packages shipped to the browser
```

End-to-end browser test. It uses your installed Microsoft Edge, so nothing is downloaded. Start
the preview in one PowerShell window and run the test in another:

```powershell
# Window 1
npm run build
npm run build:widget
npm run preview

# Window 2
npm run smoke            # saves screenshots to docs/screenshots/
```

`npm run smoke` drives the real UI on desktop and mobile. It chats with the widget, submits a
handoff, signs in as both owners, turns an unanswered question into an approved answer, confirms
the widget uses it, and checks that neither owner can see the other's data. It also loads
`dist/widget.js` on `widget-test.html` against a mocked chat endpoint (nothing reaches AWS) and
checks that the host page's CSS doesn't leak in, that the reply streams, and that requests carry
only the widget key and visitor token. To use Chrome instead of Edge, run
`$env:BROWSER_CHANNEL = "chrome"` first.

---

## 3. How it works

### Answering rules (local and AWS)

`shared/retrieval.ts` scores the visitor's question against the business's **approved** entries
using keywords, synonyms, and a minimum match score. The same code runs in the local demo and in
the production Lambda.

- **No match:** reply with the handoff message, record an unanswered question, and **skip the model**. This avoids guessing and avoids model cost.
- **Match (AWS only):** send only the top 5 matching approved entries to Bedrock. The system prompt (`shared/prompt.ts`) tells the model to answer only from those entries, or to reply with `[[HANDOFF]]`. The Lambda holds back that sentinel so visitors never see it, then turns it into a handoff.
- **Match (local demo, simulated AI):** reply with the approved answer text itself, streamed word by word to mimic `ConverseStream`.

### Two frontend builds

The frontend picks its backend at build time with `VITE_BACKEND`. Each build contains only one
backend; the other is removed by the bundler.

| | Local demo (default) | `VITE_BACKEND=aws` |
|---|---|---|
| Owner sign-in | Demo accounts in the browser | Amazon Cognito (Amplify `Authenticator`, sign-up hidden) |
| Owner data | `localStorage` through `src/lib/ownerApi.ts` | AppSync custom queries through `generateClient<Schema>()` |
| Widget chat | Simulated replies through `src/lib/publicApi.ts` | `fetch` to the public chat function URL, reading the NDJSON stream |
| Demo websites | Live sample data | Same static sample content; the widget talks to AWS |

Both builds implement the same interfaces in `src/backend/types.ts` (`OwnerDataSource`,
`PublicChatClient`), and the dashboard pages only use those, through React Query. The AWS build
reads `amplify_outputs.json` (generated by a deploy and git-ignored) for the Cognito, AppSync,
and chat URL settings.

### AWS backend architecture (prepared, not deployed)

> **Not deployed.** The backend in `amplify/` has been written and type-checked only. It has not
> been synthesized, deployed, or tested against AWS. Expect small fixes on the first deployment.

```
Business website ──(widget.js, public widget key)──► Lambda function URL: public-chat
                                                     │  RESPONSE_STREAM, NDJSON events
                                                     ├─► DynamoDB (single table, on-demand)
                                                     └─► Amazon Bedrock ConverseStream (Nova Lite)

Owner dashboard ──(Cognito sign-in)──► AWS AppSync (userPool auth only) ──► Lambda: owner-api
                                                                             ├─► DynamoDB
                                                                             └─► S3 presigned URLs

Amplify Hosting serves the dashboard and widget.js
```

| AWS service | Role |
|---|---|
| Amazon Cognito | Owner sign-in (email, optional TOTP MFA, admin-invite only) |
| AWS AppSync | Owner API, Cognito user pool auth only, custom queries and mutations backed by `owner-api` |
| AWS Lambda | `owner-api` (AppSync resolver) and `public-chat` (streaming function URL for the widget) |
| Amazon DynamoDB | One on-demand table for businesses, entries, conversations, inquiries, and rate limits (TTL, point-in-time recovery) |
| Amazon S3 | Private bucket for owner documents, reached only through short-lived presigned URLs |
| Amazon Bedrock | `ConverseStream` with Amazon Nova Lite, called only from the `public-chat` Lambda |
| AWS Amplify Gen 2 | Infrastructure as code (`amplify/`) and hosting |

### Security model

| Rule | How it's enforced |
|---|---|
| Owner's business comes from identity, never the browser | The AppSync API requires a Cognito user pool token. The `owner-api` Lambda reads `event.identity.sub`, looks up `USER#<sub> / MEMBERSHIP`, and uses that `businessId`. No GraphQL operation has a `businessId` argument. Every record is addressed under `BIZ#<businessId>`, so another business's ids simply miss. |
| Owners can't self-register | `allowAdminCreateUserOnly` is set on the user pool. An admin invites owners and links them with `scripts/provision-business.ts`. |
| The public widget can't see private data | The widget calls a separate Lambda function URL, never AppSync, which has no API key and no guest access. The function only accepts a public widget key, which it maps to a business on the server. It can read approved entries for matching only. It can start a conversation, then read or append to that conversation only with the secret visitor token it was given. The token is stored as a SHA-256 hash and compared in constant time. It cannot list conversations or read drafts, inquiries, or documents. |
| Documents stay private | The S3 bucket has no client access rules. The owner API issues 5-minute presigned upload URLs under `businesses/<businessId>/…`, using the business id derived from identity. The widget has no route to the bucket. |
| Credentials and model calls stay on the backend | Bedrock is called only from the `public-chat` Lambda's IAM role. That role is scoped to one model ARN with `bedrock:InvokeModelWithResponseStream` and `bedrock:InvokeModel`. The browser never holds AWS credentials. |
| Abuse and cost limits | Per-IP rate limit (20 requests/minute, counted in DynamoDB with TTL), per-business origin allow-list, function URL CORS, 500-character messages, 40 messages per conversation, `maxTokens` 400, optional reserved concurrency. Conversations and messages expire after 180 days (DynamoDB TTL). |

### Model choice

Recommended model: **Amazon Nova Lite** (`amazon.nova-lite-v1:0`). On October 3, 2026, read-only
calls confirmed it is `ACTIVE` and supports streaming. It costs $0.06 per 1M input tokens and
$0.24 per 1M output tokens.

> **Region decision: the app runs in us-east-2 and calls Nova Lite in us-east-1.** A read-only
> quota check found no in-Region on-demand quota for Nova Lite in us-east-2 on this Free plan
> account, only cross-Region quotas, and the Free plan doesn't support cross-Region inference.
> us-east-1 has normal in-Region quotas. The `public-chat` Lambda therefore creates its Bedrock
> client in `BEDROCK_REGION` (default `us-east-1`), and its IAM policy names the us-east-1 model
> ARN. Visitor questions and approved answers cross from us-east-2 to us-east-1 for the model
> call only. See the
> [region note in COST_ESTIMATE.md](COST_ESTIMATE.md#region-note-nova-lite-in-us-east-2-on-the-free-plan-decided-option-a)
> for the other options that were considered.
>
> **Unverified on this account.** A later read-only check (October 3, 2026) found an
> organization-level policy on the demo account that denies some services in us-east-1, for
> example DynamoDB, Lambda, and Cognito. Listing Bedrock models in us-east-1 is allowed, but
> whether a model call there is allowed can only be confirmed by a real (paid) call. On a client's
> own account, check the Bedrock region before deploying.

To change the model, set `BEDROCK_MODEL_ID` (and `BEDROCK_REGION` if needed) before deploying. If you choose a cross-region
inference profile ID (for example `us.amazon.nova-micro-v1:0`, Paid plan only), also update the
IAM resources in `amplify/backend.ts` as its comment describes.

Re-check model availability at any time (read-only, no charges):

```powershell
aws bedrock list-foundation-models --region us-east-2 --profile aws-project `
  --query "modelSummaries[?contains(modelId,'nova')].[modelId,modelLifecycle.status,join(',',inferenceTypesSupported)]" --output table
aws bedrock list-inference-profiles --region us-east-2 --profile aws-project `
  --query "inferenceProfileSummaries[?contains(inferenceProfileId,'nova')].inferenceProfileId" --output table
```

### Cost and AWS account

These figures describe the demo's own AWS account and were checked on October 3, 2026 with
read-only AWS calls. For client work, the same usage costs fall on the client's AWS account (see
[Customization service](#customization-service)). Full details, assumptions, and the costs not
included are in [COST_ESTIMATE.md](COST_ESTIMATE.md).

| | 10 conversations/day | 100 conversations/day |
|---|---|---|
| Estimated AWS usage cost, realistic | ≈ $0.53/month | ≈ $1.75/month |
| Estimated AWS usage cost, conservative upper bound | ≈ $1.62/month | ≈ $3.83/month |
| With AWS WAF added | + ≈ $8/month | + ≈ $8/month |
| **Out-of-pocket payment on the Free plan** | **$0** | **$0** |

- **Usage cost vs. payment.** Usage cost is what AWS meters. On the Free plan, it is deducted from the account's $100 in credits, and nothing is charged to a card.
- **Free plan expiry.** The Free plan ends on **April 3, 2027**, or earlier if the credits run out. The account then closes and the app stops working. You have 90 days to upgrade to the Paid plan before AWS permanently deletes the account and its data.
- **After upgrading.** Remaining credits apply to bills until about October 2027, which is 12 months after the account was opened. After that, you pay the usage cost.
- **Credits outlast the Free plan.** At the estimated rates, the credits last longer than the plan in every scenario, so the date is what ends it. Upgrade before April 3, 2027 if the app should keep running.
- **No budget alert is configured yet.** COST_ESTIMATE.md has the command. Run it before going live or right after upgrading.
- **Always free.** Lambda, Cognito, and CloudWatch usage at these volumes is within AWS's always-free monthly allowances.

### Project layout

```
amplify/                    Amplify Gen 2 backend (prepared, not deployed)
  backend.ts                DynamoDB table, IAM, function URL, Cognito hardening, outputs
  auth/resource.ts          Cognito user pool (owners only, email sign-in, optional TOTP MFA)
  data/resource.ts          AppSync schema: owner-only custom queries/mutations → owner-api
  storage/resource.ts       Private S3 bucket for owner documents
  functions/owner-api/      AppSync Lambda resolver (business derived from Cognito sub)
  functions/public-chat/    Public streaming chat endpoint (Bedrock ConverseStream)
  functions/lib/table.ts    Single-table key layout and helpers
amplify.yml                 Amplify Hosting build: backend deploy, AWS-mode app build, widget build
shared/                     Retrieval and prompt code shared by the demo and the Lambda
src/
  backend/types.ts          Interfaces both builds implement (OwnerDataSource, Backend)
  backend/local/            Local demo backend (wraps lib/ownerApi, lib/publicApi, lib/demoAuth)
  backend/aws/              Cognito session, Authenticator sign-in, AppSync data source
  backend/http/chatClient.ts  Public chat client: fetch + NDJSON stream (AWS build and widget.js)
  backend/ownerQueries.tsx  React Query cache per signed-in owner, query and mutation hooks
  components/ChatWidget.tsx Floating public widget (takes a PublicChatClient)
  widget/                   Standalone widget.js entry: Shadow DOM mount and styles
  lib/ownerApi.ts           Local stand-in for owner-api (same no-businessId contract)
  lib/publicApi.ts          Local stand-in for public-chat (widget key + visitor token)
  lib/simulatedAi.ts        Simulated assistant (no model calls)
  lib/demoAuth.ts           Simulated sign-in
  lib/seed.ts               Fictional sample data: Maple Street Bakery and Harbor Bike Repair
  pages/                    Home, demo websites, owner dashboard pages
public/widget-test.html     Hostile-CSS page that embeds widget.js like a customer site
vite.widget.config.ts       IIFE build of widget.js with Preact in place of React
scripts/smoke.mjs           End-to-end browser test
scripts/check-widget-size.mjs  Fails if widget.js exceeds 40 KB gzipped
scripts/provision-business.ts  Links a Cognito owner to a business and loads sample data in AWS
.env.example                Placeholder names for the backend and build settings (no real values)
```

---

## 4. Deploying to AWS (not run yet)

> **Not run yet.** Every command in this section creates AWS resources or makes paid calls,
> except the first one. At demo scale, usage costs cents per month, and on the Free plan it is
> paid from credits (see [Cost and AWS account](#cost-and-aws-account)). The commands assume an AWS CLI profile named
> `aws-project` that already has credentials (for example from `aws configure sso` or
> `aws login`). Don't put access keys in this repository; `.env.example` lists the setting
> names only.

```powershell
# 0. Confirm the identity and account (read-only)
aws sts get-caller-identity --profile aws-project

# 1. Settings used when the backend is synthesized
$env:AWS_REGION = "us-east-2"
$env:AWS_PROFILE = "aws-project"
$env:BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0"
$env:BEDROCK_REGION = "us-east-1"     # Nova Lite has no in-Region quota in us-east-2 on the Free plan
# Optional cost circuit breaker; skip on accounts whose Lambda concurrency quota is 10:
# $env:PUBLIC_CHAT_RESERVED_CONCURRENCY = "5"

# 2. One-time CDK bootstrap of the account/region (creates resources)
$accountId = aws sts get-caller-identity --profile aws-project --query Account --output text
npx aws-cdk@latest bootstrap "aws://$accountId/us-east-2" --profile aws-project

# 3. Personal cloud sandbox: deploys the backend and writes amplify_outputs.json
#    (creates resources; leave it running, Ctrl+C to stop watching)
npx ampx sandbox --profile aws-project --identifier dev
```

After the sandbox is up, in a second PowerShell window in the project folder:

```powershell
$env:AWS_REGION = "us-east-2"; $env:AWS_PROFILE = "aws-project"

# 4. Read the generated outputs (amplify_outputs.json is git-ignored)
$out = Get-Content .\amplify_outputs.json -Raw | ConvertFrom-Json
$poolId = $out.auth.user_pool_id
$table  = $out.custom.supportTableName
$out.custom.publicChatUrl

# 5. Invite the bakery owner (Cognito emails a temporary password; use an inbox you control)
aws cognito-idp admin-create-user --user-pool-id $poolId --username "owner@maplestreetbakery.example" `
  --user-attributes Name=email,Value=owner@maplestreetbakery.example Name=email_verified,Value=true
$sub = aws cognito-idp admin-get-user --user-pool-id $poolId --username "owner@maplestreetbakery.example" `
  --query "UserAttributes[?Name=='sub'].Value | [0]" --output text

# 6. Link the owner to the business and load the sample answers (preview first with --dry-run)
npx tsx scripts/provision-business.ts --table $table --business maple --owner-sub $sub `
  --origins "http://localhost:5173,http://localhost:4173" --dry-run
npx tsx scripts/provision-business.ts --table $table --business maple --owner-sub $sub `
  --origins "http://localhost:5173,http://localhost:4173"

# 7. First paid model call (fractions of a cent): start a chat and ask one question
$url  = $out.custom.publicChatUrl
$hdrs = @{ Origin = "http://localhost:5173" }
$start = Invoke-RestMethod -Method Post -Uri $url -Headers $hdrs -ContentType "application/json" `
  -Body '{"action":"start","widgetKey":"pk_demo_maple_7c1f2a"}'
$body = @{ action = "message"; widgetKey = "pk_demo_maple_7c1f2a"; conversationId = $start.conversationId;
           visitorToken = $start.visitorToken; text = "Are you open on Sunday?" } | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri $url -Headers $hdrs -ContentType "application/json" -Body $body -UseBasicParsing |
  Select-Object -ExpandProperty Content

# 8. Run the dashboard and demo sites against the sandbox (reads amplify_outputs.json).
#    Sign in with the invited email and temporary password; Cognito asks for a new one.
$env:VITE_BACKEND = "aws"
npm run dev                          # http://localhost:5173 (allowed by --origins in step 6)

# 9. Try the standalone widget against the sandbox (each chat message is a paid model call)
Remove-Item Env:VITE_BACKEND
npm run build; npm run build:widget  # widget.js picks up custom.publicChatUrl from amplify_outputs.json
npm run preview                      # then open http://localhost:4173/widget-test.html
```

Repeat steps 5 and 6 with `--business harbor` for the second business.

**Tear down the sandbox.** The DynamoDB table is retained on purpose so data isn't lost by
accident. Delete it separately once you are sure:

```powershell
npx ampx sandbox delete --profile aws-project --identifier dev --yes
aws dynamodb delete-table --table-name $table --region us-east-2 --profile aws-project
```

**Production hosting.** In the Amplify console (region `us-east-2`), choose **Create new app →
Deploy with Git** and connect this GitHub repository. The build uses `amplify.yml`: it deploys the
backend with `ampx pipeline-deploy`, builds the app with `VITE_BACKEND=aws`, then builds and
size-checks `widget.js`. Before the first build:

- Set the environment variables `BEDROCK_MODEL_ID=amazon.nova-lite-v1:0` and `BEDROCK_REGION=us-east-1`.
- Add a single-page-app rewrite under **Hosting → Rewrites and redirects** so routes like
  `/owner/knowledge` load `index.html`: source
  `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|html)$)([^.]+$)/>`,
  target `/index.html`, type `200 (Rewrite)`.
- After the first deploy, add the Amplify domain to each business's allowed origins by re-running
  step 6 with it in `--origins`. That also resets the business's profile and sample answers, so
  do it before the owner edits anything.

The embed snippet on the **Widget & profile** page then points at
`https://<your Amplify domain>/widget.js`.

---

## 5. Remaining work before production

1. **Deploy to a sandbox and run integration tests.** The backend has only been type-checked, and the AWS-mode frontend has only been built; neither has run against AWS. Expect to fix small issues on the first `ampx sandbox`. The integration test script (`npm run test:integration`) hasn't been written yet. Then sign in through Cognito, test the owner API with two owners, try cross-business access, try visitor-token guessing, run the rate limiter under load, and use `widget-test.html` against the real chat URL. Also confirm the Bedrock call works in the chosen region (see [Model choice](#model-choice)).
2. **Widget follow-ups.** `widget.js` fetches the widget config on page load (cached for 5 minutes per tab) so the launcher can use the brand color, but it only restores a saved conversation when the visitor opens the chat. Consider a CloudFront cache for the config and a versioned file name for long-lived caching of the script.
3. **Conversation search at scale.** The dashboard lists conversations 50 at a time and filters and searches only the pages already loaded (by first question, visitor label, and page). Add server-side filters if a business gets thousands of chats.
4. **Evaluate answer quality on Bedrock.** Build a test set of approved questions, unapproved questions, and prompt-injection attempts. Tune the retrieval threshold and prompt. Consider Amazon Bedrock Guardrails (prompt-attack filter, denied topics).
5. **Put CloudFront and AWS WAF in front of the public function URL.** Add a rate-based rule and managed rule groups (~$8/month), plus bot protection or a CAPTCHA on the handoff form.
6. **Set cost and health alerts.** No budget exists yet. Add an AWS Budgets alert (command in COST_ESTIMATE.md) and CloudWatch alarms for Lambda errors and throttles and for Bedrock throttling.
7. **Decide on the AWS plan before April 3, 2027.** The account is on the Free plan, which closes the account on that date or when the $100 in credits runs out. Upgrade to the Paid plan to keep the app running. Remaining credits carry over.
8. **Owner onboarding.** Replace the provisioning script with an admin-only invite flow, and decide how businesses and widget keys are created and rotated.
9. **Notify owners about new inquiries.** For example, email through Amazon SES. Today inquiries only appear in the dashboard.
10. **Privacy and compliance.** Add a privacy notice and an "AI assistant" disclosure in the widget. Confirm the 180-day retention period with the business, add a data-deletion process, review whether inquiry PII needs a customer-managed KMS key, and keep visitor text out of logs (handlers currently log only error names).
11. **Documents.** Uploads are stored privately but are **not** used for answers, by design. If you want it, add an "extract into draft entries" flow that still requires owner approval.
12. **Custom domain and allowed origins.** Attach the production domain in Amplify Hosting, and update each business's `allowedOrigins`. The function URL's CORS setting allows any origin on purpose; the Lambda enforces each business's list and answers 403 otherwise.
13. **Accessibility and browser QA.** Run a screen-reader pass and test Safari on iOS (the widget is full screen on phones).
14. **Dependency hygiene.** See [Dependency audit](#dependency-audit). Re-run `npm audit` after Amplify and CDK releases, and remove the `overrides` in `package.json` once upstream packages ship the fixes.

### Dependency audit

`npm audit --omit=dev` reports **0** vulnerabilities, so nothing shipped to the browser is affected.
The full `npm audit` reports **36** findings (33 high, 3 moderate), all inside developer tools used
when synthesizing or generating the AWS backend (`@aws-amplify/backend`, `@aws-amplify/backend-cli`,
`aws-cdk-lib`). They don't run in the browser app or in the Lambda bundles. They come from three
packages that have no compatible fix yet:

| Package | Issue | Why it isn't fixed here |
|---|---|---|
| `braces` 3.0.3 | Denial of service from deeply nested glob patterns | No patched release exists. Reached through `micromatch` and `fast-glob` in the CDK and Amplify CLI tooling. Patterns come from the project's own code, not from visitors. |
| `brace-expansion` 5.0.9 | Denial of service from crafted brace patterns | Bundled inside `aws-cdk-lib` 2.272.0, the latest release, so npm can't override it. Only matches the project's own asset paths at synth time. |
| `csv-parse` 5.6.0 | Prototype pollution through the `columns` option | Fixed only in a new major version (7.x). Used only by `ampx generate schema-from-database`, which this project doesn't use. |

Three other vulnerable packages are fixed with scoped `overrides` in `package.json`, staying
within the same major version: `lodash` 4.18.1, `immutable` 3.8.4, and `mysql2` 3.24.5. This took
the count from 46 to 36. Don't run `npm audit fix --force`. It "fixes" the rest by downgrading
`@aws-amplify/backend-cli` to 0.11.1, which is a breaking change.

## 6. Known limitations of the local demo

- Simulated sign-in is not security. Anyone using the browser can pick either account.
- Simulated answers return the approved text verbatim. The production Lambda lets Bedrock phrase the answer from the same entries.
- Retrieval is keyword-based. Unusual wording can miss an approved answer, in which case the visitor is offered a handoff. The owner's **Test the assistant** box shows what will match.
- All data stays in this browser. Clearing site data resets it.
