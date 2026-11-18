// ═══════════════════════════════════════════════════════════
// Kreids888 · Vorlagen-Bau für die Instagram-Posts (Reiter „🧩 Vorlagen“ im Dashboard)
// • Formate: Feed 1080×1350 (Ankündigung, Ergebnis) · Story 1080×1920 (Raceday, Wochenplan)
// • Ebenen: Text (Platzhalter, 10 Schriften), Bild (Ich-Bild, Team-Bild, Logo, eigene Bilder), Form, Termine
// • Hintergrund: Bild des Rennens, eigenes Bild, Farbe – oder ein fertiges Kreids-Design als Grundlage
// • Animationen (Ampel, Alarm, Strecke, Flagge, Countdown …) und Video-Hintergrund → Post wird ein Video (MP4, höchstens 15 s)
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
  const BASIS = ((document.currentScript && document.currentScript.src) || 'https://kreids888.com/insta-vorlagen.js').replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  const MAX_SEK = 15, FPS = 30;
  const zahlAus = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  const klemm = (x, a, b) => Math.max(a, Math.min(b, x));

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
  // ─── Videos (Hintergrund) ───
  const VIDEO_EL = new Map();
  function videoElement(url, frisch) {
    if (!url) return Promise.resolve(null);
    const neu = () => new Promise(ok => {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.loop = true;
      v.onloadeddata = () => ok(v); v.onerror = () => { if (!frisch) VIDEO_EL.delete(url); ok(null); };
      v.src = url;
    });
    if (frisch) return neu();
    if (!VIDEO_EL.has(url)) VIDEO_EL.set(url, neu());
    return VIDEO_EL.get(url);
  }
  function suchen(v, t) {
    return new Promise(ok => {
      if (Math.abs(v.currentTime - t) < 0.002 && v.readyState >= 2) return ok();
      const fertig = () => { v.removeEventListener('seeked', fertig); ok(); };
      v.addEventListener('seeked', fertig); v.currentTime = t;
      setTimeout(fertig, 3000);
    });
  }
  // Welches Video kommt in den Hintergrund? Video des Rennens (Post-Karte) › festes Video der Vorlage › zufällig (fest pro Post)
  function videoQuelle(v, p, umg) {
    if (!v || !v.hg) return null;
    const vids = (umg.stand().videos || []);
    if (!vids.length) return null;
    const renn = p && p.thumb && p.thumb.video;
    if (renn) { const x = vids.find(y => y.id === renn); if (x) return x; }
    if (v.hg.quelle !== 'video') return null;   // (Social-Design ruft das mit quelle 'video' auf, wenn „Video“ gewählt ist)
    if (v.hg.video && v.hg.video !== 'zufall' && v.hg.video !== 'rennen') return vids.find(y => y.id === v.hg.video) || vids[zahlAus(String(p && p.id)) % vids.length];
    return vids[zahlAus(String(p && p.id)) % vids.length];
  }
  const animiert = v => (v.elemente || []).some(e => e.an !== false && (e.typ === 'animation' || (e.anim && e.anim !== 'kein')))
    || (v.hg && v.hg.quelle === 'social' && !!((window.K888_OVERLAYS || []).find(o => o.id === v.hg.design) || {}).anim);
  const sozVideo = (v, p, umg) => v && v.hg && v.hg.quelle === 'social' ? videoQuelle({ ...v, hg: { ...v.hg, quelle: v.hg.designBild === 'video' ? 'video' : 'x' } }, p, umg) : null;
  const istVideo = (v, p, umg) => !!v && (animiert(v) || !!videoQuelle(v, p, umg) || !!sozVideo(v, p, umg));
  let MUXER = null;
  function muxerLaden() {
    if (window.Mp4Muxer) return Promise.resolve();
    if (!MUXER) MUXER = new Promise((ok, nein) => { const sc = document.createElement('script'); sc.src = BASIS + 'tools/mp4-muxer.js'; sc.onload = ok; sc.onerror = () => { MUXER = null; nein(new Error('Video-Baustein nicht geladen')); }; document.head.appendChild(sc); });
    return MUXER;
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
    const iw = img.naturalWidth || img.videoWidth || img.width, ih = img.naturalHeight || img.videoHeight || img.height;
    const f = Math.max(B / iw, H / ih) * Math.max(1, hg.zoom || 1);
    const w = iw * f, h = ih * f;
    g.drawImage(img, (B - w) * (hg.x ?? 0.5), (H - h) * (hg.y ?? 0.5), w, h);
    return { w, h };
  }
  let RAUSCHEN = null;
  const KREIDS = new Map();
  function ueberlagerung(g, H, art, t) {
    if (!art || art === 'kein') return;
    g.save();
    if (art === 'scanlines') { g.fillStyle = 'rgba(0,0,0,.22)'; const o = t == null ? 0 : Math.floor(t * 40) % 6; for (let y = o; y < H; y += 6) g.fillRect(0, y, B, 2); }
    else if (art === 'raster') { g.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < H; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < B; x += 14) { g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); } }
    else if (art === 'vignette') { const gr = g.createRadialGradient(B / 2, H / 2, Math.min(B, H) * 0.3, B / 2, H / 2, Math.max(B, H) * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.8)'); g.fillStyle = gr; g.fillRect(0, 0, B, H); }
    else if (art === 'rauschen') {
      if (!RAUSCHEN) { RAUSCHEN = document.createElement('canvas'); RAUSCHEN.width = RAUSCHEN.height = 160; const c = RAUSCHEN.getContext('2d'), d = c.createImageData(160, 160); for (let i = 0; i < d.data.length; i += 4) { const x = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = x; d.data[i + 3] = 28; } c.putImageData(d, 0, 0); }
      const o = t == null ? 0 : Math.floor(t * 24) * 37 % 160;
      g.translate(-o, -o); g.fillStyle = g.createPattern(RAUSCHEN, 'repeat'); g.fillRect(0, 0, B + 160, H + 160);
    } else if (art === 'karbon') { g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 6; for (let i = -H; i < B; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); } }
    g.restore();
  }
  async function hintergrund(g, v, p, design, umg, H, info, opt = {}) {
    const hg = v.hg || {};
    if (hg.farbe2) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, hg.farbe || '#0a0b0e'); gr.addColorStop(1, hg.farbe2); g.fillStyle = gr; }
    else g.fillStyle = hg.farbe || '#0a0b0e';
    g.fillRect(0, 0, B, H);
    let img = null;
    if (hg.quelle === 'social') {
      // Bild im Design: Video (des Rennens bzw. gewählt) › Bild des Rennens › eigenes Bild › keins
      let medien = null;
      const vq = videoQuelle({ ...v, hg: { ...hg, quelle: hg.designBild === 'video' ? 'video' : 'x' } }, p, umg);
      if (vq) { medien = opt.video || null; if (!medien) { medien = await videoElement(vq.url); if (medien) await suchen(medien, Math.min((hg.videoStart || 0) + 1, Math.max(0, (medien.duration || 1) - 0.1))); } }
      else if (hg.designBild === 'ablage') medien = await bild(bildUrl({ quelle: 'ablage', datei: hg.ablage }, umg));
      else if (hg.designBild !== 'kein') medien = await bild(p.hg);
      await sozialDesign(g, v, p, design, umg, H, opt.zeit, medien);
      info.w = B; info.h = H;
      return;
    }
    if (hg.quelle === 'kreids' && window.K888Bilder) {
      const key = JSON.stringify([p.id, p.spruch, p.hg, design.farbe1, design.logoBild]);
      if (!KREIDS.has(key)) KREIDS.set(key, window.K888Bilder.post({ ...p, klassen: p.klassen || [] }, design).then(b => createImageBitmap(b)).catch(() => null));
      img = await KREIDS.get(key);
      if (img) { g.drawImage(img, 0, 0, B, H); info.w = B; info.h = H; }
      ueberlagerung(g, H, hg.overlay, opt.zeit);
      return;
    }
    const vq = videoQuelle(v, p, umg);
    if (vq) {
      img = opt.video || null;
      if (!img) { img = await videoElement(vq.url); if (img) await suchen(img, Math.min((hg.videoStart || 0) + 1, Math.max(0, (img.duration || 1) - 0.1))); }
    } else if (hg.quelle === 'rennen') img = await bild(p.hg);
    else if (hg.quelle === 'ablage') img = await bild(bildUrl({ quelle: 'ablage', datei: hg.ablage }, umg));
    if (img) { const m = bildFuellen(g, img, H, hg); info.w = m.w; info.h = m.h; } else { info.w = B; info.h = H; }
    if (hg.streifen || (!img && hg.quelle === 'rennen')) streifen(g, H, hg.streifenFarbe || design.farbe1 || '#e11324');
    if (hg.dunkel) { g.fillStyle = `rgba(5,7,10,${hg.dunkel})`; g.fillRect(0, 0, B, H); }
    if (hg.verlauf && hg.verlauf !== 'kein') verlauf(g, H, hg.verlauf, hg.verlaufStaerke);
    ueberlagerung(g, H, hg.overlay, opt.zeit);
  }

  function zeilenVon(g, el, text) {
    const maxB = el.maxB || 960, breit = t => g.measureText(t).width;
    if ((el.zeilen || 1) < 2 || breit(text) <= maxB) return [text];
    const w = text.split(/\s+/); let best = null;
    for (let i = 1; i < w.length; i++) { const z = [w.slice(0, i).join(' '), w.slice(i).join(' ')], m = Math.max(...z.map(breit)); if (!best || m < best.m) best = { z, m }; }
    return best ? best.z : [text];
  }
  // Bewegung einer Ebene zur Zeit t (null = fertiges Standbild). Gibt false zurück, wenn sie gerade unsichtbar ist.
  const auslaufen = a => 1 - Math.pow(1 - a, 3);
  const zurueck = a => { const c = 1.70158; return 1 + (c + 1) * Math.pow(a - 1, 3) + c * Math.pow(a - 1, 2); };
  function animAnwenden(g, el, box, t) {
    const art = el.anim || 'kein';
    if (art === 'kein' || t == null) return true;
    const a = klemm((t - (el.animStart || 0)) / Math.max(0.05, el.animDauer || 0.6), 0, 1);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, skal = s => { g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); };
    if (t < (el.animStart || 0) && ['einblenden', 'links', 'rechts', 'unten', 'oben', 'aufpoppen', 'zoom'].includes(art)) return false;
    if (art === 'einblenden') g.globalAlpha *= auslaufen(a);
    else if (art === 'links') g.translate(-(1 - auslaufen(a)) * (box.x + box.w + 60), 0);
    else if (art === 'rechts') g.translate((1 - auslaufen(a)) * (B - box.x + 60), 0);
    else if (art === 'unten') g.translate(0, (1 - auslaufen(a)) * 1200);
    else if (art === 'oben') g.translate(0, -(1 - auslaufen(a)) * (box.y + box.h + 60));
    else if (art === 'aufpoppen') { skal(Math.max(0.01, zurueck(a))); g.globalAlpha *= Math.min(1, a * 3); }
    else if (art === 'zoom') { skal(1 + (1 - auslaufen(a)) * 1.6); g.globalAlpha *= auslaufen(a); }
    else if (art === 'puls') skal(1 + 0.06 * Math.sin(Math.PI * 2 * 1.2 * t));
    else if (art === 'blinken') { if (Math.floor(t * 2.5) % 2) return false; }
    else if (art === 'wackeln') { g.translate(cx, cy); g.rotate(0.05 * Math.sin(Math.PI * 2 * 2.2 * t)); g.translate(-cx, -cy); }
    else if (art === 'glitch') { const f = Math.floor(t * 14), r = zahlAus(el.id + f) % 100; if (r < 30) g.translate((r % 7 - 3) * 9, (r % 5 - 2) * 3); }
    return true;
  }
  function drehen(g, el, box) {
    if (!el.drehung) return;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    g.translate(cx, cy); g.rotate(el.drehung * Math.PI / 180); g.translate(-cx, -cy);
  }
  function textZeichnen(g, el, text, t) {
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
    if (!animAnwenden(g, el, box, t)) { g.restore(); el._box = el.box === 'band' ? { x: 0, y: box.y, w: B, h: box.h } : box; return; }
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
    const fx = el.effekt || 'kein', alle = (f) => zeilen.forEach((z, i) => f(z, zx(i), cap + i * lh));
    if (fx === '3d') { g.fillStyle = el.rand || '#000'; const n = Math.max(4, Math.round(size * 0.07)); for (let k = n; k > 0; k--) alle((z, x, y) => g.fillText(z, x + k * 0.9, y + k * 0.9)); }
    if (el.randB > 0 && fx !== 'umriss') { g.lineWidth = el.randB * 2; g.strokeStyle = el.rand || '#000'; alle((z, x, y) => g.strokeText(z, x, y)); }
    if (fx === 'glitch') {
      const d = size * 0.045, f = t == null ? 0 : Math.floor(t * 14), j = t == null ? 1 : 0.6 + (zahlAus(el.id + f) % 80) / 100;
      g.globalAlpha *= 0.85; g.fillStyle = '#00e5ff'; alle((z, x, y) => g.fillText(z, x - d * j, y)); g.fillStyle = '#ff2bd6'; alle((z, x, y) => g.fillText(z, x + d * j, y)); g.globalAlpha /= 0.85;
    }
    if (fx === 'neon') { g.shadowColor = el.farbe || '#fff'; g.shadowBlur = size * 0.45; }
    else if (el.schatten && fx !== '3d') { g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = size * 0.14; g.shadowOffsetY = size * 0.04; }
    const fuell = () => { if (el.verlauf) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, el.farbe || '#fff'); gr.addColorStop(1, el.farbe2 || '#ffd400'); return gr; } return el.farbe || '#fff'; };
    if (fx === 'umriss') { g.lineWidth = Math.max(3, el.randB || size * 0.035); g.strokeStyle = fuell(); alle((z, x, y) => g.strokeText(z, x, y)); }
    else { g.fillStyle = fuell(); alle((z, x, y) => g.fillText(z, x, y)); if (fx === 'neon') { g.shadowBlur = size * 0.15; alle((z, x, y) => g.fillText(z, x, y)); } }
    g.restore();
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    el._box = el.box === 'band' ? { x: 0, y: box.y, w: B, h: box.h } : box;
  }
  function bildZeichnen(g, el, img, t) {
    el._box = null;
    if (!img) return;
    const quelle = el.schwarzWeg ? ohneSchwarz(img) : img;
    const b = el.b || 400, h = b * img.naturalHeight / img.naturalWidth;
    const box = { x: el.x, y: el.y, w: b, h };
    g.save();
    drehen(g, el, box);
    g.globalAlpha = el.alpha ?? 1;
    if (!animAnwenden(g, el, box, t)) { g.restore(); el._box = box; return; }
    const f = [];
    if (el.rand) { const r = Math.max(3, Math.round(h * 0.006)); f.push(`drop-shadow(${r}px 0 0 #fff)`, `drop-shadow(-${r}px 0 0 #fff)`, `drop-shadow(0 ${r}px 0 #fff)`, `drop-shadow(0 -${r}px 0 #fff)`); }
    if (el.schatten) f.push(`drop-shadow(0 ${Math.round(h * 0.02)}px ${Math.round(h * 0.03)}px rgba(0,0,0,.7))`);
    if (f.length && 'filter' in g) g.filter = f.join(' ');
    if (el.spiegeln) { g.translate(el.x + b, el.y); g.scale(-1, 1); g.drawImage(quelle, 0, 0, b, h); } else g.drawImage(quelle, el.x, el.y, b, h);
    g.restore();
    el._box = box;
  }
  function formZeichnen(g, el, t) {
    const box = { x: el.x, y: el.y, w: el.b || 400, h: el.h || 100 };
    g.save();
    drehen(g, el, box);
    g.globalAlpha = el.alpha ?? 1;
    if (!animAnwenden(g, el, box, t)) { g.restore(); el._box = box; return; }
    if (el.art === 'karo') {
      const f = Math.max(6, el.feld || Math.round(box.h / 2)), lauf = t == null ? 0 : (t * f * 1.5) % (f * 2);
      g.beginPath(); g.rect(box.x, box.y, box.w, box.h); g.clip();
      g.fillStyle = el.farbe2 || '#ffffff'; g.fillRect(box.x, box.y, box.w, box.h); g.fillStyle = el.farbe || '#0a0b0e';
      for (let y = 0; y < box.h; y += f) for (let x = -f * 2; x < box.w + f * 2; x += f) if ((Math.floor(x / f) + Math.floor(y / f)) % 2 === 0) g.fillRect(box.x + x + lauf, box.y + y, f, f);
      g.restore(); el._box = box; return;
    }
    if (el.art === 'streifen') {
      const n = 3, s = box.w / (n * 2 + 1);
      g.fillStyle = el.farbe || '#e11324';
      for (let i = 0; i < n; i++) { const x = box.x + s + i * s * 2; g.beginPath(); g.moveTo(x, box.y + box.h); g.lineTo(x + box.h * 0.35, box.y); g.lineTo(x + box.h * 0.35 + s, box.y); g.lineTo(x + s, box.y + box.h); g.fill(); if (el.farbe2) g.fillStyle = el.farbe2; }
      g.restore(); el._box = box; return;
    }
    if (el.farbe2) { const gr = g.createLinearGradient(box.x, 0, box.x + box.w, 0); gr.addColorStop(0, el.farbe || '#e11324'); gr.addColorStop(1, el.farbe2); g.fillStyle = gr; } else g.fillStyle = el.farbe || '#e11324';
    g.beginPath();
    if (el.art === 'schraeg') { const s = box.h * 0.35; g.moveTo(box.x, box.y + box.h); g.lineTo(box.x + s, box.y); g.lineTo(box.x + box.w, box.y); g.lineTo(box.x + box.w - s, box.y + box.h); }
    else if (el.art === 'kreis') g.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, Math.PI * 2);
    else if (el.art === 'diagonale') { g.moveTo(box.x, box.y + box.h); g.lineTo(box.x + box.w, box.y); g.lineTo(box.x + box.w, box.y + box.h); }
    else if (el.art === 'rahmen') { g.lineWidth = Math.max(2, el.dicke || 8); g.strokeStyle = g.fillStyle; g.strokeRect(box.x, box.y, box.w, box.h); }
    else g.rect(box.x, box.y, box.w, box.h);
    if (el.art !== 'rahmen') g.fill();
    g.restore();
    el._box = box;
  }
  function termineZeichnen(g, el, p, t) {
    const liste = (p.liste && p.liste.length ? p.liste : beispielWoche()).slice(0, 7);
    const x0 = el.x, y0 = el.y, b = el.b || 920, hGes = el.h || 700, n = Math.max(1, liste.length);
    const rowH = hGes / n, ch = Math.min(rowH - 14, 240), k = el.schrift || 'saira';
    const berlin = ms => (window.K888Bilder ? window.K888Bilder.berlin(ms) : { zeit: '', wt: '' });
    liste.forEach((e, i) => {
      const y = y0 + i * rowH, z = berlin(e.liveMs), [, m, d] = String(e.datum).split('-').map(Number);
      g.save();
      if (!animAnwenden(g, { ...el, id: el.id + i, animStart: (el.animStart || 0) + i * 0.18 }, { x: x0, y, w: b, h: ch }, t)) { g.restore(); return; }
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
      g.restore();
    });
    el._box = { x: x0, y: y0, w: b, h: hGes };
  }

  // ─── Social-Designs (dieselben Designs wie im Social-Bild, kreids888.com/overlays/overlays.js) ───
  let OVERLAYS = null, SOZ_FONTS = null;
  function overlaysLaden() {
    if (window.K888_OVERLAYS && window.K888_OVERLAYS.length) return Promise.resolve(window.K888_OVERLAYS);
    if (!OVERLAYS) OVERLAYS = new Promise((ok, nein) => {
      const sc = document.createElement('script'); sc.src = site() + 'overlays/overlays.js?v=' + Date.now();
      sc.onload = () => ok(window.K888_OVERLAYS || []); sc.onerror = () => { OVERLAYS = null; nein(new Error('Social-Designs nicht geladen')); };
      document.head.appendChild(sc);
    });
    return OVERLAYS;
  }
  function sozFonts() {
    if (!SOZ_FONTS) SOZ_FONTS = Promise.all([['Saira Condensed', 'saira-condensed', [500, 600, 700, 800, 900]], ['Barlow', 'barlow', [400, 500, 600, 700]]].flatMap(([fam, datei, ws]) => ws.map(w => {
      const f = new FontFace(fam, `url(${site()}fonts/${datei}-latin-${w}-normal.woff2)`, { weight: String(w) }); document.fonts.add(f); return f.load().catch(() => null);
    })));
    return SOZ_FONTS;
  }
  const SOZ_ICON = { youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z' };
  function sozHilfe(dunkel) {
    const ROT = '#e11324';
    const skala = f => String(f).replace(/rgba\(([^,]+),([^,]+),([^,]+),\s*([\d.]+)\)/, (m, r, g, b, a) => `rgba(${r},${g},${b},${+a * dunkel})`);
    const h = {
      ROT,
      icon(c, name, x, y, size, color) { if (!SOZ_ICON[name]) return; c.save(); c.translate(x, y); c.scale(size / 24, size / 24); c.fillStyle = color || '#fff'; c.fill(new Path2D(SOZ_ICON[name]), 'evenodd'); c.restore(); },
      markenIcon(c, name, x, y, size) { h.icon(c, name, x, y, size, name === 'youtube' ? '#ff0000' : '#fff'); },
      motto(c, s, x, y, size, align) {
        const w = String(s || '').toUpperCase().split(/\s+/).filter(Boolean);
        c.save(); c.font = h.f(900, size); if ('letterSpacing' in c) c.letterSpacing = Math.round(size * 0.03) + 'px';
        const leer = c.measureText(' ').width, br = w.map(x => c.measureText(x).width), ges = br.reduce((a, b) => a + b, 0) + leer * Math.max(0, w.length - 1);
        let xx = align === 'right' ? x - ges : x; c.textAlign = 'left';
        w.forEach((t, i) => { c.fillStyle = i === 0 ? ROT : '#fff'; c.fillText(t, xx, y); xx += br[i] + leer; });
        c.restore();
      },
      f: (w, size, fam) => `${w} ${Math.round(size * 10) / 10}px "${fam || 'Saira Condensed'}"`,
      text(c, s, x, y, font, color, align, spacing) {
        c.save(); c.font = font; c.fillStyle = color; c.textAlign = align || 'left';
        const px = +(font.match(/([\d.]+)px/) || [0, 0])[1]; if ('letterSpacing' in c) c.letterSpacing = Math.round(px * (spacing || 0)) + 'px';
        c.fillText(s, x, y); c.restore();
      },
      verlauf(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(st => g.addColorStop(st[0], skala(st[1]))); c.fillStyle = g; c.fillRect(0, 0, c.canvas.width, c.canvas.height); },
      abdunkeln(c, W, H, farbe) { c.fillStyle = skala(farbe); c.fillRect(0, 0, W, H); },
      schraeg(c, x, y, w, hh, sk, color) { c.fillStyle = color; c.beginPath(); c.moveTo(x + sk, y); c.lineTo(x + w + sk, y); c.lineTo(x + w - sk, y + hh); c.lineTo(x - sk, y + hh); c.closePath(); c.fill(); },
      ecken(c, x, y, w, hh, len, th, color) { c.fillStyle = color; [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + hh, 1, -1], [x + w, y + hh, -1, -1]].forEach(e => { c.fillRect(e[2] > 0 ? e[0] : e[0] - len, e[3] > 0 ? e[1] : e[1] - th, len, th); c.fillRect(e[2] > 0 ? e[0] : e[0] - th, e[3] > 0 ? e[1] : e[1] - len, th, len); }); },
      logo(c, x, y, size) { c.save(); c.font = h.f(900, size); c.textAlign = 'left'; c.fillStyle = '#fff'; c.fillText('KREIDS', x, y); const w = c.measureText('KREIDS').width; c.fillStyle = ROT; c.fillText('888', x + w, y); c.restore(); },
      t: (key, std) => std,
      startnummer(c, x, y, hh, align) {
        const nr = '#888'; c.save(); c.font = h.f(900, Math.round(hh * 0.62));
        const w = c.measureText(nr).width + hh * 0.7, x0 = align === 'right' ? x - w : x;
        c.fillStyle = 'rgba(10,11,14,.85)'; c.fillRect(x0, y, w, hh); c.fillStyle = ROT; c.fillRect(x0, y, 8, hh);
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(nr, x0 + w / 2 + 4, y + hh * 0.74); c.restore();
      },
      fuss(c, x1, x2, y, footer) { c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(x1, y - 76, x2 - x1, 2); c.fillStyle = ROT; c.fillRect(x1, y - 76, 140, 4); h.logo(c, x1, y - 8, 46); h.motto(c, footer, x2, y - 10, 38, 'right'); },
      umbruch(c, s, maxW) {
        const out = [];
        String(s || '').replace(/\r/g, '').trim().replace(/\n\s*\n\s*/g, '\n\n').split('\n').forEach(abs => {
          if (!abs.trim()) { out.push(''); return; }
          let zeile = '';
          abs.split(/\s+/).filter(Boolean).forEach(wort => {
            const test = zeile ? zeile + ' ' + wort : wort;
            if (c.measureText(test).width <= maxW) { zeile = test; return; }
            if (zeile) out.push(zeile);
            while (c.measureText(wort).width > maxW && wort.length > 1) { let n = wort.length; while (n > 1 && c.measureText(wort.slice(0, n)).width > maxW) n--; out.push(wort.slice(0, n)); wort = wort.slice(n); }
            zeile = wort;
          });
          if (zeile) out.push(zeile);
        });
        return out;
      },
      passend(c, s, maxW, maxZ, start, min, w, fam, lh) {
        let size = start, z;
        for (; size >= min; size -= 2) { c.font = h.f(w, size, fam); z = h.umbruch(c, s, maxW); if (z.length <= maxZ) break; }
        if (size < min) { const budget = start * (1 + (maxZ - 1) * lh), boden = Math.max(22, Math.round(min * 0.75)); for (size = min; size > boden; size--) { c.font = h.f(w, size, fam); z = h.umbruch(c, s, maxW); if (size * (1 + (z.length - 1) * lh) <= budget) break; } }
        c.font = h.f(w, size, fam); z = h.umbruch(c, s, maxW);
        return { zeilen: String(s || '').trim() ? z : [], groesse: size, lh, w, fam, hoehe: z.length ? size * (1 + (z.length - 1) * lh) : 0 };
      },
      zeilen(c, t, x, y, color, spacing, align) { t.zeilen.forEach((z, i) => h.text(c, z, x, y + t.groesse * 0.82 + i * t.groesse * t.lh, h.f(t.w, t.groesse, t.fam), color, align || 'left', spacing ? spacing * 0.02 : 0)); },
      qrMatrix: () => null,
      linie(c, x, y, w, th) { const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, ROT); g.addColorStop(1, '#ff7a1a'); c.fillStyle = g; c.fillRect(x, y, w, th); },
      fenster(c, d, x, y, w, hh) {
        c.fillStyle = '#000'; c.fillRect(x, y, w, hh); h.bild(c, d, x, y, w, hh);
        c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, hh - 2);
      },
      passGroesse(c, s, maxW, start, min, w, spacing) { let size = start; s = String(s || ''); for (; size > min; size--) { c.font = h.f(w || 900, size); if (c.measureText(s).width + (spacing || 0) * size * s.length <= maxW) break; } c.font = h.f(w || 900, size); return size; },
      hatMedium: d => !!(d.img && (d.img.videoWidth || d.img.naturalWidth || d.img.width)),
      wortGroesse(c, s, maxW, start, w, fam) { const wo = String(s || '').split(/\s+/).filter(Boolean); let size = start; for (; size > 20; size -= 2) { c.font = h.f(w, size, fam); if (wo.every(x => c.measureText(x).width <= maxW)) break; } return size; },
      qr(c, d, x, y) { h._qr = { x, y }; return true; },
      zielMelden() { /* nur im Social-Bild */ },
      bild(c, d, x, y, w, hh) {
        c.save(); c.beginPath(); c.rect(x, y, w, hh); c.clip();
        if (h.hatMedium(d)) {
          const iw = d.img.videoWidth || d.img.naturalWidth || d.img.width, ih = d.img.videoHeight || d.img.naturalHeight || d.img.height;
          const sc = Math.max(w / iw, hh / ih) * (d.view.zoom || 1), dw = iw * sc, dh = ih * sc;
          c.drawImage(d.img, x + (w - dw) * (d.view.x ?? 0.5), y + (hh - dh) * (d.view.y ?? 0.5), dw, dh);
        } else {
          const g = c.createRadialGradient(x + w * 0.75, y + hh * 0.2, 20, x + w * 0.6, y + hh * 0.3, Math.max(w, hh));
          g.addColorStop(0, '#3a0a10'); g.addColorStop(0.45, '#14161d'); g.addColorStop(1, '#0a0b0e'); c.fillStyle = g; c.fillRect(x, y, w, hh);
          c.strokeStyle = 'rgba(255,255,255,.035)'; c.lineWidth = 2; for (let i = -hh; i < w; i += 28) { c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i + hh, y + hh); c.stroke(); }
        }
        c.restore();
      }
    };
    return h;
  }
  const SOZ_TEXT_STD = { kicker: '{countdown}', title: '{spruch}', text: '{serie} · {runde}', footer: 'Kreids888 Simracing', platz: '{platz}', strecke: '{strecke}', wann: '{wochentag} {zeit} Uhr', rundenzeit: '' };
  const SOZ_FELDER = [['kicker', 'Kleine Zeile oben'], ['title', 'Überschrift'], ['text', 'Text'], ['strecke', 'Strecke'], ['wann', 'Wann'], ['platz', 'Platz'], ['rundenzeit', 'Rundenzeit'], ['footer', 'Fußzeile']];
  async function sozialDesign(g, v, p, design, umg, H, t, medien) {
    const liste = await overlaysLaden(); await sozFonts();
    const ov = liste.find(o => o.id === v.hg.design) || liste[0]; if (!ov) return;
    const w = werte(p, design), tx = { ...SOZ_TEXT_STD, ...(v.hg.texte || {}) }, f = k => fuellen(tx[k], w);
    const d = { kicker: gross(f('kicker')), title: f('title'), text: tx.text === '{termine}' || /\{termine\}/.test(tx.text) ? '' : f('text'), footer: f('footer'), platz: f('platz'), strecke: f('strecke'), wann: f('wann'), rundenzeit: f('rundenzeit'),
      zeit: t == null ? (ov.anim ? 3.5 : null) : t, aufn: t != null, qr: '', img: medien, view: { zoom: v.hg.zoom || 1, x: v.hg.x ?? 0.5, y: v.hg.y ?? 0.5, ox: 0, oy: 0 }, img2: null, view2: { zoom: 1, ox: 0, oy: 0 }, rundenzeit2: '', ziel: null, woche: { liste: [], geladen: true } };
    if (/\{termine\}/.test(tx.text)) d.text = (p.liste && p.liste.length ? p.liste : beispielWoche()).map(e => { const b = window.K888Bilder ? window.K888Bilder.berlin(e.liveMs) : { wt: '', zeit: '' }; return `${gross(b.wt || '')} ${b.zeit} ${gross(e.track || e.titel || e.serie || 'Termin')} – ${[e.serie, e.nr ? 'Runde ' + e.nr : ''].filter(Boolean).join(' · ')}`; }).join('\n');
    g.save();
    try { ov.draw(g, B, H, d, sozHilfe(v.hg.designDunkel ?? 0.6)); } catch (e) { console.error(e); }
    g.restore();
  }

  // ─── Animations-Ebenen: Startampel, Alarm, Streckenrunde, Zielflagge, Countdown, Blitz, Speed-Linien ───
  const STRECKE = [[0.08, 0.55], [0.16, 0.2], [0.4, 0.1], [0.55, 0.3], [0.72, 0.12], [0.93, 0.28], [0.88, 0.62], [0.7, 0.75], [0.55, 0.6], [0.4, 0.88], [0.14, 0.9]];
  let STRECKE_PFAD = null;
  function streckePfad() {   // geschlossene Kurve (Catmull-Rom), gleichmäßig verteilt
    if (STRECKE_PFAD) return STRECKE_PFAD;
    const P = STRECKE, n = P.length, roh = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < 24; k++) {
        const t = k / 24, t2 = t * t, t3 = t2 * t;
        roh.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    const len = [0]; for (let i = 1; i <= roh.length; i++) { const a = roh[i - 1], b = roh[i % roh.length]; len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    STRECKE_PFAD = { roh, len, ges: len[len.length - 1] };
    return STRECKE_PFAD;
  }
  function aufStrecke(u) {
    const { roh, len, ges } = streckePfad(), z = ((u % 1) + 1) % 1 * ges;
    let i = 1; while (i < len.length - 1 && len[i] < z) i++;
    const a = roh[i - 1], b = roh[i % roh.length], f = (z - len[i - 1]) / Math.max(1e-9, len[i] - len[i - 1]);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  function animationZeichnen(g, el, t, H, editor) {
    const x = el.x, y = el.y, b = el.b || 600, art = el.art || 'ampel', f1 = el.farbe || '#e11324', f2 = el.farbe2 || '#2563eb';
    const tt = t == null ? null : Math.max(0, t - (el.animStart || 0)) * (el.tempo || 1);
    g.save();
    if (art === 'ampel') {
      const h = b * 0.3, spalte = b / 5, r = spalte * 0.3;
      g.fillStyle = '#0d0e12'; g.strokeStyle = '#2a2d36'; g.lineWidth = 4;
      g.beginPath(); g.roundRect ? g.roundRect(x, y, b, h, 18) : g.rect(x, y, b, h); g.fill(); g.stroke();
      const an = tt == null ? 5 : tt >= 3.6 ? 0 : Math.min(5, Math.floor(tt / 0.6));
      for (let i = 0; i < 5; i++) {
        const cx = x + spalte * (i + 0.5);
        g.fillStyle = '#16181f'; g.fillRect(cx - spalte * 0.38, y + h * 0.08, spalte * 0.76, h * 0.84);
        for (let j = 0; j < 2; j++) {
          const cy = y + h * (0.3 + j * 0.42), leuchtet = j === 0 && i < an;
          g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
          if (leuchtet) { g.shadowColor = f1; g.shadowBlur = r * 1.6; g.fillStyle = f1; } else { g.shadowBlur = 0; g.fillStyle = '#2a0c10'; }
          g.fill(); g.shadowBlur = 0;
        }
      }
      el._box = { x, y, w: b, h };
    } else if (art === 'alarm') {
      const r = b / 2, cx = x + r, cy = y + r * 1.1, w = tt == null ? 0.6 : tt * Math.PI * 2 * 1.4;
      for (const [farbe, phase] of [[f1, 0], [f2, Math.PI]]) {
        const a = w + phase, gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
        gr.addColorStop(0, farbe); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = 0.55; g.fillStyle = gr;
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r * 3.2, a - 0.35, a + 0.35); g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
      const hell = tt == null ? 1 : 0.65 + 0.35 * Math.abs(Math.sin(tt * 9));
      g.shadowColor = Math.floor((tt || 0) * 4) % 2 ? f2 : f1; g.shadowBlur = r * 0.9 * hell;
      const gr = g.createLinearGradient(cx - r, 0, cx + r, 0); gr.addColorStop(0, f1); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, f2);
      g.globalAlpha = hell; g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 0.62, Math.PI, 0); g.closePath(); g.fill();
      g.globalAlpha = 1; g.shadowBlur = 0; g.fillStyle = '#1a1c22'; g.fillRect(cx - r * 0.8, cy, r * 1.6, r * 0.28);
      if (el.rand && tt != null) {   // Rand des ganzen Bildes blitzt mit
        const a = 0.5 * Math.abs(Math.sin(tt * 6)), fb = Math.floor(tt * 3) % 2 ? f2 : f1;
        for (const [x0, y0, x1, y1, w0, h0] of [[0, 0, 0, 120, B, 120], [0, H, 0, H - 120, B, 120]]) { const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, fb); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = lg; g.fillRect(0, Math.min(y0, y1), w0, h0); }
        g.globalAlpha = 1;
      }
      el._box = { x, y, w: b, h: r * 1.5 };
    } else if (art === 'strecke') {
      const h = b * 0.62, { roh } = streckePfad(), P = q => [x + q[0] * b, y + q[1] * h];
      g.lineJoin = 'round'; g.lineCap = 'round';
      const pfad = () => { g.beginPath(); roh.forEach((q, i) => { const [a, c] = P(q); i ? g.lineTo(a, c) : g.moveTo(a, c); }); g.closePath(); };
      pfad(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = b * 0.05; g.stroke();
      pfad(); g.strokeStyle = el.farbe2 || '#d9dde5'; g.lineWidth = b * 0.024; g.stroke();
      const [sx, sy] = P(aufStrecke(0));   // Start/Ziel
      g.fillStyle = '#fff'; g.fillRect(sx - b * 0.03, sy - b * 0.012, b * 0.06, b * 0.024); g.fillStyle = '#000'; for (let k = 0; k < 4; k++) g.fillRect(sx - b * 0.03 + k * b * 0.015, sy - b * (k % 2 ? 0 : 0.012), b * 0.015, b * 0.012);
      const u = tt == null ? 0.72 : tt / 3.2;
      for (let k = 30; k >= 0; k--) { const [a, c] = P(aufStrecke(u - k * 0.004)); g.globalAlpha = (1 - k / 30) * 0.9; g.fillStyle = f1; g.beginPath(); g.arc(a, c, b * 0.012 * (1 - k / 45), 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
      const [a, c] = P(aufStrecke(u)); g.shadowColor = f1; g.shadowBlur = b * 0.04; g.fillStyle = '#fff'; g.beginPath(); g.arc(a, c, b * 0.017, 0, Math.PI * 2); g.fill();
      el._box = { x, y, w: b, h };
    } else if (art === 'flagge') {
      const sp = 8, ze = 6, fw = b * 0.82, fh = fw * 0.62, cw = fw / sp, ch = fh / ze, px = x + b * 0.06, w = tt == null ? 0.8 : tt * 5;
      g.fillStyle = '#c9ced6'; g.fillRect(x, y, b * 0.035, fh * 2.1);
      const pkt = (i, j) => { const k = i / sp; return [px + i * cw, y + j * ch + Math.sin(k * 5 - w) * fh * 0.07 * k]; };
      for (let i = 0; i < sp; i++) for (let j = 0; j < ze; j++) {
        const a = pkt(i, j), c = pkt(i + 1, j), d = pkt(i + 1, j + 1), e = pkt(i, j + 1), schatten = 0.75 + 0.25 * Math.cos((i / sp) * 5 - w);
        g.fillStyle = (i + j) % 2 ? `rgba(${Math.round(240 * schatten)},${Math.round(240 * schatten)},${Math.round(240 * schatten)},1)` : '#0a0b0e';
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.lineTo(e[0], e[1]); g.closePath(); g.fill();
      }
      el._box = { x, y, w: b, h: fh * 2.1 };
    } else if (art === 'countdown') {
      const h = b * 0.8, cx = x + b / 2, cy = y + h / 2, schritte = ['3', '2', '1', 'GO!'];
      const i = tt == null ? 3 : Math.min(3, Math.floor(tt / 0.8)), a = tt == null ? 1 : klemm((tt - i * 0.8) / 0.35, 0, 1);
      const text = schritte[i], gr = (text.length > 2 ? 0.42 : 0.75) * b;
      g.translate(cx, cy); g.scale(zurueck(a) || 0.01, zurueck(a) || 0.01);
      g.font = font(el.schrift || 'anton', 900, gr); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = i === 3 ? f2 : f1; g.shadowBlur = gr * 0.25; g.fillStyle = i === 3 ? (el.farbe2 || '#22c55e') : f1;
      g.fillText(text, 0, gr * 0.04);
      el._box = { x, y, w: b, h };
    } else if (art === 'blitz') {
      if (t != null && t >= (el.animStart || 0)) { const p = tt % 3, a = p < 0.3 ? 1 - p / 0.3 : 0; if (a > 0) { g.globalAlpha = a * 0.85; g.fillStyle = el.farbe || '#ffffff'; g.fillRect(0, 0, B, H); } }
      g.globalAlpha = 1;
      if (editor) { g.font = `${Math.round(b * 0.6)}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = '#ffd400'; g.fillText('⚡', x, y); }
      el._box = { x, y, w: b, h: b };
    } else if (art === 'speed') {
      const h = el.h || 400, u = tt == null ? 0.37 : tt;
      g.beginPath(); g.rect(x, y, b, h); g.clip();
      for (let i = 0; i < 28; i++) {
        const r1 = (zahlAus('s' + i) % 1000) / 1000, r2 = (zahlAus('l' + i) % 1000) / 1000, l = 80 + r2 * 320;
        const ly = y + r1 * h, lx = x + b - ((u * (900 + r2 * 900) + r1 * (b + l)) % (b + l));
        const lg = g.createLinearGradient(lx, 0, lx + l, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, el.farbe || '#ffffff');
        g.globalAlpha = 0.25 + r2 * 0.5; g.fillStyle = lg; g.fillRect(lx, ly, l, 2 + r1 * 4);
      }
      el._box = { x, y, w: b, h };
    }
    g.restore();
  }

  // v: Vorlage · p: Post (aus dem Stand) · design: Stand-Design · umg: { stand() } · opt: { auswahl, zeit (Sekunden, null = Standbild), video, editor }
  async function zeichnen(canvas, v, p, design, umg, opt = {}) {
    const H = HOEHE[v.format] || 1350;
    const els = (v.elemente || []).filter(e => e.an !== false);
    await Promise.all(els.filter(e => e.typ === 'text' || e.typ === 'termine' || (e.typ === 'animation' && e.art === 'countdown')).flatMap(e => e.typ === 'termine' ? [schriftLaden(e.schrift, 600), schriftLaden(e.schrift, 800), schriftLaden(e.schrift, 900)] : [schriftLaden(e.schrift || 'anton', e.gewicht || 900)]));
    const bilder = await Promise.all(els.map(e => (e.typ === 'bild' ? bild(bildUrl(e, umg)) : null)));
    if (canvas.width !== B || canvas.height !== H) { canvas.width = B; canvas.height = H; }
    const g = canvas.getContext('2d');
    const info = {}, t = opt.zeit == null ? null : opt.zeit;
    await hintergrund(g, v, p, design, umg, H, info, { video: opt.video, zeit: t });
    const w = werte(p, design);
    els.forEach((el, i) => {
      g.save();
      if (el.typ === 'text') textZeichnen(g, el, fuellen(el.inhalt, w), t);
      else if (el.typ === 'bild') bildZeichnen(g, el, bilder[i], t);
      else if (el.typ === 'form') formZeichnen(g, el, t);
      else if (el.typ === 'termine') termineZeichnen(g, el, p, t);
      else if (el.typ === 'animation') animationZeichnen(g, el, t, H, opt.editor);
      g.restore();
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

  // ─── Video (MP4, H.264 + AAC) im Browser bauen: Bild für Bild, Hintergrund-Video wird mitgeschnitten ───
  const warte = ms => new Promise(r => setTimeout(r, ms));
  function zuI420(px, W, H, out) {   // begrenzter Bereich BT.709 (TikTok/Instagram mögen kein Vollbereich-Video)
    const cw = W >> 1, ys = W * H, us = cw * (H >> 1);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const o = (j * W + i) * 4; out[j * W + i] = 16 + ((46.559 * px[o] + 156.629 * px[o + 1] + 15.812 * px[o + 2]) / 255 + 0.5 | 0); }
    for (let y2 = 0; y2 < H >> 1; y2++) for (let x2 = 0; x2 < cw; x2++) {
      const p = ((y2 * 2) * W + x2 * 2) * 4, q = p + W * 4, k = y2 * cw + x2;
      const r = (px[p] + px[p + 4] + px[q] + px[q + 4]) / 4, gg = (px[p + 1] + px[p + 5] + px[q + 1] + px[q + 5]) / 4, bb = (px[p + 2] + px[p + 6] + px[q + 2] + px[q + 6]) / 4;
      out[ys + k] = Math.round(128 + (-25.670 * r - 86.330 * gg + 112 * bb) / 255);
      out[ys + us + k] = Math.round(128 + (112 * r - 101.735 * gg - 10.265 * bb) / 255);
    }
  }
  async function tonLaden(url, start, dauer) {
    try {
      const ab = await (await fetch(url)).arrayBuffer();
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ac.decodeAudioData(ab); ac.close();
      const sr = buf.sampleRate, a = Math.floor(start * sr), n = Math.min(buf.length - a, Math.floor(dauer * sr));
      if (n <= 0) return null;
      const L = buf.getChannelData(0).slice(a, a + n), R = (buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)).slice(a, a + n);
      return { sr, L, R, n };
    } catch (e) { return null; }
  }
  async function rekorder(W, H, ton) {
    let vcfg = null;
    for (const codec of ['avc1.640028', 'avc1.640032', 'avc1.4d0028', 'avc1.42e028']) {
      const c = { codec, width: W, height: H, bitrate: 8000000, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } };
      try { if ((await VideoEncoder.isConfigSupported(c)).supported) { vcfg = c; break; } } catch (e) { /* weiter */ }
    }
    if (!vcfg) throw new Error('Dieser Browser kann keine Videos bauen – bitte Chrome oder Edge nehmen.');
    let acfg = null;
    if (ton && window.AudioEncoder) for (const br of [192000, 160000, 128000]) {
      const c = { codec: 'mp4a.40.2', sampleRate: ton.sr, numberOfChannels: 2, bitrate: br };
      try { if ((await AudioEncoder.isConfigSupported(c)).supported) { acfg = c; break; } } catch (e) { /* weiter */ }
    }
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS },
      audio: acfg ? { codec: 'aac', numberOfChannels: 2, sampleRate: acfg.sampleRate } : undefined, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
    let fehler = null, n = 0;
    const venc = new VideoEncoder({ output: (ch, m) => muxer.addVideoChunk(ch, m), error: e => { fehler = e; } });
    venc.configure(vcfg);
    let aenc = null;
    if (acfg) {
      aenc = new AudioEncoder({ output: (ch, m) => muxer.addAudioChunk(ch, m), error: e => { fehler = e; } });
      aenc.configure(acfg);
      for (let p = 0; p < ton.n; p += 4096) {
        const m = Math.min(4096, ton.n - p), buf = new Float32Array(m * 2);
        buf.set(ton.L.subarray(p, p + m), 0); buf.set(ton.R.subarray(p, p + m), m);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: ton.sr, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round(p / ton.sr * 1e6), data: buf });
        aenc.encode(ad); ad.close();
      }
    }
    const puffer = new Uint8Array(W * H * 3 / 2), cs = { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false };
    return {
      mitTon: !!acfg,
      async bild(canvas) {
        if (fehler) throw fehler;
        zuI420(canvas.getContext('2d').getImageData(0, 0, W, H).data, W, H, puffer);
        const f = new VideoFrame(puffer, { format: 'I420', codedWidth: W, codedHeight: H, timestamp: Math.round(n * 1e6 / FPS), duration: Math.round(1e6 / FPS), colorSpace: cs });
        venc.encode(f, { keyFrame: n % FPS === 0 }); f.close(); n++;
        while (venc.encodeQueueSize > 8) await warte(4);
      },
      async stop() {
        await venc.flush(); if (aenc) await aenc.flush();
        venc.close(); if (aenc) aenc.close();
        if (fehler) throw fehler;
        muxer.finalize();
        return new Blob([muxer.target.buffer], { type: 'video/mp4' });
      }
    };
  }
  // Länge des Videos: Vorlage (3–15 s), mit Hintergrund-Video höchstens so lang wie das Video
  function dauerVon(v, vid) {
    const d = klemm(v.dauer || 8, 2, MAX_SEK);
    if (!vid) return d;
    const rest = Math.max(1, (vid.duration || d) - (v.hg.videoStart || 0));
    return Math.min(MAX_SEK, v.hg.quelle === 'video' && !animiert(v) ? rest : Math.min(rest, d));
  }
  async function videoFuer(v, p, design, umg, fortschritt) {
    await muxerLaden();
    if (v.hg && v.hg.quelle === 'social') await overlaysLaden();
    const H = HOEHE[v.format], vq = videoQuelle(v, p, umg) || sozVideo(v, p, umg);
    let vid = null;
    if (vq) { vid = await videoElement(vq.url, true); if (!vid) throw new Error('Hintergrund-Video lädt nicht.'); }
    const start = vid ? klemm(v.hg.videoStart || 0, 0, Math.max(0, vid.duration - 0.5)) : 0;
    const dauer = dauerVon(v, vid), laenge = vid ? Math.max(0.2, vid.duration - start) : 1;
    const ton = vq && vq.ton ? await tonLaden(vq.url, start, dauer) : null;
    const c = document.createElement('canvas'); c.width = B; c.height = H;
    const rec = await rekorder(B, H, ton);
    const n = Math.round(dauer * FPS);
    for (let i = 0; i < n; i++) {
      const t = i / FPS;
      if (vid) await suchen(vid, start + (t % laenge));
      await zeichnen(c, v, p, design, umg, { zeit: t, video: vid });
      await rec.bild(c);
      if (fortschritt && i % 15 === 0) fortschritt(i / n);
    }
    const blob = await rec.stop();
    blob.ohneTon = !!(vq && vq.ton) && !rec.mitTon;
    if (vid) { vid.removeAttribute('src'); vid.load(); }
    return blob;
  }

  // ─── Neue Ebenen und Vorschläge ───
  const NEU = {
    text: () => ({ typ: 'text', inhalt: 'NEUER TEXT', x: 80, y: 200, groesse: 90, schrift: 'saira', gewicht: 900, farbe: '#ffffff', verlauf: false, farbe2: '#ffd400', rand: '#000000', randB: 0, box: 'kein', boxFarbe: '#e11324', boxAlpha: 1, schraeg: false, schatten: true, maxB: 920, zeilen: 1, gross: true, ausrichtung: 'links', abstand: 0, drehung: 0 }),
    bild: () => ({ typ: 'bild', quelle: 'pose', datei: 'pose_02_zeigt_auf_dich.png', x: 520, y: 700, b: 520, spiegeln: false, rand: true, schatten: true, schwarzWeg: false, alpha: 1, drehung: 0 }),
    form: () => ({ typ: 'form', art: 'schraeg', x: 60, y: 300, b: 600, h: 120, farbe: '#e11324', farbe2: '', alpha: 0.95, drehung: 0, dicke: 8 }),
    termine: () => ({ typ: 'termine', x: 80, y: 540, b: 920, h: 700, schrift: 'saira', panel: '#14161d', panelAlpha: 0.92, akzent: '#e11324', farbe: '#f4f5f7', farbe2: '#8b929c' }),
    animation: () => ({ typ: 'animation', art: 'ampel', x: 140, y: 300, b: 800, h: 400, farbe: '#e11324', farbe2: '#2563eb', animStart: 0.3, tempo: 1, schrift: 'anton', rand: false })
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
      mit('bild', { x: 590, y: 1260, b: 480, spiegeln: true })] },
    // ── Ausgefallen ──
    { gruppe: 'Ausgefallen', name: 'Magazin-Cover', format: 'story', fuer: ['story'], hg: HG({ dunkel: 0.05, verlauf: 'beide', verlaufStaerke: 0.7 }), elemente: [
      mit('text', { inhalt: 'KREIDS888', x: 540, y: 70, groesse: 230, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', maxB: 1020 }),
      mit('text', { inhalt: 'Ausgabe {datum} · {serie}', x: 540, y: 320, groesse: 34, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', ausrichtung: 'mitte', abstand: 8, maxB: 980 }),
      mit('bild', { x: 250, y: 840, b: 860, rand: false }),
      mit('text', { inhalt: '{spruch}', x: 70, y: 470, groesse: 118, schrift: 'anton', gewicht: 400, zeilen: 2, maxB: 560, effekt: '3d', rand: '#e11324' }),
      mit('text', { inhalt: '{strecke}', x: 72, y: 770, groesse: 74, schrift: 'bebas', gewicht: 400, farbe: '#ffd400', maxB: 520 }),
      mit('form', { art: 'kreis', x: 720, y: 450, b: 260, h: 260, drehung: -12 }),
      mit('text', { inhalt: 'LIVE AB', x: 850, y: 520, groesse: 42, ausrichtung: 'mitte', drehung: -12, schatten: false }),
      mit('text', { inhalt: '{zeit}', x: 850, y: 572, groesse: 84, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', drehung: -12, schatten: false }),
      mit('text', { inhalt: '{livezeile}', x: 540, y: 1770, groesse: 40, schrift: 'barlow', gewicht: 800, ausrichtung: 'mitte', box: 'band', boxFarbe: '#0a0b0e', boxAlpha: 0.85 })] },
    { gruppe: 'Ausgefallen', name: 'Neon-Nacht', format: 'feed', fuer: ['ank'], hg: HG({ dunkel: 0.55, verlauf: 'kein', overlay: 'vignette' }), elemente: [
      mit('form', { art: 'rahmen', x: 40, y: 40, b: 1000, h: 1270, farbe: '#ff2bd6', dicke: 6 }),
      mit('text', { inhalt: '{countdown}', x: 540, y: 110, groesse: 56, schrift: 'orbitron', gewicht: 900, farbe: '#22d3ee', ausrichtung: 'mitte', abstand: 10, effekt: 'neon' }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 400, groesse: 170, schrift: 'racing', gewicht: 400, farbe: '#ff2bd6', ausrichtung: 'mitte', zeilen: 2, maxB: 940, effekt: 'neon' }),
      mit('text', { inhalt: '{spruch}', x: 540, y: 790, groesse: 70, ausrichtung: 'mitte', effekt: 'neon', maxB: 940 }),
      mit('text', { inhalt: '{serie}', x: 540, y: 1010, groesse: 44, schrift: 'orbitron', gewicht: 700, farbe: '#22d3ee', ausrichtung: 'mitte', effekt: 'neon', maxB: 940 }),
      mit('text', { inhalt: '{wochentag} · {live}', x: 540, y: 1090, groesse: 46, schrift: 'barlow', gewicht: 800, ausrichtung: 'mitte', maxB: 940 }),
      mit('bild', { quelle: 'logo', x: 340, y: 1180, b: 400, rand: false })] },
    { gruppe: 'Ausgefallen', name: 'Rennticket', format: 'feed', fuer: ['ank'], hg: HG({ dunkel: 0.4, verlauf: 'kein', overlay: 'raster' }), elemente: [
      mit('form', { art: 'rechteck', x: 90, y: 300, b: 900, h: 760, farbe: '#f4f1ea', alpha: 1, drehung: -4 }),
      mit('form', { art: 'karo', x: 90, y: 300, b: 900, h: 60, feld: 30, farbe: '#0a0b0e', farbe2: '#ffffff', alpha: 1, drehung: -4 }),
      mit('text', { inhalt: 'Race Ticket · Admit One', x: 540, y: 410, groesse: 42, schrift: 'barlow', gewicht: 800, farbe: '#0a0b0e', ausrichtung: 'mitte', abstand: 6, schatten: false, drehung: -4 }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 490, groesse: 150, schrift: 'anton', gewicht: 400, farbe: '#0a0b0e', ausrichtung: 'mitte', schatten: false, maxB: 820, drehung: -4 }),
      mit('text', { inhalt: '{serie} · {runde}', x: 540, y: 670, groesse: 44, schrift: 'barlow', gewicht: 800, farbe: '#e11324', ausrichtung: 'mitte', schatten: false, maxB: 820, drehung: -4 }),
      mit('text', { inhalt: '{wochentag} {datum}', x: 540, y: 760, groesse: 60, schrift: 'bebas', gewicht: 400, farbe: '#0a0b0e', ausrichtung: 'mitte', schatten: false, drehung: -4 }),
      mit('text', { inhalt: 'Gate opens {zeit}', x: 540, y: 860, groesse: 58, schrift: 'bebas', gewicht: 400, farbe: '#0a0b0e', ausrichtung: 'mitte', box: 'box', boxFarbe: '#ffd400', schatten: false, drehung: -4 }),
      mit('text', { inhalt: '{livezeile}', x: 540, y: 1190, groesse: 40, schrift: 'barlow', gewicht: 800, ausrichtung: 'mitte' })] },
    { gruppe: 'Ausgefallen', name: 'Split-Duell', format: 'story', fuer: ['story'], hg: HG({ dunkel: 0.1, verlauf: 'kein' }), elemente: [
      mit('form', { art: 'diagonale', x: 0, y: 0, b: 1080, h: 1920, alpha: 0.88 }),
      mit('text', { inhalt: '{countdown}', x: 80, y: 220, groesse: 66, box: 'box', boxFarbe: '#0a0b0e' }),
      mit('text', { inhalt: '{spruch}', x: 80, y: 360, groesse: 112, schrift: 'anton', gewicht: 400, zeilen: 2, maxB: 720 }),
      mit('text', { inhalt: '● {live}', x: 80, y: 640, groesse: 60, box: 'schraeg', boxFarbe: '#0a0b0e', schraeg: true }),
      mit('text', { inhalt: '{strecke}', x: 900, y: 1150, groesse: 180, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', drehung: -90, maxB: 1400 }),
      mit('bild', { x: 0, y: 1060, b: 760 })] },
    // ── Animiert (geht als Video raus) ──
    { gruppe: 'Animiert', name: 'Startampel', format: 'story', fuer: ['story'], dauer: 7, hg: HG({ dunkel: 0.25, verlauf: 'beide' }), elemente: [
      mit('animation', { art: 'ampel', x: 140, y: 300, b: 800, animStart: 0.3 }),
      mit('text', { inhalt: '{countdown} ist Raceday', x: 540, y: 620, groesse: 60, ausrichtung: 'mitte', box: 'schraeg', schraeg: true, anim: 'links', animStart: 0.2 }),
      mit('text', { inhalt: 'Lights out', x: 540, y: 760, groesse: 110, schrift: 'racing', gewicht: 400, farbe: '#ffd400', ausrichtung: 'mitte', effekt: 'neon', anim: 'zoom', animStart: 3.9, animDauer: 0.4 }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 930, groesse: 190, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', zeilen: 2, maxB: 980, anim: 'aufpoppen', animStart: 4.2, animDauer: 0.5 }),
      mit('form', { art: 'rechteck', x: 0, y: 1250, b: 1080, h: 110, anim: 'rechts', animStart: 4.5 }),
      mit('text', { inhalt: '● {live}', x: 540, y: 1272, groesse: 64, ausrichtung: 'mitte', schatten: false, anim: 'rechts', animStart: 4.6 }),
      mit('bild', { x: 590, y: 1400, b: 470, anim: 'unten', animStart: 4.7 }),
      mit('animation', { art: 'blitz', x: 30, y: 30, b: 90, animStart: 3.6, farbe: '#ffffff' })] },
    { gruppe: 'Animiert', name: 'Alarm Raceday', format: 'story', fuer: ['story'], dauer: 6, hg: HG({ dunkel: 0.4, verlauf: 'beide', overlay: 'scanlines' }), elemente: [
      mit('animation', { art: 'alarm', x: 390, y: 150, b: 300, farbe: '#e11324', farbe2: '#2563eb', rand: true, animStart: 0 }),
      mit('text', { inhalt: 'ALARM', x: 540, y: 520, groesse: 170, schrift: 'blackops', gewicht: 400, farbe: '#ff3b3b', ausrichtung: 'mitte', effekt: 'neon', anim: 'blinken' }),
      mit('text', { inhalt: '{countdown} wird es ernst', x: 540, y: 730, groesse: 58, ausrichtung: 'mitte', box: 'box', boxFarbe: '#111111', anim: 'links', animStart: 0.3 }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 870, groesse: 170, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', zeilen: 2, maxB: 980, effekt: 'glitch', anim: 'glitch' }),
      mit('text', { inhalt: '{serie} · {runde}', x: 540, y: 1090, groesse: 50, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', ausrichtung: 'mitte', maxB: 980 }),
      mit('text', { inhalt: '● {live}', x: 540, y: 1190, groesse: 64, ausrichtung: 'mitte', box: 'schraeg', schraeg: true, anim: 'puls' }),
      mit('bild', { x: 560, y: 1380, b: 500 })] },
    { gruppe: 'Animiert', name: 'Streckenrunde', format: 'feed', fuer: ['ank'], dauer: 8, hg: HG({ dunkel: 0.45, verlauf: 'beide', overlay: 'vignette' }), elemente: [
      mit('text', { inhalt: '{countdown}', x: 80, y: 80, groesse: 56, box: 'schraeg', schraeg: true, anim: 'links', animStart: 0.1 }),
      mit('animation', { art: 'strecke', x: 90, y: 230, b: 900, farbe: '#e11324', farbe2: '#d9dde5', animStart: 0 }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 850, groesse: 140, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', maxB: 980, anim: 'aufpoppen', animStart: 0.4 }),
      mit('text', { inhalt: '{serie} · {runde}', x: 540, y: 1020, groesse: 46, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', ausrichtung: 'mitte', maxB: 980, anim: 'einblenden', animStart: 0.8 }),
      mit('text', { inhalt: '{wochentag} {datum} · {live}', x: 540, y: 1090, groesse: 44, schrift: 'barlow', gewicht: 600, ausrichtung: 'mitte', maxB: 980, anim: 'einblenden', animStart: 1 }),
      mit('bild', { quelle: 'logo', x: 340, y: 1190, b: 400, rand: false, anim: 'einblenden', animStart: 1.3 })] },
    { gruppe: 'Animiert', name: 'Zielflagge', format: 'feed', fuer: ['erg'], dauer: 6, hg: HG({ dunkel: 0.35, verlauf: 'unten' }), elemente: [
      mit('animation', { art: 'flagge', x: 600, y: 70, b: 420, animStart: 0 }),
      mit('text', { inhalt: '{platz}', x: 80, y: 290, groesse: 400, schrift: 'anton', gewicht: 400, effekt: '3d', rand: '#e11324', maxB: 560, anim: 'aufpoppen', animStart: 0.3 }),
      mit('text', { inhalt: '{strecke}', x: 84, y: 810, groesse: 110, schrift: 'anton', gewicht: 400, maxB: 920, anim: 'links', animStart: 0.7 }),
      mit('text', { inhalt: 'Start {startplatz} · {delta} · {punkte}', x: 86, y: 950, groesse: 46, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', maxB: 920, anim: 'einblenden', animStart: 1 }),
      mit('text', { inhalt: '{spruch}', x: 86, y: 1060, groesse: 62, box: 'schraeg', schraeg: true, maxB: 900, anim: 'rechts', animStart: 1.2 }),
      mit('form', { art: 'karo', x: 0, y: 1250, b: 1080, h: 100, feld: 50, farbe: '#0a0b0e', farbe2: '#ffffff', alpha: 1 })] },
    { gruppe: 'Animiert', name: 'Countdown', format: 'story', fuer: ['story'], dauer: 6, hg: HG({ dunkel: 0.5, verlauf: 'beide', overlay: 'rauschen' }), elemente: [
      mit('animation', { art: 'countdown', x: 290, y: 380, b: 500, farbe: '#ffffff', farbe2: '#22c55e', animStart: 0.2 }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 1000, groesse: 170, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', zeilen: 2, maxB: 980, anim: 'aufpoppen', animStart: 2.6 }),
      mit('text', { inhalt: '{serie}', x: 540, y: 1250, groesse: 50, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', ausrichtung: 'mitte', maxB: 980, anim: 'einblenden', animStart: 2.9 }),
      mit('text', { inhalt: '● {live}', x: 540, y: 1340, groesse: 64, ausrichtung: 'mitte', box: 'schraeg', schraeg: true, anim: 'puls', animStart: 3 }),
      mit('animation', { art: 'speed', x: 0, y: 1480, b: 1080, h: 420, farbe: '#ffffff', animStart: 0 })] },
    { gruppe: 'Animiert', name: 'Telemetrie-HUD', format: 'story', fuer: ['story'], dauer: 8, hg: HG({ dunkel: 0.5, verlauf: 'kein', overlay: 'scanlines' }), elemente: [
      mit('form', { art: 'rahmen', x: 60, y: 200, b: 960, h: 1400, farbe: '#22d3ee', dicke: 3, alpha: 0.8 }),
      mit('text', { inhalt: 'TELEMETRY // LIVE', x: 90, y: 230, groesse: 40, schrift: 'orbitron', gewicht: 700, farbe: '#22d3ee', abstand: 12, schatten: false, anim: 'blinken' }),
      mit('text', { inhalt: '{strecke}', x: 90, y: 320, groesse: 120, schrift: 'orbitron', gewicht: 900, maxB: 900, anim: 'glitch' }),
      mit('text', { inhalt: 'Series  {serie}', x: 90, y: 560, groesse: 40, schrift: 'orbitron', gewicht: 700, maxB: 900, anim: 'links', animStart: 0.3 }),
      mit('text', { inhalt: 'Round  {nr}', x: 90, y: 630, groesse: 40, schrift: 'orbitron', gewicht: 700, anim: 'links', animStart: 0.45 }),
      mit('text', { inhalt: 'Start  {zeit}', x: 90, y: 700, groesse: 40, schrift: 'orbitron', gewicht: 700, farbe: '#ffd400', anim: 'links', animStart: 0.6 }),
      mit('animation', { art: 'strecke', x: 120, y: 820, b: 840, farbe: '#22d3ee', farbe2: '#9aa3b2' }),
      mit('bild', { x: 600, y: 1340, b: 440 }),
      mit('text', { inhalt: '{livezeile}', x: 90, y: 1530, groesse: 34, schrift: 'orbitron', gewicht: 700, farbe: '#22d3ee', maxB: 520 })] },
    // ── Mit Video (eigene Videos hochladen; „Video des Rennens“ auf der Post-Karte hat Vorrang) ──
    { gruppe: 'Mit Video', name: 'Video Raceday', format: 'story', fuer: ['story'], dauer: 15, hg: HG({ quelle: 'video', video: 'rennen', dunkel: 0.15, verlauf: 'beide' }), elemente: [
      mit('text', { inhalt: '{countdown} ist Raceday', x: 540, y: 300, groesse: 64, ausrichtung: 'mitte', box: 'schraeg', schraeg: true, anim: 'links', animStart: 0.3 }),
      mit('text', { inhalt: '{strecke}', x: 540, y: 420, groesse: 190, schrift: 'anton', gewicht: 400, ausrichtung: 'mitte', zeilen: 2, maxB: 980, effekt: 'glitch', anim: 'aufpoppen', animStart: 0.6 }),
      mit('text', { inhalt: '{serie} · {runde}', x: 540, y: 660, groesse: 50, schrift: 'barlow', gewicht: 800, farbe: '#ffd400', ausrichtung: 'mitte', maxB: 980, anim: 'einblenden', animStart: 1 }),
      mit('text', { inhalt: '● {live}', x: 540, y: 1560, groesse: 66, ausrichtung: 'mitte', box: 'band', anim: 'rechts', animStart: 1.2 }),
      mit('bild', { quelle: 'logo', x: 290, y: 1700, b: 500, rand: false, anim: 'einblenden', animStart: 1.5 })] },
    { gruppe: 'Mit Video', name: 'Video Reel Ankündigung', format: 'feed', fuer: ['ank'], dauer: 15, hg: HG({ quelle: 'video', video: 'rennen', dunkel: 0.2, verlauf: 'unten' }), elemente: [
      mit('bild', { quelle: 'logo', x: 60, y: 50, b: 380, rand: false }),
      mit('text', { inhalt: '{countdown}', x: 80, y: 820, groesse: 60, box: 'schraeg', schraeg: true, anim: 'links', animStart: 0.3 }),
      mit('text', { inhalt: '{strecke}', x: 80, y: 910, groesse: 150, schrift: 'anton', gewicht: 400, maxB: 920, anim: 'aufpoppen', animStart: 0.6 }),
      mit('text', { inhalt: '{wochentag} {datum} · {live}', x: 82, y: 1090, groesse: 46, schrift: 'barlow', gewicht: 800, maxB: 920, anim: 'einblenden', animStart: 1 })] },
    { gruppe: 'Mit Video', name: 'Video Ergebnis', format: 'feed', fuer: ['erg'], dauer: 15, hg: HG({ quelle: 'video', video: 'rennen', dunkel: 0.3, verlauf: 'unten' }), elemente: [
      mit('text', { inhalt: '{platz}', x: 80, y: 360, groesse: 380, schrift: 'anton', gewicht: 400, effekt: '3d', rand: '#e11324', maxB: 600, anim: 'aufpoppen', animStart: 0.4 }),
      mit('text', { inhalt: '{strecke}', x: 84, y: 860, groesse: 110, schrift: 'anton', gewicht: 400, maxB: 920, anim: 'links', animStart: 0.8 }),
      mit('text', { inhalt: '{spruch}', x: 86, y: 1020, groesse: 62, box: 'schraeg', schraeg: true, maxB: 900, anim: 'rechts', animStart: 1.1 }),
      mit('bild', { quelle: 'logo', x: 60, y: 50, b: 360, rand: false })] }
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
  function vorschauPost() { return postFuer(E.v, E.umg, E.postId); }
  function postFuer(v, umg, postId, typWunsch) {
    const posts = umg.stand().posts || [], arten = typWunsch ? [typWunsch] : (v && v.fuer && v.fuer.length ? v.fuer : FUER[v ? v.format : 'feed'].map(x => x[0]));
    const passt = posts.filter(p => arten.includes(p.typ));
    let p = passt.find(x => x.id === postId) || passt[0];
    if (!p) {
      const r = posts.find(x => x.typ !== 'woche') || {};
      const typ = arten[0] || 'ank';
      p = { ...r, id: 'beispiel', typ, tage: 2, track: r.track || 'Monza', serie: r.serie || 'Porsche Cup', nr: r.nr || 4, startMs: r.startMs || Date.now() + 2 * 86400000, liveMs: r.liveMs || Date.now() + 2 * 86400000,
        ergebnis: typ === 'erg' ? { start: 9, ziel: 3, punkte: 22 } : null, datum: new Date().toISOString().slice(0, 10), bisDatum: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10) };
    }
    return p;
  }
  function listePanel() {
    const l = vorlagen();
    return `<div class="ki-panel"><h3>🧩 Deine Vorlagen (${l.length})</h3><div class="ki-dim" style="margin-bottom:10px">Hier nur bauen. Wo sie drankommen, stellst du im Reiter „🔁 Zuteilung“ ein.</div>
      <div class="kv-liste">${l.map(v => `<button type="button" class="kv-karte${v.id === E.id ? ' an' : ''}${v.an === false ? ' aus' : ''}" data-v="oeffnen" data-id="${esc(v.id)}">
        <canvas data-mini="${esc(v.id)}" width="108" height="${v.format === 'story' ? 192 : 135}"></canvas>
        <span>${esc(v.name)}</span><small>${v.format === 'story' ? 'Story 9:16' : 'Beitrag 4:5'}</small></button>`).join('') || '<p class="hint">Noch keine eigene Vorlage – unten einen Vorschlag nehmen oder leer anfangen.</p>'}</div>
      <div class="ki-knoepfe" style="margin-top:12px"><button class="btn btn-red ki-k" data-v="neuauf"><span>${E.neuOffen ? '✕ Auswahl schließen' : '＋ Neue Vorlage'}</span></button></div>
      ${E.neuOffen ? neuGalerie() : ''}</div>`;
  }
  // Alle Startpunkte als Bilder: leer, meine Vorschläge, alle Social-Designs
  function starter(key) {
    const fmt = E.neuFormat || 'story';
    if (key === 'leer') return { name: 'Neue Vorlage', format: fmt, fuer: [], hg: HG({}), elemente: [mit('text', { inhalt: '{strecke}', x: 80, y: fmt === 'story' ? 700 : 760, groesse: 140, schrift: 'anton', gewicht: 400 })] };
    if (key.startsWith('v')) { const n = kopie(VORSCHLAEGE[+key.slice(1)]); delete n.gruppe; n.elemente.forEach(e => { e.id = neueId(); }); return n; }
    const ov = (window.K888_OVERLAYS || []).find(o => o.id === key.slice(2)) || {};
    return { name: ov.name || 'Social-Design', format: fmt, fuer: [], dauer: ov.anim ? 6 : 8, hg: HG({ quelle: 'social', design: ov.id, designBild: 'rennen', texte: { ...SOZ_TEXT_STD }, designDunkel: 0.6, dunkel: 0, verlauf: 'kein' }), elemente: [] };
  }
  function neuGalerie() {
    const fmt = E.neuFormat || 'story', ovs = window.K888_OVERLAYS || [];
    if (!ovs.length) overlaysLaden().then(() => { if (E.neuOffen) aufbauen(); }).catch(() => {});
    const kachel = (key, name, info) => `<button type="button" class="kv-neu" data-v="neuaus" data-wert="${esc(key)}"><canvas data-nmini="${esc(key)}" width="${fmt === 'story' ? 108 : 120}" height="${fmt === 'story' ? 192 : 150}"></canvas><span>${esc(name)}</span>${info ? `<small>${esc(info)}</small>` : ''}</button>`;
    const gruppe = (titel, inhalt) => inhalt ? `<div class="kv-ngruppe"><b>${esc(titel)}</b><div class="kv-nreihe">${inhalt}</div></div>` : '';
    const vs = gr => VORSCHLAEGE.map((v, i) => [v, i]).filter(([v]) => v.format === fmt && (v.gruppe || 'Klassisch') === gr).map(([v, i]) => kachel('v' + i, v.name, gr === 'Animiert' || gr === 'Mit Video' ? '🎬 Video' : '')).join('');
    return `<div class="kv-galerie">
      <div class="ki-modus" role="group"><button type="button" class="${fmt === 'story' ? 'an' : ''}" data-v="neuformat" data-wert="story">Story 9:16</button><button type="button" class="${fmt === 'feed' ? 'an' : ''}" data-v="neuformat" data-wert="feed">Beitrag 4:5</button></div>
      <div class="ki-dim">${fmt === 'story' ? 'Für Raceday-Story und Wochenplan' : 'Für Ankündigung und Ergebnis'} · Bild anklicken = Vorlage anlegen</div>
      ${gruppe('Leer', kachel('leer', 'Leer anfangen'))}
      ${gruppe('Klassisch', vs('Klassisch'))}${gruppe('Ausgefallen', vs('Ausgefallen'))}${gruppe('Animiert', vs('Animiert'))}${gruppe('Mit Video', vs('Mit Video'))}
      ${gruppe('Social-Designs (wie im Social-Bild)', ovs.map(o => kachel('s:' + o.id, o.name, o.anim ? '🎬 Video' : '')).join('') || '<span class="ki-dim">Lädt …</span>')}
    </div>`;
  }
  async function nMinis() {
    for (const c of E.box.querySelectorAll('canvas[data-nmini]')) {
      if (!E.neuOffen) return;
      const v = starter(c.dataset.nmini), gross = document.createElement('canvas');
      try { await zeichnen(gross, v, postFuer(v, E.umg, ''), E.umg.stand().design, E.umg); if (c.isConnected) c.getContext('2d').drawImage(gross, 0, 0, c.width, c.height); } catch (e) { /* egal */ }
    }
  }
  function aufbauen() {
    const v = E.v;
    E.box.innerHTML = `<div class="kv">
      ${listePanel()}
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
            ${istVideo(v, vorschauPost(), E.umg) ? `<button class="btn btn-ghost ki-k" data-v="spielen"><span>${E.spielt ? '⏸ Stopp' : '▶ Abspielen'}</span></button>` : ''}
            <button class="btn btn-ghost ki-k" data-v="kopie"><span>⧉ Kopie</span></button>
            <button class="btn btn-ghost ki-k" data-v="verwerfen"><span>↺ Verwerfen</span></button>
            <button class="btn btn-ghost ki-k" data-v="loeschen"><span>🗑 Löschen</span></button>
            <span class="kt-dirty">${E.dirty ? '● Noch nicht gespeichert' : ''}</span>
          </div>
        </div>
        <div class="kv-rechts">
          <div class="ki-panel"><h3>Vorlage · ${v.format === 'story' ? 'Story 9:16' : 'Beitrag 4:5'}</h3>
            ${regler('v.dauer', `Video-Länge: ${klemm(v.dauer || 8, 2, MAX_SEK)} Sek. (nur mit Animation oder Video)`, v.dauer || 8, 2, MAX_SEK, 1)}
            <div class="ki-dim">${istVideo(v, vorschauPost(), E.umg) ? '🎬 Diese Vorlage geht als <b>Video</b> raus (Story-Video bzw. Reel, TikTok-Video).' : '🖼 Diese Vorlage geht als Bild raus.'}</div>
          </div>
          <div class="ki-panel"><h3>Ebenen</h3>
            <div class="kt-ebenen">${[...v.elemente].reverse().map(e => `<div class="kt-ebene${e.id === E.sel ? ' an' : ''}" data-v="waehle" data-id="${esc(e.id)}">
              <input type="checkbox" data-sichtbar="${esc(e.id)}" ${e.an !== false ? 'checked' : ''} title="ein/aus"><span>${esc(ebenenName(e))}</span>
              <button type="button" data-v="hoch" data-id="${esc(e.id)}" title="nach vorne">▲</button><button type="button" data-v="runter" data-id="${esc(e.id)}" title="nach hinten">▼</button></div>`).join('')}</div>
            <div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-v="plus" data-typ="text"><span>+ Text</span></button><button class="btn btn-ghost ki-k" data-v="plus" data-typ="bild"><span>+ Bild</span></button><button class="btn btn-ghost ki-k" data-v="plus" data-typ="form"><span>+ Form</span></button>${v.format === 'story' ? '<button class="btn btn-ghost ki-k" data-v="plus" data-typ="termine"><span>+ Termine</span></button>' : ''}</div>
            <div class="kv-bausteine"><span class="ki-dim">✨ Animation dazu:</span>${[['ampel', '🚦 Startampel'], ['alarm', '🚨 Alarm'], ['strecke', '🏎 Strecke'], ['flagge', '🏁 Zielflagge'], ['countdown', '3-2-1 GO'], ['blitz', '⚡ Blitz'], ['speed', '💨 Speed']].map(([k, n]) => `<button type="button" data-v="plusanim" data-art="${k}">${n}</button>`).join('')}</div>
            <div class="ki-dim">Leuchten, Glitch, Umriss, 3D: Text anklicken → „Effekt“. Bewegung: Ebene anklicken → „🎬 Bewegung“.</div>
          </div>
          <div class="ki-panel"><h3>${esc(elAkt() ? ebenenName(elAkt()) : 'Eigenschaften')}</h3>${eigenschaften(elAkt())}</div>
          <div class="ki-panel"><h3>Hintergrund</h3>${hgPanel(v.hg)}</div>
          <div class="ki-panel"><h3>🖼 Eigene Bilder</h3>${ablagePanel()}</div>
          <div class="ki-panel"><h3>🎬 Eigene Videos</h3>${videoPanel()}</div>
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
    minis(); sMinis(); if (E.neuOffen) nMinis();
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
    if (e.typ === 'animation') return '✨ ' + ({ ampel: 'Startampel', alarm: 'Alarm', strecke: 'Streckenrunde', flagge: 'Zielflagge', countdown: 'Countdown', blitz: 'Blitz', speed: 'Speed-Linien' }[e.art] || 'Animation');
    return 'Termine der Woche';
  }
  const regler = (f, name, wert, min, max, schritt) => `<div class="ki-fg"><label>${esc(name)}</label><input type="range" data-f="${f}" min="${min}" max="${max}" step="${schritt}" value="${esc(wert ?? min)}"></div>`;
  function eigenschaften(el) {
    if (!el) return '<div class="ki-dim">Im Bild etwas anklicken.</div>';
    const fa = (f, name) => `<div class="ki-fg"><label>${esc(name)}</label><input type="color" data-f="${f}" value="${esc(el[f] || '#ffffff')}"></div>`;
    const ch = (f, name) => `<label class="chk"><input type="checkbox" data-f="${f}" ${el[f] ? 'checked' : ''}> ${esc(name)}</label>`;
    const sel = (f, name, liste) => `<div class="ki-fg"><label>${esc(name)}</label><select data-f="${f}">${liste.map(([w, n]) => `<option value="${esc(w)}" ${String(el[f]) === String(w) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    const schriftWahl = (f) => `<div class="ki-fg"><label>Schrift</label><select data-f="${f}">${Object.entries(SCHRIFTEN).map(([k, s]) => `<option value="${k}" ${el[f] === k ? 'selected' : ''} style="font-family:'K888V ${esc(s[0])}'">${esc(s[0])}</option>`).join('')}</select></div>`;
    const bewegung = `<div class="kv-anim"><div class="ki-reihe">${sel('anim', '🎬 Bewegung', [['kein', 'Keine'], ['einblenden', 'Einblenden'], ['links', 'Von links rein'], ['rechts', 'Von rechts rein'], ['unten', 'Von unten rein'], ['oben', 'Von oben rein'], ['aufpoppen', 'Aufpoppen'], ['zoom', 'Reinzoomen'], ['puls', 'Pulsieren'], ['blinken', 'Blinken'], ['wackeln', 'Wackeln'], ['glitch', 'Glitch']])}</div>
      ${el.anim && el.anim !== 'kein' ? regler('animStart', `Start nach ${(el.animStart || 0).toFixed(1)} Sek.`, el.animStart || 0, 0, 12, 0.1) + (['puls', 'blinken', 'wackeln', 'glitch'].includes(el.anim) ? '' : regler('animDauer', `Dauer ${(el.animDauer || 0.6).toFixed(1)} Sek.`, el.animDauer || 0.6, 0.1, 3, 0.1)) : ''}</div>`;
    const loeschen = `${bewegung}<div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-v="dup"><span>⧉ Doppeln</span></button><button class="btn btn-ghost ki-k" data-v="weg"><span>✕ Ebene löschen</span></button></div>`;
    if (el.typ === 'text') return `
      <div class="ki-fg"><label>Text</label><input type="text" data-f="inhalt" value="${esc(el.inhalt)}"></div>
      <div class="kv-plh">${PLATZHALTER.split(' ').map(x => `<button type="button" data-v="plh" data-wert="${x}">${x}</button>`).join('')}</div>
      <div class="ki-reihe">${schriftWahl('schrift')}${sel('gewicht', 'Dicke', schriftVon(el.schrift)[2].map(w => [w, { 400: 'Normal', 500: 'Mittel', 600: 'Halbfett', 700: 'Fett', 800: 'Extrafett', 900: 'Black' }[w] || w]))}</div>
      ${regler('groesse', 'Größe', el.groesse, 14, 480, 1)}
      ${regler('maxB', 'Max. Breite', el.maxB, 120, 1080, 10)}
      ${regler('abstand', 'Buchstaben-Abstand', el.abstand, -5, 40, 1)}
      ${regler('drehung', 'Drehen', el.drehung, -90, 90, 1)}
      ${sel('effekt', 'Effekt', [['kein', 'Keiner'], ['neon', 'Neon-Leuchten'], ['glitch', 'Glitch (Farbversatz)'], ['umriss', 'Nur Umriss'], ['3d', '3D-Schatten (Rand-Farbe)']])}
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
        ${regler('drehung', 'Drehen', el.drehung, -90, 90, 1)}
        <div class="ki-reihe">${ch('spiegeln', 'Spiegeln')}${ch('rand', 'Weißer Rand')}${ch('schatten', 'Schatten')}${ch('schwarzWeg', 'Schwarz ausblenden')}</div>${loeschen}`;
    }
    if (el.typ === 'form') return `${sel('art', 'Form', [['rechteck', 'Rechteck'], ['schraeg', 'Schräg'], ['kreis', 'Kreis/Oval'], ['rahmen', 'Rahmen'], ['diagonale', 'Diagonale (Hälfte)'], ['karo', 'Karo (Zielflagge)'], ['streifen', 'Renn-Streifen']])}
      ${el.art === 'karo' ? regler('feld', 'Karo-Größe', el.feld || 40, 8, 200, 1) : ''}
      <div class="ki-reihe">${fa('farbe', 'Farbe')}<label class="chk"><input type="checkbox" data-v="formverlauf" ${el.farbe2 ? 'checked' : ''}> Verlauf</label>${el.farbe2 ? fa('farbe2', 'bis Farbe') : ''}</div>
      ${regler('b', 'Breite', el.b, 4, 1080, 2)}${regler('h', 'Höhe', el.h, 2, 1920, 2)}
      ${el.art === 'rahmen' ? regler('dicke', 'Dicke', el.dicke, 2, 40, 1) : ''}
      ${regler('alpha', 'Deckkraft', el.alpha ?? 1, 0.05, 1, 0.05)}${regler('drehung', 'Drehen', el.drehung, -90, 90, 1)}${loeschen}`;
    if (el.typ === 'termine') return `${schriftWahl('schrift')}
      <div class="ki-reihe">${fa('akzent', 'Akzent')}${fa('panel', 'Kasten')}${fa('farbe', 'Text')}${fa('farbe2', 'Text 2')}</div>
      ${regler('panelAlpha', 'Kasten-Deckkraft', el.panelAlpha ?? 0.92, 0, 1, 0.02)}
      ${regler('b', 'Breite', el.b, 400, 1080, 5)}${regler('h', 'Höhe', el.h, 200, 1500, 5)}
      <div class="ki-dim">Die Termine kommen von selbst aus dem Streamkalender (höchstens 7).</div>${loeschen}`;
    if (el.typ === 'animation') {
      const art = el.art || 'ampel';
      return `${sel('art', 'Animation', [['ampel', '🚦 Startampel'], ['alarm', '🚨 Alarm-Blaulicht'], ['strecke', '🏁 Streckenrunde'], ['flagge', '🏁 Zielflagge (weht)'], ['countdown', '3-2-1-GO'], ['blitz', '⚡ Blitz (ganzes Bild)'], ['speed', '💨 Speed-Linien']])}
        <div class="ki-reihe">${fa('farbe', art === 'strecke' ? 'Auto/Spur' : art === 'countdown' ? 'Zahlen' : 'Farbe 1')}${['alarm', 'strecke', 'countdown'].includes(art) ? fa('farbe2', art === 'strecke' ? 'Strecke' : art === 'countdown' ? 'GO!' : 'Farbe 2') : ''}</div>
        ${regler('b', 'Größe', el.b, 40, 1400, 5)}${art === 'speed' ? regler('h', 'Höhe', el.h || 400, 40, 1920, 5) : ''}
        ${regler('animStart', `Start nach ${(el.animStart || 0).toFixed(1)} Sek.`, el.animStart || 0, 0, 12, 0.1)}
        ${art !== 'blitz' ? regler('tempo', `Tempo ×${(el.tempo || 1).toFixed(1)}`, el.tempo || 1, 0.3, 3, 0.1) : ''}
        ${art === 'countdown' ? schriftWahl('schrift') : ''}${art === 'alarm' ? ch('rand', 'Bildrand blitzt mit') : ''}
        <div class="ki-dim">${{ ampel: 'Lichter gehen nacheinander an, dann „Lights out“ nach 3,6 Sek. Im Standbild: alle 5 an.', alarm: 'Drehendes Blaulicht in zwei Farben.', strecke: 'Ein Punkt fährt die Runde mit Leuchtspur.', flagge: 'Karierte Flagge weht im Wind.', countdown: '3 · 2 · 1 · GO! – je 0,8 Sek.', blitz: 'Weißer Blitz über das ganze Bild, alle 3 Sek. – im Editor nur als ⚡ zu sehen.', speed: 'Schnelle Linien, z. B. unten im Bild.' }[art] || ''}</div>
        <div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-v="dup"><span>⧉ Doppeln</span></button><button class="btn btn-ghost ki-k" data-v="weg"><span>✕ Ebene löschen</span></button></div>`;
    }
    return '';
  }
  function hgPanel(hg) {
    const ab = E.umg.stand().ablage || [];
    const kreids = hg.quelle === 'kreids';
    const vids = E.umg.stand().videos || [];
    const ueber = `<div class="ki-fg"><label>Darüber</label><select data-f="hg.overlay">${[['kein', 'Nichts'], ['scanlines', 'TV-Linien'], ['raster', 'Punkt-Raster'], ['vignette', 'Dunkle Ecken'], ['rauschen', 'Filmkorn'], ['karbon', 'Karbon-Muster']].map(([k, n]) => `<option value="${k}" ${(hg.overlay || 'kein') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
    const ovs = window.K888_OVERLAYS || [];
    if (hg.quelle === 'social' && !ovs.length) overlaysLaden().then(() => aufbauen()).catch(() => {});
    const sozial = hg.quelle === 'social' ? `
      <div class="ki-fg"><label>Social-Design (wie im Social-Bild)</label></div>
      <div class="kv-sgal">${ovs.map(o => `<button type="button" data-v="sdesign" data-wert="${esc(o.id)}" class="${hg.design === o.id ? 'an' : ''}"><canvas data-smini="${esc(o.id)}" width="90" height="${E.v.format === 'story' ? 160 : 112}"></canvas><span>${esc(o.name)}${o.anim ? ' 🎬' : ''}</span></button>`).join('') || '<span class="ki-dim">Lädt …</span>'}</div>
      ${SOZ_FELDER.map(([k, n]) => `<div class="ki-fg"><label>${esc(n)}</label>${k === 'text' ? `<textarea rows="3" data-f="hg.texte.${k}">${esc((hg.texte || {})[k] ?? SOZ_TEXT_STD[k])}</textarea>` : `<input type="text" data-f="hg.texte.${k}" value="${esc((hg.texte || {})[k] ?? SOZ_TEXT_STD[k])}">`}</div>`).join('')}
      <div class="ki-dim">Platzhalter wie oben, z. B. {strecke} {spruch} {platz}. Für den Wochenplan bei Text: {termine}</div>
      <div class="ki-fg"><label>Bild im Design</label><select data-f="hg.designBild">${[['rennen', 'Bild des Rennens'], ['video', '🎬 Video'], ['ablage', 'Eigenes Bild (Ablage)'], ['kein', 'Keins']].map(([k, n]) => `<option value="${k}" ${(hg.designBild || 'rennen') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${hg.designBild === 'video' ? `<div class="ki-fg"><label>Welches Video</label><select data-f="hg.video"><option value="rennen" ${!hg.video || hg.video === 'rennen' ? 'selected' : ''}>Video des Rennens, sonst zufällig</option><option value="zufall" ${hg.video === 'zufall' ? 'selected' : ''}>Zufällig</option>${(E.umg.stand().videos || []).map(x => `<option value="${esc(x.id)}" ${hg.video === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>${regler('hg.videoStart', `Video ab Sekunde ${(hg.videoStart || 0).toFixed(1)}`, hg.videoStart || 0, 0, 120, 0.5)}` : ''}
      ${hg.designBild === 'ablage' ? `<div class="kt-gal">${(E.umg.stand().ablage || []).map(a => `<button type="button" data-v="hgbild" data-wert="${esc(a.id)}" class="${hg.ablage === a.id ? 'an' : ''}"><img src="${esc(a.url)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      ${regler('hg.zoom', 'Bild-Zoom', hg.zoom || 1, 1, 2.5, 0.01)}
      ${regler('hg.designDunkel', 'Abdunkeln im Design', hg.designDunkel ?? 0.6, 0, 1, 0.01)}
      <div class="ki-dim">Deine eigenen Ebenen (Texte, Bilder, Animationen) liegen oben drauf.</div>` : '';
    return `<div class="ki-fg"><label>Hintergrund</label><select data-f="hg.quelle">${[['rennen', 'Bild des Rennens (KI/Kalender)'], ['ablage', 'Eigenes Bild (Ablage)'], ['video', '🎬 Video (eigene Videos)'], ['social', '🎨 Social-Design (Rahmen, TV, Ampel, Neon …)'], ['farbe', 'Nur Farbe'], ['kreids', 'Fertiges Kreids-Design als Grundlage']].map(([k, n]) => `<option value="${k}" ${hg.quelle === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${sozial}
      ${hg.quelle === 'video' ? `<div class="ki-fg"><label>Welches Video</label><select data-f="hg.video"><option value="rennen" ${!hg.video || hg.video === 'rennen' ? 'selected' : ''}>Video des Rennens, sonst zufällig</option><option value="zufall" ${hg.video === 'zufall' ? 'selected' : ''}>Zufällig aus deinen Videos</option>${vids.map(x => `<option value="${esc(x.id)}" ${hg.video === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
        ${regler('hg.videoStart', `Video ab Sekunde ${(hg.videoStart || 0).toFixed(1)}`, hg.videoStart || 0, 0, 120, 0.5)}
        ${vids.length ? '' : '<div class="ki-hinweis">Noch keine Videos – unten bei „🎬 Eigene Videos“ hochladen.</div>'}` : ''}
      ${ueber}
      ${hg.quelle === 'ablage' ? (ab.length ? `<div class="kt-gal">${ab.map(a => `<button type="button" data-v="hgbild" data-wert="${esc(a.id)}" class="${hg.ablage === a.id ? 'an' : ''}" title="${esc(a.name)}"><img src="${esc(a.url)}" alt="" loading="lazy"></button>`).join('')}</div>` : '<div class="ki-dim">Erst unten ein Bild hochladen.</div>') : ''}
      ${hg.quelle === 'social' ? '' : kreids ? '<div class="ki-dim">Das fertige Design (wie bisher) liegt ganz unten – deine Ebenen kommen oben drauf.</div>' : `
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

  function videoPanel() {
    const vids = E.umg.stand().videos || [];
    return `<div class="kv-videos">${vids.map(x => `<div class="kv-ab"><video src="${esc(x.url)}#t=1" muted preload="metadata" playsinline></video><span title="${esc(x.name)}">${esc(x.name)} · ${Math.round(x.dauer || 0)} s</span>
        <button type="button" data-v="vidton" data-id="${esc(x.id)}" data-ton="${x.ton ? '1' : '0'}" title="Ton im fertigen Video">${x.ton ? '🔊' : '🔇'}</button><button type="button" data-v="vidweg" data-id="${esc(x.id)}" title="Löschen">✕</button></div>`).join('')}</div>
      ${E.hochVideo ? `<div class="ki-hinweis">⏳ ${esc(E.hochVideo)}</div>` : ''}
      <label class="chk"><input type="checkbox" class="kv-vton" checked> Ton behalten</label>
      <label class="btn btn-ghost ki-k ki-datei"><span>📤 Video vom PC hochladen</span><input type="file" accept="video/*" data-v="vidhoch"></label>
      <div class="ki-dim">Am besten schon geschnitten (bis 60 MB). Raus gehen höchstens 15 Sekunden. 🔊/🔇 = Ton im fertigen Post an/aus. Auf jeder Post-Karte kannst du einem Rennen ein eigenes Video geben.</div>`;
  }

  let zeichnetGerade = false, nochmal = false, PUFFER = null;
  // Erst unsichtbar fertig zeichnen, dann in einem Rutsch ins sichtbare Bild (kein Flackern)
  async function sichtbarZeichnen(cv, opt) {
    if (!PUFFER) PUFFER = document.createElement('canvas');
    const info = await zeichnen(PUFFER, E.v, opt.post || vorschauPost(), E.umg.stand().design, E.umg, opt);
    if (cv.width !== PUFFER.width || cv.height !== PUFFER.height) { cv.width = PUFFER.width; cv.height = PUFFER.height; }
    cv.getContext('2d').drawImage(PUFFER, 0, 0);
    return info;
  }
  async function neuZeichnen() {
    if (!E || !E.v) return;
    if (zeichnetGerade) { nochmal = true; return; }
    zeichnetGerade = true;
    try {
      const cv = E.box.querySelector('.kv-cv');
      if (cv && !E.spielt) E.info = await sichtbarZeichnen(cv, { auswahl: E.sel, editor: true });
    } finally { zeichnetGerade = false; if (nochmal) { nochmal = false; neuZeichnen(); } }
  }
  async function sMinis() {
    if (!E.v || E.v.hg.quelle !== 'social') return;
    const p = vorschauPost();
    for (const c of E.box.querySelectorAll('canvas[data-smini]')) {
      const gross = document.createElement('canvas');
      try { await zeichnen(gross, { ...kopie(E.v), elemente: [], hg: { ...E.v.hg, design: c.dataset.smini } }, p, E.umg.stand().design, E.umg); c.getContext('2d').drawImage(gross, 0, 0, c.width, c.height); } catch (e) { /* egal */ }
    }
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
  async function abspielen() {
    if (E.spielt) { E.spielt = false; return aufbauen(); }
    E.spielt = true; aufbauen();
    const p = vorschauPost(), vq = videoQuelle(E.v, p, E.umg) || sozVideo(E.v, p, E.umg), vid = vq ? await videoElement(vq.url) : null;
    const dauer = dauerVon(E.v, vid), t0 = performance.now();
    if (vid) { vid.currentTime = E.v.hg.videoStart || 0; vid.play().catch(() => {}); }
    const schritt = async () => {
      if (!E.spielt || !E.v) { if (vid) vid.pause(); return; }
      const t = ((performance.now() - t0) / 1000) % dauer, cv = E.box.querySelector('.kv-cv');
      if (vid && t < 0.05) vid.currentTime = E.v.hg.videoStart || 0;
      if (cv) await sichtbarZeichnen(cv, { post: p, zeit: t, video: vid, editor: true });
      requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
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
    else if (e.typ === 'animation') e.b = Math.round(Math.min(1400, Math.max(40, e.b * f)));
    geaendert(false);
  }

  // ─── Eingaben ───
  function eingabe(ev) {
    const t = ev.target;
    const typ = t.dataset.typ;
    if (!E.v) return;
    if (t.dataset.v === 'post' && ev.type === 'change') { E.postId = t.value; return neuZeichnen(); }
    if (t.dataset.v === 'abhoch' && ev.type === 'change') return hochladen(t);
    if (t.dataset.v === 'vidhoch' && ev.type === 'change') return videoHochladen(t);
    if (t.dataset.sichtbar !== undefined && ev.type === 'change') { const e = E.v.elemente.find(x => x.id === t.dataset.sichtbar); if (e) { e.an = t.checked; geaendert(true); } return; }
    if (t.dataset.fuer && ev.type === 'change') { const s = new Set(E.v.fuer || []); t.checked ? s.add(t.dataset.fuer) : s.delete(t.dataset.fuer); E.v.fuer = [...s]; return geaendert(true); }
    if (t.dataset.serie !== undefined && ev.type === 'change') { const s = new Set(E.v.serien || []); t.checked ? s.add(t.dataset.serie) : s.delete(t.dataset.serie); E.v.serien = [...s]; return geaendert(false); }
    const f = t.dataset.f; if (!f) return;
    let wert = t.type === 'checkbox' ? t.checked : t.type === 'range' ? parseFloat(t.value) : t.value;
    if (f === 'v.name') { E.v.name = wert; return geaendert(false); }
    if (f === 'v.an') { E.v.an = wert; return geaendert(false); }
    if (f === 'v.dauer') { E.v.dauer = wert; const l = t.closest('.ki-fg').querySelector('label'); if (l) l.textContent = `Video-Länge: ${wert} Sek. (nur mit Animation oder Video)`; return geaendert(false); }
    if (f.startsWith('hg.texte.')) { E.v.hg.texte = { ...SOZ_TEXT_STD, ...(E.v.hg.texte || {}), [f.slice(9)]: wert }; return geaendert(false); }
    if (f.startsWith('hg.')) {
      E.v.hg[f.slice(3)] = wert;
      if (f === 'hg.quelle' && wert === 'social' && !E.v.hg.design) E.v.hg.design = ((window.K888_OVERLAYS || [])[0] || {}).id || 'rennbericht';
      return geaendert(ev.type === 'change' && ['hg.quelle', 'hg.verlauf', 'hg.streifen', 'hg.video', 'hg.designBild'].includes(f));
    }
    const e = elAkt(); if (!e) return;
    if (f === 'gewicht' || f === 'zeilen') wert = parseInt(wert, 10);
    e[f] = wert;
    if (f === 'schrift') e.gewicht = gewichtVon(wert, e.gewicht || 900);
    if (t.type === 'range' && ['animStart', 'animDauer', 'tempo'].includes(f)) { const l = t.closest('.ki-fg').querySelector('label'); if (l) l.textContent = f === 'tempo' ? `Tempo ×${wert.toFixed(1)}` : f === 'animStart' ? `Start nach ${wert.toFixed(1)} Sek.` : `Dauer ${wert.toFixed(1)} Sek.`; }
    geaendert(ev.type === 'change' && ['verlauf', 'box', 'quelle', 'art', 'schrift', 'anim', 'effekt'].includes(f));
  }
  async function hochladen(input) {
    const f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    try { const a = await E.umg.ablageHoch(f); E.umg.meldung('Bild gespeichert.'); const e = elAkt(); if (e && e.typ === 'bild' && e.quelle === 'ablage') { e.datei = a.id; geaendert(true); } else aufbauen(); }
    catch (e) { E.umg.meldung(e.message, 1); }
  }
  async function videoHochladen(input) {
    const f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    const ton = !!(E.box.querySelector('.kv-vton') || {}).checked;
    try {
      E.hochVideo = 'Video wird hochgeladen …'; aufbauen();
      await E.umg.videoHoch(f, ton, x => { E.hochVideo = `Video wird hochgeladen … ${Math.round(x * 100)} %`; const h = E.box.querySelector('.kv-videos + .ki-hinweis'); if (h) h.textContent = '⏳ ' + E.hochVideo; });
      E.hochVideo = ''; E.umg.meldung('Video gespeichert.'); aufbauen();
    } catch (e) { E.hochVideo = ''; aufbauen(); E.umg.meldung(e.message, 1); }
  }
  async function klick(ev) {
    if (ev.target.matches && ev.target.matches('input[data-sichtbar]')) return;
    const b = ev.target.closest('[data-v]'); if (!b || !E.box.contains(b) || b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type !== 'checkbox')) return;
    const v = b.dataset.v, id = b.dataset.id;
    const knopf = async fn => { const sp = b.querySelector('span'), alt = sp ? sp.textContent : ''; b.disabled = true; if (sp) sp.textContent = '⏳ …'; try { await fn(); } catch (e) { E.umg.meldung(e.message, 1); } finally { if (b.isConnected) { b.disabled = false; if (sp) sp.textContent = alt; } } };
    if (v === 'spielen') return abspielen();
    if (v === 'vidton') return knopf(async () => {
      const an = b.dataset.ton !== '1';
      await E.umg.igApi('POST', `/api/video/${encodeURIComponent(id)}/ton`, { ton: an });
      const x = (E.umg.stand().videos || []).find(y => y.id === id); if (x) x.ton = an; aufbauen();
    });
    if (v === 'vidweg') return knopf(async () => {
      if (!confirm('Dieses Video löschen? Posts, die es nutzen, werden ohne Video neu gezeichnet.')) return;
      await E.umg.igApi('POST', `/api/video/${encodeURIComponent(id)}/weg`, {});
      E.umg.stand().videos = (E.umg.stand().videos || []).filter(x => x.id !== id); aufbauen();
    });
    if (v === 'oeffnen') {
      if (E.dirty && E.id !== id && !confirm('Änderungen an der offenen Vorlage verwerfen?')) return;
      const x = vorlagen().find(y => y.id === id); E.v = x ? kopie(x) : null; E.id = id; E.sel = ''; E.dirty = false; E.postId = ''; E.spielt = false; return aufbauen();
    }
    if (v === 'neuauf') { E.neuOffen = !E.neuOffen; return aufbauen(); }
    if (v === 'neuformat') { E.neuFormat = b.dataset.wert; return aufbauen(); }
    if (v === 'neuaus') {
      if (E.dirty && !confirm('Änderungen an der offenen Vorlage verwerfen?')) return;
      const n = starter(b.dataset.wert);
      E.spielt = false; E.neuOffen = false;
      n.an = true; n.serien = [];
      E.v = n; E.id = ''; E.sel = ''; E.postId = ''; E.dirty = true;
      return aufbauen();
    }
    if (!E.v && v !== 'abweg' && v !== 'abnimm') return;
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
    if (v === 'sdesign') { E.v.hg.design = b.dataset.wert; return geaendert(true); }
    if (v === 'plusanim') { const n = mit('animation', { art: b.dataset.art, ...({ alarm: { x: 390, y: 150, b: 300 }, strecke: { x: 90, y: 260, b: 900 }, flagge: { x: 600, y: 80, b: 420 }, countdown: { x: 290, y: 400, b: 500, farbe: '#ffffff', farbe2: '#22c55e' }, blitz: { x: 30, y: 30, b: 90, farbe: '#ffffff', animStart: 1 }, speed: { x: 0, y: HOEHE[E.v.format] - 440, b: 1080, h: 420, farbe: '#ffffff', animStart: 0 } }[b.dataset.art] || {}) }); E.v.elemente.push(n); E.sel = n.id; return geaendert(true); }
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
    if (v === 'speichern') return knopf(async () => {
      const d = await E.umg.igApi('POST', '/api/vorlage', { vorlage: { ...kopie(E.v), id: E.id || undefined } });
      E.id = d.id; E.v.id = d.id; E.v.v = d.v; E.dirty = false;
      const l = vorlagen(), i = l.findIndex(x => x.id === d.id);
      if (i >= 0) l[i] = kopie(E.v); else l.push(kopie(E.v));
      E.umg.meldung((E.v.fuer || []).length ? 'Vorlage gespeichert.' : 'Vorlage gespeichert – im Reiter „🔁 Zuteilung“ anhaken, wo sie drankommt.'); await E.umg.gespeichert();
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

  // ═══ Reiter „🔁 Zuteilung“: welche Vorlagen kommen bei welcher Art dran, Wechsel, Serien ═══
  let Z = null;
  const zVorlagen = () => Z.umg.stand().vorlagen || [];
  function zuteilung(box, umg) {
    if (!Z) Z = { box: null, umg };
    Z.umg = umg;
    if (Z.box !== box) { Z.box = box; box.addEventListener('change', zEingabe); box.addEventListener('click', zKlick); }
    zAufbauen();
  }
  function zAufbauen() {
    const cfg = Z.umg.stand().cfg.vorlagen || {}, l = zVorlagen();
    const art = ([typ, name]) => {
      const c = cfg[typ] || {}, fmt = formatVon(typ), passend = l.filter(v => v.format === fmt);
      const dabei = passend.filter(v => (v.fuer || []).includes(typ));
      const kachel = (id, name, an, extra) => `<label class="kv-kachel${an ? ' an' : ''}"><canvas data-zmini="${esc(id)}" data-typ="${typ}" width="${fmt === 'story' ? 120 : 150}" height="${fmt === 'story' ? 213 : 188}"></canvas>
          <span><input type="checkbox" ${extra} ${an ? 'checked' : ''}> ${esc(name)}</span></label>`;
      return `<div class="ki-panel"><div class="kv-wkopf"><h3>${name}</h3><span class="ki-dim">${fmt === 'story' ? 'Story 9:16' : 'Beitrag 4:5'} · ${dabei.length + (c.kreids !== false ? 1 : 0)} im Wechsel</span>
          <select data-w="modus" data-typ="${typ}">${[['reihe', 'Der Reihe nach'], ['zufall', 'Zufällig'], ['fest', 'Immer dieselbe']].map(([k, n]) => `<option value="${k}" ${(c.modus || 'reihe') === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
          ${(c.modus || 'reihe') === 'fest' ? `<select data-w="fest" data-typ="${typ}"><option value="kreids">Kreids-Design</option>${dabei.map(v => `<option value="${esc(v.id)}" ${c.fest === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : ''}</div>
        <div class="kv-kacheln">${kachel('kreids', 'Kreids-Design', c.kreids !== false, `data-w="kreids" data-typ="${typ}"`)}${passend.map(v => kachel(v.id, v.name, (v.fuer || []).includes(typ), `data-zuord="${esc(v.id)}" data-typ="${typ}"`)).join('')}</div>
        ${passend.length ? '' : `<div class="ki-dim">Noch keine ${fmt === 'story' ? 'Story' : 'Beitrag'}-Vorlage gebaut – im Reiter „🧩 Vorlagen“ anlegen.</div>`}</div>`;
    };
    const serien = [...new Set([...(Z.umg.stand().posts || []).map(p => p.serie).filter(Boolean), ...l.flatMap(v => v.serien || [])])].sort();
    Z.box.innerHTML = `<div class="kv">
      <p class="hint">Haken an = diese Vorlage kommt bei dieser Art dran. Mehrere Haken = sie wechseln sich ab.</p>
      <div class="ki-grid">${ARTEN.map(art).join('')}</div>
      <div class="ki-panel"><h3>🏁 Nur für bestimmte Serien</h3>
        <div class="ki-dim" style="margin-bottom:8px">Ohne Haken gilt eine Vorlage für alle Serien. Gibt es für eine Serie eigene Vorlagen, kommen bei ihr nur diese dran.</div>
        ${l.length && serien.length ? `<table class="kv-serien"><tr><th></th>${serien.map(s => `<th>${esc(s)}</th>`).join('')}</tr>${l.map(v => `<tr><td>${esc(v.name)} <span class="ki-dim">${v.format === 'story' ? 'Story' : 'Beitrag'}</span></td>${serien.map(s => `<td><input type="checkbox" data-zserie="${esc(v.id)}" data-wert="${esc(s)}" ${(v.serien || []).includes(s) ? 'checked' : ''}></td>`).join('')}</tr>`).join('')}</table>` : '<div class="ki-dim">Noch keine Vorlagen oder Serien.</div>'}
      </div>
      <div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-z="verteilen"><span>🔀 Offene Posts neu verteilen</span></button></div>
      <div class="ki-dim">Neue Posts bekommen ihre Vorlage beim Öffnen. Schon verteilte behalten sie – außer du klickst „Neu verteilen“. Auf jeder Post-Karte kannst du sie auch einzeln ändern.</div>
    </div>`;
    zMinis();
  }
  const KREIDS_MINI = new Map();
  async function zMinis() {
    for (const c of Z.box.querySelectorAll('canvas[data-zmini]')) {
      const id = c.dataset.zmini, typ = c.dataset.typ, g = c.getContext('2d');
      try {
        if (id === 'kreids') {
          const p = postFuer(null, Z.umg, '', typ);
          if (!KREIDS_MINI.has(typ)) KREIDS_MINI.set(typ, window.K888Bilder.post({ ...p, klassen: p.klassen || [] }, Z.umg.stand().design).then(b => createImageBitmap(b)).catch(() => null));
          const img = await KREIDS_MINI.get(typ); if (img) g.drawImage(img, 0, 0, c.width, c.height);
        } else {
          const v = zVorlagen().find(x => x.id === id); if (!v) continue;
          const gross = document.createElement('canvas');
          await zeichnen(gross, kopie(v), postFuer(v, Z.umg, '', typ), Z.umg.stand().design, Z.umg);
          g.drawImage(gross, 0, 0, c.width, c.height);
        }
      } catch (e) { /* egal */ }
    }
  }
  async function vorlageSpeichernMeta(v, aenderung, box) {
    const neu = { ...kopie(v), ...aenderung };
    if (box) box.disabled = true;
    try {
      await Z.umg.igApi('POST', '/api/vorlage', { vorlage: neu });
      Object.assign(v, aenderung);
      if (E && E.v && E.id === v.id && !E.dirty) Object.assign(E.v, kopie(aenderung));
      return true;
    } catch (e) { Z.umg.meldung(e.message, 1); if (box) { box.checked = !box.checked; box.disabled = false; } return false; }
  }
  async function zEingabe(ev) {
    const t = ev.target, typ = t.dataset.typ;
    if (t.dataset.w) {
      const cfg = Z.umg.stand().cfg, v = { ...(cfg.vorlagen || {}) };
      v[typ] = { modus: 'reihe', kreids: true, ...(v[typ] || {}), [t.dataset.w]: t.type === 'checkbox' ? t.checked : t.value };
      try { await Z.umg.cfgSpeichern(v); Z.umg.meldung('Gespeichert.'); } catch (e) { Z.umg.meldung(e.message, 1); }
      return zAufbauen();
    }
    if (t.dataset.zuord) {
      const v = zVorlagen().find(x => x.id === t.dataset.zuord); if (!v) return;
      const s = new Set(v.fuer || []); t.checked ? s.add(typ) : s.delete(typ);
      if (await vorlageSpeichernMeta(v, { fuer: [...s] }, t)) Z.umg.meldung(t.checked ? `„${v.name}“ kommt jetzt bei ${(ARTEN.find(a => a[0] === typ) || [])[1]} dran.` : `„${v.name}“ ist dort raus.`);
      return zAufbauen();
    }
    if (t.dataset.zserie) {
      const v = zVorlagen().find(x => x.id === t.dataset.zserie); if (!v) return;
      const s = new Set(v.serien || []); t.checked ? s.add(t.dataset.wert) : s.delete(t.dataset.wert);
      if (await vorlageSpeichernMeta(v, { serien: [...s] }, t)) Z.umg.meldung('Gespeichert.');
    }
  }
  async function zKlick(ev) {
    const b = ev.target.closest('[data-z]'); if (!b || !Z.box.contains(b)) return;
    if (b.dataset.z === 'verteilen') {
      if (!confirm('Alle offenen Posts bekommen neu ihre Vorlage nach deiner Zuteilung – auch einzeln gewählte. Weiter?')) return;
      b.disabled = true;
      try { await Z.umg.igApi('POST', '/api/vorlagen/verteilen', {}); Z.umg.meldung('Neu verteilt – die Bilder werden neu gezeichnet.'); await Z.umg.gespeichert(); }
      catch (e) { Z.umg.meldung(e.message, 1); b.disabled = false; }
    }
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
#instaApp .kv-wz{padding:10px 0;border-top:1px solid var(--line)}
#instaApp .kv-wkopf{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
#instaApp .kv-wkopf b{min-width:150px}#instaApp .kv-wz select{width:auto}
#instaApp .kv-zuord{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px}
#instaApp .kv-wkopf h3{margin:0}
#instaApp .kv-sgal{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:420px;overflow:auto;margin-bottom:10px}
#instaApp .kv-sgal button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px;background:#0b0c10;border:2px solid var(--line);color:#fff;cursor:pointer;font-size:11px}
#instaApp .kv-sgal button.an{border-color:var(--red)}#instaApp .kv-sgal canvas{width:100%;height:auto;background:#000}
#instaApp .kv-galerie{margin-top:12px;border-top:1px solid var(--line);padding-top:12px}
#instaApp .kv-galerie .ki-modus{display:inline-flex;margin-bottom:6px}
#instaApp .kv-ngruppe{margin-top:14px}#instaApp .kv-ngruppe b{display:block;margin-bottom:6px}
#instaApp .kv-nreihe{display:flex;flex-wrap:wrap;gap:8px}
#instaApp .kv-neu{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;background:#0b0c10;border:2px solid var(--line);color:#fff;cursor:pointer;font-size:12px;width:136px}
#instaApp .kv-neu:hover{border-color:var(--red)}#instaApp .kv-neu canvas{background:#000;width:100%;height:auto}#instaApp .kv-neu small{color:var(--steel)}
#instaApp .kv-bausteine{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}
#instaApp .kv-bausteine button{background:#0d0e13;border:1px solid var(--line);color:#fff;font-size:13px;padding:6px 10px;cursor:pointer}
#instaApp .kv-bausteine button:hover{border-color:var(--red)}
#instaApp .kv-kacheln{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
#instaApp .kv-kachel{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;background:#0b0c10;border:2px solid var(--line);cursor:pointer;font-size:13px;max-width:170px}
#instaApp .kv-kachel.an{border-color:var(--red)}
#instaApp .kv-kachel canvas{background:#000;display:block}
#instaApp .kv-kachel span{display:flex;align-items:center;gap:6px;text-align:center}
#instaApp .kv-kachel input{accent-color:var(--red);width:16px;height:16px}
#instaApp .kv-serien{border-collapse:collapse;font-size:14px}
#instaApp .kv-serien th,#instaApp .kv-serien td{padding:6px 10px;border-bottom:1px solid var(--line);text-align:center}
#instaApp .kv-serien td:first-child{text-align:left}
#instaApp .kv-serien input{accent-color:var(--red);width:16px;height:16px}
#instaApp .kv-plh{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 10px}
#instaApp .kv-plh button{background:#0d0e13;border:1px solid var(--line);color:var(--steel);font-size:12px;padding:3px 6px;cursor:pointer}
#instaApp .kv-plh button:hover{color:#fff;border-color:var(--red)}
#instaApp .kv-ablage{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
#instaApp .kv-ab{position:relative;border:1px solid var(--line);background:#14161d;padding:4px;font-size:11px}
#instaApp .kv-ab img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block}
#instaApp .kv-ab span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--steel)}
#instaApp .kv-ab button{position:absolute;top:4px;width:24px;height:24px;border:1px solid var(--line);background:#0b0c10;color:#fff;cursor:pointer;padding:0}
#instaApp .kv-ab button[data-v="abnimm"],#instaApp .kv-ab button[data-v="vidton"]{left:4px}#instaApp .kv-ab button[data-v="abweg"],#instaApp .kv-ab button[data-v="vidweg"]{right:4px}
#instaApp .kv-videos{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px}
#instaApp .kv-videos video{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000}
#instaApp .kv-anim{border-top:1px dashed var(--line);margin-top:10px;padding-top:8px}
#instaApp .kv-anim select{width:auto}`;
  document.head.appendChild(css);

  window.K888Vorlagen = { editor, zuteilung, zeichnen, bildFuer, videoFuer, istVideo, VORSCHLAEGE, SCHRIFTEN, formatVon, ARTEN };
})();
