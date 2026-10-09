/* ===========================================================
   SHORTS — neuester Short groß (startet erst nach Klick) +
   Liste mit weiteren Shorts als Direktlinks zu YouTube.
   Daten kommen aus dem Dashboard (/api/shorts, auto oder manuell).
   Bereich bleibt versteckt, wenn es keine Shorts gibt.
   =========================================================== */
(function(){
  var sec = document.getElementById("shortsSection");
  var main = document.getElementById("shortMain");
  var cap = document.getElementById("shortCap");
  var list = document.getElementById("shortList");
  if (!sec || !main || !list) return;

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
    var items = ((d && d.items) || []).filter(function(it){ return it && it.id; });
    if (!items.length){ sec.style.display = "none"; return; }
    var erst = items[0];
    ytKlick(main, erst.id, { art:"short", label:"Short abspielen", title: erst.title || "Short" });
    if (cap) cap.innerHTML = '<b>' + esc(erst.title || "Neuester Short") + '</b>' + (erst.date ? '<small>' + esc(datum(erst.date)) + '</small>' : "");
    var rest = items.slice(1, 6);
    list.innerHTML = rest.length ? rest.map(function(it){
      return '<a class="sh2-it" href="' + esc(it.url || ("https://youtube.com/shorts/" + it.id)) + '" target="_blank" rel="noopener">' +
        '<img src="' + ytThumb(it.id, "short") + '" alt="" loading="lazy">' +
        '<span class="sh2-tx"><b>' + esc(it.title || "Short ansehen") + '</b>' + (it.date ? '<small>' + esc(datum(it.date)) + '</small>' : "") + '</span>' +
        '<span class="sh2-go" aria-hidden="true">↗</span></a>';
    }).join("") : '<p class="sh2-leer">Bald mehr – schau auf YouTube vorbei.</p>';
    sec.style.display = "";
  }).catch(function(){ sec.style.display = "none"; });
})();
