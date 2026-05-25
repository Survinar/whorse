import * as THREE from 'three';

/**
 * Forest.js - Procedural Infinite Environment Generator
 * Creates ground, atmospheric lighting, and wrapping trees.
 */
export class Forest {
  constructor(scene) {
    this.scene = scene;
    this.trees = [];
    this.gridSize = 120; // Size of the wrapping grid boundary
    this.halfGridSize = this.gridSize / 2;
    
    this.initGround();
    this.initLights();
    this.generateTrees(75); // Spawn 75 procedural trees
  }

  /**
   * Create forest ground
   */
  initGround() {
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    // Mossy, warm meadow forest ground plane
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x384f2d, // Grassy meadow green
      roughness: 0.95,
      metalness: 0.05,
    });
    
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Subtle earth-brown pathway grid lines to add scale and depth
    this.gridHelper = new THREE.GridHelper(300, 30, 0x634d3b, 0x47392b);
    this.gridHelper.position.y = 0.01; // Slightly above ground
    this.gridHelper.material.opacity = 0.06;
    this.gridHelper.material.transparent = true;
    this.scene.add(this.gridHelper);
  }

  /**
   * Mood-setting ambient lights and soft shadow-casting moon directional light
   */
  initLights() {
    // 1. Warm, glowing golden-green ambient light
    this.ambientLight = new THREE.AmbientLight(0xeaf2cf, 1.2);
    this.scene.add(this.ambientLight);

    // 2. Light blue sky bounce light
    this.skyLight = new THREE.DirectionalLight(0xbde3ff, 0.5);
    this.skyLight.position.set(-30, 20, -20);
    this.scene.add(this.skyLight);

    // 3. Bright golden sunlight casting shadows
    this.sunLight = new THREE.DirectionalLight(0xfffae0, 1.6);
    this.sunLight.position.set(40, 60, 30);
    this.sunLight.castShadow = true;

    // Shadow settings
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;
    
    // Orthographic shadow camera bounds for top-down view
    const d = 40;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
    this.moonLight = this.sunLight; // Retain variable binding as 'moonLight' for simple downstream updates
  }

  /**
   * Spawns multiple procedural tree models randomly
   */
  generateTrees(count) {
    for (let i = 0; i < count; i++) {
      const type = Math.random() > 0.4 ? 'pine' : 'oak';
      const tree = this.createProceduralTree(type);
      
      // Place tree randomly on the grid, ensuring a clear start zone at (0, 0)
      let x, z;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * this.gridSize;
        z = (Math.random() - 0.5) * this.gridSize;
        attempts++;
      } while (Math.sqrt(x * x + z * z) < 8.0 && attempts < 100);
      
      tree.position.set(x, 0, z);
      this.scene.add(tree);
      
      this.trees.push({
        mesh: tree,
        radius: type === 'pine' ? 1.5 : 2.0, // For simple collision checks
      });
    }
  }

  /**
   * Procedurally construct detailed tree meshes using grouped primitives
   */
  createProceduralTree(type) {
    const treeGroup = new THREE.Group();

    // 1. Trunk (Common to both)
    const trunkHeight = 2 + Math.random() * 2;
    const trunkRadius = 0.25 + Math.random() * 0.15;
    const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3e21, // Warm natural brown bark
      roughness: 0.95,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    if (type === 'pine') {
      // 2a. Pine Tree Canopy (Three stacked layered cones)
      const layers = 3;
      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x1f4726, // Natural lively pine forest green
        roughness: 0.9,
      });

      for (let i = 0; i < layers; i++) {
        const layerScale = 1 - i * 0.22;
        const radius = 1.4 * layerScale;
        const height = 2.2 * layerScale;
        const coneGeo = new THREE.ConeGeometry(radius, height, 5);
        const foliage = new THREE.Mesh(coneGeo, foliageMat);
        
        // Stack them
        foliage.position.y = trunkHeight + (i * 1.1) - 0.2;
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        treeGroup.add(foliage);
      }
    } else {
      // 2b. Oak Tree Canopy (Three clumped spheres for a leafy look)
      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x2e5927, // Vibrant oak leaf green
        roughness: 0.9,
      });
      
      const foliageGroup = new THREE.Group();
      
      // Main Center leaf sphere
      const centerRadius = 1.8 + Math.random() * 0.4;
      const mainGeo = new THREE.SphereGeometry(centerRadius, 6, 6);
      const mainFoliage = new THREE.Mesh(mainGeo, foliageMat);
      mainFoliage.position.y = trunkHeight + centerRadius * 0.7;
      mainFoliage.castShadow = true;
      mainFoliage.receiveShadow = true;
      foliageGroup.add(mainFoliage);

      // Two slightly offset side leaf spheres for volumetric texture
      const offsetCount = 2;
      for (let j = 0; j < offsetCount; j++) {
        const sideRadius = centerRadius * 0.65;
        const sideGeo = new THREE.SphereGeometry(sideRadius, 5, 5);
        const sideFoliage = new THREE.Mesh(sideGeo, foliageMat);
        
        const angle = (j / offsetCount) * Math.PI * 2 + Math.random();
        const dist = centerRadius * 0.55;
        sideFoliage.position.set(
          Math.cos(angle) * dist,
          trunkHeight + centerRadius * 0.5 + (Math.random() - 0.5) * 0.3,
          Math.sin(angle) * dist
        );
        
        sideFoliage.castShadow = true;
        sideFoliage.receiveShadow = true;
        foliageGroup.add(sideFoliage);
      }

      treeGroup.add(foliageGroup);
    }

    // Apply random scale/skew to look organic
    const scaleY = 0.9 + Math.random() * 0.3;
    const scaleXZ = 0.85 + Math.random() * 0.3;
    treeGroup.scale.set(scaleXZ, scaleY, scaleXZ);

    return treeGroup;
  }

  /**
   * Dynamic Wrapping Logic - anchors the forest to the player's position
   * Wraps trees to the opposite side of the screen when they fall too far behind
   */
  update(playerPosition) {
    // Reposition the moon shadow light tracker to focus shadows near player
    if (this.moonLight) {
      this.moonLight.position.set(
        playerPosition.x + 40,
        60,
        playerPosition.z + 30
      );
      this.moonLight.target.position.copy(playerPosition);
      this.moonLight.target.updateMatrixWorld();
    }

    // Infinite wrapping ground plane and grid helper (modular 10-unit stepping)
    // Spaced at 10 units so it snaps and overlaps perfectly, keeping world coordinates looking static
    if (this.groundMesh) {
      this.groundMesh.position.x = Math.round(playerPosition.x / 10) * 10;
      this.groundMesh.position.z = Math.round(playerPosition.z / 10) * 10;
    }
    if (this.gridHelper) {
      this.gridHelper.position.x = Math.round(playerPosition.x / 10) * 10;
      this.gridHelper.position.z = Math.round(playerPosition.z / 10) * 10;
    }

    // Wrapping check for trees
    for (const tree of this.trees) {
      const dx = tree.mesh.position.x - playerPosition.x;
      const dz = tree.mesh.position.z - playerPosition.z;

      // Check along X axis
      if (dx > this.halfGridSize) {
        tree.mesh.position.x -= this.gridSize;
      } else if (dx < -this.halfGridSize) {
        tree.mesh.position.x += this.gridSize;
      }

      // Check along Z axis
      if (dz > this.halfGridSize) {
        tree.mesh.position.z -= this.gridSize;
      } else if (dz < -this.halfGridSize) {
        tree.mesh.position.z += this.gridSize;
      }
    }
  }

  /**
   * Check if a position collides with any trees
   * Returns a correction vector if sliding/pushback is needed
   */
  checkCollisions(entityPosition, entityRadius, pushbackStrength = 0.25) {
    const correction = new THREE.Vector3();
    
    for (const tree of this.trees) {
      const dx = entityPosition.x - tree.mesh.position.x;
      const dz = entityPosition.z - tree.mesh.position.z;
      const distSq = dx * dx + dz * dz;
      
      const minDist = tree.radius + entityRadius;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist === 0) continue;
        
        // Penetration depth
        const overlap = minDist - dist;
        
        // Push away from tree center
        correction.x += (dx / dist) * overlap * pushbackStrength;
        correction.z += (dz / dist) * overlap * pushbackStrength;
      }
    }
    
    return correction;
  }

  /**
   * Transition the environment into a chaotic hell landscape
   */
  transitionToHell() {
    this.isHell = true;

    // 1. Ground color becomes fiery dark-black/red volcanic rock
    if (this.groundMesh) {
      this.groundMesh.material.color.setHex(0x150b0b); // Pitch-black volcanic ash
      this.groundMesh.material.roughness = 0.98;
      this.groundMesh.material.metalness = 0.45;
      this.groundMesh.material.emissive.setHex(0x380505); // Fiery cracks underglow
      this.groundMesh.material.needsUpdate = true;
    }

    // 2. Re-create GridHelper with glowing lava red-orange gridlines
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper.material.dispose();

      this.gridHelper = new THREE.GridHelper(300, 30, 0xff3300, 0xaa2200);
      this.gridHelper.position.y = 0.01;
      this.gridHelper.material.opacity = 0.38; // Glowing lava appearance
      this.gridHelper.material.transparent = true;
      
      // Align to current ground mesh position
      if (this.groundMesh) {
        this.gridHelper.position.x = this.groundMesh.position.x;
        this.gridHelper.position.z = this.groundMesh.position.z;
      }
      
      this.scene.add(this.gridHelper);
    }

    // 3. Shift lighting to dramatic volcanic parameters
    if (this.ambientLight) {
      this.ambientLight.color.setHex(0xff1a1a); // Intense deep red
      this.ambientLight.intensity = 1.6;
    }

    if (this.skyLight) {
      this.skyLight.color.setHex(0xff5500); // Lava orange
      this.skyLight.intensity = 1.0;
    }

    if (this.sunLight) {
      this.sunLight.color.setHex(0xffaa00); // Glowing yellow-orange
      this.sunLight.intensity = 2.0;
    }

    // 4. Dispose green trees and generate hell spires/dead crooked trees
    this.trees.forEach(tree => {
      this.scene.remove(tree.mesh);
      tree.mesh.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    });
    this.trees = [];

    // Re-generate hell landscape objects: dead spires and volcanic monoliths
    this.generateHellTrees(75);
  }

  /**
   * Spawns multiple procedural hell spires/trunks randomly
   */
  generateHellTrees(count) {
    for (let i = 0; i < count; i++) {
      const type = Math.random() > 0.45 ? 'charred_trunk' : 'obsidian_spire';
      const spire = this.createProceduralHellTree(type);
      
      let x, z;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * this.gridSize;
        z = (Math.random() - 0.5) * this.gridSize;
        attempts++;
      } while (Math.sqrt(x * x + z * z) < 8.0 && attempts < 100);
      
      spire.position.set(x, 0, z);
      this.scene.add(spire);
      
      this.trees.push({
        mesh: spire,
        radius: type === 'charred_trunk' ? 1.0 : 1.5, // collision radius bounds
      });
    }
  }

  /**
   * Procedurally build detailed hell trunks and obsidian spires
   */
  createProceduralHellTree(type) {
    const group = new THREE.Group();

    if (type === 'charred_trunk') {
      // Crooked, burnt charred dead trunk
      const height = 3.2 + Math.random() * 2.8;
      const radius = 0.22 + Math.random() * 0.15;
      const trunkGeo = new THREE.CylinderGeometry(radius * 0.5, radius, height, 5);
      const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x141414, // Burnt carbon black
        roughness: 0.98,
        metalness: 0.1,
      });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = height / 2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      // Crooked dead branches
      const branchCount = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < branchCount; b++) {
        const bh = 1.0 + Math.random() * 1.5;
        const br = radius * 0.45;
        const branchGeo = new THREE.CylinderGeometry(br * 0.5, br, bh, 4);
        const branch = new THREE.Mesh(branchGeo, trunkMat);
        
        branch.position.y = height * 0.4 + Math.random() * (height * 0.35);
        branch.rotation.x = (Math.random() - 0.5) * 1.3;
        branch.rotation.z = (Math.random() - 0.5) * 1.3;
        
        branch.geometry.translate(0, bh / 2, 0); // Correct pivot offset
        branch.castShadow = true;
        group.add(branch);
      }
    } else {
      // Obsidian volcanic crystal spire
      const height = 4.2 + Math.random() * 3.8;
      const baseRadius = 0.45 + Math.random() * 0.55;
      
      const spireGeo = new THREE.ConeGeometry(baseRadius, height, 4);
      const spireMat = new THREE.MeshStandardMaterial({
        color: 0x130a17, // Shiny volcanic obsidian
        roughness: 0.12,
        metalness: 0.92,
        emissive: 0x3d0808, // Inner volcanic flame reflection
        emissiveIntensity: 1.6,
      });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.y = height / 2;
      spire.castShadow = true;
      spire.receiveShadow = true;
      group.add(spire);

      // Secondary smaller crystal node next to base
      if (Math.random() > 0.35) {
        const sideHeight = height * 0.5;
        const sideRadius = baseRadius * 0.55;
        const sideSpire = new THREE.Mesh(new THREE.ConeGeometry(sideRadius, sideHeight, 4), spireMat);
        sideSpire.position.set(baseRadius * 0.8, sideHeight / 2, baseRadius * 0.35);
        sideSpire.rotation.z = -0.35 - Math.random() * 0.3;
        sideSpire.rotation.x = (Math.random() - 0.5) * 0.2;
        sideSpire.castShadow = true;
        group.add(sideSpire);
      }
    }

    // Apply minor scale fluctuations to look organic
    const scale = 0.85 + Math.random() * 0.3;
    group.scale.set(scale, scale, scale);

    return group;
  }

  /**
   * Destroys the forest meshes, ground, grid helper, and lights to prevent memory leaks on restart.
   */
  destroy() {
    // Remove and dispose ground
    if (this.groundMesh) {
      this.scene.remove(this.groundMesh);
      if (this.groundMesh.geometry) this.groundMesh.geometry.dispose();
      if (this.groundMesh.material) this.groundMesh.material.dispose();
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      if (this.gridHelper.geometry) this.gridHelper.geometry.dispose();
      if (this.gridHelper.material) this.gridHelper.material.dispose();
    }

    // Remove lights
    if (this.ambientLight) this.scene.remove(this.ambientLight);
    if (this.skyLight) this.scene.remove(this.skyLight);
    if (this.sunLight) this.scene.remove(this.sunLight);

    // Remove and dispose trees
    this.trees.forEach(tree => {
      this.scene.remove(tree.mesh);
      tree.mesh.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    });
    this.trees = [];
  }
}
