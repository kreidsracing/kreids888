/* ===========================================================
   NEUESTES VIDEO — lädt automatisch das aktuellste Video vom
   YouTube-Kanal in den Player auf der Startseite.
   ------------------------------------------------------------
   WARUM NICHT EINFACH DIREKT VON YOUTUBE LADEN?
   YouTube selbst blockiert per CORS einen direkten fetch() von
   dieser Seite aus. Deshalb wird der öffentliche Kanal-RSS-Feed
   über einen kostenlosen Umwandlungs-Dienst (rss2json.com) gelesen,
   der CORS erlaubt. Kein eigener Server/Backend nötig.

   SO AKTIVIERST DU DAS:
   1) Trag unten bei YOUTUBE_CHANNEL_ID deine Kanal-ID ein
      (beginnt immer mit "UC..."). So findest du sie:
        - Eingeloggt auf https://www.youtube.com/account_advanced
        - ODER: eigenen Kanal öffnen -> Rechtsklick -> "Seitenquelltext
          anzeigen" -> mit Strg+F nach "channel_id" suchen.
   2) Fertig. Ab dann lädt die Startseite automatisch dein neuestes
      Video. Klappt der Live-Abruf mal nicht (z.B. rss2json down),
      läuft stattdessen das FALLBACK_VIDEO_ID unten.
   =========================================================== */

// ⬇⬇⬇  HIER DEINE YOUTUBE-CHANNEL-ID EINTRAGEN  ⬇⬇⬇
const YOUTUBE_CHANNEL_ID = ""; // <<< z.B. "UCxxxxxxxxxxxxxxxxxxxxxx"
// ⬆⬆⬆  HIER DEINE YOUTUBE-CHANNEL-ID EINTRAGEN  ⬆⬆⬆

// Wird genutzt, solange keine Channel-ID gesetzt ist ODER der Live-Abruf fehlschlägt.
const FALLBACK_VIDEO_ID = "Yvv1yh9lG0w";

async function fetchLatestVideoId(channelId) {
  const feedUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId;
  const proxyUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const first = data.items && data.items[0];
  if (!first) throw new Error("Kein Video im Feed gefunden");
  const link = first.link || first.guid || "";
  const match = link.match(/[?&]v=([\w-]{11})/) || link.match(/video:([\w-]{11})/);
  if (!match) throw new Error("Video-ID nicht im Feed-Eintrag gefunden");
  return match[1];
}

function setVideoSrc(id) {
  const el = document.getElementById("yt");
  const frame = document.getElementById("ytFrame");
  if (!el || !frame) return;
  el.dataset.id = id;
  frame.src = "https://www.youtube.com/embed/" + id + "?autoplay=1&mute=1&rel=0&playsinline=1&enablejsapi=1";
}

async function initVideo() {
  if (!document.getElementById("yt")) return; // nur auf der Startseite aktiv

  if (!YOUTUBE_CHANNEL_ID) {
    console.info("[Video] Keine YOUTUBE_CHANNEL_ID gesetzt — nutze Fallback-Video.");
    return; // Fallback-Video steht schon als Standard-src in index.html
  }
  try {
    const id = await fetchLatestVideoId(YOUTUBE_CHANNEL_ID);
    setVideoSrc(id);
  } catch (err) {
    console.info("[Video] Neuestes Video konnte nicht geladen werden, nutze Fallback:", err.message);
  }
}
initVideo();
