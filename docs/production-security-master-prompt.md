# Production Security Master Prompt

Copy everything under "THE PROMPT" and paste it into your AI coding assistant (Claude Code, Cursor, Copilot, etc.) with your project open.

---

## THE PROMPT

Act as a senior security engineer. Audit this entire project and fix every security issue you find. Work through the six areas below in order. For each area, first scan the code, then list the problems you found, then refactor the code to fix them. Do not skip an area. Do not only report problems. Change the code.

### Ground Rules

- Scan the whole project: frontend, backend, database code, config files, scripts, Docker files, CI files, and the git history.
- Refactor insecure logic directly. Do not leave TODO comments in place of fixes.
- Keep the app working. Run the existing tests after each area. Add new tests for every fix.
- If a fix needs a decision from me (for example, which rate limit number to use), choose a safe default and tell me what you chose.
- At the end, give me a report. List each problem found, the file it was in, the fix you made, and anything I must do by hand (for example, rotate a leaked key).

---

### Area 1: Secure Authentication

Goal: verify who a user is, and stop attackers from taking over accounts.

Review the authentication system and make it secure. Make sure all of the following are true:

1. Passwords are hashed with a strong, slow algorithm (Argon2id, bcrypt, or scrypt). No plain text. No MD5. No SHA-1. No plain SHA-256.
2. Sessions and tokens expire. Set a sensible lifetime. Rotate session IDs on login. Invalidate sessions on logout and on password change.
3. Email verification is enabled. Users cannot use the app fully until they verify their email.
4. Password reset tokens are random, single-use, short-lived, and stored hashed. They stop working after use or after they expire.
5. Login attempts are rate limited per account and per IP address. Add a lockout or a growing delay after repeated failures.
6. Authentication secrets (JWT signing keys, session secrets, OAuth client secrets) never reach the frontend.
7. Cookies that hold sessions use HttpOnly, Secure, and SameSite flags.
8. Error messages for login and password reset do not reveal whether an email exists.
9. Password rules are enforced on the server (minimum length, no very common passwords).

Refactor every piece of insecure authentication logic you find.

---

### Area 2: Prevent Users From Accessing Other Users' Data

Goal: make sure users can only reach their own data.

Review every API endpoint and every database query. Make sure all of the following are true:

