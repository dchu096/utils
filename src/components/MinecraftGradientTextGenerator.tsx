import { useMemo, useState } from "react";
import {
  OutputCard,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type GradientStop = {
  color: string;
  id: string;
};

function createStop(color: string): GradientStop {
  return {
    color,
    id: `${color}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

const TEXT_PRESETS = [
  {
    label: "Server title",
    text: "Adventure Realm",
    colors: ["#22d3ee", "#6366f1", "#ec4899"],
  },
  {
    label: "Store banner",
    text: "Weekend Sale",
    colors: ["#f59e0b", "#ef4444"],
  },
  {
    label: "Network tag",
    text: "dchu096.tk",
    colors: ["#34d399", "#3b82f6"],
  },
];

function hexToRgb(color: string): { b: number; g: number; r: number } {
  const normalized = color.replace(/^#/, "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: { b: number; g: number; r: number }): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function interpolateColor(left: string, right: string, progress: number): string {
  const start = hexToRgb(left);
  const end = hexToRgb(right);

  return rgbToHex({
    r: start.r + (end.r - start.r) * progress,
    g: start.g + (end.g - start.g) * progress,
    b: start.b + (end.b - start.b) * progress,
  });
}

function getGradientPalette(colors: string[], length: number): string[] {
  if (length <= 1) {
    return [colors[0] ?? "#ffffff"];
  }

  const segments = Math.max(colors.length - 1, 1);

  return Array.from({ length }, (_, index) => {
    const overall = index / (length - 1);
    const segment = Math.min(Math.floor(overall * segments), segments - 1);
    const segmentStart = segment / segments;
    const segmentEnd = (segment + 1) / segments;
    const progress = segmentEnd === segmentStart ? 0 : (overall - segmentStart) / (segmentEnd - segmentStart);

    return interpolateColor(colors[segment], colors[segment + 1] ?? colors[segment], progress);
  });
}

function wrapMiniMessage(text: string, styles: Record<string, boolean>, colors: string[]): string {
  let output = text;

  if (colors.length >= 2) {
    output = `<gradient:${colors.join(":")}>${output}</gradient>`;
  }

  [
    ["bold", styles.bold],
    ["italic", styles.italic],
    ["underline", styles.underline],
    ["strikethrough", styles.strikethrough],
    ["obfuscated", styles.obfuscated],
  ].forEach(([tag, enabled]) => {
    if (enabled) {
      output = `<${tag}>${output}</${tag}>`;
    }
  });

  return output;
}

function buildLegacyHexOutput(
  text: string,
  palette: string[],
  formatPrefix: string,
  prefixCharacter: "&" | "\u00A7",
): string {
  let colorIndex = 0;

  return Array.from(text)
    .map((character) => {
      if (character === "\n") {
        return "\n";
      }

      const color = palette[colorIndex] ?? palette[palette.length - 1] ?? "#ffffff";
      colorIndex += 1;

      const hex = color.replace(/^#/, "").split("");
      const colorPrefix = `${prefixCharacter}x${hex.map((char) => `${prefixCharacter}${char}`).join("")}`;

      return `${colorPrefix}${formatPrefix}${character}`;
    })
    .join("");
}

export default function MinecraftGradientTextGenerator() {
  const [text, setText] = useState<string>(TEXT_PRESETS[0].text);
  const [stops, setStops] = useState<GradientStop[]>(TEXT_PRESETS[0].colors.map((color) => createStop(color)));
  const [styles, setStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    obfuscated: false,
  });

  const displayCharacters = useMemo(
    () => Array.from(text).filter((character) => character !== "\n"),
    [text],
  );
  const palette = useMemo(
    () => getGradientPalette(stops.map((stop) => stop.color), displayCharacters.length || 1),
    [displayCharacters.length, stops],
  );
  const miniMessageOutput = useMemo(
    () => wrapMiniMessage(text, styles, stops.map((stop) => stop.color)),
    [stops, styles, text],
  );
  const legacyFormatPrefix = useMemo(() => {
    return [
      styles.bold ? "&l" : "",
      styles.italic ? "&o" : "",
      styles.underline ? "&n" : "",
      styles.strikethrough ? "&m" : "",
      styles.obfuscated ? "&k" : "",
    ].join("");
  }, [styles]);
  const sectionFormatPrefix = useMemo(() => legacyFormatPrefix.replaceAll("&", "\u00A7"), [legacyFormatPrefix]);
  const ampersandOutput = useMemo(
    () => buildLegacyHexOutput(text, palette, legacyFormatPrefix, "&"),
    [legacyFormatPrefix, palette, text],
  );
  const sectionOutput = useMemo(
    () => buildLegacyHexOutput(text, palette, sectionFormatPrefix, "\u00A7"),
    [palette, sectionFormatPrefix, text],
  );
  const previewCharacters = useMemo(() => {
    let colorIndex = 0;

    return Array.from(text).map((character, index) => {
      if (character === "\n") {
        return { character, color: "#ffffff", key: `break-${index}` };
      }

      const color = palette[colorIndex] ?? "#ffffff";
      colorIndex += 1;

      return {
        character,
        color,
        key: `${character}-${index}`,
      };
    });
  }, [palette, text]);

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Minecraft</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">Minecraft Gradient Text Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Build gradient text for Minecraft chat, MiniMessage, or config files, then copy the
              output in MiniMessage, ampersand hex, or section-sign hex format.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {TEXT_PRESETS.map((preset) => (
                <ToolActionButton
                  key={preset.label}
                  onClick={() => {
                    setText(preset.text);
                    setStops(preset.colors.map((color) => createStop(color)));
                  }}
                >
                  {preset.label}
                </ToolActionButton>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Preview</p>
            <div className="mt-5 min-h-[18rem] rounded-2xl border border-slate-800 bg-slate-900 px-5 py-5">
              <div className="whitespace-pre-wrap break-words text-2xl font-semibold leading-relaxed">
                {previewCharacters.map((entry) => {
                  if (entry.character === "\n") {
                    return <br key={entry.key} />;
                  }

                  return (
                    <span
                      key={entry.key}
                      style={{
                        color: entry.color,
                        fontStyle: styles.italic ? "italic" : "normal",
                        fontWeight: styles.bold ? 700 : 400,
                        textDecoration: `${styles.underline ? "underline " : ""}${styles.strikethrough ? "line-through" : ""}`.trim() || "none",
                      }}
                    >
                      {styles.obfuscated && entry.character !== " " ? "#" : entry.character}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Characters</div>
                <div className="mt-2 text-lg font-semibold text-white">{displayCharacters.length}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Colors</div>
                <div className="mt-2 text-lg font-semibold text-white">{stops.length}</div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Text</h2>
              <p className="mt-2 text-sm text-slate-400">Write the text exactly as it should render.</p>
            </div>
            <ToolActionButton onClick={() => setText("")}>Clear</ToolActionButton>
          </div>

          <ToolTextarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            spellCheck={false}
          />

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Formatting</p>
                <p className="mt-1 text-xs text-slate-500">Apply extra style tags or legacy format codes.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { id: "bold", label: "Bold" },
                { id: "italic", label: "Italic" },
                { id: "underline", label: "Underline" },
                { id: "strikethrough", label: "Strikethrough" },
                { id: "obfuscated", label: "Obfuscated" },
              ].map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={styles[option.id as keyof typeof styles]}
                    onChange={(event) =>
                      setStyles((current) => ({
                        ...current,
                        [option.id]: event.target.checked,
                      }))
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Gradient colors</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use two to five colors to shape the gradient across the text.
              </p>
            </div>
            <ToolActionButton
              onClick={() => {
                if (stops.length >= 5) {
                  return;
                }

                setStops((current) => [...current, createStop("#ffffff")]);
              }}
              disabled={stops.length >= 5}
            >
              Add color
            </ToolActionButton>
          </div>

          <div className="mt-5 grid gap-4">
            {stops.map((stop, index) => (
              <div key={stop.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium text-white">Color {index + 1}</div>
                  <ToolActionButton
                    onClick={() =>
                      setStops((current) =>
                        current.length <= 2 ? current : current.filter((entry) => entry.id !== stop.id),
                      )
                    }
                    disabled={stops.length <= 2}
                    className="px-3 py-2 text-xs"
                  >
                    Remove
                  </ToolActionButton>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
                  <input
                    type="color"
                    value={stop.color}
                    onChange={(event) =>
                      setStops((current) =>
                        current.map((entry) =>
                          entry.id === stop.id ? { ...entry, color: event.target.value } : entry,
                        ),
                      )
                    }
                    className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
                  />
                  <input
                    value={stop.color}
                    onChange={(event) =>
                      setStops((current) =>
                        current.map((entry) =>
                          entry.id === stop.id ? { ...entry, color: event.target.value } : entry,
                        ),
                      )
                    }
                    spellCheck={false}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-slate-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <OutputCard
          label="MiniMessage"
          description="Gradient output for Adventure or MiniMessage-aware plugins."
          value={miniMessageOutput}
        />
        <OutputCard
          label="Ampersand Hex"
          description="Hex color output using ampersand codes."
          value={ampersandOutput}
        />
        <OutputCard
          label="Section Sign Hex"
          description="Hex color output using section-sign codes."
          value={sectionOutput}
        />
      </section>
    </div>
  );
}
