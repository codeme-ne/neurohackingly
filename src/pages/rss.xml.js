import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  // Sort by date, newest first
  const sortedPosts = posts.sort((a, b) =>
    b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const items = sortedPosts.map((post) => {
    const legacyGuid = new URL(`/blog/${post.slug}/`, context.site).toString();
    return {
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      // NEW: Root URL structure
      link: `/${post.slug}/`,
      author: post.data.author,
      categories: post.data.tags,
      customData: `<guid isPermaLink="false">${legacyGuid}</guid>`
    };
  });

  return rss({
    title: 'Neurohackingly Blog',
    description: 'Practical strategies and insights on productivity, AI, neuroscience, and personal growth',
    site: context.site,
    items,
    customData: `<language>en-us</language>`,
  });
}
