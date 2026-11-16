// ═══════════════════════════════════════════════════════════
// Bilder für Kreids888: KI-Hintergrund (Cloudflare Workers AI, Flux), Kalender- oder eigenes Bild,
// darüber die Kreids-Grafik (Rot, Saira Condensed, Logo). Die Schrift kommt NIE von der KI.
// Formate: Ankündigung + Ergebnis 1080×1350 (Feed 4:5), Raceday 1080×1920 (Story 9:16),
// YouTube-Thumbnail 1920×1080 (PNG unter 2 MB, sonst JPG).
// ═══════════════════════════════════════════════════════════
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import jpeg from 'jpeg-js';
import fBlack from './fonts/SairaCondensed-Black.ttf';
import fXbold from './fonts/SairaCondensed-ExtraBold.ttf';
import fSemi from './fonts/SairaCondensed-SemiBold.ttf';
import { BREITEN } from './breiten.js';
import { berlin } from './zeit.js';

let bereit = null;
const init = () => bereit || (bereit = initWasm(resvgWasm));
const FONTS = [new Uint8Array(fBlack), new Uint8Array(fXbold), new Uint8Array(fSemi)];

// ─── KI-Hintergrund ─────────────────────────────────────────
// Echte Fahrzeuge je Klasse (wie in iRacing) → die KI zeichnet echte Autos statt Fantasie-/Spielzeugautos
const MOTIVE = [
  [/hyper|lmh|lmdh|gtp|le ?mans/i, ['Porsche 963 hypercar', 'Cadillac V-Series.R hypercar', 'BMW M Hybrid V8 hypercar', 'Acura ARX-06 prototype']],
  [/lmp ?2/i, ['Dallara P217 LMP2 prototype']],
  [/lmp ?3/i, ['Ligier JS P320 LMP3 prototype']],
  [/gt ?3|gtd|gte/i, ['Porsche 911 GT3 R (992)', 'BMW M4 GT3', 'Ferrari 296 GT3', 'Mercedes-AMG GT3', 'Audi R8 LMS GT3', 'Lamborghini Huracán GT3', 'McLaren 720S GT3', 'Ford Mustang GT3']],
  [/gt ?4/i, ['Porsche 718 Cayman GT4 Clubsport', 'BMW M4 GT4', 'Mercedes-AMG GT4']],
  [/porsche ?(911 )?(gt3 )?cup|carrera ?cup|supercup/i, ['Porsche 911 GT3 Cup (992)']],
  [/tcr|touring|tourenwagen/i, ['Audi RS 3 LMS TCR', 'Hyundai Elantra N TCR', 'Honda Civic Type R TCR']],
  [/mx-?5|miata/i, ['Mazda MX-5 Cup']],
  [/formula|formel|\bf[34]\b|open.?wheel/i, ['Dallara F3 single-seater']],
  [/nascar|stock ?car/i, ['NASCAR Cup Series stock car']],
  [/vln|nls|nordschleife|eifel/i, ['Porsche 911 GT3 R (992)', 'BMW M4 GT3', 'Mercedes-AMG GT3']]
];
const mischen = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
export function autos(post, eigene) {
  if (eigene && eigene.trim()) return eigene.trim().slice(0, 200);
  const quelle = [...post.klassen, post.serie].join(' | ');
  const pro = [];
  for (const [re, liste] of MOTIVE) if (re.test(quelle)) pro.push(mischen(liste));
  if (!pro.length) return 'a Porsche 911 GT3 R and a BMW M4 GT3';
  // Aus jeder Klasse ein Auto, insgesamt 2–3 Autos
  const wahl = [];
  for (let i = 0; wahl.length < 3 && i < 3; i++) for (const l of pro) if (l[i] && wahl.length < 3 && !wahl.includes(l[i])) wahl.push(l[i]);
  if (wahl.length === 1) return `two ${wahl[0]} race cars`;
  return wahl.slice(0, -1).join(', ') + ' and ' + wahl[wahl.length - 1];
}

// Wählbare Stimmungen und Blickwinkel (Schlüssel kommen aus dem Liga-Admin, „zufall“ = gemischt)
export const STIMMUNGEN = {
  nacht: 'at night under floodlights, glowing headlights and brake discs',
  regen: 'in heavy rain, spray behind the cars, reflections on the wet asphalt',
  regennacht: 'at night in heavy rain, wet asphalt reflecting the floodlights and headlights',
  nebel: 'in thick morning fog, headlights cutting through the mist',
  sonnenuntergang: 'at golden hour sunset, warm backlight',
  daemmerung: 'at blue hour dusk, headlights on, glowing brake discs',
  sonnig: 'on a bright sunny day, heat shimmer over the asphalt',
  gewitter: 'under dramatic dark storm clouds, moody light'
};
export const KAMERAS = {
  nah: 'telephoto shot from trackside, the cars large in frame',
  schwenk: 'low angle panning shot, sharp cars, motion blurred background',
  frontal: 'head-on telephoto shot down the straight, heat haze',
  kurve: 'cars side by side braking hard into a corner, close telephoto view',
  seite: 'side-on panning shot along the pit straight at high speed'
};
const zufall = a => a[Math.floor(Math.random() * a.length)];
const waehle = (liste, key) => liste[key] || zufall(Object.values(liste));

// Bildaufbau: Autos in der oberen Hälfte, unten freie dunkle Fläche für die Schrift
const AUFBAU = {
  ank: 'Composition: the cars are in the upper half of the frame, the lower 45 percent shows only dark empty asphalt and shadow.',
  story: 'Vertical composition: the cars are in the upper half of the frame, the lower half shows only dark empty asphalt and shadow.'
};

