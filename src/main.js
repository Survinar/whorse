import * as THREE from 'three';
import { Game } from './game/Game.js';
import { Sound } from './game/Sound.js';

// Global Game Variables
let scene, camera, renderer, clock;
let activeGame = null;
let gameState = 'START'; // 'START' | 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER'
const keysPressed = {};

// Upgrade Pool Definitions
const UPGRADE_POOL = [
  { type: 'speed', title: 'WILD RUNNER', desc: 'Increases steed movement speed by 15%.', icon: '🏇', suit: '♠', rank: 'A' },
  { type: 'damage', title: 'HEAVY EMBERS', desc: 'Infuses warm sunlit fire, raising bullet damage by 25%.', icon: '🔥', suit: '♣', rank: 'A' },
  { type: 'fireRate', title: 'PRIMAL FRENZY', desc: 'Primal adrenaline increases rate of fire by 20%.', icon: '🏹', suit: '♠', rank: 'J' },
  { type: 'pierce', title: 'SHARP FLINT', desc: 'Ember projectiles pierce through an additional target.', icon: '☄', suit: '♦', rank: 'J' },
  { type: 'magnet', title: 'GOLDEN RESONANCE', desc: 'Extends magnet pull radius for gold sunstones by 30%.', icon: '🧲', suit: '♦', rank: 'Q' },
  { type: 'vitality', title: 'EARTH RECOVERY', desc: 'Primal soil recovery raises Max Health by 20 and heals fully.', icon: '♥', suit: '♥', rank: 'K' },
  { type: 'nova', title: 'SPLIT EMBER', desc: 'Fires an additional reverse ember bullet at 80% damage.', icon: '🌀', suit: '♣', rank: '10' },
];

// Initialize DOM hooks
const startScreen = document.getElementById('start-screen');
const hudOverlay = document.getElementById('hud-overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const levelUpDialog = document.getElementById('level-up-dialog');
const gameOverDialog = document.getElementById('game-over-dialog');
const cardContainer = document.getElementById('upgrade-cards-container');
const bestTimeVal = document.getElementById('best-time-val');

// Pause menu DOM hooks
const pauseDialog = document.getElementById('pause-dialog');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseTime = document.getElementById('pause-time');
const pauseKills = document.getElementById('pause-kills');

// Load best score on startup
updateHighScoreDisplay();

// Initialize Three.js Boilerplate
function initThree() {
  clock = new THREE.Clock();
  
  // 1. Create Scene (Daytime warm-haze green-sky)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd6b2);
  scene.fog = new THREE.FogExp2(0xbfd6b2, 0.015);

  // 2. Create Camera
  camera = new THREE.PerspectiveCamera(
    52, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
  );

  // 3. Create WebGL Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Add subtle damage overlay visual grid
  const dmgOverlay = document.createElement('div');
  dmgOverlay.className = 'damage-overlay';
  document.body.appendChild(dmgOverlay);

  // Listeners
  window.addEventListener('resize', onWindowResize);
  setupInputListeners();
}

/**
 * Capture keyboard events
 */
function setupInputListeners() {
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // Intercept Escape key when actively playing to toggle pause
    if (e.key === 'Escape' || key === 'escape') {
      if (gameState === 'PLAYING' && activeGame) {
        togglePause();
      }
      e.preventDefault();
      return;
    }
    
    keysPressed[key] = true;
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    keysPressed[key] = false;
  });
}

/**
 * Toggles the game pause state, updates stats display, and pauses/resumes sounds.
 */
function togglePause() {
  if (!activeGame) return;

  if (activeGame.isPaused) {
    pauseDialog.close();
    activeGame.resumeGame();
    Sound.startAmbientDrone();
  } else {
    activeGame.pauseGame();

    // Populate current survival metrics in the Pause screen
    const minutes = Math.floor(activeGame.time / 60);
    const seconds = Math.floor(activeGame.time % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    pauseTime.innerText = timeStr;
    pauseKills.innerText = activeGame.kills;

    pauseDialog.showModal();
    Sound.stopAmbientDrone();
  }
}

/**
 * Handle screen resizes
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Main game loop callback
 */
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1); // Clamp to prevent crazy physics jumps

  if (gameState === 'PLAYING' && activeGame) {
    activeGame.update(delta, keysPressed);
  }

  // Always render to display background fireflies and trees
  renderer.render(scene, camera);
}

/**
 * Transition into gameplay state
 */
function startGame() {
  // Initialize synth Audio Context on first interaction
  Sound.init();

  // Play entry chime
  Sound.playLevelUp();

  // Toggle HUD overlays
  startScreen.classList.remove('active');
  hudOverlay.classList.add('active');

  // Initialize Game Instance
  activeGame = new Game(scene, camera, triggerLevelUp, triggerGameOver);
  gameState = 'PLAYING';
  clock.getElapsedTime(); // Reset clock elapsed
}

/**
 * Level-Up Upgrade Cards Builder
 */
