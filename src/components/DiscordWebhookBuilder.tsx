import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CopyButton,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type WebhookResponseState =
  | { body: string; ok: false; status: number }
  | { body: string; messageId: string | null; ok: true; status: number };

type EmbedInputState = {
  color: string;
  description: string;
  footer: string;
  title: string;
  url: string;
};

const EMPTY_EMBED: EmbedInputState = {
  color: "#5865f2",
  description: "",
  footer: "",
  title: "",
  url: "",
};

const SAMPLE_CONTENT = "Build finished successfully for production.\nCommit: 6f93d10\nDuration: 1m 42s";
const SAMPLE_EMBED: EmbedInputState = {
  color: "#22c55e",
  description: "Version `1.8.4` is live. Health checks passed and traffic has been restored.",
  footer: "dchu096.tk webhook builder",
  title: "Production deploy complete",
  url: "https://dchu096.tk/",
};

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const validHost = /(^|\.)discord(app)?\.com$/i.test(url.hostname);
    const validPath = /^\/api(?:\/v\d+)?\/webhooks\/\d+\/[^/]+/i.test(url.pathname);
    return url.protocol === "https:" && validHost && validPath;
  } catch {
    return false;
  }
}

function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseEmbedColor(value: string): number | undefined {
  const trimmed = value.trim();

  if (!/^#?[0-9a-f]{6}$/i.test(trimmed)) {
    return undefined;
  }

  return Number.parseInt(trimmed.replace(/^#/, ""), 16);
}

function buildAllowedMentions(options: {
  allowEveryone: boolean;
  allowRoles: boolean;
  allowUsers: boolean;
}) {
  const parse: string[] = [];

  if (options.allowEveryone) {
    parse.push("everyone");
  }

  if (options.allowRoles) {
    parse.push("roles");
  }

  if (options.allowUsers) {
    parse.push("users");
  }

  return { parse };
}

function buildPayload(input: {
  allowEveryone: boolean;
  allowRoles: boolean;
  allowUsers: boolean;
  avatarUrl: string;
  content: string;
  embed: EmbedInputState;
  username: string;
}) {
  const content = input.content.trim();
  const embed = {
    title: normalizeOptionalString(input.embed.title),
    description: normalizeOptionalString(input.embed.description),
    url: normalizeOptionalString(input.embed.url),
    footerText: normalizeOptionalString(input.embed.footer),
    color: parseEmbedColor(input.embed.color),
  };

  const embeds =
    embed.title || embed.description || embed.url || embed.footerText || embed.color
      ? [
          {
            ...(embed.title ? { title: embed.title } : {}),
            ...(embed.description ? { description: embed.description } : {}),
            ...(embed.url ? { url: embed.url } : {}),
            ...(embed.color !== undefined ? { color: embed.color } : {}),
            ...(embed.footerText ? { footer: { text: embed.footerText } } : {}),
          },
        ]
      : [];

  return {
    ...(content ? { content } : {}),
    ...(normalizeOptionalString(input.username) ? { username: input.username.trim() } : {}),
    ...(normalizeOptionalString(input.avatarUrl) ? { avatar_url: input.avatarUrl.trim() } : {}),
    ...(embeds.length ? { embeds } : {}),
    allowed_mentions: buildAllowedMentions(input),
  };
}

export default function DiscordWebhookBuilder() {
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [threadId, setThreadId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [content, setContent] = useState<string>(SAMPLE_CONTENT);
  const [embed, setEmbed] = useState<EmbedInputState>(SAMPLE_EMBED);
  const [allowUsers, setAllowUsers] = useState<boolean>(false);
  const [allowRoles, setAllowRoles] = useState<boolean>(false);
  const [allowEveryone, setAllowEveryone] = useState<boolean>(false);
  const [responseState, setResponseState] = useState<WebhookResponseState | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  const webhookUrlValid = useMemo(() => isValidWebhookUrl(webhookUrl), [webhookUrl]);
  const avatarUrlValid = useMemo(
    () => !avatarUrl.trim() || isValidHttpUrl(avatarUrl.trim()),
    [avatarUrl],
  );
  const embedUrlValid = useMemo(
    () => !embed.url.trim() || isValidHttpUrl(embed.url.trim()),
    [embed.url],
  );

  const payload = useMemo(
    () =>
      buildPayload({
        allowEveryone,
        allowRoles,
        allowUsers,
        avatarUrl,
        content,
        embed,
        username,
      }),
    [allowEveryone, allowRoles, allowUsers, avatarUrl, content, embed, username],
  );

  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const embedPreview = payload.embeds?.[0] ?? null;
  const hasMessageBody = Boolean(payload.content || payload.embeds?.length);

  const handleSend = async (): Promise<void> => {
    if (!webhookUrlValid) {
      toast.error("Enter a valid Discord webhook URL.");
      return;
    }

    if (!avatarUrlValid) {
      toast.error("Avatar URL must be a valid http or https URL.");
      return;
    }

    if (!embedUrlValid) {
      toast.error("Embed URL must be a valid http or https URL.");
      return;
    }

    if (!hasMessageBody) {
      toast.error("Add content or an embed before sending.");
      return;
    }

    try {
      setIsSending(true);
      setResponseState(null);

      const targetUrl = new URL(webhookUrl.trim());
      targetUrl.searchParams.set("wait", "true");

      if (threadId.trim()) {
        targetUrl.searchParams.set("thread_id", threadId.trim());
      }

      const response = await fetch(targetUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payloadJson,
      });

      const bodyText = await response.text();

      if (!response.ok) {
        setResponseState({
          ok: false,
          status: response.status,
          body: bodyText || "Discord did not return a response body.",
        });
        toast.error(`Webhook send failed (${response.status}).`);
        return;
      }

      let messageId: string | null = null;

      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText) as { id?: string };
          messageId = parsed.id ?? null;
        } catch {
          messageId = null;
        }
      }

      setResponseState({
        ok: true,
        status: response.status,
        body: bodyText || "Webhook accepted the request.",
        messageId,
      });
      toast.success("Webhook message sent.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Request failed before Discord responded.";
      setResponseState({
        ok: false,
        status: 0,
        body: message,
      });
      toast.error("Webhook request failed.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Design & Creative
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">Discord Webhook Builder</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Compose webhook payloads, preview a rich embed, and send a test message directly to
              Discord from the browser.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <ToolActionButton onClick={() => setContent(SAMPLE_CONTENT)}>
                Load content sample
              </ToolActionButton>
              <ToolActionButton onClick={() => setEmbed(SAMPLE_EMBED)}>
                Load embed sample
              </ToolActionButton>
              <ToolActionButton
                onClick={() => {
                  setContent("");
                  setEmbed(EMPTY_EMBED);
                  setResponseState(null);
                }}
              >
                Clear message
              </ToolActionButton>
            </div>
          </div>

          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Sensitive input</p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-amber-100">
              <p>
                A Discord webhook URL is a credential. This tool keeps the pasted URL only in
                browser memory and does not save it anywhere.
              </p>
              <p>
                Refreshing the page clears the webhook URL, message draft, and the last response.
              </p>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Webhook settings</h2>

          <label className="mt-5 block text-sm font-medium text-slate-300">Webhook URL</label>
          <input
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            spellCheck={false}
            className={inputClass}
          />

          <div className="mt-2 text-xs text-slate-500">
            {webhookUrl
              ? webhookUrlValid
                ? "Valid Discord webhook URL."
                : "Enter a full Discord webhook URL."
              : "Paste the full Discord webhook URL."}
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Thread ID</label>
              <input
                value={threadId}
                onChange={(event) => setThreadId(event.target.value)}
                placeholder="Optional thread_id"
                spellCheck={false}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Username override</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Optional webhook display name"
                spellCheck={false}
                className={inputClass}
              />
            </div>
          </div>

          <label className="mt-5 block text-sm font-medium text-slate-300">Avatar URL</label>
          <input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://example.com/avatar.png"
            spellCheck={false}
            className={inputClass}
          />

          <div className="mt-2 text-xs text-slate-500">
            {avatarUrl && !avatarUrlValid ? "Avatar URL must start with http:// or https://." : "Optional override for the webhook avatar."}
          </div>

          <label className="mt-5 block text-sm font-medium text-slate-300">Content</label>
          <ToolTextarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            spellCheck={false}
          />

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Allowed mentions</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Default is locked down. Enable only the mention types you actually want Discord to
                parse.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  checked: allowUsers,
                  label: "Users",
                  onChange: setAllowUsers,
                },
                {
                  checked: allowRoles,
                  label: "Roles",
                  onChange: setAllowRoles,
                },
                {
                  checked: allowEveryone,
                  label: "@everyone",
                  onChange: setAllowEveryone,
                },
              ].map((option) => (
                <label
                  key={option.label}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(event) => option.onChange(event.target.checked)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Embed preview</h2>
          <p className="mt-2 text-sm text-slate-400">
            One rich embed is enough for a solid v1. Empty embed fields are omitted from the
            payload.
          </p>

          <div className="mt-5 grid gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-300">Embed title</label>
              <input
                value={embed.title}
                onChange={(event) => setEmbed((current) => ({ ...current, title: event.target.value }))}
                placeholder="Optional embed title"
                spellCheck={false}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Embed URL</label>
              <input
                value={embed.url}
                onChange={(event) => setEmbed((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://example.com"
                spellCheck={false}
                className={inputClass}
              />
              <div className="mt-2 text-xs text-slate-500">
                {embed.url && !embedUrlValid ? "Embed URL must start with http:// or https://." : "Optional link target for the embed title."}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Embed description</label>
              <ToolTextarea
                value={embed.description}
                onChange={(event) =>
                  setEmbed((current) => ({ ...current, description: event.target.value }))
                }
                rows={8}
                spellCheck={false}
                className="mt-3"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
              <div>
                <label className="block text-sm font-medium text-slate-300">Color</label>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
                  <input
                    type="color"
                    value={/^#?[0-9a-f]{6}$/i.test(embed.color) ? (embed.color.startsWith("#") ? embed.color : `#${embed.color}`) : "#5865f2"}
                    onChange={(event) =>
                      setEmbed((current) => ({ ...current, color: event.target.value }))
                    }
                    className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
                  />
                  <input
                    value={embed.color}
                    onChange={(event) =>
                      setEmbed((current) => ({ ...current, color: event.target.value }))
                    }
                    placeholder="#5865f2"
                    spellCheck={false}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Footer text</label>
                <input
                  value={embed.footer}
                  onChange={(event) => setEmbed((current) => ({ ...current, footer: event.target.value }))}
                  placeholder="Optional footer"
                  spellCheck={false}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#313338] px-4 py-4">
            <div className="whitespace-pre-wrap text-sm text-slate-100">
              {payload.content || <span className="text-slate-500">Message content preview.</span>}
            </div>

            {embedPreview ? (
              <div
                className="mt-4 rounded-md border border-slate-800 bg-[#2b2d31] p-4"
                style={{
                  borderLeftColor: `#${(embedPreview.color ?? 0x5865f2).toString(16).padStart(6, "0")}`,
                  borderLeftWidth: "4px",
                }}
              >
                {embedPreview.title ? (
                  <div className="text-sm font-semibold text-slate-100">{embedPreview.title}</div>
                ) : null}
                {embedPreview.description ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                    {embedPreview.description}
                  </div>
                ) : null}
                {embedPreview.url ? (
                  <div className="mt-3 text-xs text-cyan-300">{embedPreview.url}</div>
                ) : null}
                {embedPreview.footer?.text ? (
                  <div className="mt-3 text-xs text-slate-400">{embedPreview.footer.text}</div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-slate-800 bg-[#2b2d31] px-4 py-4 text-sm text-slate-500">
                Add embed fields to preview the rich card.
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Payload JSON</h2>
              <p className="mt-2 text-sm text-slate-400">
                This is the exact JSON body sent to Discord.
              </p>
            </div>
            <CopyButton label="Payload JSON" value={payloadJson} />
          </div>

          <ToolTextarea readOnly value={payloadJson} rows={18} spellCheck={false} />
        </section>

        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Send test message</h2>
              <p className="mt-2 text-sm text-slate-400">
                Uses the pasted webhook URL directly with `wait=true` so the page can show the
                response.
              </p>
            </div>
            <ToolActionButton onClick={handleSend} disabled={isSending}>
              {isSending ? "Sending..." : "Send webhook"}
            </ToolActionButton>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Webhook URL</div>
              <div className="mt-2 text-sm font-medium text-white">
                {webhookUrlValid ? "Ready" : "Missing or invalid"}
              </div>
            </div>
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Payload</div>
              <div className="mt-2 text-sm font-medium text-white">
                {hasMessageBody ? "Ready to send" : "Add content or embed"}
              </div>
            </div>
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Mentions</div>
              <div className="mt-2 text-sm font-medium text-white">
                {payload.allowed_mentions.parse.length
                  ? payload.allowed_mentions.parse.join(", ")
                  : "Disabled"}
              </div>
            </div>
          </div>

          <div
            className={`mt-5 rounded-2xl border px-4 py-4 text-sm ${
              responseState
                ? responseState.ok
                  ? "border-emerald-800 bg-emerald-950/20 text-emerald-100"
                  : "border-rose-800 bg-rose-950/20 text-rose-100"
                : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            {!responseState ? (
              "Webhook response details will appear here after a send attempt."
            ) : responseState.ok ? (
              <div className="space-y-2">
                <div>Status {responseState.status}</div>
                {responseState.messageId ? <div>Message ID {responseState.messageId}</div> : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div>Status {responseState.status || "request failed"}</div>
                <div>{responseState.body}</div>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Raw response</div>
            <div className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200">
              {responseState?.body || "No response captured yet."}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
