const { callLLM } = require('./llm');

const SYSTEM_PROMPT = `You answer a student's question about a specific topic they're studying.
Be direct and concrete, with a code example if the question is technical. If the provided
study-doc context doesn't cover something, say so rather than guessing.`;

async function askAboutTopic({ provider, apiKey, model, host, topicTitle, topicContext, docMarkdown, question }) {
  const context = [
    `Topic: ${topicTitle}`,
    topicContext ? `Student's own context: ${topicContext}` : '',
    docMarkdown ? `Their study doc for this topic:\n"""\n${docMarkdown.slice(0, 6000)}\n"""` : '',
  ].filter(Boolean).join('\n\n');

  return callLLM({
    provider, apiKey, model, host,
    system: SYSTEM_PROMPT,
    prompt: `${context}\n\nQuestion: ${question}`,
  });
}

module.exports = { askAboutTopic };
