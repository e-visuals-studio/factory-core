import { getCollection } from 'astro:content';
import type { BlogListItem } from '@e-visuals-studio/core';

export async function getPosts() {
  return (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

export async function getPostItems(limit?: number): Promise<BlogListItem[]> {
  return (await getPosts()).slice(0, limit).map((post) => ({
    title: post.data.title,
    description: post.data.description,
    href: `/blog/${post.id}/`,
    date: post.data.pubDate,
    image: post.data.image && { src: post.data.image.src, alt: post.data.image.alt },
  }));
}
