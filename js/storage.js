const PROGRESS_KEY = 'pirat-progress-v1';
const CUSTOM_KEY = 'pirat-custom-v1';
const MARATHON_KEY = 'pirat-marathon-v1';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or disabled — fail silent, game still playable
  }
}

export function getProgress() {
  return readJSON(PROGRESS_KEY, {});
}

export function getStars(levelId) {
  const p = getProgress();
  return p[levelId]?.stars ?? 0;
}

export function recordResult(levelId, attempts) {
  const stars = attempts <= 1 ? 3 : attempts <= 3 ? 2 : 1;
  const progress = getProgress();
  const prev = progress[levelId]?.stars ?? 0;
  if (stars > prev) {
    progress[levelId] = { stars, completedAt: Date.now() };
    writeJSON(PROGRESS_KEY, progress);
  }
  return stars;
}

export function isUnlocked(levelIndex, allLevels) {
  if (levelIndex === 0) return true;
  const prev = allLevels[levelIndex - 1];
  return getStars(prev.id) > 0;
}

export function getCustomLevels() {
  return readJSON(CUSTOM_KEY, []);
}

export function saveCustomLevel(level) {
  const list = getCustomLevels();
  const idx = list.findIndex(l => l.id === level.id);
  if (idx >= 0) list[idx] = level;
  else list.push(level);
  writeJSON(CUSTOM_KEY, list);
}

export function deleteCustomLevel(id) {
  const list = getCustomLevels().filter(l => l.id !== id);
  writeJSON(CUSTOM_KEY, list);
}

export function newCustomId() {
  return 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

export function getMarathon() {
  return readJSON(MARATHON_KEY, { current: 1, best: 0 });
}

export function setMarathonCurrent(n) {
  const m = getMarathon();
  m.current = n;
  if (n > m.best) m.best = n;
  writeJSON(MARATHON_KEY, m);
  return m;
}

export function resetMarathon() {
  const m = getMarathon();
  m.current = 1;
  writeJSON(MARATHON_KEY, m);
  return m;
}
