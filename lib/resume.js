const { callLLM } = require('./llm');

const SYSTEM_PROMPT = `You tailor resumes. You only use achievements, skills, and experience the candidate
actually provided in their base resume — never invent employers, titles, metrics, or projects.
Rewrite and reorder existing bullets to match the job description; you may rephrase for clarity and
impact, but every claim must trace back to something in the base resume. Output clean Markdown.`;

function buildPrompt({ baseResume, jobDescription, company, title }) {
  return `Base resume:\n"""\n${baseResume}\n"""\n\nTarget role: ${title || 'the role below'}${company ? ` at ${company}` : ''}\n\nJob description:\n"""\n${jobDescription}\n"""\n\nProduce:\n1. # Tailored Résumé — the full résumé, reordered/rephrased to foreground what matches this job. Same sections as the base resume.\n2. ## Fit Notes — 3-5 bullets on why this candidate fits, grounded only in the base resume.\n3. ## Gaps — honest bullets on what the base resume does NOT cover that the job asks for. Do not paper over these.`;
}

async function tailorResume({ provider, apiKey, model, baseResume, jobDescription, company, title }) {
  if (!baseResume || !baseResume.trim()) throw new Error('Save a base résumé first.');
  if (!jobDescription || !jobDescription.trim()) throw new Error('Job needs a description to tailor against.');
  return callLLM({
    provider, apiKey, model,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt({ baseResume, jobDescription, company, title }),
  });
}

module.exports = { tailorResume };
