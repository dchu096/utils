import { useMemo, useState } from "react";
import { CopyButton, ToolTextarea, inputClass, primaryPanelClass } from "./ToolPrimitives";

type EnvironmentType = "command" | "linux" | "macos" | "pterodactyl" | "windows";
type SoftwareType = "folia" | "paper" | "purpur" | "velocity" | "waterfall";
type FlagsPreset = "aikar" | "etil" | "hiltty" | "meowice" | "none" | "obydux";

const AIKAR_FLAGS =
  "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -Dterminal.jline=false -Dterminal.ansi=true";
const MEOWICE_FLAGS =
  "-XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+UnlockDiagnosticVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=28 -XX:G1MaxNewSizePercent=50 -XX:G1HeapRegionSize=16M -XX:G1ReservePercent=15 -XX:G1MixedGCCountTarget=3 -XX:InitiatingHeapOccupancyPercent=20 -XX:G1MixedGCLiveThresholdPercent=90 -XX:SurvivorRatio=32 -XX:G1HeapWastePercent=5 -XX:MaxTenuringThreshold=1 -XX:+PerfDisableSharedMem -XX:G1SATBBufferEnqueueingThresholdPercent=30 -XX:G1ConcMarkStepDurationMillis=5 -XX:G1RSetUpdatingPauseTimePercent=0 -XX:+UseNUMA -XX:-DontCompileHugeMethods -XX:MaxNodeLimit=240000 -XX:NodeLimitFudgeFactor=8000 -XX:ReservedCodeCacheSize=400M -XX:NonNMethodCodeHeapSize=12M -XX:ProfiledCodeHeapSize=194M -XX:NonProfiledCodeHeapSize=194M -XX:NmethodSweepActivity=1 -XX:+UseFastUnorderedTimeStamps -XX:+UseCriticalJavaThreadPriority -XX:AllocatePrefetchStyle=3 -XX:+AlwaysActAsServerClassMachine -XX:+UseTransparentHugePages -XX:LargePageSizeInBytes=2M -XX:+UseLargePages -XX:+EagerJVMCI -XX:+UseStringDeduplication -XX:+UseAES -XX:+UseAESIntrinsics -XX:+UseFMA -XX:+UseLoopPredicate -XX:+RangeCheckElimination -XX:+OptimizeStringConcat -XX:+UseCompressedOops -XX:+UseThreadPriorities -XX:+OmitStackTraceInFastThrow -XX:+RewriteBytecodes -XX:+RewriteFrequentPairs -XX:+UseFPUForSpilling -XX:+UseFastStosb -XX:+UseNewLongLShift -XX:+UseVectorCmov -XX:+UseXMMForArrayCopy -XX:+UseXmmI2D -XX:+UseXmmI2F -XX:+UseXmmLoadAndClearUpper -XX:+UseXmmRegToRegMoveAll -XX:+EliminateLocks -XX:+DoEscapeAnalysis -XX:+AlignVector -XX:+OptimizeFill -XX:+EnableVectorSupport -XX:+UseCharacterCompareIntrinsics -XX:+UseCopySignIntrinsic -XX:+UseVectorStubs -XX:UseAVX=2 -XX:UseSSE=4 -XX:+UseFastJNIAccessors -XX:+UseInlineCaches -XX:+SegmentedCodeCache -Dterminal.jline=false -Dterminal.ansi=true";
const HILTTY_FLAGS =
  "-XX:+UseLargePages -XX:LargePageSizeInBytes=2M -XX:+UnlockExperimentalVMOptions -XX:+UseShenandoahGC -XX:ShenandoahGCMode=iu -XX:+UseNUMA -XX:+AlwaysPreTouch -XX:-UseBiasedLocking -XX:+DisableExplicitGC -Dterminal.jline=false -Dterminal.ansi=true";
