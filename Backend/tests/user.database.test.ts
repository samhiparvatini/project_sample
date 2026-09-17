import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { UserDao } from '../src/modules/user/user.dao.js';
import { UserService } from '../src/modules/user/user.service.js';

test('user database signup/login round-trip (rolled back)', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
    const { sequelize } = await import('../src/db.js');
    const transaction = await sequelize.transaction();
    try {
        const database = new Proxy(sequelize, {
            get(target, key) {
                if (key === 'query') {
                    return (sql: string, options: object) => target.query(sql, { ...options, transaction });
                }
                return Reflect.get(target, key);
            }
        });
        const service = new UserService(new UserDao(database));
        const userName = `password-test-${randomUUID()}`;
        const input = { firstName: 'Integration', lastName: 'Test', userName, password: '  test-password-123  ' };
        const created = await service.createUser(input);
        assert.ok(created.userId > 0);
        assert.deepEqual(await service.login(userName.toUpperCase(), input.password), created);
        assert.equal(await service.login(userName, 'incorrect-password'), null);
        assert.equal(await service.login(userName, input.password.trim()), null);
        assert.equal(await service.login(`missing-${userName}`, input.password), null);
        assert.deepEqual(await service.getUserById(created.userId), created);
        assert.deepEqual(Object.keys(created).sort(), ['firstName', 'lastName', 'userId', 'userName']);
        await assert.rejects(service.createUser({ ...input, userName: userName.toUpperCase() }));
    } finally {
        await transaction.rollback();
        await sequelize.close();
    }
});
