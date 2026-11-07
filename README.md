# AI Learning Harness

**Track your AI/ML learning plan and generate deep study docs, cited Q&A, and
spaced-repetition review — free and fully local, no account, no cloud backend.**

<!-- TODO: demo.gif — record a 15-20s screen capture (add topic → generate doc →
     Ask with Research mode → Review) and drop it here as `docs/demo.gif` -->
<!-- ![demo](docs/demo.gif) -->

![status](https://img.shields.io/badge/status-early-orange) ![license](https://img.shields.io/badge/license-MIT-blue) ![CI](https://github.com/Arrnnnaav/ai-learning-harness/actions/workflows/ci.yml/badge.svg)

A free, open-source desktop app for self-taught students: track a learning path, and
generate deep study docs (prereqs, concepts with code, project ideas, checklists) on
demand — **free and fully local with [Ollama](https://ollama.com)**, or with your own
OpenAI/Anthropic API key if you'd rather use a cloud model. No account, no cloud
backend, no tracking. Your plan, goals, and generated docs live only on your machine.

## Why

Most "learning tracker" tools are either a static template or lock AI features behind
their own paid backend. This is neither: it's a thin Electron app around a tiny local
server, and the AI calls go straight from your machine to the provider you choose, with
the key you provide.

## Features

- **Topics** — add any topic, generate a full study doc for it (concepts + code +
  project ideas + checklist), download as `.docx`. With a YouTube API key set, the
  "Where to Watch" section links real, verified videos instead of search queries.
- **Today** — a prereq-aware view: mark a topic's prereqs when you add it, and Today
  surfaces only topics that are actually unblocked, instead of one flat list.
- **Ask + Review** — ask a question about any topic (grounded in that topic's own
  generated doc, if it has one), and save a good answer into a spaced-repetition review
  queue (SM-2-lite: Again / Good). Ported from StudyOS's "Point & Ask → Save to Review"
  idea, minus its browser extension and curriculum backend — here it's just you, your
  topics, and your own key.
- **Research mode** (on by default in Ask) — grounds the answer in a few live web
  sources with numbered `[1]` citations, instead of the model answering from memory
  alone. Uses Tavily if you add a key, otherwise falls back to a free DuckDuckGo search
  — zero keys required to get cited answers on a typical home connection. DuckDuckGo
  CAPTCHA-walls datacenter IPs (cloud VPS, CI), so on a server deploy (see below) add a
  [Tavily](https://tavily.com) key for reliable results — without one, Research mode
  there just degrades to "no sources found, answered from topic context" instead of
  throwing. Ported from a local "Spatial" point-and-ask project's research pipeline.
- **Résumé tailoring** — paste your real résumé once, paste a job description, get a
  tailored résumé + honest fit/gap notes, as `.docx`. The model only reorders/rephrases
  what's in your base résumé — it's instructed never to invent employers, titles, or
  metrics.
- **Jobs / Internships** — a manual paste-in tracker for postings you're applying to.
  Deliberately **not** a scraper: hitting LinkedIn/Indeed/etc. without an API violates
  their ToS and breaks constantly. Paste the posting, tailor against it.
- **Goals** — a flat checklist for longer-term goals.
- **Free, local, no account** — pick Ollama in Settings and it's zero cost, nothing
  leaves your machine. Or bring your own OpenAI/Anthropic key for a cloud model.
  Optional YouTube Data API key for real video links. All stored locally only, never
  sent anywhere but the provider you chose.
- Runs as a desktop app (Electron) or headless (`npm run server`) if you just want the
  API.

## Download (no coding required)

Grab an installer from [the latest release](https://github.com/Arrnnnaav/ai-learning-harness/releases/latest):
Windows `.exe`, macOS `.dmg`, or Linux `.AppImage`. Install it, open it.

**Fastest free path:** install [Ollama](https://ollama.com), run `ollama pull
qwen3:4b-instruct`, pick Ollama as the provider in Settings (it's the default). No
account, no card, nothing leaves your machine.

**Or use a cloud model:** pick OpenAI or Anthropic in Settings and paste an API key —
free to create at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
or [console.anthropic.com](https://console.anthropic.com/settings/keys) (both require a
small amount of billing credit to actually make calls — a few cents covers a lot of
study docs).

## Run from source

One command (Node 18+):

```bash
git clone https://github.com/Arrnnnaav/ai-learning-harness.git && cd ai-learning-harness && npm install && npm start
```

Or step by step:

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
lib/ask.js         Grounded Q&A about a topic, plain or cited Research mode
lib/search.js      Research-mode web search: Tavily, else free DuckDuckGo scrape
lib/srs.js         Minimal SM-2-style spaced-repetition scheduler (used by Review)
lib/mdToDocx.js    Markdown -> .docx (no Python/Pandoc dependency)
lib/store.js       Local JSON persistence (Electron userData, ~/.ai-learning-harness,
                     or AI_LEARNING_HARNESS_DATA_DIR override — tests use this to avoid
                     touching your real data)
public/            Frontend (vanilla JS, no build step)
test/              Self-check tests (`npm test`)
```

## Related work

This project deliberately stays single-user and local: no accounts, no org/role system,
no cloud backend to run or pay for — install it and it works, offline if you're on
Ollama. Today + Ask + Review (and the local-model-first provider setup) take cues from
two other local projects, scaled down to fit that constraint:

- A fuller "Point & Ask" idea — circle a region of a page/PDF/app and ask about exactly
  that, not the whole page — exists as its own standalone project with a browser
  extension and a DOM/crop resolver. That's real scope on its own (anchor resolution,
  screen capture, extension packaging) and isn't ported here; this app's Ask is
  text-based and scoped to one topic's own doc, which covers the common case without the
  extension. Its cited-search Research mode *is* ported (see above) — that part travels
  fine without the spatial/extension half.
- A fuller curriculum/review product explores prerequisite tracking and spaced review
  with a hosted multi-tenant backend and org/cohort admin. Not a fit for a single-student
  BYO-key tool — Today/Review here are the same core loop (what's next, what's due)
  without any of that infrastructure.

## Contributing

Issues and PRs welcome — this is meant to grow into something the self-taught-AI-student
community actually uses. Ideas: real web search for video links, spaced-repetition
review, shareable plan templates, more providers (local Ollama, Gemini).

## License

MIT — see [LICENSE](LICENSE).
