import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import CronGenerator from "./components/CronGenerator";
import MotdGenerator from "./components/MotdGenerator";

type Tool = {
  id: string;
  label: string;
  description: string;
  status?: "live" | "planned";
};

type ToolGroup = {
  title: string;
  description: string;
  tools: Tool[];
};

type TransitionState = {
  progress: number;
  targetToolId: string;
};

const TOOL_GROUPS: ToolGroup[] = [
  {
    title: "Data & Encoding",
    description: "Converters and structure helpers for payload work.",
    tools: [
      { id: "json-formatter", label: "JSON Formatter", description: "Pretty-print and validate JSON." },
      { id: "base64-url-encoder", label: "Base64 / URL Encoder", description: "Encode and decode common transport formats." },
      { id: "jwt-decoder", label: "JWT Decoder", description: "Inspect token headers and claims safely." },
      { id: "uuid-generator", label: "UUID Generator", description: "Create versioned IDs for app and infra work." },
    ],
  },
  {
    title: "Time & Scheduling",
    description: "Scheduling and timestamp tools for operations work.",
    tools: [
      { id: "timestamp-generator", label: "Timestamp Generator", description: "Generate Unix and ISO timestamps." },
      { id: "discord-timestamp-generator", label: "Discord Timestamp Generator", description: "Build Discord time tags with previews." },
      {
        id: "cron-expression-generator",
        label: "Cron Expression Generator",
        description: "Create and validate 5-part cron schedules.",
        status: "live",
      },
    ],
  },
  {
    title: "Text & Formatting",
    description: "Utilities for editing, testing, and publishing text.",
    tools: [
      { id: "markdown-previewer", label: "Markdown Previewer", description: "Render markdown side by side." },
      { id: "regex-tester", label: "Regex Tester", description: "Test patterns against sample input." },
      { id: "announcement-formatter", label: "Announcement Formatter", description: "Format updates for clean posting." },
    ],
  },
  {
    title: "Design & Creative",
    description: "Visual helpers for embeds, gradients, and assets.",
    tools: [
      { id: "qr-code-generator", label: "QR Code Generator", description: "Generate QR codes from links or text." },
      { id: "css-gradient-generator", label: "CSS Gradient Generator", description: "Compose gradients and copy the CSS." },
      { id: "discord-embed-builder", label: "Discord Embed Builder", description: "Assemble embeds with live structure previews." },
    ],
  },
  {
    title: "Minecraft",
    description: "Formatting helpers for server and chat presentation.",
    tools: [
      {
        id: "motd-generator",
        label: "MOTD Generator",
        description: "Build Minecraft server list MOTDs with preview and export formats.",
        status: "live",
      },
      { id: "minimessage-previewer", label: "MiniMessage Previewer", description: "Preview styled message syntax." },
      { id: "minecraft-gradient-text-generator", label: "Minecraft Gradient Text Generator", description: "Generate colorized gradient output." },
    ],
  },
];

const HOME_TOOL_ID = "home";

function getToolById(toolId: string): { group: ToolGroup; tool: Tool } | null {
  for (const group of TOOL_GROUPS) {
    const tool = group.tools.find((entry) => entry.id === toolId);

    if (tool) {
      return { group, tool };
    }
  }

  return null;
}

