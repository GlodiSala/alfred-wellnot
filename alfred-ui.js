// === ALFRED UI — Split-screen + vrai SVG + animations fluides ===

let curState = 'idle';
let sleepTimer = null;
let eyeTargetX = 0, eyeTargetY = 0;
let eyeCurX = 0, eyeCurY = 0;
let rafEyes = null;

// === PATHS BOUCHE ===
const MOUTH = {
  smile: "M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13",
  flat:  "M174,133 Q189,135 204,133",
  think: "M175,133 Q189,129 203,133",
  open:  (amp) => `M169,125 Q189,${125 + amp * 32} 209,125 Q189,${125 + amp * 14} 169,125`
};

// === CRÉATION UI ===
function initAlfredUI() {
  if (document.getElementById('alfred-left-panel')) return;

  // === CSS ===
  const style = document.createElement('style');
  style.id = 'alfred-styles';
  style.textContent = `
    /* === RESET BODY === */
    body.alfred-active {
      margin-left: 0 !important;
      padding-left: 0 !important;
    }

    /* === WRAPPER === */
    #alfred-wrapper {
      display: flex;
      height: 100vh;
      width: 100vw;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 99998;
      pointer-events: none;
    }

    /* === PANNEAU GAUCHE === */
    #alfred-left-panel {
      width: 0px;
      min-width: 0px;
      height: 100vh;
      background: linear-gradient(
        180deg,
        #054561 0%,
        #0e7b84 35%,
        #14b0bd 65%,
        #ebe0c4 100%
      );
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0 16px;
      box-shadow: 4px 0 32px rgba(5,69,97,0.35);
      overflow: hidden;
      pointer-events: all;
      transition: width 0.6s cubic-bezier(0.32, 0.72, 0, 1),
                  min-width 0.6s cubic-bezier(0.32, 0.72, 0, 1),
                  padding 0.6s cubic-bezier(0.32, 0.72, 0, 1);
      flex-shrink: 0;
    }

    #alfred-left-panel.visible {
      width: 270px;
      min-width: 270px;
      padding: 20px 16px 16px;
    }

    /* === CONTENU SITE À DROITE === */
    #alfred-site-content {
      flex: 1;
      height: 100vh;
      overflow: auto;
      pointer-events: all;
      min-width: 0;
    }

    /* === LOGO === */
    #alfred-logo {
      color: rgba(255,255,255,0.55);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2.5px;
      margin-bottom: 14px;
      text-align: center;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.4s ease 0.3s;
    }

    #alfred-left-panel.visible #alfred-logo {
      opacity: 1;
    }

    /* === AVATAR WRAPPER === */
    #alfred-avatar-wrap {
      position: relative;
      width: 160px;
      height: 170px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* === SVG === */
    #alfred-svg {
      width: 160px;
      height: 160px;
      overflow: visible;
      filter: drop-shadow(0 6px 16px rgba(0,0,0,0.25));
    }

    /* === CORPS === */
    #alfred-body-main {
      transform-origin: 190px 191px;
    }

    /* === YEUX === */
    #alfred-eye-l {
      transform-origin: 142px 78px;
      transition: transform 0.08s ease-out;
    }
    #alfred-eye-r {
      transform-origin: 238px 78px;
      transition: transform 0.08s ease-out;
    }

    /* === DOTS THINK === */
    #alfred-dots {
      position: absolute;
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 5px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    #alfred-dots.show { opacity: 1; }
    .alfred-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255,255,255,0.7);
    }

    /* === ZZZ === */
    #alfred-zzz {
      position: absolute;
      top: 0;
      right: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    #alfred-zzz.show { opacity: 1; }
    .alfred-z {
      position: absolute;
      font-weight: 800;
      color: rgba(255,255,255,0.5);
      opacity: 0;
    }

    /* === ÉTAT LABEL === */
    #alfred-state-lbl {
      color: rgba(255,255,255,0.35);
      font-size: 8px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 4px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: opacity 0.3s ease;
    }

    /* === BULLE === */
    #alfred-bubble {
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 14px 14px 14px 4px;
      padding: 10px 12px;
      font-size: 11px;
      color: rgba(255,255,255,0.95);
      line-height: 1.65;
      min-height: 46px;
      max-height: 130px;
      overflow-y: auto;
      margin-top: 10px;
      width: 100%;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.35s ease, transform 0.35s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-sizing: border-box;
    }
    #alfred-bubble.show {
      opacity: 1;
      transform: translateY(0);
    }

    /* === TRADUCTION === */
    #alfred-translation {
      font-size: 9px;
      color: rgba(255,255,255,0.35);
      font-style: italic;
      margin-top: 5px;
      width: 100%;
      min-height: 14px;
      text-align: center;
      padding: 0 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: opacity 0.3s ease;
    }

    /* === TRANSCRIPT === */
    #alfred-transcript {
      font-size: 9px;
      color: rgba(255,255,255,0.25);
      font-style: italic;
      text-align: center;
      margin-top: 3px;
      min-height: 13px;
      width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* === VOL BAR === */
    #alfred-vol-wrap {
      width: 100%;
      height: 2px;
      background: rgba(255,255,255,0.08);
      border-radius: 1px;
      margin-top: 6px;
      overflow: hidden;
    }
    #alfred-vol-bar {
      height: 100%;
      width: 0%;
      background: rgba(255,255,255,0.5);
      border-radius: 1px;
      transition: width 0.04s linear;
    }

    /* === BOUTON MICRO === */
    #alfred-mic-btn {
      margin-top: 10px;
      background: rgba(255,255,255,0.13);
      color: rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      letter-spacing: 0.5px;
      transition: background 0.2s ease, transform 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #alfred-mic-btn:hover {
      background: rgba(255,255,255,0.22);
      transform: translateY(-1px);
    }
    #alfred-mic-btn.listening {
      background: rgba(255,255,255,0.88);
      color: #054561;
      animation: alfred-pulse-mic 1.2s ease-in-out infinite;
    }

    /* === LANGUE === */
    #alfred-langue-lbl {
      font-size: 9px;
      color: rgba(255,255,255,0.25);
      margin-top: 6px;
      letter-spacing: 1px;
      cursor: pointer;
      transition: color 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      user-select: none;
    }
    #alfred-langue-lbl:hover { color: rgba(255,255,255,0.65); }

    /* === SECOURS ULTRA DISCRET === */
    #alfred-secours {
      position: absolute;
      bottom: 8px;
      left: 0; right: 0;
      text-align: center;
      font-size: 7px;
      color: rgba(255,255,255,0.1);
      letter-spacing: 0.5px;
      transition: color 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: default;
    }
    #alfred-secours:hover { color: rgba(255,255,255,0.45); }

    /* === ANIMATIONS === */
    @keyframes alfred-breathe {
      0%, 100% { transform: scaleY(1) scaleX(1); }
      33%       { transform: scaleY(1.008) scaleX(0.998); }
      66%       { transform: scaleY(0.994) scaleX(1.002); }
    }

    @keyframes alfred-think {
      0%, 100% { opacity: 0.5; transform: scale(0.98); }
      50%       { opacity: 1;   transform: scale(1); }
    }

    @keyframes alfred-talk {
      0%   { transform: translateX(-0.6px) rotate(-0.2deg); }
      100% { transform: translateX(0.6px)  rotate(0.2deg); }
    }

    @keyframes alfred-sleep {
      0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
      25%       { transform: translateY(2px) rotate(-0.3deg) scale(0.998); }
      75%       { transform: translateY(3px) rotate(0.2deg) scale(0.997); }
    }

    @keyframes alfred-dot-pop {
      0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
      50%       { opacity: 1; transform: translateY(-3px) scale(1.1); }
    }

    @keyframes alfred-float-z {
      0%   { opacity: 0; transform: translate(0,0) rotate(-8deg) scale(0.8); }
      15%  { opacity: 0.7; }
      85%  { opacity: 0.3; }
      100% { opacity: 0; transform: translate(14px,-30px) rotate(14deg) scale(1.1); }
    }

    @keyframes alfred-blink {
      0%, 100% { transform: scaleY(1); }
      50%       { transform: scaleY(0.06); }
    }

    @keyframes alfred-pulse-mic {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
      50%       { box-shadow: 0 0 0 8px rgba(255,255,255,0.04); }
    }

    @keyframes alfred-eye-think {
      0%, 100% { transform: translateX(0); }
      25%       { transform: translateX(7px); }
      75%       { transform: translateX(-7px); }
    }
  `;
  document.head.appendChild(style);

  // === STRUCTURE HTML ===
  const wrapper = document.createElement('div');
  wrapper.id = 'alfred-wrapper';

  const left = document.createElement('div');
  left.id = 'alfred-left-panel';
  left.innerHTML = `
    <div id="alfred-logo">ALFRED · WELLNOT</div>

    <div id="alfred-avatar-wrap">
      <!-- ZZZ -->
      <div id="alfred-zzz">
        <span class="alfred-z" style="font-size:11px;right:0;top:32px;">z</span>
        <span class="alfred-z" style="font-size:14px;right:7px;top:16px;">z</span>
        <span class="alfred-z" style="font-size:18px;right:14px;top:0;">Z</span>
      </div>

      <!-- Dots think -->
      <div id="alfred-dots">
        <div class="alfred-dot" id="alfred-dot1"></div>
        <div class="alfred-dot" id="alfred-dot2"></div>
        <div class="alfred-dot" id="alfred-dot3"></div>
      </div>

      <!-- SVG Alfred COMPLET -->
      <svg id="alfred-svg" viewBox="0 0 379.79 383.47"
           xmlns="http://www.w3.org/2000/svg" style="overflow:visible">

        <!-- CORPS COMPLET -->
        <g id="alfred-body-main">
          <path class="alfred-cls1" d="M246.68,12.44C230.03,4.47,211.1,0,189.28,0h-.53c-22.96.09-42.76,5.17-59.94,14.02C53.98,39.52,0,110.33,0,193.66c0,104.72,85.18,189.81,189.9,189.81s189.9-85.18,189.9-189.81c0-84.91-56-156.95-133.02-181.13l-.09-.09ZM126.63,30.06h.26c16.83-10.95,37.68-16.56,62.13-16.65h.7c32.16,0,58.01,9.64,77.03,28.66,35.32,35.32,35.49,92.1,35.49,92.89v.44s2.8,29.36-9.64,43.03c-4.29,4.73-9.9,7.01-17.18,7.01H107.44c-6.22.18-11.57-1.93-15.95-6.31-13.76-13.58-14.02-44.25-14.02-44.6,0-.53-.7-56.35,33.83-91.75,4.73-4.82,9.81-9.03,15.42-12.71h-.09ZM109.71,264.56l-3.07,2.1v81.58c-54.94-29.71-92.45-87.81-92.45-154.58,0-58.71,29.09-110.68,73.43-142.58-24.19,37.42-23.66,81.32-23.57,83.51,0,1.49.09,36.28,17.96,53.89,6.84,6.75,15.25,10.17,24.97,10.17h.53c10.95-.18,26.9-.18,44.69-.18-4.12,14.2-16.12,47.76-42.5,66.16v-.09ZM257.46,355.7c-20.86,8.76-43.64,13.58-67.56,13.58s-47.76-5.08-68.88-14.11v-81.15c30.85-23.49,42.94-63.09,46.09-75.63h15.07v93.06c-12.01,3.24-21.03,13.67-21.03,26.73,0,15.6,12.62,28.22,28.22,28.22s28.22-12.62,28.22-28.22c0-13.06-9.03-23.49-21.03-26.73v-93.06h15.07c3.15,12.53,15.25,52.05,46.09,75.54v81.67l-.26.09ZM271.74,348.86v-82.2l-3.07-2.1c-26.29-18.31-38.29-51.79-42.5-66.07h49.07c11.04,0,20.16-3.86,26.99-11.39,15.86-17.53,13.32-49.42,12.97-52.84,0-5.52-.96-48.64-25.5-84.91,45.66,31.72,75.63,84.48,75.63,144.15,0,67.3-38.03,125.75-93.77,155.19l.18.18Z"/>
        </g>

        <!-- VISAGE -->
        <g>
          <!-- Bandeau -->
          <path fill="#fff" d="M275.51,107.61H103.4l-.79-4.38c-.18-1.14-5-28.83,8.06-44.34,5.7-6.75,13.67-10.17,23.66-10.17h110.94c9.64,0,17.35,3.42,22.87,9.9,12.97,15.42,8.33,43.38,8.15,44.52l-.79,4.47h0ZM112.61,96.92h153.71c.61-7.54.88-22.87-6.31-31.37-3.42-4.12-8.24-6.05-14.63-6.13-.88,0-110.85,0-110.77,0h-.09c-6.84,0-11.92,2.1-15.51,6.4-6.75,8.06-7.1,22.61-6.31,31.2"/>

          <!-- Oeil gauche -->
          <g id="alfred-eye-l" style="transform-origin:142px 78px;">
            <path fill="#14b0bd" d="M155.55,78.17c0,7.54-6.05,13.58-13.58,13.58s-13.58-6.13-13.58-13.58,6.05-13.58,13.58-13.58,13.58,6.13,13.58,13.58"/>
            <!-- Pupille blanche -->
            <circle fill="rgba(255,255,255,0.6)" cx="146" cy="73" r="4"/>
          </g>

          <!-- Oeil droit -->
          <g id="alfred-eye-r" style="transform-origin:238px 78px;">
            <path fill="#14b0bd" d="M251.68,78.17c0,7.54-6.05,13.58-13.58,13.58s-13.58-6.13-13.58-13.58,6.05-13.58,13.58-13.58,13.58,6.13,13.58,13.58"/>
            <!-- Pupille blanche -->
            <circle fill="rgba(255,255,255,0.6)" cx="242" cy="73" r="4"/>
          </g>

          <!-- Bouche -->
          <path id="alfred-mouth" fill="#14b0bd"
            d="M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13"/>
        </g>
      </svg>
    </div>

    <!-- CSS couleur SVG -->
    <style>
      .alfred-cls1 { fill: #14b0bd; }
    </style>

    <div id="alfred-state-lbl">EN ATTENTE</div>
    <div id="alfred-bubble"></div>
    <div id="alfred-translation"></div>
    <div id="alfred-transcript"></div>
    <div id="alfred-vol-wrap"><div id="alfred-vol-bar"></div></div>

    <button id="alfred-mic-btn" onclick="toggleMic()">🎤 Parler</button>

    <div id="alfred-langue-lbl"
         onclick="toggleLangue()"
         title="Clic ou F=français N=néerlandais">
      🇧🇪 FR
    </div>

    <div id="alfred-secours">← →</div>
  `;

  // === DÉPLACE LE CONTENU DU SITE À DROITE ===
  const siteContent = document.createElement('div');
  siteContent.id = 'alfred-site-content';

  // Déplace tout le contenu existant dans siteContent
  while (document.body.firstChild) {
    siteContent.appendChild(document.body.firstChild);
  }

  wrapper.appendChild(left);
  wrapper.appendChild(siteContent);
  document.body.appendChild(wrapper);
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;';

  // Animation d'entrée
  requestAnimationFrame(() => {
    setTimeout(() => left.classList.add('visible'), 50);
  });

  // Init
  initMouth();
  startBlinking();
  startEyeLerp();
  resetSleepTimer();
  trackMouse();

  // Message d'accueil
  setTimeout(async () => {
    setAlfredState('idle');
    const msg = currentLangue === 'nl'
      ? "Goeiedag. Alfred is klaar."
      : "Bonjour. Alfred est en ligne.";
    showBubble(msg);
    await speak(naturaliserTexte(msg), currentLangue);
  }, 700);
}

