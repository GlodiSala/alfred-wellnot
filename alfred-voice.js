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
// Voix Cloud TTS les plus naturelles disponibles (Chirp3 HD) — utilisées
// pour le repli automatique si Gemini échoue, et pour les réponses libres
// du chatbot (texte généré à la volée, impossible à précharger : la
// vitesse de Cloud TTS y compte plus que le contrôle du ton de Gemini).
// nl-BE n'a pas de Chirp3 HD chez Google — nl-NL (Pays-Bas) l'a, accepté
// ici malgré l'accent légèrement différent, pour rester sur la meilleure
// qualité disponible plutôt que de redescendre en Wavenet par défaut.
// Pas de "pitch" ici : confirmé par l'API elle-même ("This voice does not
// support pitch parameters at this time") — les voix Chirp3 HD (utilisées
// ci-dessous) ne supportent pas ce paramètre du tout, contrairement aux
// voix Wavenet/Neural2 plus anciennes. L'envoyer faisait échouer TOUT
// appel Cloud TTS (repli du chatbot libre ET repli de secours des
// répliques scriptées quand Gemini est indisponible), et retombait
// ensuite sur fallbackSpeak() — la voix robotique native du navigateur,
// nettement moins bonne, sans que ce soit visible autrement qu'en
// console. Remonté en test live ("le micro d'Alfred" sonne mal/différent).
const VOIX_CONFIG = {
  fr: {
    languageCode: 'fr-FR',
    name:         'fr-FR-Chirp3-HD-Charon',
    ssmlGender:   'MALE',
    speakingRate:  0.82
  },
  nl: {
    languageCode: 'nl-NL',
    name:         'nl-NL-Chirp3-HD-Charon',
    ssmlGender:   'MALE',
    speakingRate:  0.80
  }
};

// Synchronise la voix Cloud TTS (repli si Gemini échoue, réponses libres du
// chatbot — voir moteurForce dans speak()) sur la voix Gemini actuellement
// choisie dans le panneau "Voix". Avant : cette fonction lisait une clé
// ('alfred_voix_choix') qu'aucun code n'écrivait plus nulle part — un reste
// d'un ancien système de choix de voix. Le repli restait donc bloqué sur
// "Charon" par défaut quel que soit le choix réel fait dans le panneau
// actuel, ce qui pouvait sonner différemment une fois basculé dessus
// (remonté comme "incohérent" — pas un problème de genre : les 8 voix
// Gemini du catalogue sont toutes masculines, confirmé, tout comme ce
// défaut Cloud TTS, mais le timbre change).
// Chirp3 HD (la famille de voix Cloud TTS la plus naturelle) ne couvre pas
// tous les noms de voix Gemini — seuls Puck/Charon/Fenrir/Orus existent
// confirmés en fr, Puck/Charon en nl (nl-BE n'a pas de Chirp3 HD du tout,
// voir VOIX_CONFIG.nl). Pour un autre choix, on garde le repli par défaut
// plutôt que de deviner un nom de voix qui n'existe peut-être pas chez
// Google Cloud TTS (ça déclencherait la même panne que celle qu'on corrige).
const CHIRP3_HD_DISPONIBLES = { fr: ['Puck', 'Charon', 'Fenrir', 'Orus'], nl: ['Puck', 'Charon'] };
function appliquerChoixVoix() {
  try {
    // Lu en dur ('alfred_gemini_voix', pas la constante ALFRED_GEMINI_VOIX_KEY)
    // : ce fichier s'exécute avant que cette constante ne soit déclarée plus
    // bas — même situation, déjà documentée ainsi, dans alfred-config.js.
    const id = localStorage.getItem('alfred_gemini_voix');
    if (!id) return;
    ['fr', 'nl'].forEach(langue => {
      if (!CHIRP3_HD_DISPONIBLES[langue].includes(id)) return;
      const base = langue === 'nl' ? 'nl-NL' : 'fr-FR'; // nl-BE exclu, voir commentaire ci-dessus
      VOIX_CONFIG[langue].name = `${base}-Chirp3-HD-${id}`;
    });
  } catch (e) {
    console.warn('[Alfred Voice] Synchro voix Cloud TTS impossible, valeurs par défaut utilisées.', e);
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
  return [voix.languageCode, voix.name, voix.speakingRate, text].join('|');
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
// "Consigne de style" en préfixe + formulation à l'impératif plutôt qu'un
// cadre narratif ("Scène : ...") : remonté en test live, Gemini-TTS a
// littéralement prononcé ce champ à voix haute avant la vraie réplique
// (comportement connu des TTS pilotés par prompt — rien ne garantit à
// 100% qu'un modèle traite tout le champ comme pure consigne plutôt que
// comme texte à dire, surtout s'il ressemble à une phrase qu'on pourrait
// prononcer). Formulation resserrée pour réduire ce risque, en gardant la
// référence concrète qui évitait le ton plat/monocorde.
const TON_GEMINI_DEFAUT = "Consigne de style, à ne jamais lire à voix haute — l'appliquer seulement : voix assurée et chaleureuse d'un bon orateur face à des notaires, jamais monocorde, jamais théâtrale.";

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

// Voix ElevenLabs pour le néerlandais BELGE (nl-BE/flamand) — recherche
// confirmée : ni Gemini-TTS ni Chirp3 HD (Google, voir VOIX_CONFIG.nl plus
// haut) n'ont de voix nl-BE, seulement nl-NL (Pays-Bas, accent différent).
// ElevenLabs, lui, a de vraies voix flamandes nommées dans sa bibliothèque
// vocale (ex. "Jann", "Jan Schevenels", "Petra Vlaams" — à écouter et
// choisir sur elevenlabs.io/voice-library). Réglable depuis le panneau
// "Voix d'Alfred" (voir ouvrirPanneauVoix dans alfred-ui.js), pas codé en
// dur — vide tant que personne n'a collé de Voice ID : voir son usage dans
// obtenirAudio()/prechargerScript() ci-dessous, qui n'essaient ElevenLabs
// QUE si cette valeur est renseignée, sinon se rabattent sur Gemini/Cloud
// TTS (nl-NL) comme avant.
const ALFRED_ELEVENLABS_VOIX_NL_KEY = 'alfred_elevenlabs_voix_nl';
function voixElevenLabsNL() {
  return (localStorage.getItem(ALFRED_ELEVENLABS_VOIX_NL_KEY) || '').trim();
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
  // "v2" : invalide volontairement tout ancien audio caché (local ET
  // partagé) — remonté en test live, une réplique se mettait à dire le
  // prompt de ton avant sa vraie phrase. Cause probable : un audio
  // défectueux généré du temps de l'ancien pipeline (avant le passage à
  // Cloud TTS), resté en cache car la clé de cache n'avait pas changé
  // depuis. Bumper la clé force tout le monde à régénérer proprement.
  // "v3" : même logique — la réplique "Ouverture" se répétait deux fois
  // de suite à chaque lecture (panneau, flèche, "Jouer tout"), toujours
  // servie depuis le cache ("pas d'appel API"). Le déclenchement JS ne se
  // produit qu'une fois (vérifié par log), donc le problème est dans
  // l'audio caché lui-même — un raté de génération Gemini TTS, une phrase
  // courte dite deux fois d'affilée dans l'enregistrement. Bumper la clé
  // force une régénération propre pour toutes les répliques.
  // "v4" : même symptôme, revenu — "Play auto" : la toute première
  // réplique ("Ouverture", index 0) mélangée avec une autre voix/réplique,
  // remonté en test live le 04/09 ("juste la première réplique"). Même
  // remède : un ancien audio caché défectueux pour CETTE ligne précise,
  // pas un bug de séquencement JS (speak() attend déjà la vraie fin de
  // l'audio avant d'enchaîner — voir le commentaire sur audio.onended plus
  // bas dans ce fichier). Rebump global plutôt que cibler juste
  // "Ouverture" : plus sûr, et le coût d'une régénération complète reste
  // négligeable.
  const cle = ['gemini-tts-v4', voixId, ton, languageCode, text].join('|');

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
          audioConfig: { audioEncoding: 'MP3', speakingRate: voix.speakingRate }
        })
      });
      const data = await res.json();
      // api/tts.js retransmet la réponse Google telle quelle, erreur incluse
      // — sans ce contrôle, une vraie erreur Google (voix indisponible,
      // permission manquante...) était masquée par un simple "Pas audio" qui
      // ne dit rien du motif réel.
      if (data.error) throw new Error(`Cloud TTS: ${data.error.message || JSON.stringify(data.error)}`);
      if (!data.audioContent) throw new Error('Cloud TTS: réponse sans audioContent ni erreur — ' + JSON.stringify(data).slice(0, 200));
      audioContent = data.audioContent;
      ecrireCacheTTS(cle, audioContent);
      ecrireCachePartage(cle, { base64: audioContent, format: 'mp3' });
    }
  }
  return new Audio('data:audio/mp3;base64,' + audioContent);
}

