// ─────────────────────────────────────────────────────────────
// Uni Finder configuration. Fill these in once (see README.md).
// Nothing here is secret: Firebase web config is meant to be public,
// and access is protected by firestore.rules. The Gemini key lives
// only in the Cloudflare Worker, never in this file.
// ─────────────────────────────────────────────────────────────
window.UNI_CONFIG = {
  // Firebase console → Project settings → Your apps → Web app → SDK config
  firebase: {
    apiKey: "AIzaSyAjF5UxW9NXMTIbKVnq55U7vHS2tWcL9o4",
    authDomain: "univ-find.firebaseapp.com",
    projectId: "univ-find",
    storageBucket: "univ-find.firebasestorage.app",
    messagingSenderId: "177872400676",
    appId: "1:177872400676:web:3112b1553982f57ef4c3b1"
  },

  // URL of your deployed Cloudflare Worker, e.g. "https://uni-finder-ai.<you>.workers.dev"
  aiWorkerUrl: "",

  // Shown in the footer
  siteName: "Uni Finder"
};
// If firebase.apiKey is empty the site runs in "local demo" mode:
// data stays in this browser only, and there is no sign-in.
