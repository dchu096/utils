import { useMemo, useState } from "react";
import {
  CopyButton,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";
import {
  getOpenSshFingerprint,
  publicJwkToOpenSshPublic,
  publicJwkToOpenSshPublicBlob,
  publicJwkToPem,
  privateJwkToPem,
} from "../utils/keys";

type KeyPreset = "ecdsa-p256" | "ecdsa-p384" | "ecdsa-p521" | "ed25519" | "rsa-2048" | "rsa-4096";

type GeneratedSet = {
  fingerprint: string;
  openSshPublic: string;
  privateJwkJson: string;
  privatePem: string;
  publicJwkJson: string;
  publicPem: string;
  variantLabel: string;
};

type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { result: GeneratedSet; status: "ready" };

const PRESETS: Array<{
  description: string;
  label: string;
  value: KeyPreset;
}> = [
  { value: "ed25519", label: "Ed25519", description: "Modern JWK for signing and SSH-style keys." },
  { value: "rsa-2048", label: "RSA 2048", description: "Smaller RSA signing key." },
  { value: "rsa-4096", label: "RSA 4096", description: "Larger RSA signing key." },
  { value: "ecdsa-p256", label: "P-256", description: "Compact EC key with broad support." },
  { value: "ecdsa-p384", label: "P-384", description: "Stronger EC curve." },
  { value: "ecdsa-p521", label: "P-521", description: "Largest standard ECDSA curve." },
];

async function generateSet(preset: KeyPreset, comment: string): Promise<GeneratedSet> {
  const keyPair =
    preset === "ed25519"
      ? ((await window.crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair)
      : preset.startsWith("rsa")
        ? ((await window.crypto.subtle.generateKey(
            {
              name: "RSASSA-PKCS1-v1_5",
              modulusLength: preset === "rsa-2048" ? 2048 : 4096,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: "SHA-256",
            },
            true,
            ["sign", "verify"],
          )) as CryptoKeyPair)
        : ((await window.crypto.subtle.generateKey(
            {
              name: "ECDSA",
              namedCurve:
                preset === "ecdsa-p256" ? "P-256" : preset === "ecdsa-p384" ? "P-384" : "P-521",
            },
            true,
            ["sign", "verify"],
          )) as CryptoKeyPair);

  const [privateJwk, publicJwk] = (await Promise.all([
    window.crypto.subtle.exportKey("jwk", keyPair.privateKey) as Promise<JsonWebKey>,
    window.crypto.subtle.exportKey("jwk", keyPair.publicKey) as Promise<JsonWebKey>,
  ])) as [JsonWebKey, JsonWebKey];
  const publicBlob = publicJwkToOpenSshPublicBlob(publicJwk);

  return {
    variantLabel:
      preset === "ed25519"
        ? "Ed25519"
        : preset === "rsa-2048"
          ? "RSA 2048"
          : preset === "rsa-4096"
            ? "RSA 4096"
            : preset === "ecdsa-p256"
              ? "ECDSA P-256"
              : preset === "ecdsa-p384"
                ? "ECDSA P-384"
                : "ECDSA P-521",
    privateJwkJson: JSON.stringify(privateJwk, null, 2),
    publicJwkJson: JSON.stringify(publicJwk, null, 2),
    privatePem: await privateJwkToPem(privateJwk),
    publicPem: await publicJwkToPem(publicJwk),
    openSshPublic: publicJwkToOpenSshPublic(publicJwk, comment),
    fingerprint: await getOpenSshFingerprint(publicBlob),
  };
}

export default function JwkGenerator() {
  const [selectedPreset, setSelectedPreset] = useState<KeyPreset>("ed25519");
  const [comment, setComment] = useState<string>("generated@dchu096.tk");
  const [generationState, setGenerationState] = useState<GenerationState>({ status: "idle" });

  const selectedPresetInfo = useMemo(
    () => PRESETS.find((preset) => preset.value === selectedPreset) ?? PRESETS[0],
    [selectedPreset],
  );

  const handleGenerate = async (): Promise<void> => {
    setGenerationState({ status: "loading" });

    try {
      setGenerationState({
        status: "ready",
        result: await generateSet(selectedPreset, comment),
      });
    } catch (error) {
      setGenerationState({
        status: "error",
        message: error instanceof Error ? error.message : "JWK generation failed.",
      });
    }
  };

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Security & PKI</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">JWK Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Generate browser-side key pairs and export them as JWK, PEM, and OpenSSH public keys.
            </p>

            <div className="mt-5 rounded-xl border border-amber-700 bg-amber-950/20 px-4 py-4 text-sm leading-6 text-amber-100">
              Browser only. Generated keys are not saved and disappear when this page is refreshed.
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
                        ? "Generating JWK set"
                        : "Ready to generate"}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Preset</div>
                  <div className="mt-2 text-lg font-semibold text-white">{selectedPresetInfo.label}</div>
                </div>
                <div className={cardClass}>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Fingerprint</div>
                  <div className="mt-2 break-all font-mono text-xs text-slate-200">
                    {generationState.status === "ready" ? generationState.result.fingerprint : "Generate a key pair to view it."}
                  </div>
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
              <p className="mt-2 text-sm text-slate-400">Choose a preset and optional comment, then generate a fresh JWK pair.</p>
            </div>
            <div className="flex gap-2">
              <ToolActionButton onClick={handleGenerate} disabled={generationState.status === "loading"}>
                {generationState.status === "loading" ? "Generating..." : "Generate JWK pair"}
              </ToolActionButton>
              <ToolActionButton onClick={() => setGenerationState({ status: "idle" })}>Clear</ToolActionButton>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {PRESETS.map((preset) => (
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
              <label htmlFor="jwk-comment" className="text-sm font-medium text-slate-200">
                OpenSSH public key comment
              </label>
              <input
                id="jwk-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="name@host"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Outputs</h2>
          <div className="mt-4 grid gap-4">
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Private key format</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">Private keys are exported as JWK JSON and PKCS#8 PEM.</div>
            </div>
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Public key format</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">Public keys are exported as JWK JSON, PEM, and OpenSSH public text.</div>
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
                <p className="mt-2 text-sm text-slate-400">Ready for `authorized_keys` and other SSH consumers.</p>
              </div>
              <CopyButton label="OpenSSH public key" value={generationState.result.openSshPublic} />
            </div>

            <ToolTextarea readOnly value={generationState.result.openSshPublic} rows={5} spellCheck={false} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Private JWK</h2>
                  <p className="mt-2 text-sm text-slate-400">JSON Web Key with private material included.</p>
                </div>
                <CopyButton label="Private JWK" value={generationState.result.privateJwkJson} />
              </div>
              <ToolTextarea readOnly value={generationState.result.privateJwkJson} rows={18} spellCheck={false} />
            </section>

            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Public JWK</h2>
                  <p className="mt-2 text-sm text-slate-400">JSON Web Key with public fields only.</p>
                </div>
                <CopyButton label="Public JWK" value={generationState.result.publicJwkJson} />
              </div>
              <ToolTextarea readOnly value={generationState.result.publicJwkJson} rows={18} spellCheck={false} />
            </section>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Private key PEM</h2>
                  <p className="mt-2 text-sm text-slate-400">PKCS#8 PEM encoding of the generated private key.</p>
                </div>
                <CopyButton label="Private key PEM" value={generationState.result.privatePem} />
              </div>
              <ToolTextarea readOnly value={generationState.result.privatePem} rows={18} spellCheck={false} />
            </section>

            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Public key PEM</h2>
                  <p className="mt-2 text-sm text-slate-400">SPKI PEM encoding of the generated public key.</p>
                </div>
                <CopyButton label="Public key PEM" value={generationState.result.publicPem} />
              </div>
              <ToolTextarea readOnly value={generationState.result.publicPem} rows={14} spellCheck={false} />
            </section>
          </section>
        </section>
      ) : null}
    </div>
  );
}
