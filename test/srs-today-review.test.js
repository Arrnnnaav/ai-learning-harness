require('./_env');
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

test('srs: again resets reps/interval, good grows interval', () => {
  const { newCard, gradeCard } = require(path.join(__dirname, '..', 'lib', 'srs.js'));
  const now = Date.now();
  let card = newCard(now);

  card = gradeCard(card, 'good', now);
  assert.strictEqual(card.reps, 1);
  assert.strictEqual(card.interval, 1);

  card = gradeCard(card, 'good', now);
  assert.strictEqual(card.reps, 2);
  assert.strictEqual(card.interval, 3);

  const beforeAgain = { ...card };
  card = gradeCard(card, 'again', now);
  assert.strictEqual(card.reps, 0);
  assert.strictEqual(card.interval, 1);
  assert.ok(card.ease < beforeAgain.ease, 'ease drops on Again');
});

test('today + reviews: prereq gating and review lifecycle', async () => {
  const app = require(path.join(__dirname, '..', 'server.js'));
  const server = app.listen(0);
  try {
    const base = `http://localhost:${server.address().port}`;

    const a = await fetch(`${base}/api/plan/topics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Prereq Topic __selfcheck' }),
    }).then((r) => r.json());
    const b = await fetch(`${base}/api/plan/topics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Gated Topic __selfcheck', prereqs: [a.id] }),
    }).then((r) => r.json());

    let today = await fetch(`${base}/api/today`).then((r) => r.json());
    assert.ok(today.nextTopics.some((t) => t.id === a.id), 'topic with no prereqs is ready');
    assert.ok(!today.nextTopics.some((t) => t.id === b.id), 'gated topic not ready yet');

    await fetch(`${base}/api/plan/topics/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    today = await fetch(`${base}/api/today`).then((r) => r.json());
    assert.ok(!today.nextTopics.some((t) => t.id === a.id), 'done topic drops out of next-up');
    assert.ok(today.nextTopics.some((t) => t.id === b.id), 'topic becomes ready once its prereq is done');

    const review = await fetch(`${base}/api/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: b.id, topicTitle: b.title, question: 'Q __selfcheck', answer: 'A __selfcheck' }),
    }).then((r) => r.json());
    assert.ok(review.id, 'review card created');

    const due = await fetch(`${base}/api/reviews?due=true`).then((r) => r.json());
    assert.ok(due.cards.some((c) => c.id === review.id), 'new card is immediately due');

    const graded = await fetch(`${base}/api/reviews/${review.id}/grade`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade: 'good' }),
    }).then((r) => r.json());
    assert.strictEqual(graded.reps, 1);
    assert.ok(graded.due > Date.now(), 'graded card pushed into the future');

    await fetch(`${base}/api/reviews/${review.id}`, { method: 'DELETE' });
  } finally {
    server.close();
  }
});

test('ask: 400s cleanly with no API key configured', async () => {
  const app = require(path.join(__dirname, '..', 'server.js'));
  const server = app.listen(0);
  try {
    const base = `http://localhost:${server.address().port}`;

    const topic = await fetch(`${base}/api/plan/topics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Ask Target __selfcheck' }),
    }).then((r) => r.json());

    const res = await fetch(`${base}/api/ask`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: topic.id, question: 'Why? __selfcheck' }),
    });
    assert.strictEqual(res.status, 400);
  } finally {
    server.close();
  }
});
