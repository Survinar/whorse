import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

// Firebase project configuration
// TODO: Replace with your actual Firebase config once the project is set up
const firebaseConfig = {
  apiKey: "AIzaSyAAs4lmowREwnv-C4b70MMycCAyxe-87Fc",
  authDomain: "whorse-leaderboard.firebaseapp.com",
  projectId: "whorse-leaderboard",
  storageBucket: "whorse-leaderboard.firebasestorage.app",
  messagingSenderId: "621475760394",
  appId: "1:621475760394:web:68ce51942868cc6edc52f3"
};

let app = null;
let db = null;

/**
 * Initialize Firebase app and Firestore database.
 * Safe to call multiple times — only initializes once.
 */
function initFirebase() {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    } catch (e) {
      console.error('[Leaderboard] Firebase init failed:', e);
    }
  }
}

/**
 * Submit a player's run to the global leaderboard.
 * @param {string} username - The player's display name (1-16 chars)
 * @param {object} stats - Run statistics { time, level, kills, distanceRun, bossesKilled }
 * @returns {Promise<boolean>} true if submission succeeded
 */
export async function submitScore(username, stats) {
  initFirebase();
  if (!db) return false;

  // Sanitize username
  const cleanName = (username || 'Anonymous').trim().slice(0, 16) || 'Anonymous';

  try {
    await addDoc(collection(db, 'leaderboard'), {
      username: cleanName,
      time: Math.round(stats.time * 100) / 100,
      level: stats.level || 1,
      kills: stats.kills || 0,
      distance: Math.round(stats.distanceRun || 0),
      bosses: stats.bossesKilled || 0,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error('[Leaderboard] Failed to submit score:', e);
    return false;
  }
}

/**
 * Fetch the top N scores from the global leaderboard, ordered by survival time.
 * @param {number} count - Number of scores to fetch (default 10)
 * @returns {Promise<Array>} Array of score objects
 */
export async function fetchTopScores(count = 10) {
  initFirebase();
  if (!db) return [];

  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('time', 'desc'),
      limit(count)
    );
    const snapshot = await getDocs(q);
    const scores = [];
    snapshot.forEach(doc => {
      scores.push({ id: doc.id, ...doc.data() });
    });
    return scores;
  } catch (e) {
    console.error('[Leaderboard] Failed to fetch scores:', e);
    return [];
  }
}
