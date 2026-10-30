/**
 * Statični strežnik za `dist` med Lighthouse meritvami (brez odvisnosti).
 * Obnaša se kot strežnik Lighthouse CI (express.static + compression): mapa brez poševnice → 301,
 * `index.html` za mape, gzip za besedilo ≥ 1 KB. Neznana pot vrne 404 (z `404.html`, če obstaja).
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest\+json)|image\/svg\+xml)/;

export interface StaticServer {
  origin: string;
  close(): Promise<void>;
}

const isFile = (path: string) => stat(path).then((s) => (s.isFile() ? s : null), () => null);
const isDir = (path: string) => stat(path).then((s) => s.isDirectory(), () => false);

export async function startStaticServer(dir: string): Promise<StaticServer> {
  const root = resolve(dir);
  if (!(await isDir(root))) throw new Error(`[factory-lighthouse] mapa "${dir}" ne obstaja – najprej zgradi stran.`);

  const server: Server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const target = normalize(join(root, decodeURIComponent(url.pathname)));
      if (target !== root && !target.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      if (!url.pathname.endsWith('/') && (await isDir(target))) {
        res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      let file = url.pathname.endsWith('/') ? join(target, 'index.html') : target;
      let status = 200;
      let info = await isFile(file);
      if (!info) {
        status = 404;
        file = join(root, '404.html');
        info = await isFile(file);
        if (!info) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
          return;
        }
      }
      const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
      const gzip = COMPRESSIBLE.test(type) && info.size >= 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
      res.writeHead(status, {
        'Content-Type': type,
        'Cache-Control': 'no-cache',
        Vary: 'Accept-Encoding',
        ...(gzip ? { 'Content-Encoding': 'gzip' } : { 'Content-Length': info.size }),
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = createReadStream(file);
      (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
    } catch {
      res.writeHead(400).end();
    }
  });

  // Brez naslova (IPv4 in IPv6), ker Chrome `localhost` lahko razreši v ::1.
  await new Promise<void>((ok, fail) => server.once('error', fail).listen(0, () => ok()));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://localhost:${port}`,
    close: () => new Promise((ok) => server.close(() => ok())),
  };
}
