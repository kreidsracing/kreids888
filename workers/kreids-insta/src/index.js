// ═══════════════════════════════════════════════════════════
// kreids-insta · Instagram-Poster für Kreids888 (privates Konto)
// • Ankündigung (Feed) X Tage vorher, Raceday-Story am Renntag, Rennergebnis (Feed)
// • Daten aus dem Kreids-Dashboard (kreids888-admin): Streamkalender + SPR-Ergebnisse
// • Die Bilder zeichnet das Dashboard im Browser (insta-bilder.js) und schickt sie hierher:
//   Im Gratis-Tarif hat ein Worker nur 10 ms Rechenzeit – zu wenig zum Zeichnen.
// • Der Worker plant, holt KI-Hintergründe (Cloudflare-KI, gratis), speichert und postet.
// • YouTube-Thumbnail: Vorlage + Spruch pro Rennen werden hier gespeichert, gezeichnet wird im Browser.
// • Nur mit Dashboard-Login nutzbar (Token wird bei kreids888-admin /api/check geprüft)
// Routen: GET /bild/:id/:v.jpg · GET /hintergrund/:rennen · GET /logo.png · /api/* (Bearer-Token)
// ═══════════════════════════════════════════════════════════
import { DurableObject } from 'cloudflare:workers';
import { ADMIN, ERG_TAGE, ladeDaten, bauePlan, eigeneRennen, rennKey, inhaltSchluessel, kurzHash, bildtext, platzText } from './plan.js';
import { kiBild, sprueche, STIMMUNGEN, KAMERAS, autos } from './ki.js';
import { konto, posten, pruefen, tokenVerlaengern, verlaengerbar } from './insta.js';
import { istUhrzeit } from './zeit.js';
import { ytEingerichtet, ytAnmeldeLink, ytCodeTauschen, ytZugang, ytKanal, ytStreams, ytPlanen, ytThumbnail, ytTexte } from './youtube.js';
import { ttEingerichtet, ttAnmeldeLink, ttCodeTauschen, ttZugang, ttKonto, ttEntwurf, ttVideoEntwurf } from './tiktok.js';

// ─── Speicher (Durable Object, SQLite) ──────────────────────
export class Speicher extends DurableObject {
  async lies(k) { const v = await this.ctx.storage.get(k); return v === undefined ? null : v; }
  async schreib(k, v) { await this.ctx.storage.put(k, v); }
  async loesch(keys) { await this.ctx.storage.delete(keys); }
  async liste(prefix) { return Object.fromEntries(await this.ctx.storage.list({ prefix })); }
}
const speicher = env => env.SPEICHER.get(env.SPEICHER.idFromName('kreids-insta'));

