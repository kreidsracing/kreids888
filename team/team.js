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
    activity: I('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
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
    { id: "news",   label: "Team News",     icon: "news" },
    { id: "fahrer", label: "Fahrerbereich", icon: "helmet" },
  ];

  // Tools – sichtbar je nach Rolle (Admin vergibt)
  const PANELS = {
    trainer:  { title: "Kreids-Trainer", desc: "Live-Coach, Setup-Berater und Streckenberater – direkt im Dashboard.", live: true },
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
      userBox.innerHTML = `<a class="tm-bar-login" href="${API}/login">${ICONS.discord}<span>Zum Teamdashboard</span></a>`;
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
    if (window.F2FTrainer) window.F2FTrainer.unmount();
    const inside = ME.loggedIn && ME.access;
    barNav.hidden = inside;
    if (!inside) return renderPublic();
    renderShell();
  }

  /* ================================================================
     ÖFFENTLICHE TEAMSEITE
     ================================================================ */
  // Livery Show: Bilder nach team/bilder/liveries/ legen und hier eintragen
  const LIVERIES = [
    // { datei: "porsche-gt3r.webp", titel: "Porsche 911 GT3 R – Teamlivery" },
  ];

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
    ["ai", "AI-Trainer", "Eigener KI-Coach für jedes Teammitglied."],
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
    const items = [["news", "Team News"], ["garage61", "Garage 61 – Fahrtenbuch & Bestzeiten"], ["trainer", "Kreids-Trainer"], ["helmet", "Fahrerprofil & Raceteam"], ["arrow", "und vieles mehr …"]];
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
          <section class="tp-next" id="tp-news">
            <div class="tp-next-bg" id="tp-news-bg" style="background-image:url('${IMG}f2f-cars.webp')"></div>
            <div class="tp-next-in">
              <div class="tp-label">${ICONS.news} Team News</div>
              <h4 id="tp-news-t">Neuigkeiten aus dem Team</h4>
              <div class="tp-next-sub" id="tp-news-d">Flag to Flag Motorsport</div>
              <a class="tp-pill" href="${API}/login">Mehr im Teambereich</a>
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
              <div><span>Klassen</span><b>GT3 · Prototypen</b></div>
              <div><span>Plattform</span><b>iRacing</b></div>
            </div>
            <div class="tp-values">${VALUES.map(([ic, t, d]) => `
              <div class="tp-value"><span>${ICONS[ic]}</span><b>${t}</b><small>${d}</small></div>`).join("")}
            </div>
          </section>
        </div>

        <aside class="tp-side">
          <div class="tp-widget" id="tp-best">
            <div class="tp-widget-h">${ICONS.trophy}<b>Aktuelle Bestzeiten</b></div>
            ${[0, 1, 2, 3].map(() => `<div class="tp-row"><div class="tp-row-m">${ph("70%")}${ph("45%")}</div><span class="tp-pos">–:––</span></div>`).join("")}
          </div>
          <div class="tp-widget" id="tp-events">
            <div class="tp-widget-h">${ICONS.calendar}<b>Nächste Events</b></div>
            ${[0, 1, 2].map(() => `<div class="tp-row"><span class="tp-date">--.--</span><div class="tp-row-m">${ph("65%")}${ph("40%")}</div></div>`).join("")}
          </div>
        </aside>
      </div>

      <section class="tp-sec" id="tp-fahrer">
        ${secHead("Line-up", "Das Raceteam", "helmet")}
        <div class="tp-drivers" id="tp-drivers">${[1, 2, 3, 4].map(n => `
          <div class="tp-driver">
            <div class="tp-driver-img">${ICONS.helmet}<span class="tp-nr">#--</span></div>
            <div class="tp-driver-b"><b>Fahrer ${n}</b><small>GT3 / Prototypen · iRacing</small></div>
          </div>`).join("")}
        </div>
      </section>

      <section class="tp-sec" id="tp-livery">
        ${secHead("Livery Show", "Unsere Designs", "brush")}
        <div class="tp-livery">${LIVERIES.length
          ? LIVERIES.map(l => `<a class="tp-liv" href="${IMG}liveries/${l.datei}" target="_blank" rel="noopener"><img src="${IMG}liveries/${l.datei}" alt="${esc(l.titel)}" loading="lazy"><span>${esc(l.titel)}</span></a>`).join("")
          : [1, 2, 3].map(() => `<div class="tp-liv empty">${ICONS.brush}<span>Livery folgt</span></div>`).join("")}
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

    // Neueste Team-News (nur Titel + Bild)
    fetch(API + "/public/news").then(r => r.json()).then(d => {
      const n = d.news;
      if (!n || !document.getElementById("tp-news-t")) return;
      document.getElementById("tp-news-t").textContent = n.title;
      document.getElementById("tp-news-d").textContent = new Date(n.created).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
      if (n.image) document.getElementById("tp-news-bg").style.backgroundImage = "url('" + n.image.replace(/'/g, "%27") + "')";
    }).catch(() => {});

    // Aktuelle Bestzeiten (Team-Rekorde aus Garage 61)
    fetch(API + "/public/bestzeiten").then(r => r.json()).then(d => {
      const el = document.getElementById("tp-best");
      if (!el) return;
      const head = `<div class="tp-widget-h">${ICONS.trophy}<b>Aktuelle Bestzeiten</b></div>`;
      if (!d.ready || !d.laps.length) {
        el.innerHTML = head + `<div class="tp-widget-f">${d.ready ? "Noch keine Bestzeiten in den letzten 30 Tagen" : "Bestzeiten erscheinen, sobald Garage 61 die Rundenzeiten freischaltet"}</div>`;
        return;
      }
      el.innerHTML = head + d.laps.map(l => `
        <div class="tp-row">
          <div class="tp-row-m"><b class="tp-b">${esc(l.track)}</b><small>${esc(l.driver)} · ${esc(l.car)}${l.bop ? ' · <span class="tm-bop">BOP</span>' : ""}</small></div>
          <span class="tp-lap">${fmtLap(l.time)}</span>
        </div>`).join("");
    }).catch(() => {});

    // Nächste Events aus dem Rennkalender (kreids888-Dashboard)
    fetch("https://kreids888-admin.kreids.workers.dev/api/calendar").then(r => r.json()).then(d => {
      const el = document.getElementById("tp-events");
      if (!el) return;
      const heute = new Date().toISOString().slice(0, 10);
      const next = (d.entries || []).filter(e => e.date >= heute).sort((x, y) => (x.date + (x.time || "")).localeCompare(y.date + (y.time || ""))).slice(0, 4);
      el.innerHTML = `<div class="tp-widget-h">${ICONS.calendar}<b>Nächste Events</b></div>` + (next.length ? next.map(e => `
        <div class="tp-row">
          <span class="tp-date">${e.date.slice(8, 10)}.${e.date.slice(5, 7)}.</span>
          <div class="tp-row-m"><b class="tp-b">${esc(e.title)}</b><small>${e.time ? esc(e.time) + " Uhr" : ""}${e.type ? " · " + esc(e.type) : ""}</small></div>
        </div>`).join("") : '<div class="tp-widget-f">Keine Termine eingetragen</div>');
    }).catch(() => {});

    // freigegebene Fahrerprofile statt Platzhalter
    fetch(API + "/public/raceteam").then(r => r.json()).then(d => {
      const el = document.getElementById("tp-drivers");
      if (el && d.team && d.team.length) el.innerHTML = d.team.map(p => driverCard(p, p.name, p.avatar)).join("");
    }).catch(() => {});

    barNav.querySelectorAll("[data-scroll]").forEach(b => {
      b.onclick = () => document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ================================================================
     DASHBOARD (nach Login)
     ================================================================ */
  function renderShell() {
    const id = location.hash.replace("#", "");
    const tools = Object.keys(PANELS).filter(p => ME.panels[p] && p !== "garage61");
    const link = (hid, icon, label) => `<a class="td-link${id === hid ? " on" : ""}" href="#${hid}">${ICONS[icon]}<span>${esc(label)}</span></a>`;

    view.innerHTML = `
      <div class="td">
        <aside class="td-side">
          <nav class="td-nav" aria-label="Team-Menü">
            ${link("", "home", "Dashboard")}
            ${ME.panels.garage61 ? link("garage61", "garage61", "Garage 61") : ""}
            ${SECTIONS.map(s => link(s.id, s.icon, s.label)).join("")}
            ${tools.length ? `<div class="td-nav-h">Tools</div>${tools.map(p => link(p, p, PANELS[p].title)).join("")}` : ""}
            ${ME.isAdmin ? `<div class="td-nav-h">Verwaltung</div>${link("aktivitaet", "activity", "Aktivität")}${link("news-schreiben", "news", "News schreiben")}${link("fahrerprofile", "helmet", "Fahrerprofile")}${link("admin", "admin", "Admin")}` : ""}
          </nav>
        </aside>
        <div class="td-main" id="td-main"></div>
      </div>`;

    if (id === "admin" && ME.isAdmin) return renderAdmin();
    if (id === "aktivitaet" && ME.isAdmin) return renderActivity();
    if (id === "news-schreiben" && ME.isAdmin) return renderNewsAdmin();
    if (id === "fahrerprofile" && ME.isAdmin) return renderProfilesAdmin();
    if (id === "news") return renderNews();
    if (id === "fahrer") return renderProfile();
    if (id === "garage61" && ME.panels.garage61) return renderG61();
    if (id === "trainer" && ME.panels.trainer && window.F2FTrainer)
      return window.F2FTrainer.mount(main(), { api, esc, toast, ICONS, panelHead, btn });
    if (PANELS[id] && ME.panels[id]) return renderSoon(PANELS[id].title, id, PANELS[id].desc);
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

      <div class="td-widgets">
        <div class="tp-widget" id="w-news">
          <div class="tp-widget-h">${ICONS.news}<b>Neueste News</b></div>
          <div class="tp-widget-f">Lädt …</div>
        </div>
        <div class="tp-widget" id="w-prof">
          <div class="tp-widget-h">${ICONS.helmet}<b>Mein Fahrerprofil</b></div>
          <div class="tp-widget-f">Lädt …</div>
        </div>
      </div>
      ${ME.panels.garage61 ? `<div class="tp-widget td-trips" id="w-trips">
        <div class="tp-widget-h">${ICONS.car}<b>Letzte Fahrten im Team</b></div>
        <div class="tp-widget-f">Lädt …</div>
      </div>` : ""}`;

    if (ME.panels.garage61) api("/g61/fleiss?tage=7").then(d => {
      const el = document.getElementById("w-trips");
      if (!el) return;
      const head = `<div class="tp-widget-h">${ICONS.car}<b>Letzte Fahrten im Team</b><a class="td-more" href="#garage61">Alle ansehen →</a></div>`;
      if (!d.ready) { el.innerHTML = head + '<div class="tp-widget-f">Garage 61 ist noch nicht eingerichtet</div>'; return; }
      el.innerHTML = head + (d.trips && d.trips.length ? tripTable(d.trips.slice(0, 8)) : '<div class="tp-widget-f">In den letzten 7 Tagen keine Fahrten</div>');
    }).catch(() => {});

    api("/news").then(d => {
      const el = document.getElementById("w-news");
      if (!el) return;
      const top = d.news.slice(0, 3);
      el.innerHTML = `<div class="tp-widget-h">${ICONS.news}<b>Neueste News</b></div>` + (top.length
        ? top.map(n => `<a class="tp-row td-newsrow" href="#news"><span class="tp-date">${fmtDay(n.created)}</span><div class="tp-row-m"><b>${esc(n.title)}</b><small>${esc(n.text.slice(0, 80))}${n.text.length > 80 ? " …" : ""}</small></div></a>`).join("")
        : `<div class="tp-widget-f">Noch keine Mitteilungen</div>`);
    }).catch(() => {});

    api("/profile/me").then(d => {
      const el = document.getElementById("w-prof");
      if (!el) return;
      const st = !d.draft ? ["Noch nicht ausgefüllt", "grey"] : d.pending ? ["Wartet auf Freigabe", "wait"] : ["Öffentlich sichtbar", "live"];
      el.innerHTML = `<div class="tp-widget-h">${ICONS.helmet}<b>Mein Fahrerprofil</b></div>
        <div class="td-prof-w"><span class="tm-badge ${st[1]}">${st[0]}</span>
        <p class="tm-muted">Dein Profil erscheint nach Freigabe auf der Teamseite unter „Das Raceteam".</p>
        <a class="tm-btn sm" href="#fahrer"><span>${d.draft ? "Profil bearbeiten" : "Profil anlegen"}</span></a></div>`;
    }).catch(() => {});
  }

  const fmtDay = (iso) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const fmtLong = (iso) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  /* ---------------- Team News (alle) ---------------- */
  async function renderNews() {
    main().innerHTML = panelHead("news", "Team News") + '<div id="nl"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("nl");
    let d;
    try { d = await api("/news"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (ME.isAdmin) document.querySelector(".td-head").insertAdjacentHTML("beforeend", `<a class="tm-btn sm red" href="#news-schreiben"><span>News schreiben</span></a>`);
    box.innerHTML = d.news.length ? d.news.map(n => newsCard(n)).join("") :
      `<div class="tm-box tm-soon"><div class="big">Noch leer</div><p>Hier erscheinen Updates und Mitteilungen der Teamleitung.</p></div>`;
  }

  function newsCard(n, admin) {
    return `
      <article class="tn-card">
        ${n.image ? `<img class="tn-img" src="${esc(n.image)}" alt="" loading="lazy">` : ""}
        <div class="tn-body">
          <div class="tn-meta">${fmtLong(n.created)} · ${esc(n.author && n.author.name || "")}${n.msgId ? ` · <span class="tn-dc">${ICONS.discord} in Discord gepostet</span>` : ""}</div>
          <h4>${esc(n.title)}</h4>
          <div class="tn-text">${esc(n.text).replace(/\n/g, "<br>")}</div>
          ${admin ? `<div class="tm-actions" style="margin-top:12px">${btn("Löschen", "sm", `data-del="${n.id}" data-dc="${n.msgId ? 1 : 0}"`)}</div>` : ""}
        </div>
      </article>`;
  }

  /* ---------------- News schreiben (Admin) ---------------- */
  async function renderNewsAdmin() {
    main().innerHTML = panelHead("news", "News schreiben", '<span class="tm-badge">Nur Admin</span>') + '<div id="na"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("na");
    let meta, list;
    try { [meta, list] = await Promise.all([api("/admin/news/meta"), api("/news")]); }
    catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }

    box.innerHTML = `
      <div class="tm-box">
        <h5>Neue News</h5>
        <p class="hint">Erscheint unter „Team News" und wird – wenn ein Kanal gewählt ist – vom Bot in Discord gepostet.</p>
        <div class="tm-row"><label for="n-title">Titel</label><input class="tm-input" id="n-title" maxlength="200" placeholder="z. B. Neues Team-Livery ist fertig"></div>
        <div class="tm-row"><label for="n-text">Text</label><textarea class="tm-input tm-area" id="n-text" maxlength="3800" rows="7" placeholder="Was gibt es Neues?"></textarea></div>
        <div class="tm-row"><label for="n-img">Bild / GIF<small>optional, direkter Link (.jpg .png .gif)</small></label><input class="tm-input" id="n-img" type="url" placeholder="https://…"></div>
        <div class="tm-row"><label for="n-ch">Discord-Kanal</label>
          <select class="tm-select" id="n-ch"><option value="">– nicht in Discord posten –</option>${meta.channels.map(c => `<option value="${c.id}" ${c.id === meta.lastChannel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div>
        <div class="tm-row"><label for="n-ping">Ping<small>optional</small></label>
          <select class="tm-select" id="n-ping"><option value="">– niemanden pingen –</option>${meta.roles.map(r => `<option value="${r.id}">@${esc(r.name)}</option>`).join("")}</select></div>
        <div class="tm-actions">${btn("Veröffentlichen", "red", 'id="n-send"')}</div>
      </div>
      <div class="td-label">Bisherige News</div>
      <div id="n-list">${list.news.length ? list.news.map(n => newsCard(n, true)).join("") : '<p class="tm-muted">Noch keine News.</p>'}</div>`;

    const send = document.getElementById("n-send");
    send.onclick = async () => {
      const body = {
        title: document.getElementById("n-title").value, text: document.getElementById("n-text").value,
        image: document.getElementById("n-img").value, channel: document.getElementById("n-ch").value, ping: document.getElementById("n-ping").value,
      };
      if (!body.title.trim() || !body.text.trim()) return toast("Titel und Text ausfüllen");
      send.disabled = true;
      try { const r = await api("/admin/news", { method: "POST", body }); toast(r.info, true); renderNewsAdmin(); }
      catch (e) { toast(e.message); send.disabled = false; }
    };
    box.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      const dc = b.dataset.dc === "1" && confirm("Auch die Nachricht in Discord löschen?");
      if (!confirm("News wirklich löschen?")) return;
      b.disabled = true;
      try { const r = await api("/admin/news/delete", { method: "POST", body: { id: b.dataset.del, discord: dc } }); toast(r.info, true); renderNewsAdmin(); }
      catch (e) { toast(e.message); b.disabled = false; }
    });
  }

  /* ---------------- Fahrerprofil ---------------- */
  const KLASSEN = ["", "GT3", "Prototypen", "GT3 & Prototypen"];

  function driverCard(p, name, avatar) {
    const img = p.foto || "";
    return `
      <div class="tp-driver">
        <div class="tp-driver-img${img ? " photo" : ""}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : avatar ? `<img class="ava" src="${esc(avatar)}" alt="" loading="lazy">` : ICONS.helmet}
          <span class="tp-nr">#${esc(p.nr || "--")}</span></div>
        <div class="tp-driver-b">
          <b>${esc(name)}</b>
          <small>${esc([p.klasse, p.auto].filter(Boolean).join(" · ") || "F2F Motorsport")}${p.land ? " · " + esc(p.land) : ""}</small>
          ${p.text ? `<p class="tp-driver-t">${esc(p.text)}</p>` : ""}
        </div>
      </div>`;
  }

  function profileForm(p) {
    p = p || {};
    const f = (id, label, val, attrs = "", hint = "") => `<div class="tm-row"><label for="pf-${id}">${label}${hint ? `<small>${hint}</small>` : ""}</label><input class="tm-input" id="pf-${id}" value="${esc(val || "")}" ${attrs}></div>`;
    return `
      ${f("nr", "Startnummer", p.nr, 'inputmode="numeric" maxlength="4" placeholder="z. B. 888"')}
      <div class="tm-row"><label for="pf-klasse">Klasse</label><select class="tm-select" id="pf-klasse">${KLASSEN.map(k => `<option value="${k}" ${k === (p.klasse || "") ? "selected" : ""}>${k || "– bitte wählen –"}</option>`).join("")}</select></div>
      ${f("auto", "Lieblingsauto", p.auto, 'maxlength="60" placeholder="z. B. Porsche 911 GT3 R (992)"')}
      ${f("land", "Land / Region", p.land, 'maxlength="40" placeholder="z. B. Saarland, DE"')}
      ${f("iracing", "iRacing-Name", p.iracing, 'maxlength="60"')}
      ${f("foto", "Foto", p.foto, 'type="url" maxlength="400" placeholder="https://…"', "Link zu einem Bild – leer = Discord-Bild")}
      <div class="tm-row"><label for="pf-text">Über mich<small>max. 600 Zeichen</small></label><textarea class="tm-input tm-area" id="pf-text" maxlength="600" rows="5">${esc(p.text || "")}</textarea></div>`;
  }

  const readForm = () => Object.fromEntries(["nr", "klasse", "auto", "land", "iracing", "foto", "text"].map(k => [k, document.getElementById("pf-" + k).value]));

  async function renderProfile() {
    main().innerHTML = panelHead("helmet", "Fahrerbereich") + '<div id="pf"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("pf");
    let d;
    try { d = await api("/profile/me"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    const st = !d.draft ? ["Noch nicht ausgefüllt", "grey"] : d.pending ? ["Änderungen warten auf Freigabe", "wait"] : ["Öffentlich sichtbar", "live"];
    box.innerHTML = `
      <div class="pf-grid">
        <div class="tm-box">
          <h5>Mein Fahrerprofil <span class="tm-badge ${st[1]}">${st[0]}</span></h5>
          <p class="hint">Nach Freigabe durch die Teamleitung erscheint dein Profil auf der Teamseite unter „Das Raceteam". Bis dahin bleibt die zuletzt freigegebene Version sichtbar.</p>
          ${profileForm(d.draft)}
          <div class="tm-actions">${btn("Speichern", "red", 'id="pf-save"')}</div>
        </div>
        <div>
          <div class="td-label" style="margin-top:0">Vorschau</div>
          <div id="pf-prev" class="pf-prev"></div>
        </div>
      </div>`;
    const prev = () => (document.getElementById("pf-prev").innerHTML = driverCard(readForm(), ME.user.name, ME.user.avatar));
    prev();
    box.querySelectorAll("input,select,textarea").forEach(el => el.addEventListener("input", prev));
    const save = document.getElementById("pf-save");
    save.onclick = async () => {
      save.disabled = true;
      try { const r = await api("/profile/me", { method: "POST", body: readForm() }); toast(r.info, true); renderProfile(); }
      catch (e) { toast(e.message); save.disabled = false; }
    };
  }

  /* ---------------- Fahrerprofile (Admin) ---------------- */
  async function renderProfilesAdmin(openId) {
    main().innerHTML = panelHead("helmet", "Fahrerprofile", '<span class="tm-badge">Nur Admin</span>') + '<div id="pa"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("pa");
    let d;
    try { d = await api("/admin/profiles"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    const state = (m) => !m.draft ? ["Leer", "grey"] : m.pending ? ["Wartet auf Freigabe", "wait"] : m.pub ? ["Öffentlich", "live"] : ["Ausgeblendet", "grey"];
    box.innerHTML = `
      <p class="tm-muted" style="margin-bottom:12px">Alle Mitglieder mit Team-Rolle. Fahrer pflegen ihr Profil selbst – du gibst frei oder überschreibst alles. Was du speicherst, ist sofort freigegeben. Mit ▲▼ legst du die Reihenfolge fest – so stehen sie auch öffentlich unter „Das Raceteam".</p>
      <div class="pa-list">${d.members.map((m, i) => {
        const [lbl, cls] = state(m);
        return `
          <div class="pa-row${m.id === openId ? " open" : ""}" data-id="${m.id}">
            <div class="pa-line">
            <div class="pa-move">
              <button type="button" data-mv="-1" title="Nach oben" ${i === 0 ? "disabled" : ""}>▲</button>
              <button type="button" data-mv="1" title="Nach unten" ${i === d.members.length - 1 ? "disabled" : ""}>▼</button>
            </div>
            <button class="pa-head" type="button">
              <img class="ta-ava" src="${esc(m.avatar)}" alt="" loading="lazy">
              <b>${esc(m.name)}</b>
              <span class="pa-nr">${m.draft && m.draft.nr ? "#" + esc(m.draft.nr) : ""}</span>
              <span class="tm-badge ${cls}">${lbl}</span>
            </button>
            </div>
            <div class="pa-body"></div>
          </div>`;
      }).join("") || '<p class="tm-muted" style="padding:16px">Keine Mitglieder mit Team-Rolle gefunden – im Admin unter „Team-Rollen" festlegen.</p>'}</div>`;

    const open = (row) => {
      const m = d.members.find(x => x.id === row.dataset.id);
      box.querySelectorAll(".pa-row.open").forEach(r => { if (r !== row) { r.classList.remove("open"); r.querySelector(".pa-body").innerHTML = ""; } });
      row.classList.toggle("open");
      const body = row.querySelector(".pa-body");
      if (!row.classList.contains("open")) { body.innerHTML = ""; return; }
      body.innerHTML = `
        <div class="pf-grid">
          <div>${m.pending ? '<p class="tm-muted" style="margin-bottom:6px">Das Formular zeigt die <b>neue, noch nicht freigegebene</b> Version des Fahrers.</p>' : ""}${profileForm(m.draft || m.pub)}
            <div class="tm-actions">
              ${btn("Speichern & freigeben", "red", 'data-act="save"')}
              ${m.pending ? btn("Änderung freigeben", "sm", 'data-act="approve"') : ""}
              ${m.pub ? btn("Öffentlich ausblenden", "sm", 'data-act="hide"') : ""}
            </div></div>
          <div><div class="td-label" style="margin-top:0">Vorschau</div><div class="pf-prev"></div>
            ${m.pub && m.pending ? `<div class="td-label">Aktuell öffentlich</div><div class="pf-prev">${driverCard(m.pub, m.name, m.avatar)}</div>` : ""}</div>
        </div>`;
      const prev = () => (body.querySelector(".pf-prev").innerHTML = driverCard(readForm(), m.name, m.avatar));
      prev();
      body.querySelectorAll("input,select,textarea").forEach(el => el.addEventListener("input", prev));
      body.querySelectorAll("[data-act]").forEach(b => b.onclick = async () => {
        b.disabled = true;
        try {
          const r = await api("/admin/profile", { method: "POST", body: { uid: m.id, action: b.dataset.act, profile: readForm() } });
          toast(r.info, true); renderProfilesAdmin(m.id);
        } catch (e) { toast(e.message); b.disabled = false; }
      });
    };
    box.querySelectorAll(".pa-head").forEach(h => h.onclick = () => open(h.closest(".pa-row")));
    box.querySelectorAll("[data-mv]").forEach(b => b.onclick = async () => {
      const id = b.closest(".pa-row").dataset.id;
      const i = d.members.findIndex(x => x.id === id), j = i + Number(b.dataset.mv);
      if (j < 0 || j >= d.members.length) return;
      const ids = d.members.map(x => x.id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      try { await api("/admin/profile/order", { method: "POST", body: { order: ids } }); renderProfilesAdmin(); }
      catch (e) { toast(e.message); }
    });
    if (openId) { const r = box.querySelector(`.pa-row[data-id="${openId}"]`); if (r) { r.classList.remove("open"); open(r); } }
  }

  /* ---------------- Discord-Aktivität (nur Admin) ---------------- */
  const ago = (iso) => {
    if (!iso) return "nie";
    const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
    return d <= 0 ? "heute" : d === 1 ? "gestern" : `vor ${d} Tagen`;
  };

  async function renderActivity() {
    main().innerHTML = panelHead("activity", "Discord-Aktivität", '<span class="tm-badge">Nur Admin</span>') + '<div id="act"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("act");
    let d;
    try { d = await api("/admin/activity"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }

    const runBtn = btn("Jetzt aktualisieren", "sm", 'id="act-run"');
    if (!d.ready) {
      box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Noch keine Daten</div><p>Die Auswertung läuft automatisch alle 12 Stunden. Beim ersten Mal werden die Nachrichten der letzten 30 Tage gezählt.</p><div class="tm-actions" style="justify-content:center;margin-top:18px">${runBtn}</div></div>`;
      bindRun();
      return;
    }

    let onlyTeam = localStorage.getItem("f2f-act-team") === "1";
    const draw = () => {
      const rows = d.members.filter(m => !onlyTeam || m.team).sort((a, b) => b.m30 - a.m30 || b.m7 - a.m7 || a.name.localeCompare(b.name));
      const max = Math.max(1, ...rows.map(r => r.m30));
      const state = (m) => {
        const days = m.last ? (Date.now() - Date.parse(m.last)) / 864e5 : Infinity;
        return days <= 7 ? ["aktiv", "Aktiv"] : days <= 21 ? ["ruhig", "Ruhig"] : ["inaktiv", "Inaktiv"];
      };
      const head = `<div class="ta-row ta-head"><span></span><span>Mitglied</span><span>Anteil (30 Tage)</span><span class="r-al">Nachr. 7 Tage</span><span class="r-al">Nachr. 30 Tage</span><span class="c-al">Status</span><span class="r-al">Zuletzt aktiv</span></div>`;
      document.getElementById("act-list").innerHTML = head + (rows.length ? rows.map(m => {
        const [cls, lbl] = state(m);
        return `
          <div class="ta-row ${cls}">
            <img class="ta-ava" src="${esc(m.avatar)}" alt="" loading="lazy">
            <div class="ta-name"><b>${esc(m.name)}</b>${m.team ? '<span class="tm-badge">Team</span>' : ""}</div>
            <div class="ta-bar"><i style="width:${Math.round(m.m30 / max * 100)}%"></i></div>
            <div class="ta-num"><b>${m.m7}</b><small>7 Tage</small></div>
            <div class="ta-num"><b>${m.m30}</b><small>30 Tage</small></div>
            <div class="ta-stc"><span class="ta-st">${lbl}</span></div>
            <div class="ta-last">${ago(m.last)}</div>
          </div>`;
      }).join("") : '<p class="tm-muted" style="padding:16px">Keine Mitglieder gefunden.</p>');
    };

    box.innerHTML = `
      <div class="tm-box ta-top">
        <div>
          <div class="ta-upd">Letzte Aktualisierung: <b>${fmtDate(d.updated)}</b></div>
          <div class="tm-muted">Automatisch alle 12 Stunden · ${d.channels || 0} Kanäle · gezählt werden geschriebene Nachrichten${d.complete ? "" : ' · <span class="tm-err">noch nicht alle Kanäle durch</span>'}</div>
          ${d.membersError ? `<div class="tm-err" style="margin-top:6px">${esc(d.membersError)}</div>` : ""}
        </div>
        <div class="tm-actions">
          <label class="tm-switch"><input type="checkbox" id="act-team" ${onlyTeam ? "checked" : ""}><span class="s"></span>Nur Team</label>
          ${runBtn}
        </div>
      </div>
      <div class="ta-legend"><span class="aktiv">Aktiv</span> letzte 7 Tage <span class="ruhig">Ruhig</span> 8–21 Tage <span class="inaktiv">Inaktiv</span> länger / nie</div>
      <div class="ta-list" id="act-list"></div>`;
    draw();
    document.getElementById("act-team").onchange = (e) => {
      onlyTeam = e.target.checked;
      try { localStorage.setItem("f2f-act-team", onlyTeam ? "1" : "0"); } catch (x) { /* egal */ }
      draw();
    };
    bindRun();

    function bindRun() {
      const b = document.getElementById("act-run");
      b.onclick = async () => {
        b.disabled = true;
        try { const r = await api("/admin/activity/run", { method: "POST" }); toast(r.info, true); renderActivity(); }
        catch (e) { toast(e.message); b.disabled = false; }
      };
    }
  }

  /* ---------------- Tools ---------------- */
  const TYPE_SHORT = { 1: "Training", 2: "Quali", 3: "Rennen" };
  const tripTable = (rows) => `
    <div class="tm-tbl-wrap"><table class="tm-tbl g6-trips">
      <tr class="th"><td>Datum</td><td>Fahrer</td><td>Auto</td><td>Strecke</td><td class="r-al">Zeit</td><td class="r-al">Runden</td><td class="r-al">Sauber</td></tr>
      ${rows.map(x => `<tr>
        <td class="d0">${new Date(x.day).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</td>
        <td class="n"><b>${esc(x.driver)}</b>${(x.types || []).map(ty => `<span class="g6-type t${ty}">${TYPE_SHORT[ty] || ""}</span>`).join("")}</td>
        <td>${esc(x.car)}</td>
        <td class="g6-track">${esc(x.track)}</td>
        <td class="r-al g6-n">${fmtHours(x.time)}</td>
        <td class="r-al g6-n">${x.laps}</td>
        <td class="r-al g6-n">${x.laps ? Math.round(x.clean / x.laps * 100) + " %" : "–"}</td>
      </tr>`).join("")}
    </table></div>`;

  const fmtHours = (sec) => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`; };

  async function renderG61(tab, days) {
    tab = tab || "fleiss";
    days = days || 7;
    main().innerHTML = panelHead("garage61", "Garage 61") + `
      <div class="g6-tabs">
        <button type="button" data-tab="fleiss" class="${tab === "fleiss" ? "on" : ""}">Trainingsfleiß</button>
        <button type="button" data-tab="trips" class="${tab === "trips" ? "on" : ""}">Fahrtenbuch</button>
        <button type="button" data-tab="board" class="${tab === "board" ? "on" : ""}">Bestenliste</button>
        <button type="button" data-tab="ratings" class="${tab === "ratings" ? "on" : ""}">iRating</button>
      </div>
      <div id="g61b"><div class="tm-loading"><span></span><span></span><span></span></div></div>`;
    main().querySelectorAll("[data-tab]").forEach(b => b.onclick = () => renderG61(b.dataset.tab, days));
    if (tab === "fleiss") return renderFleiss(days);
    if (tab === "trips") return renderTrips(days);
    if (tab === "ratings") return renderRatings();
    return renderBoard();
  }

  const CAT_NAME = { sports_car: "Sports Car", formula_car: "Formula", oval: "Oval", dirt_road: "Dirt Road", dirt_oval: "Dirt Oval", road: "Road (alt)" };
  const catKey = (c) => String(c).toLowerCase().replace(/\s+/g, "_");

  async function renderRatings() {
    const box = document.getElementById("g61b");
    let d;
    try { d = await api("/g61/ratings"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (!d.ready) { box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Noch nicht verbunden</div><p>Garage 61 ist noch nicht eingerichtet.</p></div>`; return; }
    const ORDER = ["sports_car", "formula_car", "oval", "dirt_road", "dirt_oval", "road"];
    d.categories.sort((x, y) => ((ORDER.indexOf(catKey(x)) + 1 || 99) - (ORDER.indexOf(catKey(y)) + 1 || 99)));
    const sc = d.categories[0];
    d.drivers.sort((x, y) => (Number((x.r[sc] || {}).irNum) || 0) < (Number((y.r[sc] || {}).irNum) || 0) ? 1 : -1);
    const cats = d.categories;
    const lic = (sr) => { const c = String(sr || "").trim().charAt(0).toUpperCase(); return "ABCDR".includes(c) && c ? c : ""; };
    box.innerHTML = `
      <div class="g6-bar">
        <span class="tm-muted">iRating und Safety Rating aller Teammitglieder · sortiert nach ${esc(CAT_NAME[catKey(d.categories[0])] || d.categories[0] || "")} · Stand: ${fmtDate(d.at)}</span>
      </div>
      <div class="ta-list"><div class="tm-tbl-wrap"><table class="tm-tbl g6-ir">
        <tr class="th"><td>#</td><td>Fahrer</td>${cats.map(c => `<td class="c-al">${esc(CAT_NAME[catKey(c)] || c)}</td>`).join("")}</tr>
        ${d.drivers.map((x, i) => `<tr>
          <td class="p">${i + 1}</td><td class="n"><b>${esc(x.name)}</b></td>
          ${cats.map(c => { const r = x.r[c] || {}; const L = lic(r.sr);
            return r.ir
              ? `<td class="c-al"><div class="g6-cell"><b class="g6-irv">${esc(r.ir)}</b>${r.sr ? `<span class="g6-sr l${L}">${esc(r.sr)}</span>` : ""}</div></td>`
              : `<td class="c-al"><span class="g6-none">–</span></td>`; }).join("")}
        </tr>`).join("")}
      </table></div></div>`;
  }

  async function renderTrips(days) {
    const box = document.getElementById("g61b");
    let d;
    try { d = await api("/g61/fleiss?tage=" + days); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (!d.ready) { box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Noch nicht verbunden</div><p>Garage 61 ist noch nicht eingerichtet.</p></div>`; return; }
    box.innerHTML = `
      <div class="g6-bar">
        <div class="g6-range">
          <button type="button" data-days="7" class="${days === 7 ? "on" : ""}">7 Tage</button>
          <button type="button" data-days="30" class="${days === 30 ? "on" : ""}">30 Tage</button>
        </div>
        <span class="tm-muted">Wer war mit welchem Auto auf welcher Strecke – pro Tag · Stand: ${fmtDate(d.at)}</span>
      </div>
      <div class="ta-list">${d.trips.length ? tripTable(d.trips) : '<p class="tm-muted" style="padding:16px">Keine Fahrten in diesem Zeitraum.</p>'}</div>`;
    box.querySelectorAll("[data-days]").forEach(b => b.onclick = () => renderG61("trips", Number(b.dataset.days)));
  }

  async function renderFleiss(days) {
    const box = document.getElementById("g61b");
    let d;
    try { d = await api("/g61/fleiss?tage=" + days); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (!d.ready) {
      box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Noch nicht verbunden</div><p>Garage 61 ist noch nicht eingerichtet.${ME.isAdmin ? " Im Admin-Bereich unter „Garage 61 → Discord“ das Team wählen und speichern." : ""}</p></div>`;
      return;
    }
    const t = d.totals, max = Math.max(1, ...d.drivers.map(x => x.time));
    const pct = (a, b) => b ? Math.round(a / b * 100) + " %" : "–";
    box.innerHTML = `
      <div class="g6-bar">
        <div class="g6-range">
          <button type="button" data-days="7" class="${days === 7 ? "on" : ""}">7 Tage</button>
          <button type="button" data-days="30" class="${days === 30 ? "on" : ""}">30 Tage</button>
        </div>
        <span class="tm-muted">Stand: ${fmtDate(d.at)} · aktualisiert alle 3 Std.</span>
      </div>

      <div class="g6-kpis">
        <div><b>${fmtHours(t.time)}</b><span>auf der Strecke</span></div>
        <div><b>${t.laps.toLocaleString("de-DE")}</b><span>Runden</span></div>
        <div><b>${pct(t.clean, t.laps)}</b><span>saubere Runden</span></div>
        <div><b>${t.active} / ${t.members}</b><span>Fahrer aktiv</span></div>
      </div>

      <div class="ta-list g6-list">
        <div class="g6-row ta-head"><span>#</span><span>Fahrer</span><span>Zeit auf der Strecke</span><span class="r-al">Runden</span><span class="r-al">Sauber</span><span class="r-al">Tage</span><span>Meist gefahren</span></div>
        ${d.drivers.map((x, i) => `
          <div class="g6-row${x.time ? "" : " zero"}">
            <span class="g6-pos">${x.time ? i + 1 : "–"}</span>
            <div class="g6-name"><b>${esc(x.name)}</b>${x.irating ? `<small>iR ${esc(x.irating)}${x.sr ? " · " + esc(x.sr) : ""}</small>` : ""}</div>
            <div class="g6-time"><div class="ta-bar"><i style="width:${Math.round(x.time / max * 100)}%"></i></div><span>${x.time ? fmtHours(x.time) : "–"}</span></div>
            <span class="r-al g6-n">${x.laps || "–"}</span>
            <span class="r-al g6-n">${pct(x.clean, x.laps)}</span>
            <span class="r-al g6-n">${x.days || "–"}</span>
            <div class="g6-fav">${x.fav ? `<b>${esc(x.fav.car)}</b><small>${esc(x.fav.track)}</small>` : '<small>–</small>'}</div>
          </div>`).join("")}
      </div>

      <div class="g6-tops">
        <div class="tp-widget"><div class="tp-widget-h">${ICONS.pin}<b>Top-Strecken</b></div>
          ${d.tracks.map(x => `<div class="tp-row"><div class="tp-row-m"><b>${esc(x.name)}</b></div><span class="g6-n">${fmtHours(x.time)}</span></div>`).join("") || '<div class="tp-widget-f">Keine Daten</div>'}</div>
        <div class="tp-widget"><div class="tp-widget-h">${ICONS.car}<b>Top-Autos</b></div>
          ${d.cars.map(x => `<div class="tp-row"><div class="tp-row-m"><b>${esc(x.name)}</b></div><span class="g6-n">${fmtHours(x.time)}</span></div>`).join("") || '<div class="tp-widget-f">Keine Daten</div>'}</div>
      </div>`;
    box.querySelectorAll("[data-days]").forEach(b => b.onclick = () => renderG61("fleiss", Number(b.dataset.days)));
  }

  async function renderBoard() {
    const box = document.getElementById("g61b");
    let d;
    try { d = await api("/g61/board"); } catch (e) {
      box.innerHTML = /lehnt|403|401/.test(e.message)
        ? `<div class="tm-box tm-soon"><div class="big">Bald verfügbar</div><p>Die Bestenliste braucht die Rundenzeiten von Garage 61. Die Freischaltung ist beantragt – sobald sie da ist, erscheint hier die Team-Bestenliste.</p></div>`
        : `<div class="tm-box tm-err">${esc(e.message)}</div>`;
      return;
    }
    if (!d.ready) {
      box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Noch nicht verbunden</div><p>Garage 61 ist noch nicht eingerichtet.</p></div>`;
      return;
    }
    if (!d.boards.length) {
      box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Keine Runden</div><p>In den letzten 14 Tagen hat niemand aus dem Team Runden hochgeladen.</p></div>`;
      return;
    }
    box.innerHTML = `<p class="tm-muted" style="margin-bottom:16px">Persönliche Bestzeiten pro Strecke und Auto – alles, was das Team in den letzten 14 Tagen gefahren ist. <span class="tm-new">NEU</span> = in den letzten 48 Stunden. ${d.autoPost ? '<span class="tm-badge live">Discord-Posts aktiv</span>' : ""}</p>
      <div class="tm-boards">${d.boards.map(b => `
        <div class="tm-board">
          <div class="tm-board-h"><b>${esc(b.track)}</b><span>${esc(b.car)}</span></div>
          <div class="tm-tbl-wrap"><table class="tm-tbl">${b.laps.map(l => `
            <tr class="${l.rank === 1 ? "first" : ""}">
              <td class="p">P${l.rank}</td>
              <td class="n">${esc(l.driver)}${isRecent(l.startTime) ? '<span class="tm-new">NEU</span>' : ""}${l.bop && (l.bop.kg || l.bop.pct) ? '<span class="tm-bop" title="Mit BOP gefahren">BOP</span>' : ""}</td>
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
        <p class="hint">Alle 30 Minuten wird geschaut, ob jemand aus dem Team eine neue persönliche Bestzeit gefahren ist – die wird dann im gewählten Discord-Kanal gepostet, mit Angabe ob mit oder ohne BOP.</p>
        <div class="tm-row"><label for="g61-team">Garage-61-Team</label><div>${teamOpts}</div></div>
        <div class="tm-row"><label for="g61-ch">Discord-Kanal<small>für Bestzeit-Posts</small></label>
          <div><select class="tm-select" id="g61-ch"><option value="">– Kanal wählen –</option>${(d.channels || []).map(c => `<option value="${c.id}" ${c.id === g.channel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><div class="lbl">Automatisch posten</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label class="tm-switch"><input type="checkbox" id="g61-on" ${g.enabled ? "checked" : ""}><span class="s"></span>Neue Bestzeiten posten</label>
            <label class="tm-switch"><input type="checkbox" id="g61-rec" ${g.onlyTeamRecord ? "checked" : ""}><span class="s"></span>Nur Team-Rekorde (P1)</label>
            <label class="tm-switch"><input type="checkbox" id="g61-week" ${g.weekly ? "checked" : ""}><span class="s"></span>Wochenrückblick jeden Sonntagabend</label>
          </div></div>
        <div class="tm-row"><div class="lbl">Testen</div>
          <div>
            <div class="tm-actions">${btn("Test-Post senden", "sm", 'id="g61-test"')}${btn("Jetzt prüfen", "sm", 'id="g61-run"')}</div>
            <div class="tm-actions" style="margin-top:12px">
              <select class="tm-select" id="g61-sdays" style="width:auto"><option value="7">Letzte 7 Tage</option><option value="30">Letzte 30 Tage</option></select>
              ${btn("📊 Statistik an Discord senden", "sm red", 'id="g61-stats"')}
            </div>
            <p class="tm-muted" style="margin-top:10px">Letzter Lauf: ${gi.lastRun ? fmtDate(gi.lastRun) + " – " + esc(gi.lastResult || "") : "noch keiner"}</p>
          </div></div>
      </div>

      <div class="tm-box">
        <h5>Renn-Erinnerungen</h5>
        <p class="hint">Der Bot erinnert in Discord an jedes Rennen aus deinem Rennkalender (kreids888-Dashboard) – 24 Stunden und 1 Stunde vorher.</p>
        <div class="tm-row"><div class="lbl">Erinnerungen</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label class="tm-switch"><input type="checkbox" id="rm-on" ${cfg.reminders.enabled ? "checked" : ""}><span class="s"></span>An</label>
            <label class="tm-switch"><input type="checkbox" id="rm-24" ${cfg.reminders.h24 ? "checked" : ""}><span class="s"></span>24 Stunden vorher</label>
            <label class="tm-switch"><input type="checkbox" id="rm-1" ${cfg.reminders.h1 ? "checked" : ""}><span class="s"></span>1 Stunde vorher</label>
          </div></div>
        <div class="tm-row"><label for="rm-ch">Discord-Kanal</label>
          <div><select class="tm-select" id="rm-ch"><option value="">– Kanal wählen –</option>${(d.channels || []).map(c => `<option value="${c.id}" ${c.id === cfg.reminders.channel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><label for="rm-ping">Ping<small>Rolle, die erwähnt wird</small></label>
          <div><select class="tm-select" id="rm-ping"><option value="">– niemanden pingen –</option>${d.roles.map(r => `<option value="${r.id}" ${r.id === cfg.reminders.ping ? "selected" : ""}>@${esc(r.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><div class="lbl">Testen</div><div class="tm-actions">${btn("Test-Erinnerung senden", "sm", 'id="rm-test"')}</div></div>
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
    box.querySelectorAll("#g61-team,#g61-ch,#g61-on,#g61-rec,#g61-week,#rm-on,#rm-24,#rm-1,#rm-ch,#rm-ping").forEach(el => el.addEventListener("input", markDirty));
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
          channel: document.getElementById("g61-ch").value,
          enabled: document.getElementById("g61-on").checked,
          onlyTeamRecord: document.getElementById("g61-rec").checked,
          weekly: document.getElementById("g61-week").checked,
        },
        reminders: {
          enabled: document.getElementById("rm-on").checked,
          channel: document.getElementById("rm-ch").value,
          ping: document.getElementById("rm-ping").value,
          h24: document.getElementById("rm-24").checked,
          h1: document.getElementById("rm-1").checked,
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
    action("rm-test", "/admin/reminders/test");

    const sb = document.getElementById("g61-stats");
    sb.onclick = async () => {
      sb.disabled = true;
      try {
        if (dirty) await save();
        const r = await api("/admin/g61/stats", { method: "POST", body: { days: Number(document.getElementById("g61-sdays").value), channel: document.getElementById("g61-ch").value } });
        toast(r.info, r.ok);
      } catch (e) { toast(e.message); }
      sb.disabled = false;
    };
  }


  init();
})();
