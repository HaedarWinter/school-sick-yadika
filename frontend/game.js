// School Sick In Yadika Soreang browser game.
// The browser owns the Canvas loop; FastAPI owns sessions and scores.

const API_BASE = 'http://127.0.0.1:8000';

// -----------------------------------------------------------------------------
// DOM and asset references
// -----------------------------------------------------------------------------

const canvas = document.querySelector('#game-canvas');
const context = canvas.getContext('2d');
const gameStage = document.querySelector('.game-stage');
const gameplayScreen = document.querySelector('#game-screen');
const mobileArrowControls = document.querySelector('.mobile-arrow-controls');
const livesHud = document.querySelector('#lives');
const scoreHud = document.querySelector('#score');
const timeHud = document.querySelector('#time');
const countdownOverlay = document.querySelector('#countdown-overlay');
const pauseNote = document.querySelector('#pause-note');
const pawseTimeIndicator = document.querySelector('#pawse-time-indicator');
const pawseTimeStage = document.querySelector('.canvas-wrap');
const mobileArrowButtons = [...mobileArrowControls.querySelectorAll('button')];
const gameRoot = document.querySelector('.app-shell');
const environmentImage = loadImage('/static/assets/environment/environment.svg');

// The supplied state artwork is intentionally kept in one mapping. The cat
// right asset has a leading hyphen in its existing filename; use that actual
// path instead of duplicating or renaming the provided asset.
// akuntan_boy idle/left/right have a " copy" suffix on disk — match actual files.
const CHARACTER_SPRITES = {
  akuntan_boy: {
    idle: '/static/assets/characters/akuntan/akboy_idle.svg',
    left: '/static/assets/characters/akuntan/akboy_left.svg',
    right: '/static/assets/characters/akuntan/akboy_right.svg',
    hurt: '/static/assets/characters/akuntan/akboy_hurt.svg',
    dead: '/static/assets/characters/akuntan/akboy_dead.svg',
  },
  akuntan_girl: {
    idle: '/static/assets/characters/akuntan/akgirl_idle.svg',
    left: '/static/assets/characters/akuntan/akgirl_left.svg',
    right: '/static/assets/characters/akuntan/akgirl_right.svg',
    hurt: '/static/assets/characters/akuntan/akgirl_hurt.svg',
    dead: '/static/assets/characters/akuntan/akgirl_dead.svg',
  },

  perhotelan_boy: {
    idle: '/static/assets/characters/perhotelan/perhotelanboy_idle.svg',
    left: '/static/assets/characters/perhotelan/perhotelanboy_left.svg',
    right: '/static/assets/characters/perhotelan/perhotelanboy_right.svg',
    hurt: '/static/assets/characters/perhotelan/perhotelanboy_hurt.svg',
    dead: '/static/assets/characters/perhotelan/perhotelanboy_dead.svg',
  },

  perhotelan_girl: {
    idle: '/static/assets/characters/perhotelan/perhotelangirl_idle.svg',
    left: '/static/assets/characters/perhotelan/perhotelangirl_left.svg',
    right: '/static/assets/characters/perhotelan/perhotelangirl_right.svg',
    hurt: '/static/assets/characters/perhotelan/perhotelangirl_hurt.svg',
    dead: '/static/assets/characters/perhotelan/perhotelangirl_dead.svg',
  },

  // pplg folder doesn't exist yet — assets will 404 until created.
  pplg_boy: {
    idle: '/static/assets/characters/pplg/pplgboy_idle.svg',
    left: '/static/assets/characters/pplg/pplgboy_left.svg',
    right: '/static/assets/characters/pplg/pplgboy_right.svg',
    hurt: '/static/assets/characters/pplg/pplgboy_hurt.svg',
    dead: '/static/assets/characters/pplg/pplgboy_dead.svg',
  },
  pplg_girl: {
    idle: '/static/assets/characters/pplg/pplggirl_idle.svg',
    left: '/static/assets/characters/pplg/pplggirl_left.svg',
    right: '/static/assets/characters/pplg/pplggirl_right.svg',
    hurt: '/static/assets/characters/pplg/pplggirl_hurt.svg',
    dead: '/static/assets/characters/pplg/pplggirl_dead.svg',
  },
};

const CHARACTER_NAMES = {
  akuntan_girl: 'Hana',
  akuntan_boy: 'Haru',
  perhotelan_girl: 'Hirara',
  perhotelan_boy: 'Han',
  pplg_boy: 'Hikaru',
  pplg_girl: 'Havi'
};

const characterAssets = Object.fromEntries(
  Object.entries(CHARACTER_SPRITES).flatMap(([character, states]) => Object.entries(states).map(([stateName, path]) => [
    `${character}:${stateName}`,
    loadImage(path),
  ])),
);

const W = canvas.width;
const H = canvas.height;
const backgroundCanvas = document.createElement('canvas');
backgroundCanvas.width = W;
backgroundCanvas.height = H;
const backgroundContext = backgroundCanvas.getContext('2d');
let backgroundCacheReady = false;

const itemAssets = Object.fromEntries(
  Object.entries(GAME_ITEMS).map(([id, item]) => [id, loadImage(item.asset)]),
);

function rebuildBackgroundCache() {
  if (!environmentImage.complete || !environmentImage.naturalWidth || !backgroundContext) return;

  const scale = Math.max(W / environmentImage.naturalWidth, H / environmentImage.naturalHeight);
  const drawWidth = environmentImage.naturalWidth * scale;
  const drawHeight = environmentImage.naturalHeight * scale;
  backgroundContext.clearRect(0, 0, W, H);
  backgroundContext.drawImage(environmentImage, (W - drawWidth) / 2, H - drawHeight, drawWidth, drawHeight);
  backgroundCacheReady = true;
}

environmentImage.addEventListener('load', rebuildBackgroundCache, { once: true });
if (environmentImage.complete) rebuildBackgroundCache();

function loadImage(source) {
  const image = new Image();
  image.addEventListener('load', () => {
    if (typeof renderGame === 'function') renderGame();
  });
  image.src = source;
  return image;
}

function waitForImage(image) {
  if (image.complete) return Promise.resolve(image);
  return new Promise((resolve) => {
    const finish = () => resolve(image);
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
  });
}

function preloadCharacter(character) {
  return Promise.all(Object.keys(CHARACTER_SPRITES[character]).map((stateName) => (
    waitForImage(characterAssets[`${character}:${stateName}`])
  )));
}

// -----------------------------------------------------------------------------
// Game configuration and state
// -----------------------------------------------------------------------------

const GAME_CONFIG = {
  maximumLives: 3,
  playerSpeed: 360,
  playerSpeedScoreInterval: 50,
  playerSpeedIncrease: 0.05,
  maxPlayerSpeedMultiplier: 1.3,
  // Keep falling objects below the HUD so the active play zone feels tighter
  // without changing the full-screen canvas or collision system.
  playfieldTop: 165,
  baseFallSpeed: 115,
  baseSpawnInterval: 0.95,
  minimumSpawnInterval: 0.58,
  difficultyIntervalSeconds: 15,
};

