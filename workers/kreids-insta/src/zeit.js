// ═══════════════════════════════════════════════════════════
// Zeit-Helfer: Der Rennkalender rechnet in deutscher Zeit (Europe/Berlin),
// der Worker läuft in UTC. Sommer-/Winterzeit wird über Intl berechnet.
// ═══════════════════════════════════════════════════════════
const TZ = 'Europe/Berlin';
const FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});
const WOCHENTAG = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'long' });
const WOCHENTAG_KURZ = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'short' });

function teile(ms) {
  const p = {};
  for (const x of FMT.formatToParts(new Date(ms))) p[x.type] = x.value;
  return p;
}

// Abstand Berlin ↔ UTC in Minuten zu einem Zeitpunkt
function abstandMin(ms) {
  const p = teile(ms);
  const alsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((alsUtc - ms) / 60000);
}

// 'YYYY-MM-DD' + 'HH:MM' (Berlin) → Millisekunden UTC
export function berlinZuMs(datum, zeit) {
  const [y, m, d] = String(datum).slice(0, 10).split('-').map(Number);
  const [hh, mm] = String(zeit || '00:00').slice(0, 5).split(':').map(Number);
  if (!y || !m || !d) return NaN;
  const naiv = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  let ms = naiv - abstandMin(naiv) * 60000;
  ms = naiv - abstandMin(ms) * 60000;   // Korrektur rund um die Zeitumstellung
  return ms;
}

// Millisekunden → { datum: 'YYYY-MM-DD', zeit: 'HH:MM', tag: 'DD.MM.', wochentag: 'Samstag', wt: 'Sa' }
export function berlin(ms) {
  const p = teile(ms);
  const d = new Date(ms);
  return {
    datum: `${p.year}-${p.month}-${p.day}`,
    zeit: `${p.hour}:${p.minute}`,
    tag: `${p.day}.${p.month}.`,
    jahr: p.year,
    wochentag: WOCHENTAG.format(d),
    wt: WOCHENTAG_KURZ.format(d).replace('.', '')
  };
}

// 'YYYY-MM-DD' minus n Tage
export function tageZurueck(datum, n) {
  const d = new Date(String(datum).slice(0, 10) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - (n || 0));
  return d.toISOString().slice(0, 10);
}

// Dauer aus dem Kalender: '45' oder '1:30' → Minuten (wie in nav.js)
export function minuten(v) {
  const s = String(v == null ? '' : v).trim();
  if (s.includes(':')) {
    const [h, m] = s.split(':');
    return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
  }
  return parseInt(s, 10) || 0;
}

// 'HH:MM' prüfen
export function istUhrzeit(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));
}
