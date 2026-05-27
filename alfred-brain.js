// === ALFRED BRAIN ===
// Dépend de : alfred-config.js, alfred-ui.js, alfred-voice.js, alfred-dom.js

let isListening   = false;
let recognition   = null;
let secoursIdx    = 0;

// ── Détection langue ──────────────────────────────────────
// Détection simple basée sur la langue courante
// On change uniquement si on détecte clairement l'autre langue
function detectLangue(text) {
  const lower = text.toLowerCase();
  // Si on est en FR et on détecte du NL clair
  if (currentLangue === 'fr') {
    const hitsNL = ALFRED_CONFIG.TRIGGERS_NL.filter(w => lower.includes(w)).length;
    return hitsNL >= 2 ? 'nl' : 'fr';
  }
  // Si on est en NL et on détecte du FR clair
  if (currentLangue === 'nl') {
    const triggersFR = ['bonjour','merci','comment','pouvez','votre','quel','quelle','est-ce','vous'];
    const hitsFR = triggersFR.filter(w => lower.includes(w)).length;
    return hitsFR >= 2 ? 'fr' : 'nl';
  }
  return currentLangue;
}

function switchLangue(l) {
  currentLangue = l;
  const lbl = document.getElementById('alfred-langue-lbl');
  if (lbl) lbl.textContent = l === 'nl' ? '🇧🇪 NL' : '🇧🇪 FR';
}

// ── Naturalisation TTS ────────────────────────────────────
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
    .replace(/e-notariat/gi, 'é-notariat')
    .replace(/\bMe\b/g,      'Maître')
    .replace(/\*\*/g,        '')
    .replace(/\*/g,          '')
    .replace(/\n/g,          ' ')
    .trim();
}

// ── Contexte écran ────────────────────────────────────────
function getContexteEcran() {
  const ecranActif = document.querySelector('.screen.active');
  if (!ecranActif) return '';
  const texteVisible = ecranActif.innerText
    .replace(/\s+/g, ' ').trim().substring(0, 400);
  return '\n\nÉCRAN VISIBLE : ' + texteVisible
    + ' — Cite les données réelles visibles. 2 phrases max.';
}

// ── Bulle mot par mot (léger retard sur la voix) ─────────
function showBubble(text) {
  const b = document.getElementById('alfred-bubble');
  if (!b) return;
  b.classList.remove('show');
  b.textContent = '';
  void b.offsetWidth;
  b.classList.add('show');
  const words = text.split(' ');
  let i = 0;
  const iv = setInterval(() => {
    if (i < words.length) {
      b.textContent += (i === 0 ? '' : ' ') + words[i];
      b.scrollTop = b.scrollHeight;
      i++;
    } else {
      clearInterval(iv);
    }
  }, 180);
}

// ── Détection écran à changer ─────────────────────────────
function detectAndChangeScreen(text) {
  const lower = text.toLowerCase();
  const mapping = [
    { cat: 'dossiers',  mots: ['dossier','aanmaken','créer','création','creer'] },
    { cat: 'parties',   mots: ['partie','vendeur','acquéreur','registre','personne','rijksregister','partijen','koper','personen'] },
    { cat: 'documents', mots: ['document','manquant','pièce','peb','upload','documenten','ontbreekt'] },
    { cat: 'redaction', mots: ['compromis','rédaction','acte','blanche','check','ontwerp','akte'] },
    { cat: 'chatbot',   mots: ['chatbot','nuit','avance','message','vordert','avonds'] },
    { cat: 'dashboard', mots: ['tableau','bord','accueil','home','overzicht','alertes'] },
  ];

  for (const { cat, mots } of mapping) {
    if (mots.some(m => lower.includes(m))) {
      if (typeof changerEcranAvecCurseur === 'function') {
        changerEcranAvecCurseur(cat);
      }
      return;
    }
  }
}
// ── Gemini ────────────────────────────────────────────────
async function askAlfred(text, retries = 2) {
  setAlfredState('think');
  showTranscript('« ' + text + ' »');

  const langue = detectLangue(text);
  currentLangue = langue;
  const langLbl = document.getElementById('alfred-langue-lbl');
  if (langLbl) langLbl.textContent = langue === 'nl' ? '🇧🇪 NL' : '🇧🇪 FR';

  const langInstruction = langue === 'nl'
    ? 'RÈGLE ABSOLUE : réponds UNIQUEMENT en néerlandais belge. MAXIMUM 2 phrases.\n\n'
    : 'RÈGLE ABSOLUE : réponds UNIQUEMENT en français. MAXIMUM 2 phrases.\n\n';

  const fullPrompt = langInstruction
    + ALFRED_CONFIG.SYSTEM_PROMPT
    + getContexteEcran()
    + '\n\nQuestion : ' + text;

  try {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });

    if (res.status === 503 && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return askAlfred(text, retries - 1);
    }

    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    if (!raw) {
      const fb = langue === 'nl'
        ? 'Ik sta klaar voor uw volgende vraag.'
        : 'Posez votre prochaine question.';
      showBubble(fb);
      await speak(naturaliserTexte(fb), langue);
      return;
    }
    // Par :
    // Nettoie les artefacts du prompt
    let replyClean = raw
      .replace(/^MODE SCRIPT\s*:/i, '')
      .replace(/^MODE LIBRE\s*:/i, '')
      .replace(/^MODE FIXE[^:]*:/i, '')
      .replace(/^"/,'').replace(/"$/,'')
      .trim();

    // Limite à 4 phrases max (les répliques du script sont longues)
    const phrases = replyClean.match(/[^.!?]+[.!?]+/g) || [replyClean];
    replyClean = phrases.slice(0, 4).join(' ').trim();

    // Bulle + changement écran sur question ET réponse
    showBubble(replyClean);
    detectAndChangeScreen(text);
    detectAndChangeScreen(replyClean);

    addToHistory('alfred', replyClean);

    // Parle via alfred-voice.js
    await speak(naturaliserTexte(replyClean), langue);

  } catch(e) {
    console.error('askAlfred:', e);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return askAlfred(text, retries - 1);
    }
    setAlfredState('idle');
  }
}