1. Every request checks that the logged-in user owns the data being accessed.
2. Ownership checks happen before reading, updating, or deleting any resource.
3. Insecure Direct Object Reference (IDOR) holes are closed. A user who changes an ID in a URL or request body must not see or change someone else's record.
4. Authorization is checked on the server. Never trust hidden fields, client-side checks, or user-supplied user IDs.
5. Admin-only routes check for the admin role on the server.
6. Database-level protection is turned on where available (for example, Row Level Security in Supabase/PostgreSQL), with policies that match the ownership rules.
7. List endpoints return only the current user's records.
8. API responses do not leak extra fields (password hashes, internal IDs, other users' emails).

Add a reusable ownership check (middleware, decorator, or helper) and use it on every protected route.

---

### Area 3: Secure Deployment and Monitoring

Goal: keep the app secure after it goes live, and spot attacks early.

Configure the app for secure deployment. Make sure all of the following are true:

1. HTTPS is enforced. HTTP redirects to HTTPS. HSTS is turned on.
2. Secrets are stored in the platform's secret manager or in environment variables. They are never in the code or the image.
3. The database is not open to the public internet. Allow connections only from the app server or a private network.
4. Debug mode is off in production. Detailed error pages and stack traces are hidden from users.
5. Security headers are set: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options (or frame-ancestors), Referrer-Policy.
6. CORS allows only the exact origins the app needs. No wildcard with credentials.
7. Dependencies are up to date. Run a dependency audit and fix known vulnerable packages.
8. Containers run as a non-root user with only the packages they need.
9. Logging is added for: authentication attempts (success and failure), API errors, permission denials, and unusual traffic patterns (spikes, many failures from one IP, odd hours).
10. Logs never contain passwords, tokens, API keys, or full card numbers.
11. Alerts or a clear way to review logs exists, so suspicious behavior can be noticed.

---

### Area 4: Protect Secrets and API Keys

Goal: keep every credential hidden.

Scan the entire project, including git history, for secrets and credentials. Make sure all of the following are true:

1. API keys, database service keys (such as Supabase service role keys), and tokens never appear in frontend code.
2. No secrets are committed to the repository. Search current files and past commits.
3. All secrets live in environment variables and are read only on the server.
4. Only public, safe values use a frontend prefix (such as `VITE_` or `NEXT_PUBLIC_`). Treat anything with that prefix as public.
5. `.env` and similar files are listed in `.gitignore`. A `.env.example` file with fake placeholder values is provided.
6. Any secret found in the repo or its history is listed in the report as compromised. Tell me to rotate it right away. Remove it from history if possible.
7. Add a secret-scanning step (for example, gitleaks or a pre-commit hook) so new leaks are caught.
8. Third-party calls that need a secret go through the backend. The frontend calls my backend, and my backend calls the third party.

---

### Area 5: Prevent Abuse and Bot Attacks

Goal: stop bots from spamming and overloading the app.

Add abuse protection. Make sure all of the following are true:

1. Rate limiting is in place for: login attempts, all API endpoints, account creation, password reset requests, and AI generation requests.
2. Limits are set per user and per IP address. Use stricter limits on expensive or sensitive routes.
3. Rate-limited requests get a clear 429 response with a Retry-After header.
4. Signup and other public forms are protected against bots (CAPTCHA or a similar challenge, plus a honeypot field where it fits).
5. Scraping and repeated automated calls are slowed or blocked. Cap page sizes and block unlimited pagination.
6. AI generation endpoints have per-user quotas and a maximum input size, so no one can run up my bill.
7. Request body size limits are set.
8. Suspicious patterns (many failed logins, many signups from one IP) are logged and can trigger a temporary block.

---

### Area 6: Input Validation

Goal: stop malicious data from entering the system.

Find every place where user input enters the system: forms, API request bodies, query parameters, URL paths, headers, cookies, and file uploads. Add strict validation and sanitization at each one. Make sure all of the following are true:

1. SQL injection is prevented. Use parameterized queries or the ORM's safe methods. Never build queries by joining strings.
2. Command injection is prevented. Never pass user input to a shell. If a command is needed, use safe argument lists with no shell.
3. Script injection (XSS) is prevented. Escape output, avoid `innerHTML` and `dangerouslySetInnerHTML` with user data, and sanitize any rich text.
4. File uploads are safe. Check file type by content, not only by name. Set a size limit. Rename files. Store them outside the web root or in object storage. Never run uploaded files.
5. Path traversal is blocked. Reject `../` and absolute paths in any file path built from input.
6. Validation uses a strict schema (for example, Zod, Pydantic, or Django serializers). Check types, lengths, ranges, and allowed values.
7. Invalid data is rejected with a clear error. Do not try to quietly fix it.
8. Validation happens on the server. Frontend validation is only for convenience.
9. Redirect URLs and outbound request URLs built from input are checked against an allow list (stops open redirects and SSRF).
10. CSRF protection is turned on for cookie-based sessions.

---

### Final Report (required)

When all six areas are done, give me:

1. A table with these columns: Area, Problem Found, File and Line, Fix Applied, Severity (Critical, High, Medium, Low).
2. A list of manual steps for me (secrets to rotate, settings to change in my hosting dashboard, DNS or HTTPS steps).
3. A list of tests you added and whether they pass.
4. A short list of anything you could not fix and why.
5. Suggested next steps, such as a penetration test or a dependency update schedule.

---

## Quick Checklist (tick off after the AI finishes)

- [ ] Passwords hashed with Argon2id, bcrypt, or scrypt
- [ ] Sessions expire and rotate
- [ ] Email verification works
- [ ] Reset tokens are single-use and short-lived
- [ ] Login attempts are rate limited
- [ ] Every endpoint checks data ownership (no IDOR)
- [ ] Row Level Security or equal database protection is on
- [ ] HTTPS enforced, HSTS on
- [ ] Database is not public
- [ ] Logging for auth, errors, and odd traffic
- [ ] No secrets in frontend code or git history
- [ ] Leaked secrets rotated
- [ ] Rate limits on login, API, signup, and AI routes
- [ ] Bot protection on public forms
- [ ] Strict server-side validation on every input
- [ ] SQL, command, and script injection blocked
- [ ] File uploads locked down
