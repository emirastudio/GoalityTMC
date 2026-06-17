// Lightweight Telegram Bot API sender. Used for ops alerts (bug reports etc.).
// If env vars are missing we no-op so the app keeps working in dev / on PRs.

const API = "https://api.telegram.org";

type SendOpts = {
  /** Override default chat id (bug chat). Pass when alert target differs. */
  chatId?: string;
  /** Parse mode for formatting. Defaults to HTML — safer than MarkdownV2 (no escape minefield). */
  parseMode?: "HTML" | "MarkdownV2" | "Markdown";
  /** Disable link previews. Defaults to true. */
  disableWebPagePreview?: boolean;
  /** Override default bot token. */
  botToken?: string;
};

export type TelegramSendResult =
  | { ok: true; messageId: number }
  | { ok: false; reason: "no_config" | "http_error" | "exception"; detail?: string };

/**
 * Send a Telegram message. Never throws — returns a result object.
 * In dev without env vars configured this is a no-op (returns no_config).
 */
export async function sendTelegram(text: string, opts: SendOpts = {}): Promise<TelegramSendResult> {
  const token = opts.botToken ?? process.env.TELEGRAM_BUG_BOT_TOKEN;
  const chatId = opts.chatId ?? process.env.TELEGRAM_BUG_CHAT_ID;

  if (!token || !chatId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[telegram] no_config — skip send. text=", text.slice(0, 80));
    }
    return { ok: false, reason: "no_config" };
  }

  const body = {
    chat_id: chatId,
    text,
    parse_mode: opts.parseMode ?? "HTML",
    disable_web_page_preview: opts.disableWebPagePreview ?? true,
  };

  // Single retry on 429 (rate limit). Anything else surfaces immediately.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        // Keep this short — caller is awaiting in a fire-and-forget context.
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 429 && attempt === 0) {
        const data = (await res.json().catch(() => ({}))) as { parameters?: { retry_after?: number } };
        const waitMs = ((data.parameters?.retry_after ?? 1) + 0.2) * 1000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[telegram] http_error", res.status, detail.slice(0, 200));
        return { ok: false, reason: "http_error", detail: `${res.status} ${detail}` };
      }

      const data = (await res.json()) as { result: { message_id: number } };
      return { ok: true, messageId: data.result.message_id };
    } catch (err) {
      console.error("[telegram] exception", err);
      return { ok: false, reason: "exception", detail: String(err) };
    }
  }

  return { ok: false, reason: "http_error", detail: "exhausted retries" };
}

/** Escape user-provided strings before inserting into HTML-formatted message. */
export function escTg(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
