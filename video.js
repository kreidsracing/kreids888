/* ===========================================================
   LETZTER STREAM — lädt das aktuellste BEREITS VERÖFFENTLICHTE
   Video vom YouTube-Kanal in den Player + Titel + Link.
   ------------------------------------------------------------
   WICHTIG: Ein angekündigter/laufender Stream taucht im RSS-Feed
   ganz oben auf. Der wird hier ausgelassen (er läuft schon oben
   im Broadcast-Block). Dafür fragt dieses Script kurz den Worker,
   welches Video "live"/"upcoming" ist, und überspringt genau das.
   =========================================================== */

const YOUTUBE_CHANNEL_ID = "UCtFDX_OtRwq-z8gJBo2e96w";
const STATUS_URL         = "https://kreids888-live.kreids.workers.dev/";
const FALLBACK_VIDEO_ID  = "Yvv1yh9lG0w";

// videoId, das oben im Broadcast schon gezeigt wird -> hier auslassen
async function fetchExcludedId() {
  try {
    const r = await fetch(STATUS_URL, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    if (d && (d.state === "live" || d.state === "upcoming")) return d.videoId || null;
    return null;
  } catch { return null; }
}

// komplette Video-Liste aus dem Kanal-RSS holen
async function fetchVideoList(channelId) {
  const feedUrl  = "https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId;
  const proxyUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const items = (data.items || []).map(it => {
    const link = it.link || it.guid || "";
    const m = link.match(/[?&]v=([\w-]{11})/) || link.match(/video:([\w-]{11})/);
    return m ? { id: m[1], title: (it.title || "").trim(), link } : null;
  }).filter(Boolean);
  if (!items.length) throw new Error("Kein Video im Feed gefunden");
  return items;
}

function setVideoSrc(id) {
  const el = document.getElementById("yt");
  const frame = document.getElementById("ytFrame");
  if (!el || !frame) return;
  el.dataset.id = id;
  frame.src = "https://www.youtube.com/embed/" + id + "?autoplay=1&mute=1&rel=0&playsinline=1&enablejsapi=1";
}

function setVideoMeta(v) {
  const t = document.getElementById("ytTitle");
  const l = document.getElementById("ytLink");
  if (t && v.title) t.textContent = v.title;
  if (l && v.link)  l.href = v.link;
}

async function initVideo() {
  if (!document.getElementById("yt")) return;
  if (!YOUTUBE_CHANNEL_ID) return;
  try {
    const [list, excludeId] = await Promise.all([
      fetchVideoList(YOUTUBE_CHANNEL_ID),
      fetchExcludedId(),
    ]);
    // erstes Video, das NICHT der laufende/angekündigte Stream ist
    const pick = list.find(v => v.id !== excludeId) || list[0];
    setVideoSrc(pick.id);
    setVideoMeta(pick);
  } catch (err) {
    console.info("[Video] Letztes Video nicht ladbar, nutze Fallback:", err.message);
  }
}
initVideo();
