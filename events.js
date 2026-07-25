/* ===========================================================
   RENNKALENDER — liest dieselbe Datei wie der Streamkalender:
   "SPR_Rennkalender.ics". Anders als der Streamkalender zeigt
   diese Seite ALLE kommenden Rennen (nicht nur die aktuelle Woche)
   und ohne An/Abhak-Funktion — reine Übersicht.
   =========================================================== */
const ICS_FILE="SPR_Rennkalender.ics";
const WD =["So","Mo","Di","Mi","Do","Fr","Sa"];
const MON=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const MAX_SHOW=30; // wie viele kommende Rennen maximal angezeigt werden

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
function fmtDay(dt){return {wd:WD[dt.getDay()],dt:dt.getDate()+". "+MON[dt.getMonth()]};}
function fmtTime(dt){return String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0")+" Uhr";}

async function loadICS(){
  try{
    const res=await fetch(ICS_FILE,{cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    return {ok:true,items:dedupe(parseICS(await res.text()))};
  }catch(e){ return {ok:false,items:[]}; }
}

function renderList(ok,items){
  const el=document.getElementById("event-list");if(!el)return;
  const banner=document.getElementById("ek-banner");
  const now=new Date();
  const upcoming=items.filter(r=>r.dt>=now).sort((a,b)=>a.dt-b.dt).slice(0,MAX_SHOW);

  if(banner){
    banner.style.display="block";
    if(!ok) banner.innerHTML='<b>ICS nicht gefunden.</b> Lade <b>'+ICS_FILE+'</b> in dein Repo.';
    else banner.innerHTML='Alle kommenden Rennen — <b>'+upcoming.length+'</b> Termine.';
  }
  if(!upcoming.length){el.innerHTML='<div class="sk-empty">Aktuell keine kommenden Rennen im Kalender.</div>';return;}

  let lastKey="";
  el.innerHTML=upcoming.map(r=>{
    const d=fmtDay(r.dt);
    const monthKey=MON[r.dt.getMonth()]+" "+r.dt.getFullYear();
    let header="";
    if(monthKey!==lastKey){ header=`<div class="ek-month">${monthKey}</div>`; lastKey=monthKey; }
    return `${header}
    <div class="stream">
      <div class="day"><div class="wd">${d.wd}</div><div class="dt">${d.dt}</div></div>
      <div class="mid"><div class="tt">${r.titel}</div><div class="ti">${fmtTime(r.dt)}</div></div>
    </div>`;
  }).join("");
}

async function initEvents(){
  if(!document.getElementById("event-list")) return;
  const {ok,items}=await loadICS();
  renderList(ok,items);
}
initEvents();
