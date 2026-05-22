import * as THREE from 'three';
import { Horse } from '../entities/Horse.js';
import { Forest } from '../environment/Forest.js';
import { ParticleEngine } from '../entities/Particle.js';
import { Bullet } from '../entities/Bullet.js';
import { Enemy } from '../entities/Enemy.js';
import { XPOrb } from '../entities/XPOrb.js';
import { Sound } from './Sound.js';

/**
 * Game.js - Core State Coordinator
 * Controls entities, spawns beasts, checks collisions, updates HUD, and triggers overlays.
 */
export class Game {
  constructor(scene, camera, onLevelUpCallback, onGameOverCallback) {
    this.scene = scene;
    this.camera = camera;
    this.onLevelUpCallback = onLevelUpCallback;
    this.onGameOverCallback = onGameOverCallback;

    this.isPaused = false;
    this.isGameOver = false;
    this.time = 0.0;
    this.kills = 0;
    this.xpCollected = 0;

    // Difficulty scaling & spawn timer
    this.spawnTimer = 1.0;
    this.baseSpawnInterval = 2.4; // Seconds between spawns
    this.spawnInterval = this.baseSpawnInterval;
    
    // Arrays for entities
    this.bullets = [];
    this.enemies = [];
    this.xpOrbs = [];

    // Initialize systems
    this.forest = new Forest(this.scene);
    this.particles = new ParticleEngine(this.scene);
    
    // Initialize Player Steed
    this.horse = new Horse(this.scene);

    // Initial camera placement
    this.updateCamera(0.1);
  }

  /**
   * Main ticking loop
   */
  update(delta, keys) {
    if (this.isPaused || this.isGameOver) return;

    // 1. Advance timers
    this.time += delta;
    this.updateHUD();

    // 2. Resolve Player Controls (WASD / Arrows)
    let dx = 0;
    let dz = 0;
    if (keys['w'] || keys['arrowup']) dz -= 1;
    if (keys['s'] || keys['arrowdown']) dz += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    this.horse.move(dx, dz, delta, this.forest);

    // 3. Smooth Camera tracking
    this.updateCamera(delta);

    // 4. Update Environmental wrap
    this.forest.update(this.horse.mesh.position);

    // 5. Weapon Auto-Targeting & Fire
    this.horse.shoot(delta, this.enemies, (start, target, dmg, pierce) => {
      // Bullet spawner callback
      const bullet = new Bullet(this.scene, start, target, dmg, pierce);
      this.bullets.push(bullet);

      // Upgrade "Chaos Nova" checks (fires opposite bullet)
      if (this.horse.activeUpgrades.nova > 0) {
        const oppDir = new THREE.Vector3().subVectors(start, target).normalize();
        const oppTarget = start.clone().addScaledVector(oppDir, 10);
        
        // Spawn additional reverse bullet
        const novBullet = new Bullet(this.scene, start, oppTarget, Math.round(dmg * 0.8), pierce);
        this.bullets.push(novBullet);
      }
    });

    // 6. Update Transitory entities
    this.bullets.forEach(b => b.update(delta));
    this.xpOrbs.forEach(xp => xp.update(delta, this.horse));
    this.enemies.forEach(e => e.update(delta, this.horse.mesh.position, this.forest, this.enemies));
    this.particles.update(delta, this.horse.mesh.position);

    // 7. Resolve Collisions Matrix
    this.checkCollisions(delta);

    // 8. Clean up dead entities
    this.garbageCollect();

    // 9. Spawner progression engine
    this.spawnEngine(delta);

    // 10. Check Level Up triggers
    if (this.horse.pendingLevelUp) {
      this.horse.pendingLevelUp = false;
      this.pauseGame();
      this.particles.spawnLevelUpHalo(this.horse.mesh.position);
      
      // Delay visual modal slightly to let level up sound/halo play first
      setTimeout(() => {
        this.onLevelUpCallback();
      }, 350);
    }
  }

