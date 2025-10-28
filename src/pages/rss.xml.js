import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  // Sort by date, newest first
  const sortedPosts = posts.sort((a, b) =>
    b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: 'Neurohackingly Blog',
    description: 'Practical strategies and insights on productivity, AI, neuroscience, and personal growth',
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      // NEW: Root URL structure
      link: `/${post.slug}/`,
      // STABLE: Keep old URL as GUID to prevent RSS reader duplication
      guid: `${context.site}blog/${post.slug}/`,
      // Mark GUID as stable identifier, not a URL
      isPermaLink: false,
      author: post.data.author,
      categories: post.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
