// Cell codes:
//   '>'   '<'   '='     basic currents (push 1 / 0)
//   '>>'  '<<'          strong currents (push 2)
//   '>>>' '<<<'         very strong (push 3)
//   'rock'              blocked cell (landing here = wreck)
//
// rivers[0] is the river closest to the start shore.
// rivers[N-1] is closest to the goal shore.
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

export const PUSH_DELTA = {
  '>': 1,
  '>>': 2,
  '>>>': 3,
  '<': -1,
  '<<': -2,
  '<<<': -3,
  '=': 0,
};
