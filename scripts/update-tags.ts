#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

type TagMapping = Record<string, string[]>;

// Canonical top-level tags for readers
const CORE_TAGS = new Set([
  'productivity',
  'study-techniques',
  'learning',
  'mindset',
  'nlp',
  'health-fitness',
  'self-experiment',
  'tools',
  'newsletter',
  'podcast',
  'life-design',
  'meta',
  'deutsch'
]);

// Explicit mapping from existing fine-grained tags to the new, smaller taxonomy.
// Only tags listed here will be changed; everything else is preserved as-is.
const TAG_MAP: TagMapping = {
  // Productivity
  'productivity-boost': ['productivity'],
  'produktivitats-community': ['productivity'],
  'produktivitats-gemeinschaft': ['productivity'],
  'produktivitats-platzerl': ['productivity'],
  'time-management': ['productivity'],
  'time-management-2': ['productivity'],
  'productive-self': ['productivity'],
  'productivitysystem': ['productivity'],
  'productivity-community': ['productivity'],
  'productivity-newsletter': ['productivity', 'newsletter'],
  'focus': ['productivity'],
  'focus-log-ali-abdaal': ['productivity'],
  'focusmusic': ['productivity'],
  'schedule-ali-abdaal': ['productivity'],

  // Study / learning
  studying: ['study-techniques'],
  study: ['study-techniques'],
  studytechniques: ['study-techniques'],
  'study-tips': ['study-techniques'],
  'study-hacks': ['study-techniques'],
  studytips: ['study-techniques'],
  studymethod: ['study-techniques'],
  studyingtechnique: ['study-techniques'],
  studyeffectively: ['study-techniques'],
  'study-problems': ['study-techniques'],
  startstudying: ['study-techniques'],
  'start-studying': ['study-techniques'],
  'studying-notes': ['study-techniques'],
  'studying-notion': ['study-techniques'],
  'revision-technique': ['study-techniques'],
  'post-exam': ['study-techniques'],
  'post-exam-reflection': ['study-techniques'],
  'post-exam-refection-questions': ['study-techniques'],
  'how-to-study': ['study-techniques'],
  theultimatestudyguide: ['study-techniques'],
  ultimatestudyguide: ['study-techniques'],
  'ultimate-life-guide': ['study-techniques'],
  studymethods: ['study-techniques'],
  'evidence-based-study-tips': ['study-techniques'],
  'evidence-based-study-hacks': ['study-techniques'],
  'active-recall-best-study-method': ['study-techniques'],

  learning: ['learning'],
  'learning-how-to-learn': ['learning'],
  metalearning: ['learning'],
  'a-mind-for-numbers': ['learning'],
  'make-it-stick': ['learning'],
  remembering: ['learning'],
  newinformation: ['learning'],

  // Mindset / practical psychology
  'practical-psychology': ['mindset'],
  stress: ['mindset'],
  ruminating: ['mindset'],
  'stop-ruminating': ['mindset'],
  'strategies-to-stop-ruminating': ['mindset'],
  setbacks: ['mindset'],
  resilience: ['mindset'],
  resiliencewall: ['mindset'],
  overwhelmed: ['mindset'],
  procrastination: ['mindset', 'productivity'],
  procrastinating: ['mindset', 'productivity'],
  'stop-procratinating': ['mindset', 'productivity'],
  'problems-are-great-opportunities-to-learn-and-grow': ['mindset'],
  'effective-ruminating-strategies': ['mindset'],
  'self-development': ['mindset'],
  selfdevelopment: ['mindset'],
  'personal-growth': ['mindset'],
  personalgrowth: ['mindset'],
  personaldevelopment: ['mindset'],
  perfectionism: ['mindset'],
  mindset: ['mindset'],
  excellent: ['mindset'],
  excellenttooutstanding: ['mindset'],
  outstanding: ['mindset'],
  'difficult-situations': ['mindset'],
  'hard-times': ['mindset'],
  'life-advice': ['mindset'],
  lifelessons: ['mindset'],
  'meaning-in-life': ['mindset'],
  'victor-frankl': ['mindset'],
  philosophy: ['mindset'],
  purpose: ['mindset'],

  // NLP / coaching
  nlp: ['nlp'],
  'nlp-self-help': ['nlp'],
  'nlp-self-development': ['nlp'],
  'nlp-coach': ['nlp'],
  'nlp-coaching': ['nlp'],
  nlpmaster: ['nlp'],
  'nlp-hypnosis': ['nlp'],
  'neuro-linguistic-programming': ['nlp'],
  'neuro-linguistic-programming-2': ['nlp'],
  'neuro-lingistic-programming': ['nlp'],
  'neurolinguistic-programming': ['nlp'],
  'self-nlp': ['nlp'],
  'self-coaching-tips': ['nlp'],
  'practical-coaching-advice': ['nlp'],
  coaching: ['nlp'],
  coachingtechniques: ['nlp'],
  coachingmethods: ['nlp'],
  hypnosis: ['nlp'],
  'hypnosis-tips': ['nlp'],

  // Health & fitness / biohacking
  healthandfitness: ['health-fitness'],
  'health-hacks': ['health-fitness'],
  'health-goals': ['health-fitness'],
  'measuring-health': ['health-fitness'],
  'measuring-health-2-0': ['health-fitness'],
  'measuring-health-3': ['health-fitness'],
  nutrition: ['health-fitness'],
  mealprep: ['health-fitness'],
  'skincare-bryan-johnson': ['health-fitness'],
  'skincare-nutrition': ['health-fitness'],
  'skincare-routine-blueprint-protocol': ['health-fitness'],
  'oral-health': ['health-fitness'],
  'oral-health-routine': ['health-fitness'],
  'oral-hygiene': ['health-fitness'],
  'oral-hygiene-routine': ['health-fitness'],
  'oral-routine': ['health-fitness'],
  sports: ['health-fitness'],
  running: ['health-fitness'],
  'running-like-forest-gump': ['health-fitness'],
  ironman: ['health-fitness'],
  'swimming-running-cycling': ['health-fitness'],
  'physical-activity': ['health-fitness'],
  cryotherapy: ['health-fitness'],
  'icespa-dusseldorf': ['health-fitness'],
  meditation: ['health-fitness'],
  'buddhist-meditation': ['health-fitness'],
  vipassana: ['health-fitness'],
  'vipassana-meditation': ['health-fitness'],
  'mental-health': ['health-fitness'],
  'healthier-and-happier-life': ['health-fitness'],
  'glucose-revolutionsimple-and-actionable-nutrition-hacks-i-was-amazed-by': ['health-fitness'],
  'optimizing-health-my-supplement-routine-unveiled': ['health-fitness'],

  // Self experiments / challenges
  'self-experiment': ['self-experiment'],
  '31daychallenge': ['self-experiment'],
  '20-day-journey': ['self-experiment'],
  'impossible-list': ['self-experiment'],
  'impossible-list-example': ['self-experiment'],
  'impossible-list-pdf': ['self-experiment'],
  'impossible-list-thomas-frank': ['self-experiment'],
  'my-impossible-list': ['self-experiment'],
  'challenge-21-surfing': ['self-experiment'],
  'run-seat-write': ['self-experiment'],
  'this-weeks-adventure': ['self-experiment'],
  unstress: ['self-experiment'],
  'daily-steps-to-self-mastery': ['self-experiment'],
  'ice-bathing-every-day-for-30-days': ['self-experiment', 'health-fitness'],

  // Tools / apps
  'tech-tools': ['tools'],
  notion: ['tools'],
  'notion-journaling': ['tools'],
  'best-personal-templates-notion': ['tools'],
  'using-notion-for-journaling': ['tools'],
  shortform: ['tools'],
  'shortform-app': ['tools'],
  'shortform-book-recommendations': ['tools'],
  'shortform-summaries': ['tools'],
  'shortform-discount': ['tools'],
  'shortform-vs-blinkist': ['tools'],
  'book-summary-websites': ['tools'],
  'book-summaries': ['tools'],
  'book-summary': ['tools'],
  'oura-ring-gen3': ['tools'],
  'oura-ring-3-review': ['tools'],
  gadgets: ['tools'],
  'ghost-cms': ['tools'],
  'ghost-org': ['tools'],

  // Newsletter / podcast
  newsletter: ['newsletter'],
  'coaching-newsletter': ['newsletter'],
  'peak-performance-newsletter': ['newsletter'],
  'productivity-newsletter': ['newsletter'],

  podcast: ['podcast'],
  'podcast-by-derek-sivers': ['podcast'],
  'what-is-wisdom-podcast': ['podcast'],
  'huberman-podcast': ['podcast'],
  'huberman-lab': ['podcast'],

  // Life design / journaling / reflection
  journaling: ['life-design'],
  'journaling-framework': ['life-design'],
  'questions-journaling': ['life-design'],
  'gratitude-journal': ['life-design'],
  'the-toilet-thankfulness-journal': ['life-design'],
  reflection: ['life-design'],
  'reflection-questions': ['life-design'],
  'weekly-review': ['life-design'],
  'weekly-review-workshop': ['life-design'],
  'weekly-review-workshop-structure': ['life-design'],
  'weekly-wins': ['life-design'],
  'planning': ['life-design'],
  'planning-is-everything': ['life-design'],

  // Meta / site
  about: ['meta'],
  'about-me-neurohackingly': ['meta'],
  'about-neurohackingly': ['meta'],
  'about-page-neurohackingly': ['meta'],
  home: ['meta'],
  neurohackingly: ['meta'],
  topics: ['meta'],
  members: ['meta'],
  memberships: ['meta'],
  other: ['meta'],

  // Language
  deutsch: ['deutsch']
};

