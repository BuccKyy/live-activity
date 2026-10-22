"use strict";
const { render } = require("../lib/render");

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

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  try {
    const svg = render(await events(), Date.now());
    // fresh for 60 s at the edge, then served stale while it refreshes in the background
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600");
    res.status(200).send(svg);
  } catch (e) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=20");
    res.status(200).send(render([], Date.now(), "temporarily unavailable"));
  }
};
