#!/usr/bin/env tsx
/**
 * MDX GIF → GifVideo Component Replacer
 *
 * Replaces Markdown image references to GIFs with <GifVideo /> component calls.
 * Only replaces if corresponding MP4/WebM/JPG files exist.
 *
 * Pattern:  ![alt text](/images/path/file.gif)
 * Becomes:  <GifVideo alt="alt text" webm="/images/path/file.webm" mp4="/images/path/file.mp4" poster="/images/path/file.jpg" />
 *
 * Usage:
 *   npx tsx scripts/replace-gifs-in-mdx.ts [--dry-run] [--backup]
 *
 * Options:
 *   --dry-run  Show changes without modifying files
 *   --backup   Create .bak files before modifying
 */

import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const BACKUP = process.argv.includes('--backup');
const CONTENT_DIRS = [
  path.join(process.cwd(), 'src/content/blog'),
  path.join(process.cwd(), 'src/content/de'),
];
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Find all MDX files
function findMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.mdx'))
    .map(file => path.join(dir, file));
}

// Check if video files exist for a GIF
function videoFilesExist(gifPath: string): boolean {
  const basePath = gifPath.replace(/\.gif$/i, '');
  const mp4Path = path.join(PUBLIC_DIR, `${basePath}.mp4`);
  const webmPath = path.join(PUBLIC_DIR, `${basePath}.webm`);
  const posterPath = path.join(PUBLIC_DIR, `${basePath}.jpg`);

  return fs.existsSync(mp4Path) && fs.existsSync(webmPath) && fs.existsSync(posterPath);
}

// Process a single MDX file
function processMdxFile(filePath: string): { changed: boolean; replacements: number } {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = content;
  let replacements = 0;
  let needsImport = false;

  // Regex: ![alt text](/images/path/file.gif)
  const gifPattern = /!\[([^\]]*)\]\((\/images\/[^)]+\.gif)\)/gi;

  modified = modified.replace(gifPattern, (match, alt, gifUrl) => {
    // Check if video files exist
    if (!videoFilesExist(gifUrl)) {
      console.log(`  ⚠️  Skipping ${gifUrl} - video files not found`);
      return match; // Keep original
    }

    const basePath = gifUrl.replace(/\.gif$/i, '');
    const component = `<GifVideo alt="${alt}" webm="${basePath}.webm" mp4="${basePath}.mp4" poster="${basePath}.jpg" />`;

    replacements++;
    needsImport = true;
    return component;
  });

  // Add import if we made replacements
  if (needsImport && replacements > 0) {
    const importStatement = "import GifVideo from '../../components/GifVideo.astro';\n\n";

    // Check if import already exists
    if (!modified.includes("import GifVideo")) {
      // Insert after frontmatter (after second ---)
      const frontmatterEndIndex = modified.indexOf('---', 3);
      if (frontmatterEndIndex !== -1) {
        modified = modified.slice(0, frontmatterEndIndex + 3) + '\n\n' + importStatement + modified.slice(frontmatterEndIndex + 3);
      } else {
        // No frontmatter, add at top
        modified = importStatement + modified;
      }
    }
  }

  const changed = content !== modified;

  if (changed && !DRY_RUN) {
    // Create backup if requested
    if (BACKUP) {
      fs.writeFileSync(`${filePath}.bak`, content, 'utf-8');
    }

    // Write modified content
    fs.writeFileSync(filePath, modified, 'utf-8');
  }

  return { changed, replacements };
}

// Main execution
function main(): void {
  console.log('🔄 MDX GIF → GifVideo Replacer\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  let totalFiles = 0;
  let totalModified = 0;
  let totalReplacements = 0;

  for (const contentDir of CONTENT_DIRS) {
    const mdxFiles = findMdxFiles(contentDir);

    if (mdxFiles.length === 0) {
      continue;
    }

    console.log(`📁 Processing ${path.basename(contentDir)}/ (${mdxFiles.length} files)\n`);

    for (const filePath of mdxFiles) {
      totalFiles++;
      const fileName = path.basename(filePath);

      const result = processMdxFile(filePath);

      if (result.changed) {
        totalModified++;
        totalReplacements += result.replacements;

        const action = DRY_RUN ? 'Would modify' : 'Modified';
        console.log(`  ✅ ${action}: ${fileName} (${result.replacements} replacements)`);
      }
    }

    console.log('');
  }

  console.log('📊 SUMMARY:');
  console.log(`   Files scanned:    ${totalFiles}`);
  console.log(`   Files modified:   ${totalModified}`);
  console.log(`   Total replacements: ${totalReplacements}`);

  if (DRY_RUN && totalReplacements > 0) {
    console.log('\n✅ Dry run complete. Run without --dry-run to apply changes.');
  }
}

main();
