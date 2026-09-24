// POST /session  — called by index.html immediately after a successful bcrypt login.
// Stores the session token in KV so /contacts can validate X-Admin-Token headers.
// This endpoint is only reachable from admin-bflsiber.pages.dev itself.

const CORS = {
  'Access-Control-Allow-Origin':  'https://admin-bflsiber.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (method === 'POST') {
    const origin = request.headers.get('Origin') || '';
    if (origin !== 'https://admin-bflsiber.pages.dev') {
      return json({ error: 'Forbidden' }, 403);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { token } = body;
    if (!token || typeof token !== 'string' || token.length < 32) {
      return json({ error: 'Invalid token' }, 400);
    }

    // Store with a 12-hour TTL — matches a reasonable session lifetime
    await env.CONTACTS.put('admin_session_token', token, { expirationTtl: 43200 });
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
