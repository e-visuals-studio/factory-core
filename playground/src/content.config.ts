import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogSchema } from '@e-visuals-studio/core';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: blogSchema,
});

export const collections = { blog };
