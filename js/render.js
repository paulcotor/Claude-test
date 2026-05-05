import { isWhirlpool } from './levels.js';

const GAP = 2;
const MIN_CELL = 40;
const MAX_CELL = 84;

const ARROW_GLYPHS = {
  '>':   '▶',
  '<':   '◀',
  '>>':  '▶▶',
  '<<':  '◀◀',
  '>>>': '▶▶▶',
  '<<<': '◀◀◀',
  '=':   '',
  '↗':   '↗',
  '↖':   '↖',
  '↘':   '↘',
  '↙':   '↙',
  '⬆':   '⬆',
  '⬇':   '⬇',
};

const WHIRL_COLORS = {
  'whirl-A': '#ff5252',
  'whirl-B': '#42a5f5',
  'whirl-C': '#66bb6a',
  'whirl-D': '#ab47bc',
};

function cellClass(code) {
  if (code === 'rock') return 'cell river rock';
  if (isWhirlpool(code)) return `cell river whirl ${code}`;
  if (code === '>>>' || code === '<<<') return 'cell river very-strong';
  if (code === '>>' || code === '<<') return 'cell river strong';
  if (code === '↗' || code === '↖' || code === '↘' || code === '↙' ||
      code === '⬆' || code === '⬇') return 'cell river diag';
  return 'cell river';
}

function arrowEl(code) {
  if (code === 'rock' || code === '=' || isWhirlpool(code)) return null;
  const glyph = ARROW_GLYPHS[code];
  if (!glyph) return null;
  const span = document.createElement('span');
  span.className = 'arrow';
  span.textContent = glyph;
  return span;
}

function decoratorEl(text, className) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function computeCellSize(stage, cols, rows) {
  const rect = stage.getBoundingClientRect();
  const availW = rect.width - 32;
  const availH = rect.height - 32;
  const byW = Math.floor((availW - (cols - 1) * GAP) / cols);
  const byH = Math.floor((availH - (rows - 1) * GAP) / rows);
  return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.min(byW, byH)));
}

function hasCoinAt(level, row, col) {
  return (level.coins || []).some(p => p.row === row && p.col === col);
}

function hasCheckpointAt(level, row, col) {
  return (level.checkpoints || []).some(p => p.row === row && p.col === col);
}

export function mountStage(stage, level, opts = {}) {
  stage.innerHTML = '';

  const cols = level.cols;
  const numRivers = level.rivers.length;
  const rows = numRivers + 2;

  const cellSize = computeCellSize(stage, cols, rows);

  const wrap = document.createElement('div');
  wrap.className = 'grid-wrap';
  wrap.style.setProperty('--cell-size', cellSize + 'px');

  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
  grid.style.position = 'relative';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');

      if (r === 0) {
        cell.className = 'cell shore start-pick';
        cell.dataset.role = 'start';
        cell.dataset.col = c;
      } else if (r === rows - 1) {
        if (c === level.goalCol) {
          cell.className = 'cell shore goal';
          cell.dataset.role = 'goal';
        } else {
          cell.className = 'cell shore goal-blocked';
          cell.dataset.role = 'goal-blocked';
        }
        cell.dataset.col = c;
      } else {
        const riverIdx = r - 1;
        const code = level.rivers[riverIdx].cells[c];
        cell.className = cellClass(code);
        cell.dataset.role = 'river';
        cell.dataset.col = c;
        cell.dataset.river = riverIdx;
        cell.dataset.code = code;
        if (opts.editable) cell.classList.add('editable');
        const a = arrowEl(code);
        if (a) cell.appendChild(a);
        if (isWhirlpool(code)) {
          const w = decoratorEl('🌀', 'whirl-glyph');
          w.style.color = WHIRL_COLORS[code] || '#fff';
          cell.appendChild(w);
        }
      }

      // Decorate row index for shore + river: row 0=start, 1..N=rivers, N+1=goal
      const logicalRow = r;

      // Coin overlay
      if (hasCoinAt(level, logicalRow, c)) {
        cell.appendChild(decoratorEl('💰', 'coin-glyph'));
        cell.dataset.coin = '1';
      }
      // Checkpoint overlay
      if (hasCheckpointAt(level, logicalRow, c)) {
        cell.appendChild(decoratorEl('⭐', 'checkpoint-glyph'));
        cell.dataset.checkpoint = '1';
      }

      cell.dataset.row = logicalRow;
      grid.appendChild(cell);
    }
  }

  // Ship element
  const ship = document.createElement('div');
  ship.className = 'ship no-transition';
  ship.textContent = '⛵';
  ship.style.position = 'absolute';
  ship.style.left = '0';
  ship.style.top = '0';
  ship.style.transform = `translate(0px, 0px)`;
  ship.style.opacity = '0';
  grid.appendChild(ship);

  wrap.appendChild(grid);
  stage.appendChild(wrap);

  return {
    wrap,
    grid,
    ship,
    cellSize,
    cols,
    rows,
    setShipPos(col, row, animate = true) {
      if (animate) {
        ship.classList.remove('no-transition');
      } else {
        ship.classList.add('no-transition');
        void ship.offsetHeight;
      }
      const x = col * (cellSize + GAP);
      const y = row * (cellSize + GAP);
      ship.style.transform = `translate(${x}px, ${y}px)`;
    },
    showShip() { ship.style.opacity = '1'; },
    hideShip() { ship.style.opacity = '0'; },
    cellAt(row, col) {
      return grid.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    },
  };
}

export function clearGhostTrail(grid) {
  grid.querySelectorAll('.ghost-dot').forEach(el => el.remove());
}

export function drawGhostTrail(handle, path) {
  const { grid, cellSize } = handle;
  clearGhostTrail(grid);
  for (const frame of path) {
    if (frame.kind === 'coin' || frame.kind === 'checkpoint') continue;
    const dot = document.createElement('div');
    dot.className = 'ghost-dot';
    const x = frame.col * (cellSize + GAP) + cellSize / 2;
    const y = frame.row * (cellSize + GAP) + cellSize / 2;
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    grid.appendChild(dot);
  }
}

export function highlightChosenStart(grid, col) {
  grid.querySelectorAll('.cell.shore.start-pick').forEach(el => {
    el.classList.toggle('chosen', Number(el.dataset.col) === col);
  });
}

export function clearChosenStart(grid) {
  grid.querySelectorAll('.cell.shore.start-pick.chosen').forEach(el => {
    el.classList.remove('chosen');
  });
}

export function highlightHintStarts(grid, cols) {
  grid.querySelectorAll('.cell.shore.start-pick').forEach(el => {
    el.classList.toggle('hint', cols.includes(Number(el.dataset.col)));
  });
}

export function clearHintStarts(grid) {
  grid.querySelectorAll('.cell.shore.start-pick.hint').forEach(el => {
    el.classList.remove('hint');
  });
}

export function spawnConfetti(container, count = 40) {
  const colors = ['#ff5252', '#ffd54f', '#4caf50', '#42a5f5', '#ab47bc', '#ff9800'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = '-20px';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = Math.random() * 0.4 + 's';
    piece.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}