function LoadingOverlay({ progress, label }: { progress: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 px-4 pt-16 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
              Loading
            </p>
            <p className="mt-2 text-sm text-slate-300">{label}</p>
          </div>
          <p className="text-sm font-medium text-slate-400">{Math.round(progress)}%</p>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-full rounded-full bg-cyan-400"
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.18 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function ToolDropdown({
  group,
  isOpen,
  onToggle,
  onSelect,
}: {
  group: ToolGroup;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (toolId: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 hover:text-white"
      >
        {group.title}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/98 p-2 shadow-xl shadow-slate-950/40 lg:absolute lg:left-0 lg:top-full lg:z-30 lg:w-[19rem]"
          >
            <div className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              {group.title}
            </div>
            <div className="grid gap-1">
              {group.tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelect(tool.id)}
                  className="rounded-lg px-3 py-3 text-left transition hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-100">{tool.label}</span>
                    {tool.status === "live" ? (
                      <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-300">
                        Live
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{tool.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HomePage({
  onSelectTool,
}: {
  onSelectTool: (toolId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-10 rounded-[28px] border border-slate-800 bg-slate-950/80 px-6 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,26rem)] lg:px-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
            dchu096.tk
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
            Utility pages built for the work people actually do every day
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            The site now has a real front door. Navigation is grouped by use case, the cron
            generator loads as its own tool view, and the rest of the utilities are staged in the
            shell so the page can grow without another redesign.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onSelectTool("cron-expression-generator")}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Open cron generator
            </button>
            <button
              type="button"
              onClick={() => onSelectTool("json-formatter")}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Browse planned tools
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Live now</p>
            <p className="mt-3 text-xl font-semibold text-white">Cron and MOTD generators</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The first two real tools are now wired into the shared shell, with client-side page
              transitions instead of hard refreshes between utilities.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Navigation model</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Five dropdown groups, sixteen tool entries, and a homepage that can expand as each
              generator gets implemented.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        {TOOL_GROUPS.map((group) => (
          <section key={group.title} className="grid gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">{group.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{group.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-5 py-5 text-left transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{tool.label}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${
                        tool.status === "live"
                          ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                          : "border border-slate-700 bg-slate-900 text-slate-500"
                      }`}
                    >
                      {tool.status === "live" ? "Live" : "Planned"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{tool.description}</p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}

function PlaceholderToolPage({
  title,
  category,
}: {
  title: string;
  category: string;
}) {
  return (
    <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 px-6 py-10 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{category}</p>
      <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
        This tool is listed in the new site shell, but the working page has not been built yet.
        The navigation is in place so each utility can be added without changing the homepage or
        navbar structure again.
      </p>
    </section>
  );
}

export default function App() {
  const [activeToolId, setActiveToolId] = useState<string>(HOME_TOOL_ID);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [openMenuTitle, setOpenMenuTitle] = useState<string | null>(null);
  const [transition, setTransition] = useState<TransitionState | null>(null);

  const activeTool = useMemo(
    () => (activeToolId === HOME_TOOL_ID ? null : getToolById(activeToolId)),
    [activeToolId],
  );
  const transitionTargetId = transition?.targetToolId ?? null;

  useEffect(() => {
    if (!transitionTargetId) {
      return undefined;
    }

    const progressInterval = window.setInterval(() => {
      setTransition((current) => {
        if (!current || current.targetToolId !== transitionTargetId) {
          return current;
        }

        return {
          ...current,
          progress: Math.min(current.progress + Math.random() * 18, 92),
        };
      });
    }, 90);

    const activateTimeout = window.setTimeout(() => {
      setTransition((current) => {
        if (!current || current.targetToolId !== transitionTargetId) {
          return current;
        }

        return {
          ...current,
          progress: 100,
        };
      });

      setActiveToolId(transitionTargetId);

      window.setTimeout(() => {
        setTransition((current) => (current?.targetToolId === transitionTargetId ? null : current));
      }, 180);
    }, 760);

    return () => {
      window.clearInterval(progressInterval);
      window.clearTimeout(activateTimeout);
    };
  }, [transitionTargetId]);

  const navigateTo = (toolId: string): void => {
    setOpenMenuTitle(null);
    setIsMobileMenuOpen(false);

    if (toolId === activeToolId) {
      return;
    }

    setTransition({
      progress: 12,
      targetToolId: toolId,
    });
  };

  const transitionLabel =
    transition?.targetToolId === HOME_TOOL_ID
      ? "Opening homepage"
      : `Opening ${getToolById(transition?.targetToolId ?? "")?.tool.label ?? "tool"}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_28%),linear-gradient(180deg,_#070b13_0%,_#0f172a_58%,_#111827_100%)] text-slate-100">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.18)",
          },
        }}
      />

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/88 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigateTo(HOME_TOOL_ID)}
              className="text-left"
            >
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
                dchu096.tk
              </div>
              <div className="mt-1 text-lg font-semibold text-white">Utilities</div>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 lg:hidden"
            >
              Menu
            </button>
          </div>

          <nav
            className={`${isMobileMenuOpen ? "flex" : "hidden"} flex-col gap-2 lg:flex lg:flex-row lg:flex-wrap lg:items-center`}
          >
            {TOOL_GROUPS.map((group) => (
              <ToolDropdown
                key={group.title}
                group={group}
                isOpen={openMenuTitle === group.title}
                onToggle={() =>
                  setOpenMenuTitle((current) => (current === group.title ? null : group.title))
                }
                onSelect={navigateTo}
              />
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1380px] px-4 py-8 lg:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeToolId}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.2 }}
          >
            {activeToolId === HOME_TOOL_ID ? (
              <HomePage onSelectTool={navigateTo} />
            ) : activeTool?.tool.id === "cron-expression-generator" ? (
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    {activeTool.group.title}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-white">
                    {activeTool.tool.label}
                  </h1>
                </div>
                <CronGenerator />
              </div>
            ) : activeTool?.tool.id === "motd-generator" ? (
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    {activeTool.group.title}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-white">
                    {activeTool.tool.label}
                  </h1>
                </div>
                <MotdGenerator />
              </div>
            ) : activeTool ? (
              <PlaceholderToolPage
                title={activeTool.tool.label}
                category={activeTool.group.title}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {transition ? (
          <LoadingOverlay progress={transition.progress} label={transitionLabel} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
