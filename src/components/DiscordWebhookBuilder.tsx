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
  id: string;
  title: string;
  url: string;
};

type ButtonInputState = {
  id: string;
  label: string;
  url: string;
};

type ActionRowState = {
  buttons: ButtonInputState[];
  id: string;
};

type CleanEmbed = {
  color?: number;
  description?: string;
  footer?: { text: string };
  title?: string;
  url?: string;
};

type CleanButton = {
  label: string;
  style: 5;
  type: 2;
  url: string;
};

type BuiltPayload = {
  allowed_mentions: {
    parse: string[];
  };
  avatar_url?: string;
  components?: Array<{
    components: CleanButton[];
    type: 1;
  }>;
  content?: string;
  embeds?: CleanEmbed[];
  username?: string;
};

const MAX_EMBEDS = 10;
const MAX_ACTION_ROWS = 5;
const MAX_BUTTONS_PER_ROW = 5;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmbed(overrides: Partial<Omit<EmbedInputState, "id">> = {}): EmbedInputState {
  return {
    id: createId("embed"),
    title: "",
    description: "",
    url: "",
    footer: "",
    color: "#5865f2",
    ...overrides,
  };
}

function createButton(overrides: Partial<Omit<ButtonInputState, "id">> = {}): ButtonInputState {
  return {
    id: createId("button"),
    label: "",
    url: "",
    ...overrides,
  };
}

function createActionRow(buttons: ButtonInputState[] = [createButton()]): ActionRowState {
  return {
    id: createId("row"),
    buttons,
  };
}

const SAMPLE_CONTENT =
  "Hey, welcome to dchu096.tk.\nUse the buttons below to open the site and get support.";
const SAMPLE_EMBEDS = [
  createEmbed({
    color: "#5865f2",
    description:
      "Utility pages for timestamps, validators, encoding, and security work. Everything here runs in the browser.",
    title: "What is this?",
    url: "https://dchu096.tk/",
  }),
  createEmbed({
    color: "#22c55e",
    description:
      "Open the site, try the SSH key generator, and use the security tools when you need JWK or PEM conversions.",
    footer: "dchu096.tk webhook builder",
    title: "Get started",
    url: "https://dchu096.tk/encoding/ssh-key/",
  }),
];
const SAMPLE_ROWS = [
  createActionRow([
    createButton({
      label: "Open site",
      url: "https://dchu096.tk/",
    }),
    createButton({
      label: "SSH keys",
      url: "https://dchu096.tk/encoding/ssh-key/",
    }),
  ]),
];

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

  if (!trimmed) {
    return undefined;
  }

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
  embeds: EmbedInputState[];
  rows: ActionRowState[];
  username: string;
}): BuiltPayload {
  const embeds = input.embeds
    .map((embed) => ({
      title: normalizeOptionalString(embed.title),
      description: normalizeOptionalString(embed.description),
      url: normalizeOptionalString(embed.url),
      footer: normalizeOptionalString(embed.footer),
      color: parseEmbedColor(embed.color),
    }))
    .filter((embed) => embed.title || embed.description || embed.url || embed.footer || embed.color)
    .map((embed) => ({
      ...(embed.title ? { title: embed.title } : {}),
      ...(embed.description ? { description: embed.description } : {}),
      ...(embed.url ? { url: embed.url } : {}),
      ...(embed.color !== undefined ? { color: embed.color } : {}),
      ...(embed.footer ? { footer: { text: embed.footer } } : {}),
    }));

  const components = input.rows
    .map((row) => ({
      type: 1 as const,
      components: row.buttons
        .map((button) => ({
          label: normalizeOptionalString(button.label),
          url: normalizeOptionalString(button.url),
        }))
        .filter((button) => button.label && button.url && isValidHttpUrl(button.url))
        .map(
          (button) =>
            ({
              type: 2 as const,
              style: 5 as const,
              label: button.label!,
              url: button.url!,
            }) satisfies CleanButton,
        ),
    }))
    .filter((row) => row.components.length);

  return {
    ...(normalizeOptionalString(input.content) ? { content: input.content.trim() } : {}),
    ...(normalizeOptionalString(input.username) ? { username: input.username.trim() } : {}),
    ...(normalizeOptionalString(input.avatarUrl) ? { avatar_url: input.avatarUrl.trim() } : {}),
    ...(embeds.length ? { embeds } : {}),
    ...(components.length ? { components } : {}),
    allowed_mentions: buildAllowedMentions(input),
  };
}

