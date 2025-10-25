import type { APIRoute } from 'astro';

const API_BASE = 'https://api.convertkit.com/v3';
const FORM_ID = import.meta.env.KIT_FORM_ID;
const TAG_ID = import.meta.env.KIT_TAG_ID;
const API_SECRET = import.meta.env.KIT_API_SECRET;
const API_KEY = import.meta.env.KIT_API_KEY;

const redirect = (status: string) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: `/newsletter${status ? `?status=${status}` : ''}`
    }
  });

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const POST: APIRoute = async ({ request }) => {
  try {
    const accepts = request.headers.get('accept') || '';
    const wantsJSON = /application\/json/i.test(accepts) || request.headers.get('x-requested-with') === 'fetch';
    const respond = (status: 'success' | 'already' | 'error', extra?: Record<string, unknown>) =>
      wantsJSON
        ? new Response(JSON.stringify({ status, ...(extra || {}) }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          })
        : redirect(status);

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
        console.warn('Rate limit hit for IP', ip);
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
      console.error('Missing ConvertKit env vars (FORM_ID/TAG_ID and API_SECRET or API_KEY).');
      return respond('error', { code: 500, error: 'Missing ConvertKit env vars (FORM_ID/TAG_ID and API_SECRET or API_KEY).' });
    }

    // Validate Form ID is numeric (common mistake: using data-uid instead of data-sv-form)
    if (FORM_ID && !/^\d+$/.test(FORM_ID)) {
      const msg = `Form ID must be numeric (found: ${FORM_ID}). Check data-sv-form in your Kit embed.`;
      console.error(msg);
      return respond('error', { code: 500, error: msg });
    }
    if (TAG_ID && !/^\d+$/.test(TAG_ID)) {
      const msg = `Tag ID must be numeric (found: ${TAG_ID}).`;
      console.error(msg);
      return respond('error', { code: 500, error: msg });
    }

    const url = FORM_ID
      ? `${API_BASE}/forms/${FORM_ID}/subscribe`
      : `${API_BASE}/tags/${TAG_ID}/subscribe`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        ...(API_SECRET ? { api_secret: API_SECRET } : { api_key: API_KEY }),
        email,
        first_name: name || undefined,
        // Optional custom fields for segmentation
        fields: source ? { source } : undefined
      })
    });

    if (response.ok) {
      return respond('success');
    }

    if (response.status === 422) {
      return respond('already');
    }

    let errorText = '';
    try {
      const maybeJson = await response.clone().json();
      errorText = (maybeJson && (maybeJson.message || maybeJson.error || JSON.stringify(maybeJson))) || '';
    } catch {}
    if (!errorText) {
      try { errorText = await response.text(); } catch {}
    }
    console.error('ConvertKit subscribe error', response.status, errorText);
    return respond('error', { code: response.status, error: errorText || 'Request to ConvertKit failed' });
  } catch (error) {
    console.error('Subscribe endpoint threw', error);
    return new Response(JSON.stringify({ status: 'error', error: 'Server error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
