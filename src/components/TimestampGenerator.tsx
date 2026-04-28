import { useMemo, useState } from "react";
import { addMinutes, parseDateTimeLocal, toDateTimeLocalValue } from "../utils/dateTime";
import {
  CopyButton,
  ToolActionButton,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

export default function TimestampGenerator() {
  const [dateTimeValue, setDateTimeValue] = useState<string>(() =>
    toDateTimeLocalValue(addMinutes(new Date(), 5)),
  );

  const parsedDate = useMemo(() => parseDateTimeLocal(dateTimeValue), [dateTimeValue]);
  const unixSeconds = parsedDate ? Math.floor(parsedDate.getTime() / 1000) : null;
  const unixMilliseconds = parsedDate ? parsedDate.getTime() : null;
  const localFormatted = parsedDate ? parsedDate.toLocaleString() : null;
  const isoFormatted = parsedDate ? parsedDate.toISOString() : null;
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Time & Scheduling
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">Timestamp Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Generate Unix seconds, Unix milliseconds, and ISO timestamps from a local datetime
              input interpreted in your current browser timezone.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <ToolActionButton onClick={() => setDateTimeValue(toDateTimeLocalValue(new Date()))}>
                Set now
              </ToolActionButton>
              <ToolActionButton
                onClick={() => setDateTimeValue(toDateTimeLocalValue(addMinutes(new Date(), 60)))}
              >
                +1 hour
              </ToolActionButton>
              <ToolActionButton
                onClick={() => {
                  const next = new Date();
                  next.setDate(next.getDate() + 1);
                  next.setHours(0, 0, 0, 0);
                  setDateTimeValue(toDateTimeLocalValue(next));
                }}
              >
                Tomorrow 00:00
              </ToolActionButton>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current context</p>
            <div className="mt-4 grid gap-4">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Timezone</div>
                <div className="mt-2 text-sm font-medium text-white">{browserTimeZone}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</div>
                <div className="mt-2 text-sm font-medium text-white">
                  {parsedDate ? "Valid local datetime" : "Enter a valid date and time"}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Datetime input</h2>
          <p className="mt-2 text-sm text-slate-400">
            `datetime-local` values have no timezone embedded, so the browser interprets them in
            your local timezone before conversion.
          </p>

          <input
            type="datetime-local"
            value={dateTimeValue}
            onChange={(event) => setDateTimeValue(event.target.value)}
            className={`${inputClass} mt-5 text-base`}
          />
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Quick copy</h2>
          <div className="mt-4 grid gap-3">
            {[
              {
                label: "Unix seconds",
                value: unixSeconds !== null ? String(unixSeconds) : "",
              },
              {
                label: "Unix milliseconds",
                value: unixMilliseconds !== null ? String(unixMilliseconds) : "",
              },
              {
                label: "ISO UTC",
                value: isoFormatted ?? "",
              },
            ].map((entry) => (
              <div
                key={entry.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-4"
              >
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{entry.label}</div>
                  <div className="mt-2 font-mono text-sm text-slate-200">
                    {entry.value || "Waiting for a valid input"}
                  </div>
                </div>
                {entry.value ? <CopyButton label={entry.label} value={entry.value} /> : null}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Timestamp values</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix seconds</div>
              <div className="mt-2 font-mono text-lg text-cyan-200">
                {unixSeconds ?? "Invalid input"}
              </div>
            </div>
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Unix milliseconds
              </div>
              <div className="mt-2 font-mono text-lg text-cyan-200">
                {unixMilliseconds ?? "Invalid input"}
              </div>
            </div>
          </div>
        </section>

        <section className={primaryPanelClass}>
          <h2 className="text-lg font-semibold text-white">Human-readable output</h2>
          <div className="mt-4 grid gap-4">
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Local time</div>
              <div className="mt-2 text-sm text-slate-200">
                {localFormatted ?? "Waiting for a valid input"}
              </div>
            </div>
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">ISO UTC</div>
              <div className="mt-2 break-all font-mono text-sm text-slate-200">
                {isoFormatted ?? "Waiting for a valid input"}
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
