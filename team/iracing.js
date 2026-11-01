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
  const V = { tab: "alle", kat: "Sports Car", sort: "datum", suche: "", mehr: 0 };
  const KATS = [["Sports Car", "Sports Car"], ["Formula Car", "Formula"], ["Oval", "Oval"], ["Dirt", "Dirt"], ["", "Alle Klassen"]];
  // BoP-Kürzel aus dem Season-PDF
  const AUTO = {
    MGT3E: "Mercedes-AMG GT3", "720GT3": "McLaren 720S GT3 EVO", F296: "Ferrari 296 GT3", AMGT3: "Aston Martin Vantage GT3 EVO", AEVO2: "Audi R8 LMS EVO II",
    NSXE22: "Acura NSX GT3 EVO 22", M4GT3: "BMW M4 GT3 EVO", LGT3: "Lamborghini Huracán GT3 EVO", CZ06: "Corvette Z06 GT3.R", "992R": "Porsche 911 GT3 R (992)",
    FMGT3: "Ford Mustang GT3", BMWGT4: "BMW M4 GT4 Evo", AMV4: "Aston Martin Vantage GT4", P718: "Porsche 718 Cayman GT4", MGT4: "Mercedes-AMG GT4",
    FMGT4: "Ford Mustang GT4", M570S: "McLaren 570S GT4", HECN7: "Hyundai Elantra N TCR", ARS3G2: "Audi RS3 LMS TCR", HCTR: "Honda Civic Type R TCR",
    BMWM2R: "BMW M2 Racing", GR86: "Toyota GR86", RENC: "Renault Clio", MX5: "Mazda MX-5 Cup", P217: "Dallara P217 LMP2", F499P: "Ferrari 499P",
    AMGTPV: "Aston Martin Valkyrie", PGTP: "Porsche 963 GTP", CGTP: "Cadillac V-Series.R", BMWGTP: "BMW M Hybrid V8", AGTP: "Acura ARX-06"
  };
  const pad = (n) => String(n).padStart(2, "0");
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const lokalTag = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const lokalZeit = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const utcTag = (iso) => Date.parse(iso + "T00:00:00Z");
  const plusTage = (iso, n) => new Date(utcTag(iso) + n * 864e5).toISOString().slice(0, 10);
  const fmtTag = (iso) => new Date(iso + "T12:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const dauerTxt = (x) => x.min ? (x.min >= 60 ? Math.floor(x.min / 60) + " h" + (x.min % 60 ? " " + (x.min % 60) + " min" : "") : x.min + " min") : x.laps ? x.laps + " Runden" : x.h ? x.h + " h" : "";
  const klasseRang = (c) => { const m = String(c || "").match(/^([A-D]|Rookie)/); return m ? "ABCDRookie".indexOf(m[1]) : 99; };
  const passtKat = (cat) => !V.kat || (V.kat === "Dirt" ? /dirt/i.test(cat || "") : cat === V.kat);

  function laden() {
    if (DATEN) return Promise.resolve(DATEN);
    if (!LAEDT) LAEDT = fetch(URL, { cache: "no-cache" })
      .then(r => { if (!r.ok) throw new Error("iRacing-Zeitplan nicht erreichbar (" + r.status + ")"); return r.json(); })
      .then(d => (DATEN = d))
      .finally(() => { LAEDT = null; });
    return LAEDT;
  }

  // Startzeiten (UTC) eines periodischen Rhythmus an einem Tag der Rennwoche (ältere Daten)
  function periodisch(p, wocheIso) {
    const tag = utcTag(plusTage(wocheIso, 3));
    const out = [];
    for (let m = p.step === 120 ? (p.par || 0) * 60 : 0; m < 1440; m += p.step) {
      for (const off of p.offs) {
        const min = m + off;
        if (min < 1440 && (p.step < 60 || off < p.step)) out.push(tag + min * 60000);
      }
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }

  // Auswählbare Rennen: Teamrennen (pro Serie nur das aktuelle) und Special Events, nur kommende
  function eintraege(d) {
    const jetzt = Date.now(), heute = lokalTag(jetzt);
    const out = [];
    for (const x of d.specials || []) {
      if (x.bis < heute || x.api) continue; // x.api: kommt schon mit Startzeiten aus der API
      const slots = Array.isArray(x.slots) ? x.slots : [];
      out.push({ art: "special", sp: true, key: "sp:" + x.id + ":" + x.von, sort: slots.length ? slots[0] : utcTag(x.von), titel: x.n, sub: x.tag ? x.tag.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "Special Event", cat: x.cat || "", cls: "", von: x.von, bis: x.bis, h: x.h, laps: x.laps, slots, std: !!x.std, ort: (x.orte || [])[0] || "", orte: x.orte || [], autos: x.autos || "", txt: x.txt || "" });
    }
    for (const s of d.serien || []) {
      if (!s.team && !s.sp) continue;
      const kommend = s.w.filter(w => (w.s && w.s.length ? w.s[w.s.length - 1] + (w.min || 60) * 60000 : utcTag(plusTage(w.d, 7))) >= jetzt);
      for (const w of s.sp ? kommend : kommend.slice(0, 1)) {
        out.push({ art: "serie", sp: !!s.sp, key: "se:" + s.n + ":" + w.nr + ":" + w.d, sort: w.s && w.s.length ? w.s[0] : utcTag(w.d), titel: s.n, sub: s.sp ? "Special Event" : [s.cat, s.cls, "Woche " + w.nr].filter(Boolean).join(" · "), cat: s.cat || "", cls: s.cls || "", serie: s, w, ort: w.t, autos: s.cars || "" });
      }
    }
    return out;
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

  // Startzeitpunkte (UTC) eines Eintrags
  function starts(e) {
    if (e.art === "special") return e.slots;
    if (e.w.s && e.w.s.length) return e.w.s;
    return e.serie.p ? periodisch(e.serie.p, e.w.d) : [];
  }

  // Eintrag → Felder für den Assistenten
  function alsEvent(e, tracks) {
    if (e.art === "special") {
      const ev = { name: e.titel.slice(0, 80), ...strecke(tracks, e.orte), von: e.von, bis: e.bis, zeiten: [] };
      if (e.laps) { ev.mode = "runden"; ev.runden = e.laps; } else { ev.mode = "zeit"; ev.dauerMin = e.h ? e.h * 60 : 360; }
      const hin = ["Special Event aus dem offiziellen iRacing-Kalender."];
      if (e.slots.length) {
        ev.von = lokalTag(e.slots[0]); ev.bis = lokalTag(e.slots[e.slots.length - 1]);
        ev.zeiten = [...new Set(e.slots.map(lokalZeit))].sort();
        ev.slots = e.slots.slice(0, 48);
        hin.push("Voraussichtliche Zeitfenster: iRacing nutzt bei Team-Specials fast immer diese Standardzeiten (in deiner Ortszeit). Bitte mit der Ankündigung abgleichen.");
      } else hin.push("Die Startzeiten veröffentlicht iRacing in der Ankündigung, bitte unten eintragen.");
      if (!e.h && !e.laps) hin.push("Die Renndauer bitte prüfen.");
      if (!e.orte.length) hin.push("Die Strecke nennt iRacing noch nicht.");
      ev.hinweis = hin.join(" ");
      return ev;
    }
    const s = e.serie, w = e.w;
    const ort = w.t.split(" - ")[0];
    const ev = { name: (s.sp || !ort ? s.n : s.n + " · " + ort).slice(0, 80), ...strecke(tracks, [w.t]) };
    if (w.laps) { ev.mode = "runden"; ev.runden = w.laps; } else { ev.mode = "zeit"; ev.dauerMin = w.min || 60; }
    const st = starts(e);
    if (w.s && w.s.length) {
      ev.von = lokalTag(st[0]); ev.bis = lokalTag(st[st.length - 1]);
      ev.zeiten = [...new Set(st.map(lokalZeit))].sort();
      ev.slots = st.slice(0, 48); // feste Zeitfenster: Tag und Uhrzeit gehören zusammen
      ev.hinweis = "Zeitfenster aus dem offiziellen iRacing-Zeitplan, umgerechnet in deine Ortszeit.";
    } else if (st.length) {
      ev.von = w.d; ev.bis = plusTage(w.d, 6);
      let z = [...new Set(st.map(lokalZeit))].sort();
      if (z.length > 24) z = z.filter(x => x >= "17:00");
      ev.zeiten = z;
      ev.hinweis = "Rennen laufen die ganze Woche. Startzeiten in deiner Ortszeit, nicht passende einfach entfernen.";
    } else {
      ev.von = w.d; ev.bis = plusTage(w.d, 6); ev.zeiten = [];
      ev.hinweis = "Für diese Serie stehen keine festen Startzeiten im Zeitplan" + (s.takt ? " (" + s.takt + ")" : "") + ". Bitte unten eintragen.";
    }
    return ev;
  }

  // Startzeiten nach Tagen: „Sa 31.10.: 10:00, 20:00 · So 01.11.: 18:00"
  function startText(st) {
    if (!st.length) return "";
    if (st.length > 8) return "Rennen die ganze Woche, " + [...new Set(st.map(lokalZeit))].slice(0, 6).join(", ") + " …";
    const tage = new Map();
    for (const t of st) { const k = lokalTag(t); if (!tage.has(k)) tage.set(k, []); tage.get(k).push(lokalZeit(t)); }
    return [...tage].map(([k, z]) => fmtTag(k) + ": " + z.join(", ")).join(" · ");
  }
  function wetterChips(wx) {
    if (!wx) return [];
    const out = [];
    if (wx.c != null) out.push("🌡 " + wx.c + " °C");
    if (wx.r === 0) out.push("☀ trocken"); else if (wx.r === -1) out.push("🌦 Regen möglich"); else if (wx.r > 0) out.push("🌧 Regen " + wx.r + " %");
    if (wx.st) out.push(wx.st === "s" ? "Stehender Start" : "Fliegender Start");
    if (wx.gelb) out.push({ lokal: "Gelb lokal", voll: "Full Course Yellow", aus: "Ohne Gelbphasen" }[wx.gelb]);
    if (wx.fmin || wx.fmax) out.push((wx.fmin || 1) + "–" + (wx.fmax || "?") + " Fahrer");
    return out;
  }
  const zahl = (v, einheit) => v == null ? "–" : (v > 0 && einheit !== "%" ? "+" : "") + String(v).replace(".", ",") + " " + einheit;

  function zeichne(el, o, d) {
    const esc = o.C.esc;
    const q = norm(V.suche);
    const passend = eintraege(d).filter(e => (V.tab === "special" ? e.sp : V.tab === "team" ? !e.sp : true)
      && passtKat(e.cat)
      && (!q || norm(e.titel + " " + e.ort + " " + e.sub + " " + e.autos).includes(q)))
      .sort((a, b) => V.sort === "klasse" ? (klasseRang(a.cls) - klasseRang(b.cls)) || (a.sort - b.sort) : a.sort - b.sort);
    const max = 60 + V.mehr * 60;
    const zeile = (e) => {
      const st = starts(e);
      const wann = e.art === "special" && !st.length
        ? fmtTag(e.von) + (e.bis !== e.von ? " – " + fmtTag(e.bis) : "")
        : st.length && (e.art === "special" || e.w.s) ? fmtTag(lokalTag(st[0])) + (lokalTag(st[st.length - 1]) !== lokalTag(st[0]) ? " – " + fmtTag(lokalTag(st[st.length - 1])) : "")
        : "Woche ab " + fmtTag(e.w.d);
      const dauer = e.art === "special" ? dauerTxt(e) : dauerTxt(e.w);
      const zeiten = e.art === "special" ? (st.length ? startText(st) + " (voraussichtlich)" : "Startzeiten folgen in der iRacing-Ankündigung") : startText(st) || "Keine festen Startzeiten im Zeitplan";
      const chips = e.art === "special" ? [] : wetterChips(e.w.wx);
      const bop = e.art === "special" ? [] : e.w.bop || [];
      return `<div class="ir-item${e.sp ? " sp" : ""}">
        <button type="button" class="ir-main" data-ir="${esc(e.key)}" title="Übernehmen">
          <span class="ir-wann">${esc(wann)}</span>
          <span class="ir-was"><b>${esc(e.titel)}</b><small>${esc(e.sub)}</small></span>
          <span class="ir-ort">${esc(e.ort || "Strecke folgt")}</span>
          <span class="ir-dauer">${esc(dauer || "–")}</span>
          <span class="ir-info">
            <span class="ir-zeiten">🕒 ${esc(zeiten)}</span>
            ${chips.length ? `<span class="ir-chips">${chips.map(c => `<i>${esc(c)}</i>`).join("")}</span>` : ""}
            ${e.autos ? `<span class="ir-autos">🏎 ${esc(e.autos)}</span>` : ""}
          </span>
        </button>
        ${bop.length ? `<details class="ir-bop"><summary>BoP (${bop.length} Fahrzeuge)</summary>
          <table><thead><tr><th>Fahrzeug</th><th>Sprit</th><th>Gewicht</th><th>Leistung</th></tr></thead><tbody>
          ${bop.map(([k, f, kg, p]) => `<tr><td>${esc(AUTO[k] || k)}</td><td>${f == null ? "–" : f + " %"}</td><td>${zahl(kg, "kg")}</td><td>${p == null ? "–" : (p > 0 ? "+" : "") + String(p).replace(".", ",") + " %"}</td></tr>`).join("")}
          </tbody></table></details>` : ""}
      </div>`;
    };
    const tabs = [["alle", "Alle"], ["team", "Teamrennen"], ["special", "Special Events"]];
    el.innerHTML = `
      <div class="ir-kopf">
        <div class="sp-seg" id="ir-tabs">${tabs.map(([k, l]) => `<button type="button" data-t="${k}" class="${V.tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
        <input class="tm-input" id="ir-suche" type="search" placeholder="Serie oder Strecke suchen …" value="${esc(V.suche)}">
      </div>
      <div class="ir-kopf">
        <div class="sp-seg ir-kat" id="ir-kat">${KATS.map(([k, l]) => `<button type="button" data-k="${k}" class="${V.kat === k ? "on" : ""}">${l}</button>`).join("")}</div>
        <label class="ir-sort">Sortieren <select class="tm-select" id="ir-sort"><option value="datum" ${V.sort === "datum" ? "selected" : ""}>nach Datum</option><option value="klasse" ${V.sort === "klasse" ? "selected" : ""}>nach Klasse</option></select></label>
      </div>
      <div class="ir-liste">${passend.slice(0, max).map(zeile).join("") || '<p class="tm-muted">Nichts gefunden.</p>'}</div>
      ${passend.length > max ? `<button type="button" class="tm-btn sm" id="ir-mehr"><span>Mehr anzeigen (${passend.length - max} weitere)</span></button>` : ""}
      <p class="tm-muted ir-fuss">Antippen übernimmt das Rennen. Teamrennen ${esc(d.saison || "")} aus ${esc(typeof d.quelle === "string" ? d.quelle : "dem iRacing Season-PDF")}, Special Events von iracing.com, Stand ${d.stand ? new Date(d.stand).toLocaleDateString("de-DE") : "unbekannt"}. Was fehlt, legst du wie gewohnt von Hand an.</p>
      <div class="sp-wz-nav"><button type="button" class="tm-btn" id="ir-zurueck"><span>← Von Hand eintragen</span></button><span></span></div>`;
    const map = new Map(passend.map(e => [e.key, e]));
    el.querySelectorAll("#ir-tabs [data-t]").forEach(b => b.onclick = () => { V.tab = b.dataset.t; V.mehr = 0; zeichne(el, o, d); });
    el.querySelectorAll("#ir-kat [data-k]").forEach(b => b.onclick = () => { V.kat = b.dataset.k; V.mehr = 0; zeichne(el, o, d); });
    el.querySelector("#ir-sort").onchange = (ev) => { V.sort = ev.target.value; zeichne(el, o, d); };
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
