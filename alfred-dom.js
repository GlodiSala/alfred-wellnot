// === ALFRED DOM — Navigation + Curseur ===

// Facteur global de ralentissement des actions démo (curseur, frappe,
// pauses entre étapes). Un seul endroit à ajuster si le retour "trop
// rapide" revient — évite de devoir retoucher chaque délai un par un.
// Remis à 1 (au lieu de 1.4) : remonté en test live comme le principal
// responsable de la lenteur perçue sur les sélections dans les listes —
// ce facteur multiplie aussi l'animation du curseur (voir curseurVers),
// pas seulement les pauses. Les délais qui attendent une vraie réponse
// réseau (recherche e-notariat/BCE/CADASTRE, chargement de l'éditeur...)
// ne sont volontairement pas raccourcis avec ce chiffre, seulement les
// pauses cosmétiques et l'animation.
const ALFRED_RALENTI = 1;

// Annulation des attentes longues (jusqu'à 3-8 min pour "Email à valider" /
// la réponse du vendeur) — sans ça, arrêter la lecture auto (Échap) ne
// stoppait que les PROCHAINES étapes : l'attente déjà en cours continuait
// de tourner jusqu'à son propre délai, bloquant "Réplique déjà en cours"
// pendant tout ce temps. Remonté en test live : "même quand j'annule le
// script je ne peux pas reprendre ici". Vérifiée dans les boucles
// d'attente les plus longues ; remise à zéro au début de chaque nouvelle
// réplique jouée (voir jouerSecoursInterne).
let annulationDemandee = false;
function demanderAnnulation() {
  annulationDemandee = true;
  // Diagnostic temporaire : le bug "Confirmer" annulé pendant le CADASTRE
  // (biens) est réapparu même après avoir supprimé notre propre envoi
  // d'Échap — la source réelle de cette annulation n'est donc pas encore
  // identifiée avec certitude. Cette trace dira précisément quel code
  // appelle demanderAnnulation() la prochaine fois que ça se produit.
  console.trace('[Alfred DOM] demanderAnnulation() appelée — voir la pile ci-dessus pour savoir depuis où.');
}
function reinitialiserAnnulation() { annulationDemandee = false; }

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
    ajouterBienCadastre: 'Ajouter un bien via le CADASTRE',
    ajouterNotaire:      'Ajouter un notaire',
    creerDossier:        'Créer un dossier',
    enregistrer:         'Enregistrer',
    personnePhysique:    'Personne physique',
    personneMorale:      'Personne morale',
    rechercher:          'Rechercher',
    confirmerBien:       'Confirmer',
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
    evenements:   'Événements',
    conversation: 'Conversation',
    parties:      'Parties',
  },
  textes: {
    represente: 'REPRÉSENTE',
    mesClients: 'Mes clients',
    optionCompromis: 'Compromis',
    // "Proposition d'e-mail" ne correspondait à rien dans le vrai DOM —
    // confirmé par capture d'écran, le vrai titre de la carte est "Email à
    // valider".
    propositionEmail: "Email à valider",
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

// Défile doucement jusqu'à un élément s'il n'est pas déjà visible dans la
// fenêtre — sans effet (donc sans pause) s'il l'est déjà. Utilisé avant de
// cliquer un bouton en bas d'un long formulaire (ex: "Enregistrer" pour un
// bien ou une partie), pour que les champs remplis juste avant restent
// visibles en démo live au lieu d'un clic "invisible" hors-écran.
// Trouve le vrai conteneur qui défile pour cet élément — peut être une div
// interne à hauteur fixe (overflow:auto/scroll), pas forcément la fenêtre.
// Deviner "toujours la fenêtre" cassait le défilement quand ce n'est pas
// le cas (ex: panneaux/listes internes à l'appli).
function trouverConteneurDefilant(el) {
  let p = el.parentElement;
  while (p) {
    const style = getComputedStyle(p);
    if (/(auto|scroll)/.test(style.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
    p = p.parentElement;
  }
  return null; // null = c'est la fenêtre elle-même qui défile
}

// Défilement animé "maison", avec une durée réglable — remplace
// scrollIntoView({behavior:'smooth'}) dont la vitesse native n'est pas
// réglable (pas de paramètre de durée), remonté plusieurs fois comme trop
// rapide en démo live.
async function defilerVersElement(el, dureeMs = 4500) {
  const r = el.getBoundingClientRect();
  const dejaVisible = r.top >= 0 && r.bottom <= window.innerHeight;
  if (dejaVisible) return;

  const conteneur = trouverConteneurDefilant(el);
  const rectRef = conteneur ? conteneur.getBoundingClientRect() : { top: 0, height: window.innerHeight };
  const decalage = r.top - rectRef.top - (rectRef.height / 2) + (r.height / 2);
  const depart = conteneur ? conteneur.scrollTop : window.scrollY;
  const cible  = depart + decalage;

  await new Promise(resolve => {
    const debut = performance.now();
    function etape(maintenant) {
      // Vérifié à chaque frame : sans ça, ce défilement (jusqu'à 4,5s) était
      // le plus long délai non-annulable de tout le script — Échap devait
      // attendre qu'il se termine avant que la moindre vérification
      // d'annulation ait lieu. Remonté en test live ("Échap n'annule pas
      // tout de suite").
      if (annulationDemandee) { resolve(); return; }
      const t = Math.min((maintenant - debut) / dureeMs, 1);
      const t2 = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
      const y = depart + (cible - depart) * t2;
      if (conteneur) conteneur.scrollTop = y; else window.scrollTo(0, y);
      if (t < 1) requestAnimationFrame(etape); else resolve();
    }
    requestAnimationFrame(etape);
  });
  if (!annulationDemandee) await attendre(200);
}

// true une fois que le curseur a été positionné au moins une fois — sert à
// ne le faire "téléporter" au logo qu'à la toute première apparition (point
// de départ qui a du sens), pas à chaque clic. Avant : il repartait du logo
// à CHAQUE appel, donnant un mouvement décousu d'une action à l'autre au
// lieu d'un vrai déplacement continu — remonté en test live.
let curseurPositionneUneFois = false;

function curseurVers(el, callback) {
  const c = document.getElementById('alfred-cursor');
  if (!c || !el) { if (callback) callback(); return; }

  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width  / 2;
  const y = rect.top  + rect.height / 2;

  if (!curseurPositionneUneFois) {
    const alfred = document.getElementById('alfred-svg');
    if (alfred) {
      const ar = alfred.getBoundingClientRect();
      c.style.transition = 'none';
      c.style.left = (ar.left + ar.width  / 2) + 'px';
      c.style.top  = (ar.top  + ar.height / 2) + 'px';
    }
    curseurPositionneUneFois = true;
  }

  // Réactivée ici (pas seulement coupée juste au-dessus) pour que
  // l'apparition profite bien du fondu ".2s ease" prévu à la création du
  // curseur (creerCurseur) : en passant opacity à 1 pendant que la
  // transition était encore à 'none', le fondu ne s'appliquait jamais — le
  // curseur apparaissait d'un coup sec plutôt qu'en fondu, quel que soit le
  // délai après.
  c.style.transition = 'opacity .2s ease';
  c.style.opacity = '1';

  const dureeDeplacement = (0.5 * ALFRED_RALENTI).toFixed(2);
  setTimeout(() => {
    c.style.transition = `left ${dureeDeplacement}s cubic-bezier(.25,.46,.45,.94),
                          top  ${dureeDeplacement}s cubic-bezier(.25,.46,.45,.94),
                          opacity .2s ease`;
    c.style.left = x + 'px';
    c.style.top  = y + 'px';

    // Ce délai doit rester proche de dureeDeplacement (converti en ms, +
    // une petite marge) pour attendre que le déplacement CSS soit bien
    // fini avant de "cliquer" — sinon le curseur cliquerait encore en
    // plein trajet. Rapproché de 820 à 520ms en même temps que la
    // transition (0.8s → 0.5s) : c'était l'un des principaux facteurs de
    // lenteur perçue sur les sélections (chaque clic simulé passe par là).
    setTimeout(() => {
      c.style.transform = 'translate(-50%,-50%) scale(0.6)';
      setTimeout(() => {
        c.style.transform = 'translate(-50%,-50%) scale(1)';
        if (callback) callback();
        setTimeout(() => { c.style.opacity = '0'; }, 300 * ALFRED_RALENTI);
      }, 150 * ALFRED_RALENTI);
    }, 520 * ALFRED_RALENTI);
  }, 60 * ALFRED_RALENTI);
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

// ── Trouver un onglet par texte ─────────────────────
// Comparaison stricte (===) trop fragile — même famille de bug que
// REPRÉSENTE/Compromis (icône ou espace en plus dans l'élément réel,
// confirmé par capture DOM : <p-tab role="tab"> personnalisé). Passé en
// .includes() insensible à la casse.
function trouverOnglet(texte) {
  return Array.from(document.querySelectorAll('a, button, [role="tab"]'))
    .find(el => el.textContent.trim().toLowerCase().includes(texte.toLowerCase()) && el.getBoundingClientRect().width > 0);
}

// Le panneau Alfred (Conversation / Événements) n'existe dans le DOM que
// s'il a déjà été ouvert via l'icône ronde en haut à droite de l'écran —
// sans ça, trouverOnglet('Événements') échoue en silence, l'appelant ne
// s'en rend même pas compte (if (onglet) ... sans branche else). Remonté
// en test live : "on doit cliquer sur son logo". PREMIÈRE VERSION : je
// devine la position de cette icône (coin haut-droit, petite, ronde) faute
// de sélecteur exact — à vérifier en live.
function trouverAvatarAlfred() {
  // Confirmé par capture DOM en direct : <button aria-label="Parler avec
  // Alfred">, pas une icône devinée au pif — cherché en premier avant les
  // anciens repris (gardés au cas où le libellé changerait).
  const bouton = Array.from(document.querySelectorAll('button[aria-label]'))
    .find(el => (el.getAttribute('aria-label') || '').toLowerCase().includes('parler avec alfred') && el.getBoundingClientRect().width > 0);
  if (bouton) return bouton;

  const candidats = Array.from(document.querySelectorAll('img, button, [role="button"], div, span'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.width < 70 && r.height < 70;
    });
  let trouve = candidats.find(el => {
    const attr = (el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
    return attr.includes('alfred');
  });
  if (trouve) return trouve;
  // Repli : plus petit élément situé dans le coin haut-droit de l'écran.
  return candidats
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.top < 100 && r.right > window.innerWidth - 120;
    })
    .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0] || null;
}

// Détection du badge rouge de notification essayée puis retirée (ne
// marchait pas en test live — le sélecteur deviné ne correspondait
// probablement pas au vrai badge). Retour à l'ouverture directe du
// panneau + poll à l'intérieur (voir montrerPropositionEmail), qui
// fonctionnait déjà.

// Ouvre le panneau Alfred si "Événements"/"Conversation" n'y est pas déjà
// visible — sans effet s'il est déjà ouvert.
async function ouvrirPanneauAlfred() {
  if (trouverOnglet(SELECTEURS.onglets.evenements)) return true;
  const avatar = trouverAvatarAlfred();
  if (!avatar) { console.warn('[Alfred DOM] Icône Alfred (pour ouvrir le panneau Événements) introuvable.'); return false; }
  await curseurVersAsync(avatar, () => simulerClic(avatar));
  await attendre(800);
  const ouvert = !!trouverOnglet(SELECTEURS.onglets.evenements);
  if (!ouvert) console.warn('[Alfred DOM] Panneau Alfred toujours pas ouvert après le clic sur l\'icône.');
  return ouvert;
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
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente du bouton annulée:', texte); return false; }
    btn = trouverBoutonParTexte(texte);
    if (btn) break;
    await attendre(300);
  }
  if (!btn) { console.warn('[Alfred DOM] Bouton introuvable:', texte); return false; }
  // Défile doucement jusqu'au bouton avant de cliquer — utile pour
  // "Enregistrer" en bas d'un long formulaire (bien, vendeur...), qui
  // était cliqué directement en JS sans jamais être visible à l'écran :
  // en démo live, on ne voyait ni les champs remplis juste avant, ni le
  // clic lui-même. Sans effet si le bouton est déjà visible.
  await defilerVersElement(btn);
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
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente du bouton annulée:', texte); return false; }
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
  await defilerVersElement(btn);
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
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente du dropdown annulée:', labelTexte); return false; }
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
  // seule" (encore raccourcie, 800 → 500 → 400ms).
  await attendre(400);
  for (let i = 0; i < 15; i++) {
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente de l\'option annulée:', texteOption); return false; }
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
  await attendre(400); // laisse le menu visible un instant, plus lisible en démo live (raccourci, 800 → 400)
  for (let i = 0; i < 15; i++) {
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente de l\'option annulée:', texteOption); return false; }
    const opt = Array.from(document.querySelectorAll('li'))
      .find(li => optionCorrespond(li, texteOption) && li.getBoundingClientRect().width > 0);
    if (opt) {
      await curseurVersAsync(opt, () => simulerClic(opt));
      await attendre(200);
      return true;
    }
    await attendre(200);
  }
  console.warn('[Alfred DOM] Option introuvable dans le menu:', texteOption);
  return false;
}

