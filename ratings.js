/* ===========================================================
   RATINGS-WIDGET — iRating / Lizenz / Kategorie auf der Startseite.
   ------------------------------------------------------------
   HINTERGRUND ZUR DATENQUELLE:
   Die offizielle iRacing-Data-API vergibt aktuell KEINE neuen
   OAuth-Zugänge (Registrierung von iRacing pausiert, Stand der
   Recherche). Ein direkter Zugriff von dieser statischen Seite
   aus ist damit gerade nicht möglich — auch technisch nicht ohne
   Backend, da die API keine Zugangsdaten im Browser erlaubt.

   Garage61 (garage61.net) ist eine Alternative: eigene, aktuell
   offene Entwickler-API mit iRating-Daten pro Fahrer. ABER: auch
   dort braucht es einen Auth-Token, der aus Sicherheitsgründen
   NIE im öffentlichen Frontend-Code stehen darf. Lösung: ein
   kleiner eigener Server/Proxy (z.B. Cloudflare Worker), der den
   Token sicher hält und nur die fertigen Zahlen als JSON ausliefert.
   Mehr dazu: https://garage61.net/developer

   SO FUNKTIONIERT DIESES SCRIPT:
   1) Ist unten eine RATINGS_API_URL eingetragen, wird von dort
      versucht JSON zu laden (Format siehe normalizeApiPayload()).
   2) Ist keine URL eingetragen (Standard) ODER schlägt das Laden
      fehl, werden die Werte aus MANUAL_RATINGS genutzt — einfach
      unten ausfüllen, findest du eingeloggt in deinem iRacing-
      bzw. Garage61-Account.
   =========================================================== */

// Sobald ihr einen eigenen Proxy (z.B. Garage61-Backend) habt, hier die
// URL eintragen -> Seite lädt dann automatisch live. Leer lassen = manuell.
const RATINGS_API_URL = "";

// ⬇⬇⬇  HIER DEINE WERTE EINTRAGEN  ⬇⬇⬇
// ============================================================
//   ██  TRAG HIER DEINE IRACING-WERTE EIN  ██
// ============================================================
// irating  -> deine Zahl OHNE Anführungszeichen, z.B. 3450
// license  -> als Text in "...", z.B. "A 4.99"
// category -> als Text in "...", z.B. "Sports Car"
const MANUAL_RATINGS = {
  irating:  null,  // <<< HIER Zahl eintragen, z.B. 3450
  license:  "",    // <<< HIER Lizenz eintragen, z.B. "A 4.99"
  category: "",    // <<< HIER Kategorie eintragen, z.B. "Sports Car"
};
// ⬆⬆⬆  HIER DEINE WERTE EINTRAGEN  ⬆⬆⬆

function normalizeApiPayload(data) {
  return {
    irating:  data.irating  ?? data.iRating  ?? null,
    license:  data.license  ?? data.licenseClass ?? "",
    category: data.category ?? data.categoryName  ?? "",
  };
}

async function tryLoadLiveRatings() {
  if (!RATINGS_API_URL) throw new Error("Keine RATINGS_API_URL gesetzt");
  const res = await fetch(RATINGS_API_URL);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return normalizeApiPayload(await res.json());
}

function animateCount(el, target) {
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toString();
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderRatings(ratings) {
  const row = document.getElementById("ratingsRow");
  if (!row) return;

  row.querySelectorAll(".rating-pill").forEach(pill => {
    const key = pill.dataset.key;
    const valueEl = pill.querySelector(".rating-val");
    const value = ratings[key];

    if (value === null || value === undefined || value === "") {
      valueEl.textContent = "–";
      return;
    }
    if (key === "irating") {
      valueEl.dataset.target = value;
      valueEl.textContent = "0";
    } else {
      valueEl.textContent = value; // Lizenz/Kategorie: reiner Text, kein Count-up
    }
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = parseFloat(entry.target.querySelector('[data-key="irating"] .rating-val')?.dataset.target);
      if (Number.isFinite(target)) {
        animateCount(entry.target.querySelector('[data-key="irating"] .rating-val'), target);
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.4 });
  observer.observe(row);
}

async function initRatings() {
  const row = document.getElementById("ratingsRow");
  if (!row) return; // nur auf der Startseite aktiv

  const noteEl = document.getElementById("ratingsNote");

  try {
    const live = await tryLoadLiveRatings();
    renderRatings(live);
    if (noteEl) noteEl.textContent = "Live-Daten via Garage61-Proxy.";
  } catch (err) {
    console.info("[Ratings] Nutze manuelle Werte:", err.message);
    renderRatings(MANUAL_RATINGS);
    const hasValues = Object.values(MANUAL_RATINGS).some(v => v !== null && v !== "");
    if (noteEl) {
      noteEl.innerHTML = hasValues
        ? "Werte manuell gepflegt."
        : 'Werte bitte in <code>ratings.js</code> eintragen.';
    }
  }
}

initRatings();