// === INIT BOUCHE ===
function initMouth() {
  const m = document.getElementById('alfred-mouth');
  if (m) m.setAttribute('d', MOUTH.smile);
}

function resetMouth() {
  const m = document.getElementById('alfred-mouth');
  if (m) {
    m.style.transition = 'd 0.1s ease';
    m.setAttribute('d', MOUTH.smile);
  }
}

function animateMouth(amp) {
  const m = document.getElementById('alfred-mouth');
  if (m) m.setAttribute('d', MOUTH.open(amp));
}

// === ÉTATS ===
function setAlfredState(state) {
  curState = state;

  const body  = document.getElementById('alfred-body-main');
  const eyeL  = document.getElementById('alfred-eye-l');
  const eyeR  = document.getElementById('alfred-eye-r');
  const dots  = document.getElementById('alfred-dots');
  const zzz   = document.getElementById('alfred-zzz');
  const lbl   = document.getElementById('alfred-state-lbl');
  const mouth = document.getElementById('alfred-mouth');

  // Reset tout
  if (body)  { body.style.animation = 'none'; void body.offsetWidth; }
  if (eyeL)  { eyeL.style.animation = 'none'; eyeL.style.transform = ''; }
  if (eyeR)  { eyeR.style.animation = 'none'; eyeR.style.transform = ''; }
  if (dots)  dots.classList.remove('show');
  if (zzz)   zzz.classList.remove('show');

  const labels = {
    idle:   'EN ATTENTE',
    think:  'RÉFLEXION...',
    talk:   'EN TRAIN DE PARLER',
    listen: 'ÉCOUTE...',
    sleep:  'VEILLE'
  };
  if (lbl) lbl.textContent = labels[state] || '';

  switch(state) {
    case 'idle':
      if (body) body.style.animation = 'alfred-breathe 4s ease-in-out infinite';
      if (mouth) mouth.setAttribute('d', MOUTH.smile);
      resetSleepTimer();
      break;

    case 'think':
      if (body) body.style.animation = 'alfred-think 1.2s ease-in-out infinite';
      if (mouth) mouth.setAttribute('d', MOUTH.think);
      if (dots) {
        dots.classList.add('show');
        ['alfred-dot1','alfred-dot2','alfred-dot3'].forEach((id, i) => {
          const d = document.getElementById(id);
          if (d) d.style.animation = `alfred-dot-pop 1.1s ease-in-out ${i*0.22}s infinite`;
        });
      }
      // Yeux regardent à gauche/droite
      if (eyeL) eyeL.style.animation = 'alfred-eye-think 2s ease-in-out infinite';
      if (eyeR) eyeR.style.animation = 'alfred-eye-think 2s ease-in-out infinite';
      break;

    case 'talk':
      if (body) body.style.animation = 'alfred-talk 0.12s ease-in-out infinite alternate';
      if (eyeL) eyeL.style.animation = 'alfred-blink 3s ease-in-out infinite';
      if (eyeR) eyeR.style.animation = 'alfred-blink 3s ease-in-out 0.1s infinite';
      break;

    case 'listen':
      if (body) body.style.animation = 'alfred-think 0.9s ease-in-out infinite';
      if (mouth) mouth.setAttribute('d', MOUTH.flat);
      break;

    case 'sleep':
      if (body) body.style.animation = 'alfred-sleep 5s ease-in-out infinite';
      if (eyeL) {
        eyeL.style.transition = 'transform 0.6s ease';
        eyeL.style.transform = 'scaleY(0.07)';
      }
      if (eyeR) {
        eyeR.style.transition = 'transform 0.6s ease';
        eyeR.style.transform = 'scaleY(0.07)';
      }
      if (mouth) mouth.setAttribute('d', MOUTH.flat);
      if (zzz) {
        zzz.classList.add('show');
        zzz.querySelectorAll('.alfred-z').forEach((z, i) => {
          z.style.animation = `alfred-float-z 2.6s ease-in-out ${i*0.75}s infinite`;
        });
      }
      break;
  }
}