  /**
   * Smooth, angled top-down camera lag-follow behind player
   */
  updateCamera(delta) {
    const playerPos = this.horse.mesh.position;
    
    // Target position
    const targetX = playerPos.x;
    const targetY = 22.0; // Elevated height
    const targetZ = playerPos.z + 11.5; // Offset slightly behind
    
    // Slerp camera position towards target
    this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.08;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;
    
    // Face down at player center body
    this.camera.lookAt(playerPos.x, 0.4, playerPos.z);
  }

  /**
   * Collision matrix checking and resolutions
   */
  checkCollisions(delta) {
    const playerPos = this.horse.mesh.position;

    // 1. Horse vs Enemies (Melee Contact Damage)
    const horseRadius = 0.7;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const dx = playerPos.x - enemy.mesh.position.x;
      const dz = playerPos.z - enemy.mesh.position.z;
      const distSq = dx * dx + dz * dz;
      
      const minDist = horseRadius + enemy.collisionRadius;
      if (distSq < minDist * minDist) {
        // Continuous contact damage tick
        const isDead = this.horse.takeDamage(enemy.damage * 0.95 * delta);
        
        // Push enemy back slightly on impact to prevent clipping
        const dist = Math.sqrt(distSq);
        if (dist > 0) {
          enemy.mesh.position.x -= (dx / dist) * 0.15;
          enemy.mesh.position.z -= (dz / dist) * 0.15;
        }

        if (isDead) {
          this.gameOver();
          return;
        }
      }
    }

    // 2. Bullets vs Enemies (Combat hit checks)
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        const dx = bullet.mesh.position.x - enemy.mesh.position.x;
        const dz = bullet.mesh.position.z - enemy.mesh.position.z;
        const distSq = dx * dx + dz * dz;

