import { PUSH_DELTA } from './levels.js';

// Simulate a run from `startCol` through every river of `level`.
// Returns:
//   { success: bool, reason: 'goal'|'overboard'|'wreck', path: [...] }
// path is a sequence of frames for animation:
//   { col, row, kind: 'start' | 'land' | 'pushed' | 'goal' | 'wreck' }
// row 0 = start shore, row N+1 = goal shore (N = number of rivers).
export function simulate(level, startCol) {
  const path = [{ col: startCol, row: 0, kind: 'start' }];
  let col = startCol;

  for (let r = 0; r < level.rivers.length; r++) {
    const row = r + 1;
    const cell = level.rivers[r].cells[col];

    // Land on river cell
    path.push({ col, row, kind: 'land' });

    if (cell === 'rock') {
      return { success: false, reason: 'wreck', path };
    }

    const delta = PUSH_DELTA[cell] ?? 0;
    if (delta !== 0) {
      const step = Math.sign(delta);
      const totalSteps = Math.abs(delta);
      for (let s = 0; s < totalSteps; s++) {
        col += step;
        if (col < 0 || col >= level.cols) {
          path.push({ col, row, kind: 'overboard' });
          return { success: false, reason: 'overboard', path };
        }
        const newCell = level.rivers[r].cells[col];
        path.push({ col, row, kind: 'pushed' });
        if (newCell === 'rock') {
          return { success: false, reason: 'wreck', path };
        }
      }
    }
  }

  // Step onto the goal shore
  const goalRow = level.rivers.length + 1;
  path.push({ col, row: goalRow, kind: col === level.goalCol ? 'goal' : 'land' });

  if (col === level.goalCol) {
    return { success: true, reason: 'goal', path };
  }
  return { success: false, reason: 'overboard', path };
}

// Find ALL starting columns that lead to the goal. Used to verify levels are
// solvable and to power "ghost trail" hints.
export function findSolutions(level) {
  const solutions = [];
  for (let c = 0; c < level.cols; c++) {
    if (simulate(level, c).success) solutions.push(c);
  }
  return solutions;
}
