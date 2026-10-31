/* ===========================================================
   iRACING-AUSWAHL  Flag to Flag Motorsport
   Offizielle Teamrennen und Special Events aus /team/iracing.json –
   die Datei aktualisiert eine GitHub Action täglich aus der
   iRacePlan-API bzw. dem iRacing Season-PDF (tools/iracing-sync.mjs).
   Kostet keine Cloudflare-Anfragen.
   Wird vom Stintplaner-Assistenten genutzt:
   window.F2FIracing.zeige(el, { C, tracks, onPick, onZurueck })
   =========================================================== */
(function () {
  const URL = "/team/iracing.json";
  let DATEN = null, LAEDT = null;
  const V = { tab: "alle", suche: "", mehr: 0 };
  const pad = (n) => String(n).padStart(2, "0");
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const lokalTag = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const lokalZeit = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const utcTag = (iso) => Date.parse(iso + "T00:00:00Z");
  const plusTage = (iso, n) => new Date(utcTag(iso) + n * 864e5).toISOString().slice(0, 10);
  const fmtTag = (iso) => new Date(iso + "T12:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const dauerTxt = (x) => x.min ? (x.min >= 60 ? Math.floor(x.min / 60) + " h" + (x.min % 60 ? " " + (x.min % 60) + " min" : "") : x.min + " min") : x.laps ? x.laps + " Runden" : x.h ? x.h + " h" : "";

  function laden() {
    if (DATEN) return Promise.resolve(DATEN);
    if (!LAEDT) LAEDT = fetch(URL, { cache: "no-cache" })
      .then(r => { if (!r.ok) throw new Error("iRacing-Zeitplan nicht erreichbar (" + r.status + ")"); return r.json(); })
      .then(d => (DATEN = d))
      .finally(() => { LAEDT = null; });
    return LAEDT;
  }

  // Startzeiten (UTC) eines periodischen Rhythmus an einem Tag der Rennwoche
  function periodisch(p, wocheIso) {
    const tag = utcTag(plusTage(wocheIso, 3));
    const out = [];
    // alle 2 Std.: gerade Stunden (Standard) oder ungerade („every odd 2 hours")
    for (let m = p.step === 120 ? (p.par || 0) * 60 : 0; m < 1440; m += p.step) {
      for (const off of p.offs) {
        const min = m + off;
        if (min < 1440 && (p.step < 60 || off < p.step)) out.push(tag + min * 60000);
      }
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }

  // Auswählbare Rennen: nur Teamrennen und Special Events, nur kommende
  function eintraege(d) {
    const jetzt = Date.now(), heute = lokalTag(jetzt);
    const out = [];
    for (const x of d.specials || []) {
      if (x.bis < heute || x.api) continue; // x.api: kommt schon mit Startzeiten aus der API
      out.push({ art: "special", sp: true, key: "sp:" + x.id + ":" + x.von, sort: utcTag(x.von), titel: x.n, sub: x.tag ? x.tag.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "Special Event", von: x.von, bis: x.bis, h: x.h, ort: (x.orte || [])[0] || "", orte: x.orte || [], txt: x.txt || "" });
    }
    for (const s of d.serien || []) {
      if (!s.team && !s.sp) continue;
      for (const w of s.w) {
        const ende = w.s && w.s.length ? w.s[w.s.length - 1] + (w.min || 60) * 60000 : utcTag(plusTage(w.d, 7));
        if (ende < jetzt) continue;
        out.push({ art: "serie", sp: !!s.sp, key: "se:" + s.n + ":" + w.nr + ":" + w.d, sort: w.s && w.s.length ? w.s[0] : utcTag(w.d), titel: s.n, sub: s.sp ? "Special Event" : (s.cat || "Teamrennen") + (s.cls ? " · " + s.cls : "") + " · Woche " + w.nr, serie: s, w, ort: w.t });
      }
    }
    return out.sort((a, b) => a.sort - b.sort);
  }

  // passende Strecke aus der Stintplaner-Streckenliste
  function strecke(tracks, kandidaten) {
    for (const k of kandidaten.filter(Boolean)) {
      const n = norm(k);
      const t = tracks.find(x => norm(x.name) === n)
        || tracks.find(x => norm(x.name).startsWith(n))
        || tracks.find(x => n.startsWith(norm(x.name)) && norm(x.name).length > 6)
        || tracks.find(x => norm(x.name).split(" ").slice(0, 3).join(" ") === n.split(" ").slice(0, 3).join(" "));
      if (t) return { trackId: t.id, trackName: t.name };
    }
    const roh = kandidaten.find(Boolean) || "";
    return { trackId: 0, trackName: roh };
  }

  // Eintrag → Felder für den Assistenten
  function alsEvent(e, tracks) {
    if (e.art === "special") {
      return {
        name: e.titel.slice(0, 80), ...strecke(tracks, e.orte),
        mode: "zeit", dauerMin: e.h ? e.h * 60 : 360,
        von: e.von, bis: e.bis, zeiten: [],
        hinweis: "Special Event aus dem offiziellen iRacing-Kalender. Die Startzeiten veröffentlicht iRacing in der Ankündigung, bitte unten eintragen." + (e.h ? "" : " Die Renndauer bitte prüfen.")
      };
    }
    const s = e.serie, w = e.w;
    const ort = w.t.split(" - ")[0];
    const ev = { name: (s.sp || !ort ? s.n : s.n + " · " + ort).slice(0, 80), ...strecke(tracks, [w.t]) };
    if (w.laps) { ev.mode = "runden"; ev.runden = w.laps; } else { ev.mode = "zeit"; ev.dauerMin = w.min || 60; }
    if (w.s && w.s.length) {
      ev.von = lokalTag(w.s[0]); ev.bis = lokalTag(w.s[w.s.length - 1]);
      ev.zeiten = [...new Set(w.s.map(lokalZeit))].sort();
      ev.hinweis = "Startzeiten aus dem offiziellen iRacing-Zeitplan, umgerechnet in deine Ortszeit.";
    } else if (s.p) {
      ev.von = w.d; ev.bis = plusTage(w.d, 6);
      let z = [...new Set(periodisch(s.p, w.d).map(lokalZeit))].sort();
      if (z.length > 24) z = z.filter(x => x >= "17:00");
      ev.zeiten = z;
      ev.hinweis = "Rennen laufen die ganze Woche (" + s.takt.replace(/^Races /i, "") + "). Startzeiten in deiner Ortszeit, nicht passende einfach entfernen.";
    } else {
      ev.von = w.d; ev.bis = plusTage(w.d, 6); ev.zeiten = [];
      ev.hinweis = "Für diese Serie stehen keine festen Startzeiten im Zeitplan" + (s.takt ? " (" + s.takt + ")" : "") + ". Bitte unten eintragen.";
    }
    return ev;
  }

  function zeichne(el, o, d) {
    const esc = o.C.esc;
    const alle = eintraege(d);
    const q = norm(V.suche);
    const passend = alle.filter(e => (V.tab === "special" ? e.sp : V.tab === "team" ? !e.sp : true)
      && (!q || norm(e.titel + " " + e.ort + " " + e.sub).includes(q)));
    const max = 60 + V.mehr * 60;
    const zeile = (e) => {
      const wann = e.art === "special"
        ? fmtTag(e.von) + (e.bis !== e.von ? " – " + fmtTag(e.bis) : "")
        : e.w.s && e.w.s.length ? fmtTag(lokalTag(e.w.s[0])) + (lokalTag(e.w.s[e.w.s.length - 1]) !== lokalTag(e.w.s[0]) ? " – " + fmtTag(lokalTag(e.w.s[e.w.s.length - 1])) : "")
        : "Woche ab " + fmtTag(e.w.d);
      const dauer = e.art === "special" ? dauerTxt(e) : dauerTxt(e.w);
      return `<button type="button" class="ir-item${e.sp ? " sp" : ""}" data-ir="${esc(e.key)}">
        <span class="ir-wann">${esc(wann)}</span>
        <span class="ir-was"><b>${esc(e.titel)}</b><small>${esc(e.sub)}</small></span>
        <span class="ir-ort">${esc(e.ort || "Strecke folgt")}</span>
        <span class="ir-dauer">${esc(dauer || "–")}</span>
      </button>`;
    };
    const tabs = [["alle", "Alle"], ["team", "Teamrennen"], ["special", "Special Events"]];
    el.innerHTML = `
      <div class="ir-kopf">
        <div class="sp-seg" id="ir-tabs">${tabs.map(([k, l]) => `<button type="button" data-t="${k}" class="${V.tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
        <input class="tm-input" id="ir-suche" type="search" placeholder="Serie oder Strecke suchen …" value="${esc(V.suche)}">
      </div>
      <div class="ir-liste">${passend.slice(0, max).map(zeile).join("") || '<p class="tm-muted">Nichts gefunden.</p>'}</div>
      ${passend.length > max ? `<button type="button" class="tm-btn sm" id="ir-mehr"><span>Mehr anzeigen (${passend.length - max} weitere)</span></button>` : ""}
      <p class="tm-muted ir-fuss">Teamrennen und Special Events ${esc(d.saison || "")} aus ${esc(typeof d.quelle === "string" ? d.quelle : "dem iRacing Season-PDF")} und von iracing.com, Stand ${d.stand ? new Date(d.stand).toLocaleDateString("de-DE") : "unbekannt"}. Was fehlt, legst du wie gewohnt von Hand an.</p>
      <div class="sp-wz-nav"><button type="button" class="tm-btn" id="ir-zurueck"><span>← Von Hand eintragen</span></button><span></span></div>`;
    const map = new Map(passend.map(e => [e.key, e]));
    el.querySelectorAll("#ir-tabs [data-t]").forEach(b => b.onclick = () => { V.tab = b.dataset.t; V.mehr = 0; zeichne(el, o, d); });
    const su = el.querySelector("#ir-suche");
    su.oninput = () => { V.suche = su.value; V.mehr = 0; const pos = su.selectionStart; zeichne(el, o, d); const n = el.querySelector("#ir-suche"); n.focus(); n.setSelectionRange(pos, pos); };
    const mehr = el.querySelector("#ir-mehr"); if (mehr) mehr.onclick = () => { V.mehr++; zeichne(el, o, d); };
    el.querySelector("#ir-zurueck").onclick = () => o.onZurueck && o.onZurueck();
    el.querySelectorAll("[data-ir]").forEach(b => b.onclick = () => { const e = map.get(b.dataset.ir); if (e) o.onPick(alsEvent(e, o.tracks || [])); });
  }

  async function zeige(el, o) {
    el.innerHTML = '<div class="tm-loading"><span></span><span></span><span></span></div>';
    try { zeichne(el, o, await laden()); }
    catch (e) { el.innerHTML = `<div class="tm-box tm-err">${o.C.esc(e.message)}</div><div class="sp-wz-nav"><button type="button" class="tm-btn" id="ir-zurueck"><span>← Von Hand eintragen</span></button><span></span></div>`; el.querySelector("#ir-zurueck").onclick = () => o.onZurueck && o.onZurueck(); }
  }

  window.F2FIracing = { zeige, _test: { eintraege, alsEvent, periodisch } };
})();
