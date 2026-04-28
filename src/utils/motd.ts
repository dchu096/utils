export type LegacyColorOption = {
  code: string;
  color: string;
  label: string;
};

export type LegacyFormatOption = {
  code: string;
  label: string;
};

type StyleState = {
  color: string | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  obfuscated: boolean;
};

type StackEntry = {
  close: string;
  name: string;
};

const DEFAULT_STYLE: StyleState = {
  color: null,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  obfuscated: false,
};

const LEGACY_COLOR_MAP: Record<string, string> = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
  f: "#FFFFFF",
};

const NAMED_COLOR_MAP: Record<string, string> = {
  black: "#000000",
  dark_blue: "#0000AA",
  dark_green: "#00AA00",
  dark_aqua: "#00AAAA",
  dark_red: "#AA0000",
  dark_purple: "#AA00AA",
  gold: "#FFAA00",
  gray: "#AAAAAA",
  dark_gray: "#555555",
  blue: "#5555FF",
  green: "#55FF55",
  aqua: "#55FFFF",
  red: "#FF5555",
  light_purple: "#FF55FF",
  yellow: "#FFFF55",
  white: "#FFFFFF",
};

const LEGACY_FORMAT_CLASS_MAP: Record<string, keyof StyleState> = {
  k: "obfuscated",
  l: "bold",
  m: "strikethrough",
  n: "underline",
  o: "italic",
};

