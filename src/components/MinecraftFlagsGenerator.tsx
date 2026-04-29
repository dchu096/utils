import { useMemo, useState } from "react";
import {
  CopyButton,
  ToolTextarea,
  cardClass,
  inputClass,
  primaryPanelClass,
} from "./ToolPrimitives";

type EnvironmentType = "bash" | "pterodactyl" | "windows";
type SoftwareType = "folia" | "paper" | "purpur" | "velocity" | "waterfall";
type FlagsPreset = "aikar" | "basic-g1gc" | "none";

const AIKAR_FLAGS =
  "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20";
const BASIC_G1GC_FLAGS =
  "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+DisableExplicitGC -XX:+AlwaysPreTouch";

function getMemoryAllocation(memoryGiB: number, calculateOverhead: boolean): number {
  const totalMiB = memoryGiB * 1024;

  if (!calculateOverhead) {
    return totalMiB;
  }

  return Math.max(512, Math.floor((totalMiB * 11) / 12 - 1200));
}

function getPresetFlags(preset: FlagsPreset): string {
  if (preset === "aikar") {
    return AIKAR_FLAGS;
  }

  if (preset === "basic-g1gc") {
    return BASIC_G1GC_FLAGS;
  }

  return "";
}

function getSoftwareTail(software: SoftwareType): { extraArgs: string[]; nogui: boolean } {
  if (software === "velocity" || software === "waterfall") {
    return {
      extraArgs: ["-Dterminal.jline=false", "-Dterminal.ansi=true"],
      nogui: false,
    };
  }

  return {
    extraArgs: [],
    nogui: true,
  };
}

