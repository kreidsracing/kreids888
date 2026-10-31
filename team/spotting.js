/* ===========================================================
   SPOTTING  Flag to Flag Motorsport
   Live-Ansicht laufender Rennen. Die Daten schicken FF Overlay bzw.
   die kreids888 Toolbox (spotting.py) alle 2 s über den Worker
   (Durable Object pro Rennen). Jeder wählt selbst, welches Rennen er
   ansieht – drei Leute in drei Rennen = drei Einträge.
   Hash: #spotting · #spotting/<SubSessionID>
   Wird von team.js eingebunden (window.F2FSpotting.mount).
   =========================================================== */
(function () {
  let C = null, root = null, alive = 0, ws = null, wsSub = null, wiederT = null, listeT = null, alterT = null;
  const S = { stand: null, strecke: null, sender: [], ereignisse: new Map(), klasse: "", verbunden: false };
  const esc = (s) => C.esc(s);
  const pad = (n) => String(n).padStart(2, "0");
  const zeit = (s) => { if (!(s > 0)) return "–"; const m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + r.toFixed(3); };
  const dauer = (s) => { if (s == null || s < 0) return "–"; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ":" + pad(m) + ":" + pad(s % 60) : m + ":" + pad(s % 60); };
  const istF2F = (a, st) => !!a && ((st.ich && a.i === st.ich.idx) || (st.session.meineTeams || []).includes(a.team) || /\bf2f\b|flag ?to ?flag/i.test(a.team || ""));
  const TYP = { "Race": "Rennen", "Lone Qualify": "Quali", "Open Qualify": "Quali", "Qualify": "Quali", "Practice": "Training", "Lone Practice": "Training", "Warmup": "Warm-up" };

  const HINWEIS = `<div class="spt-hinweis"><b>So kommen Rennen hierher:</b> Wer fährt, braucht <b>FF Overlay</b> (oder die kreids888 Toolbox) offen und oben rechts mit <b>„Mit F2F verbinden"</b> angemeldet. Dann erscheint das Rennen hier automatisch, auch wenn mehrere von euch gleichzeitig in verschiedenen Rennen sind. Sprit und Strategie sieht man nur, wenn der Fahrer am Steuer das Programm laufen hat.</div>`;

  function aufraeumen() {
    clearTimeout(wiederT); clearInterval(listeT); clearInterval(alterT);
    if (ws) { ws.onclose = null; try { ws.close(); } catch (e) { } ws = null; }
    wsSub = null;
  }
  window.addEventListener("hashchange", () => { if (!location.hash.startsWith("#spotting")) aufraeumen(); });

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
        </a>`).join("")}</div>` : '<div class="tm-box"><p class="tm-muted">Gerade fährt niemand mit verbundenem FF Overlay. Sobald jemand in einer iRacing-Session ist, taucht das Rennen hier auf.</p></div>';
    };
    await zeichne();
    listeT = setInterval(() => { if (mine === alive && location.hash === "#spotting") zeichne(); }, 15000);
  }

  /* ---------------- Live-Ansicht eines Rennens ---------------- */
  function live(sub, mine) {
    S.stand = null; S.strecke = null; S.sender = []; S.ereignisse = new Map(); S.verbunden = false;
    root.innerHTML = `<a class="sp-back" href="#spotting">← Alle Rennen</a><div id="spt-live"><div class="tm-loading"><span></span><span></span><span></span></div></div>`;
    verbinde(sub, mine, 0);
    alterT = setInterval(() => { const el = root.querySelector("#spt-alter"); if (el && S.stand) el.textContent = alterText(); }, 1000);
  }
  function verbinde(sub, mine, versuch) {
    const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/team/spotting/ws?sub=" + encodeURIComponent(sub);
    ws = new WebSocket(url); wsSub = sub;
    ws.onopen = () => { S.verbunden = true; versuch = 0; };
    ws.onmessage = (e) => {
      if (mine !== alive) return;
      let j; try { j = JSON.parse(e.data); } catch (x) { return; }
      if (j.typ === "stand") { S.stand = j; for (const ev of j.ereignisse || []) S.ereignisse.set(ev.w + ":" + ev.art + ":" + ev.i, ev); zeichne(); }
      else if (j.typ === "strecke") S.strecke = j;
      else if (j.typ === "sender") { S.sender = j.liste || []; zeichne(); }
    };
    ws.onclose = () => {
      S.verbunden = false;
      if (mine !== alive || wsSub !== sub) return;
      zeichne();
      wiederT = setTimeout(() => verbinde(sub, mine, versuch + 1), Math.min(30000, 2000 * (versuch + 1)));
    };
  }
  const alterText = () => { const s = Math.max(0, Math.round((Date.now() - (S.stand.t || Date.now())) / 1000)); return s < 5 ? "live" : "Stand vor " + s + " s"; };

  // Abstände je Klasse aus Runde + Streckenanteil und F2-Zeit (iRacing: Zeit hinter dem Gesamtführenden)
  function klassenFeld(st) {
    const nachKlasse = {};
    for (const a of st.autos) (nachKlasse[a.k] = nachKlasse[a.k] || []).push(a);
    for (const liste of Object.values(nachKlasse)) {
      liste.sort((x, y) => (x.kpos || 999) - (y.kpos || 999) || ((y.runde || 0) + (y.pct || 0)) - ((x.runde || 0) + (x.pct || 0)));
      const spitze = liste[0];
      liste.forEach((a, n) => {
        const vor = liste[n - 1];
        a._gap = abstand(a, spitze); a._int = vor ? abstand(a, vor) : "";
      });
    }
    return nachKlasse;
  }
  function abstand(a, ref) {
    if (a === ref) return "Spitze";
    const rd = ((ref.runde || 0) + (ref.pct || 0)) - ((a.runde || 0) + (a.pct || 0));
    if (rd >= 1) return "+" + Math.floor(rd) + " Rd.";
    if (a.f2 > 0 && ref.f2 >= 0 && a.f2 >= ref.f2) return "+" + (a.f2 - ref.f2).toFixed(1) + " s";
    return "–";
  }

  function zeichne() {
    const box = root && root.querySelector("#spt-live");
    if (!box) return;
    const st = S.stand;
    if (!st) {
      box.innerHTML = (S.verbunden ? '<div class="tm-box"><p class="tm-muted">Verbunden, warte auf die ersten Daten …</p></div>' : '<div class="tm-box"><p class="tm-muted">Verbinde …</p></div>') + HINWEIS;
      return;
    }
    const s = st.session, klassen = s.klassen || [];
    const felder = klassenFeld(st);
    const unsere = st.autos.filter(a => istF2F(a, st));
    const sender = S.sender.find(x => x.aktiv);
    if (!S.klasse || !felder[S.klasse]) S.klasse = String((unsere[0] || st.autos[0] || {}).k ?? "");
    const kl = (id) => klassen.find(k => String(k.id) === String(id)) || { name: "" };
    const farbe = (id) => { const f = String(kl(id).farbe || "").replace(/^0x/, "#"); return /^#[0-9a-f]{6}$/i.test(f) ? f : "#e11324"; };
    const wetter = [s.luft != null ? s.luft + " °C Luft" : "", s.asphalt != null ? s.asphalt + " °C Asphalt" : "", s.nass_erklaert ? "Nass erklärt" : ""].filter(Boolean).join(" · ");
    const rest = s.rest > 0 && s.rest < 1e6 ? dauer(s.rest) : s.runden_rest > 0 && s.runden_rest < 32767 ? s.runden_rest + " Rd." : "–";
    const kachel = (l, w, k = "") => `<div class="spt-k${k}"><small>${l}</small><b>${w}</b></div>`;
    const zeile = (a) => `<tr class="${istF2F(a, st) ? "unser" : ""}${a.box ? " inbox" : ""}">
      <td><b>${a.kpos || "–"}</b></td><td><span class="spt-kl" style="--k:${farbe(a.k)}">${esc(kl(a.k).name)}</span></td><td>${esc(a.nr)}</td>
      <td class="spt-name">${a.team ? `<b>${esc(a.team)}</b><small>${esc(a.fahrer)}</small>` : `<b>${esc(a.fahrer)}</b>`}</td>
      <td>${a.runde ?? "–"}</td><td>${esc(a._gap)}</td><td>${esc(a._int)}</td><td>${zeit(a.last)}</td><td>${zeit(a.best)}</td>
      <td>${a.stint_s != null ? dauer(a.stint_s) + (a.stint_r != null ? " · " + a.stint_r + " Rd." : "") : "–"}</td><td>${a.stopps || 0}</td>
      <td>${a.box ? '<span class="tm-badge">Box</span>' : a.fl === -1 ? '<span class="tm-badge grey">weg</span>' : ""}</td></tr>`;
    const ev = [...S.ereignisse.values()].sort((a, b) => b.w - a.w).slice(0, 10);
    const autoName = (i) => { const a = st.autos.find(x => x.i === i); return a ? (a.team || a.fahrer) + (a.nr ? " #" + a.nr : "") : ""; };
    box.innerHTML = `
      <div class="spt-kopf">
        <span class="tm-badge live">${esc(TYP[s.typ] || s.typ || "Session")}</span>
        <h3>${esc(s.strecke)}${s.variante ? ` <small>${esc(s.variante)}</small>` : ""}</h3>
        <span class="spt-meta">${st.autos.length} Autos · ${klassen.map(k => esc(k.name)).join(", ")}${wetter ? " · " + esc(wetter) : ""}</span>
        <span class="spt-quelle"><i class="${S.verbunden ? "an" : ""}"></i>Daten von ${esc(sender ? sender.name : st.von || "?")} · <span id="spt-alter">${alterText()}</span></span>
      </div>
      <div class="spt-kacheln">
        ${kachel("Rennzeit", dauer(s.gruen != null ? s.zeit - s.gruen : s.zeit))}${kachel("Restzeit", rest)}
        ${unsere.slice(0, 3).map(a => kachel(esc(a.team || a.fahrer), `P${a.kpos || "–"} <small>${esc(kl(a.k).name)} · ${esc(a._gap)}</small>`, " unser")).join("")}
        ${st.ich && st.ich.sprit != null ? kachel("Sprit", st.ich.sprit.toFixed(1) + " L" + (st.ich.verbrauch ? ` <small>${st.ich.verbrauch.toFixed(2)} L/Rd. · ${Math.floor(st.ich.sprit / st.ich.verbrauch)} Rd.</small>` : "")) : ""}
      </div>
      <div class="spt-gitter">
        <div class="tm-box spt-feld"><div class="spt-box-h"><h5>Feld</h5>
          <div class="sp-seg">${Object.keys(felder).map(k => `<button type="button" data-kl="${esc(k)}" class="${k === S.klasse ? "on" : ""}">${esc(kl(k).name || "Klasse")}</button>`).join("")}</div></div>
          <div class="spt-scroll"><table class="spt-tab"><thead><tr><th>Pos</th><th>Kl.</th><th>#</th><th>Team / Fahrer</th><th>Rd.</th><th>Abstand</th><th>Intervall</th><th>Letzte</th><th>Beste</th><th>Stint</th><th>Stopps</th><th></th></tr></thead>
          <tbody>${(felder[S.klasse] || []).map(zeile).join("")}</tbody></table></div></div>
        <div class="tm-box spt-rl"><h5>Rennleitung</h5>${ev.length ? `<ul>${ev.map(e => `<li class="spt-ev-${esc(e.art)}"><small>${new Date(e.w).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small>${e.i != null ? `<b>${esc(autoName(e.i))}</b> ` : ""}${esc(e.text)}</li>`).join("")}</ul>` : '<p class="tm-muted">Noch nichts los.</p>'}</div>
      </div>
      ${HINWEIS}`;
    box.querySelectorAll("[data-kl]").forEach(b => b.onclick = () => { S.klasse = b.dataset.kl; zeichne(); });
  }

  window.F2FSpotting = { mount };
})();
