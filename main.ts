import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Notice,
	MarkdownRenderer,
	Menu,
	MenuItem,
} from "obsidian";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { join, extname } from "path";
import { createServer, IncomingMessage, ServerResponse, Server } from "http";

// ── Types ──────────────────────────────────────────────────────────────

interface ShareEntry {
	slug: string;
	sharedAt: string;
}

interface ShareRegistry {
	shared: Record<string, ShareEntry>;
}

interface ObsidianShareSettings {
	outputDirectory: string;
	baseUrl: string;
	slugLength: number;
	autoUpdateOnSave: boolean;
	serverEnabled: boolean;
	serverPort: number;
}

const DEFAULT_SETTINGS: ObsidianShareSettings = {
	outputDirectory: "", // resolved at runtime to <vault>/.obsidian/plugins/obsidian-share/shared/
	baseUrl: "http://localhost:8080/",
	slugLength: 8,
	autoUpdateOnSave: true,
	serverEnabled: true,
	serverPort: 8080,
};

// ── Slug Generation ────────────────────────────────────────────────────

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateSlug(length: number): string {
	let slug = "";
	for (let i = 0; i < length; i++) {
		slug += SLUG_CHARS.charAt(Math.floor(Math.random() * SLUG_CHARS.length));
	}
	return slug;
}

// ── HTML Template ──────────────────────────────────────────────────────

