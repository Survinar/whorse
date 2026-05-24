import * as THREE from 'three';
import { Game } from './game/Game.js';
import { Sound } from './game/Sound.js';
import { submitScore, fetchTopScores } from './game/Leaderboard.js';

// Global Game Variables
let scene, camera, renderer, clock;
let activeGame = null;
let gameState = 'START'; // 'START' | 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER'
const keysPressed = {};

// Upgrade Pool Definitions
const UPGRADE_POOL = [
  { type: 'speed', title: 'DAI TALPA', icon: '🏇', suit: '♠', rank: 'A' },
  { type: 'damage', title: 'BILE GRELE', icon: '🔥', suit: '♣', rank: 'A' },
  { type: 'fireRate', title: 'BINE AZI', icon: '🏹', suit: '♠', rank: 'J' },
  { type: 'pierce', title: 'SHARP FLINT', icon: '☄', suit: '♦', rank: 'J' },
  { type: 'magnet', title: 'GOLDEN RESONANCE', icon: '🧲', suit: '♦', rank: 'Q' },
  { type: 'vitality', title: 'BEER', icon: '♥', suit: '♥', rank: 'K' },
  { type: 'nova', title: 'SPLIT EMBER', icon: '🌀', suit: '♣', rank: '10' },
  { type: 'orbiter', title: 'SUN HALO', icon: '☀️', suit: '♦', rank: 'A' },
  { type: 'trail', title: 'EMBER TRAIL', icon: '🔥', suit: '♣', rank: 'Q' },
  { type: 'stomp', title: 'EARTH STOMP', icon: '👣', suit: '♠', rank: 'K' },
  { type: 'regen', title: 'SPRING OF LIFE', icon: '🌿', suit: '♥', rank: 'Q' },
  { type: 'lightning', title: 'TECTONIC BOLT', icon: '⚡', suit: '♠', rank: 'K' },
  { type: 'shield', title: 'FROST GUARD', icon: '❄️', suit: '♣', rank: 'A' },
  { type: 'bounce', title: 'RICOCHET', icon: '☄️', suit: '♦', rank: '10' },
];

/**
 * Generates custom description text incorporating the rarity multipliers
 */
function getUpgradeDescription(type, rarity) {
  const mult = rarity === 'legendary' ? 3.0 : (rarity === 'rare' ? 1.8 : 1.0);
  switch (type) {
    case 'speed':
      return `NIGGA HORSE NEVER STOPS!! Increase speed by ${Math.round(10 * mult)}%.`;
    case 'damage':
      return `Raises bullet damage by ${Math.round(15 * mult)}%.`;
    case 'fireRate':
      return `Shoot faster. Increases fire rate by ${Math.round(12 * mult)}%.`;
    case 'pierce':
      return `Projectiles pierce through ${Math.round(1 * mult)} additional target(s).`;
    case 'magnet':
      return `Extends magnet pull radius by ${Math.round(20 * mult)}%.`;
    case 'vitality':
      return `Your blood becomes stronger. Maximum health increases by ${Math.round(15 * mult)} and fully heals.`;
    case 'nova':
      return `Fires an additional bullet backwards at ${Math.round(60 * mult)}% damage.`;
    case 'orbiter':
      return `Summons ${Math.round(1 * mult)} spinning fire ember(s) dealing continuous burn damage.`;
    case 'trail':
      return `Leaves a burning path that deals ${Math.round(12 * mult)}/s damage for ${Math.round((2.0 + 0.5 * mult) * 10) / 10}s.`;
    case 'stomp':
      return `Periodic ground stomp dealing ${Math.round(30 * mult)} AoE damage inside a ${Math.round((4.5 + 1.2 * mult) * 10) / 10}m radius.`;
    case 'regen':
      return `Restores ${Math.round(1.0 * mult * 10) / 10} HP every second passively.`;
    case 'lightning':
      return `Strikes random nearby beast with lightnings every ${Math.round(Math.max(1.0, 3.5 - 0.4 * mult) * 10) / 10}s dealing ${Math.round(25 * mult)} damage.`;
    case 'shield':
      return `Blocks the next hit and freezes all nearby beasts for 2.5s. Recharges in ${Math.round(Math.max(3.5, 12.0 - 1.5 * mult) * 10) / 10}s.`;
    case 'bounce':
      return `Main bullets bounce on impact up to ${Math.round(1 * mult)} time(s) seeking nearby targets.`;
    default:
      return '';
  }
}

