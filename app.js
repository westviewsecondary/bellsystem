const $=s=>document.querySelector(s);

const lessonBtn=$("#lessonBtn");
const lockdownBtn=$("#lockdownBtn");
const fireBtn=$("#fireBtn");
const stopBtn=$("#stopBtn");
const status=$("#status");
const statusTitle=$("#statusTitle");
const statusText=$("#statusText");

const paths={
  lesson:"lesson-bell.mp3",
  lockdown:"lockdown-bell.mp3",
  fire:"fire-bell.mp3"
};

let token=0;
let activeAudio=null;
let ctx=null;
let fireSource=null;
let fireGain=null;
let fireBuffer=null;

function setStatus(title,text,on=false){
  statusTitle.textContent=title;
  statusText.textContent=text;
  status.classList.toggle("active",on);
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function stopHTMLAudio(){
  if(activeAudio){
    activeAudio.pause();
    activeAudio.currentTime=0;
    activeAudio=null;
  }
}

function stopFire(){
  if(fireSource){
    try{fireSource.stop()}catch{}
    try{fireSource.disconnect()}catch{}
    fireSource=null;
  }
  if(fireGain){
    try{fireGain.disconnect()}catch{}
    fireGain=null;
  }
}

function stopAll(show=true){
  token++;
  stopHTMLAudio();
  stopFire();
  if(show)setStatus("System stopped","All bell audio has been stopped.");
}

function playFile(path){
  return new Promise((resolve,reject)=>{
    const a=new Audio(path);
    activeAudio=a;
    a.preload="auto";
    a.onended=()=>{if(activeAudio===a)activeAudio=null;resolve()};
    a.onerror=()=>reject(new Error("Could not load "+path));
    a.play().catch(reject);
  });
}

async function ringRepeated(path,count,gap,label){
  stopAll(false);
  const my=token;
  setStatus(label,`${count} ring${count===1?"":"s"} in progress.`,true);
  for(let i=0;i<count;i++){
    if(my!==token)return;
    try{await playFile(path)}catch(e){
      setStatus("Audio error","Make sure the MP3 files were uploaded beside index.html.");
      return;
    }
    if(my!==token)return;
    if(i<count-1)await sleep(gap);
  }
  if(my===token)setStatus("System ready","Bell sequence complete.");
}

lessonBtn.onclick=()=>{
  const count=+$("#lessonCount").value;
  const gap=+$("#lessonGap").value;
  ringRepeated(paths.lesson,count,gap,"Lesson bell ringing");
};

lockdownBtn.onclick=async()=>{
  stopAll(false);
  const my=token;
  setStatus("LOCKDOWN BELL","Set 1 of 2 — seven rings",true);

  for(let set=1;set<=2;set++){
    if(my!==token)return;
    setStatus("LOCKDOWN BELL",`Set ${set} of 2 — seven rings`,true);

    for(let i=0;i<7;i++){
      if(my!==token)return;
      try{await playFile(paths.lockdown)}catch(e){
        setStatus("Audio error","Could not load lockdown-bell.mp3.");
        return;
      }
      if(my!==token)return;

      // Deliberate, audible space between the seven pulses.
      if(i<6)await sleep(430);
    }

    if(set===1){
      setStatus("LOCKDOWN BELL","Long pause — second set follows",true);
      await sleep(5200);
    }
  }

  if(my===token)setStatus("System ready","Lockdown bell pattern complete.");
};

async function ensureContext(){
  if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();
  if(ctx.state==="suspended")await ctx.resume();
}

async function loadFire(){
  if(fireBuffer)return fireBuffer;
  const response=await fetch(paths.fire,{cache:"force-cache"});
  const arr=await response.arrayBuffer();
  fireBuffer=await ctx.decodeAudioData(arr);
  return fireBuffer;
}

fireBtn.onclick=async()=>{
  stopAll(false);
  const my=token;
  setStatus("FIRE ALARM ACTIVE","Continuous bell — press STOP ALL to end.",true);

  try{
    await ensureContext();
    const buffer=await loadFire();
    if(my!==token)return;

    fireSource=ctx.createBufferSource();
    fireGain=ctx.createGain();
    fireGain.gain.value=1;
    fireSource.buffer=buffer;

    // Web Audio loops the decoded bell buffer directly.
    // There is NO programmed silence between loops.
    fireSource.loop=true;
    fireSource.loopStart=0.18;
    fireSource.loopEnd=Math.max(0.2,buffer.duration-0.18);
    fireSource.connect(fireGain);
    fireGain.connect(ctx.destination);
    fireSource.start();
  }catch(e){
    setStatus("Audio error","Could not start fire-bell.mp3. Check that all files are uploaded.");
  }
};

stopBtn.onclick=()=>stopAll(true);

document.querySelectorAll("[data-test]").forEach(btn=>{
  btn.onclick=async()=>{
    const type=btn.dataset.test;
    if(type==="fire"){
      stopAll(false);
      setStatus("Fire sound test","Playing a short sample.",true);
      try{
        const a=new Audio(paths.fire);
        activeAudio=a;
        await a.play();
        const my=token;
        setTimeout(()=>{
          if(my===token){
            a.pause();a.currentTime=0;
            if(activeAudio===a)activeAudio=null;
            setStatus("System ready","Fire sound test complete.");
          }
        },3500);
      }catch{
        setStatus("Audio error","Could not load fire-bell.mp3.");
      }
    }else{
      ringRepeated(paths[type],1,0,`${type[0].toUpperCase()+type.slice(1)} sound test`);
    }
  };
});

function tick(){
  const d=new Date();
  $("#clock").textContent=d.toLocaleTimeString("en-GB",{hour12:false});
  $("#date").textContent=d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
}
tick();setInterval(tick,1000);

window.addEventListener("beforeunload",()=>stopAll(false));
