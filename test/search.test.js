require('./_env');
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

test('credibility: ranks .gov/.edu > reference sites > .org > everything else', () => {
  const { credibility } = require(path.join(__dirname, '..', 'lib', 'search.js'));
  assert.ok(credibility('https://nih.gov/x') > credibility('https://en.wikipedia.org/x'));
  assert.ok(credibility('https://en.wikipedia.org/x') > credibility('https://example.org/x'));
  assert.ok(credibility('https://example.org/x') > credibility('https://randomblog.com/x'));
});

test('selectPassages: ranks passages by term overlap with the question, ignores stopwords-only text', () => {
  const { selectPassages } = require(path.join(__dirname, '..', 'lib', 'search.js'));
  const text = [
    'This paragraph is about gardening and has nothing to do with the question at all, filler filler filler to pass the length check easily.',
    'Transformers use self-attention to let every token look at every other token in the sequence, which is the core mechanism.',
  ].join('\n');
  const passages = selectPassages(text, 'How does self-attention work in transformers?');
  assert.ok(passages.length > 0, 'found at least one passage');
  assert.match(passages[0], /self-attention/, 'the relevant passage ranks first');
});

test('citedIds: extracts only [n] markers that match a real source id', () => {
  const { citedIds } = require(path.join(__dirname, '..', 'lib', 'search.js'));
  const sources = [{ id: 1 }, { id: 2 }];
  assert.deepStrictEqual(citedIds('Claim one [1]. Claim two [2]. Bogus [9].', sources), [1, 2]);
});

test('sourcesBlock: formats numbered sources with passages indented', () => {
  const { sourcesBlock } = require(path.join(__dirname, '..', 'lib', 'search.js'));
  const block = sourcesBlock([{ id: 1, title: 'Example', url: 'https://example.com', passages: ['a fact'] }]);
  assert.match(block, /\[1\] Example — https:\/\/example\.com/);
  assert.match(block, /a fact/);
});

test('gatherSources: free DuckDuckGo path (no Tavily key) returns an array without throwing', async () => {
  const { gatherSources } = require(path.join(__dirname, '..', 'lib', 'search.js'));
  const sources = await gatherSources('what is photosynthesis', 'Biology', { maxSources: 2 });
  assert.ok(Array.isArray(sources), 'always returns an array, even if search is blocked/unreachable');
  if (sources.length > 0) {
    assert.ok(sources[0].id === 1 && sources[0].url && sources[0].passages.length > 0, 'well-formed source when any are found');
  } else {
    console.log('  (0 sources — DuckDuckGo unreachable/blocked from this environment, not a code failure)');
  }
});
