// ═══════════════════════════════════════════════════════════
// Discord (F2F): Nachricht in den Discord, sobald etwas gepostet wurde
// • Instagram: Beitrag, Story, Reel (Clip-Fabrik) · YouTube: Stream geplant, jetzt live
// • TikTok nicht: dort landen nur Entwürfe in der Inbox, gepostet wird in der App
// Webhook-Link als Geheimnis im Cloudflare-Dashboard (Worker kreids-insta): DISCORD_WEBHOOK – kommt nie in den Code
// ═══════════════════════════════════════════════════════════
export const ART_NAME = { ank: 'Ankündigung', story: 'Raceday', erg: 'Rennergebnis', woche: 'Wochenplan', tab: 'Tabellenstand', monat: 'Monatsbilanz', meilen: 'Meilenstein', live: 'Jetzt live' };
export const FARBE = { instagram: 0xe1306c, youtube: 0xff0000, test: 0x5865f2 };
const webhook = env => String(env.DISCORD_WEBHOOK || '').trim();
export const discordEingerichtet = env => /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/.test(webhook(env));
const kurz = (t, n) => { const s = String(t || '').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

// Post-Text aufteilen: erste Zeile = Titel, Rest ohne Hashtags = Beschreibung
export function textTeile(text) {
  const zeilen = String(text || '').split('\n').map(z => z.trim());
  const ohneTags = zeilen.filter(z => z && !/^(#\S+\s*)+$/.test(z));
  return { titel: ohneTags[0] || '', rest: ohneTags.slice(1).join('\n') };
}

// Eine Nachricht schicken. Wirft bei Fehlern (der Aufrufer fängt sie ab – Posten geht immer vor).
export async function discordMelden(env, { text, titel, link, beschreibung, bild, farbe, fuss }) {
  if (!discordEingerichtet(env)) return false;
  const embed = { title: kurz(titel || 'kreids888', 250), color: farbe || FARBE.test, timestamp: new Date().toISOString() };
  if (link) embed.url = link;
  if (beschreibung) embed.description = kurz(beschreibung, 600);
  if (bild) embed.image = { url: bild };
  if (fuss) embed.footer = { text: kurz(fuss, 200) };
  const body = { username: 'Kreids888', content: kurz(text, 300), embeds: [embed], allowed_mentions: { parse: [] } };
  if (env.ORIGIN) body.avatar_url = env.ORIGIN + '/logo.png';
  const r = await fetch(webhook(env).split('?')[0] + '?wait=true', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('Discord ' + r.status + ': ' + (await r.text().catch(() => '')).slice(0, 160));
  return true;
}
