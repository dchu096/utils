import { useMemo, useState } from "react";
import {
  CopyButton,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type Codec = "base64" | "base64url" | "url";
type Direction = "encode" | "decode";

type ResultState =
  | { output: string; status: "success" }
  | { message: string; status: "error" }
  | { status: "empty" };

const EXAMPLES: Record<Codec, string> = {
  base64: "Hello from dchu096.tk",
  base64url: '{"sub":"123","name":"Casey","roles":["admin","ops"]}',
  url: "https://dchu096.tk/search?q=cron jobs&sort=latest#examples",
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeValue(input: string, codec: Codec): string {
  if (codec === "url") {
    return encodeURIComponent(input);
  }

  const base64 = bytesToBase64(new TextEncoder().encode(input));

  if (codec === "base64url") {
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  return base64;
}

function decodeValue(input: string, codec: Codec): string {
  if (codec === "url") {
    return decodeURIComponent(input);
  }

  const normalized =
    codec === "base64url"
      ? input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=")
      : input;

  return new TextDecoder().decode(base64ToBytes(normalized));
}

function getResultState(input: string, codec: Codec, direction: Direction): ResultState {
  if (!input) {
    return { status: "empty" };
  }

  try {
    return {
      status: "success",
      output: direction === "encode" ? encodeValue(input, codec) : decodeValue(input, codec),
    };
  } catch {
    return {
      status: "error",
      message:
        direction === "encode"
          ? "The input could not be encoded."
          : "The input is not valid for the selected decoder.",
    };
  }
}

export default function Base64UrlEncoder() {
  const [codec, setCodec] = useState<Codec>("base64");
  const [direction, setDirection] = useState<Direction>("encode");
  const [input, setInput] = useState<string>(EXAMPLES.base64);

  const resultState = useMemo(() => getResultState(input, codec, direction), [codec, direction, input]);
  const inputLength = useMemo(() => new TextEncoder().encode(input).length, [input]);
  const outputLength = useMemo(
    () =>
      resultState.status === "success" ? new TextEncoder().encode(resultState.output).length : 0,
    [resultState],
  );

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Data & Encoding
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">Base64 / URL Encoder</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Encode or decode UTF-8 text as Base64, Base64URL, or percent-encoded URL content
              without leaving the browser.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {(["base64", "base64url", "url"] as Codec[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setCodec(value);
                    setInput(EXAMPLES[value]);
                    setDirection("encode");
                  }}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    codec === value
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
                  }`}
                >
                  {value === "base64" ? "Base64" : value === "base64url" ? "Base64URL" : "URL"}
                </button>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current mode</p>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["encode", "decode"] as Direction[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDirection(value)}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      direction === value
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{value}</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {value === "encode" ? "Source text to encoded output" : "Encoded input to text"}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Input bytes</div>
                  <div className="mt-2 text-lg font-semibold text-white">{inputLength}</div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Output bytes</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {resultState.status === "success" ? outputLength : "-"}
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Codec</div>
                <div className="mt-2 text-sm font-medium text-white">
                  {codec === "base64" ? "Base64" : codec === "base64url" ? "Base64URL" : "URL percent-encoding"}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Input</h2>
              <p className="mt-2 text-sm text-slate-400">
                {direction === "encode"
                  ? "Enter the source text to encode."
                  : "Enter the encoded value to decode."}
              </p>
            </div>
            <ToolActionButton onClick={() => setInput(EXAMPLES[codec])}>Load example</ToolActionButton>
          </div>

          <ToolTextarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={18}
            spellCheck={false}
          />
        </section>

        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Output</h2>
              <p className="mt-2 text-sm text-slate-400">
                Computed from the selected codec and direction.
              </p>
            </div>
            {resultState.status === "success" ? (
              <CopyButton label="Output" value={resultState.output} />
            ) : null}
          </div>

          {resultState.status === "error" ? (
            <div className="mt-5 rounded-xl border border-rose-800 bg-rose-950/20 px-4 py-4 text-sm text-rose-100">
              {resultState.message}
            </div>
          ) : null}

          <textarea
            readOnly
            value={resultState.status === "success" ? resultState.output : ""}
            rows={18}
            className={`${inputClass} mt-5 min-h-[21rem] resize-none font-mono text-xs`}
          />
        </section>
      </section>
    </div>
  );
}
