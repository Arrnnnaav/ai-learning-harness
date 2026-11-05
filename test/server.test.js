const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

process.env.HOME = process.env.HOME || require('os').homedir();

test('plan + goals CRUD round-trip', async () => {
  const app = require(path.join(__dirname, '..', 'server.js'));
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;

  const topic = await fetch(`${base}/api/plan/topics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Topic __selfcheck' }),
  }).then((r) => r.json());
  assert.ok(topic.id, 'topic created with id');

  const plan = await fetch(`${base}/api/plan`).then((r) => r.json());
  assert.ok(plan.topics.some((t) => t.id === topic.id), 'topic present in plan');

  await fetch(`${base}/api/plan/topics/${topic.id}`, { method: 'DELETE' });
  const planAfter = await fetch(`${base}/api/plan`).then((r) => r.json());
  assert.ok(!planAfter.topics.some((t) => t.id === topic.id), 'topic removed');

  const goal = await fetch(`${base}/api/goals`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'Test Goal __selfcheck' }),
  }).then((r) => r.json());
  assert.ok(goal.id, 'goal created with id');

  server.close();
});

test('markdownToDocxBuffer produces a non-empty docx', async () => {
  const { markdownToDocxBuffer } = require(path.join(__dirname, '..', 'lib', 'mdToDocx.js'));
  const buf = await markdownToDocxBuffer('# Title\n\n## Section\nSome text.\n- [ ] item\n- bullet');
  assert.ok(Buffer.isBuffer(buf) && buf.length > 0, 'docx buffer generated');
});
