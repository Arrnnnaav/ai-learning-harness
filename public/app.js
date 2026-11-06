const api = (url, opts) => fetch(url, opts).then(async (r) => {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
});

function updateProviderFields() {
  const isOllama = document.getElementById('provider').value === 'ollama';
  document.getElementById('ollamaHost-field').classList.toggle('hidden', !isOllama);
  document.getElementById('apiKey-field').classList.toggle('hidden', isOllama);
}
document.getElementById('provider').addEventListener('change', updateProviderFields);

async function checkOllama() {
  const el = document.getElementById('ollama-status');
  if (document.getElementById('provider').value !== 'ollama') { el.classList.add('hidden'); return false; }
  el.classList.remove('hidden');
  el.textContent = 'Checking Ollama…';
  try {
    const { reachable, models } = await api('/api/ollama/health');
    el.textContent = reachable
      ? `Ollama is running. Models: ${models.length ? models.join(', ') : 'none pulled yet — run e.g. "ollama pull qwen3:4b-instruct"'}`
      : "Can't reach Ollama. Install it from ollama.com and make sure it's running.";
    return reachable;
  } catch {
    el.textContent = "Can't reach Ollama. Install it from ollama.com and make sure it's running.";
    return false;
  }
}

async function loadSettings() {
  const s = await api('/api/settings');
  document.getElementById('provider').value = s.provider;
  document.getElementById('model').value = s.model || '';
  document.getElementById('ollamaHost').value = s.ollamaHost || '';
  updateProviderFields();
  const bits = [s.hasKey ? 'API key saved' : 'No API key set yet'];
  bits.push(s.hasYoutubeKey ? 'YouTube key saved (real video links on)' : 'No YouTube key (video sections will be search queries)');
  bits.push(s.hasTavilyKey ? 'Tavily key saved (better Research search)' : 'No Tavily key (Research mode still works via free DuckDuckGo search)');
  document.getElementById('settings-status').textContent = bits.join(' · ');

  const ollamaOk = s.provider === 'ollama' ? await checkOllama() : false;
  document.getElementById('welcome-banner').classList.toggle('hidden', s.hasKey || ollamaOk);
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const provider = document.getElementById('provider').value;
  const model = document.getElementById('model').value;
  const ollamaHost = document.getElementById('ollamaHost').value;
  const apiKey = document.getElementById('apiKey').value;
  const youtubeApiKey = document.getElementById('youtubeApiKey').value;
  const tavilyApiKey = document.getElementById('tavilyApiKey').value;
  await api('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider, model, ollamaHost,
      ...(apiKey ? { apiKey } : {}),
      ...(youtubeApiKey ? { youtubeApiKey } : {}),
      ...(tavilyApiKey ? { tavilyApiKey } : {}),
    }),
  });
  document.getElementById('apiKey').value = '';
  document.getElementById('youtubeApiKey').value = '';
  document.getElementById('tavilyApiKey').value = '';
  loadSettings();
});

// --- résumé ---
async function loadResumeBase() {
  const { text } = await api('/api/resume/base');
  document.getElementById('resume-base').value = text || '';
}

document.getElementById('resume-save').addEventListener('click', async () => {
  const text = document.getElementById('resume-base').value;
  await api('/api/resume/base', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  document.getElementById('resume-status').textContent = 'Saved.';
  setTimeout(() => { document.getElementById('resume-status').textContent = ''; }, 2000);
});

// --- jobs ---
function jobRow(j) {
  const li = document.createElement('li');
  li.className = 'topic-row';
  li.innerHTML = `
    <span class="topic-title">${j.title}${j.company ? ` · ${j.company}` : ''}</span>
    <button data-action="tailor" data-id="${j.id}">${j.tailoredSlug ? 'Re-tailor résumé' : 'Tailor résumé'}</button>
    ${j.tailoredSlug ? `<a href="/api/resumes/${j.tailoredSlug}.docx" download>Download .docx</a>` : ''}
    <button data-action="delete-job" data-id="${j.id}">Delete</button>
  `;
  return li;
}

async function loadJobs() {
  const { jobs } = await api('/api/jobs');
  const list = document.getElementById('job-list');
  list.innerHTML = '';
  if (jobs.length === 0) {
    list.innerHTML = '<li class="empty">No jobs yet — paste a posting above and save a base résumé to tailor against it.</li>';
    return;
  }
  jobs.forEach((j) => list.appendChild(jobRow(j)));
}

document.getElementById('job-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const company = document.getElementById('job-company').value;
  const title = document.getElementById('job-title').value;
  const url = document.getElementById('job-url').value;
  const description = document.getElementById('job-description').value;
  await api('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, title, url, description }),
  });
  e.target.reset();
  loadJobs();
});

