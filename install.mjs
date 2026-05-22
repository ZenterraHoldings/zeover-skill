#!/usr/bin/env node
// Zeover Platform Skill installer.
//
// Zero dependencies (Node built-ins only) so `npx -y <tarball-url>` is fast
// and predictable. Installs the bundled `skill/zeover-skill/` folder into
// one or more known agent skill directories, optionally seeding a `.env`
// with the user's API key + the source backend URL.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The bundled skill folder sits alongside this script. Covers:
//   (a) installed-by-npm layout: this file at `package/install.mjs`
//       and the skill at `package/skill/zeover-skill/`,
//   (b) dev / in-repo layout: this file at `backend/api/skill_pkg/install.mjs`
//       and the skill at `backend/api/skill_pkg/zeover-skill/` (sibling),
//   (c) public-mirror layout: this file at `<repo-root>/install.mjs`
//       and the skill folder split open at the same level (SKILL.md as
//       a sibling of install.mjs) — when sync'd into the
//       ZenterraHoldings/zeover-skill public repo for skills.sh.
function resolveBundledSkill() {
    const candidates = [
        path.resolve(__dirname, "skill", "zeover-skill"),   // packaged tarball
        path.resolve(__dirname, "zeover-skill"),            // in-repo sibling
        path.resolve(__dirname),                            // public mirror (SKILL.md alongside install.mjs)
    ];
    for (const c of candidates) {
        if (fs.existsSync(path.join(c, "SKILL.md"))) return c;
    }
    fail(
        "could not locate bundled skill folder. Tried:\n" +
        candidates.map((c) => "  " + c).join("\n"),
    );
}

// Derive ZEOVER_API_URL from package.json's custom `zeover.apiUrl` field
// (the backend templates it with the URL that served the tarball). That
// way the installer auto-uses whichever backend the tarball came from,
// without the user having to pass --api-url. Custom-namespaced under
// `zeover.*` to leave the standard `homepage` field free for the human-
// facing zeover.com URL.
function resolveDefaultApiUrl() {
    const candidates = [
        path.resolve(__dirname, "package.json"),
        path.resolve(__dirname, "..", "..", "package.json"),
    ];
    for (const p of candidates) {
        try {
            const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
            if (pkg.zeover && typeof pkg.zeover.apiUrl === "string" && pkg.zeover.apiUrl.length > 0) {
                return pkg.zeover.apiUrl.replace(/\/$/, "");
            }
        } catch (_) { /* try next */ }
    }
    return "https://api.zeover.com";
}

// Known agent clients and where each stores skill folders. `global`
// resolves under $HOME; `project` resolves under $PWD. Display order is
// preserved in the interactive prompt.
const CLIENTS = [
    { id: "claude-code-global",   label: "Claude Code (global ~/.claude/skills)",         scope: "global",  rel: ".claude/skills" },
    { id: "claude-code-project",  label: "Claude Code (project .claude/skills)",          scope: "project", rel: ".claude/skills" },
    { id: "cursor-project",       label: "Cursor (project .cursor/skills)",               scope: "project", rel: ".cursor/skills" },
    { id: "opencode-project",     label: "OpenCode (project .opencode/skills)",           scope: "project", rel: ".opencode/skills" },
    { id: "opencode-global",      label: "OpenCode (global ~/.config/opencode/skills)",   scope: "xdg",     rel: "opencode/skills" },
    { id: "goose-global",         label: "Goose (global ~/.config/goose/skills)",         scope: "xdg",     rel: "goose/skills" },
    { id: "agentskills-global",   label: "Generic (~/.config/agentskills/skills)",        scope: "xdg",     rel: "agentskills/skills" },
];

const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");

function clientPath(c) {
    switch (c.scope) {
        case "global":  return path.join(os.homedir(), c.rel);
        case "project": return path.join(process.cwd(), c.rel);
        case "xdg":     return path.join(XDG_CONFIG_HOME, c.rel);
    }
}

function detectClients() {
    return CLIENTS.map((c) => {
        const target = clientPath(c);
        // The parent dir is what we look for — many clients create the
        // skills/ dir lazily on first install, so detecting the .claude/
        // (etc.) parent is the right signal.
        const parent = path.dirname(target);
        return { ...c, target, present: fs.existsSync(parent) };
    });
}

// --- argv parsing ---------------------------------------------------------

