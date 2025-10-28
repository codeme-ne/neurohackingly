import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Lukas Zangerl'),
    image: z.object({
      url: z.string(),
      alt: z.string().default('')
    }).optional(),
    hero: image().optional(), // Astro 5 optimized image (AVIF/WebP/responsive)
    tags: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    readingTime: z.number().positive().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false)
  })
});

export const collections = { blog };
