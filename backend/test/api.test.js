import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/errors.js';

async function withApi(options, run) {
  const server = createServer(createApp(options));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('health endpoint is public and does not access the database', async () => {
  await withApi({ db: {}, auth: (_req, _res, next) => next() }, async base => {
    const response = await fetch(`${base}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('protected API returns 401 when no token is supplied', async () => {
  await withApi({ db: {}, auth: (_req, _res, next) => next(new HttpError(401, 'Sign in required.')) }, async base => {
    const response = await fetch(`${base}/api/v1/applications`);
    assert.equal(response.status, 401);
    assert.match((await response.json()).message, /Sign in required/);
  });
});

test('role checks prevent business users from reviewing approvals', async () => {
  await withApi({ db: {}, auth: (req, _res, next) => { req.auth = { id: 'auth-user-1', role: 'BUSINESS' }; next(); } }, async base => {
    const response = await fetch(`${base}/api/v1/admin/verification-requests`);
    assert.equal(response.status, 403);
  });
});

test('application updates validate fields and scope writes to the authenticated owner', async () => {
  let whereSeen;
  const db = {
    application: {
      async updateMany({ where, data }) { whereSeen = where; assert.equal(data.status, 'SUBMITTED'); return { count: 1 }; },
      async findUnique({ where }) { return { id: where.id, status: 'SUBMITTED' }; },
    },
  };
  await withApi({ db, auth: (req, _res, next) => { req.auth = { id: 'auth-user-2', role: 'BUSINESS' }; next(); } }, async base => {
    const invalid = await fetch(`${base}/api/v1/applications/123`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'MAGIC' }) });
    assert.equal(invalid.status, 400);
    const id = 'd31e9d26-0e54-4f0c-9107-cc4fd5964858';
    const valid = await fetch(`${base}/api/v1/applications/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'SUBMITTED' }) });
    assert.equal(valid.status, 200);
    assert.equal(whereSeen.ownerAuthId, 'auth-user-2');
    assert.equal(whereSeen.id, id);
  });
});
