// === ALFRED UI ===

let sleepTimer = null;
let eyeTargetX = 0, eyeTargetY = 0;
let eyeCurX    = 0, eyeCurY    = 0;
let rafEyes    = null;

const ALFRED_SVG = `
<div id="alfred-avatar-outer" style="position:relative;width:200px;height:210px;display:flex;align-items:center;justify-content:center;">

  <div id="alfred-shadow-ground" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:150px;height:20px;background:radial-gradient(ellipse,rgba(5,69,97,.5) 0%,transparent 70%);border-radius:50%;pointer-events:none;"></div>

  <div id="alfred-avatar-wrap" style="position:relative;width:175px;height:175px;">

    <svg id="alfred-extrusion" viewBox="0 0 379.79 383.47" xmlns="http://www.w3.org/2000/svg"
         style="position:absolute;top:7px;left:7px;width:155px;height:155px;overflow:visible;pointer-events:none;opacity:1;transition:opacity .4s ease;">
      <circle cx="189.9" cy="191.74" r="191" fill="#0a6b7a"/>
      <path fill="#0a6b7a" d="M246.68,12.44C230.03,4.47,211.1,0,189.28,0h-.53c-22.96.09-42.76,5.17-59.94,14.02C53.98,39.52,0,110.33,0,193.66c0,104.72,85.18,189.81,189.9,189.81s189.9-85.18,189.9-189.81c0-84.91-56-156.95-133.02-181.13l-.09-.09ZM126.63,30.06h.26c16.83-10.95,37.68-16.56,62.13-16.65h.7c32.16,0,58.01,9.64,77.03,28.66,35.32,35.32,35.49,92.1,35.49,92.89v.44s2.8,29.36-9.64,43.03c-4.29,4.73-9.9,7.01-17.18,7.01H107.44c-6.22.18-11.57-1.93-15.95-6.31-13.76-13.58-14.02-44.25-14.02-44.6,0-.53-.7-56.35,33.83-91.75,4.73-4.82,9.81-9.03,15.42-12.71h-.09ZM109.71,264.56l-3.07,2.1v81.58c-54.94-29.71-92.45-87.81-92.45-154.58,0-58.71,29.09-110.68,73.43-142.58-24.19,37.42-23.66,81.32-23.57,83.51,0,1.49.09,36.28,17.96,53.89,6.84,6.75,15.25,10.17,24.97,10.17h.53c10.95-.18,26.9-.18,44.69-.18-4.12,14.2-16.12,47.76-42.5,66.16v-.09ZM257.46,355.7c-20.86,8.76-43.64,13.58-67.56,13.58s-47.76-5.08-68.88-14.11v-81.15c30.85-23.49,42.94-63.09,46.09-75.63h15.07v93.06c-12.01,3.24-21.03,13.67-21.03,26.73,0,15.6,12.62,28.22,28.22,28.22s28.22-12.62,28.22-28.22c0-13.06-9.03-23.49-21.03-26.73v-93.06h15.07c3.15,12.53,15.25,52.05,46.09,75.54v81.67l-.26.09ZM271.74,348.86v-82.2l-3.07-2.1c-26.29-18.31-38.29-51.79-42.5-66.07h49.07c11.04,0,20.16-3.86,26.99-11.39,15.86-17.53,13.32-49.42,12.97-52.84,0-5.52-.96-48.64-25.5-84.91,45.66,31.72,75.63,84.48,75.63,144.15,0,67.3-38.03,125.75-93.77,155.19l.18.18Z"/>
    </svg>

    <svg id="alfred-svg" viewBox="0 0 379.79 383.47" xmlns="http://www.w3.org/2000/svg"
         style="position:absolute;top:0;left:0;overflow:visible;width:155px;height:155px;">

      <circle cx="189.9" cy="191.74" r="191" fill="white"/>
      <ellipse cx="130" cy="55" rx="55" ry="35" fill="rgba(255,255,255,0.15)" style="pointer-events:none;"/>

      <g id="alfred-body-main" style="transform-origin:189.9px 191.74px;">
        <path fill="#14b0bd" d="M246.68,12.44C230.03,4.47,211.1,0,189.28,0h-.53c-22.96.09-42.76,5.17-59.94,14.02C53.98,39.52,0,110.33,0,193.66c0,104.72,85.18,189.81,189.9,189.81s189.9-85.18,189.9-189.81c0-84.91-56-156.95-133.02-181.13l-.09-.09ZM126.63,30.06h.26c16.83-10.95,37.68-16.56,62.13-16.65h.7c32.16,0,58.01,9.64,77.03,28.66,35.32,35.32,35.49,92.1,35.49,92.89v.44s2.8,29.36-9.64,43.03c-4.29,4.73-9.9,7.01-17.18,7.01H107.44c-6.22.18-11.57-1.93-15.95-6.31-13.76-13.58-14.02-44.25-14.02-44.6,0-.53-.7-56.35,33.83-91.75,4.73-4.82,9.81-9.03,15.42-12.71h-.09ZM109.71,264.56l-3.07,2.1v81.58c-54.94-29.71-92.45-87.81-92.45-154.58,0-58.71,29.09-110.68,73.43-142.58-24.19,37.42-23.66,81.32-23.57,83.51,0,1.49.09,36.28,17.96,53.89,6.84,6.75,15.25,10.17,24.97,10.17h.53c10.95-.18,26.9-.18,44.69-.18-4.12,14.2-16.12,47.76-42.5,66.16v-.09ZM257.46,355.7c-20.86,8.76-43.64,13.58-67.56,13.58s-47.76-5.08-68.88-14.11v-81.15c30.85-23.49,42.94-63.09,46.09-75.63h15.07v93.06c-12.01,3.24-21.03,13.67-21.03,26.73,0,15.6,12.62,28.22,28.22,28.22s28.22-12.62,28.22-28.22c0-13.06-9.03-23.49-21.03-26.73v-93.06h15.07c3.15,12.53,15.25,52.05,46.09,75.54v81.67l-.26.09ZM271.74,348.86v-82.2l-3.07-2.1c-26.29-18.31-38.29-51.79-42.5-66.07h49.07c11.04,0,20.16-3.86,26.99-11.39,15.86-17.53,13.32-49.42,12.97-52.84,0-5.52-.96-48.64-25.5-84.91,45.66,31.72,75.63,84.48,75.63,144.15,0,67.3-38.03,125.75-93.77,155.19l.18.18Z"/>
        <path fill="#14b0bd" d="M275.51,107.61H103.4l-.79-4.38c-.18-1.14-5-28.83,8.06-44.34,5.7-6.75,13.67-10.17,23.66-10.17h110.94c9.64,0,17.35,3.42,22.87,9.9,12.97,15.42,8.33,43.38,8.15,44.52l-.79,4.47h0ZM112.61,96.92h153.71c.61-7.54.88-22.87-6.31-31.37-3.42-4.12-8.24-6.05-14.63-6.13-.88,0-110.85,0-110.77,0h-.09c-6.84,0-11.92,2.1-15.51,6.4-6.75,8.06-7.1,22.61-6.31,31.2"/>
        <g id="alfred-eye-l" style="transform-origin:141.97px 78.17px;">
          <path fill="#14b0bd" d="M155.55,78.17c0,7.54-6.05,13.58-13.58,13.58s-13.58-6.13-13.58-13.58,6.05-13.58,13.58-13.58,13.58,6.13,13.58,13.58"/>
        </g>
        <g id="alfred-eye-r" style="transform-origin:238.10px 78.17px;">
          <path fill="#14b0bd" d="M251.68,78.17c0,7.54-6.05,13.58-13.58,13.58s-13.58-6.13-13.58-13.58,6.05-13.58,13.58-13.58,13.58,6.13,13.58,13.58"/>
        </g>
        <g id="alfred-lids" style="display:none;">
          <path stroke="#14b0bd" stroke-width="5" stroke-linecap="round" fill="none" d="M128.39,78.17 Q141.97,88.1 155.55,78.17"/>
          <line x1="134" y1="80" x2="131" y2="89" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="142" y1="83" x2="142" y2="92" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="150" y1="80" x2="153" y2="89" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <path stroke="#14b0bd" stroke-width="5" stroke-linecap="round" fill="none" d="M224.52,78.17 Q238.10,88.1 251.68,78.17"/>
          <line x1="230" y1="80" x2="227" y2="89" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="238" y1="83" x2="238" y2="92" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="246" y1="80" x2="249" y2="89" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
        </g>
        <path id="alfred-mouth" fill="#14b0bd" d="M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13"/>
        <ellipse id="alfred-mouth-talk" fill="#14b0bd" cx="189" cy="128" rx="20" ry="0" style="display:none;"/>
      </g>

      <ellipse cx="130" cy="55" rx="55" ry="35" fill="rgba(255,255,255,0.15)" style="pointer-events:none;"/>
    </svg>

    <div id="alfred-dots" style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:5px;opacity:0;transition:opacity .3s;z-index:3;">
      <div class="alfred-dot" id="alfred-dot1"></div>
      <div class="alfred-dot" id="alfred-dot2"></div>
      <div class="alfred-dot" id="alfred-dot3"></div>
    </div>
    <div id="alfred-zzz" style="position:absolute;top:50px;right:25px;pointer-events:none;opacity:0;transition:opacity .4s;z-index:10;">
      <span class="alfred-z" style="font-size:11px;right:0;top:32px;color:rgba(5,69,97,.7);">z</span>
      <span class="alfred-z" style="font-size:14px;right:8px;top:16px;color:rgba(5,69,97,.7);">z</span>
      <span class="alfred-z" style="font-size:18px;right:16px;top:0;color:rgba(5,69,97,.7);">Z</span>
    </div>
  </div>
</div>`;

