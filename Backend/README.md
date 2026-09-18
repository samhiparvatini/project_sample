# Backend user passwords

New users use Argon2id (64 MiB memory, 3 iterations, parallelism 1), a fresh
16-byte random salt, and the server's `ARGON2_PASSWORD_PEPPER` secret.
Store the pepper outside source control and retain it across restarts and deployments.
Losing or changing it prevents existing passwords from verifying.
The encoded hash includes the salt; `Password_Salt` also stores the base64 salt.

## Configuration

Set `DATABASE_URL` and `ARGON2_PASSWORD_PEPPER` in your local `.env`.
Generate a pepper with `openssl rand -hex 32`. Never commit the value.
Apply `migrations/001-user-password-storage.sql` once to the original array-based
`public."User"` schema. It refuses to discard multi-value arrays and runs atomically.
This migration also adds generated IDs and case-insensitive username uniqueness.

## API

- `POST /api/users`: `{ "firstName": "Sam", "lastName": "Example", "userName": "sam", "password": "a-long-password" }`
- `POST /api/users/login`: `{ "userName": "sam", "password": "a-long-password" }`

Signup returns 201 and the public user profile. Login returns 200 with the public
profile, or 401 for an incorrect username/password. Hashes and salts are never
included in these responses. Password whitespace is preserved.

Login currently verifies credentials only; it does not create a session or token.
The Angular signup/login pages call these endpoints.
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
It rolls back its test rows. These endpoints still require server-side session
authentication before being exposed as protected user data.
