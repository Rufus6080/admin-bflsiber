// functions/session.js

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  if (origin !== 'https://admin-bflsiber.pages.dev') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await request.json(); }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { token } = body;
  if (!token || typeof token !== 'string' || token.length < 32) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.CONTACTS.put('admin_session_token', token, { expirationTtl: 43200 });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
