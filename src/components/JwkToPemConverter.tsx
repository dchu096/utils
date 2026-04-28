import { useState } from "react";
import {
  CopyButton,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";
import {
  derivePublicJwk,
  getJwkFamily,
  getOpenSshFingerprint,
  privateJwkToOpenSshPrivate,
  privateJwkToPem,
  publicJwkToOpenSshPublic,
  publicJwkToOpenSshPublicBlob,
  publicJwkToPem,
} from "../utils/keys";

type ConversionResult = {
  detectedType: string;
  fingerprint?: string;
  openSshPrivate?: string;
  openSshPublic: string;
  privatePem?: string;
  publicPem: string;
  publicJwkJson: string;
};

type ConversionState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { result: ConversionResult; status: "ready" };

async function convertJwk(input: string, comment: string): Promise<ConversionResult> {
  const parsed = JSON.parse(input) as JsonWebKey;
  const family = getJwkFamily(parsed);

  if (!family) {
    throw new Error("Only RSA, ECDSA, and Ed25519 JWKs are supported.");
  }

  const isPrivate = typeof parsed.d === "string";
  const publicJwk = isPrivate ? derivePublicJwk(parsed) : parsed;
  const publicBlob = publicJwkToOpenSshPublicBlob(publicJwk);

  return {
    detectedType: isPrivate ? `${family} private JWK` : `${family} public JWK`,
    publicJwkJson: JSON.stringify(publicJwk, null, 2),
    publicPem: await publicJwkToPem(publicJwk),
    openSshPublic: publicJwkToOpenSshPublic(publicJwk, comment),
    fingerprint: await getOpenSshFingerprint(publicBlob),
    privatePem: isPrivate ? await privateJwkToPem(parsed) : undefined,
    openSshPrivate: isPrivate ? privateJwkToOpenSshPrivate(parsed, comment) : undefined,
  };
}

export default function JwkToPemConverter() {
  const [input, setInput] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [conversionState, setConversionState] = useState<ConversionState>({ status: "idle" });

  const handleConvert = async (): Promise<void> => {
    if (!input.trim()) {
      setConversionState({
        status: "error",
        message: "Paste a JWK first.",
      });
      return;
    }

    setConversionState({ status: "loading" });

    try {
      setConversionState({
        status: "ready",
        result: await convertJwk(input, comment),
      });
    } catch (error) {
      setConversionState({
        status: "error",
        message: error instanceof Error ? error.message : "JWK conversion failed.",
      });
    }
  };

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Security & PKI</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">JWK to PEM Convert</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Convert supported JWK inputs into PEM blocks and SSH-friendly public output directly in the browser.
            </p>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conversion status</p>
            <div className="mt-4 grid gap-4">
              <div
                className={`rounded-xl border px-4 py-4 ${
                  conversionState.status === "ready"
                    ? "border-emerald-700 bg-emerald-950/20"
                    : conversionState.status === "error"
                      ? "border-rose-800 bg-rose-950/20"
                      : conversionState.status === "loading"
                        ? "border-cyan-700 bg-cyan-950/20"
                        : "border-slate-800 bg-slate-950/80"
                }`}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Result</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {conversionState.status === "ready"
                    ? "JWK converted"
                    : conversionState.status === "error"
                      ? "Conversion failed"
                      : conversionState.status === "loading"
                        ? "Converting JWK"
                        : "Ready to convert"}
                </div>
              </div>

              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Supported input</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  RSA, ECDSA, and Ed25519 JWKs. Private JWKs also produce private PEM and OpenSSH private output.
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
              <h2 className="text-lg font-semibold text-white">JWK input</h2>
              <p className="mt-2 text-sm text-slate-400">Paste a JSON Web Key object to convert it.</p>
            </div>
            <div className="flex gap-2">
              <ToolActionButton onClick={handleConvert} disabled={conversionState.status === "loading"}>
                {conversionState.status === "loading" ? "Converting..." : "Convert"}
              </ToolActionButton>
              <ToolActionButton onClick={() => setInput("")}>Clear</ToolActionButton>
            </div>
          </div>

          <ToolTextarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={18}
            spellCheck={false}
            placeholder='{"kty":"OKP","crv":"Ed25519","x":"...","d":"..."}'
          />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Options</h2>
          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor="jwk-convert-comment" className="text-sm font-medium text-slate-200">
                OpenSSH comment
              </label>
              <input
                id="jwk-convert-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="name@host"
                className={inputClass}
              />
            </div>

            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">PEM output</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Public JWKs generate SPKI PEM. Private JWKs generate both SPKI and PKCS#8 PEM blocks.
              </div>
            </div>
          </div>
        </section>
      </section>

      {conversionState.status === "error" ? (
        <section className="rounded-2xl border border-rose-800 bg-rose-950/20 px-4 py-4 text-sm text-rose-100">
          {conversionState.message}
        </section>
      ) : null}

      {conversionState.status === "ready" ? (
        <section className="grid gap-6">
          <section className={primaryPanelClass}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Detected type</div>
                <div className="mt-2 text-sm font-semibold text-white">{conversionState.result.detectedType}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Fingerprint</div>
                <div className="mt-2 break-all font-mono text-xs text-slate-200">
                  {conversionState.result.fingerprint ?? "Not available"}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">OpenSSH public key</h2>
                  <p className="mt-2 text-sm text-slate-400">Useful when the source JWK belongs to an SSH-capable algorithm.</p>
                </div>
                <CopyButton label="OpenSSH public key" value={conversionState.result.openSshPublic} />
              </div>
              <ToolTextarea readOnly value={conversionState.result.openSshPublic} rows={6} spellCheck={false} />
            </section>

            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Public key PEM</h2>
                  <p className="mt-2 text-sm text-slate-400">SPKI PEM output derived from the input JWK.</p>
                </div>
                <CopyButton label="Public key PEM" value={conversionState.result.publicPem} />
              </div>
              <ToolTextarea readOnly value={conversionState.result.publicPem} rows={12} spellCheck={false} />
            </section>
          </section>

          <section className={primaryPanelClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Public JWK</h2>
                <p className="mt-2 text-sm text-slate-400">Public-only JWK normalized from the input.</p>
              </div>
              <CopyButton label="Public JWK" value={conversionState.result.publicJwkJson} />
            </div>
            <ToolTextarea readOnly value={conversionState.result.publicJwkJson} rows={14} spellCheck={false} />
          </section>

          {conversionState.result.privatePem ? (
            <section className="grid gap-6 xl:grid-cols-2">
              <section className={primaryPanelClass}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Private key PEM</h2>
                    <p className="mt-2 text-sm text-slate-400">PKCS#8 PEM generated from the input private JWK.</p>
                  </div>
                  <CopyButton label="Private key PEM" value={conversionState.result.privatePem} />
                </div>
                <ToolTextarea readOnly value={conversionState.result.privatePem} rows={18} spellCheck={false} />
              </section>

              <section className={primaryPanelClass}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">OpenSSH private key</h2>
                    <p className="mt-2 text-sm text-slate-400">Convenience export when the JWK should also be used with SSH tooling.</p>
                  </div>
                  <CopyButton label="OpenSSH private key" value={conversionState.result.openSshPrivate ?? ""} />
                </div>
                <ToolTextarea readOnly value={conversionState.result.openSshPrivate ?? ""} rows={18} spellCheck={false} />
              </section>
            </section>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