// Réglages de voix ElevenLabs — centralisés ici (source unique, envoyés
// explicitement au serveur) pour pouvoir les ajuster sans dépendre des
// valeurs par défaut d'api/tts-elevenlabs.js. Stabilité un peu baissée +
// style ajouté par rapport aux réglages neutres (50/75/0) : demandé
// explicitement, la voix par défaut sonnait "trop monotone" — stabilité
// plus basse = plus de variation naturelle d'intonation, style > 0 =
// exagère un peu l'expressivité de la voix (voir recherche ElevenLabs :
// stabilité 40-55% + style pour du contenu qui doit sonner vivant, à
// l'inverse de 65-75%/style 0 recommandé pour du narratif neutre).
// Modèle ElevenLabs. Passé de eleven_multilingual_v2 à eleven_v3 le 05/09 —
// demandé explicitement ("la démo est en NL, avec ElevenLabs assez monotone,
// il faut utiliser un autre modèle... eleven_v3 ?") : v3 est le modèle le
// plus expressif d'ElevenLabs et comprend des indications de jeu entre
// crochets dans le texte ([amused], [playfully]...), voir EMOTIONS_VOIX.
// stability en v3 n'a que trois crans : 0 (créatif, le plus expressif mais
// moins stable), 0.5 (naturel), 1 (robuste). On part sur naturel + une
// émotion par réplique là où le script s'y prête.
const ELEVENLABS_MODELE = 'eleven_v3';
const ELEVENLABS_REGLAGES_VOIX = { stability: 0.5, similarityBoost: 0.75, style: 0.35 };
// Expressivité v3 réglable depuis le panneau "Voix d'Alfred" (alfred-ui.js) :
// 'naturel' = stability 0.5 (défaut), 'creatif' = 0 (le plus expressif, un
// peu moins stable d'une génération à l'autre). Demandé le 06/09 ("la voix
// est peut-être trop calme"). Fait partie de la clé de cache : changer le
// réglage régénère l'audio NL (préchargement à relancer).
const ALFRED_ELEVENLABS_EXPRESSIVITE_KEY = 'alfred_elevenlabs_expressivite';
// Trois niveaux depuis le 06/09 ("le mode créatif est trop fort, il faut
// doser") — v3 n'a que trois crans de stabilité (0 / 0.5 / 1), impossible
// de doser entre les deux par ce réglage. Le niveau intermédiaire garde la
// stabilité 0.5 mais RÉPÈTE l'indication de jeu au début de chaque phrase
// (au lieu d'une seule fois en tête) : l'émotion ne s'éteint plus au fil
// d'une longue réplique, sans l'instabilité du mode créatif.
function expressiviteElevenLabs() {
  const v = localStorage.getItem(ALFRED_ELEVENLABS_EXPRESSIVITE_KEY);
  return (v === 'creatif' || v === 'expressif') ? v : 'naturel';
}
function texteAvecBalisesV3(text, balise) {
  if (!balise) return text;
  if (expressiviteElevenLabs() !== 'expressif') return `${balise} ${text}`;
  const phrases = String(text).match(/[^.!?…]+[.!?…]+["»]?|[^.!?…]+$/g) || [text];
  return phrases.map(p => `${balise} ${p.trim()}`).join(' ');
}
function reglagesElevenLabs() {
  return { ...ELEVENLABS_REGLAGES_VOIX, stability: expressiviteElevenLabs() === 'creatif' ? 0 : 0.5 };
}

// Émotions de jeu par réplique (champ optionnel `emotion` sur une réplique
// ou un segment, voir alfred-config.js) — demandé explicitement : "il
// faudrait qu'elle blague quand il y a des choses drôles... c'est comme une
// pièce de théâtre et c'est trop monotone". Chaque clé donne l'indication
// pour ElevenLabs v3 (balise entre crochets, comprise par le modèle, jamais
// prononcée) ET pour Gemini-TTS (ajoutée à la consigne de ton de cette
// ligne). Les sous-titres et la synchro des surlignages restent sur le texte
// nu : la balise n'est ajoutée qu'au texte envoyé au moteur.
const EMOTIONS_VOIX = {
  amuse:      { v3: '[amused]',        gemini: "amusé, un sourire dans la voix" },
  assure:     { v3: '[confidently]',   gemini: "assuré, un brin bravache" },
  enjoue:     { v3: '[cheerfully]',    gemini: "enjoué, plein d'entrain" },
  taquin:     { v3: '[playfully]',     gemini: "taquin, il la coupe gentiment" },
  satisfait:  { v3: '[satisfied]',     gemini: "satisfait, tranquille" },
  chaleureux: { v3: '[warmly]',        gemini: "chaleureux, accueillant" },
  malicieux:  { v3: '[mischievously]', gemini: "malicieux, il retourne la situation avec un clin d'œil" },
  fier:       { v3: '[proudly]',       gemini: "fier, sûr de son effet" },
};
function baliseEmotionV3(emotion) {
  const e = emotion && EMOTIONS_VOIX[emotion];
  return e ? e.v3 : '';
}
function tonGeminiAvecEmotion(tonBase, emotion) {
  const e = emotion && EMOTIONS_VOIX[emotion];
  return e ? `${tonBase} Pour cette phrase précisément : ${e.gemini}.` : tonBase;
}
// Incrémenter cette version à chaque changement de ELEVENLABS_REGLAGES_VOIX
// : elle fait partie de la clé de cache, donc un changement de réglages
// régénère automatiquement l'audio au lieu de servir de l'ancien depuis le
// cache (local ou partagé) — pas besoin de vider quoi que ce soit à la main.
const ELEVENLABS_REGLAGES_VERSION = 3; // v3 : passage au modèle eleven_v3 (05/09)

// Équivalent ElevenLabs — même logique de cache (local puis partagé) que
// genererAudioGemini/genererAudioCloud ci-dessus, juste un moteur différent
// derrière (voir api/tts-elevenlabs.js). Clé de cache distincte ('elevenlabs-')
// pour ne jamais confondre avec de l'audio Google même à texte identique.
async function genererAudioElevenLabs(text, voiceId, emotion) {
  // Balise de jeu v3 devant le texte (voir EMOTIONS_VOIX) — fait partie de
  // la clé de cache : la même phrase dite amusée ou neutre = deux audios.
  const balise = baliseEmotionV3(emotion);
  const texteMoteur = texteAvecBalisesV3(text, balise);
  const cle = cleTTS({ languageCode: 'nl-BE', name: 'elevenlabs-' + ELEVENLABS_MODELE + '-' + voiceId + '-v' + ELEVENLABS_REGLAGES_VERSION + (expressiviteElevenLabs() === 'naturel' ? '' : '-' + expressiviteElevenLabs()) }, texteMoteur);

  let audioContent = await lireCacheTTS(cle);
  if (audioContent) {
    console.log('[Alfred Voice] Audio ElevenLabs depuis le cache local (pas d\'appel API).');
  } else {
    const partage = await lireCachePartage(cle);
    if (partage && partage.base64) {
      console.log('[Alfred Voice] Audio ElevenLabs depuis le cache partagé (généré ailleurs, pas d\'appel API).');
      audioContent = partage.base64;
      ecrireCacheTTS(cle, audioContent);
    } else {
      const res = await fetch(ALFRED_CONFIG.API_TTS_ELEVENLABS, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texteMoteur, voiceId, modelId: ELEVENLABS_MODELE, ...reglagesElevenLabs() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(`ElevenLabs: ${data.error}`);
      if (!data.audioContent) throw new Error('ElevenLabs: réponse sans audioContent ni erreur — ' + JSON.stringify(data).slice(0, 200));
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
//
// nl-BE (flamand) : ni Gemini-TTS ni Cloud TTS n'ont de voix belge (voir
// voixElevenLabsNL() plus haut) — dès qu'une voix est choisie dans le
// panneau "Voix d'Alfred", le néerlandais passe par ElevenLabs en PREMIER
// (avant même Gemini), pour avoir le bon accent. Repli sur Gemini/Cloud TTS
// (nl-NL) si ElevenLabs échoue (quota, réseau...) — jamais de silence
// total en démo live.
// Renvoie {audio, moteur} et non plus juste l'audio — depuis le 04/09,
// speak() a besoin de savoir QUEL moteur a réellement servi cette ligne
// (pas forcément celui demandé : un repli peut changer de moteur en cours
// de route) pour appliquer la bonne vitesse de lecture (voir
// VITESSE_PAROLE/VITESSE_PAROLE_ELEVENLABS plus haut).
async function obtenirAudio(text, langue, moteurForce, emotion) {
  const voixElevenLabs = langue === 'nl' ? voixElevenLabsNL() : '';
  if (voixElevenLabs) {
    try {
      return { audio: await genererAudioElevenLabs(text, voixElevenLabs, emotion), moteur: 'elevenlabs' };
    } catch (e) {
      console.warn('[Alfred Voice] ElevenLabs (nl-BE) indisponible, repli sur Gemini/Cloud TTS (nl-NL):', e);
    }
  }
  if (moteurForce !== 'cloud' && moteurVoixActuel() === 'gemini') {
    try {
      return { audio: await genererAudioGemini(text, voixGeminiActuelle(), tonGeminiAvecEmotion(tonGemini(), emotion), langue), moteur: 'gemini' };
    } catch (e) {
      console.warn('[Alfred Voice] Gemini TTS indisponible, repli sur Cloud TTS:', e);
    }
  }
  return { audio: await genererAudioCloud(text, VOIX_CONFIG[langue] || VOIX_CONFIG.fr), moteur: 'cloud' };
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

// Une réplique "groupée" (r.segments) contient plusieurs textes à
// précharger séparément, un par segment, plutôt qu'un seul r.texte.
// Renvoie {texte, emotion} par ligne — l'émotion fait partie de la clé de
// cache (voir genererAudioElevenLabs/obtenirAudio), le préchargement doit
// donc générer exactement ce que la démo jouera.
function textesAPrecharger(replique) {
  if (replique.segments) return replique.segments.map(s => ({ texte: s.texte, emotion: s.emotion || replique.emotion }));
  return [{ texte: replique.texte, emotion: replique.emotion }];
}

// Délai avant le passage de rattrapage ci-dessous — le temps que la limite
// Gemini-TTS "par minute" (voir appellerGeminiTTS) se débloque toute seule.
const ATTENTE_RATTRAPAGE_PRECHARGEMENT_MS = 65000;

async function prechargerScript(voixFr, voixNl, ton, onProgress) {
  const lignes = [
    ...(ALFRED_CONFIG.REPLIQUES_FR || []).flatMap(r => textesAPrecharger(r).map(l => ({ texte: l.texte, emotion: l.emotion, voix: voixFr, langue: 'fr' }))),
    ...(ALFRED_CONFIG.REPLIQUES_NL || []).flatMap(r => textesAPrecharger(r).map(l => ({ texte: l.texte, emotion: l.emotion, voix: voixNl, langue: 'nl' }))),
  ].filter(l => l.texte);

  let fait = 0;
  let echecs = 0;
  let quotaDepasse = false;
  let indexSuivant = 0;
  // Contrairement à un simple compteur d'échecs (avant) : sans savoir QUELLES
  // lignes ont échoué, impossible de les rattraper — elles restaient
  // silencieusement non préchargées, jouées plus tard en repli Cloud TTS
  // (voix différente) pendant la vraie démo. Remonté en test live : "on
  // dirait que certaines répliques ont des voix différentes, mélangées" —
  // exactement ce symptôme, en français où le préchargement tape le plus
  // souvent la limite par minute (bien plus de lignes qu'en néerlandais,
  // jamais concerné).
  const lignesEchouees = [];

  async function travailleur(liste, tracker) {
    while (tracker.index < liste.length) {
      const ligne = liste[tracker.index++];
      try {
        // NL + voix ElevenLabs configurée : précharge CETTE voix (celle
        // vraiment utilisée en direct, voir obtenirAudio), pas Gemini —
        // sinon le cache serait à côté (nl-NL Gemini) alors que la démo
        // joue nl-BE ElevenLabs en direct, avec la latence d'un vrai appel
        // API à chaque réplique plutôt que servie depuis le cache.
        const voixElevenLabsPrechargement = ligne.langue === 'nl' ? voixElevenLabsNL() : '';
        if (voixElevenLabsPrechargement) {
          await genererAudioElevenLabs(ligne.texte, voixElevenLabsPrechargement, ligne.emotion);
        } else {
          await genererAudioGemini(ligne.texte, ligne.voix, tonGeminiAvecEmotion(ton, ligne.emotion), ligne.langue);
        }
      } catch (e) {
        tracker.echecs++;
        lignesEchouees.push(ligne);
        if (e && e.quotaExceeded) quotaDepasse = true;
        console.warn('[Alfred Voice] Préchargement échoué pour une réplique:', ligne.texte.slice(0, 40), e);
      }
      fait++;
      if (onProgress) onProgress(fait, lignes.length, tracker.echecs);
    }
  }

  const tracker1 = { index: 0, echecs: 0 };
  const travailleurs = Array.from({ length: Math.min(PRECHARGEMENT_CONCURRENCE, lignes.length) }, () => travailleur(lignes, tracker1));
  await Promise.all(travailleurs);
  echecs = tracker1.echecs;

  // Passage de rattrapage : les échecs "par minute" (le cas de loin le plus
  // fréquent, pas le quota journalier — voir quotaDepasse) se résolvent
  // tout seuls après un peu de temps. Un seul rattrapage, pas de boucle
  // infinie : si ça échoue encore après, autant laisser la démo live gérer
  // ces quelques lignes via le repli Cloud TTS habituel plutôt que de
  // bloquer le préchargement indéfiniment.
  if (lignesEchouees.length > 0 && !quotaDepasse) {
    console.log(`[Alfred Voice] ${lignesEchouees.length} ligne(s) en échec — rattrapage dans ${ATTENTE_RATTRAPAGE_PRECHARGEMENT_MS / 1000}s.`);
    if (onProgress) onProgress(fait, lignes.length, echecs, 'attente-rattrapage');
    await attendreMs(ATTENTE_RATTRAPAGE_PRECHARGEMENT_MS);

    const aRattraper = lignesEchouees.splice(0);
    const tracker2 = { index: 0, echecs: 0 };
    const travailleursRattrapage = Array.from({ length: Math.min(PRECHARGEMENT_CONCURRENCE, aRattraper.length) }, () => travailleur(aRattraper, tracker2));
    await Promise.all(travailleursRattrapage);
    echecs = tracker2.echecs; // remplace le compte initial : les lignes réussies au rattrapage ne comptent plus comme échec
  }

  return { total: lignes.length, echecs, quotaDepasse };
}

// ── Anime la bouche selon amplitude ──────────────────────
// État lissé de la bouche : ouverture (volume) et largeur (brillance du
// son). Attaque rapide, relâchement plus lent — comme une vraie bouche, qui
// s'ouvre d'un coup sur une syllabe et se referme plus doucement.
let boucheOuverture = 0, boucheLargeur = 0.3;
// Plancher/plafond glissants du volume mesuré : le niveau "silence" de
// l'analyseur n'est jamais 0 (souffle, réverbération de la génération), ce
// qui gardait la bouche entrouverte en permanence ("il s'ouvre tout le
// temps"). On normalise entre le plus bas et le plus haut récents, avec un
// seuil sous lequel la bouche est franchement fermée.
let boucheAmpMin = 1, boucheAmpMax = 0;
function animateMouth(amp, aigus) {
  // Suspendu pendant clinDoeil() (alfred-ui.js) : sinon ce callback, encore
  // déclenché par talkTick pendant que l'audio finit de jouer, réécrit la
  // bouche "qui parle" à chaque frame et annule aussitôt le sourire forcé
  // du clin d'œil.
  if (typeof clinDoeilActif !== 'undefined' && clinDoeilActif) return;
  const ms = document.getElementById('alfred-mouth');
  if (!ms) return;
  // Bouche = un tracé morphé entre 4 formes (FORMES_BOUCHE, alfred-ui.js) :
  // l'ouverture suit le volume réel, la largeur suit la part d'aigus dans le
  // spectre (voir talkTick dans speak()) — voyelle grave = "o"/"ah" rond,
  // sifflante ou "i" = bouche étirée. Repli sur l'ancienne ellipse si les
  // formes ne sont pas chargées (ce fichier tourne seul).
  if (typeof FORMES_BOUCHE !== 'undefined' && typeof cheminBouche === 'function') {
    boucheAmpMin = Math.min(boucheAmpMin * 1.004 + 0.0008, amp);
    boucheAmpMax = Math.max(boucheAmpMax * 0.994, amp);
    const norm = (amp - boucheAmpMin) / Math.max(0.10, boucheAmpMax - boucheAmpMin);
    let cibleOuv = norm < 0.28 ? 0 : Math.min(1, (norm - 0.28) / 0.6);
    let cibleLarg = (typeof aigus === 'number') ? Math.max(0, Math.min(1, aigus)) : 0.3;
    // Forme déduite du TEXTE en cours (visemeCourant, alfred-ui.js) quand
    // une réplique joue : le spectre ne sert plus qu'en repli (chatbot
    // libre, test de voix).
    const vis = (typeof visemeCourant === 'function') ? visemeCourant() : null;
    if (vis) {
      const LARG = { ah: 0.5, e: 0.72, i: 0.95, o: 0.04, ferme: 0.3 };
      cibleLarg = LARG[vis.forme] != null ? LARG[vis.forme] : 0.4;
      cibleOuv *= vis.gain;
      if (vis.forme === 'i' || vis.forme === 'e') cibleOuv = Math.min(cibleOuv, vis.forme === 'i' ? 0.4 : 0.6);
    }
    // Attaque rapide, fermeture nette : une bouche qui reste entrouverte
    // entre les mots lit comme "toujours ouverte".
    boucheOuverture += (cibleOuv - boucheOuverture) * (cibleOuv > boucheOuverture ? 0.6 : 0.55);
    if (boucheOuverture < 0.04) boucheOuverture = 0;
    boucheLargeur   += (cibleLarg - boucheLargeur) * 0.3;
    const o = boucheOuverture, w = boucheLargeur;
    const F = FORMES_BOUCHE;
    const pts = F.repos.map((_, i) =>
      (1 - o) * (1 - w) * F.repos[i] + (1 - o) * w * F.i[i] + o * (1 - w) * F.o[i] + o * w * F.ah[i]);
    ms.setAttribute('d', cheminBouche(pts));
    // Intérieur sombre : la même forme réduite autour de son centre, qui
    // n'apparaît que quand la bouche est franchement ouverte — donne de la
    // profondeur au lieu d'une tache cyan qui grossit.
    const mi = document.getElementById('alfred-mouth-int');
    if (mi) {
      const k = 0.58, cy = 3;
      const ptsInt = pts.map((p, i) => i % 2 === 0 ? p * k : cy + (p - cy) * k);
      mi.setAttribute('d', cheminBouche(ptsInt));
      mi.setAttribute('opacity', Math.max(0, Math.min(1, (o - 0.32) * 2.4)).toFixed(2));
    }
  } else {
    const mt = document.getElementById('alfred-mouth-talk');
    if (mt) {
      ms.style.display = 'none';
      mt.style.display = 'block';
      mt.setAttribute('ry', (amp * 11).toFixed(1));
      mt.setAttribute('rx', (20 - amp * 3).toFixed(1));
    }
  }
  if (typeof emettreOndeVoix === 'function') emettreOndeVoix(amp);

  // Hochements de tête pilotés par le volume (demandé : "beaucoup plus
  // bouger quand il parle") — lissés pour ne pas trembler à chaque frame :
  // la tête suit l'amplitude avec un peu d'inertie, penche légèrement et
  // descend d'un ou deux pixels sur les syllabes appuyées.
  const head = document.getElementById('alfred-head');
  if (head) {
    teteAmpLissee += (amp - teteAmpLissee) * 0.25;
    const a = teteAmpLissee;
    head.style.transform = `translateY(${(a * 5).toFixed(1)}px) rotate(${(Math.sin(performance.now() / 260) * a * 3).toFixed(2)}deg)`;
  }
}
// Amplitude lissée pour les hochements de tête (voir animateMouth).
let teteAmpLissee = 0;

// ── Remet le sourire ──────────────────────────────────────
function resetMouth() {
  const mt = document.getElementById('alfred-mouth-talk');
  const ms = document.getElementById('alfred-mouth');
  if (mt) { mt.style.display = 'none'; mt.setAttribute('ry', '0'); }
  boucheOuverture = 0; boucheLargeur = 0.3; boucheAmpMin = 1; boucheAmpMax = 0;
  if (ms) { ms.style.display = 'block'; if (typeof ALFRED_BOUCHE_SOURIRE_D !== 'undefined') ms.setAttribute('d', ALFRED_BOUCHE_SOURIRE_D); }
  const mi = document.getElementById('alfred-mouth-int');
  if (mi) mi.setAttribute('opacity', '0');
  const head = document.getElementById('alfred-head');
  if (head) { head.style.transition = 'transform .35s ease'; head.style.transform = ''; setTimeout(() => { head.style.transition = ''; }, 400); }
  teteAmpLissee = 0;
}

// Délai ajouté après l'événement "playing" avant d'afficher le 1er
// sous-titre — voir le commentaire dans afficherSousTitresSync. 250ms
// remonté en test live comme encore insuffisant (texte toujours perçu en
// avance) — monté à 600ms. À réajuster si ça reste en avance ou si, à
// l'inverse, ça devient perceptible en retard sur la voix.
const DELAI_AUDIO_PERCEPTIBLE_MS = 600;

// Vitesse de lecture globale d'Alfred — demandé explicitement ("ralentir un
// peu"), en réglage général plutôt que par réplique. 1 = vitesse normale de
// l'audio généré. Voir son utilisation dans speak() (audio.playbackRate) —
// afficherSousTitresSync et programmerSurbrillanceMots en tiennent compte
// pour leur calcul de durée réelle (audio.duration ne change PAS avec
// playbackRate, seul le temps réel écoulé à l'écran change).
// Séparée en deux réglages le 04/09 (retour explicite : "la vitesse juste
// pour Gemini à 0.93, mais pour ElevenLabs c'est ok") — un seul réglage
// commun aux deux moteurs ne convenait plus aux deux à la fois. Gemini/
// Cloud TTS (VITESSE_PAROLE) remonté 0,85 → 0,93 : trop lent en FR.
// ElevenLabs (VITESSE_PAROLE_ELEVENLABS) reste à 0,85, déjà jugé bon.
const VITESSE_PAROLE = 0.93;
const VITESSE_PAROLE_ELEVENLABS = 0.92; // 0.85 → 0.92 le 06/09 : "accélère la voix légèrement" (un ralenti trop fort aplatit l'énergie de la voix)

// ── Afficher sous-titres avec sync audio ──────────────────
// timerRef : objet mutable { id } dans lequel on écrit l'id du setTimeout en
// cours, pour que l'appelant (speak(), dans onended) puisse toujours
// l'annuler même si l'id change après le retour de cette fonction — voir
// plus bas pourquoi l'affichage ne peut plus être synchrone.
function afficherSousTitresSync(sousTitre, audio, timerRef) {
  const sub = document.getElementById('alfred-subtitles');
  if (!sub || !sousTitre) return;

  const phrases = sousTitre.match(/[^.!?]+[.!?]+/g) || [sousTitre];

  // Annule un effacement en retard programmé par cacherSousTitres() (voir
  // alfred-ui.js) — sinon, avec plusieurs répliques enchaînées, celui de la
  // réplique précédente efface le sous-titre qu'on vient tout juste
  // d'afficher ici.
  if (typeof masquageSousTitresTimer !== 'undefined') clearTimeout(masquageSousTitresTimer);

  // Avant, la 1re phrase s'affichait ICI, tout de suite, dès que l'objet
  // Audio existait — mais audio.play() n'était appelé que plus loin dans
  // speak() (après la mise en place de l'analyseur de volume), et même une
  // fois appelé, le navigateur met un instant à démarrer réellement le son
  // (décodage). Résultat remonté en test live : le sous-titre apparaissait
  // une fraction de seconde AVANT la voix. On attend maintenant l'événement
  // "playing" (le son est vraiment en train de sortir) avant d'afficher quoi
  // que ce soit.
  let dureeSecondes = null;
  audio.addEventListener('loadedmetadata', () => {
    const totalMots = phrases.reduce((acc, p) => acc + p.trim().split(' ').length, 0);
    // audio.duration n'est pas fiable pour un MP3 encodé en base64 (data:
    // URI) — certains navigateurs renvoient Infinity ou NaN tant que la
    // lecture n'a pas commencé (bug connu, pas spécifique à ce projet).
    // Repli sur une estimation (~150 mots/min, un débit de parole normal)
    // si la durée réelle n'est pas exploitable.
    // ÷ playbackRate : audio.duration reste la durée de l'audio à vitesse
    // normale, mais le temps RÉEL écoulé à l'écran est plus long si Alfred
    // parle ralenti (voir VITESSE_PAROLE dans speak()) — sans ça, les
    // sous-titres suivants s'afficheraient trop tôt par rapport à la voix.
    dureeSecondes = isFinite(audio.duration) && audio.duration > 0
      ? audio.duration / (audio.playbackRate || 1)
      : totalMots * 0.4;
  }, { once: true });

  audio.addEventListener('playing', () => {
    // Même après "playing", le texte restait perçu comme un peu en avance
    // sur la voix (remonté en test live) : "playing" veut juste dire que la
    // lecture a démarré côté navigateur, pas que le son est déjà sorti des
    // haut-parleurs — il reste la latence du pipeline audio (buffer de
    // sortie, driver système). Petit délai fixe pour compenser ce résidu.
    timerRef.id = setTimeout(() => {
      sub.style.opacity = '1';
      sub.textContent = phrases[0].trim();
      if (phrases.length <= 1) return;

      const totalMots = phrases.reduce((acc, p) => acc + p.trim().split(' ').length, 0);
      // loadedmetadata arrive normalement avant playing, mais si jamais ce
      // n'est pas encore passé, on retombe sur la même estimation de repli.
      const duree = dureeSecondes !== null ? dureeSecondes : totalMots * 0.4;
      const msParMot = (duree * 1000) / totalMots;

      let i = 0;

      function afficherSuivante() {
        i++;
        if (i >= phrases.length) return;
        sub.textContent = phrases[i].trim();
        const motsSuivant = i + 1 < phrases.length
          ? phrases[i].trim().split(' ').length
          : 0;
        if (motsSuivant > 0) {
          timerRef.id = setTimeout(afficherSuivante, motsSuivant * msParMot);
        }
      }

      const motsPhrase0 = phrases[0].trim().split(' ').length;
      timerRef.id = setTimeout(afficherSuivante, motsPhrase0 * msParMot);
    }, DELAI_AUDIO_PERCEPTIBLE_MS);
  }, { once: true });
}

// ── Surbrillance de champs synchronisée sur la parole ──────
// Demandé explicitement : "quand il dit notaire en charge, il faut le
// mettre en évidence" — même principe que les sous-titres ci-dessus (même
// base de calcul : durée réelle de l'audio / nombre de mots), mais au lieu
// d'afficher du texte, ça déclenche une action (typiquement surligner un
// champ) au moment estimé où le mot-clé correspondant est prononcé. Pas une
// vraie synchro au phonème près (on n'a pas de timestamps mot-à-mot du
// moteur TTS) — une estimation proportionnelle à la position du mot dans le
// texte, qui reste largement suffisante à l'oreille/l'œil pour un public.
// entrees : [{ motsCles: ['notaire'], action: () => ... }, ...]
// Retourne un tableau d'ids de setTimeout (pour pouvoir tout annuler si la
// parole est coupée en cours de route — voir speak()/stopAudio()).
function programmerSurbrillanceMots(texteComplet, audio, entrees, timersRef) {
  if (!texteComplet || !entrees || !entrees.length) return;
  const mots = texteComplet.trim().split(/\s+/);
  const total = mots.length;
  if (!total) return;
  const nettoie = (m) => m.toLowerCase().replace(/^[«"'‘“(]+|[»"'’”),.;:!?]+$/g, '');
  const motsNettoyes = mots.map(nettoie);

  let dureeSecondes = null;
  audio.addEventListener('loadedmetadata', () => {
    // ÷ playbackRate — même raison que dans afficherSousTitresSync
    // ci-dessus (VITESSE_PAROLE ralentit la lecture réelle, pas la durée
    // "nominale" de l'audio). Repli identique (~150 mots/min) si la durée
    // réelle n'est pas exploitable.
    dureeSecondes = isFinite(audio.duration) && audio.duration > 0 ? audio.duration / (audio.playbackRate || 1) : total * 0.4;
  }, { once: true });

  audio.addEventListener('playing', () => {
    setTimeout(() => {
      const duree = dureeSecondes !== null ? dureeSecondes : total * 0.4;
      const dureeMs = duree * 1000;
      // Facteur de compression (7%) — remonté en test live à plusieurs
      // reprises : le DERNIER repère d'une phrase (souvent le plus
      // important, ex. "statuts"/"statussen") arrivait systématiquement
      // en retard, parfois même après la fin réelle mesurée de l'audio —
      // l'estimation à débit constant ne compense pas le fait qu'une
      // énumération finale ("X, Y et Z") est en général dite d'un trait,
      // légèrement plus vite que la moyenne du reste de la phrase. Une
      // légère anticipation généralisée réduit ce décalage sans fausser
      // sensiblement les tout premiers mots.
      const msParMot = (dureeMs / total) * 0.93;
      // Écart minimum entre deux déclenchements — demandé explicitement :
      // "ça se superpose, tu peux prendre plus de temps que l'audio non ?".
      // Remplace l'ancien plafond dur (qui empêchait un repère de dépasser
      // la fin de l'audio) : rien n'oblige vraiment à rester dans cette
      // fenêtre — seul un espacement visuel confortable entre deux
      // surlignages compte. Les repères sont donc calculés, triés, puis
      // chacun est repoussé si besoin pour garder au moins ECART_MIN_MS
      // avec le précédent — quitte à déclencher après la fin réelle de
      // l'audio pour le(s) dernier(s) mot(s) d'une énumération serrée.
      // Relevé 1000 → 2800 le 05/09 : remonté en test live sur Vendeur/
      // Acquéreur ("pas encore fluide... pas surligner tout en même temps,
      // pas descendre trop vite") — un champ complet (scroll vertical
      // DUREE_DEFILEMENT_CHAMP_MS=2500ms, voir alfred-dom.js, + marge)
      // prend en réalité bien plus que 1000ms à s'afficher. Avec un espacement
      // trop court, la file d'attente (fileSurlignageChamp) accumulait du
      // retard sur des répliques à 5-6 mots-clés (ex. PartiesAcquereur) et
      // finissait par rattraper plusieurs champs coup sur coup, bien après
      // que l'audio les ait déjà mentionnés — d'où l'impression de tout
      // voir s'allumer d'un coup. 2800ms colle à la vraie durée d'un champ
      // (2500ms de scroll + marge) : quitte à finir après la fin de
      // l'audio sur une réplique à beaucoup de mots-clés, mais chaque champ
      // reste visible le temps qu'il faut, un par un.
      const ECART_MIN_MS = 2800;
      const candidats = [];
      for (const entree of entrees) {
        const cles = (entree.motsCles || []).map((m) => m.toLowerCase());
        const idx = motsNettoyes.findIndex((m) => cles.some((c) => m === c || m.startsWith(c)));
        if (idx === -1 || typeof entree.action !== 'function') continue;
        candidats.push({ delai: idx * msParMot, action: entree.action });
      }
      candidats.sort((a, b) => a.delai - b.delai);
      let dernierDelai = -Infinity;
      for (const c of candidats) {
        const delai = Math.max(c.delai, dernierDelai + ECART_MIN_MS);
        dernierDelai = delai;
        const id = setTimeout(c.action, delai);
        if (timersRef) timersRef.ids.push(id);
      }
    }, DELAI_AUDIO_PERCEPTIBLE_MS);
  }, { once: true });
}

// ── Parler ────────────────────────────────────────────────
let audioCtxPartage = null;
function obtenirAudioContextPartage() {
  if (!audioCtxPartage) {
    audioCtxPartage = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Certains navigateurs suspendent le contexte s'il reste inactif un
  // moment (ex: entre deux étapes du script) — le relancer est sans effet
  // s'il tournait déjà.
  if (audioCtxPartage.state === 'suspended') audioCtxPartage.resume();
  return audioCtxPartage;
}

// Incrémenté à chaque appel de speak() — sert à repérer, dans le handler
// onended ci-dessous, un audio devenu périmé (voir le commentaire à cet
// endroit : bug de course trouvé en traçant setAlfredState en direct).
let audioGeneration = 0;

// moteurForce: 'cloud' pour forcer Cloud TTS (voir obtenirAudio) — utilisé
// pour les réponses libres du chatbot, jamais pour les répliques scriptées.
// surbrillanceMots (optionnel) : [{ motsCles: [...], action: () => ... }, ...]
// — voir programmerSurbrillanceMots ci-dessus. texteSurbrillance : le texte
// RÉELLEMENT prononcé (peut différer de sousTitre, qui affiche parfois la
// traduction dans l'autre langue — voir l'appel dans alfred-brain.js) ;
// sert de base au calcul des positions de mots, jamais sousTitre lui-même.
// emotion (optionnel) : clé de EMOTIONS_VOIX — jeu de la voix pour cette
// ligne (ElevenLabs v3 / Gemini), sans effet sur les sous-titres.
async function speak(text, langue, sousTitre, moteurForce, surbrillanceMots, texteSurbrillance, emotion, geste, hologrammes) {
  if (!text || text === '...') return;
  langue = langue || currentLangue || 'fr';
  const maGeneration = ++audioGeneration;

  setAlfredState('talk');
  animateMouth(0.3);

  try {
    const { audio, moteur } = await obtenirAudio(text, langue, moteurForce, emotion);
    currentAudio = audio;
    // Ralenti léger de toute la voix — demandé explicitement ("synchroniser
    // l'audio, le ralentir un peu"), en réglage global plutôt que par
    // réplique. audio.playbackRate est une fonctionnalité standard du
    // navigateur (relit l'audio déjà généré plus lentement), sans toucher
    // à la génération/au cache — plus sûr qu'un paramètre de vitesse envoyé
    // à l'API Gemini-TTS elle-même (dont le support n'est pas confirmé, et
    // un paramètre audio non supporté a déjà fait planter TOUS les appels
    // TTS une fois cette session, voir la note sur "pitch" plus haut).
    // Par MOTEUR (voir la note sur VITESSE_PAROLE/VITESSE_PAROLE_ELEVENLABS
    // plus haut) depuis le 04/09 — un seul réglage commun ne convenait plus
    // aux deux à la fois ("juste pour Gemini à 0.93, pour ElevenLabs c'est ok").
    audio.playbackRate = (moteur === 'elevenlabs') ? VITESSE_PAROLE_ELEVENLABS : VITESSE_PAROLE;

    // Sous-titres synchronisés sur la durée audio. phraseTimerRef est un
    // objet mutable (voir afficherSousTitresSync) car l'id du setTimeout
    // n'existe qu'après l'événement "playing" de l'audio, donc après le
    // retour de cet appel — clearInterval(phraseTimerRef.id) plus bas (dans
    // onended) lit toujours la valeur la plus récente.
    const phraseTimerRef = { id: null };
    afficherSousTitresSync(sousTitre || text, audio, phraseTimerRef);

    // Idem pour la surbrillance de champs synchronisée (voir
    // programmerSurbrillanceMots ci-dessus) — même texte de référence que
    // les sous-titres (sousTitre, déjà traduit dans la langue affichée).
    const surbrillanceTimersRef = { ids: [] };
    if (surbrillanceMots && surbrillanceMots.length) {
      programmerSurbrillanceMots(texteSurbrillance || text, audio, surbrillanceMots, surbrillanceTimersRef);
    }

    // Jeu d'acteur (alfred-ui.js) : expressions des yeux, gestes et temps
    // forts calés sur les phrases — démarré au moment où l'audio joue
    // vraiment, avec sa durée réelle (÷ vitesse de lecture, comme pour les
    // sous-titres). Arrêté dans onpause/onended plus bas.
    audio.addEventListener('playing', () => {
      if (typeof demarrerJeuDActeur !== 'function' || maGeneration !== audioGeneration) return;
      const dureeMs = (isFinite(audio.duration) && audio.duration > 0) ? audio.duration / (audio.playbackRate || 1) * 1000 : null;
      demarrerJeuDActeur({ texte: sousTitre || text, texteMots: texteSurbrillance || text, dureeMs, emotion, geste, hologrammes });
    }, { once: true });

    // Analyseur volume → bouche. Un seul AudioContext partagé, créé une
    // fois puis réutilisé (voir obtenirAudioContextPartage) : en recréer
    // un à chaque réplique (et le fermer juste après) coûte du temps et
    // provoque un micro-silence audible entre deux répliques enchaînées
    // (voir jouerSecours) — remonté en test live ("ça s'entend qu'il y a
    // un coupage").
    const ctx      = obtenirAudioContextPartage();
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
      // Brillance : part des aigus (≈2,4–7 kHz, sifflantes et "i") face aux
      // graves/médiums (≈170 Hz–1,4 kHz, voyelles rondes) — pilote la
      // LARGEUR de la bouche (voir animateMouth), le volume son ouverture.
      // fftSize 256 à 44,1 kHz : ~172 Hz par case.
      let graves = 0, aigusSomme = 0;
      for (let i = 1; i <= 8; i++) graves += buf[i];
      for (let i = 14; i <= 40; i++) aigusSomme += buf[i];
      graves /= 8; aigusSomme /= 27;
      const aigus = (graves + aigusSomme) > 8 ? aigusSomme / (graves + aigusSomme) : 0.3;
      updateVolBar(amp);
      animateMouth(amp, aigus * 1.6);
    }, 35);

    // audio.play() se résout dès que la lecture DÉMARRE, pas quand elle se
    // termine — un simple `await audio.play()` laissait donc le code
    // continuer (et l'audio suivant démarrer) alors que celui-ci jouait
    // encore. Avec une seule réplique ça ne se voyait pas, mais avec
    // plusieurs segments enchaînés (voir jouerSecours), le suivant
    // démarrait par-dessus le précédent — deux voix mélangées. On attend
    // maintenant explicitement la fin réelle (événement "ended").
    await new Promise((resolve, reject) => {
      // stopAudio() (touche Échap) appelle .pause(), pas .play() jusqu'au
      // bout — ça ne déclenche jamais "ended". Sans ce filet, la promesse
      // resterait bloquée pour toujours, et avec elle toute la séquence de
      // répliques (le verrou anti-double-déclenchement ne se relâcherait
      // plus). On écoute donc aussi "pause" ; resolve() est sans risque à
      // appeler deux fois (la 2e est ignorée).
      // stopAudio()/Échap coupe la parole en cours — là seulement, on annule
      // aussi les surbrillances pas encore déclenchées (sinon un champ
      // s'allumerait plus tard, hors contexte, sur un écran qu'on a déjà
      // quitté). PAS dans onended ci-dessous : trouvé en test live — le
      // dernier mot d'une phrase (souvent le plus important, ex. "statuts")
      // est parfois programmé quelques centaines de ms APRÈS la vraie fin de
      // l'audio mesurée (l'estimation mot/durée n'est jamais parfaite) ; le
      // vider systématiquement à "ended" annulait ce tout dernier surlignage
      // avant même qu'il ait eu la chance de se déclencher.
      audio.onpause = () => { surbrillanceTimersRef.ids.forEach(clearTimeout); if (typeof arreterJeuDActeur === 'function') arreterJeuDActeur(); resolve(); };
      audio.onended = () => {
        clearInterval(phraseTimerRef.id);
        clearInterval(talkTick);
        updateVolBar(0);
        resetMouth();
        // Trouvé en traçant setAlfredState en direct : cet "ended" peut se
        // déclencher EN RETARD, après qu'une réplique suivante ait déjà
        // commencé (son propre speak() a déjà remis l'état à 'talk') — sans
        // cette vérification, ce retour tardif écrasait cet état frais avec
        // 'idle', gelant la bouche alors que l'audio suivant jouait déjà.
        if (maGeneration === audioGeneration) setAlfredState('idle');
        currentAudio = null;
        resetSleepTimer();
        cacherSousTitres();
        resolve();
      };
      audio.play().catch(reject);
    });

  } catch(e) {
    console.warn('TTS erreur — fallback:', e);
    fallbackSpeak(text, langue, sousTitre);
  }
}

// ── Fallback Web Speech ───────────────────────────────────
function fallbackSpeak(text, langue, sousTitre) {
  langue = langue || 'fr';
  // Même compteur que speak() (voir plus haut) : protège aussi ce chemin de
  // secours contre un onend en retard qui écraserait l'état d'une réplique
  // suivante déjà commencée.
  const maGeneration = ++audioGeneration;
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
    if (maGeneration === audioGeneration) setAlfredState('idle');
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