function parseArgs(argv) {
    const out = {
        clients: [],
        apiKey: null,
        apiUrl: null,
        yes: false,
        force: false,
        printOnly: false,
        listClients: false,
        uninstall: false,
        help: false,
    };
    for (const a of argv) {
        if (a === "--yes" || a === "-y") out.yes = true;
        else if (a === "--force") out.force = true;
        else if (a === "--print-only") out.printOnly = true;
        else if (a === "--list-clients") out.listClients = true;
        else if (a === "--uninstall") out.uninstall = true;
        else if (a === "--help" || a === "-h") out.help = true;
        else if (a.startsWith("--client=")) out.clients.push(a.slice("--client=".length));
        else if (a.startsWith("--api-key=")) out.apiKey = a.slice("--api-key=".length);
        else if (a.startsWith("--api-url=")) out.apiUrl = a.slice("--api-url=".length);
        else if (a.startsWith("-")) fail(`unknown flag: ${a}`);
    }
    return out;
}

function printHelp() {
    const usage = `
Zeover Platform Skill installer

USAGE
  npx -y https://zeover.com/skill [flags]

FLAGS
  --client=<id>     Scope to the given client (repeatable). Use
                    --list-clients to see IDs. Default: prompt or all-detected.
  --api-key=<key>   Seed ZEOVER_API_KEY into each installed skill's .env file.
                    Without this, the agent will prompt for the key at runtime.
  --api-url=<url>   Override the API base URL (default: derived from the
                    tarball's source — auto-set when installed via npx).
  --yes, -y         Non-interactive: install (or uninstall) every detected
                    target without prompting.
  --force           Overwrite existing zeover/ folders on install.
  --uninstall       Remove the zeover/ skill folder from every known client
                    path (or only --client=<id> targets if specified).
  --print-only      Just print the absolute path of the bundled skill folder
                    and exit. Useful for symlinking from CI.
  --list-clients    Print the known client list (IDs + paths) and exit.
  --help, -h        Print this message.

EXAMPLES
  npx -y https://zeover.com/skill
  npx -y https://zeover.com/skill --client=claude-code-global --api-key=zk_xxx
  npx -y https://zeover.com/skill --yes
  npx -y https://zeover.com/skill --uninstall
  npx -y https://zeover.com/skill --uninstall --client=claude-code-global --yes

Or install via the skills.sh registry (no API-key auto-seed):
  npx skills add ZenterraHoldings/zeover-skill
`;
    process.stdout.write(usage.trimStart());
}

// --- helpers --------------------------------------------------------------

function fail(msg, code = 1) {
    process.stderr.write(`zeover-skill: ${msg}\n`);
    process.exit(code);
}

function info(msg) { process.stdout.write(msg + "\n"); }

function copyDirSync(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) copyDirSync(s, d);
        else if (entry.isFile()) fs.copyFileSync(s, d);
        // symlinks / sockets / etc. are ignored on purpose
    }
}

function isEmptyDir(p) {
    try { return fs.readdirSync(p).length === 0; }
    catch { return true; }
}

async function promptYesNo(question, defaultYes = true) {
    if (!process.stdin.isTTY) return defaultYes;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        const suffix = defaultYes ? " [Y/n]: " : " [y/N]: ";
        rl.question(question + suffix, (answer) => {
            rl.close();
            const a = answer.trim().toLowerCase();
            if (a === "") return resolve(defaultYes);
            resolve(a === "y" || a === "yes");
        });
    });
}

async function promptString(question) {
    if (!process.stdin.isTTY) return null;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question + ": ", (answer) => { rl.close(); resolve(answer.trim()); });
    });
}

// The skill is REST-only — no extra wire-up step is needed. The agent
// reads SKILL.md, picks up the auth pattern + base URL, and calls
// Zeover directly. We just remind the user that the key needs to be
// available (either via the .env we just wrote, or as ZEOVER_API_KEY
// in the shell).

// --- uninstall ------------------------------------------------------------

async function uninstall(args) {
    // Scope: --client=<id>… narrows to those clients; otherwise scan every
    // known target path. Either way the actual removal candidate is the
    // `zeover/` folder INSIDE each target — we never touch the
    // surrounding skills/ dir (it may host other unrelated skills).
    let scoped;
    if (args.clients.length > 0) {
        scoped = CLIENTS.filter((c) => args.clients.includes(c.id));
        const missing = args.clients.filter((id) => !CLIENTS.find((c) => c.id === id));
        if (missing.length) fail(`unknown --client id(s): ${missing.join(", ")}`);
    } else {
        scoped = CLIENTS;
    }

    const found = [];
    for (const c of scoped) {
        const dest = path.join(clientPath(c), "zeover-skill");
        if (fs.existsSync(dest)) found.push({ client: c, dest });
    }

    if (found.length === 0) {
        info("No zeover-skill/ folder found in any known client path. Nothing to remove.");
        process.exit(0);
    }

    info("Found Zeover Platform Skill at:");
    for (const f of found) info(`  - ${f.dest}  (${f.client.label})`);

    // Confirm unless explicitly non-interactive. --yes is the standard
    // opt-out; if there's no TTY (CI / piped stdin) we also skip the
    // prompt — the user clearly meant `--uninstall` since they typed it.
    if (process.stdin.isTTY && !args.yes) {
        const ok = await promptYesNo("Remove all of the above?", false);
        if (!ok) { info("Cancelled."); process.exit(0); }
    }

    let removed = 0;
    for (const f of found) {
        try {
            fs.rmSync(f.dest, { recursive: true, force: true });
            info(`REMOVED  ${f.dest}`);
            removed++;
        } catch (err) {
            info(`FAILED   ${f.dest}: ${err.message}`);
        }
    }
    info("");
    info(`Removed ${removed} of ${found.length}.`);
    process.exit(removed === found.length ? 0 : 1);
}