function getButtonValidationIssues(rows: ActionRowState[]): string[] {
  const issues: string[] = [];

  rows.forEach((row, rowIndex) => {
    row.buttons.forEach((button, buttonIndex) => {
      const hasLabel = Boolean(button.label.trim());
      const hasUrl = Boolean(button.url.trim());

      if (!hasLabel && !hasUrl) {
        return;
      }

      if (!hasLabel || !hasUrl) {
        issues.push(`Row ${rowIndex + 1}, button ${buttonIndex + 1} needs both label and URL.`);
        return;
      }

      if (!isValidHttpUrl(button.url.trim())) {
        issues.push(`Row ${rowIndex + 1}, button ${buttonIndex + 1} has an invalid URL.`);
      }
    });
  });

  return issues;
}

function getEmbedValidationIssues(embeds: EmbedInputState[]): string[] {
  const issues: string[] = [];

  embeds.forEach((embed, index) => {
    if (embed.url.trim() && !isValidHttpUrl(embed.url.trim())) {
      issues.push(`Embed ${index + 1} has an invalid URL.`);
    }

    if (embed.color.trim() && parseEmbedColor(embed.color) === undefined) {
      issues.push(`Embed ${index + 1} has an invalid color value.`);
    }
  });

  return issues;
}

function getButtonPreviewClass(index: number): string {
  const variants = [
    "bg-[#5865f2] text-white hover:bg-[#4752c4]",
    "bg-[#4f545c] text-white hover:bg-[#686d73]",
    "bg-[#248046] text-white hover:bg-[#1f6b3c]",
    "bg-[#da373c] text-white hover:bg-[#b92d31]",
  ];

  return variants[index % variants.length];
}

