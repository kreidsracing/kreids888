/* ===========================================================
   LETZTER STREAM — zeigt das neueste veröffentlichte Video vom
   Kanal mit Titel + Link. Das Video startet erst nach Klick
   (Datenschutz: vorher keine Verbindung zu YouTube).
   ------------------------------------------------------------
   Die Video-Liste holt der Dashboard-Worker (/api/video) direkt
   von YouTube. Ein angekündigter/laufender Stream wird ausgelassen,
   der läuft schon oben im Broadcast-Block.
   =========================================================== */
(function(){
  var STATUS_URL = "https://kreids888-live.kreids.workers.dev/";
  var FALLBACK_VIDEO_ID = "Yvv1yh9lG0w";
  var box = document.getElementById("yt");
  if (!box) return;

  function zeige(id, title){ ytKlick(box, id, { label:"Video abspielen", title: title || "Kreids888 Video" }); }

  function ausgelassen(){
    return fetch(STATUS_URL, { cache:"no-store" }).then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){ return d && (d.state === "live" || d.state === "upcoming") ? (d.videoId || "") : ""; })
      .catch(function(){ return ""; });
  }

  zeige(FALLBACK_VIDEO_ID);
  ausgelassen().then(function(ohne){
    return fetch(ADMIN_API + "/api/video?ohne=" + encodeURIComponent(ohne)).then(function(r){ return r.json(); });
  }).then(function(d){
    var v = d && d.video;
    if (!v || !v.id) return;
    zeige(v.id, v.title);
    var t = document.getElementById("ytTitle"), l = document.getElementById("ytLink");
    if (t && v.title) t.textContent = v.title;
    if (l && v.link) l.href = v.link;
  }).catch(function(e){ console.info("[Video] Letztes Video nicht ladbar, nutze Fallback:", e.message); });
})();
