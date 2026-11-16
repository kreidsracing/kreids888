// ═══════════════════════════════════════════════════════════
// YouTube: geplanten Livestream pro Rennen anlegen (Titel, Beschreibung, Startzeit),
// mit dem Stream-Schlüssel verknüpfen und das Thumbnail hochladen.
// Anmeldung einmalig über Google (OAuth). Gratis-Kontingent: 10.000 Einheiten/Tag,
// Livestream anlegen 50, Thumbnail 50, verknüpfen 1.
// Cloudflare: GOOGLE_CLIENT_ID (Text) + GOOGLE_CLIENT_SECRET (Secret)
// ═══════════════════════════════════════════════════════════
import { berlin } from './zeit.js';

const API = 'https://www.googleapis.com/youtube/v3';
const SCOPE = 'https://www.googleapis.com/auth/youtube';

export const ytEingerichtet = env => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const ytRueckweg = env => env.ORIGIN + '/oauth/youtube';

export function ytAnmeldeLink(env, state) {
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, redirect_uri: ytRueckweg(env), response_type: 'code', scope: SCOPE,
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q;
}

async function tokenAnfrage(env, felder) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...felder })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error('Google: ' + (d.error_description || d.error || r.status));
  return d;
}
// Code aus dem Anmelde-Fenster → Tokens
export async function ytCodeTauschen(env, code) {
  const d = await tokenAnfrage(env, { code, grant_type: 'authorization_code', redirect_uri: ytRueckweg(env) });
  return { access: d.access_token, refresh: d.refresh_token || '', ablauf: Date.now() + (d.expires_in || 3600) * 1000 - 60000 };
}
// Gültigen Zugang holen (erneuert ihn bei Bedarf und speichert ihn)
export async function ytZugang(env, s) {
  const t = await s.lies('yt:token');
  if (!t || !t.refresh) throw new Error('YouTube ist nicht verbunden.');
  if (t.access && t.ablauf > Date.now()) return t.access;
  const d = await tokenAnfrage(env, { refresh_token: t.refresh, grant_type: 'refresh_token' });
  const neu = { ...t, access: d.access_token, ablauf: Date.now() + (d.expires_in || 3600) * 1000 - 60000 };
  await s.schreib('yt:token', neu);
  return neu.access;
}

async function yt(zugang, pfad, opt = {}) {
  const r = await fetch((opt.upload ? 'https://www.googleapis.com/upload/youtube/v3' : API) + pfad, {
    method: opt.method || 'GET',
    headers: { Authorization: 'Bearer ' + zugang, ...(opt.json ? { 'Content-Type': 'application/json' } : {}), ...(opt.typ ? { 'Content-Type': opt.typ } : {}) },
    body: opt.json ? JSON.stringify(opt.json) : opt.body
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = d.error || {}, grund = (e.errors && e.errors[0] && e.errors[0].reason) || '';
    throw new Error('YouTube: ' + (e.message || r.status) + (grund ? ' (' + grund + ')' : ''));
  }
  return d;
}

// Kanal und Stream-Schlüssel (für die Auswahl im Dashboard)
export async function ytKanal(zugang) {
  const d = await yt(zugang, '/channels?part=snippet&mine=true');
  const c = (d.items || [])[0];
  return c ? { id: c.id, name: (c.snippet && c.snippet.title) || '' } : null;
}
export async function ytStreams(zugang) {
  const d = await yt(zugang, '/liveStreams?part=id,snippet,cdn&mine=true&maxResults=50');
  return (d.items || []).map(x => ({ id: x.id, name: (x.snippet && x.snippet.title) || x.id }));
}

// Spruch wie beim Thumbnail (eigener Spruch, sonst Standard)
function ersatzSpruch(r) {
  const e = r.ergebnis;
  if (e && e.ziel) return e.start && e.start > e.ziel ? `VON P${e.start} AUF P${e.ziel}?!` : e.ziel === 1 ? 'SIEG!' : e.ziel <= 3 ? 'ENDLICH PODIUM!' : 'DAS WAR KNAPP!';
  return 'ALLES ODER NICHTS!';
}
function fuellen(vorlage, r) {
  const s = berlin(r.liveMs || r.startMs);
  const w = {
    spruch: (r.spruch || '').trim() || ersatzSpruch(r), strecke: [r.track, r.layout].filter(Boolean).join(' – ') || r.titel || '',
    serie: r.serie || r.titel || '', titel: r.titel || '', runde: r.nr ? 'Runde ' + r.nr : '', datum: s.tag + s.jahr, wochentag: s.wochentag, zeit: s.zeit,
    klassen: (r.klassen || []).join(' · ')
  };
  return String(vorlage || '').split('\n').map(z => {
    let leer = false;
    const t = z.replace(/\{(\w+)\}/g, (m, k) => { if (!(k in w)) return m; if (!w[k]) leer = true; return w[k]; });
    return leer && /\{\w+\}/.test(z) && !t.replace(/[\s·|–-]/g, '') ? null : t;
  }).filter(z => z !== null).join('\n')
    .replace(/(\s*[·|–-]\s*){2,}/g, ' · ').replace(/^[\s·|–-]+|[\s·|–-]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}
// Titel (max. 100 Zeichen, ohne < >) und Beschreibung (max. 5000)
export function ytTexte(r, cfg) {
  const titel = fuellen(cfg.titel, r).replace(/[<>]/g, '').replace(/\s+/g, ' ').slice(0, 100) || (r.titel || 'Livestream');
  const beschreibung = fuellen(cfg.beschreibung, r).replace(/[<>]/g, '').slice(0, 5000);
  return { titel, beschreibung };
}

// Livestream anlegen bzw. ändern. Gibt die Broadcast-ID zurück.
export async function ytPlanen(zugang, r, cfg, alteId) {
  const { titel, beschreibung } = ytTexte(r, cfg);
  const start = new Date(r.liveMs || r.startMs).toISOString();
  const snippet = { title: titel, description: beschreibung, scheduledStartTime: start };
  const status = { privacyStatus: cfg.sichtbar === 'unlisted' ? 'unlisted' : 'public', selfDeclaredMadeForKids: false };
  if (alteId) {
    await yt(zugang, '/liveBroadcasts?part=id,snippet,status', { method: 'PUT', json: { id: alteId, snippet, status } });
    return alteId;
  }
  const b = await yt(zugang, '/liveBroadcasts?part=id,snippet,status,contentDetails', {
    method: 'POST', json: { snippet, status, contentDetails: { enableAutoStart: !!cfg.stream, enableAutoStop: !!cfg.stream, latencyPreference: 'low' } }
  });
  if (cfg.stream) {
    try { await yt(zugang, `/liveBroadcasts/bind?id=${encodeURIComponent(b.id)}&part=id,contentDetails&streamId=${encodeURIComponent(cfg.stream)}`, { method: 'POST' }); }
    catch (e) { /* Livestream steht trotzdem – Schlüssel kann man in YouTube Studio wählen */ }
  }
  return b.id;
}
export async function ytThumbnail(zugang, id, bytes, typ) {
  await yt(zugang, `/thumbnails/set?videoId=${encodeURIComponent(id)}&uploadType=media`, { method: 'POST', upload: true, body: bytes, typ });
}
