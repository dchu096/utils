import { useMemo, useState } from "react";
import {
  OutputCard,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type JsonIssue = {
  location: string | null;
  message: string;
};

type JsonState =
  | { status: "empty" }
  | {
      itemSummary: string;
      minified: string;
      pretty: string;
      rootType: string;
      sorted: string;
      status: "valid";
    }
  | {
      issue: JsonIssue;
      status: "invalid";
    };

const JSON_EXAMPLES = [
  {
    label: "API payload",
    value: `{
  "id": "evt_1241",
  "type": "build.completed",
  "success": true,
  "durationMs": 1842,
  "artifacts": [
    "web",
    "docs"
  ]
}`,
  },
  {
    label: "Nested config",
    value: `{
  "service": {
    "name": "edge-api",
    "replicas": 3,
    "features": {
      "compression": true,
      "rateLimits": {
        "burst": 25,
        "windowSeconds": 60
      }
    }
  }
}`,
  },
  {
    label: "Invalid sample",
    value: `{
  "name": "broken",
  "ports": [80, 443,],
  "enabled": tru
}`,
  },
];

function getRootType(value: unknown): string {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

function getItemSummary(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (value && typeof value === "object") {
    const count = Object.keys(value as Record<string, unknown>).length;
    return `${count} key${count === 1 ? "" : "s"}`;
  }

  return "Scalar value";
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeysDeep(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortKeysDeep(entry)]),
  );
}

function getLineAndColumn(source: string, position: number): string {
  const prefix = source.slice(0, position);
  const lines = prefix.split("\n");
  const line = lines.length;
  const column = (lines.at(-1)?.length ?? 0) + 1;

  return `Line ${line}, column ${column}`;
}

function getValidationState(source: string): JsonState {
  const trimmed = source.trim();

  if (!trimmed) {
    return { status: "empty" };
  }

  try {
    const value = JSON.parse(source) as unknown;

    return {
      status: "valid",
      rootType: getRootType(value),
      itemSummary: getItemSummary(value),
      pretty: JSON.stringify(value, null, 2),
      minified: JSON.stringify(value),
      sorted: JSON.stringify(sortKeysDeep(value), null, 2),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON parsing failed.";
    const positionMatch = /position (\d+)/i.exec(message);

    return {
      status: "invalid",
      issue: {
        message,
        location: positionMatch ? getLineAndColumn(source, Number(positionMatch[1])) : null,
      },
    };
  }
}

export default function JsonValidator() {
  const [jsonInput, setJsonInput] = useState<string>(JSON_EXAMPLES[0].value);
  const validationState = useMemo(() => getValidationState(jsonInput), [jsonInput]);

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Validators</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">JSON Validator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Validate JSON with native parser errors, normalize formatting, and produce stable
              pretty-printed output for downstream copy and review.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {JSON_EXAMPLES.map((example) => (
                <ToolActionButton key={example.label} onClick={() => setJsonInput(example.value)}>
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
                    ? "Valid JSON"
                    : validationState.status === "invalid"
                      ? "Invalid JSON"
                      : "Waiting for input"}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Root type</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {validationState.status === "valid" ? validationState.rootType : "-"}
                  </div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Shape</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {validationState.status === "valid" ? validationState.itemSummary : "-"}
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Parser note</div>
                <div className="mt-2 text-sm text-slate-300">
                  {validationState.status === "invalid"
                    ? validationState.issue.message
                    : validationState.status === "valid"
                      ? "The document parses cleanly."
                      : "Paste JSON to validate it."}
                </div>
                {validationState.status === "invalid" && validationState.issue.location ? (
                  <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {validationState.issue.location}
                  </div>
                ) : null}
              </div>
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
                Paste JSON. Validation and normalization update on every edit.
              </p>
            </div>
            <ToolActionButton onClick={() => setJsonInput("")}>Clear</ToolActionButton>
          </div>

          <ToolTextarea
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            rows={22}
            spellCheck={false}
          />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Issues</h2>
          <div className="mt-4 grid gap-3">
            {validationState.status === "empty" ? (
              <div className={`${cardClass} text-sm text-slate-400`}>Enter JSON to validate it.</div>
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
        <section className="grid gap-6 xl:grid-cols-3">
          <OutputCard
            label="Pretty JSON"
            description="Indented output for review and editing."
            value={validationState.pretty}
          />
          <OutputCard
            label="Minified JSON"
            description="Single-line output for transport or embedding."
            value={validationState.minified}
          />
          <OutputCard
            label="Sorted Keys"
            description="Stable object key ordering for diffs and snapshots."
            value={validationState.sorted}
          />
        </section>
      ) : null}
    </div>
  );
}
