/* ===========================================================
   STINTPLANER  Flag to Flag Motorsport
   Rennen anlegen, bis zu 4 Autos, Fahrer + Verfügbarkeit,
   Pace/Sprit aus Garage 61, Stints rechnen, Live-Abgleich.
   Wird von team.js eingebunden (window.F2FStint.mount).
   =========================================================== */
(function () {
  let C = null, root = null, META = null;
  let alive = 0;
  const S = { id: null, plan: null, rev: 0, av: {}, me: null, canDelete: false, dirty: false, tab: "rennen", car: 0, live: null, liveAt: 0, g61: {} };
  const LIVE_MS = 5 * 60 * 1000;
  const VCOL = { 2: "ja", 1: "evtl", 0: "nein" };
  const VTXT = { 2: "Verfügbar", 1: "Vielleicht", 0: "Nicht verfügbar" };

  /* ---------------- Helfer ---------------- */
  const esc = (s) => C.esc(s);
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const pad = (n) => String(n).padStart(2, "0");
  const uhr = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const tagUhr = (ms) => new Date(ms).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const dauer = (ms) => { const m = Math.round(ms / 60000); const h = Math.floor(m / 60); return (h ? h + " h " : "") + pad(m % 60) + " min"; };
  const fmtLap = (s) => { if (!(s > 0)) return ""; const m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + r.toFixed(3); };
  const parseLap = (v) => {
    v = String(v || "").trim().replace(",", ".");
    if (!v) return 0;
    const m = v.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  const num = (v, d = 0) => { const x = Number(String(v).replace(",", ".")); return Number.isFinite(x) ? x : d; };
  const toLocalInput = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const fromLocalInput = (v) => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : null; };
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const keyNeu = () => Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  const loading = '<div class="tm-loading"><span></span><span></span><span></span></div>';
  const memberName = (uid) => { const m = META && META.members.find(x => x.id === uid); return m ? m.name : "Unbekannt"; };

  function g61Vorschlag(uid, name) {
    if (!META) return "";
    if (META.map[uid] && META.g61drivers.some(x => x.slug === META.map[uid])) return META.map[uid];
    const n = norm(name);
    if (!n) return "";
    const hit = META.g61drivers.find(x => norm(x.name) === n)
      || META.g61drivers.find(x => { const g = norm(x.name); return g && (g.includes(n) || n.includes(g)); })
      || META.g61drivers.find(x => norm(x.name).split(" ")[0] === n.split(" ")[0]);
    return hit ? hit.slug : "";
  }

  const PIT_STD = { tank: 100, reserve: 0.5, rate: 2.5, lane: 60, reifen: 20, wechsel: 0, reifenAlle: 1, parallel: true };
  function neuerPlan() {
    const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(14, 0, 0, 0);
    return { name: "", trackId: 0, trackName: "", start: d.getTime(), mode: "zeit", dauerMin: 360, runden: 100, notiz: "", cars: [neuesAuto(0, d.getTime())] };
  }
  function neuesAuto(i, start, pit) { return { key: keyNeu(), name: "Auto #" + (i + 1), carId: 0, carName: "", start, pit: { ...(pit || PIT_STD) }, drivers: [], stints: [] }; }
  // ältere Pläne: Startzeit und Boxenstopp-Werte lagen beim Rennen, jetzt pro Auto
  function normalisiere(p) {
    for (const c of p.cars) {
      if (!c.start) c.start = p.start;
      if (!c.pit) c.pit = { ...PIT_STD, ...(p.pit || {}) };
    }
    delete p.pit;
    ersterStart(p);
    return p;
  }
  function ersterStart(p) { if (p.cars.length) p.start = Math.min(...p.cars.map(c => c.start)); }

  /* ---------------- Berechnung ---------------- */
  function carStart(car) { return car.start || S.plan.start; }
  function raceEnd(car) { return S.plan.mode === "zeit" ? carStart(car) + S.plan.dauerMin * 60000 : null; }

  // live = Daten vom Worker für dieses Auto (echte Stints) oder null
  function rechne(car, live) {
    const P = car.pit, plan = S.plan;
    const drv = {};
    car.drivers.forEach(d => (drv[d.uid] = d));
    const mitPace = car.drivers.filter(d => d.pace > 0);
    const mitSprit = car.drivers.filter(d => d.fuel > 0);
    const avgPace = mitPace.length ? mitPace.reduce((a, d) => a + d.pace, 0) / mitPace.length : 0;
    const avgFuel = mitSprit.length ? mitSprit.reduce((a, d) => a + d.fuel, 0) / mitSprit.length : 0;
    const uidVonG61 = (sl) => (car.drivers.find(d => d.g61 && d.g61 === sl) || {}).uid || "";
    const fahrerFuer = (i) => {
      const a = car.stints[i];
      if (a && drv[a.d]) return a.d;
      return car.drivers.length ? car.drivers[i % car.drivers.length].uid : "";
    };
    const werte = (uid) => {
      const d = drv[uid] || {};
      return { pace: d.pace > 0 ? d.pace : avgPace, fuel: d.fuel > 0 ? d.fuel : avgFuel };
    };
    const maxRunden = (fuel) => fuel > 0 ? Math.max(1, Math.floor((P.tank - P.reserve) / fuel)) : 0;
    const ende = raceEnd(car);
    let rest = plan.mode === "runden" ? plan.runden : Infinity;
    let t = carStart(car);
    const rows = [];
    const fehler = [];
    if (!car.drivers.length) fehler.push("Keine Fahrer eingeteilt");
    if (!(avgPace > 0)) fehler.push("Keine Rundenzeiten (Pace) eingetragen");
    if (!(avgFuel > 0)) fehler.push("Kein Spritverbrauch eingetragen");
    if (fehler.length) return { rows, fehler };

    // echte Stints aus Garage 61 vorneweg
    let laufend = null;
    if (live && live.stints && live.stints.length) {
      for (const s of live.stints) {
        const uid = uidVonG61(s.g61);
        if (s.fertig) {
          rows.push({ i: rows.length, uid, name: uid ? memberName(uid) : s.name, von: s.von, bis: s.bis, laps: s.laps, pace: s.pace, fuel: s.fuel, real: "fertig" });
          rest -= s.laps;
        } else laufend = { ...s, uid };
      }
      if (rows.length && !laufend) {
        const letzte = rows[rows.length - 1];
        const naechste = werte(fahrerFuer(rows.length));
        letzte.pit = boxStopp(rows.length - 1, letzte.uid, fahrerFuer(rows.length), maxRunden(naechste.fuel) * naechste.fuel + P.reserve, letzte.fuel);
        t = letzte.bis + letzte.pit.total * 1000;
      }
    }

    function boxStopp(i, uid, uidNext, brauche, verbraucht) {
      const rein = Math.max(0, Math.min(P.tank, brauche) - Math.max(0, P.tank - verbraucht));
      const a = car.stints[i + 1] || {};
      const reifen = a.reifen === true || a.reifen === false ? a.reifen : P.reifenAlle > 0 && (i + 1) % P.reifenAlle === 0;
      const wechsel = !!uidNext && uidNext !== uid;
      const tankS = rein / P.rate;
      const teile = [tankS, reifen ? P.reifen : 0, wechsel ? P.wechsel : 0];
      const steh = P.parallel ? Math.max(...teile) : teile.reduce((x, y) => x + y, 0);
      return { rein, tankS, reifen, wechsel, steh, total: P.lane + steh };
    }

    let guard = 0;
    while (guard++ < 300) {
      if (ende !== null && t >= ende && !laufend) break;
      if (ende === null && rest <= 0) break;
      const i = rows.length;
      let uid = fahrerFuer(i), w = werte(uid);
      const a = car.stints[i] || {};
      const max = maxRunden(w.fuel);
      let laps = a.laps > 0 ? Math.min(a.laps, max) : max;
      let row;
      if (laufend) {
        uid = laufend.uid || uid; w = werte(uid);
        const lmax = maxRunden(w.fuel);
        let geplant = a.laps > 0 ? Math.min(a.laps, lmax) : lmax;
        const offen = Math.max(0, geplant - laufend.laps);
        let restLaps = offen;
        const tl = laufend.bis || laufend.von;
        if (ende !== null) restLaps = Math.min(offen, Math.max(0, Math.ceil((ende - tl) / 1000 / w.pace)));
        else restLaps = Math.min(offen, Math.max(0, rest - laufend.laps));
        laps = laufend.laps + restLaps;
        row = { i, uid, name: uid ? memberName(uid) : laufend.name, von: laufend.von, bis: tl + restLaps * w.pace * 1000, laps, pace: laufend.pace || w.pace, fuel: laps * w.fuel, real: "laufend", gefahren: laufend.laps };
        laufend = null;
      } else {
        let letzter = false;
        if (ende !== null) {
          const bisEnde = Math.max(1, Math.ceil((ende - t) / 1000 / w.pace));
          if (laps >= bisEnde) { laps = bisEnde; letzter = true; }
        } else if (laps >= rest) { laps = rest; letzter = true; }
        row = { i, uid, name: memberName(uid), von: t, bis: t + laps * w.pace * 1000, laps, pace: w.pace, fuel: laps * w.fuel, letzter };
      }
      rows.push(row);
      rest -= row.laps;
      const fertig = ende !== null ? row.bis >= ende : rest <= 0;
      if (fertig) { row.letzter = true; break; }
      const uidN = fahrerFuer(i + 1), wn = werte(uidN);
      const an = car.stints[i + 1] || {};
      let lapsN = an.laps > 0 ? Math.min(an.laps, maxRunden(wn.fuel)) : maxRunden(wn.fuel);
      const tNach = row.bis + (P.lane + (P.tank / P.rate)) * 1000;
      if (ende !== null) lapsN = Math.min(lapsN, Math.max(1, Math.ceil((ende - tNach) / 1000 / wn.pace)));
      else lapsN = Math.min(lapsN, rest);
      row.pit = boxStopp(i, uid, uidN, lapsN * wn.fuel + P.reserve, row.fuel);
      t = row.bis + row.pit.total * 1000;
    }
    return { rows, fehler: [] };
  }

  // schlechteste Verfügbarkeit eines Fahrers im Zeitraum: 2 ja, 1 vielleicht, 0 nein, -1 nichts eingetragen
  function verfuegbar(uid, von, bis, car) {
    const a = S.av[uid] && S.av[uid].slots;
    if (!a) return -1;
    let schlecht = 3, offen = false;
    const L = slotLen(car);
    for (const t of slotZeiten(car)) {
      const tEnd = t + L;
      if (tEnd <= von || t >= bis) continue;
      const v = a[t];
      if (v === undefined) offen = true;
      else schlecht = Math.min(schlecht, v);
    }
    if (schlecht === 0) return 0;
    if (offen) return schlecht === 3 ? -1 : 1;
    return schlecht === 3 ? -1 : schlecht;
  }

  /* ---------------- Zeitraster für Verfügbarkeit (pro Auto, ohne Auto = alle Autos) ---------------- */
  function fenster(car) {
    const p = S.plan;
    let von = Infinity, bis = 0;
    for (const c of car ? [car] : p.cars) {
      const s = carStart(c);
      von = Math.min(von, s);
      let e = raceEnd(c);
      if (e === null) { const r = rechne(c, null).rows; e = r.length ? r[r.length - 1].bis : s + 3 * 3600000; }
      bis = Math.max(bis, e);
    }
    if (von === Infinity) { von = p.start; bis = p.start + (p.mode === "zeit" ? p.dauerMin * 60000 : 3 * 3600000); }
    return { von, bis };
  }
  function slotLen(car) { const f = fenster(car); return f.bis - f.von > 8 * 3600000 ? 3600000 : 1800000; }
  function slotZeiten(car) {
    const f = fenster(car), L = slotLen(car);
    const out = [];
    let t = Math.floor(f.von / L) * L;
    while (t < f.bis && out.length < 120) { out.push(t); t += L; }
    return out;
  }

  /* ---------------- Mount ---------------- */
  async function mount(el, ctx, sub) {
    C = ctx; root = el; alive++;
    const mine = alive;
    S.live = null; S.liveAt = 0; ABS = null;
    root.innerHTML = C.panelHead("stint", "Stintplaner") + loading;
    try { if (!META) META = await C.api("/stint/meta"); }
    catch (e) { root.innerHTML = C.panelHead("stint", "Stintplaner") + `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (mine !== alive) return;
    if (sub === "neu") { S.id = null; S.plan = neuerPlan(); S.rev = 0; S.av = {}; S.me = C.ME.user.id; S.canDelete = true; S.dirty = true; S.tab = "rennen"; S.car = 0; return renderPlan(); }
    if (sub) return ladePlan(sub, mine);
    renderListe(mine);
  }

  window.addEventListener("beforeunload", (e) => { if (S.dirty && root && document.body.contains(root)) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------------- Übersicht ---------------- */
  async function renderListe(mine) {
    S.dirty = false;
    let d;
    try { d = await C.api("/stint/list"); } catch (e) { root.innerHTML = C.panelHead("stint", "Stintplaner") + `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (mine !== alive) return;
    const now = Date.now();
    const meinId = C.ME.user.id;
    const karte = (p) => {
      const ich = p.cars.some(c => c.drivers.includes(meinId));
      const laenge = p.mode === "runden" ? p.runden + " Runden" : dauer(p.dauerMin * 60000);
      const status = p.start > now ? "" : (p.mode === "zeit" && now < p.start + p.dauerMin * 60000 + 3600000) ? '<span class="tm-badge live">Läuft</span>' : '<span class="tm-badge grey">Vorbei</span>';
      return `<a class="sp-card" href="#stint/${esc(p.id)}">
        <div class="sp-card-h"><b>${esc(p.name)}</b>${status}${ich ? '<span class="tm-badge">Du fährst</span>' : ""}</div>
        <div class="sp-card-m">${esc(p.track || "Strecke offen")}</div>
        <div class="sp-card-f"><span>${C.ICONS.calendar}${tagUhr(p.start)}</span><span>${C.ICONS.clock}${laenge}</span><span>${C.ICONS.car}${p.cars.length} ${p.cars.length === 1 ? "Auto" : "Autos"}</span></div>
        ${p.cars.map(c => `<div class="sp-card-car">
          <div class="sp-card-carh"><b>${esc(c.name)}</b>${c.carName ? `<span>${esc(c.carName)}</span>` : ""}${c.start && p.cars.length > 1 ? `<small>${tagUhr(c.start)}</small>` : ""}</div>
          ${c.drivers.length ? `<div class="sp-card-drv">${c.drivers.map(u => {
            const ok = p.av ? p.av[u] : null;
            return `<span class="${u === meinId ? "ich" : ""}">${ok === true ? '<i class="ok" title="Verfügbarkeit eingetragen">✓</i>' : ok === false ? '<i class="fehlt" title="Verfügbarkeit fehlt noch">!</i>' : ""}${esc(memberName(u))}</span>`;
          }).join("")}</div>` : '<div class="sp-card-drv"><em>Noch keine Fahrer</em></div>'}
        </div>`).join("")}
        ${p.av && Object.values(p.av).some(v => !v) ? `<div class="sp-card-hint">Verfügbarkeit fehlt noch: ${Object.entries(p.av).filter(([, v]) => !v).map(([u]) => esc(memberName(u))).join(", ")}</div>` : ""}
      </a>`;
    };
    const kommend = d.list.filter(p => p.start + (p.mode === "zeit" ? p.dauerMin * 60000 : 0) + 3600000 > now);
    const alt = d.list.filter(p => !kommend.includes(p)).reverse();
    root.innerHTML = C.panelHead("stint", "Stintplaner") + `
      <div class="sp-top"><p class="tm-muted">Rennen anlegen, Fahrer auf Autos verteilen, Verfügbarkeit sammeln und Stints planen. Pace und Sprit kommen aus Garage 61.</p>
        <a class="tm-btn red" href="#stint/neu"><span>+ Neuer Plan</span></a></div>
      <div class="td-label">Kommende Rennen</div>
      ${kommend.length ? `<div class="sp-cards">${kommend.map(karte).join("")}</div>` : '<div class="tm-box"><p class="tm-muted">Noch kein Rennen geplant.</p></div>'}
      ${alt.length ? `<div class="td-label">Vergangene Rennen</div><div class="sp-cards alt">${alt.map(karte).join("")}</div>` : ""}
      ${META.isAdmin ? `<p class="tm-muted" style="margin-top:18px">Standard-Kanal und Pings stellst du unter <a class="r" href="#admin">Admin → Stintplaner</a> ein.</p>` : ""}`;
  }

  /* ---------------- Plan laden ---------------- */
  async function ladePlan(id, mine) {
    let d;
    try { d = await C.api("/stint/plan?id=" + encodeURIComponent(id)); }
    catch (e) { root.innerHTML = C.panelHead("stint", "Stintplaner") + `<div class="tm-box tm-err">${esc(e.message)}</div><a class="tm-btn" href="#stint"><span>Zur Übersicht</span></a>`; return; }
    if (mine !== alive) return;
    S.id = d.plan.id; S.plan = normalisiere(d.plan); S.rev = d.plan.rev; S.av = d.av || {}; S.me = d.me; S.canDelete = d.canDelete;
    S.dirty = false; S.car = Math.min(S.car, Math.max(0, S.plan.cars.length - 1));
    if (S.id !== S.lastId) { S.tab = istLive() ? "live" : "rennen"; S.car = 0; S.lastId = S.id; }
    renderPlan();
  }
  function istLive() {
    const p = S.plan, now = Date.now();
    return p.cars.some(c => { const s = carStart(c); const e = raceEnd(c) || s + 48 * 3600000; return now > s - 1800000 && now < e + 2 * 3600000; });
  }

  /* ---------------- Plan-Ansicht ---------------- */
  const TABS = [["rennen", "Rennen"], ["autos", "Fahrzeuge & Fahrer"], ["verf", "Verfügbarkeit"], ["plan", "Stintplan"], ["live", "Live"]];
  function renderPlan() {
    const p = S.plan;
    root.innerHTML = `
      <div class="sp-head">
        <a class="sp-back" href="#stint" id="sp-back">← Übersicht</a>
        <div class="sp-title"><h3>${esc(p.name || "Neuer Plan")}</h3><small>${esc(p.trackName || "Strecke offen")} · ${tagUhr(p.start)}</small></div>
        <div class="sp-actions">
          <span class="sp-dirty" id="sp-dirty" ${S.dirty ? "" : "hidden"}>Nicht gespeichert</span>
          ${C.btn("Speichern", "red", 'id="sp-save"')}
        </div>
      </div>
      <div class="g6-tabs sp-tabs">${TABS.map(([k, l]) => `<button type="button" data-tab="${k}" class="${S.tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div id="sp-body"></div>`;
    $("#sp-save").onclick = speichern;
    $("#sp-back").onclick = (e) => { if (S.dirty && !confirm("Ungespeicherte Änderungen verwerfen?")) e.preventDefault(); else S.dirty = false; };
    $$("[data-tab]").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; $$("[data-tab]").forEach(x => x.classList.toggle("on", x === b)); renderTab(); });
    renderTab();
  }
  function dirty() { S.dirty = true; const d = $("#sp-dirty"); if (d) d.hidden = false; }
  function renderTab() {
    const body = $("#sp-body");
    if (!body) return;
    if (S.tab === "rennen") return tabRennen(body);
    if (S.tab === "autos") return tabAutos(body);
    if (S.tab === "verf") return tabVerf(body);
    if (S.tab === "plan") return tabPlan(body);
    if (S.tab === "live") return tabLive(body);
  }

  async function speichern() {
    const b = $("#sp-save");
    if (!S.plan.name.trim()) { C.toast("Bitte einen Namen fürs Rennen eintragen"); S.tab = "rennen"; return renderPlan(); }
    b.disabled = true;
    try {
      // geplante Stint-Starts mitschicken, damit der Bot die Fahrer vorher anpingen kann
      S.plan.schedule = S.plan.cars.flatMap(c => rechne(c, null).rows.map(x => ({ c: c.key, i: x.i, u: x.uid, v: Math.round(x.von) })));
      const r = await C.api("/stint/plan", { method: "POST", body: { id: S.id, rev: S.rev, plan: S.plan } });
      C.toast(r.info || "Gespeichert", true);
      S.dirty = false;
      const alt = META;
      META = await C.api("/stint/meta").catch(() => alt);
      if (!S.id) { S.lastId = r.id; location.hash = "stint/" + r.id; return; }
      await ladePlan(r.id, alive);
    } catch (e) { C.toast(e.message); b.disabled = false; }
  }

  /* ---------------- Reiter: Rennen ---------------- */
  function tabRennen(body) {
    const p = S.plan;
    const h = Math.floor(p.dauerMin / 60), m = p.dauerMin % 60;
    body.innerHTML = `
      <div class="tm-box"><h5>Rennen</h5>
        <div class="tm-row"><label for="sp-name">Name</label><input class="tm-input" id="sp-name" maxlength="80" placeholder="z. B. Spa 6h, Liga Lauf 3" value="${esc(p.name)}"></div>
        <div class="tm-row"><label for="sp-track">Strecke<small>aus Garage 61, tippen zum Suchen</small></label>
          <div><input class="tm-input" id="sp-track" list="sp-tracks" placeholder="Strecke suchen …" value="${esc(p.trackName)}"><datalist id="sp-tracks">${META.tracks.map(t => `<option value="${esc(t.name)}">`).join("")}</datalist>
          ${META.tracks.length ? "" : '<small class="tm-muted">Streckenliste aus Garage 61 nicht verfügbar, Name frei eintragen.</small>'}</div></div>
        <div class="tm-row"><div class="lbl">Renndauer</div>
          <div><div class="sp-seg" id="sp-mode"><button type="button" data-m="zeit" class="${p.mode === "zeit" ? "on" : ""}">Nach Zeit</button><button type="button" data-m="runden" class="${p.mode === "runden" ? "on" : ""}">Nach Runden</button></div>
          <div class="sp-inline" style="margin-top:10px">${p.mode === "zeit"
            ? `<input class="tm-input sp-num" id="sp-h" type="number" min="0" max="48" value="${h}"><span>Std.</span><input class="tm-input sp-num" id="sp-m" type="number" min="0" max="59" step="5" value="${m}"><span>Min.</span>`
            : `<input class="tm-input sp-num" id="sp-runden" type="number" min="1" max="5000" value="${p.runden}"><span>Runden</span>`}</div></div></div>
        <div class="tm-row"><label for="sp-chan">Discord-Kanal<small>für Pings und Posts zu diesem Rennen</small></label>
          <div><select class="tm-select" id="sp-chan"><option value="">Standard${stdKanal() ? " (# " + esc(stdKanal()) + ")" : " (keiner eingestellt)"}</option>${(META.channels || []).map(c => `<option value="${c.id}" ${c.id === p.channel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><label for="sp-notiz">Notiz<small>optional</small></label><textarea class="tm-input" id="sp-notiz" rows="3" maxlength="600" placeholder="z. B. Pflichtstopps, Setup, Treffpunkt im Discord …">${esc(p.notiz)}</textarea></div>
      </div>
      <p class="tm-muted" style="margin:-4px 0 14px">Startdatum, Startzeit und Boxenstopp-Werte stellst du pro Auto unter „Fahrzeuge &amp; Fahrer" ein.</p>
      ${S.id && S.canDelete ? `<div class="tm-actions" style="margin-top:6px">${C.btn("Plan löschen", "sm", 'id="sp-del"')}</div>` : ""}`;
    const on = (id, ev, fn) => { const e = $("#" + id); if (e) e.addEventListener(ev, fn); };
    on("sp-name", "input", (e) => { p.name = e.target.value; dirty(); });
    on("sp-track", "change", (e) => {
      const v = e.target.value.trim();
      const t = META.tracks.find(x => x.name === v) || META.tracks.find(x => norm(x.name) === norm(v));
      p.trackName = t ? t.name : v; p.trackId = t ? t.id : 0; dirty();
      if (!t && v && META.tracks.length) C.toast("Strecke nicht in Garage 61 gefunden. Ohne Treffer gibt es keine Werte aus Garage 61.");
    });
    $$("#sp-mode [data-m]").forEach(b => b.onclick = () => { p.mode = b.dataset.m; dirty(); tabRennen(body); });
    const dauerSet = () => { p.dauerMin = Math.max(10, Math.round(num($("#sp-h").value) * 60 + num($("#sp-m").value))); dirty(); };
    on("sp-h", "change", dauerSet); on("sp-m", "change", dauerSet);
    on("sp-runden", "change", (e) => { p.runden = Math.max(1, Math.round(num(e.target.value, 100))); dirty(); });
    on("sp-notiz", "input", (e) => { p.notiz = e.target.value; dirty(); });
    on("sp-chan", "change", (e) => { p.channel = e.target.value; dirty(); });
    on("sp-del", "click", async () => {
      if (!confirm("Diesen Plan wirklich löschen? Das geht nicht rückgängig.")) return;
      try { const r = await C.api("/stint/plan/delete", { method: "POST", body: { id: S.id } }); C.toast(r.info, true); S.dirty = false; location.hash = "stint"; }
      catch (e) { C.toast(e.message); }
    });
  }
  const feld = (k, l, s, v, step = 1) => `<label class="sp-f"><span>${l}<small>${s}</small></span><input class="tm-input" type="number" min="0" step="${step}" data-pit="${k}" value="${v}"></label>`;
  const datumWert = (ms) => toLocalInput(ms).slice(0, 10);
  const zeitWert = (ms) => toLocalInput(ms).slice(11, 16);

  /* ---------------- Reiter: Fahrzeuge & Fahrer ---------------- */
  function tabAutos(body) {
    const p = S.plan;
    const benutzt = (uid, car) => p.cars.find(c => c !== car && c.drivers.some(d => d.uid === uid));
    body.innerHTML = p.cars.map((c, ci) => `
      <div class="tm-box sp-car" data-car="${ci}">
        <div class="sp-car-h"><input class="tm-input sp-carname" data-f="name" maxlength="40" value="${esc(c.name)}" aria-label="Name des Autos">
          ${p.cars.length > 1 ? C.btn("Auto entfernen", "sm", `data-rmcar="${ci}"`) : ""}</div>
        <div class="tm-row"><label>Fahrzeug<small>aus Garage 61</small></label>
          <div>${autoAuswahl(c)}</div></div>
        <div class="tm-row"><div class="lbl">Start<small>deine Ortszeit</small></div>
          <div class="sp-inline"><label class="sp-f sp-dt"><span>Datum</span><input class="tm-input" type="date" data-f="datum" value="${datumWert(c.start)}"></label>
          <label class="sp-f sp-dt"><span>Uhrzeit</span><input class="tm-input" type="time" data-f="zeit" value="${zeitWert(c.start)}"></label></div></div>
        <div class="td-label">Boxenstopp</div>
        <div class="sp-grid" data-pitbox="${ci}">
          ${feld("tank", "Tankgröße", "Liter", c.pit.tank)}
          ${feld("reserve", "Sprit-Reserve", "Liter pro Stint", c.pit.reserve, 0.1)}
          ${feld("rate", "Tanken", "Liter pro Sekunde", c.pit.rate, 0.1)}
          ${feld("lane", "Zeitverlust Boxengasse", "Sekunden, ohne Stehzeit", c.pit.lane)}
          ${feld("reifen", "Reifenwechsel", "Sekunden", c.pit.reifen)}
          ${feld("wechsel", "Fahrerwechsel", "Sekunden", c.pit.wechsel)}
          ${feld("reifenAlle", "Reifen wechseln", "alle X Stopps (0 = nie)", c.pit.reifenAlle)}
        </div>
        <label class="sp-check"><input type="checkbox" data-f="par" ${c.pit.parallel ? "checked" : ""}> Tanken, Reifen und Fahrerwechsel laufen gleichzeitig (wie in iRacing)</label>
        <div class="td-label">Fahrer</div>
        <div class="sp-drv-wrap"><table class="sp-drv">
          <thead><tr><th>Fahrer</th><th>Garage-61-Fahrer</th><th>Pace<small>Ø Runde</small></th><th>Sprit<small>L pro Runde</small></th><th></th></tr></thead>
          <tbody>${c.drivers.map((d, di) => `<tr data-d="${di}">
            <td><b>${esc(memberName(d.uid))}</b></td>
            <td><select class="tm-select" data-g="g61"><option value="">Nicht verknüpft</option>${META.g61drivers.map(g => `<option value="${esc(g.slug)}" ${g.slug === d.g61 ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></td>
            <td><input class="tm-input" data-g="pace" placeholder="1:58.500" value="${fmtLap(d.pace)}"></td>
            <td><input class="tm-input" data-g="fuel" type="number" step="0.01" min="0" placeholder="3.20" value="${d.fuel || ""}"></td>
            <td><button type="button" class="sp-x" data-rmd="${di}" title="Entfernen">✕</button></td></tr>`).join("") || '<tr><td colspan="5" class="tm-muted">Noch keine Fahrer.</td></tr>'}</tbody></table></div>
        <div class="sp-inline" style="margin-top:12px">
          <select class="tm-select" data-f="add"><option value="">+ Fahrer hinzufügen …</option>${META.members.filter(m => !c.drivers.some(d => d.uid === m.id)).map(m => { const b = benutzt(m.id, c); return `<option value="${m.id}">${esc(m.name)}${b ? " (schon in " + esc(b.name) + ")" : ""}</option>`; }).join("")}</select>
          ${C.btn("Werte aus Garage 61", "sm", `data-g61="${ci}" ${META.g61Ready ? "" : "disabled"}`)}
        </div>
        <div class="sp-g61info" id="sp-g61-${ci}">${g61Info(c)}</div>
      </div>`).join("") + `
      <div class="tm-actions">${p.cars.length < 4 ? C.btn("+ Auto hinzufügen", "", 'id="sp-addcar"') : '<span class="tm-muted">Maximal 4 Autos pro Rennen.</span>'}</div>
      <p class="tm-muted" style="margin-top:14px">Neu zugeteilte Fahrer bekommen beim Speichern eine Nachricht in Discord mit der Bitte, ihre Verfügbarkeit einzutragen.</p>`;

    $$(".sp-car").forEach(box => {
      const c = p.cars[Number(box.dataset.car)];
      box.querySelector("[data-f=name]").addEventListener("input", (e) => { c.name = e.target.value; dirty(); });
      box.querySelector("[data-f=car]").addEventListener("change", (e) => {
        const id = Number(e.target.value) || 0;
        const t = (META.teamCars || []).find(x => x.id === id) || META.cars.find(x => x.id === id);
        c.carId = t ? t.id : 0; c.carName = t ? t.name : ""; dirty();
      });
      const startSet = () => {
        const t = fromLocalInput(box.querySelector("[data-f=datum]").value + "T" + (box.querySelector("[data-f=zeit]").value || "00:00"));
        if (t) { c.start = t; ersterStart(p); dirty(); kopfZeile(); }
      };
      box.querySelector("[data-f=datum]").addEventListener("change", startSet);
      box.querySelector("[data-f=zeit]").addEventListener("change", startSet);
      box.querySelectorAll("[data-pit]").forEach(i => i.addEventListener("change", () => { c.pit[i.dataset.pit] = Math.max(0, num(i.value, c.pit[i.dataset.pit])); dirty(); }));
      box.querySelector("[data-f=par]").addEventListener("change", (e) => { c.pit.parallel = e.target.checked; dirty(); });
      box.querySelector("[data-f=add]").addEventListener("change", (e) => {
        const uid = e.target.value;
        if (!uid) return;
        const name = memberName(uid);
        const g = g61Vorschlag(uid, name);
        const d = { uid, name, g61: g, pace: 0, fuel: 0 };
        uebernimmG61(c, d);
        c.drivers.push(d); dirty(); tabAutos(body);
      });
      box.querySelectorAll("tr[data-d]").forEach(tr => {
        const d = c.drivers[Number(tr.dataset.d)];
        tr.querySelector("[data-g=g61]").addEventListener("change", (e) => { d.g61 = e.target.value; uebernimmG61(c, d, true); dirty(); tabAutos(body); });
        tr.querySelector("[data-g=pace]").addEventListener("change", (e) => { d.pace = parseLap(e.target.value); e.target.value = fmtLap(d.pace); dirty(); });
        tr.querySelector("[data-g=fuel]").addEventListener("change", (e) => { d.fuel = Math.max(0, num(e.target.value)); dirty(); });
        tr.querySelector("[data-rmd]").addEventListener("click", () => {
          c.drivers.splice(Number(tr.dataset.d), 1);
          c.stints.forEach(s => { if (s.d === d.uid) s.d = ""; });
          dirty(); tabAutos(body);
        });
      });
      const rm = box.querySelector("[data-rmcar]");
      if (rm) rm.onclick = () => { if (!confirm("Auto „" + c.name + "“ entfernen?")) return; p.cars.splice(p.cars.indexOf(c), 1); S.car = 0; dirty(); tabAutos(body); };
      const gb = box.querySelector("[data-g61]");
      gb.onclick = () => holeG61(c, gb, body);
    });
    const add = $("#sp-addcar");
    if (add) add.onclick = () => { const v = p.cars[p.cars.length - 1]; p.cars.push(neuesAuto(p.cars.length, v ? v.start : p.start, v && v.pit)); dirty(); tabAutos(body); };
  }
  // Auswahl: oben die Teamfahrzeuge (aus Garage 61, letzte 90 Tage), darunter alle Fahrzeuge
  function autoAuswahl(c) {
    const team = META.teamCars || [];
    const opt = (x) => `<option value="${x.id}" ${x.id === c.carId ? "selected" : ""}>${esc(x.name)}</option>`;
    const rest = META.cars.filter(x => !team.some(t => t.id === x.id));
    const unbekannt = c.carId && !team.some(t => t.id === c.carId) && !META.cars.some(x => x.id === c.carId);
    return `<select class="tm-select" data-f="car"><option value="">Fahrzeug wählen …</option>
      ${unbekannt ? `<option value="${c.carId}" selected>${esc(c.carName || "Fahrzeug #" + c.carId)}</option>` : ""}
      ${team.length ? `<optgroup label="Teamfahrzeuge (in den letzten 90 Tagen gefahren)">${team.map(opt).join("")}</optgroup>` : ""}
      ${rest.length ? `<optgroup label="Alle Fahrzeuge">${rest.map(opt).join("")}</optgroup>` : ""}</select>`;
  }
  function stdKanal() { const k = (META.channels || []).find(c => c.id === META.channel); return k ? k.name : ""; }
  function kopfZeile() { const k = $(".sp-title small"); if (k) k.textContent = (S.plan.trackName || "Strecke offen") + " · " + tagUhr(S.plan.start); }
  function g61Info(c) {
    const g = S.g61[S.plan.trackId + "/" + c.carId];
    if (!g) return "";
    const at = new Date(g.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const fehlen = c.drivers.filter(d => d.g61 && !g.drivers[d.g61]).map(d => memberName(d.uid));
    const pt = g.pit || {};
    const box = !pt.stopps ? "Boxenstopp: keine Stopps auf dieser Kombi gefunden, Werte bleiben wie eingetragen."
      : pt.rate ? `Boxenstopp: aus ${pt.stopps} Stopps ermittelt (Boxengasse ${pt.lane} s, Tanken ${pt.rate} L/s).`
      : `Boxenstopp: aus ${pt.stopps} Stopps ermittelt (im Schnitt ${Math.round(pt.verlust)} s inkl. ${Math.round(pt.rein)} L Tanken). Tankrate ließ sich nicht trennen, bleibt wie eingetragen.`;
    return `<small class="tm-muted">Garage 61 (Stand ${at}): ${Object.keys(g.drivers).length} Fahrer mit Runden auf dieser Kombi.${fehlen.length ? " Keine Runden von: " + esc(fehlen.join(", ")) + " (Teamschnitt wird benutzt oder Werte selbst eintragen)." : ""}${pt.tank ? " Tank ca. " + pt.tank + " L (höchster gefahrener Tankstand)." : ""} ${box}</small>`;
  }
  // Boxenstopp-Werte aus Garage 61 ins Auto übernehmen, soweit vorhanden
  function uebernimmPit(c, g) {
    const pt = g.pit || {};
    let n = 0;
    if (pt.tank > 5) { c.pit.tank = pt.tank; n++; }
    if (pt.rate > 0 && pt.lane > 0) { c.pit.rate = pt.rate; c.pit.lane = pt.lane; n += 2; }
    else if (pt.stopps && pt.verlust > 0) { c.pit.lane = Math.max(5, Math.round(pt.verlust - pt.rein / (c.pit.rate || 2.5))); n++; }
    return n;
  }
  function uebernimmG61(c, d, force) {
    const g = S.g61[S.plan.trackId + "/" + c.carId];
    const x = g && d.g61 && g.drivers[d.g61];
    if (!x) return false;
    if (force || !d.pace) d.pace = x.pace;
    if (force || !d.fuel) d.fuel = x.fuel;
    return true;
  }
  async function holeG61(c, b, body) {
    if (!S.plan.trackId) { C.toast("Erst eine Strecke aus der Garage-61-Liste wählen (Reiter Rennen)"); return; }
    if (!c.carId) { C.toast("Erst ein Fahrzeug aus der Garage-61-Liste wählen"); return; }
    b.disabled = true;
    try {
      const g = await C.api(`/stint/g61?track=${S.plan.trackId}&car=${c.carId}`);
      S.g61[S.plan.trackId + "/" + c.carId] = g;
      let n = 0;
      for (const d of c.drivers) if (uebernimmG61(c, d, true)) n++;
      const np = uebernimmPit(c, g);
      if (n || np) dirty();
      const teile = [n ? `Pace und Sprit für ${n} Fahrer` : "", np ? "Boxenstopp-Werte" : ""].filter(Boolean);
      C.toast(teile.length ? teile.join(" und ") + " übernommen" : "Keine passenden Runden in Garage 61 gefunden", !!teile.length);
      tabAutos(body);
    } catch (e) { C.toast(e.message); b.disabled = false; }
  }

  /* ---------------- Reiter: Verfügbarkeit ---------------- */
  // Ein Raster pro Auto (Zeitraum dieses Autos). Eigene Autos zuerst, nur die eigene Zeile ist klickbar.
  function tabVerf(body) {
    const p = S.plan;
    const meine = { ...((S.av[S.me] && S.av[S.me].slots) || {}) };
    const meineAutos = p.cars.filter(c => c.drivers.some(d => d.uid === S.me));
    const reihenfolge = [...meineAutos, ...p.cars.filter(c => !meineAutos.includes(c))];
    const raster = (c) => {
      const zeiten = slotZeiten(c), L = slotLen(c);
      const uids = c.drivers.map(d => d.uid);
      if (uids.includes(S.me)) { uids.splice(uids.indexOf(S.me), 1); uids.unshift(S.me); }
      const kopf = zeiten.map((t, i) => { const d = new Date(t); const neuerTag = i === 0 || new Date(zeiten[i - 1]).getDate() !== d.getDate(); return `<th class="${neuerTag ? "tag" : ""}">${neuerTag ? `<em>${d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}</em>` : ""}${uhr(t)}</th>`; }).join("");
      const zeile = (uid) => {
        const ich = uid === S.me;
        const a = ich ? meine : ((S.av[uid] && S.av[uid].slots) || {});
        return `<tr class="${ich ? "ich" : ""}"><td class="sp-av-n"><b>${esc(memberName(uid))}${ich ? " (du)" : ""}</b></td>
          ${zeiten.map(t => { const v = a[t]; return `<td><button type="button" class="sp-slot ${v === undefined ? "" : VCOL[v]}" ${ich ? `data-slot="${t}"` : "disabled"} title="${uhr(t)} bis ${uhr(t + L)}: ${v === undefined ? "nichts eingetragen" : VTXT[v]}"></button></td>`; }).join("")}</tr>`;
      };
      return `<div class="sp-av-car"><div class="sp-av-h"><b>${esc(c.name)}</b>${c.carName ? `<span>${esc(c.carName)}</span>` : ""}<small>Start ${tagUhr(c.start)} · Raster ${L === 3600000 ? "1 Std." : "30 Min."}</small></div>
        ${uids.length ? `<div class="sp-av-wrap"><table class="sp-av"><thead><tr><th class="sp-av-n">Fahrer</th>${kopf}</tr></thead><tbody>${uids.map(zeile).join("")}</tbody></table></div>` : '<p class="tm-muted">Noch keine Fahrer auf diesem Auto.</p>'}</div>`;
    };
    body.innerHTML = `
      <div class="tm-box"><h5>Wann kannst du fahren?</h5>
        ${meineAutos.length
          ? `<p class="hint">Tippe in deiner Zeile auf die Kästchen: einmal <b class="sp-t ja">verfügbar</b>, zweimal <b class="sp-t evtl">vielleicht</b>, dreimal <b class="sp-t nein">nicht verfügbar</b>, viermal wieder leer. Deine Ortszeit.</p>
             <div class="sp-inline">${C.btn("Alles verfügbar", "sm", 'id="sp-all2"')}${C.btn("Alles leeren", "sm", 'id="sp-all0"')}${C.btn("Meine Verfügbarkeit speichern", "red", 'id="sp-avsave"')}</div>`
          : '<p class="hint">Du bist in diesem Rennen auf keinem Auto eingeteilt. Hier siehst du die Verfügbarkeit der Fahrer.</p>'}
      </div>
      ${reihenfolge.map(raster).join("")}
      ${absenzHinweis()}`;
    const meineZeiten = () => [...new Set(meineAutos.flatMap(c => slotZeiten(c)))];
    const zeichneAlle = () => $$("[data-slot]").forEach(b => zeichne(b, b.dataset.slot));
    const zeichne = (btnEl, t) => { const v = meine[t]; btnEl.className = "sp-slot " + (v === undefined ? "" : VCOL[v]); btnEl.title = uhr(+t) + ": " + (v === undefined ? "nichts eingetragen" : VTXT[v]); };
    $$("[data-slot]").forEach(b => b.onclick = () => {
      const t = b.dataset.slot, v = meine[t];
      if (v === undefined) meine[t] = 2; else if (v === 2) meine[t] = 1; else if (v === 1) meine[t] = 0; else delete meine[t];
      zeichneAlle(); $("#sp-avsave").classList.add("pulse");
    });
    if (!meineAutos.length) { ladeAbsenzen(); return; }
    $("#sp-all2").onclick = () => { meineZeiten().forEach(t => (meine[t] = 2)); zeichneAlle(); $("#sp-avsave").classList.add("pulse"); };
    $("#sp-all0").onclick = () => { meineZeiten().forEach(t => delete meine[t]); zeichneAlle(); $("#sp-avsave").classList.add("pulse"); };
    $("#sp-avsave").onclick = async () => {
      if (!S.id) { C.toast("Plan erst speichern"); return; }
      const b = $("#sp-avsave"); b.disabled = true;
      try { const r = await C.api("/stint/avail", { method: "POST", body: { id: S.id, slots: meine } }); S.av[S.me] = { slots: { ...meine }, at: Date.now() }; C.toast(r.info, true); b.classList.remove("pulse"); }
      catch (e) { C.toast(e.message); }
      b.disabled = false;
    };
    ladeAbsenzen();
  }
  let ABS = null;
  function absenzHinweis() { return '<div id="sp-abs"></div>'; }
  // Abwesenheiten, die in das Zeitfenster eines Autos fallen, auf dem der Fahrer sitzt
  async function ladeAbsenzen() {
    try { if (!ABS) ABS = (await C.api("/abwesend")).list || []; } catch (e) { return; }
    const treffer = ABS.filter(a => S.plan.cars.some(c => { const f = fenster(c); return c.drivers.some(d => d.uid === a.uid) && a.von < f.bis && a.bis > f.von; }));
    const el = document.getElementById("sp-abs");
    if (!el || !treffer.length) return;
    el.innerHTML = `<div class="tm-box sp-warn"><h5>Eingetragene Abwesenheiten im Rennzeitraum</h5>${treffer.map(a => `<div>⚠️ <b>${esc(a.name)}</b>: ${tagUhr(a.von)} bis ${tagUhr(a.bis)}${a.text ? " · " + esc(a.text) : ""}</div>`).join("")}</div>`;
  }

  /* ---------------- Reiter: Stintplan ---------------- */
  function carTabs(akt) {
    const p = S.plan;
    if (p.cars.length < 2) return "";
    return `<div class="sp-seg sp-cartabs">${p.cars.map((c, i) => `<button type="button" data-car="${i}" class="${i === akt ? "on" : ""}">${esc(c.name)}</button>`).join("")}</div>`;
  }
  function bindCarTabs(body, fn) { body.querySelectorAll(".sp-cartabs [data-car]").forEach(b => b.onclick = () => { S.car = Number(b.dataset.car); fn(body); }); }

  function tabPlan(body) {
    const p = S.plan;
    if (!p.cars.length) { body.innerHTML = '<div class="tm-box"><p class="tm-muted">Erst unter „Fahrzeuge & Fahrer" ein Auto anlegen.</p></div>'; return; }
    const c = p.cars[S.car] || p.cars[0];
    const r = rechne(c, null);
    body.innerHTML = carTabs(S.car) + stintTabelle(c, r, false) + (r.rows.length ? `
      <div class="tm-actions" style="margin-top:14px">
        ${C.btn("Fahrer reihum verteilen", "sm", 'id="sp-rot"')}
        ${C.btn("Runden zurücksetzen", "sm", 'id="sp-reset"')}
        ${S.id ? C.btn("Plan in Discord posten", "sm", `id="sp-post" ${META.channel || p.channel ? "" : 'disabled title="Kein Discord-Kanal eingestellt"'}`) : ""}
      </div>
      <p class="tm-muted" style="margin-top:10px">Runden leer lassen = so weit wie der Tank reicht. Fahrer und Runden ändern sofort die Rechnung, gespeichert wird mit „Speichern" oben.</p>` : "");
    bindCarTabs(body, tabPlan);
    bindStintEdit(body, c, tabPlan);
    const rot = $("#sp-rot");
    if (rot) rot.onclick = () => { c.stints = c.stints.map(s => ({ ...s, d: "" })); dirty(); tabPlan(body); };
    const rs = $("#sp-reset");
    if (rs) rs.onclick = () => { c.stints = c.stints.map(s => ({ ...s, laps: 0, reifen: null })); dirty(); tabPlan(body); };
    const po = $("#sp-post");
    if (po) po.onclick = async () => {
      if (S.dirty && !confirm("Es gibt ungespeicherte Änderungen. Trotzdem den angezeigten Stand posten?")) return;
      po.disabled = true;
      const cars = p.cars.map(car => {
        const rr = rechne(car, null).rows;
        return { name: car.name + (car.carName ? " · " + car.carName : "") + " · Start " + tagUhr(car.start), lines: rr.map(s => `${s.i + 1}. ${uhr(s.von)} bis ${uhr(s.bis)} · ${s.name} · ${s.laps} Rd.`) };
      });
      try { const x = await C.api("/stint/post", { method: "POST", body: { id: S.id, cars } }); C.toast(x.info, true); }
      catch (e) { C.toast(e.message); }
      po.disabled = false;
    };
  }

  function stintTabelle(c, r, live) {
    if (r.fehler.length) return `<div class="tm-box sp-warn"><h5>Noch nicht berechenbar</h5>${r.fehler.map(f => `<div>• ${esc(f)}</div>`).join("")}<p class="tm-muted" style="margin-top:8px">Unter „Fahrzeuge & Fahrer" ergänzen.</p></div>`;
    const rows = r.rows;
    const P = c.pit;
    const stopps = rows.filter(x => x.pit).length;
    const runden = rows.reduce((a, x) => a + x.laps, 0);
    const sprit = rows.reduce((a, x) => a + x.fuel, 0);
    const ende = rows.length ? rows[rows.length - 1].bis : 0;
    const zeitFahrer = {};
    rows.forEach(x => { if (x.uid) zeitFahrer[x.uid] = (zeitFahrer[x.uid] || 0) + (x.bis - x.von); });
    const avDot = (x) => {
      if (!x.uid || x.real === "fertig") return "";
      const v = verfuegbar(x.uid, x.von, x.bis, c);
      const t = v === -1 ? "Nichts eingetragen" : VTXT[v];
      return `<span class="sp-dot ${v === -1 ? "" : VCOL[v]}" title="${t}"></span>`;
    };
    const fahrerSel = (x) => {
      if (live || x.real) return `<b>${esc(x.name || "–")}</b>`;
      return `<select class="tm-select sp-sel" data-sd="${x.i}">${c.drivers.map(d => `<option value="${d.uid}" ${d.uid === x.uid ? "selected" : ""}>${esc(memberName(d.uid))}</option>`).join("")}</select>`;
    };
    const rundenFeld = (x) => {
      if (live || x.real) return `<b>${x.laps}</b>${x.real === "laufend" ? `<small>${x.gefahren} gefahren</small>` : ""}`;
      const a = c.stints[x.i] || {};
      return `<input class="tm-input sp-laps" data-sl="${x.i}" type="number" min="0" max="999" placeholder="${x.laps}" value="${a.laps > 0 ? a.laps : ""}">`;
    };
    const box = (x) => {
      if (!x.pit) return x.letzter ? '<span class="sp-ziel">🏁 Ziel</span>' : "";
      const a = c.stints[x.i + 1] || {};
      const teile = [`${Math.round(x.pit.total)} s`, x.pit.rein > 0.05 ? `+${x.pit.rein.toFixed(1)} L` : "", x.pit.wechsel ? "Fahrerwechsel" : ""].filter(Boolean).join(" · ");
      const reifen = live ? (x.pit.reifen ? " · Reifen" : "") : ` <label class="sp-rf" title="Reifen wechseln"><input type="checkbox" data-sr="${x.i + 1}" ${x.pit.reifen ? "checked" : ""}>Reifen</label>`;
      return `<span class="sp-pit">${teile}${reifen}</span>`;
    };
    return `
      <div class="wk-tiles sp-tiles">
        <div class="wk-tile"><small>Stints</small><b>${rows.length}</b></div>
        <div class="wk-tile"><small>Boxenstopps</small><b>${stopps}</b></div>
        <div class="wk-tile"><small>Runden gesamt</small><b>${runden}</b></div>
        <div class="wk-tile"><small>Sprit gesamt</small><b>${Math.round(sprit)} L</b></div>
        <div class="wk-tile"><small>Zieleinlauf ca.</small><b>${ende ? uhr(ende) : "–"}</b></div>
      </div>
      <div class="sp-tbl-wrap"><table class="sp-tbl">
        <thead><tr><th>#</th><th>Fahrer</th><th>Zeit</th><th>Runden</th><th>Ø Runde</th><th>Sprit</th><th>Boxenstopp danach</th></tr></thead>
        <tbody>${rows.map(x => `<tr class="${x.real ? "real " + x.real : ""}">
          <td class="sp-nr">${x.i + 1}</td>
          <td><div class="sp-fz">${avDot(x)}${fahrerSel(x)}</div></td>
          <td class="sp-zt">${uhr(x.von)} bis ${uhr(x.bis)}<small>${dauer(x.bis - x.von)}${x.real === "fertig" ? " · gefahren" : x.real === "laufend" ? " · läuft" : ""}</small></td>
          <td class="sp-rd">${rundenFeld(x)}</td>
          <td>${fmtLap(x.pace)}</td>
          <td>${x.fuel.toFixed(1)} L</td>
          <td>${box(x)}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="sp-fahrzeit">${Object.entries(zeitFahrer).map(([u, ms]) => `<span class="tm-chip">${esc(memberName(u))}: ${dauer(ms)}</span>`).join("")}</div>
      <p class="tm-muted sp-legende"><span class="sp-dot ja"></span> verfügbar <span class="sp-dot evtl"></span> vielleicht <span class="sp-dot nein"></span> nicht verfügbar <span class="sp-dot"></span> nichts eingetragen · Tank ${P.tank} L</p>`;
  }

  function bindStintEdit(body, c, neu) {
    const ensure = (i) => { while (c.stints.length <= i) c.stints.push({ d: "", laps: 0, reifen: null }); return c.stints[i]; };
    const fixe = () => { const r = rechne(c, null).rows; r.forEach(x => { const s = ensure(x.i); if (!s.d) s.d = x.uid; }); };
    body.querySelectorAll("[data-sd]").forEach(s => s.onchange = () => { fixe(); ensure(Number(s.dataset.sd)).d = s.value; dirty(); neu(body); });
    body.querySelectorAll("[data-sl]").forEach(s => s.onchange = () => { fixe(); ensure(Number(s.dataset.sl)).laps = Math.max(0, Math.round(num(s.value))); dirty(); neu(body); });
    body.querySelectorAll("[data-sr]").forEach(s => s.onchange = () => { fixe(); ensure(Number(s.dataset.sr)).reifen = s.checked; dirty(); neu(body); });
  }

  /* ---------------- Reiter: Live ---------------- */
  async function tabLive(body, ohneLaden) {
    const p = S.plan;
    if (!S.id) { body.innerHTML = '<div class="tm-box"><p class="tm-muted">Plan erst speichern.</p></div>'; return; }
    const mine = alive;
    const kopf = () => {
      const l = S.live;
      let txt = "Lädt …", cls = "grey";
      if (l) {
        if (l.status === "live") { txt = "Live · Stand " + uhr(l.at) + " · nächste Aktualisierung " + uhr(S.liveAt + LIVE_MS); cls = "live"; }
        else txt = l.info || l.status;
      }
      return `<div class="tm-box sp-livebox"><h5>Live aus Garage 61 <span class="tm-badge ${cls}">${cls === "live" ? "Live" : "Info"}</span></h5>
        <p class="hint">${esc(txt)}</p>
        <p class="tm-muted">Während das Rennen läuft, holt die Seite alle 5 Minuten die echten Runden aus Garage 61 (solange sie offen ist). Gefahrene Stints werden grün markiert, der Rest wird ab dem echten Stand neu gerechnet. Das klappt nur, wenn die Fahrer beim Fahren Garage 61 laufen haben und unter „Fahrzeuge & Fahrer" mit ihrem Garage-61-Namen verknüpft sind.</p>
        <div class="tm-actions">${C.btn("Jetzt aktualisieren", "sm", 'id="sp-lv"')}</div></div>`;
    };
    const zeichne = () => {
      if (mine !== alive || S.tab !== "live" || !document.body.contains(body)) return;
      const c = p.cars[S.car] || p.cars[0];
      if (!c) { body.innerHTML = kopf(); return; }
      const lc = S.live && S.live.status === "live" && S.live.autos ? S.live.autos[c.key] : null;
      const r = rechne(c, lc);
      body.innerHTML = kopf() + carTabs(S.car) + stintTabelle(c, r, true);
      bindCarTabs(body, () => zeichne());
      const lv = $("#sp-lv");
      if (lv) lv.onclick = () => holen(true);
    };
    const holen = async (manuell) => {
      if (mine !== alive) return;
      const lv = $("#sp-lv"); if (lv) lv.disabled = true;
      try { S.live = await C.api("/stint/live?id=" + encodeURIComponent(S.id)); S.liveAt = Date.now(); }
      catch (e) { S.live = { status: "fehler", info: e.message }; }
      zeichne();
      if (manuell && S.live && S.live.status !== "live") C.toast(S.live.info || "Keine Live-Daten");
    };
    zeichne();
    if (!ohneLaden && (!S.live || Date.now() - S.liveAt > LIVE_MS - 5000)) await holen(false);
    clearInterval(S.liveT);
    S.liveT = setInterval(() => {
      if (mine !== alive || !document.body.contains(body)) { clearInterval(S.liveT); return; }
      if (S.tab === "live" && document.visibilityState === "visible" && Date.now() - S.liveAt >= LIVE_MS) holen(false);
    }, 30000);
  }

  window.F2FStint = { mount };
})();
