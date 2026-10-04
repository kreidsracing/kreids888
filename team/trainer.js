/* ===========================================================
   KREIDS-TRAINER v2 – Oberfläche im Team-Dashboard
   Spricht mit dem lokalen Helfer (http://127.0.0.1:47888), der im
   Hintergrund iRacing liest und Töne/Ansagen abspielt.
   =========================================================== */
(function () {
  const H = "http://127.0.0.1:47888";
  let C = null;            // Kontext aus team.js (api, esc, toast, ICONS, btn, panelHead)
  let root = null;
  let pollT = null, offT = null, setupT = null, saveT = null;
  let tab = "live";
  let lastLog = 0;
  let st = null;            // letzter Status vom Helfer
  let settings = null, voices = [];
  let pending = {};
  let meta = null;          // Setup-Ziele
  const sev = {};           // Symptom -> Stufe 0..3 (bleibt beim Reiterwechsel)
  let setupSig = "";
  let alive = 0;            // Zähler, um alte Aufrufe nach Unmount zu ignorieren

  const SEV_COL = { 1: "#ffb020", 2: "#ff6b1f", 3: "#ff2a2a" };

  /* ---------------- Verbindung ---------------- */
  async function hcall(path, opts = {}, timeout = 6000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(H + path, {
        method: opts.method || (opts.body !== undefined || opts.raw ? "POST" : "GET"),
        headers: opts.raw ? { "Content-Type": "text/csv", "X-Filename": encodeURIComponent(opts.name || "runde.csv") }
          : opts.body !== undefined ? { "Content-Type": "application/json" } : {},
        body: opts.raw || (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
        signal: ctl.signal,
      });
      let d = {};
      try { d = await r.json(); } catch (e) { /* leer */ }
      if (!r.ok) { const e = new Error(d.error || "Helfer: Fehler " + r.status); e.status = r.status; throw e; }
      return d;
    } finally { clearTimeout(t); }
  }
  const post = (p, body) => hcall(p, { body: body || {} });

  function stopTimers() {
    clearInterval(pollT); clearInterval(offT); clearInterval(setupT); clearTimeout(saveT);
    pollT = offT = setupT = null;
  }

  function unmount() { alive++; stopTimers(); root = null; }

  async function mount(el, ctx) {
    unmount();
    C = ctx; root = el;
    const my = alive;
    root.innerHTML = C.panelHead("trainer", "Kreids-Trainer", '<span class="tm-badge">v2</span>') +
      '<div id="kt"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    try {
      st = await hcall("/status", {}, 2500);
    } catch (e) { if (my === alive) renderOffline(); return; }
    if (my !== alive) return;
    if (!st.authorized) {
      try {
        const t = await C.api("/trainer/token", { method: "POST" });
        await post("/auth", { token: t.token });
        st = await hcall("/status");
      } catch (e) {
        if (my === alive) renderMsg("Kein Zugang", e.message || "Verbindung fehlgeschlagen");
        return;
      }
    }
    if (my !== alive) return;
    renderApp();
  }

  /* ---------------- Helfer nicht gestartet ---------------- */
  async function renderOffline() {
    const box = document.getElementById("kt");
    let info = { ready: false };
    try { info = await C.api("/trainer/info"); } catch (e) { /* egal */ }
    if (!box || !root) return;
    box.innerHTML = `
      <div class="kt-off">
        <div class="kt-off-main tm-box">
          <h5>Helfer ist nicht gestartet</h5>
          <p class="hint">Der Trainer läuft im Dashboard – auf deinem PC braucht es nur einen kleinen Helfer im Hintergrund, der iRacing liest und die Töne abspielt. Du erkennst ihn am F2F-Symbol unten rechts in der Taskleiste.</p>
          <div class="tm-actions">
            <a class="tm-btn red" href="kreidstrainer://start"><span>▶ Helfer starten</span></a>
            ${btn2("Erneut prüfen", 'id="kt-retry"')}
          </div>
          <p class="tm-muted" style="margin-top:10px">„Helfer starten" funktioniert, sobald du den Trainer einmal mit <b>start.bat</b> gestartet hast. Das Dashboard verbindet sich danach automatisch.</p>
        </div>
        <div class="tm-box">
          <h5>Erstmalig einrichten</h5>
          <ol class="kt-steps">
            <li>${info.ready ? `<a class="tm-btn sm" href="/api/team/trainer/download"><span>⬇ Kreids-Trainer v${C.esc(info.version)} herunterladen</span></a>` : '<span class="tm-muted">Download wird gerade eingerichtet …</span>'}</li>
            <li>ZIP entpacken, Ordner irgendwohin legen (z. B. auf den Desktop).</li>
            <li><b>start.bat</b> doppelklicken. Beim ersten Mal lädt er ein portables Python (ca. 45 MB) – das dauert ein paar Minuten.</li>
            <li>Das Dashboard öffnet sich, das Symbol erscheint unten rechts – fertig.</li>
          </ol>
          ${info.ready && info.notes ? `<div class="kt-notes"><b>Neu in v${C.esc(info.version)}:</b> ${C.esc(info.notes)}</div>` : ""}
          <p class="tm-muted" style="margin-top:10px">Fragt der Browser, ob <b>kreids888.com</b> auf Geräte im lokalen Netzwerk zugreifen darf: <b>Erlauben</b> – damit spricht das Dashboard mit dem Helfer auf deinem PC.</p>
        </div>
      </div>`;
    document.getElementById("kt-retry").onclick = () => mount(root, C);
    // automatisch verbinden, sobald der Helfer läuft
    const my = alive;
    offT = setInterval(async () => {
      try { await hcall("/status", {}, 1500); if (my === alive) { clearInterval(offT); mount(root, C); } } catch (e) { /* weiter warten */ }
    }, 3000);
  }

  function renderMsg(title, text) {
    const box = document.getElementById("kt");
    if (box) box.innerHTML = `<div class="tm-box tm-soon"><div class="big">${C.esc(title)}</div><p>${C.esc(text)}</p></div>`;
  }

  const btn2 = (label, attrs = "", cls = "sm") => `<button class="tm-btn ${cls}" ${attrs}><span>${label}</span></button>`;

  /* ---------------- App ---------------- */
  function renderApp() {
    const box = document.getElementById("kt");
    const upd = st.latest && String(st.latest.version) !== String(st.version);
    box.innerHTML = `
      <div class="kt-conn">
        <span class="tm-dot"></span>
        <span>Verbunden als <b>${C.esc(st.name)}</b> · Helfer v${C.esc(st.version)}${st.offline ? ' · <span class="tm-err">offline</span>' : ""}</span>
        ${upd ? `<a class="tm-badge wait" href="/api/team/trainer/download" title="${C.esc(st.latest.notes || "")}">Neue Version v${C.esc(st.latest.version)} herunterladen</a>` : ""}
        <span class="kt-sp"></span>
        ${btn2("Helfer beenden", 'id="kt-quit"')}
      </div>
      <div class="g6-tabs kt-tabs">
        ${[["live", "Live-Coach"], ["setup", "Setup-Berater"], ["strecke", "Streckenberater"], ["anleitung", "Anleitung"]]
          .map(([k, t]) => `<button type="button" data-kt="${k}" class="${tab === k ? "on" : ""}">${t}</button>`).join("")}
      </div>
      <div id="kt-tab"></div>`;
    box.querySelectorAll("[data-kt]").forEach(b => b.onclick = () => { tab = b.dataset.kt; renderApp(); });
    document.getElementById("kt-quit").onclick = async () => {
      if (!confirm("Helfer beenden? Der Coach stoppt dann.")) return;
      try { await post("/quit"); } catch (e) { /* egal */ }
      stopTimers(); setTimeout(() => mount(root, C), 800);
    };
    clearInterval(setupT); setupT = null;
    lastLog = 0;
    if (tab === "live") renderLive();
    else if (tab === "setup") renderSetup();
    else if (tab === "strecke") renderStrecke();
    else renderGuide();
    startPoll();
  }

  function startPoll() {
    clearInterval(pollT);
    const my = alive;
    pollT = setInterval(async () => {
      try {
        const s = await hcall("/status?since=" + lastLog, {}, 2500);
        if (my !== alive) return;
        st = s;
        if (!s.authorized) { stopTimers(); mount(root, C); return; }
        if (tab === "live") updateLive();
      } catch (e) {
        if (my !== alive) return;
        stopTimers(); renderOffline();
      }
    }, 700);
  }

  /* ================================================================ LIVE-COACH */
  const SLIDERS = {
    start_lap: [0, 5, 1, v => (v == 0 ? "sofort" : "Runde " + v)],
    voice_rate: [110, 280, 5, v => String(Math.round(v))],
    voice_volume: [0.1, 1, 0.05, v => Math.round(v * 100) + " %"],
    brake_freq: [300, 1500, 50, v => Math.round(v) + " Hz"],
    throttle_freq: [600, 2500, 50, v => Math.round(v) + " Hz"],
    beep_ms: [50, 300, 10, v => Math.round(v) + " ms"],
    lead_time: [0, 1, 0.05, v => Number(v).toFixed(2) + " s"],
    tolerance_m: [1, 30, 1, v => Math.round(v) + " m"],
    speed_tol_kmh: [1, 15, 1, v => Math.round(v) + " km/h"],
  };

  const sw = (k, t, sub) => `
    <label class="tm-switch kt-sw"><input type="checkbox" data-k="${k}" ${settings[k] ? "checked" : ""}><span class="s"></span>
      <span>${t}${sub ? `<small>${sub}</small>` : ""}</span></label>`;
  const sl = (k, t) => {
    const [lo, hi, step, f] = SLIDERS[k];
    return `<div class="kt-sl"><span>${t}</span><input type="range" min="${lo}" max="${hi}" step="${step}" value="${settings[k]}" data-k="${k}"><b id="ktv-${k}">${f(settings[k])}</b></div>`;
  };
  const card = (title, body, action = "", sub = "") => `
    <div class="tm-box kt-card"><div class="kt-card-h"><h5>${title}</h5>${action}</div>${sub ? `<p class="hint">${sub}</p>` : ""}${body}</div>`;

  async function renderLive() {
    const box = document.getElementById("kt-tab");
    box.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
    let d, runden;
    try { [d, runden] = await Promise.all([hcall("/settings"), hcall("/laps")]); }
    catch (e) { box.innerHTML = `<div class="tm-box tm-err">${C.esc(e.message)}</div>`; return; }
    settings = d.settings; voices = d.voices;
    box.innerHTML = `
      <section class="kt-hero tm-box">
        <div class="kt-ref">
          <div class="tp-label">🏁 Referenzrunde</div>
          <div class="kt-ref-car" id="kt-ref-car">keine Runde geladen</div>
          <div class="kt-ref-track" id="kt-ref-track">Nach dieser Runde wird gepiept und korrigiert.</div>
          <div class="tm-actions" style="margin-top:12px">
            <label class="tm-btn sm red kt-file"><span>CSV laden</span><input type="file" accept=".csv" id="kt-file" hidden></label>
            <select class="tm-select kt-runden" id="kt-runden">${rundenOptions(runden, "– Gespeicherte Runde wählen –")}</select>
          </div>
        </div>
        <div class="kt-tiles">
          <div><span>Rundenzeit</span><b id="kt-t-zeit">–</b></div>
          <div><span>Bremszonen</span><b id="kt-t-zonen">–</b></div>
          <div><span>Strecke</span><b id="kt-t-km">–</b></div>
        </div>
        <div class="kt-go-wrap">
          <button class="kt-go" id="kt-go">▶ COACH STARTEN</button>
          <div class="kt-st"><span class="kt-dot" id="kt-st-dot"></span><span id="kt-st-text">Bereit.</span></div>
        </div>
      </section>

      <div class="kt-cols">
        <div>
          ${card("Ausgabe", sw("beeps", "Piepton", "Taktgeber – tief = bremsen, hoch = Gas") + sw("speech", "Sprache", "Korrektur nach jeder Kurve"))}
          ${card("Worauf achten", `<div class="kt-grid2">${[["check_brake", "Bremspunkt"], ["check_throttle", "Gaspunkt"], ["check_gear", "Gang"], ["check_speed", "Kurvenspeed"], ["check_steer", "Lenkung"]].map(([k, t]) => sw(k, t)).join("")}</div>`)}
          ${card("Ab wann der Coach arbeitet", sl("start_lap", "Aktiv ab"), "", "Die Runde, in der du startest, zählt nicht mit – da kommst du meistens aus der Box. In der Boxengasse ist der Coach immer still.")}
        </div>
        <div>
          ${card("Stimme", `<select class="tm-select" id="kt-voice" style="margin-bottom:10px">${voices.length ? voices.map(v => `<option value="${C.esc(v.id)}" ${v.id === settings.voice_id ? "selected" : ""}>${C.esc(v.name)}</option>`).join("") : "<option>keine Stimme gefunden</option>"}</select>` + sl("voice_rate", "Tempo") + sl("voice_volume", "Lautstärke"), btn2("Testen", 'data-test="voice"'))}
          ${card("Pieptöne", sl("brake_freq", "Bremsen-Ton") + sl("throttle_freq", "Gas-Ton") + sl("beep_ms", "Tonlänge"), btn2("Testen", 'data-test="beeps"'))}
          ${card("Feineinstellung", sl("lead_time", "Vorlauf") + sl("tolerance_m", "Toleranz Punkte") + sl("speed_tol_kmh", "Toleranz Speed"), "", "Vorlauf: wie früh der Ton vor dem Punkt kommt. Kommt er gefühlt zu spät, höher stellen.")}
        </div>
        <div>
          ${card("Letzte Runde", `<div id="kt-lastlap" class="tm-muted">Noch keine Runde gefahren.</div><div class="kt-chips" id="kt-chips"></div>`, "", "Jede Kurve wird an ihrer Zeit gemessen – nicht daran, ob du den Bremspunkt getroffen hast.")}
          ${card("Protokoll", `<div class="kt-log" id="kt-log"></div>`)}
        </div>
      </div>`;

    // Einstellungen
    box.querySelectorAll('input[type=checkbox][data-k]').forEach(i => i.onchange = () => change(i.dataset.k, i.checked));
    box.querySelectorAll('input[type=range][data-k]').forEach(i => i.oninput = () => {
      const k = i.dataset.k, v = Number(i.value);
      document.getElementById("ktv-" + k).textContent = SLIDERS[k][3](v);
      change(k, v);
    });
    const vs = document.getElementById("kt-voice");
    if (vs) vs.onchange = () => change("voice_id", vs.value);
    box.querySelectorAll("[data-test]").forEach(b => b.onclick = () => post("/test/" + b.dataset.test).catch(e => C.toast(e.message)));

    // Runde laden
    document.getElementById("kt-file").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        await hcall("/lap/upload?zweck=ref", { raw: await f.arrayBuffer(), name: f.name }, 30000);
        C.toast("Referenzrunde geladen", true);
        refreshRunden();
      } catch (x) { C.toast(x.message); }
      e.target.value = "";
    };
    document.getElementById("kt-runden").onchange = async (e) => {
      const [typ, id] = e.target.value.split("|");
      if (!id) return;
      try { await post("/lap/load", { typ, id }); C.toast("Runde geladen", true); } catch (x) { C.toast(x.message); }
      e.target.value = "";
    };
    document.getElementById("kt-go").onclick = async () => {
      try { await post(st.coach.running ? "/coach/stop" : "/coach/start"); } catch (x) { C.toast(x.message); }
    };
    updateLive();
  }

  function rundenOptions(r, first) {
    const opt = (x) => `<option value="${x.typ}|${C.esc(x.id)}">${C.esc(x.name)}</option>`;
    return `<option value="">${first}</option>` +
      (r.refs.length ? `<optgroup label="Referenzrunden">${r.refs.map(opt).join("")}</optgroup>` : "") +
      (r.eigene.length ? `<optgroup label="Eigene Mitschnitte">${r.eigene.map(opt).join("")}</optgroup>` : "");
  }

  async function refreshRunden() {
    try {
      const r = await hcall("/laps");
      const s = document.getElementById("kt-runden");
      if (s) s.innerHTML = rundenOptions(r, "– Gespeicherte Runde wählen –");
    } catch (e) { /* egal */ }
  }

  function change(k, v) {
    settings[k] = v;
    pending[k] = v;
    clearTimeout(saveT);
    saveT = setTimeout(() => { const p = pending; pending = {}; post("/settings", p).catch(e => C.toast(e.message)); }, 300);
  }

  function statusFarbe(t) {
    t = (t || "").toLowerCase();
    if (t.includes("fehlt") || t.includes("fehler")) return "bad";
    if (t.includes("warte") || t.includes("boxengasse")) return "warn";
    if (t.includes("aktiv") || t.includes("verbunden") || t.includes("läuft")) return "good";
    return "";
  }

  let lapSig = "", lastLapAt = 0;
  function updateLive() {
    if (!st || !document.getElementById("kt-go")) return;
    const l = st.lap;
    const sig = l ? l.datei : "";
    if (sig !== lapSig) {
      lapSig = sig;
      document.getElementById("kt-ref-car").textContent = l ? l.car : "keine Runde geladen";
      document.getElementById("kt-ref-track").textContent = l ? l.track : "Nach dieser Runde wird gepiept und korrigiert.";
      document.getElementById("kt-t-zeit").textContent = l ? l.laptime : "–";
      document.getElementById("kt-t-zonen").textContent = l ? l.zones : "–";
      document.getElementById("kt-t-km").textContent = l ? l.km.toFixed(2) + " km" : "–";
    }
    const go = document.getElementById("kt-go");
    go.textContent = st.coach.running ? "■ COACH STOPPEN" : "▶ COACH STARTEN";
    go.classList.toggle("stop", st.coach.running);
    const f = statusFarbe(st.coach.status);
    document.getElementById("kt-st-dot").className = "kt-dot " + f;
    document.getElementById("kt-st-text").textContent = st.coach.status;

    if (st.lastLap && st.lastLap.at !== lastLapAt) {
      lastLapAt = st.lastLap.at;
      document.getElementById("kt-lastlap").innerHTML = st.lastLap.zeilen.length ? st.lastLap.zeilen.map(C.esc).join("<br>") : "Keine Kurve gemessen.";
      document.getElementById("kt-lastlap").className = "";
      document.getElementById("kt-chips").innerHTML = st.lastLap.kurven.map(k => {
        const c = k.dt <= 0.01 ? "good" : k.dt < 0.10 ? "warn" : "bad";
        return `<div class="kt-chip ${c}"><span>K${k.nr}</span><b>${(k.dt >= 0 ? "+" : "") + k.dt.toFixed(2)}</b></div>`;
      }).join("");
    }
    if (st.log && st.log.length) {
      const el = document.getElementById("kt-log");
      const unten = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      el.insertAdjacentHTML("beforeend", st.log.map(x => `<div>${C.esc(x.t)}</div>`).join(""));
      while (el.childElementCount > 400) el.firstChild.remove();
      lastLog = st.log[st.log.length - 1].id;
      if (unten) el.scrollTop = el.scrollHeight;
    }
  }

  /* ================================================================ SETUP-BERATER */
  async function renderSetup() {
    const box = document.getElementById("kt-tab");
    box.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
    let s, saved;
    try {
      if (!meta) meta = await hcall("/setup/meta");
      [s, saved] = await Promise.all([hcall("/setup/state"), hcall("/setup/saved")]);
    } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${C.esc(e.message)}</div>`; return; }
    meta.goals.forEach(g => { if (!(g.key in sev)) sev[g.key] = 0; });
    const groups = meta.groups.map(grp => {
      const drin = meta.goals.filter(g => g.group === grp);
      if (!drin.length) return "";
      return `<div class="kt-grp">${C.esc(grp)}</div>` + drin.map(g => `
        <div class="kt-sym" data-help="${g.key}">
          <span>${C.esc(g.name)}</span>
          ${meta.severity.slice(1).map(([n, w]) => `<button type="button" data-sev="${g.key}" data-n="${n}">${C.esc(w)}</button>`).join("")}
        </div>`).join("");
    }).join("");

    box.innerHTML = `
      <div class="tm-box kt-bar">
        <label class="tm-switch"><input type="checkbox" id="kt-slive" ${s.live ? "checked" : ""}><span class="s"></span><b>Setup live aus iRacing lesen</b></label>
        <span class="kt-st"><span class="kt-dot" id="kt-sdot"></span><span id="kt-sstat">${C.esc(s.status)}</span></span>
        <span class="kt-sp"></span>
        ${btn2("Setup merken", 'id="kt-ssave"')}
        <select class="tm-select" id="kt-sload" style="width:auto;max-width:280px"><option value="">Gemerktes Setup laden …</option>${saved.saved.map(n => `<option value="${C.esc(n)}">${C.esc(n.replace(/\.json$/, "").replace(/_/g, " "))}</option>`).join("")}</select>
      </div>
      <div class="kt-setup">
        <div class="tm-box kt-card">
          <div class="kt-card-h"><h5>Aktuelles Setup</h5></div>
          <p class="hint" id="kt-scar"></p>
          <div class="kt-slist" id="kt-slist"></div>
        </div>
        <div>
          <div class="tm-box kt-card">
            <div class="kt-card-h"><h5>Was macht das Auto?</h5>${btn2("Zurücksetzen", 'id="kt-sreset"')}</div>
            <p class="hint" id="kt-smain"></p>
            <div class="kt-syms">${groups}</div>
            <div class="kt-help" id="kt-help"></div>
          </div>
          <div class="tm-box kt-card">
            <div class="kt-card-h"><h5>Das solltest du ändern</h5></div>
            <div id="kt-res"></div>
          </div>
        </div>
      </div>`;

    const help = (k) => {
      document.getElementById("kt-help").innerHTML = k
        ? `<b>${C.esc(meta.goals.find(g => g.key === k).name)}:</b> ${C.esc(meta.help[k] || "")}`
        : `${C.esc(meta.basics)}<br><span class="tm-muted">Fahr mit der Maus über ein Symptom, dann steht hier, woran du es im Auto erkennst.</span>`;
    };
    help(null);
    box.querySelectorAll("[data-help]").forEach(r => { r.onmouseenter = () => help(r.dataset.help); r.onmouseleave = () => help(null); });
    box.querySelectorAll("[data-sev]").forEach(b => b.onclick = () => {
      const k = b.dataset.sev, n = Number(b.dataset.n);
      sev[k] = sev[k] === n ? 0 : n;
      paintSev(); advise();
    });
    document.getElementById("kt-sreset").onclick = () => { Object.keys(sev).forEach(k => (sev[k] = 0)); paintSev(); advise(); };
    document.getElementById("kt-slive").onchange = async (e) => {
      try { const r = await post("/setup/live", { on: e.target.checked }); showSetup(r); } catch (x) { C.toast(x.message); }
    };
    document.getElementById("kt-ssave").onclick = async () => {
      try { const r = await post("/setup/save"); C.toast("Gemerkt: " + r.name, true); renderSetup(); } catch (x) { C.toast(x.message); }
    };
    document.getElementById("kt-sload").onchange = async (e) => {
      if (!e.target.value) return;
      try { const r = await post("/setup/load", { name: e.target.value }); document.getElementById("kt-slive").checked = false; showSetup(r); }
      catch (x) { C.toast(x.message); }
    };
    paintSev();
    showSetup(s);
    // Live-Setup verfolgen (Garage-Änderungen)
    const my = alive;
    setupT = setInterval(async () => {
      try { const r = await hcall("/setup/state", {}, 3000); if (my === alive && tab === "setup") showSetup(r); } catch (e) { /* Poll kümmert sich */ }
    }, 1500);
  }

  function paintSev() {
    document.querySelectorAll("[data-sev]").forEach(b => {
      const on = sev[b.dataset.sev] === Number(b.dataset.n);
      b.classList.toggle("on", on);
      b.style.background = on ? SEV_COL[b.dataset.n] : "";
      b.style.borderColor = on ? SEV_COL[b.dataset.n] : "";
    });
    const n = Object.values(sev).filter(Boolean).length;
    const el = document.getElementById("kt-smain");
    if (el) el.textContent = n ? `${n} Symptom${n > 1 ? "e" : ""} gemeldet – stärkere zählen mehr.` : "Stell bei jedem Symptom ein, wie stark es dich stört – der Rest bleibt auf „keins“.";
  }

  function showSetup(s) {
    const dot = document.getElementById("kt-sdot");
    if (!dot) return;
    const t = (s.status || "").toLowerCase();
    dot.className = "kt-dot " + (t.includes("fehl") ? "bad" : (t.includes("warte") || t.includes("starte") || t.includes("setz dich")) ? "warn" : t.startsWith("live:") ? "good" : "");
    document.getElementById("kt-sstat").textContent = s.status;
    const sig = JSON.stringify([s.car, s.track, s.source, s.groups]);
    if (sig === setupSig && document.getElementById("kt-slist").childElementCount) return;
    setupSig = sig;
    document.getElementById("kt-scar").textContent = s.has ? `${s.car} · ${s.track}${s.source ? " · " + s.source : ""}` : "noch kein Setup – Live-Lesen einschalten oder ein gemerktes laden";
    document.getElementById("kt-slist").innerHTML = s.groups.map(g => `<div class="kt-grp">${C.esc(g.name)}</div>` +
      g.items.map(([n, v]) => `<div class="kt-srow"><span>${C.esc(n)}</span><b>${C.esc(v)}</b></div>`).join("")).join("");
    advise();
  }

  async function advise() {
    const res = document.getElementById("kt-res");
    if (!res) return;
    if (!Object.values(sev).some(Boolean)) {
      res.innerHTML = `<p class="tm-muted">${setupSig && document.getElementById("kt-slist").childElementCount ? "Links steht dein Setup. Jetzt oben einstellen, was das Auto macht." : "Zuerst ein Setup laden: Live-Lesen einschalten und ins Auto setzen, oder ein gemerktes Setup laden."}</p>`;
      return;
    }
    let d;
    try { d = await post("/setup/advise", { severity: sev }); } catch (e) { res.innerHTML = `<p class="tm-err">${C.esc(e.message)}</p>`; return; }
    const notes = d.rows.length ? d.notes.concat(["Tipp: Immer nur 1–2 Änderungen gleichzeitig testen, dann ein paar Runden fahren. Steht ein Wert im Garage-Menü schon am Anschlag, nimm die nächste Zeile."])
      : ["Für diese Ziele gibt es in diesem Setup keine passende Einstellung."].concat(d.notes);
    res.innerHTML = d.rows.map((r, i) => `
      <div class="kt-rec">
        <div class="kt-rec-h"><span class="kt-nr">${i + 1}</span><b>${C.esc(r.label)}</b><small>${C.esc(r.where)}</small></div>
        <div class="kt-rec-v"><s>${C.esc(r.current)}</s><span>➜</span><b>${C.esc(r.new)}</b></div>
        <p>Warum: ${C.esc(r.why)}</p>
        ${r.downside ? `<p class="kt-down">Nachteil: ${C.esc(r.downside)}</p>` : ""}
      </div>`).join("") + notes.map(n => `<p class="tm-muted kt-note">ⓘ ${C.esc(n)}</p>`).join("");
  }

  /* ================================================================ STRECKENBERATER */
  async function renderStrecke() {
    const box = document.getElementById("kt-tab");
    let r = { refs: [], eigene: [] };
    try { r = await hcall("/laps"); } catch (e) { /* leer */ }
    box.innerHTML = `
      <div class="tm-box kt-bar">
        <b class="kt-bar-t">Runde von dieser Strecke:</b>
        ${btn2("Letzte eigene Runde", 'data-src="letzte"')}
        ${btn2("Aktuelle Referenzrunde", 'data-src="aktuell"')}
        <select class="tm-select" id="kt-sr-sel" style="width:auto;max-width:300px">${rundenOptions(r, "Gespeicherte Runde …")}</select>
        <label class="tm-btn sm kt-file"><span>CSV hochladen</span><input type="file" accept=".csv" id="kt-sr-file" hidden></label>
      </div>
      <div id="kt-sr"><div class="tm-box tm-soon"><div class="big">Strecke vermessen</div><p>Lade eine Runde von dieser Strecke – daraus wird berechnet, wie viel Abtrieb die Strecke will, gilt auch für Layouts, die in keiner Liste stehen.</p></div></div>`;
    const go = async (body) => {
      try { zeigeStrecke(await post("/strecke", body)); } catch (e) { C.toast(e.message); }
    };
    box.querySelectorAll("[data-src]").forEach(b => b.onclick = () => go({ typ: b.dataset.src }));
    document.getElementById("kt-sr-sel").onchange = (e) => { const [typ, id] = e.target.value.split("|"); if (id) go({ typ, id }); };
    document.getElementById("kt-sr-file").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { zeigeStrecke(await hcall("/lap/upload?zweck=strecke", { raw: await f.arrayBuffer(), name: f.name }, 30000)); } catch (x) { C.toast(x.message); }
      e.target.value = "";
    };
  }

  function zeigeStrecke(d) {
    const farbe = { "wenig Abtrieb": "#4aa3ff", "viel Abtrieb": "#ffb020" }[d.stufe] || "#22e07b";
    document.getElementById("kt-sr").innerHTML = `
      <div class="tm-box kt-sr-head">
        <div class="tp-label">🏁 Diese Strecke will</div>
        <div class="kt-sr-stufe" style="color:${farbe}">${C.esc(d.stufe)}</div>
        <p class="tm-muted">${C.esc(d.label)}</p>
        <p>Gemessen an deiner Runde: ${d.gruende.map(C.esc).join(" · ")}</p>
        <div class="kt-tiles kt-tiles4">${d.werte.map(([n, v]) => `<div><span>${C.esc(n)}</span><b>${C.esc(v)}</b></div>`).join("")}</div>
      </div>
      <div class="td-label">Was das fürs Setup heißt</div>
      ${d.tipps.map(t => `<div class="tm-box kt-tipp"><b>${C.esc(t.titel)}</b><p>${C.esc(t.text)}</p></div>`).join("")}`;
  }

  /* ================================================================ ANLEITUNG */
  const GUIDE = [
    ["Schnellstart", [
      "1. In Garage 61 eine Runde öffnen und als CSV exportieren (der Telemetrie-Export mit Speed, Brake, Throttle … – nicht der Session-Export aus Excel).",
      "2. „Live-Coach“: CSV laden, Piepton oder Sprache einschalten, „Coach starten“, losfahren.",
      "3. „Setup-Berater“: „Setup live lesen“ einschalten, ins Auto setzen, einstellen was stört – du bekommst die Werte zum Ändern.",
    ]],
    ["So funktioniert v2", [
      ["Dashboard + Helfer", "Die Oberfläche läuft hier im Team-Dashboard. Auf deinem PC läuft nur ein kleiner Helfer ohne Fenster, der iRacing liest und die Töne abspielt – zu erkennen am F2F-Symbol unten rechts in der Taskleiste."],
      ["Helfer starten", "Beim ersten Mal mit start.bat im Trainer-Ordner. Danach reicht der Knopf „Helfer starten“ im Dashboard oder ein Doppelklick auf start.bat."],
      ["Beenden", "Rechtsklick auf das Symbol unten rechts → „Beenden“, oder hier oben „Helfer beenden“."],
      ["Login", "Der Trainer läuft nur für F2F-Fahrer mit Trainer-Rolle. Das Dashboard verbindet den Helfer automatisch mit deinem Discord-Login. Ohne Internet läuft er bis zu 7 Tage weiter."],
      ["Browser-Frage", "Fragt der Browser, ob kreids888.com auf Geräte im lokalen Netzwerk zugreifen darf: Erlauben – sonst kann das Dashboard nicht mit dem Helfer sprechen."],
      ["Tab offen lassen?", "Nein. Coach und Töne laufen im Helfer weiter, auch wenn du das Dashboard schließt. Das Dashboard brauchst du nur zum Einstellen."],
    ]],
    ["Live-Coach · Referenzrunde", [
      ["CSV laden", "Die Runde, nach der gepiept und korrigiert wird. Daneben stehen Rundenzeit, Anzahl der Bremszonen und Streckenlänge, im Protokoll jede Bremszone mit Bremspunkt, Gaspunkt, Geschwindigkeit und Gang."],
      ["Gespeicherte Runden", "Geladene Referenzrunden und deine eigenen Mitschnitte lassen sich über die Auswahl daneben wieder laden."],
      ["Automatisch laden", "Die zuletzt benutzte Referenzrunde wird beim nächsten Start des Helfers von selbst geladen."],
    ]],
    ["Live-Coach · Ausgabe", [
      ["Piepton", "Taktgeber: tiefer Ton = jetzt bremsen, hoher Ton = jetzt Gas. Du fährst einfach nach dem Ton."],
      ["Sprache", "Korrektur nach jeder Kurve, z. B. „zehn Meter zu früh gebremst“. Es wird nur der größte Fehler der Kurve angesagt."],
      ["Beides", "Piepton und Sprache lassen sich gleichzeitig einschalten."],
    ]],
    ["Live-Coach · Stimme und Töne", [
      ["Stimme", "Alle auf dem PC installierten Stimmen. Weitere deutsche Stimmen gibt es kostenlos unter Windows-Einstellungen → Zeit und Sprache → Sprache → Deutsch → Sprachausgabe."],
      ["Tempo / Lautstärke", "Wie schnell und wie laut gesprochen wird."],
      ["Bremsen-Ton / Gas-Ton / Tonlänge", "Tonhöhe der Pieptöne in Hertz und wie lange ein Ton dauert. „Testen“ spielt sie ab."],
    ]],
    ["Live-Coach · Ab wann und worauf", [
      ["Aktiv ab Runde", "Vorher bleibt der Coach still. Die Startrunde zählt nicht mit. „sofort“ = schon in der Startrunde. In der Boxengasse ist er immer still."],
      ["Worauf achten", "Bremspunkt, Gaspunkt, Gang, Kurvenspeed, Lenkung – einzeln an- und abschaltbar. Lenkung erzeugt am ehesten Fehlalarme."],
      ["Status", "Grüner Punkt = aktiv, gelb = wartet (z. B. auf iRacing oder Boxengasse)."],
    ]],
    ["Live-Coach · Feineinstellung", [
      ["Vorlauf", "Die wichtigste Einstellung. Der Ton muss kommen, BEVOR der Punkt da ist. Standard 0,25 s. Gefühlt zu spät → höher (0,35–0,5), viel zu früh → niedriger (0,15)."],
      ["Toleranz Punkte", "Ab wie vielen Metern Abweichung gemeldet wird. 5 m ist streng, 10–15 m entspannter."],
      ["Toleranz Speed", "Ab welcher Abweichung in km/h am Scheitelpunkt gemeldet wird."],
    ]],
    ["Setup-Berater", [
      ["Setup live lesen", "Solange der Schalter an ist und du in iRacing im Auto sitzt, holt sich der Trainer dein aktuelles Setup samt Auto und Strecke. Änderungen in der Garage erscheinen von selbst."],
      ["Was macht das Auto?", "Bei jedem Symptom einstellen, wie stark es stört (leicht / mittel / stark). Stärkere zählen mehr. Nochmal klicken schaltet es aus."],
      ["Das solltest du ändern", "Bis zu sechs Änderungen, die wichtigste zuerst – mit Ort in der Garage, aktuellem → empfohlenem Wert, warum und welchem Nachteil."],
      ["Setup merken / laden", "Speichert das Setup im Ordner „setups“ des Trainers – so geht die Beratung auch ohne laufendes iRacing."],
      ["Wie es entscheidet", "Mit festen Fahrwerksregeln, nicht mit einer KI. Immer ein vorsichtiger Schritt pro Änderung."],
      ["Tipp", "Immer nur 1–2 Änderungen gleichzeitig testen und ein paar Runden fahren."],
    ]],
    ["Streckenberater", [
      ["Strecke vermessen", "Aus einer gefahrenen Runde wird berechnet, wie viel Vollgas, wie lang die längste Gerade und wie viele langsame Kurven die Strecke hat – daraus ergibt sich, ob sie wenig, mittel oder viel Abtrieb will."],
      ["Welche Runde?", "Deine letzte eigene Runde (der Coach schreibt jede Runde mit), die aktuelle Referenzrunde, eine gespeicherte Runde oder eine hochgeladene CSV."],
    ]],
    ["Wenn etwas nicht geht", [
      ["„Helfer ist nicht gestartet“", "start.bat im Trainer-Ordner doppelklicken. Erscheint kein Symbol unten rechts, steht der Fehler in „fehler.log“ im Ordner."],
      ["„Warte auf iRacing“", "iRacing läuft nicht oder du bist nicht auf der Strecke. Der Coach verbindet sich von selbst."],
      ["Kein Ton", "„Testen“ drücken und in Windows prüfen, ob der Ton auf dem richtigen Gerät landet."],
      ["„In der Datei fehlen Spalten“", "Falscher Export aus Garage 61, siehe Schnellstart."],
      ["Python spinnt", "Unterordner „python“ im Trainer-Ordner löschen und start.bat neu starten."],
    ]],
  ];

  function renderGuide() {
    document.getElementById("kt-tab").innerHTML = GUIDE.map(([t, items]) => `
      <div class="tm-box kt-guide"><h5>${C.esc(t)}</h5>
        ${items.map(it => Array.isArray(it)
          ? `<div class="kt-gi"><b>${C.esc(it[0])}</b><span>${C.esc(it[1])}</span></div>`
          : `<p>${C.esc(it)}</p>`).join("")}
      </div>`).join("");
  }

  window.F2FTrainer = { mount, unmount };
})();