const OBYDUX_FLAGS =
  "-XX:+UseG1GC -XX:MaxGCPauseMillis=130 -XX:+UnlockExperimentalVMOptions -XX:+UnlockDiagnosticVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=28 -XX:G1HeapRegionSize=16M -XX:G1ReservePercent=20 -XX:G1MixedGCCountTarget=3 -XX:InitiatingHeapOccupancyPercent=10 -XX:G1MixedGCLiveThresholdPercent=90 -XX:SurvivorRatio=32 -XX:MaxTenuringThreshold=1 -XX:+PerfDisableSharedMem -XX:G1SATBBufferEnqueueingThresholdPercent=30 -XX:G1ConcMarkStepDurationMillis=5 -XX:G1ConcRSHotCardLimit=16 -XX:G1ConcRefinementServiceIntervalMillis=150 -XX:G1RSetUpdatingPauseTimePercent=0 -XX:+UseNUMA -XX:-DontCompileHugeMethods -XX:MaxNodeLimit=240000 -XX:NodeLimitFudgeFactor=8000 -XX:ReservedCodeCacheSize=400M -XX:NonNMethodCodeHeapSize=12M -XX:ProfiledCodeHeapSize=194M -XX:NonProfiledCodeHeapSize=194M -XX:NmethodSweepActivity=1 -XX:+UseFastUnorderedTimeStamps -XX:+UseCriticalJavaThreadPriority -XX:AllocatePrefetchStyle=3 -XX:+AlwaysActAsServerClassMachine -XX:+UseTransparentHugePages -XX:LargePageSizeInBytes=2M -XX:+UseLargePages -XX:+EagerJVMCI -Dgraal.TuneInlinerExploration=1 -Dgraal.LoopRotation=true -Dgraal.OptWriteMotion=true -Dgraal.CompilerConfiguration=enterprise -Dterminal.jline=false -Dterminal.ansi=true";
const ETIL_FLAGS =
  "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+UnlockDiagnosticVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -XX:-UseBiasedLocking -XX:UseAVX=3 -XX:+UseStringDeduplication -XX:+UseFastUnorderedTimeStamps -XX:+UseAES -XX:+UseAESIntrinsics -XX:UseSSE=4 -XX:+UseFMA -XX:AllocatePrefetchStyle=1 -XX:+UseLoopPredicate -XX:+RangeCheckElimination -XX:+EliminateLocks -XX:+DoEscapeAnalysis -XX:+UseCodeCacheFlushing -XX:+SegmentedCodeCache -XX:+UseFastJNIAccessors -XX:+OptimizeStringConcat -XX:+UseCompressedOops -XX:+UseThreadPriorities -XX:+OmitStackTraceInFastThrow -XX:+TrustFinalNonStaticFields -XX:ThreadPriorityPolicy=1 -XX:+UseInlineCaches -XX:+RewriteBytecodes -XX:+RewriteFrequentPairs -XX:+UseNUMA -XX:-DontCompileHugeMethods -XX:+UseFPUForSpilling -XX:+UseFastStosb -XX:+UseNewLongLShift -XX:+UseVectorCmov -XX:+UseXMMForArrayCopy -XX:+UseXmmI2D -XX:+UseXmmI2F -XX:+UseXmmLoadAndClearUpper -XX:+UseXmmRegToRegMoveAll -Xlog:async -Djava.security.egd=file:/dev/urandom -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=15 -Dterminal.jline=false -Dterminal.ansi=true";

const ENVIRONMENT_OPTIONS: Array<{
  description: string;
  label: string;
  value: EnvironmentType;
}> = [
  {
    value: "command",
    label: "Command",
    description: "Raw java command with no wrapper script.",
  },
  {
    value: "linux",
    label: "Linux",
    description: "Bash script with optional restart loop.",
  },
  {
    value: "macos",
    label: "macOS",
    description: "Bash script with a working-directory change before launch.",
  },
  {
    value: "windows",
    label: "Windows",
    description: "Batch script with optional restart loop.",
  },
  {
    value: "pterodactyl",
    label: "Pterodactyl",
    description: "Panel startup command using egg variables where needed.",
  },
];

const SOFTWARE_OPTIONS: Array<{
  description: string;
  label: string;
  value: SoftwareType;
}> = [
  {
    value: "paper",
    label: "Paper",
    description: "Paper and close forks with standard server startup.",
  },
  {
    value: "purpur",
    label: "Purpur",
    description: "Purpur-specific toggles like Modern Vectors may apply.",
  },
  {
    value: "folia",
    label: "Folia",
    description: "Region-threaded Paper fork with standard nogui startup.",
  },
  {
    value: "velocity",
    label: "Velocity",
    description: "Proxy startup with terminal flags instead of nogui.",
  },
  {
    value: "waterfall",
    label: "Waterfall",
    description: "Proxy startup with terminal flags instead of nogui.",
  },
];