// ── Sous-titres ───────────────────────────────────────────
function creerSousTitres() {
  if (document.getElementById('alfred-subtitles')) return;
  const sub = document.createElement('div');
  sub.id = 'alfred-subtitles';
  sub.style.cssText = `
    position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
    max-width:70%; background:rgba(0,0,0,0.72); color:#fff;
    font-size:20px; font-weight:500; line-height:1.5;
    padding:12px 28px; border-radius:10px;
    text-align:center; z-index:999997;
    opacity:0; transition:opacity .3s ease;
    pointer-events:none; font-family:sans-serif;
    letter-spacing:0.01em;
  `;
  document.body.appendChild(sub);
}

let subtitleInterval = null;

function afficherSousTitres(text) {
  const sub = document.getElementById('alfred-subtitles');
  if (!sub || !text) return;
  clearInterval(subtitleInterval);
  sub.style.opacity = '1';

  // Découper en phrases
  const phrases = text.match(/[^.!?]+[.!?]+/g) || [text];
  let i = 0;
  sub.textContent = phrases[0] || '';

  subtitleInterval = setInterval(() => {
    i++;
    if (i < phrases.length) {
      sub.textContent = phrases[i].trim();
    } else {
      clearInterval(subtitleInterval);
    }
  }, 3500); // change de phrase toutes les 3.5s
}

