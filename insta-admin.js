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
  let GLEICHT = false;
  const offenePosts = () => (STAND ? STAND.posts : []).filter(p => p.status !== 'gepostet' && p.status !== 'uebersprungen');
  async function abgleichen() {
    if (GLEICHT || !STAND || !window.K888Bilder) return;
    GLEICHT = true;
    try {
      const ohneHg = [...new Map(offenePosts().filter(p => !p.hg && !p.kiFehler && p.postMs - Date.now() < 7 * 86400000).map(p => [p.rennKey, p])).values()];
      let ki = Math.min(2, (STAND.ki && STAND.ki.frei) || 0), neu = false;
      for (const p of ohneHg) {
        if (ki-- <= 0) break;
        malen(`🎨 KI-Hintergrund für ${p.track || p.titel || 'Rennen'} …`);
        try { const r = await igApi('POST', `/api/post/${encodeURIComponent(p.id)}/bild`, { neu: false }); if (r.ok) neu = true; } catch (e) { /* nächstes Mal */ }
      }
      if (neu) { STAND = await igApi('GET', '/api/stand'); zeichnen(); }
      const todo = offenePosts().filter(p => !p.bild || p.veraltet);
      let n = 0;
      for (const p of todo) {
        malen(`🖌 Bilder werden gezeichnet … ${++n}/${todo.length}`);
        try { await bildHochladen(p); } catch (e) { meldung('Bild „' + (TYP[p.typ] || p.typ) + '“ ging nicht: ' + e.message, 1); }
      }
      if (todo.length) { STAND = await igApi('GET', '/api/stand'); }
    } catch (e) { meldung(e.message, 1); }
    finally { GLEICHT = false; malen(''); zeichnen(); }
  }
  async function bildHochladen(p) {
    const blob = await window.K888Bilder.post(p, STAND.design);
    const r = await fetch(INSTA + `/api/post/${encodeURIComponent(p.id)}/fertig?h=${encodeURIComponent(p.soll)}`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'image/jpeg' }, body: blob
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || ('Fehler ' + r.status));
    p.bild = d.bild; p.veraltet = false;
    return d;
  }
  // Vor dem Posten/Freigeben: aktuelles Bild sicherstellen
  async function bildSicher(id) {
    const p = (STAND.posts || []).find(x => x.id === id);
    if (p && (!p.bild || p.veraltet)) await bildHochladen(p);
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
    fehler: ['Fehler', 'rot'], uebersprungen: ['Übersprungen', 'grau']
  };
  const TYP = { ank: '📣 Ankündigung · Feed', story: '📱 Raceday · Story', erg: '🏁 Ergebnis · Feed' };
  const titel = p => [p.serie || p.titel, p.nr ? 'R' + p.nr : '', [p.track, p.layout].filter(Boolean).join(' – ')].filter(Boolean).map(esc).join(' · ');

  // ▶ YouTube-Thumbnail 1920×1080 (pro Rennen): kleine Vorschau aus der Vorlage
  const thumbFeld = p => `<div class="ki-stream">
      <canvas class="ki-bild yt" width="480" height="270" data-thumb="${esc(p.rennKey)}" data-aktion="th-edit" data-rk="${esc(p.rennKey)}" title="Thumbnail bearbeiten"></canvas>
      <div class="ki-dim">▶ YouTube-Thumbnail · 1920×1080</div>
      <div class="ki-knoepfe" style="margin:0">
        <button class="btn btn-ghost ki-k" data-aktion="th-laden" data-rk="${esc(p.rennKey)}" title="PNG, oder JPG falls das PNG über 2 MB wäre"><span>📥 Laden</span></button>
        <button class="btn btn-ghost ki-k" data-aktion="th-edit" data-rk="${esc(p.rennKey)}"><span>✎ Bearbeiten</span></button>
      </div>
    </div>`;

  function postKarte(p, modus, mitThumb) {
    const [stText, stFarbe] = STATUS[p.status] || ['?', 'grau'];
    const bild = p.bild
      ? `<a href="${esc(p.bild)}" target="_blank" rel="noopener" class="ki-bild ${p.typ}" title="Vorschau groß öffnen"><img src="${esc(p.bild)}" alt="Vorschau" loading="lazy"></a>`
      : `<div class="ki-bild ${p.typ} leer">${GLEICHT ? '🖌 wird gezeichnet …' : 'Noch kein Bild'}</div>`;
    const id = esc(p.id), k = [];
    const kn = (aktion, text, extra = '', titel = '') => `<button class="btn btn-ghost ki-k" data-aktion="${aktion}" data-id="${id}" ${extra}${titel ? ` title="${esc(titel)}"` : ''}><span>${text}</span></button>`;
    k.push(auswahl(STIMMUNG, STAND.cfg.stimmung || 'zufall', `data-stimmung="${id}" title="Stimmung für das nächste KI-Bild"`));
    k.push(auswahl(KAMERA, STAND.cfg.kamera || 'zufall', `data-kamera="${id}" title="Blickwinkel für das nächste KI-Bild"`));
    k.push(kn('gemini', '✨ Bild mit Gemini', '', 'Bild-Auftrag kopieren und Gemini daneben öffnen – das kopierte Bild wird automatisch übernommen'));
    k.push(kn('chatgpt', '🤖 Bild mit ChatGPT', '', 'ChatGPT daneben öffnen, der Bild-Auftrag steht schon drin – das kopierte Bild wird automatisch übernommen'));
    k.push(p.hg ? kn('neu', '🎲 Neues KI-Bild', '', 'Neues KI-Hintergrundbild für alle Posts dieses Rennens') : kn('bild', '🎨 KI-Hintergrund', '', 'KI-Hintergrundbild für alle Posts dieses Rennens'));
    if (modus === 'freigabe' && p.status !== 'uebersprungen') k.push(p.freigegeben ? kn('freigeben', '↩ Freigabe zurück', 'data-an="0"')
      : `<button class="btn btn-red ki-k" data-aktion="freigeben" data-an="1" data-id="${id}"><span>✓ Freigeben</span></button>`);
    k.push(p.status === 'uebersprungen' ? kn('ueberspringen', '↺ Wieder aktivieren', 'data-an="0"') : kn('ueberspringen', '⏭ Überspringen', 'data-an="1"'));
    if (p.status !== 'uebersprungen') k.push(kn('jetzt', '🚀 Jetzt posten'));
    k.push(`<label class="btn btn-ghost ki-k ki-datei" title="Eigenes Hintergrundbild (z. B. iRacing-Screenshot) für alle Posts dieses Rennens"><span>📤 Eigenes Bild</span><input type="file" accept="image/*" data-eigenesbild="${id}"></label>`);
    if (p.bild) k.push(`<a class="btn btn-ghost ki-k" href="${esc(p.bild)}?laden=1" download><span>📥 Bild laden</span></a>`);
    if (p.bild) k.push(kn('manuell', '✓ Selbst gepostet', 'data-an="1"', 'Wenn du das Bild selbst in der Insta-App gepostet hast'));
    if (p.eigenesErgebnis) k.push(`<button class="btn btn-ghost ki-k" data-aktion="erg-weg" data-rk="${esc(p.rennKey)}"><span>✕ Ergebnis löschen</span></button>`);
    const h = [];
    if (p.fehler) h.push(`<div class="ki-hinweis rot">⚠ ${esc(p.fehler)}</div>`);
    if (p.bildQuelle) h.push(`<div class="ki-dim">Hintergrund: ${esc(p.bildQuelle)}</div>`);
    if (WARTET && WARTET.id === p.id) { const n = (KI[WARTET.quelle] || KI.gemini).name; h.push(`<div class="ki-hinweis gelb">${WARTET.quelle === 'chatgpt' ? '🤖' : '✨'} Wartet auf das Bild aus ${n}: im ${n}-Fenster Rechtsklick aufs Bild → „Bild kopieren“ → hier ins Fenster klicken (oder Strg+V). <button type="button" class="ki-link" data-aktion="ki-ab">Abbrechen</button></div>`); }
    if (p.kiFehler) h.push(`<div class="ki-hinweis">KI-Bild ging nicht (${esc(p.kiFehler)}). Bis dahin gibt es einen Ersatz-Hintergrund.</div>`);
    if (p.typ === 'story') h.push('<div class="ki-hinweis">Link-Sticker geht nur von Hand: „📥 Bild laden“ → in der Insta-App als Story posten → hier „✓ Selbst gepostet“.</div>');
    const text = p.text ? `<details class="ki-text"><summary>Text unter dem Post</summary><pre>${esc(p.text)}</pre></details>` : '';
    const wann = p.typ === 'erg'
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

  function designPanel(d) {
    return `<div class="ki-panel"><h3>🎨 Aussehen</h3>
      <div class="ki-logo">${d.logoBild ? `<img src="${esc(d.logoBild)}" alt="Logo">` : '<span>kein Logo</span>'}</div>
      <div class="ki-fg"><label for="ki-logo">Logo-Link (PNG oder JPG)</label><input id="ki-logo" type="text" spellcheck="false" value="${esc(d.logoUrl || '')}" placeholder="https://…/logo.png"></div>
      <div class="ki-reihe">
        <div class="ki-fg"><label for="ki-f1">Farbe 1</label><input id="ki-f1" type="color" value="${esc(d.farbe1)}"></div>
        <div class="ki-fg"><label for="ki-f2">Farbe 2</label><input id="ki-f2" type="color" value="${esc(d.farbe2)}"></div>
      </div>
      <div class="ki-fg"><label for="ki-livetext">„Live auf …“ (Story und Thumbnail)</label><input id="ki-livetext" type="text" value="${esc(d.liveText || '')}" placeholder="YouTube · @Kreids888"></div>
      <div class="ki-fg"><label for="ki-autos">Fahrzeuge fürs KI-Bild (optional)</label><input id="ki-autos" type="text" value="${esc(d.fahrzeuge || '')}" placeholder="leer = passend zur Serie, z. B. Porsche 911 GT3 Cup"></div>
      <div class="ki-knoepfe"><button class="btn btn-red ki-k" data-aktion="design"><span>💾 Aussehen speichern</span></button></div>
      <div class="ki-dim">Danach werden alle Bilder automatisch neu gezeichnet.</div>
    </div>`;
  }

  function zeichnen() {
    if (!BOX) return;
    if (!STAND) {
      BOX.innerHTML = `<h2>📸 Instagram</h2>` + (FEHLER
        ? `<p class="msg err">⚠ ${esc(FEHLER)}</p><p class="hint">Läuft der Worker <b>kreids-insta</b> schon? <button class="btn btn-ghost ki-k" data-aktion="laden"><span>Nochmal laden</span></button></p>`
        : '<p class="hint">Lade Instagram-Planung …</p>');
      return;
    }
    const { cfg, konto, posts, lauf } = STAND;
    const offen = STAND.offen || [];
    const ki = STAND.ki || { frei: 0, max: 0 };
    const liste = posts.filter(p => p.status !== 'gepostet');
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
        <div class="ki-modus" role="group" aria-label="Posten">
          <button type="button" class="${cfg.modus === 'freigabe' ? 'an' : ''}" data-aktion="modus" data-wert="freigabe">Mit Freigabe</button>
          <button type="button" class="${cfg.modus === 'auto' ? 'an' : ''}" data-aktion="modus" data-wert="auto">Automatisch</button>
        </div>
      </div>
      <p class="hint">${cfg.modus === 'auto' ? 'Posts gehen zur eingestellten Zeit von selbst raus – die Bilder werden gezeichnet, sobald du diesen Reiter öffnest.' : 'Jeder Post wartet, bis du ihn freigibst. Die Bilder werden gezeichnet, sobald du diesen Reiter öffnest.'}</p>
      <div class="ki-malt"${MALT ? '' : ' hidden'}>${esc(MALT)}</div>
      <div class="side ki-reiter">
        ${[['posts', `🗓 Posts (${liste.length})`], ['thumb', '▶ Thumbnail'], ['zeiten', '⏰ Zeiten & Text'], ['design', '🎨 Aussehen']].map(([k, t]) =>
          `<a class="${REITER === k ? 'active' : ''}" data-aktion="reiter" data-wert="${k}">${t}</a>`).join('')}
      </div>
      ${REITER === 'posts' ? `
        ${offen.length ? `<div class="ki-panel"><h3>🏁 Ergebnis eintragen</h3><div class="ki-dim" style="margin-bottom:10px">Deine eigenen Rennen der letzten 5 Tage. SPR-Ergebnisse kommen von selbst.</div>${offen.map(ergebnisForm).join('')}</div>` : ''}
        <div class="ki-leiste"><button class="btn btn-ghost ki-k" data-aktion="laden"><span>🔄 Neu laden</span></button></div>
        ${hilfe()}
        ${liste.length ? liste.map(p => postKarte(p, cfg.modus, p.typ === 'story' || p.typ === 'erg' || (p.typ === 'ank' && !mitStory.has(p.rennKey)))).join('') : '<p class="hint">Keine Rennen oder Streams in den nächsten 3 Wochen im Streamkalender.</p>'}` : ''}
      ${REITER === 'thumb' ? '<div class="ki-thumbbox"></div>' : ''}
      ${REITER === 'zeiten' ? `
        <div class="ki-grid">${zeitenPanel(cfg)}${textPanel(cfg)}</div>
        <div class="actions"><button class="btn btn-red" data-aktion="cfg"><span>💾 Zeiten und Texte speichern</span></button></div>` : ''}
      ${REITER === 'design' ? `<div class="ki-grid">${designPanel(STAND.design)}</div>` : ''}`;
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
      const alt = m.get(p.rennKey);
      if (!alt || RANG[p.typ] < RANG[alt.typ]) m.set(p.rennKey, p);
    }
    return [...m.values()].map(p => ({ ...p, spruch: (p.thumb && p.thumb.spruch) || '' })).sort((a, b) => a.startMs - b.startMs);
  }
  const THUMB_UMG = {
    stand: () => STAND, igApi, meldung, rennen: rennenListe,
    spruchGesetzt(rk, text) { for (const p of STAND.posts) if (p.rennKey === rk) p.thumb = { ...(p.thumb || {}), spruch: text }; },
    vorlageGespeichert(v) { STAND.thumbVorlage = v; }
  };

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
    const b = ev.target.closest('[data-aktion]'); if (!b || !BOX.contains(b)) return;
    const a = b.dataset.aktion, id = b.dataset.id;
    if (a === 'laden') return laden();
    if (a === 'reiter') { REITER = b.dataset.wert; return zeichnen(); }
    if (a === 'th-edit') { REITER = 'thumb'; THUMB_RK = b.dataset.rk; zeichnen(); window.scrollTo(0, 0); return; }
    if (a === 'th-laden') return ausfuehren(b, async () => {
      const r = rennenListe().find(x => x.rennKey === b.dataset.rk); if (!r || !window.K888Thumb) return;
      const d = await window.K888Thumb.laden(window.K888Thumb.vorlageAus(STAND.thumbVorlage), r, STAND.design);
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
      const v = x => document.getElementById(x).value;
      await igApi('POST', '/api/design', { logoUrl: v('ki-logo').trim(), farbe1: v('ki-f1'), farbe2: v('ki-f2'), liveText: v('ki-livetext'), fahrzeuge: v('ki-autos') });
      meldung('Gespeichert. Vorschauen mit „🔄 Aktualisieren“ neu zeichnen.');
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
    if (a === 'manuell') return ausfuehren(b, async () => {
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
#instaApp .ki-chip.rot{color:#ff6b75;border-color:rgba(225,19,36,.5)}#instaApp .ki-chip.grau{color:var(--steel);border-color:var(--line)}
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
#ki-toast{position:fixed;right:18px;bottom:18px;z-index:99;max-width:420px;background:#14161d;border:1px solid var(--line);border-left:3px solid #3fbf5f;color:#f2f4f8;font:14px/1.45 'Barlow',sans-serif;padding:10px 14px;box-shadow:0 10px 30px rgba(0,0,0,.5);opacity:0;transform:translateY(8px);transition:.2s;pointer-events:none}
#ki-toast.an{opacity:1;transform:none}#ki-toast.rot{border-left-color:#e11324}`;
  document.head.appendChild(css);

  // Zeichnen (insta-bilder.js) und Thumbnail-Editor (insta-thumb.js) nachladen
  let SKRIPTE = null;
  function skripte() {
    if (!SKRIPTE) SKRIPTE = Promise.all(['insta-bilder.js', 'insta-thumb.js'].map(n => new Promise((ok, nein) => {
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
        box.addEventListener('toggle', ev => { if (ev.target.classList && ev.target.classList.contains('ki-hilfe')) HILFE_OFFEN = ev.target.open; }, true);
      }
      try { await skripte(); } catch (e) { meldung(e.message, 1); }
      return laden();
    }
  };
})();
