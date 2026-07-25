/* ===========================================================
   STREAMKALENDER — liest Rennen aus "SPR_Rennkalender.ics".
   - Zeigt NUR die aktuelle Woche (Mo–So). Website + Poster.
   - Doppelte (gleiche UID ODER Datum+Uhrzeit+Titel) nur einmal.
   - Du hakst pro Rennen an/ab, ob du es streamst (gespeichert).
   - Logo unten im Poster: Datei "kreidslogo.png" im Repo.
   =========================================================== */
const ICS_FILE="SPR_Rennkalender.ics";
const LOGO_SRC="https://i.postimg.cc/c4WQb4fc/kreidslogo-twitch-u-yt.png";
const WD =["So","Mo","Di","Mi","Do","Fr","Sa"];
const MON=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const OFF_KEY="kreids888_streams_off";

function getOff(){try{return new Set(JSON.parse(localStorage.getItem(OFF_KEY)||"[]"));}catch(e){return new Set();}}
function setOff(s){try{localStorage.setItem(OFF_KEY,JSON.stringify([...s]));}catch(e){}}

/* ---- aktuelle Woche (Mo 00:00 – So 23:59) ---- */
function weekBounds(){
  const now=new Date();const day=(now.getDay()+6)%7; // Mo=0 ... So=6
  const mon=new Date(now);mon.setHours(0,0,0,0);mon.setDate(now.getDate()-day);
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59,999);
  return [mon,sun];
}

/* ---- ICS parsen ---- */
function parseICS(text){
  text=text.replace(/\r\n/g,"\n").replace(/\n[ \t]/g,"");
  const out=[];const blocks=text.split("BEGIN:VEVENT").slice(1);
  for(const blk of blocks){
    const body=blk.split("END:VEVENT")[0];
    const dm=body.match(/DTSTART[^:]*:(\d{8}T\d{6})/);const sm=body.match(/SUMMARY:(.*)/);
    if(!dm||!sm) continue;
    const s=dm[1];
    const dt=new Date(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8),+s.slice(9,11),+s.slice(11,13));
    const um=body.match(/UID:(.*)/);
    let titel=sm[1].trim().replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\n/gi," ").replace(/\s+/g," ");
    out.push({uid:(um?um[1].trim():""),dt,titel});
  }
  return out;
}
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

/* nur aktuelle Woche */
function thisWeek(){const [a,b]=weekBounds();return ALL.filter(r=>r.dt>=a&&r.dt<=b).sort((x,y)=>x.dt-y.dt);}
function selected(){const off=getOff();return thisWeek().filter(r=>!off.has(r.id));}
function fmtDay(dt){return {wd:WD[dt.getDay()],dt:dt.getDate()+". "+MON[dt.getMonth()]};}
function fmtTime(dt){return String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0")+" Uhr";}
function weekLabel(){const[a,b]=weekBounds();return a.getDate()+". "+MON[a.getMonth()]+" – "+b.getDate()+". "+MON[b.getMonth()];}

/* ---- Liste (nur aktuelle Woche) ---- */
function renderList(loadOk){
  const el=document.getElementById("stream-list");if(!el)return;
  const banner=document.getElementById("sk-banner");
  const list=thisWeek();const off=getOff();
  if(banner){
    banner.style.display="block";
    if(!loadOk) banner.innerHTML='<b>ICS nicht gefunden.</b> Lade <b>'+ICS_FILE+'</b> in dein Repo.';
    else banner.innerHTML='Woche <b>'+weekLabel()+'</b> — hake an, was du streamst. Nur Angehaktes kommt ins Poster.';
  }
  if(!list.length){el.innerHTML='<div class="sk-empty">Diese Woche keine Rennen.</div>';drawPoster();return;}
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
    setOff(off);cb.closest(".stream").classList.toggle("off",!cb.checked);drawPoster();
  }));
  drawPoster();
}

/* ---- Titel in Zeile einpassen (1–2 Zeilen, schrumpft bei Bedarf) ---- */
function fitTitle(ctx,text,maxW,startSize,minSize){
  text=text.toUpperCase();
  for(let size=startSize;size>=minSize;size-=2){
    ctx.font='800 '+size+'px "Saira Condensed", sans-serif';
    if(ctx.measureText(text).width<=maxW) return {lines:[text],size};
  }
  const words=text.split(" ");
  for(let size=startSize;size>=minSize;size-=2){
    ctx.font='800 '+size+'px "Saira Condensed", sans-serif';
    let l1="",l2="";
    for(const w of words){
      if(!l2 && ctx.measureText((l1?l1+" ":"")+w).width<=maxW) l1=(l1?l1+" ":"")+w;
      else l2=(l2?l2+" ":"")+w;
    }
    if(l2 && ctx.measureText(l1).width<=maxW && ctx.measureText(l2).width<=maxW) return {lines:[l1,l2],size};
    if(!l2 && ctx.measureText(l1).width<=maxW) return {lines:[l1],size};
  }
  ctx.font='800 '+minSize+'px "Saira Condensed", sans-serif';
  let t=text;while(ctx.measureText(t+"…").width>maxW&&t.length>4)t=t.slice(0,-1);
  return {lines:[t+"…"],size:minSize};
}

