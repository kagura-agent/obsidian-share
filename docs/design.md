# Design: Obsidian Share Plugin

## Origin

Discussion between Luna and Kagura (2026-05-14).

## Problem Statement

Luna uses Obsidian for note-taking. When sharing notes with others (e.g. via OneDrive), embedded images don't display because Obsidian uses local paths (`![[image.png]]`). Exporting to PDF every time is too tedious.

## Requirements (from discussion)

1. **Self-hosted on own machine** — no cloud service, runs locally
2. **Accessible via nginx** — intranet colleagues can access through browser
3. **Link-only access** — recipients can only see the specific shared note, not browse other resources or navigate the site
4. **No separate "share folder" to maintain** — Luna doesn't want to manually copy notes to another directory
5. **One-click share** — click a button on any note in Obsidian, get a link
6. **Auto-update** — edit the note in Obsidian, shared version updates automatically, link stays the same
7. **Easy unshare** — click to revoke, link dies

## Rejected Approaches

### Quartz / MkDocs / Static Site Generator
- Requires maintaining a separate content directory
- Need to copy or symlink notes → extra maintenance burden
- Overkill for "share one note at a time" use case
- Luna explicitly rejected the "share folder" approach

### Obsidian Publish / Digital Garden
- Cloud-hosted, not self-hosted
- Obsidian Publish costs $8/month
- Both expose a browsable site structure

### PicGo + Image Hosting
- Solves image problem but still need a way to share the rendered note
- Extra dependency on external image hosting service

## Chosen Approach: Obsidian Plugin + nginx

The simplest possible architecture:
- **Plugin** handles rendering + file management
- **nginx** handles serving (zero application logic)
- **No database, no background process, no server-side code**

### Key Design Decisions

1. **Self-contained HTML** — images are base64-inlined into the HTML file. No external dependencies. One file = one complete note.

2. **Random slugs, not note names** — URLs like `/s/a3x8k2` instead of `/s/my-secret-project`. Prevents information leakage from URLs and avoids encoding issues with Chinese filenames.

3. **File-based "database"** — share registry is a JSON file in Obsidian's plugin data directory. No SQLite, no server-side state.

4. **Watch-and-rebuild on save** — plugin hooks into Obsidian's file save event. If the saved file is in the share registry, re-render it. Zero manual intervention.

5. **Output directory is configurable** — defaults to `~/shared-notes/`, user points nginx at it. Plugin writes there directly.

## Technical Notes

### Obsidian Plugin API

- `this.registerEvent(this.app.vault.on('modify', ...))` — watch file changes
- `this.app.vault.read(file)` — read note content
- `this.app.vault.readBinary(file)` — read image files for base64 encoding
- `this.addCommand(...)` — register share/unshare commands
- `this.app.fileManager` — resolve internal links and attachments

### Image Resolution

Obsidian images can appear as:
- `![[image.png]]` — wiki-link style
- `![alt](path/to/image.png)` — standard markdown
- `![[image.png|400]]` — with size modifier

Plugin needs to:
1. Parse all image references
2. Resolve to absolute paths using Obsidian's attachment resolution
3. Read binary content
4. Convert to base64 data URIs
5. Replace in rendered HTML

### HTML Template

- Clean, minimal CSS (readable on any device)
- Light/dark mode support (prefers-color-scheme)
- Mobile-responsive
- No navigation, no header/footer links, no JS (pure static HTML)
- Obsidian-compatible styling for callouts, code blocks, tables, etc.
