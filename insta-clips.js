// ═══════════════════════════════════════════════════════════
// Kreids888 · 🎬 Clip-Fabrik (Reiter „🎬 Clips“ im Instagram-Bereich des Dashboards)
// • Clip reinziehen (MP4 aus dem Kreids Clipper) → Vorlage antippen → einplanen. Mehr nicht.
// • Der Browser baut daraus ein Neon-Video 1080×1920: Spruch oben (Chrom + Neon), Clip im Neon-Rahmen,
//   Zeitlupe vom Ende, Abspann „Folg mir“. Ton = Clip-Ton + eigene Effekt-Sounds. MP4 H.264 + AAC.
// • Hochladen in Stücken zum Worker kreids-insta. Der postet zur geplanten Zeit (ein Clip pro Tag):
//   Instagram-Reel (auf Wunsch als Test-Reel) und TikTok-Entwurf (Musik in der TikTok-App dazu).
// Wird vom Instagram-Reiter geladen: K888Clips.start(box, umg)
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  const B = 1080, H = 1920, FPS = 30, OUTRO = 1.8, SK = 0.2;
  const BASIS = ((document.currentScript && document.currentScript.src) || 'https://kreids888.com/insta-clips.js').replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  // Schriften kommen im Dashboard über /site/ (gleiche Adresse), auf kreids888.com direkt
  const site = () => (window.K888Bilder && window.K888Bilder.SITE) || (/(^|\.)kreids888\.com$/.test(location.hostname) ? location.origin + '/' : location.origin + '/site/');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kl = (v, a, b) => Math.max(a, Math.min(b, v));
  const fp = (t, a, b) => kl((t - a) / (b - a), 0, 1);
  const eo = x => 1 - Math.pow(1 - x, 3);
  const eob = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const hexA = (h, a) => { const n = parseInt(String(h).slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const zeit = ms => new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '').replace(', ', ' · ');
  const lokal = ms => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const zufallR = s => { let v = s >>> 0 || 1; return () => { v = (v * 1664525 + 1013904223) >>> 0; return v / 4294967296; }; };
  const GROSS = s => String(s || '').toLocaleUpperCase('de-DE');

  // ─── Vorlagen: jede mit eigener Neonfarbe, Sprüchen, Frage unten und Text für den Post ───
  const VORLAGEN = [
    { id: 'schuld', name: 'Wer war schuld?', emoji: '⚖️', farbe: '#ff2d6f', tag: 'VORFALL', zl: true, wieder: 'NOCHMAL GENAU HINSCHAUEN',
      hooks: ['WER WAR SCHULD?', 'WER IST SCHULD?', 'RENNUNFALL ODER PECH?', 'DEINE MEINUNG?'], unten: 'A ODER B? KOMMENTIER!',
      text: 'Wer war hier schuld? 🤔 A oder B? Schreib’s in die Kommentare 👇\n\n#simracing #iracing #racingincident #simracer #kreids888',
      hilfe: 'Für Unfälle und Szenen, über die man streiten kann. Die Leute kommentieren – das bringt Reichweite.' },
    { id: 'ueberholer', name: 'Überholer der Woche', emoji: '🚀', farbe: '#5cff1f', tag: 'KW {kw}', zl: true, wieder: 'SO GEHT DAS',
      hooks: ['ÜBERHOLER DER WOCHE', 'SO GEHT ÜBERHOLEN', 'AUSGEBREMST!', 'VORBEI. EINFACH VORBEI.'], unten: 'WIE VIELE PUNKTE? 1 BIS 10',
      text: 'Überholer der Woche 🚀 Wie viele Punkte gibst du? 1 bis 10 👇\n\n#simracing #iracing #overtake #simracer #kreids888',
      hilfe: 'Dein bester Überholer. Am besten jede Woche einen, immer gleich – so erkennt man dich.' },
    { id: 'save', name: 'Save des Tages', emoji: '😮‍💨', farbe: '#18e8ff', tag: 'SAVE', zl: true, wieder: 'WIE?!',
      hooks: ['SAVE DES TAGES', 'DAS WAR KNAPP', 'WIE HAB ICH DAS GEHALTEN?!', 'FAST WAR’S VORBEI'], unten: 'HÄTTEST DU’S GEHALTEN?',
      text: 'Das war knapp 😮‍💨 Hättest du den gehalten? 👇\n\n#simracing #iracing #save #simracer #kreids888',
      hilfe: 'Wenn du das Auto gerade noch gefangen hast.' },
    { id: 'crash', name: 'Crash', emoji: '💥', farbe: '#ff7a00', tag: 'CRASH', zl: true, wieder: 'AUTSCH. NOCHMAL.', stempel: 'CRASH',
      hooks: ['DAS GING SCHIEF', 'AUTSCH.', 'TOTALSCHADEN', 'DAS TUT WEH'], unten: 'WAS HÄTTEST DU GEMACHT?',
      text: 'Das ging schief 💥 Was hättest du gemacht? 👇\n\n#simracing #iracing #crash #simracer #kreids888',
      hilfe: 'Für Abflüge und Crashs. Mit Wackeln und CRASH-Stempel in der Zeitlupe.' },
    { id: 'hotlap', name: 'Hotlap-Challenge', emoji: '⏱️', farbe: '#b44dff', tag: 'HOTLAP', zl: false, wieder: 'NOCHMAL!', felder: true,
      hooks: ['SCHAFFST DU DAS?', 'SCHLAG MEINE ZEIT', 'BIST DU SCHNELLER?'], unten: 'SCHREIB DEINE ZEIT!',
      text: c => `Hotlap${c.strecke ? ' ' + c.strecke : ''}${c.rundenzeit ? ' ⏱ ' + c.rundenzeit : ''} – schaffst du das? Schreib deine Zeit in die Kommentare 👇\n\n#simracing #iracing #hotlap #simracer #kreids888`,
      hilfe: 'Eine schnelle Runde. Trag die Rundenzeit ein, sie kommt am Ende groß ins Bild. Die Leute posten ihre Zeiten.' },
    { id: 'highlight', name: 'Highlight', emoji: '🔥', farbe: '#ff1f3d', tag: 'HIGHLIGHT', zl: false, wieder: 'NOCHMAL!',
      hooks: ['WAS FÜR EIN MOMENT', 'DAS MUSST DU SEHEN', 'PURES SIMRACING', 'GÄNSEHAUT'], unten: 'FOLG FÜR MEHR SIMRACING',
      text: 'Was für ein Moment 🔥 Folg für mehr Simracing!\n\n#simracing #iracing #simracer #racing #kreids888',
      hilfe: 'Für alles andere: schöne Szenen, Starts, Zieleinläufe.' }
  ];
  const FARBEN = ['#ff2d6f', '#5cff1f', '#18e8ff', '#ff7a00', '#b44dff', '#ff1f3d', '#ffd400'];
  const vorlage = c => VORLAGEN.find(v => v.id === c.vorlage) || VORLAGEN[0];
  const vorlageText = (v, c) => (typeof v.text === 'function' ? v.text(c || {}) : v.text);
  const kw = () => { const d = new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const tag = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - tag); const j = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - j) / 86400000 + 1) / 7); };
  const tagText = v => v.tag.replace('{kw}', kw());

  // ─── Schriften ───
  let SCHRIFT = null;
  function schriften() {
    if (!SCHRIFT) SCHRIFT = Promise.all([
      ['K8Russo', 'russo-one-latin-400-normal.woff2', '400'], ['K8Saira', 'saira-condensed-latin-900-normal.woff2', '900'],
      ['K8Saira', 'saira-condensed-latin-700-normal.woff2', '700'], ['K8Orbitron', 'orbitron-latin-900-normal.woff2', '900']
    ].map(([f, d, w]) => new FontFace(f, `url(${site()}fonts/${d})`, { weight: w }).load().then(x => { document.fonts.add(x); }).catch(() => null)));
    return SCHRIFT;
  }
  const RU = (g, px) => { g.font = `400 ${px}px K8Russo, "Russo One", Impact, sans-serif`; };
  const SA = (g, px, w) => { g.font = `${w || 900} ${px}px K8Saira, "Saira Condensed", "Arial Narrow", sans-serif`; };
  const OR = (g, px) => { g.font = `900 ${px}px K8Orbitron, Orbitron, monospace`; };
  function passt(g, t, maxW, px, setz, min) { let s = px; setz(g, s); while (s > (min || 18) && g.measureText(t).width > maxW) { s -= 2; setz(g, s); } return s; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function zweiZeilen(t) {
    const w = String(t || '').split(/\s+/).filter(Boolean);
    if (w.length < 2 || t.length <= 13) return [t];
    let best = [t], diff = 1e9;
    for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), d = Math.abs(a.length - b.length); if (d < diff) { diff = d; best = [a, b]; } }
    return best;
  }
  const BILDER = new Map();
  function bild(url) {
    if (!url) return Promise.resolve(null);
    if (!BILDER.has(url)) BILDER.set(url, new Promise(ok => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; }));
    return BILDER.get(url);
  }

  // ─── Neon-Bausteine (einmal gezeichnet, dann nur noch kopiert) ───
  const CACHE = new Map();
  function merk(key, fn) { if (!CACHE.has(key)) { if (CACHE.size > 60) CACHE.clear(); CACHE.set(key, fn()); } return CACHE.get(key); }
  function leinwand(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function licht(g, x, y, rad, farbe, a) { const r = g.createRadialGradient(x, y, 0, x, y, rad); r.addColorStop(0, hexA(farbe, a)); r.addColorStop(1, hexA(farbe, 0)); g.fillStyle = r; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  function streifen(g, x1, y1, x2, y2, breite, farbe, glow, kern) {
    g.save(); const gr = g.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, hexA(farbe, 0)); gr.addColorStop(0.25, farbe); gr.addColorStop(0.8, farbe); gr.addColorStop(1, hexA(farbe, 0.1));
    g.strokeStyle = gr; g.lineWidth = breite; g.shadowColor = farbe; g.shadowBlur = glow; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.stroke();
    if (kern) { g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1.5, breite * 0.22); g.stroke(); }
    g.restore();
  }
  // Carbon-Hintergrund mit Neon-Streifen in den Ecken
  function grund(farbe) {
    return merk('grund' + farbe, () => {
      const c = leinwand(B, H), g = c.getContext('2d'), t = leinwand(24, 24), k = t.getContext('2d');
      const q = (x, y, hor) => { const gr = hor ? k.createLinearGradient(x, y, x, y + 12) : k.createLinearGradient(x, y, x + 12, y); gr.addColorStop(0, '#262b31'); gr.addColorStop(0.45, '#171b1f'); gr.addColorStop(1, '#0a0c0e'); k.fillStyle = gr; k.fillRect(x, y, 12, 12); };
      q(0, 0, true); q(12, 12, true); q(12, 0, false); q(0, 12, false);
      const p = g.createPattern(t, 'repeat'); p.setTransform(new DOMMatrix().rotateSelf(45).scaleSelf(1.6));
      g.fillStyle = '#07090b'; g.fillRect(0, 0, B, H); g.fillStyle = p; g.fillRect(0, 0, B, H);
      const r = g.createRadialGradient(B / 2, H * 0.48, 80, B / 2, H * 0.48, 1100); r.addColorStop(0, 'rgba(2,3,4,.78)'); r.addColorStop(0.6, 'rgba(2,3,4,.5)'); r.addColorStop(1, 'rgba(2,3,4,.2)');
      g.fillStyle = r; g.fillRect(0, 0, B, H);
      licht(g, 0, 0, 640, farbe, 0.18); licht(g, B, H, 700, farbe, 0.18);
      streifen(g, -10, 470, 340, -10, 30, farbe, 44, true); streifen(g, -10, 300, 210, -10, 7, farbe, 22, true); streifen(g, -10, 640, 460, -10, 2.5, farbe, 12);
      streifen(g, B + 10, H - 470, B - 340, H + 10, 30, farbe, 44, true); streifen(g, B + 10, H - 300, B - 210, H + 10, 7, farbe, 22, true); streifen(g, B + 10, H - 640, B - 460, H + 10, 2.5, farbe, 12);
      return c;
    });
  }
  // Chrom-Schrift mit Neon-Rand, 3D-Tiefe, Bürstung und Glanz → fertiges Bild
  function chrom(text, px, farbe, maxB) {
    return merk(['chrom', text, px, farbe, maxB].join('|'), () => {
      const m = leinwand(10, 10).getContext('2d'); RU(m, px); let w = m.measureText(text).width;
      const fs = px * Math.min(1, (maxB || 980) / w); RU(m, fs); w = m.measureText(text).width;
      const pad = 90, cw = w + pad * 2 + fs * SK, ch = fs * 0.78 + pad * 2, c = leinwand(cw, ch), g = c.getContext('2d');
      const y = pad + fs * 0.74, x0 = pad + fs * SK * 0.75, top = y - fs * 0.72;
      const mal = (ctx, f) => { ctx.save(); ctx.transform(1, 0, -SK, 1, SK * y, 0); RU(ctx, fs); f(ctx); ctx.restore(); };
      mal(g, k => { k.lineJoin = 'round'; k.strokeStyle = farbe; k.shadowColor = farbe; k.lineWidth = fs * 0.075; k.shadowBlur = fs * 0.28; k.strokeText(text, x0, y); k.shadowBlur = fs * 0.12; k.lineWidth = fs * 0.05; k.strokeText(text, x0, y); });
      mal(g, k => { const n = Math.max(6, Math.round(fs / 22)); for (let i = n; i >= 1; i--) { const v = 14 + i * 3; k.fillStyle = i > n - 3 ? '#020303' : `rgb(${v},${v + 3},${v + 6})`; k.fillText(text, x0 + i * 0.7, y + i * 1.05); } });
      mal(g, k => { k.lineJoin = 'round'; k.strokeStyle = '#06080a'; k.lineWidth = Math.max(4, fs * 0.03); k.strokeText(text, x0, y); });
      const o = leinwand(cw, ch), ok = o.getContext('2d');
      mal(ok, k => { const lg = k.createLinearGradient(0, top, 0, y); [[0, '#ffffff'], [0.14, '#e9edf0'], [0.32, '#a3abb2'], [0.47, '#f5f7f8'], [0.5, '#5f6670'], [0.57, '#3b4148'], [0.72, '#a6aeb5'], [0.88, '#f1f4f6'], [1, '#8a939b']].forEach(([p, f]) => lg.addColorStop(p, f)); k.fillStyle = lg; k.fillText(text, x0, y); });
      ok.globalCompositeOperation = 'source-atop';
      for (let yy = Math.floor(top) - 6; yy < y + 6; yy += 2) { ok.fillStyle = `rgba(255,255,255,${0.025 + ((Math.sin(yy * 1.7) + Math.sin(yy * 0.31)) * 0.25 + 0.5) * 0.06})`; ok.fillRect(0, yy, cw, 1); }
      const sp = ok.createLinearGradient(0, top + (y - top) * 0.62, 0, y); sp.addColorStop(0, hexA(farbe, 0)); sp.addColorStop(1, hexA(farbe, 0.5)); ok.fillStyle = sp; ok.fillRect(0, top, cw, y - top + 4);
      mal(ok, k => { k.lineJoin = 'round'; k.lineWidth = Math.max(2, fs * 0.022); const kg = k.createLinearGradient(0, top, 0, y); kg.addColorStop(0, 'rgba(255,255,255,.9)'); kg.addColorStop(0.5, 'rgba(255,255,255,.2)'); kg.addColorStop(1, 'rgba(0,0,0,.55)'); k.strokeStyle = kg; k.strokeText(text, x0, y); });
      g.drawImage(o, 0, 0);
      return { c, w: cw, h: ch, base: y, mitte: cw / 2, gesicht: o };
    });
  }
  // Neon-Schrift (leuchtend)
  function neonText(g, text, x, y, px, farbe, setz, ausr, glow) {
    g.save(); (setz || RU)(g, px); g.textAlign = ausr || 'left';
    g.shadowColor = farbe; g.shadowBlur = glow ?? px * 0.5; g.fillStyle = farbe; g.fillText(text, x, y); g.shadowBlur = (glow ?? px * 0.5) * 0.35; g.fillText(text, x, y);
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.85)'; g.globalAlpha = 0.55; g.fillText(text, x, y);
    g.restore();
  }
  // Schräges Neon-Band mit dunkler Schrift
  function band(text, farbe, px) {
    return merk(['band', text, farbe, px].join('|'), () => {
      const m = leinwand(10, 10).getContext('2d'); RU(m, px); const tw = m.measureText(text).width;
      const h = px * 1.55, s = h * 0.42, w = Math.min(B - 120, tw + px * 1.6 + s), c = leinwand(w + s + 160, h + 120), g = c.getContext('2d'), x0 = 40, y0 = 60;
      g.save(); g.shadowColor = farbe; g.shadowBlur = 40;
      const lg = g.createLinearGradient(0, y0, 0, y0 + h); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.18, farbe); lg.addColorStop(1, farbe); g.fillStyle = lg;
      const pg = (a, b, c2, d) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c2); g.lineTo(...d); g.closePath(); g.fill(); };
      pg([x0 + s, y0], [x0 + w + s - 60, y0], [x0 + w - 60, y0 + h], [x0, y0 + h]);
      for (let i = 0; i < 3; i++) { const x = x0 + w - 40 + i * 30; pg([x + s, y0], [x + s + 16, y0], [x + 16, y0 + h], [x, y0 + h]); }
      g.restore();
      g.save(); RU(g, passt(g, text, w - px * 1.2, px, RU)); g.fillStyle = '#06080a'; const ty = y0 + h / 2 + px * 0.36; g.transform(1, 0, -SK, 1, SK * ty, 0);
      g.fillText(text, x0 + s * 0.5 + px * 0.5, ty); g.restore();
      return { c, w: w + s + 160, h: h + 120, bandW: w + s };
    });
  }

  // ─── Zeitplan eines Clips: Hauptteil · Zeitlupe vom Ende (halbe Geschwindigkeit) · Abspann ───
  function zeitplan(c) {
    const dauer = c.dauer || 10, a = kl(c.start || 0, 0, Math.max(0, dauer - 1)), b = kl(c.ende || dauer, a + 1, dauer);
    const D = b - a, Z = c.zeitlupe ? Math.min(3, D * 0.4) : 0, R = Z * 2, T = D + R + OUTRO;
    return { a, b, D, Z, R, T, quelle: t => (t < D ? a + t : t < D + R ? b - Z + (t - D) / 2 : null) };
  }

  // ─── Ein Bild zeichnen (Vorschau und Video benutzen dieselbe Funktion) ───
  let KLEIN = null;
  function weichesBild(g, vid, farbe) {   // Clip unscharf als Hintergrund (klein zeichnen, groß ziehen)
    if (!KLEIN) KLEIN = leinwand(96, 54);
    const k = KLEIN.getContext('2d'); k.drawImage(vid, 0, 0, 96, 54);
    const hh = H + 400, ww = hh * 96 / 54;
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(KLEIN, (B - ww) / 2, -200, ww, hh); g.restore();
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, B, H);
    g.save(); g.globalAlpha = 0.8; g.drawImage(grund(farbe), 0, 0); g.restore();
  }
  function quellBild(g, vid, x, y, w, h, zoom, versatz) {   // Clip deckend in ein Rechteck
    const vw = vid.videoWidth || vid.displayWidth || 1920, vh = vid.videoHeight || vid.displayHeight || 1080, s = Math.max(w / vw, h / vh) * (zoom || 1), dw = vw * s, dh = vh * s;
    g.drawImage(vid, x + (w - dw) * (0.5 + (versatz || 0) * 0.5), y + (h - dh) / 2, dw, dh);
  }
  function ecken(g, x, y, w, h, farbe, l) {   // Neon-Ecken (HUD)
    g.save(); g.lineCap = 'square'; g.strokeStyle = farbe; g.lineWidth = 9; g.shadowColor = farbe; g.shadowBlur = 26;
    const e = (ax, ay, dx, dy) => { g.beginPath(); g.moveTo(ax + dx * l, ay); g.lineTo(ax, ay); g.lineTo(ax, ay + dy * l); g.stroke(); };
    for (let i = 0; i < 2; i++) { e(x, y, 1, 1); e(x + w, y, -1, 1); e(x, y + h, 1, -1); e(x + w, y + h, -1, -1); }
    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.5; e(x, y, 1, 1); e(x + w, y, -1, 1); e(x, y + h, 1, -1); e(x + w, y + h, -1, -1);
    g.restore();
  }
  function pille(g, text, x, y, farbe, px, voll) {   // kleines schräges Schild
    g.save(); RU(g, px); const w = g.measureText(text).width + px * 1.4, h = px * 1.6, s = h * 0.35;
    g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath();
    g.shadowColor = farbe; g.shadowBlur = 18;
    if (voll) { g.fillStyle = farbe; g.fill(); g.shadowBlur = 0; g.fillStyle = '#06080a'; } else { g.fillStyle = 'rgba(6,8,10,.85)'; g.fill(); g.strokeStyle = farbe; g.lineWidth = 3; g.stroke(); g.shadowBlur = 0; g.fillStyle = '#fff'; }
    g.fillText(text, x + s * 0.5 + px * 0.7, y + h / 2 + px * 0.36);
    g.restore(); return w + s;
  }
  function uhr(sek) { const m = Math.floor(sek / 60), s = sek - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; }
  function schuetteln(dt) { if (dt < 0 || dt > 0.45) return [0, 0]; const k = (1 - dt / 0.45) * 22; return [Math.sin(dt * 90) * k, Math.cos(dt * 70) * k * 0.6]; }
  function chevrons(g, x, y, t, farbe) {   // springende Pfeile nach unten (zu den Kommentaren)
    g.save(); g.strokeStyle = farbe; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = farbe; g.shadowBlur = 16;
    for (let i = 0; i < 2; i++) { const yy = y + i * 20 + Math.abs(Math.sin(t * 4)) * 10; g.globalAlpha = i ? 0.55 : 1; g.beginPath(); g.moveTo(x - 18, yy); g.lineTo(x, yy + 16); g.lineTo(x + 18, yy); g.stroke(); }
    g.restore();
  }

  // Lichtreflex, der über die Chrom-Schrift wischt (q: 0…1)
  let GLANZ = null;
  function glanz(g, ch, x, y, q, staerke) {
    if (!GLANZ || GLANZ.width < ch.w || GLANZ.height < ch.h) GLANZ = leinwand(Math.max(ch.w, GLANZ ? GLANZ.width : 0), Math.max(ch.h, GLANZ ? GLANZ.height : 0));
    const k = GLANZ.getContext('2d'); k.clearRect(0, 0, GLANZ.width, GLANZ.height);
    k.globalCompositeOperation = 'source-over'; k.drawImage(ch.gesicht || ch.c, 0, 0);
    k.globalCompositeOperation = 'source-in';
    const bx = -ch.h * 0.5 + (ch.w + ch.h * 0.5) * q, gr = k.createLinearGradient(bx, 0, bx + ch.h * 0.38, ch.h * 0.25);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    k.fillStyle = gr; k.fillRect(0, 0, ch.w, ch.h);
    k.globalCompositeOperation = 'source-over';
    g.save(); g.globalAlpha = staerke || 0.75; g.drawImage(GLANZ, 0, 0, ch.w, ch.h, x, y, ch.w, ch.h); g.restore();
  }
  // Neonröhre geht an: kurzes Flackern am Anfang
  const flackern = t => (t < 0.1 ? 0 : t < 0.18 ? 1 : t < 0.24 ? 0.2 : t < 0.36 ? 1 : t < 0.4 ? 0.35 : 1);

  function zeichne(g, t, c, p, m, vid) {
    const v = vorlage(c), f = c.farbe || v.farbe, zoom = c.modus === 'zoom';
    const outro = t >= p.T - OUTRO, rz = !outro && t >= p.D && t < p.D + p.R, imClip = !outro;
    const [sx, sy] = rz && v.stempel ? schuetteln(t - p.D) : [0, 0];
    g.save(); g.translate(sx, sy);
    // Hintergrund
    if (imClip && vid) {
      if (zoom) {
        quellBild(g, vid, -40, -40, B + 80, H + 80, rz ? 1.12 : 1.02 + 0.03 * fp(t, 0, p.D), c.versatz);
        const v1 = g.createLinearGradient(0, 0, 0, 760); v1.addColorStop(0, 'rgba(3,4,6,.92)'); v1.addColorStop(1, 'rgba(3,4,6,0)'); g.fillStyle = v1; g.fillRect(0, 0, B, 760);
        const v2 = g.createLinearGradient(0, 1030, 0, H); v2.addColorStop(0, 'rgba(3,4,6,0)'); v2.addColorStop(0.42, 'rgba(3,4,6,.88)'); g.fillStyle = v2; g.fillRect(0, 1030, B, H - 1030);
      } else weichesBild(g, vid, f);
    } else g.drawImage(grund(f), 0, 0);
    if (imClip) {
      // Clip im Neon-Rahmen (oder ganzes Bild bei „Zoom“)
      const fx = zoom ? 34 : 40, fy = zoom ? 640 : 660, fw = zoom ? B - 68 : 1000, fh = zoom ? 640 : 562;
      const fl = flackern(t);
      if (!zoom && vid) {
        g.save(); rr(g, fx, fy, fw, fh, 14); g.clip();
        g.fillStyle = '#000'; g.fillRect(fx, fy, fw, fh);
        quellBild(g, vid, fx, fy, fw, fh, rz ? 1.15 : 1, 0);
        if (rz) { g.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = fy; yy < fy + fh; yy += 6) g.fillRect(fx, yy, fw, 2); }
        g.restore();
        g.save(); g.globalAlpha = fl; rr(g, fx, fy, fw, fh, 14); g.strokeStyle = hexA(f, 0.55); g.lineWidth = 3; g.shadowColor = f; g.shadowBlur = 22; g.stroke(); g.restore();
      }
      g.save(); g.globalAlpha = fl;
      if (!zoom) ecken(g, fx - 10, fy - 10, fw + 20, fh + 20, f, 74);
      else ecken(g, 34, 200, B - 68, 1350, f, 90);
      g.restore();
      // Schild oben links am Rahmen, Uhr oben rechts
      const sy0 = zoom ? 560 : fy - 66;
      if (rz) {
        pille(g, 'REPLAY 0.5×', fx + 40, sy0, '#ff2a2a', 30, false);
        if (Math.floor(t * 3) % 2 === 0) { g.save(); g.fillStyle = '#ff2a2a'; g.shadowColor = '#ff2a2a'; g.shadowBlur = 16; g.beginPath(); g.arc(fx + 18, sy0 + 24, 11, 0, Math.PI * 2); g.fill(); g.restore(); }
      }
      else pille(g, tagText(v), fx + 6, sy0, f, 30, true);
      if (vid) { g.save(); OR(g, 34); g.textAlign = 'right'; g.shadowColor = f; g.shadowBlur = 14; g.fillStyle = '#fff'; g.fillText(uhr(p.quelle(t) || 0), fx + fw - 6, sy0 + 38); g.restore(); }
      // Fortschritt
      const pr = kl(t / (p.T - OUTRO), 0, 1), py = 1248;
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(fx, py, fw, 8);
      g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16; g.fillRect(fx, py, fw * pr, 8); g.restore();
      // Spruch oben: knallt rein mit Glitch, pulsiert danach leicht
      const zeilen = zweiZeilen(GROSS(c.hook || v.hooks[0])), px = zeilen.length > 1 ? 150 : 175;
      zeilen.forEach((z, i) => {
        const t0 = 0.12 + i * 0.16, q = fp(t, t0, t0 + 0.32); if (q <= 0) return;
        const ch = chrom(z, px, f, 990), s = 1 + 0.9 * (1 - eob(q)) + 0.012 * Math.max(0, Math.sin((t - t0) * Math.PI * 2)), cy = (zeilen.length > 1 ? 300 : 360) + i * (px * 0.98);
        g.save(); g.translate(B / 2, cy); g.scale(s, s); g.globalAlpha = Math.min(1, q * 2.5);
        if (t - t0 < 0.42) {   // Glitch: versetzte Streifen und Farbgeister
          const r = zufallR(Math.floor(t * 30) + i * 7), n = 7, sh = ch.h / n;
          for (let k = 0; k < n; k++) g.drawImage(ch.c, 0, k * sh, ch.w, sh, -ch.mitte + (r() - 0.5) * 70 * (1 - q), -ch.base + k * sh, ch.w, sh);
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * (1 - q);
          g.drawImage(ch.c, -ch.mitte - 18, -ch.base); g.drawImage(ch.c, -ch.mitte + 18, -ch.base);
        } else {
          g.drawImage(ch.c, -ch.mitte, -ch.base);
          const gq = ((t - 1 - i * 0.12) % 3.2) / 0.75;
          if (t > 1 + i * 0.12 && gq <= 1) glanz(g, ch, -ch.mitte, -ch.base, gq);
        }
        g.restore();
      });
      // Zeitlupe: Band mit Ansage, Crash-Stempel
      if (rz) {
        const q = fp(t, p.D, p.D + 0.25), aus = fp(t, p.D + 1.6, p.D + 1.9);
        if (q > 0 && aus < 1) { const bd = band(v.wieder, f, 44); g.save(); g.globalAlpha = 1 - aus; g.translate(-(1 - eo(q)) * B, 0); g.drawImage(bd.c, B / 2 - bd.bandW / 2 - 40, (zoom ? 700 : fy + 40) - 60); g.restore(); }
        if (v.stempel) {
          const s2 = fp(t, p.D + 0.05, p.D + 0.3);
          if (s2 > 0) { g.save(); g.translate(B / 2, (zoom ? 980 : fy + fh / 2 + 20)); g.rotate(-0.18); const k = 1 + (1 - eo(s2)) * 1.6; g.scale(k, k); g.globalAlpha = 0.92 * Math.min(1, s2 * 1.6);
            RU(g, 150); const w = g.measureText(v.stempel).width + 80; g.strokeStyle = f; g.lineWidth = 12; g.shadowColor = f; g.shadowBlur = 30; rr(g, -w / 2, -125, w, 175, 18); g.stroke();
            g.fillStyle = f; g.textAlign = 'center'; g.fillText(v.stempel, 0, 12); g.restore(); }
        }
      }
      // Hotlap: Rundenzeit groß am Ende des Hauptteils
      if (v.felder && c.rundenzeit && t >= p.D - 2.2) {
        const q = fp(t, p.D - 2.2, p.D - 1.9), ch = chrom(String(c.rundenzeit).trim(), 150, f, 900);
        g.save(); g.translate(B / 2, zoom ? 1120 : fy + fh - 40); const k = 0.7 + 0.3 * eob(q); g.scale(k, k); g.globalAlpha = Math.min(1, q * 2); g.drawImage(ch.c, -ch.mitte, -ch.base); g.restore();
        const info = GROSS([c.strecke, c.auto].filter(Boolean).join(' · '));
        if (info) { g.save(); g.globalAlpha = q; SA(g, passt(g, info, 900, 52, SA)); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 12; g.fillText(info, B / 2, (zoom ? 1120 : fy + fh - 40) + 70); g.restore(); }
      }
      // Frage unten als Neon-Band, Pfeile zu den Kommentaren
      const ub = fp(t, 0.9, 1.25);
      if (ub > 0) {
        const bd = band(GROSS(v.unten), f, 46), y = 1290;
        g.save(); g.translate(-(1 - eo(ub)) * B, 0); g.drawImage(bd.c, B / 2 - bd.bandW / 2 - 40, y - 60); g.restore();
        if (ub >= 1) chevrons(g, B / 2, y + 96, t, f);
      }
      // Marke unten: Logo im Neon-Ring, Name, Folgen-Schild
      marke(g, t, m, f, 1462);
    } else outroZeichnen(g, t - (p.T - OUTRO), m, f);
    g.restore();
    // Blitze: Anfang, Zeitlupe, Abspann
    const blitze = [[0.12, 0.5], [p.D, p.R ? 0.6 : 0], [p.T - OUTRO, 0.75]];
    for (const [z, a] of blitze) { const d = t - z; if (a && d >= 0 && d < 0.3) { g.fillStyle = `rgba(255,255,255,${a * (1 - d / 0.3)})`; g.fillRect(0, 0, B, H); } }
  }
  function logoRing(g, x, y, r, farbe, logo, t) {
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#05070a'; g.fill(); g.restore();
    if (logo) { g.save(); g.beginPath(); g.arc(x, y, r * 0.86, 0, Math.PI * 2); g.clip(); const iw = logo.naturalWidth || logo.width, ih = logo.naturalHeight || logo.height, s = Math.min(r * 1.6 / iw, r * 1.6 / ih); g.drawImage(logo, x - iw * s / 2, y - ih * s / 2, iw * s, ih * s); g.restore(); }
    g.save(); g.strokeStyle = '#eef2f5'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(x, y, r * 0.92, 0, Math.PI * 2); g.stroke(); g.restore();
    const d = (t || 0) * 1.6;
    g.save(); g.shadowColor = farbe; g.shadowBlur = r * 0.35; g.fillStyle = farbe; g.beginPath(); g.arc(x, y, r * 1.14, d + Math.PI * 0.45, d + Math.PI * 1.85); g.arc(x + Math.cos(d + Math.PI * 1.15) * r * 0.07, y + Math.sin(d + Math.PI * 1.15) * r * 0.07, r * 1.0, d + Math.PI * 1.85, d + Math.PI * 0.45, true); g.closePath(); g.fill(); g.fill(); g.restore();
  }
  function marke(g, t, m, f, y) {
    logoRing(g, 112, y, 52, f, m.logo, t);
    g.save(); RU(g, passt(g, m.name, 470, 46, RU, 26)); g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 10; g.fillText(m.name, 190, y - 4); g.restore();
    g.save(); SA(g, 30, 700); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('SIMRACING · IRACING', 192, y + 34); g.restore();
    const puls = 1 + 0.06 * Math.max(0, Math.sin(t * Math.PI * 2));
    g.save(); g.translate(800, y); g.scale(puls, puls); pille(g, '+ FOLGEN', -105, -33, f, 32, true); g.restore();
  }
  function outroZeichnen(g, t, m, f) {
    const q = eob(fp(t, 0, 0.45)), q2 = eo(fp(t, 0.25, 0.6)), q3 = eo(fp(t, 0.45, 0.8));
    g.save(); g.translate(B / 2, 720); g.scale(q, q); logoRing(g, 0, 0, 170, f, m.logo, t); g.restore();
    if (q2 > 0) {
      const ch = chrom('FOLG MIR', 170, f, 960), gq = (t - 0.75) / 0.6;
      g.save(); g.globalAlpha = q2; g.translate(B / 2, 1090); g.scale(0.8 + 0.2 * q2, 0.8 + 0.2 * q2); g.drawImage(ch.c, -ch.mitte, -ch.base);
      if (gq >= 0 && gq <= 1) glanz(g, ch, -ch.mitte, -ch.base, gq, 0.85);
      g.restore();
    }
    if (q3 > 0) { g.save(); g.globalAlpha = q3; const hp = passt(g, m.handle, 960, 84, RU, 40); neonText(g, m.handle, B / 2, 1225, hp, f, RU, 'center'); SA(g, 44, 700); g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('SIMRACING-CLIPS · IRACING', B / 2, 1300); g.restore(); }
  }

  // ─── Ton: Clip-Ton + Zeitlupe (tiefer) + eigene Effekt-Sounds, auf gleiche Lautheit ───
  const TON_RATE = 48000;
  let RAUSCH = null;
  function rauschen(ctx) { if (!RAUSCH) { RAUSCH = ctx.createBuffer(1, TON_RATE * 2, TON_RATE); const d = RAUSCH.getChannelData(0), r = zufallR(7); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; } return RAUSCH; }
  async function tonMischen(c, p, quelle) {
    const ctx = new OfflineAudioContext(2, Math.ceil(TON_RATE * p.T), TON_RATE), aus = ctx.createDynamicsCompressor();
    aus.threshold.value = -10; aus.ratio.value = 4; aus.connect(ctx.destination);
    const rn = (t, d) => { const s = ctx.createBufferSource(); s.buffer = rauschen(ctx); s.loop = true; s.start(t); s.stop(t + d); return s; };
    if (quelle) {
      const h = ctx.createBufferSource(); h.buffer = quelle; const hg = ctx.createGain(); h.connect(hg); hg.connect(aus);
      hg.gain.setValueAtTime(0.9, 0); hg.gain.setValueAtTime(0.9, Math.max(0, p.D - 0.08)); hg.gain.linearRampToValueAtTime(0.0001, p.D);
      h.start(0, p.a, p.D);
      if (p.R) {
        const z = ctx.createBufferSource(); z.buffer = quelle; z.playbackRate.value = 0.5;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        const zg = ctx.createGain(); zg.gain.setValueAtTime(0.0001, p.D); zg.gain.linearRampToValueAtTime(0.85, p.D + 0.15); zg.gain.setValueAtTime(0.85, p.D + p.R - 0.2); zg.gain.linearRampToValueAtTime(0.0001, p.D + p.R);
        z.connect(lp); lp.connect(zg); zg.connect(aus); z.start(p.D, p.b - p.Z, p.Z);
      }
    }
    const wumms = (t, vol, tief) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(tief ? 95 : 140, t); o.frequency.exponentialRampToValueAtTime(tief ? 30 : 40, t + 0.6);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + (tief ? 1.4 : 0.9)); o.connect(g); g.connect(aus); o.start(t); o.stop(t + 1.5);
      const n = rn(t, 0.5), lp = ctx.createBiquadFilter(), gn = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.45);
      gn.gain.setValueAtTime(vol * 0.55, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); n.connect(lp); lp.connect(gn); gn.connect(aus);
    };
    const zisch = (t, d, vol, runter) => {
      const n = rn(t, d), bp = ctx.createBiquadFilter(), g = ctx.createGain(), pn = ctx.createStereoPanner(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(runter ? 3800 : 320, t); bp.frequency.exponentialRampToValueAtTime(runter ? 300 : 3800, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + d * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      pn.pan.setValueAtTime(-0.7, t); pn.pan.linearRampToValueAtTime(0.7, t + d); n.connect(bp); bp.connect(g); g.connect(pn); pn.connect(aus);
    };
    const glitch = (t, d, vol) => { for (let z = t; z < t + d; z += 0.035) { const n = rn(z, 0.03), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 4000; g.gain.setValueAtTime(vol * (0.4 + Math.random() * 0.6), z); g.gain.exponentialRampToValueAtTime(0.0001, z + 0.028); n.connect(hp); hp.connect(g); g.connect(aus); } };
    const anstieg = (t, d, vol) => { const n = rn(t, d), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.setValueAtTime(200, t); hp.frequency.exponentialRampToValueAtTime(7000, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + d); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.02); n.connect(hp); hp.connect(g); g.connect(aus); };
    const ton = (t, f, d, vol) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(aus); o.start(t); o.stop(t + d + 0.05); };
    zisch(0, 0.2, 0.25); wumms(0.12, 0.75); glitch(0.12, 0.35, 0.18);
    zisch(0.85, 0.4, 0.15);
    if (p.R) { zisch(p.D - 0.25, 0.3, 0.3, true); wumms(p.D, 0.8, true); }
    anstieg(p.T - OUTRO - 0.7, 0.7, 0.3); wumms(p.T - OUTRO, 0.9, true); [1318, 1661, 1976].forEach((fq, i) => ton(p.T - OUTRO + 0.25 + i * 0.07, fq, 1.2, 0.08));
    const buf = await ctx.startRendering();
    // Lautheit angleichen (Ziel ≈ −15 dBFS, Spitzen unter −1 dB)
    let su = 0, sp = 0; for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) { su += d[i] * d[i]; sp = Math.max(sp, Math.abs(d[i])); } }
    const rms = Math.sqrt(su / (buf.length * 2)) || 1e-6, k = Math.min(Math.pow(10, -15 / 20) / rms, 0.89 / (sp || 1));
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= k; }
    return buf;
  }
  async function quellTon(c) {   // Ton des Clips einmal lesen (geht bei MP4/WebM, sonst ohne Clip-Ton)
    if (c._ton !== undefined) return c._ton;
    try { const ac = new OfflineAudioContext(2, 1, TON_RATE); c._ton = await ac.decodeAudioData(await c.datei.arrayBuffer()); } catch (e) { c._ton = null; }
    return c._ton;
  }

  // ─── Clip Bild für Bild lesen ───
  // Schnell: MP4 selbst zerlegen und mit WebCodecs der Reihe nach entschlüsseln (Bild für Bild, ohne Springen).
  // Notlösung (Format geht so nicht): Video-Element, das zu jedem Bild springt (deutlich langsamer).
  // Kleiner MP4-Zerleger: findet die Videospur und alle ihre Bilder (normale und fragmentierte MP4, z. B. von OBS)
  // → { codec, breite, hoehe, beschr, proben: [{ off, groesse, dts, cts, dauer, key }], ts } (Zeiten in Einheiten von ts)
  function mp4Zerlegen(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), N = buf.byteLength;
    const s4 = o => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    const u32 = o => dv.getUint32(o), i32 = o => dv.getInt32(o), u64 = o => dv.getUint32(o) * 4294967296 + dv.getUint32(o + 4);
    function boxen(a, e) {
      const l = [];
      for (let o = a; o + 8 <= e;) {
        let gr = u32(o), k = 8;
        if (gr === 1) { gr = u64(o + 8); k = 16; } else if (gr === 0) gr = e - o;
        if (gr < k || o + gr > e) break;
        l.push({ t: s4(o + 4), a: o, d: o + k, e: o + gr });
        o += gr;
      }
      return l;
    }
    const kinder = b => boxen(b.d, b.e), kind = (b, t) => b && kinder(b).find(x => x.t === t);
    const pfad = (b, ...ts) => ts.reduce((x, t) => kind(x, t), b);
    const oben = boxen(0, N), moov = oben.find(b => b.t === 'moov');
    if (!moov) throw new Error('MP4 ohne moov');
    let trak = null;
    for (const t of kinder(moov).filter(x => x.t === 'trak')) { const h = pfad(t, 'mdia', 'hdlr'); if (h && s4(h.d + 8) === 'vide') { trak = t; break; } }
    if (!trak) throw new Error('keine Videospur');
    const tkhd = kind(trak, 'tkhd'), id = u32(tkhd.d + (u8[tkhd.d] === 1 ? 20 : 12));
    const mdhd = pfad(trak, 'mdia', 'mdhd'), ts = u32(mdhd.d + (u8[mdhd.d] === 1 ? 20 : 12));
    const stbl = pfad(trak, 'mdia', 'minf', 'stbl'), stsd = kind(stbl, 'stsd');
    const eintrag = boxen(stsd.d + 8, stsd.e)[0];
    if (!eintrag) throw new Error('kein Video-Eintrag');
    const art = eintrag.t, breite = dv.getUint16(eintrag.d + 24), hoehe = dv.getUint16(eintrag.d + 26);
    const zusatz = boxen(eintrag.d + 78, eintrag.e), hex = (x, n) => x.toString(16).padStart(n || 2, '0');
    let codec = '', beschr = null;
    const avcC = zusatz.find(x => x.t === 'avcC'), hvcC = zusatz.find(x => x.t === 'hvcC');
    if (avcC) { beschr = u8.slice(avcC.d, avcC.e); codec = art + '.' + hex(beschr[1]) + hex(beschr[2]) + hex(beschr[3]); }
    else if (hvcC) {
      beschr = u8.slice(hvcC.d, hvcC.e);
      const b1 = beschr[1], raum = ['', 'A', 'B', 'C'][b1 >> 6], tier = (b1 >> 5) & 1, prof = b1 & 31;
      let komp = (beschr[2] << 24 | beschr[3] << 16 | beschr[4] << 8 | beschr[5]) >>> 0, rev = 0;
      for (let i = 0; i < 32; i++) { rev = (rev << 1) | (komp & 1); komp >>>= 1; }
      const grenzen = Array.from(beschr.slice(6, 12)); while (grenzen.length && !grenzen[grenzen.length - 1]) grenzen.pop();
      codec = `${art}.${raum}${prof}.${(rev >>> 0).toString(16)}.${tier ? 'H' : 'L'}${beschr[12]}` + grenzen.map(x => '.' + x.toString(16)).join('');
    } else throw new Error('Videoformat ' + art + ' geht so nicht');
    const proben = [];
    // Normale MP4: Tabellen in stbl
    const stsz = kind(stbl, 'stsz'), anzahl = stsz ? u32(stsz.d + 8) : 0;
    if (anzahl) {
      const fest = u32(stsz.d + 4), groesse = i => fest || u32(stsz.d + 12 + i * 4);
      const stts = kind(stbl, 'stts'), ctts = kind(stbl, 'ctts'), stsc = kind(stbl, 'stsc'), stco = kind(stbl, 'stco'), co64 = kind(stbl, 'co64'), stss = kind(stbl, 'stss');
      const dts = new Array(anzahl); let t = 0, i = 0;
      for (let k = 0, n = u32(stts.d + 4); k < n; k++) { const c = u32(stts.d + 8 + k * 8), d = u32(stts.d + 12 + k * 8); for (let j = 0; j < c && i < anzahl; j++, i++) { dts[i] = t; t += d; } }
      for (; i < anzahl; i++) dts[i] = t;
      const versatz = new Array(anzahl).fill(0);
      if (ctts) { i = 0; const v1 = u8[ctts.d] === 1; for (let k = 0, n = u32(ctts.d + 4); k < n; k++) { const c = u32(ctts.d + 8 + k * 8), o = v1 ? i32(ctts.d + 12 + k * 8) : u32(ctts.d + 12 + k * 8); for (let j = 0; j < c && i < anzahl; j++, i++) versatz[i] = o; } }
      const sync = stss ? new Set(Array.from({ length: u32(stss.d + 4) }, (_, k) => u32(stss.d + 8 + k * 4) - 1)) : null;
      const chunks = co64 ? Array.from({ length: u32(co64.d + 4) }, (_, k) => u64(co64.d + 8 + k * 8)) : Array.from({ length: u32(stco.d + 4) }, (_, k) => u32(stco.d + 8 + k * 4));
      const lauf = Array.from({ length: u32(stsc.d + 4) }, (_, k) => [u32(stsc.d + 8 + k * 12) - 1, u32(stsc.d + 12 + k * 12)]);
      i = 0;
      for (let r = 0; r < lauf.length; r++) {
        const bis = r + 1 < lauf.length ? lauf[r + 1][0] : chunks.length;
        for (let ch = lauf[r][0]; ch < bis && i < anzahl; ch++) {
          let off = chunks[ch];
          for (let j = 0; j < lauf[r][1] && i < anzahl; j++, i++) { const g = groesse(i); proben.push({ off, groesse: g, dts: dts[i], cts: dts[i] + versatz[i], dauer: (i + 1 < anzahl ? dts[i + 1] : dts[i] + (dts[i] - (dts[i - 1] || 0))) - dts[i], key: sync ? sync.has(i) : true }); off += g; }
        }
      }
    }
    // Fragmentierte MP4 (moof/traf/trun)
    const trex = (pfad(moov, 'mvex') ? kinder(pfad(moov, 'mvex')) : []).find(x => x.t === 'trex' && u32(x.d + 4) === id);
    const std = { dauer: trex ? u32(trex.d + 12) : 0, groesse: trex ? u32(trex.d + 16) : 0, flags: trex ? u32(trex.d + 20) : 0 };
    let zeit = proben.length ? proben[proben.length - 1].dts + proben[proben.length - 1].dauer : 0;
    for (const moof of oben.filter(b => b.t === 'moof')) {
      let ende = moof.a;
      for (const traf of kinder(moof).filter(x => x.t === 'traf')) {
        const tfhd = kind(traf, 'tfhd'), fl = u32(tfhd.d) & 0xffffff;
        if (u32(tfhd.d + 4) !== id) continue;
        let p = tfhd.d + 8, basis = fl & 0x20000 ? moof.a : ende;
        if (fl & 1) { basis = u64(p); p += 8; }
        if (fl & 2) p += 4;
        const tDauer = fl & 8 ? u32((p += 4) - 4) : std.dauer, tGroesse = fl & 0x10 ? u32((p += 4) - 4) : std.groesse, tFlags = fl & 0x20 ? u32((p += 4) - 4) : std.flags;
        const tfdt = kind(traf, 'tfdt'); if (tfdt) zeit = u8[tfdt.d] === 1 ? u64(tfdt.d + 4) : u32(tfdt.d + 4);
        for (const trun of kinder(traf).filter(x => x.t === 'trun')) {
          const rf = u32(trun.d) & 0xffffff, v1 = u8[trun.d] === 1, n = u32(trun.d + 4);
          let q = trun.d + 8, off = basis;
          if (rf & 1) { off = basis + i32(q); q += 4; }
          let erst = null; if (rf & 4) { erst = u32(q); q += 4; }
          for (let k = 0; k < n; k++) {
            const d = rf & 0x100 ? u32((q += 4) - 4) : tDauer, g = rf & 0x200 ? u32((q += 4) - 4) : tGroesse;
            const f = rf & 0x400 ? u32((q += 4) - 4) : (k === 0 && erst !== null ? erst : tFlags);
            const c = rf & 0x800 ? (v1 ? i32((q += 4) - 4) : u32((q += 4) - 4)) : 0;
            proben.push({ off, groesse: g, dts: zeit, cts: zeit + c, dauer: d, key: !((f >> 16) & 1) && ((f >> 24) & 3) !== 1 });
            off += g; zeit += d;
          }
          ende = off;
        }
      }
    }
    if (!proben.length) throw new Error('keine Bilder in der MP4');
    return { codec, breite, hoehe, beschr, proben, ts };
  }
  async function mp4Lesen(datei) {
    const buf = await datei.arrayBuffer(), m = mp4Zerlegen(buf);
    const cfg = { codec: m.codec, codedWidth: m.breite, codedHeight: m.hoehe };
    if (m.beschr) cfg.description = m.beschr;
    if (!window.VideoDecoder || !(await VideoDecoder.isConfigSupported(cfg)).supported) throw new Error('Format ' + m.codec + ' nicht entschlüsselbar');
    let basis = Infinity; for (const x of m.proben) basis = Math.min(basis, x.cts);   // erstes Bild = 0 s (wie im Video-Element)
    for (const x of m.proben) { x.us = Math.round((x.cts - basis) * 1e6 / m.ts); x.dus = Math.round(x.dauer * 1e6 / m.ts); x.data = new Uint8Array(buf, x.off, x.groesse); }
    return { cfg, proben: m.proben };
  }
  function decoderLeser({ cfg, proben }) {
    const us = i => proben[i].us;
    const keys = []; proben.forEach((x, i) => { if (x.key) keys.push(i); });
    if (!keys.length) keys.push(0);
    let fertig = [], pos = 0, ende = false, letzte = -1, warter = null, fehler = null;
    const wecken = () => { if (warter) { const w = warter; warter = null; w(); } };
    const dec = new VideoDecoder({
      output: fr => { let i = fertig.length; while (i > 0 && fertig[i - 1].timestamp > fr.timestamp) i--; fertig.splice(i, 0, fr); wecken(); },
      error: e => { fehler = e; wecken(); }
    });
    dec.configure(cfg);
    const keyVor = tus => { let k = keys[0]; for (const i of keys) { if (us(i) <= tus) k = i; else break; } return k; };
    function springen(tus) {
      for (const fr of fertig) fr.close();
      fertig = [];
      dec.reset(); dec.configure(cfg);
      pos = keyVor(tus); ende = false;
    }
    async function bei(t) {
      if (fehler) throw fehler;
      const tus = Math.max(0, t * 1e6), eps = 2000;
      const weit = keyVor(tus) > pos && us(keyVor(tus)) - (fertig.length ? fertig[fertig.length - 1].timestamp : -1e12) > 1e6;
      if (letzte < 0 || tus + eps < letzte || (fertig.length && tus + eps < fertig[0].timestamp) || weit) springen(tus);
      letzte = tus;
      for (let runde = 0; runde < 20000; runde++) {
        while (fertig.length >= 2 && fertig[1].timestamp <= tus + eps) fertig.shift().close();
        if (fertig.length >= 2 || (ende && fertig.length)) return fertig[0];
        if (fehler) throw fehler;
        if (pos < proben.length) {
          for (let n = 0; pos < proben.length && n < 4 && dec.decodeQueueSize + fertig.length < 6; n++, pos++) {
            const x = proben[pos];
            dec.decode(new EncodedVideoChunk({ type: x.key ? 'key' : 'delta', timestamp: x.us, duration: x.dus, data: x.data }));
          }
        } else if (!ende) { try { await dec.flush(); } catch (e) { fehler = fehler || e; } ende = true; continue; }
        else return fertig[0] || null;
        await new Promise(r => { warter = r; setTimeout(() => { if (warter === r) { warter = null; r(); } }, 15); });
      }
      return fertig[0] || null;
    }
    return { bei, zu() { for (const fr of fertig) fr.close(); fertig = []; try { dec.close(); } catch (e) { /* schon zu */ } }, art: 'webcodecs' };
  }
  async function leser(c) {
    try { return decoderLeser(await mp4Lesen(c.datei)); }
    catch (e) { console.warn('Clip-Fabrik: Bild-für-Bild-Lesen geht nicht, springe im Video', e); }
    const vid = await videoElement(c.url);
    return { bei: async t => { await suchen(vid, t); return vid; }, zu() { vid.removeAttribute('src'); vid.load(); }, art: 'video' };
  }

  // ─── MP4 bauen (H.264 + AAC, begrenzter Farbbereich wie bei den anderen Posts) ───
  let MUXER = null;
  function muxerLaden() {
    if (window.Mp4Muxer) return Promise.resolve();
    if (!MUXER) MUXER = new Promise((ok, nein) => { const s = document.createElement('script'); s.src = BASIS + 'tools/mp4-muxer.js'; s.onload = ok; s.onerror = () => { MUXER = null; nein(new Error('Video-Baustein nicht geladen')); }; document.head.appendChild(s); });
    return MUXER;
  }
  // RGBA → I420 (BT.709, begrenzter Bereich wie bei den anderen Posts) · Ganzzahl-Rechnung, 2 Zeilen auf einmal
  function zuI420(px, W, Hh, out) {
    const cw = W >> 1, ys = W * Hh, us = cw * (Hh >> 1), d = new Uint32Array(px.buffer, px.byteOffset, W * Hh);
    for (let y2 = 0, k = 0; y2 < Hh >> 1; y2++) {
      const z0 = y2 * 2 * W, z1 = z0 + W;
      for (let x2 = 0; x2 < cw; x2++, k++) {
        const i0 = z0 + 2 * x2, i1 = z1 + 2 * x2, a = d[i0], b = d[i0 + 1], c = d[i1], e = d[i1 + 1];
        const ra = a & 255, ga = (a >> 8) & 255, ba = (a >> 16) & 255, rb = b & 255, gb = (b >> 8) & 255, bb = (b >> 16) & 255;
        const rc = c & 255, gc = (c >> 8) & 255, bc = (c >> 16) & 255, re = e & 255, ge = (e >> 8) & 255, be = (e >> 16) & 255;
        out[i0] = 16 + ((11966 * ra + 40254 * ga + 4064 * ba + 32768) >> 16);
        out[i0 + 1] = 16 + ((11966 * rb + 40254 * gb + 4064 * bb + 32768) >> 16);
        out[i1] = 16 + ((11966 * rc + 40254 * gc + 4064 * bc + 32768) >> 16);
        out[i1 + 1] = 16 + ((11966 * re + 40254 * ge + 4064 * be + 32768) >> 16);
        const r4 = ra + rb + rc + re, g4 = ga + gb + gc + ge, b4 = ba + bb + bc + be;
        out[ys + k] = 128 + ((-6597 * r4 - 22187 * g4 + 28785 * b4 + 131072) >> 18);
        out[ys + us + k] = 128 + ((28785 * r4 - 26146 * g4 - 2638 * b4 + 131072) >> 18);
      }
    }
  }
  function suchen(v, t) {
    return new Promise(ok => {
      if (Math.abs(v.currentTime - t) < 0.001 && v.readyState >= 2) return ok();
      const fertig = () => { v.removeEventListener('seeked', fertig); ok(); };
      v.addEventListener('seeked', fertig); v.currentTime = t; setTimeout(fertig, 3000);
    });
  }
  function videoElement(url) {
    return new Promise((ok, nein) => {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.onloadeddata = () => ok(v); v.onerror = () => nein(new Error('Dieses Video kann der Browser nicht öffnen. Bitte als MP4 (H.264) speichern.'));
      v.src = url;
    });
  }
  async function bauen(c, m, fortschritt) {
    if (!window.VideoEncoder) throw new Error('Dieser Browser kann keine Videos bauen. Bitte Chrome oder Edge nehmen.');
    await Promise.all([muxerLaden(), schriften()]);
    const p = zeitplan(c), quelle = await quellTon(c), ton = await tonMischen(c, p, quelle), les = await leser(c);
    try {
    let vcfg = null;
    for (const codec of ['avc1.640028', 'avc1.640032', 'avc1.4d0028', 'avc1.42e028']) {
      const k = { codec, width: B, height: H, bitrate: 9000000, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } };
      try { if ((await VideoEncoder.isConfigSupported(k)).supported) { vcfg = k; break; } } catch (e) { /* weiter */ }
    }
    if (!vcfg) throw new Error('Dieser Browser kann kein H.264. Bitte Chrome oder Edge nehmen.');
    let acfg = null;
    if (window.AudioEncoder) for (const br of [192000, 160000, 128000]) { const k = { codec: 'mp4a.40.2', sampleRate: TON_RATE, numberOfChannels: 2, bitrate: br }; try { if ((await AudioEncoder.isConfigSupported(k)).supported) { acfg = k; break; } } catch (e) { /* weiter */ } }
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: B, height: H, frameRate: FPS },
      audio: acfg ? { codec: 'aac', numberOfChannels: 2, sampleRate: TON_RATE } : undefined, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
    let fehler = null;
    const enc = new VideoEncoder({ output: (ch, md) => muxer.addVideoChunk(ch, md), error: e => { fehler = e; } });
    enc.configure(vcfg);
    const cv = leinwand(B, H), g = cv.getContext('2d'), puffer = new Uint8Array(B * H * 3 / 2), cs = { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false };
    const n = Math.round(p.T * FPS);
    for (let i = 0; i < n; i++) {
      if (fehler) throw fehler;
      const t = i / FPS, q = p.quelle(t), bild = q != null ? await les.bei(q) : null;
      g.clearRect(0, 0, B, H); zeichne(g, t, c, p, m, bild);
      zuI420(g.getImageData(0, 0, B, H).data, B, H, puffer);
      const fr = new VideoFrame(puffer, { format: 'I420', codedWidth: B, codedHeight: H, timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS), colorSpace: cs });
      enc.encode(fr, { keyFrame: i % FPS === 0 }); fr.close();
      while (enc.encodeQueueSize > 8) await warte(4);
      if (fortschritt && i % 10 === 0) fortschritt(i / n);
    }
    await enc.flush(); enc.close();
    if (fehler) throw fehler;
    if (acfg) {
      const aenc = new AudioEncoder({ output: (ch, md) => muxer.addAudioChunk(ch, md), error: e => { fehler = e; } });
      aenc.configure(acfg);
      const N = ton.length, li = ton.getChannelData(0), re = ton.getChannelData(1), BL = 4800;
      for (let i = 0; i < N; i += BL) {
        const k = Math.min(BL, N - i), d = new Float32Array(k * 2); d.set(li.subarray(i, i + k), 0); d.set(re.subarray(i, i + k), k);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: TON_RATE, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(i * 1e6 / TON_RATE), data: d });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
      if (fehler) throw fehler;
    }
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    blob.mitTon = !!acfg; blob.dauer = p.T; blob.leser = les.art;
    return blob;
    } finally { les.zu(); }
  }
  // Vorschaubild (für die Liste): Spruch steht, Clip läuft
  async function vorschaubild(c, m) {
    await schriften();
    const p = zeitplan(c), vid = await videoElement(c.url), t = Math.min(1.4, p.D * 0.5);
    await suchen(vid, p.quelle(t));
    const cv = leinwand(B, H), g = cv.getContext('2d'); zeichne(g, t, c, p, m, vid);
    const k = leinwand(540, 960); k.getContext('2d').drawImage(cv, 0, 0, 540, 960);
    vid.removeAttribute('src'); vid.load();
    return new Promise(ok => k.toBlob(ok, 'image/jpeg', 0.85));
  }

  // ═══════════════════════════════════════════════════════════
  // Oberfläche
  // ═══════════════════════════════════════════════════════════
  let BOX = null, UMG = null, MAT = null, ARBEIT = '';
  const OFFEN = { 'kc-so': null, 'kc-raus': false, 'kc-einst': false };   // aufgeklappte Bereiche bleiben offen
  const CLIPS = [];          // reingezogene Clips, der erste ist im Editor
  const VOR = { vid: null, url: '', canvas: null, lauf: 0, ton: false, c: null };   // Vorschau
  const stand = () => (UMG && UMG.stand()) || {};
  async function material() {
    const st = stand(), d = st.design || {};
    const name = ((st.konto && st.konto.username) || 'kreids888');
    const logo = await bild(d.logoBild || '');
    MAT = { logo, name: GROSS(name), handle: '@' + GROSS(name) };
    return MAT;
  }
  function neuerClip(datei) {
    return new Promise(ok => {
      const url = URL.createObjectURL(datei), v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
      v.onloadedmetadata = () => {
        const dauer = v.duration || 0, vl = VORLAGEN[0];
        ok(dauer >= 2 ? { id: Math.random().toString(36).slice(2), datei, url, name: datei.name, dauer, start: Math.max(0, dauer - 15), ende: dauer,
          vorlage: vl.id, hook: vl.hooks[0], zeitlupe: vl.zl, modus: 'ganz', versatz: 0, farbe: vl.farbe, text: vorlageText(vl, {}), textEigen: false, rundenzeit: '', strecke: '', auto: '',
          insta: true, tiktok: !!(stand().tiktok && stand().tiktok.verbunden), postMs: 0 } : null);
      };
      v.onerror = () => ok(null);
      v.src = url;
    });
  }
  function vorlageSetzen(c, id) {
    const v = VORLAGEN.find(x => x.id === id) || VORLAGEN[0];
    c.vorlage = v.id; c.hook = v.hooks[0]; c.zeitlupe = v.zl; c.farbe = v.farbe; c.text = vorlageText(v, c); c.textEigen = false;
  }
  const postText = c => String(c.text || '').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
  const sek = s => (Math.round(s * 10) / 10).toLocaleString('de-DE', { minimumFractionDigits: 1 }) + ' s';
  const tipp = t => `<div class="kc-tipp">${t}</div>`;

  function html() {
    const st = stand(), c = CLIPS[0], liste = (st.clips || []), cfg = st.clipcfg || { zeit: '18:30', test: true };
    const draussen = x => (!x.insta || !!x.gepostet) && (!x.tiktok || !!x.tt);
    const offen = liste.filter(x => !draussen(x)), raus = liste.filter(draussen).reverse();
    const tk = st.tiktok || {};
    return `<div class="kc-app">
      <details class="kc-so" ${(OFFEN['kc-so'] ?? !(CLIPS.length || liste.length)) ? 'open' : ''}><summary>💡 So geht’s (in 3 Schritten)</summary>
        <ol><li><b>Clip reinziehen</b> – einfach die MP4 aus dem Kreids Clipper hier reinziehen (auch mehrere auf einmal).</li>
        <li><b>Vorlage antippen</b> – z. B. „Wer war schuld?“. Spruch, Farbe und Text sind schon fertig, ändern geht immer.</li>
        <li><b>🚀 Einplanen</b> – das Video wird hier gebaut und geht zur geplanten Zeit raus: Instagram-Reel und TikTok-Entwurf. Ein Clip pro Tag.</li></ol>
        <div class="kc-dim">Tipp für Reichweite: 2 bis 3 Wochen lang jeden Tag einen Clip, immer zur gleichen Uhrzeit.</div></details>
      ${ARBEIT ? `<div class="kc-arbeit"><span class="kc-spin"></span>${esc(ARBEIT)}</div>` : ''}
      <label class="kc-drop${c ? ' klein' : ''}" data-c="drop"><input type="file" accept="video/*" multiple data-c="datei">
        <span class="kc-drop-gross">🎬 ${c ? 'Weitere Clips reinziehen' : 'Clip hier reinziehen'}</span><span class="kc-dim">oder antippen und auswählen · MP4 aus dem Kreids Clipper</span></label>
      ${c ? editor(c, tk) : ''}
      ${CLIPS.length > 1 ? `<div class="kc-reihe-info">⏭ Danach warten noch ${CLIPS.length - 1} Clip${CLIPS.length > 2 ? 's' : ''}: ${CLIPS.slice(1).map(x => esc(x.name)).join(' · ')}</div>` : ''}
      <h3 class="kc-h">📅 Geplant <span class="kc-dim">(${offen.length})</span></h3>
      ${offen.length ? offen.map(x => zeile(x, false)).join('') : '<div class="kc-leer">Noch nichts geplant. Zieh oben einen Clip rein.</div>'}
      ${raus.length ? `<details class="kc-raus" ${OFFEN['kc-raus'] ? 'open' : ''}><summary>✓ Schon draußen (${raus.length})</summary>${raus.map(x => zeile(x, true)).join('')}</details>` : ''}
      <details class="kc-einst" ${OFFEN['kc-einst'] ? 'open' : ''}><summary>⚙ Einstellungen</summary>
        <div class="kc-felder">
          <label class="kc-feld">Uhrzeit für neue Clips<input type="time" value="${esc(cfg.zeit)}" data-c="cfg-zeit">${tipp('Jeder neue Clip kommt auf den nächsten freien Tag um diese Uhrzeit.')}</label>
          <label class="kc-check"><input type="checkbox" data-c="cfg-test" ${cfg.test ? 'checked' : ''}> <span><b>Test-Reels</b>${tipp('Instagram zeigt den Clip zuerst nur Leuten, die dir noch nicht folgen. Läuft er gut, sehen ihn auch deine Follower. Geht laut einem Planungstool erst ab 1.000 Followern – sonst wird ganz normal gepostet.')}</span></label>
        </div>
        ${cfg.testFehler ? `<div class="kc-hinweis">Test-Reels gingen beim letzten Mal nicht, deshalb wurde normal gepostet. Instagram sagt: ${esc(cfg.testFehler)}</div>` : ''}
        <div class="kc-knoepfe"><button type="button" class="btn ki-k" data-c="cfg-speichern">💾 Speichern</button></div>
        ${tipp('Instagram-Konto steht ganz oben („● Verbunden mit …“). Logo: Reiter „🎨 Aussehen“. TikTok verbinden: Reiter „📡 YouTube & TikTok“.')}
      </details>
    </div>`;
  }
  function editor(c, tk) {
    const v = vorlage(c), p = zeitplan(c);
    return `<div class="kc-editor">
      <div class="kc-links">
        <div class="kc-buehne"><canvas class="kc-vorschau" width="540" height="960" data-c="vorschau"></canvas>
          <button type="button" class="kc-ton" data-c="ton">${VOR.ton ? '🔊' : '🔇'}</button></div>
        <div class="kc-dim kc-mitte">Vorschau läuft in Schleife · ${sek(p.T)} lang${VOR.ton ? '' : ' · 🔇 tippen für Ton'}</div>
        <div class="kc-dim kc-mitte">Effekt-Sounds hörst du im fertigen Video.</div>
      </div>
      <div class="kc-rechts">
        <div class="kc-schritt">1 · Vorlage</div>
        <div class="kc-vorlagen">${VORLAGEN.map(x => `<button type="button" class="kc-vl${x.id === c.vorlage ? ' an' : ''}" data-c="vorlage" data-wert="${x.id}" style="--f:${x.farbe}"><span>${x.emoji}</span>${esc(x.name)}</button>`).join('')}</div>
        ${tipp(esc(v.hilfe))}
        <div class="kc-schritt">2 · Spruch & Look</div>
        <label class="kc-feld">Spruch oben<div class="kc-zeile"><input type="text" maxlength="40" value="${esc(c.hook)}" data-c="hook"><button type="button" class="btn ki-k" data-c="wuerfeln" title="Anderer Spruch">🎲</button></div>${tipp('Der erste Satz entscheidet, ob jemand stehen bleibt. Kurz und frech. 🎲 = anderer Vorschlag.')}</label>
        ${v.felder ? `<div class="kc-felder">
          <label class="kc-feld">Rundenzeit<input type="text" maxlength="12" placeholder="1:52.414" value="${esc(c.rundenzeit)}" data-c="rundenzeit"></label>
          <label class="kc-feld">Strecke<input type="text" maxlength="40" placeholder="Spa" value="${esc(c.strecke)}" data-c="strecke"></label>
          <label class="kc-feld">Auto<input type="text" maxlength="40" placeholder="Porsche 992 Cup" value="${esc(c.auto)}" data-c="auto"></label></div>
          ${tipp('Die Zeit kommt am Ende groß ins Bild.')}` : ''}
        <div class="kc-farben">${FARBEN.map(f => `<button type="button" class="kc-farbe${f === c.farbe ? ' an' : ''}" style="--f:${f}" data-c="farbe" data-wert="${f}" aria-label="Neonfarbe ${f}"></button>`).join('')}<span class="kc-dim">Neonfarbe</span></div>
        <div class="kc-felder">
          <div class="kc-umschalt"><button type="button" class="${c.modus !== 'zoom' ? 'an' : ''}" data-c="modus" data-wert="ganz">▭ Ganzes Bild</button><button type="button" class="${c.modus === 'zoom' ? 'an' : ''}" data-c="modus" data-wert="zoom">▯ Zoom</button></div>
          <label class="kc-check"><input type="checkbox" data-c="zeitlupe" ${c.zeitlupe ? 'checked' : ''}> <span><b>Zeitlupe</b> vom Ende</span></label>
        </div>
        ${c.modus === 'zoom' ? `<label class="kc-feld">Bildausschnitt<input type="range" min="-1" max="1" step="0.05" value="${c.versatz}" data-c="versatz"></label>` : ''}
        ${tipp('Ganzes Bild: Clip im Neon-Rahmen. Zoom: Clip füllt das ganze Handy (Seiten werden abgeschnitten). Zeitlupe: die letzten Sekunden nochmal halb so schnell.')}
        <div class="kc-schritt">3 · Schnitt</div>
        <div class="kc-schnitt">
          <label class="kc-feld">Anfang <b data-c="start-wert">${sek(p.a)}</b><input type="range" min="0" max="${c.dauer}" step="0.1" value="${p.a}" data-c="start"></label>
          <label class="kc-feld">Ende <b data-c="ende-wert">${sek(p.b)}</b><input type="range" min="0" max="${c.dauer}" step="0.1" value="${p.b}" data-c="ende"></label>
        </div>
        ${tipp(`Clip ist ${sek(c.dauer)} lang. Genommen werden ${sek(p.D)}${p.R ? ' + Zeitlupe' : ''}. Am besten 8 bis 20 Sekunden, die Action ans Ende.`)}
        <div class="kc-schritt">4 · Text & Termin</div>
        <label class="kc-feld">Text unter dem Post<textarea rows="4" maxlength="2200" data-c="text">${esc(c.text)}</textarea>${tipp('Mit Frage am Ende – Kommentare bringen Reichweite. Höchstens 5 Hashtags.')}</label>
        <div class="kc-felder">
          <label class="kc-feld">Geht raus am<input type="datetime-local" value="${c.postMs ? esc(lokal(c.postMs)) : ''}" data-c="postms">${tipp(c.postMs ? '' : 'Leer = nächster freier Tag.')}</label>
          <div class="kc-ziele">
            <label class="kc-check"><input type="checkbox" data-c="insta" ${c.insta ? 'checked' : ''}> <span><b>Instagram</b> (Reel)</span></label>
            <label class="kc-check${tk.verbunden ? '' : ' aus'}"><input type="checkbox" data-c="tiktok" ${c.tiktok && tk.verbunden ? 'checked' : ''} ${tk.verbunden ? '' : 'disabled'}> <span><b>TikTok</b> (Entwurf)</span></label>
          </div>
        </div>
        ${tipp(tk.verbunden ? 'TikTok: Das Video landet als Entwurf in deiner TikTok-App. Dort nur noch einen Trend-Sound drauf und posten.' : 'TikTok ist nicht verbunden (Reiter „📡 YouTube & TikTok“). Für TikTok: „📥 Video laden“ und selbst hochladen.')}
        <div class="kc-knoepfe gross">
          <button type="button" class="btn ki-k kc-los" data-c="einplanen" ${ARBEIT ? 'disabled' : ''}>🚀 Video bauen & einplanen</button>
          <button type="button" class="btn ki-k" data-c="laden" ${ARBEIT ? 'disabled' : ''}>📥 Nur Video laden</button>
          <button type="button" class="btn ki-k" data-c="weglegen">✕ Clip entfernen</button>
        </div>
      </div>
    </div>`;
  }
  function zeile(x, raus) {
    const v = VORLAGEN.find(y => y.id === x.vorlage) || VORLAGEN[0];
    const chips = [];
    if (x.insta) chips.push(x.gepostet ? `<span class="ki-chip gruen">Instagram ✓${x.gepostet.test ? ' (Test-Reel)' : ''}</span>` : '<span class="ki-chip blau">Instagram</span>');
    if (x.tiktok) chips.push(x.tt ? '<span class="ki-chip gruen">TikTok-Entwurf ✓</span>' : '<span class="ki-chip blau">TikTok</span>');
    if (!x.video) chips.push('<span class="ki-chip rot">Video fehlt – löschen und neu einplanen</span>');
    if (x.fehler) chips.push('<span class="ki-chip rot">Fehler</span>');
    return `<div class="kc-post" data-id="${esc(x.id)}">
      <a class="kc-mini" href="${esc(x.video)}" target="_blank" rel="noopener" title="Video ansehen">${x.bild ? `<img src="${esc(x.bild)}" alt="">` : '🎬'}</a>
      <div class="kc-info">
        <div class="kc-titel" style="--f:${v.farbe}">${v.emoji} ${esc(x.titel || v.name)}</div>
        <div class="kc-dim">${raus ? 'Gepostet' : 'Geht raus'}: <b>${esc(zeit(raus ? ((x.gepostet && x.gepostet.zeit) || (x.tt && x.tt.zeit) || x.postMs) : x.postMs))}</b>${x.dauer ? ' · ' + sek(x.dauer) : ''}</div>
        <div class="kc-chips">${chips.join('')}</div>
        ${x.fehler ? `<div class="kc-hinweis rot">⚠ ${esc(x.fehler)}</div>` : ''}${x.ttFehler && !x.tt ? `<div class="kc-hinweis rot">TikTok: ${esc(x.ttFehler)}</div>` : ''}
        <div class="kc-knoepfe">
          ${x.gepostet && x.gepostet.link ? `<a class="btn ki-k" href="${esc(x.gepostet.link)}" target="_blank" rel="noopener">↗ Auf Instagram</a>` : ''}
          ${!raus ? `<button type="button" class="btn ki-k" data-c="jetzt">🚀 Jetzt posten</button>
            <input type="datetime-local" value="${esc(lokal(x.postMs))}" data-c="zeitwert"><button type="button" class="btn ki-k" data-c="zeit">🕒 Zeit</button>` : ''}
          ${x.video ? `<a class="btn ki-k" href="${esc(x.video)}" download>📥 Video</a>` : ''}
          <button type="button" class="btn ki-k" data-c="loeschen">🗑</button>
        </div>
      </div></div>`;
  }

  // ─── Vorschau: Clip läuft live mit allen Ebenen (Zeitlupe und Abspann im Takt) ───
  async function vorschauStarten() {
    const cv = BOX && BOX.querySelector('canvas[data-c="vorschau"]'), c = CLIPS[0];
    if (!cv || !c) return;
    if (!MAT) await material();
    await schriften();
    if (!VOR.vid || VOR.url !== c.url) {
      if (VOR.vid) { VOR.vid.pause(); VOR.vid.removeAttribute('src'); VOR.vid.load(); }
      VOR.vid = document.createElement('video'); VOR.vid.playsInline = true; VOR.vid.preload = 'auto'; VOR.vid.src = c.url; VOR.url = c.url;
      await new Promise(ok => { VOR.vid.onloadeddata = ok; VOR.vid.onerror = ok; setTimeout(ok, 4000); });
    }
    VOR.vid.muted = !VOR.ton;
    VOR.canvas = cv; const g = cv.getContext('2d'), mein = ++VOR.lauf, vid = VOR.vid;
    let phase = '', outroStart = 0;
    const schritt = () => {
      if (VOR.lauf !== mein) return;
      const cl = CLIPS[0];
      if (!cv.isConnected || !cl || cl.url !== VOR.url) { vid.pause(); return; }   // Reiter gewechselt oder Clip weg → Video anhalten
      const p = zeitplan(cl);
      let t;
      if (phase === '' || phase === 'neu') { vid.playbackRate = 1; vid.currentTime = p.a; vid.play().catch(() => {}); phase = 'haupt'; }
      if (phase === 'haupt') { t = vid.currentTime - p.a; if (vid.currentTime >= p.b - 0.03 || vid.ended) { if (p.R) { phase = 'lupe'; vid.currentTime = p.b - p.Z; vid.playbackRate = 0.5; vid.play().catch(() => {}); } else { phase = 'outro'; vid.pause(); outroStart = performance.now(); } } }
      if (phase === 'lupe') { t = p.D + (vid.currentTime - (p.b - p.Z)) * 2; if (vid.currentTime >= p.b - 0.03 || vid.ended) { phase = 'outro'; vid.pause(); outroStart = performance.now(); } }
      if (phase === 'outro') { t = p.T - OUTRO + (performance.now() - outroStart) / 1000; if (t >= p.T) { phase = 'neu'; t = p.T - 0.01; } }
      g.setTransform(cv.width / B, 0, 0, cv.height / H, 0, 0); g.clearRect(0, 0, B, H);
      zeichne(g, kl(t || 0, 0, p.T - 0.001), cl, p, MAT, vid);
      requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }

  // ─── Aktionen ───
  function zeichnen() {
    if (!BOX) return;
    BOX.innerHTML = html();
    vorschauStarten();
  }
  async function dateienRein(dateien) {
    let n = 0;
    for (const d of dateien) {
      if (!/^video\//.test(d.type || '') && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(d.name || '')) continue;
      const c = await neuerClip(d);
      if (c) { CLIPS.push(c); n++; } else UMG.meldung(`„${d.name}“ kann der Browser nicht öffnen. Bitte als MP4 speichern.`, 1);
    }
    if (n) { UMG.meldung(n === 1 ? 'Clip geladen. Jetzt Vorlage antippen.' : `${n} Clips geladen.`); zeichnen(); }
  }
  async function senden(pfad, blob) { return UMG.senden(pfad, blob); }
  function clipWeg(c) {
    if (VOR.vid && VOR.url === c.url) { VOR.vid.pause(); VOR.vid.removeAttribute('src'); VOR.vid.load(); VOR.vid = null; VOR.url = ''; }
    URL.revokeObjectURL(c.url);
    const i = CLIPS.indexOf(c); if (i >= 0) CLIPS.splice(i, 1);
  }
  async function hochladen(id, blob) {
    const v = Date.now(), TEIL = 1900000, teile = Math.ceil(blob.size / TEIL);
    if (teile > 39) throw new Error('Video ist zu lang/groß. Bitte kürzer schneiden.');
    for (let i = 0; i < teile; i++) { await senden(`/api/clip/${id}/videoteil/${i}?v=${v}`, blob.slice(i * TEIL, (i + 1) * TEIL, 'application/octet-stream')); arbeit(`⬆ Hochladen … ${Math.round((i + 1) / teile * 100)} %`); }
    await UMG.igApi('POST', `/api/clip/${id}/videofertig?v=${v}`, { teile, groesse: blob.size });
  }
  function arbeit(t) { ARBEIT = t; const el = BOX && BOX.querySelector('.kc-arbeit'); if (el) el.lastChild.textContent = t; else zeichnen(); }
  async function einplanen(nurLaden) {
    const c = CLIPS[0]; if (!c || ARBEIT) return;
    if (!nurLaden && !c.insta && !c.tiktok) return UMG.meldung('Bitte Instagram oder TikTok anhaken.', 1);
    if (vorlage(c).felder && !c.rundenzeit) return UMG.meldung('Bitte die Rundenzeit eintragen.', 1);
    let id = '';
    try {
      arbeit('🎬 Video wird gebaut … 0 %');
      if (!MAT) await material();
      const blob = await bauen(c, MAT, x => arbeit(`🎬 Video wird gebaut … ${Math.round(x * 100)} %`));
      if (nurLaden) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kreids888-${c.vorlage}-${Date.now().toString(36)}.mp4`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        ARBEIT = ''; zeichnen(); return UMG.meldung('Video ist fertig und wird geladen.');
      }
      arbeit('⬆ Hochladen …');
      const r = await UMG.igApi('POST', '/api/clip/neu', { vorlage: c.vorlage, titel: GROSS(c.hook), text: postText(c), postMs: c.postMs || undefined, insta: c.insta, tiktok: c.tiktok, thumbMs: 1300, dauer: blob.dauer });
      id = r.id;
      await hochladen(id, blob);
      try { const vb = await vorschaubild(c, MAT); if (vb) await senden(`/api/clip/${id}/bild`, vb); } catch (e) { /* Vorschaubild ist nur schön */ }
      clipWeg(c);
      ARBEIT = '';
      UMG.meldung(`Eingeplant: ${zeit(r.postMs)} 🎉`);
      await UMG.laden();
    } catch (e) {
      ARBEIT = ''; zeichnen();
      if (id) { try { await UMG.igApi('POST', `/api/clip/${id}/weg`, {}); } catch (x) { /* egal */ } }
      UMG.meldung(e.message || String(e), 1);
    }
  }
  async function klick(ev) {
    const b = ev.target.closest('[data-c]'); if (!b || !BOX.contains(b)) return;
    const a = b.dataset.c, c = CLIPS[0], z = b.closest('[data-id]'), id = z && z.dataset.id;
    if (a === 'vorlage' && c) { vorlageSetzen(c, b.dataset.wert); zeichnen(); return; }
    if (a === 'wuerfeln' && c) { const h = vorlage(c).hooks, i = (h.indexOf(c.hook) + 1) % h.length; c.hook = h[i]; zeichnen(); return; }
    if (a === 'farbe' && c) { c.farbe = b.dataset.wert; zeichnen(); return; }
    if (a === 'modus' && c) { c.modus = b.dataset.wert; zeichnen(); return; }
    if (a === 'ton') { VOR.ton = !VOR.ton; if (VOR.vid) VOR.vid.muted = !VOR.ton; b.textContent = VOR.ton ? '🔊' : '🔇'; return; }
    if (a === 'einplanen') return einplanen(false);
    if (a === 'laden') return einplanen(true);
    if (a === 'weglegen' && c) { clipWeg(c); zeichnen(); return; }
    if (a === 'cfg-speichern') {
      try { await UMG.igApi('POST', '/api/clips/einstellungen', { zeit: BOX.querySelector('[data-c="cfg-zeit"]').value, test: BOX.querySelector('[data-c="cfg-test"]').checked }); UMG.meldung('Gespeichert.'); await UMG.laden(); } catch (e) { UMG.meldung(e.message, 1); }
      return;
    }
    if (!id) return;
    try {
      if (a === 'jetzt') {
        if (!confirm('Diesen Clip jetzt sofort posten?')) return;
        b.disabled = true; b.textContent = '⏳ …';
        const r = await UMG.igApi('POST', `/api/clip/${id}/jetzt`, {});
        UMG.meldung([r.gepostet ? 'Instagram ✓' : '', r.tiktok ? 'TikTok-Entwurf ✓' : '', r.ttFehler ? 'TikTok ging nicht: ' + r.ttFehler : ''].filter(Boolean).join(' · ') || 'Gesendet.', !!r.ttFehler && !r.gepostet);
        await UMG.laden();
      }
      if (a === 'zeit') { const v = z.querySelector('[data-c="zeitwert"]').value; await UMG.igApi('POST', `/api/clip/${id}/aendern`, { postMs: new Date(v).getTime() }); UMG.meldung('Zeit gespeichert.'); await UMG.laden(); }
      if (a === 'loeschen') { if (!confirm('Diesen Clip löschen? Er wird dann nicht gepostet.')) return; await UMG.igApi('POST', `/api/clip/${id}/weg`, {}); UMG.meldung('Gelöscht.'); await UMG.laden(); }
    } catch (e) { UMG.meldung(e.message, 1); await UMG.laden(); }
  }
  function eingabe(ev) {
    const t = ev.target, c = CLIPS[0]; if (!c || !t.dataset || !BOX.contains(t)) return;
    const a = t.dataset.c;
    if (a === 'hook') c.hook = t.value;
    else if (a === 'rundenzeit' || a === 'strecke' || a === 'auto') {
      c[a] = t.value;
      if (!c.textEigen && typeof vorlage(c).text === 'function') { c.text = vorlageText(vorlage(c), c); const ta = BOX.querySelector('[data-c="text"]'); if (ta) ta.value = c.text; }
    }
    else if (a === 'text') { c.text = t.value; c.textEigen = true; }
    else if (a === 'versatz') c.versatz = +t.value;
    else if (a === 'start' || a === 'ende') {
      const v = +t.value;
      if (a === 'start') c.start = Math.min(v, (c.ende || c.dauer) - 1); else c.ende = Math.max(v, (c.start || 0) + 1);
      const p = zeitplan(c), sw = BOX.querySelector('[data-c="start-wert"]'), ew = BOX.querySelector('[data-c="ende-wert"]');
      if (sw) sw.textContent = sek(p.a); if (ew) ew.textContent = sek(p.b);
      if (VOR.vid) { VOR.vid.currentTime = a === 'start' ? p.a : Math.max(p.a, p.b - 1.5); }
    }
  }
  function aenderung(ev) {
    const t = ev.target, c = CLIPS[0]; if (!t.dataset || !BOX.contains(t)) return;
    const a = t.dataset.c;
    if (a === 'datei' && t.files && t.files.length) { dateienRein([...t.files]); t.value = ''; return; }
    if (!c) return;
    if (a === 'zeitlupe') { c.zeitlupe = t.checked; zeichnen(); }
    else if (a === 'insta' || a === 'tiktok') c[a] = t.checked;
    else if (a === 'postms') c.postMs = t.value ? new Date(t.value).getTime() : 0;
    else if (a === 'start' || a === 'ende') zeichnen();
  }
  window.K888Clips = {
    VORLAGEN, bauen, zeitplan, zeichne, material, schriften, vorschaubild,
    async start(box, umg) {
      UMG = umg;
      if (BOX !== box) {
        BOX = box;
        box.addEventListener('click', klick);
        box.addEventListener('input', eingabe);
        box.addEventListener('change', aenderung);
        box.addEventListener('toggle', e => { const k = e.target.classList && [...e.target.classList].find(x => x in OFFEN); if (k) OFFEN[k] = e.target.open; }, true);
        box.addEventListener('dragover', e => { e.preventDefault(); const d = box.querySelector('.kc-drop'); if (d) d.classList.add('drueber'); });
        box.addEventListener('dragleave', e => { const d = box.querySelector('.kc-drop'); if (d && !box.contains(e.relatedTarget)) d.classList.remove('drueber'); });
        box.addEventListener('drop', e => { e.preventDefault(); const d = box.querySelector('.kc-drop'); if (d) d.classList.remove('drueber'); if (e.dataTransfer && e.dataTransfer.files.length) dateienRein([...e.dataTransfer.files]); });
      }
      MAT = null;
      schriften();
      zeichnen();
    }
  };

  const css = document.createElement('style');
  css.textContent = `
.kc-app{display:flex;flex-direction:column;gap:14px;max-width:1100px}
.kc-app .kc-dim{color:var(--steel,#8b929c);font-size:13px}
.kc-app .kc-tipp{color:var(--steel,#8b929c);font-size:12.5px;line-height:1.4;margin-top:4px}
.kc-app .kc-so{background:#0d0e13;border:1px solid var(--line,#23262f);border-left:3px solid #ff2d6f;padding:10px 14px;font-size:14px}
.kc-app .kc-so summary{cursor:pointer;font-weight:700;color:#fff}
.kc-app .kc-so ol{margin:8px 0;padding-left:20px;display:flex;flex-direction:column;gap:5px}
.kc-app .kc-drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:150px;border:2px dashed #ff2d6f;background:radial-gradient(ellipse at center,rgba(255,45,111,.12),rgba(0,0,0,0) 70%),#0b0c10;cursor:pointer;text-align:center;padding:16px;transition:.15s}
.kc-app .kc-drop.klein{min-height:64px;flex-direction:row;gap:12px;border-color:var(--line,#23262f)}
.kc-app .kc-drop.drueber,.kc-app .kc-drop:hover{border-color:#5cff1f;box-shadow:0 0 30px rgba(92,255,31,.25) inset}
.kc-app .kc-drop input{position:absolute;inset:0;opacity:0;cursor:pointer}
.kc-app .kc-drop-gross{font-family:var(--disp,inherit);font-weight:800;font-size:22px;letter-spacing:.04em;text-transform:uppercase;color:#fff;text-shadow:0 0 18px rgba(255,45,111,.7)}
.kc-app .kc-drop.klein .kc-drop-gross{font-size:16px}
.kc-app .kc-arbeit{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid rgba(92,255,31,.5);background:rgba(92,255,31,.07);color:#cfffbf;font-weight:600}
.kc-app .kc-spin{width:16px;height:16px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#5cff1f;animation:kcdreh .8s linear infinite;flex:none}
@keyframes kcdreh{to{transform:rotate(360deg)}}
.kc-app .kc-editor{display:flex;flex-wrap:wrap;gap:20px;background:#0d0e13;border:1px solid var(--line,#23262f);padding:16px}
.kc-app .kc-links{flex:0 0 300px;display:flex;flex-direction:column;gap:6px;max-width:100%}
.kc-app .kc-buehne{position:relative;width:300px;max-width:100%;aspect-ratio:9/16;background:#000;border:1px solid var(--line,#23262f);box-shadow:0 0 40px rgba(255,45,111,.18)}
.kc-app .kc-vorschau{width:100%;height:100%;display:block}
.kc-app .kc-ton{position:absolute;right:8px;bottom:8px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.6);color:#fff;font-size:18px;cursor:pointer}
.kc-app .kc-mitte{text-align:center}
.kc-app .kc-rechts{flex:1 1 380px;min-width:0;display:flex;flex-direction:column;gap:10px}
.kc-app .kc-schritt{font-family:var(--disp,inherit);font-weight:800;text-transform:uppercase;letter-spacing:.1em;font-size:13px;color:#fff;border-bottom:1px solid var(--line,#23262f);padding-bottom:4px;margin-top:6px}
.kc-app .kc-vorlagen{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.kc-app .kc-vl{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#14161d;border:2px solid #23262f;color:#fff;font:700 14px var(--body,inherit);cursor:pointer;text-align:left;transition:.12s}
.kc-app .kc-vl span{font-size:20px}
.kc-app .kc-vl:hover{border-color:var(--f)}
.kc-app .kc-vl.an{border-color:var(--f);box-shadow:0 0 18px color-mix(in srgb,var(--f) 55%,transparent),inset 0 0 14px color-mix(in srgb,var(--f) 25%,transparent);background:color-mix(in srgb,var(--f) 12%,#14161d)}
.kc-app .kc-feld{display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--steel,#8b929c);min-width:0}
.kc-app .kc-feld b{color:#fff}
.kc-app .kc-feld input[type=text],.kc-app .kc-feld input[type=time],.kc-app .kc-feld input[type=datetime-local]{height:42px;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;font:15px var(--body,inherit);padding:0 11px}
.kc-app .kc-feld input[type=range]{accent-color:#ff2d6f;width:100%}
.kc-app .kc-zeile{display:flex;gap:8px}.kc-app .kc-zeile input{flex:1;min-width:0}
.kc-app .kc-felder{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:flex-end}
.kc-app .kc-felder .kc-feld{flex:1 1 150px}
.kc-app .kc-farben{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kc-app .kc-farbe{width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,.2);background:var(--f);cursor:pointer;box-shadow:0 0 10px var(--f)}
.kc-app .kc-farbe.an{border-color:#fff;box-shadow:0 0 0 3px #0d0e13,0 0 0 5px var(--f),0 0 22px var(--f)}
.kc-app .kc-umschalt{display:flex;border:1px solid var(--line,#23262f)}
.kc-app .kc-umschalt button{background:transparent;border:0;color:var(--steel,#8b929c);font:700 13px var(--body,inherit);padding:10px 14px;cursor:pointer}
.kc-app .kc-umschalt button.an{background:#ff2d6f;color:#fff}
.kc-app .kc-check{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:#fff;cursor:pointer}
.kc-app .kc-check input{margin-top:3px;accent-color:#ff2d6f;width:18px;height:18px}
.kc-app .kc-check.aus{opacity:.5;cursor:default}
.kc-app .kc-schnitt{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.kc-app textarea{width:100%;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;font:14px/1.5 var(--body,inherit);padding:10px 11px;resize:vertical}
.kc-app .kc-ziele{display:flex;flex-direction:column;gap:8px;padding-bottom:6px}
.kc-app .kc-knoepfe{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.kc-app .kc-knoepfe input[type=datetime-local]{height:36px;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;padding:0 8px}
.kc-app .kc-knoepfe.gross{margin-top:8px}
.kc-app .btn.kc-los{background:linear-gradient(90deg,#ff2d6f,#ff7a00);border-color:transparent;color:#fff;font-size:15px;padding:13px 20px;box-shadow:0 0 24px rgba(255,45,111,.45)}
.kc-app .kc-reihe-info{color:#cfd3dc;font-size:13px;padding:8px 12px;border:1px dashed var(--line,#23262f)}
.kc-app .kc-h{font-family:var(--disp,inherit);font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:16px;margin:10px 0 0;color:#fff}
.kc-app .kc-leer{color:var(--steel,#8b929c);font-size:14px;padding:12px;border:1px dashed var(--line,#23262f)}
.kc-app .kc-post{display:flex;gap:14px;align-items:flex-start;padding:12px;background:#0d0e13;border:1px solid var(--line,#23262f)}
.kc-app .kc-mini{flex:none;width:78px;aspect-ratio:9/16;background:#000;border:1px solid var(--line,#23262f);display:grid;place-items:center;font-size:26px;text-decoration:none;overflow:hidden}
.kc-app .kc-mini img{width:100%;height:100%;object-fit:cover;display:block}
.kc-app .kc-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.kc-app .kc-titel{font-family:var(--disp,inherit);font-weight:800;font-size:17px;text-transform:uppercase;color:#fff;text-shadow:0 0 12px var(--f)}
.kc-app .kc-chips{display:flex;flex-wrap:wrap;gap:6px}
.kc-app .kc-hinweis{font-size:13px;color:#f5c518;background:#0b0c10;border:1px solid rgba(245,197,24,.45);padding:6px 10px}
.kc-app .kc-hinweis.rot{color:#ff6b75;border-color:rgba(225,19,36,.45)}
.kc-app .kc-raus,.kc-app .kc-einst{background:#0d0e13;border:1px solid var(--line,#23262f);padding:10px 14px}
.kc-app .kc-raus summary,.kc-app .kc-einst summary{cursor:pointer;font-weight:700;color:#fff}
.kc-app .kc-raus .kc-post{margin-top:10px;background:#0b0c10}
.kc-app .kc-einst .kc-felder{margin:10px 0}
.kc-app .kc-einst .kc-feld{max-width:280px}
@media (max-width:700px){.kc-app .kc-links{flex-basis:100%;align-items:center}.kc-app .kc-schnitt{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
})();
