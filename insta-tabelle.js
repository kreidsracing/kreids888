// ═══════════════════════════════════════════════════════════
// Kreids888 · Tabellenstand für Instagram (Dashboard, Reiter „Instagram“)
// Holt die SPR-Serie über den Worker (/api/spr/liga/:id) und rechnet die Meisterschaft
// GENAU WIE die SPR-Seite snailpaceracing.org/tabellen:
//   Kopie von calcFahrerGesamt + gruppenWertung + bessereBilanz (spr-website/tabellen/tabellen.js)
//   und getPtsArr, istVorEinstiegDNS, wechselStrafenAnwenden (spr-website/tabellen/shared.js), Stand 18.11.2026.
//   Ändert sich dort die Rechnung (Streicher, Strafen …), hier mitziehen.
// Endurance-Serien: Teamwertung wie renderEnduranceTabelle (buildTeamMap).
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  const KREIDS_CUSTID = '1123750';

  // ─── Kopie der SPR-Rechnung ─────────────────────────────────
  function getPtsArrFromDef(pts, max = 60) {
    if (!pts) return [];
    if (pts.type === 'f1') return [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    if (pts.type === 'custom') return pts.arr || [];
    const a = [];
    for (let i = 0; i < max; i++) {
      const p = Math.max(pts.p1 - pts.step * i, pts.min);
      a.push(p);
      if (p <= pts.min && i > 0) break;
    }
    return a;
  }
  function getPtsArr(liga, klId = null, max = 60) {
    if (!liga) return [];
    if (klId) {
      const kl = (liga.klassen || []).find(k => k.id === klId);
      if (kl && kl.pts) return getPtsArrFromDef(kl.pts, max);
    }
    return getPtsArrFromDef(liga.pts, max);
  }
  // Kalender kommt hier mit der Serie (auf der SPR-Seite aus db/pubData)
  function rennenServerstart(kalender, r) {
    const k = (kalender || []).find(k => k.nr === (r && r.nr));
    if (!k || !k.dateRace) return null;
    const d = new Date(`${k.dateRace}T${k.timeRace || '00:00'}:00`);
    return isNaN(d) ? null : d;
  }
  function fahrerVorEinstieg(f, r, kalender) {
    if (!f || f.gast) return false;
    if (f.status === 'warteliste') return true;
    if (f.wiederAngemeldetAm) return false;
    const s = f.nachgeruecktAm || f.erstellt;
    if (!s) return false;
    const einstieg = new Date(s);
    if (isNaN(einstieg)) return false;
    const start = rennenServerstart(kalender, r);
    if (!start) return false;
    return einstieg > start;
  }
  const istVorEinstiegDNS = (e, f, r, kalender) => (!e || !e.status || e.status === 'DNS') && fahrerVorEinstieg(f, r, kalender);
  function wechselStrafenAnwenden(f, rPts) {
    const liste = Array.isArray(f && f.wechselStrafen) ? f.wechselStrafen : [];
    for (const s of liste) {
      if (!s) continue;
      if (s.art === 'kw') {
        rPts.forEach(p => {
          if (p.absent || Number(p.rn) > Number(s.bisNr)) return;
          p.kwNull = true; p.kwVorher = p.netto;
          p.netto = 0; p.straf = 0; p.brutto = 0;
          if (p.pts !== undefined) p.pts = 0;
        });
      } else if (s.art === 'fzw') {
        const p = rPts.find(p => !p.absent && Number(p.rn) === Number(s.nr));
        if (p) p.wechselStreicher = true;
      }
    }
    return rPts;
  }
  const ergKey = e => String((e && (e.fahrerId || e.custId)) || ((e && e.irName) || '').toLowerCase());
  function gruppenWertung(r, liga, fahrer, kl, tag, kalender) {
    const map = new Map();
    if (!liga || !Array.isArray(r && r.ergebnisse)) return map;
    const ptsArr = getPtsArr(liga, (kl && kl.id) || null);
    const dnsPts = -Math.abs(liga.dnsPts || 0);
    const eigeneVergabe = !!(kl || tag);
    const fFor = e => (fahrer || []).find(f =>
      (e.fahrerId && f.id === e.fahrerId) ||
      (e.custId && f.iracingId && String(f.iracingId) === String(e.custId)) ||
      (e.irName && f.name && f.name.toLowerCase() === e.irName.toLowerCase()));
    const inGruppe = r.ergebnisse.filter(e => {
      if (tag) return (fFor(e) || {}).tagId === tag.id;
      if (kl) return e.klId ? e.klId === kl.id : (fFor(e) || {}).klId === kl.id;
      return true;
    });
    if (!inGruppe.length) return map;
    const sortiert = [...inGruppe].sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999));
    const idxOf = new Map(sortiert.map((e, i) => [e, i]));
    const raus = new Set(), basis = new Map();
    let ptsPos = 0;
    sortiert.forEach(e => {
      const f = fFor(e);
      if (e.gast || (f && f.gast) || (f && f.austrittNr != null && (r.nr ?? 0) >= f.austrittNr) || (f && istVorEinstiegDNS(e, f, r, kalender))) {
        raus.add(e); basis.set(e, 0); return;
      }
      if (!eigeneVergabe) { basis.set(e, e.pts || 0); return; }
      switch (e.status) {
        case 'FIN': basis.set(e, ptsArr[ptsPos] || 0); ptsPos++; break;
        case 'DNF': case 'RQ': basis.set(e, 0); ptsPos++; break;
        case 'DNS': basis.set(e, dnsPts); break;
        default: basis.set(e, 0); break;
      }
    });
    const netto = e => basis.get(e) - (e.straf || 0);
    const finisher = sortiert.filter(e => e.status === 'FIN' && !raus.has(e));
    if (finisher.some(e => (e.straf || 0) > 0)) {
      const pool = finisher.map(e => basis.get(e));
      const neu = [...finisher].sort((a, b) =>
        (basis.get(b) - (b.straf || 0)) - (basis.get(a) - (a.straf || 0))
        || ((a.straf || 0) > 0 ? 1 : 0) - ((b.straf || 0) > 0 ? 1 : 0)
        || idxOf.get(a) - idxOf.get(b));
      neu.forEach((e, i) => { if (!(e.straf || 0)) basis.set(e, pool[i] ?? 0); });
    }
    const rang = sortiert.filter(e => !raus.has(e))
      .sort((a, b) => netto(b) - netto(a)
        || ((a.straf || 0) > 0 ? 1 : 0) - ((b.straf || 0) > 0 ? 1 : 0)
        || idxOf.get(a) - idxOf.get(b));
    rang.forEach((e, i) => { const zi = finisher.indexOf(e); map.set(ergKey(e), { pts: basis.get(e), pos: i + 1, ziel: zi >= 0 ? zi + 1 : null }); });
    raus.forEach(e => map.set(ergKey(e), { pts: 0, pos: null }));
    return map;
  }
  function bessereBilanz(a, b) {
    const zaehl = d => { const c = []; d.rPts.forEach(p => { if (!p.absent && p.pos) c[p.pos] = (c[p.pos] || 0) + 1; }); return c; };
    const ca = zaehl(a), cb = zaehl(b), max = Math.max(ca.length, cb.length);
    for (let i = 1; i < max; i++) { const diff = (cb[i] || 0) - (ca[i] || 0); if (diff) return diff; }
    return 0;
  }
  function calcFahrerGesamt(fahrer, rennen, klId, tagId, liga, kalender) {
    let ff = fahrer.filter(f => !f.gast);
    if (klId) ff = ff.filter(f => f.klId === klId);
    if (tagId) ff = ff.filter(f => f.tagId === tagId);
    const gesamtR = (liga && liga.numR) || rennen.length;
    const hatStreicher = liga && liga.streicher && (liga.streicherN || 0) > 0 && gesamtR > 0 && rennen.length / gesamtR > 0.5;
    const klObj = klId ? ((liga && liga.klassen) || []).find(k => k.id === klId) : null;
    const tagObj = tagId ? ((liga && liga.tags) || []).find(t => t.id === tagId) : null;
    const gwCache = liga ? new Map(rennen.map(r => [r.id ?? r.nr, gruppenWertung(r, liga, fahrer, klObj, tagObj, kalender)])) : null;
    return ff.map(f => {
      const rPts = [];
      rennen.forEach(r => {
        if (f.austrittNr != null && r.nr >= f.austrittNr) { rPts.push({ rn: r.nr, netto: 0, straf: 0, status: 'ABS', absent: true, gestrichen: false }); return; }
        const e = (r.ergebnisse || []).find(e => e.fahrerId === f.id);
        if (istVorEinstiegDNS(e, f, r, kalender)) { rPts.push({ rn: r.nr, netto: 0, straf: 0, status: 'ABS', absent: true, gestrichen: false }); return; }
        if (e) {
          const w = gwCache && gwCache.get(r.id ?? r.nr) && gwCache.get(r.id ?? r.nr).get(ergKey(e));
          const basePts = w ? w.pts : e.pts;
          rPts.push({ rn: r.nr, brutto: basePts, netto: basePts - (e.straf || 0), straf: e.straf || 0, status: e.status || 'FIN', absent: false, gestrichen: false, pos: w ? w.pos : null });
        } else rPts.push({ rn: r.nr, netto: 0, straf: 0, status: 'ABS', absent: true, gestrichen: false });
      });
      wechselStrafenAnwenden(f, rPts);
      if (hatStreicher) {
        const nieStreichen = s => { const x = String(s || '').toUpperCase(); return x === 'DSQ' || x === 'FZW' || x === 'RQ'; };
        const streichbar = rPts.filter(r => !r.wechselStreicher && (r.absent || !nieStreichen(r.status)));
        streichbar.sort((a, b) => a.netto - b.netto || (b.absent ? 1 : 0) - (a.absent ? 1 : 0) || (b.straf || 0) - (a.straf || 0));
        for (let i = 0; i < Math.min(liga.streicherN, streichbar.length); i++) {
          streichbar[i].gestrichen = true;
          const r = streichbar[i];
          if (!r.absent && String(r.status || '').toUpperCase() === 'DNS') { const rest = Math.min(0, r.brutto ?? 0); if (rest < 0) r.dnsBleibt = rest; }
        }
      }
      const gezaehlt = rPts.filter(r => !r.absent && !r.gestrichen && !r.wechselStreicher);
      const dnsRest = rPts.reduce((s, r) => s + (r.gestrichen && !r.wechselStreicher ? (r.dnsBleibt || 0) : 0), 0);
      const gesamtPts = gezaehlt.reduce((s, r) => s + r.netto, 0) + dnsRest;
      const totalStraf = gezaehlt.reduce((s, r) => s + (r.straf || 0), 0);
      return { fahrer: f, rPts, gesamtPts, totalStraf };
    }).sort((a, b) => b.gesamtPts - a.gesamtPts || bessereBilanz(a, b) || a.totalStraf - b.totalStraf);
  }
  // Endurance: Teams (wie buildTeamMap + Sortierung in renderEnduranceTabelle)
  function teamGesamt(rennen, klId) {
    const m = {};
    rennen.forEach(r => (r.ergebnisse || []).forEach(e => {
      if (klId && e.klId !== klId) return;
      if (!m[e.teamId]) m[e.teamId] = { id: e.teamId, name: e.teamName, klId: e.klId, gesamtPts: 0 };
      const basePts = (!klId && e.gesamtPts !== undefined) ? e.gesamtPts : e.pts;
      m[e.teamId].gesamtPts += basePts - (e.straf || 0);
    }));
    return Object.values(m).sort((a, b) => b.gesamtPts - a.gesamtPts);
  }

  // ─── Tabelle für den Post ───────────────────────────────────
  const istIch = f => String((f && (f.iracingId || f.custId)) || '') === KREIDS_CUSTID || /^kreids/i.test(String((f && (f.name || f.irName)) || ''));
  // Spitze + eigene Umgebung: bis P8 die ersten 8, sonst P1–5 · … · eigener Platz ±1
  function kuerzen(zeilen, ichIdx) {
    if (ichIdx < 8) return zeilen.slice(0, 8);
    return [...zeilen.slice(0, 5), { luecke: true }, ...zeilen.slice(ichIdx - 1, ichIdx + 2)];
  }
  // daten = Antwort von /api/spr/liga/:id, nr = Runde, nach der der Stand gilt
  function rechnen(daten, nr) {
    const liga = daten && daten.liga;
    if (!liga) return null;
    const kalender = daten.kalender || [], fahrer = daten.fahrer || [];
    const rennen = (daten.rennen || []).filter(r => r && (!nr || Number(r.nr) <= Number(nr))).sort((a, b) => a.nr - b.nr);
    if (!rennen.length) return null;
    const vorher = rennen.slice(0, -1);
    const klassen = liga.klassen || [], isEnd = liga.typ === 'endurance' || liga.typ === 'endurance-manuell';
    let zeilen, ichIdx = -1, klasse = '';
    if (isEnd) {
      // Mein Team: im letzten Rennen, in dem ich dabei war
      let meinTeam = null;
      for (const r of rennen.slice().reverse()) {
        const e = (r.ergebnisse || []).find(e => istIch(e) || (e.drivers || []).some(istIch) || fahrer.some(f => istIch(f) && (f.id === e.fahrerId || (f.teamId && f.teamId === e.teamId))));
        if (e) { meinTeam = e; break; }
      }
      const klId = meinTeam && klassen.length > 1 ? meinTeam.klId : null;
      if (klId) klasse = (klassen.find(k => k.id === klId) || {}).name || '';
      const jetzt = teamGesamt(rennen, klId), alt = vorher.length ? teamGesamt(vorher, klId) : [];
      const altPos = new Map(alt.map((t, i) => [t.id, i + 1]));
      zeilen = jetzt.map((t, i) => ({ pos: i + 1, name: t.name || '', pts: t.gesamtPts, delta: altPos.has(t.id) ? altPos.get(t.id) - (i + 1) : 0, ich: !!meinTeam && t.id === meinTeam.teamId }));
    } else {
      const ich = fahrer.find(istIch);
      // Mehrere Klassen: die Klassenwertung meiner Klasse (wie der Klassen-Reiter auf der SPR-Seite)
      const klId = ich && klassen.length > 1 && ich.klId ? ich.klId : null;
      if (klId) klasse = (klassen.find(k => k.id === klId) || {}).name || '';
      const jetzt = calcFahrerGesamt(fahrer, rennen, klId, null, liga, kalender);
      const alt = vorher.length ? calcFahrerGesamt(fahrer, vorher, klId, null, liga, kalender) : [];
      const altPos = new Map(alt.map((d, i) => [d.fahrer.id, i + 1]));
      zeilen = jetzt.map((d, i) => ({ pos: i + 1, name: d.fahrer.name || '', pts: d.gesamtPts, delta: altPos.has(d.fahrer.id) ? altPos.get(d.fahrer.id) - (i + 1) : 0, ich: !!ich && d.fahrer.id === ich.id }));
    }
    ichIdx = zeilen.findIndex(z => z.ich);
    const letztes = rennen[rennen.length - 1], k = kalender.find(x => x.nr === letztes.nr) || {};
    const datum = String(letztes.date || k.dateRace || '').slice(0, 10), [j, m, t] = datum.split('-');
    const ichZ = zeilen[ichIdx];
    const fp = zeilen.map(z => `${z.pos}${z.name}${z.pts}`).join('|');
    let h = 0x811c9dc5; for (let i = 0; i < fp.length; i++) { h ^= fp.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return {
      bild: { tabelle: kuerzen(zeilen, ichIdx), nachRunde: letztes.nr, rundenGesamt: liga.numR || 0, klasse, stand: t ? `${t}.${m}.${j}` : '' },
      werte: { platz: ichZ ? ichZ.pos : null, punkte: ichZ ? ichZ.pts : null, abstand: ichZ && zeilen[0] ? zeilen[0].pts - ichZ.pts : null, fp: (h >>> 0).toString(36) },
      alle: zeilen   // komplette Tabelle (für die Anzeige im Dashboard)
    };
  }

  // SPR-Daten kurz merken (beim Abgleich wird dieselbe Serie oft zweimal gebraucht)
  const CACHE = new Map();
  function holen(ligaId, igApi) {
    const c = CACHE.get(ligaId);
    if (c && Date.now() - c.zeit < 60000) return c.p;
    const p = igApi('GET', '/api/spr/liga/' + encodeURIComponent(ligaId));
    CACHE.set(ligaId, { zeit: Date.now(), p });
    p.catch(() => CACHE.delete(ligaId));
    return p;
  }
  async function fuer(post, igApi) {
    if (!post || !post.ligaId) return null;
    return rechnen(await holen(post.ligaId, igApi), post.nr);
  }
  window.K888Tabelle = { fuer, rechnen, calcFahrerGesamt };
})();
