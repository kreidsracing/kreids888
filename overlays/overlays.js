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
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 300, 54, 26, 900);
    var kw = c.measureText(d.kicker).width + 70;
    h.schraeg(c, M - 20, 84, kw, 84, 22, h.ROT);
    h.text(c, d.kicker, M + 14, 126 + ks * 0.33, h.f(900, ks), "#fff");
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
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 330, 44, 24, 900);
    var tb = Math.max(560, c.measureText(d.kicker).width + 160);
    c.fillStyle = "rgba(10,11,14,.92)"; c.fillRect(M, y, tb, 78);
    c.fillStyle = h.ROT; c.fillRect(M, y, 104, 78);
    h.text(c, "P1", M + 52, y + 56, h.f(900, 50), "#fff", "center");
    h.text(c, d.kicker, M + 130, y + 39 + ks * 0.38, h.f(900, ks), "#fff");
    c.fillStyle = h.ROT; c.fillRect(M + tb, y, 8, 78);
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
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 420, 38, 20, 900);
    var kw = c.measureText(d.kicker).width + 48;
    h.schraeg(c, W - M - 60 - kw, M + 48, kw, 60, 12, h.ROT);
    h.text(c, d.kicker, W - M - 60 - kw / 2, M + 78 + ks * 0.36, h.f(900, ks), "#fff", "center", 0.1);
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
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 60, 40, 22, 900);
    var kw = c.measureText(d.kicker).width + 56;
    h.schraeg(c, M, tiy - 92, kw, 62, 16, h.ROT);
    h.text(c, d.kicker, M + 28, tiy - 61 + ks * 0.37, h.f(900, ks), "#fff");
  } },

  /* ---------- 5) KLAR: Bild oben, ruhiges Textfeld unten ---------- */
  { id: "klar", name: "Klar", draw: function (c, W, H, d, h) {
    var M = 72, teil = Math.round(H * 0.58);
    // Bildteil wird kleiner, wenn Titel + Text sonst nicht ganz reinpassen
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 3, 104, 64, 900, "Saira Condensed", 0.98);
    if (H - M - 100 - (teil + 140 + ti.hoehe) < 90) ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 2, 104, 56, 900, "Saira Condensed", 0.98);
    var t = String(d.text || "").trim() ? h.passend(c, d.text, W - 2 * M, 6, 40, 32, 500, "Barlow", 1.4) : null;
    var noetig = 110 + ti.hoehe + 30 + (t ? t.hoehe : 0) + 100 + M;
    if (H - teil < noetig) teil = Math.max(Math.round(H * 0.3), H - noetig);
    c.fillStyle = "#0e0f14"; c.fillRect(0, 0, W, H);
    h.bild(c, d, 0, 0, W, teil);
    h.verlauf(c, 0, teil - 220, 0, teil, [[0, "rgba(14,15,20,0)"], [1, "rgba(14,15,20,1)"]]);
    c.fillStyle = h.ROT; c.fillRect(M, teil - 6, 180, 6);
    h.text(c, d.kicker, M, teil + 70, h.f(800, h.passGroesse(c, d.kicker, W - 2 * M - 120, 38, 22, 800, 0.22)), h.ROT, "left", 0.22);
    h.zeilen(c, ti, M, teil + 110, "#fff", 0.6);
    var ty = teil + 110 + ti.hoehe + 30;
    if (t) h.zeilen(c, t, M, ty, "#c9ced6");
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
    h.text(c, d.kicker, M, tiy - 70, h.f(800, h.passGroesse(c, d.kicker, W - 2 * M, 34, 20, 800, 0.22)), "#ff4b55", "left", 0.22);
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
    var ks = h.passGroesse(c, d.kicker, (strecke ? W * 0.5 : W - 2 * M - 60), 40, 22, 900);
    var kw = Math.max(c.measureText(d.kicker).width, 10) + 56;
    h.schraeg(c, M, gy - 400, kw, 62, 16, h.ROT);
    h.text(c, d.kicker, M + 28, gy - 369 + ks * 0.37, h.f(900, ks), "#fff");
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
    h.text(c, d.kicker, M, wy - 26, h.f(800, h.passGroesse(c, d.kicker, W - 2 * M, 34, 20, 800, 0.22)), "#fff", "left", 0.22);
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
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 340, 36, 18, 900, 0.08);
    var kw = c.measureText(d.kicker).width + 48;
    h.schraeg(c, W - M - kw - 10, 62, kw, 58, 12, h.ROT);
    h.text(c, d.kicker, W - M - 10 - kw / 2, 91 + ks * 0.36, h.f(900, ks), "#fff", "center", 0.08);
    var fy = 150, fh = gross ? 1100 : 560;
    var px = M + 36, pw = W - 2 * M - 72, pb = H - M - 104;
    var ti = h.passend(c, d.title.toUpperCase(), pw, gross ? 3 : 2, 84, 54, 900, "Saira Condensed", 0.98);
    // Videofenster wird flacher, wenn der Text sonst nicht ganz reinpasst
    var t = String(d.text || "").trim() ? h.passend(c, d.text, pw, gross ? 6 : 3, 36, 28, 500, "Barlow", 1.38) : null;
    if (t) fh = Math.max(Math.round(W * 0.35), Math.min(fh, pb - fy - (6 + 34 + ti.hoehe + 22 + t.hoehe + 30)));
    h.fenster(c, d, M, fy, W - 2 * M, fh);
    h.linie(c, M, fy + fh, W - 2 * M, 6);
    var py = fy + fh + 6;
    c.fillStyle = "#13151b"; c.fillRect(M, py, W - 2 * M, pb - py);
    h.zeilen(c, ti, px, py + 34, "#fff", 0.6);
    var ty = py + 34 + ti.hoehe + 22;
    if (t) h.zeilen(c, t, px, ty, "#c9ced6");
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
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 60, 40, 22, 900, 0.06);
    var kw = c.measureText(d.kicker).width + 56;
    h.schraeg(c, M, fh - 30, kw, 70, 16, "#fff");
    h.text(c, d.kicker, M + kw / 2, fh + 5 + ks * 0.37, h.f(900, ks), "#0b0c10", "center", 0.06);
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
    // Videofenster wird flacher, wenn der Text sonst nicht ganz reinpasst
    var t = String(d.text || "").trim() ? h.passend(c, d.text, W - 2 * M, gross ? 7 : 3, 38, 30, 500, "Barlow", 1.38) : null;
    if (t) fh = Math.max(Math.round(W * 0.35), Math.min(fh, H - M - 110 - 50 - t.hoehe - fy));
    c.fillStyle = "#0b0c10"; c.fillRect(0, 0, W, H);
    if (h.hatMedium(d)) {
      c.save(); c.filter = "blur(28px)";
      h.bild(c, { img: d.img, view: { zoom: 1.1, ox: 0, oy: 0 } }, -40, -40, W + 80, H + 80);
      c.restore();
    }
    h.abdunkeln(c, W, H, "rgba(10,11,14,.62)");
    h.fenster(c, d, 0, fy, W, fh);
    h.linie(c, 0, fy - 6, W, 6); h.linie(c, 0, fy + fh, W, 6);
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, gross ? 3 : 2, 100, 60, 900, "Saira Condensed", 0.96);
    var tiy = fy - 44 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    h.text(c, d.kicker, M, tiy - 22, h.f(800, h.passGroesse(c, d.kicker, W - 2 * M, 36, 20, 800, 0.22)), "#ff4b55", "left", 0.22);
    var ty = fy + fh + 50;
    if (t) h.zeilen(c, t, M, ty, "#dfe2e7");
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
      var ks = h.passGroesse(c, d.kicker, W - 2 * M - 340, 36, 18, 900, 0.08); kw = c.measureText(d.kicker).width + 48;
      h.schraeg(c, W - M - kw - 10, 62, kw, 58, 12, h.ROT);
      h.text(c, d.kicker, W - M - 10 - kw / 2, 91 + ks * 0.36, h.f(900, ks), "#fff", "center", 0.08);
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
      var ks2 = h.passGroesse(c, d.kicker, cw - 60, 34, 16, 900, 0.06); kw = c.measureText(d.kicker).width + 44;
      h.schraeg(c, cx + 12, oy, kw, 54, 12, h.ROT);
      h.text(c, d.kicker, cx + 12 + kw / 2, oy + 27 + ks2 * 0.36, h.f(900, ks2), "#fff", "center", 0.06);
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
  } },

  /* ================= TRICKKISTE: animierte Designs (bewegen sich in Vorschau + Video) ================= */

  /* ---------- 15) GLITCH: Bildstörung, RGB-Versatz, Scanlines ---------- */
  { id: "glitch", name: "Glitch", anim: true, draw: function (c, W, H, d, h) {
    var M = 72, t = d.zeit == null ? 0.37 : d.zeit, seed = Math.floor(t * 9);
    var rnd = function (n) { var x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return x - Math.floor(x); };
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, H * 0.3, 0, H, [[0, "rgba(6,7,10,0)"], [0.5, "rgba(6,7,10,.8)"], [1, "rgba(6,7,10,.97)"]]);
    // verschobene Bildstreifen
    var k = c.getTransform().a, stark = d.zeit == null ? 1 : rnd(0);
    if (stark > 0.35) for (var i = 0; i < 4; i++) {
      var y = rnd(i + 1) * H * 0.75, hh = 12 + rnd(i + 5) * 60, off = (rnd(i + 9) - 0.5) * 140;
      c.drawImage(c.canvas, 0, y * k, W * k, hh * k, off, y, W, hh);
      c.fillStyle = i % 2 ? "rgba(0,255,240,.12)" : "rgba(255,20,60,.14)"; c.fillRect(0, y, W, hh);
    }
    c.fillStyle = "rgba(0,0,0,.22)"; for (var sy = 0; sy < H; sy += 6) c.fillRect(0, sy, W, 2);
    // Kopf: Terminal-Kicker
    var cur = Math.floor(t * 2) % 2 === 0 ? "_" : " ";
    var ks = h.passGroesse(c, "> " + d.kicker + "_", W - 2 * M - 260, 44, 22, 800);
    h.text(c, "> " + d.kicker + cur, M, 130, h.f(800, ks), "#00fff0", "left", 0.06);
    h.text(c, "REC ● " + new Date(0, 0, 0, 0, 0, Math.floor(t)).toTimeString().slice(3, 8), M, 178, h.f(700, 28), "rgba(255,255,255,.7)", "left", 0.2);
    h.qr(c, d, W - M - 190, 80, 190);
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var tx = h.passend(c, d.text, W - 2 * M, 4, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - tx.hoehe;
    h.zeilen(c, tx, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 3, 124, 70, 900, "Saira Condensed", 0.95);
    var tiy = ty - 36 - ti.hoehe, dx = 4 + (rnd(20) > 0.72 ? 8 : 0);
    c.save(); c.globalCompositeOperation = "lighter";
    h.zeilen(c, ti, M - dx, tiy, "rgba(0,255,240,.8)", 0.6);
    h.zeilen(c, ti, M + dx, tiy + (rnd(21) > 0.8 ? 4 : 0), "rgba(255,20,60,.85)", 0.6);
    c.restore();
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
  } },

  /* ---------- 16) STARTAMPEL: 5 rote Lichter gehen an … und aus ---------- */
  { id: "ampel", name: "Startampel", anim: true, draw: function (c, W, H, d, h) {
    var M = 64, t = d.zeit == null ? 2.9 : d.zeit % 6, an = t < 3 ? Math.min(5, Math.floor(t / 0.6) + 1) : t < 3.9 ? 5 : 0;
    var go = t >= 3.9 && d.zeit != null;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.75)"], [0.35, "rgba(10,11,14,.25)"], [0.6, "rgba(10,11,14,.6)"], [1, "rgba(10,11,14,.97)"]]);
    // Ampel-Gehäuse
    var gx = M, gy = 90, gw = W - 2 * M, gh = 230, sp = gw / 5;
    c.fillStyle = "#111318"; c.fillRect(gx, gy, gw, gh);
    c.fillStyle = "#2a2e37"; c.fillRect(gx, gy, gw, 10); c.fillRect(gx, gy + gh - 10, gw, 10);
    for (var i = 0; i < 5; i++) {
      var cx = gx + sp * i + sp / 2;
      c.fillStyle = "#1c1f26"; c.fillRect(cx - sp * 0.36, gy + 22, sp * 0.72, gh - 44);
      for (var j = 0; j < 2; j++) {
        var cy = gy + 75 + j * 80, leuchtet = i < an;
        c.save();
        if (leuchtet) { c.shadowColor = "rgba(255,20,30,.95)"; c.shadowBlur = 40; }
        c.fillStyle = leuchtet ? "#ff1e2d" : "#30343d";
        c.beginPath(); c.arc(cx, cy, 30, 0, Math.PI * 2); c.fill(); c.restore();
        if (leuchtet) { c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.arc(cx - 9, cy - 10, 9, 0, Math.PI * 2); c.fill(); }
      }
    }
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var tx = h.passend(c, d.text, W - 2 * M, 3, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - tx.hoehe;
    h.zeilen(c, tx, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 3, 120, 70, 900, "Saira Condensed", 0.95);
    var tiy = ty - 36 - ti.hoehe;
    c.save(); if (go) { c.shadowColor = "rgba(255,255,255,.8)"; c.shadowBlur = 30 * (1 - (t - 3.9) / 2.1); }
    h.zeilen(c, ti, M, tiy, "#fff", 0.6); c.restore();
    var lo = go ? "LIGHTS OUT!" : d.kicker;
    var ks = h.passGroesse(c, lo, W - 2 * M - 60, 46, 22, 900);
    var kw = c.measureText(lo).width + 56;
    h.schraeg(c, M, tiy - 96, kw, 66, 16, go ? "#fff" : h.ROT);
    h.text(c, lo, M + 28, tiy - 63 + ks * 0.37, h.f(900, ks), go ? "#0b0c10" : "#fff");
    h.qr(c, d, W - M - 190, gy + gh + 40, 190);
  } },

  /* ---------- 17) SCHNELLSTE RUNDE: lila Timing-Grafik wie im TV ---------- */
  { id: "fastest", name: "Schnellste Runde", anim: true, felder: ["rundenzeit", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, LILA = "#a43cff", t = d.zeit == null ? 99 : (d.aufn ? d.zeit : d.zeit % 6);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.35)"], [0.45, "rgba(10,11,14,.55)"], [1, "rgba(10,11,14,.97)"]]);
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var tx = h.passend(c, d.text, W - 2 * M, 3, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - tx.hoehe;
    h.zeilen(c, tx, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 2, 96, 60, 900, "Saira Condensed", 0.96);
    var tiy = ty - 30 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    // Timing-Box (fährt von links rein)
    var bh = 330, by = tiy - 60 - bh, bw = W - 2 * M, ein = Math.min(1, t / 0.6), ease = 1 - Math.pow(1 - ein, 3);
    c.save(); c.translate(-(1 - ease) * (bw + M), 0);
    c.fillStyle = "rgba(12,10,20,.93)"; c.fillRect(M, by, bw, bh);
    c.fillStyle = LILA; c.fillRect(M, by, bw, 74);
    // Stoppuhr
    c.strokeStyle = "#fff"; c.lineWidth = 6; c.beginPath(); c.arc(M + 50, by + 40, 20, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "#fff"; c.fillRect(M + 45, by + 8, 10, 8); c.fillRect(M + 48, by + 26, 4, 15);
    h.text(c, "SCHNELLSTE RUNDE", M + 90, by + 54, h.f(900, 44), "#fff", "left", 0.08);
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), M + bw - 30, by + 52, h.f(700, 30), "rgba(255,255,255,.85)", "right", 0.12);
    h.logo(c, M + 34, by + 150, 52);
    h.text(c, "#888", M + 34, by + 200, h.f(800, 34), "#9aa1ab", "left", 0.1);
    // Rundenzeit tickt hoch und rastet ein
    var ziel = d.rundenzeit || "1:58.432", zeige = ziel;
    if (t < 1.6) {
      var p = Math.min(1, Math.max(0, (t - 0.4) / 1.2)), n = ziel.replace(/\d/g, "").length, chars = ziel.split("");
      zeige = chars.map(function (ch, i) { return /\d/.test(ch) && i > p * chars.length ? String(Math.floor((t * 37 + i * 7) % 10)) : ch; }).join("");
    }
    var gs = h.passGroesse(c, zeige, bw - 420, 150, 60, 900);
    c.save(); if (t >= 1.6 && t < 2.6) { c.shadowColor = LILA; c.shadowBlur = 40 * (1 - (t - 1.6)); }
    h.text(c, zeige, M + bw - 34, by + 230, h.f(900, gs), "#fff", "right", 0.02); c.restore();
    // Sektoren
    var sw = (bw - 68 - 20) / 3;
    for (var i = 0; i < 3; i++) {
      var sx = M + 34 + i * (sw + 10), voll = Math.min(1, Math.max(0, (t - 0.5 - i * 0.35) / 0.35));
      c.fillStyle = "rgba(255,255,255,.1)"; c.fillRect(sx, by + 268, sw, 34);
      c.fillStyle = LILA; c.fillRect(sx, by + 268, sw * voll, 34);
      h.text(c, "S" + (i + 1), sx + 12, by + 295, h.f(800, 26), "#fff", "left", 0.1);
    }
    c.restore();
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- 18) NEON: Leuchtröhren-Rahmen mit Flackern ---------- */
  { id: "neon", name: "Neon", anim: true, draw: function (c, W, H, d, h) {
    var M = 80, t = d.zeit == null ? 0.5 : d.zeit, f = Math.floor(t * 12);
    var flacker = d.zeit == null ? 1 : (Math.sin(f * 78.233) * 43758.5 % 1 + 1) % 1 > 0.08 ? 1 : 0.35;
    h.bild(c, d, 0, 0, W, H);
    h.abdunkeln(c, W, H, "rgba(6,4,10,.55)");
    h.verlauf(c, 0, H * 0.4, 0, H, [[0, "rgba(6,4,10,0)"], [1, "rgba(6,4,10,.9)"]]);
    function roehre(fn, farbe, breite) {
      c.save(); c.globalAlpha = flacker; c.strokeStyle = farbe; c.shadowColor = farbe; c.lineJoin = "round"; c.lineCap = "round";
      c.shadowBlur = 40; c.lineWidth = breite; fn(); c.shadowBlur = 16; fn();
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = Math.max(2, breite / 3); c.shadowBlur = 0; fn(); c.restore();
    }
    var r = 26, x0 = 40, y0 = 40, x1 = W - 40, y1 = H - 40;
    roehre(function () { c.beginPath(); c.moveTo(x0 + r, y0); c.arcTo(x1, y0, x1, y1, r); c.arcTo(x1, y1, x0, y1, r); c.arcTo(x0, y1, x0, y0, r); c.arcTo(x0, y0, x1, y0, r); c.closePath(); c.stroke(); }, "#ff1e3c", 8);
    // Kicker als Leuchtschrift
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 240, 64, 28, 900, 0.1);
    c.save(); c.globalAlpha = flacker; c.font = h.f(900, ks); if ("letterSpacing" in c) c.letterSpacing = Math.round(ks * 0.1) + "px";
    c.shadowColor = "#ff8a1e"; c.shadowBlur = 30; c.fillStyle = "#ffd2a8"; c.fillText(d.kicker, M, 170);
    c.shadowBlur = 0; c.restore();
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var tx = h.passend(c, d.text, W - 2 * M, 3, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - tx.hoehe;
    h.zeilen(c, tx, M, ty, "#e6e2ee");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 3, 120, 70, 900, "Saira Condensed", 0.98);
    var tiy = ty - 40 - ti.hoehe;
    c.save(); c.globalAlpha = 0.6 + 0.4 * flacker; c.shadowColor = "#ff1e3c"; c.shadowBlur = 36;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6); c.restore();
    h.qr(c, d, W - M - 190, 90, 190);
  } },

  /* ---------- 19) VOLLGAS: Speed-Linien, schräger Titel, Zielflagge ---------- */
  { id: "speed", name: "Vollgas", anim: true, draw: function (c, W, H, d, h) {
    var M = 72, t = d.zeit == null ? 0.3 : d.zeit;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.4)"], [0.45, "rgba(10,11,14,.35)"], [1, "rgba(10,11,14,.97)"]]);
    // Speed-Linien
    c.save(); c.translate(W / 2, H * 0.4); c.rotate(-0.22);
    for (var i = 0; i < 26; i++) {
      var rr = Math.sin(i * 12.9898) * 43758.5453; rr = rr - Math.floor(rr);
      var len = 160 + rr * 420, y = (rr * 2 - 1) * H * 0.55, x = ((rr * 3000 + t * (1400 + rr * 1600)) % (W * 2.4)) - W * 1.2;
      var g = c.createLinearGradient(x, 0, x + len, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, i % 4 ? "rgba(255,255,255,.55)" : "rgba(225,19,36,.85)");
      c.fillStyle = g; c.fillRect(x, y, len, 2 + rr * 5);
    }
    c.restore();
    // Zielflagge (läuft durch)
    var fy = H - M, q = 26, sy = fy - 100 - 2 * q - 30, off = (t * 60) % (2 * q);
    c.save(); c.beginPath(); c.rect(0, sy, W, 2 * q); c.clip();
    for (var cx = -2 * q; cx < W + 2 * q; cx += q) for (var r = 0; r < 2; r++) {
      c.fillStyle = (Math.round(cx / q) + r) % 2 ? "#fff" : "#0b0c10"; c.fillRect(cx + off, sy + r * q, q, q);
    }
    c.restore();
    h.fuss(c, M, W - M, fy, d.footer);
    var tx = h.passend(c, d.text, W - 2 * M, 3, 38, 30, 500, "Barlow", 1.38);
    var ty = sy - 36 - tx.hoehe;
    h.zeilen(c, tx, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M - 60, 3, 136, 76, 900, "Saira Condensed", 0.92);
    var tiy = ty - 40 - ti.hoehe;
    c.save(); c.translate(M + 40, tiy); c.transform(1, 0, -0.18, 1, 0, 0);
    c.shadowColor = "rgba(225,19,36,.9)"; c.shadowOffsetX = 10; c.shadowOffsetY = 0; c.shadowBlur = 0;
    h.zeilen(c, ti, 0, 0, "#fff", 0.4); c.restore();
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 60, 44, 22, 900);
    var kw = c.measureText(d.kicker).width + 60;
    h.schraeg(c, M, tiy - 90, kw, 64, 20, h.ROT);
    h.text(c, d.kicker, M + 30, tiy - 58 + ks * 0.37, h.f(900, ks), "#fff");
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- 20) TELEMETRIE: Drehzahl, Gang, Gas/Bremse wie im HUD ---------- */
  { id: "telemetrie", name: "Telemetrie", anim: true, draw: function (c, W, H, d, h) {
    var M = 60, t = d.zeit == null ? 1.1 : d.zeit;
    var ph = (t % 6) / 6, gas = Math.max(0, Math.min(1, 0.55 + 0.6 * Math.sin(t * 1.9))), bremse = Math.max(0, Math.min(1, -0.3 - 0.9 * Math.sin(t * 1.9)));
    var kmh = Math.round(120 + 160 * (0.5 + 0.5 * Math.sin(t * 1.9 - 0.8))), gang = Math.max(2, Math.min(6, Math.round(kmh / 48)));
    var drz = (kmh % 48) / 48 * 0.7 + 0.3;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.92)"], [0.38, "rgba(10,11,14,.15)"], [0.62, "rgba(10,11,14,.25)"], [1, "rgba(10,11,14,.97)"]]);
    // oben: Kicker, Titel, Text
    var ks = h.passGroesse(c, d.kicker, W - 2 * M - 300, 36, 20, 800, 0.22);
    h.text(c, d.kicker, M, 110, h.f(800, ks), "#00e5ff", "left", 0.22);
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M - 230, 3, 96, 60, 900, "Saira Condensed", 0.96);
    h.zeilen(c, ti, M, 130, "#fff", 0.6);
    var tx = h.passend(c, d.text, W - 2 * M - 230, H > 1500 ? 4 : 2, 36, 28, 500, "Barlow", 1.38);
    h.zeilen(c, tx, M, 130 + ti.hoehe + 22, "#d5d9e0");
    // HUD unten
    var hh = 330, hy = H - M - 90 - hh;
    c.fillStyle = "rgba(8,9,12,.86)"; c.fillRect(M, hy, W - 2 * M, hh);
    c.fillStyle = "#00e5ff"; c.fillRect(M, hy, W - 2 * M, 3);
    // Schaltblitz-LEDs
    var leds = 12, lw = (W - 2 * M - 80) / leds;
    for (var i = 0; i < leds; i++) {
      var an = i / leds < drz, farbe = i < 5 ? "#22e06b" : i < 9 ? "#ffcc00" : "#ff1e2d";
      c.save(); if (an) { c.shadowColor = farbe; c.shadowBlur = 16; }
      c.fillStyle = an ? farbe : "#23262d"; c.beginPath(); c.arc(M + 40 + lw * i + lw / 2, hy + 40, Math.min(14, lw * 0.32), 0, Math.PI * 2); c.fill(); c.restore();
    }
    // Tacho-Bogen
    var cx = M + 190, cy = hy + 230, rad = 120, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, wert = (kmh - 60) / 260;
    c.lineCap = "round"; c.lineWidth = 18; c.strokeStyle = "#23262d"; c.beginPath(); c.arc(cx, cy, rad, a0, a1); c.stroke();
    var g = c.createLinearGradient(cx - rad, 0, cx + rad, 0); g.addColorStop(0, "#00e5ff"); g.addColorStop(1, h.ROT);
    c.strokeStyle = g; c.beginPath(); c.arc(cx, cy, rad, a0, a0 + (a1 - a0) * Math.max(0.02, Math.min(1, wert))); c.stroke(); c.lineCap = "butt";
    h.text(c, String(kmh), cx, cy + 18, h.f(900, 76), "#fff", "center");
    h.text(c, "KM/H", cx, cy + 60, h.f(700, 24), "#9aa1ab", "center", 0.2);
    // Gang
    var gx = M + 420;
    h.text(c, String(gang), gx + 70, hy + 270, h.f(900, 190), "#fff", "center");
    h.text(c, "GANG", gx + 70, hy + 300, h.f(700, 24), "#9aa1ab", "center", 0.2);
    // Gas / Bremse
    var bx = W - M - 230, bt = hy + 80, bhh = 210;
    [["GAS", gas, "#22e06b"], ["BREMSE", bremse, "#ff1e2d"]].forEach(function (b, i) {
      var x = bx + i * 110;
      c.fillStyle = "#23262d"; c.fillRect(x, bt, 60, bhh);
      c.fillStyle = b[2]; c.fillRect(x, bt + bhh * (1 - b[1]), 60, bhh * b[1]);
      h.text(c, b[0], x + 30, bt + bhh + 34, h.f(700, 22), "#9aa1ab", "center", 0.12);
    });
    // Fußzeile
    h.logo(c, M, H - M - 10, 46);
    h.motto(c, d.footer, W - M, H - M - 12, 34, "right");
    h.qr(c, d, W - M - 200, 80, 200);
  } }
];

