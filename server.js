const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { readJSON, writeJSON, filePath } = require('./lib/store');
const { generateDoc } = require('./lib/docgen');
const { markdownToDocxBuffer } = require('./lib/mdToDocx');
const { resolveVideoLinks } = require('./lib/youtube');
const { tailorResume } = require('./lib/resume');
const { askAboutTopic } = require('./lib/ask');
const { newCard, gradeCard } = require('./lib/srs');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- settings (API key never echoed back) ---
app.get('/api/settings', (req, res) => {
  const s = readJSON('settings.json', { provider: 'openai', model: '' });
  res.json({
    provider: s.provider,
    model: s.model,
    hasKey: Boolean(s.apiKey),
    hasYoutubeKey: Boolean(s.youtubeApiKey),
  });
});

app.post('/api/settings', (req, res) => {
  const { provider, apiKey, model, youtubeApiKey } = req.body || {};
  const current = readJSON('settings.json', {});
  writeJSON('settings.json', {
    provider: provider || current.provider || 'openai',
    apiKey: apiKey === undefined ? current.apiKey : apiKey,
    model: model === undefined ? current.model : model,
    youtubeApiKey: youtubeApiKey === undefined ? current.youtubeApiKey : youtubeApiKey,
  });
  res.json({ ok: true });
});

// --- learning plan (topics) ---
app.get('/api/plan', (req, res) => {
  res.json(readJSON('plan.json', { topics: [] }));
});

app.post('/api/plan/topics', (req, res) => {
  const { title, context, prereqs } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });
  const plan = readJSON('plan.json', { topics: [] });
  const topic = {
    id: crypto.randomUUID(), title, context: context || '', status: 'not_started', docSlug: null,
    prereqs: Array.isArray(prereqs) ? prereqs : [], done: false,
  };
  plan.topics.push(topic);
  writeJSON('plan.json', plan);
  res.json(topic);
});

// Prereq-aware "what to study today": topics not yet done, whose prereqs are
// all done, ranked with fewer/already-satisfied prereqs first — plus any
// review cards due now. Mirrors StudyOS's "Today" view, without its
// curriculum/org machinery: prereqs here are just other topics you added.
app.get('/api/today', (req, res) => {
  const plan = readJSON('plan.json', { topics: [] });
  const doneIds = new Set(plan.topics.filter((t) => t.done).map((t) => t.id));
  const ready = plan.topics
    .filter((t) => !t.done && (t.prereqs || []).every((p) => doneIds.has(p)))
    .sort((a, b) => (a.prereqs || []).length - (b.prereqs || []).length);

  const reviews = readJSON('reviews.json', { cards: [] });
  const now = Date.now();
  const dueReviews = reviews.cards.filter((c) => c.due <= now);

  res.json({ nextTopics: ready.slice(0, 3), dueReviewCount: dueReviews.length });
});

app.patch('/api/plan/topics/:id', (req, res) => {
  const plan = readJSON('plan.json', { topics: [] });
  const topic = plan.topics.find((t) => t.id === req.params.id);
  if (!topic) return res.status(404).json({ error: 'not found' });
  Object.assign(topic, req.body || {});
  writeJSON('plan.json', plan);
  res.json(topic);
});

app.delete('/api/plan/topics/:id', (req, res) => {
  const plan = readJSON('plan.json', { topics: [] });
  plan.topics = plan.topics.filter((t) => t.id !== req.params.id);
  writeJSON('plan.json', plan);
  res.json({ ok: true });
});

