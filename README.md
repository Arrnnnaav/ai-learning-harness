# AI Learning Harness

A free, open-source desktop app for self-taught students: track a learning path, and
generate deep study docs (prereqs, concepts with code, project ideas, checklists) on
demand — using **your own** OpenAI or Anthropic API key. No account, no server, no
tracking. Your plan, goals, and generated docs live only on your machine.

![status](https://img.shields.io/badge/status-early-orange) ![license](https://img.shields.io/badge/license-MIT-blue)

## Why

Most "learning tracker" tools are either a static template or lock AI features behind
their own paid backend. This is neither: it's a thin Electron app around a tiny local
server, and the AI calls go straight from your machine to the provider you choose, with
the key you provide.

## Features

- **Topics** — add any topic, generate a full study doc for it (concepts + code +
  project ideas + checklist), download as `.docx`.
- **Goals** — a flat checklist for longer-term goals.
- **Bring your own key** — OpenAI or Anthropic, stored locally only, never sent
  anywhere but that provider.
- Runs as a desktop app (Electron) or headless (`npm run server`) if you just want the
  API.

## Quick start

```bash
git clone https://github.com/Arrnnnaav/ai-learning-harness.git
cd ai-learning-harness
npm install
npm start          # desktop app
# or
npm run server      # just the server at http://localhost:4100
```

Open Settings in the app, pick a provider, paste your API key, save. Add a topic, hit
**Generate doc**.

## Auth

v1 ships with bring-your-own-API-key — it works today, no backend needed. A "Sign in
with OpenAI" OAuth flow is scaffolded in the Settings UI but disabled: OpenAI doesn't
offer a generic public OAuth login for third-party apps the way "Sign in with Google"
works. To enable it:

1. Register an OAuth application on OpenAI's developer platform.
2. Set `OPENAI_OAUTH_CLIENT_ID` / `OPENAI_OAUTH_CLIENT_SECRET` and a redirect handler
   in `server.js`.
3. Wire the button in `public/app.js` (`#oauth-btn`) to that flow.

PRs welcome once that's in place.

## Project layout

```
server.js        Express API + static file server
main.js           Electron entry point
lib/llm.js        OpenAI / Anthropic chat-completion client
lib/docgen.js      Study-doc prompt + generation
lib/mdToDocx.js    Markdown -> .docx (no Python/Pandoc dependency)
lib/store.js       Local JSON persistence (Electron userData or ~/.ai-learning-harness)
public/            Frontend (vanilla JS, no build step)
test/              Self-check tests (`npm test`)
```

## Contributing

Issues and PRs welcome — this is meant to grow into something the self-taught-AI-student
community actually uses. Ideas: real web search for video links, spaced-repetition
review, shareable plan templates, more providers (local Ollama, Gemini).

## License

MIT — see [LICENSE](LICENSE).