// ─── Einstellungen ──────────────────────────────────────────
const TYPEN = ['Rennen', 'Stream', 'Training'];
const CFG_STANDARD = {
  modus: 'freigabe',
  ankuendigung: { aktiv: true, tage: 2, zeit: '19:00' },
  story: { aktiv: true, zeit: '12:00' },
  ergebnis: { aktiv: true, zeit: '18:00' },
  woche: { aktiv: true, zeit: '17:00', pose: 'pose_02_zeigt_auf_dich.png' },   // Wochenplan-Story sonntags
  // Vorlagen-Wechsel pro Art: reihe | zufall | fest (+ fest = Vorlagen-ID), kreids = fertiges Kreids-Design mit im Wechsel
  vorlagen: { ank: { modus: 'reihe', kreids: true, fest: '' }, story: { modus: 'reihe', kreids: true, fest: '' }, erg: { modus: 'reihe', kreids: true, fest: '' }, woche: { modus: 'reihe', kreids: true, fest: '' } },
  // YouTube: geplanter Livestream pro Rennen (X Tage vorher), Thumbnail kommt automatisch aus dem Editor
  youtube: { aktiv: true, tage: 3, sichtbar: 'public', stream: '',
    titel: '🔴 {spruch} | {strecke} – {serie} {runde}',
    beschreibung: 'Live ab {zeit} Uhr: {serie} · {runde} · {strecke}\n{klassen}\n\n🌐 kreids888.com\n#simracing #iracing #kreids888' },
  // TikTok: diese Post-Arten gehen zusätzlich als Entwurf in die TikTok-Inbox
  tiktok: { typen: ['story', 'woche', 'erg'] },
  typen: ['Rennen', 'Stream'],
  liveAb: 'quali',
  kiHinweis: true,
  stimmung: 'zufall',
  kamera: 'zufall',
  text: '{countdown}: {serie} in {strecke}!\n{wochentag}, {datum} · Live ab {live} Uhr\nLive auf {livezeile}\n\nAlle Infos: Link in Bio\n#simracing #iracing #kreids888',
  textErgebnis: '{platz} in {strecke}! 🏁\n{serie} · {datum}\nStart {startplatz} → Ziel {ziel} · {delta}\n{punkte} Punkte\n\n#simracing #iracing #kreids888'
};
const DESIGN_STANDARD = {
  farbe1: '#e11324', farbe2: '#ffffff', liveText: 'YouTube · @Kreids888', fahrzeuge: '',
  logoUrl: 'https://i.postimg.cc/cC8FkHnv/kreidslogo-twitch-u-yt-3.png', logoVersion: 1,
  team: '', teamSchwarz: true,                  // Team-Bild aus kreids888.com/team/bilder
  logoAn: true, teamAn: true, spruchAn: true,   // Ebenen ein/aus
  layout: null                                  // Plätze/Größen der Ebenen für feed + story (null = Standard, siehe insta-bilder.js)
};
// Ebenen-Plätze prüfen: { feed|story: { logo|team: {cx,cy,b}, spruch: {x,y,g} } }
function layoutPruefen(l) {
  if (!l || typeof l !== 'object') return null;
  const zahl = (v, min, max) => Math.round(Math.max(min, Math.min(max, Number(v) || 0)));
  const o = {};
  for (const f of ['feed', 'story']) {
    const q = l[f] || {}, H = f === 'story' ? 1920 : 1350;
    o[f] = {};
    for (const e of ['logo', 'team']) if (q[e]) o[f][e] = { cx: zahl(q[e].cx, -200, 1280), cy: zahl(q[e].cy, -200, H + 200), b: zahl(q[e].b, 40, 1400) };
    if (q.spruch) o[f].spruch = { x: zahl(q.spruch.x, -100, 1000), y: zahl(q.spruch.y, -100, H), g: zahl(q.spruch.g, 30, 220) };
  }
  return o;
}
// Videos liegen in Stücken (Durable-Object-Werte höchstens 2 MB)
const TEIL = 1900000, VIDEO_MAX = 60e6, VIDEO_FEHLT = 'Video fehlt noch: im Dashboard den Reiter „Instagram“ einmal öffnen, dann wird es gezeichnet.';
async function strom(req, s, prefix, teile, groesse, typ) {
  let start = 0, ende = groesse - 1, status = 200;
  const r = (req.headers.get('Range') || '').match(/bytes=(\d*)-(\d*)/);
  if (r && (r[1] || r[2])) {
    if (r[1] === '') start = Math.max(0, groesse - Number(r[2])); else { start = Number(r[1]); if (r[2]) ende = Math.min(groesse - 1, Number(r[2])); }
    status = 206;
  }
  if (start > ende || start >= groesse) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${groesse}`, ...CORS } });
  const erster = Math.floor(start / TEIL), letzter = Math.min(teile - 1, Math.floor(ende / TEIL));
  // FixedLengthStream: Cloudflare schickt dann eine echte Content-Length (Instagram/TikTok wollen die)
  const { readable, writable } = typeof FixedLengthStream === 'function' ? new FixedLengthStream(ende - start + 1) : new TransformStream();
  (async () => {
    const w = writable.getWriter();
    try {
      for (let i = erster; i <= letzter; i++) {
        const u8 = await s.lies(prefix + i);
        if (!u8) throw new Error('Stück fehlt');
        await w.write(u8.subarray(i === erster ? start - i * TEIL : 0, i === letzter ? ende - i * TEIL + 1 : u8.length));
      }
      await w.close();
    } catch (e) { try { await w.abort(e); } catch (x) { /* egal */ } }
  })();
  const h = { 'Content-Type': typ, 'Content-Length': String(ende - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=86400', ...CORS };
  if (status === 206) h['Content-Range'] = `bytes ${start}-${ende}/${groesse}`;
  return new Response(readable, { status, headers: h });
}
const KI_PRO_TAG = 10;   // FLUX.2 klein ≈ 400 Neuronen pro Bild → bleibt sicher im Gratiskontingent (10.000/Tag)
const BILD_FEHLT = 'Bild fehlt noch: im Dashboard den Reiter „Instagram“ einmal öffnen, dann wird es gezeichnet.';

function cfgPruefen(e) {
  const c = {};
  c.modus = e.modus === 'auto' ? 'auto' : 'freigabe';
  const a = e.ankuendigung || {}, st = e.story || {}, er = e.ergebnis || {};
  c.ankuendigung = { aktiv: a.aktiv !== false, tage: Math.max(0, Math.min(14, parseInt(a.tage, 10) || 0)), zeit: istUhrzeit(a.zeit) ? a.zeit : '19:00' };
  c.story = { aktiv: st.aktiv !== false, zeit: istUhrzeit(st.zeit) ? st.zeit : '12:00' };
  c.ergebnis = { aktiv: er.aktiv !== false, zeit: istUhrzeit(er.zeit) ? er.zeit : '18:00' };
  const yt = e.youtube || {}, ytStd = CFG_STANDARD.youtube;
  c.youtube = {
    aktiv: yt.aktiv !== false, tage: Math.max(1, Math.min(14, parseInt(yt.tage, 10) || ytStd.tage)), sichtbar: yt.sichtbar === 'unlisted' ? 'unlisted' : 'public',
    stream: /^[A-Za-z0-9_-]{0,80}$/.test(String(yt.stream || '')) ? String(yt.stream || '') : '',
    titel: typeof yt.titel === 'string' && yt.titel.trim() ? yt.titel.slice(0, 200) : ytStd.titel,
    beschreibung: typeof yt.beschreibung === 'string' ? yt.beschreibung.slice(0, 4000) : ytStd.beschreibung
  };
  const tk = e.tiktok || {};
  c.tiktok = { typen: Array.isArray(tk.typen) ? ['ank', 'story', 'erg', 'woche'].filter(t => tk.typen.includes(t)) : CFG_STANDARD.tiktok.typen.slice() };
  const wo = e.woche || {};
  c.woche = { aktiv: wo.aktiv !== false, zeit: istUhrzeit(wo.zeit) ? wo.zeit : '17:00', pose: /^[A-Za-z0-9_.-]{1,80}\.(png|webp)$/.test(String(wo.pose || '')) || wo.pose === '' ? wo.pose : CFG_STANDARD.woche.pose };
  const vl = e.vorlagen || {};
  c.vorlagen = {};
  for (const t of ['ank', 'story', 'erg', 'woche']) {
    const x = vl[t] || {};
    c.vorlagen[t] = { modus: ['reihe', 'zufall', 'fest'].includes(x.modus) ? x.modus : 'reihe', kreids: x.kreids !== false, fest: /^[a-z0-9]{1,40}$/.test(String(x.fest || '')) ? x.fest : '' };
  }
  c.typen = Array.isArray(e.typen) ? TYPEN.filter(t => e.typen.includes(t)) : CFG_STANDARD.typen.slice();
  c.liveAb = ['quali', 'rennen', 'start'].includes(e.liveAb) ? e.liveAb : 'quali';
  c.kiHinweis = e.kiHinweis !== false;
  c.stimmung = e.stimmung in STIMMUNGEN ? e.stimmung : 'zufall';
  c.kamera = e.kamera in KAMERAS ? e.kamera : 'zufall';
  c.text = typeof e.text === 'string' && e.text.trim() ? e.text.slice(0, 2000) : CFG_STANDARD.text;
  c.textErgebnis = typeof e.textErgebnis === 'string' && e.textErgebnis.trim() ? e.textErgebnis.slice(0, 2000) : CFG_STANDARD.textErgebnis;
  return c;
}
async function ladeCfg(s) {
  const c = (await s.lies('cfg')) || {};
  return cfgPruefen({
    ...CFG_STANDARD, ...c,
    ankuendigung: { ...CFG_STANDARD.ankuendigung, ...(c.ankuendigung || {}) },
    story: { ...CFG_STANDARD.story, ...(c.story || {}) },
    ergebnis: { ...CFG_STANDARD.ergebnis, ...(c.ergebnis || {}) },
    woche: { ...CFG_STANDARD.woche, ...(c.woche || {}) },
    youtube: { ...CFG_STANDARD.youtube, ...(c.youtube || {}) },
    tiktok: { ...CFG_STANDARD.tiktok, ...(c.tiktok || {}) },
    vorlagen: { ...CFG_STANDARD.vorlagen, ...(c.vorlagen || {}) }
  });
}
async function ladeDesign(s) { return { ...DESIGN_STANDARD, ...((await s.lies('design')) || {}) }; }
const farbeOk = f => /^#[0-9a-f]{6}$/i.test(String(f || ''));

// ─── Daten: Streamkalender + SPR-Ergebnisse + eigene Ergebnisse ──
// Eigene Rennen werden unter renn:<rennen> gemerkt (nur wenn sich etwas ändert),
// von Hand eingetragene Ergebnisse liegen unter merg:<rennen>.
async function datenLaden(s, jetzt = Date.now()) {
  const daten = await ladeDaten();
  const [gemerkt, ergebnisse] = await Promise.all([s.liste('renn:'), s.liste('merg:')]);
  for (const [rk, r] of Object.entries(eigeneRennen(daten, jetzt))) {
    if (JSON.stringify(gemerkt['renn:' + rk] || null) !== JSON.stringify(r)) { await s.schreib('renn:' + rk, r); gemerkt['renn:' + rk] = r; }
  }
  daten.eigene = Object.entries(ergebnisse).map(([k, e]) => ({ rk: k.slice(5), ergebnis: e, rennen: gemerkt['renn:' + k.slice(5)] || null }))
    .filter(x => x.rennen);
  // Rennen, bei denen noch ein Ergebnis eingetragen werden kann (gestartet, höchstens 5 Tage her)
  daten.offen = Object.entries(gemerkt)
    .filter(([k, r]) => r && r.startMs <= jetzt && r.startMs > jetzt - ERG_TAGE * 86400000 && !ergebnisse['merg:' + k.slice(5)])
    .map(([k, r]) => ({ rennKey: k.slice(5), ...r }))
    .sort((a, b) => b.startMs - a.startMs);
  return daten;
}

// ─── Bilder ─────────────────────────────────────────────────
function bildTyp(u8) {
  if (u8[0] === 0x89 && u8[1] === 0x50) return 'image/png';
  if (u8[0] === 0xff && u8[1] === 0xd8) return 'image/jpeg';
  if (u8[0] === 0x52 && u8[1] === 0x49) return 'image/webp';
  if (u8[0] === 0x47 && u8[1] === 0x49) return 'image/gif';
  return '';
}
// Bild aus dem Netz (Logo, Kalender-Bild) unverändert durchreichen – mit CORS, damit der Browser damit zeichnen darf
async function durchreichen(url) {
  url = String(url || '').trim();
  if (!/^https:\/\//i.test(url) || url.length > 500) return null;
  try {
    const r = await fetch(url, {
      cf: { cacheTtl: 86400, cacheEverything: true }, signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', Accept: 'image/png,image/jpeg,image/webp,image/*;q=0.8' }
    });
    const typ = r.headers.get('content-type') || '';
    if (!r.ok || !/^image\//i.test(typ)) return null;
    return new Response(r.body, { headers: { 'Content-Type': typ, 'Cache-Control': 'public, max-age=86400', ...CORS } });
  } catch (e) { return null; }
}

// KI-Hintergrund für ein Rennen (Ankündigung, Story und Ergebnis teilen sich EIN Bild)
async function hintergrundKI(env, s, post, design, cfg, wunsch, neu) {
  const rk = rennKey(post.id);
  if (!neu && await s.lies('bgv:' + rk)) return { ok: true };
  const tag = new Date().toISOString().slice(0, 10);
  const heute = (await s.lies('ki:' + tag)) || 0;
  try {
    if (!env.AI) throw new Error('Cloudflare-KI ist nicht eingerichtet.');
    const k = await kiBild(env, post, {
      stimmung: (wunsch && wunsch.stimmung) || cfg.stimmung,
      kamera: (wunsch && wunsch.kamera) || cfg.kamera,
      fahrzeuge: design.fahrzeuge || ''
    }, { flux: heute < KI_PRO_TAG });
    await s.schreib('ki:' + tag, heute + 1);
    const bgv = ((await s.lies('bgv:' + rk)) || 0) + 1;
    await s.schreib('bgr:' + rk, k.bild);
    await s.schreib('bgv:' + rk, bgv);
    await s.schreib('bgm:' + rk, { quelle: 'ki', modell: k.modell, kiFehler: '', zeit: Date.now(), startMs: post.startMs });
    return { ok: true, bgv };
  } catch (e) {
    const m = (await s.lies('bgm:' + rk)) || {};
    const kiFehler = String((e && e.message) || e).slice(0, 300);
    await s.schreib('bgm:' + rk, { ...m, kiFehler, zeit: Date.now(), startMs: post.startMs });
    return { ok: false, kiFehler };
  }
}

// ─── Instagram ──────────────────────────────────────────────
const basis = env => String(env.IG_TOKEN || '').slice(-16);
async function aktuellerToken(env, s) {
  const t = await s.lies('token');
  if (t && t.wert && t.basis === basis(env)) return t.wert;
  return env.IG_TOKEN || '';
}
async function kontoLesen(env, s, erzwingen) {
  const token = await aktuellerToken(env, s);
  if (!token) return { verbunden: false, fehler: 'Noch kein Instagram-Token eingetragen.' };
  const uid = String(env.IG_USER_ID || '').trim();
  const k = await s.lies('konto');
  if (!erzwingen && k && k.verbunden && k.basis === basis(env) && k.uid === uid && Date.now() - k.zeit < 6 * 3600000) return k;
  try {
    const d = await konto(token, uid);
    const neu = { verbunden: true, user_id: d.user_id, username: d.username || '', zeit: Date.now(), basis: basis(env), uid };
    await s.schreib('konto', neu);
    return neu;
  } catch (e) {
    return { verbunden: false, fehler: String(e.message || e) };
  }
}
async function tokenPflege(env, s) {
  if (!env.IG_TOKEN || !verlaengerbar(env.IG_TOKEN)) return;
  const t = await s.lies('token');
  const jetzt = Date.now();
  const gleich = t && t.basis === basis(env);
  if (gleich && jetzt - t.zeit < 7 * 86400000) return;
  const alt = (gleich && t.wert) || env.IG_TOKEN;
  try {
    const d = await tokenVerlaengern(alt);
    await s.schreib('token', { wert: d.access_token || alt, basis: basis(env), zeit: jetzt, gueltigBis: d.expires_in ? jetzt + d.expires_in * 1000 : 0 });
  } catch (e) {
    await s.schreib('token', { wert: alt, basis: basis(env), zeit: jetzt - 6 * 86400000, fehler: String(e.message || e).slice(0, 200) });
  }
}

async function veroeffentlichen(env, s, post, design, cfg) {
  const zust = (await s.lies('post:' + post.id)) || {};
  // Sperre gegen doppeltes Posten (Zeitplan und „Jetzt posten“ gleichzeitig)
  if (zust.gepostet || (zust.laeuft && Date.now() - zust.laeuft < 5 * 60000)) return zust;
  if (!zust.version) { zust.fehler = BILD_FEHLT; await s.schreib('post:' + post.id, zust); return zust; }
  const videoOk = zust.video && zust.video.hash === zust.hash;
  if (zust.istVideo && !videoOk) { zust.fehler = VIDEO_FEHLT; await s.schreib('post:' + post.id, zust); return zust; }
  zust.laeuft = Date.now();
  await s.schreib('post:' + post.id, zust);
  const token = await aktuellerToken(env, s);
  try {
    if (!token) throw new Error('Kein Instagram-Token eingetragen.');
    const k = await kontoLesen(env, s, false);
    if (!k.verbunden) throw new Error(k.fehler || 'Instagram nicht verbunden.');
    const mediaId = await posten({
      token, uid: k.user_id,
      bildUrl: `${env.ORIGIN}/bild/${post.id}/${zust.version}.jpg`,
      videoUrl: zust.istVideo ? `${env.ORIGIN}/pvideo/${post.id}/${zust.video.v}.mp4` : '',
      typ: post.typ === 'story' || post.typ === 'woche' ? 'story' : 'ank', text: post.typ === 'woche' ? '' : bildtext(post, cfg, design),
      tags: [], kiHinweis: cfg.kiHinweis && !!zust.ki
    });
    zust.gepostet = { zeit: Date.now(), mediaId };
    zust.fehler = '';
  } catch (e) {
    zust.fehler = String((e && e.message) || e).slice(0, 400);
    zust.versuche = (zust.versuche || 0) + 1;
  }
  zust.laeuft = 0;
  await s.schreib('post:' + post.id, zust);
  return zust;
}

// ─── YouTube: Livestreams planen ────────────────────────────
// Ein Rennen = Daten der Story (sonst Ankündigung) + Spruch aus dem Thumbnail. Zustand unter yt:<rennen>,
// Thumbnail-Datei (vom Dashboard gezeichnet) unter ytb:<rennen>, dazu ytbh:<rennen> = { h, typ }.
function ytRennenListe(plan, thrs) {
  const m = new Map();
  for (const p of plan) {
    if (p.typ !== 'story' && p.typ !== 'ank') continue;
    const rk = rennKey(p.id), alt = m.get(rk);
    if (!alt || p.typ === 'story') m.set(rk, { ...p, rennKey: rk, spruch: ((thrs['thr:' + rk] || {}).spruch) || '' });
  }
  return [...m.values()].sort((a, b) => a.startMs - b.startMs);
}
async function ytEinRennen(env, s, zugang, r, cfg, erzwingen) {
  const z = (await s.lies('yt:' + r.rennKey)) || {};
  if (!erzwingen && z.fehler && Date.now() - (z.zeit || 0) < 3600000) return z;
  const hash = kurzHash(JSON.stringify([ytTexte(r, cfg.youtube), r.liveMs, cfg.youtube.sichtbar]));
  try {
    if (!z.id || z.hash !== hash || erzwingen) { z.id = await ytPlanen(zugang, r, cfg.youtube, z.id); z.hash = hash; }
    const th = await s.lies('ytbh:' + r.rennKey);
    if (th && th.h && th.h !== z.thumbH) {
      const bytes = await s.lies('ytb:' + r.rennKey);
      if (bytes) { await ytThumbnail(zugang, z.id, bytes, th.typ === 'png' ? 'image/png' : 'image/jpeg'); z.thumbH = th.h; }
    }
    z.fehler = '';
  } catch (e) {
    z.fehler = String((e && e.message) || e).slice(0, 300);
    // Livestream wurde in YouTube gelöscht → beim nächsten Mal neu anlegen
    if (/not ?found|liveBroadcastNotFound|videoNotFound/i.test(z.fehler)) { delete z.id; delete z.hash; delete z.thumbH; }
  }
  z.zeit = Date.now(); z.startMs = r.startMs;
  await s.schreib('yt:' + r.rennKey, z);
  return z;
}
async function ytAbgleich(env, s, plan, cfg, jetzt) {
  if (!cfg.youtube.aktiv || !ytEingerichtet(env) || !(await s.lies('yt:token'))) return;
  const zugang = await ytZugang(env, s);
  const thrs = await s.liste('thr:');
  let n = 2;   // höchstens 2 Rennen pro Lauf (Gratis-Tarif)
  for (const r of ytRennenListe(plan, thrs)) {
    if (r.startMs <= jetzt || r.startMs - jetzt > cfg.youtube.tage * 86400000) continue;
    const z = (await s.lies('yt:' + r.rennKey)) || {};
    const th = await s.lies('ytbh:' + r.rennKey);
    const hash = kurzHash(JSON.stringify([ytTexte(r, cfg.youtube), r.liveMs, cfg.youtube.sichtbar]));
    if (z.id && z.hash === hash && (!th || th.h === z.thumbH)) continue;
    if (n-- <= 0) break;
    await ytEinRennen(env, s, zugang, r, cfg, false);
  }
}

// ─── TikTok: Entwurf in die Inbox ───────────────────────────
async function ttSenden(env, s, post, cfg, design) {
  const z = (await s.lies('post:' + post.id)) || {};
  if (!z.version) throw new Error('Bild fehlt noch – den Instagram-Reiter einmal öffnen.');
  if (z.istVideo && !(z.video && z.video.hash === z.hash)) throw new Error('Video fehlt noch – den Instagram-Reiter einmal öffnen.');
  const zugang = await ttZugang(env, s);
  const titel = post.typ === 'woche' ? 'Stream Week' : [post.track || post.titel, post.serie].filter(Boolean).join(' · ');
  const text = post.typ === 'woche' || post.typ === 'story' ? '#simracing #iracing #kreids888' : bildtext(post, cfg, design);
  try {
    const id = z.istVideo ? await ttVideoEntwurf(zugang, `${env.ORIGIN}/pvideo/${post.id}/${z.video.v}.mp4`)
      : await ttEntwurf(zugang, `${env.ORIGIN}/bild/${post.id}/${z.version}.jpg`, titel, text);
    z.tiktok = { zeit: Date.now(), publishId: id };
  } catch (e) {
    z.tiktok = { ...(z.tiktok || {}), fehler: String((e && e.message) || e).slice(0, 300), versuche: ((z.tiktok && z.tiktok.versuche) || 0) + 1, zuletzt: Date.now() };
  }
  await s.schreib('post:' + post.id, z);
  return z.tiktok;
}

// ─── Zeitplan (alle 10 Minuten) ─────────────────────────────
async function zyklus(env) {
  const s = speicher(env);
  const jetzt = Date.now();
  const [cfg, design] = await Promise.all([ladeCfg(s), ladeDesign(s)]);
  let daten;
  try { daten = await datenLaden(s, jetzt); } catch (e) { await s.schreib('lauf', { zeit: jetzt, fehler: String(e.message || e) }); return; }
  const plan = bauePlan(daten, cfg, jetzt);
  const st = await s.liste('post:');
  // 1. Fällige Posts senden (nur mit fertigem Bild aus dem Dashboard)
  for (const p of plan) {
    const z = st['post:' + p.id] || {};
    if (z.gepostet || z.uebersprungen || (z.versuche || 0) >= 3) continue;
    if (p.postMs <= jetzt && ((cfg.modus === 'auto' && jetzt - p.postMs < VERPASST_NACH) || z.freigegeben)) await veroeffentlichen(env, s, p, design, cfg);
  }
  // 1b. TikTok-Entwürfe (gleiche Zeit wie Instagram, eigene Versuche; nur frische Posts, alte nur per Knopf)
  if (cfg.tiktok.typen.length && ttEingerichtet(env) && await s.lies('tt:token')) {
    const st2 = await s.liste('post:');
    for (const p of plan) {
      if (!cfg.tiktok.typen.includes(p.typ) || p.postMs > jetzt) continue;
      const z = st2['post:' + p.id] || {};
      if (z.uebersprungen || !z.version) continue;
      const frisch = jetzt - p.postMs < 6 * 3600000 || (z.gepostet && jetzt - (z.gepostet.zeit || 0) < 6 * 3600000);
      if (!frisch || !((cfg.modus === 'auto' && jetzt - p.postMs < VERPASST_NACH) || z.freigegeben || z.gepostet)) continue;
      if (z.tiktok && (z.tiktok.zeit || (z.tiktok.versuche || 0) >= 3 || jetzt - (z.tiktok.zuletzt || 0) < 3600000)) continue;
      try { await ttSenden(env, s, p, cfg, design); } catch (e) { /* nächster Lauf */ }
    }
  }
  // 1c. YouTube-Livestreams planen
  try { await ytAbgleich(env, s, plan, cfg, jetzt); } catch (e) { await s.schreib('yt:fehler', { zeit: jetzt, text: String(e.message || e).slice(0, 300) }); }
  // 2. KI-Hintergründe für die Rennen der nächsten 48 Stunden (höchstens 2 pro Lauf)
  let ki = 2;
  const gesehen = new Set();
  for (const p of plan) {
    if (p.postMs - jetzt > 48 * 3600000 || ki <= 0) break;
    const rk = rennKey(p.id);
    if (p.typ === 'woche' || gesehen.has(rk) || p.kalenderBild || (st['post:' + p.id] || {}).gepostet) continue;
    gesehen.add(rk);
    if (await s.lies('bgv:' + rk)) continue;
    const m = await s.lies('bgm:' + rk);
    if (m && m.kiFehler && jetzt - (m.zeit || 0) < 6 * 3600000) continue;
    ki--;
    await hintergrundKI(env, s, p, design, cfg, null, false);
  }
  // 2b. Thumbnail-Sprüche: jedes Rennen der nächsten 7 Tage bekommt von selbst einen eigenen (höchstens 2 pro Lauf)
  try {
    const thrs = await s.liste('thr:');
    let n = 2;
    const fertig = new Set();
    for (const p of plan) {
      if (n <= 0) break;
      const rk = rennKey(p.id);
      if (p.typ === 'woche' || p.typ === 'erg' || fertig.has(rk) || p.startMs < jetzt || p.startMs - jetzt > 7 * 86400000) continue;
      fertig.add(rk);
      const alt = thrs['thr:' + rk] || {};
      if (alt.spruch) continue;
      n--;
      const { liste } = await sprueche(env, p);
      if (!liste || !liste.length) continue;
      await s.schreib('thr:' + rk, { ...alt, spruch: liste[Math.floor(Math.random() * liste.length)], auto: true, startMs: alt.startMs || p.startMs });
    }
  } catch (e) { /* nächster Lauf */ }
  // 3. Token verlängern
  await tokenPflege(env, s);
  // 4. Aufräumen: Einträge älter als 14 Tage, alte KI-Tageszähler, Reste der alten Version (th:, thb:, nz:, nb:)
  const weg = [];
  const alt = ms => !ms || ms < jetzt - 14 * 86400000;
  for (const [k, z] of Object.entries(st)) if (z && z.postMs && alt(z.postMs)) {
    weg.push(k, 'img:' + k.slice(5));
    if (z.video) for (let i = 0; i < (z.video.teile || 0); i++) weg.push(`pvteil:${k.slice(5)}:${z.video.v}:${i}`);
  }
  for (const [k, m] of Object.entries(await s.liste('bgm:'))) if (alt(m && m.startMs)) { const rk = k.slice(4); weg.push(k, 'bgr:' + rk, 'bgv:' + rk); }
  for (const [k, r] of Object.entries(await s.liste('renn:'))) if (alt(r && r.startMs)) weg.push(k, 'merg:' + k.slice(5));
  for (const [k, t] of Object.entries(await s.liste('thr:'))) if (alt(t && t.startMs)) weg.push(k);
  for (const [k, t] of Object.entries(await s.liste('kbu:'))) if (alt(t && t.startMs)) weg.push(k);
  for (const [k, t] of Object.entries(await s.liste('ytbh:'))) if (alt(t && t.startMs)) weg.push(k, 'ytb:' + k.slice(5));
  for (const [k, t] of Object.entries(await s.liste('yt:'))) if (k !== 'yt:token' && k !== 'yt:fehler' && k !== 'yt:kanal' && t && t.startMs && alt(t.startMs)) weg.push(k);
  for (const [k, o] of Object.entries(await s.liste('os:'))) if (!o || o.zeit < jetzt - 30 * 60000) weg.push(k);
  for (const pre of ['th:', 'thb:', 'nz:', 'nb:']) weg.push(...Object.keys(await s.liste(pre)));
  const tagHeute = new Date().toISOString().slice(0, 10);
  for (const k of Object.keys(await s.liste('ki:'))) if (k !== 'ki:' + tagHeute) weg.push(k);
  if (weg.length) await s.loesch(weg.slice(0, 120));
  await s.schreib('lauf', { zeit: jetzt, ok: true, posts: plan.length });
}

// ─── HTTP ───────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  'Access-Control-Max-Age': '86400'
};
const antwort = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
const fehler = (text, status = 400) => antwort({ error: text }, status);

// Login: dasselbe Token wie im Kreids-Dashboard, geprüft bei kreids888-admin (/api/check)
const PRUEFUNG = new Map();
async function istAdmin(req) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!t) return false;
  const c = PRUEFUNG.get(t);
  if (c && c.bis > Date.now()) return c.ok;
  let ok = false;
  try {
    const r = await fetch(ADMIN + '/api/check', { headers: { Authorization: 'Bearer ' + t } });
    if (r.ok) { const d = await r.json().catch(() => ({})); ok = d.ok === true; }
  } catch (e) { ok = false; }
  if (PRUEFUNG.size > 200) PRUEFUNG.clear();
  PRUEFUNG.set(t, { ok, bis: Date.now() + 5 * 60000 });
  return ok;
}

const VERPASST_NACH = 30 * 60000;
function status(z, cfg, p, jetzt) {
  if (z.gepostet) return 'gepostet';
  if (z.uebersprungen) return 'uebersprungen';
  if (z.fehler && z.fehler !== BILD_FEHLT) return 'fehler';
  if (cfg.modus === 'freigabe' && !z.freigegeben) return 'wartet';
  if (!z.freigegeben && p && jetzt - p.postMs > VERPASST_NACH) return 'verpasst';
  return 'geplant';
}
const TYP_AUS_ID = id => /^woche_/.test(id) ? 'woche' : (String(id).match(/_(ank|story|erg)$/) || [])[1] || '';
const DATUM_AUS_ID = id => (String(id).match(/(\d{4}-\d{2}-\d{2})_(ank|story|erg)$/) || [])[1] || '';
const QUELLE = { eigen: 'Eigenes Bild', gemini: 'Gemini-App', chatgpt: 'ChatGPT-App', ki: 'Cloudflare-KI' };

// ─── Vorlagen: welche Vorlage bekommt ein Post? ───
const ARTFORMAT = { ank: 'feed', erg: 'feed', story: 'story', woche: 'story' };
function vorlagenPool(typ, serie, vorlagen, cfg) {
  const c = cfg.vorlagen[typ] || {};
  const eigene = vorlagen.filter(v => v.an !== false && v.format === ARTFORMAT[typ] && (v.fuer || []).includes(typ));
  const fuerSerie = eigene.filter(v => (v.serien || []).length && (v.serien || []).includes(serie));
  const allgemein = eigene.filter(v => !(v.serien || []).length);
  // Gibt es Vorlagen nur für diese Serie, kommen nur die dran – sonst die allgemeinen
  const pool = (fuerSerie.length ? fuerSerie : allgemein).map(v => v.id);
  if (c.kreids !== false && !fuerSerie.length) pool.unshift('kreids');
  return pool.length ? pool : ['kreids'];
}
async function vorlagenZuteilen(s, plan, st, vorlagen, cfg) {
  const ids = new Set(vorlagen.map(v => v.id));
  const zaehler = {};
  for (const p of plan) {
    if (!ARTFORMAT[p.typ]) continue;
    const key = 'post:' + p.id, z = st[key] || {};
    if (z.gepostet) continue;
    const pool = vorlagenPool(p.typ, p.serie, vorlagen, cfg);
    if (z.vorlage && (z.vorlageFest ? (z.vorlage === 'kreids' || ids.has(z.vorlage)) : pool.includes(z.vorlage))) continue;
    const c = cfg.vorlagen[p.typ] || {};
    let id;
    if (c.modus === 'fest') id = pool.includes(c.fest) ? c.fest : pool[0];
    else if (c.modus === 'zufall') id = pool[Math.floor(Math.random() * pool.length)];
    else {
      if (zaehler[p.typ] === undefined) zaehler[p.typ] = (await s.lies('vzaehler:' + p.typ)) || 0;
      id = pool[zaehler[p.typ] % pool.length]; zaehler[p.typ]++;
    }
    const neu = { ...z, vorlage: id, vorlageFest: false };
    await s.schreib(key, neu); st[key] = neu;
  }
  for (const [t, n] of Object.entries(zaehler)) await s.schreib('vzaehler:' + t, n);
}

async function stand(env, s) {
  const jetzt = Date.now();
  const tag = new Date().toISOString().slice(0, 10);
  const [cfg, design, st, lauf, kiHeute, bgvs, bgms, kbus, thrs, vorlage, ytz, ytbh, ttTok, ytFehler] = await Promise.all([ladeCfg(s), ladeDesign(s), s.liste('post:'), s.lies('lauf'),
    s.lies('ki:' + tag), s.liste('bgv:'), s.liste('bgm:'), s.liste('kbu:'), s.liste('thr:'), s.lies('thumbvorlage'), s.liste('yt:'), s.liste('ytbh:'), s.lies('tt:token'), s.lies('yt:fehler')]);
  const daten = await datenLaden(s, jetzt);
  const plan = bauePlan(daten, cfg, jetzt);
  const k = await kontoLesen(env, s, false);
  // Link des Kalender-Bilds pro Rennen merken (für /hintergrund/:rennen)
  for (const p of plan) {
    const rk = rennKey(p.id), alt = kbus['kbu:' + rk];
    if (p.kalenderBild && (!alt || alt.url !== p.kalenderBild)) { const neu = { url: p.kalenderBild, startMs: p.startMs }; await s.schreib('kbu:' + rk, neu); kbus['kbu:' + rk] = neu; }
  }
  const [vorlagenRoh, ablageRoh, videosRoh] = await Promise.all([s.liste('vorlage:'), s.liste('ablageinfo:'), s.liste('video:')]);
  const vorlagen = Object.values(vorlagenRoh).filter(v => v && v.id).sort((a, b) => (a.erstellt || 0) - (b.erstellt || 0));
  const vVersion = Object.fromEntries(vorlagen.map(v => [v.id, v.v || 0]));
  await vorlagenZuteilen(s, plan, st, vorlagen, cfg);
  const posts = plan.map(p => {
    const z = st['post:' + p.id] || {};
    const rk = rennKey(p.id);
    const bgv = bgvs['bgv:' + rk] || 0;
    const m = bgms['bgm:' + rk] || {};
    const spruch = (thrs['thr:' + rk] || {}).spruch || '';
    const vid = z.vorlage && (z.vorlage === 'kreids' || vVersion[z.vorlage] !== undefined) ? z.vorlage : 'kreids';
    const rennVideo = (thrs['thr:' + rk] || {}).video || '';
    const soll = kurzHash(inhaltSchluessel({ ...p, spruch }, design, cfg, bgv) + '|' + vid + ':' + (vVersion[vid] || 0) + '|' + rennVideo);
    return {
      id: p.id, typ: p.typ, art: p.art, spr: p.spr, titel: p.titel, serie: p.serie, nr: p.nr, track: p.track, layout: p.layout, datum: p.datum,
      postMs: p.postMs, startMs: p.startMs, qualiMs: p.qualiMs || p.startMs, rennMs: p.rennMs || p.startMs, liveMs: p.liveMs, tage: p.tage || 0,
      klassen: p.klassen, reverseGrid: p.reverseGrid, spruch, liste: p.liste || null, bisDatum: p.bisDatum || '', pose: p.pose || '',
      ergebnis: p.ergebnis || null, platz: p.ergebnis ? platzText(p.ergebnis) : '', eigenesErgebnis: !!p.eigenesErgebnis,
      vorlage: vid, vorlageFest: !!z.vorlageFest, istVideo: !!z.istVideo,
      video: z.istVideo && z.video && z.video.hash === z.hash ? `${env.ORIGIN}/pvideo/${p.id}/${z.video.v}.mp4` : '', videoHash: z.video ? z.video.hash : '',
      status: status(z, cfg, p, jetzt), freigegeben: !!z.freigegeben, fehler: z.fehler || '', kiFehler: bgv ? '' : (m.kiFehler || ''),
      gepostet: z.gepostet || null,
      bild: z.version ? `${env.ORIGIN}/bild/${p.id}/${z.version}.jpg` : '',
      soll, veraltet: !!z.version && z.hash !== soll,
      hg: bgv ? `${env.ORIGIN}/hintergrund/${rk}?v=${bgv}` : p.kalenderBild ? `${env.ORIGIN}/hintergrund/${rk}?k=${kurzHash(p.kalenderBild)}` : '',
      bildQuelle: bgv ? (QUELLE[m.quelle] || '') + (m.modell ? ' (' + m.modell + ')' : '') : p.kalenderBild ? 'Bild aus dem Streamkalender' : '',
      rennKey: rk,
      thumb: thrs['thr:' + rk] || null,
      yt: p.typ === 'story' || p.typ === 'ank' ? (({ id, fehler, zeit, thumbH }) => ({ id: id || '', fehler: fehler || '', zeit: zeit || 0, thumbH: thumbH || '' }))(ytz['yt:' + rk] || {}) : null,
      ytThumbH: (ytbh['ytbh:' + rk] || {}).h || '',
      tiktok: z.tiktok ? { zeit: z.tiktok.zeit || 0, fehler: z.tiktok.zeit ? '' : (z.tiktok.fehler || '') } : null,
      autos: autos(p, design.fahrzeuge || ''),
      text: p.typ === 'story' || p.typ === 'woche' ? '' : bildtext(p, cfg, design)
    };
  });
  // Gepostet in den letzten 36 Stunden
  const imPlan = new Set(plan.map(p => p.id));
  const erledigt = Object.entries(st).map(([k, z]) => {
    if (!z) return null;
    const id = k.slice(5), wann = (z.gepostet && z.gepostet.zeit) || z.postMs || 0;
    if (jetzt - wann > 36 * 3600000) return null;
    if (!z.gepostet) return null;
    const i = z.info || {};
    return {
      id, typ: i.typ || TYP_AUS_ID(id), titel: i.titel || '', serie: i.serie || '', nr: i.nr || 0, track: i.track || '', layout: i.layout || '', datum: i.datum || DATUM_AUS_ID(id), bisDatum: i.bisDatum || '',
      wann, imPlan: imPlan.has(id), fehler: z.fehler || '',
      gepostet: z.gepostet ? { zeit: z.gepostet.zeit || 0, manuell: !!z.gepostet.manuell, mediaId: z.gepostet.mediaId || '' } : null,
      tiktok: z.tiktok ? { zeit: z.tiktok.zeit || 0, fehler: z.tiktok.zeit ? '' : (z.tiktok.fehler || '') } : null,
      bild: z.version ? `${env.ORIGIN}/bild/${id}/${z.version}.jpg` : '',
      video: z.istVideo && z.video ? `${env.ORIGIN}/pvideo/${id}/${z.video.v}.mp4` : ''
    };
  }).filter(Boolean).sort((a, b) => b.wann - a.wann);
  return {
    erledigt, vorlagen,
    videos: Object.entries(videosRoh).filter(([, v]) => v && v.fertig).map(([k, v]) => ({ id: k.slice(6), name: v.name || '', ton: !!v.ton, dauer: v.dauer || 0, url: `${env.ORIGIN}/video/${k.slice(6)}`, zeit: v.zeit || 0 })).sort((a, b) => b.zeit - a.zeit),
    ablage: Object.entries(ablageRoh).map(([k, a]) => ({ id: k.slice(11), name: a.name || '', url: `${env.ORIGIN}/ablage/${k.slice(11)}`, zeit: a.zeit || 0 })).sort((a, b) => b.zeit - a.zeit),
    cfg, design: { ...design, logoBild: design.logoUrl ? `${env.ORIGIN}/logo.png?v=${kurzHash(design.logoUrl)}` : '' },
    posts, offen: daten.offen || [], thumbVorlage: vorlage || null,
    konto: { verbunden: !!k.verbunden, username: k.username || '', fehler: k.fehler || '' },
    youtube: { eingerichtet: ytEingerichtet(env), verbunden: !!ytz['yt:token'], kanal: (ytz['yt:kanal'] || {}).name || '', fehler: ytFehler && ytFehler.zeit > Date.now() - 3600000 ? ytFehler.text : '' },
    tiktok: { eingerichtet: ttEingerichtet(env), verbunden: !!ttTok, name: (ttTok && ttTok.name) || '' },
    lauf: lauf || null, jetzt,
    ki: { genutzt: kiHeute || 0, max: KI_PRO_TAG, frei: Math.max(0, KI_PRO_TAG - (kiHeute || 0)) }
  };
}

async function postAusPlan(s, id) {
  const [cfg, design] = await Promise.all([ladeCfg(s), ladeDesign(s)]);
  const plan = bauePlan(await datenLaden(s), cfg, Date.now());
  return { p: plan.find(x => x.id === id), plan, cfg, design };
}
// Bild-Bytes aus dem Request (Dashboard schickt JPEG direkt, ohne JSON)
async function bildAusBody(req, max) {
  const u8 = new Uint8Array(await req.arrayBuffer());
  return u8.length >= 1000 && u8.length <= max && (bildTyp(u8) === 'image/jpeg' || bildTyp(u8) === 'image/png') ? u8 : null;
}

async function api(req, env, url) {
  if (!(await istAdmin(req))) return fehler('Bitte im Kreids-Dashboard neu einloggen.', 403);
  const s = speicher(env);
  const pfad = url.pathname;
  const json = () => req.json().catch(() => ({}));

  if (pfad === '/api/stand' && req.method === 'GET') return antwort(await stand(env, s));

  if (pfad === '/api/einstellungen' && req.method === 'POST') {
    const body = await json();
    await s.schreib('cfg', cfgPruefen(body.cfg || body));
    return antwort({ ok: true, cfg: await ladeCfg(s) });
  }

  if (pfad === '/api/design' && req.method === 'POST') {
    const body = await json();
    const alt = await ladeDesign(s);
    const neu = { ...alt };
    if (farbeOk(body.farbe1)) neu.farbe1 = body.farbe1;
    if (farbeOk(body.farbe2)) neu.farbe2 = body.farbe2;
    if (typeof body.liveText === 'string') neu.liveText = body.liveText.replace(/[<>]/g, '').slice(0, 60);
    if (typeof body.fahrzeuge === 'string') neu.fahrzeuge = body.fahrzeuge.replace(/[<>]/g, '').slice(0, 200);
    for (const k of ['logoAn', 'teamAn', 'spruchAn']) if (body[k] !== undefined) neu[k] = body[k] !== false;
    if (body.layout !== undefined) neu.layout = layoutPruefen(body.layout);
    if (typeof body.team === 'string') neu.team = /^[A-Za-z0-9_-]{1,60}\.(webp|png|jpg)$/.test(body.team) ? body.team : '';
    if (body.teamSchwarz !== undefined) neu.teamSchwarz = body.teamSchwarz !== false;
    if (typeof body.logoUrl === 'string') {
      const u = body.logoUrl.trim();
      if (u && !/^https:\/\//i.test(u)) return fehler('Logo-Link muss mit https:// anfangen.');
      if (u !== alt.logoUrl) { neu.logoUrl = u; neu.logoVersion = (alt.logoVersion || 0) + 1; }
    }
    await s.schreib('design', neu);
    return antwort({ ok: true });
  }

  if (pfad === '/api/konto' && req.method === 'POST') {
    const k = await kontoLesen(env, s, true);
    return antwort({ verbunden: !!k.verbunden, username: k.username || '', fehler: k.fehler || '' });
  }

  // YouTube / TikTok verbinden: Anmelde-Link mit Einmal-Schlüssel (state), Rückweg /oauth/<dienst>
  const vb = pfad.match(/^\/api\/(verbinden|trennen)\/(youtube|tiktok)$/);
  if (vb && req.method === 'POST') {
    const [, was, dienst] = vb;
    if (was === 'trennen') { await s.loesch(dienst === 'youtube' ? ['yt:token', 'yt:kanal'] : ['tt:token']); return antwort({ ok: true }); }
    if (dienst === 'youtube' ? !ytEingerichtet(env) : !ttEingerichtet(env)) return fehler('Erst die Zugangsdaten in Cloudflare eintragen (siehe Anleitung).');
    const state = [...crypto.getRandomValues(new Uint8Array(18))].map(b => b.toString(16).padStart(2, '0')).join('');
    await s.schreib('os:' + state, { dienst, zeit: Date.now() });
    return antwort({ url: dienst === 'youtube' ? ytAnmeldeLink(env, state) : ttAnmeldeLink(env, state) });
  }
  if (pfad === '/api/youtube/streams' && req.method === 'GET') {
    try { return antwort({ streams: await ytStreams(await ytZugang(env, s)) }); } catch (e) { return fehler(e.message, 502); }
  }
  const ytp = pfad.match(/^\/api\/youtube\/([A-Za-z0-9_-]{1,200})\/planen$/);
  if (ytp && req.method === 'POST') {
    const [cfg, thrs] = await Promise.all([ladeCfg(s), s.liste('thr:')]);
    const plan = bauePlan(await datenLaden(s), cfg, Date.now());
    const r = ytRennenListe(plan, thrs).find(x => x.rennKey === ytp[1]);
    if (!r) return fehler('Dieses Rennen ist nicht (mehr) in der Planung.', 404);
    const z = await ytEinRennen(env, s, await ytZugang(env, s), r, cfg, true);
    return z.fehler ? fehler(z.fehler, 502) : antwort({ ok: true, id: z.id });
  }
  // ─── Vorlagen ───
  if (pfad === '/api/vorlage' && req.method === 'POST') {
    const body = await json(), v = body.vorlage;
    const t = JSON.stringify(v || null);
    if (!v || typeof v !== 'object' || !Array.isArray(v.elemente) || !['feed', 'story'].includes(v.format) || t.length > 60000) return fehler('Vorlage ungültig.');
    const id = /^[a-z0-9]{6,40}$/.test(String(v.id || '')) ? v.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const alt = await s.lies('vorlage:' + id);
    const neu = { ...v, id, name: String(v.name || 'Vorlage').replace(/[<>]/g, '').slice(0, 40), fuer: (v.fuer || []).filter(f => ARTFORMAT[f] === v.format),
      serien: (v.serien || []).map(x => String(x).slice(0, 80)).slice(0, 30), v: Date.now(), erstellt: (alt && alt.erstellt) || Date.now() };
    await s.schreib('vorlage:' + id, neu);
    return antwort({ ok: true, id, v: neu.v });
  }
  const vw = pfad.match(/^\/api\/vorlage\/([a-z0-9]{1,40})\/weg$/);
  if (vw && req.method === 'POST') { await s.loesch(['vorlage:' + vw[1]]); return antwort({ ok: true }); }
  if (pfad === '/api/vorlagen/verteilen' && req.method === 'POST') {
    const st = await s.liste('post:');
    for (const [k, z] of Object.entries(st)) if (z && !z.gepostet && z.vorlage) { const n = { ...z }; delete n.vorlage; delete n.vorlageFest; await s.schreib(k, n); }
    return antwort({ ok: true });
  }
  // Ablage: eigene Bilder (PNG/JPG/WebP bis 1,9 MB)
  if (pfad === '/api/ablage' && req.method === 'POST') {
    const u8 = new Uint8Array(await req.arrayBuffer());
    const typ = bildTyp(u8);
    if (u8.length < 200 || u8.length > 1.9e6 || !['image/png', 'image/jpeg', 'image/webp'].includes(typ)) return fehler('Bitte PNG, JPG oder WebP bis 1,9 MB.');
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await s.schreib('ablage:' + id, u8);
    await s.schreib('ablageinfo:' + id, { name: String(url.searchParams.get('name') || 'Bild').replace(/[<>]/g, '').slice(0, 60), typ, zeit: Date.now() });
    return antwort({ ok: true, id, url: `${env.ORIGIN}/ablage/${id}` });
  }
  const aw = pfad.match(/^\/api\/ablage\/([a-z0-9]{1,40})\/weg$/);
  if (aw && req.method === 'POST') { await s.loesch(['ablage:' + aw[1], 'ablageinfo:' + aw[1]]); return antwort({ ok: true }); }

  // ─── Videos: Ablage (Hintergrund-Videos) ───
  if (pfad === '/api/video/neu' && req.method === 'POST') {
    const b = await json(), groesse = Number(b.groesse) || 0;
    if (groesse < 1000 || groesse > VIDEO_MAX) return fehler('Video zu groß (höchstens 60 MB) – bitte kürzer schneiden.');
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await s.schreib('video:' + id, { name: String(b.name || 'Video').replace(/[<>]/g, '').slice(0, 60), typ: /^video\/[a-z0-9.+-]{2,30}$/.test(String(b.typ || '')) ? b.typ : 'video/mp4',
      groesse, teile: Math.ceil(groesse / TEIL), ton: b.ton !== false, dauer: Math.max(0, Math.min(3600, Number(b.dauer) || 0)), fertig: false, zeit: Date.now() });
    return antwort({ ok: true, id, teil: TEIL, teile: Math.ceil(groesse / TEIL) });
  }
  const vt = pfad.match(/^\/api\/video\/([a-z0-9]{1,40})\/(teil|fertig|weg|ton)(?:\/(\d{1,3}))?$/);
  if (vt && req.method === 'POST') {
    const [, vid, was, nr] = vt, info = await s.lies('video:' + vid);
    if (!info) return fehler('Video nicht gefunden.', 404);
    if (was === 'teil') {
      const n = Number(nr), u8 = new Uint8Array(await req.arrayBuffer());
      if (!(n >= 0 && n < info.teile) || !u8.length || u8.length > TEIL) return fehler('Stück ungültig.');
      await s.schreib(`vteil:${vid}:${n}`, u8);
      return antwort({ ok: true });
    }
    if (was === 'fertig') {
      const da = Object.keys(await s.liste(`vteil:${vid}:`)).length;
      if (da !== info.teile) return fehler(`Hochladen unvollständig (${da} von ${info.teile}).`);
      await s.schreib('video:' + vid, { ...info, fertig: true });
      return antwort({ ok: true, url: `${env.ORIGIN}/video/${vid}` });
    }
    if (was === 'ton') { const b = await json(); await s.schreib('video:' + vid, { ...info, ton: b.ton !== false }); return antwort({ ok: true }); }
    const weg = ['video:' + vid]; for (let i = 0; i < info.teile; i++) weg.push(`vteil:${vid}:${i}`);
    await s.loesch(weg);
    return antwort({ ok: true });
  }
  // ─── Fertiges Post-Video (im Dashboard gezeichnet, MP4) ───
  const pv = pfad.match(/^\/api\/post\/([A-Za-z0-9_-]{1,200})\/(videoteil|videofertig)(?:\/(\d{1,3}))?$/);
  if (pv && req.method === 'POST') {
    const [, id, was, nr] = pv, v = Number(url.searchParams.get('v')) || 0;
    if (!v) return fehler('Version fehlt.');
    if (was === 'videoteil') {
      const u8 = new Uint8Array(await req.arrayBuffer());
      if (!u8.length || u8.length > TEIL || !(Number(nr) >= 0 && Number(nr) < 40)) return fehler('Stück ungültig.');
      await s.schreib(`pvteil:${id}:${v}:${Number(nr)}`, u8);
      return antwort({ ok: true });
    }
    const b = await json(), teile = Number(b.teile) || 0, groesse = Number(b.groesse) || 0;
    const z = (await s.lies('post:' + id)) || {};
    if (z.gepostet) return fehler('Dieser Post ist schon gepostet.');
    const da = Object.keys(await s.liste(`pvteil:${id}:${v}:`)).length;
    if (!teile || da !== teile) return fehler(`Video unvollständig (${da} von ${teile}).`);
    const alt = z.video;
    z.video = { v, teile, groesse, hash: String(b.hash || '').slice(0, 20), zeit: Date.now() };
    if (z.fehler === VIDEO_FEHLT) z.fehler = '';
    await s.schreib('post:' + id, z);
    if (alt && alt.v !== v) { const weg = []; for (let i = 0; i < (alt.teile || 0); i++) weg.push(`pvteil:${id}:${alt.v}:${i}`); if (weg.length) await s.loesch(weg); }
    return antwort({ ok: true, video: `${env.ORIGIN}/pvideo/${id}/${v}.mp4` });
  }

  // Thumbnail-Datei fürs YouTube-Video (vom Dashboard gezeichnet, PNG oder JPG unter 2 MB)
  const ytt = pfad.match(/^\/api\/ytthumb\/([A-Za-z0-9_-]{1,200})$/);
  if (ytt && req.method === 'POST') {
    const u8 = await bildAusBody(req, 2e6);
    if (!u8) return fehler('Thumbnail ungültig (PNG/JPG unter 2 MB).');
    await s.schreib('ytb:' + ytt[1], u8);
    await s.schreib('ytbh:' + ytt[1], { h: String(url.searchParams.get('h') || '').slice(0, 20), typ: bildTyp(u8) === 'image/png' ? 'png' : 'jpg', startMs: Number(url.searchParams.get('s')) || Date.now(), zeit: Date.now() });
    return antwort({ ok: true });
  }

  // YouTube-Thumbnail: Vorlage für alle Rennen
  if (pfad === '/api/thumbvorlage' && req.method === 'POST') {
    const body = await json();
    const t = JSON.stringify(body.vorlage || null);
    if (!body.vorlage || typeof body.vorlage !== 'object' || t.length > 60000) return fehler('Vorlage ungültig.');
    await s.schreib('thumbvorlage', body.vorlage);
    return antwort({ ok: true });
  }
  // YouTube-Thumbnail: Spruch und Ich-Bild für ein Rennen
  const th = pfad.match(/^\/api\/thumb\/([A-Za-z0-9_-]{1,200})$/);
  if (th && req.method === 'POST') {
    const body = await json();
    const alt = (await s.lies('thr:' + th[1])) || {};
    const neu = { ...alt, startMs: Number(body.startMs) || alt.startMs || Date.now() };
    if (typeof body.spruch === 'string') neu.spruch = body.spruch.replace(/[<>]/g, '').slice(0, 80);
    if (typeof body.pers === 'string') neu.pers = body.pers.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 80);
    if (typeof body.video === 'string') neu.video = body.video.replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (body.seed !== undefined) neu.seed = (Number(body.seed) >>> 0) || 0;
    if (body.vorlage === null) delete neu.vorlage;
    else if (body.vorlage !== undefined) {
      if (typeof body.vorlage !== 'object' || !Array.isArray(body.vorlage.elemente) || JSON.stringify(body.vorlage).length > 60000) return fehler('Vorlage ungültig.');
      neu.vorlage = body.vorlage;
    }
    if (typeof body.spruch === 'string') delete neu.auto;
    await s.schreib('thr:' + th[1], neu);
    return antwort({ ok: true });
  }
  // Clickbait-Sprüche (Cloudflare-KI, sonst feste Vorschläge)
  if (pfad === '/api/sprueche' && req.method === 'POST') {
    const body = await json();
    const { plan } = await postAusPlan(s, '');
    const rennen = plan.filter(x => rennKey(x.id) === body.rennKey);
    const p = rennen.find(x => x.typ === 'erg') || rennen[0];
    if (!p) return fehler('Dieses Rennen ist nicht (mehr) in der Planung.', 404);
    return antwort(await sprueche(env, p));
  }

  // Ergebnis eines eigenen Rennens von Hand eintragen (oder mit loeschen: true wieder entfernen)
  if (pfad === '/api/ergebnis' && req.method === 'POST') {
    const body = await json();
    const rk = String(body.rennKey || '');
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(rk) || !(await s.lies('renn:' + rk))) return fehler('Dieses Rennen kenne ich nicht (mehr).', 404);
    if (body.loeschen) {
      const z = (await s.lies('post:' + rk + '_erg')) || {};
      if (z.gepostet && !z.gepostet.manuell) return fehler('Das Ergebnis ist schon auf Instagram.');
      await s.loesch(['merg:' + rk, 'post:' + rk + '_erg', 'img:' + rk + '_erg']);
      return antwort({ ok: true });
    }
    const platz = x => { const n = parseInt(x, 10); return n >= 1 && n <= 99 ? n : null; };
    const st = ['DNF', 'DSQ'].includes(body.status) ? body.status : '';
    const ziel = st ? null : platz(body.ziel);
    if (!st && !ziel) return fehler('Bitte den Zielplatz eintragen (oder DNF/DSQ wählen).');
    await s.schreib('merg:' + rk, { start: platz(body.start), ziel, status: st || 'FIN', punkte: Math.max(0, Math.min(999, parseInt(body.punkte, 10) || 0)), zeit: Date.now() });
    return antwort({ ok: true });
  }

  const m = pfad.match(/^\/api\/post\/([A-Za-z0-9_-]{1,200})\/(fertig|bild|freigeben|ueberspringen|jetzt|manuell|eigenesbild|pruefen|tiktok|vorlage)$/);
  if (m && req.method === 'POST') {
    const [, id, aktion] = m;
    const z = (await s.lies('post:' + id)) || {};
    if (aktion === 'manuell' || aktion === 'freigeben' || aktion === 'ueberspringen') {
      const body = await json();
      if (aktion === 'manuell') {
        if (body.an === false) { delete z.gepostet; z.freigegeben = false; z.versuche = 0; z.fehler = ''; z.laeuft = 0; }
        else { z.gepostet = { zeit: Date.now(), manuell: true }; z.fehler = ''; }
      } else {
        if (aktion === 'freigeben') z.freigegeben = body.an !== false; else z.uebersprungen = body.an !== false;
        if (body.an !== false) { z.fehler = z.version ? '' : z.fehler; z.versuche = 0; }
      }
      await s.schreib('post:' + id, z);
      return antwort({ ok: true });
    }
    // Vorlage für diesen Post: { id } selbst wählen, { id: '' } = wieder automatisch, { wuerfeln: true } = eine andere
    if (aktion === 'vorlage') {
      const body = await json();
      if (z.gepostet) return fehler('Dieser Post ist schon gepostet.');
      if (body.wuerfeln) {
        const [cfg, liste, daten] = await Promise.all([ladeCfg(s), s.liste('vorlage:'), datenLaden(s)]);
        const p = bauePlan(daten, cfg, Date.now()).find(x => x.id === id);
        if (!p) return fehler('Diesen Post gibt es nicht (mehr).', 404);
        const pool = vorlagenPool(p.typ, p.serie, Object.values(liste), cfg).filter(x => x !== z.vorlage);
        if (!pool.length) return fehler('Keine andere Vorlage für diese Art da – im Reiter „🧩 Vorlagen“ welche anlegen.');
        z.vorlage = pool[Math.floor(Math.random() * pool.length)]; z.vorlageFest = true;
      } else if (body.id) {
        if (body.id !== 'kreids' && !(await s.lies('vorlage:' + String(body.id).replace(/[^a-z0-9]/g, '')))) return fehler('Vorlage nicht gefunden.', 404);
        z.vorlage = body.id; z.vorlageFest = true;
      } else { delete z.vorlage; delete z.vorlageFest; }
      await s.schreib('post:' + id, z);
      return antwort({ ok: true });
    }
    // Auf Instagram nachsehen, ob es den geposteten Post wirklich gibt
    if (aktion === 'pruefen') {
      const mid = z.gepostet && z.gepostet.mediaId;
      if (!mid) return fehler(z.gepostet ? 'Als selbst gepostet markiert – dazu gibt es keine Instagram-Nummer.' : 'Dieser Post wurde nicht über das Dashboard gepostet.');
      const token = await aktuellerToken(env, s);
      if (!token) return fehler('Kein Instagram-Token eingetragen.');
      try { return antwort({ ok: true, ...(await pruefen(token, mid)) }); }
      catch (e) { return antwort({ ok: false, fehler: e.message, mediaId: mid }); }
    }
    const rk = rennKey(id);
    // Fertiges Bild vom Dashboard (im Browser gezeichnet, JPEG)
    if (aktion === 'fertig') {
      if (z.gepostet) return fehler('Dieser Post ist schon auf Instagram.');
      const u8 = await bildAusBody(req, 8e6);
      if (!u8 || bildTyp(u8) !== 'image/jpeg') return fehler('Bild ungültig (JPEG bis 8 MB).');
      const { p } = await postAusPlan(s, id);
      if (!p) return fehler('Diesen Post gibt es im Streamkalender nicht (mehr).', 404);
      const [bgv, bgm] = await Promise.all([s.lies('bgv:' + rk), s.lies('bgm:' + rk)]);
      z.version = (z.version || 0) + 1;
      z.hash = String(url.searchParams.get('h') || '').slice(0, 20);
      z.istVideo = url.searchParams.get('video') === '1';
      z.postMs = p.postMs;
      z.info = { typ: p.typ, titel: p.titel || '', serie: p.serie || '', nr: p.nr || 0, track: p.track || '', layout: p.layout || '', datum: p.datum || '', bisDatum: p.bisDatum || '' };
      z.erstellt = Date.now();
      z.ki = !!bgv && !!bgm && bgm.quelle === 'ki';
      if (z.fehler === BILD_FEHLT) z.fehler = '';
      await s.schreib('img:' + id, u8);
      await s.schreib('post:' + id, z);
      return antwort({ ok: true, bild: `${env.ORIGIN}/bild/${id}/${z.version}.jpg` });
    }
    // Eigenes Hintergrundbild (Gemini-App, ChatGPT-App, Screenshot …) für alle Posts dieses Rennens
    if (aktion === 'eigenesbild') {
      const u8 = await bildAusBody(req, 1.9e6);
      if (!u8) return fehler('Bitte ein JPG oder PNG bis 1,9 MB.');
      const { p } = await postAusPlan(s, id);
      if (!p) return fehler('Diesen Post gibt es im Streamkalender nicht (mehr).', 404);
      const herkunft = url.searchParams.get('herkunft');
      const bgv = ((await s.lies('bgv:' + rk)) || 0) + 1;
      await s.schreib('bgr:' + rk, u8);
      await s.schreib('bgv:' + rk, bgv);
      await s.schreib('bgm:' + rk, { quelle: ['gemini', 'chatgpt'].includes(herkunft) ? herkunft : 'eigen', modell: '', kiFehler: '', zeit: Date.now(), startMs: p.startMs });
      return antwort({ ok: true, bgv });
    }
    const body = await json();
    const { p, cfg, design } = await postAusPlan(s, id);
    if (!p) return fehler('Diesen Post gibt es im Streamkalender nicht (mehr).', 404);
    // KI-Hintergrund (neu: true = neues Bild, auch wenn schon eins da ist)
    if (aktion === 'bild') {
      const wunsch = { stimmung: body.stimmung in STIMMUNGEN ? body.stimmung : '', kamera: body.kamera in KAMERAS ? body.kamera : '' };
      const r = await hintergrundKI(env, s, p, design, cfg, wunsch, !!body.neu);
      return antwort({ ok: r.ok, kiFehler: r.kiFehler || '' });
    }
    if (aktion === 'tiktok') {
      try { const t = await ttSenden(env, s, p, cfg, design); return t.zeit ? antwort({ ok: true }) : fehler(t.fehler || 'TikTok ging nicht.', 502); }
      catch (e) { return fehler(e.message, 502); }
    }
    if (aktion === 'jetzt') {
      if (z.gepostet) return fehler('Dieser Post ist schon auf Instagram.');
      z.versuche = 0; z.fehler = ''; await s.schreib('post:' + id, z);
      const neu = await veroeffentlichen(env, s, p, design, cfg);
      if (neu.fehler) return fehler(neu.fehler, 502);
      if (!neu.gepostet) return fehler('Wird gerade schon vom automatischen Lauf gepostet – in 2 Minuten „🔄 Neu laden“.', 409);
      return antwort({ ok: true, mediaId: neu.gepostet.mediaId || '' });
    }
  }
  return fehler('Unbekannte Anfrage.', 404);
}

// Seite nach der Anmeldung (im Anmelde-Fenster)
function seite(ok, text) {
  return new Response(`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kreids888</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0b0e;color:#f2f4f8;font:18px/1.5 system-ui,sans-serif;text-align:center">
<div><div style="font-size:54px">${ok ? '✅' : '⚠️'}</div><p>${text}</p><p style="color:#8a91a3;font-size:14px">Dieses Fenster kannst du schließen.</p></div>
<script>try{window.opener&&window.opener.postMessage({k888verbunden:${ok}},'*')}catch(e){}${ok ? 'setTimeout(function(){window.close()},2500)' : ''}</script></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
async function anmeldungFertig(env, url, dienst) {
  const s = speicher(env);
  const state = String(url.searchParams.get('state') || ''), code = String(url.searchParams.get('code') || '');
  const o = /^[0-9a-f]{36}$/.test(state) ? await s.lies('os:' + state) : null;
  if (!o || o.dienst !== dienst || Date.now() - o.zeit > 30 * 60000) return seite(false, 'Anmeldung abgelaufen – bitte im Dashboard nochmal auf „Verbinden“ klicken.');
  await s.loesch(['os:' + state]);
  if (!code) return seite(false, 'Anmeldung abgebrochen' + (url.searchParams.get('error') ? ' (' + String(url.searchParams.get('error')).replace(/[<>&"]/g, '') + ')' : '') + '.');
  try {
    if (dienst === 'youtube') {
      const t = await ytCodeTauschen(env, code);
      if (!t.refresh) return seite(false, 'Google hat keinen Dauer-Zugang geschickt. Bitte unter myaccount.google.com/permissions die App entfernen und nochmal verbinden.');
      await s.schreib('yt:token', t);
      const k = await ytKanal(t.access).catch(() => null);
      await s.schreib('yt:kanal', k || { name: '' });
      return seite(true, 'YouTube ist verbunden' + (k && k.name ? ' mit <b>' + k.name.replace(/[<>&"]/g, '') + '</b>' : '') + '.');
    }
    const t = await ttCodeTauschen(env, code);
    const k = await ttKonto(t.access).catch(() => ({ name: '' }));
    await s.schreib('tt:token', { ...t, name: k.name || '' });
    return seite(true, 'TikTok ist verbunden' + (k.name ? ' mit <b>' + k.name.replace(/[<>&"]/g, '') + '</b>' : '') + '.');
  } catch (e) {
    return seite(false, String((e && e.message) || e).replace(/[<>&"]/g, '').slice(0, 200));
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      // Fertiges Post-Bild (für Instagram und die Vorschau)
      const b = url.pathname.match(/^\/bild\/([A-Za-z0-9_-]{1,200})\/\d+\.jpg$/);
      if (b && req.method === 'GET') {
        const jpg = await speicher(env).lies('img:' + b[1]);
        if (!jpg) return new Response('Kein Bild', { status: 404, headers: CORS });
        const h = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', ...CORS };
        if (url.searchParams.has('laden')) h['Content-Disposition'] = `attachment; filename="kreids888-${b[1]}.jpg"`;
        return new Response(jpg, { headers: h });
      }
      // Videos: Hintergrund-Video aus der Ablage und fertiges Post-Video (mit Range, für Instagram/TikTok)
      const qv = url.pathname.match(/^\/video\/([a-z0-9]{1,40})$/);
      if (qv && (req.method === 'GET' || req.method === 'HEAD')) {
        const s = speicher(env), info = await s.lies('video:' + qv[1]);
        if (!info || !info.fertig) return new Response('Kein Video', { status: 404, headers: CORS });
        return strom(req, s, `vteil:${qv[1]}:`, info.teile, info.groesse, info.typ || 'video/mp4');
      }
      const ov = url.pathname.match(/^\/pvideo\/([A-Za-z0-9_-]{1,200})\/(\d+)\.mp4$/);
      if (ov && (req.method === 'GET' || req.method === 'HEAD')) {
        const s = speicher(env), z = await s.lies('post:' + ov[1]);
        if (!z || !z.video || String(z.video.v) !== ov[2]) return new Response('Kein Video', { status: 404, headers: CORS });
        return strom(req, s, `pvteil:${ov[1]}:${ov[2]}:`, z.video.teile, z.video.groesse, 'video/mp4');
      }
      // Eigenes Bild aus der Ablage (für Vorlagen)
      const ab = url.pathname.match(/^\/ablage\/([a-z0-9]{1,40})$/);
      if (ab && req.method === 'GET') {
        const u8 = await speicher(env).lies('ablage:' + ab[1]);
        if (!u8) return new Response('Kein Bild', { status: 404, headers: CORS });
        return new Response(u8, { headers: { 'Content-Type': bildTyp(u8) || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', ...CORS } });
      }
      // Hintergrund eines Rennens: KI-/eigenes Bild, sonst das Bild aus dem Streamkalender
      const hg = url.pathname.match(/^\/hintergrund\/([A-Za-z0-9_-]{1,200})$/);
      if (hg && req.method === 'GET') {
        const s = speicher(env);
        const bg = await s.lies('bgr:' + hg[1]);
        if (bg) return new Response(bg, { headers: { 'Content-Type': bildTyp(bg) || 'image/jpeg', 'Cache-Control': 'public, max-age=86400', ...CORS } });
        const k = await s.lies('kbu:' + hg[1]);
        return (k && await durchreichen(k.url)) || new Response('Kein Hintergrund', { status: 404, headers: CORS });
      }
      if (url.pathname === '/logo.png' && req.method === 'GET') {
        const d = await ladeDesign(speicher(env));
        return (await durchreichen(d.logoUrl)) || new Response('Kein Logo', { status: 404, headers: CORS });
      }
      if (url.pathname.startsWith('/api/')) return await api(req, env, url);
      // Rückweg nach der Anmeldung bei YouTube/TikTok
      const oa = url.pathname.match(/^\/oauth\/(youtube|tiktok)$/);
      if (oa && req.method === 'GET') return await anmeldungFertig(env, url, oa[1]);
      // Bestätigungsdatei für das TikTok-Entwicklerportal (Link-Anfang dieses Workers)
      if (env.TIKTOK_PRUEFDATEI && url.pathname === '/' + String(env.TIKTOK_PRUEFDATEI).trim()) {
        return new Response(String(env.TIKTOK_PRUEFINHALT || ''), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      if (url.pathname === '/') return new Response('kreids-insta läuft.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      return new Response('Nicht gefunden', { status: 404 });
    } catch (e) {
      return fehler(String((e && e.message) || e), 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(zyklus(env));
  }
};