const FLAGS_PRESET_OPTIONS: Array<{
  description: string;
  label: string;
  value: FlagsPreset;
}> = [
  {
    value: "aikar",
    label: "Aikar's Flags",
    description: "Classic Paper-style G1GC preset with the usual terminal flags.",
  },
  {
    value: "meowice",
    label: "MeowIce",
    description: "Heavy G1GC tuning set with wider HotSpot and vector-related tweaks.",
  },
  {
    value: "hiltty",
    label: "Hiltty",
    description: "Shenandoah-focused preset with large pages and NUMA enabled.",
  },
  {
    value: "obydux",
    label: "Obydux",
    description: "Aggressive G1GC preset with extra Graal and refinement tuning.",
  },
  {
    value: "etil",
    label: "Etil",
    description: "Extended G1GC preset with CPU-oriented HotSpot tuning.",
  },
  {
    value: "none",
    label: "No extra flags",
    description: "Only memory settings and launch arguments.",
  },
];

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

  if (preset === "meowice") {
    return MEOWICE_FLAGS;
  }

  if (preset === "hiltty") {
    return HILTTY_FLAGS;
  }

  if (preset === "obydux") {
    return OBYDUX_FLAGS;
  }

  if (preset === "etil") {
    return ETIL_FLAGS;
  }

  return "";
}

function isProxySoftware(software: SoftwareType): boolean {
  return software === "velocity" || software === "waterfall";
}

function supportsModernVectors(software: SoftwareType): boolean {
  return software === "paper" || software === "purpur" || software === "folia";
}

function buildJavaCommand(options: {
  environment: EnvironmentType;
  fileName: string;
  flagsPreset: FlagsPreset;
  memoryMb: number | string;
  modernVectors: boolean;
  noGui: boolean;
  software: SoftwareType;
  useVariables: boolean;
}): string {
  const presetFlags = getPresetFlags(options.flagsPreset);
  const jarValue =
    options.environment === "pterodactyl" && options.useVariables
      ? "{{SERVER_JARFILE}}"
      : options.fileName;
  const xmsValue = options.environment === "pterodactyl" ? "128M" : `${options.memoryMb}M`;
  const xmxValue = `${options.memoryMb}M`;
  const modernVectorArgs =
    options.modernVectors && supportsModernVectors(options.software)
      ? ["--add-modules=jdk.incubator.vector"]
      : [];

  return [
    "java",
    `-Xms${xmsValue}`,
    `-Xmx${xmxValue}`,
    presetFlags,
    ...modernVectorArgs,
    "-jar",
    jarValue,
    options.noGui && !isProxySoftware(options.software) ? "nogui" : "",
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
  modernVectors: boolean;
  noGui: boolean;
  software: SoftwareType;
  useVariables: boolean;
}): string {
  const memoryVariable =
    options.environment === "pterodactyl" && options.useVariables
      ? "{{SERVER_MEMORY}}"
      : options.memoryMb;

  const command = buildJavaCommand({
    environment: options.environment,
    fileName: options.fileName,
    flagsPreset: options.flagsPreset,
    memoryMb: memoryVariable,
    modernVectors: options.modernVectors,
    noGui: options.noGui,
    software: options.software,
    useVariables: options.useVariables,
  });

  if (options.environment === "pterodactyl" || options.environment === "command") {
    return command;
  }

  if (options.environment === "windows") {
    if (!options.useVariables) {
      return options.autoRestart
        ? `@echo off\r\n:start\r\n${command}\r\necho Server stopped. Restarting in 5 seconds...\r\ntimeout /t 5 /nobreak >nul\r\ngoto start`
        : `@echo off\r\n${command}`;
    }

    const vectorArgs =
      options.modernVectors && supportsModernVectors(options.software)
        ? "--add-modules=jdk.incubator.vector "
        : "";
    const noGuiArg = options.noGui && !isProxySoftware(options.software) ? " nogui" : "";
    return options.autoRestart
      ? `@echo off\r\nset SERVER_JAR=${options.fileName}\r\nset SERVER_MEMORY_MB=${options.memoryMb}\r\n:start\r\njava -Xms%SERVER_MEMORY_MB%M -Xmx%SERVER_MEMORY_MB%M ${getPresetFlags(options.flagsPreset)} ${vectorArgs}-jar %SERVER_JAR%${noGuiArg}\r\necho Server stopped. Restarting in 5 seconds...\r\ntimeout /t 5 /nobreak >nul\r\ngoto start`
      : `@echo off\r\nset SERVER_JAR=${options.fileName}\r\nset SERVER_MEMORY_MB=${options.memoryMb}\r\njava -Xms%SERVER_MEMORY_MB%M -Xmx%SERVER_MEMORY_MB%M ${getPresetFlags(options.flagsPreset)} ${vectorArgs}-jar %SERVER_JAR%${noGuiArg}`;
  }

  const vectorArgs =
    options.modernVectors && supportsModernVectors(options.software)
      ? "--add-modules=jdk.incubator.vector "
      : "";
  const noGuiArg = options.noGui && !isProxySoftware(options.software) ? " nogui" : "";

  if (!options.useVariables) {
    const lines = ["#!/usr/bin/env bash"];

    if (options.environment === "macos") {
      lines.push('cd "$(dirname "$0")"');
      lines.push("");
    }

    if (options.autoRestart) {
      lines.push("while true; do");
      lines.push(`  ${command}`);
      lines.push('  echo "Server stopped. Restarting in 5 seconds..."');
      lines.push("  sleep 5");
      lines.push("done");
      return lines.join("\n");
    }

    lines.push(command);
    return lines.join("\n");
  }

  const bashCommand = `java -Xms\${SERVER_MEMORY_MB}M -Xmx\${SERVER_MEMORY_MB}M ${getPresetFlags(options.flagsPreset)} ${vectorArgs}-jar "\${SERVER_JAR}"${noGuiArg}`
    .replaceAll("  ", " ")
    .trim();
  const lines = ["#!/usr/bin/env bash"];

  if (options.environment === "macos") {
    lines.push('cd "$(dirname "$0")"');
  }

  lines.push(`SERVER_JAR="${options.fileName}"`);
  lines.push(`SERVER_MEMORY_MB=${options.memoryMb}`);

  if (options.autoRestart) {
    lines.push("while true; do");
    lines.push(`  ${bashCommand}`);
    lines.push('  echo "Server stopped. Restarting in 5 seconds..."');
    lines.push("  sleep 5");
    lines.push("done");
    return lines.join("\n");
  }

  lines.push(bashCommand);
  return lines.join("\n");
}

