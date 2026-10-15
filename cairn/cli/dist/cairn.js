#!/usr/bin/env node
"use strict";

// cli/src/cairn.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var import_node_path3 = require("node:path");

// cli/src/dispatch.ts
var import_node_path2 = require("node:path");

// cli/src/setup-pi.ts
var import_node_path = require("node:path");
function setupPaths(env) {
  return {
    extensionDir: (0, import_node_path.join)(env.repoRoot, "pi-extension"),
    bundle: (0, import_node_path.join)(env.repoRoot, "pi-extension", "dist", "cairn.js"),
    skillsDir: (0, import_node_path.join)(env.repoRoot, "claude-plugin", "skills"),
    legacyUser: (0, import_node_path.join)(env.agentDir, "extensions", "cairn.ts"),
    legacyProject: (0, import_node_path.join)(env.cwd, ".pi", "extensions", "cairn.ts")
  };
}
function listedPaths(listOutput) {
  return listOutput.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("/"));
}
function firstLine(text) {
  return text.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";
}
function runSetupPi(mode, env) {
  if (mode === "check") return check(env);
  if (mode === "remove") return remove(env);
  return install(env);
}
function install(env) {
  const paths = setupPaths(env);
  const pi = env.run("pi", ["--version"]);
  if (!pi.ok) {
    env.err(`pi did not run (pi --version: ${failure(pi)}). Install pi and put it on PATH, then run this again.`);
    return 1;
  }
  env.out(`\u2713 pi ${firstLine(pi.stdout)}`);
  const bd = env.run(env.bd, ["--version"]);
  if (bd.ok) env.out(`\u2713 ${firstLine(bd.stdout)}`);
  else env.out(`\u26A0 bd did not run (${env.bd}). The Cairn tools need it at run time: put bd on PATH or set BD.`);
  const missing = [paths.bundle, paths.skillsDir].filter((path) => !env.exists(path));
  if (missing.length > 0) {
    for (const path of missing) env.err(`\u2717 missing: ${path}`);
    env.err("Run npm run build:plugin in the repository, then run this again.");
    return 1;
  }
  for (const legacy of [paths.legacyUser, paths.legacyProject].filter((path) => env.exists(path))) {
    env.out(`\u26A0 the old Cairn extension is still here and would load next to this one: ${legacy}`);
    env.out("  Remove it yourself; this command does not delete files.");
  }
  const list = env.run("pi", ["list"]);
  if (!list.ok) {
    env.err(`pi list failed: ${failure(list)}`);
    return 1;
  }
  if (listedPaths(list.stdout).includes(paths.extensionDir)) {
    env.out(`Cairn is already installed from ${paths.extensionDir}.`);
    return 0;
  }
  const added = env.run("pi", ["install", paths.extensionDir]);
  if (!added.ok) {
    env.err(`pi install failed: ${failure(added)}`);
    return 1;
  }
  for (const line of added.stdout.split(/\r?\n/).filter((text) => text.trim() !== "")) env.out(line);
  env.out("Restart pi (or /reload) to load Cairn.");
  return 0;
}
function check(env) {
  const paths = setupPaths(env);
  const pi = env.run("pi", ["--version"]);
  const bd = env.run(env.bd, ["--version"]);
  const list = env.run("pi", ["list"]);
  const listed = list.ok && listedPaths(list.stdout).includes(paths.extensionDir);
  const legacy = [paths.legacyUser, paths.legacyProject].filter((path) => env.exists(path));
  const lines = [
    pi.ok ? { ok: true, required: true, text: `pi runs (${firstLine(pi.stdout)})` } : { ok: false, required: true, text: `pi does not run (${failure(pi)})` },
    bd.ok ? { ok: true, required: false, text: `bd runs (${firstLine(bd.stdout)})` } : { ok: false, required: false, text: `bd does not run (${env.bd}); optional for install, the tools need it` },
    env.exists(paths.bundle) ? { ok: true, required: true, text: `built bundle ${paths.bundle}` } : { ok: false, required: true, text: `built bundle missing: ${paths.bundle} (run npm run build:plugin)` },
    env.exists(paths.skillsDir) ? { ok: true, required: true, text: `skills ${paths.skillsDir}` } : { ok: false, required: true, text: `skills folder missing: ${paths.skillsDir}` },
    listed ? { ok: true, required: true, text: "installed in pi (pi list)" } : { ok: false, required: true, text: "not installed in pi (pi list); run: cairn setup pi" },
    legacy.length === 0 ? { ok: true, required: true, text: "no old cairn.ts extension" } : { ok: false, required: true, text: `old cairn.ts extension present: ${legacy.join(", ")}` }
  ];
  for (const line of lines) env.out(`${line.ok ? "\u2713" : "\u2717"} ${line.text}`);
  return lines.every((line) => line.ok || !line.required) ? 0 : 1;
}
function remove(env) {
  const paths = setupPaths(env);
  const list = env.run("pi", ["list"]);
  if (!list.ok) {
    env.err(`pi list failed: ${failure(list)}`);
    return 1;
  }
  if (!listedPaths(list.stdout).includes(paths.extensionDir)) {
    env.out("Cairn is not installed (it is not in pi list).");
    return 0;
  }
  const removed = env.run("pi", ["remove", paths.extensionDir]);
  if (!removed.ok) {
    env.err(`pi remove failed: ${failure(removed)}`);
    return 1;
  }
  for (const line of removed.stdout.split(/\r?\n/).filter((text) => text.trim() !== "")) env.out(line);
  env.out("Restart pi (or /reload) to unload Cairn.");
  return 0;
}
function failure(result) {
  const text = (result.stderr || result.stdout).trim();
  if (text) return text;
  return result.code === null ? "could not start" : `exit ${result.code}`;
}

