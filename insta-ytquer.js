// ═══════════════════════════════════════════════════════════
// Kreids888 · ▶ YouTube-Videos quer 16:9 (NEU 25.11.2026) im Reiter „🎬 Clips“ des Instagram-Bereichs
// • Vorrat: der Toolbox-Ordner „youtube“ (Schnitt → „Fertig → YouTube“). Der Browser liest ihn direkt vom PC (nur lesen).
// • Ein Video öffnen: Titel, Text, Thumbnail (Bild aus dem Video + Texte, z. B. CRASH COMPILATION) und Termin.
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

  // ─── Thumbnail zeichnen: Bild aus dem Video, links dunkel, große Texte wie im Kreids-Look ───
  let SCHRIFT = null;
  function schriften() {
    if (!SCHRIFT) SCHRIFT = Promise.all([['K8QAnton', 'anton-latin-400-normal.woff2', '400'], ['K8QSaira', 'saira-condensed-latin-800-normal.woff2', '800']]
      .map(([f, d, w]) => new FontFace(f, `url(${site()}fonts/${d})`, { weight: w }).load().then(x => { document.fonts.add(x); }).catch(() => null)));
    return SCHRIFT;
  }
  const passend = (g, text, font, gross, max) => { let s = gross; g.font = `${font.replace('{s}', s)}`; const w = g.measureText(text).width; if (w > max) s = Math.max(24, Math.floor(gross * max / w)); g.font = font.replace('{s}', s); return s; };
  function thumbZeichnen(cv, vid, e) {
    const g = cv.getContext('2d');
    g.fillStyle = '#0b0c10'; g.fillRect(0, 0, TB, TH);
    if (vid && vid.videoWidth) {   // Bild deckend (quer passt genau, sonst mittig zuschneiden)
      const s = Math.max(TB / vid.videoWidth, TH / vid.videoHeight), w = vid.videoWidth * s, h = vid.videoHeight * s;
      g.drawImage(vid, (TB - w) / 2, (TH - h) / 2, w, h);
    }
    const v = g.createLinearGradient(0, 0, 860, 0); v.addColorStop(0, 'rgba(0,0,0,.84)'); v.addColorStop(0.55, 'rgba(0,0,0,.45)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = v; g.fillRect(0, 0, TB, TH);
    g.textBaseline = 'top'; g.textAlign = 'left';
    const schatten = (t, x, y, farbe, d) => { g.fillStyle = 'rgba(0,0,0,.75)'; g.fillText(t, x + d, y + d); g.fillStyle = farbe; g.fillText(t, x, y); };
    let y = 34;
    const z1 = GROSS(e.z1).trim(), z2 = GROSS(e.z2).trim(), z3 = GROSS(e.z3).trim();
    if (z1) { const s = passend(g, z1, '400 {s}px K8QAnton, Impact, sans-serif', 180, 1120); schatten(z1, 58, y, '#ffffff', 6); y += Math.round(s * 1.24); }
    if (z2) {
      const s = passend(g, z2, '400 {s}px K8QAnton, Impact, sans-serif', 112, 1060), w = g.measureText(z2).width + 70, h = Math.round(s * 1.34);
      g.fillStyle = ROT; g.beginPath(); g.moveTo(44 + 24, y); g.lineTo(44 + w + 40, y); g.lineTo(44 + w + 16, y + h); g.lineTo(44, y + h); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.fillText(z2, 84, y + Math.round(s * 0.02)); y += h + 28;
    }
    if (z3) { passend(g, z3, '800 {s}px K8QSaira, "Saira Condensed", sans-serif', 56, 1120); schatten(z3, 64, y, GELB, 4); }
    g.font = '400 46px K8QAnton, Impact, sans-serif'; schatten('KREIDS888', 64, TH - 92, '#ffffff', 3);
  }
  async function thumbBlob(e) {
    const cv = document.createElement('canvas'); cv.width = TB; cv.height = TH;
    await schriften(); thumbZeichnen(cv, e.vid, e);
    for (const q of [0.9, 0.8, 0.7, 0.6]) { const b = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', q)); if (b && b.size <= 880000) return b; }
    throw new Error('Das Thumbnail ist zu groß geworden. Bitte ein anderes Bild aus dem Video wählen.');
  }
  let MALT = 0;
  async function thumbJetzt() {   // Vorschau im Editor neu zeichnen (nach dem Springen an die gewählte Stelle)
    const e = Q.ed, cv = BOX && BOX.querySelector('canvas.kq-thumb'); if (!e || !cv || !e.vid) return;
    const nr = ++MALT;
    await schriften();
    if (Math.abs((e.vid.currentTime || 0) - e.t) > 0.05) await springen(e.vid, e.t);
    if (nr === MALT) thumbZeichnen(cv, e.vid, e);
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
    Q.ed = { name, datei, url, vid, dauer, postMs, t: Math.round(Math.min(Math.max(1, dauer * 0.4), Math.max(0, dauer - 0.2)) * 10) / 10, ...v };
    zeichnen(); nachOben(); thumbJetzt();
  }
  function schliessen() {
    const e = Q.ed; if (!e) return;
    try { e.vid.removeAttribute('src'); e.vid.load(); } catch (x) { /* egal */ }
    URL.revokeObjectURL(e.url); Q.ed = null;
  }
  const nachOben = () => setTimeout(() => { const el = BOX && BOX.querySelector('.kq-editor'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  function arbeit(t) { Q.arbeit = t; const el = BOX && BOX.querySelector('.kq-arbeit span:last-child'); if (el) el.textContent = t; else zeichnen(); }

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
    const tb = (t, w) => `<span class="kq-tipp">${t}</span>`;
    return `<div class="kq-editor">
      <div class="kq-ed-links">
        <video src="${esc(e.url)}" controls playsinline preload="metadata" class="kq-video"></video>
        <div class="kq-dim">${esc(e.name)} · ${sek(e.dauer)} · ${mb(e.datei.size)} · geht so zu YouTube, wie es aus der Toolbox kommt</div>
        <div class="kq-schritt">Thumbnail <span class="kq-dim">· so sieht man es auf YouTube</span></div>
        <canvas class="kq-thumb" width="${TB}" height="${TH}"></canvas>
        <label class="kq-feld">Bild aus dem Video <b class="kq-twert">${sek(e.t)}</b><input type="range" min="0" max="${Math.max(0.1, e.dauer - 0.1).toFixed(1)}" step="0.1" value="${e.t}" data-q="t">${tb('Schieben, bis ein starkes Bild drin ist (z. B. ein Crash).')}</label>
        <div class="kq-zeilen">
          <label class="kq-feld">Zeile 1 (groß, weiß)<input type="text" maxlength="28" value="${esc(e.z1)}" data-q="z1"></label>
          <label class="kq-feld">Zeile 2 (rote Box)<input type="text" maxlength="28" value="${esc(e.z2)}" data-q="z2"></label>
          <label class="kq-feld">Zeile 3 (gelb, klein)<input type="text" maxlength="48" value="${esc(e.z3)}" data-q="z3"></label>
        </div>${tb('Leere Zeile = fällt weg. KREIDS888 steht immer unten links.')}
      </div>
      <div class="kq-ed-rechts">
        <label class="kq-feld">Titel<input type="text" maxlength="80" value="${esc(e.titel)}" data-q="titel">${tb('Die Hashtags #simracing #iracing #gt3 #crash kommen von selbst dazu.')}</label>
        <label class="kq-feld">Text (Beschreibung)<textarea rows="6" maxlength="2000" data-q="text">${esc(e.text)}</textarea>${tb('Darunter kommt von selbst: Kanal abonnieren.')}</label>
        <label class="kq-feld">Termin<input type="datetime-local" value="${esc(lokal(e.postMs))}" data-q="termin">${tb((stand().clipcfg || {}).freigabe !== false ? 'Öffentlich wird es erst zu diesem Termin und nach deiner Freigabe (unten bei „Eingeplant“ oder im Wochenplan).' : 'Öffentlich wird es zu diesem Termin von selbst („Freigabe nötig“ ist aus).')}</label>
        ${(stand().youtube || {}).verbunden ? '' : '<div class="kq-hinweis rot">⚠ YouTube ist nicht verbunden. Erst im Reiter „YouTube · TikTok · Discord“ verbinden.</div>'}
        <div class="kq-knoepfe">
          <button type="button" class="btn btn-red ki-k kq-los" data-q="los" ${Q.arbeit ? 'disabled' : ''} title="Lädt das Video jetzt privat zu YouTube hoch (mit Titel, Text, Hashtags und Thumbnail) und plant es für den Termin ein"><span>▶ Hochladen &amp; einplanen</span></button>
          <button type="button" class="btn ki-k" data-q="zu" ${Q.arbeit ? 'disabled' : ''} title="Schließt den Editor, es wird nichts hochgeladen">✕ Schließen</button>
        </div>
        <div class="kq-dim">Das Video wird jetzt <b>privat</b> hochgeladen. Bis zur Freigabe sieht es niemand.</div>
      </div></div>`;
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
    if (Q.ed) { thumbJetzt(); if (lief != null) { const v = BOX.querySelector('.kq-video'); if (v) v.currentTime = lief; } }
    if (Q.zeigen) { const z = BOX.querySelector(`.kq-plan[data-id="${CSS.escape(Q.zeigen)}"]`); if (z) { const d = z.closest('details.kq-raus'); if (d) d.open = true; setTimeout(() => z.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); } Q.zeigen = ''; }
  }

  async function klick(ev) {
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
    const t = ev.target, a = t.dataset && t.dataset.q, e = Q.ed; if (!a || !e) return;
    if (a === 't') { e.t = Number(t.value) || 0; const w = BOX.querySelector('.kq-twert'); if (w) w.textContent = sek(e.t); return thumbJetzt(); }
    if (a === 'z1' || a === 'z2' || a === 'z3') { e[a] = t.value; return thumbJetzt(); }
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
@media (max-width:640px){.kq .kq-pbild{flex-basis:120px}}`;
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
      schriften().then(() => { if (Q.ed) thumbJetzt(); });
    },
    zeigen(id) { Q.zeigen = String(id || ''); Q.zu = false; zeichnen(); },   // aus dem Wochenplan angeklickt
    _q: Q, _vorschlag: vorschlag, _thumbZeichnen: thumbZeichnen
  };
})();