// ── Micro ─────────────────────────────────────────────────
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showTranscript('Chrome requis'); return; }

  // Stop audio en cours
  if (typeof stopAudio === 'function') stopAudio();

  recognition = new SR();
  recognition.lang           = currentLangue === 'nl' ? 'nl-BE' : 'fr-FR';
  recognition.continuous     = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    updateMicBtn(true);
    setAlfredState('idle');
    showTranscript('...');
    resetSleepTimer();
  };

  recognition.onresult = e => {
    const t = Array.from(e.results).map(r => r[0].transcript).join('');
    showTranscript('« ' + t + ' »');
  };

  recognition.onend = async () => {
    isListening = false;
    updateMicBtn(false);
    const txt = (document.getElementById('alfred-transcript')?.textContent || '')
      .replace(/«\s*|\s*»/g, '').trim();
    if (txt.length > 2) {
      addToHistory('user', txt);
      await askAlfred(txt);
    } else {
      setAlfredState('idle');
    }
  };

  recognition.onerror = () => {
    isListening = false;
    updateMicBtn(false);
    setAlfredState('idle');
  };

  recognition.start();
}

// ── Répliques de secours ──────────────────────────────────
async function jouerSecours() {
  const list = currentLangue === 'nl'
    ? ALFRED_CONFIG.REPLIQUES_NL
    : ALFRED_CONFIG.REPLIQUES_FR;
  if (!list || !list.length) return;

  secoursIdx = secoursIdx % list.length;
  const r = list[secoursIdx];

  showBubble(r.texte);
  addToHistory('alfred', r.texte);

  // Change l'écran selon la réplique
  detectAndChangeScreen(r.texte);
  detectAndChangeScreen(r.label);

  // Action DOM si disponible
  if (typeof executerActionDOM === 'function') {
    await executerActionDOM(r.label);
  }

  await speak(naturaliserTexte(r.texte), currentLangue);

  updateSecoursLabel(r.label, r.acte, secoursIdx + 1, list.length);
  secoursIdx++;
}

// ── Clavier ───────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    jouerSecours();
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    secoursIdx = Math.max(0, secoursIdx - 2);
    jouerSecours();
  }
  if (e.key === ' ' && !isListening) {
    e.preventDefault();
    startListening();
  }
  if (e.key === ' ' && isListening) {
    e.preventDefault();
    recognition?.stop();
  }
  if (e.key === 'Escape') {
    if (typeof stopAudio === 'function') stopAudio();
    setAlfredState('idle');
  }
});

// ── Helpers UI ────────────────────────────────────────────
function showTranscript(t) {
  const el = document.getElementById('alfred-transcript');
  if (el) el.textContent = t || '';
}

function updateVolBar(amp) {
  const b = document.getElementById('alfred-vol-bar');
  if (b) b.style.width = (amp * 100) + '%';
}

function updateMicBtn(on) {
  const b = document.getElementById('alfred-mic-btn');
  if (!b) return;
  b.textContent = on ? '⏹ Stop' : '🎤 Parler';
  b.classList.toggle('listening', on);
}

function toggleMic() {
  if (isListening) recognition?.stop();
  else startListening();
}

function toggleLangue() {
  switchLangue(currentLangue === 'fr' ? 'nl' : 'fr');
}

function addToHistory(who, text) {
  console.log(
    `%c[${who.toUpperCase()}]%c ${text.substring(0, 100)}`,
    `color:${who === 'alfred' ? '#14b0bd' : '#888'};font-weight:bold`,
    'color:inherit'
  );
}

function updateSecoursLabel(label, acte, idx, total) {
  const el = document.getElementById('alfred-secours');
  if (el) {
    el.textContent = `A${acte} · ${label} · ${idx}/${total}`;
    setTimeout(() => { if (el) el.textContent = '← →'; }, 4000);
  }
}