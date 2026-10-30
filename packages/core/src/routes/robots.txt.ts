import type { APIRoute } from 'astro';
import config from 'virtual:factory/config';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site);
  const lines = config.robots.blockCrawl
    ? ['User-agent: *', 'Disallow: /']
    : ['User-agent: *', 'Allow: /', ...config.robots.disallow.map((path) => `Disallow: ${path}`), '', `Sitemap: ${sitemap}`];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
