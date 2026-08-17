// === ALFRED DOM — Navigation + Curseur ===

// Facteur global de ralentissement des actions démo (curseur, frappe,
// pauses entre étapes). Un seul endroit à ajuster si le retour "trop
// rapide" revient — évite de devoir retoucher chaque délai un par un.
const ALFRED_RALENTI = 1.4;

// ── Sélecteurs de l'interface app.alfred.be ───────────────
// Textes de boutons/menus et identifiants de champs, centralisés ici plutôt
// qu'éparpillés dans chaque fonction. On ne contrôle pas cette interface
// (démo construite depuis l'extérieur, sans API — voir historique) : si
// l'équipe Wellnot change un libellé ou un id, TOUTE une séquence peut
// casser d'un coup. Avoir tout au même endroit rend le diagnostic et la
// correction beaucoup plus rapides — comparer avec une capture DOM fraîche
// (script de capture fourni séparément) pour repérer ce qui a changé.
const SELECTEURS = {
  boutons: {
    ajouter:             'Ajouter',
    ajouterManuellement: 'Ajouter manuellement',
    ajouterNotaire:      'Ajouter un notaire',
    creerDossier:        'Créer un dossier',
    enregistrer:         'Enregistrer',
    personnePhysique:    'Personne physique',
    personneMorale:      'Personne morale',
    rechercher:          'Rechercher',
    rediger:             'Rédiger un document',
    genererCompromis:    'Générer le compromis',
    suivant:             'Suivant',
    validerEtEnvoyer:    'Valider et envoyer',
    consulter:           'Consulter',
  },
  champs: {
    dossierCode:         'folder-code',
    rechercheRN:         'search-rn',
    rechercheBCE:        'search-company-number',
    communeCadastre:     'municipality',
    bienType:            'asset-type',
    bienParcelle:        'asset-parcel-number',
    bienSection:         'asset-section',
    bienDivision:        'asset-division',
    bienSurface:         'asset-surface',
    bienRevenuCadastral: 'asset-cadastral-income',
    bienRue:             'asset-street',
    bienNumero:          'asset-street-number',
    bienCommune:         'asset-municipality',
  },
  placeholders: {
    rechercheCommune: 'Rechercher une commune par son nom ou son code postal',
    rechercheNotaire: 'Rechercher dans votre liste de notaires',
  },
  menus: {
    qualitePartie:              'Sélectionnez une qualité',
    collaborateurEnCharge:      'Collaborateur en charge du dossier',
    collaborateurAdministratif: 'Collaborateur administratif',
    notaireEnCharge:            'Notaire en charge du dossier',
  },
  onglets: {
    evenements: 'Événements',
    parties:    'Parties',
  },
  textes: {
    represente: 'REPRÉSENTE',
    optionCompromis: 'Compromis',
    propositionEmail: "Proposition d'e-mail",
    lienDossiers: 'Dossiers',
  },
};

