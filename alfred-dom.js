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

// ── Effet de frappe sur un input ──────────────────────────
async function taper(input, texte, delaiParLettre = 90) {
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await attendre(200);

  for (const lettre of texte) {
    input.value += lettre;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await attendre(delaiParLettre + Math.random() * 40);
  }
}

// ── Trouver un onglet par texte exact ─────────────────────
function trouverOnglet(texte) {
  return Array.from(document.querySelectorAll('a, button, [role="tab"]'))
    .find(el => el.textContent.trim() === texte && el.getBoundingClientRect().width > 0);
}

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

// ── Naviguer vers un onglet du dossier ────────────────────
async function naviguerOnglet(texte) {
  const el = trouverOnglet(texte);
  if (!el) {
    console.warn('[Alfred DOM] Onglet non trouvé:', texte);
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

// Réplique 11 — Dashboard + ouvrir dossier R426
async function seq_ouvrirDossier() {
  // 1. Cliquer sur DOSSIERS
  const navLinks = document.querySelectorAll('a.nav-link.uppercase');
  const dossiers = Array.from(navLinks).find(el => el.textContent.trim() === 'Dossiers');
  if (dossiers) {
    curseurVers(dossiers, () => dossiers.click());
  }
  await attendre(2000); // était 1500

  // 2. Attendre que l'input soit dans le DOM
  let input = null;
  for (let i = 0; i < 10; i++) {
    input = document.querySelector('input[placeholder="Rechercher"]');
    if (input) break;
    await attendre(300);
  }

  // 3. Effet de frappe sur R426
  if (input) {
    curseurVers(input, async () => {
      await attendre(400);
      await taper(input, 'R426');
    });
  }
  await attendre(3000); // était 2500

  // 4. Cliquer sur la ligne R426
  const lignes = Array.from(document.querySelectorAll('tr'))
    .filter(el => el.textContent.trim().length > 0);
  if (lignes[1]) {
    curseurVers(lignes[1], () => lignes[1].click());
  }
  await attendre(1500); // était 1200
}

// Réplique 13 — Onglet Parties
async function seq_montrerParties() {
  await naviguerOnglet('Parties');
  await attendre(800);
}

// Réplique 15 — Onglet Biens (matrice cadastrale)
async function seq_montrerBiens() {
  await naviguerOnglet('Biens');
  await attendre(800);
}

// Réplique 17 — Onglet Documents
async function seq_montrerDocuments() {
  await naviguerOnglet('Documents');
  await attendre(800);
}

// Réplique 20 — Onglet Compromis (rédaction)
async function seq_montrerCompromis() {
  await naviguerOnglet('Compromis');
  await attendre(800);
}

// Réplique 21/22 — Onglet Notifications (chatbot)
async function seq_montrerNotifications() {
  await naviguerOnglet('Notifications');
  await attendre(800);
}
// Réplique 22 — Cliquer sur une proposition d'e-mail
async function seq_montrerEvenements() {
  const notif = Array.from(document.querySelectorAll('li'))
    .find(el => el.textContent.includes("Proposition d'e-mail"));
  if (notif) {
    curseurVers(notif, () => notif.click());
  }
  await attendre(800);
}

// ── Mapping label → séquence ──────────────────────────────
const DOM_ACTIONS = {
  'Dashboard':   seq_ouvrirDossier,
  'Dossier':     seq_ouvrirDossier,
  'Parties':     seq_montrerParties,
  'Partijen':    seq_montrerParties,
  'Biens':       seq_montrerBiens,
  'Documents':   seq_montrerDocuments,
  'Documenten':  seq_montrerDocuments,
  'Rédaction':   seq_montrerCompromis,
  'Rédaction2':  seq_montrerCompromis,
  'Redactie':    seq_montrerCompromis,
  'Chatbot':     seq_montrerNotifications,
  'Événements':  seq_montrerNotifications,
  'Notifications': seq_montrerEvenements,
};

async function executerActionDOM(label) {
  const action = DOM_ACTIONS[label];
  if (action) {
    await attendre(600);
    await action();
  }
}

// ── Changer écran avec curseur (appelé depuis alfred-brain.js) ──
async function changerEcranAvecCurseur(categorie) {
  const mapping = {
    dashboard:  () => seq_ouvrirDossier(),
    dossiers:   () => seq_ouvrirDossier(),
    parties:    () => seq_montrerParties(),
    biens:      () => seq_montrerBiens(),
    documents:  () => seq_montrerDocuments(),
    redaction:  () => seq_montrerCompromis(),
    chatbot:    () => seq_montrerNotifications(),
  };
  const action = mapping[categorie];
  if (action) await action();
}

// ── Init ──────────────────────────────────────────────────
creerCurseur();
console.log('[Alfred DOM] Prêt — curseur créé');