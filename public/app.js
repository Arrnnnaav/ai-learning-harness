const api = (url, opts) => fetch(url, opts).then(async (r) => {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
});

async function loadSettings() {
  const s = await api('/api/settings');
  document.getElementById('provider').value = s.provider;
  document.getElementById('model').value = s.model || '';
  const bits = [s.hasKey ? 'API key saved' : 'No API key set yet'];
  bits.push(s.hasYoutubeKey ? 'YouTube key saved (real video links on)' : 'No YouTube key (video sections will be search queries)');
  document.getElementById('settings-status').textContent = bits.join(' · ');
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const provider = document.getElementById('provider').value;
  const model = document.getElementById('model').value;
  const apiKey = document.getElementById('apiKey').value;
  const youtubeApiKey = document.getElementById('youtubeApiKey').value;
  await api('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider, model,
      ...(apiKey ? { apiKey } : {}),
      ...(youtubeApiKey ? { youtubeApiKey } : {}),
    }),
  });
  document.getElementById('apiKey').value = '';
  document.getElementById('youtubeApiKey').value = '';
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

function topicRow(t) {
  const li = document.createElement('li');
  li.className = 'topic-row';
  li.innerHTML = `
    <span class="topic-title">${t.title}</span>
    <span class="topic-status">${t.status}</span>
    <button data-action="generate" data-id="${t.id}">${t.status === 'generated' ? 'Regenerate' : 'Generate doc'}</button>
    ${t.docSlug ? `<a href="/api/docs/${t.docSlug}.docx" download>Download .docx</a>` : ''}
    <button data-action="delete" data-id="${t.id}">Delete</button>
  `;
  return li;
}

async function loadTopics() {
  const { topics } = await api('/api/plan');
  const list = document.getElementById('topic-list');
  list.innerHTML = '';
  topics.forEach((t) => list.appendChild(topicRow(t)));
}

document.getElementById('topic-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('topic-title').value;
  const context = document.getElementById('topic-context').value;
  await api('/api/plan/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, context }),
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
loadResumeBase();
loadJobs();
loadGoals();
