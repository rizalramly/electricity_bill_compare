/**
 * Client-side AFA prefill.
 * DEFAULT_AFA mirrors the fallback constant in api/afa.ts — keep them in sync
 * (bump monthly if the myTNB scrape does not work; see README).
 */

export const DEFAULT_AFA = 3.8;
export const DEFAULT_AFA_MONTH = "2026-08";

export interface AfaResult {
  value: number;
  month: string;
  source: "mytnb" | "fallback" | "client-default";
}

export const CLIENT_FALLBACK: AfaResult = {
  value: DEFAULT_AFA,
  month: DEFAULT_AFA_MONTH,
  source: "client-default",
};

/**
 * Fetch /api/afa; if the route is unreachable (e.g. plain `npm run dev`
 * without `vercel dev`), silently fall back to the client default.
 * Never throws — the app must not break because of this.
 */
export async function fetchAfa(): Promise<AfaResult> {
  try {
    const res = await fetch("/api/afa", { headers: { Accept: "application/json" } });
    if (!res.ok) return CLIENT_FALLBACK;
    const data = (await res.json()) as Partial<AfaResult> & { value?: unknown };
    if (
      typeof data.value !== "number" ||
      !Number.isFinite(data.value) ||
      Math.abs(data.value) > 10
    ) {
      return CLIENT_FALLBACK;
    }
    return {
      value: data.value,
      month: typeof data.month === "string" ? data.month : DEFAULT_AFA_MONTH,
      source: data.source === "mytnb" ? "mytnb" : "fallback",
    };
  } catch {
    return CLIENT_FALLBACK;
  }
}
