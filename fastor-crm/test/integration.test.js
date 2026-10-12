import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Employee, Enquiry } from '../src/models.js';

test('CRM acceptance: authentication, visibility, atomic claims and restart persistence', { timeout: 120000 }, async t => {
  const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const database = `fastor_test_${randomBytes(8).toString('hex')}`;
  const secret = randomBytes(48).toString('hex');
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  let child;
  let output = '';
  const base = `http://127.0.0.1:${port}`;
  async function start() {
    output = '';
    child = spawn(process.execPath, ['src/server.js'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, MONGODB_URI: testUri, JWT_SECRET: secret, PORT: String(port), NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    const deadline = Date.now() + 20000;
    while (!output.includes('Fastor CRM listening')) {
      if (child.exitCode !== null || Date.now() > deadline) throw new Error(`Server startup failed: ${output}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  async function stop() {
    if (child && child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
  }
  t.after(async () => {
    await stop();
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  // Force a generated database name, preserving URI credentials/options without logging them.
  const parsed = new URL(mongoUri);
  parsed.pathname = `/${database}`;
  const testUri = parsed.toString();
  await mongoose.connect(testUri, { serverSelectionTimeoutMS: 10000 });
  // The child must connect to exactly the disposable test database.
  await Promise.all([Employee.init(), Enquiry.init()]);
  async function api(method, path, body, token, expected = 200) {
    const response = await fetch(`${base}${path}`, {
      method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
    assert.equal(json.success, expected < 400);
    assert.ok(!JSON.stringify(json).includes('passwordHash'));
    assert.ok(!JSON.stringify(json).includes('stack'));
    return json.data ?? json.error;
  }
  await start();
  const valid = { name: 'Employee A', email: ' A@Example.com ', password: 'strong-password-123' };
  const a = (await api('POST', '/api/auth/register', valid, undefined, 201)).employee;
  const b = (await api('POST', '/api/auth/register', { ...valid, name: 'Employee B', email: 'b@example.com' }, undefined, 201)).employee;
  assert.equal(a.email, 'a@example.com');
  await api('POST', '/api/auth/register', { ...valid, email: 'a@example.com' }, undefined, 409);
  await api('POST', '/api/auth/register', { ...valid, email: 'invalid' }, undefined, 400);
  await api('POST', '/api/auth/register', { ...valid, password: 'short' }, undefined, 400);
  const registrations = await Promise.all([1, 2].map(() => fetch(`${base}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...valid, email: 'race@example.com' }),
  })));
  assert.deepEqual(registrations.map(r => r.status).sort(), [201, 409]);
  const tokenA = (await api('POST', '/api/auth/login', valid)).token;
  const tokenB = (await api('POST', '/api/auth/login', { ...valid, email: b.email })).token;
  assert.ok(jwt.decode(tokenA).exp > jwt.decode(tokenA).iat);
  const storedA = await Employee.findById(a.id).select('+passwordHash');
  assert.notEqual(storedA.passwordHash, valid.password);
  assert.ok(await bcrypt.compare(valid.password, storedA.passwordHash));
  await api('POST', '/api/auth/login', { ...valid, password: 'wrong-password' }, undefined, 401);
  await api('POST', '/api/auth/login', { ...valid, email: 'missing@example.com' }, undefined, 401);
  const lead = { name: 'Visitor', email: 'visitor@example.com', courseInterest: 'Node.js' };
  for (const body of [{}, { ...lead, email: 'bad' }, { ...lead, name: ' ' }, { ...lead, courseInterest: '' }, { ...lead, email: { $ne: null } }]) {
    await api('POST', '/api/enquiries', body, undefined, 400);
  }
  assert.deepEqual(await api('GET', '/api/enquiries/mine', undefined, tokenA), []);
  assert.deepEqual(await api('GET', '/api/enquiries/unclaimed', undefined, tokenA), []);
  const enquiry = (await api('POST', '/api/enquiries', { ...lead, claimedBy: b.id, employeeId: b.id, claimedAt: new Date().toISOString() }, undefined, 201)).enquiry;
  assert.equal(enquiry.claimedBy, null);
  assert.equal(enquiry.claimedAt, null);
  const protectedRoutes = [['GET', '/api/enquiries/unclaimed'], ['GET', '/api/enquiries/mine'], ['PATCH', `/api/enquiries/${enquiry.id}/claim`]];
  for (const [method, path] of protectedRoutes) await api(method, path, undefined, undefined, 401);
  const sign = (options, key = secret) => jwt.sign({}, key, { algorithm: 'HS256', subject: a.id, issuer: 'fastor-crm', audience: 'fastor-crm-employees', ...options });
  const badTokens = ['invalid', `${tokenA.slice(0, -4)}abcd`, sign({ expiresIn: -1 }), sign({ expiresIn: '1h' }, 'wrong-secret'), sign({ algorithm: 'HS384', expiresIn: '1h' }), sign({ subject: 'invalid', expiresIn: '1h' }), sign({ subject: new mongoose.Types.ObjectId().toString(), expiresIn: '1h' }), sign({})];
  for (const token of badTokens) await api('GET', '/api/enquiries/mine', undefined, token, 401);
  for (const token of [tokenA, tokenB]) assert.ok((await api('GET', '/api/enquiries/unclaimed', undefined, token)).some(e => e.id === enquiry.id));
  const claimed = (await api('PATCH', `/api/enquiries/${enquiry.id}/claim`, { claimedBy: b.id }, tokenA)).enquiry;
  assert.equal(claimed.claimedBy, a.id);
  assert.ok(claimed.claimedAt);
  for (const token of [tokenA, tokenB]) {
    assert.ok(!(await api('GET', '/api/enquiries/unclaimed', undefined, token)).some(e => e.id === enquiry.id));
    const error = await api('PATCH', `/api/enquiries/${enquiry.id}/claim`, undefined, token, 409);
    assert.ok(!JSON.stringify(error).includes(a.id));
  }
  assert.ok((await api('GET', '/api/enquiries/mine', undefined, tokenA)).some(e => e.id === enquiry.id));
  assert.deepEqual(await api('GET', '/api/enquiries/mine', undefined, tokenB), []);
  await api('GET', `/api/enquiries/${enquiry.id}`, undefined, tokenB, 404);
  await api('PATCH', '/api/enquiries/invalid/claim', undefined, tokenA, 400);
  await api('PATCH', `/api/enquiries/${new mongoose.Types.ObjectId()}/claim`, undefined, tokenA, 404);
  for (let attempt = 0; attempt < 5; attempt++) {
    const fresh = (await api('POST', '/api/enquiries', lead, undefined, 201)).enquiry;
    const responses = await Promise.all([tokenA, tokenB].map(token => fetch(`${base}/api/enquiries/${fresh.id}/claim`, { method: 'PATCH', headers: { authorization: `Bearer ${token}` } })));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    const winnerIndex = responses.findIndex(r => r.status === 200);
    const winner = [a, b][winnerIndex];
    const loserToken = [tokenA, tokenB][1 - winnerIndex];
    const stored = await Enquiry.findById(fresh.id);
    assert.equal(String(stored.claimedBy), winner.id);
    assert.ok(!(await api('GET', '/api/enquiries/mine', undefined, loserToken)).some(e => e.id === fresh.id));
  }
  const malformed = await fetch(`${base}/api/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.message, 'Malformed JSON body');
  const oversized = await fetch(`${base}/api/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(20000) }) });
  assert.equal(oversized.status, 413);
  const unclaimedBeforeRestart = (await api('POST', '/api/enquiries', lead, undefined, 201)).enquiry;
  await stop();
  await start();
  const persisted = (await api('GET', '/api/enquiries/mine', undefined, tokenA)).find(e => e.id === enquiry.id);
  assert.equal(persisted.claimedBy, a.id);
  assert.equal(persisted.claimedAt, claimed.claimedAt);
  assert.ok(!(await api('GET', '/api/enquiries/unclaimed', undefined, tokenB)).some(e => e.id === enquiry.id));
  assert.ok((await api('GET', '/api/enquiries/unclaimed', undefined, tokenB)).some(e => e.id === unclaimedBeforeRestart.id && e.claimedBy === null));
  console.log('PASS: all six APIs; validation/authentication; ownership; 5 concurrent races; server restart persistence');
});
