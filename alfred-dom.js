// === ALFRED DOM — Navigation + Curseur ===

// ── Curseur teal ──────────────────────────────────────────
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

  // Part du panneau Alfred
  const alfred = document.getElementById('alfred-svg');
  if (alfred) {
    const ar = alfred.getBoundingClientRect();
    c.style.transition = 'none';
    c.style.left = (ar.left + ar.width  / 2) + 'px';
    c.style.top  = (ar.top  + ar.height / 2) + 'px';
  }

  c.style.opacity = '1';

  setTimeout(() => {
    c.style.transition = `left .5s cubic-bezier(.25,.46,.45,.94),
                          top  .5s cubic-bezier(.25,.46,.45,.94),
                          opacity .2s ease`;
    c.style.left = x + 'px';
    c.style.top  = y + 'px';

    setTimeout(() => {
      // Effet clic
      c.style.transform = 'translate(-50%,-50%) scale(0.6)';
      setTimeout(() => {
        c.style.transform = 'translate(-50%,-50%) scale(1)';
        if (callback) callback();
        setTimeout(() => { c.style.opacity = '0'; }, 500);
      }, 150);
    }, 520);
  }, 60);
}

function attendre(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Trouver un élément de navigation par texte ────────────
function trouverNav(textes) {
  const candidats = Array.from(document.querySelectorAll(
    'a, button, [role="menuitem"], li, .p-menuitem-link, nav *, .sidebar *, .menu *'
  ));
  for (const texte of textes) {
    const el = candidats.find(b =>
      b.textContent.trim().toLowerCase().includes(texte.toLowerCase()) &&
      b.getBoundingClientRect().width > 0
    );
    if (el) return el;
  }
  return null;
}

// ── Navigation avec curseur ───────────────────────────────
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

// ── SÉQUENCES DÉMO ────────────────────────────────────────

// Acte 2 — Séquence 1 : Montrer les dossiers
async function seq_montrerDossiers() {
  await naviguerVers(['DOSSIERS', 'Dossiers', 'dossier']);
  await attendre(1000);
}

// Acte 2 — Séquence 2 : Montrer la création de dossier
async function seq_montrerCreation() {
  // Va sur Dossiers d'abord
  await naviguerVers(['DOSSIERS', 'Dossiers']);
  await attendre(800);
  // Clique sur Nouveau / Créer
  await naviguerVers(['Nouveau', 'Créer', 'Nieuw', 'New', '+']);
  await attendre(800);
}

// Acte 2 — Séquence 3 : Montrer les personnes
async function seq_montrerPersonnes() {
  await naviguerVers(['PERSONNES', 'Personnes', 'Personen', 'Parties']);
  await attendre(1000);
}

// Acte 2 — Séquence 4 : Montrer les contacts/notaires
async function seq_montrerNotaires() {
  await naviguerVers(['NOTAIRES', 'Notaires', 'Notarissen', 'Contacts']);
  await attendre(1000);
}

// Acte 2 — Séquence 5 : Montrer un dossier existant
async function seq_montrerDossierExistant() {
  await naviguerVers(['DOSSIERS', 'Dossiers']);
  await attendre(800);
  // Clique sur le premier dossier de la liste
  const lignes = Array.from(document.querySelectorAll(
    'tr, .p-datatable-row, .dossier-row, [class*="row"], [class*="item"]'
  )).filter(el =>
    el.getBoundingClientRect().width > 0 &&
    el.textContent.trim().length > 0
  );
  if (lignes[0]) {
    curseurVers(lignes[0], () => lignes[0].click());
    await attendre(1000);
  }
}

// Acte 2 — Séquence 6 : Montrer les documents d'un dossier
async function seq_montrerDocuments() {
  // Cherche onglet Documents dans un dossier ouvert
  const ok = await naviguerVers(['Documents', 'Documenten', 'Pièces']);
  if (!ok) {
    // Sinon va sur un dossier d'abord
    await seq_montrerDossierExistant();
    await attendre(800);
    await naviguerVers(['Documents', 'Documenten']);
  }
}

// Acte 2 — Séquence 7 : Montrer la rédaction
async function seq_montrerRedaction() {
  const ok = await naviguerVers(['Rédaction', 'Acte', 'Compromis', 'Akte', 'Ontwerp']);
  if (!ok) {
    await seq_montrerDossierExistant();
    await attendre(800);
    await naviguerVers(['Rédaction', 'Acte', 'Compromis']);
  }
}

// Acte 2 — Séquence 8 : Montrer le chatbot
async function seq_montrerChatbot() {
  await naviguerVers(['Chat', 'Message', 'Bericht', 'Chatbot']);
}

// ── Mapping label → séquence ──────────────────────────────
const DOM_ACTIONS = {
  'Dossier':       seq_montrerCreation,
  'Parties':       seq_montrerPersonnes,
  'Partijen':      seq_montrerPersonnes,
  'Documents':     seq_montrerDocuments,
  'Documenten':    seq_montrerDocuments,
  'Rédaction':     seq_montrerRedaction,
  'Redactie':      seq_montrerRedaction,
  'Chatbot':       seq_montrerChatbot,
  'Dossier aanmaken': seq_montrerCreation,
};

async function executerActionDOM(label) {
  const action = DOM_ACTIONS[label];
  if (action) {
    await attendre(600);
    await action();
  }
}

// ── Changer écran avec curseur ────────────────────────────
// Appelé depuis alfred-brain.js
async function changerEcranAvecCurseur(categorie) {
  const mapping = {
    dashboard:  ['HOME', 'Accueil', 'Tableau'],
    parties:    ['PERSONNES', 'Personnes', 'Partijen'],
    documents:  ['Documents', 'Documenten'],
    redaction:  ['Rédaction', 'Acte', 'Akte'],
    chatbot:    ['Chat', 'Message'],
    dossiers:   ['DOSSIERS', 'Dossiers'],
  };

  const textes = mapping[categorie];
  if (textes) await naviguerVers(textes);
}

// ── Init ──────────────────────────────────────────────────
creerCurseur();
console.log('[Alfred DOM] Prêt — curseur créé');