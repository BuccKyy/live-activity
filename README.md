# live-activity

A tiny Vercel function that renders a styled **live GitHub activity** panel as an SVG
(`/activity.svg`), so a profile README can show recent public activity that updates when
someone opens the page, without committing to a repo every few minutes.

- Reads `https://api.github.com/users/<user>/events/public` (public pushes, forks, PRs, issues, releases).
- Draws the full 12-month calendar (53 weeks) in a custom palette, with totals, active days, longest and current streak, and the best day.
- Data source: GitHub's official calendar when the profile is public. With "private profile" on, GitHub reports zero, so it falls back to a saved history snapshot (`lib/snapshot.json`) merged with live public pushes.
- No dependencies, no database. Edge-cached 60 s, stale-while-revalidate 10 min.

## Limits (by design of GitHub's API)

- Public repositories only. In snapshot mode, days after the snapshot come from the events API (last 90 days / 300 events), so exact history needs a public profile or a fresh snapshot.
- It counts pushes (commits), forks, PRs, issues, releases and reviews. Stars are not counted.
- GitHub's image proxy may cache for a few minutes, so "live" means within minutes, not seconds.
- Unauthenticated calls are rate-limited (60/h per IP). Set `GITHUB_TOKEN` (no scopes needed) on Vercel for headroom.

## Use

```
GH_USER=<login>   # defaults to BuccKyy
GITHUB_TOKEN=...  # optional
```

```markdown
![Live activity](https://<your-project>.vercel.app/activity.svg)
```

## Test

`node test.js` (streak, counting rules, empty state).
