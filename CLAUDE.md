# Jyoti — Project Context for Claude

## What is Jyoti?
A Vedic astrology daily practice app (jyotiapp.app) built by Alana. Subscribers enter their birth details, receive a personalised Nadi Jyotish reading, sacred daily practice (3 bullet points + mantra), weekly practice, and compatibility/synastry reading. Powered by Claude AI (Anthropic). Deployed on Vercel Hobby plan.

**Owner contact:** hellojyoti@proton.me  
**Business:** Jyoti Pty Ltd, Queensland, Australia  
**Stripe:** AUD pricing, payouts to WBC bank account  

---

## Tech Stack
- **Frontend:** Single-page app (`index.html`) — vanilla JS, no framework
- **Backend:** Vercel serverless functions (`/api/*.js`)
- **AI:** Anthropic Claude API (`get-remedy.js`, `get-synastry.js`)
- **Payments:** Stripe (subscriptions, webhooks, customer portal)
- **Email:** Resend API (`onboarding@resend.dev` → `hellojyoti@proton.me`)
- **Push notifications:** Web Push (`web-push` npm package, VAPID keys)
- **Ephemeris:** Local JS ephemeris (`calcChart()`) — sidereal, Lahiri ayanamsa
- **Storage:** Vercel KV (push subscriptions via `_pushStore.js`)
- **Languages:** English, Hindi (Devanagari), Spanish

---

## Key Files

### Frontend
- **`index.html`** — entire SPA; all UI, chart calculation, reading display, caching
  - `showDailyReading()` (~line 2164) — daily practice loader
  - `showWeeklyReading()` (~line 3015) — weekly practice loader
  - `buildSynChartSummary()` (~line 4017) — builds chart text for synastry API
  - `beginSynastry()` (~line 4051) — starts compatibility reading

### API
- **`api/get-remedy.js`** — daily + weekly + depth readings via Claude AI
- **`api/get-synastry.js`** — compatibility/synastry readings via Claude AI
- **`api/webhook.js`** — Stripe webhook (checkout, cancellation, payment failed)
- **`api/send-push.js`** — sends push notifications (cron, every ~15 min)
- **`api/save-push-subscription.js`** — saves Web Push subscriptions to KV
- **`api/create-checkout.js`** — Stripe checkout + customer portal
- **`api/verify-session.js`** — verifies Stripe subscription status
- **`api/calc-chart.js`** — server-side chart calculation
- **`api/redeem-code.js`** / **`api/redeem-beta.js`** — gift/beta codes
- **`api/verify-token.js`** — token verification

### Helpers (underscore prefix = not Vercel functions)
- **`api/_pushStore.js`** — KV operations for push subscriptions
- **`api/_rateLimit.js`** — rate limiting
- **`api/_sanitize.js`** — input sanitisation

### Config
- **`vercel.json`** — function maxDurations + URL rewrites
  - Vercel Hobby plan limit: 12 serverless functions. Currently at 11. Do not exceed.

---

## Vercel Environment Variables (all required)
- `ANTHROPIC_API_KEY` — Claude AI
- `STRIPE_SECRET_KEY` — Stripe
- `STRIPE_WEBHOOK_SECRET` — not currently used (webhook verifies via event retrieve)
- `RESEND_API_KEY` — welcome emails
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Web Push
- `PUSH_CRON_SECRET` — protects `/api/send-push` and any admin endpoints
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — Vercel KV for push subscriptions

---

## Subscription & Access Tiers
- **`full`** — full subscriber (daily, weekly, chart, compatibility)
- **`compat`** — compatibility-only tier
- Tier stored in Stripe metadata, verified via `verify-session.js`
- Gift/beta codes give temporary access via `redeem-code.js` / `redeem-beta.js`

---