document.getElementById('job-list').addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (e.target.dataset.action === 'delete-job') {
    await api(`/api/jobs/${id}`, { method: 'DELETE' });
    loadJobs();
  }
  if (e.target.dataset.action === 'tailor') {
    e.target.disabled = true;
    e.target.textContent = 'Tailoring…';
    try {
      await api(`/api/jobs/${id}/tailor`, { method: 'POST' });
    } catch (err) {
      alert(err.message);
    }
    loadJobs();
  }
});

let allTopics = [];

function topicRow(t) {
  const li = document.createElement('li');
  li.className = 'topic-row';
  const prereqNames = (t.prereqs || []).map((id) => allTopics.find((x) => x.id === id)?.title).filter(Boolean);
  li.innerHTML = `
    <div class="topic-main">
      <label class="topic-done"><input type="checkbox" data-action="done" data-id="${t.id}" ${t.done ? 'checked' : ''}/></label>
      <span class="topic-title">${t.title}</span>
      <span class="topic-status">${t.status}${prereqNames.length ? ` · needs: ${prereqNames.join(', ')}` : ''}</span>
      <button data-action="generate" data-id="${t.id}">${t.status === 'generated' ? 'Regenerate' : 'Generate doc'}</button>
      ${t.docSlug ? `<a href="/api/docs/${t.docSlug}.docx" download>Download .docx</a>` : ''}
      <button data-action="ask-toggle" data-id="${t.id}">Ask</button>
      <button data-action="delete" data-id="${t.id}">Delete</button>
    </div>
    <div class="ask-box hidden" data-ask-for="${t.id}">
      <input type="text" class="ask-question" placeholder="Ask something about ${t.title}…" />
      <label class="ask-research"><input type="checkbox" class="ask-research-toggle" checked /> Verify with sources</label>
      <button data-action="ask-submit" data-id="${t.id}">Ask</button>
      <div class="ask-answer"></div>
    </div>
  `;
  return li;
}

async function loadTopics() {
  const { topics } = await api('/api/plan');
  allTopics = topics;
  const list = document.getElementById('topic-list');
  list.innerHTML = '';
  if (topics.length === 0) {
    list.innerHTML = '<li class="empty">No topics yet — add one above to generate your first study doc.</li>';
  } else {
    topics.forEach((t) => list.appendChild(topicRow(t)));
  }

  const picker = document.getElementById('prereq-picker');
  picker.innerHTML = topics.length
    ? `<span class="hint">Prereqs (optional):</span>` + topics.map((t) =>
        `<label class="prereq-item"><input type="checkbox" value="${t.id}" /> ${t.title}</label>`).join('')
    : '';

  loadToday();
}

document.getElementById('topic-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('topic-title').value;
  const context = document.getElementById('topic-context').value;
  const prereqs = [...document.querySelectorAll('#prereq-picker input:checked')].map((i) => i.value);
  await api('/api/plan/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, context, prereqs }),
  });
  e.target.reset();
  loadTopics();
});

document.getElementById('topic-list').addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (e.target.dataset.action === 'delete') {
    await api(`/api/plan/topics/${id}`, { method: 'DELETE' });
    loadTopics();
  }
  if (e.target.dataset.action === 'generate') {
    e.target.disabled = true;
    e.target.textContent = 'Generating…';
    try {
      await api('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: id }),
      });
    } catch (err) {
      alert(err.message);
    }
    loadTopics();
  }
  if (e.target.dataset.action === 'ask-toggle') {
    document.querySelector(`.ask-box[data-ask-for="${id}"]`).classList.toggle('hidden');
  }
  if (e.target.dataset.action === 'ask-submit') {
    const box = document.querySelector(`.ask-box[data-ask-for="${id}"]`);
    const question = box.querySelector('.ask-question').value;
    const research = box.querySelector('.ask-research-toggle').checked;
    const answerEl = box.querySelector('.ask-answer');
    if (!question.trim()) return;
    answerEl.textContent = research ? 'Searching and thinking…' : 'Thinking…';
    try {
      const { answer, sources } = await api('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: id, question, research }),
      });
      const sourcesHtml = (sources || []).length
        ? `<ul class="ask-sources">${sources.map((s) => `<li>[${s.id}] <a href="${s.url}" target="_blank" rel="noopener">${s.title}</a></li>`).join('')}</ul>`
        : '';
      const fullAnswer = (sources || []).length
        ? `${answer}\n\nSources:\n${sources.map((s) => `[${s.id}] ${s.title} — ${s.url}`).join('\n')}`
        : answer;
      answerEl.innerHTML = `<p>${answer.replace(/\n/g, '<br>')}</p>${sourcesHtml}<button data-action="save-review" data-id="${id}" data-question="${encodeURIComponent(question)}" data-answer="${encodeURIComponent(fullAnswer)}">Save to Review</button>`;
    } catch (err) {
      answerEl.textContent = err.message;
    }
  }
});

