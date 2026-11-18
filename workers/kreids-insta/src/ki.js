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

// ─── Clickbait-Sprüche (YouTube-Thumbnail, Titel, Post-Bilder) ──────────────────
const gross = t => String(t || '').toLocaleUpperCase('de-DE');
// Vor dem Rennen (Stream-Ankündigung)
const VORHER = ['ALLES ODER NICHTS!', 'CRASH ODER PODIUM?', 'VON HINTEN NACH VORNE?!', 'NUR EINER KANN GEWINNEN', 'HEUTE WIRD ES KNAPP', 'ICH GEBE ALLES!',
  'DAS RENNEN DES JAHRES?', 'HEUTE KNALLT’S', 'HEUTE ODER NIE', 'WIRD DAS MEIN TAG?', 'HEUTE HOL ICH MIR DAS', 'DAS WIRD WILD', 'SCHAFF ICH DAS PODIUM?',
  'KURVE 1 WIRD BRUTAL', 'ICH HAB EINEN PLAN …', 'GEHT DAS GUT?', 'DIESMAL OHNE CRASH?', 'REVANCHE!', 'DIE STUNDE DER WAHRHEIT', 'ALLES AUF EINE KARTE',
  'DAS WIRD EIN KRIMI', 'BLEIBT DAS AUTO GANZ?', 'HEUTE WIRD ABGERECHNET', 'KEINE GNADE HEUTE', 'ZURÜCKSTECKEN? NIEMALS.', 'ZEIT FÜR RACHE', 'JETZT ODER NIE',
  'DAS DARF NICHT SCHIEFGEHEN', 'WAS KANN SCHON SCHIEFGEHEN?', 'VOLLGAS ODER KIESBETT?', 'SIEG ODER MAUER', 'DAS WIRD TEUER …', 'WER STOPPT MICH?',
  'KEINER RECHNET MIT MIR', 'MISSION PODIUM', 'HEUTE GIBT’S KEIN ZURÜCK', 'LETZTE CHANCE?', 'ICH HAB KEINE ANGST', 'HEUTE WIRD GEZAUBERT', 'BITTE KEIN CHAOS …'];
const VORHER_S = ['{S}: ALLES ODER NICHTS!', '{S}: HEUTE ODER NIE', 'MISSION {S}', '{S} WIRD WILD', '{S}: SIEG ODER MAUER?', '{S} – ICH KOMME!'];
// Nach dem Rennen, je nach Ergebnis
const SIEG = ['SIEG!', 'ERSTER! ENDLICH!', 'P1. EINFACH P1.', 'KEINER HOLT MICH EIN', 'ICH HAB GEWONNEN?!', 'DIESER SIEG IST VERRÜCKT', 'UNSCHLAGBAR!',
  'GANZ OBEN!', 'SIEG! UND WIE!', '{S}: SIEG!'];
const PODIUM = ['ENDLICH PODIUM!', 'P{Z}! PODIUM!', 'SO KNAPP AM SIEG …', 'PODIUM! ABER …', 'FAST GEWONNEN …', 'AUFS PODIUM GEKÄMPFT', 'CHAMPAGNER!', '{S}: PODIUM!'];
const NACH_VORN = ['VON P{A} AUF P{Z}?!', '+{D} PLÄTZE?!', '{D} PLÄTZE GUTGEMACHT!', 'DIE AUFHOLJAGD DES JAHRES', 'KEINER HAT DAMIT GERECHNET',
  'VON HINTEN NACH VORN!', 'PLATZ FÜR PLATZ NACH VORN', 'WER STOPPT MICH?!'];
const NACH_HINTEN = ['WAS IST DA PASSIERT?!', 'VON P{A} AUF P{Z} …', 'DAS LIEF KOMPLETT SCHIEF', 'SO WAR DAS NICHT GEPLANT', 'ICH BIN SPRACHLOS …',
  'ERKLÄR MIR DAS MAL', 'DAS TUT WEH …', 'WER HAT DAS VERBOCKT?', 'DAS RENNEN ZUM VERGESSEN'];
const ERGEBNIS = ['P{Z}! ZUFRIEDEN?', 'DAS ENDE WAR WILD …', 'WAS FÜR EIN RENNEN!', 'DAMIT HAT KEINER GERECHNET', 'ALLES GEGEBEN!', 'DAS WAR KNAPP!',
  'BIS ZUR LETZTEN KURVE', 'DRAMA BIS ZUM SCHLUSS', 'DIESES RENNEN WAR IRRE', '{S}: WAS FÜR EIN RENNEN!'];
const AUSFALL = ['AUS. EINFACH AUS.', 'DAS TUT RICHTIG WEH', 'WAS WAR DA LOS?!', 'NICHT MEIN TAG …', 'GAME OVER?', 'DAS DARF NICHT WAHR SEIN',
  'ICH BIN RAUS …', 'DAS ENDE WAR WILD …', 'WER WAR DAS?!'];
