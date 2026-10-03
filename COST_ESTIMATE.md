# Cost estimate: Array of Sunshine support assistant (us-east-2)

**Bottom line:** using the recommended model (Amazon Nova Lite), the planned AWS stack costs about
**$0.65 to $0.80 per month at 10 conversations/day** and **about $2.90 to $3.05 per month at 100
conversations/day**, before any AWS Free Tier or credits. Adding an AWS WAF firewall in front of
the public chat endpoint (recommended for production) adds about **$8 per month**, which would
then be the largest line item.

These are planning estimates, not quotes. Prices change. Re-check them with the
[AWS Pricing Calculator](https://calculator.aws/) before launch.

- **Region:** US East (Ohio), `us-east-2`
- **Prices retrieved:** October 3, 2026, read-only, from the AWS Price List API (`pricing:GetProducts`) through the AWS MCP server
- **Currency:** USD. A month is 30 days. Tax, support plans, and domain names are excluded.
- **Free Tier:** excluded on purpose. AWS Free Tier terms differ by account age and type, so check [aws.amazon.com/free](https://aws.amazon.com/free/).

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
| AWS WAF (optional) | https://aws.amazon.com/waf/pricing/ |
| AWS Pricing Calculator | https://calculator.aws/ |

## Model availability check and recommendation

On October 3, 2026 I ran read-only `ListFoundationModels` and `ListInferenceProfiles` calls in
`us-east-2` against the project's AWS account. No model was invoked. All of the candidates below are
`ACTIVE` and support response streaming.

| Model | How to call it from us-east-2 | Input / output price per 1M tokens (us-east-2) |
|---|---|---|
| **Amazon Nova Lite (recommended)** | Base model ID `amazon.nova-lite-v1:0` (on-demand in-region), or profile `us.amazon.nova-lite-v1:0` | **$0.06 / $0.24** |
| Amazon Nova Micro (cheapest) | Only through inference profile `us.amazon.nova-micro-v1:0` (US regions) | $0.035 / $0.14 |
| Amazon Nova 2 Lite | Profile `us.amazon.nova-2-lite-v1:0` or `global.amazon.nova-2-lite-v1:0` | $0.33 / $2.75 (global profile: $0.30 / $2.50) |
| Anthropic Claude Haiku 4.5 | Profile `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Not returned by the Price List API (sold through AWS Marketplace). See the Bedrock pricing page. |

**Recommendation: Amazon Nova Lite, `amazon.nova-lite-v1:0`.**

- It supports on-demand invocation directly in `us-east-2`, so requests stay in Ohio and the IAM policy needs only one foundation-model ARN.
- The task is narrow: rephrase up to 5 owner-approved answers, or return the handoff sentinel. A small model handles this well, and the backend already refuses to call the model when no approved entry matches.
- Nova Micro is about 40% cheaper but requires the `us.` cross-region profile, which can route requests to us-east-1 or us-west-2. At this volume, the saving is cents per month.
- Move up to Nova 2 Lite or Claude Haiku 4.5 only if testing shows Nova Lite's answers are not good enough.
- **Streaming:** the backend uses the Bedrock Runtime `ConverseStream` API, which the AWS docs list as supported for these models. Lambda needs `bedrock:InvokeModelWithResponseStream`.

## Usage assumptions

| Assumption | Value | Why |
|---|---|---|
| Visitor messages per conversation | **4** | Typical small-business FAQ chats are short |
| Assistant replies per conversation | **4** (so **8 messages** stored per conversation) | One reply per visitor message |
| Bedrock calls per conversation | **4** | Conservative. In practice greetings, "talk to a person", and unmatched questions skip the model. |
| **Input tokens per Bedrock call** | **1,500** | Rules ~250, up to 5 approved entries ~600, up to 6 prior messages ~550, visitor message ~50, overhead ~50 |
| **Output tokens per Bedrock call** | **150** | Answers are capped at ~90 words. `maxTokens` is set to 400 as a hard ceiling. |
| Input / output tokens per conversation | 6,000 / 600 | 4 calls × the above |
| Public Lambda invocations per conversation | 6 | 4 messages (~3 s each at 512 MB) + start + config (~0.2 s each) |
| Owner dashboard API calls per month | 1,500 (10/day) or 6,000 (100/day) | Owner checks the dashboard a few times a day |
| Website page views per conversation | 30 | Most visitors never open the chat, but every page loads the widget script |
| Widget script size | 40 KB compressed | Target for the standalone production widget bundle |
| Uploaded documents | 1 GB | Menus and price sheets |
| Deploys per month | 8 builds × 4 minutes | Normal iteration |

| Monthly volume | 10 conversations/day | 100 conversations/day |
|---|---|---|
| Conversations | 300 | 3,000 |
| Messages stored | 2,400 | 24,000 |
| Bedrock calls | 1,200 | 12,000 |
| Input tokens | 1.8 million | 18 million |
| Output tokens | 0.18 million | 1.8 million |

## Bedrock model cost only

| Model | 10 conversations/day | 100 conversations/day |
|---|---|---|
| Nova Micro ($0.035 / $0.14) | 1.8 × 0.035 + 0.18 × 0.14 = **$0.09** | 18 × 0.035 + 1.8 × 0.14 = **$0.88** |
| **Nova Lite ($0.06 / $0.24)** | 1.8 × 0.06 + 0.18 × 0.24 = **$0.15** | 18 × 0.06 + 1.8 × 0.24 = **$1.51** |
| Nova 2 Lite ($0.33 / $2.75) | 1.8 × 0.33 + 0.18 × 2.75 = **$1.09** | 18 × 0.33 + 1.8 × 2.75 = **$10.89** |

## Full monthly estimate (Nova Lite)

Unit prices below are the us-east-2 prices returned by the Price List API.

| Service | Unit prices used | 10 conversations/day | 100 conversations/day |
|---|---|---|---|
| Bedrock (Nova Lite) | $0.06 per 1M input tokens, $0.24 per 1M output tokens | $0.15 | $1.51 |
| Lambda: public chat | $0.0000166667 per GB-second, $0.20 per 1M requests | 1,860 GB-s + 1,800 requests = $0.03 | 18,600 GB-s + 18,000 requests = $0.31 |
| Lambda: owner API | same | under $0.01 | under $0.01 |
| Lambda response streaming | $0.008 per GB streamed | under $0.01 | under $0.01 |
| DynamoDB on-demand | $0.125 per 1M reads, $0.625 per 1M writes; first 25 GB-month of storage $0 | ~15k reads + ~10k writes = $0.01 | ~100k reads + ~100k writes = $0.07 |
| DynamoDB point-in-time recovery | Per GB-month of table data (under 0.1 GB here) | ~$0.02 | ~$0.02 |
| AppSync (owner API) | $4.00 per 1M queries and mutations | $0.01 | $0.02 |
| Cognito (owner sign-in only) | Per monthly active user; tier-1 prices $0.0055 to $0.015 | $0.00 to $0.15 (≤10 owners) | $0.00 to $0.15 |
| S3 (documents) | $0.023 per GB-month; $0.005 per 1,000 PUTs | $0.02 | $0.02 |
| Amplify Hosting | $0.01 per build minute; $0.023 per GB stored; $0.15 per GB served | 32 build min + 0.46 GB served = $0.39 | 32 build min + 3.8 GB served = $0.89 |
| CloudWatch Logs | $0.50 per GB ingested | under $0.01 | $0.02 |
| **Total (without WAF)** | | **≈ $0.65 to $0.80** | **≈ $2.90 to $3.05** |

### Optional but recommended for production: AWS WAF

The public chat endpoint is open to the internet by design. Putting Amazon CloudFront plus AWS WAF
in front of it adds IP rate limiting and managed protections.

| Item | Price (us-east-2) | Monthly |
|---|---|---|
| 1 web ACL | $5.00 per web ACL | $5.00 |
| 3 rules (rate-based, AWS managed common rule set, IP reputation list) | $1.00 per rule | $3.00 |
| Requests | $0.60 per 1M requests | under $0.10 |
| **WAF total** | | **≈ $8 per month** |

CloudFront request and data-transfer charges also apply. See the
[CloudFront pricing page](https://aws.amazon.com/cloudfront/pricing/). Amplify Hosting's
built-in firewall integration is a separate option, listed at $15.00 per month in the Price List API.

## What would change these numbers

- **More approved entries per prompt or longer chats:** input tokens grow linearly. Doubling the prompt to 3,000 tokens roughly doubles the Bedrock line.
- **Switching models:** Nova 2 Lite is about 7× the Bedrock cost of Nova Lite, and Claude models cost more again. Even so, at 100 conversations/day Nova 2 Lite is about $11 per month.
- **Abuse or bot traffic:** the main cost risk. The design caps it with a per-IP rate limit (20 requests/minute), 500-character messages, 40 messages per conversation, `maxTokens` 400, an origin allow-list, and optional reserved concurrency. Add WAF and an AWS Budgets alert before launch.
- **Free Tier or credits:** these could make the non-Bedrock lines $0 in practice.

## Recommended guardrails

Create a monthly cost budget with an email alert. This creates an AWS resource, so run it only
when you are ready. Replace `you@example.com` first.

```powershell
@'
{"BudgetName":"array-of-sunshine-monthly","BudgetLimit":{"Amount":"10","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}
'@ | Set-Content -Encoding ascii "$env:TEMP\budget.json"

@'
[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"you@example.com"}]}]
'@ | Set-Content -Encoding ascii "$env:TEMP\budget-notifications.json"

$accountId = aws sts get-caller-identity --profile aws-project --query Account --output text
aws budgets create-budget --profile aws-project --account-id $accountId `
  --budget "file://$env:TEMP\budget.json" `
  --notifications-with-subscribers "file://$env:TEMP\budget-notifications.json"
```
