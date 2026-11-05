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
  project ideas + checklist), download as `.docx`. With a YouTube API key set, the
  "Where to Watch" section links real, verified videos instead of search queries.
- **Résumé tailoring** — paste your real résumé once, paste a job description, get a
  tailored résumé + honest fit/gap notes, as `.docx`. The model only reorders/rephrases
  what's in your base résumé — it's instructed never to invent employers, titles, or
  metrics.
- **Jobs / Internships** — a manual paste-in tracker for postings you're applying to.
  Deliberately **not** a scraper: hitting LinkedIn/Indeed/etc. without an API violates
  their ToS and breaks constantly. Paste the posting, tailor against it.
- **Goals** — a flat checklist for longer-term goals.
- **Bring your own key** — OpenAI/Anthropic for generation, optional YouTube Data API
  key for real video links. All stored locally only, never sent anywhere but that
  provider.
- Runs as a desktop app (Electron) or headless (`npm run server`) if you just want the
  API.

## Download (no coding required)

Grab an installer from [the latest release](https://github.com/Arrnnnaav/ai-learning-harness/releases/latest):
Windows `.exe`, macOS `.dmg`, or Linux `.AppImage`. Install it, open it, paste an API
key in Settings when prompted, add a topic.

You need your own key: free to create at
[platform.openai.com/api-keys](https://platform.openai.com/api-keys) or
[console.anthropic.com](https://console.anthropic.com/settings/keys) (both require
adding a small amount of billing credit to actually make calls — a few cents covers a
lot of study docs).

## Run from source

```bash
git clone https://github.com/Arrnnnaav/ai-learning-harness.git
cd ai-learning-harness
npm install
npm start          # desktop app
# or
npm run server      # just the server at http://localhost:4100
# or
npm run dist        # build an installer for your own OS into release/
```

Open Settings in the app, pick a provider, paste your API key, save. Add a topic, hit
**Generate doc**.

## Deploy as a server

For a shared school computer, Chromebook, or your own VPS — run it headless instead of
as a desktop app. It's a single-user instance (one plan, one résumé, one settings file)
meant for one student per deployment, not a multi-tenant service.

**Docker:**

```bash
docker build -t ai-learning-harness .
docker run -p 4100:4100 -v ai-learning-harness-data:/root/.ai-learning-harness ai-learning-harness
```

The volume keeps your plan/résumé/settings across container restarts. Health check at
`/api/health`.

**One-click Render deploy:** push a fork, connect it at
[render.com/deploy](https://render.com/deploy) — `render.yaml` in this repo configures
it (Docker runtime, free plan, health check wired up).

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
lib/llm.js         OpenAI / Anthropic chat-completion client
lib/docgen.js      Study-doc prompt + generation
lib/youtube.js     YouTube Data API search, resolves video-search-query lines to real links
lib/resume.js      Résumé tailoring prompt (grounded in the user's own base résumé)
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
