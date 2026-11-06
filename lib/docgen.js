const { callLLM } = require('./llm');

const SYSTEM_PROMPT = `You write deep, code-rich study documents for a student learning AI/ML topics on their own.
Never invent URLs. When pointing to videos, give a YouTube SEARCH QUERY in backticks instead of a fabricated link,
e.g. "Search YouTube: \`transformers from scratch pytorch\`". Teach, don't summarize.`;

function buildPrompt(topic, context) {
  return `Write a complete study document for the topic: "${topic}".
${context ? `Student context: ${context}\n` : ''}
Structure, in this exact order, as Markdown:

1. # ${topic}
2. ## Prereqs — what to know first (bullet list, or "None")
3. ## What is ${topic} — clear definition + mental model
4. ## Core Concepts — every important subtopic, explained in depth, with real code examples
5. ## Where to Watch — 3 tiers (Concepts from Scratch / Frameworks & Tools / Big Picture), each a bullet list of YouTube SEARCH QUERIES (never fabricated links)
6. ## Checklist — every concept to tick off, grouped by subcategory, using "- [ ] "
7. ## Project Ideas — exactly 3: Beginner, Intermediate, and a "Resume-Level Project" with tech stack, key features, and how to talk about it in an interview
8. ## Next Topic — what to learn after this`;
}

async function generateDoc({ provider, apiKey, model, host, topic, context }) {
  const markdown = await callLLM({
    provider,
    apiKey,
    model,
    host,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(topic, context),
  });
  return markdown;
}

module.exports = { generateDoc };
