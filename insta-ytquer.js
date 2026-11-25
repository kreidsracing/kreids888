// ═══════════════════════════════════════════════════════════
// Kreids888 · ▶ YouTube-Videos quer 16:9 (NEU 25.11.2026) im Reiter „🎬 Clips“ des Instagram-Bereichs
// • Vorrat: der Toolbox-Ordner „youtube“ (Schnitt → „Fertig → YouTube“). Der Browser liest ihn direkt vom PC (nur lesen).
// • Ein Video öffnen: Titel, Text, Thumbnail und Termin.
// • Thumbnail-Editor (NEU 25.11.2026 abends): gezeichnet wie das Renn-Thumbnail (insta-thumb.js). Ebenen anklicken, ziehen,
//   Mausrad = Größe. Looks (Crash Rot, Neon, Gelb-Schwarz), 🎲 Neue Variante, Pfeil und Kreis, Ich-Bilder, Team-Bilder, Logo,
//   eigene Bilder (vom PC oder Fotos aus der Toolbox). Hintergrund: Bild aus dem Video (🔍 schärfstes Bild, ± 1,5 s) oder ein
//   eigenes Bild, dazu Schärfe, Kontrast, Farbe, Helligkeit. Der Look wird fürs nächste Video gemerkt (im Browser).
// • „Hochladen & einplanen“: das Video geht so, wie es ist, direkt vom PC zu YouTube – privat, egal wie groß.
//   Öffentlich wird es erst zum Termin und nach deiner Freigabe (das macht der Worker kreids-insta alle 10 Minuten).
// • Titel bekommt die Pflicht-Hashtags #simracing #iracing #gt3 #crash (Worker), kein #shorts (quer ist ein normales Video).
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GROSS = t => String(t || '').toLocaleUpperCase('de-DE');
  const site = () => (window.K888Bilder && window.K888Bilder.SITE) || (/(^|\.)kreids888\.com$/.test(location.hostname) ? location.origin + '/' : location.origin + '/site/');
  const TB = 1280, TH = 720;   // Thumbnail (YouTube empfiehlt 1280 × 720, höchstens 2 MB; der Worker nimmt bis 0,9 MB)
  const ROT = '#e11324', GELB = '#ffd23d';
  let UMG = null, BOX = null;
  const Q = { ordner: null, stand: '', liste: [], bilder: new Map(), malt: false, ed: null, arbeit: '', zeigen: '' };   // stand: '' nie verbunden · 'fragen' Freigabe nötig · 'ok'
  Object.assign(Q, { fotoOrdner: null, fotoStand: '', fotos: [], fotoUrl: new Map(), fotosAuf: false });   // 📸 Fotos aus der Toolbox (für den Thumbnail-Hintergrund)
  const stand = () => (UMG && UMG.stand && UMG.stand()) || {};
  const quers = () => (stand().clips || []).filter(c => c && c.quer);
  const quelleVon = name => ('ytq:' + name).replace(/[^A-Za-z0-9_:.-]/g, '').slice(0, 160);   // so speichert der Worker „quelle“
  const eingeplant = name => quers().some(c => c.quelle === quelleVon(name));
  const kann = () => typeof window.showDirectoryPicker === 'function' && !!window.indexedDB;
  const sek = s => { s = Math.max(0, Math.round(s || 0)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} Min.` : `${s} s`; };
  const mb = b => `${Math.round((b || 0) / 1e5) / 10} MB`.replace('.', ',');
  const zeit = ms => new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const lokal = ms => { const d = new Date(ms), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };

  // ─── Ordner „youtube“ merken (gleiche kleine Datenbank wie der Vorrat „insta-ablage“) ───
  let DB = null;
  const db = () => DB || (DB = new Promise((ok, nein) => { const r = indexedDB.open('k888_ablage', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => ok(r.result); r.onerror = () => nein(r.error); }));
  const tx = async (modus, fn) => { const d = await db(); return new Promise((ok, nein) => { const t = d.transaction('h', modus), q = fn(t.objectStore('h')); t.oncomplete = () => ok(q && q.result); t.onerror = t.onabort = () => nein(t.error); }); };

  async function lesen() {   // jede MP4 im Ordner ist ein Video (Cam-Dateien gibt es dort nicht)
    const liste = [];
    for await (const [name, e] of Q.ordner.entries()) {
      if (e.kind !== 'file' || !/\.mp4$/i.test(name) || / Cam\.mp4$/i.test(name)) continue;
      let f = null; try { f = await e.getFile(); } catch (err) { continue; }
      liste.push({ name: name.slice(0, -4), datei: e, zeit: f.lastModified, groesse: f.size });
    }
    Q.liste = liste.sort((a, b) => b.zeit - a.zeit);
  }
  async function starten() {   // beim Öffnen des Reiters: gemerkten Ordner wieder lesen
    if (!kann() || Q.stand === 'ok') return;
    try {
      const h = await tx('readonly', o => o.get('ordnerYt')); if (!h) return;
      Q.ordner = h;
      if ((await h.queryPermission({ mode: 'read' })) !== 'granted') { Q.stand = 'fragen'; return zeichnen(); }
      await lesen(); Q.stand = 'ok'; zeichnen(); bilder();
    } catch (e) { Q.stand = Q.ordner ? 'fragen' : ''; zeichnen(); }
  }
  async function verbinden() {   // Knopf: Ordner wählen (oder nach einem Neustart wieder freigeben)
    if (!kann()) return UMG.meldung('Das geht nur in Chrome oder Edge am PC.', 1);
    try {
      if (Q.ordner && Q.stand === 'fragen') { if ((await Q.ordner.requestPermission({ mode: 'read' })) !== 'granted') return; }
      else { const h = await window.showDirectoryPicker({ id: 'k888-youtube', mode: 'read' }); Q.ordner = h; try { await tx('readwrite', o => o.put(h, 'ordnerYt')); } catch (e) { /* dann nur bis zum Neuladen */ } }
      await lesen(); Q.stand = 'ok'; zeichnen(); bilder();
      UMG.meldung(Q.liste.length ? `${Q.liste.length} ${Q.liste.length === 1 ? 'Video' : 'Videos'} im Ordner „youtube“.` : 'Ordner verbunden. Noch kein Video drin: in der Toolbox „Fertig → YouTube“.');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      Q.stand = Q.ordner ? 'fragen' : ''; zeichnen(); UMG.meldung('Der Ordner lässt sich nicht lesen. Bitte neu verbinden.', 1);
    }
  }
  async function bilder() {   // kleine Standbilder für die Kacheln, eins nach dem anderen (nur im Speicher)
    if (Q.malt || Q.stand !== 'ok') return;
    Q.malt = true;
    try {
      for (const x of Q.liste.slice(0, 24)) {
        const k = x.name + '|' + x.zeit; if (Q.bilder.has(k)) continue;
        let url = '', src = '';
        try {
          url = URL.createObjectURL(await x.datei.getFile());
          const v = await videoLaden(url);
          x.dauer = v.duration || 0;
          await springen(v, Math.min(Math.max(1, (v.duration || 2) * 0.4), Math.max(0, (v.duration || 1) - 0.2)));
          const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; cv.getContext('2d').drawImage(v, 0, 0, 320, 180);
          src = cv.toDataURL('image/jpeg', 0.75); v.removeAttribute('src'); v.load();
        } catch (e) { src = ''; }
        if (url) URL.revokeObjectURL(url);
        Q.bilder.set(k, src);
        const img = BOX && BOX.querySelector(`.kq-kachel[data-k="${CSS.escape(k)}"] .kq-kbild`);
        if (img) img.innerHTML = src ? `<img src="${src}" alt="">` : '▶';
        const d = BOX && BOX.querySelector(`.kq-kachel[data-k="${CSS.escape(k)}"] .kq-kdauer`);
        if (d && x.dauer) d.textContent = sek(x.dauer);
      }
    } finally { Q.malt = false; }
  }
  function videoLaden(url) {
    return new Promise((ok, nein) => {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.onloadeddata = () => ok(v); v.onerror = () => nein(new Error('Dieses Video kann der Browser nicht öffnen.'));
      v.src = url;
    });
  }
  function springen(v, t) {   // zu einer Stelle und warten, bis das Bild da ist
    return new Promise(ok => {
      let fertig = false; const weiter = () => { if (!fertig) { fertig = true; ok(); } };
      v.addEventListener('seeked', weiter, { once: true }); setTimeout(weiter, 2500);
      try { v.currentTime = Math.max(0, t); } catch (e) { weiter(); }
    });
  }

  // ─── Vorschlag für Titel, Text und Thumbnail aus dem Dateinamen (alles änderbar) ───
  // „Red Bull Ring Compilation 2026-11-25“ → Crash Compilation – Red Bull Ring · CRASH / COMPILATION / RED BULL RING · 25.11.2026
  function vorschlag(name) {
    const m = String(name).match(/(\d{4})-(\d{2})-(\d{2})/), datum = m ? `${m[3]}.${m[2]}.${m[1]}` : '';
    const rest = String(name).replace(/\d{4}-\d{2}-\d{2}(?:[ _]\d{2}-\d{2}(?:-\d{2})?)?/g, ' ').replace(/\(\d+\)/g, ' ').replace(/\s+/g, ' ').trim();
    if (/compilation/i.test(rest)) {
      const ort = rest.replace(/\s*compilation\s*/i, ' ').replace(/\s+/g, ' ').trim();
      return { titel: `Crash Compilation${ort ? ' – ' + ort : ''}`.slice(0, 80),
        text: `Die heftigsten Crashes und Dreher vom Rennen${ort ? ' in ' + ort : ''}${datum ? ` (${datum})` : ''} 💥\nWelcher war der schlimmste? Schreib es in die Kommentare 👇`,
        z1: 'CRASH', z2: 'COMPILATION', z3: GROSS([ort, datum].filter(Boolean).join(' · ')) };
    }
    return { titel: (rest || 'Simracing').slice(0, 80), text: `${rest || 'Simracing'}${datum ? ` (${datum})` : ''}\nWas sagst du dazu? Schreib es in die Kommentare 👇`, z1: GROSS(rest).slice(0, 28), z2: '', z3: datum };
  }

  // ═══ Thumbnail (NEU 25.11.2026): Zeichnen wie beim Renn-Thumbnail (insta-thumb.js), Ebenen zum Anklicken und Ziehen ═══
  // Zeichenfläche 1920 × 1080 (wie insta-thumb.js), die Datei für YouTube wird 1280 × 720.
  let SCHRIFT = null;
  function schriften() {
    if (!SCHRIFT) SCHRIFT = Promise.all([['K8QAnton', 'anton-latin-400-normal.woff2', '400'], ['K8QSaira', 'saira-condensed-latin-800-normal.woff2', '800']]
      .map(([f, d, w]) => new FontFace(f, `url(${site()}fonts/${d})`, { weight: w }).load().then(x => { document.fonts.add(x); }).catch(() => null)));
    return SCHRIFT;
  }
  const TK = () => window.K888Thumb;   // wird mit den anderen Insta-Dateien geladen (Reihenfolge egal)
  const LB = 1920, LH = 1080;
  const design = () => (stand().design || {});
  const logoDa = () => !!design().logoBild;
  // Looks: Farben, Pose und Bild-Einstellungen. „🎲 Neue Variante“ mischt Look, Seite, Pose und Bildausschnitt.
  const LOOKS = [
    { id: 'rot', name: 'Crash Rot', punkt: '#e11324', haupt: '#e11324', z1: '#ffffff', z2: '#ffffff', z3: '#ffd400', glow: '#ff1a1a', mark: '#ff1a1a', rand1: 9, pose: 'schock.webp', leiste: '#e11324', vign: 0.45, fx: { schaerfe: 0.7, kontrast: 1.18, farbe: 1.3, hell: 1.04 } },
    { id: 'neon', name: 'Neon', punkt: '#ff2bd6', haupt: '#7c3aed', z1: '#ffffff', z2: '#ffffff', z3: '#22d3ee', glow: '#ff2bd6', mark: '#22d3ee', rand1: 6, pose: 'zeigt-auf-dich.webp', leiste: '#ff2bd6', vign: 0.55, fx: { schaerfe: 0.7, kontrast: 1.25, farbe: 1.45, hell: 0.98 } },
    { id: 'gelb', name: 'Gelb-Schwarz', punkt: '#ffd400', haupt: '#ffd400', z1: '#ffd400', z2: '#111111', z3: '#ffffff', glow: '', mark: '#ffd400', rand1: 14, pose: 'facepalm.webp', leiste: '#ffd400', vign: 0.4, fx: { schaerfe: 0.7, kontrast: 1.22, farbe: 1.2, hell: 1.02 } }
  ];
  const lookVon = id => LOOKS.find(l => l.id === id) || LOOKS[0];
  const POSEN_CRASH = ['schock.webp', 'facepalm.webp', 'zeigt-auf-dich.webp', 'zeigt-zur-seite.webp', 'pose_07_jubel_faust.png', 'pose_03_nachdenklich.png', 'arme-verschraenkt.webp'];
  const FX_NEUTRAL = { schaerfe: 0, kontrast: 1, farbe: 1, hell: 1 };
  function lookVorlage(L, tx) {
    const text = (id, inhalt, felder) => ({ id, rolle: id, typ: 'text', an: true, inhalt: inhalt || '', gewicht: 900, rand: '#000000', randB: 0, box: 'kein', boxFarbe: L.haupt,
      schraeg: true, schatten: true, leuchten: false, leuchtFarbe: L.glow || '#ff1a1a', leuchtStaerke: 1, verlauf: false, farbe2: '#ffffff', maxB: 1060, zeilen: 1, gross: true, ...felder });
    return {
      look: L.id,
      hg: { zoom: 1.12, x: 0.5, y: 0.45, dunkel: 0.05, links: 0.82, seite: 'links', leiste: true, leisteFarbe: L.leiste, vignette: L.vign },
      elemente: [
        { id: 'kreis', typ: 'kreis', an: true, x: 1090, y: 520, rx: 165, ry: 120, dicke: 14, farbe: L.mark, rand: '#000000', randB: 5, leuchten: true, leuchtFarbe: L.mark },
        { id: 'pfeil', typ: 'pfeil', an: true, x: 958, y: 616, laenge: 290, winkel: -42, dicke: 18, farbe: L.mark, rand: '#000000', randB: 5, leuchten: true, leuchtFarbe: L.mark },
        { id: 'pers', typ: 'pers', an: true, bild: L.pose, x: 1290, y: 110, h: 980, spiegeln: false, rand: true, schatten: true },
        text('z1', tx.z1, { x: 66, y: 60, groesse: 260, schrift: 'anton', farbe: L.z1, randB: L.rand1, leuchten: !!L.glow }),
        text('z2', tx.z2, { x: 84, y: 372, groesse: 132, schrift: 'anton', farbe: L.z2, box: 'schraeg', maxB: 1000 }),
        text('z3', tx.z3, { x: 92, y: 585, groesse: 68, gewicht: 800, schrift: '', farbe: L.z3, randB: 6, maxB: 1000 }),
        { id: 'logo', typ: 'logo', an: logoDa(), x: 80, y: 900, b: 330, schatten: true },
        text('marke', 'KREIDS888', { rolle: '', an: !logoDa(), x: 84, y: 952, groesse: 60, schrift: 'anton', farbe: '#ffffff', randB: 4, schraeg: false, maxB: 700 }),
        { id: 'team', typ: 'team', an: false, bild: 'f2f-logo.webp', schwarzWeg: true, x: 1600, y: 40, b: 260 }
      ]
    };
  }
  const texteAus = v => { const t = {}; for (const r of ['z1', 'z2', 'z3']) { const el = v.elemente.find(x => x.rolle === r); t[r] = el ? el.inhalt : ''; } return t; };
  function texteRein(v, tx) { for (const el of v.elemente) if (el.rolle && el.rolle in tx) el.inhalt = tx[el.rolle] || ''; return v; }
  function seitenTausch(v) {   // Schrift auf die andere Seite, Ich-Bild gespiegelt
    for (const el of v.elemente) {
      el.x = LB - el.x;
      if (el.typ === 'pfeil') el.winkel = 180 - (el.winkel || 0);
      else if (el.typ !== 'kreis') el.rechts = !el.rechts;
      if (el.typ === 'pers') el.spiegeln = !el.spiegeln;
    }
    v.hg.seite = v.hg.seite === 'rechts' ? 'links' : 'rechts';
  }
  function variante(e) {   // 🎲 anderer Look, Seite, Pose, Bildausschnitt – Texte und eigene Bilder bleiben
    const r = Math.random, w = l => l[Math.floor(r() * l.length)];
    const andere = LOOKS.filter(l => l.id !== e.v.look), L = w(andere.length ? andere : LOOKS);
    const alt = e.v, v = lookVorlage(L, texteAus(alt));
    for (const el of alt.elemente) if (el.typ === 'bild') v.elemente.push(TK().kopie(el));
    for (const id of ['team', 'logo', 'marke']) { const a = alt.elemente.find(x => x.id === id), b = v.elemente.find(x => x.id === id); if (a && b) { b.an = a.an; if (a.bild) b.bild = a.bild; } }
    const p = v.elemente.find(x => x.id === 'pers'), pa = alt.elemente.find(x => x.id === 'pers');
    if (p) { p.bild = w(POSEN_CRASH.filter(x => x !== (pa && pa.bild))); if (pa) p.an = pa.an; }
    for (const el of v.elemente) if (el.typ === 'text' && el.rolle) el.groesse = Math.round(el.groesse * (0.94 + r() * 0.12));
    if (r() < 0.5) seitenTausch(v);
    v.hg.zoom = +(1.05 + r() * 0.3).toFixed(2); v.hg.x = +(0.3 + r() * 0.4).toFixed(2); v.hg.y = +(0.3 + r() * 0.4).toFixed(2);
    e.v = v; e.fx = { ...L.fx }; e.sel = 'z1'; e.hgLw = null;
  }
  // Look für das nächste Video merken (im Browser): Aussehen ohne eigene Bilder vom PC
  const MERK = 'k888-ytq-look-v1';
  function lookMerken(e) {
    try { localStorage.setItem(MERK, JSON.stringify({ fx: e.fx, v: TK().kopie({ ...e.v, elemente: e.v.elemente.filter(x => x.typ !== 'bild') }) })); return true; }
    catch (err) { return false; }
  }
  function lookGemerkt() { try { const d = JSON.parse(localStorage.getItem(MERK) || 'null'); return d && d.v && Array.isArray(d.v.elemente) ? d : null; } catch (e) { return null; } }

  // ─── Hintergrund: Bild aus dem Video oder eigenes Bild, mit Schärfe, Kontrast, Farbe, Helligkeit (als Leinwand) ───
  async function hgBauen(e) {
    const q = e.quelle || {}, src = q.art === 'bild' ? q.img : e.vid;
    if (!src) return;
    if (q.art !== 'bild' && Math.abs((e.vid.currentTime || 0) - e.t) > 0.05) await springen(e.vid, e.t);
    const nw = src.naturalWidth || src.videoWidth || src.width, nh = src.naturalHeight || src.videoHeight || src.height;
    if (!nw || !nh) return;
    const s = Math.min(1, 2560 / nw), w = Math.max(2, Math.round(nw * s)), h = Math.max(2, Math.round(nh * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }), f = { ...FX_NEUTRAL, ...(e.fx || {}) };
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.filter = `contrast(${f.kontrast}) saturate(${f.farbe}) brightness(${f.hell})`;
    g.drawImage(src, 0, 0, w, h);
    g.filter = 'none';
    if (f.schaerfe > 0.01) schaerfen(c, g, w, h, f.schaerfe);
    e.hgLw = c;
  }
  function schaerfen(c, g, w, h, staerke) {   // Unscharf maskieren: Bild + Stärke × (Bild − weiche Kopie)
    const m = 8, weich = document.createElement('canvas'); weich.width = w + 2 * m; weich.height = h + 2 * m;
    const gw = weich.getContext('2d', { willReadFrequently: true });
    gw.drawImage(c, 0, 0, w + 2 * m, h + 2 * m);   // Rand auffüllen, damit die Kanten nicht aufhellen
    gw.filter = `blur(${Math.max(0.9, w / 1600).toFixed(2)}px)`; gw.drawImage(c, m, m); gw.filter = 'none';
    const a = g.getImageData(0, 0, w, h), b = gw.getImageData(m, m, w, h), d = a.data, bd = b.data, k = staerke;
    for (let i = 0; i < d.length; i += 4) { d[i] += k * (d[i] - bd[i]); d[i + 1] += k * (d[i + 1] - bd[i + 1]); d[i + 2] += k * (d[i + 2] - bd[i + 2]); }
    g.putImageData(a, 0, 0);
  }
  function schaerfeWert(d, w, h) {   // wie scharf ein Bild ist: Streuung der Kanten (Laplace)
    const gr = new Float32Array(w * h);
    for (let i = 0, j = 0; j < gr.length; i += 4, j++) gr[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let s = 0, s2 = 0, n = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, l = 4 * gr[i] - gr[i - 1] - gr[i + 1] - gr[i - w] - gr[i + w];
      s += l; s2 += l * l; n++;
    }
    const mw = s / n; return s2 / n - mw * mw;
  }
  async function schaerfstes(e) {   // 🔍 rund um die Stelle (± 1,5 s) das schärfste Bild suchen
    const tok = e.suche = (e.suche || 0) + 1, v = e.vid2 || e.vid, mitte = e.t;   // eigenes Video zum Suchen, das Thumbnail-Video bleibt stehen
    const von = Math.max(0, mitte - 1.5), bis = Math.max(von, Math.min((e.dauer || 0) - 0.1, mitte + 1.5)), n = Math.max(1, Math.round((bis - von) / 0.2));
    const c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const g = c.getContext('2d', { willReadFrequently: true });
    let best = { t: mitte, s: -1 };
    for (let i = 0; i <= n; i++) {
      if (e.suche !== tok || Q.ed !== e) return null;   // Regler bewegt oder Editor zu: abbrechen
      const t = von + (bis - von) * i / n;
      await springen(v, t);
      g.drawImage(v, 0, 0, 320, 180);
      const s = schaerfeWert(g.getImageData(0, 0, 320, 180).data, 320, 180);
      if (s > best.s) best = { t, s };
      teStatus(`🔍 Suche das schärfste Bild … ${Math.round((i + 1) / (n + 1) * 100)} %`);
    }
    return e.suche === tok ? Math.round(best.t * 10) / 10 : null;
  }
  async function schaerfstesJetzt(e, still) {
    const t = await schaerfstes(e);
    if (t == null || Q.ed !== e) return;
    e.t = t; e.quelle = { art: 'video' }; e.hgLw = null;
    const r = BOX && BOX.querySelector('[data-tf="t"]'); if (r) r.value = t;
    const w = BOX && BOX.querySelector('.kq-twert'); if (w) w.textContent = sek(t);
    await hgBauen(e); teStatus(still ? '' : `✓ Schärfstes Bild bei ${sek(t)} genommen.`); malen();
  }

  // ─── Malen ───
  let malt = false, nochmal = false;
  async function malen() {
    const e = Q.ed, cv = BOX && BOX.querySelector('canvas.kq-thumb');
    if (!e || !cv || !TK()) return;
    if (malt) { nochmal = true; return; }
    malt = true;
    try {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(320, Math.min(LB, Math.round((r.width || 640) * dpr))), h = Math.round(w * 9 / 16);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      await schriften();
      if (!e.hgLw) await hgBauen(e);
      if (Q.ed !== e) return;
      e.info = (await TK().zeichnen(cv, e.v, { hgBild: e.hgLw, startMs: e.postMs || Date.now() }, design(), { auswahl: e.sel })) || {};
    } catch (err) { console.warn('Thumbnail:', err); }
    finally { malt = false; if (nochmal) { nochmal = false; malen(); } }
  }
  let fxTimer = 0;
  function fxNeu() { clearTimeout(fxTimer); fxTimer = setTimeout(async () => { const e = Q.ed; if (!e) return; await hgBauen(e); malen(); }, 120); }
  async function thumbBlob(e) {   // fertige Datei für YouTube: 1280 × 720 JPG, höchstens 0,88 MB (so nimmt sie der Worker)
    if (!TK()) throw new Error('Der Thumbnail-Baukasten (insta-thumb.js) fehlt. Bitte die Seite neu laden.');
    await schriften(); if (!e.hgLw) await hgBauen(e);
    const cv = document.createElement('canvas'); cv.width = TB; cv.height = TH;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    await TK().zeichnen(cv, e.v, { hgBild: e.hgLw, startMs: e.postMs || Date.now() }, design(), {});
    for (const q of [0.92, 0.86, 0.8, 0.72, 0.64]) { const b = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', q)); if (b && b.size <= 880000) return b; }
    throw new Error('Das Thumbnail ist zu groß geworden. Bitte ein anderes Bild wählen.');
  }
  function teStatus(t) { const el = BOX && BOX.querySelector('.kq-te-status'); if (el) el.textContent = t || ''; }

  // ─── Fotos aus der Toolbox (Ordner „fotos“ bzw. „fotos → Kreids“): einmal verbinden, dann als Hintergrund wählen ───
  async function fotosLesen() {
    const liste = [];
    const rein = async (dir, vor) => {
      for await (const [name, h] of dir.entries()) {
        if (h.kind === 'directory' && !vor) { if (!/^fertig$/i.test(name)) await rein(h, name + ' › '); continue; }
        if (h.kind !== 'file' || !/\.(jpe?g|png|webp)$/i.test(name)) continue;
        let f = null; try { f = await h.getFile(); } catch (err) { continue; }
        liste.push({ name: (vor || '') + name, datei: f, zeit: f.lastModified });
      }
    };
    await rein(Q.fotoOrdner, '');
    liste.sort((a, b) => b.zeit - a.zeit);
    for (const u of Q.fotoUrl.values()) URL.revokeObjectURL(u);
    Q.fotoUrl = new Map(); Q.fotos = liste.slice(0, 60);
    for (const x of Q.fotos) Q.fotoUrl.set(x.name, URL.createObjectURL(x.datei));
  }
  async function fotosStarten() {
    if (!kann() || Q.fotoStand === 'ok') return;
    try {
      const h = await tx('readonly', o => o.get('ordnerFotos')); if (!h) return;
      Q.fotoOrdner = h;
      if ((await h.queryPermission({ mode: 'read' })) !== 'granted') { Q.fotoStand = 'fragen'; return; }
      await fotosLesen(); Q.fotoStand = 'ok';
    } catch (e) { Q.fotoStand = Q.fotoOrdner ? 'fragen' : ''; }
  }
  async function fotosVerbinden() {
    if (!kann()) return UMG.meldung('Das geht nur in Chrome oder Edge am PC.', 1);
    try {
      if (Q.fotoOrdner && Q.fotoStand === 'fragen') { if ((await Q.fotoOrdner.requestPermission({ mode: 'read' })) !== 'granted') return; }
      else { const h = await window.showDirectoryPicker({ id: 'k888-fotos', mode: 'read' }); Q.fotoOrdner = h; try { await tx('readwrite', o => o.put(h, 'ordnerFotos')); } catch (e) { /* dann nur bis zum Neuladen */ } }
      await fotosLesen(); Q.fotoStand = 'ok'; Q.fotosAuf = true; teAufbauen();
      UMG.meldung(Q.fotos.length ? `${Q.fotos.length} Fotos gefunden.` : 'Verbunden, aber dort liegen keine Fotos.');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      Q.fotoStand = Q.fotoOrdner ? 'fragen' : ''; teAufbauen(); UMG.meldung('Der Ordner lässt sich nicht lesen. Bitte neu verbinden.', 1);
    }
  }
  function bildLaden(url) {
    return new Promise((ok, nein) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => nein(new Error('Das Bild lässt sich nicht öffnen.')); i.src = url; });
  }
  async function hgBild(e, url, name, eigen) {   // eigenes Bild (PC oder Toolbox-Foto) als Hintergrund
    try {
      const img = await bildLaden(url);
      if (Q.ed !== e) return;
      if (e.quelle && e.quelle.eigenUrl) URL.revokeObjectURL(e.quelle.eigenUrl);
      e.suche = (e.suche || 0) + 1;   // laufende Suche im Video stoppen
      e.quelle = { art: 'bild', img, name, eigenUrl: eigen ? url : '' }; e.hgLw = null;
      await hgBauen(e); teAufbauen(); teStatus(`✓ Hintergrund: ${name}`);
    } catch (err) { UMG.meldung(err.message || String(err), 1); }
  }

  // ─── Editor ───
  async function oeffnen(name) {
    const x = Q.liste.find(y => y.name === name); if (!x) return;
    if (Q.ed && Q.ed.name === name) { nachOben(); return; }
    schliessen();
    let datei; try { datei = await x.datei.getFile(); } catch (err) { Q.stand = 'fragen'; zeichnen(); return UMG.meldung('Der Ordner ist nicht mehr freigegeben. Bitte „📂 Ordner wieder freigeben“ drücken.', 1); }
    const url = URL.createObjectURL(datei);
    let vid; try { vid = await videoLaden(url); } catch (err) { URL.revokeObjectURL(url); return UMG.meldung(`„${name}“ kann der Browser nicht öffnen.`, 1); }
    const dauer = vid.duration || 0, v = vorschlag(name);
    let postMs = Date.now() + 86400000;
    try { const r = await UMG.igApi('GET', '/api/clips/platz'); if (r && r.postMs) postMs = r.postMs; } catch (e) { /* dann morgen um diese Zeit */ }
    const tx = { z1: v.z1, z2: v.z2, z3: v.z3 }, gm = TK() ? lookGemerkt() : null;   // 💾 gemerkter Look vom letzten Video
    const vorlage = gm ? texteRein(gm.v, tx) : lookVorlage(LOOKS[0], tx);
    Q.ed = { name, datei, url, vid, dauer, postMs, t: Math.round(Math.min(Math.max(1, dauer * 0.4), Math.max(0, dauer - 0.2)) * 10) / 10, titel: v.titel, text: v.text,
      v: vorlage, fx: gm && gm.fx ? { ...FX_NEUTRAL, ...gm.fx } : { ...lookVon(vorlage.look).fx }, quelle: { art: 'video' }, sel: 'z1', hgLw: null, info: {} };
    zeichnen(); nachOben();
    if (TK()) { const e = Q.ed; try { e.vid2 = await videoLaden(url); schaerfstesJetzt(e, true); } catch (err) { /* dann ohne Suche */ } }   // gleich das schärfste Bild rund um die Stelle
  }
  function schliessen() {
    const e = Q.ed; if (!e) return;
    e.suche = (e.suche || 0) + 1;
    for (const v of [e.vid, e.vid2]) if (v) { try { v.removeAttribute('src'); v.load(); } catch (x) { /* egal */ } }
    if (e.quelle && e.quelle.eigenUrl) URL.revokeObjectURL(e.quelle.eigenUrl);
    for (const el of e.v.elemente) if (el.typ === 'bild' && el.eigen) URL.revokeObjectURL(el.url);
    URL.revokeObjectURL(e.url); Q.ed = null;
  }
  const nachOben = () => setTimeout(() => { const el = BOX && BOX.querySelector('.kq-editor'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  function arbeit(t) { Q.arbeit = t; const el = BOX && BOX.querySelector('.kq-arbeit span:last-child'); if (el) el.textContent = t; else zeichnen(); }

  // ─── Thumbnail-Editor: Aufbau ───
  const NAMEN = { z1: 'Zeile 1 (groß)', z2: 'Zeile 2 (Box)', z3: 'Zeile 3 (klein)', marke: 'Schriftzug KREIDS888', pers: 'Ich-Bild', kreis: 'Kreis', pfeil: 'Pfeil', logo: 'Logo', team: 'Team-Bild' };
  const ebeneName = el => NAMEN[el.id] || (el.typ === 'bild' ? 'Eigenes Bild' : el.typ === 'text' ? 'Text: ' + String(el.inhalt || '').slice(0, 18) : el.typ === 'pfeil' ? 'Pfeil' : el.typ === 'kreis' ? 'Kreis' : el.typ);
  const anzeigen = (f, w) => { const z = Number(w); return /^fx\.|^hg\.(dunkel|links|vignette)$/.test(f) ? Math.round(z * 100) + ' %' : f === 'hg.zoom' ? z.toFixed(2).replace('.', ',') + '×' : f === 'winkel' ? Math.round(z) + '°' : String(Math.round(z * 100) / 100).replace('.', ','); };
  const regler = (f, name, wert, min, max, schritt) => `<label class="kq-feld kq-regler">${esc(name)} <b>${anzeigen(f, wert ?? min)}</b><input type="range" data-tf="${f}" min="${min}" max="${max}" step="${schritt}" value="${esc(wert ?? min)}"></label>`;
  const farbe = (f, name, wert) => `<label class="kq-feld kq-farbe">${esc(name)}<input type="color" data-tf="${f}" value="${esc(wert || '#ffffff')}"></label>`;
  const schalter = (f, name, an) => `<label class="kq-chk"><input type="checkbox" data-tf="${f}" ${an ? 'checked' : ''}> ${esc(name)}</label>`;
  const auswahl = (f, name, wert, opts) => `<label class="kq-feld">${esc(name)}<select data-tf="${f}">${opts.map(([w, n]) => `<option value="${esc(w)}" ${String(wert) === String(w) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
  function wertZeigen(t) { const b = t.closest('label') && t.closest('label').querySelector('b'); if (b) b.textContent = anzeigen(t.dataset.tf, t.value); }

  function eigenschaften(el) {
    if (!el) return '<div class="kq-dim">Im Bild etwas anklicken.</div>';
    const T = TK();
    const gal = (liste, url) => `<div class="kq-gal">${liste.map(([d, n]) => `<button type="button" data-tq="bild" data-w="${esc(d)}" class="${el.bild === d ? 'an' : ''}" title="${esc(n)}"><img src="${esc(url(d))}" alt="${esc(n)}" loading="lazy"></button>`).join('')}</div>`;
    const weg = '<div class="kq-knoepfe"><button type="button" class="btn ki-k" data-tq="loeschen" title="Diese Ebene ganz entfernen">✕ Ebene löschen</button></div>';
    if (el.typ === 'text') return `
      ${el.rolle ? '' : `<label class="kq-feld">Text<input type="text" data-tf="inhalt" value="${esc(el.inhalt)}" maxlength="60"></label>`}
      <div class="kq-reihe">${auswahl('schrift', 'Schrift', el.schrift || '', [['anton', 'Anton (sehr fett)'], ['', 'Saira (schmal)']])}${farbe('farbe', 'Farbe', el.farbe)}</div>
      ${regler('groesse', 'Größe', el.groesse, 20, 360, 1)}
      ${regler('maxB', 'Max. Breite', el.maxB || 1060, 200, 1900, 10)}
      <div class="kq-reihe">${farbe('rand', 'Rand', el.rand || '#000000')}${regler('randB', 'Rand-Dicke', el.randB || 0, 0, 30, 1)}</div>
      <div class="kq-reihe">${schalter('leuchten', 'Leuchten', el.leuchten)}${el.leuchten ? farbe('leuchtFarbe', 'Leucht-Farbe', el.leuchtFarbe || '#ff1a1a') + regler('leuchtStaerke', 'Stärke', el.leuchtStaerke || 1, 0.3, 2.5, 0.05) : ''}</div>
      <div class="kq-reihe">${auswahl('box', 'Hintergrund', el.box || 'kein', [['kein', 'Kein'], ['box', 'Box'], ['schraeg', 'Schräg']])}${el.box && el.box !== 'kein' ? farbe('boxFarbe', 'Box-Farbe', el.boxFarbe || ROT) : ''}</div>
      <div class="kq-reihe">${schalter('schraeg', 'Schräg (Renn-Look)', el.schraeg)}${schalter('schatten', 'Schatten', el.schatten)}${schalter('gross', 'GROSSBUCHSTABEN', el.gross !== false)}</div>
      ${el.rolle ? '<div class="kq-dim">Den Text änderst du oben bei „Zeile 1–3“.</div>' : weg}`;
    if (el.typ === 'pers') return `${gal(T.POSEN, T.posenUrl)}${regler('h', 'Größe', el.h, 200, 1500, 5)}
      <div class="kq-reihe">${schalter('spiegeln', 'Spiegeln', el.spiegeln)}${schalter('rand', 'Weißer Rand', el.rand)}${schalter('schatten', 'Schatten', el.schatten)}</div>`;
    if (el.typ === 'team') return `${gal(T.TEAM, T.teamUrl)}${regler('b', 'Größe', el.b, 80, 1400, 5)}<div class="kq-reihe">${schalter('schwarzWeg', 'Schwarzen Hintergrund ausblenden', el.schwarzWeg)}</div>`;
    if (el.typ === 'logo') return `${regler('b', 'Größe', el.b, 100, 1400, 5)}<div class="kq-reihe">${schalter('schatten', 'Schatten', el.schatten)}</div><div class="kq-dim">${logoDa() ? 'Das Logo kommt aus „🎨 Aussehen“.' : 'Unter „🎨 Aussehen“ ist kein Logo hinterlegt. Dafür gibt es den Schriftzug KREIDS888.'}</div>`;
    if (el.typ === 'bild') return `${regler('b', 'Größe', el.b, 80, 1900, 5)}<div class="kq-reihe">${schalter('rand', 'Weißer Rand', el.rand)}${schalter('schatten', 'Schatten', el.schatten)}${schalter('spiegeln', 'Spiegeln', el.spiegeln)}</div>${weg}`;
    if (el.typ === 'pfeil') return `${regler('laenge', 'Länge', el.laenge, 80, 900, 5)}${regler('winkel', 'Richtung', el.winkel, -180, 180, 1)}${regler('dicke', 'Dicke', el.dicke, 4, 60, 1)}
      <div class="kq-reihe">${farbe('farbe', 'Farbe', el.farbe)}${schalter('randAn', 'Schwarzer Rand', !!el.rand)}${schalter('leuchten', 'Leuchten', el.leuchten)}</div>${weg}`;
    if (el.typ === 'kreis') return `${regler('rx', 'Breite', el.rx, 40, 600, 2)}${regler('ry', 'Höhe', el.ry, 30, 500, 2)}${regler('dicke', 'Dicke', el.dicke, 4, 40, 1)}
      <div class="kq-reihe">${farbe('farbe', 'Farbe', el.farbe)}${schalter('randAn', 'Schwarzer Rand', !!el.rand)}${schalter('leuchten', 'Leuchten', el.leuchten)}</div>${weg}`;
    return '';
  }
  function rechtsHtml(e) {
    const el = e.v.elemente.find(x => x.id === e.sel) || null, f = { ...FX_NEUTRAL, ...(e.fx || {}) }, hg = e.v.hg;
    const ebenen = [...e.v.elemente].reverse().map(x => `<div class="kq-ebene${x.id === e.sel ? ' an' : ''}" data-tq="waehle" data-id="${esc(x.id)}">
        <input type="checkbox" data-tf="sichtbar" data-id="${esc(x.id)}" ${x.an !== false ? 'checked' : ''} title="Ebene ein- oder ausblenden">
        <span>${esc(ebeneName(x))}</span>
        <button type="button" data-tq="vor" data-id="${esc(x.id)}" title="Nach vorne (über die anderen)">▲</button><button type="button" data-tq="zurueck" data-id="${esc(x.id)}" title="Nach hinten">▼</button></div>`).join('');
    return `<div class="kq-panel"><h4>Ebenen</h4><div class="kq-ebenen">${ebenen}</div>
        <div class="kq-knoepfe">
          <button type="button" class="btn ki-k" data-tq="neu-text" title="Neue Textzeile ins Bild">+ Text</button>
          <button type="button" class="btn ki-k" data-tq="neu-pfeil" title="Pfeil, z. B. auf den Crash">+ Pfeil</button>
          <button type="button" class="btn ki-k" data-tq="neu-kreis" title="Kreis um eine Stelle">+ Kreis</button>
          <label class="btn ki-k" title="Eigenes Bild vom PC als Ebene, z. B. ein Auto als PNG">+ Bild<input type="file" accept="image/png,image/webp,image/jpeg" data-tq="ebene-datei" hidden></label>
        </div></div>
      <div class="kq-panel"><h4>${esc(el ? ebeneName(el) : 'Eigenschaften')}</h4>${eigenschaften(el)}</div>
      <div class="kq-panel"><h4>Hintergrund</h4>
        ${regler('hg.zoom', 'Zoom', hg.zoom, 1, 2.5, 0.01)}
        ${regler('hg.dunkel', 'Abdunkeln', hg.dunkel, 0, 0.8, 0.01)}
        ${regler('hg.links', 'Dunkler Verlauf hinter der Schrift', hg.links, 0, 1, 0.01)}
        ${regler('hg.vignette', 'Ränder dunkler', hg.vignette || 0, 0, 0.9, 0.01)}
        <div class="kq-reihe">${schalter('hg.leiste', 'Farbleiste unten', hg.leiste !== false)}${hg.leiste !== false ? farbe('hg.leisteFarbe', 'Farbe', hg.leisteFarbe || ROT) : ''}</div>
      </div>
      <div class="kq-panel"><h4>Bild anpassen</h4>
        ${regler('fx.schaerfe', 'Schärfe', f.schaerfe, 0, 1.5, 0.05)}
        ${regler('fx.kontrast', 'Kontrast', f.kontrast, 0.8, 1.6, 0.01)}
        ${regler('fx.farbe', 'Farbe (kräftiger)', f.farbe, 0.5, 2, 0.01)}
        ${regler('fx.hell', 'Helligkeit', f.hell, 0.7, 1.3, 0.01)}
        <div class="kq-knoepfe"><button type="button" class="btn ki-k" data-tq="fx-look" title="Schärfe, Kontrast, Farbe und Helligkeit wieder wie im Look">↺ Wie im Look</button><button type="button" class="btn ki-k" data-tq="fx-aus" title="Bild ohne Anpassung, so wie es ist">Original</button></div>
      </div>`;
  }
  function teHtml(e) {
    if (!TK()) return '<div class="kq-hinweis rot">⚠ Der Thumbnail-Baukasten (insta-thumb.js) fehlt. Bitte die Seite neu laden.</div>';
    const q = e.quelle || {}, tx = texteAus(e.v), look = e.v.look;
    const fotos = !Q.fotosAuf ? '' : Q.fotoStand !== 'ok'
      ? `<div class="kq-fotos-zu"><button type="button" class="btn ki-k" data-tq="fotos-verbinden" title="Einmal den Ordner mit den Fotos der Toolbox wählen">${Q.fotoStand === 'fragen' ? '📂 Fotos-Ordner wieder freigeben' : '📂 Ordner „fotos“ der Toolbox verbinden'}</button>
          <span class="kq-dim">${Q.fotoStand === 'fragen' ? 'Der Browser fragt nach einem Neustart einmal nach.' : 'Einmal wählen: kreids888-DIY-Toolbox → fotos → Kreids. Die Fotos aus dem Replay sind gestochen scharf.'}</span></div>`
      : `<div class="kq-fotos">${Q.fotos.length ? Q.fotos.map(f => `<button type="button" data-tq="foto" data-n="${esc(f.name)}" class="${q.name === f.name ? 'an' : ''}" title="${esc(f.name)} · als Hintergrund nehmen"><img src="${esc(Q.fotoUrl.get(f.name) || '')}" alt="" loading="lazy"></button>`).join('') : '<span class="kq-dim">In diesem Ordner liegen keine Fotos.</span>'}</div>
        <div class="kq-knoepfe"><button type="button" class="btn ki-k" data-tq="fotos-neu" title="Den Ordner nochmal lesen (nach neuen Fotos)">🔄 Neu lesen</button><button type="button" class="btn ki-k" data-tq="fotos-anders" title="Einen anderen Ordner mit Fotos wählen">📂 Anderer Ordner</button></div>`;
    return `<div class="kq-te-links">
        <div class="kq-schritt">Thumbnail <span class="kq-dim">· so sieht man es auf YouTube</span></div>
        <div class="kq-looks">
          ${LOOKS.map(L => `<button type="button" class="btn ki-k${look === L.id ? ' an' : ''}" data-tq="look" data-w="${L.id}" title="Look „${esc(L.name)}“: Farben, Schrift und Ich-Bild. Texte und Plätze bleiben."><i style="background:${L.punkt}"></i>${esc(L.name)}</button>`).join('')}
          <button type="button" class="btn ki-k" data-tq="variante" title="Mischt Look, Seite, Ich-Bild und Bildausschnitt neu. Texte bleiben.">🎲 Neue Variante</button>
          <button type="button" class="btn ki-k" data-tq="merken" title="Dieses Aussehen fürs nächste Video merken (beim Hochladen passiert das von selbst)">💾 Look merken</button>
        </div>
        <div class="kq-zeilen">
          <label class="kq-feld">Zeile 1 (groß)<input type="text" maxlength="40" value="${esc(tx.z1)}" data-tf="z1"></label>
          <label class="kq-feld">Zeile 2 (Box)<input type="text" maxlength="40" value="${esc(tx.z2)}" data-tf="z2"></label>
          <label class="kq-feld">Zeile 3 (klein)<input type="text" maxlength="60" value="${esc(tx.z3)}" data-tf="z3"></label>
        </div>
        <canvas class="kq-thumb" width="1280" height="720"></canvas>
        <div class="kq-dim">Klicken = auswählen · Ziehen = verschieben · Mausrad = Größe · freie Fläche ziehen = Bild verschieben · leere Zeile fällt weg</div>
        <div class="kq-te-status"></div>
        <div class="kq-quelle">
          <label class="kq-feld kq-tregler">Bild aus dem Video <b class="kq-twert">${sek(e.t)}</b><input type="range" min="0" max="${Math.max(0.1, e.dauer - 0.1).toFixed(1)}" step="0.1" value="${e.t}" data-tf="t"></label>
          <div class="kq-knoepfe">
            <button type="button" class="btn ki-k" data-tq="schaerfste" title="Sucht rund um die Stelle (± 1,5 Sekunden) das schärfste Bild im Video und nimmt es">🔍 Schärfstes Bild finden</button>
            <label class="btn ki-k" title="Ein eigenes Bild vom PC als Hintergrund nehmen">🖼 Bild vom PC<input type="file" accept="image/*" data-tq="hg-datei" hidden></label>
            <button type="button" class="btn ki-k${Q.fotosAuf ? ' an' : ''}" data-tq="fotos" title="Die Fotos aus der Toolbox zeigen und eins als Hintergrund nehmen">📸 Fotos aus der Toolbox</button>
            ${q.art === 'bild' ? '<button type="button" class="btn ki-k" data-tq="hg-video" title="Wieder das Bild aus dem Video als Hintergrund nehmen">▶ Zurück zum Video-Bild</button>' : ''}
          </div>
          ${q.art === 'bild' ? `<span class="kq-dim">Hintergrund: ${esc(q.name || 'eigenes Bild')}</span>` : ''}
          ${fotos}
        </div>
      </div>
      <div class="kq-te-rechts">${rechtsHtml(e)}</div>`;
  }
  function teAufbauen() {
    const box = BOX && BOX.querySelector('.kq-te'), e = Q.ed; if (!box || !e) return;
    box.innerHTML = teHtml(e); leinwandAn(); malen();
  }
  function rechtsNeu() { const r = BOX && BOX.querySelector('.kq-te-rechts'), e = Q.ed; if (r && e) r.innerHTML = rechtsHtml(e); }
  function neueEbene(art, e) {
    const L = lookVon(e.v.look), id = art + Date.now().toString(36);
    if (art === 'text') return { id, rolle: '', typ: 'text', an: true, inhalt: 'NEUER TEXT', x: 120, y: 760, groesse: 90, gewicht: 900, schrift: 'anton', farbe: '#ffffff', rand: '#000000', randB: 6, box: 'kein', boxFarbe: L.haupt, schraeg: true, schatten: true, leuchten: false, leuchtFarbe: L.glow || '#ff1a1a', leuchtStaerke: 1, verlauf: false, farbe2: '#ffffff', maxB: 1400, zeilen: 1, gross: true };
    if (art === 'pfeil') return { id, typ: 'pfeil', an: true, x: 1200, y: 640, laenge: 260, winkel: -135, dicke: 18, farbe: L.mark, rand: '#000000', randB: 5, leuchten: true, leuchtFarbe: L.mark };
    return { id, typ: 'kreis', an: true, x: 960, y: 540, rx: 150, ry: 110, dicke: 14, farbe: L.mark, rand: '#000000', randB: 5, leuchten: true, leuchtFarbe: L.mark };
  }
  // Look wechseln: Farben, Schrift und Ich-Bild vom Look, Plätze und Größen bleiben, eigene Bilder auch
  const PLATZ = ['an', 'x', 'y', 'rechts', 'groesse', 'maxB', 'h', 'b', 'rx', 'ry', 'laenge', 'winkel', 'spiegeln'];
  function lookWechseln(e, L) {
    const alt = e.v, v = lookVorlage(L, texteAus(alt));
    for (const el of v.elemente) { const a = alt.elemente.find(x => x.id === el.id); if (a) for (const k of PLATZ) if (k in a) el[k] = a[k]; }
    for (const el of alt.elemente) if (!v.elemente.some(x => x.id === el.id)) { const k = TK().kopie(el); if (el.typ === 'bild') k.url = el.url; v.elemente.push(k); }   // eigene Ebenen
    v.hg = { ...v.hg, zoom: alt.hg.zoom, x: alt.hg.x, y: alt.hg.y, seite: alt.hg.seite, dunkel: alt.hg.dunkel, links: alt.hg.links };
    const t = alt.elemente.find(x => x.id === 'team'), t2 = v.elemente.find(x => x.id === 'team'); if (t && t2) t2.bild = t.bild;
    e.v = v; e.fx = { ...L.fx }; e.hgLw = null;
  }
  async function neuesBild(e, datei) {
    const url = URL.createObjectURL(datei);
    try { await bildLaden(url); } catch (err) { URL.revokeObjectURL(url); return UMG.meldung('Das Bild lässt sich nicht öffnen.', 1); }
    if (Q.ed !== e) { URL.revokeObjectURL(url); return; }
    const n = { id: 'bild' + Date.now().toString(36), typ: 'bild', an: true, url, eigen: true, name: datei.name, x: 1150, y: 240, b: 560, rand: false, schatten: true, spiegeln: false };
    e.v.elemente.push(n); e.sel = n.id; rechtsNeu(); malen();
  }

  // ─── Thumbnail-Editor: Maus ───
  function leinwandAn() {
    const cv = BOX && BOX.querySelector('canvas.kq-thumb'); if (!cv || cv.dataset.an) return;
    cv.dataset.an = '1';
    cv.addEventListener('pointerdown', runter); cv.addEventListener('pointermove', bewegen);
    cv.addEventListener('pointerup', hoch); cv.addEventListener('pointercancel', hoch);
    cv.addEventListener('wheel', rad, { passive: false });
  }
  const punkt = (ev, cv) => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * LB / r.width, y: (ev.clientY - r.top) * LH / r.height }; };
  function treffer(e, p) {
    for (let i = e.v.elemente.length - 1; i >= 0; i--) { const el = e.v.elemente[i], b = el._box; if (el.an !== false && b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return el; }
    return null;
  }
  function runter(ev) {
    const e = Q.ed; if (!e) return;
    const cv = ev.currentTarget, p = punkt(ev, cv), el = treffer(e, p);
    try { cv.setPointerCapture(ev.pointerId); } catch (x) { /* egal */ }
    const vorher = e.sel; if (el) e.sel = el.id;
    e.zieh = { p, el, x0: el ? el.x : e.v.hg.x, y0: el ? el.y : e.v.hg.y, bewegt: false };
    if (el && el.id !== vorher) rechtsNeu();
    malen();
  }
  function bewegen(ev) {
    const e = Q.ed, z = e && e.zieh; if (!z) return;
    const p = punkt(ev, ev.currentTarget), dx = p.x - z.p.x, dy = p.y - z.p.y;
    if (!z.bewegt && Math.hypot(dx, dy) < 4) return;
    z.bewegt = true;
    if (z.el) { z.el.x = Math.round(z.x0 + dx); z.el.y = Math.round(z.y0 + dy); }
    else {
      const w = (e.info && e.info.w) || LB, h = (e.info && e.info.h) || LH;
      if (w > LB) e.v.hg.x = Math.min(1, Math.max(0, z.x0 - dx / (w - LB)));
      if (h > LH) e.v.hg.y = Math.min(1, Math.max(0, z.y0 - dy / (h - LH)));
    }
    malen();
  }
  function hoch() { const e = Q.ed; if (e) e.zieh = null; }
  function rad(ev) {
    const e = Q.ed, el = e && e.v.elemente.find(x => x.id === e.sel); if (!el) return;
    ev.preventDefault();
    const f = ev.deltaY < 0 ? 1.05 : 1 / 1.05;
    const felder = el.typ === 'text' ? [['groesse', 20, 360]] : el.typ === 'pers' ? [['h', 200, 1500]] : el.typ === 'kreis' ? [['rx', 40, 600], ['ry', 30, 500]] : el.typ === 'pfeil' ? [['laenge', 80, 900]] : [['b', 80, 1900]];
    for (const [k, lo, hi] of felder) {
      el[k] = Math.round(Math.min(hi, Math.max(lo, (el[k] || 100) * f)));
      const r = BOX.querySelector(`.kq-te-rechts [data-tf="${k}"]`); if (r) { r.value = el[k]; wertZeigen(r); }
    }
    malen();
  }

  // ─── Thumbnail-Editor: Knöpfe und Eingaben ───
  async function teKlick(b) {
    const e = Q.ed; if (!e) return;
    const a = b.dataset.tq;
    if (a === 'look') { lookWechseln(e, lookVon(b.dataset.w)); return teAufbauen(); }
    if (a === 'variante') { variante(e); return teAufbauen(); }
    if (a === 'merken') return UMG.meldung(lookMerken(e) ? '💾 Look gemerkt: das nächste Video startet so.' : 'Merken ging nicht (Speicher im Browser voll?).', 0);
    if (a === 'schaerfste') { teStatus('🔍 Suche das schärfste Bild …'); try { e.vid2 = e.vid2 || await videoLaden(e.url); } catch (x) { return teStatus('Das Video lässt sich nicht durchsuchen.'); } return schaerfstesJetzt(e, false); }
    if (a === 'hg-video') { if (e.quelle && e.quelle.eigenUrl) URL.revokeObjectURL(e.quelle.eigenUrl); e.quelle = { art: 'video' }; e.hgLw = null; return teAufbauen(); }
    if (a === 'fotos') { Q.fotosAuf = !Q.fotosAuf; if (Q.fotosAuf && Q.fotoStand !== 'ok') await fotosStarten(); return teAufbauen(); }
    if (a === 'fotos-verbinden') return fotosVerbinden();
    if (a === 'fotos-anders') { Q.fotoStand = ''; Q.fotoOrdner = null; return fotosVerbinden(); }
    if (a === 'fotos-neu') { try { await fotosLesen(); } catch (x) { Q.fotoStand = 'fragen'; } return teAufbauen(); }
    if (a === 'foto') { const f = Q.fotos.find(x => x.name === b.dataset.n); return f ? hgBild(e, Q.fotoUrl.get(f.name), f.name, false) : null; }
    if (a === 'waehle') { e.sel = b.dataset.id; rechtsNeu(); return malen(); }
    if (a === 'vor' || a === 'zurueck') {
      const l = e.v.elemente, i = l.findIndex(x => x.id === b.dataset.id), j = a === 'vor' ? i + 1 : i - 1;
      if (i < 0 || j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]]; rechtsNeu(); return malen();
    }
    if (a === 'neu-text' || a === 'neu-pfeil' || a === 'neu-kreis') { const n = neueEbene(a.slice(4), e); e.v.elemente.push(n); e.sel = n.id; rechtsNeu(); return malen(); }
    if (a === 'loeschen') {
      const el = e.v.elemente.find(x => x.id === e.sel); if (el && el.typ === 'bild' && el.eigen) URL.revokeObjectURL(el.url);
      e.v.elemente = e.v.elemente.filter(x => x.id !== e.sel); e.sel = ''; rechtsNeu(); return malen();
    }
    if (a === 'bild') {
      const el = e.v.elemente.find(x => x.id === e.sel); if (!el) return;
      el.bild = b.dataset.w; el.an = true;
      if (el.typ === 'team') el.schwarzWeg = !!((TK().TEAM.find(x => x[0] === el.bild) || [])[2]);
      rechtsNeu(); return malen();
    }
    if (a === 'fx-look') { e.fx = { ...lookVon(e.v.look).fx }; rechtsNeu(); return fxNeu(); }
    if (a === 'fx-aus') { e.fx = { ...FX_NEUTRAL }; rechtsNeu(); return fxNeu(); }
  }
  function teEingabe(t, ev) {
    const e = Q.ed; if (!e) return;
    const f = t.dataset.tf, typ = ev.type;
    if (t.dataset.tq === 'hg-datei' || t.dataset.tq === 'ebene-datei') {
      if (typ !== 'change') return;
      const d = t.files && t.files[0]; t.value = '';
      if (!d) return;
      return t.dataset.tq === 'hg-datei' ? hgBild(e, URL.createObjectURL(d), d.name, true) : neuesBild(e, d);
    }
    if (!f) return;
    if (f === 't') {
      e.t = Number(t.value) || 0; e.suche = (e.suche || 0) + 1; teStatus('');
      const w = BOX.querySelector('.kq-twert'); if (w) w.textContent = sek(e.t);
      if (e.quelle && e.quelle.art === 'bild') { if (e.quelle.eigenUrl) URL.revokeObjectURL(e.quelle.eigenUrl); e.quelle = { art: 'video' }; if (typ === 'change') teAufbauen(); }
      return fxNeu();
    }
    if (f === 'z1' || f === 'z2' || f === 'z3') { texteRein(e.v, { [f]: t.value }); return malen(); }
    if (f === 'sichtbar') { const el = e.v.elemente.find(x => x.id === t.dataset.id); if (el) { el.an = t.checked; malen(); } return; }
    const wert = t.type === 'checkbox' ? t.checked : t.type === 'range' ? parseFloat(t.value) : t.value;
    if (t.type === 'range') wertZeigen(t);
    if (f.startsWith('hg.')) { e.v.hg[f.slice(3)] = wert; if (typ === 'change' && f === 'hg.leiste') rechtsNeu(); return malen(); }
    if (f.startsWith('fx.')) { e.fx = { ...FX_NEUTRAL, ...e.fx, [f.slice(3)]: wert }; return fxNeu(); }
    const el = e.v.elemente.find(x => x.id === e.sel); if (!el) return;
    if (f === 'randAn') el.rand = wert ? '#000000' : '';
    else { el[f] = wert; if (f === 'farbe' && (el.typ === 'pfeil' || el.typ === 'kreis')) el.leuchtFarbe = wert; }
    if (typ === 'change' && ['leuchten', 'box', 'schrift'].includes(f)) rechtsNeu();
    malen();
  }

  // Datei direkt vom PC zu YouTube (privat). Zugang und Titel/Text kommen vom Worker (gleiche Regeln wie bei den Shorts).
  async function ytHochladen(zugang, meta, datei, fortschritt) {
    const r = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + zugang, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': datei.type || 'video/mp4', 'X-Upload-Content-Length': String(datei.size) },
      body: JSON.stringify(meta)
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})), e = d.error || {}, grund = (e.errors && e.errors[0] && e.errors[0].reason) || ''; throw new Error('YouTube: ' + (e.message || r.status) + (grund ? ' (' + grund + ')' : '')); }
    const ort = r.headers.get('Location');
    if (!ort) throw new Error('YouTube: kein Upload-Link bekommen.');
    return new Promise((ok, nein) => {
      const x = new XMLHttpRequest();
      x.open('PUT', ort);
      x.setRequestHeader('Content-Type', datei.type || 'video/mp4');
      x.upload.onprogress = ev => { if (ev.lengthComputable) fortschritt(ev.loaded / ev.total); };
      x.onload = () => {
        let d = {}; try { d = JSON.parse(x.responseText || '{}'); } catch (e) { /* bleibt leer */ }
        if (x.status >= 200 && x.status < 300 && d.id) ok(d.id);
        else nein(new Error('YouTube-Upload: ' + ((d.error && d.error.message) || x.status)));
      };
      x.onerror = () => nein(new Error('YouTube-Upload: Verbindung abgebrochen. Bitte nochmal „Hochladen & einplanen“.'));
      x.send(datei);
    });
  }
  async function einplanen() {
    const e = Q.ed; if (!e || Q.arbeit) return;
    const titel = String(e.titel || '').trim();
    if (!titel) return UMG.meldung('Bitte einen Titel eintragen.', 1);
    if (!(e.postMs > Date.now())) return UMG.meldung('Der Termin liegt in der Vergangenheit. Bitte einen späteren wählen.', 1);
    if (!(stand().youtube || {}).verbunden) return UMG.meldung('YouTube ist nicht verbunden (Reiter „YouTube · TikTok · Discord“).', 1);
    let id = '', vid = '';
    try {
      arbeit('🖼 Thumbnail wird gebaut …');
      const bild = await thumbBlob(e);
      lookMerken(e);   // 💾 das nächste Video startet mit diesem Look
      arbeit('▶ Wird angelegt …');
      const r = await UMG.igApi('POST', '/api/clip/neu', { vorlage: 'ytquer', quer: true, titel: titel.slice(0, 80), text: e.text || '', postMs: e.postMs, dauer: e.dauer, quelle: quelleVon(e.name), insta: false, tiktok: false, youtube: true });
      id = r.id;
      await UMG.senden(`/api/clip/${id}/bild`, bild);
      const s = await UMG.igApi('POST', `/api/clip/${id}/ytstart`, {});
      arbeit('⬆ Zu YouTube … 0 %');
      vid = await ytHochladen(s.zugang, s.meta, e.datei, p => arbeit(`⬆ Zu YouTube (privat) … ${Math.round(p * 100)} %`));
      arbeit('🖼 Thumbnail kommt drauf …');
      const f = await UMG.igApi('POST', `/api/clip/${id}/ytfertig`, { videoId: vid });
      const wann = zeit(r.postMs || e.postMs), noetig = (stand().clipcfg || {}).freigabe !== false;
      schliessen(); Q.arbeit = ''; Q.zeigen = id;
      UMG.meldung(`Liegt privat auf YouTube. ${noetig ? `Geht am ${wann} raus, sobald du freigibst.` : `Geht am ${wann} von selbst raus.`}${f.thumbnail ? '' : ' Thumbnail ging nicht: ' + (f.fehler || '?')}`, !f.thumbnail);
      await UMG.laden();
    } catch (err) {
      Q.arbeit = ''; zeichnen();
      if (id && !vid) { try { await UMG.igApi('POST', `/api/clip/${id}/weg`, {}); } catch (x) { /* bleibt in der Liste */ } }   // nichts auf YouTube: Eintrag wieder weg
      UMG.meldung((err && err.message) || String(err), 1);
      if (id && vid) await UMG.laden();
    }
  }

  // ─── Eingeplante Videos: Freigabe, Termin, Löschen ───
  async function aendern(id, was) {
    try { await UMG.igApi('POST', `/api/clip/${id}/aendern`, was); Q.zeigen = id; await UMG.laden(); }
    catch (e) { UMG.meldung(e.message || String(e), 1); }
  }

  // ─── Zeichnen ───
  function kachel(x) {
    const k = x.name + '|' + x.zeit, src = Q.bilder.get(k), drin = eingeplant(x.name), offen = Q.ed && Q.ed.name === x.name;
    return `<div class="kq-kachel${drin ? ' drin' : ''}${offen ? ' offen' : ''}" data-k="${esc(k)}">
      <div class="kq-kbild">${src ? `<img src="${src}" alt="">` : '▶'}</div>
      <b title="${esc(x.name)}">${esc(x.name)}</b>
      <span class="kq-dim"><span class="kq-kdauer">${x.dauer ? sek(x.dauer) : ''}</span> · ${mb(x.groesse)}${drin ? ' · <em>schon eingeplant</em>' : ''}</span>
      <button type="button" class="btn ki-k" data-q="oeffnen" data-n="${esc(x.name)}" title="Öffnet das Video: Titel, Text, Thumbnail und Termin einstellen">${offen ? '▴ Ist offen' : '✎ Öffnen'}</button></div>`;
  }
  function editorHtml(e) {
    const tb = t => `<span class="kq-tipp">${t}</span>`;
    return `<div class="kq-editor">
      <div class="kq-ed-links">
        <video src="${esc(e.url)}" controls playsinline preload="metadata" class="kq-video"></video>
        <div class="kq-dim">${esc(e.name)} · ${sek(e.dauer)} · ${mb(e.datei.size)} · geht so zu YouTube, wie es aus der Toolbox kommt</div>
      </div>
      <div class="kq-ed-rechts">
        <label class="kq-feld">Titel<input type="text" maxlength="80" value="${esc(e.titel)}" data-q="titel">${tb('Die Hashtags #simracing #iracing #gt3 #crash kommen von selbst dazu.')}</label>
        <label class="kq-feld">Text (Beschreibung)<textarea rows="6" maxlength="2000" data-q="text">${esc(e.text)}</textarea>${tb('Darunter kommt von selbst: Kanal abonnieren.')}</label>
        <label class="kq-feld">Termin<input type="datetime-local" value="${esc(lokal(e.postMs))}" data-q="termin">${tb((stand().clipcfg || {}).freigabe !== false ? 'Öffentlich wird es erst zu diesem Termin und nach deiner Freigabe (unten bei „Eingeplant“ oder im Wochenplan).' : 'Öffentlich wird es zu diesem Termin von selbst („Freigabe nötig“ ist aus).')}</label>
        ${(stand().youtube || {}).verbunden ? '' : '<div class="kq-hinweis rot">⚠ YouTube ist nicht verbunden. Erst im Reiter „YouTube · TikTok · Discord“ verbinden.</div>'}
        <div class="kq-knoepfe">
          <button type="button" class="btn btn-red ki-k kq-los" data-q="los" ${Q.arbeit ? 'disabled' : ''} title="Lädt das Video jetzt privat zu YouTube hoch (mit Titel, Text, Hashtags und dem Thumbnail unten) und plant es für den Termin ein"><span>▶ Hochladen &amp; einplanen</span></button>
          <button type="button" class="btn ki-k" data-q="zu" ${Q.arbeit ? 'disabled' : ''} title="Schließt den Editor, es wird nichts hochgeladen">✕ Schließen</button>
        </div>
        <div class="kq-dim">Das Video wird jetzt <b>privat</b> hochgeladen. Bis zur Freigabe sieht es niemand. Das Thumbnail baust du unten.</div>
      </div>
      <div class="kq-te">${teHtml(e)}</div></div>`;
  }
  function planKarte(c, jetzt, noetig) {
    const q = c.ytq, vorbei = c.postMs <= jetzt;
    const st = c.yt ? ['✓ Öffentlich auf YouTube', 'gruen'] : c.aus ? ['Wird nicht gepostet', 'grau'] : !q ? ['Upload fehlt', 'rot']
      : !noetig ? ['Geht von selbst raus', 'gruen'] : c.frei ? ['Freigegeben ✓', 'gruen'] : vorbei ? ['Termin vorbei · geht nach der Freigabe gleich raus', 'gelb'] : ['Wartet auf Freigabe', 'gelb'];
    const k = [];
    if (!c.yt && q && !c.aus && noetig && !c.frei) k.push('<button type="button" class="btn ki-k kq-frei" data-q="frei" title="Freigeben: das Video wird zum Termin öffentlich">✓ Freigeben</button>');
    if (!c.yt && q && !c.aus && noetig && c.frei) k.push('<button type="button" class="btn ki-k" data-q="zurueck" title="Freigabe zurücknehmen: bleibt privat, bis du wieder freigibst">↩ Zurücknehmen</button>');
    if (!c.yt && !c.aus) k.push('<button type="button" class="btn ki-k" data-q="aus" title="Nicht posten: das Video bleibt privat auf YouTube">✕ Nicht posten</button>');
    if (!c.yt && c.aus) k.push('<button type="button" class="btn ki-k" data-q="an" title="Doch posten: kommt wieder in den Plan">↩ Doch posten</button>');
    if (!c.yt) k.push(`<input type="datetime-local" value="${esc(lokal(c.postMs))}" data-q="neuzeit" title="Neuer Termin"><button type="button" class="btn ki-k" data-q="zeit" title="Termin auf die gewählte Zeit legen">🕒 Termin</button>`);
    if (c.yt && c.yt.link) k.push(`<a class="btn ki-k" href="${esc(c.yt.link)}" target="_blank" rel="noopener" title="Das Video auf YouTube ansehen">↗ Auf YouTube</a>`);
    if (q && q.studio) k.push(`<a class="btn ki-k" href="${esc(q.studio)}" target="_blank" rel="noopener" title="In YouTube Studio öffnen (dort z. B. Titel oder Endbildschirm ändern)">↗ YouTube Studio</a>`);
    k.push('<button type="button" class="btn ki-k" data-q="weg" title="Aus dem Plan löschen. Auf YouTube bleibt es privat liegen (dort selbst löschen).">🗑</button>');
    return `<div class="kq-plan${Q.zeigen === c.id ? ' zeigen' : ''}" data-id="${esc(c.id)}">
      <span class="kq-pbild">${c.bild ? `<img src="${esc(c.bild)}" alt="" loading="lazy">` : '▶'}</span>
      <div class="kq-pinfo"><b>${esc(c.titel || 'YouTube-Video')}</b>
        <span class="kq-dim">${c.yt ? 'Öffentlich seit' : 'Geht raus'}: <b>${esc(zeit(c.yt ? c.yt.zeit : c.postMs))}</b>${c.dauer ? ' · ' + sek(c.dauer) : ''}</span>
        <span class="kq-chip ${st[1]}">${st[0]}</span>${c.ytFehler ? `<span class="kq-hinweis rot">⚠ ${esc(c.ytFehler)}</span>` : ''}
        <div class="kq-knoepfe">${k.join('')}</div></div></div>`;
  }
  function html() {
    const jetzt = Date.now(), noetig = (stand().clipcfg || {}).freigabe !== false;
    const plan = quers().filter(c => !c.yt).sort((a, b) => a.postMs - b.postMs), raus = quers().filter(c => c.yt).sort((a, b) => b.yt.zeit - a.yt.zeit).slice(0, 6);
    const neu = Q.liste.filter(x => !eingeplant(x.name)).length, warten = plan.filter(c => c.ytq && !c.aus && noetig && !c.frei).length;
    const kopf = `▶ YouTube-Videos quer (16:9) <span class="kq-dim">· Toolbox-Ordner „youtube“${Q.stand === 'ok' ? ` · ${neu} neu` : ''}${plan.length ? ` · ${plan.length} eingeplant` : ''}${warten ? ` · <b class="gelb">${warten} ${warten === 1 ? 'wartet' : 'warten'} auf Freigabe</b>` : ''}</span>`;
    const ordner = Q.stand !== 'ok'
      ? `<div class="kq-zu"><button type="button" class="btn ki-k" data-q="verbinden" title="Einmal den Ordner „youtube“ der Toolbox wählen (kreids888-DIY-Toolbox → youtube)">${Q.stand === 'fragen' ? '📂 Ordner wieder freigeben' : '📂 Ordner „youtube“ verbinden'}</button>
        <span class="kq-dim">${Q.stand === 'fragen' ? 'Der Browser fragt nach einem Neustart einmal nach.' : 'Einmal den Ordner „youtube“ in der Toolbox wählen (kreids888-DIY-Toolbox → youtube). Dort landet „Fertig → YouTube“ aus dem Schnitt.'}</span>${kann() ? '' : '<span class="kq-hinweis rot">Geht nur in Chrome oder Edge am PC.</span>'}</div>`
      : `<div class="kq-reihe-kopf"><span class="kq-dim">${Q.liste.length ? 'Video antippen: Titel, Text, Thumbnail und Termin einstellen.' : 'Noch kein Video. In der Toolbox im Schnitt „Fertig → YouTube“.'}</span><button type="button" class="btn ki-k" data-q="neu-lesen" title="Ordner nochmal lesen (nach einem neuen „Fertig → YouTube“)">🔄 Neu lesen</button></div>
        ${Q.liste.length ? `<div class="kq-reihe">${Q.liste.map(kachel).join('')}</div>` : ''}`;
    return `<details class="kq" ${Q.zu ? '' : 'open'}><summary>${kopf}</summary>
      ${Q.arbeit ? `<div class="kq-arbeit"><span class="kq-spin"></span><span>${esc(Q.arbeit)}</span></div>` : ''}
      ${ordner}
      ${Q.ed ? editorHtml(Q.ed) : ''}
      ${plan.length ? `<div class="kq-schritt">📅 Eingeplant</div>${plan.map(c => planKarte(c, jetzt, noetig)).join('')}` : ''}
      ${raus.length ? `<details class="kq-raus"><summary>✓ Schon öffentlich (${raus.length})</summary>${raus.map(c => planKarte(c, jetzt, noetig)).join('')}</details>` : ''}
    </details>`;
  }
  function zeichnen() {
    if (!BOX || !BOX.isConnected) return;
    const offen = BOX.querySelector('.kq-video'), lief = offen && !offen.paused ? offen.currentTime : null;
    BOX.innerHTML = html();
    if (Q.ed) { leinwandAn(); malen(); if (lief != null) { const v = BOX.querySelector('.kq-video'); if (v) v.currentTime = lief; } }
    if (Q.zeigen) { const z = BOX.querySelector(`.kq-plan[data-id="${CSS.escape(Q.zeigen)}"]`); if (z) { const d = z.closest('details.kq-raus'); if (d) d.open = true; setTimeout(() => z.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); } Q.zeigen = ''; }
  }

  async function klick(ev) {
    const tq = ev.target.closest('[data-tq]');
    if (tq && BOX.contains(tq) && tq.tagName !== 'INPUT') return teKlick(tq);   // Thumbnail-Editor
    const b = ev.target.closest('[data-q]'); if (!b || !BOX.contains(b) || b.tagName === 'INPUT' || b.tagName === 'TEXTAREA') return;
    const a = b.dataset.q, z = b.closest('[data-id]'), id = z && z.dataset.id;
    if (a === 'verbinden') return verbinden();
    if (a === 'neu-lesen') { try { await lesen(); zeichnen(); bilder(); } catch (e) { Q.stand = 'fragen'; zeichnen(); } return; }
    if (a === 'oeffnen') return oeffnen(b.dataset.n);
    if (a === 'zu') { schliessen(); return zeichnen(); }
    if (a === 'los') return einplanen();
    if (!id) return;
    if (a === 'frei') return aendern(id, { frei: true, aus: false });
    if (a === 'zurueck') return aendern(id, { frei: false });
    if (a === 'aus') return aendern(id, { aus: true, frei: false });
    if (a === 'an') return aendern(id, { aus: false });
    if (a === 'zeit') {
      const w = z.querySelector('[data-q="neuzeit"]'), ms = w && w.value ? new Date(w.value).getTime() : 0;
      if (!(ms > Date.now())) return UMG.meldung('Bitte einen Termin in der Zukunft wählen.', 1);
      return aendern(id, { postMs: ms });
    }
    if (a === 'weg') {
      if (!confirm('Aus dem Plan löschen?\n\nAuf YouTube bleibt das Video privat liegen. Dort kannst du es selbst löschen.')) return;
      try { await UMG.igApi('POST', `/api/clip/${id}/weg`, {}); await UMG.laden(); } catch (e) { UMG.meldung(e.message || String(e), 1); }
    }
  }
  function eingabe(ev) {
    const t = ev.target; if (t.dataset && (t.dataset.tf || t.dataset.tq)) return teEingabe(t, ev);   // Thumbnail-Editor
    const a = t.dataset && t.dataset.q, e = Q.ed; if (!a || !e) return;
    if (a === 'titel' || a === 'text') { e[a] = t.value; return; }
    if (a === 'termin') { const ms = t.value ? new Date(t.value).getTime() : 0; if (ms) e.postMs = ms; }
  }

  const css = document.createElement('style');
  css.textContent = `
.kq{background:#0d0e13;border:1px solid var(--line,#23262f);border-left:3px solid #ff0033;padding:10px 14px;margin-bottom:14px;max-width:1100px;display:flex;flex-direction:column;gap:10px}
.kq>summary{cursor:pointer;font-weight:800;color:#fff;font-size:15px}
.kq .kq-dim{color:var(--steel,#8b929c);font-size:13px;font-weight:400}
.kq .kq-dim em{color:#5cff1f;font-style:normal}
.kq .gelb{color:#ffd23d}
.kq .kq-tipp{display:block;color:var(--steel,#8b929c);font-size:12px;line-height:1.35;margin-top:3px}
.kq .kq-zu,.kq .kq-reihe-kopf{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.kq .kq-reihe{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px}
.kq .kq-kachel{flex:0 0 200px;display:flex;flex-direction:column;gap:4px;background:#101219;border:1px solid var(--line,#23262f);padding:8px}
.kq .kq-kachel.drin{opacity:.6}.kq .kq-kachel.offen{border-color:#ff0033}
.kq .kq-kachel b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
.kq .kq-kbild{aspect-ratio:16/9;background:#000;display:grid;place-items:center;color:#555;font-size:22px;overflow:hidden}
.kq .kq-kbild img{width:100%;height:100%;object-fit:cover}
.kq .kq-editor{display:flex;flex-wrap:wrap;gap:18px;background:#0a0b0f;border:1px solid #ff0033;padding:14px}
.kq .kq-ed-links{flex:1 1 480px;display:flex;flex-direction:column;gap:8px;min-width:0}
.kq .kq-ed-rechts{flex:1 1 320px;display:flex;flex-direction:column;gap:10px;min-width:0}
.kq .kq-video,.kq .kq-thumb{width:100%;aspect-ratio:16/9;background:#000;display:block}
.kq .kq-thumb{border:1px solid var(--line,#23262f)}
.kq .kq-schritt{font-weight:800;color:#fff;font-size:14px;margin-top:4px}
.kq .kq-feld{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#cfd3da;font-weight:600}
.kq .kq-feld input[type=text],.kq .kq-feld textarea,.kq input[type=datetime-local]{background:#14161d;border:1px solid var(--line,#2a2e38);color:#fff;padding:7px 9px;font:inherit;font-weight:400}
.kq .kq-feld input[type=text],.kq .kq-feld textarea,.kq .kq-feld input[type=datetime-local]{box-sizing:border-box;width:100%;max-width:100%}
.kq .kq-zeilen{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.kq .kq-knoepfe{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.kq .kq-hinweis{font-size:13px}.kq .kq-hinweis.rot{color:#ff5a6a}
.kq .kq-arbeit{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid rgba(92,255,31,.5);background:rgba(92,255,31,.07);color:#cfffbf;font-weight:600}
.kq .kq-spin{width:16px;height:16px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#5cff1f;animation:kqdreh .8s linear infinite;flex:none}
@keyframes kqdreh{to{transform:rotate(360deg)}}
.kq .kq-plan{display:flex;gap:12px;align-items:flex-start;background:#101219;border:1px solid var(--line,#23262f);padding:8px}
.kq .kq-plan.zeigen{border-color:#ffd23d;box-shadow:0 0 0 2px rgba(255,210,61,.35)}
.kq .kq-pbild{flex:0 0 192px;aspect-ratio:16/9;background:#000;display:grid;place-items:center;overflow:hidden;color:#555}
.kq .kq-pbild img{width:100%;height:100%;object-fit:cover}
.kq .kq-pinfo{display:flex;flex-direction:column;gap:4px;min-width:0}
.kq .kq-pinfo>b{color:#fff}
.kq .kq-chip{align-self:flex-start;font-size:12px;font-weight:700;padding:2px 8px;border:1px solid}
.kq .kq-chip.gruen{color:#5cff1f;border-color:rgba(92,255,31,.5)}.kq .kq-chip.gelb{color:#ffd23d;border-color:rgba(255,210,61,.5)}
.kq .kq-chip.rot{color:#ff5a6a;border-color:rgba(255,90,106,.5)}.kq .kq-chip.grau{color:#8b929c;border-color:#3a3f4a}
.kq .kq-raus>summary{cursor:pointer;color:#cfd3da;font-weight:700}
@media (max-width:640px){.kq .kq-pbild{flex-basis:120px}}
.kq .kq-te{flex:1 1 100%;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;border-top:1px solid #23262f;padding-top:12px;min-width:0}
@media (max-width:1000px){.kq .kq-te{grid-template-columns:1fr}}
.kq .kq-te-links{display:flex;flex-direction:column;gap:8px;min-width:0}
.kq .kq-te-rechts{display:flex;flex-direction:column;gap:10px;min-width:0}
.kq .kq-looks{display:flex;flex-wrap:wrap;gap:6px}
.kq .kq-looks .btn i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}
.kq .btn.ki-k.an{background:#ffd23d;border-color:#ffd23d;color:#111}
.kq canvas.kq-thumb{cursor:move;touch-action:none;height:auto}
.kq .kq-te-status{min-height:18px;color:#5cff1f;font-size:13px}
.kq .kq-quelle{display:flex;flex-direction:column;gap:8px;background:#101219;border:1px solid #23262f;padding:10px}
.kq .kq-panel{background:#101219;border:1px solid #23262f;padding:10px;display:flex;flex-direction:column;gap:8px}
.kq .kq-panel h4{margin:0;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#fff}
.kq .kq-ebenen{display:flex;flex-direction:column;gap:3px;max-height:460px;overflow:auto}
.kq .kq-ebene{display:flex;align-items:center;gap:8px;padding:5px 7px;border:1px solid #23262f;background:#0b0c10;cursor:pointer;font-size:13px;color:#cfd3da}
.kq .kq-ebene.an{border-color:#ff0033;color:#fff}
.kq .kq-ebene span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kq .kq-ebene input{width:15px;height:15px;accent-color:#ff0033;flex:none}
.kq .kq-ebene button{background:none;border:1px solid #2a2e38;color:#8b929c;cursor:pointer;width:24px;height:22px;padding:0;font-size:10px;flex:none}
.kq .kq-reihe{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-end}
.kq .kq-reihe .kq-regler{flex:1 1 140px}
.kq .kq-panel>.kq-regler,.kq .kq-quelle>.kq-regler{flex:none}
.kq .kq-feld b{color:#ffd23d;font-weight:700}
.kq .kq-feld input[type=range]{width:100%;accent-color:#ff0033;padding:0}
.kq .kq-farbe input[type=color]{width:56px;height:32px;padding:2px;background:#14161d;border:1px solid #2a2e38;cursor:pointer}
.kq .kq-feld select{background:#14161d;border:1px solid #2a2e38;color:#fff;padding:6px 8px;font:inherit;font-weight:400}
.kq .kq-chk{display:flex;align-items:center;gap:6px;font-size:13px;color:#cfd3da;cursor:pointer}
.kq .kq-chk input{accent-color:#ff0033}
.kq .kq-gal{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.kq .kq-gal button{padding:0;border:2px solid #23262f;background:#14161d;cursor:pointer;aspect-ratio:1/1;overflow:hidden}
.kq .kq-gal button img{width:100%;height:100%;object-fit:contain;display:block}
.kq .kq-gal button.an{border-color:#ff0033}
.kq .kq-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;max-height:320px;overflow:auto;padding:2px}
.kq .kq-fotos button{padding:0;border:2px solid #23262f;background:#000;cursor:pointer;aspect-ratio:16/9;overflow:hidden}
.kq .kq-fotos button img{width:100%;height:100%;object-fit:cover;display:block}
.kq .kq-fotos button.an{border-color:#ffd23d}
.kq .kq-fotos-zu{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.kq label.btn{cursor:pointer;background:#efefef;color:#111}`;
  document.head.appendChild(css);

  window.K888YtQuer = {
    start(box, umg) {
      UMG = umg;
      if (BOX !== box) {
        BOX = box;
        box.addEventListener('click', klick);
        box.addEventListener('input', eingabe);
        box.addEventListener('change', eingabe);
        box.addEventListener('toggle', ev => { if (ev.target.classList && ev.target.classList.contains('kq')) Q.zu = !ev.target.open; }, true);
      }
      zeichnen();
      starten();
      fotosStarten();
      schriften().then(() => { if (Q.ed) malen(); });
    },
    zeigen(id) { Q.zeigen = String(id || ''); Q.zu = false; zeichnen(); },   // aus dem Wochenplan angeklickt
    _q: Q, _vorschlag: vorschlag, _malen: malen, _thumbBlob: thumbBlob, _lookVorlage: lookVorlage, _LOOKS: LOOKS
  };
})();
