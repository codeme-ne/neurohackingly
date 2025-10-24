#!/usr/bin/env tsx
/**
 * Hero Image → Astro Assets Migration
 *
 * Migrates hero/banner images from public/images/ to src/assets/heroes/
 * and updates frontmatter to use Astro 5 image() references.
 *
 * Process:
 * 1. Scans all MDX files in src/content/{blog,de}
 * 2. Extracts image.url from frontmatter
 * 3. Copies image from public/ to src/assets/heroes/{slug}/
 * 4. Adds hero: ../../assets/heroes/{slug}/{file} to frontmatter
 * 5. Preserves image.url/alt for fallback compatibility
 *
 * Usage:
 *   npx tsx scripts/migrate-heroes-to-assets.ts [--dry-run] [--limit N]
 *
 * Options:
 *   --dry-run  Show what would be migrated without copying/modifying
 *   --limit N  Only migrate first N posts (for testing)
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const limitIdx = process.argv.indexOf('--limit');
  return limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;
})();

const CONTENT_DIRS = [
  path.join(process.cwd(), 'src/content/blog'),
  path.join(process.cwd(), 'src/content/de'),
];
const ASSETS_DIR = path.join(process.cwd(), 'src/assets/heroes');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

interface MigrationResult {
  slug: string;
  originalPath: string;
  assetPath: string;
  success: boolean;
  error?: string;
}

// Find all MDX files
function findMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.mdx'))
    .map(file => path.join(dir, file));
}

// Extract slug from file path
function getSlug(filePath: string): string {
  return path.basename(filePath, '.mdx');
}

// Migrate single post
function migratePost(filePath: string): MigrationResult {
  const slug = getSlug(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(content);

  // Check if image.url exists
  if (!parsed.data.image || !parsed.data.image.url) {
    return {
      slug,
      originalPath: '',
      assetPath: '',
      success: false,
      error: 'No image.url in frontmatter'
    };
  }

  // Check if hero already exists
  if (parsed.data.hero) {
    return {
      slug,
      originalPath: parsed.data.image.url,
      assetPath: '',
      success: false,
      error: 'Hero already set'
    };
  }

  const imageUrl = parsed.data.image.url as string;

  // Resolve source path (remove leading slash for filesystem)
  const sourcePath = path.join(PUBLIC_DIR, imageUrl.replace(/^\//, ''));

  if (!fs.existsSync(sourcePath)) {
    return {
      slug,
      originalPath: imageUrl,
      assetPath: '',
      success: false,
      error: `Source image not found: ${sourcePath}`
    };
  }

  // Determine destination
  const fileName = path.basename(imageUrl);
  const destDir = path.join(ASSETS_DIR, slug);
  const destPath = path.join(destDir, fileName);

  // Relative path from MDX file to asset
  const relativePath = `../../assets/heroes/${slug}/${fileName}`;

  if (DRY_RUN) {
    console.log(`  🔄 Would migrate: ${slug}`);
    console.log(`     Source: ${imageUrl}`);
    console.log(`     Dest:   ${relativePath}`);
    return {
      slug,
      originalPath: imageUrl,
      assetPath: relativePath,
      success: true
    };
  }

  try {
    // Create destination directory
    fs.mkdirSync(destDir, { recursive: true });

    // Copy image
    fs.copyFileSync(sourcePath, destPath);

    // Update frontmatter: add hero field
    parsed.data.hero = relativePath;

    // Write back
    const updated = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(filePath, updated, 'utf-8');

    console.log(`  ✅ Migrated: ${slug}`);
    console.log(`     → ${relativePath}`);

    return {
      slug,
      originalPath: imageUrl,
      assetPath: relativePath,
      success: true
    };
  } catch (error) {
    return {
      slug,
      originalPath: imageUrl,
      assetPath: relativePath,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Main execution
function main(): void {
  console.log('🖼️  Hero Image → Astro Assets Migration\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  if (LIMIT < Infinity) {
    console.log(`⚠️  Limiting migration to first ${LIMIT} posts\n`);
  }

  // Ensure assets directory exists
  if (!DRY_RUN && !fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  const results: MigrationResult[] = [];
  let processed = 0;

  for (const contentDir of CONTENT_DIRS) {
    const mdxFiles = findMdxFiles(contentDir);

    if (mdxFiles.length === 0) {
      continue;
    }

    console.log(`📁 Processing ${path.basename(contentDir)}/ (${mdxFiles.length} files)\n`);

    for (const filePath of mdxFiles) {
      if (processed >= LIMIT) {
        break;
      }

      const result = migratePost(filePath);
      results.push(result);

      if (result.error) {
        console.log(`  ⏭️  Skipped: ${result.slug} (${result.error})`);
      }

      processed++;
    }

    console.log('');
  }

  // Summary
  const successful = results.filter(r => r.success);
  const skipped = results.filter(r => !r.success);

  console.log('📊 SUMMARY:');
  console.log(`   Posts processed:  ${results.length}`);
  console.log(`   Successfully migrated: ${successful.length}`);
  console.log(`   Skipped: ${skipped.length}`);

  if (skipped.length > 0) {
    console.log('\n⚠️  Skipped posts:');
    skipped.forEach(r => {
      console.log(`   - ${r.slug}: ${r.error}`);
    });
  }

  if (DRY_RUN && successful.length > 0) {
    console.log(`\n✅ Dry run complete. Run without --dry-run to migrate ${successful.length} posts.`);
  }
}

main();
