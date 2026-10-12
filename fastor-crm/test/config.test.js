import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';

test('configuration fails early for missing or invalid required values', () => {
  const valid = { MONGODB_URI: 'mongodb://127.0.0.1:27017/fastor_crm', JWT_SECRET: 'a'.repeat(48) };
  assert.throws(() => readConfig({}), /MONGODB_URI/);
  assert.throws(() => readConfig({ ...valid, MONGODB_URI: 'http://localhost' }), /MONGODB_URI/);
  assert.throws(() => readConfig({ ...valid, JWT_SECRET: '' }), /JWT_SECRET/);
  assert.throws(() => readConfig({ ...valid, JWT_SECRET: 'short' }), /JWT_SECRET/);
  assert.throws(() => readConfig({ ...valid, JWT_SECRET: 'replace-with-a-random-secret-of-at-least-32-characters' }), /JWT_SECRET/);
  for (const port of ['0', '-1', '3000.5', '65536', 'NaN']) assert.throws(() => readConfig({ ...valid, PORT: port }), /PORT/);
  for (const duration of ['0h', '-1h', 'forever', '100']) assert.throws(() => readConfig({ ...valid, JWT_EXPIRES_IN: duration }), /JWT_EXPIRES_IN/);
  assert.equal(readConfig(valid).jwtExpiresIn, '1h');
});
