import * as THREE from 'three';

/**
 * Particle.js - High-impact particle effects engine
 * Manages ambient fireflies, bullet impact sparks, death dust, and level-up spirals.
 */
export class ParticleEngine {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.fireflies = [];
    
    // Shared geometries to maximize rendering performance
    this.sparkGeo = new THREE.SphereGeometry(0.08, 4, 4);
    this.fireflyGeo = new THREE.SphereGeometry(0.05, 4, 4);
    
    this.spawnFireflies(45);
  }

  /**
   * Spawns floating forest fireflies surrounding the map
   */
  spawnFireflies(count) {
    const fireflyMat = new THREE.MeshBasicMaterial({
      color: 0xffe082, // Soft glowing golden forest pollen
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.fireflyGeo, fireflyMat.clone());
      
      // Distributed randomly around origin
      const x = (Math.random() - 0.5) * 100;
      const y = 0.5 + Math.random() * 4.0;
      const z = (Math.random() - 0.5) * 100;
      
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      this.fireflies.push({
        mesh,
        baseY: y,
        speed: 0.2 + Math.random() * 0.4,
        wobbleSpeed: 0.5 + Math.random() * 1.5,
        wobbleRadius: 0.5 + Math.random() * 1.0,
        time: Math.random() * 100,
        blinkSpeed: 1.0 + Math.random() * 2.0,
      });
    }
  }

  /**
   * Spawn a burst of glowing bullet-impact spark particles
   */
  spawnHitSparks(position) {
    const sparkCount = 12 + Math.floor(Math.random() * 6);
    
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00, // Fiery amber spark
      transparent: true,
      opacity: 1.0
    });

    for (let i = 0; i < sparkCount; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, sparkMat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      // Random spherical velocity direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 3.0 + Math.random() * 5.0;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed + 2.0, // bias upward
        Math.cos(phi) * speed
      );

      this.particles.push({
        mesh,
        velocity,
        life: 0.25 + Math.random() * 0.15, // short life
        maxLife: 0.4,
        type: 'spark'
      });
    }
  }

  /**
   * Spawn dark purple expansion burst on beast death
   */
  spawnDeathBurst(position) {
    const particleCount = 20;
    const woodDebrisMat = new THREE.MeshBasicMaterial({
      color: 0x5d4037, // Earthy decay wood/leaves dark brown
      transparent: true,
      opacity: 0.9
    });

    const deathGeo = new THREE.SphereGeometry(0.12, 4, 4);

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(deathGeo, woodDebrisMat);
      mesh.position.copy(position);
      mesh.position.y += 0.5; // Offset to center of enemy
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.0;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        0.5 + Math.random() * 2.0, // rise up
        Math.sin(angle) * speed
      );

      this.particles.push({
        mesh,
        velocity,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        type: 'death'
      });
    }
  }

  /**
   * Spectacular spiral upward level-up fountain
   */
  spawnLevelUpHalo(playerPosition) {
    const haloCount = 60;
    const levelMat = new THREE.MeshBasicMaterial({
      color: 0xffd700, // Shimmering gold spiral
      transparent: true,
      opacity: 1.0
    });

    const haloGeo = new THREE.SphereGeometry(0.16, 5, 5);

    for (let i = 0; i < haloCount; i++) {
      const mesh = new THREE.Mesh(haloGeo, levelMat);
      
      // Spiral radius offsets
      const angle = (i / haloCount) * Math.PI * 8; // 4 full rotations
      const radius = 0.5 + (i / haloCount) * 1.5;
      
      mesh.position.set(
        playerPosition.x + Math.cos(angle) * radius,
        playerPosition.y + 0.1,
        playerPosition.z + Math.sin(angle) * radius
      );
      
      this.scene.add(mesh);

      const velocity = new THREE.Vector3(
        Math.cos(angle) * 0.5, // slight outward expansion
        2.5 + (i / haloCount) * 2.0, // varied upward speeds
        Math.sin(angle) * 0.5
      );

      this.particles.push({
        mesh,
        velocity,
        // Delayed launch based on spiral order
        life: 0.6 + (i / haloCount) * 0.4,
        maxLife: 1.0,
        type: 'level'
      });
    }
  }

  /**
   * Update loops for active fireflies and fading particles
   */
  update(delta, playerPosition) {
    // 1. Ambient Fireflies drift and wrap around player
    for (const f of this.fireflies) {
      f.time += delta;
      
      // Gentle floating sine wave drift
      f.mesh.position.y = f.baseY + Math.sin(f.time * f.speed) * 0.5;
      f.mesh.position.x += Math.cos(f.time * f.wobbleSpeed) * 0.02;
      f.mesh.position.z += Math.sin(f.time * f.wobbleSpeed) * 0.02;

      // Glow pulse blinking
      f.mesh.material.opacity = 0.3 + Math.abs(Math.sin(f.time * f.blinkSpeed)) * 0.6;

      // Wrap fireflies so they stay in boundary around player
      const wrapSize = 80;
      const halfWrap = wrapSize / 2;
      const dx = f.mesh.position.x - playerPosition.x;
      const dz = f.mesh.position.z - playerPosition.z;

      if (dx > halfWrap) f.mesh.position.x -= wrapSize;
      else if (dx < -halfWrap) f.mesh.position.x += wrapSize;

      if (dz > halfWrap) f.mesh.position.z -= wrapSize;
      else if (dz < -halfWrap) f.mesh.position.z += wrapSize;
    }

    // 2. Transitory particles logic
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        // Skip materials disposal if shared
        if (p.type === 'death' || p.type === 'level') {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.mesh.position.addScaledVector(p.velocity, delta);
      
      // Apply gravity to hit sparks
      if (p.type === 'spark') {
        p.velocity.y -= 9.8 * delta;
      }

      // Linear fade scale & opacity
      const ratio = p.life / p.maxLife;
      p.mesh.scale.set(ratio, ratio, ratio);
      p.mesh.material.opacity = ratio;
    }
  }

  /**
   * Cleanup all system elements on restart
   */
  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    });
    this.particles = [];
  }
}
