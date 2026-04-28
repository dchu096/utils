import {
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";
import toast from "react-hot-toast";

type AliasMap = Record<string, number>;

type CronFieldDefinition = {
  key: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  aliases?: AliasMap;
};

type CronState = {
  description: string;
  normalized: string;
  isError: boolean;
  parts: string[];
};

type NextRunState = {
  label: string | null;
  timeZone: string | null;
};

type Example = {
  label: string;
  value: string;
};

type ExampleButtonProps = Example & {
  onSelect: (value: string) => void;
};

const FIELD_DEFINITIONS: CronFieldDefinition[] = [
  {
    key: "minute",
    label: "Minute",
    hint: "0-59",
    min: 0,
    max: 59,
  },
  {
    key: "hour",
    label: "Hour",
    hint: "0-23",
    min: 0,
    max: 23,
  },
  {
    key: "dayOfMonth",
    label: "Day of month",
    hint: "1-31",
    min: 1,
    max: 31,
  },
  {
    key: "month",
    label: "Month",
    hint: "1-12 or JAN-DEC",
    min: 1,
    max: 12,
    aliases: {
      JAN: 1,
      FEB: 2,
      MAR: 3,
      APR: 4,
      MAY: 5,
      JUN: 6,
      JUL: 7,
      AUG: 8,
      SEP: 9,
      OCT: 10,
      NOV: 11,
      DEC: 12,
    },
  },
  {
    key: "dayOfWeek",
    label: "Day of week",
    hint: "0-7 or SUN-SAT",
    min: 0,
    max: 7,
    aliases: {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    },
  },
];

const EXAMPLES: Example[] = [
  {
    label: "Every 5 minutes",
    value: "*/5 * * * *",
  },
  {
    label: "Weekday mornings",
    value: "0 9 * * MON-FRI",
  },
  {
    label: "First day monthly",
    value: "30 8 1 * *",
  },
  {
    label: "Weekend midnight",
    value: "0 0 * * SAT,SUN",
  },
];

function normalizeCron(value: string): string {
  return value.trim().replace(/^\/(\d+)/, "*/$1");
}

function getPartsFromCron(rawCron: string): string[] {
  const normalized = normalizeCron(rawCron);

  if (!normalized) {
    return [];
  }

  if (!/\s/.test(normalized) && /^\*{2,5}$/.test(normalized)) {
    return normalized.split("");
  }

  return normalized.split(/\s+/);
}

function getPaddedParts(parts: string[]): string[] {
  return FIELD_DEFINITIONS.map((_, index) => parts[index] ?? "");
}

function getEditorParts(rawCron: string): string[] {
  return getPaddedParts(getPartsFromCron(rawCron)).map((part) => part || "*");
}

function formatCronInput(value: string): string {
  const upperCased = value.toUpperCase();
  const normalized = upperCased.replace(/^\/(\d+)/, "*/$1");

  if (!/\s/.test(normalized) && /^\*{2,5}$/.test(normalized)) {
    return normalized.split("").join(" ");
  }

  return normalized.replace(/\s+/g, " ");
}

function parseValue(token: string, field: CronFieldDefinition): number | null {
  if (/^\d+$/.test(token)) {
    const value = Number(token);
    return value >= field.min && value <= field.max ? value : null;
  }

  if (!field.aliases) {
    return null;
  }

  return field.aliases[token.toUpperCase()] ?? null;
}

function isValidStep(step: string): boolean {
  return /^\d+$/.test(step) && Number(step) > 0;
}

function validateSegment(segment: string, field: CronFieldDefinition): boolean {
  if (!segment) {
    return false;
  }

  if (segment === "*") {
    return true;
  }

  if (segment.includes("/")) {
    const [base, step, extra] = segment.split("/");

    if (!base || !step || extra !== undefined || !isValidStep(step)) {
      return false;
    }

    return base === "*" || validateSegment(base, field);
  }

  if (segment.includes("-")) {
    const [startToken, endToken, extra] = segment.split("-");

    if (!startToken || !endToken || extra !== undefined) {
      return false;
    }

    const start = parseValue(startToken, field);
    const end = parseValue(endToken, field);

    return start !== null && end !== null && start <= end;
  }

  return parseValue(segment, field) !== null;
}

function validateField(fieldValue: string, field: CronFieldDefinition): boolean {
  return fieldValue.split(",").every((segment) => validateSegment(segment.trim(), field));
}

function getCronState(rawCron: string): CronState {
  const normalized = normalizeCron(rawCron);

  if (!normalized) {
    return {
      description: "Enter a 5-part cron expression",
      normalized: "",
      isError: false,
      parts: [],
    };
  }

  const parts = getPartsFromCron(rawCron);

  if (parts.length !== FIELD_DEFINITIONS.length) {
    return {
      description: "Cron must contain minute, hour, day-of-month, month, and day-of-week.",
      normalized,
      isError: true,
      parts,
    };
  }

  const hasInvalidField = parts.some(
    (part, index) => !validateField(part, FIELD_DEFINITIONS[index]),
  );

  if (hasInvalidField) {
    return {
      description: "One or more fields are invalid for standard 5-part cron syntax.",
      normalized,
      isError: true,
      parts,
    };
  }

  try {
    return {
      description: cronstrue.toString(normalized, {
        dayOfWeekStartIndexZero: true,
        monthStartIndexZero: false,
        use24HourTimeFormat: false,
      }),
      normalized,
      isError: false,
      parts,
    };
  } catch {
    return {
      description: "Cron looks close, but the parser could not describe it.",
      normalized,
      isError: true,
      parts,
    };
  }
}

function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getNextRunState(normalizedCron: string, isError: boolean): NextRunState {
  if (!normalizedCron || isError) {
    return {
      label: null,
      timeZone: null,
    };
  }

  const timeZone = getBrowserTimeZone();
  const currentDate = new Date();

  try {
    const interval = CronExpressionParser.parse(normalizedCron, {
      currentDate,
      tz: timeZone,
    });
    const nextRun = interval.next().toDate();
    const timeFormatter = new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    if (getDayKey(currentDate, timeZone) === getDayKey(nextRun, timeZone)) {
      return {
        label: `Next run today at ${timeFormatter.format(nextRun)}`,
        timeZone,
      };
    }

    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return {
      label: `Next run ${dateFormatter.format(nextRun)} at ${timeFormatter.format(nextRun)}`,
      timeZone,
    };
  } catch {
    return {
      label: null,
      timeZone: timeZone,
    };
  }
}

function ExampleButton({ label, value, onSelect }: ExampleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-left transition hover:border-slate-500 hover:bg-slate-800"
    >
      <div className="text-sm font-medium text-slate-100">{label}</div>
      <div className="mt-1 font-mono text-xs text-slate-400">{value}</div>
    </button>
  );
}

