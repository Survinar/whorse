# 🐎 Whorse: Wild Steed Daytime Survival

An atmospheric, top-down 3D survival action game built using **Three.js**, **Vite**, **Vanilla CSS**, and the **Web Audio API**.

You control a mythical charcoal black steed in a beautiful sunlit forest clearing. Wild beasts emerge continuously trying to banish you. Level up, collect golden sunstones, and choose ancient blessings represented by weathered playing cards to survive the clearing!

---

## ✨ Features

- **Stylized 3D Procedural Models**: Hierarchical 3D rigs for the wild steed, red-brown wolves, giant forest Ents, and glowing fire Wisps. Features a rhythmic trotting leg-swinging rig and torso bobbing.
- **Warm Daytime Environment**: Gold-hazed sunlight, deep forest clearing, and rich pine/oak greenery. Uses an **infinite wrapping engine**—trees wrap around the viewport bounds seamlessly to allow endless exploration.
- **Real-Time Sound Synthesizer**: All audio (laser shots, noise hit-cracks, death sweeps, XP blips, level-up arpeggios, and ambient forest rumbles) are synthesized directly inside the browser using the **Web Audio API**. Zero external audio file dependencies!
- **Intelligent Beast Pathfinding**: Wild beasts track and hunt you, avoiding trees. Uses **mutual crowd repulsion** so swarms surround the steed strategically rather than clipping into a single blob.
- **Vintage Upgrade Playing Cards**: Pauses the game on level-up to present three random upgrades styled like antique Tarot/playing cards with physical linen texture, double-borders, card corners with suits (♠, ♣, ♥, ♦), and unique rarity stylings (Common, Rare bronze brackets, Legendary golden floating cards).
- **Continuous Difficulty Scaling**: Waves intensify over time, spawning enemies more frequently and introducing tankier wooden giants.
- **High Score System**: Uses `localStorage` to save your best survival times.

---

## 🎮 Controls

- **Movement**: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> to move the steed.
- **Firing**: Automatically targets and fires glowing ember projectiles at the nearest wild beast within range.
- **Sunstones**: Stand near glowing golden sunstones dropped by banished beasts to magnetically pull and absorb them.

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
- **CSS3 / HTML5** (Earthy panels and native `<dialog>` modals)
- **GitHub Actions** (Continuous Integration & GitHub Pages deployment)
