/* ===========================================================
   STREAMKALENDER — liest die Rennen DIREKT aus der ICS-Datei
   "SPR_Rennkalender.ics" (liegt im selben Ordner / Repo).
   - Keine Termine im Code. Neues Rennen? Einfach neue .ics hochladen.
   - Doppelte Rennen (gleiche UID ODER gleiches Datum+Uhrzeit+Titel)
     erscheinen nur EINMAL.
   - Du hakst pro Rennen an/ab, ob du es streamst (bleibt gespeichert).
   =========================================================== */
const ICS_FILE="SPR_Rennkalender.ics";
const WD =["So","Mo","Di","Mi","Do","Fr","Sa"];
const MON=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const OFF_KEY="kreids888_streams_off";

function getOff(){try{return new Set(JSON.parse(localStorage.getItem(OFF_KEY)||"[]"));}catch(e){return new Set();}}
function setOff(s){try{localStorage.setItem(OFF_KEY,JSON.stringify([...s]));}catch(e){}}

/* ---- ICS parsen ---- */
function parseICS(text){
  text=text.replace(/\r\n/g,"\n").replace(/\n[ \t]/g,""); // gefaltete Zeilen zusammenführen
  const out=[];
  const blocks=text.split("BEGIN:VEVENT").slice(1);
  for(const blk of blocks){
    const body=blk.split("END:VEVENT")[0];
    const dm=body.match(/DTSTART[^:]*:(\d{8}T\d{6})/);
    const sm=body.match(/SUMMARY:(.*)/);
    if(!dm||!sm) continue;
    const s=dm[1];
    const dt=new Date(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8),+s.slice(9,11),+s.slice(11,13));
    const um=body.match(/UID:(.*)/);
    let titel=sm[1].trim().replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\n/gi," ").replace(/\s+/g," ");
    out.push({uid:(um?um[1].trim():""),dt,titel});
  }
  return out;
}

/* ---- Doppelte entfernen: UID ODER Datum+Uhrzeit+Titel ---- */
function dedupe(events){
  const seenU=new Set(),seenK=new Set(),out=[];
  for(const e of events){
    const key=e.dt.toISOString()+"|"+e.titel.toLowerCase();
    if((e.uid&&seenU.has(e.uid))||seenK.has(key)) continue;
    if(e.uid)seenU.add(e.uid); seenK.add(key);
    out.push({id:e.uid||key,dt:e.dt,titel:e.titel});
  }
  return out;
}

