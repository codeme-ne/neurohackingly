#!/usr/bin/env tsx
/**
 * Blog Images Migration Script
 *
 * Migrates Ghost CMS images to Astro public/ directory:
 * 1. Copies images from ghost-import-temp/.../images/{slug}/ to public/images/{slug}/
 * 2. Replaces paths in MDX files:
 *    - Ghost paths: /content/images/YYYY/MM/file.ext → /images/{slug}/file.ext
 *    - External URLs: https://... → /images/{slug}/file.ext (if file exists locally)
 *
 * Usage:
 *   npm run migrate-images -- --dry-run   # Validate without changes
 *   npm run migrate-images                # Execute migration
 */

import { readFileSync, writeFileSync, readdirSync, statSync, cpSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

// Configuration
const GHOST_IMAGES_DIR = 'ghost-import-temp/ghost-import/content/images';
const PUBLIC_IMAGES_DIR = 'public/images';
const BLOG_CONTENT_DIR = 'src/content/blog';
const DRY_RUN = process.argv.includes('--dry-run');

// Statistics
const stats = {
  slugsFound: 0,
  slugsMissing: 0,
  imagescopied: 0,
  mdxFilesProcessed: 0,
  pathsReplaced: 0,
  externalUrlsReplaced: 0,
  ghostPathsReplaced: 0,
  errors: [] as string[],
  missingSlugFolders: [] as string[]
};

// Get all slug folders from ghost-import-temp
function getAvailableSlugFolders(): Set<string> {
  const slugs = new Set<string>();
  if (!existsSync(GHOST_IMAGES_DIR)) {
    console.error(`❌ Ghost images directory not found: ${GHOST_IMAGES_DIR}`);
    process.exit(1);
  }

  const entries = readdirSync(GHOST_IMAGES_DIR);
  entries.forEach(entry => {
    const fullPath = join(GHOST_IMAGES_DIR, entry);
    if (statSync(fullPath).isDirectory()) {
      slugs.add(entry);
    }
  });

  return slugs;
}

// Copy images from ghost-import-temp to public/images
function copyImagesForSlug(slug: string): number {
  const sourcePath = join(GHOST_IMAGES_DIR, slug);
  const destPath = join(PUBLIC_IMAGES_DIR, slug);

  if (!existsSync(sourcePath)) {
    return 0;
  }

  if (DRY_RUN) {
    const files = readdirSync(sourcePath);
    return files.length;
  }

  // Create destination directory
  mkdirSync(destPath, { recursive: true });

  // Copy all files
  try {
    cpSync(sourcePath, destPath, { recursive: true });
    const files = readdirSync(destPath);
    return files.length;
  } catch (error) {
    stats.errors.push(`Failed to copy images for ${slug}: ${error}`);
    return 0;
  }
}

// Extract filename from various URL formats
function extractFilename(url: string): string | null {
  try {
    // Remove query parameters and fragments
    const cleanUrl = url.split('?')[0].split('#')[0];
    const filename = basename(cleanUrl);

    // Validate filename has extension
    if (filename && filename.includes('.')) {
      return filename;
    }
    return null;
  } catch {
    return null;
  }
}

// Check if a file exists in slug folder (case-insensitive)
function fileExistsInSlugFolder(slug: string, filename: string): boolean {
  const folderPath = DRY_RUN
    ? join(GHOST_IMAGES_DIR, slug)
    : join(PUBLIC_IMAGES_DIR, slug);

  if (!existsSync(folderPath)) {
    return false;
  }

  const files = readdirSync(folderPath);
  const lowerFilename = filename.toLowerCase();

  return files.some(f => f.toLowerCase() === lowerFilename);
}

// Process MDX file
function processMdxFile(filePath: string, slug: string, hasSlugFolder: boolean): void {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    stats.errors.push(`Failed to read ${filePath}: ${error}`);
    return;
  }

  const originalContent = content;
  let replacements = 0;

  if (!hasSlugFolder) {
    // Skip processing if no slug folder exists
    stats.mdxFilesProcessed++;
    return;
  }

  // Pattern 1: Ghost CMS paths in markdown: ![...](/content/images/YYYY/MM/filename.ext)
  content = content.replace(
    /!\[([^\]]*)\]\(\/content\/images\/\d{4}\/\d{2}\/([^)]+)\)/g,
    (match, alt, filename) => {
      if (fileExistsInSlugFolder(slug, filename)) {
        replacements++;
        stats.ghostPathsReplaced++;
        return `![${alt}](/images/${slug}/${filename})`;
      }
      return match; // Keep original if file not found
    }
  );

  // Pattern 2: Ghost CMS paths in frontmatter: url: /content/images/YYYY/MM/filename.ext
  content = content.replace(
    /(\s+url:\s+)\/content\/images\/\d{4}\/\d{2}\/([^\s\n]+)/g,
    (match, prefix, filename) => {
      if (fileExistsInSlugFolder(slug, filename)) {
        replacements++;
        stats.ghostPathsReplaced++;
        return `${prefix}/images/${slug}/${filename}`;
      }
      return match;
    }
  );

  // Pattern 3: External URLs in markdown: ![...](https://...)
  content = content.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,
    (match, alt, url) => {
      const filename = extractFilename(url);
      if (filename && fileExistsInSlugFolder(slug, filename)) {
        replacements++;
        stats.externalUrlsReplaced++;
        return `![${alt}](/images/${slug}/${filename})`;
      }
      return match; // Keep original URL if file not found locally
    }
  );

  stats.pathsReplaced += replacements;
  stats.mdxFilesProcessed++;

  // Write back if content changed
  if (content !== originalContent && !DRY_RUN) {
    try {
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      stats.errors.push(`Failed to write ${filePath}: ${error}`);
    }
  }
}

