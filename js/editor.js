import { mountStage } from './render.js';
import { findSolutions, findReachableLandings, simulate } from './game.js';
import { saveCustomLevel, newCustomId } from './storage.js';
import { isWhirlpool } from './levels.js';

// Tools fall in three categories:
//   PAINT_TOOLS   — replace the cell content (currents, rock, buoy, whirlpool)
//   TOGGLE_TOOLS  — toggle decoration on/off (coin, checkpoint)
const PAINT_TOOLS = [
  '>', '<', '=', '>>', '<<', '>>>', '<<<',
  '↗', '↖', '↘', '↙', '⬆', '⬇',
  'rock', 'buoy',
  'whirl-A', 'whirl-B', 'whirl-C', 'whirl-D',
];
const TOGGLE_TOOLS = ['coin', 'checkpoint'];
const TOOLS = [...PAINT_TOOLS, ...TOGGLE_TOOLS];

function blankRiver(cols) {
  return { cells: Array.from({ length: cols }, () => '>') };
}

export function createEditorState() {
  return {
    cols: 5,
    rivers: [blankRiver(5), blankRiver(5), blankRiver(5)],
    goalCol: 2,
    coins: [],
    checkpoints: [],
    selectedTool: '>',
    editingId: null,
  };
}

export function loadEditorState(level) {
  return {
    cols: level.cols,
    rivers: level.rivers.map(r => ({ cells: [...r.cells] })),
    goalCol: level.goalCol,
    coins: (level.coins || []).map(p => ({ ...p })),
    checkpoints: (level.checkpoints || []).map(p => ({ ...p })),
    selectedTool: '>',
    editingId: level.id || null,
  };
}

export function buildLevelFromState(state) {
  return {
    id: state.editingId || newCustomId(),
    name: 'Hartă',
    cols: state.cols,
    rivers: state.rivers.map(r => ({ cells: [...r.cells] })),
    goalCol: state.goalCol,
    coins: state.coins.map(p => ({ ...p })),
    checkpoints: state.checkpoints.map(p => ({ ...p })),
    custom: true,
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Drop coins/checkpoints that fall outside the new bounds.
function trimDecorations(state) {
  const inRange = p => p.row >= 1 && p.row <= state.rivers.length && p.col >= 0 && p.col < state.cols;
  state.coins = state.coins.filter(inRange);
  state.checkpoints = state.checkpoints.filter(inRange);
}

export function adjustCols(state, delta) {
  const next = clamp(state.cols + delta, 4, 8);
  if (next === state.cols) return state;
  state.cols = next;
  state.rivers = state.rivers.map(r => {
    const cells = [...r.cells];
    while (cells.length < next) cells.push('>');
    cells.length = next;
    return { cells };
  });
  state.goalCol = clamp(state.goalCol, 0, next - 1);
  trimDecorations(state);
  return state;
}

export function adjustRivers(state, delta) {
  const next = clamp(state.rivers.length + delta, 2, 7);
  if (next === state.rivers.length) return state;
  while (state.rivers.length < next) state.rivers.push(blankRiver(state.cols));
  state.rivers.length = next;
  trimDecorations(state);
  return state;
}

export function setSelectedTool(state, tool) {
  if (TOOLS.includes(tool)) state.selectedTool = tool;
}

// Count how many times a whirlpool code already appears on the grid.
function countWhirl(state, code) {
  let n = 0;
  for (const river of state.rivers) {
    for (const cell of river.cells) {
      if (cell === code) n++;
    }
  }
  return n;
}

// Remove all instances of a whirlpool code (both ends).
function clearWhirl(state, code) {
  for (const river of state.rivers) {
    for (let i = 0; i < river.cells.length; i++) {
      if (river.cells[i] === code) river.cells[i] = '=';
    }
  }
}

function paintCell(state, riverIdx, col, tool) {
  // Whirlpools: enforce max 2 endpoints. Painting a 3rd resets the pair.
  if (isWhirlpool(tool)) {
    const existing = countWhirl(state, tool);
    if (existing >= 2) clearWhirl(state, tool);
  }
  state.rivers[riverIdx].cells[col] = tool;
}

function toggleCoin(state, row, col) {
  const idx = state.coins.findIndex(p => p.row === row && p.col === col);
  if (idx >= 0) state.coins.splice(idx, 1);
  else state.coins.push({ row, col });
}

function toggleCheckpoint(state, row, col) {
  const idx = state.checkpoints.findIndex(p => p.row === row && p.col === col);
  if (idx >= 0) state.checkpoints.splice(idx, 1);
  else state.checkpoints.push({ row, col });
}

export function renderEditor(stage, state, onChange) {
  const handle = mountStage(stage, buildLevelFromState(state), { editable: true });

  handle.grid.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const role = cell.dataset.role;
    const col = Number(cell.dataset.col);

    if (role === 'river') {
      const riverIdx = Number(cell.dataset.river);
      const row = riverIdx + 1;
      const tool = state.selectedTool;
      if (tool === 'coin') {
        toggleCoin(state, row, col);
      } else if (tool === 'checkpoint') {
        toggleCheckpoint(state, row, col);
      } else if (PAINT_TOOLS.includes(tool)) {
        paintCell(state, riverIdx, col, tool);
      }
      onChange();
    } else if (role === 'goal' || role === 'goal-blocked') {
      state.goalCol = col;
      onChange();
    }
  });

  return handle;
}

