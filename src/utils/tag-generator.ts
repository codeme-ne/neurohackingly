import { HfInference } from '@huggingface/inference';
import fs from 'fs/promises';
import path from 'path';

// Initialize HF client - token is optional for public models
const hf = new HfInference(process.env.HUGGING_FACE_TOKEN);

const CACHE_PATH = path.resolve('.cache/tags.json');

// Predefined categories for consistent tagging
const CANDIDATE_TAGS = [
  'Productivity',
  'AI',
  'Technology',
  'Biohacking',
  'Health',
  'Mindfulness',
  'Philosophy',
  'Business',
  'Learning',
  'Writing',
  'Creativity',
  'Psychology',
  'Nutrition',
  'Fitness',
  'Meditation',
  'Focus',
  'Sleep',
  'Habits',
  'Tools',
  'Research'
];

type TagCache = {
  [key: string]: string[];
};

async function readCache(): Promise<TagCache> {
  try {
    const data = await fs.readFile(CACHE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeCache(cache: TagCache): Promise<void> {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

export async function generateTagsForPost(
  post: {
    slug: string;
    title: string;
    description?: string;
    content?: string;
  }
): Promise<string[]> {
  // Create cache key from title and description
  const cacheKey = `${post.slug}-${post.title}`;

  const cache = await readCache();
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  // For now, always use the fallback system
  // Later you can enable HF API by setting HUGGING_FACE_TOKEN in environment
  const tags = getFallbackTags(post.title + ' ' + (post.description || ''));

  // Cache the result
  cache[cacheKey] = tags;
  await writeCache(cache);

  return tags;
}

// Simple fallback tag generation based on keywords
function getFallbackTags(text: string): string[] {
  const lowercased = text.toLowerCase();
  const tags: string[] = [];

  const keywordMap: Record<string, string> = {
    'wim hof': 'Biohacking',
    'cold': 'Health',
    'breathing': 'Health',
    'ai': 'AI',
    'artificial': 'AI',
    'machine': 'AI',
    'coding': 'Technology',
    'code': 'Technology',
    'conference': 'Learning',
    'course': 'Learning',
    'productivity': 'Productivity',
    'productive': 'Productivity',
    'life os': 'Productivity',
    'ali abdaal': 'Productivity',
    'system': 'Productivity',
    'daily': 'Habits',
    'decision': 'Psychology',
    'power': 'Psychology',
    'focus': 'Focus',
    'target': 'Focus',
    'health': 'Health',
    'healthy': 'Health',
    'biohacking': 'Biohacking',
    'biohack': 'Biohacking',
    'meditation': 'Meditation',
    'mindfulness': 'Mindfulness',
    'sleep': 'Sleep',
    'nutrition': 'Nutrition',
    'fitness': 'Fitness',
    'exercise': 'Fitness',
    'habit': 'Habits',
    'routine': 'Habits',
    'writing': 'Writing',
    'creativity': 'Creativity',
    'creative': 'Creativity',
    'psychology': 'Psychology',
    'mental': 'Psychology',
    'feel': 'Psychology',
    'tool': 'Tools',
    'app': 'Tools',
    'software': 'Tools',
    'research': 'Research',
    'experiment': 'Research',
    'study': 'Research',
    'learn': 'Learning',
    'education': 'Learning',
    'business': 'Business',
    'entrepreneur': 'Business',
    'philosophy': 'Philosophy',
    'think': 'Philosophy',
    'reactive': 'Productivity',
    'proactive': 'Productivity',
    'pillar': 'Productivity',
    'design': 'Creativity',
    'perfect': 'Psychology',
    'insight': 'Learning',
    'coach': 'Learning',
    'screen': 'Technology',
    'figure': 'Health',
    'week': 'Productivity',
    'update': 'Technology'
  };

  // Check for keywords in order of priority
  for (const [keyword, tag] of Object.entries(keywordMap)) {
    if (lowercased.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
      if (tags.length >= 2) break;
    }
  }

  // If no tags found, add some generic ones based on common patterns
  if (tags.length === 0) {
    if (lowercased.includes('life') || lowercased.includes('daily')) {
      tags.push('Productivity');
    }
    if (lowercased.includes('experiment') || lowercased.includes('test')) {
      tags.push('Research');
    }
  }

  // Always ensure at least one tag
  if (tags.length === 0) {
    tags.push('Learning');
  }

  return tags.slice(0, 2); // Return max 2 tags
}