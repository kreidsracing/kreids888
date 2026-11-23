// ═══════════════════════════════════════════════════════════
// Daten aus dem Kreids-Dashboard (kreids888-admin) laden und daraus die Post-Planung bauen.
//   /api/calendar → Streamkalender (SPR-Rennen live + eigene Einträge, nur kommende)
//   /api/results  → Rennergebnisse von SPR (über die iRacing-ID, nur finale Rennen)
// Posts: Ankündigung (Feed) X Tage vorher, Raceday-Story am Renntag, Ergebnis (Feed),
// Tabellenstand (Feed), Monatsbilanz (Feed), Meilenstein (Feed), Jetzt live (Story, sobald der Stream läuft).
// NEU (23.11.2026) 🏆 Saisonfinale: Das letzte Rennen einer SPR-Serie wird erkannt (post.finale). Ankündigung, Raceday-Story und Ergebnis
//   bekommen dann das goldene Schild „SAISONFINALE“ (zeichnet insta-bilder.js), der Text beginnt mit „🏆 SAISONFINALE 🏆“.
//   Die Zahl der Rennen je Serie kommt von SPR (api.snailpaceracing.org) und wird 6 Stunden gemerkt (Speicher: sprsaison).
// ═══════════════════════════════════════════════════════════
import { berlinZuMs, tageZurueck, minuten, berlin } from './zeit.js';
import { textMitTags } from './tags.js';

export const ADMIN = 'https://kreids888-admin.kreids.workers.dev';

