// === ALFRED VOICE ===

// Catalogue de voix Google Cloud TTS proposées au choix, du plus robotique
// (Wavenet, l'actuel) au plus réaliste (Neural2, puis Chirp3 HD — la gamme
// la plus naturelle actuellement chez Google). Noms vérifiés via la doc
// Google (17/08) plutôt que devinés :
//  - fr-FR Neural2 : seulement A (féminin) et B (masculin) existent — un
//    précédent "Neural2-D" inventé n'existait pas, d'où l'échec de test.
//  - Chirp3 HD : 8 noms de personæ partagés entre toutes les langues
//    supportées (Aoede/Charon/Fenrir/Kore/Leda/Orus/Puck/Zephyr) — le genre
//    ci-dessous est indicatif (à confirmer à l'oreille via "Tester").
//  - Chirp3 HD n'existe QUE sur l'API v1beta1 (corrigé dans api/tts.js —
//    c'est ça qui causait "Pas audio", pas le nom de la voix).
//  - nl-BE n'a PAS de Chirp3 HD chez Google (contrairement à nl-NL) — d'où
//    le repli sur nl-NL ci-dessous, à accent différent, pour au moins
//    pouvoir tester le rendu Chirp3 HD en néerlandais.
// languageCode est repris par défaut du groupe (fr/nl) sauf override
// explicite (utilisé justement pour ce repli nl-NL).
const VOIX_CATALOGUE = {
  fr: [
    { id: 'fr-FR-Wavenet-D',        label: 'Wavenet D (actuel)',                name: 'fr-FR-Wavenet-D',        gender: 'MALE' },
    { id: 'fr-FR-Neural2-B',        label: 'Neural2 B — plus naturel',          name: 'fr-FR-Neural2-B',        gender: 'MALE' },
    { id: 'fr-FR-Neural2-A',        label: 'Neural2 A — plus naturel (féminin)',name: 'fr-FR-Neural2-A',        gender: 'FEMALE' },
    { id: 'fr-FR-Chirp3-HD-Puck',   label: 'Chirp3 HD Puck — très naturel',     name: 'fr-FR-Chirp3-HD-Puck',   gender: 'MALE' },
    { id: 'fr-FR-Chirp3-HD-Charon', label: 'Chirp3 HD Charon — très naturel',   name: 'fr-FR-Chirp3-HD-Charon', gender: 'MALE' },
    { id: 'fr-FR-Chirp3-HD-Fenrir', label: 'Chirp3 HD Fenrir — très naturel',   name: 'fr-FR-Chirp3-HD-Fenrir', gender: 'MALE' },
    { id: 'fr-FR-Chirp3-HD-Orus',   label: 'Chirp3 HD Orus — très naturel',     name: 'fr-FR-Chirp3-HD-Orus',   gender: 'MALE' },
    { id: 'fr-FR-Chirp3-HD-Kore',   label: 'Chirp3 HD Kore — très naturel (féminin)', name: 'fr-FR-Chirp3-HD-Kore', gender: 'FEMALE' },
  ],
  nl: [
    { id: 'nl-BE-Wavenet-A',        label: 'Wavenet A (actuel)',                name: 'nl-BE-Wavenet-A',        gender: 'MALE' },
    { id: 'nl-BE-Wavenet-B',        label: 'Wavenet B',                         name: 'nl-BE-Wavenet-B',        gender: 'MALE' },
    // nl-BE n'a pas de Chirp3 HD chez Google — repli sur nl-NL (Pays-Bas,
    // accent différent) pour au moins pouvoir tester le rendu.
    { id: 'nl-NL-Chirp3-HD-Puck',   label: 'Chirp3 HD Puck — nl-NL, accent différent', name: 'nl-NL-Chirp3-HD-Puck',   gender: 'MALE', languageCode: 'nl-NL' },
    { id: 'nl-NL-Chirp3-HD-Charon', label: 'Chirp3 HD Charon — nl-NL, accent différent', name: 'nl-NL-Chirp3-HD-Charon', gender: 'MALE', languageCode: 'nl-NL' },
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

// ── Voix par défaut : Gemini TTS ──────────────────────────
// Gemini TTS utilise les mêmes voix quelle que soit la langue du texte
// (contrairement à Google Cloud TTS où chaque locale a son propre
// sous-catalogue, parfois très limité — nl-BE par exemple n'a aucune voix
// "HD"). Il permet aussi une instruction de ton en langage naturel, une
// seule pour les deux langues puisque c'est une intention, pas du texte à
// prononcer. Noms techniques (Puck, Charon...) volontairement cachés à
// l'écran — remplacés par une description claire, pour quelqu'un qui n'a
// aucune raison de connaître le nom interne d'une voix Google.
const GEMINI_VOIX_CATALOGUE = [
  { id: 'Algenib',    label: 'Grave et posée (recommandé)' },
  { id: 'Charon',     label: 'Chaleureuse et posée' },
  { id: 'Orus',       label: 'Assurée et directe' },
  { id: 'Iapetus',    label: 'Claire et nette' },
];

// Instruction de ton par défaut, éditable dans le panneau "Voix" — ce que
// demande explicitement Glodi : convaincu, naturel, pas théâtral, pas une
// simple lecture de script. Une seule instruction pour les deux langues
// (c'est une intention de jeu, pas du texte prononcé).
const TON_GEMINI_DEFAUT = "Instruction de ton : lis ce texte avec assurance et conviction, comme si tu y croyais vraiment — pas comme une lecture de script. Reste naturel et chaleureux, jamais théâtral ni exagéré.";

const ALFRED_VOIX_MOTEUR_KEY = 'alfred_voix_moteur'; // 'gemini' | 'cloud' (cloud = repli automatique, pas de choix utilisateur)
const ALFRED_GEMINI_TON_KEY  = 'alfred_gemini_ton';  // chaîne simple, partagée FR/NL
const ALFRED_GEMINI_VOIX_KEY = 'alfred_gemini_voix'; // id de voix, partagé FR/NL

function moteurVoixActuel() {
  return localStorage.getItem(ALFRED_VOIX_MOTEUR_KEY) || 'gemini';
}

function tonGemini() {
  return localStorage.getItem(ALFRED_GEMINI_TON_KEY) || TON_GEMINI_DEFAUT;
}

function voixGeminiActuelle() {
  return localStorage.getItem(ALFRED_GEMINI_VOIX_KEY) || 'Algenib';
}

// Extrait le taux d'échantillonnage d'un mimeType du type
// "audio/L16;codec=pcm;rate=24000" — 24000 par défaut si absent/inattendu.
function tauxDepuisMimeType(mimeType) {
  const m = /rate=(\d+)/.exec(mimeType || '');
  return m ? parseInt(m[1], 10) : 24000;
}

// Gemini TTS renvoie du PCM brut (pas de conteneur audio) — il faut lui
// coller un en-tête WAV minimal pour que le navigateur puisse le lire.
function pcmBase64VersUrlWav(base64, sampleRate, canaux = 1, bitsParEchantillon = 16) {
  const bin = atob(base64);
  const len = bin.length;
  const pcm = new Uint8Array(len);
  for (let i = 0; i < len; i++) pcm[i] = bin.charCodeAt(i);

  const blockAlign = canaux * bitsParEchantillon / 8;
  const byteRate = sampleRate * blockAlign;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  function ecrireChaine(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  ecrireChaine(0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  ecrireChaine(8, 'WAVE');
  ecrireChaine(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // format PCM
  view.setUint16(22, canaux, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsParEchantillon, true);
  ecrireChaine(36, 'data');
  view.setUint32(40, len, true);

  new Uint8Array(buffer, 44).set(pcm);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

// Génère (ou récupère du cache) un <audio> via Gemini TTS, pour une voix et
// un ton explicites — ne dépend d'aucun réglage global, pour pouvoir servir
// aussi bien à la lecture normale qu'au bouton "Tester" du panneau (sans
// avoir à bidouiller un état global le temps de l'essai).
async function genererAudioGemini(text, voixId, ton) {
  const cle = ['gemini', voixId, ton, text].join('|');

  const cache = await lireCacheTTS(cle);
  let base64, taux;
  if (cache) {
    console.log('[Alfred Voice] Audio Gemini depuis le cache (pas d\'appel API).');
    const parsed = JSON.parse(cache);
    base64 = parsed.base64; taux = parsed.rate;
  } else {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI_TTS, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: ton + '\n\n' + text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voixId } } }
        }
      })
    });
    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part || !part.data) throw new Error('Pas audio (Gemini) — ' + JSON.stringify(data?.error || data));
    base64 = part.data;
    taux = tauxDepuisMimeType(part.mimeType);
    ecrireCacheTTS(cle, JSON.stringify({ base64, rate: taux })); // en tâche de fond
  }
  return new Audio(pcmBase64VersUrlWav(base64, taux));
}

