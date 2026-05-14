# Obsidian Share

One-click self-hosted note sharing for Obsidian.

## The Problem

Obsidian notes with embedded images (`![[image.png]]`) can't be easily shared:
- Share via OneDrive → images don't display (local paths)
- Export to PDF every time → tedious for frequent sharing
- Third-party publish services → not suitable for internal/intranet use

## The Solution

An Obsidian plugin that lets you **right-click any note → "Share" → get a link**. Done.

- Runs entirely on your own machine
- Serve via nginx for intranet access
- Only shared notes are accessible — no directory browsing, no site navigation
- Edit your note in Obsidian → shared link auto-updates
- Click "Unshare" → link dies immediately

## How It Works

```
┌─────────────┐     save      ┌──────────────────┐    nginx    ┌──────────┐
│   Obsidian   │ ──────────▶  │  /shared-notes/   │ ─────────▶ │ Colleague │
│  (editing)   │              │  abc123.html      │            │ (browser) │
└─────────────┘              └──────────────────┘            └──────────┘
       │                            ▲
       │  click "Share"             │
       └────────────────────────────┘
         plugin renders note to
         self-contained HTML
         (images base64-inlined)
```

1. You click **"Share"** on any note (command palette or right-click menu)
2. Plugin renders the note to a **self-contained HTML file** (all images base64-inlined, no external dependencies)
3. Saves it to a local directory (e.g. `/var/www/shared-notes/`) with a random slug
4. **Copies the share link to your clipboard**: `http://your-ip/s/a3x8k2`
5. On subsequent saves, the plugin **auto-re-renders** — the link stays the same, content stays fresh
6. **"Unshare"** removes the file, link returns 404

## Architecture

### Plugin Side (Obsidian)

- Adds commands: `Share this note` / `Unshare this note` / `Copy share link`
- Renders Obsidian-flavored markdown to HTML:
  - Resolves `![[image.png]]` and `![](path/to/image.png)` → base64 inline
  - Handles Obsidian wiki-links, callouts, etc.
  - Wraps in a clean, readable HTML template with CSS
- Maintains a share registry (JSON file in plugin data):
  ```json
  {
    "shared": {
      "path/to/note.md": {
        "slug": "a3x8k2",
        "sharedAt": "2026-05-14T14:30:00Z"
      }
    }
  }
  ```
- Watches for file saves on shared notes → auto re-render
- Configurable output directory and base URL in plugin settings

### Server Side (nginx)

Minimal nginx config:

```nginx
server {
    listen 80;
    server_name your-machine.local;

    location /s/ {
        alias /var/www/shared-notes/;
        autoindex off;          # no directory listing
        default_type text/html;
    }
}
```

That's it. No Node server, no database, no background process.

## Plugin Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Output directory | `~/shared-notes/` | Where rendered HTML files go |
| Base URL | `http://localhost/s/` | Prefix for generated share links |
| Slug length | 8 | Random slug length for URLs |
| Auto-update on save | `true` | Re-render shared notes on save |
| HTML template | built-in | Custom HTML wrapper (optional) |

## Security Considerations

- **No directory listing**: nginx `autoindex off` — you can only access a note if you know the exact slug
- **Random slugs**: 8-char alphanumeric = 2.8 trillion combinations, not guessable
- **No navigation**: shared HTML pages have no links to other notes or any site structure
- **Unshare = delete**: removing a share deletes the file, immediate 404
- **Optional**: add nginx `auth_basic` for password protection

## Development

```bash
# Clone
git clone https://github.com/kagura-agent/obsidian-share.git
cd obsidian-share

# Install dependencies
npm install

# Build
npm run build

# Dev mode (watch)
npm run dev

# Install to Obsidian vault for testing
# Copy main.js, manifest.json, styles.css to:
# <vault>/.obsidian/plugins/obsidian-share/
```

## Roadmap

- [ ] Core plugin: share/unshare commands
- [ ] Self-contained HTML rendering (base64 images)
- [ ] Auto-update on save
- [ ] Clean HTML template with dark/light mode
- [ ] Obsidian callout / wiki-link support
- [ ] Expiring links (optional TTL)
- [ ] Password-protected shares (optional)
- [ ] QR code generation for easy mobile sharing

## License

MIT