// === CLIGNEMENT ALÉATOIRE NATUREL ===
function startBlinking() {
  function blink() {
    if (curState === 'idle' || curState === 'talk') {
      const eyeL = document.getElementById('alfred-eye-l');
      const eyeR = document.getElementById('alfred-eye-r');
      if (eyeL && eyeR && curState === 'idle') {
        const savedL = eyeL.style.animation;
        const savedR = eyeR.style.animation;
        eyeL.style.animation = 'alfred-blink 0.18s ease-in-out';
        eyeR.style.animation = 'alfred-blink 0.18s ease-in-out 0.05s';
        setTimeout(() => {
          if (curState === 'idle') {
            eyeL.style.animation = savedL;
            eyeR.style.animation = savedR;
          }
        }, 250);
      }
    }
    // Intervalle aléatoire naturel 2-7 secondes
    setTimeout(blink, 2000 + Math.random() * 5000);
  }
  setTimeout(blink, 1800);
}

// === SUIVI YEUX SOURIS — LERP FLUIDE ===
function trackMouse() {
  document.addEventListener('mousemove', e => {
    if (curState !== 'idle') return;
    const svg = document.getElementById('alfred-svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.25;
    eyeTargetX = Math.max(-9, Math.min(9, (e.clientX - cx) / 32));
    eyeTargetY = Math.max(-5, Math.min(5, (e.clientY - cy) / 48));
    resetSleepTimer();
  });
}

function startEyeLerp() {
  function lerp() {
    if (curState === 'idle') {
      eyeCurX += (eyeTargetX - eyeCurX) * 0.07;
      eyeCurY += (eyeTargetY - eyeCurY) * 0.07;
      const eyeL = document.getElementById('alfred-eye-l');
      const eyeR = document.getElementById('alfred-eye-r');
      if (eyeL) eyeL.style.transform = `translate(${eyeCurX}px, ${eyeCurY}px)`;
      if (eyeR) eyeR.style.transform = `translate(${eyeCurX}px, ${eyeCurY}px)`;
    }
    rafEyes = requestAnimationFrame(lerp);
  }
  rafEyes = requestAnimationFrame(lerp);
}

// === SLEEP TIMER ===
function resetSleepTimer() {
  clearTimeout(sleepTimer);
  if (curState === 'sleep') setAlfredState('idle');
  sleepTimer = setTimeout(() => {
    if (curState === 'idle') setAlfredState('sleep');
  }, (ALFRED_CONFIG.SLEEP_APRES || 30) * 1000);
}

// === BUBBLE ===
function showBubble(text) {
  const b = document.getElementById('alfred-bubble');
  if (!b) return;
  b.classList.remove('show');
  void b.offsetWidth;
  b.textContent = text;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => b.classList.add('show'));
  });
}

