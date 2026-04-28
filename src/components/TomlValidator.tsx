import { useMemo, useState } from "react";
import { parse, stringify } from "smol-toml";
import {
  OutputCard,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type TomlIssue = {
  location: string | null;
  message: string;
};

type TomlState =
  | { status: "empty" }
  | {
      jsonOutput: string;
      normalizedToml: string;
      rootKeys: number;
      status: "valid";
    }
  | {
      issue: TomlIssue;
      status: "invalid";
    };

const TOML_EXAMPLES = [
  {
    label: "App config",
    value: `title = "Build worker"
environment = "production"
ports = [8080, 8081]

[limits]
concurrency = 4
retry_delay_seconds = 15
`,
  },
  {
    label: "Pyproject",
    value: `[project]
name = "sample-app"
version = "0.1.0"
dependencies = ["requests>=2.32", "rich>=13.0"]

[tool.ruff]
line-length = 100
`,
  },
  {
    label: "Invalid sample",
    value: `title = "Broken"
enabled = tru
[server]
port = 8080
`,
  },
];

function getValidationState(source: string): TomlState {
  const trimmed = source.trim();

  if (!trimmed) {
    return { status: "empty" };
  }

  try {
    const value = parse(source) as Record<string, unknown>;

    return {
      status: "valid",
      normalizedToml: stringify(value),
      jsonOutput: JSON.stringify(value, null, 2),
      rootKeys: Object.keys(value).length,
    };
  } catch (error) {
    const issue = error as {
      column?: number;
      line?: number;
      message?: string;
    };

    return {
      status: "invalid",
      issue: {
        message: issue.message ?? "TOML parsing failed.",
        location:
          typeof issue.line === "number" && typeof issue.column === "number"
            ? `Line ${issue.line}, column ${issue.column}`
            : null,
      },
    };
  }
}

export default function TomlValidator() {
  const [tomlInput, setTomlInput] = useState<string>(TOML_EXAMPLES[0].value);
  const validationState = useMemo(() => getValidationState(tomlInput), [tomlInput]);

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Validators</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">TOML Validator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Validate TOML with parser-backed errors, then normalize the document or inspect the
              equivalent JSON shape after a clean parse.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {TOML_EXAMPLES.map((example) => (
                <ToolActionButton key={example.label} onClick={() => setTomlInput(example.value)}>
                  {example.label}
                </ToolActionButton>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Validation status</p>
            <div className="mt-4 grid gap-4">
              <div
                className={`rounded-xl border px-4 py-4 ${
                  validationState.status === "valid"
                    ? "border-emerald-700 bg-emerald-950/20"
                    : validationState.status === "invalid"
                      ? "border-rose-800 bg-rose-950/20"
                      : "border-slate-800 bg-slate-950/80"
                }`}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Result</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {validationState.status === "valid"
                    ? "Valid TOML"
                    : validationState.status === "invalid"
                      ? "Invalid TOML"
                      : "Waiting for input"}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Root keys</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {validationState.status === "valid" ? validationState.rootKeys : "-"}
                  </div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Parser note</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {validationState.status === "invalid"
                      ? "The document contains TOML syntax errors."
                      : validationState.status === "valid"
                        ? "The document parses cleanly."
                        : "Paste TOML to validate it."}
                  </div>
                </div>
              </div>

              {validationState.status === "invalid" ? (
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Location</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {validationState.issue.location ?? "Parser location unavailable"}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Editor</h2>
              <p className="mt-2 text-sm text-slate-400">
                Paste TOML configuration and inspect the parser response as you edit.
              </p>
            </div>
            <ToolActionButton onClick={() => setTomlInput("")}>Clear</ToolActionButton>
          </div>

          <ToolTextarea
            value={tomlInput}
            onChange={(event) => setTomlInput(event.target.value)}
            rows={22}
            spellCheck={false}
          />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Issues</h2>
          <div className="mt-4 grid gap-3">
            {validationState.status === "empty" ? (
              <div className={`${cardClass} text-sm text-slate-400`}>Enter TOML to validate it.</div>
            ) : validationState.status === "valid" ? (
              <div className="rounded-xl border border-emerald-700 bg-emerald-950/20 px-4 py-4 text-sm text-emerald-100">
                No parser errors.
              </div>
            ) : (
              <div className="rounded-xl border border-rose-800 bg-rose-950/20 px-4 py-4">
                <div className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-rose-200">
                  error
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{validationState.issue.message}</p>
                {validationState.issue.location ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {validationState.issue.location}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </section>

      {validationState.status === "valid" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <OutputCard
            label="Normalized TOML"
            description="Re-serialized TOML from the parsed document."
            value={validationState.normalizedToml}
          />
          <OutputCard
            label="JSON Output"
            description="Equivalent JSON structure for downstream tools."
            value={validationState.jsonOutput}
          />
        </section>
      ) : null}
    </div>
  );
}
