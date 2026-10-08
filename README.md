# CAMESUKE

A photo capture tool for toilet-room renovation estimates. A guided flow
walks a customer through 4 reference photos (back wall, floor/zenith, model
label, plumbing). The customer types in the toilet's brand/model from the
label, and the app looks up that model's known size in a Google Sheets
reference database via `/api/toilet-lookup`. Staff then review the photos
and the matched size together to produce an estimate.

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

Copy `.env.example` to `.env` and fill in `GOOGLE_SERVICE_ACCOUNT_JSON` /
`GOOGLE_SHEET_ID` (a Google service account with read access to the
reference sheet) before the toilet lookup will work — see that file for
details. On Vercel, set the same two variables as Project Environment
Variables.

## Scripts

- `bun run dev` — start the dev server (Next.js + Turbopack)
- `bun run build` — production build
- `bun run start` — serve the production build locally
- `bun run lint` — eslint
- `bun run format` — prettier

## Project structure

- `app/` — pages (App Router) and the one API route, `app/api/toilet-lookup`
- `components/`, `hooks/`, `lib/` — shared UI and app code, imported via the
  `@/*` path alias
- `lib/sheets-client.ts` — the Google Sheets lookup (service-account auth +
  REST calls), the only server-side integration this app has
- `public/samples/` — the 4 reference photos shown during the capture guide

## Built with

- Next.js (App Router)
- TypeScript
- React
- Tailwind CSS
- Deployed on Vercel
