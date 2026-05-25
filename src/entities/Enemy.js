import * as THREE from 'three';

/**
 * Enemy.js - Procedural Shadow Beast System
 * Implements base Enemy class and distinct subclasses (Wolf, Ent, Wisp)
 * with flocking repulsions, pathfinding, and hit-flash states.
 */
export class Enemy {
  constructor(scene, type, playerPosition, gameTime = 0) {
    this.scene = scene;
    this.type = type;
    this.alive = true;
    this.time = Math.random() * 100;
    
    if (this.type === 'boss') {
      // 1. Procedural Name Generator
      const prefixes = ['Goliath', 'Titan', 'Archon', 'Elder', 'Dread', 'Apex', 'Spectral', 'Calamity', 'Ancient', 'Gilded', 'Void'];
      const elements = ['Wildfire', 'Dreadwood', 'Ironhide', 'Void', 'Storm', 'Ashen', 'Blighted', 'Frostbite', 'Sunlit', 'Toxic', 'Abyssal'];
      const nouns = ['Behemoth', 'Colossus', 'Monarch', 'Leviathan', 'Phantasm', 'Sovereign', 'Sentinel', 'Titan', 'Archon'];
      
      const p1 = prefixes[Math.floor(Math.random() * prefixes.length)];
      const p2 = elements[Math.floor(Math.random() * elements.length)];
      const p3 = nouns[Math.floor(Math.random() * nouns.length)];
      this.bossName = `${p1} ${p2} ${p3}`;

      // 2. Roll Core Shape
      const shapes = ['beast', 'golem', 'wisp'];
      this.bossShape = shapes[Math.floor(Math.random() * shapes.length)];

      // 3. Roll Elemental Color Theme
      const themes = ['fire', 'toxic', 'frost', 'gold', 'void'];
      this.bossTheme = themes[Math.floor(Math.random() * themes.length)];

      // 4. Roll Geometry Dimensions
      this.bossScaleX = 0.85 + Math.random() * 0.4;
      this.bossScaleY = 0.85 + Math.random() * 0.4;
      this.bossScaleZ = 0.85 + Math.random() * 0.4;
    }

    // Set type-specific attributes
    this.setupStats(gameTime);
    
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
  setupStats(gameTime = 0) {
    switch (this.type) {
      case 'wolf':
        this.hp = 20;
        this.maxHp = 20;
        this.speed = 4.2;
        this.damage = 7;
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
        this.speed = 3.3;
        this.damage = 10;
        this.collisionRadius = 0.5;
        this.xpValue = 1;
        break;
      case 'spider':
        this.hp = 8;
        this.maxHp = 8;
        this.speed = 4.6;
        this.damage = 5;
        this.collisionRadius = 0.45;
        this.xpValue = 1;
        break;
      case 'boar':
        this.hp = 45;
        this.maxHp = 45;
        this.speed = 3.8;
        this.damage = 12;
        this.collisionRadius = 0.75;
        this.xpValue = 2;
        break;
      case 'boss':
        this.hp = 300;
        this.maxHp = 300;
        this.speed = this.bossShape === 'wisp' ? 4.3 : (this.bossShape === 'golem' ? 3.0 : 3.8);
        this.damage = this.bossShape === 'golem' ? 40 : 30;
        this.collisionRadius = this.bossShape === 'golem' ? 1.8 : (this.bossShape === 'beast' ? 1.6 : 1.4);
        this.xpValue = 0; // Drops Treasure Chest instead of XP gems
        break;
    }

    // Infinite scaling over time:
    if (gameTime > 0) {
      // HP increases by 0.8% per second infinitely (+48% per minute, was 1.8%/sec)
      const hpMultiplier = 1.0 + gameTime * 0.008;
      this.maxHp = Math.round(this.maxHp * hpMultiplier);
      this.hp = this.maxHp;

      // Damage increases by 0.5% per second infinitely (+30% per minute, was 1.0%/sec)
      const dmgMultiplier = 1.0 + gameTime * 0.005;
      this.damage = Math.round(this.damage * dmgMultiplier);

      // Speed increases by 0.1% per second infinitely, capped at a playable 9.0
      const speedMultiplier = 1.0 + gameTime * 0.001;
      this.speed = Math.min(9.0, this.speed * speedMultiplier);

      // Scale model visual size and collision boundaries over time (+0.12% per second, capped at 2.2x base size)
      this.sizeScale = Math.min(2.2, 1.0 + gameTime * 0.0012);
      this.collisionRadius *= this.sizeScale;

      // Each minute after 10 minutes (600s) triggers an extra compounding +15% HP & Damage level-up, plus physical size growth!
      if (gameTime > 600) {
        const minutesPast10 = Math.floor((gameTime - 600) / 60);
        if (minutesPast10 > 0) {
          const levelMultiplier = 1.0 + minutesPast10 * 0.15;
          this.maxHp = Math.round(this.maxHp * levelMultiplier);
          this.hp = this.maxHp;
          this.damage = Math.round(this.damage * levelMultiplier);

          this.sizeScale = Math.min(2.5, this.sizeScale + minutesPast10 * 0.05);
          this.collisionRadius *= (1.0 + minutesPast10 * 0.05);
        }
      }
    } else {
      this.sizeScale = 1.0;
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
      // Procedural Boss Material Swatches
      let bossBaseColor = 0x110c08; // dark ash
      let bossArmorColor = 0xd4af37; // gold
      let bossGlowColor = 0xff3300; // red
      let bossGlowIntensity = 2.0;

      switch (this.bossTheme) {
        case 'fire':
          bossBaseColor = 0x221105; // charcoal orange
          bossArmorColor = 0xe65100; // burnt orange
          bossGlowColor = 0xff5500; // flame orange
          break;
        case 'toxic':
          bossBaseColor = 0x0f1a0f; // dark green
          bossArmorColor = 0x33691e; // leafy moss
          bossGlowColor = 0x76ff03; // neon acid green
          bossGlowIntensity = 2.5;
          break;
        case 'frost':
          bossBaseColor = 0x09141c; // ice navy
          bossArmorColor = 0x006064; // deep cyan
          bossGlowColor = 0x00e5ff; // ice cyan
          bossGlowIntensity = 2.5;
          break;
        case 'gold':
          bossBaseColor = 0x0a0c0e; // sleek black
          bossArmorColor = 0xd4af37; // solar gold
          bossGlowColor = 0xffd700; // bright gold
          break;
        case 'void':
          bossBaseColor = 0x12051c; // deep violet black
          bossArmorColor = 0x4a148c; // dark magenta
          bossGlowColor = 0xd500f9; // void pink-purple
          bossGlowIntensity = 3.0;
          break;
      }

      const bossWoodMat = new THREE.MeshStandardMaterial({ color: bossBaseColor, roughness: 0.9 });
      const bossGoldMat = new THREE.MeshStandardMaterial({
        color: bossArmorColor,
        roughness: 0.15,
        metalness: this.bossTheme === 'gold' ? 0.95 : 0.6
      });
      const bossEyeMat = new THREE.MeshStandardMaterial({
        color: bossGlowColor,
        emissive: bossGlowColor,
        emissiveIntensity: bossGlowIntensity
      });

      const scaleX = this.bossScaleX || 1.0;
      const scaleY = this.bossScaleY || 1.0;
      const scaleZ = this.bossScaleZ || 1.0;

      if (this.bossShape === 'beast') {
        // 1. Massive Torso Trunk
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85 * scaleX, 0.75 * scaleY, 1.6 * scaleZ), bossWoodMat);
        torso.position.y = 0.55;
        torso.castShadow = true;
        torso.receiveShadow = true;
        this.mesh.add(torso);

        // Gold shoulder plates
        const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scaleX, 0.6 * scaleY, 0.6 * scaleZ), bossGoldMat);
        lShoulder.position.set(-0.48 * scaleX, 0.6, 0.3 * scaleZ);
        lShoulder.castShadow = true;
        this.mesh.add(lShoulder);

