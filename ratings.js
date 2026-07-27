/* ===========================================================
   iRACING-DISZIPLINEN (Fahrerkarte) — lädt iRating + Lizenz je
   Disziplin aus dem Garage61-Worker und rendert sie als Karten
   mit farbigem Lizenz-Badge und Zähl-Animation.
   ------------------------------------------------------------
   Fällt der Worker aus, werden die MANUAL_DISCIPLINES gezeigt.
   =========================================================== */

const RATINGS_API_URL = "https://kreids888-irating.kreids.workers.dev/";

// Fallback, falls der Worker mal nicht erreichbar ist:
const MANUAL_DISCIPLINES = [
  { label: "Sportscar", irating: 1767, license: "A 3.32", licenseClass: "A" },
  { label: "Formel",    irating: 1569, license: "C 2.42", licenseClass: "C" },
  { label: "Oval",      irating: 1203, license: "D 1.70", licenseClass: "D" },
];

async function loadDisciplines() {
  if (!RATINGS_API_URL) return MANUAL_DISCIPLINES;
  try {
    const res = await fetch(RATINGS_API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (Array.isArray(data.disciplines) && data.disciplines.length) {
      return data.disciplines;
    }
    throw new Error("keine Disziplinen im Payload");
  } catch (err) {
    console.info("[Ratings] Live-Abruf fehlgeschlagen, nutze Fallback:", err.message);
    return MANUAL_DISCIPLINES;
  }
}

function animateCount(el, target) {
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString("de-DE");
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function cardHTML(d) {
  const lic = (d.licenseClass || (d.license ? d.license.charAt(0) : "")).toUpperCase();
  return (
    '<div class="disc-card" data-lic="' + lic + '">' +
      '<div class="disc-top">' +
        '<span class="disc-label">' + (d.label || "") + '</span>' +
        '<span class="disc-badge">' + (d.license || "") + '</span>' +
      '</div>' +
      '<div class="disc-ir"><span class="disc-ir-val" data-target="' + (d.irating || 0) + '">0</span></div>' +
      '<div class="disc-ir-lbl">iRating</div>' +
    '</div>'
  );
}

function renderDisciplines(list) {
  const row = document.getElementById("ratingsRow");
  if (!row) return;
  row.dataset.state = "ready";
  row.innerHTML = list.map(cardHTML).join("");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      row.querySelectorAll(".disc-ir-val").forEach(el => {
        const t = parseFloat(el.dataset.target);
        if (Number.isFinite(t)) animateCount(el, t);
      });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });
  observer.observe(row);
}

async function initRatings() {
  const row = document.getElementById("ratingsRow");
  if (!row) return; // nur auf der Startseite
  const list = await loadDisciplines();
  renderDisciplines(list);
}
initRatings();
