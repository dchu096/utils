import { useMemo, useState } from "react";
import {
  CopyButton,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-([1-8])[0-9a-f]{3}-([89ab])[0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateBatch(count: number, uppercase: boolean): string[] {
  return Array.from({ length: count }, () => {
    const value = crypto.randomUUID();
    return uppercase ? value.toUpperCase() : value;
  });
}

function getValidationSummary(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Enter a UUID to inspect it.";
  }

  const match = UUID_PATTERN.exec(trimmed);

  if (!match) {
    return "The value is not a valid UUID string.";
  }

  return `Valid UUID, version ${match[1]}, variant ${match[2].toUpperCase()}.`;
}

export default function UuidGenerator() {
  const [count, setCount] = useState<number>(5);
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [inspectionValue, setInspectionValue] = useState<string>("");
  const [generated, setGenerated] = useState<string[]>(() => generateBatch(5, false));

  const generatedOutput = useMemo(() => generated.join("\n"), [generated]);
  const validationSummary = useMemo(() => getValidationSummary(inspectionValue), [inspectionValue]);

  const regenerate = (nextCount = count): void => {
    setGenerated(generateBatch(nextCount, uppercase));
  };

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Data & Encoding
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">UUID Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Generate browser-native UUID v4 values in batches, then inspect any pasted UUID for
              basic version and variant validation.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {[1, 5, 10].map((nextCount) => (
                <ToolActionButton
                  key={nextCount}
                  onClick={() => {
                    setCount(nextCount);
                    setGenerated(generateBatch(nextCount, uppercase));
                  }}
                >
                  {nextCount} UUID{nextCount === 1 ? "" : "s"}
                </ToolActionButton>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Generation settings</p>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Count</div>
                  <div className="mt-2 text-lg font-semibold text-white">{count}</div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Format</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {uppercase ? "Uppercase" : "Lowercase"}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={uppercase}
                  onChange={(event) => {
                    setUppercase(event.target.checked);
                    setGenerated((current) =>
                      current.map((entry) =>
                        event.target.checked ? entry.toUpperCase() : entry.toLowerCase(),
                      ),
                    );
                  }}
                />
                Uppercase output
              </label>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Generated UUIDs</h2>
              <p className="mt-2 text-sm text-slate-400">
                Regenerate the current batch or copy the full set as newline-separated values.
              </p>
            </div>
            <div className="flex gap-2">
              <ToolActionButton onClick={() => regenerate()}>Regenerate</ToolActionButton>
              <CopyButton label="UUID batch" value={generatedOutput} />
            </div>
          </div>

          <ToolTextarea readOnly value={generatedOutput} rows={18} spellCheck={false} />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">UUID inspector</h2>
          <p className="mt-2 text-sm text-slate-400">Paste a UUID to check its version and variant.</p>
          <input
            value={inspectionValue}
            onChange={(event) => setInspectionValue(event.target.value)}
            placeholder="550e8400-e29b-41d4-a716-446655440000"
            className={inputClass}
          />

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-sm text-slate-200">
            {validationSummary}
          </div>

          <div className="mt-4 grid gap-3">
            {generated.map((value) => (
              <div
                key={value}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
              >
                <span className="font-mono text-xs text-slate-200">{value}</span>
                <CopyButton label="UUID" value={value} />
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