// Tape dans un champ identifié par son id, avec attente qu'il apparaisse.
async function taperDansChamp(id, texte, tentatives = 15, delaiParLettre) {
  let champ = null;
  for (let i = 0; i < tentatives; i++) {
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente du champ annulée:', id); return false; }
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
  await taper(champ, String(texte), delaiParLettre);
  return true;
}

// Ajoute une partie (Vendeur/Acquéreur) via recherche par registre national.
// Suppose un RN réel et valide (recherche e-notariat en direct) : le
// formulaire se remplit alors automatiquement, il ne reste qu'à enregistrer.
// Vérifie qu'un badge de qualité (ex: "Acquéreur") est bien visible quelque
// part sur l'écran après un ajout de partie — sans ça, un échec silencieux
// de la recherche RN/BCE (ex: RN sans résultat, timing réseau) passait
// inaperçu : la séquence continuait, "Suivant" restait cliquable (il ne
// bloque que sur le vendeur manquant, pas l'acquéreur), et l'échec ne se
// découvrait qu'à l'étape des notaires, plusieurs minutes plus tard — vu en
// test live (acquéreur jamais ajouté, section REPRÉSENTE sans case
// "Acquéreur" à cocher pour son notaire).
function compterOccurrencesTexte(texte) {
  return Array.from(document.querySelectorAll('*'))
    .filter(el => el.children.length === 0 && el.textContent.trim() === texte && el.getBoundingClientRect().width > 0)
    .length;
}

// Bug trouvé en test live : au début de ajouterPartieParRN/BCE, on
// sélectionne "Vendeur"/"Acquéreur" dans le menu QUALITÉ de la nouvelle
// partie — ce qui fait déjà apparaître ce texte à l'écran (l'étiquette du
// menu déroulant choisi) AVANT même que la partie ne soit réellement
// enregistrée. L'ancienne vérification (chercher juste une occurrence du
// texte) était donc positive quasi instantanément à cause de cette
// étiquette, pas d'une vraie confirmation d'ajout — la suite (le bien)
// démarrait alors que l'acquéreur n'était pas encore vraiment enregistré.
// On compte maintenant les occurrences AVANT de commencer, et on exige
// qu'il y en ait STRICTEMENT PLUS après (la nouvelle ligne de la partie
// ajoutée, en plus de l'étiquette du menu).
async function partieAjouteeAvecSucces(qualite, occurrencesAvant) {
  for (let i = 0; i < 10; i++) {
    if (annulationDemandee) return false;
    if (compterOccurrencesTexte(qualite) > occurrencesAvant) return true;
    await attendre(500);
  }
  return false;
}

// Signal plus fiable qu'un délai deviné, demandé par l'utilisatrice : la
// fenêtre "Ajouter une partie" (comme celle du CADASTRE) est un vrai
// dialogue PrimeNG ([role="dialog"]) qui se referme tout seul une fois
// l'enregistrement terminé côté serveur — plutôt que deviner combien de
// temps ça prend, on attend simplement que ce dialogue disparaisse.
function trouverDialogueOuvert() {
  return Array.from(document.querySelectorAll('[role="dialog"]'))
    .find(el => el.getBoundingClientRect().width > 0);
}

async function attendreFermetureDialogue(dialogue, tentatives = 30, delai = 500) {
  if (!dialogue) return true;
  for (let i = 0; i < tentatives; i++) {
    if (annulationDemandee) return false;
    const encoreVisible = dialogue.isConnected && dialogue.getBoundingClientRect().width > 0;
    if (!encoreVisible) return true;
    await attendre(delai);
  }
  return false;
}

async function ajouterPartieParRN(qualite, rn) {
  // Compté AVANT tout changement : le menu QUALITÉ choisi juste après
  // (choisirDansDropdown) affiche déjà ce même texte à l'écran — sans
  // cette référence, la vérification de succès plus bas serait faussée
  // par cette étiquette de menu, pas par une vraie confirmation d'ajout.
  const occurrencesAvant = compterOccurrencesTexte(qualite);
  await choisirDansDropdown(SELECTEURS.menus.qualitePartie, qualite);
  await attendre(500);
  await cliquerBouton(SELECTEURS.boutons.ajouter);
  await attendre(700);
  await cliquerBouton(SELECTEURS.boutons.personnePhysique);
  await attendre(700);
  await taperDansChamp(SELECTEURS.champs.rechercheRN, rn);
  await cliquerBouton(SELECTEURS.boutons.rechercher);
  await attendre(3200); // laisse largement le temps à la recherche e-notariat de remplir le formulaire (attente réseau réelle, pas juste cosmétique — non raccourcie)
  // Plus gros délai fixe non-annulable de toute la séquence (3,2s) — vérifié
  // ici pour ne pas continuer sur "Enregistrer" après une annulation.
  if (annulationDemandee) return false;
  // Signal fiable plutôt qu'un délai deviné (demandé par l'utilisatrice,
  // le délai fixe précédent était trop variable) : on capture la fenêtre
  // "Ajouter une partie" avant de cliquer "Enregistrer", puis on attend
  // qu'elle se referme vraiment (jusqu'à 15s) — c'est ce que fait l'appli
  // elle-même une fois l'enregistrement terminé côté serveur.
  const dialogue = trouverDialogueOuvert();
  await cliquerBouton(SELECTEURS.boutons.enregistrer);
  if (!await attendreFermetureDialogue(dialogue, 30, 500)) {
    console.warn(`[Alfred DOM] La fenêtre d'ajout de "${qualite}" ne s'est pas refermée après 15s — l'enregistrement a peut-être échoué ou pris trop de temps.`);
  }
  await attendre(300);
  if (!await partieAjouteeAvecSucces(qualite, occurrencesAvant)) {
    console.warn(`[Alfred DOM] "${qualite}" ne semble pas avoir été ajouté (recherche RN sans résultat ou échec de l'enregistrement ?) — RN utilisé: ${rn}. Les étapes suivantes (notaire, REPRÉSENTE) vont probablement échouer en cascade.`);
    return false;
  }
  return true;
}

// Ajoute une partie (Vendeur/Acquéreur) via recherche par numéro BCE — pour
// une "Personne morale" (société). Même logique que ajouterPartieParRN, mais
// cible "Personne morale" puis le champ de recherche BCE.
async function ajouterPartieParBCE(qualite, bce) {
  const occurrencesAvant = compterOccurrencesTexte(qualite);
  await choisirDansDropdown(SELECTEURS.menus.qualitePartie, qualite);
  await attendre(500);
  await cliquerBouton(SELECTEURS.boutons.ajouter);
  await attendre(700);
  await cliquerBouton(SELECTEURS.boutons.personneMorale);
  await attendre(700);
  await taperDansChamp(SELECTEURS.champs.rechercheBCE, bce);
  await cliquerBouton(SELECTEURS.boutons.rechercher);
  await attendre(3200); // laisse largement le temps à la recherche BCE de remplir le formulaire (attente réseau réelle, pas juste cosmétique — non raccourcie)
  // Plus gros délai fixe non-annulable de toute la séquence (3,2s) — vérifié
  // ici pour ne pas continuer sur "Enregistrer" après une annulation.
  if (annulationDemandee) return false;
  const dialogue = trouverDialogueOuvert();
  await cliquerBouton(SELECTEURS.boutons.enregistrer);
  if (!await attendreFermetureDialogue(dialogue, 30, 500)) {
    console.warn(`[Alfred DOM] La fenêtre d'ajout de "${qualite}" ne s'est pas refermée après 15s — l'enregistrement a peut-être échoué ou pris trop de temps.`);
  }
  await attendre(300);
  if (!await partieAjouteeAvecSucces(qualite, occurrencesAvant)) {
    console.warn(`[Alfred DOM] "${qualite}" ne semble pas avoir été ajouté (recherche BCE sans résultat ou échec de l'enregistrement ?) — BCE utilisé: ${bce}. Les étapes suivantes (notaire, REPRÉSENTE) vont probablement échouer en cascade.`);
    return false;
  }
  return true;
}

// Coche la case sous "REPRÉSENTE" pour associer le notaire qu'on vient
// d'ajouter à la bonne partie (Vendeur/Acquéreur) — étape confirmée
// manquante par capture d'écran : après sélection du notaire, sa fiche
// affiche une liste de parties du dossier avec une case à cocher et un
// badge de qualité (Vendeur/Acquéreur) à côté de chaque nom. Ciblage par
// texte du badge, dans le même esprit que trouverDeclencheurProcheLabel.
// Coche une case sous un titre de section donné ("Représente" sur la fiche
// d'un notaire externe qu'on vient d'ajouter, ou "Mes clients" sur la
// fiche du notaire de votre étude, déjà présent sur le dossier) — même
// mécanique dans les deux cas, seul le titre de section change.
// Le badge de qualité n'est pas toujours le mot exact ("Acquéreur") : sous
// "Mes clients" il est suivi de "représenté(e) par votre étude" — d'où une
// comparaison "contient" plutôt qu'une égalité stricte.
async function cocherBadgeSousSection(titreSection, qualitePartie) {
  let titre = null;
  // Cause réelle trouvée en inspectant le DOM en direct : "REPRÉSENTE"
  // affiché en majuscules à l'écran n'est que du CSS (text-transform), le
  // vrai texte du DOM est "Représente" (casse normale) — la comparaison
  // stricte en majuscules ne matchait donc jamais, depuis le début (pas
  // un problème de timing, malgré le budget élargi ci-dessous).
  for (let i = 0; i < 16; i++) {
    titre = Array.from(document.querySelectorAll('*'))
      .find(el => el.children.length === 0 && el.textContent.trim().toLowerCase() === titreSection.toLowerCase() && el.getBoundingClientRect().width > 0);
    if (titre) break;
    await attendre(500);
  }
  if (!titre) { console.warn('[Alfred DOM] Section introuvable:', titreSection); return false; }
  titre.scrollIntoView({ block: 'center' });
  await attendre(300);

  const tr = titre.getBoundingClientRect();
  const badge = Array.from(document.querySelectorAll('*'))
    .filter(el => el.children.length === 0 && el.textContent.trim().toLowerCase().includes(qualitePartie.toLowerCase()) && el.getBoundingClientRect().width > 0)
    .filter(el => el.getBoundingClientRect().top >= tr.bottom - 5)
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
  if (!badge) { console.warn('[Alfred DOM] Badge de partie introuvable sous', titreSection, ':', qualitePartie); return false; }

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
  await attendre(300);

  // Remonté en test live : le clic simulé "ne fait rien" (case jamais
  // cochée à l'écran). Cas classique déjà vu ailleurs sur ce site (menus
  // PrimeNG) : le vrai gestionnaire de clic écoute sur un élément visuel
  // autour de l'input caché, pas sur l'input lui-même. On revérifie l'état
  // et on retente sur le parent si besoin.
  if (!checkbox.checked) {
    const wrapper = checkbox.closest('[role="checkbox"]') || checkbox.parentElement;
    if (wrapper && wrapper !== checkbox) {
      await curseurVersAsync(wrapper, () => simulerClic(wrapper));
      await attendre(300);
    }
  }
  if (!checkbox.checked) {
    console.warn('[Alfred DOM] La case à cocher ne semble toujours pas cochée après le clic pour:', qualitePartie, '— composant peut-être différent de ce qui était attendu.');
  }
  return true;
}

async function cocherRepresentation(qualitePartie) {
  return cocherBadgeSousSection(SELECTEURS.textes.represente, qualitePartie);
}

// "Mes clients" apparaît sur la fiche du notaire DE VOTRE ÉTUDE, déjà
// présent sur le dossier (pas besoin de le chercher/l'ajouter comme un
// notaire externe) — coche directement la partie qu'il représente.
async function cocherMesClients(qualitePartie) {
  return cocherBadgeSousSection(SELECTEURS.textes.mesClients, qualitePartie);
}

// Rattache un notaire (recherche dans la liste de l'étude) via la modale
// "Rechercher dans votre liste de notaires", puis coche la case
// "REPRÉSENTE" pour l'associer à la bonne partie (qualitePartie: 'Vendeur'
// ou 'Acquéreur').
async function rattacherNotaire(nomNotaire, qualitePartie) {
  if (!nomNotaire) return false;
  if (!await cliquerBouton(SELECTEURS.boutons.ajouterNotaire)) return false;
  await attendre(600);
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
  await attendre(1000); // légèrement remonté (800→1000) : la section "REPRÉSENTE" qui suit met parfois plus longtemps à apparaître

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
  await attendre(400);

  // Remonté en test live (capture d'écran) : le clic sur le <li> ne ferme
  // pas le menu, celui-ci reste ouvert. Même famille de bug que les cases
  // à cocher REPRÉSENTE : le vrai gestionnaire de clic écoute parfois un
  // élément interne (lien/texte), pas le <li> lui-même.
  if (opt.getBoundingClientRect().width > 0) {
    const cible = opt.querySelector('a, span') || opt;
    await curseurVersAsync(cible, () => simulerClic(cible));
    await attendre(400);
    if (opt.getBoundingClientRect().width > 0) {
      console.warn('[Alfred DOM] Le menu "Compromis" semble toujours ouvert après le clic — a-t-il vraiment fonctionné ?');
    }
  }
  // Vraie attente active plutôt qu'un délai fixe deviné (6s ne suffisait
  // pas toujours). Confirmé en test live : un nouvel onglet "Compromis"
  // apparaît (à côté de "Notifications") une fois la rédaction lancée —
  // c'est ce nouvel onglet qui sert de repère, pas un texte précis dans
  // la page.
  for (let i = 0; i < 60; i++) {
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente du chargement du compromis annulée.'); return false; }
    if (trouverOnglet(SELECTEURS.textes.optionCompromis)) { console.log('[Alfred DOM] Onglet "Compromis" apparu — rédaction chargée.'); return true; }
    await attendre(1000);
  }
  console.warn('[Alfred DOM] Onglet "Compromis" toujours pas apparu après 60s.');
  return false;
}

// Ouvre l'onglet Événements, affiche la proposition d'e-mail générée
// automatiquement (pièces manquantes détectées après rédaction du
// compromis), et clique "Valider et envoyer" (A18/A19 du séquencier).
//
// Ce que cette fonction NE fait PAS : attendre/simuler la réponse du
// vendeur (A20-A21) — confirmé avec l'utilisatrice, ça dépend d'une vraie
// réponse envoyée manuellement par Cyril depuis une boîte mail, hors de
// notre contrôle. Voir seq_creationDossier_attenteReponseVendeur (étape
// séparée, juste après celle-ci) pour l'attente + la suite.
// Trouve le bouton "Consulter" de LA carte d'événement dont le texte
// contient titreEvenement — remonté en test live par capture d'écran : ce
// ne sont PAS des <li> (comme l'ancien code le supposait, jamais vérifié),
// mais des cartes (probablement des <div>), et il peut y avoir plusieurs
// cartes avec chacune leur propre bouton "Consulter" en même temps (ex.
// "Demande d'Alfred" ET "Email à valider" simultanément) — d'où le besoin
// de remonter depuis CHAQUE bouton "Consulter" jusqu'à sa carte pour
// vérifier laquelle correspond au bon titre, plutôt que de prendre le
// premier bouton "Consulter" trouvé sur l'écran.
function trouverConsulterPourEvenement(titreEvenement) {
  const boutons = Array.from(document.querySelectorAll('button'))
    .filter(b => b.textContent.trim() === SELECTEURS.boutons.consulter && b.getBoundingClientRect().width > 0);
  for (const bouton of boutons) {
    let ancetre = bouton.parentElement;
    for (let i = 0; i < 8 && ancetre; i++) {
      if (ancetre.textContent.includes(titreEvenement)) return bouton;
      ancetre = ancetre.parentElement;
    }
  }
  return null;
}

// Découpé en deux (ouverture / consultation+envoi) pour être calé sur deux
// segments de réplique — demandé explicitement : avant, la réplique
// parlait une fois puis tout le reste (attente + clic Consulter + clic
// Valider et envoyer) se passait en silence total. La 2e phrase
// accompagne maintenant le moment où on consulte/valide, plutôt que rien.
async function montrerPropositionEmail_ouverture() {
  // Le badge rouge (attendreBadgeNotification) ne marchait pas en test
  // live — retour à l'ouverture directe du panneau, qui fonctionnait déjà
  // (le poll juste après suffit à attendre "Email à valider").
  await ouvrirPanneauAlfred();
  const onglet = trouverOnglet(SELECTEURS.onglets.evenements);
  if (onglet) curseurVers(onglet, () => onglet.click());
  await attendre(1200);
}

async function montrerPropositionEmail_envoyer() {
  let consulter = null;
  // Budget large (90s → 3 min) : la génération réelle du compromis côté
  // backend (juste avant, voir lancerRedactionCompromis) peut prendre du
  // temps avant que l'événement "Email à valider" n'apparaisse — remonté
  // par l'utilisatrice ("il faut du temps... Alfred fait une notif quand
  // il est prêt"). Ce n'est qu'un plafond de sécurité : dès que
  // l'événement apparaît, on continue immédiatement, pas besoin d'attendre
  // le plafond.
  for (let i = 0; i < 180; i++) {
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente "Email à valider" annulée.'); return false; }
    consulter = trouverConsulterPourEvenement(SELECTEURS.textes.propositionEmail);
    if (consulter) break;
    await attendre(1000);
  }
  if (!consulter) { console.warn("[Alfred DOM] \"Email à valider\" non trouvé après 3 min"); return false; }

  // Segment marqué parlerDepuisAction (voir alfred-brain.js) : le texte
  // n'est pas dit automatiquement au début de l'attente, c'est ICI qu'on
  // le déclenche — l'événement vient vraiment d'apparaître à l'écran.
  // Cherché dans la config plutôt que codé en dur, pour rester en phase
  // avec le FR/NL et un futur changement de texte sans toucher au JS.
  if (typeof speak === 'function' && typeof ALFRED_CONFIG !== 'undefined') {
    const liste = (typeof currentLangue !== 'undefined' && currentLangue === 'nl') ? ALFRED_CONFIG.REPLIQUES_NL : ALFRED_CONFIG.REPLIQUES_FR;
    const replique = liste?.find(r => r.label === 'CreationEmail');
    const segment = replique?.segments?.find(s => s.action === 'CreationEmail_Envoyer');
    if (segment?.texte) {
      if (typeof addToHistory === 'function') addToHistory('alfred', segment.texte);
      speak(typeof naturaliserTexte === 'function' ? naturaliserTexte(segment.texte) : segment.texte, currentLangue, segment.texte);
    }
  }

  // Capturé AVANT le clic : sert de point de référence pour reconnaître,
  // après l'envoi, un mail vraiment nouveau plutôt que le dernier trouvé par
  // hasard (qui pourrait être celui d'une répétition précédente — voir
  // attendreNouveauMailPuisRepondre dans alfred-config.js). Best-effort :
  // null si le mot de passe n'est pas encore stocké ou si l'appel échoue,
  // auquel cas l'attente sera simplement sautée plus loin.
  const baselineMailId = (typeof obtenirDernierMailIdAlfred === 'function')
    ? await obtenirDernierMailIdAlfred()
    : null;

  await curseurVersAsync(consulter, () => consulter.click());
  await attendre(1200);

  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.validerEtEnvoyer, 10, 500)) {
    console.warn('[Alfred DOM] Bouton "Valider et envoyer" introuvable ou inactif — mail non envoyé.');
    return false;
  }
  await attendre(1200);

  // Automatise la suite : attend qu'un mail réellement nouveau soit arrivé
  // (pas juste 1,2s fixes — la livraison Gmail n'est pas instantanée), puis
  // répond depuis la boîte du vendeur avec les 8 pièces (voir
  // attendreNouveauMailPuisRepondre / envoyerReponseVendeurAutomatique dans
  // alfred-config.js et api/vendeur-reply). Un échec ici (réseau, mot de
  // passe...) n'empêche pas la démo de continuer : il reste possible de
  // répondre à la main comme avant, seul l'avancement vers "Documents"/
  // Compromis reste manuel (voir commentaire de
  // seq_creationDossier_attenteReponseVendeur — détection auto déjà tentée
  // et abandonnée sur d'autres signaux, on garde l'avancement à la flèche).
  if (typeof attendreNouveauMailPuisRepondre === 'function') {
    const reponse = await attendreNouveauMailPuisRepondre(baselineMailId);
    if (reponse.ok) {
      console.log('[Alfred DOM] Réponse automatique du vendeur envoyée.', reponse.data);
    } else {
      console.warn('[Alfred DOM] Réponse automatique du vendeur non envoyée — à faire à la main si besoin.', reponse);
    }
  }

  console.log('[Alfred DOM] Mail envoyé au vendeur et réponse automatique tentée. Vérifier "Documents"/Compromis une fois le traitement terminé côté Alfred.');
  return true;
}

