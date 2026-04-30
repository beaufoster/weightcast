import posthog from 'posthog-js';
import { sb } from './supabase.js';

// ══ TEST ENVIRONMENT ═══════════════════════════════
const IS_TEST = new URLSearchParams(window.location.search).get('env') === 'test';
// Owner/dev mode — disables analytics + recordings. Enable once per device: trimly/?dev=owner
const DEV_PARAM = new URLSearchParams(window.location.search).get('dev');
if(DEV_PARAM==='owner') localStorage.setItem('trimly_owner_mode','1');
if(DEV_PARAM==='off') localStorage.removeItem('trimly_owner_mode');
const IS_OWNER = !!localStorage.getItem('trimly_owner_mode');
const STORE = IS_TEST ? 'trimly_test_' : 'tr_';
if(IS_TEST){
  document.body.classList.add('is-test');
  const bar=document.getElementById('test-env-bar');
  if(bar)bar.style.display='block';
}

// ══ POSTHOG ANALYTICS ══════════════════════════════
const PH_KEY = 'phc_uANfyidyehw2qkveadqRKqyoJQheqT3Vo5r8iEKxTRvc';
// Stable anonymous device ID — lets PostHog do retention analysis before sign-in
let _deviceId = localStorage.getItem('trimly_device_id');
if(!_deviceId){_deviceId='dev_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36);localStorage.setItem('trimly_device_id',_deviceId);}
const ph = {
  identify(id,props){if(IS_TEST||IS_OWNER||PH_KEY==='YOUR_POSTHOG_KEY')return;try{posthog.identify(id,props);}catch(e){}},
  capture(event,props={}){
    if(IS_TEST||IS_OWNER||PH_KEY==='YOUR_POSTHOG_KEY'){if(IS_TEST||IS_OWNER)console.log('[Analytics suppressed]',event,props);return;}
    try{posthog.capture(event,{...props,env:'production',streak:calcStreak(),has_checkins:checkins.length,plan_mode:calcMode});}catch(e){}
  },
  reset(){if(IS_TEST||IS_OWNER)return;try{posthog.reset();}catch(e){}}
};
// ══ STATE ══════════════════════════════════════════
let pace='steady', calcMode='weight', _paceOnly=false, currentUser=null, _syncInFlight=false, _syncTimer=null, _otpEmail='';
const KG_TO_LBS=2.20462;
let unitPref=localStorage.getItem(STORE+'unit')||'lbs';
let _editId=null;
let checkins=JSON.parse(localStorage.getItem(STORE+'checkins')||'[]');
let planData=JSON.parse(localStorage.getItem(STORE+'plan')||'null');
let prevGoalDate=planData?planData.goalDate:null;
let celebratedMilestones=JSON.parse(localStorage.getItem(STORE+'celebrated')||'[]');
let userName=localStorage.getItem(STORE+'name')||'';
const savedForm=JSON.parse(localStorage.getItem(STORE+'form')||'null');

const paceConfigs={
  gentle:{max:0.5,label:'Gentle pace',desc:'≤ 0.5 lb/week. Great for long-term habits with minimal restriction.'},
  steady:{max:1.0,label:'Steady pace',desc:'0.5–1 lb/week is sustainable and preserves muscle.'},
  aggressive:{max:2.0,label:'Aggressive pace',desc:'1–2 lb/week. 2 lb/wk is the safe maximum.'}
};
const actLabels=['Sedentary','Lightly Active','Moderately Active','Very Active'];
const actMults=[1.2,1.375,1.55,1.725];

// ══ UTILS ══════════════════════════════════════════
const $=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString();
const fmtD=(n,d=1)=>(+n).toFixed(d);
const escapeHtml=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function addWeeks(d,w){const x=new Date(d);x.setDate(x.getDate()+Math.round(w*7));return x;}
function fmtDate(d){return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function calcBMR(wt,ht,age,sex){const kg=wt*0.453592,cm=ht*2.54;return sex==='male'?10*kg+6.25*cm-5*age+5:10*kg+6.25*cm-5*age-161;}
function toLbs(v){return unitPref==='kg'?v*KG_TO_LBS:v;}
function fromLbs(v){return unitPref==='kg'?v/KG_TO_LBS:v;}
function fmtWt(lbs,d=1){return fmtD(fromLbs(lbs),d)+' '+unitPref;}

// ══ NAME PROMPT ═════════════════════════════════════
function showNamePrompt(){
  const overlay=$('name-prompt-overlay');
  if(overlay) overlay.classList.add('show');
  setTimeout(()=>$('name-input').focus(),300);
}
function saveName(skip=false){
  const val=skip?'':($('name-input').value.trim());
  userName=val;
  localStorage.setItem(STORE+'name',val);
  const overlay=$('name-prompt-overlay');
  if(overlay) overlay.classList.remove('show');
  updateHeroGreeting();
  if(val) ph.capture('name_entered',{name_length:val.length});
}
function updateHeroGreeting(){
  const el=$('hero-greeting');
  if(!el) return;
  if(userName) el.textContent=`Hey ${userName}! Adjust your plan and watch the results update live.`;
  else el.textContent='Adjust diet & exercise — watch your results update live.';
}

// ══ DEMO MODE ═══════════════════════════════════════
function loadDemo(){
  $('cw').value=fmtD(fromLbs(218));$('gw').value=fmtD(fromLbs(180));$('age').value=34;$('ht-ft').value=5;$('ht-in').value=9;$('sex').value='male';
  $('calSl').value=1750;$('walkSl').value=45;$('liftSl').value=3;$('cardioSl').value=2;$('actSl').value=2;
  // Add 3 demo check-ins
  const today=new Date();
  const demo=[
    {id:1001,date:new Date(today-14*24*3600*1000).toISOString().split('T')[0],weight:218,note:'Starting weight'},
    {id:1002,date:new Date(today-7*24*3600*1000).toISOString().split('T')[0],weight:215.5,note:'Good week, walked daily'},
    {id:1003,date:today.toISOString().split('T')[0],weight:213.8,note:'Feeling great'},
  ];
  checkins=[...demo];
  localStorage.setItem(STORE+'checkins',JSON.stringify(checkins));
  celebratedMilestones=[];
  localStorage.setItem(STORE+'celebrated',JSON.stringify(celebratedMilestones));
  calculate();
  ph.capture('demo_loaded');
}

// ══ SHARE CARD ══════════════════════════════════════
function openShareModal(){
  renderShareCard();
  const ov=$('share-overlay');
  if(ov) ov.classList.add('open');
  ph.capture('share_card_opened',{streak:calcStreak(),has_plan:!!planData});
}
function closeShareModal(){
  const ov=$('share-overlay');
  if(ov) ov.classList.remove('open');
}
function renderShareCard(){
  const canvas=$('share-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const W=600,H=400;
  canvas.width=W;canvas.height=H;
  // Background gradient
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#161613');bg.addColorStop(1,'#0d3d24');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // Grain overlay
  ctx.fillStyle='rgba(255,255,255,0.015)';
  for(let i=0;i<2000;i++){ctx.fillRect(Math.random()*W,Math.random()*H,1,1);}
  // Logo
  ctx.font='bold 22px Georgia,serif';ctx.fillStyle='#4abe7e';ctx.textAlign='left';
  ctx.fillText('Trimly',32,48);
  // Main stat
  const plan=planData;
  const lostLbs=plan&&checkins.length?+(plan.cw-([...checkins].sort((a,b)=>new Date(b.date)-new Date(a.date))[0].weight)).toFixed(1):0;
  const streak=calcStreak();
  ctx.font='bold 88px Georgia,serif';ctx.fillStyle='#fff';ctx.textAlign='center';
  ctx.fillText(lostLbs>0?`-${lostLbs}`:plan?`${plan.cw-plan.gw}`:`?`,W/2,H/2-10);
  ctx.font='bold 24px DM Sans,sans-serif';ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.fillText('lbs '+(lostLbs>0?'lost so far':'goal'),W/2,H/2+30);
  // Streak
  if(streak>0){
    ctx.font='bold 18px DM Sans,sans-serif';ctx.fillStyle='#f59e0b';ctx.textAlign='center';
    ctx.fillText(`🔥 ${streak}-week streak`,W/2,H/2+68);
  }
  // Plan details
  if(plan){
    ctx.font='15px DM Sans,sans-serif';ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.textAlign='center';
    const goalDate=new Date(plan.goalDate);
    ctx.fillText(`Goal: ${plan.gw} lbs by ${fmtDate(goalDate)}`,W/2,H-52);
  }
  // User name
  const name=userName||'';
  if(name){ctx.font='bold 15px DM Sans,sans-serif';ctx.fillStyle='rgba(255,255,255,0.4)';ctx.textAlign='right';ctx.fillText(name,W-32,H-32);}
  // Tagline
  ctx.font='13px DM Sans,sans-serif';ctx.fillStyle='rgba(255,255,255,0.25)';
  ctx.textAlign='center';ctx.fillText('beaufoster.github.io/trimly',W/2,H-28);
  // Scale canvas display
  canvas.style.width='100%';canvas.style.height='auto';
}
function downloadShareCard(){
  const canvas=$('share-canvas');
  if(!canvas) return;
  const link=document.createElement('a');
  link.download='trimly-progress.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
  ph.capture('share_card_downloaded');
}

// ══ CONFETTI ════════════════════════════════════════
function launchConfetti(duration=3000){
  const canvas=$('confetti-canvas');
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const particles=[];
  const colors=['#1a6b42','#4abe7e','#f59e0b','#ef4444','#3b82f6','#a855f7','#ec4899'];
  for(let i=0;i<120;i++){
    particles.push({
      x:Math.random()*canvas.width,y:-20,
      vx:(Math.random()-0.5)*6,vy:Math.random()*4+2,
      color:colors[Math.floor(Math.random()*colors.length)],
      w:Math.random()*10+4,h:Math.random()*6+3,
      rot:Math.random()*360,vr:(Math.random()-0.5)*8,
      alpha:1
    });
  }
  const end=Date.now()+duration;
  function frame(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const now=Date.now();
    const progress=(now-(end-duration))/duration;
    particles.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.rot+=p.vr;
      p.alpha=progress>0.7?1-(progress-0.7)/0.3:1;
      ctx.save();ctx.globalAlpha=p.alpha;
      ctx.translate(p.x+p.w/2,p.y+p.h/2);
      ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    if(now<end)requestAnimationFrame(frame);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  frame();
}

// ══ CELEBRATION ══════════════════════════════════════
function celebrate(emoji,title,sub){
  $('cel-emoji').textContent=emoji;
  $('cel-title').textContent=title;
  $('cel-sub').textContent=sub;
  $('celebrate-overlay').classList.add('show');
  launchConfetti(4000);
}
function dismissCelebration(){
  $('celebrate-overlay').classList.remove('show');
}

// ══ STREAK ══════════════════════════════════════════
function calcStreak(){
  if(!checkins.length)return 0;
  const sorted=[...checkins].sort((a,b)=>new Date(b.date)-new Date(a.date));
  let streak=1;
  for(let i=1;i<sorted.length;i++){
    const d1=new Date(sorted[i-1].date+'T12:00');
    const d2=new Date(sorted[i].date+'T12:00');
    const diff=(d1-d2)/(7*24*3600*1000);
    if(diff>=0.5&&diff<=1.8)streak++;
    else break;
  }
  // Check if most recent check-in is within last 10 days (streak still alive)
  const lastDate=new Date(sorted[0].date+'T12:00');
  const daysSince=(new Date()-lastDate)/(24*3600*1000);
  if(daysSince>10)return 0;
  return streak;
}

function renderStreakUI(){
  const streak=calcStreak();
  // Tab badge
  const badge=$('streak-tab-badge');
  if(streak>0){badge.textContent=streak;badge.classList.remove('hidden');}
  else badge.classList.add('hidden');
  // Hero pill
  const pill=$('hero-streak-pill');
  const pillNum=$('hero-streak-num');
  if(streak>0){pillNum.textContent=streak;pill.classList.remove('hidden');}
  else pill.classList.add('hidden');
  // Streak card
  const card=$('streak-card');
  const numEl=$('streak-num');
  const nextEl=$('streak-next');
  if(streak>0){
    card.classList.remove('hidden');
    numEl.textContent=streak;
    const milestones=[4,8,13,26,52];
    const next=milestones.find(m=>m>streak);
    nextEl.textContent=next?`🎯 ${next-streak} more week${next-streak===1?'':'s'} to ${next}-week badge!`:'🏆 You\'re a legend!';
  } else {
    card.classList.add('hidden');
  }
  // NOTE: streak milestone celebrations are handled only in addCheckin()
  // NOT here — renderStreakUI fires on every calculate() call
}

// ══ PLATEAU DETECTION ════════════════════════════════
function detectPlateau(){
  if(checkins.length<3){$('plateau-banner').classList.add('hidden');return;}
  const sorted=[...checkins].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const recent=sorted.slice(-4);
  const weights=recent.map(c=>c.weight);
  const range=Math.max(...weights)-Math.min(...weights);
  const isPlateau=range<1.5&&recent.length>=3;
  const pb=$('plateau-banner');
  if(isPlateau){
    pb.classList.remove('hidden');
    const weeksStuck=recent.length;
    $('plateau-msg').textContent=`Your weight has barely moved over the last ${weeksStuck} check-ins (${fmtWt(Math.min(...weights))}–${fmtWt(Math.max(...weights))}). This is normal and fixable.`;
    $('plateau-tips').innerHTML=`
      <div class="plateau-tip"><span class="plateau-tip-ico">🥗</span><span>Try cutting 100–150 more calories per day for 2 weeks.</span></div>
      <div class="plateau-tip"><span class="plateau-tip-ico">🚶</span><span>Add 15 minutes of walking to your daily routine.</span></div>
      <div class="plateau-tip"><span class="plateau-tip-ico">💪</span><span>Add one more strength session per week to rebuild your deficit.</span></div>
      <div class="plateau-tip"><span class="plateau-tip-ico">😴</span><span>Prioritize sleep — poor sleep slows fat loss significantly.</span></div>
    `;
  } else {
    pb.classList.add('hidden');
  }
}

// ══ OCCASION ════════════════════════════════════════
function setOccasion(el,name,monthsAhead){
  document.querySelectorAll('.occasion-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  const d=new Date();d.setMonth(d.getMonth()+monthsAhead);
  $('goalDate').value=d.toISOString().split('T')[0];
  calculate();
}

// ══ MODE SWITCH ══════════════════════════════════════
function setMode(m){
  calcMode=m;
  $('mode-weight').classList.toggle('active',m==='weight');
  $('mode-date').classList.toggle('active',m==='date');
  $('gw-field').style.display=m==='weight'?'':'none';
  $('occasion-section').style.display=m==='date'?'':'none';
  if(m==='date'&&!$('goalDate').value){
    const d=new Date();d.setMonth(d.getMonth()+3);
    $('goalDate').value=d.toISOString().split('T')[0];
  }
  $('r-hero-label').textContent=m==='date'?'You Could Reach':'Time to Goal';
  calculate();
}

// ══ GOAL DATE DELTA ══════════════════════════════════
function updateGoalDateDelta(newGoalDateStr){
  const el=$('date-delta');
  if(!prevGoalDate||!newGoalDateStr){el.classList.add('hidden');prevGoalDate=newGoalDateStr;return;}
  const prev=new Date(prevGoalDate);
  const curr=new Date(newGoalDateStr);
  const daysDiff=Math.round((prev-curr)/(24*3600*1000));
  if(Math.abs(daysDiff)<1){el.classList.add('hidden');}
  else if(daysDiff>0){
    el.textContent=`📅 ${daysDiff} day${daysDiff===1?'':'s'} closer!`;
    el.className='date-delta closer';
  } else {
    el.textContent=`📅 ${Math.abs(daysDiff)} day${Math.abs(daysDiff)===1?'':'s'} further`;
    el.className='date-delta';
  }
  prevGoalDate=newGoalDateStr;
}

// ══ PROGRESS SNAPSHOT ════════════════════════════════
function renderProgressSnap(){
  const plan=JSON.parse(localStorage.getItem(STORE+'plan')||'null');
  const snap=$('progress-snap');
  if(!checkins.length||!plan){snap.classList.remove('visible');return;}
  snap.classList.add('visible');
  const sorted=[...checkins].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const latest=sorted[sorted.length-1];
  const startWt=plan.cw,goalWt=plan.gw;
  const totalToLose=startWt-goalWt;
  const actualLost=+(startWt-latest.weight).toFixed(1);
  const pctDone=totalToLose>0?Math.min(100,Math.max(0,(actualLost/totalToLose)*100)):0;
  const origin=new Date(plan.savedAt);
  const weeksElapsed=Math.max(0,Math.round((new Date()-origin)/(7*24*3600*1000)));
  let projectedLost=0;
  if(plan.sim&&plan.sim.length){
    const simAt=plan.sim.find(s=>s.week>=weeksElapsed);
    const projWt=simAt?simAt.weight:plan.sim[plan.sim.length-1].weight;
    projectedLost=+(startWt-projWt).toFixed(1);
  }
  const projPct=totalToLose>0?Math.min(100,Math.max(0,(projectedLost/totalToLose)*100)):0;
  const diff=actualLost-projectedLost;
  let bCls='on',bTxt='😊 On Track';
  if(diff>0.5){bCls='ahead';bTxt='🔥 Ahead!';}
  else if(diff>=-1.0){bCls='close';bTxt='👍 Almost There';}
  else{bCls='behind';bTxt='Keep Going 💪';}
  $('snap-start').textContent=fmtWt(startWt);
  $('snap-current').textContent=fmtWt(latest.weight);
  $('snap-lost').textContent=(actualLost>=0?'-':'+')+fmtWt(Math.abs(actualLost));
  $('snap-start-lbl').textContent=fmtWt(startWt);
  $('snap-goal-lbl').textContent=fmtWt(goalWt);
  $('snap-pct').textContent=Math.round(pctDone)+'%';
  $('snap-fill').style.width=pctDone+'%';
  $('snap-proj-marker').style.left=projPct+'%';
  $('snap-weeks-done').textContent='Week '+weeksElapsed;
  $('snap-pace-detail').textContent=diff>=0?fmtWt(Math.abs(diff))+' ahead':fmtWt(Math.abs(diff))+' behind';
  const badge=$('snap-badge');
  badge.className='pace-badge '+bCls;badge.textContent=bTxt;
}

// ══ SIMULATE ════════════════════════════════════════
function simulateLoss(startWt,goalWt,calIntake,exPerDay,actMult,age,ht,sex,maxLbs){
  const weeks=[];let wt=startWt,w=0;
  while(wt>goalWt+0.05&&w<520){
    const bmr=calcBMR(wt,ht,age,sex);
    const tdee=bmr*actMult+exPerDay;
    const safe=Math.max(calIntake,1200);
    let def=Math.min(Math.max(tdee-safe,0),maxLbs*3500/7);
    const lb=Math.min((def*7)/3500,wt-goalWt);
    wt=Math.max(wt-lb,goalWt);
    weeks.push({week:w+1,weight:+wt.toFixed(1)});
    w++;
  }
  return weeks;
}

// ══ CALCULATE ════════════════════════════════════════
function calculate(){
  const cw=Math.max(toLbs(parseFloat($('cw').value)||210),50);
  const age=parseInt($('age').value)||35;
  const ht=((parseInt($('ht-ft').value)||5)*12)+(parseInt($('ht-in').value)||10);
  const sex=$('sex').value;
  const cal=parseInt($('calSl').value);
  const walk=parseInt($('walkSl').value);
  const lift=parseInt($('liftSl').value);
  const cardio=parseInt($('cardioSl').value);
  const actIdx=parseInt($('actSl').value)-1;
  $('cal-v').textContent=fmt(cal);$('walk-v').textContent=walk;$('lift-v').textContent=lift;$('cardio-v').textContent=cardio;$('act-v').textContent=actLabels[actIdx];
  $('cal-warn').style.display=cal<1200?'flex':'none';
  const bmr0=calcBMR(cw,ht,age,sex);
  const tdee0=bmr0*actMults[actIdx];
  const exPerDay=walk*3.5+(lift*300)/7+(cardio*500)/7;
  const safeCal=Math.max(cal,1200);
  const def0=Math.max(tdee0+exPerDay-safeCal,0);
  $('tdee-disp').textContent=fmt(tdee0)+' cal';
  $('cb-tdee').textContent=fmt(tdee0)+' cal';$('cb-ex').textContent='+'+fmt(exPerDay)+' cal';$('cb-in').textContent='−'+fmt(safeCal)+' cal';$('cb-def').textContent=fmt(def0)+' cal';
  $('r-exburn').textContent=fmt(exPerDay);$('r-deficit').textContent=fmt(def0);
  renderProgressSnap();renderStreakUI();detectPlateau();

  if(calcMode==='date'){
    const dateVal=$('goalDate').value;
    if(!dateVal){$('r-weeks').textContent='—';$('r-weeks-lbl').textContent='Pick a date';return;}
    const targetDate=new Date(dateVal+'T12:00');
    const weeksAvail=Math.max(0,Math.round((targetDate-new Date())/(7*24*3600*1000)));
    if(weeksAvail<1){$('r-weeks').textContent='😅';$('r-weeks-lbl').textContent='Pick a future date';$('r-date').textContent=fmtDate(targetDate);$('r-loss').textContent='—';$('r-rate').textContent='—';return;}
    const maxLbs=paceConfigs[pace].max;
    const sim=[];let wtS=cw;
    for(let w=1;w<=weeksAvail;w++){
      const bmrW=calcBMR(wtS,ht,age,sex);
      const tdeeW=bmrW*actMults[actIdx]+exPerDay;
      let def=Math.min(Math.max(tdeeW-safeCal,0),maxLbs*3500/7);
      wtS=Math.max(wtS-(def*7/3500),50);
      sim.push({week:w,weight:+wtS.toFixed(1)});
    }
    const projWt=+wtS.toFixed(1);
    const totalLost=+(cw-projWt).toFixed(1);
    const avgRate=+(totalLost/weeksAvail).toFixed(1);
    $('r-weeks').textContent=fmtWt(projWt);
    $('r-weeks-lbl').textContent=`in ${weeksAvail} wks`;
    const gds=targetDate.toISOString();
    updateGoalDateDelta(gds);
    $('r-date').textContent=fmtDate(targetDate);$('r-rate').textContent=fmtWt(avgRate,2)+'/wk avg';$('r-loss').textContent=fmtWt(totalLost);
    renderMilestones(cw,projWt,avgRate,sim);renderProjChart(sim,cw,projWt);
    planData={cw,gw:projWt,sim,cal:safeCal,exPerDay,goalDate:gds,savedAt:planData?.savedAt||new Date().toISOString(),mode:'date'};
    if(!_paceOnly){
      localStorage.setItem(STORE+'plan',JSON.stringify(planData));
      localStorage.setItem(STORE+'form',JSON.stringify({
        cw:$('cw').value,gw:$('gw').value,age:$('age').value,
        htFt:$('ht-ft').value,htIn:$('ht-in').value,sex:$('sex').value,
        cal:$('calSl').value,walk:$('walkSl').value,lift:$('liftSl').value,
        cardio:$('cardioSl').value,act:$('actSl').value,
        goalDate:$('goalDate').value,pace,mode:calcMode
      }));
      scheduleSyncUp();
    }
    return;
  }

  const gw=Math.max(toLbs(parseFloat($('gw').value)||175),30);
  const totalLoss=+Math.max(cw-gw,0).toFixed(1);
  $('r-loss').textContent=fmtWt(totalLoss);
  if(totalLoss<=0){$('r-weeks').textContent='🎉';$('r-weeks-lbl').textContent='Already there!';$('r-date').textContent='—';$('r-rate').textContent='—';renderMilestones(cw,gw,0,[]);renderProjChart([],cw,gw);return;}
  const sim=simulateLoss(cw,gw,cal,exPerDay,actMults[actIdx],age,ht,sex,paceConfigs[pace].max);
  if(!sim.length||def0<50){$('r-weeks').textContent='∞';$('r-weeks-lbl').textContent='Increase deficit';$('r-date').textContent='—';$('r-rate').textContent='—';renderMilestones(cw,gw,0,sim);renderProjChart(sim,cw,gw);return;}
  const avgRate=totalLoss/sim.length;
  const goalDate=addWeeks(new Date(),sim.length);
  $('r-weeks').textContent=sim.length;$('r-weeks-lbl').textContent=`weeks (~${Math.ceil(sim.length/4.33)} mo)`;
  const gds=goalDate.toISOString();
  updateGoalDateDelta(gds);
  $('r-date').textContent=fmtDate(goalDate);$('r-rate').textContent=fmtWt(avgRate,2)+'/wk avg';
  renderMilestones(cw,gw,avgRate,sim);renderProjChart(sim,cw,gw);
  planData={cw,gw,sim,cal:safeCal,exPerDay,goalDate:gds,savedAt:planData?.savedAt||new Date().toISOString(),mode:'weight'};
  if(!_paceOnly){
    localStorage.setItem(STORE+'plan',JSON.stringify(planData));
    localStorage.setItem(STORE+'form',JSON.stringify({
      cw:$('cw').value,gw:$('gw').value,age:$('age').value,
      htFt:$('ht-ft').value,htIn:$('ht-in').value,sex:$('sex').value,
      cal:$('calSl').value,walk:$('walkSl').value,lift:$('liftSl').value,
      cardio:$('cardioSl').value,act:$('actSl').value,
      goalDate:$('goalDate').value,pace,mode:calcMode
    }));
    scheduleSyncUp();
  }
}

// ══ MILESTONES ════════════════════════════════════════
// ══ MILESTONE CELEBRATIONS ═══════════════════════════
// Called ONLY after a new check-in is logged — never on slider moves
function checkMilestonesAfterCheckin(){
  const plan=planData||JSON.parse(localStorage.getItem(STORE+'plan')||'null');
  if(!plan||!checkins.length) return;
  const sorted=[...checkins].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const latest=sorted[sorted.length-1];
  // Use the ORIGINAL plan start weight, not current slider value
  const startWt=plan.cw;
  const goalWt=plan.gw;
  const totalLoss=startWt-goalWt;
  if(totalLoss<=0) return;
  const actualLost=startWt-latest.weight;
  const pcts=[0.1,0.25,0.5,0.75,1.0];
  const emojis=['🌱','💪','⭐','🔥','🏆'];
  const titles=['10% Down!','Quarter Way!','Halfway There!','Almost Done!','Goal Reached!'];
  const subs=[
    `You've lost ${(totalLoss*0.1).toFixed(1)} lbs. The hardest part is behind you.`,
    `${(totalLoss*0.25).toFixed(1)} lbs down. You're building real momentum now.`,
    `${(totalLoss*0.5).toFixed(1)} lbs lost. You're exactly halfway to your goal!`,
    `${(totalLoss*0.75).toFixed(1)} lbs gone. The finish line is in sight!`,
    `You reached your goal weight! That's incredible. 🎉`
  ];
  // Use a stable key based on the original plan start/goal, not current slider values
  let delay=400;
  pcts.forEach((p,i)=>{
    const needed=totalLoss*p;
    const key=`ms-${Math.round(startWt*10)}-${Math.round(goalWt*10)}-${i}`;
    if(actualLost>=needed && !celebratedMilestones.includes(key)){
      celebratedMilestones.push(key);
      localStorage.setItem(STORE+'celebrated',JSON.stringify(celebratedMilestones));
      setTimeout(()=>celebrate(emojis[i],titles[i],subs[i]), delay);
      ph.capture('milestone_celebrated',{milestone:titles[i],pct:Math.round(p*100)});
      delay+=200; // stagger if multiple hit at once
    }
  });
}

function renderMilestones(cw,gw,rate,sim){
  const totalLoss=cw-gw;
  if(totalLoss<=0){$('ms-list').innerHTML='<div style="color:var(--gray);font-size:0.82rem;text-align:center;padding:10px;">You\'re already at goal! 🎉</div>';return;}
  const pcts=[0.1,0.25,0.5,0.75,1.0];
  const labels=['10% Lost','25% Lost','Halfway!','75% Done','🏆 Goal!'];
  const icons=['🌱','💪','⭐','🔥','🏆'];
  // NOTE: milestone celebrations are checked only in checkMilestonesAfterCheckin()
  // NOT here — this function fires on every slider moves
  let html='';
  pcts.forEach((p,i)=>{
    const lostTarget=totalLoss*p,targetWt=cw-lostTarget;
    let wk=0;
    for(let j=0;j<sim.length;j++){if(sim[j].weight<=targetWt+0.5){wk=sim[j].week;break;}}
    if(!wk&&sim.length)wk=sim[sim.length-1].week;
    const date=addWeeks(new Date(),wk);
    const cls=i===0?'active':'';
    html+=`<div class="ms ${cls}"><div class="ms-dot">${icons[i]}</div><div class="ms-info"><div class="mn">${labels[i]}</div><div class="md">Week ${wk} · ${fmtDate(date)}</div></div><div class="ms-wt">${Math.round(targetWt*10)/10} lbs</div></div>`;
  });
  $('ms-list').innerHTML=html;
}

// ══ PROJECTION CHART ══════════════════════════════════
function renderProjChart(sim,cw,gw){
  const canvas=$('projChart');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.parentElement.offsetWidth||340;canvas.height=160;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!sim.length)return;
  const W=canvas.width,H=canvas.height;
  const pad={top:14,right:14,bottom:26,left:42};
  const cW=W-pad.left-pad.right,cH=H-pad.top-pad.bottom;
  const step=Math.max(1,Math.floor(sim.length/14));
  const pts=sim.filter((_,i)=>i%step===0||i===sim.length-1);
  const allPts=[{week:0,weight:cw},...pts];
  const allW=allPts.map(p=>p.weight);
  const minV=Math.min(...allW)-3,maxV=Math.max(...allW)+3;
  function xP(i,n){return pad.left+(i/(n-1))*cW;}
  function yP(v){return pad.top+cH-((v-minV)/(maxV-minV))*cH;}
  ctx.strokeStyle='#e0e6e2';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=pad.top+(cH/4)*i;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();ctx.fillStyle='#b0b8b4';ctx.font='10px DM Sans,sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(maxV-((maxV-minV)/4)*i),pad.left-5,y+3);}
  const grad=ctx.createLinearGradient(0,pad.top,0,pad.top+cH);
  grad.addColorStop(0,'rgba(26,107,66,0.18)');grad.addColorStop(1,'rgba(26,107,66,0)');
  ctx.beginPath();allPts.forEach((p,i)=>{const x=xP(i,allPts.length),y=yP(p.weight);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(xP(allPts.length-1,allPts.length),pad.top+cH);ctx.lineTo(xP(0,allPts.length),pad.top+cH);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();ctx.strokeStyle='#1a6b42';ctx.lineWidth=2.2;ctx.lineJoin='round';
  allPts.forEach((p,i)=>{const x=xP(i,allPts.length),y=yP(p.weight);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.stroke();
  ctx.beginPath();ctx.strokeStyle='#4abe7e';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
  ctx.moveTo(pad.left,yP(gw));ctx.lineTo(W-pad.right,yP(gw));ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#22a05a';ctx.font='bold 10px DM Sans,sans-serif';ctx.textAlign='right';ctx.fillText('Goal: '+gw+' lbs',W-pad.right,yP(gw)-4);
  ctx.fillStyle='#b0b8b4';ctx.font='10px DM Sans,sans-serif';ctx.textAlign='center';
  const xStep=Math.max(1,Math.floor(allPts.length/5));
  allPts.forEach((p,i)=>{if(i%xStep===0||i===allPts.length-1)ctx.fillText(i===0?'Now':'Wk '+p.week,xP(i,allPts.length),H-5);});
  ctx.beginPath();ctx.arc(xP(0,allPts.length),yP(cw),4,0,Math.PI*2);ctx.fillStyle='#1a6b42';ctx.fill();
  const li=allPts.length-1;ctx.beginPath();ctx.arc(xP(li,allPts.length),yP(allPts[li].weight),5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.strokeStyle='#1a6b42';ctx.lineWidth=2;ctx.stroke();ctx.fill();
}

// ══ CHECK-IN PAGE ═════════════════════════════════════
function renderCheckinPage(){
  const today=new Date().toISOString().split('T')[0];
  if(!$('ci-date').value)$('ci-date').value=today;
  const plan=planData||JSON.parse(localStorage.getItem(STORE+'plan')||'null');
  $('no-plan-warn').style.display=!plan?'flex':'none';
  if(plan)$('ps-start').textContent=fmtWt(plan.cw);
  if(!checkins.length){
    $('ps-current').textContent=plan?fmtWt(plan.cw):'—';$('ps-lost').textContent='0 '+unitPref;$('ps-remain').textContent=plan?fmtWt(plan.cw-plan.gw):'—';
    $('ci-entries-wrap').innerHTML='<div class="empty-state"><div class="ei">📋</div><h4>No check-ins yet</h4><p>Log your weight each week to track real progress. Consistency is everything.</p></div>';
    $('ci-chart-card').style.display='none';updateSyncUI();return;
  }
  const sorted=[...checkins].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const latest=sorted[sorted.length-1];
  const startWt=plan?plan.cw:sorted[0].weight;
  const goalWt=plan?plan.gw:startWt-35;
  const lost=+(startWt-latest.weight).toFixed(1);
  const remain=+(latest.weight-goalWt).toFixed(1);
  $('ps-current').textContent=fmtWt(latest.weight);$('ps-lost').textContent=(lost>0?'-':'+')+fmtWt(Math.abs(lost));$('ps-remain').textContent=fmtWt(Math.max(remain,0));
  let html='';
  const reversed=[...sorted].reverse();
  reversed.forEach(ci=>{
    const origIdx=sorted.findIndex(s=>s.id===ci.id);
    const prev=origIdx>0?sorted[origIdx-1].weight:startWt;
    const diff=+(ci.weight-prev).toFixed(1);
    const totalLost=+(startWt-ci.weight).toFixed(1);
    const diffCls=diff<0?'neg':diff>0?'pos':'zero';
    const diffAmt=fmtD(Math.abs(fromLbs(diff)));
    const diffTxt=diff===0?'—':(diff>0?'+':'-')+diffAmt+' '+unitPref;
    const d=new Date(ci.date+'T12:00');
    const safeId=parseInt(ci.id,10)||0;
    html+=`<div class="ci-entry" id="entry-${safeId}">
      <div class="ci-entry-left">
        <div class="ci-entry-date">${d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</div>
        <div class="ci-entry-wt">${fmtWt(ci.weight)}</div>
        ${ci.note?`<div class="ci-entry-note">${escapeHtml(ci.note)}</div>`:''}
      </div>
      <div class="ci-entry-right">
        <div class="ci-diff ${diffCls}">${diffTxt}</div>
        <div class="ci-total">${totalLost>0?'-':'+'}${fmtD(Math.abs(fromLbs(totalLost)))} ${unitPref} total</div>
      </div>
      <button class="edit-btn" onclick="editCheckin(${safeId})" aria-label="Edit">✏️</button>
      <button class="del-btn" onclick="deleteCheckin(${safeId})" aria-label="Delete">🗑</button>
    </div>`;
  });
  $('ci-entries-wrap').innerHTML='<div class="ci-entries">'+html+'</div>';
  $('ci-chart-card').style.display='block';
  renderCheckinChart(sorted,plan,startWt,goalWt);
  updateSyncUI();
}

function renderCheckinChart(sorted,plan,startWt,goalWt){
  const canvas=$('ciChart');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.parentElement.offsetWidth||340;canvas.height=220;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height;
  const pad={top:16,right:16,bottom:28,left:44};
  const cW=W-pad.left-pad.right,cH=H-pad.top-pad.bottom;
  let projPts=[];
  if(plan&&plan.sim&&plan.sim.length){
    const st=Math.max(1,Math.floor(plan.sim.length/20));
    projPts=[{week:0,weight:startWt},...plan.sim.filter((_,i)=>i%st===0||i===plan.sim.length-1)];
  }
  const planOriginDate=plan?new Date(plan.savedAt):new Date(sorted[0].date+'T12:00');
  const earliestCheckin=new Date(sorted[0].date+'T12:00');
  const origin=new Date(Math.min(planOriginDate.getTime(),earliestCheckin.getTime()));
  const planOffset=Math.round((planOriginDate.getTime()-origin.getTime())/(7*24*3600*1000));
  if(planOffset>0)projPts=projPts.map(p=>({...p,week:p.week+planOffset}));
  const actualPts=sorted.map(ci=>{const d=new Date(ci.date+'T12:00');return{week:Math.round((d-origin)/(7*24*3600*1000)),weight:ci.weight};});
  // Trend line
  let trendPts=[];
  if(actualPts.length>=2){
    const n=actualPts.length;
    const sumX=actualPts.reduce((a,p)=>a+p.week,0),sumY=actualPts.reduce((a,p)=>a+p.weight,0);
    const sumXY=actualPts.reduce((a,p)=>a+p.week*p.weight,0),sumX2=actualPts.reduce((a,p)=>a+p.week*p.week,0);
    const denom=n*sumX2-sumX*sumX;
    if(denom!==0){
      const slope=(n*sumXY-sumX*sumY)/denom;
      const intercept=(sumY-slope*sumX)/n;
      const trendStart=actualPts[0].week;
      const startWeight=slope*trendStart+intercept;
      let endWeek,endWeight;
      if(slope<0){const crossWeek=(goalWt-intercept)/slope;endWeek=Math.ceil(crossWeek);endWeight=goalWt;}
      else{endWeek=projPts.length?projPts[projPts.length-1].week:actualPts[actualPts.length-1].week+12;endWeight=Math.min(slope*endWeek+intercept,startWt);}
      trendPts=[{week:trendStart,weight:startWeight},{week:endWeek,weight:endWeight}];
    }
  } else if(actualPts.length===1){
    const planRate=plan&&plan.sim&&plan.sim.length?(startWt-goalWt)/plan.sim.length:0.75;
    const weeksToGoal=planRate>0?(actualPts[0].weight-goalWt)/planRate:12;
    trendPts=[{week:actualPts[0].week,weight:actualPts[0].weight},{week:actualPts[0].week+Math.ceil(weeksToGoal),weight:goalWt}];
  }
  const maxWeek=Math.max(projPts.length?projPts[projPts.length-1].week:0,actualPts.length?actualPts[actualPts.length-1].week:0,trendPts.length?trendPts[trendPts.length-1].week:0,4);
  const allWts=[startWt,goalWt,...projPts.map(p=>p.weight),...actualPts.map(p=>p.weight),...trendPts.map(p=>p.weight)];
  const minV=Math.min(...allWts)-3,maxV=Math.max(...allWts)+3;
  function xP(wk){return pad.left+(wk/maxWeek)*cW;}
  function yP(v){return pad.top+cH-((v-minV)/(maxV-minV))*cH;}
  ctx.strokeStyle='#e0e6e2';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=pad.top+(cH/4)*i;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();ctx.fillStyle='#b0b8b4';ctx.font='10px DM Sans,sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(maxV-((maxV-minV)/4)*i),pad.left-5,y+3);}
  ctx.beginPath();ctx.strokeStyle='#4abe7e';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.moveTo(pad.left,yP(goalWt));ctx.lineTo(W-pad.right,yP(goalWt));ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#22a05a';ctx.font='bold 10px DM Sans,sans-serif';ctx.textAlign='right';ctx.fillText('Goal: '+goalWt,W-pad.right,yP(goalWt)-4);
  if(projPts.length>1){ctx.beginPath();ctx.strokeStyle='#b6e8ce';ctx.lineWidth=2;ctx.setLineDash([6,4]);projPts.forEach((p,i)=>i===0?ctx.moveTo(xP(p.week),yP(p.weight)):ctx.lineTo(xP(p.week),yP(p.weight)));ctx.stroke();ctx.setLineDash([]);}
  if(trendPts.length>=2){ctx.beginPath();ctx.strokeStyle='#f59e0b';ctx.lineWidth=2;ctx.setLineDash([4,3]);trendPts.forEach((p,i)=>i===0?ctx.moveTo(xP(p.week),yP(p.weight)):ctx.lineTo(xP(p.week),yP(p.weight)));ctx.stroke();ctx.setLineDash([]);const tp=trendPts[trendPts.length-1];ctx.beginPath();ctx.arc(xP(tp.week),yP(tp.weight),4,0,Math.PI*2);ctx.fillStyle='#f59e0b';ctx.fill();}
  if(actualPts.length>1){ctx.beginPath();ctx.strokeStyle='#1a6b42';ctx.lineWidth=2.5;ctx.lineJoin='round';actualPts.forEach((p,i)=>i===0?ctx.moveTo(xP(p.week),yP(p.weight)):ctx.lineTo(xP(p.week),yP(p.weight)));ctx.stroke();}
  actualPts.forEach(p=>{ctx.beginPath();ctx.arc(xP(p.week),yP(p.weight),5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.strokeStyle='#1a6b42';ctx.lineWidth=2.5;ctx.stroke();ctx.fill();});
  const lx=pad.left+4,ly=pad.top+12;
  const legend=[{color:'#b6e8ce',dash:true,label:'Projected'},{color:'#1a6b42',dash:false,label:'Actual'},{color:'#f59e0b',dash:true,label:'Your Trend'}];
  let lxOff=lx;
  legend.forEach(l=>{if(l.dash)ctx.setLineDash([5,3]);else ctx.setLineDash([]);ctx.strokeStyle=l.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lxOff,ly);ctx.lineTo(lxOff+16,ly);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#5a6460';ctx.font='9px DM Sans,sans-serif';ctx.textAlign='left';ctx.fillText(l.label,lxOff+19,ly+3);lxOff+=ctx.measureText(l.label).width+32;});
  ctx.fillStyle='#b0b8b4';ctx.font='10px DM Sans,sans-serif';ctx.textAlign='center';
  for(let w=0;w<=maxWeek;w+=Math.max(1,Math.floor(maxWeek/5)))ctx.fillText(w===0?'Start':'Wk '+w,xP(w),H-5);
}

function addCheckin(){
  const btn=$('btn-add-checkin');
  if(btn)btn.disabled=true;
  const date=$('ci-date').value;
  const weightRaw=parseFloat($('ci-weight').value);
  const weight=toLbs(weightRaw);
  const note=($('ci-note').value||'').trim();
  const errEl=$('ci-error');
  const fail=msg=>{errEl.textContent=msg;errEl.style.display='block';if(btn)btn.disabled=false;};
  if(!date){fail('Please select a date.');return;}
  if(date>new Date().toISOString().split('T')[0]){fail('Date can\'t be in the future.');return;}
  if(checkins.find(c=>c.date===date&&c.id!==_editId)){fail('You already logged a check-in for this date.');return;}
  if(!weightRaw||weight<50||weight>600){fail('Enter a valid weight ('+(unitPref==='kg'?'23–272 kg':'50–600 lbs')+').');return;}
  // Handle edit mode — remove old entry, track old date for Supabase
  const isEdit=_editId!==null;
  let oldDate=null;
  if(isEdit){
    const old=checkins.find(c=>c.id===_editId);
    oldDate=old?.date;
    checkins=checkins.filter(c=>c.id!==_editId);
  }
  const entryId=isEdit?_editId:Date.now();
  const prevStreak=calcStreak();
  checkins.push({id:entryId,date,weight,note});
  localStorage.setItem(STORE+'checkins',JSON.stringify(checkins));
  if(isEdit&&oldDate&&oldDate!==date)syncDeleteCheckin(oldDate);
  syncUp();
  $('ci-weight').value='';$('ci-note').value='';
  if(isEdit){
    _editId=null;
    const addBtn=$('btn-add-checkin');if(addBtn)addBtn.textContent='Log It ✓';
    const cancelBtn=$('btn-cancel-edit');if(cancelBtn)cancelBtn.style.display='none';
    const heading=$('checkin-form-heading');if(heading)heading.textContent='➕ Log This Week';
    ph.capture('checkin_edited');
    showToast('Check-in updated!');
    renderCheckinPage();calculate();
    return;
  }
  const newStreak=calcStreak();
  ph.capture('checkin_logged',{streak:newStreak,has_note:!!note});
  // Check milestone celebrations ONLY here, after an actual log
  checkMilestonesAfterCheckin();
  // Check streak milestones
  const streakMilestones=[4,8,13,26,52];
  const streakKey='streak-'+newStreak;
  if(streakMilestones.includes(newStreak)&&!celebratedMilestones.includes(streakKey)){
    celebratedMilestones.push(streakKey);
    localStorage.setItem(STORE+'celebrated',JSON.stringify(celebratedMilestones));
    const msgs={4:'4 weeks straight. Consistency is your superpower.',8:'8-week streak! You\'re in the top 5% of people who start.',13:'13 weeks — that\'s a full quarter of commitment. 🔥',26:'Half a year of weekly check-ins. Truly remarkable.',52:'A full year streak. You are the 1%.'};
    setTimeout(()=>celebrate('🔥',`${newStreak}-Week Streak!`,msgs[newStreak]),800);
    ph.capture('milestone_celebrated',{milestone:`${newStreak}-week streak`,pct:null});
  }
  renderCheckinPage();calculate();
}

function deleteCheckin(id){
  const entry=document.getElementById('entry-'+id);
  if(!entry)return;
  const btn=entry.querySelector('.del-btn');
  if(btn.dataset.confirming==='true'){
    const toDelete=checkins.find(c=>c.id===id);
    checkins=checkins.filter(c=>c.id!==id);
    localStorage.setItem(STORE+'checkins',JSON.stringify(checkins));
    if(toDelete)syncDeleteCheckin(toDelete.date);
    ph.capture('checkin_deleted');
    entry.style.transition='opacity 0.25s,transform 0.25s';
    entry.style.opacity='0';entry.style.transform='translateX(40px)';
    setTimeout(()=>{renderCheckinPage();calculate();},260);
  } else {
    btn.dataset.confirming='true';btn.textContent='Confirm?';
    btn.style.background='var(--red-light)';btn.style.color='var(--red)';btn.style.fontSize='0.7rem';btn.style.padding='6px 10px';
    setTimeout(()=>{if(btn&&btn.dataset.confirming==='true'){btn.dataset.confirming='false';btn.textContent='🗑';btn.style.background='';btn.style.color='';btn.style.fontSize='';btn.style.padding='';}},3000);
  }
}

// ══ PACE / SAFETY CAP ══════════════════════════════
function setPace(p){
  pace=p;
  // Update safety cap buttons in result drawer
  ['gentle','steady','aggressive'].forEach(n=>{
    const btn=$('sc-'+n);
    if(btn) btn.classList.toggle('active',n===p);
  });
  ph.capture('safety_cap_changed',{pace:p});
  _paceOnly=true;
  try{calculate();}finally{_paceOnly=false;}
}

// ══ PAGE NAV ══════════════════════════════════════════
function showPage(name){
  if(name!=='checkin'&&_editId!==null)cancelEditCheckin();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $('page-'+name).classList.add('active');
  ['calculator','checkin'].forEach(n=>{const t=$('tab-'+n);if(t)t.classList.toggle('active',n===name);});
  document.querySelectorAll('.desktop-nav-tab').forEach(t=>t.classList.toggle('active',t.textContent.toLowerCase().includes(name==='calculator'?'calc':'check')));
  ph.capture('page_viewed',{page:name});
  window.scrollTo(0,0);
  if(name==='checkin'){renderCheckinPage();setTimeout(()=>$('ci-weight').focus(),100);}
  if(name==='calculator')setTimeout(calculate,50);
}

// ══ MODAL ══════════════════════════════════════════════
function openModal(){
  if(!planData){showToast('Set up your plan first — adjust the sliders on the Calculator.');showPage('calculator');return;}
  $('modal-overlay').classList.add('open');
  $('modal-form-view').style.display='block';
  $('modal-success-view').style.display='none';
  ph.capture('save_plan_opened');
}
function closeModal(){$('modal-overlay').classList.remove('open');}
function submitModal(){
  const email=$('modal-email').value.trim();
  const name=$('modal-name').value.trim();
  if(!email||!email.includes('@')){alert('Please enter a valid email.');return;}
  // Save name if entered
  if(name&&!userName){userName=name;localStorage.setItem(STORE+'name',name);updateHeroGreeting();}
  ph.capture('email_captured',{has_name:!!name,plan_mode:calcMode,streak:calcStreak()});
  if(sb&&!IS_TEST) sb.from('leads').insert({name,email,plan_mode:calcMode,checkin_count:checkins.length}).then(({error})=>{if(error)console.warn('[Trimly] lead save:',error.message);});
  $('modal-form-view').style.display='none';$('modal-success-view').style.display='block';
}
function skipModal(){
  $('modal-form-view').style.display='none';$('modal-success-view').style.display='block';
  ph.capture('save_plan_skipped');
}

function downloadPDF(){
  closeModal();
  const plan=planData;
  if(!plan){alert('Set up your plan in the Calculator first.');return;}
  const name=escapeHtml($('modal-name').value.trim()||'Your');
  const goalDate=new Date(plan.goalDate);
  const totalLoss=+(plan.cw-plan.gw).toFixed(1);
  const weeks=plan.sim?plan.sim.length:0;
  const avgRate=weeks?(totalLoss/weeks).toFixed(1):'—';
  const streak=calcStreak();
  const milestones=[0.1,0.25,0.5,0.75,1.0].map((p,i)=>{
    const labels=['10% Lost','25% Lost','Halfway!','75% Done','🏆 Goal!'];
    const targetWt=plan.cw-totalLoss*p;
    let wk=0;if(plan.sim){for(let j=0;j<plan.sim.length;j++){if(plan.sim[j].weight<=targetWt+0.5){wk=plan.sim[j].week;break;}}if(!wk&&plan.sim.length)wk=plan.sim[plan.sim.length-1].week;}
    const d=addWeeks(new Date(),wk);
    return`<tr><td>${labels[i]}</td><td>${Math.round(targetWt*10)/10} lbs</td><td>Week ${wk}</td><td>${fmtDate(d)}</td></tr>`;
  }).join('');
  const win=window.open('','_blank');
  if(!win){showToast('Popup blocked — please allow popups for this site.');return;}
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Trimly — ${name}'s Plan</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>body{font-family:'DM Sans',sans-serif;color:#161613;padding:36px;max-width:680px;margin:0 auto;}h1{font-family:'Fraunces',serif;font-size:2rem;color:#1a6b42;margin-bottom:4px;}h2{font-family:'Fraunces',serif;font-size:1.2rem;color:#161613;margin:24px 0 10px;border-bottom:2px solid #e2e8e4;padding-bottom:5px;}.sub{color:#6b7570;font-size:0.88rem;margin-bottom:24px;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;}.stat{background:#eaf7f0;border-radius:10px;padding:12px 14px;}.stat .num{font-family:'Fraunces',serif;font-size:1.6rem;font-weight:900;color:#1a6b42;}.stat .lbl{font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#6b7570;margin-top:2px;}table{width:100%;border-collapse:collapse;font-size:0.85rem;}th{text-align:left;padding:8px 12px;background:#1a6b42;color:#fff;font-size:0.7rem;text-transform:uppercase;}td{padding:8px 12px;border-bottom:1px solid #e2e8e4;}tr:last-child td{border-bottom:none;}ul{line-height:2.2;font-size:0.88rem;padding-left:20px;}.footer{margin-top:36px;padding-top:14px;border-top:2px solid #e2e8e4;font-size:0.72rem;color:#9ca3af;text-align:center;}@media print{body{padding:16px;}}</style></head><body>
  <h1>Trimly — Personal Plan</h1>
  <div class="sub">For: <strong>${name}</strong> &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}${streak>0?` &nbsp;|&nbsp; 🔥 ${streak}-week streak`:''}</div>
  <div class="grid">
    <div class="stat"><div class="num">${plan.cw} lbs</div><div class="lbl">Starting Weight</div></div>
    <div class="stat"><div class="num">${plan.gw} lbs</div><div class="lbl">Goal Weight</div></div>
    <div class="stat"><div class="num">${totalLoss} lbs</div><div class="lbl">Total to Lose</div></div>
    <div class="stat"><div class="num">${weeks} wks</div><div class="lbl">Timeline</div></div>
    <div class="stat"><div class="num">${avgRate} lbs</div><div class="lbl">Avg Loss / Week</div></div>
    <div class="stat"><div class="num">${fmtDate(goalDate)}</div><div class="lbl">Goal Date</div></div>
  </div>
  <h2>Milestone Timeline</h2>
  <table><thead><tr><th>Milestone</th><th>Target Weight</th><th>Week</th><th>Est. Date</th></tr></thead><tbody>${milestones}</tbody></table>
  <h2>Tips for Success</h2>
  <ul>
    <li>Weigh once a week — same time, same conditions (morning, after bathroom).</li>
    <li>Weight fluctuates ±3 lbs daily. Track the trend, not the number.</li>
    <li>Aim for 0.7–1g of protein per lb of goal weight to preserve muscle.</li>
    <li>Use Trimly's weekly check-in to compare actual vs. projected progress.</li>
    <li>A plateau is normal. It usually breaks within 2–3 weeks. Stay consistent.</li>
  </ul>
  <div class="footer">Trimly · Not a substitute for medical advice.</div>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  win.document.close();
}

// ══ EVENTS ═════════════════════════════════════════════
let _calcTimer;
function debouncedCalculate(){clearTimeout(_calcTimer);_calcTimer=setTimeout(calculate,150);}
['cw','gw','age','ht-ft','ht-in','sex','calSl','walkSl','liftSl','cardioSl','actSl','goalDate'].forEach(id=>{
  const el=$(id);
  if(el) el.addEventListener('input',()=>{
    debouncedCalculate();
    ph.capture('slider_moved',{field:id,value:el.value});
  });
});
$('modal-overlay').addEventListener('click',e=>{if(e.target===$('modal-overlay'))closeModal();});
$('share-overlay').addEventListener('click',e=>{if(e.target===$('share-overlay'))closeShareModal();});
$('sync-overlay').addEventListener('click',e=>{if(e.target===$('sync-overlay'))closeSyncSheet();});

// Enter key shortcuts
$('name-input').addEventListener('keydown',e=>{if(e.key==='Enter')saveName();});
$('ci-date').addEventListener('keydown',e=>{if(e.key==='Enter')$('ci-weight').focus();});
$('ci-weight').addEventListener('keydown',e=>{if(e.key==='Enter')addCheckin();});
$('ci-note').addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')addCheckin();});
$('modal-name').addEventListener('keydown',e=>{if(e.key==='Enter')$('modal-email').focus();});
$('modal-email').addEventListener('keydown',e=>{if(e.key==='Enter')submitModal();});
$('sync-email').addEventListener('keydown',e=>{if(e.key==='Enter')signIn();});

// Close account menu on outside click
document.addEventListener('click',e=>{
  const menu=$('account-menu');
  if(menu&&menu.style.display!=='none'&&!e.target.closest('.account-btn')&&!e.target.closest('#account-menu'))
    menu.style.display='none';
});

// Escape closes any open overlay
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const menu=$('account-menu');if(menu)menu.style.display='none';
  closeModal();
  closeShareModal();
  dismissCelebration();
  if($('name-prompt-overlay').classList.contains('show'))saveName(true);
  if($('sync-overlay')?.classList.contains('show'))closeSyncSheet();
});

// ══ INIT ═══════════════════════════════════════════════
const _cookieConsent=localStorage.getItem('trimly_cookie_consent');
function _initPosthog(){
  if(IS_TEST||IS_OWNER||PH_KEY==='YOUR_POSTHOG_KEY')return;
  try{posthog.init(PH_KEY,{api_host:'https://us.i.posthog.com',person_profiles:'identified_only'});}catch(e){}
  try{posthog.identify(_deviceId);}catch(e){}
}
function acceptCookies(){
  localStorage.setItem('trimly_cookie_consent','accepted');
  const b=$('cookie-banner');if(b)b.style.display='none';
  _initPosthog();
  ph.capture('cookie_consent',{action:'accepted'});
}
function declineCookies(){
  localStorage.setItem('trimly_cookie_consent','declined');
  const b=$('cookie-banner');if(b)b.style.display='none';
}
if(_cookieConsent==='accepted') _initPosthog();

// Restore form state from last session
if(savedForm){
  if(savedForm.cw)  $('cw').value=savedForm.cw;
  if(savedForm.gw)  $('gw').value=savedForm.gw;
  if(savedForm.age) $('age').value=savedForm.age;
  if(savedForm.htFt)$('ht-ft').value=savedForm.htFt;
  if(savedForm.htIn)$('ht-in').value=savedForm.htIn;
  if(savedForm.sex) $('sex').value=savedForm.sex;
  if(savedForm.cal) $('calSl').value=savedForm.cal;
  if(savedForm.walk)$('walkSl').value=savedForm.walk;
  if(savedForm.lift)$('liftSl').value=savedForm.lift;
  if(savedForm.cardio)$('cardioSl').value=savedForm.cardio;
  if(savedForm.act) $('actSl').value=savedForm.act;
  if(savedForm.goalDate)$('goalDate').value=savedForm.goalDate;
  if(savedForm.pace) pace=savedForm.pace;
  if(savedForm.mode) calcMode=savedForm.mode;
  ['gentle','steady','aggressive'].forEach(n=>{const b=$('sc-'+n);if(b)b.classList.toggle('active',n===pace);});
  setMode(calcMode);
}else if(unitPref==='kg'){
  // Convert HTML default values (in lbs) to kg when there's no saved form
  const cwEl=$('cw'),gwEl=$('gw');
  if(cwEl)cwEl.value=fmtD(fromLbs(parseFloat(cwEl.value)||210));
  if(gwEl)gwEl.value=fmtD(fromLbs(parseFloat(gwEl.value)||175));
}

updateUnitLabels();
calculate();
updateHeroGreeting();
updateSyncUI();

// Show name prompt after first meaningful interaction (or 20s if idle)
if(!userName && !IS_TEST){
  let namePromptShown=false;
  const showPromptOnce=()=>{if(namePromptShown)return;namePromptShown=true;showNamePrompt();};
  document.querySelectorAll('input[type=range],input[type=number],select').forEach(el=>{
    el.addEventListener('change',()=>setTimeout(showPromptOnce,500),{once:true});
  });
  setTimeout(showPromptOnce,20000);
}

// Track session start
ph.capture('app_loaded',{
  mode:calcMode,
  has_plan:!!planData,
  checkin_count:checkins.length,
  streak:calcStreak(),
  returning_user:!!planData||checkins.length>0,
});

// Show cookie banner if user hasn't decided yet
if(!_cookieConsent&&!IS_TEST&&!IS_OWNER){
  setTimeout(()=>{const b=$('cookie-banner');if(b)b.style.display='flex';},1500);
}

// Production error tracking — catches silent crashes
window.addEventListener('unhandledrejection',e=>{
  ph.capture('js_error',{type:'unhandledrejection',message:String(e.reason).slice(0,200)});
});
window.addEventListener('error',e=>{
  ph.capture('js_error',{type:'uncaught',message:(e.message||'').slice(0,200),source:(e.filename||'').replace(/.*\//,'')});
});

// ══ EXPORT / IMPORT ══════════════════════════════════
function exportData(){
  const data={
    version:1,
    exported:new Date().toISOString(),
    checkins,
    plan:planData,
    celebrated:celebratedMilestones,
    name:userName,
    form:JSON.parse(localStorage.getItem(STORE+'form')||'null')
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`trimly-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();URL.revokeObjectURL(url);
  ph.capture('data_exported',{checkin_count:checkins.length});
}
function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(ev){
    try{
      const data=JSON.parse(ev.target.result);
      if(!data.version||!Array.isArray(data.checkins))throw new Error('invalid');
      const incoming=data.checkins.length;
      const existingDates=new Set(checkins.map(c=>c.date));
      const newOnes=data.checkins.filter(c=>!existingDates.has(c.date));
      const skipped=incoming-newOnes.length;
      if(!confirm(`Import ${incoming} check-in${incoming===1?'':'s'}?${skipped>0?` (${skipped} duplicate date${skipped===1?'':'s'} will be skipped)`:''}  Your existing data won't be overwritten.`)){e.target.value='';return;}
      checkins=[...checkins,...newOnes].sort((a,b)=>new Date(a.date)-new Date(b.date));
      localStorage.setItem(STORE+'checkins',JSON.stringify(checkins));
      if(!planData&&data.plan){planData=data.plan;localStorage.setItem(STORE+'plan',JSON.stringify(planData));}
      if(!userName&&data.name){userName=data.name;localStorage.setItem(STORE+'name',userName);updateHeroGreeting();}
      if(data.celebrated){
        celebratedMilestones=[...new Set([...celebratedMilestones,...data.celebrated])];
        localStorage.setItem(STORE+'celebrated',JSON.stringify(celebratedMilestones));
      }
      ph.capture('data_imported',{imported:newOnes.length,skipped});
      renderCheckinPage();calculate();
      alert(`Done! Added ${newOnes.length} check-in${newOnes.length===1?'':'s'}.${skipped>0?' '+skipped+' duplicate date'+(skipped===1?'':'s')+' skipped.':''}`);
    }catch(err){alert('Could not read the file. Make sure it\'s a Trimly backup JSON.');}
    e.target.value='';
  };
  reader.readAsText(file);
}

// ══ AUTH & SYNC ═══════════════════════════════════════
function showToast(msg,duration=3500){
  const t=document.createElement('div');
  t.className='toast';t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),350);},duration);
}
function updateSyncUI(){
  const nudge=$('sync-nudge');
  const acctBtns=document.querySelectorAll('.account-btn');
  if(!sb){
    if(nudge)nudge.style.display='none';
    acctBtns.forEach(b=>b.style.display='none');
    return;
  }
  const personIcon='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
  if(currentUser){
    const email=currentUser.email||'';
    const initial=(email[0]||'?').toUpperCase();
    acctBtns.forEach(b=>{b.style.display='flex';b.textContent=initial;b.classList.add('signed-in');b.title='Account: '+email;});
    if(nudge)nudge.style.display='none';
  } else {
    acctBtns.forEach(b=>{b.style.display='flex';b.innerHTML=personIcon+'<span>Sign In</span>';b.classList.remove('signed-in');b.title='Sign in to sync your data';});
    const dismissed=localStorage.getItem(STORE+'sync_nudge_dismissed');
    if(nudge)nudge.style.display=(!dismissed&&checkins.length>0)?'flex':'none';
  }
}
function toggleAccountMenu(){
  const menu=$('account-menu');
  if(!menu)return;
  if(menu.style.display!=='none'){menu.style.display='none';return;}
  if(!currentUser){openSyncSheet();return;}
  $('account-menu-email').textContent='Signed in as '+currentUser.email;
  menu.style.display='block';
}
async function signOutFromMenu(){
  closeAccountMenu();
  showToast('Saving your data…',2500);
  await signOut();
}
function closeAccountMenu(){
  const menu=$('account-menu');if(menu)menu.style.display='none';
}
function exportFromMenu(){
  closeAccountMenu();
  exportData();
}
function dismissSyncNudge(){
  localStorage.setItem(STORE+'sync_nudge_dismissed','1');
  const nudge=$('sync-nudge');if(nudge)nudge.style.display='none';
}
function openSyncSheet(){
  if(!sb)return;
  $('sync-overlay').classList.add('show');
  $('sync-step-email').style.display='block';
  $('sync-step-otp').style.display='none';
  $('sync-error').style.display='none';
  $('sync-email').value='';
  setTimeout(()=>$('sync-email').focus(),300);
  ph.capture('sign_in_opened');
}
function closeSyncSheet(){
  const ov=$('sync-overlay');if(ov)ov.classList.remove('show');
}
async function signIn(){
  if(!sb)return;
  const email=$('sync-email').value.trim();
  const errEl=$('sync-error');
  if(!email||!email.includes('@')){errEl.textContent='Enter a valid email address.';errEl.style.display='block';return;}
  errEl.style.display='none';
  const btn=$('sync-submit-btn');
  if(btn){btn.textContent='Sending…';btn.disabled=true;}
  const redirectTo=window.location.href.replace(/[?#].*/,'');
  const{error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});
  if(btn){btn.textContent='Send Link →';btn.disabled=false;}
  if(error){
    console.warn('[Trimly] signInWithOtp error:',error.message,'| redirectTo:',redirectTo,'| status:',error.status);
    if(error.message.toLowerCase().includes('invalid')){
      errEl.innerHTML='Configuration error — open browser DevTools (F12) › Console and send the <strong>[Trimly]</strong> line to support.';
    } else {
      errEl.textContent=error.message;
    }
    errEl.style.display='block';
    return;
  }
  _otpEmail=email;
  const desc=$('sync-otp-desc');
  if(desc)desc.textContent='We sent a sign-in link to '+email+'. Click it to sign in — then return to this tab.';
  $('sync-step-email').style.display='none';
  $('sync-step-otp').style.display='block';
  const errEl2=$('sync-otp-error');
  if(errEl2)errEl2.style.display='none';
  ph.capture('magic_link_sent');
}
async function resendLink(){
  if(!_otpEmail)return;
  $('sync-step-otp').style.display='none';
  $('sync-step-email').style.display='block';
  $('sync-email').value=_otpEmail;
  await signIn();
}
async function signOut(){
  if(!sb)return;
  try{
    await Promise.race([syncUp(),new Promise(r=>setTimeout(r,3000))]);
    await sb.auth.signOut();
  }catch(e){console.warn('[Trimly] sign-out error:',e);}
  // Always clear local state regardless of any auth errors
  [STORE+'checkins',STORE+'plan',STORE+'celebrated',STORE+'sync_nudge_dismissed'].forEach(k=>localStorage.removeItem(k));
  checkins=[];planData=null;celebratedMilestones=[];
  currentUser=null;_otpEmail='';
  ph.reset();
  ph.identify(_deviceId);
  updateSyncUI();
  updateHeroGreeting();
  renderCheckinPage();
  showToast('Signed out. Your data is saved to your account.');
  ph.capture('signed_out');
}
function flashSyncIndicator(){
  document.querySelectorAll('.account-btn.signed-in').forEach(b=>{
    b.classList.remove('sync-flash');
    void b.offsetWidth; // reflow to restart animation
    b.classList.add('sync-flash');
    setTimeout(()=>b.classList.remove('sync-flash'),1000);
  });
}
async function syncUp(){
  if(!sb||!currentUser||IS_TEST||_syncInFlight)return;
  _syncInFlight=true;
  try{
    const uid=currentUser.id;
    const ops=[];
    if(checkins.length){
      ops.push(sb.from('checkins').upsert(
        checkins.map(c=>({user_id:uid,date:c.date,weight:c.weight,note:c.note||'',app_id:c.id})),
        {onConflict:'user_id,date'}
      ));
    }
    if(planData){
      ops.push(sb.from('user_plans').upsert({user_id:uid,data:planData,updated_at:new Date().toISOString()},{onConflict:'user_id'}));
    }
    await Promise.all(ops);
    flashSyncIndicator();
  }catch(e){console.warn('[Trimly] sync push failed:',e);}
  finally{_syncInFlight=false;}
}
function scheduleSyncUp(){clearTimeout(_syncTimer);_syncTimer=setTimeout(syncUp,2000);}
async function syncDeleteCheckin(date){
  if(!sb||!currentUser||IS_TEST)return;
  try{await sb.from('checkins').delete().eq('user_id',currentUser.id).eq('date',date);}
  catch(e){console.warn('[Trimly] sync delete failed:',e);}
}
async function syncDown(){
  if(!sb||!currentUser||IS_TEST)return false;
  try{
    const uid=currentUser.id;
    const[{data:remote,error:e1},{data:planRow,error:e2}]=await Promise.all([
      sb.from('checkins').select('app_id,date,weight,note').eq('user_id',uid),
      sb.from('user_plans').select('data').eq('user_id',uid).maybeSingle()
    ]);
    if(e1)throw e1;if(e2)throw e2;
    let changed=false;
    if(remote?.length){
      const localDates=new Set(checkins.map(c=>c.date));
      const newOnes=remote.filter(r=>!localDates.has(r.date))
        .map(r=>({id:r.app_id||Date.now()+Math.floor(Math.random()*1000),date:r.date,weight:r.weight,note:r.note||''}));
      if(newOnes.length){
        checkins=[...checkins,...newOnes].sort((a,b)=>new Date(a.date)-new Date(b.date));
        localStorage.setItem(STORE+'checkins',JSON.stringify(checkins));
        changed=true;
      }
    }
    if(!planData&&planRow?.data){
      planData=planRow.data;
      localStorage.setItem(STORE+'plan',JSON.stringify(planData));
      changed=true;
    }
    return changed;
  }catch(e){console.warn('[Trimly] sync pull failed:',e);return false;}
}
if(sb){
  sb.auth.onAuthStateChange(async(event,session)=>{
    currentUser=session?.user||null;
    updateSyncUI();
    if(currentUser&&(event==='SIGNED_IN'||event==='INITIAL_SESSION')){
      // Link the anonymous device history to the real user account in PostHog
      ph.identify(currentUser.id,{email:currentUser.email});
      closeSyncSheet();
      const changed=await syncDown();
      await syncUp();
      if(changed){renderCheckinPage();calculate();}
      updateSyncUI();
      if(event==='SIGNED_IN')showToast('✓ Signed in! Your data is backed up.');
      ph.capture('signed_in',{event});
    }
  });
}

// ══ EDIT CHECK-IN ════════════════════════════════════
function editCheckin(id){
  const ci=checkins.find(c=>c.id===id);
  if(!ci)return;
  _editId=id;
  $('ci-date').value=ci.date;
  $('ci-weight').value=fmtD(fromLbs(ci.weight));
  $('ci-note').value=ci.note||'';
  $('ci-error').style.display='none';
  const addBtn=$('btn-add-checkin');if(addBtn)addBtn.textContent='Update ✓';
  const cancelBtn=$('btn-cancel-edit');if(cancelBtn)cancelBtn.style.display='block';
  const heading=$('checkin-form-heading');if(heading)heading.textContent='✏️ Edit Check-In';
  const form=$('ci-log-card');
  if(form)form.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>$('ci-weight').focus(),350);
}
function cancelEditCheckin(){
  _editId=null;
  $('ci-date').value=new Date().toISOString().split('T')[0];
  $('ci-weight').value='';$('ci-note').value='';
  $('ci-error').style.display='none';
  const addBtn=$('btn-add-checkin');if(addBtn)addBtn.textContent='Log It ✓';
  const cancelBtn=$('btn-cancel-edit');if(cancelBtn)cancelBtn.style.display='none';
  const heading=$('checkin-form-heading');if(heading)heading.textContent='➕ Log This Week';
}

// ══ UNIT TOGGLE (kg / lbs) ═══════════════════════════
function toggleUnit(){
  const old=unitPref;
  unitPref=old==='lbs'?'kg':'lbs';
  localStorage.setItem(STORE+'unit',unitPref);
  ['cw','gw'].forEach(id=>{
    const el=$(id);
    if(el&&el.value){const v=parseFloat(el.value);if(!isNaN(v))el.value=fmtD(old==='lbs'?v/KG_TO_LBS:v*KG_TO_LBS);}
  });
  const ciWt=$('ci-weight');
  if(ciWt&&ciWt.value){const v=parseFloat(ciWt.value);if(!isNaN(v))ciWt.value=fmtD(old==='lbs'?v/KG_TO_LBS:v*KG_TO_LBS);}
  // If editing, convert the edit form value too
  if(_editId!==null&&ciWt&&ciWt.value===''){
    const ci=checkins.find(c=>c.id===_editId);
    if(ci)ciWt.value=fmtD(fromLbs(ci.weight));
  }
  updateUnitLabels();
  calculate();
  if($('page-checkin').classList.contains('active'))renderCheckinPage();
  ph.capture('unit_toggled',{unit:unitPref});
}
function updateUnitLabels(){
  document.querySelectorAll('.unit-sfx').forEach(el=>el.textContent=unitPref);
  const ciLbl=$('lbl-ci-weight');if(ciLbl)ciLbl.textContent='Weight ('+unitPref+')';
  const btn=$('unit-toggle-btn');if(btn)btn.textContent=unitPref==='lbs'?'kg':'lbs';
}

// ══ iOS MAGIC LINK SESSION CHECK ══════════════════════
async function checkSessionManually(){
  if(!sb)return;
  const btn=$('sync-check-session-btn');
  if(btn){btn.textContent='Checking…';btn.disabled=true;}
  try{
    const{data}=await sb.auth.getSession();
    if(data?.session?.user){
      closeSyncSheet();
      currentUser=data.session.user;
      ph.identify(currentUser.id,{email:currentUser.email});
      const changed=await syncDown();
      await syncUp();
      if(changed){renderCheckinPage();calculate();}
      updateSyncUI();
      showToast('✓ Signed in! Your data is backed up.');
      ph.capture('signed_in',{event:'manual_session_check'});
    }else{
      if(btn){btn.textContent='Already clicked the link →';btn.disabled=false;}
      showToast('Session not found yet — make sure you clicked the link, then try again.');
    }
  }catch(e){
    if(btn){btn.textContent='Already clicked the link →';btn.disabled=false;}
    showToast('Could not check session. Please try again.');
  }
}

// ══ GLOBAL EXPORTS ═══════════════════════════════════
// Expose functions to global scope for HTML onclick handlers
window.showNamePrompt = showNamePrompt;
window.saveName = saveName;
window.loadDemo = loadDemo;
window.openShareModal = openShareModal;
window.closeShareModal = closeShareModal;
window.downloadShareCard = downloadShareCard;
window.dismissCelebration = dismissCelebration;
window.calcStreak = calcStreak;
window.setOccasion = setOccasion;
window.setMode = setMode;
window.calculate = calculate;
window.renderCheckinPage = renderCheckinPage;
window.addCheckin = addCheckin;
window.deleteCheckin = deleteCheckin;
window.setPace = setPace;
window.showPage = showPage;
window.openModal = openModal;
window.closeModal = closeModal;
window.submitModal = submitModal;
window.skipModal = skipModal;
window.downloadPDF = downloadPDF;
window.exportData = exportData;
window.importData = importData;
window.openSyncSheet = openSyncSheet;
window.closeSyncSheet = closeSyncSheet;
window.signIn = signIn;
window.resendLink = resendLink;
window.signOut = signOut;
window.toggleAccountMenu = toggleAccountMenu;
window.signOutFromMenu = signOutFromMenu;
window.closeAccountMenu = closeAccountMenu;
window.exportFromMenu = exportFromMenu;
window.dismissSyncNudge = dismissSyncNudge;
window.editCheckin = editCheckin;
window.cancelEditCheckin = cancelEditCheckin;
window.toggleUnit = toggleUnit;
window.checkSessionManually = checkSessionManually;
window.acceptCookies = acceptCookies;
window.declineCookies = declineCookies;

window.addEventListener('resize',()=>{calculate();if($('page-checkin').classList.contains('active'))renderCheckinPage();});

// Offline detection
function updateOfflineBanner(){
  const b=$('offline-banner');
  if(b)b.style.display=navigator.onLine?'none':'block';
}
window.addEventListener('online',()=>{updateOfflineBanner();if(currentUser)syncUp();});
window.addEventListener('offline',updateOfflineBanner);
updateOfflineBanner();

// Close account menu when clicking outside it
document.addEventListener('click',e=>{
  const menu=$('account-menu');
  if(!menu||menu.style.display==='none')return;
  const isAccountBtn=e.target.closest('.account-btn');
  const isMenu=e.target.closest('#account-menu');
  if(!isAccountBtn&&!isMenu)closeAccountMenu();
});

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;
  setTimeout(()=>{
    if(deferredPrompt){
      const b=document.createElement('div');
      b.className='banner nudge';
      b.style.cssText='position:fixed;bottom:calc(var(--tab-h) + var(--safe-bottom) + 10px);left:16px;right:16px;z-index:500;cursor:pointer;';
      b.innerHTML='<span class="bico">📱</span><div><strong>Add Trimly to your home screen</strong>Tap for quick access every weigh-in day.</div>';
      b.onclick=()=>{deferredPrompt.prompt();b.remove();ph.capture('pwa_install_prompted');};
      document.body.appendChild(b);
      setTimeout(()=>b&&b.remove&&b.remove(),12000);
    }
  },30000);
});
