// Renders every Markdown page under docs/ to a standalone HTML page next to it. GitHub Pages serves docs/ as the site.
// No dependencies: a small Markdown parser for what these docs use (headings, paragraphs, nested and task lists,
// tables, fenced code, images, links, bold, italic, inline code). Task-list checkboxes are clickable and remembered
// per page in the browser's local storage.
//
// Usage (from the repo root): node tools/md-to-html.js
// Edit the Markdown, then rerun; the .html files are generated next to their .md sources.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
	e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.md') ? [path.join(dir, e.name)] : []);
const PAGES = walk(docs).map(f => path.relative(root, f).split(path.sep).join('/'));
const rendered = new Set(PAGES.map(p => path.resolve(root, p)));

// ── Inline ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text, fromFile) {
	const codes = [];
	text = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
	text = esc(text);
	text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
		`<figure><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`);
	text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${linkTarget(href, fromFile)}">${label}</a>`);
	text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	text = text.replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
	return text.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
}

/** Links to another Markdown page that is also rendered point at its .html twin; external links open in a new tab. */
function linkTarget(href, fromFile) {
	if (/^https?:/.test(href)) return esc(href) + '" target="_blank" rel="noopener';
	const [file, hash] = href.split('#');
	if (file.endsWith('.md') && rendered.has(path.resolve(path.dirname(fromFile), file)))
		return esc(file.replace(/\.md$/, '.html') + (hash ? '#' + hash : ''));
	return esc(href);
}

// ── Blocks ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const LIST = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const indentOf = l => l.match(/^\s*/)[0].length;
const slug = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

function blocks(lines, ctx) {
	let out = '', i = 0;
	const startsBlock = l => /^\s*```/.test(l) || /^#{1,6}\s/.test(l) || /^---\s*$/.test(l) || LIST.test(l) || /^\s*\|/.test(l);
	while (i < lines.length) {
		const line = lines[i];
		if (!line.trim()) { i++; continue; }

		let m;
		if ((m = line.match(/^\s*```(\w*)/))) {
			const pad = indentOf(line), body = [];
			for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) body.push(lines[i].slice(Math.min(pad, indentOf(lines[i]))));
			i++;
			out += `<pre><code${m[1] ? ` class="lang-${m[1]}"` : ''}>${esc(body.join('\n'))}</code></pre>\n`;
		} else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
			const level = m[1].length, html = inline(m[2], ctx.file), id = slug(m[2]);
			if (level === 1 && !ctx.title) ctx.title = m[2].replace(/[*`]/g, '');
			if (level === 2) ctx.toc.push({ id, html });
			out += `<h${level} id="${id}">${html}</h${level}>\n`;
			i++;
		} else if (/^---\s*$/.test(line)) {
			out += '<hr>\n'; i++;
		} else if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
			const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim(), ctx.file));
			const head = cells(line);
			i += 2;
			let rows = '';
			for (; i < lines.length && /^\s*\|/.test(lines[i]); i++) rows += '<tr>' + cells(lines[i]).map(c => `<td>${c}</td>`).join('') + '</tr>\n';
			out += `<div class="table"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>\n${rows}</tbody></table></div>\n`;
		} else if (LIST.test(line)) {
			const r = list(lines, i, ctx);
			out += r.html; i = r.next;
		} else {
			const para = [];
			for (; i < lines.length && lines[i].trim() && !(para.length && startsBlock(lines[i])); i++) para.push(lines[i].trim());
			const html = inline(para.join(' '), ctx.file);
			out += /^<figure>.*<\/figure>$/.test(html) ? html + '\n' : `<p>${html}</p>\n`;
		}
	}
	return out;
}

function list(lines, i, ctx) {
	const base = indentOf(lines[i]);
	const ordered = /^\d+\./.test(lines[i].trim());
	let items = '';
	while (i < lines.length) {
		const m = lines[i].match(LIST);
		if (!m || m[1].length !== base || /^\d+\./.test(m[2]) !== ordered) break;
		const contentIndent = base + m[2].length + 1;
		const body = [m[3]];
		let j = i + 1;
		for (; j < lines.length; j++) {
			const l = lines[j];
			if (!l.trim()) { body.push(''); continue; }
			if (indentOf(l) >= contentIndent || (indentOf(l) > base && !LIST.test(l))) body.push(l.slice(Math.min(contentIndent, indentOf(l))));
			else if (body[body.length - 1] !== '' && !LIST.test(l) && !/^\s*(```|#|\|)/.test(l)) body.push(l.trim()); // lazy continuation
			else break;
		}
		while (body.length && body[body.length - 1] === '') body.pop();
		i = j;

		let task = null, first = body[0];
		const t = first.match(/^\[([ xX])\]\s+(.*)$/);
		if (t) { task = t[1] !== ' '; body[0] = t[2]; }
		let html = blocks(body, ctx);
		// A single paragraph reads better without its <p>.
		if ((html.match(/<p>/g) || []).length === 1 && html.startsWith('<p>')) html = html.replace(/^<p>([\s\S]*?)<\/p>\n/, '$1');
		if (task !== null) {
			const id = `task-${ctx.tasks++}`;
			items += `<li class="task"><label><input type="checkbox" data-task="${id}"${task ? ' checked' : ''}><span class="box"></span></label><div>${html}</div></li>\n`;
		} else items += `<li>${html}</li>\n`;
	}
	const tag = ordered ? 'ol' : 'ul';
	const cls = items.includes('class="task"') ? ' class="tasks"' : '';
	return { html: `<${tag}${cls}>\n${items}</${tag}>\n`, next: i };
}

