# Contributing

Issues and PRs welcome.

## Setup

```bash
git clone https://github.com/Arrnnnaav/ai-learning-harness.git
cd ai-learning-harness
npm install
npm test
npm start
```

## Before opening a PR

- `npm test` passes (the two Ollama-dependent tests skip cleanly if you don't have
  Ollama running locally — that's fine, CI runs the same way).
- No fabricated URLs, résumé bullets, or citations — this project has a hard
  anti-hallucination rule: the model either finds a real source/video or says so.
- Keep it single-user/local — no accounts, no hosted backend, no telemetry.

## Good places to start

Look for issues labeled [`good first issue`](https://github.com/Arrnnnaav/ai-learning-harness/labels/good%20first%20issue).

## Ideas

More providers (Gemini, local llama.cpp), better research-mode source ranking,
shareable plan templates, i18n.
