// ═══════════════════════════════════════════════════════════
// YouTube: geplanten Livestream pro Rennen anlegen (Titel, Beschreibung, Startzeit),
// mit dem Stream-Schlüssel verknüpfen und das Thumbnail hochladen.
// Anmeldung einmalig über Google (OAuth). Gratis-Kontingent: 10.000 Einheiten/Tag,
// Livestream anlegen 50, Thumbnail 50, verknüpfen 1.
// Cloudflare: GOOGLE_CLIENT_ID (Text) + GOOGLE_CLIENT_SECRET (Secret)
// ═══════════════════════════════════════════════════════════
import { berlin } from './zeit.js';
import { titelMitTags } from './tags.js';

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
// Titel (max. 100 Zeichen, ohne < >) und Beschreibung (max. 5000).
// beschr = Beschreibung vom letzten eigenen YouTube-Stream (unverändert übernommen), sonst der eigene Text mit Platzhaltern
export function ytTexte(r, cfg, beschr) {
  // Titel + Pflicht-Hashtags (#simracing #iracing #gt3 #crash), zusammen max. 100 Zeichen
  const titel = titelMitTags(fuellen(cfg.titel, r).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim() || r.titel || 'Livestream', 100);
  const beschreibung = (beschr ? String(beschr) : fuellen(cfg.beschreibung, r)).replace(/[<>]/g, '').slice(0, 5000);
  return { titel, beschreibung };
}

// Alle eigenen Livestreams (auch „Jetzt streamen“), höchstens 4 Seiten à 50
async function alleBroadcasts(zugang) {
  const l = [];
  let seite = '';
  for (let i = 0; i < 4; i++) {
    const d = await yt(zugang, '/liveBroadcasts?part=id,snippet,status&mine=true&broadcastType=all&maxResults=50' + (seite ? '&pageToken=' + encodeURIComponent(seite) : ''));
    l.push(...(d.items || []));
    if (!(seite = d.nextPageToken)) break;
  }
  return l;
}
// Beschreibung vom zuletzt gestreamten Livestream, der NICHT vom Dashboard angelegt wurde
export async function ytLetzteBeschreibung(zugang, eigene) {
  const wann = x => Date.parse(x.snippet.actualStartTime || x.snippet.publishedAt || x.snippet.scheduledStartTime || '') || 0;
  const l = (await alleBroadcasts(zugang))
    .filter(x => x.snippet && !eigene.has(x.id) && String(x.snippet.description || '').trim())
    .sort((a, b) => wann(b) - wann(a));
  const x = l[0];
  return x ? { text: x.snippet.description, quelle: x.id, titel: x.snippet.title || '', zeit: wann(x) } : null;
}
// Aktueller Stand der vom Dashboard angelegten Livestreams (Titel, Bild, Status)
export async function ytInfos(zugang, ids) {
  const m = {};
  for (let i = 0; i < ids.length && i < 100; i += 50) {
    const d = await yt(zugang, '/liveBroadcasts?part=id,snippet,status&maxResults=50&id=' + ids.slice(i, i + 50).map(encodeURIComponent).join(','));
    for (const x of d.items || []) {
      const sn = x.snippet || {}, t = sn.thumbnails || {}, st = x.status || {};
      m[x.id] = { titel: sn.title || '', start: Date.parse(sn.scheduledStartTime || '') || 0, status: st.lifeCycleStatus || '', sichtbar: st.privacyStatus || '', bild: (t.medium || t.high || t.default || {}).url || '' };
    }
  }
  return m;
}

// 📈 Aufrufe, Likes und Kommentare von Videos (Shorts). 1 Einheit je Abruf, bis 50 Videos auf einmal.
export async function ytZahlen(zugang, ids) {
  const m = {};
  for (let i = 0; i < ids.length && i < 100; i += 50) {
    const d = await yt(zugang, '/videos?part=statistics&maxResults=50&id=' + ids.slice(i, i + 50).map(encodeURIComponent).join(','));
    for (const x of d.items || []) { const st = x.statistics || {}; m[x.id] = { aufrufe: +st.viewCount || 0, likes: +st.likeCount || 0, kommentare: +st.commentCount || 0 }; }
  }
  return m;
}

