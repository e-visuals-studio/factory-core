import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import config from 'virtual:factory/config';

type Post = { id: string; data: { title: string; description: string; pubDate: Date; draft?: boolean; author?: string } };

export const GET: APIRoute = async ({ site }) => {
  if (!config.rss) return new Response(null, { status: 404 });
  const { collection, title, description, basePath = '/blog/' } = config.rss;

  const posts = ((await getCollection(collection as never)) as CollectionEntry<never>[] as unknown as Post[])
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title,
    description,
    site: site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      author: post.data.author,
      link: `${basePath.replace(/\/?$/, '/')}${post.id}/`,
    })),
    customData: `<language>${config.i18n?.defaultLocale ?? 'sl'}</language>`,
  });
};
