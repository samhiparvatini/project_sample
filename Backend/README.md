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
The Angular signup/login pages are not connected to these endpoints yet.
Legacy SHA-1 or scrypt password rows are not supported by this implementation.

## Checks

Run `npm run build` and `npm test`.
