/* ===========================================================
   iRACING-ZEITPLAN  für den F2F-Stintplaner
   Nur Teamrennen und Special Events. Hauptquelle ist die iRacePlan-API
   (Secret IRACEPLAN_API_KEY), Rückfall das offizielle Season-PDF von
   iRacing (pdftotext/poppler-utils). Dazu die Special-Events-Seite von
   iracing.com. Schreibt team/iracing.json, läuft täglich per GitHub
   Action (.github/workflows/iracing.yml).
   Lokal testen: PDF_FILE=… SPECIAL_FILE=… node tools/iracing-sync.mjs team/iracing.json
   =========================================================== */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PDF_URL = "https://members-assets.iracing.com/public/schedulepdf/SeasonSchedule.pdf";
const SPECIAL_URL = "https://www.iracing.com/special-events/";
const UA = "kreids888-team (F2F Stintplaner, https://kreids888.com/team/)";
const OUT = process.argv[2] || "team/iracing.json";

const KURZ = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MONATE = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");
const isoTag = (ms) => new Date(ms).toISOString().slice(0, 10);

async function holen(url, binaer) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(url + " → HTTP " + r.status);
  return binaer ? Buffer.from(await r.arrayBuffer()) : r.text();
}

/* ---------------- Season-PDF ---------------- */
async function pdfText() {
  let datei = process.env.PDF_FILE;
  if (!datei) {
    datei = path.join(os.tmpdir(), "iracing-season.pdf");
    fs.writeFileSync(datei, await holen(PDF_URL, true));
  }
  return execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", datei, "-"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
}

// Rennrhythmus (GMT) → periodisch {step, offs, par} oder feste Tage {tage: {6: [[9,0],[19,0]], 0: [[17,0]]}}
function rhythmus(txt) {
  const t = String(txt || "").split("|")[0].toLowerCase();
  if (!t || /timeslots? per week/.test(t)) return null;
  // Tage auch abgekürzt („Thur & Sat at 10, 19 GMT"); Tage ohne eigene Zeiten teilen sich die nächsten
  const tagRe = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/g;
  const treffer = [...t.matchAll(tagRe)];
  if (treffer.length) {
    const tage = {};
    let offen = [];
    treffer.forEach((m, i) => {
      const stueck = t.slice(m.index + m[0].length, i + 1 < treffer.length ? treffer[i + 1].index : t.length);
      const zeiten = [...stueck.matchAll(/(\d{1,2})(?::(\d{2}))?/g)].map(z => [Number(z[1]), Number(z[2] || 0)]).filter(([h, mi]) => h < 24 && mi < 60);
      offen.push(KURZ[m[1]]);
      if (zeiten.length) { for (const tg of offen) tage[tg] = zeiten; offen = []; }
    });
    return Object.keys(tage).length ? { tage } : null;
  }
  let step = 0;
  if (/every (30|thirty) minutes/.test(t)) step = 30;
  else if (/every 2 hours|every (odd|even|other) 2 hours/.test(t)) step = 120;
  else if (/every hour|hourly|every 1 hour|^races at :\d\d/.test(t)) step = 60;
  if (!step) return null;
  let offs = [...t.matchAll(/:(\d{2})/g)].map(m => Number(m[1]));
  const vorne = t.match(/(\d{1,2}) past/);
  if (!offs.length && vorne) offs = [Number(vorne[1])];
  if (!offs.length) offs = [0];
  if (step === 30 && offs.length > 1) step = 60;
  const par = /\bodd\b/.test(t) ? 1 : 0;
  return { step, offs: [...new Set(offs)].sort((a, b) => a - b), par };
}

