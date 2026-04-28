import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import CronGenerator from "./components/CronGenerator";
import DiscordTimestampGenerator from "./components/DiscordTimestampGenerator";
import MotdGenerator from "./components/MotdGenerator";

type Tool = {
  description: string;
  id: string;
  label: string;
  metaDescription?: string;
  route?: string;
  status?: "live" | "planned";
};

type ToolGroup = {
  description: string;
  title: string;
  tools: Tool[];
};

const HOME_TOOL_ID = "home";
const HOME_META_DESCRIPTION =
  "Utility pages for cron expressions, Discord timestamps, Minecraft MOTDs, and other practical formatting work.";

const TOOL_GROUPS: ToolGroup[] = [
  {
    title: "Data & Encoding",
    description: "Converters and structure helpers for payload work.",
    tools: [
      {
        id: "json-formatter",
        label: "JSON Formatter",
        description: "Pretty-print and validate JSON.",
      },
      {
        id: "base64-url-encoder",
        label: "Base64 / URL Encoder",
        description: "Encode and decode common transport formats.",
      },
      {
        id: "jwt-decoder",
        label: "JWT Decoder",
        description: "Inspect token headers and claims safely.",
      },
      {
        id: "uuid-generator",
        label: "UUID Generator",
        description: "Create versioned IDs for app and infra work.",
      },
    ],
  },
  {
    title: "Time & Scheduling",
    description: "Scheduling and timestamp tools for operations work.",
    tools: [
      {
        id: "timestamp-generator",
        label: "Timestamp Generator",
        description: "Generate Unix and ISO timestamps.",
      },
      {
        id: "discord-timestamp-generator",
        label: "Discord Timestamp Generator",
        description: "Build Discord time tags with previews.",
        route: "/discord-timestamp",
        status: "live",
        metaDescription:
          "Generate Discord timestamp tags with live previews, Unix output, and copy-ready formats.",
      },
      {
        id: "cron-expression-generator",
        label: "Cron Expression Generator",
        description: "Create and validate 5-part cron schedules.",
        route: "/cron",
        status: "live",
        metaDescription:
          "Generate, validate, and explain 5-part cron expressions with readable schedule output.",
      },
    ],
  },
  {
    title: "Text & Formatting",
    description: "Utilities for editing, testing, and publishing text.",
    tools: [
      {
        id: "markdown-previewer",
        label: "Markdown Previewer",
        description: "Render markdown side by side.",
      },
      {
        id: "regex-tester",
        label: "Regex Tester",
        description: "Test patterns against sample input.",
      },
      {
        id: "announcement-formatter",
        label: "Announcement Formatter",
        description: "Format updates for clean posting.",
      },
    ],
  },
  {
    title: "Design & Creative",
    description: "Visual helpers for embeds, gradients, and assets.",
    tools: [
      {
        id: "qr-code-generator",
        label: "QR Code Generator",
        description: "Generate QR codes from links or text.",
      },
      {
        id: "css-gradient-generator",
        label: "CSS Gradient Generator",
        description: "Compose gradients and copy the CSS.",
      },
      {
        id: "discord-embed-builder",
        label: "Discord Embed Builder",
        description: "Assemble embeds with live structure previews.",
      },
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
        route: "/mcmotd",
        status: "live",
        metaDescription:
          "Generate Minecraft MOTDs with live preview, legacy formatting, and MiniMessage output.",
      },
      {
        id: "minimessage-previewer",
        label: "MiniMessage Previewer",
        description: "Preview styled message syntax.",
      },
      {
        id: "minecraft-gradient-text-generator",
        label: "Minecraft Gradient Text Generator",
        description: "Generate colorized gradient output.",
      },
    ],
  },
];

function normalizePath(pathname: string): string {
  if (!pathname) {
    return "/";
  }

  const normalized = pathname
    .replace(/\/index\.html$/i, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");

  return normalized || "/";
}

function getToolById(toolId: string): { group: ToolGroup; tool: Tool } | null {
  for (const group of TOOL_GROUPS) {
    const tool = group.tools.find((entry) => entry.id === toolId);

    if (tool) {
      return { group, tool };
    }
  }

  return null;
}

function getToolIdFromLocation(): string {
  const normalizedPath = normalizePath(window.location.pathname);

  for (const group of TOOL_GROUPS) {
    const match = group.tools.find(
      (tool) => tool.route && normalizePath(tool.route) === normalizedPath,
    );

    if (match) {
      return match.id;
    }
  }

  if (normalizedPath !== "/") {
    return HOME_TOOL_ID;
  }

  const requestedToolId = new URLSearchParams(window.location.search).get("tool");

  return requestedToolId && getToolById(requestedToolId) ? requestedToolId : HOME_TOOL_ID;
}

function getUrlForTool(toolId: string): string {
  if (toolId === HOME_TOOL_ID) {
    return "/";
  }

  const toolMatch = getToolById(toolId);

  if (!toolMatch) {
    return "/";
  }

  if (toolMatch.tool.route) {
    return toolMatch.tool.route;
  }

  return `/?tool=${encodeURIComponent(toolId)}`;
}

function setMetaTagContent(name: string, content: string): void {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }

  tag.content = content;
}

function setCanonicalHref(pathname: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }

  link.href = new URL(pathname, window.location.origin).toString();
}

