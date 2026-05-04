import { LEVELS } from './levels.js';
import { simulate, findSolutions } from './game.js';
import {
  mountStage,
  drawGhostTrail,
  clearGhostTrail,
  highlightChosenStart,
  clearChosenStart,
  spawnConfetti,
} from './render.js';
import {
  getStars,
  recordResult,
  isUnlocked,
  getCustomLevels,
  deleteCustomLevel,
} from './storage.js';
import {
  createEditorState,
  renderEditor,
  adjustCols,
  adjustRivers,
  trySaveLevel,
  buildLevelFromState,
} from './editor.js';
import * as audio from './audio.js';

// ============== Verify all built-in levels are solvable ==============
LEVELS.forEach(lvl => {
  const sols = findSolutions(lvl);
  if (sols.length === 0) {
    console.error(`Level ${lvl.id} has no solution!`);
  } else {
    console.log(`Level ${lvl.id}: solutions at columns`, sols);
  }
});

// ============== Routing ==============
const screens = {
  menu: document.getElementById('screen-menu'),
  game: document.getElementById('screen-game'),
  editor: document.getElementById('screen-editor'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ============== Menu (levels list) ==============
function buildLevelsTab() {
  const grid = document.getElementById('levels-grid');
  grid.innerHTML = '';
  LEVELS.forEach((lvl, i) => {
    const card = document.createElement('div');
    const stars = getStars(lvl.id);
    const unlocked = isUnlocked(i, LEVELS);
    card.className = 'level-card' + (unlocked ? '' : ' locked');

    const num = document.createElement('div');
    num.className = 'level-card-num';
    num.textContent = lvl.name;

    const icon = document.createElement('div');
    icon.className = 'level-card-icon';
    icon.textContent = unlocked ? '⛵' : '🔒';

    const starsEl = document.createElement('div');
    starsEl.className = 'level-card-stars';
    starsEl.textContent = stars > 0 ? '⭐'.repeat(stars) : '';

    card.appendChild(num);
    card.appendChild(icon);
    card.appendChild(starsEl);

    if (unlocked) {
      card.addEventListener('pointerdown', () => {
        audio.unlockAudio();
        audio.playClick();
        startLevel(lvl);
      });
    }

    grid.appendChild(card);
  });
}

function buildCustomTab() {
  const grid = document.getElementById('custom-grid');
  const empty = document.getElementById('custom-empty');
  const list = getCustomLevels();
  grid.innerHTML = '';
  if (list.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.forEach((lvl, i) => {
    const card = document.createElement('div');
    card.className = 'level-card';

    const num = document.createElement('div');
    num.className = 'level-card-num';
    num.textContent = '#' + (i + 1);

    const icon = document.createElement('div');
    icon.className = 'level-card-icon';
    icon.textContent = '🗺️';

    const meta = document.createElement('div');
    meta.className = 'level-card-stars';
    meta.textContent = `${lvl.cols}×${lvl.rivers.length}`;

    card.appendChild(num);
    card.appendChild(icon);
    card.appendChild(meta);

    let pressTimer = null;
    let longPressed = false;
    card.addEventListener('pointerdown', () => {
      audio.unlockAudio();
      longPressed = false;
      pressTimer = setTimeout(() => {
        longPressed = true;
        if (confirm('Ștergi această hartă?')) {
          deleteCustomLevel(lvl.id);
          buildCustomTab();
        }
      }, 1200);
    });
    card.addEventListener('pointerup', () => {
      clearTimeout(pressTimer);
      if (!longPressed) {
        audio.playClick();
        startLevel(lvl);
      }
    });
    card.addEventListener('pointerleave', () => clearTimeout(pressTimer));

    grid.appendChild(card);
  });
}

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('pointerdown', () => {
    audio.unlockAudio();
    audio.playClick();
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'custom') buildCustomTab();
    if (tab === 'levels') buildLevelsTab();
  });
});

// Editor entry
document.getElementById('btn-new-level').addEventListener('pointerdown', () => {
  audio.unlockAudio();
  audio.playClick();
  openEditor();
});

// ============== Game flow ==============
let currentLevel = null;
let currentLevelIndex = -1;
let currentHandle = null;
let chosenStart = null;
let attempts = 0;
let isAnimating = false;

function startLevel(level) {
  currentLevel = level;
  currentLevelIndex = LEVELS.findIndex(l => l.id === level.id);
  attempts = 0;
  chosenStart = null;
  document.getElementById('game-title').textContent =
    level.custom ? 'Hartă custom' : 'Aventura ' + level.name;
  document.getElementById('overlay-result').classList.add('hidden');
  showScreen('game');
  // Wait one frame for layout to settle
  requestAnimationFrame(() => mountGame());
}

function mountGame() {
  const stage = document.getElementById('game-stage');
  currentHandle = mountStage(stage, currentLevel);
  isAnimating = false;

  // Clicking a start cell picks the column
  currentHandle.grid.addEventListener('pointerdown', (e) => {
    if (isAnimating) return;
    const cell = e.target.closest('.cell.shore.start-pick');
    if (!cell) return;
    audio.playClick();
    chosenStart = Number(cell.dataset.col);
    highlightChosenStart(currentHandle.grid, chosenStart);
    clearGhostTrail(currentHandle.grid);
    currentHandle.setShipPos(chosenStart, 0, false);
    currentHandle.showShip();
  });
}

document.getElementById('btn-back-from-game').addEventListener('pointerdown', () => {
  audio.playClick();
  showScreen('menu');
  buildLevelsTab();
  buildCustomTab();
});

