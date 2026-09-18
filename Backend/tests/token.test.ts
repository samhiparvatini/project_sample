import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { TokenService, TOKEN_ISSUER, TOKEN_AUDIENCE } from '../src/services/token.service.js';
import { createAuthorizeMiddleware } from '../src/middleware/authorize.middleware.js';
import { FormHandler } from '../src/modules/form/form.handler.js';
import type { FormService } from '../src/modules/form/form.service.js';

const secret = 'test-signing-secret-with-at-least-32-bytes';
const tokens = new TokenService(() => secret);
const user = { userId: 7, firstName: 'Sam', lastName: 'Test', userName: 'sam' };
function response() {
  const result = { status: 200, body: undefined as unknown };
  const res = { status(code: number) { result.status = code; return this; }, json(body: unknown) { result.body = body; return this; } } as Response;
  return { res, result };
}

test('JWTs expire after 30 minutes and verify issuer, audience, algorithm and signature', () => {
  const session = tokens.issue(user);
  assert.equal(session.userId, user.userId);
  const claims = tokens.verify(session.token);
  assert.equal(claims.userId, 7);
  assert.ok(Math.abs(claims.expiresAt - Math.floor(Date.now() / 1000) - 1800) <= 1);
  assert.throws(() => new TokenService(() => 'different-secret').verify(session.token));
  const base = { sub: '7', issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE };
  for (const options of [
    { ...base, expiresIn: -1 },
    { ...base, expiresIn: 60, issuer: 'wrong-issuer' },
    { ...base, expiresIn: 60, audience: 'wrong-audience' },
    { ...base, expiresIn: 60, algorithm: 'HS384' as const },
  ]) {
    const { sub, ...settings } = options;
    assert.throws(() => tokens.verify(jwt.sign({ sub }, secret, settings)));
  }
  assert.throws(() => tokens.verify('malformed'));
});

test('middleware rejects absent/invalid tokens and attaches identity for verified tokens', async () => {
  const authorize = createAuthorizeMiddleware(tokens, { async isRevoked() { return false; }, async revoke() {} });
  for (const authorization of [undefined, 'Basic something', 'Bearer invalid']) {
    const { res, result } = response();
    let next = false;
    await authorize({ headers: { authorization } } as Request, res, () => { next = true; });
    assert.equal(result.status, 401);
    assert.equal(next, false);
  }
  const req = { headers: { authorization: `Bearer ${tokens.issue(user).token}` } } as Request;
  let next = false;
  await authorize(req, response().res, () => { next = true; });
  assert.equal(req.auth?.userId, 7);
  assert.equal(next, true);
});

test('form mutations cannot use another user identity or another user form', async () => {
  const handler = new FormHandler({ async isOwner() { return false; } } as unknown as FormService);
  const create = response();
  await handler.createForm({ body: { userId: 8 }, auth: { userId: 7, expiresAt: 9999999999 } } as Request, create.res);
  assert.equal(create.result.status, 403);
  const edit = response();
  let next = false;
  await handler.requireOwner({ params: { formId: '9' }, auth: { userId: 7, expiresAt: 9999999999 } } as unknown as Request, edit.res, () => { next = true; });
  assert.equal(edit.result.status, 403);
  assert.equal(next, false);
});

test('successful login/signup issue tokens and verification returns a public profile', async () => {
  process.env.JWT_SECRET = secret;
  const { UserHandler } = await import('../src/modules/user/user.handler.js');
  const { tokenService } = await import('../src/services/token.service.js');
  const handler = new UserHandler({
    async createUser() { return user; },
    async login() { return user; },
    async getUserById() { return user; }
  } as unknown as import('../src/modules/user/user.service.js').UserService);
  const login = response();
  await handler.login({ body: { userName: 'sam', password: 'test-password' } } as Request, login.res);
  const session = login.result.body as { token: string; expiresAt: number };
  assert.equal(tokenService.verify(session.token).userId, 7);
  const signup = response();
  await handler.createUser({ body: { firstName: 'Sam', lastName: 'Test', userName: 'sam', password: 'test-password' } } as Request, signup.res);
  assert.equal(signup.result.status, 201);
  assert.equal(tokenService.verify((signup.result.body as { token: string }).token).userId, 7);
  const verified = response();
  await handler.verifyToken({ auth: { userId: 7, expiresAt: session.expiresAt } } as Request, verified.res);
  assert.deepEqual(verified.result.body, { ...user, expiresAt: session.expiresAt });
});

test('logout revokes only the current token and middleware refuses its reuse', async () => {
  const { UserHandler } = await import('../src/modules/user/user.handler.js');
  const revoked = new Set<string>();
  const store = {
    async isRevoked(token: string) { return revoked.has(token); },
    async revoke(token: string) { revoked.add(token); },
  };
  const first = tokens.issue(user);
  const second = tokens.issue(user);
  assert.notEqual(first.token, second.token);
  const handler = new UserHandler({} as import('../src/modules/user/user.service.js').UserService, store);
  const req = { headers: { authorization: `Bearer ${first.token}` }, auth: tokens.verify(first.token) } as Request;
  let logoutStatus = 0;
  await handler.logout(req, { status(code: number) { logoutStatus = code; return this; }, send() {} } as unknown as Response);
  assert.equal(logoutStatus, 204);
  const authorize = createAuthorizeMiddleware(tokens, store);
  const rejected = response();
  let passed = false;
  await authorize(req, rejected.res, () => { passed = true; });
  assert.equal(rejected.result.status, 401);
  assert.equal(passed, false);
  await authorize({ headers: { authorization: `Bearer ${second.token}` } } as Request, response().res, () => { passed = true; });
  assert.equal(passed, true);
});

test('revocation storage failure blocks authorization and makes logout retryable', async () => {
  const { UserHandler } = await import('../src/modules/user/user.handler.js');
  const store = {
    async isRevoked(): Promise<boolean> { throw new Error('database unavailable'); },
    async revoke(): Promise<void> { throw new Error('database unavailable'); },
  };
  const session = tokens.issue(user);
  const req = { headers: { authorization: `Bearer ${session.token}` }, auth: tokens.verify(session.token) } as Request;
  const check = response();
  await createAuthorizeMiddleware(tokens, store)(req, check.res, () => assert.fail('must not authorize'));
  assert.equal(check.result.status, 503);
  const logout = response();
  await new UserHandler({} as import('../src/modules/user/user.service.js').UserService, store).logout(req, logout.res);
  assert.equal(logout.result.status, 503);
});
