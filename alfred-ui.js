// === ALFRED UI ===

let curState   = 'idle';
let sleepTimer = null;
let eyeTargetX = 0, eyeTargetY = 0;
let eyeCurX    = 0, eyeCurY    = 0;
let rafEyes    = null;

// ── SVG Alfred (fond blanc + paths teal originaux) ────────
const ALFRED_SVG = `


  
  

  
  
    
  

  
  

  
  
    
  

  
  
    
  

  
  
    
    
    
    
    
    
    
    
  

  
  

  
  

`;

// ── Init UI ───────────────────────────────────────────────
function initAlfredUI() {
  if (document.getElementById('alfred-left-panel')) return;

  const style = document.createElement('style');
  style.id = 'alfred-styles';
  style.textContent = `
    body.alfred-active { margin:0; padding:0; overflow:hidden; }
    #alfred-wrapper {
      display:flex; height:100vh; width:100vw;
      position:fixed; top:0; left:0; z-index:99998; pointer-events:none;
    }
    #alfred-left-panel {
      width:0; min-width:0; height:100vh;
      background:linear-gradient(180deg,#054561 0%,#14b0bd 50%,#ebe0c4 100%);
      display:flex; flex-direction:column; align-items:center;
      padding:20px 0 16px;
      box-shadow:4px 0 32px rgba(5,69,97,.35);
      overflow:hidden; pointer-events:all; position:relative; flex-shrink:0;
      transition:width .6s cubic-bezier(.32,.72,0,1),
                 min-width .6s cubic-bezier(.32,.72,0,1),
                 padding .6s cubic-bezier(.32,.72,0,1);
    }
    #alfred-left-panel.visible { width:270px; min-width:270px; padding:20px 16px 16px; }
    #alfred-logo {
      color:rgba(255,255,255,.7); font-size:9px; font-weight:700;
      letter-spacing:2.5px; margin-bottom:10px; text-align:center;
      white-space:nowrap; opacity:0; transition:opacity .4s ease .3s;
      font-family:-apple-system,sans-serif;
    }
    #alfred-left-panel.visible #alfred-logo { opacity:1; }
    #alfred-zzz {
      position:absolute; top:50px; right:25px;
      pointer-events:none; opacity:0; transition:opacity .4s ease; z-index:10;
    }
    #alfred-zzz.show { opacity:1; }
    .alfred-z { position:absolute; font-weight:800; color:rgba(255,255,255,.8); opacity:0; font-family:sans-serif; }
    #alfred-avatar-wrap {
      position:relative; width:180px; height:180px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; background:#fff; border-radius:50%;
      box-shadow:0 4px 20px rgba(5,69,97,.3);
    }
    #alfred-dots {
      position:absolute; top:8px; left:50%; transform:translateX(-50%);
      display:flex; gap:5px; opacity:0; transition:opacity .3s ease; z-index:2;
    }
    #alfred-dots.show { opacity:1; }
    .alfred-dot { width:6px; height:6px; border-radius:50%; background:#14b0bd; }
    #alfred-state-lbl {
      color:rgba(255,255,255,.4); font-size:8px; letter-spacing:1.5px;
      text-transform:uppercase; margin-top:6px; text-align:center; font-family:sans-serif;
    }
    #alfred-bubble {
      background:rgba(255,255,255,.15); backdrop-filter:blur(10px);
      border:1px solid rgba(255,255,255,.25); border-radius:14px 14px 14px 4px;
      padding:10px 12px; font-size:11px; color:rgba(255,255,255,.95);
      line-height:1.65; min-height:46px; max-height:120px; overflow-y:auto;
      margin-top:10px; width:100%; opacity:0; transform:translateY(6px);
      transition:opacity .35s ease,transform .35s ease;
      font-family:sans-serif; box-sizing:border-box;
    }
    #alfred-bubble.show { opacity:1; transform:translateY(0); }
    #alfred-transcript {
      font-size:9px; color:rgba(255,255,255,.25); font-style:italic;
      text-align:center; margin-top:3px; min-height:13px; width:100%; font-family:sans-serif;
    }
    #alfred-vol-wrap {
      width:100%; height:2px; background:rgba(255,255,255,.1);
      border-radius:1px; margin-top:6px; overflow:hidden;
    }
    #alfred-vol-bar {
      height:100%; width:0%; background:rgba(255,255,255,.6);
      border-radius:1px; transition:width .04s linear;
    }
    #alfred-mic-btn {
      margin-top:10px; background:rgba(255,255,255,.15); color:rgba(255,255,255,.9);
      border:1px solid rgba(255,255,255,.3); border-radius:20px;
      padding:8px 16px; font-size:11px; font-weight:600; cursor:pointer;
      width:100%; transition:background .2s,transform .15s; font-family:sans-serif;
    }
    #alfred-mic-btn:hover { background:rgba(255,255,255,.25); transform:translateY(-1px); }
    #alfred-mic-btn.listening { background:rgba(255,255,255,.9); color:#054561;
      animation:alfred-pulse-mic 1.2s ease-in-out infinite; }
    #alfred-langue-lbl {
      font-size:9px; color:rgba(255,255,255,.3); margin-top:6px;
      cursor:pointer; transition:color .2s; font-family:sans-serif; user-select:none;
    }
    #alfred-langue-lbl:hover { color:rgba(255,255,255,.7); }
    #alfred-secours {
      position:absolute; bottom:8px; left:0; right:0;
      text-align:center; font-size:7px; color:rgba(255,255,255,.1);
      transition:color .3s; font-family:sans-serif; cursor:default;
    }
    #alfred-secours:hover { color:rgba(255,255,255,.45); }
    #alfred-site-content { flex:1; height:100vh; overflow:auto; pointer-events:all; min-width:0; }

    @keyframes alfred-breathe  { 0%,100%{transform:scale(1);}         50%{transform:scale(1.012);} }
    @keyframes alfred-sway     { 0%,100%{transform:rotate(-2.5deg);}  50%{transform:rotate(2.5deg);} }
    @keyframes alfred-talk-vib { 0%{transform:translateX(-.5px);}     100%{transform:translateX(.5px);} }
    @keyframes alfred-sleep    { 0%,100%{transform:translateY(0);}    50%{transform:translateY(3px) rotate(.3deg);} }
    @keyframes alfred-eye-lr   { 0%,100%{transform:translateX(-8px);} 50%{transform:translateX(8px);} }
    @keyframes alfred-blink    { 0%,100%{transform:scaleY(1);}        50%{transform:scaleY(.06);} }
    @keyframes alfred-dot-pop  { 0%,100%{opacity:0;transform:scale(.5);} 50%{opacity:1;transform:translateY(-3px) scale(1.1);} }
    @keyframes alfred-float-z  { 0%{opacity:0;transform:translate(0,0)rotate(-8deg);} 20%{opacity:.8;} 100%{opacity:0;transform:translate(14px,-30px)rotate(14deg);} }
    @keyframes alfred-pulse-mic{ 0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.25);} 50%{box-shadow:0 0 0 8px rgba(255,255,255,.04);} }
  `;
  document.head.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.id = 'alfred-wrapper';

  const left = document.createElement('div');
  left.id = 'alfred-left-panel';
  left.innerHTML = `
    ALFRED · WELLNOT
    
      z
      z
      Z
    
    
      
        
        
        
      
      ${ALFRED_SVG}
    
    EN ATTENTE
    
    
    
    🎤 Parler
    🇧🇪 FR
    ← →
  `;

  const siteContent = document.createElement('div');
  siteContent.id = 'alfred-site-content';
  while (document.body.firstChild) siteContent.appendChild(document.body.firstChild);
  wrapper.appendChild(left);
  wrapper.appendChild(siteContent);
  document.body.appendChild(wrapper);
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;';
  document.body.classList.add('alfred-active');

  requestAnimationFrame(() => setTimeout(() => left.classList.add('visible'), 50));

  startBlinking();
  startEyeLerp();
  resetSleepTimer();
  trackMouse();

  setTimeout(async () => {
    setAlfredState('idle');
    const msg = "Bonjour. Alfred est en ligne.";
    showBubble(msg);
    if (typeof speakGoogleTTS === 'function') await speakGoogleTTS(msg, 'fr');
  }, 700);
}

