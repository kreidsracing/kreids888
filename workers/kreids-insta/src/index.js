// ═══════════════════════════════════════════════════════════
// kreids-insta · Instagram-Poster für Kreids888 (privates Konto)
// • Ankündigung (Feed) X Tage vorher, Raceday-Story am Renntag, Rennergebnis (Feed)
// • Daten aus dem Kreids-Dashboard (kreids888-admin): Streamkalender + SPR-Ergebnisse
// • Bild: KI-Hintergrund (Flux, gratis), Kalender-Bild, Gemini/ChatGPT-Bild oder eigenes Bild + Kreids-Grafik
// • YouTube-Thumbnail 1920×1080 pro Rennen zum Herunterladen (PNG unter 2 MB, sonst JPG)
// • Modus „Mit Freigabe“ (jeder Post wartet auf Klick) oder „Automatisch“
// • Nur mit Dashboard-Login nutzbar (Token wird bei kreids888-admin /api/check geprüft)
// Routen: GET /bild/:id/:v.jpg · GET /thumb/:rennen.(jpg|png) · GET /logo.png · /api/* (Bearer-Token)
// ═══════════════════════════════════════════════════════════
import { DurableObject } from 'cloudflare:workers';
import { ADMIN, ERG_TAGE, ladeDaten, bauePlan, eigeneRennen, rennKey, inhaltSchluessel, thumbSchluessel, kurzHash, bildtext, platzText } from './plan.js';
import { kiBild, rendern, rendernThumb, bildVerkleinern, bildAlsJpeg, STIMMUNGEN, KAMERAS, autos } from './bild.js';
import { konto, posten, tokenVerlaengern, verlaengerbar } from './insta.js';
import { istUhrzeit, berlin } from './zeit.js';

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
  logoUrl: 'https://i.postimg.cc/cC8FkHnv/kreidslogo-twitch-u-yt-3.png', logoVersion: 1
};
const KI_PRO_TAG = 10;   // FLUX.2 klein ≈ 400 Neuronen pro Bild → bleibt sicher im Gratiskontingent (10.000/Tag)

