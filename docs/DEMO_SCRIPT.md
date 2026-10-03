# Two-minute demo script

**Flow:** approved answer → unanswered question → owner inquiry inbox.

Everything runs in the browser with fictional data. Nothing is sent to AWS, and no AI model is
called. Point out the **"Demo — simulated sign-in, AI, and storage"** banner at the start.

## Before the call

1. Start the demo (see [README section 1](../README.md#1-run-the-local-demo-windows-powershell)).
   With the development server it runs at http://localhost:5173. Use port 4173 if you run the
   production preview instead.
2. Open http://localhost:5173/ and click **Reset demo data** so the counts start fresh.
3. Open two browser tabs:
   - **Tab A:** http://localhost:5173/demo/maple-street-bakery (the sample bakery website)
   - **Tab B:** http://localhost:5173/owner/sign-in (the owner dashboard)

## The script

| Time | Do this | Say this |
|---|---|---|
| 0:00 | Tab A. Point at the banner, then click the chat button in the corner. | "This is a demo with a fictional bakery. Sign-in, AI, and storage are simulated, and the banner says so on every page." |
| 0:10 | Ask **"Are you open on Sunday?"** | "It answers from the hours the owner approved. See the *From approved business information* label. It can't invent hours." |
| 0:30 | Ask **"Do you have keto cupcakes?"** | "The owner never approved anything about keto, so it says it doesn't know instead of guessing, and offers a person." |
| 0:40 | Click **Yes, contact the team**. Enter a name and an email such as `client-demo@example.com`, then click **Send to team**. | "The visitor leaves their details instead of leaving the site." |
| 0:55 | Tab B. Under **Demo accounts**, click **Maple Street Bakery**. | "Now I'm the owner. In a real deployment this is a secure sign-in." |
| 1:05 | Click **Unanswered**. Find "Do you have keto cupcakes?". | "Every question the assistant couldn't answer lands here, so the owner learns what customers actually ask." |
| 1:15 | Click **Inquiries**. Show the new request with the visitor's name and email. | "Here is the handoff request, linked to the conversation. The owner marks it Contacted or Resolved." |
| 1:30 | Back on **Unanswered**, click **Write approved answer** on the keto question. Enter the answer "Yes. Keto cupcakes are baked every Friday. Order 48 hours ahead." and the keywords `keto, low carb, cupcakes`. Leave it approved and click **Save**. | "One click turns a gap into an approved answer." |
| 1:45 | Tab A. In the chat, click **New chat** and ask **"Do you have keto cupcakes?"** again. | "Now the assistant answers, using only what the owner just approved." |
| 2:00 | Close. | "For your business, I'd load your answers, match your branding, and deploy it in your own AWS account with a budget we agree on first." |

## If they ask

- **"Is the AI real?"** Not in this demo. Replies here are the approved text itself. In the AWS
  version, Amazon Bedrock rephrases the reply, limited to the approved entries. That version is
  written but hasn't been deployed or tested yet.
- **"Can another business see my data?"** Click **Sign out**, sign in as **Harbor Bike Repair**, and show that its
  inquiries and answers are separate. Ask the bakery widget "How much is a tune-up?" and it
  refuses, because that answer belongs to the bike shop. In the demo this separation is enforced
  in the browser. The AWS backend enforces it on the server, but that is untested.
- **"What does it cost to run?"** Hosting and AI run in your own AWS account within a monthly
  budget agreed in writing, estimated at a few dollars a month for a small business. My work is
  a fixed quote agreed before I start. See [CLIENT_OFFER.md](CLIENT_OFFER.md).
- **"Can I try it on my website?"** The standalone widget script exists but has been tested only
  against a mock server. Putting it on a real site is part of a client project.

## After the demo

Click **Reset demo data** on the home page or the dashboard overview to restore the sample data.
