import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const attrs = (text) => Object.fromEntries([...text.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), (m[2] ?? m[3] ?? m[4]).replaceAll('&amp;', '&')]));
const referenceRoot = fileURLToPath(new URL('../references/', import.meta.url));
const tracking = /(?:cloudflareinsights|google-analytics|googletagmanager|doubleclick|facebook\.net|vercel\.live|emoji\.slack-edge)/i;
function resolveAsset(value, base) {
  if (!value || /^(?:data:|blob:|javascript:|#)/i.test(value) || tracking.test(value)) return null;
  try { const u = new URL(value.replaceAll('&amp;', '&'), base); if (!['http:', 'https:'].includes(u.protocol)) return null; u.hash = ''; return u.href; } catch { return null; }
}
function resourceUrls(html, base) {
  const list = [];
  for (const m of html.matchAll(/<(script|link|img|source)\b([^>]*)>/gi)) {
    const t = m[1].toLowerCase(), a = attrs(m[2]);
    if (t === 'script' || t === 'img' || t === 'source') { if (a.src) list.push(a.src); if (a.srcset) list.push(...a.srcset.split(',').map(v => v.trim().split(/\s+/)[0])); }
    if (t === 'link' && /(?:stylesheet|icon|preload|modulepreload)/.test(a.rel ?? '')) list.push(a.href);
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) list.push(m[1]);
  for (const m of html.matchAll(/["']((?:https?:\/\/|\/|\.\.?\/)[^"'\s<>]*\.(?:css|js|png|jpe?g|webp|avif|svg|gif|woff2?|ttf|otf)(?:\?[^"'\s<>]*)?)["']/gi)) list.push(m[1]);
  return [...new Set(list.map(v => resolveAsset(v, base)).filter(Boolean))];
}
function extension(contentType) {
  const types = { 'application/javascript': '.js', 'text/javascript': '.js', 'text/css': '.css', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/svg+xml': '.svg', 'image/webp': '.webp', 'image/avif': '.avif', 'font/woff2': '.woff2', 'font/woff': '.woff', 'application/json': '.json' };
  return types[contentType.split(';')[0]] ?? '';
}
async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000), credentials: 'omit', headers: { 'User-Agent': 'Mozilla/5.0 (frontend-reference-capture)', 'Accept': '*/*' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > 15 * 1024 * 1024) throw new Error('Asset exceeds 15 MB capture limit');
  return { url: r.url, status: r.status, contentType: r.headers.get('content-type') ?? '', sourceMapHeader: r.headers.get('sourcemap') ?? r.headers.get('x-sourcemap'), bytes };
}
export async function captureSite(url, slug) {
  const dir = path.join(referenceRoot, slug);
  await fs.mkdir(path.join(dir, 'assets'), { recursive: true });
  await fs.mkdir(path.join(dir, 'inline'), { recursive: true });
  const root = await get(url), html = root.bytes.toString('utf8');
  await fs.writeFile(path.join(dir, 'original.html'), root.bytes);
  const inline = [];
  for (const kind of ['script', 'style']) {
    let n = 0;
    const re = new RegExp('<' + kind + '\\b([^>]*)>([\\s\\S]*?)<\\/' + kind + '\\s*>', 'gi');
    for (const m of html.matchAll(re)) {
      if (kind === 'script' && attrs(m[1]).src) continue;
      const type = attrs(m[1]).type ?? '';
      const file = 'inline/' + kind + '-' + String(++n).padStart(3, '0') + (kind === 'style' ? '.css' : /json/.test(type) ? '.json' : '.js');
      await fs.writeFile(path.join(dir, file), m[2]);
      inline.push({ file, bytes: Buffer.byteLength(m[2]), kind, type });
    }
  }
  const queue = resourceUrls(html, root.url), seen = new Set(), assets = [], bodies = new Map(), omitted = [];
  let totalBytes = root.bytes.length;
  while (queue.length && seen.size < 200 && totalBytes < 80 * 1024 * 1024) {
    const batch = [];
    while (queue.length && batch.length < 4) { const next = queue.shift(); if (!seen.has(next)) { seen.add(next); batch.push(next); } }
    const retrieved = await Promise.all(batch.map(async assetUrl => {
      try {
        const item = await get(assetUrl);
        if (item.contentType.includes('text/html')) throw new Error('HTML returned instead of a frontend asset');
        const basename = path.basename(new URL(assetUrl).pathname).replace(/[^A-Za-z0-9._-]/g, '_') || 'asset';
        const file = 'assets/' + hash(assetUrl).slice(0, 12) + '-' + basename + (path.extname(basename) ? '' : extension(item.contentType));
        await fs.writeFile(path.join(dir, file), item.bytes);
        return { ...item, originalUrl: assetUrl, file, sha256: hash(item.bytes) };
      } catch (e) { return { originalUrl: assetUrl, error: e.message }; }
    }));
    for (const item of retrieved) {
      if (item.error) { assets.push({ url: item.originalUrl, error: item.error }); continue; }
      totalBytes += item.bytes.length;
      const meta = { url: item.originalUrl, finalUrl: item.url, file: item.file, status: item.status, contentType: item.contentType, bytes: item.bytes.length, sha256: item.sha256 };
      assets.push(meta); bodies.set(item.originalUrl, item);
      if (/(?:javascript|css)/i.test(item.contentType) || /\.(?:js|css)(?:\?|$)/i.test(item.url)) {
        const text = item.bytes.toString('utf8');
        for (const dependency of resourceUrls(text, item.url)) if (!seen.has(dependency)) queue.push(dependency);
        const map = item.sourceMapHeader ?? text.match(/[#@]\s*sourceMappingURL\s*=\s*([^\s*]+)/)?.[1];
        const mapUrl = resolveAsset(map, item.url);
        if (mapUrl && !seen.has(mapUrl)) queue.push(mapUrl);
      }
    }
  }
  if (queue.length) omitted.push({ reason: 'bounded capture limit', remaining: queue.length });
  const mappings = new Map(assets.filter(a => a.file).flatMap(a => [[a.url, a.file], [a.finalUrl, a.file]]));
  const rewrite = (text, base, parent = '') => {
    const resolveLocal = value => { const key = resolveAsset(value, base); const target = mappings.get(key); return target ? path.posix.relative(parent, target) : value; };
    text = text.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (all, quote, value) => 'url(' + quote + resolveLocal(value) + quote + ')');
    return text.replace(/\b(src|href|poster)=("|')([^"']+)\2/gi, (all, attribute, quote, value) => attribute + '=' + quote + resolveLocal(value) + quote);
  };
  await fs.mkdir(path.join(dir, 'snapshot-assets'), { recursive: true });
  for (const item of bodies.values()) {
    if (!item.contentType.includes('css')) continue;
    const file = 'snapshot-assets/' + path.basename(item.file);
    await fs.writeFile(path.join(dir, file), rewrite(item.bytes.toString('utf8'), item.url, 'snapshot-assets'));
    mappings.set(item.originalUrl, file); mappings.set(item.url, file);
  }
  let snapshot = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<link\b[^>]*\brel=["'](?:preload|modulepreload)["'][^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<form\b([^>]*)>/gi, (all, rest) => '<form inert' + rest.replace(/\s+(?:action|method)=["'][^"']*["']/gi, '') + '>');
  snapshot = rewrite(snapshot, root.url).replace(/\bsrcset=("|')[^"']*\1/gi, '');
  await fs.writeFile(path.join(dir, 'snapshot.html'), snapshot);
  const recovered = [];
  for (const item of bodies.values()) {
    if (!/\.map(?:\?|$)/.test(item.originalUrl)) continue;
    try {
      const map = JSON.parse(item.bytes.toString('utf8'));
      for (let i = 0; i < (map.sourcesContent?.length ?? 0); i++) {
        if (typeof map.sourcesContent[i] !== 'string') continue;
        const basename = path.basename(map.sources[i]).replace(/[^A-Za-z0-9._-]/g, '_') || 'source.txt';
        const file = 'recovered-source/' + String(recovered.length + 1).padStart(4, '0') + '-' + basename;
        await fs.mkdir(path.join(dir, 'recovered-source'), { recursive: true });
        await fs.writeFile(path.join(dir, file), map.sourcesContent[i]);
        recovered.push({ source: map.sources[i], file });
      }
    } catch { /* Invalid or non-JSON maps remain preserved as raw assets. */ }
  }
  const manifest = { requestedUrl: url, finalUrl: root.url, capturedAt: new Date().toISOString(), html: { file: 'original.html', bytes: root.bytes.length, sha256: hash(root.bytes), status: root.status }, snapshot: 'snapshot.html', inline, assets, recovered, omitted, authenticated: false, limits: { maximumAssets: 200, maximumAssetBytes: 15 * 1024 * 1024, maximumTotalBytes: 80 * 1024 * 1024 }, notes: ['Original HTML/assets preserved unmodified.', 'snapshot.html removes scripts and disables forms; it is a visual reference, not a working offline application.', 'Analytics assets omitted. No cookies, credentials or protected API responses captured.'] };
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { slug, ...manifest };
}