document.getElementById('topic-list').addEventListener('change', async (e) => {
  if (e.target.dataset.action === 'done') {
    await api(`/api/plan/topics/${e.target.dataset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: e.target.checked }),
    });
    loadTopics();
  }
});

document.getElementById('topic-list').addEventListener('click', async (e) => {
  if (e.target.dataset.action !== 'save-review') return;
  const topic = allTopics.find((t) => t.id === e.target.dataset.id);
  await api('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topicId: topic?.id, topicTitle: topic?.title,
      question: decodeURIComponent(e.target.dataset.question),
      answer: decodeURIComponent(e.target.dataset.answer),
    }),
  });
  e.target.textContent = 'Saved ✓';
  e.target.disabled = true;
  loadReviews();
});

// --- today ---
async function loadToday() {
  const { nextTopics, dueReviewCount } = await api('/api/today');
  const el = document.getElementById('today-summary');
  const parts = [];
  parts.push(nextTopics.length
    ? `Next up: ${nextTopics.map((t) => t.title).join(', ')}`
    : 'No topic is prereq-ready yet — add one with no prereqs, or mark a prereq done.');
  parts.push(dueReviewCount > 0 ? `${dueReviewCount} review${dueReviewCount === 1 ? '' : 's'} due.` : 'No reviews due.');
  el.textContent = parts.join(' · ');
}

// --- review ---
function reviewRow(c) {
  const li = document.createElement('li');
  li.className = 'review-row';
  li.innerHTML = `
    <div class="review-q">${c.question}${c.topicTitle ? ` <span class="hint">(${c.topicTitle})</span>` : ''}</div>
    <button data-action="reveal" data-id="${c.id}">Show answer</button>
    <div class="review-a hidden">${c.answer.replace(/\n/g, '<br>')}</div>
    <div class="review-grade hidden">
      <button data-action="grade" data-id="${c.id}" data-grade="again">Again</button>
      <button data-action="grade" data-id="${c.id}" data-grade="good">Good</button>
    </div>
  `;
  return li;
}

async function loadReviews() {
  const { cards } = await api('/api/reviews?due=true');
  const list = document.getElementById('review-list');
  list.innerHTML = '';
  if (cards.length === 0) {
    list.innerHTML = '<li class="empty">Nothing due. Ask a question on a topic and save a good answer to build this up.</li>';
    return;
  }
  cards.forEach((c) => list.appendChild(reviewRow(c)));
}

document.getElementById('review-list').addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  const row = e.target.closest('.review-row');
  if (e.target.dataset.action === 'reveal') {
    row.querySelector('.review-a').classList.remove('hidden');
    row.querySelector('.review-grade').classList.remove('hidden');
    e.target.classList.add('hidden');
  }
  if (e.target.dataset.action === 'grade') {
    await api(`/api/reviews/${id}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade: e.target.dataset.grade }),
    });
    row.remove();
    loadToday();
  }
});

function goalRow(g) {
  const li = document.createElement('li');
  li.innerHTML = `<label><input type="checkbox" data-id="${g.id}" ${g.done ? 'checked' : ''}/> ${g.label}</label>`;
  return li;
}

async function loadGoals() {
  const { goals } = await api('/api/goals');
  const list = document.getElementById('goal-list');
  list.innerHTML = '';
  if (goals.length === 0) {
    list.innerHTML = '<li class="empty">No goals yet.</li>';
    return;
  }
  goals.forEach((g) => list.appendChild(goalRow(g)));
}

document.getElementById('goal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const label = document.getElementById('goal-label').value;
  await api('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  e.target.reset();
  loadGoals();
});

document.getElementById('goal-list').addEventListener('change', async (e) => {
  if (e.target.type !== 'checkbox') return;
  await api(`/api/goals/${e.target.dataset.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: e.target.checked }),
  });
});

loadSettings();
loadTopics();
loadReviews();
loadResumeBase();
loadJobs();
loadGoals();