// Rétrocompatibilité — enchaîne les deux sous-étapes.
async function montrerPropositionEmail() {
  await montrerPropositionEmail_ouverture();
  return montrerPropositionEmail_envoyer();
}

// Tente d'ajouter le bien via la recherche CADASTRE (par commune). Si la
// sélection ne remplit pas réellement les champs de parcelle (bug constaté
// en direct — la recherche trouve la commune mais ne pré-remplit rien),
// on considère la tentative en échec et on bascule sur la saisie manuelle.
// D'après un test live : le principe marche, mais il faut laisser le temps
// à la page de finir de charger avant de chercher, et à la recherche
// elle-même de répondre — d'où les pauses plus généreuses ci-dessous.
// Ferme une fenêtre/panneau ouvert (le "×" en haut à droite) — utilisé
// quand la recherche CADASTRE échoue en cours de route : sans ça, le
// panneau "Ajouter un bien via le CADASTRE" restait ouvert par-dessus
// l'écran, et la bascule vers la saisie manuelle qui suit (qui cherche le
// bouton "Ajouter manuellement" resté caché derrière) échouait à son tour.
function fermerFenetreOuverte() {
  const candidats = Array.from(document.querySelectorAll('button, [role="button"], span, svg, a'))
    .filter(el => el.getBoundingClientRect().width > 0);
  const fermeture = candidats.find(el => {
    const txt = el.textContent.trim();
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    return txt === '×' || txt === '✕' || txt === 'X' || label.includes('fermer') || label.includes('close');
  });
  if (fermeture) { curseurVers(fermeture, () => simulerClic(fermeture)); return true; }
  console.warn('[Alfred DOM] Bouton de fermeture (×) introuvable — le panneau CADASTRE risque de rester ouvert.');
  return false;
}