function triggerLevelUp() {
  gameState = 'LEVEL_UP';
  
  // Play leveling chime
  Sound.playLevelUp();

  // Clear card slots
  cardContainer.innerHTML = '';

  // Select 3 random unique upgrades from the pool
  const shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
  const selectedChoices = shuffled.slice(0, 3);

  selectedChoices.forEach((upgrade) => {
    // Generate card element
    const card = document.createElement('div');
    
    // Choose rarity randomly for aesthetic richness
    const roll = Math.random();
    let rarity = 'common';
    let rarityLabel = 'COMMON';
    
    if (roll > 0.88) {
      rarity = 'legendary';
      rarityLabel = 'LEGENDARY';
    } else if (roll > 0.65) {
      rarity = 'rare';
      rarityLabel = 'RARE';
    }

    const isRedSuit = (upgrade.suit === '♥' || upgrade.suit === '♦');
    const suitClass = isRedSuit ? 'suit-red' : 'suit-black';

    card.className = `upgrade-card ${rarity}`;
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-corner top-left ${suitClass}">
          <span class="card-corner-val">${upgrade.rank}</span>
          <span class="card-corner-suit">${upgrade.suit}</span>
        </div>
        <div class="card-corner bottom-right ${suitClass}">
          <span class="card-corner-val">${upgrade.rank}</span>
          <span class="card-corner-suit">${upgrade.suit}</span>
        </div>
        <div class="card-center">
          <div class="card-icon-frame">
            <div class="card-icon">${upgrade.icon}</div>
          </div>
          <div class="card-title">${upgrade.title}</div>
          <div class="card-description">${upgrade.desc}</div>
        </div>
        <div class="card-footer">
          <span class="card-rarity-badge ${rarity}">${rarityLabel}</span>
        </div>
      </div>
    `;

    // Apply upgrade and resume play on click
    card.addEventListener('click', () => {
      // Play selection chirp
      Sound.playXP();

      activeGame.horse.applyUpgrade(upgrade.type);
      levelUpDialog.close();
      
      // Resume updates
      activeGame.resumeGame();
      gameState = 'PLAYING';
    });

    cardContainer.appendChild(card);
  });

  // Open native `<dialog>` as modal (trapping page clicks)
  levelUpDialog.showModal();
}

/**
 * Defeat statistics display
 */
function triggerGameOver(stats) {
  gameState = 'GAME_OVER';

  // Save/Calculate best time in local storage
  const minutes = Math.floor(stats.time / 60);
  const seconds = Math.floor(stats.time % 60);
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const currentBest = localStorage.getItem('whorse_best_seconds') || 0;
  if (stats.time > currentBest) {
    localStorage.setItem('whorse_best_seconds', stats.time);
    localStorage.setItem('whorse_best_str', timeStr);
  }

  // Update HUD text elements
  document.getElementById('end-time').innerText = timeStr;
  document.getElementById('end-kills').innerText = stats.kills;
  document.getElementById('end-level').innerText = `Level ${stats.level}`;
  document.getElementById('end-xp').innerText = `${stats.xp} XP`;

  // Hide gameplay overlay
  hudOverlay.classList.remove('active');

  // Trigger defeat modal
  gameOverDialog.showModal();
  updateHighScoreDisplay();
}

/**
 * Reset and relaunch spirit
 */
function restartGame() {
  if (activeGame) {
    activeGame.clear();
    activeGame = null;
  }

  // Close defeat overlay
  gameOverDialog.close();

  // Reset screen red pulse vignetting
  const overlay = document.querySelector('.damage-overlay');
  if (overlay) {
    overlay.className = 'damage-overlay';
  }

  // Rebuild scene
  hudOverlay.classList.add('active');
  activeGame = new Game(scene, camera, triggerLevelUp, triggerGameOver);
  gameState = 'PLAYING';

  // Play rebirth chime and start ambient background drone
  Sound.playLevelUp();
  Sound.startAmbientDrone();
}

/**
 * High score display updater
 */
function updateHighScoreDisplay() {
  const bestStr = localStorage.getItem('whorse_best_str') || '00:00';
  bestTimeVal.innerText = bestStr;
}

// Bind Button actions
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
resumeBtn.addEventListener('click', () => {
  if (gameState === 'PLAYING' && activeGame && activeGame.isPaused) {
    togglePause();
  }
});
pauseRestartBtn.addEventListener('click', () => {
  if (activeGame) {
    pauseDialog.close();
    restartGame();
  }
});

// Protect dialog components from native Escape desynchronizations
levelUpDialog.addEventListener('cancel', (e) => e.preventDefault());
gameOverDialog.addEventListener('cancel', (e) => e.preventDefault());
pauseDialog.addEventListener('cancel', (e) => {
  e.preventDefault();
  if (gameState === 'PLAYING' && activeGame && activeGame.isPaused) {
    togglePause();
  }
});

// Bootstrap Game on load
window.addEventListener('DOMContentLoaded', () => {
  initThree();
  animate();
});
