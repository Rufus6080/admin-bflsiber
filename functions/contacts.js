// functions/contacts.js

function ok(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  if (origin !== 'https://bflsiber.pages.dev') return err('Forbidden', 403);

  let body;
  try { body = await request.json(); }
  catch { return err('Invalid JSON', 400); }

  const { name, email, subject, message, date } = body;
  if (!name || !email || !message) return err('Missing required fields', 400);

  const existing = (await env.CONTACTS.get('entries', { type: 'json' })) || [];
  existing.unshift({
    id:      crypto.randomUUID(),
    name:    String(name).slice(0, 200),
    email:   String(email).slice(0, 200),
    subject: String(subject || 'other').slice(0, 200),
    message: String(message).slice(0, 5000),
    date:    date || new Date().toISOString(),
  });
  await env.CONTACTS.put('entries', JSON.stringify(existing));
  return ok({ ok: true }, 201);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!await isAuthorized(request, env)) return err('Unauthorized', 401);
  const entries = (await env.CONTACTS.get('entries', { type: 'json' })) || [];
  return ok(entries);
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!await isAuthorized(request, env)) return err('Unauthorized', 401);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return err('Missing id', 400);
  const entries = (await env.CONTACTS.get('entries', { type: 'json' })) || [];
  await env.CONTACTS.put('entries', JSON.stringify(entries.filter(e => e.id !== id)));
  return ok({ ok: true });
}

async function isAuthorized(request, env) {
  const token  = request.headers.get('X-Admin-Token') || '';
  if (!token) return false;
  const stored = await env.CONTACTS.get('admin_session_token');
  return !!stored && token === stored;
}
