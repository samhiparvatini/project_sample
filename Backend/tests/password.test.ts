import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/common/password.helper.js';
import { UserService } from '../src/modules/user/user.service.js';
import type { UserDao } from '../src/modules/user/user.dao.js';
import type { CreateUserRow, UserLoginRow } from '../src/modules/user/user.model.js';

process.env.ARGON2_PASSWORD_PEPPER = 'test-only-pepper-not-for-production';

test('password hashes use distinct salts, verify exact passwords, and reject invalid credentials', async () => {
    const password = '  correct horse battery staple 🔑  ';
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    assert.match(first.passwordHash, /^\$argon2id\$/);
    assert.notEqual(first.passwordHash, second.passwordHash);
    assert.notEqual(first.passwordSalt, second.passwordSalt);
    assert.equal(Buffer.from(first.passwordSalt, 'base64').length, 16);
    assert.equal(await verifyPassword(first.passwordHash, password), true);
    assert.equal(await verifyPassword(first.passwordHash, password.trim()), false);
    assert.equal(await verifyPassword(first.passwordHash, 'incorrect'), false);
    assert.equal(await verifyPassword('malformed', password), false);
    assert.equal(await verifyPassword('$argon2id$malformed', password), false);
    const previous = process.env.ARGON2_PASSWORD_PEPPER;
    process.env.ARGON2_PASSWORD_PEPPER = 'different-pepper';
    assert.equal(await verifyPassword(first.passwordHash, password), false);
    delete process.env.ARGON2_PASSWORD_PEPPER;
    await assert.rejects(hashPassword(password), /ARGON2_PASSWORD_PEPPER/);
    process.env.ARGON2_PASSWORD_PEPPER = previous!;
});

test('signup stores hashes and login returns only public user fields', async () => {
    let stored: UserLoginRow | null = null;
    const dao = {
        async createUser(input: CreateUserRow) {
            assert.notEqual(input.passwordHash, 'test-password');
            assert.ok(input.passwordSalt);
            stored = { user_id: 1, first_name: input.first_name, last_name: input.last_name,
                user_name: input.user_name, password_hash: input.passwordHash };
            return stored;
        },
        async findByUserName(name: string) { return name === 'sam' ? stored : null; }
    } as unknown as UserDao;
    const service = new UserService(dao);
    const expected = { userId: 1, firstName: 'Sam', lastName: 'Test', userName: 'sam' };
    assert.deepEqual(await service.createUser({ ...expected, password: 'test-password' }), expected);
    assert.deepEqual(await service.login('sam', 'test-password'), expected);
    assert.equal(await service.login('sam', 'wrong-password'), null);
    assert.equal(await service.login('missing', 'test-password'), null);
});
