import { Fragment, useMemo, useState } from "react";
import {
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type MatchDetail = {
  groups: Array<{ index: number; value: string }>;
  index: number;
  value: string;
};

type RegexState =
  | { status: "empty" }
  | { message: string; status: "error" }
  | {
      matches: MatchDetail[];
      replacementOutput: string;
      status: "success";
    };

const SAMPLE_TEXT = `2026-04-28 INFO build completed in 1842ms
2026-04-28 WARN retrying webhook delivery to https://example.test/hook
2026-04-28 ERROR user email invalid: sam@example
2026-04-29 INFO build completed in 2011ms`;

function getEnabledFlags(flags: Record<string, boolean>): string {
  return Object.entries(flags)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag)
    .join("");
}

function collectMatches(regex: RegExp, source: string): MatchDetail[] {
  const scanFlags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const scanRegex = new RegExp(regex.source, scanFlags);
  const matches: MatchDetail[] = [];

  for (const match of source.matchAll(scanRegex)) {
    matches.push({
      value: match[0] ?? "",
      index: match.index ?? 0,
      groups: match.slice(1).map((value, index) => ({
        index: index + 1,
        value: value ?? "",
      })),
    });
  }

  if (!matches.length) {
    const single = regex.exec(source);

    if (single) {
      matches.push({
        value: single[0] ?? "",
        index: single.index ?? 0,
        groups: single.slice(1).map((value, index) => ({
          index: index + 1,
          value: value ?? "",
        })),
      });
    }
  }

  return matches;
}

function getRegexState(pattern: string, flags: string, source: string, replacement: string): RegexState {
  if (!pattern && !source) {
    return { status: "empty" };
  }

  try {
    const regex = new RegExp(pattern, flags);
    const matches = collectMatches(regex, source).slice(0, 50);

    return {
      status: "success",
      matches,
      replacementOutput: source.replace(regex, replacement),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Invalid regular expression.",
    };
  }
}

function renderHighlightedText(source: string, matches: MatchDetail[]) {
  if (!matches.length) {
    return source;
  }

  const parts: Array<{ kind: "match" | "text"; value: string }> = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.index > cursor) {
      parts.push({ kind: "text", value: source.slice(cursor, match.index) });
    }

    parts.push({ kind: "match", value: source.slice(match.index, match.index + match.value.length) });
    cursor = match.index + match.value.length;

    if (index === matches.length - 1 && cursor < source.length) {
      parts.push({ kind: "text", value: source.slice(cursor) });
    }
  });

  return parts.map((part, index) =>
    part.kind === "match" ? (
      <mark key={index} className="rounded bg-cyan-500/20 px-0.5 text-cyan-100">
        {part.value}
      </mark>
    ) : (
      <Fragment key={index}>{part.value}</Fragment>
    ),
  );
}

export default function RegexTester() {
  const [pattern, setPattern] = useState<string>("(\\d{4}-\\d{2}-\\d{2})\\s+(ERROR|WARN)");
  const [source, setSource] = useState<string>(SAMPLE_TEXT);
  const [replacement, setReplacement] = useState<string>("[$2] $1");
  const [flags, setFlags] = useState<Record<string, boolean>>({
    g: true,
    i: false,
    m: true,
    s: false,
    u: false,
  });

  const enabledFlags = useMemo(() => getEnabledFlags(flags), [flags]);
  const regexState = useMemo(
    () => getRegexState(pattern, enabledFlags, source, replacement),
    [enabledFlags, pattern, replacement, source],
  );

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Text & Formatting
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">Regex Tester</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Test JavaScript regular expressions against sample text, inspect capture groups, and
              preview a replacement result with the same pattern.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <ToolActionButton onClick={() => setSource(SAMPLE_TEXT)}>Load sample text</ToolActionButton>
              <ToolActionButton onClick={() => setPattern("\\bhttps?://\\S+")}>Find URLs</ToolActionButton>
              <ToolActionButton onClick={() => setPattern("([\\w.-]+)@([\\w.-]+)")}>
                Find emails
              </ToolActionButton>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Pattern state</p>
            <div className="mt-4 grid gap-4">
              <div
                className={`rounded-xl border px-4 py-4 ${
                  regexState.status === "error"
                    ? "border-rose-800 bg-rose-950/20"
                    : "border-slate-800 bg-slate-950/80"
                }`}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Flags</div>
                <div className="mt-2 font-mono text-lg text-white">{enabledFlags || "(none)"}</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Matches</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {regexState.status === "success" ? regexState.matches.length : "-"}
                  </div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</div>
                  <div className="mt-2 text-sm font-medium text-white">
                    {regexState.status === "error"
                      ? "Invalid regex"
                      : regexState.status === "success"
                        ? "Regex compiled"
                        : "Waiting for input"}
                  </div>
                </div>
              </div>

              {regexState.status === "error" ? (
                <div className="rounded-xl border border-rose-800 bg-rose-950/20 px-4 py-4 text-sm text-rose-100">
                  {regexState.message}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Pattern</h2>
          <input
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="Enter a regex pattern"
            spellCheck={false}
            className={inputClass}
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            {(["g", "i", "m", "s", "u"] as const).map((flag) => (
              <label
                key={flag}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={flags[flag]}
                  onChange={(event) =>
                    setFlags((current) => ({ ...current, [flag]: event.target.checked }))
                  }
                />
                {flag}
              </label>
            ))}
          </div>

          <label className="mt-5 block text-sm font-medium text-slate-300">Sample text</label>
          <ToolTextarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={16}
            spellCheck={false}
          />

          <label className="mt-5 block text-sm font-medium text-slate-300">Replacement</label>
          <input
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            placeholder="Use $1, $2, ..."
            className={inputClass}
          />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Preview</h2>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 font-mono text-sm whitespace-pre-wrap text-slate-200">
            {regexState.status === "success"
              ? renderHighlightedText(source, regexState.matches)
              : "Enter a valid regex to preview matches."}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Replacement output</div>
            <div className="mt-3 whitespace-pre-wrap font-mono text-sm text-slate-200">
              {regexState.status === "success"
                ? regexState.replacementOutput
                : "Replacement preview unavailable."}
            </div>
          </div>
        </section>
      </section>

      <section className={primaryPanelClass}>
        <h2 className="text-lg font-semibold text-white">Matches</h2>
        <div className="mt-4 grid gap-3">
          {regexState.status !== "success" ? (
            <div className={`${cardClass} text-sm text-slate-400`}>
              Compile a valid regex to inspect captures.
            </div>
          ) : regexState.matches.length === 0 ? (
            <div className={`${cardClass} text-sm text-slate-400`}>No matches found.</div>
          ) : (
            regexState.matches.map((match, index) => (
              <div key={`${match.index}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">Match {index + 1}</div>
                  <div className="font-mono text-xs text-slate-500">Index {match.index}</div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-3 font-mono text-xs text-slate-200">
                  {match.value}
                </div>
                {match.groups.length ? (
                  <div className="mt-3 grid gap-2">
                    {match.groups.map((group) => (
                      <div
                        key={`${index}-${group.index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                      >
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Group {group.index}
                        </span>
                        <span className="font-mono text-xs text-slate-200">{group.value || "(empty)"}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