export default function MinecraftFlagsGenerator() {
  const [fileName, setFileName] = useState<string>("server.jar");
  const [environment, setEnvironment] = useState<EnvironmentType>("command");
  const [software, setSoftware] = useState<SoftwareType>("paper");
  const [flagsPreset, setFlagsPreset] = useState<FlagsPreset>("aikar");
  const [memoryGiB, setMemoryGiB] = useState<number>(8);
  const [calculateOverhead, setCalculateOverhead] = useState<boolean>(true);
  const [noGui, setNoGui] = useState<boolean>(true);
  const [useVariables, setUseVariables] = useState<boolean>(false);
  const [autoRestart, setAutoRestart] = useState<boolean>(false);
  const [modernVectors, setModernVectors] = useState<boolean>(false);

  const memoryMb = useMemo(
    () => getMemoryAllocation(memoryGiB, calculateOverhead),
    [calculateOverhead, memoryGiB],
  );
  const selectedEnvironment = useMemo(
    () => ENVIRONMENT_OPTIONS.find((option) => option.value === environment),
    [environment],
  );
  const selectedSoftware = useMemo(
    () => SOFTWARE_OPTIONS.find((option) => option.value === software),
    [software],
  );
  const selectedPreset = useMemo(
    () => FLAGS_PRESET_OPTIONS.find((option) => option.value === flagsPreset),
    [flagsPreset],
  );
  const scriptOutput = useMemo(
    () =>
      buildScript({
        autoRestart: environment === "pterodactyl" || environment === "command" ? false : autoRestart,
        environment,
        fileName,
        flagsPreset,
        memoryMb,
        modernVectors,
        noGui,
        software,
        useVariables,
      }),
    [autoRestart, environment, fileName, flagsPreset, memoryMb, modernVectors, noGui, software, useVariables],
  );

  return (
    <div className="grid gap-6">
      <section className={primaryPanelClass}>
        <div className="max-w-3xl">
          <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Minecraft</span>
          <h1 className="mt-4 text-3xl font-semibold text-white">Flags Generator</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Generate a practical startup command for Minecraft servers and proxies with JVM flag
            presets, memory tuning, and environment-specific script output.
          </p>
        </div>
      </section>

      <section className={`${primaryPanelClass} grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-200">File Name</label>
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              spellCheck={false}
              className={inputClass}
            />
            <p className="mt-2 text-sm text-slate-500">
              The jar file used in the generated launch command.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200">Environment</label>
              <select
                value={environment}
                onChange={(event) => setEnvironment(event.target.value as EnvironmentType)}
                className={inputClass}
              >
                {ENVIRONMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500">{selectedEnvironment?.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">Software</label>
              <select
                value={software}
                onChange={(event) => setSoftware(event.target.value as SoftwareType)}
                className={inputClass}
              >
                {SOFTWARE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500">{selectedSoftware?.description}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label className="block text-sm font-medium text-slate-200">Memory ({memoryGiB} GiB)</label>
              <span className="text-sm text-slate-400">{memoryMb}M target</span>
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
            <p className="mt-2 text-sm text-slate-500">
              The amount of memory allocated to the server process.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-slate-100">
              <span className="relative inline-flex h-7 w-12 items-center">
                <input
                  type="checkbox"
                  checked={calculateOverhead}
                  onChange={(event) => setCalculateOverhead(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-slate-700 transition peer-checked:bg-cyan-500" />
                <span className="absolute left-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
              </span>
              <span className="font-medium">Calculate Overhead</span>
            </label>
            <p className="text-sm leading-6 text-slate-400">
              Recommended to avoid out-of-memory issues. Uses `11x / 12 - 1200` where `x` is the
              total memory in MiB.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-200">Flags</label>
            <select
              value={flagsPreset}
              onChange={(event) => setFlagsPreset(event.target.value as FlagsPreset)}
              className={inputClass}
            >
              {FLAGS_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-slate-500">{selectedPreset?.description}</p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-200">Config</h2>
            <p className="mt-2 text-sm text-slate-500">
              Additions and modifiers that change the final startup command.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-1">
              <label className="flex items-center gap-3 text-sm text-slate-100">
                <span className="relative inline-flex h-7 w-12 items-center">
                  <input
                    type="checkbox"
                    checked={noGui}
                    onChange={(event) => setNoGui(event.target.checked)}
                    disabled={isProxySoftware(software)}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-700 transition peer-checked:bg-cyan-500 peer-disabled:opacity-40" />
                  <span className="absolute left-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5 peer-disabled:opacity-60" />
                </span>
                <span className="font-medium">No GUI</span>
              </label>
              <p className="text-sm text-slate-400">
                {isProxySoftware(software)
                  ? "Proxy software does not use the standard `nogui` argument."
                  : "Display or omit the built-in server management GUI."}
              </p>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-3 text-sm text-slate-100">
                <span className="relative inline-flex h-7 w-12 items-center">
                  <input
                    type="checkbox"
                    checked={useVariables}
                    onChange={(event) => setUseVariables(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-700 transition peer-checked:bg-cyan-500" />
                  <span className="absolute left-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
                </span>
                <span className="font-medium">Use Variables</span>
              </label>
              <p className="text-sm text-slate-400">
                Use environment or script variables for memory, file name, and other commonly
                changed values.
              </p>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-3 text-sm text-slate-100">
                <span className="relative inline-flex h-7 w-12 items-center">
                  <input
                    type="checkbox"
                    checked={autoRestart}
                    onChange={(event) => setAutoRestart(event.target.checked)}
                    disabled={environment === "pterodactyl" || environment === "command"}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-700 transition peer-checked:bg-cyan-500 peer-disabled:opacity-40" />
                  <span className="absolute left-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5 peer-disabled:opacity-60" />
                </span>
                <span className="font-medium">Auto-restart</span>
              </label>
              <p className="text-sm text-slate-400">
                {environment === "pterodactyl" || environment === "command"
                  ? "Restart handling lives outside the generated command for this environment."
                  : "Automatically restart after the process stops."}
              </p>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-3 text-sm text-slate-100">
                <span className="relative inline-flex h-7 w-12 items-center">
                  <input
                    type="checkbox"
                    checked={modernVectors}
                    onChange={(event) => setModernVectors(event.target.checked)}
                    disabled={!supportsModernVectors(software)}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-700 transition peer-checked:bg-cyan-500 peer-disabled:opacity-40" />
                  <span className="absolute left-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5 peer-disabled:opacity-60" />
                </span>
                <span className="font-medium">Modern Vectors</span>
              </label>
              <p className="text-sm text-slate-400">
                {supportsModernVectors(software)
                  ? "Adds `--add-modules=jdk.incubator.vector` for servers that benefit from SIMD work."
                  : "This toggle only applies to Paper-style server software."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={primaryPanelClass}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Script</h2>
            <p className="mt-2 text-sm text-slate-400">
              Copy the generated command or script directly into your startup flow.
            </p>
          </div>
          <CopyButton label="Script" value={scriptOutput} />
        </div>

        <ToolTextarea readOnly value={scriptOutput} rows={16} spellCheck={false} />
      </section>
    </div>
  );
}