// Initialize DOM hooks
const startScreen = document.getElementById('start-screen');
const hudOverlay = document.getElementById('hud-overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const levelUpDialog = document.getElementById('level-up-dialog');
const gameOverDialog = document.getElementById('game-over-dialog');
const cardContainer = document.getElementById('upgrade-cards-container');
const bestTimeVal = document.getElementById('best-time-val');
const usernameInput = document.getElementById('username-input');
const leaderboardBody = document.getElementById('leaderboard-body');

// Full Leaderboard DOM Hooks
const fullLeaderboardDialog = document.getElementById('full-leaderboard-dialog');
const viewFullLbBtn = document.getElementById('view-full-lb-btn');
const closeFullLbBtn = document.getElementById('close-full-lb-btn');
const lbSearchInput = document.getElementById('lb-search-input');
const fullLeaderboardBody = document.getElementById('full-leaderboard-body');

// Pause menu DOM hooks
const pauseDialog = document.getElementById('pause-dialog');
const resumeBtn = document.getElementById('resume-btn');
const pauseEndBtn = document.getElementById('pause-end-btn');
const pauseMenuBtn = document.getElementById('pause-menu-btn');
const pauseBlessingsBtn = document.getElementById('pause-blessings-btn');
const pauseTime = document.getElementById('pause-time');
const pauseKills = document.getElementById('pause-kills');

// Active Upgrades Overview DOM Hooks
const upgradesOverviewDialog = document.getElementById('upgrades-overview-dialog');
const closeUpgradesBtn = document.getElementById('close-upgrades-btn');
const activeUpgradesGrid = document.getElementById('active-upgrades-grid');
const upgradeDetailView = document.getElementById('upgrade-detail-view');

// Load saved username
usernameInput.value = localStorage.getItem('whorse_username') || '';

// Save username when changed
usernameInput.addEventListener('input', () => {
  localStorage.setItem('whorse_username', usernameInput.value.trim());
});

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

    // Intercept '=' key during gameplay to auto level up 10 times (Debug feature)
    if (e.key === '=' && gameState === 'PLAYING' && activeGame) {
      for (let i = 0; i < 10; i++) {
        activeGame.horse.level++;
        const randomUpgrade = UPGRADE_POOL[Math.floor(Math.random() * UPGRADE_POOL.length)];
        const roll = Math.random();
        const rarity = roll > 0.88 ? 'legendary' : (roll > 0.65 ? 'rare' : 'common');
        activeGame.horse.applyUpgrade(randomUpgrade.type, rarity);
      }
      
      activeGame.horse.hp = activeGame.horse.maxHp;
      activeGame.horse.xp = 0;
      const scaleFactor = activeGame.horse.level < 20 ? 1.5 : 4.5;
      activeGame.horse.maxXp = Math.floor(10 + activeGame.horse.level * scaleFactor);
      activeGame.updateHUD();
      activeGame.refreshUpgradeHUD();

      // Trigger spectacular particle trails and play level up chime
      activeGame.particles.spawnLevelUpHalo(activeGame.horse.mesh.position);
      for (let i = 0; i < 6; i++) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
        activeGame.particles.spawnHitSparks(activeGame.horse.mesh.position.clone().add(offset));
      }
      Sound.playLevelUp();

      // Show temporary golden screen alert
      const alert = document.createElement('div');
      alert.className = 'chest-banner';
      alert.innerText = `⚡ DEBUG: LEVEL +10 (MAX HEALTH & 10 RANDOM UPGRADES!) ⚡`;
      document.body.appendChild(alert);
      setTimeout(() => alert.remove(), 2500);

      e.preventDefault();
      return;
    }

    // Intercept '-' key during gameplay to advance time by 1 minute (Debug feature)
    if (e.key === '-' && gameState === 'PLAYING' && activeGame) {
      activeGame.time += 60;
      activeGame.updateHUD();

      // Show temporary golden screen alert
      const alert = document.createElement('div');
      alert.className = 'chest-banner';
      alert.innerText = `⚡ DEBUG: TIME ADVANCED BY 1 MINUTE! ⚡`;
      document.body.appendChild(alert);
      setTimeout(() => alert.remove(), 2000);

      // Play selection blip
      Sound.playXP();

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
  } else if (gameState === 'START' && activeGame) {
    activeGame.updatePreview(delta);
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

  // Clean old showcase game and launch a fresh, active run!
  if (activeGame) {
    activeGame.clear();
    activeGame = null;
  }

  // Initialize Game Instance
  activeGame = new Game(scene, camera, triggerLevelUp, triggerGameOver);
  gameState = 'PLAYING';
  clock.getElapsedTime(); // Reset clock elapsed
  
  // Force instant WebGL render to spawn the horse instantly on screen!
  renderer.render(scene, camera);
}

