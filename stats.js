/* ===========================================================
   FAHRERSTATISTIKEN — für die Startseite (index.html)
   ------------------------------------------------------------
   RECHERCHE-ERGEBNIS (Stand: Erstellung dieses Scripts):
   Die Fahrer-Seite von Snail Pace Racing
     https://snailpaceracing.org/fahrer/#fahrer/c:1123750
   ist eine Single-Page-App. Die Tabelle wird NICHT serverseitig
   gefüllt, sondern erst per JavaScript im Browser des Nutzers
   nachgeladen — eine öffentliche JSON-/REST-API war nicht
   auffindbar. Ein direkter fetch() von dieser Seite aus schlägt
   deshalb in der Praxis meist fehl (CORS: der fremde Server
   erlaubt keine Cross-Origin-Anfragen von dieser Domain aus).

   DAHER macht dieses Script Folgendes:
   1) Es versucht trotzdem automatisch zu laden (falls
      snailpaceracing.org zukünftig CORS erlaubt oder eine API
      bereitstellt, greift das automatisch — kein Code-Umbau nötig).
   2) Schlägt das fehl, wird NICHTS erfunden. Stattdessen bleiben
      die Karten leer ("–"), bis du die Zahlen unten manuell
      einträgst.

   SO TRÄGST DU DEINE ZAHLEN MANUELL EIN:
   Einfach die Werte im Objekt MANUAL_STATS unten ausfüllen
   (Zahlen ohne Anführungszeichen). Beispiel:
     starts: 84,
   Fertig — die Seite zählt die Zahl beim Scrollen automatisch hoch.
   =========================================================== */

// Trag hier deine aktuellen Werte ein, sobald du sie von
// https://snailpaceracing.org/fahrer/#fahrer/c:1123750 abgelesen hast.
// null = "noch keine Daten" -> Karte zeigt einen Strich (–) statt einer Zahl.
const MANUAL_STATS = {
  starts:   null,   // z.B. 84
  siege:    null,   // z.B. 12
  podien:   null,   // z.B. 27
  poles:    null,   // z.B. 6
  fastlaps: null,   // z.B. 9
  avgplace: null,   // z.B. 4.8  (Durchschnittsplatz, Dezimalzahl erlaubt)
};

// Experimenteller Live-Fetch-Versuch (siehe Hinweis oben zu CORS/SPA).
const STATS_SOURCE_URL = "https://snailpaceracing.org/fahrer/#fahrer/c:1123750";
const DRIVER_CUST_ID   = "1123750";

/**
 * Versucht, Rohdaten von der Snail-Pace-Racing-Seite zu holen und
 * daraus die Kennzahlen zu extrahieren (HTML-Tabelle auslesen,
 * falls kein JSON zurückkommt). Wirft einen Fehler, wenn es nicht
 * klappt — wird von init() abgefangen.
 */
async function tryLoadLiveStats() {
  const res = await fetch(STATS_SOURCE_URL, { mode: "cors" });
  if (!res.ok) throw new Error("HTTP " + res.status);

  const contentType = res.headers.get("content-type") || "";

  // Fall A: die Seite liefert direkt JSON -> einfach durchreichen.
  if (contentType.includes("application/json")) {
    const data = await res.json();
    return normalizeApiPayload(data);
  }

  // Fall B: HTML zurückbekommen -> Statistik-Tabelle selbst auslesen.
  const html = await res.text();
  return parseStatsFromHtml(html);
}

/** Passt ein mögliches zukünftiges JSON-Format grob an unsere Keys an. */
function normalizeApiPayload(data) {
  return {
    starts:   data.starts   ?? data.Starts   ?? null,
    siege:    data.siege    ?? data.wins     ?? data.Siege ?? null,
    podien:   data.podien   ?? data.podiums  ?? data.Top3  ?? null,
    poles:    data.poles    ?? data.polePositions ?? null,
    fastlaps: data.fastlaps ?? data.fastestLaps    ?? null,
    avgplace: data.avgplace ?? data.avgPlace       ?? null,
  };
}