const PLAYER_VISUAL_SIZE = 138;
const PLAYER_SAFE_MARGIN = Math.ceil(PLAYER_VISUAL_SIZE / 2) + 6;
const PLAYER_COLLISION_WIDTH = 88;
const PLAYER_COLLISION_HEIGHT = 64;
const ITEM_COLLISION_SIZE = 52;
const ITEM_VISUAL_SIZE = 55;
const CHARACTER_STATE_NAMES = new Set(['idle', 'left', 'right', 'hurt', 'dead']);

// Keep the pet grounded at the grass/hedge boundary in the canvas' logical
// coordinate system. Rendering and collision use this same baseline.
function playerBaselineY() {
  return H * 0.925;
}

function createCaughtItems() {
  return Object.fromEntries(Object.keys(GAME_ITEMS).map((itemId) => [itemId, 0]));
}

const state = {
  character: 'akuntan_girl',
  sessionId: null,
  score: 0,
  lives: GAME_CONFIG.maximumLives,
  elapsedSeconds: 0,
  difficultyLevel: 0,
  pawseTimeRemaining: 0,
  objects: [],
  feedback: [],
  particles: [],
  caughtItems: createCaughtItems(),
  hazardsHit: 0,
  playerX: W / 2,
  keys: {},
  characterState: 'idle',
  lastDirection: 'idle',
  gameStatus: 'menu',
  isInvulnerable: false,
  hurtTimer: null,
  running: false,
  paused: false,
  lastTime: 0,
  spawnClock: 0,
  touchTargetX: null,
  touchFollowing: false,
  touchMoved: false,
};
window.gameState = state;

// Scoring tables are intentionally explicit for the seminar.
const MAX_LIVES = GAME_CONFIG.maximumLives;
const IDLE_TIMEOUT_MS = 30_000;
let soundEnabled = (localStorage.getItem('school-sick-yadika-music') ?? localStorage.getItem('school-sick-yadika-sound')) !== 'off';
let isSubmittingScore = false;
let scoreSubmitted = false;
let lastPlayerActivity = performance.now();
let idlePauseActive = false;
let activeTouchPointerId = null;
let stageBounds = null;
let animationFrameId = null;
let loopToken = 0;
let countdownTimeoutId = null;
let endGameTimeoutId = null;
let lastRenderedScore = null;
let lastRenderedTime = null;
let startRequestToken = 0;

function refreshStageBounds() {
  const nextBounds = gameStage.getBoundingClientRect();
  stageBounds = nextBounds.width > 0 && nextBounds.height > 0 ? nextBounds : null;
}

function stopGameLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  loopToken += 1;
}

function startGameLoop() {
  stopGameLoop();
  const token = loopToken;
  animationFrameId = requestAnimationFrame((now) => gameLoop(now, token));
}

function queueGameLoop(token) {
  if (token !== loopToken || animationFrameId !== null) return;
  animationFrameId = requestAnimationFrame((now) => gameLoop(now, token));
}

// -----------------------------------------------------------------------------
// Screen flow and character selection
// -----------------------------------------------------------------------------

function isValidCharacter(character) {
  return Object.hasOwn(CHARACTER_SPRITES, character);
}

function selectCharacter(character) {
  if (!isValidCharacter(character)) return;

  state.character = character;
  setCharacterState('idle');
  document.querySelectorAll('.character-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.character === character);
    card.setAttribute('aria-pressed', String(card.dataset.character === character));
  });
}

const modalState = {
  howToPlay: null,
  highScore: null,
  pause: null,
  idle: null,
};

let howToPlayContext = 'home';
let howToPlayActionButton = null;

let currentScreenId = 'select-screen';

// I keep menu navigation in one place and sync it with browser history.
function showScreen(screenId, { updateHistory = true } = {}) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === screenId);
  });
  if (updateHistory && currentScreenId !== screenId) {
    window.history.pushState({ screenId }, '', `#${screenId}`);
  }
  currentScreenId = screenId;
}

window.addEventListener('popstate', (event) => {
  if (modalState.howToPlay && !modalState.howToPlay.classList.contains('hidden')) {
    closeHowToPlay();
    return;
  }
  if (state.gameStatus === 'playing' || state.gameStatus === 'countdown' || state.gameStatus === 'paused') {
    window.history.pushState({ screenId: currentScreenId }, '', `#${currentScreenId}`);
    return;
  }
  const screenId = event.state?.screenId || 'select-screen';
  showScreen(screenId, { updateHistory: false });
});

function closeHowToPlay() {
  if (!modalState.howToPlay) return;
  GameUI.closeModal(modalState.howToPlay);
  showScreen(howToPlayContext === 'play' ? 'player-screen' : 'select-screen');
}

function openHowToPlay(context = 'home') {
  howToPlayContext = context;
  if (howToPlayActionButton) {
    howToPlayActionButton.textContent = context === 'play' ? 'PAW-TY TIME!' : 'GOT IT!';
    howToPlayActionButton.disabled = false;
  }
  GameUI.openModal(modalState.howToPlay);
}

function handleHowToPlayAction() {
  if (howToPlayContext === 'play') {
    howToPlayActionButton.disabled = true;
    GameUI.closeModal(modalState.howToPlay);
    startGame();
    return;
  }
  closeHowToPlay();
}

function createItemGrid(character) {
  const grid = document.createElement('div');
  grid.className = 'help-item-grid';
  CHARACTER_ITEMS[character].filter((itemId) => itemId !== 'pawseTime').forEach((itemId) => {
    const item = GAME_ITEMS[itemId];
    const entry = document.createElement('div');
    entry.className = `help-item help-item--${item.category}`;
    const effect = item.score ? `+${item.score} PTS` : item.effect;
    const displayLabel = item.label === 'Kitty food can' ? 'Kitty Can' : item.label === 'Tasty food can' ? 'Tasty Can' : item.label;
    entry.innerHTML = `<img src="${item.asset}" alt="${item.label}" /><span>${displayLabel}</span><small>${effect}</small>`;
    grid.append(entry);
  });
  return grid;
}

