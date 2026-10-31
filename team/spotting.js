/* ===========================================================
   SPOTTING  Flag to Flag Motorsport
   Live-Ansicht laufender Rennen. Die Daten schicken FF Overlay bzw.
   die kreids888 Toolbox (spotting.py) alle 2 s über den Worker
   (Durable Object pro Rennen). Jeder wählt selbst, welches Rennen er
   ansieht – drei Leute in drei Rennen = drei Einträge.
   Live-Ansicht aus Fenstern: am Titel ziehen = verschieben, Ecke unten
   rechts = Größe; die anderen weichen aus. Anordnung pro Person im
   Browser gemerkt; auf dem Handy untereinander.
   Hash: #spotting · #spotting/<SubSessionID>
   Wird von team.js eingebunden (window.F2FSpotting.mount).
   =========================================================== */
(function () {
  let C = null, root = null, alive = 0, ws = null, wsSub = null, wiederT = null, listeT = null, alterT = null, planT = null;
  const S = { stand: null, strecke: null, sender: [], ereignisse: new Map(), klasse: "", auto: null, verbunden: false, verlauf: new Map(), sprit: null, plan: null, sub: null };
  const esc = (s) => C.esc(s);
  const pad = (n) => String(n).padStart(2, "0");
  const zeit = (s) => { if (!(s > 0)) return "–"; const m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + r.toFixed(3); };
  const dauer = (s) => { if (s == null || s < 0) return "–"; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ":" + pad(m) + ":" + pad(s % 60) : m + ":" + pad(s % 60); };
  const uhr = (ms) => new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const istF2F = (a, st) => !!a && ((st.ich && a.i === st.ich.idx) || (st.session.meineTeams || []).includes(a.team) || /\bf2f\b|flag ?to ?flag/i.test(a.team || ""));
  const TYP = { "Race": "Rennen", "Lone Qualify": "Quali", "Open Qualify": "Quali", "Qualify": "Quali", "Practice": "Training", "Lone Practice": "Training", "Warmup": "Warm-up", "Offline Testing": "Testfahrt" };

  const HINWEIS = `<div class="spt-hinweis"><b>So kommen Rennen hierher:</b> Wer fährt, braucht <b>FF Overlay</b> (oder die kreids888 Toolbox) offen und oben rechts mit <b>„Mit F2F verbinden"</b> angemeldet. Dann erscheint die Session hier automatisch, auch wenn mehrere von euch gleichzeitig in verschiedenen Rennen sind. Sprit und Strategie sieht man nur, wenn der Fahrer am Steuer das Programm laufen hat. Welche Sessions hier erscheinen (Teamrennen, Einzelrennen, Offline-Testfahrten), legt der Admin fest.</div>`;

  /* ---------------- Fenster und Anordnung ---------------- */
  const FENSTER = [
    { id: "auto", titel: "Unser Auto" }, { id: "karte", titel: "Streckenkarte" }, { id: "duell", titel: "Vorder- & Hintermann" },
    { id: "strategie", titel: "Strategie" }, { id: "gegner", titel: "Gegner deiner Klasse" }, { id: "feld", titel: "Feld" },
    { id: "relativ", titel: "Relativ" }, { id: "rl", titel: "Rennleitung" },
  ];
  // 12 Spalten, Zeilen à 46 px
  const STANDARD = {
    auto: { x: 0, y: 0, w: 4, h: 8 }, karte: { x: 4, y: 0, w: 4, h: 10 }, duell: { x: 8, y: 0, w: 4, h: 4 },
    strategie: { x: 8, y: 4, w: 4, h: 6 }, gegner: { x: 0, y: 8, w: 4, h: 5 }, feld: { x: 4, y: 10, w: 8, h: 12 },
    relativ: { x: 0, y: 13, w: 4, h: 6 }, rl: { x: 0, y: 19, w: 4, h: 9 },
  };
  const SPALTEN = 12, ZEILE = 46, LUECKE = 12, LAYOUT_KEY = "f2f_spotting_layout_v1";
  let LAYOUT = null;
  function layoutLaden() {
    let l = null;
    try { l = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null"); } catch (e) { l = null; }
    const out = {};
    for (const f of FENSTER) {
      const s = { ...STANDARD[f.id] }, x = l && l[f.id];
      out[f.id] = x && Number.isFinite(x.x) ? { x: klemm(x.x, 0, SPALTEN - 2), y: Math.max(0, x.y | 0), w: klemm(x.w, 2, SPALTEN), h: klemm(x.h, 3, 30), aus: !!x.aus } : s;
    }
    LAYOUT = out;
    kompakt();
  }
  const klemm = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));
  function layoutSpeichern() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(LAYOUT)); } catch (e) { /* egal */ } }
  const sichtbar = () => FENSTER.filter(f => !LAYOUT[f.id].aus).map(f => f.id);
  const ueber = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  // überlappende Fenster nach unten schieben, dann alles nach oben zusammenrücken
  function schieben(id) {
    const a = LAYOUT[id];
    for (const o of sichtbar()) if (o !== id && ueber(a, LAYOUT[o])) { LAYOUT[o].y = a.y + a.h; schieben(o); }
  }
  function kompakt(fest) {
    const ids = sichtbar().sort((p, q) => LAYOUT[p].y - LAYOUT[q].y || LAYOUT[p].x - LAYOUT[q].x);
    const fertig = [];
    if (fest) fertig.push(fest);
    for (const id of ids) {
      if (id === fest) continue;
      const it = LAYOUT[id];
      while (it.y > 0 && !fertig.some(o => ueber({ ...it, y: it.y - 1 }, LAYOUT[o]))) it.y--;
      while (fertig.some(o => ueber(it, LAYOUT[o]))) it.y++;
      fertig.push(id);
    }
  }
  const handy = () => window.matchMedia("(max-width: 900px)").matches;

  function aufraeumen() {
    clearTimeout(wiederT); clearInterval(listeT); clearInterval(alterT); clearInterval(planT);
    if (ws) { ws.onclose = null; try { ws.close(); } catch (e) { } ws = null; }
    wsSub = null;
  }
  window.addEventListener("hashchange", () => { if (!location.hash.startsWith("#spotting")) aufraeumen(); });
  window.addEventListener("resize", () => { if (root && root.querySelector("#spt-gitter")) setzeFenster(); });

  async function mount(el, ctx, sub) {
    C = ctx; root = el; alive++;
    aufraeumen();
    sub = String(sub || "").replace(/\D/g, "");
    if (!sub) return liste(alive);
    return live(sub, alive);
  }

  /* ---------------- Liste der laufenden Rennen ---------------- */
  async function liste(mine) {
    root.innerHTML = C.panelHead("eye", "Spotting", '<span class="tm-badge">Live</span>') + HINWEIS + '<div id="spt-liste"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const zeichne = async () => {
      let d;
      try { d = await C.api("/spotting/live"); } catch (e) { if (mine === alive) root.querySelector("#spt-liste").innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
      if (mine !== alive) return;
      const r = d.rennen || [];
      root.querySelector("#spt-liste").innerHTML = r.length ? `<div class="sp-cards">${r.map(x => `
        <a class="sp-card spt-karte${x.aktiv ? "" : " aus"}" href="#spotting/${esc(x.sub)}">
          <div class="sp-card-h"><b>${esc(x.strecke || "Rennen " + x.sub)}</b>${x.aktiv ? '<span class="tm-badge live">Live</span>' : '<span class="tm-badge grey">Beendet</span>'}</div>
          <div class="sp-card-m">${esc([TYP[x.typ] || x.typ, x.variante].filter(Boolean).join(" · "))}</div>
          <div class="sp-card-f"><span>${C.ICONS.helmet || ""}${esc(x.von || "?")}</span>${(x.teams || []).length ? `<span>${C.ICONS.car}${esc(x.teams.join(", "))}</span>` : ""}<span>${x.autos} Autos</span></div>
        </a>`).join("")}</div>` : '<div class="tm-box"><p class="tm-muted">Gerade fährt niemand mit verbundenem FF Overlay. Sobald jemand in einer Online-Session ist, taucht das Rennen hier auf.</p></div>';
    };
    await zeichne();
    listeT = setInterval(() => { if (mine === alive && location.hash === "#spotting") zeichne(); }, 15000);
  }

  /* ---------------- Live-Ansicht eines Rennens ---------------- */
  function live(sub, mine) {
    Object.assign(S, { stand: null, strecke: null, sender: [], ereignisse: new Map(), verbunden: false, verlauf: new Map(), sprit: null, plan: null, auto: null, sub, kopfHtml: "" });
    layoutLaden();
    root.innerHTML = `<a class="sp-back" href="#spotting">← Alle Rennen</a><div id="spt-kopf"></div>
      <div class="spt-gitter" id="spt-gitter">${FENSTER.map(f => `
        <section class="spt-f" data-f="${f.id}"><header class="spt-fh"><span class="spt-griff">⠿</span><b>${f.titel}</b><button type="button" class="spt-fx" data-zu="${f.id}" title="Fenster ausblenden">✕</button></header>
          <div class="spt-fb" id="spt-f-${f.id}"></div><i class="spt-ecke" title="Größe ändern"></i></section>`).join("")}</div>
      <div class="spt-fuss">${HINWEIS}</div>`;
    setzeFenster();
    bindeFenster();
    zeichne();
    verbinde(sub, mine, 0);
    alterT = setInterval(() => { const el = root.querySelector("#spt-alter"); if (el && S.stand) el.textContent = alterText(); }, 1000);
    planT = setInterval(() => { if (mine === alive) planLaden(true); }, 5 * 60000);
  }
  function setzeFenster() {
    const g = root.querySelector("#spt-gitter");
    if (!g) return;
    const mobil = handy();
    g.classList.toggle("mobil", mobil);
    let max = 0;
    for (const f of FENSTER) {
      const el = g.querySelector(`[data-f="${f.id}"]`), l = LAYOUT[f.id];
      el.hidden = !!l.aus;
      if (mobil) { el.style.cssText = ""; el.style.order = l.y * 100 + l.x; continue; }
      el.style.order = "";
      el.style.gridColumn = `${l.x + 1} / span ${l.w}`;
      el.style.gridRow = `${l.y + 1} / span ${l.h}`;
      if (!l.aus) max = Math.max(max, l.y + l.h);
    }
    g.style.gridTemplateRows = mobil ? "" : `repeat(${max}, ${ZEILE}px)`;
  }
  // Ziehen am Titel = verschieben, Ziehen an der Ecke = Größe ändern (Raster 12 Spalten × 46 px)
  function bindeFenster() {
    const g = root.querySelector("#spt-gitter");
    g.addEventListener("click", (e) => { const b = e.target.closest("[data-zu]"); if (b) { LAYOUT[b.dataset.zu].aus = true; kompakt(); layoutSpeichern(); setzeFenster(); kopf(); } });
    g.addEventListener("pointerdown", (e) => {
      if (handy() || e.button !== 0 || e.target.closest("[data-zu]")) return;
      const ecke = e.target.closest(".spt-ecke"), kopfteil = e.target.closest(".spt-fh");
      if (!ecke && !kopfteil) return;
      const el = e.target.closest(".spt-f"), id = el.dataset.f, l = LAYOUT[id];
      const r = g.getBoundingClientRect(), spalte = (r.width + LUECKE) / SPALTEN, zeile = ZEILE + LUECKE;
      const start = { x: e.clientX, y: e.clientY, l: { ...l } };
      el.classList.add("zieht"); g.classList.add("ordnen");
      e.preventDefault();
      const zug = (ev) => {
        const dx = Math.round((ev.clientX - start.x) / spalte), dy = Math.round((ev.clientY - start.y) / zeile);
        if (ecke) { l.w = klemm(start.l.w + dx, 2, SPALTEN - l.x); l.h = klemm(start.l.h + dy, 3, 30); }
        else { l.x = klemm(start.l.x + dx, 0, SPALTEN - l.w); l.y = Math.max(0, start.l.y + dy); }
        schieben(id); kompakt(id); setzeFenster();
      };
      const los = () => {
        document.removeEventListener("pointermove", zug); document.removeEventListener("pointerup", los);
        el.classList.remove("zieht"); g.classList.remove("ordnen");
        kompakt(); layoutSpeichern(); setzeFenster();
      };
      document.addEventListener("pointermove", zug); document.addEventListener("pointerup", los);
    });
  }

  /* ---------------- Verbindung ---------------- */
  function verbinde(sub, mine, versuch) {
    const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/team/spotting/ws?sub=" + encodeURIComponent(sub);
    ws = new WebSocket(url); wsSub = sub;
    ws.onopen = () => { S.verbunden = true; versuch = 0; kopf(); };
    ws.onmessage = (e) => {
      if (mine !== alive) return;
      let j; try { j = JSON.parse(e.data); } catch (x) { return; }
      if (j.typ === "stand") { neuerStand(j); zeichne(); }
      else if (j.typ === "strecke") { S.strecke = j; zeichneKarte(); }
      else if (j.typ === "sender") { S.sender = j.liste || []; kopf(); }
    };
    ws.onclose = () => {
      S.verbunden = false;
      if (mine !== alive || wsSub !== sub) return;
      kopf();
      wiederT = setTimeout(() => verbinde(sub, mine, versuch + 1), Math.min(30000, 2000 * (versuch + 1)));
    };
  }
  const alterText = () => { const s = Math.max(0, Math.round((Date.now() - (S.stand.t || Date.now())) / 1000)); return s < 5 ? "live" : "Stand vor " + s + " s"; };

  function neuerStand(j) {
    const erster = !S.stand;
    S.stand = j;
    for (const ev of j.ereignisse || []) S.ereignisse.set(ev.w + ":" + ev.art + ":" + ev.i, ev);
    if (j.ich && j.ich.sprit != null) S.sprit = { ...j.ich, t: j.t, runde: (j.autos.find(a => a.i === j.ich.idx) || {}).runde };
    const unsere = j.autos.filter(a => istF2F(a, j));
    if (S.auto == null || !j.autos.some(a => a.i === S.auto)) S.auto = (unsere[0] || j.autos[0] || {}).i ?? null;
    // Abstandsverlauf jedes Autos zu seinem Vordermann in der Klasse merken (Schlüssel hinten:vorne, für ± Vorne/Hinten)
    const f = klassenFeld(j);
    for (const liste of Object.values(f)) {
      for (let n = 1; n < liste.length; n++) {
        const hinten = liste[n], vorne = liste[n - 1], g = abstandSek(hinten, vorne, j);
        if (g == null) continue;
        const key = hinten.i + ":" + vorne.i, v = S.verlauf.get(key) || [];
        v.push({ t: j.t, g });
        while (v.length > 120) v.shift();
        S.verlauf.set(key, v);
      }
    }
    if (S.verlauf.size > 400) for (const [k, v] of S.verlauf) if (j.t - v[v.length - 1].t > 5 * 60000) S.verlauf.delete(k);
    if (erster) planLaden(false);
  }

  /* ---------------- Rechnen ---------------- */
  const estKlasse = (st, k) => ((st.session.klassen || []).find(x => String(x.id) === String(k)) || {}).est || 0;
  function klassenFeld(st) {
    const nachKlasse = {};
    for (const a of st.autos) (nachKlasse[a.k] = nachKlasse[a.k] || []).push(a);
    for (const liste of Object.values(nachKlasse)) {
      liste.sort((x, y) => (x.kpos || 999) - (y.kpos || 999) || ((y.runde || 0) + (y.pct || 0)) - ((x.runde || 0) + (x.pct || 0)));
      const spitze = liste[0];
      liste.forEach((a, n) => { a._gap = abstandText(a, spitze, st); a._int = n ? abstandText(a, liste[n - 1], st) : ""; });
    }
    return nachKlasse;
  }
  // Abstand in Sekunden von a (hinten) zu b (vorne); null wenn nicht bestimmbar
  function abstandSek(a, b, st) {
    const rd = ((b.runde || 0) + (b.pct || 0)) - ((a.runde || 0) + (a.pct || 0));
    if (a.f2 > 0 && b.f2 >= 0 && a.f2 >= b.f2 && rd < 1) return a.f2 - b.f2;
    const est = estKlasse(st, a.k) || a.best || 0;
    return est > 0 && rd >= 0 ? rd * est : null;
  }
  function abstandText(a, ref, st) {
    if (a === ref) return "Spitze";
    const rd = ((ref.runde || 0) + (ref.pct || 0)) - ((a.runde || 0) + (a.pct || 0));
    if (rd >= 1) return "+" + Math.floor(rd) + " Rd.";
    const g = abstandSek(a, ref, st);
    return g != null ? "+" + g.toFixed(1).replace(".", ",") + " s" : "–";
  }
  // Trend über ungefähr die letzten zwei Runden: Sekunden pro Runde (minus = Abstand schrumpft)
  function trend(key, est) {
    const v = S.verlauf.get(key);
    if (!v || v.length < 3 || !(est > 0)) return null;
    const jetzt = v[v.length - 1], fenster = Math.min(2 * est * 1000, jetzt.t - v[0].t);
    if (fenster < 20000) return null;
    const alt = v.find(x => jetzt.t - x.t <= fenster) || v[0];
    if (jetzt.t === alt.t) return null;
    return (jetzt.g - alt.g) / ((jetzt.t - alt.t) / 1000) * est;
  }
  // ± Vorne: wie sich der Abstand zum Vordermann ändert (minus = holt auf); ± Hinten: zum Hintermann (plus = baut aus)
  function plusMinus(x, liste, st) {
    const n = liste.indexOf(x), est = estKlasse(st, x.k) || x.best;
    return { vorne: n > 0 ? trend(x.i + ":" + liste[n - 1].i, est) : null, hinten: liste[n + 1] ? trend(liste[n + 1].i + ":" + x.i, est) : null };
  }
  const pmZahl = (t, gutWennPlus) => t == null ? "" : `<span class="spt-pm ${Math.abs(t) < 0.05 ? "" : (t > 0) === gutWennPlus ? "gut" : "schlecht"}">${t > 0 ? "+" : t < 0 ? "−" : "±"}${Math.abs(t).toFixed(1).replace(".", ",")}</span>`;
  // Relativ auf der Strecke: Sekunden von „von" bis „zu" (plus = zu fährt vor uns), über die Rundenlänge gefaltet
  function relativSek(von, zu, st) {
    const lap = estKlasse(st, von.k) || von.best || 0;
    if (!(lap > 0) || !(von.est >= 0) || !(zu.est >= 0)) return null;
    let d = zu.est - von.est;
    if (d > lap / 2) d -= lap;
    if (d < -lap / 2) d += lap;
    return d;
  }
  const NASS = ["", "Trocken", "Trocken", "Feucht", "Feucht", "Nass", "Nass", "Nass"];
  const reifenName = (st, x) => {
    if (x.rf == null) return "–";
    const alle = st.session.reifen || [], n = (alle.find(r => r.i === x.rf) || {}).n || "";
    if (/wet|rain/i.test(n)) return "Regen";
    if (!n) return x.rf === 0 ? "Slick" : "Typ " + x.rf;
    if (alle.filter(r => !/wet|rain/i.test(r.n)).length <= 1) return "Slick"; // nur eine Trockenmischung: einfach Slick
    return { hard: "Hart", medium: "Mittel", soft: "Weich" }[n.toLowerCase()] || n;
  };

  /* ---------------- Stintplaner (Plan zum laufenden Rennen) ---------------- */
  async function planLaden(still) {
    const st = S.stand;
    if (!st) return;
    try {
      const d = await C.api("/stint/list");
      const jetzt = Date.now(), strecke = norm(st.session.strecke).split(" ").slice(0, 2).join(" ");
      const ende = (p) => Math.max(p.start, ...p.cars.map(c => c.start || p.start)) + (p.mode === "zeit" ? p.dauerMin * 60000 : 8 * 3600000);
      const kand = (d.list || []).filter(p => jetzt > p.start - 3 * 3600000 && jetzt < ende(p) + 3600000 && (!strecke || norm(p.track).includes(strecke)));
      if (!kand.length) { S.plan = null; return; }
      const r = await C.api("/stint/plan?id=" + encodeURIComponent(kand[0].id));
      S.plan = r.plan;
      if (!still) zeichne();
    } catch (e) { S.plan = null; }
  }

  /* ---------------- Zeichnen ---------------- */
  function kopf() {
    const box = root && root.querySelector("#spt-kopf");
    if (!box) return;
    const st = S.stand, s = st && st.session;
    const sender = S.sender.find(x => x.aktiv);
    const aus = FENSTER.filter(f => LAYOUT[f.id].aus);
    const wetter = s ? [s.luft != null ? s.luft + " °C Luft" : "", s.asphalt != null ? s.asphalt + " °C Asphalt" : "", s.nass_erklaert ? "Nass erklärt" : ""].filter(Boolean).join(" · ") : "";
    const nass = s ? NASS[s.nass] || "" : "";
    const laenge = !s ? "" : Number(s.runden_gesamt) > 0 ? "Renndauer " + s.runden_gesamt + " Runden" : s.dauer > 0 && s.dauer < 1e5 ? "Renndauer " + Math.floor(s.dauer / 60) + ":" + pad(Math.round(s.dauer % 60)) + " h" : "";
    const unsere = st ? st.autos.filter(a => istF2F(a, st)) : [];
    const unsereKl = [...new Set(unsere.map(a => String(a.k)))];
    const klName = (id) => ((s && s.klassen || []).find(k => String(k.id) === id) || {}).name || "";
    const klFarbe = (id) => { const f = String(((s && s.klassen || []).find(k => String(k.id) === id) || {}).farbe || "").replace(/^0x/, "#"); return /^#[0-9a-f]{6}$/i.test(f) ? f : "#e11324"; };
    const html = `<div class="spt-kopf">
      ${s ? `<span class="tm-badge live">${esc(TYP[s.typ] || s.typ || "Session")}</span>${nass ? `<span class="spt-wx ${nass.toLowerCase()}">${nass}</span>` : ""}<h3>${esc(s.strecke)}${s.variante ? ` <small>${esc(s.variante)}</small>` : ""}</h3>
        <span class="spt-meta">${[laenge, st.autos.length + " Teilnehmer", "Klassen " + (s.klassen || []).map(k => esc(k.name)).join(", "), esc(wetter)].filter(Boolean).join(" · ")}</span>
        ${unsere.length ? `<div class="spt-unsere">${unsereKl.map(k => `<span class="spt-kl" style="--k:${klFarbe(k)}">${esc(klName(k))}</span>`).join("")}<small>= unsere Autos</small><b>${unsere.length} F2F-${unsere.length === 1 ? "Auto" : "Autos"} in dieser Session</b></div>` : ""}` : "<h3>Verbinde …</h3>"}
      <span class="spt-quelle"><i class="${S.verbunden ? "an" : ""}"></i>${st ? `Daten von ${esc(sender ? sender.name : st.von || "?")} · <span id="spt-alter"></span>` : S.verbunden ? "verbunden, warte auf Daten" : "getrennt"}</span>
      <span class="spt-werkzeug">${aus.length ? `<select class="tm-select" id="spt-wieder"><option value="">+ Fenster (${aus.length})</option>${aus.map(f => `<option value="${f.id}">${esc(f.titel)}</option>`).join("")}</select>` : ""}${C.btn("Standard", "sm", 'id="spt-std" title="Fenster wieder wie am Anfang anordnen"')}</span>
    </div>`;
    const alter = box.querySelector("#spt-alter");
    if (st && alter) alter.textContent = alterText();
    if (html === S.kopfHtml) return; // nur neu bauen, wenn sich etwas ändert (sonst klappt die Auswahl zu)
    S.kopfHtml = html;
    box.innerHTML = html;
    if (st) box.querySelector("#spt-alter").textContent = alterText();
    const w = box.querySelector("#spt-wieder");
    if (w) w.onchange = () => { if (!w.value) return; LAYOUT[w.value].aus = false; LAYOUT[w.value].y = 999; kompakt(); layoutSpeichern(); setzeFenster(); kopf(); zeichne(); };
    box.querySelector("#spt-std").onclick = () => { try { localStorage.removeItem(LAYOUT_KEY); } catch (e) { } layoutLaden(); setzeFenster(); kopf(); zeichne(); };
  }

  function zeichne() {
    if (!root || !root.querySelector("#spt-gitter")) return;
    kopf();
    const st = S.stand;
    const leer = (txt) => `<p class="tm-muted">${txt}</p>`;
    if (!st) { for (const f of FENSTER) setze(f.id, leer(S.verbunden ? "Warte auf die ersten Daten …" : "Verbinde …")); return; }
    const s = st.session, klassen = s.klassen || [];
    const felder = klassenFeld(st);
    const unsere = st.autos.filter(a => istF2F(a, st));
    const a = st.autos.find(x => x.i === S.auto);
    const kl = (id) => klassen.find(k => String(k.id) === String(id)) || { name: "" };
    const farbe = (id) => { const f = String(kl(id).farbe || "").replace(/^0x/, "#"); return /^#[0-9a-f]{6}$/i.test(f) ? f : "#e11324"; };
    const name = (x) => x ? (x.team || x.fahrer) + (x.nr ? " #" + x.nr : "") : "";
    const kachel = (l, w, k = "") => `<div class="spt-k${k}"><small>${l}</small><b>${w}</b></div>`;
    const rest = s.rest > 0 && s.rest < 1e6 ? dauer(s.rest) : s.runden_rest > 0 && s.runden_rest < 32767 ? s.runden_rest + " Rd." : "–";

    // Unser Auto
    setze("auto", `${unsere.length > 1 ? `<div class="sp-seg spt-autowahl">${unsere.map(u => `<button type="button" data-auto="${u.i}" class="${u.i === S.auto ? "on" : ""}">${esc(u.team || u.fahrer)}</button>`).join("")}</div>` : ""}
      ${a ? `<div class="spt-auto-n"><span class="spt-kl" style="--k:${farbe(a.k)}">${esc(kl(a.k).name)}</span><b>${esc(name(a))}</b><small>am Steuer: ${esc(a.fahrer)}</small>
        ${(a.fahrerAlle || []).filter(n => n !== a.fahrer).length ? `<small class="spt-dabei">dabei: ${esc(a.fahrerAlle.filter(n => n !== a.fahrer).join(", "))}</small>` : ""}${a.auto ? `<small class="spt-dabei">${esc(a.auto)}</small>` : ""}</div>
      <div class="spt-kacheln">
        ${kachel("Pos. gesamt", "P" + (a.pos || "–") + `<small>/${st.autos.length}</small>`)}${kachel("Pos. Klasse", "P" + (a.kpos || "–") + `<small>/${(felder[a.k] || []).length}</small>`, " unser")}
        ${kachel("Klassenspitze", esc(a._gap))}${kachel("Runde", a.runde ?? "–")}
        ${kachel("Rennzeit", dauer(s.gruen != null ? s.zeit - s.gruen : s.zeit))}${kachel("Restzeit", rest)}
        ${kachel("Letzte", zeit(a.last))}${kachel("Beste", zeit(a.best))}
        ${kachel("Stint", a.stint_s != null ? dauer(a.stint_s) + (a.stint_r != null ? `<small> · ${a.stint_r} Rd.</small>` : "") : "–")}${kachel("Stopps", a.stopps || 0)}
        ${kachel("Start", a.kstart ? "P" + a.kstart + (a.start && a.start !== a.kstart ? `<small> · ges. P${a.start}</small>` : "") : "–")}${kachel("Ø 5 Runden", zeit(a.o5))}
        ${kachel("Reifen", reifenName(st, a))}
      </div>${a.box ? '<div class="spt-box-an">In der Box</div>' : ""}` : leer("Kein F2F-Auto in diesem Rennen gefunden.")}`);
    root.querySelectorAll("[data-auto]").forEach(b => b.onclick = () => { S.auto = Number(b.dataset.auto); zeichne(); });

    // Vorder- & Hintermann
    if (a) {
      const liste = felder[a.k] || [], n = liste.indexOf(a), vor = liste[n - 1], hinter = liste[n + 1], est = estKlasse(st, a.k) || a.best;
      const zeile = (o, vorne) => {
        if (!o) return `<div class="spt-duell leer">${vorne ? "Niemand vor dir – Klassenspitze" : "Niemand hinter dir"}</div>`;
        const g = vorne ? abstandSek(a, o, st) : abstandSek(o, a, st), t = trend(vorne ? a.i + ":" + o.i : o.i + ":" + a.i, est);
        const tt = t == null ? "Trend nach ca. 2 Runden" : Math.abs(t) < 0.05 ? "± 0,0 s/Rd. – gleich schnell"
          : vorne ? (t < 0 ? `▲ holst ${Math.abs(t).toFixed(1).replace(".", ",")} s/Rd. auf` : `▼ verlierst ${t.toFixed(1).replace(".", ",")} s/Rd.`)
            : (t < 0 ? `▼ kommt ${Math.abs(t).toFixed(1).replace(".", ",")} s/Rd. näher` : `▲ du baust ${t.toFixed(1).replace(".", ",")} s/Rd. aus`);
        const gut = t != null && (vorne ? t < 0 : t > 0);
        return `<div class="spt-duell"><small>${vorne ? "Vordermann" : "Hintermann"} · P${o.kpos || "–"}</small><b>${esc(name(o))}</b>
          <span class="spt-gap">${g != null ? (vorne ? "+" : "−") + g.toFixed(1).replace(".", ",") + " s" : esc(vorne ? a._int : o._int)}</span>
          <span class="spt-trend ${t == null ? "" : gut ? "gut" : "schlecht"}">${tt}</span>${o.box ? '<span class="tm-badge">Box</span>' : ""}</div>`;
      };
      setze("duell", zeile(vor, true) + zeile(hinter, false));
    } else setze("duell", leer("Kein F2F-Auto ausgewählt."));

    // Strategie: Sprit (nur wenn der Fahrer selbst sendet) + Plan aus dem Stintplaner
    setze("strategie", strategie(st, a));

    // Gegner deiner Klasse: drei vor und drei hinter uns
    if (a) {
      const liste = felder[a.k] || [], n = liste.indexOf(a);
      const um = liste.slice(Math.max(0, n - 3), n + 4);
      setze("gegner", `<ul class="spt-gegner">${um.map(o => {
        const g = o === a ? "" : o.kpos < a.kpos ? abstandSek(a, o, st) : abstandSek(o, a, st);
        return `<li class="${o === a ? "ich" : ""}"><b>P${o.kpos || "–"}</b><span>${esc(name(o))}</span>
          <em>${o === a ? "wir" : g != null ? (o.kpos < a.kpos ? "vor dir " : "hinter dir ") + g.toFixed(1).replace(".", ",") + " s" : ""}</em>
          <small>${o.stopps ? o.stopps + (o.stopps === 1 ? " Stopp" : " Stopps") + (o.box_s ? ` · zuletzt ${o.box_s.toFixed(0)} s Boxengasse` : "") : "noch kein Stopp beobachtet"}${o.stint_r != null ? ` · Stint ${o.stint_r} Rd.` : ""}</small></li>`;
      }).join("")}</ul>`);
    } else setze("gegner", leer("Kein F2F-Auto ausgewählt."));

    // Feld
    if (!S.klasse || !felder[S.klasse]) S.klasse = String((a || st.autos[0] || {}).k ?? "");
    // Relativ zu unserem Auto (gleiche Klasse: Abstand nach Position, sonst über die Strecke)
    const zuUns = (x) => {
      if (!a || x === a) return x === a ? "wir" : "";
      const rd = ((x.runde || 0) + (x.pct || 0)) - ((a.runde || 0) + (a.pct || 0));
      if (Math.abs(rd) >= 1) return (rd > 0 ? "+" : "−") + Math.floor(Math.abs(rd)) + " Rd.";
      const g = rd > 0 ? abstandSek(a, x, st) : abstandSek(x, a, st);
      return g == null ? "–" : (rd > 0 ? "+" : "−") + g.toFixed(1).replace(".", ",") + " s";
    };
    const klListe = felder[S.klasse] || [];
    const fz = (x) => {
      const pm = plusMinus(x, klListe, st);
      return `<tr class="${istF2F(x, st) ? "unser" : ""}${x.box ? " inbox" : ""}">
      <td><b>${x.kpos || "–"}</b></td><td>${esc(x.nr)}</td>
      <td class="spt-name">${x.team ? `<b>${esc(x.team)}</b><small>${esc(x.fahrer)}</small>` : `<b>${esc(x.fahrer)}</b>`}</td>
      <td>${x.runde ?? "–"}</td><td>${esc(x._gap)}</td><td>${esc(x._int)}</td><td class="spt-rel">${zuUns(x)}</td>
      <td>${zeit(x.last)}</td><td>${zeit(x.o5)}</td><td>${pmZahl(pm.vorne, false)}</td><td>${pmZahl(pm.hinten, true)}</td><td>${zeit(x.best)}</td>
      <td>${esc(reifenName(st, x))}</td><td>${x.kstart ? "P" + x.kstart : "–"}</td>
      <td>${x.stint_s != null ? dauer(x.stint_s) + (x.stint_r != null ? " · " + x.stint_r + " Rd." : "") : "–"}</td><td>${x.stopps || 0}</td>
      <td>${x.box ? '<span class="tm-badge">Box</span>' : x.fl === -1 ? '<span class="tm-badge grey">weg</span>' : ""}</td></tr>`;
    };
    setze("feld", `<div class="sp-seg spt-klassen">${Object.keys(felder).map(k => `<button type="button" data-kl="${esc(k)}" class="${k === S.klasse ? "on" : ""}">${esc(kl(k).name || "Klasse")}</button>`).join("")}</div>
      <table class="spt-tab"><thead><tr><th>Pos</th><th>#</th><th>Team / Fahrer</th><th>Rd.</th><th>Abst. Kl.</th><th>Intervall</th><th>Relativ</th><th>Letzte</th><th title="Schnitt der letzten 5 sauberen Runden">Ø 5 Rd.</th><th title="Abstand zum Vordermann, Sekunden pro Runde (minus = holt auf)">± Vorne</th><th title="Abstand zum Hintermann, Sekunden pro Runde (plus = baut aus)">± Hinten</th><th>Beste</th><th>Reifen</th><th>Start</th><th>Stint</th><th>Stopps</th><th></th></tr></thead>
      <tbody>${klListe.map(fz).join("")}</tbody></table>
      <p class="tm-muted spt-klein">Ø 5 Rd. = letzte 5 saubere Runden (ohne Box, Abflug, Start, Ausreißer). ± in Sekunden pro Runde über etwa 2 Runden. Schaden gibt iRacing für andere Autos nicht heraus.</p>`);
    root.querySelectorAll("[data-kl]").forEach(b => b.onclick = () => { S.klasse = b.dataset.kl; zeichne(); });

    // Relativ: wer auf der Strecke direkt vor und hinter uns fährt (alle Klassen, wie im iRacing-Relative)
    if (a && a.est >= 0 && a.fl !== -1) {
      const um = st.autos.filter(x => x !== a && x.fl !== -1 && x.pct >= 0).map(x => ({ x, d: relativSek(a, x, st) })).filter(o => o.d != null);
      const vor = um.filter(o => o.d > 0).sort((p, q) => p.d - q.d).slice(0, 4).reverse();
      const hin = um.filter(o => o.d <= 0).sort((p, q) => q.d - p.d).slice(0, 4);
      const zeile = (o) => {
        const x = o ? o.x : a, d = o ? o.d : 0;
        const rd = Math.round(((x.runde || 0) + (x.pct || 0)) - ((a.runde || 0) + (a.pct || 0)) - (o ? d / (estKlasse(st, a.k) || a.best || 1) : 0));
        return `<li class="${x === a ? "ich" : istF2F(x, st) ? "unser" : ""}${x.box ? " inbox" : ""}">
          <em>${x === a ? "" : (d > 0 ? "+" : "−") + Math.abs(d).toFixed(1).replace(".", ",") + " s"}</em>
          <span class="spt-kl" style="--k:${farbe(x.k)}">${esc(kl(x.k).name)}</span><b>${x.nr ? "#" + esc(x.nr) : ""}</b>
          <span class="spt-rel-n">${esc(x === a ? name(a) : x.team || x.fahrer)}</span>
          <small>${rd > 0 ? '<span class="spt-rd vor">+' + rd + " Rd.</span>" : rd < 0 ? '<span class="spt-rd zurueck">' + rd + " Rd.</span>" : ""}${x.box ? '<span class="tm-badge">Box</span>' : ""}</small></li>`;
      };
      setze("relativ", `<ul class="spt-relativ">${vor.map(zeile).join("")}${zeile(null)}${hin.map(zeile).join("")}</ul>`);
    } else setze("relativ", leer(a ? "Unser Auto ist gerade nicht auf der Strecke." : "Kein F2F-Auto ausgewählt."));

    // Rennleitung
    const ev = [...S.ereignisse.values()].filter(e => Date.now() - e.w < 10 * 60000 || S.ereignisse.size < 15).sort((x, y) => y.w - x.w).slice(0, 25);
    const autoName = (i) => name(st.autos.find(x => x.i === i));
    setze("rl", ev.length ? `<ul class="spt-rl">${ev.map(e => `<li class="spt-ev-${esc(e.art)}${e.i != null && istF2F(st.autos.find(x => x.i === e.i), st) ? " unser" : ""}"><small>${uhr(e.w)}</small>${e.i != null ? `<b>${esc(autoName(e.i))}</b> ` : ""}${esc(e.text)}${e.r ? ` <span class="spt-ev-rd">(Runde ${e.r})</span>` : ""}</li>`).join("")}</ul>` : leer("Noch nichts los."));

    zeichneKarte();
  }
  // Fensterinhalt ersetzen, Scrollposition behalten (alle 2 s neu)
  function setze(id, html) {
    const el = root.querySelector("#spt-f-" + id);
    if (!el || LAYOUT[id].aus) return;
    const oben = el.scrollTop, links = el.scrollLeft;
    el.innerHTML = html;
    el.scrollTop = oben; el.scrollLeft = links;
  }

  function strategie(st, a) {
    const s = st.session, sp = S.sprit;
    let html = "";
    // Rundenzeit und Restrunden aus den sauberen Runden (für jedes Auto, auch ohne Spritdaten)
    const lap = (a && (a.o5 || (a.last > 0 ? a.last : a.best))) || estKlasse(st, a && a.k) || 0;
    const restRd = s.rest > 0 && s.rest < 1e6 && lap > 0 ? Math.ceil(s.rest / lap) : s.runden_rest > 0 && s.runden_rest < 32767 ? s.runden_rest : null;
    if (a) {
      html += `<div class="spt-kacheln">
        <div class="spt-k"><small>Ø Rundenzeit</small><b>${a.o5 ? zeit(a.o5) + '<small> gemessen</small>' : "–"}</b></div>
        <div class="spt-k"><small>Restrunden</small><b>${restRd != null ? "~" + restRd : "–"}</b></div>
        <div class="spt-k"><small>Saubere Runden</small><b>${a.sr ?? "–"}</b></div>
      </div>${a.o5 && s.rest > 0 && s.rest < 1e6 ? `<p class="tm-muted spt-klein">Restzeit ${dauer(s.rest)} ÷ ${zeit(a.o5)} = ${(s.rest / a.o5).toFixed(1).replace(".", ",")} → aufgerundet ${restRd} Runden. Ø aus den letzten 5 sauberen Runden (ohne Box, Abflug, Start, Ausreißer).</p>` : ""}`;
    }
    if (sp && sp.sprit != null && (!a || sp.idx === a.i)) {
      const alt = Math.round((Date.now() - sp.t) / 1000);
      const bisLeer = sp.verbrauch ? Math.floor(sp.sprit / sp.verbrauch) : null;
      const noetig = restRd != null && sp.verbrauch ? restRd * sp.verbrauch : null;
      const stopps = noetig != null && sp.tank ? Math.max(0, Math.ceil((noetig - sp.sprit) / (sp.tank * 0.98))) : null;
      html += `<div class="spt-kacheln">
        <div class="spt-k"><small>Sprit</small><b>${sp.sprit.toFixed(1)} L${sp.tank ? `<small> / ${sp.tank.toFixed(0)}</small>` : ""}</b></div>
        <div class="spt-k"><small>Verbrauch</small><b>${sp.verbrauch ? sp.verbrauch.toFixed(2).replace(".", ",") + "<small> L/Rd.</small>" : "–"}</b></div>
        <div class="spt-k${bisLeer != null && bisLeer <= 3 ? " warn" : ""}"><small>Runden bis leer</small><b>${bisLeer ?? "–"}</b></div>
        <div class="spt-k"><small>Sprit bis Ende</small><b>${noetig != null ? noetig.toFixed(0) + "<small> L</small>" : "–"}</b></div>
        <div class="spt-k"><small>Stopps nötig</small><b>${stopps ?? "–"}</b></div>
        <div class="spt-k"><small>Nächster Stopp</small><b>${bisLeer != null && sp.runde != null ? "Rd. " + (sp.runde + bisLeer) : "–"}</b></div>
      </div>${alt > 20 ? `<p class="tm-muted spt-klein">Spritstand von vor ${dauer(alt)}, der Fahrer am Steuer sendet gerade nicht.</p>` : ""}`;
    } else {
      html += `<p class="tm-muted spt-klein">Sprit und Verbrauch kommen nur, wenn der Fahrer am Steuer FF Overlay bzw. die Toolbox laufen hat und sendet.</p>`;
    }
    // Plan aus dem Stintplaner: Fahrzeug mit gleichem Teamnamen, nächste Stints
    const p = S.plan;
    if (p) {
      const car = (p.cars || []).find(c => a && c.name && norm(c.name) === norm(a.team)) || (p.cars || [])[0];
      const sched = car && Array.isArray(car.schedule) ? [...car.schedule].sort((x, y) => x.v - y.v) : [];
      const fahrer = (u) => ((car && car.drivers || []).find(d => d.uid === u) || {}).name || "?";
      const jetzt = Date.now();
      const akt = sched.filter(x => x.v <= jetzt).pop(), naechste = sched.filter(x => x.v > jetzt).slice(0, 3);
      html += `<div class="spt-plan"><small>Plan aus dem Stintplaner · <a href="#stint/${esc(p.id)}${car ? "/" + esc(car.key) + "/plan" : ""}">${esc(p.name)}${car ? " · " + esc(car.name) : ""}</a></small>
        ${sched.length ? `<ul>${akt ? `<li class="jetzt"><b>Stint ${akt.i + 1}</b> ${esc(fahrer(akt.u))}<em>läuft seit ${uhr(akt.v)}</em></li>` : ""}${naechste.map(x => `<li><b>Stint ${x.i + 1}</b> ${esc(fahrer(x.u))}<em>ab ${uhr(x.v)} (in ${dauer((x.v - jetzt) / 1000)})</em></li>`).join("")}</ul>` : '<p class="tm-muted spt-klein">Für dieses Fahrzeug ist noch kein Stintplan gespeichert.</p>'}</div>`;
    }
    return html;
  }

  // Streckenkarte: Form aus dem GPS des Senders, Autos nach Streckenanteil; ohne Form als Ring
  function zeichneKarte() {
    const box = root && root.querySelector("#spt-f-karte");
    if (!box || LAYOUT.karte.aus) return;
    const st = S.stand;
    if (!st) return;
    const pkt = S.strecke && S.strecke.punkte && S.strecke.punkte.length > 50 ? S.strecke.punkte : null;
    let pos, pfad, vb;
    if (pkt) {
      const xs = pkt.map(p => p[1]), ys = pkt.map(p => -p[2]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), rand = Math.max(x1 - x0, y1 - y0) * 0.06;
      vb = `${x0 - rand} ${y0 - rand} ${x1 - x0 + 2 * rand} ${y1 - y0 + 2 * rand}`;
      pfad = "M" + pkt.map(p => p[1].toFixed(1) + " " + (-p[2]).toFixed(1)).join("L") + "Z";
      pos = (pct) => {
        let i = pkt.findIndex(p => p[0] > pct);
        if (i < 0) i = 0;
        const b = pkt[i], q = pkt[(i - 1 + pkt.length) % pkt.length];
        const span = (b[0] - q[0] + 1) % 1 || 1e-6, f = ((pct - q[0] + 1) % 1) / span;
        return [q[1] + (b[1] - q[1]) * f, -(q[2] + (b[2] - q[2]) * f)];
      };
    } else {
      vb = "-110 -110 220 220";
      pfad = "M0 -90A90 90 0 1 1 -0.1 -90Z";
      pos = (pct) => [Math.sin(pct * 2 * Math.PI) * 90, -Math.cos(pct * 2 * Math.PI) * 90];
    }
    const groesse = pkt ? Math.max(...vb.split(" ").slice(2).map(Number)) / 60 : 3.6;
    const klassen = st.session.klassen || [];
    const farbe = (id) => { const f = String((klassen.find(k => String(k.id) === String(id)) || {}).farbe || "").replace(/^0x/, "#"); return /^#[0-9a-f]{6}$/i.test(f) ? f : "#9aa3ad"; };
    const autos = st.autos.filter(x => x.pct != null && x.pct >= 0 && x.fl !== -1).sort((x, y) => istF2F(x, st) - istF2F(y, st));
    const vbz = vb.split(" ").map(Number), mitteX = vbz[0] + vbz[2] / 2; // Beschriftung rechts der Mitte nach links, sonst abgeschnitten
    const kNamen = [...new Set(autos.map(x => String(x.k)))];
    const legende = `<div class="spt-legende">${kNamen.map(k => `<span><i style="background:${farbe(k)}"></i>${esc((klassen.find(c => String(c.id) === k) || {}).name || "Klasse")}</span>`).join("")}
      <span><i style="background:#e11324"></i>unser Auto</span><span><i class="ring"></i>Klassenspitze</span><span>♛ führt gesamt</span>
      <span class="q">${S.strecke && S.strecke.quelle === "g61" ? "Streckenform aus Garage 61" : pkt ? "Streckenform aus dem GPS des Fahrers" : ""}</span></div>`;
    box.innerHTML = `<svg class="spt-map" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">
      <path d="${pfad}" class="spt-bahn" style="stroke-width:${groesse * 1.6}"/><path d="${pfad}" class="spt-bahn2" style="stroke-width:${groesse * 0.5}"/>
      ${autos.map(x => { const [px, py] = pos(x.pct), u = istF2F(x, st); return `<g class="${u ? "unser" : ""}${x.box ? " box" : ""}">${x.kpos === 1 ? `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(u ? 2.3 : 1.8) * groesse}" class="spt-spitze" style="stroke:${farbe(x.k)};stroke-width:${groesse * 0.35}"/>` : ""}<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(u ? 1.5 : 1) * groesse}" style="fill:${u ? "#e11324" : farbe(x.k)}"/>${x.pos === 1 ? `<text class="spt-krone" x="${px.toFixed(1)}" y="${(py - groesse * 2.2).toFixed(1)}" text-anchor="middle" style="font-size:${groesse * 2.6}px">♛</text>` : ""}${u ? `<text x="${(px + (px > mitteX ? -2 : 2) * groesse).toFixed(1)}" y="${(py + groesse * 0.6).toFixed(1)}" text-anchor="${px > mitteX ? "end" : "start"}" style="font-size:${groesse * 2.6}px">${esc((x.team || x.fahrer).split(" ").pop())}${x.nr ? " #" + esc(x.nr) : ""}</text>` : ""}</g>`; }).join("")}
    </svg>${legende}${pkt ? "" : '<p class="tm-muted spt-klein">Streckenform folgt, sobald der Fahrer eine Runde gefahren ist.</p>'}`;
  }

  window.F2FSpotting = { mount };
})();
