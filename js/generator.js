import { findSolutions } from './game.js';

// Deterministic PRNG (mulberry32). Same seed → same sequence.
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

  // Mechanics expand. Weight basic ones higher so puzzles stay readable.
  const mechanics = ['>', '<', '=', '>', '<', '=', '>', '<'];
  if (level >= 5) mechanics.push('>>', '<<');
  if (level >= 9) mechanics.push('>>', '<<');
  if (level >= 13) mechanics.push('>>>', '<<<');

  const rockProb = Math.min(0.18, Math.max(0, (level - 6) * 0.015));

  return { cols, rivers, mechanics, rockProb };
}

function buildRandomLevel(rng, params) {
  const { cols, rivers: numRivers, mechanics, rockProb } = params;
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
  return { cols, rivers, goalCol };
}

// Generate a deterministic, solvable level for the given level number.
// Same level number always produces the same puzzle.
export function generateLevel(level) {
  const params = difficultyParams(level);

  // First pass: prefer puzzles with exactly 1 solution (clearest).
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

  // Second pass: any small number of solutions.
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

  // Last resort: trivial level so the user is never stuck.
  return {
    id: `gen-${level}`,
    name: String(level),
    cols: 5,
    rivers: [
      { cells: ['>', '>', '>', '>', '>'] },
      { cells: ['<', '<', '<', '<', '<'] },
    ],
    goalCol: 2,
  };
}