function cfgPruefen(e) {
  const c = {};
  c.modus = e.modus === 'auto' ? 'auto' : 'freigabe';
  const a = e.ankuendigung || {}, st = e.story || {}, er = e.ergebnis || {};
  c.ankuendigung = { aktiv: a.aktiv !== false, tage: Math.max(0, Math.min(14, parseInt(a.tage, 10) || 0)), zeit: istUhrzeit(a.zeit) ? a.zeit : '19:00' };
  c.story = { aktiv: st.aktiv !== false, zeit: istUhrzeit(st.zeit) ? st.zeit : '12:00' };
  c.ergebnis = { aktiv: er.aktiv !== false, zeit: istUhrzeit(er.zeit) ? er.zeit : '18:00' };
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
    ergebnis: { ...CFG_STANDARD.ergebnis, ...(c.ergebnis || {}) }
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

// ─── Bilder aus dem Netz (Logo, Kalender-Bild) ─────────────
// Zwischenspeicher: geklappt 1 Tag, nicht geklappt 15 Minuten (dann neuer Versuch)
async function bildLaden(s, url, art) {
  url = String(url || '').trim();
  if (!/^https:\/\//i.test(url) || url.length > 500) return { bild: null, grund: url ? 'Kein gültiger https-Link' : '' };
  const key = art + ':' + url;
  const m = await s.lies('nz:' + key);
  if (m && m.zeit > Date.now() - (m.ok ? 86400000 : 15 * 60000)) return { bild: m.ok ? ((await s.lies('nb:' + key)) || null) : null, grund: m.grund || '' };
  let bild = null, grund = '';
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', Accept: 'image/png,image/jpeg,image/gif,image/*;q=0.8' } });
    if (!r.ok) grund = 'Server meldet Fehler ' + r.status;
    else {
      const u8 = new Uint8Array(await r.arrayBuffer());
      const typOk = (u8[0] === 0x89 && u8[1] === 0x50) || (u8[0] === 0xff && u8[1] === 0xd8) || (u8[0] === 0x47 && u8[1] === 0x49);
      if (!typOk) grund = /text\/html/i.test(r.headers.get('content-type') || '') ? 'Link zeigt auf eine Webseite, nicht direkt auf das Bild' : 'Format geht nicht (bitte PNG oder JPG)';
      else if (u8.length > 15e6) grund = 'Bild zu groß (über 15 MB)';
      else bild = art === 'logo' ? await bildVerkleinern(u8, 900) : await bildAlsJpeg(u8, 1600);
    }
  } catch (e) { grund = /timeout|abort/i.test(String(e && (e.name + ' ' + e.message))) ? 'Server antwortet nicht' : String((e && e.message) || e).slice(0, 80); }
  if (bild) await s.schreib('nb:' + key, bild); else await s.loesch(['nb:' + key]);
  await s.schreib('nz:' + key, { zeit: Date.now(), ok: !!bild, grund });
  return { bild, grund };
}
const logoLaden = async (s, design) => (design.logoUrl ? (await bildLaden(s, design.logoUrl, 'logo')).bild : null);

// ─── Bild erstellen ─────────────────────────────────────────
// Ankündigung, Story und Ergebnis desselben Rennens teilen sich EIN Hintergrundbild
// (Wiedererkennung, spart KI-Kontingent). Gespeichert pro Rennen unter bgr:/bgv:/bgm:.
// Reihenfolge: eigenes/Gemini/ChatGPT-Bild > Bild aus dem Streamkalender > KI-Bild.
async function bildErstellen(env, s, post, design, cfg, neuKI, wunsch) {
  const zust = (await s.lies('post:' + post.id)) || {};
  const rk = rennKey(post.id);
  let bgv = (await s.lies('bgv:' + rk)) || 0;
  let meta = (await s.lies('bgm:' + rk)) || {};
  let bg = neuKI ? null : await s.lies('bgr:' + rk);
  if (!bg && !neuKI && post.kalenderBild) {
    const k = await bildLaden(s, post.kalenderBild, 'kalender');
    if (k.bild) {
      bg = k.bild; bgv += 1;
      meta = { quelle: 'kalender', prompt: '', modell: '', kiFehler: '' };
      await s.schreib('bgr:' + rk, bg); await s.schreib('bgv:' + rk, bgv); await s.schreib('bgm:' + rk, meta);
    }
  }
  if (!bg && (neuKI || !zust.version || !meta.kiFehler)) {
    const tag = new Date().toISOString().slice(0, 10);
    const heute = (await s.lies('ki:' + tag)) || 0;
    try {
      const k = await kiBild(env, post, {
        stimmung: (wunsch && wunsch.stimmung) || cfg.stimmung,
        kamera: (wunsch && wunsch.kamera) || cfg.kamera,
        fahrzeuge: design.fahrzeuge || ''
      }, { flux: heute < KI_PRO_TAG });
      await s.schreib('ki:' + tag, heute + 1);
      bg = k.bild;
      meta = { prompt: k.prompt, modell: k.modell, kiFehler: '', quelle: 'ki' };
      bgv += 1;
      await s.schreib('bgr:' + rk, bg);
      await s.schreib('bgv:' + rk, bgv);
    } catch (e) {
      meta = { ...meta, kiFehler: String((e && e.message) || e).slice(0, 300) };
    }
    await s.schreib('bgm:' + rk, meta);
  }
  zust.ki = !!bg && meta.quelle === 'ki';
  zust.kiFehler = bg ? '' : (meta.kiFehler || '');
  const jpg = await rendern(post, design, bg, await logoLaden(s, design));
  zust.version = (zust.version || 0) + 1;
  zust.hash = inhaltSchluessel(post, design, cfg, bgv);
  zust.postMs = post.postMs;
  zust.erstellt = Date.now();
  await s.schreib('img:' + post.id, jpg);
  await s.schreib('post:' + post.id, zust);
  return zust;
}

// ─── YouTube-Thumbnail (1920×1080) ──────────────────────────
async function thumbBauen(env, s, rk, download) {
  const [cfg, design] = await Promise.all([ladeCfg(s), ladeDesign(s)]);
  const plan = bauePlan(await datenLaden(s), cfg, Date.now());
  const rennen = plan.filter(p => rennKey(p.id) === rk && p.typ !== 'erg');
  const post = rennen.find(p => p.typ === 'story') || rennen[0];
  if (!post) return null;
  const bgv = (await s.lies('bgv:' + rk)) || 0;
  const h = kurzHash(thumbSchluessel(post, design, bgv));
  const name = `Kreids888-${post.track || post.titel || 'Rennen'}-${post.datum}`.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-');
  if (!download) {
    const z = await s.lies('th:' + rk);
    const alt = z && z.h === h ? await s.lies('thb:' + rk) : null;
    if (alt) return { post, h, name, bild: alt, typ: 'jpg', gespeichert: true };
  }
  const bg = await s.lies('bgr:' + rk);
  const t = await rendernThumb(post, design, bg, await logoLaden(s, design), download);
  return { post, h, name, ...t, gespeichert: false };
}
async function thumbAntwort(env, rk, download) {
  const s = speicher(env);
  const erg = await thumbBauen(env, s, rk, download);
  if (!erg) return new Response('Dieses Rennen ist nicht (mehr) in der Planung.', { status: 404, headers: CORS });
  if (download) {
    return new Response(erg.bild, { headers: { 'Content-Type': erg.typ === 'png' ? 'image/png' : 'image/jpeg', 'Content-Disposition': `attachment; filename="${erg.name}.${erg.typ}"`, 'Cache-Control': 'no-store', ...CORS } });
  }
  if (!erg.gespeichert) { await s.schreib('thb:' + rk, erg.bild); await s.schreib('th:' + rk, { h: erg.h, startMs: erg.post.startMs }); }
  return new Response(erg.bild, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', ...CORS } });
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
  const k = await s.lies('konto');
  if (!erzwingen && k && k.verbunden && k.basis === basis(env) && Date.now() - k.zeit < 6 * 3600000) return k;
  try {
    const d = await konto(token, String(env.IG_USER_ID || '').trim());
    const neu = { verbunden: true, user_id: d.user_id, username: d.username || '', zeit: Date.now(), basis: basis(env) };
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
  let zust = (await s.lies('post:' + post.id)) || {};
  // Sperre gegen doppeltes Posten (Zeitplan und „Jetzt posten“ gleichzeitig)
  if (zust.gepostet || (zust.laeuft && Date.now() - zust.laeuft < 5 * 60000)) return zust;
  const bgv = (await s.lies('bgv:' + rennKey(post.id))) || 0;
  if (!zust.version || zust.hash !== inhaltSchluessel(post, design, cfg, bgv)) zust = await bildErstellen(env, s, post, design, cfg, false);
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
      typ: post.typ === 'story' ? 'story' : 'ank', text: bildtext(post, cfg, design),
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

// ─── Zeitplan (alle 10 Minuten) ─────────────────────────────
async function zyklus(env) {
  const s = speicher(env);
  const jetzt = Date.now();
  const [cfg, design] = await Promise.all([ladeCfg(s), ladeDesign(s)]);
  let daten;
  try { daten = await datenLaden(s, jetzt); } catch (e) { await s.schreib('lauf', { zeit: jetzt, fehler: String(e.message || e) }); return; }
  const plan = bauePlan(daten, cfg, jetzt);
  const st = await s.liste('post:');
  // 1. Fällige Posts senden
  for (const p of plan) {
    const z = st['post:' + p.id] || {};
    if (z.gepostet || z.uebersprungen || (z.versuche || 0) >= 3) continue;
    if (p.postMs <= jetzt && (cfg.modus === 'auto' || z.freigegeben)) await veroeffentlichen(env, s, p, design, cfg);
  }
  // 2. Bilder für die nächsten 48 Stunden vorbereiten bzw. auffrischen
  let ki = 2, neu = 3;
  for (const p of plan) {
    if (p.postMs - jetzt > 48 * 3600000) break;
    const z = (await s.lies('post:' + p.id)) || {};
    if (z.gepostet || z.uebersprungen) continue;
    try {
      const bgv = (await s.lies('bgv:' + rennKey(p.id))) || 0;
      if (!z.version && (bgv || p.kalenderBild || ki > 0)) { if (!bgv && !p.kalenderBild) ki--; await bildErstellen(env, s, p, design, cfg, false); }
      else if (z.version && z.hash !== inhaltSchluessel(p, design, cfg, bgv) && neu > 0) { neu--; await bildErstellen(env, s, p, design, cfg, false); }
    } catch (e) { /* nächster Lauf */ }
  }
  // 3. Token verlängern
  await tokenPflege(env, s);
  // 4. Aufräumen: Einträge älter als 14 Tage, alte Thumbnails, alte Netz-Bilder, alte KI-Tageszähler
  const weg = [];
  for (const [k, z] of Object.entries(st)) {
    if (z && z.postMs && z.postMs < jetzt - 14 * 86400000) { const id = k.slice(5), rk = rennKey(id); weg.push(k, 'img:' + id, 'bgr:' + rk, 'bgv:' + rk, 'bgm:' + rk); }
  }
  for (const [k, r] of Object.entries(await s.liste('renn:'))) if (!r || !r.startMs || r.startMs < jetzt - 14 * 86400000) weg.push(k, 'merg:' + k.slice(5));
  for (const [k, z] of Object.entries(await s.liste('th:'))) if (!z || !z.startMs || z.startMs < jetzt - 2 * 86400000) weg.push(k, 'thb:' + k.slice(3));
  for (const [k, z] of Object.entries(await s.liste('nz:'))) if (!z || !z.zeit || z.zeit < jetzt - 7 * 86400000) weg.push(k, 'nb:' + k.slice(3));
  const tagHeute = new Date().toISOString().slice(0, 10);
  for (const k of Object.keys(await s.liste('ki:'))) if (k !== 'ki:' + tagHeute) weg.push(k);
  if (weg.length) await s.loesch(weg.slice(0, 120));
  await s.schreib('lauf', { zeit: jetzt, ok: true, posts: plan.length });
}

