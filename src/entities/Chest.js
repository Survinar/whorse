import * as THREE from 'three';

/**
 * Chest.js - A premium procedural 3D collectible Treasure Chest
 * Spawns on Boss Archon defeat. Floats, bobs, and rotates on ground.
 */
export class Chest {
  constructor(scene, spawnPosition, type = 'boss') {
    this.scene = scene;
    this.type = type;
    this.alive = true;
    this.radius = 0.5; // Proximity collision query radius
    this.bobTime = Math.random() * 100;
    this.baseY = 0.35; // Ground clearance height

    // Build procedural 3D Chest Mesh Group
    this.mesh = new THREE.Group();
    this.mesh.position.copy(spawnPosition);
    this.mesh.position.y = this.baseY;
    this.scene.add(this.mesh);

    if (type === 'magnet') {
      // Build Horse-shoe Magnet
      const redMat = new THREE.MeshStandardMaterial({
        color: 0xd32f2f, // Vibrant ruby red
        roughness: 0.2,
        metalness: 0.1
      });
      const silverMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc, // Silver / Iron
        roughness: 0.1,
        metalness: 0.9
      });
      const glowMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00bbff,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.8
      });

      // Bottom base bridge
      const baseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.14), redMat);
      baseBridge.position.set(0, 0.1, 0);
      baseBridge.castShadow = true;
      this.mesh.add(baseBridge);

      // Left vertical prong
      const leftProng = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), redMat);
      leftProng.position.set(-0.155, 0.25, 0);
      leftProng.castShadow = true;
      this.mesh.add(leftProng);

      // Right vertical prong
      const rightProng = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), redMat);
      rightProng.position.set(0.155, 0.25, 0);
      rightProng.castShadow = true;
      this.mesh.add(rightProng);

      // Left tip (silver)
      const leftTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), silverMat);
      leftTip.position.set(-0.155, 0.44, 0);
      leftTip.castShadow = true;
      this.mesh.add(leftTip);

      // Right tip (silver)
      const rightTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), silverMat);
      rightTip.position.set(0.155, 0.44, 0);
      rightTip.castShadow = true;
      this.mesh.add(rightTip);

      // Small glowing energy field between the prongs
      const field = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), glowMat);
      field.position.set(0, 0.32, 0);
      this.mesh.add(field);
    } else {
      const isExploration = type === 'exploration';

      // Premium Earthy Materials
      const woodMat = new THREE.MeshStandardMaterial({
        color: isExploration ? 0x242e2b : 0x3d2314, // Weathered moss evergreen wood vs dark walnut wood
        roughness: 0.85
      });
      const metalMat = new THREE.MeshStandardMaterial({
        color: isExploration ? 0xcccccc : 0xd4af37, // Polished silver vs solar gold bands
        roughness: isExploration ? 0.1 : 0.15,
        metalness: 0.95
      });
      const lockMat = new THREE.MeshStandardMaterial({
        color: isExploration ? 0x00ffcc : 0xffaa00, // Glowing teal vs glowing orange
        emissive: isExploration ? 0x00d8a3 : 0xff8800,
        emissiveIntensity: isExploration ? 2.5 : 2.0,
        roughness: 0.1
      });

      // 1. Chest Main Box Base
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), woodMat);
      base.position.y = 0.2;
      base.castShadow = true;
      base.receiveShadow = true;
      this.mesh.add(base);

      // 2. Chest Lid Cap
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.5), woodMat);
      lid.position.y = 0.51;
      lid.castShadow = true;
      this.mesh.add(lid);

      // 3. Ornate Golden Iron Straps
      const bandGeo = new THREE.BoxGeometry(0.08, 0.65, 0.52);
      const lBand = new THREE.Mesh(bandGeo, metalMat);
      lBand.position.set(-0.25, 0.32, 0);
      lBand.castShadow = true;
      this.mesh.add(lBand);

      const rBand = new THREE.Mesh(bandGeo, metalMat);
      rBand.position.set(0.25, 0.32, 0);
      rBand.castShadow = true;
      this.mesh.add(rBand);

      // 4. Emissive Key Lock Plate
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), lockMat);
      lock.position.set(0, 0.38, 0.26);
      lock.castShadow = true;
      this.mesh.add(lock);
    }
  }

  /**
   * Slowly float bob and spin ambiently
   */
  update(delta) {
    if (!this.alive) return;
    
    this.bobTime += delta * 2.5;
    this.mesh.position.y = this.baseY + Math.sin(this.bobTime) * 0.12;
    this.mesh.rotation.y += delta * 1.0;
  }

  /**
   * Memory clean-up
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
