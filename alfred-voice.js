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
  const cle = ['gemini-tts-v3', voixId, ton, languageCode, text].join('|');

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

// Une réplique "groupée" (r.segments) contient plusieurs textes à
// précharger séparément, un par segment, plutôt qu'un seul r.texte.
function textesAPrecharger(replique) {
  if (replique.segments) return replique.segments.map(s => s.texte);
  return [replique.texte];
}

// Délai avant le passage de rattrapage ci-dessous — le temps que la limite
// Gemini-TTS "par minute" (voir appellerGeminiTTS) se débloque toute seule.
const ATTENTE_RATTRAPAGE_PRECHARGEMENT_MS = 65000;

async function prechargerScript(voixFr, voixNl, ton, onProgress) {
  const lignes = [
    ...(ALFRED_CONFIG.REPLIQUES_FR || []).flatMap(r => textesAPrecharger(r).map(texte => ({ texte, voix: voixFr, langue: 'fr' }))),
    ...(ALFRED_CONFIG.REPLIQUES_NL || []).flatMap(r => textesAPrecharger(r).map(texte => ({ texte, voix: voixNl, langue: 'nl' }))),
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
        await genererAudioGemini(ligne.texte, ligne.voix, ton, ligne.langue);
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
function animateMouth(amp) {
  // Suspendu pendant clinDoeil() (alfred-ui.js) : sinon ce callback, encore
  // déclenché par talkTick pendant que l'audio finit de jouer, réécrit la
  // bouche "qui parle" à chaque frame et annule aussitôt le sourire forcé
  // du clin d'œil.
  if (typeof clinDoeilActif !== 'undefined' && clinDoeilActif) return;
  const mt = document.getElementById('alfred-mouth-talk');
  const ms = document.getElementById('alfred-mouth');
  if (!mt || !ms) return;
  ms.style.display = 'none';
  mt.style.display = 'block';
  // La largeur (rx) variait jamais — l'ellipse ne faisait que s'étirer en
  // hauteur, toujours à la même largeur (20 fixé dans le markup). Une vraie
  // bouche qui parle change aussi de largeur (un "o" est plus étroit qu'un
  // "ah" mi-ouvert) : rx varie maintenant un peu à l'inverse de ry, toujours
  // piloté par le volume réel de l'audio (voir talkTick dans speak()), pas
  // du hasard — juste une forme de sortie moins pauvre qu'un simple ovale
  // qui respire.
  mt.setAttribute('ry', (amp * 12).toFixed(1));
  mt.setAttribute('rx', (20 - amp * 5).toFixed(1));
  mt.setAttribute('cy', (128 + amp * 4).toFixed(1));
}

// ── Remet le sourire ──────────────────────────────────────
function resetMouth() {
  const mt = document.getElementById('alfred-mouth-talk');
  const ms = document.getElementById('alfred-mouth');
  if (mt) {
    mt.style.display = 'none';
    mt.setAttribute('ry', '0');
    mt.setAttribute('rx', '20');
    mt.setAttribute('cy', '128');
  }
  if (ms) ms.style.display = 'block';
}

// Délai ajouté après l'événement "playing" avant d'afficher le 1er
// sous-titre — voir le commentaire dans afficherSousTitresSync. 250ms
// remonté en test live comme encore insuffisant (texte toujours perçu en
// avance) — monté à 600ms. À réajuster si ça reste en avance ou si, à
// l'inverse, ça devient perceptible en retard sur la voix.
const DELAI_AUDIO_PERCEPTIBLE_MS = 600;

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
    dureeSecondes = isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
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
async function speak(text, langue, sousTitre, moteurForce) {
  if (!text || text === '...') return;
  langue = langue || currentLangue || 'fr';
  const maGeneration = ++audioGeneration;

  setAlfredState('talk');
  animateMouth(0.3);

  try {
    const audio = await obtenirAudio(text, langue, moteurForce);
    currentAudio = audio;

    // Sous-titres synchronisés sur la durée audio. phraseTimerRef est un
    // objet mutable (voir afficherSousTitresSync) car l'id du setTimeout
    // n'existe qu'après l'événement "playing" de l'audio, donc après le
    // retour de cet appel — clearInterval(phraseTimerRef.id) plus bas (dans
    // onended) lit toujours la valeur la plus récente.
    const phraseTimerRef = { id: null };
    afficherSousTitresSync(sousTitre || text, audio, phraseTimerRef);

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
      updateVolBar(amp);
      animateMouth(amp);
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
      audio.onpause = () => resolve();
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