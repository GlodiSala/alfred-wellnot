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
// Chaque entrée texte (boutons/menus/onglets/textes/placeholders) est un
// TABLEAU de candidats — [FR] pour l'instant, [FR, NL] une fois le texte
// néerlandais confirmé par capture live (jamais deviné, voir la note plus
// bas). texteCorrespond()/texteContient() testent tous les candidats, donc
// le code marche que le site soit affiché en français OU en néerlandais,
// sans qu'on ait à savoir à l'avance lequel des deux est actif. `champs`
// reste des chaînes simples : ce sont de vrais attributs HTML id, pas du
// texte affiché — indépendants de la langue de l'interface.
//
// NL PAS ENCORE REMPLI (04/09, démo demandée en néerlandais) — voir
// capture-selecteurs-nl.js dans le scratchpad pour le script de capture à
// faire tourner sur le site en néerlandais, écran par écran.
// Deux catégories de NL dans les tableaux ci-dessous :
//  - "confirmé" : vu littéralement sur une capture d'écran du site réel ou
//    dans le script officiel v3_8.docx — fiable.
//  - "estimation" : vocabulaire standard/juridique sans ambiguïté probable,
//    PAS vérifié en direct — risque assumé sciemment (contrairement à
//    "Proposition d'e-mail", jamais deviné pour un libellé propre au
//    produit). À confirmer dès que possible, mais mieux qu'une case vide
//    en attendant.
const SELECTEURS = {
  boutons: {
    ajouter:             ['Ajouter', 'Toevoegen'], // estimation
    ajouterManuellement: ['Ajouter manuellement', 'Handmatig toevoegen'], // confirmé (capture d'écran 04/09)
    ajouterBienCadastre: ['Ajouter un bien via le CADASTRE', 'Een goed toevoegen via het KADASTER'], // confirmé (capture d'écran 04/09)
    ajouterNotaire:      ['Ajouter un notaire', 'Notaris toevoegen'], // estimation
    creerDossier:        ['Créer un dossier', 'Nieuw dossier aanmaken'], // confirmé (capture d'écran 04/09)
    enregistrer:         ['Enregistrer', 'Opslaan'], // confirmé (capture d'écran 04/09, bouton fiche création dossier)
    personnePhysique:    ['Personne physique', 'Natuurlijk persoon'], // NL confirmé (capture d'écran, modale "Een persoon toevoegen") — corrigé : pas "Natuurlijke persoon" (estimation initiale fausse, sans le -e final)
    personneMorale:      ['Personne morale', 'Rechtspersoon'], // NL confirmé (capture d'écran, modale "Een persoon toevoegen") — l'estimation initiale était la bonne
    rechercher:          ['Rechercher', 'Zoeken'], // estimation (placeholder "Zoeken" confirmé ailleurs sur le site)
    confirmerBien:       ['Confirmer', 'Bevestigen'], // confirmé (capture d'écran 04/09)
    rediger:             ['Rédiger un document', 'Document aanmaken'], // NL confirmé (capture d'écran, onglet fiche dossier "+ Document aanmaken") — c'est le déclencheur qui ouvre le sous-menu avec l'option "Compromis" (déjà confirmée identique en NL), donc ça correspond bien au même bouton que "Rédiger un document" en FR, pas à "Générer le compromis"
    genererCompromis:    ['Générer le compromis'], // repli seulement — jamais vu déclencher directement en NL, "rediger" ouvre toujours un sous-menu d'après ce qu'on a observé
    suivant:             ['Suivant', 'Volgende'], // confirmé par capture d'écran (04/09)
    validerEtEnvoyer:    ['Valider et envoyer', 'Valideren en versturen'], // confirmé (capture d'écran 04/09, panneau Alfred)
    consulter:           ['Consulter', 'Raadplegen'], // confirmé (capture d'écran 04/09, panneau Alfred)
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
  // Libellés des champs dans la fenêtre "Ajouter une partie" (Vendeur/
  // Acquéreur) — utilisés par surlignerChampParLabelDialogue pour cibler le
  // bon champ par son TEXTE plutôt que par sa POSITION (voir historique :
  // "le Nième champ rempli" ne correspond pas à l'ordre énuméré à l'oral,
  // remonté en test live — "il remonte bizarrement"). FR et NL confirmés par
  // captures d'écran en direct (03/09, fiches Alain Caprasse/BIMBIMMO, dans
  // les deux langues de l'interface).
  labelsPartie: {
    nom:               ['Nom', 'Achternaam'], // sert aussi pour "représentants" (Vendeur) : même libellé, section "Relaties"/"Mes relations" différente
    adresseSiege:      ['Rue', 'Straat'], // "siège" (personne morale) et "adresse" (personne physique) sont tous deux ce champ — même section Contact/Contactgegevens
    dateNaissance:     ['Date de naissance', 'Geboortedatum'],
    nationalite:       ['Nationalité', 'Nationaliteit'],
    etatCivil:         ['État civil', 'Burgerlijke staat'],
    regimeMatrimonial: ['Régime matrimonial', 'Huwelijksvermogensstelsel'],
    denomination:      ['Dénomination', 'Benaming'],
    // Pas d'entrée pour "forme juridique" : confirmé par capture FR, le
    // champ "Type *" du formulaire Vendeur correspond en fait à
    // l'assujettissement TVA ("Assujetti à la TVA"), pas à la forme
    // juridique — aucun champ "Forme juridique" n'existe sur la fiche
    // BIMBIMMO, donc pas de cible possible ici, laissé sans surlignage.
    // Section précédant les représentants (Vendeur) — confirmée par
    // capture FR/NL ("Relations"/"Relaties"). Sert à ne chercher le
    // libellé "Nom" qu'APRÈS cette section (voir champPartieRepresentants) :
    // "Nom" existe aussi tout en haut de la fiche, déjà rempli avec la
    // dénomination cherchée par BCE.
    sectionRepresentants: ['Relations', 'Relaties'],
  },
  placeholders: {
    rechercheCommune: ['Rechercher une commune par son nom ou son code postal'],
    rechercheNotaire: ['Rechercher dans votre liste de notaires', 'Zoeken in uw notarissenlijst'], // NL confirmé (capture d'écran, modale "Een notaris toevoegen")
    // Champ de saisie de l'onglet "Conversation"/"Gesprek" du panneau
    // Alfred (voir seq_poserQuestionsAlfred) — NL confirmé (capture d'écran
    // 04/09, "Stel uw vraag..."). FR : ESTIMATION (jamais vu en direct),
    // traduction directe la plus probable — à corriger si le vrai
    // placeholder diffère.
    questionAlfred: ['Stel uw vraag', 'Posez votre question'],
  },
  menus: {
    qualitePartie:              ['Sélectionnez une qualité', 'Selecteer een h'], // NL confirmé — préfixe volontairement tronqué : la capture d'écran montrait "Selecteer een h..." coupé par ellipsis CSS (boîte trop étroite), donc "..." n'est PAS le vrai texte du DOM. Matché en startsWith (voir choisirDansDropdown) plutôt qu'en deviner la fin ("hoedanigheid" probable mais non confirmé caractère par caractère).
    // NL confirmés par capture d'écran (04/09, fiche "Nieuw dossier
    // aanmaken") — libellés plus courts qu'en FR, normal, pas une erreur.
    collaborateurEnCharge:      ['Collaborateur en charge du dossier', 'Verantwoordelijke medewerker'],
    collaborateurAdministratif: ['Collaborateur administratif', 'Administratieve medewerker'],
    notaireEnCharge:            ['Notaire en charge du dossier', 'Verantwoordelijke notaris'],
    // "Taal" confirmé par capture d'écran (04/09) — jamais eu besoin de FR
    // ("Frans" est déjà la valeur par défaut du champ, jamais touché avant).
    langueActe:                 ['Taal'],
  },
  onglets: {
    evenements:   ['Événements', 'Gebeurtenissen'], // confirmé (capture d'écran 04/09, panneau Alfred)
    conversation: ['Conversation', 'Gesprek'], // confirmé (capture d'écran 04/09, panneau Alfred)
    parties:      ['Parties', 'Partijen'], // confirmé (capture d'écran 04/09, onglet dossier)
  },
  textes: {
    represente: ['REPRÉSENTE', 'VERTEGENWOORDIGT'], // NL confirmé (capture d'écran, fiche notaire de Maxime dans Partijen)
    mesClients: ['Mes clients', 'Mijn cliënten'], // confirmé (capture d'écran, fiche notaire Alain Caprasse dans Partijen : "MIJN CLIËNTEN")
    optionCompromis: ['Compromis'], // "Compromis" reste identique en NL, confirmé par capture d'écran (badge dossier)
    // "Proposition d'e-mail" ne correspondait à rien dans le vrai DOM —
    // confirmé par capture d'écran, le vrai titre de la carte est "Email à
    // valider".
    propositionEmail: ["Email à valider", "E-mail ter validatie"], // NL confirmé (capture d'écran 04/09, panneau Alfred)
    lienDossiers: ['Dossiers'], // identique en NL, confirmé par capture d'écran (nav "DOSSIERS")
    // Qualité de partie (menu déroulant ET badges affichés) — confirmés
    // par capture d'écran (04/09, menu "Een persoon toevoegen" : Verkoper/
    // Koper/Notaris/Landmeter/Vastgoedmakelaar/...). Avant, ces mots
    // français étaient codés en dur dans les appels (ajouterPartieParRN/
    // BCE, rattacherNotaire, cocherMesClients...) — ne matchaient plus
    // rien une fois le site en néerlandais ('verkoper'.includes('vendeur')
    // est faux), bug trouvé par lecture de code après une capture d'écran.
    qualiteVendeur:   ['Vendeur', 'Verkoper'],
    qualiteAcquereur: ['Acquéreur', 'Koper'],
    qualiteNotaire:   ['Notaire', 'Notaris'],
    ariaParlerAlfred: ['parler avec alfred'], // aria-label (déjà en minuscules, comparé en minuscules)
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

// Même principe que trouverConteneurDefilant, mais pour le défilement
// HORIZONTAL (overflow-x) — utilisé par surlignerColonneDossiers ci-dessous.
function trouverConteneurDefilantHorizontal(el) {
  let p = el.parentElement;
  while (p) {
    const style = getComputedStyle(p);
    if (/(auto|scroll)/.test(style.overflowX) && p.scrollWidth > p.clientWidth + 1) return p;
    p = p.parentElement;
  }
  return null;
}

// Équivalent HORIZONTAL de defilerVersElement, avec la même durée réglable —
// remplace scrollIntoView({inline:'center', behavior:'smooth'}) qu'on
// utilisait ici (voir surlignerColonneDossiers) : sa vitesse native n'est
// pas réglable, remonté en test live comme trop rapide ("le scrolle sur la
// colonne doit être ralenti"), même retour déjà eu sur le défilement
// vertical narratif (voir defilerVersElement plus haut). Repli sur
// scrollIntoView natif si aucun conteneur à overflow-x n'est trouvé (ne
// devrait pas arriver ici, mais pas de silence total sinon).
async function defilerVersElementHorizontal(el, dureeMs = 1800) {
  const conteneur = trouverConteneurDefilantHorizontal(el);
  if (!conteneur) { el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); await attendre(400); return; }
  const r = el.getBoundingClientRect();
  const rectRef = conteneur.getBoundingClientRect();
  const dejaVisible = r.left >= rectRef.left && r.right <= rectRef.right;
  if (dejaVisible) return;
  const decalage = r.left - rectRef.left - (rectRef.width / 2) + (r.width / 2);
  const depart = conteneur.scrollLeft;
  const cible  = depart + decalage;
  await new Promise(resolve => {
    const debut = performance.now();
    function etape(maintenant) {
      if (annulationDemandee) { resolve(); return; }
      const t = Math.min((maintenant - debut) / dureeMs, 1);
      const t2 = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
      conteneur.scrollLeft = depart + (cible - depart) * t2;
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
  const candidats = (Array.isArray(texte) ? texte : [texte]).map(t => t.toLowerCase());
  return Array.from(document.querySelectorAll('a, button, [role="tab"]'))
    .find(el => {
      const t = el.textContent.trim().toLowerCase();
      return candidats.some(c => t.includes(c)) && el.getBoundingClientRect().width > 0;
    });
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
    .find(el => texteContient((el.getAttribute('aria-label') || '').toLowerCase(), SELECTEURS.textes.ariaParlerAlfred) && el.getBoundingClientRect().width > 0);
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

// Ferme le panneau Alfred (Conversation/Événements) s'il est ouvert — sans
// effet sinon. Remonté en test live : si ce panneau reste ouvert (laissé
// ouvert depuis Email/ReponseVendeur juste avant), le défilement "colonne
// de droite" (voir trouverColonneDefilante) cible le panneau au lieu du
// vrai document compromis — d'où le besoin de le fermer explicitement
// avant tout scroll (voir seq_creationDossier_redaction_scrollPEB).
async function fermerPanneauAlfred() {
  // Logs de diagnostic ajoutés le 04/09 — remonté en test live : "tu ne
  // fermes pas avant et ça clique pas sur le logo" (réplique ProjetComplet).
  // Sans ces logs, impossible de distinguer depuis la console "panneau déjà
  // fermé, rien à faire" (return true silencieux avant) de "avatar
  // introuvable" ou "clic fait mais panneau resté ouvert" — les trois se
  // traduisaient de la même façon à l'écran ("rien ne se passe").
  if (!trouverOnglet(SELECTEURS.onglets.evenements)) {
    console.log('[Alfred DOM] fermerPanneauAlfred : panneau déjà fermé (onglet Événements introuvable), rien à faire.');
    return true;
  }
  // PAS de croix de fermeture (essayé via fermerFenetreOuverte, introuvable
  // en test live) — c'est un panneau à bascule (toggle) : le même bouton
  // logo/avatar qui l'ouvre (trouverAvatarAlfred, voir ouvrirPanneauAlfred
  // juste au-dessus) le referme aussi. Confirmé par l'utilisatrice.
  const avatar = trouverAvatarAlfred();
  if (!avatar) { console.warn('[Alfred DOM] Icône Alfred (pour fermer le panneau Événements) introuvable.'); return false; }
  console.log('[Alfred DOM] fermerPanneauAlfred : clic sur', avatar.tagName, avatar.getAttribute('aria-label') || avatar.className || '(sans libellé)');
  await curseurVersAsync(avatar, () => simulerClic(avatar));
  await attendre(500);
  if (trouverOnglet(SELECTEURS.onglets.evenements)) {
    console.warn('[Alfred DOM] Panneau Alfred toujours ouvert après re-clic sur le logo.');
    return false;
  }
  console.log('[Alfred DOM] fermerPanneauAlfred : panneau fermé avec succès.');
  return true;
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
// Compare le texte d'un élément à un ou plusieurs textes candidats — pour
// que le site puisse être en français OU en néerlandais sans qu'on ait à
// deviner lequel des deux est affiché à l'instant T. `candidats` peut être
// une simple chaîne (rétrocompatible avec tout le code existant) ou un
// tableau de chaînes (une par langue) — le premier qui correspond suffit.
function texteCorrespond(texteEl, candidats) {
  const liste = Array.isArray(candidats) ? candidats : [candidats];
  const t = (texteEl || '').trim();
  return liste.some(c => t === c);
}
function texteContient(texteEl, candidats) {
  const liste = Array.isArray(candidats) ? candidats : [candidats];
  const t = texteEl || '';
  return liste.some(c => t.includes(c));
}
// Préfixe plutôt qu'égalité stricte — un libellé de champ obligatoire
// s'affiche parfois avec un astérisque collé au texte ("Taal *", "Taal*"),
// remonté en test live sur le champ Taal : la comparaison stricte ne
// matchait jamais alors que le libellé était bien "Taal" au début.
function texteCommencePar(texteEl, candidats) {
  const liste = Array.isArray(candidats) ? candidats : [candidats];
  const t = (texteEl || '').trim();
  return liste.some(c => t.startsWith(c));
}
// Cherche un <input> visible par son placeholder, parmi un ou plusieurs
// candidats (FR/NL) — un attribut CSS [placeholder="..."] ne peut pas
// tester plusieurs valeurs à la fois, d'où ce helper dédié.
function trouverParPlaceholder(candidats) {
  return Array.from(document.querySelectorAll('input'))
    .find(i => texteCorrespond(i.placeholder, candidats) && i.getBoundingClientRect().width > 0);
}

// Repli structurel, sans deviner de texte : si aucun placeholder connu ne
// matche (ex. texte NL jamais capturé pour "Rechercher dans votre liste de
// notaires"/CADASTRE), on prend le seul champ texte visible dans la modale
// actuellement ouverte — ça marche quelle que soit la langue puisqu'on ne
// dépend d'aucun texte, juste du fait qu'une modale de recherche n'a
// normalement qu'un seul champ. Ne renvoie rien si 0 ou plusieurs champs
// (cas ambigu, mieux vaut échouer proprement que taper au mauvais endroit).
function trouverSeulChampTexteDialogueOuvert() {
  const dialogue = trouverDialogueOuvert();
  if (!dialogue) return null;
  const champs = Array.from(dialogue.querySelectorAll('input'))
    .filter(i => (!i.type || i.type === 'text' || i.type === 'search') && i.getBoundingClientRect().width > 0);
  return champs.length === 1 ? champs[0] : null;
}

// Cherche un bouton visible dont le texte correspond exactement.
function trouverBoutonParTexte(texte) {
  return Array.from(document.querySelectorAll('button'))
    .find(b => texteCorrespond(b.textContent, texte) && b.getBoundingClientRect().width > 0);
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
    .find(el => el.children.length === 0 && texteCommencePar(el.textContent, labelTexte) && el.getBoundingClientRect().width > 0);
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
  const candidats = (Array.isArray(texteOption) ? texteOption : [texteOption]).map(t => t.toLowerCase());
  return candidats.some(attendu => texte === attendu || texte.includes(attendu));
}

// Sélectionne une option dans le menu déroulant situé juste sous un libellé
// donné. Utile quand le champ est vide et n'a donc aucun texte de
// déclencheur fiable pour être ciblé autrement.
// silencieux : n'allume PAS le halo de sélection (voir plus bas) — utilisé
// par seq_creationDossier_ouvrir_champs (parlerDepuisAction, 03/09 3e passe) :
// les champs sont maintenant remplis EN SILENCE avant qu'Alfred ne parle,
// puis re-surlignés un par un en vraie synchro au mot (voir
// SURBRILLANCE_CIBLES: langueActe/collaborateur/notaireEnCharge) — sans ce
// flag, chaque champ flasherait deux fois (une fois ici, en silence, une
// fois pendant la narration), retour déjà eu ("impression de superposition").
async function choisirDansDropdownParLabelProche(labelTexte, texteOption, dejaReessaye, silencieux) {
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
      // Retour direct : mettre en évidence la valeur sélectionnée — sauf en
      // mode silencieux (voir le paramètre plus haut), où c'est un
      // surlignage synchronisé au mot, déclenché séparément pendant la
      // parole, qui s'en charge.
      if (!silencieux) surlignerBrievement(declencheur);
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
    return choisirDansDropdownParLabelProche(labelTexte, texteOption, true, silencieux);
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
  // startsWith plutôt qu'égalité stricte : le texte affiché peut être
  // tronqué par ellipsis CSS dans une boîte étroite (ex. "Selecteer een
  // h..." en NL) — le "..." visible n'est pas forcément dans le vrai
  // textContent, donc une égalité stricte contre un candidat qui l'inclut
  // rate le match (même bug que "Taal", voir trouverDeclencheurProcheLabel).
  let declencheur = Array.from(document.querySelectorAll('span'))
    .find(s => texteCommencePar(s.textContent, texteDeclencheur) && s.getBoundingClientRect().width > 0);
  if (!declencheur) {
    // Repli — bug trouvé en test live (échec du rattachement du notaire
    // après un ajout d'acquéreur en échec) : ce même menu, une fois déjà
    // utilisé pour une autre partie (Vendeur/Acquéreur), n'affiche plus le
    // texte de départ mais la valeur précédemment choisie — donc le
    // matching ci-dessus ne le retrouve plus du tout. On le cherche alors
    // par cette valeur, mais UNIQUEMENT parmi les vrais menus déroulants
    // ([role="combobox"], via trouverDeclencheursDropdown), jamais parmi
    // les badges déjà affichés sur les fiches des parties déjà ajoutées
    // (qui portent le même texte mais ne sont pas cliquables comme menu).
    const valeursDejaChoisies = [
      ...SELECTEURS.textes.qualiteVendeur,
      ...SELECTEURS.textes.qualiteAcquereur,
      ...SELECTEURS.textes.qualiteNotaire,
    ];
    declencheur = trouverDeclencheursDropdown().find(c => texteCorrespond(c.textContent, valeursDejaChoisies));
    if (declencheur) console.warn('[Alfred DOM] Menu qualité retrouvé via son ancienne valeur:', JSON.stringify(declencheur.textContent.trim()));
  }
  if (!declencheur) { console.warn('[Alfred DOM] Menu déroulant introuvable:', texteDeclencheur); return false; }
  console.log('[Alfred DOM] Menu qualité — avant sélection, texte du déclencheur:', JSON.stringify(declencheur.textContent.trim()), '— option cherchée:', texteOption);
  await curseurVersAsync(declencheur, () => simulerClic(declencheur));
  await attendre(400); // laisse le menu visible un instant, plus lisible en démo live (raccourci, 800 → 400)
  for (let i = 0; i < 15; i++) {
    if (annulationDemandee) { console.warn('[Alfred DOM] Attente de l\'option annulée:', texteOption); return false; }
    const optionsVisibles = Array.from(document.querySelectorAll('li')).filter(li => li.getBoundingClientRect().width > 0);
    // Bug réel confirmé en test live (trace DOM à l'appui) : en cherchant
    // "Koper" (acquéreur), la correspondance "contient" de optionCorrespond()
    // matchait "Verkoper" (vendeur) en premier, puisque "koper" est
    // littéralement un sous-mot de "verkoper" — la sélection retombait donc
    // presque toujours sur "Vendeur" au lieu de "Acquéreur", uniquement en
    // néerlandais (jamais vu en FR : "Acquéreur" n'est pas un sous-mot de
    // "Vendeur"). On priorise donc une correspondance EXACTE dans tout le
    // menu ; la correspondance "contient" d'optionCorrespond() ne sert plus
    // que de repli si aucune correspondance exacte n'existe.
    const candidatsExacts = (Array.isArray(texteOption) ? texteOption : [texteOption]).map(t => t.toLowerCase());
    let opt = optionsVisibles.find(li => candidatsExacts.includes(li.textContent.trim().toLowerCase()));
    if (!opt) opt = optionsVisibles.find(li => optionCorrespond(li, texteOption));
    if (opt) {
      if (i === 0) console.log('[Alfred DOM] Menu qualité — options visibles dans la liste:', optionsVisibles.map(li => JSON.stringify(li.textContent.trim())));
      await curseurVersAsync(opt, () => simulerClic(opt));
      await attendre(200);
      console.log('[Alfred DOM] Menu qualité — après sélection, texte du déclencheur:', JSON.stringify(declencheur.textContent.trim()));
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
    .filter(el => el.children.length === 0 && texteCorrespond(el.textContent, texte) && el.getBoundingClientRect().width > 0)
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

// Attire brièvement l'œil sur un élément (ex: la fenêtre "Ajouter une
// partie" juste après que la recherche RN/BCE ait rempli le formulaire) —
// un halo qui apparaît puis disparaît, sans toucher aux champs
// individuels (pas besoin de connaître leurs sélecteurs). Demandé en
// retour : "Alfred ne montre pas assez ce qu'il fait" — avant, le clic
// "Enregistrer" arrivait quasi tout de suite après le remplissage
// automatique, sans laisser le temps au public de le voir vraiment.
// Injecte une seule fois la feuille de style de l'animation — question
// posée explicitement ("y a moyen de le faire plus pro ?") : remplacé
// l'ancien contour qui apparaissait net (box-shadow appliqué directement en
// JS) par un vrai fondu enchaîné géré en CSS (montée douce → halo tenu →
// descente douce), avec un léger lavis de fond en plus du contour — plus
// proche d'un effet "surligneur" soigné que d'un clignotement brut.
let styleSurbrillanceInjecte = false;
function assurerStyleSurbrillance() {
  if (styleSurbrillanceInjecte) return;
  styleSurbrillanceInjecte = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes alfred-surbrillance-anim {
      0%   { box-shadow: 0 0 0 0 rgba(20,176,189,0), 0 0 0 rgba(20,176,189,0); background-color: rgba(20,176,189,0); }
      18%  { box-shadow: 0 0 0 2px rgba(20,176,189,.85), 0 3px 14px rgba(20,176,189,.35); background-color: rgba(20,176,189,.10); }
      82%  { box-shadow: 0 0 0 2px rgba(20,176,189,.85), 0 3px 14px rgba(20,176,189,.35); background-color: rgba(20,176,189,.10); }
      100% { box-shadow: 0 0 0 0 rgba(20,176,189,0), 0 0 0 rgba(20,176,189,0); background-color: rgba(20,176,189,0); }
    }
    .alfred-surbrillance {
      animation: alfred-surbrillance-anim var(--alfred-surbrillance-duree, 1.5s) cubic-bezier(.4,0,.2,1) both;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);
}

function surlignerBrievement(el, dureeMs = 1500) {
  if (!el) return;
  assurerStyleSurbrillance();
  el.style.setProperty('--alfred-surbrillance-duree', dureeMs + 'ms');
  // Redémarre proprement l'animation si cet élément est déjà en train de
  // s'allumer (rappel rapproché) — juste réappliquer la même classe ne
  // relance pas une animation CSS déjà en cours, il faut un reflow entre
  // les deux (retrait, lecture forcée, ajout).
  el.classList.remove('alfred-surbrillance');
  void el.offsetWidth;
  el.classList.add('alfred-surbrillance');
  clearTimeout(el._alfredSurbrillanceTimer);
  el._alfredSurbrillanceTimer = setTimeout(() => el.classList.remove('alfred-surbrillance'), dureeMs);
}

// Version plus précise, demandée en retour : mettre en évidence les vrais
// champs remplis (nom, adresse...) plutôt que toute la fenêtre d'un coup.
// On ne connaît pas les sélecteurs exacts de chaque champ (nom vs adresse
// vs date de naissance...), donc on cible tout champ du formulaire qui a
// une VALEUR non vide — générique, ne suppose rien sur la structure
// exacte. Repli sur le halo global (surlignerBrievement) si rien n'est
// trouvé (ex: le formulaire affiche les valeurs autrement que via de
// vrais <input>) — pas de régression si ce ciblage plus fin ne matche pas.
// Balayage séquentiel plutôt qu'un flash unique sur tout le formulaire —
// demandé explicitement (retour Cyril) : "quand on dit le nom, il faut
// surligner, pareil pour tous les autres champs". On ne connaît pas quel
// <input> correspond à quel mot précis d'Alfred, donc pas de synchronisation
// mot-à-mot possible — mais on peut faire mieux qu'un seul freeze-frame :
// mettre en évidence les champs UN PAR UN, dans l'ordre visuel (haut → bas)
// qui correspond en pratique à l'ordre où Alfred les énumère à l'oral (nom,
// adresse, date de naissance...), pour un effet de lecture au fil du texte.
async function surlignerChampsRemplis(conteneur, dureeMs = 1500) {
  if (!conteneur) return;
  const champs = Array.from(conteneur.querySelectorAll('input, textarea, select'))
    .filter(el => el.value && el.value.trim() && el.getBoundingClientRect().width > 0)
    .sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return Math.abs(ra.top - rb.top) > 5 ? ra.top - rb.top : ra.left - rb.left;
    });
  if (!champs.length) { surlignerBrievement(conteneur, dureeMs); return; }
  const dureeParChamp = Math.max(350, Math.round(dureeMs / champs.length));
  for (const champ of champs) {
    if (annulationDemandee) return;
    surlignerBrievement(champ, dureeParChamp + 200); // léger chevauchement, transition plus fluide entre deux champs
    await attendre(dureeParChamp);
  }
}

// Cherche un champ (input/textarea/select, ou déclencheur de dropdown
// PrimeNG) associé à un libellé donné, à l'INTÉRIEUR d'un conteneur précis
// (ex: la fenêtre "Ajouter une partie" actuellement ouverte) — même logique
// de proximité géométrique que trouverDeclencheurProcheLabel, mais scopée à
// un conteneur (jamais un champ de la page derrière la fenêtre) et couvrant
// aussi les champs texte classiques, pas seulement les menus déroulants.
// Valeur "réelle" d'un champ, qu'il s'agisse d'un <input>/<textarea>/<select>
// (.value) ou d'un déclencheur de menu PrimeNG ([role="combobox"], souvent
// un <span>/<div> sans .value du tout — affiche sa valeur via .textContent).
// Remonté en test live : Nationalité/Régime matrimonial sont des MENUS
// (Belgisch/Scheiding van goederen... bien présents dans .textContent),
// pas des champs texte — .value seul valait toujours undefined pour eux.
function valeurChamp(el) {
  if (!el) return '';
  return (el.value ?? el.textContent ?? '').trim();
}

// apresElement (optionnel) : ignore tout libellé situé AU-DESSUS de cet
// élément — utilisé pour lever une ambiguïté quand "le premier libellé
// rempli" ne suffit pas (voir champPartieRepresentants plus bas : "Nom"
// existe aussi tout en haut de la fiche Vendeur, DÉJÀ rempli avec la
// dénomination de l'entreprise cherchée par BCE — donc pas vide, la
// méthode "on garde le 1er rempli" retomberait dessus par erreur).
function trouverChampProcheLabelDans(conteneur, labelTexte, apresElement) {
  if (!conteneur) return null;
  const limiteHaut = apresElement ? apresElement.getBoundingClientRect().bottom : -Infinity;
  // PLUSIEURS libellés identiques peuvent exister dans la même fenêtre — la
  // fiche "Une personne avec ce numéro de registre national existe déjà"
  // garde affichés les champs de RECHERCHE d'origine (Nom/Rue/Date de
  // naissance..., vides) AU-DESSUS des vraies infos remplies plus bas.
  // Remonté en test live : le premier libellé "Nom" trouvé menait
  // systématiquement au champ de recherche vide, pas au vrai champ rempli.
  // On essaie donc TOUS les libellés correspondants, dans l'ordre, et on
  // garde le premier dont le champ le plus proche a une VALEUR — pas
  // seulement le tout premier libellé venu.
  let labels = Array.from(conteneur.querySelectorAll('*'))
    .filter(el => el.children.length === 0 && texteCommencePar(el.textContent, labelTexte) && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().top >= limiteHaut);
  if (!labels.length) {
    // Repli texteContient : certains libellés peuvent être précédés d'une
    // icône/espace insécable invisible dans le texte brut, ce que
    // startsWith raterait mais includes attrape.
    labels = Array.from(conteneur.querySelectorAll('*'))
      .filter(el => el.children.length === 0 && texteContient(el.textContent, labelTexte) && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().top >= limiteHaut);
  }
  if (!labels.length) return null;

  const candidats = [
    ...conteneur.querySelectorAll('input, textarea, select'),
    ...conteneur.querySelectorAll('[role="combobox"]'),
  ].filter(el => el.getBoundingClientRect().width > 0);

  let meilleurGlobal = null, meilleureDistanceGlobale = Infinity;
  for (const label of labels) {
    const lr = label.getBoundingClientRect();
    // Distance euclidienne entre centres, avec une légère pénalité (pas une
    // exclusion totale) si le champ est nettement AU-DESSUS du libellé —
    // remplace un filtre strict "doit être en dessous" qui excluait TOUT
    // (remonté en test live : 100% des champs introuvables alors que les
    // libellés eux-mêmes étaient corrects) — probablement un formulaire où
    // le libellé est à CÔTÉ du champ (ou dedans, libellé flottant), pas
    // au-dessus comme pour les menus déroulants (trouverDeclencheurProcheLabel).
    const centreLabel = { x: lr.left + lr.width / 2, y: lr.top + lr.height / 2 };
    let meilleur = null, meilleureDistance = Infinity;
    for (const c of candidats) {
      const r = c.getBoundingClientRect();
      const centreChamp = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      let distance = Math.hypot(centreChamp.x - centreLabel.x, centreChamp.y - centreLabel.y);
      if (r.top < lr.top - 5) distance += 1000;
      if (distance < meilleureDistance) { meilleureDistance = distance; meilleur = c; }
    }
    if (meilleur && valeurChamp(meilleur)) return meilleur; // trouvé un vrai champ rempli, on s'arrête là
    if (meilleur && meilleureDistance < meilleureDistanceGlobale) { meilleurGlobal = meilleur; meilleureDistanceGlobale = meilleureDistance; }
  }
  // Aucun des libellés ne mène (encore) à un champ rempli — repli sur le
  // meilleur candidat trouvé quand même, pour laisser la boucle d'attente
  // de surlignerChampParLabelDialogue réessayer pendant qu'il se remplit.
  return meilleurGlobal;
}

// Version VRAIMENT synchronisée au mot (contrairement à surlignerChampsRemplis
// ci-dessus, qui balaie tous les champs sur un budget fixe indépendant de ce
// qu'Alfred dit) — demandé explicitement : "il faut hilight bien les champs
// qu'on parle quand c'est dit". Utilisée pour les fiches Vendeur/Acquéreur.
// HISTORIQUE : une 1re version ciblait "le Nième champ rempli, dans l'ordre
// visuel haut → bas" (position pure) — remonté en test live comme faux : une
// vraie capture du formulaire a montré que l'ordre RÉEL des champs ("nom,
// date de naissance, nationalité, adresse, état civil...") ne correspond pas
// à l'ordre ÉNUMÉRÉ à l'oral ("nom, adresse, date de naissance,
// nationalité..."), donc viser "le 2e champ rempli" pour "adresse" visait en
// fait un autre champ, encore vide ou déjà dépassé — d'où l'impression que
// "ça remonte" (le surlignage sautait en arrière dans le formulaire). Ciblage
// par LIBELLÉ (voir SELECTEURS.labelsPartie) à la place — fiable quel que
// soit l'ordre réel des champs dans le DOM. ATTEND en plus que le champ ait
// vraiment une valeur (pas juste qu'il existe) avant de l'allumer — la
// parole démarre maintenant dès le lancement de la recherche BCE/RN (voir
// ajouterPartieParRN/BCE), donc certains mots peuvent être prononcés avant
// que LEUR champ précis soit rempli ; on attend plutôt que de risquer un
// flash sur du vide. defilerPuisSurligner (pas surlignerBrievement
// directement) : couvre aussi "il faut scroller doucement si le champ est
// en bas".
// sectionTexte (optionnel) : ne cherche le libellé QU'APRÈS cette section
// (voir apresElement dans trouverChampProcheLabelDans) — utilisé pour
// "représentants" (Vendeur), qui réutilise le libellé "Nom" alors que
// celui-ci existe AUSSI tout en haut de la fiche, déjà rempli avec la
// dénomination cherchée par BCE (donc pas vide — la règle générale "1er
// libellé rempli" retomberait dessus par erreur, à distinguer du cas
// RN où le doublon en haut reste, lui, vide).
// File d'attente PARTAGÉE entre tous les champPartieXxx (Vendeur/Acquéreur)
// — remonté en test live : "les champs s'allument en même temps, faudrait
// chacun à son tour". Deux causes cumulées : (1) defilerPuisSurligner
// n'était pas attendu (await manquant) — la fonction rendait la main dès
// le lancement du scroll, pas une fois le halo vraiment affiché, donc rien
// n'empêchait deux champs de démarrer en même temps ; (2) même sans ça,
// rien ne sérialisait deux appels déclenchés à ~1s d'écart (voir
// ECART_MIN_MS, alfred-voice.js) alors que le scroll+halo d'un seul champ
// prend plus longtemps que ça. Même principe que
// filesSurlignageColonne pour le tableau de bord.
let fileSurlignageChamp = Promise.resolve();
async function surlignerChampParLabelDialogue(labelTexte, tentatives = 30, delai = 250, sectionTexte) {
  fileSurlignageChamp = fileSurlignageChamp.then(() => surlignerChampParLabelDialogueMaintenant(labelTexte, tentatives, delai, sectionTexte));
  return fileSurlignageChamp;
}
async function surlignerChampParLabelDialogueMaintenant(labelTexte, tentatives, delai, sectionTexte) {
  let dernierChamp = null;
  for (let i = 0; i < tentatives; i++) {
    if (annulationDemandee) return;
    const dialogue = trouverDialogueOuvert();
    const section = (dialogue && sectionTexte)
      ? Array.from(dialogue.querySelectorAll('*')).find(el => el.children.length === 0 && texteCommencePar(el.textContent, sectionTexte) && el.getBoundingClientRect().width > 0)
      : null;
    const champ = dialogue ? trouverChampProcheLabelDans(dialogue, labelTexte, section) : null;
    dernierChamp = champ;
    if (champ && valeurChamp(champ)) {
      await defilerPuisSurligner(champ);
      return;
    }
    await attendre(delai);
  }
  // Traçage — remonté en test live : un surlignage manquant passait
  // jusqu'ici totalement inaperçu (le halo n'apparaît juste jamais, rien
  // dans la console pour dire pourquoi). Distingue maintenant 3 cas : le
  // libellé lui-même reste introuvable (dernierChamp null), un champ a
  // été trouvé près du libellé mais sans valeur (dernierChamp existe, pas
  // de .value — probablement le mauvais élément ciblé), ou la fenêtre
  // s'est refermée entre-temps.
  console.warn('[Alfred DOM] Champ introuvable pour le libellé:', labelTexte,
    '— fenêtre encore ouverte ?', !!trouverDialogueOuvert(),
    '— un élément a été trouvé près du libellé ?', !!dernierChamp,
    dernierChamp ? { tag: dernierChamp.tagName, valeur: valeurChamp(dernierChamp).slice(0, 40) } : null);
}

// Déclenche la parole d'un segment 'parlerDepuisAction' une fois les champs
// VRAIMENT remplis — utilisée par les fiches Vendeur/Acquéreur ET par
// seq_creationDossier_ouvrir_champs (numéro/langue/collaborateur/notaire),
// exactement le même schéma que seq_creationDossier_ouvrir_dossiers pour
// 'Ouvrir' : cherché dans la config par label + nom d'action plutôt que
// codé en dur, pour rester en phase avec le FR/NL et un futur changement de
// texte sans toucher au JS. Générique (label/actionNom en paramètres) —
// aucune logique spécifique à un écran en particulier.
async function parlerSegmentDepuisAction(label, actionNom) {
  if (typeof speak !== 'function' || typeof ALFRED_CONFIG === 'undefined') return;
  const liste = (typeof currentLangue !== 'undefined' && currentLangue === 'nl') ? ALFRED_CONFIG.REPLIQUES_NL : ALFRED_CONFIG.REPLIQUES_FR;
  const replique = liste?.find(r => r.label === label);
  const segment = replique?.segments?.find(s => s.action === actionNom);
  if (!segment?.texte) return;
  if (typeof addToHistory === 'function') addToHistory('alfred', segment.texte);
  const surbrillance = (typeof resoudreSurbrillance === 'function') ? resoudreSurbrillance(segment.surbrillance) : null;
  // Attendu (pas fire-and-forget comme pour 'Ouvrir') : contrairement à
  // 'Ouvrir', il reste une action à faire ENSUITE (cliquer "Enregistrer",
  // qui referme la fenêtre) — il faut laisser la parole/le surlignage se
  // terminer avant, sinon la fenêtre se refermerait pendant qu'Alfred énumère
  // encore les champs.
  await speak(typeof naturaliserTexte === 'function' ? naturaliserTexte(segment.texte) : segment.texte, currentLangue, segment.texte, undefined, surbrillance, segment.texte);
}

// ── Surbrillance synchronisée sur la parole ────────────────
// Demandé explicitement : "quand il dit notaire en charge, il faut le
// mettre en évidence" — pour les champs qu'on remplit NOUS-MÊMES (donc au
// rythme qu'on contrôle, pas au rythme imprévisible d'une recherche RN/BCE
// externe comme pour Vendeur/Acquéreur), une vraie synchro avec le mot
// prononcé est possible : voir programmerSurbrillanceMots dans
// alfred-voice.js, branché depuis jouerSecoursInterne (alfred-brain.js).
// Registre symbolique { motRepère: fonction qui retrouve et surligne le
// vrai champ } — vit ici, pas dans alfred-config.js, car ce fichier est le
// seul à connaître les vrais sélecteurs (SELECTEURS, trouverDeclencheur...).
// alfred-config.js ne référence que la clé symbolique (ex: "notaireEnCharge"),
// jamais un sélecteur — même séparation texte/DOM que partout ailleurs.
const SURBRILLANCE_CIBLES = {
  dossierCode:   () => defilerPuisSurligner(document.getElementById(SELECTEURS.champs.dossierCode)),
  langueActe:    () => defilerPuisSurligner(trouverDeclencheurProcheLabel(SELECTEURS.menus.langueActe)),
  collaborateur: () => defilerPuisSurligner(trouverDeclencheurProcheLabel(SELECTEURS.menus.collaborateurEnCharge)),
  notaireEnCharge: () => defilerPuisSurligner(trouverDeclencheurProcheLabel(SELECTEURS.menus.notaireEnCharge)),
  // Tableau de bord (liste des dossiers) — demandé explicitement : mettre
  // en évidence la COLONNE dont Alfred parle, pas tout le tableau. Ciblage
  // par POSITION de colonne (voir surlignerColonneDossiers), pas par texte
  // d'en-tête : le libellé FR de ce tableau n'a jamais été confirmé par
  // capture d'écran (seul le NL l'a été) — l'ordre des colonnes, lui, est
  // le même composant des deux côtés, donc fiable sans deviner de texte.
  colDossiers:      () => surlignerColonneDossiers(3), // "Dossiernummer" (capture d'écran 03/09)
  colCollaborateur: () => surlignerColonneDossiers(6), // "Medewerker"
  colStatut:        () => surlignerColonneDossiers(2), // "In uitvoering"
  // Pas juste un surlignage cette fois : une vraie ACTION (le clic sur
  // "Créer un dossier"), synchronisée sur le mot "clique"/"klik" — demandé
  // explicitement : "il faut cliquer créer quand on le dit, là il le fait
  // direct". Ce registre accepte n'importe quelle fonction, pas seulement
  // un surlignage — voir seq_creationDossier_ouvrir_creerBouton, qui ne
  // clique plus lui-même immédiatement.
  creerDossierClic: () => cliquerBouton(SELECTEURS.boutons.creerDossier),
  // Fiches Vendeur/Acquéreur (fenêtre "Ajouter une partie") — demandé
  // explicitement : surligner le bon champ pile quand Alfred le nomme, avec
  // défilement doux si besoin. Ciblage par LIBELLÉ (voir
  // SELECTEURS.labelsPartie et surlignerChampParLabelDialogue) — pas par
  // position, remonté en test live comme peu fiable (voir l'historique dans
  // surlignerChampParLabelDialogue). champPartieNom sert aussi pour
  // "représentants" côté Vendeur (même libellé "Nom"/"Achternaam", fenêtre
  // différente). Pas de cible pour "forme juridique" (voir
  // SELECTEURS.labelsPartie, libellé NL trop générique/non confirmé).
  champPartieNom:               () => surlignerChampParLabelDialogue(SELECTEURS.labelsPartie.nom),
  champPartieAdresseSiege:      () => surlignerChampParLabelDialogue(SELECTEURS.labelsPartie.adresseSiege),
  champPartieDateNaissance:     () => surlignerChampParLabelDialogue(SELECTEURS.labelsPartie.dateNaissance),
  champPartieNationalite:       () => surlignerChampParLabelDialogue(SELECTEURS.labelsPartie.nationalite),
  champPartieEtatCivil:         () => surlignerChampParLabelDialogue(SELECTEURS.labelsPartie.etatCivil),
  champPartieRegimeMatrimonial: () => surlignerChampParLabelDialogue(SELECTEURS.labelsPartie.regimeMatrimonial),
  champPartieDenomination:      () => surlignerChampParLabelDialogue(SELECTEURS.labelsPartie.denomination),
  champPartieRepresentants:     () => surlignerChampParLabelDialogue(SELECTEURS.labelsPartie.nom, 30, 250, SELECTEURS.labelsPartie.sectionRepresentants),
};

// Met en évidence une colonne entière (en-tête + toutes les cellules
// visibles) du tableau des dossiers — indexColonne : position 0-based dans
// <thead><tr><th>...</th></tr></thead> (0=case à cocher, 1=Categorie,
// 2=In uitvoering, 3=Dossiernummer, 4=Cliënten, 5=Aangemaakt op,
// 6=Medewerker — confirmé par capture d'écran 03/09). Pas d'erreur si le
// tableau n'est pas encore affiché (ex: mot prononcé avant la fin du
// chargement de la page) — simple no-op silencieux, comme surlignerBrievement.
// Attend que le tableau des dossiers soit VRAIMENT chargé, pas juste "au
// moins une ligne" — remonté en test live à deux reprises : "il parle trop
// tôt, le tableau n'est pas plein". Deux signaux combinés :
// 1) le nombre de lignes reste identique sur PLUSIEURS lectures de suite
//    (3, espacées de 250ms — env. 750ms de stabilité confirmée, contre 400ms
//    avant, remonté comme insuffisant) ;
// 2) aucun indicateur de chargement PrimeNG visible. Classes standards de la
//    librairie (déjà confirmée utilisée ici via p-datatable-tbody,
//    p-multiselect...), pas du texte applicatif deviné — plusieurs noms
//    possibles selon la version de PrimeNG, on les couvre tous par sécurité.
// Repli sur le dernier état trouvé si ça ne se stabilise jamais dans le
// budget (~7s), plutôt que de bloquer indéfiniment.
async function attendreTableauDossiersCharge() {
  let tbody = null, dernierCompte = -1, stable = 0, confirme = false;
  // Budget monté 8s → 25s — cause trouvée : le plafond précédent (32 x
  // 250ms) était atteint EXACTEMENT (remonté en test live : "action:
  // 8103ms", pile ce plafond) sans jamais avoir confirmé la stabilité —
  // la fonction abandonnait donc et laissait parler Alfred sur un tableau
  // dont on n'était pas sûr qu'il ait fini de charger. Avec beaucoup de
  // dossiers de test accumulés (5 pages), le vrai chargement peut prendre
  // plus que 8s. Priorité à la fiabilité plutôt qu'à la vitesse (décision
  // explicite : encore deux semaines avant le pitch).
  for (let i = 0; i < 100; i++) {
    if (annulationDemandee) return null;
    tbody = document.querySelector('tbody.p-datatable-tbody');
    // Vraie cause trouvée par capture d'écran en direct : ce tableau
    // n'utilise PAS d'overlay de chargement PrimeNG (aucune des classes
    // vérifiées jusqu'ici) — il affiche des lignes SQUELETTES (cases grises
    // animées) dès le tout début, avec un nombre de lignes déjà stable dès
    // le départ. La vérification précédente (compte de lignes stable)
    // passait donc alors que ce ne sont encore que des placeholders, pas les
    // vraies données. .p-skeleton : composant PrimeNG standard pour ce
    // motif (déjà confirmée utilisée ici via p-datatable-tbody/
    // p-multiselect) ; repli sur toute classe contenant "skeleton" au cas
    // où une variante différente serait utilisée.
    const squelettes = tbody ? tbody.querySelectorAll('.p-skeleton, [class*="skeleton" i]').length : 0;
    const enChargement = squelettes > 0
      || !!document.querySelector('.p-datatable-loading-overlay, .p-datatable-loading-icon, .p-datatable-loading, .p-datatable-mask');
    const compte = tbody ? tbody.querySelectorAll('tr').length : 0;
    if (!enChargement && compte > 0 && compte === dernierCompte) {
      if (++stable >= 3) { confirme = true; break; }
    } else {
      stable = 0;
    }
    dernierCompte = compte;
    await attendre(250);
  }
  // Traçage — pour savoir avec certitude, la prochaine fois qu'Alfred
  // parle "trop tôt", si c'est parce que ce plafond a été atteint sans
  // jamais confirmer la stabilité (plutôt que deviner encore).
  if (!confirme) console.warn('[Alfred DOM] Tableau dossiers : plafond d\'attente (25s) atteint SANS confirmer le chargement — lignes:', dernierCompte, 'squelettes encore présents ?', tbody ? tbody.querySelectorAll('.p-skeleton, [class*="skeleton" i]').length > 0 : '(tbody introuvable)');
  return (tbody && tbody.querySelector('tr')) ? tbody : null;
}

// File d'attente : quand les 3 colonnes (dossiers/collaborateurs/statuts)
// sont ciblées coup sur coup, l'écart minimum entre déclenchements au mot
// (ECART_MIN_MS, 1000ms — voir programmerSurbrillanceMots, alfred-voice.js)
// est plus COURT que le temps réel d'un défilement+halo complet (~1800ms
// de scroll + halo) — sans file d'attente, le scroll vers la 2e colonne
// démarrait donc AVANT que le halo de la 1re ait eu le temps de s'afficher,
// donnant l'impression de "ça scrolle à droite, à gauche, et après [le
// premier] sélecteur [s'affiche seulement là]" (remonté en test live).
// Chaque appel attend maintenant que le précédent soit VRAIMENT terminé
// (scroll + halo affiché) avant de démarrer le sien.
let filesSurlignageColonne = Promise.resolve();
function surlignerColonneDossiers(indexColonne) {
  filesSurlignageColonne = filesSurlignageColonne.then(() => surlignerColonneDossiersMaintenant(indexColonne));
  return filesSurlignageColonne;
}

async function surlignerColonneDossiersMaintenant(indexColonne) {
  const tbody = await attendreTableauDossiersCharge();
  if (!tbody) return;
  const table = tbody.closest('table') || tbody.closest('[role="table"]');
  if (!table) return;
  const enTetes = table.querySelectorAll('thead th');
  const enTete = enTetes[indexColonne];
  // Traçage — remonté en test live : la colonne mise en évidence ne
  // semblait pas être la bonne. Cette ligne dit exactement quel en-tête
  // est visé à cet index, pour confirmer/corriger avec de vraies preuves.
  console.log('[Alfred DOM] Colonne dossiers surlignée — index', indexColonne, '→ en-tête:', enTete ? JSON.stringify(enTete.textContent.trim()) : '(introuvable)', '— en-têtes disponibles:', Array.from(enTetes).map(e => JSON.stringify(e.textContent.trim())));
  if (!enTete) return;
  // Défilement HORIZONTAL — remonté en test live : avec le panneau Alfred
  // ouvert, le site est rétréci et ce tableau déborde ; la colonne visée
  // (surtout Medewerker/Notaris, plus à droite) peut être hors champ sans
  // faire défiler la molette latéralement. Utilisait scrollIntoView natif
  // (durée non réglable) — remonté en test live comme trop rapide, remplacé
  // par defilerVersElementHorizontal (même durée maîtrisée que les autres
  // défilements du script). Durée réduite (1800 → 1100ms) — remonté en test
  // live comme trop lent sur cette réplique précise (Ouvrir/tableau de bord).
  await defilerVersElementHorizontal(enTete, 1100);
  await attendre(300);
  // UN seul cadre autour de TOUTE la colonne (en-tête + lignes visibles),
  // pas un flash par cellule — demandé explicitement : "juste entourer la
  // colonne, pas les lignes aussi" (un halo par ligne donnait l'impression
  // de surligner les LIGNES plutôt que la colonne). On calcule le
  // rectangle englobant tous ces éléments, à jour APRÈS le défilement
  // ci-dessus, et on pose un seul cadre dessus (voir surlignerRectangle).
  const cellules = Array.from(tbody.querySelectorAll('tr'))
    .map(tr => tr.children[indexColonne])
    .filter(td => td && td.getBoundingClientRect().width > 0);
  const rects = [enTete, ...cellules].map(el => el.getBoundingClientRect());
  const left   = Math.min(...rects.map(r => r.left));
  const right  = Math.max(...rects.map(r => r.right));
  const top    = Math.min(...rects.map(r => r.top));
  const bottom = Math.max(...rects.map(r => r.bottom));
  // Remonté à 1000ms — 550ms était trop court pour l'œil humain (remonté
  // explicitement). Le raccourcissement précédent voulait éviter tout
  // chevauchement avec le halo suivant, mais rien n'oblige le halo à
  // rester contenu dans la fenêtre de l'audio : SEUL le moment où il se
  // DÉCLENCHE doit rester calé sur le mot prononcé (voir le plafond dans
  // programmerSurbrillanceMots) — combien de temps il reste ensuite
  // affiché à l'écran n'a aucune contrainte technique. Un léger
  // chevauchement visuel entre deux colonnes proches n'est pas un
  // problème en soi, la lisibilité passe avant.
  surlignerRectangle({ left, top, width: right - left, height: bottom - top }, 1000);
  // Attend que le halo ait vraiment eu le temps de s'afficher avant de
  // considérer cette colonne "terminée" — sinon la file d'attente
  // ci-dessus ne servirait à rien : le prochain scroll pourrait démarrer
  // dès l'appel de surlignerRectangle (non-bloquant), pas après.
  await attendre(1000);
}

// Cadre autour d'une ZONE (rectangle en coordonnées viewport, ex. tout un
// bloc de tableau), plutôt qu'un élément unique — un calque flottant
// (position: fixed), même animation/couleur que surlignerBrievement, retiré
// tout seul après la durée donnée.
function surlignerRectangle(rect, dureeMs = 1500) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return;
  assurerStyleSurbrillance();
  const calque = document.createElement('div');
  calque.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px; pointer-events:none; z-index:99999;`;
  calque.style.setProperty('--alfred-surbrillance-duree', dureeMs + 'ms');
  calque.classList.add('alfred-surbrillance');
  document.body.appendChild(calque);
  setTimeout(() => calque.remove(), dureeMs + 100);
}

// Durée FIXE, volontairement lente, pour defilerPuisSurligner — HISTORIQUE :
// une version basée sur la distance (vitesse constante en px/s) avait été
// essayée entre-temps pour corriger "parfois vite, parfois lentement" —
// annulée : retour explicite, ce n'était PAS le bon réglage ("il faut
// vraiment prendre le temps de sélectionner chaque champ indépendamment et
// descendre petit à petit... des fois encore plus rapide, pourquoi ?").
// Ce qui est demandé, c'est une durée CONSTANTE et délibérément lente pour
// CHAQUE champ, peu importe sa distance — pas une vitesse de défilement
// constante (qui fait varier la durée). Zéro variabilité par construction.
// Relevé une 2e fois (1200 → 2000) — retour explicite après test live avec
// la séquence déjà corrigée (plus de flashs simultanés) : "le scroll est
// toujours rapide, ça apparaît au fur et à mesure, sois plus lent".
// Relevé une 3e fois (2000 → 2500), plus léger cette fois ("le scroll
// pourrait être plus lent") — voir aussi le filet de sécurité de
// visibilité ajouté dans defilerPuisSurligner juste plus bas.
const DUREE_DEFILEMENT_CHAMP_MS = 2500;

// Défilement AUTOMATIQUE (pas une réplique à part, pas de flèche dédiée) —
// question posée explicitement : "pour les surligneurs, faut pas faire les
// scrolls auto ?". Différent des gros scrolls narratifs (RedactionGauche/
// Droite, ClausePEB), qui restent volontairement des répliques séparées
// pilotées à la flèche : ici, c'est juste un filet de sécurité — si le champ
// visé est déjà visible (cas normal sur cet écran), defilerVersElement() ne
// fait RIEN ; s'il est hors champ, un défilement doux et lent le ramène à
// l'écran juste avant de s'allumer, sinon le surlignage se déclencherait
// invisible pour le public.
// defilerVersElement (vertical) ne vérifiait QUE r.top/r.bottom pour
// décider si l'élément était "déjà visible" (et donc sauter le scroll) —
// avec le panneau Alfred ouvert, un champ peut être dans les bonnes
// limites verticales mais coupé HORIZONTALEMENT (site rétréci) : le
// scroll vertical se sautait alors entièrement, et le halo s'allumait sur
// un champ pas vraiment visible à l'écran — remonté en test live ("zetel"
// notamment) comme un flash trop rapide/rushed. defilerVersElementHorizontal
// couvre ce cas (no-op silencieux si déjà visible horizontalement aussi).
async function defilerPuisSurligner(el) {
  if (!el) return;
  await defilerVersElement(el, DUREE_DEFILEMENT_CHAMP_MS);
  await defilerVersElementHorizontal(el, DUREE_DEFILEMENT_CHAMP_MS);
  // Filet de sécurité : le scroll horizontal (juste au-dessus) peut, sur
  // certains champs, rejouer un recentrage vertical (repli scrollIntoView
  // de defilerVersElementHorizontal quand aucun conteneur horizontal n'est
  // trouvé) — remonté en test live le 04/09 ("parfois on scrolle trop et
  // les choses highlight sont au-dessus, faut que tout soit affichable"),
  // surtout côté Acquéreur, un peu aussi côté Vendeur. Plutôt que
  // deviner pourquoi le recentrage vertical déjà fait plus haut ne tient
  // pas toujours, on RE-VÉRIFIE après coup si le champ est réellement dans
  // le cadre du conteneur (pas la fenêtre entière — un champ peut être
  // légitimement caché derrière le panneau Alfred sans que ce soit une
  // erreur) et on corrige d'un coup, sans animation, si besoin — jamais de
  // surlignage sur un champ resté hors cadre.
  const conteneurV = trouverConteneurDefilant(el);
  const rectRef = conteneurV
    ? conteneurV.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
  const r = el.getBoundingClientRect();
  const visible = r.top >= rectRef.top && r.bottom <= rectRef.bottom && r.left >= rectRef.left && r.right <= rectRef.right;
  if (!visible) {
    el.scrollIntoView({ block: 'center', inline: 'center' });
    await attendre(150);
  }
  surlignerBrievement(el);
}

// Traduit les entrées symboliques {mots, cible} d'une réplique/segment
// (alfred-config.js) en entrées {motsCles, action} exploitables par
// speak() (voir programmerSurbrillanceMots dans alfred-voice.js).
function resoudreSurbrillance(entrees) {
  if (!entrees || !entrees.length) return null;
  return entrees
    .filter(e => typeof SURBRILLANCE_CIBLES[e.cible] === 'function')
    .map(e => ({ motsCles: e.mots, action: SURBRILLANCE_CIBLES[e.cible] }));
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

// options.pendantRecherche() : appelé dès le clic sur "Rechercher" (pas
// après), à la place du balayage générique surlignerChampsRemplis — utilisé
// par seq_creationDossier_parties_vendeur/acquereur pour déclencher la
// parole ('parlerDepuisAction') dès le lancement de la recherche BCE/RN et
// surligner chaque champ par son libellé réel (voir parlerSegmentDepuisAction
// et surlignerChampParLabelDialogue) une fois qu'il a VRAIMENT une valeur —
// demandé explicitement : "le plus simple c'est de cliquer d'abord, et
// parler au moment où on commence à encoder". Repli sur l'ancien balayage
// générique si non fourni (aucun appelant ne perd son comportement).
async function ajouterPartieParRN(qualite, rn, options = {}) {
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
  // Parole déclenchée ICI, PENDANT l'attente réseau ci-dessous (pas après) —
  // demandé explicitement : "le plus simple c'est de cliquer d'abord, et
  // parler au moment où on commence à encoder". Chaque surlignage de champ
  // (voir surlignerChampParLabelDialogue) attend lui-même que SON champ ait
  // une vraie valeur avant de s'allumer, donc pas de risque de flash sur un
  // champ encore vide même si la parole est en avance sur le remplissage.
  const parole = (typeof options.pendantRecherche === 'function') ? options.pendantRecherche() : null;
  await attendre(3200); // laisse largement le temps à la recherche e-notariat de remplir le formulaire (attente réseau réelle, pas juste cosmétique — non raccourcie)
  // Plus gros délai fixe non-annulable de toute la séquence (3,2s) — vérifié
  // ici pour ne pas continuer sur "Enregistrer" après une annulation.
  if (annulationDemandee) { if (parole) await parole; return false; }
  // Signal fiable plutôt qu'un délai deviné (demandé par l'utilisatrice,
  // le délai fixe précédent était trop variable) : on capture la fenêtre
  // "Ajouter une partie" avant de cliquer "Enregistrer", puis on attend
  // qu'elle se referme vraiment (jusqu'à 15s) — c'est ce que fait l'appli
  // elle-même une fois l'enregistrement terminé côté serveur.
  const dialogue = trouverDialogueOuvert();
  // Attend la fin de la parole/des surlignages avant "Enregistrer" — sinon
  // la fenêtre se refermerait pendant qu'Alfred énumère encore les champs.
  // Repli sur l'ancien balayage générique si aucune parole n'est fournie
  // (aucun appelant actuel ne perd son comportement).
  if (parole) {
    await parole;
  } else {
    await surlignerChampsRemplis(dialogue, 2400);
  }
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
async function ajouterPartieParBCE(qualite, bce, options = {}) {
  const occurrencesAvant = compterOccurrencesTexte(qualite);
  await choisirDansDropdown(SELECTEURS.menus.qualitePartie, qualite);
  await attendre(500);
  await cliquerBouton(SELECTEURS.boutons.ajouter);
  await attendre(700);
  await cliquerBouton(SELECTEURS.boutons.personneMorale);
  await attendre(700);
  await taperDansChamp(SELECTEURS.champs.rechercheBCE, bce);
  await cliquerBouton(SELECTEURS.boutons.rechercher);
  // Parole + attente/fermeture — voir la note équivalente dans
  // ajouterPartieParRN juste au-dessus (même options.pendantRecherche, même
  // raison).
  const parole = (typeof options.pendantRecherche === 'function') ? options.pendantRecherche() : null;
  await attendre(3200); // laisse largement le temps à la recherche BCE de remplir le formulaire (attente réseau réelle, pas juste cosmétique — non raccourcie)
  // Plus gros délai fixe non-annulable de toute la séquence (3,2s) — vérifié
  // ici pour ne pas continuer sur "Enregistrer" après une annulation.
  if (annulationDemandee) { if (parole) await parole; return false; }
  const dialogue = trouverDialogueOuvert();
  if (parole) {
    await parole;
  } else {
    await surlignerChampsRemplis(dialogue, 2400);
  }
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
  const candidatsSection = (Array.isArray(titreSection) ? titreSection : [titreSection]).map(t => t.toLowerCase());
  for (let i = 0; i < 16; i++) {
    titre = Array.from(document.querySelectorAll('*'))
      .find(el => el.children.length === 0 && candidatsSection.includes(el.textContent.trim().toLowerCase()) && el.getBoundingClientRect().width > 0);
    if (titre) break;
    await attendre(500);
  }
  if (!titre) { console.warn('[Alfred DOM] Section introuvable:', titreSection); return false; }
  titre.scrollIntoView({ block: 'center' });
  await attendre(300);

  const tr = titre.getBoundingClientRect();
  // startsWith plutôt que "contient" — même piège que "Koper"/"Verkoper"
  // dans choisirDansDropdown() : le badge cherché ('Koper') est un sous-mot
  // du badge de l'AUTRE partie ('Verkoper vertegenwoordigd door uw studie'),
  // donc une comparaison "contient" pouvait matcher le mauvais badge. Le
  // vrai suffixe (FR "représenté(e) par votre étude", NL "vertegenwoordigd
  // door uw studie") vient toujours APRÈS le mot de qualité, jamais dedans
  // — startsWith reste donc correct pour ce cas tout en excluant l'autre.
  const candidatsQualite = (Array.isArray(qualitePartie) ? qualitePartie : [qualitePartie]).map(q => q.toLowerCase());
  const badge = Array.from(document.querySelectorAll('*'))
    .filter(el => el.children.length === 0 && candidatsQualite.some(q => el.textContent.trim().toLowerCase().startsWith(q)) && el.getBoundingClientRect().width > 0)
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
  // Vérifiée AVANT de cliquer — ça manquait : sans ça, rejouer cette
  // fonction sur une case déjà cochée la décocherait (clic = bascule),
  // au lieu de la laisser telle quelle.
  if (checkbox.checked) return true;
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

// Cherche puis ajoute un notaire (recherche dans la liste de l'étude) via
// la modale "Rechercher dans votre liste de notaires" — NE coche PAS la
// case "REPRÉSENTE" (voir cocherRepresentation, séparée, à appeler par
// l'appelant une fois prêt). Séparée exprès (04/09) — demandé
// explicitement : chercher/ajouter le notaire doit se faire AVANT les
// cases à cocher (Vendeur ET Acquéreur), qui se font maintenant ensemble
// dans une étape séparée (voir seq_creationDossier_parties_notaireVendeur/
// notaireAcquereur) — auparavant, tout (recherche + case) se faisait d'un
// coup ici.
async function rechercherEtAjouterNotaire(nomNotaire) {
  if (!nomNotaire) return false;
  // Le bouton "Ajouter un notaire" (SELECTEURS.boutons.ajouterNotaire)
  // n'existe pas sur cet écran — confirmé par capture de clics en direct :
  // il faut repasser par le même menu "qualité" que pour Vendeur/Acquéreur
  // (choisir "Notaire"), puis le même bouton "+" générique — exactement
  // comme ajouterPartieParRN/ajouterPartieParBCE. Avant, le clic sur
  // "Ajouter un notaire" échouait silencieusement (aucun match), donc
  // Maxime n'était jamais recherché ni ajouté.
  await choisirDansDropdown(SELECTEURS.menus.qualitePartie, SELECTEURS.textes.qualiteNotaire);
  await attendre(500);
  if (!await cliquerBouton(SELECTEURS.boutons.ajouter)) return false;
  await attendre(600);
  let input = null;
  for (let i = 0; i < 15; i++) {
    input = trouverParPlaceholder(SELECTEURS.placeholders.rechercheNotaire) || trouverSeulChampTexteDialogueOuvert();
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
      // Même famille de bug que le menu "Compromis" et les cases REPRÉSENTE :
      // le clic sur le <li> ne referme pas toujours la liste (le vrai
      // gestionnaire écoute parfois l'élément interne, pas le <li>
      // lui-même) — si la liste est encore là, on retente sur le <span>
      // interne. Remonté en test live : le bouton "Ajouter" de confirmation
      // qui suit ne faisait rien, probablement parce que la sélection
      // n'avait jamais vraiment été enregistrée.
      if (opt.isConnected && opt.getBoundingClientRect().width > 0) {
        const cible = opt.querySelector('span') || opt;
        await curseurVersAsync(cible, () => simulerClic(cible));
        await attendre(500);
      }
      trouve = true;
      // Retour direct : mettre en évidence le notaire trouvé/sélectionné,
      // en rythme avec la réplique ("Je le retrouve dans la base de tous
      // les notaires belges...").
      surlignerBrievement(opt);
      break;
    }
    console.warn('[Alfred DOM] Notaire introuvable avec le terme de recherche:', terme);
  }
  if (!trouve) { console.warn('[Alfred DOM] Échec du rattachement du notaire:', nomNotaire); return false; }

  // Confirme l'ajout du notaire sélectionné. Deux boutons "Ajouter"
  // coexistent à ce moment précis (confirmé par capture de clics en
  // direct) : celui qui a ouvert ce panneau (classe "items-end", encore
  // dans le DOM) et le vrai bouton de confirmation (classe "justify-end").
  // cliquerBouton (recherche générique par texte) tombait sur le premier
  // trouvé dans le DOM — pas forcément le bon — d'où le clic "qui ne
  // marchait pas". On cible spécifiquement celui dans un conteneur
  // "justify-end", comme vu dans les deux captures.
  let btnConfirmer = null;
  for (let i = 0; i < 15; i++) {
    btnConfirmer = Array.from(document.querySelectorAll('button'))
      .find(b => texteCorrespond(b.textContent, SELECTEURS.boutons.ajouter) && b.getBoundingClientRect().width > 0 && b.closest('.justify-end'));
    if (btnConfirmer) break;
    await attendre(300);
  }
  if (btnConfirmer) {
    // defilerVersElement manquait ici — contrairement à cliquerBouton()
    // (qui le fait toujours), ce clic ciblé le zappait, donc le bouton
    // pouvait être cliqué hors écran, sans le défilement doux ni le temps
    // de voir ce qui se passe avant "Enregistrer"/"Ajouter", comme pour
    // toutes les autres actions du script.
    await defilerVersElement(btnConfirmer);
    await curseurVersAsync(btnConfirmer, () => simulerClic(btnConfirmer));
  } else {
    console.warn('[Alfred DOM] Bouton "Ajouter" de confirmation (justify-end) introuvable — repli sur la recherche générique.');
    await cliquerBouton(SELECTEURS.boutons.ajouter, 6);
  }
  await attendre(1000); // légèrement remonté (800→1000) : la section "REPRÉSENTE" (cochée séparément par l'appelant, voir cocherRepresentation) met parfois plus longtemps à apparaître

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
      .find(li => texteCorrespond(li.textContent, SELECTEURS.textes.optionCompromis) && li.getBoundingClientRect().width > 0);
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
// "Demande d'Alfred" ET "Email à valider" simultanément).
//
// Confirmé en test live par capture d'écran (02/09) : la version
// précédente remontait depuis CHAQUE bouton "Consulter" (dans l'ordre du
// DOM, donc "Demande d'Alfred" en premier puisqu'affiché au-dessus) et
// s'arrêtait au premier ancêtre dont le texte CONTENAIT titreEvenement —
// mais un ancêtre assez large (le conteneur du fil d'événements entier)
// contient le texte des DEUX cartes à la fois, donc ce test devenait vrai
// pour le bouton de "Demande d'Alfred" avant même d'avoir examiné celui
// de "Email à valider". Résultat : le clic partait sur la mauvaise carte.
//
// Inversé : on part du titre (l'élément le plus SPÉCIFIQUE — donc le plus
// court — dont le texte contient titreEvenement, pas un ancêtre large qui
// engloberait aussi d'autres cartes), puis on descend chercher le bouton
// "Consulter" propre à ce sous-arbre.
function trouverConsulterPourEvenement(titreEvenement) {
  const candidats = Array.from(document.querySelectorAll('*'))
    .filter(el => el.getBoundingClientRect().width > 0 && texteContient(el.textContent, titreEvenement));
  if (!candidats.length) return null;
  candidats.sort((a, b) => a.textContent.length - b.textContent.length);
  let carte = candidats[0];
  for (let i = 0; i < 8 && carte; i++) {
    const bouton = Array.from(carte.querySelectorAll('button'))
      .find(b => texteCorrespond(b.textContent, SELECTEURS.boutons.consulter) && b.getBoundingClientRect().width > 0);
    if (bouton) return bouton;
    carte = carte.parentElement;
  }
  return null;
}

// Ouvre le panneau Alfred sur l'onglet "Conversation" (le vrai chatbot de
// l'appli, différent du micro du bookmarklet) — utilisé par la réplique
// InvitationQuestions, pour que le panneau soit déjà ouvert et prêt au
// moment où Alfred invite à poser une question en direct (zone inondable,
// régime matrimonial, surface cadastrale — voir la note sur InvitationQuestions
// dans alfred-config.js). Sans ça, Fariël devait cliquer elle-même sur
// l'icône Alfred en plein direct avant de pouvoir taper sa question.
async function seq_ouvrirChatConversation() {
  await ouvrirPanneauAlfred();
  const onglet = trouverOnglet(SELECTEURS.onglets.conversation);
  if (onglet) curseurVers(onglet, () => onglet.click());
  await attendre(600);
}

// Trouve le champ de saisie de l'onglet Conversation/Gesprek (voir
// SELECTEURS.placeholders.questionAlfred) — pas de nom/id connu, ciblé par
// son placeholder plutôt que par position.
function trouverChampQuestionAlfred() {
  const candidats = Array.from(document.querySelectorAll('input, textarea'));
  return candidats.find(el => {
    const ph = (el.getAttribute('placeholder') || '').toLowerCase();
    return el.getBoundingClientRect().width > 0 && SELECTEURS.placeholders.questionAlfred.some(p => ph.includes(p.toLowerCase()));
  }) || null;
}

// Le bouton d'envoi (icône avion en papier, capture d'écran 04/09) n'a ni
// texte ni aria-label connu — cherché comme le premier bouton visible dans
// les ancêtres proches du champ de saisie plutôt que deviné par un
// sélecteur CSS précis.
function trouverBoutonEnvoyerQuestion(champ) {
  if (!champ) return null;
  let parent = champ.parentElement;
  for (let i = 0; i < 4 && parent; i++) {
    const bouton = Array.from(parent.querySelectorAll('button, [role="button"]'))
      .find(el => el !== champ && el.getBoundingClientRect().width > 0);
    if (bouton) return bouton;
    parent = parent.parentElement;
  }
  return null;
}

// Zone de mesure pour attendreReponseChatbot — document.body ENTIER,
// PAS un ancêtre du champ. Une 1re version remontait un nombre fixe de
// niveaux (8) depuis le champ pour rester "locale" — mais sans sélecteur
// confirmé pour la vraie liste de messages du chatbot (composant PrimeNG,
// potentiellement rendu ailleurs dans le DOM, ex. en overlay/portal), rien
// ne garantissait que la réponse d'Alfred apparaisse bien À L'INTÉRIEUR de
// ces 8 niveaux — remonté en test live le 04/09 : le Q&A restait "toujours
// trop vite" même après ce 1er correctif, signe que la zone mesurée ne
// voyait probablement jamais la vraie réponse arriver (donc "stabilisée"
// dès le début, à tort). document.body est moins précis (risque de faux
// positif si autre chose bouge ailleurs sur la page) mais au moins
// GARANTI de contenir la réponse, où qu'elle s'affiche réellement.
function zonePanneauConversation() {
  return document.body;
}

// Attend que la réponse d'Alfred arrive ET cesse de changer (fin d'un
// éventuel effet de frappe/stream côté chatbot) avant de continuer —
// remplace une pause fixe, demandé explicitement en test live le 04/09 :
// "il va trop vite, alfred prend beaucoup de temps à répondre". Pas de
// sélecteur connu pour repérer un message précis : heuristique générique
// (longueur de texte de la zone) plutôt qu'un sélecteur probablement faux.
// maxMs : plafond de sécurité si jamais rien ne se stabilise (ne bloque
// jamais la démo indéfiniment). Renvoie true si une réponse a bien été
// détectée avant ce plafond, false sinon (l'appelant continue quand même).
async function attendreReponseChatbot(zone, maxMs = 25000, stabiliteMs = 1500) {
  if (!zone) { await attendre(4000); return false; }
  const debut = performance.now();
  await attendre(700); // laisse d'abord la bulle de la question elle-même s'afficher
  let derniereLongueur = zone.textContent.length;
  let dernierChangement = performance.now();
  while (performance.now() - debut < maxMs) {
    if (annulationDemandee) return false;
    await attendre(400);
    const longueur = zone.textContent.length;
    if (longueur !== derniereLongueur) {
      derniereLongueur = longueur;
      dernierChangement = performance.now();
    } else if (performance.now() - dernierChangement >= stabiliteMs) {
      return true;
    }
  }
  return false;
}

// Tape (effet de frappe, voir taper()) puis envoie une question dans le
// vrai chatbot de l'appli (onglet Conversation), pour de vrai — clic sur
// le bouton d'envoi si trouvé, sinon repli sur Entrée (comportement
// standard de la plupart des chats). Attend ensuite la réponse (voir
// attendreReponseChatbot) avant de rendre la main à l'appelant.
async function poserQuestionAlfred(texte) {
  let champ = null;
  for (let i = 0; i < 10; i++) {
    champ = trouverChampQuestionAlfred();
    if (champ) break;
    await attendre(300);
  }
  if (!champ) { console.warn('[Alfred DOM] Champ de question (onglet Conversation) introuvable — question non posée :', texte); return false; }
  const zone = zonePanneauConversation();
  await curseurVersAsync(champ, () => champ.focus());
  await taper(champ, texte);
  await attendre(300);
  const bouton = trouverBoutonEnvoyerQuestion(champ);
  if (bouton) {
    await curseurVersAsync(bouton, () => simulerClic(bouton));
  } else {
    console.warn('[Alfred DOM] Bouton d\'envoi introuvable — repli sur Entrée pour :', texte);
    validerChamp(champ);
  }
  // Log de confirmation explicite — demandé (« comment savoir si ça
  // marche ? ») : sans lui, rien ne prouvait dans la console qu'une
  // question avait vraiment été tapée + envoyée (le seul log existant
  // avant ne couvrait que l'échec).
  console.log('[Alfred DOM] Question posée dans le chatbot :', texte, bouton ? '(envoyée via le bouton)' : '(envoyée via Entrée)');
  const reponseDetectee = await attendreReponseChatbot(zone);
  console.log(reponseDetectee
    ? '[Alfred DOM] Réponse détectée (contenu stabilisé) pour : ' + texte
    : '[Alfred DOM] Aucune réponse détectée après le délai max — on enchaîne quand même : ' + texte);
  return true;
}

// Pose, une à une (demandé explicitement : "il faut poser les questions 1
// à 1"), les 3 questions fixes du Q&A live (QUESTIONS_LIVE_FR/NL, voir
// alfred-config.js) dans le vrai chatbot de l'appli — remplace le Q&A
// jusqu'ici volontairement non scripté (Fariël tapait elle-même en
// direct, voir réplique PoserQuestions). Chaque question attend la
// réponse précédente (voir poserQuestionAlfred/attendreReponseChatbot)
// avant d'être posée.
async function seq_poserQuestionsAlfred() {
  await seq_ouvrirChatConversation();
  const liste = (typeof currentLangue !== 'undefined' && currentLangue === 'nl') ? ALFRED_CONFIG.QUESTIONS_LIVE_NL : ALFRED_CONFIG.QUESTIONS_LIVE_FR;
  if (!Array.isArray(liste) || !liste.length) { console.warn('[Alfred DOM] QUESTIONS_LIVE introuvable dans la config.'); return; }
  let reussies = 0;
  for (const question of liste) {
    if (annulationDemandee) return;
    if (await poserQuestionAlfred(question)) reussies++;
    await attendre(800);
  }
  console.log(`[Alfred DOM] Q&A live terminé : ${reussies}/${liste.length} question(s) posée(s) dans le chatbot.`);
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
    const replique = liste?.find(r => r.label === 'Email'); // ex-'CreationEmail' — label raccourci, action inchangée
    const segment = replique?.segments?.find(s => s.action === 'CreationEmail_Envoyer');
    if (segment?.texte) {
      if (typeof addToHistory === 'function') addToHistory('alfred', segment.texte);
      // await ajouté le 04/09 — SANS lui, cette fonction (donc toute la
      // réplique EmailEnvoyer aux yeux de jouerSecoursInterne, voir
      // alfred-brain.js) pouvait rendre la main avant la fin réelle de la
      // narration : en Jouer tout, la réplique suivante démarrait alors
      // que celle-ci parlait encore — remonté en test live comme un
      // mélange de voix (avant le filet de sécurité stopAudio ajouté
      // entre-temps) puis, une fois ce filet en place, comme une narration
      // coupée en plein milieu ("il est abort en plein milieu, il continue
      // direct pour la suite"). Même correctif que CreationOuvrir_Dossiers
      // et CreationReponseVendeur plus bas dans ce fichier.
      await speak(typeof naturaliserTexte === 'function' ? naturaliserTexte(segment.texte) : segment.texte, currentLangue, segment.texte);
    }
  }

  await curseurVersAsync(consulter, () => consulter.click());
  await attendre(1200);

  // Capturé AVANT le clic "Valider et envoyer" (donc avant que le mail
  // d'Alfred n'existe) — sert de repère pour reconnaître, juste après,
  // qu'un mail vraiment NOUVEAU est arrivé côté boîte réelle (voir
  // attendreNouveauMailPuisRepondre, alfred-config.js). Silencieux si le
  // mot de passe partagé n'est pas encore stocké — ne doit jamais bloquer
  // ce qui suit.
  const baselineMessageId = (typeof obtenirDernierMailIdAlfred === 'function') ? await obtenirDernierMailIdAlfred() : null;

  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.validerEtEnvoyer, 10, 500)) {
    console.warn('[Alfred DOM] Bouton "Valider et envoyer" introuvable ou inactif — mail non envoyé.');
    return false;
  }
  await attendre(1200);

  // Réponse automatique du vendeur — REMISE le 04/09, demandé explicitement
  // ("remets le comportement de répondre auto, on connaît le format du
  // sujet maintenant"). Avait été retirée le 03/09 : le sujet cherché était
  // codé en dur ('Documents et informations'), qui ne correspondait à
  // aucun vrai sujet observé (le vrai format est "Verkoop door X aan Y
  // (code-dossier-unique-par-run)", jamais deux fois identique) — la
  // recherche IMAP échouait donc systématiquement après le tout premier
  // test, confondu à l'époque avec un vrai bug backend ("ERROR.EMAIL").
  // Corrigé côté api/vendeur-reply.js (recherche par expéditeur + plus
  // récent, voir trouverMailAlfred). Lancée ici en ARRIÈRE-PLAN, SANS await
  // : la version précédente bloquait la démo en direct jusqu'à 3 min
  // (poll d'un nouveau mail) avant de retenter l'envoi — symptôme remonté
  // en test live ("on ne passe plus à l'acte 3"). La présentation continue
  // donc tout de suite vers ReponseVendeur (narration manuelle), l'envoi
  // réel se termine en coulisses ; un échec éventuel (mot de passe pas
  // stocké, vrai bug backend qui reviendrait...) reste un simple
  // avertissement console, jamais bloquant.
  if (typeof attendreNouveauMailPuisRepondre === 'function') {
    attendreNouveauMailPuisRepondre(baselineMessageId)
      .then((resultat) => {
        if (resultat?.ok) console.log('[Alfred DOM] Réponse automatique du vendeur envoyée.', resultat.data);
        else console.warn('[Alfred DOM] Réponse automatique du vendeur : échec (voir détail).', resultat);
      })
      .catch((e) => console.warn('[Alfred DOM] Réponse automatique du vendeur : exception.', e));
  }

  console.log('[Alfred DOM] Mail envoyé au vendeur. Réponse automatique lancée en arrière-plan (voir ci-dessus pour le résultat).');
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
    return txt === '×' || txt === '✕' || txt === 'X' || label.includes('fermer') || label.includes('close') || label.includes('sluiten');
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
      || trouverParPlaceholder(SELECTEURS.placeholders.rechercheCommune)
      || trouverSeulChampTexteDialogueOuvert();
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
  const [codePostal, nomCommune] = bien.commune.split(/[—-]/).map(s => s && s.trim());

  await curseurVersAsync(input, () => input.focus());
  await attendre(200);
  await taper(input, nomCommune || bien.commune);

  // Un menu d'auto-complétion s'ouvre PENDANT la frappe (avant même de
  // cliquer "Rechercher") — il faut cliquer la bonne commune dedans pour
  // la sélectionner réellement, sinon "Rechercher" reste sans effet
  // (texte libre non reconnu). Remonté en test live : "avant il arrivait
  // à taper Coxyde et à sélectionner la bonne commune, maintenant il
  // écrit juste, sans sélectionner".
  //
  // Confirmé par capture d'écran en NL : taper "Coxyde" (nom FR configuré)
  // fait quand même remonter la bonne suggestion côté appli, mais affichée
  // sous son nom NÉERLANDAIS ("8670 — Koksijde", pas "Coxyde") — beaucoup
  // de communes belges ont un nom différent en FR/NL. Comparer seulement
  // au nom FR configuré ratait donc systématiquement la suggestion en NL.
  // Le CODE POSTAL, lui, ne change pas selon la langue — on matche
  // d'abord dessus, et seulement en repli sur le nom.
  let optionCommune = null;
  for (let i = 0; i < 10; i++) {
    optionCommune = Array.from(document.querySelectorAll('li'))
      .find(el => {
        if (el.getBoundingClientRect().width === 0) return false;
        const t = el.textContent.trim().toLowerCase();
        return (codePostal && t.includes(codePostal.toLowerCase())) || t.includes((nomCommune || bien.commune).toLowerCase());
      });
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
      // Ciblage par classe PrimeNG SEULE, sans vérifier le texte — repéré
      // en test live NL : le texte "sélectionner des biens" était codé en
      // dur en français ici (oublié lors du passage bilingue), donc jamais
      // retrouvé en néerlandais. Inutile en fait : à ce stade (juste après
      // la recherche CADASTRE), ce multiselect est le seul visible sur
      // l'écran, la classe suffit à elle seule à l'identifier, quelle que
      // soit la langue.
      const precis = Array.from(document.querySelectorAll('.p-multiselect-label, .p-multiselect'))
        .find(e => e.getBoundingClientRect().width > 0);
      if (precis) return precis;

      // Repli très improbable (si jamais ce composant n'a pas cette classe
      // PrimeNG) — texte FR uniquement, jamais confirmé en NL.
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
    // type_nl (bien.type_nl, alfred-config.js) : l'option du dropdown n'est
    // PAS "Maison" côté NL, c'est "Huis" — comparaison stricte ci-dessous,
    // donc un seul texte codé en dur pour les deux langues ne pouvait
    // jamais matcher en NL. Remonté en test live le 04/09 : le type de
    // bien restait vide côté NL, et avec lui la matrice cadastrale,
    // jamais récupérable puisque le type n'avait jamais été sélectionné.
    const typeTexte = (typeof currentLangue !== 'undefined' && currentLangue === 'nl' && bien.type_nl) ? bien.type_nl : bien.type;
    let trouve = false;
    for (let i = 0; i < 15; i++) {
      const opt = Array.from(document.querySelectorAll('li'))
        .find(li => li.textContent.trim() === typeTexte && li.getBoundingClientRect().width > 0);
      if (opt) { await curseurVersAsync(opt, () => simulerClic(opt)); await attendre(200); trouve = true; break; }
      await attendre(200);
    }
    if (!trouve) console.warn('[Alfred DOM] Option de type de bien introuvable dans le dropdown :', typeTexte);
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
// Segment marqué parlerDepuisAction (voir alfred-brain.js, alfred-config.js
// — réplique 'Ouvrir') : Alfred ne parle plus dès l'appui sur → comme
// partout ailleurs, il ATTEND vraiment que le tableau soit chargé avant de
// commencer sa phrase — demandé explicitement : "il faut attendre qu'il y
// ait du contenu dans le tableau avant de parler". Même principe déjà
// utilisé pour l'email ("Email à valider") ou la réponse du vendeur : le
// texte n'est plus déclenché automatiquement en parallèle de l'action,
// c'est cette fonction qui appelle speak() elle-même, au bon moment.
async function seq_creationDossier_ouvrir_dossiers() {
  // Même sélecteur fiable que seq_ouvrirDossier, plutôt que
  // naviguerVers/trouverNav qui est trop large et peut cliquer sur le
  // mauvais élément.
  const navLinks = document.querySelectorAll('a.nav-link.uppercase');
  const dossiers = Array.from(navLinks).find(el => texteCorrespond(el.textContent, SELECTEURS.textes.lienDossiers));
  if (dossiers) {
    curseurVers(dossiers, () => dossiers.click());
  } else {
    console.warn('[Alfred DOM] Lien "Dossiers" introuvable');
  }
  // Attend que le tableau soit vraiment chargé (même fonction que
  // surlignerColonneDossiers plus bas — voir attendreTableauDossiersCharge),
  // appliquée ici en amont pour retarder la PAROLE elle-même, pas juste la
  // mise en évidence. Remonté deux fois en test live : "il parle trop tôt".
  const tbody = await attendreTableauDossiersCharge();
  if (!tbody) await attendre(1800); // repli : comportement d'avant si le tableau n'apparaît jamais

  // Déclenche la parole ICI (voir la note en tête de fonction) — cherché
  // dans la config plutôt que codé en dur, pour rester en phase avec le
  // FR/NL et un futur changement de texte sans toucher au JS. Même schéma
  // que montrerPropositionEmail_envoyer/seq_creationDossier_attenteReponseVendeur.
  if (typeof speak === 'function' && typeof ALFRED_CONFIG !== 'undefined') {
    const liste = (typeof currentLangue !== 'undefined' && currentLangue === 'nl') ? ALFRED_CONFIG.REPLIQUES_NL : ALFRED_CONFIG.REPLIQUES_FR;
    const replique = liste?.find(r => r.label === 'Ouvrir');
    const segment = replique?.segments?.find(s => s.action === 'CreationOuvrir_Dossiers');
    if (segment?.texte) {
      if (typeof addToHistory === 'function') addToHistory('alfred', segment.texte);
      const surbrillance = (typeof resoudreSurbrillance === 'function') ? resoudreSurbrillance(segment.surbrillance) : null;
      // await ajouté le 04/09 — vrai coupable du "il ne dit pas le
      // dashboard en entier, il est abort en plein milieu, il continue
      // direct pour dossier aanmaken" remonté en test live, uniquement en
      // Jouer tout : SANS lui, cette fonction (donc toute la réplique
      // 'Ouvrir' aux yeux de jouerSecoursInterne) rendait la main dès le
      // clic + le chargement du tableau, bien AVANT la fin réelle de la
      // narration lancée juste ici — Jouer tout enchaînait alors sur la
      // réplique suivante ('OuvrirCreer') pendant que celle-ci parlait
      // encore. Ça se manifestait d'abord en mélange de voix (avant le
      // filet de sécurité stopAudio ajouté depuis dans jouerSecoursInterne)
      // puis, une fois ce filet en place, en coupure nette — mais la
      // vraie cause était ici depuis le début, pas dans stopAudio.
      await speak(typeof naturaliserTexte === 'function' ? naturaliserTexte(segment.texte) : segment.texte, currentLangue, segment.texte, undefined, surbrillance, segment.texte);
    }
  }
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
  // bloque "Suivant". Pour ne pas devoir y penser à chaque test, on génère
  // automatiquement un code à chaque lancement, plutôt que de réutiliser
  // cfg.code tel quel — jamais de retombée sur un ancien dossier déjà créé.
  // Format demandé : "C-" + date du jour + heure (HHMMSS, pour rester
  // unique même en cas de plusieurs lancements le même jour).
  const maintenant = new Date();
  const dateJour = maintenant.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const horodatage = maintenant.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
  const codeUnique = `C-${dateJour}-${horodatage}`;
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
  // "Taal" (langue de l'acte) — actif seulement pour la démo NL, jamais
  // touché en FR où "Frans" est déjà la valeur par défaut du champ
  // (confirmé par capture d'écran : même sur le site en néerlandais, ce
  // champ reste sur "Frans" tant qu'on ne le change pas). Demandé
  // explicitement : le dossier doit être en néerlandais quand la démo
  // l'est, comme le dit Fariël dans le script officiel NL ("Taal:
  // Nederlands").
  if (typeof currentLangue !== 'undefined' && currentLangue === 'nl') {
    await choisirDansDropdownParLabelProche(SELECTEURS.menus.langueActe, 'Nederlands');
    await attendre(300);
  }
  // Pauses encore raccourcies (500ms → 300ms, et 800ms → 400ms côté
  // choisirDansDropdownParLabelProche) : une fois speak() corrigé pour
  // attendre la vraie fin de l'audio (voir alfred-voice.js), la comparaison
  // réelle entre durée de la réplique et durée de cette étape est apparue
  // beaucoup plus tardive que prévu — remonté en test live (la parole était
  // términée depuis un moment, la sélection tournait encore).
  // REVENU au concurrent (03/09, 4e passe) — voir la note dans
  // alfred-config.js (label 'OuvrirChamps') : un bref passage par
  // parlerDepuisAction (3e passe) a été annulé pour cette réplique
  // précise — jugé plus naturel de laisser Alfred parler PENDANT que ces
  // champs se remplissent en direct (contrairement aux fiches Vendeur/
  // Acquéreur, pré-remplies d'un coup par une recherche externe). Chaque
  // choisirDansDropdownParLabelProche ci-dessous garde donc son halo
  // causal normal (silencieux non passé = false par défaut).
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
  // Le clic "Suivant" vivait ici avant — sorti dans sa propre fonction/
  // réplique (seq_creationDossier_ouvrir_suivant, juste en dessous) : retour
  // Cyril, "chaque action doit avoir sa propre flèche" — sans ça, l'écran
  // passait à la suite tout de suite après le dernier champ rempli, sans
  // laisser le temps de le voir avant que "Suivant" ne soit cliqué.
}

// Clic "Suivant" de la fiche de création — séparé de
// seq_creationDossier_ouvrir_champs (voir la note juste au-dessus). Réplique
// silencieuse côté script (voir 'OuvrirSuivant' dans alfred-config.js) :
// aucune ligne officielle à ce moment précis, juste ce clic.
async function seq_creationDossier_ouvrir_suivant() {
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
  await seq_creationDossier_ouvrir_suivant();
}

// Étape 2 — Parties : vendeur (morale via BCE, ou physique via RN) puis
// acquéreur (physique via RN) — ordre repris du script officiel (une
// inversion faite le 03/09 sur une mauvaise lecture de la demande a été
// annulée, voir la note dans alfred-config.js, label 'PartiesVendeur').
// Découpée en deux sous-étapes (comme CreationOuvrir) pour un calage sur
// deux segments : "vendeur" pendant qu'on parle du vendeur, "acquéreur"
// pendant qu'on parle de l'acquéreur.
// parlerDepuisAction (voir PartiesVendeur/PartiesAcquereur dans
// alfred-config.js) : la parole ne part plus dès l'appui sur → — demandé
// explicitement ("il a pas le temps de cliquer que les champs s'affichent
// quand il parle"), même principe que seq_creationDossier_ouvrir_dossiers.
// pendantRecherche (voir ajouterPartieParBCE/RN) : appelé dès le lancement
// de la recherche BCE/RN, pas une fois le formulaire rempli — demandé
// explicitement : "le plus simple c'est de cliquer d'abord, et parler au
// moment où on commence à encoder". Chaque champ ne s'allume que lorsqu'il
// a VRAIMENT une valeur (voir surlignerChampParLabelDialogue), donc pas de
// risque de flash sur du vide même si la parole est en avance sur le
// remplissage réel.
async function seq_creationDossier_parties_vendeur() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  const pendantRecherche = () => parlerSegmentDepuisAction('PartiesVendeur', 'CreationParties_Vendeur');
  if (cfg.vendeur_type === 'morale' && cfg.vendeur_bce) {
    await ajouterPartieParBCE(SELECTEURS.textes.qualiteVendeur, cfg.vendeur_bce, { pendantRecherche });
  } else {
    await ajouterPartieParRN(SELECTEURS.textes.qualiteVendeur, cfg.vendeur_rn, { pendantRecherche });
  }
}

// pendantRecherche — voir la note équivalente dans
// seq_creationDossier_parties_vendeur juste au-dessus. dejaParle : garde-fou
// pour le nouvel essai ci-dessous (retour "acquéreur pas confirmé") — sans
// lui, un 2e essai reparlerait la réplique en double ; sur ce 2e essai, rien
// n'est reparlé (les champs restent visibles à l'écran normalement, sans
// narration ni surlignage superflu).
async function seq_creationDossier_parties_acquereur() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  let dejaParle = false;
  const pendantRecherche = () => {
    if (dejaParle) return Promise.resolve();
    dejaParle = true;
    return parlerSegmentDepuisAction('PartiesAcquereur', 'CreationParties_Acquereur');
  };
  // Le résultat n'était pas vérifié ici avant — on avançait vers "Suivant"
  // (donc vers l'étape "bien") même si l'acquéreur n'avait pas vraiment
  // été enregistré, ce qui faisait échouer toute la suite en cascade
  // (remonté en test live). Un seul nouvel essai avant d'abandonner.
  let ok = await ajouterPartieParRN(SELECTEURS.textes.qualiteAcquereur, cfg.acquereur_rn, { pendantRecherche });
  if (!ok) {
    console.warn('[Alfred DOM] Acquéreur pas confirmé après le premier essai — nouvelle tentative.');
    ok = await ajouterPartieParRN(SELECTEURS.textes.qualiteAcquereur, cfg.acquereur_rn, { pendantRecherche });
  }
  if (!ok) {
    console.warn('[Alfred DOM] Acquéreur toujours pas confirmé — on continue quand même vers le rattachement des notaires (l\'ajout a peut-être réussi malgré la vérification).');
  }
  // Un délai fixe ici était trop variable (remonté plusieurs fois en test
  // live, jamais fiable à 100%) — ajouterPartieParRN attend maintenant
  // vraiment que la fenêtre d'ajout se referme (signal réel de fin
  // d'enregistrement) avant de revenir, donc plus besoin de deviner un
  // délai supplémentaire ici. Petite pause cosmétique seulement.
  await attendre(500);
  // Le clic "Suivant" vivait ici avant — déplacé dans
  // seq_creationDossier_parties_notaires (juste en dessous), qui
  // s'exécute juste après : le rattachement des notaires se fait
  // maintenant pendant qu'on est encore sur l'onglet Parties (retour
  // Cyril), donc "Suivant" doit venir après ce rattachement, pas avant.
}

// Rattache les notaires des deux parties — retour Cyril (script/
// séquencier officiels, capture d'écran à l'appui) : inutile d'attendre
// plus tard dans la démo et de revenir sur l'onglet Parties pour ça,
// exactement les mêmes fonctions (cocherMesClients/cocherRepresentation,
// déjà utilisées avant) marchent très bien ici, tant qu'on n'a pas encore
// quitté l'onglet Parties.
// Découpée en 2 segments (même principe que CreationBien/CreationOuvrir) :
// la recherche/ajout de Maxime (plusieurs secondes) et les deux cases à
// cocher (rapides) ont des durées très différentes ; les garder dans une
// seule réplique aurait fait finir la narration bien avant la fin de
// l'action à l'écran.
// RÔLES RE-ÉCHANGÉS le 04/09 (2e passe) — demandé explicitement : "il doit
// rajouter en parlant Maxime ; et ensuite on coche mes clients, et après
// représente". La phrase "Je le retrouve dans la base..." décrit
// littéralement une recherche, donc doit être dite PENDANT qu'on
// cherche/ajoute Maxime, pas après (1re tentative du même jour annulée).
// ATTENTION : les noms de ces deux fonctions ne correspondent donc plus à
// leur rôle actuel (héritage du découpage Vendeur/Acquéreur d'origine) —
// c'est bien seq_creationDossier_parties_notaireAcquereur (voir plus bas)
// qui cherche/ajoute Maxime EN PREMIER (action + parole en concurrence,
// comportement par défaut, rien de spécial à faire ici) ; celle-ci
// (notaireVendeur) passe donc EN SECOND et coche les DEUX cases à la
// suite : "Mes clients" (Vendeur), PUIS "REPRÉSENTE" (Acquéreur, sur la
// fiche de Maxime tout juste ajoutée).
async function seq_creationDossier_parties_notaireVendeur() {
  // Confirmé par capture live (HTML complet, état par défaut vraiment
  // vérifié) : panneau "Mes clients" sur la fiche d'Alain Caprasse
  // (notaire en charge, déjà sur le dossier) — case décochée par défaut.
  await cocherMesClients(SELECTEURS.textes.qualiteVendeur);
  // Panneau "Représente" sur la fiche de Maxime (ajoutée par la flèche
  // précédente) — case décochée par défaut, même distinction que
  // l'ancien code d'avant ce soir.
  await cocherRepresentation(SELECTEURS.textes.qualiteAcquereur);
  await attendre(500);
  // Le clic "Suivant" vivait ici avant — sorti dans sa propre fonction/
  // réplique (seq_creationDossier_parties_suivant, juste en dessous), même
  // raison que pour "Ouvrir" (retour Cyril, une flèche par action).
}

// Voir la note ci-dessus : recherche/ajoute Maxime EN PREMIER, pendant que
// la réplique "Je le retrouve dans la base..." est dite — comportement
// concurrent par défaut (texte + action), rien de spécial à ajouter ici.
async function seq_creationDossier_parties_notaireAcquereur() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  if (cfg.acquereur_notaire) await rechercherEtAjouterNotaire(cfg.acquereur_notaire);
}

// Clic "Suivant" de l'onglet Parties — séparé de
// seq_creationDossier_parties_notaireAcquereur (voir la note juste
// au-dessus). Réplique silencieuse côté script (voir 'PartiesSuivant' dans
// alfred-config.js).
async function seq_creationDossier_parties_suivant() {
  // "Suivant" reste désactivé tant que le vendeur n'a pas été ajouté avec succès.
  if (!await cliquerBoutonQuandActif(SELECTEURS.boutons.suivant)) {
    console.warn('[Alfred DOM] Étape "parties" bloquée — arrêt de la séquence.');
    return;
  }
  await attendre(2200);
}

// Rétrocompatibilité — enchaîne les deux sous-étapes (test manuel en
// console ; le script normal déclenche chaque sous-étape à part).
async function seq_creationDossier_parties_notaires() {
  // Ordre corrigé (04/09, 2e passe) : notaireAcquereur cherche/ajoute
  // Maxime — doit passer avant notaireVendeur, qui coche sa case
  // "REPRÉSENTE" (voir les notes sur ces deux fonctions plus haut).
  await seq_creationDossier_parties_notaireAcquereur();
  await attendre(600);
  await seq_creationDossier_parties_notaireVendeur();
  await seq_creationDossier_parties_suivant();
}

// Rétrocompatibilité — enchaîne les trois sous-étapes (test manuel en
// console ; le script normal déclenche chaque sous-étape à part).
async function seq_creationDossier_parties() {
  await seq_creationDossier_parties_vendeur();
  await seq_creationDossier_parties_acquereur();
  await seq_creationDossier_parties_notaires();
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
  // Le clic "Enregistrer" ne se fait plus ici — retour Cyril : le texte
  // "Dossier enregistré." (scène 9, réplique CreationDocuments) doit
  // tomber pile sur le clic réel. Avant, ce clic se faisait ici, bien
  // avant que la narration Documents n'ait même commencé — voir
  // seq_creationDossier_documents_enregistrer juste en dessous.
  await attendre(4500);
}

// Clic "Enregistrer" réel (scène 9 "Documents") — calé sur la réplique
// "Dossier enregistré." plutôt que sur la fin de Bien (retour Cyril, voir
// seq_creationDossier_bien_finaliser juste au-dessus). Le bouton reste
// affiché entre les deux étapes (rien ne navigue ailleurs entretemps),
// donc pas besoin de le retrouver depuis un autre écran.
async function seq_creationDossier_documents_enregistrer() {
  await cliquerBoutonQuandActif(SELECTEURS.boutons.enregistrer);
  await attendre(2200);
}

// Rétrocompatibilité — enchaîne les deux sous-étapes (test manuel en
// console ; le script normal déclenche chaque sous-étape à part).
async function seq_creationDossier_bien() {
  await seq_creationDossier_bien_ajouter();
  await seq_creationDossier_bien_finaliser();
}

// SUPERSEDÉES (retour Cyril, capture d'écran à l'appui) : le rattachement
// des notaires se fait maintenant DANS seq_creationDossier_parties_notaires
// (voir plus haut), pendant qu'on est encore sur l'onglet Parties — plus
// besoin d'y revenir plus tard via naviguerOnglet. Gardées ici pour
// référence (mêmes fonctions cocherMesClients/rechercherEtAjouterNotaire/
// cocherRepresentation réutilisées), mais plus aucune réplique ne les
// déclenche.
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
  await cocherMesClients(SELECTEURS.textes.qualiteVendeur);
}

async function seq_creationDossier_notaires_acquereur() {
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  if (!cfg) return;
  // Superseded (voir la note plus bas) — reproduit ici le comportement
  // équivalent avec les fonctions séparées désormais utilisées par le
  // vrai flux (rechercherEtAjouterNotaire + cocherRepresentation).
  if (cfg.acquereur_notaire) {
    await rechercherEtAjouterNotaire(cfg.acquereur_notaire);
    await cocherRepresentation(SELECTEURS.textes.qualiteAcquereur);
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
// Encore plus lent spécifiquement à DROITE (retour explicite : "trop
// rapide") — le compromis généré (colonne droite) est du texte dense à
// lire, contrairement à la gauche (données déjà connues, juste un aperçu),
// qui n'a pas eu cette remontée et garde la vitesse générique ci-dessus.
const VITESSE_SCROLL_COLONNE_DROITE_PX_PAR_SEC = 130;
const DUREE_MIN_SCROLL_COLONNE_MS = 1500;
// Aller jusqu'au vrai bas du document rendait la démo interminable pour
// un long compromis (ex. la colonne de droite peut faire 5x la gauche —
// jusqu'à 47s au ralenti). Demandé explicitement : scroller juste assez
// pour montrer/lire le contenu, pas tout le document. On défile donc au
// maximum quelques hauteurs d'écran, pas jusqu'au bout — durée prévisible
// et identique des deux côtés, peu importe la longueur réelle du texte.
// Réduit (4 → 2,5) — retour explicite : "le scroll est trop long" —
// combiné à la vitesse déjà ralentie à droite, 4 écrans prenait trop de
// temps ; 2,5 reste largement assez pour montrer le contenu qui défile,
// sans traîner en longueur.
const ECRANS_A_DEFILER = 2.5;

// Défile lentement du haut jusqu'au vrai bas de la colonne, à vitesse
// constante (donc plus long pour un document plus long) — remonté en test
// live comme n'allant pas jusqu'au bout ("super important de lire").
// dureeMinMs : allonge la durée du défilement (sans aller plus loin, juste
// plus lentement) pour qu'il dure au moins aussi longtemps que la parole
// estimée (voir estimerDureeParoleMs) — demandé explicitement : "ça
// s'arrête, faut continuer pendant que ça parle". Avant, la durée ne
// dépendait que de la distance/vitesse : sur une longue réplique
// (RedactionDroite), le scroll finissait et s'immobilisait bien avant la
// fin de la narration.
async function defilerColonneLentement(cote, vitessePxParSec = VITESSE_SCROLL_COLONNE_PX_PAR_SEC, dureeMinMs = 0) {
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
  // Quelques hauteurs d'écran par défaut, pas le vrai bas du document (voir
  // ECRANS_A_DEFILER) — sauf si le document est déjà plus court que ça.
  const cibleParDefaut = Math.min(veritableBas, conteneur.clientHeight * ECRANS_A_DEFILER);
  // dureeMinMs (durée de la narration, voir estimerDureeParoleMs) donnait
  // avant SEULEMENT plus de TEMPS pour la même distance plafonnée — donc un
  // défilement qui ralentissait jusqu'à ramper sur une petite portion pour
  // une longue réplique. Retour explicite : "tu peux aller plus loin, là tu
  // scrolles super lentement sur une petite portion, ça a pas de sens".
  // On calcule maintenant la distance que le temps disponible permet de
  // couvrir à la vitesse NATURELLE (vitessePxParSec) demandée, et on prend
  // le plus grand des deux plafonds — la vitesse de défilement reste donc
  // la même (pas de ralenti artificiel), c'est la PORTION parcourue qui
  // s'allonge pour une narration plus longue, plafonnée par le vrai bas du
  // document (jamais au-delà de ce qui existe réellement).
  const distanceSelonNarration = dureeMinMs > 0 ? (dureeMinMs / 1000) * vitessePxParSec : 0;
  const cible = Math.min(veritableBas, Math.max(cibleParDefaut, distanceSelonNarration));
  const dureeMs = Math.max(DUREE_MIN_SCROLL_COLONNE_MS, (cible / vitessePxParSec) * 1000);
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

// Texte d'une réplique à PLAT (pas segments) par label + nom d'action —
// même esprit que parlerSegmentDepuisAction, mais pour lire le texte sans
// déclencher la parole soi-même (ici, c'est jouerSecoursInterne qui s'en
// charge normalement, en concurrence avec l'action — on veut juste estimer
// sa durée depuis ici).
function texteRepliqueParAction(label, actionNom) {
  if (typeof ALFRED_CONFIG === 'undefined') return null;
  const liste = (typeof currentLangue !== 'undefined' && currentLangue === 'nl') ? ALFRED_CONFIG.REPLIQUES_NL : ALFRED_CONFIG.REPLIQUES_FR;
  const replique = liste?.find(r => r.label === label);
  if (!replique) return null;
  if (replique.action === actionNom) return replique.texte || null;
  const segment = replique.segments?.find(s => s.action === actionNom);
  return segment?.texte || null;
}

// Estimation grossière de la durée réelle de la parole (~150 mots/min,
// même repli que programmerSurbrillanceMots/afficherSousTitresSync dans
// alfred-voice.js quand la vraie durée audio n'est pas connue), ajustée
// pour la vitesse de parole globale ralentie (VITESSE_PAROLE, alfred-voice.js
// — dupliquée ici en dur : ce fichier ne dépend pas d'alfred-voice.js).
// Sert uniquement à faire durer un défilement AU MOINS aussi longtemps que
// la narration qui l'accompagne (voir dureeMinMs dans defilerColonneLentement).
function estimerDureeParoleMs(texte) {
  if (!texte) return 0;
  const mots = texte.trim().split(/\s+/).filter(Boolean).length;
  const VITESSE_PAROLE_ESTIMEE = 0.85;
  return (mots * 400) / VITESSE_PAROLE_ESTIMEE;
}

async function seq_creationDossier_redaction_scrollGauche() {
  const texte = texteRepliqueParAction('RedactionGauche', 'CreationRedaction_ScrollGauche');
  await defilerColonneLentement('gauche', VITESSE_SCROLL_COLONNE_PX_PAR_SEC, estimerDureeParoleMs(texte));
}

// Premier passage sur la rédaction (juste après la génération du
// compromis) : défilement générique, comme avant l'ajout du ciblage PEB —
// à ce stade le certificat PEB n'est pas encore rempli (les pièces du
// vendeur n'arrivent que plus tard, voir Email/ReponseVendeur), donc viser
// spécifiquement son titre ici n'aurait montré qu'une clause vide.
async function seq_creationDossier_redaction_scrollDroite() {
  const texte = texteRepliqueParAction('RedactionDroite', 'CreationRedaction_ScrollDroite');
  await defilerColonneLentement('droite', VITESSE_SCROLL_COLONNE_DROITE_PX_PAR_SEC, estimerDureeParoleMs(texte));
}

// Trouve, dans la colonne droite (le compromis généré), le titre de la
// clause PEB ("La performance énergétique" / "Certificat énergétique") —
// capturé en direct (clics + scroll réels) : c'est un simple <h3> dans le
// contenu de l'éditeur CKEditor. Le texte de l'acte lui-même suit la
// "Taal van de akte" du dossier (pas la langue de l'interface du site) —
// termes NL "EPC"/"energieprestatie" repris du script officiel NL
// (v3_8.docx : "het EPC"), pas devinés.
function trouverTitrePEB() {
  const conteneur = trouverColonneDefilante('droite');
  if (!conteneur) return null;
  const titres = conteneur.querySelectorAll('h1, h2, h3, h4');
  return Array.from(titres).find(t => /performance énergétique|certificat énergétique|energieprestatie|\bEPC\b/i.test(t.textContent));
}

// Utilisé en toute fin d'acte 2 (réplique ExportWord), une fois les pièces
// du vendeur reçues et intégrées (Email/ReponseVendeur) : c'est SEULEMENT
// à ce moment que la clause PEB est vraiment remplie, donc c'est là qu'on
// montre qu'elle "a bien été rajoutée" — pas pendant la 1re rédaction.
async function seq_creationDossier_redaction_scrollPEB() {
  await fermerPanneauAlfred();
  let titre = null;
  for (let i = 0; i < 15; i++) {
    if (annulationDemandee) return;
    titre = trouverTitrePEB();
    if (titre) break;
    await attendre(400);
  }
  if (!titre) {
    console.warn('[Alfred DOM] Titre PEB introuvable dans le compromis — défilement générique conservé en repli.');
    await defilerColonneLentement('droite');
    return;
  }
  await defilerVersElement(titre, 3000);
}

// Bouton "Exporter en Word" de la barre d'outils de l'éditeur — capturé en
// direct : c'est un bouton icône seule (pas de texte, cliquerBouton ne peut
// pas le trouver), identifié de façon fiable par l'infobulle CKEditor
// (data-cke-tooltip-text), plus stable que sa classe générique ck-button
// partagée par tous les autres boutons de la barre d'outils.
function trouverBoutonExporterWord() {
  const exact = document.querySelector('[data-cke-tooltip-text="Exporter en Word"]');
  if (exact) return exact;
  // Repli NL — remonté en test live : "toutes les actions ont marché en NL
  // sauf l'export Word". L'infobulle CKEditor complète n'a jamais été
  // capturée en néerlandais (probablement traduite, ex. "Exporteren naar
  // Word") — plutôt que deviner le libellé exact, on cherche n'importe
  // quelle infobulle CKEditor contenant "word" : c'est un nom de produit
  // Microsoft, qui reste "Word" quelle que soit la langue de l'interface
  // (même principe que "Alfred", qui reste "Alfred" en NL).
  return Array.from(document.querySelectorAll('[data-cke-tooltip-text]'))
    .find(el => (el.getAttribute('data-cke-tooltip-text') || '').toLowerCase().includes('word'));
}

// Étape supplémentaire (hors script papier, demandée en test live) : export
// du compromis en Word. Capturé en direct : cliquer sur l'icône ouvre une
// fenêtre listant les valeurs manquantes (app-missing-value-dialog) — il
// faut cliquer sur son bouton "Fermer" pour que le téléchargement se
// déclenche réellement (confirmé par l'utilisatrice : contre-intuitif mais
// c'est bien "Fermer", pas une simple fermeture sans effet).
async function seq_creationDossier_redaction_exporterWord() {
  let btn = null;
  for (let i = 0; i < 15; i++) {
    if (annulationDemandee) return false;
    btn = trouverBoutonExporterWord();
    if (btn) break;
    await attendre(300);
  }
  if (!btn) { console.warn('[Alfred DOM] Bouton "Exporter en Word" introuvable.'); return false; }
  await defilerVersElement(btn);
  await curseurVersAsync(btn, () => simulerClic(btn));
  await attendre(600);

  const dialogue = trouverDialogueOuvert();
  if (!dialogue) { console.warn('[Alfred DOM] Fenêtre "valeurs manquantes" non détectée après le clic export Word — abandon.'); return false; }
  await attendre(400);

  const btnFermer = dialogue.querySelector('.p-dialog-close-button');
  if (!btnFermer) { console.warn('[Alfred DOM] Bouton "Fermer" introuvable dans la fenêtre export Word.'); return false; }
  await curseurVersAsync(btnFermer, () => simulerClic(btnFermer));
  await attendreFermetureDialogue(dialogue);
  return true;
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

// Étape 7 (A20-A21 du séquencier) — annonce que le vendeur a répondu et
// revient directement sur le compromis.
// Historique : a d'abord surveillé la baisse du nombre de lignes en attente
// dans Documents (voir compterDocumentsEnAttente, toujours présente plus
// bas mais plus appelée ici), pour confirmer l'arrivée réelle des pièces
// envoyées par l'envoi automatique (montrerPropositionEmail_envoyer). Cet
// envoi automatique est actuellement en panne côté backend de l'appli
// (ERROR.EMAIL, hors de notre contrôle) — retour explicite : la réponse du
// vendeur sera gérée manuellement (Cyril répond depuis sa propre boîte,
// comme avant l'automatisation), donc plus besoin d'une vérification DOM
// ici, juste la narration et le retour au compromis.
// Ferme le panneau Alfred (fermerPanneauAlfred, définie plus haut) pile au
// moment où Alfred dit "regardez le compromis..." (réplique ProjetComplet)
// — demandé explicitement en test live le 04/09 : "il ne faut pas appuyer
// sur rédaction mais sur le logo d'Alfred, comme ça on ferme et on voit la
// rédaction en pleine écran". Avant, rien ne fermait le panneau à ce
// moment précis (resté ouvert depuis Email/EmailEnvoyer), il fallait le
// faire à la main pour voir le compromis derrière.
async function seq_creationDossier_redaction_projetComplet() {
  await fermerPanneauAlfred();
}

async function seq_creationDossier_attenteReponseVendeur() {
  // Segment marqué parlerDepuisAction (voir alfred-brain.js) : le texte
  // n'est pas dit automatiquement au début du segment, il est dit ICI,
  // explicitement — par cohérence avec CreationEmail_Envoyer, même si la
  // détection réelle qui justifiait ce choix a été retirée ci-dessus.
  if (typeof speak === 'function' && typeof ALFRED_CONFIG !== 'undefined') {
    const liste = (typeof currentLangue !== 'undefined' && currentLangue === 'nl') ? ALFRED_CONFIG.REPLIQUES_NL : ALFRED_CONFIG.REPLIQUES_FR;
    const replique = liste?.find(r => r.label === 'ReponseVendeur'); // ex-'CreationReponseVendeur' — label raccourci, action inchangée
    const segment = replique?.segments?.find(s => s.action === 'CreationReponseVendeur');
    if (segment?.texte) {
      if (typeof addToHistory === 'function') addToHistory('alfred', segment.texte);
      // await ajouté le 04/09 — même correctif que CreationOuvrir_Dossiers/
      // CreationEmail_Envoyer plus haut dans ce fichier (voir leurs notes).
      await speak(typeof naturaliserTexte === 'function' ? naturaliserTexte(segment.texte) : segment.texte, currentLangue, segment.texte);
    }
  }

  // Laisse un peu de temps avant de remonter sur le compromis — demandé
  // explicitement : enchaîner tout de suite après la parole donnait
  // l'impression que la réaction ("le vendeur a répondu...") passait trop
  // vite, sans le temps de vraiment l'assimiler avant de changer d'écran.
  await attendre(3000);
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
  'CreationOuvrir_Suivant':     seq_creationDossier_ouvrir_suivant,
  'CreationParties':   seq_creationDossier_parties,
  'CreationParties_Vendeur':   seq_creationDossier_parties_vendeur,
  'CreationParties_Acquereur': seq_creationDossier_parties_acquereur,
  // Rattachement des notaires — déplacé ici (retour Cyril) : se fait
  // maintenant juste après l'acquéreur, pendant qu'on est encore sur
  // l'onglet Parties. Remplace 'CreationNotaires_Vendeur'/'_Acquereur'
  // (superseded, voir seq_creationDossier_notaires_vendeur/acquereur).
  // Découpé en 2 (BIMBIMMO rapide / Maxime plus long), un par segment.
  'CreationParties_Notaires':  seq_creationDossier_parties_notaires, // rétrocompat, plus utilisé par le script
  'CreationParties_NotaireVendeur':   seq_creationDossier_parties_notaireVendeur,
  'CreationParties_NotaireAcquereur': seq_creationDossier_parties_notaireAcquereur,
  'CreationParties_Suivant':   seq_creationDossier_parties_suivant,
  'CreationBien':      seq_creationDossier_bien,
  'CreationBien_Rechercher': seq_creationDossier_bien_ajouter,
  'CreationBien_Finaliser':  seq_creationDossier_bien_finaliser,
  'CreationDocuments_Enregistrer': seq_creationDossier_documents_enregistrer,
  'CreationRedaction': seq_creationDossier_redaction,
  'CreationRedaction_ScrollGauche': seq_creationDossier_redaction_scrollGauche,
  'CreationRedaction_ScrollDroite': seq_creationDossier_redaction_scrollDroite,
  'CreationRedaction_ScrollPEB': seq_creationDossier_redaction_scrollPEB,
  'CreationRedaction_ExporterWord': seq_creationDossier_redaction_exporterWord,
  'CreationEmail':     seq_creationDossier_email,
  'CreationEmail_Ouverture': montrerPropositionEmail_ouverture,
  'CreationEmail_Envoyer':   montrerPropositionEmail_envoyer,
  'CreationRedaction_ProjetComplet': seq_creationDossier_redaction_projetComplet,
  'CreationReponseVendeur': seq_creationDossier_attenteReponseVendeur,
  'OuvrirChatConversation': seq_ouvrirChatConversation,
  'CreationPoserQuestions': seq_poserQuestionsAlfred,
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