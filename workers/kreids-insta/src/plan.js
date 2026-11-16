// ═══════════════════════════════════════════════════════════
// Daten aus dem Kreids-Dashboard (kreids888-admin) laden und daraus die Post-Planung bauen.
//   /api/calendar → Streamkalender (SPR-Rennen live + eigene Einträge, nur kommende)
//   /api/results  → Rennergebnisse von SPR (über die iRacing-ID, nur finale Rennen)
// Posts: Ankündigung (Feed) X Tage vorher, Raceday-Story am Renntag, Ergebnis (Feed).
// ═══════════════════════════════════════════════════════════
import { berlinZuMs, tageZurueck, minuten, berlin } from './zeit.js';

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

const sicher = s => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
// Schlüssel eines Rennens: SPR-Rennen über Serie + Runde + Tag (passt zum Ergebnis), sonst über den Eintrag
export const rennSchluessel = (uid, datum) => sicher(`${uid}~${datum}`);
export const rennKey = id => String(id).replace(/_(ank|story|erg)$/, '');

// Planung: alle Posts der nächsten 3 Wochen (+ frische Ergebnisse der letzten 5 Tage)
export const ERG_TAGE = 5;
export function bauePlan(daten, cfg, jetzt) {
  const posts = [];
  const bis = jetzt + 21 * 86400000;
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
      klassen: Array.isArray(e.klassen) ? e.klassen : [], kalenderBild: e.image || '', reverseGrid: !!e.reverseGrid
    };
    if (cfg.ankuendigung.aktiv) {
      const tage = Math.max(0, cfg.ankuendigung.tage | 0);
      let postMs = berlinZuMs(tageZurueck(datum, tage), cfg.ankuendigung.zeit);
      if (postMs > startMs - 3600000) postMs = startMs - 3 * 3600000;
      if (postMs <= bis && postMs >= jetzt - 30 * 60000) posts.push({ ...basis, typ: 'ank', tage, postMs, id: key + '_ank' });
    }
    if (cfg.story.aktiv) {
      let postMs = berlinZuMs(datum, cfg.story.zeit);
      if (postMs > startMs - 1800000) postMs = startMs - 2 * 3600000;
      if (postMs <= bis && jetzt < startMs - 30 * 60000) posts.push({ ...basis, typ: 'story', postMs, id: key + '_story' });
    }
  }
  // Ergebnisse: nur Rennen der letzten 5 Tage (sonst würde beim Start die ganze Historie gepostet)
  if (cfg.ergebnis.aktiv) {
    const ergPost = (key, datum, r, extra) => {
      const tagMs = berlinZuMs(datum, '12:00');
      if (!isFinite(tagMs) || tagMs < jetzt - ERG_TAGE * 86400000 || tagMs > jetzt + 86400000) return;
      // Post-Zeit: am Tag nach dem Rennen zur eingestellten Uhrzeit (wird das Ergebnis erst später eingetragen: sofort)
      const postMs = berlinZuMs(tageZurueck(datum, -1), cfg.ergebnis.zeit);
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
      ergPost(key, datum, r, {});
    }
    // Von Hand eingetragene Ergebnisse (eigene Rennen aus dem Streamkalender)
    for (const x of daten.eigene || []) {
      const rn = x.rennen || {}, e = x.ergebnis || {};
      ergPost(x.rk, rn.datum, {
        serie: rn.serie || rn.titel, nr: 0, track: rn.track || rn.titel, start: e.start, finish: e.ziel, status: e.status, pts: e.punkte
      }, { spr: false, titel: rn.titel || '', layout: rn.layout || '', kalenderBild: rn.kalenderBild || '', eigenesErgebnis: true });
    }
  }
  // Wochenplan (Story): sonntags zur eingestellten Uhrzeit für die Woche danach (Mo–So), nur wenn Termine drin sind
  if (cfg.woche && cfg.woche.aktiv) {
    const heute = berlin(jetzt).datum;
    const bisSonntag = (7 - new Date(heute + 'T12:00:00Z').getUTCDay()) % 7;
    for (let w = 0; w < 2; w++) {
      const sonntag = tageZurueck(heute, -(bisSonntag + 7 * w));
      const postMs = berlinZuMs(sonntag, cfg.woche.zeit);
      if (postMs < jetzt - 30 * 60000) continue;
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
export function inhaltSchluessel(post, design, cfg, bgv = 0) {
  return JSON.stringify([bgv, bgv ? '' : post.kalenderBild, post.typ, post.art, post.serie, post.nr, post.track, post.layout, post.titel, post.datum, post.liveMs, post.tage,
    post.klassen, post.reverseGrid, post.ergebnis || null, design.farbe1, design.farbe2, design.logoVersion || 0, design.liveText, design.team, design.teamSchwarz, design.logoAn, design.teamAn, design.spruchAn, design.layout || null, post.spruch || '', cfg.liveAb, post.liste || null, post.pose || null, ZEICHEN_VERSION]);
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

// Bildunterschrift. Zeilen, deren Platzhalter leer bleibt, fallen weg.
export function bildtext(post, cfg, design) {
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
    punkte: erg && erg.punkte ? String(erg.punkte) : ''
  };
  const vorlage = post.typ === 'erg' ? cfg.textErgebnis : cfg.text;
  return String(vorlage || '').split('\n').map(z => {
    let leer = false;
    const r = z.replace(/\{(\w+)\}/g, (m, k) => { if (!(k in w)) return m; if (!w[k]) leer = true; return w[k]; });
    return leer ? null : r;
  }).filter(z => z !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2200);
}