function showTranslation(text) {
  const el = document.getElementById('alfred-translation');
  if (el) el.textContent = text ? `↳ ${text}` : '';
}

function showTranscript(text) {
  const el = document.getElementById('alfred-transcript');
  if (el) el.textContent = text || '';
}

// === MICRO BTN ===
function toggleMic() {
  if (isListening) recognition?.stop();
  else startListening();
}

function updateMicBtn(listening) {
  const btn = document.getElementById('alfred-mic-btn');
  if (!btn) return;
  btn.textContent = listening ? '⏹ Stop' : '🎤 Parler';
  btn.classList.toggle('listening', listening);
}

// === LANGUE BTN ===
function toggleLangue() {
  switchLangue(currentLangue === 'fr' ? 'nl' : 'fr');
  const lbl = document.getElementById('alfred-langue-lbl');
  if (lbl) lbl.textContent = currentLangue === 'nl' ? '🇧🇪 NL' : '🇧🇪 FR';
}

// === VOL BAR ===
function updateVolBar(amp) {
  const bar = document.getElementById('alfred-vol-bar');
  if (bar) bar.style.width = (amp * 100) + '%';
}

// === SECOURS LABEL ===
function updateSecoursLabel(label, acte, idx, total) {
  const el = document.getElementById('alfred-secours');
  if (el) {
    el.textContent = `A${acte} · ${label} · ${idx}/${total}`;
    setTimeout(() => { if (el) el.textContent = '← →'; }, 4000);
  }
}

// === HISTORIQUE (console discret) ===
function addToHistory(who, text) {
  console.log(`%c[${who.toUpperCase()}]%c ${text.substring(0, 100)}`,
    `color: ${who === 'alfred' ? '#14b0bd' : '#888'}; font-weight: bold`,
    'color: inherit; font-weight: normal'
  );
}

// === INIT ===
initAlfredUI();