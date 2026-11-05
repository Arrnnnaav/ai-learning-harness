async function searchYouTube(apiKey, query, maxResults = 2) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.search = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: String(maxResults), q: query, key: apiKey,
  }).toString();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`);
  const json = await res.json();
  return (json.items || []).map((item) => ({
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

// Replaces "Search YouTube: `query`" lines in generated markdown with real,
// verified video links when a YouTube API key is configured. Falls back to
// the search-query line (never a fabricated URL) if the key is missing or a
// lookup fails.
async function resolveVideoLinks(markdown, apiKey) {
  if (!apiKey) return markdown;
  const lines = markdown.split('\n');
  const out = [];
  for (const line of lines) {
    const match = line.match(/^(\s*-\s*).*Search YouTube:\s*`([^`]+)`/i);
    if (!match) { out.push(line); continue; }
    try {
      const videos = await searchYouTube(apiKey, match[2]);
      if (videos.length === 0) { out.push(line); continue; }
      out.push(`${match[1]}${videos.map((v) => `[${v.title}](${v.url})`).join(' · ')}`);
    } catch {
      out.push(line);
    }
  }
  return out.join('\n');
}

module.exports = { searchYouTube, resolveVideoLinks };
