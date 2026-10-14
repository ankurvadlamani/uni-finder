// Data layer: Firebase (multi-user) or localStorage (demo mode).
// Everything a user owns lives under users/{uid}/... and firestore.rules
// make sure only that user can read or write it.

const FB_VER = "10.12.2";
const cfg = window.UNI_CONFIG || {};
export const isDemo = !(cfg.firebase && cfg.firebase.apiKey);

let fb = null;          // firebase modules once loaded
let auth = null, db = null;

async function loadFirebase() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}`;
  const [app, a, f] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  const inst = app.initializeApp(cfg.firebase);
  auth = a.getAuth(inst);
  db = f.getFirestore(inst);
  fb = { app, a, f };
  return fb;
}

// ── Auth ────────────────────────────────────────────────────
const DEMO_USER = { uid: "demo", email: "demo@local", displayName: "Demo user", demo: true };

export async function onUser(cb) {
  if (isDemo) { cb(lsGet("demo:signedIn") ? DEMO_USER : null); return; }
  const { a } = await loadFirebase();
  a.onAuthStateChanged(auth, u => cb(u));
}

export async function signInGoogle() {
  if (isDemo) { lsSet("demo:signedIn", true); location.reload(); return; }
  const { a } = await loadFirebase();
  const p = new a.GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  try { await a.signInWithPopup(auth, p); }
  catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")
      return a.signInWithRedirect(auth, p);
    throw e;
  }
}

export async function signInEmail(email, pass, create) {
  if (isDemo) { lsSet("demo:signedIn", true); location.reload(); return; }
  const { a } = await loadFirebase();
  return create
    ? a.createUserWithEmailAndPassword(auth, email, pass)
    : a.signInWithEmailAndPassword(auth, email, pass);
}

export async function resetPassword(email) {
  if (isDemo) return;
  const { a } = await loadFirebase();
  return a.sendPasswordResetEmail(auth, email);
}

export async function signOut() {
  if (isDemo) { lsSet("demo:signedIn", false); location.reload(); return; }
  const { a } = await loadFirebase();
  return a.signOut(auth);
}

export async function idToken() {
  if (isDemo) return "demo";
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

// ── Documents ───────────────────────────────────────────────
// Paths: "users/{uid}" (doc) and "users/{uid}/{coll}" (collection)

function lsGet(k) { try { return JSON.parse(localStorage.getItem("uf:" + k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem("uf:" + k, JSON.stringify(v)); } catch {} }

export async function getUserDoc(uid) {
  if (isDemo) return lsGet(`u:${uid}`) || null;
  const { f } = await loadFirebase();
  const s = await f.getDoc(f.doc(db, "users", uid));
  return s.exists() ? s.data() : null;
}

export async function saveUserDoc(uid, data) {
  data.updatedAt = new Date().toISOString();
  if (isDemo) { lsSet(`u:${uid}`, { ...(lsGet(`u:${uid}`) || {}), ...data }); return; }
  const { f } = await loadFirebase();
  await f.setDoc(f.doc(db, "users", uid), clean(data), { merge: true });
}

export async function list(uid, coll) {
  if (isDemo) return Object.values(lsGet(`c:${uid}:${coll}`) || {});
  const { f } = await loadFirebase();
  const s = await f.getDocs(f.collection(db, "users", uid, coll));
  return s.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function put(uid, coll, id, data) {
  data.updatedAt = new Date().toISOString();
  if (isDemo) {
    const all = lsGet(`c:${uid}:${coll}`) || {};
    all[id] = { ...(all[id] || {}), ...data, id };
    lsSet(`c:${uid}:${coll}`, all); return;
  }
  const { f } = await loadFirebase();
  await f.setDoc(f.doc(db, "users", uid, coll, id), clean(data), { merge: true });
}

export async function replace(uid, coll, id, data) {
  data.updatedAt = new Date().toISOString();
  if (isDemo) {
    const all = lsGet(`c:${uid}:${coll}`) || {};
    all[id] = { ...data, id }; lsSet(`c:${uid}:${coll}`, all); return;
  }
  const { f } = await loadFirebase();
  await f.setDoc(f.doc(db, "users", uid, coll, id), clean(data));
}

export async function remove(uid, coll, id) {
  if (isDemo) {
    const all = lsGet(`c:${uid}:${coll}`) || {}; delete all[id];
    lsSet(`c:${uid}:${coll}`, all); return;
  }
  const { f } = await loadFirebase();
  await f.deleteDoc(f.doc(db, "users", uid, coll, id));
}

// Firestore rejects undefined values
function clean(o) { return JSON.parse(JSON.stringify(o)); }

export function newId(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
