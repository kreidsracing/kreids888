/* ===========================================================
   Willkommens-Block: Texte aus dem Dashboard laden.
   Fallback = der im HTML hinterlegte Text (bleibt, wenn
   das Dashboard nichts liefert oder offline ist).
   Bearbeitbar unter kreids888-admin -> Tab "Willkommen".
   =========================================================== */
(function () {
  var API = "https://kreids888-admin.kreids.workers.dev";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  // **fett** innerhalb einer Zeile
  function inline(s) {
    var parts = esc(s).split("**"), out = "";
    for (var i = 0; i < parts.length; i++) {
      out += (i % 2 ? "<strong>" + parts[i] + "</strong>" : parts[i]);
    }
    return out;
  }
  // Leerzeile = neuer Absatz
  function paragraphs(text) {
    return String(text == null ? "" : text)
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map(function (blk) { return blk.trim(); })
      .filter(Boolean)
      .map(function (blk) { return "<p>" + inline(blk.replace(/\n/g, "<br>")) + "</p>"; })
      .join("");
  }
  function setText(id, val) {
    if (val == null || val === "") return;
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setHTML(id, html) {
    if (!html) return;
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  fetch(API + "/api/welcome")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      setText("w-eyebrow", d.eyebrow);
      setText("w-heading", d.heading);
      setText("w-heading-red", d.headingRed);
      if (d.lead) setHTML("w-lead", inline(d.lead));
      setText("w-sub-muted", d.subMuted);
      setText("w-sub-strong", d.subStrong);
      setText("w-about-title", d.aboutTitle);
      if (d.aboutBody) setHTML("w-about-body", paragraphs(d.aboutBody));
    })
    .catch(function () { /* Fallback-Text bleibt stehen */ });
})();