export function prompt(post, wunsch = {}) {
  const strecke = [post.track, post.layout].filter(Boolean).join(' ');
  return `Editorial motorsport photograph from a real endurance race${strecke ? ' at ' + strecke : ''}: ${autos(post, wunsch.fahrzeuge)} racing close together, ` +
    `${waehle(STIMMUNGEN, wunsch.stimmung)}, ${waehle(KAMERAS, wunsch.kamera)}. ` +
    `${AUFBAU[post.typ] || AUFBAU.ank} ` +
    `${strecke ? 'Show the real, recognizable layout, kerbs and surroundings of ' + strecke + '. ' : ''}` +
    'Shot on a Canon EOS-1D X Mark III with a 600mm f/4 lens from the photographer position behind the barrier, accurate real-world car proportions, ' +
    'realistic paint reflections, tyre rubber marks, natural film grain, documentary sports photography. ' +
    'Plain race liveries without readable text or numbers, no watermark.';
}

// Bild-Bytes aus der KI-Antwort holen (Base64, Data-URL oder Stream)
async function bytes(r) {
  let b = null;
  const img = r && (r.image || (r.result && r.result.image));
  if (typeof img === 'string') b = new Uint8Array(Buffer.from(img.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
  else if (r instanceof ReadableStream) b = new Uint8Array(await new Response(r).arrayBuffer());
  else if (r instanceof ArrayBuffer) b = new Uint8Array(r);
  else if (r instanceof Uint8Array) b = r;
  if (!b || b.length < 1000) throw new Error('Die KI hat kein Bild geliefert.');
  return b;
}

// FLUX.2 [klein] 4B: deutlich realistischer, Wunschformat. Klein gerechnet (spart Gratis-Kontingent), beim Zeichnen hochskaliert.
async function klein(env, p, b, h) {
  const form = new FormData();
  form.append('prompt', p);
  form.append('width', String(b));
  form.append('height', String(h));
  const fr = new Response(form);
  return bytes(await env.AI.run('@cf/black-forest-labs/flux-2-klein-4b', { multipart: { body: fr.body, contentType: fr.headers.get('content-type') } }));
}
// Notlösung: FLUX.1 [schnell] (kennt nur prompt + steps)
async function schnell(env, p) {
  return bytes(await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt: p, steps: 8 }));
}

// opt: { flux: true/false } (Tageslimit prüft index.js)
export async function kiBild(env, post, wunsch, opt = { flux: true }) {
  const p = prompt({ ...post, typ: 'ank' }, wunsch);
  if (!opt.flux) throw new Error('Tageslimit für KI-Bilder erreicht (damit es gratis bleibt). Morgen geht es wieder.');
  // Ein Bild für Ankündigung (4:5) UND Story (9:16, zeigt die Bildmitte) → immer 4:5 rechnen
  const [b, h] = [960, 1200];
  try {
    return { bild: await klein(env, p, b, h), prompt: p, modell: 'flux-2-klein-4b' };
  } catch (e) {
    return { bild: await schnell(env, p), prompt: p, modell: 'flux-1-schnell' };
  }
}

// ─── Hilfen ─────────────────────────────────────────────────
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const gross = s => String(s || '').toLocaleUpperCase('de-DE');
const SCHRIFT = {
  black: 'font-family="Saira Condensed" font-weight="900"',
  xbold: 'font-family="Saira Condensed" font-weight="800"',
  semi: 'font-family="Saira Condensed" font-weight="600"'
};

function breite(text, art, groesse, abstand = 0) {
  const t = BREITEN[art];
  let w = 0, n = 0;
  for (const ch of String(text)) { w += t[ch] ?? t.M ?? 520; n++; }
  return w / 1000 * groesse + abstand * Math.max(0, n - 1) + groesse * 0.06;   // + Überhang der Kursiven
}
function passend(text, art, maxB, max, min, abstand = 0) {
  let g = max;
  while (g > min && breite(text, art, g, abstand) > maxB) g -= 2;
  return g;
}
// Text auf 1–2 Zeilen verteilen (Streckennamen)
function umbruch(text, art, maxB, max, min) {
  const eins = passend(text, art, maxB, max, min);
  if (eins >= max * 0.7 || !/[\s-]/.test(text)) return { zeilen: [text], g: eins };
  const teile = text.split(/(?<=-)|\s+/).filter(Boolean);
  let best = null;
  for (let i = 1; i < teile.length; i++) {
    const a = teile.slice(0, i).join(' ').replace(/- /g, '-'), b = teile.slice(i).join(' ').replace(/- /g, '-');
    const g = Math.min(passend(a, art, maxB, max, min), passend(b, art, maxB, max, min));
    if (!best || g > best.g) best = { zeilen: [a, b], g };
  }
  return best && best.g > eins ? best : { zeilen: [text], g: eins };
}

