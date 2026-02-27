/**
 * FirebaseDataManager.js
 * Full Firebase Auth + Firestore integration.
 *
 * CREDENTIALS SETUP:
 *   Replace each `undefined` below with your actual Firebase project values.
 *   You can find them in Firebase Console → Project Settings → Your Apps → SDK setup.
 *   DO NOT commit real credentials to a public repository.
 *
 * HOW TO ENABLE:
 *   1. Fill in FIREBASE_CONFIG below.
 *   2. In main.js, import FirebaseDataManager and pass it to launchGame().
 *   3. The manager auto-falls back to localStorage if not configured.
 */

// ─────────────────────────────────────────────
// FILL THESE IN WHEN YOU HAVE YOUR CREDENTIALS
// ─────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            undefined,
  authDomain:        undefined,
  projectId:         undefined,
  storageBucket:     undefined,
  messagingSenderId: undefined,
  appId:             undefined,
};


const IS_CONFIGURED = Object.values(FIREBASE_CONFIG).every(v => v !== undefined);

// ─────────────────────────────────────────────
// COLLECTION PATHS
// ─────────────────────────────────────────────
const COLLECTION_GAME_SAVES  = 'game_saves';
const COLLECTION_LEADERBOARD = 'leaderboard';

// ─────────────────────────────────────────────
// MANAGER CLASS
// ─────────────────────────────────────────────
export class FirebaseDataManager {
  constructor(saveManager) {
    this._sm      = saveManager;   // Fallback localStorage
    this._app     = null;
    this._auth    = null;
    this._db      = null;
    this._user    = null;
    this._ready   = false;

    if (IS_CONFIGURED) {
      this._initFirebase();
    } else {
      console.warn('[FirebaseDataManager] Not configured — using localStorage fallback.');
    }
  }

  // =============================================
  // INITIALISATION
  // =============================================
  async _initFirebase() {
    try {
      // Dynamic imports so the app works even if Firebase SDK isn't loaded
      const { initializeApp }              = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { getAuth }                    = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const { getFirestore }               = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

      this._app  = initializeApp(FIREBASE_CONFIG);
      this._auth = getAuth(this._app);
      this._db   = getFirestore(this._app);
      this._ready = true;

      console.log('[FirebaseDataManager] Firebase initialised.');
    } catch (err) {
      console.error('[FirebaseDataManager] Init failed, falling back to localStorage:', err);
      this._ready = false;
    }
  }

  get isReady() { return this._ready; }
  get currentUser() { return this._user; }

  // =============================================
  // AUTH
  // =============================================
  async signIn(email, password) {
    if (!this._ready) return { success: false, reason: 'Firebase not configured.' };
    try {
      const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const cred = await signInWithEmailAndPassword(this._auth, email, password);
      this._user = cred.user;
      return { success: true, user: cred.user };
    } catch (err) {
      return { success: false, reason: this._friendlyError(err.code) };
    }
  }

  async signUp(email, password, username) {
    if (!this._ready) return { success: false, reason: 'Firebase not configured.' };
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const cred = await createUserWithEmailAndPassword(this._auth, email, password);
      await updateProfile(cred.user, { displayName: username });
      this._user = cred.user;
      return { success: true, user: cred.user };
    } catch (err) {
      return { success: false, reason: this._friendlyError(err.code) };
    }
  }

  async signOut() {
    if (!this._ready) return;
    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    await signOut(this._auth);
    this._user = null;
  }

  onAuthStateChanged(callback) {
    if (!this._ready) { callback(null); return; }
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').then(({ onAuthStateChanged }) => {
      onAuthStateChanged(this._auth, user => {
        this._user = user;
        callback(user);
      });
    });
  }

  // =============================================
  // GAME STATE PERSISTENCE
  // =============================================
  async saveGameState(gameStateFn) {
    const state = typeof gameStateFn === 'function' ? gameStateFn() : gameStateFn;

    // Always save to localStorage first (immediate + offline fallback)
    this._sm.save(state);

    if (!this._ready || !this._user) return;

    try {
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      const ref = doc(this._db, COLLECTION_GAME_SAVES, this._user.uid);
      await setDoc(ref, {
        ...state,
        updatedAt: serverTimestamp(),
        uid: this._user.uid,
        displayName: this._user.displayName ?? 'Commander',
      });
      console.log('[FirebaseDataManager] Game state saved to Firestore.');
    } catch (err) {
      console.warn('[FirebaseDataManager] Firestore save failed, localStorage already saved:', err);
    }
  }

  async loadGameState() {
    // Try Firestore first if signed in
    if (this._ready && this._user) {
      try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const ref  = doc(this._db, COLLECTION_GAME_SAVES, this._user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          console.log('[FirebaseDataManager] Loaded game state from Firestore.');
          return snap.data();
        }
      } catch (err) {
        console.warn('[FirebaseDataManager] Firestore load failed, trying localStorage:', err);
      }
    }
    // Fallback to localStorage
    return this._sm.load();
  }

  async wipe() {
    this._sm.wipe();
    if (!this._ready || !this._user) return;
    try {
      const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      await deleteDoc(doc(this._db, COLLECTION_GAME_SAVES, this._user.uid));
    } catch (err) {
      console.warn('[FirebaseDataManager] Firestore delete failed:', err);
    }
  }

  // =============================================
  // LEADERBOARD (Optional)
  // =============================================
  async postLeaderboardScore(username, level, victories) {
    if (!this._ready || !this._user) return;
    try {
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      await setDoc(doc(this._db, COLLECTION_LEADERBOARD, this._user.uid), {
        username,
        level,
        victories,
        uid: this._user.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[FirebaseDataManager] Leaderboard post failed:', err);
    }
  }

  async getLeaderboard(limit = 20) {
    if (!this._ready) return [];
    try {
      const { collection, query, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      const q    = query(collection(this._db, COLLECTION_LEADERBOARD), orderBy('level', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.slice(0, limit).map(d => d.data());
    } catch (err) {
      console.warn('[FirebaseDataManager] Leaderboard fetch failed:', err);
      return [];
    }
  }

  // =============================================
  // HELPERS
  // =============================================
  _friendlyError(code) {
    const map = {
      'auth/user-not-found':       'No account found with that email.',
      'auth/wrong-password':       'Incorrect password.',
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/weak-password':        'Password must be at least 6 characters.',
      'auth/invalid-email':        'Please enter a valid email address.',
      'auth/too-many-requests':    'Too many attempts. Please wait a moment.',
    };
    return map[code] ?? `Authentication error (${code}).`;
  }
}
