import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const common = {
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
};
const webUrl = z.url().refine((value) => /^https?:\/\//.test(value), 'Use an HTTP or HTTPS URL');
const imageUrl = z.string().regex(/^(?:\/|https?:\/\/)/, 'Use a public path or an HTTP or HTTPS URL');

export const collections = {
  writings: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/writings' }),
    schema: z.object(common),
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
    schema: ({ image }) => z.object({
      ...common,
      featured: z.boolean().default(false),
      preview: z.object({
        src: z.union([imageUrl, image()]),
        alt: z.string().min(1),
      }).optional(),
      url: webUrl.optional(),
      repository: webUrl.optional(),
    }),
  }),
};
