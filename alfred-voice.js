// === ALFRED VOICE ===

// Catalogue de voix Google Cloud TTS proposées au choix, du plus robotique
// (Wavenet, l'actuel) au plus réaliste (Neural2, puis Studio/Chirp3 HD —
// plus naturelles mais pas forcément disponibles dans toutes les langues,
// à vérifier en le testant depuis le panneau "Voix"). languageCode est
// repris par défaut du groupe (fr/nl) sauf override explicite (utile pour
// tester une voix nl-NL faute d'équivalent nl-BE).
const VOIX_CATALOGUE = {
  fr: [
    { id: 'fr-FR-Wavenet-D',       label: 'Wavenet D (actuel)',              name: 'fr-FR-Wavenet-D',       gender: 'MALE' },
    { id: 'fr-FR-Neural2-D',       label: 'Neural2 D — plus naturel',        name: 'fr-FR-Neural2-D',       gender: 'MALE' },
    { id: 'fr-FR-Neural2-B',       label: 'Neural2 B — plus naturel',        name: 'fr-FR-Neural2-B',       gender: 'MALE' },
    { id: 'fr-FR-Studio-D',        label: 'Studio D — très réaliste (si dispo)',      name: 'fr-FR-Studio-D',        gender: 'MALE' },
    { id: 'fr-FR-Chirp3-HD-Charon',label: 'Chirp3 HD Charon — très réaliste (si dispo)', name: 'fr-FR-Chirp3-HD-Charon', gender: 'MALE' },
    { id: 'fr-FR-Chirp3-HD-Puck',  label: 'Chirp3 HD Puck — très réaliste (si dispo)',   name: 'fr-FR-Chirp3-HD-Puck',   gender: 'MALE' },
  ],
  nl: [
    { id: 'nl-BE-Wavenet-A',       label: 'Wavenet A (actuel)',              name: 'nl-BE-Wavenet-A',       gender: 'MALE' },
    { id: 'nl-BE-Wavenet-B',       label: 'Wavenet B',                       name: 'nl-BE-Wavenet-B',       gender: 'MALE' },
    // nl-BE a beaucoup moins de voix premium que fr-FR chez Google — repli
    // sur nl-NL (Pays-Bas, accent différent) si on veut tester du Chirp3 HD.
    { id: 'nl-NL-Chirp3-HD-Charon',label: 'Chirp3 HD Charon — nl-NL, accent différent (si dispo)', name: 'nl-NL-Chirp3-HD-Charon', gender: 'MALE', languageCode: 'nl-NL' },
  ],
};

const VOIX_CONFIG = {
  fr: {
    languageCode: 'fr-FR',
    name:         'fr-FR-Wavenet-D',
    ssmlGender:   'MALE',
    speakingRate:  0.82,
    pitch:        -1.5
  },
  nl: {
    languageCode: 'nl-BE',
    name:         'nl-BE-Wavenet-A',
    ssmlGender:   'MALE',
    speakingRate:  0.80,
    pitch:        -1.0
  }
};

// Applique un choix de voix sauvegardé (panneau "Voix") par-dessus les
// valeurs par défaut ci-dessus — persiste entre les sessions/rechargements
// du bookmarklet, indépendamment du code poussé.
const ALFRED_VOIX_CHOIX_KEY = 'alfred_voix_choix';
function appliquerChoixVoix() {
  try {
    const raw = localStorage.getItem(ALFRED_VOIX_CHOIX_KEY);
    if (!raw) return;
    const choix = JSON.parse(raw); // { fr: 'fr-FR-Neural2-D', nl: 'nl-BE-Wavenet-B' }
    ['fr', 'nl'].forEach(langue => {
      const id = choix[langue];
      if (!id) return;
      const voixCatalogue = (VOIX_CATALOGUE[langue] || []).find(v => v.id === id);
      if (!voixCatalogue) return;
      VOIX_CONFIG[langue].name = voixCatalogue.name;
      VOIX_CONFIG[langue].ssmlGender = voixCatalogue.gender;
      if (voixCatalogue.languageCode) VOIX_CONFIG[langue].languageCode = voixCatalogue.languageCode;
    });
  } catch (e) {
    console.warn('[Alfred Voice] Choix de voix sauvegardé illisible, valeurs par défaut utilisées.', e);
  }
}
appliquerChoixVoix();

// ── Cache audio (IndexedDB) ───────────────────────────────
// Le script de démo est fixe (mêmes répliques rejouées à chaque test/essai
// live) — pas besoin de rappeler l'API TTS à chaque fois pour la même
// phrase avec la même voix. On met en cache l'audio généré (persistant,
// survit aux rechargements du bookmarklet) et on ne rappelle l'API que pour
// du texte jamais entendu (nouvelle réplique, ou réponse libre du chatbot).
// Ça réduit la latence en live, le coût, et le risque qu'un aléa réseau
// pendant la démo coupe la voix d'Alfred.
const ALFRED_TTS_DB_NAME  = 'alfred-tts-cache';
const ALFRED_TTS_STORE    = 'audio';

