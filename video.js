/* ===========================================================
   NEUESTES VIDEO — lädt automatisch das aktuellste Video vom
   YouTube-Kanal in den Player + zeigt Titel und Link.
   ------------------------------------------------------------
   Liest den öffentlichen Kanal-RSS-Feed über rss2json.com (CORS-fähig),
   kein eigener Server nötig. Klappt der Abruf nicht, bleibt das
   FALLBACK_VIDEO_ID stehen.
   =========================================================== */

const YOUTUBE_CHANNEL_ID = "UCtFDX_OtRwq-z8gJBo2e96w";
const FALLBACK_VIDEO_ID  = "Yvv1yh9lG0w";

async function fetchLatestVideo(channelId) {
  const feedUrl  = "https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId;
  const proxyUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const first = data.items && data.items[0];
  if (!first) throw new Error("Kein Video im Feed gefunden");
  const link = first.link || first.guid || "";
  const match = link.match(/[?&]v=([\w-]{11})/) || link.match(/video:([\w-]{11})/);
  if (!match) throw new Error("Video-ID nicht im Feed-Eintrag gefunden");
  return { id: match[1], title: (first.title || "").trim(), link: link };
}

function setVideoSrc(id) {
  const el = document.getElementById("yt");
  const frame = document.getElementById("ytFrame");
  if (!el || !frame) return;
  el.dataset.id = id;
  frame.src = "https://www.youtube.com/embed/" + id + "?autoplay=1&mute=1&rel=0&playsinline=1&enablejsapi=1";
}

function setVideoMeta(video) {
  const titleEl = document.getElementById("ytTitle");
  const linkEl  = document.getElementById("ytLink");
  if (titleEl && video.title) titleEl.textContent = video.title;
  if (linkEl && video.link)   linkEl.href = video.link;
}

async function initVideo() {
  if (!document.getElementById("yt")) return; // nur auf der Startseite aktiv
  if (!YOUTUBE_CHANNEL_ID) return;
  try {
    const video = await fetchLatestVideo(YOUTUBE_CHANNEL_ID);
    setVideoSrc(video.id);
    setVideoMeta(video);
  } catch (err) {
    console.info("[Video] Neuestes Video konnte nicht geladen werden, nutze Fallback:", err.message);
  }
}
initVideo();
