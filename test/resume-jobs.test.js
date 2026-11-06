require('./_env');
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

test('resume base + jobs CRUD + youtube fallback round-trip', async () => {
  const app = require(path.join(__dirname, '..', 'server.js'));
  const server = app.listen(0);
  try {
    const base = `http://localhost:${server.address().port}`;

    await fetch(`${base}/api/resume/base`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Jane Doe — Software Engineer __selfcheck' }),
    });
    const saved = await fetch(`${base}/api/resume/base`).then((r) => r.json());
    assert.match(saved.text, /__selfcheck/, 'base resume persisted');

    const job = await fetch(`${base}/api/jobs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: 'Acme', title: 'ML Intern __selfcheck', description: 'Build ML things.' }),
    }).then((r) => r.json());
    assert.ok(job.id, 'job created');

    const jobs = await fetch(`${base}/api/jobs`).then((r) => r.json());
    assert.ok(jobs.jobs.some((j) => j.id === job.id), 'job listed');

    await fetch(`${base}/api/jobs/${job.id}`, { method: 'DELETE' });
    const jobsAfter = await fetch(`${base}/api/jobs`).then((r) => r.json());
    assert.ok(!jobsAfter.jobs.some((j) => j.id === job.id), 'job removed');
  } finally {
    server.close();
  }
});

test('resolveVideoLinks leaves search-query lines untouched with no API key', async () => {
  const { resolveVideoLinks } = require(path.join(__dirname, '..', 'lib', 'youtube.js'));
  const md = '## Where to Watch\n- Search YouTube: `transformers from scratch`\n- not a video line';
  const out = await resolveVideoLinks(md, undefined);
  assert.strictEqual(out, md, 'unchanged when no youtube key configured');
});
