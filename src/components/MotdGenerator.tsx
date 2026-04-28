import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Obfuscator from "./Obfuscator";
import {
  LEGACY_COLOR_OPTIONS,
  LEGACY_FORMAT_OPTIONS,
  buildBungeeOutput,
  buildCenteredText,
  buildLegacyOutput,
  buildMiniMessageOutput,
  buildPreviewHtml,
  buildServerListPlusOutput,
  containsMiniMessage,
} from "../utils/motd";

type OutputCard = {
  description: string;
  isDisabled?: boolean;
  label: string;
  multiline?: boolean;
  value: string;
};

const LEGACY_SAMPLE = "A Minecraft Server\n&4Here is another line";
const MINIMESSAGE_SAMPLE = "<gradient:#5eead4:#60a5fa><bold>dchu096.tk</bold></gradient>\n<gray>MiniMessage MOTD preview</gray>";

function OutputField({ description, isDisabled, label, multiline = false, value }: OutputCard) {
  const handleCopy = async (): Promise<void> => {
    if (!value || isDisabled) {
      toast.error("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Clipboard write failed.");
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={isDisabled}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy
        </button>
      </div>

      {multiline ? (
        <textarea
          readOnly
          value={value}
          rows={4}
          className="mt-4 w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 font-mono text-xs text-slate-200 outline-none"
        />
      ) : (
        <input
          readOnly
          value={value}
          className="mt-4 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 font-mono text-xs text-slate-200 outline-none"
        />
      )}
    </section>
  );
}

export default function MotdGenerator() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [motd, setMotd] = useState<string>(LEGACY_SAMPLE);
  const [centered, setCentered] = useState<boolean>(false);

  const isMiniMessageMode = useMemo(() => containsMiniMessage(motd), [motd]);
  const centeredText = useMemo(() => buildCenteredText(motd, centered), [motd, centered]);
  const previewHtml = useMemo(() => buildPreviewHtml(motd, centered), [motd, centered]);

  const outputs = useMemo<OutputCard[]>(() => {
    const miniMessageValue = buildMiniMessageOutput(centeredText);
    const legacyUnavailable = "MiniMessage input is not converted to legacy section codes automatically.";

    return [
      {
        label: "MiniMessage / Raw",
        description: "Use this when the server or proxy accepts MiniMessage directly.",
        multiline: true,
        value: miniMessageValue,
      },
      {
        label: "Vanilla",
        description: "Section-sign output for legacy config fields.",
        value: isMiniMessageMode ? legacyUnavailable : buildLegacyOutput(centeredText),
        isDisabled: isMiniMessageMode,
      },
      {
        label: "Spigot",
        description: "Same section-sign output used by most Bukkit-style configs.",
        value: isMiniMessageMode ? legacyUnavailable : buildLegacyOutput(centeredText),
        isDisabled: isMiniMessageMode,
      },
      {
        label: "BungeeCord",
        description: "Quoted string with escaped line breaks.",
        value: buildBungeeOutput(centeredText),
      },
      {
        label: "ServerListPlus",
        description: "Block scalar format for multi-line MOTDs.",
        multiline: true,
        value: buildServerListPlusOutput(centeredText),
      },
    ];
  }, [centeredText, isMiniMessageMode]);

  const insertLegacyCode = (code: string): void => {
    if (isMiniMessageMode) {
      toast.error("Legacy code buttons are disabled while MiniMessage tags are in use.");
      return;
    }

    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const nextValue =
      motd.slice(0, selectionStart) + `&${code}` + motd.slice(selectionEnd);

    setMotd(nextValue);

    window.setTimeout(() => {
      textarea.focus();
      const cursorPosition = selectionStart + 2;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Minecraft</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">MOTD Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Build server list MOTDs with legacy codes or MiniMessage tags, preview the result
              live, and copy outputs for the config format you actually need.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setMotd(LEGACY_SAMPLE)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Load legacy sample
              </button>
              <button
                type="button"
                onClick={() => setMotd(MINIMESSAGE_SAMPLE)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Load MiniMessage sample
              </button>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Preview</p>
                <p className="mt-1 text-sm font-medium text-slate-200">Minecraft server list</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>1.20.x</div>
                <div>0 ms</div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-2xl font-semibold text-emerald-300">
                M
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Server MOTD</p>
                <div className="mt-2 min-h-[6.5rem] overflow-hidden rounded-lg border border-slate-800 bg-black/40 px-4 py-4 text-slate-100">
                  <Obfuscator html={previewHtml} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Editor</h3>
              <p className="mt-2 text-sm text-slate-400">
                Centering now uses a tighter MOTD width and previews the exported leading spaces directly.
              </p>
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={centered}
                onChange={(event) => setCentered(event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950"
              />
              Center MOTD lines
            </label>
          </div>

          <textarea
            ref={textareaRef}
            id="motd-input"
            value={motd}
            onChange={(event) => setMotd(event.target.value)}
            rows={5}
            spellCheck="false"
            className="mt-5 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 font-mono text-sm text-slate-100 outline-none transition focus:border-slate-600"
          />

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Formatting</p>
                <p className="mt-1 text-xs text-slate-500">
                  Legacy buttons insert `&` codes at the cursor position.
                </p>
              </div>
              {isMiniMessageMode ? (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-amber-300">
                  MiniMessage mode
                </span>
              ) : (
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  Legacy mode
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {LEGACY_COLOR_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  title={`&${option.code} ${option.label}`}
                  onClick={() => insertLegacyCode(option.code)}
                  disabled={isMiniMessageMode}
                  className="h-7 w-7 rounded-full border border-white/10 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: option.color }}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {LEGACY_FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => insertLegacyCode(option.code)}
                  disabled={isMiniMessageMode}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {isMiniMessageMode ? (
              <p className="mt-4 text-xs leading-6 text-amber-200">
                MiniMessage tags were detected, so legacy insert buttons are disabled. The live
                preview still supports MiniMessage color, gradient, rainbow, bold, italic,
                underline, strikethrough, and obfuscated tags.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-white">Examples</h3>
          <div className="mt-4 grid gap-3">
            {[
              { label: "Clean legacy", value: "&aWelcome to the server\n&7Survival - Events - Shops" },
              { label: "Status line", value: "&6Season 4\n&eNow with quests and dungeons" },
              {
                label: "Gradient MiniMessage",
                value: "<gradient:#f97316:#ef4444><bold>Adventure Realm</bold></gradient>\n<gray>Fresh map - Weekly events</gray>",
              },
            ].map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => setMotd(example.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-left transition hover:border-slate-700 hover:bg-slate-800"
              >
                <div className="text-sm font-medium text-white">{example.label}</div>
                <div className="mt-2 whitespace-pre-wrap font-mono text-xs leading-5 text-slate-400">
                  {example.value}
                </div>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {outputs.map((output) => (
          <OutputField key={output.label} {...output} />
        ))}
      </section>
    </div>
  );
}