function createHowToPlayModal() {
  const modal = GameUI.createPixelModal({ id: 'how-to-play-modal', title: 'How to Play', className: 'how-to-play-modal', onClose: closeHowToPlay });
  const content = modal.querySelector('.pixel-modal__content');
  content.innerHTML = `
    <div class="help-section"><h3><img class="help-heading-icon" src="/static/assets/ui/controls.svg" alt="" /><span>Controls</span></h3><div class="help-controls-visual"><img src="/static/assets/ui/AD_keys.svg" alt="A and D keys" /><span>or</span><img src="/static/assets/ui/arrow_keys.svg" alt="Left and right arrow keys" /></div><p>Move left and right to catch your treats.</p></div>
    <div class="help-section"><h3><img class="help-heading-icon" src="/static/assets/ui/goal.svg" alt="" /><span>Goal</span></h3><div class="help-goal-copy"><strong>CATCH • DODGE • SCORE</strong><span>Catch treats and dodge hazards.</span><span>Feel the rush and chase the high score.</span></div></div>
    <div class="help-section"><h3><img class="help-heading-icon help-heading-icon--pet" src="/static/assets/characters/akuntan/akgirl_idle.svg" alt="Hana" /><span>AKUNTAN ITEMS</span></h3></div>
    <div class="help-section"><h3><img class="help-heading-icon help-heading-icon--pet" src="/static/assets/characters/perhotelan/perhotelanboy_idle.svg" alt="Han" /><span>PERHOTELAN ITEMS</span></h3></div>
    <div class="help-section"><h3><img class="help-heading-icon help-heading-icon--pet" src="/static/assets/characters/pplg/pplgboy_idle.svg" alt="Hikaru" /><span>PPLG ITEMS</span></h3></div>
    <div class="help-section help-section--lives"><h3><img class="help-heading-icon" src="/static/assets/ui/paw-survival.svg" alt="" /><span>Survival Guide</span></h3><div class="lives-guide"><div class="survival-rule"><div class="lives-guide__icons"><img src="${GAME_ITEMS.heart.asset}" alt="" /><img src="${GAME_ITEMS.heart.asset}" alt="" /><img src="${GAME_ITEMS.heart.asset}" alt="" /></div><p>Start with 3 lives</p></div><div class="survival-rule"><div class="lives-guide__icons"><img src="${GAME_ITEMS.pawseTime.asset}" alt="Pawse Time" /></div><p>Slows falling items for 5s</p></div><div class="survival-rule"><div class="lives-guide__icons"><img class="life-heart--empty" src="${GAME_ITEMS.heart.asset}" alt="Lost life" /><img class="life-heart--empty" src="${GAME_ITEMS.heart.asset}" alt="Lost life" /><img class="life-heart--empty" src="${GAME_ITEMS.heart.asset}" alt="Lost life" /></div><p>0 lives = Game Over</p></div></div></div>`;
  const sections = content.querySelectorAll('.help-section');
  const layout = document.createElement('div');
  layout.className = 'how-to-grid';
  Array.from(sections).slice(0, 5).forEach((section) => layout.append(section));
  content.prepend(layout);
  sections[2].append(createItemGrid('akuntan_girl'));
  sections[3].append(createItemGrid('perhotelan_boy'));
  sections[4].append(createItemGrid('pplg_boy'));
  howToPlayActionButton = GameUI.createPixelButton({ label: 'GOT IT!', variant: 'primary', onClick: handleHowToPlayAction });
  const footer = document.createElement('div');
  footer.className = 'pixel-modal__footer';
  footer.append(howToPlayActionButton);
  modal.querySelector('.pixel-modal').append(footer);
  return modal;
}

function createHighScoreModal() {
  const modal = GameUI.createPixelModal({ id: 'high-score-modal', title: 'High Score', className: 'high-score-modal', onClose: () => GameUI.closeModal(modal) });
  const content = modal.querySelector('.pixel-modal__content');
  content.innerHTML = '<div class="leaderboard-best"><span>BEST SCORE</span><strong class="best-score-value">0</strong></div><div class="leaderboard-header" aria-hidden="true"><span>RANK</span><span>PLAYER</span><span>CHARACTER</span><span>SCORE</span><span>TIME</span></div><div class="modal-leaderboard"></div>';
  return modal;
}

function createPauseModal() {
  const modal = GameUI.createPixelModal({ id: 'pause-modal', title: 'Paused', className: 'pause-menu-modal', onClose: togglePause });
  const content = modal.querySelector('.pixel-modal__content');
  content.append(
    GameUI.createPixelButton({ label: 'RESUME', variant: 'primary', className: 'pause-menu__button pause-menu__button--resume', onClick: togglePause }),
    GameUI.createPixelButton({ label: 'RESTART', variant: 'secondary', className: 'pause-menu__button', onClick: () => { GameUI.closeModal(modal); startGame(); } }),
    GameUI.createPixelButton({ label: 'HOME', variant: 'neutral', className: 'pause-menu__button pause-menu__button--home', onClick: goHome }),
  );
  return modal;
}

function createIdleModal() {
  const modal = GameUI.createPixelModal({ id: 'idle-modal', title: 'Still Playing?', className: 'idle-menu-modal', onClose: resumeIdleGame });
  const content = modal.querySelector('.pixel-modal__content');
  const message = document.createElement('p');
  message.textContent = "The game was paused because you've been idle.";
  content.append(
    message,
    GameUI.createPixelButton({ label: 'CONTINUE', variant: 'primary', className: 'idle-menu__button', onClick: resumeIdleGame }),
    GameUI.createPixelButton({ label: 'BACK TO HOME', variant: 'neutral', className: 'idle-menu__button', onClick: goHome }),
  );
  return modal;
}

function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  AudioManager.setEnabled(enabled);
  document.querySelectorAll('[data-sound-toggle]').forEach((button) => {
    button.dataset.soundState = enabled ? 'on' : 'off';
    button.setAttribute('aria-label', enabled ? 'Mute sound' : 'Unmute sound');
    button.title = enabled ? 'Mute sound' : 'Unmute sound';
  });
}

function startMusic() {
  AudioManager.startMusic();
}

function pauseMusic() {
  AudioManager.pauseMusic();
}

function openHighScores() {
  if (!modalState.highScore) modalState.highScore = createHighScoreModal();
  const board = modalState.highScore.querySelector('.modal-leaderboard');
  modalState.highScore.querySelector('.best-score-value').textContent = '0';
  board.innerHTML = '<p class="leaderboard-status">LOADING SCORES...</p>';
  fetch(`${API_BASE}/api/leaderboard`)
    .then((response) => {
      if (!response.ok) throw new Error('Leaderboard unavailable');
      return response.json();
    })
    .then((payload) => {
      const scores = normalizeLeaderboard(payload?.scores ?? payload);
      renderHighScores(scores, board);
      modalState.highScore.querySelector('.best-score-value').textContent = scores.length ? scores[0].score : '0';
    })
    .catch(() => { board.innerHTML = '<p class="leaderboard-status">UNABLE TO LOAD SCORES</p>'; });
  GameUI.openModal(modalState.highScore);
}

function normalizeCharacterName(value) {
  const character = String(value ?? '').trim();
  return CHARACTER_NAMES[character] ?? character.toUpperCase();
}

function normalizeLeaderboard(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((entry) => ({
      ...entry,
      score: Number(entry.score) || 0,
      displayCharacter: normalizeCharacterName(entry.character ?? entry.pet ?? entry.player),
    }))
    .sort((a, b) => b.score - a.score);
}

function renderHighScores(scores, board) {
  board.innerHTML = scores.length
    ? scores.map((row, index) => `
      <div class="leader-row">
        ${index < 3
        ? `<img class="leader-rank leader-place-badge" src="/static/assets/ui/${['first-place', 'second-place', 'third-place'][index]}.svg" alt="${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : 'rd'} place" />`
        : `<span class="leader-rank">${index + 1}</span>`}
        <span class="leader-name">${escapeHtml(row.nickname ?? '')}</span>
        <span class="leader-character">${escapeHtml(row.displayCharacter)}</span>
        <b>${row.score}</b>
        <span class="leader-survival-time">${formatTime(row.survival_time ?? row.survivalTime ?? 0)}</span>
      </div>`).join('')
    : '<p class="empty-leaderboard">No scores yet — be the first!</p>';
}