// ─── HTTP ───────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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

function status(z, cfg) {
  if (z.gepostet) return 'gepostet';
  if (z.uebersprungen) return 'uebersprungen';
  if (z.fehler) return 'fehler';
  if (cfg.modus === 'freigabe' && !z.freigegeben) return 'wartet';
  return 'geplant';
}
const QUELLE = { eigen: 'Eigenes Bild', gemini: 'Gemini-App', chatgpt: 'ChatGPT-App', kalender: 'Bild aus dem Streamkalender' };

async function stand(env, s) {
  const jetzt = Date.now();
  const tag = new Date().toISOString().slice(0, 10);
  const [cfg, design, st, lauf, kiHeute, bgvs, bgms] = await Promise.all([ladeCfg(s), ladeDesign(s), s.liste('post:'), s.lies('lauf'),
    s.lies('ki:' + tag), s.liste('bgv:'), s.liste('bgm:')]);
  const daten = await datenLaden(s, jetzt);
  const plan = bauePlan(daten, cfg, jetzt);
  const k = await kontoLesen(env, s, false);
  const logoInfo = design.logoUrl ? await s.lies('nz:logo:' + design.logoUrl) : null;
  const posts = plan.map(p => {
    const z = st['post:' + p.id] || {};
    const rk = rennKey(p.id);
    const m = bgms['bgm:' + rk] || {};
    return {
      id: p.id, typ: p.typ, art: p.art, spr: p.spr, titel: p.titel, serie: p.serie, nr: p.nr, track: p.track, layout: p.layout,
      postMs: p.postMs, startMs: p.startMs, liveMs: p.liveMs, klassen: p.klassen, reverseGrid: p.reverseGrid,
      ergebnis: p.ergebnis || null, platz: p.ergebnis ? platzText(p.ergebnis) : '', eigenesErgebnis: !!p.eigenesErgebnis,
      status: status(z, cfg), freigegeben: !!z.freigegeben, fehler: z.fehler || '', kiFehler: z.kiFehler || '',
      gepostet: z.gepostet || null,
      bild: z.version ? `${env.ORIGIN}/bild/${p.id}/${z.version}.jpg` : '',
      veraltet: !!z.version && z.hash !== inhaltSchluessel(p, design, cfg, bgvs['bgv:' + rk] || 0),
      bildQuelle: QUELLE[m.quelle] || (m.modell ? 'Cloudflare-KI (' + m.modell + ')' : ''),
      rennKey: rk,
      thumb: p.typ === 'erg' ? '' : `${env.ORIGIN}/thumb/${rk}.jpg?h=${kurzHash(thumbSchluessel(p, design, bgvs['bgv:' + rk] || 0))}`,
      thumbLaden: p.typ === 'erg' ? '' : `${env.ORIGIN}/thumb/${rk}.png`,
      autos: autos(p, design.fahrzeuge || ''),
      text: p.typ === 'story' ? '' : bildtext(p, cfg, design)
    };
  });
  return {
    cfg, design: { ...design, logoBild: design.logoUrl ? `${env.ORIGIN}/logo.png?v=${kurzHash(design.logoUrl)}` : '', logoFehler: logoInfo && !logoInfo.ok ? (logoInfo.grund || 'nicht ladbar') : '' },
    posts, offen: daten.offen || [], konto: { verbunden: !!k.verbunden, username: k.username || '', fehler: k.fehler || '' },
    lauf: lauf || null, jetzt,
    ki: { genutzt: kiHeute || 0, max: KI_PRO_TAG, frei: Math.max(0, KI_PRO_TAG - (kiHeute || 0)) }
  };
}

