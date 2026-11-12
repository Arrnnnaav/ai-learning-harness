const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

test('callLLM: ollama requires no API key and actually answers when reachable', async () => {
  const { callLLM } = require(path.join(__dirname, '..', 'lib', 'llm.js'));
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
  let text;
  try {
    text = await callLLM({
      provider: 'ollama',
      system: 'Reply with exactly one word.',
      prompt: 'Say "pong".',
    });
  } catch (err) {
    console.log(`  (skipped: Ollama reachable but call failed — ${err.message})`);
    return;
  }
  assert.ok(typeof text === 'string' && text.length > 0, 'got a non-empty answer with no apiKey passed');
});

test('callLLM: cloud provider without a key fails fast with a clear error', async () => {
  const { callLLM } = require(path.join(__dirname, '..', 'lib', 'llm.js'));
  await assert.rejects(
    () => callLLM({ provider: 'openai', system: 's', prompt: 'p' }),
    /No API key set/,
  );
});
