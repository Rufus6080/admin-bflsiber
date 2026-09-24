// functions/session.js
// Called by index.html immediately after a successful bcrypt login.
// Stores the session token in KV so /contacts can validate X-Admin-Token headers.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://admin-bflsiber.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  if (origin !== 'https://admin-bflsiber.pages.dev') {
    return corsResponse(JSON.stringify({ error: 'Forbidden' }), 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400); }

  const { token } = body;
  if (!token || typeof token !== 'string' || token.length < 32) {
    return corsResponse(JSON.stringify({ error: 'Invalid token' }), 400);
  }

  // 12-hour TTL — reasonable admin session lifetime
  await env.CONTACTS.put('admin_session_token', token, { expirationTtl: 43200 });
  return corsResponse(JSON.stringify({ ok: true }), 200);
}
