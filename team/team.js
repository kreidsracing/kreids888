/* ===========================================================
   TEAM-BEREICH  Flag to Flag Motorsport
   - öffentliche Teamseite (Vorstellung + Login)
   - Dashboard nach Discord-Login (Menü links, Bereiche, Tools, Admin)
   Spricht mit dem Worker "kreids888-team" unter /api/team
   =========================================================== */
(function () {
  const API = "/api/team";
  const IMG = "/team/bilder/";
  const view = document.getElementById("tm-view");
  const userBox = document.getElementById("tm-user");
  const barNav = document.getElementById("tm-bar-nav");

  // Discord-Einladung für Bewerber – leer = Knopf wird nicht angezeigt
  const JOIN_URL = "";

  const I = (d, fill) => `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="${fill ? "none" : "currentColor"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    news: I('<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5M8 16h3"/>'),
    calendar: I('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    flag: I('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    wrench: I('<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 0-5-5L14 2z"/><path d="M3 21l6-6"/>'),
    file: I('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
    helmet: I('<path d="M4 15a8 8 0 0 1 16-2v4H9a5 5 0 0 1-5-2z"/><path d="M12 13h8M4 15v3h16"/>'),
    trophy: I('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    people: I('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.4"/><path d="M16 14.2c2.9.2 5 2.6 5 5.8"/>'),
    heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
    brush: I('<path d="M20 3 9.5 13.5M14 4l6 6"/><path d="M9.5 13.5c-2.5-.5-4.5 1-5 3.5-.3 1.6-1 2.5-2 3 3 .8 6.5.3 8-1.5 1.3-1.6 1-3.8-1-5z"/>'),
    gear: I('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
    ai: I('<rect x="5" y="7" width="14" height="12" rx="2"/><path d="M12 7V4M9 12h.01M15 12h.01M9.5 16h5M2 12v3M22 12v3"/>'),
    image: I('<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>'),
    car: I('<path d="M3 15l2-5a3 3 0 0 1 2.8-2h8.4A3 3 0 0 1 19 10l2 5v3H3z"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>'),
    pin: I('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
    lock: I('<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    trainer: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
    clipper: I('<rect x="3" y="6" width="13" height="12" rx="1"/><path d="M16 10l5-3v10l-5-3z"/>'),
    garage61: I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6M12 2v3"/>'),
    admin: I('<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>'),
    logout: I('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'),
    discord: I('<path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.5 0L8.6 3a19.6 19.6 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a19.8 19.8 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.7.4-1.3.7-2 1l1.3 2a19.7 19.7 0 0 0 6-3c.5-5.1-.8-9.6-3.6-13.6zM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/>', true),
    arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  };

  // Bereiche im Dashboard (alle Teammitglieder) – vorerst Platzhalter
  const SECTIONS = [
    { id: "news",       label: "Team News",     icon: "news",     desc: "Mitteilungen der Teamleitung und alles, was gerade im Team passiert." },
    { id: "kalender",   label: "Rennkalender",  icon: "calendar", desc: "Alle kommenden Rennen und Endurance-Events des Teams auf einen Blick." },
    { id: "termine",    label: "Teamtermine",   icon: "clock",    desc: "Trainings, Fahrerbesprechungen und Team-Meetings." },
    { id: "ergebnisse", label: "Ergebnisse",    icon: "flag",     desc: "Die Ergebnisse aller Team-Einsätze in Ligen und Endurance-Rennen." },
    { id: "setups",     label: "Setups",        icon: "wrench",   desc: "Setups zum Herunterladen – sortiert nach Auto und Strecke." },
    { id: "dokumente",  label: "Dokumente",     icon: "file",     desc: "Regeln, Leitfäden und alles Wichtige zum Nachlesen." },
    { id: "fahrer",     label: "Fahrerbereich", icon: "helmet",   desc: "Dein Fahrerprofil, deine Einsätze und deine Statistiken." },
  ];

  // Tools – sichtbar je nach Rolle (Admin vergibt)
  const PANELS = {
    trainer:  { title: "Kreids-Trainer", desc: "Dein AI-Trainer für iRacing – Download, Anleitung und Updates.", live: false },
    clipper:  { title: "Kreids-Clipper", desc: "Automatische Clips aus deinen Rennen und Streams.", live: false },
    garage61: { title: "Garage 61", desc: "Team-Bestenliste und Bestzeit-Posts direkt in Discord.", live: true },
  };
  const SESSION = { 1: "Training", 2: "Quali", 3: "Rennen" };

  let ME = null;

  /* ---------------- Helfer ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hex = (n) => n ? "#" + n.toString(16).padStart(6, "0") : "";
  const fmtLap = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return (m ? m + ":" + (r < 10 ? "0" : "") : "") + r.toFixed(3); };
  const fmtDate = (iso) => { if (!iso) return "–"; const d = new Date(iso); return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + " · " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); };
  const isRecent = (iso) => iso && Date.now() - Date.parse(iso) < 2 * 864e5;
  const main = () => document.getElementById("td-main") || view;

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
  const secHead = (kicker, title, icon) => `<div class="tp-h"><span class="tp-h-ic">${ICONS[icon]}</span><div><div class="tp-h-k">${esc(kicker)}</div><h3>${title}</h3></div></div>`;

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
      ME = { loggedIn: false, offline: true };
    }
    renderUser();
    window.addEventListener("hashchange", render);
    render();
  }

  function renderUser() {
    if (!ME.loggedIn) {
      userBox.innerHTML = `<a class="tm-bar-login" href="${API}/login">${ICONS.discord}<span>Discord Login</span></a>`;
      return;
    }
    userBox.innerHTML = `
      <div class="tm-me">
        <div class="tm-ava" style="background-image:url('${esc(ME.user.avatar)}')"></div>
        <div class="tm-me-txt">
          <div class="tm-me-name">${esc(ME.user.name)}</div>
          <div class="tm-me-sub">${ME.isAdmin ? "Admin" : ME.access ? "Teammitglied" : "Gast"}</div>
        </div>
        <button class="tm-icon-btn" id="tm-logout" title="Abmelden" aria-label="Abmelden">${ICONS.logout}</button>
      </div>`;
    document.getElementById("tm-logout").onclick = async () => {
      await api("/logout", { method: "POST" }).catch(() => {});
      location.href = "/team/";
    };
  }

  function render() {
    const inside = ME.loggedIn && ME.access;
    barNav.hidden = inside;
    if (!inside) return renderPublic();
    renderShell();
  }

  /* ================================================================
     ÖFFENTLICHE TEAMSEITE
     ================================================================ */
  const VALUES = [
    ["target", "Konstanz", "Sauber fahren, Runde für Runde – bis ins Ziel."],
    ["people", "Teamgeist", "Gemeinsam mehr erreichen, auf und neben der Strecke."],
    ["heart", "Leidenschaft", "Simracing ist unser Ding – mit vollem Einsatz."],
  ];
  const FEATURES = [
    ["trophy", "Team- & Endurance-Rennen", "Wir fahren aktiv Ligen und Endurance-Rennen in iRacing."],
    ["people", "Aktive Community", "Motivierte und hilfsbereite Teamkollegen."],
    ["brush", "Eigene Teamliveries", "Designs für das Team und für Einzelevents."],
    ["gear", "Struktur & Support", "Gemeinsam schneller werden."],
    ["calendar", "Flexible Einsätze", "Serien und Events – je nach Interesse und Zeit."],
    ["ai", "AI-Trainer", "Eigener KI-Coach für jedes Teammitglied – kommt bald."],
  ];

  function loginCard() {
    if (ME.offline) return `
      <div class="tp-login-h">${ICONS.discord}<b>Team Login</b></div>
      <p class="tp-login-sub">Der Login ist gerade nicht erreichbar. Versuch es gleich nochmal.</p>`;
    if (ME.loggedIn && !ME.access) return `
      <div class="tp-login-h">${ICONS.lock}<b>${ME.inServer ? "Kein Team-Zugang" : "Nicht auf dem Server"}</b></div>
      <p class="tp-login-sub">${ME.inServer
        ? "Du bist angemeldet, aber dir fehlt die Team-Rolle. Melde dich bei der Teamleitung, wenn du zu F2F Motorsport gehörst."
        : "Dein Discord-Konto ist nicht auf unserem Server. Tritt zuerst bei und melde dich dann erneut an."}</p>
      ${ME.roles && ME.roles.length ? `<div class="tm-roles">${ME.roles.map(chip).join("")}</div>` : ""}`;
    const items = [["news", "Team News"], ["calendar", "Rennkalender & Termine"], ["wrench", "Setups & Dokumente"], ["flag", "Ergebnisse"], ["arrow", "und vieles mehr …"]];
    return `
      <div class="tp-login-h">${ICONS.discord}<b>Team Login</b></div>
      <p class="tp-login-sub">Nur für Teammitglieder – interner Bereich.</p>
      <a class="tp-login-btn" href="${API}/login">${ICONS.discord}<span>Mit Discord anmelden</span></a>
      <ul class="tp-login-list">${items.map(([ic, t]) => `<li>${ICONS[ic]}<span>${t}</span></li>`).join("")}</ul>`;
  }

  const ph = (w) => `<span class="sk" style="width:${w}"></span>`;

  function renderPublic() {
    const join = JOIN_URL
      ? `<a class="tm-btn red" href="${esc(JOIN_URL)}" target="_blank" rel="noopener"><span>${ICONS.discord} Zum Discord</span></a>`
      : `<p class="tm-muted">Schreib uns einfach auf Discord an – wir melden uns.</p>`;

    view.innerHTML = `
      <section class="tp-top">
        <div class="tp-hero">
          <div class="tp-hero-bg" style="background-image:url('${IMG}f2f-cars.webp')"></div>
          <div class="tp-hero-in">
            <img class="tp-motto" src="${IMG}f2f-motto.webp" alt="Konstanz bis ins Ziel" width="1200" height="462">
            <div class="tp-kicker"><i></i>Simracing <em>/</em> Team <em>/</em> Leidenschaft</div>
          </div>
        </div>
        <aside class="tp-login">${loginCard()}</aside>
      </section>

      <div class="tp-grid">
        <div class="tp-col">
          <section class="tp-next">
            <div class="tp-next-bg" style="background-image:url('${IMG}f2f-cars.webp')"></div>
            <div class="tp-next-in">
              <div class="tp-label">${ICONS.flag} Nächstes Rennen</div>
              <h4>Wird bekanntgegeben</h4>
              <div class="tp-next-sub">Endurance · GT3 / LMP2</div>
              <div class="tp-next-meta">
                <span>${ICONS.calendar} --.--.----</span><span>${ICONS.clock} --:-- Uhr</span><span>${ICONS.pin} iRacing</span>
              </div>
              <span class="tp-pill">Event-Details folgen</span>
            </div>
          </section>

          <section class="tp-about" id="tp-team">
            <div class="tp-about-txt">
              <div class="tp-label">${ICONS.people} Über uns</div>
              <h4>Mehr als nur ein Rennteam.</h4>
              <p><b>Flag to Flag Motorsport</b> ist ein engagiertes, aktives Simracing-Team auf iRacing. Gegründet wurde F2F am <b>24. September 2026</b> von Teamchef <b>Stefan Kreid</b> – die Idee eines eigenen Rennteams geht damit in die zweite Runde, diesmal komplett eigenständig und getrennt von der Community Snail Pace Racing.</p>
              <p>Wir bleiben bewusst klein: <b>maximal 10 bis 12 Fahrer</b>, damit jeder seinen Platz im Team hat. Unser Fokus liegt klar auf <b>Gemeinschaft</b>, <b>Weiterentwicklung</b> und jeder Menge <b>Spaß</b> beim gemeinsamen Fahren.</p>
              <p>Natürlich wollen wir gewinnen – vor allem aber wollen wir jedes Rennen ins Ziel bringen. Nicht umsonst lautet unser Teammotto: <b class="r">Konstanz bis ins Ziel.</b></p>
            </div>
            <div class="tp-facts">
              <div><span>Gegründet</span><b>24.09.2026</b></div>
              <div><span>Teamchef</span><b>Stefan Kreid</b></div>
              <div><span>Kader</span><b>max. 10–12 Fahrer</b></div>
              <div><span>Fokus</span><b>Ligen · Endurance</b></div>
              <div><span>Klassen</span><b>GT3 · LMP2</b></div>
              <div><span>Plattform</span><b>iRacing</b></div>
            </div>
            <div class="tp-values">${VALUES.map(([ic, t, d]) => `
              <div class="tp-value"><span>${ICONS[ic]}</span><b>${t}</b><small>${d}</small></div>`).join("")}
            </div>
          </section>
        </div>

        <aside class="tp-side">
          <div class="tp-widget">
            <div class="tp-widget-h">${ICONS.trophy}<b>Letzte Ergebnisse</b></div>
            ${[0, 1, 2, 3].map(() => `<div class="tp-row">${ph("44px")}<div class="tp-row-m">${ph("70%")}${ph("45%")}</div><span class="tp-pos">P–</span></div>`).join("")}
            <div class="tp-widget-f">Ergebnisse werden bald eingetragen</div>
          </div>
          <div class="tp-widget">
            <div class="tp-widget-h">${ICONS.calendar}<b>Nächste Events</b></div>
            ${[0, 1, 2].map(() => `<div class="tp-row"><span class="tp-date">--.--</span><div class="tp-row-m">${ph("65%")}${ph("40%")}</div><span class="tp-cls">GT3</span></div>`).join("")}
            <div class="tp-widget-f">Termine werden bald eingetragen</div>
          </div>
        </aside>
      </div>

      <section class="tp-sec" id="tp-fahrer">
        ${secHead("Unsere Fahrer", "Das Line-up", "helmet")}
        <div class="tp-drivers">${[1, 2, 3, 4].map(n => `
          <div class="tp-driver">
            <div class="tp-driver-img">${ICONS.helmet}<span class="tp-nr">#--</span></div>
            <div class="tp-driver-b"><b>Fahrer ${n}</b><small>GT3 / LMP2 · iRacing</small></div>
          </div>`).join("")}
        </div>
      </section>

      <section class="tp-sec" id="tp-autos">
        ${secHead("Unsere Fahrzeuge", "Im Einsatz", "car")}
        <div class="tp-cars">
          <div class="tp-car" style="--img:url('${IMG}f2f-cars.webp')"><span class="tp-car-bg">GT3</span><div><b>GT3</b><small>Multiclass, Ligen & Endurance</small></div></div>
          <div class="tp-car"><span class="tp-car-bg">LMP2</span><div><b>LMP2</b><small>Dallara P217 · Prototypen-Endurance</small></div></div>
          <div class="tp-car empty"><span class="tp-car-bg">+</span><div><b>Weitere folgen</b><small>Fahrzeuge werden ergänzt</small></div></div>
        </div>
      </section>

      <section class="tp-sec" id="tp-medien">
        ${secHead("Medien", "Bilder & Videos", "image")}
        <div class="tp-media">
          <a class="tp-media-i" href="${IMG}f2f-recruiting.webp" target="_blank" rel="noopener"><img src="${IMG}f2f-recruiting.webp" alt="Flag to Flag Motorsport sucht Fahrer" loading="lazy"></a>
          <a class="tp-media-i" href="${IMG}f2f-cars.webp" target="_blank" rel="noopener"><img src="${IMG}f2f-cars.webp" alt="F2F-Liveries auf der Strecke" loading="lazy"></a>
          <div class="tp-media-i empty">${ICONS.image}<span>Bilder folgen</span></div>
          <div class="tp-media-i empty">${ICONS.image}<span>Videos folgen</span></div>
        </div>
      </section>

      <section class="tp-sec tp-recruit">
        <div>
          ${secHead("Fahrer gesucht", "Simracing-Team <span class=\"r\">sucht dich!</span>", "flag")}
          <p class="tp-recruit-lead">Aktive Fahrer sind willkommen. Du fährst gern Ligen oder Endurance und willst als Team schneller werden? Dann melde dich bei uns.</p>
          <ul class="tp-feats">${FEATURES.map(([ic, t, d]) => `<li><span>${ICONS[ic]}</span><div><b>${t}</b><small>${d}</small></div></li>`).join("")}</ul>
          ${join}
        </div>
        <img class="tp-poster" src="${IMG}f2f-recruiting.webp" alt="Simracing-Team sucht dich – Flag to Flag Motorsport" width="1400" height="788" loading="lazy">
      </section>`;

    barNav.querySelectorAll("[data-scroll]").forEach(b => {
      b.onclick = () => document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ================================================================
     DASHBOARD (nach Login)
     ================================================================ */
  function renderShell() {
    const id = location.hash.replace("#", "");
    const tools = Object.keys(PANELS).filter(p => ME.panels[p]);
    const link = (hid, icon, label) => `<a class="td-link${id === hid ? " on" : ""}" href="#${hid}">${ICONS[icon]}<span>${esc(label)}</span></a>`;

    view.innerHTML = `
      <div class="td">
        <aside class="td-side">
          <nav class="td-nav" aria-label="Team-Menü">
            ${link("", "home", "Dashboard")}
            ${SECTIONS.map(s => link(s.id, s.icon, s.label)).join("")}
            ${tools.length ? `<div class="td-nav-h">Tools</div>${tools.map(p => link(p, p, PANELS[p].title)).join("")}` : ""}
            ${ME.isAdmin ? `<div class="td-nav-h">Verwaltung</div>${link("admin", "admin", "Admin")}` : ""}
          </nav>
        </aside>
        <div class="td-main" id="td-main"></div>
      </div>`;

    const sec = SECTIONS.find(s => s.id === id);
    if (id === "admin" && ME.isAdmin) return renderAdmin();
    if (id === "garage61" && ME.panels.garage61) return renderG61();
    if (PANELS[id] && ME.panels[id]) return renderSoon(PANELS[id].title, id, PANELS[id].desc);
    if (sec) return renderSoon(sec.label, sec.icon, sec.desc);
    renderHome(tools);
  }

  function panelHead(icon, title, badge = "") {
    return `<div class="td-head"><span class="td-head-ic">${ICONS[icon] || ""}</span><h3>${esc(title)}</h3>${badge}</div>`;
  }

  function renderSoon(title, icon, desc) {
    main().innerHTML = panelHead(icon, title, '<span class="tm-badge grey">In Vorbereitung</span>') + `
      <div class="tm-box tm-soon">
        <div class="big">Coming soon</div>
        <p>${esc(desc)} Dieser Bereich wird gerade gebaut.</p>
      </div>`;
  }

  function renderHome(tools) {
    const quick = [
      ["kalender", "calendar", "Kalender"], ["termine", "clock", "Termine"], ["ergebnisse", "flag", "Ergebnisse"],
      ["setups", "wrench", "Setups"], ["dokumente", "file", "Dokumente"], ["news", "news", "Team News"],
      ...tools.map(p => [p, p, PANELS[p].title]),
    ];
    main().innerHTML = `
      <section class="td-welcome" style="--img:url('${IMG}f2f-cars.webp')">
        <div class="td-welcome-in">
          <div class="tp-label">${ICONS.home} Dashboard</div>
          <h3>Willkommen zurück, <span class="r">${esc(ME.user.name)}</span></h3>
          <div class="td-welcome-b">
            <span class="tm-badge">${ME.isAdmin ? "Admin" : "Teammitglied"}</span>
            ${(ME.roles || []).map(chip).join("")}
          </div>
        </div>
      </section>

      <div class="td-label">Schnellzugriff</div>
      <div class="td-quick">${quick.map(([h, ic, t]) => `<a class="td-q" href="#${h}"><span>${ICONS[ic]}</span><b>${esc(t)}</b></a>`).join("")}</div>

      <div class="td-widgets">
        <div class="tp-widget">
          <div class="tp-widget-h">${ICONS.flag}<b>Nächstes Rennen</b></div>
          <div class="tp-row"><span class="tp-date">--.--</span><div class="tp-row-m">${ph("60%")}${ph("35%")}</div><span class="tp-cls">GT3</span></div>
          <div class="tp-widget-f">Wird bald eingetragen</div>
        </div>
        <div class="tp-widget">
          <div class="tp-widget-h">${ICONS.news}<b>Neueste News</b></div>
          ${[0, 1].map(() => `<div class="tp-row"><div class="tp-row-m">${ph("80%")}${ph("50%")}</div></div>`).join("")}
          <div class="tp-widget-f">Noch keine Mitteilungen</div>
        </div>
      </div>`;
  }

  /* ---------------- Tools ---------------- */
  async function renderG61() {
    main().innerHTML = panelHead("garage61", "Garage 61") + '<div id="g61b"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("g61b");
    let d;
    try { d = await api("/g61/board"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (!d.ready) {
      box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Noch nicht verbunden</div><p>Garage 61 ist noch nicht eingerichtet.${ME.isAdmin ? " Richte es im Admin-Bereich ein." : ""}</p></div>`;
      return;
    }
    const hd = main().querySelector(".td-head");
    hd.insertAdjacentHTML("beforeend", d.autoPost ? '<span class="tm-badge live">Discord-Posts aktiv</span>' : '<span class="tm-badge grey">Discord-Posts aus</span>');
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
    main().innerHTML = panelHead("admin", "Admin", '<span class="tm-badge">Rollen & Rechte</span>') + '<div id="adm"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
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