// Strecke kurz: „Circuit de Spa-Francorchamps – GP“ → „SPA-FRANCORCHAMPS“ (zu lang = Sprüche mit Strecke fallen weg)
function streckeKurz(post) {
  let t = gross(post.track || '').split(/\s[-–(|]\s?|\(/)[0].trim();
  t = t.replace(/^(CIRCUIT( DE| OF THE)?|AUTODROMO( NAZIONALE)?( DI)?|AUTÓDROMO|AUTODROM|RACEWAY|INTERNATIONAL)\s+/g, '').trim();
  if (t.length > 16) t = t.includes('NORDSCHLEIFE') ? 'NORDSCHLEIFE' : t.split(/[\s-]/)[0];   // „SPA-FRANCORCHAMPS“ → „SPA“, „NÜRBURGRING COMBINED“ → „NÜRBURGRING“
  return t.length >= 3 && t.length <= 16 ? t : '';
}
function topf(post) {
  const e = post.ergebnis, S = streckeKurz(post), z = e && e.ziel, a = e && e.start, d = a && z ? a - z : 0;
  let l;
  if (!e) l = [...VORHER, ...VORHER_S];
  else if (!z) l = AUSFALL;
  else if (z === 1) l = [...SIEG, ...(a > 1 ? ['VON P{A} ZUM SIEG?!', 'VON P{A} AUF P1?!'] : a === 1 ? ['VON DER POLE ZUM SIEG'] : [])];
  else if (z <= 3) l = [...PODIUM, ...(d >= 3 ? NACH_VORN.slice(0, 3) : [])];
  else if (d >= 3) l = [...NACH_VORN, ...ERGEBNIS.slice(0, 4)];
  else if (d <= -3) l = NACH_HINTEN;
  else l = ERGEBNIS;
  return l.filter(x => S || !x.includes('{S}'))
    .map(x => x.replace(/\{S\}/g, S).replace(/\{Z\}/g, z || '').replace(/\{A\}/g, a || '').replace(/\{D\}/g, d))
    .filter(x => !/[{}]/.test(x) && x.length <= 32);
}
// KI-Antwort aufräumen: eine Zeile = ein Spruch, nur Text (keine Emojis, keine Nummern, höchstens 6 Wörter)
function kiZeilen(text) {
  return String(text || '').split('\n')
    .map(z => gross(z.replace(/^[\s\d.)\-•*"„“”']+|["“”„']+$/g, '').replace(/'/g, '’').replace(/\s+/g, ' ').trim()))
    .filter(z => z.length >= 3 && z.length <= 32 && z.split(' ').length <= 6 && /^[A-ZÄÖÜẞ0-9][A-ZÄÖÜẞ0-9 .,!?…:’%+\-–/]*$/.test(z)
      && !/:$/.test(z) && !/\b(TEXTE?|HIER SIND|THUMBNAILS?|YOUTUBE|CLICKBAIT|VORSCHLÄGE?)\b/.test(z));   // keine Einleitung der KI
}
function antwortText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (r.response) return typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
  if (r.result && r.result.response) return r.result.response;
  const c = r.choices && r.choices[0];
  return (c && c.message && c.message.content) || (c && c.text) || r.output_text || '';
}
const MODELLE = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/google/gemma-4-26b-a4b-it', '@cf/meta/llama-3.1-8b-instruct-fast'];
// benutzt: Sprüche, die schon an anderen Rennen hängen (kommen nicht nochmal)
export async function sprueche(env, post, benutzt) {
  const weg = new Set([...(benutzt || [])].map(gross));
  const frei = l => l.filter(x => !weg.has(gross(x)));
  let pool = frei(topf(post));
  if (pool.length < 6) pool = topf(post);   // alles schon mal benutzt → dann eben wieder von vorn
  pool = mischen(pool);
  let ki = [];
  if (env.AI) {
    const e = post.ergebnis;
    const info = [post.serie && 'Serie: ' + post.serie, post.track && 'Strecke: ' + post.track, post.nr && 'Runde ' + post.nr,
      e && e.ziel ? `Ergebnis: Platz ${e.ziel}${e.start ? ' (gestartet von Platz ' + e.start + ')' : ''}` : e ? 'Ergebnis: ausgefallen' : 'Das Rennen kommt noch (Livestream-Ankündigung)'].filter(Boolean).join(', ');
    const beispiele = pool.slice(0, 6).join(' / ');
    const msg = [
      { role: 'system', content: 'Du schreibst Clickbait für YouTube-Thumbnails eines deutschen Simracing-Kanals (iRacing, Ich-Perspektive des Fahrers). Jeder Text: 2 bis 5 Wörter, knallig, frech, macht neugierig – wie bei großen YouTubern. Mischen: Fragen, Ausrufe, Andeutungen mit „…“, Ich-Sätze, Zahlen. Natürliches Deutsch, Simracing-Sprache erlaubt (Kurve 1, Kiesbett, Mauer, Podium, Strafe). Nichts behaupten, was nicht stimmt (kein Unfall, kein Sieg, wenn es nicht passiert ist). Keine Emojis, keine Hashtags, keine Anführungszeichen, keine Nummern. Eine Zeile pro Text, sonst nichts.' },
      { role: 'user', content: `${info}. Schreib 12 neue Texte, jeder anders aufgebaut. So ungefähr (nicht kopieren): ${beispiele}.${weg.size ? ' Nicht verwenden: ' + [...weg].slice(0, 25).join(' / ') + '.' : ''}` }
    ];
    for (const m of MODELLE) {
      try {
        const r = await env.AI.run(m, m.includes('gemma-4') ? { messages: msg, max_completion_tokens: 900, temperature: 1 } : { messages: msg, max_tokens: 300, temperature: 1 });
        ki = [...new Set(kiZeilen(antwortText(r)))].filter(x => !weg.has(x) && !pool.includes(x));
        if (ki.length >= 3) break;
      } catch (err) { /* nächstes Modell */ }
    }
  }
  // Abwechselnd eigene und KI-Sprüche (die eigenen sind geprüft, die KI bringt Neues)
  const liste = [];
  for (let i = 0; liste.length < 12 && (i < pool.length || i < ki.length); i++) { if (pool[i]) liste.push(pool[i]); if (ki[i] && liste.length < 12) liste.push(ki[i]); }
  // Automatisch (ohne dass jemand drüberschaut): meistens einen geprüften Spruch, manchmal einen von der KI
  const auto = (ki.length && Math.random() < 0.35 ? ki[0] : pool[0]) || liste[0] || '';
  return { liste: [...new Set(liste)], ki: ki.length > 0, auto };
}
