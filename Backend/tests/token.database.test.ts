import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenService } from '../src/services/token.service.js';
import { TokenRevocationService } from '../src/services/token-revocation.service.js';

test('token revocations persist across service instances', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const { sequelize } = await import('../src/db.js');
  const transaction = await sequelize.transaction();
  try {
    const database = new Proxy(sequelize, {
      get(target, key) {
        if (key === 'query') return (sql: string, options: object) => target.query(sql, { ...options, transaction });
        return Reflect.get(target, key);
      }
    });
    const tokens = new TokenService(() => 'test-secret-with-more-than-32-bytes');
    const session = tokens.issue({ userId: 7, userName: 'sam', firstName: 'Sam', lastName: 'Test' });
    const store = new TokenRevocationService(database);
    assert.equal(await store.isRevoked(session.token), false);
    await store.revoke(session.token, session.expiresAt);
    await store.revoke(session.token, session.expiresAt);
    assert.equal(await new TokenRevocationService(database).isRevoked(session.token), true);
  } finally {
    await transaction.rollback();
    await sequelize.close();
  }
});
