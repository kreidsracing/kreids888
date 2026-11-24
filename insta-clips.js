// ═══════════════════════════════════════════════════════════
// Kreids888 · 🎬 Clip-Fabrik (Reiter „🎬 Clips“ im Instagram-Bereich des Dashboards)
// • Clip reinziehen (MP4 aus dem Kreids Clipper) → Vorlage antippen → einplanen. Mehr nicht.
// • Der Browser baut daraus ein Neon-Video 1080×1920: Spruch oben (Chrom + Neon), Clip im Neon-Rahmen,
//   Zeitlupe vom Ende, Abspann „Folg mir“. Ton = Clip-Ton + eigene Effekt-Sounds. MP4 H.264 + AAC.
// • Hochladen in Stücken zum Worker kreids-insta. Der postet zur geplanten Zeit (ein Clip pro Tag):
//   Instagram-Reel (auf Wunsch als Test-Reel) und TikTok-Entwurf (Musik in der TikTok-App dazu).
//   NEU 24.11.2026: Foto-Karussells gehen auf Wunsch auch als TikTok-Foto-Entwurf raus (Schalter im Bearbeiten, Standard: an, wenn TikTok verbunden).
//   Schon gepostete Karussells/Clips: Knopf „📱 An TikTok“ (solange die Dateien noch da sind, 1 Tag nach dem Posten).
// Wird vom Instagram-Reiter geladen: K888Clips.start(box, umg)
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  const B = 1080, H = 1920, FPS = 30, OUTRO = 2.2, LOOP = 0.4, SK = 0.2;
  const BASIS = ((document.currentScript && document.currentScript.src) || 'https://kreids888.com/insta-clips.js').replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  // Schriften kommen im Dashboard über /site/ (gleiche Adresse), auf kreids888.com direkt
  const site = () => (window.K888Bilder && window.K888Bilder.SITE) || (/(^|\.)kreids888\.com$/.test(location.hostname) ? location.origin + '/' : location.origin + '/site/');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kl = (v, a, b) => Math.max(a, Math.min(b, v));
  const fp = (t, a, b) => kl((t - a) / (b - a), 0, 1);
  const eo = x => 1 - Math.pow(1 - x, 3);
  const eob = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const hexA = (h, a) => { const n = parseInt(String(h).slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const zeit = ms => new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '').replace(', ', ' · ');
  const lokal = ms => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  const warte = ms => new Promise(r => setTimeout(r, ms));
  const zufallR = s => { let v = s >>> 0 || 1; return () => { v = (v * 1664525 + 1013904223) >>> 0; return v / 4294967296; }; };
  const GROSS = s => String(s || '').toLocaleUpperCase('de-DE');

  const nr = x => { const n = parseInt(String(x == null ? '' : x).replace(/\D/g, ''), 10); return n > 0 ? n : 0; };   // „P17“, „17.“ → 17
  // ─── Vorlagen: jede mit eigener Neonfarbe, Sprüchen, Frage unten und Text für den Post ───
  const VORLAGEN = [
    { id: 'schuld', name: 'Wer war schuld?', emoji: '⚖️', farbe: '#ff2d6f', tag: 'VORFALL', zl: true, wieder: 'Nochmal genau hinschauen',
      hooks: ['Wer war schuld?', 'Strafe oder Rennunfall?', 'Stewards, übernehmen Sie!', 'Das war kein Rennunfall.', 'Wie kann man so fahren?!', 'Dafür gibt’s 4x. Mindestens.', 'Netcode oder Absicht?', 'Richter gesucht!', 'Du entscheidest.', 'Sag mir, dass das OK war', 'POV: Du warst unschuldig', 'Ich war’s nicht. Oder?', 'Darüber streiten alle', 'Das gibt Ärger …', 'Spiegel? Nie gehört.', 'Wer hat hier gepennt?'], unten: ['A oder B? Kommentier!', 'Wer war schuld? Schreib’s rein!', 'Rennunfall oder Strafe?', 'Wie viel Strafe gibst du?', 'Dein Urteil in die Kommentare!', 'Schreib 1 für A, 2 für B!', 'Hättest du Protest eingelegt?', 'Wer hätte zurückstecken müssen?', 'Strafe: ja oder nein?'], wiederAuch: ['Nochmal für die Stewards', 'Beweismittel A', 'Wer berührt wen?'],
      text: 'Wer war hier schuld? 🤔 A oder B? Schreib’s in die Kommentare 👇\n\n#simracing #iracing #racingincident #simracer #kreids888',
      hilfe: 'Für Unfälle und Szenen, über die man streiten kann. Die Leute kommentieren – das bringt Reichweite.' },
    { id: 'ueberholer', name: 'Überholer der Woche', emoji: '🚀', farbe: '#5cff1f', tag: 'KW {kw}', zl: true, wieder: 'So geht das',
      hooks: ['Überholer der Woche', 'So geht Überholen', 'Ausgebremst!', 'Vorbei. Einfach vorbei.', 'Stewards hassen diesen Trick', 'Das hat er nicht kommen sehen', 'Die Lücke war da. Ich auch.', 'Lehrbuch. Oder zu frech?', 'Später bremsen geht nicht', 'Tschüss und danke!', 'Nächstes Opfer, bitte', 'Wer bremst, verliert', 'Das hat gesessen', 'Sauber. Brutal. Schön.', 'Zu hart oder genial?', 'Spiegel checken hätte geholfen'], unten: ['Wie viele Punkte? 1 bis 10', 'Sauber oder zu hart?', 'Hättest du’s auch gewagt?', 'Hättest du die Tür zugemacht?', 'Divebomb oder sauber?', 'Zeig mir deinen Besten!', 'Besser als dein Bester?', 'Schick’s deinem Rennkumpel'], wiederAuch: ['Lehrbuch. In Zeitlupe.', 'Und nochmal genießen'],
      text: 'Überholer der Woche 🚀 Wie viele Punkte gibst du? 1 bis 10 👇\n\n#simracing #iracing #overtake #simracer #kreids888',
      hilfe: 'Dein bester Überholer. Am besten jede Woche einen, immer gleich – so erkennt man dich.' },
    { id: 'save', name: 'Save des Tages', emoji: '😮‍💨', farbe: '#18e8ff', tag: 'SAVE', zl: true, wieder: 'Wie?!',
      hooks: ['Save des Tages', 'Das war knapp', 'Wie hab ich das gehalten?!', 'Fast war’s vorbei', 'Nicht heute, Kiesbett!', 'Physik? Kenn ich nicht.', 'Puls: 220', 'Glück? Nein. Skill.', 'Ich hab keine Ahnung, wie', 'Das geht nicht. Doch!', 'Herzinfarkt in 3 Sekunden', 'Mama, ich lebe noch!', 'Gegenlenken wie ein Gott', 'Warte … wie?!', 'Das Auto wollte sterben', 'Hält. Hält nicht. Hält!'], unten: ['Hättest du’s gehalten?', 'Glück oder Können?', 'Schon mal so gerettet?', 'Dein bester Save? Erzähl!', 'Glück oder Skill? Sei ehrlich', 'Hättest du gegengelenkt?', 'Puls auf 180? Du auch?', 'Wie viele hätten’s gehalten?'], wiederAuch: ['Wie hab ich das gemacht?!', 'Puls immer noch oben'],
      text: 'Das war knapp 😮‍💨 Hättest du den gehalten? 👇\n\n#simracing #iracing #save #simracer #kreids888',
      hilfe: 'Wenn du das Auto gerade noch gefangen hast.' },
    { id: 'crash', name: 'Crash', emoji: '💥', farbe: '#ff7a00', tag: 'CRASH', zl: true, wieder: 'Autsch. Nochmal.', stempel: 'CRASH',
      hooks: ['Das ging schief', 'Autsch.', 'Totalschaden', 'Das tut weh', 'Warte bis zum Ende …', 'Das war’s dann wohl', 'Mein Safety Rating weint', 'Ich hab nichts gesehen', 'Das Auto ist jetzt Kunst', 'Mechaniker, Überstunden!', 'Nein. Nein. Nein. Nein.', 'Da hilft kein Reset mehr', 'Schrottplatz, wir kommen', 'Der Crash des Jahres?', 'Keine Absicht. Ehrlich.', 'POV: Dein Vordermann bremst'], unten: ['Was hättest du gemacht?', 'Wer war schuld?', 'Schon mal so abgeflogen?', 'Dein schlimmster Crash?', 'Vermeidbar oder nicht?', 'Reset oder weiterfahren?', 'Note für den Crash: 1–10', 'Wie viele Incidents gibt das?'], wiederAuch: ['Spoiler: Es wird nicht besser', 'Nochmal für die Versicherung'],
      text: 'Das ging schief 💥 Was hättest du gemacht? 👇\n\n#simracing #iracing #crash #simracer #kreids888',
      hilfe: 'Für Abflüge und Crashs. Mit Wackeln und CRASH-Stempel in der Zeitlupe.' },
    { id: 'hotlap', name: 'Hotlap-Challenge', emoji: '⏱️', farbe: '#b44dff', tag: 'HOTLAP', zl: false, wieder: 'Nochmal!',
      felder: [['rundenzeit', 'Rundenzeit', '1:52.414'], ['strecke', 'Strecke', 'Spa'], ['auto', 'Auto', 'Porsche 992 Cup']], pflicht: 'rundenzeit',
      zeigen: 'rundenzeit', zeigenLabel: 'RUNDENZEIT', info: c => [c.strecke, c.auto].filter(Boolean).join(' · '), feldTipp: 'Die Zeit kommt am Ende groß ins Bild.',
      hooks: ['Schaffst du das?', 'Schlag meine Zeit', 'Bist du schneller?', 'Nur Aliens sind schneller', 'Diese Zeit ist illegal', 'Keiner schlägt das. Keiner.', 'Die Runde meines Lebens', 'Zeig mir, was du kannst', 'Trau dich!', 'Challenge angenommen?', 'Jedes Limit ausgereizt', 'Du hast keine Chance', 'Perfekt? Fast.', 'Wetten, du schaffst das nicht?'], unten: ['Schreib deine Zeit!', 'Wer ist schneller?', 'Wie nah kommst du ran?', 'Deine Bestzeit? Her damit!', 'Wo verlier ich noch Zeit?', 'Schneller? Beweis es!', 'Wie viel fehlt dir?', 'Markier deinen Rennkumpel'],
      text: c => `Hotlap${c.strecke ? ' ' + c.strecke : ''}${c.rundenzeit ? ' ⏱ ' + c.rundenzeit : ''} – schaffst du das? Schreib deine Zeit in die Kommentare 👇\n\n#simracing #iracing #hotlap #simracer #kreids888`,
      hilfe: 'Eine schnelle Runde. Trag die Rundenzeit ein, sie kommt am Ende groß ins Bild. Die Leute posten ihre Zeiten.' },
    { id: 'highlight', name: 'Highlight', emoji: '🔥', farbe: '#ff1f3d', tag: 'HIGHLIGHT', zl: false, wieder: 'Nochmal!',
      hooks: ['Was für ein Moment', 'Das musst du sehen', 'Pures Simracing', 'Gänsehaut', 'Echt oder Simulator?', 'Deshalb lieben wir das', 'Warte auf das Ende …', 'Das glaubt mir keiner', 'Nicht wegschauen!', 'Ton an!', 'Ich hab keine Worte', 'Das hier ist kein Spiel', 'Bester Moment des Jahres?', 'Und dann das …'], unten: ['Folg für mehr Simracing', 'Wie findest du’s?', 'Mehr davon?', 'Echt oder Sim? Tipp ab!', 'Note von 1 bis 10?', 'Schick’s deinem Rennkumpel', 'Dein Lieblingsmoment?', 'Soll ich mehr davon posten?'],
      text: 'Was für ein Moment 🔥 Folg für mehr Simracing!\n\n#simracing #iracing #simracer #racing #kreids888',
      hilfe: 'Für alles andere: schöne Szenen, Starts, Zieleinläufe.' },
    { id: 'start', name: 'Start-Chaos', emoji: '🚦', farbe: '#ffd400', tag: 'START', zl: true, wieder: 'Nochmal in Zeitlupe',
      hooks: ['Wer kommt durch?', 'Start-Chaos', 'Kurve 1. Wie immer.', 'Alle auf einmal', 'Lap 1, Turn 1 …', 'Warum bremst keiner?!', 'Bremsen ist für Verlierer', 'Jedes. Verdammte. Mal.', 'Wer überlebt Kurve 1?', 'Autoscooter-Meisterschaft', 'POV: Du startest von hinten', '1 Kurve. Alle wollen rein.', 'Hier wird’s eng …', 'Das wird teuer'], unten: ['Wo wärst du hingefahren?', 'Wer ist schuld?', 'Innen oder außen?', 'Wer überlebt Kurve 1?', 'Hättest du gebremst?', 'Dein schlimmster Start?', 'Zu wild oder normal?', 'Wie viele kommen heil durch?'], wiederAuch: ['Nochmal für die Stewards', 'Wer hat angefangen?'],
      text: 'Start-Chaos 🚦 Wer kommt hier heil durch? Wo wärst du hingefahren? 👇\n\n#simracing #iracing #racestart #simracer #kreids888',
      hilfe: 'Für Rennstarts und die erste Kurve – da passiert immer was.' },
    { id: 'finish', name: 'Knappes Finish', emoji: '📸', farbe: '#00ffa3', tag: 'ZIEL', zl: true, wieder: 'Fotofinish',
      hooks: ['Knapper geht’s nicht', 'Fotofinish', 'Wer war vorne?', 'Zehntel entscheiden', 'Tausendstel. Kein Witz.', 'Eine Nasenspitze', 'Bis zur Linie', 'Nerven aus Stahl', 'Das Foto entscheidet', 'Schau auf die Linie!', 'POV: Letzte Kurve, P2', 'So knapp. So geil.', 'Herzinfarkt auf der Ziellinie', 'Das knappste Finish ever?'], unten: ['Wie knapp war’s bei dir?', 'Wer war vorne?', 'Schon mal so knapp?', 'Tipp: Wer hat gewonnen?', 'Dein knappstes Finish?', 'Geholt oder nicht? Tipp ab!', 'Zehntel oder Tausendstel?'], wiederAuch: ['Wer war vorne?', 'Zentimeter für Zentimeter'],
      felder: [['abstand', 'Abstand im Ziel', '0,042 s']], zeigen: 'abstand', zeigenLabel: 'ABSTAND IM ZIEL', info: () => 'ABSTAND IM ZIEL',
      feldTipp: 'Der Abstand kommt am Ende groß ins Bild. Leer lassen geht auch.',
      text: c => `Knapper geht’s nicht 🏁${c.abstand ? ' ' + c.abstand + ' Abstand im Ziel!' : ''} Wie knapp war’s bei dir schon mal? 👇\n\n#simracing #iracing #photofinish #simracer #kreids888`,
      hilfe: 'Für Zieleinläufe, bei denen es um Zehntel geht.' },
    { id: 'fail', name: 'Fail des Tages', emoji: '🤡', farbe: '#ff4fd8', tag: 'FAIL', zl: true, wieder: 'Nochmal. Langsam.', stempel: 'FAIL',
      hooks: ['Fail des Tages', 'Das war nix', 'Profi am Werk', 'Und tschüss', 'Halt mal mein Bier', 'Ich kann das erklären …', 'Bitte nicht lachen', 'Bitte nicht nachmachen', 'Skill Issue.', 'Lag. Eindeutig Lag.', 'iRating: Tschüss', 'Das passiert nur mir', 'Bremspunkt? Nie gehört.', 'Mein Coach weint', 'Keine Fragen, bitte.', 'So fährt ein Profi. Nicht.'], unten: ['Schon mal passiert? Ehrlich!', 'Wie viele Punkte für den Fail?', 'Passiert dir das auch?', 'Lag oder Skill Issue?', 'Dein peinlichster Moment?', 'Brauche eine Ausrede. Hilfe!', 'Note für den Fail: 1–10', 'Markier jemanden, der das kennt'], wiederAuch: ['Autsch. Nochmal.', 'In Zeitlupe noch peinlicher', 'Spoiler: Es wird nicht besser'],
      text: 'Fail des Tages 🤡 Ist dir das auch schon passiert? Sei ehrlich 👇\n\n#simracing #iracing #fail #simracer #kreids888',
      hilfe: 'Dreher, Verbremser, Patzer – Fails gehen immer. Mit FAIL-Stempel in der Zeitlupe.' },
    { id: 'duell', name: 'Duell', emoji: '⚔️', farbe: '#3d7bff', tag: 'DUELL', zl: true, wieder: 'Ganz genau hinsehen',
      hooks: ['Wer gewinnt?', 'Rad an Rad', 'Duell!', 'Keiner gibt nach', 'Keiner bremst', 'Nur einer kommt raus', 'So geht Racing', 'Hart. Aber fair?', 'Zentimeter-Arbeit', 'Wer zuckt zuerst?', 'Das ist Racing, Baby', 'Zwei Verrückte. Eine Kurve.', 'Mann gegen Mann', 'Kopf an Kopf. Runde für Runde.'], unten: ['Wer gewinnt? Tipp ab!', 'Wer war stärker?', 'Fair oder zu hart?', 'Wer zuckt zuerst?', 'Hättest du nachgegeben?', 'Sauberes Racing? 1–10', 'Dein härtestes Duell?', 'Wer hat das Duell gewonnen?'], wiederAuch: ['Wer zuckt zuerst?', 'Zentimeter für Zentimeter'],
      text: 'Rad an Rad ⚔️ Wer gewinnt das Duell? Tipp ab in den Kommentaren 👇\n\n#simracing #iracing #battle #simracer #kreids888',
      hilfe: 'Für Zweikämpfe Rad an Rad. Die Leute tippen, wer gewinnt.' },
    { id: 'raten', name: 'Welche Strecke?', emoji: '🗺️', farbe: '#5cff1f', tag: 'RATEN', zl: false, wieder: 'Nochmal in Zeitlupe', countdown: true, gross: true,
      hooks: ['Welche Strecke?', 'Erkennst du die Strecke?', 'Wo bin ich hier?', 'Nur Profis wissen’s', 'Nur echte Fans erkennen das', 'Du hast 5 Sekunden', 'Zu leicht? Beweis es!', 'Keiner errät das', 'Google ist verboten', 'Wetten, du weißt es nicht?', 'Erste Antwort zählt!', 'In 3 Sekunden erraten?', 'Nur für Experten'], unten: ['Schreib deinen Tipp!', 'Tipp ab – Auflösung am Ende', 'Wer weiß es zuerst?', 'Nicht spicken! Erst tippen', 'Sofort erkannt?', 'Schreib die Strecke rein!', 'Richtig geraten? Sei ehrlich', 'Wie schnell hast du’s gewusst?'],
      felder: [['strecke', 'Strecke (Auflösung)', 'Spa-Francorchamps']], pflicht: 'strecke', zeigen: 'strecke', zeigenLabel: 'AUFLÖSUNG', info: () => 'RICHTIG GERATEN?',
      feldTipp: 'Wird erst ganz am Ende gezeigt (mit 3-2-1). Vorher raten die Leute in den Kommentaren.',
      text: 'Welche Strecke ist das? 🗺️ Schreib deinen Tipp in die Kommentare – die Auflösung kommt am Ende 👇\n\n#simracing #iracing #racetrack #simracer #kreids888',
      hilfe: 'Ratespiel: Die Leute tippen die Strecke, am Ende kommt die Auflösung. Bringt viele Kommentare.' },
    { id: 'jetzt', name: 'Was passiert jetzt?', emoji: '⏸️', farbe: '#ff9f1c', tag: 'RÄTSEL', zl: true, wieder: 'Nochmal in Zeitlupe', pause: true,
      hooks: ['Was passiert jetzt?', 'Rate mal', 'Gleich knallt’s', 'Pass genau auf', 'Stopp! Was passiert?', 'Du wirst es nicht glauben', 'Crash oder Save?', 'Erst tippen, dann gucken', 'Wetten, du liegst falsch?', 'Niemand rät das richtig', 'Gleich wird’s wild', 'Was würdest du tun?', 'Drei … zwei … eins …', 'Bleib dran!'], unten: ['Was passiert? Tipp ab!', 'Crash oder Save?', 'Schreib deinen Tipp!', 'Richtig gelegen?', 'Hast du’s kommen sehen?', 'Erst tippen, dann gucken!', 'Ehrlich: Richtig getippt?', 'Wer hat’s richtig geraten?'], wiederAuch: ['Richtig getippt?'],
      text: 'Was passiert jetzt? 🤔 Tipp ab, bevor du weiterschaust! 👇\n\n#simracing #iracing #guess #simracer #kreids888',
      hilfe: 'Der Clip hält kurz vor der Action an, Countdown 3-2-1, dann geht’s weiter. Wo er anhält, stellst du bei „Schnitt“ ein.' },
    { id: 'wagnis', name: 'Hättest du’s gewagt?', emoji: '😬', farbe: '#ff1f3d', tag: 'RISIKO', zl: true, wieder: 'Nochmal ganz langsam',
      hooks: ['Hättest du’s gewagt?', 'Alles oder nichts', 'Mutig oder dumm?', 'Volles Risiko', 'Send it!', 'Lücke gesehen. Gefahren.', 'Bremsen? Nö.', 'Genie oder Wahnsinn?', 'Das hätte schiefgehen können', 'Mut wird belohnt … oder?', 'Nur für Verrückte', 'Kein Mut, kein Ruhm', 'Risiko: 100 %', 'Da passt doch keiner durch', 'Wer nicht wagt …'], unten: ['Ja oder nein? Kommentier!', 'Mutig oder dumm?', 'Wärst du auch gegangen?', 'Genie oder Wahnsinn?', 'Send it oder zurückstecken?', 'Dein mutigstes Manöver?', 'Wie viel Mut hast du? 1–10', 'Hättest du zurückgesteckt?'], wiederAuch: ['Da war die Lücke', 'Mutig. Oder?'],
      text: 'Hättest du’s gewagt? 😬 Ja oder nein? 👇\n\n#simracing #iracing #sendit #simracer #kreids888',
      hilfe: 'Für riskante Manöver: Lücke, Spätbremser, außen rum.' },
    { id: 'regen', name: 'Regen-Chaos', emoji: '🌧️', farbe: '#00c2ff', tag: 'REGEN', zl: true, wieder: 'Nochmal. Langsam.', regen: true,
      hooks: ['Regen-Chaos', 'Wer bleibt drauf?', 'Aquaplaning!', 'Nass. Nässer. Chaos.', 'Schwimmen statt Fahren', 'Sicht: null. Gas: voll.', 'Wer braucht schon Grip?', 'Seife auf der Strecke', 'Im Regen zählt nur Gefühl', 'Kein Grip. Keine Angst.', 'Blindflug in der Gischt', 'Regengott oder Opfer?', 'Das wird rutschig …'], unten: ['Wer bleibt drauf?', 'Slicks oder Regenreifen?', 'Wer fliegt zuerst raus?', 'Regen: Liebe oder Hass?', 'Wie fährst du im Regen?', 'Hättest du’s draufgehalten?', 'Regengott oder Opfer?', 'Nass oder trocken – was lieber?'], wiederAuch: ['Gischt. Überall Gischt.'],
      text: 'Regen-Chaos 🌧️ Wer bleibt hier drauf? 👇\n\n#simracing #iracing #rain #simracer #kreids888',
      hilfe: 'Für Regenrennen: mit Regen und Blitz im Bild, Donner und Regen im Ton.' },
    // Vorlagen mit mehreren Clips bzw. Zeitraffer (eigener Zeitplan und eigenes Bild, nur Neon-Look)
    { id: 'top3', name: 'Top 3 der Woche', emoji: '🏆', farbe: '#ffd400', tag: 'TOP 3', zl: false, wieder: '', mehr: 'top3', plaetze: ['PLATZ 3', 'PLATZ 2', 'PLATZ 1'],
      hooks: ['Top 3 der Woche', 'Meine Top 3', 'Die besten Momente', 'Platz 1 ist Wahnsinn', 'Warte auf Platz 1 …', 'Die Woche in 3 Clips', 'Nummer 1 ist krank', 'Top 3. Nicht skippen!', 'Bis zum Ende schauen!', 'Drei Momente. Ein Wahnsinn.', 'Platz 1 glaubt mir keiner'], unten: ['Was ist dein Platz 1?', 'Einverstanden? Kommentier!', 'Was fehlt in der Liste?', 'Falsche Reihenfolge?', '1, 2 oder 3 – dein Favorit?', 'Welcher ist der beste?', 'Deine Top 3 der Woche?'],
      text: 'Meine Top 3 der Woche 🏆 Was ist dein Platz 1? 👇\n\n#simracing #iracing #top3 #simracer #kreids888',
      hilfe: 'Drei Clips nacheinander, Platz 3 bis Platz 1. Zieh am besten drei Clips auf einmal rein, dann sind die Plätze gleich gefüllt.' },
    { id: 'vergleich', name: 'Vorher / Nachher', emoji: '🔀', farbe: '#18e8ff', tag: 'VERGLEICH', zl: false, wieder: '', mehr: 'vergleich', plaetze: ['VORHER', 'NACHHER'],
      hooks: ['Vorher / Nachher', 'Siehst du den Unterschied?', 'Gleiche Stelle. Anderes Ende.', 'Finde den Fehler', 'Erst so … dann so', 'Der Unterschied ist krass', 'Übung macht den Meister', 'Was hat sich geändert?', 'So hab ich es gelernt', 'Ein Detail. Riesenunterschied.', 'Oben oder unten?'], unten: ['Was hat sich geändert?', 'Welche ist schneller?', 'Oben oder unten?', 'Siehst du den Fehler?', 'Wo ist der Unterschied?', 'Oben oder unten? Tipp ab!', 'Welche Version fährst du?'],
      text: 'Vorher / Nachher 🔀 Siehst du den Unterschied? 👇\n\n#simracing #iracing #beforeafter #simracer #kreids888',
      hilfe: 'Zwei Clips gleichzeitig untereinander, z. B. Quali und Rennen oder Fehler und sauber. Geht auch zweimal mit demselben Clip.' },
    { id: 'strecke', name: 'Strecke in 30 Sek.', emoji: '🛣️', farbe: '#5cff1f', tag: 'ONBOARD', zl: false, wieder: '', mehr: 'strecke',
      felder: [['strecke', 'Strecke', 'Silverstone']], pflicht: 'strecke', feldTipp: 'Steht groß oben im Video.',
      hooks: ['Eine Runde in 30 Sek.', 'Die Strecke in 30 Sek.', 'So fährt man das', 'Lern die Strecke in 30 Sek.', 'Speichern fürs nächste Rennen', 'Nie wieder verfahren', 'Alle Kurven. Eine Runde.', 'Kennst du jede Kurve?', 'Streckenguide in 30 Sek.', 'Die Ideallinie zum Mitnehmen', 'Spickzettel fürs Rennen'], unten: ['Wie ist deine Bestzeit hier?', 'Wo verlierst du hier Zeit?', 'Kennst du die Strecke?', 'Speichern fürs nächste Rennen!', 'Welche Strecke als Nächstes?', 'Deine Lieblingskurve hier?', 'Wo ist die schwerste Kurve?'],
      text: c => `${c.strecke ? c.strecke + ' in 30 Sekunden' : 'Eine Runde in 30 Sekunden'} 🛣️ Wie ist deine Bestzeit hier? 👇\n\n#simracing #iracing #onboard #simracer #kreids888`,
      hilfe: 'Eine Runde im Zeitraffer. Kurvennamen und Tipps blendest du an der richtigen Stelle ein (Schritt 3).' },
    // ── Rennen ──
    { id: 'rennstart', name: 'Rennstart', emoji: '🟢', farbe: '#27f25a', tag: 'RENNSTART', zl: true, wieder: 'Der Start in Zeitlupe', gruenStart: true, gruppe: 'rennen', neu: true,
      felder: [['startplatz', 'Startplatz', '17'], ['nachStart', 'Platz nach dem Start', '14']], feldTipp: 'Freiwillig. Mit beiden Plätzen kommt am Ende groß, wie viele Plätze du am Start geholt hast.',
      ergebnisVon: c => { const s0 = nr(c.startplatz), n0 = nr(c.nachStart); if (!s0 || !n0) return null; const d = s0 - n0; return { wert: d > 0 ? '+' + d : d < 0 ? '-' + -d : '±0', label: 'PLÄTZE AM START', info: `VON P${s0} AUF P${n0}` }; },
      hooks: ['Grüne Flagge!', 'Rennstart', 'Und los geht’s!', 'Wer kommt besser weg?', 'Start wie eine Rakete', 'Der perfekte Start?', 'Los! Los! Los!', 'Jetzt zählt jeder Meter', 'Keine Gefangenen', 'Vollgas ab Meter 1', 'Kurve 1, ich komme!', 'Die ersten Sekunden zählen', 'So startet man ein Rennen'], unten: ['Wie war mein Start?', 'Guter Start oder zu wild?', 'Wie viele Plätze holst du?', 'Note für den Start: 1–10', 'Dein bester Start?', 'Zu aggressiv oder perfekt?', 'Startest du auch so?'], wiederAuch: ['Wer kommt besser weg?', 'Nochmal für die Stewards'],
      text: c => `Rennstart 🟢${nr(c.startplatz) ? ' von P' + nr(c.startplatz) : ''}${nr(c.nachStart) ? ', nach dem Start P' + nr(c.nachStart) : ''} – wie war mein Start? 👇\n\n#simracing #iracing #racestart #simracer #kreids888`,
      hilfe: 'Für Rennstarts: grüne Flagge am Anfang, dein Startplatz im Bild und am Ende, wie viele Plätze du am Start geholt hast.' },
    { id: 'bestzeit', name: 'Bestzeit im Rennen', emoji: '⚡', farbe: '#b84dff', tag: 'SCHNELLSTE RUNDE', zl: false, wieder: '', bestzeit: true, linie: true, gruppe: 'rennen', neu: true,
      felder: [['rundenzeit', 'Rundenzeit', '1:52.414'], ['runde', 'Runde', '23'], ['auto', 'Auto', 'Porsche 911 GT3 R']], pflicht: 'rundenzeit', feldTipp: 'Die Zeit läuft im Bild mit und wird an der Ziellinie lila.',
      ergebnisVon: c => { const z = String(c.rundenzeit || '').trim(); return z ? { wert: z, label: 'SCHNELLSTE RUNDE', info: GROSS([nr(c.runde) ? 'Runde ' + nr(c.runde) : '', c.auto].filter(Boolean).join(' · ')) } : null; },
      hooks: ['Schnellste Runde!', 'Bestzeit im Rennen', 'Lila!', 'Das war die Schnellste', 'Alles lila', 'Diese Runde ist krank', 'Niemand war schneller', 'Die Runde des Rennens', 'Schneller geht’s nicht', 'Pure Geschwindigkeit', 'Aus dem Nichts: Lila!', 'Mitten im Rennen. Bestzeit.'], unten: ['Wie schnell bist du hier?', 'Schreib deine Bestzeit!', 'Geht da noch was?', 'Wo holst du noch Zeit?', 'Schlägst du die Zeit?', 'Wie viel fehlt dir?'],
      text: c => `Schnellste Runde im Rennen${c.rundenzeit ? ' ⏱ ' + c.rundenzeit : ''} ⚡ Wie schnell bist du hier? 👇\n\n#simracing #iracing #fastestlap #simracer #kreids888`,
      hilfe: 'Für die schnellste Runde im Rennen: Die Rundenzeit läuft mit und wird an der Ziellinie lila, dazu „Schnellste Runde“ wie in der F1. Die Ziellinie stellst du in Schritt 3 ein.' },
    { id: 'ziel', name: 'Zieleinlauf', emoji: '🏁', farbe: '#ffd400', tag: 'ZIEL', zl: false, wieder: '', zielflagge: true, linie: true, gruppe: 'rennen', neu: true,
      felder: [['platz', 'Platz im Ziel', '4'], ['startplatz', 'Startplatz', '17'], ['serie', 'Rennen / Serie', 'SPR GT3 Cup']], pflicht: 'platz', feldTipp: 'Der Platz kommt groß ins Standbild, mit Startplatz auch die gewonnenen Plätze.',
      ergebnisVon: c => { const z = nr(c.platz); if (!z) return null; const s0 = nr(c.startplatz), d = s0 ? s0 - z : 0; return { wert: 'P' + z, label: 'IM ZIEL', info: GROSS([s0 ? `von P${s0} gestartet` : '', d > 0 ? `+${d} Plätze` : '', c.serie].filter(Boolean).join(' · ')) }; },
      hooks: ['Ziel!', 'Karierte Flagge', 'Geschafft!', 'Zieleinlauf', 'Es ist vorbei!', 'Was für ein Rennen', 'Alles gegeben', 'Dafür haben wir gekämpft', 'Endlich im Ziel', 'Warte auf das Ergebnis …', 'Das Ende war wild', 'Mission erfüllt?'], unten: ['Wie lief dein Rennen?', 'Zufrieden mit dem Ergebnis?', 'Was war dein bestes Ergebnis?', 'Hast du das erwartet?', 'Note fürs Rennen: 1–10', 'Nächstes Mal aufs Podium?'],
      text: c => `Zieleinlauf${nr(c.platz) ? ' auf P' + nr(c.platz) : ''}${nr(c.startplatz) ? ' – gestartet von P' + nr(c.startplatz) : ''} 🏁 Wie lief dein Rennen? 👇\n\n#simracing #iracing #finish #simracer #kreids888`,
      hilfe: 'Für die Zieldurchfahrt: An der Ziellinie steht das Bild, die karierte Flagge weht und dein Ergebnis kommt groß. Die Ziellinie stellst du in Schritt 3 ein.' },
    // ── Multiclass ──
    { id: 'verkehr', name: 'Durch den Verkehr', emoji: '🏎️', farbe: '#2f8bff', tag: 'MULTICLASS', zl: false, wieder: '', mehr: 'verkehr', gruppe: 'multi', neu: true,
      felder: [['klasse', 'Deine Klasse', 'LMP2']], feldTipp: 'Steht als Schild oben rechts. Leer lassen geht auch.',
      hooks: ['Durch den Verkehr', 'Multiclass-Chaos', 'Platz da!', 'Blaue Flagge!', 'Achtung, ich komme!', 'Wie im Berufsverkehr', 'Rushhour auf der Strecke', 'Keiner schaut in den Spiegel', 'Lücke für Lücke', 'Blau heißt Platz machen', 'Der Verkehr ist der Gegner', 'Slalom durch die Klassen'], unten: ['Wie viele hast du gezählt?', 'Sauber oder zu hart?', 'Lieber Proto oder GT?', 'Hättest du Platz gemacht?', 'Multiclass: Liebe oder Hass?'],
      text: c => `Durch den Verkehr 🏎️${c.klasse ? ' im ' + c.klasse : ''} – wie viele hast du gezählt? 👇\n\n#simracing #iracing #multiclass #simracer #kreids888`,
      hilfe: 'Multiclass: Du fährst durch die langsameren Klassen. Jedes überholte Auto markierst du in Schritt 3 – der Zähler läuft mit, die Klasse kommt als Schild ins Bild.' },
    { id: 'klassen', name: 'Klassen-Duell', emoji: '🆚', farbe: '#ff3df0', tag: 'KLASSEN-DUELL', zl: true, wieder: 'Ganz genau hinsehen', klassen: true, nurNeon: true, gruppe: 'multi', neu: true,
      felder: [['klasseA', 'Klasse A', 'LMP2'], ['klasseB', 'Klasse B', 'GT3']], feldTipp: 'Die beiden Klassen stehen oben über dem Clip und unten zum Abstimmen (A oder B).',
      hooks: ['Klassen-Duell', 'Proto gegen GT', 'Wer muss Platz machen?', 'Schnell gegen schneller', 'Wer hat Vorfahrt?', 'Die ewige Multiclass-Frage', 'David gegen Goliath', 'Keiner will nachgeben', 'Wer war im Recht?', 'Streitfrage der Saison', 'Das gibt Diskussionen …'], unten: ['Wer war im Recht? A oder B!', 'Wer hätte Platz machen müssen?', 'A oder B? Kommentier!', 'Schreib A oder B!', 'Wer hat Vorfahrt?', 'Team A oder Team B?'], wiederAuch: ['Nochmal für die Stewards', 'Wer hatte Vorfahrt?'],
      text: c => `${c.klasseA || 'LMP2'} gegen ${c.klasseB || 'GT3'} 🆚 Wer war im Recht – A oder B? 👇\n\n#simracing #iracing #multiclass #simracer #kreids888`,
      hilfe: 'Zwei Klassen, eine Kurve. Die Leute stimmen ab: A oder B – das bringt Kommentare.' },
    // ── Action ──
    { id: 'aufholjagd', name: 'Aufholjagd', emoji: '📈', farbe: '#5cff1f', tag: 'AUFHOLJAGD', zl: false, wieder: '', mehr: 'aufholjagd', gruppe: 'action', neu: true,
      felder: [['startplatz', 'Startplatz', '18']], pflicht: 'startplatz', feldTipp: 'Von hier zählt die Platz-Anzeige nach vorn.',
      hooks: ['Aufholjagd', 'Von ganz hinten', 'Platz für Platz', 'Niemals aufgeben', 'Von letzter Reihe nach vorn', 'Keiner hat an mich geglaubt', 'Das Comeback des Jahres?', 'Einer nach dem anderen', 'Wie weit komm ich?', 'Der Nächste, bitte!', 'Ich hol euch alle', 'Hinten? Kein Problem.'], unten: ['Wie viele Plätze schaffst du?', 'Beste Aufholjagd?', 'Was war dein Rekord?', 'Wie viele Plätze tippst du?', 'Dein bestes Comeback?', 'Hättest du aufgegeben?'],
      text: c => `Aufholjagd 📈${String(c.startplatz || '').replace(/\D/g, '') ? ' von P' + String(c.startplatz).replace(/\D/g, '') : ''} – wie viele Plätze schaffst du? 👇\n\n#simracing #iracing #comeback #simracer #kreids888`,
      hilfe: 'Von hinten nach vorn: Jeder Überholer ist ein Platz. Die Platz-Anzeige zählt mit, am Ende kommt „+X Plätze“.' },
    { id: 'ampel', name: 'Lights Out', emoji: '🚥', farbe: '#ff2a2a', tag: 'LIGHTS OUT', zl: true, wieder: 'Nochmal in Zeitlupe', ampel: true, nurNeon: true, gruppe: 'action', neu: true,
      hooks: ['Wer kommt besser weg?', 'Start-Duell', 'Reaktionstest', 'Kurve 1 wartet', 'Lights out and away we go', 'Fünf Lichter. Ein Schuss.', 'Warte auf die Lichter …', 'Frühstart oder perfekt?', 'Nerven behalten …', 'Puls auf 200', 'Bloß nicht abwürgen', 'Reaktion: göttlich?'], unten: ['Wie war dein Start?', 'Guter Start oder Frühstart?', 'Wer gewinnt Kurve 1?', 'Wie schnell ist deine Reaktion?', 'Frühstart? Sei ehrlich!', 'Deine Reaktionszeit?'], wiederAuch: ['Reaktion in Zeitlupe'],
      text: 'Lights out 🚥 Wer kommt hier besser weg? 👇\n\n#simracing #iracing #racestart #simracer #kreids888',
      hilfe: 'Für Rennstarts: Das Bild steht, fünf rote Lichter gehen an – Lichter aus und los. Mit Motor-Sound. Der Clip sollte kurz vor dem Start anfangen.' },
    { id: 'analyse', name: 'Replay-Analyse', emoji: '🎯', farbe: '#18e8ff', tag: 'ANALYSE', zl: true, wieder: 'Nochmal in Zeitlupe', analyse: true, nurNeon: true, gruppe: 'action', neu: true,
      felder: [['analyseText', 'Text bei der Analyse', 'Hier zu früh eingelenkt']], pflicht: 'analyseText', feldTipp: 'Erscheint im Standbild neben dem Kreis.',
      hooks: ['Genau hier!', 'Der Fehler', 'Siehst du’s?', 'Analyse', 'Hier liegt der Fehler', 'Darum bist du langsam', 'Der Fehler, den jeder macht', 'Machst du das auch?', 'Das kostet richtig Zeit', 'Nur Profis sehen das', 'Stopp! Schau hier hin', 'Der eine Fehler'], unten: ['Hättest du’s gesehen?', 'Was hättest du anders gemacht?', 'Einverstanden?', 'Machst du das auch so?', 'Mehr Analysen? Schreib ja!', 'Wo verlierst du Zeit?'], wiederAuch: ['Jetzt siehst du’s'],
      text: 'Replay-Analyse 🎯 Genau hier passiert’s. Was hättest du anders gemacht? 👇\n\n#simracing #iracing #analysis #simracer #kreids888',
      hilfe: 'Wie im TV: Der Clip hält an, die wichtige Stelle wird eingekreist und erklärt, dann läuft er weiter. Stelle und Kreis legst du in Schritt 3 fest.' },
    { id: 'sektoren', name: 'Sektorzeiten', emoji: '🟣', farbe: '#b44dff', tag: 'HOTLAP', zl: false, wieder: '', mehr: 'sektoren', gruppe: 'action', neu: true,
      felder: [['strecke', 'Strecke', 'Spa'], ['rundenzeit', 'Rundenzeit', '2:17.384']], feldTipp: 'Rundenzeit leer = wird aus dem Clip gemessen.',
      hooks: ['Lila. Lila. Lila.', 'Jedes Tausendstel zählt', 'Die perfekte Runde?', 'Schlägst du das?', 'Alles lila. Fast.', 'Wo ist die Zeit hin?', 'Grün, gelb oder lila?', 'Diese Runde ist illegal', 'Perfektion in 3 Sektoren', 'Sektor für Sektor'], unten: ['Schreib deine Zeit!', 'Wo holst du noch Zeit?', 'Wer ist schneller?', 'Welcher Sektor ist dein bester?', 'Lila oder nicht? Tipp ab!', 'Schneller? Beweis es!'],
      text: c => `Sektor für Sektor${c.strecke ? ' in ' + c.strecke : ''}${c.rundenzeit ? ' ⏱ ' + c.rundenzeit : ''} 🟣 Schlägst du das? 👇\n\n#simracing #iracing #hotlap #simracer #kreids888`,
      hilfe: 'Hotlap mit Zeiten-Turm wie in der F1: Sektorzeiten in Lila, Grün oder Gelb, am Ende die Rundenzeit. Die Sektoren markierst du in Schritt 3.' },
    // ── Trends ──
    { id: 'erwartung', name: 'Erwartung vs. Realität', emoji: '🎭', farbe: '#ffb800', tag: 'MEME', zl: false, wieder: '', mehr: 'erwartung', plaetze: ['ERWARTUNG', 'REALITÄT'], gruppe: 'trend', neu: true,
      felder: [['pointe', 'Text am Schluss', 'NA TOLL.']], feldTipp: 'Knallt am Ende auf das Standbild. Leer = „NA TOLL.“',
      hooks: ['Erwartung vs. Realität', 'So sollte es laufen …', 'Der Plan vs. das Rennen', 'Der Plan war gut …', 'Im Kopf sah es besser aus', 'Was ich wollte vs. was kam', 'Es fing so gut an …', 'Theorie vs. Praxis', 'Ich vs. die Physik', 'Quali: Gott. Rennen: …', 'Plan A, B und C. Alle weg.'], unten: ['Passiert dir das auch?', 'Kennst du das?', 'Sei ehrlich: Wie oft?', 'Markier jemanden, der das kennt', 'Deine Realität? Erzähl!', 'Wie oft passiert dir das?'],
      text: 'Erwartung vs. Realität 🎭 Kennst du das? Sei ehrlich 👇\n\n#simracing #iracing #expectationvsreality #simracer #kreids888',
      hilfe: 'Meme: Erst der Plan (schöner Clip), dann was wirklich passiert ist (Crash, Fail). Am Ende Standbild mit traurigem Trompeten-Sound.' },
    { id: 'kommentator', name: 'Kommentator', emoji: '🎙️', farbe: '#ff7a00', tag: 'KOMMENTAR', zl: true, wieder: 'Nochmal in Zeitlupe', kommentator: true, nurTV: true, gruppe: 'trend', neu: true,
      felder: [['serie', 'Serie', 'SPR GT3 Cup'], ['runde', 'Runde', '12/30'], ['fahrer', 'Fahrer im Bild', 'Kreids888 · P4'], ['laufband', 'Laufschrift', 'Kreids888 holt drei Plätze in einer Runde']],
      feldTipp: 'Alles freiwillig: Serie steht oben, Runde rechts daneben, der Fahrer in der Bauchbinde, die Laufschrift ganz unten.',
      hooks: ['Was für ein Manöver!', 'Unglaublich!', 'Das gibt’s doch nicht!', 'Und er ist vorbei!', 'Wahnsinn! Wahnsinn!', 'Das habe ich noch nie gesehen!', 'Was macht er denn da?!', 'Das ist Racing!', 'Meine Damen und Herren …', 'Das wird Ärger geben!', 'Er hat es wirklich getan!', 'Die Menge tobt!', 'Unfassbar, was hier passiert!'], unten: ['Wie hättest du’s kommentiert?', 'Was sagst du dazu?', 'Manöver des Rennens?', 'Besser als im TV?', 'Schreib deinen Kommentar!', 'Note fürs Manöver: 1–10'], wiederAuch: ['Das müssen wir nochmal sehen', 'Die Wiederholung!'],
      text: 'Was für ein Manöver! 🎙️ Wie hättest du’s kommentiert? 👇\n\n#simracing #iracing #racing #simracer #kreids888',
      hilfe: 'Wie eine echte TV-Übertragung: Serie, Runde, Fahrer-Bauchbinde, eigene Laufschrift und Jubel am Ende.' }
  ];
  const GRUPPEN = [['klassik', 'Klassiker'], ['rennen', 'Rennen'], ['mehr', 'Mehrere Clips & Runde'], ['multi', 'Multiclass'], ['action', 'Action'], ['trend', 'Trends']];
  const gruppeVon = v => v.gruppe || (v.mehr ? 'mehr' : 'klassik');
  const LOOKS = [['neon', '✨ Neon'], ['tv', '📺 TV-Sendung']];
  const WIEDER = ['Nochmal genau hinschauen', 'Nochmal in Zeitlupe', 'Ganz genau hinsehen', 'Nochmal. Langsam.', 'Wie?!', 'Jetzt ganz langsam …', 'In Zeitlupe noch krasser', 'Hast du’s gesehen?', 'Frame für Frame', 'Replay!', 'Das muss ich nochmal sehen', 'Zurückspulen …', 'Für alle, die’s verpasst haben', 'Nochmal, weil’s so schön war', 'Achtung … jetzt!'];   // Zeitlupe: passt zu jeder Vorlage (dazu je Vorlage „wieder“ + „wiederAuch“)
  const wiederListe = v => [v.wieder, ...(v.wiederAuch || []), ...WIEDER].filter((x, i, a) => x && a.indexOf(x) === i);
  // Sprüche ziehen: zufällig, aber die zuletzt benutzten kommen erst wieder, wenn alle anderen dran waren
  const ZULETZT = 'k888-clip-sprueche';
  function zuletzt() { try { return JSON.parse(localStorage.getItem(ZULETZT) || '{}') || {}; } catch (e) { return {}; } }
  function ziehen(liste, art, jetzt) {
    const z = zuletzt(), l = (z[art] || []).slice();
    const kand = liste.filter(x => x !== jetzt);
    if (!kand.length) return liste[0] || '';
    const alter = x => { const i = l.indexOf(x); return i < 0 ? 1e9 : i; };   // höher = länger nicht benutzt
    const nie = kand.filter(x => alter(x) === 1e9);
    const pool = nie.length ? nie : kand.slice().sort((a, b) => alter(b) - alter(a)).slice(0, Math.max(1, Math.ceil(kand.length / 3)));
    const w = pool[Math.floor(Math.random() * pool.length)];
    try { z[art] = [w, ...l.filter(x => x !== w)].slice(0, 120); localStorage.setItem(ZULETZT, JSON.stringify(z)); } catch (e) { /* ohne Speicher */ }
    return w;
  }
  const spruecheNeu = v => ({ hook: ziehen(v.hooks, 'hook'), unten: ziehen(v.unten, 'unten'), wieder: v.wieder ? ziehen(wiederListe(v), 'wieder') : '' });
  const frageVon = (c, v) => GROSS(String(c.unten || '').trim() || v.unten[0]);
  const wiederVon = (c, v) => GROSS(String(c.wieder || '').trim() || v.wieder);
  const FARBEN = ['#ff2d6f', '#5cff1f', '#18e8ff', '#ff7a00', '#b44dff', '#ff1f3d', '#ffd400', '#00ffa3', '#ff4fd8', '#3d7bff', '#ff9f1c', '#00c2ff'];
  const vorlage = c => VORLAGEN.find(v => v.id === c.vorlage) || VORLAGEN[0];
  const vorlageText = (v, c) => (typeof v.text === 'function' ? v.text(c || {}) : v.text);
  // Text unter dem Post: Spruch oben + Infos (Zeit, Platz …) + Frage unten + Hashtags – baut sich neu, bis du ihn selbst änderst
  const TEXT_INFO = {
    hotlap: c => [c.strecke, c.rundenzeit, c.auto],
    finish: c => [c.abstand && c.abstand + ' Abstand im Ziel'],
    strecke: c => [c.strecke],
    rennstart: c => [nr(c.startplatz) && 'Start von P' + nr(c.startplatz), nr(c.nachStart) && 'nach dem Start P' + nr(c.nachStart)],
    bestzeit: c => [c.rundenzeit, nr(c.runde) && 'Runde ' + nr(c.runde), c.auto],
    ziel: c => [nr(c.platz) && 'P' + nr(c.platz) + ' im Ziel', nr(c.startplatz) && 'gestartet von P' + nr(c.startplatz), c.serie],
    verkehr: c => [c.klasse && 'Klasse ' + c.klasse],
    klassen: c => [(String(c.klasseA || '').trim() || 'LMP2') + ' gegen ' + (String(c.klasseB || '').trim() || 'GT3')],
    aufholjagd: c => [nr(c.startplatz) && 'Gestartet von P' + nr(c.startplatz)],
    sektoren: c => [c.strecke, c.rundenzeit],
    kommentator: c => [c.serie, c.runde && 'Runde ' + c.runde]
  };
  const textEmoji = v => (String(vorlageText(v, {})).match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu) || []).find(x => x !== '\u{1F447}') || v.emoji;   // erstes Emoji im Vorlagen-Text (nicht 👇)
  const textTags = v => { const z = String(vorlageText(v, {})).trim().split('\n').pop().trim(); return z.startsWith('#') ? z : '#simracing #iracing #simracer #kreids888'; };
  // Pflicht-Hashtags (19.11.2026): stehen immer in der ersten Zeile (= Titel bei YouTube), sonst nirgends doppelt
  const PFLICHT = '#simracing #iracing #gt3 #crash';
  const ohnePflicht = t => String(t || '').replace(/(^|[^\p{L}\p{N}_#])#(simracing|iracing|gt3|crash)(?![\p{L}\p{N}_])/giu, '$1').replace(/[ \t]{2,}/g, ' ').trim();
  function textBauen(v, c) {
    const hook = String(c.hook || '').trim() || v.hooks[0], frage = String(c.unten || '').trim() || v.unten[0];
    const info = [folgeAn(c) ? `${v.name} Nr. ${folgeVon(c)}` : '', ...(TEXT_INFO[v.id] ? TEXT_INFO[v.id](c) : [])].map(x => String(x || '').trim()).filter(Boolean).join(' · ');
    const rest = ohnePflicht(textTags(v));
    return [ohnePflicht(hook + ' ' + textEmoji(v) + ortZusatz(c, hook)) + ' ' + PFLICHT, info, frage + ' 👇'].filter(Boolean).join('\n') + (rest ? '\n\n' + rest : '');
  }
  const mitText = c => { c.text = textBauen(vorlage(c), c); return c; };
  const kw = () => { const d = new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const tag = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - tag); const j = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - j) / 86400000 + 1) / 7); };
  // 🔢 Reihe mit Nummer (NEU 20.11.2026): „CRASH #12“ im Schild, „Crash Nr. 12“ im Text. Zählt je Vorlage von selbst hoch (der Worker merkt die höchste Nummer).
  const reiheStandard = () => { try { return localStorage.getItem('k888_reihe') !== '0'; } catch (e) { return true; } };
  const folgeAn = c => (c.folgeAn !== undefined ? !!c.folgeAn : reiheStandard());
  function folgeVon(c) { return c.folgeEigen ? Math.max(1, nr(c.folge)) : (((stand().clipnr || {})[c.vorlage]) || 0) + 1; }
  const tagText = (v, c) => (c && c.tagEigen) || (v.tag.replace('{kw}', kw()) + (c && folgeAn(c) ? ' #' + folgeVon(c) : ''));

  // ═══ 🔎 Stichwörter aus dem Dateinamen (NEU 19.11.2026) ═══
  // „Spa_EauRouge_Crash.mp4“ oder „Monza Parabolica überholt.mp4“ → Strecke, Stelle (Kurve), was passiert, Auto.
  // Daraus: passende Vorlage, Sprüche mit Ort und eine Titelzeile mit Strecke (die erste Zeile ist bei YouTube der Titel).
  const stNorm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const ST_STRECKEN = [
    ['Spa-Francorchamps', 'spa spafrancorchamps francorchamps'], ['Monza', 'monza'], ['Nordschleife', 'nordschleife nuerburgringnordschleife nurburgringnordschleife greenhell gruenehoelle'],
    ['Nürburgring Combined', 'nuerburgringcombined nurburgringcombined combined gesamtstrecke'], ['Nürburgring', 'nuerburgring nurburgring nuerburgringgp nurburgringgp'],
    ['Le Mans', 'lemans sarthe circuitdelasarthe'], ['Daytona', 'daytona'], ['Sebring', 'sebring'], ['Road Atlanta', 'roadatlanta'], ['Road America', 'roadamerica elkhartlake'],
    ['Watkins Glen', 'watkinsglen watkins theglen'], ['Laguna Seca', 'lagunaseca laguna'], ['Long Beach', 'longbeach'], ['Sonoma', 'sonoma'], ['VIR', 'vir'], ['Lime Rock', 'limerock'],
    ['Mid-Ohio', 'midohio'], ['Indianapolis', 'indianapolis indy'], ['COTA', 'cota circuitoftheamericas austin'], ['Interlagos', 'interlagos'], ['Imola', 'imola'], ['Mugello', 'mugello'],
    ['Misano', 'misano'], ['Silverstone', 'silverstone'], ['Brands Hatch', 'brandshatch'], ['Donington', 'donington'], ['Oulton Park', 'oultonpark oulton'], ['Snetterton', 'snetterton'],
    ['Knockhill', 'knockhill'], ['Thruxton', 'thruxton'], ['Zandvoort', 'zandvoort'], ['Zolder', 'zolder'], ['Hockenheim', 'hockenheim hockenheimring'], ['Oschersleben', 'oschersleben'],
    ['Lausitzring', 'lausitzring lausitz'], ['Norisring', 'norisring'], ['Red Bull Ring', 'redbullring rbr spielberg'], ['Hungaroring', 'hungaroring'], ['Barcelona', 'barcelona catalunya montmelo'],
    ['Valencia', 'valencia'], ['Jerez', 'jerez'], ['Navarra', 'navarra'], ['Algarve', 'algarve portimao'], ['Paul Ricard', 'paulricard ricard'], ['Magny-Cours', 'magnycours'],
    ['Suzuka', 'suzuka'], ['Fuji', 'fuji'], ['Motegi', 'motegi'], ['Okayama', 'okayama'], ['Tsukuba', 'tsukuba'], ['Bathurst', 'bathurst mountpanorama'], ['Phillip Island', 'phillipisland'],
    ['Kyalami', 'kyalami'], ['Brno', 'brno'], ['Mosport', 'mosport ctmp canadiantire'], ['Barber', 'barber'], ['Portland', 'portland'], ['Charlotte', 'charlotte'], ['Detroit', 'detroit'],
    ['Montreal', 'montreal'], ['Winton', 'winton'], ['Sachsenring', 'sachsenring'], ['Most', 'autodrommost']
  ];
  // Stellen: [Name, Schlüsselwörter, Strecke (wenn eindeutig)]
  const ST_STELLEN = [
    ['Eau Rouge', 'eaurouge', 'Spa-Francorchamps'], ['Raidillon', 'raidillon', 'Spa-Francorchamps'], ['Kemmel-Gerade', 'kemmel kemmelgerade kemmelstraight camelstraight', 'Spa-Francorchamps'],
    ['La Source', 'lasource', 'Spa-Francorchamps'], ['Les Combes', 'lescombes combes', 'Spa-Francorchamps'], ['Bruxelles', 'bruxelles', 'Spa-Francorchamps'], ['Pouhon', 'pouhon', 'Spa-Francorchamps'],
    ['Fagnes', 'fagnes lesfagnes', 'Spa-Francorchamps'], ['Stavelot', 'stavelot', 'Spa-Francorchamps'], ['Blanchimont', 'blanchimont', 'Spa-Francorchamps'], ['Bus Stop', 'busstop', ''],
    ['Rettifilo', 'rettifilo variantedelrettifilo', 'Monza'], ['Curva Grande', 'curvagrande', 'Monza'], ['Roggia', 'roggia variantedellaroggia', 'Monza'], ['Lesmo', 'lesmo lesmo1 lesmo2', 'Monza'],
    ['Ascari', 'ascari', 'Monza'], ['Parabolica', 'parabolica alboreto curvaalboreto', 'Monza'],
    ['Hatzenbach', 'hatzenbach', 'Nordschleife'], ['Flugplatz', 'flugplatz', 'Nordschleife'], ['Schwedenkreuz', 'schwedenkreuz', 'Nordschleife'], ['Aremberg', 'aremberg', 'Nordschleife'],
    ['Fuchsröhre', 'fuchsroehre fuchsrohre', 'Nordschleife'], ['Adenauer Forst', 'adenauerforst', 'Nordschleife'], ['Metzgesfeld', 'metzgesfeld', 'Nordschleife'], ['Kallenhard', 'kallenhard', 'Nordschleife'],
    ['Wehrseifen', 'wehrseifen', 'Nordschleife'], ['Breidscheid', 'breidscheid', 'Nordschleife'], ['Ex-Mühle', 'exmuehle exmuhle', 'Nordschleife'], ['Bergwerk', 'bergwerk', 'Nordschleife'],
    ['Kesselchen', 'kesselchen', 'Nordschleife'], ['Klostertal', 'klostertal', 'Nordschleife'], ['Karussell', 'karussell karusell carousel caracciola', 'Nordschleife'], ['Hohe Acht', 'hoheacht', 'Nordschleife'],
    ['Brünnchen', 'bruennchen brunnchen', 'Nordschleife'], ['Pflanzgarten', 'pflanzgarten', 'Nordschleife'], ['Schwalbenschwanz', 'schwalbenschwanz', 'Nordschleife'], ['Galgenkopf', 'galgenkopf', 'Nordschleife'],
    ['Döttinger Höhe', 'doettingerhoehe dottingerhohe doettinger', 'Nordschleife'], ['Tiergarten', 'tiergarten', 'Nordschleife'],
    ['Mercedes-Arena', 'mercedesarena', 'Nürburgring'], ['Yokohama-S', 'yokohama yokohamas', 'Nürburgring'], ['Dunlop-Kehre', 'dunlopkehre', 'Nürburgring'], ['Veedol-Schikane', 'veedol', 'Nürburgring'],
    ['Tertre Rouge', 'tertrerouge', 'Le Mans'], ['Mulsanne', 'mulsanne hunaudieres', 'Le Mans'], ['Arnage', 'arnage', 'Le Mans'], ['Porsche-Kurven', 'porschekurven porschecurves', 'Le Mans'], ['Ford-Schikane', 'fordschikane fordchicane', 'Le Mans'],
    ['Steilkurve', 'banking steilkurve', 'Daytona'], ['Horseshoe', 'horseshoe', 'Daytona'],
    ['Tamburello', 'tamburello', 'Imola'], ['Villeneuve', 'villeneuve', 'Imola'], ['Tosa', 'tosa', 'Imola'], ['Piratella', 'piratella', 'Imola'], ['Acque Minerali', 'acqueminerali', 'Imola'],
    ['Variante Alta', 'variantealta', 'Imola'], ['Rivazza', 'rivazza', 'Imola'],
    ['130R', '130r', 'Suzuka'], ['Spoon', 'spoon', 'Suzuka'], ['Degner', 'degner', 'Suzuka'], ['Casio-Schikane', 'casio', 'Suzuka'],
    ['Copse', 'copse', 'Silverstone'], ['Maggotts', 'maggotts', 'Silverstone'], ['Becketts', 'becketts', 'Silverstone'], ['Stowe', 'stowe', 'Silverstone'], ['Luffield', 'luffield', 'Silverstone'],
    ['Conrod Straight', 'conrod conrodstraight', 'Bathurst'], ['The Chase', 'thechase', 'Bathurst'], ['Skyline', 'skyline', 'Bathurst'], ['The Dipper', 'dipper thedipper', 'Bathurst'], ['Forrest’s Elbow', 'forrestselbow', 'Bathurst'],
    ['Corkscrew', 'corkscrew korkenzieher', 'Laguna Seca'], ['Tarzan', 'tarzan tarzanbocht', 'Zandvoort'], ['Hugenholtz', 'hugenholtz', 'Zandvoort'], ['Scheivlak', 'scheivlak', 'Zandvoort'],
    ['Senna-S', 'sennas sdosenna', 'Interlagos'], ['Descida do Lago', 'descidadolago', 'Interlagos'], ['Remus', 'remus', 'Red Bull Ring'], ['Rindt', 'rindt', 'Red Bull Ring'],
    ['Paddock Hill', 'paddockhill', 'Brands Hatch'], ['Druids', 'druids', 'Brands Hatch'], ['Clearways', 'clearways', 'Brands Hatch'],
    ['Arrabbiata', 'arrabbiata', 'Mugello'], ['Casanova', 'casanova', 'Mugello'], ['Savelli', 'savelli', 'Mugello'], ['Bucine', 'bucine', 'Mugello'], ['San Donato', 'sandonato', 'Mugello'],
    ['Spitzkehre', 'spitzkehre', 'Hockenheim'], ['Sachs-Kurve', 'sachskurve', 'Hockenheim'],
    ['Start-Ziel-Gerade', 'startziel startzielgerade zielgerade mainstraight', ''], ['Boxengasse', 'boxengasse pitlane boxenausfahrt boxeneinfahrt', ''], ['Schikane', 'schikane chicane', ''],
    ['Haarnadel', 'haarnadel hairpin', ''], ['Esses', 'esses', ''], ['Kiesbett', 'kiesbett gravel', '']
  ];
  // Was passiert → Vorlage
  const ST_SITU = [
    ['ueberholtworden', 'duell', 'Überholt worden', '🥲'],
    ['crash', 'crash', 'Crash', '💥', 'crash unfall einschlag abflug abgeflogen mauer wand reifenstapel barriere totalschaden wreck massencrash pileup bigone'],
    ['dreher', 'fail', 'Dreher', '🌀', 'dreher spin gedreht dreht pirouette'],
    ['fehler', 'fail', 'Fehler', '🤡', 'fehler fail peinlich verbremst verpasst bremspunktverpasst abgekuerzt offtrack'],
    ['ueberholt', 'ueberholer', 'Überholt', '🚀', 'ueberholen ueberholt ueberholmanoever ueberholmanover overtake pass passed vorbei spaetbremser sendit divebomb aussenrum'],
    ['duell', 'duell', 'Duell', '⚔️', 'duell zweikampf kampf battle fight radanrad tuerantuer seiteanseite'],
    ['save', 'save', 'Save', '😮‍💨', 'save gerettet rettung gehalten glueck fastweg'],
    ['kontakt', 'schuld', 'Kontakt', '⚖️', 'kontakt rempler schuld touch punt abgeschossen umgedreht torpedo bumper gerammt rammen incident'],
    ['ampel', 'ampel', 'Lights Out', '🚥', 'ampel lightsout lichteraus'],
    ['start', 'start', 'Start', '🚦', 'start rennstart startchaos ersterunde lap1 runde1'],
    ['finish', 'finish', 'Fotofinish', '📸', 'finish fotofinish zielfoto photofinish knappesziel'],
    ['ziel', 'ziel', 'Ziel', '🏁', 'ziel zieleinlauf zielflagge checkered sieg win gewonnen podium pokal'],
    ['regen', 'regen', 'Regen', '🌧️', 'regen nass wet rain aquaplaning'],
    ['bestzeit', 'bestzeit', 'Bestzeit', '⚡', 'bestzeit fastestlap schnellsterunde lila purple rekord record'],
    ['hotlap', 'hotlap', 'Hotlap', '⏱️', 'hotlap quali qualifying pole'],
    ['wagnis', 'wagnis', 'Gewagt', '😬', 'gewagt risiko mutig wagnis yolo'],
    ['verkehr', 'highlight', 'Verkehr', '🏎️', 'verkehr multiclass ueberrundet blauflagge blaueflagge traffic lapped'],
    ['highlight', 'highlight', 'Highlight', '🔥', 'highlight moment wahnsinn krass wow']
  ];
  const ST_AUTOS = [['Porsche', 'porsche'], ['BMW', 'bmw'], ['Ferrari', 'ferrari'], ['Mercedes-AMG', 'mercedes amg'], ['Audi', 'audi'], ['Lamborghini', 'lamborghini lambo'], ['McLaren', 'mclaren'],
    ['Corvette', 'corvette'], ['Aston Martin', 'astonmartin aston'], ['Ford Mustang', 'mustang'], ['Lexus', 'lexus'], ['Acura', 'acura'], ['Honda', 'honda'], ['Toyota', 'toyota supra'], ['Cadillac', 'cadillac'],
    ['Dallara', 'dallara'], ['Ligier', 'ligier'], ['Oreca', 'oreca']];
  const ST_KLASSEN = { gt3: 'GT3', gt4: 'GT4', gte: 'GTE', gtp: 'GTP', lmp2: 'LMP2', lmp3: 'LMP3', tcr: 'TCR', mx5: 'MX-5', cup: 'Cup' };
  const ST_RAUSCH = new Set('replay markiert cam clip clips iracing racing simracing sim obs video final cut neu new edit kreids kreids888 kreidsclipper clipper mp4 mov teil part und and mit der die das den dem im in am beim vom von zu bei ich mir mich wird wurde ist hat runde lap rennen race session test training practice liga league season saison woche week'.split(' '));
  const ST_MAP = new Map();
  ST_STRECKEN.forEach(([n, a]) => a.split(' ').forEach(k => ST_MAP.set(k, { art: 'strecke', n })));
  ST_STELLEN.forEach(([n, a, s]) => a.split(' ').forEach(k => ST_MAP.set(k, { art: 'stelle', n, s })));
  ST_SITU.forEach(([id, v, n, e, a]) => (a || '').split(' ').filter(Boolean).forEach(k => ST_MAP.set(k, { art: 'situ', id })));
  ST_AUTOS.forEach(([n, a]) => a.split(' ').forEach(k => ST_MAP.set(k, { art: 'auto', n })));
  const situVon = id => ST_SITU.find(x => x[0] === id);
  // Dateiname/Text → { strecke, stelle, situ, auto, klasse, woerter }
  function stichwoerter(roh) {
    const ohneEndung = String(roh || '').replace(/\.(mp4|mov|m4v|webm|mkv)$/i, '');
    const teile = ohneEndung.replace(/([a-zäöüß])([A-ZÄÖÜ])/g, '$1 $2').split(/[\s_\-.,+()[\]{}|/\\]+/).filter(Boolean);
    const r = { strecke: '', stelle: '', situ: '', auto: '', klasse: '', fremd: [], woerter: teile };
    const situs = [];
    for (let i = 0; i < teile.length;) {
      let treffer = null, n = 1;
      for (let k = Math.min(4, teile.length - i); k >= 1 && !treffer; k--) {   // längster Treffer zuerst („Eau Rouge“, „Watkins Glen“)
        const key = stNorm(teile.slice(i, i + k).join('')), m = ST_MAP.get(key);
        if (m) { treffer = m; n = k; }
      }
      const w = teile[i], wn = stNorm(w);
      if (treffer) {
        if (treffer.art === 'strecke' && !r.strecke) r.strecke = treffer.n;
        else if (treffer.art === 'stelle' && !r.stelle) { r.stelle = treffer.n; if (treffer.s && !r.strecke) r.streckeVonStelle = treffer.s; }
        else if (treffer.art === 'situ') situs.push(treffer.id);
        else if (treffer.art === 'auto' && !r.auto) r.auto = treffer.n;
      } else if (/^(t|turn|kurve|k)(\d{1,2})$/.test(wn)) { if (!r.stelle) r.stelle = 'Kurve ' + wn.replace(/\D/g, ''); }
      else if (ST_KLASSEN[wn]) { if (!r.klasse) r.klasse = ST_KLASSEN[wn]; }
      else if (wn === 'worden' || wn === 'kassiert' || wn === 'verloren') situs.push('worden');
      else if (wn && !/^\d+$/.test(wn) && !/^r\d{1,3}$/.test(wn) && wn.length > 1 && !ST_RAUSCH.has(wn)) r.fremd.push(w);   // „R59“ = Runde aus der Toolbox, kein Ort
      i += n;
    }
    if (!r.strecke && r.streckeVonStelle) r.strecke = r.streckeVonStelle;
    // Unbekannte Wörter = Stelle (z. B. eine Kurve, die nicht in der Liste steht)
    if (!r.stelle && r.fremd.length) r.stelle = r.fremd.slice(0, 3).map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(' ');
    if (situs.includes('worden') && (situs.includes('ueberholt') || !situs.length || situs.every(x => x === 'worden'))) r.situ = 'ueberholtworden';
    else r.situ = situs.find(x => x !== 'worden') || '';
    return r;
  }
  const stichLeer = sw => !sw || (!sw.strecke && !sw.stelle && !sw.situ && !sw.auto);
  // Sprüche mit Ort ({ort} = Stelle, sonst Strecke · {strecke} = Strecke, sonst Stelle)
  const ORT_SPRUECHE = {
    crash: ['Crash in {ort}', '{ort}. Vollgas. Mauer.', '{ort} verzeiht nichts', 'Das war’s in {ort}', 'Bremsen in {ort}? Nö.', 'Abflug in {ort}', 'Wer bremst in {ort}?', '{ort} sagt NEIN'],
    fail: ['Dreher in {ort}', '{ort} hat gewonnen', 'Peinlich in {ort}', '{ort}: 1, ich: 0', 'Wie fährt man {ort}?', 'Pirouette in {ort}'],
    ueberholer: ['Überholt in {ort}!', 'Die Lücke in {ort}', 'Spätbremser in {ort}', 'Außen rum in {ort}?!', 'So fährt man {ort}', 'Vorbei in {ort}!'],
    duell: ['Rad an Rad in {ort}', 'Duell in {ort}', 'Tür zu in {ort}?', 'Wer gewinnt {ort}?', 'Kassiert in {ort}'],
    ueberholtworden: ['Kassiert in {ort}', 'Überholt in {ort}. Autsch.', 'Tür offen in {ort}', '{ort}: Platz weg'],
    save: ['Gerettet in {ort}!', 'Wie hielt ich {ort}?!', '{ort}. Fast. Weg.', 'Glück in {ort}', 'Das hält in {ort}?!'],
    schuld: ['Kontakt in {ort}', 'Rempler in {ort}', 'Wer war schuld in {ort}?', 'Abgeschossen in {ort}'],
    start: ['Startchaos in {strecke}', 'Kurve 1 in {strecke}. Chaos.', 'Erste Runde in {strecke}', 'Start in {strecke}. Krass.'],
    ampel: ['Lights out in {strecke}', 'Start in {strecke}'],
    finish: ['Fotofinish in {strecke}', 'Zentimeter in {strecke}', 'Ziel in {strecke}. Knapp!'],
    ziel: ['Zieleinlauf in {strecke}', 'Geschafft in {strecke}!'],
    regen: ['Regen in {ort}', 'Aquaplaning in {ort}', 'Nass in {ort}. Viel Glück.'],
    bestzeit: ['Bestzeit in {strecke}!', 'Lila in {ort}', 'Die Runde in {strecke}'],
    hotlap: ['Hotlap {strecke}', 'Schaffst du {strecke}?'],
    wagnis: ['Hättest du’s gewagt? {ort}', 'Mutig in {ort}?'],
    jetzt: ['Was passiert in {ort}?', 'Rate mal: {ort}'],
    highlight: ['Wahnsinn in {ort}', 'Das passiert in {ort}', '{ort}. Einfach krass.']
  };
  function ortSprueche(c) {
    const ort = c.stelle || c.strecke, strecke = c.strecke || c.stelle;
    if (!ort) return [];
    const l = ORT_SPRUECHE[c.situ === 'ueberholtworden' ? 'ueberholtworden' : c.vorlage] || ORT_SPRUECHE.highlight;
    return l.map(x => x.replace(/\{ort\}/g, ort).replace(/\{strecke\}/g, strecke)).filter(x => x.length <= 40);
  }
  // Stichwörter auf den Clip anwenden: Vorlage (wenn erkannt), Strecke/Stelle/Auto, Spruch mit Ort
  function stichAnwenden(c, text) {
    const sw = stichwoerter(text);
    c.stichText = String(text || '').replace(/\.(mp4|mov|m4v|webm|mkv)$/i, '').replace(/[_]+/g, ' ').trim();
    if (stichLeer(sw)) { c.stich = null; return false; }
    const si = sw.situ && situVon(sw.situ);
    if (si && si[1] !== c.vorlage && VORLAGEN.some(v => v.id === si[1])) vorlageSetzen(c, si[1]);
    Object.assign(c, { stich: sw, situ: sw.situ, stelle: sw.stelle, strecke: sw.strecke || c.strecke || '', auto: sw.auto || c.auto || '', klasse: sw.klasse || c.klasse || '' });
    const l = ortSprueche(c);
    if (l.length) c.hook = ziehen(l, 'ort-' + (c.situ || c.vorlage), c.hook);
    c.textEigen = false; mitText(c);
    return true;
  }
  // Titelzeile: Ort dazu, wenn er noch nicht im Spruch steht (z. B. „Crash in Eau Rouge 💥 | Spa-Francorchamps · Porsche“)
  const mitStich = c => { stichAnwenden(c, c.name); return c; };
  function stichChips(c) {
    const sw = c.stich;
    if (!sw) return c.stichText ? '<div class="kc-dim">Nichts erkannt. Beispiel: Spa Eau Rouge Crash</div>' : '';
    const si = sw.situ && situVon(sw.situ), vn = si && (VORLAGEN.find(v => v.id === si[1]) || {}).name;
    const l = [sw.strecke && ['📍', sw.strecke], sw.stelle && ['↪', sw.stelle], si && [si[3], si[2] + (vn ? ' → ' + vn : '')], sw.auto && ['🏎', sw.auto], sw.klasse && ['🏷', sw.klasse]].filter(Boolean);
    return `<div class="kc-chips kc-stich">${l.map(([i, t]) => `<span class="ki-chip">${i} ${esc(t)}</span>`).join('')}</div>`;
  }
  function ortZusatz(c, hook) {
    if (!c.stich) return '';
    const h = stNorm(hook), teile = [c.stelle, c.strecke, c.auto].filter(x => x && !h.includes(stNorm(x)));
    return teile.length ? ' | ' + [...new Set(teile)].join(' · ') : '';
  }

  // ─── Schriften ───
  let SCHRIFT = null;
  function schriften() {
    if (!SCHRIFT) SCHRIFT = Promise.all([
      ['K8Russo', 'russo-one-latin-400-normal.woff2', '400'], ['K8Saira', 'saira-condensed-latin-900-normal.woff2', '900'],
      ['K8Saira', 'saira-condensed-latin-700-normal.woff2', '700'], ['K8Orbitron', 'orbitron-latin-900-normal.woff2', '900']
    ].map(([f, d, w]) => new FontFace(f, `url(${site()}fonts/${d})`, { weight: w }).load().then(x => { document.fonts.add(x); }).catch(() => null)));
    return SCHRIFT;
  }
  const RU = (g, px) => { g.font = `400 ${px}px K8Russo, "Russo One", Impact, sans-serif`; };
  const SA = (g, px, w) => { g.font = `${w || 900} ${px}px K8Saira, "Saira Condensed", "Arial Narrow", sans-serif`; };
  const OR = (g, px) => { g.font = `900 ${px}px K8Orbitron, Orbitron, monospace`; };
  function passt(g, t, maxW, px, setz, min) { let s = px; setz(g, s); while (s > (min || 18) && g.measureText(t).width > maxW) { s -= 2; setz(g, s); } return s; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function zweiZeilen(t) {
    const w = String(t || '').split(/\s+/).filter(Boolean), trenn = x => /^[/|·]$/.test(x);
    if (w.length < 2 || t.length <= 13) return [t];
    let best = [t], diff = 1e9;
    for (let i = 1; i < w.length; i++) {   // ein Trenner wie „/“ am Zeilenumbruch fällt weg
      const a = w.slice(0, trenn(w[i - 1]) ? i - 1 : i).join(' '), b = w.slice(trenn(w[i]) ? i + 1 : i).join(' ');
      if (!a || !b) continue;
      const d = Math.abs(a.length - b.length); if (d < diff) { diff = d; best = [a, b]; }
    }
    return best;
  }
  const BILDER = new Map();
  function bild(url) {
    if (!url) return Promise.resolve(null);
    if (!BILDER.has(url)) BILDER.set(url, new Promise(ok => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; }));
    return BILDER.get(url);
  }

  // ═══ 🏁 Team-Logo (NEU 22.11.2026): überall dazu wählbar – Clips, Trailer und Videos der Automatik, Karussells ═══
  //   team = { d: Datei (kreids888 → team → bilder), x/y: Mitte des Logos (0–1 vom Bild), s: Größe (0–1 der Bildbreite) } · leer = ohne
  //   Verschieben: Logo in der Vorschau mit der Maus ziehen (oder die Regler). Größe: Regler, im Clip-Editor auch Mausrad auf dem Logo.
  //   Je Art merkt sich der Browser die letzte Einstellung: clip = Clips aus dem Editor · trailer = Trailer und Videos der Automatik · kar = Karussells.
  //   Sie gilt für alles Neue dieser Art, auch für das, was sich von selbst baut.
  const TEAM = [['f2f-logo.webp', 'F2F Logo', false], ['f2f-motto.webp', 'F2F Motto', true], ['f2f-g61.png', 'F2F G61', true]];   // true = schwarzer Hintergrund wird ausgeblendet
  const TEAM_PLATZ = { clip: { x: 0.86, y: 0.075, s: 0.15 }, trailer: { x: 0.86, y: 0.075, s: 0.15 }, kar: { x: 0.594, y: 0.077, s: 0.125 } };   // Standardplatz je Art
  const TEAM_MIN = 0.04, TEAM_MAX = 0.6, TEAM_KEY = 'k888_team', TEAM_IMG = new Map(), TEAM_LAEDT = new Map();
  const teamUrl = d => site() + 'team/bilder/' + d, zahl01 = (v, ersatz) => (v != null && v !== '' && isFinite(+v) ? Math.round(kl(+v, 0, 1) * 10000) / 10000 : ersatz);
  const teamOk = t => (t && TEAM.some(x => x[0] === t.d) ? { d: t.d, x: zahl01(t.x, 0.5), y: zahl01(t.y, 0.5), s: Math.round(kl(+t.s || 0.12, TEAM_MIN, TEAM_MAX) * 10000) / 10000 } : null);
  let TEAM_STD = null;
  const teamAlle = () => { if (!TEAM_STD) { try { TEAM_STD = JSON.parse(localStorage.getItem(TEAM_KEY) || '{}') || {}; } catch (e) { TEAM_STD = {}; } } return TEAM_STD; };
  const teamStandard = art => teamOk(teamAlle()[art]);   // gemerktes Logo dieser Art (oder nichts)
  const teamPlatz = art => { const a = teamAlle()[art]; return a && +a.s > 0 ? { x: zahl01(a.x, 0.5), y: zahl01(a.y, 0.5), s: kl(+a.s, TEAM_MIN, TEAM_MAX) } : { ...TEAM_PLATZ[art] }; };   // gemerkter Platz, sonst Standardplatz
  function teamMerken(art, team) {   // letzte Einstellung dieser Art merken („Ohne“ behält Platz und Größe fürs nächste Mal)
    const a = teamAlle(); a[art] = teamOk(team) || { ...teamPlatz(art), d: '' };
    try { localStorage.setItem(TEAM_KEY, JSON.stringify(a)); } catch (e) { /* dann nur bis zum Neuladen */ }
  }
  function teamBild(datei) {   // lädt ein Team-Logo einmal (ohne schwarzen Hintergrund, wenn es so hinterlegt ist)
    const e = TEAM.find(x => x[0] === datei); if (!e) return Promise.resolve(null);
    if (!TEAM_LAEDT.has(datei)) TEAM_LAEDT.set(datei, new Promise(ok => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = teamUrl(datei); }).then(img => {
      if (!img) { TEAM_LAEDT.delete(datei); return null; }   // beim nächsten Mal neu versuchen
      let fertig = img;
      if (e[2]) { try { const c = leinwand(img.naturalWidth, img.naturalHeight), g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
        for (let i = 0; i < a.length; i += 4) { const mx = Math.max(a[i], a[i + 1], a[i + 2]); if (mx < 70) a[i + 3] = Math.min(a[i + 3], Math.max(0, (mx - 18) * 5)); }
        g.putImageData(d, 0, 0); fertig = c; } catch (err) { fertig = img; } }
      TEAM_IMG.set(datei, fertig); return fertig;
    }));
    return TEAM_LAEDT.get(datei);
  }
  const teamLaden = () => Promise.all(TEAM.map(x => teamBild(x[0])));
  async function teamPflicht(team) {   // vor dem Bauen: ein gewähltes Logo muss da sein – lieber abbrechen als ohne Logo posten
    const t = teamOk(team); if (!t) return;
    if (!(await teamBild(t.d))) throw new Error('Das Team-Logo lässt sich nicht laden. Bitte noch einmal versuchen oder bei „🏁 Team-Logo dazu“ auf „Ohne“ stellen.');
  }
  function teamRechteck(team, W, Hh) {   // wo das Logo im Bild liegt (W × Hh = Bildgröße) → { x, y, w, h, img }
    const t = teamOk(team), img = t && TEAM_IMG.get(t.d); if (!img) return null;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; if (!iw || !ih) return null;
    const k = t.s * W / Math.sqrt(iw * ih), w = iw * k, h = ih * k;   // Größe nach Fläche: ein breites Logo wirkt so groß wie ein rundes
    return { x: t.x * W - w / 2, y: t.y * Hh - h / 2, w, h, img };
  }
  function teamZeichnen(g, team, W, Hh) {   // Logo über alles legen (mit weichem Schatten, damit es auf jedem Bild steht)
    const r = teamRechteck(team, W, Hh); if (!r) return;
    const sk = (g.getTransform && Math.abs(g.getTransform().a)) || 1;   // Schatten wächst mit der Vorschau-Größe mit
    g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 18 * sk; g.shadowOffsetX = 0; g.shadowOffsetY = 3 * sk;
    g.drawImage(r.img, r.x, r.y, r.w, r.h); g.restore();
  }
  const TEAM_ORT = {   // wo ein Team-Logo eingestellt wird · halter().team trägt die Einstellung
    clip: { art: () => 'clip', halter: () => CLIPS[0] || null },                                          // Clip im Editor
    ae: { art: () => (AUTO_ED && AUTO_ED.typ === 'top5' ? 'kar' : 'trailer'), halter: () => AUTO_ED },    // Editor für Automatisches (Trailer, Morgen live, Stream verpasst, Wochenvorschau, Top 5)
    foto: { art: () => 'kar', halter: () => ABL.kar }                                                     // Karussell aus Fotos
  };
  const TEAM_TIPP = {
    clip: 'Gilt für diesen Clip und wird gemerkt: Der nächste Clip (auch das Video „Top 3 der Woche“) bekommt das Logo wieder so.',
    trailer: 'Gilt für dieses Video und wird gemerkt: Trailer und Videos, die sich von selbst bauen, bekommen das Logo ab jetzt genauso.',
    kar: 'Das Logo steht auf jeder Seite an derselben Stelle. Die Einstellung wird gemerkt: Auch das Karussell „Top 5 der Woche“ bekommt es ab jetzt so.'
  };
  function teamPanel(ort) {   // Bedienfeld: Logo wählen, Größe, Platz
    const o = TEAM_ORT[ort], h = o.halter(); if (!h) return '';
    const t = teamOk(h.team);
    const gross = ort === 'foto' ? (ABL.fotoWahl.slice(0, h.schluss ? KAR_MAX - 1 : KAR_MAX).find(n => karFoto(n).look !== 'ohne') || (h.schluss ? '::schluss' : '')) : '';   // 📸 Karussell: eine Seite größer zum Schieben (die kleinen Seitenbilder gehen auch)
    return `<div class="kc-bildpanel kc-team" data-team="${ort}">
      <div class="kc-bildkopf">🏁 Team-Logo dazu <span class="kc-dim">Logo anklicken = es kommt ins Bild. „Ohne“ = kein Team-Logo.</span></div>
      <div class="kc-team-gal"><button type="button" class="${t ? '' : 'an'}" data-c="team-wahl" data-wert="" title="Kein Team-Logo im Bild"><i>Ohne</i></button>${TEAM.map(([d, name]) => `<button type="button" class="${t && t.d === d ? 'an' : ''}" data-c="team-wahl" data-wert="${esc(d)}" title="${esc(name)} ins Bild setzen"><img src="${esc(teamUrl(d))}" alt="${esc(name)}" loading="lazy"><i>${esc(name)}</i></button>`).join('')}</div>
      ${t ? `<div class="kc-team-zwei">${gross ? `<canvas class="kc-team-vs mit-team" data-abv="${esc(gross)}" width="432" height="540" title="Mit der Maus ziehen = Team-Logo verschieben"></canvas>` : ''}
      <div class="kc-team-regler"><div class="kc-dim">🖐 ${gross ? 'Logo im Bild daneben' : 'Logo in der Vorschau'} mit der Maus ziehen = an jede Stelle schieben.${ort === 'clip' ? ' Mausrad auf dem Logo = größer oder kleiner.' : ''}</div>
      <label class="kc-feld">Logo-Größe <b data-c="team-s-wert">${Math.round(t.s * 100)} %</b><input type="range" min="${TEAM_MIN}" max="${TEAM_MAX}" step="0.005" value="${t.s}" data-c="team-s"></label>
      <div class="kc-felder"><label class="kc-feld">Logo nach links ↔ rechts<input type="range" min="0" max="1" step="0.005" value="${t.x}" data-c="team-x"></label>
        <label class="kc-feld">Logo nach oben ↕ unten<input type="range" min="0" max="1" step="0.005" value="${t.y}" data-c="team-y"></label></div>
      <div class="kc-knoepfe"><button type="button" class="btn ki-k" data-c="team-reset" title="Setzt das Logo zurück an den Standardplatz und auf die Standardgröße">↺ Zurück an den Standardplatz</button></div></div></div>` : ''}
      ${tipp(TEAM_TIPP[o.art()])}
    </div>`;
  }
  function teamRegler(ort) {   // Regler an die Einstellung nachziehen (nach dem Ziehen mit der Maus oder dem Mausrad)
    const p = BOX && BOX.querySelector(`[data-team="${ort}"]`), h = TEAM_ORT[ort].halter(), t = h && teamOk(h.team); if (!p || !t) return;
    for (const k of ['s', 'x', 'y']) { const e = p.querySelector(`[data-c="team-${k}"]`); if (e) e.value = t[k]; }
    const w = p.querySelector('[data-c="team-s-wert"]'); if (w) w.textContent = Math.round(t.s * 100) + ' %';
  }
  let TEAM_MALT = false;
  function teamMalen(ort, nur) {   // Vorschau sofort nachziehen (Clip-Editor und Trailer malen ohnehin laufend)
    if (ort === 'ae') { const cv = BOX && BOX.querySelector('canvas.kc-ae-vorschau'); if (cv) delete cv.dataset.fertig; }
    if (ort === 'foto' && !TEAM_MALT) { TEAM_MALT = true; requestAnimationFrame(() => ablKarVorschau(nur || undefined).catch(() => {}).then(() => { TEAM_MALT = false; })); }
  }
  function teamSetzen(ort, aendern, fertig, nur) {   // Einstellung ändern (aendern bekommt die alte) · fertig = merken und alle Seiten nachziehen
    const o = TEAM_ORT[ort], h = o && o.halter(); if (!h) return;
    const alt = teamOk(h.team); if (!alt) return;
    h.team = teamOk(aendern(alt)) || alt;
    teamRegler(ort); teamMalen(ort, nur);
    if (fertig) { teamMerken(o.art(), h.team); if (ort === 'foto') ablKarVorschauBald(); }
  }
  function teamZug(ev) {   // 🖐 Zeiger auf dem Logo (Clip-Editor) oder irgendwo auf einer kleinen Vorschau (Automatik, Karussell)? → Zug-Daten
    if (ev.button > 0 || !ev.target.closest) return null;
    let cv = ev.target.closest('canvas[data-c="vorschau"]'), ort = 'clip', W = B, Hh = H;
    if (!cv) { cv = ev.target.closest('canvas.kc-ae-vorschau'); if (cv) { ort = 'ae'; if (AUTO_ED && AUTO_ED.typ === 'top5') { W = KB; Hh = KH; } } }
    if (!cv) { cv = ev.target.closest('canvas[data-abv]'); if (cv) { ort = 'foto'; W = KB; Hh = KH; } }
    if (!cv) return null;
    const h = TEAM_ORT[ort].halter(), team = h && teamOk(h.team), r = team && teamRechteck(team, W, Hh); if (!r) return null;
    const k = cv.getBoundingClientRect(), sx = W / k.width, sy = Hh / k.height, px = (ev.clientX - k.left) * sx, py = (ev.clientY - k.top) * sy;
    if (ort === 'clip') { const rand = Math.max(14, (110 - Math.min(r.w, r.h)) / 2); if (px < r.x - rand || px > r.x + r.w + rand || py < r.y - rand || py > r.y + r.h + rand) return null; }   // im Editor nur auf dem Logo (sonst zieht man das Video)
    return { team: ort, cv, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, sx, sy, W, Hh, t0: team, name: cv.dataset.abv || '', bewegt: false };
  }

  // ─── Neon-Bausteine (einmal gezeichnet, dann nur noch kopiert) ───
  const CACHE = new Map();
  function merk(key, fn) { if (!CACHE.has(key)) { if (CACHE.size > 60) CACHE.clear(); CACHE.set(key, fn()); } return CACHE.get(key); }
  function leinwand(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function licht(g, x, y, rad, farbe, a) { const r = g.createRadialGradient(x, y, 0, x, y, rad); r.addColorStop(0, hexA(farbe, a)); r.addColorStop(1, hexA(farbe, 0)); g.fillStyle = r; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  function streifen(g, x1, y1, x2, y2, breite, farbe, glow, kern) {
    g.save(); const gr = g.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, hexA(farbe, 0)); gr.addColorStop(0.25, farbe); gr.addColorStop(0.8, farbe); gr.addColorStop(1, hexA(farbe, 0.1));
    g.strokeStyle = gr; g.lineWidth = breite; g.shadowColor = farbe; g.shadowBlur = glow; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.stroke();
    if (kern) { g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1.5, breite * 0.22); g.stroke(); }
    g.restore();
  }
  // Carbon-Hintergrund mit Neon-Streifen in den Ecken
  function grund(farbe) {
    return merk('grund' + farbe, () => {
      const c = leinwand(B, H), g = c.getContext('2d'), t = leinwand(24, 24), k = t.getContext('2d');
      const q = (x, y, hor) => { const gr = hor ? k.createLinearGradient(x, y, x, y + 12) : k.createLinearGradient(x, y, x + 12, y); gr.addColorStop(0, '#262b31'); gr.addColorStop(0.45, '#171b1f'); gr.addColorStop(1, '#0a0c0e'); k.fillStyle = gr; k.fillRect(x, y, 12, 12); };
      q(0, 0, true); q(12, 12, true); q(12, 0, false); q(0, 12, false);
      const p = g.createPattern(t, 'repeat'); p.setTransform(new DOMMatrix().rotateSelf(45).scaleSelf(1.6));
      g.fillStyle = '#07090b'; g.fillRect(0, 0, B, H); g.fillStyle = p; g.fillRect(0, 0, B, H);
      const r = g.createRadialGradient(B / 2, H * 0.48, 80, B / 2, H * 0.48, 1100); r.addColorStop(0, 'rgba(2,3,4,.78)'); r.addColorStop(0.6, 'rgba(2,3,4,.5)'); r.addColorStop(1, 'rgba(2,3,4,.2)');
      g.fillStyle = r; g.fillRect(0, 0, B, H);
      licht(g, 0, 0, 640, farbe, 0.18); licht(g, B, H, 700, farbe, 0.18);
      streifen(g, -10, 470, 340, -10, 30, farbe, 44, true); streifen(g, -10, 300, 210, -10, 7, farbe, 22, true); streifen(g, -10, 640, 460, -10, 2.5, farbe, 12);
      streifen(g, B + 10, H - 470, B - 340, H + 10, 30, farbe, 44, true); streifen(g, B + 10, H - 300, B - 210, H + 10, 7, farbe, 22, true); streifen(g, B + 10, H - 640, B - 460, H + 10, 2.5, farbe, 12);
      return c;
    });
  }
  // Chrom-Schrift mit Neon-Rand, 3D-Tiefe, Bürstung und Glanz → fertiges Bild
  function chrom(text, px, farbe, maxB) {
    return merk(['chrom', text, px, farbe, maxB].join('|'), () => {
      const m = leinwand(10, 10).getContext('2d'); RU(m, px); let w = m.measureText(text).width;
      const fs = px * Math.min(1, (maxB || 980) / w); RU(m, fs); w = m.measureText(text).width;
      const pad = 90, cw = w + pad * 2 + fs * SK, ch = fs * 0.78 + pad * 2, c = leinwand(cw, ch), g = c.getContext('2d');
      const y = pad + fs * 0.74, x0 = pad + fs * SK * 0.75, top = y - fs * 0.72;
      const mal = (ctx, f) => { ctx.save(); ctx.transform(1, 0, -SK, 1, SK * y, 0); RU(ctx, fs); f(ctx); ctx.restore(); };
      mal(g, k => { k.lineJoin = 'round'; k.strokeStyle = farbe; k.shadowColor = farbe; k.lineWidth = fs * 0.075; k.shadowBlur = fs * 0.28; k.strokeText(text, x0, y); k.shadowBlur = fs * 0.12; k.lineWidth = fs * 0.05; k.strokeText(text, x0, y); });
      mal(g, k => { const n = Math.max(6, Math.round(fs / 22)); for (let i = n; i >= 1; i--) { const v = 14 + i * 3; k.fillStyle = i > n - 3 ? '#020303' : `rgb(${v},${v + 3},${v + 6})`; k.fillText(text, x0 + i * 0.7, y + i * 1.05); } });
      mal(g, k => { k.lineJoin = 'round'; k.strokeStyle = '#06080a'; k.lineWidth = Math.max(4, fs * 0.03); k.strokeText(text, x0, y); });
      const o = leinwand(cw, ch), ok = o.getContext('2d');
      mal(ok, k => { const lg = k.createLinearGradient(0, top, 0, y); [[0, '#ffffff'], [0.14, '#e9edf0'], [0.32, '#a3abb2'], [0.47, '#f5f7f8'], [0.5, '#5f6670'], [0.57, '#3b4148'], [0.72, '#a6aeb5'], [0.88, '#f1f4f6'], [1, '#8a939b']].forEach(([p, f]) => lg.addColorStop(p, f)); k.fillStyle = lg; k.fillText(text, x0, y); });
      ok.globalCompositeOperation = 'source-atop';
      for (let yy = Math.floor(top) - 6; yy < y + 6; yy += 2) { ok.fillStyle = `rgba(255,255,255,${0.025 + ((Math.sin(yy * 1.7) + Math.sin(yy * 0.31)) * 0.25 + 0.5) * 0.06})`; ok.fillRect(0, yy, cw, 1); }
      const sp = ok.createLinearGradient(0, top + (y - top) * 0.62, 0, y); sp.addColorStop(0, hexA(farbe, 0)); sp.addColorStop(1, hexA(farbe, 0.5)); ok.fillStyle = sp; ok.fillRect(0, top, cw, y - top + 4);
      mal(ok, k => { k.lineJoin = 'round'; k.lineWidth = Math.max(2, fs * 0.022); const kg = k.createLinearGradient(0, top, 0, y); kg.addColorStop(0, 'rgba(255,255,255,.9)'); kg.addColorStop(0.5, 'rgba(255,255,255,.2)'); kg.addColorStop(1, 'rgba(0,0,0,.55)'); k.strokeStyle = kg; k.strokeText(text, x0, y); });
      g.drawImage(o, 0, 0);
      return { c, w: cw, h: ch, base: y, mitte: cw / 2, gesicht: o };
    });
  }
  // Neon-Schrift (leuchtend)
  function neonText(g, text, x, y, px, farbe, setz, ausr, glow) {
    g.save(); (setz || RU)(g, px); g.textAlign = ausr || 'left';
    g.shadowColor = farbe; g.shadowBlur = glow ?? px * 0.5; g.fillStyle = farbe; g.fillText(text, x, y); g.shadowBlur = (glow ?? px * 0.5) * 0.35; g.fillText(text, x, y);
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.85)'; g.globalAlpha = 0.55; g.fillText(text, x, y);
    g.restore();
  }
  // Schräges Neon-Band mit dunkler Schrift
  function band(text, farbe, px) {
    return merk(['band', text, farbe, px].join('|'), () => {
      const m = leinwand(10, 10).getContext('2d'); RU(m, px); const tw = m.measureText(text).width;
      const h = px * 1.55, s = h * 0.42, w = Math.min(B - 120, tw + px * 1.6 + s), c = leinwand(w + s + 160, h + 120), g = c.getContext('2d'), x0 = 40, y0 = 60;
      g.save(); g.shadowColor = farbe; g.shadowBlur = 40;
      const lg = g.createLinearGradient(0, y0, 0, y0 + h); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.18, farbe); lg.addColorStop(1, farbe); g.fillStyle = lg;
      const pg = (a, b, c2, d) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c2); g.lineTo(...d); g.closePath(); g.fill(); };
      pg([x0 + s, y0], [x0 + w + s - 60, y0], [x0 + w - 60, y0 + h], [x0, y0 + h]);
      for (let i = 0; i < 3; i++) { const x = x0 + w - 40 + i * 30; pg([x + s, y0], [x + s + 16, y0], [x + 16, y0 + h], [x, y0 + h]); }
      g.restore();
      g.save(); RU(g, passt(g, text, w - px * 1.2, px, RU)); g.fillStyle = '#06080a'; const ty = y0 + h / 2 + px * 0.36; g.transform(1, 0, -SK, 1, SK * ty, 0);
      g.fillText(text, x0 + s * 0.5 + px * 0.5, ty); g.restore();
      return { c, w: w + s + 160, h: h + 120, bandW: w + s };
    });
  }

  // ─── Zeitplan eines Clips: Hauptteil · Zeitlupe vom Ende (halbe Geschwindigkeit) · Abspann ───
  // Bei „Was passiert jetzt?“ hält der Clip bei F an (FD Sekunden, Countdown 3-2-1) und läuft dann weiter
  const HALT = 2.4, ANALYSE = 3.4, AMPEL = 3.6, AMPEL_AN = [0.45, 1.0, 1.55, 2.1, 2.65], ZIEL_HALT = 3.0;
  // Quellen eines Clips: [Haupt-Clip, …weitere] (Top 3 und Vorher/Nachher nehmen mehrere)
  const quellenVon = c => [c, ...(c.extra || [])];
  function abschnitt(s) { const dauer = s.dauer || 10, a = kl(s.start || 0, 0, Math.max(0, dauer - 1)), b = kl(s.ende || dauer, a + 1, dauer); return { a, b }; }
  const STRECKE_ZIEL = 28;   // eine Runde im Zeitraffer auf etwa so viele Sekunden
  // Vorlagen mit Markierungen im Clip (Kurven, überholte Autos, Plätze, Sektoren): Zeitraffer-Ziel, Standbild am Ende, Texte für Schritt 3
  const MARKEN = {
    strecke: { ziel: STRECKE_ZIEL, max: 4, nach: 0, schritt: '3 · Runde & Kurven', von: 'Runde beginnt', bis: 'Runde endet', stelle: 'Stelle für die nächste Kurve', knopf: '＋ Kurve an dieser Stelle', ph: 'Kurvenname – Tipp', kurz: i => 'T' + (i + 1),
      tipp: 'Stelle schieben, die Vorschau zeigt das Bild. Dann „＋ Kurve“ und Text, z. B. „Copse – voll durch“ (vor dem Strich groß, dahinter klein).' },
    verkehr: { ziel: 30, max: 3, nach: 2.4, schritt: '3 · Schnitt & Autos', von: 'Anfang', bis: 'Ende', stelle: 'Stelle fürs nächste Auto', knopf: '＋ Auto überholt', ph: 'Klasse, z. B. GT4', kurz: i => '#' + (i + 1),
      tipp: 'Stelle schieben, bis du am Auto vorbei bist. Dann „＋ Auto überholt“ und die Klasse eintragen (z. B. GT4). Am Ende kommt ein Standbild mit der Zahl.' },
    aufholjagd: { ziel: 35, max: 4, nach: 2.4, schritt: '3 · Schnitt & Überholer', von: 'Anfang', bis: 'Ende', stelle: 'Stelle für den nächsten Überholer', knopf: '＋ Platz gewonnen', ph: 'Gegner oder Kurve (freiwillig)', kurz: null,
      tipp: 'Stelle schieben, bis du vorbei bist. Dann „＋ Platz gewonnen“. Jeder Eintrag ist ein Platz nach vorn, am Ende kommt ein Standbild mit „+X Plätze“.' },
    sektoren: { ziel: 40, max: 3, nach: 2.6, schritt: '3 · Runde & Sektoren', von: 'Runde beginnt', bis: 'Runde endet', stelle: 'Stelle fürs nächste Sektor-Ende', knopf: '＋ Sektor endet hier', ph: 'Zeit, z. B. 32.415 (leer = gemessen)', kurz: i => 'S' + (i + 1), farbe: true,
      tipp: 'Stelle genau auf die Sektor-Linie schieben, dann „＋ Sektor endet hier“. Der letzte Sektor endet am Rundenende. Lila = Bestzeit, Grün = persönliche Bestzeit, Gelb = langsamer.' }
  };
  const ERWARTUNG_NACH = 2.0;   // Standbild der Realität am Ende (Trompete)
  const SEKTOR_FARBEN = { lila: '#b84dff', gruen: '#27f25a', gelb: '#ffd400' };
  // „1:23.456“, „83.456“, „32,415“ → Sekunden (sonst null)
  function zeitLesen(s) {
    const m = String(s || '').trim().replace(',', '.').match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
    return m ? (Number(m[1]) || 0) * 60 + Number(m[2]) : null;
  }
  function zeitText(s) {   // 32.415 · 1:23.456
    s = Math.max(0, s || 0); const ms = Math.round(s * 1000), m = Math.floor(ms / 60000), r = (ms - m * 60000) / 1000;
    return m ? `${m}:${r.toFixed(3).padStart(6, '0')}` : r.toFixed(3);
  }
  // Zeitplan für Top 3 · Vorher/Nachher · Strecke usw. spur(t) → welche Plätze (s) zu welcher Clip-Zeit (t) zu sehen sind (steh = Standbild)
  function zeitplanMehr(c, v) {
    const q = quellenVon(c), p = { mehr: v.mehr, R: 0, Z: 0, FD: 0 };
    if (v.mehr === 'top3') {
      const teile = []; let S = 0;
      q.slice(0, 3).forEach((src, i) => { const { a, b } = abschnitt(src); teile.push({ q: i, a, b, S, d: b - a }); S += b - a; });
      const bei = t => teile.find(x => t >= x.S && t < x.S + x.d);
      Object.assign(p, { teile, slots: teile.map(x => x.q), D: S, a: teile[0].a, b: teile[0].b,
        spur: t => { const k = bei(t); return k ? [{ s: k.q, t: k.a + (t - k.S) }] : []; },
        quelle: t => { const k = bei(t); return k ? k.a + (t - k.S) : null; } });
    } else if (v.mehr === 'vergleich') {
      const x0 = abschnitt(q[0]), x1 = q[1] ? abschnitt(q[1]) : x0, D = Math.min(x0.b - x0.a, x1.b - x1.a);
      Object.assign(p, { x0, x1, slots: [0, q[1] ? 1 : 0], D, a: x0.a, b: x0.a + D,
        spur: t => (t < D ? [{ s: 0, t: x0.a + t }, { s: 1, t: x1.a + t }] : []),
        quelle: t => (t < D ? x0.a + t : null) });
    } else if (v.mehr === 'erwartung') {   // erst Erwartung, dann Realität (Erwartung bleibt oben als Standbild), am Ende Standbild
      const x0 = abschnitt(q[0]), x1 = q[1] ? abschnitt(q[1]) : x0, d0 = x0.b - x0.a, d1 = x1.b - x1.a, lauf = d0 + d1, D = lauf + ERWARTUNG_NACH;
      const s1 = q[1] ? 1 : 0, steh0 = { s: 0, t: Math.max(x0.a, x0.b - 0.05), steh: true };
      Object.assign(p, { x0, x1, d0, lauf, slots: [0, s1], D, a: x0.a, b: x0.b,
        teile: [{ q: 0, a: x0.a, b: x0.b, S: 0, d: d0 }, { q: 1, a: x1.a, b: x1.b, S: d0, d: d1 }],
        spur: t => (t < d0 ? [{ s: 0, t: x0.a + t }] : t < lauf ? [{ s: 1, t: x1.a + t - d0 }, steh0] : t < D ? [{ s: 1, t: Math.max(x1.a, x1.b - 0.05), steh: true }, steh0] : []),
        quelle: t => (t < d0 ? x0.a + t : null) });
    } else {   // Strecke · Verkehr · Aufholjagd · Sektoren: ein Clip mit Markierungen, lange Clips im Zeitraffer
      const cfg = MARKEN[v.mehr] || MARKEN.strecke, x = abschnitt(q[0]), L = x.b - x.a, tempo = kl(L / cfg.ziel, 1, cfg.max), lauf = L / tempo, D = lauf + cfg.nach;
      const marken = (c.marken || []).filter(m => m.t >= x.a && m.t <= x.b).sort((m, n) => m.t - n.t).map((m, i) => ({ ...m, n: i + 1, ot: (m.t - x.a) / tempo }));
      Object.assign(p, { x, tempo, marken, lauf, slots: [0], D, a: x.a, b: x.b,
        spur: t => (t < lauf ? [{ s: 0, t: x.a + t * tempo }] : t < D ? [{ s: 0, t: Math.max(x.a, x.b - 0.05), steh: true }] : []),
        quelle: t => (t < lauf ? x.a + t * tempo : null) });
      if (v.mehr === 'sektoren') {   // Sektor-Enden = Markierungen + Rundenende; Zeit eingetragen oder aus dem Clip gemessen
        let vor = x.a;
        p.sektoren = [...marken, null].map((mk, i) => {
          const ende = mk ? mk.t : x.b, roh = mk ? zeitLesen(mk.text) : null, s = { n: i + 1, start: vor, ende, ot0: (vor - x.a) / tempo, ot: (ende - x.a) / tempo,
            zeit: roh != null ? roh : ende - vor, farbe: SEKTOR_FARBEN[(mk ? mk.farbe : c.sektorLetzt) || 'lila'] || SEKTOR_FARBEN.lila };
          vor = ende; return s;
        });
        const lr = zeitLesen(c.rundenzeit);
        if (lr != null) { const rest = lr - p.sektoren.slice(0, -1).reduce((s, x2) => s + x2.zeit, 0); if (rest > 0.5) p.sektoren[p.sektoren.length - 1].zeit = rest; }   // letzter Sektor passt zur Rundenzeit
        p.runde = lr != null ? lr : p.sektoren.reduce((s, x2) => s + x2.zeit, 0);
      }
    }
    p.h = p.D; p.F = p.b; p.T = p.D + OUTRO;
    return p;
  }
  function zeitplan(c) {
    if (vorlage(c).mehr) return zeitplanMehr(c, vorlage(c));
    const dauer = c.dauer || 10, a = kl(c.start || 0, 0, Math.max(0, dauer - 1)), b = kl(c.ende || dauer, a + 1, dauer), v = vorlage(c);
    // Anhalten: „Was passiert jetzt?“ (Countdown) und Replay-Analyse an einer Stelle, Lights Out ganz am Anfang (Startampel)
    const lin = v.linie ? kl(c.linie != null ? c.linie : b - 2, a + 0.3, b - 0.2) : null;   // Ziellinie
    const FD = v.pause ? HALT : v.analyse ? ANALYSE : v.ampel ? AMPEL : v.zielflagge ? ZIEL_HALT : 0;
    const F = v.ampel ? a : (v.pause || v.analyse) ? kl(c.halt != null ? c.halt : b - 2.5, a + 0.5, b - 0.3) : v.zielflagge ? lin : b, h = F - a;
    const D0 = b - a, D = D0 + FD, Z = c.zeitlupe ? Math.min(3, D0 * 0.4) : 0, R = Z * 2, T = D + R + OUTRO;
    return { a, b, D, Z, R, T, F, FD, h, lin, L: lin != null ? lin - a : null, quelle: t => (t < h ? a + t : t < h + FD ? F : t < D ? a + t - FD : t < D + R ? b - Z + (t - D) / 2 : null) };
  }

  // ─── Ein Bild zeichnen (Vorschau und Video benutzen dieselbe Funktion) ───
  let KLEIN = null;
  function unscharf(g, vid) {   // Clip unscharf über das ganze Bild (klein zeichnen, groß ziehen)
    if (!KLEIN) KLEIN = leinwand(96, 54);
    const k = KLEIN.getContext('2d'); k.drawImage(vid, 0, 0, 96, 54);
    const hh = H + 400, ww = hh * 96 / 54;
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(KLEIN, (B - ww) / 2, -200, ww, hh); g.restore();
  }
  function weichesBild(g, vid, farbe) {   // Clip unscharf als Hintergrund
    unscharf(g, vid);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, B, H);
    g.save(); g.globalAlpha = 0.8; g.drawImage(grund(farbe), 0, 0); g.restore();
  }
  function bildRechteck(vid, x, y, w, h, zoom, versatz, tf) {   // wo der Clip landet, wenn er ein Rechteck deckend füllt (tf: selbst verschoben/vergrößert)
    const vw = (vid && (vid.videoWidth || vid.displayWidth)) || 1920, vh = (vid && (vid.videoHeight || vid.displayHeight)) || 1080, s = Math.max(w / vw, h / vh) * (zoom || 1), dw = vw * s, dh = vh * s;
    // Hochkant-Clip (z. B. fertiger Clip aus dem Kreids Clipper) im Querformat-Rahmen: Mitte bei 38 % der Höhe – dort ist meist das Spielbild, unten die Kamera
    const yy = vh > vw && dh > h * 1.5 ? kl(y + h / 2 - 0.38 * dh, y + h - dh, y) : y + (h - dh) / 2;
    const r = { x: x + (w - dw) * (0.5 + (versatz || 0) * 0.5), y: yy, w: dw, h: dh };
    if (!tf || (!tf.x && !tf.y && (!tf.z || tf.z === 1))) return r;
    const z = kl(tf.z || 1, 0.3, 5), cx = x + w / 2, cy = y + h / 2;   // um die Mitte des Fensters vergrößern, dann verschieben
    return { x: cx + (r.x - cx) * z + (tf.x || 0) * w, y: cy + (r.y - cy) * z + (tf.y || 0) * h, w: r.w * z, h: r.h * z };
  }
  function quellBild(g, vid, x, y, w, h, zoom, versatz, tf) {   // Clip deckend in ein Rechteck
    const r = bildRechteck(vid, x, y, w, h, zoom, versatz, tf); g.drawImage(vid, r.x, r.y, r.w, r.h);
  }
  // Fenster (Rahmen um den Clip): Breite/Höhe einstellbar. Wird es höher, rückt es etwas nach oben und alles darunter nach unten (dy)
  const FENSTER_MAX = { neon: 820, tv: 620 };
  // ═══ 📷 Cam im Clip (NEU 21.11.2026): die Renn-Cam bekommt einen festen Platz im Bild ═══
  // c.cam = { datei, url, name } · c.camPlatz = aus | unten | ecke | rund | geteilt · c.camBox = { x, y, s } (Rahmen: Lage, Größe) · c.camTf = { x, y, z } (Ausschnitt)
  // „Cam unten“ und „Geteilt“ sind ein eigenes Fenster unter dem Rennbild (nur „Ganzes Bild“ im Neon-Look), „Ecke“ und „Rund“ liegen im Rennbild.
  const CAM_PLAETZE = [['aus', 'Aus'], ['unten', 'Cam unten'], ['ecke', 'In der Ecke'], ['rund', 'Rund'], ['geteilt', 'Geteilt']], CAM_LUECKE = 22;
  const camStapel = c => c.look !== 'tv' && c.modus !== 'zoom';
  function camPlatz(c) {   // der Platz, der gerade wirkt
    if (!c || !c.cam || vorlage(c).mehr) return 'aus';
    const pl = CAM_PLAETZE.some(x => x[0] === c.camPlatz) ? c.camPlatz : 'aus';
    return (pl === 'unten' || pl === 'geteilt') && !camStapel(c) ? 'ecke' : pl;
  }
  const camBox = c => ({ x: 0, y: 0, s: 1, ...(c.camBox || {}) });
  const camStill = (c, qt) => Array.isArray(c.camAus) && qt != null && c.camAus.some(r => qt >= r.ab - 0.001 && qt < r.bis);   // Stelle im Clip, an der das Rennbild selbst die Cam zeigt (Toolbox: „Nur Cam“)
  const camBild = c => ({ x: 0, y: 0, z: 1, ...(c.camTf || {}) });
  function lage(c, tv) {
    const fe = c.fenster || {}, max = tv ? FENSTER_MAX.tv : FENSTER_MAX.neon, basis = tv ? 730 : 690, fw = kl(Math.round(fe.w || 1000), 360, 1040);
    let fh = kl(Math.round(fe.h || 562), 280, max), extra = 0, camW = 0, camH = 0;
    const pl = !tv && camStapel(c) ? camPlatz(c) : 'aus', s = kl(camBox(c).s, 0.6, 1.8);   // 📷 Cam unter dem Rennbild: das Rennbild wird so flach, dass beides passt
    if (pl === 'unten') { camW = Math.round(kl(fw * 0.5 * s, 260, fw) / 2) * 2; camH = Math.round(camW * 9 / 16); extra = CAM_LUECKE + camH; fh = Math.max(280, Math.min(fh, max - extra)); }
    else if (pl === 'geteilt') { fh = Math.min(fh, Math.floor((max - CAM_LUECKE) / 2)); camW = fw; camH = fh; extra = CAM_LUECKE + camH; }
    else if (pl === 'rund') { camW = camH = Math.round(kl(fw * 0.3 * s, 170, 460)); extra = Math.round(camH / 2) + 6; fh = Math.max(280, Math.min(fh, max - extra)); }
    const ges = fh + extra, hoch = tv ? 0 : Math.min(70, Math.max(0, ges - 562) / 2), fy = basis - hoch, unten = fy + ges;
    return { fx: Math.round((B - fw) / 2), fy, fw, fh, hoch, dy: unten - (basis + 562), ges, camW, camH };
  }
  function camGeo(c) {   // Bereich des Rennbilds: Fenster, ganzes Bild bei „Zoom“, Bildschirm im TV-Look
    const tv = c.look === 'tv', L = lage(c, tv);
    return !tv && c.modus === 'zoom' ? { fx: 34, fy: 690, fw: B - 68, fh: 600, L, stapel: false } : { fx: L.fx, fy: L.fy, fw: L.fw, fh: L.fh, L, stapel: !tv };
  }
  function camRahmen(c, G0) {   // wo die Cam sitzt → { x, y, w, h, rund, x0, y0 (Platz ohne Verschieben) }
    const pl = camPlatz(c); if (pl === 'aus') return null;
    const G = G0 || camGeo(c), { fx, fy, fw, fh, L } = G, b = camBox(c), s = kl(b.s, 0.6, 1.8);
    if (pl === 'unten') return { x: fx + (fw - L.camW) / 2, y: fy + fh + CAM_LUECKE, w: L.camW, h: L.camH };
    if (pl === 'geteilt') return { x: fx, y: fy + fh + CAM_LUECKE, w: fw, h: L.camH };
    if (pl === 'rund') {
      const d = G.stapel ? L.camW : Math.round(kl(fw * 0.3 * s, 170, 460)), x0 = fx + fw / 2, y0 = G.stapel ? fy + fh : fy + fh - d / 2 - 26;
      const cx = kl(x0 + b.x * fw, fx + d / 2, fx + fw - d / 2), cy = G.stapel ? y0 : kl(y0 + b.y * fh, fy + d / 2 + 8, fy + fh - d / 2 - 8);
      return { x: cx - d / 2, y: cy - d / 2, w: d, h: d, rund: true, x0: x0 - d / 2, y0: y0 - d / 2 };
    }
    const w = Math.round(kl(fw * 0.34 * s, 180, fw * 0.7)), h = Math.round(w * 3 / 4), x0 = fx + fw - w - 22, y0 = fy + fh - h - 22;
    return { x: kl(x0 + b.x * fw, fx + 8, fx + fw - w - 8), y: kl(y0 + b.y * fh, fy + 8, fy + fh - h - 8), w, h, x0, y0 };
  }
  function camZeichnen(g, t, c, cam, f, G, stil) {   // Cam in ihrem Rahmen (Neon in der Farbe der Vorlage), ploppt am Anfang auf
    const r = camRahmen(c, G); if (!r) return;
    const q = fp(t, 0.3, 0.6); if (q <= 0) return;
    const k = eob(q), mx = r.x + r.w / 2, my = r.y + r.h / 2, weg = () => { if (r.rund) { g.beginPath(); g.arc(mx, my, r.w / 2, 0, Math.PI * 2); } else rr(g, r.x, r.y, r.w, r.h, 14); };
    g.save(); g.translate(mx, my); g.scale(k, k); g.translate(-mx, -my);
    g.save(); weg(); g.clip(); g.fillStyle = '#000'; g.fillRect(r.x, r.y, r.w, r.h);
    if (cam) { const tf = camBild(c); quellBild(g, cam, r.x, r.y, r.w, r.h, 1, 0, { ...tf, z: Math.max(1, tf.z) }); }
    g.restore();
    if (stil === 'comic') { weg(); g.lineWidth = 14; g.strokeStyle = '#000'; g.stroke(); weg(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke(); }
    else if (stil === 'clean') { weg(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); }
    else {
      weg(); g.lineWidth = stil === 'tv' ? 10 : 9; g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
      g.save(); weg(); g.lineWidth = 5; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 26; g.stroke(); g.restore();
      weg(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
    }
    g.restore();
  }
  const markeY = (y, dy) => (y + dy <= 1600 ? y + dy : null);   // Logo unten nur, wenn noch Platz ist
  function ecken(g, x, y, w, h, farbe, l) {   // Neon-Ecken (HUD)
    g.save(); g.lineCap = 'square'; g.strokeStyle = farbe; g.lineWidth = 9; g.shadowColor = farbe; g.shadowBlur = 26;
    const e = (ax, ay, dx, dy) => { g.beginPath(); g.moveTo(ax + dx * l, ay); g.lineTo(ax, ay); g.lineTo(ax, ay + dy * l); g.stroke(); };
    for (let i = 0; i < 2; i++) { e(x, y, 1, 1); e(x + w, y, -1, 1); e(x, y + h, 1, -1); e(x + w, y + h, -1, -1); }
    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.5; e(x, y, 1, 1); e(x + w, y, -1, 1); e(x, y + h, 1, -1); e(x + w, y + h, -1, -1);
    g.restore();
  }
  function pille(g, text, x, y, farbe, px, voll) {   // kleines schräges Schild
    g.save(); RU(g, px); const w = g.measureText(text).width + px * 1.4, h = px * 1.6, s = h * 0.35;
    g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath();
    g.shadowColor = farbe; g.shadowBlur = 18;
    if (voll) { g.fillStyle = farbe; g.fill(); g.shadowBlur = 0; g.fillStyle = '#06080a'; } else { g.fillStyle = 'rgba(6,8,10,.85)'; g.fill(); g.strokeStyle = farbe; g.lineWidth = 3; g.stroke(); g.shadowBlur = 0; g.fillStyle = '#fff'; }
    g.fillText(text, x + s * 0.5 + px * 0.7, y + h / 2 + px * 0.36);
    g.restore(); return w + s;
  }
  function uhr(sek) { const m = Math.floor(sek / 60), s = sek - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; }
  function schuetteln(dt) { if (dt < 0 || dt > 0.45) return [0, 0]; const k = (1 - dt / 0.45) * 22; return [Math.sin(dt * 90) * k, Math.cos(dt * 70) * k * 0.6]; }
  function chevrons(g, x, y, t, farbe) {   // springende Pfeile nach unten (zu den Kommentaren)
    g.save(); g.strokeStyle = farbe; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = farbe; g.shadowBlur = 16;
    for (let i = 0; i < 2; i++) { const yy = y + i * 20 + Math.abs(Math.sin(t * 4)) * 10; g.globalAlpha = i ? 0.55 : 1; g.beginPath(); g.moveTo(x - 18, yy); g.lineTo(x, yy + 16); g.lineTo(x + 18, yy); g.stroke(); }
    g.restore();
  }

  // Countdown 3-2-1: beim Anhalten (Was passiert jetzt?) und vor der Auflösung (Welche Strecke?)
  function countdownStart(v, p) {
    if (v.pause) return p.h + 0.15;
    if (v.countdown) return (p.R ? p.D + p.R : p.D) - 2.4 - 1.5;
    return null;
  }
  function countdown(g, t, v, p, f, x, y, tv) {
    const s0 = countdownStart(v, p); if (s0 == null) return;
    const lang = v.pause ? 0.7 : 0.5, i = Math.floor((t - s0) / lang);
    if (t < s0 || i > 2) return;
    const q = ((t - s0) % lang) / lang, k = 1.25 - 0.25 * eob(Math.min(1, q * 2.2)), zahl = String(3 - i);
    g.save(); g.translate(x, y); g.scale(k, k); g.globalAlpha = q > 0.85 ? (1 - q) / 0.15 : 1;
    g.strokeStyle = f; g.lineWidth = 10; g.shadowColor = f; g.shadowBlur = 30;
    g.beginPath(); g.arc(0, 0, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - q)); g.stroke();
    if (tv) { OR(g, 200); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowBlur = 20; g.fillText(zahl, 0, 72); }
    else { const ch = chrom(zahl, 260, f, 400); g.shadowBlur = 0; g.drawImage(ch.c, -ch.mitte, -ch.base + 92); }
    g.restore();
  }
  const angehalten = (v, p, t) => p.FD > 0 && t >= p.h && t < p.h + p.FD;
  // Regen über das Bild (schräge Striche) + Blitz am Anfang und in der Mitte
  function regen(g, t, p) {
    const r = zufallR(42);
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x0 = r() * (B + 400) - 100, v = 1700 + r() * 1000, len = 40 + r() * 80, ph = r() * (H + 300), dick = r() < 0.25 ? 3.2 : 2;
      const y = ((t * v + ph) % (H + 300)) - 150, x = x0 - (y + 150) * 0.22;
      g.strokeStyle = `rgba(210,230,255,${0.28 + r() * 0.36})`; g.lineWidth = dick;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - len * 0.22, y + len); g.stroke();
    }
    g.restore();
    for (const z of [0.45, p.D * 0.55]) { const d = t - z; if (d >= 0 && d < 0.32) { const a = d < 0.06 ? 0.55 : d < 0.12 ? 0.1 : d < 0.18 ? 0.4 : 0.4 * (1 - (d - 0.18) / 0.14); g.fillStyle = `rgba(220,235,255,${Math.max(0, a)})`; g.fillRect(0, 0, B, H); } }
  }
  // Großer Wert am Ende (Rundenzeit, Abstand): am Ende der Zeitlupe, ohne Zeitlupe am Ende des Clips
  function ergebnis(v, c, p, t) {
    let e = null;
    if (v.ergebnisVon) e = v.ergebnisVon(c);
    else if (v.zeigen) { const roh = String(c[v.zeigen] || '').trim(); if (roh) e = { wert: v.gross ? GROSS(roh) : roh, label: v.zeigenLabel || '', info: GROSS(v.info ? v.info(c) : '') }; }
    if (!e) return null;
    const a = p.L != null ? p.L + (v.zielflagge ? 0.35 : 0) : (p.R ? p.D + p.R : p.D) - 2.4;
    if (t < a) return null;
    return { q: fp(t, a, a + 0.3), ...e };
  }
  // Stempel (CRASH, FAIL) in der Zeitlupe
  function stempel(g, t, p, v, f, x, y) {
    const s2 = fp(t, p.D + 0.05, p.D + 0.3);
    if (!v.stempel || s2 <= 0) return;
    g.save(); g.translate(x, y); g.rotate(-0.18); const k = 1 + (1 - eo(s2)) * 1.6; g.scale(k, k); g.globalAlpha = 0.92 * Math.min(1, s2 * 1.6);
    RU(g, 150); const w = g.measureText(v.stempel).width + 80; g.strokeStyle = f; g.lineWidth = 12; g.shadowColor = f; g.shadowBlur = 30; rr(g, -w / 2, -125, w, 175, 18); g.stroke();
    g.fillStyle = f; g.textAlign = 'center'; g.fillText(v.stempel, 0, 12); g.restore();
  }
  // Lichtreflex, der über die Chrom-Schrift wischt (q: 0…1)
  let GLANZ = null;
  function glanz(g, ch, x, y, q, staerke) {
    if (!GLANZ || GLANZ.width < ch.w || GLANZ.height < ch.h) GLANZ = leinwand(Math.max(ch.w, GLANZ ? GLANZ.width : 0), Math.max(ch.h, GLANZ ? GLANZ.height : 0));
    const k = GLANZ.getContext('2d'); k.clearRect(0, 0, GLANZ.width, GLANZ.height);
    k.globalCompositeOperation = 'source-over'; k.drawImage(ch.gesicht || ch.c, 0, 0);
    k.globalCompositeOperation = 'source-in';
    const bx = -ch.h * 0.5 + (ch.w + ch.h * 0.5) * q, gr = k.createLinearGradient(bx, 0, bx + ch.h * 0.38, ch.h * 0.25);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    k.fillStyle = gr; k.fillRect(0, 0, ch.w, ch.h);
    k.globalCompositeOperation = 'source-over';
    g.save(); g.globalAlpha = staerke || 0.75; g.drawImage(GLANZ, 0, 0, ch.w, ch.h, x, y, ch.w, ch.h); g.restore();
  }
  // Neonröhre geht an: kurzes Flackern am Anfang
  const flackern = t => (t < 0.1 ? 0 : t < 0.18 ? 1 : t < 0.24 ? 0.2 : t < 0.36 ? 1 : t < 0.4 ? 0.35 : 1);

  // Spruch oben: knallt rein mit Glitch, pulsiert danach leicht (o: { y1, y2, px1, px2 } für andere Plätze/Größen)
  function spruchZeichnen(g, t, text, f, o) {
    o = o || {};
    const zeilen = zweiZeilen(GROSS(text)), px = zeilen.length > 1 ? (o.px2 || 150) : (o.px1 || 175);
    zeilen.forEach((z, i) => {
      const t0 = 0.12 + i * 0.16, q = fp(t, t0, t0 + 0.32); if (q <= 0) return;
      const ch = chrom(z, px, f, 990), s = 1 + 0.9 * (1 - eob(q)) + 0.012 * Math.max(0, Math.sin((t - t0) * Math.PI * 2)), cy = (zeilen.length > 1 ? (o.y2 || 428) : (o.y1 || 476)) + i * (px * 0.98);
      g.save(); g.translate(B / 2, cy); g.scale(s, s); g.globalAlpha = Math.min(1, q * 2.5);
      if (t - t0 < 0.42) {   // Glitch: versetzte Streifen und Farbgeister
        const r = zufallR(Math.floor(t * 30) + i * 7), n = 7, sh = ch.h / n;
        for (let k = 0; k < n; k++) g.drawImage(ch.c, 0, k * sh, ch.w, sh, -ch.mitte + (r() - 0.5) * 70 * (1 - q), -ch.base + k * sh, ch.w, sh);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * (1 - q);
        g.drawImage(ch.c, -ch.mitte - 18, -ch.base); g.drawImage(ch.c, -ch.mitte + 18, -ch.base);
      } else {
        g.drawImage(ch.c, -ch.mitte, -ch.base);
        const gq = ((t - 1 - i * 0.12) % 3.2) / 0.75;
        if (t > 1 + i * 0.12 && gq <= 1) glanz(g, ch, -ch.mitte, -ch.base, gq);
      }
      g.restore();
    });
  }
  // ═══ Bausteine für Multiclass · Action · Trends ═══
  function pillenBreite(g, text, px) { g.save(); RU(g, px); const w = g.measureText(text).width + px * 1.4; g.restore(); return w + px * 1.6 * 0.35; }
  const KLASSEN_FARBEN = { GTP: '#ff2d6f', HYPERCAR: '#ff2d6f', LMDH: '#ff2d6f', LMH: '#ff2d6f', LMP1: '#ff2d6f', DPI: '#ff2d6f', LMP2: '#2f8bff', P2: '#2f8bff', LMP3: '#b44dff', P3: '#b44dff',
    GT3: '#ff7a00', GTD: '#ff7a00', GTE: '#ffd400', GTLM: '#ffd400', GT4: '#5cff1f', TCR: '#18e8ff', CUP: '#ff4fd8', MX5: '#00ffa3', GT2: '#ff9f1c' };
  function klasseFarbe(k) {
    const n = GROSS(k).replace(/[^A-Z0-9]/g, '');
    if (!n) return '#ffffff';
    if (KLASSEN_FARBEN[n]) return KLASSEN_FARBEN[n];
    for (const key of Object.keys(KLASSEN_FARBEN)) if (n.includes(key)) return KLASSEN_FARBEN[key];
    let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return FARBEN[h % FARBEN.length];
  }
  const klasseA = c => GROSS(String(c.klasseA || '').trim() || 'LMP2'), klasseB = c => GROSS(String(c.klasseB || '').trim() || 'GT3');
  // Klassen-Duell: zwei Klassen-Schilder über dem Clip, „VS“ dazwischen
  function klassenSchilder(g, t, c, y) {
    const A = klasseA(c), Bk = klasseB(c), px = 34, wa = pillenBreite(g, A, px), wb = pillenBreite(g, Bk, px), vs = 96, x0 = B / 2 - (wa + vs + wb) / 2;
    const qa = eo(fp(t, 0.25, 0.55)), qb = eo(fp(t, 0.35, 0.65)), qv = eob(fp(t, 0.5, 0.8));
    if (qa > 0) { g.save(); g.globalAlpha = qa; g.translate(-(1 - qa) * 400, 0); pille(g, A, x0, y, klasseFarbe(A), px, true); g.restore(); }
    if (qb > 0) { g.save(); g.globalAlpha = qb; g.translate((1 - qb) * 400, 0); pille(g, Bk, x0 + wa + vs, y, klasseFarbe(Bk), px, true); g.restore(); }
    if (qv > 0) { g.save(); g.translate(x0 + wa + vs / 2 + 8, y + px * 0.8); g.scale(qv, qv); RU(g, 42); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 16; g.fillText('VS', 0, 15); g.restore(); }
  }
  // Klassen-Duell: Abstimmung A oder B (statt Band unter dem Clip), leuchtet abwechselnd
  function abstimmung(g, t, c, f, y) {
    const q = eo(fp(t, 0.9, 1.3)); if (q <= 0) return;
    const A = klasseA(c), Bk = klasseB(c), w = 470, h = 116, xa = B / 2 - 20 - w, xb = B / 2 + 20, s = 28;
    const kasten = (x, buch, name, fk, dx, ph) => {
      g.save(); g.translate(dx, 0);
      g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w, y); g.lineTo(x + w - s, y + h); g.lineTo(x, y + h); g.closePath();
      g.fillStyle = 'rgba(6,8,10,.9)'; g.fill(); g.lineWidth = 4; g.strokeStyle = fk; g.shadowColor = fk; g.shadowBlur = 12 + 26 * ph; g.stroke(); g.shadowBlur = 0;
      g.beginPath(); g.moveTo(x + s + 12, y + 12); g.lineTo(x + s + 104, y + 12); g.lineTo(x + 104 + 4, y + h - 12); g.lineTo(x + 16, y + h - 12); g.closePath(); g.fillStyle = fk; g.fill();
      RU(g, 66); g.textAlign = 'center'; g.fillStyle = '#06080a'; g.fillText(buch, x + s / 2 + 62, y + h / 2 + 24);
      g.textAlign = 'left'; RU(g, passt(g, name, w - 180, 56, RU)); g.fillStyle = '#fff'; g.shadowColor = fk; g.shadowBlur = 12 * ph; g.fillText(name, x + 146, y + h / 2 + 20);
      g.restore();
    };
    const ph = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);   // A und B leuchten abwechselnd
    kasten(xa, 'A', A, klasseFarbe(A), -(1 - q) * 640, ph);
    kasten(xb, 'B', Bk, klasseFarbe(Bk), (1 - q) * 640, 1 - ph);
    const qv = eob(fp(t, 1.15, 1.45));
    if (qv > 0) {
      g.save(); g.translate(B / 2, y + h / 2); g.scale(qv, qv);
      g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.fillStyle = '#05070a'; g.fill(); g.lineWidth = 5; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 22; g.stroke();
      RU(g, 38); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowBlur = 10; g.fillText('VS', 0, 14); g.restore();
    }
  }
  // Lights Out: fünf Ampel-Säulen, je zwei rote Lampen; gehen nacheinander an, dann alle aus
  function ampelZeichnen(g, t, p, cx, cy, breite) {
    if (t >= p.FD + 0.4) return;
    const aus = t >= p.FD, weg = eo(fp(t, p.FD + 0.05, p.FD + 0.4)), ein = eob(fp(t, 0.05, 0.35));
    const n = 5, gap = 22, pw = Math.min(160, (breite - gap * 4) / 5), ph = pw * 1.62, gw = pw * n + gap * (n - 1), x0 = cx - gw / 2, y0 = cy - ph / 2 + 18;
    const an = aus ? 0 : AMPEL_AN.filter(z => t >= z).length;
    if (an) licht(g, cx, cy, 760, '#ff1a1a', 0.07 * an);
    g.save(); g.globalAlpha = 1 - weg; g.translate(0, -weg * 160 - (1 - ein) * 260);
    g.fillStyle = '#0b0d10'; rr(g, x0 - 34, y0 - 56, gw + 68, 38, 8); g.fill(); g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (pw + gap), lit = i < an, blitz = lit ? fp(t, AMPEL_AN[i], AMPEL_AN[i] + 0.1) : 1;
      g.fillStyle = '#2a2e35'; g.fillRect(x + pw / 2 - 6, y0 - 20, 12, 22);
      const gr = g.createLinearGradient(x, 0, x + pw, 0); gr.addColorStop(0, '#121418'); gr.addColorStop(0.5, '#262a31'); gr.addColorStop(1, '#0e1013');
      g.fillStyle = gr; rr(g, x, y0, pw, ph, 18); g.fill(); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2; g.stroke();
      for (let k = 0; k < 2; k++) {
        const lx = x + pw / 2, ly = y0 + ph * (k ? 0.73 : 0.27), r = pw * 0.36;
        g.beginPath(); g.arc(lx, ly, r, 0, Math.PI * 2); g.fillStyle = '#050607'; g.fill();
        if (lit) {
          g.save(); g.shadowColor = '#ff1a1a'; g.shadowBlur = 70;
          const rg = g.createRadialGradient(lx - r * 0.28, ly - r * 0.28, r * 0.08, lx, ly, r); rg.addColorStop(0, '#fff1ec'); rg.addColorStop(0.3, '#ff4a35'); rg.addColorStop(1, '#a80000');
          g.fillStyle = rg; g.beginPath(); g.arc(lx, ly, r * 0.9, 0, Math.PI * 2); g.fill(); g.restore();
          if (blitz < 1) { g.fillStyle = `rgba(255,255,255,${0.7 * (1 - blitz)})`; g.beginPath(); g.arc(lx, ly, r * 1.05, 0, Math.PI * 2); g.fill(); }
        } else {
          const rg = g.createRadialGradient(lx - r * 0.3, ly - r * 0.3, r * 0.05, lx, ly, r); rg.addColorStop(0, '#3b2424'); rg.addColorStop(1, '#130909');
          g.fillStyle = rg; g.beginPath(); g.arc(lx, ly, r * 0.9, 0, Math.PI * 2); g.fill();
        }
      }
    }
    g.restore();
  }
  function lichterAus(g, t, p, f, cx, cy) {   // „LIGHTS OUT!“ knallt rein, wenn die Lampen ausgehen
    const d = t - p.FD; if (d < 0 || d > 1.6) return;
    const q = eob(fp(d, 0, 0.28)), aus = fp(d, 1.2, 1.6), ch = chrom('LIGHTS OUT!', 150, f, 960);
    g.save(); g.globalAlpha = (1 - aus) * Math.min(1, d * 8); g.translate(cx, cy); const s = (1.7 - 0.7 * q) * (1 + 0.2 * aus); g.scale(s, s);
    g.drawImage(ch.c, -ch.mitte, -ch.base + 45);
    if (d > 0.3 && d < 1.05) glanz(g, ch, -ch.mitte, -ch.base + 45, (d - 0.3) / 0.75, 0.85);
    g.restore();
  }
  // Fläche, in der der Clip gezeichnet wird (Rahmen oder ganzes Bild bei „Zoom“) – für Analyse-Kreis und Tippen in die Vorschau
  // 📐 Hochkant-Lage aus der Toolbox (NEU 21.11.2026): c.hochkant = [{ ab, bis, x, y, z }], je Stück der Szene eine Lage.
  // In der Toolbox (Reiter „Schnitt“) stellt man am Rahmen ein, welcher Teil des Bildes hochkant zu sehen ist. Bei „▯ Zoom“ sitzt das Bild
  // hier genau so. Was man im Editor noch verschiebt oder vergrößert (c.bild), kommt obendrauf.
  function zoomTf(c, vid, qt, zoom) {
    const teile = c.hochkant, eigen = c.bild;
    if (!Array.isArray(teile) || !teile.length || qt == null) return eigen;
    const k = teile.find(x => qt >= x.ab - 0.001 && qt < x.bis) || teile[teile.length - 1];
    const vw = (vid && (vid.videoWidth || vid.displayWidth)) || 1920, vh = (vid && (vid.videoHeight || vid.displayHeight)) || 1080;
    const f = Math.max(B / vw, H / vh) * kl(+k.z || 1, 1, 3), sw = B / f, sh = H / f;   // sichtbarer Teil in Bildpunkten der Szene, wie in der Toolbox
    const mx = ((vw - sw) / 2 * (1 + kl(+k.x || 0, -1, 1)) + sw / 2) / vw, my = ((vh - sh) / 2 * (1 + kl(+k.y || 0, -1, 1)) + sh / 2) / vh;   // seine Mitte (0 … 1)
    const w = B + 80, h = H + 80, s0 = Math.max(w / vw, h / vh), z = f / s0, zm = zoom || 1, ez = eigen ? kl(eigen.z || 1, 0.3, 5) : 1;
    return { z: z * ez, x: (0.5 - mx) * vw * s0 * zm * z * ez / w + ((eigen && eigen.x) || 0), y: (0.5 - my) * vh * s0 * zm * z * ez / h + ((eigen && eigen.y) || 0) };
  }
  function flaeche(c, p, t, vid) {
    if (c.modus === 'zoom' && c.look !== 'tv') { const zoom = 1.02 + 0.03 * fp(t, 0, p.D); return { x: -40, y: -40, w: B + 80, h: H + 80, zoom, versatz: c.versatz || 0, tf: zoomTf(c, vid, p.quelle ? p.quelle(t) : null, zoom), kx: 0, ky: 0, kw: B, kh: H }; }
    const L = lage(c, c.look === 'tv');
    return { x: L.fx, y: L.fy, w: L.fw, h: L.fh, zoom: 1, versatz: 0, tf: c.bild, kx: L.fx, ky: L.fy, kw: L.fw, kh: L.fh };
  }
  const zielVon = c => { const z = c.ziel || {}; return { u: kl(z.u != null ? z.u : 0.5, 0.03, 0.97), v: kl(z.v != null ? z.v : 0.55, 0.03, 0.97) }; };
  function analyseZiel(c, vid, R) { const z = zielVon(c), r = bildRechteck(vid, R.x, R.y, R.w, R.h, R.zoom, R.versatz, R.tf); return { x: r.x + z.u * r.w, y: r.y + z.v * r.h, r }; }
  // Replay-Analyse im Standbild: heranzoomen auf die Stelle, Rest abdunkeln
  function analyseBild(g, t, c, p, vid, R) {
    const d = t - p.h, ein = eo(fp(d, 0, 0.4)), aus = eo(fp(d, p.FD - 0.4, p.FD)), k = 1 + 0.4 * ein * (1 - aus), z = analyseZiel(c, vid, R), a = ein * (1 - aus);
    g.save(); g.translate(z.x, z.y); g.scale(k, k); g.translate(-z.x, -z.y); g.drawImage(vid, z.r.x, z.r.y, z.r.w, z.r.h); g.restore();
    if (a <= 0) return;
    const sp = g.createRadialGradient(z.x, z.y, 120, z.x, z.y, 300); sp.addColorStop(0, 'rgba(0,0,0,0)'); sp.addColorStop(1, `rgba(0,0,0,${0.66 * a})`);
    g.fillStyle = sp; g.fillRect(R.kx, R.ky, R.kw, R.kh);
    g.fillStyle = `rgba(0,0,0,${0.12 * a})`; for (let yy = R.ky; yy < R.ky + R.kh; yy += 6) g.fillRect(R.kx, yy, R.kw, 2);
  }
  // Replay-Analyse: Kreis wie mit dem Stift gezogen, Pfeil, Erklärung
  function analyseOben(g, t, c, p, vid, R, f) {
    const d = t - p.h, a = 1 - fp(d, p.FD - 0.35, p.FD); if (a <= 0) return;
    const z = analyseZiel(c, vid, R), rx = 150, ry = 112;
    g.save(); g.globalAlpha = a; g.lineCap = 'round'; g.lineJoin = 'round';
    const q = eo(fp(d, 0.3, 0.85));
    if (q > 0) {
      const a0 = -2.3, a1 = a0 + Math.PI * 2 * 1.1 * q;
      g.beginPath();
      for (let w = a0, i = 0; w <= a1 + 0.001; w += 0.05, i++) { const wob = 1 + 0.035 * Math.sin(w * 3 + 1) + (w - a0) * 0.012, xx = z.x + Math.cos(w) * rx * wob, yy = z.y + Math.sin(w) * ry * wob; if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
      g.strokeStyle = f; g.lineWidth = 11; g.shadowColor = f; g.shadowBlur = 26; g.stroke();
      g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3.5; g.stroke();
    }
    const text = GROSS(String(c.analyseText || '').trim() || 'HIER PASSIERT’S'), qt = eob(fp(d, 0.75, 1.05));
    if (qt > 0) {
      const px = passt(g, text, R.kw - 140, 52, SAx(900), 26); SA(g, px, 900);
      const bw = Math.min(R.kw - 48, g.measureText(text).width + 76), bh = px + 76, oben = z.y > R.ky + R.kh * 0.5;
      const y0 = R.kh > 1000 ? 640 : R.ky, y1 = R.kh > 1000 ? 1280 : R.ky + R.kh;   // bei „Zoom“ nicht unter Spruch oder Band
      const by = kl(oben ? z.y - ry - 40 - bh : z.y + ry + 40, y0 + 24, y1 - 24 - bh), bx = kl(z.x - bw / 2, R.kx + 24, R.kx + R.kw - 24 - bw);
      const ax = kl(z.x, bx + 50, bx + bw - 50), ay = oben ? by + bh : by, dx = z.x - ax, dy = z.y - ay, L = Math.hypot(dx, dy) || 1, rand = Math.min(rx, ry) + 16;
      const qp = eo(fp(d, 0.95, 1.25));
      if (qp > 0 && L > rand + 24) {   // Pfeil vom Kasten zum Kreis
        const ex = z.x - dx / L * rand, ey = z.y - dy / L * rand, px2 = ax + (ex - ax) * qp, py2 = ay + (ey - ay) * qp, w = Math.atan2(ey - ay, ex - ax);
        g.save(); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 7; g.shadowColor = f; g.shadowBlur = 16;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(px2, py2); g.stroke();
        if (qp > 0.9) { g.beginPath(); g.moveTo(px2 + Math.cos(w) * 8, py2 + Math.sin(w) * 8); g.lineTo(px2 + Math.cos(w + 2.5) * 30, py2 + Math.sin(w + 2.5) * 30); g.lineTo(px2 + Math.cos(w - 2.5) * 30, py2 + Math.sin(w - 2.5) * 30); g.closePath(); g.fill(); }
        g.restore();
      }
      g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(qt, qt); g.translate(-(bx + bw / 2), -(by + bh / 2));
      rr(g, bx, by, bw, bh, 12); g.fillStyle = 'rgba(5,7,10,.92)'; g.fill(); g.lineWidth = 4; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 20; g.stroke(); g.shadowBlur = 0;
      g.fillStyle = f; g.fillRect(bx, by + 14, 8, bh - 28);
      SA(g, 26, 900); g.fillStyle = f; g.fillText('ANALYSE', bx + 32, by + 38);
      SA(g, px, 900); g.fillStyle = '#fff'; g.fillText(text, bx + 32, by + 46 + px * 0.86);
      g.restore();
    }
    g.restore();
  }
  // Großes Chrom-Ergebnis über dem Standbild am Ende (Anzahl Autos, +X Plätze, Rundenzeit)
  function schlussBild(g, t, t0, fx, fy, fw, fh, f, gross, unter, info) {
    const q = fp(t, t0, t0 + 0.35); if (q <= 0) return;
    g.save(); rr(g, fx, fy, fw, fh, 14); g.clip(); g.fillStyle = `rgba(3,4,7,${0.62 * q})`; g.fillRect(fx, fy, fw, fh); licht(g, fx + fw / 2, fy + fh / 2, 520, f, 0.25 * q); g.restore();
    const ch = chrom(gross, 210, f, 880), cy = fy + fh / 2 + (unter ? 10 : 50), k = 0.6 + 0.4 * eob(q);
    g.save(); g.globalAlpha *= Math.min(1, q * 2); g.translate(B / 2, cy); g.scale(k, k); g.drawImage(ch.c, -ch.mitte, -ch.base);
    const gq = (t - t0 - 0.45) / 0.7; if (gq >= 0 && gq <= 1) glanz(g, ch, -ch.mitte, -ch.base, gq, 0.85);
    g.restore();
    const q2 = eo(fp(t, t0 + 0.25, t0 + 0.55));
    if (unter && q2 > 0) { g.save(); g.globalAlpha *= q2; SA(g, passt(g, unter, fw - 80, 66, SAx(900)), 900); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = f; g.shadowBlur = 18; g.fillText(unter, B / 2, cy + 104 - (1 - q2) * 20); g.restore(); }
    if (info && q2 > 0) { g.save(); g.globalAlpha *= q2; OR(g, passt(g, info, fw - 120, 46, OR)); g.textAlign = 'center'; g.fillStyle = hexA(f, 1); g.shadowColor = '#000'; g.shadowBlur = 10; g.fillText(info, B / 2, cy + 172); g.restore(); }
  }
  // Wehende Flagge: grün beim Rennstart, kariert im Ziel (Stoff mit Welle, Licht und Schatten)
  function flaggeZeichnen(g, x, y, w, h, t, art, a) {
    if (a <= 0) return;
    const n = 28, ph = u => t * 9 - u * 6.5;
    const welle = (u, v) => { const k = ph(u), amp = h * (0.05 + 0.15 * u); return [x + u * w - Math.abs(Math.sin(k)) * w * 0.035 * u, y + v * h + Math.sin(k) * amp + (v - 0.5) * Math.cos(k) * h * 0.08 * u]; };
    const viereck = (u0, v0, u1, v1) => { const [x1, y1] = welle(u0, v0), [x2, y2] = welle(u1, v0), [x3, y3] = welle(u1, v1), [x4, y4] = welle(u0, v1); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.lineTo(x4, y4); g.closePath(); };
    const umriss = () => { g.beginPath(); for (let i = 0; i <= n; i++) { const [xx, yy] = welle(i / n, 0); if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); } for (let i = n; i >= 0; i--) { const [xx, yy] = welle(i / n, 1); g.lineTo(xx, yy); } g.closePath(); };
    g.save(); g.globalAlpha *= a;
    const st = g.createLinearGradient(x - 14, 0, x, 0); st.addColorStop(0, '#8a929c'); st.addColorStop(0.5, '#f2f5f8'); st.addColorStop(1, '#9aa3ad');   // Stab
    g.fillStyle = st; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 12; g.fillRect(x - 14, y - 10, 12, h * 2.1); g.shadowBlur = 0;
    g.fillStyle = '#e8edf2'; g.beginPath(); g.arc(x - 8, y - 12, 9, 0, Math.PI * 2); g.fill();
    umriss();
    if (art === 'kariert') {
      g.fillStyle = '#f6f8fa'; g.shadowColor = 'rgba(255,255,255,.6)'; g.shadowBlur = 30; g.fill(); g.shadowBlur = 0;
      const nx = 8, ny = 6; g.fillStyle = '#0a0c0f';
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i + j) % 2) { viereck(i / nx, j / ny, (i + 1) / nx, (j + 1) / ny); g.fill(); }
    } else {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3dff6e'); gr.addColorStop(0.55, '#12c93f'); gr.addColorStop(1, '#0a9a2e');
      g.fillStyle = gr; g.shadowColor = '#27f25a'; g.shadowBlur = 40; g.fill(); g.shadowBlur = 0;
    }
    const sg = g.createLinearGradient(x, 0, x + w, 0);   // Licht auf den Wellenbergen, Schatten in den Tälern (ein Verlauf, ohne Streifen)
    for (let i = 0; i <= 24; i++) { const u = i / 24, s0 = Math.cos(ph(u)), k = 0.35 + 0.65 * u; sg.addColorStop(u, s0 > 0 ? `rgba(255,255,255,${0.32 * s0 * k})` : `rgba(0,0,0,${-0.5 * s0 * k})`); }
    umriss(); g.fillStyle = sg; g.fill();
    umriss(); g.lineWidth = 2; g.strokeStyle = art === 'kariert' ? 'rgba(255,255,255,.5)' : 'rgba(180,255,200,.55)'; g.stroke();
    g.restore();
  }
  function stoppuhr(g, x, y, r, farbe) {
    g.save(); g.strokeStyle = farbe; g.fillStyle = farbe; g.lineWidth = r * 0.2; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    g.fillRect(x - r * 0.24, y - r * 1.55, r * 0.48, r * 0.34);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * 0.42, y - r * 0.5); g.stroke();
    g.restore();
  }
  // Bestzeit im Rennen: Rundenzeit läuft oben links mit und wird an der Ziellinie lila, dann „Schnellste Runde“ unten im Clip
  function bestzeitZeichnen(g, t, c, p, m, f, fx, fy, fw, fh) {
    const lila = '#b84dff', hell = '#ead6ff', lap = zeitLesen(c.rundenzeit), src = p.quelle(t), da = p.L != null && t >= p.L, d = da ? t - p.L : 0;
    const wert = da || src == null ? (lap != null ? lap : (p.lin || p.b) - p.a) : lap != null ? Math.max(0, lap - (p.lin - src)) : Math.max(0, src - p.a);
    const w = Math.min(380, fw - 44), h = 132, x = fx + 22, y = fy + 22, fl = da ? 1 - fp(d, 0, 0.7) : 0;
    g.save(); rr(g, x, y, w, h, 12); g.fillStyle = da ? 'rgba(46,10,80,.92)' : 'rgba(5,7,10,.84)'; g.fill();
    g.lineWidth = 3; g.strokeStyle = da ? lila : 'rgba(255,255,255,.25)'; g.shadowColor = lila; g.shadowBlur = da ? 18 + 34 * fl : 0; g.stroke(); g.shadowBlur = 0;
    if (fl > 0) { g.fillStyle = hexA(lila, 0.5 * fl); g.fill(); }
    SA(g, 28, 700); g.fillStyle = da ? hell : hexA(f, 1); g.fillText(nr(c.runde) ? 'RUNDE ' + nr(c.runde) : 'RUNDENZEIT', x + 24, y + 42);
    stoppuhr(g, x + w - 32, y + 36, 12, da ? hell : 'rgba(255,255,255,.75)');
    const zt = zeitText(wert); OR(g, passt(g, zt, w - 48, 62, OR)); g.fillStyle = '#fff'; if (da) { g.shadowColor = lila; g.shadowBlur = 26; } g.fillText(zt, x + 24, y + 110);
    g.restore();
    if (!da) return;
    const q = eo(fp(d, 0.2, 0.6)), kw = Math.min(fw - 44, 720), kh = 140, kx = fx + fw - 22 - kw + (1 - q) * (kw + 80), ky = fy + fh - 22 - kh;
    g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip();
    const gr = g.createLinearGradient(kx, 0, kx + kw, 0); gr.addColorStop(0, '#4d0f8c'); gr.addColorStop(1, lila);
    rr(g, kx, ky, kw, kh, 14); g.fillStyle = gr; g.shadowColor = lila; g.shadowBlur = 34; g.fill(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(0,0,0,.28)'; rr(g, kx + 14, ky + 14, 112, kh - 28, 10); g.fill();
    stoppuhr(g, kx + 70, ky + kh / 2 + 9, 28, '#fff');
    SA(g, 34, 900); g.fillStyle = hell; g.fillText('SCHNELLSTE RUNDE', kx + 150, ky + 50);
    const nm = GROSS(m.name || ''); SA(g, 30, 700); const nw = g.measureText(nm).width; if (nw < kw - 520) { g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(nm, kx + kw - 24, ky + 50); g.textAlign = 'left'; }
    OR(g, passt(g, zeitText(wert), kw - 180, 60, OR)); g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 10; g.fillText(zeitText(wert), kx + 150, ky + 116);
    g.restore();
  }
  // Zieleinlauf: an der Ziellinie steht das Bild, karierte Flagge, Ergebnis groß; danach läuft der Clip weiter
  function zielZeichnen(g, t, c, p, f, fx, fy, fw, fh) {
    const d = t - p.h; if (d < 0) return;
    const aus = fp(d, p.FD - 0.05, p.FD + 0.35); if (aus >= 1) return;
    const v = vorlage(c), e = v.ergebnisVon(c);
    g.save(); g.globalAlpha *= 1 - aus;
    if (e) schlussBild(g, t, p.h + 0.3, fx, fy, fw, fh, f, e.wert, e.label, e.info);
    const qf = eo(fp(d, 0, 0.45)), fwid = Math.min(260, fw * 0.32);
    flaggeZeichnen(g, fx + 44 - (1 - qf) * (fwid + 160), fy + 30, fwid, fwid * 0.66, t, 'kariert', 1);
    g.restore();
  }
  // Fortschritt unter dem Clip mit Punkten für jede Markierung
  function fortschrittPunkte(g, t, p, f, fx, fw, py) {
    const pr = kl(t / p.lauf, 0, 1);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(fx, py, fw, 8);
    g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16; g.fillRect(fx, py, fw * pr, 8); g.restore();
    for (const x0 of p.marken) { const xx = fx + fw * x0.ot / p.lauf; g.fillStyle = t >= x0.ot ? f : 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(xx, py + 4, 8, 0, Math.PI * 2); g.fill(); }
  }
  // „+1“ springt ins Bild, daneben das Schild (Klasse, Gegner)
  function plusEins(g, d, schild, farbe, cx, cy) {
    if (d < 0 || d > 1.1) return;
    const q = eob(fp(d, 0, 0.22)), aus = fp(d, 0.75, 1.1), ch = chrom('+1', 190, farbe, 400), sw = schild ? pillenBreite(g, schild, 44) + 24 : 0, ges = ch.w * 0.62 + sw;
    g.save(); g.globalAlpha = 1 - aus; g.translate(cx, cy - 70 * eo(fp(d, 0, 1.1))); g.scale(q, q);
    g.drawImage(ch.c, -ges / 2 - ch.w * 0.19, -ch.base + 60);
    if (schild) pille(g, schild, -ges / 2 + ch.w * 0.62, -10, farbe, 44, true);
    g.restore();
  }
  function blaueFlagge(g, x, y, t, a) {   // wehende blaue Flagge (Überrundung)
    if (a <= 0) return;
    const w = 128, h = 84, n = 18, welle = (i, yy) => yy + Math.sin(t * 10 - i * 0.6) * 8 * (i / n);
    g.save(); g.globalAlpha = a;
    g.fillStyle = '#dfe4ea'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 8; g.fillRect(x, y, 7, 138); g.shadowBlur = 0;
    g.beginPath();
    for (let i = 0; i <= n; i++) { const xx = x + 7 + w * i / n, yy = welle(i, y + 4); if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
    for (let i = n; i >= 0; i--) g.lineTo(x + 7 + w * i / n, welle(i, y + 4 + h));
    g.closePath(); g.fillStyle = '#1f6bff'; g.shadowColor = '#1f6bff'; g.shadowBlur = 30; g.fill(); g.shadowBlur = 0;
    g.save(); g.clip(); g.strokeStyle = 'rgba(255,214,0,.9)'; g.lineWidth = 16; g.beginPath(); g.moveTo(x + 7, y + 4 + h + 10); g.lineTo(x + 7 + w, y - 6); g.stroke(); g.restore();
    SA(g, 30, 900); g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 10; g.fillText('BLAUE FLAGGE', x + 18, y + h + 52);
    g.restore();
  }
  function zaehlerKasten(g, x, y, w, h, label, wert, f, pop, zusatz) {   // Kasten oben rechts im Clip: Zähler / Platz
    const fl = 1 - pop;
    g.save(); rr(g, x, y, w, h, 12); g.fillStyle = 'rgba(5,7,10,.84)'; g.fill(); g.lineWidth = 3; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 14 + 30 * fl; g.stroke(); g.shadowBlur = 0;
    if (fl > 0) { g.fillStyle = hexA(f, 0.35 * fl); g.fill(); }
    SA(g, 28, 700); g.textAlign = 'center'; g.fillStyle = hexA(f, 1); g.fillText(label, x + w / 2, y + 40);
    g.beginPath(); g.rect(x, y + 46, w, h - (zusatz ? 92 : 50)); g.clip();
    const k = 1 + 0.35 * (1 - eob(pop)); g.translate(x + w / 2, y + 46 + (h - (zusatz ? 92 : 50)) / 2 + 2); g.scale(k, k);
    OR(g, passt(g, wert, w - 40, 96, OR)); g.fillStyle = '#fff'; g.shadowColor = f; g.shadowBlur = 20; g.fillText(wert, 0, 34);
    g.restore();
    if (zusatz) { g.save(); SA(g, 40, 900); g.textAlign = 'center'; g.fillStyle = zusatz.farbe; g.shadowColor = zusatz.farbe; g.shadowBlur = 14; g.fillText(zusatz.text, x + w / 2, y + h - 22); g.restore(); }
  }
  function zeichne(g, t, c, p, m, vid, cam) {   // ein Bild des Clips · das 🏁 Team-Logo liegt über allem (alle Vorlagen, Neon und TV-Sendung)
    zeichneBild(g, t, c, p, m, vid, cam);
    if (c.team) teamZeichnen(g, c.team, B, H);
  }
  function zeichneBild(g, t, c, p, m, vid, cam) {   // cam = Bild der Renn-Cam zur selben Stelle (oder nichts)
    if (p.mehr) return zeichneMehr(g, t, c, p, m, vid);
    if (c.look === 'tv') return zeichneTV(g, t, c, p, m, vid, cam);
    const v = vorlage(c), f = c.farbe || v.farbe, zoom = c.modus === 'zoom', st = stilVon(c), neon = st === 'neon';
    const outro = t >= p.T - OUTRO, rz = !outro && t >= p.D && t < p.D + p.R, imClip = !outro;
    const halt = imClip && angehalten(v, p, t), ana = halt && v.analyse && vid, R = flaeche(c, p, t, vid);
    const [sx, sy] = rz && v.stempel ? schuetteln(t - p.D) : [0, 0];
    g.save(); g.translate(sx, sy);
    // Hintergrund
    if (imClip && vid) {
      if (zoom) {
        if (ana) analyseBild(g, t, c, p, vid, R);
        else quellBild(g, vid, -40, -40, B + 80, H + 80, rz ? 1.12 : R.zoom, c.versatz, rz ? zoomTf(c, vid, p.quelle(t), 1.12) : R.tf);
        const v1 = g.createLinearGradient(0, 0, 0, 840); v1.addColorStop(0, 'rgba(3,4,6,.92)'); v1.addColorStop(0.45, 'rgba(3,4,6,.8)'); v1.addColorStop(1, 'rgba(3,4,6,0)'); g.fillStyle = v1; g.fillRect(0, 0, B, 840);
        const v2 = g.createLinearGradient(0, 1100, 0, H); v2.addColorStop(0, 'rgba(3,4,6,0)'); v2.addColorStop(0.4, 'rgba(3,4,6,.88)'); g.fillStyle = v2; g.fillRect(0, 1100, B, H - 1100);
        if (!neon) stilZoomUeber(g, st, t, f);
      } else if (neon) weichesBild(g, vid, f); else stilGrund(g, st, vid, f, t);
    } else if (neon) g.drawImage(grund(f), 0, 0); else stilGrund(g, st, null, f, t);
    if (imClip) {
      // Clip im Neon-Rahmen (oder ganzes Bild bei „Zoom“)
      const L0 = lage(c), fx = zoom ? 34 : L0.fx, fy = zoom ? 690 : L0.fy, fw = zoom ? B - 68 : L0.fw, fh = zoom ? 600 : L0.fh, dy = zoom ? 0 : L0.dy;
      const fl = flackern(t);
      if (!zoom && vid && !neon) stilFenster(g, st, t, f, fx, fy, fw, fh, rz, dx => { if (ana) analyseBild(g, t, c, p, vid, R); else quellBild(g, vid, fx + dx, fy, fw, fh, rz ? 1.15 : 1, 0, c.bild); });
      else if (!zoom && vid) {
        g.save(); rr(g, fx, fy, fw, fh, 14); g.clip();
        g.fillStyle = '#000'; g.fillRect(fx, fy, fw, fh);
        if (ana) analyseBild(g, t, c, p, vid, R); else quellBild(g, vid, fx, fy, fw, fh, rz ? 1.15 : 1, 0, c.bild);
        if (rz) { g.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = fy; yy < fy + fh; yy += 6) g.fillRect(fx, yy, fw, 2); }
        g.restore();
        g.save(); g.globalAlpha = fl; rr(g, fx, fy, fw, fh, 14); g.strokeStyle = hexA(f, 0.55); g.lineWidth = 3; g.shadowColor = f; g.shadowBlur = 22; g.stroke(); g.restore();
      }
      if (halt && !v.analyse) { g.fillStyle = v.ampel ? 'rgba(0,0,0,.55)' : v.zielflagge ? 'rgba(0,0,0,.15)' : 'rgba(0,0,0,.42)'; if (zoom) g.fillRect(0, 0, B, H); else { g.save(); rr(g, fx, fy, fw, fh, 14); g.clip(); g.fillRect(fx, fy, fw, fh); g.restore(); } }
      if (v.regen) { g.fillStyle = 'rgba(40,90,170,.14)'; g.fillRect(zoom ? 0 : fx, zoom ? 0 : fy, zoom ? B : fw, zoom ? H : fh); regen(g, t, p); }
      const camPl = camPlatz(c);
      if (neon) {
        g.save(); g.globalAlpha = fl;
        if (!zoom) ecken(g, fx - 10, fy - 10, fw + 20, (camPl === 'unten' || camPl === 'geteilt' ? L0.ges : fh) + 20, f, 74);   // Rennbild und Cam-Fenster gehören zusammen
        else ecken(g, 34, 296, B - 68, 1258, f, 90);
        g.restore();
      }
      if (camPl !== 'aus' && !camStill(c, p.quelle ? p.quelle(t) : null)) camZeichnen(g, t, c, cam, f, zoom ? { fx: 34, fy: 690, fw: B - 68, fh: 600, L: L0, stapel: false } : { fx, fy, fw, fh, L: L0, stapel: true }, st);
      const mx = B / 2, my = zoom ? 1000 : fy + fh / 2;   // Mitte des Clips
      if (v.ampel) ampelZeichnen(g, t, p, mx, my, Math.min(fw, 1000));
      if (ana) analyseOben(g, t, c, p, vid, R, f);
      if (v.gruenStart) {   // Rennstart: grüne Flagge weht am Anfang
        const a0 = fp(t, 0.15, 0.4) * (1 - fp(t, 2.6, 3.0)), fwd = Math.min(220, fw * 0.3), gx = zoom ? 60 : fx + 46, gy = (zoom ? 700 : fy) + 34;
        flaggeZeichnen(g, gx - (1 - eo(fp(t, 0.15, 0.45))) * 300, gy, fwd, fwd * 0.66, t, 'gruen', a0);
        if (a0 > 0) { g.save(); g.globalAlpha = a0; SA(g, 34, 900); g.fillStyle = '#fff'; g.shadowColor = '#27f25a'; g.shadowBlur = 18; g.fillText('GRÜNE FLAGGE', gx + fwd + 26, gy + fwd * 0.4); g.restore(); }
      }
      if (v.bestzeit) bestzeitZeichnen(g, t, c, p, m, f, zoom ? 34 : fx, zoom ? 700 : fy, zoom ? B - 68 : fw, zoom ? 540 : fh);
      if (v.zielflagge) zielZeichnen(g, t, c, p, f, zoom ? 34 : fx, zoom ? 700 : fy, zoom ? B - 68 : fw, zoom ? 540 : fh);
      // Schild oben links am Rahmen, Uhr oben rechts (Klassen-Duell: beide Klassen mittig)
      const sy0 = zoom ? 618 : fy - 66;
      if (rz) {
        pille(g, 'REPLAY 0.5×', fx + 40, sy0, '#ff2a2a', 30, false);
        if (Math.floor(t * 3) % 2 === 0) { g.save(); g.fillStyle = '#ff2a2a'; g.shadowColor = '#ff2a2a'; g.shadowBlur = 16; g.beginPath(); g.arc(fx + 18, sy0 + 24, 11, 0, Math.PI * 2); g.fill(); g.restore(); }
      }
      else if (halt && v.pause) pille(g, '❚❚ PAUSE', fx + 6, sy0, f, 30, true);
      else if (halt && v.analyse) pille(g, 'STANDBILD · ANALYSE', fx + 6, sy0, f, 30, true);
      else if (halt && v.ampel) pille(g, 'START', fx + 6, sy0, '#ff2a2a', 30, true);
      else if (halt && v.zielflagge) pille(g, 'ZIEL', fx + 6, sy0, f, 30, true);
      else if (v.klassen) klassenSchilder(g, t, c, sy0 - 6);
      else { const w0 = pille(g, tagText(v, c), fx + 6, sy0, f, 30, true); if (v.gruenStart && nr(c.startplatz)) pille(g, 'START P' + nr(c.startplatz), fx + 6 + w0 + 14, sy0, '#ffffff', 30, false); }
      if (vid && !v.klassen && fw >= 640) { g.save(); OR(g, 34); g.textAlign = 'right'; g.shadowColor = f; g.shadowBlur = 14; g.fillStyle = '#fff'; g.fillText(uhr(p.quelle(t) || 0), fx + fw - 6, sy0 + 38); g.restore(); }
      // Fortschritt
      const pr = kl(t / (p.T - OUTRO), 0, 1), py = zoom ? 1270 : fy + L0.ges + 18;
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(fx, py, fw, 8);
      g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16; g.fillRect(fx, py, fw * pr, 8); g.restore();
      (neon ? spruchZeichnen : (gg, tt, tx, ff, oo) => stilSpruch(gg, st, tt, tx, ff, oo))(g, t, c.hook || v.hooks[0], f, !zoom && L0.hoch ? { y1: 476 - L0.hoch, y2: 428 - L0.hoch } : undefined);
      // Zeitlupe: Band mit Ansage, Crash-Stempel
      if (rz) {
        const q = fp(t, p.D, p.D + 0.25), aus = fp(t, p.D + 1.6, p.D + 1.9);
        if (q > 0 && aus < 1) { const bd = band(wiederVon(c, v), f, 44); g.save(); g.globalAlpha = 1 - aus; g.translate(-(1 - eo(q)) * B, 0); g.drawImage(bd.c, B / 2 - bd.bandW / 2 - 40, (zoom ? 760 : fy + 40) - 60); g.restore(); }
        stempel(g, t, p, v, f, B / 2, zoom ? 1010 : fy + fh / 2 + 20);
      }
      countdown(g, t, v, p, f, B / 2, zoom ? 1000 : fy + fh / 2, false);
      if (v.ampel) lichterAus(g, t, p, f, mx, my);
      // Rundenzeit / Abstand groß am Ende
      const erg = v.bestzeit || v.zielflagge ? null : ergebnis(v, c, p, t);   // Bestzeit und Ziel zeigen es selbst
      if (erg) {
        const ch = chrom(erg.wert, 150, f, 900), yy = zoom ? 1160 : fy + fh - 40;
        g.save(); g.translate(B / 2, yy); const k = 0.7 + 0.3 * eob(erg.q); g.scale(k, k); g.globalAlpha = Math.min(1, erg.q * 2); g.drawImage(ch.c, -ch.mitte, -ch.base); g.restore();
        if (erg.info) { g.save(); g.globalAlpha = erg.q; SA(g, passt(g, erg.info, 900, 52, SA)); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 12; g.fillText(erg.info, B / 2, yy + 70); g.restore(); }
      }
      if (v.klassen) {   // Abstimmung A oder B, darunter die Frage
        abstimmung(g, t, c, f, 1296 + dy);
        const fq = fp(t, 1.3, 1.7);
        if (fq > 0) { const fr = frageVon(c, v); g.save(); g.globalAlpha = fq; neonText(g, fr, B / 2, 1470 + dy, passt(g, fr, 960, 52, SAx(800)), f, SAx(800), 'center', 16); g.restore(); }
        if (markeY(1550, dy) != null) marke(g, t, m, f, 1550 + dy);
      } else {
        // Frage unten als Neon-Band, Pfeile zu den Kommentaren
        const ub = fp(t, 0.9, 1.25);
        if (!neon) stilFrage(g, st, t, frageVon(c, v), f, 1310 + dy - 6);
        else if (ub > 0) {
          const bd = band(frageVon(c, v), f, 46), y = 1310 + dy;
          g.save(); g.translate(-(1 - eo(ub)) * B, 0); g.drawImage(bd.c, B / 2 - bd.bandW / 2 - 40, y - 60); g.restore();
          if (ub >= 1 && y + 120 < 1640) chevrons(g, B / 2, y + 92, t, f);
        }
        // Marke unten: Logo im Neon-Ring, Name, Folgen-Schild (wenn das Fenster sehr hoch ist, fällt sie weg)
        if (markeY(1490, dy) != null) marke(g, t, m, f, 1490 + dy);
      }
    } else outroZeichnen(g, t - (p.T - OUTRO), m, f);
    g.restore();
    // Blitze: Anfang, Zeitlupe, Abspann, Lichter aus, Standbild (Analyse)
    const blitze = [[0.12, 0.5], [p.D, p.R ? 0.6 : 0], [p.T - OUTRO, 0.75], [p.h + p.FD, v.ampel ? 0.7 : 0], [p.h, v.analyse ? 0.45 : v.zielflagge ? 0.7 : 0], [p.L || 0, v.bestzeit ? 0.35 : 0]];
    for (const [z, a] of blitze) { const d = t - z; if (a && d >= 0 && d < 0.3) { g.fillStyle = `rgba(255,255,255,${a * (1 - d / 0.3)})`; g.fillRect(0, 0, B, H); } }
  }
  // ═══ 🎨 Stile (NEU 19.11.2026): andere Darstellung bei gleicher Vorlage (nur Neon-Look, Vorlagen mit einem Clip) ═══
  // Jeder neue Clip und jede andere Vorlage bekommt von selbst einen anderen Stil (nie zweimal hintereinander derselbe).
  const STILE = [['neon', '✨ Neon'], ['kino', '🎬 Kino'], ['comic', '💥 Comic'], ['glitch', '👾 Glitch'], ['sport', '🏁 Sport'], ['clean', '◻️ Clean']];
  const STIL_IDS = STILE.map(x => x[0]);
  const stilVon = c => (c && c.look !== 'tv' && STIL_IDS.includes(c.stil) ? c.stil : 'neon');
  const stilNeu = alt => ziehen(STIL_IDS, 'stil', alt);
  const hell = h => { const n = parseInt(String(h || '#888888').slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
  // Hintergrund (ohne Clip: nur Grund)
  function stilGrund(g, st, vid, f, t) {
    if (st === 'kino') {
      g.fillStyle = '#000'; g.fillRect(0, 0, B, H);
      if (vid) { g.save(); g.globalAlpha = 0.45; unscharf(g, vid); g.restore(); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, B, H); }
      const v = g.createRadialGradient(B / 2, H * 0.48, 260, B / 2, H * 0.48, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = v; g.fillRect(0, 0, B, H);
      const r = zufallR(Math.floor(t * 24) + 3); g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 90; i++) g.fillRect(r() * B, r() * H, 1 + r() * 2, 1 + r() * 2);   // Filmkorn
      return;
    }
    if (st === 'comic') {
      g.drawImage(merk('comic' + f, () => {
        const c = leinwand(B, H), k = c.getContext('2d');
        k.fillStyle = '#111018'; k.fillRect(0, 0, B, H);
        k.save(); k.translate(B / 2, H * 0.45); for (let i = 0; i < 24; i++) { k.rotate(Math.PI / 12); k.fillStyle = i % 2 ? hexA(f, 0.16) : 'rgba(255,255,255,.03)'; k.beginPath(); k.moveTo(0, 0); k.lineTo(-170, -1500); k.lineTo(170, -1500); k.closePath(); k.fill(); } k.restore();
        k.fillStyle = hexA(f, 0.28); for (let y = 0; y < H; y += 26) for (let x = (y / 26) % 2 ? 13 : 0; x < B; x += 26) { const rad = 2 + 5 * (y / H); k.beginPath(); k.arc(x, y, rad, 0, Math.PI * 2); k.fill(); }
        return c;
      }), 0, 0);
      if (vid) { g.save(); g.globalAlpha = 0.18; unscharf(g, vid); g.restore(); }
      return;
    }
    if (st === 'glitch') {
      g.fillStyle = '#05060a'; g.fillRect(0, 0, B, H);
      if (vid) {
        g.save(); g.globalAlpha = 0.5; unscharf(g, vid); g.restore();
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18; g.translate(-14, 0); unscharf(g, vid); g.restore();
        g.fillStyle = 'rgba(5,6,10,.55)'; g.fillRect(0, 0, B, H);
      }
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 6) g.fillRect(0, y, B, 2);   // Zeilen
      const r = zufallR(Math.floor(t * 8) * 7 + 1);
      for (let i = 0; i < 4; i++) { g.fillStyle = [hexA('#00ffff', 0.08), hexA('#ff00aa', 0.08), hexA(f, 0.1)][i % 3]; g.fillRect(0, r() * H, B, 6 + r() * 40); }
      return;
    }
    if (st === 'sport') {
      g.drawImage(merk('sport' + f, () => {
        const c = leinwand(B, H), k = c.getContext('2d'), lg = k.createLinearGradient(0, 0, 0, H);
        lg.addColorStop(0, '#0b0d12'); lg.addColorStop(1, '#030405'); k.fillStyle = lg; k.fillRect(0, 0, B, H);
        k.save(); k.transform(1, 0, -0.45, 1, 0, 0);
        [[120, 120, 0.9], [300, 40, 0.5], [1500, 160, 0.85], [1720, 50, 0.45]].forEach(([x, w, a]) => { k.fillStyle = hexA(f, a * 0.45); k.fillRect(x, 0, w, H); });
        k.restore();
        const q = 34; for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) if ((x + y) % 2 === 0) { k.fillStyle = 'rgba(255,255,255,.05)'; k.fillRect(B - 9 * q + x * q, H - 5 * q + y * q, q, q); }   // Zielflagge unten rechts
        return c;
      }), 0, 0);
      if (vid) { g.save(); g.globalAlpha = 0.22; unscharf(g, vid); g.restore(); }
      return;
    }
    // clean
    const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#11141a'); lg.addColorStop(1, '#06070a'); g.fillStyle = lg; g.fillRect(0, 0, B, H);
    if (vid) { g.save(); g.globalAlpha = 0.3; unscharf(g, vid); g.restore(); g.fillStyle = 'rgba(8,10,14,.55)'; g.fillRect(0, 0, B, H); }
  }
  // Clip-Fenster mit Rahmen im jeweiligen Stil (bildRein zeichnet den Clip ins Fenster)
  function stilFenster(g, st, t, f, fx, fy, fw, fh, rz, bildRein) {
    const zeilen = () => { if (rz) { g.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = fy; yy < fy + fh; yy += 6) g.fillRect(fx, yy, fw, 2); } };
    if (st === 'kino') {
      g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip(); g.fillStyle = '#000'; g.fillRect(fx, fy, fw, fh); bildRein(0); zeilen(); g.restore();
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(fx, fy - 10, fw, 2); g.fillRect(fx, fy + fh + 8, fw, 2);
      return;
    }
    if (st === 'comic') {
      g.fillStyle = f; g.fillRect(fx + 22, fy + 22, fw, fh);
      g.fillStyle = '#000'; g.fillRect(fx - 12, fy - 12, fw + 24, fh + 24);
      g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip(); bildRein(0); zeilen(); g.restore();
      return;
    }
    if (st === 'glitch') {
      g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip(); g.fillStyle = '#000'; g.fillRect(fx, fy, fw, fh); bildRein(0);
      const r = zufallR(Math.floor(t * 12) * 13 + 5);
      if (r() < 0.3) for (let k = 0; k < 3; k++) { const y = fy + r() * fh, h = 12 + r() * 46, dx = (r() - 0.5) * 80; g.save(); g.beginPath(); g.rect(fx, y, fw, h); g.clip(); bildRein(dx); g.restore(); }   // Bildrisse
      g.fillStyle = 'rgba(0,0,0,.16)'; for (let yy = fy; yy < fy + fh; yy += 4) g.fillRect(fx, yy, fw, 1);
      g.restore();
      g.save(); g.lineWidth = 4; g.strokeStyle = 'rgba(0,255,255,.9)'; g.strokeRect(fx - 7, fy - 5, fw, fh); g.strokeStyle = 'rgba(255,0,170,.9)'; g.strokeRect(fx + 7, fy + 5, fw, fh); g.restore();
      return;
    }
    if (st === 'sport') {
      const k = 46, pfad = () => { g.beginPath(); g.moveTo(fx + k, fy); g.lineTo(fx + fw, fy); g.lineTo(fx + fw - k, fy + fh); g.lineTo(fx, fy + fh); g.closePath(); };
      g.save(); g.fillStyle = f; g.beginPath(); g.moveTo(fx + k - 30, fy - 14); g.lineTo(fx + k + 10, fy - 14); g.lineTo(fx - 4 + 10, fy + fh + 14); g.lineTo(fx - 4 - 30, fy + fh + 14); g.closePath(); g.fill(); g.restore();   // Farbkante links
      g.save(); pfad(); g.clip(); g.fillStyle = '#000'; g.fillRect(fx, fy, fw, fh); bildRein(0); zeilen(); g.restore();
      g.save(); pfad(); g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.stroke(); g.restore();
      return;
    }
    // clean
    g.save(); g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 44; g.shadowOffsetY = 18; rr(g, fx, fy, fw, fh, 30); g.fillStyle = '#000'; g.fill(); g.restore();
    g.save(); rr(g, fx, fy, fw, fh, 30); g.clip(); bildRein(0); zeilen(); g.restore();
    g.save(); rr(g, fx, fy, fw, fh, 30); g.lineWidth = 3; g.strokeStyle = hexA(f, 0.9); g.stroke(); g.restore();
  }
  // Spruch oben im jeweiligen Stil (gleiche Stelle wie beim Neon-Spruch)
  function stilSpruch(g, st, t, text, f, o) {
    o = o || {};
    const zl = zweiZeilen(GROSS(text)), zwei = zl.length > 1, y0 = zwei ? (o.y2 || 428) : (o.y1 || 476), kx = o.k || 1;   // kx = größer malen (Foto-Karussell: kurze Texte)
    if (st === 'kino') {
      const px = (zwei ? 104 : 124) * kx;
      zl.forEach((z, i) => {
        const q = fp(t, 0.15 + i * 0.22, 0.8 + i * 0.22); if (q <= 0) return;
        g.save(); g.globalAlpha = q; SA(g, passt(g, z, 960, px, SAx(800)), 800); g.letterSpacing = '6px'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 24;
        g.fillText(z, B / 2, y0 + i * px * 1.02 - (1 - eo(q)) * 26); g.restore();
      });
      const lq = eo(fp(t, 0.6, 1.1)); g.fillStyle = f; g.fillRect(B / 2 - 170 * lq, y0 + (zl.length - 1) * px * 1.02 + 38, 340 * lq, 6);
      return;
    }
    if (st === 'comic') {
      const px = (zwei ? 92 : 112) * kx;
      zl.forEach((z, i) => {
        const q = fp(t, 0.12 + i * 0.14, 0.42 + i * 0.14); if (q <= 0) return;
        g.save(); RU(g, passt(g, z, 900, px, RU)); const w = g.measureText(z).width + 70, h = px * 1.25, cy = y0 + i * (h + 18) - h * 0.6;
        g.translate(B / 2, cy + h / 2); g.rotate(i ? 0.03 : -0.035); const k = 0.4 + 0.6 * eob(q); g.scale(k, k);
        g.fillStyle = '#000'; g.fillRect(-w / 2 + 12, -h / 2 + 12, w, h);
        g.fillStyle = i ? f : '#ffe23d'; g.fillRect(-w / 2, -h / 2, w, h); g.lineWidth = 7; g.strokeStyle = '#000'; g.strokeRect(-w / 2, -h / 2, w, h);
        g.fillStyle = '#000'; g.textAlign = 'center'; g.fillText(z, 0, px * 0.36); g.restore();
      });
      return;
    }
    if (st === 'glitch') {
      const px = (zwei ? 84 : 100) * kx, zeichen = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@';
      zl.forEach((z, i) => {
        const t0 = 0.12 + i * 0.2, q = fp(t, t0, t0 + 0.7); if (q <= 0) return;
        const r = zufallR(Math.floor(t * 20) + i * 31), fertig = Math.floor(z.length * q);
        const txt = q >= 1 ? z : z.split('').map((ch, j) => (j < fertig || ch === ' ' ? ch : zeichen[Math.floor(r() * zeichen.length)])).join('');   // entschlüsselt sich
        g.save(); OR(g, passt(g, z, 980, px, OR)); g.textAlign = 'center'; const y = y0 + i * px * 1.12;
        const wa = (Math.floor(t * 10) % 13 === 0) ? 10 : 4;
        g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(0,255,255,.85)'; g.fillText(txt, B / 2 - wa, y); g.fillStyle = 'rgba(255,0,170,.85)'; g.fillText(txt, B / 2 + wa, y);
        g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff'; g.fillText(txt, B / 2, y); g.restore();
      });
      return;
    }
    if (st === 'sport') {
      const px = (zwei ? 92 : 108) * kx;
      zl.forEach((z, i) => {
        const q = eo(fp(t, 0.12 + i * 0.16, 0.5 + i * 0.16)); if (q <= 0) return;
        g.save(); RU(g, passt(g, z, 900, px, RU)); const w = g.measureText(z).width + 90, h = px * 1.3, s = h * 0.35, x = B / 2 - w / 2 - (1 - q) * B, y = y0 + i * (h + 14) - h * 0.78;
        g.fillStyle = i ? '#ffffff' : f; g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
        g.fillStyle = i ? '#06080a' : (hell(f) > 0.55 ? '#06080a' : '#ffffff'); g.textAlign = 'center'; g.fillText(z, x + w / 2 + s / 2, y + h / 2 + px * 0.36); g.restore();
      });
      return;
    }
    // clean
    const px = (zwei ? 88 : 104) * kx;
    zl.forEach((z, i) => {
      const q = eo(fp(t, 0.15 + i * 0.15, 0.6 + i * 0.15)); if (q <= 0) return;
      g.save(); g.globalAlpha = q; SA(g, passt(g, z, 960, px, SAx(800)), 800); g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(z, B / 2, y0 + i * px * 1.02 + (1 - q) * 24); g.restore();
    });
    const lq = eo(fp(t, 0.1, 0.5)); g.fillStyle = f; g.fillRect(B / 2 - 40 * lq, y0 - (zwei ? 120 : 140) * kx, 80 * lq, 8);
  }
  // Frage unten im jeweiligen Stil (y = gleiche Höhe wie beim Neon-Band)
  function stilFrage(g, st, t, text, f, y) {
    const ub = fp(t, 0.9, 1.25); if (ub <= 0) return;
    const q = eo(ub);
    if (st === 'kino') {
      g.save(); g.globalAlpha = q; SA(g, passt(g, text, 900, 60, SAx(700)), 700); const w = g.measureText(text).width + 70;
      g.fillStyle = 'rgba(0,0,0,.78)'; rr(g, B / 2 - w / 2, y, w, 92, 10); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, B / 2, y + 64); g.restore();
      return;
    }
    if (st === 'comic') {
      g.save(); RU(g, passt(g, text, 820, 46, RU)); const w = g.measureText(text).width + 90, h = 112, x = B / 2 - w / 2;
      g.translate(B / 2, y + h / 2); const k = 0.5 + 0.5 * eob(ub); g.scale(k, k); g.translate(-B / 2, -(y + h / 2));
      g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 7;
      g.beginPath(); g.ellipse(B / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x + w * 0.68, y + h - 8); g.lineTo(x + w * 0.76, y + h + 30); g.lineTo(x + w * 0.58, y + h - 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(x + w * 0.58, y + h - 16, w * 0.16, 14);
      g.fillStyle = '#000'; g.textAlign = 'center'; g.fillText(text, B / 2, y + h / 2 + 16); g.restore();
      return;
    }
    if (st === 'glitch') {
      g.save(); g.globalAlpha = q; OR(g, passt(g, '> ' + text + '_', 900, 40, OR)); const txt = '> ' + text + (Math.floor(t * 2.5) % 2 ? '_' : ' ');
      const w = g.measureText(txt).width + 60; g.fillStyle = 'rgba(0,0,0,.82)'; g.fillRect(B / 2 - w / 2, y, w, 86); g.strokeStyle = 'rgba(0,255,255,.8)'; g.lineWidth = 3; g.strokeRect(B / 2 - w / 2, y, w, 86);
      g.fillStyle = '#5cffe0'; g.textAlign = 'center'; g.fillText(txt, B / 2, y + 56); g.restore();
      return;
    }
    if (st === 'sport') {
      g.save(); RU(g, passt(g, text, 860, 44, RU)); const w = g.measureText(text).width + 80, h = 78, s = h * 0.35, x = B / 2 - w / 2 + (1 - q) * B;
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
      g.fillStyle = f; g.fillRect(x - 18, y, 12, h);
      g.fillStyle = '#06080a'; g.textAlign = 'center'; g.fillText(text, x + w / 2 + s / 2, y + h / 2 + 16); g.restore();
      if (ub >= 1 && y + 120 < 1640) chevrons(g, B / 2, y + 100, t, f);
      return;
    }
    // clean
    g.save(); g.globalAlpha = q; SA(g, passt(g, text, 920, 62, SAx(700)), 700); g.textAlign = 'center'; g.fillStyle = '#e8ebf0'; g.fillText(text, B / 2, y + 56);
    g.strokeStyle = f; g.lineWidth = 6; g.lineCap = 'round'; const yy = y + 86 + Math.abs(Math.sin(t * 4)) * 8; g.beginPath(); g.moveTo(B / 2 - 16, yy); g.lineTo(B / 2, yy + 14); g.lineTo(B / 2 + 16, yy); g.stroke(); g.restore();
  }
  // Zoom (Clip füllt das Bild): kleine Zusätze je Stil
  function stilZoomUeber(g, st, t, f) {
    if (st === 'kino') { g.fillStyle = '#000'; g.fillRect(0, 0, B, 150); g.fillRect(0, H - 150, B, 150); return; }
    if (st === 'glitch') { g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H; y += 5) g.fillRect(0, y, B, 1); return; }
    if (st === 'comic') { g.save(); g.globalAlpha = 0.12; g.drawImage(merk('comicpunkte', () => { const c = leinwand(B, H), k = c.getContext('2d'); k.fillStyle = '#000'; for (let y = 0; y < H; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < B; x += 18) { k.beginPath(); k.arc(x, y, 3, 0, Math.PI * 2); k.fill(); } return c; }), 0, 0); g.restore(); return; }
    if (st === 'sport') { g.save(); g.fillStyle = hexA(f, 0.85); g.transform(1, 0, -0.45, 1, 0, 0); g.fillRect(-40, 0, 26, H); g.fillRect(B + 760, 0, 26, H); g.restore(); }
  }
  // ═══ Top 3 · Vorher/Nachher · Strecke in 30 Sek. (Neon) ═══
  // bilder[s] = Bild des Platzes s (aus spur(t)); was gerade nicht läuft, ist leer
  function clipRahmen(g, bild, x, y, w, h, f, t, zoom, tf) {
    g.save(); rr(g, x, y, w, h, 14); g.clip(); g.fillStyle = '#000'; g.fillRect(x, y, w, h);
    if (bild) quellBild(g, bild, x, y, w, h, zoom || 1, 0, tf);
    g.restore();
    const fl = flackern(t);
    g.save(); g.globalAlpha = fl; rr(g, x, y, w, h, 14); g.strokeStyle = hexA(f, 0.55); g.lineWidth = 3; g.shadowColor = f; g.shadowBlur = 22; g.stroke(); g.restore();
    g.save(); g.globalAlpha = fl; ecken(g, x - 10, y - 10, w + 20, h + 20, f, 74); g.restore();
  }
  function frageBand(g, t, text, f, y, ab) {   // Neon-Band, fährt von links rein
    const ub = fp(t, ab, ab + 0.35); if (ub <= 0) return;
    const bd = band(text, f, 46);
    g.save(); g.translate(-(1 - eo(ub)) * B, 0); g.drawImage(bd.c, B / 2 - bd.bandW / 2 - 40, y - 60); g.restore();
  }
  function zeichneMehr(g, t, c, p, m, bilder) {
    const v = vorlage(c), f = c.farbe || v.farbe, outro = t >= p.T - OUTRO, b = bilder || [];
    const hg = (p.mehr === 'erwartung' && b[1]) || b.find(Boolean) || null;
    g.save();
    if (!outro && hg) weichesBild(g, hg, f); else g.drawImage(grund(f), 0, 0);
    if (outro) outroZeichnen(g, t - (p.T - OUTRO), m, f);
    else if (p.mehr === 'top3') top3Zeichnen(g, t, c, p, m, v, f, b);
    else if (p.mehr === 'vergleich') vergleichZeichnen(g, t, c, p, m, v, f, b);
    else if (p.mehr === 'erwartung') erwartungZeichnen(g, t, c, p, m, v, f, b);
    else if (p.mehr === 'verkehr') verkehrZeichnen(g, t, c, p, m, v, f, b);
    else if (p.mehr === 'aufholjagd') aufholjagdZeichnen(g, t, c, p, m, v, f, b);
    else if (p.mehr === 'sektoren') sektorenZeichnen(g, t, c, p, m, v, f, b);
    else streckeZeichnen(g, t, c, p, m, v, f, b);
    g.restore();
    const blitze = [[0.12, 0.5], [p.T - OUTRO, 0.75], ...(p.teile ? p.teile.slice(1).map(k => [k.S, 0.7]) : []), ...(p.lauf && p.lauf < p.D ? [[p.lauf, 0.55]] : [])];
    for (const [z, a] of blitze) { const d = t - z; if (d >= 0 && d < 0.3) { g.fillStyle = `rgba(255,255,255,${a * (1 - d / 0.3)})`; g.fillRect(0, 0, B, H); } }
  }
  function top3Zeichnen(g, t, c, p, m, v, f, b) {
    const n = p.teile.length, k = Math.max(0, p.teile.findIndex(x => t >= x.S && t < x.S + x.d)), teil = p.teile[k], platz = n - k;
    const L0 = lage(c), fx = L0.fx, fy = L0.fy, fw = L0.fw, fh = L0.fh, dy = L0.dy, dt = t - teil.S, src = quellenVon(c)[teil.q] || {};
    const [sx, sy] = schuetteln(dt - 0.05);
    g.save(); g.translate(sx, sy);
    clipRahmen(g, b[teil.q], fx, fy, fw, fh, f, t, 1 + 0.12 * (1 - eo(fp(dt, 0, 0.5))), src.bild);
    pille(g, (v.plaetze || [])[3 - platz] || 'PLATZ ' + platz, fx + 6, fy - 66, f, 30, true);
    g.save(); OR(g, 34); g.textAlign = 'right'; g.shadowColor = f; g.shadowBlur = 14; g.fillStyle = '#fff'; g.fillText(`${k + 1}/${n}`, fx + fw - 6, fy - 28); g.restore();
    // Große Platz-Zahl beim Wechsel
    if (dt < 1.15) {
      const q = eob(fp(dt, 0, 0.35)), aus = fp(dt, 0.75, 1.15), ch = chrom('#' + platz, 340, f, 600);
      g.save(); g.globalAlpha = Math.min(1, fp(dt, 0, 0.12) * 3) * (1 - aus); g.translate(B / 2, fy + fh / 2 + 120); const sk = (0.35 + 0.65 * q) * (1 + 0.3 * aus); g.scale(sk, sk);
      g.drawImage(ch.c, -ch.mitte, -ch.base); if (dt > 0.35 && dt < 1.0) glanz(g, ch, -ch.mitte, -ch.base, (dt - 0.35) / 0.65, 0.8); g.restore();
    }
    g.restore();
    spruchZeichnen(g, t, c.hook || v.hooks[0], f, L0.hoch ? { y1: 476 - L0.hoch, y2: 428 - L0.hoch } : undefined);
    // Fortschritt in drei Abschnitten
    const py = fy + fh + 18, luecke = 14, breit = fw - luecke * (n - 1);
    let x = fx;
    for (const x0 of p.teile) {
      const w = breit * x0.d / p.D, q = kl((t - x0.S) / x0.d, 0, 1);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, py, w, 8);
      if (q > 0) { g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16; g.fillRect(x, py, w * q, 8); g.restore(); }
      x += w + luecke;
    }
    // Titel des Platzes als Band, darunter die Frage
    const titel = GROSS(String(src.titel || '').trim()) || ((v.plaetze || [])[3 - platz] || 'PLATZ ' + platz);
    frageBand(g, dt, titel, f, 1310 + dy, 0.25);
    const fq = fp(t, 1.0, 1.4);
    if (fq > 0) { const fr = frageVon(c, v); g.save(); g.globalAlpha = fq; SA(g, 42, 800); neonText(g, fr, B / 2, 1446 + dy, passt(g, fr, 940, 42, (gg, px) => SA(gg, px, 800)), f, (gg, px) => SA(gg, px, 800), 'center', 14); g.restore(); }
    if (markeY(1530, dy) != null) marke(g, t, m, f, 1530 + dy);
  }
  function vergleichZeichnen(g, t, c, p, m, v, f, b) {
    const q = quellenVon(c), fx = 60, fw = 960, fh = 540, ya = 300, yb = 950;
    spruchZeichnen(g, t, c.hook || v.hooks[0], f, { y1: 222, y2: 150, px1: 118, px2: 98 });
    clipRahmen(g, b[0], fx, ya, fw, fh, f, t, 1, q[0].bild);
    clipRahmen(g, b[1], fx, yb, fw, fh, f, t, 1, (q[1] || q[0]).bild);
    const la = GROSS(String(q[0].titel || '').trim()) || v.plaetze[0], lb = GROSS(String((q[1] || {}).titel || '').trim()) || v.plaetze[1];
    pille(g, la, fx + 16, ya + 16, f, 30, true);
    pille(g, lb, fx + 16, yb + 16, '#ffffff', 30, true);
    // VS in der Mitte
    const vy = (ya + fh + yb) / 2, pu = 1 + 0.05 * Math.max(0, Math.sin(t * Math.PI * 2));
    g.save(); g.translate(B / 2, vy); g.scale(pu, pu);
    g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.fillStyle = '#05070a'; g.fill();
    g.lineWidth = 6; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 24; g.stroke();
    RU(g, 46); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowBlur = 12; g.fillText('VS', 0, 17); g.restore();
    // Fortschritt und Frage unten
    const pr = kl(t / p.D, 0, 1), py = yb + fh + 16;
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(fx, py, fw, 8);
    g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16; g.fillRect(fx, py, fw * pr, 8); g.restore();
    frageBand(g, t, frageVon(c, v), f, 1548, 0.9);
  }
  function rundenzeit(s) { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, '0')}`; }
  function streckeZeichnen(g, t, c, p, m, v, f, b) {
    const L0 = lage(c), fx = L0.fx, fy = L0.fy, fw = L0.fw, fh = L0.fh, dy = L0.dy, src = p.x.a + Math.min(t, p.D) * p.tempo;
    clipRahmen(g, b[0], fx, fy, fw, fh, f, t, 1, c.bild);
    // Oben: kleiner Spruch, darunter groß die Strecke
    const q0 = fp(t, 0.1, 0.4);
    if (q0 > 0) { g.save(); g.globalAlpha = q0; const h = GROSS(c.hook || v.hooks[0]); SA(g, 56, 800); neonText(g, h, B / 2, 300 - L0.hoch, passt(g, h, 960, 56, (gg, px) => SA(gg, px, 800)), f, (gg, px) => SA(gg, px, 800), 'center', 16); g.restore(); }
    spruchZeichnen(g, t, String(c.strecke || '').trim() || 'STRECKE', f, { y1: 490 - L0.hoch, y2: 430 - L0.hoch, px1: 170, px2: 140 });
    pille(g, tagText(v, c), fx + 6, fy - 66, f, 30, true);
    if (p.tempo >= 1.05) {   // nur zeigen, wenn wirklich schneller
      const tp = '×' + p.tempo.toFixed(1).replace('.', ',') + ' SPEED';
      g.save(); RU(g, 30); const tw = g.measureText(tp).width + 42; g.restore();
      pille(g, tp, fx + fw - tw - 6, fy - 66, '#ffffff', 30, false);
    }
    // Rundenzeit unten rechts im Bild
    g.save(); OR(g, 54); g.textAlign = 'right'; g.shadowColor = '#000'; g.shadowBlur = 14; g.fillStyle = '#fff'; g.fillText(rundenzeit(src - p.x.a), fx + fw - 22, fy + fh - 26);
    SA(g, 26, 700); g.fillStyle = hexA(f, 0.95); g.fillText('RUNDENZEIT', fx + fw - 22, fy + fh - 86); g.restore();
    // Kurven-Karte unten links im Bild
    const mk = p.marken.filter(x => t >= x.ot && t < x.ot + 1.8).pop();
    if (mk) {
      const d = t - mk.ot, q = eob(fp(d, 0, 0.25)), aus = fp(d, 1.5, 1.8), teile = String(mk.text || '').split(/\s+[–-]\s+|\s*\|\s*/), name = GROSS(teile[0] || 'KURVE ' + mk.n), tipp2 = GROSS(teile.slice(1).join(' · '));
      g.save(); g.globalAlpha = 1 - aus; g.translate(fx + 26, fy + fh - 40); g.scale(q, q);
      SA(g, 50, 900); const w1 = Math.min(660, Math.max(g.measureText(name).width, tipp2 ? (SA(g, 34, 700), g.measureText(tipp2).width) : 0) + 150);
      const hh = tipp2 ? 128 : 88;
      rr(g, 0, -hh, w1, hh, 12); g.fillStyle = 'rgba(5,7,10,.82)'; g.fill(); g.lineWidth = 3; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 18; g.stroke(); g.shadowBlur = 0;
      rr(g, 12, -hh + 12, 96, hh - 24, 10); g.fillStyle = f; g.fill();
      RU(g, 40); g.textAlign = 'center'; g.fillStyle = '#06080a'; g.fillText('T' + mk.n, 60, -hh / 2 + 15);
      g.textAlign = 'left'; SA(g, passt(g, name, w1 - 140, 50, SA), 900); g.fillStyle = '#fff'; g.fillText(name, 124, tipp2 ? -hh + 60 : -hh / 2 + 18);
      if (tipp2) { SA(g, passt(g, tipp2, w1 - 140, 34, (gg, px) => SA(gg, px, 700)), 700); g.fillStyle = hexA(f, 1); g.fillText(tipp2, 124, -hh + 104); }
      g.restore();
    }
    // Rundenfortschritt mit Kurven-Punkten
    const py = fy + fh + 18, pr = kl((src - p.x.a) / (p.x.b - p.x.a), 0, 1);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(fx, py, fw, 8);
    g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16; g.fillRect(fx, py, fw * pr, 8); g.restore();
    for (const x0 of p.marken) { const xx = fx + fw * x0.ot / p.D; g.fillStyle = t >= x0.ot ? f : 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(xx, py + 4, 8, 0, Math.PI * 2); g.fill(); }
    frageBand(g, t, frageVon(c, v), f, 1310 + dy, 0.9);
    if (markeY(1490, dy) != null) marke(g, t, m, f, 1490 + dy);
  }
  function speedPille(g, p, xr, y) {   // „×2,0 SPEED“ rechtsbündig bis xr (nur wenn wirklich schneller), gibt die neue rechte Kante zurück
    if (!(p.tempo >= 1.05)) return xr;
    const tp = '×' + p.tempo.toFixed(1).replace('.', ',') + ' SPEED', w = pillenBreite(g, tp, 30);
    pille(g, tp, xr - w, y, '#ffffff', 30, false); return xr - w - 14;
  }
  // ═══ Durch den Verkehr (Multiclass): Zähler, blaue Flagge, „+1“ mit Klasse, am Ende Standbild mit der Zahl ═══
  function verkehrZeichnen(g, t, c, p, m, v, f, b) {
    const L0 = lage(c), fx = L0.fx, fy = L0.fy, fw = L0.fw, fh = L0.fh, dy = L0.dy, weg = p.marken.filter(x => t >= x.ot), n = weg.length, letzt = weg[n - 1];
    clipRahmen(g, b[0], fx, fy, fw, fh, f, t, 1, c.bild);
    spruchZeichnen(g, t, c.hook || v.hooks[0], f, L0.hoch ? { y1: 476 - L0.hoch, y2: 428 - L0.hoch } : undefined);
    pille(g, tagText(v, c), fx + 6, fy - 66, f, 30, true);
    let xr = fx + fw - 6;
    const eigen = GROSS(String(c.klasse || '').trim());
    if (eigen) { const w = pillenBreite(g, eigen, 30); pille(g, eigen, xr - w, fy - 66, klasseFarbe(eigen), 30, true); xr -= w + 14; }
    speedPille(g, p, xr, fy - 66);
    if (t < p.lauf) {
      const nx = p.marken.find(x => x.ot > t - 0.2);   // blaue Flagge, kurz bevor das nächste Auto dran ist
      if (nx) blaueFlagge(g, fx + 28, fy + 26, t, fp(t, nx.ot - 1.6, nx.ot - 1.3) * (1 - fp(t, nx.ot, nx.ot + 0.2)));
      const zaehl = new Map(); for (const x of weg) { const k = GROSS(String(x.text || '').trim()) || 'AUTO'; zaehl.set(k, (zaehl.get(k) || 0) + 1); }
      let xx = fx + 22;   // schon überholte Klassen unten links im Clip
      for (const [k, z] of zaehl) { if (xx > fx + fw - 300) break; xx += pille(g, `${k} ×${z}`, xx, fy + fh - 72, k === 'AUTO' ? f : klasseFarbe(k), 28, false) + 10; }
      for (const x of weg) { const k = GROSS(String(x.text || '').trim()); plusEins(g, t - x.ot, k, k ? klasseFarbe(k) : f, fx + fw / 2, fy + fh / 2 + 40); }
    }
    zaehlerKasten(g, fx + fw - 24 - 240, fy + 22, 240, 150, 'ÜBERHOLT', String(n), f, letzt ? fp(t, letzt.ot, letzt.ot + 0.4) : 1);
    if (n && p.lauf < p.D) schlussBild(g, t, p.lauf, fx, fy, fw, fh, f, String(n), n === 1 ? 'AUTO ÜBERHOLT' : 'AUTOS ÜBERHOLT', `IN ${Math.max(1, Math.round(p.x.b - p.x.a))} SEKUNDEN`);
    fortschrittPunkte(g, t, p, f, fx, fw, fy + fh + 18);
    frageBand(g, t, frageVon(c, v), f, 1310 + dy, 0.9);
    if (markeY(1490, dy) != null) marke(g, t, m, f, 1490 + dy);
  }
  // ═══ Aufholjagd: Platz-Anzeige zählt nach vorn, am Ende „+X Plätze“ ═══
  const startPlatz = c => kl(parseInt(String(c.startplatz || '').replace(/\D/g, ''), 10) || 20, 2, 99);
  function platzKasten(g, x, y, w, h, pos, n, d, f) {
    const pop = fp(d, 0, 0.45), gruen = '#5cff1f', fl = 1 - pop, zh = 112, zy = y + 50;
    g.save(); rr(g, x, y, w, h, 12); g.fillStyle = 'rgba(5,7,10,.86)'; g.fill(); g.lineWidth = 3; g.strokeStyle = fl > 0 ? gruen : f; g.shadowColor = fl > 0 ? gruen : f; g.shadowBlur = 14 + 30 * fl; g.stroke(); g.shadowBlur = 0;
    if (fl > 0) { g.fillStyle = hexA(gruen, 0.3 * fl); g.fill(); }
    SA(g, 28, 700); g.textAlign = 'center'; g.fillStyle = hexA(f, 1); g.fillText('POSITION', x + w / 2, y + 40);
    g.save(); g.beginPath(); g.rect(x, zy, w, zh); g.clip(); OR(g, passt(g, 'P' + (pos + 1), w - 36, 100, OR)); g.fillStyle = '#fff'; g.shadowColor = f; g.shadowBlur = 20;
    const q = eo(pop), mitte = zy + zh / 2 + 36;
    if (pop < 1 && n > 0) { g.globalAlpha = 1 - q; g.fillText('P' + (pos + 1), x + w / 2, mitte - q * zh); g.globalAlpha = 1; g.fillText('P' + pos, x + w / 2, mitte + (1 - q) * zh); }   // Walze: alter Platz raus nach oben, neuer kommt von unten
    else g.fillText('P' + pos, x + w / 2, mitte);
    g.restore();
    SA(g, 40, 900); g.fillStyle = n ? gruen : 'rgba(255,255,255,.55)'; g.shadowColor = n ? gruen : 'transparent'; g.shadowBlur = 14;
    if (n) {   // Dreieck nach oben + gewonnene Plätze
      const tw = g.measureText('+' + n).width, x0 = x + w / 2 - (tw + 38) / 2, by = y + h - 30;
      g.beginPath(); g.moveTo(x0, by); g.lineTo(x0 + 26, by); g.lineTo(x0 + 13, by - 24); g.closePath(); g.fill();
      g.textAlign = 'left'; g.fillText('+' + n, x0 + 38, y + h - 22);
    } else g.fillText('START', x + w / 2, y + h - 22);
    g.restore();
  }
  function aufholjagdZeichnen(g, t, c, p, m, v, f, b) {
    const L0 = lage(c), fx = L0.fx, fy = L0.fy, fw = L0.fw, fh = L0.fh, dy = L0.dy, start = startPlatz(c), weg = p.marken.filter(x => t >= x.ot).slice(0, start - 1), n = weg.length, letzt = weg[n - 1], gesamt = Math.min(p.marken.length, start - 1);
    clipRahmen(g, b[0], fx, fy, fw, fh, f, t, 1, c.bild);
    spruchZeichnen(g, t, c.hook || v.hooks[0], f, L0.hoch ? { y1: 476 - L0.hoch, y2: 428 - L0.hoch } : undefined);
    pille(g, tagText(v, c), fx + 6, fy - 66, f, 30, true);
    speedPille(g, p, fx + fw - 6, fy - 66);
    if (t < p.lauf) for (const x of weg) plusEins(g, t - x.ot, GROSS(String(x.text || '').trim()), '#5cff1f', fx + fw / 2 - 60, fy + fh / 2 + 40);
    platzKasten(g, fx + fw - 24 - 270, fy + 22, 270, 214, start - n, n, letzt ? t - letzt.ot : 9, f);
    if (gesamt && p.lauf < p.D) schlussBild(g, t, p.lauf, fx, fy, fw, fh, f, '+' + gesamt, gesamt === 1 ? 'PLATZ GUTGEMACHT' : 'PLÄTZE GUTGEMACHT', `VON P${start} AUF P${start - gesamt}`);
    fortschrittPunkte(g, t, p, f, fx, fw, fy + fh + 18);
    frageBand(g, t, frageVon(c, v), f, 1310 + dy, 0.9);
    if (markeY(1490, dy) != null) marke(g, t, m, f, 1490 + dy);
  }
  // ═══ Sektorzeiten: Zeiten-Turm wie in der F1 (Lila / Grün / Gelb), am Ende die Rundenzeit ═══
  function zeitenTurm(g, t, p, src, x, y, f, a) {
    const S = p.sektoren, n = S.length, rh = Math.min(54, Math.floor(420 / n)), w = 372, h = 72 + n * rh + 8;
    if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    rr(g, x, y, w, h, 12); g.fillStyle = 'rgba(5,7,10,.86)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.18)'; g.stroke();
    g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 12; g.fillRect(x + 12, y + 14, 8, 44); g.shadowBlur = 0;
    SA(g, 28, 700); g.fillStyle = hexA(f, 1); g.fillText('RUNDE', x + 32, y + 46);
    OR(g, 40); g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(zeitText(t >= p.lauf ? p.runde : src - p.x.a), x + w - 18, y + 50); g.textAlign = 'left';
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 12, y + 66, w - 24, 2);
    S.forEach((s, i) => {
      const yy = y + 72 + i * rh, fertig = t >= s.ot, aktiv = !fertig && t >= s.ot0, blitz = fertig ? 1 - fp(t, s.ot, s.ot + 0.7) : 0, ty = yy + rh * 0.66;
      if (blitz > 0) { g.fillStyle = hexA(s.farbe, 0.5 * blitz); rr(g, x + 6, yy + 2, w - 12, rh - 4, 8); g.fill(); }
      g.fillStyle = fertig ? s.farbe : aktiv ? '#ffffff' : 'rgba(255,255,255,.2)'; g.fillRect(x + 14, yy + 8, 8, rh - 16);
      SA(g, Math.min(34, rh * 0.62), 900); g.fillStyle = fertig || aktiv ? '#fff' : 'rgba(255,255,255,.4)'; g.fillText('S' + s.n, x + 36, ty);
      OR(g, Math.min(34, rh * 0.6)); g.textAlign = 'right';
      g.fillStyle = fertig ? s.farbe : aktiv ? '#fff' : 'rgba(255,255,255,.3)';
      if (fertig) { g.shadowColor = s.farbe; g.shadowBlur = 14; }
      g.fillText(fertig ? zeitText(s.zeit) : aktiv ? zeitText(src - s.start) : '-.---', x + w - 18, ty); g.shadowBlur = 0; g.textAlign = 'left';
    });
    g.restore();
  }
  function sektorKarte(g, d, s, cx, cy) {   // groß unten im Bild, wenn ein Sektor fertig ist
    if (d < 0 || d > 1.8) return;
    const q = eob(fp(d, 0, 0.25)), aus = fp(d, 1.45, 1.8), txt = zeitText(s.zeit), lab = 'SEKTOR ' + s.n;
    g.save(); OR(g, 64); const tw = g.measureText(txt).width; SA(g, 32, 900); const lw = g.measureText(lab).width, w = tw + lw + 116, h = 96;
    g.globalAlpha *= 1 - aus; g.translate(cx, cy); g.scale(q, q);
    rr(g, -w / 2, -h / 2, w, h, 14); g.fillStyle = 'rgba(5,7,10,.9)'; g.fill(); g.lineWidth = 4; g.strokeStyle = s.farbe; g.shadowColor = s.farbe; g.shadowBlur = 26; g.stroke(); g.shadowBlur = 0;
    rr(g, -w / 2 + 12, -h / 2 + 12, lw + 40, h - 24, 10); g.fillStyle = s.farbe; g.fill();
    SA(g, 32, 900); g.fillStyle = '#06080a'; g.fillText(lab, -w / 2 + 32, 12);
    OR(g, 64); g.fillStyle = s.farbe; g.shadowColor = s.farbe; g.shadowBlur = 18; g.fillText(txt, -w / 2 + lw + 80, 24);
    g.restore();
  }
  function sektorBalken(g, t, p, fx, fw, py) {   // Fortschritt in Sektoren, fertige in ihrer Farbe
    const S = p.sektoren, gap = 8, breit = fw - gap * (S.length - 1); let x = fx;
    for (const s of S) {
      const w = breit * (s.ot - s.ot0) / (p.lauf || 1), q = kl((t - s.ot0) / ((s.ot - s.ot0) || 1), 0, 1), fertig = t >= s.ot;
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, py, w, 8);
      if (q > 0) { g.save(); g.fillStyle = fertig ? s.farbe : '#ffffff'; g.shadowColor = fertig ? s.farbe : '#ffffff'; g.shadowBlur = 14; g.fillRect(x, py, w * q, 8); g.restore(); }
      x += w + gap;
    }
  }
  function sektorenZeichnen(g, t, c, p, m, v, f, b) {
    const L0 = lage(c), fx = L0.fx, fy = L0.fy, fw = L0.fw, fh = L0.fh, dy = L0.dy, S = p.sektoren, src = p.x.a + Math.min(t, p.lauf) * p.tempo, t0 = p.lauf + 0.7;
    clipRahmen(g, b[0], fx, fy, fw, fh, f, t, 1, c.bild);
    spruchZeichnen(g, t, c.hook || v.hooks[0], f, L0.hoch ? { y1: 476 - L0.hoch, y2: 428 - L0.hoch } : undefined);
    pille(g, tagText(v, c), fx + 6, fy - 66, f, 30, true);
    let xr = fx + fw - 6; const st = GROSS(String(c.strecke || '').trim());
    if (st) { const w = pillenBreite(g, st, 30); pille(g, st, xr - w, fy - 66, '#ffffff', 30, false); xr -= w + 14; }
    speedPille(g, p, xr, fy - 66);
    zeitenTurm(g, t, p, src, fx + 22, fy + 22, f, 1 - fp(t, t0, t0 + 0.3));
    const kw = 1 - fp(t, t0 - 0.15, t0 + 0.15);   // Sektor-Karten weg, bevor die Rundenzeit kommt
    if (kw > 0) { g.save(); g.globalAlpha = kw; for (const s of S) sektorKarte(g, t - s.ot, s, fx + fw / 2 + 160, fy + fh - 84); g.restore(); }
    if (p.lauf < p.D) {
      schlussBild(g, t, t0, fx, fy, fw, fh, f, zeitText(p.runde), 'RUNDENZEIT', '');
      const q2 = eo(fp(t, t0 + 0.35, t0 + 0.7));
      if (q2 > 0) {   // Sektoren in ihrer Farbe unter der Rundenzeit
        g.save(); g.globalAlpha = q2; OR(g, S.length > 4 ? 28 : 36);
        const teile = S.map(s => ({ s, txt: zeitText(s.zeit) })), lu = 40, ges = teile.reduce((w, x) => w + g.measureText(x.txt).width, 0) + lu * (teile.length - 1);
        let x = B / 2 - ges / 2; const yy = fy + fh / 2 + 182;
        for (const x0 of teile) { g.fillStyle = x0.s.farbe; g.shadowColor = x0.s.farbe; g.shadowBlur = 14; g.fillText(x0.txt, x, yy); x += g.measureText(x0.txt).width + lu; }
        g.restore();
      }
    }
    sektorBalken(g, t, p, fx, fw, fy + fh + 18);
    frageBand(g, t, frageVon(c, v), f, 1310 + dy, 0.9);
    if (markeY(1490, dy) != null) marke(g, t, m, f, 1490 + dy);
  }
  // ═══ Erwartung vs. Realität: oben der Plan, unten was wirklich passiert ist, am Ende Standbild mit Pointe ═══
  function memeText(g, text, x, y, px, farbe) {
    g.save(); RU(g, passt(g, text, 900, px, RU)); g.textAlign = 'center'; g.lineJoin = 'round';
    g.strokeStyle = '#000'; g.lineWidth = px * 0.22; g.strokeText(text, x, y);
    g.fillStyle = '#fff'; g.shadowColor = farbe; g.shadowBlur = 20; g.fillText(text, x, y);
    g.restore();
  }
  function funkeln(g, t, x, y, w, h, f) {   // goldene Sterne über dem Plan
    const r = zufallR(11);
    g.save(); g.fillStyle = '#fff6d6'; g.shadowColor = f; g.shadowBlur = 16;
    for (let i = 0; i < 12; i++) {
      const px = x + 40 + r() * (w - 80), py = y + 120 + r() * (h - 160), ph = r() * 6.28, s = 9 + r() * 16, a = Math.sin(t * 3.2 + ph);
      if (a <= 0.1) continue;
      g.globalAlpha = a; const k = s * (0.6 + 0.4 * a);
      g.beginPath(); g.moveTo(px, py - k); g.quadraticCurveTo(px, py, px + k, py); g.quadraticCurveTo(px, py, px, py + k); g.quadraticCurveTo(px, py, px - k, py); g.quadraticCurveTo(px, py, px, py - k); g.fill();
    }
    g.restore();
  }
  function erwartungZeichnen(g, t, c, p, m, v, f, b) {
    const q = quellenVon(c), fx = 90, fw = 900, fh = 506, ya = 352, yb = 958, teil2 = t >= p.d0, steh = t >= p.lauf, rot = '#ff2a3d';
    spruchZeichnen(g, t, c.hook || v.hooks[0], f, { y1: 300, y2: 214, px1: 112, px2: 96 });
    // Oben: Erwartung (läuft, danach Standbild)
    clipRahmen(g, b[0], fx, ya, fw, fh, f, t, 1, q[0].bild);
    if (!teil2) funkeln(g, t, fx, ya, fw, fh, f);
    else { g.save(); rr(g, fx, ya, fw, fh, 14); g.clip(); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(fx, ya, fw, fh); g.restore(); }
    memeText(g, GROSS(String(q[0].titel || '').trim()) || v.plaetze[0], B / 2, ya + 80, 68, f);
    // Unten: Realität (erst Fragezeichen, dann der Clip mit Wackler, am Ende Standbild grau mit Pointe)
    const [sx, sy] = teil2 ? schuetteln(t - p.d0 - 0.02) : [0, 0], zq = eo(fp(t, p.lauf, p.lauf + 0.5));
    g.save(); g.translate(sx, sy);
    if (!teil2) {
      clipRahmen(g, null, fx, yb, fw, fh, '#ffffff', t);
      const ch = chrom('?', 300, f, 400), pu = 1 + 0.08 * Math.sin(t * 5);
      g.save(); g.translate(B / 2, yb + fh / 2 + 40); g.scale(pu, pu); g.drawImage(ch.c, -ch.mitte, -ch.base + 100); g.restore();
    } else {
      clipRahmen(g, b[1], fx, yb, fw, fh, rot, t, 1 + 0.1 * zq, (q[1] || q[0]).bild);
      if (zq > 0) {
        g.save(); rr(g, fx, yb, fw, fh, 14); g.clip();
        g.globalCompositeOperation = 'saturation'; g.globalAlpha = 0.9 * zq; g.fillStyle = '#808080'; g.fillRect(fx, yb, fw, fh);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = zq; g.fillStyle = 'rgba(120,0,10,.22)'; g.fillRect(fx, yb, fw, fh);
        g.restore();
      }
    }
    memeText(g, GROSS(String((q[1] || {}).titel || '').trim()) || v.plaetze[1], B / 2, yb + 80, 68, teil2 ? rot : '#ffffff');
    const sq = fp(t, p.lauf + 0.12, p.lauf + 0.36);
    if (steh && sq > 0) {
      const ch = chrom(GROSS(String(c.pointe || '').trim()) || 'NA TOLL.', 150, rot, 860);
      g.save(); g.translate(B / 2, yb + fh / 2 + 60); g.rotate(-0.1); const k = 1 + (1 - eo(sq)) * 0.9; g.scale(k, k); g.globalAlpha = Math.min(1, sq * 2); g.drawImage(ch.c, -ch.mitte, -ch.base + 50); g.restore();
    }
    g.restore();
    // VS in der Mitte
    const vy = (ya + fh + yb) / 2, pu = 1 + 0.05 * Math.max(0, Math.sin(t * Math.PI * 2));
    g.save(); g.translate(B / 2, vy); g.scale(pu, pu);
    g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.fillStyle = '#05070a'; g.fill();
    g.lineWidth = 6; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 24; g.stroke();
    RU(g, 46); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowBlur = 12; g.fillText('VS', 0, 17); g.restore();
    const pr = kl(t / p.lauf, 0, 1), py = yb + fh + 16;
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(fx, py, fw, 8);
    g.save(); g.fillStyle = teil2 ? rot : f; g.shadowColor = teil2 ? rot : f; g.shadowBlur = 16; g.fillRect(fx, py, fw * pr, 8); g.restore();
    frageBand(g, t, frageVon(c, v), f, 1538, 0.9);
  }
  // Letzte 0,4 s: ins erste Bild überblenden, damit das Video nahtlos von vorn weiterläuft
  function loopUebergang(g, t, p, erstes) {
    if (!erstes) return;
    const q = fp(t, p.T - LOOP, p.T - 1 / FPS); if (q <= 0) return;
    const e = q * q * (3 - 2 * q), sk = 1 + 0.16 * (1 - e);
    g.save(); g.globalAlpha = e; g.translate(B / 2, H / 2); g.scale(sk, sk); g.drawImage(erstes, -B / 2, -H / 2, B, H); g.restore();
    const bl = Math.max(0, 1 - Math.abs(q - 0.45) / 0.25) * 0.4;
    if (bl > 0) { g.fillStyle = `rgba(255,255,255,${bl})`; g.fillRect(0, 0, B, H); }
  }
  function logoRing(g, x, y, r, farbe, logo, t) {
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#05070a'; g.fill(); g.restore();
    if (logo) { g.save(); g.beginPath(); g.arc(x, y, r * 0.86, 0, Math.PI * 2); g.clip(); const iw = logo.naturalWidth || logo.width, ih = logo.naturalHeight || logo.height, s = Math.min(r * 1.6 / iw, r * 1.6 / ih); g.drawImage(logo, x - iw * s / 2, y - ih * s / 2, iw * s, ih * s); g.restore(); }
    g.save(); g.strokeStyle = '#eef2f5'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(x, y, r * 0.92, 0, Math.PI * 2); g.stroke(); g.restore();
    const d = (t || 0) * 1.6;
    g.save(); g.shadowColor = farbe; g.shadowBlur = r * 0.35; g.fillStyle = farbe; g.beginPath(); g.arc(x, y, r * 1.14, d + Math.PI * 0.45, d + Math.PI * 1.85); g.arc(x + Math.cos(d + Math.PI * 1.15) * r * 0.07, y + Math.sin(d + Math.PI * 1.15) * r * 0.07, r * 1.0, d + Math.PI * 1.85, d + Math.PI * 0.45, true); g.closePath(); g.fill(); g.fill(); g.restore();
  }
  function marke(g, t, m, f, y) {
    logoRing(g, 112, y, 52, f, m.logo, t);
    g.save(); RU(g, passt(g, m.name, 470, 46, RU, 26)); g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 10; g.fillText(m.name, 190, y - 4); g.restore();
    g.save(); SA(g, 30, 700); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('SIMRACING · IRACING', 192, y + 34); g.restore();
    const puls = 1 + 0.06 * Math.max(0, Math.sin(t * Math.PI * 2));
    g.save(); g.translate(800, y); g.scale(puls, puls); pille(g, '+ FOLGEN', -105, -33, f, 32, true); g.restore();
  }
  function outroZeichnen(g, t, m, f) {
    const q = eob(fp(t, 0, 0.45)), q2 = eo(fp(t, 0.25, 0.6)), q3 = eo(fp(t, 0.45, 0.8));
    g.save(); g.translate(B / 2, 720); g.scale(q, q); logoRing(g, 0, 0, 170, f, m.logo, t); g.restore();
    if (q2 > 0) {
      const ch = chrom('YOUTUBE', 170, f, 960), gq = (t - 0.75) / 0.6;
      g.save(); g.globalAlpha = q2; SA(g, 58, 700); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 10; g.fillText('LIVE AUF', B / 2, 948); g.restore();   // Ziel ist YouTube: der Abspann schickt die Leute zum Kanal
      g.save(); g.globalAlpha = q2; g.translate(B / 2, 1090); g.scale(0.8 + 0.2 * q2, 0.8 + 0.2 * q2); g.drawImage(ch.c, -ch.mitte, -ch.base);
      if (gq >= 0 && gq <= 1) glanz(g, ch, -ch.mitte, -ch.base, gq, 0.85);
      g.restore();
    }
    if (q3 > 0) { g.save(); g.globalAlpha = q3; const hp = passt(g, m.ytHandle || m.handle, 960, 84, RU, 40); neonText(g, m.ytHandle || m.handle, B / 2, 1225, hp, f, RU, 'center'); SA(g, 44, 700); g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('JETZT ABONNIEREN · SIMRACING LIVE', B / 2, 1300); g.restore(); }
  }

  // ═══ 🔴 Stream-Trailer (NEU 20.11.2026): kurzes Hochkant-Video „HEUTE LIVE“ aus dem Streamkalender, ohne eigenen Clip ═══
  // Das Dashboard baut ihn von selbst für die Streams der nächsten 4 Tage und plant ihn 2,5 Stunden vor „Live ab“ ein
  // (als YouTube-Short mit Link zum Stream. Seit 20.11.2026 nur YouTube: Instagram und TikTok haben am Renntag schon den Raceday-Post).
  const TRAILER_T = 8, TRAILER_VOR = 2.5 * 3600000, TRAILER_V = { id: 'trailer', name: 'Stream-Trailer', emoji: '🔴', farbe: '#ff2a2a' };
  // Vorlagen und Farben wechseln von selbst: es kommt immer dran, was am längsten nicht lief (trailerWahl)
  const TR_ARTEN = [
    { id: 'heute', name: 'Heute live', thumb: 3.4 }, { id: 'ampel', name: 'Startampel', thumb: 3.4 }, { id: 'eil', name: 'Eilmeldung', thumb: 3.4 },
    { id: 'frage', name: 'Frage', thumb: 3.4 }, { id: 'count', name: '3 · 2 · 1', thumb: 3.4 }, { id: 'tacho', name: 'Schaltblitz', thumb: 3.4 },
    { id: 'liste', name: 'Zeile für Zeile', thumb: 5.6 }, { id: 'plakat', name: 'Plakat', thumb: 5.6, bild: true }   // Plakat nur mit Bild vom Rennen
  ];
  const TR_FARBEN = ['#ff2a2a', '#18e8ff', '#5cff1f', '#ff4fd8', '#ff7a00', '#ffd400', '#b44dff'];
  const TR_MUSTER = /^trailer([a-z]*)(\d*)$/;
  const trailerV = v => { const mt = TR_MUSTER.exec(v || ''); if (!mt) return null; const a = TR_ARTEN.find(y => y.id === mt[1]) || TR_ARTEN[0]; return { ...TRAILER_V, name: 'Stream-Trailer · ' + a.name, farbe: TR_FARBEN[Number(mt[2] || 0) % TR_FARBEN.length], art: a }; };
  function trailerWahl(clips, rk, hatBild, schon) {   // schon = in diesem Durchlauf gerade vergeben
    const alt = (clips || []).map(c => ({ m: TR_MUSTER.exec(c.vorlage || ''), ms: c.postMs || 0 })).filter(y => y.m).sort((a, b) => b.ms - a.ms);
    const letzteA = [...(schon || []).map(y => y.art.id), ...alt.map(y => y.m[1] || 'heute')], letzteF = [...(schon || []).map(y => y.fi), ...alt.map(y => Number(y.m[2] || 0))];
    let h = 0; for (const ch of String(rk)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rang = (liste, wert) => { const i = liste.indexOf(wert); return i < 0 ? 1e6 : i; }, arten = TR_ARTEN.filter(a => hatBild || !a.bild);
    const beste = (werte, letzte, schluessel) => werte.map((w, i) => [rang(letzte, schluessel(w, i)), (i + h) % werte.length, w, i]).sort((p, q) => q[0] - p[0] || p[1] - q[1])[0];
    return { art: beste(arten, letzteA, a => a.id)[2], fi: beste(TR_FARBEN, letzteF, (w, i) => i)[3] };
  }
  let TR_TMP = null;
  function trailerZeichnen(g, t, x, m, hg) {   // ein Bild des Trailers · 🏁 Team-Logo über allem: x.team (leer = ohne) · steht in x nichts, gilt die gemerkte Einstellung für Trailer
    trailerBild(g, t, x, m, hg);
    teamZeichnen(g, x.team === undefined ? teamStandard('trailer') : x.team, B, H);
  }
  function trailerBild(g, t, x, m, hg) {   // x = { art, farbe, serie, track, zeit, wort, tz, wann } · hg = Bild des Rennens (kann fehlen)
    const art = x.art || 'heute', f = x.farbe || TRAILER_V.farbe, zf = f === '#ffd400' || f === '#ff7a00' ? '#18e8ff' : '#ffd400', frei = art === 'liste' || art === 'plakat';
    const ein = (a, d) => eo(fp(t, a, a + (d || 0.35))), aus = (a, d) => 1 - fp(t, a, a + (d || 0.3)), knall = (a, d) => 1 + 0.8 * (1 - eob(fp(t, a, a + (d || 0.4))));
    const serie = GROSS(x.serie || 'SIMRACING'), strecke = GROSS(x.track || ''), wort = x.wort || 'HEUTE', tz = x.tz || 'HEUTE';
    const iw = hg ? hg.naturalWidth || hg.width : 0, ih = hg ? hg.naturalHeight || hg.height : 0;
    const mitte = (text, y, px, w, farbe) => { g.save(); SA(g, px, w || 800); g.textAlign = 'center'; g.fillStyle = farbe || '#fff'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 12; g.fillText(text, B / 2, y); g.restore(); };
    const chromM = (text, y, px, farbe, sc, dx) => { const ch = chrom(text, px, farbe, 980); g.save(); g.translate(B / 2 + (dx || 0), y); g.scale(sc || 1, sc || 1); g.drawImage(ch.c, -ch.mitte, -ch.base); g.restore(); };
    const neonM = (text, y, px, dx) => { g.save(); const p = passt(g, text, 940, px, RU, 34); neonText(g, text, B / 2 + (dx || 0), y, p, f, RU, 'center'); g.restore(); };
    const bildIn = (kx, ky, kw, kh, r, zoom) => { g.save(); g.beginPath(); g.roundRect(kx, ky, kw, kh, r); g.clip(); g.fillStyle = '#0b0c10'; g.fillRect(kx, ky, kw, kh);
      if (hg) { const s = Math.max(kw / iw, kh / ih) * zoom; g.drawImage(hg, kx + (kw - iw * s) / 2, ky + (kh - ih * s) / 2, iw * s, ih * s); } else logoRing(g, kx + kw / 2, ky + kh / 2, Math.min(kw, kh) * 0.3, f, m.logo, t);
      g.restore(); };
    const rahmen = (kx, ky, kw, kh, r) => { g.save(); g.lineWidth = 6; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 30; g.beginPath(); g.roundRect(kx, ky, kw, kh, r); g.stroke(); g.restore(); };
    const linie = (y, a) => { if (a <= 0) return; g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 22; g.fillRect(B / 2 - 420 * a, y, 840 * a, 5); g.restore(); };
    const lampe = (cx, cy, r, farbe, an) => { g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = an ? farbe : '#1a1d22'; if (an) { g.shadowColor = farbe; g.shadowBlur = r * 0.9; } g.fill();
      if (an) { g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(cx - r * 0.28, cy - r * 0.32, r * 0.28, 0, Math.PI * 2); g.fill(); } g.restore(); };
    // Grund
    g.drawImage(grund(f), 0, 0);
    if (hg && art === 'plakat') {   // Plakat: das Bild groß oben, läuft nach unten aus
      if (!TR_TMP) TR_TMP = leinwand(B, 1200);
      const k = TR_TMP.getContext('2d'), s = Math.max(B / iw, 1200 / ih) * (1.03 + 0.08 * t / TRAILER_T);
      k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, B, 1200); k.drawImage(hg, (B - iw * s) / 2, (1200 - ih * s) / 2, iw * s, ih * s);
      k.globalCompositeOperation = 'destination-in'; const gr = k.createLinearGradient(0, 0, 0, 1200); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(0.2, '#000'); gr.addColorStop(0.58, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      k.fillStyle = gr; k.fillRect(0, 0, B, 1200); k.globalCompositeOperation = 'source-over';
      g.save(); g.globalAlpha = t < 6.2 ? 1 : 1 - fp(t, 6.2, 6.5); g.drawImage(TR_TMP, 0, 0); g.restore();
    } else if (hg) {   // sonst: Bild ganz leicht im Hintergrund
      const s = Math.max(B / iw, H / ih) * (1.06 + 0.05 * t / TRAILER_T);
      g.save(); g.globalAlpha = 0.2; g.drawImage(hg, (B - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s); g.restore();
      g.fillStyle = 'rgba(5,6,9,.5)'; g.fillRect(0, 0, B, H);
    }
    if (t < 6.2 && art === 'eil') {   // Laufband oben
      g.save(); g.globalAlpha = ein(0.05) * aus(5.95, 0.25); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 24; g.fillRect(0, 262, B, 84); g.shadowBlur = 0;
      RU(g, 46); g.fillStyle = '#06080a'; g.textAlign = 'left'; const tx = `+++ ${wort} LIVE +++ ${serie} ${strecke ? '+++ ' + strecke + ' ' : ''}+++ ${x.zeit} UHR `, tw = g.measureText(tx).width;
      g.beginPath(); g.rect(0, 262, B, 84); g.clip(); for (let xx = -((t * 260) % tw); xx < B; xx += tw) g.fillText(tx, xx, 321);
      g.restore();
    } else if (t < 6.2 && !frei) {   // roter Punkt „LIVE“ oben
      g.save(); g.globalAlpha = ein(0.1) * aus(5.95, 0.25); const an = Math.floor(t * 2) % 2 === 0;
      g.fillStyle = an ? '#ff2a2a' : 'rgba(255,42,42,.35)'; g.shadowColor = '#ff2a2a'; g.shadowBlur = an ? 26 : 0; g.beginPath(); g.arc(B / 2 - 96, 318, 17, 0, Math.PI * 2); g.fill(); g.restore();
      g.save(); g.globalAlpha = ein(0.1) * aus(5.95, 0.25); SA(g, 54, 900); g.fillStyle = '#fff'; g.fillText(x.oben || 'LIVE', B / 2 - 62, 337); g.restore();
    }
    if (t < 6.2) {   // unten die ganze Zeit: wo es läuft
      g.save(); g.globalAlpha = ein(0.5) * aus(5.95, 0.25);
      const txt = x.unten || 'LIVE AUF YOUTUBE', bw = pillenBreite(g, txt, 50); pille(g, txt, (B - bw) / 2, 1420, f, 50, true);
      SA(g, 62, 800); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 12; g.fillText(m.ytHandle || m.handle || '@Kreids888', B / 2, 1582);   // über den Texten von Shorts und Reels
      g.restore();
    }
    const a1 = aus(1.45, 0.25);
    if (a1 > 0 && !frei) {   // 1 · Aufhänger (je Vorlage anders)
      g.save(); g.globalAlpha = a1;
      if (art === 'ampel') {   // Startampel: fünf rote Lichter gehen an, dann aus
        g.save(); g.fillStyle = '#0a0c10'; g.strokeStyle = '#2a2f36'; g.lineWidth = 6; g.beginPath(); g.roundRect(70, 590, 940, 250, 40); g.fill(); g.stroke(); g.restore();
        for (let i = 0; i < 5; i++) lampe(B / 2 + (i - 2) * 178, 715, 70, '#ff2a2a', t >= 0.15 + i * 0.25 && t < 1.4);
        chromM(wort + ' LIVE', 1090, 180, f, knall(0.1));
      } else if (art === 'eil') {
        g.save(); g.translate(-(1 - ein(0.05)) * 700, 0); const tx = 'EILMELDUNG', bw = pillenBreite(g, tx, 70); pille(g, tx, (B - bw) / 2, 590, f, 70, true); g.restore();
        if (t > 0.3) chromM(GROSS(m.name || 'KREIDS'), 930, 220, f, knall(0.3));
        if (t > 0.65) { g.save(); g.globalAlpha = a1 * ein(0.65, 0.25); neonM('GEHT ' + (wort !== 'GLEICH' ? wort + ' ' : '') + 'LIVE', 1110, 120); g.restore(); }
      } else if (art === 'frage') {
        g.save(); g.globalAlpha = a1 * ein(0.05); mitte('WAS MACHST DU', 780, 104, 800); g.restore();
        if (t > 0.4) chromM(tz + '?', 1010, 210, f, knall(0.4));
      } else if (art === 'count') {   // 3 · 2 · 1
        mitte(wort + ' LIVE', 1300, 84, 800);
        const i = Math.floor(t / 0.45);
        if (i < 3) { const p = (t - i * 0.45) / 0.45; g.save(); g.globalAlpha = a1 * (1 - fp(p, 0.72, 1)); chromM(String(3 - i), 1090, 540, f, 1.6 - 0.6 * eo(Math.min(1, p * 3))); g.restore(); }
      } else if (art === 'tacho') {   // Schaltblitz: Lichter laufen hoch, dann blinkt es blau
        const n = Math.floor(12.99 * fp(t, 0.1, 1.2)), blau = t >= 1.2, blink = Math.floor(t * 14) % 2 === 0;
        for (let i = 0; i < 12; i++) lampe(B / 2 + (i - 5.5) * 80, 720, 31, blau ? '#3d7bff' : i < 5 ? '#5cff1f' : i < 9 ? '#ffd400' : '#ff2a2a', blau ? blink : i < n);
        chromM('BEREIT?', 1020, 220, f, knall(0.1)); mitte(wort + ' LIVE', 1150, 76, 800);
      } else {
        chromM(wort, 900, 250, f, 1 + 0.9 * (1 - eob(fp(t, 0.05, 0.45))));
        const p2 = fp(t, 0.38, 0.75); if (p2 > 0) { const w2 = x.wort2 || 'LIVE', px2 = passt(g, w2, 960, 300, RU, 80); g.globalAlpha = a1 * Math.min(1, p2 * 2); neonText(g, w2, B / 2, 1170 - (300 - px2) * 0.3, px2 * (0.7 + 0.3 * eob(p2)), f, RU, 'center'); }
      }
      g.restore();
    }
    if (x.modus === 'woche' && t >= 1.5 && t < 6.2) {   // 📅 Wochenvorschau: die Streams der Woche als Liste
      const al = ein(1.5) * aus(5.95, 0.25);
      g.save(); g.globalAlpha = al; mitte('DIESE WOCHE LIVE', 420, 64, 800);
      (x.liste || []).slice(0, 5).forEach((z, i) => {
        const p = ein(1.6 + i * 0.3, 0.35), y = 480 + i * 170; if (p <= 0) return;
        g.save(); g.globalAlpha = al * p; g.translate((1 - p) * (i % 2 ? 500 : -500), 0);
        g.fillStyle = 'rgba(6,8,10,.82)'; g.beginPath(); g.roundRect(60, y, 960, 150, 20); g.fill(); g.lineWidth = 3; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 14; g.stroke(); g.shadowBlur = 0;
        SA(g, 44, 800); g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(z.tag, 92, y + 62); RU(g, 52); g.fillStyle = zf; g.fillText(z.zeit, 92, y + 124);
        passt(g, z.serie, 590, 58, RU, 30); g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(z.serie, 990, y + 96); g.restore();
      });
      g.restore();
    }
    const a2 = ein(1.5) * aus(3.95);
    if (a2 > 0 && !frei && x.modus !== 'woche') {   // 2 · Worum es geht: Bild, Serie, Strecke (drei Aufteilungen)
      const s2 = art === 'eil' || art === 'ampel' ? 'gross' : art === 'frage' || art === 'tacho' ? 'zeilen' : 'karte', zoom = 1.04 + 0.06 * fp(t, 1.5, 4);
      g.save(); g.globalAlpha = a2;
      if (s2 === 'karte') {
        g.translate(0, (1 - ein(1.5)) * 60); bildIn(100, 470, 880, 560, 26, zoom); rahmen(100, 470, 880, 560, 26);
        mitte(tz, 420, 56, 800); chromM(serie, 1210, 128, f); if (strecke) neonM(strecke, 1330, 76);
      } else if (s2 === 'gross') {   // Bild über die ganze Breite
        bildIn(0, 440, B, 640, 0, zoom);
        const gr = g.createLinearGradient(0, 800, 0, 1080); gr.addColorStop(0, 'rgba(5,6,9,0)'); gr.addColorStop(1, 'rgba(5,6,9,.92)'); g.fillStyle = gr; g.fillRect(0, 800, B, 280);
        g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 24; g.fillRect(0, 436, B, 6); g.fillRect(0, 1078, B, 6); g.restore();
        pille(g, tz, 50, 472, f, 48, true);
        const dx = (1 - ein(1.6, 0.4)) * 600; chromM(serie, 1222, 132, f, 1, -dx); if (strecke) neonM(strecke, 1335, 78, dx);
      } else {   // große Zeilen, Bild als Streifen darunter
        const dx = (1 - ein(1.55, 0.4)) * 600;
        mitte(art === 'frage' ? 'ICH FAHRE' : 'AUF DEM PLAN', 520, 64, 800); chromM(serie, 700, 140, f, 1, -dx); linie(745, ein(1.7, 0.4));
        if (strecke) { mitte('STRECKE', 850, 46, 700, 'rgba(255,255,255,.75)'); neonM(strecke, 955, 84, dx); }
        bildIn(100, 1030, 880, 330, 22, zoom); rahmen(100, 1030, 880, 330, 22);
      }
      g.restore();
    }
    const a3 = ein(4.0) * aus(6.0);
    if (a3 > 0 && !frei && x.modus !== 'woche') {   // 3 · Wann (große Uhr oder Tafel)
      g.save(); g.globalAlpha = a3;
      if (x.modus === 'verpasst') {   // ▶ Stream verpasst?: statt der Uhrzeit der Hinweis aufs ganze Video
        mitte('DEN GANZEN STREAM', 720, 76, 800); chromM('ANSEHEN', 1040, 250, zf, 1 + 0.5 * (1 - eob(fp(t, 4.0, 4.4)))); mitte('JETZT AUF YOUTUBE', 1180, 64, 800);
      } else if (art === 'eil' || art === 'ampel' || art === 'count') {
        [['TAG', GROSS(x.wann || tz)], ['LIVE AB', x.zeit + ' UHR'], ['RENNEN', serie]].forEach((z, i) => {
          const p = ein(4.0 + i * 0.18, 0.35), y = 520 + i * 250, haupt = i === 1; if (p <= 0) return;
          g.save(); g.globalAlpha = a3 * p; g.translate((1 - p) * (i % 2 ? 500 : -500), 0);
          g.fillStyle = 'rgba(6,8,10,.82)'; g.beginPath(); g.roundRect(70, y, 940, 215, 22); g.fill(); g.lineWidth = haupt ? 6 : 3; g.strokeStyle = haupt ? zf : f; g.shadowColor = haupt ? zf : f; g.shadowBlur = haupt ? 34 : 14; g.stroke(); g.shadowBlur = 0;
          SA(g, 40, 700); g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(z[0], 110, y + 58);
          if (haupt) { const ch = chrom(z[1], 128, zf, 860); g.drawImage(ch.c, B / 2 - ch.mitte, y + 184 - ch.base); }
          else { passt(g, z[1], 860, 92, RU, 36); g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(z[1], B / 2, y + 162); }
          g.restore();
        });
      } else {
        mitte(art === 'frage' ? 'DANN KOMM VORBEI' : 'LIVE AB', 720, art === 'frage' ? 72 : 84, 800);
        chromM(x.zeit, 1040, 340, zf, 1 + 0.5 * (1 - eob(fp(t, 4.0, 4.4))));
        mitte('UHR · ' + tz, 1180, 64, 800);
        if (x.wann) mitte(GROSS(x.wann), 1270, 46, 700, 'rgba(255,255,255,.8)');
      }
      g.restore();
    }
    if (art === 'liste' && t < 6.2) {   // Zeile für Zeile: alles baut sich untereinander auf und bleibt stehen
      const al = aus(5.95, 0.25), rein = (a, links) => (1 - ein(a, 0.3)) * (links ? -1000 : 1000);
      g.save(); g.globalAlpha = al;
      if (t > 0.1) chromM(wort, 470, 230, f, 1, rein(0.1, true));
      if (t > 0.55) neonText(g, 'LIVE', B / 2 + rein(0.55, false), 690, 220, f, RU, 'center');
      if (t > 1.5) { linie(745, ein(1.5, 0.4)); chromM(serie, 910, 124, f, 1, rein(1.5, true)); }
      if (t > 2.4 && strecke) neonM(strecke, 1020, 76, rein(2.4, false));
      if (t > 4.0) { linie(1065, ein(4.0, 0.4)); chromM(x.zeit, 1290, 230, zf, 1 + 0.5 * (1 - eob(fp(t, 4.0, 4.4)))); g.save(); g.globalAlpha = al * ein(4.3); mitte('UHR · ' + GROSS(x.wann || tz), 1375, 50, 800); g.restore(); }
      g.restore();
    }
    if (art === 'plakat' && t < 6.2) {   // Plakat: großes Bild, die Zeilen kommen nacheinander dazu
      const al = aus(5.95, 0.25);
      g.save(); g.globalAlpha = al;
      g.save(); g.translate(0, -(1 - ein(0.15)) * 260); const tx = wort + ' LIVE', bw = pillenBreite(g, tx, 76); pille(g, tx, (B - bw) / 2, 230, f, 76, true); g.restore();
      if (t > 0.8) { g.save(); g.globalAlpha = al * ein(0.8, 0.25); chromM(serie, 980, 150, f, knall(0.8)); g.restore(); }
      if (t > 1.5 && strecke) { g.save(); g.globalAlpha = al * ein(1.5); neonM(strecke, 1085, 78); g.restore(); }
      if (t > 2.6) { g.save(); g.globalAlpha = al * ein(2.6, 0.25); linie(1130, ein(2.6, 0.4)); chromM(x.zeit + ' UHR', 1300, 170, zf, t < 3.2 ? knall(2.6) : 1 + 0.025 * Math.sin((t - 3.2) * 6)); mitte(GROSS(x.wann || tz), 1370, 46, 700, 'rgba(255,255,255,.85)'); g.restore(); }
      g.restore();
    }
    if (art === 'ampel' || art === 'count' || art === 'tacho') { const bl = fp(t, 1.38, 1.44) * (1 - fp(t, 1.44, 1.8)); if (bl > 0) { g.fillStyle = `rgba(255,255,255,${(0.5 * bl).toFixed(3)})`; g.fillRect(0, 0, B, H); } }   // Blitz beim Start
    if (t >= 6.2) outroZeichnen(g, t - 6.2, m, f);   // 4 · Wohin: Abspann wie bei den Clips (YouTube)
    g.fillStyle = f; g.fillRect(0, H - 14, B * kl(t / TRAILER_T, 0, 1), 14);
  }
  // 🎵 Musik und 🔊 Effekt-Töne für Trailer (NEU 21.11.2026): im Editor ein- und ausschaltbar. Standard: Effekte an, Musik aus.
  const TR_MUSIK = [['ohne', 'Ohne'], ['drive', 'Synthwave'], ['house', 'House'], ['trap', 'Trap'], ['kino', 'Kino'], ['chill', 'Lo-Fi'], ['chip', '8-Bit']];
  const TR_MUSIK_CACHE = new Map(), notenHz = n => 440 * Math.pow(2, (n - 69) / 12);
  const tonStandard = () => { try { const t = JSON.parse(localStorage.getItem('k888_trailer_ton') || 'null'); if (t && typeof t === 'object') return { effekte: t.effekte !== false, musik: TR_MUSIK.some(y => y[0] === t.musik) ? t.musik : 'ohne' }; } catch (e) { /* Standard */ } return { effekte: true, musik: 'ohne' }; };
  function trMusik(art, D) {   // 🎵 Musik für Trailer (wie bei SPR Insta), je Stil einmal gerechnet · [links, rechts]
    const mk = art + '|' + D;
    if (!TR_MUSIK_CACHE.has(mk)) TR_MUSIK_CACHE.set(mk, (async () => {
      const c = new OfflineAudioContext(2, TON_RATE * D, TON_RATE), komp = c.createDynamicsCompressor(), bus = c.createGain(), zr = zufallR(1234);
      const S = { r: zr, rausch: (t, d) => { const q = c.createBufferSource(); q.buffer = rauschen(c); q.loop = true; q.start(Math.max(0, t), zr() * 1.5); q.stop(t + d + 0.05); return q; } };
      komp.threshold.value = -18; komp.knee.value = 10; komp.ratio.value = 3.5; komp.attack.value = 0.005; komp.release.value = 0.18; bus.connect(komp); komp.connect(c.destination);
      const raus = (k, pan) => { if (pan) { const p = c.createStereoPanner(); p.pan.value = kl(pan, -1, 1); k.connect(p); p.connect(bus); } else k.connect(bus); };
      const env = (g, t, a, d, v) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * 0.3), t + a + d * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + a + d); };
      const ton = (t, f, d, typ, v, cut, pan) => { if (t >= D) return; const o = c.createOscillator(), g = c.createGain(); o.type = typ; o.frequency.value = f; env(g, t, 0.004, d, v); let e = o; if (cut) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; o.connect(lp); e = lp; } e.connect(g); raus(g, pan); o.start(t); o.stop(t + d + 0.06); };
      const lang = (t, f, d, typ, v, cut, pan) => { const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(), e = Math.min(D, t + d); o.type = typ; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = cut || 8000; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.35, d * 0.3)); g.gain.setValueAtTime(v, Math.max(t + d * 0.3, e - 0.3)); g.gain.linearRampToValueAtTime(0.0001, e); o.connect(lp); lp.connect(g); raus(g, pan); o.start(t); o.stop(e + 0.05); };
      const flaeche = (t, noten, d, v, cut) => noten.forEach(n => { lang(t, notenHz(n) * 0.997, d, 'sawtooth', v / noten.length / 2, cut, -0.35); lang(t, notenHz(n) * 1.004, d, 'sawtooth', v / noten.length / 2, cut, 0.35); });
      const kick = (t, v = 1, tief) => { if (t >= D) return; const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(tief ? 110 : 165, t); o.frequency.exponentialRampToValueAtTime(tief ? 38 : 46, t + 0.11); env(g, t, 0.002, tief ? 0.45 : 0.24, 0.45 * v); o.connect(g); raus(g); o.start(t); o.stop(t + 0.7); rsch(t, 0.02, 'bandpass', 2800, 0.3 * v, 0.8); ton(t, tief ? 150 : 210, 0.07, 'triangle', 0.3 * v); };
      const rsch = (t, d, typ, f, v, q, pan) => { if (t >= D) return; const n = S.rausch(t, d), fl = c.createBiquadFilter(), g = c.createGain(); fl.type = typ; fl.frequency.value = f; fl.Q.value = q || 0.7; env(g, t, 0.001, d, v); n.connect(fl); fl.connect(g); raus(g, pan); };
      const snare = (t, v = 1) => { rsch(t, 0.17, 'bandpass', 1900, 0.8 * v, 0.7); rsch(t, 0.1, 'highpass', 5000, 0.3 * v); ton(t, 185, 0.09, 'triangle', 0.3 * v); };
      const clap = (t, v = 1) => { for (const dt of [0, 0.011, 0.024]) rsch(t + dt, 0.11, 'bandpass', 1350, 0.6 * v, 1.1); };
      const hat = (t, v = 1, offen) => rsch(t, offen ? 0.2 : 0.04, 'highpass', 7000, 0.34 * v, 0.7, offen ? 0.2 : -0.15);
      const akkord = (t, noten, d, typ, v, cut) => noten.forEach((n, i) => ton(t, notenHz(n) * (i % 2 ? 1.003 : 0.997), d, typ, v / noten.length, cut, (i - (noten.length - 1) / 2) * 0.25));
      const takte = (bpm, fn) => { const s = 60 / bpm / 4, n = Math.ceil(D / (s * 16) - 0.01); for (let b = 0; b < n; b++) fn(b, b * s * 16, s, n); };
      const pat = (m, t0, s, fn) => { for (let i = 0; i < m.length; i++) if (m[i] !== '.') fn(t0 + i * s, m[i] === 'X' ? 1 : 0.55, i); };
      const dur = (r, moll) => [r, r + (moll ? 3 : 4), r + 7];
      if (art === 'drive') takte(96, (b, t0, s) => {   // Synthwave: 4 Takte Am · F · C · G
        const [r, moll] = [[45, 1], [41, 0], [48, 0], [43, 0]][b % 4], ak = dur(r + 12, moll);
        pat('X...X...X...X...', t0, s, t => kick(t));
        pat('....X.......X...', t0, s, t => snare(t, 0.9));
        pat('..X...X...X...X.', t0, s, t => hat(t, 1.2, true));
        pat('x.x.x.x.x.x.x.x.', t0, s, t => hat(t, 0.6));
        pat('X.xxX.xxX.xxX.xx', t0, s, (t, v) => { ton(t, notenHz(r), s * 1.1, 'sawtooth', 0.2 * v, 900); ton(t, notenHz(r + 12), s * 1.1, 'square', 0.1 * v, 1400); });
        for (let i = 0; i < 16; i++) ton(t0 + i * s, notenHz(ak[i % 3] + 12 + (i % 6 > 2 ? 12 : 0)), s * 1.8, 'square', 0.15, 3200, i % 2 ? 0.45 : -0.45);
        flaeche(t0, ak, s * 16, 0.5, 1500);
      });
      else if (art === 'house') takte(120, (b, t0, s) => {   // House: 5 Takte Cm · As · Es · B · Cm
        const [r, moll] = [[48, 1], [44, 0], [51, 0], [46, 0], [48, 1]][b % 5], ak = [...dur(r + 12, moll), r + 12 + (moll ? 10 : 11)];
        pat('X...X...X...X...', t0, s, t => kick(t));
        pat('....X.......X...', t0, s, t => clap(t));
        pat('..X...X...X...X.', t0, s, t => hat(t, 1.3, true));
        pat('x.xxx.xxx.xxx.xx', t0, s, t => hat(t, 0.5));
        pat('..X..x.X..X..x.X', t0, s, (t, v) => { ton(t, notenHz(r - 12), s * 1.3, 'square', 0.1 * v, 700); ton(t, notenHz(r), s * 1.3, 'sawtooth', 0.14 * v, 1400); });
        pat('X..X..X...X..X..', t0, s, (t, v) => akkord(t, ak, s * 1.8, 'sawtooth', 0.75 * v, 3000));
        flaeche(t0, ak.slice(0, 3), s * 16, 0.3, 1600);
      });
      else if (art === 'trap') takte(144, (b, t0, s) => {   // Trap (halbes Tempo): tiefer Bass, schnelle Hi-Hats
        const r = [33, 33, 29, 29, 31, 31][b % 6], zwei = b % 2;
        pat(zwei ? '..X...X.....X...' : 'X.....X...X.....', t0, s, t => { kick(t, 1, true); ton(t, notenHz(r + 12), 0.55, 'sine', 0.2); ton(t, notenHz(r + 24), 0.45, 'triangle', 0.24); ton(t, notenHz(r + 36), 0.3, 'sawtooth', 0.08, 1200); });
        if (zwei) pat('X...............', t0, s, t => { snare(t); clap(t, 0.7); });
        pat(zwei ? 'x.x.x.x.x.x.x...' : 'x.x.x.x.x.x.x.x.', t0, s, t => hat(t, 0.9));
        if (zwei) for (let k = 0; k < 6; k++) hat(t0 + 13 * s + k * s / 2, 0.5 + k * 0.1);
        pat(zwei ? 'X.....x...X.....' : 'X..x..X.....x...', t0, s, (t, v, i) => ton(t, notenHz([69, 72, 76, 74, 67][(b * 3 + i) % 5] + 12), 0.7, 'triangle', 0.42 * v, 0, i % 2 ? 0.4 : -0.4));
        if (!zwei) flaeche(t0, [r + 24, r + 27, r + 31], s * 32, 0.3, 1400);
      });
      else if (art === 'kino') {   // Kino: Bordun, Streicher-Ostinato, Trommeln, wird lauter
        lang(0, notenHz(38), D, 'sawtooth', 0.1, 500); lang(0, notenHz(50), D, 'sawtooth', 0.1, 800);
        takte(96, (b, t0, s, n) => {
          const [r, moll] = [[50, 1], [46, 0], [53, 0], [48, 0]][b % 4], laut = 0.6 + 0.4 * b / Math.max(1, n - 1), m = moll ? [0, 0, 3, 0, 7, 0, 3, 2] : [0, 0, 4, 0, 7, 0, 4, 2];
          for (let i = 0; i < 8; i++) { ton(t0 + i * 2 * s, notenHz(r + m[i]), s * 1.7, 'sawtooth', 0.42 * laut, 2400, -0.3); ton(t0 + i * 2 * s, notenHz(r + m[i] + 12), s * 1.7, 'sawtooth', 0.24 * laut, 3400, 0.3); }
          pat(b % 2 ? 'X.....x.X.x.X.xx' : 'X.....x.X...x.x.', t0, s, (t, v) => { kick(t, v * laut, true); rsch(t, 0.25, 'lowpass', 300, 0.3 * v * laut); });
          pat('x.x.x.x.x.x.x.x.', t0, s, t => hat(t, 0.35 * laut));
          flaeche(t0, dur(r + 12, moll), s * 16, 0.4 * laut, 1800);
        });
      } else if (art === 'chill') takte(72, (b, t0, s) => {   // Lo-Fi: 3 Takte Fmaj7 · Em7 · Dm7, weiche Tasten, Knistern
        const [r, moll] = [[53, 0], [52, 1], [50, 1]][b % 3], ak = [r, r + (moll ? 3 : 4), r + 7, r + (moll ? 10 : 11)];
        pat('X.....x...X.....', t0, s, (t, v) => kick(t, 0.75 * v));
        pat('....X.......X...', t0, s, t => { rsch(t, 0.09, 'bandpass', 2600, 0.3, 1.5); ton(t, 320, 0.05, 'triangle', 0.14); });
        for (let i = 0; i < 8; i++) hat(t0 + i * 2 * s + (i % 2 ? s * 0.28 : 0), 0.55);
        [0, 6, 10].forEach((i, k) => ak.forEach((n, j) => { ton(t0 + i * s + j * 0.012, notenHz(n + 12), k ? 0.9 : 1.8, 'sine', 0.2, 0, (j - 1.5) * 0.2); ton(t0 + i * s + j * 0.012, notenHz(n + 12), k ? 0.6 : 1.2, 'triangle', 0.14, 2600, (j - 1.5) * 0.2); }));
        pat('X.........x.X...', t0, s, (t, v) => ton(t, notenHz(r - 12), 0.7, 'triangle', 0.24 * v, 900));
        for (let k = 0; k < 14; k++) rsch(t0 + S.r() * s * 16, 0.008, 'highpass', 4500, 0.05 + S.r() * 0.05);
      });
      else if (art === 'chip') takte(144, (b, t0, s) => {   // 8-Bit: Rechteck-Arpeggios, Rausch-Trommel
        const [r, moll] = [[60, 0], [55, 0], [57, 1], [53, 0], [60, 0], [55, 0]][b % 6], ar = moll ? [0, 3, 7, 12] : [0, 4, 7, 12];
        for (let i = 0; i < 16; i++) ton(t0 + i * s, notenHz(r + ar[i % 4] + (i % 8 > 3 ? 12 : 0)), s * 1.1, 'square', 0.11, 0, i % 2 ? 0.3 : -0.3);
        pat('X.X.X.X.X.X.X.X.', t0, s, (t, v, i) => ton(t, notenHz(r - 12 + (i % 4 === 2 ? 12 : 0)), s * 1.8, 'triangle', 0.3));
        pat('X...X...X...X...', t0, s, t => { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.08); env(g, t, 0.001, 0.1, 0.3); o.connect(g); raus(g); o.start(t); o.stop(t + 0.15); });
        pat('....X.......X..x', t0, s, (t, v) => rsch(t, 0.07, 'highpass', 3000, 0.3 * v));
        pat(b % 2 ? 'X..X..X.X...X...' : 'X...X..X..X.X.X.', t0, s, (t, v, i) => ton(t, notenHz(r + 24 + ar[(i * 5 + b) % 4]), s * 2.6, 'square', 0.14));
      });
      const buf = await c.startRendering();
      let summe = 0, spitze = 0;
      for (let k = 0; k < 2; k++) { const d = buf.getChannelData(k); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > spitze) spitze = v; summe += v * v; } }
      const rms = Math.sqrt(summe / (buf.length * 2)) || 1e-6, fak = Math.min(0.55 / (spitze || 1), 0.1 / rms), ein = TON_RATE * 0.02, aus = TON_RATE * 0.25;
      return [0, 1].map(k => { const d = buf.getChannelData(k), o = new Float32Array(d.length), n = d.length; for (let i = 0; i < n; i++) o[i] = d[i] * fak * Math.min(1, i / ein, (n - i) / aus); return o; });
    })());
    return TR_MUSIK_CACHE.get(mk);
  }

  async function trailerTon(art, opt) {   // Effekt-Töne (Schläge an den Schnitten, Zischer davor, je Vorlage ein eigener Anfang) + auf Wunsch Musik
    const ton = opt || tonStandard(), mitMusik = !!ton.musik && ton.musik !== 'ohne';
    const ctx = new OfflineAudioContext(2, TON_RATE * TRAILER_T, TON_RATE), komp = ctx.createDynamicsCompressor(), ziel = ctx.createGain(); komp.connect(ctx.destination);
    ziel.gain.value = ton.effekte === false ? 0 : mitMusik ? 0.7 : 1; ziel.connect(komp);   // mit Musik die Effekte etwas leiser, damit nichts übersteuert
    if (mitMusik) { const [li, re] = await trMusik(ton.musik, TRAILER_T), b = ctx.createBuffer(2, li.length, TON_RATE), q = ctx.createBufferSource(); b.copyToChannel(li, 0); b.copyToChannel(re, 1); const mg = ctx.createGain(); mg.gain.value = 0.85; q.buffer = b; q.connect(mg); mg.connect(ctx.destination); q.start(0); }
    const rausch = (t, d, typ, f0, f1, v) => { const n = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gg = ctx.createGain(); n.buffer = rauschen(ctx); n.loop = true; fl.type = typ; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
      gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(v, t + d * 0.85); gg.gain.linearRampToValueAtTime(0.0001, t + d); n.connect(fl); fl.connect(gg); gg.connect(ziel); n.start(t); n.stop(t + d + 0.05); };
    const schlag = (t, v) => { const o = ctx.createOscillator(), gg = ctx.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22); gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(v, t + 0.008); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); o.connect(gg); gg.connect(ziel); o.start(t); o.stop(t + 0.6);
      const n = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g2 = ctx.createGain(); n.buffer = rauschen(ctx); n.loop = true; fl.type = 'bandpass'; fl.frequency.value = 1900; g2.gain.setValueAtTime(v * 0.45, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); n.connect(fl); fl.connect(g2); g2.connect(ziel); n.start(t); n.stop(t + 0.2); };
    const piep = (t, hz, d, v, typ) => { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = typ || 'square'; o.frequency.value = hz; gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(v, t + 0.006); gg.gain.setValueAtTime(v, t + d * 0.7); gg.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(gg); gg.connect(ziel); o.start(t); o.stop(t + d + 0.02); };
    let schnitt = 0.6;
    if (art === 'ampel') { for (let i = 0; i < 5; i++) piep(0.15 + i * 0.25, 440, 0.13, 0.14); piep(1.4, 880, 0.45, 0.16); schnitt = 0.9; }
    else if (art === 'eil') { piep(0.05, 880, 0.35, 0.16, 'sine'); piep(0.22, 660, 0.5, 0.16, 'sine'); schlag(0.3, 0.8); schlag(0.65, 0.6); }
    else if (art === 'frage') { schlag(0.05, 0.5); schlag(0.4, 0.9); }
    else if (art === 'count') { for (let i = 0; i < 3; i++) { schlag(i * 0.45 + 0.02, 0.85); piep(i * 0.45 + 0.02, 520, 0.1, 0.08); } piep(1.36, 1040, 0.3, 0.14); schnitt = 0.9; }
    else if (art === 'tacho') {   // Motor dreht hoch, dann piept der Schaltblitz
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), gg = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, 0.1); o.frequency.exponentialRampToValueAtTime(330, 1.2); fl.type = 'lowpass'; fl.frequency.setValueAtTime(500, 0.1); fl.frequency.exponentialRampToValueAtTime(1800, 1.2);
      gg.gain.setValueAtTime(0.0001, 0.1); gg.gain.linearRampToValueAtTime(0.2, 1.1); gg.gain.linearRampToValueAtTime(0.0001, 1.24); o.connect(fl); fl.connect(gg); gg.connect(ziel); o.start(0.1); o.stop(1.26);
      for (let k = 0; k < 3; k++) piep(1.22 + k * 0.09, 1800, 0.05, 0.1); schnitt = 0.9;
    }
    else if (art === 'liste') { schlag(0.1, 0.9); schlag(0.55, 0.8); schlag(2.4, 0.6); }
    else if (art === 'plakat') { schlag(0.15, 0.8); schlag(0.8, 0.9); schlag(2.6, 0.7); }
    else { schlag(0.05, 0.9); schlag(0.38, 0.8); }
    if (schnitt < 0.9) rausch(1.15, 0.35, 'bandpass', 500, 4200, 0.22);
    schlag(1.5, schnitt);
    rausch(3.35, 0.65, 'bandpass', 400, 5000, 0.28); schlag(4.0, 0.95);
    for (let z = 4.6; z < 5.9; z += 0.5) piep(z, 1400, 0.05, 0.06);
    rausch(5.8, 0.4, 'bandpass', 500, 4200, 0.22); schlag(6.2, 0.85);
    return ctx.startRendering();
  }
  async function trailerBauen(x, m, hg, fortschritt) {
    if (!window.VideoEncoder) throw new Error('Dieser Browser kann keine Videos bauen. Bitte Chrome oder Edge nehmen.');
    await Promise.all([muxerLaden(), schriften(), teamLaden()]);
    let vcfg = null;
    for (const hw of ['prefer-software', 'no-preference']) {
      for (const codec of ['avc1.640028', 'avc1.640032', 'avc1.4d0028', 'avc1.42e028']) {
        const k = { codec, width: B, height: H, bitrate: 9000000, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' }, hardwareAcceleration: hw };
        try { if ((await VideoEncoder.isConfigSupported(k)).supported) { vcfg = k; break; } } catch (e) { /* weiter */ }
      }
      if (vcfg) break;
    }
    if (!vcfg) throw new Error('Dieser Browser kann kein H.264. Bitte Chrome oder Edge nehmen.');
    let acfg = null;
    if (window.AudioEncoder) for (const br of [192000, 160000, 128000]) { const k = { codec: 'mp4a.40.2', sampleRate: TON_RATE, numberOfChannels: 2, bitrate: br }; try { if ((await AudioEncoder.isConfigSupported(k)).supported) { acfg = k; break; } } catch (e) { /* weiter */ } }
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: B, height: H, frameRate: FPS },
      audio: acfg ? { codec: 'aac', numberOfChannels: 2, sampleRate: TON_RATE } : undefined, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
    let fehler = null;
    const enc = new VideoEncoder({ output: (ch, md) => muxer.addVideoChunk(ch, md), error: e => { fehler = e; } });
    enc.configure(vcfg);
    const cv = leinwand(B, H), g = cv.getContext('2d', { willReadFrequently: true }), puffer = new Uint8Array(B * H * 3 / 2), cs = { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false };
    const n = Math.round(TRAILER_T * FPS);
    for (let i = 0; i < n; i++) {
      if (fehler) throw fehler;
      g.clearRect(0, 0, B, H); trailerZeichnen(g, i / FPS, x, m, hg);
      zuI420(g.getImageData(0, 0, B, H).data, B, H, puffer);
      const fr = new VideoFrame(puffer, { format: 'I420', codedWidth: B, codedHeight: H, timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS), colorSpace: cs });
      enc.encode(fr, { keyFrame: i % FPS === 0 }); fr.close();
      for (const w0 = performance.now(); enc.encodeQueueSize > 8;) { if (fehler) throw fehler; if (performance.now() - w0 > 30000) throw new Error('Der Video-Baustein vom Browser hängt.'); await new Promise(r => setTimeout(r, 15)); }
      if (fortschritt && i % 10 === 0) fortschritt(i / n);
    }
    await enc.flush(); enc.close();
    if (fehler) throw fehler;
    if (acfg) {
      const ton = await trailerTon(x.art, x.ton), aenc = new AudioEncoder({ output: (ch, md) => muxer.addAudioChunk(ch, md), error: e => { fehler = e; } });
      aenc.configure(acfg);
      const N = ton.length, li = ton.getChannelData(0), re = ton.getChannelData(1), BL = 4800;
      for (let i = 0; i < N; i += BL) {
        const k = Math.min(BL, N - i), d = new Float32Array(k * 2); d.set(li.subarray(i, i + k), 0); d.set(re.subarray(i, i + k), k);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: TON_RATE, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(i * 1e6 / TON_RATE), data: d });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
      if (fehler) throw fehler;
    }
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    blob.mitTon = !!acfg; blob.dauer = TRAILER_T;
    return blob;
  }
  // Trailer für die nächsten Streams bauen und einplanen (läuft von selbst, wenn der Reiter „🎬 Clips“ offen ist)
  let TRAILER_LAEUFT = false; const TRAILER_FERTIG = new Set();
  async function trailerPruefen() {
    const st = stand();
    if (TRAILER_LAEUFT || ARBEIT || CLIPS.length || !window.VideoEncoder || !Array.isArray(st.streams) || (st.clipcfg || {}).trailer === false) return;
    if (!(st.youtube && st.youtube.verbunden)) return;   // der Trailer geht nur zu YouTube (Instagram und TikTok haben am Renntag schon den Raceday-Post)
    const jetzt = Date.now(), gesehen = new Set(), offen = [], weg = [], raus = c => !!(c.gepostet || c.tt || c.yt);
    let umgestellt = false;   // schon gebaute Trailer: Instagram und TikTok abwählen, damit nichts doppelt kommt
    for (const c of st.clips || []) if (c.trailer && !c.einst && c.youtube && (c.insta || c.tiktok) && !raus(c)) { try { await UMG.igApi('POST', `/api/clip/${c.id}/aendern`, { insta: false, tiktok: false }); umgestellt = true; } catch (e) { /* bleibt wie es ist */ } }
    for (const p of st.streams) {
      const rk = p.rennKey; if (!rk || gesehen.has(rk) || !p.liveMs) continue; gesehen.add(rk);
      const postMs = p.liveMs - TRAILER_VOR, da = (st.clips || []).filter(c => c.trailer === rk);
      const passt2 = da.some(c => raus(c) || (c.video && Math.abs((c.trailerLive || 0) - p.liveMs) < 60000));   // ohne Video = Hochladen ging schief
      if (!passt2) for (const c of da) weg.push(c.id);   // Stream verschoben: alter Trailer stimmt nicht mehr → ersetzen
      if (postMs < jetzt + 10 * 60000 || p.liveMs > jetzt + 4 * 86400000 || passt2 || TRAILER_FERTIG.has(rk + p.liveMs)) continue;
      offen.push({ rk, p, postMs });
    }
    if (!offen.length && !weg.length) { if (umgestellt) await UMG.laden(); return; }
    TRAILER_LAEUFT = true;
    try {
      for (const id of weg) { try { await UMG.igApi('POST', `/api/clip/${id}/weg`, {}); } catch (e) { /* bleibt als Fehler in der Liste */ } }
      const m = MAT || await material(), dz = ms => new Date(ms), schon = [];
      for (const o of offen.slice(0, 2)) {
        const p = o.p, serie = p.serie || p.titel || 'Simracing', uhr = dz(p.liveMs).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
        const tagVon = ms => dz(ms).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }), std = Number(uhr.slice(0, 2)), heute = tagVon(o.postMs) === tagVon(p.liveMs);
        const x = { serie, track: p.track || '', zeit: uhr, wort: heute ? 'HEUTE' : 'GLEICH', tz: !heute ? 'GLEICH' : std >= 17 ? 'HEUTE ABEND' : std >= 12 ? 'HEUTE NACHMITTAG' : 'HEUTE',
          wann: dz(p.liveMs).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: '2-digit' }) };
        arbeit(`🔴 Trailer für ${serie} wird gebaut …`);
        let hg = null; try { if (p.hg) hg = await bild(p.hg); } catch (e) { hg = null; }
        const w = trailerWahl(st.clips, o.rk, !!hg, schon); schon.unshift(w); x.art = w.art.id; x.farbe = TR_FARBEN[w.fi];   // Vorlage und Farbe wechseln von selbst
        const blob = await trailerBauen(x, m, hg, q => arbeit(`🔴 Trailer für ${serie} wird gebaut … ${Math.round(q * 100)} %`));
        arbeit('⬆ Trailer wird hochgeladen …');
        const r = await UMG.igApi('POST', '/api/clip/neu', { vorlage: 'trailer' + w.art.id + w.fi, auto: true, trailer: o.rk, trailerLive: p.liveMs, titel: `${x.wort} LIVE · ${GROSS(serie)}`.slice(0, 80),
          text: `🔴 ${heute ? 'Heute' : 'Gleich'} live: ${serie}${p.track ? ' · ' + p.track : ''} · ${uhr} Uhr\nSchaltet ein!\n\n#simracing #iracing #live #kreids888`, postMs: o.postMs, insta: false,
          tiktok: false, youtube: true, test: false, thumbMs: Math.round(w.art.thumb * 1000), dauer: TRAILER_T });
        await hochladen(r.id, blob);
        try { const cv = leinwand(B, H); trailerZeichnen(cv.getContext('2d'), w.art.thumb, x, m, hg); const k = leinwand(540, 960); k.getContext('2d').drawImage(cv, 0, 0, 540, 960); const vb = await new Promise(ok => k.toBlob(ok, 'image/jpeg', 0.85)); if (vb) await senden(`/api/clip/${r.id}/bild`, vb); } catch (e) { /* Vorschaubild ist nur schön */ }
        TRAILER_FERTIG.add(o.rk + p.liveMs);
        UMG.meldung((st.clipcfg || {}).freigabe !== false ? '🔴 Trailer gebaut. Er wartet oben bei „🤖 Automatik“ auf deine Freigabe.' : `🔴 Trailer eingeplant: ${zeit(o.postMs)}`);
      }
      ARBEIT = ''; await UMG.laden();
    } catch (e) { ARBEIT = ''; zeichnen(); console.warn('Trailer nicht gebaut:', e && e.message); }
    finally { TRAILER_LAEUFT = false; }
  }

  // ═══ 🖼 Karussells (NEU 20.11.2026): Bilder zum Wischen (Instagram, auf Wunsch auch TikTok als Foto-Entwurf). Bauen sich von selbst, wenn der Reiter „🎬 Clips“ offen ist ═══
  //   🏆 Top 5 der Woche: die Clips mit den meisten Aufrufen. (Rennabend und „Tag 2/Tag 3“ sind wieder raus: keine Wiederholungen.)
  const KB = 1080, KH = 1350, GOLD = '#ffd400';
  const KAR_V = { kartop5: { emoji: '🏆', name: 'Top 5 der Woche', farbe: GOLD }, karabend: { emoji: '🏁', name: 'Rennabend', farbe: '#5cff1f' }, karbilder: { emoji: '📸', name: 'Fotos', farbe: '#18e8ff' } };
  const karV = v => (KAR_V[v] ? { id: v, ...KAR_V[v] } : /^kar/.test(v || '') ? { id: v, emoji: '🖼', name: 'Karussell', farbe: '#18e8ff' } : null);
  const kMitte = (g, text, y, px, w, farbe) => { g.save(); SA(g, px, w || 800); g.textAlign = 'center'; g.fillStyle = farbe || '#fff'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 12; g.fillText(text, KB / 2, y); g.restore(); };
  const kChrom = (g, text, y, px, farbe, maxB) => { const ch = chrom(text, px, farbe, maxB || 960); g.drawImage(ch.c, KB / 2 - ch.mitte, y - ch.base); };
  const kNeon = (g, text, y, px, f) => { g.save(); const p = passt(g, text, 940, px, RU, 30); neonText(g, text, KB / 2, y, p, f, RU, 'center'); g.restore(); };
  function kBild(g, img, x, y, w, h, r, f, m) {   // Bild im Neon-Rahmen (ohne Bild: Logo)
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, r); g.clip(); g.fillStyle = '#0b0c10'; g.fillRect(x, y, w, h);
    if (img) { const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.max(w / iw, h / ih); g.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s); }
    else logoRing(g, x + w / 2, y + h / 2, Math.min(w, h) * 0.3, f, m.logo, 0);
    g.restore();
    g.save(); g.lineWidth = 6; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 30; g.beginPath(); g.roundRect(x, y, w, h, r); g.stroke(); g.restore();
  }
  function kKarte(g, x, y, w, h, f, stark) { g.save(); g.fillStyle = 'rgba(6,8,10,.82)'; g.beginPath(); g.roundRect(x, y, w, h, 22); g.fill(); g.lineWidth = stark ? 6 : 3; g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = stark ? 30 : 14; g.stroke(); g.restore(); }
  function karKopf(g, m, f, nr, n) {   // Kopf jeder Seite: Logo, Kanal, Seitenzahl
    logoRing(g, 104, 104, 54, f, m.logo, 0);
    const kanal = m.ytHandle || m.handle || '@Kreids888';
    g.save(); SA(g, 46, 800); g.fillStyle = '#fff'; g.textAlign = 'left'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 10; g.fillText(kanal, 180, 120); g.restore();
    const st = `${nr}/${n}`; pille(g, st, KB - 60 - pillenBreite(g, st, 40), 72, f, 40, false);
  }
  function karSeite(m, f, nr, n, mal, team) {   // eine Seite 1080×1350: Neon-Grund, Kopf (Logo, Kanal, Seite), Fuß (YouTube) · team = 🏁 Team-Logo über allem
    const c = leinwand(KB, KH), g = c.getContext('2d'), letzte = nr === n;
    g.drawImage(grund(f), 0, -(H - KH) / 2);
    karKopf(g, m, f, nr, n);
    mal(g);
    pille(g, letzte ? 'JETZT ABONNIEREN' : 'LIVE AUF YOUTUBE', 60, KH - 132, f, 44, true);
    g.save(); SA(g, 46, 800); g.textAlign = 'right'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 10; g.fillText(letzte ? (m.ytHandle || '@Kreids888') : 'WISCHEN »', KB - 60, KH - 82); g.restore();
    teamZeichnen(g, team, KB, KH);
    return c;
  }
  const zahlText = v => Number(v || 0).toLocaleString('de-DE');
  function streamSeite(m, f, nr, n, s, team) {   // letzte Seite: nächster Stream oder einfach der Kanal (team = 🏁 Team-Logo)
    return karSeite(m, f, nr, n, g => {
      if (s) {
        const d = new Date(s.liveMs), tag = GROSS(d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long' })), dat = d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' }), uhr = d.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
        kMitte(g, 'NÄCHSTER STREAM', 330, 72); kChrom(g, uhr, 640, 300, f === GOLD ? '#18e8ff' : GOLD); kMitte(g, `UHR · ${tag}, ${dat}`, 760, 60);
        kNeon(g, GROSS(s.serie || s.titel || 'SIMRACING'), 920, 96, f); if (s.track) kMitte(g, GROSS(s.track), 1010, 56, 700, 'rgba(255,255,255,.85)');
      } else {
        kMitte(g, 'MEHR DAVON?', 400, 84); kChrom(g, 'LIVE AUF', 640, 190, f); kChrom(g, 'YOUTUBE', 850, 210, f); kNeon(g, m.ytHandle || '@Kreids888', 1010, 90, f);
      }
    }, team);
  }
  function karStilFoto(g, st, f, nr) {   // 🎨 Bild-Effekt je Stil wie bei den Clips (NEU 23.11.2026): liegt über dem Foto und unter Text, Kopf und Fuß
    if (st === 'kino') {
      const v = g.createRadialGradient(KB / 2, KH * 0.5, 320, KB / 2, KH * 0.5, 1000); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = v; g.fillRect(0, 0, KB, KH);
      g.fillStyle = '#000'; g.fillRect(0, 0, KB, 30); g.fillRect(0, KH - 30, KB, 30);
      const r = zufallR(nr * 17 + 3); g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 160; i++) g.fillRect(r() * KB, r() * KH, 1 + r() * 2, 1 + r() * 2);   // Filmkorn
    } else if (st === 'comic') {
      g.save(); g.fillStyle = hexA(f, 0.36);
      for (let y = KH - 540, z = 0; y < KH; y += 24, z++) for (let x = z % 2 ? 12 : 0; x < KB; x += 24) { g.beginPath(); g.arc(x, y, 7.5 * (y - (KH - 540)) / 540, 0, Math.PI * 2); g.fill(); }   // Rasterpunkte unten
      for (let y = 0, z = 0; y < 250; y += 24, z++) for (let x = z % 2 ? 12 : 0; x < KB; x += 24) { g.beginPath(); g.arc(x, y, 5.5 * (1 - y / 250), 0, Math.PI * 2); g.fill(); }
      g.restore();
      g.save(); g.lineWidth = 18; g.strokeStyle = '#000'; g.strokeRect(9, 9, KB - 18, KH - 18); g.lineWidth = 6; g.strokeStyle = f; g.strokeRect(24, 24, KB - 48, KH - 48); g.restore();
    } else if (st === 'glitch') {
      g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < KH; y += 6) g.fillRect(0, y, KB, 2);   // Zeilen
      const r = zufallR(nr * 31 + 7);
      for (let i = 0; i < 5; i++) { g.fillStyle = [hexA('#00ffff', 0.1), hexA('#ff00aa', 0.1), hexA(f, 0.12)][i % 3]; g.fillRect(0, 160 + r() * (KH - 320), KB, 8 + r() * 44); }
      g.save(); g.lineWidth = 4; g.strokeStyle = 'rgba(0,255,255,.85)'; g.strokeRect(16, 18, KB - 44, KH - 44); g.strokeStyle = 'rgba(255,0,170,.85)'; g.strokeRect(28, 26, KB - 44, KH - 44); g.restore();
    } else if (st === 'sport') {
      g.save(); g.fillStyle = hexA(f, 0.95); g.fillRect(0, 0, 14, KH); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(22, 0, 4, KH); g.restore();   // Farbkante links
      g.save(); g.transform(1, 0, -0.42, 1, 0, 0); [[KB + 420, 60, 0.5], [KB + 500, 22, 0.8]].forEach(([x, w, a]) => { g.fillStyle = hexA(f, a); g.fillRect(x, KH - 420, w, 420); }); g.restore();   // schräge Streifen unten rechts
      const q = 28; for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) if ((x + y) % 2 === 0) { g.fillStyle = 'rgba(255,255,255,.13)'; g.fillRect(KB - 60 - 7 * q + x * q, 176 + y * q, q, q); }   // Zielflagge
    } else if (st === 'clean') { g.save(); g.lineWidth = 3; g.strokeStyle = hexA(f, 0.9); rr(g, 26, 26, KB - 52, KH - 52, 26); g.stroke(); g.restore(); }
  }
  const KAR_SCHRITT = { neon: 106, kino: 106, comic: 133, glitch: 94, sport: 134, clean: 90 };   // Abstand von Zeile zu Zeile je Stil
  const KAR_PX = { neon: [112, 100], kino: [124, 104], comic: [112, 92], glitch: [100, 84], sport: [108, 92], clean: [104, 88] };   // Schriftgröße je Stil: [eine Zeile, zwei Zeilen] (wie stilSpruch)
  function fotoSeite(m, f, nr, n, img, o, team) {   // 📸 ein Foto aus der Toolbox füllt die Seite: oben Logo, Kanal und Seite, unten YouTube · o = Texte des Fotos { gross, klein, ort, look } · team = 🏁 Team-Logo über allem (nicht bei „nur das Foto“)
    o = o || {};
    const c = leinwand(KB, KH), g = c.getContext('2d'), iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, q = Math.max(KB / iw, KH / ih);
    g.fillStyle = '#000'; g.fillRect(0, 0, KB, KH); g.drawImage(img, (KB - iw * q) / 2, (KH - ih * q) / 2, iw * q, ih * q);
    if (o.look === 'ohne') return c;   // nur das Foto
    const mitText = o.look !== 'logo', gross = mitText ? GROSS(String(o.gross || '').trim()) : '', klein = mitText ? GROSS(String(o.klein || '').trim()) : '', oben = o.ort === 'oben', text = !!(gross || klein);
    const st = STIL_IDS.includes(o.stil) ? o.stil : 'neon', zl = gross ? zweiZeilen(gross) : [], zwei = zl.length > 1, schritt = KAR_SCHRITT[st];   // 🎨 Stil wie bei den Clips · lange Texte in zwei Zeilen
    karStilFoto(g, st, f, nr);
    const ho = text && oben ? (zwei ? 640 : 520) : 250, hu = text && !oben ? (zwei ? 640 : 520) : 250;   // unter dem Text dunkler, damit er lesbar bleibt
    let v = g.createLinearGradient(0, 0, 0, ho); v.addColorStop(0, 'rgba(0,0,0,.78)'); if (ho > 250) v.addColorStop(0.6, 'rgba(0,0,0,.55)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = v; g.fillRect(0, 0, KB, ho);
    v = g.createLinearGradient(0, KH - hu, 0, KH); v.addColorStop(0, 'rgba(0,0,0,0)'); if (hu > 250) v.addColorStop(0.4, 'rgba(0,0,0,.55)'); v.addColorStop(1, 'rgba(0,0,0,.82)'); g.fillStyle = v; g.fillRect(0, KH - hu, KB, hu);
    const kz = gross && !zwei ? (gross.length <= 6 ? 1.5 : gross.length <= 8 ? 1.35 : gross.length <= 10 ? 1.2 : 1) : 1;   // kurze Texte („DUELL“, „AUTSCH“) werden größer gemalt
    const px = KAR_PX[st][zwei ? 1 : 0] * kz;
    const unter = { neon: px * 0.25, kino: 46, comic: px * 0.5 + 14, glitch: px * 0.22, sport: px * 0.3, clean: px * 0.2 }[st];   // so weit reicht der Stil unter die Grundlinie (Kasten, Linie, Leuchten)
    const ueber = st === 'sport' ? px * 1.02 : px * 0.78;   // … und so weit darüber
    const letzte = oben ? Math.max(338, 205 + ueber) + (zwei ? schritt : 0) : KH - (klein ? 236 : 158) - unter, erste = letzte - (zwei ? schritt : 0);   // Grundlinie der letzten und der ersten Zeile: immer Luft zu Kopf, kleinem Text und YouTube-Knopf
    if (gross && st === 'neon') zl.forEach((z, i) => kNeon(g, z, erste + i * schritt, px, f));
    else if (gross) stilSpruch(g, st, 99, gross, f, { y1: erste, y2: erste, k: kz });
    if (klein) kMitte(g, klein, oben ? (gross ? letzte + unter + 46 : 330) : KH - 182, 46, 700);
    karKopf(g, m, f, nr, n);
    pille(g, 'LIVE AUF YOUTUBE', 60, KH - 132, f, 44, true);
    if (nr < n) { g.save(); SA(g, 46, 800); g.textAlign = 'right'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 10; g.fillText('WISCHEN »', KB - 60, KH - 82); g.restore(); }
    teamZeichnen(g, team, KB, KH);
    return c;
  }
  // 🏆 Top 5 der Woche · liste = [{ titel, wert, bild }] bester zuerst
  function top5Seiten(m, liste, was, f, strm, team, nurErste) {   // team = 🏁 Team-Logo (leer = ohne) · nichts angegeben = die gemerkte Einstellung für Karussells · nurErste = nur die erste Seite (Vorschau)
    const n = liste.length, ges = n + 2, aus = [], tm = team === undefined ? teamStandard('kar') : team;
    aus.push(karSeite(m, f, 1, ges, g => {
      kChrom(g, `TOP ${n}`, 420, 250, f); kNeon(g, 'DER WOCHE', 540, 104, f);
      const h = Math.min(118, 560 / n);
      liste.forEach((x, i) => { const y = 610 + i * h; kKarte(g, 70, y, 940, h - 14, i ? '#3a4048' : f, !i);
        g.save(); RU(g, 54); g.fillStyle = i ? '#fff' : f; g.textAlign = 'left'; g.fillText('#' + (i + 1), 100, y + (h - 14) / 2 + 20);
        const wt = zahlText(x.wert); RU(g, 46); g.textAlign = 'right'; g.fillStyle = GOLD; g.fillText(wt, 980, y + (h - 14) / 2 + 17); const ww = g.measureText(wt).width;
        passt(g, x.titel, 940 - 150 - ww - 60, 44, (gg, px) => SA(gg, px, 800), 24); g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(x.titel, 215, y + (h - 14) / 2 + 15); g.restore(); });
    }, tm));
    if (nurErste) return aus;
    for (let i = n - 1; i >= 0; i--) aus.push(karSeite(m, i ? f : GOLD, aus.length + 1, ges, g => {
      const x = liste[i], ff = i ? f : GOLD;
      kChrom(g, 'PLATZ ' + (i + 1), 330, 170, ff); kBild(g, x.bild, (KB - 382) / 2, 372, 382, 680, 22, ff, m);
      g.save(); passt(g, x.titel, 960, 54, (gg, px) => SA(gg, px, 800), 26); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 10; g.fillText(x.titel, KB / 2, 1118); g.restore();
      kNeon(g, `${zahlText(x.wert)} ${was}`, 1186, 50, ff);
    }, tm));
    aus.push(streamSeite(m, f, ges, ges, strm, tm));
    return aus;
  }
  async function karHochladen(seiten, koerper) {   // Karussell anlegen, Bilder hochladen, kleines Vorschaubild dazu
    const r = await UMG.igApi('POST', '/api/clip/neu', { ...koerper, kar: true, insta: true, tiktok: !!(stand().tiktok && stand().tiktok.verbunden), youtube: false, test: false });   // TikTok: Foto-Entwurf
    try {
      const v = Date.now();
      for (let i = 0; i < seiten.length; i++) { const b = await new Promise(ok => seiten[i].toBlob(ok, 'image/jpeg', 0.9)); await senden(`/api/clip/${r.id}/kbild/${i}?v=${v}`, b); arbeit(`⬆ Bilder hochladen … ${i + 1} von ${seiten.length}`); }
      await UMG.igApi('POST', `/api/clip/${r.id}/kfertig?v=${v}`, { n: seiten.length });
      try { const k = leinwand(432, 540); k.getContext('2d').drawImage(seiten[0], 0, 0, 432, 540); const vb = await new Promise(ok => k.toBlob(ok, 'image/jpeg', 0.85)); if (vb) await senden(`/api/clip/${r.id}/bild`, vb); } catch (e) { /* Vorschaubild ist nur schön */ }
    } catch (e) { try { await UMG.igApi('POST', `/api/clip/${r.id}/weg`, {}); } catch (x) { /* egal */ } throw e; }
    return r;
  }
  const clipWert = c => { const z = c.zahlen || {}; return { aufrufe: ((z.ig && z.ig.aufrufe) || 0) + ((z.yt && z.yt.aufrufe) || 0), likes: ((z.ig && z.ig.likes) || 0) + ((z.yt && z.yt.likes) || 0) }; };
  function top5Liste(clips, jetzt) {   // gepostete Clips der letzten 7 Tage, die meisten Aufrufe zuerst (ohne Aufrufe: Likes)
    const raus = c => Math.max((c.gepostet && c.gepostet.zeit) || 0, (c.yt && c.yt.zeit) || 0);
    const alle = (clips || []).filter(c => !/^(trailer|kar)/.test(c.vorlage || '') && raus(c) > jetzt - 7 * 86400000 && c.zahlen).map(c => ({ c, ...clipWert(c) }));
    const was = alle.some(x => x.aufrufe > 0) ? 'aufrufe' : 'likes';
    return { was: was === 'aufrufe' ? 'AUFRUFE' : 'LIKES', liste: alle.filter(x => x[was] > 0).sort((a, b) => b[was] - a[was]).slice(0, 5).map(x => ({ id: x.c.id, titel: GROSS(String(x.c.titel || 'Clip').replace(/\s*#\S+/g, '').trim() || 'Clip'), wert: x[was], bildUrl: x.c.bild || '' })) };
  }
  let KAR_LAEUFT = false;
  // ═══ 📅 Lücken füllen (NEU 20.11.2026): lieber jeden Tag ein Post als mehrere an einem Tag ═══
  // Die Leiste „🤖 Automatik“ zeigt die nächsten 7 Tage. Für einen Tag ohne Post schlägt sie genau einen Post vor, der keinen Clip braucht:
  // „Stream verpasst?“ (Tag nach dem Stream), „Morgen live“ (Tag davor), Top 5 der Woche, Wochenvorschau. Gebaut wird erst auf Knopfdruck.
  const tagVon = ms => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });   // 2026-11-20
  // ═══ 📂 Insta-Ablage (NEU 21.11.2026): fertige Szenen aus der Toolbox (Reiter „Schnitt“) als Vorrat ═══
  // Der Browser liest den Ordner „insta-ablage“ direkt vom PC (Chrome/Edge am PC, nur lesen). Hochgeladen wird erst beim Einplanen.
  // Eine Szene öffnet sich im Editor wie ein reingezogener Clip, Vorlage und Spruch kommen aus der Infodatei (Strecke, Art).
  const ABL = { ordner: null, liste: [], stand: '', laedt: false, bilder: new Map(), malt: false, fotos: [], fotoWahl: [], fotoUrl: new Map(), kar: null };   // stand: '' nie verbunden · 'fragen' Freigabe nötig · 'ok'
  const ABL_BENUTZT = 'k888_ablage_benutzt';
  const ABL_ART = { 'Seite an Seite': 'duell', 'Zweikampf': 'duell', 'Überholt worden': 'ueberholt worden', 'Überholt': 'ueberholt', 'Einschlag': 'crash', 'Abflug': 'crash', 'Incident': 'kontakt', 'Dreher': 'dreher',
    'Zieleinlauf': 'ziel', 'Rennstart': 'start', 'Bestzeit': 'bestzeit', 'Allzeit-Bestzeit': 'bestzeit', 'Laut geworden': 'highlight' };
  const ablKann = () => typeof window.showDirectoryPicker === 'function' && !!window.indexedDB;
  const ablBenutzt = () => { try { return JSON.parse(localStorage.getItem(ABL_BENUTZT) || '[]'); } catch (e) { return []; } };
  const ablMerken = name => { try { localStorage.setItem(ABL_BENUTZT, JSON.stringify([...ablBenutzt().filter(x => x !== name).slice(-300), name])); } catch (e) { /* egal */ } };
  function ablTitel(x) {   // „Seite an Seite · Long Beach · R59“ · ein selbst vergebener Name bleibt, wie er ist
    const i = x.info, r = i.runde ? 'R' + i.runde : '', std = [i.strecke, i.art, r, String(i.datum || '').slice(0, 10)].filter(Boolean).join(' ');
    return std && x.name.startsWith(std) ? [i.art, i.strecke, r].filter(Boolean).join(' · ') + x.name.slice(std.length) : x.name;
  }
  const ablZahl = () => [`${ABL.liste.length} ${ABL.liste.length === 1 ? 'Szene' : 'Szenen'}`, ABL.fotos.length ? `${ABL.fotos.length} ${ABL.fotos.length === 1 ? 'Foto' : 'Fotos'}` : ''].filter(Boolean).join(', ');
  const ablFrei = () => { if (ABL.stand !== 'ok') return []; const b = new Set(ablBenutzt()); return ABL.liste.filter(x => !b.has(x.name) && !CLIPS.some(c => c.ablage === x.name)); };
  let ABL_DB = null;
  const ablDb = () => ABL_DB || (ABL_DB = new Promise((ok, nein) => { const r = indexedDB.open('k888_ablage', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => ok(r.result); r.onerror = () => nein(r.error); }));
  const ablTx = async (modus, fn) => { const db = await ablDb(); return new Promise((ok, nein) => { const t = db.transaction('h', modus), q = fn(t.objectStore('h')); t.oncomplete = () => ok(q && q.result); t.onerror = t.onabort = () => nein(t.error); }); };
  async function ablLesen() {   // Ordner lesen: jede MP4 ist eine Szene, „… Cam.mp4“ und „….json“ gehören dazu
    const dateien = new Map(), liste = [];
    for await (const [name, e] of ABL.ordner.entries()) if (e.kind === 'file') dateien.set(name, e);
    for (const [name, e] of dateien) {
      if (!/\.mp4$/i.test(name) || / Cam\.mp4$/i.test(name)) continue;
      const basis = name.slice(0, -4), j = dateien.get(basis + '.json'); let info = null, f = null;
      try { f = await e.getFile(); } catch (err) { continue; }
      try { if (j) info = JSON.parse(await (await j.getFile()).text()); } catch (err) { info = null; }
      liste.push({ name: basis, datei: e, cam: dateien.has(basis + ' Cam.mp4'), camDatei: dateien.get(basis + ' Cam.mp4') || null, info: (info && typeof info === 'object') ? info : {}, zeit: f.lastModified, groesse: f.size });
    }
    ABL.liste = liste.sort((a, b) => b.zeit - a.zeit);
    const fotos = [];   // 📸 zugeschnittene Fotos aus der Toolbox (Reiter „Fotos“): Bilder fürs Karussell
    for (const [name, e] of dateien) {
      if (!/\.(jpe?g|png)$/i.test(name)) continue;
      let f = null; try { f = await e.getFile(); } catch (err) { continue; }
      fotos.push({ name, datei: e, zeit: f.lastModified, groesse: f.size, file: f });
    }
    fotos.sort((a, b) => b.zeit - a.zeit);
    const alt = ABL.fotoUrl; ABL.fotoUrl = new Map();
    for (const x of fotos.slice(0, 60)) { const k = x.name + '|' + x.zeit; ABL.fotoUrl.set(x.name, alt.has(k) ? alt.get(k) : URL.createObjectURL(x.file)); ABL.fotoUrl.set(k, ABL.fotoUrl.get(x.name)); alt.delete(k); x.file = null; }
    for (const [k, u] of alt) if (k.includes('|')) URL.revokeObjectURL(u);
    ABL.fotos = fotos.slice(0, 60); ABL.fotoWahl = ABL.fotoWahl.filter(n => ABL.fotos.some(x => x.name === n)); if (!ABL.fotoWahl.length) ABL.kar = null;
  }
  const fotoOrt = name => String(name).replace(/\.[a-z]+$/i, '').replace(/^\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2} ?/, '').replace(/ \(\d+\)$/, '').replace(/ ?Foto$/, '').trim();   // „2026-11-21 16-20-05 Long Beach Foto.jpg“ → „Long Beach“
  const KAR_MAX = 10;
  // 📸 Texte auf den Fotos (NEU 22.11.2026): pro Foto großer und kleiner Text, Platz (unten/oben) und Aussehen. Jede Seite steht als Vorschau im Formular, genau so, wie sie gepostet wird.
  const KAR_SPRUCH = ['SEITE AN SEITE', 'VOLLGAS', 'KEIN ZENTIMETER PLATZ', 'DAS WAR KNAPP', 'RAD AN RAD', 'MITTENDRIN', 'ATTACKE', 'SO SIEHT RENNEN AUS', 'WELCHES IST DEIN FAVORIT?', 'BILD DES TAGES'];
  const KAR_LOOK = [['neon', 'Logo, Kanal und Text'], ['logo', 'nur Logo und Kanal'], ['ohne', 'nur das Foto (auch ohne Team-Logo)']];
  // ═══ ✍️ Text zum Karussell auf Knopfdruck (NEU 23.11.2026) ═══
  // Jeder Text hat vier Teile: Einstieg · Satz · Frage (bringt Kommentare) · Hinweis auf YouTube. Jeder Teil kommt aus einer eigenen Liste,
  // „🎲 Anderer Text“ mischt neu. Der Browser merkt sich, was zuletzt dran war: nichts wiederholt sich direkt.
  // {ort} = Ort aus dem Dateinamen · {n} = Zahl der Fotos · {k} = ein Bild davon · {tag}/{uhr} = nächster Stream.
  // Die vier Pflicht-Hashtags hängt der Worker an die erste Zeile, darum steht hier nur noch einer am Ende (Instagram nimmt fünf).
  const KT = {
    hookOrt: ['{ort} hat geliefert 🔥', '{n} Bilder aus {ort}, eins wilder als das andere 📸', 'So sah {ort} aus dem Cockpit aus 🏁', '{ort}: Rad an Rad und kein Zentimeter Platz ⚔️',
      'Rennabend in {ort}. Das sind die besten Momente 📸', '{ort} in {n} Bildern 🔥', 'Das war {ort}. Und es war eng 😅', 'Vollgas in {ort} 💨', 'Kein Rennen in {ort} ohne Drama 🍿',
      'Momente aus {ort}, die im Rennen zu schnell vorbei waren ⏱', '{ort} von seiner schönsten Seite 😍', 'Wer in {ort} lupft, verliert 😤'],
    hook: ['{n} Bilder, eins wilder als das andere 📸', 'Die besten Momente vom Rennabend 🏁', 'Rad an Rad und kein Zentimeter Platz ⚔️', 'So sieht Simracing aus dem Cockpit aus 🔥', 'Kein Rennen ohne Drama 🍿',
      'Momente, die im Rennen zu schnell vorbei waren ⏱', 'Vollgas, Windschatten, Vollkontakt 💨', 'Einmal durchwischen bitte 👉', 'Wer lupft, verliert 😤', 'Der Rennabend in {n} Bildern 📸'],
    body: ['Wisch dich durch 👉 Bild {k} ist mein Favorit.', 'Windschatten, Spätbremser, Tür an Tür. Alles dabei.', 'Genau dafür sitzt man stundenlang im Rig.', 'Sauber gefahren? Sagen wir: meistens 😇',
      'Findest du den Moment, in dem es fast gekracht hätte?', 'GT3 am Limit und manchmal knapp drüber.', 'Bei jedem Bild ging der Puls hoch 💓', 'Direkt aus iRacing, nichts gestellt.',
      'So viel Action passt eigentlich nicht in {n} Bilder.', 'Reifen warm, Puls auch.', 'Erst wischen, dann abstimmen 👉', 'Man riecht fast den Gummi.'],
    frage: ['Welches Bild ist dein Favorit? Schreib die Nummer in die Kommentare 👇', '1 bis {n}: Welches Bild kommt an die Wand? 👇', 'Welches Bild würdest du als Hintergrund nehmen? Nummer in die Kommentare 👇',
      'Bei welchem Bild hättest du gelupft? 😏 Schreib die Nummer 👇', 'Welche Nummer ist das Bild des Abends? 👇', 'Team Windschatten oder Team Spätbremser? Schreib es in die Kommentare 👇',
      'Welches Auto gefällt dir am besten? 👇', 'Reinstechen oder abwarten? Was hättest du gemacht? 👇', 'Welches Bild soll ich als Nächstes groß posten? 👇', 'Gib jedem Bild eine Note von 1 bis 10. Welches gewinnt? 👇'],
    einHookOrt: ['{ort} hat geliefert 🔥', 'So sah {ort} aus dem Cockpit aus 🏁', 'Vollgas in {ort} 💨', '{ort} von seiner schönsten Seite 😍'],
    einHook: ['So sieht Simracing aus dem Cockpit aus 🔥', 'Bild des Tages 📸', 'Rad an Rad und kein Zentimeter Platz ⚔️', 'Wer lupft, verliert 😤'],
    einBody: ['Genau dafür sitzt man stundenlang im Rig.', 'Direkt aus iRacing, nichts gestellt.', 'GT3 am Limit und manchmal knapp drüber.', 'Reifen warm, Puls auch.'],
    einFrage: ['Hintergrund oder nicht? Sag es in den Kommentaren 👇', 'Welches Auto gefällt dir am besten? 👇', 'Reinstechen oder abwarten? Was hättest du gemacht? 👇', 'Note von 1 bis 10 für das Bild? 👇'],
    ytStream: ['🔴 Nächster Stream: {tag} um {uhr} Uhr live auf YouTube. Link im Profil.', '🔴 Live dabei sein? {tag}, {uhr} Uhr auf YouTube. Link im Profil.', '🔴 {tag} um {uhr} Uhr geht es weiter, live auf YouTube: kreids888.'],
    yt: ['▶️ Die ganzen Rennen gibt es live auf YouTube: kreids888. Link im Profil.', '🔴 Mehr davon live auf YouTube. Link im Profil.', '▶️ Ganze Rennen und Onboards auf YouTube: kreids888.', '🔴 Live mitfiebern? YouTube: kreids888. Link im Profil.']
  };
  const KT_KEY = 'k888_kartext';
  const ktMerk = () => { try { return JSON.parse(localStorage.getItem(KT_KEY) || '{}') || {}; } catch (e) { return {}; } };
  function ktZieh(name, ok) {   // Baustein ziehen, der zuletzt nicht dran war (gemerkt wird gut die Hälfte der Liste) · ok(i) = dieser Baustein ist erlaubt
    const pool = KT[name], m = ktMerk(), alt = (Array.isArray(m[name]) ? m[name] : []).filter(i => i >= 0 && i < pool.length), alle = pool.map((_, i) => i), darf = ok ? alle.filter(ok) : alle;
    const stufen = [darf.filter(i => !alt.includes(i)), darf.filter(i => i !== alt[alt.length - 1]), darf, alle.filter(i => !alt.includes(i)), alle], kand = stufen.find(l => l.length) || [0];
    const i = kand[Math.floor(Math.random() * kand.length)];
    m[name] = [...alt, i].slice(-Math.max(1, Math.ceil(pool.length * 0.6)));
    try { localStorage.setItem(KT_KEY, JSON.stringify(m)); } catch (e) { /* ohne Merken geht es auch */ }
    return i;
  }
  const karTextWahl = ok => { const w = { k: Math.random() }; for (const n of Object.keys(KT)) w[n] = ktZieh(n, ok ? i => ok(n, i) : null); return w; };
  function karOrt(name) { const o = streckeKurz(fotoTeile(name || '').strecke); return /^\p{L}[\p{L}\p{N} .'’-]{2,39}$/u.test(o) && !/^(img|dsc|bild|foto|screenshot|unbenannt)/i.test(o) ? o : ''; }   // Strecke kurz („Silverstone“), nur echte Namen, kein „IMG_1234“
  const karOrtTag = ort => { const t = String(ort || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFD').replace(/[^a-z0-9]/g, ''); return t.length >= 3 && t.length <= 24 && /[a-z]/.test(t) ? '#' + t : ''; };
  function karKontext(K, w) {   // womit die Bausteine gefüllt werden: Ort, Zahl der Fotos, nächster Stream nach dem Post
    const namen = ABL.fotoWahl.slice(0, K.schluss ? KAR_MAX - 1 : KAR_MAX), n = namen.length, ort = karOrt(namen[0]);
    const ab = Math.max(Date.now(), K.postMs || 0), strm = (stand().streams || []).find(x => x.liveMs > ab && x.liveMs < ab + 7 * 86400000) || null;
    const tage = strm ? Math.round((new Date(tagVon(strm.liveMs) + 'T12:00:00Z') - new Date(tagVon(ab) + 'T12:00:00Z')) / 86400000) : 0;
    const tag = strm ? (tage === 0 ? 'Heute' : tage === 1 ? 'Morgen' : new Date(strm.liveMs).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long' })) : '';
    const uhr = strm ? new Date(strm.liveMs).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }) : '';
    return { n, ort, strm, ein: n < 2, fuell: t => String(t).replace(/\{ort\}/g, ort).replace(/\{n\}/g, n).replace(/\{k\}/g, 1 + Math.floor(((w && w.k) || 0) * Math.max(1, n))).replace(/\{tag\}/g, tag).replace(/\{uhr\}/g, uhr) };
  }
  function karTextBau(K) {   // Text aus der gezogenen Auswahl bauen · passt sich an Ort, Zahl der Fotos und den nächsten Stream an
    const w = K.textWahl || (K.textWahl = karTextWahl()), x = karKontext(K, w), teil = name => x.fuell(KT[name][(w[name] || 0) % KT[name].length]);
    return [teil(x.ein ? (x.ort ? 'einHookOrt' : 'einHook') : x.ort ? 'hookOrt' : 'hook'), '', teil(x.ein ? 'einBody' : 'body'), teil(x.ein ? 'einFrage' : 'frage'), '', teil(x.strm ? 'ytStream' : 'yt'), '', karOrtTag(x.ort) || '#kreids888'].join('\n');
  }
  function karTextNeu(K) {   // 🎲 neuer Text · ein Einstieg, der schon in einem vorhandenen Post steht, kommt nicht nochmal (keine Wiederholungen)
    const alt = (stand().clips || []).map(c => String(c.text || '')).filter(Boolean), x = karKontext(K, null);
    K.textWahl = karTextWahl((name, i) => !/hook/i.test(name) || !alt.some(t => t.includes(x.fuell(KT[name][i]))));
    K.text = karTextBau(K); K.textEigen = false;
    return K.text;
  }
  const KAR_TEXT_HINWEIS = K => (K.textEigen ? 'Eigener Text. „🎲 Anderer Text“ schreibt wieder einen automatischen.' : 'Automatischer Text: passt zu Ort, Zahl der Bilder und nächstem Stream. Tippst du selbst, bleibt dein Text. #simracing #iracing #gt3 #crash kommen von selbst dazu.');
  function karTextZeigen() {   // Textfeld und Hinweis nachziehen, ohne alles neu zu zeichnen
    const K = ABL.kar; if (!K || !BOX) return;
    const ta = BOX.querySelector('[data-abk="text"]'), h = BOX.querySelector('[data-abk-hinweis]');
    if (ta && ta.value !== K.text) ta.value = K.text; if (h) h.textContent = KAR_TEXT_HINWEIS(K);
  }
  // ═══ 🎲 Texte auf den Bildern von selbst (NEU 23.11.2026) ═══
  // Die Fotos der Toolbox heißen „<Datum> <Strecke> Nr<k> <Moment> <Kamera> #<Auto>“. Daraus kommen Strecke und Moment, und zu jedem Moment
  // gibt es passende Sprüche. K.textModus: 'auto' = jedes Bild bekommt einen eigenen Spruch · 'einer' = ein Text für alle Bilder · 'ohne' = kein Text.
  // Wer ein Feld selbst ändert oder einen Spruch anklickt, behält seinen Text (auto = false), bis er wieder würfelt.
  const FOTO_KAMERAS = ['Blimp (ganz hoch)', 'Heli von oben', 'Verfolger weit', 'Überrollbügel', 'TV-Kamera', 'Verfolger', 'Von vorn', 'Panorama', 'Getriebe', 'TV fest', 'Cockpit', 'Gyro', 'Nase'];   // wie fotoserie.py (längste zuerst)
  function fotoTeile(name) {   // „Silverstone Circuit Nr9 Laut geworden TV-Kamera #888“ → Strecke, Moment, Kamera, Auto
    const roh = fotoOrt(name), m = roh.match(/^(.*?)\s+Nr\.?\s?(\d+)\s+(.*)$/);
    if (!m) return { strecke: roh, moment: '', kamera: '', auto: '' };
    let rest = m[3].trim(), auto = '', kamera = '';
    const a = rest.match(/\s*#(\w+)$/); if (a) { auto = a[1]; rest = rest.slice(0, a.index).trim(); }
    for (const k of FOTO_KAMERAS) if (rest.toLowerCase().endsWith(k.toLowerCase())) { kamera = k; rest = rest.slice(0, rest.length - k.length).trim(); break; }
    return { strecke: m[1].trim(), moment: rest, kamera, auto };
  }
  const streckeKurz = t => { const k = String(t || '').replace(/\s+-\s+.*$/, '').replace(/\b(Circuit de la|Circuit de|Circuito de|Autodromo Nazionale|Autodromo Internazionale|Autodromo|Motorsport Arena|International Raceway|International Speedway|Grand Prix Circuit|Street Circuit|International|Raceway|Speedway|Circuit)\b/gi, ' ').replace(/\s{2,}/g, ' ').trim(); return k || String(t || '').trim(); };
  const KAR_MOMENT = [   // [woran man den Moment im Dateinamen erkennt, passende Sprüche]
    [/laut geworden/i, ['DAS HAT GEKNALLT', 'PULS 180', 'KURZ GESCHRIEN', 'FUNK ZENSIERT', 'LAUT GEWORDEN', 'HERZ IN DER HOSE']],
    [/rennstart|^start/i, ['LICHTER AUS', 'GRÜN!', 'UND AB DAFÜR', 'ALLE AUF EINMAL', 'CHAOS IN KURVE 1', 'VOLLGAS AB DER AMPEL']],
    [/seite an seite|zweikampf/i, ['RAD AN RAD', 'SEITE AN SEITE', 'KEIN ZENTIMETER PLATZ', 'TÜR AN TÜR', 'WER ZUCKT ZUERST?', 'DUELL']],
    [/überholt worden/i, ['DAS TAT WEH', 'ER WAR SCHNELLER', 'DEN HOLE ICH MIR WIEDER', 'TÜR ZU SPÄT ZU']],
    [/überhol/i, ['VORBEI!', 'INNEN REIN', 'SPÄT GEBREMST', 'ATTACKE', 'PLATZ GEHOLT', 'UND TSCHÜSS']],
    [/pulk/i, ['MITTENDRIN', 'DICHT AN DICHT', 'WINDSCHATTEN', 'DER ZUG ROLLT', 'VOLLES HAUS', 'KEINER GIBT NACH']],
    [/ziel/i, ['ZIEL!', 'KARIERTE FLAGGE', 'GESCHAFFT', 'FOTOFINISH', 'ALLES GEGEBEN']],
    [/unfall|einschlag|incident/i, ['AUTSCH', 'DAS WAR TEUER', 'KLEINHOLZ', 'DA WAR KEIN PLATZ', 'WER WAR SCHULD?', 'GELB!']],
    [/dreher|quersteher|rutscher/i, ['DREHWURM', 'ZU VIEL GEWOLLT', 'QUER GEHT MEHR', 'GERADE NOCH GERETTET', 'KALTE REIFEN']],
    [/abflug/i, ['AB INS GRÜNE', 'DAS KIESBETT RUFT', 'STRECKE ZU ENDE', 'RASEN MÄHEN']],
    [/bestzeit/i, ['BESTZEIT', 'LILA SEKTOR', 'SCHNELLSTE RUNDE', 'DAS SASS']]
  ];
  const KAR_TITELTEXT = 'DIE BESTEN BILDER VOM RENNEN', KS_KEY = 'k888_karspruch', KAR_STIL_KEY = 'k888_karstil';
  const karMomentPool = name => { const t = fotoTeile(name), m = KAR_MOMENT.find(([re]) => re.test(t.moment)); return m ? m[1] : []; };
  function karSpruchZieh(name, belegt) {   // Spruch für ein Foto: passt zum Moment, steht noch auf keinem anderen Bild, war zuletzt nicht dran
    let merk = []; try { merk = JSON.parse(localStorage.getItem(KS_KEY) || '[]') || []; } catch (e) { merk = []; }
    const eigen = karMomentPool(name), allg = KAR_SPRUCH.filter(x => !/FAVORIT|BILD DES TAGES/.test(x)), frei = l => l.filter(x => !belegt.has(x));
    const kand = [frei(eigen).filter(x => !merk.includes(x)), frei(eigen), frei(allg).filter(x => !merk.includes(x)), frei(allg), eigen, allg].find(l => l.length) || ['VOLLGAS'];
    const w = kand[Math.floor(Math.random() * kand.length)];
    try { localStorage.setItem(KS_KEY, JSON.stringify([...merk.filter(x => x !== w), w].slice(-14))); } catch (e) { /* ohne Merken geht es auch */ }
    return w;
  }
  function karAutoTexte(K, alleNeu, nurName) {   // Texte der Bilder setzen, die auf „automatisch“ stehen · alleNeu = alle neu würfeln · nurName = nur dieses Bild neu
    const namen = ABL.fotoWahl.slice(0, K.schluss ? KAR_MAX - 1 : KAR_MAX), modus = K.textModus || 'auto', belegt = new Set();
    const strecke = GROSS(karOrt(namen[0]));
    const titelWeg = s => { if (s.titel) { s.titel = false; if (s.klein === KAR_TITELTEXT) s.klein = ''; } };
    for (const n of namen) { const s = karFoto(n); if (s.auto === false && s.gross) belegt.add(GROSS(String(s.gross).trim())); }
    namen.forEach((n, i) => {
      const s = karFoto(n); if (s.auto === false) return;
      if (modus === 'einer') { titelWeg(s); s.gross = GROSS(String(K.einText || '').trim()).slice(0, 28); return; }
      if (modus === 'ohne') { titelWeg(s); s.gross = ''; return; }
      if (i === 0 && strecke && !s.ohneTitel) { s.gross = strecke.slice(0, 28); if (!s.klein || s.titel) s.klein = KAR_TITELTEXT; s.titel = true; belegt.add(s.gross); return; }   // Titelbild: die Strecke groß
      const neu = alleNeu || n === nurName || !s.gross || s.titel || belegt.has(GROSS(s.gross));
      titelWeg(s);
      if (neu) s.gross = karSpruchZieh(n, belegt);
      belegt.add(GROSS(s.gross));
    });
  }
  function karFelderZeigen() {   // Eingabefelder und kleine Bilder nachziehen, ohne das Formular neu zu bauen (der Cursor bleibt, wo er ist)
    if (!BOX || !ABL.kar) return;
    BOX.querySelectorAll('[data-abk="s:gross"],[data-abk="s:klein"]').forEach(e => { const w = karFoto(e.dataset.name)[e.dataset.abk.slice(2)] || ''; if (e !== document.activeElement && e.value !== w) e.value = w; });
    ABL.fotoWahl.forEach(n => karSpruchAn(n));
    ablKarVorschauBald();
  }
  const karSprueche = name => { const t = fotoTeile(name); return [...new Set([GROSS(karOrt(name)), GROSS(t.moment), ...karMomentPool(name), ...KAR_SPRUCH].filter(x => x && x.length <= 28))].slice(0, 14); };   // Sprüche zum Anklicken: Strecke, Moment, passende Sprüche, dann die allgemeinen
  function karSpruchAn(name) {   // markiert den Spruch, der gerade als großer Text auf dem Foto steht
    if (!BOX) return; const jetzt = GROSS(String(karFoto(name).gross || '').trim());
    BOX.querySelectorAll('[data-c="abl-kar-spruch"]').forEach(x => { if (x.dataset.name === name) x.classList.toggle('an', x.dataset.wert === jetzt); });
  }
  function karFoto(name) {   // Einstellungen eines Fotos · das erste Foto bekommt den Ort als großen Text vorgeschlagen
    const K = ABL.kar; if (!K) return { gross: '', klein: '', ort: 'unten', look: 'neon', w: -1 };
    if (!K.seiten) K.seiten = {};
    if (!K.seiten[name]) K.seiten[name] = { gross: '', klein: '', ort: 'unten', look: 'neon', w: -1, auto: true };   // auto: Text kommt von selbst (karAutoTexte), bis man ihn selbst ändert
    return K.seiten[name];
  }
  const karFarbe = name => { let h = 0; for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return TR_FARBEN[h % TR_FARBEN.length]; };
  const KAR_FARBE_KEY = 'k888_karfarbe';
  const karFarbeWahl = (K, name) => (K && /^#[0-9a-f]{6}$/i.test(K.farbe || '') ? K.farbe : karFarbe(name));   // 🎨 Farbe selbst gewählt (NEU 23.11.2026) · leer = automatisch aus dem ersten Foto wie bisher
  let KAR_VS_T = 0;
  async function ablKarVorschau(nur) {   // kleine Vorschau jeder Seite (nur = nur dieses Foto neu malen)
    const K = ABL.kar; if (!K || !BOX) return;
    const cs = [...BOX.querySelectorAll('canvas[data-abv]')]; if (!cs.length) return;
    await schriften(); const m = MAT || await material(), strm = (stand().streams || [])[0] || null; await teamLaden(); const team = teamOk(K.team);
    const namen = ABL.fotoWahl.slice(0, K.schluss ? KAR_MAX - 1 : KAR_MAX), ges = namen.length + (K.schluss ? 1 : 0), f = karFarbeWahl(K, namen[0]);
    for (const c of cs) {
      const n = c.dataset.abv; if (nur && n !== nur) continue;
      let seite = null;
      if (n === '::schluss') seite = streamSeite(m, f, ges, ges, strm, team);
      else { const i = namen.indexOf(n), img = i >= 0 ? await bild(ABL.fotoUrl.get(n)) : null; if (img) seite = fotoSeite(m, f, i + 1, ges, img, { ...karFoto(n), stil: K.stil }, team); }
      if (seite && c.isConnected) { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(seite, 0, 0, c.width, c.height); }
    }
  }
  const ablKarVorschauBald = nur => { clearTimeout(KAR_VS_T); KAR_VS_T = setTimeout(() => ablKarVorschau(nur).catch(() => {}), 250); };
  function ablKarStart() {   // Vorschlag für Titel, Text und Zeit, sobald das erste Foto angehakt ist
    if (ABL.kar) return ABL.kar;
    const ort = karOrt(ABL.fotoWahl[0] || '') || fotoTeile(ABL.fotoWahl[0] || '').strecke, plan = lueckenPlan(stand(), Date.now()), frei = plan.find(e => !e.n && e.ms), cfg = stand().clipcfg || {};
    let stil = 'neon', farbe = ''; try { stil = localStorage.getItem(KAR_STIL_KEY) || 'neon'; farbe = localStorage.getItem(KAR_FARBE_KEY) || ''; } catch (e) { stil = 'neon'; farbe = ''; }
    ABL.kar = { seiten: {}, team: teamStandard('kar'), titel: GROSS(ort ? `${ort} · Bilder vom Rennen` : 'Bilder vom Rennen'), schluss: true, postMs: frei ? frei.ms : new Date(`${tagVon(Date.now() + 86400000)}T${cfg.zeit || '18:30'}:00`).getTime(),
      text: '', textEigen: false, textWahl: null, textModus: 'auto', einText: '', stil: STIL_IDS.includes(stil) ? stil : 'neon', farbe: FARBEN.includes(farbe) ? farbe : '' };
    karAutoTexte(ABL.kar);   // 🎲 Texte auf den Bildern von selbst (NEU 23.11.2026)
    karTextNeu(ABL.kar);   // ✍️ Text auf Knopfdruck (NEU 23.11.2026): jedes Karussell startet mit einem anderen Text
    return ABL.kar;
  }
  function ablKarEingabe(t) {   // Tippen ändert nur die Werte (kein Neuzeichnen, sonst springt der Cursor)
    const K = ABL.kar, k = t.dataset.abk; if (!K) return;
    if (k.startsWith('s:')) {   // Text, Platz oder Aussehen eines Fotos
      const s = karFoto(t.dataset.name); s[k.slice(2)] = t.value;
      if (k === 's:gross' || k === 's:klein') { s.auto = false; s.titel = false; }   // selbst getippt: bleibt so, bis wieder gewürfelt wird
      if (k === 's:gross') karSpruchAn(t.dataset.name); ablKarVorschauBald(t.dataset.name); return;
    }
    if (k === 'einText') { K.einText = t.value; karAutoTexte(K); karFelderZeigen(); return; }   // ein Text für alle Bilder
    if (k === 'schluss') { K.schluss = t.checked; zeichnen(); }
    else if (k === 'postMs') { const ms = new Date(t.value).getTime(); if (isFinite(ms)) { K.postMs = ms; if (!K.textEigen) { K.text = karTextBau(K); karTextZeigen(); } } }   // anderer Tag: „Morgen um 20:00“ stimmt wieder
    else if (k === 'text') { K.text = t.value; if (!K.textEigen) { K.textEigen = true; karTextZeigen(); } }   // selbst getippt: bleibt so
    else K[k] = t.value;
  }
  async function ablKarBauen() {   // 📸 Karussell aus den angehakten Fotos bauen, hochladen und einplanen (Instagram + TikTok-Entwurf, wenn verbunden)
    const K = ABL.kar, namen = ABL.fotoWahl.slice(0, K && K.schluss ? KAR_MAX - 1 : KAR_MAX);
    if (!K || !namen.length || ARBEIT || TRAILER_LAEUFT || KAR_LAEUFT) return;
    if (namen.length + (K.schluss ? 1 : 0) < 2) return UMG.meldung('Ein Karussell braucht mindestens zwei Seiten: noch ein Foto anhaken oder die letzte Seite „Live auf YouTube“ anlassen.', 1);
    if (!(K.postMs > Date.now())) return UMG.meldung('Die Zeit liegt in der Vergangenheit. Bitte „Geht raus am“ ändern.', 1);
    KAR_LAEUFT = true;
    try {
      await schriften(); const st = stand(), m = MAT || await material(), strm = (st.streams || [])[0] || null;
      arbeit('🖼 Karussell wird gebaut …');
      const f = karFarbeWahl(K, namen[0]), ges = namen.length + (K.schluss ? 1 : 0), seiten = [], team = teamOk(K.team);
      await teamPflicht(team);
      for (let i = 0; i < namen.length; i++) {
        const img = await bild(ABL.fotoUrl.get(namen[i])); if (!img) throw new Error(`„${namen[i]}“ lässt sich nicht lesen. Bitte „↻ Neu lesen“ drücken.`);
        seiten.push(fotoSeite(m, f, i + 1, ges, img, { ...karFoto(namen[i]), stil: K.stil }, team));
      }
      if (K.schluss) seiten.push(streamSeite(m, f, ges, ges, strm, team));
      await karHochladen(seiten, { vorlage: 'karbilder', frei: true, quelle: 'fotos:' + namen[0], postMs: K.postMs, titel: String(K.titel || 'Bilder vom Rennen').slice(0, 80), text: K.text });
      namen.forEach(n => ablMerken('foto:' + n)); ABL.fotoWahl = []; ABL.kar = null;
      ARBEIT = ''; UMG.meldung(`Eingeplant: ${zeit(K.postMs)} 🎉`); await UMG.laden();
    } catch (err) { ARBEIT = ''; zeichnen(); UMG.meldung(err.message || String(err), 1); }
    finally { KAR_LAEUFT = false; }
  }
  async function ablStart() {   // beim Öffnen des Reiters: den gemerkten Ordner wieder lesen, wenn der Browser es noch erlaubt
    if (!ablKann() || ABL.laedt) return;
    ABL.laedt = true;
    try {
      if (!ABL.ordner) ABL.ordner = (await ablTx('readonly', o => o.get('ordner'))) || null;
      if (ABL.ordner) { if ((await ABL.ordner.queryPermission({ mode: 'read' })) === 'granted') { await ablLesen(); ABL.stand = 'ok'; } else ABL.stand = 'fragen'; }
    } catch (e) { ABL.stand = ABL.ordner ? 'fragen' : ''; }
    ABL.laedt = false;
    if (ABL.ordner) zeichnen();
  }
  async function ablVerbinden(anderer) {   // Klick: Ordner wählen oder die Freigabe erneuern (der Browser fragt selbst)
    if (!ablKann()) return UMG.meldung('Das geht nur in Chrome oder Edge am PC.', 1);
    try {
      if (ABL.ordner && !anderer) { if ((await ABL.ordner.requestPermission({ mode: 'read' })) !== 'granted') return UMG.meldung('Ohne Freigabe kann der Ordner nicht gelesen werden.', 1); }
      else { const h = await window.showDirectoryPicker({ id: 'k888-ablage', mode: 'read' }); ABL.ordner = h; try { await ablTx('readwrite', o => o.put(h, 'ordner')); } catch (e) { /* dann nur bis zum Neuladen */ } }
      await ablLesen(); ABL.stand = 'ok'; zeichnen();
      UMG.meldung(ABL.liste.length || ABL.fotos.length ? `Im Vorrat: ${ablZahl()}.` : 'Verbunden. Im Ordner liegt noch nichts.');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      ABL.stand = ABL.ordner ? 'fragen' : ''; zeichnen(); UMG.meldung('Der Ordner lässt sich nicht lesen. Bitte neu verbinden.', 1);
    }
  }
  async function ablOeffnen(name, ms) {   // Szene in den Editor · ms = Post-Zeit, wenn sie für eine Lücke gedacht ist
    const e = ABL.liste.find(x => x.name === name); if (!e) return;
    if (CLIPS.some(c => c.ablage === name)) { nachOben(); return UMG.meldung('Die Szene ist schon im Editor.'); }
    let datei; try { datei = await e.datei.getFile(); } catch (err) { ABL.stand = 'fragen'; zeichnen(); return UMG.meldung('Der Ordner ist nicht mehr freigegeben. Bitte „📂 Ordner wieder freigeben“ drücken.', 1); }
    const stich = [e.info.strecke, ABL_ART[e.info.art]].filter(Boolean).join(' ');   // daraus kommen Vorlage, Spruch und Titel
    const c = await neuerClip(stich ? new File([datei], stich + '.mp4', { type: datei.type || 'video/mp4', lastModified: datei.lastModified }) : datei);
    if (!c) return UMG.meldung(`„${name}“ kann der Browser nicht öffnen.`, 1);
    c.datei = datei; c.name = datei.name; c.ablage = name; if (ms) c.postMs = ms;
    c.start = 0; c.ende = c.dauer;   // die Szene ist in der Toolbox schon zugeschnitten: ganz nehmen (auch der Hook am Anfang)
    if (e.camDatei) { try { camSetzen(c, await e.camDatei.getFile()); } catch (err) { /* dann ohne Cam */ } }   // 📷 die passend geschnittene Cam
    const i = e.info, v0 = vorlage(c), pl = i.cam_lage && i.cam_lage.platz, fenster = !!c.cam && (pl === 'unten' || pl === 'geteilt') && !v0.mehr && !v0.nurTV;   // 📷 Cam als eigenes Fenster unter dem Rennbild
    if (fenster) { c.modus = 'ganz'; c.look = 'neon'; }   // dann das ganze Rennbild im Fenster (kein Hochkant-Ausschnitt)
    else if (i.hochkant && Array.isArray(i.teile) && i.teile.length && !v0.mehr && !v0.nurTV) {   // 📐 Lage je Stück, wie am Rahmen in der Toolbox eingestellt
      c.hochkant = i.teile.map(t => ({ ab: +t.ab || 0, bis: +t.bis || 0, x: +t.x || 0, y: +t.y || 0, z: +t.z || 1 })); c.modus = 'zoom'; c.look = 'neon';
      const still = i.teile.filter(t => t.nurCam).map(t => ({ ab: +t.ab || 0, bis: +t.bis || 0 })); if (still.length) c.camAus = still;   // 🎥 diese Stücke zeigen schon nur die Cam: dort kein kleines Cam-Bild dazu
    }
    if (c.cam && i.cam_lage && CAM_PLAETZE.some(x => x[0] === pl)) { c.camPlatz = pl; c.camBox = { x: +i.cam_lage.x || 0, y: +i.cam_lage.y || 0, s: kl(+i.cam_lage.s || 1, 0.6, 1.8) }; }   // 📷 Platz und Größe der Cam aus der Toolbox
    CLIPS.push(c); zeichnen(); if (CLIPS.length === 1) nachOben();
    UMG.meldung(CLIPS.length > 1 ? 'Szene wartet hinter dem Clip, der gerade im Editor ist.' : 'Szene ist im Editor. Vorlage und Spruch passen schon, ändern geht immer.');
  }
  async function ablBilder() {   // kleine Standbilder für die Kacheln, eins nach dem anderen (nur im Speicher)
    if (ABL.malt || ABL.stand !== 'ok') return;
    ABL.malt = true;
    try {
      for (const x of ABL.liste.slice(0, 24)) {
        const k = x.name + '|' + x.zeit; if (ABL.bilder.has(k)) continue;
        let url = '', src = '';
        try {
          url = URL.createObjectURL(await x.datei.getFile());
          const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true;
          await new Promise((ok, nein) => { v.onloadeddata = ok; v.onerror = nein; setTimeout(nein, 8000); v.src = url; });
          await new Promise(ok => { v.onseeked = ok; setTimeout(ok, 3000); v.currentTime = Math.min((v.duration || 2) / 2, 3); });
          const cv = leinwand(240, 135), q = Math.max(240 / (v.videoWidth || 240), 135 / (v.videoHeight || 135)), w = (v.videoWidth || 240) * q, h = (v.videoHeight || 135) * q;
          cv.getContext('2d').drawImage(v, (240 - w) / 2, (135 - h) / 2, w, h); src = cv.toDataURL('image/jpeg', 0.7);
          v.removeAttribute('src'); v.load();
        } catch (err) { src = ''; }
        if (url) URL.revokeObjectURL(url);
        ABL.bilder.set(k, src);
        const img = BOX && [...BOX.querySelectorAll('.kc-abl-bild')].find(y => y.dataset.k === k); if (img && src) img.innerHTML = `<img src="${src}" alt="">`;
      }
    } finally { ABL.malt = false; }
  }
  function ablHtml(offenStandard) {
    if (!ablKann()) return '';
    const kopf = '📂 Vorrat aus der Toolbox';
    if (ABL.stand !== 'ok') return `<div class="kc-abl zu"><b>${kopf}</b><button type="button" class="btn ki-k" data-c="abl-verbinden">${ABL.stand === 'fragen' ? '📂 Ordner wieder freigeben' : '📂 Ablage verbinden'}</button>
      <span class="kc-dim">${ABL.stand === 'fragen' ? 'Der Browser fragt nach einem Neustart einmal nach.' : 'Einmal den Ordner „insta-ablage“ in der Toolbox wählen. Dann stehen deine fertigen Szenen hier.'}</span></div>`;
    const b = new Set(ablBenutzt()), frei = ABL.liste.filter(x => !b.has(x.name)), datum = ms => new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const kachel = x => {
      const benutzt = b.has(x.name), drin = CLIPS.some(c => c.ablage === x.name), k = x.name + '|' + x.zeit, src = ABL.bilder.get(k);
      return `<div class="kc-abl-k${benutzt ? ' benutzt' : ''}"><div class="kc-abl-bild" data-k="${esc(k)}">${src ? `<img src="${src}" alt="">` : '🎬'}</div>
        <b title="${esc(x.name)}">${esc(ablTitel(x))}</b>
        <span class="kc-dim">${[x.info.dauer ? sek(x.info.dauer) : '', x.info.ansichten > 1 ? x.info.ansichten + ' Ansichten' : '', x.info.hook ? 'mit Hook' : '', x.cam ? 'mit Cam' : '', datum(x.zeit)].filter(Boolean).join(' · ')}</span>
        ${benutzt ? '<span class="kc-tag-ok">✓ verwendet</span>' : ''}
        <button type="button" class="btn ki-k${benutzt || drin ? '' : ' kc-frei'}" data-c="abl-auf" data-name="${esc(x.name)}" ${drin ? 'disabled' : ''}>${drin ? 'Ist im Editor' : benutzt ? '↩ Nochmal' : '✏️ In den Editor'}</button></div>`;
    };
    const K = ABL.kar, wahl = ABL.fotoWahl, seiten = wahl.length + (K && K.schluss ? 1 : 0);
    const foto = x => { const nr = wahl.indexOf(x.name) + 1, benutzt = b.has('foto:' + x.name);
      return `<button type="button" class="kc-foto${nr ? ' an' : ''}${benutzt ? ' benutzt' : ''}" data-c="abl-foto" data-name="${esc(x.name)}" title="${esc(x.name)}${nr ? ' · anklicken = wieder raus' : ' · anklicken = ins Karussell'}"><img src="${ABL.fotoUrl.get(x.name) || ''}" alt=""><i>${nr || '+'}</i>${benutzt ? '<span class="kc-tag-ok">✓ verwendet</span>' : ''}</button>`; };
    const fotosHtml = !ABL.fotos.length ? '' : `<div class="kc-abl-fotos"><b>📸 Fotos <span class="kc-dim">${ABL.fotos.length} · für ein Karussell anhaken (Instagram, dazu TikTok-Entwurf, wenn verbunden). Die Zahl ist die Reihenfolge.</span></b>
        <div class="kc-foto-reihe">${[...ABL.fotos.filter(x => !b.has('foto:' + x.name)), ...ABL.fotos.filter(x => b.has('foto:' + x.name))].map(foto).join('')}</div>
        ${K && wahl.length ? `<div class="kc-foto-form">
          <div class="kc-felder"><label class="kc-feld">Titel<input type="text" maxlength="80" value="${esc(K.titel)}" data-abk="titel"></label>
            <label class="kc-feld">Geht raus am<input type="datetime-local" value="${esc(lokal(K.postMs))}" data-abk="postMs"></label></div>
          <label class="kc-feld">Text zum Post<textarea rows="8" maxlength="2200" data-abk="text">${esc(K.text)}</textarea></label>
          <div class="kc-auto-kn kc-kar-text"><button type="button" class="btn kc-frei" data-c="abl-kar-text" title="Schreibt auf Knopfdruck einen neuen Text: anderer Einstieg, anderer Satz, andere Frage. Die Texte wechseln von selbst und wiederholen sich nicht.">🎲 Anderer Text</button>
            <span class="kc-dim" data-abk-hinweis>${esc(KAR_TEXT_HINWEIS(K))}</span></div>
          ${teamPanel('foto')}
          <div class="kc-kar-seiten"><b>Texte auf den Bildern <span class="kc-dim">Feld leer = kein Text. Das kleine Bild zeigt jede Seite so, wie sie gepostet wird.</span></b>
            <div class="kc-kar-auto">
              <div class="kc-feld">Woher kommt der große Text?<div class="kc-stile">${[['auto', '🎲 Automatisch je Bild', 'Jedes Bild bekommt von selbst einen eigenen Spruch, passend zum Moment (Start, Zweikampf, Unfall …). Das erste Bild zeigt die Strecke.'], ['einer', '✍️ Ein Text für alle', 'Du schreibst einen Text, er steht auf jedem Bild.'], ['ohne', '🚫 Ohne Text', 'Kein großer Text auf den Bildern.']].map(([w, t, tip]) => `<button type="button" class="${(K.textModus || 'auto') === w ? 'an' : ''}" data-c="abl-kar-modus" data-wert="${w}" title="${esc(tip)}">${t}</button>`).join('')}
                ${(K.textModus || 'auto') === 'auto' ? '<button type="button" data-c="abl-kar-wuerfeln" title="Würfelt für alle Bilder neue Sprüche. Auch selbst geschriebene Texte werden ersetzt.">🎲 Alle neu würfeln</button>' : ''}</div></div>
              ${K.textModus === 'einer' ? `<label class="kc-feld">Text für alle Bilder<input type="text" maxlength="28" value="${esc(K.einText || '')}" data-abk="einText" placeholder="z. B. RENNABEND IN SILVERSTONE"></label>` : ''}
              <div class="kc-feld">Aussehen der Texte (wie bei den Clips)<div class="kc-stile">${STILE.map(([k, name]) => `<button type="button" class="${K.stil === k ? 'an' : ''}" data-c="abl-kar-stil" data-wert="${k}" title="Schrift und Bild-Effekt für alle Seiten dieses Karussells">${name}</button>`).join('')}<button type="button" data-c="abl-kar-stil" data-wert="?" title="Anderes Aussehen würfeln">🎲</button></div></div>
              <div class="kc-feld">Farbe von Text, Rahmen und Knöpfen<div class="kc-farben"><div class="kc-stile" style="margin:0"><button type="button" class="${K.farbe ? '' : 'an'}" data-c="abl-kar-farbe" data-wert="" title="Die Farbe wird aus dem ersten Foto bestimmt (wie bisher)">Automatisch</button></div>${FARBEN.map(f => `<button type="button" class="kc-farbe${f === K.farbe ? ' an' : ''}" style="--f:${f}" data-c="abl-kar-farbe" data-wert="${f}" title="Diese Farbe für alle Seiten dieses Karussells" aria-label="Farbe ${f}"></button>`).join('')}</div></div>
              <span class="kc-dim">${(K.textModus || 'auto') === 'auto' ? 'Automatisch: Tippst du in ein Feld oder klickst einen Spruch an, bleibt dieser Text stehen. „🎲“ an einer Seite würfelt nur dort neu.' : K.textModus === 'einer' ? 'Ein Text für alle: Änderst du danach ein einzelnes Feld, gilt das nur für diese Seite.' : 'Ohne Text: Einzelne Seiten kannst du trotzdem von Hand beschriften.'} Aussehen und Farbe werden gemerkt.</span>
            </div>
            ${wahl.slice(0, K.schluss ? KAR_MAX - 1 : KAR_MAX).map((n, i, alle) => { const s = karFoto(n), d = `data-name="${esc(n)}"`; return `<div class="kc-kar-zeile">
              <canvas class="kc-kar-vs${teamOk(K.team) ? ' mit-team' : ''}" data-abv="${esc(n)}" width="432" height="540" title="Seite ${i + 1}: so wird sie gepostet${teamOk(K.team) ? ' · mit der Maus ziehen = Team-Logo verschieben' : ''}"></canvas>
              <div class="kc-kar-f"><b>Seite ${i + 1} <span class="kc-dim">${esc(fotoOrt(n) || n)}</span></b>
                <div class="kc-felder"><label class="kc-feld">Text groß<div class="kc-zeile"><input type="text" maxlength="28" value="${esc(s.gross)}" data-abk="s:gross" ${d} placeholder="z. B. RAD AN RAD"><button type="button" class="kc-kar-w" data-c="abl-kar-neu" ${d} title="Anderer Spruch nur für dieses Bild, passend zum Moment">🎲</button></div></label>
                  <label class="kc-feld">Text klein<input type="text" maxlength="44" value="${esc(s.klein)}" data-abk="s:klein" ${d} placeholder="z. B. Runde 12 · Seite an Seite"></label></div>
                <div class="kc-felder"><label class="kc-feld">Wo steht der Text?<select data-abk="s:ort" ${d}><option value="unten" ${s.ort === 'oben' ? '' : 'selected'}>unten</option><option value="oben" ${s.ort === 'oben' ? 'selected' : ''}>oben</option></select></label>
                  <label class="kc-feld">Was kommt aufs Foto?<select data-abk="s:look" ${d}>${KAR_LOOK.map(([w, name]) => `<option value="${w}" ${s.look === w ? 'selected' : ''}>${name}</option>`).join('')}</select></label></div>
                <div class="kc-kar-spr"><span class="kc-dim">Spruch anklicken = großer Text (nochmal anklicken = wieder weg):</span>${karSprueche(n).map(w => `<button type="button" class="${GROSS(String(s.gross || '').trim()) === w ? 'an' : ''}" data-c="abl-kar-spruch" ${d} data-wert="${esc(w)}">${esc(w)}</button>`).join('')}</div>
                <div class="kc-auto-kn"><button type="button" class="btn ki-k" data-c="abl-kar-hoch" ${d} ${i ? '' : 'disabled'} title="Dieses Foto eine Seite nach vorn">▲ nach vorn</button><button type="button" class="btn ki-k" data-c="abl-kar-runter" ${d} ${i < alle.length - 1 ? '' : 'disabled'} title="Dieses Foto eine Seite nach hinten">▼ nach hinten</button></div>
              </div></div>`; }).join('')}
            ${K.schluss ? `<div class="kc-kar-zeile"><canvas class="kc-kar-vs${teamOk(K.team) ? ' mit-team' : ''}" data-abv="::schluss" width="432" height="540" title="Letzte Seite: so wird sie gepostet"></canvas><div class="kc-kar-f"><b>Letzte Seite</b><span class="kc-dim">„Live auf YouTube“ mit dem nächsten Stream. Sie kommt von selbst und lässt sich unten mit dem Haken abschalten.</span></div></div>` : ''}
          </div>
          <label class="kc-check"><input type="checkbox" data-abk="schluss" ${K.schluss ? 'checked' : ''}> <span>Letzte Seite „Live auf YouTube“ anhängen</span></label>
          <div class="kc-auto-kn"><button type="button" class="btn kc-frei" data-c="abl-kar" ${seiten < 2 || ARBEIT ? 'disabled' : ''}>🖼 Karussell bauen & einplanen (${seiten} ${seiten === 1 ? 'Seite' : 'Seiten'})</button>
            <button type="button" class="btn ki-k" data-c="abl-foto-leer">Auswahl leeren</button></div></div>` : ''}</div>`;
    return `<details class="kc-abl" ${(OFFEN['kc-abl'] ?? offenStandard) ? 'open' : ''}><summary>${kopf} <span class="kc-dim">${frei.length} neu${ABL.liste.length > frei.length ? ` · ${ABL.liste.length - frei.length} verwendet` : ''}${ABL.fotos.length ? ` · ${ABL.fotos.length} ${ABL.fotos.length === 1 ? 'Foto' : 'Fotos'}` : ''} · Ordner „${esc(ABL.ordner.name)}“</span></summary>
      ${ABL.liste.length ? `<div class="kc-abl-reihe">${[...frei, ...ABL.liste.filter(x => b.has(x.name))].map(kachel).join('')}</div>` : '<div class="kc-leer">Noch keine Szene. In der Toolbox auf „Schnitt“ eine Szene fertig machen.</div>'}
      ${fotosHtml}
      <div class="kc-auto-kn"><button type="button" class="btn ki-k" data-c="abl-neu">↻ Neu lesen</button><button type="button" class="btn ki-k" data-c="abl-wechseln">Anderer Ordner</button></div></details>`;
  }

  const NEIN_KEY = 'k888_vorschlag_nein', neinListe = () => { try { return JSON.parse(localStorage.getItem(NEIN_KEY) || '[]'); } catch (e) { return []; } };
  const autoV = x => {   // Name und Zeichen eines automatischen Posts (auch für die Wochenansicht)
    const q = String((x && x.quelle) || '');
    if (x && x.vorlage === 'top3' && /^top5:/.test(q)) return VORLAGEN.find(y => y.id === 'top3');   // 🏆 Top 3 der Woche als Video
    const b = x && (trailerV(x.vorlage) || karV(x.vorlage)); if (!b) return null;
    return /^verpasst:/.test(q) ? { ...b, emoji: '▶', name: 'Stream verpasst?' } : /^morgen:/.test(q) ? { ...b, emoji: '🔴', name: 'Morgen live' } : /^woche:/.test(q) ? { ...b, emoji: '📅', name: 'Wochenvorschau' } : b;
  };
  function lueckenPlan(st, jetzt) {   // → 7 Tage: { tag, n (Posts an dem Tag), ms (Post-Zeit für einen Vorschlag), vorschlag }
    const cfg = st.clipcfg || {}, belegt = {}, zaehl = ms => { if (ms) { const t = tagVon(ms); belegt[t] = (belegt[t] || 0) + 1; } };
    for (const p of st.posts || []) if (p.status !== 'uebersprungen' && !p.gepostet) zaehl(p.typ === 'live' ? p.liveMs : p.postMs);
    for (const e of st.erledigt || []) zaehl(e.wann);
    for (const c of st.clips || []) if (!c.aus) zaehl((c.gepostet && c.gepostet.zeit) || (c.yt && c.yt.zeit) || c.postMs);
    const nein = new Set(neinListe()), streams = st.streams || [], alt = st.streamsAlt || [], benutzt = new Set((st.clips || []).map(c => c.quelle).filter(Boolean)), tage = [];
    const neu = c => Math.max(c.postMs || 0, (c.gepostet && c.gepostet.zeit) || 0) > jetzt - 6 * 86400000, top = top5Liste(st.clips, jetzt);
    let topFrei = top.liste.length >= 3 && !(st.clips || []).some(c => /^top5:/.test(c.quelle || '') && neu(c));
    let wocheFrei = !(st.posts || []).some(p => p.typ === 'woche') && !(st.clips || []).some(c => /^woche:/.test(c.quelle || '') && neu(c));
    const vorrat = ablFrei().filter(x => !nein.has('vorrat:' + x.name));   // 📂 fertige Szenen aus der Toolbox, je Lücke eine andere
    for (let i = 0; i < 7; i++) {
      const mitte = jetzt + i * 86400000, tag = tagVon(mitte), n = belegt[tag] || 0;
      let ms = new Date(`${tag}T${cfg.zeit || '18:30'}:00`).getTime(); if (ms < jetzt + 20 * 60000) ms = i === 0 && new Date(jetzt).getHours() < 22 ? jetzt + 20 * 60000 : 0;
      const e = { tag, n, ms, vorschlag: null };
      if (!n && ms && cfg.luecken !== false) {
        const gestern = alt.find(s => tagVon(s.liveMs) === tagVon(mitte - 86400000)), morgen = streams.find(s => tagVon(s.liveMs) === tagVon(mitte + 86400000)), woche = streams.filter(s => s.liveMs > ms && s.liveMs < ms + 7 * 86400000);
        e.vorschlag = [vorrat.length && { art: 'vorrat', q: 'vorrat:' + vorrat[0].name, name: vorrat[0].name, text: `🎬 Aus dem Vorrat · ${ablTitel(vorrat[0])}` },
          gestern && { art: 'verpasst', q: 'verpasst:' + gestern.rennKey, s: gestern, text: `▶ „Stream verpasst?“ · ${gestern.serie || gestern.titel}` },
          morgen && { art: 'morgen', q: 'morgen:' + morgen.rennKey, s: morgen, text: `🔴 „Morgen live“ · ${morgen.serie || morgen.titel}` },
          topFrei && (top.liste.slice(0, 3).every(y => MERK_IDS.has(y.id)) ? { art: 'top3v', q: 'top5:' + tag, top, text: '🏆 Top 3 der Woche (Video)' } : { art: 'top5', q: 'top5:' + tag, top, text: `🏆 Top ${top.liste.length} der Woche` }),
          wocheFrei && woche.length >= 2 && { art: 'woche', q: 'woche:' + tag, liste: woche, text: `📅 Wochenvorschau · ${woche.length} Streams` }].filter(k => k && !nein.has(k.q) && !benutzt.has(k.q))[0] || null;
        if (e.vorschlag && (e.vorschlag.art === 'top5' || e.vorschlag.art === 'top3v')) topFrei = false;
        if (e.vorschlag && e.vorschlag.art === 'woche') wocheFrei = false;
        if (e.vorschlag && e.vorschlag.art === 'vorrat') vorrat.shift();
      }
      tage.push(e);
    }
    return tage;
  }
  async function lueckeBauen(tag) {   // Vorschlag bauen und gleich freigegeben einplanen (der Klick ist die Freigabe)
    const st = stand(), e = lueckenPlan(st, Date.now()).find(y => y.tag === tag), v = e && e.vorschlag;
    if (v && v.art === 'vorrat') return ablOeffnen(v.name, e.ms);   // 📂 Szene aus dem Vorrat: öffnet sich im Editor, Zeit steht schon
    if (!v || ARBEIT || TRAILER_LAEUFT || KAR_LAEUFT) return;
    KAR_LAEUFT = true;
    try {
      await schriften(); const m = MAT || await material(), strm = (st.streams || [])[0] || null; await teamLaden();   // 🏁 gemerktes Team-Logo (Karussell, Videos)
      let h = 0; for (const ch of v.q) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      if (v.art === 'top3v') {   // 🏆 Top 3 als Video: die drei besten Clips der Woche in der Vorlage „Top 3 der Woche“ (Platz 3 → 2 → 1)
        const vl = VORLAGEN.find(y => y.id === 'top3'), quellen = [], urls = [];
        for (const y of v.top.liste.slice(0, 3)) {
          const r = await merkTx('c', 'readonly', o => o.get(y.id)), d = r && r.quellen && r.quellen[0] ? await merkTx('q', 'readonly', o => o.get(r.quellen[0])) : null;
          if (!d) throw new Error('Ein Original-Clip fehlt in diesem Browser. Bitte neu laden, dann kommt der Vorschlag als Karussell.');
          const ende = r.einst.ende || r.einst.dauer || 6, url = URL.createObjectURL(d); urls.push(url);
          quellen.push({ datei: d, url, name: d.name || 'Clip', dauer: r.einst.dauer || ende, start: Math.max(r.einst.start || 0, ende - 6), ende, titel: y.titel });
        }
        const [p1, p2, p3] = quellen;   // quellen = bester zuerst · die Vorlage will Platz 3, 2, 1
        const c = mitText({ id: Math.random().toString(36).slice(2), ...p3, vorlage: 'top3', ...spruecheNeu(vl), zeitlupe: false, modus: 'ganz', versatz: 0, farbe: vl.farbe, text: '', textEigen: false, look: 'neon', stil: stilNeu(''), folgeAn: false, team: teamStandard('clip'),
          extra: [p2, p1], insta: true, tiktok: !!(st.tiktok && st.tiktok.verbunden), youtube: !!(st.youtube && st.youtube.verbunden), postMs: e.ms });
        try {
          arbeit('🏆 Video „Top 3 der Woche“ wird gebaut … 0 %');
          const blob = await bauen(c, m, q => arbeit(`🏆 Video „Top 3 der Woche“ wird gebaut … ${Math.round(q * 100)} %`));
          arbeit('⬆ Hochladen …');
          const r = await UMG.igApi('POST', '/api/clip/neu', { vorlage: 'top3', auto: true, frei: true, quelle: v.q, titel: GROSS(c.hook), text: postText(c), postMs: e.ms, insta: true, tiktok: c.tiktok, youtube: c.youtube, test: false, thumbMs: 1300, dauer: blob.dauer });
          try { await hochladen(r.id, blob); } catch (err) { try { await UMG.igApi('POST', `/api/clip/${r.id}/weg`, {}); } catch (z) { /* egal */ } throw err; }
          try { const vb = await vorschaubild(c, m); if (vb) await senden(`/api/clip/${r.id}/bild`, vb); } catch (err) { /* Vorschaubild ist nur schön */ }
        } finally { try { vidsWeg(urls); } catch (err) { /* egal */ } urls.forEach(u => URL.revokeObjectURL(u)); }
      } else if (v.art === 'top5') {
        arbeit(`🏆 Karussell „Top ${v.top.liste.length} der Woche“ wird gebaut …`);
        for (const y of v.top.liste) { try { y.bild = y.bildUrl ? await bild(y.bildUrl) : null; } catch (err) { y.bild = null; } }
        await karHochladen(top5Seiten(m, v.top.liste, v.top.was, TR_FARBEN[h % TR_FARBEN.length], strm), { vorlage: 'kartop5', auto: true, frei: true, quelle: v.q, postMs: e.ms, titel: `TOP ${v.top.liste.length} DER WOCHE`,
          text: `🏆 Top ${v.top.liste.length} der Woche: Welcher Clip ist dein Favorit? Schreib die Nummer in die Kommentare 👇\n\n#simracing #iracing #kreids888` });
      } else {
        const s = v.s || v.liste[0], dz = ms => new Date(ms), uhrVon = ms => dz(ms).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
        const tagKurz = ms => GROSS(dz(ms).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' })), serie = s.serie || s.titel || 'Simracing', uhr = uhrVon(s.liveMs);
        let hg = null; if (v.art !== 'woche') { try { if (s.hg) hg = await bild(s.hg); } catch (err) { hg = null; } }
        const w = trailerWahl(st.clips, v.q, !!hg, []), basis = { farbe: TR_FARBEN[w.fi], serie, track: s.track || '', zeit: uhr, wann: dz(s.liveMs).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: '2-digit' }) };
        let x, titel, text, thumb = 3.4;
        if (v.art === 'morgen') { x = { ...basis, art: w.art.id, wort: 'MORGEN', tz: Number(uhr.slice(0, 2)) >= 17 ? 'MORGEN ABEND' : 'MORGEN' }; thumb = w.art.thumb; titel = `MORGEN LIVE · ${GROSS(serie)}`;
          text = `🔴 Morgen live: ${serie}${s.track ? ' · ' + s.track : ''} · ${uhr} Uhr\nSeid dabei!\n\n#simracing #iracing #live #kreids888`; }
        else if (v.art === 'verpasst') { x = { ...basis, art: 'heute', modus: 'verpasst', wort: 'STREAM', wort2: 'VERPASST?', oben: 'REPLAY', unten: 'GANZER STREAM AUF YOUTUBE', tz: 'GESTERN LIVE' }; titel = `STREAM VERPASST? · ${GROSS(serie)}`;
          text = `▶ Stream verpasst? ${serie}${s.track ? ' · ' + s.track : ''}\nDen ganzen Stream gibt es auf YouTube${s.yt ? ': https://youtu.be/' + s.yt : ' (@Kreids888).'}\n\n#simracing #iracing #kreids888`; }
        else { const l = v.liste.slice(0, 5); x = { ...basis, art: 'heute', modus: 'woche', wort: 'DIESE WOCHE', wort2: 'LIVE', tz: 'DIESE WOCHE', liste: l.map(y => ({ tag: tagKurz(y.liveMs), zeit: uhrVon(y.liveMs) + ' UHR', serie: GROSS(y.serie || y.titel || 'Stream') })) }; titel = 'DIESE WOCHE LIVE';
          text = `📅 Diese Woche live: ${v.liste.length} Streams\n${l.map(y => `${tagKurz(y.liveMs)} · ${uhrVon(y.liveMs)} Uhr · ${y.serie || y.titel}`).join('\n')}\n\n#simracing #iracing #live #kreids888`; }
        arbeit('🎬 Video wird gebaut …');
        const blob = await trailerBauen(x, m, hg, q => arbeit(`🎬 Video wird gebaut … ${Math.round(q * 100)} %`));
        arbeit('⬆ Hochladen …');
        const r = await UMG.igApi('POST', '/api/clip/neu', { vorlage: 'trailer' + x.art + w.fi, auto: true, frei: true, quelle: v.q, titel: titel.slice(0, 80), text, postMs: e.ms, insta: true,
          tiktok: !!(st.tiktok && st.tiktok.verbunden), youtube: !!(st.youtube && st.youtube.verbunden), test: false, thumbMs: Math.round(thumb * 1000), dauer: TRAILER_T });
        try { await hochladen(r.id, blob); } catch (err) { try { await UMG.igApi('POST', `/api/clip/${r.id}/weg`, {}); } catch (z) { /* egal */ } throw err; }
        try { const cv = leinwand(B, H); trailerZeichnen(cv.getContext('2d'), thumb, x, m, hg); const k = leinwand(540, 960); k.getContext('2d').drawImage(cv, 0, 0, 540, 960); const vb = await new Promise(ok => k.toBlob(ok, 'image/jpeg', 0.85)); if (vb) await senden(`/api/clip/${r.id}/bild`, vb); } catch (err) { /* Vorschaubild ist nur schön */ }
      }
      ARBEIT = ''; UMG.meldung(`Eingeplant: ${zeit(e.ms)} 🎉`); await UMG.laden();
    } catch (err) { ARBEIT = ''; zeichnen(); UMG.meldung(err.message || String(err), 1); }
    finally { KAR_LAEUFT = false; }
  }

  // ═══ ✏️ Geplantes wieder bearbeiten (NEU 20.11.2026) ═══
  // Beim Einplanen merkt sich der Browser die Einstellungen und die Videodatei (IndexedDB, nur auf diesem Gerät).
  // „✏️ Bearbeiten“ öffnet den Clip wieder im Editor wie einen neuen; beim Einplanen wird der alte geplante Post ersetzt.
  let MERK_IDS = new Set();   // Clips, deren Original dieser Browser noch hat
  let MERK_DB = null, BEARBEITE = null;   // BEARBEITE = wartet auf die Videodatei (wenn sie auf diesem Gerät nicht gemerkt ist)
  function merkDb() { if (!MERK_DB) MERK_DB = new Promise((ok, nein) => { try { const r = indexedDB.open('k888_clips', 1); r.onupgradeneeded = () => { r.result.createObjectStore('q'); r.result.createObjectStore('c'); }; r.onsuccess = () => ok(r.result); r.onerror = () => nein(r.error); } catch (e) { nein(e); } }); return MERK_DB; }
  const merkTx = async (store, mode, fn) => { const db = await merkDb(); return new Promise((ok, nein) => { const tx = db.transaction(store, mode), r = fn(tx.objectStore(store)); tx.oncomplete = () => ok(r && r.result); tx.onerror = tx.onabort = () => nein(tx.error); }); };
  const NICHT_MERKEN = ['datei', 'url', 'id', 'extra', 'ersetzt', 'cam'];
  const schlicht = (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype ? undefined : v);   // nur einfache Werte (keine Tonspur, keine Datei)
  const einstVon = c => { const e = {}; for (const [k, v] of Object.entries(c)) if (!NICHT_MERKEN.includes(k) && k[0] !== '_') e[k] = v; if (c.extra) e.extra = c.extra.map(x => einstVon(x)); return JSON.parse(JSON.stringify(e, schlicht)); };
  const quellKey = d => `${d.name}|${d.size}|${d.lastModified || 0}`;
  async function clipMerken(id, c) {   // nach dem Einplanen: Einstellungen + Videodatei(en) auf diesem Gerät behalten
    try {
      const keys = [];
      for (const q of quellenVon(c)) { if (!q.datei) return; const k = quellKey(q.datei); keys.push(k); await merkTx('q', 'readwrite', st => st.put(q.datei, k)); }
      let cam = '';
      if (c.cam && c.cam.datei && camPlatz(c) !== 'aus') { cam = quellKey(c.cam.datei); await merkTx('q', 'readwrite', st => st.put(c.cam.datei, cam)); }   // 📷 Cam-Datei gleich mit merken
      await merkTx('c', 'readwrite', st => st.put({ einst: einstVon(c), quellen: keys, cam, zeit: Date.now() }, id));
    } catch (e) { /* ohne Merken geht es auch: dann die Datei beim Bearbeiten nochmal reinziehen */ }
  }
  async function merkAufraeumen() {   // Gepostetes und Gelöschtes vergessen, unbenutzte Videodateien wegwerfen
    const st = stand(); if (!Array.isArray(st.clips)) return;
    try {
      // Originale bleiben bis 8 Tage nach dem Posten (für „Top 3 der Woche“ als Video), danach fliegen sie raus
      const rausZeit = x => Math.max((x.gepostet && x.gepostet.zeit) || 0, (x.tt && x.tt.zeit) || 0, (x.yt && x.yt.zeit) || 0);
      const da = new Set(st.clips.filter(x => !rausZeit(x) || rausZeit(x) > Date.now() - 8 * 86400000).map(x => x.id)), brauch = new Set(), bleibt = new Set();
      for (const id of await merkTx('c', 'readonly', o => o.getAllKeys())) {
        const r = await merkTx('c', 'readonly', o => o.get(id));
        if (!da.has(id) && (!r || Date.now() - (r.zeit || 0) > 10 * 60000)) await merkTx('c', 'readwrite', o => o.delete(id)); else { bleibt.add(id); for (const k of (r && r.quellen) || []) brauch.add(k); if (r && r.cam) brauch.add(r.cam); }
      }
      const neu = [...bleibt].sort().join('|') !== [...MERK_IDS].sort().join('|'); MERK_IDS = bleibt;
      if (neu && !AUTO_ED && !CLIP_ED && !CLIPS.length && !ARBEIT) zeichnen();   // Vorschläge können sich ändern (Top 3 als Video)
      for (const k of await merkTx('q', 'readonly', o => o.getAllKeys())) if (!brauch.has(k)) await merkTx('q', 'readwrite', o => o.delete(k));
    } catch (e) { /* egal */ }
  }
  let CLIP_ED = null;   // geplanter Clip im Schnell-Editor: { id, titel, text, postMs, insta, tiktok, youtube, gemerkt }
  function clipEdHtml() {
    const E = CLIP_ED, x = E && (stand().clips || []).find(y => y.id === E.id); if (!x) return '';
    const v = autoV(x) || karV(x.vorlage) || VORLAGEN.find(y => y.id === x.vorlage) || VORLAGEN[0], tk = stand().tiktok || {}, yt = stand().youtube || {};
    const haken = (k, name, geht) => `<label class="kc-check${geht ? '' : ' aus'}"><input type="checkbox" data-ce="${k}" ${E[k] && geht ? 'checked' : ''} ${geht ? '' : 'disabled'}> <span><b>${name}</b></span></label>`;
    return `<div class="kc-ae kc-ce"><div class="kc-ae-kopf">✏️ ${v.emoji} ${esc(v.name)} bearbeiten</div>
      <div class="kc-ae-innen">${x.video ? `<video class="kc-ae-vorschau" src="${esc(x.video)}" controls playsinline preload="metadata" ${x.bild ? `poster="${esc(x.bild)}"` : ''}></video>` : x.bild ? `<img class="kc-ae-vorschau" src="${esc(x.bild)}" alt="">` : ''}
      <div class="kc-ae-felder">
        <label class="kc-feld">Titel<input type="text" maxlength="80" value="${esc(E.titel)}" data-ce="titel"></label>
        <label class="kc-feld">Text unter dem Post<textarea rows="5" maxlength="2200" data-ce="text">${esc(E.text)}</textarea></label>
        <div class="kc-felder"><label class="kc-feld">Geht raus am<input type="datetime-local" value="${esc(lokal(E.postMs))}" data-ce="postMs"></label>
          ${x.kar ? `<div class="kc-ziele"><span class="kc-dim">Karussell: Instagram</span>${haken('tiktok', 'Auch an TikTok (Entwurf, Musik in der App)', !!tk.verbunden)}</div>` : `<div class="kc-ziele">${haken('insta', 'Instagram', true)}${haken('tiktok', 'TikTok', !!tk.verbunden)}${haken('youtube', 'YouTube', !!yt.verbunden)}</div>`}</div>
        <div class="kc-knoepfe"><button type="button" class="btn ki-k kc-frei" data-c="ce-speichern">✓ Speichern</button><button type="button" class="btn ki-k" data-c="ce-ab">Abbrechen</button></div>
        ${x.kar ? '' : '<div class="kc-hinweis kc-bearb">🎬 Auch das Video ändern (Vorlage, Spruch, Schnitt)? Zieh die Videodatei unten bei „Clip hier reinziehen“ rein. Sie öffnet sich im großen Editor und ersetzt diesen Post.</div>'}
      </div></div></div>`;
  }
  function clipEdEingabe(t) { const E = CLIP_ED, k = t.dataset.ce; if (!E) return; if (k === 'insta' || k === 'tiktok' || k === 'youtube') E[k] = t.checked; else if (k === 'postMs') { const ms = new Date(t.value).getTime(); if (isFinite(ms)) E.postMs = ms; } else E[k] = t.value; }
  async function clipEdSpeichern() {
    const E = CLIP_ED; if (!E) return;
    const x = (stand().clips || []).find(y => y.id === E.id);
    if (x && !x.kar && !E.insta && !E.tiktok && !E.youtube) return UMG.meldung('Bitte Instagram, TikTok oder YouTube anhaken.', 1);
    if (!(E.postMs > Date.now())) return UMG.meldung('Die Zeit liegt in der Vergangenheit. Bitte „Geht raus am“ ändern.', 1);
    try {
      await UMG.igApi('POST', `/api/clip/${E.id}/aendern`, { titel: String(E.titel || '').slice(0, 80), text: E.text, postMs: E.postMs, ...(x && x.kar ? { tiktok: E.tiktok } : { insta: E.insta, tiktok: E.tiktok, youtube: E.youtube }) });
      CLIP_ED = null; BEARBEITE = null; UMG.meldung(`Gespeichert: ${zeit(E.postMs)}`); await UMG.laden();
    } catch (e) { UMG.meldung(e.message || String(e), 1); }
  }
  const nachOben = () => { try { (BOX.querySelector(CLIP_ED ? '.kc-ce' : CLIPS.length ? '.kc-drop' : '.kc-bearb') || BOX).scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* egal */ } };   // zum Editor bzw. zum Hinweis
  async function bearbeiten(id) {
    const x = (stand().clips || []).find(y => y.id === id); if (!x || ARBEIT) return;
    if (AUTO_ED) { autoEdStill(); AUTO_ED = null; cancelAnimationFrame(AE_LAUF); }   // immer nur ein Editor offen
    if (CLIPS.some(c => c.ersetzt === id)) { zeichnen(); nachOben(); return UMG.meldung('Dieser Post ist schon im Editor.'); }
    let r = null; const dateien = [];
    if (!x.kar) { try { r = await merkTx('c', 'readonly', o => o.get(id)); for (const k of (r && r.quellen) || []) dateien.push(await merkTx('q', 'readonly', o => o.get(k))); } catch (e) { r = null; } }
    if (r && dateien.length && dateien.every(Boolean)) {   // auf diesem Gerät gemerkt: gleich mit allen Einstellungen öffnen
      const e = r.einst, urls = {}, urlVon = i => (urls[r.quellen[i]] = urls[r.quellen[i]] || URL.createObjectURL(dateien[i]));
      const c = { ...e, id: Math.random().toString(36).slice(2), datei: dateien[0], url: urlVon(0), ersetzt: id, postMs: x.postMs, insta: x.insta, tiktok: x.tiktok, youtube: x.youtube };
      if (e.extra) c.extra = e.extra.map((q, i) => ({ ...q, datei: dateien[i + 1] || dateien[0], url: urlVon(dateien[i + 1] ? i + 1 : 0) }));
      if (r.cam) { try { const d = await merkTx('q', 'readonly', o => o.get(r.cam)); if (d) c.cam = { datei: d, url: URL.createObjectURL(d), name: d.name || 'Cam' }; } catch (err) { /* dann ohne Cam */ } }
      BEARBEITE = null; CLIP_ED = null; CLIPS.unshift(c); zeichnen(); nachOben();
      UMG.meldung('Im Editor geöffnet. Ändern und neu einplanen, dann wird der alte Post ersetzt.');
    } else {   // nicht gemerkt (anderes Gerät oder älterer Post): Datei nochmal reinziehen, dann wie ein neuer Clip
      // Titel, Text, Zeit und Ziele gehen sofort (Schnell-Editor). Fürs Video selbst die Datei nochmal reinziehen.
      BEARBEITE = x.kar ? null : { id, postMs: x.postMs, insta: x.insta, tiktok: x.tiktok, youtube: x.youtube, vorlage: x.vorlage, titel: x.titel || '' };
      CLIP_ED = { id, titel: x.titel || '', text: x.text || '', postMs: x.postMs, insta: !!x.insta, tiktok: !!x.tiktok, youtube: !!x.youtube };
      zeichnen(); nachOben();
    }
  }
  function bearbeiteAnwenden(c) {   // die reingezogene Datei gehört zum geplanten Post, der bearbeitet wird
    const w = BEARBEITE; BEARBEITE = null; CLIP_ED = null; if (!w) return;
    if (VORLAGEN.some(v => v.id === w.vorlage)) vorlageSetzen(c, w.vorlage);
    Object.assign(c, { ersetzt: w.id, postMs: w.postMs, insta: w.insta, tiktok: w.tiktok, youtube: w.youtube });
  }
  async function altenErsetzen(alt) {   // der bearbeitete Post ist neu eingeplant: den alten (und was aus ihm gebaut war) wegnehmen
    for (const y of stand().clips || []) if ((y.id === alt || (y.quelle && y.quelle.endsWith(':' + alt))) && !(y.gepostet || y.tt || y.yt)) { try { await UMG.igApi('POST', `/api/clip/${y.id}/weg`, {}); } catch (e) { /* bleibt in der Liste */ } }
  }

  // ═══ ✏️ Automatisches bearbeiten (NEU 21.11.2026): Trailer und Vorschläge wie einen eigenen Post ändern ═══
  // Vorlage, Farbe, Wörter, Text, Zeit und Ziele. Sieht es danach anders aus, wird das Video neu gebaut und ersetzt das alte.
  let AE_TON = null;   // läuft gerade „▶ Anhören“?
  function autoEdStill() { if (AE_TON) { try { AE_TON.q.onended = null; AE_TON.q.stop(); AE_TON.ac.close(); } catch (e) { /* egal */ } AE_TON = null; } }
  async function autoEdHoeren() {   // Ton des Trailers vorspielen (Vorschau fängt dazu von vorn an)
    if (AE_TON) { autoEdStill(); return zeichnen(); }
    const E = AUTO_ED; if (!E) return;
    try {
      const buf = await trailerTon(E.art, E.ton), ac = new (window.AudioContext || window.webkitAudioContext)(), q = ac.createBufferSource();
      q.buffer = buf; q.connect(ac.destination); q.start(); AE_TON = { ac, q };
      q.onended = () => { if (AE_TON && AE_TON.q === q) { AE_TON = null; try { ac.close(); } catch (e) { /* egal */ } zeichnen(); } };
      zeichnen(); autoEdLauf();
    } catch (e) { UMG.meldung('Der Ton ließ sich nicht abspielen.', 1); }
  }
  let AUTO_ED = null, AE_LAUF = 0, OEFFNE = '';   // OEFFNE = Clip, der gleich nach dem Wechsel in den Reiter „🎬 Clips“ zum Bearbeiten aufgehen soll
  function oeffneJetzt() {
    const id = OEFFNE; OEFFNE = ''; if (!id || !BOX) return;
    const x = (stand().clips || []).find(y => y.id === id); if (!x) return;
    if (x.gepostet || x.tt || x.yt) { const z = BOX.querySelector(`.kc-post[data-id="${id}"]`); if (z) { const d = z.closest('details'); if (d) d.open = true; z.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }   // schon draußen: nur hinspringen
    if (x.auto) autoEdAuf(id); else bearbeiten(id);
  }
  const AE_NAME = { trailer: '🔴 Stream-Trailer', morgen: '🔴 Morgen live', verpasst: '▶ Stream verpasst?', woche: '📅 Wochenvorschau', top5: '🏆 Top der Woche' };
  function autoX(typ, s, st, postMs) {   // Wörter und Zahlen fürs Bild, frisch aus dem Streamkalender
    const dz = ms => new Date(ms), uhrVon = ms => dz(ms).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
    const tagKurz = ms => GROSS(dz(ms).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' }));
    if (typ === 'top5') return { top: true };
    if (typ === 'woche') return { serie: '', track: '', zeit: '', wann: '', modus: 'woche', wort: 'DIESE WOCHE', wort2: 'LIVE', tz: 'DIESE WOCHE',
      liste: (st.streams || []).filter(y => y.liveMs > postMs && y.liveMs < postMs + 7 * 86400000).slice(0, 5).map(y => ({ tag: tagKurz(y.liveMs), zeit: uhrVon(y.liveMs) + ' UHR', serie: GROSS(y.serie || y.titel || 'Stream') })) };
    if (!s) return null;
    const uhr = uhrVon(s.liveMs), std = Number(uhr.slice(0, 2)), basis = { serie: s.serie || s.titel || 'Simracing', track: s.track || '', zeit: uhr, wann: dz(s.liveMs).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: '2-digit' }) };
    if (typ === 'morgen') return { ...basis, wort: 'MORGEN', tz: std >= 17 ? 'MORGEN ABEND' : 'MORGEN' };
    if (typ === 'verpasst') return { ...basis, modus: 'verpasst', wort: 'STREAM', wort2: 'VERPASST?', oben: 'REPLAY', unten: 'GANZER STREAM AUF YOUTUBE', tz: 'GESTERN LIVE' };
    const heute = tagVon(postMs) === tagVon(s.liveMs);
    return { ...basis, wort: heute ? 'HEUTE' : 'GLEICH', tz: !heute ? 'GLEICH' : std >= 17 ? 'HEUTE ABEND' : std >= 12 ? 'HEUTE NACHMITTAG' : 'HEUTE' };
  }
  function autoTexte(typ, x, s, n) {   // Titel und Text für einen neuen Vorschlag
    const ort = `${x.serie}${x.track ? ' · ' + x.track : ''}`;
    if (typ === 'morgen') return { titel: `MORGEN LIVE · ${GROSS(x.serie)}`, text: `🔴 Morgen live: ${ort} · ${x.zeit} Uhr\nSeid dabei!\n\n#simracing #iracing #live #kreids888` };
    if (typ === 'verpasst') return { titel: `STREAM VERPASST? · ${GROSS(x.serie)}`, text: `▶ Stream verpasst? ${ort}\nDen ganzen Stream gibt es auf YouTube${s && s.yt ? ': https://youtu.be/' + s.yt : ' (@Kreids888).'}\n\n#simracing #iracing #kreids888` };
    if (typ === 'woche') return { titel: 'DIESE WOCHE LIVE', text: `📅 Diese Woche live: ${x.liste.length} Streams\n${x.liste.map(z => `${z.tag} · ${z.zeit} · ${z.serie}`).join('\n')}\n\n#simracing #iracing #live #kreids888` };
    return { titel: `TOP ${n} DER WOCHE`, text: `🏆 Top ${n} der Woche: Welcher Clip ist dein Favorit? Schreib die Nummer in die Kommentare 👇\n\n#simracing #iracing #kreids888` };
  }
  async function autoEdAuf(id, tag) {   // id = schon gebauter Post · tag = Vorschlag für eine Lücke
    if (ARBEIT || TRAILER_LAEUFT || KAR_LAEUFT) return;
    const st = stand(); let E = null;
    if (id) {
      const c = (st.clips || []).find(y => y.id === id); if (!c) return;
      if (c.vorlage === 'top3') return bearbeiten(id);   // Top 3 als Video: Titel, Text, Zeit und Ziele im Schnell-Editor
      let e = null; try { e = c.einst ? JSON.parse(c.einst) : null; } catch (err) { e = null; }
      const q = String(c.quelle || ''), mt = TR_MUSTER.exec(c.vorlage || '');
      const typ = (e && e.typ) || (c.trailer ? 'trailer' : /^morgen:/.test(q) ? 'morgen' : /^verpasst:/.test(q) ? 'verpasst' : /^woche:/.test(q) ? 'woche' : c.vorlage === 'kartop5' ? 'top5' : '');
      const rk = c.trailer || q.split(':').slice(1).join(':'), s = [...(st.streams || []), ...(st.streamsAlt || [])].find(y => y.rennKey === rk) || null;
      E = { id, typ, art: e ? e.art : (mt && mt[1]) || 'heute', fi: e ? e.fi : mt ? Number(mt[2] || 0) % TR_FARBEN.length : 0, x: e ? e.x : typ ? autoX(typ, s, st, c.postMs) : null, hgUrl: e ? e.hgUrl : (s && s.hg) || '', hgAn: e ? e.hgAn : undefined, ton: e && e.ton ? e.ton : tonStandard(),
        titel: c.titel || '', text: c.text || '', postMs: c.postMs, insta: !!c.insta, tiktok: !!c.tiktok, youtube: !!c.youtube, trailer: c.trailer || '', trailerLive: c.trailerLive || 0, quelle: q,
        team: e && 'team' in e ? teamOk(e.team) : undefined, teamOffen: !(e && 'team' in e) };   // 🏁 Team-Logo, mit dem der Post gebaut wurde (nicht gemerkt = die Einstellung von jetzt)
    } else {
      const e = lueckenPlan(st, Date.now()).find(y => y.tag === tag), v = e && e.vorschlag; if (!v) return;
      const s = v.s || null, x = autoX(v.art, s, st, e.ms), w = trailerWahl(st.clips, v.q, !!(s && s.hg), []);
      if (x) E = { id: '', typ: v.art, art: v.art === 'morgen' ? w.art.id : 'heute', fi: w.fi, x, ton: tonStandard(), hgUrl: (s && s.hg) || '', ...autoTexte(v.art, x, s, v.top ? v.top.liste.length : 0), postMs: e.ms,
        insta: true, tiktok: v.art !== 'top5' && !!(st.tiktok && st.tiktok.verbunden), youtube: v.art !== 'top5' && !!(st.youtube && st.youtube.verbunden), trailer: '', trailerLive: 0, quelle: v.q };
    }
    if (!E || !E.typ || !E.x) return UMG.meldung('Dieser Post lässt sich hier nicht bearbeiten (der Stream steht nicht mehr im Kalender).', 1);
    if (!MAT) await material();
    await teamLaden(); if (E.team === undefined) E.team = teamStandard(E.typ === 'top5' ? 'kar' : 'trailer');
    E.hg = null; try { if (E.hgUrl && E.typ !== 'woche' && E.typ !== 'top5') E.hg = await bild(E.hgUrl); } catch (err) { E.hg = null; }
    if (E.hgAn === undefined) E.hgAn = !!E.hg;
    if (!E.hg && E.art === 'plakat') E.art = 'heute';
    if (E.typ === 'top5') { const t = top5Liste(st.clips, Date.now()); for (const y of t.liste) { try { y.bild = y.bildUrl ? await bild(y.bildUrl) : null; } catch (err) { y.bild = null; } } E.topListe = t.liste; E.topWas = t.was;
      if (t.liste.length < 3) return UMG.meldung('Für die Top der Woche braucht es mindestens 3 gepostete Clips mit Zahlen.', 1); }
    E.name = AE_NAME[E.typ] || 'Post'; E.sicht0 = JSON.stringify([E.art, E.fi, E.x, E.hgAn, E.ton, E.team || null]);
    if (E.id && E.teamOffen && E.team) E.sicht0 = '';   // nicht gemerkt, mit welchem Logo der Post gebaut wurde: beim Speichern neu bauen, damit er zur Vorschau passt
    CLIP_ED = null; BEARBEITE = null;   // immer nur ein Editor offen
    AUTO_ED = E; zeichnen(); autoEdLauf();
    try { BOX.querySelector('.kc-ae').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) { /* egal */ }
  }
  function autoEdLauf() {   // Vorschau: das Video läuft im Kreis, das Karussell zeigt die erste Seite
    cancelAnimationFrame(AE_LAUF); const t0 = performance.now(); let letzte = 0;
    const lauf = jetzt => {
      const E = AUTO_ED; if (!E) return; AE_LAUF = requestAnimationFrame(lauf);
      if (!MAT) { if (!autoEdLauf.laedt) { autoEdLauf.laedt = true; material().catch(() => {}).then(() => { autoEdLauf.laedt = false; }); } return; }   // nach „Neu laden“ ist das Logo weg: neu holen
      const cv = BOX && BOX.querySelector('canvas.kc-ae-vorschau'); if (!cv) return;   // nur die Leinwand (der Schnell-Editor hat an der Stelle ein Video)
      if (E.typ === 'top5') { if (cv.dataset.fertig) return; cv.getContext('2d').drawImage(top5Seiten(MAT, E.topListe, E.topWas, TR_FARBEN[E.fi], null, E.team || null, true)[0], 0, 0, cv.width, cv.height); cv.dataset.fertig = '1'; return; }
      if (jetzt - letzte < 66) return; letzte = jetzt;
      const g = cv.getContext('2d'); g.save(); g.scale(cv.width / B, cv.height / H);
      try { trailerZeichnen(g, ((jetzt - t0) / 1000) % TRAILER_T, { ...E.x, art: E.art, farbe: TR_FARBEN[E.fi], team: E.team || null }, MAT, E.hgAn ? E.hg : null); } catch (err) { /* nächstes Bild */ }
      g.restore();
    };
    AE_LAUF = requestAnimationFrame(lauf);
  }
  function autoEdEingabe(t) {   // Tippen ändert nur die Werte, die Vorschau zieht von selbst nach (kein Neuzeichnen, sonst springt der Cursor)
    const E = AUTO_ED, k = t.dataset.ae; if (!E) return;
    if (k === 'effekte') { E.ton.effekte = t.checked; autoEdStill(); }
    else if (k === 'hgAn' || k === 'insta' || k === 'tiktok' || k === 'youtube') E[k] = t.checked;
    else if (k === 'titel' || k === 'text') E[k] = t.value;
    else if (k === 'postMs') { const ms = new Date(t.value).getTime(); if (isFinite(ms)) E.postMs = ms; }
    else if (k === 'liste') E.x.liste = t.value.split('\n').map(z => z.split('|').map(y => y.trim())).filter(z => z.some(Boolean)).slice(0, 5).map(z => ({ tag: GROSS(z[0] || ''), zeit: GROSS(z[1] || ''), serie: GROSS(z[2] || '') }));
    else E.x[k] = k === 'wort' || k === 'tz' ? GROSS(t.value) : t.value;
  }
  function autoEdHtml() {
    const E = AUTO_ED; if (!E) return '';
    const video = E.typ !== 'top5', woche = E.x.modus === 'woche', feld = (k, label, wert, extra) => `<label class="kc-feld">${label}<input type="text" value="${esc(wert || '')}" data-ae="${k}" ${extra || ''}></label>`;
    return `<div class="kc-ae"><div class="kc-ae-kopf">✏️ ${esc(E.name)} bearbeiten</div>
      <div class="kc-ae-innen"><canvas class="kc-ae-vorschau${teamOk(E.team) ? ' mit-team' : ''}" width="270" height="${video ? 480 : 338}"${teamOk(E.team) ? ' title="Mit der Maus ziehen = Team-Logo verschieben"' : ''}></canvas>
      <div class="kc-ae-felder">
        ${E.typ === 'trailer' || E.typ === 'morgen' ? `<div class="kc-ae-zeile"><span>Vorlage</span>${TR_ARTEN.filter(a => !a.bild || (E.hg && E.hgAn)).map(a => `<button type="button" class="kc-ae-chip${a.id === E.art ? ' an' : ''}" data-c="ae-art" data-wert="${a.id}">${esc(a.name)}</button>`).join('')}</div>` : ''}
        <div class="kc-ae-zeile"><span>Farbe</span>${TR_FARBEN.map((f, i) => `<button type="button" class="kc-ae-farbe${i === E.fi ? ' an' : ''}" style="--f:${f}" data-c="ae-farbe" data-wert="${i}" title="Farbe ${i + 1}"></button>`).join('')}</div>
        ${video ? `<div class="kc-ae-zeile"><span>Ton</span><label class="kc-check"><input type="checkbox" data-ae="effekte" ${E.ton.effekte !== false ? 'checked' : ''}> <span><b>🔊 Effekt-Töne</b></span></label><button type="button" class="kc-ae-chip" data-c="ae-hoeren">${AE_TON ? '⏹ Stopp' : '▶ Anhören'}</button></div>
        <div class="kc-ae-zeile"><span>Musik</span>${TR_MUSIK.map(y => `<button type="button" class="kc-ae-chip${y[0] === (E.ton.musik || 'ohne') ? ' an' : ''}" data-c="ae-musik" data-wert="${y[0]}">🎵 ${y[1]}</button>`).join('')}</div>` : ''}
        ${video && !woche ? `<div class="kc-felder">${feld('wort', 'Wort groß', E.x.wort)}${feld('tz', 'Zeile klein', E.x.tz)}${feld('serie', 'Serie', E.x.serie)}${feld('track', 'Strecke', E.x.track)}${E.x.modus === 'verpasst' ? '' : feld('zeit', 'Uhrzeit', E.x.zeit) + feld('wann', 'Tag', E.x.wann)}</div>` : ''}
        ${woche ? `<label class="kc-feld">Streams – eine Zeile pro Stream: Tag | Uhrzeit | Serie<textarea rows="5" data-ae="liste">${esc(E.x.liste.map(z => [z.tag, z.zeit, z.serie].join(' | ')).join('\n'))}</textarea></label>` : ''}
        ${video && E.hg ? `<label class="kc-check"><input type="checkbox" data-ae="hgAn" data-c="ae-neu" ${E.hgAn ? 'checked' : ''}> <span><b>Bild vom Rennen zeigen</b></span></label>` : ''}
        ${teamPanel('ae')}
        ${feld('titel', 'Titel', E.titel, 'maxlength="80"')}
        <label class="kc-feld">Text unter dem Post<textarea rows="4" maxlength="2200" data-ae="text">${esc(E.text)}</textarea></label>
        <div class="kc-felder"><label class="kc-feld">Geht raus am<input type="datetime-local" value="${esc(lokal(E.postMs))}" data-ae="postMs"></label>
          ${video ? `<div class="kc-ziele">${[['youtube', 'YouTube'], ['insta', 'Instagram'], ['tiktok', 'TikTok']].map(z => `<label class="kc-check"><input type="checkbox" data-ae="${z[0]}" ${E[z[0]] ? 'checked' : ''}> <span><b>${z[1]}</b></span></label>`).join('')}</div>` : '<span class="kc-dim">Karussell: geht nur zu Instagram.</span>'}</div>
        <div class="kc-knoepfe"><button type="button" class="btn ki-k kc-frei" data-c="ae-speichern" ${ARBEIT ? 'disabled' : ''}>✓ Speichern & freigeben</button><button type="button" class="btn ki-k" data-c="ae-ab">Abbrechen</button></div>
      </div></div></div>`;
  }
  async function autoEdSpeichern() {
    const E = AUTO_ED; if (!E || ARBEIT || KAR_LAEUFT) return;
    const st = stand(), video = E.typ !== 'top5';
    if (video && !E.insta && !E.tiktok && !E.youtube) return UMG.meldung('Bitte YouTube, Instagram oder TikTok anhaken.', 1);
    if (!(E.postMs > Date.now())) return UMG.meldung('Die Zeit liegt in der Vergangenheit. Bitte „Geht raus am“ ändern.', 1);
    autoEdStill();
    const nurText = !!E.id && JSON.stringify([E.art, E.fi, E.x, E.hgAn, E.ton, E.team || null]) === E.sicht0;   // Bild bleibt gleich: nur Text, Zeit und Ziele speichern
    const kopf = { titel: String(E.titel || '').slice(0, 80), text: E.text, postMs: E.postMs, frei: true, aus: false, einst: JSON.stringify({ typ: E.typ, art: E.art, fi: E.fi, x: E.x, hgUrl: E.hgUrl, hgAn: E.hgAn, ton: E.ton, team: E.team || null }),
      ...(video ? { insta: E.insta, tiktok: E.tiktok, youtube: E.youtube } : {}) };
    KAR_LAEUFT = true;
    try {
      if (nurText) await UMG.igApi('POST', `/api/clip/${E.id}/aendern`, kopf);
      else {
        const m = MAT || await material(); await teamPflicht(E.team);
        if (!video) { arbeit('🏆 Karussell wird gebaut …'); await karHochladen(top5Seiten(m, E.topListe, E.topWas, TR_FARBEN[E.fi], (st.streams || [])[0] || null, E.team || null), { ...kopf, vorlage: 'kartop5', auto: true, quelle: E.quelle }); }
        else {
          try { localStorage.setItem('k888_trailer_ton', JSON.stringify(E.ton)); } catch (err) { /* egal */ }   // gilt ab jetzt auch für neue Trailer
          const x = { ...E.x, art: E.art, farbe: TR_FARBEN[E.fi], ton: E.ton, team: E.team || null }, hg = E.hgAn ? E.hg : null, thumb = E.typ === 'trailer' || E.typ === 'morgen' ? (TR_ARTEN.find(a => a.id === E.art) || TR_ARTEN[0]).thumb : 3.4;
          arbeit('🎬 Video wird gebaut …');
          const blob = await trailerBauen(x, m, hg, q => arbeit(`🎬 Video wird gebaut … ${Math.round(q * 100)} %`));
          arbeit('⬆ Hochladen …');
          const r = await UMG.igApi('POST', '/api/clip/neu', { ...kopf, vorlage: 'trailer' + E.art + E.fi, auto: true, quelle: E.quelle || undefined, trailer: E.trailer || undefined, trailerLive: E.trailerLive || undefined, test: false, thumbMs: Math.round(thumb * 1000), dauer: TRAILER_T });
          try { await hochladen(r.id, blob); } catch (err) { try { await UMG.igApi('POST', `/api/clip/${r.id}/weg`, {}); } catch (z) { /* egal */ } throw err; }
          try { const cv = leinwand(B, H); trailerZeichnen(cv.getContext('2d'), thumb, x, m, hg); const k = leinwand(540, 960); k.getContext('2d').drawImage(cv, 0, 0, 540, 960); const vb = await new Promise(ok => k.toBlob(ok, 'image/jpeg', 0.85)); if (vb) await senden(`/api/clip/${r.id}/bild`, vb); } catch (err) { /* Vorschaubild ist nur schön */ }
        }
        if (E.id) { try { await UMG.igApi('POST', `/api/clip/${E.id}/weg`, {}); } catch (err) { /* der alte bleibt dann in der Liste */ } }   // das alte Video ist ersetzt
      }
      AUTO_ED = null; cancelAnimationFrame(AE_LAUF); ARBEIT = '';
      UMG.meldung(`Gespeichert und freigegeben: ${zeit(E.postMs)}`); await UMG.laden();
    } catch (err) { ARBEIT = ''; zeichnen(); UMG.meldung(err.message || String(err), 1); }
    finally { KAR_LAEUFT = false; }
  }

  // ═══ 🤖 Automatik-Leiste (NEU 20.11.2026): zeigt, was das Dashboard von selbst gebaut hat. Raus geht es erst nach „✓ Freigeben“ (abschaltbar). ═══
  function automatikHtml(liste, cfg) {
    const jetzt = Date.now(), noetig = cfg.freigabe !== false;
    const auto = liste.filter(x => x.auto && !(x.gepostet || x.tt || x.yt) && x.postMs > jetzt - 86400000).sort((a, b) => (a.aus ? 1 : 0) - (b.aus ? 1 : 0) || a.postMs - b.postMs);
    const warten = auto.filter(x => !x.frei && !x.aus && x.postMs > jetzt).length;
    const karte = x => {
      const v = autoV(x) || { emoji: '🤖', name: 'Automatik' }, vorbei = x.postMs <= jetzt, fehlt = !x.video && !x.karussell;
      const status = x.aus ? ['Wird nicht gepostet', 'grau'] : fehlt ? [x.kar ? 'Bilder fehlen' : 'Video fehlt', 'rot'] : !noetig ? ['Geht von selbst raus', 'gruen'] : x.frei ? ['Freigegeben ✓', 'gruen'] : vorbei ? ['Zeit vorbei · nicht gepostet', 'rot'] : ['Wartet auf Freigabe', 'gelb'];
      const kn = x.aus ? '<button type="button" class="btn ki-k" data-c="auto-an">↩ Doch posten</button>'
        : `${noetig && !x.frei && !vorbei && !fehlt ? '<button type="button" class="btn ki-k kc-frei" data-c="auto-frei">✓ Freigeben</button>' : ''}<button type="button" class="btn ki-k" data-c="auto-bearb">✏️ Bearbeiten</button>${noetig && x.frei ? '<button type="button" class="btn ki-k" data-c="auto-zurueck">↩ Zurücknehmen</button>' : ''}<button type="button" class="btn ki-k" data-c="auto-aus">✕ Nicht posten</button>`;
      return `<div class="kc-auto-karte ${status[1]}" data-id="${esc(x.id)}">
        <a class="kc-auto-bild${x.kar ? '' : ' hoch'}" href="${esc(x.video || (x.kbilder && x.kbilder[0]) || '#')}" target="_blank" rel="noopener" title="Ansehen">${x.bild ? `<img src="${esc(x.bild)}" alt="">` : v.emoji}</a>
        <div class="kc-auto-info"><b>${v.emoji} ${esc(v.name)}</b><span class="kc-auto-titel">${esc(x.titel || '')}${x.karussell ? ` · ${x.karussell} Bilder` : ''}</span>
          <span class="kc-dim">Geht raus: <b>${esc(zeit(x.postMs))}</b></span><span class="kc-dim">${[x.insta ? 'Instagram' : '', x.tiktok ? 'TikTok' : '', x.youtube ? 'YouTube' : ''].filter(Boolean).join(' + ')}</span>
          <span class="kc-auto-status ${status[1]}">${status[0]}</span>${x.fehler ? `<span class="kc-hinweis rot">⚠ ${esc(x.fehler)}</span>` : ''}
          <div class="kc-auto-kn">${kn}</div></div></div>`;
    };
    const tage = lueckenPlan(stand(), jetzt), tagName = t => new Date(t + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const tagHtml = e => `<div class="kc-tagz ${e.n ? 'voll' : 'leer'}"><b>${esc(tagName(e.tag))}</b>${e.n ? `<span class="kc-tag-ok">✓ ${e.n} ${e.n === 1 ? 'Post' : 'Posts'}</span>`
      : `<span class="kc-tag-leer">Lücke</span>${e.vorschlag ? `<span class="kc-vor">${esc(e.vorschlag.text)}</span><div class="kc-auto-kn">${e.vorschlag.art === 'vorrat' ? `<button type="button" class="btn ki-k kc-frei" data-c="luecke-bauen" data-tag="${e.tag}" title="Szene im Editor öffnen, der Tag ist schon eingestellt">✏️ Öffnen</button>` : `<button type="button" class="btn ki-k kc-frei" data-c="luecke-bauen" data-tag="${e.tag}" title="Bauen und für diesen Tag einplanen">✓ Bauen</button>`}${e.vorschlag.art === 'top3v' || e.vorschlag.art === 'vorrat' ? '' : `<button type="button" class="btn ki-k" data-c="luecke-bearb" data-tag="${e.tag}" title="Vorher ansehen und ändern">✏️</button>`}<button type="button" class="btn ki-k" data-c="luecke-nein" data-tag="${e.tag}" title="Diesen Vorschlag nicht mehr zeigen">✕</button></div>` : '<span class="kc-dim">Hier fehlt ein Clip.</span>'}`}</div>`;
    const sw = (k, an, text, tip) => `<label class="kc-check" title="${esc(tip)}"><input type="checkbox" data-c="cfg-${k}" ${an ? 'checked' : ''}> <span><b>${text}</b></span></label>`;
    return `<div class="kc-auto"><h3 class="kc-h">🤖 Automatik <span class="kc-dim">${warten ? `${warten} ${warten === 1 ? 'wartet' : 'warten'} auf deine Freigabe` : ''}</span></h3>
      <div class="kc-dim">Das baut das Dashboard von selbst. ${noetig ? 'Ohne Freigabe geht nichts raus.' : 'Es geht ohne Freigabe von selbst raus.'}</div>
      ${auto.length ? `<div class="kc-auto-reihe">${auto.map(karte).join('')}</div>` : '<div class="kc-leer">Gerade nichts gebaut. Trailer kommen bis zu 4 Tage vor dem Stream.</div>'}
      ${autoEdHtml()}
      <div class="kc-auto-h">📅 Die nächsten 7 Tage <span class="kc-dim">Ziel: jeden Tag ein Post</span></div>
      <div class="kc-tage">${tage.map(tagHtml).join('')}</div>
      <div class="kc-auto-schalter">
        ${sw('trailer', cfg.trailer !== false, '🔴 Stream-Trailer', 'Für jeden Stream der nächsten 4 Tage ein kurzes Video „HEUTE LIVE“ als YouTube-Short, 2,5 Stunden vor „Live ab“. Nur YouTube, damit bei Instagram und TikTok nichts doppelt zum Raceday-Post kommt. 8 Vorlagen und 7 Farben wechseln von selbst.')}
        ${sw('luecken', cfg.luecken !== false, '📅 Vorschläge für Lücken', 'Für einen Tag ohne Post schlägt die Leiste etwas vor: zuerst eine Szene aus dem Vorrat (Toolbox), sonst einen Post, der keinen Clip braucht: „Stream verpasst?“, „Morgen live“, Top 5 der Woche oder Wochenvorschau. Gebaut wird erst, wenn du es anklickst.')}
        ${sw('freigabe', noetig, '✓ Freigabe nötig', 'An: Automatisches geht erst raus, wenn du „✓ Freigeben“ drückst. Aus: es geht von selbst raus.')}
      </div></div>`;
  }

  // ═══ Look „📺 TV-Sendung“: Senderlogo, LIVE/REPLAY, Schlagzeile, Bildschirm, Bauchbinde, Laufschrift ═══
  const SAx = w => (g, px) => SA(g, px, w);
  function studio(farbe) {   // Studio-Hintergrund: dunkel, Lichtkegel, feines Zeilenraster
    return merk('studio' + farbe, () => {
      const c = leinwand(B, H), g = c.getContext('2d');
      const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#070a12'); lg.addColorStop(0.5, '#0b1020'); lg.addColorStop(1, '#04060a');
      g.fillStyle = lg; g.fillRect(0, 0, B, H);
      licht(g, B / 2, 360, 950, farbe, 0.17); licht(g, B / 2, H - 260, 850, farbe, 0.13);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = 60 + i * 190, gr = g.createLinearGradient(x, 0, x + 200, H * 0.62); gr.addColorStop(0, hexA(farbe, 0.11)); gr.addColorStop(1, hexA(farbe, 0));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - 26, 0); g.lineTo(x + 26, 0); g.lineTo(x + 250, H * 0.62); g.lineTo(x + 50, H * 0.62); g.closePath(); g.fill();
      }
      g.restore();
      g.fillStyle = 'rgba(255,255,255,.022)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, B, 1);
      return c;
    });
  }
  function tvKopf(g, t, m, f, status, eq) {   // Senderlogo links, LIVE / PAUSE / REPLAY rechts, Neon-Linie (eq: Kommentator spricht)
    const replay = status !== 'live';
    const y = 298;
    logoRing(g, 76, y + 27, 28, f, m.logo, t);
    g.save(); SA(g, passt(g, m.name, eq ? 380 : 440, 44, SAx(900), 26), 900); g.fillStyle = '#fff'; g.fillText(m.name, 120, y + 43); const w = g.measureText(m.name).width; g.restore();
    pille(g, 'TV', 120 + w + 12, y + 5, f, 27, true);
    const txt = status === 'pause' ? 'PAUSE' : status === 'ziel' ? 'ZIEL' : replay ? 'REPLAY' : 'LIVE', farbe = replay ? f : '#ff2a2a';
    g.save(); SA(g, 36, 900); const bw = g.measureText(txt).width + 70, bx = B - 44 - bw, by = y + 2;
    g.shadowColor = farbe; g.shadowBlur = 20; g.fillStyle = farbe; g.fillRect(bx, by, bw, 50); g.shadowBlur = 0;
    g.fillStyle = replay ? '#06080a' : '#fff'; g.fillText(txt, bx + 48, by + 38);
    if (replay || Math.floor(t * 2) % 2 === 0) { g.beginPath(); g.arc(bx + 26, by + 25, 9, 0, Math.PI * 2); g.fill(); }
    if (eq) {   // Mikrofon + Pegel-Balken: der Kommentator spricht
      const ex = bx - 150, r = zufallR(Math.floor(t * 12) + 3);
      g.fillStyle = '#fff'; rr(g, ex, by + 6, 16, 26, 8); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(ex + 8, by + 22, 13, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.fillRect(ex + 6, by + 35, 4, 9);
      g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 12;
      for (let i = 0; i < 6; i++) { const hh = 8 + r() * 34; g.fillRect(ex + 34 + i * 15, by + 25 - hh / 2, 9, hh); }
    }
    g.restore();
    g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 18; g.fillRect(40, y + 66, B - 80, 4); g.restore();
  }
  const rundeText = r => { const s = String(r || '').trim(); return !s ? '' : /^\d+\s*(\/\s*\d+)?$/.test(s) ? 'RUNDE ' + s.replace(/\s+/g, '') : GROSS(s); };
  function tvSchlagzeile(g, t, c, v, f) {   // Etikett + Schlagzeile, wischen von links rein (Kommentator: Serie, Runde, Spruch in „…“)
    let zeilen = zweiZeilen(GROSS(c.hook || v.hooks[0]));
    if (v.kommentator) zeilen = zeilen.map((z, i) => (i === 0 ? '„' : '') + z + (i === zeilen.length - 1 ? '“' : ''));
    const px = zeilen.length > 1 ? 112 : 128, x0 = 40, y0 = 386, bw = B - 80;
    const q1 = eo(fp(t, 0.15, 0.4)), q2 = eo(fp(t, 0.28, 0.62));
    if (q1 > 0) {
      g.save(); g.beginPath(); g.rect(x0, y0, bw * q1, 56); g.clip();
      const tx = v.kommentator ? (GROSS(String(c.serie || '').trim()) || tagText(v, c)) : tagText(v, c), ik = v.kommentator ? 34 : 0;
      SA(g, passt(g, tx, 560, 37, SAx(900), 24), 900); const tw = g.measureText(tx).width + 46 + ik;
      g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16; g.fillRect(x0, y0, tw, 56); g.shadowBlur = 0; g.fillStyle = '#06080a'; g.fillText(tx, x0 + 23 + ik, y0 + 42);
      if (ik) { rr(g, x0 + 20, y0 + 12, 14, 22, 7); g.fill(); g.strokeStyle = '#06080a'; g.lineWidth = 3; g.beginPath(); g.arc(x0 + 27, y0 + 26, 11, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.fillRect(x0 + 25, y0 + 37, 4, 8); }
      const rt = v.kommentator ? rundeText(c.runde) : '';
      if (rt) {   // Runde rechts in derselben Zeile
        SA(g, 34, 900); const rw = g.measureText(rt).width + 44, rx = x0 + bw - rw;
        g.fillStyle = 'rgba(8,11,20,.92)'; g.fillRect(rx, y0, rw, 56); g.strokeStyle = f; g.lineWidth = 3; g.strokeRect(rx + 1.5, y0 + 1.5, rw - 3, 53);
        g.fillStyle = '#fff'; g.fillText(rt, rx + 22, y0 + 41);
      }
      g.restore();
    }
    if (q2 <= 0) return;
    const y = y0 + 56, h = zeilen.length * px * 1.0 + 44;
    g.save(); g.beginPath(); g.rect(x0, y, bw * q2, h); g.clip();
    g.fillStyle = 'rgba(8,11,20,.9)'; g.fillRect(x0, y, bw, h);
    g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 22; g.fillRect(x0, y, 14, h); g.shadowBlur = 0;
    zeilen.forEach((z, i) => { SA(g, passt(g, z, bw - 90, px, SAx(900), 40), 900); g.fillStyle = '#fff'; g.shadowColor = hexA(f, 0.7); g.shadowBlur = 20; g.fillText(z, x0 + 46, y + 19 + px * 0.84 + i * px); });
    // Lichtstreifen über den Kasten (alle 3,2 s)
    const gq = ((t - 1.1) % 3.2) / 0.7;
    if (t > 1.1 && gq <= 1) { const bx = x0 - 300 + (bw + 600) * gq, gr = g.createLinearGradient(bx, 0, bx + 220, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.shadowBlur = 0; g.fillStyle = gr; g.fillRect(x0, y, bw, h); }
    g.restore();
  }
  function tvBildschirm(g, t, p, f, vid, rz, L, tf) {   // Clip als Fernsehbild: geht an wie ein alter Fernseher
    const fx = L.fx, fy = L.fy, fw = L.fw, fh = L.fh, an = eo(fp(t, 0.04, 0.3)), hh = Math.max(4, fh * an);
    g.save(); g.beginPath(); g.rect(fx, fy + (fh - hh) / 2, fw, hh); g.clip();
    g.fillStyle = '#000'; g.fillRect(fx, fy, fw, fh);
    if (vid) quellBild(g, vid, fx, fy, fw, fh, rz ? 1.12 : 1, 0, tf);
    if (an < 1) { g.fillStyle = `rgba(255,255,255,${0.85 * (1 - an)})`; g.fillRect(fx, fy, fw, fh); }
    g.fillStyle = 'rgba(0,0,0,.09)'; for (let y = fy; y < fy + fh; y += 4) g.fillRect(fx, y, fw, 1);
    g.save(); SA(g, 30, 900); g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('K888 TV', fx + fw - 20, fy + 44); g.restore();
    if (rz) pille(g, 'ZEITLUPE 0.5×', fx + 18, fy + 16, f, 26, true);
    g.restore();
    g.save(); g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 4; g.strokeRect(fx - 2, fy - 2, fw + 4, fh + 4);
    g.strokeStyle = f; g.shadowColor = f; g.shadowBlur = 26; g.lineWidth = 3; g.strokeRect(fx - 9, fy - 9, fw + 18, fh + 18); g.restore();
    const pr = kl(t / (p.T - OUTRO), 0, 1);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(fx, fy + fh + 14, fw, 6);
    g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 14; g.fillRect(fx, fy + fh + 14, fw * pr, 6); g.restore();
  }
  function tvEtikett(g, x, y, label, f) {
    SA(g, 34, 900); const lw = g.measureText(label).width + 44;
    g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16; g.fillRect(x, y, lw, 52); g.restore();
    g.fillStyle = '#06080a'; g.fillText(label, x + 22, y + 38);
  }
  function tvBauchbinde(g, label, text, f, q, dy) {   // Bauchbinde unter dem Bild: Etikett + weißer Kasten
    if (q <= 0) return;
    const x = 40, y = 1326 + (dy || 0);
    g.save(); g.translate(-(1 - eo(q)) * (B + 60), 0);
    tvEtikett(g, x, y, label, f);
    const px = passt(g, text, B - 170, 60, SAx(900), 30); SA(g, px, 900);
    const tw = Math.min(B - 80, g.measureText(text).width + 100);
    g.fillStyle = '#f4f6fa'; g.fillRect(x, y + 52, tw, 94);
    g.fillStyle = f; g.fillRect(x + tw - 12, y + 52, 12, 94);
    g.fillStyle = '#0a0d16'; g.fillText(text, x + 36, y + 52 + 47 + px * 0.36);
    g.restore();
  }
  function tvErgebnis(g, erg, f, dy) {   // Rundenzeit / Abstand als Ergebnis-Einblendung
    const x = 40, y = 1326 + (dy || 0), info = erg.info && erg.info !== erg.label && erg.wert.length <= 12 ? erg.info : '';
    g.save(); g.translate(-(1 - eo(erg.q)) * (B + 60), 0);
    tvEtikett(g, x, y, erg.label, f);
    const px = passt(g, erg.wert, info ? 540 : 880, 82, OR, 40); OR(g, px); const ww = g.measureText(erg.wert).width;
    let tw = ww + 100, ipx = 0;
    if (info) { ipx = passt(g, info, Math.max(120, B - 80 - tw - 50), 40, SAx(700), 20); SA(g, ipx, 700); tw += g.measureText(info).width + 44; }
    tw = Math.min(B - 80, tw);
    g.fillStyle = '#f4f6fa'; g.fillRect(x, y + 52, tw, 110); g.fillStyle = f; g.fillRect(x + tw - 12, y + 52, 12, 110);
    OR(g, px); g.fillStyle = '#0a0d16'; g.fillText(erg.wert, x + 36, y + 52 + 55 + px * 0.36);
    if (info) { SA(g, ipx, 700); g.fillStyle = '#3a4152'; g.fillText(info, x + 36 + ww + 34, y + 52 + 55 + ipx * 0.36); }
    g.restore();
  }
  function tvLaufschrift(g, t, m, f, eigen, dy) {   // Laufschrift ganz unten, Sender links, FOLGEN rechts (eigen: eigener Text)
    const y = 1508 + (dy || 0), h = 70, links = 236, rechts = 250;
    g.fillStyle = 'rgba(5,7,12,.95)'; g.fillRect(0, y, B, h);
    g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 14; g.fillRect(0, y - 4, B, 4); g.restore();
    const txt = eigen ? `+++ ${GROSS(eigen)} +++ FOLG ${m.handle} ` : `+++ SIMRACING-CLIPS VON ${m.handle} +++ FOLGEN NICHT VERGESSEN +++ SCHREIB DEINE MEINUNG IN DIE KOMMENTARE `;
    g.save(); g.beginPath(); g.rect(links, y, B - links - rechts, h); g.clip();
    SA(g, 42, 700); const w = g.measureText(txt).width; g.fillStyle = '#fff';
    for (let x = links - ((t * 170) % w); x < B; x += w) g.fillText(txt, x, y + 49);
    g.restore();
    g.save(); g.fillStyle = f; g.fillRect(0, y, links, h); SA(g, passt(g, m.name, links - 40, 40, SAx(900), 22), 900); g.fillStyle = '#06080a'; g.fillText(m.name, 22, y + 49); g.restore();
    g.save(); g.fillStyle = 'rgba(5,7,12,1)'; g.fillRect(B - rechts, y, rechts, h); g.restore();
    const puls = 1 + 0.06 * Math.max(0, Math.sin(t * Math.PI * 2));
    g.save(); g.translate(B - rechts / 2 + 4, y + h / 2); g.scale(puls, puls); pille(g, '+ FOLGEN', -104, -26, f, 32, true); g.restore();
  }
  function tvWischer(g, t, f, m, t0) {   // Replay-Übergang: Neon-Band mit Logo wischt quer durchs Bild
    const d = t - t0; if (d < 0 || d > 0.5) return;
    const q = d / 0.5, s = 560, x = -s - 420 + q * (B + 2 * s + 840);
    g.save(); g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 50;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + s, 0); g.lineTo(x + s - 420, H); g.lineTo(x - 420, H); g.closePath(); g.fill();
    g.shadowBlur = 0; g.globalAlpha = 0.55; g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(x + s, 0); g.lineTo(x + s + 46, 0); g.lineTo(x + s - 374, H); g.lineTo(x + s - 420, H); g.closePath(); g.fill();
    g.globalAlpha = 1; const cx = x + s / 2 - 210, cy = H / 2;
    logoRing(g, cx, cy - 70, 96, '#ffffff', m.logo, t);
    SA(g, 96, 900); g.textAlign = 'center'; g.fillStyle = '#06080a'; g.fillText('REPLAY', cx, cy + 112);
    g.restore();
  }
  function tvAbspann(g, t, m, f) {   // kurz Testbild, dann „BLEIB DRAN!“
    if (t < 0.24) {
      ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].forEach((x, i) => { g.fillStyle = x; g.fillRect(Math.floor(i * B / 7), 0, Math.ceil(B / 7) + 1, H * 0.72); });
      ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'].forEach((x, i) => { g.fillStyle = x; g.fillRect(Math.floor(i * B / 7), H * 0.72, Math.ceil(B / 7) + 1, H * 0.08); });
      g.fillStyle = '#05070c'; g.fillRect(0, H * 0.8, B, H * 0.2);
      g.save(); g.fillStyle = '#000'; g.fillRect(B / 2 - 300, H * 0.36, 600, 140); SA(g, 84, 900); g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('K888 TV', B / 2, H * 0.36 + 102); g.restore();
      return;
    }
    g.drawImage(studio(f), 0, 0);
    const q = eob(fp(t, 0.24, 0.62)), q2 = eo(fp(t, 0.4, 0.75)), q3 = eo(fp(t, 0.6, 0.95));
    g.save(); g.translate(B / 2, 690); g.scale(q, q); logoRing(g, 0, 0, 160, f, m.logo, t); g.restore();
    if (q2 > 0) { g.save(); g.globalAlpha = q2; SA(g, passt(g, 'BLEIB DRAN!', 980, 156, SAx(900)), 900); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = f; g.shadowBlur = 40; g.fillText('BLEIB DRAN!', B / 2, 1045); g.restore(); }
    if (q3 > 0) {
      g.save(); g.globalAlpha = q3; neonText(g, m.handle, B / 2, 1150, passt(g, m.handle, 960, 80, RU, 40), f, RU, 'center');
      SA(g, 42, 700); g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.82)'; g.fillText('SIMRACING-CLIPS · IRACING', B / 2, 1330); g.restore();
      const puls = 1 + 0.06 * Math.max(0, Math.sin(t * Math.PI * 2));
      g.save(); g.globalAlpha = q3; g.translate(B / 2, 1236); g.scale(puls, puls); pille(g, '+ FOLGEN', -116, -30, f, 36, true); g.restore();
    }
  }
  function zeichneTV(g, t, c, p, m, vid, cam) {
    const v = vorlage(c), f = c.farbe || v.farbe;
    if (t >= p.T - OUTRO) return tvAbspann(g, t - (p.T - OUTRO), m, f);
    const rz = t >= p.D && t < p.D + p.R, [sx, sy] = rz && v.stempel ? schuetteln(t - p.D) : [0, 0];
    g.save(); g.translate(sx, sy);
    if (vid) { unscharf(g, vid); g.save(); g.globalAlpha = 0.88; g.drawImage(studio(f), 0, 0); g.restore(); } else g.drawImage(studio(f), 0, 0);
    const halt = angehalten(v, p, t), L = lage(c, true), mitte = L.fy + L.fh / 2;
    tvKopf(g, t, m, f, halt ? (v.zielflagge ? 'ziel' : 'pause') : rz ? 'replay' : 'live', !!v.kommentator);
    tvSchlagzeile(g, t, c, v, f);
    tvBildschirm(g, t, p, f, vid, rz, L, c.bild);
    if (halt) { g.fillStyle = v.zielflagge ? 'rgba(0,0,0,.2)' : 'rgba(0,0,0,.45)'; g.fillRect(L.fx, L.fy, L.fw, L.fh); }
    if (v.regen) { g.fillStyle = 'rgba(40,90,170,.14)'; g.fillRect(L.fx, L.fy, L.fw, L.fh); regen(g, t, p); }
    if (camPlatz(c) !== 'aus') camZeichnen(g, t, c, cam, f, { fx: L.fx, fy: L.fy, fw: L.fw, fh: L.fh, L, stapel: false }, 'tv');   // 📷 Cam im Fernsehbild
    if (v.gruenStart) flaggeZeichnen(g, L.fx + 46 - (1 - eo(fp(t, 0.15, 0.45))) * 300, L.fy + 34, Math.min(200, L.fw * 0.3), Math.min(200, L.fw * 0.3) * 0.66, t, 'gruen', fp(t, 0.15, 0.4) * (1 - fp(t, 2.6, 3.0)));
    if (v.zielflagge && halt) flaggeZeichnen(g, L.fx + 46 - (1 - eo(fp(t - p.h, 0, 0.45))) * 400, L.fy + 34, Math.min(240, L.fw * 0.32), Math.min(240, L.fw * 0.32) * 0.66, t, 'kariert', 1);
    if (v.bestzeit) bestzeitZeichnen(g, t, c, p, m, f, L.fx, L.fy, L.fw, L.fh);
    countdown(g, t, v, p, f, B / 2, mitte, true);
    if (rz) stempel(g, t, p, v, f, B / 2, mitte + 20);
    const erg = v.bestzeit ? null : ergebnis(v, c, p, t), fahrer = v.kommentator ? GROSS(String(c.fahrer || '').trim()) : '';
    if (erg) tvErgebnis(g, erg, f, L.dy);
    else if (fahrer) {   // Kommentator: erst der Fahrer in der Bauchbinde, dann die Frage
      const w = Math.min(4.6, Math.max(2.4, p.D * 0.45));
      if (t < w) tvBauchbinde(g, 'IM BILD', fahrer, f, fp(t, 0.9, 1.25) * (1 - fp(t, w - 0.3, w)), L.dy);
      else tvBauchbinde(g, 'FRAGE AN DICH', frageVon(c, v), f, fp(t, w, w + 0.35), L.dy);
    }
    else tvBauchbinde(g, 'FRAGE AN DICH', frageVon(c, v), f, fp(t, 0.9, 1.25), L.dy);
    tvLaufschrift(g, t, m, f, v.kommentator ? String(c.laufband || '').trim() : '', L.dy);
    g.restore();
    if (p.R) tvWischer(g, t, f, m, p.D - 0.25);
  }

  // ─── Ton: Clip-Ton + Zeitlupe (tiefer) + eigene Effekt-Sounds, auf gleiche Lautheit ───
  const TON_RATE = 48000;
  let RAUSCH = null;
  function rauschen(ctx) { if (!RAUSCH) { RAUSCH = ctx.createBuffer(1, TON_RATE * 2, TON_RATE); const d = RAUSCH.getChannelData(0), r = zufallR(7); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; } return RAUSCH; }
  // Ton schneller abspielen, ohne dass der Motor höher klingt: kurze Stücke mit Überblendung, jedes passend angelegt (WSOLA)
  function zeitraffen(ctx, buf, a, dauer, tempo) {
    const sr = buf.sampleRate, nch = buf.numberOfChannels, N = Math.round(0.06 * sr), Hs = N >> 1, D = Math.round(0.012 * sr);
    const n = Math.max(1, Math.floor(dauer / tempo * sr)), out = ctx.createBuffer(nch, n + N, sr), a0 = Math.floor(a * sr), L = buf.length;
    const x = Array.from({ length: nch }, (_, k) => buf.getChannelData(k)), y = Array.from({ length: nch }, (_, k) => out.getChannelData(k));
    const mono = new Float32Array(L); for (const ch of x) for (let i = 0; i < L; i++) mono[i] += ch[i];
    const fen = new Float32Array(N); for (let i = 0; i < N; i++) fen[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    let vor = a0;   // wo das letzte Stück im Original lag
    for (let o = 0, k = 0; o < n; o += Hs, k++) {
      const soll = a0 + Math.round(o * tempo);
      let best = soll;
      if (k) {   // Stelle suchen, die am besten an das letzte Stück anschließt
        const weiter = vor + Hs; let bw = -Infinity;
        for (let d = -D; d <= D; d += 2) {
          const q = soll + d; if (q < 0 || q + Hs >= L || weiter + Hs >= L) continue;
          let sum = 0; for (let i = 0; i < Hs; i += 4) sum += mono[q + i] * mono[weiter + i];
          if (sum > bw) { bw = sum; best = q; }
        }
      }
      for (let c2 = 0; c2 < nch; c2++) { const xs = x[c2], ys = y[c2]; for (let i = 0; i < N; i++) { const si = best + i; if (si >= 0 && si < L) ys[o + i] += xs[si] * fen[i]; } }
      vor = best;
    }
    return out;
  }
  async function tonMischen(c, p, quelle) {
    const ctx = new OfflineAudioContext(2, Math.ceil(TON_RATE * p.T), TON_RATE), aus = ctx.createDynamicsCompressor();
    aus.threshold.value = -10; aus.ratio.value = 4; aus.connect(ctx.destination);
    const rn = (t, d) => { const s = ctx.createBufferSource(); s.buffer = rauschen(ctx); s.loop = true; s.start(t); s.stop(t + d); return s; };
    if (p.mehr) {   // quelle = Tonspuren je Platz
      const spuren = quelle || [];
      const pegel = (buf, a, d) => {   // Lautstärke des Abschnitts → Faktor, damit alle Clips gleich laut sind
        const i0 = Math.max(0, Math.floor(a * buf.sampleRate)), i1 = Math.min(buf.length, Math.floor((a + d) * buf.sampleRate));
        let su = 0, n = 0; for (let ch = 0; ch < buf.numberOfChannels; ch++) { const x = buf.getChannelData(ch); for (let i = i0; i < i1; i += 7) { su += x[i] * x[i]; n++; } }
        const rms = Math.sqrt(su / (n || 1)); return rms > 1e-4 ? kl(0.126 / rms, 0.4, 2.5) : 1;
      };
      const teil = (buf, start, offset, dauer, vol, rate) => {
        if (!buf || dauer <= 0.05) return;
        if (!MARKEN[p.mehr]) vol *= pegel(buf, offset, dauer);
        const sn = ctx.createBufferSource(); sn.buffer = buf; if (rate) sn.playbackRate.value = rate;
        const gn = ctx.createGain(), ende = start + dauer / (rate || 1); sn.connect(gn); gn.connect(aus);
        gn.gain.setValueAtTime(0.0001, start); gn.gain.linearRampToValueAtTime(vol, start + 0.05); gn.gain.setValueAtTime(vol, Math.max(start + 0.05, ende - 0.08)); gn.gain.linearRampToValueAtTime(0.0001, ende);
        sn.start(start, offset, dauer);
      };
      if (p.mehr === 'top3' || p.mehr === 'erwartung') for (const k of p.teile) teil(spuren[k.q], k.S, k.a, k.d, 0.9);
      else if (p.mehr === 'vergleich') { teil(spuren[0], 0, p.x0.a, p.D, 0.55); teil(spuren[1], 0, p.x1.a, p.D, 0.55); }
      else if (p.tempo > 1.02 && spuren[0]) { const st = zeitraffen(ctx, spuren[0], p.x.a, p.x.b - p.x.a, p.tempo); teil(st, 0, 0, Math.min(st.duration, p.lauf), 0.7); }   // Zeitraffer: schneller, Motor klingt gleich
      else teil(spuren[0], 0, p.x.a, p.x.b - p.x.a, 0.7);
    } else if (quelle) {
      const h = ctx.createBufferSource(); h.buffer = quelle; const hg = ctx.createGain(); h.connect(hg); hg.connect(aus);
      if (p.FD) {   // bis zum Anhalten, dann Stille, dann weiter ab dem Haltepunkt
        hg.gain.setValueAtTime(0.9, 0); hg.gain.setValueAtTime(0.9, Math.max(0, p.h - 0.04)); hg.gain.linearRampToValueAtTime(0.0001, p.h);
        if (p.h > 0.02) h.start(0, p.a, p.h);
        else if (vorlage(c).ampel && p.a > 0.4) {   // Lights Out: während der Ampel der echte Ton aus dem Clip vor dem Anfang
          const vorl = Math.min(p.a, p.FD), sv = ctx.createBufferSource(), gv = ctx.createGain(); sv.buffer = quelle; sv.connect(gv); gv.connect(aus);
          gv.gain.setValueAtTime(0.0001, p.FD - vorl); gv.gain.linearRampToValueAtTime(0.75, p.FD - vorl + 0.4); gv.gain.setValueAtTime(0.75, p.FD - 0.03); gv.gain.linearRampToValueAtTime(0.0001, p.FD);
          sv.start(p.FD - vorl, p.a - vorl, vorl);
        }
        const h2 = ctx.createBufferSource(); h2.buffer = quelle; const hg2 = ctx.createGain(); h2.connect(hg2); hg2.connect(aus);
        hg2.gain.setValueAtTime(0.0001, p.h + p.FD); hg2.gain.linearRampToValueAtTime(0.9, p.h + p.FD + 0.05); hg2.gain.setValueAtTime(0.9, Math.max(p.h + p.FD + 0.05, p.D - 0.08)); hg2.gain.linearRampToValueAtTime(0.0001, p.D);
        h2.start(p.h + p.FD, p.F, p.b - p.F);
      } else {
        hg.gain.setValueAtTime(0.9, 0); hg.gain.setValueAtTime(0.9, Math.max(0, p.D - 0.08)); hg.gain.linearRampToValueAtTime(0.0001, p.D);
        h.start(0, p.a, p.D);
      }
      if (p.R) {
        const z = ctx.createBufferSource(); z.buffer = quelle; z.playbackRate.value = 0.5;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        const zg = ctx.createGain(); zg.gain.setValueAtTime(0.0001, p.D); zg.gain.linearRampToValueAtTime(0.85, p.D + 0.15); zg.gain.setValueAtTime(0.85, p.D + p.R - 0.2); zg.gain.linearRampToValueAtTime(0.0001, p.D + p.R);
        z.connect(lp); lp.connect(zg); zg.connect(aus); z.start(p.D, p.b - p.Z, p.Z);
      }
    }
    const wumms = (t, vol, tief) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(tief ? 95 : 140, t); o.frequency.exponentialRampToValueAtTime(tief ? 30 : 40, t + 0.6);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + (tief ? 1.4 : 0.9)); o.connect(g); g.connect(aus); o.start(t); o.stop(t + 1.5);
      const n = rn(t, 0.5), lp = ctx.createBiquadFilter(), gn = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.45);
      gn.gain.setValueAtTime(vol * 0.55, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); n.connect(lp); lp.connect(gn); gn.connect(aus);
    };
    const zisch = (t, d, vol, runter) => {
      const n = rn(t, d), bp = ctx.createBiquadFilter(), g = ctx.createGain(), pn = ctx.createStereoPanner(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(runter ? 3800 : 320, t); bp.frequency.exponentialRampToValueAtTime(runter ? 300 : 3800, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + d * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      pn.pan.setValueAtTime(-0.7, t); pn.pan.linearRampToValueAtTime(0.7, t + d); n.connect(bp); bp.connect(g); g.connect(pn); pn.connect(aus);
    };
    const glitch = (t, d, vol) => { for (let z = t; z < t + d; z += 0.035) { const n = rn(z, 0.03), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 4000; g.gain.setValueAtTime(vol * (0.4 + Math.random() * 0.6), z); g.gain.exponentialRampToValueAtTime(0.0001, z + 0.028); n.connect(hp); hp.connect(g); g.connect(aus); } };
    const anstieg = (t, d, vol) => { const n = rn(t, d), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.setValueAtTime(200, t); hp.frequency.exponentialRampToValueAtTime(7000, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + d); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.02); n.connect(hp); hp.connect(g); g.connect(aus); };
    const ton = (t, f, d, vol) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(aus); o.start(t); o.stop(t + d + 0.05); };
    const tick = (t, vol) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 1800; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g); g.connect(aus); o.start(t); o.stop(t + 0.08); wumms(t, vol * 2.2, true); };
    const v = vorlage(c), cs = countdownStart(v, p);
    if (cs != null) { const lang = v.pause ? 0.7 : 0.5; for (let i = 0; i < 3; i++) tick(cs + i * lang, 0.16); }
    if (v.pause) {   // Plattenstopp beim Anhalten, Knall beim Weiterlaufen
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(420, p.h); o.frequency.exponentialRampToValueAtTime(40, p.h + 0.35);
      g.gain.setValueAtTime(0.16, p.h); g.gain.exponentialRampToValueAtTime(0.0001, p.h + 0.4); o.connect(g); g.connect(aus); o.start(p.h); o.stop(p.h + 0.45);
      wumms(p.h + p.FD, 0.85);
    }
    if (v.countdown) wumms((p.R ? p.D + p.R : p.D) - 2.4, 0.85);
    if (v.regen) {   // Regen die ganze Zeit, Donner zum Blitz
      const n = rn(0, p.T - OUTRO), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      hp.type = 'highpass'; hp.frequency.value = 500; lp.type = 'lowpass'; lp.frequency.value = 7000;
      g.gain.setValueAtTime(0.0001, 0); g.gain.linearRampToValueAtTime(0.09, 0.4); g.gain.setValueAtTime(0.09, p.T - OUTRO - 0.4); g.gain.linearRampToValueAtTime(0.0001, p.T - OUTRO);
      n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(aus);
      for (const z of [0.5, p.D * 0.55 + 0.05]) { const d = rn(z, 2.6), l2 = ctx.createBiquadFilter(), g2 = ctx.createGain(); l2.type = 'lowpass'; l2.frequency.value = 260; g2.gain.setValueAtTime(0.0001, z); g2.gain.linearRampToValueAtTime(0.7, z + 0.08); g2.gain.exponentialRampToValueAtTime(0.0001, z + 2.5); d.connect(l2); l2.connect(g2); g2.connect(aus); wumms(z, 0.5, true); }
    }
    const jingle = (t, vol) => { [523.25, 659.25, 783.99, 1046.5].forEach((fq, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = fq; g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.linearRampToValueAtTime(vol, t + i * 0.09 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + (i === 3 ? 1.1 : 0.35)); o.connect(g); g.connect(aus); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 1.2); }); };
    if (c.look === 'tv') {
      const n = rn(0, 0.16), hp = ctx.createBiquadFilter(), gn = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 900; gn.gain.setValueAtTime(0.22, 0); gn.gain.exponentialRampToValueAtTime(0.0001, 0.16); n.connect(hp); hp.connect(gn); gn.connect(aus);
      wumms(0.05, 0.55); jingle(0.3, 0.11); zisch(0.3, 0.35, 0.16); zisch(0.9, 0.35, 0.13);
      if (p.R) { zisch(p.D - 0.3, 0.55, 0.32); wumms(p.D, 0.7, true); }
      ton(p.T - OUTRO, 1000, 0.24, 0.07); jingle(p.T - OUTRO + 0.26, 0.12); wumms(p.T - OUTRO + 0.24, 0.8, true);
    } else {
      zisch(0, 0.2, 0.25); wumms(0.12, 0.75); glitch(0.12, 0.35, 0.18);
      zisch(0.85, 0.4, 0.15);
      if (p.R) { zisch(p.D - 0.25, 0.3, 0.3, true); wumms(p.D, 0.8, true); }
      anstieg(p.T - OUTRO - 0.7, 0.7, 0.3); wumms(p.T - OUTRO, 0.9, true); [1318, 1661, 1976].forEach((fq, i) => ton(p.T - OUTRO + 0.25 + i * 0.07, fq, 1.2, 0.08));
    }
    if (p.mehr === 'top3') for (const k of p.teile.slice(1)) { zisch(k.S - 0.3, 0.3, 0.3, true); wumms(k.S, 0.85); glitch(k.S, 0.3, 0.16); }
    // Neue Vorlagen: eigene Sounds
    const saege = (t, f0, f1, d, vol, lp, ab) => {   // gesägter Ton mit Tiefpass (Motor, Posaune), ab = Ausblenden
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o2.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); o2.frequency.setValueAtTime(f0 * 1.007, t); o2.frequency.exponentialRampToValueAtTime(f1 * 1.007, t + d);
      fl.type = 'lowpass'; fl.frequency.value = lp || 900; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, Math.max(t + 0.03, t + d - (ab || 0.06))); g.gain.linearRampToValueAtTime(0.0001, t + d);
      o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(aus); o.start(t); o.stop(t + d + 0.02); o2.start(t); o2.stop(t + d + 0.02); return { o, o2, fl, g };
    };
    if (p.mehr === 'verkehr') { for (const mk of p.marken) { zisch(mk.ot - 0.28, 0.3, 0.2); ton(mk.ot, 1568, 0.16, 0.08); ton(mk.ot + 0.05, 2093, 0.2, 0.05); } }
    else if (p.mehr === 'aufholjagd') { p.marken.forEach((mk, i) => { const k = Math.pow(2, Math.min(i, 12) / 24); [523.25, 659.25, 783.99].forEach((fq, j) => ton(mk.ot + j * 0.055, fq * k, 0.16, 0.07)); }); }
    else if (p.mehr === 'sektoren') { for (const s2 of p.sektoren) { const lila = s2.farbe === SEKTOR_FARBEN.lila; ton(s2.ot, 1760, 0.12, 0.08); ton(s2.ot + 0.13, lila ? 2349 : 1760, 0.2, 0.07); if (lila) ton(s2.ot + 0.26, 3136, 0.3, 0.04); } }
    else if (p.marken) for (const mk of p.marken) { ton(mk.ot, 1318, 0.22, 0.07); ton(mk.ot + 0.06, 1976, 0.25, 0.05); }
    if (p.lauf && p.lauf < p.D && p.mehr !== 'erwartung') { wumms(p.lauf, 0.85); [1046.5, 1318.5, 1568, 2093].forEach((fq, i) => ton(p.lauf + 0.12 + i * 0.08, fq, 0.9, 0.06)); }   // Standbild mit Ergebnis
    if (p.mehr === 'erwartung') {
      [440, 554.37, 659.25].forEach(fq => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = fq; g.gain.setValueAtTime(0.0001, 0.2); g.gain.linearRampToValueAtTime(0.035, 0.9); g.gain.setValueAtTime(0.035, Math.max(0.9, p.d0 - 0.25)); g.gain.linearRampToValueAtTime(0.0001, p.d0); o.connect(g); g.connect(aus); o.start(0.2); o.stop(p.d0 + 0.05); });   // „himmlischer“ Akkord beim Plan
      { const n = rn(p.d0 - 0.18, 0.3), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(2600, p.d0 - 0.18); bp.frequency.exponentialRampToValueAtTime(400, p.d0 - 0.05); bp.frequency.exponentialRampToValueAtTime(1800, p.d0 + 0.1); g.gain.setValueAtTime(0.5, p.d0 - 0.18); g.gain.exponentialRampToValueAtTime(0.0001, p.d0 + 0.12); n.connect(bp); bp.connect(g); g.connect(aus); }   // Platten-Kratzer
      wumms(p.d0, 0.9); glitch(p.d0, 0.25, 0.18);
      const t0 = Math.max(p.d0 + 0.4, p.lauf - 0.45);   // traurige Posaune: wah wah wah waaah
      [[293.66, 0.36], [277.18, 0.36], [261.63, 0.36], [246.94, 1.15]].reduce((t, [fq, d], i) => {
        const x = saege(t, fq, fq * (i === 3 ? 0.97 : 0.985), d, 0.13, 1100);
        if (i === 3) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = 7; lfo.connect(lg); lg.connect(x.o.frequency); lg.connect(x.o2.frequency); lfo.start(t + 0.15); lfo.stop(t + d); }
        x.fl.frequency.setValueAtTime(500, t); x.fl.frequency.linearRampToValueAtTime(1400, t + Math.min(0.2, d * 0.5));
        return t + d + 0.04;
      }, t0);
    }
    if (v.ampel) {   // je Lampe ein dumpfer Schlag mit leisem Piepen, bei „Lichter aus“ Knall – den Motor liefert der Clip selbst
      AMPEL_AN.forEach(z => { wumms(z, 0.35, true); ton(z, 660, 0.12, 0.04); });
      wumms(p.FD, 0.9); zisch(p.FD - 0.3, 0.35, 0.25);
    }
    if (v.analyse) {   // Auslöser + Wusch beim Anhalten, Stift kritzelt, Ping beim Text, Wusch beim Weiterlaufen
      { const n = rn(p.h, 0.05), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 2500; g.gain.setValueAtTime(0.5, p.h); g.gain.exponentialRampToValueAtTime(0.0001, p.h + 0.05); n.connect(hp); hp.connect(g); g.connect(aus); }
      zisch(p.h - 0.15, 0.3, 0.2, true); wumms(p.h, 0.5, true);
      for (let z = p.h + 0.3; z < p.h + 0.85; z += 0.045) { const n = rn(z, 0.04), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.value = 2200 + Math.sin(z * 40) * 900; g.gain.setValueAtTime(0.07, z); g.gain.exponentialRampToValueAtTime(0.0001, z + 0.04); n.connect(bp); bp.connect(g); g.connect(aus); }
      ton(p.h + 0.78, 1568, 0.4, 0.07); ton(p.h + 0.84, 2093, 0.5, 0.05);
      zisch(p.h + p.FD - 0.3, 0.35, 0.18);
    }
    if (v.gruenStart) { zisch(0.12, 0.35, 0.18); const e = v.ergebnisVon(c); if (e) { const a0 = (p.R ? p.D + p.R : p.D) - 2.4; wumms(a0, 0.7); [1046.5, 1318.5, 1568].forEach((fq, i) => ton(a0 + 0.05 + i * 0.08, fq, 0.6, 0.05)); } }
    if (v.bestzeit && p.L != null) { wumms(p.L, 0.6); [1568, 2093, 2637].forEach((fq, i) => ton(p.L + 0.05 + i * 0.09, fq, 0.5, 0.06)); zisch(p.L + 0.1, 0.4, 0.14); }
    if (v.zielflagge && p.L != null) { zisch(p.h - 0.28, 0.3, 0.22); wumms(p.h, 0.9, true); jingle(p.h + 0.3, 0.1); zisch(p.h + p.FD - 0.3, 0.35, 0.16); }
    if (v.klassen) { for (const z of [0.5, 1.15]) { ton(z, 220, 0.25, 0.08); ton(z, 233, 0.25, 0.08); wumms(z, 0.45); glitch(z, 0.12, 0.12); } }   // „VS“-Schlag
    if (v.kommentator) {   // Publikum jubelt zum Höhepunkt
      const t0 = Math.max(0.5, p.D - 1.4), d = Math.min(3.2, p.D + (p.R || 0) - t0);
      for (const [fq, vol] of [[900, 0.09], [1700, 0.06], [2900, 0.035]]) {
        const n = rn(t0, d), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.value = fq;
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.6);
        for (let z = t0 + 0.6; z < t0 + d - 0.6; z += 0.11) g.gain.linearRampToValueAtTime(vol * (0.75 + Math.random() * 0.5), z);
        g.gain.linearRampToValueAtTime(0.0001, t0 + d); n.connect(bp); bp.connect(g); g.connect(aus);
      }
    }
    zisch(p.T - LOOP, LOOP, 0.22);   // Übergang in die Schleife
    const buf = await ctx.startRendering();
    // Lautheit angleichen (Ziel ≈ −15 dBFS, Spitzen unter −1 dB)
    let su = 0, sp = 0; for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) { su += d[i] * d[i]; sp = Math.max(sp, Math.abs(d[i])); } }
    const rms = Math.sqrt(su / (buf.length * 2)) || 1e-6, k = Math.min(Math.pow(10, -15 / 20) / rms, 0.89 / (sp || 1));
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= k; }
    return buf;
  }
  async function quellTon(c) {   // Ton des Clips einmal lesen (geht bei MP4/WebM, sonst ohne Clip-Ton)
    if (c._ton !== undefined) return c._ton;
    try { const ac = new OfflineAudioContext(2, 1, TON_RATE); c._ton = await ac.decodeAudioData(await c.datei.arrayBuffer()); } catch (e) { c._ton = null; }
    return c._ton;
  }

  // ─── Clip Bild für Bild lesen ───
  // Schnell: MP4 selbst zerlegen und mit WebCodecs der Reihe nach entschlüsseln (Bild für Bild, ohne Springen).
  // Notlösung (Format geht so nicht): Video-Element, das zu jedem Bild springt (deutlich langsamer).
  // Kleiner MP4-Zerleger: findet die Videospur und alle ihre Bilder (normale und fragmentierte MP4, z. B. von OBS)
  // → { codec, breite, hoehe, beschr, proben: [{ off, groesse, dts, cts, dauer, key }], ts } (Zeiten in Einheiten von ts)
  function mp4Zerlegen(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), N = buf.byteLength;
    const s4 = o => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    const u32 = o => dv.getUint32(o), i32 = o => dv.getInt32(o), u64 = o => dv.getUint32(o) * 4294967296 + dv.getUint32(o + 4);
    function boxen(a, e) {
      const l = [];
      for (let o = a; o + 8 <= e;) {
        let gr = u32(o), k = 8;
        if (gr === 1) { gr = u64(o + 8); k = 16; } else if (gr === 0) gr = e - o;
        if (gr < k || o + gr > e) break;
        l.push({ t: s4(o + 4), a: o, d: o + k, e: o + gr });
        o += gr;
      }
      return l;
    }
    const kinder = b => boxen(b.d, b.e), kind = (b, t) => b && kinder(b).find(x => x.t === t);
    const pfad = (b, ...ts) => ts.reduce((x, t) => kind(x, t), b);
    const oben = boxen(0, N), moov = oben.find(b => b.t === 'moov');
    if (!moov) throw new Error('MP4 ohne moov');
    let trak = null;
    for (const t of kinder(moov).filter(x => x.t === 'trak')) { const h = pfad(t, 'mdia', 'hdlr'); if (h && s4(h.d + 8) === 'vide') { trak = t; break; } }
    if (!trak) throw new Error('keine Videospur');
    const tkhd = kind(trak, 'tkhd'), id = u32(tkhd.d + (u8[tkhd.d] === 1 ? 20 : 12));
    const mdhd = pfad(trak, 'mdia', 'mdhd'), ts = u32(mdhd.d + (u8[mdhd.d] === 1 ? 20 : 12));
    const stbl = pfad(trak, 'mdia', 'minf', 'stbl'), stsd = kind(stbl, 'stsd');
    const eintrag = boxen(stsd.d + 8, stsd.e)[0];
    if (!eintrag) throw new Error('kein Video-Eintrag');
    const art = eintrag.t, breite = dv.getUint16(eintrag.d + 24), hoehe = dv.getUint16(eintrag.d + 26);
    const zusatz = boxen(eintrag.d + 78, eintrag.e), hex = (x, n) => x.toString(16).padStart(n || 2, '0');
    let codec = '', beschr = null;
    const avcC = zusatz.find(x => x.t === 'avcC'), hvcC = zusatz.find(x => x.t === 'hvcC');
    if (avcC) { beschr = u8.slice(avcC.d, avcC.e); codec = art + '.' + hex(beschr[1]) + hex(beschr[2]) + hex(beschr[3]); }
    else if (hvcC) {
      beschr = u8.slice(hvcC.d, hvcC.e);
      const b1 = beschr[1], raum = ['', 'A', 'B', 'C'][b1 >> 6], tier = (b1 >> 5) & 1, prof = b1 & 31;
      let komp = (beschr[2] << 24 | beschr[3] << 16 | beschr[4] << 8 | beschr[5]) >>> 0, rev = 0;
      for (let i = 0; i < 32; i++) { rev = (rev << 1) | (komp & 1); komp >>>= 1; }
      const grenzen = Array.from(beschr.slice(6, 12)); while (grenzen.length && !grenzen[grenzen.length - 1]) grenzen.pop();
      codec = `${art}.${raum}${prof}.${(rev >>> 0).toString(16)}.${tier ? 'H' : 'L'}${beschr[12]}` + grenzen.map(x => '.' + x.toString(16)).join('');
    } else throw new Error('Videoformat ' + art + ' geht so nicht');
    const proben = [];
    // Normale MP4: Tabellen in stbl
    const stsz = kind(stbl, 'stsz'), anzahl = stsz ? u32(stsz.d + 8) : 0;
    if (anzahl) {
      const fest = u32(stsz.d + 4), groesse = i => fest || u32(stsz.d + 12 + i * 4);
      const stts = kind(stbl, 'stts'), ctts = kind(stbl, 'ctts'), stsc = kind(stbl, 'stsc'), stco = kind(stbl, 'stco'), co64 = kind(stbl, 'co64'), stss = kind(stbl, 'stss');
      const dts = new Array(anzahl); let t = 0, i = 0;
      for (let k = 0, n = u32(stts.d + 4); k < n; k++) { const c = u32(stts.d + 8 + k * 8), d = u32(stts.d + 12 + k * 8); for (let j = 0; j < c && i < anzahl; j++, i++) { dts[i] = t; t += d; } }
      for (; i < anzahl; i++) dts[i] = t;
      const versatz = new Array(anzahl).fill(0);
      if (ctts) { i = 0; const v1 = u8[ctts.d] === 1; for (let k = 0, n = u32(ctts.d + 4); k < n; k++) { const c = u32(ctts.d + 8 + k * 8), o = v1 ? i32(ctts.d + 12 + k * 8) : u32(ctts.d + 12 + k * 8); for (let j = 0; j < c && i < anzahl; j++, i++) versatz[i] = o; } }
      const sync = stss ? new Set(Array.from({ length: u32(stss.d + 4) }, (_, k) => u32(stss.d + 8 + k * 4) - 1)) : null;
      const chunks = co64 ? Array.from({ length: u32(co64.d + 4) }, (_, k) => u64(co64.d + 8 + k * 8)) : Array.from({ length: u32(stco.d + 4) }, (_, k) => u32(stco.d + 8 + k * 4));
      const lauf = Array.from({ length: u32(stsc.d + 4) }, (_, k) => [u32(stsc.d + 8 + k * 12) - 1, u32(stsc.d + 12 + k * 12)]);
      i = 0;
      for (let r = 0; r < lauf.length; r++) {
        const bis = r + 1 < lauf.length ? lauf[r + 1][0] : chunks.length;
        for (let ch = lauf[r][0]; ch < bis && i < anzahl; ch++) {
          let off = chunks[ch];
          for (let j = 0; j < lauf[r][1] && i < anzahl; j++, i++) { const g = groesse(i); proben.push({ off, groesse: g, dts: dts[i], cts: dts[i] + versatz[i], dauer: (i + 1 < anzahl ? dts[i + 1] : dts[i] + (dts[i] - (dts[i - 1] || 0))) - dts[i], key: sync ? sync.has(i) : true }); off += g; }
        }
      }
    }
    // Fragmentierte MP4 (moof/traf/trun)
    const trex = (pfad(moov, 'mvex') ? kinder(pfad(moov, 'mvex')) : []).find(x => x.t === 'trex' && u32(x.d + 4) === id);
    const std = { dauer: trex ? u32(trex.d + 12) : 0, groesse: trex ? u32(trex.d + 16) : 0, flags: trex ? u32(trex.d + 20) : 0 };
    let zeit = proben.length ? proben[proben.length - 1].dts + proben[proben.length - 1].dauer : 0;
    for (const moof of oben.filter(b => b.t === 'moof')) {
      let ende = moof.a;
      for (const traf of kinder(moof).filter(x => x.t === 'traf')) {
        const tfhd = kind(traf, 'tfhd'), fl = u32(tfhd.d) & 0xffffff;
        if (u32(tfhd.d + 4) !== id) continue;
        let p = tfhd.d + 8, basis = fl & 0x20000 ? moof.a : ende;
        if (fl & 1) { basis = u64(p); p += 8; }
        if (fl & 2) p += 4;
        const tDauer = fl & 8 ? u32((p += 4) - 4) : std.dauer, tGroesse = fl & 0x10 ? u32((p += 4) - 4) : std.groesse, tFlags = fl & 0x20 ? u32((p += 4) - 4) : std.flags;
        const tfdt = kind(traf, 'tfdt'); if (tfdt) zeit = u8[tfdt.d] === 1 ? u64(tfdt.d + 4) : u32(tfdt.d + 4);
        for (const trun of kinder(traf).filter(x => x.t === 'trun')) {
          const rf = u32(trun.d) & 0xffffff, v1 = u8[trun.d] === 1, n = u32(trun.d + 4);
          let q = trun.d + 8, off = basis;
          if (rf & 1) { off = basis + i32(q); q += 4; }
          let erst = null; if (rf & 4) { erst = u32(q); q += 4; }
          for (let k = 0; k < n; k++) {
            const d = rf & 0x100 ? u32((q += 4) - 4) : tDauer, g = rf & 0x200 ? u32((q += 4) - 4) : tGroesse;
            const f = rf & 0x400 ? u32((q += 4) - 4) : (k === 0 && erst !== null ? erst : tFlags);
            const c = rf & 0x800 ? (v1 ? i32((q += 4) - 4) : u32((q += 4) - 4)) : 0;
            proben.push({ off, groesse: g, dts: zeit, cts: zeit + c, dauer: d, key: !((f >> 16) & 1) && ((f >> 24) & 3) !== 1 });
            off += g; zeit += d;
          }
          ende = off;
        }
      }
    }
    if (!proben.length) throw new Error('keine Bilder in der MP4');
    return { codec, breite, hoehe, beschr, proben, ts };
  }
  async function mp4Lesen(datei) {
    const buf = await datei.arrayBuffer(), m = mp4Zerlegen(buf);
    let cfg = { codec: m.codec, codedWidth: m.breite, codedHeight: m.hoehe };
    if (m.beschr) cfg.description = m.beschr;
    if (!window.VideoDecoder) throw new Error('Format ' + m.codec + ' nicht entschlüsselbar');
    // Lieber ohne Grafikkarte entschlüsseln: manche Grafikkarten bleiben beim Bauen mittendrin stehen
    const sw = { ...cfg, hardwareAcceleration: 'prefer-software' };
    let geht = false; try { geht = (await VideoDecoder.isConfigSupported(sw)).supported; } catch (e) { /* dann mit Grafikkarte */ }
    if (geht) cfg = sw;
    else if (!(await VideoDecoder.isConfigSupported(cfg)).supported) throw new Error('Format ' + m.codec + ' nicht entschlüsselbar');
    let basis = Infinity; for (const x of m.proben) basis = Math.min(basis, x.cts);   // erstes Bild = 0 s (wie im Video-Element)
    for (const x of m.proben) { x.us = Math.round((x.cts - basis) * 1e6 / m.ts); x.dus = Math.round(x.dauer * 1e6 / m.ts); x.data = new Uint8Array(buf, x.off, x.groesse); }
    return { cfg, proben: m.proben };
  }
  function decoderLeser({ cfg, proben }) {
    const us = i => proben[i].us;
    const keys = []; proben.forEach((x, i) => { if (x.key) keys.push(i); });
    if (!keys.length) keys.push(0);
    let fertig = [], pos = 0, ende = false, letzte = -1, warter = null, fehler = null, ausgaben = 0;
    const wecken = () => { if (warter) { const w = warter; warter = null; w(); } };
    const dec = new VideoDecoder({
      output: fr => { ausgaben++; let i = fertig.length; while (i > 0 && fertig[i - 1].timestamp > fr.timestamp) i--; fertig.splice(i, 0, fr); wecken(); },
      error: e => { fehler = e; wecken(); }
    });
    dec.configure(cfg);
    const keyVor = tus => { let k = keys[0]; for (const i of keys) { if (us(i) <= tus) k = i; else break; } return k; };
    function springen(tus) {
      for (const fr of fertig) fr.close();
      fertig = [];
      dec.reset(); dec.configure(cfg);
      pos = keyVor(tus); ende = false;
    }
    async function bei(t) {
      if (fehler) throw fehler;
      const tus = Math.max(0, t * 1e6), eps = 2000;
      const weit = keyVor(tus) > pos && us(keyVor(tus)) - (fertig.length ? fertig[fertig.length - 1].timestamp : -1e12) > 1e6;
      if (letzte < 0 || tus + eps < letzte || (fertig.length && tus + eps < fertig[0].timestamp) || weit) springen(tus);
      letzte = tus;
      let seit = performance.now(), neu = false, zahl = ausgaben;
      for (;;) {
        while (fertig.length >= 2 && fertig[1].timestamp <= tus + eps) fertig.shift().close();
        if (fertig.length >= 2 || (ende && fertig.length)) return fertig[0];
        if (fehler) throw fehler;
        if (pos < proben.length) {
          for (let n = 0; pos < proben.length && n < 4 && dec.decodeQueueSize + fertig.length < 6; n++, pos++) {
            const x = proben[pos];
            dec.decode(new EncodedVideoChunk({ type: x.key ? 'key' : 'delta', timestamp: x.us, duration: x.dus, data: x.data }));
          }
        } else if (!ende) {
          // Ende der Datei: gehaltene Bilder als Kopie behalten und freigeben – sonst gibt manche Grafikkarte die letzten Bilder nie raus
          for (const fr of fertig.slice()) {
            if (!(fr instanceof VideoFrame)) continue;
            try {
              const bm = await createImageBitmap(fr), i = fertig.indexOf(fr);
              Object.assign(bm, { timestamp: fr.timestamp, displayWidth: fr.displayWidth, displayHeight: fr.displayHeight });
              if (i >= 0) { fertig[i] = bm; fr.close(); } else bm.close();
            } catch (e) { /* bleibt das Original */ }
          }
          await Promise.race([dec.flush().catch(e => { if (e && e.name !== 'AbortError') fehler = fehler || e; }), warte(1500)]);   // nie ewig warten
          ende = true; continue;
        }
        else return fertig[0] || null;
        if (ausgaben !== zahl) { zahl = ausgaben; seit = performance.now(); }
        if (performance.now() - seit > 4000) {   // 4 s kein neues Bild vom Decoder: hängt → einmal neu starten, sonst aufgeben
          if (neu) throw new Error('Decoder hängt');
          neu = true; springen(tus); seit = performance.now();
        }
        await new Promise(r => { warter = r; setTimeout(() => { if (warter === r) { warter = null; r(); } }, 15); });
      }
    }
    return { bei, zu() { for (const fr of fertig) fr.close(); fertig = []; try { dec.close(); } catch (e) { /* schon zu */ } }, art: 'webcodecs' };
  }
  async function leser(c) {
    let d = null, vid = null, kaputt = false;
    try { d = decoderLeser(await mp4Lesen(c.datei)); }
    catch (e) { console.warn('Clip-Fabrik: Bild-für-Bild-Lesen geht nicht, springe im Video', e); }
    const imVideo = async t => { if (!vid) vid = await videoElement(c.url); await suchen(vid, t); return vid; };
    return {
      async bei(t) {
        if (d && !kaputt) {
          try { return await d.bei(t); }
          catch (e) { console.warn('Clip-Fabrik: Bild-für-Bild-Lesen hängt – weiter im Video', e); kaputt = true; try { d.zu(); } catch (e2) { /* egal */ } }
        }
        return imVideo(t);
      },
      zu() { if (d && !kaputt) d.zu(); if (vid) { vid.removeAttribute('src'); vid.load(); } },
      get art() { return !d ? 'video' : kaputt ? 'webcodecs→video' : 'webcodecs'; }
    };
  }

  // ─── MP4 bauen (H.264 + AAC, begrenzter Farbbereich wie bei den anderen Posts) ───
  let MUXER = null;
  function muxerLaden() {
    if (window.Mp4Muxer) return Promise.resolve();
    if (!MUXER) MUXER = new Promise((ok, nein) => { const s = document.createElement('script'); s.src = BASIS + 'tools/mp4-muxer.js'; s.onload = ok; s.onerror = () => { MUXER = null; nein(new Error('Video-Baustein nicht geladen')); }; document.head.appendChild(s); });
    return MUXER;
  }
  // RGBA → I420 (BT.709, begrenzter Bereich wie bei den anderen Posts) · Ganzzahl-Rechnung, 2 Zeilen auf einmal
  function zuI420(px, W, Hh, out) {
    const cw = W >> 1, ys = W * Hh, us = cw * (Hh >> 1), d = new Uint32Array(px.buffer, px.byteOffset, W * Hh);
    for (let y2 = 0, k = 0; y2 < Hh >> 1; y2++) {
      const z0 = y2 * 2 * W, z1 = z0 + W;
      for (let x2 = 0; x2 < cw; x2++, k++) {
        const i0 = z0 + 2 * x2, i1 = z1 + 2 * x2, a = d[i0], b = d[i0 + 1], c = d[i1], e = d[i1 + 1];
        const ra = a & 255, ga = (a >> 8) & 255, ba = (a >> 16) & 255, rb = b & 255, gb = (b >> 8) & 255, bb = (b >> 16) & 255;
        const rc = c & 255, gc = (c >> 8) & 255, bc = (c >> 16) & 255, re = e & 255, ge = (e >> 8) & 255, be = (e >> 16) & 255;
        out[i0] = 16 + ((11966 * ra + 40254 * ga + 4064 * ba + 32768) >> 16);
        out[i0 + 1] = 16 + ((11966 * rb + 40254 * gb + 4064 * bb + 32768) >> 16);
        out[i1] = 16 + ((11966 * rc + 40254 * gc + 4064 * bc + 32768) >> 16);
        out[i1 + 1] = 16 + ((11966 * re + 40254 * ge + 4064 * be + 32768) >> 16);
        const r4 = ra + rb + rc + re, g4 = ga + gb + gc + ge, b4 = ba + bb + bc + be;
        out[ys + k] = 128 + ((-6597 * r4 - 22187 * g4 + 28785 * b4 + 131072) >> 18);
        out[ys + us + k] = 128 + ((28785 * r4 - 26146 * g4 - 2638 * b4 + 131072) >> 18);
      }
    }
  }
  function suchen(v, t) {
    return new Promise(ok => {
      if (Math.abs(v.currentTime - t) < 0.001 && v.readyState >= 2) return ok();
      const fertig = () => { v.removeEventListener('seeked', fertig); ok(); };
      v.addEventListener('seeked', fertig); v.currentTime = t; setTimeout(fertig, 3000);
    });
  }
  function videoElement(url) {
    return new Promise((ok, nein) => {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.onloadeddata = () => ok(v); v.onerror = () => nein(new Error('Dieses Video kann der Browser nicht öffnen. Bitte als MP4 (H.264) speichern.'));
      v.src = url;
    });
  }
  async function bauen(c, m, fortschritt) {
    if (!window.VideoEncoder) throw new Error('Dieser Browser kann keine Videos bauen. Bitte Chrome oder Edge nehmen.');
    await Promise.all([muxerLaden(), schriften(), teamPflicht(c.team)]);
    const p = zeitplan(c), q = quellenVon(c);
    const quelle = p.mehr ? await Promise.all(p.slots.map(i => quellTon(q[i]))) : await quellTon(c), ton = await tonMischen(c, p, quelle);
    const lesers = [];
    let camL = null;
    try {
    for (const i of (p.mehr ? p.slots : [0])) lesers.push(await leser(q[i]));
    if (!p.mehr && camPlatz(c) !== 'aus') camL = await leser(c.cam);   // 📷 Cam läuft Bild für Bild mit (gleiche Stelle wie der Clip)
    let vcfg = null;
    for (const hw of ['prefer-software', 'no-preference']) {   // erst ohne Grafikkarte (hängt nicht), sonst mit
      for (const codec of ['avc1.640028', 'avc1.640032', 'avc1.4d0028', 'avc1.42e028']) {
        const k = { codec, width: B, height: H, bitrate: 9000000, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' }, hardwareAcceleration: hw };
        try { if ((await VideoEncoder.isConfigSupported(k)).supported) { vcfg = k; break; } } catch (e) { /* weiter */ }
      }
      if (vcfg) break;
    }
    if (!vcfg) throw new Error('Dieser Browser kann kein H.264. Bitte Chrome oder Edge nehmen.');
    let acfg = null;
    if (window.AudioEncoder) for (const br of [192000, 160000, 128000]) { const k = { codec: 'mp4a.40.2', sampleRate: TON_RATE, numberOfChannels: 2, bitrate: br }; try { if ((await AudioEncoder.isConfigSupported(k)).supported) { acfg = k; break; } } catch (e) { /* weiter */ } }
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: B, height: H, frameRate: FPS },
      audio: acfg ? { codec: 'aac', numberOfChannels: 2, sampleRate: TON_RATE } : undefined, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
    let fehler = null;
    const enc = new VideoEncoder({ output: (ch, md) => muxer.addVideoChunk(ch, md), error: e => { fehler = e; } });
    enc.configure(vcfg);
    const cv = leinwand(B, H), g = cv.getContext('2d'), puffer = new Uint8Array(B * H * 3 / 2), cs = { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false };
    const n = Math.round(p.T * FPS);
    let erstes = null;
    for (let i = 0; i < n; i++) {
      if (fehler) throw fehler;
      const t = i / FPS;
      let bild = null, kam = null;
      if (p.mehr) { bild = []; for (const sp of p.spur(t)) bild[sp.s] = await lesers[sp.s].bei(sp.t); }
      else { const qt = p.quelle(t); bild = qt != null ? await lesers[0].bei(qt) : null; if (camL && qt != null) { try { kam = await camL.bei(qt); } catch (e) { kam = null; } } }
      g.clearRect(0, 0, B, H); zeichne(g, t, c, p, m, bild, kam);
      if (i === 0) { erstes = leinwand(B, H); erstes.getContext('2d').drawImage(cv, 0, 0); }
      else loopUebergang(g, t, p, erstes);
      zuI420(g.getImageData(0, 0, B, H).data, B, H, puffer);
      const fr = new VideoFrame(puffer, { format: 'I420', codedWidth: B, codedHeight: H, timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS), colorSpace: cs });
      enc.encode(fr, { keyFrame: i % FPS === 0 }); fr.close();
      for (const w0 = performance.now(); enc.encodeQueueSize > 8;) {
        if (fehler) throw fehler;
        if (performance.now() - w0 > 30000) throw new Error('Der Video-Baustein vom Browser hängt. Bitte Seite neu laden (Strg+F5) und nochmal bauen.');
        await new Promise(r => { const f = () => { enc.removeEventListener('dequeue', f); r(); }; enc.addEventListener('dequeue', f); setTimeout(f, 20); });
      }
      if (fortschritt && i % 10 === 0) fortschritt(i / n);
    }
    await enc.flush(); enc.close();
    if (fehler) throw fehler;
    if (acfg) {
      const aenc = new AudioEncoder({ output: (ch, md) => muxer.addAudioChunk(ch, md), error: e => { fehler = e; } });
      aenc.configure(acfg);
      const N = ton.length, li = ton.getChannelData(0), re = ton.getChannelData(1), BL = 4800;
      for (let i = 0; i < N; i += BL) {
        const k = Math.min(BL, N - i), d = new Float32Array(k * 2); d.set(li.subarray(i, i + k), 0); d.set(re.subarray(i, i + k), k);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: TON_RATE, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(i * 1e6 / TON_RATE), data: d });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush(); aenc.close();
      if (fehler) throw fehler;
    }
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    blob.mitTon = !!acfg; blob.dauer = p.T; blob.leser = lesers.map(l => l.art).join(',');
    return blob;
    } finally { for (const l of lesers) l.zu(); if (camL) camL.zu(); }
  }
  // Vorschaubild (für die Liste): Spruch steht, Clip läuft
  async function vorschaubild(c, m) {
    await schriften(); await teamLaden();
    const p = zeitplan(c), t = Math.min(1.4, p.D * 0.5), q = quellenVon(c), vids = [];
    let bild;
    if (p.mehr) { bild = []; for (const sp of p.spur(t)) { const v = await videoElement(q[p.slots[sp.s]].url); await suchen(v, sp.t); bild[sp.s] = v; vids.push(v); } }
    else { bild = await videoElement(c.url); await suchen(bild, p.quelle(t)); vids.push(bild); }
    let kam = null;
    if (!p.mehr && camPlatz(c) !== 'aus') { try { kam = await videoElement(c.cam.url); await suchen(kam, Math.min(p.quelle(t), Math.max(0, (kam.duration || 1e9) - 0.1))); vids.push(kam); } catch (e) { kam = null; } }
    const cv = leinwand(B, H), g = cv.getContext('2d'); zeichne(g, t, c, p, m, bild, kam);
    const k = leinwand(540, 960); k.getContext('2d').drawImage(cv, 0, 0, 540, 960);
    for (const v of vids) { v.removeAttribute('src'); v.load(); }
    return new Promise(ok => k.toBlob(ok, 'image/jpeg', 0.85));
  }

  // ═══════════════════════════════════════════════════════════
  // Oberfläche
  // ═══════════════════════════════════════════════════════════
  let BOX = null, UMG = null, MAT = null, ARBEIT = '', LETZTER_LOOK = 'neon';
  const OFFEN = { 'kc-so': null, 'kc-raus': false, 'kc-einst': false, 'kc-best-box': true, 'kc-abl': null };   // aufgeklappte Bereiche bleiben offen
  const CLIPS = [];          // reingezogene Clips, der erste ist im Editor
  const VOR = { vid: null, url: '', canvas: null, lauf: 0, ton: false, c: null, cam: null, camUrl: '' };   // Vorschau (cam = Video der Renn-Cam, läuft mit)
  const stand = () => (UMG && UMG.stand()) || {};
  async function material() {
    const st = stand(), d = st.design || {};
    const name = ((st.konto && st.konto.username) || 'kreids888');
    const [logo] = await Promise.all([bild(d.logoBild || ''), teamLaden()]);   // 🏁 Team-Logos gleich mitladen (sie werden beim Zeichnen sofort gebraucht)
    const ytHandle = (String(d.liveText || (st.cfg || {}).liveText || '').match(/@[\w.\-]+/) || [])[0] || '@Kreids888';   // YouTube-Kanal für den Abspann
    MAT = { logo, name: GROSS(name), handle: '@' + GROSS(name), ytHandle };
    return MAT;
  }
  function neuerClip(datei) {
    return new Promise(ok => {
      const url = URL.createObjectURL(datei), v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
      v.onloadedmetadata = () => {
        const dauer = v.duration || 0, vl = VORLAGEN[0];
        ok(dauer >= 2 ? mitStich(mitText({ id: Math.random().toString(36).slice(2), datei, url, name: datei.name, dauer, start: Math.max(0, dauer - 15), ende: dauer,
          vorlage: vl.id, ...spruecheNeu(vl), zeitlupe: vl.zl, modus: 'ganz', versatz: 0, farbe: vl.farbe, text: '', textEigen: false, look: LETZTER_LOOK, stil: stilNeu(''), team: teamStandard('clip'),
          insta: true, tiktok: !!(stand().tiktok && stand().tiktok.verbunden), youtube: !!(stand().youtube && stand().youtube.verbunden), postMs: 0 })) : null);
      };
      v.onerror = () => ok(null);
      v.src = url;
    });
  }
  const QFELDER = ['datei', 'url', 'name', 'dauer', 'start', 'ende', 'titel', '_ton', 'bild'];
  // Bild im Fenster: Video verschieben/vergrößern (je Clip), Fenster-Größe (je Video)
  const tfVon = x => (x && x.bild) || { x: 0, y: 0, z: 1 };
  const fensterGeht = v => !v.mehr || v.mehr === 'top3' || !!MARKEN[v.mehr];   // Vorher/Nachher und Erwartung: zwei feste Fenster
  const camStandard = () => { try { const pl = localStorage.getItem('k888_cam_platz'); return CAM_PLAETZE.some(x => x[0] === pl) && pl !== 'aus' ? pl : 'ecke'; } catch (e) { return 'ecke'; } };
  function camWeg(c) {   // Cam vom Clip nehmen (Datei bleibt, wo sie ist)
    if (!c.cam) return;
    if (VOR.cam && VOR.camUrl === c.cam.url) { VOR.cam.pause(); VOR.cam.removeAttribute('src'); VOR.cam.load(); VOR.cam = null; VOR.camUrl = ''; }
    URL.revokeObjectURL(c.cam.url); c.cam = null;
  }
  function camSetzen(c, datei) {   // Cam-Datei an den Clip hängen · Platz wie beim letzten Mal
    camWeg(c);
    c.cam = { datei, url: URL.createObjectURL(datei), name: datei.name };
    if (!c.camPlatz || c.camPlatz === 'aus') c.camPlatz = camStandard();
  }
  function camPanel(c, v) {
    if (v.mehr) return '';
    if (!c.cam) return `<div class="kc-bildpanel kc-cam"><div class="kc-bildkopf">📷 Cam</div>
      <label class="btn ki-k kc-cam-datei">📷 Cam-Datei dazu<input type="file" accept="video/*" data-c="cam-datei"></label>
      ${tipp('Deine Renn-Cam zum Clip („… Cam.mp4“ aus der Toolbox). Bei Szenen aus dem Vorrat kommt sie von selbst.')}</div>`;
    const pl = camPlatz(c), stapel = camStapel(c), b = camBox(c), z = Math.max(1, camBild(c).z), frei = pl === 'ecke' || (pl === 'rund'), zug = c.camZug === 'bild' ? 'bild' : 'rahmen';
    return `<div class="kc-bildpanel kc-cam"><div class="kc-bildkopf">📷 Cam <span class="kc-dim">${esc(c.cam.name)}</span></div>
      <div class="kc-stile">${CAM_PLAETZE.filter(x => stapel || (x[0] !== 'unten' && x[0] !== 'geteilt')).map(([k, n]) => `<button type="button" class="${pl === k ? 'an' : ''}" data-c="cam-platz" data-wert="${k}">${n}</button>`).join('')}</div>
      ${pl === 'aus' ? '' : `${pl === 'geteilt' ? '' : `<label class="kc-feld">Cam-Größe <b data-c="cam-s-wert">${Math.round(b.s * 100)} %</b><input type="range" min="0.6" max="1.8" step="0.01" value="${b.s}" data-c="cam-s"></label>`}
      <label class="kc-feld">Cam-Ausschnitt <b data-c="cam-z-wert">${Math.round(z * 100)} %</b><input type="range" min="1" max="3" step="0.01" value="${z}" data-c="cam-z"></label>
      ${frei ? `<div class="kc-feld">🖐 Cam in der Vorschau ziehen<div class="kc-umschalt"><button type="button" class="${zug === 'rahmen' ? 'an' : ''}" data-c="cam-zug" data-wert="rahmen">verschiebt die Cam</button><button type="button" class="${zug === 'bild' ? 'an' : ''}" data-c="cam-zug" data-wert="bild">verschiebt den Ausschnitt</button></div></div>` : '<div class="kc-dim">🖐 Cam in der Vorschau ziehen = Ausschnitt verschieben</div>'}`}
      <div class="kc-knoepfe">${pl === 'aus' ? '' : '<button type="button" class="btn ki-k" data-c="cam-reset">↺ Zurücksetzen</button>'}<button type="button" class="btn ki-k" data-c="cam-weg">✕ Cam entfernen</button></div>
      ${stapel ? '' : tipp('„Cam unten“ und „Geteilt“ gibt es bei „▭ Ganzes Bild“ im Neon-Look.')}
    </div>`;
  }
  function bildPanel(c, v) {
    const tv = c.look === 'tv', zoomModus = c.modus === 'zoom' && !tv && !v.mehr, L = lage(c, tv), z = tfVon(c).z || 1, jeClip = v.mehr && !MARKEN[v.mehr], fenster = fensterGeht(v) && !zoomModus;
    return `<div class="kc-bildpanel">
      <div class="kc-bildkopf">🖐 Video in der Vorschau ziehen = verschieben${jeClip ? '<span class="kc-dim"> (der Clip, auf den du tippst; Größe je Clip in Schritt 3)</span>' : ''}</div>
      ${jeClip ? '' : `<label class="kc-feld">Video-Größe <b data-c="bild-z-wert">${Math.round(z * 100)} %</b><input type="range" min="0.5" max="3" step="0.01" value="${z}" data-c="bild-z"></label>`}
      ${fenster ? `<label class="kc-feld">Fenster-Breite <b data-c="fenster-w-wert">${L.fw}</b><input type="range" min="360" max="1040" step="10" value="${L.fw}" data-c="fenster-w"></label>
      <label class="kc-feld">Fenster-Höhe <b data-c="fenster-h-wert">${L.fh}</b><input type="range" min="280" max="${tv ? FENSTER_MAX.tv : FENSTER_MAX.neon}" step="10" value="${L.fh}" data-c="fenster-h"></label>` : ''}
      <div class="kc-knoepfe">${fenster ? '<button type="button" class="btn ki-k" data-c="fenster-auto">▣ Fenster ans Video anpassen</button>' : ''}<button type="button" class="btn ki-k" data-c="bild-reset">↺ Zurücksetzen</button></div>
    </div>`;
  }
  function videoMasse(src) {   // Seitenverhältnis des Clips (aus der laufenden Vorschau)
    const kand = [];
    if (VOR.vid && VOR.url === src.url) kand.push(VOR.vid);
    for (const [k, v] of VIDS) if (k.startsWith(src.url + '#')) kand.push(v);
    const v = kand.find(x => x.videoWidth); return v ? { w: v.videoWidth, h: v.videoHeight } : { w: 16, h: 9 };
  }
  const quelleAusClip = x => ({ datei: x.datei, url: x.url, name: x.name, dauer: x.dauer, start: Math.max(0, x.dauer - 8), ende: x.dauer, titel: '' });
  function clipAusQuelle(x) {   // Platz frei machen: Clip kommt zurück in die Warteschlange
    const vl = VORLAGEN[0];
    return mitStich(mitText({ id: Math.random().toString(36).slice(2), datei: x.datei, url: x.url, name: x.name, dauer: x.dauer, start: Math.max(0, x.dauer - 15), ende: x.dauer,
      vorlage: vl.id, ...spruecheNeu(vl), zeitlupe: vl.zl, modus: 'ganz', versatz: 0, farbe: vl.farbe, text: '', textEigen: false, look: LETZTER_LOOK, stil: stilNeu(''), team: teamStandard('clip'),
      insta: true, tiktok: !!(stand().tiktok && stand().tiktok.verbunden), youtube: !!(stand().youtube && stand().youtube.verbunden), postMs: 0 }));
  }
  const platzZahl = v => (v.plaetze ? v.plaetze.length : 1);
  function extraZurueck(c, ab) {   // weitere Clips ab Platz „ab“ zurück in die Warteschlange (nicht, wenn es derselbe Clip ist)
    const weg = (c.extra || []).splice(Math.max(0, ab - 1));
    for (const x of weg) if (x.url !== c.url && !quellenVon(c).some(y => y.url === x.url)) CLIPS.push(clipAusQuelle(x));
  }
  function vorlageSetzen(c, id) {
    const v = VORLAGEN.find(x => x.id === id) || VORLAGEN[0], alt = vorlage(c);
    c.vorlage = v.id; c.folgeEigen = false; Object.assign(c, spruecheNeu(v)); c.zeitlupe = v.zl; c.farbe = v.farbe; c.textEigen = false; mitText(c);
    if (alt.id !== v.id) c.stil = stilNeu(c.stil);   // andere Vorlage = auch ein anderer Stil (Darstellung)
    if (c.stich) { const l = ortSprueche(c); if (l.length) { c.hook = ziehen(l, 'ort-' + v.id, c.hook); mitText(c); } }   // Stichwörter da: Spruch mit Ort
    extraZurueck(c, platzZahl(v));
    if (alt.mehr !== v.mehr) for (const x of quellenVon(c)) x.titel = '';   // Titel passen nicht zur anderen Vorlage
    if (alt.id !== v.id && (MARKEN[alt.mehr] || MARKEN[v.mehr])) {   // Markierungen je Vorlage merken (Kurven sind keine überholten Autos)
      c.markenVon = c.markenVon || {};
      if (MARKEN[alt.mehr]) c.markenVon[alt.mehr] = c.marken || [];
      c.marken = (MARKEN[v.mehr] && c.markenVon[v.mehr]) || [];
    }
    if (v.mehr) {
      c.look = 'neon'; c.modus = 'ganz'; c.extra = c.extra || [];
      while (quellenVon(c).length < platzZahl(v) && CLIPS.length > 1) c.extra.push(quelleAusClip(CLIPS.splice(1, 1)[0]));
      if (MARKEN[v.mehr]) { if (!MARKEN[alt.mehr]) { c.start = 0; c.ende = c.dauer; } }   // ganze Runde / ganzer Clip
      else if (alt.mehr !== v.mehr) { c.start = Math.max(0, c.dauer - 8); c.ende = c.dauer; }
    } else {
      if (alt.mehr) { c.start = Math.max(0, c.dauer - 15); c.ende = c.dauer; }
      c.look = v.nurNeon ? 'neon' : v.nurTV ? 'tv' : LETZTER_LOOK;   // manche Vorlagen gibt es nur in einem Look
    }
  }
  const postText = c => String(c.text || '').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
  // ─── Freie Termine vorschlagen: Tage ohne Clip, möglichst ohne andere Posts; ist um die Uhrzeit schon ein Post, eine andere gute Uhrzeit ───
  const BERLIN = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function berlinTeile(ms) { const f = BERLIN.formatToParts(new Date(ms)), g = k => +(f.find(x => x.type === k) || {}).value; return { y: g('year'), mo: g('month'), d: g('day'), h: g('hour'), mi: g('minute') }; }
  const berlinDatum = ms => { const t = berlinTeile(ms); return `${t.y}-${String(t.mo).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`; };
  function berlinMs(datum, zeit) {   // „2026-11-20“ + „18:30“ (Berliner Zeit) → Zeitpunkt
    const [y, mo, d] = datum.split('-').map(Number), [h, mi] = String(zeit).split(':').map(Number), soll = Date.UTC(y, mo - 1, d, h, mi || 0);
    let ms = soll; for (let i = 0; i < 2; i++) { const t = berlinTeile(ms); ms = soll - (Date.UTC(t.y, t.mo - 1, t.d, t.h, t.mi) - ms); }
    return ms;
  }
  const POST_NAME = { ank: 'Ankündigung', erg: 'Ergebnis', tab: 'Tabellenstand', meilen: 'Meilenstein', monat: 'Monatsbilanz' };
  function terminVorschlaege() {
    const st = stand(), zeit = (st.clipcfg && st.clipcfg.zeit) || '18:30', jetzt = Date.now(), heute = berlinTeile(jetzt);
    const clipTage = new Set((st.clips || []).filter(x => x.postMs && !x.gepostet).map(x => berlinDatum(x.postMs)));
    const posts = (st.posts || []).filter(x => x.postMs > jetzt - 3600000 && x.status !== 'uebersprungen' && x.status !== 'gepostet' && POST_NAME[x.typ]);   // Storys zählen nicht
    const raus = [];
    for (let d = 0; d < 28 && raus.length < 5; d++) {
      const t = new Date(Date.UTC(heute.y, heute.mo - 1, heute.d + d, 12)), tag = t.toISOString().slice(0, 10);
      if (clipTage.has(tag)) continue;   // ein Clip pro Tag
      const amTag = posts.filter(x => berlinDatum(x.postMs) === tag);
      for (const z of [zeit, '12:30', '20:30', '17:00']) {
        const ms = berlinMs(tag, z);
        if (ms < jetzt + 20 * 60000 || amTag.some(x => Math.abs(x.postMs - ms) < 2.5 * 3600000)) continue;
        raus.push({ ms, frei: !amTag.length, neben: [...new Set(amTag.map(x => POST_NAME[x.typ]))].join(', ') });
        break;
      }
    }
    return raus;
  }
  function termineHtml(c) {
    const l = terminVorschlaege();
    if (!l.length) return '';
    return `<div class="kc-termine"><span class="kc-dim">Freie Termine:</span>${l.map(x => `<button type="button" class="kc-termin${c.postMs === x.ms ? ' an' : ''}" data-c="termin" data-ms="${x.ms}">${esc(zeit(x.ms))}${x.frei ? '<em class="frei">frei</em>' : `<em>neben ${esc(x.neben)}</em>`}</button>`).join('')}</div>`;
  }
  const sek = s => (Math.round(s * 10) / 10).toLocaleString('de-DE', { minimumFractionDigits: 1 }) + ' s';
  const tipp = t => `<div class="kc-tipp">${t}</div>`;

  // 📈 Was läuft am besten (NEU 20.11.2026): Aufrufe und Likes je Vorlage, aus den Zahlen der geposteten Clips (Instagram + YouTube)
  function bestenliste(raus) {
    const m = new Map(), auf = z => ((z.ig && z.ig.aufrufe) || 0) + ((z.yt && z.yt.aufrufe) || 0), lik = z => ((z.ig && z.ig.likes) || 0) + ((z.yt && z.yt.likes) || 0);
    const mit = raus.filter(x => x.zahlen && (auf(x.zahlen) || lik(x.zahlen)));
    if (!mit.length) return '<div class="kc-leer">Noch keine Zahlen. Sie kommen ein paar Stunden nach dem Posten und werden dann laufend aktualisiert.</div>';
    for (const x of mit) { const e = m.get(x.vorlage) || { n: 0, a: 0, l: 0 }; e.n++; e.a += auf(x.zahlen); e.l += lik(x.zahlen); m.set(x.vorlage, e); }
    const n = v => Math.round(v).toLocaleString('de-DE'), vor = id => trailerV(id) || karV(id) || VORLAGEN.find(y => y.id === id) || { emoji: '🎬', name: id || 'Clip' };
    const l = [...m.entries()].map(([id, e]) => ({ v: vor(id), n: e.n, a: e.a / e.n, l: e.l / e.n })).sort((p, q) => q.a - p.a || q.l - p.l);
    const top = mit.slice().sort((p, q) => auf(q.zahlen) - auf(p.zahlen) || lik(q.zahlen) - lik(p.zahlen)).slice(0, 3);
    return `<table class="kc-best"><tr><th>Vorlage</th><th>Clips</th><th>Ø Aufrufe</th><th>Ø Likes</th></tr>${l.slice(0, 8).map(e => `<tr><td>${e.v.emoji} ${esc(e.v.name)}</td><td>${e.n}</td><td><b>${n(e.a)}</b></td><td>${n(e.l)}</td></tr>`).join('')}</table>
      <div class="kc-dim" style="margin-top:8px">Beste Clips: ${top.map(x => `${vor(x.vorlage).emoji} ${esc(x.titel || vor(x.vorlage).name)} (${n(auf(x.zahlen))} Aufrufe)`).join(' · ')}</div>
      <div class="kc-dim">Aufrufe = Instagram + YouTube zusammen. TikTok liefert für Entwürfe keine Zahlen.</div>`;
  }
  function html() {
    const st = stand(), c = CLIPS[0], liste = (st.clips || []), cfg = st.clipcfg || { zeit: '18:30', test: true };
    const draussen = x => (!x.insta || !!x.gepostet) && (!x.tiktok || !!x.tt) && (!x.youtube || !!x.yt);
    const offen = liste.filter(x => !draussen(x) && !x.auto), raus = liste.filter(draussen).reverse();   // Automatisches steht oben in der Leiste „🤖 Automatik“
    const tk = st.tiktok || {};
    return `<div class="kc-app">
      <details class="kc-so" ${(OFFEN['kc-so'] ?? !(CLIPS.length || liste.length)) ? 'open' : ''}><summary>💡 So geht’s (in 3 Schritten)</summary>
        <ol><li><b>Clip reinziehen</b> – einfach die MP4 aus dem Kreids Clipper hier reinziehen (auch mehrere auf einmal). Tipp: Datei so benennen wie <b>Spa_EauRouge_Crash</b>, dann kommen Vorlage, Spruch und Titel von selbst. Oder unter „📂 Vorrat aus der Toolbox“ eine fertige Szene öffnen.</li>
        <li><b>Vorlage antippen</b> – z. B. „Wer war schuld?“. Spruch, Farbe und Text sind schon fertig, ändern geht immer.</li>
        <li><b>🚀 Einplanen</b> – das Video wird hier gebaut und geht zur geplanten Zeit raus: Instagram-Reel, YouTube-Short und TikTok-Entwurf. Ein Clip pro Tag. Der Abspann und der Text zeigen auf deinen YouTube-Kanal und den nächsten Stream.</li></ol>
        <div class="kc-dim">Tipp für Reichweite: 2 bis 3 Wochen lang jeden Tag einen Clip, immer zur gleichen Uhrzeit.</div></details>
      ${ARBEIT ? `<div class="kc-arbeit"><span class="kc-spin"></span>${esc(ARBEIT)}</div>` : ''}
      ${c && c.ersetzt ? '<div class="kc-hinweis kc-bearb">✏️ Du bearbeitest einen geplanten Post. Beim Einplanen wird der alte ersetzt. Mit „✕ Clip entfernen“ brichst du ab, der alte bleibt dann.</div>' : ''}
      ${clipEdHtml()}
      ${BEARBEITE && !CLIP_ED ? `<div class="kc-hinweis kc-bearb">✏️ Zieh jetzt die Videodatei für „${esc(BEARBEITE.titel || 'den geplanten Post')}“ rein. Sie öffnet sich im Editor und ersetzt den geplanten Post. <button type="button" class="btn ki-k" data-c="bearbeiten-ab">Abbrechen</button></div>` : ''}
      ${automatikHtml(liste, cfg)}
      ${ablHtml(!c)}
      <label class="kc-drop${c ? ' klein' : ''}" data-c="drop"><input type="file" accept="video/*" multiple data-c="datei">
        <span class="kc-drop-gross">🎬 ${c ? 'Weitere Clips reinziehen' : 'Clip hier reinziehen'}</span><span class="kc-dim">oder antippen und auswählen · MP4 aus dem Kreids Clipper</span></label>
      ${c ? editor(c, tk) : ''}
      ${CLIPS.length > 1 ? `<div class="kc-reihe-info">⏭ Danach warten noch ${CLIPS.length - 1} Clip${CLIPS.length > 2 ? 's' : ''}: ${CLIPS.slice(1).map(x => esc(x.name)).join(' · ')}</div>` : ''}
      <h3 class="kc-h">📅 Geplant <span class="kc-dim">(${offen.length})</span></h3>
      ${offen.length ? offen.map(x => zeile(x, false)).join('') : '<div class="kc-leer">Noch nichts geplant. Zieh oben einen Clip rein.</div>'}
      ${raus.length ? `<details class="kc-best-box kc-raus" ${OFFEN['kc-best-box'] ? 'open' : ''}><summary>📈 Was läuft am besten</summary>${bestenliste(raus)}</details>` : ''}
      ${raus.length ? `<details class="kc-raus" ${OFFEN['kc-raus'] ? 'open' : ''}><summary>✓ Schon draußen (${raus.length})</summary>${raus.map(x => zeile(x, true)).join('')}</details>` : ''}
      <details class="kc-einst" ${OFFEN['kc-einst'] ? 'open' : ''}><summary>⚙ Einstellungen</summary>
        <div class="kc-felder">
          <label class="kc-feld">Uhrzeit für neue Clips<input type="time" value="${esc(cfg.zeit)}" data-c="cfg-zeit">${tipp('Jeder neue Clip kommt auf den nächsten freien Tag um diese Uhrzeit.')}</label>
          <label class="kc-check"><input type="checkbox" data-c="cfg-test" ${cfg.test ? 'checked' : ''}> <span><b>Test-Reels</b>${tipp('Instagram zeigt den Clip zuerst nur Leuten, die dir noch nicht folgen. Läuft er gut, sehen ihn auch deine Follower. Geht laut einem Planungstool erst ab 1.000 Followern – sonst wird ganz normal gepostet.')}</span></label>
        </div>
        ${cfg.testFehler ? `<div class="kc-hinweis">Test-Reels gingen beim letzten Mal nicht, deshalb wurde normal gepostet. Instagram sagt: ${esc(cfg.testFehler)}</div>` : ''}
        <div class="kc-knoepfe"><button type="button" class="btn ki-k" data-c="cfg-speichern">💾 Speichern</button></div>
        ${tipp('Instagram-Konto steht ganz oben („● Verbunden mit …“). Logo: Reiter „🎨 Aussehen“. TikTok verbinden: Reiter „📡 YouTube · TikTok · Discord“.')}
      </details>
    </div>`;
  }
  function editor(c, tk) {
    const yt = stand().youtube || {};
    const v = vorlage(c), p = zeitplan(c);
    return `<div class="kc-editor">
      <div class="kc-links">
        <div class="kc-buehne"><canvas class="kc-vorschau${v.analyse ? ' ziel' : ''}" width="540" height="960" data-c="vorschau"></canvas>
          <button type="button" class="kc-ton" data-c="ton">${VOR.ton ? '🔊' : '🔇'}</button></div>
        <div class="kc-dim kc-mitte">Vorschau läuft in Schleife · ${sek(p.T)} lang${VOR.ton ? '' : ' · 🔇 tippen für Ton'}</div>
        <div class="kc-dim kc-mitte">Effekt-Sounds hörst du im fertigen Video.</div>
        ${v.analyse ? '<div class="kc-hinweis kc-mitte">🎯 Tipp ins Bild auf die Stelle, die eingekreist werden soll.</div>' : ''}
        ${bildPanel(c, v)}
        ${camPanel(c, v)}
        ${teamPanel('clip')}
      </div>
      <div class="kc-rechts">
        <div class="kc-schritt">1 · Vorlage</div>
        <label class="kc-feld">🔎 Stichwörter<div class="kc-zeile"><input type="text" maxlength="100" value="${esc(c.stichText || '')}" placeholder="z. B. Spa Eau Rouge Crash" data-c="stich"><button type="button" class="btn ki-k" data-c="stich-los">✓ Übernehmen</button></div>${stichChips(c)}${tipp('Kommen aus dem Dateinamen (z. B. Spa_EauRouge_Crash.mp4). Erkennt Strecke, Kurve, was passiert und das Auto. Daraus: Vorlage, Spruch und Titel.')}</label>
        <div class="kc-vorlagen">${GRUPPEN.map(([gr, gname]) => { const l = VORLAGEN.filter(x => gruppeVon(x) === gr); return l.length ? `<div class="kc-vgruppe">${esc(gname)}</div>` + l.map(x => `<button type="button" class="kc-vl${x.id === c.vorlage ? ' an' : ''}" data-c="vorlage" data-wert="${x.id}" style="--f:${x.farbe}"><span>${x.emoji}</span>${esc(x.name)}${x.neu ? '<em>NEU</em>' : ''}</button>`).join('') : ''; }).join('')}</div>
        ${tipp(esc(v.hilfe))}
        <div class="kc-schritt">2 · Spruch & Look</div>
        <label class="kc-feld">Spruch oben<div class="kc-zeile"><input type="text" maxlength="40" value="${esc(c.hook)}" data-c="hook"><button type="button" class="btn ki-k" data-c="wuerfeln" title="Anderer Spruch">🎲</button></div>${tipp('Der erste Satz entscheidet, ob jemand stehen bleibt. Kurz und frech. 🎲 = anderer Vorschlag.')}</label>
        <label class="kc-feld">Frage unten<div class="kc-zeile"><input type="text" maxlength="40" value="${esc(c.unten || '')}" placeholder="${esc(v.unten[0])}" data-c="unten"><button type="button" class="btn ki-k" data-c="wuerfeln-unten" title="Andere Frage">🎲</button></div>${tipp('Steht im Band unter dem Clip. Eine Frage bringt Kommentare.')}</label>
        ${c.zeitlupe ? `<label class="kc-feld">Text in der Zeitlupe<div class="kc-zeile"><input type="text" maxlength="40" value="${esc(c.wieder || '')}" placeholder="${esc(v.wieder)}" data-c="wieder"><button type="button" class="btn ki-k" data-c="wuerfeln-wieder" title="Anderer Text">🎲</button></div></label>` : ''}
        ${v.felder ? `<div class="kc-felder">${v.felder.map(([k, label, ph]) => `<label class="kc-feld">${esc(label)}<input type="text" maxlength="40" placeholder="${esc(ph)}" value="${esc(c[k] || '')}" data-c="feld" data-feld="${k}"></label>`).join('')}</div>
          ${tipp(esc(v.feldTipp || ''))}` : ''}
        ${v.mehr || v.nurNeon || v.nurTV ? '' : `<div class="kc-umschalt kc-looks">${LOOKS.map(([k, n]) => `<button type="button" class="${(c.look || 'neon') === k ? 'an' : ''}" data-c="look" data-wert="${k}">${n}</button>`).join('')}</div>`}
        ${v.mehr || c.look === 'tv' ? '' : `<div class="kc-feld">Stil<div class="kc-stile">${STILE.map(([k, n]) => `<button type="button" class="${stilVon(c) === k ? 'an' : ''}" data-c="stil" data-wert="${k}">${n}</button>`).join('')}<button type="button" class="kc-stil-w" data-c="stil-wuerfeln" title="Anderer Stil" aria-label="Anderer Stil">🎲</button></div>${tipp('Wechselt bei jedem neuen Clip und jeder anderen Vorlage von selbst. 🎲 = nächster Stil.')}</div>`}
        <div class="kc-farben">${FARBEN.map(f => `<button type="button" class="kc-farbe${f === c.farbe ? ' an' : ''}" style="--f:${f}" data-c="farbe" data-wert="${f}" aria-label="Neonfarbe ${f}"></button>`).join('')}<span class="kc-dim">Neonfarbe</span></div>
        ${v.mehr ? '' : `<div class="kc-felder">
          ${c.look === 'tv' ? '' : `<div class="kc-umschalt"><button type="button" class="${c.modus !== 'zoom' ? 'an' : ''}" data-c="modus" data-wert="ganz">▭ Ganzes Bild</button><button type="button" class="${c.modus === 'zoom' ? 'an' : ''}" data-c="modus" data-wert="zoom">▯ Zoom</button></div>`}
          <label class="kc-check"><input type="checkbox" data-c="zeitlupe" ${c.zeitlupe ? 'checked' : ''}> <span><b>Zeitlupe</b> vom Ende</span></label>
        </div>`}
        ${v.mehr ? tipp(TIPP_MEHR[v.mehr]) : v.nurNeon ? tipp('Nur Neon-Look. Ganzes Bild: Clip im Rahmen. Zoom: Clip füllt das ganze Handy. Zeitlupe: die letzten Sekunden nochmal halb so schnell.') : tipp(c.look === 'tv'
          ? 'TV-Sendung: wie eine Live-Übertragung mit Schlagzeile, LIVE/REPLAY, Bauchbinde und Laufschrift. Zeitlupe: die letzten Sekunden nochmal halb so schnell, mit Replay-Übergang.'
          : 'Neon: Chrom-Schrift im Neon-Rahmen. Ganzes Bild: Clip im Rahmen. Zoom: Clip füllt das ganze Handy (Seiten werden abgeschnitten). Zeitlupe: die letzten Sekunden nochmal halb so schnell.')}
        ${v.mehr ? schnittMehr(c, v, p) : schnittEinfach(c, v, p)}
        <div class="kc-schritt">4 · Text & Termin</div>
        <label class="kc-feld">Text unter dem Post<textarea rows="4" maxlength="2200" data-c="text">${esc(c.text)}</textarea>${tipp('Mit Frage am Ende – Kommentare bringen Reichweite. Höchstens 5 Hashtags.')}</label>
        <div class="kc-felder">
          <label class="kc-feld">Geht raus am<input type="datetime-local" value="${c.postMs ? esc(lokal(c.postMs)) : ''}" data-c="postms">${tipp(c.postMs ? '' : 'Leer = nächster freier Tag. Oder unten einen freien Termin antippen.')}</label>
          <div class="kc-ziele">
            <label class="kc-check"><input type="checkbox" data-c="insta" ${c.insta ? 'checked' : ''}> <span><b>Instagram</b> (Reel)</span></label>
            <label class="kc-check${tk.verbunden ? '' : ' aus'}"><input type="checkbox" data-c="tiktok" ${c.tiktok && tk.verbunden ? 'checked' : ''} ${tk.verbunden ? '' : 'disabled'}> <span><b>TikTok</b> (Entwurf)</span></label>
            <label class="kc-check${yt.verbunden ? '' : ' aus'}"><input type="checkbox" data-c="youtube" ${c.youtube && yt.verbunden ? 'checked' : ''} ${yt.verbunden ? '' : 'disabled'}> <span><b>YouTube</b> (Short)</span></label>
          </div>
        </div>
        <div class="kc-mehrposts">
          <label class="kc-check"><input type="checkbox" data-c="folge-an" ${folgeAn(c) ? 'checked' : ''}> <span><b>🔢 Reihe mit Nummer:</b> ${esc(v.name)} # <input type="number" min="1" max="99999" value="${folgeVon(c)}" data-c="folge" class="kc-folge" ${folgeAn(c) ? '' : 'disabled'}>${tipp('Die Nummer steht im Video und im Text und zählt bei jedem Clip von selbst hoch. So erkennt man deine Reihe wieder.')}</span></label>
        </div>
        ${termineHtml(c)}
        ${tipp(tk.verbunden ? 'TikTok: Das Video landet als Entwurf in deiner TikTok-App. Dort nur noch einen Trend-Sound drauf und posten.' : 'TikTok ist nicht verbunden (Reiter „📡 YouTube · TikTok · Discord“). Für TikTok: „📥 Video laden“ und selbst hochladen.')}
        <div class="kc-knoepfe gross">
          <button type="button" class="btn ki-k kc-los" data-c="einplanen" ${ARBEIT ? 'disabled' : ''}>${c.ersetzt ? '🚀 Video bauen & ersetzen' : '🚀 Video bauen & einplanen'}</button>
          <button type="button" class="btn ki-k" data-c="laden" ${ARBEIT ? 'disabled' : ''}>📥 Nur Video laden</button>
          <button type="button" class="btn ki-k" data-c="weglegen">✕ Clip entfernen</button>
        </div>
      </div>
    </div>`;
  }
  const TIPP_MEHR = {
    top3: 'Nur Neon-Look. Jeder Platz bekommt eine große Nummer und seinen Titel im Band.',
    vergleich: 'Nur Neon-Look. Das Video ist so lang wie der kürzere Clip.',
    strecke: 'Nur Neon-Look. Lange Runden laufen schneller (bis 4×), damit sie in etwa 30 Sekunden passen.',
    verkehr: 'Nur Neon-Look. Lange Clips laufen schneller (bis 3×), damit sie in etwa 30 Sekunden passen.',
    aufholjagd: 'Nur Neon-Look. Lange Clips laufen schneller (bis 4×), damit sie in etwa 35 Sekunden passen.',
    sektoren: 'Nur Neon-Look. Lange Runden laufen schneller (bis 3×), die Zeiten bleiben echt.',
    erwartung: 'Nur Neon-Look. Erst läuft die Erwartung, dann die Realität, am Ende Standbild.'
  };
  function schnittMehr(c, v, p) {
    const mc = MARKEN[v.mehr];
    if (mc) {   // ein Clip mit Markierungen (Kurven, Autos, Plätze, Sektoren)
      const st = VOR.stelle != null ? kl(VOR.stelle, p.a, p.b) : p.a, mk = (c.marken || []).slice().sort((x, y) => x.t - y.t), start = startPlatz(c), runde = v.mehr === 'strecke' || v.mehr === 'sektoren';
      const kurz = i => (mc.kurz ? mc.kurz(i) : 'P' + Math.max(1, start - i - 1));
      const farbWahl = (wert, attr) => `<select class="kc-wahl kc-sfarbe" ${attr}>${[['lila', '🟣 Lila'], ['gruen', '🟢 Grün'], ['gelb', '🟡 Gelb']].map(([k, n]) => `<option value="${k}" ${(wert || 'lila') === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
      const letzt = p.sektoren ? p.sektoren[p.sektoren.length - 1] : null;
      return `<div class="kc-schritt">${mc.schritt}</div>
        <div class="kc-schnitt">
          <label class="kc-feld">${mc.von} <b data-c="start-wert">${sek(p.a)}</b><input type="range" min="0" max="${c.dauer}" step="0.1" value="${p.a}" data-c="start"></label>
          <label class="kc-feld">${mc.bis} <b data-c="ende-wert">${sek(p.b)}</b><input type="range" min="0" max="${c.dauer}" step="0.1" value="${p.b}" data-c="ende"></label>
        </div>
        ${tipp(p.tempo >= 1.05 ? `${runde ? 'Runde' : 'Clip'} ${sek(p.b - p.a)} → im Video ${sek(p.lauf)} (${p.tempo.toFixed(1).replace('.', ',')}× schneller).` : `${runde ? 'Runde' : 'Clip'} ${sek(p.b - p.a)} – passt ohne Zeitraffer.`)}
        <label class="kc-feld">${mc.stelle} <b data-c="stelle-wert">${sek(st - p.a)}</b><input type="range" min="${p.a}" max="${p.b}" step="0.1" value="${st}" data-c="stelle"></label>
        <div class="kc-knoepfe"><button type="button" class="btn ki-k" data-c="marke-neu">${mc.knopf}</button></div>
        ${tipp(mc.tipp)}
        ${mk.length ? `<div class="kc-marken">${mk.map((x, i) => `<div class="kc-marke"><b>${kurz(i)}</b><span class="kc-dim">${sek(Math.max(0, x.t - p.a))}</span><input type="text" maxlength="40" value="${esc(x.text || '')}" placeholder="${esc(mc.ph)}" data-c="marke-text" data-k="${esc(x.id)}">${mc.farbe ? farbWahl(x.farbe, `data-c="marke-farbe" data-k="${esc(x.id)}"`) : ''}<button type="button" class="btn ki-k" data-c="marke-weg" data-k="${esc(x.id)}" title="Löschen">✕</button></div>`).join('')}</div>` : ''}
        ${letzt ? `<div class="kc-marke"><b>S${letzt.n}</b><span class="kc-dim">bis Rundenende</span><span class="kc-fuell">${esc(zeitText(letzt.zeit))}</span>${farbWahl(c.sektorLetzt, 'data-c="sektor-letzt"')}</div>` : ''}`;
    }
    const q = quellenVon(c), warte = CLIPS.slice(1);
    let erstLeer = true;
    return `<div class="kc-schritt">3 · Clips</div>
      ${v.plaetze.map((name, i) => {
        const src = q[i];
        if (!src) {
          const knoepfe = erstLeer ? `<div class="kc-knoepfe">
              ${warte.length ? `<select class="kc-wahl" data-c="slot-wahl"><option value="">Aus der Warteschlange …</option>${warte.map((x, k) => `<option value="${k + 1}">${esc(x.name)}</option>`).join('')}</select>` : ''}
              <label class="btn ki-k kc-datei">📂 Clip wählen<input type="file" accept="video/*" data-c="slot-datei"></label>
              ${v.mehr === 'vergleich' || v.mehr === 'erwartung' ? '<button type="button" class="btn ki-k" data-c="slot-gleich">Gleicher Clip, andere Stelle</button>' : ''}</div>` : '';
          erstLeer = false;
          return `<div class="kc-slot leer" style="--f:${c.farbe || v.farbe}"><div class="kc-slot-kopf"><b>${esc(name)}</b><span class="kc-dim">fehlt noch</span></div>${knoepfe}</div>`;
        }
        const { a, b } = abschnitt(src);
        return `<div class="kc-slot" style="--f:${c.farbe || v.farbe}"><div class="kc-slot-kopf"><b>${esc(name)}</b><span class="kc-dim">${esc(src.name || '')}</span>
            <span class="kc-slot-knoepfe">${i < q.length - 1 ? `<button type="button" class="btn ki-k" data-c="slot-tauschen" data-i="${i}" title="Mit dem Platz darunter tauschen">⇅</button>` : ''}${i > 0 ? `<button type="button" class="btn ki-k" data-c="slot-raus" data-i="${i}" title="Zurück in die Warteschlange">✕</button>` : ''}</span></div>
          <label class="kc-feld">${v.mehr === 'top3' ? 'Titel (steht im Band)' : 'Text am Bild'}<input type="text" maxlength="30" value="${esc(src.titel || '')}" placeholder="${v.mehr === 'top3' ? 'z. B. Bester Überholer' : esc(name)}" data-c="slot-titel" data-i="${i}"></label>
          <div class="kc-schnitt">
            <label class="kc-feld">Anfang <b data-c="slot-a-wert" data-i="${i}">${sek(a)}</b><input type="range" min="0" max="${src.dauer}" step="0.1" value="${a}" data-c="slot-a" data-i="${i}"></label>
            <label class="kc-feld">Ende <b data-c="slot-b-wert" data-i="${i}">${sek(b)}</b><input type="range" min="0" max="${src.dauer}" step="0.1" value="${b}" data-c="slot-b" data-i="${i}"></label>
          </div>
          <label class="kc-feld">Video-Größe <b data-c="slot-z-wert" data-i="${i}">${Math.round((tfVon(src).z || 1) * 100)} %</b><input type="range" min="0.5" max="3" step="0.01" value="${tfVon(src).z || 1}" data-c="slot-z" data-i="${i}"></label></div>`;
      }).join('')}
      ${tipp(v.mehr === 'top3' ? `Zusammen ${sek(p.D)}. Am besten 5 bis 10 Sekunden je Platz, die Action ans Ende.`
        : v.mehr === 'erwartung' ? `Erst ${sek(p.d0)} Erwartung, dann ${sek(p.lauf - p.d0)} Realität, dann Standbild. Den Crash ans Ende der Realität legen.`
        : `Beide laufen ${sek(p.D)} gleichzeitig. Mit „Anfang“ legst du sie genau übereinander.`)}`;
  }
  function schnittEinfach(c, v, p) {
    return `<div class="kc-schritt">3 · Schnitt</div>
        <div class="kc-schnitt">
          <label class="kc-feld">Anfang <b data-c="start-wert">${sek(p.a)}</b><input type="range" min="0" max="${c.dauer}" step="0.1" value="${p.a}" data-c="start"></label>
          <label class="kc-feld">Ende <b data-c="ende-wert">${sek(p.b)}</b><input type="range" min="0" max="${c.dauer}" step="0.1" value="${p.b}" data-c="ende"></label>
        </div>
        ${v.pause || v.analyse ? `<label class="kc-feld">Anhalten bei <b data-c="halt-wert">${sek(p.F)}</b><input type="range" min="${p.a}" max="${p.b}" step="0.1" value="${p.F}" data-c="halt"></label>
          ${tipp(v.analyse ? 'Wo der Clip für die Analyse anhält. Dann in der Vorschau auf die Stelle tippen, die eingekreist werden soll.' : 'Kurz bevor es knallt. Dann kommt 3-2-1 und der Clip läuft weiter.')}` : ''}
        ${v.ampel ? tipp('„Anfang“ auf kurz vor dem Start legen: Das erste Bild steht, bis die Lichter ausgehen.') : ''}
        ${v.linie ? `<label class="kc-feld">Ziellinie bei <b data-c="linie-wert">${sek(p.lin)}</b><input type="range" min="${p.a}" max="${p.b}" step="0.1" value="${p.lin}" data-c="linie"></label>
          ${tipp(v.zielflagge ? 'Der Moment, in dem du über die Ziellinie fährst: Dort steht das Bild mit Flagge und Ergebnis.' : 'Der Moment, in dem du über die Ziellinie fährst: Dort wird die Zeit lila.')}` : ''}
        ${tipp(`Clip ist ${sek(c.dauer)} lang. Genommen werden ${sek(p.b - p.a)}${p.FD ? (v.ampel ? ' + Startampel' : v.analyse ? ' + Analyse' : v.zielflagge ? ' + Ziel-Standbild' : ' + Pause') : ''}${p.R ? ' + Zeitlupe' : ''}. Am besten 8 bis 20 Sekunden, die Action ans Ende.`)}`;
  }
  function zeile(x, raus) {
    const v = autoV(x) || VORLAGEN.find(y => y.id === x.vorlage) || VORLAGEN[0];
    const chips = [];
    if (x.insta) chips.push(x.gepostet ? `<span class="ki-chip gruen">Instagram ✓${x.gepostet.test ? ' (Test-Reel)' : ''}</span>` : `<span class="ki-chip blau">Instagram${x.kar ? ' · Karussell' : ''}</span>`);
    if (x.tiktok) chips.push(x.tt ? '<span class="ki-chip gruen">TikTok-Entwurf ✓</span>' : '<span class="ki-chip blau">TikTok</span>');
    if (x.youtube) chips.push(x.yt ? (x.yt.privat ? '<span class="ki-chip rot">YouTube: nur privat</span>' : '<span class="ki-chip gruen">YouTube ✓</span>') : '<span class="ki-chip blau">YouTube</span>');
    if (!x.video && !x.karussell && !x.weg) chips.push(`<span class="ki-chip rot">${x.kar ? 'Bilder fehlen' : 'Video fehlt'} – löschen und neu einplanen</span>`);
    if (x.fehler) chips.push('<span class="ki-chip rot">Fehler</span>');
    const zz = x.zahlen || {}, zn = v => (v == null ? '–' : Number(v).toLocaleString('de-DE'));
    const zahlenHtml = raus && (zz.ig || zz.yt) ? `<div class="kc-zahlen">${zz.ig ? `<span title="Instagram">📸 ${zz.ig.aufrufe != null ? `👁 <b>${zn(zz.ig.aufrufe)}</b> · ` : ''}❤ ${zn(zz.ig.likes)} · 💬 ${zn(zz.ig.kommentare)}${zz.ig.geteilt != null ? ` · ↗ ${zn(zz.ig.geteilt)}` : ''}</span>` : ''}${zz.yt ? `<span title="YouTube">▶ 👁 <b>${zn(zz.yt.aufrufe)}</b> · 👍 ${zn(zz.yt.likes)} · 💬 ${zn(zz.yt.kommentare)}</span>` : ''}</div>` : '';
    return `<div class="kc-post" data-id="${esc(x.id)}">
      <a class="kc-mini" href="${esc(x.video || (x.kbilder && x.kbilder[0]) || (x.yt && x.yt.link) || (x.gepostet && x.gepostet.link) || '#')}" target="_blank" rel="noopener" title="Ansehen">${x.bild ? `<img src="${esc(x.bild)}" alt="">` : '🎬'}</a>
      <div class="kc-info">
        <div class="kc-titel" style="--f:${v.farbe}">${v.emoji} ${esc(x.titel || v.name)}</div>
        <div class="kc-dim">${raus ? 'Gepostet' : 'Geht raus'}: <b>${esc(zeit(raus ? ((x.gepostet && x.gepostet.zeit) || (x.tt && x.tt.zeit) || x.postMs) : x.postMs))}</b>${x.dauer ? ' · ' + sek(x.dauer) : ''}${x.karussell ? ` · ${x.karussell} Bilder` : ''}</div>
        <div class="kc-chips">${chips.join('')}</div>${zahlenHtml}
        ${x.fehler ? `<div class="kc-hinweis rot">⚠ ${esc(x.fehler)}</div>` : ''}${x.ttFehler && !x.tt ? `<div class="kc-hinweis rot">TikTok: ${esc(x.ttFehler)}</div>` : ''}${x.ytFehler && !x.yt ? `<div class="kc-hinweis rot">YouTube: ${esc(x.ytFehler)}</div>` : ''}
        <div class="kc-knoepfe">
          ${x.gepostet && x.gepostet.link ? `<a class="btn ki-k" href="${esc(x.gepostet.link)}" target="_blank" rel="noopener">↗ Auf Instagram</a>` : ''}
          ${x.yt && x.yt.link ? `<a class="btn ki-k" href="${esc(x.yt.link)}" target="_blank" rel="noopener">↗ Auf YouTube</a>` : ''}
          ${raus && !x.tt && !x.weg && (x.karussell || x.video) && (stand().tiktok || {}).verbunden ? `<button type="button" class="btn ki-k" data-c="tiktok" title="Schickt ${x.kar ? 'die Bilder als Foto-Beitrag' : 'das Video'} als Entwurf in deine TikTok-App. Dort Musik drauf und posten.">📱 An TikTok</button>` : ''}
          ${!raus ? `<button type="button" class="btn ki-k" data-c="jetzt">🚀 Jetzt posten</button>
            <input type="datetime-local" value="${esc(lokal(x.postMs))}" data-c="zeitwert"><button type="button" class="btn ki-k" data-c="zeit">🕒 Zeit</button>` : ''}
          ${!raus && !(x.gepostet || x.tt || x.yt) ? '<button type="button" class="btn ki-k" data-c="bearbeiten" title="Titel, Text, Zeit und Ziele ändern. Mit der Videodatei auch das Video selbst.">✏️ Bearbeiten</button>' : ''}
          ${x.video ? `<a class="btn ki-k" href="${esc(x.video)}" download>📥 Video</a>` : ''}
          <button type="button" class="btn ki-k" data-c="loeschen">🗑</button>
        </div>
      </div></div>`;
  }

  // ─── Vorschau: Clip läuft live mit allen Ebenen (Zeitlupe und Abspann im Takt) ───
  async function vorschauStarten() {
    const cv = BOX && BOX.querySelector('canvas[data-c="vorschau"]'), c = CLIPS[0];
    if (!cv || !c) return;
    if (vorlage(c).mehr) return vorschauMehr(cv, c);
    if (!MAT) await material();
    await schriften();
    if (!VOR.vid || VOR.url !== c.url) {
      if (VOR.vid) { VOR.vid.pause(); VOR.vid.removeAttribute('src'); VOR.vid.load(); }
      VOR.vid = document.createElement('video'); VOR.vid.playsInline = true; VOR.vid.preload = 'auto'; VOR.vid.src = c.url; VOR.url = c.url;
      await new Promise(ok => { VOR.vid.onloadeddata = ok; VOR.vid.onerror = ok; setTimeout(ok, 4000); });
    }
    VOR.vid.muted = !VOR.ton;
    const camUrl = c.cam ? c.cam.url : '';
    if (VOR.camUrl !== camUrl) {   // 📷 Cam als zweites Video, wird unten an den Clip gekoppelt
      if (VOR.cam) { VOR.cam.pause(); VOR.cam.removeAttribute('src'); VOR.cam.load(); }
      VOR.cam = null; VOR.camUrl = camUrl;
      if (camUrl) { const k = document.createElement('video'); k.muted = true; k.playsInline = true; k.preload = 'auto'; k.src = camUrl; VOR.cam = k; }
    }
    VOR.canvas = cv; const g = cv.getContext('2d'), mein = ++VOR.lauf, vid = VOR.vid;
    let phase = '', outroStart = 0, haltStart = 0, gehalten = false, erstes = null;
    const schritt = () => {
      if (VOR.lauf !== mein) return;
      const cl = CLIPS[0];
      if (!cv.isConnected || !cl || cl.url !== VOR.url || vorlage(cl).mehr) { vid.pause(); if (VOR.cam) VOR.cam.pause(); return; }   // Reiter gewechselt oder Clip weg → Video anhalten
      if (phase === '' || phase === 'neu') erstes = null;
      const p = zeitplan(cl);
      let t;
      if (phase === '' || phase === 'neu') { vid.playbackRate = 1; vid.currentTime = p.a; vid.play().catch(() => {}); phase = 'haupt'; gehalten = false; }
      if (VOR.sprung != null) { const z = kl(VOR.sprung, p.a, p.b - 0.1); VOR.sprung = null; vid.playbackRate = 1; vid.currentTime = z; vid.play().catch(() => {}); phase = 'haupt'; gehalten = p.FD > 0 && z > p.F; erstes = null; }
      if (phase === 'haupt' && p.FD && !gehalten && vid.currentTime >= p.F - 0.02) { vid.pause(); phase = 'halt'; haltStart = performance.now(); }
      if (phase === 'halt') { const d = (performance.now() - haltStart) / 1000; t = p.h + Math.min(d, p.FD - 0.001); if (d >= p.FD) { gehalten = true; phase = 'haupt'; vid.play().catch(() => {}); } }
      if (phase === 'haupt') { t = vid.currentTime - p.a + (gehalten ? p.FD : 0); if (vid.currentTime >= p.b - 0.03 || vid.ended) { if (p.R) { phase = 'lupe'; vid.currentTime = p.b - p.Z; vid.playbackRate = 0.5; vid.play().catch(() => {}); } else { phase = 'outro'; vid.pause(); outroStart = performance.now(); } } }
      if (phase === 'lupe') { t = p.D + (vid.currentTime - (p.b - p.Z)) * 2; if (vid.currentTime >= p.b - 0.03 || vid.ended) { phase = 'outro'; vid.pause(); outroStart = performance.now(); } }
      if (phase === 'outro') { t = p.T - OUTRO + (performance.now() - outroStart) / 1000; if (t >= p.T) { phase = 'neu'; t = p.T - 0.01; } }
      g.setTransform(cv.width / B, 0, 0, cv.height / H, 0, 0); g.clearRect(0, 0, B, H);
      const tt = kl(t || 0, 0, p.T - 0.001); VOR.t = tt;
      const kam = VOR.cam && camPlatz(cl) !== 'aus' ? VOR.cam : null;
      if (kam && kam.readyState >= 1) {   // 📷 Cam auf dieselbe Stelle wie den Clip ziehen, gleiche Geschwindigkeit, Pause mitmachen
        const ziel = Math.min(vid.currentTime, Math.max(0, (kam.duration || 1e9) - 0.1));
        if (kam.playbackRate !== vid.playbackRate) kam.playbackRate = vid.playbackRate;
        if (!kam.seeking && Math.abs(kam.currentTime - ziel) > (vid.paused ? 0.05 : 0.3)) kam.currentTime = ziel;
        if (vid.paused && !kam.paused) kam.pause(); else if (!vid.paused && kam.paused && ziel < (kam.duration || 1e9) - 0.15) kam.play().catch(() => {});
      } else if (VOR.cam && !VOR.cam.paused) VOR.cam.pause();
      zeichne(g, tt, cl, p, MAT, vid, kam && kam.readyState >= 2 ? kam : null);
      if (!erstes && tt < 0.25 && !vid.seeking && vid.readyState >= 2) { erstes = leinwand(cv.width, cv.height); erstes.getContext('2d').drawImage(cv, 0, 0); }
      else loopUebergang(g, tt, p, erstes);
      requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }
  // Vorschau für Top 3 · Vorher/Nachher · Strecke: Zeit läuft mit der Uhr, je Platz ein Video-Element, das mitgezogen wird
  const VIDS = new Map();   // Schlüssel url#platz → Video
  function vidFuer(url, s) {
    const k = url + '#' + s;
    let v = VIDS.get(k);
    if (!v) { v = document.createElement('video'); v.playsInline = true; v.preload = 'auto'; v.muted = true; v.src = url; VIDS.set(k, v); }
    return v;
  }
  function vidsWeg(urls) { for (const [k, v] of VIDS) if (!urls || urls.some(u => k.startsWith(u + '#'))) { v.pause(); v.removeAttribute('src'); v.load(); VIDS.delete(k); } }
  // Springen ohne schwarzes Bild: vorher das aktuelle Bild merken, Dauer des Sprungs messen (für den nächsten Sprung)
  function springen(v, ziel) {
    if (v.readyState >= 2 && v.videoWidth) {
      const k = v._stand || (v._stand = leinwand(640, Math.round(640 * v.videoHeight / v.videoWidth)));
      k.videoWidth = v.videoWidth; k.videoHeight = v.videoHeight; k.getContext('2d').drawImage(v, 0, 0, k.width, k.height); k._ok = true;
    }
    if (!v._mess) { v._mess = true; v.addEventListener('seeked', () => { if (v._ab) v._lat = Math.min(2, (performance.now() - v._ab) / 1000); v._ab = 0; }); }
    v._ab = performance.now(); v.currentTime = ziel;
  }
  const vidBild = v => (v.readyState >= 2 && !v.seeking ? v : v._stand && v._stand._ok ? v._stand : null);
  async function vorschauMehr(cv, c) {
    if (!MAT) await material();
    await schriften();
    if (VOR.vid) VOR.vid.pause();
    VOR.canvas = cv; const g = cv.getContext('2d'), mein = ++VOR.lauf;
    let start = performance.now(), erstes = null, tAlt = 0, wartet = 0;
    const schritt = () => {
      if (VOR.lauf !== mein) return;
      const cl = CLIPS[0];
      if (!cv.isConnected || cl !== c || !vorlage(cl).mehr) { for (const v of VIDS.values()) v.pause(); return; }
      const p = zeitplan(cl), q = quellenVon(cl), jetzt = performance.now(), rate = p.tempo || 1;
      let t = (jetzt - start) / 1000, scrub = null;
      if (VOR.scrub && jetzt < VOR.scrub.bis && MARKEN[p.mehr]) { scrub = VOR.scrub; t = kl((scrub.t - p.x.a) / p.tempo, 0, p.lauf - 0.01); }
      if (t >= p.T) { t = 0; erstes = null; }
      // Die Uhr folgt dem ersten Video: springt oder lädt es noch, wartet die Vorschau (höchstens 2 s), statt hinterherzuspringen
      const sp0 = !scrub && p.spur(t).find(x => !x.steh), q0 = sp0 && q[p.slots[sp0.s]], v0 = q0 && VIDS.get(q0.url + '#' + sp0.s);
      if (v0 && !v0.paused && !v0.seeking && v0.readyState >= 2 && Math.abs(v0.currentTime - sp0.t) < 3) { t = Math.max(0, t + (v0.currentTime - sp0.t) / rate); wartet = 0; }
      else if (v0 && t < p.D && (v0.seeking || v0.readyState < 2 || v0.paused)) {
        const ab = p.teile ? (p.teile.find(k => t >= k.S && t < k.S + k.d) || p.teile[0]).S : 0;   // nicht vor den Anfang dieses Clips zurück
        if (!wartet) wartet = jetzt; if (jetzt - wartet < 2000) t = Math.max(ab, Math.min(t, tAlt));
      }
      start = jetzt - t * 1000; tAlt = t;
      const bilder = [], aktiv = new Set();
      for (const sp of p.spur(t)) {
        const src = q[p.slots[sp.s]]; if (!src) continue;
        const v = vidFuer(src.url, sp.s); aktiv.add(v);
        if (v.playbackRate !== rate) v.playbackRate = rate;
        const drift = v.currentTime - sp.t;
        if (scrub || sp.steh) { if (!v.paused) v.pause(); if (Math.abs(drift) > 0.04 && !v.seeking) springen(v, sp.t); }   // Standbild: stehen lassen
        else if (v.paused) { if (Math.abs(drift) > 0.15 && !v.seeking) springen(v, sp.t); v.play().catch(() => {}); }
        else if (Math.abs(drift) > (v === v0 ? 3 : 0.5) && !v.seeking && jetzt - (v._sync || 0) > 1500) { v._sync = jetzt; springen(v, sp.t + (v === v0 ? 0 : (v._lat || 0.2) * rate)); }   // zweites Video: um die Sprungdauer vorweg
        v.muted = !VOR.ton || sp.steh || (p.mehr === 'vergleich' && sp.s !== 0);
        bilder[sp.s] = vidBild(v);
      }
      // Top 3: den nächsten Clip schon vor dem Wechsel an seinen Anfang legen
      if (p.teile && !scrub) { const n = p.teile.find(k => k.S > t && k.S - t < 1.5); if (n && q[n.q]) { const v = vidFuer(q[n.q].url, n.q); aktiv.add(v); if (!v.paused) v.pause(); if (Math.abs(v.currentTime - n.a) > 0.1 && !v.seeking) springen(v, n.a); } }
      for (const v of VIDS.values()) if (!aktiv.has(v) && !v.paused) v.pause();
      g.setTransform(cv.width / B, 0, 0, cv.height / H, 0, 0); g.clearRect(0, 0, B, H);
      const tt = kl(t, 0, p.T - 0.001); VOR.t = tt;
      zeichne(g, tt, cl, p, MAT, bilder);
      if (!erstes && tt < 0.25 && bilder.some(Boolean)) { erstes = leinwand(cv.width, cv.height); erstes.getContext('2d').drawImage(cv, 0, 0); }
      else loopUebergang(g, tt, p, erstes);
      requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }

  // ─── Aktionen ───
  function zeichnen() {
    if (!BOX) return;
    BOX.innerHTML = html();
    vorschauStarten();
    ablBilder();
    if (ABL.kar) ablKarVorschauBald();   // 📸 Vorschau der Karussell-Seiten
  }
  async function dateienRein(dateien) {
    let n = 0, mitCam = 0;
    // 📷 „Name Cam.mp4“ neben „Name.mp4“ (so legt die Toolbox sie ab): die Cam gehört zum Clip und wird kein eigener Clip
    const END = /\.(mp4|mov|m4v|webm|mkv)$/i, CAM = /\sCam\.(mp4|mov|m4v|webm|mkv)$/i, ohne = x => String(x || '').replace(END, ''), cams = new Map();
    for (const d of dateien) if (CAM.test(d.name || '')) { const k = d.name.replace(CAM, ''); if (dateien.some(x => x !== d && ohne(x.name) === k) || CLIPS.some(x => ohne(x.name) === k && !x.cam)) cams.set(k, d); }
    const camDateien = new Set(cams.values());
    for (const d of dateien) {
      if (!/^video\//.test(d.type || '') && !END.test(d.name || '')) continue;
      if (camDateien.has(d)) continue;
      const c = await neuerClip(d);
      if (c && cams.has(ohne(d.name))) { camSetzen(c, cams.get(ohne(d.name))); cams.delete(ohne(d.name)); mitCam++; }
      if (c && BEARBEITE) { bearbeiteAnwenden(c); CLIPS.unshift(c); n++; }
      else if (c) { CLIPS.push(c); n++; } else UMG.meldung(`„${d.name}“ kann der Browser nicht öffnen. Bitte als MP4 speichern.`, 1);
    }
    for (const [k, d] of cams) { const c = CLIPS.find(x => ohne(x.name) === k && !x.cam); if (c) { camSetzen(c, d); mitCam++; if (!n) { UMG.meldung('Cam ist beim Clip dabei.'); zeichnen(); } } }
    if (n) { UMG.meldung(n === 1 ? 'Clip geladen. Jetzt Vorlage antippen.' : `${n} Clips geladen.`); zeichnen(); }
  }
  async function senden(pfad, blob) { return UMG.senden(pfad, blob); }
  function clipWeg(c) {
    if (VOR.vid && VOR.url === c.url) { VOR.vid.pause(); VOR.vid.removeAttribute('src'); VOR.vid.load(); VOR.vid = null; VOR.url = ''; }
    vidsWeg(quellenVon(c).map(x => x.url));
    camWeg(c);
    for (const x of c.extra || []) if (x.url !== c.url) URL.revokeObjectURL(x.url);
    URL.revokeObjectURL(c.url);
    const i = CLIPS.indexOf(c); if (i >= 0) CLIPS.splice(i, 1);
  }
  async function hochladen(id, blob) {
    const v = Date.now(), TEIL = 1900000, teile = Math.ceil(blob.size / TEIL);
    if (teile > 39) throw new Error('Video ist zu lang/groß. Bitte kürzer schneiden.');
    for (let i = 0; i < teile; i++) { await senden(`/api/clip/${id}/videoteil/${i}?v=${v}`, blob.slice(i * TEIL, (i + 1) * TEIL, 'application/octet-stream')); arbeit(`⬆ Hochladen … ${Math.round((i + 1) / teile * 100)} %`); }
    await UMG.igApi('POST', `/api/clip/${id}/videofertig?v=${v}`, { teile, groesse: blob.size });
  }
  function arbeit(t) { ARBEIT = t; const el = BOX && BOX.querySelector('.kc-arbeit'); if (el) el.lastChild.textContent = t; else zeichnen(); }
  async function einplanen(nurLaden) {
    const c = CLIPS[0]; if (!c || ARBEIT) return;
    if (!nurLaden && !c.insta && !c.tiktok && !c.youtube) return UMG.meldung('Bitte Instagram, TikTok oder YouTube anhaken.', 1);
    const vp = vorlage(c), pf = vp.pflicht && vp.felder.find(x => x[0] === vp.pflicht);
    if (vp.mehr && quellenVon(c).length < platzZahl(vp)) return UMG.meldung(`Für „${vp.name}“ fehlt noch ein Clip (Schritt 3).`, 1);
    if (pf && !String(c[pf[0]] || '').trim()) return UMG.meldung(`Bitte „${pf[1]}“ eintragen.`, 1);
    let id = '';
    try {
      if (folgeAn(c)) { c.folge = folgeVon(c); c.folgeEigen = true; c.folgeAn = true; if (!c.textEigen) mitText(c); }   // 🔢 Nummer festhalten (Video, Text und Zähler gleich)
      arbeit('🎬 Video wird gebaut … 0 %');
      if (!MAT) await material();
      const blob = await bauen(c, MAT, x => arbeit(`🎬 Video wird gebaut … ${Math.round(x * 100)} %`));
      if (nurLaden) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kreids888-${c.vorlage}-${Date.now().toString(36)}.mp4`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        ARBEIT = ''; zeichnen(); return UMG.meldung('Video ist fertig und wird geladen.');
      }
      arbeit('⬆ Hochladen …');
      const r = await UMG.igApi('POST', '/api/clip/neu', { vorlage: c.vorlage, titel: GROSS(c.hook), text: postText(c), postMs: c.postMs || undefined, insta: c.insta, tiktok: c.tiktok, youtube: !!c.youtube, thumbMs: 1300, dauer: blob.dauer, nr: folgeAn(c) ? c.folge : undefined });
      id = r.id;
      await hochladen(id, blob);
      try { const vb = await vorschaubild(c, MAT); if (vb) await senden(`/api/clip/${id}/bild`, vb); } catch (e) { /* Vorschaubild ist nur schön */ }
      if (c.ersetzt) await altenErsetzen(c.ersetzt);   // ✏️ bearbeiteter Post: der alte kommt weg
      await clipMerken(id, c);                         // … und dieser lässt sich später wieder bearbeiten
      if (c.ablage) ablMerken(c.ablage);               // 📂 Szene aus dem Vorrat ist verwendet
      clipWeg(c);
      ARBEIT = '';
      UMG.meldung(`Eingeplant: ${zeit(r.postMs)} 🎉`);
      await UMG.laden();
    } catch (e) {
      ARBEIT = ''; zeichnen();
      if (id) { try { await UMG.igApi('POST', `/api/clip/${id}/weg`, {}); } catch (x) { /* egal */ } }
      UMG.meldung(e.message || String(e), 1);
    }
  }
  async function klick(ev) {
    const b = ev.target.closest('[data-c]'); if (!b || !BOX.contains(b)) return;
    const a = b.dataset.c, c = CLIPS[0], z = b.closest('[data-id]'), id = z && z.dataset.id;
    if (a === 'vorlage' && c) { vorlageSetzen(c, b.dataset.wert); zeichnen(); return; }
    if (a === 'stich-los' && c) { const f = BOX.querySelector('[data-c="stich"]'); stichAnwenden(c, f ? f.value : c.stichText); zeichnen(); return; }
    if (a === 'wuerfeln' && c) { c.hook = ziehen(vorlage(c).hooks, 'hook', c.hook); if (!c.textEigen) mitText(c); zeichnen(); return; }
    if (a === 'wuerfeln-unten' && c) { c.unten = ziehen(vorlage(c).unten, 'unten', c.unten); if (!c.textEigen) mitText(c); zeichnen(); return; }
    if (a === 'wuerfeln-wieder' && c) { c.wieder = ziehen(wiederListe(vorlage(c)), 'wieder', c.wieder); zeichnen(); return; }
    if (a === 'farbe' && c) { c.farbe = b.dataset.wert; zeichnen(); return; }
    if (a === 'modus' && c) { c.modus = b.dataset.wert; zeichnen(); return; }
    if (a === 'look' && c) { c.look = LETZTER_LOOK = b.dataset.wert; zeichnen(); return; }
    if (a === 'stil' && c) { c.stil = b.dataset.wert; zeichnen(); return; }
    if (a === 'stil-wuerfeln' && c) { c.stil = stilNeu(stilVon(c)); zeichnen(); return; }
    if (a === 'ton') { VOR.ton = !VOR.ton; if (VOR.vid) VOR.vid.muted = !VOR.ton; b.textContent = VOR.ton ? '🔊' : '🔇'; return; }
    if (a === 'fenster-auto' && c) {   // Fenster bekommt die Form vom Video, Video wieder ganz drin
      const v = vorlage(c), src = v.mehr === 'top3' ? quelleUnter(c, B / 2, 900).src : c, mm = videoMasse(src), maxH = c.look === 'tv' ? FENSTER_MAX.tv : FENSTER_MAX.neon, ar = mm.w / mm.h;
      let w = 1000, h = Math.round(1000 / ar); if (h > maxH) { h = maxH; w = Math.round(maxH * ar); }
      c.fenster = { w: kl(w, 360, 1040), h: kl(h, 280, maxH) }; for (const x of quellenVon(c)) x.bild = null;
      zeichnen(); return;
    }
    if (a === 'termin' && c) {
      c.postMs = +b.dataset.ms;
      const f = BOX.querySelector('[data-c="postms"]'); if (f) f.value = lokal(c.postMs);
      BOX.querySelectorAll('[data-c="termin"]').forEach(x => x.classList.toggle('an', x === b));
      return;
    }
    if (a === 'bild-reset' && c) { c.fenster = null; for (const x of quellenVon(c)) x.bild = null; zeichnen(); return; }
    if (a === 'cam-platz' && c) { c.camPlatz = b.dataset.wert; c.camBox = { ...camBox(c), x: 0, y: 0 }; if (c.camPlatz !== 'aus') { try { localStorage.setItem('k888_cam_platz', c.camPlatz); } catch (e) { /* egal */ } } zeichnen(); return; }
    if (a === 'cam-zug' && c) { c.camZug = b.dataset.wert; zeichnen(); return; }
    if (a === 'cam-reset' && c) { c.camBox = null; c.camTf = null; zeichnen(); return; }
    if (a === 'cam-weg' && c) { camWeg(c); zeichnen(); return; }
    if (a === 'vorschau' && c && vorlage(c).analyse && VOR.vid) {   // Replay-Analyse: Stelle für den Kreis antippen
      if (performance.now() - (VOR.gezogen || 0) < 400) return;   // war Ziehen, kein Tippen
      const r = b.getBoundingClientRect(), p = zeitplan(c), R = flaeche(c, p, p.h, VOR.vid);
      let x = (ev.clientX - r.left) * B / r.width, y = (ev.clientY - r.top) * H / r.height;
      if (x < R.kx || x > R.kx + R.kw || y < R.ky || y > R.ky + R.kh) return UMG.meldung('Bitte direkt ins Clip-Bild tippen.', 1);
      if (VOR.t != null && angehalten(vorlage(c), p, VOR.t)) {   // gerade herangezoomt → zurückrechnen
        const d = VOR.t - p.h, k = 1 + 0.4 * eo(fp(d, 0, 0.4)) * (1 - eo(fp(d, p.FD - 0.4, p.FD))), z = analyseZiel(c, VOR.vid, R);
        x = z.x + (x - z.x) / k; y = z.y + (y - z.y) / k;
      }
      const bi = bildRechteck(VOR.vid, R.x, R.y, R.w, R.h, R.zoom, R.versatz, R.tf);
      c.ziel = { u: kl((x - bi.x) / bi.w, 0.03, 0.97), v: kl((y - bi.y) / bi.h, 0.03, 0.97) };
      VOR.sprung = Math.max(p.a, p.F - 0.6);
      return;
    }
    if (a === 'einplanen') return einplanen(false);
    if (a === 'laden') return einplanen(true);
    if (a === 'weglegen' && c) { extraZurueck(c, 1); clipWeg(c); zeichnen(); return; }
    if (a === 'slot-tauschen' && c) { const q = quellenVon(c), i = +b.dataset.i; if (q[i] && q[i + 1]) for (const k of QFELDER) [q[i][k], q[i + 1][k]] = [q[i + 1][k], q[i][k]]; zeichnen(); return; }
    if (a === 'slot-raus' && c) { const i = +b.dataset.i, x = (c.extra || []).splice(i - 1, 1)[0]; if (x && x.url !== c.url && !quellenVon(c).some(y => y.url === x.url)) CLIPS.push(clipAusQuelle(x)); zeichnen(); return; }
    if (a === 'slot-gleich' && c) { (c.extra = c.extra || []).push({ datei: c.datei, url: c.url, name: c.name, dauer: c.dauer, start: c.start, ende: c.ende, titel: '' }); zeichnen(); return; }
    if (a === 'marke-neu' && c) {
      const p = zeitplan(c), t = VOR.stelle != null ? kl(VOR.stelle, p.a, p.b) : p.a;
      const vm = vorlage(c).mehr, vor = (c.marken || []).filter(x => x.t <= t).sort((x, y) => x.t - y.t).pop();   // Verkehr: Klasse vom Auto davor übernehmen
      (c.marken = c.marken || []).push({ id: Math.random().toString(36).slice(2, 8), t, text: vm === 'verkehr' && vor ? vor.text || '' : '', ...(vm === 'sektoren' ? { farbe: 'lila' } : {}) });
      zeichnen();
      const felder = BOX.querySelectorAll('[data-c="marke-text"]'), mk = c.marken[c.marken.length - 1], f = [...felder].find(x => x.dataset.k === mk.id); if (f) f.focus();
      return;
    }
    if (a === 'marke-weg' && c) { c.marken = (c.marken || []).filter(x => x.id !== b.dataset.k); zeichnen(); return; }
    if (a === 'luecke-bauen') { lueckeBauen(b.dataset.tag); return; }
    if (a === 'abl-verbinden') { ablVerbinden(false); return; }
    if (a === 'abl-wechseln') { ablVerbinden(true); return; }
    if (a === 'abl-neu') { try { await ablLesen(); UMG.meldung(`Im Ordner: ${ablZahl()}.`); } catch (e) { ABL.stand = 'fragen'; } zeichnen(); return; }
    if (a === 'abl-foto') {   // 📸 Foto für ein Karussell an- oder abhaken (die Zahl ist die Reihenfolge)
      const n = b.dataset.name, i = ABL.fotoWahl.indexOf(n);
      if (i >= 0) ABL.fotoWahl.splice(i, 1); else if (ABL.fotoWahl.length >= KAR_MAX) return UMG.meldung(`Mehr als ${KAR_MAX} Bilder gehen nicht in ein Karussell.`, 1); else ABL.fotoWahl.push(n);
      if (ABL.fotoWahl.length) ablKarStart(); else ABL.kar = null;
      if (ABL.kar) karAutoTexte(ABL.kar);   // neues Bild bekommt seinen Spruch, das erste Bild die Strecke
      if (ABL.kar && !ABL.kar.textEigen) ABL.kar.text = karTextBau(ABL.kar);   // Zahl der Bilder oder Ort geändert: automatischer Text zieht mit
      zeichnen(); return;
    }
    if (a === 'abl-foto-leer') { ABL.fotoWahl = []; ABL.kar = null; zeichnen(); return; }
    if (a === 'abl-kar-text') { if (ABL.kar) { karTextNeu(ABL.kar); karTextZeigen(); } return; }   // 🎲 neuer Text auf Knopfdruck
    if (a === 'abl-kar-modus' || a === 'abl-kar-wuerfeln') {   // 🎲 Texte auf den Bildern: Modus wechseln bzw. alle neu würfeln · danach gilt wieder „automatisch“ für jede Seite
      const K = ABL.kar; if (!K) return;
      if (a === 'abl-kar-modus') K.textModus = b.dataset.wert;
      Object.values(K.seiten || {}).forEach(x => { x.auto = true; x.ohneTitel = false; });
      karAutoTexte(K, true); zeichnen(); return;
    }
    if (a === 'abl-kar-neu') {   // 🎲 anderer Spruch nur für dieses Bild
      const K = ABL.kar; if (!K) return; const n = b.dataset.name, x = karFoto(n);
      x.auto = true; if (ABL.fotoWahl[0] === n) x.ohneTitel = true; if (x.look !== 'neon') x.look = 'neon';
      if ((K.textModus || 'auto') !== 'auto') { x.gross = karSpruchZieh(n, new Set(Object.values(K.seiten).map(y => GROSS(y.gross || '')))); x.auto = false; x.titel = false; } else karAutoTexte(K, false, n);
      karFelderZeigen(); const fl = [...BOX.querySelectorAll('[data-abk="s:look"]')].find(e => e.dataset.name === n); if (fl) fl.value = x.look; return;
    }
    if (a === 'abl-kar-farbe') {   // 🎨 Farbe für das ganze Karussell (leer = automatisch), wird gemerkt
      const K = ABL.kar; if (!K) return;
      K.farbe = FARBEN.includes(b.dataset.wert) ? b.dataset.wert : '';
      try { localStorage.setItem(KAR_FARBE_KEY, K.farbe); } catch (e) { /* egal */ }
      zeichnen(); return;
    }
    if (a === 'abl-kar-stil') {   // 🎨 Aussehen der Texte wie bei den Clips (für das ganze Karussell, wird gemerkt)
      const K = ABL.kar; if (!K) return;
      K.stil = b.dataset.wert === '?' ? stilNeu(K.stil) : b.dataset.wert; if (!STIL_IDS.includes(K.stil)) K.stil = 'neon';
      try { localStorage.setItem(KAR_STIL_KEY, K.stil); } catch (e) { /* egal */ }
      zeichnen(); return;
    }
    if (a === 'team-wahl' || a === 'team-reset') {   // 🏁 Team-Logo wählen („Ohne“ = keins) · ↺ zurück an den Standardplatz
      const feld = b.closest('[data-team]'), ort = feld && feld.dataset.team, o = TEAM_ORT[ort], h = o && o.halter(); if (!h) return;
      const art = o.art(), alt = teamOk(h.team), d = a === 'team-reset' ? (alt || {}).d : b.dataset.wert;
      h.team = d ? teamOk({ ...(a === 'team-reset' ? TEAM_PLATZ[art] : alt || teamPlatz(art)), d }) : null;
      teamMerken(art, h.team);
      if (d && !(await teamBild(d))) UMG.meldung('Das Team-Logo lässt sich gerade nicht laden. Bitte noch einmal anklicken.', 1);
      zeichnen(); return;
    }
    if (a === 'abl-kar-spruch') {   // Spruch anklicken = großer Text dieses Fotos (nochmal anklicken = wieder weg)
      const n = b.dataset.name, s = karFoto(n), w = b.dataset.wert, feld = x => [...BOX.querySelectorAll(`[data-abk="${x}"]`)].find(e => e.dataset.name === n);
      s.gross = GROSS(String(s.gross || '').trim()) === w ? '' : w; if (s.gross && s.look !== 'neon') s.look = 'neon';
      s.auto = false; s.titel = false;   // selbst gewählt: bleibt so
      const fg = feld('s:gross'), fl = feld('s:look'); if (fg) fg.value = s.gross; if (fl) fl.value = s.look;
      karSpruchAn(n); ablKarVorschauBald(n); return;
    }
    if (a === 'abl-kar-hoch' || a === 'abl-kar-runter') {   // Reihenfolge der Fotos ändern
      const i = ABL.fotoWahl.indexOf(b.dataset.name), j = a === 'abl-kar-hoch' ? i - 1 : i + 1;
      if (i >= 0 && j >= 0 && j < ABL.fotoWahl.length) { [ABL.fotoWahl[i], ABL.fotoWahl[j]] = [ABL.fotoWahl[j], ABL.fotoWahl[i]]; if (ABL.kar) karAutoTexte(ABL.kar); if (ABL.kar && !ABL.kar.textEigen) ABL.kar.text = karTextBau(ABL.kar); zeichnen(); }
      return;
    }
    if (a === 'abl-kar') { ablKarBauen(); return; }
    if (a === 'abl-auf') { ablOeffnen(b.dataset.name, 0); return; }
    if (a === 'luecke-bearb') { autoEdAuf('', b.dataset.tag); return; }
    if (a === 'auto-bearb' && id) { autoEdAuf(id); return; }
    if (a === 'ae-art' && AUTO_ED) { AUTO_ED.art = b.dataset.wert; zeichnen(); return; }
    if (a === 'ae-farbe' && AUTO_ED) { AUTO_ED.fi = Number(b.dataset.wert) || 0; zeichnen(); return; }
    if (a === 'ae-speichern') { autoEdSpeichern(); return; }
    if (a === 'ae-musik' && AUTO_ED) { AUTO_ED.ton.musik = b.dataset.wert; autoEdStill(); zeichnen(); return; }
    if (a === 'ae-hoeren') { autoEdHoeren(); return; }
    if (a === 'ae-ab') { autoEdStill(); AUTO_ED = null; cancelAnimationFrame(AE_LAUF); zeichnen(); return; }
    if (a === 'ae-neu') return;   // Haken im Editor: regelt „aenderung“
    if (a === 'luecke-nein') { const e = lueckenPlan(stand(), Date.now()).find(y => y.tag === b.dataset.tag); if (e && e.vorschlag) { try { localStorage.setItem(NEIN_KEY, JSON.stringify([...neinListe().slice(-40), e.vorschlag.q])); } catch (err) { /* egal */ } } zeichnen(); return; }
    if (a === 'cfg-speichern') {
      try { await UMG.igApi('POST', '/api/clips/einstellungen', { zeit: BOX.querySelector('[data-c="cfg-zeit"]').value, test: BOX.querySelector('[data-c="cfg-test"]').checked, trailer: BOX.querySelector('[data-c="cfg-trailer"]').checked, luecken: BOX.querySelector('[data-c="cfg-luecken"]').checked, freigabe: BOX.querySelector('[data-c="cfg-freigabe"]').checked }); UMG.meldung('Gespeichert.'); await UMG.laden(); } catch (e) { UMG.meldung(e.message, 1); }
      return;
    }
    if (a === 'bearbeiten-ab') { BEARBEITE = null; zeichnen(); return; }
    if (a === 'ce-speichern') { clipEdSpeichern(); return; }
    if (a === 'ce-ab') { CLIP_ED = null; BEARBEITE = null; zeichnen(); return; }
    if (!id) return;
    try {
      if (a === 'bearbeiten') { await bearbeiten(id); return; }
      if (a === 'auto-frei' || a === 'auto-zurueck' || a === 'auto-aus' || a === 'auto-an') {   // 🤖 Automatik: freigeben · zurücknehmen · nicht posten · doch posten
        await UMG.igApi('POST', `/api/clip/${id}/aendern`, a === 'auto-frei' ? { frei: true, aus: false } : a === 'auto-zurueck' ? { frei: false } : a === 'auto-aus' ? { aus: true, frei: false } : { aus: false });
        UMG.meldung(a === 'auto-frei' ? 'Freigegeben. Geht zur geplanten Zeit raus.' : a === 'auto-aus' ? 'Wird nicht gepostet.' : 'Gespeichert.'); await UMG.laden(); return;
      }
      if (a === 'jetzt') {
        if (!confirm('Diesen Clip jetzt sofort posten?')) return;
        b.disabled = true; b.textContent = '⏳ …';
        const r = await UMG.igApi('POST', `/api/clip/${id}/jetzt`, {});
        UMG.meldung([r.gepostet ? 'Instagram ✓' : '', r.tiktok ? 'TikTok-Entwurf ✓' : '', r.youtube ? 'YouTube ✓' : '', r.ttFehler ? 'TikTok ging nicht: ' + r.ttFehler : '', r.ytFehler ? 'YouTube ging nicht: ' + r.ytFehler : ''].filter(Boolean).join(' · ') || 'Gesendet.', (!!r.ttFehler || !!r.ytFehler) && !r.gepostet);
        await UMG.laden();
      }
      if (a === 'tiktok') {   // schon gepostet → nachträglich als Entwurf an TikTok
        b.disabled = true; b.textContent = '⏳ …';
        await UMG.igApi('POST', `/api/clip/${id}/tiktok`, {});
        UMG.meldung('TikTok-Entwurf ✓ Schau in deine TikTok-Inbox, dort Musik drauf und posten.');
        await UMG.laden();
      }
      if (a === 'zeit') { const v = z.querySelector('[data-c="zeitwert"]').value; await UMG.igApi('POST', `/api/clip/${id}/aendern`, { postMs: new Date(v).getTime() }); UMG.meldung('Zeit gespeichert.'); await UMG.laden(); }
      if (a === 'loeschen') { if (!confirm('Diesen Clip löschen? Er wird dann nicht gepostet.')) return; await UMG.igApi('POST', `/api/clip/${id}/weg`, {}); UMG.meldung('Gelöscht.'); await UMG.laden(); }
    } catch (e) { UMG.meldung(e.message, 1); await UMG.laden(); }
  }
  // Schritt 3 beim Tippen nachziehen, ohne neu zu zeichnen (sonst geht der nächste Klick verloren): Plätze bei der Aufholjagd, letzter Sektor
  function schritt3Auffrischen(c) {
    const v = vorlage(c); if (!MARKEN[v.mehr]) return;
    const p = zeitplan(c);
    if (v.mehr === 'aufholjagd') { const st = startPlatz(c); BOX.querySelectorAll('.kc-marken .kc-marke b').forEach((b, i) => { b.textContent = 'P' + Math.max(1, st - i - 1); }); }
    if (p.sektoren) { const el = BOX.querySelector('.kc-marke .kc-fuell'); if (el) el.textContent = zeitText(p.sektoren[p.sektoren.length - 1].zeit); }
  }
  function teamEingabe(ev) {   // 🏁 Regler am Team-Logo: Größe, links/rechts, oben/unten → true = erledigt
    const t = ev.target; if (!t || !t.dataset || !/^team-[sxy]$/.test(t.dataset.c || '') || !BOX.contains(t)) return false;
    const feld = t.closest('[data-team]'), k = t.dataset.c.slice(5); if (feld) teamSetzen(feld.dataset.team, x => ({ ...x, [k]: +t.value }), true);
    return true;
  }
  function eingabe(ev) {
    if (teamEingabe(ev)) return;
    if (ev.target && ev.target.dataset && ev.target.dataset.abk && BOX.contains(ev.target)) { if (ev.target.type !== 'checkbox') ablKarEingabe(ev.target); return; }   // 📸 Karussell aus Fotos
    if (ev.target && ev.target.dataset && ev.target.dataset.ce && BOX.contains(ev.target)) { clipEdEingabe(ev.target); return; }   // ✏️ Schnell-Editor für geplante Clips
    if (ev.target && ev.target.dataset && ev.target.dataset.ae && BOX.contains(ev.target)) { autoEdEingabe(ev.target); return; }   // ✏️ Editor für Automatisches
    const t = ev.target, c = CLIPS[0]; if (!c || !t.dataset || !BOX.contains(t)) return;
    const a = t.dataset.c;
    const textMit = () => { if (c.textEigen) return; mitText(c); const ta = BOX.querySelector('[data-c="text"]'); if (ta) ta.value = c.text; };
    if (a === 'stich') { c.stichText = t.value; }
    else if (a === 'hook') { c.hook = t.value; textMit(); }
    else if (a === 'unten') { c.unten = t.value; textMit(); }
    else if (a === 'wieder') c.wieder = t.value;
    else if (a === 'feld') {
      c[t.dataset.feld] = t.value;
      textMit();
      schritt3Auffrischen(c);
    }
    else if (a === 'text') { c.text = t.value; c.textEigen = true; }
    else if (a === 'slot-titel') { const src = quellenVon(c)[+t.dataset.i]; if (src) src.titel = t.value; }
    else if (a === 'slot-a' || a === 'slot-b') {
      const i = +t.dataset.i, src = quellenVon(c)[i]; if (!src) return;
      const v = +t.value;
      if (a === 'slot-a') src.start = Math.min(v, (src.ende || src.dauer) - 1); else src.ende = Math.max(v, (src.start || 0) + 1);
      const x = abschnitt(src), aw = BOX.querySelector(`[data-c="slot-a-wert"][data-i="${i}"]`), bw = BOX.querySelector(`[data-c="slot-b-wert"][data-i="${i}"]`);
      if (aw) aw.textContent = sek(x.a); if (bw) bw.textContent = sek(x.b);
    }
    else if (a === 'stelle') {
      VOR.stelle = +t.value; VOR.scrub = { t: VOR.stelle, bis: performance.now() + 2500 };
      const p = zeitplan(c), w = BOX.querySelector('[data-c="stelle-wert"]'); if (w) w.textContent = sek(Math.max(0, VOR.stelle - p.a));
    }
    else if (a === 'marke-text') { const mk = (c.marken || []).find(x => x.id === t.dataset.k); if (mk) mk.text = t.value; schritt3Auffrischen(c); }
    else if (a === 'cam-s') { c.camBox = { ...camBox(c), s: +t.value }; const w = BOX.querySelector('[data-c="cam-s-wert"]'); if (w) w.textContent = Math.round(+t.value * 100) + ' %'; }
    else if (a === 'cam-z') { c.camTf = { ...camBild(c), z: +t.value }; const w = BOX.querySelector('[data-c="cam-z-wert"]'); if (w) w.textContent = Math.round(+t.value * 100) + ' %'; }
    else if (a === 'bild-z') { c.bild = { ...tfVon(c), z: +t.value }; const w = BOX.querySelector('[data-c="bild-z-wert"]'); if (w) w.textContent = Math.round(+t.value * 100) + ' %'; }
    else if (a === 'slot-z') { const src = quellenVon(c)[+t.dataset.i]; if (src) { src.bild = { ...tfVon(src), z: +t.value }; const w = BOX.querySelector(`[data-c="slot-z-wert"][data-i="${t.dataset.i}"]`); if (w) w.textContent = Math.round(+t.value * 100) + ' %'; } }
    else if (a === 'fenster-w' || a === 'fenster-h') { const L = lage(c, c.look === 'tv'); c.fenster = { w: L.fw, h: L.fh, [a === 'fenster-w' ? 'w' : 'h']: +t.value }; const w = BOX.querySelector(`[data-c="${a}-wert"]`); if (w) w.textContent = t.value; }
    else if (a === 'linie') { c.linie = +t.value; const p = zeitplan(c), w = BOX.querySelector('[data-c="linie-wert"]'); if (w) w.textContent = sek(p.lin); VOR.sprung = Math.max(p.a, p.lin - 1.5); }
    else if (a === 'halt') {
      c.halt = +t.value; const p = zeitplan(c), hw = BOX.querySelector('[data-c="halt-wert"]'); if (hw) hw.textContent = sek(p.F);
      VOR.sprung = Math.max(p.a, p.F - 1.5);
    }
    else if (a === 'start' || a === 'ende') {
      const v = +t.value;
      if (a === 'start') c.start = Math.min(v, (c.ende || c.dauer) - 1); else c.ende = Math.max(v, (c.start || 0) + 1);
      const p = zeitplan(c), sw = BOX.querySelector('[data-c="start-wert"]'), ew = BOX.querySelector('[data-c="ende-wert"]');
      if (sw) sw.textContent = sek(p.a); if (ew) ew.textContent = sek(p.b);
      if (VOR.vid) { VOR.vid.currentTime = a === 'start' ? p.a : Math.max(p.a, p.b - 1.5); }
    }
  }
  function aenderung(ev) {
    if (teamEingabe(ev)) return;
    if (ev.target && ev.target.dataset && ev.target.dataset.abk && BOX.contains(ev.target)) { ablKarEingabe(ev.target); return; }
    if (ev.target && ev.target.dataset && ev.target.dataset.ce && BOX.contains(ev.target)) { clipEdEingabe(ev.target); return; }
    if (ev.target && ev.target.dataset && ev.target.dataset.ae && BOX.contains(ev.target)) { autoEdEingabe(ev.target); if (ev.target.dataset.ae === 'hgAn') { if (AUTO_ED && !AUTO_ED.hgAn && AUTO_ED.art === 'plakat') AUTO_ED.art = 'heute'; zeichnen(); } return; }
    const t = ev.target, c = CLIPS[0]; if (!t.dataset || !BOX.contains(t)) return;
    const a = t.dataset.c;
    if (a === 'datei' && t.files && t.files.length) { dateienRein([...t.files]); t.value = ''; return; }
    if (/^cfg-(trailer|luecken|freigabe)$/.test(a)) {   // 🤖 Automatik-Schalter: sofort speichern
      const an = k => BOX.querySelector(`[data-c="cfg-${k}"]`).checked;
      UMG.igApi('POST', '/api/clips/einstellungen', { trailer: an('trailer'), luecken: an('luecken'), freigabe: an('freigabe') }).then(() => { UMG.meldung('Gespeichert.'); return UMG.laden(); }).catch(e => UMG.meldung(e.message || String(e), 1));
      return;
    }
    if (!c) return;
    if (a === 'slot-wahl') { const k = +t.value; if (k >= 1 && CLIPS[k]) { (c.extra = c.extra || []).push(quelleAusClip(CLIPS.splice(k, 1)[0])); zeichnen(); } return; }
    if (a === 'slot-datei' && t.files && t.files[0]) {
      neuerClip(t.files[0]).then(x => { if (!x) return UMG.meldung('Dieses Video kann der Browser nicht öffnen. Bitte als MP4 speichern.', 1); (c.extra = c.extra || []).push(quelleAusClip(x)); zeichnen(); });
      return;
    }
    if (a === 'slot-a' || a === 'slot-b') { zeichnen(); return; }
    if (a === 'cam-datei' && t.files && t.files[0]) { camSetzen(c, t.files[0]); zeichnen(); return; }
    if (a === 'cam-s') { zeichnen(); return; }   // Fenster-Höhe kann sich mit der Cam-Größe ändern
    if (a === 'marke-farbe') { const mk = (c.marken || []).find(x => x.id === t.dataset.k); if (mk) mk.farbe = t.value; return; }
    if (a === 'sektor-letzt') { c.sektorLetzt = t.value; return; }
    if (a === 'stich') { stichAnwenden(c, t.value); zeichnen(); return; }
    if (a === 'zeitlupe') { c.zeitlupe = t.checked; zeichnen(); }
    else if (a === 'insta' || a === 'tiktok' || a === 'youtube') c[a] = t.checked;
    else if (a === 'folge-an') { c.folgeAn = t.checked; try { localStorage.setItem('k888_reihe', t.checked ? '1' : '0'); } catch (e) { /* egal */ } if (!c.textEigen) mitText(c); zeichnen(); }
    else if (a === 'folge') { c.folge = Math.max(1, nr(t.value) || 1); c.folgeEigen = true; if (!c.textEigen) mitText(c); zeichnen(); }
    else if (a === 'postms') { c.postMs = t.value ? new Date(t.value).getTime() : 0; BOX.querySelectorAll('[data-c="termin"]').forEach(x => x.classList.toggle('an', +x.dataset.ms === c.postMs)); }
    else if (a === 'start' || a === 'ende' || a === 'halt' || a === 'linie') zeichnen();
  }
  // ─── Video im Fenster mit Maus/Finger verschieben, Mausrad = Größe ───
  let ZUG = null;
  function vorschauPunkt(cv, ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * B / r.width, y: (ev.clientY - r.top) * H / r.height, s: B / r.width }; }
  function quelleUnter(c, x, y) {   // welcher Clip liegt unter dem Finger, und wie groß ist sein Fenster
    const v = vorlage(c), q = quellenVon(c);
    if (v.mehr === 'vergleich') return y < 895 ? { src: q[0], w: 960, h: 540 } : { src: q[1] || q[0], w: 960, h: 540 };
    if (v.mehr === 'erwartung') return y < 908 ? { src: q[0], w: 900, h: 506 } : { src: q[1] || q[0], w: 900, h: 506 };
    if (v.mehr === 'top3') { const p = zeitplan(c), t = VOR.t || 0, k = p.teile.find(x2 => t >= x2.S && t < x2.S + x2.d) || p.teile[0], L = lage(c); return { src: q[k.q] || c, w: L.fw, h: L.fh }; }
    if (!v.mehr && c.modus === 'zoom' && c.look !== 'tv') return { src: c, w: B + 80, h: H + 80 };
    const L = lage(c, c.look === 'tv'); return { src: c, w: L.fw, h: L.fh };
  }
  function ziehenStart(ev) {
    const tz = teamZug(ev); if (tz) { ZUG = tz; try { tz.cv.setPointerCapture(ev.pointerId); } catch (e) { /* egal */ } return; }   // 🏁 Team-Logo anfassen
    const cv = ev.target.closest && ev.target.closest('canvas[data-c="vorschau"]'), c = CLIPS[0]; if (!cv || !c || ev.button > 0) return;
    const pt = vorschauPunkt(cv, ev), u = quelleUnter(c, pt.x, pt.y), kr = camRahmen(c);
    if (kr && pt.x >= kr.x && pt.x <= kr.x + kr.w && pt.y >= kr.y && pt.y <= kr.y + kr.h) {   // 📷 auf der Cam: Rahmen (Ecke, Rund) oder Ausschnitt verschieben
      const pl = camPlatz(c), G = camGeo(c);
      ZUG = { cv, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, s: pt.s, cam: (pl === 'ecke' || pl === 'rund') && c.camZug !== 'bild' ? 'rahmen' : 'bild', G, kr, box0: camBox(c), tf0: camBild(c), bewegt: false };
    } else
    ZUG = { cv, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, s: pt.s, u, tf0: { ...tfVon(u.src) }, bewegt: false };
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* egal */ }
  }
  function ziehenBewegen(ev) {
    if (!ZUG || ev.pointerId !== ZUG.id) return;
    const dx = (ev.clientX - ZUG.x0) * ZUG.s, dy = (ev.clientY - ZUG.y0) * ZUG.s;
    if (ZUG.team) {   // 🏁 Team-Logo verschieben (Mitte bleibt im Bild)
      const tx = (ev.clientX - ZUG.x0) * ZUG.sx, ty = (ev.clientY - ZUG.y0) * ZUG.sy;
      if (!ZUG.bewegt && Math.hypot(ev.clientX - ZUG.x0, ev.clientY - ZUG.y0) < 3) return;
      ZUG.bewegt = true; ZUG.cv.classList.add('zieht');
      teamSetzen(ZUG.team, () => ({ ...ZUG.t0, x: kl(ZUG.t0.x + tx / ZUG.W, 0, 1), y: kl(ZUG.t0.y + ty / ZUG.Hh, 0, 1) }), false, ZUG.name);
      return;
    }
    if (!ZUG.bewegt && Math.hypot(dx, dy) < 14) return;
    ZUG.bewegt = true; ZUG.cv.classList.add('zieht');
    if (ZUG.cam) {
      const c = CLIPS[0]; if (!c) return;
      if (ZUG.cam === 'rahmen') c.camBox = { ...ZUG.box0, x: kl(ZUG.box0.x + dx / ZUG.G.fw, -1.5, 1.5), y: kl(ZUG.box0.y + dy / ZUG.G.fh, -1.5, 1.5) };
      else c.camTf = { ...ZUG.tf0, x: kl(ZUG.tf0.x + dx / ZUG.kr.w, -2, 2), y: kl(ZUG.tf0.y + dy / ZUG.kr.h, -2, 2) };
      return;
    }
    ZUG.u.src.bild = { ...ZUG.tf0, x: kl(ZUG.tf0.x + dx / ZUG.u.w, -2, 2), y: kl(ZUG.tf0.y + dy / ZUG.u.h, -2, 2) };
  }
  function ziehenEnde(ev) {
    if (!ZUG || ev.pointerId !== ZUG.id) return;
    if (ZUG.team && ZUG.bewegt) teamSetzen(ZUG.team, x => x, true);   // 🏁 neuen Platz merken, alle Seiten nachziehen
    if (ZUG.bewegt) VOR.gezogen = performance.now();
    if (ZUG.bewegt && ZUG.cam === 'rahmen' && CLIPS[0]) {   // über den Rand gezogen: Lage auf das zurückstellen, was man sieht
      const c = CLIPS[0], G = camGeo(c), r = camRahmen(c, G);
      if (r && r.x0 != null) c.camBox = { ...camBox(c), x: (r.x - r.x0) / G.fw, y: (r.y - r.y0) / G.fh };
    }
    ZUG.cv.classList.remove('zieht'); ZUG = null;
  }
  function radZoom(ev) {
    const cv = ev.target.closest && ev.target.closest('canvas[data-c="vorschau"]'), c = CLIPS[0]; if (!cv || !c) return;
    ev.preventDefault();
    const tr = c.team && teamRechteck(c.team, B, H), pw = vorschauPunkt(cv, ev);
    if (tr && pw.x >= tr.x - 14 && pw.x <= tr.x + tr.w + 14 && pw.y >= tr.y - 14 && pw.y <= tr.y + tr.h + 14) { teamSetzen('clip', x => ({ ...x, s: x.s * Math.exp(-ev.deltaY * 0.0012) }), true); return; }   // 🏁 Mausrad auf dem Team-Logo: größer/kleiner
    const kr = camRahmen(c), pk = vorschauPunkt(cv, ev);
    if (kr && pk.x >= kr.x && pk.x <= kr.x + kr.w && pk.y >= kr.y && pk.y <= kr.y + kr.h) {   // 📷 Mausrad auf der Cam: Ausschnitt größer/kleiner
      const z = kl(Math.max(1, camBild(c).z) * Math.exp(-ev.deltaY * 0.0012), 1, 3); c.camTf = { ...camBild(c), z };
      const el = BOX.querySelector('[data-c="cam-z"]'), w = BOX.querySelector('[data-c="cam-z-wert"]'); if (el) el.value = z; if (w) w.textContent = Math.round(z * 100) + ' %';
      return;
    }
    const pt = vorschauPunkt(cv, ev), u = quelleUnter(c, pt.x, pt.y), tf = { ...tfVon(u.src) };
    tf.z = kl((tf.z || 1) * Math.exp(-ev.deltaY * 0.0012), 0.5, 3); u.src.bild = tf;
    const z = tfVon(c).z || 1, el = BOX.querySelector('[data-c="bild-z"]'), w = BOX.querySelector('[data-c="bild-z-wert"]');   // Regler nachziehen
    if (el) el.value = z; if (w) w.textContent = Math.round(z * 100) + ' %';
    quellenVon(c).forEach((src, i) => { const s2 = BOX.querySelector(`[data-c="slot-z"][data-i="${i}"]`), w2 = BOX.querySelector(`[data-c="slot-z-wert"][data-i="${i}"]`), z2 = tfVon(src).z || 1; if (s2) s2.value = z2; if (w2) w2.textContent = Math.round(z2 * 100) + ' %'; });
  }
  window.K888Clips = {
    oeffnen(id) { OEFFNE = String(id || ''); },   // der Wochenplan ruft das vor dem Wechsel in den Reiter „🎬 Clips“
    vorlageInfo: (id, c) => (c && autoV(c)) || trailerV(id) || karV(id) || VORLAGEN.find(y => y.id === id) || null,
    VORLAGEN, STILE, bauen, zeitplan, zeichne, material, schriften, vorschaubild, stichwoerter, trailerZeichnen, trailerBauen, trailerPruefen, trailerTon, trailerWahl, TR_ARTEN, TR_FARBEN, top5Seiten, top5Liste, automatikHtml, karSeite, lueckenPlan, lueckeBauen, autoEdAuf, ablage: ABL, fotoSeite, camStill, camRahmen, camPlatz, lage, CAM_PLAETZE, _clips: CLIPS, _zoomTf: zoomTf, _bildRechteck: bildRechteck,
    async start(box, umg) {
      UMG = umg;
      if (BOX !== box) {
        BOX = box;
        box.addEventListener('click', klick);
        box.addEventListener('input', eingabe);
        box.addEventListener('change', aenderung);
        box.addEventListener('pointerdown', ziehenStart);
        box.addEventListener('pointermove', ziehenBewegen);
        box.addEventListener('pointerup', ziehenEnde);
        box.addEventListener('pointercancel', ziehenEnde);
        box.addEventListener('wheel', radZoom, { passive: false });
        box.addEventListener('toggle', e => { const k = e.target.classList && [...e.target.classList].find(x => x in OFFEN); if (k) OFFEN[k] = e.target.open; }, true);
        box.addEventListener('dragover', e => { e.preventDefault(); const d = box.querySelector('.kc-drop'); if (d) d.classList.add('drueber'); });
        box.addEventListener('dragleave', e => { const d = box.querySelector('.kc-drop'); if (d && !box.contains(e.relatedTarget)) d.classList.remove('drueber'); });
        box.addEventListener('drop', e => { e.preventDefault(); const d = box.querySelector('.kc-drop'); if (d) d.classList.remove('drueber'); if (e.dataTransfer && e.dataTransfer.files.length) dateienRein([...e.dataTransfer.files]); });
      }
      MAT = null;
      schriften();
      zeichnen();
      if (OEFFNE) setTimeout(oeffneJetzt, 60);   // aus dem Wochenplan angeklickt
      ablStart();                                // 📂 Vorrat aus der Toolbox lesen (wenn der Ordner schon verbunden ist)
      setTimeout(async () => { await trailerPruefen(); await merkAufraeumen(); }, 1500);   // 🔴 Stream-Trailer und 🖼 Karussells von selbst bauen
    }
  };

  const css = document.createElement('style');
  css.textContent = `
.kc-app{display:flex;flex-direction:column;gap:14px;max-width:1100px}
.kc-app .kc-dim{color:var(--steel,#8b929c);font-size:13px}
.kc-app .kc-tipp{color:var(--steel,#8b929c);font-size:12.5px;line-height:1.4;margin-top:4px}
.kc-app .kc-so{background:#0d0e13;border:1px solid var(--line,#23262f);border-left:3px solid #ff2d6f;padding:10px 14px;font-size:14px}
.kc-app .kc-so summary{cursor:pointer;font-weight:700;color:#fff}
.kc-app .kc-so ol{margin:8px 0;padding-left:20px;display:flex;flex-direction:column;gap:5px}
.kc-app .kc-drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:150px;border:2px dashed #ff2d6f;background:radial-gradient(ellipse at center,rgba(255,45,111,.12),rgba(0,0,0,0) 70%),#0b0c10;cursor:pointer;text-align:center;padding:16px;transition:.15s}
.kc-app .kc-drop.klein{min-height:64px;flex-direction:row;gap:12px;border-color:var(--line,#23262f)}
.kc-app .kc-drop.drueber,.kc-app .kc-drop:hover{border-color:#5cff1f;box-shadow:0 0 30px rgba(92,255,31,.25) inset}
.kc-app .kc-drop input{position:absolute;inset:0;opacity:0;cursor:pointer}
.kc-app .kc-drop-gross{font-family:var(--disp,inherit);font-weight:800;font-size:22px;letter-spacing:.04em;text-transform:uppercase;color:#fff;text-shadow:0 0 18px rgba(255,45,111,.7)}
.kc-app .kc-drop.klein .kc-drop-gross{font-size:16px}
.kc-app .kc-arbeit{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid rgba(92,255,31,.5);background:rgba(92,255,31,.07);color:#cfffbf;font-weight:600}
.kc-app .kc-spin{width:16px;height:16px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#5cff1f;animation:kcdreh .8s linear infinite;flex:none}
@keyframes kcdreh{to{transform:rotate(360deg)}}
.kc-app .kc-editor{display:flex;flex-wrap:wrap;gap:20px;background:#0d0e13;border:1px solid var(--line,#23262f);padding:16px}
.kc-app .kc-links{flex:0 0 300px;display:flex;flex-direction:column;gap:6px;max-width:100%}
.kc-app .kc-buehne{position:relative;width:300px;max-width:100%;aspect-ratio:9/16;background:#000;border:1px solid var(--line,#23262f);box-shadow:0 0 40px rgba(255,45,111,.18)}
.kc-app .kc-vorschau{width:100%;height:100%;display:block}
.kc-app .kc-ton{position:absolute;right:8px;bottom:8px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.6);color:#fff;font-size:18px;cursor:pointer}
.kc-app .kc-mitte{text-align:center}
.kc-app .kc-rechts{flex:1 1 380px;min-width:0;display:flex;flex-direction:column;gap:10px}
.kc-app .kc-schritt{font-family:var(--disp,inherit);font-weight:800;text-transform:uppercase;letter-spacing:.1em;font-size:13px;color:#fff;border-bottom:1px solid var(--line,#23262f);padding-bottom:4px;margin-top:6px}
.kc-app .kc-vorlagen{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.kc-app .kc-vl{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#14161d;border:2px solid #23262f;color:#fff;font:700 14px var(--body,inherit);cursor:pointer;text-align:left;transition:.12s}
.kc-app .kc-vl span{font-size:20px}
.kc-app .kc-vgruppe{grid-column:1/-1;font:800 11px var(--disp,inherit);letter-spacing:.14em;text-transform:uppercase;color:var(--steel,#8b929c);margin-top:6px;padding-bottom:2px;border-bottom:1px dashed #23262f}
.kc-app .kc-vgruppe:first-child{margin-top:0}
.kc-app .kc-vl em{margin-left:auto;font:800 10px var(--body,inherit);font-style:normal;letter-spacing:.08em;color:#06080a;background:#5cff1f;padding:2px 5px;box-shadow:0 0 10px rgba(92,255,31,.6)}
.kc-app .kc-vorschau{touch-action:none;cursor:grab}
.kc-app .kc-vorschau.zieht{cursor:grabbing}
.kc-app .kc-vorschau.ziel{cursor:crosshair}
.kc-app .kc-bildpanel{display:flex;flex-direction:column;gap:8px;margin-top:4px;padding:10px 12px;background:#0b0c10;border:1px solid var(--line,#23262f)}
.kc-app .kc-bildkopf{font-size:13px;color:#fff;font-weight:600;line-height:1.35}
.kc-app .kc-cam{border-color:rgba(24,232,255,.45)}.kc-app .kc-cam .kc-bildkopf .kc-dim{font-weight:400;word-break:break-all}
.kc-app .kc-cam-datei{align-self:flex-start;cursor:pointer}.kc-app .kc-cam-datei input{position:absolute;inset:0;opacity:0;cursor:pointer}
.kc-app .kc-cam .kc-umschalt{margin-top:4px}.kc-app .kc-cam .kc-umschalt button{flex:1;padding:8px 6px;font-size:12px}
.kc-app .kc-bildpanel .kc-knoepfe .btn{font-size:13px;padding:7px 10px}
.kc-app .kc-termine{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.kc-app .kc-termin{display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;font:700 13px var(--body,inherit);padding:7px 11px;cursor:pointer;text-align:left}
.kc-app .kc-termin em{font-style:normal;font-weight:600;font-size:11.5px;color:#f5c518}
.kc-app .kc-termin em.frei{color:#5cff1f}
.kc-app .kc-termin:hover{border-color:#5cff1f}
.kc-app .kc-termin.an{border-color:#5cff1f;background:rgba(92,255,31,.12);box-shadow:0 0 14px rgba(92,255,31,.35)}
.kc-app .kc-marke .kc-sfarbe{max-width:120px;flex:none}
.kc-app .kc-marke .kc-fuell{flex:1;color:#fff;font-weight:700}
.kc-app .kc-vl:hover{border-color:var(--f)}
.kc-app .kc-vl.an{border-color:var(--f);box-shadow:0 0 18px color-mix(in srgb,var(--f) 55%,transparent),inset 0 0 14px color-mix(in srgb,var(--f) 25%,transparent);background:color-mix(in srgb,var(--f) 12%,#14161d)}
.kc-app .kc-feld{display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--steel,#8b929c);min-width:0}
.kc-app .kc-feld b{color:#fff}
.kc-app .kc-feld input[type=text],.kc-app .kc-feld input[type=time],.kc-app .kc-feld input[type=datetime-local]{height:42px;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;font:15px var(--body,inherit);padding:0 11px}
.kc-app .kc-feld input[type=range]{accent-color:#ff2d6f;width:100%}
.kc-app .kc-zeile{display:flex;gap:8px}.kc-app .kc-zeile input{flex:1;min-width:0}
.kc-app .kc-felder{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:flex-end}
.kc-app .kc-felder .kc-feld{flex:1 1 150px}
.kc-app .kc-farben{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kc-app .kc-farbe{width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,.2);background:var(--f);cursor:pointer;box-shadow:0 0 10px var(--f)}
.kc-app .kc-farbe.an{border-color:#fff;box-shadow:0 0 0 3px #0d0e13,0 0 0 5px var(--f),0 0 22px var(--f)}
.kc-app .kc-umschalt{display:flex;border:1px solid var(--line,#23262f)}
.kc-app .kc-umschalt button{background:transparent;border:0;color:var(--steel,#8b929c);font:700 13px var(--body,inherit);padding:10px 14px;cursor:pointer}
.kc-app .kc-umschalt button.an{background:#ff2d6f;color:#fff}
.kc-app .kc-looks{align-self:flex-start}
.kc-app .kc-stile{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.kc-app .kc-stile button{background:#0b0c10;border:1px solid var(--line,#23262f);color:#cfd3dc;font:600 13px var(--body,inherit);padding:8px 12px;cursor:pointer}
.kc-app .kc-stile button.an{border-color:#5cff1f;color:#fff;box-shadow:0 0 12px rgba(92,255,31,.35) inset}
.kc-app .kc-stile .kc-stil-w{font-size:15px;padding:6px 10px}
.kc-app .kc-looks button{font-size:14px;padding:11px 16px}
.kc-app .kc-check{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:#fff;cursor:pointer}
.kc-app .kc-check input{margin-top:3px;accent-color:#ff2d6f;width:18px;height:18px}
.kc-app .kc-check input.kc-folge{width:5.2em;height:auto;margin:0 4px;padding:3px 6px;background:#0d0f12;color:#fff;border:1px solid #3a4048;border-radius:6px;font:inherit}
.kc-app .kc-mehrposts{display:grid;gap:9px;margin:12px 0;padding:12px 14px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.03)}
.kc-app .kc-check.aus{opacity:.5;cursor:default}
.kc-app .kc-schnitt{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.kc-app .kc-slot{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:#0b0c10;border:1px solid var(--line,#23262f);border-left:3px solid var(--f,#ffd400)}
.kc-app .kc-slot.leer{border-left-color:#5b6672}
.kc-app .kc-slot-kopf{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:#fff}
.kc-app .kc-slot-kopf b{font-family:var(--disp,inherit);font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.kc-app .kc-slot-knoepfe{margin-left:auto;display:flex;gap:6px}
.kc-app .kc-slot-knoepfe .btn{padding:4px 10px}
.kc-app .kc-wahl{height:38px;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;padding:0 8px;max-width:260px}
.kc-app .kc-datei{position:relative;overflow:hidden}
.kc-app .kc-datei input{position:absolute;inset:0;opacity:0;cursor:pointer}
.kc-app .kc-marken{display:flex;flex-direction:column;gap:6px}
.kc-app .kc-marke{display:flex;align-items:center;gap:8px}
.kc-app .kc-marke b{color:#5cff1f;min-width:34px}
.kc-app .kc-marke .kc-dim{min-width:54px}
.kc-app .kc-marke input{flex:1;min-width:0;height:38px;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;padding:0 10px}
.kc-app textarea{width:100%;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;font:14px/1.5 var(--body,inherit);padding:10px 11px;resize:vertical}
.kc-app .kc-ziele{display:flex;flex-direction:column;gap:8px;padding-bottom:6px}
.kc-app .kc-knoepfe{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.kc-app .kc-knoepfe input[type=datetime-local]{height:36px;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;padding:0 8px}
.kc-app .kc-knoepfe.gross{margin-top:8px}
.kc-app .btn.kc-los{background:linear-gradient(90deg,#ff2d6f,#ff7a00);border-color:transparent;color:#fff;font-size:15px;padding:13px 20px;box-shadow:0 0 24px rgba(255,45,111,.45)}
.kc-app .kc-reihe-info{color:#cfd3dc;font-size:13px;padding:8px 12px;border:1px dashed var(--line,#23262f)}
.kc-app .kc-h{font-family:var(--disp,inherit);font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:16px;margin:10px 0 0;color:#fff}
.kc-app .kc-leer{color:var(--steel,#8b929c);font-size:14px;padding:12px;border:1px dashed var(--line,#23262f)}
.kc-app .kc-post{display:flex;gap:14px;align-items:flex-start;padding:12px;background:#0d0e13;border:1px solid var(--line,#23262f)}
.kc-app .kc-mini{flex:none;width:78px;aspect-ratio:9/16;background:#000;border:1px solid var(--line,#23262f);display:grid;place-items:center;font-size:26px;text-decoration:none;overflow:hidden}
.kc-app .kc-mini img{width:100%;height:100%;object-fit:cover;display:block}
.kc-app .kc-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.kc-app .kc-titel{font-family:var(--disp,inherit);font-weight:800;font-size:17px;text-transform:uppercase;color:#fff;text-shadow:0 0 12px var(--f)}
.kc-app .kc-chips{display:flex;flex-wrap:wrap;gap:6px}
.kc-app .kc-zahlen{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px;font-size:.86rem}
.kc-app .kc-best{width:100%;border-collapse:collapse;font-size:.88rem;margin-top:6px}
.kc-app .kc-best th,.kc-app .kc-best td{text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.1)}
.kc-app .kc-best th{font-weight:700;opacity:.7}
.kc-app .kc-stich{margin-top:6px}
.kc-app .kc-stich .ki-chip{border-color:#5cff1f;color:#d9ffcc}
.kc-app .kc-hinweis{font-size:13px;color:#f5c518;background:#0b0c10;border:1px solid rgba(245,197,24,.45);padding:6px 10px}
.kc-app .kc-hinweis.rot{color:#ff6b75;border-color:rgba(225,19,36,.45)}
.kc-app .kc-auto{border:1px solid rgba(92,255,31,.5);background:rgba(92,255,31,.04);padding:14px 16px;margin:10px 0 16px}
.kc-app .kc-auto .kc-h{margin-top:0}
.kc-app .kc-auto-reihe{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;margin:12px 0}
.kc-app .kc-auto-karte{display:flex;gap:12px;padding:10px;background:#101218;border:1px solid rgba(245,197,24,.55)}
.kc-app .kc-auto-karte.gruen{border-color:rgba(92,255,31,.65)}.kc-app .kc-auto-karte.rot{border-color:rgba(225,19,36,.6)}.kc-app .kc-auto-karte.grau{border-color:#3a4048;opacity:.7}
.kc-app .kc-auto-bild{flex:0 0 96px;width:96px;aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;background:#0b0c10;border:1px solid #2a2f36;font-size:30px;text-decoration:none;align-self:flex-start;overflow:hidden}
.kc-app .kc-auto-bild.hoch{aspect-ratio:9/16}.kc-app .kc-auto-bild img{width:100%;height:100%;object-fit:cover;display:block}
.kc-app .kc-auto-info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}.kc-app .kc-auto-info>b{font-size:16px;color:#fff}
.kc-app .kc-auto-titel{font-size:13px;color:#e6e9ec;word-break:break-word}
.kc-app .kc-auto-status{align-self:flex-start;margin-top:5px;padding:2px 8px;font-size:12px;font-weight:700;border:1px solid}
.kc-app .kc-auto-status.gelb{color:#f5c518;border-color:rgba(245,197,24,.5);background:rgba(245,197,24,.12)}.kc-app .kc-auto-status.gruen{color:#8dff5c;border-color:rgba(92,255,31,.5);background:rgba(92,255,31,.1)}
.kc-app .kc-auto-status.rot{color:#ff6b75;border-color:rgba(225,19,36,.5)}.kc-app .kc-auto-status.grau{color:#9aa3ad;border-color:#3a4048}
.kc-app .kc-auto-kn{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.kc-app .kc-kar-auto{display:grid;gap:10px;padding:12px;margin:10px 0 4px;border:1px solid rgba(24,232,255,.3);background:rgba(24,232,255,.04)}
.kc-app .kc-kar-w{flex:0 0 auto;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;font-size:18px;line-height:1;padding:0 12px;cursor:pointer}.kc-app .kc-kar-w:hover{border-color:#5cff1f}
.kc-app .kc-kar-text{align-items:center;gap:10px;margin-top:6px}.kc-app .kc-kar-text .kc-dim{flex:1 1 260px}
.kc-app .kc-auto-kn .btn,.kc-app .kc-auto-schalter .btn{padding:7px 12px;font-size:13px;min-height:0;line-height:1.2;white-space:nowrap}
.kc-app .kc-auto-kn .kc-frei{background:#5cff1f;color:#06080a;border-color:#5cff1f;font-weight:800}
.kc-app .kc-ae{margin:12px 0;padding:12px 14px;background:#0d0f13;border:1px solid rgba(24,232,255,.6);box-shadow:0 0 18px rgba(24,232,255,.12)}
.kc-app .kc-ae-kopf{font-weight:800;font-size:16px;color:#fff;margin-bottom:10px}
.kc-app .kc-ae-innen{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
.kc-app .kc-ae-vorschau{flex:0 0 auto;width:216px;height:auto;background:#000;border:1px solid #2a2f36}
.kc-app .kc-ce{border-color:rgba(255,45,111,.65);box-shadow:0 0 18px rgba(255,45,111,.14)}
.kc-app .kc-ae-felder{flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:10px}
.kc-app .kc-ae-zeile{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.kc-app .kc-ae-zeile>span{flex:0 0 62px;font-size:13px;color:#9aa3ad}
.kc-app .kc-ae-chip{font:inherit;font-size:13px;font-weight:700;padding:5px 10px;background:#161a20;color:#fff;border:1px solid #3a4048;cursor:pointer}
.kc-app .kc-ae-chip.an{background:#18e8ff;color:#06080a;border-color:#18e8ff}
.kc-app .kc-ae-farbe{width:30px;height:30px;border-radius:50%;background:var(--f);border:2px solid transparent;cursor:pointer;padding:0}
.kc-app .kc-ae-farbe.an{border-color:#fff;box-shadow:0 0 12px var(--f)}
.kc-app .kc-auto-h{margin-top:14px;font-weight:800;color:#fff;font-size:15px}
.kc-app .kc-abl{border:1px solid rgba(24,232,255,.45);background:rgba(24,232,255,.04);padding:10px 14px}
.kc-app .kc-abl.zu{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.kc-app .kc-abl.zu>b{color:#fff}
.kc-app .kc-abl summary{cursor:pointer;font-weight:800;color:#fff}
.kc-app .kc-abl-reihe{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-top:10px}
.kc-app .kc-abl-k{display:flex;flex-direction:column;gap:4px;padding:8px;background:#101218;border:1px solid #2a2f36;font-size:13px;min-width:0}
.kc-app .kc-abl-k>b{color:#fff;font-size:14px;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
.kc-app .kc-abl-k .btn{margin-top:auto;padding:7px 9px;font-size:12px}
.kc-app .kc-abl-k.benutzt{opacity:.6}
.kc-app .kc-abl-bild{aspect-ratio:16/9;background:#07080b;display:flex;align-items:center;justify-content:center;font-size:26px;overflow:hidden}
.kc-app .kc-abl-bild img{width:100%;height:100%;object-fit:cover;display:block}
.kc-app .kc-abl-fotos{margin-top:14px;padding-top:12px;border-top:1px solid rgba(24,232,255,.25)}.kc-app .kc-abl-fotos>b{display:block;color:#fff}.kc-app .kc-abl-fotos>b .kc-dim{font-weight:400}
.kc-app .kc-foto-reihe{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;margin-top:10px}
.kc-app .kc-foto{position:relative;aspect-ratio:4/5;padding:0;border:2px solid #2a2f36;background:#07080b;cursor:pointer;overflow:hidden}
.kc-app .kc-foto img{width:100%;height:100%;object-fit:cover;display:block}
.kc-app .kc-foto i{position:absolute;left:6px;top:6px;width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,.65);color:#fff;font:800 15px/24px var(--body,inherit);font-style:normal;text-align:center}
.kc-app .kc-foto.an{border-color:#8dff5c;box-shadow:0 0 0 2px #8dff5c}.kc-app .kc-foto.an i{background:#8dff5c;border-color:#8dff5c;color:#000}
.kc-app .kc-foto.benutzt{opacity:.55}.kc-app .kc-foto .kc-tag-ok{position:absolute;left:0;right:0;bottom:0;padding:3px 4px;background:rgba(0,0,0,.75);font-size:11px}
.kc-app .kc-foto-form{display:flex;flex-direction:column;gap:10px;margin-top:12px;padding:12px;background:#101218;border:1px solid #2a2f36}
.kc-app .kc-kar-seiten{display:flex;flex-direction:column;gap:10px}
.kc-app .kc-team{border-color:rgba(141,255,92,.4)}
.kc-app .kc-team-gal{display:flex;flex-wrap:wrap;gap:8px}
.kc-app .kc-team-gal button{width:104px;height:88px;padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#07080b;border:2px solid #2a2f36;color:#fff;cursor:pointer}
.kc-app .kc-team-gal button img{max-width:100%;height:48px;object-fit:contain;display:block}
.kc-app .kc-team-gal button i{font:700 11px var(--disp,inherit);font-style:normal;letter-spacing:.06em;text-transform:uppercase;color:#aeb4bd}
.kc-app .kc-team-gal button:hover{border-color:#5a626d}
.kc-app .kc-team-gal button.an{border-color:#8dff5c;box-shadow:0 0 0 2px #8dff5c}.kc-app .kc-team-gal button.an i{color:#8dff5c}
.kc-app .kc-team .kc-feld input[type=range]{accent-color:#8dff5c}
.kc-app .kc-team-zwei{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
.kc-app .kc-team-regler{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:8px}
.kc-app .kc-team-vs{flex:0 0 auto;width:216px;height:270px;display:block;background:#07080b;border:1px solid #2a2f36}
.kc-app canvas.mit-team{touch-action:none;cursor:grab}.kc-app canvas.mit-team.zieht{cursor:grabbing}
.kc-app .kc-kar-spr{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.kc-app .kc-kar-spr .kc-dim{flex:1 0 100%}
.kc-app .kc-kar-spr button{padding:5px 9px;background:#07080b;border:1px solid #2a2f36;color:#d7dbe0;font:700 12px var(--disp,inherit);letter-spacing:.05em;cursor:pointer}
.kc-app .kc-kar-spr button:hover{border-color:#5a626d;color:#fff}
.kc-app .kc-kar-spr button.an{border-color:#8dff5c;color:#8dff5c;box-shadow:0 0 0 1px #8dff5c}
.kc-app .kc-kar-zeile{display:grid;grid-template-columns:132px minmax(0,1fr);gap:12px;align-items:start;padding:10px;background:#0b0d12;border:1px solid #2a2f36}
.kc-app .kc-kar-vs{width:132px;height:165px;display:block;background:#07080b;border:1px solid #2a2f36}
.kc-app .kc-kar-f{display:flex;flex-direction:column;gap:8px;min-width:0}
.kc-app .kc-kar-f .kc-feld{flex:1 1 200px}
.kc-app .kc-kar-f select{height:42px;background:#0b0c10;border:1px solid var(--line,#23262f);color:#fff;font:15px var(--body,inherit);padding:0 8px}
@media (max-width:560px){.kc-app .kc-kar-zeile{grid-template-columns:96px minmax(0,1fr)}.kc-app .kc-kar-vs{width:96px;height:120px}}
.kc-app .kc-tage{display:grid;grid-template-columns:repeat(auto-fill,minmax(124px,1fr));gap:8px;margin-top:8px}
.kc-app .kc-tagz .kc-auto-kn{margin-top:auto;padding-top:6px}.kc-app .kc-tagz .kc-auto-kn .btn{padding:6px 9px;font-size:12px}
.kc-app .kc-tagz{display:flex;flex-direction:column;gap:4px;padding:8px 10px;background:#101218;border:1px solid #2a2f36;font-size:13px;min-width:0}
.kc-app .kc-tagz.leer{border-color:rgba(245,197,24,.55)}.kc-app .kc-tagz>b{color:#fff;font-size:14px}
.kc-app .kc-tag-ok{color:#8dff5c;font-weight:700}.kc-app .kc-tag-leer{color:#f5c518;font-weight:800}.kc-app .kc-vor{color:#e6e9ec;word-break:break-word}
.kc-app .kc-auto-schalter{display:flex;flex-wrap:wrap;gap:8px 22px;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)}
.kc-app .kc-hinweis.kc-bearb{color:#bff4ff;border-color:rgba(24,232,255,.55);background:rgba(24,232,255,.07);font-size:14px;padding:10px 14px;margin:8px 0}
.kc-app .kc-raus,.kc-app .kc-einst{background:#0d0e13;border:1px solid var(--line,#23262f);padding:10px 14px}
.kc-app .kc-raus summary,.kc-app .kc-einst summary{cursor:pointer;font-weight:700;color:#fff}
.kc-app .kc-raus .kc-post{margin-top:10px;background:#0b0c10}
.kc-app .kc-einst .kc-felder{margin:10px 0}
.kc-app .kc-einst .kc-feld{max-width:280px}
@media (max-width:700px){.kc-app .kc-links{flex-basis:100%;align-items:center}.kc-app .kc-schnitt{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
})();
