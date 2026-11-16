// ═══════════════════════════════════════════════════════════
// TikTok: Foto als ENTWURF in die TikTok-Inbox schicken (Content Posting API, MEDIA_UPLOAD).
// In der TikTok-App kommt eine Nachricht, dort Musik dazu und selbst posten (24 Stunden Zeit).
// Anmeldung einmalig über TikTok (Login Kit, Berechtigungen user.info.basic + video.upload).
// TikTok holt das Bild selbst über den Link ab → der Link-Anfang muss im TikTok-Entwicklerportal
// bestätigt sein (Bestätigungsdatei liefert dieser Worker aus, siehe TIKTOK_PRUEFDATEI).
// Cloudflare: TIKTOK_CLIENT_KEY (Text) + TIKTOK_CLIENT_SECRET (Secret)
//             TIKTOK_PRUEFDATEI (Text, Dateiname) + TIKTOK_PRUEFINHALT (Text, Inhalt der Datei)
// ═══════════════════════════════════════════════════════════
const API = 'https://open.tiktokapis.com/v2';

export const ttEingerichtet = env => !!(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET);
export const ttRueckweg = env => env.ORIGIN + '/oauth/tiktok';

export function ttAnmeldeLink(env, state) {
  const q = new URLSearchParams({ client_key: env.TIKTOK_CLIENT_KEY, scope: 'user.info.basic,video.upload', response_type: 'code', redirect_uri: ttRueckweg(env), state });
  return 'https://www.tiktok.com/v2/auth/authorize/?' + q;
}

async function tokenAnfrage(env, felder) {
  const r = await fetch(API + '/oauth/token/', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({ client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET, ...felder })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error('TikTok: ' + (d.error_description || d.error || r.status));
  const jetzt = Date.now();
  return { access: d.access_token, refresh: d.refresh_token, openId: d.open_id || '', ablauf: jetzt + (d.expires_in || 86400) * 1000 - 120000, refreshAblauf: jetzt + (d.refresh_expires_in || 31536000) * 1000 };
}
export const ttCodeTauschen = (env, code) => tokenAnfrage(env, { code, grant_type: 'authorization_code', redirect_uri: ttRueckweg(env) });

// Gültigen Zugang holen (TikTok-Zugänge gelten 24 Stunden, werden hier erneuert)
export async function ttZugang(env, s) {
  const t = await s.lies('tt:token');
  if (!t || !t.refresh) throw new Error('TikTok ist nicht verbunden.');
  if (t.access && t.ablauf > Date.now()) return t.access;
  const neu = { ...t, ...(await tokenAnfrage(env, { grant_type: 'refresh_token', refresh_token: t.refresh })) };
  await s.schreib('tt:token', neu);
  return neu.access;
}

async function tt(zugang, pfad, json) {
  const r = await fetch(API + pfad, {
    method: json ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + zugang, 'Content-Type': 'application/json; charset=UTF-8' },
    body: json ? JSON.stringify(json) : undefined
  });
  const d = await r.json().catch(() => ({}));
  const e = d.error || {};
  if (!r.ok || (e.code && e.code !== 'ok')) throw new Error('TikTok: ' + (e.message || e.code || r.status));
  return d.data || {};
}

export async function ttKonto(zugang) {
  const d = await tt(zugang, '/user/info/?fields=open_id,display_name,avatar_url');
  return { name: (d.user && d.user.display_name) || '' };
}

// Foto als Entwurf in die TikTok-Inbox
export async function ttEntwurf(zugang, bildUrl, titel, text) {
  const d = await tt(zugang, '/post/publish/content/init/', {
    post_info: { title: String(titel || '').slice(0, 90), description: String(text || '').slice(0, 4000) },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [bildUrl] },
    post_mode: 'MEDIA_UPLOAD', media_type: 'PHOTO'
  });
  return d.publish_id || '';
}
