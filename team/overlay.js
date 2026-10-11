/* ===========================================================
   OVERLAYS – Einstellungen für die eigenen iRacing-Overlays
   Spricht direkt mit dem Kreids Replay-Finder auf deinem PC
   (http://127.0.0.1:47889). Dort laufen die Overlays, dort wird
   auch gespeichert. Änderungen wirken sofort.
   =========================================================== */
(function () {
  const H = "http://127.0.0.1:47889";
  const OVS = ["zeiten", "sprit"];
  let C = null;            // Kontext aus team.js
  let root = null;
  let st = null;           // letzter Status vom Replay-Finder
  let pollT = null, bildT = null, offT = null, saveT = null;
  let alive = 0;
  const bildUrl = {};

  /* ---------------- Verbindung ---------------- */
  async function call(path, body, timeout = 4000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(H + path, {
        method: body !== undefined ? "POST" : "GET",
        headers: body !== undefined ? { "Content-Type": "application/json" } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctl.signal,
      });
      let d = {};
      try { d = await r.json(); } catch (e) { /* leer */ }
      if (!r.ok) throw new Error(d.error || "Replay-Finder: Fehler " + r.status);
      return d;
    } finally { clearTimeout(t); }
  }

  // Status übernehmen, die Einstellungen aber nie überschreiben (sonst gehen gerade getippte Änderungen verloren)
  function uebernehmen(n) { const { cfg, ...rest } = n || {}; Object.assign(st, rest); }

  function stopTimers() {
    clearInterval(pollT); clearInterval(bildT); clearInterval(offT); clearTimeout(saveT);
    pollT = bildT = offT = saveT = null;
  }

  function unmount() {
    alive++; stopTimers(); root = null;
    for (const k in bildUrl) { URL.revokeObjectURL(bildUrl[k]); delete bildUrl[k]; }
  }

  async function mount(el, ctx) {
    unmount();
    C = ctx; root = el;
    const my = alive;
    root.innerHTML = C.panelHead("overlay", "Overlays", '<span class="tm-badge grey">Replay-Finder</span>') +
      '<div id="ov"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    try { st = await call("/overlay/status", undefined, 2500); }
    catch (e) { if (my === alive) renderOffline(); return; }
    if (my !== alive) return;
    renderApp();
  }

  /* ---------------- Replay-Finder läuft nicht ---------------- */
  function renderOffline() {
    const box = document.getElementById("ov");
    if (!box) return;
    box.innerHTML = `
      <div class="tm-box ov-off">
        <h5>Replay-Finder nicht gefunden</h5>
        <p class="hint">Die Overlays laufen im Kreids Replay-Finder auf deinem PC. Starte ihn (start.bat), dann verbindet sich diese Seite von selbst.</p>
        <div class="tm-actions">${C.btn("Erneut prüfen", "sm", 'id="ov-retry"')}</div>
        <p class="tm-muted" style="margin-top:10px">Fragt der Browser, ob <b>kreids888.com</b> auf Geräte im lokalen Netzwerk zugreifen darf: <b>Erlauben</b>.</p>
      </div>`;
    document.getElementById("ov-retry").onclick = () => mount(root, C);
    const my = alive;
    offT = setInterval(async () => {
      try { await call("/overlay/status", undefined, 1500); if (my === alive) { clearInterval(offT); mount(root, C); } }
      catch (e) { /* weiter warten */ }
    }, 3000);
  }

  /* ---------------- Hauptansicht ---------------- */
  const esc = (s) => C.esc(s);
  const sw = (id, on, label, attrs = "") =>
    `<label class="tm-switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""} ${attrs}><span class="s"></span><b>${label}</b></label>`;
  const slider = (id, label, lo, hi, step, wert, einheit) =>
    `<div class="kt-sl"><span>${label}</span><input type="range" id="${id}" min="${lo}" max="${hi}" step="${step}" value="${wert}"><b id="${id}-v">${wert}${einheit}</b></div>`;

  function renderApp() {
    const box = document.getElementById("ov");
    if (!box) return;
    const c = st.cfg;
    const tankAuto = st.tank_ir ? `automatisch (${Math.round(st.tank_ir)} L)` : "automatisch";
    box.innerHTML = `
      <div class="kt-conn" id="ov-conn"></div>
      <div class="ov-grid">
        <div class="ov-col">
          <div class="tm-box kt-card">
            <div class="kt-card-h"><h5>Allgemein</h5></div>
            <div class="ov-rows">
              ${sw("ov-an", c.an, "Overlays anzeigen")}
              ${sw("ov-auto", c.nur_im_auto, "Nur zeigen, wenn ich im Auto sitze")}
              <div class="ov-row"><span>Design</span><div class="ov-seg" id="ov-design">
                ${st.designs.map(([k, n]) => `<button type="button" class="tm-btn sm${c.design === k ? " red" : ""}" data-d="${k}"><span>${esc(n)}</span></button>`).join("")}
              </div></div>
              ${slider("ov-skala", "Größe", 50, 250, 5, c.skala, " %")}
              <div class="ov-row"><span>Tankgröße</span><div class="ov-num"><input type="number" id="ov-tank" min="0" max="500" step="1" value="${c.tank || ""}" placeholder="${esc(tankAuto)}"><em>L</em></div></div>
              <div class="ov-row"><span>Reserve beim Nachtanken</span><div class="ov-num"><input type="number" id="ov-res" min="0" max="10" step="0.5" value="${c.reserve}"><em>Runden</em></div></div>
            </div>
          </div>
          <div class="tm-box kt-card">
            <div class="kt-card-h"><h5>Position</h5></div>
            <p class="hint">Zum Verschieben erscheinen beide Overlays mit grünem Rahmen. Einfach mit der Maus an die gewünschte Stelle ziehen, dann „Fertig“.</p>
            <div class="tm-actions" id="ov-pos"></div>
          </div>
          <div class="tm-box ov-tipp">
            <b>Wichtig:</b> iRacing muss im <b>Fenster</b> oder <b>randlosen Vollbild</b> laufen, sonst liegt nichts darüber. Die Overlays nehmen nie Klicks oder Tasten weg und brauchen keine Grafikkarte.
          </div>
        </div>
        <div class="ov-col">
          ${OVS.map(o => karte(o)).join("")}
        </div>
      </div>`;
    verbinden();
    zeigeStatus();
    ladeBilder();
    const my = alive;
    bildT = setInterval(() => { if (!document.hidden) ladeBilder(); }, 700);
    pollT = setInterval(async () => {
      try { uebernehmen(await call("/overlay/status", undefined, 2500)); if (my === alive) zeigeStatus(); }
      catch (e) { if (my === alive) { stopTimers(); renderOffline(); } }
    }, 2500);
  }

  function karte(o) {
    const c = st.cfg[o];
    const felder = st.felder[o].map(([k, n]) =>
      `<label class="ov-chip" title="${esc(st.info[k] || n)}"><input type="checkbox" data-o="${o}" data-f="${k}" ${c.felder[k] ? "checked" : ""}><span>${esc(n)}</span></label>`).join("");
    return `
      <div class="tm-box kt-card ov-card">
        <div class="kt-card-h"><h5>${esc(st.namen[o])}</h5>${sw("ov-" + o + "-an", c.an, "An")}</div>
        <div class="ov-prev"><img id="ov-img-${o}" alt="Vorschau ${esc(st.namen[o])}"></div>
        ${slider("ov-" + o + "-dk", "Deckkraft", 10, 100, 5, c.deckkraft, " %")}
        <div class="ov-felder">${felder}</div>
      </div>`;
  }

  function zeigeStatus() {
    const el = document.getElementById("ov-conn");
    if (!el) return;
    const ir = st.im_auto ? ["on", "iRacing: im Auto"] : st.live ? ["on", "iRacing: verbunden"] : st.verbunden ? ["wait", "iRacing: Replay"] : ["", "iRacing: aus"];
    el.innerHTML = `
      <span class="ov-st on"><i></i>Replay-Finder verbunden</span>
      <span class="ov-st ${ir[0]}"><i></i>${ir[1]}</span>
      <span class="kt-sp"></span>
      <span class="tm-muted">${st.live ? "Vorschau mit Live-Werten" : "Vorschau mit Beispielwerten"}</span>`;
    const pos = document.getElementById("ov-pos");
    if (pos) {
      pos.innerHTML = st.bearbeiten
        ? `${C.btn("✓ Fertig", "sm red", 'id="ov-fertig"')}<span class="tm-muted">Overlays jetzt mit der Maus ziehen</span>`
        : `${C.btn("Overlays verschieben", "sm", 'id="ov-schieben"')}${C.btn("Position zurücksetzen", "sm", 'id="ov-reset"')}`;
      const an = (v) => async () => {
        try { uebernehmen(await call("/overlay/verschieben", { an: v })); zeigeStatus(); }
        catch (e) { C.toast(e.message, false); }
      };
      const f = document.getElementById("ov-fertig"), s = document.getElementById("ov-schieben"), r = document.getElementById("ov-reset");
      if (f) f.onclick = an(false);
      if (s) s.onclick = an(true);
      if (r) r.onclick = async () => {
        try { uebernehmen(await call("/overlay/zuruecksetzen", {})); C.toast("Position zurückgesetzt", true); }
        catch (e) { C.toast(e.message, false); }
      };
    }
  }

  async function ladeBilder() {
    const my = alive;
    for (const o of OVS) {
      const img = document.getElementById("ov-img-" + o);
      if (!img) continue;
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 3000);
        const r = await fetch(H + "/overlay/bild?o=" + o, { signal: ctl.signal });
        clearTimeout(t);
        if (!r.ok || my !== alive) continue;
        const url = URL.createObjectURL(await r.blob());
        if (my !== alive) { URL.revokeObjectURL(url); return; }
        img.src = url;
        if (bildUrl[o]) URL.revokeObjectURL(bildUrl[o]);
        bildUrl[o] = url;
        img.closest(".ov-prev").classList.toggle("aus", !st.cfg.an || !st.cfg[o].an);
      } catch (e) { /* nächster Versuch */ }
    }
  }

  /* ---------------- Ändern + Speichern ---------------- */
  function speichernBald() {
    clearTimeout(saveT);
    saveT = setTimeout(async () => {
      const c = st.cfg;
      // Positionen nicht mitschicken: die setzt der Replay-Finder beim Verschieben selbst
      const body = { an: c.an, design: c.design, skala: c.skala, nur_im_auto: c.nur_im_auto, tank: c.tank, reserve: c.reserve };
      for (const o of OVS) body[o] = { an: c[o].an, deckkraft: c[o].deckkraft, felder: c[o].felder };
      try { uebernehmen(await call("/overlay/cfg", { cfg: body })); ladeBilder(); }
      catch (e) { C.toast("Nicht gespeichert: " + e.message, false); }
    }, 250);
  }

  function verbinden() {
    const c = st.cfg;
    const $ = (id) => document.getElementById(id);
    $("ov-an").onchange = (e) => { c.an = e.target.checked; speichernBald(); };
    $("ov-auto").onchange = (e) => { c.nur_im_auto = e.target.checked; speichernBald(); };
    $("ov-design").onclick = (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      c.design = b.dataset.d;
      $("ov-design").querySelectorAll("[data-d]").forEach(x => x.classList.toggle("red", x === b));
      speichernBald();
    };
    $("ov-skala").oninput = (e) => { c.skala = +e.target.value; $("ov-skala-v").textContent = c.skala + " %"; speichernBald(); };
    $("ov-tank").oninput = (e) => { c.tank = Math.max(0, +e.target.value || 0); speichernBald(); };
    $("ov-res").oninput = (e) => { c.reserve = Math.max(0, +e.target.value || 0); speichernBald(); };
    for (const o of OVS) {
      $("ov-" + o + "-an").onchange = (e) => { c[o].an = e.target.checked; speichernBald(); };
      $("ov-" + o + "-dk").oninput = (e) => { c[o].deckkraft = +e.target.value; $("ov-" + o + "-dk-v").textContent = c[o].deckkraft + " %"; speichernBald(); };
    }
    root.querySelectorAll(".ov-chip input").forEach(inp => {
      inp.onchange = () => { c[inp.dataset.o].felder[inp.dataset.f] = inp.checked; speichernBald(); };
    });
  }

  window.F2FOverlay = { mount, unmount };
})();
