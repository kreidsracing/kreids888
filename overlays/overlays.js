/* ===========================================================
   OVERLAYS für den Social-Bild-Generator (social.html)
   Jedes Overlay zeichnet Rahmen, Texte und Logo über das Bild.
   W x H ist 1080 x 1350 (4:5) oder 1080 x 1920 (9:16).
   d = { kicker, title, text, footer, img, view }
   H = Zeichen-Hilfen aus social.html
   Neues Design = neuen Eintrag in diese Liste.
   =========================================================== */
window.K888_OVERLAYS = [

  /* ---------- 1) RENNBERICHT: rotes Band oben, großer Titel unten ---------- */
  { id: "rennbericht", name: "Rennbericht", draw: function (c, W, H, d, h) {
    var M = 72;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, H * 0.32, 0, H, [[0, "rgba(10,11,14,0)"], [0.45, "rgba(10,11,14,.82)"], [1, "rgba(10,11,14,.97)"]]);
    h.verlauf(c, 0, 0, 0, 260, [[0, "rgba(10,11,14,.6)"], [1, "rgba(10,11,14,0)"]]);
    // Band oben links
    c.font = h.f(900, 54);
    var kw = c.measureText(d.kicker).width + 70;
    h.schraeg(c, M - 20, 84, kw, 84, 22, h.ROT);
    h.text(c, d.kicker, M + 14, 144, h.f(900, 54), "#fff");
    h.startnummer(c, W - M, 84, 84, "right");
    h.qr(c, d, W - M - 190, 200, 190);
    // Block unten, von unten nach oben
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var t = h.passend(c, d.text, W - 2 * M - 30, 4, 40, 34, 500, "Barlow", 1.38);
    var ty = fy - 110 - t.hoehe;
    h.zeilen(c, t, M + 30, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M - 30, 3, 124, 70, 900, "Saira Condensed", 0.96);
    var tiy = ty - 34 - ti.hoehe;
    c.fillStyle = h.ROT; c.fillRect(M, tiy + 8, 10, ti.hoehe + t.hoehe + 30);
    h.zeilen(c, ti, M + 30, tiy, "#fff", 0.6);
  } },

  /* ---------- 2) TIMING TOWER: Titel in Zeiten-Boxen wie im Rennen ---------- */
  { id: "tower", name: "Timing Tower", draw: function (c, W, H, d, h) {
    var M = 64;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, W * 0.9, 0, [[0, "rgba(10,11,14,.88)"], [0.6, "rgba(10,11,14,.45)"], [1, "rgba(10,11,14,.1)"]]);
    // Kopfzeile des Towers
    var y = 92;
    c.fillStyle = "rgba(10,11,14,.92)"; c.fillRect(M, y, 560, 78);
    c.fillStyle = h.ROT; c.fillRect(M, y, 104, 78);
    h.text(c, "P1", M + 52, y + 56, h.f(900, 50), "#fff", "center");
    h.text(c, d.kicker, M + 130, y + 56, h.f(900, 44), "#fff");
    c.fillStyle = h.ROT; c.fillRect(M + 560, y, 8, 78);
    h.qr(c, d, W - M - 190, 92, 190);
    // Titel: jede Zeile eine Box
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M - 60, 4, 104, 64, 900, "Saira Condensed", 1);
    y += 120;
    ti.zeilen.forEach(function (z, i) {
      c.font = h.f(900, ti.groesse);
      var bw = c.measureText(z).width + 64, bh = ti.groesse * 1.12;
      c.fillStyle = "rgba(19,21,27,.94)"; c.fillRect(M, y, bw, bh);
      c.fillStyle = i === 0 ? h.ROT : "#3a3f4a"; c.fillRect(M, y, 8, bh);
      h.text(c, z, M + 32, y + ti.groesse * 0.92, h.f(900, ti.groesse), "#fff");
      y += bh + 10;
    });
    // Text darunter
    var t = h.passend(c, d.text, W * 0.72, 5, 40, 32, 500, "Barlow", 1.38);
    y += 26;
    c.fillStyle = "rgba(10,11,14,.78)"; c.fillRect(M, y - 10, W * 0.72 + 56, t.hoehe + 44);
    h.zeilen(c, t, M + 28, y + 6, "#e6e8ec");
    // Fußleiste wie eine Timing-Zeile
    var fy = H - M - 72;
    c.fillStyle = "rgba(10,11,14,.94)"; c.fillRect(0, fy, W, 72 + M);
    c.fillStyle = h.ROT; c.fillRect(0, fy, W, 4);
    h.logo(c, M, fy + 60, 46);
    h.motto(c, d.footer, W - M, fy + 56, 34, "right");
  } },

  /* ---------- 3) ONBOARD: HUD-Ecken wie eine Cockpit-Kamera ---------- */
  { id: "onboard", name: "Onboard", draw: function (c, W, H, d, h) {
    var M = 56;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.55)"], [0.35, "rgba(10,11,14,.15)"], [0.62, "rgba(10,11,14,.55)"], [1, "rgba(10,11,14,.95)"]]);
    h.ecken(c, M, M, W - 2 * M, H - 2 * M, 90, 8, h.ROT);
    // oben: REC + Kicker
    c.fillStyle = h.ROT; c.beginPath(); c.arc(M + 70, M + 78, 14, 0, Math.PI * 2); c.fill();
    h.text(c, "ONBOARD", M + 98, M + 92, h.f(800, 38), "#fff", "left", 0.16);
    c.font = h.f(900, 38);
    var kw = c.measureText(d.kicker).width + 48;
    h.schraeg(c, W - M - 60 - kw, M + 48, kw, 60, 12, h.ROT);
    h.text(c, d.kicker, W - M - 60 - kw / 2, M + 92, h.f(900, 38), "#fff", "center", 0.1);
    h.qr(c, d, W - M - 60 - 180, M + 140, 180);
    // Mitte unten: Titel groß mit Glow
    var t = h.passend(c, d.text, W - 2 * M - 120, 4, 40, 32, 500, "Barlow", 1.38);
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M - 120, 3, 132, 72, 900, "Saira Condensed", 0.95);
    var unten = H - M - 150;
    var ty = unten - t.hoehe;
    var tiy = ty - 40 - ti.hoehe;
    c.save(); c.shadowColor = "rgba(225,19,36,.65)"; c.shadowBlur = 38;
    h.zeilen(c, ti, W / 2, tiy, "#fff", 0.4, "center");
    c.restore();
    h.zeilen(c, t, W / 2, ty, "#dfe2e7", 0, "center");
    // Datenzeile
    c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(M + 60, H - M - 108, W - 2 * M - 120, 2);
    h.logo(c, M + 60, H - M - 46, 42);
    h.motto(c, d.footer, W - M - 60, H - M - 50, 32, "right");
  } },

  /* ---------- 4) STARTNUMMER: riesige 888 im Hintergrund ---------- */
  { id: "startnummer", name: "Startnummer", draw: function (c, W, H, d, h) {
    var M = 72;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.35)"], [0.45, "rgba(10,11,14,.55)"], [1, "rgba(10,11,14,.96)"]]);
    // 888 als Kontur
    c.save(); c.font = h.f(900, 520); c.textAlign = "right";
    c.lineWidth = 5; c.strokeStyle = "rgba(255,255,255,.22)"; c.strokeText("888", W + 40, 470);
    c.restore();
    // Rennstreifen oben rechts
    c.save(); c.translate(W - 250, -40); c.rotate(Math.PI / 4);
    c.fillStyle = h.ROT; c.fillRect(0, 0, 420, 34); c.fillStyle = "#fff"; c.fillRect(0, 50, 420, 14); c.restore();
    h.qr(c, d, M, 84, 190);
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var t = h.passend(c, d.text, W - 2 * M, 4, 40, 32, 500, "Barlow", 1.38);
    var ty = fy - 110 - t.hoehe;
    h.zeilen(c, t, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 3, 128, 72, 900, "Saira Condensed", 0.95);
    var tiy = ty - 36 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    // Kicker-Chip über dem Titel
    c.font = h.f(900, 40);
    var kw = c.measureText(d.kicker).width + 56;
    h.schraeg(c, M, tiy - 92, kw, 62, 16, h.ROT);
    h.text(c, d.kicker, M + 28, tiy - 46, h.f(900, 40), "#fff");
  } },

  /* ---------- 5) KLAR: Bild oben, ruhiges Textfeld unten ---------- */
  { id: "klar", name: "Klar", draw: function (c, W, H, d, h) {
    var M = 72, teil = Math.round(H * 0.58);
    c.fillStyle = "#0e0f14"; c.fillRect(0, 0, W, H);
    h.bild(c, d, 0, 0, W, teil);
    h.verlauf(c, 0, teil - 220, 0, teil, [[0, "rgba(14,15,20,0)"], [1, "rgba(14,15,20,1)"]]);
    c.fillStyle = h.ROT; c.fillRect(M, teil - 6, 180, 6);
    h.text(c, d.kicker, M, teil + 70, h.f(800, 38), h.ROT, "left", 0.22);
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 3, 104, 64, 900, "Saira Condensed", 0.98);
    h.zeilen(c, ti, M, teil + 110, "#fff", 0.6);
    var ty = teil + 110 + ti.hoehe + 30;
    var platz = H - M - 100 - ty;
    var t = h.passend(c, d.text, W - 2 * M, Math.max(1, Math.min(6, Math.floor((platz - 40) / 56) + 1)), 40, 32, 500, "Barlow", 1.4);
    h.zeilen(c, t, M, ty, "#c9ced6");
    h.fuss(c, M, W - M, H - M, d.footer);
    h.startnummer(c, W - M, 70, 76, "right");
    h.qr(c, d, M, 70, 180);
  } },

  /* ---------- 6) NACHTSCHICHT: dunkel, rote Leuchtlinie wie das Rücklicht ---------- */
  { id: "nacht", name: "Nachtschicht", felder: ["strecke", "wann"], draw: function (c, W, H, d, h) {
    var M = 72;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(5,6,9,.7)"], [0.3, "rgba(5,6,9,.2)"], [0.55, "rgba(5,6,9,.65)"], [1, "rgba(5,6,9,.97)"]]);
    h.text(c, (d.wann || "NACHT").toUpperCase(), M, 130, h.f(900, 64), "#fff", "left", 0.04);
    h.text(c, (d.strecke || "").toUpperCase(), M, 182, h.f(700, 34), "#9aa1ab", "left", 0.2);
    h.qr(c, d, W - M - 180, 70, 180);
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var t = h.passend(c, d.text, W - 2 * M, 4, 40, 32, 500, "Barlow", 1.38);
    var ty = fy - 110 - t.hoehe;
    h.zeilen(c, t, M, ty, "#cfd3da");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 3, 120, 70, 900, "Saira Condensed", 0.95);
    var tiy = ty - 60 - ti.hoehe;
    // Leuchtlinie
    c.save(); c.shadowColor = "rgba(255,30,40,.95)"; c.shadowBlur = 40; c.fillStyle = "#ff2a35";
    c.fillRect(M, tiy - 46, W - 2 * M, 8); c.restore();
    h.text(c, d.kicker, M, tiy - 70, h.f(800, 34), "#ff4b55", "left", 0.22);
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
  } },

  /* ---------- 7) ERGEBNIS: riesige Platzierung ---------- */
  { id: "ergebnis", name: "Ergebnis", felder: ["platz", "strecke"], draw: function (c, W, H, d, h) {
    var M = 72;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.15)"], [0.4, "rgba(10,11,14,.5)"], [1, "rgba(10,11,14,.97)"]]);
    var platz = String(d.platz || "1").replace(/^p/i, "");
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var t = h.passend(c, d.text, W - 2 * M, 3, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - t.hoehe;
    h.zeilen(c, t, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 2, 84, 56, 900, "Saira Condensed", 0.98);
    var tiy = ty - 30 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    // P + Zahl
    var gy = tiy - 40;
    c.save(); c.font = h.f(900, 380);
    c.shadowColor = "rgba(225,19,36,.6)"; c.shadowBlur = 50;
    c.fillStyle = "#fff"; c.textAlign = "left"; c.fillText(platz, M + 150, gy);
    c.restore();
    h.text(c, "P", M, gy - 20, h.f(900, 200), h.ROT);
    var strecke = (d.strecke || "").toUpperCase();
    c.font = h.f(900, 40);
    var kw = Math.max(c.measureText(d.kicker).width, 10) + 56;
    h.schraeg(c, M, gy - 400, kw, 62, 16, h.ROT);
    h.text(c, d.kicker, M + 28, gy - 354, h.f(900, 40), "#fff");
    if (strecke) h.text(c, strecke, M + kw + 30, gy - 354, h.f(800, 36), "#fff", "left", 0.14);
    h.qr(c, d, W - M - 180, 70, 180);
  } },

  /* ---------- 8) MOTTO: Konstanz schlägt Geschwindigkeit ---------- */
  { id: "motto", name: "Motto", draw: function (c, W, H, d, h) {
    var M = 72;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.35)"], [0.5, "rgba(10,11,14,.72)"], [1, "rgba(10,11,14,.97)"]]);
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var t = h.passend(c, d.text, W - 2 * M, 3, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - t.hoehe;
    h.zeilen(c, t, M, ty, "#cfd3da");
    var y = ty - 70;
    h.text(c, "GESCHWINDIGKEIT", M, y, h.f(900, 132), "#fff");
    c.save(); c.font = h.f(900, 132); c.lineWidth = 3; c.strokeStyle = "rgba(255,255,255,.5)"; c.restore();
    h.text(c, "SCHLÄGT", M, y - 130, h.f(900, 132), "#9aa1ab");
    c.save(); c.shadowColor = "rgba(225,19,36,.7)"; c.shadowBlur = 50;
    h.text(c, "KONSTANZ", M, y - 260, h.f(900, 178), h.ROT); c.restore();
    h.text(c, "MEIN MOTTO", M, y - 440, h.f(800, 34), "#fff", "left", 0.3);
    h.startnummer(c, W - M, 84, 84, "right");
    h.qr(c, d, M, 84, 180);
  } },

  /* ---------- 9) STREAM: Ankündigung mit Tag und Uhrzeit ---------- */
  { id: "stream", name: "Stream", felder: ["wann"], draw: function (c, W, H, d, h) {
    var M = 72;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.55)"], [0.35, "rgba(10,11,14,.25)"], [1, "rgba(10,11,14,.96)"]]);
    // LIVE-Plakette
    c.save(); c.shadowColor = "rgba(225,19,36,.8)"; c.shadowBlur = 36;
    h.schraeg(c, M, 84, 250, 96, 22, h.ROT); c.restore();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(M + 52, 132, 14, 0, Math.PI * 2); c.fill();
    h.text(c, "LIVE", M + 80, 158, h.f(900, 72), "#fff", "left", 0.04);
    h.qr(c, d, W - M - 190, 84, 190);
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var t = h.passend(c, d.text, W - 2 * M, 3, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - t.hoehe;
    h.zeilen(c, t, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 2, 96, 60, 900, "Saira Condensed", 0.96);
    var tiy = ty - 30 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    var wann = (d.wann || "MONTAG · 20:00 UHR").toUpperCase();
    var w = h.passend(c, wann, W - 2 * M, 1, 130, 70, 900, "Saira Condensed", 1);
    var wy = tiy - 40 - w.hoehe;
    h.zeilen(c, w, M, wy, h.ROT);
    h.text(c, d.kicker, M, wy - 26, h.f(800, 34), "#fff", "left", 0.22);
  } },

  /* ---------- 10) BATTLE: Kampf um eine Position ---------- */
  { id: "battle", name: "Battle", felder: ["platz", "strecke"], draw: function (c, W, H, d, h) {
    var M = 72;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.6)"], [0.3, "rgba(10,11,14,.1)"], [0.6, "rgba(10,11,14,.5)"], [1, "rgba(10,11,14,.97)"]]);
    // diagonales Band oben
    c.save(); c.translate(W / 2, 170); c.rotate(-0.06);
    c.fillStyle = h.ROT; c.fillRect(-W, -62, W * 2, 124);
    c.fillStyle = "#fff"; c.fillRect(-W, 70, W * 2, 10);
    c.font = h.f(900, 96); c.textAlign = "center"; c.fillStyle = "#fff";
    c.fillText("KAMPF UM P" + String(d.platz || "1").replace(/^p/i, ""), 0, 34);
    c.restore();
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), W / 2, 300, h.f(800, 36), "#fff", "center", 0.2);
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var t = h.passend(c, d.text, W - 2 * M - 220, 4, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - t.hoehe;
    h.zeilen(c, t, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M - 220, 3, 104, 64, 900, "Saira Condensed", 0.95);
    var tiy = ty - 30 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    h.qr(c, d, W - M - 190, fy - 100 - 190, 190);
  } },

  /* ================= VIDEO-DESIGNS: Video läuft in einem Fenster ================= */

  /* ---------- 11) VIDEO-RAHMEN: dunkler Rahmen, Farblinie oben, Fenster + Textfeld ---------- */
  { id: "rahmen", name: "Video-Rahmen", draw: function (c, W, H, d, h) {
    var M = 48, gross = H > 1500;
    c.fillStyle = "#0b0c10"; c.fillRect(0, 0, W, H);
    var g = c.createRadialGradient(W * 0.85, 0, 10, W * 0.85, 0, W);
    g.addColorStop(0, "rgba(225,19,36,.18)"); g.addColorStop(1, "rgba(225,19,36,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    h.linie(c, 0, 0, W, 10);
    h.logo(c, M, 108, 50);
    c.font = h.f(900, 36);
    var kw = c.measureText(d.kicker).width + 48;
    h.schraeg(c, W - M - kw - 10, 62, kw, 58, 12, h.ROT);
    h.text(c, d.kicker, W - M - 10 - kw / 2, 104, h.f(900, 36), "#fff", "center", 0.08);
    var fy = 150, fh = gross ? 1100 : 560;
    h.fenster(c, d, M, fy, W - 2 * M, fh);
    h.linie(c, M, fy + fh, W - 2 * M, 6);
    var px = M + 36, pw = W - 2 * M - 72, py = fy + fh + 6, pb = H - M - 104;
    c.fillStyle = "#13151b"; c.fillRect(M, py, W - 2 * M, pb - py);
    var ti = h.passend(c, d.title.toUpperCase(), pw, gross ? 3 : 2, 84, 54, 900, "Saira Condensed", 0.98);
    h.zeilen(c, ti, px, py + 34, "#fff", 0.6);
    var ty = py + 34 + ti.hoehe + 22, platz = pb - 30 - ty;
    if (platz > 36) {
      var t = h.passend(c, d.text, pw, Math.max(1, Math.min(gross ? 6 : 3, Math.floor((platz - 36) / 50) + 1)), 36, 28, 500, "Barlow", 1.38);
      h.zeilen(c, t, px, ty, "#c9ced6");
    }
    h.fuss(c, M, W - M, H - M, d.footer);
    h.qr(c, d, W - M - 30 - 200, fy + 30, 200);
  } },

  /* ---------- 12) VIDEO TV: Video oben über die volle Breite, Bauchbinde wie im TV ---------- */
  { id: "tv", name: "Video TV", draw: function (c, W, H, d, h) {
    var M = 60, gross = H > 1500, fh = gross ? 1160 : 640;
    c.fillStyle = "#0b0c10"; c.fillRect(0, 0, W, H);
    h.fenster(c, d, 0, 0, W, fh);
    var g = c.createLinearGradient(0, 0, 0, 200);
    g.addColorStop(0, "rgba(10,11,14,.7)"); g.addColorStop(1, "rgba(10,11,14,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, 200);
    h.logo(c, M, 100, 48);
    h.startnummer(c, W - M, 52, 72, "right");
    h.linie(c, 0, fh, W, 10);
    c.font = h.f(900, 40);
    var kw = c.measureText(d.kicker).width + 56;
    h.schraeg(c, M, fh - 30, kw, 70, 16, "#fff");
    h.text(c, d.kicker, M + kw / 2, fh + 20, h.f(900, 40), "#0b0c10", "center", 0.06);
    var fy = H - M - 72;
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, gross ? 3 : 2, 96, 60, 900, "Saira Condensed", 0.98);
    var tiy = fh + 76;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    var ty = tiy + ti.hoehe + 24, platz = fy - 30 - ty;
    if (platz > 38) {
      var t = h.passend(c, d.text, W - 2 * M, Math.max(1, Math.min(gross ? 7 : 4, Math.floor((platz - 38) / 52) + 1)), 38, 30, 500, "Barlow", 1.38);
      h.zeilen(c, t, M, ty, "#c9ced6");
    }
    c.fillStyle = "#13151b"; c.fillRect(0, fy, W, H - fy);
    h.linie(c, 0, fy, W, 4);
    h.motto(c, d.footer, M, fy + 58, 36, "left");
    h.text(c, "KREIDS888.COM", W - M, fy + 56, h.f(800, 30), "#9aa1ab", "right", 0.12);
    h.qr(c, d, W - M - 200, fh - 60 - 240, 200);
  } },

  /* ---------- 13) VIDEO KINO: Breitbild-Video in der Mitte, Hintergrund unscharf ---------- */
  { id: "kino", name: "Video Kino", draw: function (c, W, H, d, h) {
    var M = 72, gross = H > 1500, fh = Math.round(W * 9 / 16), fy = Math.round(H * (gross ? 0.34 : 0.26));
    c.fillStyle = "#0b0c10"; c.fillRect(0, 0, W, H);
    if (h.hatMedium(d)) {
      c.save(); c.filter = "blur(28px)";
      h.bild(c, { img: d.img, view: { zoom: 1.1, ox: 0, oy: 0 } }, -40, -40, W + 80, H + 80);
      c.restore();
    }
    c.fillStyle = "rgba(10,11,14,.62)"; c.fillRect(0, 0, W, H);
    h.fenster(c, d, 0, fy, W, fh);
    h.linie(c, 0, fy - 6, W, 6); h.linie(c, 0, fy + fh, W, 6);
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, gross ? 3 : 2, 100, 60, 900, "Saira Condensed", 0.96);
    var tiy = fy - 44 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    h.text(c, d.kicker, M, tiy - 22, h.f(800, 36), "#ff4b55", "left", 0.22);
    var ty = fy + fh + 50, platz = H - M - 110 - ty;
    if (platz > 38) {
      var t = h.passend(c, d.text, W - 2 * M, Math.max(1, Math.min(gross ? 7 : 3, Math.floor((platz - 38) / 52) + 1)), 38, 30, 500, "Barlow", 1.38);
      h.zeilen(c, t, M, ty, "#dfe2e7");
    }
    h.fuss(c, M, W - M, H - M, d.footer);
    h.qr(c, d, W - 40 - 200, fy + fh - 40 - 240, 200);
  } },

  /* ---------- 14) VIDEO HOCHKANT: für Hochkant-Clips (4:5 = Video links, Text rechts) ---------- */
  { id: "hochkant", name: "Video Hochkant", draw: function (c, W, H, d, h) {
    var M = 56;
    c.fillStyle = "#0b0c10"; c.fillRect(0, 0, W, H);
    h.linie(c, 0, 0, W, 10);
    var kw, ti, t, ty;
    if (H > 1500) {
      var fy = 150, fh = H - fy - 300, fw = W - 2 * M;
      h.logo(c, M, 108, 50);
      c.font = h.f(900, 36); kw = c.measureText(d.kicker).width + 48;
      h.schraeg(c, W - M - kw - 10, 62, kw, 58, 12, h.ROT);
      h.text(c, d.kicker, W - M - 10 - kw / 2, 104, h.f(900, 36), "#fff", "center", 0.08);
      h.fenster(c, d, M, fy, fw, fh);
      c.save(); c.beginPath(); c.rect(M, fy, fw, fh); c.clip();
      var g = c.createLinearGradient(0, fy + fh - 560, 0, fy + fh);
      g.addColorStop(0, "rgba(10,11,14,0)"); g.addColorStop(1, "rgba(10,11,14,.94)");
      c.fillStyle = g; c.fillRect(M, fy + fh - 560, fw, 560); c.restore();
      t = h.passend(c, d.text, fw - 90, 3, 38, 30, 500, "Barlow", 1.38);
      ty = fy + fh - 44 - t.hoehe;
      h.zeilen(c, t, M + 50, ty, "#dfe2e7");
      ti = h.passend(c, d.title.toUpperCase(), fw - 90, 3, 100, 60, 900, "Saira Condensed", 0.96);
      var tiy = ty - (t.hoehe ? 26 : 0) - ti.hoehe;
      c.fillStyle = h.ROT; c.fillRect(M + 26, tiy + 6, 8, ti.hoehe + t.hoehe + 20);
      h.zeilen(c, ti, M + 50, tiy, "#fff", 0.6);
      h.linie(c, M, fy + fh, fw, 6);
      h.fuss(c, M, W - M, H - M, d.footer);
      h.qr(c, d, W - M - 40 - 200, fy + 40, 200);
    } else {
      var oy = 140, oh = H - oy - 150, ow = Math.round(oh * 9 / 16);
      h.logo(c, M, 100, 48);
      h.startnummer(c, W - M, 48, 66, "right");
      h.fenster(c, d, M, oy, ow, oh);
      h.linie(c, M, oy + oh, ow, 6);
      var cx = M + ow + 44, cw = W - M - cx;
      c.font = h.f(900, 34); kw = Math.min(cw, c.measureText(d.kicker).width + 44);
      h.schraeg(c, cx + 12, oy, kw, 54, 12, h.ROT);
      h.text(c, d.kicker, cx + 12 + kw / 2, oy + 39, h.f(900, 34), "#fff", "center", 0.06);
      var titel = d.title.toUpperCase();
      ti = h.passend(c, titel, cw, 5, h.wortGroesse(c, titel, cw, 76, 900, "Saira Condensed"), 40, 900, "Saira Condensed", 0.98);
      h.zeilen(c, ti, cx, oy + 90, "#fff", 0.4);
      ty = oy + 90 + ti.hoehe + 26;
      var ende = d.qr ? oy + oh - 270 : oy + oh, platz = ende - ty;
      if (platz > 32) {
        t = h.passend(c, d.text, cw, Math.max(1, Math.min(10, Math.floor((platz - 32) / 44) + 1)), 32, 26, 500, "Barlow", 1.38);
        h.zeilen(c, t, cx, ty, "#c9ced6");
      }
      h.motto(c, d.footer, M, H - 50, 34, "left");
      h.qr(c, d, cx, oy + oh - 240, 200);
    }
  } }
];
