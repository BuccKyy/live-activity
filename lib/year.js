"use strict";
// 12-month contribution calendar in the profile palette.
const { FONT, BG } = require("./assets");
const { summarize } = require("./render");

const DAY = 86400000;
const COLORS = ["#2A1247", "#6A2C8F", "#E2447A", "#FF8A3D", "#FFD56A"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Parse github.com/users/<u>/contributions HTML -> { "YYYY-MM-DD": count }. */
function parseCalendar(html) {
  const dates = {};
  for (const m of html.matchAll(/<td[^>]*?data-date="(\d{4}-\d\d-\d\d)"[^>]*?id="([^"]+)"/g)) dates[m[2]] = m[1];
  const days = {};
  for (const m of html.matchAll(/<tool-tip[^>]*?for="([^"]+)"[^>]*>([^<]*)</g)) {
    const d = dates[m[1]];
    if (!d) continue;
    const n = /^\s*(\d+)\s+contribution/.exec(m[2]);
    days[d] = n ? Number(n[1]) : 0;
  }
  return days;
}

/** snapshot history + live events. For days on/after the snapshot date take the larger
 *  value so a push that is in both sources is not counted twice. */
function merge(snapshot, events, now) {
  const live = summarize(events, now).perDay;
  const days = { ...snapshot.days };
  for (const [d, n] of Object.entries(live)) {
    if (d > snapshot.asOf) days[d] = n;
    else if (d === snapshot.asOf) days[d] = Math.max(days[d] || 0, n);
  }
  return days;
}

function stats(days, today) {
  const from = today - 364 * DAY;
  let total = 0, active = 0, best = { n: 0, d: "" }, run = 0, longest = 0;
  for (let t = from; t <= today; t += DAY) {
    const n = days[iso(t)] || 0;
    total += n;
    if (n) { active++; run++; longest = Math.max(longest, run); } else run = 0;
    if (n > best.n) best = { n, d: iso(t) };
  }
  let cur = 0;
  for (let t = today, first = true; ; t -= DAY, first = false) {
    if (days[iso(t)]) cur++;
    else if (!first) break;
    if (cur > 400 || t < from) break;
  }
  return { total, active, best, longest, cur };
}

