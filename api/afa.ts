import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Vercel serverless function: GET /api/afa
 *
 * Attempts to scrape the current AFA (Automatic Fuel Adjustment, sen/kWh) from
 * the official myTNB tariff page. That page sits behind bot detection and may
 * render the value via JavaScript, so every failure path (blocked, timeout,
 * parse miss) falls back to a fixed default.
 *
 * Keep DEFAULT_AFA in sync with src/lib/afa.ts (client-side fallback) and bump
 * it monthly if the scrape does not succeed — see README.
 */

export const DEFAULT_AFA = 3.8;
export const FALLBACK_MONTH = "2026-08";
const MYTNB_TARIFF_URL = "https://www.mytnb.com.my/tariff/index.html";
const FETCH_TIMEOUT_MS = 5000;

export interface AfaPayload {
  value: number;
  unit: "sen/kWh";
  month: string;
  source: "mytnb" | "fallback";
}

export const FALLBACK_PAYLOAD: AfaPayload = {
  value: DEFAULT_AFA,
  unit: "sen/kWh",
  month: FALLBACK_MONTH,
  source: "fallback",
};

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
  // Bahasa Malaysia month names, as the page may be localized
  januari: "01", februari: "02", mac: "03", jun: "06",
  julai: "07", ogos: "08", oktober: "10", disember: "12",
};

/**
 * Look for a signed sen/kWh number in the vicinity of "AFA" text.
 * Returns null when the page is JS-rendered or the pattern is not found.
 */
export function parseAfaFromHtml(html: string): { value: number; month?: string } | null {
  const afaIndex = html.search(/AFA|Automatic Fuel Adjustment/i);
  if (afaIndex === -1) return null;

  // Search a window of text around the AFA mention for "+3.80 sen" style values.
  const window = html
    .slice(Math.max(0, afaIndex - 500), afaIndex + 1500)
    .replace(/<[^>]+>/g, " ");

  const valueMatch = window.match(/([+−-]?\s?\d{1,2}(?:\.\d{1,2})?)\s*sen/i);
  if (!valueMatch) return null;

  const value = parseFloat(valueMatch[1].replace(/−/g, "-").replace(/\s/g, ""));
  if (!Number.isFinite(value) || Math.abs(value) > 10) return null;

  let month: string | undefined;
  const monthMatch = window.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december|januari|februari|mac|jun|julai|ogos|oktober|disember)\s+(20\d{2})/i,
  );
  if (monthMatch) {
    month = `${monthMatch[2]}-${MONTHS[monthMatch[1].toLowerCase()]}`;
  }

  return { value, month };
}

/** Core logic, injectable fetch for testing. Never throws. */
export async function resolveAfa(fetchImpl: typeof fetch = fetch): Promise<AfaPayload> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchImpl(MYTNB_TARIFF_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ms;q=0.8",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return FALLBACK_PAYLOAD;

    const html = await response.text();
    const parsed = parseAfaFromHtml(html);
    if (!parsed) return FALLBACK_PAYLOAD;

    return {
      value: parsed.value,
      unit: "sen/kWh",
      month: parsed.month ?? new Date().toISOString().slice(0, 7),
      source: "mytnb",
    };
  } catch {
    return FALLBACK_PAYLOAD;
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const payload = await resolveAfa();
  // AFA only changes monthly — cache at the edge, don't hammer the page.
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  res.status(200).json(payload);
}
