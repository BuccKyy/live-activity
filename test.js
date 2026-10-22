const assert = require("assert");
const { summarize, render } = require("./lib/render");
const { parseCalendar, merge, stats, renderYear } = require("./lib/year");
const now = Date.parse("2026-10-22T12:00:00Z");
const ev = (type, iso, size, repo = "BuccKyy/x") => ({ type, created_at: iso, repo: { name: repo }, payload: { distinct_size: size } });
const events = [ev("PushEvent", "2026-10-22T11:50:00Z", 3), ev("PushEvent", "2026-10-21T09:00:00Z", 2), ev("WatchEvent", "2026-10-22T10:00:00Z"), ev("ForkEvent", "2026-10-20T09:00:00Z")];
const s = summarize(events, now);
assert.strictEqual(s.total, 6);            // watch is not counted
assert.strictEqual(s.activeDays, 3);
assert.strictEqual(s.streak, 3);
assert.strictEqual(summarize([], now).streak, 0);
assert.ok(render(events, now).includes("LIVE ACTIVITY"));

// calendar parser
const html = '<td data-date="2026-10-20" id="a" data-level="2"></td><tool-tip for="a">5 contributions on October 20th.</tool-tip>' +
             '<td data-date="2026-10-21" id="b" data-level="0"></td><tool-tip for="b">No contributions on October 21st.</tool-tip>' +
             '<td data-date="2026-10-22" id="c" data-level="1"></td><tool-tip for="c">1 contribution on October 22nd.</tool-tip>';
assert.deepStrictEqual(parseCalendar(html), { "2026-10-20": 5, "2026-10-21": 0, "2026-10-22": 1 });

// merge: snapshot covers to 10-22; live adds later days, takes max on the snapshot day, never double counts
const snap = { asOf: "2026-10-22", days: { "2026-10-22": 7, "2026-10-01": 2 } };
const m = merge(snap, [ev("PushEvent", "2026-10-22T11:50:00Z", 3), ev("PushEvent", "2026-10-23T01:00:00Z", 4)], Date.parse("2026-10-23T02:00:00Z"));
assert.strictEqual(m["2026-10-22"], 7);    // max(7, 3), not 10
assert.strictEqual(m["2026-10-23"], 4);
assert.strictEqual(m["2026-10-01"], 2);

// stats + render
const st = stats(m, Date.parse("2026-10-23"));
assert.strictEqual(st.cur, 2);
assert.strictEqual(st.best.n, 7);
const svg = renderYear(m, Date.parse("2026-10-23T02:00:00Z"));
assert.ok(svg.includes("IN THE LAST YEAR") && (svg.match(/class="c"/g) || []).length > 360);
console.log("ok");
