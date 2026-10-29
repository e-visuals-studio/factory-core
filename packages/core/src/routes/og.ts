import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import config from 'virtual:factory/config';
import { renderOgImage, type OgContent } from '../og/render.ts';

type Entry = { id: string; data: { title: string; pubDate?: Date; draft?: boolean; image?: unknown } };

export const getStaticPaths = (async () => {
  if (!config.og) return [];
  const { siteName, tagline, collections } = config.og;
  const paths: Array<{ params: { slug: string }; props: OgContent }> = [
    { params: { slug: 'default' }, props: { title: tagline ?? siteName, eyebrow: tagline ? siteName : undefined, footer: config.og.host } },
  ];

  for (const collection of collections) {
    const entries = (await getCollection(collection as never)) as unknown as Entry[];
    // Posti z lastno sliko je ne potrebujejo – OG slika se naredi iz njihove slike.
    for (const entry of entries.filter((e) => !e.data.draft && !e.data.image)) {
      paths.push({
        params: { slug: `${collection}/${entry.id}` },
        props: { title: entry.data.title, eyebrow: siteName, footer: config.og.host },
      });
    }
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  if (!config.og) return new Response(null, { status: 404 });
  const png = await renderOgImage(props as OgContent, config.og.theme);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