type Mode = 'dry-run' | 'write';

interface TagUpdate {
  file: string;
  slug: string;
  oldVisible: string[];
  newVisible: string[];
  hashTags: string[];
  unmapped: string[];
  suggestionsForEmpty: string[];
  changed: boolean;
}

function parseArgs(argv: string[]): { mode: Mode; filter?: string } {
  let mode: Mode = 'dry-run';
  let filter: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write') mode = 'write';
    else if (a === '--dry-run') mode = 'dry-run';
    else if (a.startsWith('--filter=')) {
      filter = a.slice('--filter='.length);
    }
  }

  return { mode, filter };
}

function normalizeTag(tag: string): string {
  return tag.trim();
}

function splitTags(tags: string[]): { hashTags: string[]; visibleTags: string[] } {
  const hashTags: string[] = [];
  const visibleTags: string[] = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    if (tag.toLowerCase().startsWith('hash-')) hashTags.push(tag);
    else visibleTags.push(tag);
  }
  return { hashTags, visibleTags };
}

function mapVisibleTags(visibleTags: string[]): { mapped: string[]; unmapped: string[] } {
  const mappedSet = new Set<string>();
  const unmapped: string[] = [];

  for (const raw of visibleTags) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    const mapping = TAG_MAP[tag];
    if (mapping && mapping.length > 0) {
      for (const m of mapping) {
        mappedSet.add(m);
      }
    } else if (CORE_TAGS.has(tag)) {
      mappedSet.add(tag);
    } else if (tag === 'newsletter' || tag === 'podcast' || tag === 'deutsch') {
      mappedSet.add(tag);
    } else {
      unmapped.push(tag);
    }
  }

  return {
    mapped: Array.from(mappedSet),
    unmapped
  };
}

