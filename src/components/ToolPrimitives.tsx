import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import toast from "react-hot-toast";

export const primaryPanelClass = "rounded-[24px] border border-slate-800 bg-slate-950/80 p-6 sm:p-8";
export const cardClass = "rounded-xl border border-slate-800 bg-slate-900 p-4";
export const secondaryButtonClass =
  "rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
export const textareaClass =
  "mt-5 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 font-mono text-sm text-slate-100 outline-none transition focus:border-slate-600";
export const inputClass =
  "mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-600";

export function CopyButton({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const handleCopy = async (): Promise<void> => {
    if (!value) {
      toast.error("Nothing to copy.");
      return;
    }

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

export function OutputCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <CopyButton label={label} value={value} />
      </div>

      <textarea
        readOnly
        value={value}
        rows={14}
        className="mt-4 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 font-mono text-xs text-slate-200 outline-none"
      />
    </section>
  );
}

export function ToolActionButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode },
) {
  const { children, className = "", type = "button", ...rest } = props;

  return (
    <button type={type} className={`${secondaryButtonClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

export function ToolTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { className = "", ...rest } = props;

  return <textarea className={`${textareaClass} ${className}`.trim()} {...rest} />;
}