async function postAusPlan(s, id) {
  const [cfg, design] = await Promise.all([ladeCfg(s), ladeDesign(s)]);
  const plan = bauePlan(await datenLaden(s), cfg, Date.now());
  return { p: plan.find(x => x.id === id), plan, cfg, design };
}

async function api(req, env, url) {
  if (!(await istAdmin(req))) return fehler('Bitte im Kreids-Dashboard neu einloggen.', 403);
  const s = speicher(env);
  const pfad = url.pathname;
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  if (pfad === '/api/stand' && req.method === 'GET') return antwort(await stand(env, s));

  if (pfad === '/api/einstellungen' && req.method === 'POST') {
    await s.schreib('cfg', cfgPruefen(body.cfg || body));
    return antwort({ ok: true, cfg: await ladeCfg(s) });
  }

  if (pfad === '/api/design' && req.method === 'POST') {
    const alt = await ladeDesign(s);
    const neu = { ...alt };
    if (farbeOk(body.farbe1)) neu.farbe1 = body.farbe1;
    if (farbeOk(body.farbe2)) neu.farbe2 = body.farbe2;
    if (typeof body.liveText === 'string') neu.liveText = body.liveText.replace(/[<>]/g, '').slice(0, 60);
    if (typeof body.fahrzeuge === 'string') neu.fahrzeuge = body.fahrzeuge.replace(/[<>]/g, '').slice(0, 200);
    if (typeof body.logoUrl === 'string') {
      const u = body.logoUrl.trim();
      if (u && !/^https:\/\//i.test(u)) return fehler('Logo-Link muss mit https:// anfangen.');
      if (u !== alt.logoUrl) { neu.logoUrl = u; neu.logoVersion = (alt.logoVersion || 0) + 1; if (u) await s.loesch(['nz:logo:' + u, 'nb:logo:' + u]); }
    }
    await s.schreib('design', neu);
    return antwort({ ok: true });
  }

  if (pfad === '/api/konto' && req.method === 'POST') {
    const k = await kontoLesen(env, s, true);
    return antwort({ verbunden: !!k.verbunden, username: k.username || '', fehler: k.fehler || '' });
  }

  // Ergebnis eines eigenen Rennens von Hand eintragen (oder mit loeschen: true wieder entfernen)
  if (pfad === '/api/ergebnis' && req.method === 'POST') {
    const rk = String(body.rennKey || '');
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(rk) || !(await s.lies('renn:' + rk))) return fehler('Dieses Rennen kenne ich nicht (mehr).', 404);
    if (body.loeschen) {
      const z = (await s.lies('post:' + rk + '_erg')) || {};
      if (z.gepostet && !z.gepostet.manuell) return fehler('Das Ergebnis ist schon auf Instagram.');
      await s.loesch(['merg:' + rk, 'post:' + rk + '_erg', 'img:' + rk + '_erg']);
      return antwort({ ok: true });
    }
    const platz = x => { const n = parseInt(x, 10); return n >= 1 && n <= 99 ? n : null; };
    const status = ['DNF', 'DSQ'].includes(body.status) ? body.status : '';
    const ziel = status ? null : platz(body.ziel);
    if (!status && !ziel) return fehler('Bitte den Zielplatz eintragen (oder DNF/DSQ wählen).');
    await s.schreib('merg:' + rk, { start: platz(body.start), ziel, status: status || 'FIN', punkte: Math.max(0, Math.min(999, parseInt(body.punkte, 10) || 0)), zeit: Date.now() });
    return antwort({ ok: true });
  }

  const m = pfad.match(/^\/api\/post\/([A-Za-z0-9_-]{1,200})\/(bild|freigeben|ueberspringen|jetzt|manuell|eigenesbild)$/);
  if (m && req.method === 'POST') {
    const [, id, aktion] = m;
    const z = (await s.lies('post:' + id)) || {};
    if (aktion === 'manuell') {
      if (body.an === false) { delete z.gepostet; } else { z.gepostet = { zeit: Date.now(), manuell: true }; z.fehler = ''; }
      await s.schreib('post:' + id, z);
      return antwort({ ok: true });
    }
    if (aktion === 'freigeben' || aktion === 'ueberspringen') {
      if (aktion === 'freigeben') z.freigegeben = body.an !== false;
      else z.uebersprungen = body.an !== false;
      if (body.an !== false) { z.fehler = ''; z.versuche = 0; }
      await s.schreib('post:' + id, z);
      return antwort({ ok: true });
    }
    const { p, plan, cfg, design } = await postAusPlan(s, id);
    if (!p) return fehler('Diesen Post gibt es im Streamkalender nicht (mehr).', 404);
    if (aktion === 'eigenesbild') {
      // Eigenes Bild (Gemini-App, ChatGPT-App, Screenshot …) für alle Posts dieses Rennens
      const roh = String(body.bild || '').replace(/^data:image\/\w+;base64,/, '');
      const u8 = new Uint8Array(Buffer.from(roh, 'base64'));
      const jpg = u8[0] === 0xff && u8[1] === 0xd8, png = u8[0] === 0x89 && u8[1] === 0x50;
      if (!(jpg || png) || u8.length < 1000 || u8.length > 1900000) return fehler('Bitte ein JPG oder PNG bis 1,9 MB.');
      const rk = rennKey(id);
      const bgv = ((await s.lies('bgv:' + rk)) || 0) + 1;
      await s.schreib('bgr:' + rk, u8);
      await s.schreib('bgv:' + rk, bgv);
      await s.schreib('bgm:' + rk, { quelle: ['gemini', 'chatgpt'].includes(body.herkunft) ? body.herkunft : 'eigen', prompt: '', modell: '', kiFehler: '' });
      const neu = await bildErstellen(env, s, p, design, cfg, false);
      // Die anderen Posts dieses Rennens (Ankündigung ↔ Story ↔ Ergebnis) gleich mitzeichnen
      for (const q of plan.filter(x => rennKey(x.id) === rk && x.id !== id)) {
        if (!((await s.lies('post:' + q.id)) || {}).gepostet) await bildErstellen(env, s, q, design, cfg, false);
      }
      return antwort({ ok: true, bild: `${env.ORIGIN}/bild/${id}/${neu.version}.jpg` });
    }
    if (aktion === 'bild') {
      const wunsch = { stimmung: body.stimmung in STIMMUNGEN ? body.stimmung : '', kamera: body.kamera in KAMERAS ? body.kamera : '' };
      const neu = await bildErstellen(env, s, p, design, cfg, !!body.neu, wunsch);
      return antwort({ ok: true, bild: `${env.ORIGIN}/bild/${id}/${neu.version}.jpg`, kiFehler: neu.kiFehler || '' });
    }
    if (aktion === 'jetzt') {
      if (z.gepostet) return fehler('Dieser Post ist schon auf Instagram.');
      z.versuche = 0; z.fehler = ''; await s.schreib('post:' + id, z);
      const neu = await veroeffentlichen(env, s, p, design, cfg);
      if (neu.fehler) return fehler(neu.fehler, 502);
      return antwort({ ok: true });
    }
  }
  return fehler('Unbekannte Anfrage.', 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      const b = url.pathname.match(/^\/bild\/([A-Za-z0-9_-]{1,200})\/\d+\.jpg$/);
      if (b && req.method === 'GET') {
        const jpg = await speicher(env).lies('img:' + b[1]);
        if (!jpg) return new Response('Kein Bild', { status: 404, headers: CORS });
        const h = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', ...CORS };
        if (url.searchParams.has('laden')) h['Content-Disposition'] = `attachment; filename="kreids888-${b[1]}.jpg"`;
        return new Response(jpg, { headers: h });
      }
      const th = url.pathname.match(/^\/thumb\/([A-Za-z0-9_-]{1,200})\.(jpg|png)$/);
      if (th && req.method === 'GET') return await thumbAntwort(env, th[1], th[2] === 'png');
      if (url.pathname === '/logo.png' && req.method === 'GET') {
        const s = speicher(env);
        const logo = await logoLaden(s, await ladeDesign(s));
        if (!logo) return new Response('Kein Logo', { status: 404, headers: CORS });
        return new Response(logo, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', ...CORS } });
      }
      if (url.pathname.startsWith('/api/')) return await api(req, env, url);
      // Nur zum Testen auf dem eigenen Rechner (TEST=1): Bild aus Beispieldaten zeichnen
      if (env.TEST === '1' && url.pathname === '/test/render' && req.method === 'POST') {
        const d = await req.json();
        const u8 = x => (x ? new Uint8Array(Buffer.from(x, 'base64')) : null);
        const design = { ...DESIGN_STANDARD, ...(d.design || {}) };
        const logo = d.logo ? await bildVerkleinern(u8(d.logo), 900) : null;
        const bg = d.bg ? await bildAlsJpeg(u8(d.bg), 1600) : null;
        if (d.thumb) { const t = await rendernThumb(d.post, design, bg, logo, !!d.download); return new Response(t.bild, { headers: { 'Content-Type': t.typ === 'png' ? 'image/png' : 'image/jpeg' } }); }
        return new Response(await rendern(d.post, design, bg, logo), { headers: { 'Content-Type': 'image/jpeg' } });
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
