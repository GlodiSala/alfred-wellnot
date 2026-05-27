// === ALFRED BRAIN ===
// Dépend de : alfred-config.js, alfred-ui.js, alfred-voice.js, alfred-dom.js

let isListening = false;
let recognition = null;
let secoursIdx  = 0;

// ── Détection langue ──────────────────────────────────────
function detectLangue(text) {
  const lower = text.toLowerCase();
  if (currentLangue === 'fr') {
    const hitsNL = ALFRED_CONFIG.TRIGGERS_NL.filter(w => lower.includes(w)).length;
    return hitsNL >= 2 ? 'nl' : 'fr';
  }
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
  const main = document.querySelector('main, .main-content, app-root, [class*="content"]');
  if (main) {
    const texte = main.innerText.replace(/\s+/g, ' ').trim().substring(0, 400);
    return '\n\nÉCRAN VISIBLE : ' + texte + ' — Cite les données réelles. 2 phrases max.';
  }
  return '';
}

// ── Bulle mot par mot ─────────────────────────────────────
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
  }, 120);
}

// ── Traduction bulle ──────────────────────────────────────
async function traduire(text, versLangue) {
  const prompt = versLangue === 'nl'
    ? `Traduis en néerlandais belge, même ton, même longueur. Uniquement la traduction : "${text}"`
    : `Traduis en français, même ton, même longueur. Uniquement la traduction : "${text}"`;
  try {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch(e) { return ''; }
}

// ── Détection intention pour navigation ──────────────────
function detecterIntentionActe2(text) {
  const lower = text.toLowerCase();
  const intentions = [
    { label: 'Dossier',   mots: ['dossier','créer','création','vente immobilière','zéro','partir','creer','folder','aanmaken'] },
    { label: 'Parties',   mots: ['partie','vendeur','acquéreur','registre','personne','suivant','rijksregister','koper','naam'] },
    { label: 'Documents', mots: ['document','manquant','pièce','peb','upload','catégoris','ontbreekt'] },
    { label: 'Rédaction', mots: ['compromis','rédaction','acte','blanche','check','ontwerp','akte','rédige','génère'] },
    { label: 'Chatbot',   mots: ['chatbot','nuit','avance','message','vordert','bericht'] },
  ];
  for (const { label, mots } of intentions) {
    if (mots.some(m => lower.includes(m))) return label;
  }
  return null;
}

// ── Détection transition vers Acte 2 ─────────────────────
function detecterTransitionActe2(text) {
  const lower = text.toLowerCase();
  const mots = ['montrer','montrez','live','voir','en direct','démonstration','demontrer','demonstrer','regardez','regarder'];
  return mots.some(m => lower.includes(m));
}

// ── Gemini ────────────────────────────────────────────────
async function askAlfred(text, retries = 2) {
  setAlfredState('think');
  showTranscript('« ' + text + ' »');

  const langue = detectLangue(text);
  currentLangue = langue;
  const langLbl = document.getElementById('alfred-langue-lbl');
  if (langLbl) langLbl.textContent = langue === 'nl' ? '🇧🇪 NL' : '🇧🇪 FR';

  // Détection transition Acte 1 → 2 via micro
  if (currentActe === 1 && detecterTransitionActe2(text)) {
    currentActe = 2;
    console.log('[Alfred] Acte 2 activé via micro');
  }

  const langInstruction = langue === 'nl'
    ? 'RÈGLE ABSOLUE : réponds UNIQUEMENT en néerlandais belge. MAXIMUM 8 phrases. Commence directement sans préfixe.\n\n'
    : 'RÈGLE ABSOLUE : réponds UNIQUEMENT en français. MAXIMUM 8 phrases. Commence directement sans préfixe.\n\n';

  const fullPrompt = langInstruction
    + ALFRED_CONFIG.SYSTEM_PROMPT
    + getContexteEcran()
    + '\n\nQuestion : ' + text;

  try {
    const res = await fetch(ALFRED_CONFIG.API_GEMINI, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });

    if (res.status === 503 && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return askAlfred(text, retries - 1);
    }

    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    if (!raw) {
      const fb = langue === 'nl' ? 'Ik sta klaar voor uw volgende vraag.' : 'Posez votre prochaine question.';
      const trad = await traduire(fb, langue === 'nl' ? 'fr' : 'nl');
      showBubble(trad || fb);
      await speak(naturaliserTexte(fb), langue);
      return;
    }

    let replyClean = raw
      .replace(/^MODE SCRIPT\s*:/i, '')
      .replace(/^MODE LIBRE\s*:/i,  '')
      .replace(/^MODE FIXE[^:]*:/i, '')
      .replace(/^[«""\u201C\u201D]/,  '')
      .replace(/[»""\u201C\u201D]$/, '')
      .trim();

    const phrases = replyClean.match(/[^.!?]+[.!?]+/g) || [replyClean];
    replyClean = phrases.slice(0, 8).join(' ').trim();

    addToHistory('alfred', replyClean);

    // Navigation Acte 2 — via micro si intention détectée
    if (currentActe >= 2) {
      const intention = detecterIntentionActe2(text);
      if (intention && typeof executerActionDOM === 'function') {
        await executerActionDOM(intention);
      }
    }

    const autreLangue = langue === 'nl' ? 'fr' : 'nl';
    const trad = await traduire(replyClean, autreLangue);
    showBubble(trad || replyClean);
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

  const listeTrad = currentLangue === 'nl'
    ? ALFRED_CONFIG.REPLIQUES_FR
    : ALFRED_CONFIG.REPLIQUES_NL;

  const rTrad = listeTrad.find(t => t.acte === r.acte && t.label === r.label)
             || listeTrad[Math.min(secoursIdx, listeTrad.length - 1)];

  showBubble(rTrad ? rTrad.texte : r.texte);
  addToHistory('alfred', r.texte);

  // Bascule automatique Acte 1 → 2
  if (r.acte === 2 && currentActe === 1) {
    currentActe = 2;
    console.log('[Alfred] Acte 2 activé via →');
  }

  // Navigation DOM seulement en Acte 2
  if (currentActe >= 2) {
    if (typeof executerActionDOM === 'function') {
      await executerActionDOM(r.label);
    }
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