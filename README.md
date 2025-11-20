# 11Eleven — Starter

Minimal VS Code starter to launch 11Eleven as an HTML site with a Node API.

## Quick Start
1) Install deps
```
npm install
```
2) Create `.env` from `.env.example` and add your keys.
3) Run locally
```
npm run dev
```
Open http://localhost:8787

## Stripe
- Replace STRIPE_EARLY_ACCESS_URL and STRIPE_DEEPER_READING_URL in `public/script.js` with your Payment Link URLs.

## Portal
- Button unlocks exactly at 11:11 (local time) for a 2-minute window.
- First free reading is tracked with localStorage key `11eleven_free_used`.