// cli/src/dispatch.ts
var USAGE = [
  "Usage:",
  "  cairn setup pi            install the Cairn pi package (runs pi install)",
  "  cairn setup pi --check    print one line per requirement; exit 0 when all required ones pass",
  "  cairn setup pi --remove   remove the Cairn pi package (runs pi remove)",
  "  cairn --version           print the version of the pi package",
  "  cairn help                show this text",
  "  cairn-go                  the previous Go cairn; it reads old .cairn/ logs"
].join("\n");
function dispatch(argv, deps) {
  const env = { ...deps };
  const [command, ...rest] = argv;
  if (command === void 0 || command === "help" || command === "--help" || command === "-h") {
    deps.out(USAGE);
    return 0;
  }
  if (command === "--version" || command === "-v") {
    const manifest = deps.readText((0, import_node_path2.join)(deps.repoRoot, "pi-extension", "package.json"));
    const version = manifest ? JSON.parse(manifest).version : void 0;
    if (typeof version !== "string") {
      deps.err("Could not read the version from pi-extension/package.json.");
      return 1;
    }
    deps.out(version);
    return 0;
  }
  if (command === "setup" && rest[0] === "pi") {
    const mode = setupMode(rest.slice(1));
    if (mode) return runSetupPi(mode, env);
  }
  deps.err(`Unknown command: ${argv.join(" ")}`);
  deps.err(USAGE);
  return 2;
}
function setupMode(flags) {
  if (flags.length === 0) return "install";
  if (flags.length === 1 && flags[0] === "--check") return "check";
  if (flags.length === 1 && flags[0] === "--remove") return "remove";
  return void 0;
}

// cli/src/cairn.ts
var MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
var COMMAND_TIMEOUT_MS = 12e4;
function runProgram(file, args) {
  const result = (0, import_node_child_process.spawnSync)(file, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: MAX_OUTPUT_BYTES,
    timeout: COMMAND_TIMEOUT_MS
  });
  if (result.error) return { ok: false, code: null, stdout: "", stderr: result.error.message };
  return { ok: result.status === 0, code: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
process.exitCode = dispatch(process.argv.slice(2), {
  repoRoot: (0, import_node_path3.resolve)(__dirname, "..", ".."),
  cwd: process.cwd(),
  agentDir: process.env.PI_CODING_AGENT_DIR || (0, import_node_path3.resolve)((0, import_node_os.homedir)(), ".pi", "agent"),
  bd: process.env.BD || "bd",
  run: runProgram,
  exists: import_node_fs.existsSync,
  readText: (path) => {
    try {
      return (0, import_node_fs.readFileSync)(path, "utf8");
    } catch {
      return void 0;
    }
  },
  out: (line) => process.stdout.write(`${line}
`),
  err: (line) => process.stderr.write(`${line}
`)
});
