# Two-minute full-stack walkthrough

Start `npm run dev`, save the two passwords printed on first startup, and open localhost:5173.
Explain that authentication and SQLite persistence are real; answers use FAQ matching, not a model.

1. Open the bakery page. Ask "Are you open on Sunday?" to see approved opening hours.
2. Ask "Do you have keto cakes?". It should offer a human handoff.
3. Submit the handoff with fictional contact information.
4. Sign in as the bakery owner using the generated password. Show Inquiries and Unanswered.
5. Write an approved answer: "Keto cakes are available on Fridays." Keywords: keto, cakes.
6. Return to the widget and ask again; the server now returns the approved answer.
7. Sign out, sign in as the bike-shop owner, and confirm the bakery inquiry is absent.
8. Restart the backend and verify the bakery answer and inquiry persisted in SQLite.

Never use real customer details in portfolio recordings. Do not describe the AWS scaffold as deployed.
