// === ALFRED BRAIN ===

let currentLangue  = 'fr';
let isListening    = false;
let recognition    = null;
let currentAudio   = null;
let talkAnimId     = null;
let secoursIdx     = 0;

function detectLangue(text) {
  const lower = text.toLowerCase();
  const hits  = ALFRED_CONFIG.TRIGGERS_NL.filter(w => lower.includes(w)).length;
  return hits >= 2 ? 'nl' : 'fr';
}

function switchLangue(l) {
  currentLangue = l;
  const lbl = document.getElementById('alfred-langue-lbl');
  if (lbl) lbl.textContent = l === 'nl' ? '🇧🇪 NL' : '🇧🇪 FR';
}

function naturaliserTexte(text) {
  return text
    .replace(/24h\/24/gi,    'vingt-quatre heures sur vingt-quatre')
    .replace(/7j\/7/gi,      'sept jours sur sept')
    .replace(/24h/gi,        'vingt-quatre heures')
    .replace(/H24/gi,        'vingt-quatre heures sur vingt-quatre')
    .replace(/365j/gi,       'trois cent soixante-cinq jours')
    .replace(/23h/gi,        'vingt-trois heures')
    .replace(/Check_r/gi,    'Check-R')
    .replace(/RGPD/gi,       'R-G-P-D')
    .replace(/\bIA\b/gi,     'intelligence artificielle')
    .replace(/e-notariat/gi, 'é-notariat')
    .replace(/\bMe\b/g,      'Maître')
    .replace(/\*\*/g,        '')
    .replace(/\*/g,          '')
    .replace(/\n/g,          ' ')
    .trim();
}

function getContexteEcran() {
  const ecranActif = document.querySelector('.screen.active');
  if (!ecranActif) return '';
  const texteVisible = ecranActif.innerText
    .replace(/\s+/g, ' ').trim().substring(0, 400);
  return '\n\nÉCRAN VISIBLE : ' + texteVisible + ' — Cite les données réelles. 2 phrases max.';
}

async function askAlfred(text, retries = 2) {
  setAlfredState('think');
  showTranscript('« ' + text + ' »');

  const langue = detectLangue(text);
  currentLangue = langue;
  const langLbl = document.getElementById('alfred-langue-lbl');
  if (langLbl) langLbl.textContent = langue === 'nl' ? '🇧🇪 NL' : '🇧🇪 FR';

  const langInstruction = langue === 'nl'
    ? 'RÈGLE ABSOLUE : tu réponds UNIQUEMENT en néerlandais belge. MAXIMUM 2 phrases courtes. Jamais plus.\n\n'
    : 'RÈGLE ABSOLUE : tu réponds UNIQUEMENT en français. MAXIMUM 2 phrases courtes. Jamais plus.\n\n';

  const fullPrompt = langInstruction
    + ALFRED_CONFIG.SYSTEM_PROMPT
    + getContexteEcran()
    + '\n\nQuestion : ' + text;

  try {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt: fullPrompt })
    });

    if (res.status === 503 && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return askAlfred(text, retries - 1);
    }

    const data  = await res.json();
    const raw   = data?.candidates?.[0]?.content?.parts?.[0]?.text
               || data?.text
               || null;

    if (!raw) {
      const fb = langue === 'nl'
        ? 'Ik sta klaar voor uw volgende vraag.'
        : 'Je suis là. Posez votre prochaine question.';
      showBubble(fb);
      await speakGoogleTTS(fb, langue);
      return;
    }

    const phrases    = raw.match(/[^.!?]+[.!?]+/g) || [raw];
    const replyClean = phrases.slice(0, 2).join(' ').trim();

    showBubble(replyClean);
    addToHistory('alfred', replyClean);
    if (typeof detectAndChangeScreen === 'function') detectAndChangeScreen(text);
    await speakGoogleTTS(replyClean, langue);

  } catch(e) {
    console.error('askAlfred:', e);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return askAlfred(text, retries - 1);
    }
    setAlfredState('idle');
  }
}

function startMouthAnim() {
  stopMouthAnim();
  let t = 0;
  function frame() {
    const m = document.getElementById('alfred-mouth-talk');
    if (!m) return;
    t += 0.18;
    const ry = Math.max(0, Math.sin(t) * 11);
    m.setAttribute('ry', ry.toFixed(1));
    m.setAttribute('cy', (128 + Math.max(0, Math.sin(t) * 4)).toFixed(1));
    talkAnimId = requestAnimationFrame(frame);
  }
  talkAnimId = requestAnimationFrame(frame);
}

function stopMouthAnim() {
  if (talkAnimId) { cancelAnimationFrame(talkAnimId); talkAnimId = null; }
  const m = document.getElementById('alfred-mouth-talk');
  if (m) { m.setAttribute('ry', '0'); m.setAttribute('cy', '128'); }
}

