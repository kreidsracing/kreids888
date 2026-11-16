// ═══════════════════════════════════════════════════════════
// Instagram API · Container anlegen → Status FINISHED abwarten → veröffentlichen.
// Funktioniert mit beiden Token-Arten aus dem Meta-Dashboard:
//   • Instagram-Token (beginnt mit „IG…“)  → graph.instagram.com
//   • Facebook-/Systemnutzer-Token („EAA…“, Unified Login) → graph.facebook.com
// Feed: Bild + Text. Story: Bild, Streamer per user_tags markiert
// (Link-Sticker gibt es über die API nicht).
// ═══════════════════════════════════════════════════════════
const V = 'v25.0';
const warte = ms => new Promise(r => setTimeout(r, ms));
const istIg = token => /^IG/i.test(String(token || ''));
const host = token => (istIg(token) ? 'https://graph.instagram.com/' : 'https://graph.facebook.com/') + V;

async function ig(url, opts) {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) {
    const e = d.error || {};
    throw new Error(e.error_user_msg || e.message || `Instagram-Fehler ${r.status}`);
  }
  return d;
}
const q = token => `access_token=${encodeURIComponent(token)}`;

// Konto finden: { user_id, username }
export async function konto(token, uidVorgabe) {
  const H = host(token);
  if (uidVorgabe) {
    const d = await ig(`${H}/${uidVorgabe}?fields=id,username&${q(token)}`);
    return { user_id: d.id || uidVorgabe, username: d.username || '' };
  }
  if (istIg(token)) {
    const d = await ig(`${H}/me?fields=user_id,username&${q(token)}`);
    return { user_id: d.user_id || d.id, username: d.username || '' };
  }
  // Facebook-Token: über die Seiten das verknüpfte Instagram-Konto suchen, sonst /me probieren
  try {
    const s = await ig(`${H}/me/accounts?fields=instagram_business_account{id,username}&limit=50&${q(token)}`);
    const t = (s.data || []).map(x => x.instagram_business_account).find(Boolean);
    if (t) return { user_id: t.id, username: t.username || '' };
  } catch (e) { /* weiter mit /me */ }
  // Systemnutzer-Token ohne Facebook-Seite: Konto-ID muss als IG_USER_ID in Cloudflare stehen
  const d = await ig(`${H}/me?fields=id,username&${q(token)}`).catch(() => ({}));
  if (!d.username) throw new Error('Instagram-Konto-ID fehlt: bitte IG_USER_ID in Cloudflare eintragen (Zahl unter dem Konto in der Meta-App).');
  return { user_id: d.id, username: d.username };
}

// videoUrl: Video-Post (Story → STORIES, Feed → REELS); dann dauert die Verarbeitung länger
export async function posten({ token, uid, bildUrl, videoUrl, typ, text, tags, kiHinweis }) {
  const H = host(token);
  const p = new URLSearchParams({ access_token: token });
  if (videoUrl) p.set('video_url', videoUrl); else p.set('image_url', bildUrl);
  if (typ === 'story') {
    p.set('media_type', 'STORIES');
    if (tags && tags.length) p.set('user_tags', JSON.stringify(tags.map(u => ({ username: u, x: 0.5, y: 0.82 }))));
  } else {
    p.set('caption', text || '');
    if (videoUrl) { p.set('media_type', 'REELS'); p.set('share_to_feed', 'true'); }
  }
  if (kiHinweis) p.set('is_ai_generated', 'true');
  const c = await ig(`${H}/${uid}/media`, { method: 'POST', body: p });
  for (let i = 0; i < (videoUrl ? 70 : 12); i++) {
    const s = await ig(`${H}/${c.id}?fields=status_code&${q(token)}`);
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram konnte das Bild nicht verarbeiten (${s.status_code}).`);
    await warte(2500);
  }
  const pub = await ig(`${H}/${uid}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: c.id, access_token: token }) });
  return pub.id;
}

// Gibt es den Post auf Instagram wirklich? → { id, typ, link, zeit }
export async function pruefen(token, mediaId) {
  const d = await ig(`${host(token)}/${mediaId}?fields=id,media_type,media_product_type,permalink,timestamp&${q(token)}`);
  return { id: d.id, typ: d.media_product_type || d.media_type || '', link: d.permalink || '', zeit: d.timestamp || '' };
}

// Nur Instagram-Token (60 Tage) lassen sich verlängern. Systemnutzer-Token laufen nicht ab.
export function verlaengerbar(token) { return istIg(token); }
export function tokenVerlaengern(token) {
  return ig(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&${q(token)}`);
}