function ouvrirCacheTTS() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ALFRED_TTS_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(ALFRED_TTS_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function cleTTS(voix, text) {
  return [voix.languageCode, voix.name, voix.speakingRate, voix.pitch, text].join('|');
}

async function lireCacheTTS(cle) {
  try {
    const db = await ouvrirCacheTTS();
    return await new Promise((resolve) => {
      const tx = db.transaction(ALFRED_TTS_STORE, 'readonly');
      const req = tx.objectStore(ALFRED_TTS_STORE).get(cle);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function ecrireCacheTTS(cle, base64) {
  try {
    const db = await ouvrirCacheTTS();
    const tx = db.transaction(ALFRED_TTS_STORE, 'readwrite');
    tx.objectStore(ALFRED_TTS_STORE).put(base64, cle);
  } catch (e) {
    console.warn('[Alfred Voice] Écriture cache TTS échouée (non bloquant).', e);
  }
}

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

// ── Afficher sous-titres avec sync audio ──────────────────
function afficherSousTitresSync(sousTitre, audio) {
  const sub = document.getElementById('alfred-subtitles');
  if (!sub || !sousTitre) return null;

  const phrases = sousTitre.match(/[^.!?]+[.!?]+/g) || [sousTitre];

  sub.style.opacity = '1';
  sub.textContent = phrases[0].trim();

  if (phrases.length <= 1) return null;

  let phraseTimer = null;

  audio.onloadedmetadata = () => {
    const totalMots = phrases.reduce((acc, p) => acc + p.trim().split(' ').length, 0);
    const msParMot = (audio.duration * 1000) / totalMots;

    let i = 0;

    function afficherSuivante() {
      i++;
      if (i >= phrases.length) return;
      sub.textContent = phrases[i].trim();
      const motsSuivant = i + 1 < phrases.length
        ? phrases[i].trim().split(' ').length
        : 0;
      if (motsSuivant > 0) {
        phraseTimer = setTimeout(afficherSuivante, motsSuivant * msParMot);
      }
    }

    const motsPhrase0 = phrases[0].trim().split(' ').length;
    phraseTimer = setTimeout(afficherSuivante, motsPhrase0 * msParMot);
  };

  return phraseTimer;
}

// ── Parler ────────────────────────────────────────────────
async function speak(text, langue, sousTitre) {
  if (!text || text === '...') return;
  langue = langue || currentLangue || 'fr';

  setAlfredState('talk');
  animateMouth(0.3);

  const voix = VOIX_CONFIG[langue] || VOIX_CONFIG.fr;
  const cle = cleTTS(voix, text);

  try {
    let audioContent = await lireCacheTTS(cle);

    if (audioContent) {
      console.log('[Alfred Voice] Audio depuis le cache (pas d\'appel API).');
    } else {
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
      audioContent = data.audioContent;
      ecrireCacheTTS(cle, audioContent); // en tâche de fond, ne bloque pas la lecture
    }

    const audio = new Audio('data:audio/mp3;base64,' + audioContent);
    currentAudio = audio;

    // Sous-titres synchronisés sur la durée audio
    let phraseTimer = afficherSousTitresSync(sousTitre || text, audio);

    // Analyseur volume → bouche
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
      const amp = Math.min(buf.slice(0, 80).reduce((a, b) => a + b, 0) / 80 / 60, 1);
      updateVolBar(amp);
      animateMouth(amp);
    }, 35);

    audio.onended = () => {
      clearInterval(phraseTimer);
      clearInterval(talkTick);
      updateVolBar(0);
      resetMouth();
      setAlfredState('idle');
      currentAudio = null;
      resetSleepTimer();
      cacherSousTitres();
      ctx.close().catch(() => {});
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

  const sub = document.getElementById('alfred-subtitles');
  const textAAfficher = sousTitre || text;
  const phrases = textAAfficher.match(/[^.!?]+[.!?]+/g) || [textAAfficher];

  // Afficher première phrase immédiatement
  if (sub) {
    sub.style.opacity = '1';
    sub.textContent = phrases[0].trim();
  }

  const u    = new SpeechSynthesisUtterance(text);
  u.lang     = langue === 'nl' ? 'nl-BE' : 'fr-FR';
  u.rate     = 0.82;
  u.pitch    = 0.88;

  let open = false;
  let phraseTimer = null;
  let i = 0;

  clearInterval(talkTick);
  talkTick = setInterval(() => {
    open = !open;
    const amp = open ? (0.4 + Math.random() * 0.6) : 0.05;
    updateVolBar(amp);
    animateMouth(amp);
  }, 130);

  // Changer de phrase toutes les 3.5s en fallback (pas de durée audio connue)
  if (phrases.length > 1) {
    phraseTimer = setInterval(() => {
      i++;
      if (i < phrases.length && sub) {
        sub.textContent = phrases[i].trim();
      } else {
        clearInterval(phraseTimer);
      }
    }, 3500);
  }

  u.onend = () => {
    clearInterval(talkTick);
    clearInterval(phraseTimer);
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