export default function DiscordWebhookBuilder() {
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [threadId, setThreadId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [content, setContent] = useState<string>(SAMPLE_CONTENT);
  const [embeds, setEmbeds] = useState<EmbedInputState[]>(SAMPLE_EMBEDS);
  const [rows, setRows] = useState<ActionRowState[]>(SAMPLE_ROWS);
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
  const embedIssues = useMemo(() => getEmbedValidationIssues(embeds), [embeds]);
  const buttonIssues = useMemo(() => getButtonValidationIssues(rows), [rows]);

  const payload = useMemo(
    () =>
      buildPayload({
        allowEveryone,
        allowRoles,
        allowUsers,
        avatarUrl,
        content,
        embeds,
        rows,
        username,
      }),
    [allowEveryone, allowRoles, allowUsers, avatarUrl, content, embeds, rows, username],
  );

  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const hasMessageBody = Boolean(
    payload.content || payload.embeds?.length || payload.components?.length,
  );
  const previewEmbeds = payload.embeds ?? [];
  const previewRows = payload.components ?? [];
  const totalButtons = rows.reduce((count, row) => count + row.buttons.length, 0);
  const validationIssues = [...embedIssues, ...buttonIssues];

  const updateEmbed = (
    embedId: string,
    field: keyof Omit<EmbedInputState, "id">,
    value: string,
  ): void => {
    setEmbeds((current) =>
      current.map((embed) => (embed.id === embedId ? { ...embed, [field]: value } : embed)),
    );
  };

  const updateButton = (
    rowId: string,
    buttonId: string,
    field: keyof Omit<ButtonInputState, "id">,
    value: string,
  ): void => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              buttons: row.buttons.map((button) =>
                button.id === buttonId ? { ...button, [field]: value } : button,
              ),
            }
          : row,
      ),
    );
  };

  const handleSend = async (): Promise<void> => {
    if (!webhookUrlValid) {
      toast.error("Enter a valid Discord webhook URL.");
      return;
    }

    if (!avatarUrlValid) {
      toast.error("Avatar URL must be a valid http or https URL.");
      return;
    }

    if (validationIssues.length) {
      toast.error(validationIssues[0]);
      return;
    }

    if (!hasMessageBody) {
      toast.error("Add content, embeds, or buttons before sending.");
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

      if (payload.components?.length) {
        targetUrl.searchParams.set("with_components", "true");
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
              Build webhook messages with structured content, multiple embeds, and link buttons,
              then send the payload directly to Discord from the browser.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <ToolActionButton
                onClick={() => {
                  setContent(SAMPLE_CONTENT);
                  setEmbeds(SAMPLE_EMBEDS.map((embed) => createEmbed(embed)));
                  setRows(
                    SAMPLE_ROWS.map((row) =>
                      createActionRow(
                        row.buttons.map((button) =>
                          createButton({ label: button.label, url: button.url }),
                        ),
                      ),
                    ),
                  );
                  setResponseState(null);
                }}
              >
                Load layout sample
              </ToolActionButton>
              <ToolActionButton
                onClick={() => {
                  setContent("");
                  setEmbeds([createEmbed()]);
                  setRows([createActionRow()]);
                  setResponseState(null);
                }}
              >
                Clear editor
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
                Refreshing the page clears the webhook URL, editor state, and the last response.
              </p>
              <p>Webhook-safe components in this builder are limited to link buttons.</p>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className="grid gap-4">
          <details open className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Webhook settings</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    URL, thread target, and display overrides.
                  </p>
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Config</div>
              </div>
            </summary>

            <div className="mt-5">
              <label className="block text-sm font-medium text-slate-300">Webhook URL</label>
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
                  <label className="block text-sm font-medium text-slate-300">
                    Username override
                  </label>
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
                {avatarUrl && !avatarUrlValid
                  ? "Avatar URL must start with http:// or https://."
                  : "Optional override for the webhook avatar."}
              </div>
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Message</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Main content and mention parsing rules.
                  </p>
                </div>
                <div className="font-mono text-xs text-slate-500">{content.length}/2000</div>
              </div>
            </summary>

            <div className="mt-5">
              <ToolTextarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={8}
                spellCheck={false}
                className="mt-0"
              />

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Allowed mentions</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Default is locked down. Enable only what Discord should parse.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { checked: allowUsers, label: "Users", onChange: setAllowUsers },
                    { checked: allowRoles, label: "Roles", onChange: setAllowRoles },
                    { checked: allowEveryone, label: "@everyone", onChange: setAllowEveryone },
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
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Embeds</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Add up to {MAX_EMBEDS} rich embeds to the payload.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    {embeds.length} configured
                  </div>
                  <ToolActionButton
                    onClick={(event) => {
                      event.preventDefault();

                      if (embeds.length >= MAX_EMBEDS) {
                        toast.error(`Discord allows up to ${MAX_EMBEDS} embeds.`);
                        return;
                      }

                      setEmbeds((current) => [...current, createEmbed()]);
                    }}
                  >
                    Add embed
                  </ToolActionButton>
                </div>
              </div>
            </summary>

            <div className="mt-5 grid gap-4">
              {embeds.map((embed, index) => (
                <div key={embed.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Embed {index + 1}
                        {embed.title.trim() ? ` - ${embed.title.trim()}` : ""}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">Title, description, color, footer, and optional URL.</p>
                    </div>
                    <div className="flex gap-2">
                      <ToolActionButton
                        onClick={() => setEmbeds((current) => [...current, createEmbed({ ...embed, title: embed.title, description: embed.description, footer: embed.footer, url: embed.url, color: embed.color })])}
                        disabled={embeds.length >= MAX_EMBEDS}
                        className="px-3 py-2 text-xs"
                      >
                        Duplicate
                      </ToolActionButton>
                      <ToolActionButton
                        onClick={() =>
                          setEmbeds((current) =>
                            current.length === 1 ? [createEmbed()] : current.filter((entry) => entry.id !== embed.id),
                          )
                        }
                        className="px-3 py-2 text-xs"
                      >
                        Remove
                      </ToolActionButton>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Title</label>
                      <input
                        value={embed.title}
                        onChange={(event) => updateEmbed(embed.id, "title", event.target.value)}
                        placeholder="Optional embed title"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300">URL</label>
                      <input
                        value={embed.url}
                        onChange={(event) => updateEmbed(embed.id, "url", event.target.value)}
                        placeholder="https://example.com"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300">Description</label>
                    <ToolTextarea
                      value={embed.description}
                      onChange={(event) => updateEmbed(embed.id, "description", event.target.value)}
                      rows={5}
                      spellCheck={false}
                      className="mt-3"
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Color</label>
                      <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
                        <input
                          type="color"
                          value={
                            /^#?[0-9a-f]{6}$/i.test(embed.color)
                              ? embed.color.startsWith("#")
                                ? embed.color
                                : `#${embed.color}`
                              : "#5865f2"
                          }
                          onChange={(event) => updateEmbed(embed.id, "color", event.target.value)}
                          className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
                        />
                        <input
                          value={embed.color}
                          onChange={(event) => updateEmbed(embed.id, "color", event.target.value)}
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
                        onChange={(event) => updateEmbed(embed.id, "footer", event.target.value)}
                        placeholder="Optional footer"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Buttons</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Link buttons only. Each row supports up to {MAX_BUTTONS_PER_ROW} buttons.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    {rows.length} rows
                  </div>
                  <ToolActionButton
                    onClick={(event) => {
                      event.preventDefault();

                      if (rows.length >= MAX_ACTION_ROWS) {
                        toast.error(`Discord allows up to ${MAX_ACTION_ROWS} action rows.`);
                        return;
                      }

                      setRows((current) => [...current, createActionRow()]);
                    }}
                  >
                    Add row
                  </ToolActionButton>
                </div>
              </div>
            </summary>

            <div className="mt-5 grid gap-4">
              {rows.map((row, rowIndex) => (
                <div key={row.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Row {rowIndex + 1}</h3>
                      <p className="mt-1 text-xs text-slate-500">{row.buttons.length} buttons configured</p>
                    </div>
                    <div className="flex gap-2">
                      <ToolActionButton
                        onClick={() => {
                          if (row.buttons.length >= MAX_BUTTONS_PER_ROW) {
                            toast.error(`Each row allows up to ${MAX_BUTTONS_PER_ROW} buttons.`);
                            return;
                          }

                          setRows((current) =>
                            current.map((entry) =>
                              entry.id === row.id
                                ? { ...entry, buttons: [...entry.buttons, createButton()] }
                                : entry,
                            ),
                          );
                        }}
                        className="px-3 py-2 text-xs"
                      >
                        Add button
                      </ToolActionButton>
                      <ToolActionButton
                        onClick={() =>
                          setRows((current) =>
                            current.length === 1 ? [createActionRow()] : current.filter((entry) => entry.id !== row.id),
                          )
                        }
                        className="px-3 py-2 text-xs"
                      >
                        Remove row
                      </ToolActionButton>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {row.buttons.map((button, buttonIndex) => (
                      <div key={button.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm font-medium text-white">Button {buttonIndex + 1}</div>
                          <ToolActionButton
                            onClick={() =>
                              setRows((current) =>
                                current.map((entry) =>
                                  entry.id === row.id
                                    ? {
                                        ...entry,
                                        buttons:
                                          entry.buttons.length === 1
                                            ? [createButton()]
                                            : entry.buttons.filter((item) => item.id !== button.id),
                                      }
                                    : entry,
                                ),
                              )
                            }
                            className="px-3 py-2 text-xs"
                          >
                            Remove
                          </ToolActionButton>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-300">Label</label>
                            <input
                              value={button.label}
                              onChange={(event) =>
                                updateButton(row.id, button.id, "label", event.target.value)
                              }
                              placeholder="Support server"
                              spellCheck={false}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300">URL</label>
                            <input
                              value={button.url}
                              onChange={(event) =>
                                updateButton(row.id, button.id, "url", event.target.value)
                              }
                              placeholder="https://example.com"
                              spellCheck={false}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>

        <section className="grid gap-4">
          <section className={`${primaryPanelClass} sticky top-24 self-start`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Preview</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Structured preview for the content, embeds, and link buttons.
                </p>
              </div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Discord</div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-slate-800 bg-[#313338] px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865f2] text-sm font-semibold text-white">
                    {(username.trim() || "W").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">
                      {username.trim() || "Webhook"}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">
                      {payload.content || <span className="text-slate-500">Message content preview.</span>}
                    </div>

                    {previewEmbeds.length ? (
                      <div className="mt-4 grid gap-3">
                        {previewEmbeds.map((embed, index) => (
                          <div
                            key={`${embed.title ?? "embed"}-${index}`}
                            className="rounded-md border border-slate-800 bg-[#2b2d31] p-4"
                            style={{
                              borderLeftColor: `#${(embed.color ?? 0x5865f2)
                                .toString(16)
                                .padStart(6, "0")}`,
                              borderLeftWidth: "4px",
                            }}
                          >
                            {embed.title ? (
                              <div className="text-sm font-semibold text-slate-100">{embed.title}</div>
                            ) : null}
                            {embed.description ? (
                              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                                {embed.description}
                              </div>
                            ) : null}
                            {embed.url ? (
                              <div className="mt-3 break-all text-xs text-cyan-300">{embed.url}</div>
                            ) : null}
                            {embed.footer?.text ? (
                              <div className="mt-3 text-xs text-slate-400">{embed.footer.text}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {previewRows.length ? (
                      <div className="mt-4 grid gap-2">
                        {previewRows.map((row, rowIndex) => (
                          <div key={rowIndex} className="flex flex-wrap gap-2">
                            {row.components.map((button, buttonIndex) => (
                              <a
                                key={`${button.label}-${buttonIndex}`}
                                href={button.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex min-h-9 items-center rounded-md px-4 py-2 text-sm font-medium transition ${getButtonPreviewClass(
                                  buttonIndex,
                                )}`}
                              >
                                {button.label}
                              </a>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Embeds</div>
                  <div className="mt-2 text-lg font-semibold text-white">{previewEmbeds.length}</div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Rows</div>
                  <div className="mt-2 text-lg font-semibold text-white">{previewRows.length}</div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Buttons</div>
                  <div className="mt-2 text-lg font-semibold text-white">{totalButtons}</div>
                </div>
              </div>

              {validationIssues.length ? (
                <div className="rounded-2xl border border-rose-800 bg-rose-950/20 px-4 py-4 text-sm text-rose-100">
                  <div className="font-medium">Validation issues</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {validationIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 px-4 py-4 text-sm text-emerald-100">
                  Payload is structurally ready to send.
                </div>
              )}
            </div>
          </section>
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

          <ToolTextarea readOnly value={payloadJson} rows={20} spellCheck={false} />
        </section>

        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Send test message</h2>
              <p className="mt-2 text-sm text-slate-400">
                Uses the pasted webhook URL directly with `wait=true`, and adds
                `with_components=true` when link buttons are present.
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
                {hasMessageBody ? "Ready to send" : "Add content, embeds, or buttons"}
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
