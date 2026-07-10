+++
date = "2026-07-07T21:30:53-07:00"
title = "Syncing Raindrop Bookmarks into Notion"
description = "A Notion Worker that mirrors your Raindrop.io bookmarks into a Notion database."
categories = ['homepage']
tags = ['Notion', 'Raindrop', 'TypeScript', 'AI']
images = [
]
mathjax = false
toc = false
+++

[Raindrop.io][raindrop] is where I save articles I want to read or reference later, and Notion is where most of my personal docs and notes live. The two didn't talk to each other, which added friction to referencing articles within Notion docs, using raw links with none of the contextual information or archiving present in Raindrop.io. It also meant that AI tools working on top of Notion, including Notion AI and anything connected through Notion's MCP support, had no visibility into this content. Raindrop.io does offer an [MCP](https://developer.raindrop.io/mcp/mcp), but it does not work with Notion AI at the time of this writing.

[raindrop-notion-sync][repo] fixes this by mirroring my Raindrop library into a Notion database, one page per bookmark. Each page carries the core metadata as database properties with notes and highlights, as well as an optional cleaned version of the full article content. Once the bookmarks are pages, they work like anything else in Notion, linkable inline from other docs, queryable in database views, and searchable by AI tools to read alongside the rest of the workspace.

## Notion Workers

The interesting part of the implementation is that there is no server to run. The project is a [Notion Worker][workers], which I have been curious to experiment with since launch and are Notion's platform for running code on their infrastructure that operates on your workspace. TypeScript declares a database schema and registers jobs which are deployed with the `ntn` CLI into Notion hosted infrastructure. For a personal integration like this, that removes the usual overhead of finding a place to run a cron job and keeping it alive.

## How it works

The project was built largely with [Claude Code][claudeCode] through a number of iterations, which was a good fit for a self-contained integration like this. With access to the Raindrop and Notion docs, it can refine the sync logic iteratively and review the live results.

The worker runs two sync jobs on independent schedules. An incremental sync runs hourly, using a cursor over Raindrop's API to pick up only new and changed bookmarks, which keeps the common case cheap. A full mirror runs daily, re-walking the entire library so that deletions and anything the incremental pass missed get reconciled. The Raindrop side is handled with a small typed client over their REST API, and the Notion is interacted with via the Workers SDK handling the database schema and page upserts.

To leverage the full functionality of Raindrop Pro account [web archives][raindropWebArchive], the worker can pull the full article text for each bookmark and uses the Gemini API to clean it up into readable markdown page content. That turns the database from a list of links into a searchable archive of the articles themselves, which is where the AI use cases get most interesting.

## Deploying it yourself

If you want your own copy, the setup is short: clone the [repository][repo], run `bun install`, authenticate with `bun run login`, drop a Raindrop API test token into `.env`, and run `bun run deploy`. The worker creates a "Raindrop Bookmarks" database in your workspace and starts syncing on its own. After initial creation you can move the database wherever you'd like. Environment variables control which collection to sync, the schedules, and whether full article content is included; the README has the details.

<!-- Links -->
[raindrop]: https://raindrop.io/
[raindropWebArchive]: https://help.raindrop.io/web-archive
[repo]: https://github.com/kujenga/raindrop-notion-sync
[workers]: https://developers.notion.com/workers/get-started/overview
[claudeCode]: https://claude.com/claude-code