function parseSchedule(txt) {
  const zeilen = txt.split(/\r?\n/).map(l => l.replace(/\f/g, ""));
  // Inhaltsverzeichnis: Kategorie (GROSS), Klasse „… (SPORTS CAR)", Serie
  const toc = [];
  let cat = "", cls = "", tocEnde = 0;
  for (let i = 0; i < Math.min(zeilen.length, 600); i++) {
    const m = zeilen[i].match(/^\s*(.+?)\s*(?:\.\s?){3,}\s*\d+\s*$/);
    if (!m) continue;
    tocEnde = i;
    const name = m[1].trim();
    const k = name.match(/^(.*Series)\s*\(([A-Z ]+)\)$/);
    if (k) { cls = k[1].replace(/ Series$/, ""); continue; }
    if (/^[A-Z ]+$/.test(name)) { cat = name; cls = ""; continue; }
    toc.push({ name, cat, cls });
  }
  // Serien-Blöcke im Text finden
  const pos = [];
  const genutzt = new Set();
  for (const s of toc) {
    for (let i = tocEnde + 1; i < zeilen.length; i++) {
      if (!genutzt.has(i) && zeilen[i].trim() === s.name) { pos.push({ ...s, i }); genutzt.add(i); break; }
    }
  }
  pos.sort((a, b) => a.i - b.i);
  const serien = [];
  pos.forEach((s, k) => {
    const block = zeilen.slice(s.i + 1, k + 1 < pos.length ? pos[k + 1].i : zeilen.length);
    // Kopf: Fahrzeuge bis zur Lizenz-Zeile („… --> …"), danach Rennrhythmus
    const kopf = [];
    let j = 0;
    for (; j < block.length && !/^Week \d+ \(/.test(block[j]) && !/^Min entries/.test(block[j]); j++) kopf.push(block[j]);
    const li = kopf.findIndex(l => /-->/.test(l));
    const autos = (li > 0 ? kopf.slice(0, li) : []).map(l => l.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
    const lizenz = li >= 0 ? kopf[li].trim() : "";
    const takt = (li >= 0 ? kopf.slice(li + 1) : []).map(l => l.trim()).filter(l => l && !/^Min entries/.test(l)).join(" ").replace(/\s+/g, " ");
    const wochen = parseWochen(block, /see race week for cars/i.test(kopf.join(" ")), s.name);
    if (!wochen.length) return;
    const r = rhythmus(takt);
    // feste Renntage: echte Startzeitpunkte (UTC) in der Rennwoche ab dem Wochendatum
    if (r && r.tage) for (const w of wochen) {
      const basis = Date.parse(w.d + "T00:00:00Z");
      const s = [];
      for (let t = 0; t < 7; t++) {
        const tag = basis + t * 864e5, wt = new Date(tag).getUTCDay();
        for (const [h, mi] of r.tage[wt] || []) s.push(tag + (h * 60 + mi) * 60000);
      }
      if (s.length) w.s = s.sort((a, b) => a - b);
    }
    const name = s.name.replace(/\s*-?\s*20\d\d Season(?: \d+)?/i, "").replace(/\s+-\s*$/, "").replace(/\s{2,}/g, " ").trim();
    serien.push({
      n: name, cat: titel(s.cat), cls: s.cls, team: /team racing/i.test(lizenz),
      cars: autos, takt, p: r && !r.tage ? r : undefined, w: wochen
    });
  });
  const saison = (txt.match(/20\d\d Season \d/g) || []).reduce((a, x, _, arr) => arr.filter(y => y === x).length > arr.filter(y => y === a).length ? x : a, "");
  return { saison, serien };
}
const titel = (s) => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// Wochen-Tabelle eines Serien-Blocks. pdftotext verschiebt bei Seitenumbrüchen die Zeilen
// gegeneinander, deshalb werden Wochen, Strecken-Zellen und Renndauern getrennt als Strom
// gelesen und danach der Reihe nach zusammengesetzt. Eine Strecken-Zelle endet immer mit der
// Sim-Zeit „(2026-09-19 13:40 1x)".
function parseWochen(block, autosProWoche, name) {
  const LABEL = /^Week (\d+) \((\d{4}-\d{2}-\d{2})\)/;
  const MARKE = /^\(\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;
  const erste = block.findIndex(l => LABEL.test(l));
  if (erste < 0) return [];
  // Bedingungen, die bei langen Streckennamen mit nur einem Leerzeichen anschließen
  const BEDINGUNG = /\s(?:\d+°F|All dry events|Rain (?:possible|chance)|Grid by|Rolling|Standing|Cautions|Local |Full course|Constant weather|Qual )/;
  const wochen = [], zellen = [], dauern = [], amLabel = [];
  let zelle = [], bed = "";
  for (const roh of block.slice(erste)) {
    const lm = roh.match(LABEL);
    if (lm) wochen.push({ nr: Number(lm[1]), d: lm[2] });
    const z = lm ? " ".repeat(lm[0].length) + roh.slice(lm[0].length) : roh;
    if (!z.trim() || /^\s*\d+\s*$/.test(z)) continue; // leer / Seitenzahl
    // Bedingungs-Spalte (Wetter, Start, Gelb, Fahrer, BoP) als Strom; jede Zelle beginnt mit der Temperatur
    const ti = z.search(/\d+°F\/-?\d+°C/);
    let ci = ti;
    if (ci < 0) for (const m of z.matchAll(/\s{2,}(?=\S)/g)) { const p = m.index + m[0].length; if (p >= 40) { ci = p; break; } }
    if (ci >= 0) {
      let c = z.slice(ci).trimEnd();
      if (/\b(?:Max|Min)\s+\d+(?:\s+(?:laps?|mins?))?$/.test(c)) c = c.replace(/\s+(?:laps?|mins?)$/, "");
      else c = c.replace(/\s+\d+(?:\s+(?:laps?|mins?))?$/, "").replace(/\s*\b(?:laps?|mins?)$/, "").replace(/\s+[HCF]:\d+L$/, "");
      if (c.trim()) bed += " " + c.trim();
    }
    // Strecken-Spalte: erster Lauf mit einfachen Leerzeichen ab Spalte 15–30 (Sim-Zeit bis 45)
    let txt = "";
    if (!z.slice(0, 15).trim()) {
      const r = z.match(/^(\s*)(\S+(?: \S+)*)/);
      if (r && r[1].length >= 15 && r[1].length <= 45) {
        txt = (" " + r[2]).split(BEDINGUNG)[0].trim();
        if (MARKE.test(txt)) { zellen.push(zelle); zelle = []; }
        else if (r[1].length <= 30 && txt) zelle.push(txt);
        else txt = "";
      }
    }
    if (lm) amLabel.push(MARKE.test(txt) ? "" : txt);
    // Renndauer ganz rechts: Zahl, Einheit steht oft eine Zeile tiefer
    const einheit = z.match(/\b(laps?|mins?)\s*$/);
    const offen = dauern.length && !dauern[dauern.length - 1].e ? dauern[dauern.length - 1] : null;
    if (einheit) {
      if (offen) offen.e = einheit[1];
      else { const nz = z.match(/(\d+)\s+(laps?|mins?)\s*$/); if (nz) dauern.push({ n: Number(nz[1]), e: nz[2] }); }
    } else {
      const nz = z.match(/\S\s+(\d+)\s*$/);
      if (nz && z.trimEnd().length > 60 && !/\b(?:Max|Min)\s+\d+\s*$/.test(z)) dauern.push({ n: Number(nz[1]), e: "" });
    }
  }
  // Ohne saubere Sim-Zeit-Zellen: Strecke aus der Wochen-Zeile selbst nehmen
  const strom = zellen.length === wochen.length;
  const bedZellen = bed.split(/(?=\d+°F\/-?\d+°C)/).map(x => x.trim()).filter(x => /^\d+°F/.test(x));
  if (!strom || dauern.length !== wochen.length || bedZellen.length !== wochen.length)
    console.warn(`Hinweis ${name}: ${wochen.length} Wochen, ${zellen.length} Strecken, ${dauern.length} Dauern, ${bedZellen.length} Bedingungen`);
  let letzteBop = null; // BoP steht nur in der Woche, in der sie sich ändert, und gilt bis zur nächsten
  return wochen.map((w, i) => {
    const c = strom ? zellen[i] : amLabel[i] ? [amLabel[i]] : [];
    const out = { ...w, t: (autosProWoche ? c.slice(0, 1) : c).join(" ").replace(/\s+/g, " ").trim() };
    if (autosProWoche && c.length > 1) out.autos = c.slice(1).join(" ").replace(/\s+/g, " ").replace(/\s*,\s*$/, "");
    const d = dauern[i];
    if (d && /^lap/.test(d.e)) out.laps = d.n;
    else if (d && /^min/.test(d.e)) out.min = d.n;
    if (bedZellen.length === wochen.length) Object.assign(out, bedingungen(bedZellen[i]));
    if (out.bop) letzteBop = out.bop; else if (letzteBop) out.bop = letzteBop;
    return out;
  });
}

// Bedingungs-Zelle → wx {c: °C, r: 0 trocken / Regen-% / -1 möglich, st: r|s, gelb, fmin, fmax} und bop [[Kürzel, Sprit %, kg, Leistung %]]
function bedingungen(txt) {
  const wx = {};
  const t = txt.match(/^\d+°F\/(-?\d+)°C/);
  if (t) wx.c = Number(t[1]);
  const rc = txt.match(/Rain chance (\d+)%/i);
  if (rc) wx.r = Number(rc[1]); else if (/Rain possible/i.test(txt)) wx.r = -1; else if (/All dry/i.test(txt)) wx.r = 0;
  if (/Standing start/i.test(txt)) wx.st = "s"; else if (/Rolling start/i.test(txt)) wx.st = "r";
  if (/Local enforced cautions/i.test(txt)) wx.gelb = "lokal"; else if (/Full course cautions/i.test(txt)) wx.gelb = "voll"; else if (/Cautions disabled/i.test(txt)) wx.gelb = "aus";
  const fmin = txt.match(/Min (\d+) drivers?/i), fmax = txt.match(/Max (\d+) drivers?/i);
  if (fmin) wx.fmin = Number(fmin[1]);
  if (fmax) wx.fmax = Number(fmax[1]);
  // BoP steht hinter „Qual scrutiny - …." als „KÜRZEL: fuel: 97%, 5.0kg, pwr: -0.50%"
  const rest = txt.split(/Qual scrutiny - \w+\.?/i).slice(1).join(" ");
  const bop = [];
  for (const m of rest.matchAll(/\b([A-Z0-9][A-Za-z0-9]{1,9}):\s+(.*?)(?=\s[A-Z0-9][A-Za-z0-9]{1,9}:\s|$)/g)) {
    const v = m[2].replace(/-\s+(?=\d)/g, "-");
    const fuel = v.match(/fuel:\s*(\d+(?:\.\d+)?)%/), kg = v.match(/(-?\d+(?:\.\d+)?)kg/), pwr = v.match(/pwr:\s*(-?\d+(?:\.\d+)?)%/);
    if (fuel || kg || pwr) bop.push([m[1], fuel ? Number(fuel[1]) : null, kg ? Number(kg[1]) : null, pwr ? Number(pwr[1]) : null]);
  }
  const out = {};
  if (Object.keys(wx).length) out.wx = wx;
  if (bop.length) out.bop = bop;
  return out;
}

/* ---------------- Special Events (iracing.com) ---------------- */
const ohneTags = (h) => String(h || "").replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;/g, " ").replace(/&#8211;|&ndash;/g, "–").replace(/&#8217;|&rsquo;/g, "’").replace(/&#8220;|&#8221;/g, '"').replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/\s+/g, " ").trim();
function datumBereich(txt, jahrStd) {
  const t = txt.replace(/[–—]/g, "-");
  const m = t.match(/([A-Za-z]{3,})\.?\s+(\d{1,2})(?:\s*-\s*(?:([A-Za-z]{3,})\.?\s+)?(\d{1,2}))?,?\s*(\d{4})?/);
  if (!m) return null;
  const m1 = MONATE[m[1].slice(0, 3).toLowerCase()];
  if (!m1) return null;
  const m2 = m[3] ? MONATE[m[3].slice(0, 3).toLowerCase()] : m1;
  const jahr = Number(m[5]) || jahrStd;
  const von = `${jahr}-${pad(m1)}-${pad(Number(m[2]))}`;
  const bis = m[4] ? `${m2 < m1 ? jahr + 1 : jahr}-${pad(m2)}-${pad(Number(m[4]))}` : von;
  return { von, bis };
}
// Kategorie eines Special Events aus Fahrzeugen/Name (wie im Season-PDF: Sports Car, Formula Car, Oval, Dirt …)
function kategorie(txt) {
  if (/sprint car|midget|dirt|off-road|rallycross|chili bowl|knoxville|ump\b/i.test(txt)) return "Dirt";
  if (/nascar|late model|modified|arca|legends|street stock|truck|stock car/i.test(txt)) return "Oval";
  if (/formula|ff1600|f1600|dallara|indycar|ir-?18|indy 500|skip barber|\bf[34]\b|super formula/i.test(txt)) return "Formula Car";
  if (/gt[34]|gtp|hyp|lmp|lmh|porsche|cup 99|supercars|tcr|mx-?5|bmw|production car|prototype|hpd|gt[12]\b|radical|ferrari|touring|clio|gr86|scca|endurance|team event/i.test(txt)) return "Sports Car";
  return "";
}
function parseSpecials(html) {
  const jahrStd = Number((html.match(/(20\d\d) Special Events Calendar/) || [])[1]) || new Date().getUTCFullYear();
  const out = [];
  for (const sec of html.split("<section").slice(1)) {
    const h2 = sec.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!h2) continue;
    const name = ohneTags(h2[1]);
    const vor = sec.slice(0, h2.index);
    const tagM = [...vor.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].pop();
    const tag = tagM ? ohneTags(tagM[1]) : "";
    const nach = sec.slice(h2.index + h2[0].length);
    const ps = [...nach.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)];
    if (!ps.length) continue;
    const datum = datumBereich(ohneTags(ps[0][1]), jahrStd);
    if (!datum) continue;
    const text = ps.slice(1, 3).map(p => ohneTags(p[1])).join(" ").slice(0, 600);
    // Strecken aus den Links: erst die Linktexte (Anzeige), dann die Namen aus /tracks/… („Tulsa Expo Center" → chili bowl)
    const links = ps.slice(1, 3).flatMap(p => [...p[1].matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/g)].map(a => [ohneTags(a[2]), ((a[1].match(/href="[^"]*\/tracks\/([^"/]+)/) || [])[1] || "").replace(/-/g, " ")]))
      .filter(([t]) => t && t.length < 80);
    const orte = [...new Set([...links.map(l => l[0]), ...links.map(l => l[1]).filter(Boolean)])];
    const hm = (name + " " + text).match(/(\d{1,2})\s*-?\s*(?:hours?|hrs?|hr|h)\b/i);
    const lm = hm ? null : text.match(/\b(\d{2,3})[\s-]*laps?\b/i); // „300 lap showdown", „55-lap A main"
    const id = (sec.match(/^[^>]*\bid="([^"]+)"/) || [])[1] || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const autos = [...sec.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map(m => ohneTags(m[1])).filter(Boolean).join(", ");
    out.push({ id, n: name, tag: tag.length < 30 ? tag : "", cat: kategorie(autos + " " + name + " " + tag), von: datum.von, bis: datum.bis, h: hm ? Number(hm[1]) : undefined, laps: lm ? Number(lm[1]) : undefined, autos, txt: text, orte });
  }
  // iRacing kopiert Abschnitte samt Kennung (992 Endurance Cup hatte „spa-24"): bei doppelter Kennung bekommt
  // der Eintrag, dessen Name nicht zur Kennung passt, eine eigene aus dem Namen
  const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const x of out) {
    if (out.filter(o => o.id === x.id).length < 2) continue;
    if (!x.id.split("-").some(w => w.length > 2 && slug(x.n).split("-").includes(w))) x.id = slug(x.n);
  }
  return out.sort((a, b) => a.von.localeCompare(b.von));
}

/* ---------------- iRacePlan-API (Hauptquelle) ----------------
   Schlüssel aus iraceplan.com/settings/api_keys, liegt als GitHub-Secret IRACEPLAN_API_KEY.
   Nur lesen, behutsam (≈4 Anfragen/s), bei 429 Retry-After abwarten. Alle Zeiten UTC. */
const API = process.env.IRACEPLAN_API_URL || "https://iraceplan.com/api/v1";
const warte = (ms) => new Promise(r => setTimeout(r, ms));
async function apiHolen(pfad, key, versuch = 0) {
  const r = await fetch(API + pfad, { headers: { Authorization: "Bearer " + key, Accept: "application/json", "User-Agent": UA } });
  if (r.status === 429 && versuch < 5) { await warte((Number(r.headers.get("retry-after")) || 5) * 1000); return apiHolen(pfad, key, versuch + 1); }
  if (!r.ok) throw new Error("iRacePlan " + pfad.split("?")[0] + " → HTTP " + r.status);
  await warte(250);
  return r.json();
}
const liste = (x, ...keys) => Array.isArray(x) ? x : (keys.map(k => x && x[k]).find(Array.isArray) || []);
function streckeVon(sc) {
  const t = sc.track;
  if (typeof t === "string") return t;
  const name = (t && (t.name || t.track_name)) || sc.track_name || "";
  const cfg = (t && (t.config_name || t.configuration || t.config)) || sc.track_config_name || sc.config_name || "";
  return cfg && !name.includes(cfg) ? (name ? name + " - " + cfg : cfg) : name;
}
async function ausApi(key) {
  const alle = liste(await apiHolen("/series?limit=500", key), "series", "data", "items");
  if (!alle.length) throw new Error("keine Serien in der Antwort");
  // Teamrennen erkennt man erst im Detail (max_team_drivers > 1); Oval/Dirt nur als Special Event
  const kandidaten = alle.filter(s => s && (s.special_event || s.team || !/oval|dirt/i.test(katName(s.category))));
  const felder = { liste: Object.keys(alle[0] || {}) };
  const serien = [];
  for (const k of kandidaten) {
    let det;
    try { det = await apiHolen("/series/" + encodeURIComponent(k.id), key); }
    catch (e) { console.warn("Serie " + k.id + ": " + e.message); continue; }
    const s = det.serie || det.series || det.data || det;
    const cs = s.current_season || {};
    if (!felder.serie) {
      felder.serie = Object.keys(s); felder.saison = Object.keys(cs);
      felder.kategorie = s.category && typeof s.category === "object" ? Object.keys(s.category) : typeof s.category;
      const sc0 = liste(cs.schedules, "data")[0]; if (sc0) felder.woche = Object.keys(sc0);
      // Strecken-Angaben mitschreiben (gibt es offizielle iRacing-Karten, z. B. track_map?), lange Werte gekürzt
      if (sc0 && sc0.track && typeof sc0.track === "object") felder.strecke = Object.fromEntries(Object.entries(sc0.track).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v).slice(0, 300) : String(v).slice(0, 200)]));
    }
    const kl0 = liste(cs.car_classes, "data")[0];
    if (kl0 && !felder.klasse) { felder.klasse = Object.keys(kl0); const a0 = liste(kl0.cars, "data")[0]; if (a0) felder.auto = Object.keys(a0); }
    const sp = !!s.special_event, team = !!s.team || Number(cs.max_team_drivers) > 1;
    if (!sp && !team) continue;
    const w = liste(cs.schedules, "data").map((sc, i) => {
      const st = liste(sc.session_times, "data").map(x => Date.parse(x.start_at)).filter(Number.isFinite).sort((a, b) => a - b);
      const d = sc.start_date ? String(sc.start_date).slice(0, 10) : st.length ? isoTag(st[0]) : "";
      if (!d) return null;
      const out = { nr: i + 1, d, t: streckeVon(sc) };
      if (Number(sc.race_lap_limit) > 0) out.laps = Number(sc.race_lap_limit);
      else if (Number(sc.race_time_limit) > 0) out.min = Number(sc.race_time_limit);
      if (st.length) out.s = st;
      return out;
    }).filter(Boolean);
    if (w.length) serien.push({ id: Number(s.iracing_id || k.iracing_id) || void 0, n: s.name || k.name, cat: titel(katName(s.category) || katName(k.category)), cls: "", team, sp, cars: autosVon(cs), takt: "", w });
  }
  console.log("API-Felder:", JSON.stringify(felder));
  return { serien, felder };
}
// Fahrzeuge einer Season: Fahrzeugnamen aus car_classes[].cars, sonst die Klassennamen
function autosVon(cs) {
  const name = (x) => typeof x === "string" ? x : x && (x.name || x.car_name || x.full_name || x.short_name || x.car_name_abbreviated) || "";
  const out = [];
  for (const k of liste(cs.car_classes, "data", "classes")) {
    const autos = liste(k && k.cars, "data").map(name).filter(Boolean);
    if (autos.length) out.push(...autos); else if (name(k)) out.push(name(k));
  }
  return [...new Set(out)].join(", ");
}
const katName = (c) => typeof c === "string" ? c : c && typeof c === "object" ? String(c.name || c.title || c.label || c.category || "") : "";

/* ---------------- Ablauf ----------------
   Nur Teamrennen und Special Events, keine Daily-Rennen. */
let quelle = "pdf", saison = "", serien = [], apiFelder = null;
const KEY = process.env.IRACEPLAN_API_KEY;
if (KEY) {
  try {
    const a = await ausApi(KEY);
    apiFelder = a.felder;
    if (a.serien.length) { serien = a.serien; quelle = "iraceplan"; }
    else console.warn("iRacePlan: keine Teamrennen/Special Events gefunden, nehme das offizielle PDF.");
  } catch (e) { console.warn("iRacePlan-API nicht nutzbar (" + e.message + "), nehme das offizielle PDF."); }
} else console.log("Kein IRACEPLAN_API_KEY gesetzt, nehme das offizielle PDF.");
// Season-PDF immer lesen: Rückfall-Quelle und Zusatzinfos (Klasse, Wetter, Start, BoP, Fahrzeuge)
let pdf = null;
try {
  pdf = parseSchedule(await pdfText());
  if (pdf.serien.length < 50) throw new Error("nur " + pdf.serien.length + " Serien erkannt, Format geändert?");
} catch (e) {
  if (quelle === "pdf") throw new Error("Season-PDF: " + e.message);
  console.warn("Season-PDF nicht nutzbar (" + e.message + "), nur API-Daten.");
  pdf = null;
}
if (quelle === "pdf") {
  saison = pdf.saison;
  serien = pdf.serien.filter(s => s.team);
} else if (pdf) {
  saison = pdf.saison;
  const nn = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\b(fixed|by \w+)\b/g, "").trim();
  const genutzt = new Set();
  for (const s of serien) {
    const p = pdf.serien.find(x => nn(x.n) === nn(s.n)) || pdf.serien.find(x => nn(x.n).includes(nn(s.n)) || nn(s.n).includes(nn(x.n)));
    if (!p) continue;
    genutzt.add(p);
    if (p.team) s.team = true;
    // Fahrzeuge: das PDF nennt die einzelnen Autos, die API oft nur Klassen („GT3 Class")
    s.cat = s.cat || p.cat; s.cls = s.cls || p.cls; s.cars = p.cars || s.cars; s.takt = s.takt || p.takt;
    for (const w of s.w) {
      const tag = Date.parse(w.d + "T00:00:00Z");
      const pw = p.w.find(x => Math.abs(Date.parse(x.d + "T00:00:00Z") - tag) <= 3 * 864e5);
      if (!pw) continue;
      if (pw.wx && !w.wx) w.wx = pw.wx;
      if (pw.bop && !w.bop) w.bop = pw.bop;
      if (!w.t) w.t = pw.t;
    }
    // iRacePlan hinkt manchmal eine Season hinterher: neuere Wochen aus dem PDF anhängen
    const letzte = s.w.length ? Math.max(...s.w.map(w => Date.parse(w.d + "T00:00:00Z"))) : 0;
    const neuer = p.w.filter(x => Date.parse(x.d + "T00:00:00Z") > letzte + 3 * 864e5);
    if (neuer.length) { s.w.push(...neuer); console.log(`${s.n}: ${neuer.length} neuere Wochen aus dem PDF ergänzt`); }
  }
  // Teamrennen, die die API nicht als solche liefert, aus dem PDF ergänzen
  for (const p of pdf.serien) if (p.team && !genutzt.has(p)) serien.push(p);
}
let specials = [];
try { specials = parseSpecials(process.env.SPECIAL_FILE ? fs.readFileSync(process.env.SPECIAL_FILE, "utf8") : await holen(SPECIAL_URL)); }
catch (e) { console.warn("Special Events nicht geladen:", e.message); }
// alte Special Events behalten, falls die Seite mal nichts liefert
if (!specials.length && fs.existsSync(OUT)) { try { specials = JSON.parse(fs.readFileSync(OUT, "utf8")).specials || []; } catch { } }

// Special Events, die die API schon mit echten Startzeiten liefert, nicht doppelt zeigen.
// Zeitraum UND Name müssen passen: nur nach Datum wurde z. B. der Chili Bowl dem Production Car Challenge zugeordnet
for (const x of specials) {
  delete x.api; delete x.slots; delete x.std;
  const von = Date.parse(x.von + "T00:00:00Z") - 864e5, bis = Date.parse(x.bis + "T23:59:59Z") + 864e5;
  const sw = stichworte(x.n);
  const s = serien.find(s => s.sp && s.w.some(w => (w.s || []).some(t => t >= von && t <= bis)) && [...stichworte(s.n)].some(w => sw.has(w)));
  if (s) {
    x.api = true;
    if (!s.cars && x.autos) s.cars = x.autos;
  } else if (/team/i.test(x.tag)) {
    const st = standardSlots(x);
    if (st.length) { x.slots = st; x.std = true; }
  }
}
// Name → Stichworte; Zahlen, Füllwörter und Sponsoren zählen nicht („24 Hours of Spa Presented by Falken Tyre" → spa)
function stichworte(n) {
  const fuell = new Set(["the", "of", "at", "by", "and", "iracing", "com", "hours", "hour", "hr", "hrs", "race", "series", "event", "special", "fixed", "championship", "car", "cars", "cup", "class"]);
  return new Set(String(n || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\bpresented by\b.*$/, "")
    .split(/[^a-z0-9]+/).filter(w => w.length > 1 && !fuell.has(w) && !/^\d+(h|hr|hrs|km)?$/.test(w)));
}
// Team-Specials ohne API-Zeiten: iRacing nutzt (laut allen Team-Specials der API) dieselben Zeitfenster ab dem Freitag,
// in UTC Fr 22:00, Sa 07:00, 12:00, 16:00 und bei Rennen bis 10 h zusätzlich So 00:00. Auf der Seite als „voraussichtlich" markiert.
function standardSlots(x) {
  const h = 36e5, bis = Date.parse(x.bis + "T00:00:00Z");
  for (let t = Date.parse(x.von + "T00:00:00Z"); t <= bis; t += 24 * h) {
    if (new Date(t).getUTCDay() !== 5) continue;
    const out = [t + 22 * h, t + 31 * h, t + 36 * h, t + 40 * h];
    if (!(x.h > 10)) out.push(t + 48 * h);
    return out;
  }
  return [];
}
const daten = { v: 2, saison, quelle: quelle === "iraceplan" ? "iRacePlan-API" : "iRacing Season-PDF", serien, specials };
if (apiFelder) daten.apiFelder = apiFelder; // Feldnamen der API, falls sich das Format ändert
const neu = JSON.stringify(daten);
let alt = "";
try { const a = JSON.parse(fs.readFileSync(OUT, "utf8")); delete a.stand; alt = JSON.stringify(a); } catch { }
if (alt === neu) { console.log("Keine Änderung."); process.exit(0); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ ...daten, stand: new Date().toISOString() }));
console.log(`Geschrieben (${daten.quelle}): ${saison}, ${serien.length} Serien (${serien.filter(s => s.sp).length} Special Events), ${specials.length} Special Events von iracing.com → ${OUT}`);
