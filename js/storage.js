const PROGRESS_KEY = 'pirat-progress-v1';
const CUSTOM_KEY = 'pirat-custom-v1';
const MARATHON_KEY = 'pirat-marathon-v1';
const FAILS_KEY = 'pirat-fails-v1';

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
    // storage full or disabled — fail silent
  }
}

export function getProgress() {
  return readJSON(PROGRESS_KEY, {});
}

export function getStars(levelId) {
  const p = getProgress();
  return p[levelId]?.stars ?? 0;
}

// Stars depend on attempts AND coin completion.
//   3 stars: first try AND all coins
//   2 stars: first try OR all coins
//   1 star:  win without all coins (or after a few attempts)
export function recordResult(levelId, attempts, coinsCollected = 0, totalCoins = 0) {
  const firstTry = attempts <= 1;
  const allCoins = totalCoins === 0 || coinsCollected >= totalCoins;
  let stars;
  if (firstTry && allCoins) stars = 3;
  else if (firstTry || allCoins) stars = 2;
  else if (attempts <= 3) stars = 2;
  else stars = 1;

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
  const list = readJSON(CUSTOM_KEY, []);
  // Drop the retired 'buoy' cell type from any older custom levels.
  for (const lvl of list) {
    for (const river of lvl.rivers || []) {
      for (let i = 0; i < river.cells.length; i++) {
        if (river.cells[i] === 'buoy') river.cells[i] = '=';
      }
    }
  }
  return list;
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

// Per-level fail counter (used to trigger the hint button after enough flops).
export function getFailCount(levelId) {
  const fails = readJSON(FAILS_KEY, {});
  return fails[levelId] || 0;
}

export function bumpFailCount(levelId) {
  const fails = readJSON(FAILS_KEY, {});
  fails[levelId] = (fails[levelId] || 0) + 1;
  writeJSON(FAILS_KEY, fails);
  return fails[levelId];
}

export function resetFailCount(levelId) {
  const fails = readJSON(FAILS_KEY, {});
  delete fails[levelId];
  writeJSON(FAILS_KEY, fails);
}
