# Zeover Platform Skill

Drop-in agent skill for [Zeover](https://zeover.com) — give Claude Code, Cursor, OpenCode, Goose, or any other client that loads `SKILL.md`-format skills a working understanding of Zeover's GEO platform.

The skill teaches the agent:

- What Zeover is and when to invoke it.
- How to authenticate against the Zeover REST API with a `Z-API-Key`.
- Where to fetch the **live, tier-personalized** endpoint catalog (so we keep one source of truth that updates whenever the API does).

No extra services to install or run — once the skill is in place and the agent has a key, it calls Zeover directly over HTTPS.

> The skill is distributed two ways: as a public repository at [github.com/ZenterraHoldings/zeover-skill](https://github.com/ZenterraHoldings/zeover-skill) for transparency and `npx skills add` install, and as a hosted tarball at `https://zeover.com/skill` that can auto-seed your API key into the installed `.env`. Both contain the same content.

## Install

**Route 1 — hosted tarball with API-key auto-seed (recommended for Zeover users):**

```bash
npx -y https://zeover.com/skill --api-key=zk_xxxxxxxxxxxx
```

The installer auto-detects which agent clients are installed locally (Claude Code, Cursor, OpenCode, Goose, …), asks which ones to install into, copies the `zeover-skill/` folder into each chosen target, and writes a chmod-600 `.env` next to it so you don't have to plumb the key through your shell. Pass `--client=<id>` to skip the prompt or `--yes` to install into every detected client.

**Route 2 — skills.sh registry (`SKILL.md`-format ecosystem):**

```bash
npx skills add ZenterraHoldings/zeover-skill
```

Same skill, no API-key auto-seed (you set `ZEOVER_API_KEY` in your shell or the installed `.env` separately).

## After install

Nothing else to wire up. The agent reads `SKILL.md`, picks up the auth pattern + base URL, and calls Zeover directly over HTTPS. If you didn't pass `--api-key`, the agent will prompt for one on first use (the key lives at `https://zeover.com/dashboard/preferences/api-keys`).

## Uninstall

```bash
npx -y https://zeover.com/skill --uninstall
```

Scans every known client path, prints which ones contain a `zeover-skill/` folder, and asks for confirmation before removing them. Add `--yes` to skip the prompt; add `--client=<id>` (repeatable) to scope the cleanup to specific clients.

## Flags

| Flag | Purpose |
|---|---|
| `--client=<id>` | Scope to the given client (repeatable). Applies to both install and `--uninstall`. |
| `--api-key=<v>` | Seed `ZEOVER_API_KEY` into each installed skill's `.env`. |
| `--api-url=<v>` | Override the API base URL (default: derived from this tarball's source). |
| `--yes`, `-y`   | Non-interactive: install (or uninstall) every detected target without prompting. |
| `--force`       | Overwrite existing `zeover-skill/` folders on install. |
| `--uninstall`   | Remove the `zeover-skill/` folder from every known client path. |
| `--print-only`  | Print the bundled skill's path and exit (for symlinking). |
| `--list-clients`| Print the known client IDs and their target paths. |
| `--help`        | This message. |
