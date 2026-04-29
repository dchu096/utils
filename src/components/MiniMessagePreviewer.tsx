import { useMemo, useState } from "react";
import Obfuscator from "./Obfuscator";
import {
  OutputCard,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  primaryPanelClass,
} from "./ToolPrimitives";
import { buildPreviewHtml } from "../utils/motd";

const MINIMESSAGE_EXAMPLES = [
  {
    label: "Welcome banner",
    value:
      "<gradient:#5eead4:#60a5fa><bold>dchu096.tk</bold></gradient>\n<gray>MiniMessage preview with gradients and nested styles</gray>",
  },
  {
    label: "Server status",
    value:
      "<green><bold>Online</bold></green> <gray>-</gray> <yellow>128 players</yellow>\n<rainbow>Weekend event live now</rainbow>",
  },
  {
    label: "Formatting mix",
    value:
      "<gold><bold>Quest Board</bold></gold>\n<white>Use <underline>/warp market</underline> for trades and <italic>rare drops</italic>.</white>",
  },
];

const SUPPORTED_TAGS = [
  { label: "Color", value: "<red>text</red> or <#60a5fa>text</#60a5fa>" },
  { label: "Gradient", value: "<gradient:#5eead4:#60a5fa>text</gradient>" },
  { label: "Rainbow", value: "<rainbow>text</rainbow>" },
  { label: "Bold", value: "<bold>text</bold>" },
  { label: "Italic", value: "<italic>text</italic>" },
  { label: "Underline", value: "<underline>text</underline>" },
  { label: "Strikethrough", value: "<strikethrough>text</strikethrough>" },
  { label: "Obfuscated", value: "<obfuscated>text</obfuscated>" },
  { label: "Reset", value: "<reset>" },
];

function stripMiniMessageTags(value: string): string {
  return value.replaceAll(/<\/?[a-z0-9_#!]+(?::[^>]+)?>/gi, "");
}

function getStats(value: string): { lines: number; tags: number; words: number } {
  const trimmed = value.trim();

  if (!trimmed) {
    return { lines: 0, tags: 0, words: 0 };
  }

  return {
    lines: value.split("\n").length,
    tags: (value.match(/<\/?[a-z0-9_#!]+(?::[^>]+)?>/gi) ?? []).length,
    words: stripMiniMessageTags(value)
      .trim()
      .split(/\s+/)
      .filter(Boolean).length,
  };
}

export default function MiniMessagePreviewer() {
  const [input, setInput] = useState<string>(MINIMESSAGE_EXAMPLES[0].value);

  const previewHtml = useMemo(() => buildPreviewHtml(input, false), [input]);
  const plainText = useMemo(() => stripMiniMessageTags(input), [input]);
  const stats = useMemo(() => getStats(input), [input]);

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Minecraft</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">MiniMessage Previewer</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Preview MiniMessage formatting locally, check the rendered output, and inspect the
              generated HTML before you paste tags into chat, MOTDs, or plugin config.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {MINIMESSAGE_EXAMPLES.map((example) => (
                <ToolActionButton key={example.label} onClick={() => setInput(example.value)}>
                  {example.label}
                </ToolActionButton>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Document stats</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Lines</div>
                <div className="mt-2 text-lg font-semibold text-white">{stats.lines}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Words</div>
                <div className="mt-2 text-lg font-semibold text-white">{stats.words}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Tags</div>
                <div className="mt-2 text-lg font-semibold text-white">{stats.tags}</div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">MiniMessage input</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use MiniMessage tags directly. Unsupported tags are treated as plain text.
              </p>
            </div>
            <ToolActionButton onClick={() => setInput("")}>Clear</ToolActionButton>
          </div>

          <ToolTextarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={18}
            spellCheck={false}
          />

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm font-semibold text-white">Supported tags</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {SUPPORTED_TAGS.map((tag) => (
                <div key={tag.label} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <div className="text-sm font-medium text-white">{tag.label}</div>
                  <div className="mt-2 font-mono text-xs leading-5 text-slate-400">{tag.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Rendered preview</h2>
          <p className="mt-2 text-sm text-slate-400">
            This uses the same local renderer as the MOTD preview, including animated obfuscated
            text.
          </p>

          <div className="mt-5 min-h-[28rem] rounded-2xl border border-slate-800 bg-black/35 px-5 py-5 text-slate-100">
            {previewHtml ? (
              <Obfuscator html={previewHtml} />
            ) : (
              <p className="text-sm text-slate-500">Enter MiniMessage tags to render a preview.</p>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Plain text</div>
            <div className="mt-3 whitespace-pre-wrap font-mono text-sm text-slate-200">
              {plainText || "Plain text output will appear here."}
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <OutputCard
          label="Rendered HTML"
          description="HTML emitted by the local MiniMessage preview renderer."
          value={previewHtml}
        />
        <OutputCard
          label="Plain text"
          description="Input with MiniMessage tags removed for quick sanity checks."
          value={plainText}
        />
      </section>
    </div>
  );
}
