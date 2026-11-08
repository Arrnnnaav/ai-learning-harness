# Security

This app runs entirely on your own machine. API keys you enter (OpenAI, Anthropic,
YouTube, Tavily) are stored locally only (`~/.ai-learning-harness/` or Electron's
userData dir) and sent only to the provider they belong to — never to any server
run by this project, because there isn't one.

## Reporting a vulnerability

Open a [GitHub issue](https://github.com/Arrnnnaav/ai-learning-harness/issues) or,
for anything sensitive (e.g. a way to exfiltrate a stored key), use GitHub's
[private vulnerability reporting](https://github.com/Arrnnnaav/ai-learning-harness/security/advisories/new)
instead of a public issue.
