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

// Voix Cloud TTS les plus naturelles disponibles (Chirp3 HD) — utilisées
// pour le repli automatique si Gemini échoue, et pour les réponses libres
// du chatbot (texte généré à la volée, impossible à précharger : la
// vitesse de Cloud TTS y compte plus que le contrôle du ton de Gemini).
// nl-BE n'a pas de Chirp3 HD chez Google — nl-NL (Pays-Bas) l'a, accepté
// ici malgré l'accent légèrement différent, pour rester sur la meilleure
// qualité disponible plutôt que de redescendre en Wavenet par défaut.
const VOIX_CONFIG = {
  fr: {
    languageCode: 'fr-FR',
    name:         'fr-FR-Chirp3-HD-Charon',
    ssmlGender:   'MALE',
    speakingRate:  0.82,
    pitch:        -1.5
  },
  nl: {
    languageCode: 'nl-NL',
    name:         'nl-NL-Chirp3-HD-Charon',
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
// Une seule voix pour les deux langues (Gemini ne distingue pas la langue
// pour choisir sa voix — avoir deux réglages différents n'avait pas de
// justification et compliquait le panneau pour rien). Le nom technique
// reste affiché entre parenthèses (ça aide à s'y référer/comparer), mais
// la description passe en premier.
const GEMINI_VOIX_CATALOGUE = [
  { id: 'Algenib',    label: 'Grave et posée (Algenib) — recommandé' },
  { id: 'Charon',     label: 'Chaleureuse et posée (Charon)' },
  { id: 'Orus',       label: 'Assurée et directe (Orus)' },
  { id: 'Iapetus',    label: 'Claire et nette (Iapetus)' },
  { id: 'Puck',       label: 'Enjouée et vive (Puck)' },
  { id: 'Fenrir',     label: 'Énergique (Fenrir)' },
  { id: 'Schedar',    label: 'Posée et régulière (Schedar)' },
  { id: 'Rasalgethi', label: 'Informative, posée (Rasalgethi)' },
];

// Instruction de ton par défaut, éditable dans le panneau "Voix". Une seule
// phrase simple à modifier (pas un formulaire à 3 blocs à respecter) —
// Google recommande justement de ne pas sur-détailler : le modèle comble
// les manques plus naturellement qu'un contrôle trop strict. Informée par
// le personnage établi dans le script officiel (Acte 1 — L'entretien :
// Alfred est un candidat qui passe un entretien d'embauche devant une
// salle de notaires) et par le guide de style d'ALFRED_CONFIG.SYSTEM_PROMPT
// (naturel, direct, confiant, humour discret, jamais "excellente question").
const TON_GEMINI_DEFAUT = "Tu es Alfred : un outsider sans parcours classique qui passe un entretien d'embauche devant une salle de notaires exigeants, et qui a vraiment envie de les convaincre. Parle avec assurance, chaleur et une pointe d'humour malicieux, toujours direct, jamais théâtral.";

// Séparateur entre l'instruction de ton et le texte à prononcer — sans lui,
// le modèle lit parfois l'instruction elle-même à voix haute au lieu de
// l'appliquer silencieusement (piège documenté des prompts Gemini TTS).
const GEMINI_TTS_DELIMITEUR = '\n\n#### TRANSCRIPT\n';

const ALFRED_VOIX_MOTEUR_KEY = 'alfred_voix_moteur'; // 'gemini' | 'cloud' (cloud = repli automatique, pas de choix utilisateur)
const ALFRED_GEMINI_TON_KEY  = 'alfred_gemini_ton';  // chaîne simple, partagée FR/NL
const ALFRED_GEMINI_VOIX_KEY = 'alfred_gemini_voix'; // id de voix, unique, partagé FR/NL

function moteurVoixActuel() {
  return localStorage.getItem(ALFRED_VOIX_MOTEUR_KEY) || 'gemini';
}

// Ces deux réglages ont eu, au fil des itérations, un ancien format par
// langue ({ fr: '...', nl: '...' }) avant d'être simplifiés en une valeur
// unique — un navigateur qui avait déjà enregistré l'ancien format continue
// de le renvoyer tel quel sinon (JSON brut affiché à l'écran au lieu d'une
// phrase lisible). On migre silencieusement au premier accès.
function tonGemini() {
  const raw = localStorage.getItem(ALFRED_GEMINI_TON_KEY);
  if (!raw) return TON_GEMINI_DEFAUT;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const migre = parsed.fr || parsed.nl || TON_GEMINI_DEFAUT;
      localStorage.setItem(ALFRED_GEMINI_TON_KEY, migre);
      return migre;
    }
  } catch (e) {
    // Pas du JSON : c'est déjà le nouveau format (texte simple), on le garde tel quel.
  }
  return raw;
}

