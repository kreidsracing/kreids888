/* ===========================================================
   STREAMKALENDER — füllt sich aus deiner Google-Tabelle.
   ------------------------------------------------------------
   SO VERBINDEST DU DEINE TABELLE:
   1) Google Tabelle mit Kopfzeile (Zeile 1):
        Streamen? | Datum | Uhrzeit | Titel | Plattform
      In "Streamen?" trägst du Ja/Nein ein -> nur "Ja" erscheint.
      (Datum als 2026-08-04 ODER 04.08.2026 · Uhrzeit 20:00)
      Fehlt die Spalte "Streamen?", werden ALLE Zeilen gezeigt.
   2) In Google: Datei -> Freigeben -> Im Web veröffentlichen
      -> "Gesamtes Dokument", Format "CSV" -> Veröffentlichen
   3) Die angezeigte Link-URL hier unten bei SHEET_CSV_URL einsetzen.
   Fertig — die Seite füllt sich dann automatisch.
   =========================================================== */
const SHEET_CSV_URL = ""; // <-- hier deine veröffentlichte CSV-URL eintragen

// Handles fürs Poster
const HANDLE_TWITCH = "twitch.tv/kreids888";
const HANDLE_YT     = "@Kreids888";

// Demo-Daten, solange keine Tabelle verbunden ist
const DEMO = [
  {datum:"heute+1", uhrzeit:"20:00", titel:"SPR GT3 Challenge – Rd 4", plattform:"Twitch + YT"},
  {datum:"heute+3", uhrzeit:"19:00", titel:"iRacing Endurance – 6H Test", plattform:"Twitch"},
  {datum:"heute+5", uhrzeit:"20:30", titel:"Setup-Testtag – Nordschleife", plattform:"YouTube"},
  {datum:"heute+6", uhrzeit:"20:00", titel:"SPR Sprint – Rd 6", plattform:"Twitch + YT"},
];

const WD  = ["So","Mo","Di","Mi","Do","Fr","Sa"];
const WDL = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const MON = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function parseCSV(t){
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){ if(c=='"'){ if(t[i+1]=='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else{ if(c=='"')q=true; else if(c==','){row.push(cur);cur="";}
      else if(c=='\n'){row.push(cur);rows.push(row);row=[];cur="";}
      else if(c!='\r')cur+=c; } }
  if(cur.length||row.length){row.push(cur);rows.push(row);}
  return rows;
}
function pick(o,keys){for(const k of keys){if(o[k]!=null&&String(o[k]).trim()!=="")return String(o[k]).trim();}return "";}

function parseDate(dStr,tStr){
  dStr=(dStr||"").trim();tStr=(tStr||"").trim();
  const now=new Date();
  let y,m,d;
  const rel=dStr.match(/^heute\+(\d+)$/); // nur für Demo
  if(rel){const dt=new Date();dt.setDate(dt.getDate()+ +rel[1]);y=dt.getFullYear();m=dt.getMonth()+1;d=dt.getDate();}
  else if(/^\d{4}-\d{1,2}-\d{1,2}/.test(dStr)){[y,m,d]=dStr.split("-").map(Number);}
  else if(/^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(dStr)){const p=dStr.split(".");d=+p[0];m=+p[1];y=+p[2];if(y<100)y+=2000;}
  else if(/^\d{1,2}\.\d{1,2}\.?$/.test(dStr)){const p=dStr.split(".");d=+p[0];m=+p[1];y=now.getFullYear();}
  else return null;
  let hh=20,mm=0;const tm=tStr.match(/(\d{1,2})[:.](\d{2})/);
  if(tm){hh=+tm[1];mm=+tm[2];}else{const th=tStr.match(/^(\d{1,2})$/);if(th)hh=+th[1];}
  return new Date(y,m-1,d,hh,mm);
}

function truthy(v){return /^\s*(ja|j|x|yes|y|true|1|✓|✔)/i.test(v||"");}
function hasStreamCol(raw){return raw.some(r=>("streamen?" in r)||("streamen" in r));}

