import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  OutputCard,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
  secondaryButtonClass,
} from "./ToolPrimitives";

const QR_EXAMPLES = [
  { label: "Site URL", value: "https://dchu096.tk/" },
  { label: "Wi-Fi", value: "WIFI:T:WPA;S:Office-Network;P:changeme123;;" },
  { label: "vCard", value: "BEGIN:VCARD\nVERSION:3.0\nFN:Daniel\nEMAIL:dchu096@example.com\nEND:VCARD" },
];

type ErrorCorrection = "L" | "M" | "Q" | "H";

export default function QrCodeGenerator() {
  const [content, setContent] = useState<string>(QR_EXAMPLES[0].value);
  const [size, setSize] = useState<number>(256);
  const [margin, setMargin] = useState<number>(2);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrection>("M");
  const [foregroundColor, setForegroundColor] = useState<string>("#111827");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [pngDataUrl, setPngDataUrl] = useState<string>("");
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function generate(): Promise<void> {
      if (!content.trim()) {
        setPngDataUrl("");
        setSvgMarkup("");
        setErrorMessage("");
        return;
      }

      try {
        const [nextPng, nextSvg] = await Promise.all([
          QRCode.toDataURL(content, {
            color: {
              dark: foregroundColor,
              light: backgroundColor,
            },
            errorCorrectionLevel: errorCorrection,
            margin,
            width: size,
          }),
          QRCode.toString(content, {
            color: {
              dark: foregroundColor,
              light: backgroundColor,
            },
            errorCorrectionLevel: errorCorrection,
            margin,
            type: "svg",
            width: size,
          }),
        ]);

        if (!cancelled) {
          setPngDataUrl(nextPng);
          setSvgMarkup(nextSvg);
          setErrorMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setPngDataUrl("");
          setSvgMarkup("");
          setErrorMessage(error instanceof Error ? error.message : "QR generation failed.");
        }
      }
    }

    void generate();

    return () => {
      cancelled = true;
    };
  }, [backgroundColor, content, errorCorrection, foregroundColor, margin, size]);

  const svgDataUrl = useMemo(() => {
    if (!svgMarkup) {
      return "";
    }

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  }, [svgMarkup]);

  const stats = useMemo(() => {
    const trimmed = content.trim();
    return {
      characters: trimmed.length,
      lines: trimmed ? content.split("\n").length : 0,
    };
  }, [content]);

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Design & Creative
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">QR Code Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Generate QR codes for links, Wi-Fi credentials, contact cards, or plain text, then
              download a PNG or SVG directly from the browser.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {QR_EXAMPLES.map((example) => (
                <ToolActionButton key={example.label} onClick={() => setContent(example.value)}>
                  {example.label}
                </ToolActionButton>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Preview</p>
            <div className="mt-5 flex min-h-[20rem] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-5">
              {pngDataUrl ? (
                <img src={pngDataUrl} alt="QR code preview" className="max-h-[18rem] rounded-lg" />
              ) : (
                <p className="text-sm text-slate-500">
                  {errorMessage || "Enter content to render a QR code."}
                </p>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Characters</div>
                <div className="mt-2 text-lg font-semibold text-white">{stats.characters}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Error level</div>
                <div className="mt-2 text-lg font-semibold text-white">{errorCorrection}</div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Content</h2>
              <p className="mt-2 text-sm text-slate-400">Paste the exact payload you want encoded.</p>
            </div>
            <ToolActionButton onClick={() => setContent("")}>Clear</ToolActionButton>
          </div>

          <ToolTextarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={12}
            spellCheck={false}
          />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Settings</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Size</label>
              <input
                type="range"
                min={128}
                max={512}
                step={32}
                value={size}
                onChange={(event) => setSize(Number.parseInt(event.target.value, 10))}
                className="mt-4 w-full"
              />
              <div className="mt-2 text-xs text-slate-500">{size}px</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Margin</label>
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={margin}
                onChange={(event) => setMargin(Number.parseInt(event.target.value, 10))}
                className="mt-4 w-full"
              />
              <div className="mt-2 text-xs text-slate-500">{margin} modules</div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Error correction</label>
              <select
                value={errorCorrection}
                onChange={(event) => setErrorCorrection(event.target.value as ErrorCorrection)}
                className={inputClass}
              >
                <option value="L">L - smallest code</option>
                <option value="M">M - balanced</option>
                <option value="Q">Q - stronger recovery</option>
                <option value="H">H - highest recovery</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">Foreground</label>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
                  <input
                    type="color"
                    value={foregroundColor}
                    onChange={(event) => setForegroundColor(event.target.value)}
                    className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
                  />
                  <span className="font-mono text-xs text-slate-300">{foregroundColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Background</label>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value)}
                    className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
                  />
                  <span className="font-mono text-xs text-slate-300">{backgroundColor}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={pngDataUrl || undefined}
              download="qr-code.png"
              className={`${secondaryButtonClass} ${!pngDataUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              Download PNG
            </a>
            <a
              href={svgDataUrl || undefined}
              download="qr-code.svg"
              className={`${secondaryButtonClass} ${!svgDataUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              Download SVG
            </a>
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <OutputCard
          label="SVG Markup"
          description="SVG source generated for the QR code."
          value={svgMarkup}
        />
        <OutputCard
          label="PNG Data URL"
          description="Data URL for direct browser-side download or embedding."
          value={pngDataUrl}
        />
      </section>
    </div>
  );
}
