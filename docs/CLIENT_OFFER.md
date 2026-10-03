# Client offer: FAQ and inquiry widget for your business

A chat widget for your website that answers customer questions **only from information you have
approved**, such as hours, prices, policies, and services. When it doesn't know, it says so and
offers to pass the question to you. You manage the answers, read conversations, and follow up on
inquiries in a private dashboard.

This document describes what I can build for you, what the current demo actually shows, and
what still has to be built and tested.

## What I customize for your business

- **Your approved answers.** I load your FAQs, hours, prices, services, and policies as approved
  entries and tune the keywords so common wording finds the right answer.
- **Your branding.** Business name, colors, greeting, and contact details in the widget.
- **Inquiry handling.** What the handoff form asks for (name, email, phone, message) and where
  inquiries go. Today they appear in the dashboard. Email notifications are optional extra work.
- **Embedding.** One script tag on your website, tested on your site's pages and on phones.
- **Owner training.** A short walkthrough of the dashboard: approving answers, reading
  conversations, and turning unanswered questions into new answers.

## What the current demo demonstrates

The demo runs entirely in your web browser with two fictional businesses. Every page shows a
**"Demo — simulated sign-in, AI, and storage"** banner.

| Shown in the demo | How it works in the demo |
|---|---|
| The chat widget on a sample website, on desktop and phones | Real interface |
| Answers come only from approved entries; drafts are never used | Real matching logic, the same code the AWS backend uses |
| "I don't know" plus a handoff offer for anything not approved | Real logic |
| Handoff requests appear in the owner's **Inquiries** list | Real interface; stored in the browser |
| Unanswered questions appear in an inbox and become new answers in one click | Real interface; stored in the browser |
| Each owner sees only their own business's data | Same rules as the backend, but enforced in the browser, so not real security |
| Owner sign-in | **Simulated.** One-click demo accounts, no passwords checked. |
| AI replies | **Simulated.** The approved text is returned word by word. No AI model is called. |
| Storage | **Simulated.** Browser storage only; clearing site data resets it. |
| A standalone widget script for any website | Built and tested against a mock server only |

## What still requires implementation and testing

The AWS version (Cognito sign-in, AppSync, Lambda, DynamoDB, S3, and Amazon Bedrock for AI
replies) is **written but has never been deployed or run**. It is not production-ready. A real
project for your business includes:

1. **First deployment and fixes.** Deploying the backend into your AWS account and fixing the
   issues a first deployment usually reveals.
2. **Integration testing.** Real sign-in, two-business data separation, visitor privacy,
   rate limits, and the widget on your website against the real chat endpoint. These tests
   haven't been written yet.
3. **AI answer quality.** Testing real AI replies against your approved answers, questions that
   should be refused, and prompt-injection attempts. Tuning the matching and the prompt.
4. **AI model region.** Confirming that the chosen Bedrock model works in your account's region.
   On the demo's own AWS account, this is unverified.
5. **Cost and health alerts.** An AWS Budgets alert at the agreed amount, and error alarms.
6. **Optional extras, quoted separately if wanted:** inquiry email notifications, a web
   application firewall (about $8/month in AWS fees), a custom domain, a privacy notice and AI
   disclosure in the widget, and an admin flow for adding owners.

## Hosting and AI accounts: owned by you, with an agreed budget

- **Your AWS account.** Everything runs in an AWS account that you own and pay for directly.
  I don't host your data or resell AWS services. You keep full control if we stop working
  together.
- **Agreed monthly budget.** Before anything is deployed, we agree in writing on a monthly limit
  for AWS hosting and AI usage. I set an AWS Budgets alert at that amount, and the widget has
  built-in limits: message length, conversation length, reply length, and per-visitor rate.
- **Rough usage estimate.** For a small business, estimated AWS usage is about $0.50 to $2 a
  month at 10 to 100 conversations a day, plus about $8 a month if a firewall is added. These
  are estimates from AWS list prices, not measurements, and real usage depends on your traffic.
  See [COST_ESTIMATE.md](../COST_ESTIMATE.md).
- **No spending without approval.** Upgrading AWS plans, adding paid services, or raising the
  budget happens only with your written approval.

## Fixed project quote

- **Agreed before work begins.** After a short call about your business and website, I send a
  fixed quote that lists exactly what is included: the items above that you choose, the number
  of approved answers I load, and the number of revision rounds.
- **The quote covers my work only.** AWS hosting and AI usage are billed by AWS to your account
  within the agreed budget.
- **Changes are quoted first.** Anything outside the agreed list is quoted separately before I
  start on it.
- **Handover.** You receive the source code, the deployed widget in your account, the embed
  snippet for your website, and a short owner guide.

## See it

A two-minute walkthrough of the demo is in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). The source code
and technical details are in the [README](../README.md).
