// === ALFRED BRAIN — corrigé ===

// ── Détection langue ──────────────────────────────────────
function detectLangue(text) {
  const lower = text.toLowerCase();
  const hits = ALFRED_CONFIG.TRIGGERS_NL.filter(w => lower.includes(w)).length;
  return hits >= 2 ? 'nl' : 'fr';
}

// ── Demande à Gemini ──────────────────────────────────────
async function askAlfred(text, retries = 2) {
  setAlfredState('think');

  // Détection langue sur la question posée
  const langue = detectLangue(text);
  if (typeof currentLangue !== 'undefined') currentLangue = langue;

  // Instruction langue EXPLICITE ajoutée au prompt
  const langueInstruction = langue === 'nl'
    ? '\n\nREGLE ABSOLUE : réponds UNIQUEMENT en néerlandais belge (flamand). Maximum 2 phrases.'
    : '\n\nREGLE ABSOLUE : réponds UNIQUEMENT en français. Maximum 2 phrases.';

  const prompt = ALFRED_CONFIG.SYSTEM_PROMPT
    + langueInstruction
    + (typeof getContexteEcran === 'function' ? getContexteEcran() : '')
    + '\n\nQuestion : ' + text;

  try {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (res.status === 503 && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return askAlfred(text, retries - 1);
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
               || data?.text
               || null;

    if (!reply) {
      const fallback = langue === 'nl'
        ? 'Ik sta klaar. Stel me uw volgende vraag.'
        : 'Je suis là. Posez votre prochaine question.';
      showBubble(fallback);
      await speakGoogleTTS(fallback, langue);
      setAlfredState('idle');
      return;
    }

    // Nettoyage : garder max 2 phrases
    const phrases = reply.match(/[^.!?]+[.!?]+/g) || [reply];
    const replyClean = phrases.slice(0, 2).join(' ').trim();

    showBubble(replyClean);
    addToHistory('alfred', replyClean);
    if (typeof detectAndChangeScreen === 'function') detectAndChangeScreen(text);
    await speakGoogleTTS(replyClean, langue);

  } catch(e) {
    console.error('askAlfred error:', e);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return askAlfred(text, retries - 1);
    }
    setAlfredState('idle');
  }
}

// ── Google TTS — synchronisé à la voix ───────────────────
let talkAnimId = null;
let talkT = 0;
let currentAudio = null;

function startMouthAnim() {
  stopMouthAnim();
  talkT = 0;
  function frame() {
    const m = document.getElementById('alfred-mouth-talk');
    if (!m) return;
    talkT += 0.18;
    const ry = Math.max(0, Math.sin(talkT) * 11);
    const cy = 128 + Math.max(0, Math.sin(talkT) * 4);
    m.setAttribute('ry', ry.toFixed(1));
    m.setAttribute('cy', cy.toFixed(1));
    talkAnimId = requestAnimationFrame(frame);
  }
  talkAnimId = requestAnimationFrame(frame);
}

function stopMouthAnim() {
  if (talkAnimId) { cancelAnimationFrame(talkAnimId); talkAnimId = null; }
  const m = document.getElementById('alfred-mouth-talk');
  if (m) { m.setAttribute('ry', '0'); m.setAttribute('cy', '128'); }
}

async function speakGoogleTTS(text, langue) {
  setAlfredState('talk');
  startMouthAnim();

  const langCode  = langue === 'nl' ? 'nl-BE' : 'fr-FR';
  // Voix Wavenet BE pour NL, Wavenet D pour FR
  const voiceName = langue === 'nl' ? 'nl-BE-Wavenet-A' : 'fr-FR-Wavenet-D';
  const textClean = naturaliserTexte(text);

  try {
    const res = await fetch(ALFRED_CONFIG.API_TTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: textClean,
        languageCode: langCode,
        voiceName:    voiceName,
        speakingRate: 0.92,
        pitch:        -1.5
      })
    });

    const data = await res.json();
    if (!data.audioContent) throw new Error('No audio');

    const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
    currentAudio = audio;

    // Sync bouche avec volume audio
    const ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const src      = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    // Remplace l'animation sin par le vrai volume
    cancelAnimationFrame(talkAnimId);
    function syncFrame() {
      if (!currentAudio || currentAudio.paused) return;
      analyser.getByteFrequencyData(buf);
      const avg = buf.slice(0, 60).reduce((a, b) => a + b, 0) / 60;
      const amp = Math.min(avg / 55, 1);
      const m = document.getElementById('alfred-mouth-talk');
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
      updateVolBar(0);
      // Masquer bouche talk, remettre sourire
      const mt = document.getElementById('alfred-mouth-talk');
      const ms = document.getElementById('alfred-mouth');
      if (mt) mt.style.display = 'none';
      if (ms) ms.style.display = 'block';
      currentAudio = null;
      setAlfredState('idle');
      resetSleepTimer();
    };

    // Afficher bouche talk, masquer sourire
    const mt = document.getElementById('alfred-mouth-talk');
    const ms = document.getElementById('alfred-mouth');
    if (mt) mt.style.display = 'block';
    if (ms) ms.style.display = 'none';

    await audio.play();

  } catch(e) {
    console.error('TTS error:', e);
    stopMouthAnim();
    // Fallback Web Speech API
    const u = new SpeechSynthesisUtterance(textClean);
    u.lang = langCode;
    u.rate = 0.92;
    u.pitch = 0.9;
    const mt = document.getElementById('alfred-mouth-talk');
    const ms = document.getElementById('alfred-mouth');
    if (mt) mt.style.display = 'block';
    if (ms) ms.style.display = 'none';
    let t2 = 0;
    const fb = setInterval(() => {
      t2 += 0.2;
      const ry = Math.max(0, Math.sin(t2) * 10);
      const m = document.getElementById('alfred-mouth-talk');
      if (m) { m.setAttribute('ry', ry.toFixed(1)); m.setAttribute('cy', (128 + ry * 0.4).toFixed(1)); }
    }, 80);
    u.onend = () => {
      clearInterval(fb);
      stopMouthAnim();
      if (mt) mt.style.display = 'none';
      if (ms) ms.style.display = 'block';
      setAlfredState('idle');
      resetSleepTimer();
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
}

// ── naturaliserTexte ──────────────────────────────────────
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
    .replace(/\*\*/g,        '')
    .replace(/\*/g,          '')
    .replace(/\n/g,          ' ')
    .trim();
}