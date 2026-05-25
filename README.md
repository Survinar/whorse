# 🐎 Whorse: Wild Steed Daytime Survival & Volcanic Rift

An atmospheric, premium top-down 3D survival action game built using **Three.js**, **Vite**, **Vanilla CSS**, and the **Web Audio API**.

You control a mythical charcoal black steed in a beautiful sunlit forest clearing. Wild beasts emerge continuously trying to banish you. Level up, collect golden sunstones, and choose ancient blessings represented by weathered playing cards to survive the clearing. At the 10-minute mark, the world fractures: search for the Volcanic Rift to escape the forest swarm and cross over into a chaotic hell landscape of high-threat beasts!

---

## ✨ Features

- **Stylized 3D Procedural Models**: Hierarchical 3D rigs for the wild steed, red-brown wolves, giant forest Ents, glowing wisps, and lava-intrusion beasts. Features a rhythmic trotting leg-swinging rig and torso bobbing.
- **Dynamic Terrain & Infinite Floor**: Repositions the ground, grid line helpers, and foliage dynamically based on player movement, allowing endless exploration without ever falling into the void.
- **Weapon Auto-Targeting & Homing Sparks**: Ember projectiles steer dynamically toward targets every frame. Projectiles support pierce levels, critical strikes, and active homing ricochets that bounce seeking nearby enemies.
- **High-Threat Warning System**: A real-time HUD threat badge evaluates survival time across 5 styled threat levels (**STABLE**, **CAUTION**, **HOSTILE**, **HAZARDOUS**, and **CRITICAL**), featuring vibrant drop shadows, glowing badges, and screen-ripple flashes.
- **Level 2 Volcanic Rift & Hell Transition**: 
  - At **10:00**, the survival clock halts. A vertical obsidian stone frame portal with a swirling glowing red vortex and warm PointLight spawns.
  - A glassmorphic off-screen **directional HUD pointer** with real-time distance tracking rotates to guide the player toward the portal.
  - Compounding difficulty spikes trigger every 10 seconds of delay: beasts grow physically larger and gain compounding **+25% HP & Damage** multipliers.
  - Stepping into the portal triggers a deep synthesizer sweep, a full-screen red reality-flash, and transitions the world into a **Chaotic Volcanic Hell Landscape** (black ash ground, red magma underglow, fiery crimson lighting, charred trunks, and upward-drifting ember particles). Spawners reset and the HUD scales to **HELL (LVL X)**.
- **Real-Time Web Audio Synthesizer**: All audio (laser shots, noise hit-cracks, death sweeps, XP blips, level-up arpeggios, volcanic whooshes, and low-frequency ambient drones) are synthesized procedurally inside the browser. Zero external audio file dependencies!
- **Vintage Upgrade Cards (Tarot Design)**: Presents three random upgrades styled like antique tarot/playing cards with physical linen texture, double-borders, card corners with suits (♠, ♣, ♥, ♦), and unique rarity stylings (Common, Rare, and Legendary).
- **Auto-Choose Blessings Toggle**: A premium toggle inside the Active Blessings overview screen allows players to activate **Auto-Choose**. When active, the game bypasses the tarot card modal during level-up to instantly select an upgrade and resume gameplay, displaying a beautiful, rarity-themed toast notification (**COMMON**, **RARE**, or **LEGENDARY**) on screen.
- **Blessings HUD & Speed Caps**: Clicking the HUD's permanent "✨ ACTIVE BLESSINGS" capsule button pauses the game to show your collected cards. To preserve steer control, speed upgrades are hard-capped at Level 5 (max value 15.0) and dynamically excluded from card pools once fully maxed out.
- **Boss Magnet Drops**: Banana-shaped or dual-armed procedural 3D horseshoe magnets drop from defeated bosses at a `50%` rate. Collecting them pulls all active XP gems on the map directly to you in a sweeping visual effect.
- **GitHub-Reflective Version Tag**: Queries GitHub's deployments API asynchronously and rate-limit safely on launch to show the precise deployment build version (e.g. `Build #124`) in the main menu.

---

## 🎮 Controls

- **Movement**: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> to move the steed.
- **Firing**: Automatically targets and fires glowing homing projectiles at the nearest wild beast.
- **Blessings Overview**: Click the **✨ ACTIVE BLESSINGS** button in the bottom-right HUD corner to view all active upgrades or toggle **Auto-Choose Blessings**.
- **Sunstones & Magnets**: Stand near sunstones to magnetically pull and absorb them, or collect magnets to vacuum all sunstones on screen.

---

## 🚀 Local Development

Follow these steps to run the game on your local machine:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Survinar/whorse.git
   cd whorse
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open the displayed URL (usually `http://localhost:5173/whorse/`) in your browser to play!

---

## 🛠️ Built With

- **Three.js** (WebGL 3D rendering pipeline)
- **Vite** (Next-gen frontend toolchain)
- **Web Audio API** (Procedural synthesizer engine)
- **CSS3 / HTML5** (Glassmorphic panels and native `<dialog>` modals)
- **GitHub Actions** (Continuous Integration & GitHub Pages deployment)