// Livestream anlegen bzw. ändern. Gibt die Broadcast-ID zurück.
export async function ytPlanen(zugang, r, cfg, alteId, beschr) {
  const { titel, beschreibung } = ytTexte(r, cfg, beschr);
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

// Clip als YouTube-Short hochladen (hochkant und unter 3 Min. → wird von selbst ein Short).
// Seit 2. Nov. 2026 auch bei nicht geprüften Apps öffentlich. Eigenes Upload-Kontingent (100 pro Tag, gratis).
const ytSauber = t => String(t || '').replace(/[<>]/g, '').trim();
export async function ytShortHochladen(zugang, { titel, beschreibung, tags, body, groesse }) {
  const meta = {
    snippet: { title: ytSauber(titel).slice(0, 100) || 'Simracing', description: ytSauber(beschreibung).slice(0, 4900), categoryId: '20', tags: (tags || []).slice(0, 15), defaultLanguage: 'de', defaultAudioLanguage: 'de' },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false, containsSyntheticMedia: false, embeddable: true }
  };
  const r = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + zugang, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(groesse) },
    body: JSON.stringify(meta)
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({})), e = d.error || {}, grund = (e.errors && e.errors[0] && e.errors[0].reason) || '';
    throw new Error('YouTube: ' + (e.message || r.status) + (grund ? ' (' + grund + ')' : ''));
  }
  const ort = r.headers.get('Location');
  if (!ort) throw new Error('YouTube: kein Upload-Link bekommen');
  const r2 = await fetch(ort, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(groesse) }, body });
  const d = await r2.json().catch(() => ({}));
  if (!r2.ok || !d.id) {
    const e = d.error || {};
    throw new Error('YouTube-Upload: ' + (e.message || r2.status));
  }
  return { id: d.id, sichtbar: (d.status && d.status.privacyStatus) || '' };
}

// ▶ YouTube-Video quer 16:9 (NEU 25.11.2026): Das Dashboard lädt die Datei aus dem Toolbox-Ordner „youtube“ selbst hoch
// (privat, direkt zu YouTube, egal wie groß). Hier nur: was in den Upload kommt, und später öffentlich schalten.
// Kein „#shorts“: quer ist ein normales Video. Der Hinweis auf den nächsten Stream fehlt, weil er beim Hochladen schon veraltet sein kann.
export function ytQuerMeta({ titel, beschreibung, tags }) {
  return {
    snippet: { title: ytSauber(titel).slice(0, 100) || 'Simracing', description: ytSauber(beschreibung).slice(0, 4900), categoryId: '20', tags: (tags || []).slice(0, 15), defaultLanguage: 'de', defaultAudioLanguage: 'de' },
    status: { privacyStatus: 'private', selfDeclaredMadeForKids: false, containsSyntheticMedia: false, embeddable: true }
  };
}
// Privat hochgeladenes Video öffentlich schalten (zum Termin, nach der Freigabe). Status erst lesen, damit nichts anderes verloren geht.
export async function ytOeffentlich(zugang, id) {
  const d = await yt(zugang, '/videos?part=status&id=' + encodeURIComponent(id));
  const v = (d.items || [])[0];
  if (!v) throw new Error('YouTube: Video nicht gefunden (videoNotFound)');
  const st = v.status || {};
  if (st.privacyStatus === 'public') return 'public';
  if (st.uploadStatus && !['uploaded', 'processed'].includes(st.uploadStatus)) throw new Error('YouTube: Das Video ist noch nicht fertig verarbeitet (' + st.uploadStatus + ').');
  const neu = { privacyStatus: 'public', embeddable: st.embeddable !== false, license: st.license || 'youtube', publicStatsViewable: st.publicStatsViewable !== false, selfDeclaredMadeForKids: false };
  const r = await yt(zugang, '/videos?part=status', { method: 'PUT', json: { id, status: neu } });
  return (r.status && r.status.privacyStatus) || 'public';
}

// Titel eines schon hochgeladenen Videos (Short): Pflicht-Hashtags dazu. Snippet holen, nur Titel (und Tags) tauschen, Rest bleibt
export async function ytTitelSetzen(zugang, id, neuTitel) {
  const d = await yt(zugang, '/videos?part=snippet&id=' + encodeURIComponent(id));
  const v = (d.items || [])[0];
  if (!v) throw new Error('YouTube: Video nicht gefunden (videoNotFound)');
  const sn = v.snippet || {};
  const titel = titelMitTags(sn.title || neuTitel || 'Simracing', 100);   // eigener Titel aus YouTube Studio bleibt, nur die Hashtags kommen dazu
  const tags = [...new Set([...(sn.tags || []), 'simracing', 'iracing', 'gt3', 'crash'])].slice(0, 30);
  if (titel === sn.title && (sn.tags || []).length === tags.length) return titel;
  await yt(zugang, '/videos?part=snippet', { method: 'PUT', json: { id, snippet: { title: titel, description: sn.description || '', categoryId: sn.categoryId || '20', tags,
    ...(sn.defaultLanguage ? { defaultLanguage: sn.defaultLanguage } : {}), ...(sn.defaultAudioLanguage ? { defaultAudioLanguage: sn.defaultAudioLanguage } : {}) } } });
  return titel;
}