async function essayerAjouterBienParCadastre(bien) {
  // Échouait ici en silence total (aucun log) si le champ "commune" était
  // vide dans les données démo (ex: après une synchro avec une version
  // plus ancienne qui ne l'avait pas encore) — impossible à diagnostiquer
  // depuis la console. Remonté en test live : "il va en manuel direct,
  // sans même essayer le cadastre".
  if (!bien.commune) {
    console.warn('[Alfred DOM] Pas de commune configurée pour le bien — recherche CADASTRE sautée, bascule directe sur la saisie manuelle. Vérifie le panneau "Données démo".');
    return false;
  }

  // Le champ de recherche commune n'existe pas tant qu'on n'a pas cliqué
  // sur "Ajouter un bien via le CADASTRE" — l'écran "Biens" affiche
  // d'abord un choix entre ce bouton et "Ajouter manuellement". Ce clic
  // manquait totalement : la fonction cherchait le champ directement,
  // sans jamais l'avoir fait apparaître — d'où le passage systématique en
  // manuel, confirmé en test live ("Champ de recherche commune introuvable").
  if (!await cliquerBouton(SELECTEURS.boutons.ajouterBienCadastre)) {
    console.warn('[Alfred DOM] Bouton "Ajouter un bien via le CADASTRE" introuvable — bascule sur la saisie manuelle.');
    return false;
  }

  // Laisse la page finir de se charger avant de chercher le champ —
  // sinon on peut cliquer/taper trop tôt.
  await attendre(1200);

  let input = null;
  for (let i = 0; i < 10; i++) {
    input = document.getElementById(SELECTEURS.champs.communeCadastre)
      || Array.from(document.querySelectorAll('input'))
        .find(i => i.placeholder === SELECTEURS.placeholders.rechercheCommune && i.getBoundingClientRect().width > 0);
    if (input) break;
    await attendre(400);
  }
  if (!input) {
    console.warn('[Alfred DOM] Champ de recherche commune (CADASTRE) introuvable');
    fermerFenetreOuverte();
    await attendre(500);
    return false;
  }

  // Le code postal et le nom de commune configurés (ex: "8670 — Coxyde")
  // arrivent avant la recherche des résultats — nécessaire aussi pour
  // taper la recherche elle-même : le champ de recherche réel de l'appli
  // ne comprend PAS le format complet "8670 — Coxyde" (renvoie "Aucun
  // résultat"), seulement le nom ("Coxyde") — confirmé en test live.
  const [, nomCommune] = bien.commune.split(/[—-]/).map(s => s && s.trim());

  await curseurVersAsync(input, () => input.focus());
  await attendre(200);
  await taper(input, nomCommune || bien.commune);

  // Un menu d'auto-complétion s'ouvre PENDANT la frappe (avant même de
  // cliquer "Rechercher") — il faut cliquer la bonne commune dedans pour
  // la sélectionner réellement, sinon "Rechercher" reste sans effet
  // (texte libre non reconnu). Remonté en test live : "avant il arrivait
  // à taper Coxyde et à sélectionner la bonne commune, maintenant il
  // écrit juste, sans sélectionner".
  let optionCommune = null;
  for (let i = 0; i < 10; i++) {
    optionCommune = Array.from(document.querySelectorAll('li'))
      .find(el => el.getBoundingClientRect().width > 0 && el.textContent.trim().toLowerCase().includes((nomCommune || bien.commune).toLowerCase()));
    if (optionCommune) break;
    await attendre(400);
  }
  if (optionCommune) {
    await curseurVersAsync(optionCommune, () => simulerClic(optionCommune));
    await attendre(600);
  } else {
    console.warn('[Alfred DOM] Aucune suggestion de commune trouvée en tapant — on tente "Rechercher" quand même.');
  }

  // cliquerBouton() ne fait que TROUVER puis cliquer — un clic qui n'a
  // aucun effet (bouton trouvé mais le vrai gestionnaire n'écoute pas cet
  // événement, même famille de bug que "Compromis" et les cases à cocher
  // REPRÉSENTE) n'était jamais détecté ni retenté. Remonté en test live :
  // "il n'appuie pas sur rechercher... ou considère que c'est vide".
  const rechercheTrouvee = await cliquerBouton(SELECTEURS.boutons.rechercher);
  if (!rechercheTrouvee) console.warn('[Alfred DOM] Bouton "Rechercher" (CADASTRE) introuvable.');
  await attendre(2600); // laisse largement le temps à la recherche de répondre

  // Réécrit d'après deux captures d'écran en direct : il n'y a PAS de
  // liste de communes à choisir séparément — taper la commune puis
  // cliquer "Rechercher" fait directement apparaître une section "Biens"
  // avec un menu "Sélectionner des biens" (cases à cocher), sous le champ
  // de recherche. Ancienne hypothèse (liste de communes, puis 2e liste
  // pour la parcelle) confirmée fausse pour cette version de l'appli.
  async function trouverDeclencheurBiens() {
    // Comparaison stricte trop fragile (même famille de bug rencontrée
    // partout ailleurs — REPRÉSENTE, Compromis...) : le déclencheur peut
    // contenir une icône ou un espace en plus du texte attendu. On
    // vérifie plutôt que le texte CONTIENT "sélectionner des biens",
    // insensible à la casse.
    //
    // Piège trouvé par capture DOM en direct : le texte "Sélectionner des
    // biens" apparaît sur DEUX éléments imbriqués — le <div
    // class="p-fieldset-content-container"> englobant (le fieldset/section
    // "Biens") ET le vrai <div class="p-multiselect-label"> à l'intérieur.
    // Les deux ont la même longueur de texte, donc trier par longueur ne
    // suffit pas à départager — ça attrapait le fieldset (aucun effet au
    // clic) au lieu du vrai multiselect. On cherche donc D'ABORD une classe
    // PrimeNG de multiselect précise, et seulement en dernier recours un
    // span/div générique.
    for (let i = 0; i < 15; i++) {
      const precis = Array.from(document.querySelectorAll('.p-multiselect-label, .p-multiselect'))
        .find(e => e.getBoundingClientRect().width > 0 && e.textContent.trim().toLowerCase().includes('sélectionner des biens'));
      if (precis) return precis;

      const candidats = Array.from(document.querySelectorAll('span, div'))
        .filter(e => e.getBoundingClientRect().width > 0 && e.textContent.trim().toLowerCase().includes('sélectionner des biens'));
      if (candidats.length) {
        return candidats.sort((a, b) => a.textContent.length - b.textContent.length)[0];
      }
      await attendre(400);
    }
    return null;
  }

  let declencheurBiens = await trouverDeclencheurBiens();
  if (!declencheurBiens) {
    // Peut-être le premier clic sur "Rechercher" n'a eu aucun effet — on
    // retente une fois avant d'abandonner, plutôt que de basculer
    // directement en manuel sur un simple clic raté (même famille de bug
    // que "Compromis"/les cases REPRÉSENTE — le clic simulé n'a parfois
    // aucun effet réel).
    console.warn('[Alfred DOM] Menu "Sélectionner des biens" introuvable — nouvel essai sur "Rechercher" avant d\'abandonner.');
    await cliquerBouton(SELECTEURS.boutons.rechercher);
    await attendre(2600);
    declencheurBiens = await trouverDeclencheurBiens();
  }
  if (!declencheurBiens) {
    console.warn('[Alfred DOM] Menu "Sélectionner des biens" introuvable après la recherche CADASTRE — bascule sur saisie manuelle (Fednot non connecté, ou rien trouvé pour cette commune ?).');
    fermerFenetreOuverte();
    await attendre(500);
    return false;
  }

  await curseurVersAsync(declencheurBiens, () => simulerClic(declencheurBiens));
  await attendre(700);

  // Confirmé par capture DOM en direct : "Sélectionner des biens" est un
  // <p-multiselect> PrimeNG, PAS une case à cocher. L'option se choisit en
  // cliquant directement sur le <span class="option-label"> du bien (ex.
  // "Lot privé (ancien) : 0006/00B000, Coxyde (8670)"). Toute la piste
  // "checkbox" précédente était une fausse hypothèse.
  async function chercherOptionBien() {
    for (let i = 0; i < 10; i++) {
      const options = Array.from(document.querySelectorAll('.option-label, .p-multiselect-option'))
        .filter(el => el.getBoundingClientRect().width > 0 && el.textContent.trim().length > 0);
      if (options.length) return options[0];
      await attendre(300);
    }
    return null;
  }

  let optionBien = await chercherOptionBien();
  if (!optionBien) {
    // Au cas où le clic sur le déclencheur du multiselect n'a pas ouvert
    // le panneau (même famille de bug que "Compromis"/REPRÉSENTE), on
    // retente le clic avant d'abandonner.
    console.warn('[Alfred DOM] Aucune option de bien trouvée — le clic sur "Sélectionner des biens" a peut-être échoué, nouvel essai.');
    const cible = await trouverDeclencheurBiens();
    if (cible) {
      await curseurVersAsync(cible, () => simulerClic(cible));
      await attendre(700);
      optionBien = await chercherOptionBien();
    }
  }
  if (!optionBien) {
    console.warn('[Alfred DOM] Aucun bien sélectionnable trouvé dans "Sélectionner des biens" — bascule sur saisie manuelle.');
    fermerFenetreOuverte();
    await attendre(500);
    return false;
  }
  await curseurVersAsync(optionBien, () => simulerClic(optionBien));
  await attendre(500);
  // Le panneau du multiselect peut rester ouvert par-dessus le bouton
  // "Confirmer". BUG TROUVÉ EN TEST LIVE : envoyer un vrai événement
  // clavier Échap déclenche AUSSI le raccourci global d'Alfred qui
  // annule l'action en cours (annulationDemandee) — "Confirmer" se
  // retrouvait annulé par Alfred lui-même ! On referme donc le panneau
  // en recliquant simplement sur son déclencheur (comportement toggle
  // standard d'un multiselect PrimeNG), sans passer par le clavier. Le
  // texte du déclencheur a changé (il affiche maintenant le bien choisi,
  // plus "Sélectionner des biens") — on le retrouve donc par sa classe,
  // pas par son texte.
  const declencheurFermeture = document.querySelector('.p-multiselect-label');
  if (declencheurFermeture) {
    await curseurVersAsync(declencheurFermeture, () => simulerClic(declencheurFermeture));
    await attendre(400);
  }

  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.confirmerBien, 10, 400)) {
    console.warn('[Alfred DOM] Bouton "Confirmer" (biens) introuvable ou inactif.');
    fermerFenetreOuverte();
    await attendre(500);
    return false;
  }
  // Confirmé par l'utilisatrice : pas besoin d'attendre ici, dès que
  // "Confirmer" est fait c'est bon — ce "Enregistrer" (juste après
  // "Confirmer" dans le dialogue CADASTRE) n'est PAS celui qui doit
  // vraiment attendre. Le vrai temps de chargement des documents à
  // respecter, c'est le second "Enregistrer" plus loin, après "Suivant"
  // (voir seq_creationDossier_bien_finaliser, qui garde déjà le budget
  // par défaut de 16s).
  await attendre(400);
  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.enregistrer, 10, 400)) {
    console.warn('[Alfred DOM] Bouton "Enregistrer" (biens) introuvable après confirmation — l\'ajout du bien a peut-être échoué côté serveur (voir la console pour une éventuelle erreur réseau).');
  }
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
// Frappe accélérée (35ms/lettre) sur tous les champs, comme pour le code
// dossier : ce sont des références cadastrales/adresses, personne n'a
// besoin de voir chaque lettre s'afficher une à une — remonté en test
// live comme un des points les plus lents de toute la démo.
async function ajouterBienManuel(bien) {
  await cliquerBouton(SELECTEURS.boutons.ajouterManuellement);
  await attendre(600);
  const typeSpan = document.getElementById(SELECTEURS.champs.bienType);
  if (typeSpan) {
    // Clique le span directement (même correctif que choisirDansDropdown —
    // closest('div,button') sauterait le <p-select> et attraperait un
    // conteneur trop large qui ne réagit pas au clic).
    await curseurVersAsync(typeSpan, () => simulerClic(typeSpan));
    await attendre(250);
    for (let i = 0; i < 15; i++) {
      const opt = Array.from(document.querySelectorAll('li'))
        .find(li => li.textContent.trim() === bien.type && li.getBoundingClientRect().width > 0);
      if (opt) { await curseurVersAsync(opt, () => simulerClic(opt)); await attendre(200); break; }
      await attendre(200);
    }
  }
  await taperDansChamp(SELECTEURS.champs.bienParcelle, bien.parcelle, 15, 35);
  await taperDansChamp(SELECTEURS.champs.bienSection, bien.section, 15, 35);
  await taperDansChamp(SELECTEURS.champs.bienDivision, bien.division, 15, 35);
  await taperDansChamp(SELECTEURS.champs.bienSurface, bien.surface, 15, 35);
  await taperDansChamp(SELECTEURS.champs.bienRevenuCadastral, bien.revenu_cadastral, 15, 35);
  await taperDansChamp(SELECTEURS.champs.bienRue, bien.rue, 15, 35);
  await taperDansChamp(SELECTEURS.champs.bienNumero, bien.numero, 15, 35);
  await taperDansChamp(SELECTEURS.champs.bienCommune, bien.commune, 15, 35);
  // Laisse le temps de lire les champs remplis avant d'enregistrer
  // (demandé explicitement — pas juste une pause technique).
  await attendre(1800);
  await cliquerBouton(SELECTEURS.boutons.enregistrer);
  await attendre(700);
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

// 1a. Cliquer sur "Dossiers" — calé sur le tout premier segment parlé
// ("Voici d'abord le tableau de bord..."), pas sur celui qui parle du
// clic sur "Créer un dossier".
async function seq_creationDossier_ouvrir_dossiers() {
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
}

// 1b. Cliquer sur "Créer un dossier" — calé sur le segment qui en parle.
async function seq_creationDossier_ouvrir_creerBouton() {
  await cliquerBouton(SELECTEURS.boutons.creerDossier);
  await attendre(2200);
}

// Rétrocompatibilité — enchaîne les deux clics (utile pour un test manuel
// en console ; le script normal déclenche chaque clic à part, un par
// segment — voir DOM_ACTIONS et alfred-config.js).
async function seq_creationDossier_ouvrir_ecran() {
  await seq_creationDossier_ouvrir_dossiers();
  await seq_creationDossier_ouvrir_creerBouton();
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
  // Frappe accélérée (35ms/lettre au lieu de 90) : le suffixe d'horodatage
  // rallonge le code, et voir chaque lettre s'afficher une à une n'apporte
  // rien ici — contrairement à un champ où le "tapé en direct" fait partie
  // de la démo, personne ne lit le numéro de dossier lettre par lettre.
  await taperDansChamp(SELECTEURS.champs.dossierCode, codeUnique, 15, 35);
  // Entrée + blur : certains champs Angular ne valident/rafraîchissent leur
  // état (dont l'activation de "Suivant") que sur ces événements, pas sur
  // la frappe seule.
  const champCode = document.getElementById(SELECTEURS.champs.dossierCode);
  if (champCode) validerChamp(champCode);
  await attendre(400);
  // Pauses encore raccourcies (500ms → 300ms, et 800ms → 400ms côté
  // choisirDansDropdownParLabelProche) : une fois speak() corrigé pour
  // attendre la vraie fin de l'audio (voir alfred-voice.js), la comparaison
  // réelle entre durée de la réplique et durée de cette étape est apparue
  // beaucoup plus tardive que prévu — remonté en test live (la parole était
  // términée depuis un moment, la sélection tournait encore).
  await choisirDansDropdownParLabelProche(SELECTEURS.menus.collaborateurEnCharge, cfg.collaborateur);
  await attendre(300);
  if (cfg.collaborateur_administratif) {
    await choisirDansDropdownParLabelProche(SELECTEURS.menus.collaborateurAdministratif, cfg.collaborateur_administratif);
    await attendre(300);
  }
  if (cfg.notaire) {
    await choisirDansDropdownParLabelProche(SELECTEURS.menus.notaireEnCharge, cfg.notaire);
    await attendre(300);
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
// Découpée en deux sous-étapes (comme CreationOuvrir) pour un calage sur
// deux segments : "vendeur" pendant qu'on parle du vendeur, "acquéreur"
// pendant qu'on parle de l'acquéreur.
async function seq_creationDossier_parties_vendeur() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  if (cfg.vendeur_type === 'morale' && cfg.vendeur_bce) {
    await ajouterPartieParBCE('Vendeur', cfg.vendeur_bce);
  } else {
    await ajouterPartieParRN('Vendeur', cfg.vendeur_rn);
  }
}

async function seq_creationDossier_parties_acquereur() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  // Le résultat n'était pas vérifié ici avant — on avançait vers "Suivant"
  // (donc vers l'étape "bien") même si l'acquéreur n'avait pas vraiment
  // été enregistré, ce qui faisait échouer toute la suite en cascade
  // (remonté en test live). Un seul nouvel essai avant d'abandonner.
  let ok = await ajouterPartieParRN('Acquéreur', cfg.acquereur_rn);
  if (!ok) {
    console.warn('[Alfred DOM] Acquéreur pas confirmé après le premier essai — nouvelle tentative.');
    ok = await ajouterPartieParRN('Acquéreur', cfg.acquereur_rn);
  }
  if (!ok) {
    console.warn('[Alfred DOM] Acquéreur toujours pas confirmé — on tente quand même "Suivant" (l\'ajout a peut-être réussi malgré la vérification).');
  }
  // Un délai fixe ici était trop variable (remonté plusieurs fois en test
  // live, jamais fiable à 100%) — ajouterPartieParRN attend maintenant
  // vraiment que la fenêtre d'ajout se referme (signal réel de fin
  // d'enregistrement) avant de revenir, donc plus besoin de deviner un
  // délai supplémentaire ici. Petite pause cosmétique seulement.
  await attendre(500);
  // "Suivant" reste désactivé tant que le vendeur n'a pas été ajouté avec succès.
  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.suivant)) {
    console.warn('[Alfred DOM] Étape "parties" bloquée — arrêt de la séquence.');
    return;
  }
  await attendre(2200);
}

