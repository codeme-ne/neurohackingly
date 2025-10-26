import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

type Level = 'error' | 'warn';

interface Finding {
  file: string;
  message: string;
  level: Level;
}

const root = process.cwd();
const contentRoot = path.join(root, 'src', 'content');

const findings: Finding[] = [];
const slugMap = new Map<string, string[]>();

const now = new Date();

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.md' || ext === '.mdx') {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function record(level: Level, file: string, message: string) {
  findings.push({ level, file, message });
}

function relativeToRoot(file: string) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function relativeSlug(file: string) {
  const rel = path.relative(contentRoot, file).replace(/\\/g, '/');
  return rel.replace(/\.(md|mdx)$/i, '');
}

function validateTopics(topics: unknown, file: string) {
  if (topics === undefined || topics === null) return;
  if (!Array.isArray(topics)) {
    record('warn', file, '`topics` should be an array of strings.');
    return;
  }
  const invalid = topics.some((topic) => typeof topic !== 'string' || topic.trim().length === 0);
  if (invalid) {
    record('warn', file, '`topics` contains empty or non-string values.');
  }
}

function validateReadingTime(readingTime: unknown, file: string) {
  if (readingTime === undefined || readingTime === null) return;
  if (typeof readingTime !== 'number' || Number.isNaN(readingTime) || readingTime <= 0) {
    record('warn', file, '`readingTime` should be a positive number expressed in minutes.');
  }
}

async function run() {
  try {
    await fs.access(contentRoot);
  } catch {
    console.error('Content directory not found:', contentRoot);
    process.exit(1);
  }

  const files = await walk(contentRoot);

  for (const file of files) {
    const relFile = relativeToRoot(file);
    let data: Record<string, any>;

    try {
      const raw = await fs.readFile(file, 'utf8');
      ({ data } = matter(raw));
    } catch (error) {
      record('error', relFile, `Unable to parse frontmatter (${(error as Error).message}).`);
      continue;
    }

    const slug = relativeSlug(file);
    const existing = slugMap.get(slug) ?? [];
    existing.push(relFile);
    slugMap.set(slug, existing);

    const isPage = Boolean(data.page);
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    const description = typeof data.description === 'string' ? data.description.trim() : '';

    if (!title) {
      record('error', relFile, 'Missing required `title` field.');
    }
    if (!description) {
      record('error', relFile, 'Missing required `description` field.');
    }

    const pubDateRaw = data.pubDate;
    if (!pubDateRaw) {
      record('error', relFile, 'Missing required `pubDate` field.');
    } else {
      const pubDate = new Date(pubDateRaw);
      if (Number.isNaN(pubDate.valueOf())) {
        record('error', relFile, '`pubDate` is not a valid date.');
      } else if (pubDate > now && !data.draft) {
        record('warn', relFile, 'Future-dated entry should be marked `draft: true`.');
      }
    }

    const tags = Array.isArray(data.tags) ? data.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean) : [];
    if (!isPage && tags.length === 0) {
      record('warn', relFile, 'Add at least one tag to improve discovery.');
    }

    if (Array.isArray(data.tags)) {
      const hashPrefixed = data.tags.filter((tag: unknown) => typeof tag === 'string' && tag.startsWith('hash-'));
      if (hashPrefixed.length > 0) {
        record('warn', relFile, `Remove internal hash- tags from published content: ${hashPrefixed.join(', ')}.`);
      }
    }

    const hasHeroImage = Boolean(data.hero) || Boolean(data.image?.url);
    if (data.featured && !hasHeroImage) {
      record('warn', relFile, 'Featured entry should include a `hero` image or `image.url`.');
    }

    if (data.image && (!data.image.alt || !String(data.image.alt).trim())) {
      record('warn', relFile, 'Provide descriptive alt text for `image.alt`.');
    }

    validateTopics(data.topics, relFile);
    validateReadingTime(data.readingTime, relFile);
  }

  for (const [slug, filesWithSlug] of slugMap.entries()) {
    if (filesWithSlug.length > 1) {
      const list = filesWithSlug.join(', ');
      for (const file of filesWithSlug) {
        record('error', file, `Duplicate slug "${slug}" also used in: ${list}.`);
      }
    }
  }

  if (findings.length === 0) {
    console.log('✅ Content frontmatter looks great.');
    return;
  }

  const errorCount = findings.filter((finding) => finding.level === 'error').length;
  const warnCount = findings.length - errorCount;

  for (const finding of findings) {
    const label = finding.level === 'error' ? 'ERROR' : 'WARN';
    console.log(`[${label}] ${finding.file} — ${finding.message}`);
  }

  console.log(`\nSummary: ${errorCount} error(s), ${warnCount} warning(s).`);
  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('validate-content failed:', error);
  process.exit(1);
});
