import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4])]));
const types = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };

export async function snapshotSavedPage(input, slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Use a lowercase filename slug.');
  const sourcePath = path.resolve(root, input);
  const bytes = await fs.readFile(sourcePath);
  const original = bytes.toString('utf8');
  const title = original.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? path.basename(sourcePath);
  const savedFrom = original.match(/saved from url=\(\d+\)(https?:\/\/[^\s<]+)/)?.[1] ?? null;
  const base = savedFrom ?? (title.includes('Simpul') ? 'https://simpul-p3md.com/' : 'https://p3mdinternal.vercel.app/');
  const dir = path.join(root, 'references/authenticated', slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'original.html'), bytes);
  const companion = sourcePath.replace(/\.html?$/i, '') + '_files';
  const copied = [];
  try {
    const files = await fs.readdir(companion, { recursive: true });
    await fs.cp(companion, path.join(dir, 'assets'), { recursive: true });
    for (const name of files) {
      const filename = path.join(companion, name);
      if (!(await fs.stat(filename)).isFile()) continue;
      const resource = await fs.readFile(filename);
      copied.push({ file: 'assets/' + name, bytes: resource.length, sha256: digest(resource) });
    }
  } catch (e) { if (e.code !== 'ENOENT') throw e; }

  const cached = new Map();
  for (const site of ['p3md-internal', 'simpul-p3md']) {
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(root, 'references', site, 'manifest.json'), 'utf8'));
      for (const asset of manifest.assets.filter(a => a.file)) {
        cached.set(asset.url, path.join(root, 'references', site, asset.file));
        cached.set(asset.finalUrl, path.join(root, 'references', site, asset.file));
      }
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }

  const unresolved = new Set();
  const embedded = new Set();
  async function resourcePath(value, localBase) {
    if (/^(?:data:|blob:|#)/i.test(value)) return null;
    if (!/^(?:https?:|\/)/i.test(value)) {
      try { const local = fileURLToPath(new URL(decode(value), pathToFileURL(localBase))); await fs.access(local); return local; } catch { /* Resolve against captured live origin below. */ }
    }
    try { return cached.get(new URL(decode(value), base).href) ?? null; } catch { return null; }
  }
  async function inlineResource(value, localBase) {
    if (/^(?:data:|#)/i.test(value)) return value;
    const local = await resourcePath(value, localBase);
    if (local && types[path.extname(local).toLowerCase()]) {
      const data = await fs.readFile(local);
      embedded.add(local);
      return 'data:' + types[path.extname(local).toLowerCase()] + ';base64,' + data.toString('base64');
    }
    unresolved.add(value);
    try { return new URL(value, base).href; } catch { return value; }
  }
  async function embedCss(css, cssPath) {
    const matches = [...css.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)].reverse();
    for (const m of matches) {
      const value = await inlineResource(m[2], cssPath);
      css = css.slice(0, m.index) + 'url("' + value + '")' + css.slice(m.index + m[0].length);
    }
    return css;
  }

  let snapshot = original
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<form\b([^>]*)>/gi, (all, rest) => '<form inert' + rest.replace(/\s+(?:action|method)=["'][^"']*["']/gi, '') + '>');

  for (const m of [...snapshot.matchAll(/<link\b[^>]*>/gi)].reverse()) {
    const a = attributes(m[0]);
    let replacement = '';
    if (a.rel === 'stylesheet' && a.href) {
      const cssPath = await resourcePath(a.href, sourcePath);
      if (cssPath) replacement = '<style data-reference-stylesheet="embedded">' + await embedCss(await fs.readFile(cssPath, 'utf8'), cssPath) + '</style>';
      else { replacement = m[0]; unresolved.add(a.href); }
    } else if (!/preload|prefetch|dns-prefetch|preconnect|modulepreload/i.test(a.rel ?? '')) replacement = m[0];
    snapshot = snapshot.slice(0, m.index) + replacement + snapshot.slice(m.index + m[0].length);
  }
  for (const m of [...snapshot.matchAll(/<img\b[^>]*>/gi)].reverse()) {
    const a = attributes(m[0]);
    let replacement = m[0].replace(/\s+srcset\s*=\s*(?:"[^"]*"|'[^']*')/gi, '').replace(/\s+loading=["']lazy["']/gi, '');
    if (a.src) {
      const src = await inlineResource(a.src, sourcePath);
      replacement = replacement.replace(/\bsrc=("|')[^"']*\1/i, 'src="' + src.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"');
    }
    snapshot = snapshot.slice(0, m.index) + replacement + snapshot.slice(m.index + m[0].length);
  }
  if (/<script\b/i.test(snapshot)) throw new Error('Executable script remains in static snapshot.');
  await fs.writeFile(path.join(dir, 'snapshot.html'), snapshot);
  const manifest = { title: decode(title), savedFrom, sourceFile: path.relative(root, sourcePath), capturedAt: new Date().toISOString(), sourceBytes: bytes.length, sourceSha256: digest(bytes), assets: copied, embeddedResources: embedded.size, unresolvedResources: [...unresolved], scriptsRemoved: true, originalPreserved: true, browserRenderedVerification: false, scope: 'User-supplied saved page only; other screens require separate captures.' };
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const [input, slug] = process.argv.slice(2);
  if (!input || !slug) throw new Error('Usage: node scripts/snapshot-saved-page.mjs "Saved page.html" lowercase-slug');
  console.log(JSON.stringify(await snapshotSavedPage(input, slug), null, 2));
}
