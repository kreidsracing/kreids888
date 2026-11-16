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
import { konto, posten, tokenVerlaengern, verlaengerbar } from './insta.js';
import { istUhrzeit } from './zeit.js';

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
  logoUrl: 'https://i.postimg.cc/cC8FkHnv/kreidslogo-twitch-u-yt-3.png', logoVersion: 1,
  logoGroesse: 100, team: '', teamGroesse: 100, teamSchwarz: true   // Größen in Prozent, Team-Bild aus kreids888.com/team/bilder
};
const KI_PRO_TAG = 10;   // FLUX.2 klein ≈ 400 Neuronen pro Bild → bleibt sicher im Gratiskontingent (10.000/Tag)
const BILD_FEHLT = 'Bild fehlt noch: im Dashboard den Reiter „Instagram“ einmal öffnen, dann wird es gezeichnet.';

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
  // 1. Fällige Posts senden (nur mit fertigem Bild aus dem Dashboard)
  for (const p of plan) {
    const z = st['post:' + p.id] || {};
    if (z.gepostet || z.uebersprungen || (z.versuche || 0) >= 3) continue;
    if (p.postMs <= jetzt && (cfg.modus === 'auto' || z.freigegeben)) await veroeffentlichen(env, s, p, design, cfg);
  }
  // 2. KI-Hintergründe für die Rennen der nächsten 48 Stunden (höchstens 2 pro Lauf)
  let ki = 2;
  const gesehen = new Set();
  for (const p of plan) {
    if (p.postMs - jetzt > 48 * 3600000 || ki <= 0) break;
    const rk = rennKey(p.id);
    if (gesehen.has(rk) || p.kalenderBild || (st['post:' + p.id] || {}).gepostet) continue;
    gesehen.add(rk);
    if (await s.lies('bgv:' + rk)) continue;
    const m = await s.lies('bgm:' + rk);
    if (m && m.kiFehler && jetzt - (m.zeit || 0) < 6 * 3600000) continue;
    ki--;
    await hintergrundKI(env, s, p, design, cfg, null, false);
  }
  // 3. Token verlängern
  await tokenPflege(env, s);
  // 4. Aufräumen: Einträge älter als 14 Tage, alte KI-Tageszähler, Reste der alten Version (th:, thb:, nz:, nb:)
  const weg = [];
  const alt = ms => !ms || ms < jetzt - 14 * 86400000;
  for (const [k, z] of Object.entries(st)) if (z && z.postMs && alt(z.postMs)) weg.push(k, 'img:' + k.slice(5));
  for (const [k, m] of Object.entries(await s.liste('bgm:'))) if (alt(m && m.startMs)) { const rk = k.slice(4); weg.push(k, 'bgr:' + rk, 'bgv:' + rk); }
  for (const [k, r] of Object.entries(await s.liste('renn:'))) if (alt(r && r.startMs)) weg.push(k, 'merg:' + k.slice(5));
  for (const [k, t] of Object.entries(await s.liste('thr:'))) if (alt(t && t.startMs)) weg.push(k);
  for (const [k, t] of Object.entries(await s.liste('kbu:'))) if (alt(t && t.startMs)) weg.push(k);
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
  if (z.fehler && z.fehler !== BILD_FEHLT) return 'fehler';
  if (cfg.modus === 'freigabe' && !z.freigegeben) return 'wartet';
  return 'geplant';
}
const QUELLE = { eigen: 'Eigenes Bild', gemini: 'Gemini-App', chatgpt: 'ChatGPT-App', ki: 'Cloudflare-KI' };

