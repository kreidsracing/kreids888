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
  const JOIN_URL = "https://discord.gg/HFurqDE4q5";

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
    link: I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    ext: I('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    eye: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    stint: I('<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 9v11M14 13h3M14 16h3"/><path d="M6.5 6.5h.01"/>'),
    gauge: I('<path d="M3.5 18a9 9 0 1 1 17 0"/><path d="M12 15l4.5-5.5"/><circle cx="12" cy="15" r="1.4" fill="currentColor"/>'),
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
    links:    { title: "Links", desc: "Wichtige Links fürs Team.", live: true },
    stint:    { title: "Stintplaner", desc: "Stints, Sprit und Fahrer für Endurance-Rennen planen.", live: true },
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

  /* ---------------- Nutzung mitzählen (für Admin-Bereich „Nutzung") ---------------- */
  const NUTZ = { b: {}, neu: true, offen: false };
  function merke(id) {
    if (!ME || !ME.access || id === "nutzung" || id === "limits") return;
    NUTZ.b[id] = (NUTZ.b[id] || 0) + 1;
    NUTZ.offen = true;
  }
  function nutzungSenden() {
    if (!NUTZ.offen) return;
    const body = JSON.stringify({ b: NUTZ.b, neu: NUTZ.neu });
    NUTZ.b = {}; NUTZ.neu = false; NUTZ.offen = false;
    try {
      fetch(API + "/usage", { method: "POST", credentials: "same-origin", keepalive: true, headers: { "Content-Type": "application/json" }, body }).catch(() => {});
    } catch (e) { /* egal */ }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") nutzungSenden(); });
  window.addEventListener("pagehide", nutzungSenden);

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
    const items = [["news", "Team News"], ["garage61", "Garage 61: Fahrtenbuch & Bestzeiten"], ["trainer", "Kreids-Trainer"], ["helmet", "Fahrerprofil & Raceteam"], ["arrow", "und vieles mehr …"]];
    return `
      <div class="tp-login-h">${ICONS.discord}<b>Team Login</b></div>
      <p class="tp-login-sub">Nur für Teammitglieder. Interner Bereich.</p>
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

      <section class="tp-sec" id="tp-woche" hidden>
        <div class="tp-h wk-h">
          <img class="wk-logo" src="${IMG}f2f-logo.webp" alt="F2F Motorsport" width="48" height="48">
          <div><div class="tp-h-k" id="tp-woche-kw">Training</div><h3>Trainingswoche bei <span class="r">Flag to Flag Motorsport</span></h3></div>
          <span class="wk-motto">Konstanz bis ins Ziel.</span>
        </div>
        <div id="tp-woche-k"></div>
      </section>

      <section class="tp-sec" id="tp-event">
        ${secHead("Nächstes Event", "Wir sind am <span class=\"r\">Start</span>", "flag")}
        <div id="tp-event-box"><div class="tm-loading"><span></span><span></span><span></span></div></div>
      </section>

      <section class="tp-sec tp-recruit">
        <div>
          ${secHead("Fahrer gesucht", "Simracing-Team <span class=\"r\">sucht dich!</span>", "flag")}
          <p class="tp-recruit-lead">Aktive Fahrer sind willkommen. Du fährst gern Ligen oder Endurance und willst als Team schneller werden? Dann melde dich bei uns.</p>
          <ul class="tp-feats">${FEATURES.map(([ic, t, d]) => `<li><span>${ICONS[ic]}</span><div><b>${t}</b><small>${d}</small></div></li>`).join("")}</ul>
          ${join}
        </div>
        <img class="tp-poster" src="${IMG}f2f-recruiting.webp" alt="Simracing-Team sucht dich – Flag to Flag Motorsport" width="1400" height="788" loading="lazy">
      </section>

      <section class="tp-sec tp-join" id="tp-join">
        <div class="tp-join-txt">
          <div class="tp-h-k">Teammitglied werden</div>
          <h3>Bock auf <span class="r">Flag to Flag?</span></h3>
          <p>Du fährst gern Ligen oder Endurance, willst als Team schneller werden und suchst Leute, mit denen Simracing richtig Spaß macht? Dann komm auf unseren Discord und bewirb dich. Dort lernst du das Team kennen, fährst die ersten Trainings mit und wir schauen gemeinsam, ob es passt.</p>
          <ol class="tp-join-steps">
            <li><span>1</span><div><b>Discord beitreten</b><small>Ein Klick auf den Knopf genügt.</small></div></li>
            <li><span>2</span><div><b>Bewerben</b><small>Wer bist du, was fährst du, welches iRating, wie viel Zeit hast du?</small></div></li>
            <li><span>3</span><div><b>Probetraining</b><small>Ein paar Runden mit dem Team, damit wir uns kennenlernen.</small></div></li>
            <li><span>4</span><div><b>Mitfahren</b><small>Trainings, Setup-Abende und die ersten Rennen im F2F-Auto.</small></div></li>
          </ol>
        </div>
        <div class="tp-join-card">
          <img src="${IMG}f2f-logo.webp" alt="F2F Motorsport" width="96" height="96">
          <b>F2F Motorsport</b>
          <div class="tp-join-stats" id="tp-join-stats"><span><i class="on"></i><em id="tp-dc-on">…</em> online</span><span><i></i><em id="tp-dc-all">…</em> Mitglieder</span></div>
          <a class="tp-join-btn" href="${JOIN_URL}" target="_blank" rel="noopener">${ICONS.discord}<span>Jetzt bewerben</span></a>
          <small>Plätze sind begrenzt: maximal 10 bis 12 Fahrer.</small>
        </div>
      </section>`;

    // Discord: Mitglieder / online
    fetch(API + "/public/discord").then(r => r.json()).then(d => {
      if (!d.ok) { const el = document.getElementById("tp-join-stats"); if (el) el.remove(); return; }
      const a = document.getElementById("tp-dc-on"), b = document.getElementById("tp-dc-all");
      if (a) a.textContent = d.online;
      if (b) b.textContent = d.members;
    }).catch(() => {});

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
      const head = `<div class="tp-widget-h">${ICONS.trophy}<b>Teamrekorde</b>${d.ready && d.laps.length ? '<span class="tb-live">● live aus Garage 61</span>' : ""}</div>`;
      if (!d.ready || !d.laps.length) {
        el.innerHTML = head + `<div class="tp-widget-f">${d.ready ? "Noch keine Bestzeiten in den letzten 30 Tagen" : "Bestzeiten erscheinen, sobald Garage 61 die Rundenzeiten freischaltet"}</div>`;
        return;
      }
      const vor = (iso) => {
        const m = (Date.now() - Date.parse(iso)) / 60000;
        if (m < 60) return "vor " + Math.max(1, Math.round(m)) + " Min.";
        if (m < 24 * 60) return "vor " + Math.round(m / 60) + " Std.";
        const t = Math.round(m / 1440);
        return t === 1 ? "gestern" : "vor " + t + " Tagen";
      };
      const kurz = (n) => String(n || "").split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
      el.innerHTML = head + d.laps.map((l, i) => {
        const m = String(l.track || "").match(/^(.*?)\s*\((.*)\)$/);
        const name = m ? m[1] : l.track, variante = m ? m[2] : "";
        return `
        <div class="tb-row${i === 0 ? " neu" : ""}">
          <div class="tb-top"><b class="tb-track">${esc(name)}</b><span class="tb-lap">${fmtLap(l.time)}</span></div>
          ${variante ? `<div class="tb-var">${esc(variante)}</div>` : ""}
          <div class="tb-fahrer"><span class="tb-av">${esc(kurz(l.driver))}</span><span class="tb-name">${esc(l.driver)}</span>${isRecent(l.startTime) ? '<span class="tb-tag neu">NEU</span>' : ""}${l.bop ? '<span class="tb-tag bop">BOP</span>' : ""}<span class="tb-wann">${vor(l.startTime)}</span></div>
          <div class="tb-car">${esc(l.car)}</div>
        </div>`;
      }).join("");
    }).catch(() => {});

    // Nächste Events aus dem Rennkalender (kreids888-Dashboard)
    fetch(API + "/public/kalender").then(r => r.json()).then(d => {
      const el = document.getElementById("tp-events");
      if (!el) return;
      const next = (d.entries || []).slice(0, 4);
      el.innerHTML = `<div class="tp-widget-h">${ICONS.calendar}<b>Nächste Events</b></div>` + (next.length ? next.map(e => `
        <div class="tp-row">
          <span class="tp-date">${e.date.slice(8, 10)}.${e.date.slice(5, 7)}.</span>
          <div class="tp-row-m"><b class="tp-b">${esc(e.title)}</b><small>${e.time ? esc(e.time) + " Uhr" : ""}${e.type ? " · " + esc(e.type) : ""}</small></div>
        </div>`).join("") : '<div class="tp-widget-f">Keine Termine eingetragen</div>');
    }).catch(() => {});

    // Trainingswoche (nur Team-Summen aus Garage 61)
    fetch(API + "/public/woche").then(r => r.json()).then(d => {
      const sec = document.getElementById("tp-woche");
      if (!sec || !d.ready || (!d.jetzt.laps && !d.vorher.laps)) return;
      document.getElementById("tp-woche-k").innerHTML = wocheKacheln(d, false);
      document.getElementById("tp-woche-kw").textContent = "Training · KW " + d.kwVorher;
      sec.hidden = false;
    }).catch(() => {});

    // nächstes Event aus dem Stintplaner
    fetch(API + "/public/stint").then(r => r.json()).then(d => {
      const el = document.getElementById("tp-event-box");
      if (!el) return;
      const e = d.event;
      if (!e) { el.innerHTML = `<div class="tpe tpe-leer"><b>Aktuell ist kein Event geplant.</b><span>Schau bald wieder rein.</span></div>`; return; }
      const pad = (n) => String(n).padStart(2, "0");
      const tag = (iso) => { const [y, m, t] = iso.split("-"); return t + "." + m + "." + y; };
      const wann = e.von ? (e.bis && e.bis !== e.von ? tag(e.von) + " bis " + tag(e.bis) : tag(e.von)) : new Date(e.start).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      const zeit = (ms) => { const x = new Date(ms); return pad(x.getHours()) + ":" + pad(x.getMinutes()); };
      const laenge = e.mode === "runden" ? e.runden + " Runden" : (e.dauerMin % 60 ? Math.floor(e.dauerMin / 60) + " h " + (e.dauerMin % 60) + " min" : e.dauerMin / 60 + " Stunden");
      const farbe = (n) => /black|schwarz/i.test(n) ? "#3a3f4b" : /white|wei/i.test(n) ? "#e9ecf1" : /silver|silber/i.test(n) ? "#a7afba" : "#e11324";
      el.innerHTML = `<div class="tpe">
        <div class="tpe-main">
          <div class="tpe-k">${ICONS.flag}<span>${esc(e.track || "Strecke folgt")}</span></div>
          <h4>${esc(e.name)}</h4>
          <div class="tpe-facts"><span>${ICONS.calendar}${esc(wann)}</span><span>${ICONS.clock}${e.zeiten && e.zeiten.length ? "Startzeiten " + e.zeiten.join(", ") + " Uhr" : zeit(e.start) + " Uhr"}</span><span>${ICONS.flag}${laenge}</span></div>
          <div class="tpe-cd" id="tpe-cd"></div>
        </div>
        <div class="tpe-cars">${(e.cars || []).map(c => `<div class="tpe-car" style="--t:${farbe(c.name)}">
          <div class="tpe-car-h"><b>${esc(c.name)}</b><span>${esc(c.carName || "")}</span></div>
          <div class="tpe-car-s">${ICONS.clock}${new Date(c.start).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr</div>
          <div class="tpe-drv">${c.drivers.map(n => `<span>${esc(n)}</span>`).join("") || "<em>Fahrer folgen</em>"}</div>
        </div>`).join("") || '<div class="tpe-car"><em>Fahrzeuge folgen</em></div>'}</div>
      </div>`;
      const cd = document.getElementById("tpe-cd");
      const tick = () => {
        if (!document.body.contains(cd)) return clearInterval(ti);
        const rest = e.start - Date.now();
        if (rest <= 0) { cd.innerHTML = Date.now() < e.ende ? '<span class="tpe-live">● Läuft gerade</span>' : ""; return; }
        const t = Math.floor(rest / 864e5), h = Math.floor(rest / 36e5) % 24, m = Math.floor(rest / 6e4) % 60, sek = Math.floor(rest / 1e3) % 60;
        cd.innerHTML = [[t, "Tage"], [h, "Std"], [m, "Min"], [sek, "Sek"]].map(([v, l]) => `<div><b>${pad(v)}</b><small>${l}</small></div>`).join("");
      };
      const ti = setInterval(tick, 1000); tick();
    }).catch(() => { const el = document.getElementById("tp-event-box"); if (el) el.innerHTML = ""; });

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
    const tools = Object.keys(PANELS).filter(p => ME.panels[p] && p !== "garage61" && p !== "links");
    const link = (hid, icon, label) => `<a class="td-link${id === hid || (hid && id.startsWith(hid + "/")) ? " on" : ""}" href="#${hid}">${ICONS[icon]}<span>${esc(label)}</span></a>`;

    view.innerHTML = `
      <div class="td">
        <aside class="td-side">
          <nav class="td-nav" aria-label="Team-Menü">
            ${link("", "home", "Dashboard")}
            ${ME.panels.garage61 ? link("garage61", "garage61", "Garage 61") : ""}
            ${SECTIONS.map(s => link(s.id, s.icon, s.label)).join("")}
            ${ME.panels.links ? link("links", "link", "Links") : ""}
            <div class="td-nav-h">Tools</div>${link("abwesend", "clock", "Abwesenheiten")}${tools.map(p => link(p, p, PANELS[p].title)).join("")}
            ${ME.isAdmin ? `<div class="td-nav-h">Verwaltung</div>${link("aktivitaet", "activity", "Aktivität")}${link("nutzung", "eye", "Nutzung")}${link("limits", "gauge", "Limits")}${link("posts", "trophy", "Discord-Posts")}${link("news-schreiben", "news", "News schreiben")}${link("fahrerprofile", "helmet", "Fahrerprofile")}${link("kalender-admin", "calendar", "Rennkalender")}${link("admin", "admin", "Admin")}<a class="td-link" href="https://kreids888-admin.kreids.workers.dev/" target="_blank" rel="noopener">${ICONS.ext}<span>kreids888-Dashboard</span></a>` : ""}
          </nav>
        </aside>
        <div class="td-main" id="td-main"></div>
      </div>`;

    if (id !== "garage61" && id !== "woche") merke(id.startsWith("stint/") ? "stint" : id || "dashboard");
    if (id === "woche" && ME.panels.garage61) return renderG61("woche");
    if (id === "nutzung" && ME.isAdmin) return renderNutzung();
    if (id === "limits" && ME.isAdmin) return renderLimits();
    if (id === "admin" && ME.isAdmin) return renderAdmin();
    if (id === "posts" && ME.isAdmin) return renderPosts();
    if (id === "aktivitaet" && ME.isAdmin) return renderActivity();
    if (id === "news-schreiben" && ME.isAdmin) return renderNewsAdmin();
    if (id === "fahrerprofile" && ME.isAdmin) return renderProfilesAdmin();
    if (id === "kalender-admin" && ME.isAdmin) return renderKalenderAdmin();
    if (id === "news") return renderNews();
    if (id === "fahrer") return renderProfile();
    if (id === "abwesend") return renderAbwesend();
    if (id === "links" && ME.panels.links) return renderLinks();
    if (id === "garage61" && ME.panels.garage61) return renderG61();
    if (id === "trainer" && ME.panels.trainer && window.F2FTrainer)
      return window.F2FTrainer.mount(main(), { api, esc, toast, ICONS, panelHead, btn });
    if ((id === "stint" || id.startsWith("stint/")) && ME.panels.stint && window.F2FStint)
      return window.F2FStint.mount(main(), { api, esc, toast, ICONS, panelHead, btn, ME }, id.slice(6));
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

      ${ME.panels.garage61 ? `<div class="tp-widget wk-home" id="w-woche">
        <div class="tp-widget-h">${ICONS.activity}<b>Trainingswoche</b></div>
        <div class="tp-widget-f">Lädt …</div>
      </div>` : ""}

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
      </div>` : ""}
      <p class="nu-hint">Hinweis: Um das Dashboard zu verbessern, wird erfasst, welche Bereiche genutzt werden und was hier eingetragen wird. Gespeichert wird das 30 Tage.</p>`;

    if (ME.panels.garage61) api("/g61/woche").then(d => {
      const el = document.getElementById("w-woche");
      if (!el) return;
      if (!d.ready) { el.remove(); return; }
      el.innerHTML = `<div class="tp-widget-h">${ICONS.activity}<b>Trainingswoche · KW ${d.kwVorher}</b><a class="td-more" href="#woche">Wochenübersicht →</a></div>`
        + wocheKacheln(d, true) + wocheZiel(d);
    }).catch(() => { const el = document.getElementById("w-woche"); if (el) el.remove(); });

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
      </div>
      <div id="abw-box"></div>`;
    abwFormular(document.getElementById("abw-box"), () => renderProfile());
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

  /* ---------------- Abwesenheiten ---------------- */
  const GRUENDE = { urlaub: "🏖️ Im Urlaub", nv: "⛔ Nicht verfügbar", keinezeit: "⏳ Keine Zeit", sonst: "✏️ Sonstiges", keine: "🔒 Keine Angabe" };
  const wann = (ms) => new Date(ms).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + " Uhr";

  function abwFormular(el, nachher) {
    const heute = new Date().toLocaleDateString("sv-SE");
    el.innerHTML = `
      <div class="tm-box" style="margin-top:16px">
        <h5>Abwesenheit eintragen</h5>
        <p class="hint">Wird im Team-Discord gepostet und erscheint unter „Abwesenheiten". In Discord geht es auch mit <b>/abwesend</b>.</p>
        <div class="tm-row"><label for="ab-grund">Grund</label>
          <select class="tm-select" id="ab-grund">${Object.entries(GRUENDE).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
        <div class="tm-row"><label for="ab-text">Hinweis<small>optional</small></label><input class="tm-input" id="ab-text" maxlength="120" placeholder="z. B. Familienfeier, Spätschicht …"></div>
        <div class="tm-row"><div class="lbl">Von</div><div class="ka-when ab-when"><input class="tm-input" id="ab-vd" type="date" value="${heute}"><input class="tm-input" id="ab-vz" type="time" value="00:00"></div></div>
        <div class="tm-row"><div class="lbl">Bis</div><div class="ka-when ab-when"><input class="tm-input" id="ab-bd" type="date" value="${heute}"><input class="tm-input" id="ab-bz" type="time" value="23:59"></div></div>
        <div class="tm-actions">${btn("Eintragen", "red", 'id="ab-save"')}</div>
      </div>`;
    const b = document.getElementById("ab-save");
    b.onclick = async () => {
      const v = (id) => document.getElementById(id).value;
      b.disabled = true;
      try {
        const r = await api("/abwesend", { method: "POST", body: { grund: v("ab-grund"), text: v("ab-text"), von: v("ab-vd") + "T" + v("ab-vz"), bis: v("ab-bd") + "T" + v("ab-bz") } });
        toast(r.info, true); nachher();
      } catch (e) { toast(e.message); b.disabled = false; }
    };
  }

  async function renderAbwesend() {
    main().innerHTML = panelHead("clock", "Abwesenheiten") + '<div id="abw"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("abw");
    let d;
    try { d = await api("/abwesend"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    const now = Date.now();
    const zeile = (a) => `
      <div class="ab-row${a.von <= now ? " jetzt" : ""}">
        <span class="ab-dot"></span>
        <div class="ab-main"><b>${esc(a.name)}</b><small>${GRUENDE[a.grund] || ""}${a.text ? " · " + esc(a.text) : ""}</small></div>
        <div class="ab-zeit">${wann(a.von)}<br><span>bis</span> ${wann(a.bis)}</div>
        ${a.uid === d.me || ME.isAdmin ? btn("✕", "sm", `data-abdel="${a.id}" title="Löschen"`) : "<span></span>"}
      </div>`;
    const jetzt = d.list.filter(a => a.von <= now), bald = d.list.filter(a => a.von > now);
    box.innerHTML = `
      <div class="td-label" style="margin-top:0">Gerade abwesend</div>
      <div class="ta-list">${jetzt.length ? jetzt.map(zeile).join("") : '<p class="tm-muted" style="padding:14px 16px">🏁 Alle an Bord!</p>'}</div>
      <div class="td-label">Demnächst</div>
      <div class="ta-list">${bald.length ? bald.map(zeile).join("") : '<p class="tm-muted" style="padding:14px 16px">Nichts geplant.</p>'}</div>
      <div id="abw-form"></div>`;
    abwFormular(document.getElementById("abw-form"), () => renderAbwesend());
    box.querySelectorAll("[data-abdel]").forEach(b => b.onclick = async () => {
      if (!confirm("Abwesenheit löschen?")) return;
      try { const r = await api("/abwesend/delete", { method: "POST", body: { id: b.dataset.abdel } }); toast(r.info || "Gelöscht", r.ok !== false); renderAbwesend(); }
      catch (e) { toast(e.message); }
    });
  }

  /* ---------------- Discord-Posts aus Garage 61 (Admin) ---------------- */
  const POST_INFO = {
    rekord:   { t: "🏆 Neuer Teamrekord", h: "Wird ein Teamrekord gebrochen, kommt sofort ein Post mit alter und neuer Zeit und Abstand. Runden mit und ohne BoP werden getrennt gewertet und getrennt gepostet. Geprüft wird alle 10 Minuten (nachts Mo–Fr von 1 bis 6 Uhr alle 20).", wann: "sofort", abstand: true },
    buch:     { t: "📖 Rekordbuch", h: "Alle Teamrekorde der Rennstrecke, pro Auto und getrennt mit und ohne BoP. Kommt automatisch vor jedem Rennen aus dem Kalender, für die Strecke genau dieses Rennens.", wann: "rennen", abstand: true },
    besten:   { t: "📊 Bestenliste vor dem Rennen", h: "Die Besten des Teams auf der Strecke vom nächsten Rennen, mit Abstand zur Bestzeit.", wann: "tage", abstand: true, plaetze: true },
    karte:    { t: "👤 Fahrerkarte", h: "Bestzeiten pro Fahrer mit Abstand zum Teamrekord. Automatisch am 1. des Monats für jeden, der im Vormonat eine neue Bestzeit gefahren ist.", wann: "monat", abstand: true },
    monat:    { t: "📅 Monatsrückblick", h: "Gebrochene Rekorde, meiste Runden, größter Sprung und Fahrer des Monats. Automatisch am 1. des Monats.", wann: "monat" },
    konstanz: { t: "🎯 Konstanz-Wertung", h: "Wer fährt die gleichmäßigsten Runden? Saubere Runden der letzten 7 Tage, mindestens 10 auf einer Kombi.", wann: "woche", plaetze: true },
    vorb:     { t: "🏁 Rennvorbereitung", h: "Vor dem nächsten Rennen: wer schon auf der Strecke trainiert hat, wer noch nicht und wer am schnellsten ist.", wann: "tage" },
  };
  const WTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const ANZAHL = { buch: ["Fahrer pro Auto", "1 = nur Rekordhalter"], besten: ["Fahrer pro Auto", ""], karte: ["Strecken pro Karte", ""], monat: ["Fahrer pro Liste", "Rekorde, meiste Runden"], konstanz: ["Anzahl Fahrer", ""], vorb: ["Namen bei „schon trainiert“", "Rest als „+X weitere“"] };
  const PLATZHALTER = { rekord: "{strecke} {auto} {fahrer}", buch: "{strecke}", besten: "{strecke}", karte: "{fahrer}", monat: "{monat}", konstanz: "", vorb: "{strecke} {rennen}" };

  // Discord-Markdown (das Nötigste) für die Vorschau
  function dcMd(t) {
    let s = esc(t || "");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const out = [];
    let q = [];
    for (const z of s.split("\n")) {
      if (z.startsWith("&gt; ")) { q.push(z.slice(5)); continue; }
      if (q.length) { out.push(`<div class="dc-q">${q.join("<br>")}</div>`); q = []; }
      out.push(z);
    }
    if (q.length) out.push(`<div class="dc-q">${q.join("<br>")}</div>`);
    return out.join("<br>").replace(/<\/div><br>/g, "</div>");
  }

  function dcRender(r, roles) {
    if (!r.ok) return `<div class="dc-leer">${esc(r.info || "Keine Vorschau")}</div>`;
    const rolle = (id) => (roles.find(x => x.id === id) || {}).name || "Rolle";
    const content = r.content ? `<div class="dc-txt">${r.content.replace(/<@&(\d+)>/g, (_, id) => `<span class="dc-ping">@${esc(rolle(id))}</span>`)}</div>` : "";
    const embeds = (r.embeds || []).map(e => {
      const farbe = e.color != null ? "#" + Number(e.color).toString(16).padStart(6, "0") : "#1e1f22";
      const felder = (e.fields || []).map(f => `<div class="dc-f${f.inline ? " in" : ""}"><b>${dcMd(f.name === "​" ? "" : f.name)}</b><div>${dcMd(f.value)}</div></div>`).join("");
      const zeitTxt = e.timestamp ? new Date(e.timestamp).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
      return `<div class="dc-emb" style="border-left-color:${farbe}">
        <div class="dc-in">
          ${e.author ? `<div class="dc-au">${e.author.icon_url ? `<img src="${esc(e.author.icon_url)}" alt="">` : ""}${esc(e.author.name)}</div>` : ""}
          ${e.title ? `<div class="dc-ti">${dcMd(e.title)}</div>` : ""}
          ${e.description ? `<div class="dc-de">${dcMd(e.description)}</div>` : ""}
          ${felder ? `<div class="dc-fs">${felder}</div>` : ""}
          ${e.footer || zeitTxt ? `<div class="dc-fu">${e.footer ? esc(e.footer.text) : ""}${e.footer && zeitTxt ? " • " : ""}${zeitTxt}</div>` : ""}
        </div>
        ${e.thumbnail ? `<img class="dc-th" src="${esc(e.thumbnail.url)}" alt="">` : ""}
      </div>`;
    }).join("");
    return `<div class="dc-msg"><img class="dc-av" src="/team/bilder/f2f-logo.png" alt=""><div class="dc-body"><div class="dc-name">F2F Bot <span>APP</span> <i>Heute</i></div>${content}${embeds}</div></div>`;
  }

  async function renderPosts() {
    main().innerHTML = panelHead("trophy", "Discord-Posts", '<span class="tm-badge">Garage 61</span>') + '<div id="dp"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("dp");
    let d;
    try { d = await api("/admin/posts"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    const P = d.posts, db = d.db, roles = d.roles || [];
    const opts = (list, val) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? "selected" : ""}>${esc(l)}</option>`).join("");
    const kanal = (k) => `<select class="tm-select" data-k="${k}" data-f="channel"><option value="">Kanal wählen</option>${opts(d.channels.map(c => [c.id, "# " + c.name]), P[k].channel)}</select>`;
    const bopSel = (k) => `<select class="tm-select" data-k="${k}" data-f="bop">${opts([["aktuell", "📅 Aktuelle BoP (diese Season)"], ["allzeit", "📚 Allzeit (alle Seasons)"], ...(k === "karte" ? [] : [["beide", "Beides zeigen"]])], P[k].bop)}</select>`;
    const zahl = (k, f, lo, hi, nach) => `<input class="tm-input" type="number" data-k="${k}" data-f="${f}" min="${lo}" max="${hi}" value="${P[k][f]}" style="max-width:90px"> <span class="tm-muted">${nach}</span>`;
    const stunde = (k) => `<select class="tm-select" data-k="${k}" data-f="stunde" style="width:auto">${opts(Array.from({ length: 24 }, (_, h) => [h, String(h).padStart(2, "0") + ":00 Uhr"]), P[k].stunde)}</select>`;
    const sw = (k, f, label, an) => `<label class="tm-switch"><input type="checkbox" data-k="${k}" data-f="${f}" ${an ? "checked" : ""}><span class="s"></span>${label}</label>`;
    const wann = (k) => {
      const w = POST_INFO[k].wann;
      if (w === "sofort") return '<span class="tm-muted">sofort, sobald ein Rekord fällt</span>';
      if (w === "woche") return `<div style="display:flex;gap:8px;flex-wrap:wrap"><select class="tm-select" data-k="${k}" data-f="tag" style="width:auto">${opts(WTAGE.map((t, i) => [i + 1, t]), P[k].tag)}</select>${stunde(k)}</div>`;
      if (w === "tage") return zahl(k, "tage", 1, 14, "Tage vor dem Rennen");
      if (w === "rennen") return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${zahl(k, "tage", 1, 14, "Tag(e) vor jedem Rennen um")}${stunde(k)}</div>`;
      return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="tm-muted">am 1. um</span>${stunde(k)}</div>`;
    };
    const strecken = `<option value="">Strecke vom nächsten Rennen</option>${opts(db.strecken.map(s => [s.id, s.tn]), "")}`;
    const extra = (k) => {
      if (k === "buch" || k === "besten" || k === "vorb") return `<select class="tm-select" data-x="${k}" data-f="track" style="width:auto;max-width:100%">${strecken}</select>`;
      if (k === "karte") return `<select class="tm-select" data-x="${k}" data-f="fahrer" style="width:auto"><option value="">Alle mit neuer Bestzeit</option>${opts(db.fahrer.map(f => [f.d, f.n]), "")}</select><select class="tm-select" data-x="${k}" data-f="monat" style="width:auto">${opts([["vormonat", "Letzter Monat"], ["dieser", "Dieser Monat"]], "vormonat")}</select>`;
      if (k === "monat") return `<select class="tm-select" data-x="${k}" data-f="monat" style="width:auto">${opts([["vormonat", "Letzter Monat"], ["dieser", "Dieser Monat bis jetzt"]], "vormonat")}</select>`;
      return "";
    };
    const aussehen = (k) => {
      const x = P[k], t = x.teile || {}, i = POST_INFO[k];
      return `<details class="dp-anp"><summary>🎨 Aussehen anpassen</summary>
        <div class="tm-row"><label>Titel<small>leer = Standard${PLATZHALTER[k] ? " · Platzhalter: " + esc(PLATZHALTER[k]) : ""}</small></label>
          <div><input class="tm-input" data-k="${k}" data-f="titel" maxlength="120" value="${esc(x.titel)}" placeholder="Standard-Titel"></div></div>
        <div class="tm-row"><label>Ansage<small>optional, steht oben im Post</small></label>
          <div><textarea class="tm-input" data-k="${k}" data-f="text" rows="2" maxlength="600" placeholder="z. B. Starke Leistung, Jungs!">${esc(x.text)}</textarea></div></div>
        <div class="tm-row"><div class="lbl">Farbe<small>Balken links</small></div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <label class="tm-switch"><input type="checkbox" data-k="${k}" data-f="eigenfarbe" ${x.farbe ? "checked" : ""}><span class="s"></span>Eigene Farbe</label>
            <input type="color" class="dp-farbe" data-k="${k}" data-f="farbe" value="${esc(x.farbe || "#e11324")}"></div></div>
        <div class="tm-row"><div class="lbl">Rolle pingen</div>
          <div><select class="tm-select" data-k="${k}" data-f="ping"><option value="">niemanden pingen</option>${opts(roles.map(r => [r.id, "@" + r.name]), x.ping)}</select></div></div>
        ${ANZAHL[k] ? `<div class="tm-row"><div class="lbl">${esc(ANZAHL[k][0])}${ANZAHL[k][1] ? `<small>${esc(ANZAHL[k][1])}</small>` : ""}</div><div><input class="tm-input" type="number" data-k="${k}" data-f="plaetze" min="1" max="15" value="${x.plaetze}" style="max-width:90px"> <span class="tm-muted">1 bis 15</span></div></div>` : ""}
        <div class="tm-row"><div class="lbl">Bausteine</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${sw(k, "t:bop", "BOP-Angaben (⚖️)", t.bop !== false)}
            ${i.abstand ? sw(k, "t:abstand", "Abstand zur Bestzeit", t.abstand !== false) : ""}
            ${sw(k, "t:link", "Link zu Garage 61", t.link !== false)}
            ${sw(k, "t:fuss", "Fußzeile mit Datum", t.fuss !== false)}
          </div></div>
      </details>`;
    };
    const r = d.rennen;
    const rennTxt = r ? `${esc(r.title)} am ${fmtDate(new Date(r.at).toISOString())}${r.track ? " · " + esc(r.track) : ""} → ${r.strecke ? "<b>" + esc(r.strecke) + "</b>" : '<span class="tm-err">noch keine Runden auf dieser Strecke</span>'}` : "kein Rennen im Kalender";

    box.innerHTML = `
      <div class="tm-box">
        <h5>Rekord-Datenbank</h5>
        <p class="hint">Holt die Rundenzeiten aus Garage 61 (alle 10 Minuten, nachts Mo–Fr von 1 bis 6 Uhr alle 20 · nur Strecken mit neuen Runden). Alle Posts, die Bestenliste und die Startseite lesen daraus.</p>
        <div class="tm-status" style="margin-top:14px">
          <div class="tm-stat"><span class="tm-dot ${d.ready && !db.fehler ? "" : "off"}"></span><div><b>${db.kombis} Strecke/Auto-Kombis</b><div class="tm-muted">${db.offen ? db.offen + " warten noch" : "alles aktuell"}${db.lauf ? " · Stand " + fmtDate(db.lauf) : ""}</div></div></div>
          <div class="tm-stat"><span class="tm-dot ${r && r.strecke ? "" : "off"}"></span><div><b>Nächstes Rennen</b><div class="tm-muted">${rennTxt}</div></div></div>
        </div>
        ${!d.ready ? '<p class="tm-err" style="margin-top:12px">Garage 61 ist noch nicht eingerichtet (Schlüssel und Team unter Admin).</p>' : ""}
        ${db.fehler ? `<p class="tm-err" style="margin-top:12px">Letzter Fehler (${fmtDate(db.fehlerAt)}): ${esc(db.fehler)}</p>` : ""}
        ${db.bremse ? `<p class="tm-muted" style="margin-top:8px">Letzte Bremse von Garage 61 (${fmtDate(db.bremse.at)} · ${esc(db.bremse.path)}): ${esc(db.bremse.hdr || "keine Limit-Angaben mitgeschickt")}</p>` : ""}
        ${db.umbau ? `<p class="tm-muted" style="margin-top:8px">🔄 Bestzeiten werden neu geprüft – noch ${db.offen} Kombis offen. Bis dahin keine Rekord-Posts.</p>` : ""}
        ${db.voll ? `<p class="tm-muted" style="margin-top:8px">Hinweis (${fmtDate(db.voll)}): Garage 61 hat bei einer Kombi das Maximum von 300 Runden geliefert – ältere Runden könnten fehlen.</p>` : ""}
        ${db.kontingent ? `<p class="tm-muted" style="margin-top:8px">laps-Kontingent: <b>${esc(String(db.kontingent.rest))}</b> übrig (Stand ${fmtDate(db.kontingent.at)})${db.kontingent.hdr ? " · " + esc(db.kontingent.hdr) : ""}</p>` : ""}
        <div class="tm-actions" style="margin-top:12px">${btn("Daten holen", "sm", 'id="dp-scan"')}</div>
      </div>
      ${Object.keys(POST_INFO).map(k => `
      <div class="tm-box" id="dp-${k}">
        <h5>${esc(POST_INFO[k].t)}</h5>
        <p class="hint">${esc(POST_INFO[k].h)}</p>
        <div class="tm-row"><div class="lbl">Automatisch</div>${sw(k, "on", "An", P[k].on)}</div>
        <div class="tm-row"><div class="lbl">Discord-Kanal</div><div>${kanal(k)}</div></div>
        ${"bop" in P[k] ? `<div class="tm-row"><div class="lbl">Wertung<small>wird im Post angezeigt</small></div><div>${bopSel(k)}</div></div>` : ""}
        <div class="tm-row"><div class="lbl">Wann</div><div>${wann(k)}</div></div>
        ${aussehen(k)}
        <div class="tm-row"><div class="lbl">Vorschau<small>live, wird nicht gepostet</small></div>
          <div><div class="tm-actions" style="flex-wrap:wrap;margin-bottom:10px">${extra(k)}${btn("Jetzt senden", "sm red", `data-send="${k}"`)}</div>
          <div class="dc-wrap" data-prev="${k}"><div class="dc-leer">Lädt …</div></div>
          <p class="tm-muted" style="margin-top:8px">Zuletzt gesendet: ${d.last[k] ? fmtDate(d.last[k].at) + " · " + esc(d.last[k].info) : "noch nie"}</p></div></div>
      </div>`).join("")}
      <div class="tm-savebar" id="dp-bar"><span>Alles gespeichert</span>${btn("Speichern", "red", 'id="dp-save"')}</div>`;

    let dirty = false;
    const markDirty = () => { dirty = true; const b = document.getElementById("dp-bar"); b.classList.add("dirty"); b.querySelector("span").textContent = "Ungespeicherte Änderungen"; };

    // Einstellungen eines Posts aus dem Formular lesen
    const lesen = (k) => {
      const o = JSON.parse(JSON.stringify(P[k]));
      o.teile = { ...(o.teile || {}) };
      let eigen = false, farbe = "";
      box.querySelectorAll(`[data-k="${k}"]`).forEach(el => {
        const f = el.dataset.f;
        if (f === "eigenfarbe") { eigen = el.checked; return; }
        if (f === "farbe") { farbe = el.value; return; }
        if (f.startsWith("t:")) { o.teile[f.slice(2)] = el.checked; return; }
        o[f] = el.type === "checkbox" ? el.checked : (["channel", "bop", "titel", "text", "ping"].includes(f) ? el.value : Number(el.value));
      });
      o.farbe = eigen ? farbe : "";
      return o;
    };
    const sammeln = () => Object.fromEntries(Object.keys(POST_INFO).map(k => [k, lesen(k)]));
    const speichern = async () => { await api("/admin/posts", { method: "POST", body: { posts: sammeln() } }); dirty = false; };

    // Live-Vorschau (nacheinander laden, damit Garage 61 nicht überrannt wird)
    const prevT = {}, prevNr = {};
    const vorschau = async (k) => {
      const ziel = box.querySelector(`[data-prev="${k}"]`);
      const body = { art: k, pc: lesen(k) };
      box.querySelectorAll(`[data-x="${k}"]`).forEach(el => { body[el.dataset.f] = el.value; });
      const nr = (prevNr[k] || 0) + 1; prevNr[k] = nr;
      ziel.classList.add("laedt");
      try {
        const x = await api("/admin/posts/vorschau", { method: "POST", body });
        if (prevNr[k] === nr) ziel.innerHTML = dcRender(x, roles);
      } catch (e) { if (prevNr[k] === nr) ziel.innerHTML = `<div class="dc-leer">${esc(e.message)}</div>`; }
      ziel.classList.remove("laedt");
    };
    const spaeter = (k) => { clearTimeout(prevT[k]); prevT[k] = setTimeout(() => vorschau(k), 500); };
    box.querySelectorAll("[data-k]").forEach(el => {
      const k = el.dataset.k;
      el.addEventListener("input", () => { markDirty(); spaeter(k); });
      el.addEventListener("change", () => { markDirty(); spaeter(k); });
    });
    box.querySelectorAll("[data-x]").forEach(el => el.addEventListener("change", () => spaeter(el.dataset.x)));
    (async () => { for (const k of Object.keys(POST_INFO)) await vorschau(k); })();

    const sb = document.getElementById("dp-save");
    sb.onclick = async () => {
      sb.disabled = true;
      try { await speichern(); toast("Gespeichert", true); renderPosts(); }
      catch (e) { toast(e.message); sb.disabled = false; }
    };
    const sc = document.getElementById("dp-scan");
    sc.onclick = async () => {
      sc.disabled = true;
      try { const x = await api("/admin/posts/scan", { method: "POST" }); toast(x.info || "Erledigt", x.ok); renderPosts(); }
      catch (e) { toast(e.message); sc.disabled = false; }
    };
    box.querySelectorAll("[data-send]").forEach(b => b.onclick = async () => {
      const k = b.dataset.send, body = { art: k };
      box.querySelectorAll(`[data-x="${k}"]`).forEach(el => { body[el.dataset.f] = el.value; });
      b.disabled = true;
      try {
        if (dirty) await speichern();
        const x = await api("/admin/posts/send", { method: "POST", body });
        toast(x.info || "Erledigt", x.ok);
        b.disabled = false;
      } catch (e) { toast(e.message); b.disabled = false; }
    });
  }

  /* ---------------- Rennkalender + Discord-Events (Admin) ---------------- */
  async function renderKalenderAdmin() {
    main().innerHTML = panelHead("calendar", "Rennkalender", '<span class="tm-badge">Nur Admin</span>') + '<div id="ka"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("ka");
    let d;
    try { d = await api("/admin/kalender"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    const tag = (iso) => new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
    const heute = new Date().toISOString().slice(0, 10);
    box.innerHTML = `
      <p class="tm-muted" style="margin-bottom:12px">Alle kommenden Termine aus deinem Rennkalender (<a class="ka-link" href="https://kreids888-admin.kreids.workers.dev/" target="_blank" rel="noopener">kreids888-Dashboard</a>) und deine eigenen F2F-Einträge. Mit einem Klick legt der Bot daraus ein Discord-Event auf dem F2F-Server an.</p>
      <div class="ta-list ka-list">${d.entries.length ? d.entries.map(e => `
        <div class="ka-row" data-key="${esc(e.key)}">
          <div class="ka-date"><b>${tag(e.at)}</b><small>${esc(e.time || "")} Uhr</small></div>
          <div class="ka-main"><b>${esc(e.title)}</b><small>${esc([e.type, e.track, e.quelle === "eigen" ? "eigener Eintrag" : "aus dem Rennkalender"].filter(Boolean).join(" · "))}</small></div>
          <div class="ka-act">
            ${e.eventId
              ? `<a class="tm-badge live" href="https://discord.com/events/${d.guild}/${e.eventId}" target="_blank" rel="noopener">✓ Discord-Event</a>${btn("Event löschen", "sm", 'data-kev="del"')}`
              : btn(ICONS.discord + " Als Discord-Event", "sm red", 'data-kev="add"')}
            ${e.quelle === "eigen" ? btn("✕", "sm", 'data-kdel="1" title="Eintrag löschen"') : ""}
          </div>
        </div>`).join("") : '<p class="tm-muted" style="padding:16px">Keine kommenden Termine.</p>'}</div>

      <div class="tm-box" style="margin-top:16px">
        <h5>Eigener Eintrag</h5>
        <p class="hint">Für Trainings, Meetings oder Rennen, die nicht in deinem Rennkalender stehen.</p>
        <div class="tm-row"><label for="ke-title">Titel</label><input class="tm-input" id="ke-title" maxlength="100" placeholder="z. B. Teamtraining Spa"></div>
        <div class="tm-row"><div class="lbl">Wann</div><div class="ka-when">
          <input class="tm-input" id="ke-date" type="date" value="${heute}">
          <input class="tm-input" id="ke-time" type="time" value="20:00">
          <select class="tm-select" id="ke-dauer">${[0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 24].map(h => `<option value="${h}" ${h === 2 ? "selected" : ""}>${String(h).replace(".", ",")} Std.</option>`).join("")}</select>
        </div></div>
        <div class="tm-row"><label for="ke-type">Typ</label><select class="tm-select" id="ke-type">${["Training", "Rennen", "Meeting", "Termin"].map(t => `<option>${t}</option>`).join("")}</select></div>
        <div class="tm-row"><label for="ke-track">Strecke / Ort<small>optional</small></label><input class="tm-input" id="ke-track" maxlength="100" placeholder="z. B. Spa-Francorchamps"></div>
        <div class="tm-row"><label for="ke-desc">Beschreibung<small>optional</small></label><textarea class="tm-input tm-area" id="ke-desc" maxlength="900" rows="3"></textarea></div>
        <div class="tm-row"><div class="lbl">Discord</div><label class="tm-switch"><input type="checkbox" id="ke-dc" checked><span class="s"></span>Gleich als Discord-Event anlegen</label></div>
        <div class="tm-actions">${btn("Eintrag speichern", "red", 'id="ke-save"')}</div>
      </div>`;

    const call = async (b, path, body) => {
      b.disabled = true;
      try { const r = await api(path, { method: "POST", body }); toast(r.info || "Erledigt", r.ok !== false); renderKalenderAdmin(); }
      catch (e) { toast(e.message); b.disabled = false; }
    };
    box.querySelectorAll("[data-kev]").forEach(b => b.onclick = () => {
      const key = b.closest(".ka-row").dataset.key;
      if (b.dataset.kev === "del" && !confirm("Discord-Event wirklich löschen?")) return;
      call(b, b.dataset.kev === "del" ? "/admin/kalender/event/delete" : "/admin/kalender/event", { key });
    });
    box.querySelectorAll("[data-kdel]").forEach(b => b.onclick = () => {
      if (!confirm("Eigenen Eintrag löschen? Ein Discord-Event dazu wird mit gelöscht.")) return;
      call(b, "/admin/kalender/eigen/delete", { key: b.closest(".ka-row").dataset.key });
    });
    const sv = document.getElementById("ke-save");
    sv.onclick = () => call(sv, "/admin/kalender/eigen", {
      title: document.getElementById("ke-title").value, date: document.getElementById("ke-date").value,
      time: document.getElementById("ke-time").value, dauer: Number(document.getElementById("ke-dauer").value),
      type: document.getElementById("ke-type").value, track: document.getElementById("ke-track").value,
      desc: document.getElementById("ke-desc").value, discord: document.getElementById("ke-dc").checked,
    });
  }

  /* ---------------- Links ---------------- */
  const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };

  async function renderLinks() {
    main().innerHTML = panelHead("link", "Links") + '<div id="lk"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    if (ME.isAdmin) document.querySelector(".td-head").insertAdjacentHTML("beforeend", `<a class="tm-btn sm" href="#admin"><span>Links bearbeiten</span></a>`);
    const box = document.getElementById("lk");
    let d;
    try { d = await api("/links"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    box.innerHTML = d.links.length ? `<div class="lk-grid">${d.links.map(l => `
      <a class="lk-card" href="${esc(l.url)}" target="_blank" rel="noopener">
        <span class="lk-ic">${esc((l.title || "?").charAt(0).toUpperCase())}</span>
        <span class="lk-txt"><b>${esc(l.title)}</b>${l.desc ? `<small>${esc(l.desc)}</small>` : ""}<em>${esc(domain(l.url))}</em></span>
        <span class="lk-go">${ICONS.ext}</span>
      </a>`).join("")}</div>` : '<div class="tm-box tm-soon"><div class="big">Noch leer</div><p>Hier erscheinen wichtige Links fürs Team.</p></div>';
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

  /* ---------------- Wochenübersicht (Garage 61) ---------------- */
  const fmtH = (s) => {
    s = Math.round(s || 0);
    const H = Math.floor(s / 3600), M = Math.round((s % 3600) / 60);
    return H ? `${H} h ${String(M).padStart(2, "0")}` : `${M} min`;
  };
  const zahlDE = (n) => Number(n || 0).toLocaleString("de-DE");
  const trend = (diff, txt) => `<span class="wk-tr ${diff > 0 ? "up" : diff < 0 ? "down" : ""}">${diff > 0 ? "▲ " : diff < 0 ? "▼ " : ""}${txt}</span>`;
  const kachel = (label, wert, unten) => `<div class="wk-tile"><small>${label}</small><b>${wert}</b>${unten}</div>`;

  // Kacheln: letzte abgeschlossene Woche – öffentlich (3) oder intern (4)
  function wocheKacheln(d, intern) {
    const j = d.vorher, v = d.vorvorher, kv = "KW " + d.kwVorvorher;
    const rTrend = !v.laps ? trend(0, j.laps ? "–" : "keine Runden") : (() => { const p = Math.round((j.laps - v.laps) / v.laps * 100); return trend(p, `${Math.abs(p)} % zur ${kv}`); })();
    const da = j.active - v.active;
    const aTrend = da ? trend(da, `${da > 0 ? "+" : "−"}${Math.abs(da)} zur ${kv}`) : trend(0, `wie ${kv}`);
    const jetzt = `<div class="wk-now"><b>Diese Woche (KW ${d.kw}) bisher:</b> ${zahlDE(d.jetzt.laps)} Runden · ${fmtH(d.jetzt.time)} · ${d.jetzt.active} Fahrer</div>`;
    if (!intern) return `<div class="wk-tiles">
      ${kachel("Runden gefahren", zahlDE(j.laps), rTrend)}
      ${kachel("Zeit auf der Strecke", fmtH(j.time), `<span class="wk-tr">≈ ${fmtH(j.time / 7)} pro Tag</span>`)}
      ${kachel("Fahrer im Training", j.active, aTrend)}
    </div>${jetzt}`;
    const dt = j.time - v.time;
    const sj = j.laps ? Math.round(j.clean / j.laps * 100) : 0, sv = v.laps ? Math.round(v.clean / v.laps * 100) : 0;
    return `<div class="wk-tiles">
      ${kachel("Runden", zahlDE(j.laps), rTrend)}
      ${kachel("Zeit auf der Strecke", fmtH(j.time), dt ? trend(dt, `${fmtH(Math.abs(dt))} zur ${kv}`) : trend(0, `wie ${kv}`))}
      ${kachel("Fahrer aktiv", `${j.active} / ${d.mitglieder}`, aTrend)}
      ${kachel("Saubere Runden", j.laps ? sj + " %" : "–", j.laps && v.laps && sj !== sv ? trend(sj - sv, `${Math.abs(sj - sv)} % zur ${kv}`) : trend(0, j.laps && v.laps ? `wie ${kv}` : "–"))}
    </div>${jetzt}`;
  }

  function wocheZiel(d) {
    if (!d.ziel) return "";
    const p = Math.min(100, Math.round(d.jetzt.laps / d.ziel * 100));
    const rest = 7 - d.tage;
    const info = d.jetzt.laps >= d.ziel ? "Ziel erreicht ✓" : rest > 0 ? `noch ${rest} ${rest === 1 ? "Tag" : "Tage"}` : "letzter Tag";
    return `<div class="wk-goal${d.jetzt.laps >= d.ziel ? " done" : ""}">
      <div class="wk-goal-t"><b>Wochenziel: ${zahlDE(d.ziel)} Runden</b><span>${zahlDE(d.jetzt.laps)} / ${zahlDE(d.ziel)} · ${info}</span></div>
      <div class="wk-goal-bar"><i style="width:${p}%"></i></div>
    </div>`;
  }


  /* ---------------- Nutzung (nur Admin) ---------------- */
  const BEREICHE = {
    dashboard: "Dashboard", news: "Team News", fahrer: "Fahrerprofil", abwesend: "Abwesenheiten", links: "Links", trainer: "Trainer", stint: "Stintplaner",
    "g61-woche": "Wochenübersicht", "g61-fleiss": "Trainingsfleiß", "g61-trips": "Fahrtenbuch", "g61-board": "Bestenliste", "g61-ratings": "iRating", "g61-rennen": "Nächstes Rennen", "g61-training": "Training", "g61-bestzeiten": "Bestzeiten",
    aktivitaet: "Aktivität", "news-schreiben": "News schreiben", fahrerprofile: "Fahrerprofile", "kalender-admin": "Rennkalender", admin: "Admin",
  };
  const fmtWann = (ms) => {
    const min = Math.floor((Date.now() - ms) / 6e4);
    if (min < 1) return "gerade eben";
    if (min < 60) return `vor ${min} Min.`;
    if (min < 360) return `vor ${Math.floor(min / 60)} Std.`;
    return fmtDate(new Date(ms).toISOString());
  };

  async function renderNutzung() {
    main().innerHTML = panelHead("eye", "Dashboard-Nutzung", '<span class="tm-badge">Nur Admin</span>') + '<div id="nu"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("nu");
    let d;
    try { d = await api("/admin/usage"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }

    const head = `<div class="nu-row ta-head"><span></span><span>Mitglied</span><span class="r-al">Besuche 7 T.</span><span class="r-al">Besuche ${d.tage} T.</span><span>Meistgenutzt</span><span class="r-al">Zuletzt</span></div>`;
    const rows = d.leute.map(u => `
      <div class="nu-row">
        ${u.avatar ? `<img class="ta-ava" src="${esc(u.avatar)}" alt="" loading="lazy">` : '<span class="ta-ava"></span>'}
        <div class="ta-name"><b>${esc(u.name)}</b></div>
        <div class="ta-num"><b>${u.v7}</b><small>7 Tage</small></div>
        <div class="ta-num"><b>${u.v30}</b><small>${d.tage} Tage</small></div>
        <div class="nu-tags">${u.bereiche.length ? u.bereiche.map(b => `<span class="nu-tag">${esc(BEREICHE[b.id] || b.id)}<b>${b.n}</b></span>`).join("") : '<span class="tm-muted">–</span>'}</div>
        <div class="ta-last">${u.last ? fmtWann(Date.parse(u.last)) : "nie"}</div>
      </div>`).join("");
    const log = d.verlauf.map(a => `
      <div class="nu-log-row"><span class="t">${fmtWann(a.t)}</span><b>${esc(a.name)}</b><span>${esc(a.a)}</span></div>`).join("");

    box.innerHTML = `
      <div class="tm-box ta-top">
        <div>
          <div class="ta-upd">Wer nutzt das Dashboard – und wofür?</div>
          <div class="tm-muted">Gezählt werden geöffnete Bereiche und Aktionen · gespeichert ${d.tage} Tage · ein Besuch = einmal Dashboard öffnen</div>
        </div>
        <div class="tm-actions">${btn("Jetzt aktualisieren", "sm", 'id="nu-run"')}</div>
      </div>
      <div class="ta-list">${d.leute.length ? head + rows : '<p class="tm-muted" style="padding:16px">Noch keine Daten – sobald jemand das Dashboard nutzt, erscheint er hier.</p>'}</div>
      <div class="tm-box" style="margin-top:16px">
        <h5>Letzte Aktionen</h5>
        <div class="nu-log">${log || '<p class="tm-muted">Noch keine Aktionen.</p>'}</div>
      </div>`;
    document.getElementById("nu-run").onclick = renderNutzung;
  }

  /* ---------------- Cloudflare-Limits (nur Admin) ---------------- */
  async function renderLimits() {
    main().innerHTML = panelHead("gauge", "Cloudflare-Limits", '<span class="tm-badge">Nur Admin</span>') + '<div id="li"><div class="tm-loading"><span></span><span></span><span></span></div></div>';
    const box = document.getElementById("li");
    let d;
    try { d = await api("/admin/limits"); } catch (e) { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; return; }
    if (!d.ready) {
      box.innerHTML = `<div class="tm-box tm-soon"><div class="big">Keine Daten</div><p class="tm-err">${esc(d.info || "Unbekannter Fehler")}</p><div class="tm-actions" style="justify-content:center;margin-top:18px">${btn("Nochmal versuchen", "sm", 'id="li-run"')}</div></div>`;
      document.getElementById("li-run").onclick = renderLimits;
      return;
    }
    const zahl = (n) => Number(n || 0).toLocaleString("de-DE");
    const farbe = (p) => p >= 90 ? "rot" : p >= 70 ? "gelb" : "";
    box.innerHTML = `
      <div class="tm-box ta-top">
        <div>
          <div class="ta-upd">Stand: <b>${fmtDate(d.at)}</b></div>
          <div class="tm-muted">Gilt für dein ganzes Cloudflare-Konto (alle Worker zusammen) · setzt sich täglich um <b>${esc(d.reset)} Uhr</b> zurück · Cloudflare liefert die Zahlen mit ein paar Minuten Verzögerung</div>
        </div>
        <div class="tm-actions">${btn("Jetzt aktualisieren", "sm", 'id="li-run"')}<a class="tm-btn sm" href="#admin"><span>Warnung einstellen</span></a></div>
      </div>
      <div class="ta-list">${d.metrics.map(m => `
        <div class="li-row ${farbe(m.pct)}">
          <b class="li-lbl">${esc(m.label)}</b>
          <div class="li-bar"><i style="width:${Math.min(100, m.pct)}%"></i></div>
          <div class="li-num"><b>${zahl(m.used)}</b> / ${zahl(m.limit)}</div>
          <div class="li-pct">${String(m.pct).replace(".", ",")} %</div>
        </div>`).join("")}</div>
      <div class="ta-legend" style="margin-top:10px"><span class="aktiv">Grün</span> unter 70 % <span class="ruhig">Gelb</span> ab 70 % <span class="inaktiv">Rot</span> ab 90 %</div>`;
    document.getElementById("li-run").onclick = renderLimits;
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

  const G61_ALT = { woche: "training", fleiss: "training", trips: "training", board: "bestzeiten" };
  async function renderG61(tab, days) {
    tab = G61_ALT[tab] || tab || "rennen";
    merke("g61-" + tab);
    days = days || 7;
    main().innerHTML = panelHead("garage61", "Garage 61") + `
      <div class="g6-tabs">${[["rennen", "Nächstes Rennen"], ["training", "Training"], ["bestzeiten", "Bestzeiten"], ["ratings", "iRating"]].map(([k, t]) => `<button type="button" data-tab="${k}" class="${tab === k ? "on" : ""}">${t}</button>`).join("")}</div>
      <div id="g61b"><div class="tm-loading"><span></span><span></span><span></span></div></div>`;
    main().querySelectorAll("[data-tab]").forEach(b => b.onclick = () => renderG61(b.dataset.tab, days));
    if (tab === "training") return renderTraining(days);
    if (tab === "bestzeiten") return renderBestzeiten();
    if (tab === "ratings") return renderRatings();
    return renderRennen();
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

  /* ---------------- Garage 61: Hilfen ---------------- */
  const vorTagen = (day) => {
    if (!day) return "–";
    const j = new Date(), h = Date.UTC(j.getFullYear(), j.getMonth(), j.getDate());
    const t = Math.round((h - Date.parse(String(day).slice(0, 10))) / 864e5);
    return t <= 0 ? "heute" : t === 1 ? "gestern" : `vor ${t} Tagen`;
  };
  const kurzStrecke = (s) => String(s || "").split(" (")[0].replace(/ – .*/, "");
  const bopTag = (g) => g === "m" ? '<span class="tm-bop" title="Mit BoP gefahren">BOP</span>' : '<span class="gr-ohne" title="Ohne BoP gefahren">ohne BoP</span>';
  const g61Fehler = (box, e) => { box.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}${/404/.test(e.message) ? " – ist der Worker schon aktualisiert?" : ""}</div>`; };
  const g61Leer = (box) => { box.innerHTML = '<div class="tm-box tm-soon"><div class="big">Noch nicht verbunden</div><p>Garage 61 ist noch nicht eingerichtet.</p></div>'; };

  /* ---------------- Garage 61: Nächstes Rennen ---------------- */
  async function renderRennen() {
    const box = document.getElementById("g61b");
    let d;
    try { d = await api("/g61/rennen"); } catch (e) { return g61Fehler(box, e); }
    if (!d.ready) return g61Leer(box);
    if (!d.rennen.length) { box.innerHTML = '<div class="tm-box tm-soon"><div class="big">Kein Rennen geplant</div><p>Im Rennkalender steht gerade kein kommendes Rennen.</p></div>'; return; }
    let sel = 0;
    const zeige = () => {
      const r = d.rennen[sel];
      const wann = new Date(r.at).toLocaleString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      const tage = Math.round((r.at - Date.now()) / 864e5);
      const zeilen = r.fahrer.map(f => f.zeilen.map((z, i) => `
          <tr class="${i ? "sub" : ""}">
            <td class="n">${i ? "" : `<b>${esc(f.n)}</b>`}</td>
            <td>${esc(z.car)}${r.mehrere ? `<small>${esc(z.tn)}</small>` : ""}</td>
            <td class="r-al g6-n">${z.laps}</td>
            <td class="gr-wann">${vorTagen(z.last)}</td>
            <td class="r-al">${z.best ? `<span class="t">${fmtLap(z.best.t)}</span>${bopTag(z.best.bop)}${z.best.saison ? "" : "<small>ältere Season</small>"}` : '<span class="tm-muted">noch keine Zeit</span>'}</td>
            <td class="r-al g">${z.best ? (z.gap ? "+" + z.gap.toFixed(3) : '<span class="gr-top">schnellste</span>') : ""}</td>
          </tr>`).join("")).join("");
      box.innerHTML = `
        ${d.rennen.length > 1 ? `<div class="g6-bar"><div class="g6-range">${d.rennen.map((x, i) => `<button type="button" data-r="${i}" class="${i === sel ? "on" : ""}">${new Date(x.at).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })} · ${esc(kurzStrecke(x.strecken[0] || x.track || x.title))}</button>`).join("")}</div></div>` : ""}
        <div class="tm-box">
          <h5>${esc(r.title)}</h5>
          <p class="tm-muted">${esc(r.strecken.join(" · ") || r.track || "Strecke nicht gefunden")} · ${wann} Uhr · ${tage <= 0 ? "heute" : "in " + tage + (tage === 1 ? " Tag" : " Tagen")}</p>
          <div class="g6-kpis gr-kpis">
            <div><b>${r.fahrer.length} / ${r.mitglieder}</b><span>schon trainiert</span></div>
            <div><b>${zahlDE(r.laps)}</b><span>Runden auf der Strecke</span></div>
            <div><b>${r.schnell ? fmtLap(r.schnell.t) : "–"}</b><span>${r.schnell ? "Schnellster: " + esc(r.schnell.n) + (r.schnell.bop === "m" ? " · mit BoP" : " · ohne BoP") : "noch keine Zeit"}</span></div>
          </div>
        </div>
        ${r.fahrer.length ? `<div class="tm-board"><div class="tm-tbl-wrap"><table class="tm-tbl gr-tbl">
          <tr class="th"><td>Fahrer</td><td>Auto</td><td class="r-al">Runden</td><td>Zuletzt</td><td class="r-al">Bestzeit</td><td class="r-al">Abstand</td></tr>
          ${zeilen}
        </table></div></div>` : '<div class="tm-box tm-soon"><p>Auf dieser Strecke ist in den letzten 30 Tagen noch niemand gefahren.</p></div>'}
        ${r.nicht.length ? `<div class="tm-box gr-nicht"><h5>Noch nicht für dieses Rennen gefahren</h5>
          ${r.nicht.map(x => `<div class="gr-n-row"><b>${esc(x.n)}</b><span>${x.zuletzt ? `fährt: ${esc(kurzStrecke(x.zuletzt.tn))} · ${esc(x.zuletzt.car)} · ${vorTagen(x.zuletzt.day)}` : "seit 30 Tagen nichts gefahren"}</span></div>`).join("")}
        </div>` : ""}
        <p class="tm-muted">Runden der letzten 30 Tage · Bestzeit aus der aktuellen Season · Abstand zum Schnellsten mit gleicher Wertung (mit/ohne BoP) · Stand ${fmtDate(d.at)}${d.umbau ? " · Bestzeiten werden gerade neu geprüft, einzelne Zeiten können noch fehlen" : ""}</p>`;
      box.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { sel = Number(b.dataset.r); zeige(); });
    };
    zeige();
  }

  /* ---------------- Garage 61: Training ---------------- */
  const TR = { art: "t", ansicht: "strecke" };
  const istRennen = (s) => s === 2 || s === 3;
  const fahrten = (rows) => {
    const m = new Map();
    for (const r of rows) {
      const k = r.d + "|" + r.u + "|" + r.t + "|" + r.c;
      const x = m.get(k) || { d: r.d, u: r.u, t: r.t, c: r.c, l: 0, z: 0, s: [] };
      x.l += r.l; x.z += r.z;
      if (!x.s.includes(r.s)) x.s.push(r.s);
      m.set(k, x);
    }
    return [...m.values()].sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : b.z - a.z);
  };

  async function renderTraining(days) {
    const box = document.getElementById("g61b");
    let w, d;
    try { [w, d] = await Promise.all([api("/g61/woche").catch(() => null), api("/g61/training?tage=" + days)]); } catch (e) { return g61Fehler(box, e); }
    if (!d.ready) return g61Leer(box);
    const F = new Map(d.fahrer.map(f => [f.u, f]));
    const name = (u) => (F.get(u) || {}).n || u;
    const W = w && w.ready && Array.isArray(w.wochen) ? w.wochen : [];
    const wmax = Math.max(1, ...W.map(x => x.laps)), L0 = W.length - 1;
    const chart = W.length ? `<div class="tm-box">
        <h5>Wochenverlauf <span class="tm-muted" style="letter-spacing:0;text-transform:none;font-family:var(--body);font-weight:500">Runden pro Woche, alle Fahrten</span></h5>
        <div class="wk-chart">${W.map((x, i) => `<div class="wk-col${i === L0 ? " now" : ""}" title="KW ${x.kw} · ${zahlDE(x.laps)} Runden · ${fmtH(x.time)}"><span>${zahlDE(x.laps)}</span><i style="height:${Math.round(x.laps / wmax * 100)}%"></i></div>`).join("")}</div>
        <div class="wk-kw">${W.map((x, i) => `<span class="${i === L0 ? "now" : ""}">KW ${x.kw}${i === L0 ? " · läuft" : ""}</span>`).join("")}</div>
        ${wocheZiel(w)}
      </div>` : "";
    const knopf = (attr, wert, aktiv, text) => `<button type="button" ${attr}="${wert}" class="${aktiv ? "on" : ""}">${text}</button>`;
    const pct = (a, b) => b ? Math.round(a / b * 100) + " %" : "–";
    const fahrtTab = (liste, mitFahrer) => `<div class="tm-tbl-wrap"><table class="tm-tbl g6-trips">${liste.map(x => `<tr>
        <td class="d0">${fmtDay(x.d)}</td>
        <td class="${mitFahrer ? "n" : "g6-track"}">${mitFahrer ? `<b>${esc(name(x.u))}</b>` : `${esc(d.strecken[x.t])} · ${esc(d.autos[x.c])}`}</td>
        <td>${x.s.sort().map(ty => `<span class="g6-type t${ty}">${TYPE_SHORT[ty] || "Training"}</span>`).join("")}</td>
        <td class="r-al g6-n">${x.l} Rd.</td>
        <td class="r-al g6-n">${fmtHours(x.z)}</td></tr>`).join("")}</table></div>`;

    const zeichne = () => {
      const rows = d.rows.filter(r => TR.art === "a" || (TR.art === "r" ? istRennen(r.s) : !istRennen(r.s)));
      const sum = rows.reduce((a, r) => (a.l += r.l, a.cl += r.cl, a.z += r.z, a), { l: 0, cl: 0, z: 0 });
      const aktiv = new Set(rows.filter(r => r.z > 0).map(r => r.u)).size;
      const alle = new Set([...F.keys(), ...d.rows.map(r => r.u)]).size;
      const wort = TR.art === "t" ? "Trainingsfahrten" : TR.art === "r" ? "Rennen oder Qualis" : "Fahrten";
      let inhalt = "";
      if (!rows.length) inhalt = `<div class="tm-box tm-soon"><p>Keine ${wort} in den letzten ${days} Tagen.</p></div>`;
      else if (TR.ansicht === "strecke") {
        const K = new Map();
        for (const r of rows) {
          const k = r.t + "|" + r.c;
          const x = K.get(k) || { k, t: r.t, c: r.c, l: 0, z: 0, last: "", u: {} };
          x.l += r.l; x.z += r.z;
          if (r.d > x.last) x.last = r.d;
          x.u[r.u] = (x.u[r.u] || 0) + r.l;
          K.set(k, x);
        }
        const L = [...K.values()].sort((a, b) => b.l - a.l || b.z - a.z);
        inhalt = L.map((x, i) => {
          const b = d.best[x.k];
          const leute = Object.entries(x.u).sort((a, c) => c[1] - a[1]).map(([u, l]) => `${esc(name(u))} ${l} Rd.`).join(" · ");
          return `<div class="gt-k" data-k="${i}">
            <div class="gt-h"><span><span class="gr-pf">▸</span><b>${esc(d.strecken[x.t])}</b> · ${esc(d.autos[x.c])}${d.tags[x.t] ? `<span class="gt-tag">${esc(d.tags[x.t])}</span>` : ""}</span><span class="gt-sum">${zahlDE(x.l)} Runden · ${fmtHours(x.z)}</span></div>
            <div class="gt-ppl">${leute} · zuletzt ${vorTagen(x.last)}</div>
            <div class="gt-best">${b ? `Teambestzeit: ${esc(b.n)} <span class="t">${fmtLap(b.t)}</span>${bopTag(b.bop)}${b.saison ? "" : " · ältere Season"}` : "Teambestzeit: noch keine gespeichert"}</div>
            <div class="gt-trips" hidden></div>
          </div>`;
        }).join("");
        zeichne.L = L;
      } else {
        const P = new Map();
        const neu = (u) => ({ u, l: 0, cl: 0, z: 0, tage: new Set(), k: {} });
        for (const f of d.fahrer) P.set(f.u, neu(f.u));
        for (const r of rows) {
          if (!P.has(r.u)) P.set(r.u, neu(r.u));
          const x = P.get(r.u);
          x.l += r.l; x.cl += r.cl; x.z += r.z;
          if (r.z > 0) x.tage.add(r.d);
          x.k[r.t + "|" + r.c] = (x.k[r.t + "|" + r.c] || 0) + r.z;
        }
        const L = [...P.values()].sort((a, b) => b.z - a.z || name(a.u).localeCompare(name(b.u)));
        const max = Math.max(1, ...L.map(x => x.z));
        inhalt = `<div class="ta-list g6-list">
          <div class="g6-row ta-head"><span>#</span><span>Fahrer</span><span>Zeit auf der Strecke</span><span class="r-al">Runden</span><span class="r-al">Sauber</span><span class="r-al">Tage</span><span>Meist gefahren</span></div>
          ${L.map((x, i) => {
            const f = F.get(x.u) || {};
            const fav = Object.entries(x.k).sort((a, b) => b[1] - a[1])[0];
            const [ft, fc] = fav ? fav[0].split("|") : [];
            return `<div class="g6-row${x.z ? " gr-klick" : " zero"}" data-f="${i}">
              <span class="g6-pos">${x.z ? i + 1 : "–"}</span>
              <div class="g6-name"><b>${x.z ? '<span class="gr-pf">▸</span>' : ""}${esc(name(x.u))}</b>${f.ir ? `<small>iR ${esc(f.ir)}${f.sr ? " · " + esc(f.sr) : ""}</small>` : ""}</div>
              <div class="g6-time"><div class="ta-bar"><i style="width:${Math.round(x.z / max * 100)}%"></i></div><span>${x.z ? fmtHours(x.z) : "–"}</span></div>
              <span class="r-al g6-n">${x.l || "–"}</span>
              <span class="r-al g6-n">${pct(x.cl, x.l)}</span>
              <span class="r-al g6-n">${x.tage.size || "–"}</span>
              <div class="g6-fav">${fav ? `<b>${esc(d.autos[fc])}</b><small>${esc(d.strecken[ft])}</small>` : "<small>–</small>"}</div>
            </div>
            <div class="gr-trips" data-t="${i}" hidden></div>`;
          }).join("")}
        </div>`;
        zeichne.L = L;
      }
      box.innerHTML = `${chart}
        <div class="g6-bar"><div class="gt-filter">
          <div class="g6-range">${knopf("data-art", "t", TR.art === "t", "Training")}${knopf("data-art", "r", TR.art === "r", "Rennen")}${knopf("data-art", "a", TR.art === "a", "Alles")}</div>
          <div class="g6-range">${knopf("data-days", 7, days === 7, "7 Tage")}${knopf("data-days", 30, days === 30, "30 Tage")}</div>
          <div class="g6-range">${knopf("data-ans", "strecke", TR.ansicht === "strecke", "Nach Strecke")}${knopf("data-ans", "fahrer", TR.ansicht === "fahrer", "Nach Fahrer")}</div>
        </div></div>
        <div class="g6-kpis">
          <div><b>${fmtHours(sum.z)}</b><span>auf der Strecke</span></div>
          <div><b>${zahlDE(sum.l)}</b><span>Runden</span></div>
          <div><b>${pct(sum.cl, sum.l)}</b><span>saubere Runden</span></div>
          <div><b>${aktiv} / ${alle}</b><span>Fahrer aktiv</span></div>
        </div>
        ${inhalt}
        <p class="tm-muted" style="margin-top:12px">${TR.art === "r" ? "Rennen und Qualis" : TR.art === "t" ? "Nur Trainingsfahrten (ohne Rennen und Quali)" : "Alle Fahrten"} · letzte ${days} Tage · zum Aufklappen anklicken · Stand: ${fmtDate(d.at)}</p>`;
      box.querySelectorAll("[data-art]").forEach(b => b.onclick = () => { TR.art = b.dataset.art; zeichne(); });
      box.querySelectorAll("[data-ans]").forEach(b => b.onclick = () => { TR.ansicht = b.dataset.ans; zeichne(); });
      box.querySelectorAll("[data-days]").forEach(b => b.onclick = () => renderG61("training", Number(b.dataset.days)));
      box.querySelectorAll(".gt-k").forEach(k => k.querySelector(".gt-h").onclick = () => {
        const el = k.querySelector(".gt-trips"), auf = el.hidden, x = zeichne.L[k.dataset.k];
        el.hidden = !auf;
        k.classList.toggle("auf", auf);
        if (auf && !el.innerHTML) el.innerHTML = fahrtTab(fahrten(rows.filter(r => r.t === x.t && r.c === x.c)), true);
      });
      box.querySelectorAll(".gr-klick").forEach(row => row.onclick = () => {
        const el = box.querySelector(`[data-t="${row.dataset.f}"]`), auf = el.hidden, x = zeichne.L[row.dataset.f];
        el.hidden = !auf;
        row.classList.toggle("auf", auf);
        if (auf && !el.innerHTML) el.innerHTML = fahrtTab(fahrten(rows.filter(r => r.u === x.u)), false);
      });
    };
    zeichne();
  }

  /* ---------------- Garage 61: Bestzeiten ---------------- */
  async function renderBestzeiten() {
    const box = document.getElementById("g61b");
    let d;
    try { d = await api("/g61/strecken"); } catch (e) { return g61Fehler(box, e); }
    if (!d.strecken || !d.strecken.length) { box.innerHTML = '<div class="tm-box tm-soon"><div class="big">Noch keine Zeiten</div><p>Die Rekord-Datenbank ist noch leer. Sie füllt sich automatisch.</p></div>'; return; }
    const neu = d.neu || [];
    let scope = "cur", grp = "m", wahl = d.vorwahl || d.strecken[0].id, daten = null;
    box.innerHTML = `
      <div class="tm-box">
        <h5>Neue Bestzeiten <span class="tm-muted" style="letter-spacing:0;text-transform:none;font-family:var(--body);font-weight:500">letzte 7 Tage</span></h5>
        ${neu.length ? `<div class="tm-tbl-wrap"><table class="tm-tbl gr-tbl">${neu.map(x => `<tr>
          <td class="n"><b>${esc(x.n)}</b>${isRecent(x.at) ? '<span class="tm-new">NEU</span>' : ""}</td>
          <td>${esc(kurzStrecke(x.tn))}<small>${esc(x.car)}</small></td>
          <td class="r-al"><span class="t">${fmtLap(x.t)}</span>${bopTag(x.bop)}</td>
          <td class="r-al gr-p${x.p === 1 ? " p1" : ""}">P${x.p}</td>
          <td class="r-al g">${x.delta ? "−" + x.delta.toFixed(3) : ""}</td>
          <td class="d">${fmtDate(x.at)}</td></tr>`).join("")}</table></div>` : '<p class="tm-muted">In den letzten 7 Tagen keine neue Bestzeit.</p>'}
      </div>
      <div class="gs-ctrl gr-ctrl">
        <input class="tm-input" id="gs-such" placeholder="Strecke suchen …" autocomplete="off">
        <select class="tm-select" id="gs-sel"></select>
        <div class="gs-tog" role="group" aria-label="Wertung"><button type="button" data-sc="cur" class="on">📅 Season</button><button type="button" data-sc="all">📚 Allzeit</button></div>
        <div class="gs-tog" role="group" aria-label="BoP"><button type="button" data-bp="m" class="on">⚖️ Mit BoP</button><button type="button" data-bp="o">Ohne BoP</button></div>
      </div>
      <p class="tm-muted" style="margin:8px 0 14px">${d.rennen ? "Vorausgewählt: Strecke vom nächsten Rennen (" + esc(d.rennen) + "). " : ""}Verglichen wird immer nur mit gleicher Wertung.${d.umbau ? " Bestzeiten werden gerade neu geprüft, einzelne Zeiten können noch fehlen." : ""}</p>
      <div id="gs-out"></div>`;
    const sel = document.getElementById("gs-sel"), such = document.getElementById("gs-such"), out = document.getElementById("gs-out");
    const zeichnen = () => {
      if (!daten) return;
      const autos = daten.autos.map(a => ({ cn: String(a.cn).replace(/ · .*BoP$/, ""), bop: a.bop || (/mit BoP/.test(a.cn) ? "m" : "o"), l: (scope === "cur" ? a.cur : a.all) || [] }));
      const da = autos.filter(a => a.bop === grp && a.l.length);
      if (!da.length) {
        const anders = autos.some(a => a.bop !== grp && a.l.length);
        out.innerHTML = `<div class="tm-box tm-soon"><p>${scope === "cur" ? "In der aktuellen Season (" + esc(d.season) + ")" : "Allzeit"} gibt es hier keine Zeiten ${grp === "m" ? "mit" : "ohne"} BoP.${anders ? " Schalte auf „" + (grp === "m" ? "Ohne" : "Mit") + " BoP“ um." : scope === "cur" ? " Schalte auf Allzeit um." : ""}</p></div>`;
        return;
      }
      out.innerHTML = `<div class="tm-boards">${da.map(a => `
        <div class="tm-board">
          <div class="tm-board-h"><b>${esc(a.cn)}</b><span>${esc(daten.tn)} · ${a.l.length} Fahrer · ${grp === "m" ? "mit" : "ohne"} BoP</span></div>
          <div class="tm-tbl-wrap"><table class="tm-tbl">${a.l.map((x, i) => `
            <tr class="${i === 0 ? "first" : ""}">
              <td class="p">P${i + 1}</td>
              <td class="n">${esc(x.n)}${isRecent(x.at) ? '<span class="tm-new">NEU</span>' : ""}</td>
              <td class="t">${fmtLap(x.t)}</td>
              <td class="g">${i ? "+" + (x.t - a.l[0].t).toFixed(3) : ""}</td>
              <td class="d">${scope === "all" && x.se ? esc(x.se) + "<br>" : (SESSION[x.s] ? SESSION[x.s] + "<br>" : "")}${fmtDate(x.at)}</td>
            </tr>`).join("")}
          </table></div>
        </div>`).join("")}</div>`;
    };
    const laden = async () => {
      if (!wahl) return;
      out.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
      try { daten = await api("/g61/strecken?id=" + encodeURIComponent(wahl)); zeichnen(); }
      catch (e) { out.innerHTML = `<div class="tm-box tm-err">${esc(e.message)}</div>`; }
    };
    const liste = () => {
      const q = such.value.trim().toLowerCase();
      const t = d.strecken.filter(x => !q || x.tn.toLowerCase().includes(q));
      sel.innerHTML = t.map(x => `<option value="${x.id}" ${x.id === wahl ? "selected" : ""}>${esc(x.tn)}</option>`).join("") || '<option value="">Nichts gefunden</option>';
      if (t.length && !t.some(x => x.id === wahl)) { wahl = t[0].id; laden(); }
    };
    such.addEventListener("input", liste);
    sel.addEventListener("change", () => { wahl = sel.value; laden(); });
    box.querySelectorAll("[data-sc]").forEach(b => b.onclick = () => {
      scope = b.dataset.sc;
      box.querySelectorAll("[data-sc]").forEach(x => x.classList.toggle("on", x === b));
      zeichnen();
    });
    box.querySelectorAll("[data-bp]").forEach(b => b.onclick = () => {
      grp = b.dataset.bp;
      box.querySelectorAll("[data-bp]").forEach(x => x.classList.toggle("on", x === b));
      zeichnen();
    });
    liste();
    laden();
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
    const wp = cfg.wpost || {}, wpo = wp.opt || {};
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
        <p class="hint">Alle 10 Minuten (nachts Mo–Fr von 1 bis 6 Uhr alle 20) wird geschaut, ob jemand aus dem Team eine neue persönliche Bestzeit gefahren ist – die wird dann im gewählten Discord-Kanal gepostet, mit Angabe ob mit oder ohne BOP.</p>
        <div class="tm-row"><label for="g61-team">Garage-61-Team</label><div>${teamOpts}</div></div>
        <div class="tm-row"><label for="g61-ch">Discord-Kanal<small>für Bestzeit-Posts</small></label>
          <div><select class="tm-select" id="g61-ch"><option value="">– Kanal wählen –</option>${(d.channels || []).map(c => `<option value="${c.id}" ${c.id === g.channel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
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

      <div class="tm-box">
        <h5>Wochen-Post</h5>
        <p class="hint">Trainingswoche auswählen, Inhalt festlegen, Vorschau ansehen und dann in Discord posten. Alle Zahlen kommen automatisch aus Garage 61.</p>
        <div class="tm-row"><label for="g61-ziel">Wochenziel<small>Runden pro Woche fürs ganze Team · 0 = aus · mit „Speichern" sichern</small></label>
          <div><input class="tm-input" id="g61-ziel" type="number" min="0" max="100000" step="50" value="${Number(g.ziel) || 0}" style="max-width:160px"> <span class="tm-muted">Runden</span></div></div>
        <div class="tm-row"><label for="wp-w">Woche</label>
          <div><select class="tm-select" id="wp-w" style="width:auto"><option value="">Lädt …</option></select></div></div>
        <div class="tm-row"><label for="wp-text">Ansage vom Teamchef<small>optional · wird groß hervorgehoben</small></label>
          <div><textarea class="tm-input" id="wp-text" rows="3" maxlength="600" placeholder="z. B. Starke Woche, Jungs! Samstag geht's nach Spa – alle nochmal auf die Strecke!"></textarea></div></div>
        <div class="tm-row"><div class="lbl">Inhalt</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label class="tm-switch"><input type="checkbox" id="wp-alle" ${wpo.alle !== false ? "checked" : ""}><span class="s"></span>Alle Fahrer zeigen (sonst nur Podium P1–P3)</label>
            <label class="tm-switch"><input type="checkbox" id="wp-vgl" ${wpo.vgl !== false ? "checked" : ""}><span class="s"></span>Vergleich zur Vorwoche</label>
            <label class="tm-switch"><input type="checkbox" id="wp-sprung" ${wpo.sprung !== false ? "checked" : ""}><span class="s"></span>Größter Sprung (meiste Runden mehr als in der Vorwoche)</label>
            <label class="tm-switch"><input type="checkbox" id="wp-ziel" ${wpo.ziel !== false ? "checked" : ""}><span class="s"></span>Wochenziel</label>
            <label class="tm-switch"><input type="checkbox" id="wp-sauber" ${wpo.sauber ? "checked" : ""}><span class="s"></span>Saubere Runden in %</label>
            <label class="tm-switch"><input type="checkbox" id="wp-top" ${wpo.top ? "checked" : ""}><span class="s"></span>Top-Strecken &amp; Top-Autos</label>
          </div></div>
        <div class="tm-row"><label for="wp-ch">Discord-Kanal</label>
          <div><select class="tm-select" id="wp-ch"><option value="">– Kanal wählen –</option>${(d.channels || []).map(c => `<option value="${c.id}" ${c.id === (wp.channel || g.channel) ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><label for="wp-ping">Rolle pingen<small>z. B. Teamfahrer</small></label>
          <div><select class="tm-select" id="wp-ping"><option value="">– niemanden pingen –</option>${d.roles.map(r => `<option value="${r.id}" ${r.id === wp.ping ? "selected" : ""}>@${esc(r.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><div class="lbl">Posten</div>
          <div class="tm-actions">${btn("Vorschau", "sm", 'id="wp-prev"')}${btn("🏁 In Discord posten", "sm red", 'id="wp-send"')}</div></div>
        <div id="wp-vorschau"></div>
      </div>

      <div class="tm-box">
        <h5>Abwesenheiten</h5>
        <p class="hint">Neue Abwesenheiten postet der Bot in diesen Kanal. Für die Discord-Befehle /abwesend, /abwesenheiten und /zurueck einmal „Befehle einrichten" klicken.</p>
        <div class="tm-row"><label for="ab-ch">Discord-Kanal</label>
          <div><select class="tm-select" id="ab-ch"><option value="">– nicht posten –</option>${(d.channels || []).map(c => `<option value="${c.id}" ${c.id === (cfg.absences || {}).channel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><div class="lbl">Discord-Befehle</div><div class="tm-actions">${btn("Befehle einrichten", "sm", 'id="ab-cmds"')}</div></div>
      </div>

      <div class="tm-box">
        <h5>Stintplaner</h5>
        <p class="hint">Grundeinstellungen für alle Rennen. Pro Rennen kann im Stintplaner ein anderer Kanal gewählt werden.</p>
        <div class="tm-row"><label for="sp-ch">Standard-Kanal</label>
          <div><select class="tm-select" id="sp-ch"><option value="">– nicht posten –</option>${(d.channels || []).map(c => `<option value="${c.id}" ${c.id === (cfg.stint || {}).channel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><div class="lbl">Pings</div>
          <div class="tm-actions">
            <label class="tm-switch"><input type="checkbox" id="sp-ping" ${(cfg.stint || {}).stintPing !== false ? "checked" : ""}><span class="s"></span>Fahrer vor seinem Stint anpingen</label>
            <label class="tm-switch"><input type="checkbox" id="sp-av24" ${(cfg.stint || {}).avPing !== false ? "checked" : ""}><span class="s"></span>24 Std. vorher: fehlende Verfügbarkeit anmahnen</label>
          </div></div>
        <div class="tm-row"><label for="sp-vor">Vorlauf Stint-Ping<small>wird alle 10 Min. geprüft</small></label>
          <div><select class="tm-select" id="sp-vor">${[10, 15, 20, 30, 45, 60].map(m => `<option value="${m}" ${m === ((cfg.stint || {}).vorlauf || 15) ? "selected" : ""}>${m} Minuten vorher</option>`).join("")}</select></div></div>
        <div class="tm-row"><div class="lbl">Teams<small>zur Auswahl bei jedem Auto</small></div>
          <div><div id="sp-teams"></div><div class="tm-actions" style="margin-top:8px">${btn("+ Team", "sm", 'id="sp-team-add"')}</div></div></div>
      </div>

      <div class="tm-box">
        <h5>Links</h5>
        <p class="hint">Erscheinen im Dashboard unter „Links" für alle Teammitglieder. Mit ▲▼ sortieren.</p>
        <div id="lk-edit"></div>
        <div class="tm-actions" style="margin-top:10px">${btn("+ Link hinzufügen", "sm", 'id="lk-add"')}</div>
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

      <div class="tm-box">
        <h5>Limit-Warnung</h5>
        <p class="hint">Alle 10 Minuten wird geprüft, wie viel von den Cloudflare-Gratis-Limits heute schon verbraucht ist. Wird eine Schwelle erreicht, postet der Bot eine Warnung – höchstens einmal pro Tag und Schwelle. Übersicht unter „Limits".</p>
        <div class="tm-row"><div class="lbl">Warnung</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label class="tm-switch"><input type="checkbox" id="li-on" ${(cfg.limits || {}).enabled ? "checked" : ""}><span class="s"></span>An</label>
            <label class="tm-switch"><input type="checkbox" id="li-90" ${(cfg.limits || {}).p90 ? "checked" : ""}><span class="s"></span>Ab 90 % warnen</label>
            <label class="tm-switch"><input type="checkbox" id="li-100" ${(cfg.limits || {}).p100 ? "checked" : ""}><span class="s"></span>Bei 100 % (Limit erreicht) melden</label>
          </div></div>
        <div class="tm-row"><label for="li-ch">Discord-Kanal</label>
          <div><select class="tm-select" id="li-ch"><option value="">– Kanal wählen –</option>${(d.channels || []).map(c => `<option value="${c.id}" ${c.id === (cfg.limits || {}).channel ? "selected" : ""}># ${esc(c.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><label for="li-ping">Ping<small>Rolle, die erwähnt wird</small></label>
          <div><select class="tm-select" id="li-ping"><option value="">– niemanden pingen –</option>${d.roles.map(r => `<option value="${r.id}" ${r.id === (cfg.limits || {}).ping ? "selected" : ""}>@${esc(r.name)}</option>`).join("")}</select></div></div>
        <div class="tm-row"><div class="lbl">Testen</div><div class="tm-actions">${btn("Test-Warnung senden", "sm", 'id="li-test"')}</div></div>
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
    box.querySelectorAll("#g61-team,#g61-ziel,#g61-ch,#g61-on,#g61-rec,#rm-on,#rm-24,#rm-1,#rm-ch,#rm-ping,#ab-ch,#li-on,#li-90,#li-100,#li-ch,#li-ping,#sp-ch,#sp-vor").forEach(el => el.addEventListener("input", markDirty));
    box.querySelectorAll("#sp-ping,#sp-av24").forEach(el => el.addEventListener("change", markDirty));
    // Stintplaner-Teams: Liste mit Eingabefeldern, ✕ zum Entfernen
    let spTeams = [...((cfg.stint || {}).teams || [])];
    const spTeamsSync = () => { spTeams = [...document.querySelectorAll("#sp-teams input")].map(i => i.value); };
    const spTeamsDraw = () => {
      document.getElementById("sp-teams").innerHTML = spTeams.map((t, i) => `<div class="sp-inline" style="margin-bottom:6px"><input class="tm-input" maxlength="40" value="${esc(t)}" style="flex:1 1 200px;width:auto"><button type="button" class="tm-btn sm" data-tdel="${i}"><span>✕</span></button></div>`).join("") || '<p class="tm-muted">Keine Teams angelegt.</p>';
      document.querySelectorAll("#sp-teams input").forEach(el => el.addEventListener("input", markDirty));
      document.querySelectorAll("#sp-teams [data-tdel]").forEach(b => b.onclick = () => { spTeamsSync(); spTeams.splice(Number(b.dataset.tdel), 1); spTeamsDraw(); markDirty(); });
    };
    spTeamsDraw();
    document.getElementById("sp-team-add").onclick = () => { spTeamsSync(); spTeams.push(""); spTeamsDraw(); markDirty(); const l = [...document.querySelectorAll("#sp-teams input")].pop(); if (l) l.focus(); };
    box.querySelectorAll("#g61-on,#g61-rec").forEach(el => el.addEventListener("change", markDirty));

    // ---- Links bearbeiten ----
    let links = (d.links || []).map(l => ({ ...l }));
    const lkSync = () => document.querySelectorAll(".lk-row").forEach((r, i) => {
      links[i] = { title: r.querySelector("[data-f=title]").value, url: r.querySelector("[data-f=url]").value, desc: r.querySelector("[data-f=desc]").value };
    });
    const lkDraw = () => {
      document.getElementById("lk-edit").innerHTML = links.map((l, i) => `
        <div class="lk-row">
          <div class="pa-move">
            <button type="button" data-lmv="-1" data-i="${i}" ${i === 0 ? "disabled" : ""}>▲</button>
            <button type="button" data-lmv="1" data-i="${i}" ${i === links.length - 1 ? "disabled" : ""}>▼</button>
          </div>
          <input class="tm-input" data-f="title" placeholder="Titel" maxlength="60" value="${esc(l.title)}">
          <input class="tm-input" data-f="url" placeholder="https://…" maxlength="500" value="${esc(l.url)}">
          <input class="tm-input" data-f="desc" placeholder="Beschreibung (optional)" maxlength="140" value="${esc(l.desc)}">
          <button type="button" class="tm-icon-btn" data-ldel="${i}" title="Löschen">✕</button>
        </div>`).join("") || '<p class="tm-muted">Noch keine Links.</p>';
      document.querySelectorAll(".lk-row input").forEach(el => el.addEventListener("input", markDirty));
      document.querySelectorAll("[data-lmv]").forEach(b => b.onclick = () => {
        lkSync(); const i = Number(b.dataset.i), j = i + Number(b.dataset.lmv);
        [links[i], links[j]] = [links[j], links[i]]; lkDraw(); markDirty();
      });
      document.querySelectorAll("[data-ldel]").forEach(b => b.onclick = () => {
        lkSync(); links.splice(Number(b.dataset.ldel), 1); lkDraw(); markDirty();
      });
    };
    lkDraw();
    document.getElementById("lk-add").onclick = () => { lkSync(); links.push({ title: "", url: "", desc: "" }); lkDraw(); markDirty(); };

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
          ziel: Number(document.getElementById("g61-ziel").value) || 0,
        },
        reminders: {
          enabled: document.getElementById("rm-on").checked,
          channel: document.getElementById("rm-ch").value,
          ping: document.getElementById("rm-ping").value,
          h24: document.getElementById("rm-24").checked,
          h1: document.getElementById("rm-1").checked,
        },
        links: (lkSync(), links.filter(l => l.title.trim() && l.url.trim())),
        absences: { channel: document.getElementById("ab-ch").value },
        stint: {
          channel: document.getElementById("sp-ch").value,
          vorlauf: Number(document.getElementById("sp-vor").value) || 15,
          stintPing: document.getElementById("sp-ping").checked,
          avPing: document.getElementById("sp-av24").checked,
          teams: (spTeamsSync(), spTeams.map(t => t.trim()).filter(Boolean)),
        },
        limits: {
          enabled: document.getElementById("li-on").checked,
          channel: document.getElementById("li-ch").value,
          ping: document.getElementById("li-ping").value,
          p90: document.getElementById("li-90").checked,
          p100: document.getElementById("li-100").checked,
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
    action("ab-cmds", "/admin/discord/commands");
    action("li-test", "/admin/limits/test");

    // ---- Wochen-Post ----
    const wpSel = document.getElementById("wp-w");
    api("/g61/woche").then(w => {
      if (!w.ready) { wpSel.innerHTML = '<option value="">Garage 61 nicht eingerichtet</option>'; return; }
      const last = w.wochen.length - 1;
      wpSel.innerHTML = w.wochen.map((x, i) => `<option value="${i}" ${i === last - 1 ? "selected" : ""}>KW ${x.kw}${i === last ? " (läuft)" : ""} · ab ${fmtDay(x.start)} · ${Number(x.laps).toLocaleString("de-DE")} Runden</option>`).reverse().join("");
    }).catch(() => { wpSel.innerHTML = '<option value="">Wochen nicht ladbar</option>'; });

    const wpBody = (vorschau) => ({
      w: Number(wpSel.value),
      text: document.getElementById("wp-text").value,
      channel: document.getElementById("wp-ch").value,
      ping: document.getElementById("wp-ping").value,
      vorschau,
      opt: Object.fromEntries(["alle", "vgl", "sprung", "ziel", "sauber", "top"].map(k => [k, document.getElementById("wp-" + k).checked])),
    });
    const md = (t) => esc(t || "")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<i>$1</i>");
    const mdBlock = (t) => {
      let out = "", quote = [];
      const flush = () => { if (quote.length) { out += `<blockquote>${quote.join("<br>")}</blockquote>`; quote = []; } };
      for (const line of String(t || "").split("\n")) {
        if (/^>\s?/.test(line)) { quote.push(md(line.replace(/^>\s?/, ""))); continue; }
        flush();
        if (line.startsWith("### ")) out += `<div class="dp-h3">${md(line.slice(4))}</div>`;
        else out += line ? `<div>${md(line)}</div>` : '<div class="dp-gap"></div>';
      }
      flush();
      return out;
    };
    const zeigeVorschau = (e, ping) => {
      const pingName = ping ? (d.roles.find(r => r.id === ping) || {}).name : "";
      document.getElementById("wp-vorschau").innerHTML = `
        <div class="dp">
          <div class="dp-label">Vorschau – so sieht der Post in Discord aus</div>
          ${pingName ? `<div class="dp-ping">@${esc(pingName)}</div>` : ""}
          <div class="dp-embed">
            <img class="dp-thumb" src="${IMG}f2f-logo.webp" alt="">
            <div class="dp-author">${esc(e.author.name)}</div>
            <div class="dp-title">${md(e.title)}</div>
            <div class="dp-desc">${mdBlock(e.description)}</div>
            <div class="dp-fields">${e.fields.map(f => `<div class="dp-field${f.inline ? " in" : ""}">${f.name !== "\u200B" ? `<div class="dp-fn">${md(f.name)}</div>` : ""}<div class="dp-fv">${mdBlock(f.value)}</div></div>`).join("")}</div>
            <div class="dp-foot">${esc(e.footer.text)}</div>
          </div>
        </div>`;
    };
    const wpPrev = document.getElementById("wp-prev");
    wpPrev.onclick = async () => {
      if (wpSel.value === "") return toast("Bitte eine Woche wählen");
      wpPrev.disabled = true;
      try {
        const b = wpBody(true);
        const r = await api("/admin/wochenpost", { method: "POST", body: b });
        if (r.embed) zeigeVorschau(r.embed, b.ping); else toast(r.info || "Fehler");
      } catch (e) { toast(e.message); }
      wpPrev.disabled = false;
    };
    const wpSend = document.getElementById("wp-send");
    wpSend.onclick = async () => {
      if (wpSel.value === "") return toast("Bitte eine Woche wählen");
      if (!confirm("Wochen-Post jetzt in Discord posten?")) return;
      wpSend.disabled = true;
      try {
        if (dirty) await save();
        const r = await api("/admin/wochenpost", { method: "POST", body: wpBody(false) });
        toast(r.info || "Erledigt", r.ok);
        if (r.ok) { document.getElementById("wp-text").value = ""; document.getElementById("wp-vorschau").innerHTML = ""; }
      } catch (e) { toast(e.message); }
      wpSend.disabled = false;
    };
  }


  init();
})();
