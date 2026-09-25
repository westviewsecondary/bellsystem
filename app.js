const $ = s => document.querySelector(s);

const lessonBtn = $("#lessonBtn");
const lockdownBtn = $("#lockdownBtn");
const fireBtn = $("#fireBtn");
const stopAllBtn = $("#stopAll");
const repeatsEl = $("#lessonRepeats");
const gapEl = $("#lessonGap");
const statusCard = $("#statusCard");
const statusTitle = $("#statusTitle");
const statusText = $("#statusText");
const scheduleList = $("#scheduleList");

let audioCtx = null;
let customAudioURL = null;
let customAudio = null;
let running = false;
let stopToken = 0;
let fireTimer = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function setStatus(title, text, alert=false){
  statusTitle.textContent = title;
  statusText.textContent = text;
  statusCard.classList.toggle("alert", alert);
}

function synthBell(duration=650){
  ensureAudio();
  const now = audioCtx.currentTime;
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration/1000);
  master.connect(audioCtx.destination);

  [720, 1015, 1430].forEach((freq,i)=>{
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i === 0 ? "square" : "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(i*3, now);
    gain.gain.setValueAtTime(i===0 ? .52 : .22, now);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration/1000);
  });
}

async function oneRing(duration=650){
  if(customAudioURL){
    const a = new Audio(customAudioURL);
    a.volume = 1;
    try { await a.play(); } catch(e) { synthBell(duration); }
    await sleep(Math.min(duration, 900));
    a.pause();
    a.currentTime = 0;
  } else {
    synthBell(duration);
    await sleep(duration);
  }
}

async function lessonRing(count, gap=1000, label="Lesson bell"){
  if(running) stopAll();
  running = true;
  const myToken = ++stopToken;
  setStatus(label, `${count} ring${count===1?"":"s"} in progress.`, true);
  for(let i=0;i<count;i++){
    if(myToken !== stopToken) return;
    await oneRing(650);
    if(i < count-1) await sleep(gap);
  }
  if(myToken === stopToken){
    running=false;
    setStatus("System ready","No alarm is currently active.");
  }
}

async function lockdownPattern(){
  if(running) stopAll();
  running = true;
  const myToken = ++stopToken;
  setStatus("LOCKDOWN PATTERN","7 rings • pause • 7 rings",true);

  for(let set=0; set<2; set++){
    for(let i=0;i<7;i++){
      if(myToken !== stopToken) return;
      await oneRing(330);
      await sleep(240);
    }
    if(set===0) await sleep(2200);
  }
  if(myToken === stopToken){
    running=false;
    setStatus("System ready","Lockdown pattern completed.");
  }
}

async function fireLoop(){
  if(running) stopAll();
  running = true;
  const myToken = ++stopToken;
  setStatus("FIRE ALARM ACTIVE","Continuous alarm — press STOP ALL SOUNDS to end.",true);
  while(myToken === stopToken){
    await oneRing(760);
    if(myToken !== stopToken) break;
    await sleep(120);
  }
}

function stopAll(){
  stopToken++;
  running=false;
  if(fireTimer) clearInterval(fireTimer);
  if(customAudio){ customAudio.pause(); customAudio.currentTime=0; }
  setStatus("System stopped","All active bell sequences were cancelled.");
}

lessonBtn.addEventListener("click",()=>lessonRing(+repeatsEl.value,+gapEl.value));
lockdownBtn.addEventListener("click",lockdownPattern);
fireBtn.addEventListener("click",fireLoop);
stopAllBtn.addEventListener("click",stopAll);
$("#testAudio").addEventListener("click",()=>lessonRing(1,700,"Sound test"));

$("#audioFile").addEventListener("change",e=>{
  const f = e.target.files?.[0];
  if(!f) return;
  if(customAudioURL) URL.revokeObjectURL(customAudioURL);
  customAudioURL = URL.createObjectURL(f);
  $("#audioName").textContent = "Current sound: " + f.name;
});
$("#clearAudio").addEventListener("click",()=>{
  if(customAudioURL) URL.revokeObjectURL(customAudioURL);
  customAudioURL=null;
  $("#audioFile").value="";
  $("#audioName").textContent="Current sound: Built-in electronic school bell";
});

const defaultSchedule = [
  {time:"08:25",name:"Start of school",rings:2,enabled:true},
  {time:"08:30",name:"Tutor time",rings:1,enabled:true},
  {time:"09:20",name:"Period change",rings:2,enabled:true},
  {time:"10:10",name:"Period change",rings:2,enabled:true},
  {time:"11:15",name:"End of break",rings:2,enabled:true},
  {time:"12:05",name:"Period change",rings:2,enabled:true},
  {time:"13:40",name:"End of lunch",rings:2,enabled:true},
  {time:"15:00",name:"End of school",rings:3,enabled:true},
];
let schedule = JSON.parse(localStorage.getItem("bellSchedule") || "null") || defaultSchedule;
let firedToday = {};

function saveSchedule(){
  localStorage.setItem("bellSchedule",JSON.stringify(schedule));
}
function renderSchedule(){
  scheduleList.innerHTML="";
  schedule.forEach((item,idx)=>{
    const row=document.createElement("div");
    row.className="schedule-row";
    row.innerHTML=`
      <input type="time" value="${item.time}" data-k="time">
      <input type="text" value="${item.name.replaceAll('"','&quot;')}" data-k="name" aria-label="Bell name">
      <select data-k="rings">
        ${[1,2,3,4].map(n=>`<option value="${n}" ${+item.rings===n?"selected":""}>${n} ring${n>1?"s":""}</option>`).join("")}
      </select>
      <button class="remove" title="Delete">×</button>`;
    row.querySelectorAll("[data-k]").forEach(el=>{
      el.addEventListener("change",()=>{
        item[el.dataset.k] = el.dataset.k==="rings" ? +el.value : el.value;
        saveSchedule();
      });
    });
    row.querySelector(".remove").onclick=()=>{schedule.splice(idx,1);saveSchedule();renderSchedule()};
    scheduleList.appendChild(row);
  });
}
$("#addSchedule").onclick=()=>{
  schedule.push({time:"09:00",name:"Lesson bell",rings:2,enabled:true});
  saveSchedule();renderSchedule();
};
renderSchedule();

function tickClock(){
  const d=new Date();
  $("#clock").textContent=d.toLocaleTimeString("en-GB",{hour12:false});
  $("#dateLabel").textContent=d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  const hhmm=d.toTimeString().slice(0,5);
  const dayKey=d.toISOString().slice(0,10);
  schedule.forEach((item,idx)=>{
    const key=`${dayKey}-${idx}-${item.time}`;
    if(item.time===hhmm && !firedToday[key]){
      firedToday[key]=true;
      lessonRing(+item.rings,1000,item.name || "Scheduled lesson bell");
    }
  });
  Object.keys(firedToday).forEach(k=>{if(!k.startsWith(dayKey)) delete firedToday[k]});
}
tickClock();
setInterval(tickClock,1000);

window.addEventListener("beforeunload",()=>{
  if(customAudioURL) URL.revokeObjectURL(customAudioURL);
});
