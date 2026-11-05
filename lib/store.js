const fs = require('fs');
const path = require('path');
const os = require('os');

function dataDir() {
  let electron;
  try { electron = require('electron'); } catch { electron = null; }
  const dir = electron && electron.app
    ? path.join(electron.app.getPath('userData'), 'data')
    : path.join(os.homedir(), '.ai-learning-harness');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function filePath(name) {
  return path.join(dataDir(), name);
}

function readJSON(name, fallback) {
  const f = filePath(name);
  if (!fs.existsSync(f)) return fallback;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

module.exports = { dataDir, filePath, readJSON, writeJSON };
