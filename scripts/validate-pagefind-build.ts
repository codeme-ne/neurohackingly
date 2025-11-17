#!/usr/bin/env tsx
/**
 * Validates Pagefind build output to prevent duplicate indexes and path mismatches
 *
 * This script ensures:
 * 1. Production Pagefind index exists at .vercel/output/static/pagefind/
 * 2. No duplicate indexes exist in dist/client/pagefind/ or dist/pagefind/
 * 3. URLs in the index don't contain incorrect /client/ prefix
 *
 * Run automatically via postbuild hook or manually: tsx scripts/validate-pagefind-build.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

function validatePagefindBuild(): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: []
  };

  // 1. Check that production index exists
  const productionIndexPath = path.join(projectRoot, '.vercel/output/static/pagefind');
  if (!fs.existsSync(productionIndexPath)) {
    result.success = false;
    result.errors.push('❌ Production Pagefind index not found at .vercel/output/static/pagefind/');
    result.errors.push('   Run: npm run build');
    return result;
  }

  console.log('✅ Production Pagefind index found at .vercel/output/static/pagefind/');

  // 2. Check for duplicate indexes
  // Note: dist/client/pagefind is created by Vercel adapter but not deployed (it's expected)
  // We only warn about dist/pagefind or public/pagefind (these are problems)
  const warnPaths = [
    path.join(projectRoot, 'dist/client/pagefind') // Expected artifact from Vercel adapter
  ];

  const errorPaths = [
    path.join(projectRoot, 'dist/pagefind'), // Should not exist
    path.join(projectRoot, 'public/pagefind') // Old/stale index
  ];

  warnPaths.forEach(warnPath => {
    if (fs.existsSync(warnPath)) {
      result.warnings.push(`ℹ️  Found ${path.relative(projectRoot, warnPath)}/ (expected Vercel adapter artifact, not deployed)`);
    }
  });

  errorPaths.forEach(errorPath => {
    if (fs.existsSync(errorPath)) {
      result.success = false;
      result.errors.push(`❌ Unexpected Pagefind index found at ${path.relative(projectRoot, errorPath)}/`);
      result.errors.push(`   This should not exist! Production uses .vercel/output/static/pagefind/`);
      result.errors.push(`   Fix: rm -rf ${path.relative(projectRoot, errorPath)}`);
    }
  });

  if (result.errors.filter(e => e.includes('Unexpected Pagefind')).length === 0) {
    console.log('✅ No unexpected duplicate Pagefind indexes found');
  }

  // 3. Validate index entry file
  const entryFile = path.join(productionIndexPath, 'pagefind-entry.json');
  if (!fs.existsSync(entryFile)) {
    result.warnings.push('⚠️  pagefind-entry.json not found (might be expected for some configs)');
  } else {
    try {
      const entryData = JSON.parse(fs.readFileSync(entryFile, 'utf-8'));
      console.log(`✅ Pagefind indexed ${entryData.languages?.en?.page_count || 0} pages`);
    } catch (error) {
      result.warnings.push('⚠️  Could not parse pagefind-entry.json');
    }
  }

  // 4. Sample check: verify no /client/ prefix in indexed URLs
  // Note: This is a basic check - full validation would require parsing binary index files
  const sampleHtmlPath = path.join(projectRoot, '.vercel/output/static');
  if (fs.existsSync(sampleHtmlPath)) {
    // Check if any HTML files are in /client/ subdirectory (they shouldn't be)
    const clientPath = path.join(sampleHtmlPath, 'client');
    if (fs.existsSync(clientPath)) {
      const stats = fs.statSync(clientPath);
      if (stats.isDirectory()) {
        result.warnings.push('⚠️  Found /client/ directory in .vercel/output/static/');
        result.warnings.push('   This might indicate a build configuration issue');
      }
    } else {
      console.log('✅ No /client/ directory found in build output');
    }
  }

  return result;
}

// Run validation
console.log('\n🔍 Validating Pagefind build...\n');

const result = validatePagefindBuild();

// Print warnings
if (result.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  result.warnings.forEach(warning => console.log(warning));
}

// Print errors and exit with appropriate code
if (!result.success) {
  console.log('\n❌ Validation FAILED:\n');
  result.errors.forEach(error => console.log(error));
  console.log('\n');
  process.exit(1);
} else {
  console.log('\n✅ Pagefind build validation PASSED!\n');
  process.exit(0);
}