function goHome() {
  startRequestToken += 1;
  clearHurtState();
  AudioManager.resumeMusic();
  stopGameLoop();
  if (countdownTimeoutId !== null) {
    clearTimeout(countdownTimeoutId);
    countdownTimeoutId = null;
  }
  state.running = false;
  state.paused = false;
  state.gameStatus = 'menu';
  state.sessionId = null;
  state.pawseTimeRemaining = 0;
  updatePawseTimeUI();
  state.keys = {};
  clearMobileControlVisuals();
  state.lastDirection = 'idle';
  state.objects = [];
  idlePauseActive = false;
  setCharacterState('idle');
  if (modalState.pause) GameUI.closeModal(modalState.pause);
  if (modalState.idle) GameUI.closeModal(modalState.idle);
  showScreen('select-screen');
}

function initializeReusableUI() {
  modalState.howToPlay = createHowToPlayModal();

  // Create settings modal with music player
  const settingsModal = GameUI.createPixelModal({
    id: 'settings-modal',
    title: 'Settings',
    className: 'settings-modal',
    onClose: () => GameUI.closeModal(settingsModal),
  });
  const settingsContent = settingsModal.querySelector('.pixel-modal__content');

  // Add music player to settings
  const musicPlayerUI = MusicPlayer.createMusicPlayerUI();
  settingsContent.append(musicPlayerUI.container);
  MusicPlayer.initializeMusicPlayer(musicPlayerUI);

  // Settings button
  const settingsButton = GameUI.createPixelIconButton({
    icon: 'settings',
    ariaLabel: 'Settings',
    onClick: () => GameUI.openModal(settingsModal),
  });

  const soundButton = GameUI.createPixelIconButton({ icon: 'sound', ariaLabel: 'Toggle sound', onClick: () => setSoundEnabled(!soundEnabled) });
  soundButton.dataset.soundToggle = 'true';
  const landingUtils = document.querySelector('#landing-utilities');
  landingUtils.append(settingsButton, soundButton);
  setSoundEnabled(soundEnabled);
  document.querySelector('#pause-button')?.addEventListener('click', togglePause);
  modalState.pause = createPauseModal();
  modalState.idle = createIdleModal();
}

document.querySelectorAll('.character-card').forEach((card) => {
  card.addEventListener('click', () => selectCharacter(card.dataset.character));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectCharacter(card.dataset.character);
    }
  });
});

document.querySelector('#start-button').addEventListener('click', () => showScreen('player-screen'));
document.querySelector('#player-back-button').addEventListener('click', () => showScreen('select-screen'));
document.querySelector('#ready-button').addEventListener('click', () => openHowToPlay('play'));
document.querySelector('#how-to-play-button').addEventListener('click', () => openHowToPlay('home'));
document.querySelector('#high-score-button').addEventListener('click', openHighScores);
initializeReusableUI();
updateLivesHud();
document.querySelector('#again-button').addEventListener('click', startGame);
document.querySelector('#change-button').addEventListener('click', () => showScreen('select-screen'));

// -----------------------------------------------------------------------------
// Input handling
// -----------------------------------------------------------------------------

function isTypingTarget(target) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || Boolean(target?.isContentEditable);
}

gameRoot.addEventListener('contextmenu', (event) => {
  if (!isTypingTarget(event.target) && !event.target.closest?.('textarea, [contenteditable="true"]')) {
    event.preventDefault();
  }
});

gameRoot.addEventListener('dragstart', (event) => {
  if (event.target.closest?.('img, canvas, a')) event.preventDefault();
});

function clearMovementKeys() {
  state.keys.a = false;
  state.keys.d = false;
  state.keys.arrowleft = false;
  state.keys.arrowright = false;
  state.keys.mobileleft = false;
  state.keys.mobileright = false;
  clearMobileControlVisuals();
}

window.addEventListener('keydown', (event) => {
  if (isTypingTarget(event.target)) return;

  const key = event.key.toLowerCase();

  if (key === 'p' && state.running && (state.gameStatus === 'playing' || state.gameStatus === 'paused')) {
    togglePause();
    return;
  }

  if (state.gameStatus !== 'playing') return;

  if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
    markPlayerActivity();
    state.keys[key] = true;
    if (key === 'a' || key === 'arrowleft') state.lastDirection = 'left';
    if (key === 'd' || key === 'arrowright') state.lastDirection = 'right';
    event.preventDefault();
  }

});

window.addEventListener('keyup', (event) => {
  if (isTypingTarget(event.target)) return;

  const key = event.key.toLowerCase();
  if (!['arrowleft', 'arrowright', 'a', 'd'].includes(key)) return;

  state.keys[key] = false;
  if (key === 'a' || key === 'arrowleft') {
    if (state.keys.d || state.keys.arrowright) state.lastDirection = 'right';
  }
  if (key === 'd' || key === 'arrowright') {
    if (state.keys.a || state.keys.arrowleft) state.lastDirection = 'left';
  }
});

window.addEventListener('focusin', (event) => {
  if (isTypingTarget(event.target)) clearMovementKeys();
});

function clampPlayerX(x) {
  return Math.max(PLAYER_SAFE_MARGIN, Math.min(W - PLAYER_SAFE_MARGIN, x));
}

function updateTouchTarget(clientX) {
  if (!stageBounds) refreshStageBounds();
  if (!stageBounds) return;
  const stageX = (clientX - stageBounds.left) * (W / stageBounds.width);
  state.touchTargetX = clampPlayerX(stageX);
}

function resetTouchDrag() {
  if (activeTouchPointerId !== null && gameplayScreen.hasPointerCapture?.(activeTouchPointerId)) {
    gameplayScreen.releasePointerCapture(activeTouchPointerId);
  }
  activeTouchPointerId = null;
  state.touchFollowing = false;
  state.touchMoved = false;
  state.touchTargetX = null;
}

function setMobileDirection(direction, pressed) {
  const button = mobileArrowButtons.find((candidate) => candidate.dataset.direction === direction);
  if (state.gameStatus !== 'playing') {
    button?.classList.remove('is-pressed');
    return;
  }
  const key = direction === 'left' ? 'mobileleft' : 'mobileright';
  state.keys[key] = pressed;
  button?.classList.toggle('is-pressed', pressed);
  if (pressed) {
    markPlayerActivity();
    state.lastDirection = direction;
  }
}

function clearMobileControlVisuals() {
  mobileArrowButtons.forEach((button) => {
    button.classList.remove('is-pressed');
  });
}

function setMobileControlsVisible(visible) {
  mobileArrowControls.classList.toggle('is-visible', visible);
}

function handleMobileControlPointer(event) {
  const button = event.currentTarget;
  const direction = button.dataset.direction;
  if (event.type === 'pointerdown') {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    setMobileDirection(direction, true);
  } else if (event.type === 'pointerup' || event.type === 'pointercancel' || event.type === 'lostpointercapture') {
    setMobileDirection(direction, false);
  }
  if (event.type === 'pointerleave') {
    setMobileDirection(direction, false);
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  }
  event.stopPropagation();
  event.preventDefault();
}

mobileArrowButtons.forEach((button) => {
  ['pointerdown', 'pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture', 'contextmenu', 'dragstart'].forEach((eventName) => {
    button.addEventListener(eventName, handleMobileControlPointer, { passive: false });
  });
});