/**
 * Level-Up Upgrade Cards Builder
 */
function triggerLevelUp(forceLegendary = false) {
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

    // Choose rarity (forced legendary or rolled)
    let rarity = 'common';
    let rarityLabel = 'COMMON';

    if (forceLegendary) {
      rarity = 'legendary';
      rarityLabel = 'LEGENDARY';
    } else {
      const roll = Math.random();
      if (roll > 0.88) {
        rarity = 'legendary';
        rarityLabel = 'LEGENDARY';
      } else if (roll > 0.65) {
        rarity = 'rare';
        rarityLabel = 'RARE';
      }
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
          <div class="card-description">${getUpgradeDescription(upgrade.type, rarity)}</div>
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

      activeGame.horse.applyUpgrade(upgrade.type, rarity);
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

  // 1. Save Last Run Metrics
  localStorage.setItem('whorse_last_time', timeStr);
  localStorage.setItem('whorse_last_level', stats.level);
  localStorage.setItem('whorse_last_kills', stats.kills);
  localStorage.setItem('whorse_last_distance', stats.distanceRun || 0);
  localStorage.setItem('whorse_last_bosses', stats.bossesKilled || 0);

  // 2. Calculate and Save All-Time Records
  const currentBest = parseFloat(localStorage.getItem('whorse_best_seconds') || '0');
  if (stats.time > currentBest) {
    localStorage.setItem('whorse_best_seconds', stats.time);
    localStorage.setItem('whorse_best_str', timeStr);
  }

  const currentBestLevel = parseInt(localStorage.getItem('whorse_best_level') || '1');
  if (stats.level > currentBestLevel) {
    localStorage.setItem('whorse_best_level', stats.level);
  }

  const currentBestKills = parseInt(localStorage.getItem('whorse_best_kills') || '0');
  if (stats.kills > currentBestKills) {
    localStorage.setItem('whorse_best_kills', stats.kills);
  }

  const currentBestDist = parseFloat(localStorage.getItem('whorse_best_distance') || '0');
  if ((stats.distanceRun || 0) > currentBestDist) {
    localStorage.setItem('whorse_best_distance', stats.distanceRun || 0);
  }

  const currentBestBosses = parseInt(localStorage.getItem('whorse_best_bosses') || '0');
  if ((stats.bossesKilled || 0) > currentBestBosses) {
    localStorage.setItem('whorse_best_bosses', stats.bossesKilled || 0);
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

  // 3. Submit score to global leaderboard
  const username = (usernameInput.value.trim()) || 'Anonymous';
  submitScore(username, stats).then(() => {
    // Refresh leaderboard after submission
    refreshLeaderboard();
  });
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
  
  // Force instant WebGL render to spawn the horse instantly on screen!
  renderer.render(scene, camera);

  // Play rebirth chime and start ambient background drone
  Sound.playLevelUp();
  Sound.startAmbientDrone();
}

/**
 * High score display updater
 */
function updateHighScoreDisplay() {
  // 1. Last Run Metrics
  const lastTime = localStorage.getItem('whorse_last_time') || '00:00';
  const lastLevel = localStorage.getItem('whorse_last_level') || '1';
  const lastKills = localStorage.getItem('whorse_last_kills') || '0';
  const lastDist = parseFloat(localStorage.getItem('whorse_last_distance') || '0').toFixed(0);
  const lastBosses = localStorage.getItem('whorse_last_bosses') || '0';

  document.getElementById('last-time-val').innerText = lastTime;
  document.getElementById('last-level-val').innerText = lastLevel;
  document.getElementById('last-kills-val').innerText = lastKills;
  document.getElementById('last-dist-val').innerText = `${lastDist}m`;
  document.getElementById('last-bosses-val').innerText = lastBosses;

  // 2. All-Time Records
  const bestTime = localStorage.getItem('whorse_best_str') || '00:00';
  const bestLevel = localStorage.getItem('whorse_best_level') || '1';
  const bestKills = localStorage.getItem('whorse_best_kills') || '0';
  const bestDist = parseFloat(localStorage.getItem('whorse_best_distance') || '0').toFixed(0);
  const bestBosses = localStorage.getItem('whorse_best_bosses') || '0';

  document.getElementById('best-time-val').innerText = bestTime;
  document.getElementById('best-level-val').innerText = bestLevel;
  document.getElementById('best-kills-val').innerText = bestKills;
  document.getElementById('best-dist-val').innerText = `${bestDist}m`;
  document.getElementById('best-bosses-val').innerText = bestBosses;
}

// Bind Button actions
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
resumeBtn.addEventListener('click', () => {
  if (gameState === 'PLAYING' && activeGame && activeGame.isPaused) {
    togglePause();
  }
});
pauseEndBtn.addEventListener('click', () => {
  if (activeGame) {
    pauseDialog.close();
    activeGame.gameOver(); // Ends run and submits score
  }
});

pauseMenuBtn.addEventListener('click', () => {
  if (activeGame) {
    activeGame.clear();
    activeGame = null;
  }
  pauseDialog.close();
  Sound.stopAmbientDrone();
  gameState = 'START';
  hudOverlay.classList.remove('active');
  startScreen.classList.add('active');

  // Relaunch the blurred forest preview game
  activeGame = new Game(scene, camera, triggerLevelUp, triggerGameOver);
  updateHighScoreDisplay();
  refreshLeaderboard();
});

// Active Upgrades Overview Controller functions
let openedOverviewFromPause = false;

function openUpgradesOverview(fromPause = false) {
  if (!activeGame) return;
  // If not already paused (i.e. opened from HUD button), pause now
  if (!activeGame.isPaused) {
    activeGame.pauseGame();
    Sound.stopAmbientDrone();
  }
  openedOverviewFromPause = fromPause;



  // Reset grid & detail views
  activeUpgradesGrid.innerHTML = '';
  upgradeDetailView.innerHTML = '<p class="detail-placeholder">Select a blessing card above to view detail</p>';

  const upgradeMetadata = {
    speed: { title: 'DAI TALPA', icon: '🏇', desc: 'NIGGA HORSE NEVER STOPS!! Increases maximum movement speed.' },
    damage: { title: 'BILE GRELE', icon: '🔥', desc: 'Raises your bullet collision damage.' },
    fireRate: { title: 'BINE AZI', icon: '🏹', desc: 'Shoots sparks faster by decreasing weapon cooldowns.' },
    pierce: { title: 'SHARP FLINT', icon: '☄', desc: 'Projectiles pierce through additional shadow beasts.' },
    magnet: { title: 'GOLDEN RESONANCE', icon: '🧲', desc: 'Extends your magnet resonance pull radius to collect XP orbs further away.' },
    vitality: { title: 'BEER', icon: '♥', desc: 'Raises maximum horse health and fully heals HP.' },
    nova: { title: 'SPLIT EMBER', icon: '🌀', desc: 'Fires an additional bullet backwards at partial damage.' },
    orbiter: { title: 'SUN HALO', icon: '☀️', desc: 'Summons spinning fire embers dealing continuous burn damage.' },
    trail: { title: 'EMBER TRAIL', icon: '🔥', desc: 'Leaves a burning trail path behind that burns traversing beasts.' },
    stomp: { title: 'EARTH STOMP', icon: '👣', desc: 'Triggers periodic ground stomps dealing AoE force damage.' },
    regen: { title: 'SPRING OF LIFE', icon: '🌿', desc: 'Restores health points passively every second.' },
    lightning: { title: 'TECTONIC BOLT', icon: '⚡', desc: 'Strikes random nearby shadow beasts with lightnings.' },
    shield: { title: 'FROST GUARD', icon: '❄️', desc: 'Frost guard blocks the next hit and freezes nearby enemies on rupture.' },
    bounce: { title: 'RICOCHET', icon: '☄️', desc: 'Main sparks bounce on impact, seeking nearby targets.' },
  };

  for (const [key, val] of Object.entries(activeGame.horse.activeUpgrades)) {
    const meta = upgradeMetadata[key];
    if (meta) {
      const tile = document.createElement('div');
      tile.className = 'upgrade-tile';
      tile.innerHTML = `
        <div class="upgrade-tile-left">
          <span class="upgrade-tile-icon">${meta.icon}</span>
          <span class="upgrade-tile-name">${meta.title}</span>
        </div>
        <span class="upgrade-tile-count">x${val}</span>
      `;
      tile.addEventListener('click', () => {
        // Mark selected tile
        document.querySelectorAll('.upgrade-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');

        // Show detailed description
        upgradeDetailView.innerHTML = `
          <div style="text-align: center; width: 100%;">
            <strong style="color: var(--accent-gold); letter-spacing: 0.05em; font-family: var(--font-display); font-size: 1.05rem; display: block; margin-bottom: 6px;">${meta.icon} ${meta.title} (Level ${val})</strong>
            <p style="color: var(--text-primary); font-size: 0.85rem; line-height: 1.45; margin: 0;">${meta.desc}</p>
          </div>
        `;
      });
      activeUpgradesGrid.appendChild(tile);
    }
  }

  upgradesOverviewDialog.showModal();
}

function closeUpgradesOverview() {
  upgradesOverviewDialog.close();

  if (openedOverviewFromPause) {
    // Return to the pause menu instead of resuming gameplay
    openedOverviewFromPause = false;
    pauseDialog.showModal();
  } else if (activeGame) {
    activeGame.resumeGame();
    Sound.startAmbientDrone();
  }
}

// Bind active upgrades overview action listeners
closeUpgradesBtn.addEventListener('click', closeUpgradesOverview);
window.addEventListener('open-upgrades-overview', () => openUpgradesOverview(false));
pauseBlessingsBtn.addEventListener('click', () => {
  pauseDialog.close();
  openUpgradesOverview(true);
});
upgradesOverviewDialog.addEventListener('cancel', (e) => {
  e.preventDefault();
  closeUpgradesOverview();
});

// Protect dialog components from native Escape desynchronizations
levelUpDialog.addEventListener('cancel', (e) => e.preventDefault());
gameOverDialog.addEventListener('cancel', (e) => e.preventDefault());
fullLeaderboardDialog.addEventListener('cancel', (e) => e.preventDefault());
pauseDialog.addEventListener('cancel', (e) => {
  e.preventDefault();
  if (gameState === 'PLAYING' && activeGame && activeGame.isPaused) {
    togglePause();
  }
});

// Full Leaderboard Action Listeners
viewFullLbBtn.addEventListener('click', openFullLeaderboard);
closeFullLbBtn.addEventListener('click', () => {
  fullLeaderboardDialog.close();
});

// Live Client-Side Leaderboard Search Filter & Interactive Sorting
let allLeaderboardScores = [];
let currentSortKey = 'time';

lbSearchInput.addEventListener('input', () => {
  const query = lbSearchInput.value.trim().toLowerCase();
  if (!query) {
    renderFullLeaderboard(allLeaderboardScores);
    return;
  }
  const filtered = allLeaderboardScores.filter(entry => 
    (entry.username || 'Anonymous').toLowerCase().includes(query)
  );
  renderFullLeaderboard(filtered);
});

// Configure Click Sorting Event Listeners
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#full-lb-header-row th.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const key = header.getAttribute('data-sort-key');
      if (!key) return;
      
      currentSortKey = key;
      
      // Sort cached list descending by selected metric
      allLeaderboardScores.sort((a, b) => {
        const valA = a[key] || 0;
        const valB = b[key] || 0;
        return valB - valA;
      });

      // Update header highlighting & icons
      document.querySelectorAll('#full-lb-header-row th.sortable').forEach(h => {
        h.classList.remove('active-sort');
        const icon = h.querySelector('.sort-icon');
        if (icon) icon.textContent = '';
      });
      
      header.classList.add('active-sort');
      const icon = header.querySelector('.sort-icon');
      if (icon) icon.textContent = '▼';

      // Re-render, respecting current search query
      const query = lbSearchInput.value.trim().toLowerCase();
      if (!query) {
        renderFullLeaderboard(allLeaderboardScores);
      } else {
        const filtered = allLeaderboardScores.filter(entry => 
          (entry.username || 'Anonymous').toLowerCase().includes(query)
        );
        renderFullLeaderboard(filtered);
      }
    });
  });
});

