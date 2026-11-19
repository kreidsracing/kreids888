// ═══════════════════════════════════════════════════════════
// 🏷 Pflicht-Hashtags (NEU 19.11.2026): #simracing #iracing #gt3 #crash stehen IMMER im Titel
// • YouTube: Titel von Shorts und Livestreams (max. 100 Zeichen, der Text davor wird bei Bedarf gekürzt)
// • TikTok: Titel (max. 90) · Instagram und TikTok-Text: am Ende der ersten Zeile
// • Doppelte fliegen aus dem restlichen Text raus. Instagram nimmt nur 5 Hashtags:
//   diese 4 stehen vorne und bleiben deshalb immer drin.
// ═══════════════════════════════════════════════════════════
export const PFLICHT_TAGS = ['#simracing', '#iracing', '#gt3', '#crash'];
const RE = /(^|[^\p{L}\p{N}_#])#(simracing|iracing|gt3|crash)(?![\p{L}\p{N}_])/giu;
const ohnePflicht = t => String(t || '').replace(RE, '$1').replace(/[ \t]{2,}/g, ' ').trim();

// Titel + die 4 Hashtags (max = Längengrenze, z. B. 100 bei YouTube)
export function titelMitTags(titel, max = 0) {
  const tags = PFLICHT_TAGS.join(' ');
  let t = ohnePflicht(titel);
  if (max && t.length + 1 + tags.length > max) t = t.slice(0, Math.max(0, max - tags.length - 2)).trimEnd() + '…';
  return t ? `${t} ${tags}` : tags;
}

// Text (Caption): die 4 Hashtags ans Ende der ersten Zeile, sonst nirgends doppelt
export function textMitTags(text) {
  const z = String(text || '').split('\n');
  const erste = z.findIndex(x => x.trim());
  if (erste < 0) return PFLICHT_TAGS.join(' ');
  const raus = [];
  z.forEach((x, i) => {
    if (i === erste) return raus.push(titelMitTags(x));
    if (!x.trim()) return raus.push('');
    const y = ohnePflicht(x);
    if (y) raus.push(y);   // Zeile nur aus diesen Hashtags: fällt weg
  });
  return raus.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
