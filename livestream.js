/* ===========================================================
   BROADCAST-STATUS — Live / Countdown / Offline auf der Startseite.
   ------------------------------------------------------------
   WOHER KOMMEN DIE DATEN?
   Aus einem eigenen Cloudflare Worker, der die YouTube Data API
   abfragt (hält den API-Key sicher, cached das Ergebnis). Der Worker
   liefert JSON in genau diesem Format:

     {
       "state": "live" | "upcoming" | "offline",
       "videoId": "abc123def45",          // bei live ODER upcoming
       "title": "Titel des Streams",       // bei live ODER upcoming
       "scheduledStart": "2026-07-28T18:00:00Z"  // nur bei upcoming (ISO-Zeit)
     }

   SO AKTIVIERST DU ES:
   Sobald der Worker läuft, unten die STREAM_API_URL eintragen
   (z.B. "https://kreids888-live.DEINACCOUNT.workers.dev").
   Solange sie leer ist, zeigt die Seite automatisch "offline".
   =========================================================== */

// ⬇⬇⬇  HIER DIE WORKER-URL EINTRAGEN (leer lassen = immer offline)  ⬇⬇⬇
const STREAM_API_URL = "https://kreids888-live.kreids.workers.dev/";
// ⬆⬆⬆  HIER DIE WORKER-URL EINTRAGEN  ⬆⬆⬆

const POLL_MS = 90_000; // alle 90 Sek. neu prüfen
let countdownTimer = null;

function $(id){ return document.getElementById(id); }

function showState(state){
  const panel = document.querySelector(".bc-panel");
  if (panel) panel.dataset.state = state;
  const map = { live:"bcLive", upcoming:"bcUpcoming", offline:"bcOffline" };
  ["bcLive","bcUpcoming","bcOffline"].forEach(id=>{ const el=$(id); if(el) el.hidden = true; });
  const on = $(map[state]); if(on) on.hidden = false;

  const label = $("bcState");
  if (label){
    if (state==="live")      label.textContent = "ON AIR — jetzt live";
    else if (state==="upcoming") label.textContent = "Stream angekündigt";
    else                     label.textContent = "Offline";
  }
}

function renderLive(data){
  const frame = $("liveFrame");
  if (frame && data.videoId){
    frame.src = "https://www.youtube.com/embed/" + data.videoId +
                "?autoplay=1&mute=1&rel=0&playsinline=1";
  }
  showState("live");
}

function pad(n){ return String(n).padStart(2,"0"); }

function renderUpcoming(data){
  const t = $("bcTitle");
  if (t) t.textContent = data.title || "Stream";
  const when = $("bcWhen");
  const start = data.scheduledStart ? new Date(data.scheduledStart) : null;

  // Thumbnail + Link (falls vorhanden)
  const thumbLink = $("bcThumbLink");
  const thumbImg = $("bcThumb");
  const watchUrl = data.videoId ? ("https://www.youtube.com/watch?v=" + data.videoId) : "https://youtube.com/@Kreids888";
  if (thumbLink && thumbImg && data.thumbnail){
    thumbImg.src = data.thumbnail;
    thumbLink.hidden = false;
  } else if (thumbLink){
    thumbLink.hidden = true;
  }
  const remind = $("bcRemind");
  if (remind) remind.href = watchUrl;

  if (when && start){
    when.textContent = start.toLocaleString("de-DE",{
      weekday:"long", day:"2-digit", month:"long",
      hour:"2-digit", minute:"2-digit"
    }) + " Uhr";
  }
  showState("upcoming");

  if (countdownTimer) clearInterval(countdownTimer);
  function tick(){
    if (!start){ return; }
    const diff = start - new Date();
    if (diff <= 0){ // Startzeit erreicht -> neu abfragen (evtl. jetzt live)
      clearInterval(countdownTimer);
      refresh();
      return;
    }
    const d = Math.floor(diff/86400000);
    const h = Math.floor(diff%86400000/3600000);
    const m = Math.floor(diff%3600000/60000);
    const s = Math.floor(diff%60000/1000);
    if($("cdD")) $("cdD").textContent = pad(d);
    if($("cdH")) $("cdH").textContent = pad(h);
    if($("cdM")) $("cdM").textContent = pad(m);
    if($("cdS")) $("cdS").textContent = pad(s);
  }
  tick();
  countdownTimer = setInterval(tick, 1000);
}

async function refresh(){
  if (!document.getElementById("broadcast")) return;

  // Keine Worker-URL gesetzt -> sauber "offline" zeigen.
  if (!STREAM_API_URL){ showState("offline"); return; }

  try{
    const res = await fetch(STREAM_API_URL, { cache:"no-store" });
    if (!res.ok) throw new Error("HTTP "+res.status);
    const data = await res.json();
    if (data.state === "live")          renderLive(data);
    else if (data.state === "upcoming") renderUpcoming(data);
    else                                showState("offline");
  }catch(err){
    console.info("[Broadcast] Status nicht abrufbar:", err.message);
    showState("offline");
  }
}

refresh();
setInterval(refresh, POLL_MS);
