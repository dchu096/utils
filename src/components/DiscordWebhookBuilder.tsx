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

type EmbedFieldInputState = {
  id: string;
  inline: boolean;
  name: string;
  value: string;
};

type EmbedInputState = {
  authorIconUrl: string;
  authorName: string;
  authorUrl: string;
  color: string;
  description: string;
  fields: EmbedFieldInputState[];
  footerIconUrl: string;
  footerText: string;
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  timestampEnabled: boolean;
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

type CleanEmbedField = {
  inline?: boolean;
  name: string;
  value: string;
};

type CleanEmbed = {
  author?: {
    icon_url?: string;
    name: string;
    url?: string;
  };
  color?: number;
  description?: string;
  fields?: CleanEmbedField[];
  footer?: {
    icon_url?: string;
    text: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  timestamp?: string;
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
const MAX_FIELDS_PER_EMBED = 25;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createField(
  overrides: Partial<Omit<EmbedFieldInputState, "id">> = {},
): EmbedFieldInputState {
  return {
    id: createId("field"),
    name: "",
    value: "",
    inline: true,
    ...overrides,
  };
}

function createEmbed(overrides: Partial<Omit<EmbedInputState, "id" | "fields">> = {}): EmbedInputState {
  return {
    id: createId("embed"),
    title: "",
    description: "",
    url: "",
    color: "#5865f2",
    authorName: "",
    authorUrl: "",
    authorIconUrl: "",
    footerText: "",
    footerIconUrl: "",
    imageUrl: "",
    thumbnailUrl: "",
    timestampEnabled: false,
    fields: [],
    ...overrides,
  };
}

function cloneEmbed(embed: EmbedInputState): EmbedInputState {
  return {
    ...embed,
    id: createId("embed"),
    fields: embed.fields.map((field) => ({ ...field, id: createId("field") })),
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
    title: "What is this?",
    url: "https://dchu096.tk/",
    description:
      "Utility pages for timestamps, validators, encoding, and security work. Everything here runs in the browser.",
    fields: [
      createField({
        name: "SSH keys",
        value: "Generate ED25519, RSA, and ECDSA keys locally.",
      }),
      createField({
        name: "Validators",
        value: "Check YAML, JSON, and TOML input with readable output.",
      }),
    ],
  }),
  createEmbed({
    color: "#22c55e",
    title: "Get started",
    url: "https://dchu096.tk/encoding/ssh-key/",
    description:
      "Open the site, try the SSH key generator, and use the security tools when you need JWK or PEM conversions.",
    footerText: "dchu096.tk webhook builder",
    timestampEnabled: true,
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
    .map((embed) => {
      const authorName = normalizeOptionalString(embed.authorName);
      const authorUrl = normalizeOptionalString(embed.authorUrl);
      const authorIconUrl = normalizeOptionalString(embed.authorIconUrl);
      const footerText = normalizeOptionalString(embed.footerText);
      const footerIconUrl = normalizeOptionalString(embed.footerIconUrl);
      const imageUrl = normalizeOptionalString(embed.imageUrl);
      const thumbnailUrl = normalizeOptionalString(embed.thumbnailUrl);
      const title = normalizeOptionalString(embed.title);
      const description = normalizeOptionalString(embed.description);
      const url = normalizeOptionalString(embed.url);
      const color = parseEmbedColor(embed.color);
      const fields = embed.fields
        .map((field) => ({
          name: normalizeOptionalString(field.name),
          value: normalizeOptionalString(field.value),
          inline: field.inline,
        }))
        .filter((field) => field.name && field.value)
        .map((field) => ({
          name: field.name!,
          value: field.value!,
          ...(field.inline ? { inline: true } : {}),
        }));

      return {
        ...(authorName
          ? {
              author: {
                name: authorName,
                ...(authorUrl ? { url: authorUrl } : {}),
                ...(authorIconUrl ? { icon_url: authorIconUrl } : {}),
              },
            }
          : {}),
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(url ? { url } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(fields.length ? { fields } : {}),
        ...(thumbnailUrl ? { thumbnail: { url: thumbnailUrl } } : {}),
        ...(imageUrl ? { image: { url: imageUrl } } : {}),
        ...(footerText
          ? {
              footer: {
                text: footerText,
                ...(footerIconUrl ? { icon_url: footerIconUrl } : {}),
              },
            }
          : {}),
        ...(embed.timestampEnabled ? { timestamp: new Date().toISOString() } : {}),
      };
    })
    .filter((embed) => Object.keys(embed).length > 0);

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
    [
      { label: "title URL", value: embed.url },
      { label: "author URL", value: embed.authorUrl },
      { label: "author icon URL", value: embed.authorIconUrl },
      { label: "footer icon URL", value: embed.footerIconUrl },
      { label: "thumbnail URL", value: embed.thumbnailUrl },
      { label: "image URL", value: embed.imageUrl },
    ].forEach((entry) => {
      if (entry.value.trim() && !isValidHttpUrl(entry.value.trim())) {
        issues.push(`Embed ${index + 1} has an invalid ${entry.label}.`);
      }
    });

    if (embed.color.trim() && parseEmbedColor(embed.color) === undefined) {
      issues.push(`Embed ${index + 1} has an invalid color value.`);
    }

    embed.fields.forEach((field, fieldIndex) => {
      const hasName = Boolean(field.name.trim());
      const hasValue = Boolean(field.value.trim());

      if (!hasName && !hasValue) {
        return;
      }

      if (!hasName || !hasValue) {
        issues.push(`Embed ${index + 1}, field ${fieldIndex + 1} needs both name and value.`);
      }
    });
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
  const [activeEmbedId, setActiveEmbedId] = useState<string>(SAMPLE_EMBEDS[0]?.id ?? "");
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
  const activeEmbed = useMemo(
    () => embeds.find((embed) => embed.id === activeEmbedId) ?? embeds[0] ?? null,
    [activeEmbedId, embeds],
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

  const resetEditor = (withSample: boolean): void => {
    if (withSample) {
      const sampleEmbeds = SAMPLE_EMBEDS.map((embed) => cloneEmbed(embed));
      const sampleRows = SAMPLE_ROWS.map((row) =>
        createActionRow(
          row.buttons.map((button) => createButton({ label: button.label, url: button.url })),
        ),
      );
      setContent(SAMPLE_CONTENT);
      setEmbeds(sampleEmbeds);
      setActiveEmbedId(sampleEmbeds[0]?.id ?? "");
      setRows(sampleRows);
    } else {
      const emptyEmbed = createEmbed();
      setContent("");
      setEmbeds([emptyEmbed]);
      setActiveEmbedId(emptyEmbed.id);
      setRows([createActionRow()]);
    }

    setResponseState(null);
  };

  const updateEmbed = (
    embedId: string,
    field: keyof Omit<EmbedInputState, "id" | "fields">,
    value: string | boolean,
  ): void => {
    setEmbeds((current) =>
      current.map((embed) => (embed.id === embedId ? { ...embed, [field]: value } : embed)),
    );
  };

  const updateField = (
    embedId: string,
    fieldId: string,
    key: keyof Omit<EmbedFieldInputState, "id">,
    value: string | boolean,
  ): void => {
    setEmbeds((current) =>
      current.map((embed) =>
        embed.id === embedId
          ? {
              ...embed,
              fields: embed.fields.map((field) =>
                field.id === fieldId ? { ...field, [key]: value } : field,
              ),
            }
          : embed,
      ),
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
              Build webhook messages with structured content, embed fields, and link buttons, then
              send the payload directly to Discord from the browser.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <ToolActionButton onClick={() => resetEditor(true)}>Load layout sample</ToolActionButton>
              <ToolActionButton onClick={() => resetEditor(false)}>Clear editor</ToolActionButton>
            </div>
          </div>

          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-300">Sensitive input</p>
            <div className="mt-3 space-y-3 text-sm leading-6 text-amber-100">
              <p>
                A Discord webhook URL is a credential. This tool keeps the pasted URL only in
                browser memory and does not save it anywhere.
              </p>
              <p>Refreshing the page clears the webhook URL, editor state, and the last response.</p>
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

          <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Embeds</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Pick an embed to edit. The editor below only shows one active embed at a time.
                </p>
              </div>
              <ToolActionButton
                onClick={() => {
                  if (embeds.length >= MAX_EMBEDS) {
                    toast.error(`Discord allows up to ${MAX_EMBEDS} embeds.`);
                    return;
                  }

                  const nextEmbed = createEmbed();
                  setEmbeds((current) => [...current, nextEmbed]);
                  setActiveEmbedId(nextEmbed.id);
                }}
              >
                Add embed
              </ToolActionButton>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {embeds.map((embed, index) => {
                const fieldCount = embed.fields.filter(
                  (field) => field.name.trim() && field.value.trim(),
                ).length;

                return (
                  <button
                    key={embed.id}
                    type="button"
                    onClick={() => setActiveEmbedId(embed.id)}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      activeEmbed?.id === embed.id
                        ? "border-cyan-500/60 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Embed {index + 1}
                          {embed.title.trim() ? ` - ${embed.title.trim()}` : ""}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          {embed.description.trim() || "No description yet."}
                        </div>
                      </div>
                      <div
                        className="h-4 w-4 rounded-full border border-slate-700"
                        style={{
                          backgroundColor:
                            parseEmbedColor(embed.color) !== undefined
                              ? embed.color.startsWith("#")
                                ? embed.color
                                : `#${embed.color}`
                              : "#5865f2",
                        }}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      <span>{fieldCount} fields</span>
                      {embed.imageUrl.trim() ? <span>Image</span> : null}
                      {embed.thumbnailUrl.trim() ? <span>Thumbnail</span> : null}
                      {embed.footerText.trim() ? <span>Footer</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeEmbed ? (
              <div className="mt-5 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Editing {activeEmbed.title.trim() || "untitled embed"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Keep the editor focused on one embed at a time.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ToolActionButton
                      onClick={() => {
                        if (embeds.length >= MAX_EMBEDS) {
                          toast.error(`Discord allows up to ${MAX_EMBEDS} embeds.`);
                          return;
                        }

                        const nextEmbed = cloneEmbed(activeEmbed);
                        setEmbeds((current) => [...current, nextEmbed]);
                        setActiveEmbedId(nextEmbed.id);
                      }}
                      className="px-3 py-2 text-xs"
                    >
                      Duplicate
                    </ToolActionButton>
                    <ToolActionButton
                      onClick={() => {
                        if (embeds.length === 1) {
                          const nextEmbed = createEmbed();
                          setEmbeds([nextEmbed]);
                          setActiveEmbedId(nextEmbed.id);
                          return;
                        }

                        const remaining = embeds.filter((embed) => embed.id !== activeEmbed.id);
                        setEmbeds(remaining);
                        setActiveEmbedId(remaining[0]?.id ?? "");
                      }}
                      className="px-3 py-2 text-xs"
                    >
                      Remove
                    </ToolActionButton>
                  </div>
                </div>

                <details open className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-white">Body</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Title, URL, color, description
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-300">Title</label>
                        <input
                          value={activeEmbed.title}
                          onChange={(event) => updateEmbed(activeEmbed.id, "title", event.target.value)}
                          placeholder="Optional embed title"
                          spellCheck={false}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300">Title URL</label>
                        <input
                          value={activeEmbed.url}
                          onChange={(event) => updateEmbed(activeEmbed.id, "url", event.target.value)}
                          placeholder="https://example.com"
                          spellCheck={false}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">Description</label>
                      <ToolTextarea
                        value={activeEmbed.description}
                        onChange={(event) =>
                          updateEmbed(activeEmbed.id, "description", event.target.value)
                        }
                        rows={6}
                        spellCheck={false}
                        className="mt-3"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
                      <div>
                        <label className="block text-sm font-medium text-slate-300">Sidebar color</label>
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
                          <input
                            type="color"
                            value={
                              /^#?[0-9a-f]{6}$/i.test(activeEmbed.color)
                                ? activeEmbed.color.startsWith("#")
                                  ? activeEmbed.color
                                  : `#${activeEmbed.color}`
                                : "#5865f2"
                            }
                            onChange={(event) => updateEmbed(activeEmbed.id, "color", event.target.value)}
                            className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
                          />
                          <input
                            value={activeEmbed.color}
                            onChange={(event) => updateEmbed(activeEmbed.id, "color", event.target.value)}
                            placeholder="#5865f2"
                            spellCheck={false}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-slate-600"
                          />
                        </div>
                      </div>

                      <label className="mt-7 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={activeEmbed.timestampEnabled}
                          onChange={(event) =>
                            updateEmbed(activeEmbed.id, "timestampEnabled", event.target.checked)
                          }
                        />
                        Include current timestamp
                      </label>
                    </div>
                  </div>
                </details>

                <details className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-white">Author</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Optional author line
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-300">Name</label>
                        <input
                          value={activeEmbed.authorName}
                          onChange={(event) =>
                            updateEmbed(activeEmbed.id, "authorName", event.target.value)
                          }
                          placeholder="Optional author name"
                          spellCheck={false}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300">URL</label>
                        <input
                          value={activeEmbed.authorUrl}
                          onChange={(event) =>
                            updateEmbed(activeEmbed.id, "authorUrl", event.target.value)
                          }
                          placeholder="https://example.com"
                          spellCheck={false}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">Icon URL</label>
                      <input
                        value={activeEmbed.authorIconUrl}
                        onChange={(event) =>
                          updateEmbed(activeEmbed.id, "authorIconUrl", event.target.value)
                        }
                        placeholder="https://example.com/icon.png"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </details>

                <details open className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-white">Fields</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          {activeEmbed.fields.length} configured
                        </div>
                        <ToolActionButton
                          onClick={(event) => {
                            event.preventDefault();

                            if (activeEmbed.fields.length >= MAX_FIELDS_PER_EMBED) {
                              toast.error(`Discord allows up to ${MAX_FIELDS_PER_EMBED} fields per embed.`);
                              return;
                            }

                            setEmbeds((current) =>
                              current.map((embed) =>
                                embed.id === activeEmbed.id
                                  ? { ...embed, fields: [...embed.fields, createField()] }
                                  : embed,
                              ),
                            );
                          }}
                          className="px-3 py-2 text-xs"
                        >
                          Add field
                        </ToolActionButton>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-3">
                    {activeEmbed.fields.length === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-sm text-slate-400">
                        Add fields for compact key/value blocks inside the embed.
                      </div>
                    ) : (
                      activeEmbed.fields.map((field, index) => (
                        <div key={field.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm font-medium text-white">Field {index + 1}</div>
                            <ToolActionButton
                              onClick={() =>
                                setEmbeds((current) =>
                                  current.map((embed) =>
                                    embed.id === activeEmbed.id
                                      ? {
                                          ...embed,
                                          fields: embed.fields.filter((entry) => entry.id !== field.id),
                                        }
                                      : embed,
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
                              <label className="block text-sm font-medium text-slate-300">Name</label>
                              <input
                                value={field.name}
                                onChange={(event) =>
                                  updateField(activeEmbed.id, field.id, "name", event.target.value)
                                }
                                placeholder="Field label"
                                spellCheck={false}
                                className={inputClass}
                              />
                            </div>
                            <label className="mt-7 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                              <input
                                type="checkbox"
                                checked={field.inline}
                                onChange={(event) =>
                                  updateField(activeEmbed.id, field.id, "inline", event.target.checked)
                                }
                              />
                              Inline field
                            </label>
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-300">Value</label>
                            <ToolTextarea
                              value={field.value}
                              onChange={(event) =>
                                updateField(activeEmbed.id, field.id, "value", event.target.value)
                              }
                              rows={3}
                              spellCheck={false}
                              className="mt-3"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>

                <details className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-white">Images</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Thumbnail and large image
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Thumbnail URL</label>
                      <input
                        value={activeEmbed.thumbnailUrl}
                        onChange={(event) =>
                          updateEmbed(activeEmbed.id, "thumbnailUrl", event.target.value)
                        }
                        placeholder="https://example.com/thumb.png"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Large image URL</label>
                      <input
                        value={activeEmbed.imageUrl}
                        onChange={(event) => updateEmbed(activeEmbed.id, "imageUrl", event.target.value)}
                        placeholder="https://example.com/image.png"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </details>

                <details className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-white">Footer</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Optional footer text and icon
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Footer text</label>
                      <input
                        value={activeEmbed.footerText}
                        onChange={(event) =>
                          updateEmbed(activeEmbed.id, "footerText", event.target.value)
                        }
                        placeholder="Optional footer"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Footer icon URL</label>
                      <input
                        value={activeEmbed.footerIconUrl}
                        onChange={(event) =>
                          updateEmbed(activeEmbed.id, "footerIconUrl", event.target.value)
                        }
                        placeholder="https://example.com/footer-icon.png"
                        spellCheck={false}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </details>
              </div>
            ) : null}
          </section>

          <details className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Buttons</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Link buttons only. Each row supports up to {MAX_BUTTONS_PER_ROW} buttons.
                  </p>
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {rows.length} rows
                </div>
              </div>
            </summary>

            <div className="mt-5">
              <div className="mb-4 flex justify-end">
                <ToolActionButton
                  onClick={() => {
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

              <div className="grid gap-4">
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
                              current.length === 1
                                ? [createActionRow()]
                                : current.filter((entry) => entry.id !== row.id),
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
            </div>
          </details>
        </section>

        <section className="grid gap-4">
          <section className={`${primaryPanelClass} sticky top-24 self-start`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Preview</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Live message preview for content, embeds, fields, and buttons.
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
                            <div className="flex gap-4">
                              <div className="min-w-0 flex-1">
                                {embed.author?.name ? (
                                  <div className="mb-3 flex items-center gap-2 text-xs text-slate-300">
                                    {embed.author.icon_url ? (
                                      <img
                                        src={embed.author.icon_url}
                                        alt=""
                                        className="h-5 w-5 rounded-full object-cover"
                                      />
                                    ) : null}
                                    <span>{embed.author.name}</span>
                                  </div>
                                ) : null}

                                {embed.title ? (
                                  <div className="text-sm font-semibold text-slate-100">{embed.title}</div>
                                ) : null}
                                {embed.description ? (
                                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                                    {embed.description}
                                  </div>
                                ) : null}

                                {embed.fields?.length ? (
                                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    {embed.fields.map((field, fieldIndex) => (
                                      <div
                                        key={`${field.name}-${fieldIndex}`}
                                        className={field.inline ? "" : "sm:col-span-3"}
                                      >
                                        <div className="text-xs font-semibold text-slate-100">
                                          {field.name}
                                        </div>
                                        <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                                          {field.value}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}

                                {embed.image?.url ? (
                                  <img
                                    src={embed.image.url}
                                    alt=""
                                    className="mt-4 max-h-52 w-full rounded-md object-cover"
                                  />
                                ) : null}

                                {embed.footer?.text || embed.timestamp ? (
                                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                    {embed.footer?.icon_url ? (
                                      <img
                                        src={embed.footer.icon_url}
                                        alt=""
                                        className="h-5 w-5 rounded-full object-cover"
                                      />
                                    ) : null}
                                    {embed.footer?.text ? <span>{embed.footer.text}</span> : null}
                                    {embed.timestamp ? <span>{new Date(embed.timestamp).toLocaleString()}</span> : null}
                                  </div>
                                ) : null}
                              </div>

                              {embed.thumbnail?.url ? (
                                <img
                                  src={embed.thumbnail.url}
                                  alt=""
                                  className="h-20 w-20 rounded-md object-cover"
                                />
                              ) : null}
                            </div>

                            {embed.url ? (
                              <div className="mt-3 break-all text-xs text-cyan-300">{embed.url}</div>
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

      <details className={`${primaryPanelClass} open:pb-8`}>
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Advanced</h2>
              <p className="mt-1 text-sm text-slate-400">
                Raw payload JSON and send controls.
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Payload</div>
          </div>
        </summary>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Payload JSON</h3>
                <p className="mt-2 text-sm text-slate-400">
                  This is the exact JSON body sent to Discord.
                </p>
              </div>
              <CopyButton label="Payload JSON" value={payloadJson} />
            </div>

            <ToolTextarea readOnly value={payloadJson} rows={20} spellCheck={false} />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Send test message</h3>
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
                  : "border-slate-800 bg-slate-950 text-slate-400"
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

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Raw response</div>
              <div className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200">
                {responseState?.body || "No response captured yet."}
              </div>
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}
