/* ===========================================================
   SHORTS — die letzten 5 Shorts nebeneinander, der neueste mit
   rotem Rahmen + „NEU“. Jeder Short startet erst nach Klick
   direkt an Ort und Stelle (Datenschutz: vorher kein YouTube).
   Daten kommen aus dem Dashboard (/api/shorts, auto oder manuell).
   Bereich bleibt versteckt, wenn es keine Shorts gibt.
   =========================================================== */
(function(){
  var sec = document.getElementById("shortsSection");
  var row = document.getElementById("shortRow");
  if (!sec || !row) return;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function datum(d){
    var t = Date.parse(d || ""); if (isNaN(t)) return "";
    var tage = Math.floor((Date.now() - t) / 864e5);
    if (tage <= 0) return "heute";
    if (tage === 1) return "gestern";
    if (tage < 30) return "vor " + tage + " Tagen";
    return new Date(t).toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });
  }

  fetch(ADMIN_API + "/api/shorts").then(function(r){ return r.json(); }).then(function(d){
    var items = ((d && d.items) || []).filter(function(it){ return it && it.id; }).slice(0, 5);
    if (!items.length){ sec.style.display = "none"; return; }
    row.innerHTML = items.map(function(it, i){
      return '<div class="sh3' + (i === 0 ? ' neu' : '') + '">' +
        '<div class="sh3-media">' + (i === 0 ? '<span class="sh3-badge">NEU</span>' : '') + '<div class="sh3-player"></div></div>' +
        '<div class="sh3-cap"><b>' + esc(it.title || "Short") + '</b>' + (it.date ? '<small>' + esc(datum(it.date)) + '</small>' : '') + '</div>' +
      '</div>';
    }).join("");
    row.querySelectorAll(".sh3").forEach(function(el, i){
      var media = el.querySelector(".sh3-media");
      ytKlick(el.querySelector(".sh3-player"), items[i].id, { art:"short", label:"Short abspielen", title: items[i].title || "Short" });
      media.addEventListener("click", function(){ media.classList.add("spielt"); });
    });
    sec.style.display = "";
  }).catch(function(){ sec.style.display = "none"; });
})();
