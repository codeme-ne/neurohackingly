import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { remark } from 'remark';
import strip from 'strip-markdown';

// Process markdown to plain text
async function markdownToPlainText(markdown: string): Promise<string> {
  const result = await remark().use(strip).process(markdown);
  return result.toString().trim();
}

export const GET: APIRoute = async () => {
  // Get all blog posts (excluding drafts)
  const posts = await getCollection('blog', ({ data }) => {
    return data.draft !== true;
  });

  // Build search index with full content
  const searchIndex = await Promise.all(
    posts.map(async (post) => {
      // Extract plain text from markdown body
      const plainTextContent = await markdownToPlainText(post.body);

      return {
        slug: post.id,
        title: post.data.title,
        description: post.data.description,
        content: plainTextContent,
        tags: post.data.tags || [],
        author: post.data.author || 'Lukas Zangerl',
        pubDate: post.data.pubDate.toISOString(),
        // Combine all searchable text
        searchableText: `${post.data.title} ${post.data.description} ${plainTextContent} ${(post.data.tags || []).join(' ')}`.toLowerCase()
      };
    })
  );

  return new Response(JSON.stringify(searchIndex), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  });
};