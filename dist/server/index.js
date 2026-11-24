export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const announcements = url.pathname === '/api/announcements';
    if (!announcements && url.pathname !== '/api/waitlist') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return new Response(null, {status: 405, headers: {Allow: 'POST'}});
    if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return new Response(null, {status: 403});
    const form = await request.formData().catch(() => null);
    const name = String(form?.get('name') || '').trim();
    const email = String(form?.get('email') || '').trim().toLowerCase();
    if ((!announcements && (!name || name.length > 100)) || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ok: false}, {status: 400});
    const finish = form?.get('finish') || null;
    if (!announcements && finish !== null && !['steel', 'bronze'].includes(finish)) return Response.json({ok: false}, {status: 400});
    if (announcements) {
      await env.DB.prepare('INSERT INTO announcements (email, consent_at) VALUES (?, ?) ON CONFLICT(email) DO NOTHING')
        .bind(email, new Date().toISOString()).run();
    } else {
      await env.DB.prepare('INSERT INTO signups (email, name, interest, consent_at, finish) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET finish = COALESCE(excluded.finish, signups.finish)')
        .bind(email, name, 'waitlist', new Date().toISOString(), finish).run();
    }
    return Response.json({ok: true});
  }
};
