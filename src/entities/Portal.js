import * as THREE from 'three';
import { Sound } from '../game/Sound.js';

/**
 * Portal.js - Level 2 volcanic portal rift
 * Renders a premium 3D stone frame, swirling vortex plane, and flickering PointLight.
 */
export class Portal {
  constructor(scene, playerPosition) {
    this.scene = scene;
    
    // Spawn 32-36 units away from the player in a random direction
    const angle = Math.random() * Math.PI * 2;
    const dist = 32 + Math.random() * 4;
    
    this.position = new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * dist,
      0,
      playerPosition.z + Math.sin(angle) * dist
    );

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    this.buildPortal();
    
    // Flickering PointLight source
    this.light = new THREE.PointLight(0xff3300, 3, 20);
    this.light.position.set(0, 3, 0);
    this.mesh.add(this.light);

    // Play a chest open/bell ring sound on spawn to notify player
    Sound.playChestOpen();
    
    this.wobbleTime = 0.0;
  }

  /**
   * Procedurally construct detailed Three.js geometries for the rift
   */
  buildPortal() {
    // 1. Slanted obsidian ring frame
    const ringGeo = new THREE.TorusGeometry(3.0, 0.4, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x111111, // Dark Obsidian
      roughness: 0.15,
      metalness: 0.85,
    });
    this.frame = new THREE.Mesh(ringGeo, ringMat);
    this.frame.position.y = 3.0; // Float above base
    this.frame.rotation.y = Math.PI / 4; // Slant angled beautifully
    this.frame.castShadow = true;
    this.mesh.add(this.frame);

    // 2. Swirling glowing red vortex plane
    const vortexGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.1, 16);
    this.vortexMat = new THREE.MeshStandardMaterial({
      color: 0xff1744, // Vibrant neon-red/crimson
      emissive: 0xff0000,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.8,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.vortex = new THREE.Mesh(vortexGeo, this.vortexMat);
    this.vortex.rotation.x = Math.PI / 2;
    this.vortex.rotation.z = Math.PI / 4; // Align slanted inside frame
    this.vortex.position.copy(this.frame.position);
    this.mesh.add(this.vortex);

    // 3. Grounded platform base
    const platformGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.25, 8);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x1a0b0b, // Burnt volcanic rock base
      roughness: 0.9,
      metalness: 0.15,
    });
    this.platform = new THREE.Mesh(platformGeo, platformMat);
    this.platform.position.y = 0.12;
    this.platform.receiveShadow = true;
    this.mesh.add(this.platform);
  }

  /**
   * Ticks animations (swirl vortex, float frame, modulate PointLight)
   */
  update(delta) {
    this.wobbleTime += delta;

    // Swirl the red vortex disc
    if (this.vortex) {
      this.vortex.rotation.y += delta * 1.6;
      // Soft pulsing emissive intensity
      this.vortexMat.emissiveIntensity = 1.6 + Math.sin(this.wobbleTime * 4.5) * 0.6;
    }

    // Hover floating height adjustments
    if (this.frame) {
      this.frame.position.y = 3.0 + Math.sin(this.wobbleTime * 2.2) * 0.22;
      if (this.vortex) {
        this.vortex.position.y = this.frame.position.y;
      }
    }

    // Modulate PointLight intensity to create lava flickering
    if (this.light) {
      this.light.intensity = 3.0 + Math.sin(this.wobbleTime * 9.0) * 0.85;
    }
  }

  /**
   * Collision verification
   */
  checkCollision(playerPos, playerRadius) {
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;
    const touchRadius = 2.4; // Collides when touching the platform base
    return distSq < (touchRadius + playerRadius) * (touchRadius + playerRadius);
  }

  /**
   * Memory leaks avoidance
   */
  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });
  }
}