const MINI_MESSAGE_TAG_REGEX = /<\/?[a-z0-9_#!]+(?::[^>]+)?>/i;

export const LEGACY_COLOR_OPTIONS: LegacyColorOption[] = [
  { code: "0", color: "#000000", label: "Black" },
  { code: "1", color: "#0000aa", label: "Dark Blue" },
  { code: "2", color: "#00aa00", label: "Dark Green" },
  { code: "3", color: "#00aaaa", label: "Dark Aqua" },
  { code: "4", color: "#aa0000", label: "Dark Red" },
  { code: "5", color: "#aa00aa", label: "Dark Purple" },
  { code: "6", color: "#ffaa00", label: "Gold" },
  { code: "7", color: "#aaaaaa", label: "Gray" },
  { code: "8", color: "#555555", label: "Dark Gray" },
  { code: "9", color: "#5555ff", label: "Blue" },
  { code: "a", color: "#55ff55", label: "Green" },
  { code: "b", color: "#55ffff", label: "Aqua" },
  { code: "c", color: "#ff5555", label: "Red" },
  { code: "d", color: "#ff55ff", label: "Light Purple" },
  { code: "e", color: "#ffff55", label: "Yellow" },
  { code: "f", color: "#ffffff", label: "White" },
];

export const LEGACY_FORMAT_OPTIONS: LegacyFormatOption[] = [
  { code: "l", label: "Bold" },
  { code: "n", label: "Underline" },
  { code: "o", label: "Italic" },
  { code: "m", label: "Strikethrough" },
  { code: "k", label: "Obfuscated" },
  { code: "r", label: "Reset" },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed}`;
  }

  return NAMED_COLOR_MAP[trimmed.toLowerCase()] ?? null;
}

function buildGradientStyle(colors: string[]): string {
  return `background:linear-gradient(90deg,${colors.join(",")});-webkit-background-clip:text;background-clip:text;color:transparent;`;
}

function buildRainbowStyle(argument: string): string {
  const baseColors = [
    "#FF0000",
    "#FF7F00",
    "#FFFF00",
    "#00FF00",
    "#0000FF",
    "#4B0082",
    "#8B00FF",
  ];
  const compact = argument.replaceAll(" ", "");
  const reverse = compact.startsWith("!");
  const phaseText = reverse ? compact.slice(1) : compact;
  const phase = Number.parseInt(phaseText || "0", 10);
  const shift = Number.isNaN(phase) ? 0 : ((phase % baseColors.length) + baseColors.length) % baseColors.length;
  const ordered = reverse ? [...baseColors].reverse() : [...baseColors];
  const rotated = ordered.slice(shift).concat(ordered.slice(0, shift));

  return buildGradientStyle(rotated);
}

function wrapText(text: string, state: StyleState): string {
  if (!text) {
    return "";
  }

  const styleParts: string[] = [];
  const classNames: string[] = [];

  if (state.color) {
    styleParts.push(`color:${state.color};`);
  }

  if (state.bold) {
    classNames.push("font-bold");
  }

  if (state.italic) {
    classNames.push("italic");
  }

  if (state.underline) {
    classNames.push("underline");
  }

  if (state.strikethrough) {
    classNames.push("line-through");
  }

  const attributes: string[] = [];

  if (styleParts.length) {
    attributes.push(`style="${styleParts.join("")}"`);
  }

  if (classNames.length) {
    attributes.push(`class="${classNames.join(" ")}"`);
  }

  if (state.obfuscated) {
    attributes.push('data-obfuscated="true"');
  }

  const escaped = escapeHtml(text);

  if (!attributes.length) {
    return escaped;
  }

  return `<span ${attributes.join(" ")}>${escaped}</span>`;
}

function getVisibleLength(line: string): number {
  return line
    .replaceAll(/&[0-9a-fk-or]/gi, "")
    .replaceAll(/<\/?[a-z0-9_#!]+(?::[^>]+)?>/gi, "")
    .length;
}

function centerLine(line: string, totalWidth = 48): string {
  const trimmed = line.trim();
  const visibleLength = getVisibleLength(trimmed);
  const pad = Math.floor((totalWidth - visibleLength) / 2);

  return `${" ".repeat(Math.max(pad, 0))}${trimmed}`;
}

function renderLegacyLineToHtml(line: string): string {
  let output = "";
  let buffer = "";
  let state: StyleState = { ...DEFAULT_STYLE };

  const flush = (): void => {
    output += wrapText(buffer, state);
    buffer = "";
  };

  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    const next = line[index + 1]?.toLowerCase();

    if (current === "&" && next) {
      if (next in LEGACY_COLOR_MAP) {
        flush();
        state = {
          ...DEFAULT_STYLE,
          color: LEGACY_COLOR_MAP[next],
        };
        index += 1;
        continue;
      }

      if (next in LEGACY_FORMAT_CLASS_MAP) {
        flush();
        state = {
          ...state,
          [LEGACY_FORMAT_CLASS_MAP[next]]: true,
        };
        index += 1;
        continue;
      }

      if (next === "r") {
        flush();
        state = { ...DEFAULT_STYLE };
        index += 1;
        continue;
      }
    }

    buffer += current;
  }

  flush();

  return output;
}

function renderMiniMessageLineToHtml(line: string): string {
  const stack: StackEntry[] = [];
  const tagPattern = /<(\/?)([a-z0-9_#!]+)(?::([^>]*))?>/gi;
  let lastIndex = 0;
  let output = "";
  let match: RegExpExecArray | null = tagPattern.exec(line);

  while (match) {
    output += escapeHtml(line.slice(lastIndex, match.index));
    lastIndex = tagPattern.lastIndex;

    const slash = match[1];
    const rawName = match[2];
    const rawArgument = match[3] ?? "";
    const name = rawName.toLowerCase();

    if (slash) {
      for (let stackIndex = stack.length - 1; stackIndex >= 0; stackIndex -= 1) {
        if (stack[stackIndex].name === name) {
          while (stack.length > stackIndex) {
            output += stack.pop()?.close ?? "";
          }
          break;
        }
      }
      match = tagPattern.exec(line);
      continue;
    }

    if (name === "reset" || name === "r") {
      while (stack.length) {
        output += stack.pop()?.close ?? "";
      }
      match = tagPattern.exec(line);
      continue;
    }

    let opening = "";
    const closing = "</span>";

    if (name === "color" || name === "colour" || name === "c") {
      const color = normalizeHexColor(rawArgument);

      if (color) {
        opening = `<span style="color:${color};">`;
      }
    } else if (name === "gradient") {
      const colors = rawArgument
        .split(":")
        .map((value) => normalizeHexColor(value))
        .filter((value): value is string => Boolean(value));

      if (colors.length >= 2) {
        opening = `<span style="${buildGradientStyle(colors)}">`;
      }
    } else if (name === "rainbow") {
      opening = `<span style="${buildRainbowStyle(rawArgument)}">`;
    } else if (name === "bold" || name === "b") {
      opening = '<span class="font-bold">';
    } else if (name === "italic" || name === "i" || name === "em") {
      opening = '<span class="italic">';
    } else if (name === "underline" || name === "underlined" || name === "u") {
      opening = '<span class="underline">';
    } else if (name === "strikethrough" || name === "st" || name === "m") {
      opening = '<span class="line-through">';
    } else if (name === "obfuscated" || name === "obf" || name === "k") {
      opening = '<span data-obfuscated="true">';
    } else {
      const color = normalizeHexColor(name);

      if (color) {
        opening = `<span style="color:${color};">`;
      }
    }

    if (opening) {
      output += opening;
      stack.push({ close: closing, name });
    }

    match = tagPattern.exec(line);
  }

  output += escapeHtml(line.slice(lastIndex));

  while (stack.length) {
    output += stack.pop()?.close ?? "";
  }

  return output;
}

export function containsMiniMessage(text: string): boolean {
  return MINI_MESSAGE_TAG_REGEX.test(text);
}

export function buildPreviewHtml(text: string, centered: boolean): string {
  const lines = text.split("\n");
  const preparedLines = centered ? lines.map((line) => centerLine(line)) : lines;

  return preparedLines
    .map((line) => (containsMiniMessage(line) ? renderMiniMessageLineToHtml(line) : renderLegacyLineToHtml(line)))
    .join("<br>");
}

export function buildCenteredText(text: string, centered: boolean): string {
  const lines = text.split("\n");
  return centered ? lines.map((line) => centerLine(line)).join("\n") : text;
}

export function buildMiniMessageOutput(text: string): string {
  return text;
}

export function buildLegacyOutput(text: string): string {
  return text.replaceAll("&", "\u00A7").replaceAll("\n", "\\n");
}

export function buildBungeeOutput(text: string): string {
  return `"${text.replaceAll("\n", "\\n")}"`;
}

export function buildServerListPlusOutput(text: string): string {
  const indented = text.split("\n").join("\n  ");
  return `- |-\n  ${indented}`;
}
