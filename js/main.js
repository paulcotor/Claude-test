import { LEVELS } from './levels.js';
import { simulate, findSolutions, findReachableStarts } from './game.js';
import { generateLevel } from './generator.js';
import {
  mountStage,
  drawGhostTrail,
  clearGhostTrail,
  highlightChosenStart,
  clearChosenStart,
  highlightHintStarts,
  clearHintStarts,
  spawnConfetti,
} from './render.js';
import {
  getStars,
  recordResult,
  isUnlocked,
  getCustomLevels,
  deleteCustomLevel,
  getMarathon,
  setMarathonCurrent,
  resetMarathon,
  getFailCount,
  bumpFailCount,
  resetFailCount,
} from './storage.js';
import {
  createEditorState,
  loadEditorState,
  renderEditor,
  adjustCols,
  adjustRivers,
  trySaveLevel,
  buildLevelFromState,
  autoFix,
  setSelectedTool,
} from './editor.js';
import * as audio from './audio.js';

// ============== Append generated levels 13-30 to the hand-designed 1-12 ==============
// Use a deterministic seed offset (1000) so generated levels don't collide with
// what the marathon mode produces from level 1 onwards.
for (let n = 13; n <= 30; n++) {
  const lvl = generateLevel(1000 + n);
  lvl.id = `lvl-${String(n).padStart(2, '0')}`;
  lvl.name = String(n);
  LEVELS.push(lvl);
}

// ============== Verify all built-in levels are solvable ==============
LEVELS.forEach(lvl => {
  const sols = findSolutions(lvl);
  if (sols.length === 0) {
    console.error(`Level ${lvl.id} has no solution!`);
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
      card.addEventListener('click', () => {
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
        showCustomOptions(lvl);
      }, 700);
    });
    card.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    card.addEventListener('pointercancel', () => clearTimeout(pressTimer));
    card.addEventListener('click', () => {
      clearTimeout(pressTimer);
      if (!longPressed) {
        audio.playClick();
        startSavedCustom(lvl);
      }
    });

    grid.appendChild(card);
  });
}

// ============== Custom map options modal ==============
let customOptionsTarget = null;

function showCustomOptions(lvl) {
  customOptionsTarget = lvl;
  document.getElementById('overlay-custom-options').classList.remove('hidden');
}

function hideCustomOptions() {
  customOptionsTarget = null;
  document.getElementById('overlay-custom-options').classList.add('hidden');
}

document.getElementById('btn-custom-play').addEventListener('click', () => {
  audio.playClick();
  const lvl = customOptionsTarget;
  hideCustomOptions();
  if (lvl) startSavedCustom(lvl);
});

document.getElementById('btn-custom-edit').addEventListener('click', () => {
  audio.playClick();
  const lvl = customOptionsTarget;
  hideCustomOptions();
  if (lvl) openEditorWith(lvl);
});

document.getElementById('btn-custom-delete').addEventListener('click', () => {
  audio.playClick();
  const lvl = customOptionsTarget;
  if (lvl && confirm('Sigur ștergi harta?')) {
    deleteCustomLevel(lvl.id);
    buildCustomTab();
  }
  hideCustomOptions();
});

document.getElementById('btn-custom-cancel').addEventListener('click', () => {
  audio.playClick();
  hideCustomOptions();
});

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    audio.unlockAudio();
    audio.playClick();
    switchTab(btn.dataset.tab);
  });
});

