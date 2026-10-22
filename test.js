const assert = require("assert");
const { summarize, render } = require("./lib/render");
const now = Date.parse("2026-10-22T12:00:00Z");
const ev = (type, iso, size, repo = "BuccKyy/x") => ({ type, created_at: iso, repo: { name: repo }, payload: { distinct_size: size } });
const events = [ev("PushEvent", "2026-10-22T11:50:00Z", 3), ev("PushEvent", "2026-10-21T09:00:00Z", 2), ev("WatchEvent", "2026-10-22T10:00:00Z"), ev("ForkEvent", "2026-10-20T09:00:00Z")];
const s = summarize(events, now);
assert.strictEqual(s.total, 6);            // watch is not counted
assert.strictEqual(s.activeDays, 3);
assert.strictEqual(s.streak, 3);           // 22nd, 21st, 20th
assert.strictEqual(summarize([], now).streak, 0);
assert.strictEqual(summarize([ev("PushEvent", "2026-10-21T09:00:00Z", 1)], now).streak, 1); // today empty is fine
assert.ok(render(events, now).includes("LIVE ACTIVITY"));
console.log("ok");