// --- main -----------------------------------------------------------------

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) { printHelp(); process.exit(0); }

    if (args.listClients) {
        info("Known client IDs:");
        for (const c of CLIENTS) info(`  ${c.id.padEnd(24)} ${clientPath(c)}`);
        process.exit(0);
    }

    if (args.uninstall) {
        await uninstall(args);
        return;
    }

    const bundledSkill = resolveBundledSkill();

    if (args.printOnly) {
        process.stdout.write(bundledSkill + "\n");
        process.exit(0);
    }

    const apiUrl = (args.apiUrl || resolveDefaultApiUrl()).replace(/\/$/, "");

    // Pick targets.
    let targets;
    if (args.clients.length > 0) {
        targets = CLIENTS.filter((c) => args.clients.includes(c.id));
        const missing = args.clients.filter((id) => !CLIENTS.find((c) => c.id === id));
        if (missing.length) fail(`unknown --client id(s): ${missing.join(", ")}`);
    } else {
        const detected = detectClients().filter((c) => c.present);
        if (detected.length === 0) {
            info("No known agent client detected on this machine.");
            info("Run with --list-clients to see what's supported, or use --client=<id>");
            info("to install anyway (the target directory will be created).");
            process.exit(0);
        }
        if (args.yes || !process.stdin.isTTY) {
            targets = detected;
        } else {
            info("Detected agent clients:");
            detected.forEach((c, i) => info(`  ${i + 1}. ${c.label}  →  ${c.target}`));
            const ans = await promptString(
                "Install into which? Enter comma-separated numbers, 'a' for all, or blank to cancel",
            );
            if (!ans) { info("Cancelled."); process.exit(0); }
            if (ans.toLowerCase() === "a" || ans.toLowerCase() === "all") {
                targets = detected;
            } else {
                const picks = ans.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
                targets = picks.map((n) => detected[n - 1]).filter(Boolean);
                if (!targets.length) { info("No valid picks."); process.exit(0); }
            }
        }
    }

    // Resolve apiKey, prompt only in TTY+interactive.
    let apiKey = args.apiKey;
    if (!apiKey && process.stdin.isTTY && !args.yes) {
        const yes = await promptYesNo(
            "Seed ZEOVER_API_KEY into each installed skill's .env file?",
            true,
        );
        if (yes) {
            apiKey = await promptString("Paste your ZEOVER_API_KEY (or blank to skip)");
            if (!apiKey) apiKey = null;
        }
    }

    // Install.
    const installed = [];
    for (const c of targets) {
        const targetRoot = clientPath(c);
        const dest = path.join(targetRoot, "zeover-skill");
        fs.mkdirSync(targetRoot, { recursive: true });

        if (fs.existsSync(dest) && !isEmptyDir(dest) && !args.force) {
            info(`SKIP  ${dest}  (already exists; pass --force to overwrite)`);
            continue;
        }
        if (args.force && fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });

        copyDirSync(bundledSkill, dest);

        if (apiKey) {
            const envLines = [`ZEOVER_API_KEY=${apiKey}`];
            if (apiUrl && apiUrl !== "https://api.zeover.com") {
                envLines.push(`ZEOVER_API_URL=${apiUrl}`);
            }
            fs.writeFileSync(path.join(dest, ".env"), envLines.join("\n") + "\n", { mode: 0o600 });
            fs.writeFileSync(path.join(dest, ".gitignore"), ".env\n");
        }

        installed.push({ client: c, dest });
        info(`OK    ${dest}`);
    }

    if (!installed.length) { info("Nothing installed."); process.exit(0); }

    info("");
    info("Done. The skill is REST-only — nothing else to start, no further wire-up.");
    info(`API URL: ${apiUrl}`);
    if (apiKey) {
        info("API key:  written to each installed skill's .env (chmod 600).");
    } else {
        info("");
        info("Set ZEOVER_API_KEY in your shell (or each skill's .env file) before using.");
        info("Get a key at https://zeover.com/dashboard/preferences/api-keys");
    }
    info("");
    info("Smoke test: open your agent and ask 'List my brands using Zeover'.");
}

main().catch((e) => fail(e?.stack || String(e)));
