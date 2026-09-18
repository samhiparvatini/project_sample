# Backend user passwords

New users use Argon2id (64 MiB memory, 3 iterations, parallelism 1), a fresh
16-byte random salt, and the server's `ARGON2_PASSWORD_PEPPER` secret.
Store the pepper outside source control and retain it across restarts and deployments.
Losing or changing it prevents existing passwords from verifying.
The encoded hash includes the salt; `Password_Salt` also stores the base64 salt.

## Configuration

Set `DATABASE_URL`, `ARGON2_PASSWORD_PEPPER`, and `JWT_SECRET` in your local `.env`.
`JWT_SECRET` must be a stable random secret of at least 32 bytes; generate one with
`openssl rand -hex 48`. The development secret has been generated locally.
Generate a pepper with `openssl rand -hex 32`. Never commit the value.
Apply `migrations/001-user-password-storage.sql` once to the original array-based
`public."User"` schema. It refuses to discard multi-value arrays and runs atomically.
This migration also adds generated IDs and case-insensitive username uniqueness.

## API

- `POST /api/users`: `{ "firstName": "Sam", "lastName": "Example", "userName": "sam", "password": "a-long-password" }`
- `POST /api/users/login`: `{ "userName": "sam", "password": "a-long-password" }`

Signup returns 201 and login returns 200 with the public user profile plus
`token` and `expiresAt` (Unix seconds). Invalid credentials return 401. Hashes and salts are never
included in these responses. Password whitespace is preserved.

Login and signup issue HS256 JWTs valid for 30 minutes with a fixed issuer and audience.
`GET /api/users/verify` validates a Bearer token and returns its user's current public
profile and expiration without extending the token lifetime.

Colors, inconveniences, feedback, forms, and database diagnostics require
`Authorization: Bearer <token>`. Public signup and login remain accessible without
a token. User-profile reads are limited to the authenticated user. Form creation
must use that user's ID; status and answer writes check ownership. Authenticated
users can still browse the shared response lookup.

The Angular interceptor sends tokens only to the configured local API. The browser
stores `authToken` and `isLoggedIn` in sessionStorage. Storage values are strings;
the LoginService exposes a boolean `isLoggedIn()` signal. After a refresh the flag
stays false until backend verification succeeds. Protected routes use that verified
state. Expiration or a protected API's 401 clears the session and opens login.

`POST /api/users/logout` revokes the current Bearer token and returns 204.
Revocation stores a SHA-256 fingerprint, not the raw token, in `revoked_tokens`.
Authorization checks the database on every protected request, so a revoked token
returns 401 even after a backend restart. Each new token has a unique JWT ID.
Expired revocation entries are cleaned up during subsequent logout calls.
Apply `migrations/005-token-revocations.sql` before deploying this version; it has
already been applied to the development database.

The frontend waits for backend logout before clearing sessionStorage and redirecting
to login. If revocation is unavailable, it displays a retryable error. An already
expired or revoked token (401) is treated as logged out.
Use HTTPS when deploying the API. Changing JWT_SECRET invalidates existing tokens.
Legacy SHA-1 or scrypt password rows are not supported by this implementation.

## Checks

Run `npm run build` and `npm test`.

## Form answers

Apply migrations 002, 003, and 004 in order when provisioning the original schema.
The development database already has these schema changes.

`POST /api/forms` with `{ "userId": 1 }` creates or reopens that user's form.
Creation initializes all seven questions with SQL NULL answers in the same atomic
statement. Existing answers are preserved when reopening the form.

`GET /api/forms/:formId/answers` returns the question rows, including their stable
question keys and nullable answers. `PATCH /api/forms/:formId/answers` accepts
`{ "answers": [{ "questionKey": "color", "answer": null }, ...], "statusId": 2 }`.
Send exactly one entry for every key in `src/modules/form/q+a/questions.ts`.
Empty strings become NULL; numeric zero is stored as "0".

The Angular form saves after 400 ms without changes and serializes requests.
Submission sends the latest full answer snapshot with statusId 3; answers and
completion status are committed atomically. Completed forms reject answer edits.
Lookup links load the saved answers into the response table.

Run the database round-trip test with
`RUN_DB_TESTS=1 node --import tsx --test tests/form.database.test.ts`.
It rolls back its test rows. Middleware authenticates API requests; the isolated
database test exercises the DAO without HTTP middleware.