export default function CronGenerator() {
  const [cron, setCron] = useState<string>("*/15 9-17 * * MON-FRI");
  const [showDocs, setShowDocs] = useState<boolean>(false);

  const cronState = useMemo(() => getCronState(cron), [cron]);
  const editableParts = useMemo(() => getEditorParts(cron), [cron]);
  const nextRunState = useMemo(
    () => getNextRunState(cronState.normalized, cronState.isError),
    [cronState.normalized, cronState.isError],
  );

  const handleCronChange = (value: string): void => {
    setCron(formatCronInput(value));
  };

  const handleCopy = async (): Promise<void> => {
    const valueToCopy = cronState.normalized || cron.trim();

    if (!valueToCopy) {
      toast.error("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(valueToCopy);
      toast.success("Cron copied.");
    } catch {
      toast.error("Clipboard write failed.");
    }
  };

  const handleExample = (value: string): void => {
    setCron(value);
    toast.success(`Loaded ${value}`);
  };

  const handleRandomExample = (): void => {
    const pool = EXAMPLES.filter((example) => example.value !== cron);
    const candidates = pool.length ? pool : EXAMPLES;
    const randomExample = candidates[Math.floor(Math.random() * candidates.length)];

    setCron(randomExample.value);
    toast.success(`Loaded ${randomExample.label.toLowerCase()}.`);
  };

  return (
    <>
      <div className="grid gap-6">
        <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
          <header className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                Scheduling utility
              </p>
              <p className="mt-3 text-base leading-7 text-slate-300">
                Write a standard 5-part cron string and get a readable schedule back immediately.
              </p>
            </div>
          </header>

          <div className="mt-8 flex w-full flex-col items-center">
            <div className="flex w-full flex-col items-center">
              <label
                htmlFor="cron-input"
                className="block text-center text-sm font-medium text-slate-300"
              >
                Cron expression
              </label>

              <div className="mt-5 w-full rounded-2xl border border-slate-700 bg-slate-800 p-4 sm:p-5">
                <input
                  id="cron-input"
                  type="text"
                  value={cron}
                  onChange={(event) => handleCronChange(event.target.value)}
                  spellCheck="false"
                  aria-label="Cron expression"
                  placeholder="* * * * *"
                  className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-center font-mono text-lg text-white outline-none transition placeholder:text-slate-500 focus:border-slate-400 sm:text-2xl"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border border-slate-600 bg-slate-100 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-white"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleRandomExample}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 font-medium text-slate-100 transition hover:bg-slate-700"
              >
                Load random example
              </button>
              <button
                type="button"
                onClick={() => setShowDocs((current) => !current)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 font-medium text-slate-200 transition hover:bg-slate-700"
              >
                {showDocs ? "Hide syntax guide" : "Show syntax guide"}
              </button>
            </div>

            <div
              className={`mt-6 w-full rounded-2xl border px-5 py-5 text-center ${
                cronState.isError
                  ? "border-rose-800 bg-rose-950/20 text-rose-100"
                  : "border-slate-600 bg-slate-800 text-slate-50"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                {cronState.isError ? "Validation" : "Readable schedule"}
              </p>
              <p className="mt-3 text-lg leading-8 sm:text-2xl sm:leading-10">
                {cronState.description}
              </p>
              {nextRunState.label ? (
                <p className="mt-3 text-sm text-slate-400">{nextRunState.label}</p>
              ) : null}
            </div>

            <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {FIELD_DEFINITIONS.map((field, index) => (
                <div
                  key={field.key}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3"
                >
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                    {field.label}
                  </div>
                  <div className="mt-2 font-mono text-sm text-slate-200">{editableParts[index]}</div>
                  <div className="mt-1 text-xs text-slate-500">{field.hint}</div>
                </div>
              ))}
            </div>

            <AnimatePresence initial={false}>
              {showDocs ? (
                <motion.section
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.18 }}
                  className="mt-8 w-full rounded-2xl border border-slate-700 bg-slate-800 p-6"
                >
                  <h2 className="text-lg font-semibold text-white">Syntax guide</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <div className="font-mono text-sm text-teal-300">*</div>
                      <div className="mt-2 text-sm text-slate-300">Any value in the field.</div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <div className="font-mono text-sm text-teal-300">*/5</div>
                      <div className="mt-2 text-sm text-slate-300">
                        Step through the field every 5 units.
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <div className="font-mono text-sm text-teal-300">1,15,30</div>
                      <div className="mt-2 text-sm text-slate-300">
                        Run on a list of exact values.
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <div className="font-mono text-sm text-teal-300">MON-FRI</div>
                      <div className="mt-2 text-sm text-slate-300">
                        Use named ranges for months and weekdays.
                      </div>
                    </div>
                  </div>
                </motion.section>
              ) : null}
            </AnimatePresence>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Examples</h2>
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Quick load</span>
            </div>

            <div className="mt-4 grid gap-3">
              {EXAMPLES.map((example) => (
                <ExampleButton
                  key={example.value}
                  label={example.label}
                  value={example.value}
                  onSelect={handleExample}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-lg font-semibold text-white">Field order</h2>
            <ol className="mt-4 grid gap-3 text-sm text-slate-300">
              {FIELD_DEFINITIONS.map((field, index) => (
                <li
                  key={field.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5"
                >
                  <span>{field.label}</span>
                  <span className="font-mono text-xs text-slate-400">{index + 1}</span>
                </li>
              ))}
            </ol>
          </section>
        </section>
      </div>
    </>
  );
}
