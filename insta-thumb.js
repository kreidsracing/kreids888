// ═══════════════════════════════════════════════════════════
// Kreids888 · YouTube-Thumbnail-Editor (1920×1080) im Instagram-Reiter des Dashboards
// • EINE Vorlage für alle Rennen (gespeichert im Worker kreids-insta), jedes Rennen bringt seine Daten mit
// • Varianten: jedes Rennen sieht von selbst anders aus (Seite, Farben, Pose, Team-Bild, Spruch-Stil, Bildausschnitt),
//   „🎲 Neue Variante“ würfelt neu, „Für dieses Rennen speichern“ hält ein Rennen fest
// • Ebenen: Texte mit Platzhaltern, Logo, Ich-Bild (Posen wie beim Social-Bild), Team-Bild
// • Klicken = auswählen, Ziehen = verschieben, Mausrad = Größe, freie Fläche ziehen = Hintergrund verschieben
// • Spruch pro Rennen, Clickbait-Vorschläge per Cloudflare-KI (Worker /api/sprueche)
// • Download: PNG unter 2 MB, sonst JPG
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  const B = 1920, H = 1080;
  const SITE = (window.K888Bilder && window.K888Bilder.SITE) || location.origin + '/site/';
  const FAMILIE = '"K888 Saira", "Saira Condensed", sans-serif';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gross = t => String(t || '').toLocaleUpperCase('de-DE');

  // Ich-Bilder (freigestellt, wie beim Social-Bild) und Team-Bilder
  const POSEN = [['zeigt-auf-dich.webp', 'Zeigt auf dich'], ['zeigt-zur-seite.webp', 'Zeigt zur Seite'], ['arme-verschraenkt.webp', 'Arme verschränkt'], ['facepalm.webp', 'Facepalm'], ['schock.webp', 'Schock'],
    ['pose_01_arme_verschraenkt.png', 'Arme verschränkt 2'], ['pose_02_zeigt_auf_dich.png', 'Zeigt auf dich 2'], ['pose_03_nachdenklich.png', 'Nachdenklich'], ['pose_04_daumen_hoch.png', 'Daumen hoch'],
    ['pose_05_zwinkern_fingerguns.png', 'Zwinkern Fingerguns'], ['pose_06_ernst_arme_verschraenkt.png', 'Ernst, Arme verschränkt'], ['pose_07_jubel_faust.png', 'Jubel Faust'], ['pose_08_idee_tippt_stirn.png', 'Idee, tippt Stirn']];
  const TEAM = [['f2f-logo.webp', 'F2F Logo', true], ['f2f-motto.webp', 'F2F Motto', true], ['f2f-cars.webp', 'F2F Autos'], ['f2f-recruiting.webp', 'F2F Recruiting'], ['f2f-logo.png', 'F2F Logo (PNG)'], ['f2f-g61.png', 'F2F G61']];
  const posenUrl = d => SITE + 'overlays/personen/' + d, teamUrl = d => SITE + 'team/bilder/' + d;

  // ─── Standard-Vorlage ───
  const STANDARD = {
    version: 1, varianten: { seite: true, farben: true, pose: true, team: true, spruch: true, ausschnitt: true },
    hg: { zoom: 1, x: 0.5, y: 0.35, dunkel: 0.15, links: 0.85, leiste: true },
    elemente: [
      { id: 'team', typ: 'team', an: false, bild: 'f2f-logo.webp', schwarzWeg: true, x: 1560, y: 40, b: 300 },
      { id: 'pers', typ: 'pers', an: true, bild: 'pose_02_zeigt_auf_dich.png', x: 1150, y: 110, h: 980, spiegeln: false, rand: true, schatten: true },
      { id: 'spruch', typ: 'text', an: true, inhalt: '{spruch}', x: 90, y: 300, groesse: 150, gewicht: 900, farbe: '#ffffff', verlauf: false, farbe2: '#ffd400', rand: '#000000', randB: 0, box: 'schraeg', boxFarbe: '#e11324', schraeg: true, schatten: true, maxB: 1180, zeilen: 2, gross: true },
      { id: 'strecke', typ: 'text', an: true, inhalt: '{strecke}', x: 96, y: 640, groesse: 120, gewicht: 900, farbe: '#ffffff', verlauf: false, farbe2: '#ffd400', rand: '#000000', randB: 8, box: 'kein', boxFarbe: '#e11324', schraeg: false, schatten: true, maxB: 1100, zeilen: 1, gross: true },
      { id: 'info', typ: 'text', an: true, inhalt: '{serie} · {datum}', x: 100, y: 790, groesse: 52, gewicht: 800, farbe: '#ffd400', verlauf: false, farbe2: '#ffffff', rand: '#000000', randB: 0, box: 'kein', boxFarbe: '#000000', schraeg: false, schatten: true, maxB: 1100, zeilen: 1, gross: true },
      { id: 'live', typ: 'text', an: true, inhalt: '● {live}', x: 100, y: 880, groesse: 54, gewicht: 900, farbe: '#ffffff', verlauf: false, farbe2: '#ffffff', rand: '#000000', randB: 0, box: 'box', boxFarbe: '#e11324', schraeg: true, schatten: false, maxB: 900, zeilen: 1, gross: true },
      { id: 'logo', typ: 'logo', an: true, x: 80, y: 46, b: 520, schatten: true }
    ]
  };
  const NAMEN = { text: 'Text', pers: 'Ich-Bild', team: 'Team-Bild', logo: 'Logo' };
  const kopie = o => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('_') ? undefined : v)));
  function vorlageAus(v) {
    if (!v || !Array.isArray(v.elemente)) return kopie(STANDARD);
    return { ...kopie(STANDARD), ...kopie(v), hg: { ...STANDARD.hg, ...(v.hg || {}) } };
  }

  // ─── Varianten: jedes Rennen anders ───
  const PALETTEN = [['#e11324', '#ffd400'], ['#e11324', '#ffffff'], ['#1d4ed8', '#ffd400'], ['#2563eb', '#ffffff'], ['#7c3aed', '#22d3ee'], ['#ea580c', '#ffffff'],
    ['#15803d', '#a3e635'], ['#db2777', '#ffd400'], ['#0f766e', '#facc15'], ['#111111', '#ffd400'], ['#c026d3', '#ffffff'], ['#0891b2', '#ffd400']];
  function zufall(seed) {   // feste Zufallsfolge aus einer Zahl (gleiches Rennen → gleiche Variante)
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function zahlAus(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
  function seitenTausch(v) {
    for (const e of v.elemente) { e.x = B - e.x; e.rechts = !e.rechts; if (e.typ === 'pers') e.spiegeln = !e.spiegeln; }
    v.hg.seite = v.hg.seite === 'rechts' ? 'links' : 'rechts';
  }
  // Was von selbst wechselt (einstellbar): alte Vorlagen mit varianten: true/false werden übernommen
  const VARIANTEN = [['seite', 'Seite'], ['farben', 'Farben'], ['pose', 'Pose'], ['team', 'Team-Bild'], ['spruch', 'Spruch-Stil'], ['ausschnitt', 'Bildausschnitt']];
  function variantenAus(v) {
    const w = v && v.varianten, an = w !== false;
    const o = {}; for (const [k] of VARIANTEN) o[k] = w && typeof w === 'object' ? w[k] !== false : an;
    return o;
  }
  function variante(basis, seed) {
    const v = kopie(basis), rnd = zufall(seed), an = variantenAus(basis);
    const wahl = l => l[Math.floor(rnd() * l.length)];
    // Alle Würfe immer in derselben Reihenfolge – so ändert ein Haken nicht die anderen Teile
    const w = { seite: rnd() < 0.5, pal: wahl(PALETTEN), box: wahl(['schraeg', 'schraeg', 'box']), schraeg: rnd() < 0.8, verlauf: rnd() < 0.4,
      gr: rnd() * 2 - 1, dy: rnd() * 2 - 1, pose: wahl(POSEN)[0], ph: rnd() * 2 - 1, team: wahl(TEAM)[0], zoom: rnd(), hx: rnd(), hy: rnd() };
    // Farben nach Rolle: Hauptfarbe = Kästen, Akzent = gelbe Texte
    const kasten = v.elemente.find(e => e.typ === 'text' && e.box && e.box !== 'kein');
    const akz = v.elemente.find(e => e.typ === 'text' && /\{serie\}/.test(e.inhalt || ''));
    const HAUPT = new Set(['#e11324', String(kasten ? kasten.boxFarbe : '').toLowerCase()]);
    const AKZENT = new Set(['#ffd400', String(akz ? akz.farbe : '').toLowerCase()]);
    const [haupt, akzent] = w.pal;
    const farbe = c => { const k = String(c || '').toLowerCase(); return HAUPT.has(k) ? haupt : AKZENT.has(k) ? akzent : c; };
    if (an.seite && w.seite) seitenTausch(v);
    for (const e of v.elemente) {
      if (e.typ === 'text') {
        if (an.farben) { e.boxFarbe = farbe(e.boxFarbe); e.farbe = farbe(e.farbe); e.farbe2 = farbe(e.farbe2); }
        if (an.spruch && /\{spruch\}/.test(e.inhalt || '')) {
          if (e.box && e.box !== 'kein') e.box = w.box;
          e.schraeg = w.schraeg;
          e.verlauf = e.box === 'kein' && w.verlauf; if (an.farben) e.farbe2 = akzent;
          e.groesse = Math.round((e.groesse || 120) * (1 + w.gr * 0.08));
          e.y = Math.round(e.y + w.dy * 35);
        }
      } else if (e.typ === 'pers' && an.pose) {
        e.bild = w.pose;
        const unten = Math.max(H + 10, (e.y || 0) + (e.h || 900));   // unten bündig, sonst sieht man die Schnittkante
        e.h = Math.round((e.h || 900) * (1 + w.ph * 0.06));
        e.y = unten - e.h;
      } else if (e.typ === 'team' && e.an !== false && an.team) {
        e.bild = w.team; e.schwarzWeg = !!(TEAM.find(x => x[0] === e.bild) || [])[2];
      }
    }
    if (an.farben) v.hg.leisteFarbe = haupt;
    if (an.ausschnitt) {
      v.hg.zoom = +(1 + w.zoom * 0.25).toFixed(2);
      v.hg.x = +(0.25 + w.hx * 0.5).toFixed(2);
      v.hg.y = +(0.2 + w.hy * 0.35).toFixed(2);
    }
    return v;
  }
  // Vorlage, mit der ein Rennen gezeichnet wird: eigene des Rennens › Variante der Grundvorlage › Grundvorlage
  function fuerRennen(basisRoh, r) {
    const t = (r && r.thumb) || {};
    if (t.vorlage && Array.isArray(t.vorlage.elemente)) return vorlageAus(t.vorlage);
    const basis = vorlageAus(basisRoh);
    if (!r || !Object.values(variantenAus(basis)).some(Boolean)) return basis;
    return variante(basis, (zahlAus(String(r.rennKey || '')) ^ (t.seed || 0)) >>> 0);
  }

  // ─── Laden: Schriften, Bilder ───
  let fontsBereit = null;
  function fonts() {
    if (!fontsBereit) fontsBereit = Promise.all(['600', '800', '900'].map(w => {
      const f = new FontFace('K888 Saira', `url(${SITE}fonts/saira-condensed-latin-${w}-normal.woff2)`, { weight: w });
      document.fonts.add(f);
      return f.load();
    })).catch(e => { fontsBereit = null; throw e; });
    return fontsBereit;
  }
  const BILDER = new Map();
  function bild(url) {
    if (!url) return Promise.resolve(null);
    if (!BILDER.has(url)) BILDER.set(url, new Promise(ok => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => ok(i); i.onerror = () => { BILDER.delete(url); ok(null); };
      i.src = url;
    }));
    return BILDER.get(url);
  }
  // Schwarzen Hintergrund ausblenden (Team-Logos auf Schwarz)
  const OHNE_SCHWARZ = new Map();
  function ohneSchwarz(img) {
    if (OHNE_SCHWARZ.has(img)) return OHNE_SCHWARZ.get(img);
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const m = Math.max(a[i], a[i + 1], a[i + 2]); if (m < 70) a[i + 3] = Math.min(a[i + 3], Math.max(0, (m - 18) * 5)); }
    g.putImageData(d, 0, 0);
    OHNE_SCHWARZ.set(img, c);
    return c;
  }

  // ─── Daten eines Rennens → Platzhalter ───
  function berlin(ms) { return window.K888Bilder ? window.K888Bilder.berlin(ms) : { tag: '', zeit: '', wochentag: '' }; }
  function ersatzSpruch(r) {
    const e = r.ergebnis;
    if (e && e.ziel) return e.start && e.start > e.ziel ? `VON P${e.start} AUF P${e.ziel}?!` : e.ziel === 1 ? 'SIEG!' : e.ziel <= 3 ? 'ENDLICH PODIUM!' : 'DAS WAR KNAPP!';
    if (e) return 'DAS ENDE WAR WILD…';
    return 'ALLES ODER NICHTS!';
  }
  function werte(r) {
    const s = berlin(r.startMs), l = berlin(r.liveMs || r.startMs), e = r.ergebnis;
    return {
      spruch: (r.spruch || '').trim() || ersatzSpruch(r), strecke: r.track || r.titel || r.art || 'Rennen', layout: r.layout || '', serie: r.serie || r.titel || '',
      titel: r.titel || '', runde: r.nr ? 'Runde ' + r.nr : '', datum: s.tag, wochentag: s.wochentag, zeit: l.zeit,
      live: e ? 'Rennen vom ' + s.tag : 'Live ab ' + l.zeit + ' Uhr', platz: e ? (e.ziel ? 'P' + e.ziel : (e.status || 'DNF')) : ''
    };
  }
  const fuellen = (t, w) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (k in w ? w[k] : m))
    .replace(/(\s*·\s*){2,}/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();

  // ─── Zeichnen ───
  function hgZeichnen(g, img, hg, farbe1, info) {
    g.fillStyle = '#0a0b0e'; g.fillRect(0, 0, B, H);
    if (img) {
      const f = Math.max(B / img.naturalWidth, H / img.naturalHeight) * Math.max(1, hg.zoom || 1);
      const w = img.naturalWidth * f, h = img.naturalHeight * f;
      g.drawImage(img, (B - w) * (hg.x ?? 0.5), (H - h) * (hg.y ?? 0.35), w, h);
      info.w = w; info.h = h;
    } else {
      g.save(); g.fillStyle = farbe1;
      for (let i = -8; i < 22; i++) {
        g.globalAlpha = i % 3 === 0 ? 0.16 : 0.06;
        g.beginPath(); g.moveTo(i * 140, H); g.lineTo(i * 140 + H * 0.5, 0); g.lineTo(i * 140 + H * 0.5 + 46, 0); g.lineTo(i * 140 + 46, H); g.fill();
      }
      g.restore(); info.w = B; info.h = H;
    }
    if (hg.dunkel) { g.fillStyle = `rgba(5,7,10,${hg.dunkel})`; g.fillRect(0, 0, B, H); }
    if (hg.links) {
      const gr = hg.seite === 'rechts' ? g.createLinearGradient(B, 0, 0, 0) : g.createLinearGradient(0, 0, B, 0);
      gr.addColorStop(0, `rgba(5,7,10,${hg.links})`); gr.addColorStop(0.45, `rgba(5,7,10,${hg.links * 0.7})`); gr.addColorStop(0.75, 'rgba(5,7,10,0)');
      g.fillStyle = gr; g.fillRect(0, 0, B, H);
    }
  }

  function textZeilen(g, el, text) {
    const maxB = el.maxB || 1800;
    const breit = t => g.measureText(t).width;
    let zeilen = [text];
    if ((el.zeilen || 1) > 1 && breit(text) > maxB) {
      const w = text.split(/\s+/);
      let best = null;
      for (let i = 1; i < w.length; i++) {
        const z = [w.slice(0, i).join(' '), w.slice(i).join(' ')];
        const m = Math.max(...z.map(breit));
        if (!best || m < best.m) best = { z, m };
      }
      if (best) zeilen = best.z;
    }
    return zeilen;
  }
  function textZeichnen(g, el, text) {
    if (!text) { el._box = null; return; }
    if (el.gross !== false) text = gross(text);
    let size = el.groesse || 100;
    const font = s => `${el.gewicht || 900} ${s}px ${FAMILIE}`;
    g.font = font(size);
    let zeilen = textZeilen(g, el, text);
    const maxB = el.maxB || 1800;
    while (size > 16 && Math.max(...zeilen.map(t => g.measureText(t).width)) > maxB) { size -= 3; g.font = font(size); zeilen = textZeilen(g, el, text); }
    const lh = size * 0.94, cap = size * 0.74;
    const w = Math.max(...zeilen.map(t => g.measureText(t).width)), h = lh * (zeilen.length - 1) + cap;
    const pad = el.box && el.box !== 'kein' ? size * 0.2 : 0;
    const sk = el.schraeg ? 0.18 : 0;
    const x = el.rechts ? el.x - (w + pad * 1.2 + h * sk) : el.x;   // rechts: x ist der rechte Rand
    g.save();
    g.translate(x, el.y + h + pad);
    if (sk) g.transform(1, 0, -sk, 1, 0, 0);
    g.translate(0, -(h + pad));
    if (el.box === 'box' || el.box === 'schraeg') {
      g.fillStyle = el.boxFarbe || '#e11324';
      const x0 = -pad * 1.2, y0 = -pad, x1 = w + pad * 1.2, y1 = h + pad;
      g.beginPath();
      if (el.box === 'schraeg') { const s = (y1 - y0) * 0.21; g.moveTo(x0, y1); g.lineTo(x0 + s, y0); g.lineTo(x1 + s, y0); g.lineTo(x1, y1); }
      else g.rect(x0, y0, x1 - x0, y1 - y0);
      g.fill();
    }
    g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    zeilen.forEach((z, i) => {
      const y = cap + i * lh;
      if (el.randB > 0) { g.lineWidth = el.randB * 2; g.strokeStyle = el.rand || '#000'; g.strokeText(z, 0, y); }
    });
    if (el.schatten) { g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = size * 0.14; g.shadowOffsetY = size * 0.04; }
    if (el.verlauf) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, el.farbe || '#fff'); gr.addColorStop(1, el.farbe2 || '#ffd400'); g.fillStyle = gr; }
    else g.fillStyle = el.farbe || '#fff';
    zeilen.forEach((z, i) => g.fillText(z, 0, cap + i * lh));
    g.restore();
    el._box = { x: x - pad * 1.2, y: el.y - pad, w: w + pad * 2.4 + h * sk, h: h + pad * 2 };
  }
  function bildZeichnen(g, el, img, b, h, opt) {
    if (!img) { el._box = null; return; }
    g.save();
    const f = [];
    if (opt.rand) { const r = Math.max(3, Math.round(h * 0.006)); f.push(`drop-shadow(${r}px 0 0 #fff)`, `drop-shadow(-${r}px 0 0 #fff)`, `drop-shadow(0 ${r}px 0 #fff)`, `drop-shadow(0 -${r}px 0 #fff)`); }
    if (opt.schatten) f.push(`drop-shadow(0 ${Math.round(h * 0.02)}px ${Math.round(h * 0.03)}px rgba(0,0,0,.7))`);
    if (f.length && 'filter' in g) g.filter = f.join(' ');
    const x = el.rechts ? el.x - b : el.x;   // rechts: x ist der rechte Rand
    if (opt.spiegeln) { g.translate(x + b, el.y); g.scale(-1, 1); g.drawImage(img, 0, 0, b, h); }
    else g.drawImage(img, x, el.y, b, h);
    g.restore();
    el._box = { x, y: el.y, w: b, h };
  }

  // canvas: Ziel · v: Vorlage · r: Rennen ({…post, hg, spruch}) · design: { farbe1, logoBild } · opt: { auswahl }
  async function zeichnen(canvas, v, r, design, opt = {}) {
    await fonts().catch(() => {});
    const els = v.elemente.filter(e => e.an !== false);
    const [hgBild, logo, ...rest] = await Promise.all([bild(r.hg), bild(design.logoBild),
      ...els.map(e => e.typ === 'pers' ? bild(posenUrl(e.bild)) : e.typ === 'team' ? bild(teamUrl(e.bild)) : Promise.resolve(null))]);
    const g = canvas.getContext('2d');
    g.setTransform(canvas.width / B, 0, 0, canvas.height / H, 0, 0);
    const info = {};
    hgZeichnen(g, hgBild, v.hg, design.farbe1 || '#e11324', info);
    const w = werte(r);
    els.forEach((el, i) => {
      if (el.typ === 'text') textZeichnen(g, el, fuellen(el.inhalt, w));
      else if (el.typ === 'logo') { const b = el.b || 500; bildZeichnen(g, el, logo, b, logo ? b * logo.naturalHeight / logo.naturalWidth : 0, { schatten: el.schatten }); }
      else if (el.typ === 'pers') { const img = rest[i], h = el.h || 900; bildZeichnen(g, el, img, img ? h * img.naturalWidth / img.naturalHeight : 0, h, el); }
      else if (el.typ === 'team') {
        const img = rest[i], b = el.b || 300;
        if (img) bildZeichnen(g, el, el.schwarzWeg ? ohneSchwarz(img) : img, b, b * img.naturalHeight / img.naturalWidth, {});
        else el._box = null;
      }
    });
    if (v.hg.leiste !== false) { g.fillStyle = v.hg.leisteFarbe || design.farbe1 || '#e11324'; g.fillRect(0, H - 14, B, 14); }
    const sel = opt.auswahl && v.elemente.find(e => e.id === opt.auswahl);
    if (sel && sel._box && sel.an !== false) {
      g.save(); g.setLineDash([18, 10]); g.lineWidth = 4; g.strokeStyle = '#ffd400';
      g.strokeRect(sel._box.x - 6, sel._box.y - 6, sel._box.w + 12, sel._box.h + 12); g.restore();
    }
    return info;
  }
  const alsBlob = (c, typ, q) => new Promise(ok => c.toBlob(ok, typ, q));
  // Fertiges Thumbnail: PNG, wenn unter 2 MB – sonst JPG
  async function datei(v, r, design) {
    const c = document.createElement('canvas'); c.width = B; c.height = H;
    await zeichnen(c, v, r, design);
    let blob = await alsBlob(c, 'image/png');
    if (blob && blob.size < 2e6) return { blob, typ: 'png' };
    for (const q of [0.92, 0.86, 0.78, 0.7]) { blob = await alsBlob(c, 'image/jpeg', q); if (blob && blob.size < 2e6) break; }
    return { blob, typ: 'jpg' };
  }
  function dateiname(r, typ) {
    return `Kreids888-${r.track || r.titel || 'Rennen'}-${r.datum || ''}`.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/-$/, '') + '.' + typ;
  }
  async function laden(v, r, design) {
    const { blob, typ } = await datei(v, r, design);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = dateiname(r, typ);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return { typ, groesse: blob.size };
  }

  // ─── Editor ───
  // umg: { stand(), igApi(), meldung(), rennen() → Liste, aktualisiert(), } – kommt aus insta-admin.js
  let E = null;
  function editor(box, umg, rk) {
    if (!E || E.box !== box) {
      E = { box, umg, v: null, rk: '', sel: 'spruch', dirty: false, ziehen: null, info: {}, sprueche: [], ladenSpr: false };
      box.addEventListener('click', klick);
      box.addEventListener('input', eingabe);
      box.addEventListener('change', eingabe);
    }
    E.umg = umg;
    const liste = umg.rennen();
    const vorher = E.rk;
    if (rk && liste.some(r => r.rennKey === rk) && !E.dirty) { if (E.rk !== rk) E.sprueche = []; E.rk = rk; }
    if (!liste.some(r => r.rennKey === E.rk)) { E.rk = liste.length ? liste[0].rennKey : ''; E.dirty = false; }
    if (!E.v || !E.dirty || E.rk !== vorher) { E.v = fuerRennen(umg.stand().thumbVorlage, rennenAkt()); E.dirty = false; }
    aufbauen();
  }
  const rennenAkt = () => E.umg.rennen().find(r => r.rennKey === E.rk) || null;
  const elAkt = () => E.v.elemente.find(e => e.id === E.sel) || null;
  const zeitKurz = ms => new Date(ms).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' });

  function aufbauen() {
    const liste = E.umg.rennen();
    if (!liste.length) { E.box.innerHTML = '<p class="hint">Keine Rennen in der Planung – sobald etwas im Streamkalender steht, kannst du hier das Thumbnail bauen.</p>'; return; }
    const r = rennenAkt();
    E.box.innerHTML = `
      <div class="kt">
        <div class="kt-links">
          <div class="ki-reihe">
            <div class="ki-fg" style="flex:1 1 320px"><label>Rennen</label><select data-t="rennen">${liste.map(x => `<option value="${esc(x.rennKey)}" ${x.rennKey === E.rk ? 'selected' : ''}>${esc(zeitKurz(x.startMs))} · ${esc([x.serie || x.titel, x.track].filter(Boolean).join(' · '))}${x.ergebnis ? ' · Ergebnis' : ''}</option>`).join('')}</select></div>
          </div>
          <div class="ki-reihe" style="margin-top:10px">
            <div class="ki-fg" style="flex:1 1 360px"><label>Spruch für dieses Rennen ({spruch})</label><input type="text" data-t="spruch" maxlength="80" value="${esc((r && r.spruch) || '')}" placeholder="${esc(r ? ersatzSpruch(r) : '')}"></div>
            <button class="btn btn-ghost ki-k" data-t="sprueche"><span>${E.ladenSpr ? '⏳ …' : '🎲 Sprüche vorschlagen'}</span></button>
          </div>
          ${E.sprueche.length ? `<div class="kt-chips">${E.sprueche.map(s => `<button type="button" data-t="chip" data-wert="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
          <canvas class="kt-cv" width="${B}" height="${H}"></canvas>
          <div class="ki-dim">Klicken = auswählen · Ziehen = verschieben · Mausrad = Größe · freie Fläche ziehen = Hintergrund verschieben</div>
          <div class="ki-knoepfe">
            <button class="btn btn-red ki-k" data-t="variante"><span>🎲 Neue Variante</span></button>
            <button class="btn btn-ghost ki-k" data-t="rennenSpeichern"><span>💾 Für dieses Rennen speichern</span></button>
            <button class="btn btn-ghost ki-k" data-t="speichern"><span>💾 Als Vorlage für alle</span></button>
            <button class="btn btn-ghost ki-k" data-t="laden"><span>📥 Thumbnail laden</span></button>
            <button class="btn btn-ghost ki-k" data-t="standard"><span>↺ Standard-Vorlage</span></button>
            <span class="kt-dirty">${E.dirty ? '● Änderungen noch nicht gespeichert' : ''}</span>
          </div>
          <div class="ki-fg" style="margin-top:6px"><label>Wechselt von selbst pro Rennen</label>
            <div class="ki-reihe">${(an => VARIANTEN.map(([k, n]) => `<label class="chk"><input type="checkbox" data-t="varianten" data-wert="${k}" ${an[k] ? 'checked' : ''}> ${n}</label>`).join(''))(variantenAus(vorlageAus(E.umg.stand().thumbVorlage)))}</div>
          </div>
          <div class="ki-dim">${r && r.thumb && r.thumb.vorlage ? '📌 Dieses Rennen hat sein eigenes Aussehen (festgehalten).' : '🎲 Dieses Rennen zeigt seine eigene Variante.'}</div>
        </div>
        <div class="kt-rechts">
          <div class="ki-panel"><h3>Ebenen</h3>
            <div class="kt-ebenen">${[...E.v.elemente].reverse().map(e => `
              <div class="kt-ebene${e.id === E.sel ? ' an' : ''}" data-t="waehle" data-id="${esc(e.id)}">
                <input type="checkbox" data-t="sichtbar" data-id="${esc(e.id)}" ${e.an !== false ? 'checked' : ''} title="ein/aus">
                <span>${esc(NAMEN[e.typ] || e.typ)}${e.typ === 'text' ? ': ' + esc(String(e.inhalt).slice(0, 24)) : ''}</span>
                <button type="button" data-t="hoch" data-id="${esc(e.id)}" title="nach vorne">▲</button><button type="button" data-t="runter" data-id="${esc(e.id)}" title="nach hinten">▼</button>
              </div>`).join('')}</div>
            <div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-t="neutext"><span>+ Text</span></button></div>
          </div>
          <div class="ki-panel"><h3>${esc(elAkt() ? (NAMEN[elAkt().typ] || '') : 'Eigenschaften')}</h3>${eigenschaften(elAkt())}</div>
          <div class="ki-panel"><h3>Hintergrund</h3>
            ${regler('hg.zoom', 'Zoom', E.v.hg.zoom, 1, 2.5, 0.01)}
            ${regler('hg.dunkel', 'Abdunkeln', E.v.hg.dunkel, 0, 0.8, 0.01)}
            ${regler('hg.links', 'Dunkler Verlauf links', E.v.hg.links, 0, 1, 0.01)}
            <label class="chk"><input type="checkbox" data-f="hg.leiste" ${E.v.hg.leiste !== false ? 'checked' : ''}> Farbleiste unten</label>
            <div class="ki-dim">Bild ist das Hintergrundbild des Rennens (KI, eigenes oder Kalender-Bild).</div>
          </div>
        </div>
      </div>`;
    const cv = E.box.querySelector('.kt-cv');
    cv.addEventListener('pointerdown', runter);
    cv.addEventListener('pointermove', bewegen);
    cv.addEventListener('pointerup', hoch);
    cv.addEventListener('pointercancel', hoch);
    cv.addEventListener('wheel', rad, { passive: false });
    neuZeichnen();
  }
  function regler(f, name, wert, min, max, schritt) {
    return `<div class="ki-fg"><label>${esc(name)}</label><input type="range" data-f="${f}" min="${min}" max="${max}" step="${schritt}" value="${esc(wert ?? min)}"></div>`;
  }
  function eigenschaften(el) {
    if (!el) return '<div class="ki-dim">Im Bild etwas anklicken.</div>';
    const fa = (f, name) => `<div class="ki-fg"><label>${esc(name)}</label><input type="color" data-f="${f}" value="${esc(el[f] || '#ffffff')}"></div>`;
    const ch = (f, name) => `<label class="chk"><input type="checkbox" data-f="${f}" ${el[f] ? 'checked' : ''}> ${esc(name)}</label>`;
    const galerie = (liste, url) => `<div class="kt-gal">${liste.map(([d, n]) => `<button type="button" data-t="bild" data-wert="${esc(d)}" class="${el.bild === d ? 'an' : ''}" title="${esc(n)}"><img src="${esc(url(d))}" alt="${esc(n)}" loading="lazy"></button>`).join('')}</div>`;
    if (el.typ === 'text') return `
      <div class="ki-fg"><label>Text</label><input type="text" data-f="inhalt" value="${esc(el.inhalt)}"></div>
      <div class="ki-dim">Platzhalter: {spruch} {strecke} {layout} {serie} {runde} {datum} {wochentag} {zeit} {live} {platz}</div>
      ${regler('groesse', 'Größe', el.groesse, 20, 320, 1)}
      ${regler('maxB', 'Max. Breite', el.maxB, 200, 1900, 10)}
      <div class="ki-reihe">
        <div class="ki-fg"><label>Schrift</label><select data-f="gewicht">${[[900, 'Black'], [800, 'ExtraBold'], [600, 'SemiBold']].map(([w, n]) => `<option value="${w}" ${+el.gewicht === w ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="ki-fg"><label>Zeilen</label><select data-f="zeilen"><option value="1" ${+el.zeilen !== 2 ? 'selected' : ''}>1</option><option value="2" ${+el.zeilen === 2 ? 'selected' : ''}>bis 2</option></select></div>
        ${fa('farbe', 'Farbe')}
      </div>
      <div class="ki-reihe">${ch('verlauf', 'Farbverlauf')}${el.verlauf ? fa('farbe2', 'bis Farbe') : ''}</div>
      <div class="ki-reihe">${fa('rand', 'Rand')}${regler('randB', 'Rand-Dicke', el.randB, 0, 30, 1)}</div>
      <div class="ki-reihe">
        <div class="ki-fg"><label>Hintergrund</label><select data-f="box">${[['kein', 'Kein'], ['box', 'Box'], ['schraeg', 'Schräg']].map(([w, n]) => `<option value="${w}" ${el.box === w ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        ${el.box !== 'kein' ? fa('boxFarbe', 'Box-Farbe') : ''}
      </div>
      <div class="ki-reihe">${ch('schraeg', 'Schräg (Renn-Look)')}${ch('schatten', 'Schatten')}${ch('gross', 'GROSSBUCHSTABEN')}</div>
      <div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-t="loeschen"><span>✕ Text löschen</span></button></div>`;
    if (el.typ === 'pers') return `${galerie(POSEN, posenUrl)}
      ${regler('h', 'Größe', el.h, 200, 1500, 5)}
      <div class="ki-reihe">${ch('spiegeln', 'Spiegeln')}${ch('rand', 'Weißer Rand')}${ch('schatten', 'Schatten')}</div>`;
    if (el.typ === 'team') return `${galerie(TEAM, teamUrl)}
      ${regler('b', 'Größe', el.b, 80, 1400, 5)}
      <div class="ki-reihe">${ch('schwarzWeg', 'Schwarzen Hintergrund ausblenden')}</div>`;
    if (el.typ === 'logo') return `${regler('b', 'Größe', el.b, 100, 1400, 5)}<div class="ki-reihe">${ch('schatten', 'Schatten')}</div>
      <div class="ki-dim">Das Logo stellst du unter „🎨 Aussehen“ ein.</div>`;
    return '';
  }

  let zeichnetGerade = false, nochmal = false;
  async function neuZeichnen() {
    if (!E) return;
    if (zeichnetGerade) { nochmal = true; return; }
    zeichnetGerade = true;
    try {
      const cv = E.box.querySelector('.kt-cv'), r = rennenAkt();
      if (cv && r) E.info = await zeichnen(cv, E.v, r, E.umg.stand().design, { auswahl: E.sel });
    } finally {
      zeichnetGerade = false;
      if (nochmal) { nochmal = false; neuZeichnen(); }
    }
  }
  function geaendert(aufbau) {
    if (!E.dirty) { E.dirty = true; const d = E.box.querySelector('.kt-dirty'); if (d) d.textContent = '● Änderungen noch nicht gespeichert'; }
    if (aufbau) aufbauen(); else neuZeichnen();
  }

  // ─── Maus ───
  function punkt(ev) {
    const cv = ev.currentTarget, rc = cv.getBoundingClientRect();
    return { x: (ev.clientX - rc.left) * B / rc.width, y: (ev.clientY - rc.top) * H / rc.height };
  }
  function treffer(p) {
    for (let i = E.v.elemente.length - 1; i >= 0; i--) {
      const e = E.v.elemente[i], b = e._box;
      if (e.an !== false && b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return e;
    }
    return null;
  }
  function runter(ev) {
    const p = punkt(ev), e = treffer(p);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const vorher = E.sel;
    E.sel = e ? e.id : E.sel;
    E.ziehen = { p, e, x0: e ? e.x : E.v.hg.x, y0: e ? e.y : E.v.hg.y, bewegt: false };
    if (e && e.id !== vorher) aufbauenSpaeter();
    else neuZeichnen();
  }
  let aufbauTimer = 0;
  function aufbauenSpaeter() { clearTimeout(aufbauTimer); aufbauTimer = setTimeout(() => { if (!E.ziehen) aufbauen(); }, 0); }
  function bewegen(ev) {
    if (!E.ziehen) return;
    const p = punkt(ev), z = E.ziehen, dx = p.x - z.p.x, dy = p.y - z.p.y;
    if (!z.bewegt && Math.hypot(dx, dy) < 4) return;
    z.bewegt = true;
    if (z.e) { z.e.x = Math.round(z.x0 + dx); z.e.y = Math.round(z.y0 + dy); }
    else {
      const w = E.info.w || B, h = E.info.h || H;
      if (w > B) E.v.hg.x = Math.min(1, Math.max(0, z.x0 - dx / (w - B)));
      if (h > H) E.v.hg.y = Math.min(1, Math.max(0, z.y0 - dy / (h - H)));
    }
    geaendert(false);
  }
  function hoch() {
    const z = E && E.ziehen; if (!z) return;
    E.ziehen = null;
    if (z.e) aufbauen();
  }
  function rad(ev) {
    const e = elAkt(); if (!e) return;
    ev.preventDefault();
    const f = ev.deltaY < 0 ? 1.05 : 1 / 1.05;
    const feld = e.typ === 'text' ? 'groesse' : e.typ === 'pers' ? 'h' : 'b';
    const grenzen = { groesse: [20, 320], h: [200, 1500], b: [80, 1400] }[feld];
    e[feld] = Math.round(Math.min(grenzen[1], Math.max(grenzen[0], (e[feld] || 100) * f)));
    const r = E.box.querySelector(`[data-f="${feld}"]`); if (r) r.value = e[feld];
    geaendert(false);
  }

  // ─── Eingaben ───
  let spruchTimer = 0;
  function eingabe(ev) {
    const t = ev.target;
    if (t.dataset.t === 'rennen' && ev.type === 'change') {
      if (E.dirty && !confirm('Änderungen an diesem Thumbnail verwerfen?')) { t.value = E.rk; return; }
      E.rk = t.value; E.sprueche = []; E.dirty = false; E.v = fuerRennen(E.umg.stand().thumbVorlage, rennenAkt()); return aufbauen();
    }
    if (t.dataset.t === 'varianten' && ev.type === 'change') return variantenSchalten(t.dataset.wert, t.checked);
    if (t.dataset.t === 'spruch') {
      const r = rennenAkt(); if (!r) return;
      r.spruch = t.value; E.umg.spruchGesetzt(r.rennKey, t.value);
      neuZeichnen();
      clearTimeout(spruchTimer);
      spruchTimer = setTimeout(() => spruchSpeichern(r, t.value), 700);
      return;
    }
    if (t.dataset.t === 'sichtbar' && ev.type === 'change') { const e = E.v.elemente.find(x => x.id === t.dataset.id); if (e) { e.an = t.checked; geaendert(true); } return; }
    const f = t.dataset.f; if (!f) return;
    let wert = t.type === 'checkbox' ? t.checked : t.type === 'range' || t.type === 'number' ? parseFloat(t.value) : t.value;
    if (f.startsWith('hg.')) { E.v.hg[f.slice(3)] = wert; return geaendert(false); }
    const e = elAkt(); if (!e) return;
    if (f === 'gewicht' || f === 'zeilen') wert = parseInt(wert, 10);
    e[f] = wert;
    // Felder, die andere Felder ein-/ausblenden → neu aufbauen (nur bei „change“, sonst springt der Cursor)
    geaendert(ev.type === 'change' && ['verlauf', 'box'].includes(f));
  }
  async function variantenSchalten(was, ja) {
    const basis = vorlageAus(E.umg.stand().thumbVorlage);
    basis.varianten = { ...variantenAus(basis), [was]: ja };
    const an = Object.values(basis.varianten).some(Boolean);
    try {
      await E.umg.igApi('POST', '/api/thumbvorlage', { vorlage: kopie(basis) });
      E.umg.vorlageGespeichert(kopie(basis));
      if (!E.dirty) E.v = fuerRennen(basis, rennenAkt());
      E.umg.meldung(an ? 'Gespeichert – gilt für alle Rennen ohne festgehaltenes Aussehen.' : 'Nichts wechselt mehr: alle Rennen nutzen dieselbe Vorlage.');
      aufbauen();
    } catch (e) { E.umg.meldung(e.message, 1); }
  }
  // Thumbnail-Angaben eines Rennens speichern (seed, vorlage) und in der Liste merken
  async function rennenThumb(r, felder) {
    await E.umg.igApi('POST', `/api/thumb/${encodeURIComponent(r.rennKey)}`, { ...felder, startMs: r.startMs });
    E.umg.thumbGesetzt(r.rennKey, felder);
    r.thumb = { ...(r.thumb || {}), ...felder };
    if (felder.vorlage === null) delete r.thumb.vorlage;
  }
  async function spruchSpeichern(r, text) {
    try { await E.umg.igApi('POST', `/api/thumb/${encodeURIComponent(r.rennKey)}`, { spruch: text, startMs: r.startMs }); }
    catch (e) { E.umg.meldung(e.message, 1); }
  }
  async function klick(ev) {
    const b = ev.target.closest('[data-t]'); if (!b || !E.box.contains(b)) return;
    const t = b.dataset.t, id = b.dataset.id;
    if (t === 'waehle') { E.sel = id; return aufbauen(); }
    if (t === 'hoch' || t === 'runter') {
      const l = E.v.elemente, i = l.findIndex(e => e.id === id), j = t === 'hoch' ? i + 1 : i - 1;
      if (i < 0 || j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]]; return geaendert(true);
    }
    if (t === 'neutext') {
      const n = { id: 't' + Date.now().toString(36), typ: 'text', an: true, inhalt: 'NEUER TEXT', x: 120, y: 200, groesse: 90, gewicht: 900, farbe: '#ffffff', verlauf: false, farbe2: '#ffd400', rand: '#000000', randB: 6, box: 'kein', boxFarbe: '#e11324', schraeg: false, schatten: true, maxB: 1400, zeilen: 1, gross: true };
      E.v.elemente.push(n); E.sel = n.id; return geaendert(true);
    }
    if (t === 'loeschen') { E.v.elemente = E.v.elemente.filter(e => e.id !== E.sel); E.sel = ''; return geaendert(true); }
    if (t === 'bild') { const e = elAkt(); if (e) { e.bild = b.dataset.wert; if (e.typ === 'team') e.schwarzWeg = !!(TEAM.find(x => x[0] === e.bild) || [])[2]; e.an = true; geaendert(true); } return; }
    if (t === 'chip') {
      const r = rennenAkt(); if (!r) return;
      r.spruch = b.dataset.wert; E.umg.spruchGesetzt(r.rennKey, r.spruch);
      const inp = E.box.querySelector('[data-t="spruch"]'); if (inp) inp.value = r.spruch;
      neuZeichnen(); spruchSpeichern(r, r.spruch); return;
    }
    if (t === 'sprueche') {
      if (E.ladenSpr) return;
      E.ladenSpr = true; aufbauen();
      try {
        const d = await E.umg.igApi('POST', '/api/sprueche', { rennKey: E.rk });
        E.sprueche = d.liste || [];
        if (!d.ki) E.umg.meldung('KI gerade nicht erreichbar – hier feste Vorschläge.');
      } catch (e) { E.umg.meldung(e.message, 1); }
      E.ladenSpr = false; aufbauen(); return;
    }
    const knopf = async fn => {
      const sp = b.querySelector('span'), alt = sp.textContent; b.disabled = true; sp.textContent = '⏳ …';
      try { await fn(); aufbauen(); } catch (e) { E.umg.meldung(e.message, 1); b.disabled = false; sp.textContent = alt; }
    };
    if (t === 'variante') return knopf(async () => {
      const r = rennenAkt(); if (!r) return;
      if (E.dirty && !confirm('Änderungen verwerfen und neu würfeln?')) return;
      await rennenThumb(r, { seed: 1 + Math.floor(Math.random() * 2147483646), vorlage: null });
      E.v = fuerRennen(E.umg.stand().thumbVorlage, r); E.dirty = false;
    });
    if (t === 'rennenSpeichern') return knopf(async () => {
      const r = rennenAkt(); if (!r) return;
      await rennenThumb(r, { vorlage: kopie(E.v) });
      E.dirty = false; E.umg.meldung('Für dieses Rennen gespeichert.');
    });
    if (t === 'speichern') return knopf(async () => {
      const r = rennenAkt();
      const neu = kopie(E.v); neu.varianten = variantenAus(vorlageAus(E.umg.stand().thumbVorlage));
      await E.umg.igApi('POST', '/api/thumbvorlage', { vorlage: neu });
      E.umg.vorlageGespeichert(neu);
      if (r) await rennenThumb(r, { vorlage: kopie(E.v) });   // dieses Rennen behält genau dieses Aussehen
      E.dirty = false;
      E.umg.meldung(Object.values(neu.varianten).some(Boolean) ? 'Als Vorlage gespeichert – die anderen Rennen bekommen davon ihre eigenen Varianten.' : 'Als Vorlage für alle Rennen gespeichert.');
    });
    if (t === 'standard') {
      if (!confirm('Auf die Standard-Vorlage zurücksetzen? (Gilt erst nach dem Speichern.)')) return;
      E.v = kopie(STANDARD); E.sel = 'spruch'; return geaendert(true);
    }
    if (t === 'laden') {
      const r = rennenAkt(); if (!r) return;
      try { const d = await laden(E.v, r, E.umg.stand().design); E.umg.meldung(`Thumbnail geladen (${d.typ.toUpperCase()}, ${(d.groesse / 1e6).toFixed(1).replace('.', ',')} MB).`); }
      catch (e) { E.umg.meldung(e.message || 'Thumbnail ging nicht.', 1); }
    }
  }

  // Kleine Vorschau in der Post-Karte
  async function vorschau(canvas, v, r, design) {
    try { await zeichnen(canvas, fuerRennen(v, r), r, design); } catch (e) { /* egal */ }
  }

  const css = document.createElement('style');
  css.textContent = `
#instaApp .kt{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:18px;align-items:start}
@media(max-width:1100px){#instaApp .kt{grid-template-columns:1fr}}
#instaApp .kt-cv{width:100%;height:auto;display:block;margin:12px 0 8px;border:1px solid var(--line);background:#000;cursor:move;touch-action:none}
#instaApp .kt-dirty{color:#f5c518;font-size:13px}
#instaApp .kt-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
#instaApp .kt-chips button{background:#0d0e13;border:1px solid var(--line);color:#fff;font-family:var(--disp);font-weight:800;font-size:14px;letter-spacing:.03em;padding:7px 11px;cursor:pointer}
#instaApp .kt-chips button:hover{border-color:var(--red)}
#instaApp .kt-ebenen{display:flex;flex-direction:column;gap:4px}
#instaApp .kt-ebene{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--line);background:#0b0c10;cursor:pointer;font-size:14px}
#instaApp .kt-ebene.an{border-color:var(--red)}
#instaApp .kt-ebene span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#instaApp .kt-ebene input{width:16px;height:16px;flex:none;accent-color:var(--red)}
#instaApp .kt-ebene button{background:none;border:1px solid var(--line);color:var(--steel);cursor:pointer;width:26px;height:24px;padding:0;font-size:11px}
#instaApp .kt-gal{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
#instaApp .kt-gal button{padding:0;border:2px solid var(--line);background:#14161d;cursor:pointer;aspect-ratio:1/1;overflow:hidden}
#instaApp .kt-gal button img{width:100%;height:100%;object-fit:contain;display:block}
#instaApp .kt-gal button.an{border-color:var(--red)}
#instaApp .kt-rechts input[type=range]{padding:0;accent-color:var(--red)}`;
  document.head.appendChild(css);

  window.K888Thumb = { editor, vorschau, laden, datei, vorlageAus, fuerRennen, variante, STANDARD, POSEN, posenUrl };
})();
