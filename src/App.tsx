import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Base64UrlEncoder from "./components/Base64UrlEncoder";
import CronGenerator from "./components/CronGenerator";
import DiscordTimestampGenerator from "./components/DiscordTimestampGenerator";
import JsonValidator from "./components/JsonValidator";
import JwtDecoder from "./components/JwtDecoder";
import MarkdownPreviewer from "./components/MarkdownPreviewer";
import MotdGenerator from "./components/MotdGenerator";
import RegexTester from "./components/RegexTester";
import SshKeyGenerator from "./components/SshKeyGenerator";
import TimestampGenerator from "./components/TimestampGenerator";
import TomlValidator from "./components/TomlValidator";
import UuidGenerator from "./components/UuidGenerator";
import YamlValidator from "./components/YamlValidator";

type Tool = {
  aliases?: string[];
  component?: ComponentType;
  description: string;
  id: string;
  label: string;
  metaDescription?: string;
  route?: string;
};

type ToolGroup = {
  description: string;
  title: string;
  tools: Tool[];
};

const HOME_TOOL_ID = "home";
const HOME_META_DESCRIPTION =
  "Utility pages for validators, encoding helpers, timestamps, cron expressions, and text formatting work.";

const TOOL_GROUPS: ToolGroup[] = [
  {
    title: "Data & Encoding",
    description: "Converters, token tools, and ID helpers for payload work.",
    tools: [
      {
        id: "base64-url-encoder",
        label: "Base64 / URL Encoder",
        description: "Encode and decode Base64, Base64URL, and URL-safe text values.",
        route: "/encoding/base64-url",
        component: Base64UrlEncoder,
        metaDescription:
          "Encode and decode Base64, Base64URL, and URL-safe text values directly in the browser.",
      },
      {
        id: "jwt-decoder",
        label: "JWT Decoder",
        description: "Inspect token headers and claims locally without sending them anywhere.",
        route: "/encoding/jwt",
        component: JwtDecoder,
        metaDescription:
          "Decode JWT headers and claims locally, with basic warnings for obvious token issues.",
      },
      {
        id: "uuid-generator",
        label: "UUID Generator",
        description: "Generate UUID v4 values in batches and inspect pasted UUID strings.",
        route: "/encoding/uuid",
        component: UuidGenerator,
        metaDescription:
          "Generate UUID v4 values, copy them in batches, and inspect UUID version and variant fields.",
      },
      {
        id: "ssh-key-generator",
        label: "SSH Key Generator",
        description: "Generate browser-based RSA SSH key pairs and copy the outputs.",
        route: "/encoding/ssh-key",
        component: SshKeyGenerator,
        metaDescription:
          "Generate RSA SSH key pairs in the browser, copy the OpenSSH public key, and export the private key as PEM.",
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
        description: "Generate Unix seconds, milliseconds, and ISO timestamps.",
        route: "/time/timestamp",
        component: TimestampGenerator,
        metaDescription:
          "Generate Unix seconds, Unix milliseconds, and ISO timestamps from local datetime input.",
      },
      {
        id: "discord-timestamp-generator",
        label: "Discord Timestamp Generator",
        description: "Build Discord time tags with live local previews.",
        route: "/discord-timestamp",
        component: DiscordTimestampGenerator,
        metaDescription:
          "Generate Discord timestamp tags with live previews, Unix output, and copy-ready formats.",
      },
      {
        id: "cron-expression-generator",
        label: "Cron Expression Generator",
        description: "Create and validate standard 5-part cron schedules.",
        route: "/cron",
        component: CronGenerator,
        metaDescription:
          "Generate, validate, and explain standard 5-part cron expressions with readable schedule output.",
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
        description: "Render Markdown with a live preview and inspect the generated HTML.",
        route: "/text/markdown",
        component: MarkdownPreviewer,
        metaDescription:
          "Render Markdown with a live preview, inspect generated HTML, and sanitize the preview in-browser.",
      },
      {
        id: "regex-tester",
        label: "Regex Tester",
        description: "Test JavaScript regular expressions against sample input and replacements.",
        route: "/text/regex",
        component: RegexTester,
        metaDescription:
          "Test JavaScript regular expressions against sample text, inspect matches, and preview replacements.",
      },
    ],
  },
  {
    title: "Validators",
    description: "Validation and normalization tools for common config formats.",
    tools: [
      {
        id: "yaml-validator",
        label: "YAML Validator",
        description: "Validate YAML, inspect parser issues, and convert to JSON.",
        route: "/validators/yaml",
        aliases: ["/yaml-validator"],
        component: YamlValidator,
        metaDescription:
          "Validate YAML with parser-backed errors, warnings, normalized output, and JSON conversion.",
      },
      {
        id: "json-validator",
        label: "JSON Validator",
        description: "Validate JSON, normalize formatting, and sort object keys for stable output.",
        route: "/validators/json",
        component: JsonValidator,
        metaDescription:
          "Validate JSON, inspect parser errors, normalize formatting, and sort object keys for stable output.",
      },
      {
        id: "toml-validator",
        label: "TOML Validator",
        description: "Validate TOML configuration files and inspect their JSON structure.",
        route: "/validators/toml",
        component: TomlValidator,
        metaDescription:
          "Validate TOML and inspect parser-backed configuration errors with normalized output.",
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
        component: MotdGenerator,
        metaDescription:
          "Generate Minecraft MOTDs with live preview, legacy formatting, and MiniMessage output.",
      },
      {
        id: "minimessage-previewer",
        label: "MiniMessage Previewer",
        description: "Preview styled MiniMessage syntax and formatting output.",
      },
      {
        id: "minecraft-gradient-text-generator",
        label: "Minecraft Gradient Text Generator",
        description: "Generate colorized gradient output for Minecraft text.",
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

function getToolByPath(pathname: string): { group: ToolGroup; tool: Tool } | null {
  const normalizedPath = normalizePath(pathname);

  for (const group of TOOL_GROUPS) {
    const tool = group.tools.find(
      (entry) =>
        (entry.route && normalizePath(entry.route) === normalizedPath) ||
        entry.aliases?.some((alias) => normalizePath(alias) === normalizedPath),
    );

    if (tool) {
      return { group, tool };
    }
  }

  return null;
}

function getToolIdFromLocation(): string {
  const matchedTool = getToolByPath(window.location.pathname);

  if (matchedTool) {
    return matchedTool.tool.id;
  }

  if (normalizePath(window.location.pathname) === "/") {
    const requestedToolId = new URLSearchParams(window.location.search).get("tool");
    return requestedToolId && getToolById(requestedToolId) ? requestedToolId : HOME_TOOL_ID;
  }

  return HOME_TOOL_ID;
}

function getUrlForTool(toolId: string): string {
  if (toolId === HOME_TOOL_ID) {
    return "/";
  }

  const tool = getToolById(toolId)?.tool;

  if (!tool) {
    return "/";
  }

  return tool.route ?? `/?tool=${encodeURIComponent(toolId)}`;
}

function isToolAvailable(tool: Tool): boolean {
  return Boolean(tool.component);
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
    <div className="relative" data-tool-dropdown="true">
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
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/98 p-2 shadow-xl shadow-slate-950/40 lg:absolute lg:left-0 lg:top-full lg:z-30 lg:w-[20rem]"
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
                    <div className="text-sm font-medium text-slate-100">{tool.label}</div>
                    {!isToolAvailable(tool) ? (
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                        Coming soon
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
        {!isToolAvailable(tool) ? (
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
            Coming soon
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{tool.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        <span>{isToolAvailable(tool) ? "Open tool" : "Preview page"}</span>
        <span className="font-mono normal-case tracking-normal text-slate-600">
          {tool.route ?? "Coming soon"}
        </span>
      </div>
    </a>
  );
}

function HomePage({
  onSelectTool,
}: {
  onSelectTool: (toolId: string) => void;
}) {
  const allTools = useMemo(() => TOOL_GROUPS.flatMap((group) => group.tools), []);
  const availableTools = useMemo(() => allTools.filter((tool) => isToolAvailable(tool)), [allTools]);
  const comingSoonTools = useMemo(() => allTools.filter((tool) => !isToolAvailable(tool)), [allTools]);

  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-10 rounded-[28px] border border-slate-800 bg-slate-950/80 px-6 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,26rem)] lg:px-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
            dchu096.tk
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
            Utilities for validation, encoding, time, and text
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Quick tools for JSON, YAML, TOML, JWTs, Base64, UUIDs, cron, timestamps, regex,
            Markdown, Discord timestamps, and Minecraft MOTDs.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/validators/json"
              onClick={(event) => {
                event.preventDefault();
                onSelectTool("json-validator");
              }}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Open JSON validator
            </a>
            <a
              href="/cron"
              onClick={(event) => {
                event.preventDefault();
                onSelectTool("cron-expression-generator");
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Open cron generator
            </a>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Live tools</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {availableTools.length} utilities ready to use
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Direct links for the tools that are already available.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Coming soon</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {comingSoonTools.length} more tools planned
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Unavailable tools open a simple placeholder page for now.
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
        This tool is not available yet. Check back later or use one of the live utilities from the
        homepage.
      </p>
      <div className="mt-6 inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
        Coming soon
      </div>
    </section>
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
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (!target.closest('[data-tool-dropdown="true"]')) {
        setOpenMenuTitle(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
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
    const nextLocation = new URL(nextUrl, window.location.origin);

    setOpenMenuTitle(null);
    setIsMobileMenuOpen(false);

    if (
      toolId === activeToolId &&
      normalizePath(window.location.pathname) === normalizePath(nextLocation.pathname) &&
      window.location.search === nextLocation.search
    ) {
      return;
    }

    window.history.pushState({ toolId }, "", nextUrl);
    setActiveToolId(toolId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ActiveToolComponent = activeTool?.tool.component;

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
            {activeToolId === HOME_TOOL_ID ? <HomePage onSelectTool={navigateTo} /> : null}
            {activeToolId !== HOME_TOOL_ID && ActiveToolComponent ? <ActiveToolComponent /> : null}
            {activeToolId !== HOME_TOOL_ID && activeTool && !ActiveToolComponent ? (
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
