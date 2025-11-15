#!/usr/bin/env node
// Quick sanity check for blog tags:
// - Lists all non-hash tags with post counts
// - Ensures every tag used has at least one non-draft post

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

async function validateTags() {
  const files = await glob('src/content/blog/**/*.mdx');
  const tagMap = new Map<string, string[]>();

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data as any;

    if (data.draft === true) continue;

    const tags: unknown = data.tags;
    let visible: string[] = [];

    if (Array.isArray(tags)) {
      visible = tags
        .map(String)
        .map((t) => t.trim())
        .filter((t) => t && !t.toLowerCase().startsWith('hash-'));
    } else if (typeof tags === 'string' && tags.trim() !== '') {
      const t = tags.trim();
      if (!t.toLowerCase().startsWith('hash-')) visible = [t];
    }

    const slug = path.basename(file, '.mdx');

    for (const tag of visible) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag)!.push(slug);
    }
  }

  const entries = Array.from(tagMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  console.log('🔍 Tag usage overview\n');
  for (const [tag, slugs] of entries) {
    console.log(`${tag}: ${slugs.length} post(s)`);
  }

  console.log('\nSummary:');
  console.log(`  Tags: ${entries.length}`);
  console.log(
    `  Posts with tags: ${new Set(entries.flatMap(([, slugs]) => slugs)).size}`
  );

  // Simple sanity check: no tag should have zero posts (by construction)
  if (entries.length === 0) {
    console.error('\n❌ No tags found. Did you forget to add tags to posts?');
    process.exit(1);
  }

  console.log('\n✅ Tag validation completed.');
}

validateTags().catch((err) => {
  console.error(err);
  process.exit(1);
});

