// ═══════════════════════════════════════════════════════════
// Cloudflare Workers AI (gratis Kontingent):
// • KI-Hintergrundbild (FLUX) – echte Rennautos, Schrift kommt nie von der KI
// • Clickbait-Sprüche fürs YouTube-Thumbnail (Text-KI), sonst feste Vorschläge
// Das Zeichnen der fertigen Bilder macht der Browser (Dashboard), nicht der Worker:
// Im Gratis-Tarif hat ein Worker nur 10 ms Rechenzeit pro Aufruf.
// ═══════════════════════════════════════════════════════════
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

// ─── Clickbait-Sprüche (YouTube-Thumbnail) ──────────────────
const gross = t => String(t || '').toLocaleUpperCase('de-DE');
function ersatzSprueche(post) {
  const t = gross(post.track || post.titel || 'Rennen');
  const e = post.ergebnis;
  if (e && e.ziel) {
    const d = e.start ? e.start - e.ziel : 0;
    return [e.ziel === 1 ? 'SIEG!' : `P${e.ziel}!`, d > 0 ? `VON P${e.start} AUF P${e.ziel}?!` : 'DAS WAR KNAPP!', e.ziel <= 3 ? 'ENDLICH PODIUM!' : 'ALLES GEGEBEN!',
      `${t} – WAS FÜR EIN RENNEN!`, 'DAS ENDE WAR WILD…', 'DAMIT HAT KEINER GERECHNET'];
  }
  return [`${t}: ALLES ODER NICHTS!`, 'CRASH ODER PODIUM?', 'VON HINTEN NACH VORNE?!', 'NUR EINER KANN GEWINNEN', 'HEUTE WIRD ES KNAPP', 'ICH GEBE ALLES!',
    `${t} – LIVE!`, 'DAS RENNEN DES JAHRES?'];
}
export async function sprueche(env, post) {
  const ersatz = ersatzSprueche(post).map(t => t.slice(0, 40));
  if (!env.AI) return { liste: ersatz, ki: false };
  const e = post.ergebnis;
  const info = [post.serie && 'Serie: ' + post.serie, post.track && 'Strecke: ' + post.track, post.nr && 'Runde ' + post.nr,
    e && e.ziel ? `Ergebnis: Platz ${e.ziel}${e.start ? ' (gestartet von Platz ' + e.start + ')' : ''}` : e ? 'Ergebnis: ausgefallen' : 'Das Rennen kommt noch (Livestream)'].filter(Boolean).join(', ');
  try {
    const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'Du schreibst kurze, reißerische deutsche Texte für YouTube-Thumbnails von Simracing-Videos (iRacing). Jeder Text hat höchstens 5 Wörter, wirkt wie Clickbait, aber ohne Lügen und ohne Emojis. Antworte nur mit den Texten, einer pro Zeile, ohne Nummern und ohne Anführungszeichen.' },
        { role: 'user', content: `Schreib 8 Texte für dieses Rennen. ${info}.` }
      ],
      max_tokens: 200, temperature: 0.9
    });
    const text = String((r && (r.response || (r.result && r.result.response))) || '');
    const liste = [...new Set(text.split('\n').map(z => gross(z.replace(/^[\s\d.)\-•*"„“]+|["“”]+$/g, '').trim())).filter(z => z.length >= 3 && z.length <= 40))].slice(0, 8);
    if (liste.length >= 3) return { liste, ki: true };
  } catch (err) { /* Ersatz */ }
  return { liste: ersatz, ki: false };
}
