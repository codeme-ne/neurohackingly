import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

const RESERVED = ['now', 'newsletter', 'rss.xml', 'blog', 'rss', 'sitemap.xml', 'robots.txt'];

async function audit() {
  console.log('🔍 Running pre-migration audit...\n');
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check slug collisions by scanning MDX files
  const mdxFiles = await glob('src/content/blog/**/*.mdx');
  const slugs = new Map<string, string[]>();

  for (const file of mdxFiles) {
    // Check if post is draft
    const content = fs.readFileSync(file, 'utf8');
    const draftMatch = content.match(/^draft:\s*(true|false)/m);
    if (draftMatch && draftMatch[1] === 'true') {
      continue; // Skip draft posts
    }

    // Derive slug from filename (without .mdx extension)
    const slug = path.basename(file, '.mdx');
    const id = path.relative('src/content/blog', file);

    if (!slugs.has(slug)) slugs.set(slug, []);
    slugs.get(slug)!.push(id);
  }

  slugs.forEach((ids, slug) => {
    if (ids.length > 1) {
      errors.push(`❌ Duplicate slug \"${slug}\": ${ids.join(', ')}`);
    }
    if (RESERVED.includes(slug)) {
      errors.push(`❌ Reserved slug collision: \"${slug}\" in ${ids[0]}`);
    }
  });

  // 2. Check internal links in MDX
  const files = await glob('src/content/blog/**/*.mdx');
  const blogLinkPattern = /\[([^\]]+)\]\(\/blog\/([^t\)][^)]*)\)/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(blogLinkPattern);
    if (matches) {
      warnings.push(`⚠️  ${file} contains ${matches.length} /blog/ link(s)`);
    }
  }

  // 3. Results
  if (errors.length > 0) {
    console.error('❌ Pre-migration checks FAILED:\n' + errors.join('\n') + '\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Warnings:\n' + warnings.join('\n') + '\n');
    console.warn('Run npm run fix:internal-links to fix.\n');
  }

  console.log('✅ Pre-migration audit passed');
  console.log(`   Checked ${slugs.size} posts, ${files.length} MDX files`);
}

audit();

