# Uni Finder

A free website for finding master's programmes and tracking applications. It runs entirely on free tiers:

| Piece | What it does | Runs on |
|---|---|---|
| Website (`index.html`, `js/`) | Sign-in, profile, programme list, SOP helper, alerts | GitHub Pages |
| Accounts + data | Google / email sign-in; each user's private data | Firebase Auth + Firestore (Spark plan) |
| AI proxy (`worker/`) | Keeps the Gemini key secret, checks sign-in, limits use per day | Cloudflare Workers |
| AI | Profile scoring, programme search with Google Search, re-checks, SOP feedback | Gemini API free tier |
| Deadline agent (`agent/`) | Daily reminders + re-checks official pages for everyone's list | GitHub Actions |

**What users get:** a profile set up straight after signing in (GPA, tests, projects, resume upload or paste), an honest strength score with quick wins, AI search for programmes that fit them (deadlines, tuition, total cost, reach/match/safe), a personal list with statuses, document checklists and notes, one-click re-checks against official pages, an SOP plan + draft review, an "Ask" assistant, alerts from the daily agent, and JSON export/import.

Until steps 2–3 are done, the site runs in **local demo mode**: no sign-in, data saved only in the browser, AI off.

---

## Setup (about 30 minutes, all free)

### 1. GitHub Pages
Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
The site appears at `https://<user>.github.io/uni-finder/`.

### 2. Firebase (accounts and database)
1. Go to <https://console.firebase.google.com> → **Add project**. Analytics isn't needed. Stay on the free Spark plan.
2. **Build → Authentication → Get started → Sign-in method**: enable **Google** and **Email/Password**.
3. **Authentication → Settings → Authorized domains → Add domain**: `<user>.github.io`.
4. **Build → Firestore Database → Create database**: production mode, pick a region (e.g. `eur3`).
5. **Firestore → Rules**: paste the contents of `firestore.rules` → **Publish**.
6. **Project settings (gear) → Your apps → Web (`</>`)**: register an app. Copy the `firebaseConfig` values into `config.js` → `firebase`.

### 3. Gemini key + Cloudflare Worker (AI)
1. Get a free API key at <https://aistudio.google.com/apikey>.
2. Create a free Cloudflare account. Then, from the `worker/` folder:
   ```bash
   npm i -g wrangler
   wrangler login
   wrangler kv namespace create RATE        # paste the printed id into wrangler.toml
   # edit wrangler.toml: FIREBASE_PROJECT_ID, ALLOWED_ORIGINS
   wrangler secret put GEMINI_API_KEY       # paste the key
   wrangler deploy
   ```
   *No terminal?* In the Cloudflare dashboard go to **Workers → Create → Hello World**, replace the code with `worker/worker.js`, and deploy. Then under **Settings → Variables**, add the `[vars]` from `wrangler.toml` and a secret `GEMINI_API_KEY`. To enable the daily limit, bind a KV namespace named `RATE`.
3. Put the worker URL (e.g. `https://uni-finder-ai.<you>.workers.dev`) in `config.js` → `aiWorkerUrl`. Commit.

### 4. Deadline agent (GitHub Actions)
1. Firebase **Project settings → Service accounts → Generate new private key** (downloads a JSON file. Keep it private).
2. Repo **Settings → Secrets and variables → Actions → New repository secret**:
   - `FIREBASE_SERVICE_ACCOUNT` = the whole JSON file contents
   - `GEMINI_API_KEY` = the same Gemini key
3. Optional **Variables**: `MAX_VERIFY` (re-checks per run, default 25), `VERIFY_DAYS` (default 7), `SITE_URL`.
4. **Actions → Deadline agent → Run workflow** (tick *dry run* the first time). After that it runs daily at 05:17 UTC.

**Optional email digests:** add a `RESEND_API_KEY` secret (free at resend.com) and an `ALERT_FROM` variable using a domain you've verified. Users switch emails on in Settings.

---

## Limits and honesty notes
- **AI can be wrong.** Results include source links and a confidence level. Users should confirm dates and fees on the official page. Re-checks never overwrite data: changes are shown for the user to accept.
- **Free-tier quotas:** each user gets `DAILY_LIMIT` AI credits per day (search = 3, re-check = 2, assess/SOP = 1, ask = 2). All users share your Gemini free quota. Raise or lower the limit in `wrangler.toml`. The agent spaces its calls and caches repeated programmes.
- **Privacy:** on the Gemini API free tier, Google may use prompts to improve its products. The sign-in page tells users that AI features send their profile to Gemini. Each user's data is readable only by that user (`firestore.rules`). The agent reads every list using the service account.
- Costs are converted with approximate fixed exchange rates, for comparison only.

## Files
```
index.html, style.css, config.js   site shell + settings
js/app.js                          UI (views, list, drawer, SOP, ask, alerts, settings)
js/store.js                        Firebase / demo-mode data layer
js/ai.js                           calls the worker
firestore.rules                    database security rules
worker/worker.js, wrangler.toml    AI proxy + prompts (shared with the agent)
agent/agent.mjs                    daily deadline agent
.github/workflows/deadline-agent.yml
```
