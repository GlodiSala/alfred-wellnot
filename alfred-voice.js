// === ALFRED VOICE — TTS FR/NL via Vercel ===

// === CONFIGURATION VOIX ===
const VOIX_CONFIG = {
  fr: {
    languageCode: 'fr-FR',
    name: 'fr-FR-Wavenet-D',
    ssmlGender: 'MALE',
    speakingRate: 0.92,
    pitch: -1.5
  },
  nl: {
    languageCode: 'nl-BE',
    name: 'nl-BE-Wavenet-A', 
    ssmlGender: 'MALE',
    speakingRate: 0.90,
    pitch: -1.0
  }
};

// === PARLER ===
async function speak(text, langue = 'fr') {
  if (!text || text === '...') return;

  setAlfredState('talk');

  const voix = VOIX_CONFIG[langue] || VOIX_CONFIG.fr;

  try {
    const res = await fetch(ALFRED_CONFIG.API_TTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: voix.languageCode,
          name: voix.name,
          ssmlGender: voix.ssmlGender
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: voix.speakingRate,
          pitch: voix.pitch
        }
      })
    });

    const data = await res.json();
    if (!data.audioContent) throw new Error('Pas audio');

    // Crée l'audio
    const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
    currentAudio = audio;

    // Analyseur pour animer la bouche
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    // Animation bouche synchronisée avec la voix
    talkTick = setInterval(() => {
      if (curState !== 'talk') {
        clearInterval(talkTick);
        return;
      }
      analyser.getByteFrequencyData(buf);
      const amp = Math.min(
        buf.slice(0, 80).reduce((a, b) => a + b, 0) / 80 / 60,
        1
      );
      updateVolBar(amp);
      animateMouth(amp);
    }, 35);

    // Quand audio terminé
    audio.onended = () => {
      clearInterval(talkTick);
      updateVolBar(0);
      resetMouth();
      setAlfredState('idle');
      currentAudio = null;
      ctx.close();
    };

    await audio.play();

  } catch(e) {
    console.warn('Google TTS erreur — fallback navigateur:', e);
    fallbackSpeak(text, langue);
  }
}

// === FALLBACK — voix navigateur si TTS échoue ===
function fallbackSpeak(text, langue = 'fr') {
  setAlfredState('talk');

  const u = new SpeechSynthesisUtterance(text);
  u.lang = langue === 'nl' ? 'nl-BE' : 'fr-FR';
  u.rate = 0.92;
  u.pitch = 0.88;

  // Animation bouche basique
  let open = false;
  talkTick = setInterval(() => {
    open = !open;
    const amp = open ? (0.4 + Math.random() * 0.6) : 0.05;
    updateVolBar(amp);
    animateMouth(amp);
  }, 130);

  u.onend = () => {
    clearInterval(talkTick);
    updateVolBar(0);
    resetMouth();
    setAlfredState('idle');
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// === STOP AUDIO ===
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  speechSynthesis.cancel();
  clearInterval(talkTick);
  updateVolBar(0);
  resetMouth();
  setAlfredState('idle');
}