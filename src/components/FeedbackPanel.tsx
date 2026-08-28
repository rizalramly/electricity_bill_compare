import { useId, useRef, useState } from "react";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // keep in sync with api/feedback.ts
const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export function FeedbackPanel() {
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const fileId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const onFileChange = (input: HTMLInputElement) => {
    setFileError(null);
    setFileLabel(null);
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError(
        `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 4 MB.`,
      );
      input.value = "";
      return;
    }
    setFileLabel(`${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!String(data.get("message") ?? "").trim()) {
      setStatus({ kind: "error", message: "Please write a short message first." });
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/feedback", { method: "POST", body: data });
      if (response.ok) {
        setStatus({ kind: "sent" });
        form.reset();
        setFileLabel(null);
        return;
      }
      let message = "Could not send your feedback — please try again later.";
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // keep the generic message
      }
      setStatus({ kind: "error", message });
    } catch {
      setStatus({
        kind: "error",
        message:
          "Could not reach the feedback service. If you are running the app locally with `npm run dev`, the API route is only available on the deployed site (or via `vercel dev`).",
      });
    }
  };

  return (
    <section aria-labelledby="feedback-heading" className="card mx-auto max-w-2xl p-6">
      <h2 id="feedback-heading" className="text-lg font-bold">
        Feedback
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">
        Spotted a difference from your actual bill, or have complete RP3 bill
        information that could improve the simulation? Send it over — your
        message goes straight to the maintainer. Attach a supporting document
        (e.g. a bill PDF) if you have one.
      </p>

      {status.kind === "sent" ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-status-good/30 bg-status-good/10 p-4 text-sm text-status-good"
        >
          <p className="font-semibold">Thank you — your feedback has been sent.</p>
          <p className="mt-1 text-ink-secondary">
            It really helps improve the accuracy of the comparison.
          </p>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => setStatus({ kind: "idle" })}
          >
            Send another
          </button>
        </div>
      ) : (
        <form ref={formRef} className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={nameId} className="text-sm font-medium">
                Name <span className="text-ink-muted">(optional)</span>
              </label>
              <input id={nameId} name="name" className="input-field mt-1.5" autoComplete="name" />
            </div>
            <div>
              <label htmlFor={emailId} className="text-sm font-medium">
                Your email <span className="text-ink-muted">(optional, for replies)</span>
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                className="input-field mt-1.5"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor={messageId} className="text-sm font-medium">
              Message
            </label>
            <textarea
              id={messageId}
              name="message"
              required
              rows={5}
              maxLength={5000}
              className="input-field mt-1.5 resize-y"
              placeholder="e.g. My actual RP3-era bill for 850 kWh was RM …, but the app shows RM …"
            />
          </div>

          <div>
            <label htmlFor={fileId} className="text-sm font-medium">
              Attach a document <span className="text-ink-muted">(optional, max 4 MB)</span>
            </label>
            <input
              id={fileId}
              name="file"
              type="file"
              accept={ACCEPT}
              className="mt-1.5 block w-full text-sm text-ink-secondary file:mr-3 file:rounded-lg file:border file:border-grid file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-secondary hover:file:bg-surface-page"
              onChange={(e) => onFileChange(e.currentTarget)}
            />
            <p className="mt-1 text-xs text-ink-muted">
              PDF, Word, Excel, text/CSV or image.
              {fileLabel ? ` Selected: ${fileLabel}` : ""}
            </p>
            {fileError && (
              <p role="alert" className="mt-1 text-xs text-status-bad">
                {fileError}
              </p>
            )}
          </div>

          {/* Honeypot — hidden from real users, catches naive bots */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {status.kind === "error" && (
            <p role="alert" className="text-sm text-status-bad">
              {status.message}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={status.kind === "sending"}
              className="inline-flex items-center gap-2 rounded-lg bg-series-old px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-series-old/40 disabled:opacity-60"
            >
              {status.kind === "sending" ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