// Rétrocompatibilité — enchaîne les deux sous-étapes (test manuel en
// console ; le script normal déclenche chaque sous-étape à part).
async function seq_creationDossier_parties() {
  await seq_creationDossier_parties_vendeur();
  await seq_creationDossier_parties_acquereur();
}

// Étape 3 — Bien, puis finalisation (Documents : rien à joindre en démo).
// Découpée en deux sous-étapes (comme CreationOuvrir/CreationParties/
// CreationNotaires/CreationRedaction) pour un calage sur deux segments :
// la réplique était restée "à plat" alors que le flux CADASTRE (recherche
// + sélection + confirmation + enregistrement) est long — la narration
// finissait bien avant que l'action à l'écran ne le fasse. Remonté en
// test live.
async function seq_creationDossier_bien_ajouter() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  await ajouterBien(cfg.bien);
}

async function seq_creationDossier_bien_finaliser() {
  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.suivant)) {
    console.warn('[Alfred DOM] Étape "bien" bloquée — arrêt de la séquence.');
    return;
  }
  // Rallongé (2200 → 4500ms) : l'écran qui suit "Suivant" (liste de
  // documents pour tous les biens) passait trop vite pour être lu —
  // demandé explicitement, que ce soit après le cadastre ou la saisie
  // manuelle (même écran dans les deux cas).
  await attendre(4500);
  await cliquerBoutonQuandActif(SELECTEURS.boutons.enregistrer);
  await attendre(2200);
}

