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

// Comme curseurVers, mais attend réellement que l'animation du curseur soit
// terminée et que le callback (le clic) ait été exécuté avant de continuer.
// curseurVers seul ne fait que lancer l'animation (~730ms avant que le
// callback ne s'exécute) sans bloquer l'appelant — du code qui enchaîne un
// court attendre() après un curseurVers "à la volée" avance donc souvent
// avant que le clic n'ait réellement eu lieu.
function curseurVersAsync(el, callback) {
  return new Promise(resolve => {
    curseurVers(el, () => { if (callback) callback(); resolve(); });
  });
}

// Simule un clic complet (pointerdown/mousedown/pointerup/mouseup/click) au
// lieu du simple el.click(). Certains composants PrimeNG (menus déroulants
// notamment) écoutent spécifiquement mousedown pour s'ouvrir — un simple
// événement "click" synthétique ne suffit pas toujours à les déclencher.
function simulerClic(el) {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
  try { el.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch (e) {}
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  try { el.dispatchEvent(new PointerEvent('pointerup', opts)); } catch (e) {}
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}

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

// Simule l'appui sur Entrée puis un blur sur un champ — certains formulaires
// Angular ne valident/rafraîchissent leur état (ex: activer "Suivant") que
// sur ces événements, pas sur "input" seul.
function validerChamp(input) {
  const opts = { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 };
  input.dispatchEvent(new KeyboardEvent('keydown', opts));
  input.dispatchEvent(new KeyboardEvent('keyup', opts));
  input.blur();
  input.dispatchEvent(new Event('change', { bubbles: true }));
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
  await attendre(2000);

  // 2. Attendre que l'input soit dans le DOM
  let input = null;
  for (let i = 0; i < 15; i++) {
    input = document.querySelector('input[placeholder="Rechercher"]');
    if (input) break;
    await attendre(300);
  }
  if (!input) { console.warn('[Alfred DOM] Input non trouvé'); return; }

  // 3. Curseur vers input puis frappe
  curseurVers(input, () => {});
  await attendre(800);
  await taper(input, 'R426');

  // 4. Attendre que la ligne R426 soit visible et cliquable
  let cible = null;
  for (let i = 0; i < 20; i++) {
    const lignes = Array.from(document.querySelectorAll('tr'))
      .filter(el => el.textContent.trim().length > 0);
    if (lignes[1] && lignes[1].textContent.includes('R426')) {
      cible = lignes[1];
      break;
    }
    await attendre(300);
  }

  if (cible) {
    curseurVers(cible, () => cible.click());
  } else {
    console.warn('[Alfred DOM] Ligne R426 non trouvée');
  }
  await attendre(1500);
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

// ── Helpers génériques pour la création de dossier ────────
// Cherche un bouton visible dont le texte correspond exactement.
function trouverBoutonParTexte(texte) {
  return Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.trim() === texte && b.getBoundingClientRect().width > 0);
}

// Clique un bouton par son texte, avec attente qu'il apparaisse.
async function cliquerBouton(texte, tentatives = 15) {
  let btn = null;
  for (let i = 0; i < tentatives; i++) {
    btn = trouverBoutonParTexte(texte);
    if (btn) break;
    await attendre(300);
  }
  if (!btn) { console.warn('[Alfred DOM] Bouton introuvable:', texte); return false; }
  return new Promise(resolve => curseurVers(btn, () => { btn.click(); resolve(true); }));
}

// Comme cliquerBouton, mais attend en plus que le bouton soit actif
// (non désactivé) avant de cliquer — utile pour "Suivant" dans un
// formulaire multi-étapes, désactivé tant que les champs requis ne sont
// pas remplis (ex : le vendeur pas encore ajouté).
function boutonEstActif(btn) {
  return !btn.disabled
    && btn.getAttribute('aria-disabled') !== 'true'
    && !btn.classList.contains('p-disabled');
}
async function cliquerBoutonQuandActif(texte, tentatives = 40, delai = 400) {
  let btn = null;
  for (let i = 0; i < tentatives; i++) {
    const candidat = trouverBoutonParTexte(texte);
    if (candidat && boutonEstActif(candidat)) { btn = candidat; break; }
    await attendre(delai);
  }
  if (!btn) { console.warn('[Alfred DOM] Bouton actif introuvable (toujours désactivé ?):', texte); return false; }
  return new Promise(resolve => curseurVers(btn, () => { btn.click(); resolve(true); }));
}

// Trouve tous les déclencheurs de menu déroulant PrimeNG visibles sur
// l'écran actuel, dans l'ordre du DOM (qui correspond à l'ordre visuel).
// Uniquement [role="combobox"] : c'est le <span> interne réellement
// cliquable, pas le <p-select>/<p-dropdown> englobant (qui matche aussi ces
// classes mais ne réagit pas au clic de la même façon — confirmé par un
// diagnostic en direct où cliquer le conteneur n'ouvrait rien).
function trouverDeclencheursDropdown() {
  return Array.from(document.querySelectorAll('[role="combobox"]'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
}

// Trouve le déclencheur de dropdown le plus proche, juste en dessous, d'un
// libellé de champ affiché à l'écran (ex: "Collaborateur en charge du
// dossier"). Plus fiable que se fier à l'ordre des menus dans le DOM, qui
// dépend de champs déjà pré-remplis (Langue, Catégorie) et peut varier.
function trouverDeclencheurProcheLabel(labelTexte) {
  const label = Array.from(document.querySelectorAll('*'))
    .find(el => el.children.length === 0 && el.textContent.trim() === labelTexte && el.getBoundingClientRect().width > 0);
  if (!label) return null;
  const lr = label.getBoundingClientRect();
  let meilleur = null;
  let meilleureDistance = Infinity;
  for (const c of trouverDeclencheursDropdown()) {
    const r = c.getBoundingClientRect();
    if (r.top < lr.bottom - 5) continue; // le menu est censé être sous le libellé
    const distance = (r.top - lr.bottom) + Math.abs(r.left - lr.left);
    if (distance < meilleureDistance) { meilleureDistance = distance; meilleur = c; }
  }
  return meilleur;
}

// Sélectionne une option dans le menu déroulant situé juste sous un libellé
// donné. Utile quand le champ est vide et n'a donc aucun texte de
// déclencheur fiable pour être ciblé autrement.
async function choisirDansDropdownParLabelProche(labelTexte, texteOption) {
  let declencheur = null;
  for (let i = 0; i < 15; i++) {
    declencheur = trouverDeclencheurProcheLabel(labelTexte);
    if (declencheur) break;
    await attendre(300);
  }
  if (!declencheur) { console.warn('[Alfred DOM] Dropdown introuvable près du label:', labelTexte); return false; }
  await curseurVersAsync(declencheur, () => simulerClic(declencheur));
  await attendre(300);
  for (let i = 0; i < 15; i++) {
    const opt = Array.from(document.querySelectorAll('li'))
      .find(li => li.textContent.trim() === texteOption && li.getBoundingClientRect().width > 0);
    if (opt) {
      await curseurVersAsync(opt, () => simulerClic(opt));
      await attendre(300);
      return true;
    }
    await attendre(200);
  }
  console.warn('[Alfred DOM] Option introuvable dans le menu:', texteOption);
  return false;
}

// Ouvre un menu déroulant PrimeNG en cliquant sur le texte actuellement
// affiché (placeholder ou valeur sélectionnée), puis choisit une option
// dans la liste qui apparaît. Sélecteurs approximatifs (texte visible) —
// à ajuster si la structure réelle du site diffère.
async function choisirDansDropdown(texteDeclencheur, texteOption) {
  const span = Array.from(document.querySelectorAll('span'))
    .find(s => s.textContent.trim() === texteDeclencheur && s.getBoundingClientRect().width > 0);
  const declencheur = span ? (span.closest('div,button') || span) : null;
  if (!declencheur) { console.warn('[Alfred DOM] Menu déroulant introuvable:', texteDeclencheur); return false; }
  await curseurVersAsync(declencheur, () => simulerClic(declencheur));
  await attendre(300);
  for (let i = 0; i < 15; i++) {
    const opt = Array.from(document.querySelectorAll('li'))
      .find(li => li.textContent.trim() === texteOption && li.getBoundingClientRect().width > 0);
    if (opt) {
      await curseurVersAsync(opt, () => simulerClic(opt));
      await attendre(300);
      return true;
    }
    await attendre(200);
  }
  console.warn('[Alfred DOM] Option introuvable dans le menu:', texteOption);
  return false;
}

// Tape dans un champ identifié par son id, avec attente qu'il apparaisse.
async function taperDansChamp(id, texte, tentatives = 15) {
  let champ = null;
  for (let i = 0; i < tentatives; i++) {
    champ = document.getElementById(id);
    if (champ) break;
    await attendre(300);
  }
  if (!champ) { console.warn('[Alfred DOM] Champ introuvable:', id); return false; }
  curseurVers(champ, () => {});
  await attendre(300);
  await taper(champ, String(texte));
  return true;
}

// Ajoute une partie (Vendeur/Acquéreur) via recherche par registre national.
// Suppose un RN réel et valide (recherche e-notariat en direct) : le
// formulaire se remplit alors automatiquement, il ne reste qu'à enregistrer.
async function ajouterPartieParRN(qualite, rn) {
  await choisirDansDropdown('Sélectionnez une qualité', qualite);
  await attendre(400);
  await cliquerBouton('Ajouter');
  await attendre(600);
  await cliquerBouton('Personne physique');
  await attendre(600);
  await taperDansChamp('search-rn', rn);
  await cliquerBouton('Rechercher');
  await attendre(2000); // laisse le temps à la recherche e-notariat de remplir le formulaire
  await cliquerBouton('Enregistrer');
  await attendre(1000);
}

// Ajoute un bien manuellement (plus fiable en démo que la recherche CADASTRE).
async function ajouterBienManuel(bien) {
  await cliquerBouton('Ajouter manuellement');
  await attendre(600);
  const typeSpan = document.getElementById('asset-type');
  if (typeSpan) {
    const declencheur = typeSpan.closest('div,button') || typeSpan;
    await curseurVersAsync(declencheur, () => simulerClic(declencheur));
    await attendre(300);
    for (let i = 0; i < 15; i++) {
      const opt = Array.from(document.querySelectorAll('li'))
        .find(li => li.textContent.trim() === bien.type && li.getBoundingClientRect().width > 0);
      if (opt) { await curseurVersAsync(opt, () => simulerClic(opt)); await attendre(300); break; }
      await attendre(200);
    }
  }
  await taperDansChamp('asset-parcel-number', bien.parcelle);
  await taperDansChamp('asset-section', bien.section);
  await taperDansChamp('asset-division', bien.division);
  await taperDansChamp('asset-surface', bien.surface);
  await taperDansChamp('asset-cadastral-income', bien.revenu_cadastral);
  await taperDansChamp('asset-street', bien.rue);
  await taperDansChamp('asset-street-number', bien.numero);
  await taperDansChamp('asset-municipality', bien.commune);
  await attendre(500);
  await cliquerBouton('Enregistrer');
  await attendre(1000);
}

// ── Réplique dédiée — Création live d'un dossier de démo ──
// Démonstration séparée de R426 (qui reste la référence "dossier déjà
// riche" pour le reste du script). Utilise ALFRED_CONFIG.DOSSIER_CREATION_DEMO,
// éditable depuis le panneau "Données démo".
async function seq_creerDossierDemo() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) { console.warn('[Alfred DOM] Données de création démo non configurées'); return; }

  // Étape 0 — ouvrir le formulaire de création (même sélecteur fiable que
  // seq_ouvrirDossier, plutôt que naviguerVers/trouverNav qui est trop
  // large et peut cliquer sur le mauvais élément).
  const navLinks = document.querySelectorAll('a.nav-link.uppercase');
  const dossiers = Array.from(navLinks).find(el => el.textContent.trim() === 'Dossiers');
  if (dossiers) {
    curseurVers(dossiers, () => dossiers.click());
  } else {
    console.warn('[Alfred DOM] Lien "Dossiers" introuvable');
  }
  await attendre(1200);
  await cliquerBouton('Créer un dossier');
  await attendre(1500);

  // Étape 1 — Informations générales
  // Seul "Collaborateur en charge du dossier" est rempli (le champ vide n'a
  // pas de texte de déclencheur fiable, on le cible par sa position sous le
  // libellé). "Collaborateur administratif" et "Notaire en charge du
  // dossier" restent vides — pas nécessaires pour activer "Suivant".
  await taperDansChamp('folder-code', cfg.code);
  // Entrée + blur : certains champs Angular ne valident/rafraîchissent leur
  // état (dont l'activation de "Suivant") que sur ces événements, pas sur
  // la frappe seule.
  const champCode = document.getElementById('folder-code');
  if (champCode) validerChamp(champCode);
  await attendre(500);
  await choisirDansDropdownParLabelProche('Collaborateur en charge du dossier', cfg.collaborateur);
  await attendre(600);
  // "Suivant" reste désactivé tant que les champs requis ne sont pas valides —
  // on attend qu'il s'active plutôt que de cliquer trop tôt sur un bouton inactif.
  await cliquerBoutonQuandActif('Suivant');
  await attendre(1500);

  // Étape 2 — Personnes (vendeur puis acquéreur). "Suivant" reste désactivé
  // tant que le vendeur n'a pas été ajouté avec succès.
  await ajouterPartieParRN('Vendeur', cfg.vendeur_rn);
  await ajouterPartieParRN('Acquéreur', cfg.acquereur_rn);
  await cliquerBoutonQuandActif('Suivant');
  await attendre(1500);

  // Étape 3 — Biens
  await ajouterBienManuel(cfg.bien);
  await cliquerBoutonQuandActif('Suivant');
  await attendre(1500);

  // Étape 4 — Documents : on termine directement (aucun document à joindre en démo)
  await cliquerBoutonQuandActif('Enregistrer');
  await attendre(1500);
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
  'Événements':  seq_montrerEvenements,
  'Notifications': seq_montrerEvenements,
  'CreationDossier': seq_creerDossierDemo,
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