// Editor entry
document.getElementById('btn-new-level').addEventListener('click', () => {
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
// 'levels' | 'savedCustom' | 'editorPreview' | 'marathon'
let currentMode = 'levels';

function startLevel(level, mode = 'levels') {
  currentLevel = level;
  currentLevelIndex = LEVELS.findIndex(l => l.id === level.id);
  currentMode = mode;
  attempts = 0;
  chosenStart = null;
  let title;
  if (mode === 'savedCustom') title = '🗺️ ' + (level.name || 'Hartă custom');
  else if (mode === 'editorPreview') title = '🧪 Test';
  else title = 'Aventura ' + level.name;
  document.getElementById('game-title').textContent = title;
  document.getElementById('overlay-result').classList.add('hidden');
  refreshHintButton();
  showScreen('game');
  requestAnimationFrame(() => mountGame());
}

function refreshHintButton() {
  const btn = document.getElementById('btn-hint');
  if (!btn || !currentLevel) return;
  const fails = getFailCount(currentLevel.id);
  if (fails >= 2 && currentMode !== 'editorPreview') {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

function startSavedCustom(level) {
  startLevel(level, 'savedCustom');
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

document.getElementById('btn-back-from-game').addEventListener('click', () => {
  audio.playClick();
  if (currentMode === 'editorPreview') {
    showScreen('editor');
    requestAnimationFrame(() => renderEditorView());
    return;
  }
  marathonRunning = false;
  showScreen('menu');
  buildLevelsTab();
  buildCustomTab();
  refreshMarathonTab();
});

document.getElementById('btn-retry').addEventListener('click', () => {
  if (isAnimating) return;
  audio.playClick();
  resetRun();
});

function resetRun() {
  document.getElementById('overlay-result').classList.add('hidden');
  if (!currentHandle) return;
  clearGhostTrail(currentHandle.grid);
  clearChosenStart(currentHandle.grid);
  clearHintStarts(currentHandle.grid);
  currentHandle.hideShip();
  chosenStart = null;
}

document.getElementById('btn-hint').addEventListener('click', () => {
  if (!currentLevel || !currentHandle) return;
  audio.playClick();
  const cols = findReachableStarts(currentLevel);
  highlightHintStarts(currentHandle.grid, cols);
});

document.getElementById('btn-launch').addEventListener('click', async () => {
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
  const first = path[0];
  currentHandle.setShipPos(first.col, first.row, false);
  currentHandle.showShip();

  for (let i = 1; i < path.length; i++) {
    const f = path[i];

    // Coin and checkpoint events trigger an effect on the underlying cell,
    // not a ship move.
    if (f.kind === 'coin') {
      const cellEl = currentHandle.cellAt(f.row, f.col);
      const coinEl = cellEl?.querySelector('.coin-glyph');
      if (coinEl) {
        coinEl.classList.add('collected');
        setTimeout(() => coinEl.remove(), 400);
      }
      audio.playStep();
      continue;
    }
    if (f.kind === 'checkpoint') {
      const cellEl = currentHandle.cellAt(f.row, f.col);
      const cpEl = cellEl?.querySelector('.checkpoint-glyph');
      if (cpEl) {
        cpEl.textContent = '✅';
        cpEl.classList.add('hit');
      }
      audio.playStep();
      continue;
    }
    if (f.kind === 'teleport') {
      audio.playWind();
      currentHandle.ship.classList.add('teleporting');
      currentHandle.setShipPos(f.col, f.row, false);
      await wait(220);
      currentHandle.ship.classList.remove('teleporting');
      continue;
    }

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
  const retryBtn = document.getElementById('btn-result-retry');
  const nextBtn = document.getElementById('btn-result-next');
  const closeBtn = document.getElementById('btn-result-close');

  // Default: hide all action buttons; we re-enable only the ones we need.
  retryBtn.style.display = 'none';
  nextBtn.style.display = 'none';
  closeBtn.style.display = 'none';

  if (result.success) {
    let stars;
    const coinsGot = result.coinsCollected?.size ?? 0;
    const coinsTotal = result.totalCoins ?? 0;
    if (currentMode === 'marathon') {
      setMarathonCurrent(marathonLevelNum + 1);
      stars = coinsTotal > 0 && coinsGot >= coinsTotal ? 3 : (attempts <= 1 ? 3 : 2);
    } else if (currentMode === 'levels') {
      stars = recordResult(currentLevel.id, attempts, coinsGot, coinsTotal);
    } else {
      stars = 3;
    }
    resetFailCount(currentLevel.id);
    emoji.textContent = '🎉';
    title.textContent = 'BRAVO!';
    let starsLine = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    if (coinsTotal > 0) starsLine += `  💰${coinsGot}/${coinsTotal}`;
    starsEl.textContent = starsLine;
    audio.playVictory();
    spawnConfetti(document.getElementById('screen-game'), 50);

    if (currentMode === 'marathon') {
      nextBtn.style.display = '';
    } else if (currentMode === 'levels') {
      retryBtn.style.display = '';
      const nextLvl = LEVELS[currentLevelIndex + 1];
      if (nextLvl) nextBtn.style.display = '';
    } else {
      // savedCustom / editorPreview: retry + close
      retryBtn.style.display = '';
      closeBtn.style.display = '';
    }
  } else {
    if (result.reason === 'wreck') { emoji.textContent = '🪨'; title.textContent = 'BUF!'; }
    else if (result.reason === 'lost') { emoji.textContent = '🌀'; title.textContent = 'PIERDUT!'; }
    else if (result.reason === 'missed-checkpoint') { emoji.textContent = '⭐'; title.textContent = 'STELE!'; }
    else { emoji.textContent = '🌊'; title.textContent = 'PLOUF!'; }
    starsEl.textContent = '';
    drawGhostTrail(currentHandle, result.path);
    retryBtn.style.display = '';
    if (currentMode === 'savedCustom' || currentMode === 'editorPreview') {
      closeBtn.style.display = '';
    }
    if (currentMode !== 'editorPreview') {
      bumpFailCount(currentLevel.id);
      refreshHintButton();
    }
  }
  overlay.classList.remove('hidden');
}

document.getElementById('btn-result-retry').addEventListener('click', () => {
  audio.playClick();
  resetRun();
});

document.getElementById('btn-result-next').addEventListener('click', () => {
  audio.playClick();
  if (currentMode === 'marathon') {
    onMarathonResultNext();
    return;
  }
  const nextLvl = LEVELS[currentLevelIndex + 1];
  if (nextLvl) startLevel(nextLvl, 'levels');
});

document.getElementById('btn-result-close').addEventListener('click', () => {
  audio.playClick();
  document.getElementById('overlay-result').classList.add('hidden');
  if (currentMode === 'editorPreview') {
    showScreen('editor');
    requestAnimationFrame(() => renderEditorView());
  } else if (currentMode === 'savedCustom') {
    showScreen('menu');
    switchTab('custom');
  }
});

// ============== Editor flow ==============
let editorState = null;
let editorHandle = null;

function openEditor() {
  editorState = createEditorState();
  showScreen('editor');
  requestAnimationFrame(() => renderEditorView());
}

function openEditorWith(level) {
  editorState = loadEditorState(level);
  showScreen('editor');
  requestAnimationFrame(() => renderEditorView());
}

function renderEditorView() {
  const stage = document.getElementById('editor-stage');
  document.getElementById('ctrl-cols').textContent = editorState.cols;
  document.getElementById('ctrl-rivers').textContent = editorState.rivers.length;
  editorHandle = renderEditor(stage, editorState, () => renderEditorView());
  // Reflect the selected tool in the toolbar
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.tool === editorState.selectedTool);
  });
}

// Wire up toolbar buttons
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    audio.playClick();
    if (!editorState) return;
    setSelectedTool(editorState, btn.dataset.tool);
    document.querySelectorAll('.tool-btn').forEach(b => {
      b.classList.toggle('selected', b === btn);
    });
  });
});

