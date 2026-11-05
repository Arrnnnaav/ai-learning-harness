const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: (model, system, prompt) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
    extract: (json) => json.choices?.[0]?.message?.content,
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-5-5',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }),
    body: (model, system, prompt) => JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
    extract: (json) => json.content?.[0]?.text,
  },
};

async function callLLM({ provider, apiKey, model, system, prompt }) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);
  if (!apiKey) throw new Error('No API key set. Add one in Settings.');

  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: cfg.headers(apiKey),
    body: cfg.body(model || cfg.defaultModel, system, prompt),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${provider} API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = cfg.extract(json);
  if (!text) throw new Error(`${provider} API returned no content.`);
  return text;
}

module.exports = { callLLM, PROVIDERS };
