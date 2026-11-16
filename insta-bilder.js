// ═══════════════════════════════════════════════════════════
// Kreids888 · Instagram-Bilder im Browser zeichnen (für den Instagram-Reiter im Dashboard)
// Ankündigung + Ergebnis 1080×1350 (Feed 4:5), Raceday 1080×1920 (Story 9:16).
// Aufbau als SVG (Saira Condensed eingebettet) → Canvas → JPEG. Der Worker kreids-insta
// speichert das fertige Bild und postet es. (Im Gratis-Tarif darf der Worker nicht selbst zeichnen.)
// Aussehen geändert? → ZEICHEN_VERSION in workers/kreids-insta/src/plan.js hochzählen.
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  // Schriften und Bilder kommen im Dashboard über /site/ (gleiche Adresse), auf kreids888.com direkt
  const SITE = /(^|\.)kreids888\.com$/.test(location.hostname) ? location.origin + '/' : location.origin + '/site/';
  const BREITEN = {"black":{" ":181,"!":295,"\"":440,"#":574,"$":411,"%":773,"&":558,"'":248,"(":314,")":314,"*":413,"+":473,",":277,"-":302,".":277,"/":353,"0":483,"1":326,"2":462,"3":450,"4":480,"5":467,"6":481,"7":434,"8":494,"9":481,":":277,";":277,"<":474,"=":473,">":474,"?":410,"@":725,"A":517,"B":492,"C":403,"D":500,"E":426,"F":397,"G":494,"H":520,"I":260,"J":326,"K":509,"L":385,"M":723,"N":526,"O":509,"P":483,"Q":509,"R":501,"S":449,"T":433,"U":506,"V":499,"W":781,"X":521,"Y":490,"Z":453,"[":329,"\\":353,"]":329,"^":382,"_":380,"`":224,"a":436,"b":454,"c":347,"d":454,"e":431,"f":338,"g":454,"h":457,"i":238,"j":238,"k":455,"l":238,"m":675,"n":457,"o":443,"p":454,"q":454,"r":336,"s":376,"t":328,"u":457,"v":433,"w":670,"x":445,"y":457,"z":410,"{":342,"|":247,"}":342,"~":467,"Ä":517,"Ö":509,"Ü":506,"ä":436,"ö":443,"ü":457,"ß":463,"·":277,"–":454,"—":820,"…":832,"°":327,"€":449,"§":510,"„":482,"“":485,"”":485,"‘":270,"’":270,"→":883,"←":883,"↑":395,"↓":395,"×":464},"xbold":{" ":178,"!":277,"\"":412,"#":576,"$":408,"%":754,"&":552,"'":233,"(":302,")":302,"*":410,"+":472,",":260,"-":298,".":260,"/":340,"0":479,"1":319,"2":456,"3":443,"4":473,"5":459,"6":475,"7":427,"8":489,"9":475,":":260,";":260,"<":473,"=":472,">":473,"?":402,"@":715,"A":509,"B":490,"C":400,"D":498,"E":424,"F":395,"G":490,"H":519,"I":251,"J":311,"K":500,"L":382,"M":714,"N":523,"O":507,"P":480,"Q":506,"R":499,"S":446,"T":425,"U":505,"V":492,"W":768,"X":510,"Y":476,"Z":446,"[":316,"\\":340,"]":316,"^":385,"_":372,"`":209,"a":431,"b":450,"c":343,"d":450,"e":427,"f":324,"g":449,"h":453,"i":230,"j":230,"k":442,"l":230,"m":670,"n":453,"o":439,"p":450,"q":450,"r":324,"s":372,"t":315,"u":453,"v":424,"w":657,"x":435,"y":453,"z":402,"{":330,"|":241,"}":330,"~":464,"Ä":508,"Ö":506,"Ü":505,"ä":431,"ö":439,"ü":453,"ß":459,"·":260,"–":451,"—":817,"…":782,"°":323,"€":445,"§":505,"„":453,"“":455,"”":455,"‘":254,"’":254,"→":883,"←":883,"↑":395,"↓":395,"×":455},"semi":{" ":186,"!":240,"\"":350,"#":561,"$":409,"%":700,"&":542,"'":198,"(":274,")":274,"*":406,"+":475,",":224,"-":300,".":224,"/":314,"0":477,"1":299,"2":445,"3":431,"4":467,"5":447,"6":474,"7":416,"8":489,"9":474,":":224,";":224,"<":475,"=":475,">":475,"?":382,"@":696,"A":495,"B":488,"C":396,"D":495,"E":423,"F":395,"G":485,"H":521,"I":235,"J":280,"K":486,"L":378,"M":690,"N":524,"O":509,"P":470,"Q":509,"R":490,"S":442,"T":414,"U":509,"V":476,"W":737,"X":494,"Y":452,"Z":432,"[":283,"\\":314,"]":282,"^":396,"_":347,"`":175,"a":422,"b":445,"c":342,"d":445,"e":425,"f":296,"g":444,"h":449,"i":214,"j":214,"k":420,"l":214,"m":671,"n":449,"o":435,"p":445,"q":445,"r":302,"s":373,"t":291,"u":449,"v":412,"w":631,"x":419,"y":449,"z":387,"{":296,"|":231,"}":296,"~":453,"Ä":495,"Ö":509,"Ü":509,"ä":422,"ö":435,"ü":449,"ß":458,"·":224,"–":440,"—":818,"…":674,"°":317,"€":443,"§":500,"„":389,"“":383,"”":383,"‘":214,"’":214,"→":883,"←":883,"↑":395,"↓":395,"×":442}};

  // Zeit in deutscher Zeit (wie im Worker)
  const TZ = 'Europe/Berlin';
  const FMT = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const WT = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'long' }), WTK = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'short' });
  function berlin(ms) {
    const p = {}; for (const x of FMT.formatToParts(new Date(ms))) p[x.type] = x.value;
    const d = new Date(ms);
    return { datum: `${p.year}-${p.month}-${p.day}`, zeit: `${p.hour}:${p.minute}`, tag: `${p.day}.${p.month}.`, jahr: p.year, wochentag: WT.format(d), wt: WTK.format(d).replace('.', '') };
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
  const daten = url => url;   // Bilder kommen im Browser schon als data:-URL

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
  // Kopf: Logo und (wenn gewählt) Team-Bild nebeneinander, mittig. Größen aus „Aussehen“ (KOPF wird in post() gesetzt).
  let KOPF = null;
  function kopf(B, y, logo, m) {
    const k = KOPF || {}, teile = [];
    if (k.logo) { const f = k.logoF || 1, s = Math.min(m.b * f / k.logo.w, m.h * f / k.logo.h); teile.push({ url: k.logo.url, w: k.logo.w * s, h: k.logo.h * s }); }
    if (k.team) { const f = k.teamF || 1, s = Math.min(m.b * 0.6 * f / k.team.w, m.h * f / k.team.h); teile.push({ url: k.team.url, w: k.team.w * s, h: k.team.h * s }); }
    if (!teile.length) return { svg: '', unten: y };
    const luecke = 44, maxB = B - 120;
    let gesamt = teile.reduce((a, t) => a + t.w, 0) + luecke * (teile.length - 1);
    if (gesamt > maxB) { const s = (maxB - luecke * (teile.length - 1)) / (gesamt - luecke * (teile.length - 1)); teile.forEach(t => { t.w *= s; t.h *= s; }); gesamt = maxB; }
    const hoehe = Math.max(...teile.map(t => t.h));
    let x = (B - gesamt) / 2, svg = '';
    for (const t of teile) { svg += `<image href="${t.url}" x="${x}" y="${y + (hoehe - t.h) / 2}" width="${t.w}" height="${t.h}" preserveAspectRatio="none" filter="url(#schatten)"/>`; x += t.w + luecke; }
    return { svg, unten: y + Math.max(hoehe, m.h * 0.6) };
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

  // ─── Wochenplan (Story 1080×1920) – Look wie der Streamkalender auf kreids888.com + Ich-Bild ───
  // Instagram legt oben (~200 px) und unten (~300 px) eigene Leisten drüber → Kopf ab y = 220.
  const MONATE = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
  const tagMonat = datum => { const [, m, d] = String(datum).split('-').map(Number); return { d, m: MONATE[m - 1] }; };
  function wochenText(von, bis) {
    const a = tagMonat(von), b = tagMonat(bis), j = String(bis).slice(0, 4);
    return a.m === b.m ? `${a.d}. – ${b.d}. ${b.m} ${j}` : `${a.d}. ${a.m} – ${b.d}. ${b.m} ${j}`;
  }
  function wocheSvg(post, design, bg, logo, pose) {
    const B = 1080, H = 1920, R = 80, f1 = design.farbe1 || '#e11324';
    const akzent = hellAuf(f1), weiss = '#f4f5f7', stahl = '#8b929c', panel = '#14161d', linie = '#242832';
    const liste = post.liste || [];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">
<defs>
<radialGradient id="gl1" cx="${B * 0.85}" cy="-100" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${f1}" stop-opacity=".34"/><stop offset="1" stop-color="${f1}" stop-opacity="0"/></radialGradient>
<radialGradient id="gl2" cx="${B * 0.9}" cy="${H - 300}" r="700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${f1}" stop-opacity=".22"/><stop offset="1" stop-color="${f1}" stop-opacity="0"/></radialGradient>
<filter id="schatten" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity=".7"/></filter>
<filter id="rand" x="0" y="-5%" width="100%" height="110%"><feMorphology in="SourceAlpha" operator="dilate" radius="6" result="d"/><feFlood flood-color="#ffffff"/><feComposite in2="d" operator="in" result="r"/><feDropShadow in="r" dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity=".6" result="rs"/><feMerge><feMergeNode in="rs"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="${B}" height="${H}" fill="#0a0b0e"/>`;
    for (let i = -6; i < 16; i++) s += `<polygon points="${i * 140},${H} ${i * 140 + H * 0.5},0 ${i * 140 + H * 0.5 + 46},0 ${i * 140 + 46},${H}" fill="${f1}" opacity="${i % 3 === 0 ? 0.07 : 0.025}"/>`;
    s += `<rect width="${B}" height="${H}" fill="url(#gl1)"/><rect width="${B}" height="${H}" fill="url(#gl2)"/><rect width="${B}" height="14" fill="${f1}"/>`;
    // Kopf: STREAM WEEK · KREIDS888 · Woche
    s += `<text x="${R}" y="250" ${SCHRIFT.semi} font-size="40" letter-spacing="14" fill="${akzent}">STREAM WEEK</text>`;
    s += `<text x="${R - 2}" y="398" ${SCHRIFT.black} font-size="150" fill="${weiss}">KREIDS<tspan fill="${f1}">888</tspan></text>`;
    s += `<text x="${R + 2}" y="458" ${SCHRIFT.semi} font-size="40" letter-spacing="2" fill="${stahl}">${esc(wochenText(post.datum, post.bisDatum))}</text>`;
    s += `<rect x="${R}" y="496" width="${B - 2 * R}" height="2" fill="${linie}"/>`;
    // Termine
    const oben = 540, unten = 1250, rowH = (unten - oben) / Math.max(1, liste.length), ch = Math.min(rowH - 16, 230);
    liste.forEach((e, i) => {
      const y = oben + i * rowH, z = berlin(e.liveMs), t = tagMonat(e.datum);
      s += `<rect x="${R}" y="${y}" width="${B - 2 * R}" height="${ch}" fill="${panel}" fill-opacity=".92"/><rect x="${R}" y="${y}" width="10" height="${ch}" fill="${f1}"/>`;
      const wtG = Math.min(74, ch * 0.42);
      s += `<text x="195" y="${y + ch * 0.48}" text-anchor="middle" ${SCHRIFT.black} font-size="${wtG}" fill="${akzent}">${esc(gross(z.wt))}</text>`;
      s += `<text x="195" y="${y + ch * 0.48 + Math.min(44, ch * 0.24)}" text-anchor="middle" ${SCHRIFT.semi} font-size="${Math.min(36, ch * 0.2)}" fill="${stahl}">${esc(t.d + '. ' + t.m)}</text>`;
      s += `<rect x="309" y="${y + 26}" width="2" height="${Math.max(10, ch - 52)}" fill="${linie}"/>`;
      const titel = gross((e.spr && e.track ? e.track + ' · ' : '') + (e.titel || e.serie || e.art || 'Rennen'));
      const maxB = B - 90 - 345, tit = umbruch(titel, 'xbold', maxB, Math.min(52, ch * 0.3), 26);
      const zeile2 = `${z.zeit} UHR` + (e.art && e.art !== 'Rennen' ? ' · ' + gross(e.art) : '') + (e.nr ? ' · RUNDE ' + e.nr : '') + (e.reverseGrid ? ' · 2 RENNEN' : '');
      const z2G = Math.min(38, ch * 0.2), lh = tit.g * 1.02, block = tit.zeilen.length * lh + z2G + 10;
      let ty = y + (ch - block) / 2 + tit.g * 0.8;
      tit.zeilen.forEach(l => { s += `<text x="345" y="${ty}" ${SCHRIFT.xbold} font-size="${tit.g}" fill="${weiss}">${esc(l)}</text>`; ty += lh; });
      s += `<text x="345" y="${ty - lh + tit.g * 0.2 + z2G + 6}" ${SCHRIFT.semi} font-size="${passend(zeile2, 'semi', maxB, z2G, 18)}" fill="${stahl}">${esc(zeile2)}</text>`;
    });
    // Fuß: Linie, Logo (+ Team-Bild), „Live auf …“, Website – rechts das Ich-Bild
    s += `<rect x="0" y="1290" width="${B}" height="4" fill="${f1}"/>`;
    const k = KOPF || {}, teile = [];
    if (k.logo) teile.push(k.logo);
    if (k.team) teile.push(k.team);
    if (teile.length) {
      const maxB = 520, maxH = 170 * Math.max(k.logoF || 1, 0.6), luecke = 30;
      let gr = teile.map(t => { const f = Math.min(maxB / t.w, maxH / t.h); return { url: t.url, w: t.w * f, h: t.h * f }; });
      const ges = gr.reduce((a, t) => a + t.w, 0) + luecke * (gr.length - 1);
      if (ges > maxB) { const f = (maxB - luecke * (gr.length - 1)) / (ges - luecke * (gr.length - 1)); gr = gr.map(t => ({ ...t, w: t.w * f, h: t.h * f })); }
      const hh = Math.max(...gr.map(t => t.h));
      let x = R;
      for (const t of gr) { s += `<image href="${t.url}" x="${x}" y="${1340 + (hh - t.h) / 2}" width="${t.w}" height="${t.h}" preserveAspectRatio="none" filter="url(#schatten)"/>`; x += t.w + luecke; }
    }
    const lz = liveZeile(design);
    if (lz) {
      s += `<text x="${R}" y="1590" ${SCHRIFT.semi} font-size="28" letter-spacing="3" fill="${stahl}">LIVE AUF</text>`;
      s += `<text x="${R}" y="1640" ${SCHRIFT.xbold} font-size="${passend(lz, 'xbold', 520, 46, 24)}" fill="${weiss}">${esc(lz)}</text>`;
    }
    s += `<text x="${R}" y="1690" ${SCHRIFT.semi} font-size="26" letter-spacing="3" fill="#c9d1da">${WEBSEITE}</text>`;
    if (pose) {
      const h = 680, w = h * pose.w / pose.h;
      s += `<image href="${pose.url}" x="${B - w + 10}" y="${H - h}" width="${w}" height="${h}" preserveAspectRatio="none" filter="url(#rand)"/>`;
    }
    s += `<rect x="0" y="${H - 14}" width="${B}" height="14" fill="${f1}"/>`;
    return s + '</svg>';
  }

  // ─── Schriften (Saira Condensed von kreids888.com) als data:-URL ins SVG ───
  let schriftCss = null;
  const alsDataUrl = blob => new Promise((ok, nein) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => nein(new Error('Datei nicht lesbar')); r.readAsDataURL(blob); });
  async function holen(url) {
    const r = await fetch(url, { cache: 'force-cache' });
    if (!r.ok) throw new Error('Nicht geladen (' + r.status + '): ' + url);
    return r.blob();
  }
  function schriften() {
    if (!schriftCss) schriftCss = Promise.all(['600', '800', '900'].map(async w => {
      const d = await alsDataUrl(await holen(SITE + `fonts/saira-condensed-latin-${w}-normal.woff2`));
      return `@font-face{font-family:'Saira Condensed';font-weight:${w};src:url(${d}) format('woff2')}`;
    })).then(l => l.join('')).catch(e => { schriftCss = null; throw e; });
    return schriftCss;
  }
  // Bild (Hintergrund, Logo) als data:-URL – fehlt es, wird ohne gezeichnet
  const CACHE = new Map();
  function bildDaten(url) {
    if (!url) return Promise.resolve(null);
    if (!CACHE.has(url)) CACHE.set(url, holen(url).then(alsDataUrl).catch(() => { CACHE.delete(url); return null; }));
    return CACHE.get(url);
  }
  // SVG → Canvas → JPEG
  async function rastern(svg, B, H, q) {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const i = new Image(); i.src = url; await i.decode();
      const c = document.createElement('canvas'); c.width = B; c.height = H;
      c.getContext('2d').drawImage(i, 0, 0, B, H);
      return await new Promise((ok, nein) => c.toBlob(b => (b ? ok(b) : nein(new Error('Bild konnte nicht erzeugt werden.'))), 'image/jpeg', q || 0.9));
    } finally { URL.revokeObjectURL(url); }
  }
  const svgFuer = (post, design, bg, logo, pose) => post.typ === 'woche' ? wocheSvg(post, design, bg, logo, pose) : post.typ === 'story' ? storySvg(post, design, bg, logo)
    : post.typ === 'erg' ? ergebnisSvg(post, design, bg, logo) : feedSvg(post, design, bg, logo);
  // Team-Bilder (kreids888.com/team/bilder), auf Wunsch ohne schwarzen Hintergrund
  const TEAM = [['f2f-logo.webp', 'F2F Logo', true], ['f2f-motto.webp', 'F2F Motto', true], ['f2f-cars.webp', 'F2F Autos'], ['f2f-recruiting.webp', 'F2F Recruiting'], ['f2f-logo.png', 'F2F Logo (PNG)'], ['f2f-g61.png', 'F2F G61']];
  const teamUrl = d => SITE + 'team/bilder/' + d;
  const MASSE = new Map();
  function masse(url) {
    if (!url) return Promise.resolve(null);
    if (!MASSE.has(url)) MASSE.set(url, new Promise(ok => { const i = new Image(); i.onload = () => ok({ url, w: i.naturalWidth, h: i.naturalHeight, img: i }); i.onerror = () => ok(null); i.src = url; }));
    return MASSE.get(url);
  }
  const TEAMBILD = new Map();
  function teamBild(datei, schwarzWeg) {
    if (!datei || !TEAM.some(t => t[0] === datei)) return Promise.resolve(null);
    const key = datei + (schwarzWeg ? '|s' : '');
    if (!TEAMBILD.has(key)) TEAMBILD.set(key, bildDaten(teamUrl(datei)).then(masse).then(m => {
      if (!m) return null;
      const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
      const g = c.getContext('2d'); g.drawImage(m.img, 0, 0);
      if (schwarzWeg) {
        const d = g.getImageData(0, 0, m.w, m.h), a = d.data;
        for (let i = 0; i < a.length; i += 4) { const x = Math.max(a[i], a[i + 1], a[i + 2]); if (x < 70) a[i + 3] = Math.min(a[i + 3], Math.max(0, (x - 18) * 5)); }
        g.putImageData(d, 0, 0);
      }
      return { url: c.toDataURL('image/png'), w: m.w, h: m.h };
    }).catch(() => { TEAMBILD.delete(key); return null; }));
    return TEAMBILD.get(key);
  }
  const prozent = (v, std) => { const n = Number(v); return (isFinite(n) && n > 0 ? n : std) / 100; };
  async function post(p, design) {
    const [css, bg, logo, team] = await Promise.all([schriften(), bildDaten(p.hg), bildDaten(design.logoBild), teamBild(design.team, design.teamSchwarz !== false)]);
    KOPF = { logo: await masse(logo), team, logoF: prozent(design.logoGroesse, 100), teamF: prozent(design.teamGroesse, 100) };
    const pose = p.typ === 'woche' && p.pose ? await bildDaten(SITE + 'overlays/personen/' + p.pose).then(masse) : null;
    let svg = svgFuer({ ...p, klassen: p.klassen || [] }, design, bg, logo, pose);
    svg = svg.replace(/^(<svg[^>]*>)/, `$1<style>${css}</style>`);
    return rastern(svg, 1080, p.typ === 'story' || p.typ === 'woche' ? 1920 : 1350, 0.9);
  }
  window.K888Bilder = { post, bildDaten, schriften, berlin, SITE, TEAM, teamUrl };
})();
