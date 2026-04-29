import { useMemo, useState } from "react";
import {
  OutputCard,
  ToolActionButton,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type GradientType = "linear" | "radial" | "conic";
type GradientStop = {
  color: string;
  id: string;
  position: number;
};

function createStop(color: string, position: number): GradientStop {
  return {
    color,
    id: `${color}-${position}-${Math.random().toString(36).slice(2, 8)}`,
    position,
  };
}

const GRADIENT_PRESETS = [
  {
    label: "Aurora",
    type: "linear" as const,
    angle: 135,
    stops: [createStop("#22d3ee", 0), createStop("#6366f1", 55), createStop("#ec4899", 100)],
  },
  {
    label: "Sunset",
    type: "radial" as const,
    angle: 45,
    stops: [createStop("#f59e0b", 0), createStop("#ef4444", 58), createStop("#7c3aed", 100)],
  },
  {
    label: "Spectrum",
    type: "conic" as const,
    angle: 180,
    stops: [createStop("#22c55e", 0), createStop("#3b82f6", 35), createStop("#a855f7", 70), createStop("#f43f5e", 100)],
  },
];

function buildGradientCss(type: GradientType, angle: number, stops: GradientStop[]): string {
  const stopText = [...stops]
    .sort((left, right) => left.position - right.position)
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");

  if (type === "radial") {
    return `radial-gradient(circle at center, ${stopText})`;
  }

  if (type === "conic") {
    return `conic-gradient(from ${angle}deg at center, ${stopText})`;
  }

  return `linear-gradient(${angle}deg, ${stopText})`;
}

function buildTailwindClass(cssValue: string): string {
  return `bg-[${cssValue.replaceAll(" ", "_")}]`;
}

export default function CssGradientGenerator() {
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState<number>(135);
  const [stops, setStops] = useState<GradientStop[]>([
    createStop("#22d3ee", 0),
    createStop("#6366f1", 50),
    createStop("#ec4899", 100),
  ]);

  const gradientCss = useMemo(() => buildGradientCss(gradientType, angle, stops), [angle, gradientType, stops]);
  const backgroundCss = useMemo(() => `background: ${gradientCss};`, [gradientCss]);
  const backgroundImageCss = useMemo(() => `background-image: ${gradientCss};`, [gradientCss]);
  const tailwindClass = useMemo(() => buildTailwindClass(gradientCss), [gradientCss]);

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Design & Creative
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">CSS Gradient Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Compose linear, radial, or conic gradients, tune color stops visually, and copy the
              resulting CSS or Tailwind-compatible background class.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {GRADIENT_PRESETS.map((preset) => (
                <ToolActionButton
                  key={preset.label}
                  onClick={() => {
                    setGradientType(preset.type);
                    setAngle(preset.angle);
                    setStops(preset.stops.map((stop) => createStop(stop.color, stop.position)));
                  }}
                >
                  {preset.label}
                </ToolActionButton>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Preview</p>
            <div className="mt-5 h-[20rem] rounded-2xl border border-slate-800" style={{ backgroundImage: gradientCss }} />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Type</div>
                <div className="mt-2 text-lg font-semibold capitalize text-white">{gradientType}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Stops</div>
                <div className="mt-2 text-lg font-semibold text-white">{stops.length}</div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Stops</h2>
              <p className="mt-2 text-sm text-slate-400">
                Add up to five stops and place them anywhere between 0 and 100 percent.
              </p>
            </div>
            <ToolActionButton
              onClick={() => {
                if (stops.length >= 5) {
                  return;
                }

                setStops((current) => [...current, createStop("#ffffff", 100)]);
              }}
              disabled={stops.length >= 5}
            >
              Add stop
            </ToolActionButton>
          </div>

          <div className="mt-5 grid gap-4">
            {stops.map((stop, index) => (
              <div key={stop.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium text-white">Stop {index + 1}</div>
                  <ToolActionButton
                    onClick={() =>
                      setStops((current) =>
                        current.length <= 2 ? current : current.filter((entry) => entry.id !== stop.id),
                      )
                    }
                    disabled={stops.length <= 2}
                    className="px-3 py-2 text-xs"
                  >
                    Remove
                  </ToolActionButton>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(event) =>
                        setStops((current) =>
                          current.map((entry) =>
                            entry.id === stop.id ? { ...entry, color: event.target.value } : entry,
                          ),
                        )
                      }
                      className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
                    />
                    <span className="font-mono text-xs text-slate-300">{stop.color}</span>
                  </div>

                  <div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={stop.position}
                      onChange={(event) =>
                        setStops((current) =>
                          current.map((entry) =>
                            entry.id === stop.id
                              ? { ...entry, position: Number.parseInt(event.target.value, 10) }
                              : entry,
                          ),
                        )
                      }
                      className="mt-2 w-full"
                    />
                    <div className="mt-2 text-xs text-slate-500">{stop.position}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Gradient settings</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Type</label>
              <select
                value={gradientType}
                onChange={(event) => setGradientType(event.target.value as GradientType)}
                className={inputClass}
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
                <option value="conic">Conic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                {gradientType === "linear" ? "Angle" : gradientType === "conic" ? "From angle" : "Reference angle"}
              </label>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={angle}
                onChange={(event) => setAngle(Number.parseInt(event.target.value, 10))}
                className="mt-4 w-full"
              />
              <div className="mt-2 text-xs text-slate-500">{angle}deg</div>
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <OutputCard
          label="Background"
          description="Full background shorthand declaration."
          value={backgroundCss}
        />
        <OutputCard
          label="Background Image"
          description="Background image declaration only."
          value={backgroundImageCss}
        />
        <OutputCard
          label="Tailwind Class"
          description="Arbitrary value class for Tailwind background usage."
          value={tailwindClass}
        />
      </section>
    </div>
  );
}