/**
 * Helper to wrap any promise with a timeout.
 */
function withTimeout(promise, ms = 5000) {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Network query timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Open the full leaderboard modal and fetch the top 100 runs.
 */
function openFullLeaderboard() {
  // Clear search and reset sort indicators back to default 'time'
  lbSearchInput.value = '';
  currentSortKey = 'time';
  
  document.querySelectorAll('#full-lb-header-row th.sortable').forEach(h => {
    h.classList.remove('active-sort');
    const icon = h.querySelector('.sort-icon');
    if (icon) icon.textContent = '';
  });
  
  const timeHeader = document.querySelector('#full-lb-header-row th[data-sort-key="time"]');
  if (timeHeader) {
    timeHeader.classList.add('active-sort');
    const icon = timeHeader.querySelector('.sort-icon');
    if (icon) icon.textContent = '▼';
  }

  // OPTIMISTIC RENDER: If we already have cached scores, render them immediately
  // to avoid showing a blank loading table on reopen.
  if (allLeaderboardScores && allLeaderboardScores.length > 0) {
    allLeaderboardScores.sort((a, b) => (b.time || 0) - (a.time || 0));
    renderFullLeaderboard(allLeaderboardScores);
  } else {
    fullLeaderboardBody.innerHTML = '<tr><td colspan="7" class="lb-loading">Loading top 100 runs...</td></tr>';
  }
  
  fullLeaderboardDialog.showModal();

  // Background fetch with 5-second safety timeout
  withTimeout(fetchTopScores(100), 5000).then(scores => {
    allLeaderboardScores = scores;
    
    // Only re-render if the user hasn't started searching or sorted by a custom column in the meantime
    const query = lbSearchInput.value.trim().toLowerCase();
    if (!query && currentSortKey === 'time') {
      renderFullLeaderboard(scores);
    }
  }).catch((err) => {
    console.warn('[Leaderboard] Background refresh failed or timed out:', err);
    // Show network timeout error only if we don't have any cached scores on screen
    if (!allLeaderboardScores || allLeaderboardScores.length === 0) {
      fullLeaderboardBody.innerHTML = '<tr><td colspan="7" class="lb-loading">Failed to load leaderboard (network timeout)</td></tr>';
    }
  });
}

/**
 * Render the fetched scores list into the full leaderboard table.
 * @param {Array} scores - List of scores to display
 */
function renderFullLeaderboard(scores) {
  const currentUsername = (usernameInput.value.trim()) || 'Anonymous';
  
  if (scores.length === 0) {
    fullLeaderboardBody.innerHTML = '<tr><td colspan="7" class="lb-loading">No matching runs found</td></tr>';
    return;
  }

  fullLeaderboardBody.innerHTML = '';
  scores.forEach((entry) => {
    // Find absolute rank in the currently sorted overall leaderboard
    const absoluteIndex = allLeaderboardScores.findIndex(s => s.id === entry.id);
    const rank = absoluteIndex !== -1 ? absoluteIndex + 1 : '?';
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    const mins = Math.floor((entry.time || 0) / 60);
    const secs = Math.floor((entry.time || 0) % 60);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const isYou = entry.username === currentUsername;

    const tr = document.createElement('tr');
    if (isYou) tr.classList.add('lb-you');
    tr.innerHTML = `
      <td>${medal}</td>
      <td class="lb-rider-name">${escapeHTML(entry.username || 'Anonymous')}</td>
      <td>${timeStr}</td>
      <td>${entry.level || 1}</td>
      <td>${entry.kills || 0}</td>
      <td>${Math.round(entry.distance || 0)}m</td>
      <td>${entry.bosses || 0}</td>
    `;
    fullLeaderboardBody.appendChild(tr);
  });
}

/**
 * Fetch and render global leaderboard
 */
function refreshLeaderboard() {
  const currentUsername = (usernameInput.value.trim()) || 'Anonymous';

  fetchTopScores(3).then(scores => {
    if (scores.length === 0) {
      leaderboardBody.innerHTML = '<tr><td colspan="7" class="lb-loading">No runs yet — be the first!</td></tr>';
      return;
    }

    leaderboardBody.innerHTML = '';
    scores.forEach((entry, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      const mins = Math.floor((entry.time || 0) / 60);
      const secs = Math.floor((entry.time || 0) % 60);
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const isYou = entry.username === currentUsername;

      const tr = document.createElement('tr');
      if (isYou) tr.classList.add('lb-you');
      tr.innerHTML = `
        <td>${medal}</td>
        <td class="lb-rider-name">${escapeHTML(entry.username || 'Anonymous')}</td>
        <td>${timeStr}</td>
        <td>${entry.level || 1}</td>
        <td>${entry.kills || 0}</td>
        <td>${Math.round(entry.distance || 0)}m</td>
        <td>${entry.bosses || 0}</td>
      `;
      leaderboardBody.appendChild(tr);
    });
  }).catch(() => {
    leaderboardBody.innerHTML = '<tr><td colspan="7" class="lb-loading">Failed to load leaderboard</td></tr>';
  });
}

/** Escape HTML to prevent XSS from usernames */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Bootstrap Game on load
window.addEventListener('DOMContentLoaded', () => {
  initThree();
  // Create the initial Game instance instantly so it renders the blurred forest background in the start screen!
  activeGame = new Game(scene, camera, triggerLevelUp, triggerGameOver);
  gameState = 'START';
  updateHighScoreDisplay();
  refreshLeaderboard();
  animate();
});
