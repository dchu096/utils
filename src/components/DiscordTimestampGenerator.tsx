import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type DiscordStyle = {
  description: string;
  label: string;
  style: "t" | "T" | "d" | "D" | "f" | "F" | "R";
};

const DISCORD_STYLES: DiscordStyle[] = [
  { style: "t", label: "Short Time", description: "Hour and minute." },
  { style: "T", label: "Long Time", description: "Hour, minute, and second." },
  { style: "d", label: "Short Date", description: "Numeric month, day, and year." },
  { style: "D", label: "Long Date", description: "Full month, day, and year." },
  { style: "f", label: "Short Date/Time", description: "Readable date with short time." },
  { style: "F", label: "Long Date/Time", description: "Weekday, full date, and time." },
  { style: "R", label: "Relative Time", description: "Relative output like in 2 hours." },
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function parseDateTimeLocal(value: string): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeTime(targetMs: number, nowMs: number): string {
  const diffSeconds = Math.round((targetMs - nowMs) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: "year", seconds: 31_536_000 },
    { unit: "month", seconds: 2_592_000 },
    { unit: "week", seconds: 604_800 },
    { unit: "day", seconds: 86_400 },
    { unit: "hour", seconds: 3_600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ];

  for (const { unit, seconds } of units) {
    if (Math.abs(diffSeconds) >= seconds || unit === "second") {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return formatter.format(0, "second");
}

function formatPreview(date: Date, style: DiscordStyle["style"], nowMs: number): string {
  if (style === "R") {
    return formatRelativeTime(date.getTime(), nowMs);
  }

  const formatOptions: Record<
    Exclude<DiscordStyle["style"], "R">,
    Intl.DateTimeFormatOptions
  > = {
    t: { timeStyle: "short" },
    T: { timeStyle: "medium" },
    d: { dateStyle: "short" },
    D: { dateStyle: "long" },
    f: { dateStyle: "medium", timeStyle: "short" },
    F: { dateStyle: "full", timeStyle: "short" },
  };

  return new Intl.DateTimeFormat(undefined, formatOptions[style]).format(date);
}

function CopyButton({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const handleCopy = async (): Promise<void> => {
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

export default function DiscordTimestampGenerator() {
  const [dateTimeValue, setDateTimeValue] = useState<string>(() =>
    toDateTimeLocalValue(addMinutes(new Date(), 5)),
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const parsedDate = useMemo(() => parseDateTimeLocal(dateTimeValue), [dateTimeValue]);
  const unixSeconds = parsedDate ? Math.floor(parsedDate.getTime() / 1000) : null;
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const rows = useMemo(
    () =>
      parsedDate && unixSeconds !== null
        ? DISCORD_STYLES.map((entry) => ({
            ...entry,
            code: `<t:${unixSeconds}:${entry.style}>`,
            preview: formatPreview(parsedDate, entry.style, nowMs),
          }))
        : [],
    [nowMs, parsedDate, unixSeconds],
  );

  const handleQuickSet = (nextDate: Date): void => {
    setDateTimeValue(toDateTimeLocalValue(nextDate));
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan-300">
                Live
              </span>
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Time & Scheduling
              </span>
            </div>

            <h2 className="mt-4 text-3xl font-semibold text-white">Discord Timestamp Generator</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Pick a local date and time, then copy the Discord timestamp tag format you need.
              Previews update in your current timezone so you can confirm the output before
              posting.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleQuickSet(new Date())}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Set now
              </button>
              <button
                type="button"
                onClick={() => handleQuickSet(addMinutes(new Date(), 60))}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                +1 hour
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new Date();
                  next.setDate(next.getDate() + 1);
                  next.setHours(9, 0, 0, 0);
                  handleQuickSet(next);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Tomorrow 9:00
              </button>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current context</p>
            <div className="mt-4 grid gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Timezone</div>
                <div className="mt-2 text-sm font-medium text-white">{browserTimeZone}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix seconds</div>
                <div className="mt-2 font-mono text-lg text-cyan-200">
                  {unixSeconds ?? "Invalid input"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">ISO UTC</div>
                <div className="mt-2 break-all font-mono text-sm text-slate-300">
                  {parsedDate ? parsedDate.toISOString() : "Enter a valid date and time."}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Timestamp input</h3>
              <p className="mt-2 text-sm text-slate-400">
                `datetime-local` is interpreted in your browser timezone before being converted to
                Unix seconds.
              </p>
            </div>
            {unixSeconds !== null ? <CopyButton label="Unix timestamp" value={String(unixSeconds)} /> : null}
          </div>

          <label htmlFor="discord-datetime" className="mt-5 block text-sm font-medium text-slate-300">
            Date and time
          </label>
          <input
            id="discord-datetime"
            type="datetime-local"
            value={dateTimeValue}
            onChange={(event) => setDateTimeValue(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-base text-slate-100 outline-none transition focus:border-slate-600"
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Primary tag</div>
              <div className="mt-3 break-all font-mono text-sm text-slate-200">
                {unixSeconds !== null ? `<t:${unixSeconds}:F>` : "Waiting for a valid timestamp"}
              </div>
              {unixSeconds !== null ? (
                <div className="mt-4">
                  <CopyButton label="Primary Discord tag" value={`<t:${unixSeconds}:F>`} />
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Relative tag</div>
              <div className="mt-3 break-all font-mono text-sm text-slate-200">
                {unixSeconds !== null ? `<t:${unixSeconds}:R>` : "Waiting for a valid timestamp"}
              </div>
              {unixSeconds !== null ? (
                <div className="mt-4">
                  <CopyButton label="Relative Discord tag" value={`<t:${unixSeconds}:R>`} />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-white">Style reference</h3>
          <div className="mt-4 grid gap-3">
            {DISCORD_STYLES.map((entry) => (
              <div
                key={entry.style}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-white">{entry.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{entry.description}</div>
                  </div>
                  <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs text-cyan-200">
                    {entry.style}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Copy-ready formats</h3>
            <p className="mt-2 text-sm text-slate-400">
              Discord renders these from the viewer&apos;s own timezone, so the previews below are
              local approximations for your browser.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {rows.length ? (
            rows.map((row) => (
              <div
                key={row.style}
                className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_auto]"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs text-cyan-200">
                      {row.style}
                    </span>
                    <h4 className="text-sm font-semibold text-white">{row.label}</h4>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{row.description}</p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Tag</div>
                    <div className="mt-2 break-all font-mono text-sm text-slate-200">{row.code}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Preview</div>
                    <div className="mt-2 text-sm text-slate-200">{row.preview}</div>
                  </div>
                </div>

                <div className="flex items-start lg:justify-end">
                  <CopyButton label={`${row.label} tag`} value={row.code} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-rose-800 bg-rose-950/20 px-4 py-4 text-sm text-rose-100">
              Enter a valid date and time to generate Discord timestamp tags.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
