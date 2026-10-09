/* ===========================================================
   Gemeinsames Menü + Ticker + Footer für ALLE Seiten.
   Hier EINMAL ändern -> gilt überall.
   =========================================================== */
const LINKS = [
  {href:"about.html",     label:"Über mich"},
  {href:"live.html",      label:"Live"},
  {href:"streamkalender.html", label:"Streamkalender"},
  {href:"ergebnisse.html", label:"Ergebnisse"},
  {href:"news.html",      label:"News"},
  {href:"setup.html",     label:"Setup"},
  {href:"community.html", label:"Community"},
  {href:"team/",          label:"Racing Team"},
];
const TWITCH  = "https://twitch.tv/kreids888";
const YOUTUBE = "https://youtube.com/@Kreids888";

/* --- Ticker: Fallback-Text (wird vom Dashboard überschrieben) --- */
const ADMIN_API = "https://kreids888-admin.kreids.workers.dev";
const TICKER = [
  "🔴 Hier live zu sehen",
  "Rennen live auf Twitch & YouTube",
  "Streaming in 2K",
  "#888 · S. Kreid",
  "F2F Motorsport",
];

function buildTickerItems(list){
  return list.map(t=>`<span class="ticker-item">${escapeHtml(t)}</span><span class="ticker-sep" aria-hidden="true"></span>`).join("");
}
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

// Links sind ab Stamm-Pfad (/…), damit sie auch in Unterordnern wie /team/ stimmen.
// Aktiv-Erkennung ohne ".html" und ohne "/" am Ende (Cloudflare kürzt /about.html zu /about).
const navKey = p => p.replace(/^\//,"").replace(/\/$/,"").replace(/\.html$/,"");
const current = navKey(location.pathname) || "index";

// ---- TICKER + NAV ----
const tickerItems = buildTickerItems(TICKER);
const navHTML = `
<div class="ticker">
  <div class="ticker-track">
    <span class="ticker-set">${tickerItems}</span>
    <span class="ticker-set" aria-hidden="true">${tickerItems}</span>
  </div>
</div>
<div class="navbar">
  <div class="container nav-in">
    <a class="brand" href="/"><span class="bar"></span><span class="k">KREIDS</span><span class="n">888</span></a>
    <button class="burger" id="burger" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
    <div class="nav-links" id="navlinks">
      ${LINKS.map(l=>`<a class="${current===navKey(l.href)?'active':''}" href="/${l.href}">${l.label}</a>`).join("")}
      <a class="live-pill" href="${YOUTUBE}" target="_blank" rel="noopener"><span class="live-dot"></span><span>LIVE</span></a>
    </div>
  </div>
</div>`;

// ---- FOOTER ----
const footHTML = `
<div class="container foot-in">
  <a class="foot-brand" href="/">KREIDS<span class="r">888</span></a>
  <div class="foot-motto" aria-label="Mein Motto: Konstanz vor Geschwindigkeit">
    <span class="foot-motto-lbl">Mein Motto</span>
    <span class="foot-motto-line"><span class="fm-strong">Konstanz</span> <span class="fm-sheen">vor Geschwindigkeit</span></span>
  </div>
</div>
<div class="container"><div class="foot-note">© 2026 Kreids888 · Privates Hobbyprojekt<span class="foot-legal"><a href="/impressum.html">Impressum</a><a href="/impressum.html#datenschutz">Datenschutz</a></span></div></div>`;

const navEl=document.getElementById("site-nav");
const footEl=document.getElementById("site-footer");
if(navEl) navEl.innerHTML=navHTML;
if(footEl) footEl.innerHTML=footHTML;

// ---- Ticker live aus dem Dashboard laden (Fallback bleibt sonst stehen) ----
(async function refreshTicker(){
  try{
    const r = await fetch(ADMIN_API + "/api/ticker");
    if(!r.ok) return;
    const d = await r.json();
    if(Array.isArray(d.messages) && d.messages.length){
      const items = buildTickerItems(d.messages);
      document.querySelectorAll(".ticker-set").forEach(el => el.innerHTML = items);
    }
  }catch(e){ /* Fallback-Ticker bleibt */ }
})();

// ---- Hamburger-Menü umschalten ----
const burger=document.getElementById("burger");
const navlinks=document.getElementById("navlinks");
if(burger&&navlinks){
  burger.addEventListener("click",()=>{
    const open=navlinks.classList.toggle("open");
    burger.classList.toggle("x",open);
    burger.setAttribute("aria-label",open?"Menü schließen":"Menü öffnen");
  });
}

// ---- YouTube erst nach Klick laden (Datenschutz) ----
// Vorher wird nur ein Vorschaubild über den eigenen Worker gezeigt,
// es gibt also keine Verbindung zu YouTube/Google, bis man auf Play drückt.
// Danach läuft das Video über youtube-nocookie.com (erweiterter Datenschutzmodus).
function ytThumb(id, art){ return ADMIN_API + "/api/thumb/" + encodeURIComponent(id) + (art === "short" ? "?f=short" : ""); }
function ytKlick(box, id, o){
  o = o || {};
  if(!box || !id) return;
  box.classList.add("yt-klick");
  box.innerHTML = '<button type="button" class="ytk-btn" aria-label="'+escapeHtml(o.label||"Video abspielen")+'">'
    + '<img src="'+ytThumb(id,o.art)+'" alt="" loading="lazy" onerror="this.style.opacity=0">'
    + '<span class="ytk-play" aria-hidden="true"></span></button>'
    + '<span class="ytk-hint">Beim Abspielen werden Daten an YouTube übertragen · <a href="/impressum.html#datenschutz">Datenschutz</a></span>';
  box.querySelector(".ytk-btn").addEventListener("click", function(){
    box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0&playsinline=1" title="'+escapeHtml(o.title||"YouTube-Video")+'" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>';
  });
}
