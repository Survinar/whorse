import * as THREE from 'three';
import { Horse } from '../entities/Horse.js';
import { Forest } from '../environment/Forest.js';
import { ParticleEngine } from '../entities/Particle.js';
import { Bullet } from '../entities/Bullet.js';
import { Enemy } from '../entities/Enemy.js';
import { XPOrb } from '../entities/XPOrb.js';
import { Chest } from '../entities/Chest.js';
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
    this.chests = [];
    this.bossTimer = 45.0; // Spawns a Boss Archon every 45s
    this.explorationChestTimer = 25.0; // Spawns an exploration chest every 25s

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
    this.chests.forEach(chest => chest.update(delta));
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

    // 9.5. Boss Spawner progression
    this.bossTimer -= delta;
    if (this.bossTimer <= 0) {
      this.bossTimer = 45.0; // reset
      
      // Instantiate boss off-screen first to access its procedurally generated name
      const scaleMultiplier = 1.0 + this.time * 0.005; // boss gets tankier over time
      const boss = new Enemy(this.scene, 'boss', this.horse.mesh.position);
      boss.hp = Math.round(boss.hp * scaleMultiplier);
      boss.maxHp = boss.hp;
      this.enemies.push(boss);

      // Trigger gold/red warning banner with procedural boss name
      const banner = document.createElement('div');
      banner.className = 'boss-banner';
      banner.innerText = `⚠️ BOSS: ${boss.bossName.toUpperCase()} INCOMING! ⚠️`;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 3500);

      // Play warning alert chime
      Sound.playLevelUp();
    }

    // 9.6. Exploration Chest Spawner progression
    this.explorationChestTimer -= delta;
    if (this.explorationChestTimer <= 0) {
      this.explorationChestTimer = 25.0; // reset
      const activeExplorationChests = this.chests.filter(c => c.type === 'exploration').length;
      if (activeExplorationChests < 4) {
        this.spawnExplorationChest();
      }
    }

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

    // --- Tectonic Bolt (Lightning) ---
    const activeLightning = this.horse.activeUpgrades.lightning || 0;
    if (activeLightning > 0) {
      this.horse.lightningTimer -= delta;
      if (this.horse.lightningTimer <= 0) {
        this.horse.lightningTimer = this.horse.lightningCooldown;

        const range = 14.0;
        const damage = this.horse.lightningDamage;

        // Target a random active enemy in range
        const candidates = this.enemies.filter(e => e.alive && playerPos.distanceTo(e.mesh.position) < range);
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          const targetPos = target.mesh.position.clone();

          // Deal lightning bolt damage
          const isDead = target.takeDamage(damage);
          if (isDead) {
            this.banishEnemy(target);
          }

          // Spawn electrical cyan vertical cylinder beam
          const beamGeo = new THREE.CylinderGeometry(0.12, 0.42, 12, 8);
          const beamMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff, // electrical cyan ice glow
            transparent: true,
            opacity: 0.9,
            depthWrite: false
          });
          const beamMesh = new THREE.Mesh(beamGeo, beamMat);
          beamMesh.position.copy(targetPos);
          beamMesh.position.y = 6.0;
          this.scene.add(beamMesh);

          // Sound and spark indicators
          Sound.playXP();
          this.particles.spawnHitSparks(targetPos);

          this.lightningEffects = this.lightningEffects || [];
          this.lightningEffects.push({
            mesh: beamMesh,
            geometry: beamGeo,
            material: beamMat,
            maxDuration: 0.22,
            elapsed: 0.0
          });
        }
      }
    }

    // Update active lightning effects
    if (this.lightningEffects && this.lightningEffects.length > 0) {
      this.lightningEffects.forEach(effect => {
        effect.elapsed += delta;
        const ratio = Math.min(1.0, effect.elapsed / effect.maxDuration);
        effect.mesh.scale.x = 1.0 - ratio;
        effect.mesh.scale.z = 1.0 - ratio;
        effect.material.opacity = (1.0 - ratio) * 0.9;
      });

      this.lightningEffects = this.lightningEffects.filter(effect => {
        if (effect.elapsed >= effect.maxDuration) {
          this.scene.remove(effect.mesh);
          effect.geometry.dispose();
          effect.material.dispose();
          return false;
        }
        return true;
      });
    }

    // --- Frost Shield Nova Shockwave ---
    if (this.horse.pendingFrostNova) {
      this.horse.pendingFrostNova = false;

      // Freeze all surrounding active beasts within 7 units for 2.5s!
      const freezeRadius = 7.0;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const edx = playerPos.x - enemy.mesh.position.x;
        const edz = playerPos.z - enemy.mesh.position.z;
        const distSq = edx * edx + edz * edz;

        if (distSq < freezeRadius * freezeRadius) {
          const originalSpeed = enemy.speed;
          enemy.speed = 0.0;
          enemy.flashWhite();
          enemy.flashTimer = 2.5;

          // Unfreeze after timer
          setTimeout(() => {
            if (enemy.alive) {
              enemy.speed = originalSpeed;
              enemy.resetColors();
            }
          }, 2500);
        }
      }

      // Frost Ring Shockwave expansion ring visual
      const frostRingGeo = new THREE.RingGeometry(0.1, freezeRadius, 32);
      const frostRingMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const frostMesh = new THREE.Mesh(frostRingGeo, frostRingMat);
      frostMesh.rotation.x = -Math.PI / 2;
      frostMesh.position.copy(playerPos);
      frostMesh.position.y = 0.04;
      this.scene.add(frostMesh);

      // Play sound chime
      Sound.playLevelUp();

      this.stompEffects.push({
        mesh: frostMesh,
        geometry: frostRingGeo,
        material: frostRingMat,
        maxDuration: 0.45,
        elapsed: 0.0
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
            // Check for Bouncing Ricochet Powerup
            if (this.horse.activeUpgrades.bounce > 0 && (!bullet.bounces || bullet.bounces < this.horse.ricochetBounces)) {
              bullet.bounces = (bullet.bounces || 0) + 1;
              
              const startPos = bullet.mesh.position.clone();
              const candidates = this.enemies.filter(e => e !== enemy && e.alive && startPos.distanceTo(e.mesh.position) < 7.0);
              if (candidates.length > 0) {
                // Find nearest candidate
                candidates.sort((a, b) => startPos.distanceToSquared(a.mesh.position) - startPos.distanceToSquared(b.mesh.position));
                const nextTarget = candidates[0];
                const direction = new THREE.Vector3().subVectors(nextTarget.mesh.position, startPos);
                direction.y = 0;
                direction.normalize();
                
                bullet.velocity.copy(direction).multiplyScalar(bullet.speed);
                bullet.pierce = 1; // Reset pierce for the bounced hit
                bullet.distanceTraveled = Math.max(0, bullet.distanceTraveled - 7.0); // Extend range slightly
              } else {
                bullet.alive = false;
                bullet.destroy();
              }
            } else {
              bullet.alive = false;
              bullet.destroy();
            }
          }

          // Handle Beast Banishment
          if (isDead) {
            this.banishEnemy(enemy);
          }
          break; // Exit enemy loop for this bullet
        }
      }
    }

    // 3. Horse vs Chests (Collect legendary upgrade chest)
    for (const chest of this.chests) {
      if (!chest.alive) continue;
      const dx = playerPos.x - chest.mesh.position.x;
      const dz = playerPos.z - chest.mesh.position.z;
      const distSq = dx * dx + dz * dz;

      const minDist = horseRadius + chest.radius;
      if (distSq < minDist * minDist) {
        this.collectChest(chest);
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

    // Spawn collectible XP gems (if not a boss) or the legendary chest
    if (enemy.type === 'boss') {
      const chest = new Chest(this.scene, enemy.mesh.position.clone());
      this.chests.push(chest);
    } else {
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
    }

    enemy.destroy();
  }

  /**
   * Triggers instant level up, projects visual sparkle feedback,
   * and opens the level-up cards screen forcing Legendary upgrades.
   */
  /**
   * Triggers instant level up or chest rewards, projects visual sparkle feedback,
   * and opens the level-up cards screen (forcing Legendary for boss chests).
   */
  collectChest(chest) {
    chest.alive = false;
    chest.destroy();

    if (chest.type === 'exploration') {
      // 1. Exploration Chest Reward: 40% health restoration + 60% level XP boost
      const healAmount = Math.round(this.horse.maxHp * 0.4);
      this.horse.hp = Math.min(this.horse.maxHp, this.horse.hp + healAmount);
      
      const xpReward = Math.round(this.horse.maxXp * 0.6);
      const leveledUp = this.horse.addXp(xpReward);

      this.updateHUD(); // Sync HUD values

      // 2. Play beautiful enchanted teal sparkles
      this.particles.spawnExplorationChestHalo(this.horse.mesh.position);
      for (let i = 0; i < 4; i++) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
        this.particles.spawnHitSparks(this.horse.mesh.position.clone().add(offset));
      }

      // 3. Play Web Audio synthesized bell chime
      Sound.playChestOpen();

      // 4. Show gorgeous golden floating screen banner
      this.showExplorationMessage(`+${xpReward} XP & HEALED!`);

      // 5. If we leveled up from this XP boost, open standard upgrade card select
      if (leveledUp) {
        this.pauseGame();
        setTimeout(() => {
          this.onLevelUpCallback(false); // forceLegendary = false (standard odds)
        }, 400);
      }
    } else {
      // Boss chest (original behavior)
      // 1. Instant Level Up stats change
      this.horse.instantLevelUp();
      this.updateHUD(); // Sync HUD level

      // 2. Play triumphant visual sparkles and pause
      this.pauseGame();
      this.particles.spawnLevelUpHalo(this.horse.mesh.position);
      for (let i = 0; i < 5; i++) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
        this.particles.spawnHitSparks(this.horse.mesh.position.clone().add(offset));
      }

      // 3. Play level-up sound
      Sound.playLevelUp();

      // 4. Open playing cards select overlay forcing Legendary
      setTimeout(() => {
        this.onLevelUpCallback(true); // forceLegendary = true
      }, 400);
    }
  }

  /**
   * Helper to spawn a floating exploration chest banner
   */
  showExplorationMessage(text) {
    const banner = document.createElement('div');
    banner.className = 'chest-banner';
    banner.innerText = `✨ ${text.toUpperCase()} ✨`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2500);
  }

  /**
   * Spawns an exploration chest in the forest outside camera viewport, slide-aligned from trees
   */
  spawnExplorationChest() {
    const playerPos = this.horse.mesh.position;
    
    // Choose random angle and distance between 30 and 55 units
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 25;
    
    const spawnX = playerPos.x + Math.cos(angle) * distance;
    const spawnZ = playerPos.z + Math.sin(angle) * distance;
    const spawnPos = new THREE.Vector3(spawnX, 0.35, spawnZ);

    // Reposition safely outside tree trunks using the forest collisions
    const correction = this.forest.checkCollisions(spawnPos, 0.6, 1.0);
    spawnPos.add(correction);

    const chest = new Chest(this.scene, spawnPos, 'exploration');
    this.chests.push(chest);
  }

  /**
   * Spawner engine that scales in intensity over time
   */
  spawnEngine(delta) {
    this.spawnTimer -= delta;

    if (this.spawnTimer <= 0) {
      // 1. Determine spawn count (group size) based on survival time
      let spawnCount = 1;
      if (this.time < 30) {
        spawnCount = 1;
      } else if (this.time < 60) {
        spawnCount = Math.floor(Math.random() * 2) + 1; // 1 to 2 enemies
      } else if (this.time < 120) {
        spawnCount = Math.floor(Math.random() * 2) + 2; // 2 to 3 enemies
      } else {
        spawnCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 enemies
      }

      // 2. Spawn the group of shadow beasts
      for (let i = 0; i < spawnCount; i++) {
        let type = 'wolf';
        const roll = Math.random();

        if (this.time < 30) {
          // Phase 1 (0-30s): Quick Wolves and creepy Spiders
          type = roll > 0.5 ? 'spider' : 'wolf';
        } else if (this.time < 75) {
          // Phase 2 (30-75s): Wolves, Spiders, Wisps, and charging Boars
          if (roll > 0.9) type = 'boar';
          else if (roll > 0.7) type = 'wisp';
          else if (roll > 0.35) type = 'spider';
          else type = 'wolf';
        } else {
          // Phase 3 (75s+): Heavy Ent tanks, Boars, Wisps, Spiders, and Wolves swarming
          if (roll > 0.85) type = 'ent';
          else if (roll > 0.65) type = 'boar';
          else if (roll > 0.5) type = 'wisp';
          else if (roll > 0.25) type = 'spider';
          else type = 'wolf';
        }

        // Instantiate off-screen
        const beast = new Enemy(this.scene, type, this.horse.mesh.position);
        this.enemies.push(beast);
      }

      // 3. Scale spawn frequency down aggressively over time (max 0.4s spawn interval)
      this.spawnInterval = Math.max(0.4, this.baseSpawnInterval - this.time * 0.016);
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

    const playerPos = this.horse.mesh.position;
    this.chests = this.chests.filter(c => {
      if (!c.alive) {
        c.destroy();
        return false;
      }
      // If it is an exploration chest and it is too far away from the player, despawn it
      if (c.type === 'exploration') {
        const distSq = playerPos.distanceToSquared(c.mesh.position);
        if (distSq > 95 * 95) {
          c.destroy();
          return false;
        }
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
      speed: '⚡ SPD',
      damage: '🗡️ DMG',
      fireRate: '🔥 RATE',
      pierce: '🏹 PRC',
      magnet: '🧲 MAG',
      vitality: '❤️ VIT',
      nova: '🌀 NOVA',
      orbiter: '☀️ HALO',
      trail: '🔥 TRAIL',
      stomp: '👣 STMP',
      regen: '🌿 REG',
      lightning: '⚡ BOLT',
      shield: '❄️ SHLD',
      bounce: '☄️ BNC',
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

    // Dispose Chests
    this.chests.forEach(c => c.destroy());
    this.chests = [];
    this.bossTimer = 45.0; // reset boss timer

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
