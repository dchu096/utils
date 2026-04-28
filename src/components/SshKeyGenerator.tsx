import { useMemo, useState } from "react";
import {
  CopyButton,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type KeyPreset = "rsa-2048" | "rsa-4096";

type GeneratedKeyPair = {
  comment: string;
  createdAt: string;
  fingerprint: string;
  modulusLength: number;
  privateKeyPem: string;
  publicKeyOpenSsh: string;
  publicKeyPem: string;
};

type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { result: GeneratedKeyPair; status: "ready" };

const KEY_PRESETS: Array<{
  description: string;
  label: string;
  modulusLength: number;
  value: KeyPreset;
}> = [
  {
    value: "rsa-2048",
    label: "RSA 2048",
    modulusLength: 2048,
    description: "Smaller key, faster to generate.",
  },
  {
    value: "rsa-4096",
    label: "RSA 4096",
    modulusLength: 4096,
    description: "Larger key, more common for long-lived access.",
  },
];

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function encodeUint32(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

function encodeSshString(value: Uint8Array | string): Uint8Array {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return concatBytes([encodeUint32(bytes.length), bytes]);
}

function normalizeMpint(bytes: Uint8Array): Uint8Array {
  let start = 0;

  while (start < bytes.length - 1 && bytes[start] === 0) {
    start += 1;
  }

  const trimmed = bytes.slice(start);

  if (trimmed[0] && (trimmed[0] & 0x80) !== 0) {
    return concatBytes([new Uint8Array([0]), trimmed]);
  }

  return trimmed;
}

function encodeSshMpint(bytes: Uint8Array): Uint8Array {
  const normalized = normalizeMpint(bytes);
  return concatBytes([encodeUint32(normalized.length), normalized]);
}

function pemEncode(label: string, bytes: Uint8Array): string {
  const base64 = bytesToBase64(bytes);
  const lines = base64.match(/.{1,64}/g) ?? [];

  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

async function generateRsaKeyPair(
  modulusLength: number,
  comment: string,
): Promise<GeneratedKeyPair> {
  if (!window.crypto?.subtle) {
    throw new Error("Web Crypto is not available in this browser.");
  }

  const keyPair = (await window.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  const [privateKeyBuffer, publicKeyBuffer, publicJwk] = await Promise.all([
    window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    window.crypto.subtle.exportKey("spki", keyPair.publicKey),
    window.crypto.subtle.exportKey("jwk", keyPair.publicKey) as Promise<JsonWebKey>,
  ]);

  if (!publicJwk.e || !publicJwk.n) {
    throw new Error("The browser could not export the generated key.");
  }

  const exponent = base64UrlToBytes(publicJwk.e);
  const modulus = base64UrlToBytes(publicJwk.n);
  const sshBlob = concatBytes([
    encodeSshString("ssh-rsa"),
    encodeSshMpint(exponent),
    encodeSshMpint(modulus),
  ]);
  const fingerprintBytes = new Uint8Array(await window.crypto.subtle.digest("SHA-256", sshBlob));
  const trimmedComment = comment.trim();

  return {
    modulusLength,
    comment: trimmedComment,
    createdAt: new Date().toLocaleString(),
    fingerprint: `SHA256:${bytesToBase64(fingerprintBytes).replace(/=+$/g, "")}`,
    publicKeyOpenSsh: `ssh-rsa ${bytesToBase64(sshBlob)}${trimmedComment ? ` ${trimmedComment}` : ""}`,
    publicKeyPem: pemEncode("PUBLIC KEY", new Uint8Array(publicKeyBuffer)),
    privateKeyPem: pemEncode("PRIVATE KEY", new Uint8Array(privateKeyBuffer)),
  };
}

export default function SshKeyGenerator() {
  const [keyPreset, setKeyPreset] = useState<KeyPreset>("rsa-4096");
  const [comment, setComment] = useState<string>("generated@dchu096.tk");
  const [generationState, setGenerationState] = useState<GenerationState>({ status: "idle" });

  const selectedPreset = useMemo(
    () => KEY_PRESETS.find((preset) => preset.value === keyPreset) ?? KEY_PRESETS[1],
    [keyPreset],
  );

  const handleGenerate = async (): Promise<void> => {
    setGenerationState({ status: "loading" });

    try {
      const result = await generateRsaKeyPair(selectedPreset.modulusLength, comment);
      setGenerationState({ status: "ready", result });
    } catch (error) {
      setGenerationState({
        status: "error",
        message: error instanceof Error ? error.message : "SSH key generation failed.",
      });
    }
  };

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Data & Encoding
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">SSH Key Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Generate an RSA SSH key pair in the browser, copy the OpenSSH public key, and keep
              the private key only long enough to store it yourself.
            </p>

            <div className="mt-5 rounded-xl border border-amber-700 bg-amber-950/20 px-4 py-4 text-sm leading-6 text-amber-100">
              Browser only. Keys are generated locally, are not saved, and disappear when this page
              is refreshed.
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Generation status</p>
            <div className="mt-4 grid gap-4">
              <div
                className={`rounded-xl border px-4 py-4 ${
                  generationState.status === "ready"
                    ? "border-emerald-700 bg-emerald-950/20"
                    : generationState.status === "error"
                      ? "border-rose-800 bg-rose-950/20"
                      : generationState.status === "loading"
                        ? "border-cyan-700 bg-cyan-950/20"
                        : "border-slate-800 bg-slate-950/80"
                }`}
              >
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Result</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {generationState.status === "ready"
                    ? "Key pair generated"
                    : generationState.status === "error"
                      ? "Generation failed"
                      : generationState.status === "loading"
                        ? "Generating key pair"
                        : "Ready to generate"}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Algorithm</div>
                  <div className="mt-2 text-lg font-semibold text-white">{selectedPreset.label}</div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Saved</div>
                  <div className="mt-2 text-lg font-semibold text-white">No</div>
                </div>
              </div>

              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Fingerprint</div>
                <div className="mt-2 break-all font-mono text-xs text-slate-200">
                  {generationState.status === "ready" ? generationState.result.fingerprint : "Generate a key pair to view the fingerprint."}
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
              <h2 className="text-lg font-semibold text-white">Options</h2>
              <p className="mt-2 text-sm text-slate-400">
                Choose a key size, set an optional comment, then generate a fresh pair.
              </p>
            </div>
            <div className="flex gap-2">
              <ToolActionButton onClick={handleGenerate} disabled={generationState.status === "loading"}>
                {generationState.status === "loading" ? "Generating..." : "Generate key pair"}
              </ToolActionButton>
              <ToolActionButton onClick={() => setGenerationState({ status: "idle" })}>
                Clear
              </ToolActionButton>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {KEY_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setKeyPreset(preset.value)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    keyPreset === preset.value
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{preset.label}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{preset.description}</div>
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="ssh-comment" className="text-sm font-medium text-slate-200">
                Public key comment
              </label>
              <input
                id="ssh-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="name@host"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Details</h2>
          <div className="mt-4 grid gap-4">
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Storage</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Generated keys stay in browser memory only. Refreshing the page clears them.
              </div>
            </div>

            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Private key format</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Exported as PKCS#8 PEM so it can be copied and stored immediately.
              </div>
            </div>

            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Created</div>
              <div className="mt-2 text-sm text-slate-300">
                {generationState.status === "ready" ? generationState.result.createdAt : "Not generated yet"}
              </div>
            </div>
          </div>
        </section>
      </section>

      {generationState.status === "error" ? (
        <section className="rounded-2xl border border-rose-800 bg-rose-950/20 px-4 py-4 text-sm text-rose-100">
          {generationState.message}
        </section>
      ) : null}

      {generationState.status === "ready" ? (
        <section className="grid gap-6">
          <section className={primaryPanelClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">OpenSSH public key</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Use this in `authorized_keys` or wherever an OpenSSH public key is required.
                </p>
              </div>
              <CopyButton label="OpenSSH public key" value={generationState.result.publicKeyOpenSsh} />
            </div>

            <ToolTextarea
              readOnly
              value={generationState.result.publicKeyOpenSsh}
              rows={6}
              spellCheck={false}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Private key</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Copy and store this now. It is not kept after refresh.
                  </p>
                </div>
                <CopyButton label="Private key" value={generationState.result.privateKeyPem} />
              </div>

              <ToolTextarea
                readOnly
                value={generationState.result.privateKeyPem}
                rows={20}
                spellCheck={false}
              />
            </section>

            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Public key PEM</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    PEM export for tools that expect a standard public key block.
                  </p>
                </div>
                <CopyButton label="Public key PEM" value={generationState.result.publicKeyPem} />
              </div>

              <ToolTextarea
                readOnly
                value={generationState.result.publicKeyPem}
                rows={12}
                spellCheck={false}
              />
            </section>
          </section>
        </section>
      ) : null}
    </div>
  );
}