let ALL=[];
async function loadICS(){
  try{
    const res=await fetch(ICS_FILE,{cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    return {ok:true,items:dedupe(parseICS(await res.text()))};
  }catch(e){ return {ok:false,items:[]}; }
}

function upcoming(){const now=new Date();now.setHours(0,0,0,0);return ALL.filter(r=>r.dt>=now).sort((a,b)=>a.dt-b.dt);}
function selected(){const off=getOff();return upcoming().filter(r=>!off.has(r.id));}
function fmtDay(dt){return {wd:WD[dt.getDay()],dt:dt.getDate()+". "+MON[dt.getMonth()]};}
function fmtTime(dt){return String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0")+" Uhr";}

/* ---- Liste mit Häkchen ---- */
function renderList(loadOk){
  const el=document.getElementById("stream-list");if(!el)return;
  const banner=document.getElementById("sk-banner");
  if(banner){
    banner.style.display="block";
    banner.innerHTML=loadOk
      ? 'Hake an, welche Rennen du streamst — nur die angehakten kommen ins Poster. Auswahl bleibt auf diesem Gerät gespeichert.'
      : '<b>ICS nicht gefunden.</b> Lade die Datei <b>'+ICS_FILE+'</b> in dein Repo (neben streamkalender.html). Neues Rennen später = einfach neue .ics hochladen.';
  }
  const off=getOff();const list=upcoming();
  if(!list.length){el.innerHTML=loadOk?'<div class="sk-empty">Keine kommenden Rennen in der ICS.</div>':'';drawPoster();return;}
  el.innerHTML=list.map(r=>{const d=fmtDay(r.dt);const on=!off.has(r.id);const idAttr=r.id.replace(/"/g,'&quot;');return `
    <label class="stream ${on?'':'off'}">
      <input type="checkbox" class="stream-cb" data-id="${idAttr}" ${on?'checked':''}>
      <span class="cbox"></span>
      <div class="day"><div class="wd">${d.wd}</div><div class="dt">${d.dt}</div></div>
      <div class="mid"><div class="tt">${r.titel}</div><div class="ti">${fmtTime(r.dt)}</div></div>
    </label>`;}).join("");
  el.querySelectorAll(".stream-cb").forEach(cb=>cb.addEventListener("change",()=>{
    const off=getOff();const id=cb.dataset.id;
    if(cb.checked)off.delete(id);else off.add(id);
    setOff(off);
    cb.closest(".stream").classList.toggle("off",!cb.checked);
    drawPoster();
  }));
  drawPoster();
}

/* ---- POSTER (9:16, 1080x1920) ---- */
function drawPoster(){
  const cv=document.getElementById("poster");if(!cv)return;
  const items=selected().slice(0,6);
  const ctx=cv.getContext("2d");const W=1080,H=1920;
  const red="#e11324",carbon="#0a0b0e",white="#f4f5f7",steel="#8b929c",panel="#14161d",line="#242832";
  ctx.fillStyle=carbon;ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W*0.85,-100,50,W*0.85,-100,700);
  g.addColorStop(0,"rgba(225,19,36,.30)");g.addColorStop(1,"rgba(225,19,36,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.05;ctx.fillStyle=white;ctx.font='900 640px "Saira Condensed", Impact, sans-serif';
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("888",W/2,H*0.52);ctx.restore();
  ctx.fillStyle=red;ctx.fillRect(0,0,W,14);
  ctx.textAlign="left";ctx.textBaseline="alphabetic";
  ctx.fillStyle=red;ctx.font='700 40px "Saira Condensed", sans-serif';ctx.fillText("S T R E A M   W E E K",80,150);
  ctx.fillStyle=white;ctx.font='900 150px "Saira Condensed", Impact, sans-serif';ctx.fillText("KREIDS",78,300);
  const kw=ctx.measureText("KREIDS").width;ctx.fillStyle=red;ctx.fillText("888",82+kw+10,300);
  ctx.fillStyle=steel;ctx.font='600 40px "Saira Condensed", sans-serif';ctx.fillText("LIVE · TWITCH + YOUTUBE",82,364);
  ctx.strokeStyle=line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(80,410);ctx.lineTo(W-80,410);ctx.stroke();
  if(!items.length){
    ctx.fillStyle=steel;ctx.font='700 54px "Saira Condensed", sans-serif';ctx.textAlign="center";
    ctx.fillText("KEINE RENNEN AUSGEWÄHLT",W/2,H/2);ctx.textAlign="left";
  }else{
    const top=470,rowH=(1560-top)/items.length,ch=Math.min(rowH-16,210);
    items.forEach((s,i)=>{
      const y=top+i*rowH;const d=fmtDay(s.dt);
      ctx.fillStyle=panel;ctx.fillRect(80,y,W-160,ch);
      ctx.fillStyle=red;ctx.fillRect(80,y,10,ch);
      ctx.textAlign="center";
      ctx.fillStyle=red;ctx.font='900 74px "Saira Condensed", Impact, sans-serif';ctx.fillText(d.wd.toUpperCase(),195,y+ch*0.46);
      ctx.fillStyle=steel;ctx.font='600 36px "Saira Condensed", sans-serif';ctx.fillText(d.dt,195,y+ch*0.74);
      ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(310,y+26);ctx.lineTo(310,y+ch-26);ctx.stroke();
      ctx.textAlign="left";
      ctx.fillStyle=white;ctx.font='800 50px "Saira Condensed", sans-serif';
      let title=s.titel;while(ctx.measureText(title).width>620&&title.length>4){title=title.slice(0,-2);}
      if(title!==s.titel)title=title.trim()+"…";
      ctx.fillText(title.toUpperCase(),345,y+ch*0.45);
      ctx.fillStyle=steel;ctx.font='600 40px "Saira Condensed", sans-serif';ctx.fillText(fmtTime(s.dt),345,y+ch*0.76);
    });
  }
  ctx.fillStyle=red;ctx.fillRect(0,H-230,W,4);
  ctx.textAlign="center";ctx.fillStyle=white;ctx.font='900 86px "Saira Condensed", Impact, sans-serif';
  ctx.fillText("FOLGEN & GLOCKE AN",W/2,H-120);
  ctx.textAlign="left";ctx.textBaseline="alphabetic";
}

async function initStreams(){
  const {ok,items}=await loadICS();
  ALL=items;
  renderList(ok);
  await (document.fonts?document.fonts.ready:Promise.resolve());
  drawPoster();
  const dl=document.getElementById("poster-dl");
  if(dl)dl.onclick=()=>{document.getElementById("poster").toBlob(b=>{
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="kreids888-streamweek.png";a.click();
  },"image/png");};
}
initStreams();
