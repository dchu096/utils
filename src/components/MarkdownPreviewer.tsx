import { useMemo, useState } from "react";
import createDOMPurify from "dompurify";
import { marked } from "marked";
import {
  OutputCard,
  ToolActionButton,
  ToolTextarea,
  cardClass,
  primaryPanelClass,
} from "./ToolPrimitives";

const MARKDOWN_EXAMPLES = [
  {
    label: "Release notes",
    value: `# Release 0.14.0

## Added
- JSON validator output sorting
- Direct validator routes

## Fixed
- YAML canonical path handling

## Notes
Visit [dchu096.tk](https://dchu096.tk/) for the latest tools.`,
  },
  {
    label: "Runbook",
    value: `# Production deploy

1. Run \`npm ci\`
2. Run \`npm run build\`
3. Upload the contents of \`dist/\`

> Confirm the validator routes respond before flipping traffic.
`,
  },
];

function getStats(markdown: string): { lines: number; words: number } {
  const trimmed = markdown.trim();

  if (!trimmed) {
    return { lines: 0, words: 0 };
  }

  return {
    lines: markdown.split("\n").length,
    words: trimmed.split(/\s+/).length,
  };
}

export default function MarkdownPreviewer() {
  const [markdownInput, setMarkdownInput] = useState<string>(MARKDOWN_EXAMPLES[0].value);
  const purifier = useMemo(() => createDOMPurify(window), []);
  const stats = useMemo(() => getStats(markdownInput), [markdownInput]);

  const rendered = useMemo(() => {
    if (!markdownInput.trim()) {
      return { html: "", safeHtml: "" };
    }

    const html = marked.parse(markdownInput, {
      async: false,
      breaks: true,
      gfm: true,
    }) as string;

    return {
      html,
      safeHtml: purifier.sanitize(html),
    };
  }, [markdownInput, purifier]);

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Text & Formatting
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">Markdown Previewer</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Render GitHub-flavored Markdown locally, inspect the generated HTML, and sanity-check
              structure before posting or publishing.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {MARKDOWN_EXAMPLES.map((example) => (
                <ToolActionButton
                  key={example.label}
                  onClick={() => setMarkdownInput(example.value)}
                >
                  {example.label}
                </ToolActionButton>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#101828_0%,#0b1220_100%)] p-5 shadow-xl shadow-slate-950/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Document stats</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Lines</div>
                <div className="mt-2 text-lg font-semibold text-white">{stats.lines}</div>
              </div>
              <div className={cardClass}>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Words</div>
                <div className="mt-2 text-lg font-semibold text-white">{stats.words}</div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Markdown input</h2>
              <p className="mt-2 text-sm text-slate-400">Paste or write Markdown with live preview.</p>
            </div>
            <ToolActionButton onClick={() => setMarkdownInput("")}>Clear</ToolActionButton>
          </div>

          <ToolTextarea
            value={markdownInput}
            onChange={(event) => setMarkdownInput(event.target.value)}
            rows={22}
            spellCheck={false}
          />
        </section>

        <section className={primaryPanelClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Rendered preview</h2>
              <p className="mt-2 text-sm text-slate-400">
                HTML is sanitized before it is rendered into the preview pane.
              </p>
            </div>
          </div>

          <div
            className="prose prose-invert mt-5 min-h-[33rem] max-w-none rounded-2xl border border-slate-800 bg-slate-900 px-5 py-5 prose-headings:text-white prose-p:text-slate-200 prose-strong:text-white prose-code:text-cyan-200 prose-pre:bg-slate-950 prose-li:text-slate-200 prose-blockquote:border-slate-700 prose-blockquote:text-slate-300 prose-a:text-cyan-300"
            dangerouslySetInnerHTML={{
              __html:
                rendered.safeHtml ||
                '<p class="text-sm text-slate-500">Enter Markdown to render a preview.</p>',
            }}
          />
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <OutputCard
          label="Rendered HTML"
          description="HTML produced by the Markdown parser before sanitization."
          value={rendered.html}
        />
        <OutputCard
          label="Sanitized HTML"
          description="HTML after DOMPurify sanitization, matching the preview pane."
          value={rendered.safeHtml}
        />
      </section>
    </div>
  );
}