/**
 * Liest die Statistik-Tabelle aus dem rohen HTML der Fahrerseite.
 * Da die Tabelle laut Recherche erst per JS im Browser befüllt wird,
 * liefert ein einfacher fetch() hier meist noch leere <td>-Zellen —
 * diese Funktion ist trotzdem vorbereitet, falls sich das ändert.
 */
function parseStatsFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("table tr")];

  // Suche die Zeile des Fahrers über seine Kundennummer im Link/Attribut.
  const row = rows.find(r => r.innerHTML.includes(DRIVER_CUST_ID));
  if (!row) throw new Error("Fahrerzeile nicht im HTML gefunden (SPA lädt clientseitig)");

  const cells = [...row.querySelectorAll("td")].map(td => td.textContent.trim());
  // Spaltenreihenfolge laut Tabellenkopf: Fahrer, Serien, Starts, Siege, Top3, Top10, Runden, Inc., DNF, DNS, ABM
  return {
    starts:   toNum(cells[2]),
    siege:    toNum(cells[3]),
    podien:   toNum(cells[4]),
    poles:    null,     // nicht in dieser Tabelle enthalten
    fastlaps: null,     // nicht in dieser Tabelle enthalten
    avgplace: null,     // nicht in dieser Tabelle enthalten
  };
}

function toNum(v) {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Zählt einen Kartenwert von 0 auf sein Ziel hoch (reines JS, keine Library). */
function animateCount(el, target, decimals) {
  const duration = 1200;
  const start = performance.now();
  const format = n => decimals ? n.toFixed(decimals) : Math.round(n).toString();

  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out
    el.textContent = format(target * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/** Füllt die Stat-Karten mit den geladenen Werten und startet die Animation
 *  erst, sobald die Karten in den sichtbaren Bereich scrollen. */
function renderStats(stats) {
  const grid = document.getElementById("statsGrid");
  if (!grid) return;

  const boxes = grid.querySelectorAll(".stat-box");
  boxes.forEach(box => {
    const key = box.dataset.key;
    const valueEl = box.querySelector(".stat-value");
    const value = stats[key];
    const decimals = valueEl.dataset.decimal ? parseInt(valueEl.dataset.decimal, 10) : 0;

    if (value === null || value === undefined) {
      valueEl.textContent = "–"; // Platzhalter, bis echte Daten vorliegen
      return;
    }
    valueEl.dataset.target = value;
    valueEl.dataset.decimal = decimals;
    valueEl.textContent = "0";
  });

  // Count-up erst auslösen, wenn der Bereich sichtbar ist.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll(".stat-value").forEach(valueEl => {
        const target = parseFloat(valueEl.dataset.target);
        if (Number.isFinite(target)) {
          animateCount(valueEl, target, parseInt(valueEl.dataset.decimal, 10) || 0);
        }
      });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  observer.observe(grid);
}

function setStatus(text, mode) {
  const el = document.getElementById("statsStatus");
  if (!el) return;
  el.textContent = "· " + text;
  el.classList.remove("is-live", "is-fallback");
  el.classList.add(mode === "live" ? "is-live" : "is-fallback");
}

async function initStats() {
  if (!document.getElementById("statsGrid")) return; // nur auf der Startseite aktiv

  try {
    const live = await tryLoadLiveStats();
    const hasAnyValue = Object.values(live).some(v => v !== null && v !== undefined);
    if (!hasAnyValue) throw new Error("Keine Werte im Ergebnis");

    renderStats(live);
    setStatus("live geladen", "live");
  } catch (err) {
    // Kein Fehler-Alarm für Besucher — nur leise im Devtools-Log sichtbar.
    console.info("[Fahrerstatistik] Automatisches Laden nicht möglich, nutze manuelle Werte:", err.message);
    renderStats(MANUAL_STATS);

    const hasManualValues = Object.values(MANUAL_STATS).some(v => v !== null);
    setStatus(hasManualValues ? "manuell gepflegt" : "Werte bitte in stats.js eintragen", "fallback");
  }
}

initStats();
