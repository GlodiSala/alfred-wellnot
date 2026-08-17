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
// Deux essais précédents, deux excès opposés : trop chargé en émotion
// ("outsider", "envie de convaincre", "humour malicieux") → trop théâtral ;
// réduit à de simples adjectifs calmes ("calme, posé, sans emphase") → trop
// plat/monocorde. Conseil officiel Google retrouvé entre-temps : "les notes
// de style doivent amplifier, pas atténuer, pour éviter un rendu robotique"
// — la solution n'est donc pas de doser l'émotion, mais de donner une
// référence concrète (une scène, un type d'orateur) plutôt que des
// adjectifs abstraits, sans reprendre les mots à forte charge dramatique
// qui posaient problème la première fois.
const TON_GEMINI_DEFAUT = "Scène : un entretien d'embauche professionnel, face à un public de notaires. Parle avec l'assurance calme d'un bon orateur — engageant et naturel, jamais monocorde, jamais théâtral.";

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

// Hache une clé de cache en SHA-256 hexadécimal — nécessaire pour le cache
// partagé (api/tts-cache.js) : la clé brute contient le texte complet de la
// réplique et l'instruction de ton, trop longue/à caractères spéciaux pour
// servir de clé KV telle quelle.
async function hacherCle(texte) {
  const donnees = new TextEncoder().encode(texte);
  const empreinte = await crypto.subtle.digest('SHA-256', donnees);
  return Array.from(new Uint8Array(empreinte)).map(o => o.toString(16).padStart(2, '0')).join('');
}

// Cache partagé (serveur, commun à tous les appareils et à toutes les pages
// où tourne le bookmarklet) — voir api/tts-cache.js pour le pourquoi. Ne
// bloque jamais la génération si indisponible (réseau, etc.) : c'est une
// accélération, pas une dépendance.
async function lireCachePartage(cleBrute) {
  try {
    const cle = await hacherCle(cleBrute);
    const res = await fetch(ALFRED_CONFIG.API_TTS_CACHE + '?cle=' + cle);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}
async function ecrireCachePartage(cleBrute, donnees) {
  try {
    const cle = await hacherCle(cleBrute);
    await fetch(ALFRED_CONFIG.API_TTS_CACHE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ cle }, donnees)),
    });
  } catch (e) {
    console.warn('[Alfred Voice] Écriture cache partagé échouée (non bloquant).', e);
  }
}

// Génère (ou récupère du cache, local puis partagé) un <audio> via
// Gemini-TTS — PAS l'API Gemini "brute" (generativelanguage.googleapis.com,
// modèle preview, plafonnée à 100 requêtes/jour même avec facturation
// active, confirmé par plusieurs fils du forum officiel Google :
// développeurs bloqués sur ce même chiffre malgré une facturation Tier 2).
// Gemini-TTS est intégré à Cloud Text-to-Speech (texttospeech.googleapis.com,
// même infra que Chirp3 HD, même clé TTS_KEY, facturation à l'usage sans
// plafond journalier arbitraire) — mêmes voix expressives, même contrôle du
// ton via un champ "prompt" dédié (donc plus besoin du bricolage de
// délimiteur "#### TRANSCRIPT"), et réponse MP3 directe (donc plus besoin
// de reconstruire un en-tête WAV à partir de PCM brut). Langue explicite
// nécessaire (contrairement à l'API Gemini brute, réellement multilingue
// sans le préciser) : Cloud TTS reste un produit par locale.
function attendreMs(ms) { return new Promise(r => setTimeout(r, ms)); }

// Appelle Cloud TTS Gemini-TTS, avec re-essai automatique en cas de
// limite "par minute" (429, distincte du plafond journalier — celle-ci se
// débloque toute seule après quelques secondes, pas besoin d'intervention).
async function appellerGeminiTTS(text, voixId, ton, languageCode, tentative = 1) {
  const res = await fetch(ALFRED_CONFIG.API_TTS, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input:       { text, prompt: ton },
      voice:       { languageCode, name: voixId, modelName: 'gemini-2.5-flash-tts' },
      audioConfig: { audioEncoding: 'MP3' }
    })
  });
  const data = await res.json();
  if (data.audioContent) return data.audioContent;

  const err = data?.error;
  const estLimiteParMinute = err?.code === 429 && /per_minute/i.test(err?.message || '');
  if (estLimiteParMinute && tentative <= 3) {
    const attente = tentative * 15000; // 15s, 30s, 45s
    console.warn(`[Alfred Voice] Limite Gemini-TTS par minute atteinte — nouvelle tentative dans ${attente / 1000}s (essai ${tentative}/3).`);
    await attendreMs(attente);
    return appellerGeminiTTS(text, voixId, ton, languageCode, tentative + 1);
  }
  if (err?.code === 429) {
    const e = new Error('Quota Gemini-TTS dépassé et toujours bloqué après plusieurs tentatives — réessaie dans quelques minutes, ou vérifie le quota sur console.cloud.google.com (Vertex AI → Quotas).');
    e.quotaExceeded = true;
    throw e;
  }
  throw new Error('Pas audio (Gemini-TTS) — ' + JSON.stringify(err || data));
}

