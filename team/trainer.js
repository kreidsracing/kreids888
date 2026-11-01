/* ===========================================================
   TEAM-TRAINER v2 – Oberfläche im Team-Dashboard
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

  function unmount() { alive++; stopTimers(); vgCleanup(); root = null; }

  async function mount(el, ctx) {
    unmount();
    C = ctx; root = el;
    const my = alive;
    root.innerHTML = C.panelHead("trainer", "Team-Trainer", '<span class="tm-badge">v2</span>') +
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
            <li>${info.ready ? `<a class="tm-btn sm" href="/api/team/trainer/download"><span>⬇ Team-Trainer v${C.esc(info.version)} herunterladen</span></a>` : '<span class="tm-muted">Download wird gerade eingerichtet …</span>'}</li>
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
        ${[["live", "Live-Coach"], ["setup", "Setup-Berater"], ["optimizer", "Setup-Optimizer"], ["vergleich", "Streckenvergleich"], ["anleitung", "Anleitung"]]
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
    vgCleanup();
    lastLog = 0;
    if (tab === "live") renderLive();
    else if (tab === "setup") renderSetup();
    else if (tab === "optimizer") renderOptimizer();
    else if (tab === "vergleich") renderVergleich();
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
            <div class="kt-ft">
              <div class="kt-ft-row">
                <input type="text" id="kt-ft-in" class="kt-ft-in" autocomplete="off" placeholder="Beschreib, was dich stört – z. B. „beim Einlenken schiebt die Front“">
                ${btn2("Verstehen", 'id="kt-ft-go"', "sm red")}
              </div>
              <div class="kt-ft-out" id="kt-ft-out"></div>
            </div>
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
    document.getElementById("kt-sreset").onclick = () => { Object.keys(sev).forEach(k => (sev[k] = 0)); paintSev(); advise(); document.getElementById("kt-ft-out").innerHTML = ""; };
    const ftIn = document.getElementById("kt-ft-in");
    const ftGo = () => deuteFreitext(ftIn.value);
    document.getElementById("kt-ft-go").onclick = ftGo;
    ftIn.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); ftGo(); } };
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

  /* ---- Freitext: „Beschreib, was dich stört" → Symptome ---- */
  async function deuteFreitext(text) {
    text = (text || "").trim();
    const out = document.getElementById("kt-ft-out");
    if (!text) { if (out) out.innerHTML = ""; return; }
    let d;
    try { d = await post("/setup/text", { text }); } catch (e) { C.toast(e.message); return; }
    // Erkanntes in die bestehende Auswahl übernehmen – höhere Stärke gewinnt
    (d.erkannt || []).forEach(x => { if ((sev[x.key] || 0) < x.staerke) sev[x.key] = x.staerke; });
    paintSev(); advise();
    zeigeFreitext(d, out);
  }

  const FT_STUFE = { 1: "leicht", 2: "mittel", 3: "stark" };
  function zeigeFreitext(d, out) {
    if (!out) return;
    let h = "";
    if (d.erkannt && d.erkannt.length) {
      h += `<div class="kt-ft-tit">Übernommen:</div>` + d.erkannt.map(x =>
        `<div class="kt-ft-hit"><span class="kt-ft-satz">„${C.esc(x.satz)}“</span><span class="kt-ft-pfeil">➜</span><b>${C.esc(x.name)}</b><em>${FT_STUFE[x.staerke] || ""}</em></div>`).join("");
    }
    if (d.fragen && d.fragen.length) {
      h += `<div class="kt-ft-tit">Kurz nachgefragt:</div>` + d.fragen.map(f =>
        `<div class="kt-ft-q"><p>„${C.esc(f.satz)}“ – ${C.esc(f.frage)}</p><div class="kt-ft-opts">${
          f.optionen.map(o => `<button type="button" class="tm-btn sm" data-keys="${C.esc(o.key)}">${C.esc(o.text)}</button>`).join("")
        }</div></div>`).join("");
    }
    if (d.unklar && d.unklar.length) {
      h += d.unklar.map(s => `<p class="kt-ft-unklar">Nicht erkannt: „${C.esc(s)}“ – beschreib es, wie du es im Auto erlebst.</p>`).join("");
    }
    if (d.hilfe) h += `<p class="kt-ft-hilfe">ⓘ ${C.esc(d.hilfe)}</p>`;
    out.innerHTML = h;
    out.querySelectorAll("[data-keys]").forEach(b => b.onclick = () => {
      b.dataset.keys.split("+").forEach(k => { if (k) sev[k] = Math.max(sev[k] || 0, 2); });
      const q = b.closest(".kt-ft-q"); if (q) q.classList.add("done");
      paintSev(); advise();
    });
  }

  /* ================================================================ SETUP-OPTIMIZER (Ablauf wie GO Fast: Problem → Wo → Tempo → Stärke, dann testen und Rückmeldung) */
  const OPT_KEY = "kt-optimizer";
  const OPT_PROBLEME = [
    ["us", "Untersteuern", "Front schiebt, Auto dreht nicht ein", true],
    ["os", "Übersteuern", "Heck kommt, Auto dreht zu stark", true],
    ["lockup", "Räder blockieren", "beim Bremsen", false],
    ["brake_stab", "Unruhig beim Bremsen", "zieht oder schlingert", false],
    ["traction", "Räder drehen durch", "zu wenig Traktion am Ausgang", false],
    ["kerbs", "Kerbs und Bodenwellen", "springt, verliert Grip", false],
    ["hop", "Hoppelt oder setzt auf", "", false],
    ["steer", "Lenkung träge", "reagiert zu spät", false],
    ["nervous", "Zu nervös", "zuckig, schwer zu halten", false],
    ["fast_stab", "Unsicher in schnellen Kurven", "", false],
    ["straight", "Unruhig auf der Geraden", "", false],
    ["direction", "Träge im Richtungswechsel", "Schikanen", false],
    ["topspeed", "Zu langsam auf der Geraden", "", false],
    ["grip", "Insgesamt zu wenig Grip", "", false],
    ["tyres", "Reifen bauen ab", "über den Stint", false],
  ];
  const OPT_PHASEN = [["entry", "Eingang", "Bremsen und Einlenken"], ["mid", "Kurvenmitte", "am Scheitel"], ["exit", "Ausgang", "beim Gasgeben"], ["lift", "Gas weg", "beim Lupfen, Lastwechsel"]];
  const OPT_TEMPO = [["langsam", "Langsame Kurven", "1. bis 3. Gang"], ["mittel", "Mittlere Kurven", "beides etwas"], ["schnell", "Schnelle Kurven", "Highspeed, Aero"]];
  const OPT_ERG = { offen: ["offen", "Test läuft"], ok: ["ok", "gelöst"], gleich: ["gleich", "noch da, stärker"], anders: ["anders", "anderes Problem"], falsch: ["falsch", "zurückgenommen"] };
  const OPT = { st: null, wahl: {}, schritt: 1, rows: null, notes: null, snap: null, zurueck: null, zurueckTitel: "", key: "" };

  function optLaden() { try { return JSON.parse(localStorage.getItem(OPT_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function optDaten() { const all = optLaden(); return all[OPT.key] || { start: null, verlauf: [] }; }
  function optSetzen(dat) { const all = optLaden(); all[OPT.key] = dat; try { localStorage.setItem(OPT_KEY, JSON.stringify(all)); } catch (e) { /* egal */ } }

  // Einstellbare Werte aus der Setup-Anzeige – Messwerte (Temperaturen, Profil, Warmdruck) zählen nicht
  function optWerte(groups) {
    const out = {};
    (groups || []).forEach(g => {
      if (/nur Anzeige/i.test(g.name)) return;
      g.items.forEach(([n, v]) => { if (!/zuletzt|Profil|temperatur|warm|Verschlei/i.test(n)) out[g.name + " › " + n] = v; });
    });
    return out;
  }
  function optDiff(alt, neu) {
    alt = alt || {}; neu = neu || {};
    return Object.keys(Object.assign({}, alt, neu)).filter(k => alt[k] !== neu[k])
      .map(k => ({ k, a: alt[k] == null ? "–" : alt[k], b: neu[k] == null ? "–" : neu[k] }));
  }
  const optStufe = s => s <= 2 ? 1 : s === 3 ? 2 : 3;   // 1–5 auf die drei Stufen der Setup-Regeln
  function optZiele(w) {
    const sev = {}, L = optStufe(w.staerke), weniger = Math.max(1, L - 1);
    const add = (k, v) => { if (meta && !meta.goals.some(g => g.key === k)) return; sev[k] = Math.max(sev[k] || 0, v); };
    const p = w.problem;
    if (p === "us" || p === "os") {
      if (w.phase === "mid") {
        if (w.tempo !== "schnell") add(p + "_mid_slow", w.tempo === "mittel" ? weniger : L);
        if (w.tempo !== "langsam") add(p + "_mid_fast", w.tempo === "mittel" ? weniger : L);
      } else {
        add(p + "_" + w.phase, L);
        if (w.tempo === "schnell") add(p + "_mid_fast", weniger);   // Highspeed: Aero-Balance mitnehmen
        if (w.tempo === "langsam") add(p + "_mid_slow", weniger);   // langsam: mechanische Balance mitnehmen
      }
    } else add(p, L);
    return sev;
  }
  const optBrauchtWo = w => w.problem === "us" || w.problem === "os";
  function optText(w) {
    const p = OPT_PROBLEME.find(x => x[0] === w.problem);
    let t = p ? p[1] : (w.problem || "");
    if (optBrauchtWo(w)) {
      const ph = OPT_PHASEN.find(x => x[0] === w.phase), te = OPT_TEMPO.find(x => x[0] === w.tempo);
      t += ` · ${ph ? ph[1] : "?"} · ${te ? te[1] : "?"}`;
    }
    return t + ` · Stärke ${w.staerke || "?"}/5`;
  }

  async function renderOptimizer() {
    const box = document.getElementById("kt-tab");
    box.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
    let s, saved;
    try {
      if (!meta) meta = await hcall("/setup/meta");
      [s, saved] = await Promise.all([hcall("/setup/state"), hcall("/setup/saved")]);
    } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${C.esc(e.message)}</div>`; return; }
    box.innerHTML = `
      <div class="tm-box kt-bar">
        <label class="tm-switch"><input type="checkbox" id="ko-live" ${s.live ? "checked" : ""}><span class="s"></span><b>Setup live aus iRacing lesen</b></label>
        <span class="kt-st"><span class="kt-dot" id="ko-dot"></span><span id="ko-stat"></span></span>
        <span class="kt-sp"></span>
        <select class="tm-select" id="ko-load" style="width:auto;max-width:280px"><option value="">Gemerktes Setup laden …</option>${saved.saved.map(n => `<option value="${C.esc(n)}">${C.esc(n.replace(/\.json$/, "").replace(/_/g, " "))}</option>`).join("")}</select>
      </div>
      <div class="ko">
        <div class="tm-box ko-main" id="ko-main"></div>
        <div class="tm-box ko-side"><div class="kt-card-h"><h5>Verlauf</h5></div><div id="ko-verlauf"></div></div>
      </div>`;
    document.getElementById("ko-live").onchange = async (e) => {
      try { optStatus(await post("/setup/live", { on: e.target.checked })); } catch (x) { C.toast(x.message); }
    };
    document.getElementById("ko-load").onchange = async (e) => {
      if (!e.target.value) return;
      try { const r = await post("/setup/load", { name: e.target.value }); document.getElementById("ko-live").checked = false; optStatus(r); }
      catch (x) { C.toast(x.message); }
    };
    optStatus(s, true);
    const my = alive;
    setupT = setInterval(async () => {
      try { const r = await hcall("/setup/state", {}, 3000); if (my === alive && tab === "optimizer") optStatus(r); } catch (e) { /* Poll kümmert sich */ }
    }, 1500);
  }

  function optStatus(s, neu) {
    OPT.st = s;
    const dot = document.getElementById("ko-dot"); if (!dot) return;
    const t = (s.status || "").toLowerCase();
    dot.className = "kt-dot " + (t.includes("fehl") ? "bad" : (t.includes("warte") || t.includes("starte") || t.includes("setz dich")) ? "warn" : t.startsWith("live:") ? "good" : "");
    document.getElementById("ko-stat").textContent = s.has ? `${s.car} · ${s.track}${s.source ? " · " + s.source : ""}` : s.status;
    const key = s.has ? s.car + "|" + s.track : "";
    if (key !== OPT.key || neu) {
      if (key !== OPT.key) { OPT.schritt = 1; OPT.wahl = {}; }
      OPT.key = key; optMain(); optVerlauf();
    } else optLive();
  }

  function optMain() {
    const el = document.getElementById("ko-main"); if (!el) return;
    if (!OPT.st || !OPT.st.has) {
      el.innerHTML = `<div class="tm-soon"><div class="big">Erst ein Setup laden</div><p>Oben „Setup live aus iRacing lesen“ einschalten und ins Auto setzen – oder ein gemerktes Setup laden. Der Optimizer braucht die echten Werte, um dir konkrete Änderungen zu nennen.</p></div>`;
      return;
    }
    const w = OPT.wahl;
    if (OPT.schritt === "vorschlag") return optVorschlagZeigen(el);
    if (OPT.schritt === "zurueck") return optZurueckZeigen(el);
    const nr = OPT.schritt, wo = optBrauchtWo(w);
    const stufen = (wo ? [1, 2, 3, 4] : [1, 4]).map((n, i) => `<span class="ko-st${n === nr ? " on" : n < nr ? " ok" : ""}"><b>${i + 1}</b>${["Problem", "Wo", "Tempo", "Stärke"][n - 1]}</span>`).join("");
    const karte = (attr, wert, titel, sub, an) => `<button type="button" class="ko-card${an ? " on" : ""}" ${attr}="${wert}"><b>${C.esc(titel)}</b>${sub ? `<small>${C.esc(sub)}</small>` : ""}</button>`;
    let inhalt = "";
    if (nr === 1) inhalt = `<div class="ko-frage">Was stört dich?</div><div class="ko-grid">${OPT_PROBLEME.filter(p => !meta || meta.goals.some(g => g.key.startsWith(p[0]))).map(p => karte("data-p", p[0], p[1], p[2], w.problem === p[0])).join("")}</div>`;
    else if (nr === 2) inhalt = `<div class="ko-frage">Wo in der Kurve?</div><div class="ko-grid">${OPT_PHASEN.map(p => karte("data-ph", p[0], p[1], p[2], w.phase === p[0])).join("")}</div>`;
    else if (nr === 3) inhalt = `<div class="ko-frage">In welchen Kurven?</div><div class="ko-grid">${OPT_TEMPO.map(p => karte("data-te", p[0], p[1], p[2], w.tempo === p[0])).join("")}</div>`;
    else inhalt = `<div class="ko-frage">Wie stark?</div><p class="hint">${C.esc(optText(Object.assign({}, w, { staerke: "?" })).replace(" · Stärke ?/5", ""))}</p>
        <div class="ko-stark">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-s="${n}" class="${w.staerke === n ? "on" : ""}">${n}</button>`).join("")}</div>
        <div class="ko-stark-l"><span>kaum zu spüren</span><span>stört deutlich</span><span>unfahrbar</span></div>`;
    el.innerHTML = `<div class="ko-steps">${stufen}</div>${inhalt}
      <div class="ko-nav">${nr > 1 ? btn2("‹ Zurück", 'id="ko-back"') : "<span></span>"}
        ${nr === 4 ? btn2("Vorschlag holen", `id="ko-go"${w.staerke ? "" : " disabled"}`, "red") : ""}</div>`;
    el.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { OPT.wahl = { problem: b.dataset.p }; OPT.schritt = optBrauchtWo(OPT.wahl) ? 2 : 4; optMain(); });
    el.querySelectorAll("[data-ph]").forEach(b => b.onclick = () => { w.phase = b.dataset.ph; OPT.schritt = 3; optMain(); });
    el.querySelectorAll("[data-te]").forEach(b => b.onclick = () => { w.tempo = b.dataset.te; OPT.schritt = 4; optMain(); });
    el.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { w.staerke = Number(b.dataset.s); optMain(); });
    const back = document.getElementById("ko-back");
    if (back) back.onclick = () => { OPT.schritt = nr === 4 ? (optBrauchtWo(w) ? 3 : 1) : nr - 1; optMain(); };
    const go = document.getElementById("ko-go");
    if (go) go.onclick = () => optVorschlag();
  }

  async function optVorschlag() {
    const w = OPT.wahl;
    let d;
    try { d = await post("/setup/advise", { severity: optZiele(w) }); } catch (e) { C.toast(e.message); return; }
    OPT.rows = d.rows; OPT.notes = d.notes; OPT.snap = optWerte(OPT.st.groups); OPT.schritt = "vorschlag";
    const dat = optDaten();
    if (!dat.start) dat.start = OPT.snap;
    dat.verlauf.push({ wahl: Object.assign({}, w), rows: d.rows.map(r => ({ label: r.label, where: r.where, current: r.current, new: r.new })), snap: OPT.snap, erg: "offen", zeit: Date.now() });
    optSetzen(dat); optMain(); optVerlauf();
  }

  function optVorschlagZeigen(el) {
    const dat = optDaten(), rows = OPT.rows || [];
    el.innerHTML = `
      <div class="ko-kopf"><span class="kt-nr">${dat.verlauf.length}</span><b>${C.esc(optText(OPT.wahl))}</b></div>
      ${rows.length ? rows.map((r, i) => `
        <div class="kt-rec">
          <div class="kt-rec-h"><span class="kt-nr">${i + 1}</span><b>${C.esc(r.label)}</b><small>${C.esc(r.where)}</small></div>
          <div class="kt-rec-v"><s>${C.esc(r.current)}</s><span>➜</span><b>${C.esc(r.new)}</b></div>
          <p>Warum: ${C.esc(r.why)}</p>
          ${r.downside ? `<p class="kt-down">Nachteil: ${C.esc(r.downside)}</p>` : ""}
        </div>`).join("") : `<p class="tm-muted">Für diese Angabe gibt es in diesem Setup keine passende Einstellung.</p>`}
      ${(OPT.notes || []).map(n => `<p class="tm-muted kt-note">ⓘ ${C.esc(n)}</p>`).join("")}
      <div class="ko-live"><div class="ko-live-h">Im Auto geändert <small id="ko-live-q"></small></div><div id="ko-diff"></div></div>
      <div class="ko-test">Änderungen in der Garage eintragen, dann mindestens 3 Runden fahren. Wie ist es jetzt?</div>
      <div class="ko-fb">
        <button type="button" class="ok" data-fb="ok">✓ Problem gelöst<small>weiter mit dem nächsten Thema</small></button>
        <button type="button" class="gleich" data-fb="gleich">↻ Gleiches Problem<small>ist noch da – nächster, stärkerer Schritt</small></button>
        <button type="button" class="anders" data-fb="anders">⇄ Anderes Problem<small>das hier ist weg, dafür etwas Neues</small></button>
        <button type="button" class="falsch" data-fb="falsch">↶ Falsche Richtung<small>wurde schlechter – Werte zurückstellen</small></button>
      </div>`;
    el.querySelectorAll("[data-fb]").forEach(b => b.onclick = () => optFeedback(b.dataset.fb));
    optLive();
  }

  function optLive() {
    const el = document.getElementById("ko-diff"); if (!el || !OPT.st) return;
    const q = document.getElementById("ko-live-q");
    if (q) q.textContent = OPT.st.live ? "(live aus iRacing)" : "(Live-Lesen ist aus – Änderungen sieht der Optimizer dann nicht)";
    const diff = optDiff(OPT.snap, optWerte(OPT.st.groups));
    el.innerHTML = diff.length ? diff.map(x => `<div class="ko-diff-z"><span>${C.esc(x.k)}</span><b><s>${C.esc(x.a)}</s> ➜ ${C.esc(x.b)}</b></div>`).join("")
      : `<p class="tm-muted">Noch nichts geändert.</p>`;
  }

  function optFeedback(art) {
    const dat = optDaten(), step = dat.verlauf[dat.verlauf.length - 1];
    if (step) step.erg = art;
    if (art === "falsch") {
      let rueck = optDiff(OPT.snap, optWerte(OPT.st.groups)).map(x => ({ k: x.k, jetzt: x.b, auf: x.a }));
      if (!rueck.length && step) rueck = step.rows.map(r => ({ k: `${r.where} › ${r.label}`, jetzt: r.new, auf: r.current }));
      OPT.zurueck = rueck; OPT.zurueckTitel = "Falsche Richtung – so stellst du zurück"; OPT.schritt = "zurueck";
    } else if (art === "gleich") {
      optSetzen(dat);
      OPT.wahl.staerke = Math.min(5, (OPT.wahl.staerke || 3) + 1);
      optVorschlag(); return;
    } else { OPT.schritt = 1; OPT.wahl = {}; }
    optSetzen(dat); optMain(); optVerlauf();
  }

  function optZurueckZeigen(el) {
    const z = OPT.zurueck || [];
    el.innerHTML = `<div class="ko-frage">${C.esc(OPT.zurueckTitel)}</div>
      ${z.length ? z.map(x => `<div class="ko-diff-z"><span>${C.esc(x.k)}</span><b>${C.esc(x.jetzt)} ➜ <span class="ko-auf">${C.esc(x.auf)}</span></b></div>`).join("")
        : `<p class="tm-muted">Es ist nichts zurückzustellen – das Setup ist schon so.</p>`}
      <p class="hint" style="margin-top:12px">In der Garage zurückstellen. Danach neu wählen – zum Beispiel eine andere Kurvenphase oder eine geringere Stärke.</p>
      <div class="ko-nav"><span></span>${btn2("Neu wählen", 'id="ko-neu"', "red")}</div>`;
    document.getElementById("ko-neu").onclick = () => {
      const w = OPT.wahl;
      OPT.schritt = w.problem ? (optBrauchtWo(w) ? 2 : 4) : 1;
      optMain();
    };
  }

  function optVerlauf() {
    const el = document.getElementById("ko-verlauf"); if (!el) return;
    if (!OPT.key) { el.innerHTML = `<p class="tm-muted">Noch kein Setup.</p>`; return; }
    const dat = optDaten(), v = dat.verlauf;
    el.innerHTML = (v.length ? v.map((s, i) => { const e = OPT_ERG[s.erg] || OPT_ERG.offen; return `
        <div class="ko-v ko-v-${e[0]}"><span>${i + 1}</span><div><b>${C.esc(optText(s.wahl))}</b><small>${s.rows.length} Änderung${s.rows.length === 1 ? "" : "en"} · ${e[1]}</small></div></div>`; }).reverse().join("")
        : `<p class="tm-muted">Noch keine Schritte für ${C.esc(OPT.key.replace("|", " · "))}.</p>`)
      + (dat.start ? `${btn2("Alles zurück auf Start", 'id="ko-start"')}${btn2("Neu anfangen", 'id="ko-reset"')}` : "");
    const st = document.getElementById("ko-start");
    if (st) st.onclick = () => {
      OPT.zurueck = optDiff(dat.start, optWerte(OPT.st.groups)).map(x => ({ k: x.k, jetzt: x.b, auf: x.a }));
      OPT.zurueckTitel = "Zurück auf das Setup vom Start"; OPT.schritt = "zurueck"; optMain();
    };
    const rs = document.getElementById("ko-reset");
    if (rs) rs.onclick = () => {
      if (!confirm("Verlauf für dieses Auto und diese Strecke löschen und neu anfangen?")) return;
      optSetzen({ start: null, verlauf: [] }); OPT.schritt = 1; OPT.wahl = {}; optMain(); optVerlauf();
    };
  }

  /* ================================================================ STRECKENVERGLEICH – Look wie GO-FAST-Telemetrie, Funktionen wie Garage 61 */
  const VG = { laps: { refs: [], eigene: [] }, d: null, single: false, channels: [], i0: 0, i1: 0, cur: -1,
               color: "pedale", xmode: "dist", segMode: "kurven", seg: -1, ansicht: "tele",
               showA: true, showB: true, autos: true, folgen: true, frei: false, camC: null, verlauf: [], zoomM: 90, view: null, mapGeom: null, miniGeom: null,
               chartGeom: null, drag: null, sel: null, spMinMax: [0, 1], docUp: null, raf: false,
               playing: false, playT0: 0, playS0: 0, scrubbing: false,
               mapMine: null, mapRef: null, speedArr: null, gasArr: null, bremseArr: null, deltaArr: null };

  function vgCleanup() { if (VG.docUp) { document.removeEventListener("mouseup", VG.docUp); VG.docUp = null; } VG.drag = VG.sel = null; VG.playing = false; }

  function cssVar(n, fb) { try { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || fb; } catch (e) { return fb; } }

  const FONT = '"Inter","Segoe UI",system-ui,sans-serif';
  const GF = { gruen: "#2fe39b", lila: "#b48cff", rot: "#ff4b4b", txt: "#8a90a0", hell: "#e9ecf2" };
  const CH_COL = { delta: "#b48cff", gas: "#2fe39b", bremse: "#ff4b4b", speed: "#3fd0d6", lenkung: "#c9ced8", gang: "#3f8fe0", rpm: "#f0a531", linie: "#d6a2ff" };
  const ICON = {
    rad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M12 14.2V21M9.9 11.3 3.6 9.6M14.1 11.3l6.3-1.7"/></svg>',
    pedale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="6" height="14" rx="2"/><rect x="14" y="9" width="6" height="10" rx="2"/></svg>',
    speed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-6"/></svg>',
    delta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="7.5"/><path d="M12 13V9.5M10 3h4"/></svg>',
    folgen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
    uhr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    gang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 5v14M18 5v14M6 12h12"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 15l2-5.5A2 2 0 0 1 6.9 8h10.2a2 2 0 0 1 1.9 1.5L21 15v3H3z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/></svg>',
  };

  /* ---- Formate ---- */
  const fmt = (v, d) => (v == null || !isFinite(v)) ? "–" : (d ? Number(v).toFixed(d) : String(Math.round(v)));
  const fmtSign = (v, d) => (v == null || !isFinite(v)) ? "–" : (v > 0 ? "+" : "") + Number(v).toFixed(d);
  const deltaCls = v => v == null ? "" : v > 0.1 ? "kv-bad" : v > 0.02 ? "kv-warn" : v < -0.02 ? "kv-good" : "";
  const fmtDelta = v => (v == null || !isFinite(v)) ? "–" : (v >= 0 ? "+" : "-") + Math.abs(v).toFixed(3).padStart(6, "0");
  const fmtZeit = s => { if (s == null || !isFinite(s)) return "–"; s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return String(m).padStart(2, "0") + ":" + r.toFixed(3).padStart(6, "0"); };
  const fmtSek = s => (s == null || !isFinite(s)) ? "–" : s < 60 ? s.toFixed(3) : fmtZeit(s);
  const fmtVal = (c, v) => (v == null || !isFinite(v)) ? "–" : c.key === "rpm" ? (v / 1000).toFixed(1) + "k" : c.key === "gang" ? (v <= 0 ? "N" : String(Math.round(v))) : fmt(v, c.dec);
  const fmtAxis = (c, v) => c.key === "rpm" ? (v / 1000).toFixed(1) + "k" : c.key === "delta" ? v.toFixed(2) : c.key === "linie" ? v.toFixed(1) : String(Math.round(v));
  const fmtKm = m => m >= 1000 ? (m / 1000).toFixed(3).replace(".", ",") + " km" : Math.round(m) + " m";

  /* ---- Auswahl ---- */
  function vgOptions(withQuick) {
    const r = VG.laps;
    const opt = x => `<option value="${x.typ}|${C.esc(x.id)}">${C.esc(x.name)}</option>`;
    let h = withQuick ? `<option value="letzte|">Letzte eigene Runde</option><option value="aktuell|">Aktuelle Referenzrunde</option>` : "";
    if (r.refs.length) h += `<optgroup label="Referenzrunden">${r.refs.map(opt).join("")}</optgroup>`;
    if (r.eigene.length) h += `<optgroup label="Eigene Mitschnitte">${r.eigene.map(opt).join("")}</optgroup>`;
    return h;
  }
  const vgOptionsB = () => `<option value="">— nur ansehen (kein Vergleich) —</option>` + vgOptions(true);

  /* ---- Runden aus Garage 61: Vergleich auch ohne eigenen Mitschnitt ---- */
  const G61V = { kombis: null, fahrer: [], ich: "", kombi: "", wer: null, runden: null, fehler: "", auto: false, zu: false,
    quelle: "team", top: null, topFehler: "" };   // quelle: "team" = Runden des Teams, "top" = Top 20 aus ganz Garage 61
  const g61Zeit = s => { const m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + r.toFixed(3); };
  async function vgG61Oeffnen(nurAuf) {
    const el = document.getElementById("kv-g61");
    if (!el) return;
    if (!el.hidden && !nurAuf) { el.hidden = true; return; }
    el.hidden = false;
    if (!nurAuf) G61V.zu = false;
    if (!G61V.kombis) {
      el.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
      try {
        const d = await C.api("/trainer/g61/kombis");
        if (!d.ready) { el.innerHTML = '<p class="tm-muted">Garage 61 ist im Dashboard noch nicht eingerichtet.</p>'; return; }
        Object.assign(G61V, { kombis: d.kombis || [], fahrer: d.fahrer || [], ich: d.ich || "" });
      } catch (e) { el.innerHTML = `<div class="tm-box tm-err">${C.esc(e.message)}</div>`; return; }
      if (G61V.wer === null) G61V.wer = G61V.ich;
      // zuletzt gefahrene Strecke mit Auto automatisch wählen (eigene, sonst die des Teams)
      const k = vgG61Zuletzt()[0] || G61V.kombis[0];
      G61V.kombi = k ? k.t + "|" + k.c : "";
      // ohne eigenen Mitschnitt: letzte eigene Runde und schnellste Teamrunde gleich laden und vergleichen
      G61V.auto = !!nurAuf && !!G61V.ich;
    }
    vgG61Zeichnen();
    if (!G61V.runden) vgG61Runden();
  }
  // eigene Kombis, die zuletzt gefahrene zuerst
  const vgG61Zuletzt = () => G61V.kombis.filter(x => G61V.ich && x.zuletzt && x.zuletzt[G61V.ich]).sort((a, b) => b.zuletzt[G61V.ich].localeCompare(a.zuletzt[G61V.ich]));
  const vgG61Neueste = () => (G61V.runden || []).filter(r => r.slug === G61V.ich).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
  function vgG61Zeichnen() {
    const el = document.getElementById("kv-g61");
    if (!el || el.hidden || !G61V.kombis) return;
    const ich = G61V.ich;
    const tag = s => s ? new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "";
    const opt = x => `<option value="${x.t}|${x.c}">${C.esc(x.tn)} · ${C.esc(x.cn)}</option>`;
    const meine = vgG61Zuletzt(), andere = G61V.kombis.filter(x => !meine.includes(x));
    const neu = vgG61Neueste(), kz = meine[0];
    const fahrerName = s => (G61V.fahrer.find(f => f.slug === s) || {}).name || s;
    const top = G61V.quelle === "top";
    const liste = top ? (G61V.top || []) : (G61V.runden || []).filter(r => !G61V.wer || r.slug === G61V.wer).slice(0, 40);
    const fehler = top ? G61V.topFehler : G61V.fehler, laedt = top ? !G61V.top : !G61V.runden;
    const zahl = (v, n) => v == null ? "" : Number(v).toFixed(n).replace(".", ",");
    const WOLKEN = { 1: "klar", 2: "leicht bewölkt", 3: "bewölkt", 4: "bedeckt" };
    // trocken / nass (mit Prozent) / Regen zuerst, dann Temperaturen und Tank
    const strecke = r => r.nassPct == null ? "" : r.nassPct > 1 ? `<i class="nass">nass <b>${r.nassPct} %</b></i>` : `<i class="trocken">trocken</i>`;
    const bedingungen = r => strecke(r) + (r.regen > 0 ? `<i class="regen">Regen <b>${r.regen} %</b></i>` : "") + [r.asphalt != null ? `<i class="asp">Asphalt <b>${zahl(r.asphalt, 1)}°</b></i>` : "",
      r.luft != null ? `<i>Luft <b>${zahl(r.luft, 1)}°</b></i>` : "", r.sprit != null ? `<i class="tank">Tank <b>${zahl(r.sprit, 1)} L</b></i>` : "",
      r.wolken ? `<i class="wolke">${WOLKEN[r.wolken] || ""}</i>` : ""].join("");
    // eingeklappt: nur die Kopfzeile mit dem, was gerade geladen ist
    const gew = id => {
      const s = document.getElementById(id), o = s && s.selectedOptions[0];
      if (!o || !s.value) return "";
      const teile = o.text.replace(/\.csv$/i, "").replace(/^G61 - /, "").split(" - ");
      // kurz: Fahrer · Zeit (Auto und Strecke stehen schon in der Auswahl)
      return teile.length >= 3 ? teile[0] + " · " + teile[teile.length - 1].replace(/^(\d+)\.(\d\d)\.(\d{3})$/, "$1:$2.$3") : teile.join(" - ");
    };
    el.classList.toggle("zu", G61V.zu);
    if (G61V.zu) {
      const a = gew("kv-a"), b = gew("kv-b");
      el.innerHTML = `<button type="button" class="gf-g61-kopf gf-g61-auf" id="g61-auf" title="Aufklappen"><i>▸</i><b>Runden aus Garage 61</b>
        <span class="gf-g61-sum">${a ? `<em class="a">● ${C.esc(a)}</em>` : ""}${b ? `<em class="b">● ${C.esc(b)}</em>` : ""}</span><small>aufklappen</small></button>`;
      document.getElementById("g61-auf").onclick = () => { G61V.zu = false; vgG61Zeichnen(); };
      return;
    }
    el.innerHTML = `
      <div class="gf-g61-kopf">
        <button type="button" class="gf-g61-auf" id="g61-auf" title="Einklappen"><i>▾</i><b>Runden aus Garage 61</b></button>${kz ? `<span class="gf-g61-zuletzt">Zuletzt gefahren: ${C.esc(kz.tn)} · ${C.esc(kz.cn)} (${tag(kz.zuletzt[ich])})</span>` : ""}<small>Für den Vergleich muss der Coach nicht gelaufen sein. Es wird nichts gespeichert, beim Schließen des Helfers ist alles wieder weg.</small>
      </div>
      <div class="gf-g61-wahl">
        <label><span>Strecke und Auto</span><select class="tm-select" id="g61-kombi">
          ${meine.length ? `<optgroup label="Von dir gefahren">${meine.map(opt).join("")}</optgroup>` : ""}
          ${andere.length ? `<optgroup label="Vom Team gefahren">${andere.map(opt).join("")}</optgroup>` : ""}
        </select></label>
        <label><span>Runden von</span><div class="gf-g61-quelle" id="g61-quelle">
          <button type="button" data-q="team" class="${top ? "" : "on"}">Team</button><button type="button" data-q="top" class="${top ? "on" : ""}">Top 20 Garage 61</button></div></label>
        ${top ? "" : `<label><span>Fahrer</span><select class="tm-select" id="g61-wer">
          <option value="">Alle im Team</option>
          ${G61V.fahrer.map(f => `<option value="${C.esc(f.slug)}">${C.esc(f.name)}${f.slug === ich ? " (du)" : ""}</option>`).join("")}
        </select></label>`}
      </div>
      ${top ? '<p class="gf-g61-hinweis">Die 20 Schnellsten, je Fahrer seine beste Runde. Drin sind alle Fahrer aus den Garage-61-Teams des Team-Kontos (F2F, SPR und weitere) und alle, denen das Konto auf Garage 61 folgt. Wer dort gefolgt wird, taucht hier auf. Die komplette Bestenliste wie auf der Garage-61-Seite kommt erst, wenn Garage 61 unsere App dafür freischaltet. Laden geht nur, wenn der Fahrer seine Telemetrie freigibt.</p>' : ""}
      ${fehler ? `<div class="tm-box tm-err">${C.esc(fehler)}</div>`
        : laedt ? '<div class="tm-loading"><span></span><span></span><span></span></div>'
        : liste.length ? `<div class="gf-g61-liste">${liste.map((r, i) => {
          const frei = r.tel !== false, gesperrt = frei ? "" : ' disabled title="Dieser Fahrer gibt seine Telemetrie nicht frei"';
          return `
          <div class="gf-g61-z${frei ? "" : " gesperrt"}${top && r.slug && r.slug === ich ? " ich" : ""}">
            <span class="gf-g61-nr">${i + 1}</span><b class="gf-g61-zeit">${g61Zeit(r.zeit)}</b>
            <span class="gf-g61-wer">${C.esc(r.fahrer || fahrerName(r.slug))}</span>
            <small>${tag(r.at)}</small>
            <span class="gf-g61-bed" title="Asphalt / Luft / Tank beim Start der Runde">${bedingungen(r)}</span>
            <span class="gf-g61-tags">${!top && neu && r.id === neu.id ? '<i class="neu">zuletzt gefahren</i>' : ""}${r.sauber ? '<i class="ok">sauber</i>' : ""}${r.abflug ? "<i>Abflug</i>" : ""}${r.box ? "<i>Box</i>" : ""}${frei ? "" : "<i>keine Telemetrie</i>"}</span>
            <span class="gf-g61-knopf"><button type="button" class="gf-mini-btn a" data-g61="${C.esc(r.id)}" data-ziel="a"${gesperrt}>Meine Runde</button><button type="button" class="gf-mini-btn b" data-g61="${C.esc(r.id)}" data-ziel="b"${gesperrt}>Vergleich</button></span>
          </div>`; }).join("")}</div>`
        : `<p class="tm-muted">${top ? "Garage 61 hat für diese Kombination keine Runden." : G61V.wer ? "Von diesem Fahrer gibt es hier keine Runde mit Telemetrie. Stell „Fahrer“ auf „Alle im Team“." : "Keine Runden mit Telemetrie für diese Kombination."}</p>`}`;
    const ks = document.getElementById("g61-kombi"), ws = document.getElementById("g61-wer");
    ks.value = G61V.kombi; if (ws) ws.value = G61V.wer || "";
    document.getElementById("g61-auf").onclick = () => { G61V.zu = true; vgG61Zeichnen(); };
    ks.onchange = () => { G61V.kombi = ks.value; G61V.runden = null; G61V.top = null; vgG61Zeichnen(); if (G61V.quelle === "top") vgG61Top(); else vgG61Runden(); };
    if (ws) ws.onchange = () => { G61V.wer = ws.value; vgG61Zeichnen(); };
    el.querySelectorAll("#g61-quelle [data-q]").forEach(b => b.onclick = () => {
      G61V.quelle = b.dataset.q; vgG61Zeichnen();
      if (G61V.quelle === "top" && !G61V.top) vgG61Top();
      if (G61V.quelle === "team" && !G61V.runden) vgG61Runden();
    });
    el.querySelectorAll("[data-g61]").forEach(b => b.onclick = () => vgG61Laden(b.dataset.g61, b.dataset.ziel, b));
  }
  async function vgG61Runden() {
    const [t, c] = (G61V.kombi || "").split("|");
    G61V.fehler = "";
    if (!t || !c) { G61V.runden = []; return vgG61Zeichnen(); }
    const fuer = G61V.kombi;
    try {
      const d = await C.api(`/trainer/g61/runden?track=${encodeURIComponent(t)}&car=${encodeURIComponent(c)}`);
      if (fuer !== G61V.kombi) return;
      G61V.runden = d.runden || [];
    } catch (e) { if (fuer === G61V.kombi) { G61V.runden = []; G61V.fehler = e.message; } }
    vgG61Zeichnen();
    if (G61V.auto && G61V.runden.length) {
      G61V.auto = false;
      const a = vgG61Neueste(), b = G61V.runden.find(r => !a || r.id !== a.id);
      if (!a) return;
      if (!(await vgG61Laden(a.id, "a"))) return;
      if (b && await vgG61Laden(b.id, "b")) { G61V.zu = true; vgG61Zeichnen(); vergleichStart(); }
    }
  }
  // Top 20 aus ganz Garage 61 für die gewählte Strecke mit Auto
  async function vgG61Top() {
    const [t, c] = (G61V.kombi || "").split("|");
    G61V.topFehler = "";
    if (!t || !c) { G61V.top = []; return vgG61Zeichnen(); }
    const fuer = G61V.kombi;
    try {
      const d = await C.api(`/trainer/g61/runden?quelle=top&track=${encodeURIComponent(t)}&car=${encodeURIComponent(c)}`);
      if (fuer !== G61V.kombi) return;
      G61V.top = d.runden || [];
    } catch (e) { if (fuer === G61V.kombi) { G61V.top = []; G61V.topFehler = e.message; } }
    vgG61Zeichnen();
  }
  async function vgG61Laden(id, ziel, btn) {
    const r = (G61V.runden || []).find(x => x.id === id) || (G61V.top || []).find(x => x.id === id);
    const k = (G61V.kombis || []).find(x => x.t + "|" + x.c === G61V.kombi) || {};
    if (!r) return false;
    const alt = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "lädt …"; }
    try {
      const res = await fetch("/api/team/trainer/g61/csv?id=" + encodeURIComponent(id), { credentials: "same-origin" });
      if (!res.ok) { let m = "Fehler " + res.status; try { m = (await res.json()).error || m; } catch (e) { /* leer */ } throw new Error(m); }
      const raw = await res.arrayBuffer();
      // Name im Garage-61-Muster (Fahrer - Auto - Strecke - Zeit), daraus liest der Helfer Auto, Strecke und Zeit
      const teil = s => String(s || "").replace(/\s+-\s+/g, " ").replace(/[\\/:*?"<>|]/g, " ").trim();
      const name = `G61 - ${teil(r.fahrer)} - ${teil(k.cn)} - ${teil(k.tn)} - ${g61Zeit(r.zeit).replace(":", ".")}.csv`;
      let up;
      try { up = await hcall("/lap/upload?zweck=vergleich", { raw, name }, 30000); }
      catch (e) { throw new Error(e.status ? e.message : "Der Helfer läuft nicht. Starte den Team-Trainer, dann klappt das Laden."); }
      VG.laps = up.laps; refreshVgSelects();
      const sel = document.getElementById(ziel === "a" ? "kv-a" : "kv-b");
      if (sel) { sel.value = "ref|" + up.id; if (sel.onchange) sel.onchange(); }
      if (G61V.zu) vgG61Zeichnen();
      C.toast(`${r.fahrer} ${g61Zeit(r.zeit)} als ${ziel === "a" ? "„Meine Runde“" : "„Vergleich“"} geladen`, true);
      return true;
    } catch (e) { C.toast(e.message); return false; }
    finally { if (btn) { btn.disabled = false; btn.textContent = alt; } }
  }

  async function renderVergleich() {
    vgCleanup();
    const box = document.getElementById("kt-tab");
    box.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
    try { VG.laps = await hcall("/laps"); } catch (e) { VG.laps = { refs: [], eigene: [] }; }
    box.innerHTML = `
      <div class="kv-bar gf-pick">
        <label class="kv-pick"><span class="kv-pick-l gf-a">● Meine Runde</span>
          <select class="tm-select" id="kv-a">${vgOptions(true)}</select></label>
        <span class="gf-vs">vs</span>
        <label class="kv-pick"><span class="kv-pick-l gf-b">● Vergleich</span>
          <select class="tm-select" id="kv-b">${vgOptionsB()}</select></label>
        <button type="button" class="tm-btn sm" id="kv-g61-btn" title="Runden aus Garage 61 laden, auch ohne eigenen Mitschnitt"><span>Aus Garage 61</span></button>
        <label class="tm-btn sm kt-file"><span>CSV hochladen</span><input type="file" accept=".csv" id="kv-file" hidden></label>
        ${VG.laps.eigene.length ? `<span class="gf-del"><select class="tm-select" id="kv-del-sel">${VG.laps.eigene.map(x => `<option value="${C.esc(x.id)}">${C.esc(x.name)}</option>`).join("")}</select>
          <button type="button" class="gf-mini-btn" id="kv-del-one" title="Diesen eigenen Mitschnitt löschen">Löschen</button><button type="button" class="kv-link" id="kv-del-all">alle</button></span>` : ""}
        <span class="kt-sp"></span>
        ${btn2("Vergleichen", 'id="kv-go"', "red")}
      </div>
      <div class="gf-g61" id="kv-g61" hidden></div>
      <div id="kv-view"><div class="gf gf-leer"><div class="gf-leer-in">${ICON.rad}<b>Runde wählen und auf „Vergleichen“ klicken</b>
        <p>Deine Runde gegen eine Referenz – oder unter „Vergleich“ auf „nur ansehen“ stellen, dann siehst du eine einzelne Runde: Streckenkarte mit Linie, wo gebremst und Gas gegeben wird, und alle Kanäle.</p></div></div></div>`;

    const aEl = document.getElementById("kv-a"), bEl = document.getElementById("kv-b");
    aEl.value = "letzte|"; bEl.value = "aktuell|";
    const goBtn = document.getElementById("kv-go");
    const updGo = () => { const s = goBtn.querySelector("span"); if (s) s.textContent = bEl.value ? "Vergleichen" : "Ansehen"; };
    bEl.onchange = updGo; updGo();
    goBtn.onclick = vergleichStart;
    document.getElementById("kv-g61-btn").onclick = () => vgG61Oeffnen();
    // ohne eigenen Mitschnitt gleich die Garage-61-Runden zeigen
    if (!VG.laps.eigene.length) { vgG61Oeffnen(true); if (VG.laps.refs.length) aEl.value = "ref|" + VG.laps.refs[0].id; }
    document.getElementById("kv-file").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const r = await hcall("/lap/upload?zweck=vergleich", { raw: await f.arrayBuffer(), name: f.name }, 30000);
        VG.laps = r.laps; refreshVgSelects(); bEl.value = "ref|" + r.id; updGo();
        C.toast("Runde hochgeladen", true);
      } catch (x) { C.toast(x.message); }
      e.target.value = "";
    };
    const dsel = document.getElementById("kv-del-sel");
    if (dsel) {
      document.getElementById("kv-del-one").onclick = async () => {
        if (!dsel.value || !confirm("Diesen eigenen Mitschnitt löschen?")) return;
        try { await post("/lap/delete", { typ: "eigen", id: dsel.value }); C.toast("Gelöscht", true); VG.laps = await hcall("/laps"); refreshVgSelects(); }
        catch (x) { C.toast(x.message); }
      };
      document.getElementById("kv-del-all").onclick = async () => {
        if (!confirm("Alle eigenen Mitschnitte löschen?")) return;
        try { const r = await post("/lap/delete", { alle_eigenen: true }); C.toast(r.geloescht + " gelöscht", true); VG.laps = await hcall("/laps"); refreshVgSelects(); }
        catch (x) { C.toast(x.message); }
      };
    }
  }

  function refreshVgSelects() {
    const aEl = document.getElementById("kv-a"), bEl = document.getElementById("kv-b");
    if (aEl) { const v = aEl.value; aEl.innerHTML = vgOptions(true); aEl.value = v; if (aEl.selectedIndex < 0) aEl.value = "letzte|"; }
    if (bEl) { const v = bEl.value; bEl.innerHTML = vgOptionsB(); bEl.value = v; if (bEl.selectedIndex < 0) bEl.value = "aktuell|"; }
    const dsel = document.getElementById("kv-del-sel");
    if (dsel) dsel.innerHTML = VG.laps.eigene.map(x => `<option value="${C.esc(x.id)}">${C.esc(x.name)}</option>`).join("");
  }

  function vgRef(v) { const [typ, id] = (v || "").split("|"); return id ? { typ, id } : { typ }; }

  async function vergleichStart() {
    const go = document.getElementById("kv-go");
    const a = vgRef(document.getElementById("kv-a").value);
    const bval = document.getElementById("kv-b").value;
    const view = document.getElementById("kv-view");
    vgCleanup();
    go.disabled = true;
    view.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
    try {
      if (!bval) zeigeAnalyse(await post("/einzel", { a }), true);
      else zeigeAnalyse(await post("/vergleich", { a, b: vgRef(bval) }), false);
    } catch (e) {
      view.innerHTML = `<div class="tm-box tm-err">${C.esc(e.message)}</div>`;
    } finally { go.disabled = false; }
  }

  /* ---- Daten vorbereiten ---- */
  function idxAtTime(arr, T) {
    if (!arr || !arr.length) return -1;
    let lo = 0, hi = arr.length - 1;
    if (T <= arr[0]) return 0;
    if (T >= arr[hi]) return hi;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (arr[mid] < T) lo = mid; else hi = mid; }
    return (T - arr[lo] < arr[hi] - T) ? lo : hi;
  }
  // Index der Vergleichsrunde zur selben Zeit (Geister-Auto) – ohne Zeitdaten: gleiche Stelle
  function bIdx(i) { const d = VG.d; return (d && d.t && d.tb && i >= 0) ? idxAtTime(d.tb, d.t[i]) : i; }

  function chScale(c) {
    if (c.min != null && c.max != null) return [c.min, c.max];
    let lo = Infinity, hi = -Infinity;
    const scan = a => { if (!a) return; for (let i = 0; i < a.length; i++) { const v = a[i]; if (v == null || !isFinite(v)) continue; if (v < lo) lo = v; if (v > hi) hi = v; } };
    scan(c.a); scan(c.b);
    if (!isFinite(lo)) return [0, 1];
    if (c.sym) { const m = Math.max(Math.abs(lo), Math.abs(hi), c.key === "linie" ? 0.3 : 1); return [-m, m]; }
    if (c.key === "gang") return [Math.min(0, lo), Math.max(hi, 1) + 0.6];
    if (c.key === "delta") { const p = Math.max((hi - lo) * 0.12, 0.02); return [lo - p, hi + p]; }
    if (lo === hi) hi = lo + 1;
    const p = (hi - lo) * 0.06; return [lo - p, hi + p];
  }

  function vgChannels(d, single) {
    const K = d.kanaele || {}, ch = [];
    const add = (k, label, unit, dec, extra) => {
      if (!K[k]) return;
      const a = single ? K[k] : K[k][0], b = single ? null : K[k][1];
      if (!a) return;
      ch.push(Object.assign({ key: k, label, unit, a, b, dec }, extra || {}));
    };
    if (!single && d.delta) ch.push({ key: "delta", label: "DELTA", unit: " s", a: d.delta, b: null, dec: 2 });
    add("gas", "GAS", " %", 0, { min: 0, max: 100 });
    add("bremse", "BREMSE", " %", 0, { min: 0, max: 100 });
    add("speed", "SPEED", " km/h", 0);
    add("lenkung", "LENKUNG", "°", 0, { sym: true });
    add("gang", "GANG", "", 0, { step: true });
    add("rpm", "DREHZAHL", "", 0);
    if (!single && d.linie) ch.push({ key: "linie", label: "LINIE (m links/rechts)", unit: " m", a: d.linie, b: null, dec: 1, sym: true });
    ch.forEach(c => { c.rng = chScale(c); });
    return ch;
  }

  /* ---- Anzeigen an/aus (gemerkt) + Brems-/Scheitel-/Gaspunkte ---- */
  const ANZ_KEY = "kt-vg-anzeige";
  const ANZ_MARKER = [["brems", "Bremspunkte", "#ff4b4b", "ib"], ["vmin", "Scheitel (Vmin)", "#ffd23f", "iv"], ["gas", "Gaspunkte", "#2fe39b", "ig"]];
  const ANZ_KANAL = { delta: "Delta", gas: "Gas", bremse: "Bremse", speed: "Speed", lenkung: "Lenkung", gang: "Gang", rpm: "Drehzahl", linie: "Linie" };
  VG.anz = (() => { try { return JSON.parse(localStorage.getItem(ANZ_KEY) || "{}") || {}; } catch (e) { return {}; } })();
  const anzAn = k => VG.anz[k] !== false;
  function anzSpeichern() { try { localStorage.setItem(ANZ_KEY, JSON.stringify(VG.anz)); } catch (e) { /* egal */ } }
  function vgKanaeleAnwenden() { VG.channels = (VG.channelsAll || []).filter(c => anzAn("ch_" + c.key)); }

  function idxAtM(m) {
    const a = VG.d.m; if (m == null || !a.length) return -1;
    let lo = 0, hi = a.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < m) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function vgKurvenBereich(idx) {
    const d = VG.d, n = d.m.length - 1, k = d.kurven[idx];
    let lo, hi;
    if (VG.single) { const L = d.laenge || 1; lo = (k.bremse_m - 120) / L; hi = (k.gas_m + 120) / L; } else { lo = k.lo; hi = k.hi; }
    return [Math.max(0, Math.round(lo * n)), Math.min(n, Math.round(hi * n))];
  }
  // Bremspunkt = erstes Bremsen im Abschnitt, Scheitel = langsamste Stelle danach, Gaspunkt = erstes Gas (> 55 %) nach dem Scheitel
  function vgPunkte(sp, br, gas, i0, i1) {
    let ib = -1, iv = -1, ig = -1, vmin = Infinity;
    if (br) for (let i = i0; i <= i1; i++) { const b = br[i]; if (b != null && b > 8) { ib = i; break; } }
    if (sp) for (let i = ib >= 0 ? ib : i0; i <= i1; i++) { const v = sp[i]; if (v != null && v < vmin) { vmin = v; iv = i; } }
    if (gas && iv >= 0) for (let i = iv; i <= i1; i++) { const g = gas[i]; if (g != null && g > 55) { ig = i; break; } }
    return { ib, iv, ig };
  }
  function vgMarkerBerechnen() {
    const d = VG.d, K = d.kanaele || {};
    const ka = c => K[c] ? (VG.single ? K[c] : K[c][0]) : null, kb = c => (!VG.single && K[c]) ? K[c][1] : null;
    VG.marker = (d.kurven || []).map((k, idx) => {
      const [i0, i1] = vgKurvenBereich(idx);
      if (i1 - i0 < 4) return null;
      let a = vgPunkte(ka("speed"), ka("bremse"), ka("gas"), i0, i1);
      if (VG.single) {   // Einzelrunde: Brems-/Gaspunkt genau wie in der Tabelle (vom Helfer gemessen)
        const ib = idxAtM(k.bremse_m), ig = idxAtM(k.gas_m), sp = ka("speed");
        let iv = -1, vmin = Infinity;
        if (sp && ib >= 0 && ig >= ib) for (let i = ib; i <= ig; i++) { const v = sp[i]; if (v != null && v < vmin) { vmin = v; iv = i; } }
        a = { ib, iv: iv >= 0 ? iv : a.iv, ig };
      }
      const b = VG.single ? null : vgPunkte(kb("speed"), kb("bremse"), kb("gas"), i0, i1);
      return { a, b, ik: idxAtM(k.m) };
    });
  }
  function renderAnz() {
    const el = document.getElementById("gf-anz"); if (!el) return;
    const chip = (k, t, col) => `<button type="button" class="gf-chip${anzAn(k) ? " on" : ""}" data-anz="${k}" style="--c:${col}"><i></i>${C.esc(t)}</button>`;
    el.innerHTML = `<div class="gf-anz-h">Auf der Karte</div><div class="gf-anz-r">${ANZ_MARKER.map(([k, t, col]) => chip(k, t, col)).join("")}${chip("kurven", VG.single ? "Kurven-Nr. + Vmin" : "Kurven-Nr. + Zeit", "#e9ecf2")}</div>
      <div class="gf-anz-h">Kanäle</div><div class="gf-anz-r">${(VG.channelsAll || []).map(c => chip("ch_" + c.key, ANZ_KANAL[c.key] || c.label, CH_COL[c.key] || "#e9ecf2")).join("")}</div>`;
    el.querySelectorAll("[data-anz]").forEach(b => b.onclick = () => {
      VG.anz[b.dataset.anz] = !anzAn(b.dataset.anz); anzSpeichern();
      vgKanaeleAnwenden(); renderAnz(); vgLegend(); drawAll();
    });
  }

  /* ---- Ansicht aufbauen ---- */
  /* ---- Unter dem Vergleich: wo verlierst du, wo gewinnst du (Kurven und Geraden dazwischen) ---- */
  function vgAbschnitte() {
    const d = VG.d, n = d.m.length - 1, dl = d.delta, L = d.laenge || 1;
    if (!dl || !d.kurven) return [];
    const zeitBei = f => dl[Math.max(0, Math.min(n, Math.round(f * n)))] || 0;
    const out = [];
    const stueck = (lo, hi, art, k, ki, vor) => {
      if (hi - lo < 0.002) return;
      out.push({ lo, hi, art, k, ki, vor, dt: zeitBei(hi) - zeitBei(lo), von: Math.round(lo * L), bis: Math.round(hi * L) });
    };
    let ende = 0;
    d.kurven.forEach((k, i) => {
      if (k.lo > ende) stueck(ende, k.lo, "gerade", null, -1, d.kurven[i - 1] || null);
      stueck(k.lo, k.hi, "kurve", k, i, null);
      ende = Math.max(ende, k.hi);
    });
    if (ende < 1) stueck(ende, 1, "gerade", null, -1, d.kurven[d.kurven.length - 1] || null);
    return out;
  }
  function vgAbschnittName(s) {
    if (s.art === "kurve") return "Kurve " + s.k.nr;
    if (!s.vor) return "Start bis Kurve " + ((VG.d.kurven[0] || {}).nr || 1);
    return "Gerade nach Kurve " + s.vor.nr;
  }
  function vgAbschnittGrund(s) {
    if (s.art === "kurve") {
      const k = s.k, werte = [k.vmin && k.vmin[0] != null && k.vmin[1] != null ? `Vmin ${k.vmin[0]} statt ${k.vmin[1]} km/h` : "", k.vaus ? `Ausgang ${k.vaus[0]} statt ${k.vaus[1]} km/h` : ""].filter(Boolean).join(" · ");
      return s.dt < 0 || !k.tipp || k.tipp === "passt" ? (s.dt < 0 ? "Schneller als der Vergleich" : "") + (werte ? (s.dt < 0 ? ": " : "") + werte : "") : k.tipp;
    }
    const v = s.vor && s.vor.vaus;
    if (v && v[0] != null && v[1] != null && Math.abs(v[0] - v[1]) >= 2)
      return `Ausgang aus Kurve ${s.vor.nr}: ${v[0]} statt ${v[1]} km/h, das zieht sich über die ganze Gerade`;
    return s.dt > 0 ? "Auf der Geraden langsamer (Ausgang, Schaltpunkte oder Windschatten)" : "Auf der Geraden schneller";
  }
  function vgVerlustGewinn() {
    const box = document.getElementById("gf-vg");
    if (!box || VG.single) return;
    const ab = vgAbschnitte();
    if (!ab.length) { box.innerHTML = ""; return; }
    const sek = v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(3).replace(".", ",") + " s";
    const verl = ab.filter(s => s.dt > 0.005).sort((a, b) => b.dt - a.dt);
    const gew = ab.filter(s => s.dt < -0.005).sort((a, b) => a.dt - b.dt);
    const sumV = verl.reduce((x, s) => x + s.dt, 0), sumG = gew.reduce((x, s) => x + s.dt, 0);
    const maxAbs = Math.max(0.001, ...ab.map(s => Math.abs(s.dt)));
    const groesster = verl[0] || null;
    const ges = VG.d.gesamt;
    const block = s => {
      const i = ab.indexOf(s), st = Math.min(1, Math.abs(s.dt) / maxAbs);
      const kl = s.dt > 0.005 ? "verlust" : s.dt < -0.005 ? "gewinn" : "gleich";
      return `<button type="button" class="gf-vg-b ${kl}${s === groesster ? " max" : ""}${s.art === "gerade" ? " ger" : ""}" data-vg="${i}"
        style="left:${(s.lo * 100).toFixed(2)}%;width:${((s.hi - s.lo) * 100).toFixed(2)}%;--s:${st.toFixed(2)}"
        title="${C.esc(vgAbschnittName(s))}: ${sek(s.dt)}"><span>${s.art === "kurve" ? "K" + s.k.nr : ""}</span></button>`;
    };
    const zeile = (s, max) => {
      const i = ab.indexOf(s);
      return `<button type="button" class="gf-vg-z${s === groesster ? " max" : ""}" data-vg="${i}">
        <span class="gf-vg-n">${C.esc(vgAbschnittName(s))}<small>${s.von} bis ${s.bis} m</small></span>
        <span class="gf-vg-bar"><i class="${s.dt > 0 ? "verlust" : "gewinn"}" style="width:${Math.max(4, Math.abs(s.dt) / max * 100).toFixed(0)}%"></i></span>
        <b class="${s.dt > 0 ? "gf-rot" : "gf-gruen"}">${sek(s.dt)}</b>
        <em>${C.esc(vgAbschnittGrund(s))}</em></button>`;
    };
    const L = VG.d.laenge || 1;
    let ticks = "";
    const schritt = L > 6000 ? 1000 : L > 3000 ? 500 : 250;
    for (let m = schritt; m < L; m += schritt) ticks += `<span style="left:${(m / L * 100).toFixed(2)}%">${m >= 1000 ? (m / 1000).toString().replace(".", ",") + " km" : m + " m"}</span>`;
    box.innerHTML = `
      <div class="gf-vg-kopf">
        <b>Wo verlierst du, wo gewinnst du</b>
        <span>Gesamt <b class="${ges > 0 ? "gf-rot" : ges < 0 ? "gf-gruen" : ""}">${sek(ges || 0)}</b> · verloren <b class="gf-rot">${sek(sumV)}</b> in ${verl.length} Abschnitten · gewonnen <b class="gf-gruen">${sek(sumG)}</b> in ${gew.length}</span>
      </div>
      ${groesster ? `<div class="gf-vg-top" data-vg="${ab.indexOf(groesster)}">
        <span class="gf-vg-tag">Größter Verlust</span>
        <div class="gf-vg-top-in"><b>${C.esc(vgAbschnittName(groesster))}</b><em class="gf-rot">${sek(groesster.dt)}</em>
          <span>${Math.round(groesster.dt / Math.max(sumV, 0.001) * 100)} % von allem, was du verlierst</span></div>
        <p>${C.esc(vgAbschnittGrund(groesster))}</p>
        ${groesster.art === "kurve" ? `<small>Bremspunkt ${groesster.k.bremse_m == null ? "?" : fmtSign(groesster.k.bremse_m, 0) + " m"} · Gaspunkt ${groesster.k.gas_m == null ? "?" : fmtSign(groesster.k.gas_m, 0) + " m"} · Vmin ${groesster.k.vmin[0] ?? "?"} statt ${groesster.k.vmin[1] ?? "?"} km/h · Ausgang ${groesster.k.vaus[0]} statt ${groesster.k.vaus[1]} km/h</small>` : ""}
        <button type="button" class="gf-vg-hin">Auf Karte und Kanälen ansehen</button>
      </div>` : `<div class="gf-vg-top gut"><span class="gf-vg-tag">Kein Verlust</span><p>Du bist überall mindestens so schnell wie der Vergleich.</p></div>`}
      <div class="gf-vg-band">${ab.map(block).join("")}</div>
      <div class="gf-vg-achse">${ticks}</div>
      <div class="gf-vg-listen">
        <div><h6>Verluste <small>größte zuerst</small></h6>${verl.length ? verl.slice(0, 8).map(s => zeile(s, verl[0].dt)).join("") : '<p class="gf-note">Nirgends langsamer.</p>'}</div>
        <div><h6>Gewinne <small>größte zuerst</small></h6>${gew.length ? gew.slice(0, 8).map(s => zeile(s, -gew[0].dt)).join("") : '<p class="gf-note">Noch nirgends schneller.</p>'}</div>
      </div>
      <p class="gf-note">Rot = hier verlierst du Zeit, grün = hier gewinnst du, je kräftiger desto mehr. Anklicken: Abschnitt auf Karte und Kanälen ansehen.</p>`;
    box.querySelectorAll("[data-vg]").forEach(el => el.onclick = () => vgAbschnittZeigen(ab[Number(el.dataset.vg)]));
  }
  // Abschnitt auf Karte und in den Kanälen zeigen (Kurve = Segment, Gerade = Ausschnitt)
  function vgAbschnittZeigen(s) {
    if (!s) return;
    if (s.art === "kurve" && VG.segMode === "kurven") vgApplySeg(s.ki);
    else {
      const n = VG.d.m.length - 1;
      vgPush(); VG.frei = false; VG.seg = -2;
      VG.i0 = Math.max(0, Math.round(s.lo * n)); VG.i1 = Math.min(n, Math.round(s.hi * n));
      VG.cur = VG.i0;
      vgSegUpdate(); vgInfo(VG.cur); vgScrubSync(); vgUndoState(); drawAll();
    }
    const gf = document.querySelector("#kv-view .gf");
    if (gf) gf.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function zeigeAnalyse(d, single) {
    const n = d.m.length - 1, K = d.kanaele || {};
    const A = k => K[k] ? (single ? K[k] : K[k][0]) : null, Bk = k => (!single && K[k]) ? K[k][1] : null;
    Object.assign(VG, { d, single, channelsAll: vgChannels(d, single), i0: 0, i1: n, cur: -1, seg: -1, segMode: "kurven",
      playing: false, frei: false, camC: null, verlauf: [], showA: true, showB: !single, color: "pedale", ansicht: "tele",
      speedArr: A("speed"), gasArr: A("gas"), bremseArr: A("bremse"), gasArrB: Bk("gas"), bremseArrB: Bk("bremse"),
      deltaArr: single ? null : d.delta });
    if (VG.xmode === "zeit" && !d.t) VG.xmode = "dist";
    const sp = (VG.speedArr || [0, 1]).filter(v => v != null);
    VG.spMinMax = [Math.min.apply(null, sp), Math.max.apply(null, sp)];
    const k = d.karte;
    if (single) { VG.mapMine = k ? { x: k.x, y: k.y } : null; VG.mapRef = null; }
    else { VG.mapMine = (k && k.xa) ? { x: k.xa, y: k.ya } : null; VG.mapRef = k ? { x: k.x, y: k.y } : null; }
    vgKanaeleAnwenden(); vgMarkerBerechnen();
    const geo = VG.mapRef || VG.mapMine; VG.geoMitte = null;
    if (geo) { let sx = 0, sy = 0, c = 0; for (let i = 0; i < geo.x.length; i += 5) if (geo.x[i] != null) { sx += geo.x[i]; sy += geo.y[i]; c++; } if (c) VG.geoMitte = { x: sx / c, y: sy / c }; }

    const ia = d.a, ib = d.b || {};
    const auto = ia.auto && ia.auto !== "?" ? ia.auto : "Runde";
    const strecke = ia.strecke && ia.strecke !== "?" ? ia.strecke : "";
    const langsamer = !single && d.gesamt != null ? (d.gesamt > 0 ? "a" : d.gesamt < 0 ? "b" : "") : "";
    const nameA = ia.fahrer || "Meine Runde", nameB = ib.fahrer || "Vergleich";
    const lapCard = (w, info, name) => `
      <div class="gf-lap gf-lap-${w}${single ? "" : " gf-tog"}" data-lap="${single ? "" : w}" title="${single ? "" : (w === "a" ? "Meine Runde ein/aus" : "Vergleich ein/aus")}">
        <div class="gf-lap-ico">${ICON.rad}</div>
        <div class="gf-lap-in">
          <div class="gf-lap-r1"><b class="gf-lap-name">${C.esc(name)}</b>
            <span class="gf-lap-time${langsamer === w ? " gf-rot" : ""}">${ICON.uhr}${C.esc(info.zeit || "–")}</span></div>
          <div class="gf-lap-r2">
            <em id="gf-${w}-gasv">0%</em><span class="gf-bar"><i class="gf-g" id="gf-${w}-gas"></i></span>
            <em id="gf-${w}-brv">0%</em><span class="gf-bar"><i class="gf-r" id="gf-${w}-br"></i></span>
            <b id="gf-${w}-sp">–</b><small>km/h</small>
            <span class="gf-ic">${ICON.gang}<b id="gf-${w}-gg">–</b></span>
            <span class="gf-ic">RPM <b id="gf-${w}-rpm">–</b></span>
          </div>
        </div>
      </div>`;

    let hint = "";
    const q = k && (k.linie_quelle || k.quelle);
    if (!k) hint = "Keine Streckenkarte – die Linie gibt es für GPS-Runden (Garage 61) und eigene Mitschnitte ab v2.2.";
    else if (!single && !k.xa) hint = "Für deine Runde fehlt die Linie (älterer Mitschnitt) – gezeigt wird die Vergleichslinie.";
    else if (q === "berechnet") hint = "Linie aus Fahrtrichtung und Tempo zurückgerechnet – auf Meter genau, nicht auf Zentimeter.";

    const L = d.laenge || 1;
    const krowV = (kk, i) => `<tr data-idx="${i}">
        <td><b>K${kk.nr}</b><small>${kk.m} m</small></td>
        <td class="${deltaCls(kk.dt)}">${fmtSign(kk.dt, 3)}</td>
        <td>${kk.bremse_m == null ? "–" : fmtSign(kk.bremse_m, 0) + " m"}</td>
        <td>${kk.gas_m == null ? "–" : fmtSign(kk.gas_m, 0) + " m"}</td>
        <td>${kk.vmin[0] == null ? "–" : kk.vmin[0]}<small>/${kk.vmin[1] == null ? "–" : kk.vmin[1]}</small></td>
        <td>${kk.vaus[0]}<small>/${kk.vaus[1]}</small></td>
        <td class="kv-tip">${C.esc(kk.tipp)}</td></tr>`;
    const krowE = (kk, i) => `<tr data-idx="${i}">
        <td><b>K${kk.nr}</b><small>${kk.m} m</small></td>
        <td>${kk.bremse_m} m</td><td>${kk.gas_m} m</td>
        <td>${kk.v_ein} km/h</td><td><b>${kk.vmin}</b> km/h</td><td>${kk.gang}</td></tr>`;
    const kurvenHTML = single
      ? `<table class="kv-tab gf-tab"><thead><tr><th>Kurve</th><th>Bremspunkt</th><th>Gaspunkt</th><th>V-Eingang</th><th>Vmin</th><th>Gang</th></tr></thead>
          <tbody>${d.kurven.map(krowE).join("")}</tbody></table>
          <p class="gf-note">Bremspunkt/Gaspunkt in Metern ab Start/Ziel. Zeile anklicken: Kurve in Karte und Kanälen ansehen.</p>`
      : `${d.top && d.top.length ? `<div class="gf-top3">${d.top.map((t, i) => `<div class="gf-t3"><span class="gf-t3-nr">${i + 1}</span><div><b>Kurve ${t.nr} <em class="${deltaCls(t.dt)}">${fmtSign(t.dt, 3)} s</em></b><p>${C.esc(t.tipp)}</p></div></div>`).join("")}</div>` : ""}
          <table class="kv-tab gf-tab"><thead><tr><th>Kurve</th><th>dt</th><th>Bremspunkt</th><th>Gaspunkt</th><th>Vmin A/B</th><th>V-Aus A/B</th><th>Tipp</th></tr></thead>
          <tbody>${d.kurven.map(krowV).join("")}</tbody></table>
          <p class="gf-note">Minus = du früher als der Vergleich. Zeile anklicken: Kurve in Karte und Kanälen ansehen.</p>`;

    document.getElementById("kv-view").innerHTML = `
      <div class="gf">
        <div class="gf-top">
          <div class="gf-car"><div class="gf-car-logo">${ICON.auto}</div>
            <div><div class="gf-car-t">${C.esc(auto)}</div>
            <div class="gf-car-s">${C.esc(strecke)}${strecke ? " · " : ""}${fmtKm(L)} · ${d.kurven.length} Kurven</div></div></div>
          ${single ? "" : `<div class="gf-sicht" title="Welche Runde zeigen"><button type="button" data-sicht="beide" class="on">Beide</button><button type="button" data-sicht="a">Nur meine</button><button type="button" data-sicht="b">Nur Vergleich</button></div>`}
          <div class="gf-laps">${lapCard("a", ia, nameA)}${single ? "" : lapCard("b", ib, nameB)}</div>
        </div>
        <div class="gf-body">
          <div class="gf-mapcol" id="gf-mapcol">
            <canvas id="kv-map"></canvas>
            <div class="gf-segtabs"><button type="button" data-segmode="kurven" class="on">Segmente</button><button type="button" data-segmode="sektoren">Sektoren</button></div>
            ${hint ? `<div class="gf-maphint">${C.esc(hint)}</div>` : ""}
            <div class="gf-tools">
              <button type="button" data-col="pedale" class="on" title="Linie nach Gas / Bremse färben">${ICON.pedale}</button>
              <button type="button" data-col="speed" title="Linie nach Tempo färben">${ICON.speed}</button>
              ${single ? "" : `<button type="button" data-col="delta" title="Linie nach Zeitgewinn/-verlust färben">${ICON.delta}</button>`}
              <button type="button" data-tool="folgen" title="Kamera folgt dem Auto">${ICON.folgen}</button>
            </div>
            <div class="gf-legend" id="gf-legend"></div>
            <div class="gf-segcard">
              <div class="gf-segnav"><button type="button" id="kv-seg-prev" title="voriger Abschnitt">‹</button><b id="kv-seg-label">Ganze Runde</b><button type="button" id="kv-seg-next" title="nächster Abschnitt">›</button></div>
              <button type="button" class="gf-seg-x" id="gf-seg-x" title="Auswahl aufheben, zurück zur ganzen Runde" hidden>✕ Auswahl aufheben</button>
              <div class="gf-segrow gf-a"><span>${C.esc(nameA)}</span><b id="gf-seg-a">–</b></div>
              ${single ? "" : `<div class="gf-segrow gf-b"><span>${C.esc(nameB)}</span><b id="gf-seg-b">–</b></div>`}
            </div>
            <div class="gf-mini"><canvas id="gf-mini"></canvas>
              <div class="gf-zoom"><button type="button" id="gf-zm">−</button><input type="range" id="gf-zoom" min="0" max="100" step="1" value="70" title="Zoom der Karte"><button type="button" id="gf-zp">+</button></div>
            </div>
          </div>
          <div class="gf-tele">
            <div class="gf-tabs"><button type="button" data-ansicht="tele" class="on">Telemetrie</button><button type="button" data-ansicht="kurven">Kurven</button>
              <button type="button" class="gf-zahn" id="gf-undo" title="Rückgängig (Esc oder Rechtsklick)" disabled>↶</button>
              <button type="button" class="gf-zahn" id="gf-anz-btn" title="Anzeige: Marker und Kanäle ein/aus">⚙</button></div>
            <div class="gf-anz" id="gf-anz" hidden></div>
            <div class="gf-tele-in" id="gf-tele-in"><canvas id="kv-charts"></canvas></div>
            <div class="gf-kurven" id="gf-kurven" hidden>${kurvenHTML}</div>
            <div class="gf-timeline"><input type="range" id="kv-scrub" min="0" max="1000" value="0"></div>
            <div class="gf-ctrl">
              <button type="button" class="gf-play" id="kv-play-btn" title="Abspielen">▶</button>
              <b class="gf-time" id="gf-time">00:00.000</b>
              <button type="button" class="gf-reset" id="gf-reset" title="Zurück zur ganzen Runde">↺</button>
              <span class="gf-sp"></span>
              ${single ? `<span class="gf-dl">Position</span>` : `<span class="gf-dl">Delta: <b id="gf-delta">+00.000</b></span>`}
              <span class="gf-gapw">↔ <b id="gf-gap">0 m</b></span>
              <span class="gf-sp"></span>
              <label class="gf-switch" title="Autos auf der Karte zeigen">${ICON.auto}<input type="checkbox" id="gf-autos" checked><i></i></label>
              <div class="gf-xmode"><button type="button" data-x="zeit"${d.t ? "" : " disabled title=\"Zeitachse braucht Helfer ab v2.4\""}>Zeit</button><button type="button" data-x="dist">Distanz</button></div>
            </div>
          </div>
        </div>
      </div>${single ? "" : '<div class="gf-vg" id="gf-vg"></div>'}`;

    wireAnalyse();
    renderAnz();
    vgLegend();
    vgSegUpdate();
    vgInfo(-1);
    drawAll();
    vgVerlustGewinn();
  }

  /* ---- Zeichnen: Grundlagen ---- */
  function prep(cv, W, H) {
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
  }
  function mix(h1, h2, t) {
    const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const a = p(h1), b = p(h2); t = Math.max(0, Math.min(1, t));
    return "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",") + ")";
  }
  function hexA(h, a) { return "rgba(" + parseInt(h.slice(1, 3), 16) + "," + parseInt(h.slice(3, 5), 16) + "," + parseInt(h.slice(5, 7), 16) + "," + a + ")"; }
  function rrect(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

  // Bremsdruck in 8 Stufen (0 = nicht gebremst)
  function bremsStufe(br) { return (br == null || !isFinite(br) || br <= 3) ? 0 : Math.min(8, Math.ceil(br / 12.5)); }
  // Farbe der Linie auf der Karte (fuerB = Vergleichsrunde)
  function segColor(i, fuerB) {
    if (VG.color === "pedale") {
      const ab = fuerB ? VG.bremseArrB : VG.bremseArr, ag = fuerB ? VG.gasArrB : VG.gasArr;
      const s = bremsStufe(ab ? ab[i] : null), g = ag ? ag[i] : null;
      if (s) return mix("#ffc2b8", "#ff1530", s / 8);                                    // Bremse: blass = leicht, kräftig = stark
      if (g != null && g > 55) return "#2fe39b";                                         // Gas
      if (g != null && g > 8) return mix("#f1e6ea", "#2fe39b", Math.round(g / 55 * 4) / 4); // Teilgas
      return fuerB ? "rgba(242,244,248,.9)" : "#f1e6ea";                                 // rollen
    }
    if (VG.color === "delta" && VG.deltaArr) {          // wo Zeit verloren (rot) / gewonnen (grün) wird
      const D = VG.deltaArr, w = 4, a = D[Math.max(0, i - w)], b = D[Math.min(D.length - 1, i + w)];
      if (a == null || b == null) return "#8a90a0";
      const q = Math.round(Math.max(-1, Math.min(1, (b - a) / 0.015)) * 8) / 8;
      return q >= 0 ? mix("#d5d8e0", "#ff4b4b", q) : mix("#d5d8e0", "#2fe39b", -q);
    }
    const v = VG.speedArr ? VG.speedArr[i] : null;
    if (v == null) return "#8a90a0";
    const [lo, hi] = VG.spMinMax;
    return mix("#3b6cff", "#ffb020", Math.round(((v - lo) / Math.max(hi - lo, 1)) * 16) / 16);
  }

  function vgLegend() {
    const el = document.getElementById("gf-legend"); if (!el) return;
    const sw = (f, t) => `<span><i style="background:${f}"></i>${t}</span>`;
    el.innerHTML = VG.color === "pedale" ? sw("#2fe39b", "Gas") + sw("linear-gradient(90deg,#f1e6ea,#2fe39b)", "Teilgas") + sw("linear-gradient(90deg,#ffc2b8,#ff1530)", "Bremse leicht → stark (dicker = härter)") + sw("#f1e6ea", "rollen")
      : VG.color === "delta" ? sw("#2fe39b", "Zeit gewonnen") + sw("#ff4b4b", "Zeit verloren")
      : sw("#3b6cff", "langsam") + sw("#ffb020", "schnell");
    if (!VG.single) el.innerHTML += `<span class="gf-leg-b"><i></i>Vergleich</span>`;
    const sym = { brems: "■", vmin: "●", gas: "▲" };
    const mk = ANZ_MARKER.filter(([k]) => anzAn(k));
    if (mk.length) el.innerHTML += `<span class="gf-leg-mk">${mk.map(([k, t, col]) => `<b style="color:${col}">${sym[k]}</b>${C.esc(t.replace(" (Vmin)", ""))}`).join(" ")}${VG.single ? "" : " · gefüllt = du, hohl = Vergleich"}</span>`;
  }

  /* ---- Karte (Folge-Kamera wie GO FAST) ---- */
  function drawMap() {
    const cv = document.getElementById("kv-map"); if (!cv || !VG.d) return;
    const box = cv.parentElement, W = Math.max(box.clientWidth, 200), H = Math.max(box.clientHeight, 300);
    const ctx = prep(cv, W, H); ctx.clearRect(0, 0, W, H);
    const mine = VG.mapMine, ref = VG.mapRef, geo = ref || mine;
    const leer = (t) => { VG.mapGeom = null; ctx.fillStyle = GF.txt; ctx.textAlign = "center"; ctx.font = "600 14px " + FONT; ctx.fillText(t, W / 2, H / 2); };
    if (!geo) return leer("Keine Streckenkarte für diese Runde");
    const gx = geo.x, gy = geo.y, n = gx.length - 1;
    const lineA = mine || geo;
    // Ausschnitt: ganze Runde, Segment oder gezoomter Bereich der Kanäle
    let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity;
    for (let i = VG.i0; i <= VG.i1; i++) { const x = gx[i], y = gy[i]; if (x == null || y == null) continue; if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > e) e = y; }
    if (!isFinite(a)) return leer("Keine Streckenkarte verfügbar");
    const pos = VG.cur >= 0 ? VG.cur : VG.i0;
    let sc, cx, cy;
    if (VG.frei && VG.camC) {
      // frei mit der Maus verschoben
      sc = Math.min(W, H) / VG.zoomM; cx = VG.camC.x; cy = VG.camC.y;
    } else if (VG.folgen && lineA.x[pos] != null) {
      // Folge-Kamera wie GO FAST: Ausschnitt von zoomM Metern rund ums Auto
      sc = Math.min(W, H) / VG.zoomM; cx = lineA.x[pos]; cy = lineA.y[pos];
    } else {
      const pad = 54;
      sc = Math.min((W - 2 * pad) / Math.max(b - a, 40), (H - 2 * pad) / Math.max(e - c, 40));
      cx = (a + b) / 2; cy = (c + e) / 2;
    }
    const PX = x => W / 2 + (x - cx) * sc, PY = y => H / 2 - (y - cy) * sc;
    VG.mapGeom = { PX, PY, mx: lineA.x, my: lineA.y };
    VG.view = { cx, cy, hw: W / 2 / sc, hh: H / 2 / sc, sc, W, H };

    // Asphalt-Band (ca. 14 m breit, wächst mit dem Zoom)
    const band = Math.max(11, Math.min(900, 14 * sc)), rand = band + 60;
    // Pfad zeichnen, Punkte weit außerhalb des Bildes auslassen
    const pfad = (xs, ys) => {
      ctx.beginPath(); let s = false;
      for (let i = 0; i <= n; i++) {
        const x = xs[i], y = ys[i]; if (x == null || y == null) { s = false; continue; }
        const px = PX(x), py = PY(y);
        if (px < -rand || px > W + rand || py < -rand || py > H + rand) { if (s) ctx.lineTo(px, py); s = false; continue; }
        if (!s) { ctx.moveTo(px, py); s = true; } else ctx.lineTo(px, py);
      }
    };
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    pfad(gx, gy); ctx.lineWidth = band; ctx.strokeStyle = "rgba(150,156,168,.17)"; ctx.stroke();
    // Linie stückweise zeichnen (gleiche Farbe/Breite am Stück, außerhalb des Bildes weglassen)
    const linie = (xs, ys, farbeFn, breiteFn, glow) => {
      let farbe = null, breite = 0, offen = false;
      for (let i = 1; i <= n; i++) {
        const x0 = xs[i - 1], y0 = ys[i - 1], x1 = xs[i], y1 = ys[i];
        if (x0 == null || y0 == null || x1 == null || y1 == null) { if (offen) { ctx.stroke(); offen = false; } continue; }
        const p0x = PX(x0), p0y = PY(y0), p1x = PX(x1), p1y = PY(y1);
        if ((p0x < -30 && p1x < -30) || (p0x > W + 30 && p1x > W + 30) || (p0y < -30 && p1y < -30) || (p0y > H + 30 && p1y > H + 30)) { if (offen) { ctx.stroke(); offen = false; } continue; }
        const f = farbeFn(i), w = breiteFn(i);
        if (!offen || f !== farbe || w !== breite) {
          if (offen) ctx.stroke();
          ctx.beginPath(); ctx.strokeStyle = f; ctx.lineWidth = w;
          if (glow) { ctx.shadowColor = f; ctx.shadowBlur = 7; }
          farbe = f; breite = w; ctx.moveTo(p0x, p0y); offen = true;
        }
        ctx.lineTo(p1x, p1y);
      }
      if (offen) ctx.stroke();
      ctx.shadowBlur = 0;
    };
    const pedale = VG.color === "pedale";
    // Vergleichsrunde: gepunktet – bei Gas/Bremse mit ihren eigenen Brems-/Gasfarben
    if (ref && !VG.single && VG.showB) {
      ctx.save(); ctx.setLineDash([3, 4]);
      if (pedale) linie(ref.x, ref.y, i => segColor(i, true), i => 1.8 + bremsStufe(VG.bremseArrB ? VG.bremseArrB[i] : null) * 0.3, false);
      else { pfad(ref.x, ref.y); ctx.lineWidth = 1.7; ctx.strokeStyle = "rgba(242,244,248,.9)"; ctx.stroke(); }
      ctx.restore();
    }
    // eigene Linie, eingefärbt; bei Gas/Bremse je härter gebremst, desto dicker
    if (VG.showA) {
      const lw = Math.max(2.6, Math.min(6, 1.8 + sc * 0.3));
      linie(lineA.x, lineA.y, i => segColor(i), i => pedale ? lw * (1 + bremsStufe(VG.bremseArr ? VG.bremseArr[i] : null) / 8) : lw, true);
    }
    // Start/Ziel
    if (gx[0] != null && gx[4] != null) {
      const x = PX(gx[0]), y = PY(gy[0]), w = Math.atan2(PY(gy[4]) - y, PX(gx[4]) - x) + Math.PI / 2, L2 = band / 2 + 3;
      ctx.save(); ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.strokeStyle = "#fff"; ctx.beginPath();
      ctx.moveTo(x - Math.cos(w) * L2, y - Math.sin(w) * L2); ctx.lineTo(x + Math.cos(w) * L2, y + Math.sin(w) * L2); ctx.stroke(); ctx.restore();
    }
    // Segmentgrenzen
    if (VG.seg !== -1) { ctx.fillStyle = "#ff9f2e"; [VG.i0, VG.i1].forEach(i => { if (lineA.x[i] != null) dot(ctx, PX(lineA.x[i]), PY(lineA.y[i]), 4.2); }); }
    // Brems-/Scheitel-/Gaspunkte: gefüllt = du, hohl = Vergleich
    if (VG.marker) {
      const r = Math.max(4, Math.min(9, 2.5 + sc * 0.35));
      const form = (art, x, y, voll, col) => {
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
        ctx.beginPath();
        if (art === "brems") ctx.rect(x - r, y - r, 2 * r, 2 * r);
        else if (art === "gas") { ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.1, y + r * 0.9); ctx.lineTo(x - r * 1.1, y + r * 0.9); ctx.closePath(); }
        else ctx.arc(x, y, r, 0, 7);
        if (voll) { ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(0,0,0,.65)"; ctx.stroke(); }
        else { ctx.lineWidth = 1.8; ctx.strokeStyle = col; ctx.stroke(); }
      };
      const arten = ANZ_MARKER.filter(([k]) => anzAn(k));
      VG.marker.forEach(mk => {
        if (!mk) return;
        arten.forEach(([k, , col, feld]) => {
          if (mk.b && ref && !VG.single && VG.showB) { const i = mk.b[feld]; if (i >= 0 && ref.x[i] != null) form(k, PX(ref.x[i]), PY(ref.y[i]), false, col); }
          if (VG.showA) { const i = mk.a[feld]; if (i >= 0 && lineA.x[i] != null) form(k, PX(lineA.x[i]), PY(lineA.y[i]), true, col); }
        });
      });
    }
    // Kurven-Schilder (K3 +0.12) neben der Strecke, nach außen versetzt; anklickbar
    VG.mapLabels = [];
    if (VG.marker && anzAn("kurven")) {
      const ks = VG.d.kurven || [], gm = VG.geoMitte || { x: cx, y: cy }, mxp = PX(gm.x), myp = PY(gm.y);
      const fs = Math.round(Math.max(10.5, Math.min(13, 9.5 + sc * 0.25)));
      ctx.font = `700 ${fs}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const h = fs + 9;
      ks.forEach((kk, idx) => {
        const mk = VG.marker[idx], i = mk ? mk.ik : idxAtM(kk.m);
        if (i < 0 || lineA.x[i] == null) return;
        const j0 = Math.max(0, i - 4), j1 = Math.min(n, i + 4); if (lineA.x[j0] == null || lineA.x[j1] == null) return;
        const px = PX(lineA.x[i]), py = PY(lineA.y[i]);
        if (px < -60 || px > W + 60 || py < -60 || py > H + 60) return;
        let tx = PX(lineA.x[j1]) - PX(lineA.x[j0]), ty = PY(lineA.y[j1]) - PY(lineA.y[j0]); const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        let nx = -ty, ny = tx; if (nx * (px - mxp) + ny * (py - myp) < 0) { nx = -nx; ny = -ny; }
        const txt = VG.single ? `K${kk.nr} · ${kk.vmin}` : `K${kk.nr} ${fmtSign(kk.dt, 2)}`;
        const w = ctx.measureText(txt).width + 16;
        let ok = null;
        for (const sgn of [1, -1]) {
          const dist = Math.min(band / 2, 70) + 12 + Math.abs(nx) * w / 2 + Math.abs(ny) * h / 2;
          const bx = Math.max(4, Math.min(W - w - 4, px + sgn * nx * dist - w / 2)), by = Math.max(4, Math.min(H - h - 4, py + sgn * ny * dist - h / 2));
          if (!VG.mapLabels.some(q => bx < q.x + q.w + 3 && bx + w + 3 > q.x && by < q.y + q.h + 3 && by + h + 3 > q.y)) { ok = { x: bx, y: by }; break; }
        }
        if (!ok) return;
        VG.mapLabels.push({ x: ok.x, y: ok.y, w, h, idx });
        rrect(ctx, ok.x, ok.y, w, h, h / 2); ctx.fillStyle = "rgba(11,12,15,.9)"; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = (!VG.single && kk.dt > 0.02) ? "rgba(255,75,75,.75)" : (!VG.single && kk.dt < -0.02) ? "rgba(47,227,155,.75)" : "rgba(255,255,255,.2)"; ctx.stroke();
        ctx.fillStyle = "#e9ecf2"; ctx.fillText(txt, ok.x + w / 2, ok.y + h / 2 + 0.5);
      });
      ctx.textBaseline = "alphabetic";
    }
    // Autos: Vergleich als Geister-Auto zur selben Zeit, eigenes Auto grün
    if (VG.autos) {
      const auto = (xs, ys, i, farbe) => {
        if (i < 0 || xs[i] == null) return;
        const j1 = Math.max(0, i - 3), j2 = Math.min(n, i + 3);
        if (xs[j1] == null || xs[j2] == null) return;
        const x = PX(xs[i]), y = PY(ys[i]);
        const w = Math.atan2(PY(ys[j2]) - PY(ys[j1]), PX(xs[j2]) - PX(xs[j1]));
        const len = Math.max(16, Math.min(260, 4.7 * sc)), br = len * 0.43;
        ctx.save(); ctx.translate(x, y); ctx.rotate(w);
        ctx.shadowColor = farbe; ctx.shadowBlur = 12;
        rrect(ctx, -len / 2, -br / 2, len, br, br * 0.38); ctx.fillStyle = hexA(farbe, 0.16); ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = farbe; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
        rrect(ctx, -len * 0.08, -br * 0.3, len * 0.3, br * 0.6, br * 0.16); ctx.stroke();                  // Kabine
        ctx.beginPath(); ctx.moveTo(-len * 0.44, -br * 0.52); ctx.lineTo(-len * 0.44, br * 0.52); ctx.stroke(); // Heckflügel
        ctx.beginPath(); ctx.moveTo(len * 0.47, -br * 0.18); ctx.lineTo(len * 0.47, br * 0.18); ctx.stroke(); // Nase
        ctx.fillStyle = farbe;
        [[-0.3, -0.6], [-0.3, 0.5], [0.3, -0.6], [0.3, 0.5]].forEach(([fx, fy]) => ctx.fillRect(len * fx - len * 0.07, br * fy, len * 0.14, br * 0.1));
        ctx.restore();
      };
      if (ref && !VG.single && VG.showB) auto(ref.x, ref.y, bIdx(pos), "#e9ecf2");
      if (VG.showA) auto(lineA.x, lineA.y, pos, GF.gruen);
    }
  }

  function drawMini() {
    const cv = document.getElementById("gf-mini"); if (!cv || !VG.d) return;
    const W = Math.max(cv.parentElement.clientWidth, 120), H = 150;
    const ctx = prep(cv, W, H); ctx.clearRect(0, 0, W, H);
    const geo = VG.mapRef || VG.mapMine; if (!geo) { VG.miniGeom = null; return; }
    const xs = geo.x, ys = geo.y, n = xs.length - 1;
    let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity;
    for (let i = 0; i <= n; i++) { const x = xs[i], y = ys[i]; if (x == null || y == null) continue; if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > e) e = y; }
    if (!isFinite(a)) return;
    const pad = 10, sc = Math.min((W - 2 * pad) / Math.max(b - a, 1), (H - 2 * pad) / Math.max(e - c, 1));
    const ox = (W - (b - a) * sc) / 2, oy = (H - (e - c) * sc) / 2;
    const PX = x => ox + (x - a) * sc, PY = y => H - (oy + (y - c) * sc);
    VG.miniGeom = { PX, PY, xs, ys };
    const pfad = (i0, i1) => { ctx.beginPath(); let s = false; for (let i = i0; i <= i1; i++) { if (xs[i] == null || ys[i] == null) { s = false; continue; } const px = PX(xs[i]), py = PY(ys[i]); if (!s) { ctx.moveTo(px, py); s = true; } else ctx.lineTo(px, py); } };
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    // gewählter Abschnitt als heller Schein darunter
    if (VG.i0 > 0 || VG.i1 < n) { pfad(VG.i0, VG.i1); ctx.lineWidth = 7; ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.stroke(); }
    // ganze Runde in der Farbe der großen Karte (Gas/Bremse, Speed oder Delta)
    const lineA = VG.mapMine || geo, pos = VG.cur >= 0 ? VG.cur : VG.i0;
    ctx.lineWidth = 2;
    let farbe = null, offen = false;
    for (let i = 1; i <= n; i++) {
      const x0 = lineA.x[i - 1], y0 = lineA.y[i - 1], x1 = lineA.x[i], y1 = lineA.y[i];
      if (x0 == null || y0 == null || x1 == null || y1 == null) { if (offen) { ctx.stroke(); offen = false; } continue; }
      const f = segColor(i);
      if (!offen || f !== farbe) { if (offen) ctx.stroke(); ctx.beginPath(); ctx.strokeStyle = f; farbe = f; ctx.moveTo(PX(x0), PY(y0)); offen = true; }
      ctx.lineTo(PX(x1), PY(y1));
    }
    if (offen) ctx.stroke();
    // sichtbarer Ausschnitt der großen Karte
    if (VG.view && (VG.folgen || VG.frei)) {
      const v = VG.view; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1;
      ctx.strokeRect(PX(v.cx - v.hw), PY(v.cy + v.hh), Math.max(4, v.hw * 2 * sc), Math.max(4, v.hh * 2 * sc));
    }
    if (lineA.x[pos] != null) {
      ctx.fillStyle = GF.gruen; dot(ctx, PX(lineA.x[pos]), PY(lineA.y[pos]), 5);
      ctx.fillStyle = "#fff"; dot(ctx, PX(lineA.x[pos]), PY(lineA.y[pos]), 3);
    }
  }

  /* ---- Kanäle (abgerundete Karten wie GO FAST) ---- */
  function serie(ctx, arr, j0, j1, step, X, Y, isStep, base, top, col, fill, dashed) {
    if (!arr) return;
    const P = [];
    for (let j = j0; j <= j1; j += step) { const v = arr[j]; if (v == null || !isFinite(v)) continue; P.push(X(j), Y(v)); }
    if (j1 > j0 && (j1 - j0) % step) { const v = arr[j1]; if (v != null && isFinite(v)) P.push(X(j1), Y(v)); }
    if (P.length < 4) return;
    const pfad = () => { ctx.beginPath(); ctx.moveTo(P[0], P[1]); for (let k = 2; k < P.length; k += 2) { if (isStep) ctx.lineTo(P[k], P[k - 1]); ctx.lineTo(P[k], P[k + 1]); } };
    if (fill) {
      pfad(); ctx.lineTo(P[P.length - 2], base); ctx.lineTo(P[0], base); ctx.closePath();
      const g = ctx.createLinearGradient(0, top, 0, base); g.addColorStop(0, hexA(col, 0.48)); g.addColorStop(1, hexA(col, 0.05));
      ctx.fillStyle = g; ctx.fill();
    }
    pfad(); ctx.save(); if (dashed) ctx.setLineDash([2, 3]); ctx.lineWidth = dashed ? 1.3 : 1.8; ctx.strokeStyle = col; ctx.lineJoin = "round"; ctx.stroke(); ctx.restore();
  }

  function drawCharts() {
    const cv = document.getElementById("kv-charts"); if (!cv || !VG.d) return;
    const box = cv.parentElement, W = Math.max(box.clientWidth - 2, 220);
    const d = VG.d, ch = VG.channels, rowH = 106, gap = 9;
    const H = Math.max(ch.length * (rowH + gap) - gap, 100);
    const ctx = prep(cv, W, H); ctx.clearRect(0, 0, W, H);
    const plotL = 6, plotR = W - 46, plotW = Math.max(plotR - plotL, 40);
    const i0 = VG.i0, i1 = VG.i1, zeit = VG.xmode === "zeit" && d.t;
    let xAt, xAtB, jb0 = i0, jb1 = i1;
    if (zeit) {
      const T0 = d.t[i0], T1 = d.t[i1], k = plotW / Math.max(T1 - T0, 1e-6);
      xAt = i => plotL + (d.t[i] - T0) * k;
      if (d.tb) { xAtB = j => plotL + (d.tb[j] - T0) * k; jb0 = Math.max(0, idxAtTime(d.tb, T0) - 1); jb1 = Math.min(d.tb.length - 1, idxAtTime(d.tb, T1) + 1); }
      else xAtB = xAt;
    } else { const k = plotW / Math.max(i1 - i0, 1); xAt = i => plotL + (i - i0) * k; xAtB = xAt; }
    VG.chartGeom = { plotL, plotR, plotW, i0, i1, xAt, zeit: !!zeit, rows: [] };
    const step = Math.max(1, Math.floor((i1 - i0) / (plotW * 2)));

    ch.forEach((c, idx) => {
      const top = idx * (rowH + gap), bot = top + rowH, pT = top + 26, pB = bot - 9;
      const [lo, hi] = c.rng;
      const yAt = v => pB - ((v - lo) / Math.max(hi - lo, 1e-9)) * (pB - pT);
      VG.chartGeom.rows.push({ top, bot, c, yAt });
      rrect(ctx, 0.5, top + 0.5, W - 1, rowH - 1, 10); ctx.fillStyle = "#0d0f13"; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.055)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); rrect(ctx, 0.5, top + 0.5, W - 1, rowH - 1, 10); ctx.clip();
      if (lo < 0 && hi > 0) { const zy = Math.round(yAt(0)) + 0.5; ctx.strokeStyle = "rgba(255,255,255,.09)"; ctx.beginPath(); ctx.moveTo(plotL, zy); ctx.lineTo(plotR, zy); ctx.stroke(); }
      const col = CH_COL[c.key] || GF.gruen, base = (lo < 0 && hi > 0) ? yAt(0) : pB;
      if (VG.showA) serie(ctx, c.a, i0, i1, step, xAt, yAt, c.step, base, pT, col, true, false);
      if (c.b && VG.showB) serie(ctx, c.b, jb0, jb1, step, xAtB, yAt, c.step, null, null, "rgba(240,242,246,.92)", false, true);
      ctx.restore();
      // Beschriftung
      ctx.font = "800 9.5px " + FONT; const tw = ctx.measureText(c.label).width;
      rrect(ctx, 9, top + 8, tw + 14, 17, 5); ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fill();
      ctx.fillStyle = "#e3e6ec"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(c.label, 16, top + 16.8);
      ctx.font = "700 10.5px " + FONT; ctx.fillStyle = "#cfd3db"; ctx.textAlign = "right";
      ctx.fillText(fmtAxis(c, hi), W - 9, pT + 1); ctx.fillText(fmtAxis(c, (lo + hi) / 2), W - 9, (pT + pB) / 2); ctx.fillText(fmtAxis(c, lo), W - 9, pB - 1);
      ctx.textBaseline = "alphabetic";
    });

    // Cursor mit Werten (du farbig, Vergleich weiß)
    if (VG.cur >= i0 && VG.cur <= i1) {
      const i = VG.cur, px = Math.round(xAt(i)) + 0.5, bi = zeit ? bIdx(i) : i;
      const pxB = zeit && d.tb ? xAtB(bi) : px;
      const rechts = px < plotR - 74;
      VG.chartGeom.rows.forEach(r => {
        const c = r.c, col = CH_COL[c.key] || GF.gruen;
        ctx.strokeStyle = "rgba(255,255,255,.32)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, r.top + 3); ctx.lineTo(px, r.bot - 3); ctx.stroke();
        const av = VG.showA ? c.a[i] : null, bv = (c.b && VG.showB) ? c.b[bi] : null;
        if (bv != null && isFinite(bv)) { ctx.fillStyle = "#fff"; dot(ctx, pxB, r.yAt(bv), 2.6); }
        if (av != null && isFinite(av)) { ctx.fillStyle = col; dot(ctx, px, r.yAt(av), 3.3); }
        ctx.font = "800 11px " + FONT; ctx.textAlign = rechts ? "left" : "right"; ctx.textBaseline = "middle";
        const lx = rechts ? px + 8 : px - 8;
        let ly = (av != null && isFinite(av)) ? r.yAt(av) - 7 : r.top + 36;
        ly = Math.max(r.top + 34, Math.min(r.bot - 24, ly));
        if (av != null && isFinite(av)) { ctx.fillStyle = col; ctx.fillText(fmtVal(c, av), lx, ly); }
        if (bv != null && isFinite(bv)) { ctx.fillStyle = "#f4f5f8"; ctx.fillText(fmtVal(c, bv), lx, ly + 14); }
        ctx.textBaseline = "alphabetic";
      });
    }
    if (VG.sel) { const x1 = Math.min(VG.sel.a, VG.sel.b), x2 = Math.max(VG.sel.a, VG.sel.b); ctx.fillStyle = "rgba(47,227,155,.13)"; ctx.fillRect(x1, 0, x2 - x1, H); }
  }

  function drawAll() { try { drawMap(); drawMini(); drawCharts(); } catch (e) { console.error(e); } }

  function idxAtX(px) {
    const g = VG.chartGeom, d = VG.d; if (!g || !d) return -1;
    const f = Math.max(0, Math.min(1, (px - g.plotL) / g.plotW));
    if (g.zeit && d.t) { const T = d.t[g.i0] + f * (d.t[g.i1] - d.t[g.i0]); return Math.max(g.i0, Math.min(g.i1, idxAtTime(d.t, T))); }
    return Math.max(g.i0, Math.min(g.i1, Math.round(g.i0 + f * (g.i1 - g.i0))));
  }

  /* ---- Segmente / Sektoren ---- */
  function vgSegCount() { return VG.segMode === "sektoren" ? 3 : (VG.d.kurven || []).length; }
  function vgSegRange(idx) {
    const d = VG.d, n = d.m.length - 1;
    if (idx < 0) return [0, n];
    if (VG.segMode === "sektoren") return [Math.round(n * idx / 3), Math.round(n * (idx + 1) / 3)];
    const k = d.kurven[idx]; if (!k) return [0, n];
    let lo, hi;
    if (VG.single) { const L = d.laenge || 1; lo = (k.bremse_m - 150) / L; hi = (k.gas_m + 150) / L; } else { lo = k.lo; hi = k.hi; }
    let i0 = Math.max(0, Math.round(lo * n)), i1 = Math.min(n, Math.round(hi * n));
    if (i1 - i0 < 8) { i0 = 0; i1 = n; }
    return [i0, i1];
  }
  function vgSegUpdate() {
    const d = VG.d, i0 = VG.i0, i1 = VG.i1;
    const za = d.t ? d.t[i1] - d.t[i0] : null, zb = d.tb ? d.tb[i1] - d.tb[i0] : null;
    const dl = d.delta ? d.delta[i1] - d.delta[i0] : null;
    const name = VG.seg === -2 ? "Ausschnitt" : VG.seg < 0 ? "Ganze Runde"
      : VG.segMode === "sektoren" ? "Sektor " + (VG.seg + 1) : "Kurve " + d.kurven[VG.seg].nr;
    const lab = document.getElementById("kv-seg-label");
    if (lab) lab.innerHTML = C.esc(name) + (!VG.single && dl != null ? ` <span class="${dl > 0.0005 ? "gf-rot" : dl < -0.0005 ? "gf-gruen" : ""}">${fmtDelta(dl)}</span>` : "");
    const sa = document.getElementById("gf-seg-a"), sb = document.getElementById("gf-seg-b");
    if (sa) sa.textContent = za != null ? fmtSek(za) : (VG.single && VG.seg >= 0 && VG.segMode === "kurven" ? "Vmin " + d.kurven[VG.seg].vmin : "–");
    if (sb) sb.textContent = zb != null ? fmtSek(zb) : "–";
  }
  function vgApplySeg(idx) {
    const n = vgSegCount();
    if (idx < -1) idx = n - 1;
    if (idx >= n) idx = -1;
    vgPush(); VG.frei = false;
    VG.seg = idx;
    [VG.i0, VG.i1] = vgSegRange(idx);
    if (VG.cur < VG.i0 || VG.cur > VG.i1) VG.cur = VG.i0;
    vgSegUpdate(); vgInfo(VG.cur); vgScrubSync(); vgUndoState(); drawAll();
  }

  /* ---- Rückgängig: jede Auswahl (Zoom, Segment, Kamera) kann zurückgenommen werden ---- */
  function vgZustand() { return { i0: VG.i0, i1: VG.i1, seg: VG.seg, segMode: VG.segMode, frei: VG.frei, folgen: VG.folgen, zoomM: VG.zoomM, camC: VG.camC ? { x: VG.camC.x, y: VG.camC.y } : null }; }
  function vgPush() { VG.verlauf.push(vgZustand()); if (VG.verlauf.length > 60) VG.verlauf.shift(); }
  function vgUndo() {
    const z = VG.verlauf.pop(); if (!z) return;
    Object.assign(VG, z);
    if (VG.cur < VG.i0 || VG.cur > VG.i1) VG.cur = VG.i0;
    document.querySelectorAll("[data-segmode]").forEach(x => x.classList.toggle("on", x.dataset.segmode === VG.segMode));
    vgSegUpdate(); vgInfo(VG.cur); vgScrubSync(); vgZoomSlider(); vgToolState(); vgUndoState(); drawAll();
  }
  function vgUndoState() {
    const b = document.getElementById("gf-undo"); if (b) b.disabled = !VG.verlauf.length;
    const x = document.getElementById("gf-seg-x"); if (x) x.hidden = VG.seg === -1;
  }

  /* ---- Cursor, Werte, Abspielen ---- */
  function setCursor(i) {
    VG.cur = i;
    if (!VG.raf) { VG.raf = true; requestAnimationFrame(() => { VG.raf = false; drawCharts(); drawMap(); drawMini(); }); }
    vgInfo(i); vgScrubSync();
  }
  function vgScrubSync() {
    const sc = document.getElementById("kv-scrub"); if (!sc || VG.scrubbing) return;
    const p = VG.cur < 0 ? 0 : (VG.cur - VG.i0) / Math.max(VG.i1 - VG.i0, 1);
    sc.value = Math.round(Math.max(0, Math.min(1, p)) * 1000);
    sc.style.setProperty("--p", (sc.value / 10) + "%");
  }
  function vgInfo(i) {
    const d = VG.d; if (!d) return;
    const pos = i >= 0 ? i : VG.i0, bi = bIdx(pos);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("gf-time", d.t ? fmtZeit(d.t[pos]) : Math.round(d.m[pos]) + " m");
    if (!VG.single) {
      const dl = d.delta ? d.delta[pos] : null, el = document.getElementById("gf-delta");
      if (el) { el.textContent = fmtDelta(dl); el.className = dl > 0.0005 ? "gf-rot" : dl < -0.0005 ? "gf-gruen" : ""; }
      const gap = (d.t && d.tb) ? d.m[pos] - d.m[bi] : null;
      set("gf-gap", gap == null ? "–" : (gap > 0 ? "+" : "") + Math.round(gap) + " m");
    } else set("gf-gap", Math.round(d.m[pos]) + " m");
    const K = d.kanaele || {};
    const val = (k, w, j) => { const c = K[k]; if (!c) return null; const arr = VG.single ? c : c[w === "a" ? 0 : 1]; return arr ? arr[j] : null; };
    [["a", pos], ["b", bi]].forEach(([w, j]) => {
      if (w === "b" && VG.single) return;
      const g = val("gas", w, j), br = val("bremse", w, j), spd = val("speed", w, j), gg = val("gang", w, j), rpm = val("rpm", w, j);
      set(`gf-${w}-gasv`, fmt(g, 0) + "%"); set(`gf-${w}-brv`, fmt(br, 0) + "%");
      const eg = document.getElementById(`gf-${w}-gas`), eb = document.getElementById(`gf-${w}-br`);
      if (eg) eg.style.width = Math.max(0, Math.min(100, g || 0)) + "%";
      if (eb) eb.style.width = Math.max(0, Math.min(100, br || 0)) + "%";
      set(`gf-${w}-sp`, fmt(spd, 0)); set(`gf-${w}-gg`, gg == null ? "–" : (gg <= 0 ? "N" : String(Math.round(gg)))); set(`gf-${w}-rpm`, fmt(rpm, 0));
    });
  }
  function vgPlayTick(ts) {
    if (!VG.playing || !VG.d) return;
    const d = VG.d;
    if (!VG.playT0) { VG.playT0 = ts; VG.playS0 = (VG.cur >= VG.i0 && VG.cur < VG.i1) ? VG.cur : VG.i0; }
    let i;
    if (d.t) {                                   // Echtzeit wie im Replay
      const T = d.t[VG.playS0] + (ts - VG.playT0) / 1000;
      if (T >= d.t[VG.i1]) { VG.playT0 = ts; VG.playS0 = VG.i0; i = VG.i0; }
      else i = Math.max(VG.i0, Math.min(VG.i1, idxAtTime(d.t, T)));
    } else {
      const span = Math.max(VG.i1 - VG.i0, 1), ph = ((ts - VG.playT0) / Math.max(2500, span * 6)) % 1;
      i = Math.round(VG.i0 + ph * span);
    }
    setCursor(i);
    requestAnimationFrame(vgPlayTick);
  }
  function vgPlay(an) {
    VG.playing = an;
    const b = document.getElementById("kv-play-btn"); if (b) { b.textContent = an ? "❚❚" : "▶"; b.classList.toggle("on", an); }
    if (an) { VG.playT0 = 0; requestAnimationFrame(vgPlayTick); }
  }
  // Zoom: Regler 0..100 ↔ sichtbare Meter 3000..30 (logarithmisch)
  const ZM_MIN = 30, ZM_MAX = 3000;
  const zmAusRegler = v => ZM_MIN * Math.pow(ZM_MAX / ZM_MIN, (100 - v) / 100);
  const reglerAusZm = m => 100 - 100 * Math.log(m / ZM_MIN) / Math.log(ZM_MAX / ZM_MIN);
  function vgZoom(m) {
    VG.zoomM = Math.max(ZM_MIN, Math.min(ZM_MAX, m));
    VG.folgen = VG.zoomM < ZM_MAX * 0.98;
    if (!VG.folgen) VG.frei = false;
    if (VG.folgen && VG.cur < 0) VG.cur = VG.i0;
    vgZoomSlider(); vgToolState(); drawMap(); drawMini();
  }
  function vgZoomSlider() {
    const z = document.getElementById("gf-zoom"); if (!z) return;
    const v = (VG.folgen || VG.frei) ? reglerAusZm(VG.zoomM) : 0;
    z.value = Math.round(v); z.style.setProperty("--p", v + "%");
  }
  function vgToolState() { const f = document.querySelector('[data-tool="folgen"]'); if (f) f.classList.toggle("on", VG.folgen && !VG.frei); }

  /* ---- Bedienung verdrahten ---- */
  function wireAnalyse() {
    const cv = document.getElementById("kv-charts"), mp = document.getElementById("kv-map"), mini = document.getElementById("gf-mini");
    const relX = (el, e) => e.clientX - el.getBoundingClientRect().left;
    // Kanäle: Fadenkreuz, Ziehen = zoomen, Doppelklick = ganze Runde
    cv.onmousemove = e => { const px = relX(cv, e); if (VG.drag) VG.sel = { a: VG.drag.px, b: px }; if (VG.playing) return; setCursor(idxAtX(px)); };
    cv.onmousedown = e => {
      VG.drag = { px: relX(cv, e) }; VG.sel = { a: VG.drag.px, b: VG.drag.px };
      VG.docUp = () => {
        const sel = VG.sel; vgCleanup();
        if (sel) { const ia = idxAtX(Math.min(sel.a, sel.b)), ib = idxAtX(Math.max(sel.a, sel.b)); if (ib - ia >= 8) { vgPush(); VG.frei = false; VG.i0 = ia; VG.i1 = ib; VG.seg = -2; if (VG.cur < ia || VG.cur > ib) VG.cur = ia; vgSegUpdate(); vgInfo(VG.cur); vgScrubSync(); vgUndoState(); } }
        drawAll();
      };
      document.addEventListener("mouseup", VG.docUp);
    };
    cv.ondblclick = () => vgApplySeg(-1);
    // Karte: Punkt suchen, Mausrad = Zoom
    // Karte mit der Maus verschieben (Klick ohne Bewegung bleibt ein Klick)
    mp.onmousedown = e => {
      if (e.button !== 0 || !VG.view) return;
      const v = VG.view, start = { x: e.clientX, y: e.clientY, cx: v.cx, cy: v.cy, sc: v.sc, W: v.W, H: v.H }, md = { moved: false };
      VG.mapDrag = md;
      const move = ev => {
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        if (!md.moved && Math.hypot(dx, dy) < 4) return;
        if (!md.moved) { md.moved = true; vgPush(); VG.zoomM = Math.min(start.W, start.H) / start.sc; VG.frei = true; VG.folgen = true; mp.classList.add("zieht"); }
        VG.camC = { x: start.cx - dx / start.sc, y: start.cy + dy / start.sc };
        vgZoomSlider(); vgToolState(); vgUndoState(); drawMap(); drawMini();
      };
      const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); mp.classList.remove("zieht"); setTimeout(() => { VG.mapDrag = null; }, 0); };
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    };
    mp.onmousemove = e => {
      const g = VG.mapGeom; if (!g || VG.playing || VG.mapDrag) return;
      const r = mp.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      let best = -1, bd = 1e9;
      for (let i = VG.i0; i <= VG.i1; i += 2) { if (g.mx[i] == null) continue; const dx = g.PX(g.mx[i]) - px, dy = g.PY(g.my[i]) - py, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
      if (best >= 0 && bd < 1600) setCursor(best);
    };
    mp.onclick = e => {   // Kurven-Schild anklicken = diese Kurve ansehen
      if (VG.mapDrag && VG.mapDrag.moved) return;
      const r = mp.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const l = (VG.mapLabels || []).find(q => px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h);
      if (!l) return;
      if (VG.segMode !== "kurven") { VG.segMode = "kurven"; document.querySelectorAll("[data-segmode]").forEach(x => x.classList.toggle("on", x.dataset.segmode === "kurven")); }
      vgApplySeg(l.idx);
    };
    const anzBtn = document.getElementById("gf-anz-btn"), anzBox = document.getElementById("gf-anz");
    anzBtn.onclick = e => { e.stopPropagation(); anzBox.hidden = !anzBox.hidden; anzBtn.classList.toggle("on", !anzBox.hidden); };
    const span = () => VG.view ? 2 * Math.min(VG.view.hw, VG.view.hh) : VG.zoomM;
    mp.addEventListener("wheel", e => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1 / 1.2 : 1.2;
      if (VG.folgen && !VG.frei) { vgZoom(span() * f); return; }
      // Gesamtansicht oder frei verschoben: um den Mauszeiger zoomen
      const v = VG.view; if (!v) return;
      const r = mp.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const wx = v.cx + (px - v.W / 2) / v.sc, wy = v.cy - (py - v.H / 2) / v.sc;
      const zm = Math.max(ZM_MIN, Math.min(ZM_MAX, 2 * Math.min(v.hw, v.hh) * f));
      if (zm >= ZM_MAX * 0.98) { VG.frei = false; vgZoom(ZM_MAX); return; }
      const sc2 = Math.min(v.W, v.H) / zm;
      VG.camC = { x: wx - (px - v.W / 2) / sc2, y: wy + (py - v.H / 2) / sc2 };
      VG.zoomM = zm; VG.frei = true; VG.folgen = true;
      vgZoomSlider(); vgToolState(); drawMap(); drawMini();
    }, { passive: false });
    // Rückgängig: Knopf, Rechtsklick, „Auswahl aufheben"
    document.getElementById("gf-undo").onclick = vgUndo;
    document.getElementById("gf-seg-x").onclick = () => vgApplySeg(-1);
    cv.oncontextmenu = e => { e.preventDefault(); vgUndo(); };
    mp.oncontextmenu = e => { e.preventDefault(); vgUndo(); };
    mini.onclick = e => {
      const g = VG.miniGeom; if (!g) return;
      const r = mini.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      let best = -1, bd = 1e9;
      for (let i = 0; i < g.xs.length; i += 2) { if (g.xs[i] == null) continue; const dx = g.PX(g.xs[i]) - px, dy = g.PY(g.ys[i]) - py, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
      if (best < 0) return;
      if (best < VG.i0 || best > VG.i1) { vgPush(); VG.i0 = 0; VG.i1 = VG.d.m.length - 1; VG.seg = -1; vgSegUpdate(); vgUndoState(); }
      if (VG.frei) VG.camC = { x: g.xs[best], y: g.ys[best] };
      setCursor(best);
    };
    const zoom = document.getElementById("gf-zoom");
    zoom.oninput = () => vgZoom(zmAusRegler(Number(zoom.value)));
    document.getElementById("gf-zm").onclick = () => vgZoom(span() * 1.5);
    document.getElementById("gf-zp").onclick = () => vgZoom(span() / 1.5);
    // Werkzeuge links: Färbung der Linie, Kamera folgen
    document.querySelectorAll(".gf-tools [data-col]").forEach(b => b.onclick = () => {
      VG.color = b.dataset.col;
      document.querySelectorAll(".gf-tools [data-col]").forEach(x => x.classList.toggle("on", x === b));
      vgLegend(); drawMap();
    });
    const fol = document.querySelector('[data-tool="folgen"]');
    if (fol) fol.onclick = () => {   // frei verschoben → zurück aufs Auto; sonst Folgen ↔ Gesamtansicht
      vgPush();
      if (VG.frei) { VG.frei = false; VG.folgen = true; if (VG.cur < 0) VG.cur = VG.i0; vgZoomSlider(); vgToolState(); vgUndoState(); drawMap(); drawMini(); return; }
      if (VG.folgen) { VG.folgen = false; vgZoomSlider(); vgToolState(); vgUndoState(); drawMap(); drawMini(); }
      else { vgUndoState(); vgZoom(VG.zoomM >= ZM_MAX * 0.98 ? 90 : VG.zoomM); }
    };
    // Segmente / Sektoren
    document.querySelectorAll("[data-segmode]").forEach(b => b.onclick = () => {
      VG.segMode = b.dataset.segmode;
      document.querySelectorAll("[data-segmode]").forEach(x => x.classList.toggle("on", x === b));
      vgApplySeg(-1);
    });
    document.getElementById("kv-seg-prev").onclick = () => vgApplySeg((VG.seg < -1 ? -1 : VG.seg) - 1);
    document.getElementById("kv-seg-next").onclick = () => vgApplySeg((VG.seg < -1 ? -1 : VG.seg) + 1);
    // Runden ein-/ausblenden (Fahrerkarten anklicken)
    const sichtSync = () => {
      const v = VG.showA && VG.showB ? "beide" : VG.showA ? "a" : VG.showB ? "b" : "";
      document.querySelectorAll("[data-sicht]").forEach(x => x.classList.toggle("on", x.dataset.sicht === v));
      document.querySelectorAll(".gf-tog[data-lap]").forEach(c => c.classList.toggle("off", c.dataset.lap === "a" ? !VG.showA : !VG.showB));
    };
    document.querySelectorAll(".gf-tog[data-lap]").forEach(b => b.onclick = () => {
      if (b.dataset.lap === "a") VG.showA = !VG.showA; else VG.showB = !VG.showB;
      sichtSync(); drawAll();
    });
    document.querySelectorAll("[data-sicht]").forEach(b => b.onclick = () => {
      const s = b.dataset.sicht; VG.showA = s !== "b"; VG.showB = s !== "a";
      sichtSync(); drawAll();
    });
    // Reiter Telemetrie / Kurven
    document.querySelectorAll("[data-ansicht]").forEach(b => b.onclick = () => {
      VG.ansicht = b.dataset.ansicht;
      document.querySelectorAll("[data-ansicht]").forEach(x => x.classList.toggle("on", x === b));
      document.getElementById("gf-tele-in").hidden = VG.ansicht !== "tele";
      document.getElementById("gf-kurven").hidden = VG.ansicht !== "kurven";
      if (VG.ansicht === "tele") drawCharts();
    });
    document.querySelectorAll("#gf-kurven tbody tr").forEach(tr => tr.onclick = () => {
      document.querySelector('[data-ansicht="tele"]').click();
      if (VG.segMode !== "kurven") { VG.segMode = "kurven"; document.querySelectorAll("[data-segmode]").forEach(x => x.classList.toggle("on", x.dataset.segmode === "kurven")); }
      vgApplySeg(Number(tr.dataset.idx));
    });
    // Zeit / Distanz
    document.querySelectorAll("[data-x]").forEach(b => {
      b.classList.toggle("on", b.dataset.x === VG.xmode);
      b.onclick = () => { if (b.disabled) return; VG.xmode = b.dataset.x; document.querySelectorAll("[data-x]").forEach(x => x.classList.toggle("on", x === b)); drawCharts(); };
    });
    // Abspielen, Zeitleiste, zurück
    document.getElementById("kv-play-btn").onclick = () => vgPlay(!VG.playing);
    const sc = document.getElementById("kv-scrub");
    sc.oninput = () => { VG.scrubbing = true; vgPlay(false); sc.style.setProperty("--p", (sc.value / 10) + "%"); setCursor(Math.round(VG.i0 + (sc.value / 1000) * (VG.i1 - VG.i0))); };
    sc.onchange = () => { VG.scrubbing = false; };
    document.getElementById("gf-reset").onclick = () => { vgPlay(false); vgApplySeg(-1); VG.cur = 0; vgInfo(0); vgScrubSync(); drawAll(); };
    vgToolState(); vgUndoState();
    const au = document.getElementById("gf-autos");
    au.onchange = () => { VG.autos = au.checked; drawMap(); };
    vgZoomSlider();
  }

  // Esc = Rückgängig (bzw. ⚙-Menü schließen) im Streckenvergleich
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || tab !== "vergleich" || !VG.d || !document.getElementById("gf-mapcol")) return;
    const t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    const box = document.getElementById("gf-anz"); if (box && !box.hidden) { box.hidden = true; return; }
    vgUndo();
  });

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
    ["Setup-Optimizer", [
      ["Wofür", "Schritt für Schritt zum passenden Setup, wie beim GO-Fast-Optimiser: Problem wählen, wo es in der Kurve passiert, in welchen Kurven und wie stark (1 bis 5). Dann kommen konkrete Änderungen mit aktuellem und neuem Wert. Der Setup-Berater bleibt daneben unverändert."],
      ["Testen und Rückmeldung", "Änderungen in der Garage eintragen, mindestens 3 Runden fahren und dann sagen: Problem gelöst, gleiches Problem (nächster, stärkerer Schritt), anderes Problem oder falsche Richtung."],
      ["Was du geändert hast", "Mit „Setup live lesen“ sieht der Optimizer, welche Werte du in der Garage wirklich verstellt hast. Bei „falsche Richtung“ zeigt er genau diese Werte zum Zurückstellen."],
      ["Verlauf", "Rechts stehen alle Schritte für dieses Auto auf dieser Strecke mit Ergebnis. „Alles zurück auf Start“ listet, was du seit dem ersten Schritt verstellt hast. Gespeichert wird nur im Browser, keine Runden."],
    ]],
    ["Streckenvergleich", [
      ["Zwei Runden übereinander", "Aufgebaut wie die GO-Fast-Telemetrie: oben die beiden Fahrer mit Gas, Bremse, Tempo, Gang und Drehzahl an der aktuellen Stelle, links die Strecke, rechts die Kanäle. Deine Runde ist grün, die Vergleichsrunde weiß gepunktet. Fahrerkarte anklicken blendet die Runde aus und wieder ein."],
      ["Nur ansehen (ohne Vergleich)", "Stell „Vergleich“ auf „nur ansehen (kein Vergleich)“, dann siehst du eine einzelne Runde für sich: Strecke, alle Kanäle und je Kurve Bremspunkt, Gaspunkt, Eingangs- und Scheitelspeed."],
      ["Streckenkarte", "Die Kamera folgt deinem Auto, das Vergleichsauto fährt als Geist zur selben Zeit mit. Mausrad oder Regler unten rechts zoomen, das Fadenkreuz-Symbol links schaltet zwischen Folgen und Gesamtansicht. Die Linie ist nach Gas/Bremse gefärbt (grün = Gas, rot = Bremse, weiß = rollen), wahlweise nach Tempo oder nach Zeitgewinn/-verlust. Die Mini-Karte zeigt die ganze Runde – anklicken springt dorthin."],
      ["Segmente und Sektoren", "Mit ‹ › unten links gehst du Kurve für Kurve (Segmente) oder in drei Sektoren durch. Angezeigt werden die Zeiten beider Runden im Abschnitt und die Differenz."],
      ["Kanäle", "Delta, Gas, Bremse, Speed, Lenkung, Gang, Drehzahl und die Fahrlinie (links/rechts in Metern), mit gemeinsamem Fadenkreuz und den Werten beider Runden direkt am Cursor. Ziehen zoomt in einen Abschnitt, Doppelklick zurück. „Zeit“/„Distanz“ unten rechts stellt die Achse um."],
      ["Abspielen", "▶ spielt die Runde in Echtzeit ab, die Zeitleiste spult. Daneben stehen Rundenzeit, Delta und der Abstand zwischen den Autos in Metern."],
      ["Kurve für Kurve", "Reiter „Kurven“: je Kurve Zeitverlust, Brems- und Gaspunkt, Kurven- und Ausgangstempo und ein Tipp, dazu „Top 3“. Eine Zeile anklicken zeigt die Kurve in Karte und Kanälen."],
      ["Fahrlinie", "Eigene Mitschnitte ab v2.2 zeichnen die Linie aus Fahrtrichtung und Beschleunigung mit (iRacing liefert live kein GPS). Bei älteren Runden fehlt die Linie – dann ist nur die Referenz als Karte zu sehen."],
      ["Eigene Runden löschen", "Unter der Auswahl lassen sich einzelne eigene Mitschnitte oder alle auf einmal entfernen."],
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

  let vgResizeT = null;
  window.addEventListener("resize", () => {
    if (tab !== "vergleich" || !VG.d || !root) return;
    clearTimeout(vgResizeT); vgResizeT = setTimeout(() => { if (tab === "vergleich" && VG.d) drawAll(); }, 150);
  });

  window.F2FTrainer = { mount, unmount };
})();