async function stand(env, s) {
  const jetzt = Date.now();
  const tag = new Date().toISOString().slice(0, 10);
  const [cfg, design, st, lauf, kiHeute, bgvs, bgms, kbus, thrs, vorlage] = await Promise.all([ladeCfg(s), ladeDesign(s), s.liste('post:'), s.lies('lauf'),
    s.lies('ki:' + tag), s.liste('bgv:'), s.liste('bgm:'), s.liste('kbu:'), s.liste('thr:'), s.lies('thumbvorlage')]);
  const daten = await datenLaden(s, jetzt);
  const plan = bauePlan(daten, cfg, jetzt);
  const k = await kontoLesen(env, s, false);
  // Link des Kalender-Bilds pro Rennen merken (für /hintergrund/:rennen)
  for (const p of plan) {
    const rk = rennKey(p.id), alt = kbus['kbu:' + rk];
    if (p.kalenderBild && (!alt || alt.url !== p.kalenderBild)) { const neu = { url: p.kalenderBild, startMs: p.startMs }; await s.schreib('kbu:' + rk, neu); kbus['kbu:' + rk] = neu; }
  }
  const posts = plan.map(p => {
    const z = st['post:' + p.id] || {};
    const rk = rennKey(p.id);
    const bgv = bgvs['bgv:' + rk] || 0;
    const m = bgms['bgm:' + rk] || {};
    const soll = kurzHash(inhaltSchluessel(p, design, cfg, bgv));
    return {
      id: p.id, typ: p.typ, art: p.art, spr: p.spr, titel: p.titel, serie: p.serie, nr: p.nr, track: p.track, layout: p.layout, datum: p.datum,
      postMs: p.postMs, startMs: p.startMs, qualiMs: p.qualiMs || p.startMs, rennMs: p.rennMs || p.startMs, liveMs: p.liveMs, tage: p.tage || 0,
      klassen: p.klassen, reverseGrid: p.reverseGrid,
      ergebnis: p.ergebnis || null, platz: p.ergebnis ? platzText(p.ergebnis) : '', eigenesErgebnis: !!p.eigenesErgebnis,
      status: status(z, cfg), freigegeben: !!z.freigegeben, fehler: z.fehler || '', kiFehler: bgv ? '' : (m.kiFehler || ''),
      gepostet: z.gepostet || null,
      bild: z.version ? `${env.ORIGIN}/bild/${p.id}/${z.version}.jpg` : '',
      soll, veraltet: !!z.version && z.hash !== soll,
      hg: bgv ? `${env.ORIGIN}/hintergrund/${rk}?v=${bgv}` : p.kalenderBild ? `${env.ORIGIN}/hintergrund/${rk}?k=${kurzHash(p.kalenderBild)}` : '',
      bildQuelle: bgv ? (QUELLE[m.quelle] || '') + (m.modell ? ' (' + m.modell + ')' : '') : p.kalenderBild ? 'Bild aus dem Streamkalender' : '',
      rennKey: rk,
      thumb: thrs['thr:' + rk] || null,
      autos: autos(p, design.fahrzeuge || ''),
      text: p.typ === 'story' ? '' : bildtext(p, cfg, design)
    };
  });
  return {
    cfg, design: { ...design, logoBild: design.logoUrl ? `${env.ORIGIN}/logo.png?v=${kurzHash(design.logoUrl)}` : '' },
    posts, offen: daten.offen || [], thumbVorlage: vorlage || null,
    konto: { verbunden: !!k.verbunden, username: k.username || '', fehler: k.fehler || '' },
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
    const groesse = v => Math.max(30, Math.min(200, Math.round(Number(v) || 100)));
    if (body.logoGroesse !== undefined) neu.logoGroesse = groesse(body.logoGroesse);
    if (body.teamGroesse !== undefined) neu.teamGroesse = groesse(body.teamGroesse);
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

  const m = pfad.match(/^\/api\/post\/([A-Za-z0-9_-]{1,200})\/(fertig|bild|freigeben|ueberspringen|jetzt|manuell|eigenesbild)$/);
  if (m && req.method === 'POST') {
    const [, id, aktion] = m;
    const z = (await s.lies('post:' + id)) || {};
    if (aktion === 'manuell' || aktion === 'freigeben' || aktion === 'ueberspringen') {
      const body = await json();
      if (aktion === 'manuell') {
        if (body.an === false) delete z.gepostet; else { z.gepostet = { zeit: Date.now(), manuell: true }; z.fehler = ''; }
      } else {
        if (aktion === 'freigeben') z.freigegeben = body.an !== false; else z.uebersprungen = body.an !== false;
        if (body.an !== false) { z.fehler = z.version ? '' : z.fehler; z.versuche = 0; }
      }
      await s.schreib('post:' + id, z);
      return antwort({ ok: true });
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
      z.postMs = p.postMs;
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
      // Fertiges Post-Bild (für Instagram und die Vorschau)
      const b = url.pathname.match(/^\/bild\/([A-Za-z0-9_-]{1,200})\/\d+\.jpg$/);
      if (b && req.method === 'GET') {
        const jpg = await speicher(env).lies('img:' + b[1]);
        if (!jpg) return new Response('Kein Bild', { status: 404, headers: CORS });
        const h = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', ...CORS };
        if (url.searchParams.has('laden')) h['Content-Disposition'] = `attachment; filename="kreids888-${b[1]}.jpg"`;
        return new Response(jpg, { headers: h });
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