// Strip orphan whirlpool ends (cells whose pair partner is missing).
function dropOrphanWhirlpools(level) {
  const counts = new Map();
  for (const river of level.rivers) {
    for (const cell of river.cells) {
      if (isWhirlpool(cell)) counts.set(cell, (counts.get(cell) || 0) + 1);
    }
  }
  for (const [code, n] of counts) {
    if (n !== 2) {
      for (const river of level.rivers) {
        for (let i = 0; i < river.cells.length; i++) {
          if (river.cells[i] === code) river.cells[i] = '=';
        }
      }
    }
  }
}

export function trySaveLevel(state) {
  const level = buildLevelFromState(state);
  // Validate whirlpools: every code must appear exactly twice.
  const whirlCounts = new Map();
  for (const river of level.rivers) {
    for (const cell of river.cells) {
      if (isWhirlpool(cell)) whirlCounts.set(cell, (whirlCounts.get(cell) || 0) + 1);
    }
  }
  for (const [, n] of whirlCounts) {
    if (n !== 2) return { ok: false, reason: 'whirlpool-orphan' };
  }
  const solutions = findSolutions(level);
  if (solutions.length === 0) {
    return { ok: false, reason: 'no-solution' };
  }
  saveCustomLevel(level);
  state.editingId = level.id;
  return { ok: true, level };
}

// If the level has no solution, move goalCol to the nearest reachable landing.
export function autoFix(state) {
  const level = buildLevelFromState(state);
  // First clean up orphan whirlpools so simulate doesn't see partial pairs.
  dropOrphanWhirlpools(level);
  // Mirror those changes back into the editor state so the user sees the fix.
  state.rivers = level.rivers.map(r => ({ cells: [...r.cells] }));

  if (findSolutions(level).length > 0) {
    return { fixed: false, reason: 'already-solvable' };
  }
  const reachable = findReachableLandings(level);
  if (reachable.length === 0) {
    return { fixed: false, reason: 'no-paths' };
  }
  const oldGoal = state.goalCol;
  const newGoal = reachable.reduce((best, c) =>
    Math.abs(c - oldGoal) < Math.abs(best - oldGoal) ? c : best
  );
  state.goalCol = newGoal;
  // Re-build to confirm
  const level2 = buildLevelFromState(state);
  if (findSolutions(level2).length === 0) {
    return { fixed: false, reason: 'no-paths' };
  }
  return { fixed: true, oldGoal, newGoal };
}
