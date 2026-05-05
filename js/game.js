import { PUSH_DELTA, isWhirlpool } from './levels.js';

// Build a lookup map for whirlpool pairs: code -> [{r,c}, {r,c}].
// `r` is 0-indexed river row (matches level.rivers[r]).
function buildWhirlpoolPairs(level) {
  const pairs = new Map();
  for (let r = 0; r < level.rivers.length; r++) {
    const cells = level.rivers[r].cells;
    for (let c = 0; c < cells.length; c++) {
      if (isWhirlpool(cells[c])) {
        const code = cells[c];
        if (!pairs.has(code)) pairs.set(code, []);
        pairs.get(code).push({ r, c });
      }
    }
  }
  return pairs;
}

function teleportTarget(pairs, r, c) {
  for (const list of pairs.values()) {
    if (list.length !== 2) continue;
    const [a, b] = list;
    if (a.r === r && a.c === c) return b;
    if (b.r === r && b.c === c) return a;
  }
  return null;
}

function inBounds(level, r, c) {
  return r >= 0 && r <= level.rivers.length + 1 && c >= 0 && c < level.cols;
}

function cellAt(level, r, c) {
  if (r === 0 || r === level.rivers.length + 1) return null; // shore
  return level.rivers[r - 1].cells[c];
}

function isCoinAt(level, r, c) {
  const coins = level.coins || [];
  return coins.some(p => p.row === r && p.col === c);
}

function isCheckpointAt(level, r, c) {
  const cps = level.checkpoints || [];
  return cps.some(p => p.row === r && p.col === c);
}