// Rétrocompatibilité — enchaîne les deux sous-étapes (test manuel en
// console ; le script normal déclenche chaque sous-étape à part).
async function seq_creationDossier_bien() {
  await seq_creationDossier_bien_ajouter();
  await seq_creationDossier_bien_finaliser();
}

// Étape 4 — Rattacher les notaires (vendeur et acquéreur) depuis l'onglet Parties.
// Découpée en deux sous-étapes (comme CreationOuvrir/CreationParties) pour
// un calage sur deux segments : le notaire du vendeur (BIMBIMMO) pendant
// qu'on en parle, celui de l'acquéreur pendant qu'on parle de lui — donne
// aussi plus de temps réel entre les deux tentatives pour que la section
// "REPRÉSENTE" ait le temps de s'afficher (remonté comme parfois pas
// trouvée, probablement un problème de timing plutôt qu'un vrai bug).
async function seq_creationDossier_notaires_vendeur() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  await naviguerOnglet(SELECTEURS.onglets.parties);
  await attendre(900);
  // Confirmé dans le séquencier d'origine (Alfred_sequencier_actions) :
  // « BIMBIMMO = nous » → « Rattacher l'ÉTUDE (JF) à BIMBIMMO » — à
  // distinguer explicitement de l'acquéreur, où le séquencier dit
  // « rechercher... dans la base des notaires ». BIMBIMMO ne doit donc PAS
  // passer par une recherche/ajout d'un notaire externe : on coche "Mes
  // clients" sur la fiche du notaire déjà présent sur le dossier (celui
  // renseigné comme "Notaire en charge" à l'étape 1).
  await cocherMesClients('Vendeur');
}

