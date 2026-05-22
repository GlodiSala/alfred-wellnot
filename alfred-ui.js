// === ALFRED UI — Split-screen + SVG blanc sur dégradé ===

let curState = 'idle';
let sleepTimer = null;
let eyeTargetX = 0, eyeTargetY = 0;
let eyeCurX = 0, eyeCurY = 0;
let rafEyes = null;

// === PATHS BOUCHE — coordonnées SVG 4 (viewBox 346.81 351.58) ===
const MOUTH = {
  smile: "M195.9,117.07c-1.03.66-10.41,6.44-23.05,6.44-7.7,0-14.99-2.17-21.66-6.44-3.49-2.25-4.51-6.91-2.28-10.41,2.25-3.5,6.91-4.51,10.41-2.27,14,8.99,27.9.36,28.47-.02,3.53-2.23,8.18-1.16,10.38,2.33,2.23,3.48,1.21,8.14-2.28,10.37Z",
  flat:  "M151,117 Q173,119 196,117",
  think: "M153,115 Q173,111 195,115",
  open:  (amp) => `M151,107 Q173,${107 + amp * 28} 196,107 Q173,${107 + amp * 12} 151,107`
};

function initAlfredUI() {
  if (document.getElementById('alfred-left-panel')) return;

  const style = document.createElement('style');
  style.id = 'alfred-styles';
  style.textContent = `
    body.alfred-active {
      margin-left: 0 !important;
      padding-left: 0 !important;
      overflow: hidden !important;
    }

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

    #alfred-left-panel {
      width: 0px;
      min-width: 0px;
      height: 100vh;
      background: linear-gradient(180deg, #054561 0%, #14b0bd 50%, #ebe0c4 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0 16px;
      box-shadow: 4px 0 32px rgba(5,69,97,0.35);
      overflow: hidden;
      pointer-events: all;
      position: relative;
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

    #alfred-site-content {
      flex: 1;
      height: 100vh;
      overflow: auto;
      pointer-events: all;
      min-width: 0;
    }

    #alfred-logo {
      color: rgba(255,255,255,0.6);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2.5px;
      margin-bottom: 8px;
      text-align: center;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.4s ease 0.3s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #alfred-left-panel.visible #alfred-logo { opacity: 1; }

    /* ZZZ — hors du SVG */
    #alfred-zzz {
      position: absolute;
      top: 50px;
      right: 25px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease;
      z-index: 10;
    }
    #alfred-zzz.show { opacity: 1; }
    .alfred-z {
      position: absolute;
      font-weight: 800;
      color: rgba(255,255,255,0.8);
      opacity: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* Wrapper SVG — pas de cercle blanc */
    #alfred-avatar-wrap {
        position: relative;
        width: 180px;
        height: 180px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: transparent;
        }

    /* Dots think */
    #alfred-dots {
      position: absolute;
      top: 4px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 5px;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 2;
    }
    #alfred-dots.show { opacity: 1; }
    .alfred-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255,255,255,0.8);
    }

    #alfred-svg {
      width: 170px;
      height: 170px;
      overflow: visible;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
    }

    /* transform-origin corps centré sur viewBox 346.81 x 351.58 */
    #alfred-body-main {
      transform-origin: 173px 175px;
    }

    /* Yeux — transform-origin géré inline dans le SVG */
    #alfred-eye-l { transition: transform 0.06s ease-out; }
    #alfred-eye-r { transition: transform 0.06s ease-out; }

    #alfred-state-lbl {
      color: rgba(255,255,255,0.4);
      font-size: 8px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 4px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    #alfred-bubble {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 14px 14px 14px 4px;
      padding: 10px 12px;
      font-size: 11px;
      color: rgba(255,255,255,0.95);
      line-height: 1.65;
      min-height: 46px;
      max-height: 120px;
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

    #alfred-translation {
      font-size: 9px;
      color: rgba(255,255,255,0.35);
      font-style: italic;
      margin-top: 4px;
      width: 100%;
      min-height: 14px;
      text-align: center;
      padding: 0 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

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

    #alfred-vol-wrap {
      width: 100%;
      height: 2px;
      background: rgba(255,255,255,0.1);
      border-radius: 1px;
      margin-top: 6px;
      overflow: hidden;
    }
    #alfred-vol-bar {
      height: 100%;
      width: 0%;
      background: rgba(255,255,255,0.6);
      border-radius: 1px;
      transition: width 0.04s linear;
    }

    #alfred-mic-btn {
      margin-top: 10px;
      background: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.9);
      border: 1px solid rgba(255,255,255,0.3);
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
      background: rgba(255,255,255,0.25);
      transform: translateY(-1px);
    }
    #alfred-mic-btn.listening {
      background: rgba(255,255,255,0.9);
      color: #054561;
      animation: alfred-pulse-mic 1.2s ease-in-out infinite;
    }

    #alfred-langue-lbl {
      font-size: 9px;
      color: rgba(255,255,255,0.3);
      margin-top: 6px;
      letter-spacing: 1px;
      cursor: pointer;
      transition: color 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      user-select: none;
    }
    #alfred-langue-lbl:hover { color: rgba(255,255,255,0.7); }

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
      33%       { transform: scaleY(1.01) scaleX(0.998); }
      66%       { transform: scaleY(0.993) scaleX(1.002); }
    }
    @keyframes alfred-think {
      0%, 100% { opacity: 0.6; transform: scale(0.98); }
      50%       { opacity: 1;   transform: scale(1); }
    }
    @keyframes alfred-talk {
      0%   { transform: translateX(-0.5px) rotate(-0.15deg); }
      100% { transform: translateX(0.5px)  rotate(0.15deg); }
    }
    @keyframes alfred-sleep {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25%       { transform: translateY(2px) rotate(-0.4deg); }
      75%       { transform: translateY(3px) rotate(0.3deg); }
    }
    @keyframes alfred-dot-pop {
      0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
      50%       { opacity: 1; transform: translateY(-3px) scale(1.1); }
    }
    @keyframes alfred-float-z {
      0%   { opacity: 0; transform: translate(0,0) rotate(-8deg) scale(0.8); }
      15%  { opacity: 0.8; }
      85%  { opacity: 0.4; }
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
      25%       { transform: translateX(6px); }
      75%       { transform: translateX(-6px); }
    }
  `;
  document.head.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.id = 'alfred-wrapper';

  const left = document.createElement('div');
  left.id = 'alfred-left-panel';
  left.innerHTML = `
    <div id="alfred-logo">ALFRED · WELLNOT</div>

    <!-- ZZZ hors SVG -->
    <div id="alfred-zzz">
      <span class="alfred-z" style="font-size:11px;right:0;top:32px;">z</span>
      <span class="alfred-z" style="font-size:14px;right:8px;top:16px;">z</span>
      <span class="alfred-z" style="font-size:18px;right:16px;top:0;">Z</span>
    </div>

    <div id="alfred-avatar-wrap">

      <!-- Dots think -->
      <div id="alfred-dots">
        <div class="alfred-dot" id="alfred-dot1"></div>
        <div class="alfred-dot" id="alfred-dot2"></div>
        <div class="alfred-dot" id="alfred-dot3"></div>
      </div>

      <!-- SVG 4 — tout blanc, viewBox 346.81 351.58 -->
        <svg id="alfred-svg" viewBox="0 0 346.81 351.58"
            xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">

        <g id="alfred-body-main">
            <path fill="#fff" d="M247.81,79.21c.43-7.09.27-20.44-5.95-27.81-3-3.57-7.26-5.31-13-5.33h-1.52c-10.92,0-109.28,0-109.28,0-6.25,0-10.77,1.83-13.92,5.59-6.32,7.52-6.33,21.23-5.95,27.55h149.62ZM221.6,46.86c8.71,0,15.8,7.09,15.8,15.79s-7.09,15.79-15.8,15.79-15.8-7.09-15.8-15.79,7.09-15.79,15.8-15.79ZM125.46,46.86c8.71,0,15.8,7.09,15.8,15.79s-7.09,15.79-15.8,15.79-15.79-7.09-15.79-15.79,7.09-15.79,15.79-15.79Z"/>

            <path fill="#fff" d="M63.1,118.92c0,.35.27,30.14,13.37,43.08,4,3.95,8.75,5.72,14.36,5.66h168.09c6.64,0,11.72-2.06,15.56-6.3,11.54-12.77,9.05-42.02,9.05-42.02h0c0-2.31-.39-56.9-34.8-91.35C230.16,9.42,204.77,0,173.25,0h-.7c-23.99.11-44.49,5.59-60.94,16.29l-.5.24c-5.37,3.52-10.35,7.63-14.81,12.21-34.02,34.89-33.21,89.63-33.2,90.18ZM195.9,117.07c-1.03.66-10.41,6.44-23.05,6.44-7.7,0-14.99-2.17-21.66-6.44-3.49-2.25-4.51-6.91-2.28-10.41,2.25-3.5,6.91-4.51,10.41-2.27,14,8.99,27.9.36,28.47-.02,3.53-2.23,8.18-1.16,10.38,2.33,2.23,3.48,1.21,8.14-2.28,10.37ZM92.6,41.98c6.11-7.28,14.65-10.97,25.37-10.97h110.92c10.32.03,18.57,3.64,24.52,10.72,13.65,16.25,8.82,45.08,8.61,46.3l-1.07,6.25H85.14l-1.1-6.21c-.22-1.19-5.25-29.67,8.56-46.09Z"/>

            <path fill="#fff" d="M193.23,185.18l-11.17-.02v89.21c12.67,4.09,21.05,15.3,21.05,28.38,0,16.75-13.62,30.37-30.36,30.37s-30.37-13.62-30.37-30.37c0-13.08,8.39-24.28,21.05-28.37v-89.24h-11.15c-3.65,13.56-16.06,51.45-45.6,74.47v78.59c21.21,8.89,43.65,13.39,66.72,13.39s44.57-4.32,65.41-12.85v-79.13c-29.52-23.01-41.93-60.87-45.58-74.42Z"/>

            <path fill="#fff" d="M91.09,185.33h-.55c-10.36,0-19.28-3.62-26.5-10.78-18.08-17.89-18.6-55.45-18.6-55.45,0,0-.56-39.38,18.25-74.9C23.61,77.1,0,126.38,0,178.18c0,62.53,33.65,120,88.06,150.88v-79.01l3.99-2.78c24.24-16.91,36.17-47.26,40.79-62.14-16.64.01-31.42.07-41.75.2Z"/>

            <path fill="#fff" d="M281.19,42.53c19.25,34.7,19.86,76.35,19.86,76.35,0,0,2.92,36.01-13.58,54.3-7.27,8.06-16.9,12.15-28.63,12.15-8.85,0-20.21-.04-32.97-.07l-13.17-.03c4.63,14.87,16.58,45.18,40.76,62.04l3.99,2.78v79.68c55.22-30.72,89.37-88.45,89.37-151.55,0-52.87-24.34-102.77-65.62-135.64Z"/>
        </g>

        <!-- Yeux animables -->
        <g id="alfred-eye-l" style="transform-origin:125.46px 62.65px;">
            <circle fill="#fff" cx="125.46" cy="62.65" r="15.79"/>
        </g>
        <g id="alfred-eye-r" style="transform-origin:221.6px 62.65px;">
            <circle fill="#fff" cx="221.6" cy="62.65" r="15.79"/>
        </g>

        <!-- Bouche -->
        <path id="alfred-mouth" fill="#fff"
            d="M195.9,117.07c-1.03.66-10.41,6.44-23.05,6.44-7.7,0-14.99-2.17-21.66-6.44-3.49-2.25-4.51-6.91-2.28-10.41,2.25-3.5,6.91-4.51,10.41-2.27,14,8.99,27.9.36,28.47-.02,3.53-2.23,8.18-1.16,10.38,2.33,2.23,3.48,1.21,8.14-2.28,10.37Z"/>
        </svg>
    </div>

    <div id="alfred-state-lbl">EN ATTENTE</div>
    <div id="alfred-bubble"></div>
    <div id="alfred-translation"></div>
    <div id="alfred-transcript"></div>
    <div id="alfred-vol-wrap"><div id="alfred-vol-bar"></div></div>
    <button id="alfred-mic-btn" onclick="toggleMic()">🎤 Parler</button>
    <div id="alfred-langue-lbl" onclick="toggleLangue()" title="F=français N=néerlandais">🇧🇪 FR</div>
    <div id="alfred-secours">← →</div>
  `;

  const siteContent = document.createElement('div');
  siteContent.id = 'alfred-site-content';

  while (document.body.firstChild) {
    siteContent.appendChild(document.body.firstChild);
  }

  wrapper.appendChild(left);
  wrapper.appendChild(siteContent);
  document.body.appendChild(wrapper);
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;';
  document.body.classList.add('alfred-active');

  requestAnimationFrame(() => {
    setTimeout(() => left.classList.add('visible'), 50);
  });

  initMouth();
  startBlinking();
  startEyeLerp();
  resetSleepTimer();
  trackMouse();

  setTimeout(async () => {
    setAlfredState('idle');
    const msg = currentLangue === 'nl'
      ? "Goeiedag. Alfred is klaar."
      : "Bonjour. Alfred est en ligne.";
    showBubble(msg);
    await speak(naturaliserTexte(msg), currentLangue);
  }, 700);
}

