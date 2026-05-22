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

    // Arrays for skills
    this.orbiters = [];
    this.trailNodes = [];
    this.stompEffects = [];
    this.stompTimer = 0.0;
    this.trailSpawnTimer = 0.0;

    // Cache shared orbiter geometries/materials
    this.orbiterGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    this.orbiterMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff5500,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.1
    });

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

    // 6.5. Update Skills (Orbiters, Trails, and Stomps)
    this.updateSkills(delta, dx, dz);

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
   * Ticks and handles procedural visualizations and aura damage sweeps for skills
   */
  updateSkills(delta, dx, dz) {
    const isMoving = dx !== 0 || dz !== 0;
    const playerPos = this.horse.mesh.position;

    // --- Orbiting Embers (Sun Halo) ---
    const activeOrbiters = this.horse.activeUpgrades.orbiter || 0;
    if (activeOrbiters > 0) {
      // Spawn or remove orbiters to match active count
      if (this.orbiters.length !== activeOrbiters) {
        // Clear existing
        this.orbiters.forEach(orbiter => {
          this.scene.remove(orbiter.mesh);
        });
        this.orbiters = [];
        
        // Spawn exact amount
        for (let i = 0; i < activeOrbiters; i++) {
          const mesh = new THREE.Mesh(this.orbiterGeometry, this.orbiterMaterial);
          this.scene.add(mesh);
          this.orbiters.push({ mesh });
        }
      }

      // Update position and check collision
      const count = this.orbiters.length;
      const orbitRadius = 2.5;
      const orbitSpeed = 2.5;
      const damage = this.horse.orbiterDamage || 10;
      const orbiterRadius = 0.5;

      this.orbiters.forEach((orbiter, idx) => {
        const angle = this.time * orbitSpeed + (idx * Math.PI * 2) / count;
        orbiter.mesh.position.set(
          playerPos.x + Math.cos(angle) * orbitRadius,
          1.0,
          playerPos.z + Math.sin(angle) * orbitRadius
        );

        // Tick burn damage against overlapping enemies
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          const edx = orbiter.mesh.position.x - enemy.mesh.position.x;
          const edz = orbiter.mesh.position.z - enemy.mesh.position.z;
          const distSq = edx * edx + edz * edz;
          const minDist = orbiterRadius + enemy.collisionRadius;
          if (distSq < minDist * minDist) {
            const isDead = enemy.takeDamage(damage * delta);
            if (isDead) {
              this.banishEnemy(enemy);
            }
          }
        }
      });
    } else {
      // Clean up if no orbiters are active
      if (this.orbiters.length > 0) {
        this.orbiters.forEach(orbiter => this.scene.remove(orbiter.mesh));
        this.orbiters = [];
      }
    }

    // --- Embers Trail ---
    const activeTrail = this.horse.activeUpgrades.trail || 0;
    if (activeTrail > 0) {
      if (isMoving) {
        this.trailSpawnTimer += delta;
        if (this.trailSpawnTimer >= 0.15) {
          this.trailSpawnTimer = 0.0;

          const width = this.horse.trailWidth || 1.5;
          const duration = this.horse.trailDuration || 2.0;

          const geo = new THREE.CircleGeometry(width / 2, 8);
          const mat = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            side: THREE.DoubleSide
          });

          const mesh = new THREE.Mesh(geo, mat);
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.copy(playerPos);
          mesh.position.y = 0.02; // slightly above floor
          this.scene.add(mesh);

          this.trailNodes.push({
            mesh,
            geometry: geo,
            material: mat,
            maxDuration: duration,
            elapsed: 0.0,
            radius: width / 2
          });
        }
      }

      // Update active trails
      this.trailNodes.forEach(node => {
        node.elapsed += delta;
        const ratio = Math.max(0.0, 1.0 - (node.elapsed / node.maxDuration));

        if (ratio > 0.0) {
          node.mesh.scale.set(ratio, ratio, ratio);
          node.material.opacity = ratio * 0.7;

          const currentRadius = node.radius * ratio;
          const damage = this.horse.trailDamage || 12;

          for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const edx = node.mesh.position.x - enemy.mesh.position.x;
            const edz = node.mesh.position.z - enemy.mesh.position.z;
            const distSq = edx * edx + edz * edz;
            const minDist = currentRadius + enemy.collisionRadius;
            if (distSq < minDist * minDist) {
              const isDead = enemy.takeDamage(damage * delta);
              if (isDead) {
                this.banishEnemy(enemy);
              }
            }
          }
        }
      });

      // Banish expired trail nodes
      this.trailNodes = this.trailNodes.filter(node => {
        if (node.elapsed >= node.maxDuration) {
          this.scene.remove(node.mesh);
          node.geometry.dispose();
          node.material.dispose();
          return false;
        }
        return true;
      });
    }

    // --- Earth Stomp ---
    const activeStomp = this.horse.activeUpgrades.stomp || 0;
    if (activeStomp > 0) {
      this.stompTimer += delta;
      if (this.stompTimer >= this.horse.stompCooldown) {
        this.stompTimer = 0.0;

        const stompRadius = this.horse.stompRadius || 4.5;
        const stompDamage = this.horse.stompDamage || 30;

        // Visual flash and rumble sound
        Sound.playHit();
        
        // Scan surrounding enemies and stomp
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          const edx = playerPos.x - enemy.mesh.position.x;
          const edz = playerPos.z - enemy.mesh.position.z;
          const distSq = edx * edx + edz * edz;

          if (distSq < stompRadius * stompRadius) {
            const isDead = enemy.takeDamage(stompDamage);
            this.particles.spawnHitSparks(enemy.mesh.position.clone());
            if (isDead) {
              this.banishEnemy(enemy);
            }
          }
        }

        // Expanded Ring Shockwave Visual
        const ringGeo = new THREE.RingGeometry(0.1, stompRadius, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.copy(playerPos);
        ringMesh.position.y = 0.03;
        this.scene.add(ringMesh);

        this.stompEffects.push({
          mesh: ringMesh,
          geometry: ringGeo,
          material: ringMat,
          maxDuration: 0.4,
          elapsed: 0.0
        });
      }

      // Update expand rings
      this.stompEffects.forEach(effect => {
        effect.elapsed += delta;
        const ratio = Math.min(1.0, effect.elapsed / effect.maxDuration);

        effect.mesh.scale.set(ratio, ratio, ratio);
        effect.material.opacity = (1.0 - ratio) * 0.8;
      });

      // Filter expired effects
      this.stompEffects = this.stompEffects.filter(effect => {
        if (effect.elapsed >= effect.maxDuration) {
          this.scene.remove(effect.mesh);
          effect.geometry.dispose();
          effect.material.dispose();
          return false;
        }
        return true;
      });
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
      orbiter: '☀️ SUN HALO',
      trail: '🔥 EMBER TRAIL',
      stomp: '👣 EARTH STOMP',
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

    // Dispose Orbiters
    this.orbiters.forEach(orbiter => {
      this.scene.remove(orbiter.mesh);
    });
    this.orbiters = [];

    // Dispose Trails
    this.trailNodes.forEach(node => {
      this.scene.remove(node.mesh);
      node.geometry.dispose();
      node.material.dispose();
    });
    this.trailNodes = [];

    // Dispose Stomps
    this.stompEffects.forEach(effect => {
      this.scene.remove(effect.mesh);
      effect.geometry.dispose();
      effect.material.dispose();
    });
    this.stompEffects = [];

    // Dispose cached orbiter geometries/materials
    if (this.orbiterGeometry) {
      this.orbiterGeometry.dispose();
    }
    if (this.orbiterMaterial) {
      this.orbiterMaterial.dispose();
    }
    
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
