import * as THREE from 'three';
import { Sound } from '../game/Sound.js';

/**
 * XPOrb.js - Collectible magnetic resonance crystal
 * Floats gently, accelerates magnetically to the player, and adds XP.
 */
export class XPOrb {
  constructor(scene, spawnPosition, xpValue = 1) {
    this.scene = scene;
    this.xpValue = xpValue;
    
    this.alive = true;
    this.radius = 0.16;
    this.bobTime = Math.random() * 100;
    this.baseY = 0.5; // Hover height
    
    // Magnetism physics variables
    this.isAttracted = false;
    this.speed = 4.0;
    this.acceleration = 25.0;

    // Construct double-pyramid crystal geometry (Octahedron)
    const gemGeo = new THREE.OctahedronGeometry(this.radius, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,      // Glistening golden sunstone
      emissive: 0xff8f00,   // Warm gold glow
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    
    this.mesh = new THREE.Mesh(gemGeo, gemMat);
    this.mesh.position.copy(spawnPosition);
    this.mesh.position.y = this.baseY;
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
  }

  /**
   * Updates hovering or dynamic magnetic velocity pulling toward player
   */
  update(delta, player) {
    if (!this.alive) return;

    const playerPos = player.mesh.position.clone();
    playerPos.y = 1.0; // Target horse torso height

    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    const distSq = dx * dx + dz * dz;
    const dist = Math.sqrt(distSq);

    // 1. Magnetic trigger check
    if (!this.isAttracted && dist < player.magnetRange) {
      this.isAttracted = true;
    }

    if (this.isAttracted) {
      // 2a. Accelerate towards the player
      this.speed += this.acceleration * delta;
      
      const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
      this.mesh.position.addScaledVector(dir, this.speed * delta);
      
      // Rotate rapidly when pulled
      this.mesh.rotation.x += delta * 12;
      this.mesh.rotation.y += delta * 12;

      // 2b. Collect check
      if (dist < 0.65) {
        this.collect(player);
      }
    } else {
      // 3. Ambient float and slow spin
      this.bobTime += delta * 3.0;
      this.mesh.position.y = this.baseY + Math.sin(this.bobTime) * 0.15;
      
      this.mesh.rotation.y += delta * 1.5;
    }
  }

  /**
   * Handle XP rewards, play SFX, and self-cleanse
   */
  collect(player) {
    this.alive = false;
    
    // Play XP blip audio
    Sound.playXP();

    // Reward XP to player, check for level-up
    const didLevelUp = player.addXp(this.xpValue);
    if (didLevelUp) {
      // Level up handled in Game.js via status flag
      player.pendingLevelUp = true;
    }
    
    this.destroy();
  }

  /**
   * Safe garbage disposal
   */
  destroy() {
    this.alive = false;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