function wrapHtml(title: string, bodyHtml: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
:root {
  --bg: #ffffff;
  --fg: #1a1a1a;
  --fg-muted: #6b7280;
  --link: #2563eb;
  --border: #e5e7eb;
  --code-bg: #f3f4f6;
  --callout-bg: #f0f9ff;
  --callout-border: #3b82f6;
  --table-stripe: #f9fafb;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a2e;
    --fg: #e2e8f0;
    --fg-muted: #94a3b8;
    --link: #60a5fa;
    --border: #334155;
    --code-bg: #1e293b;
    --callout-bg: #1e293b;
    --callout-border: #3b82f6;
    --table-stripe: #1e293b;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.7;
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; line-height: 1.3; }
h1 { font-size: 1.875rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }
p { margin: 0.75em 0; }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; height: auto; border-radius: 4px; margin: 0.5em 0; }
blockquote {
  border-left: 3px solid var(--border);
  padding: 0.25em 1em;
  margin: 1em 0;
  color: var(--fg-muted);
}
code {
  background: var(--code-bg);
  padding: 0.15em 0.35em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: "SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
}
pre {
  background: var(--code-bg);
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid var(--border); padding: 0.5em 0.75em; text-align: left; }
th { background: var(--code-bg); font-weight: 600; }
tr:nth-child(even) { background: var(--table-stripe); }
ul, ol { margin: 0.75em 0; padding-left: 1.5em; }
li { margin: 0.25em 0; }
hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.callout {
  border-left: 3px solid var(--callout-border);
  background: var(--callout-bg);
  padding: 0.75em 1em;
  border-radius: 0 6px 6px 0;
  margin: 1em 0;
}
.callout-title { font-weight: 600; margin-bottom: 0.25em; }
input[type="checkbox"] { margin-right: 0.4em; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

// ── MIME helpers ────────────────────────────────────────────────────────

function mimeForExt(ext: string): string {
	const map: Record<string, string> = {
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		svg: "image/svg+xml",
		webp: "image/webp",
		bmp: "image/bmp",
		ico: "image/x-icon",
	};
	return map[ext.toLowerCase()] || "application/octet-stream";
}

// ── Markdown → HTML rendering ──────────────────────────────────────────

async function renderMarkdown(
	app: App,
	file: TFile
): Promise<string> {
	const content = await app.vault.read(file);

	// Process callouts: > [!type] title  →  <div class="callout">...
	let processed = content.replace(
		/^> \[!(\w+)\]\s*(.*)\n((?:^>.*\n?)*)/gm,
		(_match: string, _type: string, title: string, body: string) => {
			const bodyText = body.replace(/^> ?/gm, "").trim();
			const titleHtml = title
				? `<div class="callout-title">${escapeHtml(title)}</div>`
				: "";
			return `<div class="callout">${titleHtml}\n${bodyText}\n</div>\n`;
		}
	);

	// Resolve wiki-link images: ![[image.png]] and ![[image.png|400]]
	const wikiImageRegex = /!\[\[([^\]|]+?)(?:\|(\d+))?\]\]/g;
	const wikiMatches = [...processed.matchAll(wikiImageRegex)];
	for (const m of wikiMatches) {
		const imgName = m[1].trim();
		const width = m[2];
		const imgFile = app.metadataCache.getFirstLinkpathDest(imgName, file.path);
		if (imgFile) {
			const data = await app.vault.readBinary(imgFile);
			const ext = imgFile.extension;
			const mime = mimeForExt(ext);
			const b64 = arrayBufferToBase64(data);
			const widthAttr = width ? ` width="${width}"` : "";
			const imgTag = `<img src="data:${mime};base64,${b64}"${widthAttr} alt="${escapeHtml(imgName)}">`;
			processed = processed.replace(m[0], imgTag);
		}
	}

	// Resolve standard markdown images: ![alt](path)
	const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
	const mdMatches = [...processed.matchAll(mdImageRegex)];
	for (const m of mdMatches) {
		const alt = m[1];
		const imgPath = m[2];
		// Skip external URLs
		if (/^https?:\/\//.test(imgPath)) continue;
		const imgFile = app.metadataCache.getFirstLinkpathDest(imgPath, file.path);
		if (imgFile) {
			const data = await app.vault.readBinary(imgFile);
			const ext = imgFile.extension;
			const mime = mimeForExt(ext);
			const b64 = arrayBufferToBase64(data);
			const imgTag = `<img src="data:${mime};base64,${b64}" alt="${escapeHtml(alt)}">`;
			processed = processed.replace(m[0], imgTag);
		}
	}

	// Convert remaining wiki-links [[page]] and [[page|alias]] to plain text
	processed = processed.replace(
		/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g,
		(_match: string, target: string, alias: string) => alias || target
	);

	// Render markdown to HTML using Obsidian's built-in renderer
	const tempEl = document.createElement("div");
	await MarkdownRenderer.render(app, processed, tempEl, file.path, app.workspace.activeLeaf?.view ?? null as any);
	return tempEl.innerHTML;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}

// ── Plugin ─────────────────────────────────────────────────────────────

export default class ObsidianSharePlugin extends Plugin {
	settings: ObsidianShareSettings = DEFAULT_SETTINGS;
	registry: ShareRegistry = { shared: {} };
	statusBarEl: HTMLElement | null = null;
	httpServer: Server | null = null;

	getDefaultOutputDir(): string {
		// Store shared HTML files inside the plugin's own directory
		const vaultBasePath = (this.app.vault.adapter as any).basePath;
		if (vaultBasePath) {
			return join(vaultBasePath, ".obsidian", "plugins", "obsidian-share", "shared");
		}
		return join(process.env.HOME || process.env.USERPROFILE || "~", "shared-notes");
	}

	getOutputDir(): string {
		return this.settings.outputDirectory || this.getDefaultOutputDir();
	}

	async onload() {
		await this.loadSettings();
		await this.loadRegistry();

		// Status bar
		this.statusBarEl = this.addStatusBarItemEl();
		this.updateStatusBar();

		// Commands
		this.addCommand({
			id: "share-note",
			name: "Share this note",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") return false;
				if (!checking) this.shareNote(file);
				return true;
			},
		});

		this.addCommand({
			id: "unshare-note",
			name: "Unshare this note",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || !this.registry.shared[file.path]) return false;
				if (!checking) this.unshareNote(file);
				return true;
			},
		});

		this.addCommand({
			id: "copy-share-link",
			name: "Copy share link",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || !this.registry.shared[file.path]) return false;
				if (!checking) this.copyShareLink(file);
				return true;
			},
		});

		// File menu (right-click)
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu: Menu, file) => {
				if (!(file instanceof TFile) || file.extension !== "md") return;
				const isShared = !!this.registry.shared[file.path];

				if (!isShared) {
					menu.addItem((item: MenuItem) => {
						item.setTitle("Share this note")
							.setIcon("share-2")
							.onClick(() => this.shareNote(file));
					});
				} else {
					menu.addItem((item: MenuItem) => {
						item.setTitle("Copy share link")
							.setIcon("link")
							.onClick(() => this.copyShareLink(file));
					});
					menu.addItem((item: MenuItem) => {
						item.setTitle("Unshare this note")
							.setIcon("trash-2")
							.onClick(() => this.unshareNote(file));
					});
				}
			})
		);

		// Auto-update on save
		this.registerEvent(
			this.app.vault.on("modify", async (file) => {
				if (
					!this.settings.autoUpdateOnSave ||
					!(file instanceof TFile) ||
					!this.registry.shared[file.path]
				)
					return;
				await this.renderAndWrite(file);
			})
		);

		// Handle file renames
		this.registerEvent(
			this.app.vault.on("rename", async (file, oldPath) => {
				if (!(file instanceof TFile)) return;
				const entry = this.registry.shared[oldPath];
				if (!entry) return;
				delete this.registry.shared[oldPath];
				this.registry.shared[file.path] = entry;
				await this.saveRegistry();
				this.updateStatusBar();
			})
		);

		// Handle file deletions
		this.registerEvent(
			this.app.vault.on("delete", async (file) => {
				if (!(file instanceof TFile)) return;
				const entry = this.registry.shared[file.path];
				if (!entry) return;
				this.removeHtmlFile(entry.slug);
				delete this.registry.shared[file.path];
				await this.saveRegistry();
				this.updateStatusBar();
			})
		);

		// Settings tab
		this.addSettingTab(new ObsidianShareSettingTab(this.app, this));

		// Start built-in HTTP server
		if (this.settings.serverEnabled) {
			this.startServer();
		}
	}

	async onunload() {
		this.stopServer();
	}

	// ── HTTP Server ────────────────────────────────────────────────────

	startServer() {
		if (this.httpServer) return;

		const port = this.settings.serverPort;
		const outputDir = this.getOutputDir();

		this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
			const url = req.url || "/";
			// Strip leading slash, get the slug
			const slug = url.replace(/^\/+/, "").replace(/\/.*$/, "");

			if (!slug) {
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.end("Not Found");
				return;
			}

			// Only serve .html files
			const filePath = join(outputDir, `${slug}.html`);

			// Security: ensure resolved path is within output directory
			const { resolve } = require("path");
			const resolvedPath = resolve(filePath);
			const resolvedDir = resolve(outputDir);
			if (!resolvedPath.startsWith(resolvedDir)) {
				res.writeHead(403, { "Content-Type": "text/plain" });
				res.end("Forbidden");
				return;
			}

			if (!existsSync(filePath) || extname(filePath) !== ".html") {
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.end("Not Found");
				return;
			}

			try {
				const html = readFileSync(filePath, "utf-8");
				res.writeHead(200, {
					"Content-Type": "text/html; charset=utf-8",
					"Cache-Control": "no-cache",
				});
				res.end(html);
			} catch {
				res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("Internal Server Error");
			}
		});

		this.httpServer.on("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE") {
				new Notice(`Share server: port ${port} is already in use. Change port in settings.`);
			} else {
				new Notice(`Share server error: ${err.message}`);
			}
			console.error("obsidian-share: server error", err);
			this.httpServer = null;
			this.updateStatusBar();
		});

		this.httpServer.listen(port, () => {
			console.log(`obsidian-share: server listening on port ${port}`);
			this.updateStatusBar();
		});
	}

	stopServer() {
		if (this.httpServer) {
			this.httpServer.close();
			this.httpServer = null;
			console.log("obsidian-share: server stopped");
		}
	}

	async restartServer() {
		this.stopServer();
		if (this.settings.serverEnabled) {
			this.startServer();
		}
		this.updateStatusBar();
	}

	// ── Share/Unshare/Copy ─────────────────────────────────────────────

	async shareNote(file: TFile) {
		const existing = this.registry.shared[file.path];
		if (existing) {
			await this.renderAndWrite(file);
			await navigator.clipboard.writeText(this.buildUrl(existing.slug));
			new Notice("Share link updated and copied to clipboard");
			return;
		}

		const slug = generateSlug(this.settings.slugLength);
		this.registry.shared[file.path] = {
			slug,
			sharedAt: new Date().toISOString(),
		};
		await this.saveRegistry();
		await this.renderAndWrite(file);
		const url = this.buildUrl(slug);
		await navigator.clipboard.writeText(url);
		new Notice(`Shared! Link copied: ${url}`);
		this.updateStatusBar();
	}

	async unshareNote(file: TFile) {
		const entry = this.registry.shared[file.path];
		if (!entry) return;
		this.removeHtmlFile(entry.slug);
		delete this.registry.shared[file.path];
		await this.saveRegistry();
		new Notice("Note unshared — link is now dead");
		this.updateStatusBar();
	}

	copyShareLink(file: TFile) {
		const entry = this.registry.shared[file.path];
		if (!entry) return;
		const url = this.buildUrl(entry.slug);
		navigator.clipboard.writeText(url);
		new Notice(`Link copied: ${url}`);
	}

	// ── Rendering ──────────────────────────────────────────────────────

	async renderAndWrite(file: TFile) {
		try {
			const bodyHtml = await renderMarkdown(this.app, file);
			const title = file.basename;
			const fullHtml = wrapHtml(title, bodyHtml);

			const entry = this.registry.shared[file.path];
			if (!entry) return;

			this.ensureOutputDir();
			const outPath = join(this.getOutputDir(), `${entry.slug}.html`);
			writeFileSync(outPath, fullHtml, "utf-8");
		} catch (err) {
			console.error("obsidian-share: render failed", err);
			new Notice("Share: rendering failed — see console for details");
		}
	}

	// ── Helpers ────────────────────────────────────────────────────────

	buildUrl(slug: string): string {
		const base = this.settings.baseUrl.replace(/\/+$/, "");
		return `${base}/${slug}`;
	}

	ensureOutputDir() {
		const dir = this.getOutputDir();
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
	}

	removeHtmlFile(slug: string) {
		const filePath = join(this.getOutputDir(), `${slug}.html`);
		try {
			if (existsSync(filePath)) unlinkSync(filePath);
		} catch (err) {
			console.error("obsidian-share: failed to remove file", err);
		}
	}

	updateStatusBar() {
		if (!this.statusBarEl) return;
		const count = Object.keys(this.registry.shared).length;
		if (this.settings.serverEnabled && this.httpServer) {
			this.statusBarEl.setText(
				`📡 ${count} shared · :${this.settings.serverPort}`
			);
		} else if (count > 0) {
			this.statusBarEl.setText(
				`Shared: ${count} note${count !== 1 ? "s" : ""}`
			);
		} else {
			this.statusBarEl.setText("");
		}
	}

	// ── Persistence ────────────────────────────────────────────────────

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData({ ...this.settings, _registry: this.registry });
	}

	async loadRegistry() {
		const data = await this.loadData();
		if (data?._registry) {
			this.registry = data._registry;
		}
	}

	async saveRegistry() {
		await this.saveData({ ...this.settings, _registry: this.registry });
	}
}

