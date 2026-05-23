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
      case 'spider':
        this.hp = 8;
        this.maxHp = 8;
        this.speed = 5.2;
        this.damage = 8;
        this.collisionRadius = 0.45;
        this.xpValue = 1;
        break;
      case 'boar':
        this.hp = 45;
        this.maxHp = 45;
        this.speed = 4.2;
        this.damage = 18;
        this.collisionRadius = 0.75;
        this.xpValue = 2;
        break;
      case 'boss':
        this.hp = 300;
        this.maxHp = 300;
        this.speed = 3.8;
        this.damage = 40;
        this.collisionRadius = 1.6;
        this.xpValue = 0; // Drops Treasure Chest instead of XP gems
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

    const spiderMat = new THREE.MeshStandardMaterial({
      color: 0x15091a,      // Creepy deep dark purple/black
      roughness: 0.65,
      metalness: 0.2
    });
    const spiderEyeMat = new THREE.MeshStandardMaterial({
      color: 0xff003c,      // Glowing red eyes
      emissive: 0xff0000,
      emissiveIntensity: 2.5
    });
    const boarMat = new THREE.MeshStandardMaterial({
      color: 0x3d2b1f,      // Tough dark grey-brown hide
      roughness: 0.9,
    });
    const boarArmorMat = new THREE.MeshStandardMaterial({
      color: 0x5a4a42,      // Light grey armored plates
      roughness: 0.7,
      metalness: 0.5
    });
    const tuskMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,      // Bone white tusks
      roughness: 0.3
    });

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
    } else if (this.type === 'spider') {
      // Thorax (center)
      const thorax = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.4), spiderMat);
      thorax.position.y = 0.3;
      thorax.castShadow = true;
      this.mesh.add(thorax);

      // Abdomen
      const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.65), spiderMat);
      abdomen.position.set(0, 0.42, -0.4);
      abdomen.castShadow = true;
      this.mesh.add(abdomen);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), spiderMat);
      head.position.set(0, 0.32, 0.28);
      head.castShadow = true;
      this.mesh.add(head);

      // Spiders have multiple glowing red eyes (e.g. 4 small spheres on head)
      const eyeGeo = new THREE.SphereGeometry(0.03, 4, 4);
      const eyeOffsets = [
        { x: -0.07, y: 0.38, z: 0.38 },
        { x: 0.07, y: 0.38, z: 0.38 },
        { x: -0.1, y: 0.34, z: 0.36 },
        { x: 0.1, y: 0.34, z: 0.36 },
      ];
      eyeOffsets.forEach(pos => {
        const eye = new THREE.Mesh(eyeGeo, spiderEyeMat);
        eye.position.set(pos.x, pos.y, pos.z);
        this.mesh.add(eye);
      });

      // 8 Thin leg pivots and jointed segments
      this.legs = [];
      const legSpacingZ = 0.12;
      const legSides = [-1, 1]; // Left and Right
      let legIdx = 0;

      for (let zOffset = -1.5; zOffset <= 1.5; zOffset++) {
        const zPos = zOffset * legSpacingZ;
        legSides.forEach((side) => {
          // Create leg group to pivot from thorax
          const legPivot = new THREE.Group();
          legPivot.position.set(side * 0.15, 0.3, zPos);
          this.mesh.add(legPivot);

          // Upper leg bone angled up and out
          const upperGeo = new THREE.BoxGeometry(0.35, 0.08, 0.08);
          const upper = new THREE.Mesh(upperGeo, spiderMat);
          upper.position.x = side * 0.175; // extend out
          upper.rotation.z = side * 0.45;  // angle up
          upper.castShadow = true;
          legPivot.add(upper);

          // Lower leg bone angled down to touch ground
          const lowerGeo = new THREE.BoxGeometry(0.08, 0.45, 0.08);
          const lower = new THREE.Mesh(lowerGeo, spiderMat);
          lower.position.set(side * 0.32, -0.22, 0);
          lower.rotation.z = -side * 0.2; // angle down
          lower.castShadow = true;
          legPivot.add(lower);

          this.legs.push({
            pivot: legPivot,
            phase: (legIdx * Math.PI) / 3, // out of sync crawly motion
            side: side
          });
          legIdx++;
        });
      }

    } else if (this.type === 'boar') {
      // Sturdy Golem/Beast Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 1.25), boarMat);
      body.position.y = 0.45;
      body.castShadow = true;
      body.receiveShadow = true;
      this.mesh.add(body);

      // Back armor plating
      const armor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.95), boarArmorMat);
      armor.position.set(0, 0.78, -0.05);
      armor.castShadow = true;
      this.mesh.add(armor);

      // Snout/snout head box angled slightly down
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.55, 0.625);
      this.mesh.add(headGroup);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.55), boarMat);
      head.position.set(0, 0.05, 0.2);
      head.castShadow = true;
      headGroup.add(head);

      // Snout muzzle
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), boarMat);
      snout.position.set(0, -0.05, 0.45);
      snout.castShadow = true;
      headGroup.add(snout);

      // Curved Tusks (Left & Right)
      const tuskGeo = new THREE.BoxGeometry(0.08, 0.28, 0.22);
      const lTusk = new THREE.Mesh(tuskGeo, tuskMat);
      lTusk.position.set(-0.2, -0.08, 0.42);
      lTusk.rotation.set(0.4, 0, 0.4); // curve up and out
      lTusk.castShadow = true;
      headGroup.add(lTusk);

      const rTusk = new THREE.Mesh(tuskGeo, tuskMat);
      rTusk.position.set(0.2, -0.08, 0.42);
      rTusk.rotation.set(0.4, 0, -0.4); // curve up and out
      rTusk.castShadow = true;
      headGroup.add(rTusk);

      // Glowing angry red eyes
      const eyeGeo = new THREE.SphereGeometry(0.045, 4, 4);
      const lEye = new THREE.Mesh(eyeGeo, spiderEyeMat);
      lEye.position.set(-0.21, 0.15, 0.42);
      const rEye = new THREE.Mesh(eyeGeo, spiderEyeMat);
      rEye.position.set(0.21, 0.15, 0.42);
      headGroup.add(lEye, rEye);

      // Heavy stocky legs
      this.legs = [];
      const legPositions = [
        { x: -0.26, z: 0.38 },
        { x: 0.26, z: 0.38 },
        { x: -0.26, z: -0.38 },
        { x: 0.26, z: -0.38 },
      ];
      legPositions.forEach((pos) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.2), boarMat);
        leg.position.set(pos.x, 0.18, pos.z);
        leg.castShadow = true;
        this.mesh.add(leg);
        this.legs.push(leg);
      });
    } else if (this.type === 'boss') {
      // Towering Gilded Shadow Archon Behemoth
      // Materials
      const bossWoodMat = new THREE.MeshStandardMaterial({
        color: 0x110c08, // Dark ash black bark
        roughness: 0.9
      });
      const bossGoldMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Gleaming solar gold plate
        roughness: 0.15,
        metalness: 0.95
      });
      const bossEyeMat = new THREE.MeshStandardMaterial({
        color: 0xff003c, // High intensity glowing red crimson runes
        emissive: 0xff0000,
        emissiveIntensity: 3.0
      });

      // 1. Massive Torso Trunk
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 1.6), bossWoodMat);
      torso.position.y = 0.55;
      torso.castShadow = true;
      torso.receiveShadow = true;
      this.mesh.add(torso);

      // Gold shoulder plates
      const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.6), bossGoldMat);
      lShoulder.position.set(-0.48, 0.6, 0.3);
      lShoulder.castShadow = true;
      this.mesh.add(lShoulder);

      const rShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.6), bossGoldMat);
      rShoulder.position.set(0.48, 0.6, 0.3);
      rShoulder.castShadow = true;
      this.mesh.add(rShoulder);

      // Gold flank armor
      const lFlank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.7), bossGoldMat);
      lFlank.position.set(-0.46, 0.5, -0.4);
      lFlank.castShadow = true;
      this.mesh.add(lFlank);

      const rFlank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.7), bossGoldMat);
      rFlank.position.set(0.46, 0.5, -0.4);
      rFlank.castShadow = true;
      this.mesh.add(rFlank);

      // 2. Heavy Neck and head
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.35), bossWoodMat);
      neck.position.set(0, 0.95, 0.65);
      neck.rotation.x = -Math.PI / 6;
      neck.castShadow = true;
      this.mesh.add(neck);

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.25, 0.85);
      this.mesh.add(headGroup);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.65), bossWoodMat);
      head.position.set(0, 0.05, 0.15);
      head.rotation.x = Math.PI / 6;
      head.castShadow = true;
      headGroup.add(head);

      // Tapered gold face mask
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.48), bossGoldMat);
      mask.position.set(0, 0.12, 0.3);
      mask.rotation.x = Math.PI / 6;
      mask.castShadow = true;
      headGroup.add(mask);

      // Massive glowing gold horned antlers (Left & Right)
      const antlerGeo = new THREE.BoxGeometry(0.06, 0.55, 0.06);
      
      const lAntler1 = new THREE.Mesh(antlerGeo, bossGoldMat);
      lAntler1.position.set(-0.25, 0.4, 0.05);
      lAntler1.rotation.z = 0.45; // angle out
      lAntler1.rotation.y = 0.2;
      lAntler1.castShadow = true;
      headGroup.add(lAntler1);

      const lAntler2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), bossGoldMat);
      lAntler2.position.set(-0.35, 0.55, 0.1);
      lAntler2.rotation.z = -0.3; // bend back
      lAntler2.castShadow = true;
      headGroup.add(lAntler2);

      const rAntler1 = new THREE.Mesh(antlerGeo, bossGoldMat);
      rAntler1.position.set(0.25, 0.4, 0.05);
      rAntler1.rotation.z = -0.45; // angle out
      rAntler1.rotation.y = -0.2;
      rAntler1.castShadow = true;
      headGroup.add(rAntler1);

      const rAntler2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), bossGoldMat);
      rAntler2.position.set(0.35, 0.55, 0.1);
      rAntler2.rotation.z = 0.3; // bend back
      rAntler2.castShadow = true;
      headGroup.add(rAntler2);

      // 4 Glowing crimson eyes on mask
      const eyeGeo = new THREE.SphereGeometry(0.045, 4, 4);
      const eyeOffsets = [
        { x: -0.16, y: 0.15, z: 0.35 },
        { x: 0.16, y: 0.15, z: 0.35 },
        { x: -0.2, y: 0.06, z: 0.25 },
        { x: 0.2, y: 0.06, z: 0.25 },
      ];
      eyeOffsets.forEach(pos => {
        const eye = new THREE.Mesh(eyeGeo, bossEyeMat);
        eye.position.set(pos.x, pos.y, pos.z);
        headGroup.add(eye);
      });

      // 3. Sturdy Gilded Legs
      this.legs = [];
      const legSpacingX = 0.35;
      const legSpacingZ = 0.55;
      
      const legPositions = [
        { x: -legSpacingX, z: legSpacingZ },
        { x: legSpacingX, z: legSpacingZ },
        { x: -legSpacingX, z: -legSpacingZ },
        { x: legSpacingX, z: -legSpacingZ },
      ];

      legPositions.forEach(pos => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.25), bossWoodMat);
        leg.position.set(pos.x, 0.2, pos.z);
        leg.castShadow = true;
        this.mesh.add(leg);
        this.legs.push(leg);

        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), bossGoldMat);
        shin.position.set(pos.x, -0.1, pos.z);
        shin.castShadow = true;
        this.mesh.add(shin);
      });

      // Scale the entire mesh to 2.2x to make it huge!
      this.mesh.scale.set(2.2, 2.2, 2.2);
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
          child.userData.originalEmissiveIntensity = child.material.emissiveIntensity;
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
    } else if (this.type === 'spider') {
      // Crawly creepy 8-leg twitching
      const swing = 0.45;
      const freq = 14.0;
      this.legs.forEach((leg) => {
        const dir = leg.side;
        leg.pivot.rotation.x = Math.sin(this.time * freq + leg.phase) * swing;
        leg.pivot.rotation.z = Math.abs(Math.cos(this.time * freq * 0.5 + leg.phase)) * 0.15 * dir;
      });
    } else if (this.type === 'boar' || this.type === 'boss') {
      // Heavy stumpy trot
      const swing = 0.55;
      const freq = this.type === 'boss' ? 6.5 : 9.0;
      this.legs[0].rotation.x = Math.sin(this.time * freq) * swing;
      this.legs[3].rotation.x = Math.sin(this.time * freq) * swing;
      this.legs[1].rotation.x = -Math.sin(this.time * freq) * swing;
      this.legs[2].rotation.x = -Math.sin(this.time * freq) * swing;
      
      // Charge head bobbing (massive Behemoth bobs heavier!)
      this.mesh.position.y = Math.abs(Math.sin(this.time * freq)) * (this.type === 'boss' ? 0.14 : 0.08);
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
          child.material.emissiveIntensity = child.userData.originalEmissiveIntensity !== undefined ? child.userData.originalEmissiveIntensity : 0.0;
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