async function genererAudioGemini(text, voixId, ton, langue) {
  // nl-BE n'est pas supporté pour les voix Gemini (confirmé par erreur
  // "language code 'nl-BE' is not supported for Gemini voices") — nl-NL
  // (Pays-Bas, accent différent) l'est, même limitation que Chirp3 HD.
  const languageCode = langue === 'nl' ? 'nl-NL' : 'fr-FR';
  const cle = ['gemini-tts', voixId, ton, languageCode, text].join('|');

  let audioContent = await lireCacheTTS(cle);
  if (audioContent) {
    console.log('[Alfred Voice] Audio Gemini-TTS depuis le cache local (pas d\'appel API).');
  } else {
    const partage = await lireCachePartage(cle);
    if (partage && partage.base64) {
      console.log('[Alfred Voice] Audio Gemini-TTS depuis le cache partagé (généré ailleurs, pas d\'appel API).');
      audioContent = partage.base64;
      ecrireCacheTTS(cle, audioContent); // copie en local pour la prochaine fois
    } else {
      audioContent = await appellerGeminiTTS(text, voixId, ton, languageCode);
      ecrireCacheTTS(cle, audioContent); // local, en tâche de fond
      ecrireCachePartage(cle, { base64: audioContent, format: 'mp3' }); // partagé, en tâche de fond
    }
  }
  return new Audio('data:audio/mp3;base64,' + audioContent);
}

// Équivalent Cloud TTS — même logique (cache local puis partagé), voix
// explicite (objet du même format que VOIX_CONFIG.fr/.nl).
async function genererAudioCloud(text, voix) {
  const cle = cleTTS(voix, text);

  let audioContent = await lireCacheTTS(cle);
  if (audioContent) {
    console.log('[Alfred Voice] Audio Cloud TTS depuis le cache local (pas d\'appel API).');
  } else {
    const partage = await lireCachePartage(cle);
    if (partage && partage.base64) {
      console.log('[Alfred Voice] Audio Cloud TTS depuis le cache partagé (généré ailleurs, pas d\'appel API).');
      audioContent = partage.base64;
      ecrireCacheTTS(cle, audioContent);
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
      ecrireCachePartage(cle, { base64: audioContent, format: 'mp3' });
    }
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
      return await genererAudioGemini(text, voixGeminiActuelle(), tonGemini(), langue);
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
// CONCURRENCE : nombre de répliques générées en parallèle. Réduit de 4 à 2
// après avoir déclenché la limite Vertex AI "requêtes par minute" en test
// réel (quota par défaut assez bas sur un projet neuf) — 2 reste plus
// rapide qu'un `for` séquentiel tout en restant sous cette limite. Le
// re-essai automatique dans appellerGeminiTTS absorbe les dépassements
// ponctuels si ça arrive quand même.
const PRECHARGEMENT_CONCURRENCE = 2;

async function prechargerScript(voixFr, voixNl, ton, onProgress) {
  const lignes = [
    ...(ALFRED_CONFIG.REPLIQUES_FR || []).map(r => ({ texte: r.texte, voix: voixFr, langue: 'fr' })),
    ...(ALFRED_CONFIG.REPLIQUES_NL || []).map(r => ({ texte: r.texte, voix: voixNl, langue: 'nl' })),
  ].filter(l => l.texte);

  let fait = 0;
  let echecs = 0;
  let quotaDepasse = false;
  let indexSuivant = 0;

  async function travailleur() {
    while (indexSuivant < lignes.length) {
      const ligne = lignes[indexSuivant++];
      try {
        await genererAudioGemini(ligne.texte, ligne.voix, ton, ligne.langue);
      } catch (e) {
        echecs++;
        if (e && e.quotaExceeded) quotaDepasse = true;
        console.warn('[Alfred Voice] Préchargement échoué pour une réplique:', ligne.texte.slice(0, 40), e);
      }
      fait++;
      if (onProgress) onProgress(fait, lignes.length, echecs);
    }
  }

  const travailleurs = Array.from({ length: Math.min(PRECHARGEMENT_CONCURRENCE, lignes.length) }, travailleur);
  await Promise.all(travailleurs);

  return { total: lignes.length, echecs, quotaDepasse };
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