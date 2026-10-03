# Cost estimate: Array of Sunshine support assistant (us-east-2)

**Bottom line**

| | 10 conversations/day | 100 conversations/day |
|---|---|---|
| **Estimated AWS usage cost, realistic** | **≈ $0.53 per month** | **≈ $1.75 per month** |
| Estimated AWS usage cost, conservative upper bound | ≈ $1.62 per month | ≈ $3.83 per month |
| Add AWS WAF (recommended before a public launch) | + ≈ $8 per month | + ≈ $8 per month |
| **Out-of-pocket payment today** | **$0** | **$0** |

*Usage cost* is what AWS meters for the resources you use. *Out-of-pocket payment* is what you
are actually billed after credits. The account is on the AWS **Free plan** with **$100 in credits**,
so usage is deducted from the credits and nothing is charged to a card (see
[Account check](#account-check-october-3-2026)). At the realistic rate, $100 of credits covers the
whole six-month Free plan many times over. With WAF it lasts about 10 to 11 months, which is longer
than the Free plan itself.

These are planning estimates, not quotes. Prices change. Re-check them with the
[AWS Pricing Calculator](https://calculator.aws/) before launch.

- **Region:** US East (Ohio), `us-east-2`
- **Prices and account details checked:** October 3, 2026, using read-only APIs through the AWS MCP server. Nothing was created and no model was invoked.
- **Currency:** USD. A month is 30 days. Tax, support plans, and domain registration are excluded.
- **Nothing is deployed yet**, so today's actual usage cost is $0.

## Account check (October 3, 2026)

Read-only calls: `freetier:GetAccountPlanState`, `freetier:GetFreeTierUsage`, and
`budgets:DescribeBudgets`. Cost Explorer was not queried, because each Cost Explorer API request
costs $0.01.

| Item | Result |
|---|---|
| Account plan | **Free plan**, active |
| Credits remaining | **$100.00**. AWS says new accounts can earn up to $100 more by completing activities in the console. |
| Free plan ends | **April 3, 2027**, or earlier if the credits run out |
| Free Tier usage recorded | None yet (nothing deployed) |
| Budgets and spending alerts | **None configured** |
| Services this project needs | All available on the Free plan: Bedrock, Lambda, DynamoDB, AppSync, Cognito, S3, Amplify, CloudWatch, CloudFront, WAF, Budgets ([supported services](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html)) |

### What the Free plan means for cost

Sources: [Choosing a plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html),
[AWS Free Tier terms](https://aws.amazon.com/free/terms/), and the
[Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/).

- **While on the Free plan, you are never charged.** Eligible usage is deducted from the credits. Services that could quickly use up the credits (for example Savings Plans, Reserved Instances, and most paid AWS Marketplace offers) aren't available until you upgrade.
- **When the credits run out or on April 3, 2027 (whichever comes first), the Free plan ends.** The account closes automatically and you lose access to its resources. The chat widget and dashboard would stop working.
- **You then have 90 days to upgrade to the Paid plan.** After 90 days, AWS permanently deletes the account and everything in it.
- **If you upgrade to the Paid plan** (at any time), the remaining credits apply automatically to your bills. Free Tier credits expire 12 months after the account was opened, around October 2027 for this account. After the credits are used or expire, you pay standard pay-as-you-go prices, which is the "usage cost" in this document.
- **Free plan limits that affect this project:**
  - **Bedrock cross-Region inference profiles aren't supported on the Free plan.** This likely blocks Nova Lite in `us-east-2`; see [Model availability](#model-availability-check-and-recommendation).
  - **AWS Marketplace is limited to Bedrock and free offers.**
  - **Joining AWS Organizations or Control Tower automatically upgrades the account** to the Paid plan.

### Always-free allowances (Free and Paid plans)

Verified on the AWS Free Tier and pricing pages on October 3, 2026. The realistic estimate applies them.

| Service | Monthly allowance | Effect here |
|---|---|---|
| AWS Lambda | 1 million requests and 400,000 GB-seconds | Covers both functions at these volumes |
| Amazon Cognito | 10,000 monthly active users (Lite and Essentials) | Covers owner sign-in |
| Amazon CloudWatch | 5 GB of log ingestion, storage, and Logs Insights scans; 10 alarms; 10 custom metrics; 3 dashboards | Covers logs and the recommended alarms |
| Amazon DynamoDB | 25 GB of storage; 25 provisioned read and write capacity units | Covers storage. **On-demand requests aren't covered** and are billed (fractions of a cent here). |

Bedrock, AppSync, S3, Amplify Hosting, WAF, and Route 53 have no always-free allowance on this
plan. Their usage is paid from credits.

## Official pricing pages

| Service | Pricing page |
|---|---|
| Amazon Bedrock | https://aws.amazon.com/bedrock/pricing/ |
| AWS Lambda | https://aws.amazon.com/lambda/pricing/ |
| Amazon DynamoDB (on-demand) | https://aws.amazon.com/dynamodb/pricing/on-demand/ |
| AWS AppSync | https://aws.amazon.com/appsync/pricing/ |
| Amazon Cognito | https://aws.amazon.com/cognito/pricing/ |
| Amazon S3 | https://aws.amazon.com/s3/pricing/ |
| AWS Amplify Hosting | https://aws.amazon.com/amplify/pricing/ |
| Amazon CloudWatch | https://aws.amazon.com/cloudwatch/pricing/ |
| Amazon Route 53 (optional) | https://aws.amazon.com/route53/pricing/ |
| AWS WAF (optional) | https://aws.amazon.com/waf/pricing/ |
| Amazon CloudFront (with WAF) | https://aws.amazon.com/cloudfront/pricing/ |
| AWS Free Tier | https://aws.amazon.com/free/ |
| AWS Pricing Calculator | https://calculator.aws/ |

## Model availability check and recommendation

On October 3, 2026 I ran read-only `ListFoundationModels` and `ListInferenceProfiles` calls in
`us-east-2` against the project's AWS account. No model was invoked. All of the candidates below are
`ACTIVE` and support response streaming.

| Model | How to call it | Input / output price per 1M tokens |
|---|---|---|
| **Amazon Nova Lite (recommended)** | Base model ID `amazon.nova-lite-v1:0`. See the region note below. | **$0.06 / $0.24** (same in us-east-1 and us-east-2) |
| Amazon Nova Micro (cheapest) | From us-east-2 only through inference profile `us.amazon.nova-micro-v1:0`. **Not usable from us-east-2 on the Free plan.** | $0.035 / $0.14 |
| Amazon Nova Pro | Base model ID `amazon.nova-pro-v1:0`, with an in-Region on-demand quota in us-east-2 | $0.80 / $3.20 (us-east-2) |
| Amazon Nova 2 Lite | Profile `us.amazon.nova-2-lite-v1:0` or `global.amazon.nova-2-lite-v1:0`. **Not usable on the Free plan.** | $0.33 / $2.75 (global profile: $0.30 / $2.50) |
| Anthropic Claude Haiku 4.5 | Profile `us.anthropic.claude-haiku-4-5-20251001-v1:0`. **Not usable on the Free plan.** | Not returned by the Price List API (sold through AWS Marketplace). See the Bedrock pricing page. |

### Region note: Nova Lite in us-east-2 on the Free plan (decided: option A)

**Decision (October 3, 2026): option A.** The app stays in us-east-2 and the `public-chat` Lambda
calls Nova Lite in us-east-1 (`BEDROCK_REGION`, default `us-east-1`). This is implemented in code
but not yet confirmed by a real model call.

A second read-only check on October 3, 2026 found a conflict:

- `GetFoundationModel` in us-east-2 lists `ON_DEMAND` for `amazon.nova-lite-v1:0`, and `GetFoundationModelAvailability` reports the account as authorized.
- But **Service Quotas has no in-Region on-demand quota for Nova Lite in us-east-2**. It lists only cross-Region quotas. Nova Pro, Llama, Mistral, and others do have in-Region quotas there.
- In **us-east-1**, Nova Lite has normal in-Region on-demand quotas: 2,000 requests and 4,000,000 tokens per minute.

This strongly suggests Nova Lite can only be reached from us-east-2 through the `us.` cross-Region
profile, which the Free plan doesn't support. Only a real model call can confirm it, and no paid
call has been made. Options:

| Option | Model cost (realistic, 10/day / 100/day) | Trade-off |
|---|---|---|
| **A. Keep the app in us-east-2 and call Nova Lite in us-east-1** (recommended) | $0.08 / $0.76 | Small backend change (a Bedrock region setting). Visitor messages are processed by the model in N. Virginia; everything else stays in Ohio. |
| B. Use Nova Pro in us-east-2 | $1.01 / $10.08 | No code change beyond the model ID; about 13 times the model cost |
| C. Upgrade to the Paid plan and use `us.amazon.nova-lite-v1:0` | $0.08 / $0.76 | Ends the Free plan's no-charge guarantee. Requests may be served from any US Region. |
| D. Move the whole stack to us-east-1 | $0.08 / $0.76 | Simplest IAM, but all data moves to N. Virginia |

The estimates in this document assume Nova Lite pricing, which is the same for options A, C, and D.

**Recommendation: Amazon Nova Lite, `amazon.nova-lite-v1:0`, called in-Region (option A or D on the Free plan).**

- The task is narrow: rephrase up to 5 owner-approved answers, or return the handoff sentinel. A small model handles this well, and the backend already refuses to call the model when no approved entry matches.
- After upgrading to the Paid plan, Nova Micro would save a few cents a month. Move up to Nova 2 Lite or Claude Haiku 4.5 only if testing shows Nova Lite's answers are not good enough.
- **Streaming:** the backend uses the Bedrock Runtime `ConverseStream` API, which the AWS docs list as supported for these models. Lambda needs `bedrock:InvokeModelWithResponseStream`.

## Usage assumptions

The **realistic** column is the main estimate. The **conservative** column assumes every visitor
message reaches the model, more builds, Route 53 DNS, and no always-free allowances.

| Assumption | Realistic | Conservative | Why |
|---|---|---|---|
| Visitor messages per conversation | 3 | 4 | Small-business FAQ chats are short |
| Bedrock calls per conversation | 2 | 4 | Greetings, "talk to a person", and unmatched questions skip the model. About one message in three does. |
| Input / output tokens per Bedrock call | 1,500 / 150 | 1,500 / 150 | Rules ~250, up to 5 approved entries ~600, up to 6 prior messages ~550, visitor message ~50, overhead ~50. Answers are capped near 90 words; `maxTokens` is 400. |
| Public Lambda work per conversation | start + config (0.2 s each), model calls 3 s, skipped messages 0.3 s, at 512 MB | same | Model calls dominate the duration |
| Owner dashboard API calls per month | 1,500 (10/day) or 6,000 (100/day) | same | A few dashboard visits a day |
| Website page views per conversation | 30 | 30 | Most visitors never open the chat, but every page loads the widget script |
| Widget script size | 40 KB compressed | same | Target for the standalone widget bundle |
| Owner dashboard traffic | 0.1 GB per month | same | ~110 KB per dashboard load |
| Uploaded documents | 1 GB | 1 GB | Menus and price sheets |
| Amplify builds per month | 4 × 8 minutes | 8 × 8 minutes | Gen 2 builds deploy the backend too, so they take longer than a static site build |
| Owners signing in | 2 | 10 | The two sample businesses |
| DNS | Existing provider | Route 53 hosted zone | |

| Monthly volume (realistic) | 10 conversations/day | 100 conversations/day |
|---|---|---|
| Conversations | 300 | 3,000 |
| Bedrock calls | 600 | 6,000 |
| Input tokens | 0.9 million | 9 million |
| Output tokens | 0.09 million | 0.9 million |
| Public Lambda compute | ~1,000 GB-seconds | ~10,000 GB-seconds |
| DynamoDB writes / reads | ~4,500 / ~13,000 | ~45,000 / ~84,000 |
| Website data served | ~0.46 GB | ~3.7 GB |

## Bedrock model cost only

| Model | Realistic, 10/day | Realistic, 100/day | Conservative, 10/day | Conservative, 100/day |
|---|---|---|---|---|
| **Nova Lite ($0.06 / $0.24)** | **$0.08** | **$0.76** | $0.15 | $1.51 |
| Nova Micro ($0.035 / $0.14), Paid plan only | $0.04 | $0.44 | $0.09 | $0.88 |
| Nova 2 Lite ($0.33 / $2.75), Paid plan only | $0.54 | $5.45 | $1.09 | $10.89 |

## Full monthly estimate (Nova Lite)

Unit prices are the us-east-2 prices returned by the Price List API. Totals were calculated with a
script from the unrounded line items.

| Service | Unit prices used | Realistic, 10/day | Realistic, 100/day | Conservative, 10/day | Conservative, 100/day |
|---|---|---|---|---|---|
| Bedrock (Nova Lite) | $0.06 per 1M input tokens, $0.24 per 1M output tokens | $0.08 | $0.76 | $0.15 | $1.51 |
| Lambda (both functions, incl. response streaming) | $0.0000166667 per GB-second, $0.20 per 1M requests | $0.00 (always free) | $0.00 (always free) | $0.03 | $0.32 |
| DynamoDB on-demand requests | $0.125 per 1M reads, $0.625 per 1M writes | under $0.01 | $0.04 | $0.01 | $0.05 |
| DynamoDB point-in-time recovery | Per GB-month of table data (under 0.1 GB) | $0.02 | $0.02 | $0.02 | $0.02 |
| AppSync (owner API) | $4.00 per 1M queries and mutations | $0.01 | $0.02 | $0.01 | $0.02 |
| Cognito (owner sign-in) | Per monthly active user | $0.00 (always free) | $0.00 (always free) | $0.15 | $0.15 |
| S3 (documents) | $0.023 per GB-month; $0.005 per 1,000 PUTs | $0.02 | $0.02 | $0.02 | $0.02 |
| Amplify Hosting | $0.01 per build minute; $0.15 per GB served; $0.023 per GB stored | $0.39 | $0.88 | $0.71 | $1.20 |
| CloudWatch Logs and alarms | $0.50 per GB ingested | $0.00 (always free) | $0.00 (always free) | under $0.01 | $0.01 |
| CDK bootstrap asset bucket | S3 storage for deployment assets | $0.01 | $0.01 | $0.01 | $0.01 |
| Route 53 hosted zone | $0.50 per hosted zone | — | — | $0.50 | $0.50 |
| **Total usage cost (without WAF)** | | **≈ $0.53** | **≈ $1.75** | **≈ $1.62** | **≈ $3.83** |
| **Total with WAF (≈ $8)** | | ≈ $8.53 | ≈ $9.75 | ≈ $9.62 | ≈ $11.83 |

### How long $100 of credits lasts

| Scenario | Usage over the 6-month Free plan | Credits left at April 3, 2027 |
|---|---|---|
| Realistic, 10/day | ≈ $3 | ≈ $97 |
| Realistic, 100/day | ≈ $11 | ≈ $89 |
| Realistic, 100/day, with WAF | ≈ $59 | ≈ $41 |
| Conservative, 100/day, with WAF | ≈ $71 | ≈ $29 |

In every scenario the Free plan ends because of its **date**, not because the credits run out.
Sustained bot traffic is the only realistic way to exhaust the credits early (see below). Plan to
upgrade to the Paid plan before April 3, 2027 if the app should keep running.

## Costs not included in the totals

- **Domain registration:** about $10 to $15 per year for a `.com` (Route 53 or another registrar).
- **CloudFront in front of WAF:** request and data-transfer charges. CloudFront is supported on the Free plan; check its pricing page for current free allowances.
- **Amplify Hosting firewall:** an alternative to a separate WAF setup, listed at $15.00 per month in the Price List API.
- **Bedrock Guardrails** (recommended in README step 4): charged per amount of text checked on input and output. Price it on the Bedrock pricing page before enabling it.
- **Amazon SES** for owner email notifications (README step 8): needed at real volumes, because Cognito's built-in email sender has a low daily limit.
- **Extra environments:** each `ampx sandbox` and each Amplify branch is a full copy of the backend. They are nearly free when idle, but each adds its own point-in-time recovery and log charges.
- **Development and testing:** a day of sandbox testing with real model calls costs cents.
- **Data transfer out of Lambda and S3:** under 0.1 GB per month at these volumes.
- **Tax and AWS Support plans.**

## What would change these numbers

- **Abuse or bot traffic is the main cost risk.** The design caps it with:
  - a per-IP rate limit (20 requests/minute),
  - 500-character messages,
  - 40 messages per conversation,
  - `maxTokens` 400,
  - an origin allow-list,
  - and optional reserved concurrency.

  Add WAF and a budget alert before launch.
- **More approved entries per prompt or longer chats:** input tokens grow linearly. Doubling the prompt to 3,000 tokens roughly doubles the Bedrock line.
- **Switching models (Paid plan only):** Nova 2 Lite costs about 7 times as much as Nova Lite. Even so, it would be about $5 to $11 per month at 100 conversations/day.
- **Busier development:** each extra 8-minute build adds $0.08.

## Recommended guardrails

**No budget is configured** (checked October 3, 2026). Budgets are available on the Free plan, and
monitoring-only budgets are free. On the Free plan a budget can't stop charges, because there
aren't any. It still warns you if credits are being used faster than expected. It becomes essential
after upgrading to the Paid plan.

The command below creates a $10 monthly budget. It emails you when actual spend passes 80% and
when forecast spend passes 100%. **It creates an AWS resource, so run it only when you're ready.**
Replace `you@example.com` first.

```powershell
@'
{"BudgetName":"array-of-sunshine-monthly","BudgetLimit":{"Amount":"10","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}
'@ | Set-Content -Encoding ascii "$env:TEMP\budget.json"

@'
[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"you@example.com"}]},
 {"Notification":{"NotificationType":"FORECASTED","ComparisonOperator":"GREATER_THAN","Threshold":100,"ThresholdType":"PERCENTAGE"},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"you@example.com"}]}]
'@ | Set-Content -Encoding ascii "$env:TEMP\budget-notifications.json"

$accountId = aws sts get-caller-identity --profile aws-project --query Account --output text
aws budgets create-budget --region us-east-1 --profile aws-project --account-id $accountId `
  --budget "file://$env:TEMP\budget.json" `
  --notifications-with-subscribers "file://$env:TEMP\budget-notifications.json"
```

Re-check the account plan and credits at any time (read-only, free):

```powershell
aws freetier get-account-plan-state --region us-east-1 --profile aws-project
aws budgets describe-budgets --region us-east-1 --profile aws-project `
  --account-id (aws sts get-caller-identity --profile aws-project --query Account --output text)
```