function isGameplayUiTarget(target) {
  return Boolean(target.closest('button, input, textarea, select, a, [role="button"], [role="dialog"], .pixel-modal, .pixel-modal-backdrop'));
}

gameplayScreen.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch' || !event.isPrimary || state.gameStatus !== 'playing' || isGameplayUiTarget(event.target)) return;
  activeTouchPointerId = event.pointerId;
  gameplayScreen.setPointerCapture(event.pointerId);
  markPlayerActivity();
  state.touchMoved = false;
  state.touchFollowing = true;
  updateTouchTarget(event.clientX);
  event.preventDefault();
}, { passive: false });

gameplayScreen.addEventListener('pointermove', (event) => {
  if (event.pointerId !== activeTouchPointerId || !state.touchFollowing || state.gameStatus !== 'playing') return;
  markPlayerActivity();
  state.touchMoved = true;
  updateTouchTarget(event.clientX);
  event.preventDefault();
}, { passive: false });

function finishTouchPointer(event) {
  if (event.pointerId !== activeTouchPointerId) return;
  resetTouchDrag();
  event.preventDefault();
}

gameplayScreen.addEventListener('pointerup', finishTouchPointer, { passive: false });
gameplayScreen.addEventListener('pointercancel', finishTouchPointer, { passive: false });
gameplayScreen.addEventListener('lostpointercapture', (event) => {
  if (event.pointerId === activeTouchPointerId) resetTouchDrag();
});

window.addEventListener('orientationchange', () => {
  resetTouchDrag();
  clearMovementKeys();
  refreshStageBounds();
});
window.addEventListener('resize', () => {
  if (state.touchFollowing) resetTouchDrag();
  refreshStageBounds();
  if (state.gameStatus === 'playing' || state.gameStatus === 'paused') renderGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running && !state.paused && state.gameStatus === 'playing') pauseForIdle();
});

// -----------------------------------------------------------------------------
// Game lifecycle
// -----------------------------------------------------------------------------