/* ===========================================================
   WEITERE ANIMIERTE OVERLAYS (Okt 2026): Unfall, Zieleinlauf,
   Bestzeit, Gelbe Flagge, Überholt, Boxenstopp, Sieger, Replay, Teamfunk
   =========================================================== */
(function () {
  // fester Zufall (gleich bei jedem Bild, damit Konfetti/Funken ruhig laufen)
  function zufall(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function ease(p) { p = Math.max(0, Math.min(1, p)); return 1 - Math.pow(1 - p, 3); }
  // Zeit: Vorschau läuft in Schleife, Video läuft durch, Bild = Endzustand
  function zeit(d, schleife) { return d.zeit == null ? 99 : (d.aufn ? d.zeit : d.zeit % (schleife || 6)); }
  function lauf(d) { return d.zeit == null ? 0.4 : d.zeit; }
  // Block unten: Fußzeile, Text, Überschrift; gibt Oberkante der Überschrift zurück
  function block(c, W, H, d, h, M, farbe, maxTi) {
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    var tx = h.passend(c, d.text, W - 2 * M, 3, 38, 30, 500, "Barlow", 1.38);
    var ty = fy - 110 - tx.hoehe;
    h.zeilen(c, tx, M, ty, "#d5d9e0");
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, maxTi || 3, 112, 64, 900, "Saira Condensed", 0.95);
    var tiy = ty - 30 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, farbe || "#fff", 0.6);
    return tiy;
  }
  // Breite inkl. Buchstabenabstand (wie h.text zeichnet)
  function breite(c, h, s, gr, w, sp) { c.save(); c.font = h.f(w, gr); if ("letterSpacing" in c) c.letterSpacing = Math.round(gr * (sp || 0)) + "px"; var b = c.measureText(s).width; c.restore(); return b; }
  function etikett(c, h, s, x, y, bg, fg, groesse) {
    var gs = groesse || 40;
    c.font = h.f(900, gs); var w = c.measureText(s).width + gs * 1.3;
    h.schraeg(c, x, y, w, gs * 1.5, gs * 0.35, bg);
    h.text(c, s, x + gs * 0.65, y + gs * 1.08, h.f(900, gs), fg || "#fff", "left", 0.06);
    return w;
  }
  function streifen(c, x, y, w, hh, off, a, b) {
    c.save(); c.beginPath(); c.rect(x, y, w, hh); c.clip();
    c.fillStyle = a; c.fillRect(x, y, w, hh); c.fillStyle = b;
    var st = hh * 1.1;
    for (var sx = x - hh - st * 2 + (off % (st * 2)); sx < x + w + hh; sx += st * 2) {
      c.beginPath(); c.moveTo(sx, y + hh); c.lineTo(sx + hh, y); c.lineTo(sx + hh + st, y); c.lineTo(sx + st, y + hh); c.closePath(); c.fill();
    }
    c.restore();
  }
  function konfetti(c, W, H, t, anz, farben, start) {
    for (var i = 0; i < anz; i++) {
      var r = zufall(i), sp = 140 + zufall(i + 50) * 220, x = r * W + Math.sin(t * 2 + i) * 30;
      var y = ((zufall(i + 100) * H + t * sp) % (H + 60)) - 30;
      if (start != null && t < start) continue;
      c.save(); c.translate(x, y); c.rotate(t * (2 + zufall(i + 7) * 4) + i);
      c.fillStyle = farben[i % farben.length]; c.fillRect(-9, -4, 18, 8 * Math.abs(Math.cos(t * 3 + i)) + 2); c.restore();
    }
  }
  function blinklicht(c, x, y, r, an, farbe) {
    c.save();
    if (an) { c.shadowColor = farbe; c.shadowBlur = r * 2.2; }
    c.fillStyle = an ? farbe : "rgba(60,60,60,.85)"; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0; c.fillStyle = an ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.08)";
    c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // Hilfen auch für weitere Overlay-Pakete
  window.K888_OV_HILFE = { zufall: zufall, ease: ease, zeit: zeit, lauf: lauf, block: block, etikett: etikett, streifen: streifen, konfetti: konfetti, blinklicht: blinklicht, breite: breite };

  window.K888_OVERLAYS.push(

  /* ---------- UNFALL: Warnstreifen, Warndreieck, Aufprall-Blitz ---------- */
  { id: "unfall", name: "Unfall", anim: true, felder: ["strecke"], draw: function (c, W, H, d, h) {
    var M = 64, t = lauf(d), zyk = t % 4, stoss = zyk < 0.4 ? (1 - zyk / 0.4) : 0;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.45)"], [0.4, "rgba(10,11,14,.2)"], [0.6, "rgba(10,11,14,.6)"], [1, "rgba(10,11,14,.97)"]]);
    if (d.zeit != null && stoss > 0) { c.fillStyle = "rgba(225,19,36," + (0.28 * stoss) + ")"; c.fillRect(0, 0, W, H); }
    streifen(c, 0, 0, W, 46, t * 140, "#ffc400", "#0b0c10");
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    streifen(c, 0, tiy - 196, W, 22, -t * 140, "#ffc400", "#0b0c10");
    // Warndreieck + Schriftzug, wackelt beim Aufprall
    var wx = Math.sin(t * 80) * 10 * stoss, an = d.zeit == null || Math.floor(t * 3) % 2 === 0;
    c.save(); c.translate(wx, 0);
    var dy = tiy - 150, dx = M;
    c.save(); if (an) { c.shadowColor = "#ffc400"; c.shadowBlur = 30; }
    c.fillStyle = an ? "#ffc400" : "#7a6200"; c.beginPath(); c.moveTo(dx + 52, dy); c.lineTo(dx + 104, dy + 90); c.lineTo(dx, dy + 90); c.closePath(); c.fill(); c.restore();
    c.fillStyle = "#0b0c10"; c.fillRect(dx + 47, dy + 28, 10, 34); c.fillRect(dx + 47, dy + 68, 10, 10);
    h.text(c, "UNFALL", dx + 128, dy + 78, h.f(900, 92), "#fff", "left", 0.04);
    if (d.strecke) { var uw = breite(c, h, "UNFALL", 92, 900, 0.04); h.text(c, d.strecke.toUpperCase(), dx + 128 + uw + 28, dy + 76, h.f(700, 36), "#ffc400", "left", 0.1); }
    c.restore();
    // Streckenposten-Lichter + REPLAY
    blinklicht(c, M + 26, 110, 22, d.zeit == null || Math.floor(t * 4) % 2 === 0, "#ffc400");
    blinklicht(c, M + 82, 110, 22, d.zeit != null && Math.floor(t * 4) % 2 === 1, "#ffc400");
    if (d.zeit == null || Math.floor(t * 2) % 2 === 0) { c.fillStyle = "#ff2a35"; c.beginPath(); c.arc(W - M - 196, 110, 13, 0, Math.PI * 2); c.fill(); }
    h.text(c, "REPLAY", W - M, 124, h.f(900, 42), "#fff", "right", 0.12);
    h.qr(c, d, W - M - 190, 170, 190);
  } },

  /* ---------- ZIELEINLAUF: wehende Zielflagge, Platz springt rein, Konfetti ---------- */
  { id: "ziel", name: "Zieleinlauf", anim: true, felder: ["platz", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, t = zeit(d, 7), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.35)"], [0.45, "rgba(10,11,14,.45)"], [1, "rgba(10,11,14,.97)"]]);
    // Zielflagge
    var sp = 20, zei = 5, gr = W / sp, fy0 = 40;
    for (var x = 0; x < sp; x++) {
      var welle = Math.sin(x * 0.55 - tl * 5) * 16, licht = 0.75 + 0.25 * Math.cos(x * 0.55 - tl * 5);
      for (var y = 0; y < zei; y++) {
        var hell = (x + y) % 2 === 0;
        var v = Math.round((hell ? 240 : 20) * licht);
        c.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
        c.fillRect(Math.floor(x * gr), Math.floor(fy0 + y * gr * 0.62 + welle), Math.ceil(gr) + 1, Math.ceil(gr * 0.62) + 1);
      }
    }
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    // Platz springt rein
    var pl = (d.platz || "1").replace(/^p/i, ""), ein = d.zeit == null ? 1 : ease((t - 0.3) / 0.5);
    var hupf = d.zeit == null ? 1 : 1 + Math.sin(Math.min(1, Math.max(0, (t - 0.3) / 0.7)) * Math.PI) * 0.18;
    var py = tiy - 60;
    c.save(); c.globalAlpha = ein; c.translate(M, py); c.scale(hupf, hupf);
    c.font = h.f(900, 230); var pw = c.measureText("P" + pl).width;
    h.text(c, "P", 0, 0, h.f(900, 230), h.ROT, "left", 0);
    h.text(c, pl, c.measureText("P").width + 10, 0, h.f(900, 230), "#fff", "left", 0);
    c.restore();
    h.text(c, "ZIELEINLAUF", M + pw * hupf + 40, py - 120, h.f(900, 56), "#fff", "left", 0.08);
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), M + pw * hupf + 40, py - 66, h.f(700, 34), "rgba(255,255,255,.75)", "left", 0.14);
    if (d.zeit != null) konfetti(c, W, H, tl, 70, ["#e11324", "#ffffff", "#ffffff", "#1a1d24"], 0);
    h.qr(c, d, W - M - 190, 230, 190);
  } },

  /* ---------- PERSÖNLICHE BESTZEIT: Zeit läuft hoch, grüne Sektoren, Auto auf Mini-Strecke ---------- */
  { id: "bestzeit", name: "Persönliche Bestzeit", anim: true, felder: ["rundenzeit", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, GRUEN = "#1fd36b", t = zeit(d, 7), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.4)"], [0.45, "rgba(10,11,14,.5)"], [1, "rgba(10,11,14,.97)"]]);
    var tiy = block(c, W, H, d, h, M, "#fff", 2);
    var bw = W - 2 * M, bh = 300, by = tiy - 50 - bh, ein = d.zeit == null ? 1 : ease(t / 0.5);
    c.save(); c.globalAlpha = ein; c.translate(0, (1 - ein) * 60);
    c.fillStyle = "rgba(9,14,12,.93)"; c.fillRect(M, by, bw, bh);
    c.fillStyle = GRUEN; c.fillRect(M, by, bw, 70);
    h.text(c, "PERSÖNLICHE BESTZEIT", M + 30, by + 51, h.f(900, 42), "#04140b", "left", 0.06);
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), M + bw - 30, by + 49, h.f(800, 30), "#04140b", "right", 0.1);
    // Mini-Strecke mit fahrendem Punkt
    var kx = M + 40, ky = by + 100, kw = 300, kh = 170;
    var punkte = [[0.1, 0.8], [0.05, 0.35], [0.3, 0.1], [0.62, 0.22], [0.75, 0.05], [0.95, 0.3], [0.85, 0.7], [0.55, 0.62], [0.42, 0.92]];
    c.save(); c.translate(kx, ky); c.lineJoin = "round";
    function pfad() { c.beginPath(); punkte.forEach(function (p, i) { var px = p[0] * kw, py = p[1] * kh; if (i) c.lineTo(px, py); else c.moveTo(px, py); }); c.closePath(); }
    c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 14; pfad(); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 4; pfad(); c.stroke();
    var weg = (tl * 0.22) % 1, n = punkte.length, seg = weg * n, i0 = Math.floor(seg), f = seg - i0;
    var a = punkte[i0 % n], b = punkte[(i0 + 1) % n], cx = (a[0] + (b[0] - a[0]) * f) * kw, cy = (a[1] + (b[1] - a[1]) * f) * kh;
    c.shadowColor = GRUEN; c.shadowBlur = 24; c.fillStyle = GRUEN; c.beginPath(); c.arc(cx, cy, 11, 0, Math.PI * 2); c.fill();
    c.restore();
    // Zeit zählt hoch und rastet ein
    var ziel = d.rundenzeit || "1:58.432", sek = 0, tz = ziel.match(/^(?:(\d+):)?(\d+)(?:[.,](\d+))?$/);
    if (tz) sek = (+tz[1] || 0) * 60 + (+tz[2]) + (tz[3] ? +("0." + tz[3]) : 0);
    var zeige = ziel;
    if (tz && d.zeit != null && t < 2.2) {
      var s = sek * ease(t / 2.2), mm = Math.floor(s / 60), rest = s - mm * 60, nk = tz[3] ? tz[3].length : 3;
      zeige = (tz[1] != null ? mm + ":" + (rest < 10 ? "0" : "") : "") + rest.toFixed(nk);
    }
    var gs = h.passGroesse(c, zeige, bw - kw - 120, 140, 50, 900);
    c.save(); if (d.zeit != null && t >= 2.2 && t < 3.2) { c.shadowColor = GRUEN; c.shadowBlur = 50 * (1 - (t - 2.2)); }
    h.text(c, zeige, M + bw - 34, by + 205, h.f(900, gs), d.zeit != null && t < 2.2 ? "#fff" : GRUEN, "right", 0.02); c.restore();
    var sw = (bw - kw - 120) / 3;
    for (var i = 0; i < 3; i++) {
      var sx = M + kw + 86 + i * (sw + 8), voll = d.zeit == null ? 1 : ease((t - 0.3 - i * 0.6) / 0.5);
      c.fillStyle = "rgba(255,255,255,.1)"; c.fillRect(sx, by + 236, sw, 34);
      c.fillStyle = GRUEN; c.fillRect(sx, by + 236, sw * voll, 34);
      h.text(c, "S" + (i + 1), sx + 10, by + 262, h.f(800, 24), "#04140b", "left", 0.1);
    }
    c.restore();
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- GELBE FLAGGE: Warnlichter, wehende Flagge ---------- */
  { id: "gelb", name: "Gelbe Flagge", anim: true, felder: ["strecke"], draw: function (c, W, H, d, h) {
    var M = 64, GELB = "#ffcc00", t = lauf(d), an = d.zeit == null || Math.floor(t * 3) % 2 === 0;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.5)"], [0.35, "rgba(10,11,14,.15)"], [0.6, "rgba(10,11,14,.6)"], [1, "rgba(10,11,14,.97)"]]);
    if (d.zeit != null) { c.fillStyle = "rgba(255,204,0," + (an ? 0.07 : 0) + ")"; c.fillRect(0, 0, W, H); }
    // Lichterleiste oben
    c.fillStyle = "rgba(10,11,14,.9)"; c.fillRect(M, 70, W - 2 * M, 96);
    for (var i = 0; i < 6; i++) blinklicht(c, M + 70 + i * ((W - 2 * M - 140) / 5), 118, 28, (i % 2 === 0) === an, GELB);
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    // wehende Flagge + Schriftzug
    var fx = M, fy = tiy - 180, fw = 150, fh = 100;
    c.fillStyle = "#d9d9d9"; c.fillRect(fx, fy - 10, 8, 150);
    for (var s = 0; s < 15; s++) {
      var wx = fx + 8 + s * fw / 15, wy = fy + Math.sin(s * 0.6 - t * 7) * 8 * (s / 15);
      c.fillStyle = s % 2 ? GELB : "#f5c000"; c.fillRect(wx, wy, fw / 15 + 1, fh);
    }
    var gx = fx + fw + 40;
    c.fillStyle = GELB; c.font = h.f(900, 70); var gw = c.measureText("GELBE FLAGGE").width + 50;
    h.schraeg(c, gx, fy + 4, gw, 92, 18, GELB);
    h.text(c, "GELBE FLAGGE", gx + 25, fy + 76, h.f(900, 70), "#0b0c10", "left", 0.03);
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), gx + 6, fy + 136, h.f(800, 34), GELB, "left", 0.12);
    h.qr(c, d, W - M - 190, 200, 190);
  } },

  /* ---------- ÜBERHOLT: alte Position fällt raus, neue kommt rein ---------- */
  { id: "ueberholt", name: "Überholt", anim: true, felder: ["platz"], draw: function (c, W, H, d, h) {
    var M = 64, GRUEN = "#1fd36b", t = zeit(d, 5), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.45)"], [0.4, "rgba(10,11,14,.25)"], [0.6, "rgba(10,11,14,.6)"], [1, "rgba(10,11,14,.97)"]]);
    // Tempo-Linien
    if (d.zeit != null) for (var i = 0; i < 14; i++) {
      var ly = 200 + zufall(i) * (H * 0.45), lx = ((zufall(i + 9) * W) - tl * 1600 * (0.6 + zufall(i + 3))) % (W + 400);
      if (lx < -400) lx += W + 400;
      c.fillStyle = "rgba(255,255,255," + (0.08 + zufall(i + 5) * 0.12) + ")"; c.fillRect(lx, ly, 240 + zufall(i + 2) * 200, 3);
    }
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    var neu = parseInt(String(d.platz || "4").replace(/\D/g, ""), 10) || 4, alt = neu + 1;
    var bx = M, by = tiy - 300, bh = 240, bw = 420;
    c.fillStyle = "rgba(10,11,14,.9)"; c.fillRect(bx, by, bw, bh);
    c.fillStyle = GRUEN; c.fillRect(bx, by, 10, bh);
    c.save(); c.beginPath(); c.rect(bx, by, bw, bh); c.clip();
    var p = d.zeit == null ? 1 : ease((t - 0.6) / 0.6);
    h.text(c, "P" + alt, bx + 50, by + 195 + p * bh, h.f(900, 190), "rgba(255,255,255,.5)", "left", 0);
    h.text(c, "P" + neu, bx + 50, by + 195 - (1 - p) * bh, h.f(900, 190), "#fff", "left", 0);
    c.restore();
    // Pfeil pulsiert
    var puls = d.zeit == null ? 1 : 1 + 0.12 * Math.sin(tl * 6);
    c.save(); c.translate(bx + bw + 90, by + bh / 2); c.scale(puls, puls);
    c.shadowColor = GRUEN; c.shadowBlur = 30; c.fillStyle = GRUEN;
    c.beginPath(); c.moveTo(0, -80); c.lineTo(62, 0); c.lineTo(22, 0); c.lineTo(22, 70); c.lineTo(-22, 70); c.lineTo(-22, 0); c.lineTo(-62, 0); c.closePath(); c.fill();
    c.restore();
    h.text(c, "POSITION", bx + bw + 180, by + 100, h.f(900, 54), "#fff", "left", 0.06);
    h.text(c, "GEWONNEN", bx + bw + 180, by + 160, h.f(900, 54), GRUEN, "left", 0.06);
    etikett(c, h, d.kicker, M, by - 96, h.ROT, "#fff", 36);
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- BOXENSTOPP: schwingende Boxentafel, Standzeit, Pit-Limiter ---------- */
  { id: "box", name: "Boxenstopp", anim: true, felder: ["platz", "rundenzeit"], draw: function (c, W, H, d, h) {
    var M = 64, t = zeit(d, 6), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.4)"], [0.4, "rgba(10,11,14,.3)"], [0.6, "rgba(10,11,14,.6)"], [1, "rgba(10,11,14,.97)"]]);
    var tiy = block(c, W, H, d, h, M, "#fff", 2);
    // Boxentafel
    var tw = 380, th = 330, tx = M + 20, ty = tiy - th - 60, wink = d.zeit == null ? 0 : Math.sin(tl * 2.4) * 0.04;
    c.save(); c.translate(tx + tw / 2, ty - 40); c.rotate(wink);
    c.fillStyle = "#9aa1ab"; c.fillRect(-6, -60, 12, 60);
    c.fillStyle = "#0b0c10"; c.fillRect(-tw / 2, 0, tw, th);
    c.strokeStyle = "#e5e7eb"; c.lineWidth = 6; c.strokeRect(-tw / 2 + 3, 3, tw - 6, th - 6);
    var zeilen = ["BOX", "P" + String(d.platz || "6").replace(/^p/i, ""), "888"];
    zeilen.forEach(function (z, i) { h.text(c, z, 0, 92 + i * 100, h.f(900, 90), i === 0 ? "#ffd400" : "#fff", "center", 0.06); });
    c.restore();
    // Standzeit läuft
    var ziel = parseFloat(String(d.rundenzeit || "24.8").replace(",", ".")) || 24.8;
    var s = d.zeit == null ? ziel : Math.min(ziel, ziel * ease(t / 3));
    var sx = tx + tw + 70, sy = ty + 20;
    h.text(c, "STANDZEIT", sx, sy + 40, h.f(800, 34), "rgba(255,255,255,.75)", "left", 0.14);
    h.text(c, s.toFixed(1) + " s", sx, sy + 150, h.f(900, 120), "#fff", "left", 0.02);
    var bw2 = W - M - sx; c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(sx, sy + 180, bw2, 16);
    c.fillStyle = "#ffd400"; c.fillRect(sx, sy + 180, bw2 * (s / ziel), 16);
    // Pit-Limiter blinkt blau/gelb
    var an = d.zeit == null || Math.floor(tl * 3) % 2 === 0;
    c.fillStyle = an ? "#1f6bff" : "#ffd400"; c.fillRect(sx, sy + 228, bw2, 70);
    h.text(c, "PIT LIMITER 60", sx + bw2 / 2, sy + 276, h.f(900, 42), an ? "#fff" : "#0b0c10", "center", 0.08);
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- SIEGER: drehende Goldstrahlen, Funkeln, Gold-Konfetti ---------- */
  { id: "sieg", name: "Sieger", anim: true, felder: ["platz", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, GOLD = "#ffc83a", t = zeit(d, 7), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.5)"], [0.45, "rgba(10,11,14,.5)"], [1, "rgba(10,11,14,.97)"]]);
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    var mx = W / 2, my = tiy - 230;
    // Strahlen
    c.save(); c.translate(mx, my); c.rotate(tl * 0.25);
    for (var i = 0; i < 16; i++) {
      c.rotate(Math.PI * 2 / 16);
      var g = c.createLinearGradient(0, 0, 0, -620); g.addColorStop(0, "rgba(255,200,58,.38)"); g.addColorStop(1, "rgba(255,200,58,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(-46, -620); c.lineTo(46, -620); c.closePath(); c.fill();
    }
    c.restore();
    // Platz in Gold
    var pl = (d.platz || "1").replace(/^p/i, ""), ein = d.zeit == null ? 1 : ease(t / 0.7), sk = 0.6 + 0.4 * ein;
    c.save(); c.translate(mx, my); c.scale(sk, sk); c.globalAlpha = ein;
    var gg = c.createLinearGradient(0, -140, 0, 60); gg.addColorStop(0, "#fff3c4"); gg.addColorStop(0.5, GOLD); gg.addColorStop(1, "#b07a10");
    c.shadowColor = "rgba(255,200,58,.8)"; c.shadowBlur = 50;
    c.font = h.f(900, 260); c.textAlign = "center"; c.fillStyle = gg; c.fillText("P" + pl, 0, 80);
    c.restore();
    h.text(c, "SIEG", mx, my + 150, h.f(900, 64), GOLD, "center", 0.3);
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), mx, my - 190, h.f(800, 36), "#fff", "center", 0.2);
    // Funkeln
    for (var k = 0; k < 14; k++) {
      var fx = mx + (zufall(k) - 0.5) * W * 0.9, fy = my + (zufall(k + 20) - 0.5) * 420, fa = Math.max(0, Math.sin(tl * 3 + k * 1.7));
      if (d.zeit == null) fa = zufall(k + 40) > 0.5 ? 0.8 : 0;
      c.save(); c.globalAlpha = fa; c.translate(fx, fy); c.fillStyle = "#fff";
      c.beginPath(); c.moveTo(0, -18); c.lineTo(4, -4); c.lineTo(18, 0); c.lineTo(4, 4); c.lineTo(0, 18); c.lineTo(-4, 4); c.lineTo(-18, 0); c.lineTo(-4, -4); c.closePath(); c.fill(); c.restore();
    }
    if (d.zeit != null) konfetti(c, W, H, tl, 50, [GOLD, "#fff3c4", "#ffffff", "#e11324"], 0);
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- REPLAY: TV-Wischblende, REC, Timecode, Zeitlupe ---------- */
  { id: "replay", name: "Replay", anim: true, felder: ["strecke"], draw: function (c, W, H, d, h) {
    var M = 64, t = zeit(d, 6), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.35)"], [0.5, "rgba(10,11,14,.2)"], [0.65, "rgba(10,11,14,.6)"], [1, "rgba(10,11,14,.97)"]]);
    // Scanlines
    c.fillStyle = "rgba(0,0,0,.12)"; for (var y = 0; y < H; y += 6) c.fillRect(0, y, W, 2);
    // Eckwinkel
    h.ecken(c, 40, 40, W - 80, H - 80, 80, 8, "rgba(255,255,255,.85)");
    var an = d.zeit == null || Math.floor(tl * 2) % 2 === 0;
    if (an) { c.fillStyle = "#ff2a35"; c.beginPath(); c.arc(M + 30, 110, 16, 0, Math.PI * 2); c.fill(); }
    h.text(c, "REC", M + 60, 124, h.f(900, 42), "#fff", "left", 0.1);
    var bild = Math.floor(tl * 25), tc = ["00", String(Math.floor(bild / 1500) % 60).padStart(2, "0"), String(Math.floor(bild / 25) % 60).padStart(2, "0"), String(bild % 25).padStart(2, "0")].join(":");
    h.text(c, tc, W - M - 10, 124, h.f(800, 40), "#fff", "right", 0.08);
    h.text(c, "0.5×  ZEITLUPE", W - M - 10, 172, h.f(700, 28), "rgba(255,255,255,.75)", "right", 0.12);
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    // REPLAY-Band mit Wischblende
    var by = tiy - 150, wisch = d.zeit == null ? 1 : ease(t / 0.6);
    c.save(); c.beginPath(); c.rect(0, by - 10, W * wisch + 60, 130); c.clip();
    h.schraeg(c, -40, by, W * 0.78, 110, 30, h.ROT);
    h.text(c, "REPLAY", M, by + 88, h.f(900, 96), "#fff", "left", 0.14);
    var rw = breite(c, h, "REPLAY", 96, 900, 0.14) + 40;
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), M + rw, by + 82, h.f(800, 34), "rgba(255,255,255,.9)", "left", 0.12);
    c.restore();
    if (d.zeit != null && t < 0.6) { c.fillStyle = "#fff"; c.fillRect(W * wisch, by - 10, 18, 130); }
    h.qr(c, d, W - M - 190, 220, 190);
  } },

  /* ---------- TEAMFUNK: Funk-Box mit Sprach-Ausschlägen ---------- */
  { id: "funk", name: "Teamfunk", anim: true, draw: function (c, W, H, d, h) {
    var M = 64, t = zeit(d, 6), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.3)"], [0.45, "rgba(10,11,14,.3)"], [1, "rgba(10,11,14,.95)"]]);
    var fy = H - M;
    h.fuss(c, M, W - M, fy, d.footer);
    // Funk-Box mit Text als Funkspruch
    var bw = W - 2 * M, tx = h.passend(c, d.text || "Box, box, box!", bw - 80, 5, 42, 32, 600, "Barlow", 1.36);
    var bh = 150 + tx.hoehe + 50, by = fy - 110 - bh, ein = d.zeit == null ? 1 : ease(t / 0.5);
    c.save(); c.globalAlpha = ein; c.translate(0, (1 - ein) * 40);
    c.fillStyle = "rgba(10,11,14,.92)"; c.fillRect(M, by, bw, bh);
    c.fillStyle = h.ROT; c.fillRect(M, by, 10, bh);
    // Headset-Symbol
    c.strokeStyle = "#fff"; c.lineWidth = 7; c.beginPath(); c.arc(M + 70, by + 70, 28, Math.PI, 0); c.stroke();
    c.fillStyle = "#fff"; c.fillRect(M + 36, by + 66, 14, 26); c.fillRect(M + 90, by + 66, 14, 26);
    h.text(c, "TEAMFUNK", M + 124, by + 84, h.f(900, 48), "#fff", "left", 0.1);
    // Ausschläge
    var n = 26, wx = M + 420, ww = bw - 420 - 40, sp = ww / n;
    for (var i = 0; i < n; i++) {
      var amp = d.zeit == null ? 0.3 + 0.5 * zufall(i) : Math.abs(Math.sin(tl * 9 + i * 0.7) * Math.sin(tl * 3.1 + i * 0.23)) * (0.4 + 0.6 * zufall(i + Math.floor(tl * 8)));
      var hh = 10 + amp * 80;
      c.fillStyle = i % 4 === 0 ? h.ROT : "#fff"; c.fillRect(wx + i * sp, by + 66 - hh / 2, sp * 0.55, hh);
    }
    h.zeilen(c, tx, M + 40, by + 140, "#fff");
    c.restore();
    var ti = h.passend(c, d.title.toUpperCase(), W - 2 * M, 3, 104, 60, 900, "Saira Condensed", 0.95);
    var tiy = by - 34 - ti.hoehe;
    h.zeilen(c, ti, M, tiy, "#fff", 0.6);
    etikett(c, h, d.kicker, M, tiy - 92, h.ROT, "#fff", 36);
    h.qr(c, d, W - M - 190, 80, 190);
  } }

  );
})();