// --- doc generation ---
app.post('/api/generate', async (req, res) => {
  const { topicId } = req.body || {};
  const plan = readJSON('plan.json', { topics: [] });
  const topic = plan.topics.find((t) => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'topic not found' });

  const settings = readJSON('settings.json', {});
  if (!settings.apiKey) return res.status(400).json({ error: 'Add an API key in Settings first.' });

  try {
    let markdown = await generateDoc({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      topic: topic.title,
      context: topic.context,
    });
    markdown = await resolveVideoLinks(markdown, settings.youtubeApiKey);
    const slug = slugify(topic.title);
    const docsDir = filePath('docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, `${slug}.md`), markdown);
    const buffer = await markdownToDocxBuffer(markdown);
    fs.writeFileSync(path.join(docsDir, `${slug}.docx`), buffer);

    topic.status = 'generated';
    topic.docSlug = slug;
    writeJSON('plan.json', plan);
    res.json({ ok: true, slug, markdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/docs/:slug.docx', (req, res) => {
  const f = path.join(filePath('docs'), `${req.params.slug}.docx`);
  if (!fs.existsSync(f)) return res.status(404).end();
  res.download(f);
});

// --- base résumé ---
app.get('/api/resume/base', (req, res) => {
  res.json(readJSON('resume-base.json', { text: '' }));
});

app.post('/api/resume/base', (req, res) => {
  const { text } = req.body || {};
  writeJSON('resume-base.json', { text: text || '' });
  res.json({ ok: true });
});

// --- jobs (manually pasted, not scraped — see README) ---
app.get('/api/jobs', (req, res) => {
  res.json(readJSON('jobs.json', { jobs: [] }));
});

app.post('/api/jobs', (req, res) => {
  const { company, title, description, url } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'title and description required' });
  const data = readJSON('jobs.json', { jobs: [] });
  const job = {
    id: crypto.randomUUID(), company: company || '', title, description, url: url || '',
    tailoredSlug: null,
  };
  data.jobs.push(job);
  writeJSON('jobs.json', data);
  res.json(job);
});

app.delete('/api/jobs/:id', (req, res) => {
  const data = readJSON('jobs.json', { jobs: [] });
  data.jobs = data.jobs.filter((j) => j.id !== req.params.id);
  writeJSON('jobs.json', data);
  res.json({ ok: true });
});

app.post('/api/jobs/:id/tailor', async (req, res) => {
  const data = readJSON('jobs.json', { jobs: [] });
  const job = data.jobs.find((j) => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'job not found' });

  const settings = readJSON('settings.json', {});
  if (!settings.apiKey) return res.status(400).json({ error: 'Add an API key in Settings first.' });
  const base = readJSON('resume-base.json', { text: '' });
  if (!base.text.trim()) return res.status(400).json({ error: 'Save a base résumé first.' });

  try {
    const markdown = await tailorResume({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseResume: base.text,
      jobDescription: job.description,
      company: job.company,
      title: job.title,
    });
    const slug = `${slugify(job.company || 'resume')}-${slugify(job.title)}-${job.id.slice(0, 8)}`;
    const docsDir = filePath('resumes');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, `${slug}.md`), markdown);
    const buffer = await markdownToDocxBuffer(markdown);
    fs.writeFileSync(path.join(docsDir, `${slug}.docx`), buffer);

    job.tailoredSlug = slug;
    writeJSON('jobs.json', data);
    res.json({ ok: true, slug, markdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resumes/:slug.docx', (req, res) => {
  const f = path.join(filePath('resumes'), `${req.params.slug}.docx`);
  if (!fs.existsSync(f)) return res.status(404).end();
  res.download(f);
});

// --- ask about a topic (StudyOS's "Point & Ask", minus the browser extension) ---
app.post('/api/ask', async (req, res) => {
  const { topicId, question } = req.body || {};
  if (!question || !question.trim()) return res.status(400).json({ error: 'question required' });
  const plan = readJSON('plan.json', { topics: [] });
  const topic = plan.topics.find((t) => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'topic not found' });

  const settings = readJSON('settings.json', {});
  if (!settings.apiKey) return res.status(400).json({ error: 'Add an API key in Settings first.' });

  let docMarkdown = '';
  if (topic.docSlug) {
    const f = path.join(filePath('docs'), `${topic.docSlug}.md`);
    if (fs.existsSync(f)) docMarkdown = fs.readFileSync(f, 'utf8');
  }

  try {
    const answer = await askAboutTopic({
      provider: settings.provider, apiKey: settings.apiKey, model: settings.model,
      topicTitle: topic.title, topicContext: topic.context, docMarkdown, question,
    });
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- spaced review of saved question/answer pairs ---
app.get('/api/reviews', (req, res) => {
  const { cards } = readJSON('reviews.json', { cards: [] });
  const due = req.query.due === 'true';
  const now = Date.now();
  res.json({ cards: due ? cards.filter((c) => c.due <= now) : cards });
});

app.post('/api/reviews', (req, res) => {
  const { topicId, topicTitle, question, answer } = req.body || {};
  if (!question || !answer) return res.status(400).json({ error: 'question and answer required' });
  const data = readJSON('reviews.json', { cards: [] });
  const card = { id: crypto.randomUUID(), topicId: topicId || null, topicTitle: topicTitle || '', question, answer, ...newCard() };
  data.cards.push(card);
  writeJSON('reviews.json', data);
  res.json(card);
});

app.post('/api/reviews/:id/grade', (req, res) => {
  const { grade } = req.body || {};
  if (grade !== 'again' && grade !== 'good') return res.status(400).json({ error: 'grade must be "again" or "good"' });
  const data = readJSON('reviews.json', { cards: [] });
  const card = data.cards.find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: 'not found' });
  Object.assign(card, gradeCard(card, grade));
  writeJSON('reviews.json', data);
  res.json(card);
});

app.delete('/api/reviews/:id', (req, res) => {
  const data = readJSON('reviews.json', { cards: [] });
  data.cards = data.cards.filter((c) => c.id !== req.params.id);
  writeJSON('reviews.json', data);
  res.json({ ok: true });
});

// --- goals (flat checklist) ---
app.get('/api/goals', (req, res) => {
  res.json(readJSON('goals.json', { goals: [] }));
});

app.post('/api/goals', (req, res) => {
  const { label } = req.body || {};
  if (!label) return res.status(400).json({ error: 'label required' });
  const data = readJSON('goals.json', { goals: [] });
  const goal = { id: crypto.randomUUID(), label, done: false };
  data.goals.push(goal);
  writeJSON('goals.json', data);
  res.json(goal);
});

app.patch('/api/goals/:id', (req, res) => {
  const data = readJSON('goals.json', { goals: [] });
  const goal = data.goals.find((g) => g.id === req.params.id);
  if (!goal) return res.status(404).json({ error: 'not found' });
  Object.assign(goal, req.body || {});
  writeJSON('goals.json', data);
  res.json(goal);
});

const PORT = process.env.PORT || 4100;
if (require.main === module) {
  app.listen(PORT, () => console.log(`AI Learning Harness running at http://localhost:${PORT}`));
}

module.exports = app;