function suggestTagsFromSlug(slug: string): string[] {
  const s = slug.toLowerCase();
  const out: string[] = [];
  const add = (t: string) => {
    if (!out.includes(t)) out.push(t);
  };

  if (s.includes('study') || s.includes('exam') || s.includes('learn')) {
    add('study-techniques');
  }
  if (
    s.includes('productivity') ||
    s.includes('time-management') ||
    s.includes('time-of-your-life') ||
    s.includes('routine') ||
    s.includes('focus')
  ) {
    add('productivity');
  }
  if (s.includes('nlp') || s.includes('hypnosis')) {
    add('nlp');
  }
  if (
    s.includes('meditation') ||
    s.includes('wim-hof') ||
    s.includes('ice-bathing') ||
    s.includes('cryo') ||
    s.includes('health') ||
    s.includes('triathlon') ||
    s.includes('ironman') ||
    s.includes('marathon') ||
    s.includes('skincare') ||
    s.includes('supplement')
  ) {
    add('health-fitness');
  }
  if (
    s.includes('challenge') ||
    s.includes('impossible') ||
    s.includes('30-days') ||
    s.includes('30-day') ||
    s.includes('21-day') ||
    s.includes('21-surfing') ||
    s.includes('80-days')
  ) {
    add('self-experiment');
  }
  if (s.includes('newsletter') || s.includes('weekly-review') || s.includes('weekly-wins')) {
    add('newsletter');
  }
  if (s.includes('podcast')) {
    add('podcast');
  }
  if (s.includes('journal') || s.includes('reflection') || s.includes('review')) {
    add('life-design');
  }
  if (
    s.includes('app') ||
    s.includes('notion') ||
    s.includes('shortform') ||
    s.includes('tool') ||
    s.includes('oura-ring') ||
    s.includes('oura')
  ) {
    add('tools');
  }

  return out;
}

function areArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function processFile(file: string): TagUpdate {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data as any;

  const slug = path.basename(file, '.mdx');

  let tags: unknown = data.tags;
  let flatTags: string[] = [];

  if (Array.isArray(tags)) {
    flatTags = tags.map(String);
  } else if (typeof tags === 'string' && tags.trim() !== '') {
    flatTags = [tags.trim()];
  } else {
    flatTags = [];
  }

  const { hashTags, visibleTags } = splitTags(flatTags);
  const { mapped, unmapped } = mapVisibleTags(visibleTags);

  const newVisible = [...mapped, ...unmapped];
  const newAll = [...hashTags, ...newVisible];

  const suggestionsForEmpty =
    visibleTags.length === 0 && newVisible.length === 0 ? suggestTagsFromSlug(slug) : [];

  const changed = !areArraysEqual(flatTags, newAll);

  return {
    file,
    slug,
    oldVisible: visibleTags,
    newVisible,
    hashTags,
    unmapped,
    suggestionsForEmpty,
    changed
  };
}

async function main() {
  const { mode, filter } = parseArgs(process.argv);
  const files = await glob('src/content/blog/**/*.mdx');

  const updates: TagUpdate[] = [];

  for (const file of files) {
    const slug = path.basename(file, '.mdx');
    if (filter && !slug.includes(filter)) continue;
    updates.push(processFile(file));
  }

  let changedCount = 0;
  let emptyCount = 0;

  for (const u of updates) {
    if (u.oldVisible.length === 0 && u.newVisible.length === 0) {
      emptyCount++;
    }
    if (!u.changed) continue;
    changedCount++;
  }

  if (mode === 'dry-run') {
    console.log('🔍 Tag update dry run\n');
    for (const u of updates) {
      const rel = path.relative(process.cwd(), u.file);
      if (u.oldVisible.length === 0 && u.newVisible.length === 0 && u.suggestionsForEmpty.length === 0) {
        continue;
      }

      console.log(`• ${rel}`);
      console.log(`  slug: ${u.slug}`);
      console.log(`  hash tags: ${u.hashTags.join(', ') || '(none)'}`);
      console.log(`  visible tags: ${u.oldVisible.join(', ') || '(none)'}`);
      console.log(`  -> new visible: ${u.newVisible.join(', ') || '(none)'}`);
      if (u.unmapped.length > 0) {
        console.log(`  unmapped (kept as-is): ${u.unmapped.join(', ')}`);
      }
      if (u.suggestionsForEmpty.length > 0) {
        console.log(`  suggestions for empty tags: ${u.suggestionsForEmpty.join(', ')}`);
      }
      console.log('');
    }

    console.log(`Summary:`);
    console.log(`  Files scanned: ${updates.length}`);
    console.log(`  Files with tag changes (if --write): ${changedCount}`);
    console.log(`  Files with no visible tags: ${emptyCount}`);
    return;
  }

  // Write mode: apply mapping but keep unmapped tags untouched.
  let actuallyUpdated = 0;
  for (const u of updates) {
    if (!u.changed) continue;
    const raw = fs.readFileSync(u.file, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data as any;

    const newTags = [...u.hashTags, ...u.newVisible];
    data.tags = newTags;

    const next = matter.stringify(parsed.content, data);
    fs.writeFileSync(u.file, next, 'utf8');
    actuallyUpdated++;
    console.log(`✅ Updated tags in ${path.relative(process.cwd(), u.file)}`);
  }

  console.log(`\nDone. Updated ${actuallyUpdated} file${actuallyUpdated === 1 ? '' : 's'}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

