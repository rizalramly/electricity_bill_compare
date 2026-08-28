import { describe, expect, it } from "vitest";
import {
  DEFAULT_AFA,
  FALLBACK_PAYLOAD,
  parseAfaFromHtml,
  resolveAfa,
} from "./afa";

describe("resolveAfa fallback paths", () => {
  it("returns the fallback payload when the fetch is blocked (403)", async () => {
    const blocked = (async () =>
      new Response("Access Denied", { status: 403 })) as unknown as typeof fetch;
    expect(await resolveAfa(blocked)).toEqual(FALLBACK_PAYLOAD);
  });

  it("returns the fallback payload when the fetch throws (network/timeout)", async () => {
    const failing = (async () => {
      throw new Error("aborted");
    }) as unknown as typeof fetch;
    expect(await resolveAfa(failing)).toEqual(FALLBACK_PAYLOAD);
  });

  it("returns the fallback payload when the page has no parseable AFA (JS-rendered)", async () => {
    const jsRendered = (async () =>
      new Response("<html><body><div id='app'></div></body></html>", {
        status: 200,
      })) as unknown as typeof fetch;
    expect(await resolveAfa(jsRendered)).toEqual(FALLBACK_PAYLOAD);
  });

  it("fallback payload carries the documented default", () => {
    expect(FALLBACK_PAYLOAD).toEqual({
      value: DEFAULT_AFA,
      unit: "sen/kWh",
      month: "2026-08",
      source: "fallback",
    });
  });
});

describe("resolveAfa success path", () => {
  it("parses an AFA value near the AFA text", async () => {
    const html = `<html><body>
      <h2>Automatic Fuel Adjustment (AFA)</h2>
      <p>For August 2026 the AFA is <strong>+3.80 sen/kWh</strong>.</p>
    </body></html>`;
    const ok = (async () =>
      new Response(html, { status: 200 })) as unknown as typeof fetch;
    const payload = await resolveAfa(ok);
    expect(payload.source).toBe("mytnb");
    expect(payload.value).toBe(3.8);
    expect(payload.month).toBe("2026-08");
  });
});

describe("parseAfaFromHtml", () => {
  it("handles negative (rebate) values with unicode minus", () => {
    const parsed = parseAfaFromHtml("<p>AFA for July 2026: −1.10 sen/kWh</p>");
    expect(parsed?.value).toBe(-1.1);
    expect(parsed?.month).toBe("2026-07");
  });

  it("rejects out-of-range values", () => {
    expect(parseAfaFromHtml("<p>AFA: 55 sen/kWh</p>")).toBeNull();
  });

  it("returns null when AFA is absent", () => {
    expect(parseAfaFromHtml("<p>Nothing to see here</p>")).toBeNull();
  });
});
