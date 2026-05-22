# Zeover Platform Skill

A drop-in [SKILL.md](./SKILL.md)-format skill for [Zeover](https://zeover.com) — the Generative Engine Optimization (GEO) platform. Once installed, your AI agent can audit brand websites for AI readability, benchmark visibility across ChatGPT / Claude / Gemini / Grok / Perplexity, generate optimized content, and more.

## Install

Via the [skills.sh](https://www.skills.sh) registry:

```bash
npx skills add ZenterraHoldings/zeover-skill
```

Or directly:

```bash
npx -y github:ZenterraHoldings/zeover-skill
```

Either way you'll need a `ZEOVER_API_KEY`. Get one at <https://app.zeover.com/dashboard/preferences/api-keys>.

For the **self-hosted, key-auto-seeding** install path that's only one command:

```bash
npx -y https://zeover.com/skill --api-key=zk_xxx
```

(That route is the same skill, but downloaded from `zeover.com` directly so it can bake your API key into the installed `.env` in one step.)

## About this repo

This repository is a published mirror of the Zeover Platform Skill. The canonical source lives in Zeover's private monorepo and is sync'd here whenever the skill changes; pull requests are welcome via issues on this repo or the Zeover support channel.

License: [MIT](./LICENSE).
