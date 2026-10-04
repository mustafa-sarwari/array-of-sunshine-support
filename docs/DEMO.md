# Array of Sunshine Support: local walkthrough

**Mode:** real Node HTTP API, SQLite persistence and password sign-in; deterministic FAQ matching, no generative model.

1. Run the README setup and sign in as the locally seeded Maple owner using the password printed by your server.
2. Open Approved answers and add: “Do you offer office pastry boxes?” → “Office pastry boxes are available by preorder with 48 hours notice.” Add keywords `office pastry boxes` and save it as approved.
3. Open `/demo/maple-street-bakery`, open the widget and ask that question.
4. Ask about keto cakes. Choose the human handoff and submit fictional customer details.
5. Open the owner’s Inquiries page and refresh to show the saved request.

The committed recording and screenshots use a temporary SQLite database. No real customer information, credentials, recovery codes or cloud resources appear in them. They demonstrate this workflow rather than a production deployment.
