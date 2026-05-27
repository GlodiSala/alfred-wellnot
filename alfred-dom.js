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

// ── Nav principale ────────────────────────────────────────
function trouverNav(textes) {
  const navLinks = Array.from(document.querySelectorAll('a.nav-link'));
  for (const texte of textes) {
    const found = navLinks.find(el =>
      el.textContent.trim().toLowerCase() === texte.toLowerCase() &&
      el.getBoundingClientRect().width > 0
    );
    if (found) return found;
  }
  return null;
}

async function naviguerVers(textes) {
  const el = trouverNav(textes);
  if (!el) {
    console.warn('[Alfred DOM] Nav non trouvée:', textes);
    return false;
  }
  return new Promise(resolve => {
    curseurVers(el, () => { el.click(); resolve(true); });
  });
}

// ── Boutons et onglets ────────────────────────────────────
function trouverBouton(textes) {
  const tous = Array.from(document.querySelectorAll('button, p-tab'))
    .filter(el => el.getBoundingClientRect().width > 0);
  for (const texte of textes) {
    const found = tous.find(el => el.textContent.trim() === texte);
    if (found) return found;
  }
  return null;
}

async function cliquerBouton(textes) {
  const el = trouverBouton(textes);
  if (!el) {
    console.warn('[Alfred DOM] Bouton non trouvé:', textes);
    return false;
  }
  return new Promise(resolve => {
    curseurVers(el, () => { el.click(); resolve(true); });
  });
}

// ── Premier dossier existant ──────────────────────────────
function trouverPremierDossier() {
  return Array.from(document.querySelectorAll('tr'))
    .find(el =>
      el.getBoundingClientRect().width > 0 &&
      el.textContent.trim().length > 10 &&
      !el.textContent.includes('Catégorie')
    );
}

async function ouvrirPremierDossier() {
  await naviguerVers(['Dossiers']);
  await attendre(1500);
  const ligne = trouverPremierDossier();
  if (ligne) {
    curseurVers(ligne, () => ligne.click());
    await attendre(1500);
  }
}

// ══════════════════════════════════════════════════════════
// SÉQUENCES — suivent exactement le script
// ══════════════════════════════════════════════════════════

// [Écran — dashboard Alfred]
// Alfred parle du tableau de bord
async function seq_dashboard() {
  await naviguerVers(['Dossiers']);
  await attendre(1200);
}

// [Clic sur "Créer un dossier" — formulaire étape 1]
// Alfred parle du formulaire
async function seq_creerDossier() {
  const btn = trouverBouton(['Créer un dossier']);
  if (btn) {
    curseurVers(btn, () => btn.click());
    await attendre(1500);
  } else {
    // Si pas visible, aller d'abord sur Dossiers
    await naviguerVers(['Dossiers']);
    await attendre(1500);
    await cliquerBouton(['Créer un dossier']);
    await attendre(1500);
  }
}

// [Clic sur "Suivant" — étape 2 Personnes]
// Alfred parle du registre national
async function seq_etapePersonnes() {
  await cliquerBouton(['Suivant']);
  await attendre(1200);
}

// [Écran — les deux parties et le notaire affichés]
// Alfred parle de la matrice cadastrale → étape 3 Biens
async function seq_etapeBiens() {
  await cliquerBouton(['Suivant']);
  await attendre(1200);
}

// [Tout est déjà dans le dossier]
// → étape 4 Documents pour montrer le dossier complet
async function seq_etapeDocumentsFormulaire() {
  await cliquerBouton(['Suivant']);
  await attendre(1200);
}

// [Écran — liste des documents]
// Séquence 2 — ouvre dossier existant, onglet Documents
async function seq_ongletDocuments() {
  await ouvrirPremierDossier();
  await cliquerBouton(['Documents']);
  await attendre(1000);
}

// [Clic sur "Ajouter un acte" — interface rédaction]
// Séquence 3 — clique Rédiger dans le dossier
async function seq_redaction() {
  // Reste dans le même dossier, clique Rédiger
  const ok = await cliquerBouton(['Rédiger']);
  if (!ok) {
    // Si pas visible, ouvre un dossier d'abord
    await ouvrirPremierDossier();
    await cliquerBouton(['Rédiger']);
  }
  await attendre(1000);
}

// [Écran — interface avec chatbot ouvert]
// Séquence 4 — onglet Notifications
async function seq_chatbot() {
  const ok = await cliquerBouton(['Notifications']);
  if (!ok) {
    await ouvrirPremierDossier();
    await cliquerBouton(['Notifications']);
  }
  await attendre(1000);
}

// [Écran — onglet Événements avec mail envoyé]
// Reste sur Notifications
async function seq_evenements() {
  await cliquerBouton(['Notifications']);
  await attendre(1000);
}

// ── Mapping label → séquence ──────────────────────────────
const DOM_ACTIONS = {
  // Acte 2 — Séquence 1
  'Dashboard':  seq_dashboard,
  'Formulaire': seq_creerDossier,
  'Parties':    seq_etapePersonnes,
  'Notaires':   null,
  'Cadastre':   seq_etapeBiens,
  'Complet':    seq_etapeDocumentsFormulaire,

  // Acte 2 — Séquence 2
  'Documents':  seq_ongletDocuments,
  'Documenten': seq_ongletDocuments,
  'Analysé':    null,
  'Pendant':    null,

  // Acte 2 — Séquence 3
  'Rédaction2': seq_redaction,

  // Acte 2 — Séquence 4
  'Chatbot':    seq_chatbot,
  'Événements': seq_evenements,
  'Exactement': null,

  // Acte 3
  'Sécurité':   null,
  'Stand':      null,
  'Closing':    null,
};

async function executerActionDOM(label) {
  const action = DOM_ACTIONS[label];
  if (action) {
    await attendre(300);
    await action();
  }
}

async function changerEcranAvecCurseur(categorie) {
  const mapping = {
    dashboard: ['Home'],
    dossiers:  ['Dossiers'],
    parties:   ['Personnes'],
    notaires:  ['Notaires'],
    contacts:  ['Contacts'],
  };
  const textes = mapping[categorie];
  if (textes) await naviguerVers(textes);
}

creerCurseur();
console.log('[Alfred DOM] Prêt — curseur créé');