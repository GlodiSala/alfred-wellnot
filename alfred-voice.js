// === ALFRED VOICE ===

const VOIX_CONFIG = {
  fr: {
    languageCode: 'fr-FR',
    name:         'fr-FR-Wavenet-D',
    ssmlGender:   'MALE',
    speakingRate:  0.92,
    pitch:        -1.5
  },
  nl: {
    languageCode: 'nl-BE',
    name:         'nl-BE-Wavenet-A',
    ssmlGender:   'MALE',
    speakingRate:  0.90,
    pitch:        -1.0
  }
};

// ── Anime la bouche selon amplitude ──────────────────────
function animateMouth(amp) {
  const mt = document.getElementById('alfred-mouth-talk');
  const ms = document.getElementById('alfred-mouth');
  if (!mt || !ms) return;
  ms.style.display = 'none';
  mt.style.display = 'block';
  mt.setAttribute('ry', (amp * 12).toFixed(1));
  mt.setAttribute('cy', (128 + amp * 4).toFixed(1));
}

// ── Remet le sourire ──────────────────────────────────────
function resetMouth() {
  const mt = document.getElementById('alfred-mouth-talk');
  const ms = document.getElementById('alfred-mouth');
  if (mt) {
    mt.style.display = 'none';
    mt.setAttribute('ry', '0');
    mt.setAttribute('cy', '128');
  }
  if (ms) ms.style.display = 'block';
}

// ── Parler ────────────────────────────────────────────────
async function speak(text, langue, sousTitre) {
  if (!text || text === '...') return;
  langue = langue || currentLangue || 'fr';
  setAlfredState('talk');
  animateMouth(0.3);
  const voix = VOIX_CONFIG[langue] || VOIX_CONFIG.fr;

  try {
    const res = await fetch(ALFRED_CONFIG.API_TTS, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input:       { text },
        voice:       { languageCode: voix.languageCode, name: voix.name, ssmlGender: voix.ssmlGender },
        audioConfig: { audioEncoding: 'MP3', speakingRate: voix.speakingRate, pitch: voix.pitch }
      })
    });

    const data = await res.json();
    if (!data.audioContent) throw new Error('Pas audio');

    const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
    currentAudio = audio;

    // Dès qu'on connaît la durée — synchroniser les sous-titres
    audio.onloadedmetadata = () => {
      const textAAfficher = sousTitre || text;
      const phrases = textAAfficher.match(/[^.!?]+[.!?]+/g) || [textAAfficher];
      const sub = document.getElementById('alfred-subtitles');
      if (!sub) return;

      clearInterval(subtitleInterval);
      sub.style.opacity = '1';

      if (phrases.length === 1) {
        sub.textContent = phrases[0].trim();
        return;
      }

      // Délai par phrase = durée totale / nombre de phrases
      const delai = (audio.duration * 1000) / phrases.length;
      let i = 0;
      sub.textContent = phrases[0].trim();
      subtitleInterval = setInterval(() => {
        i++;
        if (i < phrases.length) {
          sub.textContent = phrases[i].trim();
        } else {
          clearInterval(subtitleInterval);
        }
      }, delai);
    };

    const ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const src      = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    clearInterval(talkTick);
    talkTick = setInterval(() => {
      if (curState !== 'talk') { clearInterval(talkTick); return; }
      analyser.getByteFrequencyData(buf);
      const amp = Math.min(buf.slice(0,80).reduce((a,b)=>a+b,0)/80/60,1);
      updateVolBar(amp);
      animateMouth(amp);
    }, 35);

    audio.onended = () => {
      clearInterval(talkTick);
      updateVolBar(0);
      resetMouth();
      setAlfredState('idle');
      currentAudio = null;
      resetSleepTimer();
      cacherSousTitres();
      ctx.close().catch(()=>{});
    };

    await audio.play();

  } catch(e) {
    console.warn('TTS erreur — fallback:', e);
    fallbackSpeak(text, langue, sousTitre);
  }
}

// ── Fallback Web Speech ───────────────────────────────────
function fallbackSpeak(text, langue, sousTitre) {
  langue = langue || 'fr';
  setAlfredState('talk');

  // Afficher sous-titres immédiatement à intervalle fixe
  const textAAfficher = sousTitre || text;
  afficherSousTitres(textAAfficher);

  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = langue === 'nl' ? 'nl-BE' : 'fr-FR';
  u.rate   = 0.92;
  u.pitch  = 0.88;

  let open = false;
  clearInterval(talkTick);
  talkTick = setInterval(() => {
    open = !open;
    const amp = open ? (0.4 + Math.random()*0.6) : 0.05;
    updateVolBar(amp);
    animateMouth(amp);
  }, 130);

  u.onend = () => {
    clearInterval(talkTick);
    updateVolBar(0);
    resetMouth();
    setAlfredState('idle');
    resetSleepTimer();
    cacherSousTitres();
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// ── Stop tout audio ───────────────────────────────────────
function stopAudio() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  speechSynthesis.cancel();
  clearInterval(talkTick);
  updateVolBar(0);
  resetMouth();
  setAlfredState('idle');
  cacherSousTitres();
}