function toItems(raw){
  const now=new Date();now.setHours(0,0,0,0);
  const useFilter=hasStreamCol(raw);   // Spalte "Streamen?" vorhanden -> nur angehakte zeigen
  return raw.map(r=>{
    if(useFilter && !truthy(pick(r,["streamen?","streamen"]))) return null;
    const dt=parseDate(pick(r,["datum","date"])||r.datum, pick(r,["uhrzeit","zeit","time"])||r.uhrzeit);
    return dt?{dt,titel:pick(r,["titel","title","stream","spiel"])||r.titel||"Stream",
      plattform:pick(r,["plattform","platform"])||r.plattform||"Twitch + YouTube"}:null;
  }).filter(x=>x&&x.dt>=now).sort((a,b)=>a.dt-b.dt);
}

async function loadStreams(){
  if(SHEET_CSV_URL){
    try{
      const txt=await (await fetch(SHEET_CSV_URL)).text();
      const rows=parseCSV(txt); if(rows.length<2) throw 0;
      const head=rows[0].map(h=>h.trim().toLowerCase());
      const objs=rows.slice(1).map(r=>{const o={};head.forEach((h,i)=>o[h]=r[i]);return o;});
      return {items:toItems(objs),demo:false};
    }catch(e){ return {items:toItems(DEMO),demo:true,err:true}; }
  }
  return {items:toItems(DEMO),demo:true};
}