/* ===========================================================
   OVERLAY-PAKET 2 (Okt 2026): Tor auf/zu, Flügeltor, Countdown,
   Startaufstellung, Regen, Rennuhr, Rote Flagge, Pole Position
   =========================================================== */
(function () {
  var H_ = window.K888_OV_HILFE, zufall = H_.zufall, ease = H_.ease, zeit = H_.zeit, lauf = H_.lauf, block = H_.block, etikett = H_.etikett, blinklicht = H_.blinklicht, breite = H_.breite;

  // Garagen-Rolltor: deckt von oben bis „unten“ ab (unten = Unterkante in px)
  function rolltor(c, W, H, h, unten, beschriftung) {
    if (unten <= 0) return;
    c.save();
    var g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#3a3f49"); g.addColorStop(0.5, "#5b616c"); g.addColorStop(1, "#353a43");
    c.fillStyle = g; c.fillRect(0, 0, W, unten);
    for (var y = unten - 64; y > -64; y -= 64) {
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(0, y, W, 6);
      c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(0, y + 6, W, 3);
    }
    c.fillStyle = "#23262d"; c.fillRect(0, unten - 26, W, 26);
    c.fillStyle = "#ffc400"; for (var x = 0; x < W; x += 80) { c.beginPath(); c.moveTo(x, unten - 26); c.lineTo(x + 40, unten - 26); c.lineTo(x + 20, unten); c.lineTo(x - 20, unten); c.closePath(); c.fill(); }
    if (beschriftung) beschriftung(unten);
    c.restore();
  }
  function lichtspalt(c, W, unten, staerke) {
    if (staerke <= 0) return;
    var g = c.createLinearGradient(0, unten, 0, unten + 260);
    g.addColorStop(0, "rgba(255,240,210," + (0.55 * staerke) + ")"); g.addColorStop(1, "rgba(255,240,210,0)");
    c.fillStyle = g; c.fillRect(0, unten, W, 260);
  }
  function rundumleuchte(c, x, y, t, farbe) {
    c.save(); c.translate(x, y);
    var w = t * 6;
    var g = c.createRadialGradient(0, 0, 4, 0, 0, 170);
    g.addColorStop(0, farbe); g.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = 0.55; c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 170, w - 0.35, w + 0.35); c.closePath(); c.fill();
    c.globalAlpha = 1; c.shadowColor = farbe; c.shadowBlur = 25; c.fillStyle = farbe; c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function wehendeFlagge(c, x, y, w, hh, t, farbe1, farbe2) {
    c.fillStyle = "#d9d9d9"; c.fillRect(x, y - 12, 10, hh + 160);
    var n = 18;
    for (var s = 0; s < n; s++) {
      var wx = x + 10 + s * w / n, wy = y + Math.sin(s * 0.55 - t * 7) * 12 * (s / n);
      var licht = 0.8 + 0.2 * Math.cos(s * 0.55 - t * 7);
      c.globalAlpha = licht; c.fillStyle = s % 2 ? farbe1 : farbe2; c.fillRect(wx, wy, w / n + 1, hh); c.globalAlpha = 1;
    }
  }

  window.K888_OVERLAYS.push(

  /* ---------- TOR AUF: Rennankündigung ---------- */
  { id: "tor_auf", name: "Tor auf · Ankündigung", anim: true, felder: ["wann", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, t = d.zeit == null ? 1.25 : zeit(d, 7), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.35)"], [0.45, "rgba(10,11,14,.4)"], [1, "rgba(10,11,14,.97)"]]);
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    var wann = (d.wann || "Sonntag · 20:00 Uhr").toUpperCase();
    var ws = h.passGroesse(c, wann, W - 2 * M, 110, 50, 900);
    h.text(c, wann, M, tiy - 40, h.f(900, ws), h.ROT, "left", 0.02);
    etikett(c, h, "RENNANKÜNDIGUNG" + (d.strecke ? " · " + d.strecke.toUpperCase() : ""), M, tiy - 40 - ws - 100, "#fff", "#0b0c10", 36);
    // Tor fährt hoch (0.6 s warten, dann 2 s)
    var auf = ease((t - 0.6) / 2), unten = (H + 30) * (1 - auf);
    lichtspalt(c, W, unten, auf > 0 && auf < 1 ? 1 : 0);
    rolltor(c, W, H, h, unten, function (u) {
      h.logo(c, W / 2 - 170, u - 220, 92);
      h.text(c, "RENNTAG", W / 2, u - 120, h.f(900, 64), "#ffc400", "center", 0.3);
    });
    c.fillStyle = "#16181d"; c.fillRect(0, 0, W, 70); c.fillStyle = "#2b2f38"; c.fillRect(0, 62, W, 8);
    rundumleuchte(c, W - 70, 120, tl, "rgba(255,170,0,.95)");
    h.qr(c, d, W - M - 190, 210, 190);
  } },

  /* ---------- TOR ZU: Rennende ---------- */
  { id: "tor_zu", name: "Tor zu · Rennende", anim: true, felder: ["platz", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, t = d.zeit == null ? 99 : zeit(d, 7), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.35)"], [0.45, "rgba(10,11,14,.4)"], [1, "rgba(10,11,14,.97)"]]);
    block(c, W, H, d, h, M, "#fff", 3);
    var zu = ease((t - 1.2) / 2.2), unten = (H + 30) * zu;
    rolltor(c, W, H, h, unten, function (u) {
      var pl = String(d.platz || "").replace(/^p/i, "");
      var my = u - H / 2 - 40;
      h.text(c, "RENNENDE", W / 2, my - 40, h.f(900, 120), "#fff", "center", 0.08);
      if (pl) { h.text(c, "P" + pl, W / 2, my + 190, h.f(900, 220), h.ROT, "center", 0.02); }
      if (d.strecke) h.text(c, d.strecke.toUpperCase(), W / 2, my + (pl ? 260 : 40), h.f(800, 40), "#ffc400", "center", 0.2);
      h.logo(c, W / 2 - 115, u - 120, 62);
    });
    c.fillStyle = "#16181d"; c.fillRect(0, 0, W, 70); c.fillStyle = "#2b2f38"; c.fillRect(0, 62, W, 8);
    if (zu < 1 || d.zeit == null) rundumleuchte(c, W - 70, 120, tl, "rgba(255,170,0,.95)");
    h.qr(c, d, W - M - 190, 210, 190);
  } },

  /* ---------- FLÜGELTOR: Tor geht seitlich auf, START FREI ---------- */
  { id: "fluegeltor", name: "Flügeltor · Start frei", anim: true, felder: ["wann"], draw: function (c, W, H, d, h) {
    var M = 64, t = d.zeit == null ? 1.4 : zeit(d, 7);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.3)"], [0.45, "rgba(10,11,14,.35)"], [1, "rgba(10,11,14,.97)"]]);
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    if (d.wann) h.text(c, d.wann.toUpperCase(), M, tiy - 40, h.f(900, h.passGroesse(c, d.wann.toUpperCase(), W - 2 * M, 96, 44, 900)), h.ROT, "left", 0.02);
    var auf = ease((t - 0.7) / 1.8), halb = W / 2 * (1 - auf);
    // Lichtspalt in der Mitte
    if (auf > 0 && auf < 1) {
      var gl = c.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
      gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(0.5, "rgba(255,245,220,.6)"); gl.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gl; c.fillRect(W / 2 - 200, 0, 400, H);
    }
    function fluegel(x, w, links) {
      if (w <= 0) return;
      var g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, links ? "#2b2f37" : "#4a505b"); g.addColorStop(1, links ? "#4a505b" : "#2b2f37");
      c.fillStyle = g; c.fillRect(x, 0, w, H);
      c.fillStyle = "rgba(0,0,0,.3)"; for (var y = 120; y < H; y += 160) c.fillRect(x, y, w, 5);
      c.fillStyle = h.ROT; c.fillRect(links ? x + w - 14 : x, 0, 14, H);
    }
    fluegel(0, halb, true); fluegel(W - halb, halb, false);
    if (halb > 120) {
      c.save(); c.beginPath(); c.rect(0, 0, halb, H); c.rect(W - halb, 0, halb, H); c.clip();
      h.text(c, "START", W / 2, H / 2 - 20, h.f(900, 170), "#fff", "center", 0.1);
      h.text(c, "FREI", W / 2, H / 2 + 140, h.f(900, 170), h.ROT, "center", 0.1);
      c.restore();
    }
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- COUNTDOWN: 3, 2, 1, LOS ---------- */
  { id: "countdown", name: "Countdown", anim: true, felder: ["wann"], draw: function (c, W, H, d, h) {
    var M = 64, t = d.zeit == null ? null : (d.aufn ? d.zeit : d.zeit % 5);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.45)"], [0.45, "rgba(10,11,14,.45)"], [1, "rgba(10,11,14,.97)"]]);
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    var cx = W / 2, cy = Math.min(tiy - 300, H * 0.36), r = 210;
    c.save();
    c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 26; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    var zahl, anteil;
    if (t == null) { zahl = "LIVE"; anteil = 1; }
    else if (t < 3) { zahl = String(3 - Math.floor(t)); anteil = 1 - (t % 1); }
    else { zahl = "LOS"; anteil = 1; }
    c.strokeStyle = h.ROT; c.lineCap = "round"; c.shadowColor = h.ROT; c.shadowBlur = 30;
    c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * anteil); c.stroke();
    c.restore();
    var sk = t == null ? 1 : t < 3 ? 1 + 0.25 * Math.pow(1 - (t % 1), 4) : 1 + 0.08 * Math.sin((t - 3) * 12);
    c.save(); c.translate(cx, cy); c.scale(sk, sk);
    var zs = zahl.length > 1 ? 150 : 240;
    h.text(c, zahl, 0, zs * 0.36, h.f(900, zs), t != null && t >= 3 ? h.ROT : "#fff", "center", 0.02);
    c.restore();
    var unter = (d.wann || "Gleich geht's los").toUpperCase();
    h.text(c, unter, cx, cy + r + 90, h.f(900, h.passGroesse(c, unter, W - 2 * M, 60, 30, 900)), "#fff", "center", 0.1);
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- STARTAUFSTELLUNG: Startplätze fliegen rein, dein Platz leuchtet ---------- */
  { id: "grid", name: "Startaufstellung", anim: true, felder: ["platz", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, t = d.zeit == null ? 99 : zeit(d, 7), tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.75)"], [0.5, "rgba(10,11,14,.55)"], [1, "rgba(10,11,14,.97)"]]);
    var tiy = block(c, W, H, d, h, M, "#fff", 2);
    var mein = parseInt(String(d.platz || "3").replace(/\D/g, ""), 10) || 3;
    var plaetze = 8, oben = 200, unten = tiy - 70, zh = Math.min(120, (unten - oben) / (plaetze / 2 + 0.5));
    h.text(c, "STARTAUFSTELLUNG", M, oben - 60, h.f(900, 54), "#fff", "left", 0.08);
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), W - M, oben - 62, h.f(800, 32), "rgba(255,255,255,.75)", "right", 0.14);
    var start = Math.max(1, Math.min(mein - 3, 99));
    for (var i = 0; i < plaetze; i++) {
      var p = start + i, links = i % 2 === 0, reihe = Math.floor(i / 2);
      var bw = (W - 2 * M - 40) / 2, bx = links ? M : M + bw + 40, by = oben + reihe * zh + (links ? 0 : zh * 0.5);
      var ein = d.zeit == null ? 1 : ease((t - 0.2 - i * 0.18) / 0.45);
      if (ein <= 0) continue;
      var ich = p === mein;
      c.save(); c.globalAlpha = ein; c.translate((links ? -1 : 1) * (1 - ein) * 300, 0);
      c.fillStyle = ich ? h.ROT : "rgba(20,22,28,.9)"; c.fillRect(bx, by, bw, zh - 14);
      if (ich && d.zeit != null) { c.shadowColor = h.ROT; c.shadowBlur = 20 + 20 * Math.sin(tl * 5); c.fillRect(bx, by, bw, zh - 14); c.shadowBlur = 0; }
      c.fillStyle = ich ? "#fff" : "rgba(255,255,255,.18)"; c.fillRect(bx, by, 8, zh - 14);
      h.text(c, "P" + p, bx + 30, by + (zh - 14) * 0.68, h.f(900, (zh - 14) * 0.55), "#fff", "left", 0.02);
      h.text(c, ich ? "KREIDS888 #888" : "", bx + bw - 24, by + (zh - 14) * 0.64, h.f(900, (zh - 14) * 0.3), "#fff", "right", 0.06);
      c.restore();
    }
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- REGEN: Regen fällt, Blitz, Tropfen-Warnung ---------- */
  { id: "regen", name: "Regen", anim: true, felder: ["strecke"], draw: function (c, W, H, d, h) {
    var M = 64, tl = lauf(d), BLAU = "#3aa7ff";
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(8,14,24,.55)"], [0.45, "rgba(8,14,24,.4)"], [1, "rgba(8,12,18,.97)"]]);
    var blitz = d.zeit != null && (tl % 5 > 3.1 && tl % 5 < 3.18 || tl % 5 > 3.26 && tl % 5 < 3.32);
    if (blitz) { c.fillStyle = "rgba(220,235,255,.35)"; c.fillRect(0, 0, W, H); }
    c.strokeStyle = "rgba(200,225,255,.45)"; c.lineWidth = 2;
    for (var i = 0; i < 140; i++) {
      var sp = 1400 + zufall(i) * 900, x = zufall(i + 300) * (W + 200) - 100, len = 30 + zufall(i + 600) * 40;
      var y = ((zufall(i + 900) * H) + tl * sp) % (H + 100) - 50, sx = x - y * 0.18;
      c.beginPath(); c.moveTo(sx, y); c.lineTo(sx - len * 0.18, y + len); c.stroke();
    }
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    // Tropfen-Symbol + Schriftzug
    var dy = tiy - 150, puls = d.zeit == null ? 1 : 0.85 + 0.15 * Math.sin(tl * 4);
    c.save(); c.translate(M + 45, dy + 50); c.scale(puls, puls);
    c.shadowColor = BLAU; c.shadowBlur = 30; c.fillStyle = BLAU;
    c.beginPath(); c.moveTo(0, -55); c.bezierCurveTo(30, -15, 45, 5, 45, 25); c.arc(0, 25, 45, 0, Math.PI); c.bezierCurveTo(-45, 5, -30, -15, 0, -55); c.fill();
    c.restore();
    h.text(c, "REGEN", M + 120, dy + 82, h.f(900, 104), "#fff", "left", 0.06);
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), M + 128 + breite(c, h, "REGEN", 104, 900, 0.06) + 20, dy + 78, h.f(800, 36), BLAU, "left", 0.12);
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- RENNUHR: Endurance, Zeiger im Zeitraffer ---------- */
  { id: "rennuhr", name: "Rennuhr · Endurance", anim: true, felder: ["wann", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, tl = lauf(d);
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.55)"], [0.45, "rgba(10,11,14,.45)"], [1, "rgba(10,11,14,.97)"]]);
    var tiy = block(c, W, H, d, h, M, "#fff", 2);
    var r = 190, cx = M + r + 10, cy = Math.min(tiy - r - 70, 140 + r + 120);
    var sek = d.zeit == null ? 5 * 3600 + 23 * 60 + 12 : (tl * 1500) % 86400;
    c.save(); c.translate(cx, cy);
    c.fillStyle = "rgba(10,11,14,.88)"; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = h.ROT; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, r - 4, 0, Math.PI * 2); c.stroke();
    for (var i = 0; i < 24; i++) {
      c.save(); c.rotate(i * Math.PI / 12); c.fillStyle = i % 6 === 0 ? "#fff" : "rgba(255,255,255,.4)";
      c.fillRect(-3, -r + 18, 6, i % 6 === 0 ? 30 : 16); c.restore();
    }
    // Fortschritt (24 h) als Ring
    c.strokeStyle = "rgba(225,19,36,.5)"; c.lineWidth = 14; c.beginPath(); c.arc(0, 0, r - 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sek / 86400); c.stroke();
    function zeiger(w, len, br, farbe) { c.save(); c.rotate(w); c.fillStyle = farbe; c.fillRect(-br / 2, -len, br, len + 18); c.restore(); }
    zeiger(sek / 86400 * Math.PI * 2, r * 0.5, 12, "#fff");
    zeiger((sek % 3600) / 3600 * Math.PI * 2, r * 0.72, 7, "#fff");
    zeiger((sek % 60) / 60 * Math.PI * 2, r * 0.8, 3, h.ROT);
    c.fillStyle = h.ROT; c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.fill();
    c.restore();
    var hh = Math.floor(sek / 3600), mm = Math.floor(sek % 3600 / 60), ss = Math.floor(sek % 60);
    var txt = (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
    var tx = cx + r + 50;
    h.text(c, "RENNZEIT", tx, cy - 70, h.f(800, 34), "rgba(255,255,255,.7)", "left", 0.16);
    h.text(c, txt, tx, cy + 30, h.f(900, h.passGroesse(c, txt, W - M - tx, 110, 50, 900)), "#fff", "left", 0.02);
    var unter = (d.wann || "24 h").toUpperCase() + (d.strecke ? " · " + d.strecke.toUpperCase() : "");
    h.text(c, unter, tx, cy + 90, h.f(800, h.passGroesse(c, unter, W - M - tx, 38, 22, 800)), h.ROT, "left", 0.12);
    h.qr(c, d, W - M - 190, 80, 190);
  } },

  /* ---------- ROTE FLAGGE: Rennabbruch ---------- */
  { id: "rotflagge", name: "Rote Flagge", anim: true, felder: ["strecke"], draw: function (c, W, H, d, h) {
    var M = 64, tl = lauf(d), an = d.zeit == null || Math.floor(tl * 3) % 2 === 0;
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.5)"], [0.4, "rgba(10,11,14,.25)"], [0.6, "rgba(10,11,14,.6)"], [1, "rgba(10,11,14,.97)"]]);
    if (d.zeit != null && an) { c.fillStyle = "rgba(225,19,36,.12)"; c.fillRect(0, 0, W, H); }
    c.fillStyle = "rgba(10,11,14,.9)"; c.fillRect(M, 70, W - 2 * M, 96);
    for (var i = 0; i < 6; i++) blinklicht(c, M + 70 + i * ((W - 2 * M - 140) / 5), 118, 28, (i % 2 === 0) === an, "#ff1e2d");
    var tiy = block(c, W, H, d, h, M, "#fff", 3);
    var fy = tiy - 200;
    wehendeFlagge(c, M, fy, 170, 115, tl, "#e11324", "#c50f1e");
    var gx = M + 210;
    h.text(c, "ROTE FLAGGE", gx, fy + 62, h.f(900, 80), "#fff", "left", 0.04);
    h.text(c, "RENNABBRUCH" + (d.strecke ? " · " + d.strecke.toUpperCase() : ""), gx + 4, fy + 116, h.f(800, 36), "#ff4b55", "left", 0.14);
    h.qr(c, d, W - M - 190, 200, 190);
  } },

  /* ---------- POLE POSITION: Scheinwerfer, Rundenzeit ---------- */
  { id: "pole", name: "Pole Position", anim: true, felder: ["rundenzeit", "strecke"], draw: function (c, W, H, d, h) {
    var M = 64, t = zeit(d, 6), tl = lauf(d), GOLD = "#ffc83a";
    h.bild(c, d, 0, 0, W, H);
    h.verlauf(c, 0, 0, 0, H, [[0, "rgba(10,11,14,.6)"], [0.45, "rgba(10,11,14,.5)"], [1, "rgba(10,11,14,.97)"]]);
    // zwei Scheinwerfer
    [[0.12, 1], [0.88, -1]].forEach(function (s) {
      var w = (d.zeit == null ? 0.25 : Math.sin(tl * 1.3) * 0.35) * s[1] + s[1] * 0.25;
      c.save(); c.translate(W * s[0], -20); c.rotate(w);
      var g = c.createLinearGradient(0, 0, 0, H * 0.7); g.addColorStop(0, "rgba(255,240,200,.45)"); g.addColorStop(1, "rgba(255,240,200,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.lineTo(190, H * 0.7); c.lineTo(-190, H * 0.7); c.closePath(); c.fill();
      c.restore();
    });
    var tiy = block(c, W, H, d, h, M, "#fff", 2);
    var ein = d.zeit == null ? 1 : ease(t / 0.7), by = tiy - 330;
    c.save(); c.globalAlpha = ein; c.translate(0, (1 - ein) * 50);
    h.text(c, "POLE", M, by + 120, h.f(900, 150), "#fff", "left", 0.08);
    h.text(c, "POSITION", M + breite(c, h, "POLE", 150, 900, 0.08) + 24, by + 120, h.f(900, 150), GOLD, "left", 0.08);
    var zt = d.rundenzeit || "1:58.432";
    c.fillStyle = "rgba(10,11,14,.88)"; c.fillRect(M, by + 160, W - 2 * M, 120);
    c.fillStyle = GOLD; c.fillRect(M, by + 160, 12, 120);
    h.text(c, "P1", M + 40, by + 248, h.f(900, 84), GOLD, "left", 0.02);
    h.text(c, zt, W - M - 30, by + 250, h.f(900, h.passGroesse(c, zt, W - 2 * M - 300, 96, 40, 900)), "#fff", "right", 0.02);
    if (d.strecke) h.text(c, d.strecke.toUpperCase(), M + 160, by + 236, h.f(800, 34), "rgba(255,255,255,.7)", "left", 0.14);
    c.restore();
    h.qr(c, d, W - M - 190, 80, 190);
  } }

  );
})();
