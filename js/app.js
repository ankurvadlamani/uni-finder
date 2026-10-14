import * as S from "./store.js";
import { ai, aiReady } from "./ai.js";

// ── helpers ─────────────────────────────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = u => /^https?:\/\//i.test(u || "") ? esc(u) : "";
const md = t => window.DOMPurify && window.marked ? DOMPurify.sanitize(marked.parse(String(t || ""))) : `<pre>${esc(t)}</pre>`;
const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = d => d ? Math.ceil((new Date(d + "T23:59:59") - new Date()) / 864e5) : null;
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
const get = (o, p) => p.split(".").reduce((a, k) => a == null ? a : a[k], o);
const setPath = (o, p, v) => { const ks = p.split("."); let x = o; ks.slice(0, -1).forEach(k => { if (typeof x[k] !== "object" || !x[k]) x[k] = {}; x = x[k]; }); x[ks.at(-1)] = v; };

function toast(msg, ms = 3200) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
async function busy(btn, fn) {
  const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Working…`;
  try { return await fn(); } catch (e) { console.error(e); toast(e.message || String(e), 6000); }
  finally { btn.disabled = false; btn.innerHTML = html; }
}

const ICON = {
  logo: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3zm-6 9.2V16l6 3.3 6-3.3v-3.8L12 15.5 6 12.2z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>'
};

const COUNTRIES = { DE: "Germany", NL: "Netherlands", SE: "Sweden", FR: "France", NO: "Norway", FI: "Finland", DK: "Denmark", IT: "Italy", ES: "Spain", AT: "Austria", CH: "Switzerland", BE: "Belgium", IE: "Ireland", PL: "Poland", CZ: "Czechia", PT: "Portugal", GB: "United Kingdom", US: "United States", CA: "Canada", AU: "Australia", EU: "Erasmus Mundus / joint" };
const FIELDS = ["Robotics", "Automation", "Embedded", "Electronics", "VLSI", "Computer Engineering", "Computer Science", "AI / ML", "Data Science", "Communications", "Power / Energy", "Mechatronics", "Autonomous Systems"];
const STATUSES = { shortlisted: "Shortlisted", preparing: "Preparing", applied: "Applied", interview: "Interview", admitted: "Admitted", rejected: "Rejected", dropped: "Dropped" };
const ACTIVE = ["shortlisted", "preparing"];
const DOCS = { transcripts: "Transcripts", degree: "Degree / provisional certificate", cv: "CV", sop: "Statement of purpose", lor1: "Recommendation letter 1", lor2: "Recommendation letter 2", english: "English test score", passport: "Passport", courses: "Course descriptions", appfee: "Application fee paid", aps: "APS certificate", dmat: "dMAT score", gre: "GRE score", campusfrance: "Campus France / Études en France", portfolio: "Portfolio / project links" };
const FX = { EUR: 1, SEK: .088, NOK: .086, DKK: .134, CHF: 1.05, GBP: 1.17, USD: .92, CAD: .67, AUD: .6, PLN: .23, CZK: .04, INR: .0108 };

function defaultDocs(p, profile) {
  const d = ["transcripts", "degree", "cv", "sop", "lor1", "lor2", "english", "passport", "courses"];
  if (p.appFee) d.push("appfee");
  const ind = /india/i.test(profile?.nationality || "");
  if (p.country === "DE") { if (ind || /china|vietnam/i.test(profile?.nationality || "")) d.push("aps"); if (ind) d.push("dmat"); }
  if (p.country === "SE" && !d.includes("appfee")) d.push("appfee");
  if (p.country === "FR" && ind) d.push("campusfrance");
  if ((p.flags || []).some(f => /GRE/i.test(f)) || /GRE/i.test(JSON.stringify(p.requirements || {}))) d.push("gre");
  return [...new Set(d)];
}

function costEUR(p) {
  const t = p.tuition || {}; const rate = FX[(t.currency || "EUR").toUpperCase()] ?? null;
  const years = p.durationYears || 2;
  let tuition = null;
  if (t.amount != null && rate != null) tuition = t.amount * rate * (t.per === "semester" ? years * 2 : t.per === "total" ? 1 : years);
  const lc = p.livingCostMonthly || {}; const lr = FX[(lc.currency || "EUR").toUpperCase()] ?? null;
  const living = lc.amount != null && lr != null ? lc.amount * lr * 12 * years : null;
  return { tuition, living, total: tuition != null ? tuition + (living || 0) : null };
}
function money(eur) {
  if (eur == null) return "—";
  const cur = state.doc?.settings?.currency || "EUR";
  const v = eur / (FX[cur] || 1);
  return (cur === "EUR" ? "€" : cur + " ") + Math.round(v).toLocaleString();
}
const tuitionText = t => !t || t.amount == null ? (t?.note || "Unknown") : t.amount === 0 ? "No tuition" : `${Number(t.amount).toLocaleString()} ${t.currency || ""} / ${t.per || "year"}`;

// ── state ───────────────────────────────────────────────────
const state = { user: null, doc: null, programs: [], alerts: [], sops: [], chat: [], lastResults: [], usage: null };
const uid = () => state.user.uid;
document.addEventListener("ai-usage", e => { state.usage = e.detail; const u = $("#usage"); if (u) u.textContent = `AI today: ${e.detail.used}/${e.detail.limit}`; });

async function loadAll() {
  const [doc, programs, alerts, sops] = await Promise.all([
    S.getUserDoc(uid()), S.list(uid(), "programs"), S.list(uid(), "alerts"), S.list(uid(), "sops")
  ]);
  state.doc = doc || {}; state.programs = programs; state.alerts = alerts; state.sops = sops;
  applyTheme();
}
function applyTheme() { const th = state.doc?.settings?.theme; if (th && th !== "auto") document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme; }

// ── boot ────────────────────────────────────────────────────
S.onUser(async u => {
  state.user = u;
  if (!u) return renderLogin();
  try { await loadAll(); } catch (e) { console.error(e); return renderError(e); }
  if (!state.doc.email) S.saveUserDoc(uid(), { email: u.email || "", name: u.displayName || "", createdAt: new Date().toISOString() });
  if (!state.doc.profile || !state.doc.profile.done) location.hash = "#/welcome";
  route();
});
window.addEventListener("hashchange", () => state.user && route());

function renderError(e) {
  $("#app").innerHTML = `<div class="login"><div class="card"><h2>Something went wrong</h2><p class="muted">${esc(e.message)}</p>
  <p class="faint">If this is a new setup, check config.js and firestore.rules (README step 2).</p><button onclick="location.reload()">Reload</button></div></div>`;
}

// ── login ───────────────────────────────────────────────────
function renderLogin() {
  const demo = S.isDemo;
  $("#app").innerHTML = `<div class="login"><div class="card">
    <div class="row" style="gap:10px;margin-bottom:6px"><span style="width:30px;color:var(--accent)">${ICON.logo}</span><span class="big">Uni Finder</span></div>
    <p class="muted">Find master's programmes that fit your profile, track every deadline and cost in one place, and get help with your SOP. Free.</p>
    ${demo ? `<div class="notice">Local demo mode: Firebase isn't configured yet, so data stays in this browser and AI is off.</div>` : ""}
    <button class="gbtn primary" id="g">${demo ? "Enter demo" : `<svg viewBox="0 0 24 24" width="18"><path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#fff" opacity=".8" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#fff" opacity=".6" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#fff" opacity=".7" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"/></svg> Continue with Google`}</button>
    ${demo ? "" : `<div class="or">or with email</div>
    <form id="ef"><div class="field"><input type="email" id="em" placeholder="Email" required autocomplete="email"></div>
    <div class="field"><input type="password" id="pw" placeholder="Password (min 6 characters)" required minlength="6" autocomplete="current-password"></div>
    <div class="row between"><button class="primary" type="submit">Sign in</button><button type="button" id="cr">Create account</button></div>
    <button type="button" class="ghost" id="fp" style="padding-left:0;margin-top:8px">Forgot password?</button></form>`}
    <p class="faint" style="margin-top:16px">Each account's list and profile are private to that account. AI features send the profile details you enter to Google's Gemini API to generate results.</p>
  </div></div>`;
  $("#g").onclick = e => busy(e.currentTarget, () => S.signInGoogle());
  if (demo) return;
  const go = create => busy($("#ef button[type=submit]"), () => S.signInEmail($("#em").value.trim(), $("#pw").value, create).catch(err => { throw new Error(authMsg(err)); }));
  $("#ef").onsubmit = e => { e.preventDefault(); go(false); };
  $("#cr").onclick = () => { if ($("#ef").reportValidity()) go(true); };
  $("#fp").onclick = async () => { const em = $("#em").value.trim(); if (!em) return toast("Type your email first"); await S.resetPassword(em).catch(() => {}); toast("If that account exists, a reset email is on its way."); };
}
const authMsg = e => ({ "auth/invalid-credential": "Wrong email or password.", "auth/email-already-in-use": "That email already has an account. Sign in instead.", "auth/weak-password": "Use at least 6 characters.", "auth/user-not-found": "No account with that email." }[e.code] || e.message);

// ── shell ───────────────────────────────────────────────────
const NAV = [
  ["dashboard", "Home", "home"], ["find", "Find", "search"], ["list", "My list", "list"], ["sop", "SOP", "pen"],
  ["ask", "Ask", "chat"], ["alerts", "Alerts", "bell"], ["profile", "Profile", "user", "extra"], ["settings", "Settings", "gear", "extra"]
];
function shell(view, inner) {
  const unread = state.alerts.filter(a => !a.read).length;
  $("#app").innerHTML = `<div class="shell"><aside class="side">
    <div class="brand">${ICON.logo} Uni Finder</div>
    <nav class="nav">${NAV.map(([k, l, i, x]) => `<a href="#/${k}" class="${view === k ? "on" : ""} ${x || ""}">${ICON[i]}<span>${l}</span>${k === "alerts" && unread ? `<span class="badge bad">${unread}</span>` : ""}</a>`).join("")}</nav>
    <div class="foot">${esc(state.user.email || state.user.displayName || "")}<br><span id="usage">${state.usage ? `AI today: ${state.usage.used}/${state.usage.limit}` : ""}</span><br>
    <a href="#" id="so">Sign out</a></div></aside>
    <main class="main" id="main"><div class="mtop"><div class="brand">${ICON.logo} Uni Finder</div><div><a href="#/profile" aria-label="Profile">${ICON.user}</a><a href="#/settings" aria-label="Settings">${ICON.gear}</a></div></div>${inner}</main></div>`;
  $("#so").onclick = e => { e.preventDefault(); S.signOut(); };
}
function header(title, sub, actions = "") {
  return `<div class="top"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ""}</div><div class="row">${actions}</div></div>`;
}
const aiNotice = () => aiReady ? "" : `<div class="notice">AI features aren't connected on this site yet (${S.isDemo ? "demo mode" : "aiWorkerUrl is missing in config.js"}). You can still add and track programmes by hand.</div>`;

