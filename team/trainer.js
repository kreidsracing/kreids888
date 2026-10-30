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
        ${[["live", "Live-Coach"], ["setup", "Setup-Berater"], ["strecke", "Streckenberater"], ["vergleich", "Streckenvergleich"], ["anleitung", "Anleitung"]]
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
    else if (tab === "strecke") renderStrecke();
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

  /* ================================================================ STRECKENBERATER */
  async function renderStrecke() {
    const box = document.getElementById("kt-tab");
    box.innerHTML = `
      <div class="tm-box kt-bar">
        <b class="kt-bar-t">Runde von dieser Strecke:</b>
        ${btn2("Letzte eigene Runde", 'data-src="letzte"')}
        ${btn2("Aktuelle Referenzrunde", 'data-src="aktuell"')}
        <label class="tm-btn sm kt-file"><span>CSV hochladen</span><input type="file" accept=".csv" id="kt-sr-file" hidden></label>
      </div>
      <div id="kt-sr"><div class="tm-box tm-soon"><div class="big">Strecke vermessen</div><p>Lade eine Runde von dieser Strecke – daraus wird berechnet, wie viel Abtrieb die Strecke will, gilt auch für Layouts, die in keiner Liste stehen.</p></div></div>`;
    const go = async (body) => {
      try { zeigeStrecke(await post("/strecke", body)); } catch (e) { C.toast(e.message); }
    };
    box.querySelectorAll("[data-src]").forEach(b => b.onclick = () => go({ typ: b.dataset.src }));
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

  /* ================================================================ STRECKENVERGLEICH (Garage-61-Stil) */
  const VG = { laps: { refs: [], eigene: [] }, d: null, channels: [], i0: 0, i1: 0, cur: -1, color: "delta",
               mapGeom: null, chartGeom: null, drag: null, sel: null, spMinMax: [0, 1], col: null, docUp: null, raf: false };

  function vgCleanup() { if (VG.docUp) { document.removeEventListener("mouseup", VG.docUp); VG.docUp = null; } VG.drag = VG.sel = null; VG.playing = false; }

  function cssVar(n, fb) { try { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || fb; } catch (e) { return fb; } }

  function vgColors() {
    return {
      ref: "#9aa3b4", a: "#ff5c5c", b: "#6cc0ff", line: "#c792ea",
      grid: "rgba(255,255,255,.07)", zero: "rgba(255,255,255,.22)",
      panel: cssVar("--panel2", "#1a1d25"), txt: cssVar("--steel", "#8b93a7"),
      good: "#22e07b", warn: "#ffb020", bad: "#ff5c5c",
    };
  }

  function vgOptions(withQuick) {
    const r = VG.laps;
    const opt = x => `<option value="${x.typ}|${C.esc(x.id)}">${C.esc(x.name)}</option>`;
    let h = withQuick ? `<option value="letzte|">Letzte eigene Runde</option><option value="aktuell|">Aktuelle Referenzrunde</option>` : "";
    if (r.refs.length) h += `<optgroup label="Referenzrunden">${r.refs.map(opt).join("")}</optgroup>`;
    if (r.eigene.length) h += `<optgroup label="Eigene Mitschnitte">${r.eigene.map(opt).join("")}</optgroup>`;
    return h;
  }

  async function renderVergleich() {
    vgCleanup();
    const box = document.getElementById("kt-tab");
    box.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
    try { VG.laps = await hcall("/laps"); } catch (e) { VG.laps = { refs: [], eigene: [] }; }
    box.innerHTML = `
      <div class="tm-box kt-bar kv-bar">
        <label class="kv-pick"><span class="kv-pick-l" style="color:#ff5c5c">🔴 Meine Runde</span>
          <select class="tm-select" id="kv-a">${vgOptions(true)}</select></label>
        <label class="kv-pick"><span class="kv-pick-l" style="color:#6cc0ff">🔵 Vergleich</span>
          <select class="tm-select" id="kv-b"><option value="">— nur ansehen (kein Vergleich) —</option>${vgOptions(true)}</select></label>
        <label class="tm-btn sm kt-file"><span>CSV hochladen</span><input type="file" accept=".csv" id="kv-file" hidden></label>
        <span class="kt-sp"></span>
        ${btn2("Vergleichen", 'id="kv-go"', "red")}
      </div>
      ${VG.laps.eigene.length ? `<div class="kv-del tm-muted">Eigene Mitschnitte:
        <select class="tm-select" id="kv-del-sel" style="width:auto;max-width:260px">${VG.laps.eigene.map(x => `<option value="${C.esc(x.id)}">${C.esc(x.name)}</option>`).join("")}</select>
        ${btn2("Löschen", 'id="kv-del-one"')} · <button type="button" class="kv-link" id="kv-del-all">alle löschen</button></div>` : ""}
      <div id="kv-view"><div class="tm-box tm-soon"><div class="big">Zwei Runden übereinanderlegen</div>
        <p>Wähl deine Runde und eine Vergleichsrunde – meist deine letzte eigene gegen die geladene Referenz – und klick „Vergleichen“. Du siehst Streckenkarte, Delta und alle Kanäle wie im Garage-61-Analyzer.</p></div></div>`;

    const aEl = document.getElementById("kv-a"), bEl = document.getElementById("kv-b");
    aEl.value = "letzte|"; bEl.value = "aktuell|";
    const goBtn = document.getElementById("kv-go");
    const updGo = () => { const s = goBtn.querySelector("span"); if (s) s.textContent = bEl.value ? "Vergleichen" : "Ansehen"; };
    bEl.onchange = updGo; updGo();
    goBtn.onclick = vergleichStart;
    document.getElementById("kv-file").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const r = await hcall("/lap/upload?zweck=vergleich", { raw: await f.arrayBuffer(), name: f.name }, 30000);
        VG.laps = r.laps; refreshVgSelects(); document.getElementById("kv-b").value = "ref|" + r.id;
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
    const av = aEl && aEl.value, bv = bEl && bEl.value;
    if (aEl) { aEl.innerHTML = vgOptions(true); aEl.value = av; if (!aEl.value) aEl.value = "letzte|"; }
    if (bEl) { bEl.innerHTML = vgOptions(true); bEl.value = bv; if (!bEl.value) bEl.value = "aktuell|"; }
    const dsel = document.getElementById("kv-del-sel");
    if (dsel) dsel.innerHTML = VG.laps.eigene.map(x => `<option value="${C.esc(x.id)}">${C.esc(x.name)}</option>`).join("");
  }

  function vgRef(v) { const [typ, id] = (v || "").split("|"); return id ? { typ, id } : { typ }; }

  async function vergleichStart() {
    const go = document.getElementById("kv-go");
    const a = vgRef(document.getElementById("kv-a").value);
    const bval = document.getElementById("kv-b").value;
    const view = document.getElementById("kv-view");
    go.disabled = true;
    view.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
    try {
      if (!bval) zeigeEinzel(await post("/einzel", { a }));
      else zeigeVergleich(await post("/vergleich", { a, b: vgRef(bval) }));
    } catch (e) {
      view.innerHTML = `<div class="tm-box tm-err">${C.esc(e.message)}</div>`;
    } finally { go.disabled = false; }
  }

  function vgBuildChannels(d) {
    const K = d.kanaele || {}, ch = [];
    ch.push({ key: "delta", label: "Delta", unit: " s", a: d.delta, b: null, kind: "delta", dec: 2 });
    if (K.speed) ch.push({ key: "speed", label: "Speed", unit: " km/h", a: K.speed[0], b: K.speed[1], kind: "line", dec: 0 });
    if (K.gas) ch.push({ key: "gas", label: "Gas", unit: " %", a: K.gas[0], b: K.gas[1], kind: "line", dec: 0, min: 0, max: 100 });
    if (K.bremse) ch.push({ key: "bremse", label: "Bremse", unit: " %", a: K.bremse[0], b: K.bremse[1], kind: "line", dec: 0, min: 0, max: 100 });
    if (K.gang) ch.push({ key: "gang", label: "Gang", unit: "", a: K.gang[0], b: K.gang[1], kind: "line", dec: 0 });
    if (K.lenkung) ch.push({ key: "lenkung", label: "Lenkung", unit: " °", a: K.lenkung[0], b: K.lenkung[1], kind: "line", dec: 0 });
    if (d.linie) ch.push({ key: "linie", label: "Linie", unit: " m", a: d.linie, b: null, kind: "linie", dec: 2 });
    return ch;
  }

  function vgBuildChannelsEinzel(d) {
    const K = d.kanaele || {}, ch = [];
    if (K.speed) ch.push({ key: "speed", label: "Speed", unit: " km/h", a: K.speed, b: null, kind: "line", dec: 0 });
    if (K.gas) ch.push({ key: "gas", label: "Gas", unit: " %", a: K.gas, b: null, kind: "line", dec: 0, min: 0, max: 100 });
    if (K.bremse) ch.push({ key: "bremse", label: "Bremse", unit: " %", a: K.bremse, b: null, kind: "line", dec: 0, min: 0, max: 100 });
    if (K.gang) ch.push({ key: "gang", label: "Gang", unit: "", a: K.gang, b: null, kind: "line", dec: 0 });
    if (K.lenkung) ch.push({ key: "lenkung", label: "Lenkung", unit: " °", a: K.lenkung, b: null, kind: "line", dec: 0 });
    return ch;
  }

  function zeigeEinzel(d) {
    VG.d = d; VG.col = vgColors(); VG.single = true;
    VG.channels = vgBuildChannelsEinzel(d);
    VG.i0 = 0; VG.i1 = d.m.length - 1; VG.cur = -1;
    const sp = (d.kanaele && d.kanaele.speed) ? d.kanaele.speed.filter(v => v != null) : [0, 1];
    VG.spMinMax = [Math.min.apply(null, sp), Math.max.apply(null, sp)];
    VG.mapMine = d.karte ? { x: d.karte.x, y: d.karte.y } : null;
    VG.mapRef = null;
    VG.speedArr = d.kanaele ? d.kanaele.speed : null;
    VG.deltaArr = null; VG.color = "speed";

    const q = d.karte && d.karte.quelle;
    let hint = "";
    if (!d.karte) hint = "Für diese Runde gibt es keine Streckenkarte – die Linie gibt es für GPS-Runden (Garage 61) oder neue Mitschnitte ab v2.2.";
    else if (q === "berechnet") hint = "Die Linie wurde aus Fahrtrichtung und Tempo zurückgerechnet (eigener Mitschnitt ab v2.2) – nah dran, aber nicht zentimetergenau.";

    const L = d.laenge || 1;
    const krow = (k, i) => {
      const lo = Math.max(0, (k.bremse_m - 120) / L), hi = Math.min(1, (k.gas_m + 120) / L);
      return `<tr data-idx="${i}" data-lo="${lo}" data-hi="${hi}">
        <td><b>K${k.nr}</b><small>${k.m} m</small></td>
        <td>${k.bremse_m} m</td>
        <td>${k.gas_m} m</td>
        <td>${k.v_ein} km/h</td>
        <td><b>${k.vmin}</b> km/h</td>
        <td>${k.gang}</td></tr>`;
    };

    document.getElementById("kv-view").innerHTML = `
      <div class="tm-box kv-head">
        <div class="kv-head-l"><span class="kv-chip kv-cA">🔴 ${C.esc(d.a.label)} · ${C.esc(d.a.zeit)}</span>
          <span class="kv-vs">Einzelrunde ansehen</span><span class="tm-muted">${d.laenge} m</span></div>
      </div>
      <div class="kv-main">
        <div class="tm-box kv-mapbox">
          <div class="kv-mh"><span class="tp-label">🗺 Streckenkarte</span><span class="tm-muted" style="font-size:12px">eingefärbt nach Speed</span></div>
          <canvas id="kv-map"></canvas>
          <div class="kv-mapleg"><span><i class="kv-l-a"></i> deine Linie · blau = langsam, gelb = schnell</span></div>
        </div>
        <div class="tm-box kv-chartbox">
          <div class="kv-seg"><button type="button" class="kv-seg-btn" id="kv-seg-prev" title="Abschnitt zurück">‹</button><b id="kv-seg-label">Ganze Runde</b><button type="button" class="kv-seg-btn" id="kv-seg-next" title="nächster Abschnitt">›</button></div>
          <div class="kv-read" id="kv-read"></div>
          <canvas id="kv-charts"></canvas>
          <div class="kv-play">
            <button type="button" class="kv-play-b" id="kv-play-btn" title="Abspielen">▶</button>
            <input type="range" class="kv-scrub" id="kv-scrub" min="0" max="1000" value="0">
            <span class="kv-play-t" id="kv-play-t">–</span>
          </div>
        </div>
      </div>
      ${hint ? `<p class="kv-hint">ⓘ ${C.esc(hint)}</p>` : ""}
      <div class="td-label">Kurve für Kurve</div>
      <div class="kv-tabwrap"><table class="kv-tab">
        <thead><tr><th>Kurve</th><th>Bremspunkt</th><th>Gaspunkt</th><th>V-Eingang</th><th>Vmin</th><th>Gang</th></tr></thead>
        <tbody>${d.kurven.map(krow).join("")}</tbody></table>
        <p class="tm-muted kv-tabnote">Bremspunkt/Gaspunkt in Metern ab Start/Ziel. Zeile anklicken zoomt auf die Kurve.</p></div>`;

    updateReadout(-1);
    document.querySelectorAll(".kv-tab tbody tr").forEach(tr => tr.onclick = () => vgApplySeg(Number(tr.dataset.idx)));
    wireSeg();
    wirePlay();
    wireVgCanvas();
    drawAll();
  }

  function zeigeVergleich(d) {
    VG.d = d; VG.col = vgColors();
    VG.channels = vgBuildChannels(d);
    VG.i0 = 0; VG.i1 = d.m.length - 1; VG.cur = -1;
    const sp = (d.kanaele && d.kanaele.speed) ? d.kanaele.speed[0].filter(v => v != null) : [0, 1];
    VG.spMinMax = [Math.min.apply(null, sp), Math.max.apply(null, sp)];
    VG.single = false;
    const _k = d.karte;
    VG.mapMine = _k ? (_k.xa ? { x: _k.xa, y: _k.ya } : { x: _k.x, y: _k.y }) : null;
    VG.mapRef = (_k && _k.xa) ? { x: _k.x, y: _k.y } : null;
    VG.speedArr = (d.kanaele && d.kanaele.speed) ? d.kanaele.speed[0] : null;
    VG.deltaArr = d.delta;

    const dc = deltaCls(d.gesamt);
    let hint = "";
    const q = d.karte && d.karte.linie_quelle;
    if (!d.karte) hint = "Für die Streckenkarte braucht es eine Runde mit GPS oder einen neuen Mitschnitt – die Linie gibt es für neue Runden ab v2.2.";
    else if (q === "berechnet") hint = "Deine Linie wurde aus Tempo und Fahrtrichtung zurückgerechnet (eigener Mitschnitt ab v2.2) – nah dran, aber nicht zentimetergenau.";
    else if (!q) hint = "Für deine Runde gibt es noch keine Linie – die wird erst für neue Mitschnitte ab v2.2 mitgezeichnet. Die Referenz ist als Karte zu sehen.";

    const krow = (k, i) => `<tr data-idx="${i}" data-lo="${k.lo}" data-hi="${k.hi}">
        <td><b>K${k.nr}</b><small>${k.m} m</small></td>
        <td class="${deltaCls(k.dt)}">${fmtSign(k.dt, 2)}</td>
        <td>${k.bremse_m == null ? "–" : fmtSign(k.bremse_m, 0) + " m"}</td>
        <td>${k.gas_m == null ? "–" : fmtSign(k.gas_m, 0) + " m"}</td>
        <td>${k.vmin[0] == null ? "–" : k.vmin[0]}<small>/${k.vmin[1] == null ? "–" : k.vmin[1]}</small></td>
        <td>${k.vaus[0]}<small>/${k.vaus[1]}</small></td>
        <td class="kv-tip">${C.esc(k.tipp)}</td></tr>`;

    document.getElementById("kv-view").innerHTML = `
      <div class="tm-box kv-head">
        <div class="kv-head-l"><span class="kv-chip kv-cA">🔴 ${C.esc(d.a.label)} · ${C.esc(d.a.zeit)}</span>
          <span class="kv-vs">gegen</span>
          <span class="kv-chip kv-cB">🔵 ${C.esc(d.b.label)} · ${C.esc(d.b.zeit)}</span></div>
        <div class="kv-head-r"><span class="kv-gesamt-l">Gesamt</span><b class="kv-gesamt ${dc}">${fmtSign(d.gesamt, 2)} s</b></div>
      </div>
      <div class="kv-main">
        <div class="tm-box kv-mapbox">
          <div class="kv-mh"><span class="tp-label">🗺 Streckenkarte</span>
            <span class="kv-colbtns"><button type="button" data-col="delta" class="on">Delta</button><button type="button" data-col="speed">Speed</button></span></div>
          <canvas id="kv-map"></canvas>
          <div class="kv-mapleg"><span><i class="kv-l-a"></i> deine Linie (dick)</span><span><i class="kv-l-b"></i> Vergleich (dünn)</span></div>
        </div>
        <div class="tm-box kv-chartbox">
          <div class="kv-seg"><button type="button" class="kv-seg-btn" id="kv-seg-prev" title="Abschnitt zurück">‹</button><b id="kv-seg-label">Ganze Runde</b><button type="button" class="kv-seg-btn" id="kv-seg-next" title="nächster Abschnitt">›</button></div>
          <div class="kv-read" id="kv-read"></div>
          <canvas id="kv-charts"></canvas>
          <div class="kv-play">
            <button type="button" class="kv-play-b" id="kv-play-btn" title="Abspielen">▶</button>
            <input type="range" class="kv-scrub" id="kv-scrub" min="0" max="1000" value="0">
            <span class="kv-play-t" id="kv-play-t">–</span>
          </div>
        </div>
      </div>
      ${hint ? `<p class="kv-hint">ⓘ ${C.esc(hint)}</p>` : ""}
      ${d.top.length ? `<div class="td-label">Top 3: hier liegt die Zeit</div>
        <div class="kv-top3">${d.top.map((t, i) => `<div class="tm-box kv-t3"><div class="kv-t3-h"><span class="kt-nr">${i + 1}</span><b>Kurve ${t.nr}</b><em class="${deltaCls(t.dt)}">${fmtSign(t.dt, 2)} s</em></div><p>${C.esc(t.tipp)}</p></div>`).join("")}</div>` : ""}
      <div class="td-label">Kurve für Kurve</div>
      <div class="kv-tabwrap"><table class="kv-tab">
        <thead><tr><th>Kurve</th><th>dt</th><th>Bremspunkt</th><th>Gaspunkt</th><th>Vmin A/B</th><th>V-Ausgang A/B</th><th>Tipp</th></tr></thead>
        <tbody>${d.kurven.map(krow).join("")}</tbody></table>
        <p class="tm-muted kv-tabnote">Bremspunkt/Gaspunkt: Minus = du früher als der Vergleich. Zeile anklicken zoomt auf die Kurve.</p></div>`;

    updateReadout(-1);
    document.querySelectorAll("[data-col]").forEach(b => b.onclick = () => {
      VG.color = b.dataset.col;
      document.querySelectorAll("[data-col]").forEach(x => x.classList.toggle("on", x === b));
      drawMap();
    });
    document.querySelectorAll(".kv-tab tbody tr").forEach(tr => tr.onclick = () => vgApplySeg(Number(tr.dataset.idx)));
    wireSeg();
    wirePlay();
    wireVgCanvas();
    drawAll();
  }

  /* ---- Zeichnen ---- */
  function prep(cv, W, H) {
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
  }
  const fmt = (v, d) => (v == null || !isFinite(v)) ? "–" : (d ? Number(v).toFixed(d) : String(Math.round(v)));
  const fmtSign = (v, d) => (v == null || !isFinite(v)) ? "–" : (v > 0 ? "+" : "") + Number(v).toFixed(d);
  const deltaCls = v => v == null ? "" : v > 0.1 ? "kv-bad" : v > 0.02 ? "kv-warn" : v < -0.02 ? "kv-good" : "";

  function mix(h1, h2, t) {
    const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const a = p(h1), b = p(h2); t = Math.max(0, Math.min(1, t));
    return "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",") + ")";
  }
  // Farbe je Kanal (im Look des Garage-61-/GO-FAST-Analyzers)
  const CH_COL = { speed: "#2ad4c8", gas: "#22e07b", bremse: "#ff4d4d", gang: "#5aa9ff", lenkung: "#cdd3df", rpm: "#ffb020", delta: "#b98bff", linie: "#c792ea" };
  function hexA(h, a) { return "rgba(" + parseInt(h.slice(1, 3), 16) + "," + parseInt(h.slice(3, 5), 16) + "," + parseInt(h.slice(5, 7), 16) + "," + a + ")"; }
  function fillArea(ctx, arr, i0, i1, xAt, yAt, top, base, col) {
    let started = false, lastPx = null;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) { const v = arr[i]; if (v == null || !isFinite(v)) continue; const px = xAt(i), py = yAt(v); if (!started) { ctx.moveTo(px, base); ctx.lineTo(px, py); started = true; } else ctx.lineTo(px, py); lastPx = px; }
    if (!started) return;
    ctx.lineTo(lastPx, base); ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, hexA(col, 0.34)); g.addColorStop(1, hexA(col, 0.03));
    ctx.fillStyle = g; ctx.fill();
  }
  function vgSeriesDash(ctx, arr, i0, i1, xAt, yAt, col, lw) { ctx.save(); ctx.setLineDash([4, 3]); vgSeries(ctx, arr, i0, i1, xAt, yAt, col, lw); ctx.restore(); }
  function segColor(i) {
    const C2 = VG.col;
    if (VG.color === "delta" && VG.deltaArr) {
      const v = VG.deltaArr[i];
      if (v == null) return C2.ref;
      const t = Math.min(1, Math.abs(v) / 0.3);
      return mix("#6b7280", v > 0 ? C2.bad : C2.good, t);
    }
    const v = VG.speedArr ? VG.speedArr[i] : null;
    if (v == null) return C2.ref;
    const [lo, hi] = VG.spMinMax;
    return mix("#3b6cff", "#ffb020", (v - lo) / Math.max(hi - lo, 1));
  }

  function drawMap() {
    const cv = document.getElementById("kv-map"); if (!cv) return;
    const W = Math.max(cv.parentElement.clientWidth - 24, 120), H = 300, C2 = VG.col;
    const ctx = prep(cv, W, H); ctx.clearRect(0, 0, W, H);
    const mine = VG.mapMine, ref = VG.mapRef;
    if (!mine) { ctx.fillStyle = C2.txt; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("Keine Streckenkarte – Linie gibt es für neue Runden ab v2.2", W / 2, H / 2); return; }
    const mx = mine.x, my = mine.y, rx = ref ? ref.x : null, ry = ref ? ref.y : null;
    let a = Infinity, b = -Infinity, c = Infinity, dmax = -Infinity;
    const scan = (xs, ys) => { if (!xs) return; for (let i = 0; i < xs.length; i++) { const x = xs[i], y = ys[i]; if (x == null || y == null) continue; if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > dmax) dmax = y; } };
    scan(mx, my); scan(rx, ry);
    if (!isFinite(a)) { ctx.fillStyle = C2.txt; ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("Keine Streckenkarte verfügbar", W / 2, H / 2); return; }
    const pad = 18, sc = Math.min((W - 2 * pad) / Math.max(b - a, 1), (H - 2 * pad) / Math.max(dmax - c, 1));
    const ox = (W - (b - a) * sc) / 2, oy = (H - (dmax - c) * sc) / 2;
    const PX = x => ox + (x - a) * sc, PY = y => H - (oy + (y - c) * sc);
    VG.mapGeom = { PX, PY, mx, my, rx, ry };
    // Referenzlinie dünn (nur im Vergleich)
    if (rx) { ctx.lineWidth = 2; ctx.strokeStyle = C2.ref; ctx.lineJoin = "round"; ctx.beginPath(); let s = false; for (let i = 0; i < rx.length; i++) { if (rx[i] == null || ry[i] == null) { s = false; continue; } const px = PX(rx[i]), py = PY(ry[i]); if (!s) { ctx.moveTo(px, py); s = true; } else ctx.lineTo(px, py); } ctx.stroke(); }
    // eigene / einzelne Linie dick, eingefärbt, mit sanftem Neon-Glow
    ctx.lineWidth = 4.5; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255,255,255,.35)"; ctx.shadowBlur = 6;
    for (let i = 1; i < mx.length; i++) { if (mx[i - 1] == null || my[i - 1] == null || mx[i] == null || my[i] == null) continue; ctx.strokeStyle = segColor(i); ctx.beginPath(); ctx.moveTo(PX(mx[i - 1]), PY(my[i - 1])); ctx.lineTo(PX(mx[i]), PY(my[i])); ctx.stroke(); }
    ctx.shadowBlur = 0;
    // Cursor: Referenzpunkt + „Auto" auf der eigenen Linie
    if (VG.cur >= 0) {
      if (rx && rx[VG.cur] != null) { ctx.fillStyle = C2.b; ctx.beginPath(); ctx.arc(PX(rx[VG.cur]), PY(ry[VG.cur]), 4, 0, 7); ctx.fill(); }
      if (mx[VG.cur] != null) {
        const cx = PX(mx[VG.cur]), cy = PY(my[VG.cur]);
        ctx.shadowColor = "rgba(255,255,255,.8)"; ctx.shadowBlur = 12;
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, 7); ctx.fill();
        ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = segColor(Math.max(1, VG.cur)); ctx.stroke();
      }
    }
  }

  function drawCharts() {
    const cv = document.getElementById("kv-charts"); if (!cv) return;
    const W = Math.max(cv.parentElement.clientWidth - 24, 160), C2 = VG.col;
    const ch = VG.channels, rowH = 80, gap = 10, padT = 4;
    const H = padT + ch.length * (rowH + gap);
    const ctx = prep(cv, W, H); ctx.clearRect(0, 0, W, H);
    const plotL = 54, plotR = W - 48, plotW = Math.max(plotR - plotL, 40);
    const i0 = VG.i0, i1 = VG.i1, m = VG.d.m;
    const xAt = i => plotL + ((i - i0) / Math.max(i1 - i0, 1)) * plotW;
    VG.chartGeom = { plotL, plotR, plotW, rowH, gap, padT, i0, i1, xAt, rows: [] };

    ch.forEach((c, idx) => {
      const top = padT + idx * (rowH + gap), bot = top + rowH;
      const [lo, hi] = chScale(c);
      const yAt = v => bot - ((v - lo) / Math.max(hi - lo, 1e-6)) * rowH;
      VG.chartGeom.rows.push({ top, bot, c, lo, hi, yAt });
      // Panel
      ctx.fillStyle = "rgba(255,255,255,.02)"; ctx.fillRect(plotL, top, plotW, rowH);
      ctx.strokeStyle = C2.grid; ctx.lineWidth = 1;
      ctx.strokeRect(plotL + .5, top + .5, plotW, rowH);
      // Nulllinie
      if (lo < 0 && hi > 0) { const zy = yAt(0); ctx.strokeStyle = C2.zero; ctx.beginPath(); ctx.moveTo(plotL, zy); ctx.lineTo(plotR, zy); ctx.stroke(); }
      // Kanal als gefüllte Fläche in eigener Farbe; Vergleich als gestrichelte Linie
      const col = CH_COL[c.key] || C2.a;
      const base = (lo < 0 && hi > 0) ? yAt(0) : bot;
      fillArea(ctx, c.a, i0, i1, xAt, yAt, top, base, col);
      if (c.b) vgSeriesDash(ctx, c.b, i0, i1, xAt, yAt, "rgba(210,215,228,.85)", 1.3);
      vgSeries(ctx, c.a, i0, i1, xAt, yAt, col, 2.2);
      // Beschriftung: Kanalname links, Min/Max rechts neben dem Plot
      ctx.textAlign = "left"; ctx.fillStyle = "#e6e9ef"; ctx.font = "700 12px " + cssVar("--disp", "system-ui");
      ctx.fillText(c.label, 4, top + 14);
      ctx.fillStyle = C2.txt; ctx.font = "600 10px system-ui"; ctx.textAlign = "left";
      ctx.fillText(fmt(hi, c.dec) + c.unit, plotR + 5, top + 9);
      ctx.fillText(fmt(lo, c.dec) + c.unit, plotR + 5, bot - 1);
    });

    // Distanzachse
    ctx.fillStyle = C2.txt; ctx.font = "600 10px system-ui"; ctx.textAlign = "center";
    for (let f = 0; f <= 1.0001; f += 0.25) { const i = Math.round(i0 + f * (i1 - i0)); const px = plotL + f * plotW; ctx.fillText(Math.round(m[i]) + " m", px, H - 2); }

    // Crosshair + Werte direkt am Cursor (du farbig, Vergleich hell)
    if (VG.cur >= i0 && VG.cur <= i1) {
      const px = xAt(VG.cur);
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, H - 12); ctx.stroke();
      const left = px > plotR - 64;
      VG.chartGeom.rows.forEach(r => {
        const c = r.c, col = CH_COL[c.key] || C2.a;
        const av = c.a ? c.a[VG.cur] : null, bv = c.b ? c.b[VG.cur] : null;
        if (bv != null && isFinite(bv)) { ctx.fillStyle = "rgba(210,215,228,.9)"; ctx.beginPath(); ctx.arc(px, r.yAt(bv), 2.4, 0, 7); ctx.fill(); }
        if (av != null && isFinite(av)) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, r.yAt(av), 3, 0, 7); ctx.fill(); }
        if (av != null && isFinite(av)) {
          ctx.textAlign = left ? "right" : "left"; const lx = left ? px - 6 : px + 6;
          ctx.font = "800 10px " + cssVar("--disp", "system-ui");
          ctx.fillStyle = col; ctx.fillText(fmt(av, c.dec), lx, r.top + 11);
          if (bv != null && isFinite(bv)) { ctx.fillStyle = "rgba(210,215,228,.9)"; ctx.fillText(fmt(bv, c.dec), lx, r.top + 22); }
        }
      });
    }
    // Auswahlrechteck beim Ziehen
    if (VG.sel) { const x1 = Math.min(VG.sel.a, VG.sel.b), x2 = Math.max(VG.sel.a, VG.sel.b); ctx.fillStyle = "rgba(108,192,255,.18)"; ctx.fillRect(x1, padT, x2 - x1, H - padT - 12); }
  }

  function vgSeries(ctx, arr, i0, i1, xAt, yAt, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.beginPath();
    let s = false;
    for (let i = i0; i <= i1; i++) { const v = arr[i]; if (v == null || !isFinite(v)) { s = false; continue; } const px = xAt(i), py = yAt(v); if (!s) { ctx.moveTo(px, py); s = true; } else ctx.lineTo(px, py); }
    ctx.stroke();
  }

  function chScale(c) {
    if (c.min != null && c.max != null) return [c.min, c.max];
    let lo = Infinity, hi = -Infinity;
    const scan = a => { if (!a) return; for (const v of a) { if (v == null || !isFinite(v)) continue; if (v < lo) lo = v; if (v > hi) hi = v; } };
    scan(c.a); scan(c.b);
    if (!isFinite(lo)) return [0, 1];
    if (c.kind === "delta" || c.kind === "linie") { const mx = Math.max(Math.abs(lo), Math.abs(hi), c.kind === "delta" ? 0.05 : 0.2); return [-mx, mx]; }
    if (lo === hi) hi = lo + 1;
    const p = (hi - lo) * 0.08; return [lo - p, hi + p];
  }

  function drawAll() { try { drawMap(); drawCharts(); } catch (e) { /* egal */ } }

  /* ---- Abschnitt für Abschnitt durchsteppen (wie Segment-Ansicht) ---- */
  function vgSegRange(idx) {
    const d = VG.d, n = d.m.length - 1;
    if (idx < 0 || !d.kurven || !d.kurven[idx]) return [0, n];
    const k = d.kurven[idx];
    let lo, hi;
    if (VG.single) { const L = d.laenge || 1; lo = (k.bremse_m - 120) / L; hi = (k.gas_m + 120) / L; }
    else { lo = k.lo; hi = k.hi; }
    let i0 = Math.max(0, Math.round(lo * n)), i1 = Math.min(n, Math.round(hi * n));
    if (i1 - i0 < 8) { i0 = 0; i1 = n; }
    return [i0, i1];
  }
  function vgSegLabelHTML(idx) {
    const d = VG.d;
    if (idx < 0 || !d.kurven || !d.kurven[idx]) return "Ganze Runde";
    const k = d.kurven[idx];
    if (VG.single) return `Kurve ${k.nr} · Vmin <b>${k.vmin}</b> km/h · Gang ${k.gang}`;
    return `Kurve ${k.nr} · <span class="${deltaCls(k.dt)}">${fmtSign(k.dt, 2)} s</span>`;
  }
  function vgApplySeg(idx) {
    const n = (VG.d.kurven || []).length;
    if (idx < -1) idx = n - 1;
    if (idx >= n) idx = -1;
    VG.seg = idx;
    const [i0, i1] = vgSegRange(idx); VG.i0 = i0; VG.i1 = i1;
    const lab = document.getElementById("kv-seg-label");
    if (lab) lab.innerHTML = vgSegLabelHTML(idx);
    drawAll();
  }
  function wireSeg() {
    VG.seg = -1;
    const prev = document.getElementById("kv-seg-prev"), next = document.getElementById("kv-seg-next");
    if (prev) prev.onclick = () => vgApplySeg(VG.seg - 1);
    if (next) next.onclick = () => vgApplySeg(VG.seg + 1);
  }
  function vgSegReset() { VG.seg = -1; const lab = document.getElementById("kv-seg-label"); if (lab) lab.innerHTML = "Ganze Runde"; }

  function idxAtX(px) { const g = VG.chartGeom; if (!g) return -1; const i = Math.round(g.i0 + ((px - g.plotL) / g.plotW) * (g.i1 - g.i0)); return Math.max(g.i0, Math.min(g.i1, i)); }

  function setCursor(i) {
    VG.cur = i;
    if (!VG.raf) { VG.raf = true; requestAnimationFrame(() => { VG.raf = false; drawCharts(); drawMap(); }); }
    updateReadout(i);
    const sc = document.getElementById("kv-scrub");
    if (sc && i >= 0 && VG.i1 > VG.i0) sc.value = Math.round((i - VG.i0) / (VG.i1 - VG.i0) * 1000);
    const pt = document.getElementById("kv-play-t");
    if (pt) pt.textContent = i >= 0 ? Math.round(VG.d.m[i]) + " m" : "–";
  }
  function vgPlayTick(ts) {
    if (!VG.playing) return;
    if (!VG.playT0) VG.playT0 = ts;
    const span = Math.max(VG.i1 - VG.i0, 1), dur = Math.max(2500, span * 6);
    const ph = ((ts - VG.playT0) / dur) % 1;
    setCursor(Math.round(VG.i0 + ph * span));
    requestAnimationFrame(vgPlayTick);
  }
  function vgPlayStop() { VG.playing = false; const b = document.getElementById("kv-play-btn"); if (b) b.textContent = "▶"; }
  function wirePlay() {
    VG.playing = false;
    const btn = document.getElementById("kv-play-btn"), sc = document.getElementById("kv-scrub");
    if (btn) btn.onclick = () => { VG.playing = !VG.playing; btn.textContent = VG.playing ? "⏸" : "▶"; if (VG.playing) { VG.playT0 = 0; requestAnimationFrame(vgPlayTick); } };
    if (sc) sc.oninput = () => { vgPlayStop(); setCursor(Math.round(VG.i0 + (sc.value / 1000) * (VG.i1 - VG.i0))); };
  }

  function updateReadout(i) {
    const el = document.getElementById("kv-read"); if (!el) return;
    if (i < 0) { el.innerHTML = '<span class="kv-read-hint">Maus über die Kurven: Punkt erscheint auf der Karte · ziehen = zoomen · Doppelklick = zurück</span>'; return; }
    const d = VG.d, parts = [`<b>${Math.round(d.m[i])} m</b>`];
    if (!VG.single && d.delta) parts.push(`Δ <b class="${deltaCls(d.delta[i])}">${fmtSign(d.delta[i], 2)} s</b>`);
    VG.channels.forEach(c => {
      if (c.key === "delta") return;
      if (c.key === "linie") { parts.push(`Linie ${fmtSign(d.linie[i], 1)} m`); return; }
      const av = c.a ? c.a[i] : null, bv = c.b ? c.b[i] : null;
      parts.push(`${c.label} <b>${fmt(av, c.dec)}</b>${bv != null ? "/" + fmt(bv, c.dec) : ""}${c.unit}`);
    });
    el.innerHTML = parts.join(" · ");
  }

  function wireVgCanvas() {
    const cv = document.getElementById("kv-charts"), mp = document.getElementById("kv-map");
    if (cv) {
      cv.onmousemove = e => { const r = cv.getBoundingClientRect(), px = e.clientX - r.left; if (VG.drag) VG.sel = { a: VG.drag.px, b: px }; setCursor(idxAtX(px)); };
      cv.onmouseleave = () => { if (!VG.drag) setCursor(-1); };
      cv.onmousedown = e => {
        const r = cv.getBoundingClientRect(); VG.drag = { px: e.clientX - r.left }; VG.sel = { a: VG.drag.px, b: VG.drag.px };
        VG.docUp = () => {
          const sel = VG.sel; vgCleanup();
          if (sel) { const ia = idxAtX(Math.min(sel.a, sel.b)), ib = idxAtX(Math.max(sel.a, sel.b)); if (ib - ia >= 8) { VG.i0 = ia; VG.i1 = ib; vgSegReset(); } }
          drawAll();
        };
        document.addEventListener("mouseup", VG.docUp);
      };
      cv.ondblclick = () => { VG.i0 = 0; VG.i1 = VG.d.m.length - 1; vgSegReset(); drawAll(); };
    }
    if (mp) {
      mp.onmousemove = e => {
        const g = VG.mapGeom; if (!g) return; const r = mp.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        const xs = g.mx || g.rx, ys = g.my || g.ry; if (!xs) return;
        let best = -1, bd = 1e9; for (let i = 0; i < xs.length; i += 2) { if (xs[i] == null) continue; const dx = g.PX(xs[i]) - px, dy = g.PY(ys[i]) - py, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
        if (best >= 0 && bd < 900) setCursor(best);
      };
      mp.onmouseleave = () => setCursor(-1);
    }
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
      ["Welche Runde?", "Deine letzte eigene Runde (der Coach schreibt jede Runde mit), die aktuelle Referenzrunde oder eine hochgeladene CSV."],
    ]],
    ["Streckenvergleich", [
      ["Zwei Runden übereinander", "Wie der Garage-61-Analyzer: links deine Runde (rot), rechts die Vergleichsrunde (blau). Meist deine letzte eigene gegen die geladene Referenz. Oben steht, wie viel du über die ganze Runde verlierst oder gewinnst."],
      ["Nur ansehen (ohne Vergleich)", "Stell „Vergleich“ auf „nur ansehen (kein Vergleich)“, dann siehst du die Telemetrie einer einzelnen Runde für sich – Streckenkarte, Speed, Gas, Bremse, Gang, Lenkung und je Kurve Bremspunkt, Gaspunkt, Eingangs- und Scheitelspeed."],
      ["Streckenkarte", "Deine Linie dick und eingefärbt (grün = schneller, rot = langsamer, oder nach Speed), die Vergleichslinie dünn. Fährst du mit der Maus über die Kurven unten, wandert der Punkt auf der Karte mit."],
      ["Kanäle", "Delta, Speed, Gas, Bremse, Gang, Lenkung und die Fahrlinie – alle übereinander mit gemeinsamem Fadenkreuz. Ziehen zoomt in einen Abschnitt, Doppelklick zoomt zurück."],
      ["Kurve für Kurve", "Die Tabelle zeigt je Kurve den Zeitverlust, Brems- und Gaspunkt, Kurven- und Ausgangstempo und einen Tipp. „Top 3“ nennt die drei Kurven, in denen am meisten Zeit liegt. Eine Zeile anklicken zoomt auf die Kurve."],
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
