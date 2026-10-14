// Uni Finder deadline agent. Runs daily on GitHub Actions (free).
//
// For every user and every active programme on their list it:
//   1. writes deadline reminders (30 / 14 / 7 / 2 / 0 days) and "applications open today" alerts
//   2. re-checks programmes not verified in VERIFY_DAYS on official pages via Gemini + Google Search,
//      and stores any changes as `pending` for the user to accept (it never overwrites their data)
//   3. optionally emails a digest (if RESEND_API_KEY is set and the user turned emails on)
//
// Secrets: FIREBASE_SERVICE_ACCOUNT (JSON), GEMINI_API_KEY; optional RESEND_API_KEY, ALERT_FROM, SITE_URL
// Vars:    MAX_VERIFY (default 25 re-checks per run), VERIFY_DAYS (default 7), GEMINI_MODEL

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { TASKS, gemini, parseJSON } from "../worker/worker.js";

const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash"
};
const MAX_VERIFY = parseInt(process.env.MAX_VERIFY || "25", 10);
const VERIFY_DAYS = parseInt(process.env.VERIFY_DAYS || "7", 10);
const DRY = process.argv.includes("--dry-run");
const ACTIVE = ["shortlisted", "preparing", undefined, null, ""];
const THRESHOLDS = [0, 2, 7, 14, 30];

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const auth = getAuth();

const today = new Date().toISOString().slice(0, 10);
const daysUntil = d => d ? Math.ceil((new Date(d + "T23:59:59Z") - Date.now()) / 864e5) : null;
const get = (o, p) => p.split(".").reduce((a, k) => a == null ? a : a[k], o);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = p => (p.uni + "|" + p.program).toLowerCase().replace(/\W/g, "");
const ALLOWED = new Set(["dates.opens", "dates.deadline", "dates.docs", "dates.results", "deadlineNote", "intake", "tuition.amount", "tuition.currency", "tuition.per", "tuition.note", "appFee", "requirements.gpa", "requirements.english", "requirements.prereqs", "requirements.other", "links.program", "links.apply", "portal"]);

const verifyCache = new Map(); // same programme on several users' lists → checked once
let verifyBudget = MAX_VERIFY;
const stats = { users: 0, programs: 0, alerts: 0, verified: 0, changes: 0, emails: 0, errors: 0 };

async function verify(p, profile) {
  const key = norm(p);
  if (verifyCache.has(key)) return verifyCache.get(key);
  if (verifyBudget <= 0) return null;
  verifyBudget--;
  const { docsDone, notes, log, sources, pending, alerted, ...rec } = p;
  const prompt = TASKS.verify.prompt({ program: rec, profile: { nationality: profile?.nationality, degree: profile?.degree } }, today);
  let out = null;
  for (let attempt = 0; attempt < 2 && !out; attempt++) {
    try {
      const r = await gemini(env, prompt, TASKS.verify.opts);
      out = parseJSON(r.text);
    } catch (e) {
      console.warn("verify failed", p.uni, p.program, e.message);
      await sleep(15000);
    }
  }
  await sleep(6500); // stay under free-tier requests/minute
  verifyCache.set(key, out);
  if (out) stats.verified++;
  return out;
}

async function run() {
  const users = await db.collection("users").listDocuments();
  for (const uref of users) {
    stats.users++;
    try {
      const udoc = (await uref.get()).data() || {};
      const snap = await uref.collection("programs").get();
      const newAlerts = [];
      // soonest deadlines first so they get the re-check budget
      const progs = snap.docs.map(d => ({ ref: d.ref, p: { ...d.data(), id: d.id } }))
        .sort((a, b) => (get(a.p, "dates.deadline") || "9999").localeCompare(get(b.p, "dates.deadline") || "9999"));

      for (const { ref, p } of progs) {
        if (!ACTIVE.includes(p.status)) continue;
        stats.programs++;
        const patch = {};
        const d = daysUntil(get(p, "dates.deadline"));
        const name = `${p.program} (${p.uni})`;

        // 1. deadline reminders
        if (d != null && d >= 0) {
          const t = THRESHOLDS.find(x => d <= x);
          const alerted = { ...(p.alerted || {}) };
          if (t != null && !alerted[t]) {
            THRESHOLDS.filter(x => x >= t).forEach(x => alerted[x] = true);
            patch.alerted = alerted;
            newAlerts.push({ kind: "deadline", programId: p.id, text: d === 0 ? `${name}: the deadline is TODAY.` : `${name}: ${d} day${d === 1 ? "" : "s"} left (deadline ${p.dates.deadline}).${p.deadlineNote ? " " + p.deadlineNote : ""}` });
          }
        }
        if (get(p, "dates.opens") === today && !(p.alerted || {}).opened) {
          patch.alerted = { ...(patch.alerted || p.alerted || {}), opened: true };
          newAlerts.push({ kind: "deadline", programId: p.id, text: `${name}: applications open today.`, source: get(p, "links.apply") || "" });
        }

        // 2. official re-check
        const stale = !p.lastChecked || (Date.now() - new Date(p.lastChecked)) / 864e5 >= VERIFY_DAYS;
        if (stale && !p.pending && (d == null || d >= 0)) {
          const v = await verify(p, udoc.profile);
          if (v) {
            const changes = Object.fromEntries(Object.entries(v.changes || {})
              .filter(([k, val]) => ALLOWED.has(k) && val != null && JSON.stringify(get(p, k)) !== JSON.stringify(val)));
            if (Object.keys(changes).length) {
              stats.changes++;
              patch.pending = { changes, summary: v.summary || "Changes found", source: v.officialUrl || "", date: today };
              newAlerts.push({ kind: "change", programId: p.id, text: `${name}: ${(v.summary || "the official page shows changes").replace(/\.\s*$/, "")}. Open it to review and accept.`, source: v.officialUrl || "" });
            } else {
              patch.lastChecked = today;
              patch.verifyNote = v.summary || (v.confirmed ? "Confirmed by the agent" : "Agent couldn't confirm");
            }
          }
        }

        if (Object.keys(patch).length && !DRY) await ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
      }

      for (const a of newAlerts) {
        stats.alerts++;
        if (!DRY) await uref.collection("alerts").add({ ...a, date: today, read: false, createdAt: new Date().toISOString() });
      }
      if (newAlerts.length && udoc.settings?.emailAlerts) await email(uref.id, udoc, newAlerts);
      if (DRY && newAlerts.length) console.log(uref.id, newAlerts);
    } catch (e) {
      stats.errors++; console.error("user", uref.id, e);
    }
  }
  console.log("Agent finished", today, stats, `re-check budget left: ${verifyBudget}`);
}

async function email(uid, udoc, alerts) {
  if (!process.env.RESEND_API_KEY || DRY) return;
  try {
    const user = await auth.getUser(uid);
    if (!user.email) return;
    const site = process.env.SITE_URL || "";
    const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_FROM || "Uni Finder <onboarding@resend.dev>",
        to: [user.email],
        subject: `Uni Finder: ${alerts.length} update${alerts.length > 1 ? "s" : ""} on your list`,
        html: `<p>Hi ${esc((udoc.profile?.name || "").split(" ")[0] || "there")},</p><ul>${alerts.map(a => `<li>${esc(a.text)}</li>`).join("")}</ul>${site ? `<p><a href="${site}#/alerts">Open Uni Finder</a></p>` : ""}<p style="color:#888;font-size:12px">You can turn these emails off in Settings.</p>`
      })
    });
    if (r.ok) stats.emails++; else console.warn("email failed", await r.text());
  } catch (e) { console.warn("email error", e.message); }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