// ── setAlfredState ────────────────────────────────────────
function setAlfredState(state) {
  curState = state;
  const body  = document.getElementById('alfred-body-main');
  const eyeL  = document.getElementById('alfred-eye-l');
  const eyeR  = document.getElementById('alfred-eye-r');
  const dots  = document.getElementById('alfred-dots');
  const zzz   = document.getElementById('alfred-zzz');
  const lbl   = document.getElementById('alfred-state-lbl');
  const lids  = document.getElementById('alfred-lids');
  const mouth = document.getElementById('alfred-mouth');
  const mTalk = document.getElementById('alfred-mouth-talk');

  // Reset
  if (body) { body.style.animation = 'none'; void body.offsetWidth; body.style.transformOrigin = '189.9px 191.74px'; }
  if (eyeL) { eyeL.style.animation='none'; eyeL.style.transform=''; eyeL.style.opacity='1'; eyeL.style.transition=''; }
  if (eyeR) { eyeR.style.animation='none'; eyeR.style.transform=''; eyeR.style.opacity='1'; eyeR.style.transition=''; }
  if (dots) dots.classList.remove('show');
  if (zzz)  zzz.classList.remove('show');
  if (lids) lids.style.display = 'none';
  // Ne pas toucher mouth/mTalk ici — géré par showMouthTalk()

  const labels = { idle:'EN ATTENTE', think:'RÉFLEXION...', talk:'EN TRAIN DE PARLER', sleep:'VEILLE' };
  if (lbl) lbl.textContent = labels[state] || '';

  switch (state) {
    case 'idle':
      if (body) body.style.animation = 'alfred-breathe 4s ease-in-out infinite';
      resetSleepTimer();
      break;

    case 'think':
      if (body) { body.style.transformOrigin = '189.9px 320px'; body.style.animation = 'alfred-sway 1.4s ease-in-out infinite'; }
      if (eyeL) eyeL.style.animation = 'alfred-eye-lr 1.4s ease-in-out infinite';
      if (eyeR) eyeR.style.animation = 'alfred-eye-lr 1.4s ease-in-out infinite';
      if (dots) {
        dots.classList.add('show');
        ['alfred-dot1','alfred-dot2','alfred-dot3'].forEach((id,i) => {
          const d = document.getElementById(id);
          if (d) d.style.animation = `alfred-dot-pop 1.1s ease-in-out ${i*.22}s infinite`;
        });
      }
      break;

    case 'talk':
      if (body) body.style.animation = 'alfred-talk-vib .12s ease-in-out infinite alternate';
      if (eyeL) eyeL.style.animation = 'alfred-blink 3s ease-in-out infinite';
      if (eyeR) eyeR.style.animation = 'alfred-blink 3s ease-in-out .1s infinite';
      break;

    case 'sleep':
      if (body) body.style.animation = 'alfred-sleep 5s ease-in-out infinite';
      if (eyeL) { eyeL.style.transition='opacity .4s ease'; eyeL.style.opacity='0'; }
      if (eyeR) { eyeR.style.transition='opacity .4s ease'; eyeR.style.opacity='0'; }
      setTimeout(() => { if (lids && curState==='sleep') lids.style.display='block'; }, 400);
      if (zzz) {
        zzz.classList.add('show');
        zzz.querySelectorAll('.alfred-z').forEach((z,i) => {
          z.style.animation = `alfred-float-z 2.6s ease-in-out ${i*.75}s infinite`;
        });
      }
      // Bouche plate en sleep
      if (mouth) mouth.setAttribute('d','M163,130 Q189,132 216,130');
      break;
  }
}

