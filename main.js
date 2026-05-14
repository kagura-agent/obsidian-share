var k=Object.defineProperty;var L=Object.getOwnPropertyDescriptor;var R=Object.getOwnPropertyNames;var A=Object.prototype.hasOwnProperty;var B=(i,r)=>{for(var t in r)k(i,t,{get:r[t],enumerable:!0})},N=(i,r,t,e)=>{if(r&&typeof r=="object"||typeof r=="function")for(let s of R(r))!A.call(i,s)&&s!==t&&k(i,s,{get:()=>r[s],enumerable:!(e=L(r,s))||e.enumerable});return i};var P=i=>N(k({},"__esModule",{value:!0}),i);var O={};B(O,{default:()=>f});module.exports=P(O);var a=require("obsidian"),h=require("fs"),u=require("path"),F=require("http"),E={outputDirectory:(0,u.join)(process.env.HOME||process.env.USERPROFILE||"~","shared-notes"),baseUrl:"http://localhost:8080/",slugLength:8,autoUpdateOnSave:!0,serverEnabled:!0,serverPort:8080},C="abcdefghijklmnopqrstuvwxyz0123456789";function H(i){let r="";for(let t=0;t<i;t++)r+=C.charAt(Math.floor(Math.random()*C.length));return r}function I(i,r){return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${y(i)}</title>
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
${r}
</body>
</html>`}function y(i){return i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function D(i){return{png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",svg:"image/svg+xml",webp:"image/webp",bmp:"image/bmp",ico:"image/x-icon"}[i.toLowerCase()]||"application/octet-stream"}async function M(i,r){let e=(await i.vault.read(r)).replace(/^> \[!(\w+)\]\s*(.*)\n((?:^>.*\n?)*)/gm,(o,d,l,g)=>{let b=g.replace(/^> ?/gm,"").trim();return`<div class="callout">${l?`<div class="callout-title">${y(l)}</div>`:""}
${b}
</div>
`}),s=/!\[\[([^\]|]+?)(?:\|(\d+))?\]\]/g,n=[...e.matchAll(s)];for(let o of n){let d=o[1].trim(),l=o[2],g=i.metadataCache.getFirstLinkpathDest(d,r.path);if(g){let b=await i.vault.readBinary(g),v=g.extension,S=D(v),w=$(b),x=l?` width="${l}"`:"",U=`<img src="data:${S};base64,${w}"${x} alt="${y(d)}">`;e=e.replace(o[0],U)}}let m=/!\[([^\]]*)\]\(([^)]+)\)/g,p=[...e.matchAll(m)];for(let o of p){let d=o[1],l=o[2];if(/^https?:\/\//.test(l))continue;let g=i.metadataCache.getFirstLinkpathDest(l,r.path);if(g){let b=await i.vault.readBinary(g),v=g.extension,S=D(v),w=$(b),x=`<img src="data:${S};base64,${w}" alt="${y(d)}">`;e=e.replace(o[0],x)}}e=e.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g,(o,d,l)=>l||d);let c=document.createElement("div");return await a.MarkdownRenderer.render(i,e,c,r.path,i.workspace.activeLeaf?.view??null),c.innerHTML}function $(i){let r=new Uint8Array(i),t="";for(let e=0;e<r.byteLength;e++)t+=String.fromCharCode(r[e]);return window.btoa(t)}var f=class extends a.Plugin{constructor(){super(...arguments);this.settings=E;this.registry={shared:{}};this.statusBarEl=null;this.httpServer=null}async onload(){await this.loadSettings(),await this.loadRegistry(),this.statusBarEl=this.addStatusBarItemEl(),this.updateStatusBar(),this.addCommand({id:"share-note",name:"Share this note",checkCallback:t=>{let e=this.app.workspace.getActiveFile();return!e||e.extension!=="md"?!1:(t||this.shareNote(e),!0)}}),this.addCommand({id:"unshare-note",name:"Unshare this note",checkCallback:t=>{let e=this.app.workspace.getActiveFile();return!e||!this.registry.shared[e.path]?!1:(t||this.unshareNote(e),!0)}}),this.addCommand({id:"copy-share-link",name:"Copy share link",checkCallback:t=>{let e=this.app.workspace.getActiveFile();return!e||!this.registry.shared[e.path]?!1:(t||this.copyShareLink(e),!0)}}),this.registerEvent(this.app.workspace.on("file-menu",(t,e)=>{if(!(e instanceof a.TFile)||e.extension!=="md")return;!!this.registry.shared[e.path]?(t.addItem(n=>{n.setTitle("Copy share link").setIcon("link").onClick(()=>this.copyShareLink(e))}),t.addItem(n=>{n.setTitle("Unshare this note").setIcon("trash-2").onClick(()=>this.unshareNote(e))})):t.addItem(n=>{n.setTitle("Share this note").setIcon("share-2").onClick(()=>this.shareNote(e))})})),this.registerEvent(this.app.vault.on("modify",async t=>{!this.settings.autoUpdateOnSave||!(t instanceof a.TFile)||!this.registry.shared[t.path]||await this.renderAndWrite(t)})),this.registerEvent(this.app.vault.on("rename",async(t,e)=>{if(!(t instanceof a.TFile))return;let s=this.registry.shared[e];s&&(delete this.registry.shared[e],this.registry.shared[t.path]=s,await this.saveRegistry(),this.updateStatusBar())})),this.registerEvent(this.app.vault.on("delete",async t=>{if(!(t instanceof a.TFile))return;let e=this.registry.shared[t.path];e&&(this.removeHtmlFile(e.slug),delete this.registry.shared[t.path],await this.saveRegistry(),this.updateStatusBar())})),this.addSettingTab(new T(this.app,this)),this.settings.serverEnabled&&this.startServer()}async onunload(){this.stopServer()}startServer(){if(this.httpServer)return;let t=this.settings.serverPort,e=this.settings.outputDirectory;this.httpServer=(0,F.createServer)((s,n)=>{let p=(s.url||"/").replace(/^\/+/,"").replace(/\/.*$/,"");if(!p){n.writeHead(404,{"Content-Type":"text/plain"}),n.end("Not Found");return}let c=(0,u.join)(e,`${p}.html`),{resolve:o}=require("path"),d=o(c),l=o(e);if(!d.startsWith(l)){n.writeHead(403,{"Content-Type":"text/plain"}),n.end("Forbidden");return}if(!(0,h.existsSync)(c)||(0,u.extname)(c)!==".html"){n.writeHead(404,{"Content-Type":"text/plain"}),n.end("Not Found");return}try{let g=(0,h.readFileSync)(c,"utf-8");n.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache"}),n.end(g)}catch{n.writeHead(500,{"Content-Type":"text/plain"}),n.end("Internal Server Error")}}),this.httpServer.on("error",s=>{s.code==="EADDRINUSE"?new a.Notice(`Share server: port ${t} is already in use. Change port in settings.`):new a.Notice(`Share server error: ${s.message}`),console.error("obsidian-share: server error",s),this.httpServer=null,this.updateStatusBar()}),this.httpServer.listen(t,()=>{console.log(`obsidian-share: server listening on port ${t}`),this.updateStatusBar()})}stopServer(){this.httpServer&&(this.httpServer.close(),this.httpServer=null,console.log("obsidian-share: server stopped"))}async restartServer(){this.stopServer(),this.settings.serverEnabled&&this.startServer(),this.updateStatusBar()}async shareNote(t){let e=this.registry.shared[t.path];if(e){await this.renderAndWrite(t),await navigator.clipboard.writeText(this.buildUrl(e.slug)),new a.Notice("Share link updated and copied to clipboard");return}let s=H(this.settings.slugLength);this.registry.shared[t.path]={slug:s,sharedAt:new Date().toISOString()},await this.saveRegistry(),await this.renderAndWrite(t);let n=this.buildUrl(s);await navigator.clipboard.writeText(n),new a.Notice(`Shared! Link copied: ${n}`),this.updateStatusBar()}async unshareNote(t){let e=this.registry.shared[t.path];e&&(this.removeHtmlFile(e.slug),delete this.registry.shared[t.path],await this.saveRegistry(),new a.Notice("Note unshared \u2014 link is now dead"),this.updateStatusBar())}copyShareLink(t){let e=this.registry.shared[t.path];if(!e)return;let s=this.buildUrl(e.slug);navigator.clipboard.writeText(s),new a.Notice(`Link copied: ${s}`)}async renderAndWrite(t){try{let e=await M(this.app,t),s=t.basename,n=I(s,e),m=this.registry.shared[t.path];if(!m)return;this.ensureOutputDir();let p=(0,u.join)(this.settings.outputDirectory,`${m.slug}.html`);(0,h.writeFileSync)(p,n,"utf-8")}catch(e){console.error("obsidian-share: render failed",e),new a.Notice("Share: rendering failed \u2014 see console for details")}}buildUrl(t){return`${this.settings.baseUrl.replace(/\/+$/,"")}/${t}`}ensureOutputDir(){(0,h.existsSync)(this.settings.outputDirectory)||(0,h.mkdirSync)(this.settings.outputDirectory,{recursive:!0})}removeHtmlFile(t){let e=(0,u.join)(this.settings.outputDirectory,`${t}.html`);try{(0,h.existsSync)(e)&&(0,h.unlinkSync)(e)}catch(s){console.error("obsidian-share: failed to remove file",s)}}updateStatusBar(){if(!this.statusBarEl)return;let t=Object.keys(this.registry.shared).length;this.settings.serverEnabled&&this.httpServer?this.statusBarEl.setText(`\u{1F4E1} ${t} shared \xB7 :${this.settings.serverPort}`):t>0?this.statusBarEl.setText(`Shared: ${t} note${t!==1?"s":""}`):this.statusBarEl.setText("")}async loadSettings(){this.settings=Object.assign({},E,await this.loadData())}async saveSettings(){await this.saveData({...this.settings,_registry:this.registry})}async loadRegistry(){let t=await this.loadData();t?._registry&&(this.registry=t._registry)}async saveRegistry(){await this.saveData({...this.settings,_registry:this.registry})}},T=class extends a.PluginSettingTab{constructor(r,t){super(r,t),this.plugin=t}display(){let{containerEl:r}=this;r.empty(),new a.Setting(r).setName("Enable built-in server").setDesc("Serve shared notes via a built-in HTTP server (no nginx needed)").addToggle(t=>t.setValue(this.plugin.settings.serverEnabled).onChange(async e=>{this.plugin.settings.serverEnabled=e,e&&(this.plugin.settings.baseUrl=`http://localhost:${this.plugin.settings.serverPort}/`),await this.plugin.saveSettings(),await this.plugin.restartServer(),this.display()})),this.plugin.settings.serverEnabled&&new a.Setting(r).setName("Server port").setDesc("Port for the built-in HTTP server").addText(t=>t.setPlaceholder("8080").setValue(String(this.plugin.settings.serverPort)).onChange(async e=>{let s=parseInt(e,10);isNaN(s)||s<1||s>65535||(this.plugin.settings.serverPort=s,this.plugin.settings.baseUrl=`http://localhost:${s}/`,await this.plugin.saveSettings(),await this.plugin.restartServer())})),new a.Setting(r).setName("Output directory").setDesc("Where rendered HTML files are saved").addText(t=>t.setPlaceholder("~/shared-notes").setValue(this.plugin.settings.outputDirectory).onChange(async e=>{this.plugin.settings.outputDirectory=e,await this.plugin.saveSettings()})),new a.Setting(r).setName("Base URL").setDesc("URL prefix for share links (e.g. http://your-ip/s/)").addText(t=>t.setPlaceholder("http://localhost/s/").setValue(this.plugin.settings.baseUrl).onChange(async e=>{this.plugin.settings.baseUrl=e,await this.plugin.saveSettings()})),new a.Setting(r).setName("Slug length").setDesc("Length of random URL slugs (8 = ~2.8 trillion combinations)").addSlider(t=>t.setLimits(4,16,1).setValue(this.plugin.settings.slugLength).setDynamicTooltip().onChange(async e=>{this.plugin.settings.slugLength=e,await this.plugin.saveSettings()})),new a.Setting(r).setName("Auto-update on save").setDesc("Re-render shared notes automatically when you save them").addToggle(t=>t.setValue(this.plugin.settings.autoUpdateOnSave).onChange(async e=>{this.plugin.settings.autoUpdateOnSave=e,await this.plugin.saveSettings()}))}};
