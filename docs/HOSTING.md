# Free Render demo

Live demo: https://sunshine-support-demo.onrender.com/

On October 5, 2026, Render reported a successful deployment and the hosted visitor widget returned its approved Sunday-hours answer. Windows and Linux CI passed types, tests and builds. Owner authentication is covered by HTTP tests; a hosted owner-account walkthrough has not yet been performed.

1. Create a Render Blueprint from this public repository, using `render.yaml` on `main`.
2. Confirm the service uses the **Free** plan. Do not add paid storage or databases.
3. Deploy and open the HTTPS service URL. The server uses Render's `RENDER_EXTERNAL_URL` as its exact origin allowlist.
4. Confirm `/api/health` returns status `ok`, then check the visitor demo and create a fictional owner account to verify sign-in, FAQ saving, refresh, and sign-out.
5. Only after those checks, add the verified live URL to the repository About field and profile README.

The one Node.js 24 process serves the built frontend, widget and real SQLite API.
Dependencies include development packages because the start command uses `tsx`.
Hosted sessions have Secure, HttpOnly, SameSite=Strict cookies. Generated sample-owner passwords are not printed in hosted mode; create a separate demo account.

## Demo limits

Render Free storage is ephemeral: SQLite accounts and changes reset on sleep, restart or deployment. The site displays this limitation. Use fictional information and a unique disposable password. A cold first visit can take about a minute. This is not durable production hosting.

Keep one server process. The in-memory snapshot storage cannot support multiple workers.
Behind Render's proxy, the current socket-address rate limiter can apply a shared limit to visitors; the app intentionally does not trust arbitrary forwarded headers.

For a custom domain, set `ALLOWED_ORIGINS` to exact HTTPS origins separated by commas, including the Render URL if still used. No wildcards. Production startup fails if no valid HTTPS origin is configured.
Local defaults remain loopback HTTP without Secure cookies.

References: [Render Free](https://render.com/docs/free), [Blueprint specification](https://render.com/docs/blueprint-spec), [default environment variables](https://render.com/docs/environment-variables).
