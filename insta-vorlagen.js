// ═══════════════════════════════════════════════════════════
// Kreids888 · Vorlagen-Bau für die Instagram-Posts (Reiter „🧩 Vorlagen“ im Dashboard)
// • Formate: Feed 1080×1350 (Ankündigung, Ergebnis) · Story 1080×1920 (Raceday, Wochenplan)
// • Ebenen: Text (Platzhalter, 10 Schriften), Bild (Ich-Bild, Team-Bild, Logo, eigene Bilder), Form, Termine
// • Hintergrund: Bild des Rennens, eigenes Bild, Farbe – oder ein fertiges Kreids-Design als Grundlage
// • Klicken = auswählen · Ziehen = verschieben · Mausrad = Größe
// • Gespeichert im Worker kreids-insta (vorlage:<id>), eigene Bilder in der Ablage (ablage:<id>)
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  const B = 1080;
  const HOEHE = { feed: 1350, story: 1920 };
  const FUER = { feed: [['ank', 'Ankündigung'], ['erg', 'Ergebnis']], story: [['story', 'Raceday-Story'], ['woche', 'Wochenplan']] };
  const ARTEN = [['ank', '📣 Ankündigung'], ['story', '📱 Raceday-Story'], ['erg', '🏁 Ergebnis'], ['woche', '🗓 Wochenplan']];
  const formatVon = typ => (typ === 'story' || typ === 'woche' ? 'story' : 'feed');
  const site = () => (window.K888Bilder && window.K888Bilder.SITE) || location.origin + '/site/';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gross = t => String(t || '').toLocaleUpperCase('de-DE');
  const kopie = o => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('_') ? undefined : v)));
  const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ─── Schriften (kreids888.com/fonts, frei nutzbar: SIL Open Font License) ───
  const SCHRIFTEN = {
    saira: ['Saira Condensed', 'saira-condensed', [600, 800, 900]],
    anton: ['Anton', 'anton', [400]],
    bebas: ['Bebas Neue', 'bebas-neue', [400]],
    oswald: ['Oswald', 'oswald', [500, 700]],
    teko: ['Teko', 'teko', [500, 700]],
    barlow: ['Barlow Condensed', 'barlow-condensed', [600, 800]],
    russo: ['Russo One', 'russo-one', [400]],
    orbitron: ['Orbitron', 'orbitron', [700, 900]],
    racing: ['Racing Sans One', 'racing-sans-one', [400]],
    blackops: ['Black Ops One', 'black-ops-one', [400]]
  };
  const schriftVon = k => SCHRIFTEN[k] || SCHRIFTEN.saira;
  const gewichtVon = (k, w) => schriftVon(k)[2].reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
  const FONT = new Map();
  function schriftLaden(k, w) {
    const [name, datei] = schriftVon(k), g = gewichtVon(k, w), key = k + g;
    if (!FONT.has(key)) {
      const f = new FontFace('K888V ' + name, `url(${site()}fonts/${datei}-latin-${g}-normal.woff2)`, { weight: String(g) });
      document.fonts.add(f);
      FONT.set(key, f.load().catch(() => { FONT.delete(key); }));
    }
    return FONT.get(key);
  }
  const font = (k, w, size) => `${gewichtVon(k, w)} ${Math.round(size * 10) / 10}px "K888V ${schriftVon(k)[0]}"`;

  // ─── Bilder ───
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
  const POSEN = () => (window.K888Thumb && window.K888Thumb.POSEN) || [['pose_02_zeigt_auf_dich.png', 'Zeigt auf dich']];
  const TEAM = () => (window.K888Bilder && window.K888Bilder.TEAM) || [];
  function bildUrl(el, umg) {
    const st = umg.stand();
    if (el.quelle === 'pose') return site() + 'overlays/personen/' + el.datei;
    if (el.quelle === 'team') return site() + 'team/bilder/' + el.datei;
    if (el.quelle === 'logo') return st.design.logoBild || '';
    if (el.quelle === 'ablage') { const a = (st.ablage || []).find(x => x.id === el.datei); return a ? a.url : ''; }
    return '';
  }

  // ─── Daten eines Posts → Platzhalter ───
  const MONATE = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
  function wochenText(von, bis) {
    if (!von || !bis) return '';
    const [, m1, d1] = String(von).split('-').map(Number), [j, m2, d2] = String(bis).split('-').map(Number);
    return m1 === m2 ? `${d1}. – ${d2}. ${MONATE[m2 - 1]} ${j}` : `${d1}. ${MONATE[m1 - 1]} – ${d2}. ${MONATE[m2 - 1]} ${j}`;
  }
  function werte(p, design) {
    const berlin = ms => (window.K888Bilder ? window.K888Bilder.berlin(ms || Date.now()) : { tag: '', zeit: '', wochentag: '', wt: '' });
    const s = berlin(p.startMs), l = berlin(p.liveMs || p.startMs), e = p.ergebnis;
    const tage = p.tage || 0;
    const countdown = p.typ === 'erg' ? 'ERGEBNIS' : p.typ === 'woche' ? 'DIESE WOCHE' : p.typ === 'story' || tage <= 0 ? 'HEUTE' : tage === 1 ? 'MORGEN' : `IN ${tage} TAGEN`;
    const delta = e && e.start && e.ziel ? e.start - e.ziel : null;
    return {
      spruch: (p.spruch || '').trim() || (window.K888Bilder ? window.K888Bilder.ersatzSpruch(p) : ''),
      strecke: p.track || p.titel || p.art || 'Rennen', layout: p.layout || '', serie: p.serie || p.titel || '', titel: p.titel || '',
      runde: p.nr ? 'Runde ' + p.nr : '', nr: p.nr ? String(p.nr) : '', datum: s.tag, wochentag: s.wochentag || '', tag: s.wt || '',
      zeit: l.zeit, live: 'Live ab ' + l.zeit + ' Uhr', countdown, livezeile: design.liveText || '', web: 'kreids888.com',
      platz: e ? (e.ziel ? 'P' + e.ziel : (e.status || 'DNF')) : '', startplatz: e && e.start ? 'P' + e.start : '',
      delta: delta == null ? '' : delta > 0 ? '+' + delta : String(delta), punkte: e && e.punkte ? e.punkte + ' Punkte' : '',
      klassen: (p.klassen || []).join(' · '), woche: wochenText(p.datum, p.bisDatum)
    };
  }
  const PLATZHALTER = '{spruch} {strecke} {layout} {serie} {titel} {runde} {datum} {wochentag} {tag} {zeit} {live} {countdown} {livezeile} {web} {platz} {startplatz} {delta} {punkte} {klassen} {woche}';
  const fuellen = (t, w) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (k in w ? w[k] : m))
    .replace(/(\s*·\s*){2,}/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
  function beispielWoche() {
    const heute = Date.now(), l = [];
    for (let i = 1; i <= 4; i++) l.push({ datum: new Date(heute + i * 1.7 * 86400000).toISOString().slice(0, 10), liveMs: heute + i * 1.7 * 86400000, art: 'Rennen', titel: '', serie: ['Porsche Cup', 'GT3 Cup', 'Langstrecke', 'Formel'][i - 1], track: ['Monza', 'Spa', 'Nordschleife', 'Silverstone'][i - 1], nr: i, spr: true });
    return l;
  }

  // ─── Zeichnen ───
  function verlauf(g, H, art, staerke) {
    const a = Math.max(0, Math.min(1, staerke == null ? 0.85 : staerke));
    const teil = (y0, y1, umgekehrt) => {
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(umgekehrt ? 1 : 0, 'rgba(5,7,10,0)'); gr.addColorStop(umgekehrt ? 0 : 1, `rgba(5,7,10,${a})`);
      g.fillStyle = gr; g.fillRect(0, y0, B, y1 - y0);
    };
    if (art === 'unten' || art === 'beide') teil(H * 0.42, H, false);
    if (art === 'oben' || art === 'beide') teil(0, H * 0.32, true);
  }
  function streifen(g, H, farbe) {
    g.save(); g.fillStyle = farbe;
    for (let i = -8; i < 16; i++) { g.globalAlpha = i % 3 === 0 ? 0.12 : 0.04; g.beginPath(); g.moveTo(i * 140, H); g.lineTo(i * 140 + H * 0.5, 0); g.lineTo(i * 140 + H * 0.5 + 46, 0); g.lineTo(i * 140 + 46, H); g.fill(); }
    g.restore();
  }
  function bildFuellen(g, img, H, hg) {
    const f = Math.max(B / img.naturalWidth, H / img.naturalHeight) * Math.max(1, hg.zoom || 1);
    const w = img.naturalWidth * f, h = img.naturalHeight * f;
    g.drawImage(img, (B - w) * (hg.x ?? 0.5), (H - h) * (hg.y ?? 0.5), w, h);
    return { w, h };
  }
  async function hintergrund(g, v, p, design, umg, H, info) {
    const hg = v.hg || {};
    if (hg.farbe2) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, hg.farbe || '#0a0b0e'); gr.addColorStop(1, hg.farbe2); g.fillStyle = gr; }
    else g.fillStyle = hg.farbe || '#0a0b0e';
    g.fillRect(0, 0, B, H);
    let img = null;
    if (hg.quelle === 'kreids' && window.K888Bilder) {
      try { const blob = await window.K888Bilder.post({ ...p, klassen: p.klassen || [] }, design); img = await createImageBitmap(blob); } catch (e) { img = null; }
      if (img) { g.drawImage(img, 0, 0, B, H); info.w = B; info.h = H; }
      return;
    }
    if (hg.quelle === 'rennen') img = await bild(p.hg);
    else if (hg.quelle === 'ablage') img = await bild(bildUrl({ quelle: 'ablage', datei: hg.ablage }, umg));
    if (img) { const m = bildFuellen(g, img, H, hg); info.w = m.w; info.h = m.h; } else { info.w = B; info.h = H; }
    if (hg.streifen || (!img && hg.quelle === 'rennen')) streifen(g, H, hg.streifenFarbe || design.farbe1 || '#e11324');
    if (hg.dunkel) { g.fillStyle = `rgba(5,7,10,${hg.dunkel})`; g.fillRect(0, 0, B, H); }
    if (hg.verlauf && hg.verlauf !== 'kein') verlauf(g, H, hg.verlauf, hg.verlaufStaerke);
  }

  function zeilenVon(g, el, text) {
    const maxB = el.maxB || 960, breit = t => g.measureText(t).width;
    if ((el.zeilen || 1) < 2 || breit(text) <= maxB) return [text];
    const w = text.split(/\s+/); let best = null;
    for (let i = 1; i < w.length; i++) { const z = [w.slice(0, i).join(' '), w.slice(i).join(' ')], m = Math.max(...z.map(breit)); if (!best || m < best.m) best = { z, m }; }
    return best ? best.z : [text];
  }
  function drehen(g, el, box) {
    if (!el.drehung) return;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    g.translate(cx, cy); g.rotate(el.drehung * Math.PI / 180); g.translate(-cx, -cy);
  }
  function textZeichnen(g, el, text) {
    el._box = null;
    if (!text) return;
    if (el.gross !== false) text = gross(text);
    let size = el.groesse || 90;
    const setz = s => { g.font = font(el.schrift, el.gewicht || 900, s); if ('letterSpacing' in g) g.letterSpacing = Math.round((el.abstand || 0) * s / 100) + 'px'; };
    setz(size);
    let zeilen = zeilenVon(g, el, text);
    const maxB = el.maxB || 960;
    while (size > 14 && Math.max(...zeilen.map(t => g.measureText(t).width)) > maxB) { size -= 2; setz(size); zeilen = zeilenVon(g, el, text); }
    const lh = size * 0.96, cap = size * 0.74;
    const ws = zeilen.map(t => g.measureText(t).width), w = Math.max(...ws), h = lh * (zeilen.length - 1) + cap;
    const pad = el.box && el.box !== 'kein' ? size * 0.22 : 0, sk = el.schraeg ? 0.18 : 0;
    const x = el.ausrichtung === 'mitte' ? el.x - w / 2 : el.ausrichtung === 'rechts' ? el.x - w : el.x;
    const box = { x: x - pad * 1.2, y: el.y - pad, w: w + pad * 2.4 + h * sk, h: h + pad * 2 };
    g.save();
    drehen(g, el, box);
    if (el.box === 'band') {
      g.globalAlpha = el.boxAlpha ?? 1; g.fillStyle = el.boxFarbe || '#e11324';
      g.fillRect(0, el.y - pad, B, h + pad * 2); g.globalAlpha = 1;
    }
    g.translate(x, el.y + h + pad);
    if (sk) g.transform(1, 0, -sk, 1, 0, 0);
    g.translate(0, -(h + pad));
    if (el.box === 'box' || el.box === 'schraeg') {
      g.globalAlpha = el.boxAlpha ?? 1; g.fillStyle = el.boxFarbe || '#e11324';
      const x0 = -pad * 1.2, y0 = -pad, x1 = w + pad * 1.2, y1 = h + pad;
      g.beginPath();
      if (el.box === 'schraeg') { const s = (y1 - y0) * 0.21; g.moveTo(x0, y1); g.lineTo(x0 + s, y0); g.lineTo(x1 + s, y0); g.lineTo(x1, y1); } else g.rect(x0, y0, x1 - x0, y1 - y0);
      g.fill(); g.globalAlpha = 1;
    }
    g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const zx = i => (el.ausrichtung === 'mitte' ? (w - ws[i]) / 2 : el.ausrichtung === 'rechts' ? w - ws[i] : 0);
    if (el.randB > 0) { g.lineWidth = el.randB * 2; g.strokeStyle = el.rand || '#000'; zeilen.forEach((z, i) => g.strokeText(z, zx(i), cap + i * lh)); }
    if (el.schatten) { g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = size * 0.14; g.shadowOffsetY = size * 0.04; }
    if (el.verlauf) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, el.farbe || '#fff'); gr.addColorStop(1, el.farbe2 || '#ffd400'); g.fillStyle = gr; } else g.fillStyle = el.farbe || '#fff';
    zeilen.forEach((z, i) => g.fillText(z, zx(i), cap + i * lh));
    g.restore();
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    el._box = el.box === 'band' ? { x: 0, y: box.y, w: B, h: box.h } : box;
  }
  function bildZeichnen(g, el, img) {
    el._box = null;
    if (!img) return;
    const quelle = el.schwarzWeg ? ohneSchwarz(img) : img;
    const b = el.b || 400, h = b * img.naturalHeight / img.naturalWidth;
    const box = { x: el.x, y: el.y, w: b, h };
    g.save();
    drehen(g, el, box);
    g.globalAlpha = el.alpha ?? 1;
    const f = [];
    if (el.rand) { const r = Math.max(3, Math.round(h * 0.006)); f.push(`drop-shadow(${r}px 0 0 #fff)`, `drop-shadow(-${r}px 0 0 #fff)`, `drop-shadow(0 ${r}px 0 #fff)`, `drop-shadow(0 -${r}px 0 #fff)`); }
    if (el.schatten) f.push(`drop-shadow(0 ${Math.round(h * 0.02)}px ${Math.round(h * 0.03)}px rgba(0,0,0,.7))`);
    if (f.length && 'filter' in g) g.filter = f.join(' ');
    if (el.spiegeln) { g.translate(el.x + b, el.y); g.scale(-1, 1); g.drawImage(quelle, 0, 0, b, h); } else g.drawImage(quelle, el.x, el.y, b, h);
    g.restore();
    el._box = box;
  }
  function formZeichnen(g, el) {
    const box = { x: el.x, y: el.y, w: el.b || 400, h: el.h || 100 };
    g.save();
    drehen(g, el, box);
    g.globalAlpha = el.alpha ?? 1;
    if (el.farbe2) { const gr = g.createLinearGradient(box.x, 0, box.x + box.w, 0); gr.addColorStop(0, el.farbe || '#e11324'); gr.addColorStop(1, el.farbe2); g.fillStyle = gr; } else g.fillStyle = el.farbe || '#e11324';
    g.beginPath();
    if (el.art === 'schraeg') { const s = box.h * 0.35; g.moveTo(box.x, box.y + box.h); g.lineTo(box.x + s, box.y); g.lineTo(box.x + box.w, box.y); g.lineTo(box.x + box.w - s, box.y + box.h); }
    else if (el.art === 'kreis') g.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, Math.PI * 2);
    else if (el.art === 'rahmen') { g.lineWidth = Math.max(2, el.dicke || 8); g.strokeStyle = g.fillStyle; g.strokeRect(box.x, box.y, box.w, box.h); }
    else g.rect(box.x, box.y, box.w, box.h);
    if (el.art !== 'rahmen') g.fill();
    g.restore();
    el._box = box;
  }
  function termineZeichnen(g, el, p) {
    const liste = (p.liste && p.liste.length ? p.liste : beispielWoche()).slice(0, 7);
    const x0 = el.x, y0 = el.y, b = el.b || 920, hGes = el.h || 700, n = Math.max(1, liste.length);
    const rowH = hGes / n, ch = Math.min(rowH - 14, 240), k = el.schrift || 'saira';
    const berlin = ms => (window.K888Bilder ? window.K888Bilder.berlin(ms) : { zeit: '', wt: '' });
    liste.forEach((e, i) => {
      const y = y0 + i * rowH, z = berlin(e.liveMs), [, m, d] = String(e.datum).split('-').map(Number);
      g.globalAlpha = el.panelAlpha ?? 0.92; g.fillStyle = el.panel || '#14161d'; g.fillRect(x0, y, b, ch); g.globalAlpha = 1;
      g.fillStyle = el.akzent || '#e11324'; g.fillRect(x0, y, 10, ch);
      const sp = Math.min(220, b * 0.24), mitte = x0 + 10 + sp / 2;
      g.textAlign = 'center'; g.fillStyle = el.akzent || '#e11324';
      g.font = font(k, 900, Math.min(74, ch * 0.42)); g.fillText(gross(z.wt || ''), mitte, y + ch * 0.5);
      g.fillStyle = el.farbe2 || '#8b929c'; g.font = font(k, 600, Math.min(34, ch * 0.2)); g.fillText(`${d}. ${MONATE[m - 1] || ''}`, mitte, y + ch * 0.5 + Math.min(42, ch * 0.24));
      g.textAlign = 'left';
      const tx = x0 + sp + 30, maxB = b - sp - 50;
      const titel = gross((e.spr && e.track ? e.track + ' · ' : '') + (e.titel || e.serie || e.art || 'Rennen'));
      let gr = Math.min(52, ch * 0.3); g.font = font(k, 800, gr);
      while (gr > 20 && g.measureText(titel).width > maxB) { gr -= 2; g.font = font(k, 800, gr); }
      g.fillStyle = el.farbe || '#f4f5f7'; g.fillText(titel, tx, y + ch * 0.46);
      const zeile2 = `${z.zeit} UHR` + (e.art && e.art !== 'Rennen' ? ' · ' + gross(e.art) : '') + (e.nr ? ' · RUNDE ' + e.nr : '') + (e.reverseGrid ? ' · 2 RENNEN' : '');
      g.font = font(k, 600, Math.min(36, ch * 0.2)); g.fillStyle = el.farbe2 || '#8b929c'; g.fillText(zeile2, tx, y + ch * 0.46 + Math.min(48, ch * 0.28));
    });
    el._box = { x: x0, y: y0, w: b, h: hGes };
  }

  // v: Vorlage · p: Post (aus dem Stand) · design: Stand-Design · umg: { stand() } · opt: { auswahl }
  async function zeichnen(canvas, v, p, design, umg, opt = {}) {
    const H = HOEHE[v.format] || 1350;
    const els = (v.elemente || []).filter(e => e.an !== false);
    await Promise.all(els.filter(e => e.typ === 'text' || e.typ === 'termine').flatMap(e => e.typ === 'termine' ? [schriftLaden(e.schrift, 600), schriftLaden(e.schrift, 800), schriftLaden(e.schrift, 900)] : [schriftLaden(e.schrift, e.gewicht || 900)]));
    const bilder = await Promise.all(els.map(e => (e.typ === 'bild' ? bild(bildUrl(e, umg)) : null)));
    if (canvas.width !== B || canvas.height !== H) { canvas.width = B; canvas.height = H; }
    const g = canvas.getContext('2d');
    const info = {};
    await hintergrund(g, v, p, design, umg, H, info);
    const w = werte(p, design);
    els.forEach((el, i) => {
      if (el.typ === 'text') textZeichnen(g, el, fuellen(el.inhalt, w));
      else if (el.typ === 'bild') bildZeichnen(g, el, bilder[i]);
      else if (el.typ === 'form') formZeichnen(g, el);
      else if (el.typ === 'termine') termineZeichnen(g, el, p);
    });
    const sel = opt.auswahl && els.find(e => e.id === opt.auswahl);
    if (sel && sel._box) { g.save(); g.setLineDash([18, 10]); g.lineWidth = 4; g.strokeStyle = '#ffd400'; g.strokeRect(sel._box.x - 6, sel._box.y - 6, sel._box.w + 12, sel._box.h + 12); g.restore(); }
    return info;
  }
  // Fertiges Post-Bild (JPEG) für den Worker
  async function bildFuer(v, p, design, umg) {
    const c = document.createElement('canvas');
    await zeichnen(c, v, p, design, umg);
    return new Promise((ok, nein) => c.toBlob(b => (b ? ok(b) : nein(new Error('Bild konnte nicht erzeugt werden.'))), 'image/jpeg', 0.9));
  }

  // ─── Neue Ebenen und Vorschläge ───
  const NEU = {
    text: () => ({ typ: 'text', inhalt: 'NEUER TEXT', x: 80, y: 200, groesse: 90, schrift: 'saira', gewicht: 900, farbe: '#ffffff', verlauf: false, farbe2: '#ffd400', rand: '#000000', randB: 0, box: 'kein', boxFarbe: '#e11324', boxAlpha: 1, schraeg: false, schatten: true, maxB: 920, zeilen: 1, gross: true, ausrichtung: 'links', abstand: 0, drehung: 0 }),
    bild: () => ({ typ: 'bild', quelle: 'pose', datei: 'pose_02_zeigt_auf_dich.png', x: 520, y: 700, b: 520, spiegeln: false, rand: true, schatten: true, schwarzWeg: false, alpha: 1, drehung: 0 }),
    form: () => ({ typ: 'form', art: 'schraeg', x: 60, y: 300, b: 600, h: 120, farbe: '#e11324', farbe2: '', alpha: 0.95, drehung: 0, dicke: 8 }),
    termine: () => ({ typ: 'termine', x: 80, y: 540, b: 920, h: 700, schrift: 'saira', panel: '#14161d', panelAlpha: 0.92, akzent: '#e11324', farbe: '#f4f5f7', farbe2: '#8b929c' })
  };
  const mit = (typ, o) => ({ ...NEU[typ](), id: neueId(), an: true, ...o });
  const HG = o => ({ quelle: 'rennen', ablage: '', farbe: '#0a0b0e', farbe2: '', zoom: 1, x: 0.5, y: 0.5, dunkel: 0.1, verlauf: 'unten', verlaufStaerke: 0.9, streifen: false, streifenFarbe: '#e11324', ...o });
  const VORSCHLAEGE = [
    { name: 'Kreids-Design + Ich-Bild', format: 'story', fuer: ['story'], hg: HG({ quelle: 'kreids' }), elemente: [
      mit('bild', { x: 600, y: 1240, b: 470, rand: true })] },
    { name: 'Raceday Groß', format: 'story', fuer: ['story'], hg: HG({ dunkel: 0.15, verlauf: 'beide', streifen: true }), elemente: [
      mit('bild', { quelle: 'logo', x: 240, y: 230, b: 600, rand: false }),
      mit('text', { inhalt: '{countdown} IST RACEDAY', x: 540, y: 560, groesse: 64, ausrichtung: 'mitte', box: 'schraeg', schraeg: true, abstand: 4 }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 690, groesse: 200, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', zeilen: 2, maxB: 980, randB: 0 }),
      mit('text', { inhalt: '{serie} · {runde}', x: 540, y: 1010, groesse: 54, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', ausrichtung: 'mitte', maxB: 980 }),
      mit('form', { art: 'rechteck', x: 0, y: 1110, b: 1080, h: 110, alpha: 0.95 }),
      mit('text', { inhalt: '● {live}', x: 540, y: 1132, groesse: 66, ausrichtung: 'mitte', schatten: false }),
      mit('bild', { x: 560, y: 1290, b: 520 }),
      mit('text', { inhalt: '{spruch}', x: 70, y: 1330, groesse: 74, box: 'schraeg', boxFarbe: '#111111', schraeg: true, zeilen: 2, maxB: 520 })] },
    { name: 'Ankündigung Klassik', format: 'feed', fuer: ['ank'], hg: HG({ verlauf: 'unten', verlaufStaerke: 0.95 }), elemente: [
      mit('bild', { quelle: 'logo', x: 60, y: 50, b: 420, rand: false }),
      mit('text', { inhalt: '{countdown}', x: 80, y: 760, groesse: 60, box: 'schraeg', schraeg: true, abstand: 3 }),
      mit('text', { inhalt: '{strecke}', x: 80, y: 860, groesse: 150, schrift: 'anton', gewicht: 400, maxB: 920 }),
      mit('text', { inhalt: '{serie} · {runde}', x: 82, y: 1030, groesse: 48, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', maxB: 920 }),
      mit('text', { inhalt: '{wochentag} {datum} · {live}', x: 82, y: 1100, groesse: 44, schrift: 'barlow', gewicht: 600, maxB: 920 }),
      mit('text', { inhalt: '{livezeile}', x: 82, y: 1230, groesse: 34, schrift: 'barlow', gewicht: 600, farbe: '#c9d1da', maxB: 920 })] },
    { name: 'Ankündigung Neon', format: 'feed', fuer: ['ank'], hg: HG({ dunkel: 0.35, verlauf: 'beide' }), elemente: [
      mit('form', { art: 'rahmen', x: 40, y: 40, b: 1000, h: 1270, farbe: '#22d3ee', dicke: 6, alpha: 0.9 }),
      mit('text', { inhalt: '{countdown}', x: 540, y: 120, groesse: 56, schrift: 'orbitron', gewicht: 900, farbe: '#22d3ee', ausrichtung: 'mitte', abstand: 10 }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 520, groesse: 140, schrift: 'orbitron', gewicht: 900, ausrichtung: 'mitte', zeilen: 2, maxB: 940 }),
      mit('text', { inhalt: '{spruch}', x: 540, y: 820, groesse: 70, ausrichtung: 'mitte', box: 'box', boxFarbe: '#7c3aed', maxB: 900 }),
      mit('text', { inhalt: '{serie}', x: 540, y: 1060, groesse: 44, schrift: 'orbitron', gewicht: 700, farbe: '#22d3ee', ausrichtung: 'mitte', maxB: 940 }),
      mit('text', { inhalt: '{wochentag} · {live}', x: 540, y: 1130, groesse: 46, schrift: 'barlow', gewicht: 800, ausrichtung: 'mitte', maxB: 940 }),
      mit('bild', { quelle: 'logo', x: 340, y: 1200, b: 400, rand: false })] },
    { name: 'Ergebnis Groß', format: 'feed', fuer: ['erg'], hg: HG({ dunkel: 0.35, verlauf: 'unten' }), elemente: [
      mit('bild', { quelle: 'logo', x: 60, y: 50, b: 380, rand: false }),
      mit('text', { inhalt: '{platz}', x: 80, y: 420, groesse: 420, schrift: 'anton', gewicht: 400, verlauf: true, farbe: '#ffffff', farbe2: '#ffd400', maxB: 900 }),
      mit('text', { inhalt: '{strecke}', x: 84, y: 900, groesse: 110, schrift: 'anton', gewicht: 400, maxB: 920 }),
      mit('text', { inhalt: 'Start {startplatz} · {delta} · {punkte}', x: 86, y: 1040, groesse: 48, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', maxB: 920 }),
      mit('text', { inhalt: '{spruch}', x: 86, y: 1130, groesse: 64, box: 'schraeg', schraeg: true, maxB: 900 })] },
    { name: 'Wochenplan Liste', format: 'story', fuer: ['woche'], hg: HG({ quelle: 'farbe', farbe: '#0a0b0e', streifen: true, verlauf: 'kein', dunkel: 0 }), elemente: [
      mit('text', { inhalt: 'STREAM WEEK', x: 80, y: 220, groesse: 40, gewicht: 600, farbe: '#ff6b75', abstand: 30, schatten: false }),
      mit('text', { inhalt: 'KREIDS888', x: 78, y: 280, groesse: 150, maxB: 920 }),
      mit('text', { inhalt: '{woche}', x: 82, y: 440, groesse: 40, gewicht: 600, farbe: '#8b929c', schatten: false }),
      mit('termine', { y: 520, h: 740 }),
      mit('form', { art: 'rechteck', x: 0, y: 1290, b: 1080, h: 4, alpha: 1 }),
      mit('text', { inhalt: '{livezeile}', x: 80, y: 1600, groesse: 46, gewicht: 800, maxB: 520 }),
      mit('text', { inhalt: '{web}', x: 80, y: 1670, groesse: 28, gewicht: 600, farbe: '#c9d1da', abstand: 10, schatten: false }),
      mit('bild', { x: 600, y: 1240, b: 470 })] },
    { name: 'Wochenplan Racing', format: 'story', fuer: ['woche'], hg: HG({ quelle: 'farbe', farbe: '#071224', farbe2: '#0a0b0e', streifen: true, streifenFarbe: '#2563eb', verlauf: 'kein', dunkel: 0 }), elemente: [
      mit('text', { inhalt: 'DIESE WOCHE LIVE', x: 540, y: 230, groesse: 92, schrift: 'racing', gewicht: 400, ausrichtung: 'mitte', maxB: 980 }),
      mit('text', { inhalt: '{woche}', x: 540, y: 350, groesse: 44, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', ausrichtung: 'mitte' }),
      mit('termine', { y: 450, h: 820, akzent: '#2563eb', schrift: 'barlow' }),
      mit('bild', { quelle: 'logo', x: 80, y: 1360, b: 460, rand: false }),
      mit('text', { inhalt: '{livezeile}', x: 80, y: 1560, groesse: 44, schrift: 'barlow', gewicht: 800, maxB: 520 }),
      mit('bild', { x: 590, y: 1260, b: 480, spiegeln: true })] }
  ];

  // ─── Editor ───
  // umg: { stand(), igApi(), meldung(), gespeichert(), ablageHoch(file), cfgSpeichern(vorlagen) }
  let E = null;
  function editor(box, umg) {
    if (!E) E = { box: null, umg, v: null, id: '', sel: '', dirty: false, ziehen: null, info: {}, postId: '' };
    if (E.box !== box) {   // Reiter neu gezeichnet: offene Vorlage bleibt erhalten
      E.box = box;
      box.addEventListener('click', klick);
      box.addEventListener('input', eingabe);
      box.addEventListener('change', eingabe);
    }
    E.umg = umg;
    const liste = umg.stand().vorlagen || [];
    if (E.id && !E.dirty) { const v = liste.find(x => x.id === E.id); E.v = v ? kopie(v) : null; if (!v) E.id = ''; }
    aufbauen();
  }
  const vorlagen = () => E.umg.stand().vorlagen || [];
  const elAkt = () => (E.v ? E.v.elemente.find(e => e.id === E.sel) || null : null);
  // Post für die Vorschau: passend zur Art der Vorlage
  function vorschauPost() {
    const posts = E.umg.stand().posts || [], arten = (E.v && E.v.fuer && E.v.fuer.length ? E.v.fuer : FUER[E.v ? E.v.format : 'feed'].map(x => x[0]));
    const passt = posts.filter(p => arten.includes(p.typ));
    let p = passt.find(x => x.id === E.postId) || passt[0];
    if (!p) {
      const r = posts.find(x => x.typ !== 'woche') || {};
      const typ = arten[0] || 'ank';
      p = { ...r, id: 'beispiel', typ, tage: 2, track: r.track || 'Monza', serie: r.serie || 'Porsche Cup', nr: r.nr || 4, startMs: r.startMs || Date.now() + 2 * 86400000, liveMs: r.liveMs || Date.now() + 2 * 86400000,
        ergebnis: typ === 'erg' ? { start: 9, ziel: 3, punkte: 22 } : null, datum: new Date().toISOString().slice(0, 10), bisDatum: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10) };
    }
    return p;
  }
  function wechselPanel() {
    const cfg = E.umg.stand().cfg.vorlagen || {};
    const zeile = ([typ, name]) => {
      const c = cfg[typ] || {}, eigene = vorlagen().filter(v => v.format === formatVon(typ) && (v.fuer || []).includes(typ) && v.an !== false);
      return `<div class="kv-wz">
        <b>${name}</b>
        <select data-w="modus" data-typ="${typ}">${[['reihe', 'Der Reihe nach'], ['zufall', 'Zufällig'], ['fest', 'Immer dieselbe']].map(([k, n]) => `<option value="${k}" ${(c.modus || 'reihe') === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        ${(c.modus || 'reihe') === 'fest' ? `<select data-w="fest" data-typ="${typ}"><option value="kreids">Kreids-Design</option>${eigene.map(v => `<option value="${esc(v.id)}" ${c.fest === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : ''}
        <label class="chk"><input type="checkbox" data-w="kreids" data-typ="${typ}" ${c.kreids !== false ? 'checked' : ''}> Kreids-Design mit dabei</label>
        <span class="ki-dim">${eigene.length} eigene</span>
      </div>`;
    };
    return `<div class="ki-panel"><h3>🔁 Wechsel pro Art</h3>${ARTEN.map(zeile).join('')}
      <div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-v="verteilen"><span>🔀 Offene Posts neu verteilen</span></button></div>
      <div class="ki-dim">Neue Posts bekommen ihre Vorlage beim Öffnen. Auf jeder Post-Karte kannst du sie auch selbst wählen.</div></div>`;
  }
  function listePanel() {
    const l = vorlagen();
    return `<div class="ki-panel"><h3>🧩 Deine Vorlagen (${l.length})</h3>
      <div class="kv-liste">${l.map(v => `<button type="button" class="kv-karte${v.id === E.id ? ' an' : ''}${v.an === false ? ' aus' : ''}" data-v="oeffnen" data-id="${esc(v.id)}">
        <canvas data-mini="${esc(v.id)}" width="108" height="${v.format === 'story' ? 192 : 135}"></canvas>
        <span>${esc(v.name)}</span><small>${esc((v.fuer || []).map(f => (ARTEN.find(a => a[0] === f) || [])[1] || f).join(', ') || 'noch für nichts')}${v.an === false ? ' · aus' : ''}</small></button>`).join('') || '<p class="hint">Noch keine eigene Vorlage – unten einen Vorschlag nehmen oder leer anfangen.</p>'}</div>
      <div class="ki-reihe" style="margin-top:12px">
        <div class="ki-fg" style="flex:1 1 260px"><label>Neue Vorlage</label><select data-v="neuwahl">
          <option value="leer-feed">Leer · Feed 4:5 (Ankündigung, Ergebnis)</option><option value="leer-story">Leer · Story 9:16 (Raceday, Wochenplan)</option>
          ${VORSCHLAEGE.map((v, i) => `<option value="v${i}">Vorschlag: ${esc(v.name)}</option>`).join('')}</select></div>
        <button class="btn btn-red ki-k" data-v="neu"><span>+ Anlegen</span></button>
      </div></div>`;
  }
  function aufbauen() {
    const v = E.v;
    E.box.innerHTML = `<div class="kv">
      <div class="ki-grid">${listePanel()}${wechselPanel()}</div>
      ${v ? `<div class="kv-haupt">
        <div class="kv-links">
          <div class="ki-reihe">
            <div class="ki-fg" style="flex:1 1 240px"><label>Name</label><input type="text" data-f="v.name" maxlength="40" value="${esc(v.name)}"></div>
            <div class="ki-fg" style="flex:1 1 240px"><label>Vorschau mit</label><select data-v="post">${(() => { const p = vorschauPost(); const arten = v.fuer && v.fuer.length ? v.fuer : FUER[v.format].map(x => x[0]); return (E.umg.stand().posts || []).filter(x => arten.includes(x.typ)).map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc([x.datum, x.track || x.titel || 'Wochenplan', (ARTEN.find(a => a[0] === x.typ) || [])[1]].filter(Boolean).join(' · '))}</option>`).join('') || '<option>Beispiel-Daten</option>'; })()}</select></div>
          </div>
          <canvas class="kv-cv ${v.format}" width="${B}" height="${HOEHE[v.format]}"></canvas>
          <div class="ki-dim">Klicken = auswählen · Ziehen = verschieben · Mausrad = Größe · freie Fläche ziehen = Hintergrund verschieben</div>
          <div class="ki-knoepfe">
            <button class="btn btn-red ki-k" data-v="speichern"><span>💾 Speichern</span></button>
            <button class="btn btn-ghost ki-k" data-v="kopie"><span>⧉ Kopie</span></button>
            <button class="btn btn-ghost ki-k" data-v="verwerfen"><span>↺ Verwerfen</span></button>
            <button class="btn btn-ghost ki-k" data-v="loeschen"><span>🗑 Löschen</span></button>
            <span class="kt-dirty">${E.dirty ? '● Noch nicht gespeichert' : ''}</span>
          </div>
        </div>
        <div class="kv-rechts">
          <div class="ki-panel"><h3>Vorlage · ${v.format === 'story' ? 'Story 9:16' : 'Feed 4:5'}</h3>
            <div class="ki-fg"><label>Gilt für</label><div class="ki-reihe">${FUER[v.format].map(([k, n]) => `<label class="chk"><input type="checkbox" data-fuer="${k}" ${(v.fuer || []).includes(k) ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>
            <div class="ki-fg"><label>Nur für diese Serien (keine = alle)</label><div class="ki-reihe">${serien().map(s => `<label class="chk"><input type="checkbox" data-serie="${esc(s)}" ${(v.serien || []).includes(s) ? 'checked' : ''}> ${esc(s)}</label>`).join('') || '<span class="ki-dim">Keine Serien in der Planung</span>'}</div></div>
            <label class="chk"><input type="checkbox" data-f="v.an" ${v.an !== false ? 'checked' : ''}> Im Wechsel dabei</label>
          </div>
          <div class="ki-panel"><h3>Ebenen</h3>
            <div class="kt-ebenen">${[...v.elemente].reverse().map(e => `<div class="kt-ebene${e.id === E.sel ? ' an' : ''}" data-v="waehle" data-id="${esc(e.id)}">
              <input type="checkbox" data-sichtbar="${esc(e.id)}" ${e.an !== false ? 'checked' : ''} title="ein/aus"><span>${esc(ebenenName(e))}</span>
              <button type="button" data-v="hoch" data-id="${esc(e.id)}" title="nach vorne">▲</button><button type="button" data-v="runter" data-id="${esc(e.id)}" title="nach hinten">▼</button></div>`).join('')}</div>
            <div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-v="plus" data-typ="text"><span>+ Text</span></button><button class="btn btn-ghost ki-k" data-v="plus" data-typ="bild"><span>+ Bild</span></button><button class="btn btn-ghost ki-k" data-v="plus" data-typ="form"><span>+ Form</span></button>${v.format === 'story' ? '<button class="btn btn-ghost ki-k" data-v="plus" data-typ="termine"><span>+ Termine</span></button>' : ''}</div>
          </div>
          <div class="ki-panel"><h3>${esc(elAkt() ? ebenenName(elAkt()) : 'Eigenschaften')}</h3>${eigenschaften(elAkt())}</div>
          <div class="ki-panel"><h3>Hintergrund</h3>${hgPanel(v.hg)}</div>
          <div class="ki-panel"><h3>🖼 Eigene Bilder</h3>${ablagePanel()}</div>
        </div>
      </div>` : '<p class="hint">Vorlage oben anklicken oder neu anlegen.</p>'}
    </div>`;
    const cv = E.box.querySelector('.kv-cv');
    if (cv) {
      cv.addEventListener('pointerdown', runter); cv.addEventListener('pointermove', bewegen);
      cv.addEventListener('pointerup', hoch); cv.addEventListener('pointercancel', hoch);
      cv.addEventListener('wheel', rad, { passive: false });
    }
    neuZeichnen();
    minis();
  }
  function serien() {
    const s = new Set();
    for (const p of E.umg.stand().posts || []) if (p.serie) s.add(p.serie);
    for (const v of vorlagen()) for (const x of v.serien || []) s.add(x);
    if (E.v) for (const x of E.v.serien || []) s.add(x);
    return [...s].sort();
  }
  function ebenenName(e) {
    if (e.typ === 'text') return 'Text: ' + String(e.inhalt || '').slice(0, 26);
    if (e.typ === 'bild') return 'Bild: ' + ({ pose: 'Ich-Bild', team: 'Team-Bild', logo: 'Logo', ablage: 'Eigenes Bild' }[e.quelle] || '');
    if (e.typ === 'form') return 'Form: ' + ({ rechteck: 'Rechteck', schraeg: 'Schräg', kreis: 'Kreis', rahmen: 'Rahmen' }[e.art] || '');
    return 'Termine der Woche';
  }
  const regler = (f, name, wert, min, max, schritt) => `<div class="ki-fg"><label>${esc(name)}</label><input type="range" data-f="${f}" min="${min}" max="${max}" step="${schritt}" value="${esc(wert ?? min)}"></div>`;
  function eigenschaften(el) {
    if (!el) return '<div class="ki-dim">Im Bild etwas anklicken.</div>';
    const fa = (f, name) => `<div class="ki-fg"><label>${esc(name)}</label><input type="color" data-f="${f}" value="${esc(el[f] || '#ffffff')}"></div>`;
    const ch = (f, name) => `<label class="chk"><input type="checkbox" data-f="${f}" ${el[f] ? 'checked' : ''}> ${esc(name)}</label>`;
    const sel = (f, name, liste) => `<div class="ki-fg"><label>${esc(name)}</label><select data-f="${f}">${liste.map(([w, n]) => `<option value="${esc(w)}" ${String(el[f]) === String(w) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    const schriftWahl = (f) => `<div class="ki-fg"><label>Schrift</label><select data-f="${f}">${Object.entries(SCHRIFTEN).map(([k, s]) => `<option value="${k}" ${el[f] === k ? 'selected' : ''} style="font-family:'K888V ${esc(s[0])}'">${esc(s[0])}</option>`).join('')}</select></div>`;
    const loeschen = `<div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-v="dup"><span>⧉ Doppeln</span></button><button class="btn btn-ghost ki-k" data-v="weg"><span>✕ Ebene löschen</span></button></div>`;
    if (el.typ === 'text') return `
      <div class="ki-fg"><label>Text</label><input type="text" data-f="inhalt" value="${esc(el.inhalt)}"></div>
      <div class="kv-plh">${PLATZHALTER.split(' ').map(x => `<button type="button" data-v="plh" data-wert="${x}">${x}</button>`).join('')}</div>
      <div class="ki-reihe">${schriftWahl('schrift')}${sel('gewicht', 'Dicke', schriftVon(el.schrift)[2].map(w => [w, { 400: 'Normal', 500: 'Mittel', 600: 'Halbfett', 700: 'Fett', 800: 'Extrafett', 900: 'Black' }[w] || w]))}</div>
      ${regler('groesse', 'Größe', el.groesse, 14, 480, 1)}
      ${regler('maxB', 'Max. Breite', el.maxB, 120, 1080, 10)}
      ${regler('abstand', 'Buchstaben-Abstand', el.abstand, -5, 40, 1)}
      ${regler('drehung', 'Drehen', el.drehung, -45, 45, 1)}
      <div class="ki-reihe">${sel('ausrichtung', 'Ausrichtung', [['links', 'Links'], ['mitte', 'Mitte'], ['rechts', 'Rechts']])}${sel('zeilen', 'Zeilen', [[1, '1'], [2, 'bis 2']])}${fa('farbe', 'Farbe')}</div>
      <div class="ki-reihe">${ch('verlauf', 'Farbverlauf')}${el.verlauf ? fa('farbe2', 'bis Farbe') : ''}</div>
      <div class="ki-reihe">${fa('rand', 'Rand')}${regler('randB', 'Rand-Dicke', el.randB, 0, 30, 1)}</div>
      <div class="ki-reihe">${sel('box', 'Hintergrund', [['kein', 'Kein'], ['box', 'Box'], ['schraeg', 'Schräg'], ['band', 'Band (ganze Breite)']])}${el.box !== 'kein' ? fa('boxFarbe', 'Farbe') : ''}</div>
      ${el.box !== 'kein' ? regler('boxAlpha', 'Deckkraft', el.boxAlpha ?? 1, 0.1, 1, 0.05) : ''}
      <div class="ki-reihe">${ch('schraeg', 'Schräg')}${ch('schatten', 'Schatten')}${ch('gross', 'GROSS')}</div>${loeschen}`;
    if (el.typ === 'bild') {
      const gal = (liste, url) => `<div class="kt-gal">${liste.map(([d, n]) => `<button type="button" data-v="bild" data-wert="${esc(d)}" class="${el.datei === d ? 'an' : ''}" title="${esc(n)}"><img src="${esc(url(d))}" alt="${esc(n)}" loading="lazy"></button>`).join('')}</div>`;
      const ab = E.umg.stand().ablage || [];
      return `${sel('quelle', 'Bild', [['pose', 'Ich-Bild'], ['team', 'Team-Bild'], ['logo', 'Logo'], ['ablage', 'Eigenes Bild (Ablage)']])}
        ${el.quelle === 'pose' ? gal(POSEN(), d => site() + 'overlays/personen/' + d) : ''}
        ${el.quelle === 'team' ? gal(TEAM(), d => site() + 'team/bilder/' + d) : ''}
        ${el.quelle === 'ablage' ? (ab.length ? gal(ab.map(a => [a.id, a.name]), id => (ab.find(a => a.id === id) || {}).url) : '<div class="ki-dim">Noch keine eigenen Bilder – unten bei „🖼 Eigene Bilder“ hochladen.</div>') : ''}
        ${regler('b', 'Größe', el.b, 40, 2200, 5)}
        ${regler('alpha', 'Deckkraft', el.alpha ?? 1, 0.1, 1, 0.05)}
        ${regler('drehung', 'Drehen', el.drehung, -45, 45, 1)}
        <div class="ki-reihe">${ch('spiegeln', 'Spiegeln')}${ch('rand', 'Weißer Rand')}${ch('schatten', 'Schatten')}${ch('schwarzWeg', 'Schwarz ausblenden')}</div>${loeschen}`;
    }
    if (el.typ === 'form') return `${sel('art', 'Form', [['rechteck', 'Rechteck'], ['schraeg', 'Schräg'], ['kreis', 'Kreis/Oval'], ['rahmen', 'Rahmen']])}
      <div class="ki-reihe">${fa('farbe', 'Farbe')}<label class="chk"><input type="checkbox" data-v="formverlauf" ${el.farbe2 ? 'checked' : ''}> Verlauf</label>${el.farbe2 ? fa('farbe2', 'bis Farbe') : ''}</div>
      ${regler('b', 'Breite', el.b, 4, 1080, 2)}${regler('h', 'Höhe', el.h, 2, 1920, 2)}
      ${el.art === 'rahmen' ? regler('dicke', 'Dicke', el.dicke, 2, 40, 1) : ''}
      ${regler('alpha', 'Deckkraft', el.alpha ?? 1, 0.05, 1, 0.05)}${regler('drehung', 'Drehen', el.drehung, -45, 45, 1)}${loeschen}`;
    if (el.typ === 'termine') return `${schriftWahl('schrift')}
      <div class="ki-reihe">${fa('akzent', 'Akzent')}${fa('panel', 'Kasten')}${fa('farbe', 'Text')}${fa('farbe2', 'Text 2')}</div>
      ${regler('panelAlpha', 'Kasten-Deckkraft', el.panelAlpha ?? 0.92, 0, 1, 0.02)}
      ${regler('b', 'Breite', el.b, 400, 1080, 5)}${regler('h', 'Höhe', el.h, 200, 1500, 5)}
      <div class="ki-dim">Die Termine kommen von selbst aus dem Streamkalender (höchstens 7).</div>${loeschen}`;
    return '';
  }
  function hgPanel(hg) {
    const ab = E.umg.stand().ablage || [];
    const kreids = hg.quelle === 'kreids';
    return `<div class="ki-fg"><label>Hintergrund</label><select data-f="hg.quelle">${[['rennen', 'Bild des Rennens (KI/Kalender)'], ['ablage', 'Eigenes Bild (Ablage)'], ['farbe', 'Nur Farbe'], ['kreids', 'Fertiges Kreids-Design als Grundlage']].map(([k, n]) => `<option value="${k}" ${hg.quelle === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${hg.quelle === 'ablage' ? (ab.length ? `<div class="kt-gal">${ab.map(a => `<button type="button" data-v="hgbild" data-wert="${esc(a.id)}" class="${hg.ablage === a.id ? 'an' : ''}" title="${esc(a.name)}"><img src="${esc(a.url)}" alt="" loading="lazy"></button>`).join('')}</div>` : '<div class="ki-dim">Erst unten ein Bild hochladen.</div>') : ''}
      ${kreids ? '<div class="ki-dim">Das fertige Design (wie bisher) liegt ganz unten – deine Ebenen kommen oben drauf.</div>' : `
      <div class="ki-reihe"><div class="ki-fg"><label>Farbe</label><input type="color" data-f="hg.farbe" value="${esc(hg.farbe || '#0a0b0e')}"></div>
        <label class="chk"><input type="checkbox" data-v="hgverlauf" ${hg.farbe2 ? 'checked' : ''}> Farbverlauf</label>${hg.farbe2 ? `<div class="ki-fg"><label>bis</label><input type="color" data-f="hg.farbe2" value="${esc(hg.farbe2)}"></div>` : ''}</div>
      ${hg.quelle !== 'farbe' ? regler('hg.zoom', 'Zoom', hg.zoom, 1, 2.5, 0.01) : ''}
      ${regler('hg.dunkel', 'Abdunkeln', hg.dunkel, 0, 0.9, 0.01)}
      <div class="ki-reihe"><div class="ki-fg"><label>Dunkler Verlauf</label><select data-f="hg.verlauf">${[['kein', 'Kein'], ['unten', 'Unten'], ['oben', 'Oben'], ['beide', 'Oben + unten']].map(([k, n]) => `<option value="${k}" ${(hg.verlauf || 'kein') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
      ${hg.verlauf && hg.verlauf !== 'kein' ? regler('hg.verlaufStaerke', 'Stärke', hg.verlaufStaerke ?? 0.85, 0.2, 1, 0.01) : ''}
      <div class="ki-reihe"><label class="chk"><input type="checkbox" data-f="hg.streifen" ${hg.streifen ? 'checked' : ''}> Renn-Streifen</label>${hg.streifen ? `<div class="ki-fg"><label>Streifen-Farbe</label><input type="color" data-f="hg.streifenFarbe" value="${esc(hg.streifenFarbe || '#e11324')}"></div>` : ''}</div>`}`;
  }
  function ablagePanel() {
    const ab = E.umg.stand().ablage || [];
    return `<div class="kv-ablage">${ab.map(a => `<div class="kv-ab"><img src="${esc(a.url)}" alt="" loading="lazy"><span title="${esc(a.name)}">${esc(a.name)}</span>
        <button type="button" data-v="abnimm" data-id="${esc(a.id)}" title="Als Bild-Ebene einfügen">＋</button><button type="button" data-v="abweg" data-id="${esc(a.id)}" title="Löschen">✕</button></div>`).join('')}</div>
      <label class="btn btn-ghost ki-k ki-datei"><span>📤 Bild vom PC hochladen</span><input type="file" accept="image/*" data-v="abhoch"></label>
      <div class="ki-dim">PNG mit durchsichtigem Hintergrund (z. B. Fahrzeug) bleibt durchsichtig. Austauschen: neues Bild hochladen und in der Ebene wählen.</div>`;
  }

  let zeichnetGerade = false, nochmal = false;
  async function neuZeichnen() {
    if (!E || !E.v) return;
    if (zeichnetGerade) { nochmal = true; return; }
    zeichnetGerade = true;
    try {
      const cv = E.box.querySelector('.kv-cv');
      if (cv) E.info = await zeichnen(cv, E.v, vorschauPost(), E.umg.stand().design, E.umg, { auswahl: E.sel });
    } finally { zeichnetGerade = false; if (nochmal) { nochmal = false; neuZeichnen(); } }
  }
  async function minis() {
    for (const c of E.box.querySelectorAll('canvas[data-mini]')) {
      const v = vorlagen().find(x => x.id === c.dataset.mini); if (!v) continue;
      const gross = document.createElement('canvas');
      try {
        await zeichnen(gross, kopie(v), (() => { const alt = E.v; E.v = v; const p = vorschauPost(); E.v = alt; return p; })(), E.umg.stand().design, E.umg);
        c.getContext('2d').drawImage(gross, 0, 0, c.width, c.height);
      } catch (e) { /* egal */ }
    }
  }
  function geaendert(aufbau) {
    if (!E.dirty) { E.dirty = true; const d = E.box.querySelector('.kt-dirty'); if (d) d.textContent = '● Noch nicht gespeichert'; }
    if (aufbau) aufbauen(); else neuZeichnen();
  }

  // ─── Maus ───
  function punkt(ev) { const cv = ev.currentTarget, rc = cv.getBoundingClientRect(); return { x: (ev.clientX - rc.left) * B / rc.width, y: (ev.clientY - rc.top) * HOEHE[E.v.format] / rc.height }; }
  function treffer(p) {
    for (let i = E.v.elemente.length - 1; i >= 0; i--) { const e = E.v.elemente[i], b = e._box; if (e.an !== false && b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return e; }
    return null;
  }
  function runter(ev) {
    const p = punkt(ev), e = treffer(p);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const vorher = E.sel;
    if (e) E.sel = e.id;
    E.ziehen = { p, e, x0: e ? e.x : E.v.hg.x, y0: e ? e.y : E.v.hg.y, bewegt: false };
    if (e && e.id !== vorher) setTimeout(() => { if (!E.ziehen) aufbauen(); }, 0); else neuZeichnen();
  }
  function bewegen(ev) {
    if (!E.ziehen) return;
    const p = punkt(ev), z = E.ziehen, dx = p.x - z.p.x, dy = p.y - z.p.y;
    if (!z.bewegt && Math.hypot(dx, dy) < 4) return;
    z.bewegt = true;
    if (z.e) { z.e.x = Math.round(z.x0 + dx); z.e.y = Math.round(z.y0 + dy); }
    else if (E.v.hg.quelle === 'rennen' || E.v.hg.quelle === 'ablage') {
      const H = HOEHE[E.v.format], w = E.info.w || B, h = E.info.h || H;
      if (w > B) E.v.hg.x = Math.min(1, Math.max(0, z.x0 - dx / (w - B)));
      if (h > H) E.v.hg.y = Math.min(1, Math.max(0, z.y0 - dy / (h - H)));
    }
    geaendert(false);
  }
  function hoch() { const z = E && E.ziehen; if (!z) return; E.ziehen = null; if (z.e && z.bewegt) aufbauen(); }
  function rad(ev) {
    const e = elAkt(); if (!e) return;
    ev.preventDefault();
    const f = ev.deltaY < 0 ? 1.05 : 1 / 1.05;
    if (e.typ === 'text') e.groesse = Math.round(Math.min(480, Math.max(14, e.groesse * f)));
    else if (e.typ === 'bild') e.b = Math.round(Math.min(2200, Math.max(40, e.b * f)));
    else if (e.typ === 'form') { e.b = Math.round(Math.max(4, e.b * f)); e.h = Math.round(Math.max(2, e.h * f)); }
    else if (e.typ === 'termine') e.h = Math.round(Math.min(1500, Math.max(200, e.h * f)));
    geaendert(false);
  }

  // ─── Eingaben ───
  function eingabe(ev) {
    const t = ev.target;
    const typ = t.dataset.typ;
    if (t.dataset.w && ev.type === 'change') return wechselAendern(t.dataset.w, typ, t.type === 'checkbox' ? t.checked : t.value);
    if (!E.v) return;
    if (t.dataset.v === 'post' && ev.type === 'change') { E.postId = t.value; return neuZeichnen(); }
    if (t.dataset.v === 'abhoch' && ev.type === 'change') return hochladen(t);
    if (t.dataset.sichtbar !== undefined && ev.type === 'change') { const e = E.v.elemente.find(x => x.id === t.dataset.sichtbar); if (e) { e.an = t.checked; geaendert(true); } return; }
    if (t.dataset.fuer && ev.type === 'change') { const s = new Set(E.v.fuer || []); t.checked ? s.add(t.dataset.fuer) : s.delete(t.dataset.fuer); E.v.fuer = [...s]; return geaendert(true); }
    if (t.dataset.serie !== undefined && ev.type === 'change') { const s = new Set(E.v.serien || []); t.checked ? s.add(t.dataset.serie) : s.delete(t.dataset.serie); E.v.serien = [...s]; return geaendert(false); }
    const f = t.dataset.f; if (!f) return;
    let wert = t.type === 'checkbox' ? t.checked : t.type === 'range' ? parseFloat(t.value) : t.value;
    if (f === 'v.name') { E.v.name = wert; return geaendert(false); }
    if (f === 'v.an') { E.v.an = wert; return geaendert(false); }
    if (f.startsWith('hg.')) {
      E.v.hg[f.slice(3)] = wert;
      return geaendert(ev.type === 'change' && ['hg.quelle', 'hg.verlauf', 'hg.streifen'].includes(f));
    }
    const e = elAkt(); if (!e) return;
    if (f === 'gewicht' || f === 'zeilen') wert = parseInt(wert, 10);
    e[f] = wert;
    if (f === 'schrift') e.gewicht = gewichtVon(wert, e.gewicht || 900);
    geaendert(ev.type === 'change' && ['verlauf', 'box', 'quelle', 'art', 'schrift'].includes(f));
  }
  async function wechselAendern(was, typ, wert) {
    const cfg = E.umg.stand().cfg, v = { ...(cfg.vorlagen || {}) };
    v[typ] = { modus: 'reihe', kreids: true, ...(v[typ] || {}), [was]: wert };
    try { await E.umg.cfgSpeichern(v); E.umg.meldung('Gespeichert.'); aufbauen(); } catch (e) { E.umg.meldung(e.message, 1); }
  }
  async function hochladen(input) {
    const f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    try { const a = await E.umg.ablageHoch(f); E.umg.meldung('Bild gespeichert.'); const e = elAkt(); if (e && e.typ === 'bild' && e.quelle === 'ablage') { e.datei = a.id; geaendert(true); } else aufbauen(); }
    catch (e) { E.umg.meldung(e.message, 1); }
  }
  async function klick(ev) {
    if (ev.target.matches && ev.target.matches('input[data-sichtbar]')) return;
    const b = ev.target.closest('[data-v]'); if (!b || !E.box.contains(b) || b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type !== 'checkbox')) return;
    const v = b.dataset.v, id = b.dataset.id;
    const knopf = async fn => { const sp = b.querySelector('span'), alt = sp ? sp.textContent : ''; b.disabled = true; if (sp) sp.textContent = '⏳ …'; try { await fn(); } catch (e) { E.umg.meldung(e.message, 1); } finally { if (b.isConnected) { b.disabled = false; if (sp) sp.textContent = alt; } } };
    if (v === 'oeffnen') {
      if (E.dirty && E.id !== id && !confirm('Änderungen an der offenen Vorlage verwerfen?')) return;
      const x = vorlagen().find(y => y.id === id); E.v = x ? kopie(x) : null; E.id = id; E.sel = ''; E.dirty = false; E.postId = ''; return aufbauen();
    }
    if (v === 'neu') {
      if (E.dirty && !confirm('Änderungen an der offenen Vorlage verwerfen?')) return;
      const w = E.box.querySelector('[data-v="neuwahl"]').value;
      let n;
      if (w === 'leer-feed' || w === 'leer-story') { const format = w.slice(5); n = { name: 'Neue Vorlage', format, fuer: [], hg: HG({}), elemente: [mit('text', { inhalt: '{strecke}', x: 80, y: format === 'story' ? 700 : 760, groesse: 140, schrift: 'anton', gewicht: 400 })] }; }
      else { const vs = VORSCHLAEGE[+w.slice(1)]; n = kopie(vs); n.elemente.forEach(e => { e.id = neueId(); }); }
      n.an = true; n.serien = [];
      E.v = n; E.id = ''; E.sel = ''; E.postId = ''; E.dirty = true;
      return aufbauen();
    }
    if (!E.v && v !== 'verteilen' && v !== 'abweg' && v !== 'abnimm') return;
    if (v === 'waehle') { E.sel = id; return aufbauen(); }
    if (v === 'hoch' || v === 'runter') {
      const l = E.v.elemente, i = l.findIndex(e => e.id === id), j = v === 'hoch' ? i + 1 : i - 1;
      if (i < 0 || j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]]; return geaendert(true);
    }
    if (v === 'plus') { const n = mit(b.dataset.typ, {}); E.v.elemente.push(n); E.sel = n.id; return geaendert(true); }
    if (v === 'dup') { const e = elAkt(); if (!e) return; const n = { ...kopie(e), id: neueId(), x: e.x + 30, y: e.y + 30 }; E.v.elemente.push(n); E.sel = n.id; return geaendert(true); }
    if (v === 'weg') { E.v.elemente = E.v.elemente.filter(e => e.id !== E.sel); E.sel = ''; return geaendert(true); }
    if (v === 'plh') { const e = elAkt(); if (!e) return; e.inhalt = (e.inhalt === 'NEUER TEXT' ? '' : (e.inhalt || '') + (e.inhalt ? ' ' : '')) + b.dataset.wert; return geaendert(true); }
    if (v === 'bild') { const e = elAkt(); if (!e) return; e.datei = b.dataset.wert; if (e.quelle === 'team') e.schwarzWeg = !!(TEAM().find(x => x[0] === e.datei) || [])[2]; return geaendert(true); }
    if (v === 'hgbild') { E.v.hg.ablage = b.dataset.wert; return geaendert(true); }
    if (v === 'hgverlauf') { E.v.hg.farbe2 = b.checked ? '#1a1d24' : ''; return geaendert(true); }
    if (v === 'formverlauf') { const e = elAkt(); if (!e) return; e.farbe2 = b.checked ? '#ffd400' : ''; return geaendert(true); }
    if (v === 'abnimm') {
      if (!E.v) return;
      const a = (E.umg.stand().ablage || []).find(x => x.id === id); if (!a) return;
      const n = mit('bild', { quelle: 'ablage', datei: a.id, x: 140, y: HOEHE[E.v.format] * 0.45, b: 800, rand: false });
      E.v.elemente.push(n); E.sel = n.id; return geaendert(true);
    }
    if (v === 'abweg') return knopf(async () => {
      if (!confirm('Dieses Bild aus der Ablage löschen? Vorlagen, die es nutzen, zeigen es dann nicht mehr.')) return;
      await E.umg.igApi('POST', `/api/ablage/${encodeURIComponent(id)}/weg`, {});
      E.umg.stand().ablage = (E.umg.stand().ablage || []).filter(x => x.id !== id); aufbauen();
    });
    if (v === 'verteilen') return knopf(async () => {
      if (!confirm('Alle offenen Posts bekommen neu ihre Vorlage nach dem eingestellten Wechsel. Selbst gewählte Vorlagen werden auch neu verteilt.')) return;
      await E.umg.igApi('POST', '/api/vorlagen/verteilen', {}); E.umg.meldung('Neu verteilt – die Bilder werden neu gezeichnet.'); await E.umg.gespeichert();
    });
    if (v === 'speichern') return knopf(async () => {
      if (!(E.v.fuer || []).length) E.umg.meldung('Hinweis: Bei „Gilt für“ ist nichts angehakt – die Vorlage kommt so noch nicht dran.', 1);
      const d = await E.umg.igApi('POST', '/api/vorlage', { vorlage: { ...kopie(E.v), id: E.id || undefined } });
      E.id = d.id; E.v.id = d.id; E.v.v = d.v; E.dirty = false;
      const l = vorlagen(), i = l.findIndex(x => x.id === d.id);
      if (i >= 0) l[i] = kopie(E.v); else l.push(kopie(E.v));
      E.umg.meldung('Vorlage gespeichert.'); await E.umg.gespeichert();
    });
    if (v === 'kopie') { const n = kopie(E.v); n.name = (n.name || 'Vorlage') + ' (Kopie)'; delete n.id; n.elemente.forEach(e => { e.id = neueId(); }); E.v = n; E.id = ''; E.dirty = true; return aufbauen(); }
    if (v === 'verwerfen') { const x = vorlagen().find(y => y.id === E.id); E.v = x ? kopie(x) : null; if (!x) E.id = ''; E.dirty = false; E.sel = ''; return aufbauen(); }
    if (v === 'loeschen') return knopf(async () => {
      if (!confirm('Diese Vorlage löschen?')) return;
      if (E.id) await E.umg.igApi('POST', `/api/vorlage/${encodeURIComponent(E.id)}/weg`, {});
      E.umg.stand().vorlagen = vorlagen().filter(x => x.id !== E.id);
      E.v = null; E.id = ''; E.dirty = false; E.sel = '';
      E.umg.meldung('Vorlage gelöscht.'); await E.umg.gespeichert();
    });
  }

  const css = document.createElement('style');
  css.textContent = `
#instaApp .kv-haupt{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:18px;align-items:start;margin-top:18px}
@media(max-width:1100px){#instaApp .kv-haupt{grid-template-columns:1fr}}
#instaApp .kv-links{position:sticky;top:12px}
#instaApp .kv-cv{display:block;margin:12px auto 8px;border:1px solid var(--line);background:#000;cursor:move;touch-action:none;height:auto}
#instaApp .kv-cv.story{width:min(100%, 560px, calc((100vh - 250px) * 0.5625))}#instaApp .kv-cv.feed{width:min(100%, 720px, calc((100vh - 250px) * 0.8))}
#instaApp .kv-liste{display:flex;flex-wrap:wrap;gap:10px}
#instaApp .kv-karte{display:flex;flex-direction:column;align-items:center;gap:4px;width:132px;padding:8px;background:#0b0c10;border:1px solid var(--line);color:#fff;cursor:pointer;font-size:13px;text-align:center}
#instaApp .kv-karte.an{border-color:var(--red)}#instaApp .kv-karte.aus{opacity:.5}
#instaApp .kv-karte canvas{width:108px;height:auto;background:#000}
#instaApp .kv-karte small{color:var(--steel);font-size:11px}
#instaApp .kv-wz{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line)}
#instaApp .kv-wz b{min-width:150px}#instaApp .kv-wz select{width:auto}
#instaApp .kv-plh{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 10px}
#instaApp .kv-plh button{background:#0d0e13;border:1px solid var(--line);color:var(--steel);font-size:12px;padding:3px 6px;cursor:pointer}
#instaApp .kv-plh button:hover{color:#fff;border-color:var(--red)}
#instaApp .kv-ablage{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
#instaApp .kv-ab{position:relative;border:1px solid var(--line);background:#14161d;padding:4px;font-size:11px}
#instaApp .kv-ab img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block}
#instaApp .kv-ab span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--steel)}
#instaApp .kv-ab button{position:absolute;top:4px;width:24px;height:24px;border:1px solid var(--line);background:#0b0c10;color:#fff;cursor:pointer;padding:0}
#instaApp .kv-ab button[data-v="abnimm"]{left:4px}#instaApp .kv-ab button[data-v="abweg"]{right:4px}`;
  document.head.appendChild(css);

  window.K888Vorlagen = { editor, zeichnen, bildFuer, VORSCHLAEGE, SCHRIFTEN, formatVon, ARTEN };
})();
