/* ===========================================================
   BROADCAST-STATUS — Live / Countdown (Startseite)
   ------------------------------------------------------------
   • "ON AIR" (echt live) meldet der kreids888-live-Worker —
     wird IMMER gezeigt.
   • "Stream angekündigt" (Countdown) kommt aus dem STREAMKALENDER
     (Dashboard, /api/calendar) und erscheint NUR, wenn
       - der Streamkalender im Dashboard eingeschaltet ist UND
       - ein Thumbnail da ist: eigenes YouTube-Thumbnail des
         geplanten Streams ODER Bild-URL beim Kalender-Termin.
   • Sonst ist der ganze Block ausgeblendet.

   (Alles in einer IIFE gekapselt -> keine globalen Namen,
    keine Konflikte mit anderen Scripts.)
   =========================================================== */
(function () {
  const CAL_API        = "https://kreids888-admin.kreids.workers.dev/api/calendar"; // Streamkalender
  const THUMB_API      = "https://kreids888-admin.kreids.workers.dev/api/thumb/";   // YouTube-Thumbnail (nur eigenes)
  const STREAM_API_URL = "https://kreids888-live.kreids.workers.dev/";               // Live/Upcoming
  const YT_CHANNEL     = "https://youtube.com/@Kreids888";
  const POLL_MS        = 90_000;

  let countdownTimer = null;

  function $(id){ return document.getElementById(id); }
  function pad(n){ return String(n).padStart(2,"0"); }

  function setVisible(on){
    const s = $("broadcast");
    if (s) s.style.display = on ? "" : "none";
  }
  function hideAll(){
    if (countdownTimer){ clearInterval(countdownTimer); countdownTimer = null; }
    setVisible(false);
  }

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
  async function fetchCal(){
    try{
      const r = await fetch(CAL_API, { cache:"no-store" });
      if (!r.ok) return { enabled:true, next:null };
      const d = await r.json();
      const now = Date.now();
      const future = (d.entries || [])
        .map(e => {
          const when = toDate(e.date, e.time);
          return when ? { title:(e.title||"Nächster Stream"), when, image:(e.image||""), track:(e.track||"") } : null;
        })
        .filter(e => e && e.when.getTime() > now)
        .sort((a,b) => a.when - b.when);
      return { enabled: d.enabled !== false, next: future[0] || null };
    }catch(e){ return { enabled:true, next:null }; }
  }
  function toDate(date, time){
    if (!date) return null;
    const dp = String(date).split("-").map(Number);
    if (dp.length < 3 || !dp[0]) return null;
    const tp = String(time || "00:00").split(":").map(Number);
    const dt = new Date(dp[0], (dp[1]||1)-1, dp[2]||1, tp[0]||0, tp[1]||0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Lädt ein Bild testweise: gibt die URL zurück, wenn wirklich ein Bild kommt
  // (kein Fehler, kein graues 120x90-Platzhalterbild), sonst null.
  function probe(url){
    return new Promise(res=>{
      if (!url) return res(null);
      const im = new Image();
      im.onload  = () => res(im.naturalWidth > 120 ? url : null);
      im.onerror = () => res(null);
      im.src = url;
    });
  }

  /* ---------- Render ---------- */
  function renderLive(stream){
    if (countdownTimer){ clearInterval(countdownTimer); countdownTimer = null; }
    const wrap = $("liveWrap");
    if (wrap && stream.videoId && wrap.dataset.id !== stream.videoId){
      wrap.dataset.id = stream.videoId;
      ytKlick(wrap, stream.videoId, { label:"Livestream ansehen", title:"Kreids888 Livestream" });
    }
    showState("live");
    setVisible(true);
  }

  function renderUpcoming(entry, stream, thumb){
    const t = $("bcTitle"); if (t) t.textContent = entry.title || "Stream";

    const thumbLink = $("bcThumbLink"), thumbImg = $("bcThumb");
    if (thumbImg && thumbImg.getAttribute("src") !== thumb) thumbImg.src = thumb;
    if (thumbLink) thumbLink.hidden = false;

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
    setVisible(true);

    if (countdownTimer) clearInterval(countdownTimer);
    const target = entry.when;
    function tick(){
      const diff = target - new Date();
      if (diff <= 0){ clearInterval(countdownTimer); countdownTimer = null; refresh(); return; }
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
    if (!$("broadcast")) return;

    const [stream, cal] = await Promise.all([ fetchStream(), fetchCal() ]);

    // 1) Wirklich live? -> ON AIR (immer)
    if (stream && stream.state === "live"){ renderLive(stream); return; }

    // 2) Streamkalender im Dashboard aus -> Block weg
    if (!cal.enabled){ hideAll(); return; }

    // 3) Nächster Kalender-Termin (Sicherheitsnetz: Upcoming vom Worker)
    let entry = cal.next;
    if (!entry && stream && stream.state === "upcoming" && stream.scheduledStart){
      const w = new Date(stream.scheduledStart);
      if (!isNaN(w.getTime())) entry = { title: stream.title || "Nächster Stream", when: w, image: "" };
    }
    if (!entry){ hideAll(); return; }

    // 4) Nur mit Thumbnail: zuerst eigenes YouTube-Thumbnail, sonst Bild aus dem Kalender
    const ytUrl = (stream && stream.videoId) ? THUMB_API + encodeURIComponent(stream.videoId) + "?f=max" : "";
    const thumb = (await probe(ytUrl)) || (await probe(entry.image));
    if (!thumb){ hideAll(); return; }

    renderUpcoming(entry, stream, thumb);
  }

  refresh();
  setInterval(refresh, POLL_MS);
})();