function cacherSousTitres() {
  clearInterval(subtitleInterval);
  const sub = document.getElementById('alfred-subtitles');
  if (sub) {
    sub.style.opacity = '0';
    setTimeout(() => { sub.textContent = ''; }, 300);
  }
}

// ── Panneau répliques (double-clic sur Alfred) ────────────
function creerPanneauRepliques() {
  if (document.getElementById('alfred-repliques-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'alfred-repliques-panel';
  panel.style.cssText = `
    display:none; position:fixed;
    top:50%; left:270px; transform:translateY(-50%);
    background:rgba(5,69,97,0.97); border-radius:14px;
    padding:16px; z-index:999999; min-width:440px;
    box-shadow:0 8px 40px rgba(0,0,0,0.5);
    font-family:sans-serif;
  `;
  panel.innerHTML = `
    <div style="color:rgba(255,255,255,.35);font-size:8px;letter-spacing:2.5px;margin-bottom:12px;text-align:center;">SCRIPT · ALFRED</div>
    <div style="display:flex;gap:20px;align-items:flex-start;">
      <div id="alfred-col-1" style="flex:1;"></div>
      <div id="alfred-col-2" style="flex:1.2;"></div>
      <div id="alfred-col-3" style="flex:0.7;"></div>
    </div>
  `;
  document.body.appendChild(panel);

  const svgEl = document.getElementById('alfred-svg');
  if (svgEl) {
    svgEl.style.cursor = 'pointer';
    let lastClick = 0;
    svgEl.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastClick < 400) {
        const visible = panel.style.display !== 'none';
        if (visible) { panel.style.display = 'none'; }
        else { remplirPanneauRepliques(); panel.style.display = 'block'; }
      }
      lastClick = now;
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') panel.style.display = 'none';
  });
}

