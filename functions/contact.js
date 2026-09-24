const CORS = {
  'Access-Control-Allow-Origin':  'https://bflsiber.pages.dev',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // ── CORS preflight ──
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ── POST /contacts  — receive a new submission ──
  if (method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const { name, email, subject, message, date } = body;
    if (!name || !email || !message) {
      return json({ error: 'Missing required fields' }, 400);
    }

    // Load existing entries
    const existing = await env.CONTACTS.get('entries', { type: 'json' }) || [];

    const entry = {
      id:      crypto.randomUUID(),
      name:    String(name).slice(0, 200),
      email:   String(email).slice(0, 200),
      subject: String(subject || 'other').slice(0, 200),
      message: String(message).slice(0, 5000),
      date:    date || new Date().toISOString(),
    };

    existing.unshift(entry);          // newest first
    await env.CONTACTS.put('entries', JSON.stringify(existing));

    return json({ ok: true }, 201);
  }

  // ── GET /contacts  — read all submissions (admin only) ──
  if (method === 'GET') {
    // Simple token check via query param: ?token=YOUR_SECRET
    const url     = new URL(request.url);
    const token   = url.searchParams.get('token');
    const secret  = env.ADMIN_TOKEN;

    if (!secret || token !== secret) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const entries = await env.CONTACTS.get('entries', { type: 'json' }) || [];
    return json(entries, 200);
  }

  return json({ error: 'Method not allowed' }, 405);
}

// ── DELETE /contacts?token=X&id=Y ──
// (called from admin-bflsiber's index.html to delete one entry)
export async function onRequestDelete(context) {
  const { request, env } = context;
  const url    = new URL(request.url);
  const token  = url.searchParams.get('token');
  const id     = url.searchParams.get('id');

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!id) return json({ error: 'Missing id' }, 400);

  const entries = await env.CONTACTS.get('entries', { type: 'json' }) || [];
  const filtered = entries.filter(e => e.id !== id);
  await env.CONTACTS.put('entries', JSON.stringify(filtered));
  return json({ ok: true }, 200);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
