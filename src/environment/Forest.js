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
    // Deep mossy dark forest green/black standard material
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050c07,
      roughness: 0.9,
      metalness: 0.1,
    });
    
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Subtle grid lines to give depth in the dark forest
    const gridHelper = new THREE.GridHelper(300, 30, 0x00f3ff, 0x071b12);
    gridHelper.position.y = 0.01; // Slightly above ground
    gridHelper.material.opacity = 0.08;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  /**
   * Mood-setting ambient lights and soft shadow-casting moon directional light
   */
  initLights() {
    // 1. Spooky ambient forest light (purplish-blue)
    const ambientLight = new THREE.AmbientLight(0x0e071c, 0.8);
    this.scene.add(ambientLight);

    // 2. Cyan accent light (glow direction)
    const cyanLight = new THREE.DirectionalLight(0x00f3ff, 0.4);
    cyanLight.position.set(-30, 20, -20);
    this.scene.add(cyanLight);

    // 3. Moon light with soft shadows (directional light)
    const moonLight = new THREE.DirectionalLight(0xa5c5ff, 1.2);
    moonLight.position.set(40, 60, 30);
    moonLight.castShadow = true;

    // Shadow settings
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 150;
    
    // Orthographic shadow camera bounds for top-down view
    const d = 40;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.0005;

    this.scene.add(moonLight);
    this.moonLight = moonLight;
  }

  /**
   * Spawns multiple procedural tree models randomly
   */
  generateTrees(count) {
    for (let i = 0; i < count; i++) {
      const type = Math.random() > 0.4 ? 'pine' : 'oak';
      const tree = this.createProceduralTree(type);
      
      // Place tree randomly on the grid
      const x = (Math.random() - 0.5) * this.gridSize;
      const z = (Math.random() - 0.5) * this.gridSize;
      
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
      color: 0x22160d, // Dark wood bark
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
        color: 0x0a1a0f, // Deep pine forest green
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
        color: 0x0c2512, // Rich dark oak green
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
}
