"use strict";
var BUILD="v18.4";
var KEYS=["stack_v1","venice_stack_v1","stack_v2","venice_stack_v2"];
var DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function findKey(){for(var i=0;i<KEYS.length;i++){try{if(localStorage.getItem(KEYS[i]))return KEYS[i]}catch(e){}}return "stack_v1"}
var KEY=findKey(),SKEY="stack_sync";
function iso(d){var x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")}
function pd(s){var p=String(s).split("-").map(Number);return new Date(p[0],p[1]-1,p[2])}
function today(){return iso(new Date())}
function addDays(s,n){var d=pd(s);d.setDate(d.getDate()+n);return iso(d)}
function uid(){return Math.random().toString(36).slice(2,9)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function n2(x){return Math.round((+x||0)*10)/10}
function num(x){var v=parseFloat(String(x==null?"":x).replace(/,/g,".").replace(/[-9.]/g,""));return isNaN(v)?0:v}
function str(x){return String(x==null?"":x)}
function hhmm(t){var d=new Date(t);if(isNaN(d.getTime()))return "--:--";return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
function isObj(x){return x&&typeof x==="object"}
function fmtU(u){if(!u)return "0";if(u<10)return (Math.round(u*100)/100).toString();return (Math.round(u*10)/10).toString()}

function blank(){return {compounds:[],meds:[],storage:[],done:{},skips:{},medLog:{},oneoff:[],body:[],labs:[],sites:[],settings:{unitsPerMl:100},protocols:[]}}
function load(){try{var r=localStorage.getItem(KEY);if(r){var o=JSON.parse(r);if(isObj(o))return o}}catch(e){}return blank()}
var S=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

var DEFAULT_SITES=["Abdomen L","Abdomen R","Thigh L","Thigh R","Delt L","Delt R","Ventrogluteal L","Ventrogluteal R","Glute L","Glute R"];
var LABS=["Hematocrit","Hemoglobin","Estradiol","Total T","Free T","SHBG","Prolactin","PSA","IGF-1","A1c","Fasting glucose","Insulin","TSH","Free T4","LDL","HDL","Triglycerides","ALT","AST","Creatinine","eGFR","hs-CRP","Ferritin"];
var OILRE=/(test|cyp|enanth|prop|undec|sustanon|s250|primo|mast|tren|deca|bold|equipoise|eq\b)/i;

function clean(arr,fn){if(!Array.isArray(arr))return [];return arr.filter(isObj).map(fn||function(x){return x})}

function norm(){
  var b=blank();
  Object.keys(b).forEach(function(k){if(S[k]==null)S[k]=b[k]});
  S.compounds=clean(S.compounds);S.meds=clean(S.meds);S.storage=clean(S.storage);S.sites=clean(S.sites);S.labs=clean(S.labs);

  S.compounds.forEach(function(c){
    if(!c.name)c.name=c.n||c.title||"Compound";
    c.name=str(c.name);c.n=c.name;
    if(!c.id)c.id=uid();
    if(c.freq==null)c.freq=c.freqType||"daily";
    c.freqType=c.freq;
    if(c.doseMg==null)c.doseMg=num(c.dose)||num(c.mg);
    c.doseMg=num(c.doseMg);c.dose=c.doseMg;
    if(!Array.isArray(c.days)||!c.days.length)c.days=c.freq==="2xw"?[1,4]:[];
    c.days=c.days.map(Number).filter(function(n){return n>=0&&n<=6});
    if(!c.start)c.start=today();
    if(!c.route)c.route="subq";
    if(c.time==null)c.time=c.t||"";
    c.time=str(c.time);
    if(!c.units)c.units="mg";
    c.vialMg=num(c.vialMg)||num(c.vial)||num(c.mgPerVial);
    delete c.vial;delete c.mgPerVial;
    c.bacMl=num(c.bacMl)||num(c.bac)||num(c.water)||num(c.bacWater);
    delete c.bac;delete c.water;delete c.bacWater;
    c.mgPerMl=num(c.mgPerMl)||num(c.conc)||num(c.mgml);
    delete c.conc;delete c.mgml;
    c.vialMl=num(c.vialMl)||num(c.ml);delete c.ml;
    if(!c.mode){if(c.mgPerMl||OILRE.test(c.name))c.mode="liquid";else c.mode="powder"}
    if(c.mode==="liquid"){
      if(!c.vialMl)c.vialMl=c.bacMl||0;
      if(!c.mgPerMl){var k=(c.vialMg&&c.bacMl)?c.vialMg/c.bacMl:0;if(k>=60)c.mgPerMl=Math.round(k);else c.needConc=true}
      if(c.remainingMl==null)c.remainingMl=c.vialMl||1;
    }else{
      if(c.remainingMl==null)c.remainingMl=c.bacMl||1;
    }
    c.remainingMl=num(c.remainingMl);
  });

  S.meds.forEach(function(m){
    if(!m.name)m.name=m.n||m.med||m.medication||m.label||"Medication";
    m.name=str(m.name);m.n=m.name;
    if(m.dose==null)m.dose=m.d||m.dosage||m.strength||"";
    m.dose=str(m.dose);
    if(!m.units)m.units="mg";
    if(!m.times)m.times=[];
    if(!Array.isArray(m.times))m.times=str(m.times).split(",");
    if(m.time&&m.times.indexOf(m.time)<0)m.times.push(m.time);
    m.times=m.times.map(str).map(function(x){return x.trim()}).filter(Boolean);
    delete m.time;
  });

  S.storage.forEach(function(s){if(!s.n)s.n=s.name||s.item||"Item";s.n=str(s.n);if(s.qty!=null)s.qty=num(s.qty)});

  if(!S.sites.length)S.sites=DEFAULT_SITES.map(function(n){return {n:n,last:null}});
  S.sites.forEach(function(s){if(!s.n)s.n="Site";s.n=str(s.n)});
  S.sites=S.sites.filter(function(s,i,a){return a.findIndex(function(x){return x.n===s.n})===i});
  if(!S.labs.length)S.labs=LABS.map(function(n){return {n:n,v:[],unit:""}});
  S.labs.forEach(function(l){if(!l.n)l.n="Marker";if(!Array.isArray(l.v))l.v=[]});

  healDates();
}

function healDates(){
  Object.keys(S.done).forEach(function(k){
    var bucket=S.done[k];
    if(!isObj(bucket)){delete S.done[k];return}
    Object.keys(bucket).forEach(function(id){
      var e=bucket[id];
      if(!isObj(e)){delete bucket[id];return}
      if(!e.d)e.d=e.t?iso(new Date(e.t)):k;
      if(e.d!==k){S.done[e.d]=S.done[e.d]||{};if(!S.done[e.d][id])S.done[e.d][id]=e;delete bucket[id]}
    });
    if(!Object.keys(bucket).length)delete S.done[k];
  });
}

function conc(c){
  if(c.units==="IU"){
    if(c.mode==="liquid") return num(c.mgPerMl)||0;
    var vialIU=num(c.vialMg),bac=num(c.bacMl);
    if(vialIU>0&&bac>0) return vialIU/bac;
    return 0;
  } else {
    var vmg=num(c.vialMg),bac2=num(c.bacMl);
    if(c.mode==="liquid") return num(c.mgPerMl)||0;
    if(vmg>0&&bac2>0) return vmg/bac2;
    return 0;
  }
}

function unitsFor(c,mg){
  if(c.units==="IU") return num(mg);
  var actualDoseInMg = c.units==="mcg" ? num(mg)/1000 : num(mg);
  var k = conc(c);
  if(!k) return 0;
  return Math.round((actualDoseInMg / k * 100) * 100) / 100;
}

function mlFor(c,mg){
  var k = conc(c);
  if(!k) return 0;
  if(c.units==="mcg") return (num(mg)/1000) / k;
  return num(mg)/k;
}

function dosesLeft(c){
  var k = conc(c);
  if(!k||!c.doseMg) return null;
  return Math.floor((c.remainingMl||0)/mlFor(c,c.doseMg));
}

function concLabel(c){
  if(c.mode==="liquid") return c.mgPerMl?n2(c.mgPerMl)+" "+c.units+"/mL":"set "+c.units+"/mL";
  var k = conc(c);
  if(c.units==="IU") return k>0?n2(k)+" IU/mL from "+n2(c.vialMg)+" IU/"+n2(c.bacMl)+" mL":"set IU and water";
  if(c.units==="mcg") return k>0?n2(k*1000)+" mcg/mL from "+n2(c.vialMg)+" mg/"+n2(c.bacMl)+" mL":"set mg and water";
  return k>0?n2(k)+" mg/mL from "+n2(c.vialMg)+" mg/"+n2(c.bacMl)+" mL":"set vial and water";
}

function occurs(c,ds){
  if(c.freq==="prn"||c.freq==="off") return false;
  if(!c.start) return false;
  var a=pd(c.start),b=pd(ds);
  if(b<a) return false;
  var diff=Math.round((b-a)/864e5);
  var sched=false;
  if(c.freq==="daily") sched=true;
  else if(c.freq==="eod") sched=diff%2===0;
  else if(c.freq==="2xw") sched=(c.days||[]).indexOf(b.getDay())>-1;
  else if(c.freq==="weekly") sched=b.getDay()===a.getDay();
  else if(c.freq==="once") sched=diff===0;
  if(!sched) return false;
  if(c.paused) return !!isDone(ds,c.id);
  return true;
}
function isDone(ds,id){var e=S.done[ds]&&S.done[ds][id];if(!isObj(e))return false;return e.d?e.d===ds:true}
function isSkip(ds,id){return (S.skips[ds]||[]).indexOf(id)>-1}

function logDose(id,ds,mg){
  var c=S.compounds.find(function(x){return x.id===id});if(!c)return false;
  var dmg=(mg!=null&&num(mg)>0)?num(mg):c.doseMg;
  if(!dmg||dmg<=0)return false;
  var k=conc(c);
  if(isDone(ds,id)){
    var old=S.done[ds][id];
    if(k)c.remainingMl=Math.max(0,(c.remainingMl||0)+mlFor(c,old.mg||c.doseMg)-mlFor(c,dmg));
    S.done[ds][id]={t:old.t,d:ds,mg:dmg,units:unitsFor(c,dmg)};
  }else{
    S.done[ds][id]={t:Date.now(),d:ds,mg:dmg,units:unitsFor(c,dmg)};
    if(k)c.remainingMl=Math.max(0,(c.remainingMl||0)-mlFor(c,dmg));
    S.skips[ds]=(S.skips[ds]||[]).filter(function(x){return x!==id});
  }
  if(c.site)S.sites.forEach(function(s){if(s.n===c.site)s.last=ds});
  save();return true;
}
function undoDose(id,ds){
  var c=S.compounds.find(function(x){return x.id===id});
  if(S.done[ds]&&S.done[ds][id]){var r=S.done[ds][id];if(c&&conc(c))c.remainingMl=(c.remainingMl||0)+mlFor(c,r.mg||c.doseMg);delete S.done[ds][id];save()}
}
function moveDose(id,from,to){
  if(!from||!to||from===to)return "same";
  var e=S.done[from]&&S.done[from][id];if(!isObj(e))return "missing";
  S.done[to]=S.done[to]||{};
  if(S.done[to][id])return "occupied";
  S.done[to][id]={t:e.t,d:to,mg:e.mg,units:e.units};
  delete S.done[from][id];
  S.skips[from]=(S.skips[from]||[]).filter(function(x){return x!==id});
  save();return "ok";
}
function toggleSkip(id,ds){var a=S.skips[ds]=S.skips[ds]||[];var i=a.indexOf(id);if(i>-1)a.splice(i,1);else a.push(id);save()}

var tab=(location.hash||"#today").slice(1);
window.addEventListener("hashchange",function(){tab=(location.hash||"#today").slice(1);window.scrollTo(0,0);render()});

function errBox(e){
  var el=document.getElementById("app");if(!el)return;
  var m=str(e&&(e.message||e));var st=e&&e.stack?str(e.stack).split("\n").slice(0,5).join("\n"):"";
  el.innerHTML='<main><div class="card"><h2>Build '+BUILD+' hit an error</h2><div class="dim">'+esc(m)+'</div><pre>'+esc(st)+'</pre><div style="height:10px"></div><button class="btn alt" onclick="location.reload()">Reload</button></div></main>';
}
window.onerror=function(msg,src,line){errBox(msg+" (line "+line+")")};

function head(title,sub){return '<header><h1>'+esc(title)+'</h1><div class="sub">'+esc(sub)+'</div></header>'}
function doseLine(c,mg){var u=unitsFor(c,mg);if(!u)return n2(mg)+' '+esc(c.units)+' · no concentration';return fmtU(u)+' u · '+n2(mlFor(c,mg))+' mL'}
function timeChip(t,prn){if(prn)return '<span class="timechip prn">PRN</span>';if(!t)return '<span class="timechip any">any time</span>';return '<span class="timechip">'+esc(t)+'</span>'}
function doseBtn(c,ds,mg){if(!conc(c))return '<button class="dose warn" data-edit="'+c.id+'">'+n2(mg)+' '+esc(c.units)+' · tap to set concentration</button>';return '<button class="dose" data-dose="'+c.id+'|'+ds+'">'+doseLine(c,mg)+'</button>'}
function byTime(a,b){return str(a.time||"99:99").localeCompare(str(b.time||"99:99"))}

function viewToday(){
  var d=today();
  var due=S.compounds.filter(function(c){return occurs(c,d)&&!isDone(d,c.id)&&!isSkip(d,c.id)});
  var done=S.compounds.filter(function(c){return isDone(d,c.id)&&c.freq!=="prn"});
  var skipped=S.compounds.filter(function(c){return isSkip(d,c.id)&&!isDone(d,c.id)});
  var total=due.length+done.length+skipped.length;
  due.sort(byTime);done.sort(byTime);skipped.sort(byTime);
  var h=head("Today",new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}));
  h+='<main>';
  h+='<div class="card"><div class="row" style="border:0;padding:0"><div class="nm"><div class="l1"><b class="mono">'+done.length+' of '+total+'</b></div><div class="l2">doses logged today</div></div><span class="pill '+(done.length===total&&total>0?"ok":"")+'">'+(total?Math.round(done.length/total*100):0)+'%</span></div></div>';
  if(!total)h+='<div class="card"><div class="dim">Nothing scheduled. Add one below or use a one-off.</div></div>';
  if(due.length||skipped.length||done.length){
    h+='<div class="card"><h2>Doses</h2>';
    due.forEach(function(c){h+='<div class="row"><div class="chk" data-log="'+c.id+'">✓</div><div class="nm"><div class="l1"><b>'+esc(c.name)+'</b>'+timeChip(c.time,false)+'</div><div class="l2">'+doseBtn(c,d,c.doseMg)+'</div></div><button class="skip" data-skip="'+c.id+'">Skip</button></div>'});
    skipped.forEach(function(c){h+='<div class="row struck"><div class="chk sk" data-log="'+c.id+'">–</div><div class="nm"><div class="l1"><b>'+esc(c.name)+'</b>'+timeChip(c.time,false)+'</div><div class="l2">'+doseBtn(c,d,c.doseMg)+'</div></div><button class="skip on" data-skip="'+c.id+'">Unskip</button></div>'});
    done.forEach(function(c){var r=S.done[d][c.id]||{};h+='<div class="row done"><div class="chk on" data-undo="'+c.id+'">✓</div><div class="nm"><div class="l1"><b>'+esc(c.name)+'</b>'+timeChip(c.time,false)+'</div><div class="l2">'+doseBtn(c,r.mg||c.doseMg,d)+' · logged '+hhmm(r.t)+'</div></div><button class="skip" data-skip="'+c.id+'">Skip</button></div>'});
    h+='</div>';
  }
  h+=viewMedsToday();
  h+='<div class="card"><h2>Backdate a dose</h2><div class="dim" style="margin-bottom:8px">For something you already took on another day.</div>';
  h+='<label>Compound</label><select id="bdSel">'+S.compounds.filter(function(c){return c.freq!=="prn"}).map(function(c){return '<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join("")+'</select>';
  h+='<div class="grid2"><div><label>Date</label><input type="date" id="bdDate" value="'+addDays(d,-1)+'" max="'+d+'"></div><div><label>Dose</label><input id="bdDose" type="number" step="0.01" inputmode="decimal"></div></div>';
  h+='<div class="tiny" id="bdOut" style="margin-top:6px"></div>';
  h+='<div style="margin-top:10px"><button class="btn" id="bdGo">Log it</button></div></div>';
  h+='<div class="card"><h2>One-off injection</h2><div class="dim" style="margin-bottom:8px">Not on the schedule at all. Shows once, never recurs.</div>';
  h+='<label>Name</label><input id="ooName" placeholder="e.g. TB-500 2 mg">';
  h+='<label>Date</label><input type="date" id="ooDate" value="'+d+'">';
  h+='<label>Dose</label><input id="ooMg" type="number" step="0.01" inputmode="decimal">';
  h+='<div style="margin-top:10px"><button class="btn alt" id="ooGo">Add one-off</button></div></div>';
  h+=viewAsNeeded();
  h+='</main>';
  return h;
}

function medSlots(){var out=[];S.meds.forEach(function(m,i){if(!m.times||!m.times.length){out.push({i:i,m:m,t:""});return}m.times.slice().sort().forEach(function(t){out.push({i:i,m:m,t:str(t)})})});out.sort(function(a,b){return str(a.t||"99:99").localeCompare(str(b.t||"99:99"))});return out}
function medKey(m,t){return m.name+"@"+(t||"any")}
function isMedDone(ds,k){return !!(S.medLog[ds]&&S.medLog[ds][k])}

function viewMedsToday(){
  var slots=medSlots().filter(function(s){return !!s.t});if(!slots.length)return "";
  var d=today();var dn=slots.filter(function(s){return isMedDone(d,medKey(s.m,s.t))}).length;
  var h='<div class="card"><h2>Medications</h2><div class="tiny" style="margin-bottom:6px">'+dn+' of '+slots.length+' logged</div>';
  slots.forEach(function(s){var k=medKey(s.m,s.t),done=isMedDone(d,k);h+='<div class="row'+(done?" done":"")+'"><div class="chk'+(done?" on":"")+'" data-med="'+esc(k)+'">✓</div><div class="nm"><div class="l1"><b>'+esc(s.m.name)+'</b>'+timeChip(s.t,false)+'</div><div class="l2">'+esc(s.m.dose)+'</div></div></div>'});
  h+='</div>';return h;
}

function viewAsNeeded(){
  var d=today();var prnC=S.compounds.filter(function(c){return c.freq==="prn"&&!c.paused});var prnM=medSlots().filter(function(s){return !s.t});
  if(!prnC.length&&!prnM.length)return "";
  var h='<div class="card"><h2>As needed</h2><div class="tiny" style="margin-bottom:6px">Not counted in the daily total</div>';
  prnC.forEach(function(c){var dn=isDone(d,c.id),r=dn?S.done[d][c.id]:{};h+='<div class="row'+(dn?" done":"")+'"><div class="chk'+(dn?" on":"")+'" data-log="'+c.id+'">✓</div><div class="nm"><div class="l1"><b>'+esc(c.name)+'</b><span class="timechip prn">PRN</span></div><div class="l2">'+doseBtn(c,d,dn&&r.mg?r.mg:c.doseMg)+(dn?' · logged '+hhmm(r.t):'')+'</div></div></div>'});
  prnM.forEach(function(s){var k=medKey(s.m,s.t),dn=isMedDone(d,k);h+='<div class="row'+(dn?" done":"")+'"><div class="chk'+(dn?" on":"")+'" data-med="'+esc(k)+'">✓</div><div class="nm"><div class="l1"><b>'+esc(s.m.name)+'</b><span class="timechip prn">PRN</span></div><div class="l2">'+esc(s.m.dose)+'</div></div></div>'});
  h+='</div>';return h;
}

function viewCal(){
  var base=S.calMonth?pd(S.calMonth+"-01"):pd(today());base.setDate(1);
  var y=base.getFullYear(),m=base.getMonth();
  var first=new Date(y,m,1),start=new Date(first);start.setDate(1-first.getDay());
  var h=head("Calendar","Tap a day to log, edit or pause");
  h+='<main><div class="card"><h2>'+base.toLocaleDateString(undefined,{month:"long",year:"numeric"})+'</h2>';
  h+='<div class="cal">'+DOW.map(function(x){return '<div class="hd">'+x[0]+'</div>'}).join("");
  for(var i=0;i<42;i++){
    var d=new Date(start);d.setDate(start.getDate()+i);
    var ds=iso(d),out=d.getMonth()!==m,tod=ds===today();
    var n=S.compounds.filter(function(c){return occurs(c,ds)}).length;
    var one=S.oneoff.filter(function(o){return o.date===ds}).length;
    h+='<div class="d'+(out?" out":"")+(tod?" tod":"")+'" data-day="'+ds+'">'+d.getDate()+(n||one?'<div class="dot'+(one?" p":"")+'"></div>':'')+'</div>';
  }
  h+='</div><div class="grid2" style="margin-top:10px"><button class="btn alt sm" id="calPrev">Prev</button><button class="btn alt sm" id="calNext">Next</button></div></div>';
  if(S.calDay){
    var ds2=S.calDay;
    h+='<div class="card"><h2>'+esc(pd(ds2).toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}))+'</h2>';
    var items=S.compounds.filter(function(c){return occurs(c,ds2)});
    if(!items.length)h+='<div class="dim">Nothing scheduled.</div>';
    items.forEach(function(c){var dn=isDone(ds2,c.id),r=dn?(S.done[ds2][c.id]||{}):{};h+='<div class="row'+(dn?" done":"")+'"><div class="chk'+(dn?" on":"")+'" data-logday="'+c.id+'|'+ds2+'">✓</div><div class="nm"><div class="l1"><b>'+esc(c.name)+'</b>'+timeChip(c.time,false)+(c.paused?'<span class="pill">paused</span>':'')+'</div><div class="l2">'+doseBtn(c,ds2,dn&&r.mg?r.mg:c.doseMg)+'</div></div><button class="skip" data-edit="'+c.id+'">Edit</button></div>'});
    var mslots=medSlots().filter(function(s){return !!s.t});
    if(mslots.length){
      h+='<div class="tiny" style="margin:10px 0 4px">Medications</div>';
      mslots.forEach(function(s){var k=medKey(s.m,s.t),dn=isMedDone(ds2,k);h+='<div class="row'+(dn?" done":"")+'"><div class="chk'+(dn?" on":"")+'" data-medday="'+esc(k)+'|'+ds2+'">✓</div><div class="nm"><div class="l1"><b>'+esc(s.m.name)+'</b>'+timeChip(s.t,false)+'</div><div class="l2">'+esc(s.m.dose)+'</div></div></div>'});
    }
    S.oneoff.filter(function(o){return o.date===ds2}).forEach(function(o){h+='<div class="row"><div class="nm"><div class="l1"><b>'+esc(o.name)+'</b><span class="pill">one-off'+(o.mg?" · "+n2(o.mg)+" "+(o.units||"mg"):"")+'</span></div></div><button class="skip" data-deloo="'+o.id+'">×</button></div>'});
    h+='</div>';
  }
  h+='</main>';return h;
}

function viewBody(){
  var h=head("Body","Weight, waist");h+='<main>';
  h+='<div class="card"><h2>Log today</h2><div class="grid2"><div><label>Weight (lb)</label><input id="bW" type="number" step="0.1" inputmode="decimal"></div><div><label>Waist (in)</label><input id="bWaist" type="number" step="0.25" inputmode="decimal"></div></div><div style="margin-top:10px"><button class="btn" id="bSave">Save</button></div></div>';
  var rows=S.body.slice().sort(function(a,b){return str(b.date).localeCompare(str(a.date))}).slice(0,30);
  if(rows.length){h+='<div class="card"><h2>History</h2>'+rows.map(function(r){return '<div class="row"><div class="nm"><div class="l1"><b class="mono">'+(r.w?r.w+" lb":"—")+'</b></div><div class="l2">'+esc(r.date)+(r.waist?" · "+r.waist+' in':'')+'</div></div></div>'}).join("")+'</div>'}
  h+='</main>';return h;
}

function viewLabs(){
  var h=head("Labs","Latest value per marker");h+='<main><div class="card"><h2>Markers</h2>';
  S.labs.forEach(function(l){var last=l.v&&l.v.length?l.v[l.v.length-1]:null;h+='<div class="row"><div class="nm"><div class="l1"><b>'+esc(l.n)+'</b></div><div class="l2">'+(last?esc(last.val)+" · "+esc(last.date):"no data")+'</div></div><button class="skip" data-lab="'+esc(l.n)+'">+</button></div>'});
  h+='</div></main>';return h;
}

function viewSites(){
  var h=head("Sites","Last used per site");h+='<main><div class="card"><h2>Rotation</h2>';
  var sorted=S.sites.slice().sort(function(a,b){return str(a.last||"").localeCompare(str(b.last||""))});
  sorted.forEach(function(s){var days=s.last?Math.round((pd(today())-pd(s.last))/864e5):null;var cls=days==null?"":days<3?"bad":days<7?"warn":"ok";h+='<div class="row"><div class="nm"><div class="l1"><b>'+esc(s.n)+'</b></div><div class="l2">'+(s.last?esc(s.last)+" · "+days+"d ago":"never")+'</div></div><span class="pill '+cls+'">'+(cls?"":"new")+'</span><button class="skip" data-site="'+esc(s.n)+'">Used</button></div>'});
  h+='</div></main>';return h;
}

function viewMore(){
  var h=head("More","Inventory, meds, sync, tools");h+='<main><div class="card"><h2>Manage</h2>';
  [["Inventory & protocols","#inv"],["Storage","#storage"],["Medications","#meds"],["Labs","#labs"],["Interactions","#conf"],["Sync","#sync"],["Tools","#tools"]].forEach(function(p){h+='<a href="'+p[1]+'" style="text-decoration:none;color:inherit"><div class="row"><div class="nm"><div class="l1"><b>'+p[0]+'</b></div></div><span class="dim">›</span></div></a>'});
  h+='</div></main>';return h;
}

function viewInv(){
  var h=head("Inventory","Tap a compound to edit");h+='<main><div class="card">';
  S.compounds.forEach(function(c){
    if(!c||typeof c!=="object")return;
    var dl=dosesLeft(c);
    h+='<div class="row"><div class="nm"><div class="l1"><b>'+esc(c.name)+'</b>'+(c.paused?'<span class="pill">paused</span>':'')+'</div><div class="l2">'+n2(c.doseMg)+' '+esc(c.units||"mg")+' '+esc(c.freq)+(c.time?" at "+esc(c.time):"")+'</div><div class="l2">'+esc(concLabel(c))+' · '+n2(c.remainingMl||0)+' mL left'+(dl!=null?" ("+dl+" doses)":"")+'</div></div><button class="skip" data-edit="'+c.id+'">Edit</button></div>';
  });
  h+='</div><div class="card"><h2>Add compound</h2>';
  h+='<label>Name</label><input id="ncName"><label>Type</label><select id="ncMode"><option value="powder">powder vial (reconstitute)</option><option value="liquid">pre-mixed liquid</option></select>';
  h+='<div id="ncPow"><div class="grid2"><div><label>Vial</label><input id="ncMg" type="number" step="0.1"></div><div><label>BAC mL</label><input id="ncBac" type="number" step="0.1"></div></div></div>';
  h+='<div id="ncLiq" style="display:none"><div class="grid2"><div><label>Per mL</label><input id="ncConc" type="number" step="0.1"></div><div><label>Vial mL</label><input id="ncVml" type="number" step="0.1"></div></div></div>';
  h+='<div class="grid2"><div><label>Dose</label><input id="ncDose" type="number" step="0.01"></div><div><label>Units</label><select id="ncUnits"><option value="mg">mg</option><option value="mcg">mcg</option><option value="IU">IU</option></select></div></div>';
  h+='<div class="grid2"><div><label>Time</label><input id="ncTime" type="time"></div><div><label>Frequency</label><select id="ncFreq"><option value="daily">daily</option><option value="eod">every other day</option><option value="2xw">twice weekly</option><option value="weekly">weekly</option><option value="prn">PRN</option></select></div></div>';
  h+='<div style="margin-top:10px"><button class="btn" id="ncAdd">Add</button></div></div></main>';return h;
}

function viewStorage(){
  var h=head("Storage","Vials and supplies");h+='<main><div class="card">';
  if(!S.storage.length)h+='<div class="dim">Nothing listed.</div>';
  S.storage.forEach(function(s,i){h+='<div class="row"><div class="nm"><div class="l1"><b>'+esc(s.n)+'</b></div><div class="l2">'+(s.qty!=null?s.qty:"")+' '+esc(s.unit)+'</div></div><button class="skip" data-delst="'+i+'">×</button></div>'});
  h+='</div><div class="card"><label>Item</label><input id="stN"><div class="grid2"><div><label>Qty</label><input id="stQ" type="number"></div><div><label>Unit</label><input id="stU" placeholder="vials"></div></div><div style="margin-top:10px"><button class="btn" id="stAdd">Add</button></div></div></main>';return h;
}

function viewMeds(){
  var h=head("Medications","Prescriptions and PRN");h+='<main><div class="card">';
  S.meds.forEach(function(m,i){h+='<div class="row"><div class="nm"><div class="l1"><b>'+esc(m.name)+'</b></div><div class="l2">'+esc(m.dose)+' · '+esc((m.times||[]).join(", ")||"PRN")+'</div></div><button class="skip" data-editmed="'+i+'">Edit</button><button class="skip" data-delmed="'+i+'">×</button></div>'});
  h+='</div><div class="card"><label>Name</label><input id="mdN"><label>Dose</label><input id="mdD"><label>Times (comma, blank for PRN)</label><input id="mdT" placeholder="10:00"><div style="margin-top:10px"><button class="btn" id="mdAdd">Add</button></div></div></main>';return h;
}

function viewConf(){
  var R=[];function has(n){return S.compounds.some(function(c){return c.name.toLowerCase().indexOf(n)>-1&&!c.paused})}
  if(has("tirz")&&has("reta"))R.push(["bad","Tirzepatide and retatrutide both active","Pick one. Two GLP-1s stack nausea."]);
  if(S.meds.some(function(m){return /propranolol/i.test(m.name)}))R.push(["warn","Propranolol with PDE5 inhibitors","Blunts the tadalafil/sildenafil response and can drop BP. Dose it early, not right before."]);
  if(S.meds.some(function(m){return /doxy/i.test(m.name)}))R.push(["warn","Doxycycline chelates minerals","Keep calcium, magnesium, iron and dairy 2 h away. 10:00 isolated window."]);
  if(has("ghk")&&has("bpc"))R.push(["ok","GHK-Cu and BPC-157 in one barrel","Compatible. 25 mg GHK in 6 mL, draw 3 mL into the BPC 10 mg vial, dial 12 units."]);
  if(has("tirz")||has("reta"))R.push(["info","Incretin + orals","Orals hit faster on an empty stomach; GLP-1 slows gastric emptying. Expect variable onset."]);
  if(!R.length)R.push(["ok","No flags","Nothing in the active stack conflicts."]);
  var h=head("Interactions","Live rules on the active stack");
  h+='<main>'+R.map(function(r){return '<div class="card"><div class="row" style="border:0;padding:0"><div class="nm"><div class="l1"><b>'+esc(r[1])+'</b></div><div class="l2">'+esc(r[2])+'</div></div><span class="pill '+r[0]+'">'+r[0]+'</span></div></div>'}).join("");
  h+='</main>';return h;
}

function syncCfg(){try{return JSON.parse(localStorage.getItem(SKEY))||{}}catch(e){return {}}}
function viewSync(){
  var c=syncCfg();var hasG=!!(c.gistId&&c.gistId.trim());
  var h=head("Sync","Phone pushes, laptop pulls");
  h+='<main><div class="card"><h2>Gist</h2><div class="dim" style="margin-bottom:8px">Gist ID: '+esc(c.gistId||"not set")+'</div>';
  h+='<label>Token</label><input id="syT" value="'+esc(c.token||"")+'"><label>Gist ID</label><input id="syG" value="'+esc(c.gistId||"")+'">';
  h+='<div class="grid2" style="margin-top:10px"><button class="btn" id="syPush">Push</button><button class="btn alt" id="syPull"'+(hasG?"":" disabled")+'>Pull</button></div>';
  h+='<div class="tiny" style="margin-top:6px">'+(hasG?"":"No gist yet — Push will create one.")+'</div>';
  h+='<div style="margin-top:8px"><button class="btn alt sm" id="syNew">Create new gist</button> <button class="btn alt sm" id="syForget">Forget token</button></div>';
  h+='<div class="tiny" style="margin-top:8px">Last: '+esc(c.last||"never")+'</div></div></main>';return h;
}

function viewTools(){
  var h=head("Tools","Build "+BUILD);h+='<main><div class="card"><h2>Maintenance</h2>';
  h+='<button class="btn alt" id="tForce">Force refresh</button><div style="height:8px"></div>';
  h+='<button class="btn alt" id="tClear">Clear today\'s log</button><div style="height:8px"></div>';
  h+='<button class="btn alt" id="tExport">Export JSON</button><div style="height:8px"></div>';
  h+='<button class="btn alt" id="tImport">Import JSON</button>';
  h+='</div><div class="card"><h2>Data</h2><div class="dim">'+S.compounds.length+' compounds · '+S.meds.length+' meds · '+S.storage.length+' storage · '+Object.keys(S.done).length+' logged days</div></div></main>';return h;
}

function render(){
  try{
    var v;
    if(tab==="today")v=viewToday();
    else if(tab==="cal")v=viewCal();
    else if(tab==="body")v=viewBody();
    else if(tab==="labs")v=viewLabs();
    else if(tab==="sites")v=viewSites();
    else if(tab==="inv")v=viewInv();
    else if(tab==="storage")v=viewStorage();
    else if(tab==="meds")v=viewMeds();
    else if(tab==="conf")v=viewConf();
    else if(tab==="sync")v=viewSync();
    else if(tab==="tools")v=viewTools();
    else v=viewMore();
    document.getElementById("app").innerHTML=v;
    Array.prototype.forEach.call(document.querySelectorAll("nav a"),function(a){a.className=(a.getAttribute("href")==="#"+tab)?"on":""});
    bind();
  }catch(e){errBox(e)}
}

function modal(html){closeModal();var w=document.createElement("div");w.className="modal";w.id="mdl";w.innerHTML='<div class="sheet">'+html+'</div>';document.body.appendChild(w)}
function closeModal(){var m=document.getElementById("mdl");if(m)m.remove()}

function doseModal(id,ds){
  var c=S.compounds.find(function(x){return x.id===id});if(!c)return;
  var logged=isDone(ds,id);var cur=logged?(S.done[ds][id].mg||c.doseMg):c.doseMg;
  var html='<h3>'+esc(c.name)+'</h3><div class="dim">'+(ds===today()?"Today":esc(ds))+' · default '+n2(c.doseMg)+' '+esc(c.units||"mg")+' · '+esc(concLabel(c))+'</div><label>Dose</label><input id="dm" type="number" step="0.01" inputmode="decimal" value="'+n2(cur)+'"><div class="tiny" id="dout" style="margin-top:6px"></div><div style="height:12px"></div><button class="btn" id="dgo">'+(logged?"Update logged dose":"Log it")+'</button><div style="height:8px"></div><button class="btn alt" id="ddef">Reset to '+n2(c.doseMg)+' '+esc(c.units||"mg")+'</button>';
  if(logged)html+='<div style="height:12px"></div><label>Move to a different date</label><div class="grid2"><input id="dmv" type="date" value="'+ds+'"><button class="btn alt" id="dmvgo">Move</button></div>';
  html+='<div style="height:8px"></div><button class="btn alt" id="dcancel">Cancel</button>';
  modal(html);
  function upd(){var v=+document.getElementById("dm").value||0;document.getElementById("dout").textContent=v>0?(fmtU(unitsFor(c,v))+" u · "+n2(mlFor(c,v))+" mL"):"enter a dose"}
  document.getElementById("dm").oninput=upd;upd();
  document.getElementById("dgo").onclick=function(){var v=+document.getElementById("dm").value;if(!v||v<=0)return;logDose(id,ds,v);closeModal();render()};
  document.getElementById("ddef").onclick=function(){document.getElementById("dm").value=n2(c.doseMg);upd()};
  document.getElementById("dcancel").onclick=closeModal;
  if(logged)document.getElementById("dmvgo").onclick=function(){var to=document.getElementById("dmv").value;if(!to)return;var r=moveDose(id,ds,to);if(r==="occupied"){alert("That date already has a logged dose for this compound.");return}closeModal();render()};
}

function bind(){
  function q(s){return document.querySelector(s)}
  document.querySelectorAll("[data-log]").forEach(function(el){el.onclick=function(){var id=el.getAttribute("data-log");if(isDone(today(),id)){undoDose(id,today())}else{logDose(id,today())}render()}});
  document.querySelectorAll("[data-undo]").forEach(function(el){el.onclick=function(){undoDose(el.getAttribute("data-undo"),today());render()}});
  document.querySelectorAll("[data-skip]").forEach(function(el){el.onclick=function(){toggleSkip(el.getAttribute("data-skip"),today());render()}});
  document.querySelectorAll("[data-dose]").forEach(function(el){el.onclick=function(){var p=el.getAttribute("data-dose").split("|");doseModal(p[0],p[1])}});
  document.querySelectorAll("[data-med]").forEach(function(el){el.onclick=function(){var k=el.getAttribute("data-med"),d=today();S.medLog[d]=S.medLog[d]||{};if(S.medLog[d][k])delete S.medLog[d][k];else S.medLog[d][k]=Date.now();save();render()}});
  document.querySelectorAll("[data-medday]").forEach(function(el){el.onclick=function(){var p=el.getAttribute("data-medday").split("|"),k=p[0],d=p[1];S.medLog[d]=S.medLog[d]||{};if(S.medLog[d][k])delete S.medLog[d][k];else S.medLog[d][k]=Date.now();save();render()}});
  document.querySelectorAll("[data-logday]").forEach(function(el){el.onclick=function(){var p=el.getAttribute("data-logday").split("|");if(isDone(p[1],p[0]))undoDose(p[0],p[1]);else logDose(p[0],p[1]);render()}});
  document.querySelectorAll("[data-day]").forEach(function(el){el.onclick=function(){S.calDay=el.getAttribute("data-day");save();render()}});
  document.querySelectorAll("[data-deloo]").forEach(function(el){el.onclick=function(){S.oneoff=S.oneoff.filter(function(o){return o.id!==el.getAttribute("data-deloo")});save();render()}});
  document.querySelectorAll("[data-delst]").forEach(function(el){el.onclick=function(){S.storage.splice(+el.getAttribute("data-delst"),1);save();render()}});
  document.querySelectorAll("[data-delmed]").forEach(function(el){el.onclick=function(){S.meds.splice(+el.getAttribute("data-delmed"),1);save();render()}});
  document.querySelectorAll("[data-editmed]").forEach(function(el){el.onclick=function(){editMed(+el.getAttribute("data-editmed"))}});
  document.querySelectorAll("[data-site]").forEach(function(el){el.onclick=function(){var n=el.getAttribute("data-site");S.sites.forEach(function(s){if(s.n===n)s.last=today()});save();render()}});
  document.querySelectorAll("[data-lab]").forEach(function(el){el.onclick=function(){var n=el.getAttribute("data-lab");modal('<h3>'+esc(n)+'</h3><label>Value</label><input id="lv"><label>Date</label><input id="ld" type="date" value="'+today()+'"><div style="height:10px"></div><button class="btn" id="lgo">Save</button> <button class="btn alt" id="lcancel">Cancel</button>');document.getElementById("lgo").onclick=function(){var l=S.labs.find(function(x){return x.n===n});if(l){l.v.push({val:document.getElementById("lv").value,date:document.getElementById("ld").value});save()}closeModal();render()};document.getElementById("lcancel").onclick=closeModal}});
  document.querySelectorAll("[data-edit]").forEach(function(el){el.onclick=function(){editCompound(el.getAttribute("data-edit"))}});

  if(q("#bdSel")){
    var updBd=function(){var c=S.compounds.find(function(x){return x.id===q("#bdSel").value});if(!c)return;q("#bdDose").value=n2(c.doseMg);q("#bdOut").textContent=conc(c)?(fmtU(unitsFor(c,c.doseMg))+" u · "+n2(mlFor(c,c.doseMg))+" mL"):"no concentration set"};
    q("#bdSel").onchange=updBd;updBd();
    q("#bdDose").oninput=function(){var c=S.compounds.find(function(x){return x.id===q("#bdSel").value});if(!c)return;var v=+q("#bdDose").value||0;q("#bdOut").textContent=v>0?(fmtU(unitsFor(c,v))+" u · "+n2(mlFor(c,v))+" mL"):"enter a dose"};
    q("#bdGo").onclick=function(){
      var id=q("#bdSel").value,ds=q("#bdDate").value,mg=+q("#bdDose").value;if(!id||!ds)return;
      if(!logDose(id,ds,mg)){render();return}
      var c=S.compounds.find(function(x){return x.id===id});render();
      if(ds!==today()&&c&&occurs(c,today())&&!isDone(today(),id)&&!isSkip(today(),id)){
        modal('<h3>'+esc(c.name)+'</h3><div class="dim">Logged on '+esc(ds)+'. It is also scheduled today. Skip today\'s or keep both?</div><div style="height:12px"></div><button class="btn" id="mSkip">Skip today\'s</button><div style="height:8px"></div><button class="btn alt" id="mKeep">Keep both</button>');
        document.getElementById("mSkip").onclick=function(){toggleSkip(id,today());closeModal();render()};
        document.getElementById("mKeep").onclick=closeModal;
      }
    };
  }
  if(q("#ooGo"))q("#ooGo").onclick=function(){var n=q("#ooName").value.trim();if(!n)return;S.oneoff.push({id:uid(),name:n,date:q("#ooDate").value||today(),mg:+q("#ooMg").value||null});save();render()};
  if(q("#bSave"))q("#bSave").onclick=function(){var w=parseFloat(q("#bW").value),wa=parseFloat(q("#bWaist").value);if(!w&&!wa)return;var d=today(),ex=S.body.find(function(b){return b.date===d});if(ex){if(w)ex.w=w;if(wa)ex.waist=wa}else S.body.push({date:d,w:w||null,waist:wa||null});save();render()};
  if(q("#calPrev"))q("#calPrev").onclick=function(){var b=pd((S.calMonth||today().slice(0,7))+"-01");b.setMonth(b.getMonth()-1);S.calMonth=iso(b).slice(0,7);save();render()};
  if(q("#calNext"))q("#calNext").onclick=function(){var b=pd((S.calMonth||today().slice(0,7))+"-01");b.setMonth(b.getMonth()+1);S.calMonth=iso(b).slice(0,7);save();render()};
  if(q("#ncMode"))q("#ncMode").onchange=function(){var liq=q("#ncMode").value==="liquid";q("#ncPow").style.display=liq?"none":"block";q("#ncLiq").style.display=liq?"block":"none"};
  if(q("#ncAdd"))q("#ncAdd").onclick=function(){
    var n=q("#ncName").value.trim();if(!n)return;var mode=q("#ncMode").value;
    var c={id:uid(),name:n,n:n,mode:mode,units:q("#ncUnits").value,doseMg:+q("#ncDose").value||0,time:q("#ncTime").value||"",freq:q("#ncFreq").value,days:q("#ncFreq").value==="2xw"?[1,4]:[],start:today(),route:"subq"};
    if(mode==="liquid"){c.mgPerMl=+q("#ncConc").value||0;c.vialMl=+q("#ncVml").value||1;c.remainingMl=c.vialMl;if(!c.mgPerMl)c.needConc=true}
    else{c.vialMg=+q("#ncMg").value||0;c.bacMl=+q("#ncBac").value||1;c.remainingMl=c.bacMl}
    S.compounds.push(c);save();render();
  };
  if(q("#stAdd"))q("#stAdd").onclick=function(){var n=q("#stN").value.trim();if(!n)return;S.storage.push({n:n,qty:+q("#stQ").value||null,unit:q("#stU").value||""});save();render()};
  if(q("#mdAdd"))q("#mdAdd").onclick=function(){var n=q("#mdN").value.trim();if(!n)return;S.meds.push({n:n,name:n,dose:q("#mdD").value,times:q("#mdT").value.split(",").map(function(x){return x.trim()}).filter(Boolean)});save();render()};
  if(q("#syPush"))q("#syPush").onclick=async function(){
    var t=q("#syT").value.trim(),g=q("#syG").value.trim();if(!t)return alert("Token required");
    localStorage.setItem(SKEY,JSON.stringify({token:t,gistId:g,last:new Date().toLocaleString()}));
    if(!g){var cr=await fetch("https://api.github.com/gists",{method:"POST",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify({description:"Stack backup",public:false,files:{"stack.json":{content:JSON.stringify(S)}}})});if(!cr.ok)return alert("Create failed: "+cr.status);var cj=await cr.json();localStorage.setItem(SKEY,JSON.stringify({token:t,gistId:cj.id,last:new Date().toLocaleString()}));alert("Gist created and pushed.");render();return}
    var r=await fetch("https://api.github.com/gists/"+g,{method:"PATCH",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify({files:{"stack.json":{content:JSON.stringify(S)}}})});alert(r.ok?"Pushed.":"Push failed: "+r.status);render();
  };
  if(q("#syPull"))q("#syPull").onclick=async function(){
    var t=q("#syT").value.trim(),g=q("#syG").value.trim();if(!t||!g)return alert("Token and gist ID required");
    localStorage.setItem(SKEY,JSON.stringify({token:t,gistId:g,last:new Date().toLocaleString()}));
    var r=await fetch("https://api.github.com/gists/"+g,{headers:{Authorization:"Bearer "+t}});if(!r.ok)return alert("Pull failed: "+r.status);
    var j=await r.json(),f=j.files["stack.json"];if(!f)return alert("No stack.json in gist");
    S=JSON.parse(f.content);norm();save();alert("Pulled.");render();
  };
  if(q("#syNew"))q("#syNew").onclick=async function(){
    var t=q("#syT").value.trim();if(!t)return alert("Token required");
    var r=await fetch("https://api.github.com/gists",{method:"POST",headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:JSON.stringify({description:"Stack backup",public:false,files:{"stack.json":{content:JSON.stringify(S)}}})});if(!r.ok)return alert("Failed: "+r.status);
    var j=await r.json();localStorage.setItem(SKEY,JSON.stringify({token:t,gistId:j.id,last:new Date().toLocaleString()}));alert("Gist created.");render();
  };
  if(q("#syForget"))q("#syForget").onclick=function(){localStorage.removeItem(SKEY);render()};
  if(q("#tForce"))q("#tForce").onclick=async function(){
    if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage("skip");
    if("caches" in window){var ks=await caches.keys();await Promise.all(ks.map(function(k){return caches.delete(k)}))}
    var rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(function(r){return r.unregister()}));location.reload(true);
  };
  if(q("#tClear"))q("#tClear").onclick=function(){
    var d=today();
    Object.keys(S.done[d]||{}).forEach(function(id){var c=S.compounds.find(function(x){return x.id===id});if(c&&conc(c))c.remainingMl=(c.remainingMl||0)+mlFor(c,(S.done[d][id]||{}).mg||c.doseMg)});
    delete S.done[d];delete S.skips[d];delete S.medLog[d];save();render();
  };
  if(q("#tExport"))q("#tExport").onclick=function(){var b=new Blob([JSON.stringify(S,null,2)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="stack-"+today()+".json";a.click()};
  if(q("#tImport"))q("#tImport").onclick=function(){var i=document.createElement("input");i.type="file";i.accept=".json";i.onchange=function(){var f=i.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{S=JSON.parse(r.result);norm();save();render()}catch(e){alert("Bad file")}};r.readAsText(f)};i.click()};
}

function editCompound(id){
  var c=S.compounds.find(function(x){return x.id===id});if(!c)return;
  var liq=c.mode==="liquid";
  var sites=S.sites.map(function(s){return '<option value="'+esc(s.n)+'"'+(c.site===s.n?" selected":"")+'>'+esc(s.n)+'</option>'}).join("");
  var unitLabel=c.units==="IU"?"IU":(c.units==="mcg"?"mcg":"mg");
  modal('<h3>'+esc(c.name)+'</h3>'+
    '<label>Type</label><select id="eMode"><option value="powder"'+(liq?"":" selected")+'>powder vial</option><option value="liquid"'+(liq?" selected":"")+'>pre-mixed liquid</option></select>'+
    '<div id="ePow" style="display:'+(liq?"none":"block")+'"><div class="grid2"><div><label>Vial '+unitLabel+'</label><input id="eV" type="number" step="0.1" value="'+(c.vialMg||"")+'"></div><div><label>BAC mL</label><input id="eB" type="number" step="0.1" value="'+(c.bacMl||"")+'"></div></div></div>'+
    '<div id="eLiq" style="display:'+(liq?"block":"none")+'"><div class="grid2"><div><label>'+unitLabel+' per mL</label><input id="eC" type="number" step="0.1" value="'+(c.mgPerMl||"")+'"></div><div><label>Vial mL</label><input id="eVm" type="number" step="0.1" value="'+(c.vialMl||"")+'"></div></div></div>'+
    '<div class="grid2"><div><label>Dose</label><input id="eD" type="number" step="0.01" value="'+c.doseMg+'"></div><div><label>Units</label><select id="eUnits"><option value="mg"'+(c.units==="mg"?" selected":"")+'>mg</option><option value="mcg"'+(c.units==="mcg"?" selected":"")+'>mcg</option><option value="IU"'+(c.units==="IU"?" selected":"")+'>IU</option></select></div></div>'+
    '<div class="grid2"><div><label>Time</label><input id="eT" type="time" value="'+esc(c.time||"")+'"></div><div><label>Frequency</label><select id="eF">'+["daily","eod","2xw","weekly","prn","off"].map(function(f){return '<option value="'+f+'"'+(c.freq===f?" selected":"")+'>'+f+'</option>'}).join("")+'</select></div></div>'+
    '<label>Start date</label><input id="eS" type="date" value="'+esc(c.start)+'">'+
    '<label>Site</label><select id="eP"><option value="">—</option>'+sites+'</select>'+
    '<div style="height:12px"></div><button class="btn" id="eSave">Save</button><div style="height:8px"></div><button class="btn alt" id="eCancel">Cancel</button><div style="height:8px"></div><button class="btn alt" id="ePause">'+(c.paused?"Resume":"Pause")+'</button><div style="height:8px"></div><button class="btn bad" id="eDel">Delete</button>');
  document.getElementById("eMode").onchange=function(){
    var l=this.value==="liquid";
    document.getElementById("ePow").style.display=l?"none":"block";
    document.getElementById("eLiq").style.display=l?"block":"none";
    updateEditCompoundLabels(c);
  };
  document.getElementById("eUnits").onchange=function(){
    var u=this.value;
    var unitLabel=u==="IU"?"IU":(u==="mcg"?"mcg":"mg");
    var vLabel=document.getElementById("eV").parentElement.querySelector("label");
    var cLabel=document.getElementById("eC").parentElement.querySelector("label");
    if(vLabel)vLabel.textContent="Vial "+unitLabel;
    if(cLabel)cLabel.textContent=unitLabel+" per mL";
  };
  updateEditCompoundLabels(c);
  document.getElementById("eSave").onclick=function(){
    c.mode=document.getElementById("eMode").value;
    c.doseMg=+document.getElementById("eD").value||0;
    c.units=document.getElementById("eUnits").value;
    c.time=document.getElementById("eT").value||"";
    c.freq=document.getElementById("eF").value;c.start=document.getElementById("eS").value;c.site=document.getElementById("eP").value;
    if(c.mode==="liquid"){c.mgPerMl=+document.getElementById("eC").value||0;var vm=+document.getElementById("eVm").value||0;if(vm&&vm!==c.vialMl){c.vialMl=vm;c.remainingMl=vm}if(!c.vialMl)c.vialMl=1;if(c.mgPerMl)c.needConc=false}
    else{c.vialMg=+document.getElementById("eV").value||0;c.bacMl=+document.getElementById("eB").value||1}
    save();closeModal();render();
  };
  document.getElementById("eCancel").onclick=function(){closeModal();render()};
  document.getElementById("ePause").onclick=function(){c.paused=!c.paused;save();closeModal();render()};
  document.getElementById("eDel").onclick=function(){S.compounds=S.compounds.filter(function(x){return x.id!==id});save();closeModal();render()};
}

function updateEditCompoundLabels(c){
  var unitLabel=c.units==="IU"?"IU":(c.units==="mcg"?"mcg":"mg");
  var vLabel=document.getElementById("eV").parentElement.querySelector("label");
  var cLabel=document.getElementById("eC").parentElement.querySelector("label");
  if(vLabel)vLabel.textContent="Vial "+unitLabel;
  if(cLabel)cLabel.textContent=unitLabel+" per mL";
}

function editMed(i){
  var m=S.meds[i];if(!m)return;
  var prn=!m.times||!m.times.length;
  modal('<h3>'+esc(m.name)+'</h3>'+
    '<label>Dose</label><input id="emD" value="'+esc(m.dose)+'">'+
    '<label>Scheduled times (comma)</label><input id="emT" value="'+esc((m.times||[]).join(", "))+'">'+
    '<label><input type="checkbox" id="emPrn" style="width:auto;margin-right:6px"'+(prn?" checked":"")+'>As needed (PRN)</label>'+
    '<div style="height:12px"></div><button class="btn" id="emSave">Save</button><div style="height:8px"></div><button class="btn alt" id="emCancel">Cancel</button>');
  document.getElementById("emSave").onclick=function(){
    m.dose=document.getElementById("emD").value;
    var prnOn=document.getElementById("emPrn").checked;
    m.times=prnOn?[]:document.getElementById("emT").value.split(",").map(function(x){return x.trim()}).filter(Boolean);
    save();closeModal();render();
  };
  document.getElementById("emCancel").onclick=function(){closeModal();render()};
}

try{norm()}catch(e){errBox(e)}
render();