function buildJavaCommand(options: {
  fileName: string;
  flagsPreset: FlagsPreset;
  memoryMb: number | string;
  software: SoftwareType;
  startupVariables: boolean;
  environment: EnvironmentType;
}): string {
  const presetFlags = getPresetFlags(options.flagsPreset);
  const softwareTail = getSoftwareTail(options.software);
  const xmsValue =
    options.environment === "pterodactyl" ? "128M" : `${options.memoryMb}M`;
  const xmxValue = `${options.memoryMb}M`;
  const jarValue =
    options.environment === "pterodactyl" && options.startupVariables
      ? "{{SERVER_JARFILE}}"
      : options.fileName;

  return [
    "java",
    `-Xms${xmsValue}`,
    `-Xmx${xmxValue}`,
    presetFlags,
    ...softwareTail.extraArgs,
    "-jar",
    jarValue,
    softwareTail.nogui ? "nogui" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildScript(options: {
  autoRestart: boolean;
  environment: EnvironmentType;
  fileName: string;
  flagsPreset: FlagsPreset;
  memoryMb: number;
  software: SoftwareType;
  startupVariables: boolean;
}): string {
  const memoryVariable =
    options.environment === "pterodactyl" && options.startupVariables
      ? "{{SERVER_MEMORY}}"
      : options.memoryMb;

  const command = buildJavaCommand({
    environment: options.environment,
    fileName: options.fileName,
    flagsPreset: options.flagsPreset,
    memoryMb: memoryVariable,
    software: options.software,
    startupVariables: options.startupVariables,
  });

  if (options.environment === "pterodactyl") {
    return command;
  }

  if (options.environment === "windows") {
    if (!options.startupVariables) {
      return options.autoRestart
        ? `@echo off\r\n:start\r\n${command}\r\necho Server stopped. Restarting in 5 seconds...\r\ntimeout /t 5 /nobreak >nul\r\ngoto start`
        : `@echo off\r\n${command}`;
    }

    return options.autoRestart
      ? `@echo off\r\nset SERVER_JAR=${options.fileName}\r\nset SERVER_MEMORY_MB=${options.memoryMb}\r\n:start\r\njava -Xms%SERVER_MEMORY_MB%M -Xmx%SERVER_MEMORY_MB%M ${getPresetFlags(options.flagsPreset)} ${getSoftwareTail(options.software).extraArgs.join(" ")} -jar %SERVER_JAR%${getSoftwareTail(options.software).nogui ? " nogui" : ""}\r\necho Server stopped. Restarting in 5 seconds...\r\ntimeout /t 5 /nobreak >nul\r\ngoto start`
      : `@echo off\r\nset SERVER_JAR=${options.fileName}\r\nset SERVER_MEMORY_MB=${options.memoryMb}\r\njava -Xms%SERVER_MEMORY_MB%M -Xmx%SERVER_MEMORY_MB%M ${getPresetFlags(options.flagsPreset)} ${getSoftwareTail(options.software).extraArgs.join(" ")} -jar %SERVER_JAR%${getSoftwareTail(options.software).nogui ? " nogui" : ""}`;
  }

  if (!options.startupVariables) {
    return options.autoRestart
      ? `#!/usr/bin/env bash\nwhile true; do\n  ${command}\n  echo "Server stopped. Restarting in 5 seconds..."\n  sleep 5\ndone`
      : `#!/usr/bin/env bash\n${command}`;
  }

  const bashCommand = `java -Xms\${SERVER_MEMORY_MB}M -Xmx\${SERVER_MEMORY_MB}M ${getPresetFlags(options.flagsPreset)} ${getSoftwareTail(options.software).extraArgs.join(" ")} -jar "\${SERVER_JAR}"${getSoftwareTail(options.software).nogui ? " nogui" : ""}`.replaceAll("  ", " ").trim();

  return options.autoRestart
    ? `#!/usr/bin/env bash\nSERVER_JAR="${options.fileName}"\nSERVER_MEMORY_MB=${options.memoryMb}\nwhile true; do\n  ${bashCommand}\n  echo "Server stopped. Restarting in 5 seconds..."\n  sleep 5\ndone`
    : `#!/usr/bin/env bash\nSERVER_JAR="${options.fileName}"\nSERVER_MEMORY_MB=${options.memoryMb}\n${bashCommand}`;
}

export default function MinecraftFlagsGenerator() {
  const [fileName, setFileName] = useState<string>("server.jar");
  const [environment, setEnvironment] = useState<EnvironmentType>("pterodactyl");
  const [software, setSoftware] = useState<SoftwareType>("paper");
  const [flagsPreset, setFlagsPreset] = useState<FlagsPreset>("aikar");
  const [memoryGiB, setMemoryGiB] = useState<number>(8);
  const [useVariables, setUseVariables] = useState<boolean>(true);
  const [autoRestart, setAutoRestart] = useState<boolean>(false);
  const [calculateOverhead, setCalculateOverhead] = useState<boolean>(true);

  const memoryMb = useMemo(
    () => getMemoryAllocation(memoryGiB, calculateOverhead),
    [calculateOverhead, memoryGiB],
  );
  const scriptOutput = useMemo(
    () =>
      buildScript({
        autoRestart: environment === "pterodactyl" ? false : autoRestart,
        environment,
        fileName,
        flagsPreset,
        memoryMb,
        software,
        startupVariables: useVariables,
      }),
    [autoRestart, environment, fileName, flagsPreset, memoryMb, software, useVariables],
  );

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div>
          <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Minecraft</span>
          <h1 className="mt-4 text-3xl font-semibold text-white">Flags Generator</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Generate a practical Java startup command for Paper-style servers or proxies, with
            Aikar-style flags, environment-specific output, and optional restart wrapping for local
            scripts.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <section className={primaryPanelClass}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">File name</label>
              <input
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                spellCheck={false}
                className={inputClass}
              />
              <div className="mt-2 text-xs text-slate-500">
                The jar file used in the generated launch command.
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Flags preset</label>
              <select
                value={flagsPreset}
                onChange={(event) => setFlagsPreset(event.target.value as FlagsPreset)}
                className={inputClass}
              >
                <option value="aikar">Aikar&apos;s Flags</option>
                <option value="basic-g1gc">Basic G1GC</option>
                <option value="none">No extra JVM flags</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Environment</label>
              <select
                value={environment}
                onChange={(event) => setEnvironment(event.target.value as EnvironmentType)}
                className={inputClass}
              >
                <option value="pterodactyl">Pterodactyl</option>
                <option value="bash">Linux / Bash</option>
                <option value="windows">Windows / Batch</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Software</label>
              <select
                value={software}
                onChange={(event) => setSoftware(event.target.value as SoftwareType)}
                className={inputClass}
              >
                <option value="paper">Paper</option>
                <option value="purpur">Purpur</option>
                <option value="folia">Folia</option>
                <option value="velocity">Velocity</option>
                <option value="waterfall">Waterfall</option>
              </select>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Memory ({memoryGiB} GiB)</p>
                <p className="mt-1 text-xs text-slate-500">
                  Generated `-Xmx` target: {memoryMb}M
                </p>
              </div>
            </div>

            <input
              type="range"
              min={2}
              max={32}
              step={1}
              value={memoryGiB}
              onChange={(event) => setMemoryGiB(Number.parseInt(event.target.value, 10))}
              className="mt-4 w-full"
            />

            <label className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={calculateOverhead}
                onChange={(event) => setCalculateOverhead(event.target.checked)}
              />
              Calculate overhead
            </label>

            <div className="mt-3 text-xs leading-6 text-slate-500">
              Uses `11x / 12 - 1200` against the total memory in MiB to leave headroom for the
              panel, container, and native overhead.
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={useVariables}
                onChange={(event) => setUseVariables(event.target.checked)}
              />
              Use variables
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={autoRestart}
                onChange={(event) => setAutoRestart(event.target.checked)}
                disabled={environment === "pterodactyl"}
              />
              Auto-restart
            </label>
          </div>

          {environment === "pterodactyl" ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
              Pterodactyl usually manages restart policy outside the startup command, so auto-restart
              is disabled for that environment.
            </div>
          ) : null}
        </section>

        <section className={primaryPanelClass}>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Output</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Environment</div>
              <div className="mt-2 text-lg font-semibold capitalize text-white">{environment}</div>
            </div>
            <div className={cardClass}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Software</div>
              <div className="mt-2 text-lg font-semibold capitalize text-white">{software}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Script</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Copy the generated command or script directly into your server startup flow.
                </p>
              </div>
              <CopyButton label="Script" value={scriptOutput} />
            </div>

            <ToolTextarea readOnly value={scriptOutput} rows={16} spellCheck={false} />
          </div>
        </section>
      </section>
    </div>
  );
}