function showMouthTalk(show) {
  const mt = document.getElementById('alfred-mouth-talk');
  const ms = document.getElementById('alfred-mouth');
  if (mt) mt.style.display = show ? 'block' : 'none';
  if (ms) ms.style.display = show ? 'none'  : 'block';
}

async function speakGoogleTTS(text, langue) {
  setAlfredState('talk');
  showMouthTalk(true);
  startMouthAnim();

  const langCode  = langue === 'nl' ? 'nl-BE' : 'fr-FR';
  const voiceName = langue === 'nl' ? 'nl-BE-Wavenet-A' : 'fr-FR-Wavenet-D';
  const clean     = naturaliserTexte(text);

  try {
    const res = await fetch(ALFRED_CONFIG.API_TTS, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      input:       { text: clean },
      voice:       { languageCode: langCode, name: voiceName, ssmlGender: 'MALE' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92, pitch: -1.5 }
    })
  });

    const data = await res.json();
    if (!data.audioContent) throw new Error('no audio');

    const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
    currentAudio = audio;

    const ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const src      = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    cancelAnimationFrame(talkAnimId);
    function syncFrame() {
      if (!currentAudio || currentAudio.paused) return;
      analyser.getByteFrequencyData(buf);
      const avg = buf.slice(0, 60).reduce((a, b) => a + b, 0) / 60;
      const amp = Math.min(avg / 55, 1);
      const m   = document.getElementById('alfred-mouth-talk');
      if (m) {
        m.setAttribute('ry', (amp * 12).toFixed(1));
        m.setAttribute('cy', (128 + amp * 4).toFixed(1));
      }
      updateVolBar(amp);
      talkAnimId = requestAnimationFrame(syncFrame);
    }
    talkAnimId = requestAnimationFrame(syncFrame);

    audio.onended = () => {
      stopMouthAnim();
      showMouthTalk(false);
      updateVolBar(0);
      currentAudio = null;
      setAlfredState('idle');
      resetSleepTimer();
    };

    await audio.play();

  } catch(e) {
    console.error('TTS:', e);
    fallbackSpeak(clean, langCode);
  }
}

function fallbackSpeak(text, langCode) {
  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = langCode;
  u.rate   = 0.92;
  u.pitch  = 0.9;
  let t2   = 0;
  const iv = setInterval(() => {
    t2 += 0.2;
    const ry = Math.max(0, Math.sin(t2) * 10);
    const m  = document.getElementById('alfred-mouth-talk');
    if (m) { m.setAttribute('ry', ry.toFixed(1)); m.setAttribute('cy', (128 + ry*0.4).toFixed(1)); }
  }, 80);
  u.onend = () => {
    clearInterval(iv);
    stopMouthAnim();
    showMouthTalk(false);
    setAlfredState('idle');
    resetSleepTimer();
  };
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showTranscript('Chrome requis'); return; }

  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  speechSynthesis.cancel();
  stopMouthAnim();
  showMouthTalk(false);

  recognition = new SR();
  recognition.lang = currentLangue === 'nl' ? 'nl-BE' : 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    updateMicBtn(true);
    setAlfredState('idle');
    showTranscript('...');
    resetSleepTimer();
  };

  recognition.onresult = e => {
    const t = Array.from(e.results).map(r => r[0].transcript).join('');
    showTranscript('« ' + t + ' »');
  };

  recognition.onend = async () => {
    isListening = false;
    updateMicBtn(false);
    const txt = (document.getElementById('alfred-transcript')?.textContent || '')
      .replace(/«\s*|\s*»/g, '').trim();
    if (txt.length > 2) {
      addToHistory('user', txt);
      await askAlfred(txt);
    } else {
      setAlfredState('idle');
    }
  };

  recognition.onerror = () => {
    isListening = false;
    updateMicBtn(false);
    setAlfredState('idle');
  };

  recognition.start();
}

function jouerSecours() {
  const list = currentLangue === 'nl'
    ? ALFRED_CONFIG.REPLIQUES_NL
    : ALFRED_CONFIG.REPLIQUES_FR;
  if (!list || !list.length) return;
  secoursIdx = secoursIdx % list.length;
  const r = list[secoursIdx];
  showBubble(r.texte);
  addToHistory('alfred', r.texte);
  if (typeof detectAndChangeScreen === 'function') detectAndChangeScreen(r.texte);
  speakGoogleTTS(r.texte, currentLangue);
  updateSecoursLabel(r.label, r.acte, secoursIdx + 1, list.length);
  secoursIdx++;
}

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { e.preventDefault(); jouerSecours(); }
  if (e.key === 'ArrowLeft')  {
    e.preventDefault();
    secoursIdx = Math.max(0, secoursIdx - 2);
    jouerSecours();
  }
  if (e.key === ' ' && !isListening) { e.preventDefault(); startListening(); }
  if (e.key === ' ' &&  isListening) { e.preventDefault(); recognition?.stop(); }
  if (e.key === 'Escape') {
    speechSynthesis.cancel();
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    stopMouthAnim();
    showMouthTalk(false);
    setAlfredState('idle');
  }
});