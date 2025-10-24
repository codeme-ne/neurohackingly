#!/usr/bin/env tsx
/**
 * GIF → Video Converter
 *
 * Converts all GIFs in public/images/** to:
 * - MP4 (H.264, CRF 23)
 * - WebM (VP9, CRF 30)
 * - JPG poster frame
 *
 * Usage:
 *   npx tsx scripts/convert-gifs-to-video.ts [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Show what would be converted without doing it
 *   --force    Overwrite existing MP4/WebM/JPG files
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const IMAGES_DIR = path.join(process.cwd(), 'public/images');

// Check ffmpeg availability
function checkFFmpeg(): void {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    console.error('❌ ffmpeg not found. Install with: sudo apt-get install ffmpeg');
    process.exit(1);
  }
}

// Find all GIF files recursively
function findGifs(dir: string): string[] {
  const gifs: string[] = [];

  function scan(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gif')) {
        gifs.push(fullPath);
      }
    }
  }

  scan(dir);
  return gifs;
}

// Get file size in MB
function getFileSizeMB(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
}

// Convert single GIF to MP4/WebM/poster
function convertGif(gifPath: string): { mp4Size: number; webmSize: number; savings: number } {
  const basePath = gifPath.replace(/\.gif$/i, '');
  const mp4Path = `${basePath}.mp4`;
  const webmPath = `${basePath}.webm`;
  const posterPath = `${basePath}.jpg`;

  const gifSize = getFileSizeMB(gifPath);

  // Check if outputs already exist
  const mp4Exists = fs.existsSync(mp4Path);
  const webmExists = fs.existsSync(webmPath);
  const posterExists = fs.existsSync(posterPath);

  if (!FORCE && mp4Exists && webmExists && posterExists) {
    console.log(`  ⏭️  Skipping (outputs exist): ${path.basename(gifPath)}`);
    return { mp4Size: 0, webmSize: 0, savings: 0 };
  }

  if (DRY_RUN) {
    console.log(`  🔄 Would convert: ${path.basename(gifPath)} (${gifSize.toFixed(2)}MB)`);
    return { mp4Size: 0, webmSize: 0, savings: 0 };
  }

  console.log(`  🔄 Converting: ${path.basename(gifPath)} (${gifSize.toFixed(2)}MB)...`);

  try {
    // MP4: H.264 with faststart for web
    // Scale filter pads odd dimensions to even (H.264 requirement)
    execSync(
      `ffmpeg -y -i "${gifPath}" ` +
      `-movflags +faststart -pix_fmt yuv420p ` +
      `-vf "fps=30,scale='if(eq(mod(iw,2),0),iw,iw+1)':'if(eq(mod(ih,2),0),ih,ih+1)':flags=lanczos" ` +
      `-c:v libx264 -crf 23 -preset medium ` +
      `"${mp4Path}"`,
      { stdio: 'pipe' }
    );

    // WebM: VP9 for better compression
    // Scale filter pads odd dimensions to even for consistency
    execSync(
      `ffmpeg -y -i "${gifPath}" ` +
      `-c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 ` +
      `-vf "fps=30,scale='if(eq(mod(iw,2),0),iw,iw+1)':'if(eq(mod(ih,2),0),ih,ih+1)':flags=lanczos" ` +
      `"${webmPath}"`,
      { stdio: 'pipe' }
    );

    // Poster: first frame as JPG
    execSync(
      `ffmpeg -y -i "${mp4Path}" ` +
      `-vf "select=eq(n\\,0)" -q:v 2 ` +
      `"${posterPath}"`,
      { stdio: 'pipe' }
    );

    const mp4Size = getFileSizeMB(mp4Path);
    const webmSize = getFileSizeMB(webmPath);
    const savings = ((gifSize - mp4Size) / gifSize) * 100;

    console.log(`    ✅ MP4: ${mp4Size.toFixed(2)}MB | WebM: ${webmSize.toFixed(2)}MB | Savings: ${savings.toFixed(1)}%`);

    return { mp4Size, webmSize, savings };
  } catch (error) {
    console.error(`    ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { mp4Size: 0, webmSize: 0, savings: 0 };
  }
}

// Main execution
function main(): void {
  console.log('🎬 GIF → Video Converter\n');

  if (!DRY_RUN) {
    checkFFmpeg();
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Images directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const gifs = findGifs(IMAGES_DIR);

  if (gifs.length === 0) {
    console.log('✅ No GIF files found');
    return;
  }

  console.log(`📊 Found ${gifs.length} GIF files\n`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  let totalOriginalSize = 0;
  let totalMp4Size = 0;
  let totalWebmSize = 0;
  let converted = 0;

  for (const gif of gifs) {
    const gifSize = getFileSizeMB(gif);
    totalOriginalSize += gifSize;

    const result = convertGif(gif);
    if (result.mp4Size > 0) {
      totalMp4Size += result.mp4Size;
      totalWebmSize += result.webmSize;
      converted++;
    }
  }

  if (!DRY_RUN && converted > 0) {
    const totalSavings = ((totalOriginalSize - totalMp4Size) / totalOriginalSize) * 100;
    console.log('\n📈 SUMMARY:');
    console.log(`   Original GIFs: ${totalOriginalSize.toFixed(2)}MB`);
    console.log(`   MP4 total:     ${totalMp4Size.toFixed(2)}MB`);
    console.log(`   WebM total:    ${totalWebmSize.toFixed(2)}MB`);
    console.log(`   Savings:       ${totalSavings.toFixed(1)}% (${(totalOriginalSize - totalMp4Size).toFixed(2)}MB)`);
    console.log(`   Files converted: ${converted}/${gifs.length}`);
  } else if (DRY_RUN) {
    console.log(`\n✅ Dry run complete. Run without --dry-run to convert ${gifs.length} files.`);
  }
}

main();