function route() {
  const [, view = "dashboard", arg] = location.hash.split("/");
  const views = { welcome: viewWelcome, dashboard: viewDashboard, find: viewFind, list: viewList, sop: viewSop, ask: viewAsk, alerts: viewAlerts, profile: viewProfile, settings: viewSettings, p: viewList };
  (views[view] || viewDashboard)(arg);
  if (view === "p" && arg) openProgram(arg);
  window.scrollTo(0, 0);
}

// ── profile form (onboarding + edit) ────────────────────────
const P = () => state.doc.profile || {};
const STEPS = [
  { t: "About you", f: p => `
    <div class="grid g2">
      ${inp("name", "Full name", p.name || state.user.displayName)}
      ${inp("nationality", "Nationality", p.nationality, "Affects fees, visas and documents like APS")}
    </div>
    <div class="grid g2">
      ${inp("degree", "Bachelor's degree", p.degree, "e.g. B.Tech, B.E., B.Sc.")}
      ${inp("major", "Major / branch", p.major, "e.g. Electronics & Communication")}
    </div>
    <div class="grid g3">
      ${inp("university", "University", p.university)}
      ${inp("gradYear", "Graduation year", p.gradYear, "", "number")}
      ${inp("credits", "Total ECTS / credits (if known)", p.credits)}
    </div>
    <div class="grid g3">
      ${inp("gpa", "GPA / CGPA", p.gpa, "", "number", "step=0.01")}
      ${sel("gpaScale", "Out of", p.gpaScale || "10", ["10", "4", "5", "100"])}
      ${inp("backlogs", "Backlogs / failed courses", p.backlogs ?? "0", "", "number")}
    </div>` },
  { t: "Tests & languages", f: p => `
    <div class="grid g4">
      ${inp("ielts", "IELTS overall", p.ielts, "", "number", "step=0.5")}
      ${inp("ieltsMin", "IELTS lowest band", p.ieltsMin, "", "number", "step=0.5")}
      ${inp("toefl", "TOEFL iBT", p.toefl, "", "number")}
      ${inp("pte", "PTE / Duolingo", p.pte)}
    </div>
    <div class="grid g4">
      ${inp("greQ", "GRE Quant", p.greQ, "", "number")}
      ${inp("greV", "GRE Verbal", p.greV, "", "number")}
      ${inp("greAW", "GRE AWA", p.greAW, "", "number", "step=0.5")}
      ${inp("gate", "GATE score / rank", p.gate)}
    </div>
    <div class="grid g3">
      ${sel("german", "German", p.german || "none", ["none", "A1", "A2", "B1", "B2", "C1", "C2", "native"])}
      ${sel("french", "French", p.french || "none", ["none", "A1", "A2", "B1", "B2", "C1", "C2", "native"])}
      ${inp("otherTests", "Other (dMAT, TestAS, APS status…)", p.otherTests)}
    </div>` },
  { t: "Experience & resume", f: p => `
    <div class="grid g2">${inp("workMonths", "Full-time work experience (months)", p.workMonths ?? "0", "", "number")}${inp("links", "GitHub / portfolio / LinkedIn", p.links)}</div>
    ${area("internships", "Internships & jobs", p.internships, "Where, what you built, measurable results")}
    ${area("projects", "Key projects", p.projects, "2–5 projects: tech used, your role, outcome")}
    ${area("research", "Research, papers, competitions, awards", p.research)}
    <div class="field"><label>Resume</label>
      <div class="row" style="margin-bottom:6px"><label class="btn" style="margin:0">Upload PDF<input type="file" id="pdf" accept="application/pdf" hidden></label><span class="faint" id="pdfst">Text is extracted in your browser; the file isn't uploaded anywhere.</span></div>
      <textarea id="f_resumeText" placeholder="…or paste your resume text here" style="min-height:160px">${esc(p.resumeText)}</textarea></div>` },
  { t: "What you want", f: p => `
    <div class="field"><label>Fields of interest</label>${chips("fields", FIELDS, p.fields || [])}</div>
    <div class="field"><label>Countries</label>${chips("countries", Object.keys(COUNTRIES), p.countries || [], k => COUNTRIES[k])}</div>
    <div class="grid g3">
      ${sel("intake", "Preferred intake", p.intake || "any", ["any", "earliest available", "summer / spring (Feb–Apr)", "autumn / winter (Aug–Oct)"])}
      ${inp("startYear", "Start year", p.startYear || new Date().getFullYear() + 1, "", "number")}
      ${inp("budget", "Max tuition per year (EUR)", p.budget, "Leave empty for no limit", "number")}
    </div>
    ${area("avoid", "Things to avoid or prefer", p.avoid, "e.g. no mechatronics/control prerequisites, English-taught only, prefer research-oriented")}
    ${area("goals", "Career goals (optional)", p.goals)}` }
];
function inp(k, l, v, hint = "", type = "text", extra = "") { return `<div class="field"><label for="f_${k}">${l}</label><input id="f_${k}" type="${type}" ${extra} value="${esc(v ?? "")}">${hint ? `<div class="hint">${hint}</div>` : ""}</div>`; }
function area(k, l, v, hint = "") { return `<div class="field"><label for="f_${k}">${l}</label><textarea id="f_${k}" ${hint ? `placeholder="${esc(hint)}"` : ""}>${esc(v)}</textarea></div>`; }
function sel(k, l, v, opts) { return `<div class="field"><label for="f_${k}">${l}</label><select id="f_${k}">${opts.map(o => `<option ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`; }
function chips(k, opts, on, lab = x => x) { return `<div class="chips" data-chips="${k}">${opts.map(o => `<span class="chip ${on.includes(o) ? "on" : ""}" data-v="${esc(o)}">${esc(lab(o))}</span>`).join("")}</div>`; }
function wireChips(root) { $$(".chip", root).forEach(c => c.onclick = () => c.classList.toggle("on")); }
function readForm(root) {
  const out = {};
  $$("[id^=f_]", root).forEach(el => { out[el.id.slice(2)] = el.type === "number" ? (el.value === "" ? null : Number(el.value)) : el.value.trim(); });
  $$("[data-chips]", root).forEach(c => out[c.dataset.chips] = $$(".chip.on", c).map(x => x.dataset.v));
  return out;
}
function wirePdf(root) {
  const f = $("#pdf", root); if (!f) return;
  f.onchange = async () => {
    const st = $("#pdfst", root); st.textContent = "Reading PDF…";
    try {
      if (!window.pdfjsLib) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const doc = await pdfjsLib.getDocument({ data: await f.files[0].arrayBuffer() }).promise;
      let text = "";
      for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
        const c = await (await doc.getPage(i)).getTextContent();
        text += c.items.map(it => it.str + (it.hasEOL ? "\n" : " ")).join("") + "\n";
      }
      $("#f_resumeText", root).value = text.replace(/[ \t]+\n/g, "\n").trim();
      st.textContent = `Extracted ${doc.numPages} page(s). Check the text below.`;
    } catch (e) { st.textContent = "Couldn't read that PDF — paste the text instead."; }
  };
}
const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });

async function saveProfile(data) {
  const profile = { ...P(), ...data };
  if (profile.gpa != null && profile.gpaScale) profile.gpaPercent = Math.round(profile.gpa / Number(profile.gpaScale) * 1000) / 10;
  state.doc.profile = profile;
  await S.saveUserDoc(uid(), { profile });
}

async function runAssessment() {
  const r = await ai("assess", { profile: P() });
  state.doc.assessment = { ...r.data, date: today() };
  await S.saveUserDoc(uid(), { assessment: state.doc.assessment });
}

// ── welcome / onboarding ────────────────────────────────────
function viewWelcome(stepArg) {
  const step = Math.max(0, Math.min(STEPS.length - 1, parseInt(stepArg || "0", 10)));
  const s = STEPS[step];
  shell("profile", `${header(step === 0 ? "Welcome! Let's build your profile" : s.t, `Step ${step + 1} of ${STEPS.length}. This is used to judge your chances and find programmes that fit. You can edit it any time.`)}
    <div class="steps">${STEPS.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
    <div class="card" id="form">${step === 0 ? "" : `<h2>${s.t}</h2>`}${s.f(P())}
    <div class="row between" style="margin-top:8px">
      ${step > 0 ? `<button id="back">Back</button>` : "<span></span>"}
      <button class="primary" id="next">${step === STEPS.length - 1 ? (aiReady ? "Finish & assess my profile" : "Finish") : "Continue"}</button></div></div>`);
  const root = $("#form"); wireChips(root); wirePdf(root);
  if ($("#back")) $("#back").onclick = async () => { await saveProfile(readForm(root)); location.hash = `#/welcome/${step - 1}`; };
  $("#next").onclick = e => busy(e.currentTarget, async () => {
    await saveProfile(readForm(root));
    if (step < STEPS.length - 1) { location.hash = `#/welcome/${step + 1}`; return; }
    await saveProfile({ done: true });
    if (aiReady) { try { await runAssessment(); } catch (err) { toast("Profile saved, but the assessment failed: " + err.message, 6000); } }
    location.hash = "#/profile";
  });
}

// ── dashboard ───────────────────────────────────────────────
function viewDashboard() {
  const p = P(), a = state.doc.assessment;
  const active = state.programs.filter(x => ACTIVE.includes(x.status || "shortlisted"));
  const upcoming = state.programs.filter(x => ACTIVE.includes(x.status || "shortlisted") && daysUntil(get(x, "dates.deadline")) >= 0)
    .sort((x, y) => x.dates.deadline.localeCompare(y.dates.deadline));
  const soon = upcoming.filter(x => daysUntil(x.dates.deadline) <= 30);
  const costs = active.map(x => costEUR(x).total).filter(v => v != null);
  const counts = Object.keys(STATUSES).map(k => [k, state.programs.filter(x => (x.status || "shortlisted") === k).length]).filter(([, n]) => n);
  shell("dashboard", `${header(`Hi ${esc((p.name || state.user.displayName || "").split(" ")[0] || "there")}`, "Your applications at a glance.", `<a class="btn primary" href="#/find">${ICON.search} Find programmes</a>`)}
    ${aiNotice()}
    <div class="grid g4">
      <div class="card stat"><div class="n">${state.programs.length}</div><div class="l">programmes tracked</div></div>
      <div class="card stat"><div class="n">${soon.length}</div><div class="l">deadlines in 30 days</div></div>
      <div class="card stat"><div class="n">${upcoming[0] ? daysUntil(upcoming[0].dates.deadline) + "d" : "—"}</div><div class="l">to next deadline${upcoming[0] ? ` · ${esc(upcoming[0].uni)}` : ""}</div></div>
      <div class="card stat"><div class="n">${costs.length ? money(Math.min(...costs)) : "—"}</div><div class="l">cheapest total cost (tuition${costs.length ? " + living" : ""}, active)</div></div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><div class="row between"><h2>Upcoming deadlines</h2><a href="#/list">See all</a></div>
        ${upcoming.length ? `<div class="plist">${upcoming.slice(0, 6).map(progRow).join("")}</div>` : `<div class="empty">No upcoming deadlines yet. <a href="#/find">Find programmes</a> or add one by hand.</div>`}</div>
      <div>
        <div class="card"><div class="row between"><h2>Profile strength</h2><a href="#/profile">Details</a></div>
          ${a ? `<div class="row" style="gap:18px;flex-wrap:nowrap">${scoreRing(a.score)}<div><b>${esc(cap(a.tier))}</b><p class="muted" style="margin:4px 0 0">${esc(a.summary)}</p></div></div>`
            : `<p class="muted">${aiReady ? "Get an honest score and tips based on your profile." : "Add AI to get a profile score."}</p>${aiReady ? `<button class="primary" id="as">${ICON.spark} Assess my profile</button>` : ""}`}</div>
        <div class="card"><h2>Status</h2>${counts.length ? `<div class="chips">${counts.map(([k, n]) => `<span class="badge ${statusClass(k)}">${STATUSES[k]} · ${n}</span>`).join("")}</div>` : `<p class="muted">Nothing tracked yet.</p>`}
          ${state.alerts.filter(x => !x.read).length ? `<p style="margin-top:12px"><a href="#/alerts">${state.alerts.filter(x => !x.read).length} new alert(s) from the deadline agent →</a></p>` : ""}</div>
      </div>
    </div>`);
  bindProgRows();
  if ($("#as")) $("#as").onclick = e => busy(e.currentTarget, async () => { await runAssessment(); viewDashboard(); });
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
function scoreRing(n) {
  const c = n >= 80 ? "var(--good)" : n >= 60 ? "var(--accent)" : n >= 40 ? "var(--warn)" : "var(--bad)";
  return `<div class="score" style="background:conic-gradient(${c} ${n * 3.6}deg, var(--panel2) 0);"><div style="width:84px;height:84px;border-radius:50%;background:var(--panel);display:grid;place-items:center">${n}</div></div>`;
}
const statusClass = s => ({ admitted: "good", applied: "accent", interview: "accent", rejected: "bad", dropped: "", preparing: "warn" }[s] || "");
const chanceBadge = c => c ? `<span class="badge ${c === "safe" ? "good" : c === "match" ? "accent" : "reach"}">${cap(c)}</span>` : "";
function deadlineBadge(p) {
  const d = daysUntil(get(p, "dates.deadline"));
  if (d == null) return `<span class="badge">No deadline set</span>`;
  if (d < 0) return `<span class="badge">Closed</span>`;
  return `<span class="badge ${d <= 7 ? "bad" : d <= 30 ? "warn" : ""}">${d === 0 ? "Due today" : d + " days left"}</span>`;
}
function progRow(p) {
  const c = costEUR(p);
  const docs = p.docs || []; const done = docs.filter(k => p.docsDone && p.docsDone[k]).length;
  return `<div class="card prog" data-pid="${esc(p.id)}">
    <div><div class="t">${esc(p.program)}</div><div class="s">${esc(p.uni)} · ${esc(p.city ? p.city + ", " : "")}${esc(COUNTRIES[p.country] || p.country || "")}</div></div>
    <div class="dl"><b>${fmtDate(get(p, "dates.deadline"))}</b><span class="faint">${esc(p.intake || "")}</span></div>
    <div class="meta">${deadlineBadge(p)}<span class="badge ${statusClass(p.status)}">${STATUSES[p.status || "shortlisted"]}</span>${chanceBadge(p.chance)}
      <span class="badge">${esc(tuitionText(p.tuition))}</span>${c.total != null ? `<span class="badge">≈ ${money(c.total)} total</span>` : ""}
      ${docs.length ? `<span class="badge ${done === docs.length ? "good" : ""}">Docs ${done}/${docs.length}</span>` : ""}
      ${p.pending ? `<span class="badge warn">Update found</span>` : ""}${(p.flags || []).length ? `<span class="badge warn" title="${esc(p.flags.join("; "))}">⚑ ${p.flags.length}</span>` : ""}</div></div>`;
}
function bindProgRows(root = document) { $$("[data-pid]", root).forEach(el => el.onclick = () => openProgram(el.dataset.pid)); }

// ── find ────────────────────────────────────────────────────
function viewFind() {
  const p = P();
  shell("find", `${header("Find programmes", "The AI searches official university pages for programmes that fit your profile, with deadlines, costs and your chances.", `<button id="manual">${ICON.plus} Add by hand</button>`)}
    ${aiNotice()}
    <div class="card" id="q">
      <div class="field"><label>Fields</label>${chips("fields", FIELDS, p.fields || [])}</div>
      <div class="field"><label>Countries</label>${chips("countries", Object.keys(COUNTRIES), p.countries || [], k => COUNTRIES[k])}</div>
      <div class="grid g3">
        ${sel("intake", "Intake", p.intake || "any", ["any", "earliest available", "summer / spring (Feb–Apr)", "autumn / winter (Aug–Oct)"])}
        ${inp("budget", "Max tuition / year (EUR)", p.budget, "", "number")}
        ${sel("ambition", "Mix", "balanced", ["balanced", "mostly ambitious (reach)", "mostly safe", "cheapest first"])}
      </div>
      ${inp("extra", "Anything else?", "", "e.g. 'only programmes with no GRE', 'strong in underwater robotics', 'Erasmus Mundus with scholarship'")}
      <div class="row end"><button class="primary" id="go" ${aiReady ? "" : "disabled"}>${ICON.search} Search</button></div>
    </div>
    <div id="res" style="margin-top:16px">${state.lastResults.length ? resultsHtml(state.lastResults) : ""}</div>`);
  wireChips($("#q"));
  $("#manual").onclick = () => openProgram(null);
  $("#go").onclick = e => busy(e.currentTarget, async () => {
    const query = readForm($("#q"));
    $("#res").innerHTML = `<div class="card empty"><span class="spinner"></span><p style="margin-top:10px">Searching official pages… this usually takes 20–60 seconds.</p></div>`;
    try {
      const r = await ai("search", { profile: P(), assessment: brief(state.doc.assessment), query, exclude: state.programs.map(x => `${x.uni} — ${x.program}`) });
      const arr = Array.isArray(r.data) ? r.data : r.data.programs || [];
      state.lastResults = arr.map(x => ({ ...x, _sources: r.sources }));
      $("#res").innerHTML = resultsHtml(state.lastResults); bindResults();
    } catch (err) { $("#res").innerHTML = `<div class="card empty">${esc(err.message)}</div>`; throw err; }
  });
  bindResults();
}
const brief = a => a ? { score: a.score, tier: a.tier, summary: a.summary, weaknesses: a.weaknesses } : null;
function resultsHtml(arr) {
  if (!arr.length) return `<div class="card empty">No matches came back. Try fewer filters.</div>`;
  const src = arr[0]._sources || [];
  return `<h2>${arr.length} suggestions</h2><p class="faint">AI results can be wrong. Open the official link and confirm dates and fees before you rely on them.</p>
  <div class="plist">${arr.map((p, i) => {
    const c = costEUR(p); const have = state.programs.some(x => sameProg(x, p));
    return `<div class="card"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap;gap:14px">
      <div><div class="t" style="font-weight:650">${esc(p.program)}</div><div class="muted" style="font-size:13.5px">${esc(p.uni)} · ${esc(p.city || "")} ${esc(COUNTRIES[p.country] || p.country || "")} · ${esc(p.intake || "")}</div></div>
      <button class="${have ? "" : "primary"}" data-add="${i}" ${have ? "disabled" : ""}>${have ? "On your list" : ICON.plus + " Add"}</button></div>
      <p style="margin:8px 0">${esc(p.why || "")}</p>
      <div class="chips">${chanceBadge(p.chance)}<span class="badge">Deadline ${fmtDate(get(p, "dates.deadline"))}</span><span class="badge">${esc(tuitionText(p.tuition))}</span>
      ${c.total != null ? `<span class="badge">≈ ${money(c.total)} total</span>` : ""}${p.confidence ? `<span class="badge ${p.confidence === "high" ? "good" : p.confidence === "low" ? "warn" : ""}">${esc(p.confidence)} confidence</span>` : ""}
      ${(p.flags || []).map(f => `<span class="badge warn">⚑ ${esc(f)}</span>`).join("")}</div>
      <div class="sources" style="margin-top:8px">${[p.links?.program && `<a target="_blank" rel="noopener" href="${safeUrl(p.links.program)}">Programme page</a>`, p.links?.apply && `<a target="_blank" rel="noopener" href="${safeUrl(p.links.apply)}">Apply page</a>`].filter(Boolean).join(" · ")}
      ${esc(p.requirements?.english || "")}${p.requirements?.gpa ? " · GPA: " + esc(p.requirements.gpa) : ""}</div></div>`;
  }).join("")}</div>
  ${src.length ? `<details class="sources" style="margin-top:12px"><summary>Pages the AI looked at (${src.length})</summary>${src.map(s => `<div><a target="_blank" rel="noopener" href="${safeUrl(s.url)}">${esc(s.title || s.url)}</a></div>`).join("")}</details>` : ""}`;
}
const sameProg = (a, b) => (a.uni + a.program).toLowerCase().replace(/\W/g, "") === (b.uni + b.program).toLowerCase().replace(/\W/g, "");
function bindResults() {
  $$("[data-add]").forEach(b => b.onclick = () => busy(b, async () => {
    const r = { ...state.lastResults[+b.dataset.add] }; const sources = r._sources; delete r._sources;
    const p = { ...r, id: S.newId("p"), status: "shortlisted", addedAt: today(), lastChecked: today(), origin: "ai", sources: (sources || []).slice(0, 8), docsDone: {} };
    p.docs = defaultDocs(p, P());
    await S.put(uid(), "programs", p.id, p); state.programs.push(p);
    b.textContent = "On your list"; b.classList.remove("primary"); b.disabled = true; toast("Added to your list");
  }));
}

// ── list ────────────────────────────────────────────────────
let listFilter = { status: "active", country: "", sort: "deadline", q: "" };
function viewList() {
  const countries = [...new Set(state.programs.map(p => p.country).filter(Boolean))];
  shell("list", `${header("My list", `${state.programs.length} programme(s). Click one for details, documents and AI re-checks.`, `<a class="btn" href="#/find">${ICON.search} Find more</a><button class="primary" id="manual">${ICON.plus} Add</button>`)}
    <div class="toolbar">
      <input id="lq" placeholder="Search…" value="${esc(listFilter.q)}" style="min-width:180px">
      <select id="ls"><option value="active">Active</option><option value="all">All statuses</option>${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
      <select id="lc"><option value="">All countries</option>${countries.map(c => `<option value="${c}">${esc(COUNTRIES[c] || c)}</option>`).join("")}</select>
      <select id="lo"><option value="deadline">Sort: deadline</option><option value="cost">Sort: total cost</option><option value="chance">Sort: chance</option><option value="added">Sort: recently added</option></select>
    </div><div id="lst"></div>`);
  $("#ls").value = listFilter.status; $("#lc").value = listFilter.country; $("#lo").value = listFilter.sort;
  const draw = () => {
    let arr = state.programs.filter(p => {
      const st = p.status || "shortlisted";
      if (listFilter.status === "active" && !["shortlisted", "preparing", "applied", "interview"].includes(st)) return false;
      if (!["active", "all"].includes(listFilter.status) && st !== listFilter.status) return false;
      if (listFilter.country && p.country !== listFilter.country) return false;
      if (listFilter.q && !JSON.stringify([p.uni, p.program, p.city, p.fields]).toLowerCase().includes(listFilter.q.toLowerCase())) return false;
      return true;
    });
    const dk = p => { const d = get(p, "dates.deadline"); return !d ? "9999" : daysUntil(d) < 0 ? "9998" + d : d; };
    const sorters = { deadline: (a, b) => dk(a).localeCompare(dk(b)), cost: (a, b) => (costEUR(a).total ?? 1e12) - (costEUR(b).total ?? 1e12), chance: (a, b) => ["safe", "match", "reach"].indexOf(a.chance) - ["safe", "match", "reach"].indexOf(b.chance), added: (a, b) => (b.addedAt || "").localeCompare(a.addedAt || "") };
    arr.sort(sorters[listFilter.sort]);
    $("#lst").innerHTML = arr.length ? `<div class="plist">${arr.map(progRow).join("")}</div>` : `<div class="card empty">Nothing here yet. <a href="#/find">Find programmes</a> or add one by hand.</div>`;
    bindProgRows($("#lst"));
  };
  $("#lq").oninput = e => { listFilter.q = e.target.value; draw(); };
  $("#ls").onchange = e => { listFilter.status = e.target.value; draw(); };
  $("#lc").onchange = e => { listFilter.country = e.target.value; draw(); };
  $("#lo").onchange = e => { listFilter.sort = e.target.value; draw(); };
  $("#manual").onclick = () => openProgram(null);
  draw();
}

// ── programme drawer ────────────────────────────────────────
function closeDrawer() { const o = $("#ov"); if (o) o.remove(); document.body.style.overflow = ""; if (location.hash.startsWith("#/p/")) history.replaceState(null, "", "#/list"); }
function openProgram(id) {
  const p = id ? state.programs.find(x => x.id === id) : null;
  if (id && !p) return toast("Programme not found");
  closeDrawer();
  const o = document.createElement("div"); o.className = "overlay"; o.id = "ov";
  o.innerHTML = `<div class="drawer" id="dr"></div>`; document.body.appendChild(o); document.body.style.overflow = "hidden";
  o.onclick = e => { if (e.target === o) { closeDrawer(); route(); } };
  document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { closeDrawer(); route(); document.removeEventListener("keydown", k); } });
  p ? drawDetail(p) : drawEdit({ country: (P().countries || [])[0] || "", dates: {}, tuition: { currency: "EUR", per: "year" }, requirements: {}, links: {} }, true);
}
function drawDetail(p) {
  const c = costEUR(p); const d = $("#dr");
  d.innerHTML = `<div class="row between" style="align-items:flex-start"><div><h2 style="margin-bottom:2px">${esc(p.program)}</h2><div class="muted">${esc(p.uni)} · ${esc(p.city || "")} ${esc(COUNTRIES[p.country] || p.country || "")}</div></div><button class="ghost" id="x" aria-label="Close">✕</button></div>
    <div class="chips" style="margin:12px 0">${deadlineBadge(p)}${chanceBadge(p.chance)}${(p.flags || []).map(f => `<span class="badge warn">⚑ ${esc(f)}</span>`).join("")}</div>
    ${p.pending ? `<div class="diff" style="margin-bottom:14px"><b>Update found ${esc(p.pending.date || "")}:</b> ${esc(p.pending.summary || "")}
      <div style="margin:6px 0">${Object.entries(p.pending.changes || {}).map(([k, v]) => `<div><code>${esc(k)}</code>: ${esc(JSON.stringify(get(p, k)))} → <b>${esc(JSON.stringify(v))}</b></div>`).join("")}</div>
      ${p.pending.source ? `<div class="sources"><a target="_blank" rel="noopener" href="${safeUrl(p.pending.source)}">Source</a></div>` : ""}
      <div class="row" style="margin-top:8px"><button class="primary" id="acc">Apply changes</button><button id="dis">Dismiss</button></div></div>` : ""}
    <div class="row" style="margin-bottom:16px"><select id="st" style="width:auto">${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}" ${(p.status || "shortlisted") === k ? "selected" : ""}>${v}</option>`).join("")}</select>
      <button id="ver" ${aiReady ? "" : "disabled"}>${ICON.refresh} Re-check with AI</button><button id="ed">Edit</button><a class="btn" href="#/sop/${esc(p.id)}">${ICON.pen} SOP</a></div>
    <div class="card"><dl class="kv">
      <dt>Intake</dt><dd>${esc(p.intake || "—")}</dd>
      <dt>Applications open</dt><dd>${fmtDate(get(p, "dates.opens"))}</dd>
      <dt>Deadline</dt><dd><b>${fmtDate(get(p, "dates.deadline"))}</b>${p.deadlineNote ? `<div class="faint">${esc(p.deadlineNote)}</div>` : ""}</dd>
      ${get(p, "dates.docs") ? `<dt>Documents due</dt><dd>${fmtDate(p.dates.docs)}</dd>` : ""}${get(p, "dates.results") ? `<dt>Results</dt><dd>${fmtDate(p.dates.results)}</dd>` : ""}
      <dt>Tuition</dt><dd>${esc(tuitionText(p.tuition))}${p.tuition?.note ? `<div class="faint">${esc(p.tuition.note)}</div>` : ""}</dd>
      <dt>Application fee</dt><dd>${p.appFee ? esc(`${p.appFee.amount} ${p.appFee.currency}`) : "None / unknown"}</dd>
      <dt>Estimated total</dt><dd>${c.total != null ? `≈ ${money(c.total)}` : "—"} <span class="faint">${c.tuition != null ? `tuition ${money(c.tuition)}` : ""}${c.living != null ? ` + living ${money(c.living)}` : ""} over ${p.durationYears || 2} years, approx. rates</span></dd>
      <dt>English</dt><dd>${esc(p.requirements?.english || "—")}</dd>
      <dt>GPA</dt><dd>${esc(p.requirements?.gpa || "—")}</dd>
      <dt>Prerequisites</dt><dd>${(p.requirements?.prereqs || []).length ? `<ul style="margin:0;padding-left:1.1em">${p.requirements.prereqs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "—"}${p.requirements?.other || p.requirements?.text ? `<div class="faint">${esc(p.requirements.other || p.requirements.text)}</div>` : ""}</dd>
      <dt>Apply via</dt><dd>${esc(p.portal || "—")}</dd>
      <dt>Links</dt><dd>${[p.links?.program && `<a target="_blank" rel="noopener" href="${safeUrl(p.links.program)}">Programme page</a>`, p.links?.apply && `<a target="_blank" rel="noopener" href="${safeUrl(p.links.apply)}">Apply</a>`].filter(Boolean).join(" · ") || "—"}</dd>
      ${p.why ? `<dt>Why it fits</dt><dd>${esc(p.why)}</dd>` : ""}
      <dt>Last checked</dt><dd>${fmtDate(p.lastChecked)} ${p.verifyNote ? `<span class="faint">— ${esc(p.verifyNote)}</span>` : ""}</dd>
    </dl></div>
    <div class="card"><div class="row between"><h3 style="margin:0">Documents</h3><span class="faint">${(p.docs || []).filter(k => p.docsDone?.[k]).length}/${(p.docs || []).length} ready</span></div>
      ${(p.docs || []).map(k => `<label class="check" style="font-weight:500;color:var(--ink)"><input type="checkbox" data-doc="${esc(k)}" ${p.docsDone?.[k] ? "checked" : ""}> ${esc(DOCS[k] || k)}</label>`).join("")}
      <div class="row" style="margin-top:8px"><select id="adddoc" style="width:auto"><option value="">+ Add document…</option>${Object.entries(DOCS).filter(([k]) => !(p.docs || []).includes(k)).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div></div>
    <div class="card"><h3>Notes</h3><textarea id="nt" placeholder="Contacts, scholarship ideas, what to mention in the SOP…">${esc(p.notes)}</textarea></div>
    ${(p.log || []).length ? `<div class="card"><h3>History</h3>${p.log.slice(-8).reverse().map(l => `<div class="faint" style="margin-bottom:6px">${esc(l.date)} — ${esc(l.text)} ${l.source ? `<a target="_blank" rel="noopener" href="${safeUrl(l.source)}">source</a>` : ""}</div>`).join("")}</div>` : ""}
    ${(p.sources || []).length ? `<details class="sources" style="margin-top:12px"><summary>AI sources</summary>${p.sources.map(s => `<div><a target="_blank" rel="noopener" href="${safeUrl(s.url)}">${esc(s.title || s.url)}</a></div>`).join("")}</details>` : ""}
    <div class="row" style="margin-top:18px"><button class="danger" id="del">Remove from list</button></div>`;
  const save = async patch => { Object.assign(p, patch); await S.put(uid(), "programs", p.id, patch); };
  $("#x").onclick = () => { closeDrawer(); route(); };
  $("#st").onchange = e => save({ status: e.target.value }).then(() => toast("Status updated"));
  $$("[data-doc]", d).forEach(cb => cb.onchange = () => { p.docsDone = { ...(p.docsDone || {}), [cb.dataset.doc]: cb.checked }; save({ docsDone: p.docsDone }); });
  $("#adddoc").onchange = e => { if (!e.target.value) return; save({ docs: [...(p.docs || []), e.target.value] }).then(() => drawDetail(p)); };
  let t; $("#nt").oninput = e => { clearTimeout(t); t = setTimeout(() => save({ notes: e.target.value }), 700); };
  $("#ed").onclick = () => drawEdit(p, false);
  $("#del").onclick = async () => { if (!confirm(`Remove ${p.program} from your list?`)) return; await S.remove(uid(), "programs", p.id); state.programs = state.programs.filter(x => x.id !== p.id); closeDrawer(); route(); toast("Removed"); };
  if ($("#acc")) $("#acc").onclick = async () => { await applyChanges(p, p.pending.changes, p.pending.summary, p.pending.source); drawDetail(p); toast("Updated"); };
  if ($("#dis")) $("#dis").onclick = async () => { p.pending = null; await S.replace(uid(), "programs", p.id, p); drawDetail(p); };
  $("#ver").onclick = e => busy(e.currentTarget, async () => {
    const r = await ai("verify", { program: stripMeta(p), profile: { nationality: P().nationality, degree: P().degree + " " + (P().major || "") } });
    const v = r.data || {}; const changes = v.changes || {};
    const real = Object.fromEntries(Object.entries(changes).filter(([k, val]) => JSON.stringify(get(p, k)) !== JSON.stringify(val)));
    if (Object.keys(real).length) { p.pending = { changes: real, summary: v.summary, source: v.officialUrl, date: today() }; await S.replace(uid(), "programs", p.id, p); }
    else { await save({ lastChecked: today(), verifyNote: v.summary || (v.confirmed ? "Confirmed" : "Couldn't confirm"), log: [...(p.log || []), { date: today(), text: v.summary || "Re-checked", source: v.officialUrl || "" }] }); }
    drawDetail(p); toast(Object.keys(real).length ? "Changes found: review them at the top" : "No changes found");
  });
}
const stripMeta = p => { const { docsDone, notes, log, sources, pending, ...rest } = p; return rest; };
async function applyChanges(p, changes, summary, source) {
  Object.entries(changes || {}).forEach(([k, v]) => setPath(p, k, v));
  p.pending = null; p.lastChecked = today();
  p.log = [...(p.log || []), { date: today(), text: summary || "Applied update", source: source || "" }];
  await S.replace(uid(), "programs", p.id, p);
}
function drawEdit(p, isNew) {
  const d = $("#dr"); const g = k => get(p, k) ?? "";
  d.innerHTML = `<div class="row between"><h2>${isNew ? "Add a programme" : "Edit programme"}</h2><button class="ghost" id="x">✕</button></div>
    <form id="pf">
    <div class="grid g2">${pi("uni", "University", g("uni"), true)}${pi("program", "Programme", g("program"), true)}</div>
    <div class="grid g3"><div class="field"><label>Country</label><select data-k="country">${Object.entries(COUNTRIES).map(([k, v]) => `<option value="${k}" ${p.country === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>${pi("city", "City", g("city"))}${pi("intake", "Intake", g("intake"))}</div>
    <div class="grid g4">${pi("dates.opens", "Opens", g("dates.opens"), false, "date")}${pi("dates.deadline", "Deadline", g("dates.deadline"), false, "date")}${pi("dates.docs", "Docs due", g("dates.docs"), false, "date")}${pi("dates.results", "Results", g("dates.results"), false, "date")}</div>
    ${pi("deadlineNote", "Deadline note", g("deadlineNote"))}
    <div class="grid g4">${pi("tuition.amount", "Tuition", g("tuition.amount"), false, "number")}${pi("tuition.currency", "Currency", g("tuition.currency") || "EUR")}
      <div class="field"><label>Per</label><select data-k="tuition.per">${["year", "semester", "total"].map(x => `<option ${g("tuition.per") === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>${pi("durationYears", "Years", g("durationYears") || 2, false, "number")}</div>
    <div class="grid g3">${pi("appFee.amount", "Application fee", g("appFee.amount"), false, "number")}${pi("livingCostMonthly.amount", "Living cost / month", g("livingCostMonthly.amount"), false, "number")}${pi("livingCostMonthly.currency", "Living currency", g("livingCostMonthly.currency") || g("tuition.currency") || "EUR")}</div>
    <div class="grid g2">${pi("requirements.english", "English requirement", g("requirements.english"))}${pi("requirements.gpa", "GPA requirement", g("requirements.gpa"))}</div>
    ${pi("requirements.prereqs", "Prerequisites (comma-separated)", (p.requirements?.prereqs || []).join(", "))}
    <div class="grid g2">${pi("links.program", "Programme URL", g("links.program"), false, "url")}${pi("links.apply", "Apply URL", g("links.apply"), false, "url")}</div>
    <div class="grid g2">${pi("portal", "Apply via", g("portal"))}<div class="field"><label>Chance</label><select data-k="chance"><option value="">—</option>${["reach", "match", "safe"].map(x => `<option ${p.chance === x ? "selected" : ""}>${x}</option>`).join("")}</select></div></div>
    <div class="row between"><button type="button" id="cn">Cancel</button><button class="primary" type="submit">Save</button></div></form>`;
  $("#x").onclick = $("#cn").onclick = () => isNew ? (closeDrawer(), route()) : drawDetail(p);
  $("#pf").onsubmit = async e => {
    e.preventDefault();
    const n = JSON.parse(JSON.stringify(p));
    $$("[data-k]", d).forEach(el => {
      let v = el.value.trim(); const k = el.dataset.k;
      if (k === "requirements.prereqs") v = v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
      else if (el.type === "number") v = v === "" ? null : Number(v);
      else if (v === "") v = k.startsWith("dates.") ? null : "";
      setPath(n, k, v);
    });
    if (n.appFee && n.appFee.amount == null) n.appFee = null; else if (n.appFee) n.appFee.currency = n.appFee.currency || n.tuition?.currency || "EUR";
    if (isNew) { n.id = S.newId("p"); n.status = "shortlisted"; n.addedAt = today(); n.origin = "manual"; n.docs = defaultDocs(n, P()); n.docsDone = {}; state.programs.push(n); }
    else Object.assign(p, n);
    await S.replace(uid(), "programs", n.id, isNew ? n : p);
    toast("Saved"); drawDetail(isNew ? n : p);
  };
}
const pi = (k, l, v, req = false, type = "text") => `<div class="field"><label>${l}</label><input data-k="${k}" type="${type}" ${type === "number" ? "step=any" : ""} value="${esc(v)}" ${req ? "required" : ""}></div>`;

// ── profile ─────────────────────────────────────────────────
function viewProfile() {
  const a = state.doc.assessment, p = P();
  shell("profile", `${header("Your profile", "Your details, an honest strength score, and a compiled profile you can reuse in forms and emails.",
    `<a class="btn" href="#/welcome/0">Edit profile</a>${aiReady ? `<button class="primary" id="ra">${ICON.spark} ${a ? "Re-assess" : "Assess"}</button>` : ""}`)}
    ${aiNotice()}
    ${a ? `<div class="grid g2">
      <div class="card"><div class="row" style="gap:18px;flex-wrap:nowrap">${scoreRing(a.score)}<div><h2 style="margin:0">${esc(cap(a.tier))}</h2><p class="muted" style="margin:4px 0">${esc(a.summary)}</p><div class="faint">Assessed ${fmtDate(a.date)}${a.gpaPercentEstimate ? ` · GPA ≈ ${esc(a.gpaPercentEstimate)}%` : ""}</div></div></div>
        <div style="margin-top:16px">${Object.entries(a.categories || {}).map(([k, v]) => `<div class="row between" style="font-size:13.5px;margin-top:8px"><span>${esc(cap(k))}</span><span class="faint">${esc(v)}/10</span></div><div class="bar"><i style="width:${Math.max(0, Math.min(10, +v || 0)) * 10}%"></i></div>`).join("")}</div></div>
      <div class="card"><h3>Strengths</h3><ul>${(a.strengths || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <h3>Weak spots</h3><ul>${(a.weaknesses || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <h3>Quick wins</h3><ul>${(a.quickWins || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div></div>
      ${a.compiledProfile ? `<div class="card"><div class="row between"><h2 style="margin:0">Compiled profile</h2><button id="cp">Copy</button></div><div class="md" style="margin-top:10px">${md(a.compiledProfile)}</div></div>` : ""}
      ${(a.sopThemes || []).length ? `<div class="card"><h2>SOP story angles</h2><ul>${a.sopThemes.map(x => `<li>${esc(x)}</li>`).join("")}</ul><a href="#/sop">Open the SOP helper →</a></div>` : ""}`
    : `<div class="card empty">${aiReady ? "No assessment yet. Press Assess to get your score." : "Profile saved. AI scoring turns on once AI is connected."}</div>`}
    <div class="card"><h2>Details</h2><dl class="kv">
      <dt>Degree</dt><dd>${esc([p.degree, p.major].filter(Boolean).join(", ") || "—")} ${p.university ? "· " + esc(p.university) : ""} ${p.gradYear ? "(" + esc(p.gradYear) + ")" : ""}</dd>
      <dt>GPA</dt><dd>${p.gpa != null ? esc(`${p.gpa} / ${p.gpaScale}`) + (p.gpaPercent ? ` (${p.gpaPercent}%)` : "") : "—"}</dd>
      <dt>English</dt><dd>${esc([p.ielts && `IELTS ${p.ielts}${p.ieltsMin ? ` (min ${p.ieltsMin})` : ""}`, p.toefl && `TOEFL ${p.toefl}`, p.pte].filter(Boolean).join(" · ") || "—")}</dd>
      <dt>GRE / GATE</dt><dd>${esc([p.greQ && `GRE Q${p.greQ} V${p.greV || "?"} AW${p.greAW || "?"}`, p.gate && `GATE ${p.gate}`].filter(Boolean).join(" · ") || "—")}</dd>
      <dt>Languages</dt><dd>German: ${esc(p.german || "none")} · French: ${esc(p.french || "none")}</dd>
      <dt>Fields</dt><dd>${esc((p.fields || []).join(", ") || "—")}</dd>
      <dt>Countries</dt><dd>${esc((p.countries || []).map(c => COUNTRIES[c] || c).join(", ") || "—")}</dd>
      <dt>Preferences</dt><dd>${esc([p.intake, p.budget && `≤ €${p.budget}/yr`, p.avoid].filter(Boolean).join(" · ") || "—")}</dd>
      <dt>Resume</dt><dd>${p.resumeText ? `${p.resumeText.length.toLocaleString()} characters saved` : "Not added"}</dd></dl></div>`);
  if ($("#ra")) $("#ra").onclick = e => busy(e.currentTarget, async () => { await runAssessment(); viewProfile(); toast("Assessment updated"); });
  if ($("#cp")) $("#cp").onclick = () => navigator.clipboard.writeText(a.compiledProfile).then(() => toast("Copied"));
}

// ── SOP ─────────────────────────────────────────────────────
function viewSop(pid) {
  const progs = state.programs;
  const cur = pid || (progs[0] && progs[0].id) || "general";
  const prog = progs.find(x => x.id === cur);
  const sop = state.sops.find(s => s.id === cur) || { id: cur };
  shell("sop", `${header("SOP helper", "Get a plan for your statement of purpose, write it in your own words, then get feedback.")}
    ${aiNotice()}
    <div class="toolbar"><select id="pp" style="min-width:260px"><option value="general">General (no specific programme)</option>${progs.map(p => `<option value="${esc(p.id)}" ${p.id === cur ? "selected" : ""}>${esc(p.uni)} — ${esc(p.program)}</option>`).join("")}</select>
      <button class="primary" id="ol" ${aiReady ? "" : "disabled"}>${ICON.spark} ${sop.outline ? "New plan" : "Get a plan & tips"}</button></div>
    <div class="grid g2">
      <div class="card"><div class="row between"><h3 style="margin:0">Your draft</h3><span class="faint" id="wc"></span></div>
        <textarea id="dft" style="min-height:420px;margin-top:10px" placeholder="Write or paste your SOP here. It saves automatically.">${esc(sop.draft)}</textarea>
        <div class="row between" style="margin-top:10px"><span class="faint" id="sv"></span><button class="primary" id="rv" ${aiReady ? "" : "disabled"}>Review my draft</button></div></div>
      <div>
        ${sop.review ? `<div class="card"><div class="row between"><h3 style="margin:0">Feedback</h3><span class="faint">${esc(sop.reviewDate || "")}</span></div><div class="md">${md(sop.review)}</div></div>` : ""}
        ${sop.outline ? `<div class="card"><h3>Plan & tips</h3><div class="md">${md(sop.outline)}</div></div>`
          : `<div class="card"><h3>General tips</h3><div class="md">${md(GENERIC_SOP_TIPS)}</div></div>`}
      </div></div>`);
  $("#pp").onchange = e => location.hash = `#/sop/${e.target.value}`;
  const wc = () => { const n = ($("#dft").value.match(/\S+/g) || []).length; $("#wc").textContent = `${n} words`; }; wc();
  const saveSop = async patch => { Object.assign(sop, patch); await S.put(uid(), "sops", cur, patch); if (!state.sops.includes(sop)) state.sops.push(sop); };
  let t; $("#dft").oninput = () => { wc(); $("#sv").textContent = "Saving…"; clearTimeout(t); t = setTimeout(async () => { await saveSop({ draft: $("#dft").value }); $("#sv").textContent = "Saved"; }, 800); };
  $("#ol").onclick = e => busy(e.currentTarget, async () => { const r = await ai("sop_outline", { profile: P(), program: prog ? stripMeta(prog) : null, assessment: state.doc.assessment }); await saveSop({ outline: r.text }); viewSop(cur); });
  $("#rv").onclick = e => busy(e.currentTarget, async () => {
    const draft = $("#dft").value; if (draft.trim().split(/\s+/).length < 80) throw new Error("Write at least ~80 words first.");
    await saveSop({ draft }); const r = await ai("sop_review", { profile: P(), program: prog ? stripMeta(prog) : null, draft });
    await saveSop({ review: r.text, reviewDate: today() }); viewSop(cur);
  });
}
const GENERIC_SOP_TIPS = `- **Lead with a specific moment or problem**, not "Since childhood I have been fascinated by…".
- **Show, then tell:** each claim about you should be backed by a project, number or result.
- **Explain *why this programme***: name 2–3 courses, labs or professors and say what you'd do with them.
- **Connect past → programme → goal** in one clear line of reasoning.
- **Address weak spots briefly** (a low semester, a gap) with what you learned, then move on.
- **Respect the length limit** (often 1–2 pages or 500–1000 words; European universities like concise, factual writing).
- **One SOP per programme.** Reuse the core, rewrite the "why here" part every time.
- **Write it yourself.** Committees can spot generic AI text; use AI only for feedback.`;

// ── ask ─────────────────────────────────────────────────────
function viewAsk() {
  shell("ask", `${header("Ask anything", "Visas, documents, scholarships, comparing two programmes… Answers use live search for time-sensitive facts.")}
    ${aiNotice()}<div class="chat" id="ch">${state.chat.map(m => m.q ? `<div class="q">${esc(m.q)}</div>` : `<div class="card md">${md(m.a)}${(m.sources || []).length ? `<details class="sources"><summary>Sources</summary>${m.sources.map(s => `<div><a target="_blank" rel="noopener" href="${safeUrl(s.url)}">${esc(s.title || s.url)}</a></div>`).join("")}</details>` : ""}</div>`).join("") || `<div class="card"><p class="muted">Try:</p><div class="chips">${["Which of my programmes is cheapest overall?", "What documents do I need for a German student visa?", "Which scholarships fit my profile?", "Compare my top two programmes"].map(s => `<span class="chip" data-s="${esc(s)}">${esc(s)}</span>`).join("")}</div></div>`}</div>
    <form id="af" class="row" style="margin-top:14px;flex-wrap:nowrap"><input id="aq" placeholder="Type a question…" autocomplete="off"><button class="primary" ${aiReady ? "" : "disabled"}>Ask</button></form>`);
  $$("[data-s]").forEach(c => c.onclick = () => { $("#aq").value = c.dataset.s; $("#aq").focus(); });
  $("#af").onsubmit = e => { e.preventDefault(); const q = $("#aq").value.trim(); if (!q) return;
    busy($("#af button"), async () => {
      state.chat.push({ q });
      const context = { list: state.programs.map(p => ({ uni: p.uni, program: p.program, country: p.country, deadline: get(p, "dates.deadline"), tuition: p.tuition, status: p.status })) };
      try { const r = await ai("ask", { profile: P(), question: q, context }); state.chat.push({ a: r.text, sources: r.sources }); }
      catch (err) { state.chat.pop(); throw err; }
      viewAsk(); window.scrollTo(0, document.body.scrollHeight);
    });
  };
}

// ── alerts ──────────────────────────────────────────────────
function viewAlerts() {
  const arr = [...state.alerts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  shell("alerts", `${header("Alerts", "The deadline agent checks everyone's lists every day: deadline reminders at 30, 14, 7 and 2 days, plus any changes it finds on official pages.", arr.some(a => !a.read) ? `<button id="ra">Mark all read</button>` : "")}
    ${arr.length ? `<div class="plist">${arr.map(a => `<div class="card" style="${a.read ? "opacity:.65" : ""}"><div class="row between"><span class="badge ${a.kind === "change" ? "warn" : a.kind === "deadline" ? "accent" : ""}">${esc(a.kind === "change" ? "Update found" : a.kind === "deadline" ? "Deadline" : "Note")}</span><span class="faint">${fmtDate(a.date)}</span></div>
      <p style="margin:8px 0 4px">${esc(a.text)}</p>${a.programId ? `<a href="#/p/${esc(a.programId)}">Open programme</a>` : ""} ${a.source ? `· <a target="_blank" rel="noopener" href="${safeUrl(a.source)}">Source</a>` : ""}</div>`).join("")}</div>`
      : `<div class="card empty">No alerts yet. They appear here once the agent runs (daily).</div>`}`);
  if ($("#ra")) $("#ra").onclick = async () => { await Promise.all(state.alerts.filter(a => !a.read).map(a => { a.read = true; return S.put(uid(), "alerts", a.id, { read: true }); })); viewAlerts(); };
}

// ── settings ────────────────────────────────────────────────
function viewSettings() {
  const st = state.doc.settings || {};
  shell("settings", `${header("Settings")}
    <div class="card"><h2>Display</h2><div class="grid g3">
      <div class="field"><label>Show costs in</label><select id="cur">${["EUR", "INR", "USD", "GBP", "SEK", "NOK"].map(c => `<option ${(st.currency || "EUR") === c ? "selected" : ""}>${c}</option>`).join("")}</select><div class="hint">Approximate fixed rates, for comparison only.</div></div>
      <div class="field"><label>Theme</label><select id="th">${["auto", "light", "dark"].map(c => `<option ${(st.theme || "auto") === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label>Agent emails</label><select id="em"><option value="off">Off</option><option value="on" ${st.emailAlerts ? "selected" : ""}>On (if the site owner set up email)</option></select></div></div></div>
    <div class="card"><h2>Your data</h2><p class="muted">Export a backup, or import a list (this app's export, or a tracker file shaped like <code>{"programs":[…]}</code>).</p>
      <div class="row"><button id="ex">Export JSON</button><label class="btn" style="margin:0">Import JSON<input type="file" id="im" accept="application/json" hidden></label><button class="danger" id="wipe">Delete all my data</button></div></div>
    <div class="card"><h2>Account</h2><p class="muted">Signed in as ${esc(state.user.email || state.user.displayName)}${S.isDemo ? " (demo mode)" : ""}.</p><button id="so2">Sign out</button></div>`);
  const saveSet = async patch => { state.doc.settings = { ...st, ...patch }; Object.assign(st, patch); await S.saveUserDoc(uid(), { settings: state.doc.settings }); applyTheme(); toast("Saved"); };
  $("#cur").onchange = e => saveSet({ currency: e.target.value });
  $("#th").onchange = e => saveSet({ theme: e.target.value });
  $("#em").onchange = e => saveSet({ emailAlerts: e.target.value === "on" });
  $("#so2").onclick = () => S.signOut();
  $("#ex").onclick = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile: state.doc.profile, assessment: state.doc.assessment, programs: state.programs, sops: state.sops }, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `uni-finder-${today()}.json`; a.click();
  };
  $("#im").onchange = async e => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      const arr = Array.isArray(d) ? d : d.programs || [];
      let n = 0;
      for (const raw of arr) {
        if (!raw.uni || !raw.program || state.programs.some(x => sameProg(x, raw))) continue;
        const p = { ...raw, id: S.newId("p"), status: raw.status && STATUSES[raw.status] ? raw.status : "shortlisted", addedAt: raw.addedAt || today(), origin: raw.origin || "import" };
        if (!Array.isArray(p.docs) || !p.docs.length) p.docs = defaultDocs(p, P());
        p.docsDone = p.docsDone || {};
        await S.replace(uid(), "programs", p.id, p); state.programs.push(p); n++;
      }
      if (d.profile && !state.doc.profile?.done && confirm("Also import the profile from this file?")) await saveProfile(d.profile);
      toast(`Imported ${n} programme(s)`);
    } catch (err) { toast("Couldn't import: " + err.message, 6000); }
  };
  $("#wipe").onclick = async () => {
    if (prompt('This deletes your profile, list, SOP drafts and alerts. Type DELETE to confirm.') !== "DELETE") return;
    for (const c of ["programs", "alerts", "sops"]) for (const x of await S.list(uid(), c)) await S.remove(uid(), c, x.id);
    await S.saveUserDoc(uid(), { profile: null, assessment: null }); toast("Deleted"); location.hash = "#/welcome"; await loadAll(); route();
  };
}
