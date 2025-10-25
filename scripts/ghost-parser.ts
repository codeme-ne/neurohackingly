import fs from 'fs/promises';
import path from 'path';
import TurndownService from 'turndown';
import matter from 'gray-matter';

// Types
interface GhostPost {
  id: string;
  title: string;
  slug: string;
  html: string;
  feature_image: string | null;
  published_at: string;
  updated_at: string;
  meta_title?: string;
  meta_description?: string;
  status: string;
}

interface GhostTag {
  id: string;
  name: string;
  slug: string;
}

interface GhostPostTag {
  post_id: string;
  tag_id: string;
}

interface GhostExport {
  db: Array<{
    meta: { version: string; exported_on: number };
    data: {
      posts: GhostPost[];
      tags: GhostTag[];
      posts_tags: GhostPostTag[];
    };
  }>;
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
});

// Keep code blocks intact
turndownService.addRule('fencedCodeBlock', {
  filter: function (node) {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild &&
      node.firstChild.nodeName === 'CODE'
    );
  },
  replacement: function (content, node) {
    const code = node.firstChild as HTMLElement;
    const language = code.className.replace('language-', '') || '';
    return '\n```' + language + '\n' + code.textContent + '\n```\n';
  },
});

async function parseGhostExport(jsonPath: string) {
  console.log('📖 Reading Ghost export...');

  let ghostData: GhostExport;
  try {
    const rawData = await fs.readFile(jsonPath, 'utf-8');
    ghostData = JSON.parse(rawData);

    // Validate structure
    if (!ghostData.db || !Array.isArray(ghostData.db) || ghostData.db.length === 0) {
      throw new Error('Invalid Ghost export: missing or empty db array');
    }
    if (!ghostData.db[0].data) {
      throw new Error('Invalid Ghost export: missing data object');
    }
    if (!ghostData.db[0].data.posts || !Array.isArray(ghostData.db[0].data.posts)) {
      throw new Error('Invalid Ghost export: missing or invalid posts array');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to parse Ghost export:', error.message);
    }
    throw error;
  }

  const data = ghostData.db[0].data;
  const posts = data.posts.filter((p) => p.status === 'published');
  const tags = data.tags;
  const postTags = data.posts_tags;

  console.log(`✅ Found ${posts.length} published posts`);

  // Create tag lookup
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const postTagsMap = new Map<string, string[]>();

  for (const pt of postTags) {
    const tag = tagMap.get(pt.tag_id);
    if (tag) {
      if (!postTagsMap.has(pt.post_id)) {
        postTagsMap.set(pt.post_id, []);
      }
      postTagsMap.get(pt.post_id)!.push(tag.slug);
    }
  }

  // Process each post
  for (const post of posts) {
    const postTags = postTagsMap.get(post.id) || [];
    const isGerman = postTags.includes('de');
    const contentDir = isGerman
      ? path.join(process.cwd(), 'src/content/de')
      : path.join(process.cwd(), 'src/content/blog');

    // Convert HTML to Markdown (skip if null/empty)
    if (!post.html || post.html.trim() === '') {
      console.log(`⚠️  Skipping ${post.slug} (no content)`);
      continue;
    }
    const markdown = turndownService.turndown(post.html);

    // Build frontmatter (remove undefined values)
    const frontmatter: Record<string, any> = {
      title: post.title,
      description: post.meta_description || post.title,
      pubDate: new Date(post.published_at),
      author: 'Lukas Zangerl',
      tags: postTags.filter((t) => t !== 'de'), // Remove 'de' tag
      featured: false,
      draft: false,
    };

    // Add optional fields only if they exist
    if (post.updated_at) {
      frontmatter.updatedDate = new Date(post.updated_at);
    }
    if (post.feature_image) {
      frontmatter.image = {
        url: post.feature_image,
        alt: post.meta_title || post.title,
      };
    }

    // Create MDX content
    const mdxContent = matter.stringify(markdown, frontmatter);

    // Write file
    await fs.mkdir(contentDir, { recursive: true });
    const filePath = path.join(contentDir, `${post.slug}.mdx`);
    await fs.writeFile(filePath, mdxContent, 'utf-8');

    console.log(
      `✍️  Created: ${isGerman ? 'de' : 'blog'}/${post.slug}.mdx`
    );
  }

  console.log('\n🎉 Migration complete!');
  console.log(`📊 Stats:`);
  console.log(`   - Total posts: ${posts.length}`);
  console.log(
    `   - English posts: ${posts.filter((p) => !postTagsMap.get(p.id)?.includes('de')).length}`
  );
  console.log(
    `   - German posts: ${posts.filter((p) => postTagsMap.get(p.id)?.includes('de')).length}`
  );
}

// Run parser
const ghostJsonPath = path.join(
  process.cwd(),
  '../neurohackingly-by-lukas-zangerl.ghost.2025-10-08-04-23-04.json'
);

parseGhostExport(ghostJsonPath).catch(console.error);