document.getElementById('btn-retry').addEventListener('pointerdown', () => {
  if (isAnimating) return;
  audio.playClick();
  resetRun();
});

function resetRun() {
  document.getElementById('overlay-result').classList.add('hidden');
  if (!currentHandle) return;
  clearGhostTrail(currentHandle.grid);
  clearChosenStart(currentHandle.grid);
  currentHandle.hideShip();
  chosenStart = null;
}

document.getElementById('btn-launch').addEventListener('pointerdown', async () => {
  if (isAnimating) return;
  if (chosenStart == null) {
    audio.playClick();
    return;
  }
  audio.playClick();
  attempts++;
  isAnimating = true;
  const result = simulate(currentLevel, chosenStart);
  await animatePath(result.path);
  isAnimating = false;
  showResult(result);
});

async function animatePath(path) {
  if (!currentHandle) return;
  // Start at frame 0
  const first = path[0];
  currentHandle.setShipPos(first.col, first.row, false);
  currentHandle.showShip();

  for (let i = 1; i < path.length; i++) {
    const f = path[i];
    if (f.kind === 'pushed') {
      audio.playWind();
    } else if (f.kind === 'land' || f.kind === 'goal') {
      audio.playStep();
    } else if (f.kind === 'overboard' || f.kind === 'wreck') {
      audio.playSplash();
    }
    currentHandle.setShipPos(f.col, f.row, true);
    await wait(f.kind === 'pushed' ? 260 : 320);
  }
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function showResult(result) {
  const overlay = document.getElementById('overlay-result');
  const emoji = document.getElementById('result-emoji');
  const title = document.getElementById('result-title');
  const starsEl = document.getElementById('result-stars');
  const nextBtn = document.getElementById('btn-result-next');

  if (result.success) {
    const stars = recordResult(currentLevel.id, attempts);
    emoji.textContent = '🎉';
    title.textContent = 'BRAVO!';
    starsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    audio.playVictory();
    spawnConfetti(document.getElementById('screen-game'), 50);

    const nextLvl = LEVELS[currentLevelIndex + 1];
    nextBtn.style.display = nextLvl ? '' : 'none';
  } else {
    emoji.textContent = result.reason === 'wreck' ? '🪨' : '🌊';
    title.textContent = result.reason === 'wreck' ? 'BUF!' : 'PLOUF!';
    starsEl.textContent = '';
    drawGhostTrail(currentHandle, result.path);
    nextBtn.style.display = 'none';
  }
  overlay.classList.remove('hidden');
}

document.getElementById('btn-result-retry').addEventListener('pointerdown', () => {
  audio.playClick();
  resetRun();
});

document.getElementById('btn-result-next').addEventListener('pointerdown', () => {
  audio.playClick();
  const nextLvl = LEVELS[currentLevelIndex + 1];
  if (nextLvl) startLevel(nextLvl);
});

// ============== Editor flow ==============
let editorState = null;
let editorHandle = null;

function openEditor() {
  editorState = createEditorState();
  showScreen('editor');
  requestAnimationFrame(() => renderEditorView());
}

function renderEditorView() {
  const stage = document.getElementById('editor-stage');
  document.getElementById('ctrl-cols').textContent = editorState.cols;
  document.getElementById('ctrl-rivers').textContent = editorState.rivers.length;
  editorHandle = renderEditor(stage, editorState, () => renderEditorView());
}

document.getElementById('btn-back-from-editor').addEventListener('pointerdown', () => {
  audio.playClick();
  showScreen('menu');
  buildCustomTab();
});

document.querySelectorAll('[data-ctrl]').forEach(btn => {
  btn.addEventListener('pointerdown', () => {
    audio.playClick();
    const ctrl = btn.dataset.ctrl;
    if (ctrl === 'cols-plus') adjustCols(editorState, +1);
    else if (ctrl === 'cols-minus') adjustCols(editorState, -1);
    else if (ctrl === 'rivers-plus') adjustRivers(editorState, +1);
    else if (ctrl === 'rivers-minus') adjustRivers(editorState, -1);
    renderEditorView();
  });
});

document.getElementById('btn-test-editor').addEventListener('pointerdown', () => {
  audio.playClick();
  const testLevel = buildLevelFromState(editorState);
  testLevel.id = 'editor-preview';
  testLevel.name = 'Test';
  testLevel.custom = true;
  startLevel(testLevel);
});

document.getElementById('btn-editor-save').addEventListener('pointerdown', () => {
  audio.playClick();
  const result = trySaveLevel(editorState);
  if (!result.ok) {
    alert('🤔 Harta asta nu are nicio soluție! Modifică curenții.');
    return;
  }
  alert('💾 Salvat! Găsești harta în "Hărțile mele".');
  showScreen('menu');
  switchTab('custom');
});

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'custom') buildCustomTab();
  if (tab === 'levels') buildLevelsTab();
}

// ============== Init ==============
buildLevelsTab();
buildCustomTab();

// Resize handling — re-mount stages on orientation change
window.addEventListener('resize', () => {
  if (screens.game.classList.contains('active') && currentLevel) {
    mountGame();
    if (chosenStart != null) {
      highlightChosenStart(currentHandle.grid, chosenStart);
      currentHandle.setShipPos(chosenStart, 0, false);
      currentHandle.showShip();
    }
  } else if (screens.editor.classList.contains('active') && editorState) {
    renderEditorView();
  }
});
