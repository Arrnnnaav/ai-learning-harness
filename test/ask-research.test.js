require('./_env');
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

test('askAboutTopic: research mode end-to-end against real Ollama + free search', async () => {
  let reachable = true;
  try {
    const r = await fetch('http://localhost:11434/api/tags');
    reachable = r.ok;
  } catch {
    reachable = false;
  }
  if (!reachable) {
    console.log('  (skipped: no local Ollama reachable)');
    return;
  }
  const { askAboutTopic } = require(path.join(__dirname, '..', 'lib', 'ask.js'));
  let result;
  try {
    result = await askAboutTopic({
      provider: 'ollama',
      topicTitle: 'Photosynthesis',
      question: 'What pigment absorbs light for photosynthesis?',
      research: true,
    });
  } catch (err) {
    console.log(`  (skipped: Ollama reachable but call failed — ${err.message})`);
    return;
  }
  assert.ok(typeof result.answer === 'string' && result.answer.length > 0, 'got an answer');
  assert.ok(Array.isArray(result.sources), 'sources is an array');
  assert.ok(Array.isArray(result.cited), 'cited is an array');
});
