# TNB Tariff Comparison

A single-page web app for Malaysian **domestic (residential, Peninsular Malaysia)** electricity users to compare their monthly bill under:

- the **old tariff** — Tariff A, pre-July 2025 tiered blocks, and
- the **new RP4 tariff** — effective **1 July 2025**, with flat component rates, the monthly **AFA** (Automatic Fuel Adjustment), and the **EEI** (Energy Efficiency Incentive) rebate.

**Key in your actual monthly bill (RM, as billed under RP4) and the usage (kWh) printed on that bill** for up to 3 months — the RP4 side is your bill taken as-is (no calculation, no AFA input needed), and the calculator computes what the same usage would have cost under the old RP3 tariff. Results show per-month cards with the RP3 breakdown and effective sen/kWh rates, an interactive bar chart, a 0–3,000 kWh cost curve with breakeven markers (its RP4 line uses the auto-fetched AFA), and a plain-language summary.

> **Unofficial estimate.** Verify with [myTNB](https://www.mytnb.com.my/tariff/index.html) for official figures.

## Tech stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- Recharts
- Vitest (unit tests for the tariff engine and the AFA API fallback)
- Vercel serverless function at `api/afa.ts`

## Local development

```bash
npm install
npm run dev        # Vite dev server — the /api/afa route is NOT served; the app silently falls back to DEFAULT_AFA
```

To test the AFA serverless route locally, use the Vercel CLI instead:

```bash
npm i -g vercel
vercel dev         # serves the Vite app AND /api/afa
```

Other scripts:

```bash
npm test           # run the Vitest suite
npm run build      # type-check + production build (what Vercel runs)
npm run preview    # serve the production build locally
```

## Deployment (GitHub → Vercel)

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com/new), **Import** the GitHub repository.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output `dist/` — the defaults are correct.
4. The `api/` folder is auto-detected as serverless functions alongside the Vite app — no `vercel.json` needed.
5. No environment variables or secrets are required.

## Feedback form (email delivery)

The **Feedback** tab posts to the serverless route [`api/feedback.ts`](api/feedback.ts) (multipart form, optional attachment up to 4 MB — Vercel's request-body cap is 4.5 MB). Delivery uses [Resend](https://resend.com); the recipient address lives only server-side (env var / encoded constant) and is never shipped to the browser.

One-time setup:

1. Create a free Resend account (sign up with the address that should receive the feedback) and create an API key.
2. In the Vercel project: Settings → Environment Variables → add `RESEND_API_KEY` (all environments). Optionally add `FEEDBACK_TO_EMAIL` to override the recipient.
3. Redeploy. Until the key is set, the form shows a friendly "not configured yet" notice instead of sending.

Note: with Resend's sandbox sender (`onboarding@resend.dev`), emails can only be delivered to the Resend account owner's own address — fine for this use. Verify a custom domain in Resend to lift that restriction.

## AFA auto-fetch and the monthly fallback

`api/afa.ts` tries to scrape the current AFA (sen/kWh) from the official myTNB tariff page server-side, with realistic browser headers and a 5-second timeout. That page sits behind bot detection and may render the value via JavaScript, so **any** failure (blocked, timeout, parse miss) returns a fallback payload:

```json
{ "value": 3.80, "unit": "sen/kWh", "month": "2026-08", "source": "fallback" }
```

Responses are edge-cached (`s-maxage=21600, stale-while-revalidate=86400`) since AFA only changes monthly.

**Maintenance:** if the scrape does not work, bump the fallback monthly in **both** places (kept deliberately in sync):

- `DEFAULT_AFA` / `FALLBACK_MONTH` in [`api/afa.ts`](api/afa.ts)
- `DEFAULT_AFA` / `DEFAULT_AFA_MONTH` in [`src/lib/afa.ts`](src/lib/afa.ts)

The client prefills the AFA input from `/api/afa` and shows whether the value was auto-fetched or is the default. If the route itself is unreachable (plain `npm run dev`), the client silently uses `DEFAULT_AFA` — the app never breaks because of this.

## Tariff data sources

| Item | Value | Source |
|---|---|---|
| Old tariff blocks | 21.80 / 33.40 / 51.60 / 54.60 / 57.10 sen/kWh (200/100/300/300/rest), RM3.00 minimum | TNB Tariff A (Domestic), pre-July 2025 |
| RP4 energy charge | 27.03 sen/kWh (≤ 1,500 kWh) or 37.03 sen/kWh on **all** kWh (> 1,500 kWh) | RP4 Domestic schedule, effective 1 July 2025 |
| RP4 capacity / network | 4.55 / 12.85 sen/kWh | RP4 Domestic schedule |
| RP4 retail charge | RM10.00/month, waived when usage ≤ 600 kWh | RP4 Domestic schedule |
| AFA | Monthly, user-editable (−10 to +10 sen/kWh); **exempt when usage ≤ 600 kWh**, otherwise charged on all kWh | myTNB tariff page |
| EEI rebate | Tiered 25.0 → 0.5 sen/kWh on all kWh, usage ≤ 1,000 kWh only | RP4 Domestic schedule |
| KWTBB (RE Fund) | 1.6% of bill when usage > 300 kWh | KeTSA / TNB |
| SST | 8% when usage > 600 kWh (simplified — see comment in `sstCharge()`; the official method taxes only the portion above 600 kWh) | Royal Malaysian Customs |

All tariff logic lives in the pure module [`src/lib/tariff.ts`](src/lib/tariff.ts) with unit tests in [`src/lib/tariff.test.ts`](src/lib/tariff.test.ts) covering block boundaries, EEI tier edges, the retail waiver, AFA exemption at 600/601 kWh (including negative AFA), the 1,500/1,501 kWh energy-rate switch, the minimum charge, and tax thresholds — plus the worked example: 900 kWh at AFA +3.80 sen → **RM435.07** before taxes.