function renderYear(days, now, opts = {}) {
  const W = 1000, H = 384;
  const today = Date.parse(iso(now));
  const st = stats(days, today);
  const top = Math.max(1, ...Object.values(days));
  const lvl = (n) => (!n ? 0 : n / top <= 0.25 ? 1 : n / top <= 0.5 ? 2 : n / top <= 0.75 ? 3 : 4);
  const sunday = today - new Date(today).getUTCDay() * DAY;
  const start = sunday - 52 * 7 * DAY;
  const x0 = 74, y0 = 122, pitch = 17, cell = 14;
  let cells = "", months = "", lastM = -1;
  for (let w = 0; w < 53; w++) {
    const colStart = start + w * 7 * DAY;
    const m = new Date(colStart).getUTCMonth();
    if (m !== lastM && new Date(colStart).getUTCDate() <= 7 && w < 51) {
      months += `<text x="${x0 + w * pitch}" y="${y0 - 10}" font-size="19" letter-spacing="1" fill="#C9A4E8">${MONTHS[m]}</text>`;
    }
    lastM = m;
    for (let d = 0; d < 7; d++) {
      const t = colStart + d * DAY;
      if (t > today) continue;
      const k = iso(t), n = days[k] || 0;
      const ring = k === iso(today) ? ' stroke="#7FE7FF" stroke-width="2"' : k === st.best.d && n ? ' stroke="#FFD56A" stroke-width="2"' : "";
      cells += `<rect class="c" x="${x0 + w * pitch}" y="${y0 + d * pitch}" width="${cell}" height="${cell}" rx="3" fill="${COLORS[lvl(n)]}"${ring} style="animation-delay:${(w * 0.025).toFixed(2)}s"/>`;
    }
  }
  const dayLabels = [[1, "MON"], [3, "WED"], [5, "FRI"]].map(([r, t]) => `<text x="28" y="${y0 + r * pitch + 13}" font-size="17" letter-spacing="1" fill="#C9A4E8">${t}</text>`).join("");
  const legend = COLORS.map((c, i) => `<rect x="${760 + i * 22}" y="${y0 + 7 * pitch + 12}" width="16" height="16" rx="3" fill="${c}"/>`).join("");
  const stat = (x, v, l) => `<text x="${x}" y="338" font-size="46" fill="#fff" stroke="#12061F" stroke-width="1.2" paint-order="stroke">${v}</text><text x="${x}" y="366" font-size="20" letter-spacing="3" fill="#FF9A5C">${l}</text>`;
  const upd = new Date(now).toISOString().slice(11, 16);
  const bestTxt = st.best.n ? String(st.best.n) : "-";
  const bestLbl = st.best.n ? `BEST DAY · ${MONTHS[Number(st.best.d.slice(5, 7)) - 1]} ${Number(st.best.d.slice(8))}` : "BEST DAY";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contributions in the last 12 months: ${st.total} public contributions on ${st.active} active days, longest streak ${st.longest}, current streak ${st.cur}.">
<style>
@font-face{font-family:BC;src:url(data:font/ttf;base64,${FONT})}
text{font-family:BC,'Arial Narrow',sans-serif}
@keyframes pop{from{transform:scale(.75)}to{transform:scale(1)}}
@keyframes bl{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes sh{from{transform:translateX(-200px)}to{transform:translateX(1200px)}}
.c{transform-box:fill-box;transform-origin:center;animation:pop .5s ease-out both}
.live{animation:bl 1.2s ease-in-out infinite}.sh{animation:sh 7s linear infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs><clipPath id="f"><rect width="${W}" height="${H}" rx="6"/></clipPath><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<g clip-path="url(#f)"><rect width="${W}" height="${H}" fill="#12061F"/><image href="${BG}" xlink:href="${BG}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" opacity=".5"/><rect width="${W}" height="${H}" fill="#12061F" opacity=".66"/><rect class="sh" width="120" height="${H}" fill="url(#g)" opacity=".08"/></g>
<text x="28" y="60" font-size="44" letter-spacing="4" fill="#EAEAEA">_CONTRIBUTIONS</text>
<circle class="live" cx="520" cy="46" r="8" fill="#FF3D6E"/><text x="536" y="55" font-size="24" letter-spacing="4" fill="#FF3D6E">LIVE</text>
<text x="972" y="55" font-size="26" letter-spacing="2" text-anchor="end" fill="#FFD56A">${st.total} IN THE LAST YEAR</text>
<rect x="28" y="76" width="944" height="1" fill="#8A3A8F" opacity=".7"/>
${months}${dayLabels}${cells}
<text x="${x0}" y="${y0 + 7 * pitch + 26}" font-size="19" letter-spacing="2" fill="#C9A4E8">PUBLIC · UPDATED ${upd} UTC${opts.note ? " · " + esc(opts.note) : ""}</text>
<text x="738" y="${y0 + 7 * pitch + 26}" font-size="19" letter-spacing="2" text-anchor="end" fill="#C9A4E8">LESS</text>${legend}<text x="${760 + 5 * 22 + 6}" y="${y0 + 7 * pitch + 26}" font-size="19" letter-spacing="2" fill="#C9A4E8">MORE</text>
<rect x="28" y="294" width="944" height="1" fill="#8A3A8F" opacity=".5"/>
${stat(52, st.active, "ACTIVE DAYS")}${stat(300, st.longest, "LONGEST STREAK")}${stat(570, st.cur, "CURRENT STREAK")}${stat(790, bestTxt, bestLbl)}
<path d="M18 40V18H40M${W - 40} 18H${W - 18}V40M${W - 18} ${H - 40}V${H - 18}H${W - 40}M40 ${H - 18}H18V${H - 40}" fill="none" stroke="#FF9A5C" stroke-width="2" opacity=".85"/>
</svg>`;
}

module.exports = { parseCalendar, merge, stats, renderYear };
