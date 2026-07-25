/* ===========================================================
   Gemeinsames Menü + Footer für ALLE Seiten.
   Hier EINMAL ändern -> gilt auf jeder Seite.
   Neue Seite hinzufügen: unten in LINKS eine Zeile ergänzen
   und eine neue .html anlegen (Kopie einer bestehenden).
   =========================================================== */
const LINKS = [
  {href:"about.html",     label:"Über mich"},
  {href:"live.html",      label:"Live"},
  {href:"events.html",    label:"Kalender"},
  {href:"setup.html",     label:"Setup"},
  {href:"community.html", label:"Community"},
];

const TWITCH  = "https://twitch.tv/kreids888";
const YOUTUBE = "https://youtube.com/@Kreids888";

// aktuelle Seite ermitteln (für aktiven Menüpunkt)
const current = location.pathname.split("/").pop() || "index.html";

// ---- NAV ----
const navHTML = `
<div class="container nav-in">
  <a class="brand" href="index.html">
    <span class="bar"></span><span class="k">KREIDS</span><span class="n">888</span>
  </a>
  <div class="nav-links">
    ${LINKS.map(l=>`<a class="hide-sm ${current===l.href?'active':''}" href="${l.href}">${l.label}</a>`).join("")}
    <a class="live-pill" href="${TWITCH}" target="_blank" rel="noopener"><span class="live-dot"></span><span>LIVE</span></a>
  </div>
</div>`;

// ---- FOOTER ----
const footHTML = `
<div class="container foot-in">
  <a class="foot-brand" href="index.html">KREIDS<span class="r">888</span></a>
  <div class="foot-c">Collab / Business: <a href="mailto:kontakt@kreids888.de">kontakt@kreids888.de</a></div>
</div>
<div class="container"><div class="foot-note">© 2026 Kreids888 · #888 · Snail Pace Racing · Built on GitHub Pages</div></div>`;

// einsetzen
const navEl = document.getElementById("site-nav");
const footEl = document.getElementById("site-footer");
if(navEl) navEl.innerHTML = navHTML;
if(footEl) footEl.innerHTML = footHTML;
