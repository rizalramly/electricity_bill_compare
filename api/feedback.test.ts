import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, validateFeedback } from "./feedback";

describe("feedback validation", () => {
  it("requires a message", () => {
    expect(validateFeedback({ message: "" })).toMatch(/message/i);
    expect(validateFeedback({ message: "  " })).toMatch(/message/i);
  });

  it("accepts a plain message with no file", () => {
    expect(validateFeedback({ message: "The RP3 total looks off." })).toBeNull();
  });

  it("rejects over-length messages", () => {
    expect(validateFeedback({ message: "x".repeat(5001) })).toMatch(/too long/i);
  });

  it("rejects files above the 4 MB platform limit", () => {
    expect(
      validateFeedback({
        message: "See attached bill",
        file: { filename: "bill.pdf", mimeType: "application/pdf", size: MAX_FILE_BYTES + 1 },
      }),
    ).toMatch(/4 MB/);
    expect(
      validateFeedback({ message: "See attached bill", truncated: true }),
    ).toMatch(/4 MB/);
  });

  it("rejects disallowed file types", () => {
    expect(
      validateFeedback({
        message: "See attached",
        file: { filename: "run.exe", mimeType: "application/x-msdownload", size: 1000 },
      }),
    ).toMatch(/unsupported/i);
  });

  it("accepts an allowed document within the limit", () => {
    expect(
      validateFeedback({
        message: "My June bill attached",
        file: { filename: "bill.pdf", mimeType: "application/pdf", size: 2 * 1024 * 1024 },
      }),
    ).toBeNull();
  });
});