function remplirPanneauRepliques() {
  const list = (typeof currentLangue !== 'undefined' && currentLangue === 'nl')
    ? ALFRED_CONFIG.REPLIQUES_NL
    : ALFRED_CONFIG.REPLIQUES_FR;
  const acte1 = list.filter(r => r.acte === 1);
  const acte2 = list.filter(r => r.acte === 2);
  const acte3 = list.filter(r => r.acte === 3);

  function renderCol(colId, repliques, acteNum) {
    const col = document.getElementById(colId);
    if (!col) return;
    col.innerHTML = `<div style="color:rgba(255,255,255,.3);font-size:8px;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;">Acte ${acteNum}</div>`;
    repliques.forEach(r => {
      const idx = list.indexOf(r);
      const btn = document.createElement('div');
      btn.textContent = r.label;
      btn.style.cssText = `color:rgba(255,255,255,.75);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;margin-bottom:2px;transition:background .15s,color .15s;`;
      btn.onmouseover = () => { btn.style.background='rgba(255,255,255,.12)'; btn.style.color='#fff'; };
      btn.onmouseout  = () => { btn.style.background='transparent'; btn.style.color='rgba(255,255,255,.75)'; };
      btn.onclick = () => {
        if (typeof secoursIdx !== 'undefined') secoursIdx = idx;
        document.getElementById('alfred-repliques-panel').style.display = 'none';
        if (typeof jouerSecours === 'function') jouerSecours();
      };
      col.appendChild(btn);
    });
  }
  renderCol('alfred-col-1', acte1, 1);
  renderCol('alfred-col-2', acte2, 2);
  renderCol('alfred-col-3', acte3, 3);
}

