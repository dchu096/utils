import { useMemo, useState } from "react";
import {
  CopyButton,
  OutputCard,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type JwtState =
  | { status: "empty" }
  | {
      headerJson: string;
      payloadJson: string;
      signature: string;
      status: "valid";
      warnings: string[];
    }
  | {
      message: string;
      status: "invalid";
    };

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkNhc2V5IERvZSIsImlhdCI6MTcxNDI4NzYwMCwiZXhwIjoyMDIwMDAwMDAwLCJhdWQiOlsiYXBpIiwiZGFzaGJvYXJkIl0sInJvbGVzIjpbImFkbWluIiwib3BzIl19.c2lnbmF0dXJl";

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function formatTimestampClaim(value: unknown): string | null {
  if (typeof value !== "number") {
    return null;
  }

  const date = new Date(value * 1000);

  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

function getJwtState(token: string): JwtState {
  const trimmed = token.trim();

  if (!trimmed) {
    return { status: "empty" };
  }

  const parts = trimmed.split(".");

  if (parts.length !== 3) {
    return {
      status: "invalid",
      message: "JWTs must contain header, payload, and signature segments.",
    };
  }

  try {
    const header = JSON.parse(decodeBase64Url(parts[0])) as Record<string, unknown>;
    const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
    const warnings: string[] = [];

    if (header.alg === "none") {
      warnings.push("The token declares alg=none and carries no cryptographic signature.");
    }

    const expLabel = formatTimestampClaim(payload.exp);

    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      warnings.push(`The exp claim is in the past (${expLabel ?? "expired"}).`);
    }

    if (typeof payload.nbf === "number" && payload.nbf * 1000 > Date.now()) {
      warnings.push("The nbf claim is in the future, so the token is not active yet.");
    }

    return {
      status: "valid",
      headerJson: JSON.stringify(header, null, 2),
      payloadJson: JSON.stringify(payload, null, 2),
      signature: parts[2],
      warnings,
    };
  } catch (error) {
    return {
      status: "invalid",
      message: error instanceof Error ? error.message : "JWT decoding failed.",
    };
  }
}

export default function JwtDecoder() {
  const [token, setToken] = useState<string>(SAMPLE_JWT);
  const jwtState = useMemo(() => getJwtState(token), [token]);
  const tokenParts = token.trim() ? token.trim().split(".").length : 0;

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Data & Encoding
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">JWT Decoder</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Inspect JWT headers and claims locally. This tool decodes tokens and flags obvious
              issues, but it does not verify signatures.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <ToolActionButton onClick={() => setToken(SAMPLE_JWT)}>Load example token</ToolActionButton>
              <ToolActionButton onClick={() => setToken("")}>Clear</ToolActionButton>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Inspection status</p>
            <div className="mt-4 grid gap-4">
              <div
                className={`rounded-xl border px-4 py-4 ${
                  jwtState.status === "valid"
                    ? "border-emerald-700 bg-emerald-950/20"
                    : jwtState.status === "invalid"
                      ? "border-rose-800 bg-rose-950/20"
                      : "border-slate-800 bg-slate-950/80"
                }`}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Result</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {jwtState.status === "valid"
                    ? "Decoded token"
                    : jwtState.status === "invalid"
                      ? "Invalid token"
                      : "Waiting for token"}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Segments</div>
                  <div className="mt-2 text-lg font-semibold text-white">{tokenParts || "-"}</div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Warnings</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {jwtState.status === "valid" ? jwtState.warnings.length : "-"}
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Verification</div>
                <div className="mt-2 text-sm text-slate-300">
                  Signature verification is intentionally not part of this page.
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Token input</h2>
              <p className="mt-2 text-sm text-slate-400">
                Paste a full JWT in compact serialization form.
              </p>
            </div>
            <CopyButton label="JWT" value={token} />
          </div>

          <ToolTextarea
            value={token}
            onChange={(event) => setToken(event.target.value)}
            rows={10}
            spellCheck={false}
          />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Warnings</h2>
          <div className="mt-4 grid gap-3">
            {jwtState.status === "empty" ? (
              <div className={`${cardClass} text-sm text-slate-400`}>Paste a token to inspect it.</div>
            ) : jwtState.status === "invalid" ? (
              <div className="rounded-xl border border-rose-800 bg-rose-950/20 px-4 py-4 text-sm text-rose-100">
                {jwtState.message}
              </div>
            ) : jwtState.warnings.length ? (
              jwtState.warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-xl border border-amber-700 bg-amber-950/20 px-4 py-4 text-sm text-amber-100"
                >
                  {warning}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-emerald-700 bg-emerald-950/20 px-4 py-4 text-sm text-emerald-100">
                No obvious warnings from the decoded claims.
              </div>
            )}
          </div>
        </section>
      </section>

      {jwtState.status === "valid" ? (
        <section className="grid gap-6 xl:grid-cols-3">
          <OutputCard
            label="Header"
            description="Decoded JOSE header JSON."
            value={jwtState.headerJson}
          />
          <OutputCard
            label="Payload"
            description="Decoded claims payload JSON."
            value={jwtState.payloadJson}
          />
          <OutputCard
            label="Signature"
            description="Raw signature segment from the compact token."
            value={jwtState.signature}
          />
        </section>
      ) : null}
    </div>
  );
}