// ── Curseur teal ──────────────────────────────────────────
function creerCurseur() {
  if (document.getElementById('alfred-cursor')) return;
  const c = document.createElement('div');
  c.id = 'alfred-cursor';
  c.style.cssText = `
    position:fixed; width:16px; height:16px;
    background:#14b0bd; border-radius:50%;
    pointer-events:none; z-index:450; opacity:0;
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

  const dureeDeplacement = (0.8 * ALFRED_RALENTI).toFixed(2);
  setTimeout(() => {
    c.style.transition = `left ${dureeDeplacement}s cubic-bezier(.25,.46,.45,.94),
                          top  ${dureeDeplacement}s cubic-bezier(.25,.46,.45,.94),
                          opacity .2s ease`;
    c.style.left = x + 'px';
    c.style.top  = y + 'px';

    setTimeout(() => {
      c.style.transform = 'translate(-50%,-50%) scale(0.6)';
      setTimeout(() => {
        c.style.transform = 'translate(-50%,-50%) scale(1)';
        if (callback) callback();
        setTimeout(() => { c.style.opacity = '0'; }, 500 * ALFRED_RALENTI);
      }, 250 * ALFRED_RALENTI);
    }, 820 * ALFRED_RALENTI);
  }, 100 * ALFRED_RALENTI);
}

// Tous les délais explicites du script (pauses entre étapes, attentes de
// résultats réseau) passent par cette fonction — la multiplication par
// ALFRED_RALENTI les ralentit donc tous d'un coup.
function attendre(ms) { return new Promise(r => setTimeout(r, ms * ALFRED_RALENTI)); }

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
  // Laisse le dossier ouvert à l'écran assez longtemps pour être vu en
  // démo live avant d'enchaîner sur la réplique/action suivante (remonté
  // en test : 1500ms passait trop vite pour être visible).
  await attendre(2800);
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
  let dernierCandidat = null;
  for (let i = 0; i < tentatives; i++) {
    const candidat = trouverBoutonParTexte(texte);
    dernierCandidat = candidat;
    if (candidat && boutonEstActif(candidat)) { btn = candidat; break; }
    await attendre(delai);
  }
  if (!btn) {
    if (!dernierCandidat) {
      console.warn('[Alfred DOM] Bouton introuvable dans le DOM:', texte);
    } else {
      console.warn('[Alfred DOM] Bouton trouvé mais jamais actif:', texte, {
        disabled: dernierCandidat.disabled,
        ariaDisabled: dernierCandidat.getAttribute('aria-disabled'),
        classe: dernierCandidat.className,
      });
    }
    return false;
  }
  await curseurVersAsync(btn, () => btn.click());
  return true;
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

// Une option de menu correspond si son texte est exactement celui attendu,
// ou le contient, en ignorant la casse — confirmé en test live : l'appli
// affiche parfois les noms de famille tout en majuscules ("Alain
// CAPRASSE"), alors que la config utilise une casse normale ("Alain
// Caprasse") — une comparaison sensible à la casse ratait l'option
// pourtant visible à l'écran.
function optionCorrespond(li, texteOption) {
  const texte = li.textContent.trim().toLowerCase();
  const attendu = texteOption.toLowerCase();
  return texte === attendu || texte.includes(attendu);
}

// Sélectionne une option dans le menu déroulant situé juste sous un libellé
// donné. Utile quand le champ est vide et n'a donc aucun texte de
// déclencheur fiable pour être ciblé autrement.
async function choisirDansDropdownParLabelProche(labelTexte, texteOption, dejaReessaye) {
  let declencheur = null;
  for (let i = 0; i < 15; i++) {
    declencheur = trouverDeclencheurProcheLabel(labelTexte);
    if (declencheur) break;
    await attendre(300);
  }
  if (!declencheur) { console.warn('[Alfred DOM] Dropdown introuvable près du label:', labelTexte); return false; }
  console.log('[Alfred DOM] Déclencheur trouvé pour', labelTexte, '— rect:', declencheur.getBoundingClientRect(), 'texte actuel:', JSON.stringify(declencheur.textContent.trim()));
  await curseurVersAsync(declencheur, () => simulerClic(declencheur));
  // Pause volontairement un peu plus longue que zéro : laisse le menu
  // visible à l'écran un instant avant de sélectionner, pour que ce soit
  // lisible en démo live plutôt qu'une valeur qui semble s'écrire "toute
  // seule" (raccourcie de 800 à 500ms — trois menus à la suite rendaient
  // l'étape plus longue que la réplique parlée).
  await attendre(500);
  for (let i = 0; i < 15; i++) {
    const opt = Array.from(document.querySelectorAll('li'))
      .find(li => optionCorrespond(li, texteOption) && li.getBoundingClientRect().width > 0);
    if (opt) {
      await curseurVersAsync(opt, () => simulerClic(opt));
      await attendre(300);
      console.log('[Alfred DOM] Après sélection, texte du déclencheur:', JSON.stringify(declencheur.textContent.trim()));
      return true;
    }
    await attendre(200);
  }
  const liVisibles = Array.from(document.querySelectorAll('li')).filter(li => li.getBoundingClientRect().width > 0).map(li => li.textContent.trim());
  console.warn('[Alfred DOM] Option introuvable dans le menu:', texteOption, '— li visibles actuellement:', liVisibles);

  // Aucun <li> visible du tout (pas juste l'option manquante) : le menu ne
  // s'est probablement jamais ouvert — cas classique d'un clic enchaîné
  // trop vite après la fermeture d'un menu précédent, intercepté comme un
  // "clic à l'extérieur" plutôt que comme l'ouverture de celui-ci. Un
  // second essai, avec une pause avant de recliquer, résout ça en général.
  if (liVisibles.length === 0 && !dejaReessaye) {
    console.warn('[Alfred DOM] Menu probablement jamais ouvert — nouvel essai pour', labelTexte);
    await attendre(600);
    return choisirDansDropdownParLabelProche(labelTexte, texteOption, true);
  }
  return false;
}

// Ouvre un menu déroulant PrimeNG en cliquant sur le texte actuellement
// affiché (placeholder ou valeur sélectionnée), puis choisit une option
// dans la liste qui apparaît. Clique directement le <span> trouvé — pas un
// ancêtre via closest('div,button'), qui saute le composant <p-select>
// (pas une balise div/button) et attrape un conteneur bien trop large qui
// ne réagit pas au clic (même bug que pour les menus collaborateur).
async function choisirDansDropdown(texteDeclencheur, texteOption) {
  const declencheur = Array.from(document.querySelectorAll('span'))
    .find(s => s.textContent.trim() === texteDeclencheur && s.getBoundingClientRect().width > 0);
  if (!declencheur) { console.warn('[Alfred DOM] Menu déroulant introuvable:', texteDeclencheur); return false; }
  await curseurVersAsync(declencheur, () => simulerClic(declencheur));
  await attendre(800); // laisse le menu visible un instant, plus lisible en démo live
  for (let i = 0; i < 15; i++) {
    const opt = Array.from(document.querySelectorAll('li'))
      .find(li => optionCorrespond(li, texteOption) && li.getBoundingClientRect().width > 0);
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
  // Un vrai focus() (pas juste l'animation visuelle du curseur) est
  // nécessaire pour qu'Angular considère le champ comme « touché » et
  // valide correctement le formulaire (sinon "Suivant" peut rester
  // bloqué même une fois la valeur saisie).
  await curseurVersAsync(champ, () => champ.focus());
  await attendre(200);
  await taper(champ, String(texte));
  return true;
}

// Ajoute une partie (Vendeur/Acquéreur) via recherche par registre national.
// Suppose un RN réel et valide (recherche e-notariat en direct) : le
// formulaire se remplit alors automatiquement, il ne reste qu'à enregistrer.
async function ajouterPartieParRN(qualite, rn) {
  await choisirDansDropdown(SELECTEURS.menus.qualitePartie, qualite);
  await attendre(900);
  await cliquerBouton(SELECTEURS.boutons.ajouter);
  await attendre(1200);
  await cliquerBouton(SELECTEURS.boutons.personnePhysique);
  await attendre(1200);
  await taperDansChamp(SELECTEURS.champs.rechercheRN, rn);
  await cliquerBouton(SELECTEURS.boutons.rechercher);
  await attendre(3200); // laisse largement le temps à la recherche e-notariat de remplir le formulaire
  await cliquerBouton(SELECTEURS.boutons.enregistrer);
  await attendre(1800);
}

// Ajoute une partie (Vendeur/Acquéreur) via recherche par numéro BCE — pour
// une "Personne morale" (société). Même logique que ajouterPartieParRN, mais
// cible "Personne morale" puis le champ de recherche BCE.
async function ajouterPartieParBCE(qualite, bce) {
  await choisirDansDropdown(SELECTEURS.menus.qualitePartie, qualite);
  await attendre(900);
  await cliquerBouton(SELECTEURS.boutons.ajouter);
  await attendre(1200);
  await cliquerBouton(SELECTEURS.boutons.personneMorale);
  await attendre(1200);
  await taperDansChamp(SELECTEURS.champs.rechercheBCE, bce);
  await cliquerBouton(SELECTEURS.boutons.rechercher);
  await attendre(3200); // laisse largement le temps à la recherche BCE de remplir le formulaire
  await cliquerBouton(SELECTEURS.boutons.enregistrer);
  await attendre(1800);
}

// Coche la case sous "REPRÉSENTE" pour associer le notaire qu'on vient
// d'ajouter à la bonne partie (Vendeur/Acquéreur) — étape confirmée
// manquante par capture d'écran : après sélection du notaire, sa fiche
// affiche une liste de parties du dossier avec une case à cocher et un
// badge de qualité (Vendeur/Acquéreur) à côté de chaque nom. Ciblage par
// texte du badge, dans le même esprit que trouverDeclencheurProcheLabel.
async function cocherRepresentation(qualitePartie) {
  let titre = null;
  for (let i = 0; i < 10; i++) {
    titre = Array.from(document.querySelectorAll('*'))
      .find(el => el.children.length === 0 && el.textContent.trim() === SELECTEURS.textes.represente && el.getBoundingClientRect().width > 0);
    if (titre) break;
    await attendre(500);
  }
  if (!titre) { console.warn('[Alfred DOM] Section "REPRÉSENTE" introuvable'); return false; }
  titre.scrollIntoView({ block: 'center' });
  await attendre(500);

  const tr = titre.getBoundingClientRect();
  const badge = Array.from(document.querySelectorAll('*'))
    .filter(el => el.children.length === 0 && el.textContent.trim() === qualitePartie && el.getBoundingClientRect().width > 0)
    .filter(el => el.getBoundingClientRect().top >= tr.bottom - 5)
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
  if (!badge) { console.warn('[Alfred DOM] Badge de partie introuvable sous REPRÉSENTE:', qualitePartie); return false; }

  // Remonte de quelques ancêtres pour trouver la ligne complète (nom +
  // badge + case à cocher), plutôt que de dépendre d'une structure DOM
  // précise inconnue.
  let ligne = badge;
  let checkbox = null;
  for (let i = 0; i < 4 && ligne && !checkbox; i++) {
    ligne = ligne.parentElement;
    if (ligne) checkbox = ligne.querySelector('input[type="checkbox"]');
  }
  if (!checkbox) { console.warn('[Alfred DOM] Case à cocher introuvable pour:', qualitePartie); return false; }
  await curseurVersAsync(checkbox, () => simulerClic(checkbox));
  await attendre(600);
  return true;
}

// Rattache un notaire (recherche dans la liste de l'étude) via la modale
// "Rechercher dans votre liste de notaires", puis coche la case
// "REPRÉSENTE" pour l'associer à la bonne partie (qualitePartie: 'Vendeur'
// ou 'Acquéreur').
async function rattacherNotaire(nomNotaire, qualitePartie) {
  if (!nomNotaire) return false;
  if (!await cliquerBouton(SELECTEURS.boutons.ajouterNotaire)) return false;
  await attendre(900);
  let input = null;
  for (let i = 0; i < 15; i++) {
    input = document.querySelector(`input[placeholder="${SELECTEURS.placeholders.rechercheNotaire}"]`);
    if (input) break;
    await attendre(300);
  }
  if (!input) { console.warn('[Alfred DOM] Champ de recherche notaire introuvable'); return false; }

  // La recherche sur le nom complet ou sur le seul nom de famille (ex:
  // "Alain Caprasse" ou "Caprasse") ne retournait rien en test live —
  // chercher sur le seul prénom, avec plus de temps laissé au backend,
  // fonctionne mieux.
  const motsNom = nomNotaire.trim().split(/\s+/);
  const prenom = motsNom[0];
  const nomFamille = motsNom[motsNom.length - 1];
  const tentatives = [prenom, nomNotaire, nomFamille].filter((v, i, arr) => arr.indexOf(v) === i);

  let trouve = false;
  for (const terme of tentatives) {
    await curseurVersAsync(input, () => input.focus());
    await attendre(200);
    await taper(input, '');   // vide le champ avant une nouvelle tentative
    await taper(input, terme);
    await attendre(1800); // laisse largement le temps à la recherche backend de répondre

    let opt = null;
    for (let i = 0; i < 14; i++) {
      opt = Array.from(document.querySelectorAll('li'))
        .find(li => li.textContent.toLowerCase().includes(nomFamille.toLowerCase()) && li.getBoundingClientRect().width > 0);
      if (opt) break;
      await attendre(400);
    }
    if (opt) {
      await curseurVersAsync(opt, () => simulerClic(opt));
      await attendre(700);
      trouve = true;
      break;
    }
    console.warn('[Alfred DOM] Notaire introuvable avec le terme de recherche:', terme);
  }
  if (!trouve) { console.warn('[Alfred DOM] Échec du rattachement du notaire:', nomNotaire); return false; }

  // Certains flux affichent encore un bouton "Ajouter" pour confirmer la
  // fiche ; s'il n'existe pas ici, cliquerBouton échoue silencieusement
  // (averti en console) sans bloquer la suite.
  await cliquerBouton(SELECTEURS.boutons.ajouter, 6);
  await attendre(1200);

  if (qualitePartie) await cocherRepresentation(qualitePartie);
  return true;
}

// Lance la rédaction du compromis de vente à partir du dossier tout juste créé.
// Le bouton peut rester indisponible un long moment après la création du
// dossier (traitement backend des parties/bien) — on attend activement
// plutôt que d'abandonner après quelques secondes. Le libellé exact observé
// en live ("Rédiger un document" → option "Compromis") diffère de celui du
// script de Cyril ("Générer le compromis") — on essaie les deux.
async function lancerRedactionCompromis() {
  const viaMenu = await cliquerBoutonQuandActif(SELECTEURS.boutons.rediger, 60, 1000);
  if (!viaMenu) {
    // Repli sur le libellé du script de Cyril : ce bouton lance
    // vraisemblablement directement la génération, sans sous-menu.
    return await cliquerBoutonQuandActif(SELECTEURS.boutons.genererCompromis, 6, 1000);
  }
  await attendre(900);
  let opt = null;
  for (let i = 0; i < 15; i++) {
    opt = Array.from(document.querySelectorAll('li'))
      .find(li => li.textContent.trim() === SELECTEURS.textes.optionCompromis && li.getBoundingClientRect().width > 0);
    if (opt) break;
    await attendre(300);
  }
  if (!opt) { console.warn('[Alfred DOM] Option "Compromis" introuvable'); return false; }
  await curseurVersAsync(opt, () => simulerClic(opt));
  await attendre(2500); // chargement de l'éditeur, champs fusionnés depuis parties/bien
  return true;
}

// Ouvre l'onglet Événements, affiche la proposition d'e-mail générée
// automatiquement (pièces manquantes détectées après rédaction du
// compromis), et clique "Valider et envoyer" (A18/A19 du séquencier).
//
// Ce que cette fonction NE fait PAS, volontairement : attendre/simuler la
// réponse du vendeur (A20 « le vendeur dépose les documents » — le
// séquencier de Cyril dit "simuler la réception", mais on ignore par quel
// mécanisme côté app — bouton de debug ? second dossier déjà préparé avec
// les pièces ? à clarifier avec lui). Tant que ce n'est pas su, la
// séquence s'arrête après l'envoi du mail — la suite (A20-A22 : réception,
// analyse, questions au chat) reste à faire manuellement en démo.
async function montrerPropositionEmail() {
  const onglet = trouverOnglet(SELECTEURS.onglets.evenements);
  if (onglet) curseurVers(onglet, () => onglet.click());
  await attendre(1200);
  let li = null;
  for (let i = 0; i < 20; i++) {
    li = Array.from(document.querySelectorAll('li'))
      .find(el => el.textContent.includes(SELECTEURS.textes.propositionEmail));
    if (li) break;
    await attendre(1000);
  }
  if (!li) { console.warn("[Alfred DOM] Proposition d'e-mail non trouvée"); return false; }
  const consulter = Array.from(li.querySelectorAll('button')).find(b => b.textContent.trim() === SELECTEURS.boutons.consulter)
    || trouverBoutonParTexte(SELECTEURS.boutons.consulter);
  if (consulter) await curseurVersAsync(consulter, () => consulter.click());
  await attendre(1200);

  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.validerEtEnvoyer, 10, 500)) {
    console.warn('[Alfred DOM] Bouton "Valider et envoyer" introuvable ou inactif — mail non envoyé.');
    return false;
  }
  await attendre(1200);
  console.log('[Alfred DOM] Mail envoyé au vendeur. Suite (réception/analyse des pièces, questions au chat) non automatisée — voir commentaire de montrerPropositionEmail.');
  return true;
}

// Tente d'ajouter le bien via la recherche CADASTRE (par commune). Si la
// sélection ne remplit pas réellement les champs de parcelle (bug constaté
// en direct — la recherche trouve la commune mais ne pré-remplit rien),
// on considère la tentative en échec et on bascule sur la saisie manuelle.
// D'après un test live : le principe marche, mais il faut laisser le temps
// à la page de finir de charger avant de chercher, et à la recherche
// elle-même de répondre — d'où les pauses plus généreuses ci-dessous.
async function essayerAjouterBienParCadastre(bien) {
  if (!bien.commune) return false;

  // Laisse la page de l'étape "Biens" finir de se charger avant de
  // chercher le champ — sinon on peut cliquer/taper trop tôt.
  await attendre(1500);

  let input = null;
  for (let i = 0; i < 10; i++) {
    input = document.getElementById(SELECTEURS.champs.communeCadastre)
      || Array.from(document.querySelectorAll('input'))
        .find(i => i.placeholder === SELECTEURS.placeholders.rechercheCommune && i.getBoundingClientRect().width > 0);
    if (input) break;
    await attendre(400);
  }
  if (!input) { console.warn('[Alfred DOM] Champ de recherche commune (CADASTRE) introuvable'); return false; }

  await curseurVersAsync(input, () => input.focus());
  await attendre(200);
  await taper(input, bien.commune);
  await cliquerBouton(SELECTEURS.boutons.rechercher);
  await attendre(2600); // laisse largement le temps à la recherche de répondre

  // Comparaison stricte (===) trop fragile : le code postal et le nom de
  // commune configurés (ex: "8670 — Coxyde") ne s'affichent pas forcément
  // avec le même séparateur/ordre dans le résultat de recherche réel de
  // l'appli (ex: "8670 Koksijde", "Coxyde (8670)"...) — même famille de bug
  // que pour le notaire (voir optionCorrespond). On vérifie plutôt que le
  // code postal ET le nom de commune apparaissent tous les deux quelque
  // part dans le texte de l'option, sans exiger un format précis.
  const [codePostal, nomCommune] = bien.commune.split(/[—-]/).map(s => s && s.trim());
  let li = null;
  for (let i = 0; i < 10; i++) {
    li = Array.from(document.querySelectorAll('li'))
      .find(el => {
        if (el.getBoundingClientRect().width <= 0) return false;
        const texte = el.textContent.trim().toLowerCase();
        return (!codePostal || texte.includes(codePostal.toLowerCase()))
            && (!nomCommune  || texte.includes(nomCommune.toLowerCase()));
      });
    if (li) break;
    await attendre(400);
  }
  if (!li) {
    const liVisibles = Array.from(document.querySelectorAll('li')).filter(el => el.getBoundingClientRect().width > 0).map(el => el.textContent.trim());
    console.warn('[Alfred DOM] Commune introuvable dans les résultats CADASTRE:', bien.commune, '— li visibles actuellement:', liVisibles);
    return false;
  }

  await curseurVersAsync(li, () => simulerClic(li));
  await attendre(2200); // laisse le temps à une éventuelle auto-complétion de la parcelle

  const champParcelle = document.getElementById(SELECTEURS.champs.bienParcelle);
  if (!champParcelle || !champParcelle.value || !champParcelle.value.trim()) {
    console.warn('[Alfred DOM] Sélection CADASTRE effectuée mais parcelle non pré-remplie — bascule sur saisie manuelle.');
    return false;
  }
  await cliquerBoutonQuandActif(SELECTEURS.boutons.enregistrer);
  await attendre(1000);
  return true;
}

// Ajoute le bien : essaie d'abord la recherche CADASTRE (plus rapide et
// plus impressionnant en démo quand elle fonctionne), et si elle échoue,
// bascule automatiquement sur la saisie manuelle.
async function ajouterBien(bien) {
  if (await essayerAjouterBienParCadastre(bien)) return;
  await ajouterBienManuel(bien);
}

// Ajoute un bien manuellement (plus fiable en démo que la recherche CADASTRE).
async function ajouterBienManuel(bien) {
  await cliquerBouton(SELECTEURS.boutons.ajouterManuellement);
  await attendre(900);
  const typeSpan = document.getElementById(SELECTEURS.champs.bienType);
  if (typeSpan) {
    // Clique le span directement (même correctif que choisirDansDropdown —
    // closest('div,button') sauterait le <p-select> et attraperait un
    // conteneur trop large qui ne réagit pas au clic).
    await curseurVersAsync(typeSpan, () => simulerClic(typeSpan));
    await attendre(300);
    for (let i = 0; i < 15; i++) {
      const opt = Array.from(document.querySelectorAll('li'))
        .find(li => li.textContent.trim() === bien.type && li.getBoundingClientRect().width > 0);
      if (opt) { await curseurVersAsync(opt, () => simulerClic(opt)); await attendre(300); break; }
      await attendre(200);
    }
  }
  await taperDansChamp(SELECTEURS.champs.bienParcelle, bien.parcelle);
  await taperDansChamp(SELECTEURS.champs.bienSection, bien.section);
  await taperDansChamp(SELECTEURS.champs.bienDivision, bien.division);
  await taperDansChamp(SELECTEURS.champs.bienSurface, bien.surface);
  await taperDansChamp(SELECTEURS.champs.bienRevenuCadastral, bien.revenu_cadastral);
  await taperDansChamp(SELECTEURS.champs.bienRue, bien.rue);
  await taperDansChamp(SELECTEURS.champs.bienNumero, bien.numero);
  await taperDansChamp(SELECTEURS.champs.bienCommune, bien.commune);
  await attendre(500);
  await cliquerBouton(SELECTEURS.boutons.enregistrer);
  await attendre(1000);
}

// ── Répliques dédiées — Création live d'un dossier de démo ──
// Démonstration séparée de R426 (qui reste la référence "dossier déjà
// riche" pour le reste du script). Utilise ALFRED_CONFIG.DOSSIER_CREATION_DEMO,
// éditable depuis le panneau "Données démo". Décomposée en 6 étapes qui
// correspondent chacune à une réplique du script, sur le modèle du
// processus en 6 temps décrit par Cyril (ouverture → parties → bien →
// notaires → rédaction → e-mail généré).

// Étape 1 — ouvrir le formulaire de création et les informations générales.
// Découpée en deux sous-étapes (au lieu d'une seule) pour que chacune
// puisse être déclenchée par son propre segment de réplique dans
// alfred-brain.js : le clic sur "Créer un dossier" se fait pendant qu'Alfred
// en parle, pas pendant qu'il parle déjà du numéro de dossier.

// 1a. Ouvrir l'écran de création (clic "Dossiers" puis "Créer un dossier").
async function seq_creationDossier_ouvrir_ecran() {
  // Même sélecteur fiable que seq_ouvrirDossier, plutôt que
  // naviguerVers/trouverNav qui est trop large et peut cliquer sur le
  // mauvais élément.
  const navLinks = document.querySelectorAll('a.nav-link.uppercase');
  const dossiers = Array.from(navLinks).find(el => el.textContent.trim() === SELECTEURS.textes.lienDossiers);
  if (dossiers) {
    curseurVers(dossiers, () => dossiers.click());
  } else {
    console.warn('[Alfred DOM] Lien "Dossiers" introuvable');
  }
  await attendre(1800);
  await cliquerBouton(SELECTEURS.boutons.creerDossier);
  await attendre(2200);
}

// 1b. Remplir le numéro de dossier, les collaborateurs et le notaire, puis
// passer à l'étape suivante.
async function seq_creationDossier_ouvrir_champs() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) { console.warn('[Alfred DOM] Données de création démo non configurées'); return; }

  // Les trois champs sont remplis (le champ vide n'a pas de texte de
  // déclencheur fiable, on cible chaque menu par sa position sous son
  // libellé). "Collaborateur administratif" et "Notaire en charge du
  // dossier" n'étaient jusqu'ici pas remplis — le champ notaire existait
  // pourtant déjà dans la config (cfg.notaire) mais n'était jamais utilisé.
  // Le numéro de dossier doit être unique — l'appli refuse un doublon et
  // bloque "Suivant". Pour ne pas devoir y penser à chaque test, on ajoute
  // automatiquement l'heure du moment (HHMMSS) au code configuré : chaque
  // lancement génère donc un numéro différent, sans jamais retomber sur un
  // ancien dossier déjà créé.
  const horodatage = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  const codeUnique = `${cfg.code}-${horodatage}`;
  await taperDansChamp(SELECTEURS.champs.dossierCode, codeUnique);
  // Entrée + blur : certains champs Angular ne valident/rafraîchissent leur
  // état (dont l'activation de "Suivant") que sur ces événements, pas sur
  // la frappe seule.
  const champCode = document.getElementById(SELECTEURS.champs.dossierCode);
  if (champCode) validerChamp(champCode);
  await attendre(600);
  // Pauses raccourcies (900ms → 500ms) : avec trois menus déroulants à la
  // suite, l'ancien réglage faisait durer la sélection nettement plus
  // longtemps que la réplique parlée — remonté en test live (narration
  // terminée, sélection du notaire encore en cours).
  await choisirDansDropdownParLabelProche(SELECTEURS.menus.collaborateurEnCharge, cfg.collaborateur);
  await attendre(500);
  if (cfg.collaborateur_administratif) {
    await choisirDansDropdownParLabelProche(SELECTEURS.menus.collaborateurAdministratif, cfg.collaborateur_administratif);
    await attendre(500);
  }
  if (cfg.notaire) {
    await choisirDansDropdownParLabelProche(SELECTEURS.menus.notaireEnCharge, cfg.notaire);
    await attendre(500);
  }
  // "Suivant" reste désactivé tant que les champs requis ne sont pas valides —
  // on attend qu'il s'active plutôt que de cliquer trop tôt sur un bouton inactif.
  // On s'arrête ici si ça échoue : continuer sur le mauvais écran ne fait
  // que produire des erreurs en cascade pour les étapes suivantes.
  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.suivant)) {
    console.warn('[Alfred DOM] Étape "ouvrir" bloquée — arrêt de la séquence.');
    return;
  }
  await attendre(2200);
}

// Rétrocompatibilité — enchaîne les deux sous-étapes (utile pour un test
// manuel en console ; le script normal déclenche chaque sous-étape à part).
async function seq_creationDossier_ouvrir() {
  await seq_creationDossier_ouvrir_ecran();
  await seq_creationDossier_ouvrir_champs();
}

// Étape 2 — Parties : vendeur (morale via BCE, ou physique via RN) puis
// acquéreur (physique via RN).
async function seq_creationDossier_parties() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  if (cfg.vendeur_type === 'morale' && cfg.vendeur_bce) {
    await ajouterPartieParBCE('Vendeur', cfg.vendeur_bce);
  } else {
    await ajouterPartieParRN('Vendeur', cfg.vendeur_rn);
  }
  await ajouterPartieParRN('Acquéreur', cfg.acquereur_rn);
  // "Suivant" reste désactivé tant que le vendeur n'a pas été ajouté avec succès.
  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.suivant)) {
    console.warn('[Alfred DOM] Étape "parties" bloquée — arrêt de la séquence.');
    return;
  }
  await attendre(2200);
}

// Étape 3 — Bien, puis finalisation (Documents : rien à joindre en démo).
async function seq_creationDossier_bien() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  await ajouterBien(cfg.bien);
  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.suivant)) {
    console.warn('[Alfred DOM] Étape "bien" bloquée — arrêt de la séquence.');
    return;
  }
  await attendre(2200);
  await cliquerBoutonQuandActif(SELECTEURS.boutons.enregistrer);
  await attendre(2200);
}

// Étape 4 — Rattacher les notaires (vendeur et acquéreur) depuis l'onglet Parties.
async function seq_creationDossier_notaires() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  await naviguerOnglet(SELECTEURS.onglets.parties);
  await attendre(900);
  if (cfg.vendeur_notaire) await rattacherNotaire(cfg.vendeur_notaire, 'Vendeur');
  if (cfg.acquereur_notaire && cfg.acquereur_notaire !== cfg.vendeur_notaire) {
    await attendre(600);
    await rattacherNotaire(cfg.acquereur_notaire, 'Acquéreur');
  }
}

// Étape 5 — Lancer la rédaction du compromis.
async function seq_creationDossier_redaction() {
  await lancerRedactionCompromis();
}

// Étape 6 — Attendre/montrer l'e-mail généré automatiquement.
async function seq_creationDossier_email() {
  await montrerPropositionEmail();
}

// Séquence complète (rétrocompatibilité — enchaîne les 6 étapes).
async function seq_creerDossierDemo() {
  await seq_creationDossier_ouvrir();
  await seq_creationDossier_parties();
  await seq_creationDossier_bien();
  await seq_creationDossier_notaires();
  await seq_creationDossier_redaction();
  await seq_creationDossier_email();
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
  // Pas d'entrée 'CreationDossier' (chaîne complète) ici volontairement :
  // chaque étape de la création doit être déclenchée par sa propre réplique
  // (CreationOuvrir/Parties/Bien/Notaires/Redaction/Email), jamais toutes
  // d'un coup sur une seule réplique. seq_creerDossierDemo() reste
  // disponible dans le code pour du débogage/test manuel en console, mais
  // n'apparaît plus dans la liste d'actions sélectionnables du script.
  'CreationOuvrir':       seq_creationDossier_ouvrir,
  // Sous-étapes de CreationOuvrir, pour les répliques "groupées" (voir
  // alfred-brain.js) — un segment de texte plus court, calé sur son
  // propre bout d'action.
  'CreationOuvrir_Ecran':  seq_creationDossier_ouvrir_ecran,
  'CreationOuvrir_Champs': seq_creationDossier_ouvrir_champs,
  'CreationParties':   seq_creationDossier_parties,
  'CreationBien':      seq_creationDossier_bien,
  'CreationNotaires':  seq_creationDossier_notaires,
  'CreationRedaction': seq_creationDossier_redaction,
  'CreationEmail':     seq_creationDossier_email,
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