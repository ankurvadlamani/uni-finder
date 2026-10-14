import { idToken, isDemo } from "./store.js";

const url = (window.UNI_CONFIG || {}).aiWorkerUrl;
export const aiReady = !!url && !isDemo;

export async function ai(task, payload) {
  if (!url) throw new Error("AI isn't set up yet: add aiWorkerUrl in config.js (see README).");
  if (isDemo) throw new Error("AI needs a signed-in account. Set up Firebase in config.js to enable it.");
  const tok = await idToken();
  const r = await fetch(url.replace(/\/$/, "") + "/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
    body: JSON.stringify({ task, payload })
  });
  let d; try { d = await r.json(); } catch { throw new Error("AI service error " + r.status); }
  if (!r.ok || d.error) throw new Error(d.error || "AI service error " + r.status);
  if (d.usage) document.dispatchEvent(new CustomEvent("ai-usage", { detail: d.usage }));
  return d;
}
