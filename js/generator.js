import { findSolutions } from './game.js';

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

// Difficulty curve. Level 1 is easiest, grows from there.
function difficultyParams(level) {
  const cols = Math.min(8, 4 + Math.floor((level - 1) / 4));
  const rivers = Math.min(7, 2 + Math.floor((level - 1) / 3));

  const mechanics = ['>', '<', '=', '>', '<', '=', '>', '<'];
  if (level >= 5) mechanics.push('>>', '<<');
  if (level >= 9) mechanics.push('>>', '<<');
  if (level >= 13) mechanics.push('>>>', '<<<');
  if (level >= 16) mechanics.push('↗', '↖');
  if (level >= 20) mechanics.push('⬆');

  const rockProb = Math.min(0.18, Math.max(0, (level - 6) * 0.015));

  const useWhirlpool = level >= 24;
  const useCoins = level >= 18;
  const useCheckpoint = level >= 28;

  return { cols, rivers, mechanics, rockProb, useWhirlpool, useCoins, useCheckpoint };
}

function buildRandomLevel(rng, params) {
  const { cols, rivers: numRivers, mechanics, rockProb,
          useWhirlpool, useCoins, useCheckpoint } = params;
  const rivers = [];
  for (let r = 0; r < numRivers; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      if (rng() < rockProb) {
        cells.push('rock');
      } else {
        cells.push(pick(mechanics, rng));
      }
    }
    rivers.push({ cells });
  }
  const goalCol = Math.floor(rng() * cols);

  // Optional whirlpool pair (one pair max, somewhere in middle rows).
  if (useWhirlpool && rng() < 0.5 && numRivers >= 3) {
    const r1 = 1 + Math.floor(rng() * (numRivers - 1));
    const r2 = 1 + Math.floor(rng() * (numRivers - 1));
    const c1 = Math.floor(rng() * cols);
    const c2 = Math.floor(rng() * cols);
    if (rivers[r1].cells[c1] !== 'rock' && rivers[r2].cells[c2] !== 'rock' &&
        !(r1 === r2 && c1 === c2)) {
      rivers[r1].cells[c1] = 'whirl-A';
      rivers[r2].cells[c2] = 'whirl-A';
    }
  }

  // Optional coins (1-2 of them).
  const coins = [];
  if (useCoins && rng() < 0.6) {
    const num = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < num; i++) {
      const row = 1 + Math.floor(rng() * numRivers);
      const col = Math.floor(rng() * cols);
      if (!coins.some(p => p.row === row && p.col === col)) coins.push({ row, col });
    }
  }

  // Optional 1 checkpoint.
  const checkpoints = [];
  if (useCheckpoint && rng() < 0.5) {
    const row = 1 + Math.floor(rng() * numRivers);
    const col = Math.floor(rng() * cols);
    checkpoints.push({ row, col });
  }

  return { cols, rivers, goalCol, coins, checkpoints };
}

// Generate a deterministic, solvable level for the given level number.
export function generateLevel(level) {
  const params = difficultyParams(level);

  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = mulberry32(level * 31337 + attempt * 7);
    const candidate = buildRandomLevel(rng, params);
    const sols = findSolutions(candidate);
    if (sols.length === 1) {
      candidate.id = `gen-${level}`;
      candidate.name = String(level);
      return candidate;
    }
  }

  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = mulberry32(level * 31337 + 99991 + attempt * 13);
    const candidate = buildRandomLevel(rng, params);
    const sols = findSolutions(candidate);
    if (sols.length >= 1 && sols.length <= 3) {
      candidate.id = `gen-${level}`;
      candidate.name = String(level);
      return candidate;
    }
  }

  return {
    id: `gen-${level}`,
    name: String(level),
    cols: 5,
    rivers: [
      { cells: ['>', '>', '>', '>', '>'] },
      { cells: ['<', '<', '<', '<', '<'] },
    ],
    goalCol: 2,
    coins: [],
    checkpoints: [],
  };
}
