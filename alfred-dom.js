// === ALFRED DOM — Navigation + Curseur ===

function creerCurseur() {
  if (document.getElementById('alfred-cursor')) return;
  const c = document.createElement('div');
  c.id = 'alfred-cursor';
  c.style.cssText = `
    position:fixed; width:16px; height:16px;
    background:#14b0bd; border-radius:50%;
    pointer-events:none; z-index:999999; opacity:0;
    box-shadow:0 0 10px rgba(20,176,189,0.8);
    transform:translate(-50%,-50%);
    transition:left .5s cubic-bezier(.25,.46,.45,.94),
               top  .5s cubic-bezier(.25,.46,.45,.94),
               opacity .2s ease;
  `;
  document.body.appendChild(c);
}

function curseurVers(el, callback) {
  const c = document.getElementById('alfred-cursor');
  if (!c || !el) { if (callback) callback(); return; }

  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width  / 2;
  const y = rect.top  + rect.height / 2;

  const alfred = document.getElementById('alfred-svg');
  if (alfred) {
    const ar = alfred.getBoundingClientRect();
    c.style.transition = 'none';
    c.style.left = (ar.left + ar.width  / 2) + 'px';
    c.style.top  = (ar.top  + ar.height / 2) + 'px';
  }

  c.style.opacity = '1';
  const safeHide = setTimeout(() => { c.style.opacity = '0'; }, 2500);

  setTimeout(() => {
    c.style.transition = `left .5s cubic-bezier(.25,.46,.45,.94),
                          top  .5s cubic-bezier(.25,.46,.45,.94),
                          opacity .2s ease`;
    c.style.left = x + 'px';
    c.style.top  = y + 'px';

    setTimeout(() => {
      c.style.transform = 'translate(-50%,-50%) scale(0.6)';
      setTimeout(() => {
        c.style.transform = 'translate(-50%,-50%) scale(1)';
        clearTimeout(safeHide);
        if (callback) callback();
        setTimeout(() => { c.style.opacity = '0'; }, 500);
      }, 150);
    }, 520);
  }, 60);
}

function attendre(ms) { return new Promise(r => setTimeout(r, ms)); }

function trouverNav(textes) {
  const navLinks = Array.from(document.querySelectorAll('a.nav-link, a.nav-link.uppercase'));
  for (const texte of textes) {
    const lower = texte.toLowerCase();
    const found = navLinks.find(el =>
      el.textContent.trim().toLowerCase() === lower &&
      el.getBoundingClientRect().width > 0
    );
    if (found) return found;
  }
  const autres = Array.from(document.querySelectorAll('a, button'))
    .filter(el => el.getBoundingClientRect().width > 0);
  for (const texte of textes) {
    const lower = texte.toLowerCase();
    const found = autres.find(el =>
      el.textContent.trim().toLowerCase().includes(lower)
    );
    if (found) return found;
  }
  return null;
}

async function naviguerVers(textes) {
  const el = trouverNav(textes);
  if (!el) {
    console.warn('[Alfred DOM] Élément non trouvé:', textes);
    return false;
  }
  return new Promise(resolve => {
    curseurVers(el, () => {
      el.click();
      resolve(true);
    });
  });
}

// ── SÉQUENCES ────────────────────────────────────────────

// Dashboard — liste des dossiers
async function seq_montrerDossiers() {
  await naviguerVers(['Dossiers']);
  await attendre(1000);
}

// Formulaire — clic sur Créer un dossier
async function seq_montrerCreation() {
  await naviguerVers(['Dossiers']);
  await attendre(1000);
  const btn = Array.from(document.querySelectorAll('a.action-card'))
    .find(el => el.textContent.includes('Créer un dossier')
      && el.getBoundingClientRect().width > 0);
  if (btn) {
    curseurVers(btn, () => btn.click());
    await attendre(1200);
  }
}

// Étape 2 — Personnes (clic Suivant)
async function seq_montrerPersonnes() {
  const suivant = Array.from(document.querySelectorAll('button'))
    .find(el => el.textContent.trim() === 'Suivant'
      && el.getBoundingClientRect().width > 0);
  if (suivant) {
    curseurVers(suivant, () => suivant.click());
    await attendre(1000);
  } else {
    const onglet = Array.from(document.querySelectorAll('button, a'))
      .find(el => el.textContent.includes('2') && el.textContent.includes('Personnes')
        && el.getBoundingClientRect().width > 0);
    if (onglet) curseurVers(onglet, () => onglet.click());
    await attendre(1000);
  }
}