// Main migration logic
function runMigration(): void {
  console.log(DRY_RUN ? '🔍 DRY RUN MODE - No changes will be made\n' : '🚀 Starting image migration\n');

  // Step 1: Get available slug folders
  console.log('📂 Scanning Ghost images directory...');
  const availableSlugs = getAvailableSlugFolders();
  console.log(`   Found ${availableSlugs.size} slug folders\n`);

  // Step 2: Get all MDX files
  if (!existsSync(BLOG_CONTENT_DIR)) {
    console.error(`❌ Blog content directory not found: ${BLOG_CONTENT_DIR}`);
    process.exit(1);
  }

  const mdxFiles = readdirSync(BLOG_CONTENT_DIR)
    .filter(f => f.endsWith('.mdx'))
    .map(f => ({ path: join(BLOG_CONTENT_DIR, f), slug: f.replace('.mdx', '') }));

  console.log(`📄 Found ${mdxFiles.length} MDX files\n`);

  // Step 3: Process each MDX file
  console.log('🔄 Processing files...\n');

  mdxFiles.forEach(({ path, slug }) => {
    const hasSlugFolder = availableSlugs.has(slug);

    if (hasSlugFolder) {
      stats.slugsFound++;
      // Copy images
      const imagesCopied = copyImagesForSlug(slug);
      stats.imagescopied += imagesCopied;
    } else {
      stats.slugsMissing++;
      stats.missingSlugFolders.push(slug);
    }

    // Process MDX content
    processMdxFile(path, slug, hasSlugFolder);
  });

  // Print report
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60));
  console.log(`\n✅ Slug folders found:        ${stats.slugsFound}/${mdxFiles.length}`);
  console.log(`⚠️  Slug folders missing:      ${stats.slugsMissing}/${mdxFiles.length}`);
  console.log(`📁 Images copied:             ${stats.imagescopied}`);
  console.log(`📝 MDX files processed:       ${stats.mdxFilesProcessed}`);
  console.log(`🔄 Total paths replaced:      ${stats.pathsReplaced}`);
  console.log(`   - Ghost CMS paths:         ${stats.ghostPathsReplaced}`);
  console.log(`   - External URLs:           ${stats.externalUrlsReplaced}`);

  if (stats.missingSlugFolders.length > 0) {
    console.log(`\n⚠️  Posts without image folders (${stats.missingSlugFolders.length}):`);
    stats.missingSlugFolders.slice(0, 10).forEach(slug => {
      console.log(`   - ${slug}`);
    });
    if (stats.missingSlugFolders.length > 10) {
      console.log(`   ... and ${stats.missingSlugFolders.length - 10} more`);
    }
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`);
    stats.errors.forEach(err => console.log(`   ${err}`));
  }

  console.log('\n' + '='.repeat(60));

  if (DRY_RUN) {
    console.log('\n✅ Dry run completed. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📍 Next steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Run: npm run dev');
    console.log('   3. Verify images load correctly in sample posts');
    console.log('   4. Check git diff for changes');
  }
}

// Execute
runMigration();
