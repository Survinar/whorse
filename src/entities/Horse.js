import * as THREE from 'three';
import { Sound } from '../game/Sound.js';

/**
 * Horse.js - The Player Horse Entity
 * Handles procedural 3D model creation, movement, trotting animations, stats, and auto-shooting.
 */
export class Horse {
  constructor(scene) {
    this.scene = scene;
    
    // Core Gameplay Stats
    this.hp = 100;
    this.maxHp = 100;
    this.level = 1;
    this.xp = 0;
    this.maxXp = 10;
    this.speed = 6.0;
    this.damage = 15;
    this.fireRate = 1.0; // Shots per second
    this.range = 22.0;
    this.pierce = 1;
    this.magnetRange = 5.5;
    
    // Skill backing statistics
    this.novaMult = 0.6;
    this.orbiterDamage = 0;
    this.trailDamage = 0;
    this.trailWidth = 1.5;
    this.trailDuration = 2.0;
    this.stompDamage = 0;
    this.stompRadius = 4.5;
    this.stompCooldown = 4.5;
    
    // Newly Added Skills
    this.regenRate = 0.0;
    this.lightningCooldown = 3.5;
    this.lightningTimer = 0.0;
    this.lightningDamage = 0;
    this.shieldCooldown = 12.0;
    this.shieldTimer = 0.0;
    this.hasShield = false;
    this.ricochetBounces = 0;
    this.pendingFrostNova = false;
    
    // Auto-Shooting Cooldown Timer (in seconds)
    this.shootCooldown = 0.0;
    
    // Track count of active upgrades
    this.activeUpgrades = {
      speed: 0,
      damage: 0,
      fireRate: 0,
      pierce: 0,
      magnet: 0,
      vitality: 0,
      nova: 0,
      orbiter: 0,
      trail: 0,
      stomp: 0,
      regen: 0,
      lightning: 0,
      shield: 0,
      bounce: 0,
    };
    
    // Construct the 3D Procedural Mesh Group
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
    
    this.buildModel();
    
    // Animation state variables
    this.walkCycle = 0;
    this.baseBodyY = 1.1; // Default floating elevation off ground
  }