async function seq_creationDossier_notaires_acquereur() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  if (cfg.acquereur_notaire) {
    await rattacherNotaire(cfg.acquereur_notaire, 'Acquéreur');
  }
}

// Rétrocompatibilité — enchaîne les deux sous-étapes (test manuel en
// console ; le script normal déclenche chaque sous-étape à part).
async function seq_creationDossier_notaires() {
  await seq_creationDossier_notaires_vendeur();
  await attendre(600);
  await seq_creationDossier_notaires_acquereur();
}

// Étape 5 — Lancer la rédaction du compromis.
async function seq_creationDossier_redaction() {
  await lancerRedactionCompromis();
}

// Trouve le plus grand conteneur qui défile, situé dans la moitié gauche
// ou droite de l'écran — utilisé pour faire défiler chaque colonne du
// compromis (données collectées à gauche, texte généré à droite).
// PREMIÈRE VERSION, jamais testée en live : je devine "le plus grand
// conteneur scrollable de ce côté de l'écran" faute de sélecteur exact.
function trouverColonneDefilante(cote) {
  const candidats = Array.from(document.querySelectorAll('*')).filter(el => {
    const style = getComputedStyle(el);
    if (!/(auto|scroll)/.test(style.overflowY)) return false;
    if (el.scrollHeight <= el.clientHeight + 20) return false;
    const r = el.getBoundingClientRect();
    return r.width > 100 && r.height > 100;
  });
  if (!candidats.length) return null;
  // Trié par position horizontale : le plus à gauche = colonne gauche, le
  // plus à droite = colonne droite — plus robuste qu'exiger que le CENTRE
  // tombe dans la bonne moitié de l'écran (un conteneur à cheval sur le
  // milieu était ignoré à tort, remonté en test live : "à droite ça a pas
  // scrollé" — probablement ce cas).
  const tries = candidats.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  return cote === 'gauche' ? tries[0] : tries[tries.length - 1];
}

// Vitesse cible du défilement, en pixels/seconde — remplace une durée
// fixe. Ralentie pour être vraiment lisible (1200 → 200 px/s).
const VITESSE_SCROLL_COLONNE_PX_PAR_SEC = 200;
const DUREE_MIN_SCROLL_COLONNE_MS = 1500;
// Aller jusqu'au vrai bas du document rendait la démo interminable pour
// un long compromis (ex. la colonne de droite peut faire 5x la gauche —
// jusqu'à 47s au ralenti). Demandé explicitement : scroller juste assez
// pour montrer/lire le contenu, pas tout le document. On défile donc au
// maximum quelques hauteurs d'écran, pas jusqu'au bout — durée prévisible
// et identique des deux côtés, peu importe la longueur réelle du texte.
const ECRANS_A_DEFILER = 4;

// Défile lentement du haut jusqu'au vrai bas de la colonne, à vitesse
// constante (donc plus long pour un document plus long) — remonté en test
// live comme n'allant pas jusqu'au bout ("super important de lire").
async function defilerColonneLentement(cote) {
  // Le clic sur "Rédaction" vient de lancer la génération du compromis —
  // les deux colonnes (et leur contenu réel, donc leur vraie hauteur) ne
  // sont pas forcément déjà affichées au moment où ce segment démarre.
  // Remonté en test live : le défilement à gauche échouait silencieusement
  // juste après le clic, mais fonctionnait en relançant l'action après
  // avoir attendu sur la page — donc un problème de timing, pas de
  // sélecteur. On attend maintenant activement que la colonne apparaisse.
  let conteneur = null;
  for (let i = 0; i < 20; i++) {
    conteneur = trouverColonneDefilante(cote);
    if (conteneur) break;
    await attendre(500);
  }
  if (!conteneur) { console.warn('[Alfred DOM] Colonne', cote, 'du compromis introuvable pour le défilement.'); return; }
  conteneur.scrollTop = 0;
  await attendre(300);
  const veritableBas = conteneur.scrollHeight - conteneur.clientHeight;
  // Quelques hauteurs d'écran seulement, pas le vrai bas du document (voir
  // ECRANS_A_DEFILER) — sauf si le document est déjà plus court que ça.
  const cible = Math.min(veritableBas, conteneur.clientHeight * ECRANS_A_DEFILER);
  const dureeMs = Math.max(DUREE_MIN_SCROLL_COLONNE_MS, (cible / VITESSE_SCROLL_COLONNE_PX_PAR_SEC) * 1000);
  await new Promise(resolve => {
    const debut = performance.now();
    function etape(m) {
      if (annulationDemandee) { resolve(); return; }
      const t = Math.min((m - debut) / dureeMs, 1);
      conteneur.scrollTop = 0 + (cible - 0) * t;
      if (t < 1) requestAnimationFrame(etape); else resolve();
    }
    requestAnimationFrame(etape);
  });
}

