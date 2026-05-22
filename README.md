# 🐎 Whorse: Shadow Stallion Forest Survival

An atmospheric, top-down 3D survival action game built using **Three.js**, **Vite**, **Vanilla CSS**, and the **Web Audio API**.

You control a mythical dark stallion in a haunted, neon-lit forest. Spooky shadow beasts emerge continuously trying to banish you. Level up, collect energy gems, and choose ancient blessings to survive the void!

---

## ✨ Features

- **Stylized 3D Procedural Models**: Hierarchical 3D rigs for the stallion, shadow wolves, giant wooden Ents, and floating Wisps. Features a rhythmic trotting leg-swinging rig and torso bobbing.
- **Dynamic Forest Environment**: Mood-setting ambient lights, deep mist, and moving moon shadows. Uses an **infinite wrapping engine**—trees wrap around the viewport bounds seamlessy to allow endless exploration.
- **Real-Time Sound Synthesizer**: All audio (laser shots, noise hit-cracks, death sweeps, XP blips, level-up arpeggios, and ambient forest rumbles) are synthesized directly inside the browser using the **Web Audio API**. Zero external audio file dependencies!
- **Intelligent Beast Pathfinding**: Shadow beasts track and hunt you, avoiding trees. Uses **mutual crowd repulsion** so swarms surround the stallion strategically rather than clipping into a single blob.
- **Glassmorphic Blessing Cards**: Pauses the game on level-up to present three random upgrades with randomized rarities (Common: Cyan, Rare: Purple, Legendary: Pulsing Green), with neon highlights and hover shifts.
- **Continuous Difficulty Scaling**: Waves intensify over time, spawning enemies more frequently and introducing tankier wooden giants.
- **High Score System**: Uses `localStorage` to save your best survival times.

---

## 🎮 Controls

| Keys | Movement |
| :--- | :--- |
| <kbd>W</kbd> / <kbd>↑</kbd> | Move Up |
| <kbd>A</kbd> / <kbd>←</kbd> | Move Left |
| <kbd>S</kbd> / <kbd>↓</kbd> | Move Down |
| <kbd>D</kbd> / <kbd>→</kbd> | Move Right |

* **Firing**: Automatically targets and fires glowing energy projectiles at the nearest shadow beast within range.
* **Gems**: Stand near glowing green crystals dropped by banished beasts to magnetically pull and absorb them.

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

4. Open the displayed URL (usually `http://localhost:5173`) in your browser to play!

---

## 🛠️ Built With

- **Three.js** (WebGL 3D rendering pipeline)
- **Vite** (Next-gen frontend toolchain)
- **Web Audio API** (Procedural synthesizer engine)
- **CSS3 / HTML5** (Glassmorphism overlays and native `<dialog>` modals)
- **GitHub Actions** (Continuous Integration & GitHub Pages deployment)
