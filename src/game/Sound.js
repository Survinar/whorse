/**
 * Sound.js - Procedural Web Audio API Sound Synthesizer
 * Generates all game SFX and ambient forest atmosphere dynamically.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.ambientOscs = [];
    this.ambientGain = null;
    this.muted = false;
    this.initialized = false;
  }

  /**
   * Initialize the Audio Context on first user interaction (Vite/Browser policy)
   */
  init() {
    if (this.initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.initialized = true;
      
      // Start the atmospheric background drone
      this.startAmbientDrone();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  /**
   * Helper to create a brief noise buffer for hit sounds
   */
  createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 0.08; // 80ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Play shooting sound - clean, fast cyber laser sweep
   */
  playShoot() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  }

  /**
   * Play impact hit sound - white noise burst mixed with a short low thump
   */
  playHit() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    // 1. Noise Burst (impact crack)
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      
      noiseNode.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseNode.start();
    }

    // 2. Short Low Thump (feel)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.06);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  /**
   * Play enemy death sound - dark, sliding metallic dissolution
   */
  playKill() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.35);

    // Apply high shelf filter to damp harsh sawtooth tones
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  }

  /**
   * Play XP Collection sound - sparkling high-pitched harmonic blips
   */
  playXP() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const time = ctx.currentTime;
    
    // Quick double arpeggio (C6 then G6)
    const playBlip = (freq, delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + delay);
      
      gain.gain.setValueAtTime(0.0, time + delay);
      gain.gain.linearRampToValueAtTime(0.05, time + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time + delay);
      osc.stop(time + delay + 0.09);
    };

    playBlip(1046.50, 0);      // C6
    playBlip(1567.98, 0.04);   // G6
  }

  /**
   * Play level-up sound - a victorious synth arpeggio progression!
   */
  playLevelUp() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const time = ctx.currentTime;
    // C-major scale arpeggio: C4 (261.63), E4 (329.63), G4 (392.00), C5 (523.25)
    const notes = [261.63, 329.63, 392.00, 523.25];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.08);
      
      // Slight vibrato
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 8;
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      gain.gain.setValueAtTime(0.0, time + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, time + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      lfo.start(time + idx * 0.08);
      osc.start(time + idx * 0.08);
      
      lfo.stop(time + idx * 0.08 + 0.4);
      osc.stop(time + idx * 0.08 + 0.4);
    });
  }

  /**
   * Play game-over sound - descending minor progression fading into noise
   */
  playGameOver() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const time = ctx.currentTime;
    const notes = [329.63, 311.13, 277.18, 220.00]; // E4, D#4, C#4, A3
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + idx * 0.15);
      
      gain.gain.setValueAtTime(0.0, time + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, time + idx * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.15 + 0.6);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time + idx * 0.15);
      osc.stop(time + idx * 0.15 + 0.65);
    });
  }

  /**
   * Start spooky low-frequency ambient forest drone
   */
  startAmbientDrone() {
    if (!this.initialized || this.ambientOscs.length > 0) return;
    
    const ctx = this.ctx;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.015, ctx.currentTime); // very soft
    this.ambientGain.connect(ctx.destination);

    // Deep drone at 55Hz (A1) and 82.4Hz (E2)
    const baseFreqs = [55.00, 82.41];
    
    baseFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      // Add LFO to modulate filter cutoffs slightly to make it feel alive
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150;
      
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.15; // very slow, 6 seconds per cycle
      lfoGain.gain.value = 30; // modulate filter range +/- 30Hz
      
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      
      osc.connect(filter);
      filter.connect(this.ambientGain);
      
      lfo.start();
      osc.start();
      
      this.ambientOscs.push({ osc, lfo });
    });
  }

  /**
   * Play enchanted exploration chest opening sound - shimmering bells major chord
   */
  playChestOpen() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const time = ctx.currentTime;
    // Ascending pure silver bell chime arpeggio: E5, G#5, B5, E6
    const notes = [659.25, 830.61, 987.77, 1318.51];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.045);
      
      gain.gain.setValueAtTime(0.0, time + idx * 0.045);
      gain.gain.linearRampToValueAtTime(0.06, time + idx * 0.045 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.045 + 0.22);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time + idx * 0.045);
      osc.stop(time + idx * 0.045 + 0.25);
    });
  }

  /**
   * Play portal hell transition sound - low volcanic explosion coupled with howling wind synth WHOOSH
   */
  playPortalHellTransition() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const time = ctx.currentTime;
    
    // 1. Deep rumbling volcanic explosion sweep (low-frequency sawtooth)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(15, time + 1.2);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, time);
    filter.frequency.exponentialRampToValueAtTime(30, time + 1.2);
    
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + 1.25);

    // 2. High-pitched screaming howling wind sweep (triangle sweep up & down)
    const windOsc = ctx.createOscillator();
    const windGain = ctx.createGain();
    
    windOsc.type = 'triangle';
    windOsc.frequency.setValueAtTime(350, time);
    windOsc.frequency.exponentialRampToValueAtTime(1400, time + 0.6);
    windOsc.frequency.exponentialRampToValueAtTime(180, time + 1.2);
    
    windGain.gain.setValueAtTime(0.0, time);
    windGain.gain.linearRampToValueAtTime(0.18, time + 0.45);
    windGain.gain.exponentialRampToValueAtTime(0.001, time + 1.25);
    
    windOsc.connect(windGain);
    windGain.connect(ctx.destination);
    
    windOsc.start(time);
    windOsc.stop(time + 1.25);
  }

  /**
   * Stop ambient drone (e.g. for pause or mute)
   */
  stopAmbientDrone() {
    this.ambientOscs.forEach(({ osc, lfo }) => {
      try {
        osc.stop();
        lfo.stop();
      } catch (e) {}
    });
    this.ambientOscs = [];
  }
}

// Export single global instance
export const Sound = new SoundManager();
