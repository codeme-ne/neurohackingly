#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import prompts from 'prompts';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');
const AUTHOR = 'Lukas Zangerl';

// Top tags from existing posts
const SUGGESTED_TAGS = [
  'newsletter',
  'productivity',
  'mindset',
  'study-techniques',
  'health-fitness',
  'self-experiment',
  'tools',
  'nlp',
  'life-design',
  'podcast',
  'meta',
  'learning',
  'journaling-and-meditation',
  'ali-abdaal'
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c] || c)
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function getExistingTags(): string[] {
  try {
    const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'));
    const tagSet = new Set<string>();

    for (const file of files.slice(0, 50)) { // Sample first 50 for speed
      const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
      const { data } = matter(content);
      if (Array.isArray(data.tags)) {
        data.tags.forEach((tag: string) => tagSet.add(tag));
      }
    }
    return Array.from(tagSet).sort();
  } catch {
    return SUGGESTED_TAGS;
  }
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0] + 'T12:00:00.000Z';
}

function generateFilename(slug: string): string {
  let filename = `${slug}.mdx`;
  let counter = 2;

  while (fs.existsSync(path.join(BLOG_DIR, filename))) {
    filename = `${slug}-${counter}.mdx`;
    counter++;
  }

  return filename;
}

function createMDXContent(
  title: string,
  description: string,
  tags: string[],
  pubDate: string
): string {
  const tagsYaml = tags.length > 0
    ? tags.map(t => `  - ${t}`).join('\n')
    : '[]';

  return `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
pubDate: ${pubDate}
author: ${AUTHOR}
tags:
${tagsYaml}
featured: false
draft: true
---

# ${title}

Start writing here...
`;
}

async function main() {
  console.log('\n📝 Create New Blog Post\n');

  // Get title from CLI arg or prompt
  let title = process.argv[2];

  if (!title) {
    const response = await prompts({
      type: 'text',
      name: 'title',
      message: 'Post title:',
      validate: (v) => v.length > 0 || 'Title required'
    });
    title = response.title;
    if (!title) process.exit(0);
  }

  // Generate slug
  const slug = slugify(title);
  console.log(`   Slug: ${slug}`);

  // Get description
  const descResponse = await prompts({
    type: 'text',
    name: 'description',
    message: 'Short description:',
    initial: title
  });
  const description = descResponse.description || title;

  // Get existing tags for suggestions
  const existingTags = getExistingTags();

  // Tag selection
  const tagResponse = await prompts({
    type: 'multiselect',
    name: 'tags',
    message: 'Select tags (space to toggle, enter to confirm):',
    choices: SUGGESTED_TAGS.map(tag => ({
      title: tag,
      value: tag,
      selected: false
    })),
    hint: '- Space to select. Return to submit'
  });

  const tags: string[] = tagResponse.tags || [];

  // Ask for additional tags
  const additionalResponse = await prompts({
    type: 'text',
    name: 'additional',
    message: 'Additional tags (comma-separated, or empty):',
  });

  if (additionalResponse.additional) {
    const additional = additionalResponse.additional
      .split(',')
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0);
    tags.push(...additional);
  }

  // Generate content
  const pubDate = getTodayISO();
  const content = createMDXContent(title, description, tags, pubDate);

  // Write file
  const filename = generateFilename(slug);
  const filepath = path.join(BLOG_DIR, filename);

  fs.writeFileSync(filepath, content, 'utf-8');

  console.log(`\n✅ Created: src/content/blog/${filename}`);
  console.log(`   Tags: ${tags.join(', ') || '(none)'}`);
  console.log(`   Draft: true (publish by setting draft: false)\n`);

  // Open in editor
  const editor = process.env.EDITOR || 'code';
  spawn(editor, [filepath], {
    detached: true,
    stdio: 'ignore'
  }).unref();
}

main().catch(console.error);
