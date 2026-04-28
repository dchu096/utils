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
  getOpenSshFingerprint,
  importPkcs8PrivateKeyToJwk,
  openSshPublicBlobToJwk,
  parseOpenSshPrivateKey,
  parsePemBlocks,
  publicJwkToOpenSshPublic,
  publicJwkToOpenSshPublicBlob,
  publicJwkToPem,
  publicKeyBlobToOpenSsh,
} from "../utils/keys";

type ExtractionResult = {
  detectedFormat: string;
  fingerprint: string;
  publicJwkJson: string;
  publicPem: string;
  publicSsh: string;
};

type ExtractionState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { result: ExtractionResult; status: "ready" };

async function extractPublic(input: string, commentOverride: string): Promise<ExtractionResult> {
  const pemBlocks = parsePemBlocks(input);
  const openSshBlock = pemBlocks.find((block) => block.label === "OPENSSH PRIVATE KEY");

  if (openSshBlock) {
    const parsed = parseOpenSshPrivateKey(input);
    const publicJwk = openSshPublicBlobToJwk(parsed.publicKeyBlob);
    const publicComment = commentOverride.trim() || parsed.comment;

    return {
      detectedFormat: "OpenSSH private key",
      fingerprint: await getOpenSshFingerprint(parsed.publicKeyBlob),
      publicJwkJson: JSON.stringify(publicJwk, null, 2),
      publicPem: await publicJwkToPem(publicJwk),
      publicSsh: publicKeyBlobToOpenSsh(parsed.publicKeyBlob, publicComment),
    };
  }

  const pkcs8Block = pemBlocks.find((block) => block.label === "PRIVATE KEY");

  if (pkcs8Block) {
    const privateJwk = await importPkcs8PrivateKeyToJwk(pkcs8Block.bytes);
    const publicJwk = derivePublicJwk(privateJwk);
    const publicBlob = publicJwkToOpenSshPublicBlob(publicJwk);

    return {
      detectedFormat: "PKCS#8 private key",
      fingerprint: await getOpenSshFingerprint(publicBlob),
      publicJwkJson: JSON.stringify(publicJwk, null, 2),
      publicPem: await publicJwkToPem(publicJwk),
      publicSsh: publicJwkToOpenSshPublic(publicJwk, commentOverride),
    };
  }

  throw new Error("Supported input formats are unencrypted OpenSSH private keys and PKCS#8 PRIVATE KEY blocks.");
}

export default function ExtractPublicFromPrivateKey() {
  const [input, setInput] = useState<string>("");
  const [commentOverride, setCommentOverride] = useState<string>("");
  const [extractionState, setExtractionState] = useState<ExtractionState>({ status: "idle" });

  const handleExtract = async (): Promise<void> => {
    if (!input.trim()) {
      setExtractionState({
        status: "error",
        message: "Paste a private key first.",
      });
      return;
    }

    setExtractionState({ status: "loading" });

    try {
      setExtractionState({
        status: "ready",
        result: await extractPublic(input, commentOverride),
      });
    } catch (error) {
      setExtractionState({
        status: "error",
        message: error instanceof Error ? error.message : "Public key extraction failed.",
      });
    }
  };

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Security & PKI</span>
            <h1 className="mt-4 text-3xl font-semibold text-white">Extract Public from Private Key</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Read a supported private key and recover the matching public key in OpenSSH, PEM, and JWK form.
            </p>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Supported formats</p>
            <div className="mt-4 grid gap-4">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">OpenSSH</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">Unencrypted `OPENSSH PRIVATE KEY` blocks.</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">PKCS#8</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">Generic `PRIVATE KEY` PEM blocks for RSA, ECDSA, and Ed25519.</div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Private key input</h2>
              <p className="mt-2 text-sm text-slate-400">Paste an OpenSSH or PKCS#8 private key to extract the public side.</p>
            </div>
            <div className="flex gap-2">
              <ToolActionButton onClick={handleExtract} disabled={extractionState.status === "loading"}>
                {extractionState.status === "loading" ? "Extracting..." : "Extract public key"}
              </ToolActionButton>
              <ToolActionButton onClick={() => setInput("")}>Clear</ToolActionButton>
            </div>
          </div>

          <ToolTextarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={18}
            spellCheck={false}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
          />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Options</h2>
          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor="extract-comment" className="text-sm font-medium text-slate-200">
                Override OpenSSH comment
              </label>
              <input
                id="extract-comment"
                value={commentOverride}
                onChange={(event) => setCommentOverride(event.target.value)}
                placeholder="name@host"
                className={inputClass}
              />
            </div>

            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Limitations</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Encrypted private keys and legacy `RSA PRIVATE KEY` or `EC PRIVATE KEY` blocks are not handled here.
              </div>
            </div>
          </div>
        </section>
      </section>

      {extractionState.status === "error" ? (
        <section className="rounded-2xl border border-rose-800 bg-rose-950/20 px-4 py-4 text-sm text-rose-100">
          {extractionState.message}
        </section>
      ) : null}

      {extractionState.status === "ready" ? (
        <section className="grid gap-6">
          <section className={primaryPanelClass}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Detected format</div>
                <div className="mt-2 text-sm font-semibold text-white">{extractionState.result.detectedFormat}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Fingerprint</div>
                <div className="mt-2 break-all font-mono text-xs text-slate-200">{extractionState.result.fingerprint}</div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">OpenSSH public key</h2>
                  <p className="mt-2 text-sm text-slate-400">Copy this into `authorized_keys` or an SSH client profile.</p>
                </div>
                <CopyButton label="OpenSSH public key" value={extractionState.result.publicSsh} />
              </div>
              <ToolTextarea readOnly value={extractionState.result.publicSsh} rows={6} spellCheck={false} />
            </section>

            <section className={primaryPanelClass}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Public key PEM</h2>
                  <p className="mt-2 text-sm text-slate-400">SPKI PEM derived from the extracted public key.</p>
                </div>
                <CopyButton label="Public key PEM" value={extractionState.result.publicPem} />
              </div>
              <ToolTextarea readOnly value={extractionState.result.publicPem} rows={12} spellCheck={false} />
            </section>
          </section>

          <section className={primaryPanelClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Public JWK</h2>
                <p className="mt-2 text-sm text-slate-400">Normalized public-only JWK for downstream conversion or inspection.</p>
              </div>
              <CopyButton label="Public JWK" value={extractionState.result.publicJwkJson} />
            </div>
            <ToolTextarea readOnly value={extractionState.result.publicJwkJson} rows={14} spellCheck={false} />
          </section>
        </section>
      ) : null}
    </div>
  );
}