async function seq_creationDossier_redaction_scrollGauche() {
  await defilerColonneLentement('gauche');
}
async function seq_creationDossier_redaction_scrollDroite() {
  await defilerColonneLentement('droite');
}

// Étape 6 — Attendre/montrer l'e-mail généré automatiquement.
// Découpée en 2 sous-étapes (ouverture / envoi) pour un calage sur 2
// segments de réplique — voir montrerPropositionEmail_ouverture/_envoyer.
async function seq_creationDossier_email() {
  await montrerPropositionEmail();
}

// Compte les lignes de la liste "Documents" encore en attente (cellule
// placeholder "..." — capture live confirmée : tbody.p-datatable-tbody,
// une ligne par type de document attendu, "..." tant que rien n'est reçu).
// Ne suppose PAS quel type précis correspond à quelle pièce envoyée (mapping
// incertain — ex. l'amiante a deux lignes possibles, "parties communes" ou
// pas) : compte juste combien de lignes, parmi les types attendus, sont
// encore vides. Nécessite l'affichage sur "50 lignes par page" côté appli —
// sinon le DOM ne contient que la page courante (10 lignes sur 18).
function compterDocumentsEnAttente() {
  const tbody = document.querySelector('tbody.p-datatable-tbody');
  if (!tbody) return null; // pas sur l'onglet Documents, ou pas encore chargé
  const lignes = Array.from(tbody.querySelectorAll('tr'));
  if (lignes.length === 0) return null;
  return lignes.filter(tr => tr.textContent.includes('...')).length;
}

// Étape 7 (A20-A21 du séquencier) — attend qu'au moins un document
// supplémentaire soit reçu et classé côté Alfred, en surveillant la baisse
// du nombre de lignes en attente dans Documents (voir
// compterDocumentsEnAttente). Remplace l'attente manuelle utilisée jusqu'ici
// (Cyril répondait depuis une vraie boîte mail, hors de notre contrôle — la
// réponse arrivait visible à l'œil dans Conversation) : la réponse est
// maintenant envoyée automatiquement (voir montrerPropositionEmail_envoyer),
// donc il y a enfin un signal DOM concret et spécifique à surveiller — les
// tentatives précédentes de détection auto avaient échoué sur des signaux
// génériques (badge, comptage dans Événements), pas sur celui-ci.
// Budget large (5 min) : la durée réelle du traitement backend d'un mail
// entrant n'a jamais été mesurée en conditions réelles.
async function seq_creationDossier_attenteReponseVendeur() {
  await naviguerOnglet('Documents');
  await attendre(1000);

  const baseline = compterDocumentsEnAttente();
  let detecte = false;
  if (baseline === null) {
    console.warn('[Alfred DOM] Liste des documents introuvable — impossible de détecter l\'arrivée des pièces, réplique jouée sans confirmation.');
  } else {
    console.log(`[Alfred DOM] ${baseline} document(s) encore en attente — surveillance en cours.`);
    for (let i = 0; i < 100; i++) { // 100 x 3s = 5 min
      if (annulationDemandee) { console.warn('[Alfred DOM] Attente des documents annulée.'); break; }
      await attendre(3000);
      const actuel = compterDocumentsEnAttente();
      if (actuel !== null && actuel < baseline) {
        console.log(`[Alfred DOM] Nouveau(x) document(s) détecté(s) (${baseline} → ${actuel} en attente).`);
        detecte = true;
        break;
      }
    }
    if (!detecte) console.warn('[Alfred DOM] Aucun nouveau document détecté après 5 min — réplique jouée quand même.');
  }

  // Segment marqué parlerDepuisAction (voir alfred-brain.js et
  // montrerPropositionEmail_envoyer pour le même principe) : le texte n'est
  // dit qu'ici, une fois la meilleure preuve possible obtenue — ou, à
  // défaut (détection indisponible/budget écoulé), on continue quand même
  // pour ne pas bloquer une démo en direct sur un détail d'affichage.
  if (typeof speak === 'function' && typeof ALFRED_CONFIG !== 'undefined') {
    const liste = (typeof currentLangue !== 'undefined' && currentLangue === 'nl') ? ALFRED_CONFIG.REPLIQUES_NL : ALFRED_CONFIG.REPLIQUES_FR;
    const replique = liste?.find(r => r.label === 'CreationReponseVendeur');
    const segment = replique?.segments?.find(s => s.action === 'CreationReponseVendeur');
    if (segment?.texte) {
      if (typeof addToHistory === 'function') addToHistory('alfred', segment.texte);
      speak(typeof naturaliserTexte === 'function' ? naturaliserTexte(segment.texte) : segment.texte, currentLangue, segment.texte);
    }
  }

  await naviguerOnglet('Compromis');
  await attendre(800);
  return true;
}

// Séquence complète (rétrocompatibilité — enchaîne les 7 étapes).
async function seq_creerDossierDemo() {
  await seq_creationDossier_ouvrir();
  await seq_creationDossier_parties();
  await seq_creationDossier_bien();
  await seq_creationDossier_notaires();
  await seq_creationDossier_redaction();
  await seq_creationDossier_email();
  await seq_creationDossier_attenteReponseVendeur();
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
  // propre bout d'action. Un clic par segment (au lieu d'"Ecran" qui en
  // faisait deux à la fois), pour que le clic sur "Dossiers" tombe pile
  // sur le 1er segment (qui en parle) et pas sur le 2e (qui parle du clic
  // sur "Créer un dossier").
  'CreationOuvrir_Dossiers':    seq_creationDossier_ouvrir_dossiers,
  'CreationOuvrir_CreerBouton': seq_creationDossier_ouvrir_creerBouton,
  'CreationOuvrir_Champs':      seq_creationDossier_ouvrir_champs,
  'CreationParties':   seq_creationDossier_parties,
  'CreationParties_Vendeur':   seq_creationDossier_parties_vendeur,
  'CreationParties_Acquereur': seq_creationDossier_parties_acquereur,
  'CreationBien':      seq_creationDossier_bien,
  'CreationBien_Rechercher': seq_creationDossier_bien_ajouter,
  'CreationBien_Finaliser':  seq_creationDossier_bien_finaliser,
  'CreationNotaires':  seq_creationDossier_notaires,
  'CreationNotaires_Vendeur':   seq_creationDossier_notaires_vendeur,
  'CreationNotaires_Acquereur': seq_creationDossier_notaires_acquereur,
  'CreationRedaction': seq_creationDossier_redaction,
  'CreationRedaction_ScrollGauche': seq_creationDossier_redaction_scrollGauche,
  'CreationRedaction_ScrollDroite': seq_creationDossier_redaction_scrollDroite,
  'CreationEmail':     seq_creationDossier_email,
  'CreationEmail_Ouverture': montrerPropositionEmail_ouverture,
  'CreationEmail_Envoyer':   montrerPropositionEmail_envoyer,
  'CreationReponseVendeur': seq_creationDossier_attenteReponseVendeur,
  // Geste unique, purement visuel (voir clinDoeil dans alfred-ui.js) — pas
  // d'automatisation de l'appli, juste le clin d'œil de clôture.
  'ClosingWink': (typeof clinDoeil === 'function') ? clinDoeil : async () => {},
  // Idem, purement visuel (voir gesteMontrer dans alfred-ui.js) — le pivot
  // acte 1 → démo ("Avec plaisir. Regardez.").
  'Montrer': (typeof gesteMontrer === 'function') ? gesteMontrer : async () => {},
};

// Labels d'action purement visuels (aucune automatisation de l'appli) —
// autorisés à se déclencher même en acte 1, contrairement aux vraies
// actions DOM qui restent bloquées avant le début de la démo (voir le
// garde-fou currentActe >= 2 dans alfred-brain.js).
const GESTES_VISUELS_SEULS = new Set(['ClosingWink', 'Montrer']);

async function executerActionDOM(label) {
  const action = DOM_ACTIONS[label];
  if (action) {
    await attendre(600);
    await action();
  } else {
    // Échouait en silence total jusqu'ici — impossible de distinguer "action
    // jamais appelée" de "appelée mais sans effet visible" depuis la console.
    console.warn('[Alfred DOM] executerActionDOM : aucune action pour le label', JSON.stringify(label));
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