function rgb(hex) {
  const m = String(hex || '').trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return [0, 204, 125];
  let h = m[1]; if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function leucht(c) {
  const l = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}
const textAuf = farbe => leucht(rgb(farbe)) > 0.36 ? '#07090c' : '#ffffff';
// Akzentfarbe als Schrift auf dunklem Grund: zu dunkle Farben aufhellen
function hellAuf(farbe) {
  let c = rgb(farbe);
  for (let i = 0; i < 8 && leucht(c) < 0.2; i++) c = c.map(v => v + (255 - v) * 0.25);
  return hex(c);
}
function bildTyp(u8) {
  if (u8[0] === 0x89 && u8[1] === 0x50) return 'image/png';
  if (u8[0] === 0xff && u8[1] === 0xd8) return 'image/jpeg';
  if (u8[0] === 0x52 && u8[1] === 0x49) return 'image/webp';
  if (u8[0] === 0x47 && u8[1] === 0x49) return 'image/gif';
  return 'image/png';
}
const daten = u8 => `data:${bildTyp(u8)};base64,${Buffer.from(u8).toString('base64')}`;

// Schräges Band (wie eine Startnummern-Tafel)
function band(x, y, b, h, farbe) {
  const s = h * 0.21;
  return `<polygon points="${x},${y + h} ${x + s},${y} ${x + b + s},${y} ${x + b},${y + h}" fill="${farbe}"/>`;
}
// Zwei Renn-Streifen rechts neben dem Band
function streifen(x, y, h, f1, f2) {
  const s = h * 0.21;
  const st = (x0, w, f) => `<polygon points="${x0},${y + h} ${x0 + s},${y} ${x0 + s + w},${y} ${x0 + w},${y + h}" fill="${f}"/>`;
  return st(x, 16, f1) + st(x + 30, 10, f2);
}

// Reverse Grid: Schild „2 RENNEN · REVERSE GRID“ rechts neben dem Countdown-Band (x0).
// Passt es dort nicht, steht es über dem Band am linken Rand.
const RG_TEXT = '2 RENNEN · REVERSE GRID';
function rgSchild(x0, links, bandY, bandH, rechts, farbe) {
  const h = 58, pad = 22, schraeg = h * 0.21;
  const platz = x => rechts - x - 2 * pad - schraeg;
  let x = x0, y = bandY + (bandH - h) / 2;
  let g = passend(RG_TEXT, 'xbold', platz(x), 34, 22, 2);
  if (g < 26 || breite(RG_TEXT, 'xbold', g, 2) > platz(x)) { x = links; y = bandY - h - 16; g = passend(RG_TEXT, 'xbold', platz(x), 34, 22, 2); }
  const w = breite(RG_TEXT, 'xbold', g, 2) + 2 * pad;
  return `<polygon points="${x},${y + h} ${x + schraeg},${y} ${x + w + schraeg},${y} ${x + w},${y + h}" fill="#05070a" fill-opacity=".62" stroke="${farbe}" stroke-width="3"/>` +
    `<text x="${x + pad + schraeg / 2}" y="${y + h / 2 + g * 0.34}" ${SCHRIFT.xbold} font-size="${g}" letter-spacing="2" fill="#ffffff">${RG_TEXT}</text>`;
}

function hintergrund(b, h, bg, farbe1) {
  if (bg) return `<image href="${daten(bg)}" x="0" y="0" width="${b}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
  // Ohne KI-Bild: dunkler Grund mit schrägen Streifen in der Serienfarbe
  let s = '';
  for (let i = -6; i < 16; i++) s += `<polygon points="${i * 140},${h} ${i * 140 + h * 0.5},0 ${i * 140 + h * 0.5 + 46},0 ${i * 140 + 46},${h}" fill="${farbe1}" opacity="${i % 3 === 0 ? 0.16 : 0.06}"/>`;
  return `<rect width="${b}" height="${h}" fill="#0b0e12"/>${s}`;
}

// Kopf: Kreids-Logo groß und mittig. Gibt die Unterkante zurück, damit der Text darunter Platz hat.
function kopf(B, y, logo, m) {
  if (!logo) return { svg: '', unten: y };
  return { svg: `<image href="${daten(logo)}" x="${(B - m.b) / 2}" y="${y}" width="${m.b}" height="${m.h}" preserveAspectRatio="xMidYMid meet" filter="url(#schatten)"/>`, unten: y + m.h };
}

// Abdunkeln oben (Logos) und unten (Text). Der untere Verlauf startet über dem Textblock,
// damit Schrift auch auf hellen KI-Bildern (Sonne, Nebel) immer lesbar ist.
function defs(b, h, obenH, untenY) {
  return `<defs>
<linearGradient id="oben" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070a" stop-opacity=".55"/><stop offset="1" stop-color="#05070a" stop-opacity="0"/></linearGradient>
<linearGradient id="unten" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070a" stop-opacity="0"/><stop offset=".3" stop-color="#05070a" stop-opacity=".78"/><stop offset=".55" stop-color="#05070a" stop-opacity=".92"/><stop offset="1" stop-color="#05070a" stop-opacity=".97"/></linearGradient>
<filter id="schatten" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity=".7"/></filter>
</defs>
<rect x="0" y="0" width="${b}" height="${obenH}" fill="url(#oben)"/>
<rect x="0" y="${untenY}" width="${b}" height="${h - untenY}" fill="url(#unten)"/>`;
}

// Große Zeile (Strecke, sonst Titel) und Serien-Zeile darüber
const grossText = post => gross(post.track || post.titel || post.art || 'Rennen');
function serienZeile(post) {
  const runde = post.nr ? ` · RUNDE ${post.nr}` : '';
  if (post.track) return gross(post.serie || post.titel || post.art) + runde;
  return gross(post.serie || post.art) + runde;
}
const WEBSEITE = 'KREIDS888.COM';

// Untere Zeile „LIVE AUF …“ (z. B. YOUTUBE · @KREIDS888)
const liveZeile = design => gross(design.liveText || '');
// Dritte Spalte der Info-Reihe: Klassen (SPR), sonst Start (SPR) bzw. Art des Termins
const dritteSpalte = (post, start) => post.klassen.length ? ['KLASSEN', post.klassen.map(gross).join(' · ')]
  : post.spr ? ['START', `${start.zeit} UHR`] : ['ART', gross(post.art)];

// ─── Ankündigung (Feed 1080×1350) ───────────────────────────
// Sicherheitsrand 72 px links/rechts: Instagram zeigt im Profil-Raster nur einen 3:4-Ausschnitt.
function feedSvg(post, design, bg, logo) {
  const B = 1080, H = 1350, R = 72, f1 = design.farbe1, f2 = design.farbe2;
  const akzent = hellAuf(f1);
  const tage = post.tage | 0;
  const countdown = tage === 0 ? 'HEUTE' : tage === 1 ? 'MORGEN' : `IN ${tage} TAGEN`;
  const live = berlin(post.liveMs), start = berlin(post.startMs);
  const track = umbruch(grossText(post), 'black', B - 2 * R - 10, 160, 70);
  const tz = track.zeilen.length, tg = track.g;

  // Von unten nach oben stapeln
  const fussY = 1288;
  const infoLabelY = 1138, infoWertY = 1204;
  const letzteTrack = post.layout ? 1036 : 1066;
  const ersteTrack = letzteTrack - (tz - 1) * tg * 0.9;
  const trackOben = ersteTrack - tg * (/[ÄÖÜ]/.test(track.zeilen[0]) ? 0.9 : 0.74);
  const serieY = trackOben - 24;
  const bandH = 96, bandUnten = serieY - 44, bandOben = bandUnten - bandH;
  const cdG = 76, cdB = breite(countdown, 'black', cdG, 2);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">`;
  s += `<rect width="${B}" height="${H}" fill="#0a0b0e"/>` + hintergrund(B, H, bg, f1);
  s += defs(B, H, 280, Math.max(420, bandOben - 150));
  s += kopf(B, 48, logo, { b: 760, h: 230 }).svg;
  s += band(-40, bandOben, cdB + R + 72, bandH, f1) + streifen(cdB + R + 56, bandOben, bandH, f1, f2);
  s += `<text x="${R}" y="${bandOben + bandH * 0.76}" ${SCHRIFT.black} font-size="${cdG}" letter-spacing="2" fill="${textAuf(f1)}">${esc(countdown)}</text>`;
  if (post.reverseGrid) s += rgSchild(cdB + R + 140, R, bandOben, bandH, B - R, f1);
  const sz = serienZeile(post);
  s += `<g filter="url(#schatten)">`;
  s += `<text x="${R + 2}" y="${serieY}" ${SCHRIFT.semi} font-size="${passend(sz, 'semi', B - 2 * R, 36, 22, 3)}" letter-spacing="3" fill="${akzent}">${esc(sz)}</text>`;
  s += track.zeilen.map((z, i) => `<text x="${R - 4}" y="${ersteTrack + i * tg * 0.9}" ${SCHRIFT.black} font-size="${tg}" fill="#ffffff">${esc(z)}</text>`).join('');
  if (post.layout) s += `<text x="${R + 2}" y="${letzteTrack + 42}" ${SCHRIFT.semi} font-size="30" letter-spacing="2" fill="#d6dde5">${esc(gross(post.layout))}</text>`;
  const spalten = [['DATUM', `${gross(start.wt)} ${start.tag}`], ['LIVE AB', `${live.zeit} UHR`], dritteSpalte(post, start)];
  const sx = [R, R + 318, R + 598], sb = [284, 250, B - 2 * R - 598];
  spalten.forEach(([l, w], i) => {
    if (i) s += `<rect x="${sx[i] - 26}" y="${infoLabelY - 30}" width="3" height="102" fill="${f1}"/>`;
    s += `<text x="${sx[i]}" y="${infoLabelY}" ${SCHRIFT.semi} font-size="26" letter-spacing="4" fill="${akzent}">${esc(l)}</text>`;
    s += `<text x="${sx[i]}" y="${infoWertY}" ${SCHRIFT.xbold} font-size="${passend(w, 'xbold', sb[i], 60, 24)}" fill="#ffffff">${esc(w)}</text>`;
  });
  const lz = liveZeile(design);
  if (lz) {
    s += `<text x="${R}" y="${fussY}" ${SCHRIFT.semi} font-size="28" letter-spacing="3" fill="#d6dde5">LIVE AUF</text>`;
    s += `<text x="${R + breite('LIVE AUF', 'semi', 28, 3) + 14}" y="${fussY}" ${SCHRIFT.xbold} font-size="${passend(lz, 'xbold', 560, 40, 24)}" fill="#ffffff">${esc(lz)}</text>`;
  }
  s += `<text x="${B - R}" y="${fussY}" text-anchor="end" ${SCHRIFT.semi} font-size="26" letter-spacing="3" fill="#c9d1da">${WEBSEITE}</text>`;
  s += '</g>';
  s += `<rect x="0" y="${H - 12}" width="${B}" height="12" fill="${f1}"/>`;
  return s + '</svg>';
}

// ─── Raceday (Story 1080×1920) ──────────────────────────────
// Instagram legt oben (~250 px) und unten (~380 px) eigene Leisten drüber → alles zwischen y = 200 und y = 1540.
function storySvg(post, design, bg, logo) {
  const B = 1080, H = 1920, R = 64, f1 = design.farbe1, f2 = design.farbe2;
  const OBEN = 200, UNTEN = 1540;
  const akzent = hellAuf(f1);
  const live = berlin(post.liveMs), quali = berlin(post.qualiMs), rennen = berlin(post.rennMs), start = berlin(post.startMs);
  const track = umbruch(grossText(post), 'xbold', B - 2 * R - 10, 100, 54);
  const lz = liveZeile(design);
  const k = kopf(B, OBEN, logo, { b: 780, h: 260 });
  const blockOben = k.unten + 60;
  const [cd, wort] = post.art === 'Stream' ? ['HEUTE', 'LIVE'] : post.art === 'Training' ? ['HEUTE', 'TRAINING'] : ['HEUTE IST', 'RACEDAY'];

  function baue(rdG) {
    const teile = [];
    let y = 0;
    const bandH = 92, cdB = breite(cd, 'black', 72, 2);
    teile.push(o => band(-40, o, cdB + R + 72, bandH, f1) + streifen(cdB + R + 56, o, bandH, f1, f2) +
      `<text x="${R}" y="${o + bandH * 0.76}" ${SCHRIFT.black} font-size="72" letter-spacing="2" fill="${textAuf(f1)}">${cd}</text>`);
    if (post.reverseGrid) teile.push(o => rgSchild(cdB + R + 140, R, o, bandH, B - R, f1));
    y += bandH + 12;
    const rdY = y + rdG * 0.74;
    teile.push(o => `<text x="${R - 8}" y="${o + rdY}" ${SCHRIFT.black} font-size="${rdG}" fill="#ffffff">${wort}</text>`);
    y = rdY + 30;
    const tg = track.g, tY = y + tg * (/[ÄÖÜ]/.test(track.zeilen[0]) ? 0.9 : 0.74);
    teile.push(o => track.zeilen.map((z, i) => `<text x="${R - 4}" y="${o + tY + i * tg * 0.92}" ${SCHRIFT.xbold} font-size="${tg}" fill="#ffffff">${esc(z)}</text>`).join(''));
    y = tY + (track.zeilen.length - 1) * tg * 0.92 + 48;
    const sz = serienZeile(post), szY = y;
    teile.push(o => `<text x="${R}" y="${o + szY}" ${SCHRIFT.semi} font-size="${passend(sz, 'semi', B - 2 * R, 34, 22, 3)}" letter-spacing="3" fill="${akzent}">${esc(sz)}</text>`);
    y += 70;
    const lY = y;
    teile.push(o => `<text x="${R}" y="${o + lY}" ${SCHRIFT.semi} font-size="34" letter-spacing="5" fill="${akzent}">LIVE AB</text>`);
    y += 124;
    const zY = y;
    teile.push(o => `<text x="${R - 6}" y="${o + zY}" ${SCHRIFT.black} font-size="146" fill="#ffffff">${esc(live.zeit)} UHR</text>`);
    y += 54;
    const qY = y;
    const qText = post.spr ? `QUALI ${quali.zeit} · RENNEN ${rennen.zeit}${post.klassen.length ? ' · ' + post.klassen.map(gross).join(' · ') : ''}`
      : `${gross(start.wochentag)} ${start.tag}${start.jahr} · ${gross(post.art)}`;
    teile.push(o => `<text x="${R}" y="${o + qY}" ${SCHRIFT.semi} font-size="${passend(qText, 'semi', B - 2 * R, 32, 20, 2)}" letter-spacing="2" fill="#e1e6ec">${esc(qText)}</text>`);
    if (lz) {
      y += 72;
      const sY = y;
      teile.push(o => `<rect x="${R}" y="${o + sY - 42}" width="6" height="54" fill="${f1}"/>` +
        `<text x="${R + 22}" y="${o + sY}" ${SCHRIFT.semi} font-size="30" letter-spacing="3" fill="#e1e6ec">LIVE AUF</text>` +
        `<text x="${R + 22 + breite('LIVE AUF', 'semi', 30, 3) + 14}" y="${o + sY}" ${SCHRIFT.xbold} font-size="${passend(lz, 'xbold', B - 2 * R - 200, 50, 26)}" fill="#ffffff">${esc(lz)}</text>`);
    }
    y += 58;
    const wY = y;
    teile.push(o => `<text x="${R}" y="${o + wY}" ${SCHRIFT.semi} font-size="26" letter-spacing="4" fill="#c9d1da">${WEBSEITE}</text>`);
    return { teile, hoehe: y + 8 };
  }
  let rdG = passend(wort, 'black', B - 2 * R + 10, 210, 150);
  let blk = baue(rdG);
  while (blk.hoehe > UNTEN - blockOben && rdG > 150) { rdG -= 10; blk = baue(rdG); }
  const o = Math.max(blockOben, UNTEN - blk.hoehe);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">`;
  s += `<rect width="${B}" height="${H}" fill="#0a0b0e"/>` + hintergrund(B, H, bg, f1);
  s += defs(B, H, 480, Math.max(k.unten + 40, o - 170));
  s += k.svg;
  s += `<g filter="url(#schatten)">` + blk.teile.map(t => t(o)).join('') + '</g>';
  s += `<rect x="0" y="${H - 14}" width="${B}" height="14" fill="${f1}"/>`;
  return s + '</svg>';
}

// ─── Rennergebnis (Feed 1080×1350) ──────────────────────────
// Großer Platz (P1 Gold, P2 Silber, P3 Bronze), Strecke, Serie, Start → Ziel, Punkte.
const PODEST = { 1: '#f5c518', 2: '#d3d9e1', 3: '#d2873f' };
function ergebnisSvg(post, design, bg, logo) {
  const B = 1080, H = 1350, R = 72, f1 = design.farbe1, f2 = design.farbe2;
  const akzent = hellAuf(f1);
  const erg = post.ergebnis || {};
  const platz = erg.ziel ? 'P' + erg.ziel : gross(erg.status || 'DNF');
  const platzFarbe = erg.ziel ? (PODEST[erg.ziel] || '#ffffff') : hellAuf(f1);
  const tag = berlin(post.startMs);
  const track = umbruch(grossText(post), 'black', B - 2 * R - 10, 130, 64);
  const tz = track.zeilen.length, tg = track.g;

  const fussY = 1288, infoLabelY = 1138, infoWertY = 1204;
  const letzteTrack = 1066;
  const ersteTrack = letzteTrack - (tz - 1) * tg * 0.9;
  const trackOben = ersteTrack - tg * (/[ÄÖÜ]/.test(track.zeilen[0]) ? 0.9 : 0.74);
  const serieY = trackOben - 24;
  const pG = passend(platz, 'black', 640, 330, 160), platzY = serieY - 46;
  const platzOben = platzY - pG * 0.72;
  const bandH = 84, bandUnten = platzOben - 30, bandOben = bandUnten - bandH;
  const titel = 'RENNERGEBNIS', tG = 62, tB = breite(titel, 'black', tG, 2);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">`;
  s += `<rect width="${B}" height="${H}" fill="#0a0b0e"/>` + hintergrund(B, H, bg, f1);
  s += defs(B, H, 280, Math.max(380, bandOben - 120));
  s += kopf(B, 48, logo, { b: 760, h: 230 }).svg;
  s += band(-40, bandOben, tB + R + 72, bandH, f1) + streifen(tB + R + 56, bandOben, bandH, f1, f2);
  s += `<text x="${R}" y="${bandOben + bandH * 0.76}" ${SCHRIFT.black} font-size="${tG}" letter-spacing="2" fill="${textAuf(f1)}">${titel}</text>`;
  s += `<g filter="url(#schatten)">`;
  s += `<text x="${R - 10}" y="${platzY}" ${SCHRIFT.black} font-size="${pG}" fill="${platzFarbe}">${esc(platz)}</text>`;
  // Positionen gutgemacht/verloren als Schild neben dem Platz
  if (erg.ziel && erg.start) {
    const d = erg.start - erg.ziel;
    const zahl = d ? String(Math.abs(d)) : '= 0', farbe = d > 0 ? '#2fbf6a' : d < 0 ? '#e5484d' : '#8b929c';
    const g = 64, pfeil = d ? 54 : 0, wB = pfeil + breite(zahl, 'black', g, 1) + 44, x = R + breite(platz, 'black', pG) + 26, y = platzY - pG * 0.36 - 44;
    s += `<polygon points="${x},${y + 88} ${x + 18},${y} ${x + wB + 18},${y} ${x + wB},${y + 88}" fill="${farbe}"/>`;
    // Pfeil als Form (das Zeichen ▲ gibt es in der Schrift nicht)
    if (d > 0) s += `<polygon points="${x + 28},${y + 64} ${x + 68},${y + 64} ${x + 48},${y + 26}" fill="#ffffff"/>`;
    if (d < 0) s += `<polygon points="${x + 28},${y + 28} ${x + 68},${y + 28} ${x + 48},${y + 66}" fill="#ffffff"/>`;
    s += `<text x="${x + 26 + pfeil}" y="${y + 66}" ${SCHRIFT.black} font-size="${g}" letter-spacing="1" fill="#ffffff">${esc(zahl)}</text>`;
  }
  const sz = serienZeile(post);
  s += `<text x="${R + 2}" y="${serieY}" ${SCHRIFT.semi} font-size="${passend(sz, 'semi', B - 2 * R, 36, 22, 3)}" letter-spacing="3" fill="${akzent}">${esc(sz)}</text>`;
  s += track.zeilen.map((z, i) => `<text x="${R - 4}" y="${ersteTrack + i * tg * 0.9}" ${SCHRIFT.black} font-size="${tg}" fill="#ffffff">${esc(z)}</text>`).join('');
  const spalten = [['START', erg.start ? 'P' + erg.start : '–'], ['ZIEL', platz], ['PUNKTE', erg.punkte ? String(erg.punkte) : '0']];
  const sx = [R, R + 318, R + 598], sb = [284, 250, B - 2 * R - 598];
  spalten.forEach(([l, w], i) => {
    if (i) s += `<rect x="${sx[i] - 26}" y="${infoLabelY - 30}" width="3" height="102" fill="${f1}"/>`;
    s += `<text x="${sx[i]}" y="${infoLabelY}" ${SCHRIFT.semi} font-size="26" letter-spacing="4" fill="${akzent}">${esc(l)}</text>`;
    s += `<text x="${sx[i]}" y="${infoWertY}" ${SCHRIFT.xbold} font-size="${passend(w, 'xbold', sb[i], 64, 24)}" fill="#ffffff">${esc(w)}</text>`;
  });
  s += `<text x="${R}" y="${fussY}" ${SCHRIFT.semi} font-size="28" letter-spacing="3" fill="#d6dde5">${esc(`${gross(tag.wt)} ${tag.tag}${tag.jahr}`)}</text>`;
  s += `<text x="${B - R}" y="${fussY}" text-anchor="end" ${SCHRIFT.semi} font-size="26" letter-spacing="3" fill="#c9d1da">${WEBSEITE}</text>`;
  s += '</g>';
  s += `<rect x="0" y="${H - 12}" width="${B}" height="12" fill="${f1}"/>`;
  return s + '</svg>';
}

// ─── YouTube-Thumbnail (1920×1080, 16:9) ────────────────────
// Breite/Höhe aus PNG-, JPEG- bzw. GIF-Kopf lesen (für den Bildausschnitt)
function bildMasse(u8) {
  if (!u8 || u8.length < 24) return null;
  if (u8[0] === 0x47 && u8[1] === 0x49) return { b: u8[6] | (u8[7] << 8), h: u8[8] | (u8[9] << 8) };
  if (u8[0] === 0x89 && u8[1] === 0x50) return { b: ((u8[16] << 24) | (u8[17] << 16) | (u8[18] << 8) | u8[19]) >>> 0, h: ((u8[20] << 24) | (u8[21] << 16) | (u8[22] << 8) | u8[23]) >>> 0 };
  if (u8[0] === 0xff && u8[1] === 0xd8) {
    let i = 2;
    while (i + 9 < u8.length) {
      if (u8[i] !== 0xff) { i++; continue; }
      const m = u8[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (u8[i + 5] << 8) | u8[i + 6], b: (u8[i + 7] << 8) | u8[i + 8] };
      i += 2 + ((u8[i + 2] << 8) | u8[i + 3]);
    }
  }
  return null;
}
function hintergrund16(B, H, bg, farbe1) {
  const m = bg && bildMasse(bg);
  if (!m || !m.b || !m.h) return hintergrund(B, H, bg, farbe1);
  const f = Math.max(B / m.b, H / m.h), w = m.b * f, h = m.h * f;
  // Hochkant-Bilder: die Autos sitzen in der oberen Hälfte → Ausschnitt eher von oben (30 % statt Mitte)
  return `<image href="${daten(bg)}" x="${(B - w) / 2}" y="${-(h - H) * 0.3}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
}
function thumbSvg(post, design, bg, logo) {
  const B = 1920, H = 1080, R = 96, SP = 1120, f1 = design.farbe1, f2 = design.farbe2;
  const akzent = hellAuf(f1);
  const start = berlin(post.startMs), live = berlin(post.liveMs), quali = berlin(post.qualiMs), rennen = berlin(post.rennMs);
  const lz = liveZeile(design);
  // Von unten nach oben stapeln; langer Streckenname wird kleiner, damit das Band unter dem Logo bleibt
  const infoLabelY = lz ? 680 : 846, infoWertY = infoLabelY + 60;
  const letzteTrack = infoLabelY - (post.layout ? 118 : 76);
  const bandH = 84;
  let track, tz, tg, ersteTrack, serieY, bandOben, maxG = 190;
  do {
    track = umbruch(grossText(post), 'black', SP - R, maxG, 70);
    tz = track.zeilen.length; tg = track.g;
    ersteTrack = letzteTrack - (tz - 1) * tg * 0.9;
    serieY = ersteTrack - tg * (/[ÄÖÜ]/.test(track.zeilen[0]) ? 0.9 : 0.74) - 26;
    bandOben = serieY - 40 - bandH;
    maxG -= 6;
  } while (bandOben < (logo ? 236 : 90) && maxG >= 76);
  const datum = `${gross(start.wochentag)} ${start.tag}`;
  const dG = 64, dB = breite(datum, 'black', dG, 2);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">`;
  s += `<rect width="${B}" height="${H}" fill="#0a0b0e"/>` + hintergrund16(B, H, bg, f1);
  s += `<defs>
<linearGradient id="links" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#05070a" stop-opacity=".94"/><stop offset=".4" stop-color="#05070a" stop-opacity=".84"/><stop offset=".6" stop-color="#05070a" stop-opacity=".38"/><stop offset=".78" stop-color="#05070a" stop-opacity="0"/></linearGradient>
<linearGradient id="unten" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070a" stop-opacity="0"/><stop offset="1" stop-color="#05070a" stop-opacity=".88"/></linearGradient>
<filter id="schatten" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity=".7"/></filter>
</defs>
<rect width="${B}" height="${H}" fill="url(#links)"/>
<rect x="0" y="${H - 300}" width="${B}" height="300" fill="url(#unten)"/>`;
  if (logo) s += `<image href="${daten(logo)}" x="${R}" y="44" width="${Math.min(640, SP - R)}" height="170" preserveAspectRatio="xMinYMid meet" filter="url(#schatten)"/>`;
  s += band(-40, bandOben, dB + R + 72, bandH, f1) + streifen(dB + R + 56, bandOben, bandH, f1, f2);
  s += `<text x="${R}" y="${bandOben + bandH * 0.76}" ${SCHRIFT.black} font-size="${dG}" letter-spacing="2" fill="${textAuf(f1)}">${esc(datum)}</text>`;
  if (post.reverseGrid) s += rgSchild(dB + R + 140, R, bandOben, bandH, SP + 120, f1);
  const sz = serienZeile(post);
  s += `<g filter="url(#schatten)">`;
  s += `<text x="${R + 2}" y="${serieY}" ${SCHRIFT.semi} font-size="${passend(sz, 'semi', SP - R, 40, 24, 3)}" letter-spacing="3" fill="${akzent}">${esc(sz)}</text>`;
  s += track.zeilen.map((z, i) => `<text x="${R - 4}" y="${ersteTrack + i * tg * 0.9}" ${SCHRIFT.black} font-size="${tg}" fill="#ffffff">${esc(z)}</text>`).join('');
  if (post.layout) s += `<text x="${R + 2}" y="${letzteTrack + 46}" ${SCHRIFT.semi} font-size="34" letter-spacing="2" fill="#d6dde5">${esc(gross(post.layout))}</text>`;
  // Info-Reihe
  const spalten = post.spr ? [['LIVE AB', `${live.zeit} UHR`], ['QUALI', quali.zeit], ['RENNEN', rennen.zeit]] : [['LIVE AB', `${live.zeit} UHR`], ['ART', gross(post.art)]];
  if (post.klassen.length) spalten.push(['KLASSEN', post.klassen.map(gross).join(' · ')]);
  const sx = [R, R + 262, R + 452, R + 642], sb = [236, 166, 166, SP + 160 - (R + 642)];
  spalten.forEach(([l, w], i) => {
    if (i) s += `<rect x="${sx[i] - 26}" y="${infoLabelY - 30}" width="3" height="100" fill="${f1}"/>`;
    s += `<text x="${sx[i]}" y="${infoLabelY}" ${SCHRIFT.semi} font-size="26" letter-spacing="4" fill="${akzent}">${esc(l)}</text>`;
    s += `<text x="${sx[i]}" y="${infoWertY}" ${SCHRIFT.xbold} font-size="${passend(w, 'xbold', i === spalten.length - 1 && i > 0 ? Math.max(sb[i], 300) : sb[i], 58, 26)}" fill="#ffffff">${esc(w)}</text>`;
  });
  // „● LIVE AUF“-Platte groß in Szene
  if (lz) {
    const py = 850, ph = 190, sch = ph * 0.21, blockB = 1120;
    s += `<polygon points="${R - 30},${py + ph} ${R - 30 + sch},${py} ${R + blockB + sch},${py} ${R + blockB},${py + ph}" fill="#05070a" fill-opacity=".76"/>`;
    s += `<polygon points="${R + blockB + 8},${py + ph} ${R + blockB + 8 + sch},${py} ${R + blockB + 22 + sch},${py} ${R + blockB + 22},${py + ph}" fill="${f1}"/>`;
    s += `<rect x="${R - 30 + sch}" y="${py}" width="${blockB}" height="4" fill="${f1}"/>`;
    const pG = 30, pH = 46, pB = breite('LIVE AUF', 'semi', pG, 4) + pG + 36, pY = py + 22, tx = R + 30;
    s += band(tx - 8, pY, pB, pH, f1);
    s += `<circle cx="${tx + 10 + pG * 0.25}" cy="${pY + pH / 2}" r="${pG * 0.22}" fill="${textAuf(f1)}"/>`;
    s += `<text x="${tx + 18 + pG * 0.5}" y="${pY + pH * 0.74}" ${SCHRIFT.semi} font-size="${pG}" letter-spacing="4" fill="${textAuf(f1)}">LIVE AUF</text>`;
    s += `<text x="${tx - 4}" y="${py + 160}" ${SCHRIFT.black} font-size="${passend(lz, 'black', blockB - 80, 96, 40)}" fill="#ffffff">${esc(lz)}</text>`;
  }
  s += `<text x="${B - R}" y="${H - 46}" text-anchor="end" ${SCHRIFT.semi} font-size="46" letter-spacing="5" fill="#e6ebf0">${WEBSEITE}</text>`;
  s += '</g>';
  s += `<rect x="0" y="${H - 14}" width="${B}" height="14" fill="${f1}"/>`;
  return s + '</svg>';
}

// ─── Zeichnen ───────────────────────────────────────────────
const svgFuer = (post, design, bg, logo) => post.typ === 'story' ? storySvg(post, design, bg, logo)
  : post.typ === 'erg' ? ergebnisSvg(post, design, bg, logo) : feedSvg(post, design, bg, logo);
function zeichne(svg, breite) {
  return new Resvg(svg, {
    font: { fontBuffers: FONTS, loadSystemFonts: false, defaultFontFamily: 'Saira Condensed' },
    imageRendering: 0, shapeRendering: 2, textRendering: 1,
    ...(breite ? { fitTo: { mode: 'width', value: breite } } : {})
  });
}
function alsJpeg(bild, q) {
  return new Uint8Array(jpeg.encode({ data: bild.pixels, width: bild.width, height: bild.height }, q).data);
}
// Ankündigung, Story, Ergebnis → JPEG (Instagram will JPEG)
export async function rendern(post, design, bg, logo) {
  await init();
  const r = zeichne(svgFuer(post, design, bg, logo));
  const bild = r.render();
  try { return alsJpeg(bild, 88); } finally { bild.free(); r.free(); }
}
// YouTube-Thumbnail: Vorschau als JPEG (960 px), Download als PNG – über 2 MB stattdessen als JPG
export async function rendernThumb(post, design, bg, logo, download) {
  await init();
  const r = zeichne(thumbSvg(post, design, bg, logo), download ? 0 : 960);
  const bild = r.render();
  try {
    if (!download) return { bild: alsJpeg(bild, 86), typ: 'jpg' };
    const png = bild.asPng();
    if (png.length < 2e6) return { bild: png, typ: 'png' };
    for (const q of [92, 86, 78]) { const j = alsJpeg(bild, q); if (j.length < 2e6) return { bild: j, typ: 'jpg' }; }
    return { bild: alsJpeg(bild, 70), typ: 'jpg' };
  } finally { bild.free(); r.free(); }
}

// Großes Bild (Logo, Kalender-Bild) auf max. „groesse“ px verkleinern → PNG zum Speichern
export async function bildVerkleinern(u8, groesse = 512) {
  await init();
  const m = bildMasse(u8);
  const b = (m && m.b) || groesse, h = (m && m.h) || groesse;
  const f = Math.min(1, groesse / Math.max(b, h));
  const w = Math.max(1, Math.round(b * f)), hh = Math.max(1, Math.round(h * f));
  const r = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><image href="${daten(u8)}" x="0" y="0" width="${w}" height="${hh}" preserveAspectRatio="none"/></svg>`,
    { imageRendering: 0, font: { loadSystemFonts: false } });
  const bild = r.render();
  try { return bild.asPng(); } finally { bild.free(); r.free(); }
}

// Foto (z. B. Bild aus dem Streamkalender) auf max. „groesse“ px als JPEG → klein genug zum Speichern
export async function bildAlsJpeg(u8, groesse = 1600) {
  await init();
  const m = bildMasse(u8);
  const b = (m && m.b) || groesse, h = (m && m.h) || groesse;
  const f = Math.min(1, groesse / Math.max(b, h));
  const w = Math.max(1, Math.round(b * f)), hh = Math.max(1, Math.round(h * f));
  const r = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><rect width="${w}" height="${hh}" fill="#0a0b0e"/><image href="${daten(u8)}" x="0" y="0" width="${w}" height="${hh}" preserveAspectRatio="none"/></svg>`,
    { imageRendering: 0, font: { loadSystemFonts: false } });
  const bild = r.render();
  try { return alsJpeg(bild, 88); } finally { bild.free(); r.free(); }
}

export const _test = { feedSvg, storySvg, ergebnisSvg, thumbSvg, prompt };
