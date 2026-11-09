# InnerBrain landing

Landing page + demo-request form for InnerBrain (private on-prem AI box: Mac mini + Qwen + chat UI over office Wi-Fi).

- `public/index.html` — the whole page (Arabic RTL). Motion: `public/motion-kit.{js,css}` (web-taste kit) + the hero scene script at the bottom of index.html.
- `server.ts` — Bun server: static files, `POST /api/lead` → Postgres `leads`, `GET /leads?key=$ADMIN_KEY` (latest 500).
- `lead.ts` — form validation; `bun test` checks it.
- Env: `DATABASE_URL`, `ADMIN_KEY`, `PORT` (3000).

## Commands
- Preview the page only: `cd public && python3 -m http.server 8787`
- Test: `bun test`
- Deploy: CranL project "InnerBrain", app `innerbrain-web` (riyadh-1), `deploy_source` with the Dockerfile.

## Done
`bun test` green, page has zero console errors at 1440 and 390 wide, no horizontal scroll, form submit lands a row in `leads`.
- `public/en.html` is generated: edit `public/index.html`, then run `python3 make_en.py` (fails loudly on any untranslated Arabic; add the new pair to its list).
