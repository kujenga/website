+++
date = "2025-02-05T20:30:00-05:00"
title = "Building an MCP Server for Zotero"
description = "A small MCP server for searching and retrieving items from your Zotero library."
categories = ['homepage']
tags = ['MCP', 'Zotero', 'Python', 'AI']
images = [
]
mathjax = false
toc = false
+++

[Zotero][zotero] is my go-to tool for managing academic papers. It's open-source with a fantastic ecosystem around it, and over time my library has grown into a useful personal knowledge base. When [Anthropic released the Model Context Protocol][mcpAnnouncement] late last year, I saw an opportunity in giving AI assistants direct access pull items from my Zotero library.

[zotero-mcp][repo] is a small Python server that implements [MCP][mcp] for Zotero. The scope is intentionally narrow with just three tools: search your library, get an item's metadata, and retrieve the full text of an item. The idea is that an assistant like Claude can chain these together naturally, searching for relevant papers and then pulling up the details it needs.

The implementation uses the [Pyzotero][pyzotero] SDK to talk to Zotero's API, with the [MCP Python SDK][mcpSDK] handling the protocol layer. It supports both the Zotero Web API and the local API that the desktop app exposes, the latter being a bit more responsive for everyday use. One thing I spent some time on was formatting the output in a way that's useful to an LLM — truncating long abstracts in search results, cleanly structuring metadata, converting HTML notes to plain text.

If you use Zotero and want to try it out, see the [repository][repo] for setup instructions for Claude Desktop and other MCP clients. It's a simple project, but it's been useful for making my reading library more accessible in conversations with Claude and other editors.

In future work, I'm interested in exploring how AI chat interfaces could be embedded directly into Zotero, allowing users to interact with specific items in their library more directly.

<!-- Links -->
[zotero]: https://www.zotero.org/
[mcpAnnouncement]: https://www.anthropic.com/news/model-context-protocol
[mcp]: https://modelcontextprotocol.io/introduction
[repo]: https://github.com/kujenga/zotero-mcp
[pyzotero]: https://pyzotero.readthedocs.io/
[mcpSDK]: https://github.com/modelcontextprotocol/python-sdk