function voixGeminiActuelle() {
  const raw = localStorage.getItem(ALFRED_GEMINI_VOIX_KEY);
  if (!raw) return 'Algenib';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const migre = parsed.fr || parsed.nl || 'Algenib';
      localStorage.setItem(ALFRED_GEMINI_VOIX_KEY, migre);
      return migre;
    }
  } catch (e) {
    // Pas du JSON : c'est déjà le nouveau format (id de voix simple).
  }
  return raw;
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
        contents: [{ parts: [{ text: ton + GEMINI_TTS_DELIMITEUR + text }] }],
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
//
// moteurForce: 'cloud' force Cloud TTS directement, sans passer par Gemini
// — utilisé pour les réponses libres du chatbot (texte généré à la volée,
// jamais préchargeable, où la vitesse de Cloud TTS compte plus que le
// contrôle du ton). Les répliques scriptées, elles, restent sur Gemini
// (préchargeables, donc la lenteur ne se voit jamais en direct).
async function obtenirAudio(text, langue, moteurForce) {
  if (moteurForce !== 'cloud' && moteurVoixActuel() === 'gemini') {
    try {
      return await genererAudioGemini(text, voixGeminiActuelle(), tonGemini());
    } catch (e) {
      console.warn('[Alfred Voice] Gemini TTS indisponible, repli sur Cloud TTS:', e);
    }
  }
  return genererAudioCloud(text, VOIX_CONFIG[langue] || VOIX_CONFIG.fr);
}

// Pré-génère l'audio de toutes les répliques du script (FR + NL) avec la
// voix/le ton donnés, et les dépose dans le cache IndexedDB. Gemini TTS est
// nettement plus lent qu'un TTS classique (c'est un modèle de langage, pas
// un moteur de synthèse optimisé pour la vitesse) — mais le script d'une
// démo est connu à l'avance : autant payer cette lenteur une fois, avant la
// démo, plutôt que ligne par ligne pendant qu'on est en direct devant la
// salle. Après un préchargement complet, toute lecture scriptée ressort du
// cache, instantanément, quel que soit le moteur choisi.
async function prechargerScript(voixFr, voixNl, ton, onProgress) {
  const lignes = [
    ...(ALFRED_CONFIG.REPLIQUES_FR || []).map(r => ({ texte: r.texte, voix: voixFr })),
    ...(ALFRED_CONFIG.REPLIQUES_NL || []).map(r => ({ texte: r.texte, voix: voixNl })),
  ];
  let fait = 0;
  let echecs = 0;
  for (const ligne of lignes) {
    if (ligne.texte) {
      try {
        await genererAudioGemini(ligne.texte, ligne.voix, ton);
      } catch (e) {
        echecs++;
        console.warn('[Alfred Voice] Préchargement échoué pour une réplique:', ligne.texte.slice(0, 40), e);
      }
    }
    fait++;
    if (onProgress) onProgress(fait, lignes.length, echecs);
  }
  return { total: lignes.length, echecs };
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
// moteurForce: 'cloud' pour forcer Cloud TTS (voir obtenirAudio) — utilisé
// pour les réponses libres du chatbot, jamais pour les répliques scriptées.
async function speak(text, langue, sousTitre, moteurForce) {
  if (!text || text === '...') return;
  langue = langue || currentLangue || 'fr';

  setAlfredState('talk');
  animateMouth(0.3);

  try {
    const audio = await obtenirAudio(text, langue, moteurForce);
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