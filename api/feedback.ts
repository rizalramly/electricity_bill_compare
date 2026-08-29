import type { VercelRequest, VercelResponse } from "@vercel/node";
import busboy from "busboy";

/**
 * POST /api/feedback — receives the feedback form (multipart/form-data) and
 * forwards it by email via Resend (https://resend.com).
 *
 * Configuration (Vercel project → Settings → Environment Variables):
 *   RESEND_API_KEY     required — free Resend API key; without it the route
 *                      responds 503 and the form shows a friendly notice.
 *   FEEDBACK_TO_EMAIL  optional — overrides the recipient address.
 *
 * The recipient address is resolved server-side only: it is never rendered in
 * the page, never shipped in the client bundle, and never echoed in responses.
 * Vercel caps request bodies at 4.5 MB, so attachments are limited to 4 MB.
 */

export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
];

function recipient(): string {
  return (
    process.env.FEEDBACK_TO_EMAIL ||
    // Base64-obfuscated so the address is not plain-text scrapeable.
    Buffer.from("cml6YWxyYW1seUBnbWFpbC5jb20=", "base64").toString("utf8")
  );
}

export interface FeedbackFile {
  filename: string;
  mimeType: string;
  size: number;
}

/** Pure validation shared with tests. Returns an error message or null. */
export function validateFeedback(input: {
  message: string;
  truncated?: boolean;
  file?: FeedbackFile;
}): string | null {
  if (!input.message || input.message.trim().length < 3) {
    return "Please write a short message.";
  }
  if (input.message.length > 5000) {
    return "Message is too long (max 5,000 characters).";
  }
  if (input.truncated) {
    return "The attached file exceeds the 4 MB limit.";
  }
  if (input.file) {
    if (input.file.size > MAX_FILE_BYTES) {
      return "The attached file exceeds the 4 MB limit.";
    }
    if (!ALLOWED_MIME_TYPES.includes(input.file.mimeType)) {
      return "Unsupported file type — please attach a PDF, Word, Excel, text/CSV or image file.";
    }
  }
  return null;
}

interface ParsedForm {
  name: string;
  email: string;
  message: string;
  /** Honeypot field — real users leave it empty. */
  website: string;
  truncated: boolean;
  file?: { filename: string; mimeType: string; data: Buffer };
}

function parseForm(req: VercelRequest): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 10, fieldSize: 10_000 },
    });
    const fields: Record<string, string> = {};
    let file: ParsedForm["file"];
    let truncated = false;

    bb.on("field", (name, value) => {
      fields[name] = value;
    });
    bb.on("file", (_name, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => {
        truncated = true;
        stream.resume();
      });
      stream.on("close", () => {
        if (!truncated && info.filename) {
          file = {
            filename: info.filename,
            mimeType: info.mimeType,
            data: Buffer.concat(chunks),
          };
        }
      });
    });
    bb.on("close", () =>
      resolve({
        name: (fields.name ?? "").trim(),
        email: (fields.email ?? "").trim(),
        message: (fields.message ?? "").trim(),
        website: (fields.website ?? "").trim(),
        truncated,
        file,
      }),
    );
    bb.on("error", reject);
    req.pipe(bb);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "The feedback service is not configured yet. Please try again later.",
    });
    return;
  }

  let parsed: ParsedForm;
  try {
    parsed = await parseForm(req);
  } catch {
    res.status(400).json({ error: "Could not read the submitted form." });
    return;
  }

  // Honeypot tripped — quietly accept without sending.
  if (parsed.website) {
    res.status(200).json({ ok: true });
    return;
  }

  const validationError = validateFeedback({
    message: parsed.message,
    truncated: parsed.truncated,
    file: parsed.file
      ? {
          filename: parsed.file.filename,
          mimeType: parsed.file.mimeType,
          size: parsed.file.data.length,
        }
      : undefined,
  });
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const lines = [
    "New feedback from the Electricity Tariff Comparison app",
    "",
    `Name:  ${parsed.name || "(not given)"}`,
    `Email: ${parsed.email || "(not given)"}`,
    "",
    "Message:",
    parsed.message,
  ];

  try {
    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Electricity Tariff Feedback <onboarding@resend.dev>",
        to: [recipient()],
        reply_to: parsed.email || undefined,
        subject: `Electricity Tariff Comparison feedback${parsed.name ? ` — ${parsed.name}` : ""}`,
        text: lines.join("\n"),
        attachments: parsed.file
          ? [
              {
                filename: parsed.file.filename,
                content: parsed.file.data.toString("base64"),
              },
            ]
          : undefined,
      }),
    });
    if (!sendResponse.ok) {
      res.status(502).json({
        error: "Could not send your feedback right now — please try again later.",
      });
      return;
    }
  } catch {
    res.status(502).json({
      error: "Could not send your feedback right now — please try again later.",
    });
    return;
  }

  res.status(200).json({ ok: true });
}