// ── Settings Tab ───────────────────────────────────────────────────────

class ObsidianShareSettingTab extends PluginSettingTab {
	plugin: ObsidianSharePlugin;

	constructor(app: App, plugin: ObsidianSharePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Server settings ──

		new Setting(containerEl)
			.setName("Enable built-in server")
			.setDesc("Serve shared notes via a built-in HTTP server (no nginx needed)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.serverEnabled)
					.onChange(async (value) => {
						this.plugin.settings.serverEnabled = value;
						if (value) {
							this.plugin.settings.baseUrl = `http://localhost:${this.plugin.settings.serverPort}/`;
						}
						await this.plugin.saveSettings();
						await this.plugin.restartServer();
						this.display(); // refresh to show/hide port
					})
			);

		if (this.plugin.settings.serverEnabled) {
			new Setting(containerEl)
				.setName("Server port")
				.setDesc("Port for the built-in HTTP server")
				.addText((text) =>
					text
						.setPlaceholder("8080")
						.setValue(String(this.plugin.settings.serverPort))
						.onChange(async (value) => {
							const port = parseInt(value, 10);
							if (isNaN(port) || port < 1 || port > 65535) return;
							this.plugin.settings.serverPort = port;
							this.plugin.settings.baseUrl = `http://localhost:${port}/`;
							await this.plugin.saveSettings();
							await this.plugin.restartServer();
						})
				);
		}

		// ── File settings ──

		new Setting(containerEl)
			.setName("Output directory")
			.setDesc(`Where rendered HTML files are saved. Leave empty for default: <vault>/.obsidian/plugins/obsidian-share/shared/`)
			.addText((text) =>
				text
					.setPlaceholder("(plugin directory — auto)")
					.setValue(this.plugin.settings.outputDirectory)
					.onChange(async (value) => {
						this.plugin.settings.outputDirectory = value;
						await this.plugin.saveSettings();
						await this.plugin.restartServer();
					})
			);

		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("URL prefix for share links (e.g. http://your-ip/s/)")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost/s/")
					.setValue(this.plugin.settings.baseUrl)
					.onChange(async (value) => {
						this.plugin.settings.baseUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Slug length")
			.setDesc("Length of random URL slugs (8 = ~2.8 trillion combinations)")
			.addSlider((slider) =>
				slider
					.setLimits(4, 16, 1)
					.setValue(this.plugin.settings.slugLength)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.slugLength = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-update on save")
			.setDesc("Re-render shared notes automatically when you save them")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoUpdateOnSave)
					.onChange(async (value) => {
						this.plugin.settings.autoUpdateOnSave = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