        const rShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scaleX, 0.6 * scaleY, 0.6 * scaleZ), bossGoldMat);
        rShoulder.position.set(0.48 * scaleX, 0.6, 0.3 * scaleZ);
        rShoulder.castShadow = true;
        this.mesh.add(rShoulder);

        // Heavy Neck and head
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scaleX, 0.65 * scaleY, 0.35 * scaleZ), bossWoodMat);
        neck.position.set(0, 0.95, 0.65 * scaleZ);
        neck.rotation.x = -Math.PI / 6;
        neck.castShadow = true;
        this.mesh.add(neck);

        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.25, 0.85 * scaleZ);
        this.mesh.add(headGroup);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.45 * scaleX, 0.42 * scaleY, 0.65 * scaleZ), bossWoodMat);
        head.position.set(0, 0.05, 0.15 * scaleZ);
        head.rotation.x = Math.PI / 6;
        head.castShadow = true;
        headGroup.add(head);

        // Tapered gold face mask
        const mask = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scaleX, 0.2 * scaleY, 0.48 * scaleZ), bossGoldMat);
        mask.position.set(0, 0.12, 0.3 * scaleZ);
        mask.rotation.x = Math.PI / 6;
        mask.castShadow = true;
        headGroup.add(mask);

        // Massive antler horns
        const antlerGeo = new THREE.BoxGeometry(0.06 * scaleX, 0.55 * scaleY, 0.06 * scaleZ);
        const lAntler1 = new THREE.Mesh(antlerGeo, bossGoldMat);
        lAntler1.position.set(-0.25 * scaleX, 0.4, 0.05);
        lAntler1.rotation.z = 0.45;
        lAntler1.castShadow = true;
        headGroup.add(lAntler1);

        const rAntler1 = new THREE.Mesh(antlerGeo, bossGoldMat);
        rAntler1.position.set(0.25 * scaleX, 0.4, 0.05);
        rAntler1.rotation.z = -0.45;
        rAntler1.castShadow = true;
        headGroup.add(rAntler1);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.045, 4, 4);
        const lEye = new THREE.Mesh(eyeGeo, bossEyeMat);
        lEye.position.set(-0.16 * scaleX, 0.15, 0.35 * scaleZ);
        const rEye = new THREE.Mesh(eyeGeo, bossEyeMat);
        rEye.position.set(0.16 * scaleX, 0.15, 0.35 * scaleZ);
        headGroup.add(lEye, rEye);

        // 4 stumpy legs
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
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scaleX, 0.4 * scaleY, 0.25 * scaleZ), bossWoodMat);
          leg.position.set(pos.x * scaleX, 0.2, pos.z * scaleZ);
          leg.castShadow = true;
          this.mesh.add(leg);
          this.legs.push(leg);

          const shin = new THREE.Mesh(new THREE.BoxGeometry(0.2 * scaleX, 0.3 * scaleY, 0.2 * scaleZ), bossGoldMat);
          shin.position.set(pos.x * scaleX, -0.1, pos.z * scaleZ);
          shin.castShadow = true;
          this.mesh.add(shin);
        });

      } else if (this.bossShape === 'golem') {
        // Golem Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1 * scaleX, 1.4 * scaleY, 0.9 * scaleZ), bossWoodMat);
        torso.position.y = 0.8;
        torso.castShadow = true;
        torso.receiveShadow = true;
        this.mesh.add(torso);

        // Golem Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.65 * scaleX, 0.6 * scaleY, 0.65 * scaleZ), bossWoodMat);
        head.position.set(0, 1.62, 0);
        head.castShadow = true;
        this.mesh.add(head);

        const mossCap = new THREE.Mesh(new THREE.BoxGeometry(0.72 * scaleX, 0.2 * scaleY, 0.72 * scaleZ), bossGoldMat);
        mossCap.position.set(0, 1.82, 0);
        mossCap.castShadow = true;
        this.mesh.add(mossCap);

        // Glowing runic eyes
        const eyeGeo = new THREE.SphereGeometry(0.07, 4, 4);
        const lEye = new THREE.Mesh(eyeGeo, bossEyeMat);
        lEye.position.set(-0.2 * scaleX, 1.62, 0.28 * scaleZ);
        const rEye = new THREE.Mesh(eyeGeo, bossEyeMat);
        rEye.position.set(0.2 * scaleX, 1.62, 0.28 * scaleZ);
        this.mesh.add(lEye, rEye);

        // Left Arm Club
        this.lArm = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scaleX, 1.1 * scaleY, 0.35 * scaleZ), bossWoodMat);
        this.lArm.position.set(-0.75 * scaleX, 0.8, 0.1 * scaleZ);
        this.lArm.rotation.z = 0.15;
        this.lArm.castShadow = true;
        this.mesh.add(this.lArm);

        // Right Arm Club
        this.rArm = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scaleX, 1.1 * scaleY, 0.35 * scaleZ), bossWoodMat);
        this.rArm.position.set(0.75 * scaleX, 0.8, 0.1 * scaleZ);
        this.rArm.rotation.z = -0.15;
        this.rArm.castShadow = true;
        this.mesh.add(this.rArm);

        // 2 stumping Golem legs
        this.legs = [];
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scaleX, 0.72 * scaleY, 0.35 * scaleZ), bossWoodMat);
        lLeg.position.set(-0.35 * scaleX, 0.1, 0);
        lLeg.castShadow = true;
        this.mesh.add(lLeg);

        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scaleX, 0.72 * scaleY, 0.35 * scaleZ), bossWoodMat);
        rLeg.position.set(0.35 * scaleX, 0.1, 0);
        rLeg.castShadow = true;
        this.mesh.add(rLeg);

        this.legs.push(lLeg, rLeg);

      } else if (this.bossShape === 'wisp') {
        // Floating core
        this.wispCore = new THREE.Mesh(new THREE.SphereGeometry(0.85 * scaleX, 16, 16), bossEyeMat);
        this.wispCore.position.y = 1.2;
        this.wispCore.castShadow = false;
        this.mesh.add(this.wispCore);

        // Outer shell segments
        const shellGeo = new THREE.BoxGeometry(1.0 * scaleX, 0.2 * scaleY, 1.0 * scaleZ);
        for (let i = 0; i < 4; i++) {
          const shell = new THREE.Mesh(shellGeo, bossArmorMat);
          shell.position.set(0, 1.2, 0);
          shell.rotation.y = (i * Math.PI) / 4;
          shell.rotation.x = Math.PI / 6;
          this.mesh.add(shell);
        }

        // 6 Golden orbiters spinning rapidly
        this.orbiters = [];
        const orbiterGeo = new THREE.SphereGeometry(0.15, 6, 6);
        for (let i = 0; i < 6; i++) {
          const orb = new THREE.Mesh(orbiterGeo, bossArmorMat);
          this.wispCore.add(orb);
          this.orbiters.push(orb);
        }
      }

      // Scale entire group to 2.2x towering scale
      this.mesh.scale.set(2.2, 2.2, 2.2);
    }

    // Apply overall infinite time size scale (making older/later enemies look physically larger!)
    if (this.type === 'boss') {
      const finalScale = 2.2 * this.sizeScale;
      this.mesh.scale.set(finalScale, finalScale, finalScale);
    } else {
      this.mesh.scale.set(this.sizeScale, this.sizeScale, this.sizeScale);
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
    } else if (this.type === 'boar') {
      // Heavy stumpy trot
      const swing = 0.55;
      const freq = 9.0;
      this.legs[0].rotation.x = Math.sin(this.time * freq) * swing;
      this.legs[3].rotation.x = Math.sin(this.time * freq) * swing;
      this.legs[1].rotation.x = -Math.sin(this.time * freq) * swing;
      this.legs[2].rotation.x = -Math.sin(this.time * freq) * swing;
      this.mesh.position.y = Math.abs(Math.sin(this.time * freq)) * 0.08;
    } else if (this.type === 'boss') {
      if (this.bossShape === 'beast') {
        // Massive stumpy stag trot
        const swing = 0.55;
        const freq = 6.5;
        if (this.legs && this.legs.length >= 4) {
          this.legs[0].rotation.x = Math.sin(this.time * freq) * swing;
          this.legs[3].rotation.x = Math.sin(this.time * freq) * swing;
          this.legs[1].rotation.x = -Math.sin(this.time * freq) * swing;
          this.legs[2].rotation.x = -Math.sin(this.time * freq) * swing;
        }
        this.mesh.position.y = Math.abs(Math.sin(this.time * freq)) * 0.14;
      } else if (this.bossShape === 'golem') {
        // Heavy golem stomp & club swings
        const swing = 0.35;
        const freq = 3.5;
        
        // 2 stumping legs
        if (this.legs && this.legs.length >= 2) {
          this.legs[0].rotation.x = Math.sin(this.time * freq) * swing;
          this.legs[1].rotation.x = -Math.sin(this.time * freq) * swing;
        }
        
        // Heavy arms swinging
        if (this.lArm) {
          this.lArm.rotation.x = Math.sin(this.time * freq) * swing * 0.8;
          this.lArm.rotation.z = 0.15 + Math.sin(this.time * freq * 0.5) * 0.05;
        }
        if (this.rArm) {
          this.rArm.rotation.x = -Math.sin(this.time * freq) * swing * 0.8;
          this.rArm.rotation.z = -0.15 - Math.sin(this.time * freq * 0.5) * 0.05;
        }

        // Heavy Golem bounce/bobbing
        this.mesh.position.y = Math.abs(Math.sin(this.time * freq)) * 0.18;
      } else if (this.bossShape === 'wisp') {
        // Floating ghost weave bobbing
        this.mesh.position.y = 1.0 + Math.sin(this.time * 2.2) * 0.4;
        
        // Spin core and its shells/orbiters
        if (this.wispCore) {
          this.wispCore.rotation.y += delta * 1.8;
          this.wispCore.rotation.x += delta * 0.6;
        }

        // Opposing circular paths for orbiters (satellites)
        if (this.orbiters && this.orbiters.length >= 6) {
          this.orbiters.forEach((node, idx) => {
            const isReverse = idx % 2 === 0;
            const direction = isReverse ? -1 : 1;
            const orbitAngle = (this.time * 3.5 * direction) + (idx * Math.PI * 2 / 6);
            const radius = 1.4;
            node.position.set(
              Math.cos(orbitAngle) * radius,
              Math.sin(this.time * 5 + idx) * 0.25, // dynamic wave wobble
              Math.sin(orbitAngle) * radius
            );
          });
        }
      }
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
