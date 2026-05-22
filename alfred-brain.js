// === ALFRED BRAIN — Gemini + détection langue + lecture DOM ===

let currentLangue = 'fr';
let isListening = false;
let recognition = null;
let currentAudio = null;
let secoursIdx = 0;
let talkTick = null;

// === DÉTECTION LANGUE VIA GEMINI ===
async function detectLangue(text) {
  try {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `Réponds UNIQUEMENT par "fr" ou "nl", rien d'autre. Quelle est la langue de ce texte : "${text}"` 
          }]
        }]
      })
    });
    const data = await res.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
    currentLangue = result?.includes('nl') ? 'nl' : 'fr';
  } catch(e) {
    // Fallback — mots triggers si Gemini échoue
    const lower = text.toLowerCase();
    currentLangue = ALFRED_CONFIG.TRIGGERS_NL.some(k => lower.includes(k)) ? 'nl' : 'fr';
  }
  return currentLangue;
}

// === LECTURE DU VRAI DOM ALFRED ===
function lireEcran() {
  // Lit le panneau droit = vrai contenu app.alfred.be
  const right = document.getElementById('alfred-right-panel');
  const source = right || document.body;
  return source.innerText
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1200);
}

function lireURL() {
  return window.location.pathname;
}

// === APPEL GEMINI VIA VERCEL ===
async function askGemini(question, retries = 2) {
  const contexteEcran = lireEcran();
  const url = lireURL();

  const prompt = ALFRED_CONFIG.SYSTEM_PROMPT + `

════════════════════════════════════
CONTENU VISIBLE À L'ÉCRAN MAINTENANT :
${contexteEcran}

PAGE ACTUELLE : ${url}
════════════════════════════════════

Question ou intervention : ${question}`;

  try {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (res.status === 503 && retries > 0) {
      await new Promise(r => setTimeout(r, 2500));
      return askGemini(question, retries - 1);
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('Pas de réponse Gemini');
    return reply;

  } catch(e) {
    console.error('Gemini erreur:', e);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2500));
      return askGemini(question, retries - 1);
    }
    return currentLangue === 'nl'
      ? "Een ogenblik, ik denk nog even na."
      : "Un instant, je réfléchis encore.";
  }
}

// === TRADUCTION ===
async function traduire(texte, versLangue) {
  if (!texte) return '';
  const instruction = versLangue === 'nl'
    ? `Traduis uniquement ce texte en néerlandais belge (flamand), rien d'autre, pas d'explication : "${texte}"`
    : `Vertaal alleen deze tekst naar het Frans, niets anders, geen uitleg : "${texte}"`;

  try {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruction }] }]
      })
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch(e) {
    return '';
  }
}

// === NATURALISER TEXTE POUR TTS ===
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
    .replace(/GDPR/gi,       'G-D-P-R')
    .replace(/\bIA\b/gi,     'intelligence artificielle')
    .replace(/e-notariat/gi, 'é-notariat')
    .replace(/\bMe\b/g,      'Maître')
    .replace(/\*\*/g,        '')
    .replace(/\*/g,          '')
    .replace(/#{1,6}\s/g,    '')
    .replace(/\n/g,          ' ')
    .trim();
}

// === FLOW COMPLET : question → réponse → voix + traduction ===
async function traiterQuestion(question) {
  // 1. Détecte la langue en parallèle
  const languePromise = detectLangue(question);

  // 2. Met Alfred en mode réflexion
  setAlfredState('think');
  showBubble('...');

  // 3. Attend la langue détectée
  const langue = await languePromise;

  // 4. Demande à Gemini
  const reponse = await askGemini(question);

  // 5. Affiche la réponse
  showBubble(reponse);
  addToHistory('alfred', reponse);

  // 6. Traduction en parallèle de la voix
  const versLangue = langue === 'fr' ? 'nl' : 'fr';
  traduire(reponse, versLangue).then(trad => {
    if (trad) showTranslation(trad);
  });

  // 7. Fait parler Alfred
  await speak(naturaliserTexte(reponse), langue);
}

// === MICRO ===
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Utilise Chrome ou Edge pour la reconnaissance vocale');
    return;
  }

  recognition = new SR();
  recognition.lang = currentLangue === 'nl' ? 'nl-BE' : 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    setAlfredState('listen');
    updateMicBtn(true);
    showTranscript('...');
  };

  recognition.onresult = async (e) => {
    const question = e.results[0][0].transcript;
    showTranscript('« ' + question + ' »');
    addToHistory('user', question);
    await traiterQuestion(question);
  };

  recognition.onend = () => {
    isListening = false;
    updateMicBtn(false);
    setAlfredState('idle');
  };

  recognition.onerror = (e) => {
    console.error('Micro erreur:', e.error);
    isListening = false;
    updateMicBtn(false);
    setAlfredState('idle');
  };

  recognition.start();
}

// === RÉPLIQUES DE SECOURS (flèches clavier) ===
async function jouerSecours(direction = 1) {
  const repliques = currentLangue === 'nl'
    ? ALFRED_CONFIG.REPLIQUES_NL
    : ALFRED_CONFIG.REPLIQUES_FR;

  secoursIdx = (secoursIdx + direction + repliques.length) % repliques.length;
  const r = repliques[secoursIdx];

  // Affiche
  showBubble(r.texte);
  addToHistory('alfred', r.texte);
  updateSecoursLabel(r.label, r.acte, secoursIdx + 1, repliques.length);

  // Traduction en parallèle
  const versLangue = currentLangue === 'fr' ? 'nl' : 'fr';
  traduire(r.texte, versLangue).then(trad => {
    if (trad) showTranslation(trad);
  });

  // Parle
  await speak(naturaliserTexte(r.texte), currentLangue);
}

// === SWITCH LANGUE MANUEL ===
function switchLangue(langue) {
  currentLangue = langue;
  const lbl = document.getElementById('alfred-langue-lbl');
  if (lbl) lbl.textContent = langue === 'nl' ? '🇧🇪 NL' : '🇧🇪 FR';
  secoursIdx = 0;
}

// === CLAVIER ===
document.addEventListener('keydown', e => {
  // Flèche droite → réplique suivante
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    jouerSecours(1);
  }
  // Flèche gauche → réplique précédente
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    jouerSecours(-1);
  }
  // Espace → micro
  if (e.key === ' ' && !isListening) {
    e.preventDefault();
    startListening();
  }
  if (e.key === ' ' && isListening) {
    e.preventDefault();
    recognition?.stop();
  }
  // F → switch français
  if (e.key === 'f' || e.key === 'F') {
    switchLangue('fr');
  }
  // N → switch néerlandais
  if (e.key === 'n' || e.key === 'N') {
    switchLangue('nl');
  }
  // Escape → stop audio
  if (e.key === 'Escape') {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    setAlfredState('idle');
  }
});