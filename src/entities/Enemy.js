import * as THREE from 'three';

/**
 * Enemy.js - Procedural Shadow Beast System
 * Implements base Enemy class and distinct subclasses (Wolf, Ent, Wisp)
 * with flocking repulsions, pathfinding, and hit-flash states.
 */
export class Enemy {
  constructor(scene, type, playerPosition) {
    this.scene = scene;
    this.type = type;
    this.alive = true;
    this.time = Math.random() * 100;
    
    // Set type-specific attributes
    this.setupStats();
    
    // Spawns in a random ring just outside the camera viewport (28-32 units away)
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 28 + Math.random() * 4;
    
    this.mesh = new THREE.Group();
    this.mesh.position.set(
      playerPosition.x + Math.cos(spawnAngle) * spawnDist,
      0,
      playerPosition.z + Math.sin(spawnAngle) * spawnDist
    );
    this.scene.add(this.mesh);

    this.buildModel();
    
    // Flash hit state variables
    this.flashTimer = 0.0;
    this.materialsList = [];
    this.cacheOriginalColors();
  }

  /**
   * Set specific archetype attributes
   */
  setupStats() {
    switch (this.type) {
      case 'wolf':
        this.hp = 20;
        this.maxHp = 20;
        this.speed = 4.8;
        this.damage = 10;
        this.collisionRadius = 0.6;
        this.xpValue = 1;
        break;
      case 'ent':
        this.hp = 85;
        this.maxHp = 85;
        this.speed = 2.0;
        this.damage = 25;
        this.collisionRadius = 1.1;
        this.xpValue = 4; // High reward
        break;
      case 'wisp':
        this.hp = 12;
        this.maxHp = 12;
        this.speed = 3.6;
        this.damage = 15;
        this.collisionRadius = 0.5;
        this.xpValue = 1;
        break;
    }
  }

