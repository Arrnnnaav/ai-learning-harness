const { callLLM } = require('./llm');
const { gatherSources, sourcesBlock, citedIds } = require('./search');

const SYSTEM_PROMPT = `You answer a student's question about a specific topic they're studying.
Be direct and concrete, with a code example if the question is technical. If the provided
study-doc context doesn't cover something, say so rather than guessing.`;

const RESEARCH_SYSTEM = `You answer a student's question about a specific topic, grounded in the
numbered web sources provided. At most four sentences, no preamble, no restating the question.
Put the source number like [1] right after each claim it supports. Only when no source supports
an answer, start with "Not settled by sources:" and give your best answer from the topic context;
otherwise never write that phrase. Never invent a citation.`;

async function askAboutTopic({ provider, apiKey, model, host, topicTitle, topicContext, docMarkdown, question, research, tavilyApiKey }) {
  const context = [
    `Topic: ${topicTitle}`,
    topicContext ? `Student's own context: ${topicContext}` : '',
    docMarkdown ? `Their study doc for this topic:\n"""\n${docMarkdown.slice(0, 6000)}\n"""` : '',
  ].filter(Boolean).join('\n\n');

  if (!research) {
    const answer = await callLLM({ provider, apiKey, model, host, system: SYSTEM_PROMPT, prompt: `${context}\n\nQuestion: ${question}` });
    return { answer, sources: [], cited: [] };
  }

  const sources = await gatherSources(question, topicTitle, { tavilyApiKey, maxSources: 4 });
  const prompt = sources.length
    ? `${context}\n\n${sourcesBlock(sources)}\n\nQuestion: ${question}`
    : `${context}\n\nQuestion: ${question}\n\n(No web sources found — answer from the topic context above.)`;

  const answer = await callLLM({ provider, apiKey, model, host, system: RESEARCH_SYSTEM, prompt });
  return { answer, sources, cited: citedIds(answer, sources) };
}

module.exports = { askAboutTopic };