// ── Init UI ───────────────────────────────────────────────
function initAlfredUI() {
  if (document.getElementById('alfred-left-panel')) return;

  const style = document.createElement('style');
  style.id = 'alfred-styles';
  style.textContent = `
    body.alfred-active { margin:0; padding:0; overflow:hidden; }
    #alfred-wrapper { display:flex; height:100vh; width:100vw; position:fixed; top:0; left:0; z-index:99998; pointer-events:none; }
    #alfred-left-panel {
      width:0; min-width:0; height:100vh;
      background:linear-gradient(180deg,#054561 0%,#14b0bd 50%,#ebe0c4 100%);
      display:flex; flex-direction:column; align-items:center; padding:20px 0 16px;
      box-shadow:4px 0 32px rgba(5,69,97,.35);
      overflow:hidden; pointer-events:all; position:relative; flex-shrink:0;
      transition:width .6s cubic-bezier(.32,.72,0,1), min-width .6s cubic-bezier(.32,.72,0,1), padding .6s cubic-bezier(.32,.72,0,1);
    }
    #alfred-left-panel.visible { width:270px; min-width:270px; padding:20px 16px 16px; }
    #alfred-logo { color:rgba(255,255,255,.7); font-size:9px; font-weight:700; letter-spacing:2.5px; margin-bottom:10px; text-align:center; white-space:nowrap; opacity:0; transition:opacity .4s ease .3s; font-family:-apple-system,sans-serif; }
    #alfred-left-panel.visible #alfred-logo { opacity:1; }
    .alfred-dot { width:6px; height:6px; border-radius:50%; background:#14b0bd; }
    .alfred-z { position:absolute; font-weight:800; opacity:0; font-family:sans-serif; }
    #alfred-state-lbl { color:rgba(255,255,255,.4); font-size:8px; letter-spacing:1.5px; text-transform:uppercase; margin-top:6px; text-align:center; font-family:sans-serif; }
    #alfred-transcript { font-size:10px; color:rgba(255,255,255,.5); font-style:italic; text-align:center; margin-top:12px; min-height:13px; width:100%; font-family:sans-serif; padding:0 4px; box-sizing:border-box; }
    #alfred-vol-wrap { width:100%; height:2px; background:rgba(255,255,255,.1); border-radius:1px; margin-top:10px; overflow:hidden; }
    #alfred-vol-bar { height:100%; width:0%; background:rgba(255,255,255,.6); border-radius:1px; transition:width .04s linear; }
    #alfred-mic-btn { margin-top:12px; background:rgba(255,255,255,.15); color:rgba(255,255,255,.9); border:1px solid rgba(255,255,255,.3); border-radius:20px; padding:8px 16px; font-size:11px; font-weight:600; cursor:pointer; width:100%; transition:background .2s,transform .15s; font-family:sans-serif; }
    #alfred-mic-btn:hover { background:rgba(255,255,255,.25); transform:translateY(-1px); }
    #alfred-mic-btn.listening { background:rgba(255,255,255,.9); color:#054561; animation:alfred-pulse-mic 1.2s ease-in-out infinite; }
    #alfred-langue-lbl { font-size:9px; color:rgba(255,255,255,.3); margin-top:8px; cursor:pointer; transition:color .2s; font-family:sans-serif; user-select:none; }
    #alfred-langue-lbl:hover { color:rgba(255,255,255,.7); }
    #alfred-secours { position:absolute; bottom:8px; left:0; right:0; text-align:center; font-size:7px; color:rgba(255,255,255,.1); transition:color .3s; font-family:sans-serif; cursor:default; }
    #alfred-secours:hover { color:rgba(255,255,255,.45); }
    #alfred-site-content { flex:1; height:100vh; overflow:auto; pointer-events:all; min-width:0; }

    @keyframes alfred-breathe {
      0%,100% { transform:translateY(0) scale(1); }
      50%      { transform:translateY(-5px) scale(1.016); }
    }
    @keyframes alfred-shadow-breathe {
      0%,100% { width:150px; height:20px; opacity:1; }
      50%      { width:120px; height:13px; opacity:.55; }
    }
    @keyframes alfred-sway {
      0%,100% { transform:rotate(-2.5deg); }
      50%      { transform:rotate(2.5deg); }
    }
    @keyframes alfred-talk-vib {
      0%   { transform:translateX(-.7px); }
      100% { transform:translateX(.7px); }
    }
    @keyframes alfred-sleep {
      0%,100% { transform:translateY(0) rotate(0deg); }
      50%      { transform:translateY(6px) rotate(.4deg); }
    }
    @keyframes alfred-shadow-sleep {
      0%,100% { width:150px; opacity:.35; }
      50%      { width:165px; opacity:.18; }
    }
    @keyframes alfred-eye-lr   { 0%,100%{transform:translateX(-8px);} 50%{transform:translateX(8px);} }
    @keyframes alfred-blink    { 0%,100%{transform:scaleY(1);} 50%{transform:scaleY(.06);} }
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
    <div id="alfred-logo">ALFRED · WELLNOT</div>
    ${ALFRED_SVG}
    <div id="alfred-state-lbl">EN ATTENTE</div>
    <div id="alfred-transcript"></div>
    <div id="alfred-vol-wrap"><div id="alfred-vol-bar"></div></div>
    <button id="alfred-mic-btn" onclick="toggleMic()">🎤 Parler</button>
    <div id="alfred-langue-lbl" onclick="toggleLangue()">🇧🇪 FR</div>
    <div id="alfred-secours">← →</div>
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

  creerSousTitres();
  creerPanneauRepliques();
  startBlinking();
  startEyeLerp();
  resetSleepTimer();
  trackMouse();

  setTimeout(async () => {
    setAlfredState('idle');
    const msg = "Bonjour. Alfred est en ligne.";
    if (typeof speak === 'function') await speak(msg, 'fr');
  }, 700);
}

// ── États Alfred ──────────────────────────────────────────
function setAlfredState(state) {
  curState = state;
  const wrap    = document.getElementById('alfred-avatar-wrap');
  const shadow  = document.getElementById('alfred-shadow-ground');
  const ext     = document.getElementById('alfred-extrusion');
  const body    = document.getElementById('alfred-body-main');
  const eyeL    = document.getElementById('alfred-eye-l');
  const eyeR    = document.getElementById('alfred-eye-r');
  const dots    = document.getElementById('alfred-dots');
  const zzz     = document.getElementById('alfred-zzz');
  const lbl     = document.getElementById('alfred-state-lbl');
  const lids    = document.getElementById('alfred-lids');
  const mouth   = document.getElementById('alfred-mouth');
  const mouthT  = document.getElementById('alfred-mouth-talk');

  // Reset
  if (wrap)   { wrap.style.animation='none'; void wrap.offsetWidth; }
  if (shadow) { shadow.style.animation='none'; shadow.style.width='150px'; shadow.style.opacity='1'; }
  if (ext)    { ext.style.opacity='1'; }
  if (body)   { body.style.animation='none'; void body.offsetWidth; body.style.transformOrigin='189.9px 191.74px'; }
  if (eyeL)   { eyeL.style.animation='none'; eyeL.style.transform=''; eyeL.style.opacity='1'; }
  if (eyeR)   { eyeR.style.animation='none'; eyeR.style.transform=''; eyeR.style.opacity='1'; }
  if (dots)   dots.style.opacity='0';
  if (zzz)    zzz.style.opacity='0';
  if (lids)   lids.style.display='none';
  if (mouth)  { mouth.style.display='block'; mouth.setAttribute('d','M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13'); }
  if (mouthT) { mouthT.style.display='none'; mouthT.setAttribute('ry','0'); }

  const labels = { idle:'EN ATTENTE', think:'RÉFLEXION...', talk:'EN TRAIN DE PARLER', sleep:'VEILLE' };
  if (lbl) lbl.textContent = labels[state] || '';

  switch(state) {
    case 'idle':
      if (wrap)   wrap.style.animation   = 'alfred-breathe 4s ease-in-out infinite';
      if (shadow) shadow.style.animation = 'alfred-shadow-breathe 4s ease-in-out infinite';
      resetSleepTimer();
      break;

    case 'think':
      if (body)  { body.style.transformOrigin='189.9px 320px'; body.style.animation='alfred-sway 1.4s ease-in-out infinite'; }
      if (eyeL)  eyeL.style.animation = 'alfred-eye-lr 1.4s ease-in-out infinite';
      if (eyeR)  eyeR.style.animation = 'alfred-eye-lr 1.4s ease-in-out infinite';
      if (dots)  {
        dots.style.opacity='1';
        ['alfred-dot1','alfred-dot2','alfred-dot3'].forEach((id,i) => {
          const d = document.getElementById(id);
          if (d) d.style.animation = `alfred-dot-pop 1.1s ease-in-out ${i*.22}s infinite`;
        });
      }
      break;

    case 'talk':
      if (wrap) wrap.style.animation = 'alfred-talk-vib .12s ease-in-out infinite alternate';
      if (mouth)  mouth.style.display  = 'none';
      if (mouthT) mouthT.style.display = 'block';
      clearInterval(talkTick);
      talkTick = setInterval(() => {
        if (!mouthT) return;
        const open = Math.random() > 0.4;
        mouthT.setAttribute('ry', open ? (3 + Math.random()*9).toFixed(1) : '1');
        mouthT.setAttribute('cy', open ? '130' : '128');
      }, 120);
      break;

    case 'sleep':
      if (wrap)   wrap.style.animation   = 'alfred-sleep 5s ease-in-out infinite';
      if (shadow) shadow.style.animation = 'alfred-shadow-sleep 5s ease-in-out infinite';
      if (ext)    ext.style.opacity      = '0.3';
      if (eyeL)   { eyeL.style.transition='opacity .4s ease'; eyeL.style.opacity='0'; }
      if (eyeR)   { eyeR.style.transition='opacity .4s ease'; eyeR.style.opacity='0'; }
      if (mouth)  mouth.setAttribute('d','M163,130 Q189,132 216,130');
      setTimeout(() => { if (lids && curState==='sleep') lids.style.display='block'; }, 400);
      if (zzz) {
        zzz.style.opacity='1';
        zzz.querySelectorAll('.alfred-z').forEach((z,i) => {
          z.style.animation = `alfred-float-z 2.6s ease-in-out ${i*.75}s infinite`;
        });
      }
      break;
  }
}

function startBlinking() {
  function blink() {
    if (curState === 'idle') {
      const eL = document.getElementById('alfred-eye-l');
      const eR = document.getElementById('alfred-eye-r');
      if (eL && eR) {
        eL.style.animation = 'alfred-blink .18s ease-in-out';
        eR.style.animation = 'alfred-blink .18s ease-in-out .05s';
        setTimeout(() => {
          if (curState==='idle') { eL.style.animation='none'; eR.style.animation='none'; }
        }, 250);
      }
    }
    setTimeout(blink, 2500 + Math.random()*4500);
  }
  setTimeout(blink, 2000);
}

function trackMouse() {
  document.addEventListener('mousemove', e => {
    if (curState !== 'idle') return;
    const svg = document.getElementById('alfred-svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    eyeTargetX = Math.max(-8, Math.min(8,  (e.clientX-(rect.left+rect.width/2))/30));
    eyeTargetY = Math.max(-4, Math.min(4,  (e.clientY-(rect.top+rect.height*.22))/45));
    resetSleepTimer();
  });
  document.addEventListener('keydown', resetSleepTimer);
  document.addEventListener('click',   resetSleepTimer);
}

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

function resetSleepTimer() {
  clearTimeout(sleepTimer);
  if (curState === 'sleep') {
    const mouth = document.getElementById('alfred-mouth');
    if (mouth) mouth.setAttribute('d','M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13');
    setAlfredState('idle');
  }
  sleepTimer = setTimeout(() => {
    if (curState==='idle') setAlfredState('sleep');
  }, (ALFRED_CONFIG?.SLEEP_APRES || 30) * 1000);
}

// ── Helpers UI ────────────────────────────────────────────
function showBubble(text)    { afficherSousTitres(text); }
function showTranscript(t)   { const el=document.getElementById('alfred-transcript'); if(el) el.textContent=t||''; }
function updateVolBar(amp)   { const b=document.getElementById('alfred-vol-bar'); if(b) b.style.width=(amp*100)+'%'; }
function updateMicBtn(on)    { const b=document.getElementById('alfred-mic-btn'); if(!b)return; b.textContent=on?'⏹ Stop':'🎤 Parler'; b.classList.toggle('listening',on); }
function toggleMic()         { if(typeof isListening!=='undefined'&&isListening) recognition?.stop(); else if(typeof startListening==='function') startListening(); }
function toggleLangue()      { if(typeof switchLangue==='function') switchLangue(currentLangue==='fr'?'nl':'fr'); }
function addToHistory(w,t)   { console.log(`%c[${w.toUpperCase()}]%c ${t.substring(0,100)}`,`color:${w==='alfred'?'#14b0bd':'#888'};font-weight:bold`,'color:inherit'); }
function updateSecoursLabel(label,acte,idx,total) {
  const el=document.getElementById('alfred-secours');
  if(el){ el.textContent=`A${acte} · ${label} · ${idx}/${total}`; setTimeout(()=>{ if(el) el.textContent='← →'; },4000); }
}

initAlfredUI();