function ToolDropdown({
  group,
  isOpen,
  onSelect,
  onToggle,
}: {
  group: ToolGroup;
  isOpen: boolean;
  onSelect: (toolId: string) => void;
  onToggle: () => void;
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
                <a
                  key={tool.id}
                  href={getUrlForTool(tool.id)}
                  onClick={(event) => {
                    event.preventDefault();
                    onSelect(tool.id);
                  }}
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
                </a>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ToolCard({
  tool,
  onSelect,
}: {
  tool: Tool;
  onSelect: (toolId: string) => void;
}) {
  return (
    <a
      href={getUrlForTool(tool.id)}
      onClick={(event) => {
        event.preventDefault();
        onSelect(tool.id);
      }}
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
      {tool.route ? (
        <div className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {tool.route}
        </div>
      ) : null}
    </a>
  );
}

function HomePage({
  onSelectTool,
}: {
  onSelectTool: (toolId: string) => void;
}) {
  const liveTools = useMemo(
    () =>
      TOOL_GROUPS.flatMap((group) =>
        group.tools.filter((tool) => tool.status === "live").map((tool) => ({
          ...tool,
          groupTitle: group.title,
        })),
      ),
    [],
  );

  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-10 rounded-[28px] border border-slate-800 bg-slate-950/80 px-6 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,26rem)] lg:px-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
            dchu096.tk
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
            Utility pages for the work people actually do every day
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            The live tools now sit on dedicated URLs, so cron, Discord timestamps, and Minecraft
            MOTDs can live as their own pages without breaking the shared site shell.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/cron"
              onClick={(event) => {
                event.preventDefault();
                onSelectTool("cron-expression-generator");
              }}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Open cron generator
            </a>
            <a
              href="/discord-timestamp"
              onClick={(event) => {
                event.preventDefault();
                onSelectTool("discord-timestamp-generator");
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Open Discord timestamps
            </a>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Live now</p>
            <p className="mt-3 text-xl font-semibold text-white">
              Cron, Discord timestamp, and MOTD generators
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Each live tool now has a dedicated page path for direct linking, refresh-safe access,
              and cleaner indexing.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Live paths</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              {liveTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <span>{tool.label}</span>
                  <span className="font-mono text-xs text-slate-500">{tool.route}</span>
                </div>
              ))}
            </div>
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
                <ToolCard key={tool.id} tool={tool} onSelect={onSelectTool} />
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}

function PlaceholderToolPage({
  category,
  title,
}: {
  category: string;
  title: string;
}) {
  return (
    <section className="rounded-[24px] border border-slate-800 bg-slate-950/80 px-6 py-10 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{category}</p>
      <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
        This tool is listed in the site shell, but the working page has not been built yet. The
        route-safe live tools are now split into dedicated pages, so additional utilities can be
        added without reworking the navigation again.
      </p>
    </section>
  );
}

function ToolPageHeader({
  category,
  title,
}: {
  category: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-5 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{category}</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">{title}</h1>
    </div>
  );
}

export default function App() {
  const [activeToolId, setActiveToolId] = useState<string>(() => getToolIdFromLocation());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [openMenuTitle, setOpenMenuTitle] = useState<string | null>(null);

  const activeTool = useMemo(
    () => (activeToolId === HOME_TOOL_ID ? null : getToolById(activeToolId)),
    [activeToolId],
  );

  useEffect(() => {
    const handlePopState = (): void => {
      setActiveToolId(getToolIdFromLocation());
      setIsMobileMenuOpen(false);
      setOpenMenuTitle(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!activeTool) {
      document.title = "dchu096.tk | Utilities";
      setMetaTagContent("description", HOME_META_DESCRIPTION);
      setCanonicalHref(window.location.pathname === "/" ? "/" : window.location.pathname);
      return;
    }

    document.title = `${activeTool.tool.label} | dchu096.tk`;
    setMetaTagContent(
      "description",
      activeTool.tool.metaDescription ?? activeTool.tool.description,
    );
    setCanonicalHref(activeTool.tool.route ?? "/");
  }, [activeTool]);

  const navigateTo = (toolId: string): void => {
    const nextUrl = getUrlForTool(toolId);

    setOpenMenuTitle(null);
    setIsMobileMenuOpen(false);

    if (
      toolId === activeToolId &&
      normalizePath(window.location.pathname) === normalizePath(nextUrl) &&
      window.location.search === ""
    ) {
      return;
    }

    window.history.pushState({ toolId }, "", nextUrl);
    setActiveToolId(toolId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigateTo(HOME_TOOL_ID);
              }}
              className="text-left"
            >
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
                dchu096.tk
              </div>
              <div className="mt-1 text-lg font-semibold text-white">Utilities</div>
            </a>

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
                <ToolPageHeader
                  category={activeTool.group.title}
                  title={activeTool.tool.label}
                />
                <CronGenerator />
              </div>
            ) : activeTool?.tool.id === "discord-timestamp-generator" ? (
              <div className="flex flex-col gap-6">
                <ToolPageHeader
                  category={activeTool.group.title}
                  title={activeTool.tool.label}
                />
                <DiscordTimestampGenerator />
              </div>
            ) : activeTool?.tool.id === "motd-generator" ? (
              <div className="flex flex-col gap-6">
                <ToolPageHeader
                  category={activeTool.group.title}
                  title={activeTool.tool.label}
                />
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
    </div>
  );
}