// ── Page ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function page(title, toc, body, source, storageKey, home) {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root {
  --bg: #f6f4ef; --panel: #ffffff; --ink: #1d1f22; --muted: #62666d; --line: #dedad2;
  --accent: #b5532a; --link: #1f6f8b; --code-bg: #efece5; --done: #2f8a55; color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #111316; --panel: #181b1f; --ink: #e6e2da; --muted: #9a9ea5; --line: #2b2f35;
    --accent: #e08654; --link: #6fc3dc; --code-bg: #20242a; --done: #5fc489; color-scheme: dark;
  }
}
* { box-sizing: border-box; }
html { scroll-padding-top: 16px; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.62 system-ui, "Segoe UI", Roboto, sans-serif; }
.layout { max-width: 1160px; margin: 0 auto; padding: 32px 16px 96px; display: grid; gap: 40px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 980px) { .layout { grid-template-columns: 240px minmax(0, 1fr); } }
nav { font-size: 14px; }
@media (min-width: 980px) { nav { position: sticky; top: 24px; align-self: start; max-height: calc(100vh - 48px); overflow: auto; } }
nav .progress { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; }
nav .bar { height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; margin-top: 8px; }
nav .bar span { display: block; height: 100%; width: 0; background: var(--done); transition: width .2s; }
nav ol { list-style: none; padding: 0; margin: 0; }
nav li a { display: block; padding: 5px 10px; border-radius: 6px; color: var(--muted); text-decoration: none; }
nav li a:hover { background: var(--panel); color: var(--ink); }
nav .source { margin-top: 16px; color: var(--muted); font-size: 12.5px; padding: 0 10px; }
main { min-width: 0; max-width: 780px; }
h1 { font-size: 2.1rem; line-height: 1.15; margin: 0 0 12px; }
h2 { font-size: 1.45rem; margin: 48px 0 12px; padding-top: 8px; color: var(--accent); }
h3 { font-size: 1.12rem; margin: 32px 0 8px; }
p, li { overflow-wrap: anywhere; }
a { color: var(--link); }
hr { border: 0; border-top: 1px solid var(--line); margin: 40px 0; }
code { font: 0.88em/1.4 ui-monospace, Consolas, "Cascadia Mono", monospace; background: var(--code-bg); padding: 1px 5px; border-radius: 4px; }
pre { background: var(--code-bg); padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; font-size: 0.86rem; }
ul, ol { padding-left: 24px; }
li { margin: 4px 0; }
li > ul, li > ol { margin: 6px 0; }
ul.tasks { list-style: none; padding-left: 0; }
li.task { display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: start; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px 10px 8px; margin: 8px 0; }
li.task > div > p:first-child { margin-top: 0; }
li.task > div > :last-child { margin-bottom: 0; }
li.task label { position: relative; display: block; width: 20px; height: 20px; margin-top: 2px; cursor: pointer; }
li.task input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
li.task .box { display: block; width: 20px; height: 20px; border: 2px solid var(--muted); border-radius: 5px; }
li.task input:checked + .box { background: var(--done); border-color: var(--done); }
li.task input:checked + .box::after { content: ""; position: absolute; left: 7px; top: 3px; width: 5px; height: 10px; border: solid #fff; border-width: 0 2.5px 2.5px 0; transform: rotate(45deg); }
li.task input:focus-visible + .box { outline: 2px solid var(--link); outline-offset: 2px; }
li.task:has(input:checked) > div { color: var(--muted); }
.table { overflow-x: auto; margin: 16px 0; }
table { border-collapse: collapse; width: 100%; font-size: 0.94rem; }
th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--line); }
th { color: var(--muted); font-weight: 600; }
figure { margin: 24px 0; }
figure img { display: block; max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--line); }
figcaption { color: var(--muted); font-size: 0.9rem; margin-top: 6px; }
nav .home { display: block; font-weight: 600; color: var(--ink); text-decoration: none; padding: 0 10px 14px; }
nav .home:hover { color: var(--accent); }
</style>
</head>
<body>
<div class="layout">
<nav aria-label="Contents">
${home ? `  <a class="home" href="${home}">← Godot learning</a>\n` : ''}  <div class="progress"><strong id="done">0</strong> of <span id="total">0</span> done<div class="bar"><span id="bar"></span></div></div>
  <ol>
