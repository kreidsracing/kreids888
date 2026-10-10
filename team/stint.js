/* ===========================================================
   STINTPLANER  Flag to Flag Motorsport
   Event anlegen → Fahrzeuge (Teams) anlegen → Fahrer tragen sich ein
   → pro Fahrzeug: Verfügbarkeit, Fahrer & Werte, Stintplan, Live.
   Wird von team.js eingebunden (window.F2FStint.mount).
   Hash: #stint · #stint/neu · #stint/<id> · #stint/<id>/bearbeiten
         #stint/<id>/neu · #stint/<id>/<key> · #stint/<id>/<key>/bearbeiten
   =========================================================== */
(function () {
  let C = null, root = null, META = null, ABS = null;
  let alive = 0;
  const S = { id: null, plan: null, av: {}, me: null, canDelete: false, key: null, draft: null, dirty: false, step: "verf", evTab: "autos", live: null, liveAt: 0, liveT: null, g61: {} };
  const LIVE_MS = 5 * 60 * 1000;
  const VCOL = { 2: "ja", 1: "evtl", 0: "nein" };
  const VTXT = { 2: "Verfügbar", 1: "Vielleicht", 0: "Nicht verfügbar" };
  const PIT_STD = { tank: 100, reserve: 0.5, rate: 2.5, lane: 60, reifen: 20, wechsel: 0, reifenAlle: 1, parallel: true };

  /* ---------------- Helfer ---------------- */
  const esc = (s) => C.esc(s);
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const pad = (n) => String(n).padStart(2, "0");
  const uhr = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const tagUhr = (ms) => new Date(ms).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const datumLang = (ms) => new Date(ms).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
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
  const datumWert = (ms) => toLocalInput(ms).slice(0, 10);
  const zeitWert = (ms) => toLocalInput(ms).slice(11, 16);
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const kopie = (o) => JSON.parse(JSON.stringify(o));
  const loading = '<div class="tm-loading"><span></span><span></span><span></span></div>';
  const memberName = (uid) => { const m = META && META.members.find(x => x.id === uid); if (m) return m.name; for (const c of (S.plan ? S.plan.cars : [])) { const d = c.drivers.find(x => x.uid === uid); if (d && d.name) return d.name; } return "Unbekannt"; };
  const fehler = (msg) => { root.innerHTML = C.panelHead("stint", "Stintplaner") + `<div class="tm-box tm-err">${esc(msg)}</div><a class="tm-btn" href="#stint"><span>Zur Übersicht</span></a>`; };
  const carByKey = (k) => S.plan && S.plan.cars.find(c => c.key === k);

  // Fahrzeug-Silhouette in Teamfarbe
  function teamFarbe(name) {
    const n = norm(name);
    if (/black|schwarz/.test(n)) return ["#30343d", "#8b929c"];
    if (/white|weiss/.test(n)) return ["#e9ecf1", "#8b929c"];
    if (/silver|silber|grey|grau/.test(n)) return ["#a7afba", "#5a616b"];
    if (/blue|blau/.test(n)) return ["#2f6fe0", "#173a7a"];
    if (/green|grun/.test(n)) return ["#2ecc71", "#17703d"];
    if (/yellow|gelb|gold/.test(n)) return ["#ffb020", "#8a5d0a"];
    return ["#e11324", "#7a0a14"];
  }
  function silhouette(name) {
    const [f, s] = teamFarbe(name);
    return `<svg class="sp-sil" viewBox="0 0 120 44" aria-hidden="true">
      <path d="M5 31 L9 23 Q13 18 24 17 L44 15 Q53 7 67 7 L81 8 Q91 9 99 15 L111 18 Q117 20 117 27 L117 31 Q117 34 113 34 L104 34 A9 9 0 0 0 86 34 L36 34 A9 9 0 0 0 18 34 L8 34 Q5 34 5 31 Z" fill="${f}" stroke="${s}" stroke-width="1.2"/>
      <path d="M49 15.5 Q57 10 67 10 L79 11 Q86 12 91 16 Z" fill="#0a0b0e" opacity=".75"/>
      <path d="M10 26 L40 25" stroke="${s}" stroke-width="1" opacity=".6"/>
      <circle cx="27" cy="34" r="7" fill="#111" stroke="#555" stroke-width="1.5"/><circle cx="27" cy="34" r="2.6" fill="#777"/>
      <circle cx="95" cy="34" r="7" fill="#111" stroke="#555" stroke-width="1.5"/><circle cx="95" cy="34" r="2.6" fill="#777"/>
    </svg>`;
  }

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
  // ältere Pläne: Startzeit/Boxenwerte lagen beim Rennen, Stint-Zeiten am Plan
  function normalisiere(p) {
    for (const c of p.cars) {
      if (!c.start) c.start = p.start;
      if (!c.pit) c.pit = { ...PIT_STD, ...(p.pit || {}) };
      c.stops = c.stops || [];
      c.stints = c.stints || [];
    }
    delete p.pit;
    if (p.cars.length) p.start = Math.min(...p.cars.map(c => c.start));
    return p;
  }

  /* ---------------- Berechnung ---------------- */
  function carStart(car) { return car.start || S.plan.start; }
  function raceEnd(car) { return S.plan.mode === "zeit" ? carStart(car) + S.plan.dauerMin * 60000 : null; }

  // live = echte Stints aus Garage 61 für dieses Auto (oder null); sonst zählen von Hand eingetragene Stopps
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
    const werte = (uid) => { const d = drv[uid] || {}; return { pace: d.pace > 0 ? d.pace : avgPace, fuel: d.fuel > 0 ? d.fuel : avgFuel }; };
    const maxRunden = (fuel, liter) => fuel > 0 ? Math.max(1, Math.floor(((liter ?? P.tank) - P.reserve) / fuel)) : 0;
    const ende = raceEnd(car);
    let rest = plan.mode === "runden" ? plan.runden : Infinity;
    let t = carStart(car);
    let tankJetzt = P.tank, ersterFahrer = "";
    const rows = [];
    const fehlerListe = [];
    if (!car.drivers.length) fehlerListe.push("Keine Fahrer im Fahrzeug");
    if (!(avgPace > 0)) fehlerListe.push("Keine Rundenzeiten eingetragen (Schritt 2)");
    if (!(avgFuel > 0)) fehlerListe.push("Kein Spritverbrauch eingetragen (Schritt 2)");
    if (fehlerListe.length) return { rows, fehler: fehlerListe, quelle: "" };

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

    let quelle = "", laufend = null;
    if (live && live.stints && live.stints.length) {
      quelle = "g61";
      for (const s of live.stints) {
        const uid = uidVonG61(s.g61);
        if (s.fertig) {
          rows.push({ i: rows.length, uid, name: uid ? memberName(uid) : s.name, von: s.von, bis: s.bis, laps: s.laps, pace: s.pace, fuel: s.fuel, real: "fertig" });
          rest -= s.laps;
        } else laufend = { ...s, uid };
      }
      if (rows.length && !laufend) {
        const letzte = rows[rows.length - 1];
        const n = werte(fahrerFuer(rows.length));
        letzte.pit = boxStopp(rows.length - 1, letzte.uid, fahrerFuer(rows.length), maxRunden(n.fuel) * n.fuel + P.reserve, letzte.fuel);
        t = letzte.bis + letzte.pit.total * 1000;
      }
    } else if (car.stops && car.stops.length) {
      // von Hand eingetragene Boxenstopps: Uhrzeit = Boxenausfahrt, Runde = Gesamtrunde beim Stopp
      quelle = "hand";
      let vorLap = 0, vorT = carStart(car), vorUid = fahrerFuer(0), tankStart = P.tank;
      for (const s of car.stops) {
        const laps = Math.max(0, s.lap - vorLap);
        const w = werte(vorUid);
        const verbr = laps * w.fuel;
        const naechster = s.u || fahrerFuer(rows.length + 1);
        rows.push({ i: rows.length, uid: vorUid, name: memberName(vorUid), von: vorT, bis: s.at, laps, pace: laps ? Math.max(0, (s.at - vorT) / 1000 / laps) : w.pace, fuel: verbr, real: "hand",
          pit: { hand: true, rein: s.fuel, reifen: s.reifen, wechsel: naechster !== vorUid, total: 0 } });
        rest -= laps;
        tankStart = s.fuel > 0 ? Math.min(P.tank, Math.max(0, tankStart - verbr) + s.fuel) : P.tank;
        vorLap = s.lap; vorT = s.at; vorUid = naechster;
      }
      t = vorT; tankJetzt = tankStart; ersterFahrer = vorUid;
    }

    let guard = 0, erster = true;
    while (guard++ < 300) {
      if (ende !== null && t >= ende && !laufend) break;
      if (ende === null && rest <= 0) break;
      const i = rows.length;
      let uid = erster && ersterFahrer ? ersterFahrer : fahrerFuer(i), w = werte(uid);
      const a = car.stints[i] || {};
      const max = maxRunden(w.fuel, erster ? tankJetzt : P.tank);
      let laps = a.laps > 0 ? Math.min(a.laps, max) : max;
      let row;
      if (laufend) {
        uid = laufend.uid || uid; w = werte(uid);
        const lmax = maxRunden(w.fuel);
        const geplant = a.laps > 0 ? Math.min(a.laps, lmax) : lmax;
        const offen = Math.max(0, geplant - laufend.laps);
        const tl = laufend.bis || laufend.von;
        const restLaps = ende !== null ? Math.min(offen, Math.max(0, Math.ceil((ende - tl) / 1000 / w.pace))) : Math.min(offen, Math.max(0, rest - laufend.laps));
        laps = laufend.laps + restLaps;
        row = { i, uid, name: uid ? memberName(uid) : laufend.name, von: laufend.von, bis: tl + restLaps * w.pace * 1000, laps, pace: laufend.pace || w.pace, fuel: laps * w.fuel, real: "laufend", gefahren: laufend.laps };
        laufend = null;
      } else {
        if (ende !== null) {
          const bisEnde = Math.max(1, Math.ceil((ende - t) / 1000 / w.pace));
          if (laps >= bisEnde) laps = bisEnde;
        } else if (laps >= rest) laps = rest;
        row = { i, uid, name: memberName(uid), von: t, bis: t + laps * w.pace * 1000, laps, pace: w.pace, fuel: laps * w.fuel };
      }
      erster = false;
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
    return { rows, fehler: [], quelle };
  }

  /* ---------------- Verfügbarkeit ---------------- */
  function fenster(car) {
    const s = carStart(car);
    let e = raceEnd(car);
    if (e === null) { const r = rechne(car, null).rows; e = r.length ? r[r.length - 1].bis : s + 3 * 3600000; }
    return { von: s, bis: Math.max(e, s + 1800000) };
  }
  function slotLen(car) { const f = fenster(car); return f.bis - f.von > 8 * 3600000 ? 3600000 : 1800000; }
  function slotZeiten(car) {
    const f = fenster(car), L = slotLen(car);
    const out = [];
    let t = Math.floor(f.von / L) * L;
    while (t < f.bis && out.length < 120) { out.push(t); t += L; }
    return out;
  }
  // schlechteste Verfügbarkeit im Zeitraum: 2 ja, 1 vielleicht, 0 nein, -1 nichts eingetragen
  function verfuegbar(uid, von, bis, car) {
    const a = S.av[uid] && S.av[uid].slots;
    if (!a) return -1;
    let schlecht = 3, offen = false;
    const L = slotLen(car);
    for (const t of slotZeiten(car)) {
      if (t + L <= von || t >= bis) continue;
      const v = a[t];
      if (v === undefined) offen = true; else schlecht = Math.min(schlecht, v);
    }
    if (schlecht === 0) return 0;
    if (offen) return schlecht === 3 ? -1 : 1;
    return schlecht === 3 ? -1 : schlecht;
  }
  // Fahrer-Status im Zeitraum des Autos: ja / evtl / nein / fehlt
  function fahrerAv(uid, car) {
    const a = S.av[uid] && S.av[uid].slots;
    if (!a) return "fehlt";
    let best = -1;
    for (const t of slotZeiten(car)) { const v = a[t]; if (v !== undefined) best = Math.max(best, v); }
    return best === 2 ? "ja" : best === 1 ? "evtl" : best === 0 ? "nein" : "fehlt";
  }
  const AVTXT = { ja: "Verfügbar", evtl: "Vielleicht", nein: "Nicht verfügbar", fehlt: "Verfügbarkeit fehlt" };
  function carStatus(c, r) {
    if (!c.drivers.length) return ["fehlt", "Fahrer fehlen"];
    if (!c.carId) return ["fehlt", "Fahrzeugmodell fehlt"];
    if (c.drivers.some(d => fahrerAv(d.uid, c) === "fehlt") || r.fehler.length) return ["fehlt", "Angaben fehlen"];
    const konflikt = r.rows.some(x => !x.real && x.uid && verfuegbar(x.uid, x.von, x.bis, c) !== 2);
    return konflikt ? ["arbeit", "In Arbeit"] : ["ok", "Plan vollständig"];
  }
  const liveFuer = (c) => S.live && S.live.status === "live" && S.live.autos ? S.live.autos[c.key] : null;

  /* ---------------- Mount / Laden ---------------- */
  async function mount(el, ctx, sub) {
    C = ctx; root = el; alive++;
    const mine = alive;
    ABS = null;
    clearInterval(S.liveT);
    root.innerHTML = C.panelHead("stint", "Stintplaner") + loading;
    try { if (!META) META = await C.api("/stint/meta"); }
    catch (e) { return fehler(e.message); }
    if (mine !== alive) return;
    const teile = (sub || "").split("/").filter(Boolean);
    if (!teile.length) return renderListe(mine);
    if (teile[0] === "neu") { S.plan = null; return eventForm(null); }
    if (!(await ladePlan(teile[0], mine))) return;
    if (teile.length === 1) return renderEvent();
    if (teile[1] === "bearbeiten") return eventForm(S.plan);
    if (teile[1] === "neu") return carForm(null);
    const car = carByKey(teile[1]);
    if (!car) return fehler("Fahrzeug nicht gefunden");
    if (teile[2] === "bearbeiten") return carForm(car);
    if (S.key !== car.key || !S.dirty) { S.draft = kopie(car); S.dirty = false; }
    if (S.key !== car.key) { S.step = istLive(car) ? "live" : car.drivers.some(d => d.uid === S.me) && fahrerAv(S.me, car) === "fehlt" ? "verf" : "plan"; S.live = null; }
    if (S.nextStep) { S.step = S.nextStep; S.nextStep = null; }
    S.key = car.key;
    renderCar();
  }
  async function ladePlan(id, mine) {
    let d;
    try { d = await C.api("/stint/plan?id=" + encodeURIComponent(id)); }
    catch (e) { fehler(e.message); return false; }
    if (mine !== alive) return false;
    if (S.id !== d.plan.id) { S.key = null; S.dirty = false; S.live = null; }
    S.id = d.plan.id; S.plan = normalisiere(d.plan); S.av = d.av || {}; S.me = d.me; S.canDelete = d.canDelete;
    return true;
  }
  function istLive(c) { const now = Date.now(), s = carStart(c), e = raceEnd(c) || s + 48 * 3600000; return now > s - 1800000 && now < e + 2 * 3600000; }
  window.addEventListener("beforeunload", (e) => { if (S.dirty && root && document.body.contains(root)) { e.preventDefault(); e.returnValue = ""; } });
  function weg(e) { if (S.dirty && !confirm("Ungespeicherte Änderungen am Fahrzeug verwerfen?")) { e.preventDefault(); return; } S.dirty = false; }

  /* ================================================================
     ÜBERSICHT (alle Events)
     ================================================================ */
  async function renderListe(mine) {
    S.dirty = false;
    let d;
    try { d = await C.api("/stint/list"); } catch (e) { return fehler(e.message); }
    if (mine !== alive) return;
    const now = Date.now(), meinId = C.ME.user.id;
    const ende = (p) => Math.max(p.start, ...p.cars.map(c => c.start || p.start)) + (p.mode === "zeit" ? p.dauerMin * 60000 : 6 * 3600000);
    const karte = (p) => {
      const ich = p.cars.some(c => c.drivers.includes(meinId));
      const laenge = p.mode === "runden" ? p.runden + " Runden" : dauer(p.dauerMin * 60000);
      const status = p.start > now ? "" : now < ende(p) + 3600000 ? '<span class="tm-badge live">Läuft</span>' : '<span class="tm-badge grey">Vorbei</span>';
      return `<a class="sp-card" href="#stint/${esc(p.id)}">
        <div class="sp-card-h"><b>${esc(p.name)}</b>${status}${ich ? '<span class="tm-badge">Du fährst</span>' : ""}</div>
        <div class="sp-card-m">${esc(p.track || "Strecke offen")}</div>
        <div class="sp-card-f"><span>${C.ICONS.calendar}${tagUhr(p.start)}</span><span>${C.ICONS.clock}${laenge}</span><span>${C.ICONS.car}${p.cars.length} ${p.cars.length === 1 ? "Fahrzeug" : "Fahrzeuge"}</span></div>
        ${p.cars.map(c => `<div class="sp-card-car">
          <div class="sp-card-carh"><b>${esc(c.name)}</b>${c.carName ? `<span>${esc(c.carName)}</span>` : ""}${c.start && p.cars.length > 1 ? `<small>${tagUhr(c.start)}</small>` : ""}</div>
          ${c.drivers.length ? `<div class="sp-card-drv">${c.drivers.map(u => { const ok = p.av ? p.av[u] : null; return `<span class="${u === meinId ? "ich" : ""}">${ok === true ? '<i class="ok" title="Verfügbarkeit eingetragen">✓</i>' : ok === false ? '<i class="fehlt" title="Verfügbarkeit fehlt noch">!</i>' : ""}${esc(memberName(u))}</span>`; }).join("")}</div>` : '<div class="sp-card-drv"><em>Noch keine Fahrer</em></div>'}
        </div>`).join("")}
        ${p.av && Object.values(p.av).some(v => !v) ? `<div class="sp-card-hint">Verfügbarkeit fehlt noch: ${Object.entries(p.av).filter(([, v]) => !v).map(([u]) => esc(memberName(u))).join(", ")}</div>` : ""}
      </a>`;
    };
    const kommend = d.list.filter(p => ende(p) + 3600000 > now);
    const alt = d.list.filter(p => !kommend.includes(p)).reverse();
    root.innerHTML = C.panelHead("stint", "Stintplaner") + `
      <div class="sp-top"><p class="tm-muted">Event anlegen, Fahrzeuge mit euren Teams anlegen, Fahrer tragen sich ein und geben ihre Verfügbarkeit an. Pace, Sprit und Boxenstopps kommen aus Garage 61.</p>
        <a class="tm-btn red" href="#stint/neu"><span>+ Neues Event</span></a></div>
      <div class="td-label">Kommende Events</div>
      ${kommend.length ? `<div class="sp-cards">${kommend.map(karte).join("")}</div>` : '<div class="tm-box"><p class="tm-muted">Noch kein Event geplant.</p></div>'}
      ${alt.length ? `<div class="td-label">Vergangene Events</div><div class="sp-cards alt">${alt.map(karte).join("")}</div>` : ""}
      ${META.isAdmin ? `<p class="tm-muted" style="margin-top:18px">Standard-Kanal, Pings und Teams stellst du unter <a class="r" href="#admin">Admin → Stintplaner</a> ein.</p>` : ""}`;
  }

  /* ================================================================
     EVENT ANLEGEN / BEARBEITEN
     ================================================================ */
  function stdKanal() { const k = (META.channels || []).find(c => c.id === META.channel); return k ? k.name : ""; }
  function eventForm(p) {
    const e = p ? { ...p } : { name: "", trackId: 0, trackName: "", mode: "zeit", dauerMin: 360, runden: 100, notiz: "", channel: "" };
    const zeichne = () => {
      const h = Math.floor(e.dauerMin / 60), m = e.dauerMin % 60;
      root.innerHTML = `
        <div class="sp-head"><a class="sp-back" href="${p ? "#stint/" + esc(p.id) : "#stint"}">← ${p ? "Zurück zum Event" : "Übersicht"}</a>
          <div class="sp-title"><h3>${p ? "Event bearbeiten" : "Neues Event"}</h3><small>Was wird gefahren? Startzeiten legt ihr pro Fahrzeug fest.</small></div></div>
        <div class="tm-box"><h5>Event</h5>
          <div class="tm-row"><label for="ev-name">Eventname</label><input class="tm-input" id="ev-name" maxlength="80" placeholder="z. B. 6h Watkins Glen" value="${esc(e.name)}"></div>
          <div class="tm-row"><label for="ev-track">Strecke<small>aus Garage 61, tippen zum Suchen</small></label>
            <div><input class="tm-input" id="ev-track" list="ev-tracks" placeholder="Strecke suchen …" value="${esc(e.trackName)}"><datalist id="ev-tracks">${META.tracks.map(t => `<option value="${esc(t.name)}">`).join("")}</datalist></div></div>
          <div class="tm-row"><div class="lbl">Rennlänge</div>
            <div><div class="sp-seg" id="ev-mode"><button type="button" data-m="zeit" class="${e.mode === "zeit" ? "on" : ""}">Nach Zeit</button><button type="button" data-m="runden" class="${e.mode === "runden" ? "on" : ""}">Nach Runden</button></div>
            <div class="sp-inline" style="margin-top:10px">${e.mode === "zeit"
              ? `<input class="tm-input sp-num" id="ev-h" type="number" min="0" max="48" value="${h}"><span>Std.</span><input class="tm-input sp-num" id="ev-m" type="number" min="0" max="59" step="5" value="${m}"><span>Min.</span>`
              : `<input class="tm-input sp-num" id="ev-runden" type="number" min="1" max="5000" value="${e.runden}"><span>Runden</span>`}</div></div></div>
          <div class="tm-row"><label for="ev-chan">Discord-Kanal<small>für Pings zu diesem Event</small></label>
            <div><select class="tm-select" id="ev-chan"><option value="">Standard${stdKanal() ? " (# " + esc(stdKanal()) + ")" : " (keiner eingestellt)"}</option>${(META.channels || []).map(c => `<option value="${c.id}" ${c.id === e.channel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
          <div class="tm-row"><label for="ev-notiz">Notizen<small>optional</small></label><textarea class="tm-input" id="ev-notiz" rows="4" maxlength="1500" placeholder="z. B. Pflichtstopps, Regeln, Setup, Treffpunkt im Discord …">${esc(e.notiz)}</textarea></div>
          <div class="tm-actions">${C.btn(p ? "Speichern" : "Event anlegen", "red", 'id="ev-save"')}${p && S.canDelete ? C.btn("Event löschen", "sm", 'id="ev-del"') : ""}</div>
        </div>`;
      const v = (id) => root.querySelector("#" + id);
      const sync = () => {
        e.name = v("ev-name").value; e.notiz = v("ev-notiz").value; e.channel = v("ev-chan").value;
        if (v("ev-h")) e.dauerMin = Math.max(10, Math.round(num(v("ev-h").value) * 60 + num(v("ev-m").value)));
        if (v("ev-runden")) e.runden = Math.max(1, Math.round(num(v("ev-runden").value, 100)));
        const tv = v("ev-track").value.trim();
        const t = META.tracks.find(x => x.name === tv) || META.tracks.find(x => norm(x.name) === norm(tv));
        e.trackName = t ? t.name : tv; e.trackId = t ? t.id : 0;
      };
      $$("#ev-mode [data-m]").forEach(b => b.onclick = () => { sync(); e.mode = b.dataset.m; zeichne(); });
      v("ev-save").onclick = async () => {
        sync();
        if (!e.name.trim()) return C.toast("Bitte einen Eventnamen eintragen");
        if (e.trackName && !e.trackId) C.toast("Strecke nicht in Garage 61 gefunden, dann gibt es keine Werte aus Garage 61");
        v("ev-save").disabled = true;
        try {
          const r = await C.api("/stint/event", { method: "POST", body: { id: p ? p.id : undefined, event: e } });
          C.toast(r.info, true);
          location.hash = "stint/" + r.id;
        } catch (x) { C.toast(x.message); v("ev-save").disabled = false; }
      };
      const del = v("ev-del");
      if (del) del.onclick = async () => {
        if (!confirm("Dieses Event mit allen Fahrzeugen wirklich löschen? Das geht nicht rückgängig.")) return;
        try { const r = await C.api("/stint/plan/delete", { method: "POST", body: { id: p.id } }); C.toast(r.info, true); location.hash = "stint"; }
        catch (x) { C.toast(x.message); }
      };
    };
    zeichne();
  }

  /* ================================================================
     EVENT-SEITE (Fahrzeuge & Teams, Zeitplan, Notizen)
     ================================================================ */
  function renderEvent() {
    const p = S.plan, now = Date.now();
    const infos = p.cars.map(c => { const r = rechne(c, liveFuer(c)); return { c, r, st: carStatus(c, r) }; });
    const fertig = infos.filter(x => x.st[0] === "ok").length;
    const modelle = [...new Set(p.cars.map(c => c.carName).filter(Boolean))];
    const laenge = p.mode === "runden" ? p.runden + " Runden" : dauer(p.dauerMin * 60000).replace(" 00 min", "").replace(" h", " Stunden");
    const istDrin = p.cars.find(c => c.drivers.some(d => d.uid === S.me));
    const alleFahrer = [...new Set(p.cars.flatMap(c => c.drivers.map(d => d.uid)))];
    const stat = { ja: 0, evtl: 0, nein: 0, fehlt: 0 };
    p.cars.forEach(c => c.drivers.forEach(d => stat[fahrerAv(d.uid, c)]++));
    const termine = [];
    infos.forEach(({ c, r }) => {
      termine.push({ t: carStart(c), a: "Rennstart", b: c.name });
      r.rows.filter(x => !x.real && x.i > 0).forEach(x => termine.push({ t: x.von, a: "Stint " + (x.i + 1) + " · " + (x.name || "–"), b: c.name }));
    });
    const naechste = termine.filter(x => x.t > now - 60000).sort((a, b) => a.t - b.t).slice(0, 6);
    const status = now < p.start ? "Kommendes Event" : infos.some(x => istLive(x.c)) ? "Aktives Event" : "Vergangenes Event";

    const karte = ({ c, r, st }) => {
      const nx = r.rows.find(x => x.von >= now - 60000 && !x.real) || null;
      const ich = c.drivers.some(d => d.uid === S.me);
      return `<div class="sp-vcard" data-open="${esc(c.key)}" tabindex="0" role="link">
        <div class="sp-vcard-pic">${silhouette(c.name)}</div>
        <div class="sp-vcard-team"><b>${esc(c.name)}</b><span>${esc(c.carName || "Fahrzeug offen")}</span><small>${C.ICONS.clock}${tagUhr(carStart(c))}</small></div>
        <div class="sp-vcard-drv"><div class="sp-mini-h">Fahrer (${c.drivers.length})</div>
          ${c.drivers.map(d => { const a = fahrerAv(d.uid, c); return `<div class="sp-drvline ${d.uid === S.me ? "ich" : ""}"><i class="sp-av-dot ${a}"></i><span>${esc(memberName(d.uid))}</span><em class="${a}">${AVTXT[a]}</em></div>`; }).join("") || '<div class="tm-muted">Noch niemand eingetragen</div>'}
        </div>
        <div class="sp-vcard-st"><span class="sp-st ${st[0]}">${st[1]}</span>
          ${nx ? `<div class="sp-mini-h">Nächster Stint</div><div class="sp-nx">${C.ICONS.clock}<span>Stint ${nx.i + 1} · ${uhr(nx.von)} Uhr<br><small>Fahrer: <b>${esc(nx.name || "–")}</b></small></span></div>` : ""}
          ${ich ? "" : `<button type="button" class="tm-btn sm" data-join="${esc(c.key)}"><span>Mitfahren</span></button>`}
        </div>
        <div class="sp-vcard-go">›</div>
      </div>`;
    };
    const zeitplan = () => {
      const alle = infos.flatMap(({ c, r }) => r.rows.map(x => ({ ...x, car: c })));
      alle.sort((a, b) => a.von - b.von);
      if (!alle.length) return '<div class="tm-box"><p class="tm-muted">Noch keine Stints berechenbar. In den Fahrzeugen Fahrer, Rundenzeiten und Sprit eintragen.</p></div>';
      return `<div class="sp-tbl-wrap"><table class="sp-tbl"><thead><tr><th>Zeit</th><th>Fahrzeug</th><th>Stint</th><th>Fahrer</th><th>Runden</th></tr></thead><tbody>
        ${alle.map(x => `<tr class="${x.real ? "real " + x.real : ""}"><td>${tagUhr(x.von)}<small>bis ${uhr(x.bis)}</small></td><td><b>${esc(x.car.name)}</b></td><td>${x.i + 1}</td><td><div class="sp-fz">${x.uid ? `<span class="sp-dot ${VCOL[verfuegbar(x.uid, x.von, x.bis, x.car)] || ""}"></span>` : ""}${esc(x.name || "–")}</div></td><td>${x.laps}</td></tr>`).join("")}
      </tbody></table></div>`;
    };
    root.innerHTML = `
      <a class="sp-back" href="#stint">← Alle Events</a>
      <section class="sp-hero" style="--img:url('/team/bilder/f2f-cars.webp')">
        <div class="sp-hero-in">
          <span class="sp-hero-tag">${status}</span>
          <h3>${esc(p.name)}</h3>
          <div class="sp-hero-facts">
            <span>${C.ICONS.calendar}${datumLang(p.start)}</span>
            <span>${C.ICONS.clock}${uhr(p.start)} Uhr (Start)</span>
            <span>${C.ICONS.flag}${laenge}</span>
            <span>${C.ICONS.pin}${esc(p.trackName || "Strecke offen")}</span>
            <span>${C.ICONS.car}${modelle.length ? esc(modelle.join(", ")) : "Fahrzeuge offen"}</span>
            <span>${C.ICONS.file}${p.notiz ? esc(p.notiz.split("\n")[0].slice(0, 60)) + (p.notiz.length > 60 ? " …" : "") : "Keine besonderen Regeln"}</span>
          </div>
        </div>
        <div class="sp-hero-st"><b>Planungsstatus</b><span>${fertig} / ${p.cars.length} Fahrzeuge fertig</span><div class="sp-bar"><i style="width:${p.cars.length ? Math.round(fertig / p.cars.length * 100) : 0}%"></i></div></div>
      </section>
      <div class="sp-ev">
        <div class="sp-ev-main">
          <div class="g6-tabs sp-tabs">${[["autos", "Fahrzeuge & Teams"], ["zeit", "Zeitplan"], ["notiz", "Notizen"]].map(([k, l]) => `<button type="button" data-evtab="${k}" class="${S.evTab === k ? "on" : ""}">${l}</button>`).join("")}</div>
          <div id="sp-evbody">
            ${S.evTab === "zeit" ? zeitplan() : S.evTab === "notiz"
              ? `<div class="tm-box"><h5>Notizen</h5>${p.notiz ? `<p class="sp-notiz">${esc(p.notiz)}</p>` : '<p class="tm-muted">Keine Notizen.</p>'}<div class="tm-actions" style="margin-top:12px"><a class="tm-btn sm" href="#stint/${esc(p.id)}/bearbeiten"><span>Bearbeiten</span></a></div></div>`
              : `<div class="sp-vhead"><h4>${C.ICONS.car} Fahrzeuge (${p.cars.length})</h4>${p.cars.length < 4 ? `<a class="tm-btn red sm" href="#stint/${esc(p.id)}/neu"><span>+ Fahrzeug anlegen</span></a>` : ""}</div>
                 ${infos.length ? `<div class="sp-vlist">${infos.map(karte).join("")}</div>` : '<div class="tm-box"><p class="tm-muted">Noch kein Fahrzeug. Lege das erste an und wähle dein Team.</p></div>'}`}
          </div>
        </div>
        <aside class="sp-ev-side">
          <div class="tm-box sp-side"><h5>Event-Übersicht</h5>
            <div class="sp-kv"><span>${C.ICONS.car}Fahrzeuge</span><b>${p.cars.length}</b></div>
            <div class="sp-kv"><span>${C.ICONS.people}Fahrer gesamt</span><b>${alleFahrer.length}</b></div>
            <div class="sp-kv"><span><i class="sp-av-dot ja"></i>Verfügbar</span><b>${stat.ja}</b></div>
            <div class="sp-kv"><span><i class="sp-av-dot evtl"></i>Vielleicht</span><b>${stat.evtl}</b></div>
            <div class="sp-kv"><span><i class="sp-av-dot nein"></i>Nicht verfügbar</span><b>${stat.nein}</b></div>
            <div class="sp-kv"><span><i class="sp-av-dot fehlt"></i>Verfügbarkeit fehlt</span><b>${stat.fehlt}</b></div>
            <div class="sp-kv"><span><i class="sp-av-dot ja"></i>Plan vollständig</span><b>${fertig}</b></div>
            <div class="sp-kv"><span><i class="sp-av-dot evtl"></i>In Arbeit / Angaben fehlen</span><b>${p.cars.length - fertig}</b></div>
          </div>
          <div class="tm-box sp-side"><h5>Schnellzugriff</h5>
            ${istDrin ? `<a class="tm-btn red sm sp-full" href="#stint/${esc(p.id)}/${esc(istDrin.key)}"><span>Mein Fahrzeug: ${esc(istDrin.name)}</span></a>
              <button type="button" class="tm-btn sm sp-full" id="sp-myav"><span>Meine Verfügbarkeit</span></button>` : `<p class="tm-muted">Du bist noch in keinem Fahrzeug. Öffne eins und klick auf „Mitfahren".</p>`}
            <a class="tm-btn sm sp-full" href="#stint/${esc(p.id)}/bearbeiten"><span>Event bearbeiten</span></a>
            ${p.cars.length ? `<button type="button" class="tm-btn sm sp-full" id="sp-post" ${META.channel || p.channel ? "" : 'disabled title="Kein Discord-Kanal eingestellt"'}><span>Plan in Discord posten</span></button>` : ""}
          </div>
          <div class="tm-box sp-side"><h5>Nächste Termine</h5>
            ${naechste.length ? naechste.map(x => `<div class="sp-term"><b>${tagUhr(x.t)}</b><span>${esc(x.a)} · ${esc(x.b)}</span></div>`).join("") : '<p class="tm-muted">Keine Termine.</p>'}
          </div>
        </aside>
      </div>`;
    $$("[data-evtab]").forEach(b => b.onclick = () => { S.evTab = b.dataset.evtab; renderEvent(); });
    $$("[data-open]").forEach(el => {
      const go = () => (location.hash = "stint/" + p.id + "/" + el.dataset.open);
      el.onclick = (e) => { if (!e.target.closest("button")) go(); };
      el.onkeydown = (e) => { if (e.key === "Enter") go(); };
    });
    $$("[data-join]").forEach(b => b.onclick = async (e) => {
      e.stopPropagation();
      if (istDrin && !confirm("Du bist schon in „" + istDrin.name + "“. Trotzdem zusätzlich hier mitfahren?")) return;
      b.disabled = true;
      try { const r = await C.api("/stint/join", { method: "POST", body: { id: p.id, key: b.dataset.join } }); C.toast(r.info, true); S.key = null; S.nextStep = "verf"; location.hash = "stint/" + p.id + "/" + b.dataset.join; }
      catch (x) { C.toast(x.message); b.disabled = false; }
    });
    const myav = $("#sp-myav");
    if (myav) myav.onclick = () => { S.nextStep = "verf"; S.key = null; location.hash = "stint/" + p.id + "/" + istDrin.key; };
    const po = $("#sp-post");
    if (po) po.onclick = async () => {
      po.disabled = true;
      const cars = infos.map(({ c, r }) => ({ name: c.name + (c.carName ? " · " + c.carName : "") + " · Start " + tagUhr(carStart(c)), lines: r.rows.map(s => `${s.i + 1}. ${uhr(s.von)} bis ${uhr(s.bis)} · ${s.name} · ${s.laps} Rd.`) }));
      try { const x = await C.api("/stint/post", { method: "POST", body: { id: p.id, cars } }); C.toast(x.info, true); }
      catch (x) { C.toast(x.message); }
      po.disabled = false;
    };
  }

  /* ================================================================
     FAHRZEUG ANLEGEN / BEARBEITEN
     ================================================================ */
  function autoAuswahl(c) {
    const team = META.teamCars || [];
    const opt = (x) => `<option value="${x.id}" ${x.id === c.carId ? "selected" : ""}>${esc(x.name)}</option>`;
    const rest = META.cars.filter(x => !team.some(t => t.id === x.id));
    const unbekannt = c.carId && !team.some(t => t.id === c.carId) && !META.cars.some(x => x.id === c.carId);
    return `<select class="tm-select" id="cf-car"><option value="">Fahrzeug wählen …</option>
      ${unbekannt ? `<option value="${c.carId}" selected>${esc(c.carName || "Fahrzeug #" + c.carId)}</option>` : ""}
      ${team.length ? `<optgroup label="Teamfahrzeuge (in den letzten 90 Tagen gefahren)">${team.map(opt).join("")}</optgroup>` : ""}
      ${rest.length ? `<optgroup label="Alle Fahrzeuge">${rest.map(opt).join("")}</optgroup>` : ""}</select>`;
  }
  function carForm(car) {
    const p = S.plan;
    const vergeben = (n) => p.cars.some(x => (!car || x.key !== car.key) && x.name === n);
    const teams = [...(META.teams || [])];
    if (car && car.name && !teams.includes(car.name)) teams.unshift(car.name);
    const frei = teams.find(n => !vergeben(n));
    const vorlage = p.cars[p.cars.length - 1];
    const c = car ? kopie(car) : { name: frei || "", carId: vorlage ? vorlage.carId : 0, carName: vorlage ? vorlage.carName : "", start: vorlage ? vorlage.start : (() => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(14, 0, 0, 0); return d.getTime(); })(), pit: { ...(vorlage ? vorlage.pit : PIT_STD) }, drivers: [], stints: [] };
    root.innerHTML = `
      <div class="sp-head"><a class="sp-back" href="#stint/${esc(p.id)}${car ? "/" + esc(car.key) : ""}">← Zurück</a>
        <div class="sp-title"><h3>${car ? "Fahrzeug bearbeiten" : "Fahrzeug anlegen"}</h3><small>${esc(p.name)}</small></div></div>
      <div class="tm-box"><h5>Fahrzeug</h5>
        <div class="tm-row"><label for="cf-team">Team<small>vergebene Teams sind gesperrt</small></label>
          <div>${teams.length ? `<select class="tm-select" id="cf-team">${teams.map(n => `<option value="${esc(n)}" ${n === c.name ? "selected" : ""} ${vergeben(n) ? "disabled" : ""}>${esc(n)}${vergeben(n) ? " (schon vergeben)" : ""}</option>`).join("")}</select>` : '<p class="tm-muted">Keine Teams angelegt (Admin → Stintplaner → Teams).</p>'}</div></div>
        <div class="tm-row"><label for="cf-car">Fahrzeug<small>aus Garage 61</small></label><div>${autoAuswahl(c)}</div></div>
        <div class="tm-row"><div class="lbl">Start<small>deine Ortszeit</small></div>
          <div class="sp-inline"><label class="sp-f sp-dt"><span>Datum</span><input class="tm-input" type="date" id="cf-datum" value="${datumWert(c.start)}"></label>
          <label class="sp-f sp-dt"><span>Uhrzeit</span><input class="tm-input" type="time" id="cf-zeit" value="${zeitWert(c.start)}"></label></div></div>
        ${car ? "" : `<div class="tm-row"><div class="lbl">Fahrer</div><label class="sp-check" style="margin-top:4px"><input type="checkbox" id="cf-ich" checked> Ich fahre selbst mit</label></div>`}
        <div class="tm-actions">${C.btn(car ? "Speichern" : "Fahrzeug anlegen", "red", 'id="cf-save"')}${car && (S.canDelete || car.by === S.me || META.isAdmin) ? C.btn("Fahrzeug löschen", "sm", 'id="cf-del"') : ""}</div>
      </div>`;
    $("#cf-save").onclick = async () => {
      const tsel = $("#cf-team");
      if (!tsel || !tsel.value) return C.toast("Bitte ein Team wählen");
      c.name = tsel.value;
      const id = Number($("#cf-car").value) || 0;
      const t = (META.teamCars || []).find(x => x.id === id) || META.cars.find(x => x.id === id);
      c.carId = t ? t.id : 0; c.carName = t ? t.name : "";
      const st = fromLocalInput($("#cf-datum").value + "T" + ($("#cf-zeit").value || "00:00"));
      if (!st) return C.toast("Bitte Datum und Uhrzeit angeben");
      c.start = st;
      if (!car && $("#cf-ich").checked) c.drivers.push({ uid: S.me, name: C.ME.user.name, g61: g61Vorschlag(S.me, C.ME.user.name), pace: 0, fuel: 0 });
      $("#cf-save").disabled = true;
      try {
        const r = await C.api("/stint/car", { method: "POST", body: { id: p.id, crev: car ? car.crev || 0 : undefined, car: c } });
        C.toast(r.info, true);
        S.key = null; S.dirty = false;
        location.hash = "stint/" + p.id + "/" + r.key;
      } catch (x) { C.toast(x.message); $("#cf-save").disabled = false; }
    };
    const del = $("#cf-del");
    if (del) del.onclick = async () => {
      if (!confirm("Fahrzeug „" + car.name + "“ wirklich löschen?")) return;
      try { const r = await C.api("/stint/car/delete", { method: "POST", body: { id: p.id, key: car.key } }); C.toast(r.info, true); S.key = null; S.dirty = false; location.hash = "stint/" + p.id; }
      catch (x) { C.toast(x.message); }
    };
  }

  /* ================================================================
     FAHRZEUG-SEITE: 1 Verfügbarkeit · 2 Fahrer & Werte · 3 Stintplan · 4 Live
     ================================================================ */
  const STEPS = [["verf", "1 · Verfügbarkeit"], ["werte", "2 · Fahrer & Werte"], ["plan", "3 · Stintplan"], ["live", "4 · Live"]];
  function renderCar() {
    const p = S.plan, c = S.draft;
    const r = rechne(c, liveFuer(c));
    const st = carStatus(c, r);
    const ich = c.drivers.some(d => d.uid === S.me);
    root.innerHTML = `
      <div class="sp-chead">
        <a class="sp-back" href="#stint/${esc(p.id)}" id="sp-back">← ${esc(p.name)}</a>
        <div class="sp-chead-in">
          <div class="sp-chead-pic">${silhouette(c.name)}</div>
          <div class="sp-title"><h3>${esc(c.name)}</h3><small>${esc(c.carName || "Fahrzeug offen")} · Start ${tagUhr(carStart(c))} · ${esc(p.trackName || "")}</small></div>
          <span class="sp-st ${st[0]}">${st[1]}</span>
        </div>
        <div class="sp-actions">
          <span class="sp-dirty" id="sp-dirty" ${S.dirty ? "" : "hidden"}>Nicht gespeichert</span>
          ${C.btn("Speichern", "red", `id="sp-save" ${S.dirty ? "" : "hidden"}`)}
          ${ich ? C.btn("Abmelden", "sm", 'id="sp-leave"') : C.btn("Mitfahren", "red sm", 'id="sp-join"')}
          <a class="tm-btn sm" href="#stint/${esc(p.id)}/${esc(c.key)}/bearbeiten" id="sp-edit"><span>Bearbeiten</span></a>
          ${S.canDelete || c.by === S.me || META.isAdmin ? C.btn("Löschen", "sm", 'id="sp-cdel"') : ""}
        </div>
      </div>
      <div class="g6-tabs sp-tabs sp-steps">${STEPS.map(([k, l]) => `<button type="button" data-step="${k}" class="${S.step === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div id="sp-body"></div>`;
    $("#sp-back").onclick = weg;
    $("#sp-edit").onclick = weg;
    $("#sp-save").onclick = speichernCar;
    const cdel = $("#sp-cdel");
    if (cdel) cdel.onclick = async () => {
      if (!confirm("Fahrzeug „" + c.name + "“ mit allen Fahrern und Stints wirklich löschen? Das geht nicht rückgängig.")) return;
      cdel.disabled = true;
      try { const r = await C.api("/stint/car/delete", { method: "POST", body: { id: p.id, key: c.key } }); C.toast(r.info, true); S.key = null; S.dirty = false; location.hash = "stint/" + p.id; }
      catch (x) { C.toast(x.message); cdel.disabled = false; }
    };
    const j = $("#sp-join"), l = $("#sp-leave");
    if (j) j.onclick = () => mitfahren(true, j);
    if (l) l.onclick = () => { if (confirm("Wirklich aus „" + c.name + "“ abmelden? Das Team bekommt eine Nachricht in Discord.")) mitfahren(false, l); };
    $$("[data-step]").forEach(b => b.onclick = () => { S.step = b.dataset.step; $$("[data-step]").forEach(x => x.classList.toggle("on", x === b)); zeigeStep(); });
    zeigeStep();
  }
  function dirty() { S.dirty = true; const d = $("#sp-dirty"), s = $("#sp-save"); if (d) d.hidden = false; if (s) s.hidden = false; }
  function zeigeStep() {
    const body = $("#sp-body");
    if (!body) return;
    clearInterval(S.liveT);
    if (S.step === "verf") return stepVerf(body);
    if (S.step === "werte") return stepWerte(body);
    if (S.step === "plan") return stepPlan(body);
    if (S.step === "live") return stepLive(body);
  }
  async function neuLaden() {
    const mine = alive;
    if (!(await ladePlan(S.id, mine))) return;
    const car = carByKey(S.key);
    if (!car) { location.hash = "stint/" + S.id; return; }
    if (!S.dirty) S.draft = kopie(car);
    else { S.draft.crev = car.crev; S.draft.stops = car.stops; }
    renderCar();
  }
  async function mitfahren(rein, b) {
    if (rein && S.dirty) return C.toast("Erst speichern, dann mitfahren");
    b.disabled = true;
    try {
      const r = await C.api(rein ? "/stint/join" : "/stint/leave", { method: "POST", body: { id: S.id, key: S.key } });
      C.toast(r.info, true);
      S.dirty = false;
      if (rein) S.step = "verf";
      await neuLaden();
    } catch (x) { C.toast(x.message); b.disabled = false; }
  }
  async function speichernCar() {
    const b = $("#sp-save");
    const c = S.draft;
    c.schedule = rechne(c, null).rows.filter(x => !x.real).map(x => ({ i: x.i, u: x.uid, v: Math.round(x.von) }));
    b.disabled = true;
    try {
      const r = await C.api("/stint/car", { method: "POST", body: { id: S.id, crev: c.crev || 0, car: c } });
      C.toast(r.info, true);
      S.dirty = false;
      const alt = META;
      META = await C.api("/stint/meta").catch(() => alt);
      await neuLaden();
    } catch (x) { C.toast(x.message); b.disabled = false; }
  }

  /* ---------- Schritt 1: Verfügbarkeit ---------- */
  function stepVerf(body) {
    const c = S.draft;
    const ich = c.drivers.some(d => d.uid === S.me);
    const meine = { ...((S.av[S.me] && S.av[S.me].slots) || {}) };
    const zeiten = slotZeiten(c), L = slotLen(c);
    const uids = c.drivers.map(d => d.uid);
    if (ich) { uids.splice(uids.indexOf(S.me), 1); uids.unshift(S.me); }
    const kopf = zeiten.map((t, i) => { const d = new Date(t); const neuerTag = i === 0 || new Date(zeiten[i - 1]).getDate() !== d.getDate(); return `<th class="${neuerTag ? "tag" : ""}">${neuerTag ? `<em>${d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}</em>` : ""}${uhr(t)}</th>`; }).join("");
    const zeile = (uid) => {
      const mein = uid === S.me;
      const a = mein ? meine : ((S.av[uid] && S.av[uid].slots) || {});
      const st = fahrerAv(uid, c);
      return `<tr class="${mein ? "ich" : ""}"><td class="sp-av-n"><b>${esc(memberName(uid))}${mein ? " (du)" : ""}</b><small class="${st}">${AVTXT[st]}</small></td>
        ${zeiten.map(t => { const v = a[t]; return `<td><button type="button" class="sp-slot ${v === undefined ? "" : VCOL[v]}" ${mein ? `data-slot="${t}"` : "disabled"} title="${uhr(t)} bis ${uhr(t + L)}: ${v === undefined ? "nichts eingetragen" : VTXT[v]}"></button></td>`; }).join("")}</tr>`;
    };
    body.innerHTML = `
      <div class="tm-box"><h5>Wann kannst du fahren?</h5>
        ${ich ? `<p class="hint">Tippe in deiner Zeile auf die Kästchen: einmal <b class="sp-t ja">verfügbar</b>, zweimal <b class="sp-t evtl">vielleicht</b>, dreimal <b class="sp-t nein">nicht verfügbar</b>, viermal wieder leer. Raster ${L === 3600000 ? "1 Stunde" : "30 Minuten"}, deine Ortszeit.</p>
          <div class="sp-inline">${C.btn("Alles verfügbar", "sm", 'id="sp-all2"')}${C.btn("Alles leeren", "sm", 'id="sp-all0"')}${C.btn("Meine Verfügbarkeit speichern", "red", 'id="sp-avsave"')}</div>`
          : `<p class="hint">Du fährst in diesem Fahrzeug nicht mit. Klick oben auf „Mitfahren", um dich einzutragen.</p>`}
      </div>
      ${uids.length ? `<div class="sp-av-wrap"><table class="sp-av"><thead><tr><th class="sp-av-n">Fahrer</th>${kopf}</tr></thead><tbody>${uids.map(zeile).join("")}</tbody></table></div>` : '<div class="tm-box"><p class="tm-muted">Noch keine Fahrer in diesem Fahrzeug.</p></div>'}
      <div id="sp-abs"></div>`;
    const zeichne = (b) => { const v = meine[b.dataset.slot]; b.className = "sp-slot " + (v === undefined ? "" : VCOL[v]); };
    const puls = () => { const s = $("#sp-avsave"); if (s) s.classList.add("pulse"); };
    $$("[data-slot]").forEach(b => b.onclick = () => {
      const t = b.dataset.slot, v = meine[t];
      if (v === undefined) meine[t] = 2; else if (v === 2) meine[t] = 1; else if (v === 1) meine[t] = 0; else delete meine[t];
      zeichne(b); puls();
    });
    if (ich) {
      $("#sp-all2").onclick = () => { zeiten.forEach(t => (meine[t] = 2)); $$("[data-slot]").forEach(zeichne); puls(); };
      $("#sp-all0").onclick = () => { zeiten.forEach(t => delete meine[t]); $$("[data-slot]").forEach(zeichne); puls(); };
      $("#sp-avsave").onclick = async () => {
        const b = $("#sp-avsave"); b.disabled = true;
        try { const r = await C.api("/stint/avail", { method: "POST", body: { id: S.id, slots: meine } }); S.av[S.me] = { slots: { ...meine }, at: Date.now() }; C.toast(r.info, true); b.classList.remove("pulse"); stepVerf(body); }
        catch (e) { C.toast(e.message); b.disabled = false; }
      };
    }
    ladeAbsenzen(c);
  }
  async function ladeAbsenzen(c) {
    try { if (!ABS) ABS = (await C.api("/abwesend")).list || []; } catch (e) { return; }
    const f = fenster(c);
    const treffer = ABS.filter(a => c.drivers.some(d => d.uid === a.uid) && a.von < f.bis && a.bis > f.von);
    const el = document.getElementById("sp-abs");
    if (!el || !treffer.length) return;
    el.innerHTML = `<div class="tm-box sp-warn"><h5>Eingetragene Abwesenheiten im Rennzeitraum</h5>${treffer.map(a => `<div>⚠️ <b>${esc(a.name)}</b>: ${tagUhr(a.von)} bis ${tagUhr(a.bis)}${a.text ? " · " + esc(a.text) : ""}</div>`).join("")}</div>`;
  }

  /* ---------- Schritt 2: Fahrer & Werte ---------- */
  function stepWerte(body) {
    const c = S.draft;
    body.innerHTML = `
      <div class="tm-box"><h5>Fahrer, Rundenzeit und Sprit</h5>
        <p class="hint">„Werte aus Garage 61" füllt Pace (Ø saubere Runden, bevorzugt Rennrunden) und Sprit pro Runde, dazu Tank, Boxengasse und Tankrate (Schritt 3). Alles lässt sich von Hand ändern.</p>
        <div class="sp-drv-wrap"><table class="sp-drv">
          <thead><tr><th>Fahrer</th><th>Garage-61-Fahrer</th><th>Pace<small>Ø Runde</small></th><th>Sprit<small>L pro Runde</small></th><th></th></tr></thead>
          <tbody>${c.drivers.map((d, di) => `<tr data-d="${di}">
            <td><b>${esc(memberName(d.uid))}</b><small class="${fahrerAv(d.uid, c)}">${AVTXT[fahrerAv(d.uid, c)]}</small></td>
            <td><select class="tm-select" data-g="g61"><option value="">Nicht verknüpft</option>${META.g61drivers.map(g => `<option value="${esc(g.slug)}" ${g.slug === d.g61 ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></td>
            <td><input class="tm-input" data-g="pace" placeholder="1:58.500" value="${fmtLap(d.pace)}"></td>
            <td><input class="tm-input" data-g="fuel" type="number" step="0.01" min="0" placeholder="3.20" value="${d.fuel || ""}"></td>
            <td><button type="button" class="sp-x" data-rmd="${di}" title="Aus dem Fahrzeug nehmen">✕</button></td></tr>`).join("") || '<tr><td colspan="5" class="tm-muted">Noch keine Fahrer.</td></tr>'}</tbody></table></div>
        <div class="sp-inline" style="margin-top:12px">
          ${c.drivers.length < 8 ? `<select class="tm-select" id="sp-add"><option value="">+ Fahrer eintragen …</option>${META.members.filter(m => !c.drivers.some(d => d.uid === m.id)).map(m => { const b = S.plan.cars.find(x => x.key !== c.key && x.drivers.some(d => d.uid === m.id)); return `<option value="${m.id}">${esc(m.name)}${b ? " (schon in " + esc(b.name) + ")" : ""}</option>`; }).join("")}</select>` : ""}
          ${C.btn("Werte aus Garage 61", "sm", `id="sp-g61" ${META.g61Ready ? "" : "disabled"}`)}
        </div>
        <div class="sp-g61info">${g61Info(c)}</div>
        <p class="tm-muted" style="margin-top:10px">Wer hier eingetragen wird, bekommt beim Speichern einen Ping in Discord mit der Bitte, seine Verfügbarkeit einzutragen. Wer rausgenommen wird, löst eine Abmelde-Nachricht aus.</p>
      </div>`;
    const add = $("#sp-add");
    if (add) add.onchange = () => {
      const uid = add.value;
      if (!uid) return;
      const name = memberName(uid);
      const d = { uid, name, g61: g61Vorschlag(uid, name), pace: 0, fuel: 0 };
      uebernimmG61(c, d);
      c.drivers.push(d); dirty(); stepWerte(body);
    };
    $$("tr[data-d]").forEach(tr => {
      const d = c.drivers[Number(tr.dataset.d)];
      tr.querySelector("[data-g=g61]").onchange = (e) => { d.g61 = e.target.value; uebernimmG61(c, d, true); dirty(); stepWerte(body); };
      tr.querySelector("[data-g=pace]").onchange = (e) => { d.pace = parseLap(e.target.value); e.target.value = fmtLap(d.pace); dirty(); };
      tr.querySelector("[data-g=fuel]").onchange = (e) => { d.fuel = Math.max(0, num(e.target.value)); dirty(); };
      tr.querySelector("[data-rmd]").onclick = () => {
        c.drivers.splice(Number(tr.dataset.d), 1);
        c.stints.forEach(s => { if (s.d === d.uid) s.d = ""; });
        dirty(); stepWerte(body);
      };
    });
    const gb = $("#sp-g61");
    gb.onclick = () => holeG61(c, gb, body);
  }
  function g61Info(c) {
    const g = S.g61[S.plan.trackId + "/" + c.carId];
    if (!g) return "";
    const at = new Date(g.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const fehlen = c.drivers.filter(d => d.g61 && !g.drivers[d.g61]).map(d => memberName(d.uid));
    const pt = g.pit || {};
    const box = !pt.stopps ? "Boxenstopp: keine Stopps auf dieser Kombi gefunden, Werte bleiben wie eingetragen."
      : pt.rate ? `Boxenstopp: aus ${pt.stopps} Stopps ermittelt (Boxengasse ${pt.lane} s, Tanken ${pt.rate} L/s).`
      : `Boxenstopp: aus ${pt.stopps} Stopps ermittelt (im Schnitt ${Math.round(pt.verlust)} s inkl. ${Math.round(pt.rein)} L Tanken). Tankrate ließ sich nicht trennen, bleibt wie eingetragen.`;
    return `<small class="tm-muted">Garage 61 (Stand ${at}): ${Object.keys(g.drivers).length} Fahrer mit Runden auf dieser Kombi.${fehlen.length ? " Keine Runden von: " + esc(fehlen.join(", ")) + " (Teamschnitt wird benutzt oder Werte selbst eintragen)." : ""}${pt.tank ? " Tank ca. " + pt.tank + " L." : ""} ${box}</small>`;
  }
  function uebernimmG61(c, d, force) {
    const g = S.g61[S.plan.trackId + "/" + c.carId];
    const x = g && d.g61 && g.drivers[d.g61];
    if (!x) return false;
    if (force || !d.pace) d.pace = x.pace;
    if (force || !d.fuel) d.fuel = x.fuel;
    return true;
  }
  function uebernimmPit(c, g) {
    const pt = g.pit || {};
    let n = 0;
    if (pt.tank > 5) { c.pit.tank = pt.tank; n++; }
    if (pt.rate > 0 && pt.lane > 0) { c.pit.rate = pt.rate; c.pit.lane = pt.lane; n += 2; }
    else if (pt.stopps && pt.verlust > 0) { c.pit.lane = Math.max(5, Math.round(pt.verlust - pt.rein / (c.pit.rate || 2.5))); n++; }
    return n;
  }
  async function holeG61(c, b, body) {
    if (!S.plan.trackId) { C.toast("Beim Event erst eine Strecke aus der Garage-61-Liste wählen"); return; }
    if (!c.carId) { C.toast("Erst ein Fahrzeugmodell wählen (Bearbeiten)"); return; }
    b.disabled = true;
    try {
      const g = await C.api(`/stint/g61?track=${S.plan.trackId}&car=${c.carId}`);
      S.g61[S.plan.trackId + "/" + c.carId] = g;
      let n = 0;
      for (const d of c.drivers) if (uebernimmG61(c, d, true)) n++;
      const np = uebernimmPit(c, g);
      if (n || np) dirty();
      const teile = [n ? `Pace und Sprit für ${n} Fahrer` : "", np ? "Boxenstopp-Werte" : ""].filter(Boolean);
      C.toast(teile.length ? teile.join(" und ") + " übernommen. Speichern nicht vergessen." : "Keine passenden Runden in Garage 61 gefunden", !!teile.length);
      stepWerte(body);
    } catch (e) { C.toast(e.message); b.disabled = false; }
  }

  /* ---------- Schritt 3: Stintplan konfigurieren ---------- */
  const feld = (k, l, s, v, step = 1) => `<label class="sp-f"><span>${l}<small>${s}</small></span><input class="tm-input" type="number" min="0" step="${step}" data-pit="${k}" value="${v}"></label>`;
  function stepPlan(body) {
    const c = S.draft;
    const r = rechne(c, null);
    body.innerHTML = `
      <details class="tm-box sp-pitbox" ${r.fehler.length ? "" : ""}><summary><h5>Boxenstopp-Werte</h5><span class="tm-muted">Tank ${c.pit.tank} L · Boxengasse ${c.pit.lane} s · Tanken ${c.pit.rate} L/s</span></summary>
        <div class="sp-grid" style="margin-top:12px">
          ${feld("tank", "Tankgröße", "Liter", c.pit.tank)}
          ${feld("reserve", "Sprit-Reserve", "Liter pro Stint", c.pit.reserve, 0.1)}
          ${feld("rate", "Tanken", "Liter pro Sekunde", c.pit.rate, 0.1)}
          ${feld("lane", "Zeitverlust Boxengasse", "Sekunden, ohne Stehzeit", c.pit.lane)}
          ${feld("reifen", "Reifenwechsel", "Sekunden", c.pit.reifen)}
          ${feld("wechsel", "Fahrerwechsel", "Sekunden", c.pit.wechsel)}
          ${feld("reifenAlle", "Reifen wechseln", "alle X Stopps (0 = nie)", c.pit.reifenAlle)}
        </div>
        <label class="sp-check"><input type="checkbox" id="sp-par" ${c.pit.parallel ? "checked" : ""}> Tanken, Reifen und Fahrerwechsel laufen gleichzeitig (wie in iRacing)</label>
      </details>
      ${stintTabelle(c, r, false)}
      ${r.rows.length ? `<div class="tm-actions" style="margin-top:14px">${C.btn("Fahrer reihum verteilen", "sm", 'id="sp-rot"')}${C.btn("Runden zurücksetzen", "sm", 'id="sp-reset"')}</div>
        <p class="tm-muted" style="margin-top:10px">Runden leer lassen = so weit wie der Tank reicht. Änderungen rechnen sofort neu, gespeichert wird mit „Speichern" oben. Gespeicherte Startzeiten nutzt der Bot für die Stint-Pings.</p>` : ""}`;
    $$("[data-pit]").forEach(i => i.onchange = () => { c.pit[i.dataset.pit] = Math.max(0, num(i.value, c.pit[i.dataset.pit])); dirty(); stepPlan(body); $(".sp-pitbox").open = true; });
    $("#sp-par").onchange = (e) => { c.pit.parallel = e.target.checked; dirty(); stepPlan(body); $(".sp-pitbox").open = true; };
    bindStintEdit(body, c, stepPlan);
    const rot = $("#sp-rot");
    if (rot) rot.onclick = () => { c.stints = c.stints.map(s => ({ ...s, d: "" })); dirty(); stepPlan(body); };
    const rs = $("#sp-reset");
    if (rs) rs.onclick = () => { c.stints = c.stints.map(s => ({ ...s, laps: 0, reifen: null })); dirty(); stepPlan(body); };
  }

  function stintTabelle(c, r, live) {
    if (r.fehler.length) return `<div class="tm-box sp-warn"><h5>Noch nicht berechenbar</h5>${r.fehler.map(f => `<div>• ${esc(f)}</div>`).join("")}</div>`;
    const rows = r.rows;
    const stopps = rows.filter(x => x.pit).length;
    const runden = rows.reduce((a, x) => a + x.laps, 0);
    const sprit = rows.reduce((a, x) => a + x.fuel, 0);
    const ende = rows.length ? rows[rows.length - 1].bis : 0;
    const zeitFahrer = {};
    rows.forEach(x => { if (x.uid) zeitFahrer[x.uid] = (zeitFahrer[x.uid] || 0) + (x.bis - x.von); });
    const avDot = (x) => {
      if (!x.uid || x.real) return "";
      const v = verfuegbar(x.uid, x.von, x.bis, c);
      return `<span class="sp-dot ${v === -1 ? "" : VCOL[v]}" title="${v === -1 ? "Nichts eingetragen" : VTXT[v]}"></span>`;
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
      if (x.pit.hand) return `<span class="sp-pit">von Hand${x.pit.rein > 0 ? " · +" + x.pit.rein.toFixed(1) + " L" : ""}${x.pit.wechsel ? " · Fahrerwechsel" : ""}${x.pit.reifen ? " · Reifen" : ""}</span>`;
      const teile = [`${Math.round(x.pit.total)} s`, x.pit.rein > 0.05 ? `+${x.pit.rein.toFixed(1)} L` : "", x.pit.wechsel ? "Fahrerwechsel" : ""].filter(Boolean).join(" · ");
      const reifen = live || x.real ? (x.pit.reifen ? " · Reifen" : "") : ` <label class="sp-rf" title="Reifen wechseln"><input type="checkbox" data-sr="${x.i + 1}" ${x.pit.reifen ? "checked" : ""}>Reifen</label>`;
      return `<span class="sp-pit">${teile}${reifen}</span>`;
    };
    const zustand = (x) => x.real === "fertig" ? " · gefahren" : x.real === "hand" ? " · gefahren (von Hand)" : x.real === "laufend" ? " · läuft" : "";
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
          <td class="sp-zt">${uhr(x.von)} bis ${uhr(x.bis)}<small>${dauer(x.bis - x.von)}${zustand(x)}</small></td>
          <td class="sp-rd">${rundenFeld(x)}</td>
          <td>${fmtLap(x.pace)}</td>
          <td>${x.fuel.toFixed(1)} L</td>
          <td>${box(x)}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="sp-fahrzeit">${Object.entries(zeitFahrer).map(([u, ms]) => `<span class="tm-chip">${esc(memberName(u))}: ${dauer(ms)}</span>`).join("")}</div>
      <p class="tm-muted sp-legende"><span class="sp-dot ja"></span> verfügbar <span class="sp-dot evtl"></span> vielleicht <span class="sp-dot nein"></span> nicht verfügbar <span class="sp-dot"></span> nichts eingetragen</p>`;
  }
  function bindStintEdit(body, c, neu) {
    const ensure = (i) => { while (c.stints.length <= i) c.stints.push({ d: "", laps: 0, reifen: null }); return c.stints[i]; };
    const fixe = () => { rechne(c, null).rows.forEach(x => { if (x.real) return; const s = ensure(x.i); if (!s.d) s.d = x.uid; }); };
    body.querySelectorAll("[data-sd]").forEach(s => s.onchange = () => { fixe(); ensure(Number(s.dataset.sd)).d = s.value; dirty(); neu(body); });
    body.querySelectorAll("[data-sl]").forEach(s => s.onchange = () => { fixe(); ensure(Number(s.dataset.sl)).laps = Math.max(0, Math.round(num(s.value))); dirty(); neu(body); });
    body.querySelectorAll("[data-sr]").forEach(s => s.onchange = () => { fixe(); ensure(Number(s.dataset.sr)).reifen = s.checked; dirty(); neu(body); });
  }

  /* ---------- Schritt 4: Live (Garage 61) + Boxenstopp von Hand ---------- */
  async function stepLive(body) {
    const c = S.draft, mine = alive;
    const kopf = () => {
      const l = S.live;
      let txt = "Lädt …", live = false;
      if (l) {
        if (l.status === "live") { live = true; const n = l.autos && l.autos[c.key] ? l.autos[c.key].laps : 0; txt = `Stand ${uhr(l.at)} · ${n} Runden von Garage 61 · nächste Aktualisierung ${uhr(S.liveAt + LIVE_MS)}`; }
        else txt = l.info || l.status;
      }
      return `<div class="tm-box sp-livebox"><h5>Live aus Garage 61 <span class="tm-badge ${live ? "live" : "grey"}">${live ? "Live" : "Info"}</span></h5>
        <p class="hint">${esc(txt)}</p>
        <p class="tm-muted">Während des Rennens holt die Seite alle 5 Minuten die echten Runden aus Garage 61 (solange sie offen ist). Gefahrene Stints werden grün, der Rest wird ab dem echten Stand neu gerechnet. Dafür müssen die Fahrer Garage 61 laufen haben und in Schritt 2 verknüpft sein.</p>
        <div class="tm-actions">${C.btn("Jetzt aktualisieren", "sm", 'id="sp-lv"')}</div></div>`;
    };
    const handBox = () => {
      const stops = c.stops || [];
      const naechste = rechne(c, null).rows.find(x => !x.real);
      return `<details class="tm-box sp-hand" ${stops.length ? "open" : ""}><summary><h5>Boxenstopp von Hand eintragen</h5><span class="tm-muted">Notlösung, wenn Garage 61 nichts liefert</span></summary>
        <div class="sp-grid" style="margin-top:12px">
          <label class="sp-f"><span>Runde<small>Gesamtrunde beim Stopp</small></span><input class="tm-input" type="number" min="1" id="hs-lap" placeholder="z. B. 32"></label>
          <label class="sp-f"><span>Boxenausfahrt<small>Datum und Uhrzeit</small></span><input class="tm-input" type="datetime-local" id="hs-at" value="${toLocalInput(Date.now())}"></label>
          <label class="sp-f"><span>Fahrer danach</span><select class="tm-select" id="hs-u">${c.drivers.map(d => `<option value="${d.uid}" ${naechste && naechste.uid === d.uid ? "selected" : ""}>${esc(memberName(d.uid))}</option>`).join("")}</select></label>
          <label class="sp-f"><span>Getankt<small>Liter, leer = voll</small></span><input class="tm-input" type="number" min="0" step="0.1" id="hs-fuel"></label>
        </div>
        <label class="sp-check"><input type="checkbox" id="hs-reifen"> Reifen gewechselt</label>
        <div class="tm-actions" style="margin-top:10px">${C.btn("Boxenstopp eintragen", "red sm", 'id="hs-save"')}</div>
        ${stops.length ? `<div class="td-label">Eingetragen</div>${stops.map((s, i) => `<div class="sp-hs-row"><b>Runde ${s.lap}</b><span>${tagUhr(s.at)} · danach ${esc(memberName(s.u))}${s.fuel ? " · +" + s.fuel + " L" : ""}${s.reifen ? " · Reifen" : ""}${s.by ? " · von " + esc(s.by) : ""}</span><button type="button" class="sp-x" data-hsdel="${i}" title="Löschen">✕</button></div>`).join("")}` : ""}
      </details>`;
    };
    const zeichne = () => {
      if (mine !== alive || S.step !== "live" || !document.body.contains(body)) return;
      const lc = liveFuer(c);
      const r = rechne(c, lc);
      const quelle = r.quelle === "g61" ? '<p class="tm-muted sp-quelle">Grundlage: echte Runden aus Garage 61</p>' : r.quelle === "hand" ? '<p class="tm-muted sp-quelle">Grundlage: von Hand eingetragene Boxenstopps</p>' : "";
      body.innerHTML = kopf() + quelle + stintTabelle(c, r, true) + handBox();
      const lv = $("#sp-lv");
      if (lv) lv.onclick = () => holen(true);
      const hs = $("#hs-save");
      if (hs) hs.onclick = async () => {
        const lap = Math.round(num($("#hs-lap").value));
        const at = fromLocalInput($("#hs-at").value);
        if (!(lap > 0) || !at) return C.toast("Runde und Uhrzeit angeben");
        hs.disabled = true;
        try {
          const x = await C.api("/stint/stop", { method: "POST", body: { id: S.id, key: c.key, stop: { lap, at, u: $("#hs-u").value, fuel: num($("#hs-fuel").value), reifen: $("#hs-reifen").checked } } });
          C.toast(x.info, true); await neuLaden();
        } catch (e) { C.toast(e.message); hs.disabled = false; }
      };
      $$("[data-hsdel]").forEach(b => b.onclick = async () => {
        if (!confirm("Diesen Boxenstopp löschen?")) return;
        try { const x = await C.api("/stint/stop/delete", { method: "POST", body: { id: S.id, key: c.key, idx: Number(b.dataset.hsdel) } }); C.toast(x.info, true); await neuLaden(); }
        catch (e) { C.toast(e.message); }
      });
    };
    const holen = async (manuell) => {
      if (mine !== alive) return;
      const lv = $("#sp-lv"); if (lv) lv.disabled = true;
      try { S.live = await C.api("/stint/live?id=" + encodeURIComponent(S.id)); S.liveAt = Date.now(); }
      catch (e) { S.live = { status: "fehler", info: e.message }; }
      // nicht neu zeichnen, während jemand gerade einen Boxenstopp eintippt
      const fokus = document.activeElement;
      if (!manuell && fokus && fokus.closest && fokus.closest(".sp-hand")) return;
      zeichne();
      if (manuell && S.live && S.live.status !== "live") C.toast(S.live.info || "Keine Live-Daten");
    };
    zeichne();
    if (!S.live || Date.now() - S.liveAt > LIVE_MS - 5000) await holen(false);
    clearInterval(S.liveT);
    S.liveT = setInterval(() => {
      if (mine !== alive || !document.body.contains(body)) { clearInterval(S.liveT); return; }
      if (S.step === "live" && document.visibilityState === "visible" && Date.now() - S.liveAt >= LIVE_MS) holen(false);
    }, 30000);
  }

  window.F2FStint = { mount };
})();
