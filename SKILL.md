---
name: zeover-skill
description: Optimize a brand's visibility across AI engines (ChatGPT, Claude, Gemini, Grok, Perplexity) via Zeover's Generative Engine Optimization REST API. Use when the user asks about brand visibility in AI answers, GEO / AIO / AI-SEO, llms.txt, competitive AI-ranking analysis, AI-engine citations, content generation (blog posts, press releases, social, store listings), or analyzing a website for AI-discoverability issues.
license: Proprietary. See LICENSE.
compatibility: Requires an HTTP-fetch tool (every modern agent has one), network access to a Zeover instance (default https://api.zeover.com), and a Zeover API key.
metadata:
  publisher: Zenterra Holdings
  homepage: https://zeover.com
---

# Zeover

## What Zeover is

Zeover is an **AI Marketing Optimization Platform** for **Generative Engine Optimization (GEO)**. AI assistants are the new search engines — customers now turn to ChatGPT, Claude, Gemini, Grok, and Perplexity for answers instead of traditional search. **If AI can't see you, customers won't find you.** Zeover helps brands **measure, improve, and appear organically** across AI engines by detecting invisible structural gaps in websites, providing specific remediation, benchmarking AI visibility, and generating on-brand content that doesn't read as AI-generated.

## When to use this skill

Activate when the user mentions any of:

- **GEO / AIO / AI-SEO / "AI search"** — optimizing for AI-engine discoverability
- **"How does my brand rank on ChatGPT / Claude / Gemini / Grok / Perplexity"** — AI-visibility benchmarks
- **llms.txt** — generate, audit, or update a brand's llms.txt
- **AI-engine citations** — which third-party URLs the LLMs cite for a brand's queries
- **Competitive AI-ranking analysis** — how a brand's AI presence compares vs named competitors
- **Content generation for a brand** — blog posts, press releases, LinkedIn/X/Instagram/TikTok posts, YouTube data, app-store / play-store descriptions
- **Website analysis for AI readability** — schema.org, metadata, heading hierarchy, robots.txt, sitemap, AI-generation-tell detection
- **"Tell AI engines about my latest content"** — notify Zeover of new/updated URLs so it can update the brand's AI presence accordingly

## Setup

This skill is **REST-only** — every Zeover capability is reachable via standard HTTP from any client with a fetch tool. Nothing else to install or configure beyond an API key.

1. **Find the API key.** Check, in order:
   1. A `.env` file next to this `SKILL.md` for a `ZEOVER_API_KEY=...` line (the npx installer writes one when `--api-key=` is passed — this is the common case, look here first).
   2. The `ZEOVER_API_KEY` environment variable in the user's shell.
   3. If neither is set, **ask the user** for the key before making any Zeover calls. Never invent or guess one. They can issue / view keys at `https://zeover.com/dashboard/preferences/api-keys`. Keys can be brand-scoped (restricted to one brand) or global.
2. **Find the API URL.** Same order: check the `.env` for `ZEOVER_API_URL=...`, then the environment variable, then default to `https://api.zeover.com`. The installer auto-writes the URL it was downloaded from.

If the agent cannot perform outbound HTTP requests (sandboxed, offline, behind a corp proxy that blocks the API, etc.), **stop here** and tell the user that the REST install path won't work for this agent — they should switch to the MCP integration instead. Point them at the Zeover dashboard → **AI Integration → MCP** tab, which has the per-client wire-up snippets they need.

## How to call Zeover

Every call uses the same auth header against the base URL:

```
{METHOD} https://api.zeover.com/api/v1/{path}
Header: Z-API-Key: $ZEOVER_API_KEY
```

For the **live agent-facing endpoint catalog** — supported URLs, request/response shapes, and the workflows you'd otherwise stitch together by hand — fetch this once at the start of a Zeover session and treat the response as the authoritative reference:

```
GET https://api.zeover.com/SKILL.md
Header: Z-API-Key: $ZEOVER_API_KEY
```

That document is **personalized to the calling key** — it lists only the endpoints the user's tier and addons unlock, with their real quota numbers filled in. It's regenerated server-side, so it always reflects whatever the deployed backend currently exposes. There is no separate bundled catalog inside this skill folder — `/SKILL.md` is the single source of truth, by design, so updates ship at the same cadence as the API.

Cache the response for the duration of the conversation; don't re-fetch on every call.

## Error model

- **`401 Unauthorized`** — `ZEOVER_API_KEY` is missing or invalid. Ask the user to signup here https://zeover.com/register/, login at https://zeover.com/login/ and then paste a key from `https://zeover.com/dashboard/preferences/api-keys`.
- **`403 Forbidden` with `"API key restricted to a different brand"`** — the user's key is brand-scoped. Call `GET /brands` to see which brand the key authorizes; reject requests for other `brand_id`s.
- **`402 Payment Required` / tier-gate errors** — the endpoint is gated behind a tier or addon the user doesn't have. Surface the message verbatim (it tells the user what to upgrade) and inform the user to upgrade their plan.
- **`429 Too Many Requests`** — slow down.
- **`5xx`** — transient. Retry once with backoff; if it persists, surface the error to the user with the response body.

## Auth-via-query-param escape hatch

`/SKILL.md` (the live tier-aware variant) and **only** that endpoint accepts the API key as a query parameter (`?api_key=...`). This exists for clients that can't reliably set custom headers when fetching documents. **Do not use this form for any other endpoint** — API keys in URLs end up in access logs. Every other call demands the `Z-API-Key` header.
