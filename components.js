/* ===========================================================
   Gemeinsames Menü + Ticker + Footer für ALLE Seiten.
   Hier EINMAL ändern -> gilt überall.
   =========================================================== */
const LINKS = [
  {href:"about.html",     label:"Über mich"},
  {href:"live.html",      label:"Live"},
  {href:"streamkalender.html", label:"Streamkalender"},
  {href:"setup.html",     label:"Setup"},
  {href:"community.html", label:"Community"},
];
const TWITCH  = "https://twitch.tv/kreids888";
const YOUTUBE = "https://youtube.com/@Kreids888";

/* --- Ticker-Text (reiner Text, kein echter Live-Status) --- */
const TICKER = [
  "🔴 Hier live zu sehen",
  "Rennen live auf Twitch & YouTube",
  "Streaming in 2K",
  "#888 · S. Kreid",
  "Snail Pace Racing",
];

const current = location.pathname.split("/").pop() || "index.html";

// ---- TICKER + NAV ----
const tickerItems = TICKER.map(t=>`<span class="ticker-item">${t}<b>•</b></span>`).join("");
const navHTML = `
<div class="ticker">
  <div class="ticker-track">
    <span class="ticker-set">${tickerItems}</span>
    <span class="ticker-set" aria-hidden="true">${tickerItems}</span>
  </div>
</div>
<div class="navbar">
  <div class="container nav-in">
    <a class="brand" href="index.html"><span class="bar"></span><span class="k">KREIDS</span><span class="n">888</span></a>
    <button class="burger" id="burger" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
    <div class="nav-links" id="navlinks">
      ${LINKS.map(l=>`<a class="${current===l.href?'active':''}" href="${l.href}">${l.label}</a>`).join("")}
      <a class="live-pill" href="${YOUTUBE}" target="_blank" rel="noopener"><span class="live-dot"></span><span>LIVE</span></a>
    </div>
  </div>
</div>`;

// ---- FOOTER ----
const footHTML = `
<div class="container foot-in">
  <a class="foot-brand" href="index.html">KREIDS<span class="r">888</span></a>
</div>
<div class="container"><div class="foot-note">© 2026 Kreids888 · #888 · Built on GitHub Pages</div></div>`;

const navEl=document.getElementById("site-nav");
const footEl=document.getElementById("site-footer");
if(navEl) navEl.innerHTML=navHTML;
if(footEl) footEl.innerHTML=footHTML;

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

// ---- Video: läuft automatisch (stumm) — Ton lässt sich dazuschalten ----
// Browser erlauben Autoplay mit Ton grundsätzlich nicht; daher startet das
// Video stumm und der Nutzer kann per Button den Ton aktivieren (steuert
// den YouTube-Player über die postMessage-API, dafür braucht die iframe-URL
// den Parameter "enablejsapi=1").
const soundToggle=document.getElementById("soundToggle");
const ytFrame=document.getElementById("ytFrame");
if(soundToggle&&ytFrame){
  let muted=true;
  soundToggle.addEventListener("click",()=>{
    muted=!muted;
    ytFrame.contentWindow.postMessage(JSON.stringify({
      event:"command",
      func: muted?"mute":"unMute",
      args:[]
    }),"*");
    soundToggle.textContent = muted ? "🔇 Ton an" : "🔊 Ton aus";
  });
}
