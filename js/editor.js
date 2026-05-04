import { mountStage } from './render.js';
import { findSolutions, simulate } from './game.js';
import { saveCustomLevel, newCustomId } from './storage.js';

const CYCLE = ['>', '<', '=', '>>', '<<', 'rock'];

function nextCode(code) {
  const idx = CYCLE.indexOf(code);
  return CYCLE[(idx + 1) % CYCLE.length];
}

function blankRiver(cols) {
  return { cells: Array.from({ length: cols }, () => '>') };
}

export function createEditorState() {
  return {
    cols: 5,
    rivers: [blankRiver(5), blankRiver(5), blankRiver(5)],
    goalCol: 2,
  };
}

export function buildLevelFromState(state) {
  return {
    id: newCustomId(),
    name: 'Hartă',
    cols: state.cols,
    rivers: state.rivers.map(r => ({ cells: [...r.cells] })),
    goalCol: state.goalCol,
    custom: true,
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
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
  return state;
}

export function adjustRivers(state, delta) {
  const next = clamp(state.rivers.length + delta, 2, 7);
  if (next === state.rivers.length) return state;
  while (state.rivers.length < next) state.rivers.push(blankRiver(state.cols));
  state.rivers.length = next;
  return state;
}

export function renderEditor(stage, state, onChange) {
  const handle = mountStage(stage, buildLevelFromState(state), { editable: true });

  // Bind taps on cells
  handle.grid.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const role = cell.dataset.role;
    const col = Number(cell.dataset.col);

    if (role === 'river') {
      const riverIdx = Number(cell.dataset.river);
      const cur = state.rivers[riverIdx].cells[col];
      state.rivers[riverIdx].cells[col] = nextCode(cur);
      onChange();
    } else if (role === 'goal' || role === 'goal-blocked') {
      state.goalCol = col;
      onChange();
    }
  });

  return handle;
}

export function trySaveLevel(state) {
  const level = buildLevelFromState(state);
  const solutions = findSolutions(level);
  if (solutions.length === 0) {
    return { ok: false, reason: 'no-solution' };
  }
  saveCustomLevel(level);
  return { ok: true, level };
}

// Find every column the ship can actually reach on the goal shore (regardless
// of whether it matches goalCol). Returns an array of distinct columns.
function findReachableLandings(level) {
  const reachable = new Set();
  for (let c = 0; c < level.cols; c++) {
    const result = simulate(level, c);
    const last = result.path[result.path.length - 1];
    if (last.row === level.rivers.length + 1) {
      reachable.add(last.col);
    }
  }
  return [...reachable];
}

// If the level has no solution, move goalCol to the nearest reachable landing.
// Returns one of:
//   { fixed: true, oldGoal, newGoal }
//   { fixed: false, reason: 'already-solvable' }
//   { fixed: false, reason: 'no-paths' } — every start crashes; need to remove rocks
export function autoFix(state) {
  const level = buildLevelFromState(state);
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
  return { fixed: true, oldGoal, newGoal };
}