// Étape 3 — Biens / cadastre (clic Suivant)
async function seq_montrerBiens() {
  const suivant = Array.from(document.querySelectorAll('button'))
    .find(el => el.textContent.trim() === 'Suivant'
      && el.getBoundingClientRect().width > 0);
  if (suivant) {
    curseurVers(suivant, () => suivant.click());
    await attendre(1000);
  } else {
    const onglet = Array.from(document.querySelectorAll('button, a'))
      .find(el => el.textContent.includes('3') && el.textContent.includes('Biens')
        && el.getBoundingClientRect().width > 0);
    if (onglet) curseurVers(onglet, () => onglet.click());
    await attendre(1000);
  }
}

// Étape 4 — Documents (clic Suivant)
async function seq_montrerDocuments() {
  const suivant = Array.from(document.querySelectorAll('button'))
    .find(el => el.textContent.trim() === 'Suivant'
      && el.getBoundingClientRect().width > 0);
  if (suivant) {
    curseurVers(suivant, () => suivant.click());
    await attendre(1000);
  } else {
    const onglet = Array.from(document.querySelectorAll('button, a'))
      .find(el => el.textContent.includes('4') && el.textContent.includes('Documents')
        && el.getBoundingClientRect().width > 0);
    if (onglet) curseurVers(onglet, () => onglet.click());
    await attendre(1000);
  }
}

// Rédaction — ouvre premier dossier existant puis Compromis
async function seq_montrerRedaction() {
  await naviguerVers(['Dossiers']);
  await attendre(1000);
  const lignes = Array.from(document.querySelectorAll('tr'))
    .filter(el =>
      el.getBoundingClientRect().width > 0 &&
      el.textContent.trim().length > 10 &&
      !el.textContent.includes('Catégorie')
    );
  if (lignes[0]) {
    curseurVers(lignes[0], () => lignes[0].click());
    await attendre(1200);
  }
  await attendre(500);
  const onglet = Array.from(document.querySelectorAll('button, a'))
    .find(el =>
      (el.textContent.includes('Compromis') || el.textContent.includes('Acte de vente'))
      && el.getBoundingClientRect().width > 0
    );
  if (onglet) curseurVers(onglet, () => onglet.click());
}

// Chatbot
async function seq_montrerChatbot() {
  await naviguerVers(['Chat', 'Message', 'Chatbot']);
}

// Événements — onglet mails/communication dans dossier
async function seq_montrerEvenements() {
  const onglet = Array.from(document.querySelectorAll('button, a'))
    .find(el =>
      (el.textContent.includes('Événement') ||
       el.textContent.includes('Evenement') ||
       el.textContent.includes('Mail') ||
       el.textContent.includes('Communication'))
      && el.getBoundingClientRect().width > 0
    );
  if (onglet) curseurVers(onglet, () => onglet.click());
}

// ── Mapping label → séquence ──────────────────────────────
const DOM_ACTIONS = {
  // Acte 2 — Séquence 1
  'Dashboard':  seq_montrerDossiers,
  'Formulaire': seq_montrerCreation,
  'Parties':    seq_montrerPersonnes,
  'Notaires':   null,
  'Cadastre':   seq_montrerBiens,
  'Complet':    null,

  // Acte 2 — Séquence 2
  'Documents':  seq_montrerDocuments,
  'Documenten': seq_montrerDocuments,
  'Analysé':    null,
  'Pendant':    null,

  // Acte 2 — Séquence 3
  'Rédaction2': seq_montrerRedaction,

  // Acte 2 — Séquence 4
  'Chatbot':    seq_montrerChatbot,
  'Événements': seq_montrerEvenements,
  'Exactement': null,

  // Acte 3
  'Sécurité':   null,
  'Stand':      null,
  'Closing':    null,
};

async function executerActionDOM(label) {
  const action = DOM_ACTIONS[label];
  if (action) {
    await attendre(400);
    await action();
  }
}

async function changerEcranAvecCurseur(categorie) {
  const mapping = {
    dashboard:  ['Home'],
    dossiers:   ['Dossiers'],
    parties:    ['Personnes'],
    notaires:   ['Notaires'],
    contacts:   ['Contacts'],
    documents:  ['Documents', 'Documenten'],
    redaction:  ['Compromis', 'Acte de vente'],
    chatbot:    ['Chat', 'Message'],
  };
  const textes = mapping[categorie];
  if (textes) await naviguerVers(textes);
}

creerCurseur();
console.log('[Alfred DOM] Prêt — curseur créé');