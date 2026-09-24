const CORS = {
  'Access-Control-Allow-Origin':  'https://admin-bflsiber.pages.dev',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
};

// ── Check admin session token (sent as X-Admin-Token header by index.html) ──
// The token is a random hex string issued at login and stored in sessionStorage.
// The Function validates it against ADMIN_TOKEN stored in KV so nothing
// secret ever appears in a URL or query string.
async function isAuthorized(request, env) {
  const token = request.headers.get('X-Admin-Token') || '';
  if (!token) return false;
  const stored = await env.CONTACTS.get('admin_session_token');
  return stored && token === stored;
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // ── CORS preflight ──
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ── POST /contacts  — receive a submission from bflsiber contact form ──
  if (method === 'POST') {
    // Only allow from the public site
    const origin = request.headers.get('Origin') || '';
    if (origin !== 'https://bflsiber.pages.dev') {
      return json({ error: 'Forbidden' }, 403);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { name, email, subject, message, date } = body;
    if (!name || !email || !message) {
      return json({ error: 'Missing required fields' }, 400);
    }

    const existing = await env.CONTACTS.get('entries', { type: 'json' }) || [];
    existing.unshift({
      id:      crypto.randomUUID(),
      name:    String(name).slice(0, 200),
      email:   String(email).slice(0, 200),
      subject: String(subject || 'other').slice(0, 200),
      message: String(message).slice(0, 5000),
      date:    date || new Date().toISOString(),
    });
    await env.CONTACTS.put('entries', JSON.stringify(existing));
    return json({ ok: true }, 201);
  }

  // ── GET /contacts  — read all entries (admin only) ──
  if (method === 'GET') {
    if (!await isAuthorized(request, env)) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const entries = await env.CONTACTS.get('entries', { type: 'json' }) || [];
    return json(entries, 200);
  }

  // ── DELETE /contacts?id=UUID  — delete one entry (admin only) ──
  if (method === 'DELETE') {
    if (!await isAuthorized(request, env)) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ error: 'Missing id' }, 400);

    const entries = await env.CONTACTS.get('entries', { type: 'json' }) || [];
    const filtered = entries.filter(e => e.id !== id);
    await env.CONTACTS.put('entries', JSON.stringify(filtered));
    return json({ ok: true }, 200);
  }

  return json({ error: 'Method not allowed' }, 405);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
