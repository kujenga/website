+++
date = "2026-07-07T21:30:53-07:00"
title = "Syncing Raindrop Bookmarks into Notion"
description = "Make your saved Raindrop.io articles, notes, and highlights searchable from Notion with a serverless Notion Worker."
categories = ['homepage']
tags = ['Notion', 'Raindrop', 'TypeScript', 'AI']
images = [
]
mathjax = false
toc = false
+++

[Raindrop.io][raindrop] is where I save articles I want to read or reference later, and Notion is where most of my personal docs and notes live. Bringing Raindrop articles into Notion allows me to directly reference articles within Notion docs and AI tools with Notion support to leverage with Raindrop articles directly. Raindrop.io does offer an [MCP][raindropMCP], but it does not work with Notion AI at the time of this writing (July 2026).

[raindrop-notion-sync][repo] fixes this by mirroring my Raindrop library into a Notion database, one page per bookmark. Each page carries the core metadata as database properties with notes and highlights, as well as an optional cleaned version of the full article content. Once the bookmarks are pages, they work like anything else in Notion.

## Notion Workers

Notion recently launched a developer platform, and this project is deployed as a [Notion Worker][workers], which I have been curious to experiment with since launch. Notion Workers are Typescript programs running on Notion's infrastructure that operate over your workspace. TypeScript declares a database schema and registers syncs which are deployed with the `ntn` CLI into Notion hosted infrastructure. For a personal integration like this, that removes the overhead of finding a cheap and stable place to run a cron job and keep it alive.

## How it works

The project was built largely with [Claude Code][claudeCode] through a number of iterations, which was a good fit for a self-contained integration like this. With access to the Raindrop and Notion docs and APIs, it can refined the sync logic iteratively and could review live results.

The worker runs two sync jobs on independent schedules. An incremental sync runs hourly, using a cursor over Raindrop's API to pick up only new and changed bookmarks, which keeps the common case cheap. A full mirror runs daily, re-walking the entire library so that deletions and anything the incremental pass missed get reconciled. The Raindrop.io APIs do not provide webhooks, making polling of some sort a necessity. The Raindrop side is handled with a small typed client for their REST API, and Notion is interacted with via the Workers SDK, handling the database schema and page upserts.

With a Raindrop Pro account [web archives][raindropWebArchive], the worker can pull the full article text for each bookmark and uses the Gemini API to clean it up into readable markdown page content. That turns the database from a list of links into a searchable archive of the articles themselves, which is where the AI use cases get most interesting.

## Deploying it yourself

If are using Notion and Raindrop and you want your own copy, the setup is short: clone the [repository][repo], install any missing tooling, run `bun install`, authenticate with `bun run login`, drop a Raindrop API test token into `.env`, and run `bun run deploy`. The worker creates a "Raindrop Bookmarks" database in your workspace and starts syncing on its own. Cost is relatively minimal for most libraries, the initial sync for thousands of historical articles was about $3 in [Notion Credits][notionWorkerPricing] and $12 in Gemini usage. I expect less than $1 monthly going forward. After initial creation, you can move the database wherever you'd like. Environment variables control which collection to sync, the schedules, and whether full article content is included, the [README][repo] has the details.

**[View the code on GitHub][repo]**

<!-- Links -->
[raindrop]: https://raindrop.io/
[raindropMCP]: https://developer.raindrop.io/mcp/mcp
[raindropWebArchive]: https://help.raindrop.io/web-archive
[repo]: https://github.com/kujenga/raindrop-notion-sync
[workers]: https://developers.notion.com/workers/get-started/overview
[claudeCode]: https://claude.com/claude-code
[notionWorkerPricing]: https://www.notion.com/help/understand-pricing-for-workers