        const minDist = bullet.radius + enemy.collisionRadius;
        if (distSq < minDist * minDist) {
          // Resolve hit
          const isDead = enemy.takeDamage(bullet.damage);
          
          // Spawn sparks on contact point
          const hitPoint = bullet.mesh.position.clone();
          this.particles.spawnHitSparks(hitPoint);

          // Bullet pierce reduction
          bullet.pierce--;
          if (bullet.pierce <= 0) {
            bullet.alive = false;
            bullet.destroy();
          }

          // Handle Beast Banishment
          if (isDead) {
            this.banishEnemy(enemy);
          }
          break; // Exit enemy loop for this bullet
        }
      }
    }
  }

  /**
   * Banishes an enemy, drops XP gems, increments scores and plays SFX
   */
  banishEnemy(enemy) {
    enemy.alive = false;
    this.kills++;
    
    // Play banish/kill sound synth
    Sound.playKill();

    // Trigger death particle explosion
    this.particles.spawnDeathBurst(enemy.mesh.position);

    // Spawn collectible XP gems
    const gemsCount = enemy.xpValue;
    for (let i = 0; i < gemsCount; i++) {
      // Offset slightly to spread gems around
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        0,
        (Math.random() - 0.5) * 1.2
      );
      const spawnPos = enemy.mesh.position.clone().add(offset);
      const orb = new XPOrb(this.scene, spawnPos, 1);
      this.xpOrbs.push(orb);
    }

    enemy.destroy();
  }

  /**
   * Spawner engine that scales in intensity over time
   */
  spawnEngine(delta) {
    this.spawnTimer -= delta;

    if (this.spawnTimer <= 0) {
      // Choose archetype based on elapsed gameplay duration
      let type = 'wolf';
      const roll = Math.random();

      if (this.time < 30) {
        // Phase 1 (0-30s): mostly fast wolves
        type = roll > 0.85 ? 'wisp' : 'wolf';
      } else if (this.time < 75) {
        // Phase 2 (30-75s): wolves + floating wisps
        type = roll > 0.6 ? 'wisp' : 'wolf';
      } else {
        // Phase 3 (75s+): heavy Ent golems join the horde
        if (roll > 0.85) type = 'ent';
        else if (roll > 0.55) type = 'wisp';
        else type = 'wolf';
      }

      // Instantiate off-screen
      const beast = new Enemy(this.scene, type, this.horse.mesh.position);
      this.enemies.push(beast);

      // Scale spawn frequency down as time increases (max 0.65s spawn interval)
      this.spawnInterval = Math.max(0.65, this.baseSpawnInterval - this.time * 0.012);
      this.spawnTimer = this.spawnInterval;
    }
  }

  /**
   * Filters and disposes of dead entities from active arrays
   */
  garbageCollect() {
    this.bullets = this.bullets.filter(b => {
      if (!b.alive) {
        b.destroy();
        return false;
      }
      return true;
    });

    this.enemies = this.enemies.filter(e => {
      if (!e.alive) {
        e.destroy();
        return false;
      }
      return true;
    });

    this.xpOrbs = this.xpOrbs.filter(xp => {
      if (!xp.alive) {
        xp.destroy();
        return false;
      }
      return true;
    });
  }

  /**
   * Synchronizes internal player and game stats with the HTML HUD
   */
  updateHUD() {
    // 1. Health Bar
    const hpPercent = Math.max(0, (this.horse.hp / this.horse.maxHp) * 100);
    document.getElementById('health-fill').style.width = `${hpPercent}%`;
    document.getElementById('hp-text').innerText = `${Math.ceil(this.horse.hp)}/${this.horse.maxHp}`;

    // 2. XP Bar
    const xpPercent = Math.min(100, (this.horse.xp / this.horse.maxXp) * 100);
    document.getElementById('xp-fill').style.width = `${xpPercent}%`;
    document.getElementById('xp-text').innerText = `${this.horse.xp}/${this.horse.maxXp}`;
    
    // Level tag
    document.getElementById('level-val').innerText = this.horse.level;

    // 3. Time counter (formatted MM:SS)
    const minutes = Math.floor(this.time / 60);
    const seconds = Math.floor(this.time % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('time-val').innerText = timeStr;

    // 4. Kills counter
    document.getElementById('kill-val').innerText = this.kills;
  }

  /**
   * Refreshes the active upgrade badges list on the HUD bottom-right
   */
  refreshUpgradeHUD() {
    const hudContainer = document.getElementById('active-upgrades-hud');
    hudContainer.innerHTML = ''; // clear

    const labels = {
      speed: '⚡ SWIFTNESS',
      damage: '🗡️ DARK MIGHT',
      fireRate: '🔥 FIRE RATE',
      pierce: '🏹 PIERCE',
      magnet: '🧲 RESONANCE',
      vitality: '❤️ VITALITY',
      nova: '🌀 CHAOS NOVA',
    };

    for (const [key, val] of Object.entries(this.horse.activeUpgrades)) {
      if (val > 0) {
        const badge = document.createElement('div');
        badge.className = 'upgrade-badge';
        badge.innerHTML = `${labels[key]} <span class="upgrade-count">x${val}</span>`;
        hudContainer.appendChild(badge);
      }
    }
  }

  /**
   * Pause ticks during level up screens
   */
  pauseGame() {
    this.isPaused = true;
  }

  /**
   * Resume ticks after card selections
   */
  resumeGame() {
    this.isPaused = false;
    this.refreshUpgradeHUD();
  }

  /**
   * Triggers defeat and updates statistics overlays
   */
  gameOver() {
    this.isGameOver = true;
    
    // Play defeat sound
    Sound.playGameOver();

    // Stop low-frequency forest drones
    Sound.stopAmbientDrone();

    // Call main hook
    this.onGameOverCallback({
      time: this.time,
      kills: this.kills,
      level: this.horse.level,
      xp: this.horse.xp + this.xpCollected
    });
  }

  /**
   * Clean all models on restart
   */
  clear() {
    this.isGameOver = true;
    
    // Dispose entities
    this.bullets.forEach(b => b.destroy());
    this.enemies.forEach(e => e.destroy());
    this.xpOrbs.forEach(xp => xp.destroy());
    this.particles.clear();
    
    this.bullets = [];
    this.enemies = [];
    this.xpOrbs = [];
    
    if (this.horse) {
      this.scene.remove(this.horse.mesh);
      this.horse.legs.forEach(leg => {
        leg.pivot.traverse(child => {
          if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
      });
      this.horse.bodyGroup.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
  }
}
