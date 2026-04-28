import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { parseAllDocuments, stringify } from "yaml";
import type { YAMLError } from "yaml";

type Issue = {
  code: string;
  level: "error" | "warning";
  location: string | null;
  message: string;
};

type ValidationState =
  | {
      status: "empty";
    }
  | {
      documentCount: number;
      errors: Issue[];
      jsonOutput: string;
      normalizedYaml: string;
      rootTypes: string[];
      status: "valid";
      warnings: Issue[];
    }
  | {
      documentCount: number;
      errors: Issue[];
      status: "invalid";
      warnings: Issue[];
    };

type OutputCardProps = {
  description: string;
  label: string;
  value: string;
};

const YAML_EXAMPLES = [
  {
    label: "Kubernetes deployment",
    value: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80`,
  },
  {
    label: "GitHub Actions workflow",
    value: `name: CI
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install
        run: npm ci
      - name: Test
        run: npm test`,
  },
  {
    label: "Invalid sample",
    value: `services:
  api:
    image: node:22
    ports:
      - "3000:3000"
   environment:
      NODE_ENV: production`,
  },
];

function getLocation(error: YAMLError): string | null {
  const first = error.linePos?.[0];

  return first ? `Line ${first.line}, column ${first.col}` : null;
}

function formatIssue(error: YAMLError, level: "error" | "warning"): Issue {
  return {
    level,
    code: error.code,
    message: error.message,
    location: getLocation(error),
  };
}

function getRootType(value: unknown): string {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

function buildMultiDocumentYaml(values: unknown[]): string {
  return values
    .map((value) => `---\n${stringify(value).trimEnd()}`)
    .join("\n");
}

function getValidationState(source: string): ValidationState {
  const trimmed = source.trim();

  if (!trimmed) {
    return { status: "empty" };
  }

  const documents = parseAllDocuments(source, {
    prettyErrors: true,
    strict: true,
  });
  const errors = documents.flatMap((document) =>
    document.errors.map((error) => formatIssue(error, "error")),
  );
  const warnings = documents.flatMap((document) =>
    document.warnings.map((warning) => formatIssue(warning, "warning")),
  );

  if (errors.length > 0) {
    return {
      status: "invalid",
      errors,
      warnings,
      documentCount: documents.length,
    };
  }

  const values = documents.map((document) => document.toJS());
  const normalizedYaml =
    values.length <= 1 ? stringify(values[0]) : buildMultiDocumentYaml(values);
  const jsonOutput =
    values.length <= 1 ? JSON.stringify(values[0], null, 2) : JSON.stringify(values, null, 2);

  return {
    status: "valid",
    errors,
    warnings,
    documentCount: documents.length,
    normalizedYaml,
    jsonOutput,
    rootTypes: values.map((value) => getRootType(value)),
  };
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const handleCopy = async (): Promise<void> => {
    if (!value) {
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
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
    >
      Copy
    </button>
  );
}

function OutputCard({ description, label, value }: OutputCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <CopyButton label={label} value={value} />
      </div>

      <textarea
        readOnly
        value={value}
        rows={14}
        className="mt-4 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 font-mono text-xs text-slate-200 outline-none"
      />
    </section>
  );
}

export default function YamlValidator() {
  const [yamlInput, setYamlInput] = useState<string>(YAML_EXAMPLES[0].value);
  const validationState = useMemo(() => getValidationState(yamlInput), [yamlInput]);

  return (
    <div className="grid gap-6">
      <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Validators</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">YAML Validator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Validate YAML with real parser errors, inspect warnings, and export a normalized YAML
              version or JSON conversion when the document is valid.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {YAML_EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => setYamlInput(example.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                >
                  {example.label}
                </button>
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
                    ? "Valid YAML"
                    : validationState.status === "invalid"
                      ? "Invalid YAML"
                      : "Waiting for input"}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Documents</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {validationState.status === "empty" ? "-" : validationState.documentCount}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Warnings</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {validationState.status === "empty" ? "-" : validationState.warnings.length}
                  </div>
                </div>
              </div>

              {validationState.status === "valid" ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Root types</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {validationState.rootTypes.join(", ")}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Editor</h3>
              <p className="mt-2 text-sm text-slate-400">
                Paste a YAML document or stream. The validator updates on every edit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setYamlInput("")}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Clear
            </button>
          </div>

          <textarea
            value={yamlInput}
            onChange={(event) => setYamlInput(event.target.value)}
            rows={22}
            spellCheck="false"
            className="mt-5 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 font-mono text-sm text-slate-100 outline-none transition focus:border-slate-600"
          />
        </section>

        <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-white">Issues</h3>
          <div className="mt-4 grid gap-3">
            {validationState.status === "empty" ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-sm text-slate-400">
                Enter YAML to validate it.
              </div>
            ) : validationState.errors.length === 0 && validationState.warnings.length === 0 ? (
              <div className="rounded-xl border border-emerald-700 bg-emerald-950/20 px-4 py-4 text-sm text-emerald-100">
                No parser errors or warnings.
              </div>
            ) : (
              [...validationState.errors, ...validationState.warnings].map((issue, index) => (
                <div
                  key={`${issue.level}-${issue.code}-${index}`}
                  className={`rounded-xl border px-4 py-4 ${
                    issue.level === "error"
                      ? "border-rose-800 bg-rose-950/20"
                      : "border-amber-700 bg-amber-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${
                        issue.level === "error"
                          ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
                          : "border border-amber-500/40 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {issue.level}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{issue.code}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">{issue.message}</p>
                  {issue.location ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {issue.location}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      {validationState.status === "valid" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <OutputCard
            label="Normalized YAML"
            description="Re-serialized YAML from the parsed document."
            value={validationState.normalizedYaml}
          />
          <OutputCard
            label="JSON Output"
            description="Parsed YAML converted to JSON for downstream use."
            value={validationState.jsonOutput}
          />
        </section>
      ) : null}
    </div>
  );
}