async function json(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

export async function ladeDaten() {
  const [kal, erg] = await Promise.all([
    json(ADMIN + '/api/calendar'),
    json(ADMIN + '/api/results').catch(() => ({ results: [] }))
  ]);
  return {
    eintraege: Array.isArray(kal.entries) ? kal.entries : [],
    ergebnisse: Array.isArray(erg.results) ? erg.results : []
  };
}

// ─── 🏆 Saisonfinale ────────────────────────────────────────
export const SPR_API = 'https://api.snailpaceracing.org';
const SAISON_FRISCH = 6 * 3600000, SAISON_PAUSE = 10 * 60000, SAISON_MAX = 12;
const normName = t => String(t || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
// Serie eines Kalender-Eintrags: aus der Kennung „spr~<Serie>~<Runde>“ (passt zum Ergebnis), sonst ein eigenes Feld
export const ligaIdVon = e => { const m = String((e && e.uid) || '').match(/^spr~([A-Za-z0-9_-]{1,60})~\d+$/); return m ? m[1] : String((e && (e.ligaId || e.ligaID || e.liga)) || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60); };
const istReverse = k => !!k && (k.reverse != null ? !!k.reverse : /reverse/i.test(String(k.track || '') + ' ' + String(k.layout || '')));
// Aus den SPR-Daten einer Serie nur das merken, was fürs Finale gebraucht wird
export function saisonKlein(d) {
  const l = (d && d.liga) || {}, kal = ((d && d.kalender) || []).filter(k => k && k.nr != null);
  const st = l.startseite, art = st && st.art ? String(st.art) : kal.filter(k => k.dateRace).length === 1 ? 'event' : 'serie';
  return { id: String(l.id || ''), name: String(l.name || ''), numR: Number(l.numR) || 0, art, kal: kal.map(k => ({ nr: Number(k.nr), tag: String(k.dateRace || '').slice(0, 10), rev: istReverse(k) })) };
}
// Ist dieses Rennen das Saisonfinale? = letztes Rennen der Serie (bei Reverse Grid zählt der ganze letzte Abend). Events (ein einzelnes Rennen) haben kein Finale.
export function istFinale(saison, ligaId, nr, name, datum) {
  const n = Number(nr) || 0, alle = saison || {};
  if (!n) return false;
  let l = ligaId ? alle[ligaId] : null;
  if (!l && !ligaId) {   // ohne Kennung: über den Namen der Serie, und das Rennen muss an diesem Tag in ihrem Kalender stehen
    const pass = Object.values(alle).filter(x => x && normName(x.name) === normName(name) && x.kal.some(k => k.nr === n && k.tag === datum));
    if (pass.length === 1) l = pass[0];
  }
  if (!l || l.art === 'event' || !(l.numR > 1)) return false;
  if (n === l.numR) return true;
  const ich = l.kal.find(k => k.nr === n), folge = l.kal.find(k => k.nr === n + 1);
  return n + 1 === l.numR && !!folge && folge.rev && !!ich && !!ich.tag && folge.tag === ich.tag;
}
// Saison-Daten der Serien holen, die gerade im Kalender oder bei den frischen Ergebnissen vorkommen. Gemerkt für 6 Stunden;
// klappt die Abfrage nicht, bleibt der letzte Stand (und es wird frühestens nach 10 Minuten wieder gefragt).
export async function ladeSaison(s, daten, jetzt = Date.now()) {
  const alt = (await s.lies('sprsaison')) || {}, ligen = { ...(alt.ligen || {}) };
  const ids = new Set(); let ohne = false;
  for (const e of daten.eintraege || []) { if (!e || e.source !== 'spr') continue; const id = ligaIdVon(e); if (id) ids.add(id); else ohne = true; }
  for (const r of daten.ergebnisse || []) { if (!r || !r.ligaId || !r.date) continue; const t = berlinZuMs(String(r.date).slice(0, 10), '12:00'); if (isFinite(t) && t > jetzt - (ERG_TAGE + 2) * 86400000) ids.add(String(r.ligaId)); }
  const frisch = jetzt - (alt.zeit || 0) < SAISON_FRISCH, fehlt = [...ids].some(id => !ligen[id]) || (ohne && !alt.alle);
  if ((frisch && !fehlt) || jetzt - (alt.versucht || 0) < SAISON_PAUSE || (!ids.size && !ohne)) return ligen;
  const holen = async pfad => { const r = await fetch(SPR_API + pfad, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(pfad + ' → ' + r.status); return r.json(); };
  let alle = false;
  if (ohne) {   // Einträge ohne Kennung: alle laufenden Serien von SPR (für den Vergleich über den Namen)
    try { for (const l of ((await holen('/api/index')).ligen || [])) if (l && l.id && !l.archiviert) ids.add(String(l.id)); alle = true; } catch (e) { /* bleibt beim alten Stand */ }
  }
  const liste = [...ids].slice(0, SAISON_MAX);
  let ok = 0;
  await Promise.all(liste.map(async id => {
    try { const d = await holen('/api/liga/' + encodeURIComponent(id)); if (d && d.liga) { ligen[id] = saisonKlein(d); ok++; } } catch (e) { /* bleibt beim alten Stand */ }
  }));
  for (const id of Object.keys(ligen)) if (!ids.has(id)) delete ligen[id];   // was nicht mehr gebraucht wird, fliegt raus
  const voll = ok === liste.length && (!ohne || alle);
  await s.schreib('sprsaison', { zeit: voll ? jetzt : (alt.zeit || 0), versucht: jetzt, alle: ohne ? (alle || !!alt.alle) : false, ligen });
  return ligen;
}

const sicher = s => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
// Schlüssel eines Rennens: SPR-Rennen über Serie + Runde + Tag (passt zum Ergebnis), sonst über den Eintrag
export const rennSchluessel = (uid, datum) => sicher(`${uid}~${datum}`);
export const rennKey = id => String(id).replace(/_(ank|story|erg|tab|meilen|live|monat)$/, '');
// Jetzt live: frühestens 45 Min. vor „Live ab“, spätestens 3 Std. danach
export const LIVE_VOR = 45 * 60000, LIVE_BIS = 3 * 3600000;

// Planung: alle Posts der nächsten 4 Wochen (+ frische Ergebnisse der letzten 5 Tage)
export const ERG_TAGE = 5;
export function bauePlan(daten, cfg, jetzt) {
  const posts = [];
  const bis = jetzt + 28 * 86400000;
  const finale = (ligaId, nr, name, datum) => istFinale(daten.saison, ligaId, nr, name, datum);   // 🏆 Saisonfinale (nur SPR-Serien)
  for (const e of daten.eintraege) {
    if (!e || e.racing === false || !e.date || !e.time) continue;
    const art = e.type || 'Rennen';
    if (!cfg.typen.includes(art)) continue;
    const startMs = berlinZuMs(e.date, e.time);
    if (!isFinite(startMs) || startMs < jetzt - 6 * 3600000) continue;
    const spr = e.source === 'spr';
    // SPR: Serverstart + Training = Quali, + Quali = Rennen. Eigene Einträge: die Uhrzeit ist „Live ab“.
    const qualiMs = startMs + (spr ? minuten(e.train) * 60000 : 0);
    const rennMs = qualiMs + (spr ? minuten(e.quali) * 60000 : 0);
    const liveMs = !spr ? startMs : cfg.liveAb === 'rennen' ? rennMs : cfg.liveAb === 'start' ? startMs : qualiMs;
    const datum = String(e.date).slice(0, 10);
    const key = rennSchluessel(e.uid || e.id || e.title, datum);
    const basis = {
      key, art, spr, titel: e.title || '', serie: e.series || '', nr: spr ? Number(e.nr) || 0 : 0,
      track: e.track || '', layout: e.layout || '', datum, startMs, qualiMs, rennMs, liveMs,
      klassen: Array.isArray(e.klassen) ? e.klassen : [], kalenderBild: e.image || '', reverseGrid: !!e.reverseGrid,
      finale: spr && finale(ligaIdVon(e), e.nr, e.series, datum)
    };
    if (cfg.ankuendigung.aktiv) {
      const tage = Math.max(0, cfg.ankuendigung.tage | 0);
      let postMs = berlinZuMs(tageZurueck(datum, tage), cfg.ankuendigung.zeit);
      if (postMs > startMs - 3600000) postMs = startMs - 3 * 3600000;
      // nur bis Ende des Post-Tages („in 2 Tagen“ stimmt danach nicht mehr), höchstens bis zum Start
      const ankBis = Math.min(startMs, berlinZuMs(tageZurueck(berlin(postMs).datum, -1), '00:00'));
      if (postMs <= bis && jetzt < ankBis) posts.push({ ...basis, typ: 'ank', tage, postMs, id: key + '_ank' });
    }
    if (cfg.story.aktiv) {
      let postMs = berlinZuMs(datum, cfg.story.zeit);
      if (postMs > startMs - 1800000) postMs = startMs - 2 * 3600000;
      if (postMs <= bis && jetzt < liveMs) posts.push({ ...basis, typ: 'story', postMs, id: key + '_story' });
    }
    if (cfg.live && cfg.live.aktiv && liveMs <= bis && jetzt < liveMs + LIVE_BIS) posts.push({ ...basis, typ: 'live', postMs: liveMs, liveBisMs: liveMs + LIVE_BIS, id: key + '_live' });
  }
  // Ergebnisse: nur Rennen der letzten 5 Tage (sonst würde beim Start die ganze Historie gepostet)
  if (cfg.ergebnis.aktiv) {
    const ergPost = (key, datum, r, extra) => {
      const tagMs = berlinZuMs(datum, '12:00');
      if (!isFinite(tagMs) || tagMs < jetzt - ERG_TAGE * 86400000 || tagMs > jetzt + 86400000) return;
      // Post-Zeit: am Tag nach dem Rennen zur eingestellten Uhrzeit (wird das Ergebnis erst später eingetragen: sofort)
      const postMs = berlinZuMs(tageZurueck(datum, -1), cfg.ergebnis.zeit);
      if (jetzt > postMs + 2 * 86400000) return;   // alte Ergebnisse postet keiner mehr
      posts.push({
        key, typ: 'erg', art: 'Rennen', spr: true, id: key + '_erg', postMs,
        titel: '', serie: r.serie || '', nr: Number(r.nr) || 0, track: r.track || '', layout: '', datum,
        startMs: tagMs, liveMs: tagMs, klassen: [], kalenderBild: '', reverseGrid: false,
        ergebnis: { start: r.start || null, ziel: r.finish || null, status: r.status || '', punkte: r.pts || 0, inc: r.inc || 0, runden: r.laps || 0 },
        ...extra
      });
    };
    for (const r of daten.ergebnisse) {
      if (!r || !r.date) continue;
      const datum = String(r.date).slice(0, 10);
      const key = r.ligaId && r.nr ? rennSchluessel(`spr~${r.ligaId}~${r.nr}`, datum) : rennSchluessel(`erg~${r.track}`, datum);
      ergPost(key, datum, r, r.ligaId && r.nr && finale(String(r.ligaId), r.nr, r.serie, datum) ? { finale: true } : {});
    }
    // Von Hand eingetragene Ergebnisse (eigene Rennen aus dem Streamkalender)
    for (const x of daten.eigene || []) {
      const rn = x.rennen || {}, e = x.ergebnis || {};
      ergPost(x.rk, rn.datum, {
        serie: rn.serie || rn.titel, nr: 0, track: rn.track || rn.titel, start: e.start, finish: e.ziel, status: e.status, pts: e.punkte
      }, { spr: false, titel: rn.titel || '', layout: rn.layout || '', kalenderBild: rn.kalenderBild || '', eigenesErgebnis: true });
    }
  }
  // SPR-Ergebnisse chronologisch (für Tabellenstand und Meilensteine)
  const sprErg = daten.ergebnisse.filter(r => r && r.date).map(r => ({ ...r, datum: String(r.date).slice(0, 10) }))
    .sort((a, b) => a.datum.localeCompare(b.datum) || (Number(a.nr) || 0) - (Number(b.nr) || 0));
  const imFenster = datum => { const t = berlinZuMs(datum, '12:00'); return isFinite(t) && t >= jetzt - ERG_TAGE * 86400000 && t <= jetzt + 86400000; };
  const ergBasis = (r, typ, postMs, extra) => {
    const key = rennSchluessel(`spr~${r.ligaId}~${r.nr}`, r.datum), tagMs = berlinZuMs(r.datum, '12:00');
    return { key, typ, art: 'Rennen', spr: true, id: key + '_' + typ, postMs, titel: '', serie: r.serie || '', nr: Number(r.nr) || 0, track: r.track || '', layout: '', datum: r.datum,
      startMs: tagMs, liveMs: tagMs, klassen: [], kalenderBild: '', reverseGrid: false, ligaId: String(r.ligaId || ''), ...extra };
  };
  // Tabellenstand: pro Serie nur nach dem letzten Rennen, 2 Tage nach dem Rennen (= Tag nach dem Ergebnis)
  if (cfg.tabelle && cfg.tabelle.aktiv) {
    const letzte = new Map();
    for (const r of sprErg) if (r.ligaId && r.nr) letzte.set(String(r.ligaId), r);
    for (const r of letzte.values()) {
      if (!imFenster(r.datum)) continue;
      const postMs = berlinZuMs(tageZurueck(r.datum, -2), cfg.tabelle.zeit);
      if (jetzt > postMs + 2 * 86400000) continue;
      posts.push(ergBasis(r, 'tab', postMs, {}));
    }
  }
  // Meilensteine (nur SPR): 10./25./50./75./100. Rennen …, 1./5./10. Sieg …, 1./10./25. Podium …
  if (cfg.meilen && cfg.meilen.aktiv) {
    let rennen = 0, siege = 0, podien = 0;
    for (const r of sprErg) {
      rennen++;
      const sieg = r.finish === 1, podium = !!r.finish && r.finish <= 3;
      if (sieg) siege++;
      if (podium) podien++;
      if (!imFenster(r.datum)) continue;
      const t = sieg && meilensteinSiege(siege) ? { zahl: siege, wort: 'Sieg' } : podium && meilensteinPodien(podien) ? { zahl: podien, wort: 'Podium' }
        : meilensteinRennen(rennen) ? { zahl: rennen, wort: 'Rennen' } : null;
      if (!t) continue;
      const postMs = berlinZuMs(tageZurueck(r.datum, -1), cfg.meilen.zeit);
      if (jetzt > postMs + 2 * 86400000) continue;
      posts.push(ergBasis(r, 'meilen', postMs, { ...t, zusatz: 'bei Snail Pace Racing' }));
    }
  }
  // Monatsbilanz: am 1. für den Monat davor (erst wenn der Monat vorbei ist), nur mit Rennen
  if (cfg.monat && cfg.monat.aktiv) {
    const erster = berlin(jetzt).datum.slice(0, 8) + '01', postMs = berlinZuMs(erster, cfg.monat.zeit);
    const monat = tageZurueck(erster, 1).slice(0, 7);
    const liste = [
      ...sprErg.filter(r => r.datum.startsWith(monat)).map(r => ({ finish: r.finish || null, pkt: (r.pts || 0) - (r.straf || 0), track: r.track || '', serie: r.serie || '' })),
      ...(daten.eigene || []).filter(x => String(x.rennen.datum || '').startsWith(monat))
        .map(x => ({ finish: (x.ergebnis || {}).ziel || null, pkt: (x.ergebnis || {}).punkte || 0, track: x.rennen.track || x.rennen.titel || '', serie: x.rennen.serie || x.rennen.titel || '' }))
    ];
    if (liste.length && jetzt <= postMs + 2 * 86400000) {
      const fin = liste.filter(x => x.finish), b = fin.slice().sort((x, y) => x.finish - y.finish || y.pkt - x.pkt)[0];
      const werte = {
        rennen: liste.length, siege: fin.filter(x => x.finish === 1).length, podien: fin.filter(x => x.finish <= 3).length, top5: fin.filter(x => x.finish <= 5).length,
        punkte: liste.reduce((n, x) => n + x.pkt, 0), schnitt: fin.length ? Math.round(fin.reduce((n, x) => n + x.finish, 0) / fin.length * 10) / 10 : 0
      };
      const key = sicher('monat~' + monat);
      posts.push({
        key, typ: 'monat', art: 'Monatsbilanz', spr: false, id: key + '_monat', postMs, titel: 'Monatsbilanz', serie: '', nr: 0, track: '', layout: '', datum: erster,
        startMs: postMs, liveMs: postMs, klassen: [], kalenderBild: '', reverseGrid: false, monat, werte, bestes: b ? { platz: b.finish, track: b.track, serie: b.serie } : null
      });
    }
  }
  // Wochenplan (Story): sonntags zur eingestellten Uhrzeit für die Woche danach (Mo–So), nur wenn Termine drin sind
  if (cfg.woche && cfg.woche.aktiv) {
    const heute = berlin(jetzt).datum;
    const bisSonntag = (7 - new Date(heute + 'T12:00:00Z').getUTCDay()) % 7;
    for (let w = 0; w < 2; w++) {
      const sonntag = tageZurueck(heute, -(bisSonntag + 7 * w));
      const postMs = berlinZuMs(sonntag, cfg.woche.zeit);
      if (postMs < jetzt - 6 * 3600000) continue;
      const montag = tageZurueck(sonntag, -1), bisDatum = tageZurueck(sonntag, -7);
      const liste = [];
      for (const e of daten.eintraege) {
        if (!e || e.racing === false || !e.date || !e.time) continue;
        const datum = String(e.date).slice(0, 10);
        if (datum < montag || datum > bisDatum) continue;
        const spr = e.source === 'spr', startMs = berlinZuMs(datum, e.time);
        if (!isFinite(startMs)) continue;
        const qualiMs = startMs + (spr ? minuten(e.train) * 60000 : 0), rennMs = qualiMs + (spr ? minuten(e.quali) * 60000 : 0);
        const liveMs = !spr ? startMs : cfg.liveAb === 'rennen' ? rennMs : cfg.liveAb === 'start' ? startMs : qualiMs;
        liste.push({ datum, liveMs, art: e.type || 'Rennen', titel: e.title || '', serie: e.series || '', track: e.track || '', nr: spr ? Number(e.nr) || 0 : 0, spr, reverseGrid: !!e.reverseGrid });
      }
      if (!liste.length) continue;
      liste.sort((a, b) => a.liveMs - b.liveMs);
      const key = sicher('woche~' + montag), ab = berlinZuMs(montag, '00:00');
      posts.push({
        key, typ: 'woche', art: 'Wochenplan', spr: false, id: key + '_story', postMs, titel: 'Wochenplan', serie: '', nr: 0, track: '', layout: '',
        datum: montag, bisDatum, startMs: ab, liveMs: ab, klassen: [], kalenderBild: '', reverseGrid: false, liste: liste.slice(0, 7), pose: cfg.woche.pose || ''
      });
    }
  }
  posts.sort((x, y) => x.postMs - y.postMs);
  return posts;
}

// Meilenstein-Schwellen
export const meilensteinRennen = n => n === 10 || (n <= 100 && n % 25 === 0) || n % 50 === 0;
export const meilensteinSiege = n => n === 1 || n === 5 || (n <= 30 && n % 5 === 0) || n % 25 === 0;
export const meilensteinPodien = n => n === 1 || n === 10 || n % 25 === 0;

// Eigene Rennen (nicht SPR) aus dem Streamkalender: werden gemerkt, damit nach dem Rennen
// „Ergebnis eintragen“ möglich ist – auch wenn der Kalender das Rennen dann schon ausblendet
export function eigeneRennen(daten, jetzt) {
  const out = {};
  for (const e of daten.eintraege) {
    if (!e || e.source === 'spr' || e.racing === false || (e.type || 'Rennen') !== 'Rennen' || !e.date || !e.time) continue;
    const startMs = berlinZuMs(e.date, e.time);
    if (!isFinite(startMs) || startMs < jetzt - ERG_TAGE * 86400000 || startMs > jetzt + 14 * 86400000) continue;
    const datum = String(e.date).slice(0, 10);
    out[rennSchluessel(e.uid || e.id || e.title, datum)] = {
      titel: e.title || '', serie: e.series || '', track: e.track || '', layout: e.layout || '', datum, startMs, kalenderBild: e.image || ''
    };
  }
  return out;
}

// Fingerabdruck der Bild-Inhalte: ändert sich etwas, zeichnet das Dashboard das Bild neu.
// ZEICHEN_VERSION hochzählen, wenn sich das Aussehen der Bilder (insta-bilder.js) ändert.
const ZEICHEN_VERSION = 2;
export const NEUE_ARTEN = ['tab', 'monat', 'meilen', 'live'];
export const FINALE_ARTEN = ['ank', 'story', 'erg'];   // 🏆 diese Posts zeigen das Saisonfinale
export const FINALE_ZEILE = '🏆 SAISONFINALE 🏆';
export function inhaltSchluessel(post, design, cfg, bgv = 0) {
  return JSON.stringify([bgv, bgv ? '' : post.kalenderBild, post.typ, post.art, post.serie, post.nr, post.track, post.layout, post.titel, post.datum, post.liveMs, post.tage,
    post.klassen, post.reverseGrid, post.ergebnis || null, design.farbe1, design.farbe2, design.logoVersion || 0, design.liveText, design.team, design.teamSchwarz, design.logoAn, design.teamAn, design.spruchAn, design.layout || null, post.spruch || '', cfg.liveAb, post.liste || null, post.pose || null, ZEICHEN_VERSION,
    ...(NEUE_ARTEN.includes(post.typ) ? [post.ligaId || '', post.werte || null, post.bestes || null, post.monat || '', post.zahl || 0, post.wort || '', post.zusatz || ''] : []),
    ...(post.finale && FINALE_ARTEN.includes(post.typ) ? ['finale'] : [])]);
}
// Kurzer Hash (FNV-1a) für Links mit ?h=
export function kurzHash(t) {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

// Platz als Text: „P3“, „DNF“ …
export function platzText(erg) {
  if (!erg) return '';
  if (erg.ziel) return 'P' + erg.ziel;
  return String(erg.status || 'DNF').toUpperCase();
}
function deltaText(erg) {
  if (!erg || !erg.ziel || !erg.start) return '';
  const d = erg.start - erg.ziel;
  return d > 0 ? `▲ ${d} ${d === 1 ? 'Platz' : 'Plätze'} gutgemacht` : d < 0 ? `▼ ${-d} ${d === -1 ? 'Platz' : 'Plätze'} verloren` : 'Position gehalten';
}

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
// Looks der neuen Posts (zeichnet insta-bilder.js), wechseln der Reihe nach
export const LOOKS = ['kreids', 'kneon', 'khell'];
// Von Hand geänderte Felder (Dashboard „Bearbeiten“) – erlaubte Schlüssel
export const EDIT_FELDER = ['titelText', 'serieText', 'unterText', 'standText', 'monatText', 'jahrText', 'bestesText', 'bestesSerie', 'fussText', 'wort', 'zusatz', 'woText', 'datumText',
  'wort1', 'wort2', 'track', 'serie', 'layout', 'rennen', 'siege', 'podien', 'top5', 'punkte', 'schnitt', 'zahl', 'start', 'ziel'];
// Änderungen auch für den Text unter dem Post übernehmen (Serie, Strecke, Zahlen)
function mitEdit(post, edit) {
  const f = (edit && edit.felder) || {}, da = k => f[k] != null && String(f[k]).trim() !== '';
  const p = { ...post };
  if (da('serie')) p.serie = f.serie;
  if (da('track')) p.track = f.track;
  if (post.typ === 'erg') { p.ergebnis = { ...(post.ergebnis || {}) }; for (const k of ['start', 'ziel', 'punkte']) if (da(k)) p.ergebnis[k] = Number(f[k]) || f[k]; }
  if (post.typ === 'monat') { p.werte = { ...(post.werte || {}) }; for (const k of ['rennen', 'siege', 'podien', 'top5', 'punkte', 'schnitt']) if (da(k)) p.werte[k] = f[k]; }
  if (post.typ === 'meilen') { if (da('zahl')) p.zahl = f.zahl; if (da('wort')) p.wort = f.wort; if (da('zusatz')) p.zusatz = f.zusatz; }
  return p;
}
// Bildunterschrift. Zeilen, deren Platzhalter leer bleibt, fallen weg.
// tw = Werte des Tabellenstands (rechnet das Dashboard beim Zeichnen: { platz, punkte, abstand })
export function bildtext(post, cfg, design, tw, edit) {
  post = mitEdit(post, edit);
  const eigen0 = edit && typeof edit.text === 'string' && edit.text.trim() ? edit.text.trim().slice(0, 2200) : '';
  // Wochenplan und „Jetzt live“ sind sonst Storys – als Beitrag bekommen sie einen kurzen eigenen Text
  // Pflicht-Hashtags (#simracing #iracing #gt3 #crash) immer am Ende der ersten Zeile (tags.js)
  if (post.typ === 'woche') return textMitTags(eigen0 || 'Meine Streams diese Woche 🗓 Alle Termine: Link in Bio\n\n#simracing #iracing #kreids888');
  if (post.typ === 'live') return textMitTags(eigen0 || '🔴 Jetzt live! Schau rein – Link in Bio\n\n#simracing #iracing #kreids888');
  const s = berlin(post.startMs), tage = post.tage | 0;
  const strecke = [post.track, post.layout].filter(Boolean).join(' – ') || post.titel;
  const erg = post.ergebnis || null;
  const w = {
    countdown: tage === 0 ? 'Heute' : tage === 1 ? 'Morgen' : `In ${tage} Tagen`,
    serie: post.serie || post.titel,
    titel: post.titel,
    strecke,
    runde: post.nr ? `Runde ${post.nr}` : '',
    datum: s.tag + s.jahr,
    wochentag: s.wochentag,
    start: s.zeit,
    live: berlin(post.liveMs).zeit,
    livezeile: design.liveText || '',
    klassen: post.klassen.join(' · '),
    platz: erg ? platzText(erg) : '',
    startplatz: erg && erg.start ? 'P' + erg.start : '',
    ziel: erg && erg.ziel ? 'P' + erg.ziel : '',
    delta: deltaText(erg),
    punkte: erg && erg.punkte ? String(erg.punkte) : '',
    finale: post.finale && FINALE_ARTEN.includes(post.typ) ? FINALE_ZEILE : ''
  };
  if (post.typ === 'tab') {
    const t = tw || {};
    w.platz = t.platz ? 'P' + t.platz : '';
    w.punkte = t.platz && t.punkte != null ? String(t.punkte) : '';
    w.abstand = !t.platz ? '' : t.platz === 1 ? 'Tabellenführer 🏆' : t.abstand > 0 ? `${t.abstand} ${t.abstand === 1 ? 'Punkt' : 'Punkte'} hinter P1` : 'punktgleich mit P1';
  }
  if (post.typ === 'monat') {
    const v = post.werte || {}, [j, m] = String(post.monat || '').split('-').map(Number), b = post.bestes;
    Object.assign(w, { monat: `${MONATE[(m || 1) - 1]} ${j || ''}`.trim(), rennen: String(v.rennen || 0), siege: String(v.siege || 0), podien: String(v.podien || 0), top5: String(v.top5 || 0),
      punkte: String(v.punkte || 0), schnitt: v.schnitt ? String(v.schnitt).replace('.', ',') : '', bestes: b && b.platz ? `P${b.platz} · ${b.track || b.serie}` : '' });
  }
  if (post.typ === 'meilen') w.meilenstein = `${post.zahl}. ${post.wort}${post.zusatz ? ' ' + post.zusatz : ''}`;
  const eigen = edit && typeof edit.text === 'string' && edit.text.trim() ? edit.text : '';   // eigener Text für diesen Post
  let vorlage = String(eigen || { erg: cfg.textErgebnis, tab: cfg.textTabelle, monat: cfg.textMonat, meilen: cfg.textMeilen }[post.typ] || cfg.text || '');
  // 🏆 Saisonfinale: steht vorn in der ersten Zeile, außer die Vorlage hat {finale}, nennt das Saisonfinale schon selbst oder es ist ein eigener Text für diesen Post
  if (w.finale && !eigen && !/\{finale\}|saisonfinale/i.test(vorlage)) vorlage = vorlage.replace(/^(\s*)/, '$1{finale} ');
  return textMitTags(vorlage.split('\n').map(z => {
    let leer = false, fin = false;
    const r = z.replace(/\{(\w+)\}/g, (m, k) => { if (!(k in w)) return m; if (k === 'finale') fin = true; else if (!w[k]) leer = true; return w[k]; });   // {finale} ist außerhalb des Finales einfach leer, die Zeile bleibt
    if (leer) return null;
    if (!fin) return r;
    const sauber = r.replace(/[ \t]{2,}/g, ' ').trim();
    return sauber ? sauber : null;   // stand in der Zeile nur {finale} und es ist kein Finale: die Zeile fällt weg
  }).filter(z => z !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim()).slice(0, 2200);
}
