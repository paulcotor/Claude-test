// Cell codes:
//   '>'  '<'  '='        basic horizontal currents (push 1 / 0)
//   '>>' '<<'             strong horizontal (push 2)
//   '>>>' '<<<'           very strong horizontal (push 3)
//   '↗' '↖'              diagonal forward (push +1 col, +1 extra row up)
//   '↘' '↙'              diagonal backward (push +1 col, -1 row — pulls back)
//   '⬆'                  pushes ship 1 extra row forward (skips a river)
//   '⬇'                  pulls ship 1 row back (toward start shore)
//   'rock'                blocked cell (landing here = wreck)
//   'whirl-A' .. 'whirl-D' paired teleporters; same letter = same pair
//
// Each level may also carry:
//   coins:       [{row, col}, ...]   collectible (row 1..N indexes river rows)
//   checkpoints: [{row, col}, ...]   must-visit cells (any order) before goal
//
// rivers[0] is the river closest to the start shore (row 1).
// rivers[N-1] is closest to the goal shore (row N).
// Each river's `cells` array length must equal `cols`.

function fill(n, code) {
  return Array.from({ length: n }, () => code);
}

function withRocks(n, code, rockCols) {
  const arr = fill(n, code);
  for (const c of rockCols) arr[c] = 'rock';
  return arr;
}

export const LEVELS = [
  // 1 — intro: vânt simplu spre dreapta
  {
    id: 'lvl-01',
    name: '1',
    cols: 5,
    rivers: [
      { cells: fill(5, '>') },
      { cells: fill(5, '>') },
    ],
    goalCol: 4,
  },

  // 2 — intro vânt în direcție opusă
  {
    id: 'lvl-02',
    name: '2',
    cols: 5,
    rivers: [
      { cells: fill(5, '>') },
      { cells: fill(5, '<') },
      { cells: fill(5, '>') },
    ],
    goalCol: 2,
  },

  // 3 — intro „=" (fără vânt)
  {
    id: 'lvl-03',
    name: '3',
    cols: 5,
    rivers: [
      { cells: fill(5, '>') },
      { cells: fill(5, '=') },
      { cells: fill(5, '<') },
    ],
    goalCol: 1,
  },

  // 4 — patru râuri amestecate
  {
    id: 'lvl-04',
    name: '4',
    cols: 6,
    rivers: [
      { cells: fill(6, '>') },
      { cells: fill(6, '<') },
      { cells: fill(6, '<') },
      { cells: fill(6, '>') },
    ],
    goalCol: 2,
  },

  // 5 — intro vânt puternic >>
  {
    id: 'lvl-05',
    name: '5',
    cols: 7,
    rivers: [
      { cells: fill(7, '>>') },
      { cells: fill(7, '<') },
      { cells: fill(7, '>') },
      { cells: fill(7, '<') },
    ],
    goalCol: 2,
  },

  // 6 — combinații simplu + puternic
  {
    id: 'lvl-06',
    name: '6',
    cols: 7,
    rivers: [
      { cells: fill(7, '>>') },
      { cells: fill(7, '<') },
      { cells: fill(7, '>') },
      { cells: fill(7, '<<') },
      { cells: fill(7, '>') },
    ],
    goalCol: 1,
  },

  // 7 — intro pietre (rock)
  {
    id: 'lvl-07',
    name: '7',
    cols: 7,
    rivers: [
      { cells: fill(7, '>') },
      { cells: fill(7, '=') },
      { cells: withRocks(7, '=', [2, 3]) },
      { cells: fill(7, '<') },
      { cells: fill(7, '=') },
    ],
    goalCol: 0,
  },

  // 8 — pietre care forțează rute laterale
  {
    id: 'lvl-08',
    name: '8',
    cols: 6,
    rivers: [
      { cells: fill(6, '>>') },
      { cells: fill(6, '<') },
      { cells: withRocks(6, '=', [1, 4]) },
      { cells: fill(6, '>') },
      { cells: fill(6, '<') },
    ],
    goalCol: 2,
  },

  // 9 — intro vânt foarte puternic >>>
  {
    id: 'lvl-09',
    name: '9',
    cols: 8,
    rivers: [
      { cells: fill(8, '>>>') },
      { cells: fill(8, '<') },
      { cells: fill(8, '<<') },
      { cells: fill(8, '>') },
      { cells: fill(8, '<') },
    ],
    goalCol: 1,
  },

  // 10 — mai multe puternice combinate
  {
    id: 'lvl-10',
    name: '10',
    cols: 8,
    rivers: [
      { cells: fill(8, '>>') },
      { cells: fill(8, '<') },
      { cells: fill(8, '>') },
      { cells: fill(8, '<<') },
      { cells: fill(8, '>>>') },
      { cells: fill(8, '<') },
    ],
    goalCol: 5,
  },

  // 11 — mecanici amestecate cu pietre
  {
    id: 'lvl-11',
    name: '11',
    cols: 8,
    rivers: [
      { cells: fill(8, '>') },
      { cells: fill(8, '<<') },
      { cells: withRocks(8, '=', [2, 6]) },
      { cells: fill(8, '>>') },
      { cells: fill(8, '<') },
      { cells: fill(8, '=') },
    ],
    goalCol: 4,
  },

  // 12 — provocarea finală
  {
    id: 'lvl-12',
    name: '12',
    cols: 8,
    rivers: [
      { cells: fill(8, '>>') },
      { cells: fill(8, '<') },
      { cells: fill(8, '>>>') },
      { cells: withRocks(8, '<', [3]) },
      { cells: fill(8, '>') },
      { cells: fill(8, '<<') },
      { cells: fill(8, '<') },
    ],
    goalCol: 2,
  },
];

// dx = horizontal push, dy = EXTRA vertical push beyond the natural +1 row step.
// `dy: -1` (↗ ↖ ⬆) cancels the forward step — the ship hovers / drifts back.
// `dy: +1` (↘ ↙ ⬇) adds an extra forward step — the ship skips one river.
// Glyph orientation matches user expectation: ↗ visually points up-right,
// where "up" on screen = toward the start shore = backward in row terms.
export const PUSH_DELTA = {
  '>':   { dx: +1, dy: 0 },
  '<':   { dx: -1, dy: 0 },
  '=':   { dx: 0,  dy: 0 },
  '>>':  { dx: +2, dy: 0 },
  '<<':  { dx: -2, dy: 0 },
  '>>>': { dx: +3, dy: 0 },
  '<<<': { dx: -3, dy: 0 },
  '↗':   { dx: +1, dy: -1 },
  '↖':   { dx: -1, dy: -1 },
  '⬆':   { dx: 0,  dy: -1 },
  '↘':   { dx: +1, dy: +1 },
  '↙':   { dx: -1, dy: +1 },
  '⬇':   { dx: 0,  dy: +1 },
};

export function isWhirlpool(code) {
  return typeof code === 'string' && code.startsWith('whirl-');
}
