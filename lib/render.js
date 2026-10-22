"use strict";
const { FONT, BG } = require("./assets");

const DAY = 86400000;
const COLORS = ["#2A1247", "#6A2C8F", "#E2447A", "#FF8A3D", "#FFD56A"];
const COUNTED = new Set(["PushEvent", "CreateEvent", "ForkEvent", "PullRequestEvent", "IssuesEvent", "ReleaseEvent", "PullRequestReviewEvent"]);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

function ago(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/** events: GitHub public events (newest first). now: epoch ms. Pure function, easy to test. */
function summarize(events, now) {
  const perDay = {};
  const feed = [];
  for (const e of events) {
    if (!COUNTED.has(e.type)) continue;
    const p = e.payload || {};
    const n = e.type === "PushEvent" ? p.distinct_size || p.size || 1 : 1;
    const k = dayKey(e.created_at);
    perDay[k] = (perDay[k] || 0) + n;
    const repo = (e.repo && e.repo.name || "").replace(/^[^/]+\//, "");
    const verb = e.type === "PushEvent" ? `PUSH · ${n} commit${n > 1 ? "s" : ""}` : e.type.replace(/Event$/, "").toUpperCase();
    feed.push({ line: `${verb} · ${repo}`, age: ago(now - Date.parse(e.created_at)) });
  }
  const today = Date.parse(dayKey(now));
  let streak = 0;
  for (let d = today, first = true; ; d -= DAY, first = false) {
    if (perDay[dayKey(d)]) streak++;
    else if (!first) break;
    else continue; // today may still be empty
    if (streak > 400) break;
  }
  const total = Object.values(perDay).reduce((a, b) => a + b, 0);
  return { perDay, feed: feed.slice(0, 3), streak, total, activeDays: Object.keys(perDay).length, today };
}

function render(events, now, note = "") {
  const s = summarize(events, now);
  const W = 1000, H = 600;
  const top = Math.max(1, ...Object.values(s.perDay));
  const lvl = (n) => (!n ? 0 : n / top <= 0.25 ? 1 : n / top <= 0.5 ? 2 : n / top <= 0.75 ? 3 : 4);
  const dow = (t) => (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
  const weeks = 13, x0 = 28, y0 = 112, cell = 36, pitch = 42;
  const lastMonday = s.today - dow(s.today) * DAY;
  let cells = "";
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const t = lastMonday - (weeks - 1 - w) * 7 * DAY + d * DAY;
      if (t > s.today) continue;
      const n = s.perDay[dayKey(t)] || 0;
      const ring = t === s.today ? ' stroke="#7FE7FF" stroke-width="2.5"' : "";
      cells += `<rect class="c" x="${x0 + w * pitch}" y="${y0 + d * pitch}" width="${cell}" height="${cell}" rx="6" fill="${COLORS[lvl(n)]}"${ring} style="animation-delay:${(w * 0.04).toFixed(2)}s"/>`;
    }
  }
  const stat = (v, label, y) =>
    `<text x="640" y="${y}" font-size="78" fill="#fff" stroke="#12061F" stroke-width="1.5" paint-order="stroke">${v}</text>` +
    `<text x="640" y="${y + 30}" font-size="24" letter-spacing="4" fill="#FF9A5C">${label}</text>`;
  const feed = s.feed.length
    ? s.feed.map((f, i) => `<text x="28" y="${462 + i * 40}" font-size="28" fill="#fff" stroke="#12061F" stroke-width="1" paint-order="stroke">▸ ${esc(f.line)}</text><text x="972" y="${462 + i * 40}" font-size="24" text-anchor="end" fill="#FFD56A">${esc(f.age)}</text>`).join("")
    : `<text x="28" y="470" font-size="28" fill="#fff">No public activity in the last 90 days.</text>`;
  const upd = new Date(now).toISOString().slice(11, 16);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Live GitHub activity: ${s.total} public contributions in the last 90 days, ${s.activeDays} active days, ${s.streak} day streak.">
<style>
@font-face{font-family:BC;src:url(data:font/ttf;base64,${FONT})}
text{font-family:BC,'Arial Narrow',sans-serif}
@keyframes pop{from{transform:scale(.4)}to{transform:scale(1)}}
@keyframes bl{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes sh{from{transform:translateX(-200px)}to{transform:translateX(1200px)}}
.c{transform-box:fill-box;transform-origin:center;animation:pop .5s ease-out both}
.live{animation:bl 1.2s ease-in-out infinite}.sh{animation:sh 6s linear infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs><clipPath id="f"><rect width="${W}" height="${H}" rx="6"/></clipPath>
<linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<g clip-path="url(#f)"><rect width="${W}" height="${H}" fill="#12061F"/>
<image href="${BG}" xlink:href="${BG}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" opacity=".55"/>
<rect width="${W}" height="${H}" fill="#12061F" opacity=".62"/><rect class="sh" width="120" height="${H}" fill="url(#g)" opacity=".1"/></g>
<text x="28" y="62" font-size="46" letter-spacing="4" fill="#EAEAEA">_LIVE ACTIVITY</text>
<circle class="live" cx="680" cy="48" r="9" fill="#FF3D6E"/><text x="698" y="57" font-size="26" letter-spacing="4" fill="#FF3D6E">LIVE</text>
<text x="972" y="57" font-size="24" letter-spacing="3" text-anchor="end" fill="#FF9A5C">UPDATED ${upd} UTC</text>
<rect x="28" y="80" width="944" height="1" fill="#8A3A8F" opacity=".7"/>
${cells}
${stat(s.total, "CONTRIBUTIONS · 90D", 150)}${stat(s.activeDays, "ACTIVE DAYS", 250)}${stat(s.streak, "DAY STREAK", 350)}
<rect x="28" y="410" width="944" height="1" fill="#8A3A8F" opacity=".5"/>
${feed}
<text x="28" y="${H - 20}" font-size="22" letter-spacing="2" fill="#C9A4E8">PUBLIC REPOSITORIES ONLY · PRIVATE CLIENT WORK IS NOT SHOWN${note ? " · " + esc(note) : ""}</text>
<path d="M18 40V18H40M${W - 40} 18H${W - 18}V40M${W - 18} ${H - 40}V${H - 18}H${W - 40}M40 ${H - 18}H18V${H - 40}" fill="none" stroke="#FF9A5C" stroke-width="2" opacity=".85"/>
</svg>`;
}

module.exports = { render, summarize };
