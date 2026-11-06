// Research-mode web search for Ask, ported from a local "Spatial" point-and-ask
// project's research.py: Tavily when a key is set, else a free DuckDuckGo HTML
// scrape + page fetch — so cited, source-grounded answers work with zero keys,
// matching this app's "install and it works for anyone" goal. Skipped from the
// original: mark/region anchors (no spatial marks here, just topic text), the
// compare-mode multi-query path, and semantic (Jev) re-ranking — term-overlap
// ranking below is the un-fancy equivalent.

const TAVILY_URL = 'https://api.tavily.com/search';
const UA = 'Mozilla/5.0 (compatible; AILearningHarness/1.0; +research mode)';
const BLOCKED_HOSTS = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'pinterest.', 'tiktok.com', 'youtube.com'];
const REFERENCE_HOSTS = ['wikipedia.org', 'britannica.com', 'reuters.com', 'bbc.com', 'nature.com', 'arxiv.org', 'nih.gov', 'who.int', 'docs.python.org', 'developer.mozilla.org', 'stackexchange.com', 'stackoverflow.com'];
const STOP = new Set('the a an of to in on for and or is are was were be this that it its as by with from at what why how does do which who when where into than then so if not can'.split(' '));

function terms(text) {
  return new Set((text.toLowerCase().match(/[a-z0-9][a-z0-9\-']{1,}/g) || []).filter((t) => !STOP.has(t)));
}

function isBlocked(url) {
  const host = new URL(url).hostname.toLowerCase();
  return BLOCKED_HOSTS.some((b) => host.includes(b));
}

function credibility(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host.endsWith('.gov') || host.includes('.gov.') || host.endsWith('.edu') || host.includes('.edu.')) return 0.95;
  if (REFERENCE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 0.85;
  if (host.endsWith('.org')) return 0.75;
  return 0.6;
}

function stripHtml(fragment) {
  let text = fragment.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ');
  text = text.replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h\d>|<\/tr>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  text = text.replace(/[ \t\r\f\v]+/g, ' ');
  return text.replace(/\n\s*\n+/g, '\n').trim();
}

function selectPassages(text, question, extra = '', n = 3, width = 420) {
  const want = new Set([...terms(question), ...terms(extra)]);
  if (want.size === 0 || !text) return [];
  const units = text.split(/\n+|(?<=[.!?])\s+(?=[A-Z(])/).map((u) => u.trim()).filter((u) => u.length > 40);
  const scored = [];
  units.forEach((unit, index) => {
    const have = terms(unit);
    const overlap = [...want].filter((w) => have.has(w)).length;
    if (overlap > 0) scored.push([overlap / (1 + unit.length / 600), index]);
  });
  scored.sort((a, b) => b[0] - a[0]);
  const passages = [];
  const used = new Set();
  for (const [, index] of scored) {
    if (used.has(index)) continue;
    passages.push([units[index], units[index + 1]].filter(Boolean).join(' ').slice(0, width));
    used.add(index); used.add(index + 1);
    if (passages.length >= n) break;
  }
  return passages;
}

async function tavilySearch(apiKey, query, k) {
  if (!apiKey) return [];
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.slice(0, 400), search_depth: 'basic', chunks_per_source: 3, max_results: k, include_answer: false }),
    });
    if (!res.ok) return [];
    const { results } = await res.json();
    return (results || [])
      .filter((r) => r.url && r.url.startsWith('http') && !isBlocked(r.url))
      .map((r) => ({
        url: r.url, title: (r.title || r.url).slice(0, 160),
        passages: String(r.content || '').split('[...]').map((c) => c.trim()).filter(Boolean).slice(0, 3).map((c) => c.slice(0, 600)),
        score: r.score || 0,
      }));
  } catch {
    return [];
  }
}

async function fetchPageText(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
    const ct = res.headers.get('content-type') || '';
    const body = await res.text();
    if (!ct.includes('html') && !body.trimStart().startsWith('<')) return '';
    return stripHtml(body.slice(0, 160000)).slice(0, 40000);
  } catch {
    return '';
  }
}

async function duckduckgoSearch(query, question, k) {
  let html;
  try {
    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ q: query, kl: 'us-en' }).toString(),
    });
    html = await res.text();
  } catch {
    return [];
  }
  const hits = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?=<a[^>]+class="result__a"|$)/g;
  let m;
  while ((m = re.exec(html)) && hits.length < k) {
    let [, href, titleHtml, rest] = m;
    let target = href;
    if (href.includes('duckduckgo.com/l/') || href.startsWith('/l/')) {
      try { target = decodeURIComponent(new URL(href, 'https://duckduckgo.com').searchParams.get('uddg') || ''); } catch { target = ''; }
    }
    if (!target.startsWith('http') || isBlocked(target)) continue;
    const snippetMatch = rest.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    hits.push({ url: target, title: stripHtml(titleHtml).slice(0, 160), snippet: snippetMatch ? stripHtml(snippetMatch[1]).slice(0, 300) : '' });
  }

  const out = [];
  await Promise.all(hits.map(async (hit) => {
    const text = await fetchPageText(hit.url);
    const passages = text ? selectPassages(text, question) : [];
    if (passages.length === 0 && hit.snippet) passages.push(hit.snippet);
    if (passages.length > 0) out.push({ url: hit.url, title: hit.title || hit.url, passages, score: 0 });
  }));
  return out;
}

function dedupeAndScore(hits) {
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    const u = new URL(hit.url);
    const key = u.hostname.toLowerCase() + u.pathname.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...hit, credibility: credibility(hit.url) });
  }
  return out;
}

// Tavily first (if a key is set), else free DuckDuckGo scrape + fetch + passage
// selection. Returns numbered sources ready to cite: [{id, url, title, passages, credibility}].
async function gatherSources(question, markedText, { tavilyApiKey, maxSources = 4 } = {}) {
  const query = `${question} ${markedText || ''}`.trim().slice(0, 200);
  let hits = await tavilySearch(tavilyApiKey, query, maxSources + 1);
  if (hits.length === 0) hits = await duckduckgoSearch(query, question, maxSources);
  const sources = dedupeAndScore(hits).slice(0, maxSources);
  return sources.map((s, i) => ({ id: i + 1, url: s.url, title: s.title, passages: s.passages, credibility: s.credibility }));
}

function sourcesBlock(sources) {
  const lines = ['Sources (cite by number):'];
  for (const s of sources) {
    lines.push(`[${s.id}] ${s.title} — ${s.url}`);
    for (const p of s.passages) lines.push(`    ${p}`);
  }
  return lines.join('\n');
}

function citedIds(answer, sources) {
  const valid = new Set(sources.map((s) => s.id));
  const ids = new Set([...answer.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1])).filter((n) => valid.has(n)));
  return [...ids].sort((a, b) => a - b);
}

module.exports = { gatherSources, sourcesBlock, citedIds, selectPassages, credibility };
