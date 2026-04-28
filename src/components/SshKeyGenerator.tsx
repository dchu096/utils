import { useMemo, useState } from "react";
import {
  CopyButton,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type SupportedAlgorithmId = "ecdsa" | "ed25519" | "rsa";
type AlgorithmId = SupportedAlgorithmId | "dsa";
type KeyPreset = "ecdsa-p256" | "ecdsa-p384" | "ecdsa-p521" | "ed25519" | "rsa-2048" | "rsa-4096";

type GeneratedKeyPair = {
  algorithmLabel: string;
  comment: string;
  createdAt: string;
  fingerprint: string;
  privateKeyPem: string;
  publicKeyOpenSsh: string;
  publicKeyPem: string;
  variantLabel: string;
};

type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { result: GeneratedKeyPair; status: "ready" };

type AlgorithmOption = {
  badgeLabel: string;
  badgeTone: string;
  description: string;
  id: AlgorithmId;
  label: string;
  supported: boolean;
};

type PresetOption = {
  algorithmId: SupportedAlgorithmId;
  description: string;
  label: string;
  value: KeyPreset;
};

const ALGORITHMS: AlgorithmOption[] = [
  {
    id: "ed25519",
    label: "ED25519",
    description: "Modern default for SSH keys.",
    badgeLabel: "Best",
    badgeTone: "text-emerald-300",
    supported: true,
  },
  {
    id: "rsa",
    label: "RSA",
    description: "Common and broadly compatible.",
    badgeLabel: "Common",
    badgeTone: "text-amber-300",
    supported: true,
  },
  {
    id: "ecdsa",
    label: "ECDSA",
    description: "Smaller keys with named curves.",
    badgeLabel: "EC",
    badgeTone: "text-sky-300",
    supported: true,
  },
  {
    id: "dsa",
    label: "DSA",
    description: "Deprecated and not generated here.",
    badgeLabel: "Deprecated",
    badgeTone: "text-orange-300",
    supported: false,
  },
];

const PRESETS: PresetOption[] = [
  {
    algorithmId: "ed25519",
    value: "ed25519",
    label: "Ed25519",
    description: "Single fixed-size curve. No size selection needed.",
  },
  {
    algorithmId: "rsa",
    value: "rsa-2048",
    label: "RSA 2048",
    description: "Smaller and faster to generate.",
  },
  {
    algorithmId: "rsa",
    value: "rsa-4096",
    label: "RSA 4096",
    description: "Larger key for long-lived access.",
  },
  {
    algorithmId: "ecdsa",
    value: "ecdsa-p256",
    label: "P-256",
    description: "Fastest ECDSA curve with broad support.",
  },
  {
    algorithmId: "ecdsa",
    value: "ecdsa-p384",
    label: "P-384",
    description: "Balanced curve for stronger security margins.",
  },
  {
    algorithmId: "ecdsa",
    value: "ecdsa-p521",
    label: "P-521",
    description: "Largest standard ECDSA curve.",
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

async function getFingerprint(sshBlob: Uint8Array): Promise<string> {
  const fingerprintBytes = new Uint8Array(await window.crypto.subtle.digest("SHA-256", sshBlob));
  return `SHA256:${bytesToBase64(fingerprintBytes).replace(/=+$/g, "")}`;
}

function getCommentSuffix(comment: string): string {
  const trimmed = comment.trim();
  return trimmed ? ` ${trimmed}` : "";
}

async function generateRsaKeyPair(
  modulusLength: number,
  comment: string,
): Promise<GeneratedKeyPair> {
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
    throw new Error("The browser could not export the generated RSA key.");
  }

  const exponent = base64UrlToBytes(publicJwk.e);
  const modulus = base64UrlToBytes(publicJwk.n);
  const sshBlob = concatBytes([
    encodeSshString("ssh-rsa"),
    encodeSshMpint(exponent),
    encodeSshMpint(modulus),
  ]);
  const trimmedComment = comment.trim();

  return {
    algorithmLabel: "RSA",
    variantLabel: `RSA ${modulusLength}`,
    comment: trimmedComment,
    createdAt: new Date().toLocaleString(),
    fingerprint: await getFingerprint(sshBlob),
    publicKeyOpenSsh: `ssh-rsa ${bytesToBase64(sshBlob)}${getCommentSuffix(comment)}`,
    publicKeyPem: pemEncode("PUBLIC KEY", new Uint8Array(publicKeyBuffer)),
    privateKeyPem: pemEncode("PRIVATE KEY", new Uint8Array(privateKeyBuffer)),
  };
}

async function generateEcdsaKeyPair(
  namedCurve: "P-256" | "P-384" | "P-521",
  comment: string,
): Promise<GeneratedKeyPair> {
  const curveMap = {
    "P-256": { sshCurve: "nistp256", sshLabel: "ecdsa-sha2-nistp256" },
    "P-384": { sshCurve: "nistp384", sshLabel: "ecdsa-sha2-nistp384" },
    "P-521": { sshCurve: "nistp521", sshLabel: "ecdsa-sha2-nistp521" },
  } as const;

  const curveInfo = curveMap[namedCurve];
  const keyPair = (await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve,
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  const [privateKeyBuffer, publicKeyBuffer, publicJwk] = await Promise.all([
    window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    window.crypto.subtle.exportKey("spki", keyPair.publicKey),
    window.crypto.subtle.exportKey("jwk", keyPair.publicKey) as Promise<JsonWebKey>,
  ]);

  if (!publicJwk.x || !publicJwk.y) {
    throw new Error("The browser could not export the generated ECDSA key.");
  }

  const point = concatBytes([
    new Uint8Array([4]),
    base64UrlToBytes(publicJwk.x),
    base64UrlToBytes(publicJwk.y),
  ]);
  const sshBlob = concatBytes([
    encodeSshString(curveInfo.sshLabel),
    encodeSshString(curveInfo.sshCurve),
    encodeSshString(point),
  ]);
  const trimmedComment = comment.trim();

  return {
    algorithmLabel: "ECDSA",
    variantLabel: namedCurve,
    comment: trimmedComment,
    createdAt: new Date().toLocaleString(),
    fingerprint: await getFingerprint(sshBlob),
    publicKeyOpenSsh: `${curveInfo.sshLabel} ${bytesToBase64(sshBlob)}${getCommentSuffix(comment)}`,
    publicKeyPem: pemEncode("PUBLIC KEY", new Uint8Array(publicKeyBuffer)),
    privateKeyPem: pemEncode("PRIVATE KEY", new Uint8Array(privateKeyBuffer)),
  };
}

async function generateEd25519KeyPair(comment: string): Promise<GeneratedKeyPair> {
  const keyPair = (await window.crypto.subtle.generateKey(
    {
      name: "Ed25519",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  const [privateKeyBuffer, publicKeyBuffer, rawPublicKey, publicJwk] = await Promise.all([
    window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    window.crypto.subtle.exportKey("spki", keyPair.publicKey),
    window.crypto.subtle.exportKey("raw", keyPair.publicKey).catch(() => null),
    window.crypto.subtle.exportKey("jwk", keyPair.publicKey) as Promise<JsonWebKey>,
  ]);

  const publicKeyBytes =
    rawPublicKey instanceof ArrayBuffer
      ? new Uint8Array(rawPublicKey)
      : publicJwk.x
        ? base64UrlToBytes(publicJwk.x)
        : null;

  if (!publicKeyBytes) {
    throw new Error("The browser could not export the generated Ed25519 key.");
  }

  const sshBlob = concatBytes([
    encodeSshString("ssh-ed25519"),
    encodeSshString(publicKeyBytes),
  ]);
  const trimmedComment = comment.trim();

  return {
    algorithmLabel: "ED25519",
    variantLabel: "Ed25519",
    comment: trimmedComment,
    createdAt: new Date().toLocaleString(),
    fingerprint: await getFingerprint(sshBlob),
    publicKeyOpenSsh: `ssh-ed25519 ${bytesToBase64(sshBlob)}${getCommentSuffix(comment)}`,
    publicKeyPem: pemEncode("PUBLIC KEY", new Uint8Array(publicKeyBuffer)),
    privateKeyPem: pemEncode("PRIVATE KEY", new Uint8Array(privateKeyBuffer)),
  };
}

async function generateKeyPair(preset: KeyPreset, comment: string): Promise<GeneratedKeyPair> {
  if (!window.crypto?.subtle) {
    throw new Error("Web Crypto is not available in this browser.");
  }

  switch (preset) {
    case "ed25519":
      return generateEd25519KeyPair(comment);
    case "rsa-2048":
      return generateRsaKeyPair(2048, comment);
    case "rsa-4096":
      return generateRsaKeyPair(4096, comment);
    case "ecdsa-p256":
      return generateEcdsaKeyPair("P-256", comment);
    case "ecdsa-p384":
      return generateEcdsaKeyPair("P-384", comment);
    case "ecdsa-p521":
      return generateEcdsaKeyPair("P-521", comment);
  }
}

function getDefaultPresetForAlgorithm(algorithmId: SupportedAlgorithmId): KeyPreset {
  switch (algorithmId) {
    case "ed25519":
      return "ed25519";
    case "rsa":
      return "rsa-4096";
    case "ecdsa":
      return "ecdsa-p256";
  }
}

export default function SshKeyGenerator() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmId>("ed25519");
  const [selectedPreset, setSelectedPreset] = useState<KeyPreset>("ed25519");
  const [comment, setComment] = useState<string>("generated@dchu096.tk");
  const [generationState, setGenerationState] = useState<GenerationState>({ status: "idle" });

  const availablePresets = useMemo(
    () =>
      PRESETS.filter(
        (preset) => preset.algorithmId === selectedAlgorithm,
      ),
    [selectedAlgorithm],
  );

  const selectedPresetInfo = useMemo(
    () => PRESETS.find((preset) => preset.value === selectedPreset) ?? PRESETS[0],
    [selectedPreset],
  );

  const handleAlgorithmSelect = (algorithmId: AlgorithmId): void => {
    setSelectedAlgorithm(algorithmId);
    setGenerationState({ status: "idle" });

    if (algorithmId !== "dsa") {
      setSelectedPreset(getDefaultPresetForAlgorithm(algorithmId));
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (selectedAlgorithm === "dsa") {
      setGenerationState({
        status: "error",
        message: "DSA is deprecated and is not generated by this tool.",
      });
      return;
    }

    setGenerationState({ status: "loading" });

    try {
      const result = await generateKeyPair(selectedPreset, comment);
      setGenerationState({ status: "ready", result });
    } catch (error) {
      setGenerationState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "SSH key generation failed.",
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
              Generate ED25519, RSA, or ECDSA SSH keys in the browser and copy the OpenSSH and PEM
              outputs immediately.
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
                  <div className="mt-2 text-lg font-semibold text-white">
                    {ALGORITHMS.find((entry) => entry.id === selectedAlgorithm)?.label ?? "-"}
                  </div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Variant</div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {selectedAlgorithm === "dsa" ? "Not available" : selectedPresetInfo.label}
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Fingerprint</div>
                <div className="mt-2 break-all font-mono text-xs text-slate-200">
                  {generationState.status === "ready"
                    ? generationState.result.fingerprint
                    : "Generate a key pair to view the fingerprint."}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className={primaryPanelClass}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Algorithm</h2>
            <p className="mt-2 text-sm text-slate-400">
              Choose the SSH key type first, then select the matching size or curve.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ALGORITHMS.map((algorithm) => {
            const isActive = selectedAlgorithm === algorithm.id;

            return (
              <button
                key={algorithm.id}
                type="button"
                onClick={() => handleAlgorithmSelect(algorithm.id)}
                className={`rounded-2xl border px-5 py-5 text-left transition ${
                  isActive
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-lg font-semibold text-white">{algorithm.label}</div>
                  <span className={`text-xs font-medium uppercase tracking-[0.16em] ${algorithm.badgeTone}`}>
                    {algorithm.badgeLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{algorithm.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Options</h2>
              <p className="mt-2 text-sm text-slate-400">
                {selectedAlgorithm === "dsa"
                  ? "DSA is shown for reference only and is not generated here."
                  : "Set the size or curve, choose a comment, then generate a fresh key pair."}
              </p>
            </div>
            <div className="flex gap-2">
              <ToolActionButton
                onClick={handleGenerate}
                disabled={generationState.status === "loading" || selectedAlgorithm === "dsa"}
              >
                {generationState.status === "loading" ? "Generating..." : "Generate key pair"}
              </ToolActionButton>
              <ToolActionButton onClick={() => setGenerationState({ status: "idle" })}>
                Clear
              </ToolActionButton>
            </div>
          </div>

          {selectedAlgorithm !== "dsa" ? (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {availablePresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedPreset(preset.value)}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      selectedPreset === preset.value
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
          ) : (
            <div className="mt-5 rounded-xl border border-orange-700 bg-orange-950/20 px-4 py-4 text-sm text-orange-100">
              SSH DSA keys are deprecated and are intentionally not generated by this tool.
            </div>
          )}
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
                Private keys are exported as PKCS#8 PEM for immediate copy and storage.
              </div>
            </div>

            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Browser support</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                ED25519 and ECDSA depend on Web Crypto support in the current browser. If a type is
                unsupported, generation will fail with a message instead of producing a bad key.
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
                  Use this in `authorized_keys` or any tool that expects an OpenSSH public key.
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
                    Standard PEM export for tools that do not accept OpenSSH public key format.
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
