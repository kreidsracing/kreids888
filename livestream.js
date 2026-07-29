/* ===========================================================
   BROADCAST-STATUS — Live / Countdown / Offline (Startseite)
   ------------------------------------------------------------
   VARIANTE B:
   • Countdown-Termin (Datum/Uhrzeit/Titel) kommt aus dem
     STREAMKALENDER (Dashboard, /api/calendar). Läuft immer,
     unabhängig von YouTube — nichts kann "offline" haken.
   • Thumbnail wird automatisch vom YouTube-Stream gezogen
     (kreids888-live-Worker). Fällt das aus, wird das im
     Kalender-Eintrag hinterlegte Bild genommen.
   • "ON AIR" (echt live) meldet ebenfalls der Worker.

   (Alles in einer IIFE gekapselt -> keine globalen Namen,
    keine Konflikte mit anderen Scripts.)
   =========================================================== */
(function () {
  const CAL_API        = "https://kreids888-admin.kreids.workers.dev/api/calendar"; // Streamkalender
  const STREAM_API_URL = "https://kreids888-live.kreids.workers.dev/";               // Live/Thumbnail
  const YT_CHANNEL     = "https://youtube.com/@Kreids888";
  const POLL_MS        = 90_000;

  let countdownTimer = null;

  function $(id){ return document.getElementById(id); }
  function pad(n){ return String(n).padStart(2,"0"); }

  function showState(state){
    const panel = document.querySelector(".bc-panel");
    if (panel) panel.dataset.state = state;
    ["bcLive","bcUpcoming","bcOffline"].forEach(id=>{ const el=$(id); if(el) el.hidden = true; });
    const on = $({live:"bcLive",upcoming:"bcUpcoming",offline:"bcOffline"}[state]); if(on) on.hidden = false;
    const label = $("bcState");
    if (label){
      label.textContent = state==="live" ? "ON AIR — jetzt live"
                        : state==="upcoming" ? "Stream angekündigt"
                        : "Offline";
    }
  }

  /* ---------- Datenquellen ---------- */
  async function fetchStream(){
    if (!STREAM_API_URL) return null;
    try{
      const r = await fetch(STREAM_API_URL, { cache:"no-store" });
      if (!r.ok) return null;
      return await r.json(); // {state, videoId, title, thumbnail, scheduledStart}
    }catch(e){ return null; }
  }
  async function fetchNextEntry(){
    try{
      const r = await fetch(CAL_API, { cache:"no-store" });
      if (!r.ok) return null;
      const d = await r.json();
      const now = Date.now();
      const future = (d.entries || [])
        .map(e => {
          const when = toDate(e.date, e.time);
          return when ? { title:(e.title||"Nächster Stream"), when, image:(e.image||""), track:(e.track||"") } : null;
        })
        .filter(e => e && e.when.getTime() > now)
        .sort((a,b) => a.when - b.when);
      return future[0] || null;
    }catch(e){ return null; }
  }
  function toDate(date, time){
    if (!date) return null;
    const dp = String(date).split("-").map(Number);
    if (dp.length < 3 || !dp[0]) return null;
    const tp = String(time || "00:00").split(":").map(Number);
    const dt = new Date(dp[0], (dp[1]||1)-1, dp[2]||1, tp[0]||0, tp[1]||0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  /* ---------- Render ---------- */
  function renderLive(stream){
    const frame = $("liveFrame");
    if (frame && stream.videoId){
      frame.src = "https://www.youtube.com/embed/" + stream.videoId + "?autoplay=1&mute=1&rel=0&playsinline=1";
    }
    showState("live");
  }

  function renderUpcoming(entry, stream){
    const t = $("bcTitle"); if (t) t.textContent = entry.title || "Stream";

    // Thumbnail: zuerst YouTube (vom Worker), sonst Bild aus dem Kalendereintrag
    const thumb = (stream && stream.thumbnail) ? stream.thumbnail : (entry.image || "");
    const thumbLink = $("bcThumbLink"), thumbImg = $("bcThumb");
    if (thumbLink && thumbImg && thumb){ thumbImg.src = thumb; thumbLink.hidden = false; }
    else if (thumbLink){ thumbLink.hidden = true; }

    const videoId = (stream && stream.videoId) ? stream.videoId : "";
    const remind = $("bcRemind");
    if (remind) remind.href = videoId ? ("https://www.youtube.com/watch?v=" + videoId) : YT_CHANNEL;

    const when = $("bcWhen");
    if (when && entry.when){
      when.textContent = entry.when.toLocaleString("de-DE",{
        weekday:"long", day:"2-digit", month:"long", hour:"2-digit", minute:"2-digit"
      }) + " Uhr";
    }

    showState("upcoming");

    if (countdownTimer) clearInterval(countdownTimer);
    const target = entry.when;
    function tick(){
      const diff = target - new Date();
      if (diff <= 0){ clearInterval(countdownTimer); refresh(); return; }
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

  /* ---------- Steuerung ---------- */
  async function refresh(){
    if (!document.getElementById("broadcast")) return;

    const [stream, next] = await Promise.all([ fetchStream(), fetchNextEntry() ]);

    // 1) Wirklich live? -> ON AIR
    if (stream && stream.state === "live"){ renderLive(stream); return; }

    // 2) Nächster Kalender-Termin -> Countdown (mit YT-Thumbnail)
    let entry = next;
    // Sicherheitsnetz: kein Kalender-Eintrag, aber Worker kennt einen Upcoming
    if (!entry && stream && stream.state === "upcoming" && stream.scheduledStart){
      const w = new Date(stream.scheduledStart);
      if (!isNaN(w.getTime())) entry = { title: stream.title || "Nächster Stream", when: w, image: stream.thumbnail || "" };
    }
    if (entry){ renderUpcoming(entry, stream); return; }

    // 3) Nichts geplant
    showState("offline");
  }

  refresh();
  setInterval(refresh, POLL_MS);
})();