${toc.map(t => `    <li><a href="#${t.id}">${t.html}</a></li>`).join('\n')}
  </ol>
  <p class="source">Generated from <code>${esc(source)}</code>. Edit the Markdown, then run <code>node tools/md-to-html.js</code>.</p>
</nav>
<main>
${body}</main>
</div>
<script>
(function () {
  var key = ${JSON.stringify(storageKey)};
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
  var boxes = document.querySelectorAll('input[data-task]');
  if (!boxes.length) { document.querySelector('nav .progress').style.display = 'none'; return; }
  function count() {
    var n = 0;
    boxes.forEach(function (b) { if (b.checked) n++; });
    document.getElementById('done').textContent = n;
    document.getElementById('total').textContent = boxes.length;
    document.getElementById('bar').style.width = (boxes.length ? 100 * n / boxes.length : 0) + '%';
  }
  boxes.forEach(function (b) {
    if (saved[b.dataset.task] !== undefined) b.checked = saved[b.dataset.task];
    b.addEventListener('change', function () {
      saved[b.dataset.task] = b.checked;
      try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {}
      count();
    });
  });
  count();
})();
</script>
</body>
</html>
`;
}

for (const rel of PAGES) {
	const file = path.resolve(root, rel);
	const md = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
	const ctx = { file, toc: [], tasks: 0, title: '' };
	const body = blocks(md.split('\n'), ctx);
	const out = file.replace(/\.md$/, '.html');
	const home = path.resolve(file) === path.join(docs, 'index.md') ? '' :
		path.relative(path.dirname(file), path.join(docs, 'index.html')).split(path.sep).join('/');
	fs.writeFileSync(out, page(ctx.title || rel, ctx.toc, body, rel, 'godot-learning:' + rel, home));
	console.log(`wrote ${path.relative(root, out)} (${ctx.tasks} checkboxes)`);
}