  /**
   * Procedurally builds a highly detailed, premium styled 3D horse model.
   * Leverages glossy dark materials combined with neon emissive glow accents.
   */
  buildModel() {
    // 1. Materials
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c0e,      // Ultra-sleek charcoal black coat
      roughness: 0.35,
      metalness: 0.2,
    });
    
    const glowingManeMat = new THREE.MeshStandardMaterial({
      color: 0x3d1e18,      // Deep rich dark mahogany hair
      emissive: 0xd35400,   // Radiant orange fire shimmer
      emissiveIntensity: 0.6,
      roughness: 0.8,
    });

    const glowingEyeMat = new THREE.MeshStandardMaterial({
      color: 0xffb300,      // Golden sunlit eyes
      emissive: 0xff6600,
      emissiveIntensity: 2.5,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,      // Rich metallic solar gold
      roughness: 0.15,
      metalness: 0.9,
    });

    const glowingHornMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,      // Solar gold unicorn horn
      emissive: 0xffaa00,
      emissiveIntensity: 3.0,
      roughness: 0.1,
    });

    // 2. Torso / Body Group (centered relative to parent group)
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = this.baseBodyY;
    this.mesh.add(this.bodyGroup);

    // Torso Cylinder
    const torsoGeo = new THREE.CylinderGeometry(0.5, 0.48, 1.8, 8);
    const torso = new THREE.Mesh(torsoGeo, obsidianMat);
    torso.rotation.x = Math.PI / 2; // Lay flat
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.bodyGroup.add(torso);

    // Gilded Back Saddle Plate
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.54, 0.95), goldMat);
    saddle.position.set(0, 0.1, -0.05); // sits on back
    saddle.castShadow = true;
    this.bodyGroup.add(saddle);

    // Gilded Chest Collar Armor
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.35, 0.35), goldMat);
    chestPlate.position.set(0, 0.35, 0.72);
    chestPlate.rotation.x = -Math.PI / 6;
    chestPlate.castShadow = true;
    this.bodyGroup.add(chestPlate);

    // 3. Neck & Head
    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 0.6, 0.7); // offset up and front
    neckGroup.rotation.x = -Math.PI / 4; // Angled neck
    this.bodyGroup.add(neckGroup);

    // Neck Box
    const neckGeo = new THREE.BoxGeometry(0.35, 0.9, 0.4);
    const neck = new THREE.Mesh(neckGeo, obsidianMat);
    neck.position.y = 0.35;
    neck.castShadow = true;
    neck.receiveShadow = true;
    neckGroup.add(neck);

    // Refined Equine Skull (head back)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.48), obsidianMat);
    head.position.set(0, 0.75, 0.12);
    head.rotation.x = Math.PI / 6;
    head.castShadow = true;
    head.receiveShadow = true;
    neckGroup.add(head);

    // Tapered Muzzle (snout front)
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.45), obsidianMat);
    muzzle.position.set(0, 0.65, 0.48);
    muzzle.rotation.x = Math.PI / 6;
    muzzle.castShadow = true;
    muzzle.receiveShadow = true;
    neckGroup.add(muzzle);

    // Mythical Glowing Unicorn Horn / Crown Crest
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 4), glowingHornMat);
    horn.position.set(0, 1.05, 0.24);
    horn.rotation.x = -Math.PI / 4; // slant forward
    horn.castShadow = true;
    neckGroup.add(horn);

    // Glowing Eyes (Left & Right)
    const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
    
    const leftEye = new THREE.Mesh(eyeGeo, glowingEyeMat);
    leftEye.position.set(-0.2, 0.85, 0.22);
    neckGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, glowingEyeMat);
    rightEye.position.set(0.2, 0.85, 0.22);
    neckGroup.add(rightEye);

    // Ears (Left & Right)
    const earGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
    
    const leftEar = new THREE.Mesh(earGeo, obsidianMat);
    leftEar.position.set(-0.12, 1.0, 0.0);
    leftEar.rotation.z = 0.1;
    leftEar.castShadow = true;
    neckGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, obsidianMat);
    rightEar.position.set(0.12, 1.0, 0.0);
    rightEar.rotation.z = -0.1;
    rightEar.castShadow = true;
    neckGroup.add(rightEar);

    // 4. Gilded Flowing Mane (3 layers)
    this.maneStrands = [];
    const maneOffsets = [
      { y: 0.58, z: -0.22, length: 0.65 },
      { y: 0.38, z: -0.22, length: 0.75 },
      { y: 0.18, z: -0.22, length: 0.55 },
    ];
    maneOffsets.forEach((off, idx) => {
      const strand = new THREE.Mesh(new THREE.BoxGeometry(0.12, off.length, 0.22), glowingManeMat);
      strand.position.set(0, off.y, off.z);
      strand.castShadow = true;
      neckGroup.add(strand);
      this.maneStrands.push(strand);
    });

    // 5. Four Legs (Pivoted at hips/shoulders inside main mesh to allow rotation)
    this.legs = [];
    const legSpacingX = 0.32;
    const legSpacingZ = 0.65;
    const legLength = 1.0;
    
    const legPositions = [
      { name: 'FL', x: -legSpacingX, z: legSpacingZ, phase: 0 },
      { name: 'FR', x: legSpacingX, z: legSpacingZ, phase: Math.PI },
      { name: 'BL', x: -legSpacingX, z: -legSpacingZ, phase: Math.PI },
      { name: 'BR', x: legSpacingX, z: -legSpacingZ, phase: 0 },
    ];

    legPositions.forEach((pos) => {
      const legPivot = new THREE.Group();
      // Pivot is placed at the hip/shoulder joint
      legPivot.position.set(pos.x, this.baseBodyY - 0.25, pos.z);
      this.mesh.add(legPivot);

      // Leg bone (box)
      const boneGeo = new THREE.BoxGeometry(0.18, legLength, 0.18);
      const bone = new THREE.Mesh(boneGeo, obsidianMat);
      bone.position.y = -legLength / 2; // hang down from pivot
      bone.castShadow = true;
      bone.receiveShadow = true;
      legPivot.add(bone);

      // Gold knee armor band
      const kneeArmor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.22), goldMat);
      kneeArmor.position.y = -legLength / 2;
      kneeArmor.castShadow = true;
      legPivot.add(kneeArmor);

      // Hoof (at the bottom - Gilded!)
      const hoofGeo = new THREE.BoxGeometry(0.2, 0.15, 0.2);
      const hoof = new THREE.Mesh(hoofGeo, goldMat);
      hoof.position.y = -legLength - 0.025;
      hoof.castShadow = true;
      legPivot.add(hoof);

      this.legs.push({
        pivot: legPivot,
        phase: pos.phase,
      });
    });

    // 6. Gilded Flowing Tail Group (multi-strands cascading)
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 0.3, -0.9); // back of torso
    this.tailGroup.rotation.x = Math.PI / 6; // slope down
    this.bodyGroup.add(this.tailGroup);

    this.tailStrands = [];
    const tailOffsets = [
      { x: 0, y: -0.4, z: 0, scaleY: 0.9 },
      { x: -0.08, y: -0.5, z: -0.06, scaleY: 1.1 },
      { x: 0.08, y: -0.5, z: -0.06, scaleY: 1.1 },
    ];
    tailOffsets.forEach((off) => {
      const strand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0 * off.scaleY, 0.08), glowingManeMat);
      strand.position.set(off.x, off.y, off.z);
      strand.castShadow = true;
      this.tailGroup.add(strand);
      this.tailStrands.push(strand);
    });
  }

  /**
   * Apply physics/controls input and orient toward movement direction
   */
  move(dx, dz, delta, forest) {
    const isMoving = dx !== 0 || dz !== 0;
    
    if (isMoving) {
      // Normalize vector
      const len = Math.sqrt(dx * dx + dz * dz);
      const moveX = (dx / len) * this.speed * delta;
      const moveZ = (dz / len) * this.speed * delta;

      // Apply movement to mesh position
      this.mesh.position.x += moveX;
      this.mesh.position.z += moveZ;

      // Smoothly rotate horse to face movement direction
      const targetRotation = Math.atan2(moveX, moveZ);
      
      // Handle modular wrapping differences
      let diff = targetRotation - this.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * 0.15; // Smooth slerp interpolation

      // Handle Forest Collision Resolution (sliding)
      const correction = forest.checkCollisions(this.mesh.position, 0.7);
      this.mesh.position.add(correction);
    }

    this.animate(delta, isMoving);
  }

  /**
   * Sine-wave driven running animations for legs and torso
   */
  animate(delta, isMoving) {
    if (isMoving) {
      // Advance step cycle based on movement speed
      this.walkCycle += delta * this.speed * 2.2;

      // Trot Leg rotation: opposite legs swing in synchronization
      const maxSwing = 0.52; // Max angle swing in radians
      this.legs.forEach((leg) => {
        leg.pivot.rotation.x = Math.sin(this.walkCycle + leg.phase) * maxSwing;
      });

      // Body bobs rhythmically and pitches forward slightly
      this.bodyGroup.position.y = this.baseBodyY + Math.abs(Math.sin(this.walkCycle * 2)) * 0.12;
      this.bodyGroup.rotation.x = 0.08;

      // Dynamic hair sways!
      if (this.tailGroup) {
        this.tailGroup.rotation.z = Math.sin(this.walkCycle) * 0.25; // wave side-to-side
        this.tailGroup.rotation.x = Math.PI / 6 + Math.abs(Math.sin(this.walkCycle)) * 0.1; // lift up and down
      }
      if (this.maneStrands) {
        this.maneStrands.forEach((strand, idx) => {
          strand.rotation.z = Math.sin(this.walkCycle + idx * 0.5) * 0.06;
        });
      }
    } else {
      // Smoothly return legs to vertical standing state
      this.legs.forEach((leg) => {
        leg.pivot.rotation.x *= 0.85;
      });
      
      // Settle body back to default floating height and level orientation
      this.bodyGroup.position.y += (this.baseBodyY - this.bodyGroup.position.y) * 0.15;
      this.bodyGroup.rotation.x *= 0.85;
      this.walkCycle = 0;

      // Return tail and mane smoothly to standard positions
      if (this.tailGroup) {
        this.tailGroup.rotation.z *= 0.85;
        this.tailGroup.rotation.x += (Math.PI / 6 - this.tailGroup.rotation.x) * 0.15;
      }
      if (this.maneStrands) {
        this.maneStrands.forEach((strand) => {
          strand.rotation.z *= 0.85;
        });
      }
    }
  }

  /**
   * Handle weapon auto-targeting and automatic fire
   */
  shoot(delta, enemies, spawnBulletCallback) {
    // 1. Tick regeneration
    if (this.regenRate && this.regenRate > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenRate * delta);
    }

    // 2. Tick frost shield recharges
    if (this.activeUpgrades.shield > 0 && !this.hasShield) {
      this.shieldTimer -= delta;
      if (this.shieldTimer <= 0) {
        this.hasShield = true;
      }
    }

    // Progress firing cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }

    if (this.shootCooldown <= 0 && enemies.length > 0) {
      // Find nearest active enemy within range
      let nearestEnemy = null;
      let nearestDistSq = this.range * this.range;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.mesh.position.x - this.mesh.position.x;
        const dz = enemy.mesh.position.z - this.mesh.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < nearestDistSq) {
          nearestDistSq = distSq;
          nearestEnemy = enemy;
        }
      }

      // Fire weapon if valid target in range
      if (nearestEnemy) {
        // Compute launch position (slightly forward near the head)
        const spawnPos = new THREE.Vector3(0, 1.4, 0.7)
          .applyMatrix4(this.mesh.matrixWorld);

        // Target center body
        const targetPos = nearestEnemy.mesh.position.clone();
        targetPos.y = 1.0; 

        // Fire bullet
        spawnBulletCallback(spawnPos, targetPos, this.damage, this.pierce);
        
        // Play laser SFX
        Sound.playShoot();

        // Reset cooldown: fireRate is shots per second, cooldown is 1.0 / fireRate
        this.shootCooldown = 1.0 / this.fireRate;
      }
    }
  }

  /**
   * Apply health changes
   */
  takeDamage(amount) {
    // If shield is active, completely block damage and trigger Frost Nova shockwave
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldTimer = this.shieldCooldown;
      this.pendingFrostNova = true;

      // Visual flash indicator for block on HUD damage overlay
      const overlay = document.querySelector('.damage-overlay');
      if (overlay) {
        overlay.classList.add('block-flash');
        setTimeout(() => overlay.classList.remove('block-flash'), 150);
      }
      return false; // Did not die
    }

    this.hp = Math.max(0, this.hp - amount);
    
    // Add visual damage vignette flash on UI
    const overlay = document.querySelector('.damage-overlay');
    if (overlay) {
      overlay.classList.add('flash');
      setTimeout(() => overlay.classList.remove('flash'), 100);
      
      // Continuous pulse vignette if low health
      if (this.hp < this.maxHp * 0.3) {
        overlay.classList.add('low-hp');
      } else {
        overlay.classList.remove('low-hp');
      }
    }
    
    Sound.playHit();
    return this.hp <= 0;
  }

  /**
   * Leveling mechanics
   */
  addXp(amount) {
    this.xp += amount;
    
    if (this.xp >= this.maxXp) {
      this.xp -= this.maxXp;
      this.level++;
      
      // Scale XP cap per level to maintain progression difficulty
      this.maxXp = Math.floor(10 + this.level * 4.5);
      
      return true; // Leveled up!
    }
    return false;
  }

  /**
   * Instantly levels up the player from picking up a chest,
   * resetting XP and fully healing back to max HP.
   */
  instantLevelUp() {
    this.level++;
    this.xp = 0;
    this.maxXp = Math.floor(10 + this.level * 4.5);
    this.hp = this.maxHp;
    
    // Remove low health UI pulse if fully healed
    const overlay = document.querySelector('.damage-overlay');
    if (overlay) overlay.classList.remove('low-hp');
  }

  /**
   * Apply permanent stat upgrades based on selected blessings
   */
  applyUpgrade(type, rarity = 'common') {
    const mult = rarity === 'legendary' ? 3.0 : (rarity === 'rare' ? 1.8 : 1.0);
    
    switch(type) {
      case 'speed':
        this.activeUpgrades.speed++;
        this.speed *= (1.0 + 0.10 * mult);
        break;
      case 'damage':
        this.activeUpgrades.damage++;
        this.damage = Math.round(this.damage * (1.0 + 0.15 * mult));
        break;
      case 'fireRate':
        this.activeUpgrades.fireRate++;
        this.fireRate *= (1.0 + 0.12 * mult);
        break;
      case 'pierce':
        this.activeUpgrades.pierce += Math.round(1 * mult);
        this.pierce += Math.round(1 * mult);
        break;
      case 'magnet':
        this.activeUpgrades.magnet++;
        this.magnetRange *= (1.0 + 0.20 * mult);
        break;
      case 'vitality':
        this.activeUpgrades.vitality++;
        this.maxHp += Math.round(15 * mult);
        this.hp = this.maxHp; // Full Heal
        
        // Remove low health UI pulse if fully healed
        const overlay = document.querySelector('.damage-overlay');
        if (overlay) overlay.classList.remove('low-hp');
        break;
      case 'nova':
        this.activeUpgrades.nova++;
        this.novaMult = (this.novaMult || 0.6) + 0.3 * mult;
        break;
      case 'orbiter':
        this.activeUpgrades.orbiter += Math.round(1 * mult); // Adds 1, 2, or 3 orbiters
        this.orbiterDamage = (this.orbiterDamage || 0) + Math.round(10 * mult);
        break;
      case 'trail':
        this.activeUpgrades.trail++;
        this.trailDamage = (this.trailDamage || 0) + Math.round(12 * mult);
        this.trailWidth = (this.trailWidth || 1.5) + 0.5 * mult;
        this.trailDuration = (this.trailDuration || 2.0) + 0.5 * mult;
        break;
      case 'stomp':
        this.activeUpgrades.stomp++;
        this.stompDamage = (this.stompDamage || 0) + Math.round(30 * mult);
        this.stompRadius = (this.stompRadius || 4.5) + 1.2 * mult;
        this.stompCooldown = Math.max(1.5, (this.stompCooldown || 4.5) - 0.5 * mult);
        break;
      case 'regen':
        this.activeUpgrades.regen++;
        this.regenRate = (this.regenRate || 0.0) + 1.0 * mult;
        break;
      case 'lightning':
        this.activeUpgrades.lightning++;
        this.lightningDamage = (this.lightningDamage || 0) + Math.round(25 * mult);
        this.lightningCooldown = Math.max(1.0, (this.lightningCooldown || 3.5) - 0.4 * mult);
        break;
      case 'shield':
        this.activeUpgrades.shield++;
        this.shieldCooldown = Math.max(3.5, (this.shieldCooldown || 12.0) - 1.5 * mult);
        break;
      case 'bounce':
        this.activeUpgrades.bounce++;
        this.ricochetBounces += Math.round(1 * mult);
        break;
    }
  }
}