// ── Clignement aléatoire ──────────────────────────────────
function startBlinking() {
  function blink() {
    if (curState === 'idle') {
      const eL = document.getElementById('alfred-eye-l');
      const eR = document.getElementById('alfred-eye-r');
      if (eL && eR) {
        eL.style.animation = 'alfred-blink .18s ease-in-out';
        eR.style.animation = 'alfred-blink .18s ease-in-out .05s';
        setTimeout(() => {
          if (curState === 'idle') { eL.style.animation='none'; eR.style.animation='none'; }
        }, 250);
      }
    }
    setTimeout(blink, 2500 + Math.random() * 4500);
  }
  setTimeout(blink, 2000);
}

// ── Suivi souris (yeux suivent) ───────────────────────────
function trackMouse() {
  document.addEventListener('mousemove', e => {
    if (curState !== 'idle') return;
    const svg = document.getElementById('alfred-svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    eyeTargetX = Math.max(-8, Math.min(8,  (e.clientX-(rect.left+rect.width/2))  / 30));
    eyeTargetY = Math.max(-4, Math.min(4,  (e.clientY-(rect.top +rect.height*.22))/ 45));
    resetSleepTimer();
  });
  document.addEventListener('keydown',  resetSleepTimer);
  document.addEventListener('click',    resetSleepTimer);
}

// ── Lerp yeux ─────────────────────────────────────────────
function startEyeLerp() {
  function lerp() {
    if (curState === 'idle') {
      eyeCurX += (eyeTargetX - eyeCurX) * .12;
      eyeCurY += (eyeTargetY - eyeCurY) * .12;
      const eL = document.getElementById('alfred-eye-l');
      const eR = document.getElementById('alfred-eye-r');
      if (eL) eL.style.transform = `translate(${eyeCurX.toFixed(2)}px,${eyeCurY.toFixed(2)}px)`;
      if (eR) eR.style.transform = `translate(${eyeCurX.toFixed(2)}px,${eyeCurY.toFixed(2)}px)`;
    }
    rafEyes = requestAnimationFrame(lerp);
  }
  rafEyes = requestAnimationFrame(lerp);
}

// ── Sleep auto 30s ────────────────────────────────────────
function resetSleepTimer() {
  clearTimeout(sleepTimer);
  if (curState === 'sleep') {
    // Remettre sourire quand réveil
    const mouth = document.getElementById('alfred-mouth');
    if (mouth) mouth.setAttribute('d','M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13');
    setAlfredState('idle');
  }
  sleepTimer = setTimeout(() => {
    if (curState === 'idle') setAlfredState('sleep');
  }, (ALFRED_CONFIG?.SLEEP_APRES || 30) * 1000);
}

// ── Bulle ─────────────────────────────────────────────────
function showBubble(text) {
  const b = document.getElementById('alfred-bubble');
  if (!b) return;
  b.classList.remove('show'); b.textContent=''; void b.offsetWidth; b.classList.add('show');
  const words = text.split(' '); let i = 0;
  const iv = setInterval(() => {
    if (i < words.length) { b.textContent += (i===0?'':' ')+words[i]; b.scrollTop=b.scrollHeight; i++; }
    else clearInterval(iv);
  }, 75);
}

// ── Helpers ───────────────────────────────────────────────
function showTranscript(t)   { const el=document.getElementById('alfred-transcript'); if(el) el.textContent=t||''; }
function updateVolBar(amp)    { const b=document.getElementById('alfred-vol-bar');     if(b) b.style.width=(amp*100)+'%'; }
function updateMicBtn(on)     { const b=document.getElementById('alfred-mic-btn');     if(!b) return; b.textContent=on?'⏹ Stop':'🎤 Parler'; b.classList.toggle('listening',on); }
function toggleMic()          { if(typeof isListening!=='undefined'&&isListening) recognition?.stop(); else if(typeof startListening==='function') startListening(); }
function toggleLangue()       { if(typeof switchLangue==='function') switchLangue(currentLangue==='fr'?'nl':'fr'); }
function addToHistory(w,t)    { console.log(`%c[${w.toUpperCase()}]%c ${t.substring(0,100)}`,`color:${w==='alfred'?'#14b0bd':'#888'};font-weight:bold`,'color:inherit'); }
function updateSecoursLabel(label,acte,idx,total) {
  const el=document.getElementById('alfred-secours');
  if(el){el.textContent=`A${acte} · ${label} · ${idx}/${total}`;setTimeout(()=>{if(el)el.textContent='← →';},4000);}
}

initAlfredUI();