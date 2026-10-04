/* ===========================================================
   TEAM-BEREICH  –  Login, Dashboard, Panels, Admin
   Spricht mit dem Worker "kreids888-team" unter /api/team
   =========================================================== */
(function () {
  const API = "/api/team";
  const view = document.getElementById("tm-view");
  const userBox = document.getElementById("tm-user");

  const ICONS = {
    trainer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
    clipper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="1"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
    garage61: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6M12 2v3"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.5 0L8.6 3a19.6 19.6 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a19.8 19.8 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.7.4-1.3.7-2 1l1.3 2a19.7 19.7 0 0 0 6-3c.5-5.1-.8-9.6-3.6-13.6zM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  };

  const PANELS = {
    trainer:  { nr: "01", title: "Kreids-Trainer", desc: "Dein iRacing-Coach – Download, Anleitung und Updates.", live: false },
    clipper:  { nr: "02", title: "Kreids-Clipper", desc: "Automatische Clips aus deinen Rennen und Streams.", live: false },
    garage61: { nr: "03", title: "Garage 61", desc: "Team-Bestenliste und Bestzeit-Posts direkt in Discord.", live: true },
  };
  const SESSION = { 1: "Training", 2: "Quali", 3: "Rennen" };

  let ME = null;

  /* ---------------- Helfer ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hex = (n) => n ? "#" + n.toString(16).padStart(6, "0") : "";
  const fmtLap = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return (m ? m + ":" + (r < 10 ? "0" : "") : "") + r.toFixed(3); };
  const fmtDate = (iso) => { if (!iso) return "–"; const d = new Date(iso); return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + " · " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); };
  const isRecent = (iso) => iso && Date.now() - Date.parse(iso) < 2 * 864e5;

  async function api(path, opts = {}) {
    const r = await fetch(API + path, {
      credentials: "same-origin",
      headers: opts.body ? { "Content-Type": "application/json" } : {},
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {};
    try { data = await r.json(); } catch (e) { /* leer */ }
    if (!r.ok) throw new Error(data.error || "Fehler " + r.status);
    return data;
  }

  let toastT;
  function toast(msg, ok) {
    const t = document.getElementById("tm-toast");
    t.textContent = msg;
    t.className = "tm-toast show" + (ok ? " ok" : "");
    clearTimeout(toastT);
    toastT = setTimeout(() => (t.className = "tm-toast"), 3800);
  }

  const btn = (label, cls = "", attrs = "") => `<button class="tm-btn ${cls}" ${attrs}><span>${label}</span></button>`;
  const chip = (r) => `<span class="tm-chip"><i style="${r.color ? "background:" + hex(r.color) : ""}"></i>${esc(r.name)}</span>`;
  const loading = () => (view.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>');

  /* ---------------- Start ---------------- */
  async function init() {
    const err = new URLSearchParams(location.search).get("fehler");
    if (err) {
      toast({ abgebrochen: "Anmeldung abgebrochen.", sitzung: "Sitzung abgelaufen – bitte nochmal anmelden.", discord: "Discord hat die Anmeldung abgelehnt." }[err] || "Anmeldung fehlgeschlagen.");
      history.replaceState(null, "", location.pathname + location.hash);
    }
    try {
      ME = await api("/me");
    } catch (e) {
      view.innerHTML = `<div class="tm-gate"><h3>Gerade nicht erreichbar</h3><p>Der Team-Bereich antwortet nicht. Versuch es gleich nochmal.</p><p class="tm-fine tm-err">${esc(e.message)}</p></div>`;
      return;
    }
    renderUser();
    window.addEventListener("hashchange", render);
    render();
  }

  function renderUser() {
    if (!ME || !ME.loggedIn) { userBox.innerHTML = ""; return; }
    userBox.innerHTML = `
      <div class="tm-me">
        <div class="tm-ava" style="background-image:url('${esc(ME.user.avatar)}')"></div>
        <div>
          <div class="tm-me-name">${esc(ME.user.name)}</div>
          <div class="tm-me-sub">${ME.isAdmin ? '<span class="tm-badge">Admin</span>' : ME.access ? "Teammitglied" : "Gast"}</div>
        </div>
      </div>
      ${btn("Abmelden", "sm", 'id="tm-logout"')}`;
    document.getElementById("tm-logout").onclick = async () => {
      await api("/logout", { method: "POST" }).catch(() => {});
      location.href = "/team/";
    };
  }

  function render() {
    if (!ME.loggedIn) return renderLogin();
    if (!ME.access) return renderNoAccess();
    const id = location.hash.replace("#", "");
    if (id === "admin" && ME.isAdmin) return renderAdmin();
    if (PANELS[id] && ME.panels[id]) return renderPanel(id);
    renderGrid();
  }

  /* ---------------- Team-Vorstellung (öffentlich) ---------------- */
  // Discord-Einladung für Bewerber – leer = Knopf wird nicht angezeigt
  const JOIN_URL = "";

  const FEAT_ICONS = {
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.4"/><path d="M16 14.2c2.9.2 5 2.6 5 5.8"/></svg>',
    brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 3 9.5 13.5M14 4l6 6"/><path d="M9.5 13.5c-2.5-.5-4.5 1-5 3.5-.3 1.6-1 2.5-2 3 3 .8 6.5.3 8-1.5 1.3-1.6 1-3.8-1-5z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2M14 17.5h2"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M12 7V4M9 12h.01M15 12h.01M9.5 16h5M2 12v3M22 12v3"/></svg>',
  };

  const FEATURES = [
    ["trophy", "Team- & Endurance-Rennen", "Wir fahren aktiv Ligen und Endurance-Rennen in iRacing – als Team, mit Fahrerwechseln und Strategie."],
    ["people", "Aktive Community", "Motivierte und hilfsbereite Teamkollegen, mit denen man gern ins Auto steigt."],
    ["brush", "Eigene Teamliveries", "Hochwertige Designs für das Team und für Einzelevents."],
    ["gear", "Struktur & Support", "Klare Abläufe, Hilfe bei Setups und Strategie – gemeinsam schneller werden."],
    ["calendar", "Flexible Einsätze", "Verschiedene Serien und Endurance-Events – je nach Interesse und Zeit."],
    ["ai", "AI-Trainer", "Ein eigener KI-Coach für jedes Teammitglied, der zeigt, wo noch Zeit liegt.", "Kommt bald"],
  ];

  function teamHero() {
    return `
      <section class="tm-hero">
        <div class="tm-hero-bg" style="background-image:url('/team/f2f-cars.webp')"></div>
        <div class="tm-hero-in">
          <img class="tm-motto" src="/team/f2f-motto.webp" alt="Konstanz bis ins Ziel" width="1200" height="462">
          <p class="tm-lead"><b>Flag to Flag Motorsport</b> ist ein iRacing-Team mit Fokus auf <b>Ligen</b> und <b>Endurance-Rennen</b>. Wir fahren <b>GT3</b> und <b>LMP2</b> – mit eigenen Liveries, klarer Struktur und einem Team, das sich gegenseitig schneller macht.</p>
          <div class="tm-tags"><span>Ligen</span><span>Endurance</span><span>GT3</span><span>LMP2</span></div>
        </div>
      </section>`;
  }

  function teamIntro() {
    const join = JOIN_URL
      ? `<a class="tm-btn red big" href="${esc(JOIN_URL)}" target="_blank" rel="noopener"><span>${ICONS.discord} Zum Discord</span></a>`
      : `<p class="tm-muted">Schreib uns einfach auf Discord an – wir melden uns.</p>`;
    return `
      <section class="tm-sec">
        <div class="lap-tag">Sector 1 — Das Team</div>
        <h3 class="tm-sec-h">Was uns ausmacht</h3>
        <div class="tm-feats">${FEATURES.map(([ic, t, d, soon]) => `
          <div class="tm-feat${soon ? " soon" : ""}">
            <span class="hx">${FEAT_ICONS[ic]}</span>
            <div><h4>${esc(t)}${soon ? ` <span class="tm-badge grey">${esc(soon)}</span>` : ""}</h4><p>${esc(d)}</p></div>
          </div>`).join("")}
        </div>
      </section>

      <section class="tm-sec">
        <div class="lap-tag">Sector 2 — Fahrzeuge</div>
        <h3 class="tm-sec-h">Unsere Klassen</h3>
        <div class="tm-classes">
          <div class="tm-class"><span class="bg">GT3</span>
            <h4>GT3</h4><p>Enge Rennen im Multiclass-Feld, Ligen und lange Endurance-Stints – Porsche, Mercedes &amp; Co.</p></div>
          <div class="tm-class"><span class="bg">LMP2</span>
            <h4>LMP2</h4><p>Prototypen-Speed im Dallara P217: Nachtphasen, Verkehr und Strategie bis zur Zielflagge.</p></div>
        </div>
      </section>

      <section class="tm-sec tm-recruit">
        <img class="tm-poster" src="/team/f2f-recruiting.webp" alt="Simracing-Team sucht dich – Flag to Flag Motorsport" width="1400" height="788" loading="lazy">
        <div class="tm-recruit-txt">
          <div class="lap-tag">Sector 3 — Fahrer gesucht</div>
          <h3 class="tm-sec-h">Simracing-Team <span class="r">sucht dich!</span></h3>
          <p>Aktive Fahrer sind willkommen. Du fährst gern Ligen oder Endurance, willst als Team schneller werden und hast Lust auf GT3 oder LMP2? Dann melde dich bei uns.</p>
          ${join}
        </div>
      </section>`;
  }

  /* ---------------- Login ---------------- */
  function renderLogin() {
    view.innerHTML = teamHero() + `
      <div class="tm-gate">
        <img class="tm-gate-logo" src="/team/f2f-logo.webp" alt="" aria-hidden="true">
        <h3>Nur für das Team</h3>
        <p>Melde dich mit deinem Discord-Konto an.</p>
        <a class="tm-btn red big" href="${API}/login"><span>${ICONS.discord} Mit Discord anmelden</span></a>
        <p class="tm-fine">Wir lesen nur deinen Discord-Namen und deine Rollen auf dem Server – sonst nichts.</p>
      </div>` + teamIntro();
  }

  function renderNoAccess() {
    view.innerHTML = `
      <div class="tm-gate">
        <h3>${ME.inServer ? "Kein Team-Zugang" : "Nicht auf dem Server"}</h3>
        <p>${ME.inServer
          ? "Du bist angemeldet, aber dir fehlt die Team-Rolle. Melde dich bei der Teamleitung, wenn du zu F2F Motorsport gehörst."
          : "Dein Discord-Konto ist nicht auf unserem Discord-Server. Tritt zuerst dem Server bei und melde dich dann erneut an."}</p>
        ${ME.roles && ME.roles.length ? `<div class="tm-muted" style="margin-bottom:8px">Deine Rollen:</div><div class="tm-roles">${ME.roles.map(chip).join("")}</div>` : ""}
      </div>` + teamIntro();
  }

  /* ---------------- Übersicht ---------------- */
  function card(id, p, extra = "") {
    return `
      <button class="tm-card ${extra}" data-go="${id}">
        <span class="nr">${p.nr}</span>
        <span class="ic">${ICONS[id]}</span>
        <h4>${esc(p.title)}</h4>
        <p>${esc(p.desc)}</p>
        <span class="ft">
          ${p.live ? '<span class="tm-badge live">Aktiv</span>' : p.live === false ? '<span class="tm-badge grey">In Vorbereitung</span>' : '<span class="tm-badge">Nur Admin</span>'}
          <span class="go">Öffnen →</span>
        </span>
      </button>`;
  }

  function renderGrid() {
    const ids = Object.keys(PANELS).filter(id => ME.panels[id]);
    let html = "";
    if (ME.roles && ME.roles.length) html += `<div class="tm-roles" style="margin-bottom:22px">${ME.roles.map(chip).join("")}</div>`;
    html += '<div class="tm-grid">';
    html += ids.map(id => card(id, PANELS[id])).join("");
    if (ME.isAdmin) html += card("admin", { nr: "★", title: "Admin", desc: "Rollen und Rechte vergeben, Garage-61-Feed einstellen." }, "admin");
    html += "</div>";
    if (!ids.length && !ME.isAdmin) html = `<div class="tm-box tm-soon"><div class="big">Noch leer</div><p>Für deine Rollen sind noch keine Bereiche freigeschaltet.</p></div>`;
    view.innerHTML = html;
    view.querySelectorAll("[data-go]").forEach(b => (b.onclick = () => (location.hash = b.dataset.go)));
  }

  function panelHead(id, title, badge = "") {
    return `
      <div class="tm-back">${btn(ICONS.back + " Übersicht", "sm", 'id="tm-back"')}</div>
      <div class="tm-ph"><h3>${esc(title)}</h3>${badge}</div>`;
  }
  function bindBack() {
    const b = document.getElementById("tm-back");
    if (b) b.onclick = () => { location.hash = ""; };
  }

  /* ---------------- Panels ---------------- */
  function renderPanel(id) {
    if (id === "garage61") return renderG61();
    const p = PANELS[id];
    view.innerHTML = panelHead(id, p.title, '<span class="tm-badge grey">In Vorbereitung</span>') + `
      <div class="tm-box tm-soon">
        <div class="big">Coming soon</div>
        <p>${esc(p.desc)} Dieser Bereich wird gerade gebaut und erscheint hier, sobald er fertig ist.</p>
      </div>`;
    bindBack();
  }

  async function renderG61() {
    view.innerHTML = panelHead("garage61", "Garage 61") + '<div id="g61b"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    bindBack();
    const box = document.getElementById("g61b");
    let d;
    try { d = await api("/g61/board"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (!d.ready) {
      box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Noch nicht verbunden</div><p>Garage 61 ist noch nicht eingerichtet.${ME.isAdmin ? " Richte es im Admin-Bereich ein." : ""}</p></div>`;
      return;
    }
    const ph = view.querySelector(".tm-ph");
    ph.insertAdjacentHTML("beforeend", d.autoPost ? '<span class="tm-badge live">Discord-Posts aktiv</span>' : '<span class="tm-badge grey">Discord-Posts aus</span>');
    if (!d.boards.length) {
      box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Keine Runden</div><p>In den letzten 14 Tagen hat niemand aus dem Team Runden hochgeladen.</p></div>`;
      return;
    }
    box.innerHTML = `<p class="tm-muted" style="margin-bottom:16px">Persönliche Bestzeiten pro Strecke und Auto – alles, was das Team in den letzten 14 Tagen gefahren ist. <span class="tm-new">NEU</span> = in den letzten 48 Stunden.</p>
      <div class="tm-boards">${d.boards.map(b => `
        <div class="tm-board">
          <div class="tm-board-h"><b>${esc(b.track)}</b><span>${esc(b.car)}</span></div>
          <div class="tm-tbl-wrap"><table class="tm-tbl">${b.laps.map(l => `
            <tr class="${l.rank === 1 ? "first" : ""}">
              <td class="p">P${l.rank}</td>
              <td class="n">${esc(l.driver)}${isRecent(l.startTime) ? '<span class="tm-new">NEU</span>' : ""}</td>
              <td class="t">${fmtLap(l.time)}</td>
              <td class="g">${l.gap ? "+" + l.gap.toFixed(3) : ""}</td>
              <td class="d">${SESSION[l.session] || ""}<br>${fmtDate(l.startTime)}</td>
            </tr>`).join("")}
          </table></div>
        </div>`).join("")}
      </div>`;
  }

  /* ---------------- Admin ---------------- */
  async function renderAdmin() {
    view.innerHTML = panelHead("admin", "Admin", '<span class="tm-badge">Rollen & Rechte</span>') + '<div id="adm"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    bindBack();
    const box = document.getElementById("adm");
    let d;
    try { d = await api("/admin/config"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }

    const cfg = d.config;
    const sel = {
      teamRoles: new Set(cfg.teamRoles),
      adminRoles: new Set(cfg.adminRoles),
      panels: Object.fromEntries(d.panels.map(id => [id, new Set(cfg.panels[id] || [])])),
    };
    let dirty = false;

    const picker = (key) => d.roles.length
      ? `<div class="tm-roles" data-pick="${key}">${d.roles.map(r => `<button type="button" class="tm-chip" data-role="${r.id}"><i style="${r.color ? "background:" + hex(r.color) : ""}"></i>${esc(r.name)}</button>`).join("")}</div>`
      : '<span class="tm-err">Keine Rollen geladen – ist der Bot auf dem Server?</span>';

    const g = cfg.g61, gi = d.g61;
    const teamOpts = gi.teams.length
      ? `<select class="tm-select" id="g61-team"><option value="">– Team wählen –</option>${gi.teams.map(t => `<option value="${esc(t.slug)}" ${t.slug === g.teamSlug ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>`
      : `<input class="tm-input" id="g61-team" placeholder="Team-Slug aus Garage 61" value="${esc(g.teamSlug)}">`;

    box.innerHTML = `
      <div class="tm-box">
        <h5>Status</h5>
        <div class="tm-status" style="margin-top:14px">
          <div class="tm-stat">${d.guild && d.guild.icon ? `<img src="${esc(d.guild.icon)}" alt="">` : `<span class="tm-dot ${d.guild ? "" : "off"}"></span>`}<div><b>${d.guild ? esc(d.guild.name) : "Bot nicht auf dem Server"}</b><div class="tm-muted">Discord-Server</div></div></div>
          <div class="tm-stat"><span class="tm-dot ${d.roles.length ? "" : "off"}"></span><div><b>${d.roles.length} Rollen</b><div class="tm-muted">vom Bot gelesen</div></div></div>
          <div class="tm-stat"><span class="tm-dot ${gi.tokenSet && !gi.teamsError ? "" : "off"}"></span><div><b>Garage 61</b><div class="tm-muted">${gi.tokenSet ? (gi.teamsError ? esc(gi.teamsError) : "Schlüssel ok") : "Kein Schlüssel hinterlegt"}</div></div></div>
        </div>
      </div>

      <div class="tm-box">
        <h5>Zugang</h5>
        <p class="hint">Wer darf den Team-Bereich überhaupt betreten? Fest eingetragene Admins (${d.adminIds.length}) kommen immer rein.</p>
        <div class="tm-row"><div class="lbl">Team-Rollen<small>dürfen sich einloggen</small></div>${picker("teamRoles")}</div>
        <div class="tm-row"><div class="lbl">Admin-Rollen<small>sehen alles + diese Seite</small></div>${picker("adminRoles")}</div>
      </div>

      <div class="tm-box">
        <h5>Panels</h5>
        <p class="hint">Welche Rolle sieht welches Panel? Admins sehen immer alle.</p>
        ${d.panels.map(id => `<div class="tm-row"><div class="lbl">${esc(PANELS[id] ? PANELS[id].title : id)}</div>${picker("panel:" + id)}</div>`).join("")}
      </div>

      <div class="tm-box">
        <h5>Garage 61 → Discord</h5>
        <p class="hint">Alle 30 Minuten wird geschaut, ob jemand aus dem Team eine neue persönliche Bestzeit gefahren ist – die wird dann im Discord-Kanal gepostet.</p>
        <div class="tm-row"><label for="g61-team">Garage-61-Team</label><div>${teamOpts}</div></div>
        <div class="tm-row"><label for="g61-hook">Discord-Webhook<small>Kanal-Einstellungen → Integrationen</small></label>
          <div><input class="tm-input" id="g61-hook" type="url" autocomplete="off" placeholder="${g.webhookSet ? "✓ hinterlegt – zum Ändern neue URL einfügen" : "https://discord.com/api/webhooks/…"}"></div></div>
        <div class="tm-row"><div class="lbl">Automatisch posten</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label class="tm-switch"><input type="checkbox" id="g61-on" ${g.enabled ? "checked" : ""}><span class="s"></span>Neue Bestzeiten posten</label>
            <label class="tm-switch"><input type="checkbox" id="g61-rec" ${g.onlyTeamRecord ? "checked" : ""}><span class="s"></span>Nur Team-Rekorde (P1)</label>
          </div></div>
        <div class="tm-row"><div class="lbl">Testen</div>
          <div>
            <div class="tm-actions">${btn("Test-Post senden", "sm", 'id="g61-test"')}${btn("Jetzt prüfen", "sm", 'id="g61-run"')}</div>
            <p class="tm-muted" style="margin-top:10px">Letzter Lauf: ${gi.lastRun ? fmtDate(gi.lastRun) + " – " + esc(gi.lastResult || "") : "noch keiner"}</p>
          </div></div>
      </div>

      <div class="tm-savebar" id="savebar"><span>Alles gespeichert</span>${btn("Speichern", "red", 'id="tm-save"')}</div>`;

    // Rollen-Auswahl vorbelegen + umschalten
    const setFor = (key) => key.startsWith("panel:") ? sel.panels[key.slice(6)] : sel[key];
    box.querySelectorAll("[data-pick]").forEach(wrap => {
      const set = setFor(wrap.dataset.pick);
      wrap.querySelectorAll("[data-role]").forEach(b => {
        b.classList.toggle("on", set.has(b.dataset.role));
        b.setAttribute("aria-pressed", set.has(b.dataset.role));
        b.onclick = () => {
          set.has(b.dataset.role) ? set.delete(b.dataset.role) : set.add(b.dataset.role);
          b.classList.toggle("on");
          b.setAttribute("aria-pressed", b.classList.contains("on"));
          markDirty();
        };
      });
    });
    box.querySelectorAll("#g61-team,#g61-hook,#g61-on,#g61-rec").forEach(el => el.addEventListener("input", markDirty));
    box.querySelectorAll("#g61-on,#g61-rec").forEach(el => el.addEventListener("change", markDirty));

    function markDirty() {
      dirty = true;
      const bar = document.getElementById("savebar");
      bar.classList.add("dirty");
      bar.querySelector("span").textContent = "Ungespeicherte Änderungen";
    }

    async function save() {
      const body = {
        teamRoles: [...sel.teamRoles],
        adminRoles: [...sel.adminRoles],
        panels: Object.fromEntries(Object.entries(sel.panels).map(([k, v]) => [k, [...v]])),
        g61: {
          teamSlug: document.getElementById("g61-team").value,
          webhook: document.getElementById("g61-hook").value,
          enabled: document.getElementById("g61-on").checked,
          onlyTeamRecord: document.getElementById("g61-rec").checked,
        },
      };
      await api("/admin/config", { method: "POST", body });
      dirty = false;
      ME = await api("/me");
    }

    const saveBtn = document.getElementById("tm-save");
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try { await save(); toast("Gespeichert", true); renderAdmin(); }
      catch (e) { toast(e.message); saveBtn.disabled = false; }
    };

    const action = (id, path) => {
      const b = document.getElementById(id);
      b.onclick = async () => {
        b.disabled = true;
        try {
          if (dirty) await save();
          const r = await api(path, { method: "POST" });
          toast(r.info || "Erledigt", r.ok);
          renderAdmin();
        } catch (e) { toast(e.message); b.disabled = false; }
      };
    };
    action("g61-test", "/admin/g61/test");
    action("g61-run", "/admin/g61/run");
  }

  init();
})();
