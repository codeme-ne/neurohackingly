import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';

const API_BASE = 'https://api.convertkit.com/v3';
const importMetaEnv = import.meta.env as Record<string, string | undefined>;

const readEnv = (key: string): string | undefined => {
  const value = getSecret(key) ?? process.env[key] ?? importMetaEnv[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const FORM_ID = readEnv('KIT_FORM_ID');
const TAG_ID = readEnv('KIT_TAG_ID');
const API_SECRET = readEnv('KIT_API_SECRET');
const API_KEY = readEnv('KIT_API_KEY');

const logError = (message: string, detail?: Record<string, unknown>) => {
  if (detail) {
    console.error(`[newsletter] ${message}`, detail);
  } else {
    console.error(`[newsletter] ${message}`);
  }
};

const collectMessages = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') return [];
  const messages: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) messages.push(value.trim());
  };
  const record = payload as Record<string, unknown>;
  push(record.error);
  push(record.message);
  if (Array.isArray(record.errors)) {
    for (const entry of record.errors) {
      if (!entry) continue;
      if (typeof entry === 'string') {
        push(entry);
        continue;
      }
      if (typeof entry === 'object') {
        const item = entry as Record<string, unknown>;
        push(item.error);
        push(item.message);
      }
    }
  }
  if (Array.isArray(record.messages)) {
    for (const text of record.messages) {
      if (typeof text === 'string') push(text);
    }
  }
  return messages;
};

const isAlreadySubscribed = (payload: unknown): boolean => {
  return collectMessages(payload).some((message) => /already/i.test(message));
};

const parseJSON = async (response: Response) => {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
};

const redirect = (status: string) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: `/newsletter${status ? `?status=${status}` : ''}`
    }
  });

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const POST: APIRoute = async ({ request }) => {
  const accepts = request.headers.get('accept') || '';
  const wantsJSON = /application\/json/i.test(accepts) || request.headers.get('x-requested-with') === 'fetch';
  const respond = (status: 'success' | 'already' | 'error', extra?: Record<string, unknown>) =>
    wantsJSON
      ? new Response(JSON.stringify({ status, ...(extra || {}) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        })
      : redirect(status);

  try {

    // Basic in-memory rate limit (per warm instance): 5 req/min/IP
    const ip = (() => {
      const xff = request.headers.get('x-forwarded-for');
      if (xff) return xff.split(',')[0].trim();
      const xrip = request.headers.get('x-real-ip');
      return xrip || 'unknown';
    })();

    const now = Date.now();
    const windowMs = 60_000;
    const maxHits = 5;
    // @ts-ignore - keep module-level map attached to globalThis for warm instances
    const store: Map<string, { count: number; reset: number }> = (globalThis as any).__subRate__ || new Map();
    (globalThis as any).__subRate__ = store;
    const cur = store.get(ip);
    if (!cur || now > cur.reset) {
      store.set(ip, { count: 1, reset: now + windowMs });
    } else {
      cur.count += 1;
      store.set(ip, cur);
      if (cur.count > maxHits) {
        return respond('error');
      }
    }

    const formData = await request.formData();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const name = String(formData.get('name') ?? '').trim();
    const website = String(formData.get('website') ?? '').trim(); // honeypot
    const source = String(formData.get('source') ?? '').trim();

    if (!isValidEmail(email) || website) {
      return respond('error');
    }

    if ((!FORM_ID && !TAG_ID) || (!API_SECRET && !API_KEY)) {
      logError('Service configuration error', {
        hasFormId: Boolean(FORM_ID),
        hasTagId: Boolean(TAG_ID),
        hasApiKey: Boolean(API_KEY),
        hasApiSecret: Boolean(API_SECRET)
      });
      return respond('error', { code: 500, error: 'Service configuration error' });
    }

    // Validate Form ID is numeric
    if (FORM_ID && !/^\d+$/.test(FORM_ID)) {
      logError('Invalid ConvertKit form id', { formId: FORM_ID });
      return respond('error', { code: 500, error: 'Service configuration error' });
    }
    if (TAG_ID && !/^\d+$/.test(TAG_ID)) {
      logError('Invalid ConvertKit tag id', { tagId: TAG_ID });
      return respond('error', { code: 500, error: 'Service configuration error' });
    }

    const url = FORM_ID
      ? `${API_BASE}/forms/${FORM_ID}/subscribe`
      : `${API_BASE}/tags/${TAG_ID}/subscribe`;

    const authPayload = API_KEY ? { api_key: API_KEY } : { api_secret: API_SECRET as string };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        ...authPayload,
        email,
        first_name: name || undefined,
        // Optional custom fields for segmentation
        fields: source ? { source } : undefined
      })
    });

    if (response.ok) {
      return respond('success');
    }

    const payload = await parseJSON(response);
    const messages = collectMessages(payload);

    if (response.status === 422 || isAlreadySubscribed(payload)) {
      return respond('already');
    }

    logError('ConvertKit subscription request failed', {
      status: response.status,
      message: messages[0] || undefined
    });

    return respond('error', {
      code: response.status,
      error: messages[0] || 'Subscription request failed'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logError('Unexpected error while handling subscription', { message });
    return respond('error', { code: 500, error: 'Server error' });
  }
};
