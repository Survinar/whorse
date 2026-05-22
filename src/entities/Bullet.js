import * as THREE from 'three';

/**
 * Bullet.js - Glowing energy projectile
 * Shoots toward target coordinates, handles piercing mechanics, and self-cleanses.
 */
export class Bullet {
  constructor(scene, startPosition, targetPosition, damage = 15, pierce = 1) {
    this.scene = scene;
    this.damage = damage;
    this.pierce = pierce;
    
    this.speed = 24.0; // Rapid travel speed
    this.maxRange = 25.0; // Distance limit
    this.distanceTraveled = 0.0;
    this.alive = true;
    this.radius = 0.22; // For collision checks
    
    // Construct the glowing 3D mesh
    const bulletGeo = new THREE.SphereGeometry(this.radius, 8, 8);
    const bulletMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,      // Electric cyan
      emissive: 0x00f3ff,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    });
    
    this.mesh = new THREE.Mesh(bulletGeo, bulletMat);
    this.mesh.position.copy(startPosition);
    this.mesh.castShadow = false; // Bullets are light emitters, shouldn't cast shadows
    this.scene.add(this.mesh);

    // Calculate normalized velocity vector
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, startPosition);
    
    // Lock velocity to 2D horizontal plane (ground level height)
    direction.y = 0; 
    direction.normalize();
    
    this.velocity = direction.multiplyScalar(this.speed);
  }

  /**
   * Advance position, update distance tracker, and mark dead if out of bounds
   */
  update(delta) {
    if (!this.alive) return;

    // Movement integration
    const movement = this.velocity.clone().multiplyScalar(delta);
    this.mesh.position.add(movement);
    
    // Keep bullet slightly floating
    this.mesh.position.y = 1.0;

    // Accumulate travel distance
    this.distanceTraveled += movement.length();
    
    if (this.distanceTraveled >= this.maxRange) {
      this.destroy();
    }
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
