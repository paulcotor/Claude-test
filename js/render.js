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
};

function cellClass(code) {
  if (code === 'rock') return 'cell river rock';
  if (code === '>>>' || code === '<<<') return 'cell river very-strong';
  if (code === '>>' || code === '<<') return 'cell river strong';
  return 'cell river';
}

function arrowEl(code) {
  if (code === 'rock' || code === '=') return null;
  const glyph = ARROW_GLYPHS[code];
  if (!glyph) return null;
  const span = document.createElement('span');
  span.className = 'arrow';
  span.textContent = glyph;
  return span;
}

// Compute cell size that fits the stage
function computeCellSize(stage, cols, rows) {
  const rect = stage.getBoundingClientRect();
  // Reserve some breathing room (16px on each side)
  const availW = rect.width - 32;
  const availH = rect.height - 32;
  const byW = Math.floor((availW - (cols - 1) * GAP) / cols);
  const byH = Math.floor((availH - (rows - 1) * GAP) / rows);
  return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.min(byW, byH)));
}

export function mountStage(stage, level, opts = {}) {
  stage.innerHTML = '';

  const cols = level.cols;
  const numRivers = level.rivers.length;
  const rows = numRivers + 2; // start shore + rivers + goal shore

  const cellSize = computeCellSize(stage, cols, rows);

  const wrap = document.createElement('div');
  wrap.className = 'grid-wrap';
  wrap.style.setProperty('--cell-size', cellSize + 'px');

  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
  grid.style.position = 'relative';

  // Build cells row-by-row
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');

      if (r === 0) {
        // Start shore — pickable
        cell.className = 'cell shore start-pick';
        cell.dataset.role = 'start';
        cell.dataset.col = c;
      } else if (r === rows - 1) {
        // Goal shore — only goalCol is the safe landing; everything else shows a rock
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
        if (code !== 'rock' && code !== '=') {
          const a = arrowEl(code);
          if (a) cell.appendChild(a);
        }
      }

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
        // Force reflow so the browser applies "no transition" before the new transform.
        // Without this, iOS Safari may skip the next animated move.
        void ship.offsetHeight;
      }
      const x = col * (cellSize + GAP);
      const y = row * (cellSize + GAP);
      ship.style.transform = `translate(${x}px, ${y}px)`;
    },
    showShip() { ship.style.opacity = '1'; },
    hideShip() { ship.style.opacity = '0'; },
  };
}

export function clearGhostTrail(grid) {
  grid.querySelectorAll('.ghost-dot').forEach(el => el.remove());
}

export function drawGhostTrail(handle, path) {
  const { grid, cellSize } = handle;
  clearGhostTrail(grid);
  for (const frame of path) {
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