function initMouth() {
  const m = document.getElementById('alfred-mouth');
  if (m) m.setAttribute('d', MOUTH.smile);
}

function resetMouth() {
  const m = document.getElementById('alfred-mouth');
  if (m) m.setAttribute('d', MOUTH.smile);
}

function animateMouth(amp) {
  const m = document.getElementById('alfred-mouth');
  if (m) m.setAttribute('d', MOUTH.open(amp));
}

function setAlfredState(state) {
  curState = state;

  const body  = document.getElementById('alfred-body-main');
  const eyeL  = document.getElementById('alfred-eye-l');
  const eyeR  = document.getElementById('alfred-eye-r');
  const dots  = document.getElementById('alfred-dots');
  const zzz   = document.getElementById('alfred-zzz');
  const lbl   = document.getElementById('alfred-state-lbl');
  const mouth = document.getElementById('alfred-mouth');

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

function startBlinking() {
  function blink() {
    if (curState === 'idle') {
      const eyeL = document.getElementById('alfred-eye-l');
      const eyeR = document.getElementById('alfred-eye-r');
      if (eyeL && eyeR) {
        eyeL.style.animation = 'alfred-blink 0.18s ease-in-out';
        eyeR.style.animation = 'alfred-blink 0.18s ease-in-out 0.05s';
        setTimeout(() => {
          if (curState === 'idle') {
            eyeL.style.animation = 'none';
            eyeR.style.animation = 'none';
          }
        }, 250);
      }
    }
    setTimeout(blink, 2000 + Math.random() * 5000);
  }
  setTimeout(blink, 2000);
}

function trackMouse() {
  document.addEventListener('mousemove', e => {
    if (curState !== 'idle') return;
    const svg = document.getElementById('alfred-svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.22;
    eyeTargetX = Math.max(-8, Math.min(8, (e.clientX - cx) / 30));
    eyeTargetY = Math.max(-4, Math.min(4, (e.clientY - cy) / 45));
    resetSleepTimer();
  });
}

function startEyeLerp() {
  function lerp() {
    if (curState === 'idle') {
      eyeCurX += (eyeTargetX - eyeCurX) * 0.12;
      eyeCurY += (eyeTargetY - eyeCurY) * 0.12;
      const eyeL = document.getElementById('alfred-eye-l');
      const eyeR = document.getElementById('alfred-eye-r');
      if (eyeL) eyeL.style.transform = `translate(${eyeCurX}px, ${eyeCurY}px)`;
      if (eyeR) eyeR.style.transform = `translate(${eyeCurX}px, ${eyeCurY}px)`;
    }
    rafEyes = requestAnimationFrame(lerp);
  }
  rafEyes = requestAnimationFrame(lerp);
}

function resetSleepTimer() {
  clearTimeout(sleepTimer);
  if (curState === 'sleep') setAlfredState('idle');
  sleepTimer = setTimeout(() => {
    if (curState === 'idle') setAlfredState('sleep');
  }, (ALFRED_CONFIG.SLEEP_APRES || 30) * 1000);
}

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

function toggleLangue() {
  switchLangue(currentLangue === 'fr' ? 'nl' : 'fr');
  const lbl = document.getElementById('alfred-langue-lbl');
  if (lbl) lbl.textContent = currentLangue === 'nl' ? '🇧🇪 NL' : '🇧🇪 FR';
}

function updateVolBar(amp) {
  const bar = document.getElementById('alfred-vol-bar');
  if (bar) bar.style.width = (amp * 100) + '%';
}

function updateSecoursLabel(label, acte, idx, total) {
  const el = document.getElementById('alfred-secours');
  if (el) {
    el.textContent = `A${acte} · ${label} · ${idx}/${total}`;
    setTimeout(() => { if (el) el.textContent = '← →'; }, 4000);
  }
}

function addToHistory(who, text) {
  console.log(
    `%c[${who.toUpperCase()}]%c ${text.substring(0, 100)}`,
    `color: ${who === 'alfred' ? '#14b0bd' : '#888'}; font-weight: bold`,
    'color: inherit'
  );
}

initAlfredUI();