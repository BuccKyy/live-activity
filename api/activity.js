"use strict";
const { render } = require("../lib/render");
const { parseCalendar, merge, renderYear } = require("../lib/year");
const snapshot = require("../lib/snapshot.json");

const USER = process.env.GH_USER || "BuccKyy";
const HEADERS = { "User-Agent": "live-activity-svg", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) HEADERS.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function events() {
  const out = [];
  for (let page = 1; page <= 3; page++) {
    const r = await fetch(`https://api.github.com/users/${USER}/events/public?per_page=100&page=${page}`, { headers: HEADERS });
    if (!r.ok) throw new Error(`github ${r.status}`);
    const batch = await r.json();
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/** Official calendar when the profile is public; empty when "private profile" is on. */
async function calendar() {
  try {
    const r = await fetch(`https://github.com/users/${USER}/contributions`, { headers: { "User-Agent": "Mozilla/5.0 live-activity-svg" } });
    if (!r.ok) return null;
    const days = parseCalendar(await r.text());
    return Object.values(days).some((n) => n > 0) ? days : null;
  } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  const now = Date.now();
  try {
    const cal = await calendar();
    let svg;
    if (cal) svg = renderYear(cal, now);
    else {
      let ev = [];
      try { ev = await events(); } catch { /* snapshot alone still renders */ }
      svg = renderYear(merge(snapshot, ev, now), now, { note: "history snapshot + live pushes" });
    }
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600");
    res.status(200).send(svg);
  } catch (e) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=20");
    res.status(200).send(render([], now, "temporarily unavailable"));
  }
};