function fmtDay(dt){return {wd:WD[dt.getDay()],dt:dt.getDate()+". "+MON[dt.getMonth()]};}
function fmtTime(dt){return String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0")+" Uhr";}

function renderList(items,demo,err){
  const el=document.getElementById("stream-list");if(!el)return;
  const banner=document.getElementById("sk-banner");
  if(banner){
    if(demo) banner.innerHTML='<b>Demo-Ansicht.</b> '+(err?'Tabelle nicht erreichbar – ':'')+'So sieht es aus. Trage deine Google-Tabellen-URL in <b>streams.js</b> ein, dann füllt sich alles automatisch.';
    else banner.style.display="none";
  }
  if(!items.length){el.innerHTML='<div class="sk-empty">Keine kommenden Streams eingetragen.</div>';return;}
  el.innerHTML=items.slice(0,8).map(s=>{const d=fmtDay(s.dt);return `
    <div class="stream">
      <div class="day"><div class="wd">${d.wd}</div><div class="dt">${d.dt}</div></div>
      <div class="mid"><div class="tt">${s.titel}</div><div class="ti">${fmtTime(s.dt)}</div></div>
      <div class="plat"><span>${s.plattform}</span></div>
    </div>`;}).join("");
}

/* ---------- POSTER (9:16, 1080x1920) ---------- */
function drawPoster(items){
  const cv=document.getElementById("poster");if(!cv)return;
  const ctx=cv.getContext("2d");const W=1080,H=1920;
  const red="#e11324",carbon="#0a0b0e",white="#f4f5f7",steel="#8b929c",panel="#14161d",line="#242832";
  ctx.fillStyle=carbon;ctx.fillRect(0,0,W,H);
  // ambient glow
  const g=ctx.createRadialGradient(W*0.85,-100,50,W*0.85,-100,700);
  g.addColorStop(0,"rgba(225,19,36,.30)");g.addColorStop(1,"rgba(225,19,36,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // giant 888 watermark
  ctx.save();ctx.globalAlpha=.05;ctx.fillStyle=white;ctx.font='900 640px "Saira Condensed", Impact, sans-serif';
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("888",W/2,H*0.52);ctx.restore();
  // top red bar
  ctx.fillStyle=red;ctx.fillRect(0,0,W,14);
  // header
  ctx.textAlign="left";ctx.textBaseline="alphabetic";
  ctx.fillStyle=red;ctx.font='700 40px "Saira Condensed", sans-serif';
  ctx.fillText("S T R E A M   W E E K",80,150);
  ctx.fillStyle=white;ctx.font='900 150px "Saira Condensed", Impact, sans-serif';
  ctx.fillText("KREIDS",78,300);
  const kw=ctx.measureText("KREIDS").width;
  ctx.fillStyle=red;ctx.fillText("888",82+kw+10,300);
  // date range
  if(items.length){
    const a=items[0].dt,b=items[Math.min(items.length,6)-1].dt;
    const range=a.getDate()+". "+MON[a.getMonth()]+"  –  "+b.getDate()+". "+MON[b.getMonth()];
    ctx.fillStyle=steel;ctx.font='600 42px "Saira Condensed", sans-serif';ctx.fillText(range.toUpperCase(),82,370);
  }
  ctx.strokeStyle=line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(80,420);ctx.lineTo(W-80,420);ctx.stroke();
  // rows
  const rows=items.slice(0,6);
  const top=470,rowH=(1560-top)/Math.max(rows.length,1),ch=Math.min(rowH-16,190);
  rows.forEach((s,i)=>{
    const y=top+i*rowH;
    ctx.fillStyle=panel;ctx.fillRect(80,y,W-160,ch);
    ctx.fillStyle=red;ctx.fillRect(80,y,10,ch);
    const d=fmtDay(s.dt);
    // weekday
    ctx.textAlign="center";
    ctx.fillStyle=red;ctx.font='900 70px "Saira Condensed", Impact, sans-serif';
    ctx.fillText(d.wd.toUpperCase(),190,y+ch*0.46);
    ctx.fillStyle=steel;ctx.font='600 34px "Saira Condensed", sans-serif';
    ctx.fillText(d.dt,190,y+ch*0.72);
    // divider
    ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(300,y+28);ctx.lineTo(300,y+ch-28);ctx.stroke();
    // title + time
    ctx.textAlign="left";
    ctx.fillStyle=white;ctx.font='800 50px "Saira Condensed", sans-serif';
    let title=s.titel;while(ctx.measureText(title).width>640&&title.length>4){title=title.slice(0,-2);}
    if(title!==s.titel)title=title.trim()+"…";
    ctx.fillText(title.toUpperCase(),330,y+ch*0.44);
    ctx.fillStyle=steel;ctx.font='600 38px "Saira Condensed", sans-serif';
    ctx.fillText(fmtTime(s.dt),330,y+ch*0.74);
    // platform pill
    ctx.font='800 30px "Saira Condensed", sans-serif';
    const pw=ctx.measureText(s.plattform.toUpperCase()).width+34;
    ctx.strokeStyle=red;ctx.lineWidth=2;ctx.strokeRect(W-90-pw,y+ch/2-26,pw,52);
    ctx.fillStyle=red;ctx.textAlign="center";ctx.fillText(s.plattform.toUpperCase(),W-90-pw/2,y+ch/2+11);
  });
  // footer CTA
  ctx.fillStyle=red;ctx.fillRect(0,H-260,W,4);
  ctx.textAlign="center";
  ctx.fillStyle=white;ctx.font='900 78px "Saira Condensed", Impact, sans-serif';
  ctx.fillText("FOLGEN & GLOCKE AN",W/2,H-150);
  ctx.fillStyle=steel;ctx.font='600 40px "Saira Condensed", sans-serif';
  ctx.fillText(HANDLE_TWITCH+"   ·   "+HANDLE_YT,W/2,H-88);
  ctx.textAlign="left";ctx.textBaseline="alphabetic";
}

async function initStreams(){
  const {items,demo,err}=await loadStreams();
  renderList(items,demo,err);
  await (document.fonts?document.fonts.ready:Promise.resolve());
  drawPoster(items);
  const dl=document.getElementById("poster-dl");
  if(dl)dl.onclick=()=>{document.getElementById("poster").toBlob(b=>{
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="kreids888-streamweek.png";a.click();
  },"image/png");};
}
initStreams();
