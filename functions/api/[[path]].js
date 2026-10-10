// SQUID☆STAR data API — Cloudflare Pages Function backed by a D1 database bound as `DB`.
// Owner-only collections need the ADMIN_KEY secret; guestbook/visitors can be written by any visitor (own doc only).
const OWNER = new Set(['room', 'diary', 'reviews']);
const OPEN = new Set(['guestbook', 'visitors']);
const LIMIT = { reviews: 60000, diary: 4000, room: 2000, guestbook: 6000, visitors: 200 };
let ready = false;

const J = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

function same(a, b) {
  if (a.length !== b.length) return false;
  let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
const isAdmin = (req, env) => {
  const k = req.headers.get('x-admin-key') || '';
  return !!env.ADMIN_KEY && k.length > 0 && same(k, env.ADMIN_KEY);
};
const str = (v, n) => String(v ?? '').slice(0, n);

export async function onRequest({ request, env, params }) {
  if (!env.DB) return J({ error: 'D1 database is not bound as DB' }, 500);
  if (!ready) {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (col, id))').run();
    ready = true;
  }
  const seg = [].concat(params.path || []);
  const m = request.method;
  const admin = isAdmin(request, env);

  if (seg[0] === 'auth') return J({ ok: admin });

  const [kind, col, id] = seg;
  if (!OWNER.has(col) && !OPEN.has(col)) return J({ error: 'unknown collection' }, 404);

  if (kind === 'c' && m === 'GET') {
    if (col === 'visitors') {
      const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM docs WHERE col = ?').bind(col).first();
      return J({ docs: [], size: r ? r.n : 0 });
    }
    const { results } = await env.DB.prepare('SELECT id, data FROM docs WHERE col = ? ORDER BY updated DESC LIMIT 500').bind(col).all();
    // guestbook doc ids are visitor ids — never hand them out
    const docs = results.map((r, i) => ({ id: col === 'guestbook' && !admin ? 'g' + i : r.id, data: JSON.parse(r.data) }));
    return J({ docs, size: docs.length });
  }

  if (kind !== 'd' || !id || !/^[\w.-]{1,80}$/.test(id)) return J({ error: 'bad request' }, 400);

  if (m === 'GET') {
    if (col === 'guestbook' && !admin && request.headers.get('x-uid') !== id) return J({ data: null });
    const r = await env.DB.prepare('SELECT data FROM docs WHERE col = ? AND id = ?').bind(col, id).first();
    return J({ data: r ? JSON.parse(r.data) : null });
  }

  if (m === 'DELETE') {
    if (!admin) return J({ error: 'forbidden' }, 403);
    await env.DB.prepare('DELETE FROM docs WHERE col = ? AND id = ?').bind(col, id).run();
    return J({ ok: true });
  }

  if (m === 'PUT') {
    if (OWNER.has(col) && !admin) return J({ error: 'forbidden' }, 403);
    if (OPEN.has(col) && !admin && request.headers.get('x-uid') !== id) return J({ error: 'forbidden' }, 403);
    const text = await request.text();
    if (text.length > LIMIT[col]) return J({ error: 'too large' }, 413);
    let data; try { data = JSON.parse(text); } catch (e) { return J({ error: 'bad json' }, 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return J({ error: 'bad data' }, 400);

    if (!admin && col === 'visitors') data = { first: Date.now() };
    if (!admin && col === 'guestbook') {
      const entries = (Array.isArray(data.entries) ? data.entries : []).slice(-20)
        .map(e => ({ name: str(e && e.name, 16) || '名無しさん', text: str(e && e.text, 140), ts: Number(e && e.ts) || Date.now() }))
        .filter(e => e.text.trim());
      data = { entries, updated: Date.now() };
    }
    await env.DB.prepare('INSERT INTO docs (col, id, data, updated) VALUES (?, ?, ?, ?) ON CONFLICT (col, id) DO UPDATE SET data = excluded.data, updated = excluded.updated')
      .bind(col, id, JSON.stringify(data), Date.now()).run();
    return J({ ok: true });
  }

  return J({ error: 'method not allowed' }, 405);
}