/* ---- Logo vorladen ---- */
let LOGO_IMG=new Image(),LOGO_OK=false;
LOGO_IMG.crossOrigin="anonymous";
LOGO_IMG.onload=()=>{LOGO_OK=true;drawPoster();};
LOGO_IMG.onerror=()=>{LOGO_OK=false;};
LOGO_IMG.src=LOGO_SRC;

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
  // Header
  ctx.textAlign="left";ctx.textBaseline="alphabetic";
  ctx.fillStyle=red;ctx.font='700 40px "Saira Condensed", sans-serif';ctx.fillText("S T R E A M   W E E K",80,150);
  ctx.fillStyle=white;ctx.font='900 150px "Saira Condensed", Impact, sans-serif';ctx.fillText("KREIDS",78,300);
  const kw=ctx.measureText("KREIDS").width;ctx.fillStyle=red;ctx.fillText("888",82+kw+10,300);
  ctx.fillStyle=steel;ctx.font='600 40px "Saira Condensed", sans-serif';ctx.fillText(weekLabel().toUpperCase(),82,364);
  ctx.strokeStyle=line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(80,410);ctx.lineTo(W-80,410);ctx.stroke();
  // Rows (nur aktuelle Woche) — Bereich bis oberhalb des Logos
  const areaTop=470, areaBot=1520;
  if(!items.length){
    ctx.fillStyle=steel;ctx.font='700 54px "Saira Condensed", sans-serif';ctx.textAlign="center";
    ctx.fillText("DIESE WOCHE KEINE RENNEN",W/2,(areaTop+areaBot)/2);ctx.textAlign="left";
  }else{
    const rowH=(areaBot-areaTop)/items.length, ch=Math.min(rowH-16,260);
    items.forEach((s,i)=>{
      const y=areaTop+i*rowH;const d=fmtDay(s.dt);
      ctx.fillStyle=panel;ctx.fillRect(80,y,W-160,ch);
      ctx.fillStyle=red;ctx.fillRect(80,y,10,ch);
      // Wochentag + Datum
      ctx.textAlign="center";
      ctx.fillStyle=red;ctx.font='900 74px "Saira Condensed", Impact, sans-serif';ctx.fillText(d.wd.toUpperCase(),195,y+ch*0.44);
      ctx.fillStyle=steel;ctx.font='600 36px "Saira Condensed", sans-serif';ctx.fillText(d.dt,195,y+ch*0.70);
      ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(310,y+26);ctx.lineTo(310,y+ch-26);ctx.stroke();
      // Titel (passt sich ein) + Zeit
      const tx=345, maxW=(W-90)-tx;
      const fit=fitTitle(ctx,s.titel,maxW,52,30);
      const lh=fit.size*1.02;
      const blockH=fit.lines.length*lh + 44;
      let ty=y+(ch-blockH)/2+fit.size;
      ctx.textAlign="left";ctx.fillStyle=white;ctx.font='800 '+fit.size+'px "Saira Condensed", sans-serif';
      fit.lines.forEach(l=>{ctx.fillText(l,tx,ty);ty+=lh;});
      ctx.fillStyle=steel;ctx.font='600 38px "Saira Condensed", sans-serif';ctx.fillText(fmtTime(s.dt),tx,ty+10);
    });
  }
  // Footer: Logo statt "Folgen & Glocke an"
ctx.fillStyle = red;
ctx.fillRect(0, H - 300, W, 4);

if (LOGO_OK && LOGO_IMG.width) {

    // Logo nahezu über die komplette Breite
    const padding = 20; // Abstand links/rechts
    const maxWidth = W - (padding * 2);

    const scale = maxWidth / LOGO_IMG.width;

    const w = LOGO_IMG.width * scale;
    const h = LOGO_IMG.height * scale;

    const x = (W - w) / 2;
    const y = H - h - 40;

    ctx.drawImage(LOGO_IMG, x, y, w, h);

} else {

    ctx.textAlign = "center";
    ctx.fillStyle = white;
    ctx.font = '900 84px "Saira Condensed", Impact, sans-serif';
    ctx.fillText("KREIDS888", W / 2, H - 150);

    ctx.fillStyle = steel;
    ctx.font = '600 40px "Saira Condensed", sans-serif';
    ctx.fillText("TWITCH + YOUTUBE", W / 2, H - 90);

    ctx.textAlign = "left";
}
  ctx.textBaseline="alphabetic";
}

async function initStreams(){
  const {ok,items}=await loadICS();
  ALL=items;
  renderList(ok);
  await (document.fonts?document.fonts.ready:Promise.resolve());
  drawPoster();
  const dl=document.getElementById("poster-dl");
  if(dl)dl.onclick=()=>{
    const cv=document.getElementById("poster");
    try{
      const url=cv.toDataURL("image/png"); // wirft, falls externer Link den Zugriff sperrt
      const a=document.createElement("a");a.href=url;a.download="kreids888-streamweek.png";a.click();
    }catch(e){
      alert("Der externe Logo-Link sperrt den Bild-Download (CORS). Wenn das passiert: Logo als kreidslogo.png ins Repo legen, dann klappt es sicher.");
    }
  };
}
initStreams();