document.getElementById('btn-back-from-editor').addEventListener('click', () => {
  audio.playClick();
  showScreen('menu');
  buildCustomTab();
});

document.querySelectorAll('[data-ctrl]').forEach(btn => {
  btn.addEventListener('click', () => {
    audio.playClick();
    const ctrl = btn.dataset.ctrl;
    if (ctrl === 'cols-plus') adjustCols(editorState, +1);
    else if (ctrl === 'cols-minus') adjustCols(editorState, -1);
    else if (ctrl === 'rivers-plus') adjustRivers(editorState, +1);
    else if (ctrl === 'rivers-minus') adjustRivers(editorState, -1);
    renderEditorView();
  });
});

document.getElementById('btn-test-editor').addEventListener('click', () => {
  audio.playClick();
  const testLevel = buildLevelFromState(editorState);
  testLevel.id = 'editor-preview';
  testLevel.name = 'Test';
  testLevel.custom = true;
  startLevel(testLevel, 'editorPreview');
});

document.getElementById('btn-editor-save').addEventListener('click', () => {
  audio.playClick();
  const result = trySaveLevel(editorState);
  if (!result.ok) {
    if (result.reason === 'whirlpool-orphan') {
      alert('🌀 Fiecare 🌀 trebuie pus în PERECHE! Pune al doilea capăt sau șterge-l pe primul.');
    } else {
      alert('🤔 Harta asta nu are nicio soluție! Apasă 🔧 REPARĂ ca să mut insula într-un loc bun.');
    }
    return;
  }
  alert('💾 Salvat! Găsești harta în "Hărțile mele".');
  showScreen('menu');
  switchTab('custom');
});

document.getElementById('btn-editor-fix').addEventListener('click', () => {
  audio.playClick();
  const result = autoFix(editorState);
  if (result.reason === 'already-solvable') {
    alert('✅ Harta e deja bună! Are cel puțin o soluție.');
    return;
  }
  if (result.reason === 'no-paths') {
    alert('😬 Toate căile se izbesc de pietre. Scoate niște pietre, apoi încearcă din nou.');
    return;
  }
  alert(`🔧 Am mutat insula 🏝️ pe coloana ${result.newGoal + 1} ca să existe o soluție.`);
  renderEditorView();
});

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'custom') buildCustomTab();
  if (tab === 'levels') buildLevelsTab();
  if (tab === 'marathon') refreshMarathonTab();
}

// ============== Marathon mode ==============
let marathonRunning = false;
let marathonLevelNum = 0;

function refreshMarathonTab() {
  const m = getMarathon();
  document.getElementById('marathon-best').textContent = m.best > 0 ? m.best : '—';
  document.getElementById('marathon-current').textContent = m.current;
}

function startMarathonLevel(n) {
  marathonRunning = true;
  marathonLevelNum = n;
  const lvl = generateLevel(n);
  lvl.id = `marathon-${n}`;
  lvl.name = String(n);
  lvl.custom = false;
  startLevel(lvl, 'marathon');
  // Override title for clarity
  document.getElementById('game-title').textContent = `🏆 Maraton ${n}`;
}

function onMarathonResultNext() {
  // After a marathon win, advance to next level
  startMarathonLevel(marathonLevelNum + 1);
}

document.getElementById('btn-marathon-play').addEventListener('click', () => {
  audio.unlockAudio();
  audio.playClick();
  const m = getMarathon();
  startMarathonLevel(m.current);
});

document.getElementById('btn-marathon-reset').addEventListener('click', () => {
  audio.playClick();
  if (confirm('Reîncepi maratonul de la nivelul 1?')) {
    resetMarathon();
    refreshMarathonTab();
  }
});

// ============== Init ==============
buildLevelsTab();
buildCustomTab();
refreshMarathonTab();

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