## Daily Practice — How It Works
1. User opens app → `showDailyReading()` fires
2. Checks localStorage cache keyed by `practiceDate + lang + chartKey`
3. **After 8pm local time:** `practiceDate` = tomorrow (so evening push notification reveals genuinely fresh content)
4. Calls `calcChart()` for current transits
5. Builds `chartSummary` string with natal chart + dasha + transits + nakshatra lord
6. POSTs to `/api/get-remedy` with `type: 'daily_quick'`
7. AI returns JSON with `cosmic_weather`, `practices[3]`, `mantra`, etc.
8. "More guidance" button triggers a second call with `type: 'daily_depth'`

### Four-Layer Analysis (daily prompt)
The AI silently analyses:
- (a) Vara lord — weekday ruler, natal placement
- (b) Pratyantara dasha lord — immediate karmic focus
- (c) Any transit within 5° of a natal planet
- (d) Transit Moon's nakshatra lord — natal + transit placement (most daily variation)

### Nakshatra Lord
- 27 nakshatras → lord via Vimshottari sequence: `['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury']` × 3
- Added to daily, weekly, and synastry chart summaries
- Drives genuine day-to-day variation in the 3 practice bullets

---

## Push Notifications
- Cron fires every ~15 min (external service hitting `/api/send-push?key=SECRET`)
- Morning slot: 6:00–6:14am local time → "Begin Your Practice"
- Evening slot: 8:00–8:14pm local time → "Tomorrow's Practice is ready"
- Evening notification aligns with `practiceDate = tomorrow` logic in frontend
- Supports en/hi/es, personalised with subscriber name

---

## Stripe Webhook — Important Architecture Note
**`api/webhook.js` initialises Stripe INSIDE the handler, not at module level.**  
Reason: module-level `require('stripe')(undefined)` would throw on cold-start if env var missing → TCP reset → Stripe logs "other error". Always keep Stripe init inside the handler.

Webhook verifies events by retrieving from Stripe API (not by signature — avoids raw-body parsing issues on Vercel).

---

## Known Issues / Watch Out For
- **`const` in template literals:** Helpers (`_n`, `_h`, `_dg`) must be declared BEFORE any template literal that uses them. `const` is not hoisted — using it before declaration throws ReferenceError. In `showDailyReading()`, all helpers are now declared before `transitBlock`.
- **Vercel function limit:** 12 functions max on Hobby plan. Currently 11. Don't add more without removing one.
- **Stripe webhook "other errors":** Connection-reset errors mean the function crashed before sending any HTTP response. Always ensure a 200 response is returned in all code paths.
- **localStorage cache:** Daily practice cached by `practiceDate_lang_chartKey`. Clear cache by changing any of those three values. Cache is NOT cleared by refreshing — user must clear manually or cache key must change.
- **Synastry caching:** Do NOT call `loadSynCacheFromStorage()` on form submit — it restores stale tier2 readings. Each form submit clears `synCache={}` and fetches all sections fresh. In-session memory cache prevents redundant re-fetches while browsing within one reading.
- **Deep read cache key:** Must include `synCacheKey().slice(-12)` suffix to be person-specific — without it, different people share the same cached deep read.

---

## Git Branches
- `main` — production (auto-deploys to Vercel)
- `claude/confident-mayer-fQAr1` — current dev branch

Always develop on the dev branch, then merge to main when confirmed working.

---

## Subscribers (as of July 2026)
- 2 paying subscribers
- First subscriber: signed up ~June 18, 2026
- Second subscriber: signed up June 27, 2026 (missed welcome email due to webhook bug — send manually from hellojyoti@proton.me)

---

## Tone & Content Rules (for AI prompts)
- Practice bullets: ONE sentence, max 20 words, starts with a verb
- No em dashes (—), en dashes (–), asterisks (*), or Markdown in AI output
- Mantra always in Sanskrit Devanagari script regardless of language
- `mantra_translit` always plain Roman transliteration
- Classical depth hidden underneath — user feels human truth, not astrology jargon
- Tradition: Vedic/Jyotish ONLY — sidereal zodiac, Lahiri ayanamsa, never Western/tropical
