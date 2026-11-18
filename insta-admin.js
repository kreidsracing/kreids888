// ═══════════════════════════════════════════════════════════
// 📸 Instagram · Reiter im Kreids-Dashboard (kreids888-admin)
// • Ankündigung (Feed) X Tage vorher, Raceday-Story am Renntag, Rennergebnis (Feed)
// • Daten: Streamkalender (SPR live + eigene Einträge) und SPR-Ergebnisse
// • Eigene Rennen: nach dem Rennen „Ergebnis eintragen“
// • Bilder zeichnet der Browser (insta-bilder.js) und schickt sie an den Worker (Gratis-Tarif: 10 ms Rechenzeit)
// • YouTube-Thumbnail 1920×1080: Editor mit Vorlage für alle Rennen (insta-thumb.js), PNG unter 2 MB, sonst JPG
// • Modus „Mit Freigabe“ oder „Automatisch“
// Worker: workers/kreids-insta (kreids-insta.kreids.workers.dev), Login = Dashboard-Login
// Wird vom Dashboard geladen: K888Insta.start(box)
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  const INSTA = 'https://kreids-insta.kreids.workers.dev';
  // Gleicher Ort wie diese Datei (kreids888.com): Zeichnen + Thumbnail-Editor
  const BASIS = ((document.currentScript && document.currentScript.src) || 'https://kreids888.com/insta-admin.js').replace(/[^/]*$/, '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const token = () => { try { return localStorage.getItem('k888_token') || ''; } catch (e) { return ''; } };
  const zeit = ms => new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '').replace(', ', ' · ');
  const STIMMUNG = [['zufall', '🎲 Stimmung: Zufall'], ['nacht', '🌙 Nacht'], ['regen', '🌧 Regen'], ['regennacht', '🌧🌙 Regen + Nacht'], ['nebel', '🌫 Nebel'],
    ['sonnenuntergang', '🌅 Sonnenuntergang'], ['daemmerung', '🌆 Dämmerung'], ['sonnig', '☀ Sonnig'], ['gewitter', '⛈ Gewitter']];
  const KAMERA = [['zufall', '🎲 Blick: Zufall'], ['nah', '🔭 Nah, Autos groß'], ['schwenk', '💨 Mitzieher (Bewegung)'], ['frontal', '⬆ Frontal auf der Geraden'],
    ['kurve', '↪ Duell in der Kurve'], ['seite', '➡ Von der Seite']];
  const auswahl = (liste, wert, attr) => `<select ${attr}>${liste.map(([v, t]) => `<option value="${v}" ${v === wert ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  let SPRUCH_NEU = false;   // Spruch im Thumbnail geändert → Post-Bilder neu zeichnen
  let BOX = null, STAND = null, FEHLER = '', LAEDT = false, REITER = 'posts', THUMB_RK = '', MALT = '';
  let WARTET = null, UEBERNIMMT = false, LESEN_VERBOTEN = false, HILFE_OFFEN = false;

  // ─── Kurze Meldung unten rechts ───
  let toastZeit = 0;
  function meldung(t, fehler) {
    let el = document.getElementById('ki-toast');
    if (!el) { el = document.createElement('div'); el.id = 'ki-toast'; document.body.appendChild(el); }
    el.textContent = t; el.className = fehler ? 'rot an' : 'an';
    clearTimeout(toastZeit); toastZeit = setTimeout(() => { el.className = ''; }, fehler ? 6000 : 3500);
  }

  async function igApi(method, pfad, body) {
    const r = await fetch(INSTA + pfad, {
      method,
      headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || ('Fehler ' + r.status));
    return d;
  }

  async function laden(still) {
    if (LAEDT) return;
    LAEDT = true; FEHLER = '';
    if (!still) zeichnen();
    try { STAND = await igApi('GET', '/api/stand'); }
    catch (e) { FEHLER = e.message; }
    LAEDT = false;
    zeichnen();
    if (STAND && !still) abgleichen();
  }

  // ─── Bilder im Browser zeichnen und hochladen ───
  // Jeder offene Post bekommt sein Bild; ändern sich Daten/Design/Hintergrund (veraltet), wird neu gezeichnet.
  // Rennen der nächsten 7 Tage ohne Hintergrund bekommen vorher ein KI-Bild (höchstens 2 pro Öffnen).
  let GLEICHT = false, NOCHMAL_ABGLEICHEN = false;
  const offenePosts = () => (STAND ? STAND.posts : []).filter(p => p.status !== 'gepostet' && p.status !== 'uebersprungen');
  async function abgleichen() {
    if (GLEICHT) { NOCHMAL_ABGLEICHEN = true; return; }   // läuft schon: danach mit dem neuen Stand nochmal
    if (!STAND || !window.K888Bilder) return;
    GLEICHT = true;
    try {
      const ohneHg = [...new Map(offenePosts().filter(p => p.typ !== 'woche' && !p.hg && !p.kiFehler && p.postMs - Date.now() < 7 * 86400000).map(p => [p.rennKey, p])).values()];
      let ki = Math.min(2, (STAND.ki && STAND.ki.frei) || 0), neu = false;
      for (const p of ohneHg) {
        if (ki-- <= 0) break;
        malen(`🎨 KI-Hintergrund für ${p.track || p.titel || 'Rennen'} …`);
        try { const r = await igApi('POST', `/api/post/${encodeURIComponent(p.id)}/bild`, { neu: false }); if (r.ok) neu = true; } catch (e) { /* nächstes Mal */ }
      }
      if (neu) { STAND = await igApi('GET', '/api/stand'); zeichnen(); }
      const todo = offenePosts().filter(brauchtBild);
      let n = 0;
      for (const p of todo) {
        malen(`🖌 Bilder werden gezeichnet … ${++n}/${todo.length}`);
        try { await bildHochladen(p); } catch (e) { meldung('Bild „' + (TYP[p.typ] || p.typ) + '“ ging nicht: ' + e.message, 1); }
      }
      if (todo.length) { STAND = await igApi('GET', '/api/stand'); }
      // YouTube: Thumbnails der Rennen, die bald geplant werden, zeichnen und an den Worker geben
      const yt = STAND.youtube || {}, ytc = STAND.cfg.youtube || {};
      if (yt.verbunden && ytc.aktiv !== false && window.K888Thumb) {
        // bald geplant (Tage vorher) oder schon auf YouTube angelegt (z. B. „nächstes Rennen“, auch wenn weiter weg)
        const bald = rennenListe().filter(r => (r.typ === 'story' || r.typ === 'ank') && r.startMs > Date.now() && ((r.yt && r.yt.id) || r.startMs - Date.now() < ((ytc.tage || 3) + 1) * 86400000));
        let m = 0;
        for (const r of bald) {
          const h = thumbHash(r);
          if (r.ytThumbH === h) continue;
          malen(`▶ YouTube-Thumbnails … ${++m}`);
          try {
            const d = await window.K888Thumb.datei(window.K888Thumb.fuerRennen(STAND.thumbVorlage, r), r, STAND.design);
            await bildSenden(`/api/ytthumb/${encodeURIComponent(r.rennKey)}?h=${h}&s=${r.startMs}`, d.blob);
            for (const p of STAND.posts) if (p.rennKey === r.rennKey) p.ytThumbH = h;
          } catch (e) { meldung('YouTube-Thumbnail ging nicht: ' + e.message, 1); }
        }
      }
    } catch (e) { meldung(e.message, 1); }
    finally {
      GLEICHT = false; malen(''); zeichnen();
      if (NOCHMAL_ABGLEICHEN) { NOCHMAL_ABGLEICHEN = false; setTimeout(abgleichen, 0); }
    }
  }
  async function bildHochladen(p) {
    const v = p.vorlage && p.vorlage !== 'kreids' && window.K888Vorlagen ? (STAND.vorlagen || []).find(x => x.id === p.vorlage) : null;
    const vk = v ? JSON.parse(JSON.stringify(v)) : null;
    const alsVideo = !!vk && window.K888Vorlagen.istVideo(vk, p, VORLAGEN_UMG);
    const blob = vk ? await window.K888Vorlagen.bildFuer(vk, p, STAND.design, VORLAGEN_UMG) : await window.K888Bilder.post(p, STAND.design);
    const r = await fetch(INSTA + `/api/post/${encodeURIComponent(p.id)}/fertig?h=${encodeURIComponent(p.soll)}&video=${alsVideo ? 1 : 0}`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'image/jpeg' }, body: blob
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || ('Fehler ' + r.status));
    p.bild = d.bild; p.veraltet = false; p.istVideo = alsVideo;
    if (alsVideo) {
      const name = p.track || p.titel || 'Post';
      const mp4 = await window.K888Vorlagen.videoFuer(vk, p, STAND.design, VORLAGEN_UMG, x => malen(`🎬 Video für ${name} … ${Math.round(x * 100)} %`));
      malen(`🎬 Video für ${name} wird hochgeladen …`);
      const ver = Date.now(), teil = 1900000, teile = Math.ceil(mp4.size / teil);
      for (let i = 0; i < teile; i++) await bildSenden(`/api/post/${encodeURIComponent(p.id)}/videoteil/${i}?v=${ver}`, mp4.slice(i * teil, (i + 1) * teil, 'application/octet-stream'));
      const f = await igApi('POST', `/api/post/${encodeURIComponent(p.id)}/videofertig?v=${ver}`, { teile, groesse: mp4.size, hash: p.soll });
      p.video = f.video; p.videoHash = p.soll;
      if (mp4.ohneTon) meldung('Hinweis: Dieser Browser kann keinen AAC-Ton bauen – das Video ist ohne Ton.', 1);
    }
    return d;
  }
  // Fingerabdruck eines Thumbnails (ändert sich etwas → neu zeichnen und hochladen)
  function thumbHash(r) {
    const t = JSON.stringify([STAND.thumbVorlage, r.thumb || null, r.spruch, r.track, r.layout, r.serie, r.nr, r.titel, r.liveMs, r.startMs, r.hg, r.ergebnis, STAND.design.farbe1, STAND.design.logoBild]);
    let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  }
  // Vor dem Posten/Freigeben: aktuelles Bild sicherstellen
  const brauchtBild = p => !p.bild || p.veraltet || (p.istVideo && !p.video);
  async function bildSicher(id) {
    const p = (STAND.posts || []).find(x => x.id === id);
    if (p && brauchtBild(p)) await bildHochladen(p);
  }
  function malen(t) { MALT = t; const el = BOX && BOX.querySelector('.ki-malt'); if (el) { el.textContent = t; el.hidden = !t; } }
  // Bild als JPEG/PNG roh an den Worker (eigenes Bild, Gemini, ChatGPT)
  async function bildSenden(pfad, blob) {
    const r = await fetch(INSTA + pfad, { method: 'POST', headers: { Authorization: 'Bearer ' + token(), 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || ('Fehler ' + r.status));
    return d;
  }

  // ─── Zeichnen ───
  const STATUS = {
    wartet: ['Wartet auf Freigabe', 'gelb'], geplant: ['Geplant', 'blau'],
    fehler: ['Fehler', 'rot'], uebersprungen: ['Übersprungen', 'grau'], verpasst: ['Nicht gepostet – Zeit verpasst', 'rot']
  };
  const TYP = { ank: '📣 Ankündigung · Feed', story: '📱 Raceday · Story', erg: '🏁 Ergebnis · Feed', woche: '🗓 Wochenplan · Story' };
  const datumKurz = d => String(d || '').split('-').reverse().slice(0, 2).join('.') + '.';
  const titel = p => p.typ === 'woche' ? esc(`Woche ${datumKurz(p.datum)} – ${datumKurz(p.bisDatum)}`) : [p.serie || p.titel, p.nr ? 'R' + p.nr : '', [p.track, p.layout].filter(Boolean).join(' – ')].filter(Boolean).map(esc).join(' · ');

  // ▶ YouTube-Thumbnail 1920×1080 (pro Rennen): kleine Vorschau aus der Vorlage
  const thumbFeld = p => `<div class="ki-stream">
      <canvas class="ki-bild yt" width="480" height="270" data-thumb="${esc(p.rennKey)}" data-aktion="th-edit" data-rk="${esc(p.rennKey)}" title="Thumbnail bearbeiten"></canvas>
      <div class="ki-dim">▶ YouTube-Thumbnail · 1920×1080</div>
      <div class="ki-knoepfe" style="margin:0">
        <button class="btn btn-ghost ki-k" data-aktion="th-laden" data-rk="${esc(p.rennKey)}" title="PNG, oder JPG falls das PNG über 2 MB wäre"><span>📥 Laden</span></button>
        <button class="btn btn-ghost ki-k" data-aktion="th-edit" data-rk="${esc(p.rennKey)}"><span>✎ Bearbeiten</span></button>
      </div>
    </div>`;

  // ✅ Erledigt / nicht gepostet (letzte 36 Std.)
  const PRUEF = {};
  let ERL_OFFEN = false;
  function erledigtZeile(e) {
    const id = esc(e.id);
    const name = e.typ === 'woche' ? titel(e) : (titel(e) || (e.datum ? 'Rennen am ' + datumKurz(e.datum) : ''));
    const st = e.gepostet
      ? (e.gepostet.manuell ? `<span class="ki-chip grau">Als selbst gepostet markiert</span>` : `<span class="ki-chip gruen">Über das Dashboard gepostet</span>`) + ` <span class="ki-dim">${esc(zeit(e.gepostet.zeit))}</span>`
      : `<span class="ki-chip rot">Nicht gepostet</span>${e.fehler ? ` <span class="ki-dim">${esc(e.fehler)}</span>` : ''}`;
    const pr = PRUEF[e.id];
    const prText = !pr ? '' : pr.ok
      ? `<div class="ki-hinweis">✓ Instagram hat ihn (${esc(pr.typ === 'STORY' ? 'Story' : pr.typ || 'Post')}${pr.zeit ? ', ' + esc(zeit(Date.parse(pr.zeit))) : ''})${pr.link ? ` · <a class="ki-link" href="${esc(pr.link)}" target="_blank" rel="noopener">öffnen</a>` : ''}</div>`
      : `<div class="ki-hinweis rot">✗ Instagram kennt diesen Post nicht: ${esc(pr.fehler || '')}</div>`;
    const k = [];
    if (e.gepostet && e.gepostet.mediaId) k.push(`<button class="btn btn-ghost ki-k" data-aktion="pruefen" data-id="${id}"><span>🔍 Auf Instagram prüfen</span></button>`);
    if (e.gepostet) k.push(`<button class="btn btn-ghost ki-k" data-aktion="zurueck" data-id="${id}" data-api="${e.gepostet.manuell ? '0' : '1'}"><span>↩ Rückgängig</span></button>`);
    if (e.bild) k.push(`<a class="btn btn-ghost ki-k" href="${esc(e.bild)}?laden=1" download><span>📥 Bild laden</span></a>`);
    if (e.video) k.push(`<a class="btn btn-ghost ki-k" href="${esc(e.video)}" target="_blank" rel="noopener"><span>🎬 Video</span></a>`);
    const tk = STAND.tiktok || {};
    if (tk.verbunden && e.imPlan && e.bild && !(e.tiktok && e.tiktok.zeit)) k.push(`<button class="btn btn-ghost ki-k" data-aktion="tiktok" data-id="${id}"><span>♪ An TikTok</span></button>`);
    const ttText = !tk.verbunden || !e.tiktok ? '' : e.tiktok.zeit ? `<div class="ki-dim">♪ TikTok: Entwurf gesendet ${esc(zeit(e.tiktok.zeit))}</div>` : e.tiktok.fehler ? `<div class="ki-hinweis rot">♪ TikTok: ${esc(e.tiktok.fehler)}</div>` : '';
    return `<div class="ki-erl">
      ${e.bild ? `<a href="${esc(e.bild)}" target="_blank" rel="noopener" class="ki-erl-bild"><img src="${esc(e.bild)}" alt="" loading="lazy"></a>` : '<div class="ki-erl-bild"></div>'}
      <div class="ki-erl-text">
        <div class="ki-dim">${esc(TYP[e.typ] || e.typ)}</div>
        <div><b>${name}</b></div>
        <div>${st}</div>
        ${e.gepostet || e.imPlan ? '' : '<div class="ki-dim">Liegt außerhalb der Planung – nur noch zum Laden.</div>'}
        ${prText}${ttText}
        <div class="ki-knoepfe">${k.join('')}</div>
      </div>
    </div>`;
  }

  function postKarte(p, modus, mitThumb) {
    const [stText, stFarbe] = STATUS[p.status] || ['?', 'grau'];
    const bild = p.video
      ? `<div class="ki-bild ${p.typ} ki-vid"><video src="${esc(p.video)}" poster="${esc(p.bild)}" muted loop playsinline controls preload="none"></video><span class="ki-vidchip">🎬 Video</span></div>`
      : p.bild
      ? `<a href="${esc(p.bild)}" target="_blank" rel="noopener" class="ki-bild ${p.typ}" title="Vorschau groß öffnen"><img src="${esc(p.bild)}" alt="Vorschau" loading="lazy"></a>`
      : `<div class="ki-bild ${p.typ} leer">${GLEICHT ? '🖌 wird gezeichnet …' : 'Noch kein Bild'}</div>`;
    const id = esc(p.id), k = [];
    const kn = (aktion, text, extra = '', titel = '') => `<button class="btn btn-ghost ki-k" data-aktion="${aktion}" data-id="${id}" ${extra}${titel ? ` title="${esc(titel)}"` : ''}><span>${text}</span></button>`;
    const woche = p.typ === 'woche';
    if (!woche) {
      k.push(auswahl(STIMMUNG, STAND.cfg.stimmung || 'zufall', `data-stimmung="${id}" title="Stimmung für das nächste KI-Bild"`));
      k.push(auswahl(KAMERA, STAND.cfg.kamera || 'zufall', `data-kamera="${id}" title="Blickwinkel für das nächste KI-Bild"`));
      k.push(kn('gemini', '✨ Bild mit Gemini', '', 'Bild-Auftrag kopieren und Gemini daneben öffnen – das kopierte Bild wird automatisch übernommen'));
      k.push(kn('chatgpt', '🤖 Bild mit ChatGPT', '', 'ChatGPT daneben öffnen, der Bild-Auftrag steht schon drin – das kopierte Bild wird automatisch übernommen'));
      k.push(p.hg ? kn('neu', '🎲 Neues KI-Bild', '', 'Neues KI-Hintergrundbild für alle Posts dieses Rennens') : kn('bild', '🎨 KI-Hintergrund', '', 'KI-Hintergrundbild für alle Posts dieses Rennens'));
    }
    if (modus === 'freigabe' && p.status !== 'uebersprungen') k.push(p.freigegeben ? kn('freigeben', '↩ Freigabe zurück', 'data-an="0"')
      : `<button class="btn btn-red ki-k" data-aktion="freigeben" data-an="1" data-id="${id}"><span>✓ Freigeben</span></button>`);
    k.push(p.status === 'uebersprungen' ? kn('ueberspringen', '↺ Wieder aktivieren', 'data-an="0"') : kn('ueberspringen', '⏭ Überspringen', 'data-an="1"'));
    if (p.status !== 'uebersprungen') k.push(kn('jetzt', '🚀 Jetzt posten'));
    if (!woche) k.push(`<label class="btn btn-ghost ki-k ki-datei" title="Eigenes Hintergrundbild (z. B. iRacing-Screenshot) für alle Posts dieses Rennens"><span>📤 Eigenes Bild</span><input type="file" accept="image/*" data-eigenesbild="${id}"></label>`);
    if (p.bild) k.push(`<a class="btn btn-ghost ki-k" href="${esc(p.bild)}?laden=1" download><span>📥 Bild laden</span></a>`);
    if (p.video) k.push(`<a class="btn btn-ghost ki-k" href="${esc(p.video)}" download target="_blank" rel="noopener"><span>📥 Video laden</span></a>`);
    if (p.bild) k.push(kn('manuell', '✓ Hab ich selbst gepostet', 'data-an="1"', 'Nur klicken, wenn du das Bild schon selbst in der Insta-App gepostet hast – hier wird nichts gepostet'));
    if (p.eigenesErgebnis) k.push(`<button class="btn btn-ghost ki-k" data-aktion="erg-weg" data-rk="${esc(p.rennKey)}"><span>✕ Ergebnis löschen</span></button>`);
    const tk = STAND.tiktok || {}, ttTypen = ((STAND.cfg.tiktok || {}).typen) || [];
    if (tk.verbunden && p.bild && !(p.tiktok && p.tiktok.zeit)) k.push(kn('tiktok', '♪ An TikTok', '', 'Bild als Entwurf in deine TikTok-Inbox schicken'));
    const yt = STAND.youtube || {};
    if (mitThumb && p.yt && yt.verbunden && p.startMs > Date.now()) k.push(`<button class="btn btn-ghost ki-k" data-aktion="yt-planen" data-rk="${esc(p.rennKey)}"><span>▶ ${p.yt.id ? 'YouTube aktualisieren' : 'Jetzt auf YouTube planen'}</span></button>`);
    const h = [];
    if (p.status !== 'gepostet' && (STAND.videos || []).length && p.typ !== 'woche') {
      const rv = (p.thumb && p.thumb.video) || '';
      h.push(`<div class="ki-vwahl">🎬 Video für dieses Rennen: <select data-rvideo="${esc(p.rennKey)}" data-start="${esc(p.startMs)}"><option value="">– keins –</option>${STAND.videos.map(x => `<option value="${esc(x.id)}" ${rv === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`);
      if (rv && p.vorlage === 'kreids') h.push('<div class="ki-hinweis">Das Video braucht eine eigene Vorlage – oben bei „🧩 Vorlage“ eine wählen (z. B. „Video Raceday“).</div>');
    }
    if (p.istVideo && !p.video && p.status !== 'gepostet') h.push('<div class="ki-dim">🎬 Video wird beim Öffnen gezeichnet …</div>');
    if (p.status !== 'gepostet') {
      const fmt = p.typ === 'story' || p.typ === 'woche' ? 'story' : 'feed';
      const passend = (STAND.vorlagen || []).filter(v => v.format === fmt);
      h.push(`<div class="ki-vwahl">🧩 Vorlage: <select data-vorlage="${id}"><option value="kreids" ${p.vorlage === 'kreids' ? 'selected' : ''}>Kreids-Design</option>${passend.map(v => `<option value="${esc(v.id)}" ${p.vorlage === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
        <button type="button" class="btn btn-ghost ki-k" data-aktion="vwuerfeln" data-id="${id}" title="Andere Vorlage aus dem Wechsel"><span>🎲</span></button>
        ${p.vorlageFest ? `<button type="button" class="ki-link" data-aktion="vauto" data-id="${id}">selbst gewählt · ↺ automatisch</button>` : ''}</div>`);
    }
    if (p.fehler) h.push(`<div class="ki-hinweis rot">⚠ ${esc(p.fehler)}</div>`);
    if (p.bildQuelle) h.push(`<div class="ki-dim">Hintergrund: ${esc(p.bildQuelle)}</div>`);
    if (WARTET && WARTET.id === p.id) { const n = (KI[WARTET.quelle] || KI.gemini).name; h.push(`<div class="ki-hinweis gelb">${WARTET.quelle === 'chatgpt' ? '🤖' : '✨'} Wartet auf das Bild aus ${n}: im ${n}-Fenster Rechtsklick aufs Bild → „Bild kopieren“ → hier ins Fenster klicken (oder Strg+V). <button type="button" class="ki-link" data-aktion="ki-ab">Abbrechen</button></div>`); }
    if (p.kiFehler) h.push(`<div class="ki-hinweis">KI-Bild ging nicht (${esc(p.kiFehler)}). Bis dahin gibt es einen Ersatz-Hintergrund.</div>`);
    if (p.typ === 'story') h.push('<div class="ki-hinweis">Link-Sticker geht nur von Hand: „📥 Bild laden“ → in der Insta-App als Story posten → hier „✓ Hab ich selbst gepostet“.</div>');
    if (p.status === 'verpasst') h.push('<div class="ki-hinweis rot">Die Zeit ist vorbei, der Post ist nicht rausgegangen. „🚀 Jetzt posten“ schickt ihn sofort.</div>');
    const text = p.text ? `<details class="ki-text"><summary>Text unter dem Post</summary><pre>${esc(p.text)}</pre></details>` : '';
    // Status YouTube / TikTok
    if (mitThumb && p.yt && yt.verbunden) {
      if (p.yt.id) h.push(`<div class="ki-dim">▶ YouTube: geplant · <a class="ki-link" href="https://www.youtube.com/watch?v=${esc(p.yt.id)}" target="_blank" rel="noopener">ansehen</a>${p.yt.thumbH ? ' · Thumbnail drin' : ''}</div>`);
      else if (p.startMs > Date.now()) h.push(`<div class="ki-dim">▶ YouTube: wird automatisch geplant – ${(STAND.cfg.youtube || {}).naechstes !== false ? 'sobald das Rennen davor vorbei ist, spätestens ' : ''}${esc((STAND.cfg.youtube || {}).tage || 3)} Tage vorher</div>`);
      if (p.yt.fehler) h.push(`<div class="ki-hinweis rot">▶ YouTube: ${esc(p.yt.fehler)}</div>`);
    }
    if (tk.verbunden && ttTypen.includes(p.typ)) {
      if (p.tiktok && p.tiktok.zeit) h.push(`<div class="ki-dim">♪ TikTok: Entwurf gesendet ${esc(zeit(p.tiktok.zeit))} – in der TikTok-App fertig machen (24 Std.)</div>`);
      else h.push('<div class="ki-dim">♪ TikTok: geht zur gleichen Zeit als Entwurf in deine Inbox</div>');
      if (p.tiktok && p.tiktok.fehler) h.push(`<div class="ki-hinweis rot">♪ TikTok: ${esc(p.tiktok.fehler)}</div>`);
    }
    const wann = woche ? `${(p.liste || []).length} Termine in dieser Woche`
      : p.typ === 'erg'
      ? `Rennen vom ${esc(new Date(p.startMs).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' }))} · <b>${esc(p.platz)}</b>`
      : `Live ab ${esc(zeit(p.liveMs).split(' · ')[1] || '')} Uhr`;
    return `<div class="ki-post">
      ${bild}${mitThumb ? thumbFeld(p) : ''}
      <div class="ki-info">
        <div class="ki-kopf"><b>${TYP[p.typ] || p.typ}</b><span class="ki-chip ${stFarbe}">${stText}</span>${p.art && p.art !== 'Rennen' ? `<span class="ki-chip grau">${esc(p.art)}</span>` : ''}</div>
        <div class="ki-titel">${titel(p)}</div>
        <div class="ki-dim">geht raus: <b>${esc(zeit(p.postMs))}</b> · ${wann}</div>
        ${h.join('')}
        ${text}
        <div class="ki-knoepfe">${k.join('')}</div>
      </div>
    </div>`;
  }

  // 🏁 Eigene Rennen: Ergebnis von Hand eintragen
  const ergebnisForm = r => `<div class="ki-erg" data-rk="${esc(r.rennKey)}">
      <div class="ki-titel">${esc(r.serie || r.titel)}${r.track ? ' · ' + esc([r.track, r.layout].filter(Boolean).join(' – ')) : ''}</div>
      <div class="ki-dim">${esc(zeit(r.startMs))}${r.serie && r.titel && r.titel !== r.serie ? ' · ' + esc(r.titel) : ''}</div>
      <div class="ki-reihe">
        <div class="ki-fg"><label>Start</label><input type="number" min="1" max="99" data-f="start" placeholder="P"></div>
        <div class="ki-fg"><label>Ziel</label><input type="number" min="1" max="99" data-f="ziel" placeholder="P"></div>
        <div class="ki-fg"><label>Punkte</label><input type="number" min="0" max="999" data-f="punkte" placeholder="0"></div>
        <div class="ki-fg"><label>Wertung</label><select data-f="status"><option value="">Im Ziel</option><option value="DNF">DNF</option><option value="DSQ">DSQ</option></select></div>
        <button class="btn btn-red ki-k" data-aktion="erg"><span>💾 Ergebnis speichern</span></button>
      </div>
    </div>`;

  const hilfe = () => `<details class="ki-hilfe"${HILFE_OFFEN ? ' open' : ''}><summary>ℹ So geht „✨ Bild mit Gemini“ / „🤖 Bild mit ChatGPT“</summary>
    <ol>
      <li>Am Post auf <b>„✨ Bild mit Gemini“</b> oder <b>„🤖 Bild mit ChatGPT“</b> klicken – das Fenster öffnet sich rechts.</li>
      <li>Gemini: <b>Strg+V</b> und <b>Enter</b>. ChatGPT: Text steht schon drin → <b>Enter</b>.</li>
      <li>Rechtsklick aufs fertige Bild → <b>„Bild kopieren“</b>.</li>
      <li>Ins Dashboard klicken – das Bild ist automatisch für alle Posts dieses Rennens drin.</li>
    </ol>
    <div class="ki-dim">Beim ersten Mal fragt Chrome nach der Zwischenablage → „Zulassen“. Klappt das Zurückklicken nicht: im Dashboard Strg+V drücken.</div>
  </details>`;

  // 📡 YouTube: Livestreams planen · TikTok: Entwürfe
  let STREAMS = null;
  function youtubePanel() {
    const y = STAND.youtube || {}, c = STAND.cfg.youtube || {};
    const status = !y.eingerichtet ? '<div class="ki-hinweis">Noch nicht eingerichtet: In Cloudflare fehlen GOOGLE_CLIENT_ID und GOOGLE_CLIENT_SECRET (siehe Anleitung).</div>'
      : y.verbunden ? `<div class="ki-konto gruen">● Verbunden${y.kanal ? ' mit <b>' + esc(y.kanal) + '</b>' : ''}</div>`
        : '<div class="ki-konto rot">● Nicht verbunden</div>';
    return `<div class="ki-panel"><h3>▶ YouTube · Livestreams planen</h3>
      ${status}
      ${y.fehler ? `<div class="ki-hinweis rot">⚠ ${esc(y.fehler)}</div>` : ''}
      <div class="ki-knoepfe">${y.eingerichtet ? (y.verbunden ? '<button class="btn btn-ghost ki-k" data-aktion="trennen" data-wert="youtube"><span>Trennen</span></button>' : '<button class="btn btn-red ki-k" data-aktion="verbinden" data-wert="youtube"><span>Mit YouTube verbinden</span></button>') : ''}</div>
      <label class="chk"><input type="checkbox" id="ki-yt-an" ${c.aktiv !== false ? 'checked' : ''}> Rennen automatisch als Livestream planen (mit Thumbnail)</label>
      <label class="chk"><input type="checkbox" id="ki-yt-naechstes" ${c.naechstes !== false ? 'checked' : ''}> Nächstes Rennen gleich anlegen, sobald das vorige vorbei ist</label>
      <div class="ki-reihe">
        <div class="ki-fg"><label for="ki-yt-tage">Tage vorher</label><input id="ki-yt-tage" type="number" min="1" max="14" value="${esc(c.tage || 3)}"></div>
        <div class="ki-fg"><label for="ki-yt-sicht">Sichtbarkeit</label><select id="ki-yt-sicht"><option value="public" ${c.sichtbar !== 'unlisted' ? 'selected' : ''}>Öffentlich</option><option value="unlisted" ${c.sichtbar === 'unlisted' ? 'selected' : ''}>Nicht gelistet</option></select></div>
        <div class="ki-fg" style="flex:1 1 220px"><label for="ki-yt-stream">Stream-Schlüssel (OBS)</label><select id="ki-yt-stream"><option value="">– in YouTube Studio wählen –</option>${(STREAMS || (c.stream ? [{ id: c.stream, name: 'gespeicherter Schlüssel' }] : [])).map(x => `<option value="${esc(x.id)}" ${c.stream === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      </div>
      <div class="ki-fg"><label for="ki-yt-titel">Titel</label><input id="ki-yt-titel" type="text" maxlength="200" value="${esc(c.titel || '')}"></div>
      <div class="ki-fg"><label for="ki-yt-bq">Beschreibung</label><select id="ki-yt-bq"><option value="letzter" ${c.beschrQuelle !== 'eigen' ? 'selected' : ''}>Automatisch vom letzten eigenen YouTube-Stream</option><option value="eigen" ${c.beschrQuelle === 'eigen' ? 'selected' : ''}>Eigener Text</option></select></div>
      <div class="ki-ytbeschr">${ytBeschrHtml()}</div>
      <div class="ki-fg ki-yt-eigen"><textarea id="ki-yt-text" rows="6">${esc(c.beschreibung || '')}</textarea></div>
      <div class="ki-dim">Platzhalter: {spruch} {strecke} {serie} {runde} {titel} {datum} {wochentag} {zeit} {klassen}. Der Spruch kommt vom Thumbnail. Titel höchstens 100 Zeichen.</div>
      <div class="ki-knoepfe"><button class="btn btn-red ki-k" data-aktion="kanal-speichern"><span>💾 Speichern</span></button></div>
      ${y.verbunden ? `<h3>📺 Angelegte Livestreams</h3><div class="ki-ytliste">${ytListeHtml()}</div>` : ''}
    </div>`;
  }
  // Übernommene Beschreibung + vom Dashboard angelegte Livestreams (kommt von YouTube, wird nachgeladen)
  let YTLISTE = null;
  function ytBeschrHtml() {
    const eigen = ((document.getElementById('ki-yt-bq') || {}).value || (STAND.cfg.youtube || {}).beschrQuelle) === 'eigen';
    const box = document.querySelector('#instaApp .ki-yt-eigen');
    const b = YTLISTE && YTLISTE.beschreibung;
    if (box) box.style.display = eigen || (YTLISTE && !b) ? '' : 'none';
    if (eigen) return '';
    if (!(STAND.youtube || {}).verbunden) return '<div class="ki-dim">Erst mit YouTube verbinden.</div>';
    if (!YTLISTE) return '<div class="ki-dim">Wird von YouTube geholt …</div>';
    if (!b) return '<div class="ki-hinweis gelb">Kein eigener Stream mit Beschreibung gefunden – solange gilt dieser Text:</div>';
    return `<div class="ki-dim">Von: <b>${esc(b.titel || 'letzter Stream')}</b>${b.zeit ? ' · ' + esc(zeit(b.zeit)) : ''} · <a href="#" class="ki-link" data-aktion="yt-neu">🔄 neu holen</a></div>
      <pre class="ki-ytvorschau">${esc(b.text)}</pre>`;
  }
  function ytListeHtml() {
    if (!YTLISTE) return '<div class="ki-dim">Wird geladen …</div>';
    const l = YTLISTE.streams || [];
    if (!l.length) return '<div class="ki-dim">Noch keine – das nächste Rennen wird beim nächsten Lauf (alle 10 Min.) angelegt.</div>';
    const st = { created: ['geplant', 'blau'], ready: ['geplant', 'blau'], testStarting: ['Test', 'gelb'], testing: ['Test', 'gelb'], liveStarting: ['startet', 'gelb'], live: ['live', 'rot'], complete: ['beendet', 'grau'], revoked: ['abgebrochen', 'grau'], geloescht: ['in YouTube gelöscht', 'grau'] };
    return l.map(x => {
      const [t, f] = st[x.status] || [x.status || '?', 'grau'];
      const weg = x.status === 'geloescht';
      return `<div class="ki-ytstream${x.status === 'complete' || weg ? ' alt' : ''}">
        ${x.bild ? `<img src="${esc(x.bild + (x.bild.includes('?') ? '&' : '?') + 'v=' + (x.thumbH || ''))}" alt="" loading="lazy">` : '<div class="ki-ytleer">▶</div>'}
        <div class="ki-ytinfo"><b>${esc(x.titel || 'Livestream')}</b>
          <div class="ki-dim">${x.start ? esc(zeit(x.start)) : ''} <span class="ki-chip ${f}">${esc(t)}</span>${x.sichtbar === 'unlisted' ? ' <span class="ki-chip grau">nicht gelistet</span>' : ''}${x.thumb ? '' : ' <span class="ki-chip gelb">ohne Thumbnail</span>'}</div>
          ${x.fehler ? `<div class="ki-hinweis rot">⚠ ${esc(x.fehler)}</div>` : ''}
          ${weg ? '' : `<div class="ki-dim"><a class="ki-link" href="https://studio.youtube.com/video/${esc(x.id)}/livestreaming" target="_blank" rel="noopener">YouTube Studio</a> · <a class="ki-link" href="https://www.youtube.com/watch?v=${esc(x.id)}" target="_blank" rel="noopener">ansehen</a></div>`}
        </div></div>`;
    }).join('');
  }
  async function ytListeLaden(neu) {
    if (!(STAND.youtube || {}).verbunden || (YTLISTE && !neu)) return;
    try { YTLISTE = await igApi('GET', '/api/youtube/liste' + (neu ? '?neu=1' : '')); }
    catch (e) { YTLISTE = { beschreibung: null, streams: [] }; meldung('YouTube: ' + e.message, 1); }
    const b = BOX && BOX.querySelector('.ki-ytbeschr'), l = BOX && BOX.querySelector('.ki-ytliste');
    if (b) b.innerHTML = ytBeschrHtml();
    if (l) l.innerHTML = ytListeHtml();
  }
  function tiktokPanel() {
    const t = STAND.tiktok || {}, typen = ((STAND.cfg.tiktok || {}).typen) || [];
    const status = !t.eingerichtet ? '<div class="ki-hinweis">Noch nicht eingerichtet: In Cloudflare fehlen TIKTOK_CLIENT_KEY und TIKTOK_CLIENT_SECRET (siehe Anleitung).</div>'
      : t.verbunden ? `<div class="ki-konto gruen">● Verbunden${t.name ? ' mit <b>' + esc(t.name) + '</b>' : ''}</div>` : '<div class="ki-konto rot">● Nicht verbunden</div>';
    const art = (k, n) => `<label class="chk"><input type="checkbox" data-tt="${k}" ${typen.includes(k) ? 'checked' : ''}> ${n}</label>`;
    return `<div class="ki-panel"><h3>♪ TikTok · Entwürfe</h3>
      ${status}
      <div class="ki-knoepfe">${t.eingerichtet ? (t.verbunden ? '<button class="btn btn-ghost ki-k" data-aktion="trennen" data-wert="tiktok"><span>Trennen</span></button>' : '<button class="btn btn-red ki-k" data-aktion="verbinden" data-wert="tiktok"><span>Mit TikTok verbinden</span></button>') : ''}</div>
      <div class="ki-fg"><label>Zusätzlich als Entwurf an TikTok</label><div class="ki-reihe">${art('story', 'Raceday-Story')}${art('woche', 'Wochenplan')}${art('erg', 'Ergebnis')}${art('ank', 'Ankündigung')}</div></div>
      <div class="ki-dim">Geht zur gleichen Zeit wie bei Instagram raus. Du bekommst eine Nachricht in der TikTok-App: Musik dazu und selbst posten – innerhalb von 24 Stunden.</div>
      <div class="ki-knoepfe"><button class="btn btn-red ki-k" data-aktion="kanal-speichern"><span>💾 Speichern</span></button></div>
    </div>`;
  }
  async function streamsLaden() {
    if (STREAMS || !(STAND.youtube || {}).verbunden) return;
    try { STREAMS = (await igApi('GET', '/api/youtube/streams')).streams || []; if (REITER === 'kanaele') zeichnen(); }
    catch (e) { STREAMS = []; meldung(e.message, 1); }
  }
  function kanaeleAusFormular() {
    const v = id => document.getElementById(id);
    return {
      ...STAND.cfg,
      youtube: { aktiv: v('ki-yt-an').checked, tage: parseInt(v('ki-yt-tage').value, 10) || 3, naechstes: v('ki-yt-naechstes').checked, sichtbar: v('ki-yt-sicht').value, stream: v('ki-yt-stream').value, titel: v('ki-yt-titel').value, beschreibung: v('ki-yt-text').value, beschrQuelle: v('ki-yt-bq').value },
      tiktok: { typen: [...BOX.querySelectorAll('[data-tt]')].filter(x => x.checked).map(x => x.dataset.tt) }
    };
  }

  function zeitenPanel(cfg) {
    const a = cfg.ankuendigung, s = cfg.story, e = cfg.ergebnis;
    const typ = t => `<label class="chk"><input type="checkbox" data-typ="${t}" ${cfg.typen.includes(t) ? 'checked' : ''}> ${t}</label>`;
    return `<div class="ki-panel"><h3>⏰ Zeiten</h3>
      <label class="chk"><input type="checkbox" id="ki-ank-an" ${a.aktiv ? 'checked' : ''}> Ankündigung im Feed</label>
      <div class="ki-reihe">
        <div class="ki-fg"><label for="ki-ank-tage">Tage vorher</label><input id="ki-ank-tage" type="number" min="0" max="14" value="${esc(a.tage)}"></div>
        <div class="ki-fg"><label for="ki-ank-zeit">Uhrzeit</label><input id="ki-ank-zeit" type="time" value="${esc(a.zeit)}"></div>
      </div>
      <label class="chk"><input type="checkbox" id="ki-story-an" ${s.aktiv ? 'checked' : ''}> Raceday-Story am Renntag</label>
      <div class="ki-reihe"><div class="ki-fg"><label for="ki-story-zeit">Uhrzeit</label><input id="ki-story-zeit" type="time" value="${esc(s.zeit)}"></div></div>
      <label class="chk"><input type="checkbox" id="ki-erg-an" ${e.aktiv ? 'checked' : ''}> Rennergebnis im Feed (am Tag nach dem Rennen)</label>
      <div class="ki-reihe"><div class="ki-fg"><label for="ki-erg-zeit">Uhrzeit</label><input id="ki-erg-zeit" type="time" value="${esc(e.zeit)}"></div></div>
      <label class="chk"><input type="checkbox" id="ki-woche-an" ${(cfg.woche || {}).aktiv !== false ? 'checked' : ''}> Wochenplan als Story (sonntags, für die Woche danach)</label>
      <div class="ki-reihe">
        <div class="ki-fg"><label for="ki-woche-zeit">Uhrzeit</label><input id="ki-woche-zeit" type="time" value="${esc((cfg.woche || {}).zeit || '17:00')}"></div>
        <div class="ki-fg"><label for="ki-woche-pose">Bild von dir</label><select id="ki-woche-pose"><option value="">– kein Bild –</option>${((window.K888Thumb && window.K888Thumb.POSEN) || []).map(([d, n]) => `<option value="${esc(d)}" ${(cfg.woche || {}).pose === d ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      </div>
      <div class="ki-fg"><label>Posts für</label><div class="ki-reihe">${['Rennen', 'Stream', 'Training'].map(typ).join('')}</div></div>
      <div class="ki-fg"><label for="ki-live">„Live ab“ bei SPR-Rennen</label><select id="ki-live">
        <option value="quali" ${cfg.liveAb === 'quali' ? 'selected' : ''}>Quali-Start (Start + Training)</option>
        <option value="rennen" ${cfg.liveAb === 'rennen' ? 'selected' : ''}>Rennstart (Start + Training + Quali)</option>
        <option value="start" ${cfg.liveAb === 'start' ? 'selected' : ''}>Serverstart</option>
      </select></div>
      <div class="ki-reihe">
        <div class="ki-fg"><label for="ki-stimmung">Stimmung (automatische Bilder)</label>${auswahl(STIMMUNG, cfg.stimmung || 'zufall', 'id="ki-stimmung"')}</div>
        <div class="ki-fg"><label for="ki-kamera">Blickwinkel</label>${auswahl(KAMERA, cfg.kamera || 'zufall', 'id="ki-kamera"')}</div>
      </div>
      <label class="chk"><input type="checkbox" id="ki-ki" ${cfg.kiHinweis ? 'checked' : ''}> Bei Instagram als KI-Bild kennzeichnen</label>
    </div>`;
  }

  function textPanel(cfg) {
    return `<div class="ki-panel"><h3>✍ Texte unter den Posts</h3>
      <div class="ki-fg"><label for="ki-text">Ankündigung</label><textarea id="ki-text" rows="8">${esc(cfg.text)}</textarea></div>
      <div class="ki-dim">Platzhalter: {countdown} {serie} {titel} {runde} {strecke} {wochentag} {datum} {start} {live} {livezeile} {klassen}</div>
      <div class="ki-fg"><label for="ki-text-erg">Rennergebnis</label><textarea id="ki-text-erg" rows="7">${esc(cfg.textErgebnis)}</textarea></div>
      <div class="ki-dim">Platzhalter: {platz} {startplatz} {ziel} {delta} {punkte} {serie} {strecke} {datum}. Eine Zeile mit leerem Platzhalter fällt weg. Storys haben bei Instagram keinen Text.</div>
    </div>`;
  }

  // 🎨 Aussehen: Logo, Team-Bild, Spruch (an/aus, in der Vorschau verschieben + Mausrad = Größe), Farben, Texte
  let DTEAM = null, DLAYOUT = null, DFORMAT = 'ank', DAENDERUNG = false;
  const FORMATE = [['ank', 'Ankündigung'], ['story', 'Raceday-Story'], ['erg', 'Ergebnis']];
  function designPanel(d) {
    const team = (window.K888Bilder && window.K888Bilder.TEAM) || [];
    const tUrl = x => (window.K888Bilder ? window.K888Bilder.teamUrl(x) : '');
    if (DTEAM === null) DTEAM = d.team || '';
    if (!DLAYOUT && window.K888Bilder) DLAYOUT = window.K888Bilder.layoutAus(d);
    const formate = FORMATE.filter(([t]) => STAND.posts.some(p => p.typ === t));
    if (formate.length && !formate.some(f => f[0] === DFORMAT)) DFORMAT = formate[0][0];
    const chk = (id, an, text) => `<label class="chk"><input type="checkbox" id="${id}" ${an !== false ? 'checked' : ''}> ${text}</label>`;
    return `<div class="ki-panel ki-design"><h3>🎨 Aussehen</h3>
      <div class="ki-logo">${d.logoBild ? `<img src="${esc(d.logoBild)}" alt="Logo">` : '<span>kein Logo</span>'}</div>
      ${chk('ki-logo-an', d.logoAn, 'Logo zeigen')}
      <div class="ki-fg"><label for="ki-logo">Logo-Link (PNG oder JPG)</label><input id="ki-logo" type="text" spellcheck="false" value="${esc(d.logoUrl || '')}" placeholder="https://…/logo.png"></div>
      ${chk('ki-team-an', d.teamAn, 'Team-Bild zeigen')}
      <div class="ki-tgal">
        <button type="button" data-team="" class="${!DTEAM ? 'an' : ''}">Kein</button>
        ${team.map(([f, n]) => `<button type="button" data-team="${esc(f)}" class="${DTEAM === f ? 'an' : ''}" title="${esc(n)}"><img src="${esc(tUrl(f))}" alt="${esc(n)}" loading="lazy"></button>`).join('')}
      </div>
      ${chk('ki-team-s', d.teamSchwarz, 'Schwarzen Hintergrund des Team-Bilds ausblenden')}
      ${chk('ki-spruch-an', d.spruchAn, 'Spruch vom Thumbnail zeigen')}
      <div class="ki-dim">Den Spruch stellst du pro Rennen unter „▶ Thumbnail“ ein – ohne eigenen Spruch steht ein passender Standard-Spruch da.</div>
      <div class="ki-reihe">
        <div class="ki-fg"><label for="ki-f1">Farbe 1</label><input id="ki-f1" type="color" value="${esc(d.farbe1)}"></div>
        <div class="ki-fg"><label for="ki-f2">Farbe 2</label><input id="ki-f2" type="color" value="${esc(d.farbe2)}"></div>
      </div>
      <div class="ki-fg"><label for="ki-livetext">„Live auf …“ (Story und Thumbnail)</label><input id="ki-livetext" type="text" value="${esc(d.liveText || '')}" placeholder="YouTube · @Kreids888"></div>
      <div class="ki-fg"><label for="ki-autos">Fahrzeuge fürs KI-Bild (optional)</label><input id="ki-autos" type="text" value="${esc(d.fahrzeuge || '')}" placeholder="leer = passend zur Serie, z. B. Porsche 911 GT3 Cup"></div>
      <div class="ki-knoepfe"><button class="btn btn-red ki-k" data-aktion="design"><span>💾 Aussehen speichern</span></button><span class="kt-dirty ki-ddirty">${DAENDERUNG ? '● Änderungen noch nicht gespeichert' : ''}</span></div>
      <div class="ki-dim">Danach werden alle Bilder automatisch neu gezeichnet.</div>
    </div>
    <div class="ki-panel ki-design"><h3>Vorschau</h3>
      <div class="ki-reiter side" style="margin:0">${formate.map(([t, n]) => `<a class="${DFORMAT === t ? 'active' : ''}" data-aktion="dformat" data-wert="${t}">${n}</a>`).join('')}</div>
      <div class="ki-dvorbox"><img class="ki-dvor" alt="Vorschau"><div class="ki-ziele"></div></div>
      <div class="ki-dim">Logo, Team-Bild und Spruch mit der Maus ziehen · Mausrad = Größe. Feed (Ankündigung + Ergebnis) und Story haben eigene Plätze.</div>
      <div class="ki-knoepfe"><button class="btn btn-ghost ki-k" data-aktion="dreset"><span>↺ Plätze zurücksetzen</span></button></div>
    </div>`;
  }
  function designAusFormular() {
    const v = x => document.getElementById(x);
    return {
      logoUrl: v('ki-logo').value.trim(), farbe1: v('ki-f1').value, farbe2: v('ki-f2').value, liveText: v('ki-livetext').value, fahrzeuge: v('ki-autos').value,
      logoAn: v('ki-logo-an').checked, teamAn: v('ki-team-an').checked, spruchAn: v('ki-spruch-an').checked,
      team: DTEAM || '', teamSchwarz: v('ki-team-s').checked, layout: DLAYOUT
    };
  }
  function designGeaendert() {
    DAENDERUNG = true;
    const d = BOX && BOX.querySelector('.ki-ddirty'); if (d) d.textContent = '● Änderungen noch nicht gespeichert';
    designVorschau();
  }
  let DV_TIMER = 0, DV_URL = '', DV_NR = 0;
  function designVorschau(sofort) {
    clearTimeout(DV_TIMER);
    DV_TIMER = setTimeout(async () => {
      const img = BOX && BOX.querySelector('.ki-dvor');
      if (!img || !window.K888Bilder || !STAND) return;
      const p = STAND.posts.find(x => x.typ === DFORMAT) || STAND.posts.find(x => x.typ !== 'woche');
      if (!p) { img.alt = 'Kein Post zum Anzeigen'; return; }
      const nr = ++DV_NR;
      try {
        const blob = await window.K888Bilder.post(p, { ...STAND.design, ...designAusFormular(), logoBild: STAND.design.logoBild });
        if (nr !== DV_NR) return;
        if (DV_URL) URL.revokeObjectURL(DV_URL);
        DV_URL = URL.createObjectURL(blob); img.src = DV_URL;
        const H = p.typ === 'story' ? 1920 : 1350, z = BOX.querySelector('.ki-ziele');
        if (z) z.innerHTML = (blob.boxen || []).map(b => `<div class="ki-ziel" data-el="${b.el}" style="left:${b.x / 10.8}%;top:${b.y / H * 100}%;width:${b.w / 10.8}%;height:${b.h / H * 100}%"><span>${{ logo: 'Logo', team: 'Team-Bild', spruch: 'Spruch' }[b.el]}</span></div>`).join('');
      } catch (e) { /* egal */ }
    }, sofort ? 0 : 250);
  }
  // Ziehen und Mausrad auf den Ebenen der Vorschau
  let DZIEH = null;
  function dRunter(ev) {
    const z = ev.target.closest('.ki-ziel'); if (!z || !BOX.contains(z)) return;
    ev.preventDefault();
    DZIEH = { z, el: z.dataset.el, x: ev.clientX, y: ev.clientY };
    z.classList.add('zieht');
  }
  function dBewegen(ev) {
    if (!DZIEH) return;
    DZIEH.z.style.transform = `translate(${ev.clientX - DZIEH.x}px, ${ev.clientY - DZIEH.y}px)`;
  }
  function dHoch(ev) {
    if (!DZIEH) return;
    const { el, x, y } = DZIEH; DZIEH = null;
    const img = BOX.querySelector('.ki-dvor'); if (!img || !img.clientWidth) return;
    const fmt = DFORMAT === 'story' ? 'story' : 'feed', H = fmt === 'story' ? 1920 : 1350;
    const dx = (ev.clientX - x) * 1080 / img.clientWidth, dy = (ev.clientY - y) * H / img.clientHeight;
    if (Math.abs(dx) + Math.abs(dy) < 2) { designVorschau(true); return; }
    const e = DLAYOUT[fmt][el];
    if (el === 'spruch') { e.x = Math.round(e.x + dx); e.y = Math.round(e.y + dy); } else { e.cx = Math.round(e.cx + dx); e.cy = Math.round(e.cy + dy); }
    designGeaendert();
  }
  function dRad(ev) {
    const z = ev.target.closest('.ki-ziel'); if (!z || !BOX.contains(z)) return;
    ev.preventDefault();
    const fmt = DFORMAT === 'story' ? 'story' : 'feed', e = DLAYOUT[fmt][z.dataset.el], f = ev.deltaY < 0 ? 1.06 : 1 / 1.06;
    if (z.dataset.el === 'spruch') e.g = Math.round(Math.max(30, Math.min(220, e.g * f)));
    else e.b = Math.round(Math.max(40, Math.min(1400, e.b * f)));
    designGeaendert();
  }

  function zeichnen() {
    if (!BOX) return;
    if (!STAND) {
      BOX.innerHTML = `<h2>📸 Instagram</h2>` + (FEHLER
        ? `<p class="msg err">⚠ ${esc(FEHLER)}</p><p class="hint">${/einloggen/.test(FEHLER) ? '<button class="btn btn-red ki-k" data-aktion="neulogin"><span>🔑 Neu einloggen</span></button> ' : ''}<button class="btn btn-ghost ki-k" data-aktion="laden"><span>Nochmal laden</span></button></p>`
        : '<p class="hint">Lade Instagram-Planung …</p>');
      return;
    }
    const { cfg, konto, posts, lauf } = STAND;
    const offen = STAND.offen || [];
    const ki = STAND.ki || { frei: 0, max: 0 };
    const liste = posts.filter(p => p.status !== 'gepostet');
    const clipsOffen = (STAND.clips || []).filter(c => !((!c.insta || c.gepostet) && (!c.tiktok || c.tt))).length;
    // Thumbnail steht beim Raceday (gibt es keine Story: bei der Ankündigung) und beim Ergebnis
    const mitStory = new Set(posts.filter(p => p.typ === 'story').map(p => p.rennKey));
    const neuAb = new Date(new Date().setUTCHours(24, 0, 0, 0)).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
    BOX.innerHTML = `
      <h2>📸 Instagram</h2>
      <div class="ki-oben">
        <div>
          ${konto.verbunden
            ? `<div class="ki-konto gruen">● Verbunden mit <b>@${esc(konto.username)}</b></div>`
            : `<div class="ki-konto rot">● Nicht verbunden: ${esc(konto.fehler || 'unbekannt')}</div>`}
          <div class="ki-dim">🎨 Cloudflare-KI heute: <b class="${ki.frei ? (ki.frei <= 2 ? 'gelb' : 'gruen') : 'rot'}">${esc(ki.frei)} von ${esc(ki.max)}</b> frei · neue ab ${esc(neuAb)} Uhr</div>
          <div class="ki-dim">${lauf ? `Letzter automatischer Lauf: ${esc(zeit(lauf.zeit))}${lauf.fehler ? ' · ⚠ ' + esc(lauf.fehler) : ''}` : 'Der automatische Lauf hat noch nicht gestartet.'}</div>
        </div>
        ${REITER === 'clips' ? '' : `<div class="ki-modus" role="group" aria-label="Posten">
          <button type="button" class="${cfg.modus === 'freigabe' ? 'an' : ''}" data-aktion="modus" data-wert="freigabe">Mit Freigabe</button>
          <button type="button" class="${cfg.modus === 'auto' ? 'an' : ''}" data-aktion="modus" data-wert="auto">Automatisch</button>
        </div>`}
      </div>
      ${REITER === 'clips' ? '' : `<p class="hint">${cfg.modus === 'auto' ? 'Posts gehen zur eingestellten Zeit von selbst raus – die Bilder werden gezeichnet, sobald du diesen Reiter öffnest.' : 'Jeder Post wartet, bis du ihn freigibst. Die Bilder werden gezeichnet, sobald du diesen Reiter öffnest.'}</p>`}
      <div class="ki-malt"${MALT ? '' : ' hidden'}>${esc(MALT)}</div>
      <div class="side ki-reiter">
        ${[['posts', `🗓 Posts (${liste.length})`], ['clips', `🎬 Clips${clipsOffen ? ` (${clipsOffen})` : ''}`], ['thumb', '▶ Thumbnail'], ['zeiten', '⏰ Zeiten & Text'], ['vorlagen', '🧩 Vorlagen'], ['zuteilung', '🔁 Zuteilung'], ['design', '🎨 Aussehen'], ['kanaele', '📡 YouTube & TikTok']].map(([k, t]) =>
          `<a class="${REITER === k ? 'active' : ''}" data-aktion="reiter" data-wert="${k}">${t}</a>`).join('')}
      </div>
      ${REITER === 'posts' ? `
        ${offen.length ? `<div class="ki-panel"><h3>🏁 Ergebnis eintragen</h3><div class="ki-dim" style="margin-bottom:10px">Deine eigenen Rennen der letzten 5 Tage. SPR-Ergebnisse kommen von selbst.</div>${offen.map(ergebnisForm).join('')}</div>` : ''}
        <div class="ki-leiste"><button class="btn btn-ghost ki-k" data-aktion="laden"><span>🔄 Neu laden</span></button></div>
        ${hilfe()}
        ${liste.length ? liste.map(p => postKarte(p, cfg.modus, p.typ === 'story' || p.typ === 'erg' || (p.typ === 'ank' && !mitStory.has(p.rennKey)))).join('') : '<p class="hint">Keine Rennen oder Streams in den nächsten 3 Wochen im Streamkalender.</p>'}
        ${(STAND.erledigt || []).length ? `<details class="ki-panel ki-erledigt"${ERL_OFFEN ? ' open' : ''}><summary><h3>✅ Gepostet · letzte 36 Std. (${STAND.erledigt.length})</h3></summary>${STAND.erledigt.map(erledigtZeile).join('')}</details>` : ''}` : ''}
      ${REITER === 'thumb' ? '<div class="ki-thumbbox"></div>' : ''}
      ${REITER === 'zeiten' ? `
        <div class="ki-grid">${zeitenPanel(cfg)}${textPanel(cfg)}</div>
        <div class="actions"><button class="btn btn-red" data-aktion="cfg"><span>💾 Zeiten und Texte speichern</span></button></div>` : ''}
      ${REITER === 'design' ? `<div class="ki-grid">${designPanel(STAND.design)}</div>` : ''}
      ${REITER === 'kanaele' ? `<div class="ki-grid">${youtubePanel()}${tiktokPanel()}</div>` : ''}
      ${REITER === 'vorlagen' ? '<div class="ki-vorlagenbox"></div>' : ''}
      ${REITER === 'zuteilung' ? '<div class="ki-zuteilungbox"></div>' : ''}
      ${REITER === 'clips' ? '<div class="ki-clipsbox"></div>' : ''}`;
    if (REITER === 'clips' && window.K888Clips) window.K888Clips.start(BOX.querySelector('.ki-clipsbox'), CLIP_UMG);
    if (REITER === 'kanaele') { streamsLaden(); ytListeLaden(); const b = BOX.querySelector('.ki-ytbeschr'); if (b) b.innerHTML = ytBeschrHtml(); }
    if (REITER === 'vorlagen' && window.K888Vorlagen) window.K888Vorlagen.editor(BOX.querySelector('.ki-vorlagenbox'), VORLAGEN_UMG);
    if (REITER === 'zuteilung' && window.K888Vorlagen) window.K888Vorlagen.zuteilung(BOX.querySelector('.ki-zuteilungbox'), VORLAGEN_UMG);
    if (REITER === 'design') designVorschau();
    if (REITER === 'thumb' && window.K888Thumb) window.K888Thumb.editor(BOX.querySelector('.ki-thumbbox'), THUMB_UMG, THUMB_RK);
    if (REITER === 'posts' && window.K888Thumb) BOX.querySelectorAll('canvas[data-thumb]').forEach(c => {
      const r = rennenListe().find(x => x.rennKey === c.dataset.thumb);
      if (r) window.K888Thumb.vorschau(c, STAND.thumbVorlage, r, STAND.design);
    });
  }

  // ─── Thumbnail: Rennen (ein Eintrag pro Rennen, Daten von Story > Ankündigung > Ergebnis) ───
  const RANG = { story: 0, ank: 1, erg: 2 };
  function rennenListe() {
    const m = new Map();
    for (const p of (STAND ? STAND.posts : [])) {
      if (p.typ === 'woche') continue;
      const alt = m.get(p.rennKey);
      if (!alt || RANG[p.typ] < RANG[alt.typ]) m.set(p.rennKey, p);
    }
    return [...m.values()].map(p => ({ ...p, spruch: (p.thumb && p.thumb.spruch) || '' })).sort((a, b) => a.startMs - b.startMs);
  }
  const THUMB_UMG = {
    stand: () => STAND, igApi, meldung, rennen: rennenListe,
    spruchGesetzt(rk, text) { SPRUCH_NEU = true; for (const p of STAND.posts) if (p.rennKey === rk) { p.thumb = { ...(p.thumb || {}), spruch: text }; p.spruch = text; } },
    vorlageGespeichert(v) { STAND.thumbVorlage = v; },
    thumbGesetzt(rk, felder) { for (const p of STAND.posts) if (p.rennKey === rk) { p.thumb = { ...(p.thumb || {}), ...felder }; if (felder.vorlage === null) delete p.thumb.vorlage; } },
    // Nach dem Speichern: Thumbnail gleich neu zeichnen, hochladen und – wenn der Livestream schon auf YouTube steht – sofort dort tauschen
    async ytThumbNeu(rk) {
      const r = rennenListe().find(x => x.rennKey === rk);
      if (!r || !window.K888Thumb || !(STAND.youtube || {}).verbunden || r.startMs <= Date.now()) return false;
      const h = thumbHash(r);
      if (r.ytThumbH !== h) {
        const d = await window.K888Thumb.datei(window.K888Thumb.fuerRennen(STAND.thumbVorlage, r), r, STAND.design);
        await bildSenden(`/api/ytthumb/${encodeURIComponent(rk)}?h=${h}&s=${r.startMs}`, d.blob);
        for (const p of STAND.posts) if (p.rennKey === rk) p.ytThumbH = h;
      }
      if (!(r.yt && r.yt.id)) return false;
      await igApi('POST', `/api/youtube/${encodeURIComponent(rk)}/planen`, {});
      YTLISTE = null;
      return true;
    },
    // Vorlage für alle geändert: alle kommenden Thumbnails neu zeichnen (der Worker bringt sie auf YouTube)
    ytAlleNeu() { abgleichen(); }
  };

  // Umgebung für die Clip-Fabrik (insta-clips.js)
  const CLIP_UMG = { stand: () => STAND, igApi, meldung, senden: bildSenden, laden: () => laden(true) };

  // Umgebung für den Vorlagen-Editor (insta-vorlagen.js)
  const VORLAGEN_UMG = {
    stand: () => STAND, igApi, meldung,
    async gespeichert() { await laden(); },
    async cfgSpeichern(vorlagen) { await igApi('POST', '/api/einstellungen', { cfg: { ...STAND.cfg, vorlagen } }); STAND.cfg.vorlagen = vorlagen; },
    async ablageHoch(datei) {
      const blob = await zuWebp(datei);
      const name = String(datei.name || 'Bild').replace(/\.[a-z0-9]+$/i, '').slice(0, 60);
      const d = await bildSenden('/api/ablage?name=' + encodeURIComponent(name), blob);
      (STAND.ablage = STAND.ablage || []).unshift({ id: d.id, name, url: d.url, zeit: Date.now() });
      return d;
    }
  };
  VORLAGEN_UMG.videoHoch = async (datei, ton, fortschritt) => {
    if (datei.size > 60e6) throw new Error('Video zu groß (höchstens 60 MB) – bitte kürzer schneiden.');
    const url = URL.createObjectURL(datei);
    const dauer = await new Promise(ok => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => ok(v.duration || 0); v.onerror = () => ok(0); v.src = url; });
    URL.revokeObjectURL(url);
    if (!dauer) throw new Error('Dieses Video kann der Browser nicht abspielen – bitte als MP4 (H.264) speichern.');
    const name = String(datei.name || 'Video').replace(/\.[a-z0-9]+$/i, '').slice(0, 60);
    const d = await igApi('POST', '/api/video/neu', { name, typ: datei.type || 'video/mp4', groesse: datei.size, ton, dauer });
    for (let i = 0; i < d.teile; i++) {
      await bildSenden(`/api/video/${d.id}/teil/${i}`, datei.slice(i * d.teil, (i + 1) * d.teil, 'application/octet-stream'));
      if (fortschritt) fortschritt((i + 1) / d.teile);
    }
    const f = await igApi('POST', `/api/video/${d.id}/fertig`, {});
    (STAND.videos = STAND.videos || []).unshift({ id: d.id, name, ton, dauer, url: f.url, zeit: Date.now() });
    return d;
  };
  // Eigene Bilder: WebP (bleibt durchsichtig), höchstens 1600 px
  async function zuWebp(datei) {
    const url = URL.createObjectURL(datei);
    try {
      const i = await ladeBild(url);
      for (const max of [1600, 1200, 900]) {
        const f = Math.min(1, max / Math.max(i.naturalWidth, i.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(i.naturalWidth * f)); c.height = Math.max(1, Math.round(i.naturalHeight * f));
        c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
        const b = await new Promise(ok => c.toBlob(ok, 'image/webp', 0.9));
        if (b && b.size < 1.85e6) return b;
      }
      throw new Error('Bild ist zu groß.');
    } finally { URL.revokeObjectURL(url); }
  }

  // ─── Bild → JPEG (max. 1600 px) ───
  function ladeBild(src) {
    return new Promise((ok, nein) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => nein(new Error('Bild konnte nicht geladen werden.')); i.src = src; });
  }
  async function zuJpeg(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const i = await ladeBild(url);
      const f = Math.min(1, 1600 / Math.max(i.naturalWidth, i.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(i.naturalWidth * f)); c.height = Math.max(1, Math.round(i.naturalHeight * f));
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      return await new Promise((ok, nein) => c.toBlob(b => (b ? ok(b) : nein(new Error('Bild konnte nicht umgewandelt werden.'))), 'image/jpeg', 0.88));
    } finally { URL.revokeObjectURL(url); }
  }

  // ─── Bild-Auftrag (deutsch) für Gemini/ChatGPT ───
  const STIMMUNG_TEXT = { nacht: 'bei Nacht unter Flutlicht, leuchtende Scheinwerfer und glühende Bremsscheiben', regen: 'im starken Regen mit Gischt hinter den Autos und Spiegelungen auf nassem Asphalt',
    regennacht: 'nachts im Regen, nasser Asphalt spiegelt Flutlicht und Scheinwerfer', nebel: 'im dichten Morgennebel, Scheinwerfer schneiden durch den Dunst', sonnenuntergang: 'im Sonnenuntergang mit warmem Gegenlicht',
    daemmerung: 'in der blauen Stunde, Scheinwerfer an', sonnig: 'an einem sonnigen Tag mit Hitzeflimmern über dem Asphalt', gewitter: 'unter dramatischen Gewitterwolken' };
  const KAMERA_TEXT = { nah: 'mit langem Teleobjektiv ganz nah, die Autos füllen das Bild', schwenk: 'als Mitzieher mit verwischtem Hintergrund, man spürt das Tempo',
    frontal: 'frontal von vorne auf der Geraden', kurve: 'beim engen Duell zweier Autos in einer Kurve', seite: 'von der Seite auf Höhe der Strecke' };
  const zufaellig = o => { const k = Object.keys(o); return o[k[Math.floor(Math.random() * k.length)]]; };
  const autosDeutsch = t => String(t || '').replace(/^two (.+) race cars$/i, 'zwei $1').replace(/^an? /i, 'ein ').replace(/ and an? /g, ' und ein ').replace(/ and /g, ' und ')
    .replace(/\bhypercar\b/g, 'Hypercar').replace(/\bprototype\b/g, 'Prototyp').replace(/\bsingle-seater\b/g, 'Formelauto').replace(/\bstock car\b/g, 'Stockcar');
  function bildAuftrag(p) {
    const wert = attr => { const el = BOX.querySelector(`[${attr}="${CSS.escape(p.id)}"]`); return el ? el.value : ''; };
    const stimmung = STIMMUNG_TEXT[wert('data-stimmung')] || zufaellig(STIMMUNG_TEXT);
    const kamera = KAMERA_TEXT[wert('data-kamera')] || zufaellig(KAMERA_TEXT);
    const strecke = [p.track, p.layout].filter(Boolean).join(' – ');
    return `Erstelle ein fotorealistisches Motorsport-Pressefoto im Hochformat 4:5. ` +
      `Zeige realistische, echte Rennfahrzeuge: ${autosDeutsch(p.autos) || 'GT3-Rennwagen'} – exakt die echten Rennversionen in Originalgröße, mit korrekter Karosserieform, Aerodynamik und Proportionen, so wie sie wirklich im Rennen fahren. ` +
      `Keine Straßenautos, keine Spielzeug- oder Modellautos, keine Fantasie-Autos. ` +
      `Sie fahren dicht beieinander ${strecke ? `auf der echten Rennstrecke ${strecke}` : 'auf einer echten Rennstrecke'}, ${stimmung}. Aufgenommen ${kamera}. Die Strecke soll erkennbar sein (Kerbs, Auslaufzonen, Umgebung). ` +
      `Die Autos in der oberen Bildhälfte, die untere Hälfte nur dunkler Asphalt (dort kommt später Text hin). Keine Schrift, keine Startnummern, keine Logos, kein Wasserzeichen.`;
  }

  // ─── ✨ Gemini / 🤖 ChatGPT: Fenster daneben → kopiertes Bild automatisch übernehmen ───
  const KI = {
    gemini: { name: 'Gemini', fenster: 'k888-gemini', url: () => 'https://gemini.google.com/app', tipp: 'Text kopiert: im Gemini-Fenster Strg+V und Enter drücken.' },
    chatgpt: { name: 'ChatGPT', fenster: 'k888-chatgpt', url: t => 'https://chatgpt.com/?q=' + encodeURIComponent(t), tipp: 'Der Text steht im ChatGPT-Fenster schon drin (sonst Strg+V): Enter drücken.' }
  };
  async function kiStarten(p, quelle) {
    const k = KI[quelle];
    const text = bildAuftrag(p);
    let kopiert = true;
    try { await navigator.clipboard.writeText(text); } catch (e) { kopiert = false; }
    const sw = screen.availWidth || 1280, sh = screen.availHeight || 800, sl = screen.availLeft || 0, st = screen.availTop || 0;
    const w = Math.max(480, Math.min(860, Math.round(sw * 0.45)));
    const fenster = window.open(k.url(text), k.fenster, `popup=yes,width=${w},height=${sh},left=${sl + sw - w},top=${st}`);
    if (fenster) try { fenster.focus(); } catch (e) { /* egal */ }
    WARTET = { id: p.id, quelle }; LESEN_VERBOTEN = false;
    zeichnen();
    if (!fenster) meldung(`Das ${k.name}-Fenster wurde blockiert: Pop-ups für diese Seite erlauben und nochmal klicken.`, 1);
    else if (!kopiert && quelle === 'gemini') window.prompt('Diesen Text kopieren und in Gemini einfügen:', text);
    else meldung(k.tipp);
  }
  const sichtbar = () => !!(BOX && BOX.offsetParent !== null);
  async function ausZwischenablage() {
    if (!WARTET || UEBERNIMMT || LESEN_VERBOTEN || !sichtbar() || !document.hasFocus()) return;
    if (!navigator.clipboard || !navigator.clipboard.read) return;
    let teile;
    try { teile = await navigator.clipboard.read(); }
    catch (e) {
      if (e && e.name === 'NotAllowedError' && document.hasFocus()) { LESEN_VERBOTEN = true; meldung('Zwischenablage nicht erlaubt: Bild hier einfach mit Strg+V einfügen.', 1); }
      return;
    }
    for (const t of teile) {
      const typ = t.types.find(x => x.startsWith('image/'));
      if (typ) return uebernehmen(await t.getType(typ));
    }
  }
  async function uebernehmen(blob) {
    if (!WARTET || UEBERNIMMT) return;
    const { id, quelle } = WARTET, name = (KI[quelle] || KI.gemini).name;
    UEBERNIMMT = true;
    meldung(`Bild aus ${name} wird übernommen …`);
    try {
      await bildSenden(`/api/post/${encodeURIComponent(id)}/eigenesbild?herkunft=${quelle}`, await zuJpeg(blob));
      WARTET = null;
      meldung(`Bild aus ${name} übernommen ✓`);
      await laden();
    } catch (e) { meldung(e.message, 1); }
    finally { UEBERNIMMT = false; }
  }
  const bildDatei = liste => [...(liste || [])].find(x => /^image\//.test(x.type));
  window.addEventListener('focus', () => setTimeout(ausZwischenablage, 150));
  window.addEventListener('message', ev => { if (ev.data && typeof ev.data.k888verbunden === 'boolean') { STREAMS = null; laden(true); meldung(ev.data.k888verbunden ? 'Verbunden ✓' : 'Verbinden ging nicht – siehe Fenster.', !ev.data.k888verbunden); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(ausZwischenablage, 150); });
  document.addEventListener('paste', ev => {
    if (!WARTET || UEBERNIMMT || !sichtbar()) return;
    const f = bildDatei(ev.clipboardData && ev.clipboardData.files); if (!f) return;
    ev.preventDefault(); uebernehmen(f);
  });
  document.addEventListener('dragover', ev => { if (WARTET && sichtbar() && ev.dataTransfer && [...ev.dataTransfer.types].includes('Files')) ev.preventDefault(); });
  document.addEventListener('drop', ev => {
    if (!WARTET || UEBERNIMMT || !sichtbar()) return;
    const f = bildDatei(ev.dataTransfer && ev.dataTransfer.files); if (!f) return;
    ev.preventDefault(); uebernehmen(f);
  });

  // ─── Aktionen ───
  function cfgAusFormular() {
    const v = id => document.getElementById(id);
    return {
      modus: STAND.cfg.modus,
      ankuendigung: { aktiv: v('ki-ank-an').checked, tage: parseInt(v('ki-ank-tage').value, 10) || 0, zeit: v('ki-ank-zeit').value },
      story: { aktiv: v('ki-story-an').checked, zeit: v('ki-story-zeit').value },
      ergebnis: { aktiv: v('ki-erg-an').checked, zeit: v('ki-erg-zeit').value },
      woche: { aktiv: v('ki-woche-an').checked, zeit: v('ki-woche-zeit').value, pose: v('ki-woche-pose').value },
      typen: [...BOX.querySelectorAll('[data-typ]')].filter(x => x.checked).map(x => x.dataset.typ),
      liveAb: v('ki-live').value,
      kiHinweis: v('ki-ki').checked,
      stimmung: v('ki-stimmung').value,
      kamera: v('ki-kamera').value,
      text: v('ki-text').value,
      textErgebnis: v('ki-text-erg').value
    };
  }

  async function ausfuehren(btn, fn) {
    const sp = btn && (btn.querySelector('span') || btn);
    if (btn) { btn.disabled = true; btn.dataset.alt = sp.textContent; sp.textContent = '⏳ …'; }
    try { await fn(); }
    catch (e) { meldung(e.message, 1); }
    finally { if (btn && btn.isConnected) { btn.disabled = false; sp.textContent = btn.dataset.alt; } }
  }

  function klick(ev) {
    const tb = ev.target.closest('[data-team]');
    if (tb && BOX.contains(tb)) {
      DTEAM = tb.dataset.team;
      BOX.querySelectorAll('[data-team]').forEach(x => x.classList.toggle('an', x === tb));
      const an = document.getElementById('ki-team-an'); if (an && DTEAM) an.checked = true;
      return designGeaendert();
    }
    const b = ev.target.closest('[data-aktion]'); if (!b || !BOX.contains(b)) return;
    const a = b.dataset.aktion, id = b.dataset.id;
    if (a === 'laden') return laden();
    if (a === 'neulogin') { try { localStorage.removeItem('k888_token'); } catch (e) { /* egal */ } location.reload(); return; }
    if (a === 'reiter') {
      REITER = b.dataset.wert; if (!DAENDERUNG) { DTEAM = null; DLAYOUT = null; }
      if (REITER === 'posts' && SPRUCH_NEU) { SPRUCH_NEU = false; return laden(); }
      return zeichnen();
    }
    if (a === 'dformat') { DFORMAT = b.dataset.wert; BOX.querySelectorAll('[data-aktion="dformat"]').forEach(x => x.classList.toggle('active', x === b)); return designVorschau(true); }
    if (a === 'dreset') { DLAYOUT = window.K888Bilder.layoutAus({}); return designGeaendert(); }
    if (a === 'verbinden') return ausfuehren(b, async () => {
      const d = await igApi('POST', '/api/verbinden/' + b.dataset.wert, {});
      const f = window.open(d.url, 'k888-login', 'popup=yes,width=520,height=760');
      if (!f) meldung('Das Anmelde-Fenster wurde blockiert: Pop-ups erlauben und nochmal klicken.', 1);
      else meldung('Im neuen Fenster anmelden und erlauben – danach geht es hier von selbst weiter.');
    });
    if (a === 'trennen') return ausfuehren(b, async () => {
      if (!confirm('Verbindung wirklich trennen?')) return;
      await igApi('POST', '/api/trennen/' + b.dataset.wert, {}); STREAMS = null; YTLISTE = null; await laden(true);
    });
    if (a === 'kanal-speichern') return ausfuehren(b, async () => {
      await igApi('POST', '/api/einstellungen', { cfg: kanaeleAusFormular() });
      meldung('Gespeichert. Schon angelegte Livestreams werden beim nächsten Lauf angepasst.'); YTLISTE = null; await laden();
    });
    if (a === 'yt-neu') { ev.preventDefault(); YTLISTE = null; const x = BOX.querySelector('.ki-ytbeschr'); if (x) x.innerHTML = ytBeschrHtml(); return ytListeLaden(true); }
    if (a === 'yt-planen') return ausfuehren(b, async () => {
      const r = rennenListe().find(x => x.rennKey === b.dataset.rk);
      if (r && window.K888Thumb) {   // aktuelles Thumbnail gleich mitgeben
        const h = thumbHash(r);
        if (r.ytThumbH !== h) { const d = await window.K888Thumb.datei(window.K888Thumb.fuerRennen(STAND.thumbVorlage, r), r, STAND.design); await bildSenden(`/api/ytthumb/${encodeURIComponent(r.rennKey)}?h=${h}&s=${r.startMs}`, d.blob); }
      }
      await igApi('POST', `/api/youtube/${encodeURIComponent(b.dataset.rk)}/planen`, {});
      meldung('Livestream ist auf YouTube geplant ✓'); await laden(true);
    });
    if (a === 'vwuerfeln' || a === 'vauto') return ausfuehren(b, async () => {
      await igApi('POST', `/api/post/${encodeURIComponent(id)}/vorlage`, a === 'vwuerfeln' ? { wuerfeln: true } : { id: '' });
      await laden();
    });
    if (a === 'tiktok') return ausfuehren(b, async () => {
      await bildSicher(id);
      await igApi('POST', `/api/post/${encodeURIComponent(id)}/tiktok`, {});
      meldung('Entwurf ist in deiner TikTok-Inbox ✓'); await laden(true);
    });
    if (a === 'th-edit') { REITER = 'thumb'; THUMB_RK = b.dataset.rk; zeichnen(); window.scrollTo(0, 0); return; }
    if (a === 'th-laden') return ausfuehren(b, async () => {
      const r = rennenListe().find(x => x.rennKey === b.dataset.rk); if (!r || !window.K888Thumb) return;
      const d = await window.K888Thumb.laden(window.K888Thumb.fuerRennen(STAND.thumbVorlage, r), r, STAND.design);
      meldung(`Thumbnail geladen (${d.typ.toUpperCase()}, ${(d.groesse / 1e6).toFixed(1).replace('.', ',')} MB).`);
    });
    if (a === 'modus') return ausfuehren(b, async () => {
      if (b.dataset.wert === STAND.cfg.modus) return;
      if (b.dataset.wert === 'auto' && !confirm('Auf „Automatisch“ stellen? Dann gehen alle Posts ohne Freigabe zur eingestellten Zeit raus.')) return;
      await igApi('POST', '/api/einstellungen', { cfg: { ...STAND.cfg, modus: b.dataset.wert } });
      meldung(b.dataset.wert === 'auto' ? 'Posten läuft jetzt automatisch.' : 'Posts warten jetzt auf deine Freigabe.');
      await laden();
    });
    if (a === 'cfg') return ausfuehren(b, async () => { await igApi('POST', '/api/einstellungen', { cfg: cfgAusFormular() }); meldung('Gespeichert.'); await laden(); });
    if (a === 'design') return ausfuehren(b, async () => {
      await igApi('POST', '/api/design', designAusFormular());
      DTEAM = null; DLAYOUT = null; DAENDERUNG = false;
      meldung('Gespeichert – alle Bilder werden neu gezeichnet.');
      await laden();
    });
    if (a === 'bild' || a === 'neu') return ausfuehren(b, async () => {
      const wert = attr => { const el = BOX.querySelector(`[${attr}="${CSS.escape(id)}"]`); return el ? el.value : ''; };
      const r = await igApi('POST', `/api/post/${encodeURIComponent(id)}/bild`, { neu: a === 'neu', stimmung: wert('data-stimmung'), kamera: wert('data-kamera') });
      if (r.kiFehler) meldung('KI-Bild ging nicht: ' + r.kiFehler, 1); else meldung('Neuer KI-Hintergrund – die Posts dieses Rennens werden neu gezeichnet.');
      await laden();
    });
    if (a === 'gemini' || a === 'chatgpt') {
      const p = (STAND.posts || []).find(x => x.id === id); if (!p) return;
      return kiStarten(p, a);
    }
    if (a === 'ki-ab') { WARTET = null; return zeichnen(); }
    if (a === 'pruefen') return ausfuehren(b, async () => {
      PRUEF[id] = await igApi('POST', `/api/post/${encodeURIComponent(id)}/pruefen`, {});
      zeichnen();
    });
    if (a === 'zurueck') return ausfuehren(b, async () => {
      if (!confirm(b.dataset.api === '1'
        ? 'Wieder als offen markieren?\n\nFalls er doch auf Instagram ist, bleibt er dort – vorher mit „🔍 Auf Instagram prüfen“ nachsehen.'
        : 'Wieder als offen markieren?')) return;
      await igApi('POST', `/api/post/${encodeURIComponent(id)}/manuell`, { an: false });
      delete PRUEF[id];
      meldung('Wieder offen – steht oben in der Liste (falls noch in der Planung).');
      await laden();
    });
    if (a === 'manuell') return ausfuehren(b, async () => {
      if (b.dataset.an === '1' && !confirm('Hier wird NICHTS gepostet.\n\nNur als erledigt markieren, weil du es schon selbst in der Insta-App gepostet hast?')) return;
      await igApi('POST', `/api/post/${encodeURIComponent(id)}/manuell`, { an: b.dataset.an === '1' });
      meldung('Als selbst gepostet markiert.');
      await laden();
    });
    if (a === 'freigeben' || a === 'ueberspringen') return ausfuehren(b, async () => {
      if (a === 'freigeben' && b.dataset.an === '1') await bildSicher(id);
      await igApi('POST', `/api/post/${encodeURIComponent(id)}/${a}`, { an: b.dataset.an === '1' });
      await laden();
    });
    if (a === 'jetzt') return ausfuehren(b, async () => {
      if (!confirm('Diesen Post jetzt sofort auf Instagram veröffentlichen?')) return;
      await bildSicher(id);
      await igApi('POST', `/api/post/${encodeURIComponent(id)}/jetzt`, {});
      meldung('Auf Instagram gepostet! 🎉');
      await laden();
    });
    if (a === 'erg') return ausfuehren(b, async () => {
      const box = b.closest('.ki-erg'), f = n => box.querySelector(`[data-f="${n}"]`).value;
      await igApi('POST', '/api/ergebnis', { rennKey: box.dataset.rk, start: f('start'), ziel: f('ziel'), punkte: f('punkte'), status: f('status') });
      meldung('Ergebnis gespeichert – der Post steht jetzt in der Liste.');
      await laden();
    });
    if (a === 'erg-weg') return ausfuehren(b, async () => {
      if (!confirm('Dieses Ergebnis löschen? Du kannst es danach neu eintragen.')) return;
      await igApi('POST', '/api/ergebnis', { rennKey: b.dataset.rk, loeschen: true });
      await laden();
    });
  }

  async function aenderung(ev) {
    const t = ev.target;
    if (t.id === 'ki-yt-bq') { const x = BOX.querySelector('.ki-ytbeschr'); if (x) x.innerHTML = ytBeschrHtml(); return; }
    if (t.dataset.rvideo !== undefined) {
      try { await igApi('POST', `/api/thumb/${encodeURIComponent(t.dataset.rvideo)}`, { video: t.value, startMs: Number(t.dataset.start) || Date.now() }); meldung(t.value ? 'Video gesetzt – die Posts dieses Rennens werden als Video gezeichnet.' : 'Video entfernt.'); await laden(); }
      catch (e) { meldung(e.message, 1); }
      return;
    }
    if (t.dataset.vorlage) {
      try { await igApi('POST', `/api/post/${encodeURIComponent(t.dataset.vorlage)}/vorlage`, { id: t.value }); await laden(); }
      catch (e) { meldung(e.message, 1); }
      return;
    }
    if (!(t.dataset.eigenesbild && t.files && t.files[0])) return;
    try {
      meldung('Bild wird hochgeladen …');
      await bildSenden(`/api/post/${encodeURIComponent(t.dataset.eigenesbild)}/eigenesbild`, await zuJpeg(t.files[0]));
      meldung('Eigenes Bild übernommen (alle Posts dieses Rennens).');
      await laden();
    } catch (e) { meldung(e.message, 1); }
  }

  // ─── Aussehen (passend zum Dashboard) ───
  const css = document.createElement('style');
  css.textContent = `
#instaApp h2{margin-bottom:12px}
#instaApp .ki-dim{color:var(--steel);font-size:13px}
#instaApp .ki-dim b.gruen,#instaApp .ki-konto.gruen{color:#3fbf5f}#instaApp .ki-dim b.gelb{color:#f5c518}#instaApp .ki-dim b.rot,#instaApp .ki-konto.rot{color:#ff6b75}
#instaApp .ki-oben{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px;margin-bottom:8px}
#instaApp .ki-oben>div:first-child{display:flex;flex-direction:column;gap:3px}
#instaApp .ki-konto{font-weight:600}
#instaApp .ki-vid{position:relative}#instaApp .ki-vid video{width:100%;height:100%;object-fit:contain;display:block;background:#000}
#instaApp .ki-vidchip{position:absolute;top:6px;left:6px;background:rgba(0,0,0,.7);color:#fff;font-size:12px;padding:2px 6px}
#instaApp .ki-vwahl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0;font-size:14px}
#instaApp .ki-vwahl select{width:auto;min-width:180px;padding:6px 8px}
#instaApp .ki-vwahl .ki-k{padding:6px 10px}
#instaApp .ki-erledigt summary{cursor:pointer;list-style:none}
#instaApp .ki-erledigt summary::-webkit-details-marker{display:none}
#instaApp .ki-erledigt summary h3{display:inline-block;margin:0}
#instaApp .ki-erledigt summary h3::before{content:'▸ ';color:var(--steel)}
#instaApp .ki-erledigt[open] summary h3::before{content:'▾ '}
#instaApp .ki-erl{display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--line)}
#instaApp .ki-erl:first-of-type{margin-top:10px}
#instaApp .ki-erl-bild{flex:0 0 72px;height:96px;background:#111;display:block}
#instaApp .ki-erl-bild img{width:100%;height:100%;object-fit:contain;display:block}
#instaApp .ki-erl-text{flex:1;min-width:0}
#instaApp .ki-erl-text .ki-knoepfe{margin-top:8px}
#instaApp .ki-modus{display:flex;border:1px solid var(--line)}
#instaApp .ki-modus button{background:transparent;border:0;color:var(--steel);font-family:var(--disp);font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding:10px 16px;cursor:pointer}
#instaApp .ki-modus button+button{border-left:1px solid var(--line)}
#instaApp .ki-modus button.an{background:var(--red);color:#fff}
#instaApp .ki-reiter{margin:6px 0 16px}
#instaApp .ki-leiste{display:flex;justify-content:flex-end;margin-bottom:10px}
#instaApp .btn.ki-k{font-size:12px;padding:8px 13px;text-decoration:none;display:inline-block;position:relative;overflow:hidden}
#instaApp .btn.ki-k:disabled{opacity:.6;cursor:default}
#instaApp .ki-post{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px;padding:14px;background:#0d0e13;border:1px solid var(--line);margin-bottom:12px}
#instaApp .ki-bild{flex:none;width:120px;overflow:hidden;background:#0b0c10;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--steel);font-size:12px;text-align:center}
#instaApp .ki-bild.ank,#instaApp .ki-bild.erg{aspect-ratio:4/5}#instaApp .ki-bild.story{aspect-ratio:9/16;width:96px}#instaApp .ki-bild.yt{aspect-ratio:16/9;width:228px}
#instaApp .ki-bild img{width:100%;height:100%;object-fit:cover;display:block}
#instaApp canvas.ki-bild.yt{height:auto;cursor:pointer}
#instaApp .ki-malt{margin:-6px 0 12px;padding:8px 12px;border:1px solid rgba(245,197,24,.45);color:#f5c518;font-size:14px;background:#0d0e13}
#instaApp .ki-bild.leer{border-style:dashed}
#instaApp .ki-stream{flex:none;display:flex;flex-direction:column;gap:6px;max-width:228px;align-items:flex-start}
#instaApp .ki-info{flex:999 1 280px;min-width:0;display:flex;flex-direction:column;gap:5px}
#instaApp .ki-kopf{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:14px}
#instaApp .ki-titel{font-family:var(--disp);font-weight:800;font-size:18px;text-transform:uppercase;letter-spacing:.02em}
#instaApp .ki-chip{font-family:var(--disp);font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border:1px solid}
#instaApp .ki-chip.gelb{color:#f5c518;border-color:rgba(245,197,24,.4)}#instaApp .ki-chip.blau{color:#7cb8f5;border-color:rgba(55,138,221,.45)}
#instaApp .ki-chip.rot{color:#ff6b75;border-color:rgba(225,19,36,.5)}#instaApp .ki-chip.gruen{color:#3fbf5f;border-color:rgba(63,191,95,.45)}#instaApp .ki-chip.grau{color:var(--steel);border-color:var(--line)}
#instaApp .ki-ytvorschau{white-space:pre-wrap;font:13px/1.45 var(--body,inherit);color:#d6d8de;background:#0b0c10;border:1px solid var(--line);padding:8px 10px;margin:0;max-height:180px;overflow:auto}
#instaApp .ki-ytstream{display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line)}#instaApp .ki-ytstream.alt{opacity:.55}
#instaApp .ki-ytstream img,#instaApp .ki-ytleer{width:128px;aspect-ratio:16/9;object-fit:cover;flex:none;background:#000;display:grid;place-items:center;color:var(--steel)}
#instaApp .ki-ytinfo{display:flex;flex-direction:column;gap:4px;min-width:0}
#instaApp .ki-hinweis{font-size:13px;color:var(--steel);background:#0b0c10;border:1px solid var(--line);padding:6px 10px}
#instaApp .ki-hinweis.rot{color:#ff6b75;border-color:rgba(225,19,36,.45)}#instaApp .ki-hinweis.gelb{color:#f5c518;border-color:rgba(245,197,24,.45)}
#instaApp .ki-hilfe{background:#0d0e13;border:1px solid var(--line);padding:8px 12px;margin-bottom:12px;font-size:14px}
#instaApp .ki-hilfe summary{cursor:pointer;font-weight:600;color:#fff}
#instaApp .ki-hilfe ol{margin:8px 0 6px;padding-left:20px;display:flex;flex-direction:column;gap:4px}
#instaApp .ki-text summary{cursor:pointer;color:var(--steel);font-size:13px;margin:4px 0}
#instaApp .ki-text pre{white-space:pre-wrap;font-family:var(--body);font-size:13px;background:#0b0c10;border:1px solid var(--line);padding:10px;margin:0}
#instaApp .ki-knoepfe{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;align-items:center}
#instaApp .ki-knoepfe select{width:auto;font-size:13px;padding:7px 9px}
#instaApp .ki-reihe select{width:auto}
#instaApp .ki-link{background:none;border:0;padding:0;color:#fff;font:inherit;cursor:pointer;text-decoration:underline dotted}
#instaApp .ki-datei{margin:0;color:var(--white);letter-spacing:.06em;font-size:12px}
#instaApp .ki-datei input{position:absolute;inset:0;opacity:0;cursor:pointer}
#instaApp .ki-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr));gap:16px}
#instaApp .ki-panel{background:#0d0e13;border:1px solid var(--line);padding:16px;margin-bottom:14px;display:flex;flex-direction:column;gap:12px}
#instaApp .ki-panel h3{font-family:var(--disp);font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:15px;margin:0}
#instaApp .ki-reihe{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:flex-end}
#instaApp .ki-fg{display:flex;flex-direction:column;min-width:0}
#instaApp .ki-fg label{margin-bottom:5px}
#instaApp .ki-reihe .ki-fg input[type=number]{width:90px}
#instaApp .ki-fg input:not([type=color]),#instaApp .ki-reihe select{height:42px}
#instaApp input[type=color]{width:70px;height:40px;padding:2px;cursor:pointer}
#instaApp textarea{width:100%;background:#0b0c10;border:1px solid var(--line);color:var(--white);font-family:var(--body);font-size:14px;padding:10px 11px;outline:none;resize:vertical;line-height:1.5}
#instaApp textarea:focus{border-color:var(--red)}
#instaApp .ki-erg{border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:6px}
#instaApp .ki-panel>.ki-dim+.ki-erg{border-top:0;padding-top:0}
#instaApp .ki-logo{height:84px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;padding:6px;background:repeating-conic-gradient(#1c1f28 0 25%,#14161d 0 50%) 0 0/16px 16px;color:var(--steel);font-size:13px}
#instaApp .ki-logo img{max-height:100%;max-width:100%;object-fit:contain}
#instaApp .ki-tgal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
#instaApp .ki-tgal button{padding:0;border:2px solid var(--line);background:#14161d;cursor:pointer;aspect-ratio:1/1;overflow:hidden;color:var(--steel);font-family:var(--disp);font-weight:700;font-size:12px;text-transform:uppercase}
#instaApp .ki-tgal button img{width:100%;height:100%;object-fit:contain;display:block}
#instaApp .ki-tgal button.an{border-color:var(--red);color:#fff}
#instaApp .ki-wert{color:#fff;margin-left:6px}
#instaApp .ki-design input[type=range]{padding:0;accent-color:var(--red)}
#instaApp .ki-dvorbox{position:relative;width:100%;max-width:520px;margin:12px 0 8px;user-select:none;overflow:hidden}
#instaApp .ki-dvor{width:100%;display:block;border:1px solid var(--line);background:#000;min-height:120px;pointer-events:none}
#instaApp .ki-ziel{position:absolute;border:2px dashed rgba(255,212,0,.85);cursor:move;touch-action:none;box-sizing:border-box}
#instaApp .ki-ziel span{position:absolute;left:-2px;top:-20px;background:#ffd400;color:#000;font:700 11px var(--body);padding:1px 5px;white-space:nowrap}
#instaApp .ki-ziel:hover,#instaApp .ki-ziel.zieht{border-color:#ffd400;background:rgba(255,212,0,.1)}
#ki-toast{position:fixed;right:18px;bottom:18px;z-index:99;max-width:420px;background:#14161d;border:1px solid var(--line);border-left:3px solid #3fbf5f;color:#f2f4f8;font:14px/1.45 'Barlow',sans-serif;padding:10px 14px;box-shadow:0 10px 30px rgba(0,0,0,.5);opacity:0;transform:translateY(8px);transition:.2s;pointer-events:none}
#ki-toast.an{opacity:1;transform:none}#ki-toast.rot{border-left-color:#e11324}`;
  document.head.appendChild(css);

  // Zeichnen (insta-bilder.js) und Thumbnail-Editor (insta-thumb.js) nachladen
  let SKRIPTE = null;
  function skripte() {
    if (!SKRIPTE) SKRIPTE = Promise.all(['insta-bilder.js', 'insta-thumb.js', 'insta-vorlagen.js', 'insta-clips.js'].map(n => new Promise((ok, nein) => {
      const s = document.createElement('script'); s.src = BASIS + n + '?v=' + Date.now();
      s.onload = ok; s.onerror = () => nein(new Error('Konnte ' + n + ' nicht laden'));
      document.head.appendChild(s);
    }))).catch(e => { SKRIPTE = null; throw e; });
    return SKRIPTE;
  }

  window.K888Insta = {
    async start(box) {
      if (BOX !== box) {
        BOX = box;
        box.addEventListener('click', klick);
        box.addEventListener('change', aenderung);
        box.addEventListener('toggle', ev => { if (ev.target.classList && ev.target.classList.contains('ki-erledigt')) ERL_OFFEN = ev.target.open; }, true);
        box.addEventListener('input', ev => { if (ev.target.closest('.ki-design')) designGeaendert(); });
        box.addEventListener('pointerdown', dRunter);
        window.addEventListener('pointermove', dBewegen);
        window.addEventListener('pointerup', dHoch);
        box.addEventListener('wheel', dRad, { passive: false });
        box.addEventListener('toggle', ev => { if (ev.target.classList && ev.target.classList.contains('ki-hilfe')) HILFE_OFFEN = ev.target.open; }, true);
      }
      try { await skripte(); } catch (e) { meldung(e.message, 1); }
      return laden();
    }
  };
})();