// Équivalent Cloud TTS — même logique, voix explicite (objet du même
// format que VOIX_CONFIG.fr/.nl), pour les mêmes raisons.
async function genererAudioCloud(text, voix) {
  const cle = cleTTS(voix, text);

  let audioContent = await lireCacheTTS(cle);
  if (audioContent) {
    console.log('[Alfred Voice] Audio Cloud TTS depuis le cache (pas d\'appel API).');
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
    ecrireCacheTTS(cle, audioContent);
  }
  return new Audio('data:audio/mp3;base64,' + audioContent);
}

// Prépare un élément <audio> prêt à jouer. Gemini TTS par défaut ; si ça
// échoue (quota, réseau, voix indisponible...), repli automatique et
// silencieux sur Cloud TTS avant d'abandonner — l'utilisateur n'a pas à
// gérer ça lui-même, seul le résultat final (silence complet) doit être
// évité autant que possible pendant une démo live.
async function obtenirAudio(text, langue) {
  if (moteurVoixActuel() === 'gemini') {
    try {
      return await genererAudioGemini(text, voixGeminiActuelle(), tonGemini());
    } catch (e) {
      console.warn('[Alfred Voice] Gemini TTS indisponible, repli sur Cloud TTS:', e);
    }
  }
  return genererAudioCloud(text, VOIX_CONFIG[langue] || VOIX_CONFIG.fr);
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

  try {
    const audio = await obtenirAudio(text, langue);
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