// Simulate a run from `startCol` through every river of `level`.
// Returns:
//   { success, reason, path, coinsCollected: Set, totalCoins, checkpointsHit: Set, totalCheckpoints }
// path frames: { col, row, kind: 'start'|'land'|'pushed'|'goal'|'overboard'|'wreck'|'teleport'|'coin'|'checkpoint' }
// row 0 = start shore, row N+1 = goal shore.
export function simulate(level, startCol) {
  const path = [{ col: startCol, row: 0, kind: 'start' }];
  const goalRow = level.rivers.length + 1;
  const pairs = buildWhirlpoolPairs(level);

  const coins = level.coins || [];
  const checkpoints = level.checkpoints || [];
  const coinsCollected = new Set();
  const checkpointsHit = new Set();

  let col = startCol;
  let row = 0;
  let steps = 0;
  const maxSteps = (level.cols + 2) * (level.rivers.length + 2) * 4;
  const visited = new Map(); // "r,c" -> count

  function pickup(r, c) {
    if (isCoinAt(level, r, c)) {
      const key = `${r},${c}`;
      if (!coinsCollected.has(key)) {
        coinsCollected.add(key);
        path.push({ col: c, row: r, kind: 'coin' });
      }
    }
    if (isCheckpointAt(level, r, c)) {
      const key = `${r},${c}`;
      if (!checkpointsHit.has(key)) {
        checkpointsHit.add(key);
        path.push({ col: c, row: r, kind: 'checkpoint' });
      }
    }
  }

  function result(success, reason) {
    return {
      success,
      reason,
      path,
      coinsCollected,
      totalCoins: coins.length,
      checkpointsHit,
      totalCheckpoints: checkpoints.length,
    };
  }

  while (row < goalRow) {
    if (++steps > maxSteps) return result(false, 'lost');

    // Natural +1 row step (ship sails forward by 1).
    row += 1;

    if (!inBounds(level, row, col)) {
      path.push({ col, row, kind: 'overboard' });
      return result(false, 'overboard');
    }

    if (row === goalRow) {
      path.push({ col, row, kind: col === level.goalCol ? 'goal' : 'land' });
      break;
    }

    // On a river row.
    path.push({ col, row, kind: 'land' });
    const cell = cellAt(level, row, col);
    pickup(row, col);

    if (cell === 'rock') return result(false, 'wreck');

    // Cycle protection: if we revisit (r,c) more than 3x, give up.
    const key = `${row},${col}`;
    visited.set(key, (visited.get(key) || 0) + 1);
    if (visited.get(key) > 3) return result(false, 'lost');

    // Whirlpool: teleport to paired cell, then continue (no current applied here).
    if (isWhirlpool(cell)) {
      const dest = teleportTarget(pairs, row - 1, col);
      if (dest) {
        col = dest.c;
        row = dest.r + 1;
        path.push({ col, row, kind: 'teleport' });
        pickup(row, col);
        // Don't apply the destination's current — pretend we just arrived.
        // The next iteration will sail forward by 1.
        continue;
      }
      // Orphan whirlpool — treat as `=` (no effect)
      continue;
    }

    // Apply current vector.
    const delta = PUSH_DELTA[cell];
    if (!delta || (delta.dx === 0 && delta.dy === 0)) continue;

    // Step the push out cell-by-cell so we can animate and detect hits.
    const totalX = Math.abs(delta.dx);
    const totalY = Math.abs(delta.dy);
    const sx = Math.sign(delta.dx);
    const sy = Math.sign(delta.dy);
    const steps2D = Math.max(totalX, totalY);

    let teleported = false;
    for (let s = 0; s < steps2D; s++) {
      if (s < totalX) col += sx;
      if (s < totalY) row += sy;

      if (!inBounds(level, row, col)) {
        path.push({ col, row, kind: 'overboard' });
        return result(false, 'overboard');
      }

      path.push({ col, row, kind: 'pushed' });

      // If pushed onto goal shore mid-current, stop here.
      if (row === goalRow) {
        const last = path[path.length - 1];
        last.kind = col === level.goalCol ? 'goal' : 'land';
        if (col === level.goalCol) {
          if (checkpointsHit.size === checkpoints.length) {
            return result(true, 'goal');
          }
          return result(false, 'missed-checkpoint');
        }
        return result(false, 'wreck');
      }

      // If pushed off the start shore (row=0), it's overboard.
      if (row === 0) {
        path.push({ col, row, kind: 'overboard' });
        return result(false, 'overboard');
      }

      // Mid-river checks
      if (row >= 1 && row <= level.rivers.length) {
        pickup(row, col);
        const midCell = cellAt(level, row, col);
        if (midCell === 'rock') return result(false, 'wreck');
        // Whirlpool also fires when the ship is pushed THROUGH it.
        if (isWhirlpool(midCell)) {
          const dest = teleportTarget(pairs, row - 1, col);
          if (dest) {
            col = dest.c;
            row = dest.r + 1;
            path.push({ col, row, kind: 'teleport' });
            pickup(row, col);
            teleported = true;
            break;
          }
        }
      }
    }
    if (teleported) continue;
  }

  if (col === level.goalCol && row === goalRow) {
    if (checkpointsHit.size < checkpoints.length) {
      return result(false, 'missed-checkpoint');
    }
    return result(true, 'goal');
  }
  return result(false, 'wreck');
}

// Find ALL starting columns that lead to the actual goal cell. Used to verify
// levels are solvable.
export function findSolutions(level) {
  const solutions = [];
  for (let c = 0; c < level.cols; c++) {
    if (simulate(level, c).success) solutions.push(c);
  }
  return solutions;
}

// Find every starting column whose ship path ends on the goal-row shore
// (not necessarily on goalCol). Used by the editor's auto-fix.
export function findReachableLandings(level) {
  const reachable = new Set();
  for (let c = 0; c < level.cols; c++) {
    const r = simulate(level, c);
    const last = r.path[r.path.length - 1];
    if (last.row === level.rivers.length + 1) {
      reachable.add(last.col);
    }
  }
  return [...reachable];
}

// Hint: which start columns successfully reach the goal? Used by the 💡 button.
export function findReachableStarts(level) {
  return findSolutions(level);
}