  /**
   * Procedurally build 3D mesh components
   */
  buildModel() {
    const wolfMat = new THREE.MeshStandardMaterial({ color: 0x2d1e18, roughness: 0.85 }); // deep dark forest brown
    const entMat = new THREE.MeshStandardMaterial({ color: 0x2b1c11, roughness: 0.95 }); // rich textured oak trunk wood
    const wispMat = new THREE.MeshStandardMaterial({
      color: 0xff6f00, // glowing bright orange fire ember
      emissive: 0xff3d00,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.8,
    });
    const glowingEyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff7b00, emissiveIntensity: 2.0 }); // glowing amber eyes
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e3f20, roughness: 0.9 }); // lush forest vine foliage

    if (this.type === 'wolf') {
      // Body Box
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.9), wolfMat);
      body.position.y = 0.45;
      body.castShadow = true;
      this.mesh.add(body);

      // Head
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.6, 0.45);
      this.mesh.add(headGroup);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.45), wolfMat);
      head.position.z = 0.15;
      head.castShadow = true;
      headGroup.add(head);

      // Glowing Red Eyes
      const eyeGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const lEye = new THREE.Mesh(eyeGeo, glowingEyeMat);
      lEye.position.set(-0.13, 0.08, 0.3);
      const rEye = new THREE.Mesh(eyeGeo, glowingEyeMat);
      rEye.position.set(0.13, 0.08, 0.3);
      headGroup.add(lEye, rEye);

      // 4 Scrambling legs
      this.legs = [];
      const legPositions = [
        { x: -0.16, z: 0.3 },
        { x: 0.16, z: 0.3 },
        { x: -0.16, z: -0.3 },
        { x: 0.16, z: -0.3 },
      ];
      legPositions.forEach((pos) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), wolfMat);
        leg.position.set(pos.x, 0.2, pos.z);
        leg.castShadow = true;
        this.mesh.add(leg);
        this.legs.push(leg);
      });

    } else if (this.type === 'ent') {
      // Wood golem
      this.entBody = new THREE.Group();
      this.entBody.position.y = 1.0;
      this.mesh.add(this.entBody);

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), entMat);
      torso.castShadow = true;
      torso.receiveShadow = true;
      this.entBody.add(torso);

      // Head with glowing green vines
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), entMat);
      head.position.y = 0.75;
      head.castShadow = true;
      this.entBody.add(head);

      const vineOverlay = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.55), leafMat);
      vineOverlay.position.set(0, 0.9, 0);
      this.entBody.add(vineOverlay);

      // Glowing amber hollow eyes
      const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const greenEyeMat = new THREE.MeshStandardMaterial({ color: 0xffb300, emissive: 0xff8f00, emissiveIntensity: 1.5 });
      const lEye = new THREE.Mesh(eyeGeo, greenEyeMat);
      lEye.position.set(-0.16, 0.75, 0.22);
      const rEye = new THREE.Mesh(eyeGeo, greenEyeMat);
      rEye.position.set(0.16, 0.75, 0.22);
      this.entBody.add(lEye, rEye);

      // Heavy branches/arms (Left & Right)
      const armGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
      
      this.lArm = new THREE.Mesh(armGeo, entMat);
      this.lArm.position.set(-0.6, 0.1, 0.1);
      this.lArm.rotation.z = 0.2;
      this.lArm.castShadow = true;
      this.entBody.add(this.lArm);

      this.rArm = new THREE.Mesh(armGeo, entMat);
      this.rArm.position.set(0.6, 0.1, 0.1);
      this.rArm.rotation.z = -0.2;
      this.rArm.castShadow = true;
      this.entBody.add(this.rArm);

      // Stumping Legs
      this.legs = [];
      const legGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
      const lLeg = new THREE.Mesh(legGeo, entMat);
      lLeg.position.set(-0.35, -0.9, 0);
      lLeg.castShadow = true;
      this.mesh.add(lLeg);

      const rLeg = new THREE.Mesh(legGeo, entMat);
      rLeg.position.set(0.35, -0.9, 0);
      rLeg.castShadow = true;
      this.mesh.add(rLeg);

      this.legs.push(lLeg, rLeg);

    } else if (this.type === 'wisp') {
      // Floating orb
      this.wispCore = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), wispMat);
      this.wispCore.position.y = 0.8;
      this.wispCore.castShadow = false;
      this.mesh.add(this.wispCore);

      // Glowing gold crown nodes orbiting around
      this.orbiters = [];
      const orbiterGeo = new THREE.SphereGeometry(0.08, 4, 4);
      const orbiterMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffd54f, emissiveIntensity: 1.5 });
      
      for (let i = 0; i < 3; i++) {
        const orb = new THREE.Mesh(orbiterGeo, orbiterMat);
        this.wispCore.add(orb);
        this.orbiters.push(orb);
      }
    }
  }

  /**
   * Helper to cache all mesh materials for hit flash overrides
   */
  cacheOriginalColors() {
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        // Cache original diffuse color
        child.userData.originalColor = child.material.color.clone();
        if (child.material.emissive) {
          child.userData.originalEmissive = child.material.emissive.clone();
        }
        this.materialsList.push(child.material);
      }
    });
  }

  /**
   * Vector pathfinding seeking player, resolving tree collisions,
   * applying repulsions from other beasts, and running type animations.
   */
  update(delta, playerPosition, forest, otherEnemies) {
    if (!this.alive) return;

    this.time += delta;

    // 1. Pathfinding toward player
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position);
    direction.y = 0; // Lock to ground plane
    
    const dist = direction.length();
    direction.normalize();

    // Move forward
    this.mesh.position.addScaledVector(direction, this.speed * delta);

    // Smoothly turn to face the player steed
    const targetAngle = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = targetAngle;

    // 2. Crowd Repulsion: pushing overlapping enemies apart
    const repelForce = new THREE.Vector3();
    let overlaps = 0;

    for (const other of otherEnemies) {
      if (other === this || !other.alive) continue;
      const dx = this.mesh.position.x - other.mesh.position.x;
      const dz = this.mesh.position.z - other.mesh.position.z;
      const distSq = dx * dx + dz * dz;

      const minDist = this.collisionRadius + other.collisionRadius;
      if (distSq < minDist * minDist) {
        const d = Math.sqrt(distSq);
        if (d === 0) continue;
        
        // Push vector away
        const overlap = minDist - d;
        repelForce.x += (dx / d) * overlap;
        repelForce.z += (dz / d) * overlap;
        overlaps++;
      }
    }

    if (overlaps > 0) {
      // Average the push force and apply dampening
      repelForce.multiplyScalar(0.25);
      this.mesh.position.add(repelForce);
    }

    // 3. Resolve Forest collisions (slide around trees)
    const treeCorrection = forest.checkCollisions(this.mesh.position, this.collisionRadius, 0.35);
    this.mesh.position.add(treeCorrection);

    // 4. Hit Flash recovery timer
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.resetColors();
      }
    }

    // 5. Play type specific trot/wobble animations
    this.animate(delta);
  }

  /**
   * Sinusoidal movement animations
   */
  animate(delta) {
    if (this.type === 'wolf') {
      // Rapid opposing leg scrambles
      const swing = 0.75;
      const freq = 14;
      this.legs[0].rotation.x = Math.sin(this.time * freq) * swing;
      this.legs[3].rotation.x = Math.sin(this.time * freq) * swing;
      this.legs[1].rotation.x = -Math.sin(this.time * freq) * swing;
      this.legs[2].rotation.x = -Math.sin(this.time * freq) * swing;

    } else if (this.type === 'ent') {
      // Heavy stomping rotation
      const swing = 0.35;
      const freq = 4.5;
      
      this.legs[0].rotation.x = Math.sin(this.time * freq) * swing;
      this.legs[1].rotation.x = -Math.sin(this.time * freq) * swing;

      // Bob arms slightly
      this.lArm.rotation.x = Math.sin(this.time * freq) * swing * 0.5;
      this.rArm.rotation.x = -Math.sin(this.time * freq) * swing * 0.5;
      
      // Heavy body wobble
      this.entBody.rotation.z = Math.sin(this.time * freq * 0.5) * 0.08;
      this.entBody.position.y = 1.0 + Math.abs(Math.sin(this.time * freq)) * 0.1;

    } else if (this.type === 'wisp') {
      // Floating ghost weave bobbing
      this.wispCore.position.y = 0.8 + Math.sin(this.time * 3.5) * 0.2;
      this.wispCore.rotation.y += delta * 1.5;

      // Orbital glowing crown node rotations
      this.orbiters.forEach((node, idx) => {
        const orbitAngle = this.time * 2.5 + (idx * Math.PI * 2 / 3);
        const radius = 0.55;
        node.position.set(
          Math.cos(orbitAngle) * radius,
          Math.sin(this.time * 4) * 0.1, // wave wobble
          Math.sin(orbitAngle) * radius
        );
      });
    }
  }

  /**
   * Apply damage, trigger visual hit-flash and handle death checks
   */
  takeDamage(amount) {
    this.hp -= amount;

    // Trigger visual flash
    this.flashWhite();
    this.flashTimer = 0.12; // 120ms flash duration

    return this.hp <= 0;
  }

  /**
   * Flash materials to solid white to show hit feedback
   */
  flashWhite() {
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.setHex(0xffffff); // White out
        if (child.material.emissive) {
          child.material.emissive.setHex(0xff0000); // Red glow highlight
          child.material.emissiveIntensity = 2.0;
        }
      }
    });
  }

  /**
   * Restore materials to cached custom colors
   */
  resetColors() {
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.userData.originalColor) {
          child.material.color.copy(child.userData.originalColor);
        }
        if (child.material.emissive && child.userData.originalEmissive) {
          child.material.emissive.copy(child.userData.originalEmissive);
          child.material.emissiveIntensity = this.type === 'wisp' ? 1.2 : (this.type === 'ent' ? 1.5 : 2.0);
        }
      }
    });
  }

  /**
   * Safe garbage disposal
   */
  destroy() {
    this.alive = false;
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
}