function startGame() {
  const requestToken = ++startRequestToken;
  clearHurtState();
  resetGameState();
  const characterToStart = state.character;
  // Sprite preloading is best-effort. Image load handlers rerender when assets
  // arrive, so a slow mobile asset must not delay session creation or countdown.
  preloadCharacter(characterToStart);
  if (requestToken !== startRequestToken) return;
  renderGame();
  Object.values(modalState).forEach((modal) => { if (modal) GameUI.closeModal(modal); });
  showScreen('game-screen');
  refreshStageBounds();
  pauseNote.classList.add('hidden');

  const sessionPromise = fetch(`${API_BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ character: state.character }),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('Unable to start a game session. Please try again.');
      const data = await response.json();
      if (requestToken !== startRequestToken) return null;
      if (!data.session_id) throw new Error('Unable to start a game session. Please try again.');
      state.sessionId = data.session_id;
      return data.session_id;
    });

  startMusic();
  runCountdown(requestToken, sessionPromise);
}

function markPlayerActivity() {
  if (state.gameStatus === 'playing' && !state.paused) lastPlayerActivity = performance.now();
}

function pauseForIdle() {
  if (idlePauseActive || !state.running || state.paused || state.gameStatus !== 'playing') return;
  idlePauseActive = true;
  state.paused = true;
  state.gameStatus = 'paused';
  clearMovementKeys();
  pauseMusic();
  if (modalState.idle) GameUI.openModal(modalState.idle);
}

function resumeIdleGame() {
  if (!idlePauseActive) return;
  idlePauseActive = false;
  lastPlayerActivity = performance.now();
  state.paused = false;
  state.gameStatus = 'playing';
  if (modalState.idle) GameUI.closeModal(modalState.idle);
  startMusic();
  state.lastTime = performance.now();
  startGameLoop();
}

function resetGameState() {
  stopGameLoop();
  if (countdownTimeoutId !== null) {
    clearTimeout(countdownTimeoutId);
    countdownTimeoutId = null;
  }
  if (endGameTimeoutId !== null) {
    clearTimeout(endGameTimeoutId);
    endGameTimeoutId = null;
  }
  state.score = 0;
  state.sessionId = null;
  state.lives = GAME_CONFIG.maximumLives;
  state.elapsedSeconds = 0;
  state.difficultyLevel = 0;
  state.pawseTimeRemaining = 0;
  state.objects = [];
  state.feedback = [];
  state.particles = [];
  state.caughtItems = createCaughtItems();
  state.hazardsHit = 0;
  state.playerX = W / 2;
  state.characterState = 'idle';
  state.lastDirection = 'idle';
  state.gameStatus = 'countdown';
  state.isInvulnerable = false;
  state.keys = {};
  clearMobileControlVisuals();
  state.paused = false;
  state.running = false;
  state.spawnClock = 0;
  state.touchTargetX = null;
  state.touchFollowing = false;
  state.touchMoved = false;
  setMobileControlsVisible(false);
  lastPlayerActivity = performance.now();
  idlePauseActive = false;
  lastRenderedScore = null;
  lastRenderedTime = null;
  countdownOverlay.classList.add('hidden');
  updateHud(true);
  updateLivesHud();
  updatePawseTimeUI();
}

function runCountdown(requestToken, sessionPromise) {
  const steps = ['3', '2', '1', 'GO'];
  let stepIndex = 0;
  let sessionError = null;
  let sessionReady = false;

  sessionPromise.then(() => {
    sessionReady = true;
  }).catch((error) => {
    sessionError = error;
  });

  AudioManager.playCountdown();

  const failToStart = () => {
    if (requestToken !== startRequestToken) return;
    countdownOverlay.classList.add('hidden');
    state.sessionId = null;
    state.running = false;
    state.gameStatus = 'menu';
    showScreen('player-screen');
    window.alert(sessionError?.message || 'Unable to start a game session. Please try again.');
  };

  const beginGameplay = () => {
    if (requestToken !== startRequestToken) return;
    countdownOverlay.classList.add('hidden');
    state.running = true;
    state.gameStatus = 'playing';
    setMobileControlsVisible(true);
    setCharacterState('idle');
    state.lastTime = performance.now();
    lastPlayerActivity = performance.now();
    startGameLoop();
  };

  const showNextStep = () => {
    if (requestToken !== startRequestToken) return;
    countdownOverlay.textContent = steps[stepIndex];
    countdownOverlay.classList.remove('hidden');

    countdownTimeoutId = window.setTimeout(() => {
      countdownTimeoutId = null;
      if (requestToken !== startRequestToken) return;
      if (stepIndex === steps.length - 1) {
        if (sessionError) {
          failToStart();
          return;
        }
        if (!sessionReady) {
          countdownOverlay.textContent = 'LOADING...';
          sessionPromise.then(beginGameplay).catch((error) => {
            sessionError = error;
            failToStart();
          });
          return;
        }
        beginGameplay();
        return;
      }

      stepIndex += 1;
      showNextStep();
    }, 1000);
  };

  showNextStep();
}

function togglePause() {
  if (!state.running || idlePauseActive || state.gameStatus === 'gameOver' || state.gameStatus === 'countdown') return;
  state.paused = !state.paused;
  state.gameStatus = state.paused ? 'paused' : 'playing';
  if (state.paused) clearMovementKeys();
  if (state.paused) pauseMusic();
  else startMusic();
  pauseNote.classList.toggle('hidden', !state.paused);

  if (modalState.pause) {
    if (state.paused) GameUI.openModal(modalState.pause);
    else GameUI.closeModal(modalState.pause);
  }

  if (!state.paused) {
    state.lastTime = performance.now();
    startGameLoop();
  }
}

// -----------------------------------------------------------------------------
// Game loop, spawning, and collisions
// -----------------------------------------------------------------------------

function gameLoop(now, token) {
  animationFrameId = null;
  if (token !== loopToken || !state.running || state.paused) return;

  if (now - lastPlayerActivity >= IDLE_TIMEOUT_MS) {
    pauseForIdle();
    return;
  }

  const deltaTime = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;
  updateGame(deltaTime);
  renderGame();

  if (state.running && !state.paused) queueGameLoop(token);
}

function updateGame(deltaTime) {
  state.elapsedSeconds += deltaTime;
  state.pawseTimeRemaining = Math.max(0, state.pawseTimeRemaining - deltaTime);
  updatePawseTimeUI();
  const nextDifficultyLevel = Math.floor(state.elapsedSeconds / GAME_CONFIG.difficultyIntervalSeconds);
  if (nextDifficultyLevel > state.difficultyLevel) {
    state.difficultyLevel = nextDifficultyLevel;
    addFeedback(W / 2, 190, 'LEVEL UP!', '#e85f8a', 1.35);
    AudioManager.playSpeedUp();
  }

  movePlayer(deltaTime);
  updateSpawning(deltaTime);
  updateFallingObjects(deltaTime);
  updateFeedback(deltaTime);
  updateParticles(deltaTime);
  updateHud();
}

function updateLivesHud() {
  if (!livesHud) return;

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < MAX_LIVES; index += 1) {
    const heart = document.createElement('img');
    heart.src = GAME_ITEMS.heart.asset;
    heart.alt = index < state.lives ? 'Life remaining' : 'Lost life';
    heart.className = index < state.lives ? 'life-heart' : 'life-heart life-heart--empty';
    fragment.append(heart);
  }
  livesHud.replaceChildren(fragment);
  livesHud.setAttribute('aria-label', `Lives: ${state.lives}`);
}

function movePlayer(deltaTime) {
  if (state.touchTargetX !== null && movementDirection() !== 0) state.touchTargetX = null;

  if (state.touchTargetX !== null) {
    const distance = state.touchTargetX - state.playerX;
    const touchDirection = Math.sign(distance);
    const step = GAME_CONFIG.playerSpeed * deltaTime;
    state.playerX = Math.abs(distance) <= step ? state.touchTargetX : state.playerX + touchDirection * step;
    if (!state.isInvulnerable) setCharacterState(touchDirection < 0 ? 'left' : touchDirection > 0 ? 'right' : 'idle');
    return;
  }

  const direction = movementDirection();

  state.playerX += direction * getPlayerSpeed() * deltaTime;
  state.playerX = clampPlayerX(state.playerX);
  if (!state.isInvulnerable) setCharacterState(direction < 0 ? 'left' : direction > 0 ? 'right' : 'idle');
}

function movementDirection() {
  const movingLeft = Boolean(state.keys.a || state.keys.arrowleft || state.keys.mobileleft);
  const movingRight = Boolean(state.keys.d || state.keys.arrowright || state.keys.mobileright);
  if (movingLeft && movingRight) return state.lastDirection === 'left' ? -1 : 1;
  return Number(movingRight) - Number(movingLeft);
}

function movementState() {
  const movingLeft = Boolean(state.keys.a || state.keys.arrowleft || state.keys.mobileleft);
  const movingRight = Boolean(state.keys.d || state.keys.arrowright || state.keys.mobileright);
  if (movingLeft && movingRight) return state.lastDirection === 'left' ? 'left' : 'right';
  if (movingLeft && !movingRight) return 'left';
  if (movingRight && !movingLeft) return 'right';
  return 'idle';
}

function getPlayerSpeed() {
  const scoreTier = Math.floor(Math.max(0, state.score) / GAME_CONFIG.playerSpeedScoreInterval);
  const multiplier = Math.min(
    GAME_CONFIG.maxPlayerSpeedMultiplier,
    1 + scoreTier * GAME_CONFIG.playerSpeedIncrease,
  );
  return GAME_CONFIG.playerSpeed * multiplier;
}

function setCharacterState(nextState) {
  if (!CHARACTER_STATE_NAMES.has(nextState)) return;
  if (state.characterState === 'dead' && nextState !== 'dead') return;
  state.characterState = nextState;
}

function clearHurtState() {
  if (state.hurtTimer !== null) {
    window.clearTimeout(state.hurtTimer);
    state.hurtTimer = null;
  }
  state.isInvulnerable = false;
}

function triggerHurt() {
  if (state.isInvulnerable || state.gameStatus !== 'playing') return;

  state.isInvulnerable = true;
  setCharacterState('hurt');
  state.hurtTimer = window.setTimeout(() => {
    state.hurtTimer = null;
    state.isInvulnerable = false;
    if (state.lives > 0 && state.gameStatus === 'playing') setCharacterState(movementState());
  }, 600);
}

function updateSpawning(deltaTime) {
  state.spawnClock -= deltaTime;
  if (state.spawnClock > 0) return;

  spawnItem();
  state.spawnClock = Math.max(
    GAME_CONFIG.minimumSpawnInterval,
    GAME_CONFIG.baseSpawnInterval - state.difficultyLevel * 0.08,
  );
}

function getSpawnPool() {
  return CHARACTER_ITEMS[state.character];
}

function spawnItem() {
  const pool = getSpawnPool();
  const totalWeight = pool.reduce((sum, itemId) => sum + (GAME_ITEMS[itemId].spawnWeight ?? 1), 0);
  let remainingWeight = Math.random() * totalWeight;
  const type = pool.find((itemId) => {
    remainingWeight -= GAME_ITEMS[itemId].spawnWeight ?? 1;
    return remainingWeight < 0;
  }) ?? pool[pool.length - 1];

  state.objects.push({
    type,
    x: 35 + Math.random() * (W - 70),
    y: GAME_CONFIG.playfieldTop - 35,
    speed: GAME_CONFIG.baseFallSpeed + Math.random() * 85,
    spin: Math.random() * 6,
  });
}

function updateFallingObjects(deltaTime) {
  const speedBoost = Math.min(1.8, 1 + state.difficultyLevel * 0.1);
  const pawseTimeMultiplier = state.pawseTimeRemaining > 0 ? 0.5 : 1;
  const groundBoundary = playerBaselineY();
  const playerLeft = state.playerX - PLAYER_COLLISION_WIDTH / 2;
  const playerTop = playerBaselineY() - PLAYER_COLLISION_HEIGHT;
  const playerRight = playerLeft + PLAYER_COLLISION_WIDTH;
  const playerBottom = playerTop + PLAYER_COLLISION_HEIGHT;
  let activeObjectCount = 0;

  for (let index = 0; index < state.objects.length; index += 1) {
    const item = state.objects[index];
    item.y += item.speed * speedBoost * pawseTimeMultiplier * deltaTime;
    item.spin += deltaTime * 2;
    if (item.y > H + 50) continue;

    const itemLeft = item.x - ITEM_COLLISION_SIZE / 2;
    const itemTop = item.y - ITEM_COLLISION_SIZE / 2;
    const itemBottom = itemTop + ITEM_COLLISION_SIZE;

    // The player baseline is the playable ground boundary. Remove missed
    // items before collision checks once their collision bounds pass it.
    // This keeps below-ground sprites from awarding points or changing lives.
    if (itemBottom > groundBoundary) continue;

    const isCaught = playerLeft < itemLeft + ITEM_COLLISION_SIZE
      && playerRight > itemLeft
      && playerTop < itemTop + ITEM_COLLISION_SIZE
      && playerBottom > itemTop;

    if (isCaught) {
      catchItem(item);
      continue;
    }

    state.objects[activeObjectCount] = item;
    activeObjectCount += 1;
  }
  state.objects.length = activeObjectCount;
}

function catchItem(item) {
  // A caught object is removed by updateFallingObjects immediately after this
  // call. Ignore any collision work that could be queued after Game Over.
  if (state.gameStatus !== 'playing') return;

  let scoreChange = 0;
  let feedbackText = '';
  const itemConfig = GAME_ITEMS[item.type];

  if (itemConfig && itemConfig.category !== 'hazard') state.caughtItems[item.type] += 1;

  if (itemConfig?.lifeChange > 0) {
    state.lives = Math.min(MAX_LIVES, state.lives + itemConfig.lifeChange);
    feedbackText = itemConfig.effect.toUpperCase();
  } else if (itemConfig?.lifeChange < 0) {
    // Invulnerability protects the hurt animation and movement state, but it
    // must not suppress damage from a different hazard caught in this frame.
    state.lives = Math.max(0, state.lives + itemConfig.lifeChange);
    state.hazardsHit += 1;
    feedbackText = itemConfig.effect.toUpperCase();
    triggerHurt();
  } else if (item.type === 'pawseTime') {
    activatePawseTime();
  } else if (item.type === 'star') {
    scoreChange = itemConfig.score;
    feedbackText = `+${scoreChange}`;
  } else if (itemConfig?.score) {
    scoreChange = itemConfig.score;
    feedbackText = `+${scoreChange}`;
  }

  state.score = Math.max(0, state.score + scoreChange);
  if (scoreChange > 0) AudioManager.playPoints();
  if (item.type === 'heart' && itemConfig?.lifeChange > 0) AudioManager.playHeart();
  if (itemConfig?.lifeChange < 0) AudioManager.playHurt();
  if (itemConfig?.lifeChange) updateLivesHud();
  if (feedbackText) addFeedback(item.x, item.y - 15, feedbackText, itemConfig?.lifeChange < 0 ? '#e85f5b' : '#287f72');

  if (scoreChange > 0 || item.type === 'heart') addCatchParticles(item.x, item.y);

  if (state.lives <= 0) {
    AudioManager.playDead();
    clearHurtState();
    state.pawseTimeRemaining = 0;
    updatePawseTimeUI();
    state.gameStatus = 'gameOver';
    state.running = false;
    state.paused = false;
    setCharacterState('dead');
    renderGame();
    endGameTimeoutId = window.setTimeout(() => {
      endGameTimeoutId = null;
      endGame();
    }, 450);
  }
}

function activatePawseTime() {
  state.pawseTimeRemaining = 5;
  updatePawseTimeUI();
  addFeedback(W / 2, 190, 'PAWSE TIME!', '#299db1', 1.35);
  AudioManager.playPoints();
}

function updatePawseTimeUI() {
  const active = state.pawseTimeRemaining > 0;
  pawseTimeStage.classList.toggle('pawse-time-active', active);
  pawseTimeIndicator.classList.toggle('hidden', !active);
  if (active) pawseTimeIndicator.querySelector('span').textContent = `${Math.ceil(state.pawseTimeRemaining)}s`;
}

function addFeedback(x, y, text, color, life = 1) {
  state.feedback.push({ x, y, text, color, life, maxLife: life });
}

function addCatchParticles(x, y) {
  for (let index = 0; index < 8; index += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 100,
      vy: -Math.random() * 100,
      life: 0.7,
      color: '#ffd05b',
    });
  }
}

function updateFeedback(deltaTime) {
  let activeFeedbackCount = 0;
  for (let index = 0; index < state.feedback.length; index += 1) {
    const item = state.feedback[index];
    item.life -= deltaTime;
    if (item.life > 0) state.feedback[activeFeedbackCount++] = item;
  }
  state.feedback.length = activeFeedbackCount;
}

function updateParticles(deltaTime) {
  let activeParticleCount = 0;
  for (let index = 0; index < state.particles.length; index += 1) {
    const particle = state.particles[index];
    particle.life -= deltaTime;
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vy += 40 * deltaTime;
    if (particle.life > 0) state.particles[activeParticleCount++] = particle;
  }
  state.particles.length = activeParticleCount;
}

function updateHud(force = false) {
  if (force || state.score !== lastRenderedScore) {
    scoreHud.textContent = String(state.score).padStart(3, '0');
    lastRenderedScore = state.score;
  }

  const displayedTime = Math.floor(state.elapsedSeconds);
  if (force || displayedTime !== lastRenderedTime) {
    timeHud.textContent = formatTime(displayedTime);
    lastRenderedTime = displayedTime;
  }
}

function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

// -----------------------------------------------------------------------------
// Canvas rendering
// -----------------------------------------------------------------------------

function renderGame() {
  drawBackground();
  context.imageSmoothingEnabled = false;
  state.objects.forEach(drawItem);
  drawPlayer();
  context.imageSmoothingEnabled = true;
  drawFeedback();
  drawParticles();
}

function drawBackground() {
  if (!environmentImage.complete || !environmentImage.naturalWidth) {
    context.fillStyle = '#94d8eb';
    context.fillRect(0, 0, W, H);
    return;
  }

  if (!backgroundCacheReady) rebuildBackgroundCache();
  if (backgroundCacheReady) context.drawImage(backgroundCanvas, 0, 0);
}

function drawPlayer() {
  const image = characterAssets[`${state.character}:${state.characterState}`];
  const baselineY = playerBaselineY();
  if (!image || !image.complete || !image.naturalWidth) {
    drawMissingAssetNotice(state.playerX, baselineY - 20);
    return;
  }

  // Keep one visual box for every state. The collision box is separate.
  context.drawImage(image, state.playerX - PLAYER_VISUAL_SIZE / 2, baselineY - PLAYER_VISUAL_SIZE, PLAYER_VISUAL_SIZE, PLAYER_VISUAL_SIZE);
}

function drawMissingAssetNotice(x, y) {
  context.fillStyle = '#5d4540';
  context.font = '800 12px Inter';
  context.textAlign = 'center';
  context.fillText('PLAYER SPRITE ASSET REQUIRED', x, y);
}

function drawItem(item) {
  context.save();
  context.translate(item.x, item.y);
  context.rotate(Math.sin(item.spin) * 0.08);

  const image = itemAssets[item.type];

  if (image && image.complete && image.naturalWidth > 0) {
    const itemVisualSize = ITEM_VISUAL_SIZE;
    const aspectRatio = image.naturalWidth / image.naturalHeight || 1;
    const itemWidth = aspectRatio >= 1 ? itemVisualSize : itemVisualSize * aspectRatio;
    const itemHeight = aspectRatio >= 1 ? itemVisualSize / aspectRatio : itemVisualSize;
    context.drawImage(image, -itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight);
    context.restore();
    return;
  }

  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(0, 0, 21, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawFeedback() {
  state.feedback.forEach((item) => {
    context.save();
    context.globalAlpha = Math.min(1, item.life * 2 / item.maxLife);
    context.font = '800 18px Inter';
    context.fillStyle = item.color;
    context.textAlign = 'center';
    context.fillText(item.text, item.x, item.y - (1 - item.life) * 28);
    context.restore();
  });
}

function drawParticles() {
  state.particles.forEach((particle) => {
    context.fillStyle = particle.color;
    context.fillRect(particle.x, particle.y, 4, 4);
  });
}

// -----------------------------------------------------------------------------
// Character portraits and game over
// -----------------------------------------------------------------------------

function drawPortrait(target, character, width, height, stateName = 'idle') {
  const portraitContext = target.getContext('2d');
  portraitContext.clearRect(0, 0, width, height);

  const image = characterAssets[`${character}:${stateName}`] || characterAssets[`${character}:idle`];
  if (image?.complete && image.naturalWidth) {
    portraitContext.imageSmoothingEnabled = false;
    const spriteSize = Math.min(width * 0.72, height - 14);
    const spriteX = (width - spriteSize) / 2;
    const spriteY = height - spriteSize - (stateName === 'dead' ? 10 : 2);
    portraitContext.drawImage(image, spriteX, spriteY, spriteSize, spriteSize);
    portraitContext.imageSmoothingEnabled = true;
    return;
  }

  portraitContext.fillStyle = '#f5c6a0';
  portraitContext.fillRect(0, 0, width, height);
  portraitContext.fillStyle = '#5d4540';
  portraitContext.font = '800 12px Inter';
  portraitContext.textAlign = 'center';
  portraitContext.fillText('SPRITE ASSET REQUIRED', width / 2, height / 2);
}

function renderPortraits() {
  document.querySelectorAll('[data-character-portrait]').forEach((portrait) => {
    drawPortrait(
      portrait,
      portrait.dataset.characterPortrait,
      portrait.width,
      portrait.height,
    );
  });
}

Object.values(characterAssets).forEach((image) => image.addEventListener('load', renderPortraits));
renderPortraits();

function endGame() {
  state.running = false;
  state.gameStatus = 'gameOver';
  state.pawseTimeRemaining = 0;
  updatePawseTimeUI();
  setMobileControlsVisible(false);
  clearMobileControlVisuals();
  state.keys = {};
  clearHurtState();
  AudioManager.resumeMusic();
  state.isNewHighScore = false;
  drawPortrait(document.querySelector('#result-portrait'), state.character, 150, 135, 'dead');
  document.querySelector('#final-score').textContent = String(state.score).padStart(3, '0');
  document.querySelector('#over-title').textContent = state.isNewHighScore ? 'NEW HIGH SCORE!' : 'NICE RUN!';
  document.querySelector('#survival-time').textContent = `SURVIVED ${formatTime(state.elapsedSeconds)}`;
  renderCaughtItems();
  document.querySelector('#hazards-hit').innerHTML = `Hazards hit: <strong>${state.hazardsHit}</strong>`;
  document.querySelector('#nickname').value = '';
  document.querySelector('.nickname-area').classList.remove('hidden');
  document.querySelector('#submission-success').classList.add('hidden');
  document.querySelector('#submission-error').classList.add('hidden');
  document.querySelector('#submission-error').textContent = '';
  document.querySelector('#submitted-summary').textContent = '';
  document.querySelector('#submit-button').classList.remove('hidden');
  document.querySelector('#submit-button').textContent = 'SUBMIT SCORE';
  document.querySelector('#submit-button').disabled = false;
  isSubmittingScore = false;
  scoreSubmitted = false;
  showScreen('over-screen');
}

function renderCaughtItems() {
  const container = document.querySelector('#caught-items');
  const caughtIds = CHARACTER_ITEMS[state.character].filter((itemId) => state.caughtItems[itemId] > 0 && GAME_ITEMS[itemId].category !== 'hazard');
  container.innerHTML = caughtIds.length
    ? caughtIds.map((itemId) => `<span class="caught-item"><img src="${GAME_ITEMS[itemId].asset}" alt="${GAME_ITEMS[itemId].label}" /><b>×${state.caughtItems[itemId]}</b></span>`).join('')
    : '<span class="caught-empty">No catches yet</span>';
}

// -----------------------------------------------------------------------------
// Score submission and leaderboard
// -----------------------------------------------------------------------------

document.querySelector('#submit-button').addEventListener('click', submitScore);

async function submitScore() {
  if (isSubmittingScore || scoreSubmitted) return;
  const nickname = document.querySelector('#nickname').value.trim().slice(0, 20);
  if (!nickname) {
    document.querySelector('#submission-error').textContent = 'Please enter a nickname.';
    document.querySelector('#submission-error').classList.remove('hidden');
    document.querySelector('#nickname').focus();
    return;
  }

  const errorMessage = document.querySelector('#submission-error');
  errorMessage.classList.add('hidden');
  errorMessage.textContent = '';
  const submitButton = document.querySelector('#submit-button');
  isSubmittingScore = true;
  submitButton.disabled = true;
  submitButton.textContent = 'SUBMITTING...';

  try {
    const response = await fetch(`${API_BASE}/api/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: state.sessionId,
        character: CHARACTER_NAMES[state.character],
        score: state.score,
        survivalTime: Math.floor(state.elapsedSeconds),
        nickname,
      }),
    });
    if (!response.ok) {
      let detail = 'Score submission failed. Please try again.';
      try {
        const errorPayload = await response.json();
        if (errorPayload.detail) detail = errorPayload.detail;
      } catch (parseError) {
        // Keep the user-facing fallback when the server does not return JSON.
      }
      throw new Error(detail);
    }
    await response.json();
    scoreSubmitted = true;
    showSubmissionSuccess(nickname);
    document.querySelector('#submitted-summary').textContent = `Submitted as ${nickname}`;
  } catch (error) {
    submitButton.disabled = false;
    submitButton.textContent = 'SUBMIT SCORE';
    errorMessage.textContent = error.message || 'Score submission failed. Please try again.';
    errorMessage.classList.remove('hidden');
  } finally {
    isSubmittingScore = false;
  }
}

function showSubmissionSuccess(nickname) {
  document.querySelector('.nickname-area').classList.add('hidden');
  document.querySelector('#submit-button').classList.add('hidden');
  document.querySelector('#submitted-summary').textContent = `${nickname} • ${String(state.score).padStart(3, '0')}`;
  document.querySelector('#submission-success').classList.remove('hidden');
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}
