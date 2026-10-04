# Reusing the pattern for Fintruvia

This is an architecture reference, not a change to Fintruvia. The connected repository named
`mustafa-sarwari/Fintruvia` is empty, so it does not provide the running app's backend for inspection.

Keep Fintruvia's existing PostgreSQL/Prisma backend. Transfer the tested patterns rather than replacing
it with this portfolio app's SQLite snapshot compatibility layer:

| Support app pattern | Fintruvia application |
|---|---|
| Server derives business access from session identity | Server derives financial account ownership from authenticated user |
| Password hashes, session revocation | Preserve existing auth; test reset and refresh-token revocation |
| Separate tables and foreign keys | Prisma migrations for users, accounts, transactions, budgets, goals |
| Owner-scoped API queries | User-scoped SQL queries; test cross-user access |
| 400 validation, 404 inaccessible records, generic 500 | Shared typed API errors and request IDs |
| Structured logs with no customer text | Never log transaction descriptions, balances, credentials or tokens |
| API integration and browser tests | Verify login, CRUD, persistence and cross-user isolation |

Before modifying the real app: identify its source repository, inspect current migrations/auth/tests,
create a branch, add missing patterns, and verify against a separate test database. Do not copy sample
owners, support-chat records, or local recovery-code UI into the finance app. No deployment is needed
for this planning step.
