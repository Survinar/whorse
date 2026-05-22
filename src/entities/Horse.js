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
      color: 0x0f1115,      // Sleek charcoal black coat
      roughness: 0.35,
      metalness: 0.2,
    });
    
    const glowingManeMat = new THREE.MeshStandardMaterial({
      color: 0x221a15,      // Rich dark brown/charcoal flowing hair mane
      roughness: 0.8,
    });

    const glowingEyeMat = new THREE.MeshStandardMaterial({
      color: 0x1c120c,      // Realistic dark chocolate brown eyes
      roughness: 0.1,
    });

    const hoofMat = new THREE.MeshStandardMaterial({
      color: 0x3d3126,      // Earth-brown hooves
      roughness: 0.7,
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

    // Head Box
    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.85);
    const head = new THREE.Mesh(headGeo, obsidianMat);
    head.position.set(0, 0.75, 0.25); // on top/front of neck
    head.rotation.x = Math.PI / 6; // Angle muzzle down
    head.castShadow = true;
    head.receiveShadow = true;
    neckGroup.add(head);

    // Glowing Eyes (Left & Right)
    const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
    
    const leftEye = new THREE.Mesh(eyeGeo, glowingEyeMat);
    leftEye.position.set(-0.2, 0.85, 0.42);
    neckGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, glowingEyeMat);
    rightEye.position.set(0.2, 0.85, 0.42);
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

    // 4. Glowing Mane
    const maneGeo = new THREE.BoxGeometry(0.1, 0.8, 0.25);
    const mane = new THREE.Mesh(maneGeo, glowingManeMat);
    mane.position.set(0, 0.45, -0.22); // center-back of neck
    neckGroup.add(mane);

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

      // Hoof (at the bottom)
      const hoofGeo = new THREE.BoxGeometry(0.2, 0.15, 0.2);
      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.y = -legLength - 0.025;
      hoof.castShadow = true;
      legPivot.add(hoof);

      this.legs.push({
        pivot: legPivot,
        phase: pos.phase,
      });
    });

    // 6. Glowing Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.3, -0.9); // back of torso
    tailGroup.rotation.x = Math.PI / 6; // slope down
    this.bodyGroup.add(tailGroup);

    const tailGeo = new THREE.CylinderGeometry(0.06, 0.12, 1.2, 4);
    const tail = new THREE.Mesh(tailGeo, glowingManeMat);
    tail.position.y = -0.5;
    tail.castShadow = true;
    tailGroup.add(tail);
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
    } else {
      // Smoothly return legs to vertical standing state
      this.legs.forEach((leg) => {
        leg.pivot.rotation.x *= 0.85;
      });
      
      // Settle body back to default floating height and level orientation
      this.bodyGroup.position.y += (this.baseBodyY - this.bodyGroup.position.y) * 0.15;
      this.bodyGroup.rotation.x *= 0.85;
      this.walkCycle = 0;
    }
  }

  /**
   * Handle weapon auto-targeting and automatic fire
   */
  shoot(delta, enemies, spawnBulletCallback) {
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
    }
  }
}
