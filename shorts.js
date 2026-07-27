/* ===========================================================
   SHORTS — lädt die im Dashboard gewählten Shorts (auto/manuell)
   und zeigt sie als 9:16-Karten. Sektion bleibt versteckt, wenn
   keine Shorts vorhanden sind.
   =========================================================== */
(function(){
  var ADMIN_API = "https://kreids888-admin.kreids.workers.dev";
  var sec = document.getElementById("shortsSection");
  var row = document.getElementById("shortsRow");
  if (!sec || !row) return;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  fetch(ADMIN_API + "/api/shorts").then(function(r){ return r.json(); }).then(function(d){
    var items = (d && d.items) || [];
    if (!items.length){ sec.style.display = "none"; return; }
    row.innerHTML = items.map(function(it){
      return '<a class="short-card" href="'+esc(it.url)+'" target="_blank" rel="noopener">'+
        '<span class="short-play">▶</span>'+
        '<img src="'+esc(it.thumb)+'" alt="'+esc(it.title||"Short")+'" loading="lazy">'+
        (it.title ? '<span class="short-title">'+esc(it.title)+'</span>' : '')+
      '</a>';
    }).join("");
    sec.style.display = "";
  }).catch(function(){ sec.style.display = "none"; });
})();
