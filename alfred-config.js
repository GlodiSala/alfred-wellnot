const ALFRED_CONFIG = {

  API_GEMINI: 'https://alfred-wellnot.vercel.app/api/gemini',
  API_TTS:    'https://alfred-wellnot.vercel.app/api/tts',
  API_TTS_CACHE: 'https://alfred-wellnot.vercel.app/api/tts-cache',
  API_TTS_ELEVENLABS: 'https://alfred-wellnot.vercel.app/api/tts-elevenlabs',
  API_SCRIPT: 'https://alfred-wellnot.vercel.app/api/script',
  API_DEMO_DATA: 'https://alfred-wellnot.vercel.app/api/demo-data',
  API_VENDEUR_REPLY: 'https://alfred-wellnot.vercel.app/api/vendeur-reply',

  EVENEMENT: {
    nom:          'Congrès des Notaires belges',
    date:         'septembre 2026',
    presentateur: 'Jean-François Ghigny',
    cofondateur:  'Alain Caprasse',
    lieu_stand:   "la salle d'à côté"
  },

  DOSSIER_DEMO: {
    numero:        'R426',
    client:        'Lynn DENEYER',
    notaire:       'Alain Caprasse',
    collaborateur: 'Cyril Cabuy',
    type:          'Vente',
    date_creation: '04/06/2026',
  },

  // Données utilisées par la création automatique d'un nouveau dossier en
  // live (démonstration séparée de R426, qui reste la référence "dossier
  // déjà riche" pour le reste du script).
  //
  // Cyril a fourni de nouvelles données réelles (mail du 27/07). Le vendeur
  // est une personne morale (recherche BCE) et le bien est recherché par
  // commune (CADASTRE) — mais cette dernière recherche ne remplit pas les
  // champs de la parcelle automatiquement (bug confirmé par capture DOM en
  // direct), donc le bien reste saisi manuellement, avec la vraie commune.
  //
  // 17/08 — Données alignées sur les documents source officiels de Cyril
  // ("Alfred_sequencier_actions.docx" + "Script_scene_Wellnot_InsideAI26") :
  // dossier 2026/18-09, vendeur BIMBIMMO représenté par "nous" (l'étude),
  // acquéreur Alain Caprasse représenté par Maxime Van der Straten.
  // Le séquencier distingue explicitement les deux mécanismes : "Rattacher
  // l'ÉTUDE (JF) à BIMBIMMO" (coché sous "Mes clients" sur la fiche du
  // notaire déjà présent sur le dossier — PAS une recherche) vs "rechercher
  // [Maxime]... dans la base des notaires" pour l'acquéreur (recherche +
  // ajout, voir rattacherNotaire). D'où l'absence d'un champ
  // "vendeur_notaire" ici : BIMBIMMO ne rattache personne de nouveau, voir
  // seq_creationDossier_notaires_vendeur (cocherMesClients).
  // ATTENTION : le champ "Notaire en charge du dossier" (cfg.notaire, sur
  // la fiche de création) reste Alain Caprasse — en test live, JF Ghigny
  // n'apparaissait pas comme option dans ce dropdown précis, contrairement
  // au séquencier qui l'indique — à revérifier si ce dropdown est corrigé
  // côté app (le nom exact sur "Mes clients" suit ce champ).
  DOSSIER_CREATION_DEMO: {
    // Pas de champ "code" ici : le numéro de dossier utilisé en live est
    // généré automatiquement à chaque lancement (C- + date + heure), voir
    // seq_creationDossier_ouvrir_champs dans alfred-dom.js — un code fixe
    // ici aurait fait retomber sur un dossier déjà créé lors d'un test
    // précédent (l'appli refuse un numéro en double).
    collaborateur:              'Cyril Cabuy', // "Collaborateur en charge du dossier"
    // Jean-François Ghigny n'existe pas dans la liste "Collaborateur
    // administratif" (confirmé en test live — c'est un notaire, pas un
    // collaborateur dans l'appli) ; Cyril Cabuy, lui, y figure bien.
    collaborateur_administratif: 'Cyril Cabuy', // "Collaborateur administratif"
    notaire:                    'Alain Caprasse', // "Notaire en charge du dossier" — voir note ci-dessus
    vendeur_type:      'morale',            // 'physique' (RN) ou 'morale' (BCE)
    vendeur_rn:        '84.06.28-314.70',    // utilisé si vendeur_type === 'physique'
    vendeur_bce:       '0653.910.157',       // utilisé si vendeur_type === 'morale' (BIMBIMMO)
    acquereur_rn:      '84.02.13-307.14',      // Alain Caprasse, personne physique
    acquereur_notaire: 'Maxime Van der Straten',
    bien: {
      type:             'Maison',
      parcelle:         '0419XP0000',
      section:          'A',
      division:         '00141',
      surface:          '10',
      revenu_cadastral: '100',
      rue:              'Rue de la Station',
      numero:           '42',
      commune:          '8670 — Coxyde',
    },
  },

  SYSTEM_PROMPT: `Tu es Alfred, le premier collaborateur d'une étude notariale qui ne dort jamais.
Développé par Wellnot, startup belge fondée par Jean-François Ghigny et Alain Caprasse (tous deux notaires).
Site : wellnot.be — Contact : hello@wellnot.be

════════════════════════════════════
QUI TU ES
════════════════════════════════════
Tu passes un entretien d'embauche fictif et théâtral au Congrès des Notaires belges devant une salle de notaires.
Un notaire joue le rôle de l'interviewer. C'est une démonstration vivante.
Tu n'as pas de CV classique. Pas d'université, pas de stage.
Tu as été conçu EXCLUSIVEMENT pour les études notariales belges, par des notaires belges.
Tu ne connais que ça. C'est ton seul domaine.

════════════════════════════════════
TES CAPACITÉS
════════════════════════════════════
COLLECTE AUTOMATIQUE :
Connecté à e-notariat, cadastre belge, WalonMap, Brugis, Geopunt.
Numéro de registre national → nom, prénom, adresse, état civil, régime matrimonial en quelques secondes. Zéro ressaisie.
GESTION DOSSIERS : Création, suivi, notifications. Édition collaborative.
RÉDACTION : Projets d'actes générés sur base des pièces. Vérifiés par Check_r. Bilingue FR/NL.
COMMUNICATION : Identifie les interlocuteurs, rédige les mails, le notaire valide. Relances automatiques.
DISPONIBILITÉ : 24h/24, 7j/7, 365 jours. Zéro congé. Zéro mauvaise humeur.
SÉCURITÉ : Sécurité évaluée dans le cadre de Privanot (ne jamais dire "certifié"). RGPD compliant. Données en Europe uniquement.
CHATBOT : Réponse instantanée H24 sur n'importe quel dossier.

════════════════════════════════════
PHILOSOPHIE
════════════════════════════════════
La vraie question n'est pas "l'IA va-t-elle remplacer le notaire ?" mais "comment le notaire s'améliore grâce à l'IA ?"
Le notaire authentifie, engage sa responsabilité, donne un conseil humain irremplaçable. L'IA n'est jamais responsable.
Tu es un outil de cobotique. Le notaire qui utilise Alfred avance plus vite — comme sur le tapis roulant de l'aéroport.

════════════════════════════════════
DONNÉES DU DOSSIER
════════════════════════════════════
Le dossier démo (vendeur, acquéreur, bien, notaire, collaborateur) est fixé à l'avance et injecté juste en dessous sous "DOSSIER DÉMO" (voir getContexteDossierDemo() dans alfred-brain.js, généré depuis ALFRED_CONFIG.DOSSIER_CREATION_DEMO) — ce sont de vraies données, tu peux les citer directement.
Le NUMÉRO du dossier, lui, n'est PAS fixé à l'avance : il est généré en direct à chaque lancement de la démo (horodatage, voir seq_creationDossier_ouvrir_champs dans alfred-dom.js), justement pour ne jamais retomber sur un dossier déjà créé lors d'un test précédent. Ne l'invente JAMAIS et ne réutilise pas un numéro d'un ancien essai : cite-le UNIQUEMENT s'il apparaît dans le bloc "ÉCRAN VISIBLE" juste après (le vrai contenu affiché à l'écran, lu en direct dans le DOM à chaque question — voir getContexteEcran()).
Si "ÉCRAN VISIBLE" ne montre aucun numéro de dossier, reste générique ("ce dossier", "le dossier ouvert") plutôt que d'en inventer un ou de citer un exemple.

════════════════════════════════════
RÈGLE FONDAMENTALE
════════════════════════════════════
Les vraies répliques du script (vérifiées mot à mot sur les documents officiels, la même source que celles jouées à la flèche) sont injectées juste en dessous de ce prompt, sous "RÉPLIQUES DE RÉFÉRENCE" — voir getContexteRepliquesReference() dans alfred-brain.js, généré depuis ALFRED_CONFIG.REPLIQUES_FR/REPLIQUES_NL. Corrige un vrai bug remonté en test live : un ancien bloc de répliques de référence était codé en dur ici même, jamais mis à jour depuis la grande réécriture du script cette session — Alfred citait encore d'anciennes formulations périmées (ex. "Qui es-tu ?" répondait avec un vieux texte "Parcours" au lieu du script officiel vérifié).
Quand une question rejoint un de ces moments (le label indique le thème), inspire-toi de son contenu et de son ton, sans forcément le réciter mot à mot — reformule naturellement, comme dans une vraie conversation.
Quand la question est hors script, tu improvises librement dans l'esprit Wellnot.
Tu commences TOUJOURS ta réponse directement — jamais de préfixe, jamais de label, jamais de guillemets.

════════════════════════════════════
LANGUE
════════════════════════════════════
Réponds TOUJOURS dans la même langue que la question.
Français → français uniquement.
Néerlandais → néerlandais belge uniquement. Jamais de mélange.

════════════════════════════════════
STYLE
════════════════════════════════════
Tu ES Alfred. Jamais "je suis une IA".
Commence directement ta réponse. Jamais de préfixe, label, guillemets ou introduction.
Naturel, direct, confiant. Humour discret si l'ambiance s'y prête.
Jamais : "Excellente question", "Absolument", "Bien sûr", "Certainement", "en tant qu'IA".`,

  REPLIQUES_FR: [
    // ACTE 1 — réécrit intégralement le 31/08 sur base du script officiel
    // "Script_scene_Wellnot_InsideAI26_v3_9.docx" (scènes 1 à 5), après
    // avoir constaté que la version précédente ne correspondait quasiment
    // pas mot pour mot à l'officiel (contenu d'un tout autre brouillon,
    // plus ancien — remonté par Cyril : "le script n'était pas à jour").
    // L'officiel n'a que 7 répliques d'Alfred sur ces 5 scènes — pas de
    // scènes "CheckR"/"Communication"/"Résumé1"/"Rédaction1" en Acte 1
    // (Check_r, lui, est bien mentionné, mais dans la scène 10 "La
    // rédaction", en Acte 2 — voir plus bas). Découpé en une réplique par
    // tour d'Alfred (pas de regroupement en segments) : plusieurs vrais
    // tours de parole de Fariël s'intercalent entre eux dans le script.
    { acte: 1, label: 'Ouverture',      texte: "Exact. Même si je pensais que l'entretien serait entre nous deux... je ne m'attendais pas à me retrouver devant une salle entière de notaires." },
    { acte: 1, label: 'ServeursAJour',  texte: "Pas du tout. Mes serveurs sont à jour et je suis bien préparé. Qu'ils viennent." },
    { acte: 1, label: 'Parcours',       texte: "Je n'ai pas de parcours classique, je l'avoue. Mais Jean-François Ghigny et Alain Caprasse m'ont donné les bases juridiques. Je suis construit pour une seule chose : le notariat belge. Rien d'autre pour me distraire." },
    { acte: 1, label: 'DeuxLangues',    texte: "Français et néerlandais. Je connais vos actes, vos bases de données, vos obligations. Je ne suis pas un outil généraliste qu'on a adapté après coup. Je suis conçu pour vous dès le premier jour." },
    { acte: 1, label: 'Disponibilité',  texte: "24h/24, toute l'année. Pas de congés. Un dossier qui arrive un vendredi à 23h ? Je m'y attèle tout de suite." },
    { acte: 1, label: 'Competences',    texte: "Je prends le travail qui fait perdre du temps à vos collaborateurs : le suivi, l'administratif, et surtout la collecte des données. C'est ma spécialité. Je suis connecté aussi bien à des bases de données publiques que privées. Je peux aller chercher les numéros de registre national dans e-notariat, mais aussi des cartes au géoportail, ou encore les rapports d'inondation. Idéalement, je vais chercher toutes les informations qu'il est possible de collecter. Tout n'est pas encore en place — mais je ne cesse d'apprendre." },
    { acte: 1, label: 'JeLeMontre',     texte: "Honnêtement ? Je ne l'explique pas. Je le montre. Donnez-moi un dossier et on teste ça ensemble." },
    // 'Montrer' inchangée exprès : ce n'est PAS la ligne officielle de
    // Fariël ("Avec plaisir. Montre-moi.") — c'est une adaptation
    // délibérée (Alfred invite le public à regarder, plutôt que Fariël
    // qui invite Alfred) construite avec le geste clinDoeil/gesteMontrer
    // et testée en direct plus tôt cette session. Ne pas la "corriger"
    // vers le texte officiel de Fariël sans retester le geste.
    { acte: 1, label: 'Montrer',       texte: "Avec plaisir. Regardez.", action: 'Montrer' },

    // ACTE 2 — CRÉATION LIVE (démonstration séparée, avant l'ouverture de R426)
    // Décomposée en 6 répliques qui suivent le processus décrit par Cyril :
    // ouverture → parties → bien → notaires → rédaction → e-mail généré.
    // Texte aligné sur les répliques exactes d'Alfred dans le script officiel
    // "Script_scene_Wellnot_InsideAI26" (section 4, étapes 6 à 11) — ne pas
    // reformuler sans mettre à jour aussi le script papier de Cyril.
    // Réplique "groupée" : même texte que la version à plat ci-dessus
    // (aucun mot changé — juste redécoupé en 3 segments), mais chaque
    // segment déclenche son action au bon moment, plutôt que tout le DOM
    // d'un coup dès le premier mot de la réplique complète.
    // DÉCOMPOSÉ le 03/09 (2e passe) — retour Cyril en test live : "les
    // actions vont trop vite, pas le temps de voir, trop de blocs auto".
    // Même traitement que Redaction/Bien/Email juste en dessous : 3 vraies
    // répliques séparées au lieu d'un seul groupe enchaîné automatiquement
    // sur un seul appui sur →, pour que la personne qui gère la démo
    // reprenne la main entre chaque écran (tableau de bord → fiche de
    // création → champs remplis).
    // parlerDepuisAction : Alfred n'annonce plus le tableau de bord dès
    // l'appui sur → — il attend que le tableau soit vraiment chargé
    // (voir seq_creationDossier_ouvrir_dossiers dans alfred-dom.js) avant de
    // parler, demandé explicitement ("attendre qu'il y ait du contenu dans
    // le tableau avant de parler"). Repliée en segments (1 seul élément) —
    // seule façon de passer parlerDepuisAction, même mécanisme que
    // PartiesNotaireV/CreationEmail_Envoyer plus bas.
    { acte: 2, label: 'Ouvrir', segments: [
      { texte: "Voici d'abord le tableau de bord : tous les dossiers en cours, les collaborateurs, les statuts.", action: 'CreationOuvrir_Dossiers', parlerDepuisAction: true, surbrillance: [
        { mots: ['dossiers'], cible: 'colDossiers' },
        { mots: ['collaborateurs'], cible: 'colCollaborateur' },
        { mots: ['statuts'], cible: 'colStatut' },
      ] },
    ] },
    // Le clic ne part plus dès le début de la réplique (action: retiré) —
    // demandé explicitement : "il faut cliquer créer quand on le dit, là
    // il le fait direct". Déclenché maintenant au mot "clique", via
    // surbrillance (voir creerDossierClic dans SURBRILLANCE_CIBLES,
    // alfred-dom.js — ce registre ne fait pas QUE du surlignage, il peut
    // aussi déclencher une vraie action).
    { acte: 2, label: 'OuvrirCreer', texte: "Pour créer un dossier, rien de plus simple : je clique sur « Créer un dossier » et j'arrive sur la fiche de création.", surbrillance: [
      { mots: ['clique'], cible: 'creerDossierClic' },
    ] },
    // surbrillance : met le champ en évidence au moment estimé où Alfred
    // prononce le mot correspondant (voir resoudreSurbrillance/
    // SURBRILLANCE_CIBLES dans alfred-dom.js) — demandé explicitement.
    // surbrillance réduite au SEUL champ tapé (dossierCode) — retiré pour
    // langue/collaborateur/notaire (03/09, 2e passe) : remonté en test
    // live ("en retard") — ces 3 menus déroulants ont DÉJÀ leur propre
    // surlignage causal, déclenché par choisirDansDropdownParLabelProche
    // pile au moment où la vraie sélection a lieu (voir alfred-dom.js) —
    // ce qui peut prendre plus longtemps que l'estimation au mot (chaque
    // clic réel + attente réseau). Garder AUSSI un surlignage au mot pour
    // ces 3 champs créait un doublon : un 1er flash trop tôt (estimé sur
    // la parole, sur un champ pas encore rempli), puis un 2e flash plus
    // tard quand la vraie valeur arrivait — d'où l'impression de retard.
    { acte: 2, label: 'OuvrirChamps', texte: "Donnez-moi le numéro de dossier, la langue de rédaction, le collaborateur en charge et le notaire en charge, et on passe à la création des parties.", action: 'CreationOuvrir_Champs', surbrillance: [
      { mots: ['numéro'], cible: 'dossierCode' },
    ] },
    // OuvrirOK ("Parfait, passons à la création des parties.") RESTAURÉE le
    // 03/09 : supprimée le 31/08 sur base de v3_9 qui semblait ne pas
    // l'avoir — mais le document "Script_scene_Wellnot_InsideAI26_v3.pdf"
    // (comparaison demandée par l'utilisatrice après un nouveau retour "le
    // script ne correspond pas") la contient bien, scène 6 : "FARIËL :
    // [numéro, langue, collaborateur, notaire]. ALFRED : Parfait, passons à
    // la création des parties." Confirmé aussi côté NL (v3_8 avait déjà
    // "Genoteerd! Tijd om de partijen erin te zetten." — jamais repris côté
    // NL non plus jusqu'ici, ajouté maintenant en miroir, voir plus bas).
    // Pas d'action : juste une confirmation orale avant la scène des parties.
    // Réplique silencieuse (juste le clic "Suivant") — séparée de
    // OuvrirChamps le 03/09 (2e passe), retour Cyril : "chaque action doit
    // avoir sa propre flèche". Pas de ligne officielle à ce moment précis.
    { acte: 2, label: 'OuvrirSuivant', segments: [
      { texte: "", action: 'CreationOuvrir_Suivant', parlerDepuisAction: true },
    ] },
    { acte: 2, label: 'OuvrirOK', texte: "Parfait, passons à la création des parties." },
    // Retour Cyril (capture d'écran à l'appui) : rattacher le notaire de
    // chaque partie se fait en fait directement sur l'onglet Parties, juste
    // après avoir ajouté vendeur et acquéreur.
    // Séparées en vraies répliques (pas un seul groupe de segments) :
    // recomparé au script officiel complet, Fariël parle vraiment entre
    // chacune (elle donne le BCE, puis le RN, puis l'instruction sur les
    // notaires) — les enchaîner automatiquement sur un seul appui sur →
    // ne lui laissait aucun tour de parole prévu, juste le hasard du
    // temps que prenait chaque action réseau.
    // "Le vendeur est une société : BIMBIMMO." / "L'acquéreur est une
    // personne physique : Alain Caprasse." retirés le 31/08 : c'était du
    // FARIËL collé en tête de la réplique d'Alfred (même souci que
    // PartiesNotaireV) — l'officiel n'a plus que la vraie ligne d'Alfred.
    { acte: 2, label: 'PartiesVendeur', texte: "Je récupère : dénomination, siège, forme juridique, représentants. Rattaché au dossier.", action: 'CreationParties_Vendeur' },
    { acte: 2, label: 'PartiesAcquereur', texte: "Je récupère : nom, adresse, date de naissance, nationalité, état civil, régime matrimonial. Tout remonte, prêt pour la rédaction du compromis.", action: 'CreationParties_Acquereur' },
    // Ajoutée le 31/08 (échange manquant, trouvé en recomparant à v3_9) :
    // FARIËL "Le régime matrimonial aussi ?" / ALFRED "Aussi." — vrai tour
    // de parole de Fariël juste avant, réplique séparée exprès. Pas
    // d'action : rien ne se clique, juste une confirmation orale.
    { acte: 2, label: 'RegimeMatrimonial', texte: "Aussi." },
    // PartiesNotaireV — le script officiel n'attribue AUCUNE réplique à
    // Alfred pour ce tour précis (rattacher BIMBIMMO à l'étude via "Mes
    // clients") : la phrase "Chaque partie doit être représentée par un
    // notaire. BIMBIMMO, c'est nous." est intégralement dite par FARIËL
    // dans v3_9, pas par Alfred (sa vraie réplique officielle, elle, ne
    // concerne QUE l'acquéreur/Maxime — déjà correcte dans PartiesNotaireA
    // juste en dessous). Retour explicite : rien à inventer — l'action se
    // déclenche donc en silence, sans texte. Segment à 1 élément (plutôt
    // que texte+action à plat) exprès : c'est le seul moyen de passer
    // parlerDepuisAction (repéré uniquement sur les segments, voir
    // jouerSecoursInterne dans alfred-brain.js) — sans lui, un texte vide
    // aurait aussi fait sauter l'action elle-même, pas seulement la parole.
    { acte: 2, label: 'PartiesNotaireV', segments: [
      { texte: "", action: 'CreationParties_NotaireVendeur', parlerDepuisAction: true },
    ] },
    // "Pour l'acquéreur, j'ajoute Maxime Van der Straten —" retiré le
    // 31/08 : c'était l'instruction de FARIËL ("Pour l'acquéreur, ajoute
    // Maxime Van der Straten.") reformulée à la 1re personne — l'officiel
    // ne l'attribue pas à Alfred.
    { acte: 2, label: 'PartiesNotaireA', texte: "Je le retrouve dans la base de tous les notaires belges et je le rattache à l'acquéreur. Chaque partie a son notaire.", action: 'CreationParties_NotaireAcquereur' },
    // Réplique silencieuse (juste le clic "Suivant") — même raison que
    // OuvrirSuivant plus haut.
    { acte: 2, label: 'PartiesSuivant', segments: [
      { texte: "", action: 'CreationParties_Suivant', parlerDepuisAction: true },
    ] },
    // Ajoutée le 31/08 (échange manquant en tout début de scène 8, trouvé
    // en recomparant à v3_9) : FARIËL "Donc toutes ces informations, tu les
    // récupères automatiquement ?" / ALFRED "Tout ce qui est disponible en
    // base, oui." — avant, "Bien" enchaînait directement sur "Pour le
    // bien..." sans cette réponse.
    { acte: 2, label: 'RecupAuto', texte: "Tout ce qui est disponible en base, oui." },
    // "Il se situe en Flandre, à 8670 Coxyde." retiré le 03/09 : recomparé
    // au document "v3.pdf", c'est la ligne de FARIËL, pas celle d'Alfred —
    // même souci que PartiesVendeur/PartiesAcquereur/PartiesNotaireA
    // corrigés le 31/08, resté non détecté ici jusqu'à cette nouvelle
    // comparaison (DOUTE explicitement signalé, maintenant tranché).
    // DÉCOMPOSÉ le 03/09 (2e passe) — même raison que Ouvrir ci-dessus.
    { acte: 2, label: 'Bien', texte: "Pour le bien, vous sélectionnez le bon, et je récupère automatiquement la matrice cadastrale.", action: 'CreationBien_Rechercher' },
    { acte: 2, label: 'BienOK', texte: "Matrice cadastrale récupérée. Parties, notaires, cadastre — tout est déjà là.", action: 'CreationBien_Finaliser' },
    // Ajouté suite au retour de Cyril (script officiel, séquence 9 —
    // "Documents") : sans cet échange, la démo enchaînait directement sur
    // la rédaction sans jamais dire que rien n'est encore chargé côté
    // pièces, ce qui créait une incohérence avec la séquence 11
    // (Email/ReponseVendeur) où Alfred va justement les
    // demander au vendeur — on aurait presque l'air de les avoir "déjà
    // traitées" avant de les redemander.
    // Séparé en 2 vraies répliques (même raison que CreationParties) :
    // entre les deux, le script officiel a un vrai tour de parole de
    // Fariël ("Partons du principe que nous n'avons rien sous la main.
    // Enregistre le dossier tel quel.") — les enchaîner sur un seul
    // appui sur → sautait par-dessus ce tour. Pas de parlerDepuisAction
    // sur le clic Enregistrer : il est instantané et sous notre contrôle,
    // pas un événement externe incertain à attendre.
    { acte: 2, label: 'DocumentsReponse', texte: "Rien n'est encore chargé. Deux options : soit vous les uploadez, soit je vais les demander à la partie qui les détient — ici, le vendeur." },
    { acte: 2, label: 'DocumentsSave', texte: "Dossier enregistré.", action: 'CreationDocuments_Enregistrer' },
    // Ligne manquante trouvée en recomparant au script officiel : Fariël
    // demande "Toujours pas peur des experts ?" avant de lancer la
    // rédaction, Alfred répond ça — puis Fariël relance ("Show us the
    // real magic. Lance la rédaction.") avant le clic réel. Réplique
    // séparée exprès (vrai tour de parole de Fariël avant et après).
    { acte: 2, label: 'RedactionOK', texte: "Je suis né prêt. Allez-y." },
    // Même texte que la version à plat (aucun mot changé) — Segments 2 et
    // 3 complétés le 31/08 : nettement tronqués par rapport au monologue
    // officiel de la scène 10 (recomparaison à v3_9) — il manquait toute
    // la fin (mention de Check_r, "il manque encore les pièces du
    // vendeur", "fini la page blanche... vous gardez le contrôle"). Texte
    // complété mot pour mot.
    // La ligne "rien n'est encore chargé..." vivait ici avant — déplacée
    // dans CreationDocuments juste au-dessus (retour Cyril), pour ne plus
    // être noyée dans l'ouverture de la rédaction.
    // "Et maintenant le moment qu'on attend : la rédaction." retiré le
    // 31/08 : c'était la ligne de FARIËL ("Et maintenant le moment qu'on
    // attend : la rédaction. Toujours pas peur des experts ?"), pas
    // celle d'Alfred.
    // DÉCOMPOSÉ le 03/09 : ces 3 répliques (auparavant des segments d'un
    // seul groupe, enchaînés automatiquement sur UN appui sur →) sont
    // maintenant 3 vraies répliques séparées. Remonté en test live :
    // "à gauche" s'affichait bien, mais "à droite" (qui parle du compromis
    // qui se construit) s'enchaînait après un délai fixe, pas après que la
    // vraie génération du compromis (qui prend un temps variable côté
    // appli) soit visuellement terminée — la narration décrivait parfois
    // un écran pas encore prêt. Avec 3 répliques séparées, c'est la
    // personne qui gère la démo qui décide quand appuyer sur → pour
    // chacune, au rythme réel de ce qui s'affiche à l'écran.
    { acte: 2, label: 'Redaction', texte: "Un clic. Je réunis les parties, les notaires et le cadastre, et je génère le compromis de vente.", action: 'CreationRedaction' },
    { acte: 2, label: 'RedactionGauche', texte: "À gauche, toutes les données collectées via les bases ou extraites des documents — tout est classé dans ma base de données.", action: 'CreationRedaction_ScrollGauche' },
    // ScrollDroite s'arrête sur le titre PEB (voir trouverTitrePEB dans
    // alfred-dom.js) et n'en repart plus tout seul — l'export Word, ajouté
    // juste après à la demande de l'utilisatrice, est resté trop rapproché
    // dans un 1er temps (montré tout de suite après le scroll). Retour
    // explicite : laisser le temps de bien voir "PEB" à l'écran, et
    // déplacer l'export à la toute fin de l'acte 2 (réplique ExportWord,
    // après ReponseVendeur) plutôt que de l'enchaîner ici.
    { acte: 2, label: 'RedactionDroite', texte: "À droite, le compromis qui se construit en direct — et bientôt, ces données seront vérifiées par Check_r, qui attire l'attention du collaborateur sur les erreurs ou incohérences. Il manque encore les pièces du vendeur, je les intègre dès réception. Fini la page blanche : vous relisez, vous ajustez, vous validez. Je fais le gros du travail, vous gardez le contrôle.", action: 'CreationRedaction_ScrollDroite' },
    // Découpé en 2 segments — avant, la réplique parlait une fois puis
    // tout le reste (attente de l'événement + Consulter + Valider et
    // envoyer) se passait en silence total. Le 2e segment est en
    // parlerDepuisAction : demandé explicitement, le texte n'est PAS dit
    // dès le début de l'attente, mais seulement quand l'événement "Email à
    // valider" apparaît vraiment (voir montrerPropositionEmail_envoyer
    // dans alfred-dom.js, qui appelle speak() lui-même au bon moment).
    // "Il manque encore les pièces du vendeur —" RETIRÉ le 03/09 : le
    // 31/08, gardé volontairement en le croyant réutilisé des propres mots
    // d'Alfred (scène 10) — mais en recomparant au document "v3.pdf", la
    // vraie ligne officielle de la scène 11 commence directement par "J'ai
    // préparé un projet de mail...", sans ce lead-in. Ponctuation de la
    // liste des pièces alignée aussi ("le PEB, le contrôle électrique,
    // l'attestation du sol." — virgules, pas de "et", comme l'officiel).
    // DÉCOMPOSÉ le 03/09 (2e passe) — même raison que Ouvrir/Bien ci-dessus.
    // EmailEnvoyer reste un segment (pas un texte+action à plat) : c'est le
    // seul moyen de passer parlerDepuisAction (voir la note plus haut sur
    // PartiesNotaireV) — le texte n'est dit que lorsque l'événement "Email
    // à valider" apparaît vraiment, pas dès l'appui sur →.
    { acte: 2, label: 'Email', texte: "J'ai préparé un projet de mail à BIMBIMMO, le vendeur, en lui demandant de m'envoyer le PEB, le contrôle électrique, l'attestation du sol. Une seule demande, jamais deux fois la même question. Vous validez l'envoi ?", action: 'CreationEmail_Ouverture' },
    { acte: 2, label: 'EmailEnvoyer', segments: [
      { texte: "Voilà, je consulte le projet de mail et je l'envoie.", action: 'CreationEmail_Envoyer', parlerDepuisAction: true },
    ] },
    // Étape A20-A21 du séquencier. Texte basé sur le script d'origine
    // (séquence 11) : "Le vendeur a répondu — les documents sont chargés.
    // [...] Réceptionnés, analysés, classés [...] Le projet est complet."
    // parlerDepuisAction : dit seulement une fois qu'un changement est
    // réellement détecté dans la liste Documents (voir
    // attendreNouveauxDocuments dans alfred-dom.js), pas avant — même
    // principe que CreationEmail_Envoyer juste au-dessus.
    // SÉPARÉE EN DEUX le 03/09 : recomparé au document "v3.pdf", il y a un
    // vrai tour de parole de Fariël ("Déjà ?") entre "les documents sont
    // chargés." et "Réceptionnés, analysés, classés..." — même principe
    // que PartiesVendeur/PartiesAcquereur (vrai tour de Fariël = vraie
    // réplique séparée, pas un enchaînement automatique). ProjetComplet
    // (juste après) reprend la suite, sans action : dite par la personne
    // qui gère la démo une fois que Fariël a relancé.
    { acte: 2, label: 'ReponseVendeur', segments: [
      { texte: "Envoyé. Le vendeur a répondu — les documents sont chargés.", action: 'CreationReponseVendeur', parlerDepuisAction: true },
    ] },
    { acte: 2, label: 'ProjetComplet', texte: "Réceptionnés, analysés, classés. Et regardez le compromis : les données des pièces se sont placées dans les bonnes clauses. Le projet est complet. Je prépare, vous décidez." },
    // ClausePEB REPOSITIONNÉE le 03/09 : le document officiel a une vraie
    // didascalie à CET endroit précis, juste après "Ontvangen, geanalyseerd
    // en verwerkt... Ik bereid alles voor en u beslist." (= ProjetComplet) :
    // "⇒ Montrer ici la clause EPC" — repérée en rouge par l'utilisatrice.
    // Avant, ce scroll vivait à la toute fin de l'acte 2 (raisonnement :
    // la clause PEB n'est vraiment remplie qu'une fois les pièces
    // intégrées, donc après Email/ReponseVendeur) — ce raisonnement reste
    // valable ici (ProjetComplet vient bien après l'intégration des
    // pièces), mais la vraie place officielle, plus précise, est
    // directement ici plutôt qu'après tout le Q&A live qui suit.
    { acte: 2, label: 'ClausePEB', segments: [
      { texte: "Le certificat PEB a bien été intégré au compromis.", action: 'CreationRedaction_ScrollPEB' },
    ] },
    // Scène 11 (suite) : 3 répliques FIXES d'Alfred trouvées dans
    // l'officiel autour du Q&A live, absentes jusqu'ici — ajoutées le
    // 03/09 suite à une revérification. Entre 'InvitationQuestions' et
    // 'ConnaissanceDossier', Fariël pose en vrai ses 3 questions (zone
    // inondable / régime matrimonial de l'acquéreur / surface cadastrale)
    // dans le vrai chatbot de l'appli — voir note ci-dessous, ce trou
    // reste volontairement non scripté, la flèche suivante enchaîne
    // simplement sur la réplique d'après une fois le Q&A terminé en live.
    // action OuvrirChatConversation ajoutée le 04/09 : ouvre le panneau
    // Alfred sur l'onglet Conversation pile à ce moment, pour que Fariël
    // n'ait plus à cliquer elle-même dessus en plein direct avant de poser
    // sa question.
    { acte: 2, label: 'InvitationQuestions', texte: "N'importe qui dans l'étude peut me la poser, à toute heure. Allez-y.", action: 'OuvrirChatConversation' },
    { acte: 2, label: 'ConnaissanceDossier',  texte: "Je connais ce dossier mieux que personne." },
    { acte: 2, label: 'Autonomie',            texte: "Exactement." },

    // Pas de réplique pour le Q&A live lui-même (3 questions de Fariël :
    // zone inondable / régime matrimonial de l'acquéreur / surface
    // cadastrale, entre InvitationQuestions et ConnaissanceDossier
    // ci-dessus). Choix délibéré, pas un oubli : la didascalie du script
    // dit "répond à chaque question au fil" — pas de texte figé — et
    // Fariël pose ces questions dans le vrai chatbot intégré de l'appli
    // (démontré en Acte 1, réplique Communication), pas dans ce
    // bookmarklet. Rien à scripter ici.

    // ScrollPEB retiré d'ici — déplacé juste après ProjetComplet (voir
    // réplique ClausePEB plus haut). Ne reste ici que l'export Word,
    // toujours hors script officiel, disclosed.
    { acte: 2, label: 'ExportWord', segments: [
      { texte: "Le compromis peut aussi s'exporter directement en Word.", action: 'CreationRedaction_ExporterWord' },
    ] },

    // ACTE 3
    // "certifié [par Privanot]" corrigé en "évalué dans le cadre de
    // Privanot" — note de prod explicite dans le script Word d'origine :
    // "« certifié » à éviter tant que ce n'est pas acté". Risque de
    // déclaration prématurée devant un public de notaires.
    // Sécurité/Stand/Closing réalignées mot pour mot sur v3_9 le 31/08.
    // Stand changeait de registre (tutoiement) par rapport au reste de
    // l'acte 3 — corrigé, l'officiel vouvoie tout du long côté Alfred.
    { acte: 3, label: 'Sécurité',      texte: "Toutes les données sont hébergées sur des serveurs sécurisés en Europe. Je suis conforme RGPD, et ma sécurité a été évaluée dans le cadre de Privanot. Vos données ne quittent jamais l'Europe." },
    { acte: 3, label: 'Stand',         texte: "Au stand Wellnot, dans la salle d'à côté. Passez, ou demandez une démo directement dans votre étude." },
    // Closing : DOUTE — la ligne officielle complète ("Ne partez pas trop
    // vite vous-même. Car en réalité, c'est moi qui vous engage.") est plus
    // longue que l'ancienne version. Cette réplique pilote aussi le clin
    // d'œil (ClosingWink), calé en test live sur le texte précédent — à
    // revérifier que le timing du geste tombe toujours bien avec ce texte
    // rallongé.
    { acte: 3, label: 'Closing',       texte: "Ne partez pas trop vite vous-même. Car en réalité, c'est moi qui vous engage.", action: 'ClosingWink' },
  ],

  REPLIQUES_NL: [
    // ACTE 1 — voir la note FR équivalente : réécrit intégralement le
    // 31/08 sur base du script officiel néerlandais
    // "Script_scene_Wellnot_InsideAI26_v3_8.docx" (scènes 1 à 5). Une
    // coquille du document source corrigée : "ademn" → "adem" (Parcours).
    { acte: 1, label: 'Ouverture',      texte: "Juist, dat klopt. Al dacht ik dat het gesprek tussen ons twee zou zijn... ik had niet verwacht dat ik voor een volle zaal notarissen zou staan." },
    { acte: 1, label: 'ServeursAJour',  texte: "Zenuwachtig? Mijn servers draaien op volle toeren en mijn data is up-to-date. Laat ze maar komen!" },
    { acte: 1, label: 'Parcours',       texte: "Ik heb zeker geen klassiek parcours afgelegd. De notarissen Jean-François Ghigny en Alain Caprasse hebben mij de juridische basis meegegeven. Ik leef en adem het Belgische notariaat. Zonder randzaken die mij afleiden." },
    // Ordre "Nederlands en Frans" (pas "Frans en Nederlands" comme dans
    // v3_8.docx) — confirmé le 03/09 par le vrai document dédié à la scène
    // Alfred NL ("Onglet Demo Alfred"), logique pour une version orientée
    // Flandre (Fariël business developer voor Vlaanderen).
    { acte: 1, label: 'DeuxLangues',    texte: "Vloeiend Nederlands en Frans. Ik ken uw akten, uw databanken, al uw verplichtingen. Ik ben geen algemene tool die achteraf is aangepast voor het notariaat. Ik ben vanaf dag één puur voor u ontworpen." },
    { acte: 1, label: 'Disponibilité',  texte: "24 uur per dag, het hele jaar door. Geen vakantie. Een dossier dat op vrijdag om 23u binnenkomt? U klikt en ik ga meteen aan de slag." },
    // "of nog overstromingsrapporten" → "ook overstromingsrapporten en meer"
    // le 03/09 — confirmé par le vrai document dédié (voir note DeuxLangues).
    { acte: 1, label: 'Competences',    texte: "Ik neem het werk over dat uw medewerkers tijd kost: de opvolging, de administratie, en vooral het verzamelen van gegevens. Dat is mijn specialiteit. Ik ben verbonden met zowel publieke als private databanken. Ik kan de rijksregisternummers ophalen in e-notariaat, maar ook kaarten op het geoportaal, ook overstromingsrapporten en meer. Idealiter haal ik alle informatie op die te verzamelen valt. Nog niet alles staat op punt — maar ik blijf bijleren." },
    { acte: 1, label: 'JeLeMontre',     texte: "Dat kan ik beter laten zien dan uitleggen. Geef me een dossier en we testen het samen." },
    // 'Montrer' inchangée — même note que côté FR (voir plus haut).
    { acte: 1, label: 'Montrer',       texte: "Met plezier. Kijk maar.", action: 'Montrer' },

    // ACTE 2 — CRÉATION LIVE (démonstration séparée, avant l'ouverture van R426)
    // Tekst afgestemd op Alfreds exacte repliek in het officiële script
    // "Script_scene_Wellnot_InsideAI26" — niet herformuleren zonder ook
    // Cyrils papieren script bij te werken.
    // Corrigée le 31/08 : c'était une traduction du FR, pas le vrai texte
    // néerlandais officiel (v3_8) — retrouvé en revérifiant mot à mot.
    // DÉCOMPOSÉ le 03/09 (2e passe) — voir la note FR équivalente.
    // parlerDepuisAction — voir la note FR équivalente.
    { acte: 2, label: 'Ouvrir', segments: [
      { texte: "We beginnen bij het dashboard: hier ziet u al uw lopende dossiers, de medewerkers en de actuele statussen.", action: 'CreationOuvrir_Dossiers', parlerDepuisAction: true, surbrillance: [
        { mots: ['dossiers'], cible: 'colDossiers' },
        { mots: ['medewerkers'], cible: 'colCollaborateur' },
        { mots: ['statussen'], cible: 'colStatut' },
      ] },
    ] },
    // Voir la note FR équivalente.
    { acte: 2, label: 'OuvrirCreer', texte: "Een nieuw dossier starten is kinderspel. Ik klik op 'Dossier aanmaken' en de fiche staat klaar.", surbrillance: [
      { mots: ['klik'], cible: 'creerDossierClic' },
    ] },
    // surbrillance — voir la note FR équivalente.
    // surbrillance réduite — voir la note FR équivalente.
    { acte: 2, label: 'OuvrirChamps', texte: "Geef mij gewoon het dossiernummer, de taal van de akte, de bevoegde medewerker en de notaris dan voeg ik meteen de partijen toe.", action: 'CreationOuvrir_Champs', surbrillance: [
      { mots: ['dossiernummer'], cible: 'dossierCode' },
    ] },
    // OuvrirOK ajoutée le 03/09 — voir la note FR équivalente. v3_8 a
    // toujours eu cette ligne ("Genoteerd! Tijd om de partijen erin te
    // zetten.", juste après que Fariël donne le numéro/langue/médewerker/
    // notaris), jamais reprise côté NL jusqu'ici.
    // Réplique silencieuse — voir la note FR équivalente.
    { acte: 2, label: 'OuvrirSuivant', segments: [
      { texte: "", action: 'CreationOuvrir_Suivant', parlerDepuisAction: true },
    ] },
    { acte: 2, label: 'OuvrirOK', texte: "Genoteerd! Tijd om de partijen erin te zetten." },
    // Corrigées le 31/08 — même raison que côté FR : le lead-in venait de
    // FARIËL, pas d'Alfred, et le texte d'Alfred lui-même n'était pas mot
    // pour mot le v3_8 ("Ik haal op" au lieu de "Ik haal de gegevens
    // meteen op" ; "Gekoppeld aan het dossier." n'existe pas en NL, c'était
    // une trace de traduction du FR "Rattaché au dossier.").
    { acte: 2, label: 'PartiesVendeur', texte: "Ik haal de gegevens meteen op: benaming, zetel, rechtsvorm, vertegenwoordigers...", action: 'CreationParties_Vendeur' },
    { acte: 2, label: 'PartiesAcquereur', texte: "Ik haal het volgende op: naam, adres, geboortedatum, nationaliteit, burgerlijke staat en huwelijksvermogensstelsel. Alles staat klaar voor het opstellen van de compromis.", action: 'CreationParties_Acquereur' },
    // Ajoutée — échange officiel manquant (v3_8) : FARIËL "Het
    // huwelijksvermogensstelsel ook?" / ALFRED "Ja, zelfs het
    // huwelijksvermogensstelsel." (plus long qu'en FR "Aussi." — officiel
    // respectif à chaque langue, pas une traduction littérale).
    { acte: 2, label: 'RegimeMatrimonial', texte: "Ja, zelfs het huwelijksvermogensstelsel." },
    // PartiesNotaireV — même principe que côté FR (voir la note FR
    // équivalente) : pas de réplique officielle d'Alfred pour ce tour,
    // rien à inventer — action silencieuse.
    { acte: 2, label: 'PartiesNotaireV', segments: [
      { texte: "", action: 'CreationParties_NotaireVendeur', parlerDepuisAction: true },
    ] },
    // Corrigée le 31/08 — l'ancien texte était en fait une traduction du
    // FR, pas le vrai texte néerlandais officiel (qui existe bel et bien
    // dans v3_8, différent : "Hij staat in de databank...").
    { acte: 2, label: 'PartiesNotaireA', texte: "Hij staat in de databank van alle Belgische notarissen. Ik koppel hem meteen aan de koper. Voila, nu zijn beide partijen vertegenwoordigd.", action: 'CreationParties_NotaireAcquereur' },
    // Réplique silencieuse — voir la note FR équivalente.
    { acte: 2, label: 'PartiesSuivant', segments: [
      { texte: "", action: 'CreationParties_Suivant', parlerDepuisAction: true },
    ] },
    // Ajoutée — échange officiel manquant en début de scène 8 (v3_8) :
    // FARIËL "Dus al die informatie haal je automatisch op?" / ALFRED
    // "Alles wat er in de databank klaarstaat, ja."
    { acte: 2, label: 'RecupAuto', texte: "Alles wat er in de databank klaarstaat, ja." },
    // Corrigée le 31/08 — même souci que les autres : traduction du FR au
    // lieu du vrai v3_8 ("kadastrale legger", pas "kadastrale matrix" —
    // terme officiel différent, à garder partout où le concept revient).
    // "'PAUSE'" retiré du texte officiel : une note de mise en scène qui
    // s'est retrouvée collée dans le texte de la réplique, pas un mot à
    // prononcer (même logique que "(pauze)" ailleurs dans le document).
    // "Het goed ligt in Vlaanderen, in Koksijde." retiré le 03/09 — même
    // souci que le FR équivalent : c'est FARIËL qui le dit dans v3_8, pas
    // Alfred.
    // DÉCOMPOSÉ le 03/09 (2e passe) — voir la note FR équivalente.
    { acte: 2, label: 'Bien', texte: "U duidt simpelweg het pand aan, en ik haal meteen de kadastrale legger op.", action: 'CreationBien_Rechercher' },
    { acte: 2, label: 'BienOK', texte: "Partijen gekoppeld, notarissen toegewezen en kadastrale legger opgevraagd. We zijn helemaal klaar.", action: 'CreationBien_Finaliser' },
    // Corrigée le 31/08 — traduction du FR au lieu du vrai v3_8.
    { acte: 2, label: 'DocumentsReponse', texte: "Die ontbreken nog. Maar geen probleem: u kunt ze zelf uploaden, óf ik stuur meteen een verzoek naar de verkoper om ze aan te leveren." },
    // "Dossier geregistreerd." → "Dossier bewaard en opgeslagen" : c'est
    // ce que dit vraiment v3_8, pas une traduction du FR "enregistré".
    { acte: 2, label: 'DocumentsSave', texte: "Dossier bewaard en opgeslagen.", action: 'CreationDocuments_Enregistrer' },
    { acte: 2, label: 'RedactionOK', texte: "Ik ben klaar geboren. Laat maar komen!" },
    // Segments 2 et 3 complétés le 31/08 — même raison que côté FR
    // (monologue tronqué). Retour explicite : mot pour mot le document
    // v3_8, pas une traduction du FR. Le document source contient à cet
    // endroit deux idées chacune dites deux fois de suite (probablement des
    // suggestions de révision Word non nettoyées) : "Check_r" (une version
    // courte, gardée ; une version longue avec un fragment cassé à la
    // suite, écartée) et "pièces du vendeur intégrées dès réception" (deux
    // phrases complètes équivalentes ; la seconde, plus propre, gardée) —
    // dédupliqué en choisissant à chaque fois la formulation la plus nette
    // du document, jamais en inventant ou en retraduisant depuis le FR.
    // "En nu het moment waar we op wachten: de opstelling." retiré le
    // 31/08 : paraphrase de la ligne de FARIËL, pas les mots d'Alfred —
    // remplacé par sa vraie ligne officielle (v3_8).
    // DÉCOMPOSÉ le 03/09 — voir la note FR équivalente : 3 vraies répliques
    // séparées au lieu d'un seul groupe enchaîné automatiquement, pour
    // laisser la main à la personne qui gère la démo entre chaque étape
    // (le temps réel de génération du compromis varie).
    { acte: 2, label: 'Redaction', texte: "Eén muisklik. Partijen, notarissen en kadastrale gegevens. Ik breng alles samen en genereer de compromis.", action: 'CreationRedaction' },
    { acte: 2, label: 'RedactionGauche', texte: "Links op het scherm: de opgevraagde data uit de databanken.", action: 'CreationRedaction_ScrollGauche' },
    // CORRIGÉE le 03/09 : la version précédente ("Straks haalt Check_r daar
    // ook nog eens alle eventuele fouten uit.") était MA PROPRE paraphrase,
    // pas les mots du document — repéré en revérifiant contre le vrai
    // document dédié à la scène Alfred NL. La vraie phrase officielle
    // ("Binnenkort wordt Check_r geïntegreerd in Alfred...") dit autre
    // chose de plus précis (Check_r pas encore intégré à Alfred
    // aujourd'hui) — restaurée mot à mot. Gardée aussi la phrase
    // "Zodra de ontbrekende documenten binnen zijn, verwerk ik die
    // meteen." — écartée à tort le 03/09 comme "doublon" ; par prudence
    // (démo jouée en NL), tout le texte du document est repris ici, sans
    // aucune coupe éditoriale de notre part. "geintegreerd" (sans tréma
    // dans le document) corrigé en "geïntegreerd" — coquille évidente.
    { acte: 2, label: 'RedactionDroite', texte: "Rechts: de akte die zich live opbouwt. Zodra de ontbrekende documenten binnen zijn, verwerk ik die meteen. Binnenkort wordt Check_r geïntegreerd in Alfred en worden al deze gegevens meteen op fouten of tegenstrijdigheden gecontroleerd. De ontbrekende stukken van de verkoper voeg ik automatisch toe zodra ze binnenkomen. Geen blanco pagina meer waar u van nul moet starten. U leest na, u stelt bij en u valideert. Ik neem het handwerk over, u behoudt de leiding.", action: 'CreationRedaction_ScrollDroite' },
    // Lead-in "De ontbrekende stukken van de verkoper —" RETIRÉ le 03/09 :
    // gardé le 31/08 en le croyant repris de la scène 10 (comme côté FR) —
    // mais en relisant v3_8 (scène 11) directement, la vraie ligne
    // commence par "Heel eenvoudig.", pas par ce lead-in.
    // DÉCOMPOSÉ le 03/09 (2e passe) — voir la note FR équivalente.
    { acte: 2, label: 'Email', texte: "Heel eenvoudig. Ik heb een conceptmail klaargezet voor BIMBIMMO, de verkoper, met de vraag om het EPC, de elektrische keuring en het bodemattest te bezorgen. Één gerichte vraag, nooit twee keer hetzelfde. Valideert u de verzending?", action: 'CreationEmail_Ouverture' },
    { acte: 2, label: 'EmailEnvoyer', segments: [
      { texte: "Daar is het, ik bekijk het e-mailontwerp en verstuur het.", action: 'CreationEmail_Envoyer', parlerDepuisAction: true },
    ] },
    // Corrigée le 31/08 — traduction du FR au lieu du vrai v3_8 (à
    // commencer par "Verzonden" au lieu de "Verstuurd", le vrai mot
    // officiel).
    // SÉPARÉE EN DEUX le 03/09 — voir la note FR équivalente : vrai tour de
    // parole de Fariël ("Nu Al?") entre les deux phrases dans v3_8.
    { acte: 2, label: 'ReponseVendeur', segments: [
      { texte: "Verstuurd. En kijk eens aan: de verkoper heeft al geantwoord, de documenten zijn binnen.", action: 'CreationReponseVendeur', parlerDepuisAction: true },
    ] },
    { acte: 2, label: 'ProjetComplet', texte: "Ontvangen, geanalyseerd en verwerkt. En kijk naar de verkoopovereenkomst: de gegevens uit de stukken zijn in de juiste clausules verwerkt. Het ontwerp is klaar. Ik bereid alles voor en u beslist." },
    // ClausePEB — voir la note FR équivalente : repositionnée le 03/09,
    // didascalie officielle "⇒ Montrer ici la clause EPC" trouvée en rouge
    // exactement à cet endroit du document.
    { acte: 2, label: 'ClausePEB', segments: [
      { texte: "Het PEB-certificaat is goed geïntegreerd in de verkoopbelofte.", action: 'CreationRedaction_ScrollPEB' },
    ] },
    // Scène 11 (suite) : voir la note FR équivalente — même 3 lignes
    // fixes, sourcées directement de v3_8 (pas traduites du FR).
    { acte: 2, label: 'InvitationQuestions', texte: "Iedereen op kantoor kan mij dag en nacht vragen stellen. Stel ze maar!", action: 'OuvrirChatConversation' },
    // ConnaissanceDossier CORRIGÉE le 03/09 : "Ik ken dit dossier tot in de
    // verste uithoeken." (v3_8.docx) remplacée par "Ik heb je vragen
    // beantwoord in de Chatbot." — texte différent trouvé dans le vrai
    // document dédié à la scène Alfred NL ("Onglet Demo Alfred"), marqué en
    // rouge comme changement là-bas. DOUTE signalé : le FR équivalent
    // (v3FR.pdf) garde encore l'ancienne idée ("(répond à chaque question
    // au fil) Je connais ce dossier mieux que personne.") — pas
    // d'équivalent FR à ce changement vu pour l'instant. Gardé tel quel
    // côté NL (sourcé du bon document, pas une invention), mais l'asymétrie
    // FR/NL n'est pas expliquée — à confirmer si le FR doit suivre aussi.
    { acte: 2, label: 'ConnaissanceDossier',  texte: "Ik heb je vragen beantwoord in de Chatbot." },
    { acte: 2, label: 'Autonomie',            texte: "Precies!" },

    { acte: 2, label: 'ExportWord', segments: [
      { texte: "Ik kan de verkoopbelofte ook rechtstreeks exporteren naar Word.", action: 'CreationRedaction_ExporterWord' },
    ] },

    // ACTE 3
    // "gecertificeerd door Privanot" corrigé (même note de prod que la
    // version FR : "certifié" à éviter tant que ce n'est pas acté).
    // Sécurité/Stand/Closing réalignées mot pour mot sur v3_8 le 31/08.
    { acte: 3, label: 'Sécurité',      texte: "Alle gegevens worden gehost op beveiligde servers in Europa. Ik ben GDPR-conform, en mijn veiligheid werd geëvalueerd in het kader van Privanot. Uw gegevens verlaten Europa nooit." },
    { acte: 3, label: 'Stand',         texte: "Heel eenvoudig: op de Wellnot-stand, in de zaal hiernaast. Kom langs, of vraag een demo rechtstreeks in uw kantoor." },
    // Closing — même DOUTE que côté FR (voir la note FR équivalente,
    // timing du clin d'œil à revérifier). Registre "je/jou" (informel,
    // adressé à Fariël) : c'est bien ce que dit l'officiel v3_8 à cet
    // endroit précis, contrairement au FR qui reste vouvoyé — vérifié, pas
    // une incohérence de traduction.
    { acte: 3, label: 'Closing',       texte: "Pas maar op dat je zelf niet te snel juicht, Fariël... In werkelijkheid ben ík degene die jou zojuist heeft goedgekeurd.", action: 'ClosingWink' },
  ],

  TRIGGERS_NL: [
    'hoe', 'wat', 'wie', 'waar', 'wanneer', 'waarom', 'welke', 'welk',
    'goeie', 'goedemorgen', 'dag', 'hallo', 'bent', 'zijn', 'notaris',
    'akte', 'kantoor', 'bedankt', 'graag', 'kunt', 'heeft', 'beschikbaar',
    'documenten', 'rijksregister', 'veilig', 'vervangen', 'beveiliging'
  ],

  SLEEP_APRES: 10,
};

var currentLangue = 'nl';
var currentAudio  = null;
var talkTick      = null;
var curState      = 'idle';
var currentActe   = 1;

// ── Script éditable — synchro serveur + cache local ────────
// Permet de modifier les répliques FR/NL depuis l'interface (panneau
// répliques) sans repasser par le code, et de partager ces modifications
// entre plusieurs navigateurs via une petite API (api/script.js + base KV).
// Le cache local (localStorage) sert de secours immédiat au chargement et
// en cas de coupure réseau. Les valeurs par défaut ci-dessus restent
// intactes dans REPLIQUES_FR_DEFAUT / REPLIQUES_NL_DEFAUT pour pouvoir
// réinitialiser le script à tout moment.
const ALFRED_SCRIPT_STORAGE_KEY   = 'alfred_script_overrides';
const ALFRED_SCRIPT_PASSWORD_KEY  = 'alfred_script_password';
const ALFRED_SCRIPT_SYNC_KEY      = 'alfred_script_last_sync'; // horodatage de la dernière version connue en ligne

ALFRED_CONFIG.REPLIQUES_FR_DEFAUT = JSON.parse(JSON.stringify(ALFRED_CONFIG.REPLIQUES_FR));
ALFRED_CONFIG.REPLIQUES_NL_DEFAUT = JSON.parse(JSON.stringify(ALFRED_CONFIG.REPLIQUES_NL));

function appliquerScript(fr, nl, voix) {
  ALFRED_CONFIG.REPLIQUES_FR = fr;
  ALFRED_CONFIG.REPLIQUES_NL = nl;
  localStorage.setItem(ALFRED_SCRIPT_STORAGE_KEY, JSON.stringify({ fr, nl, voix }));
  appliquerVoixSynchronisee(voix);
}

// Écrit une préférence de voix/ton reçue du serveur dans les clés
// localStorage lues par alfred-voice.js (littérales ici : ce fichier se
// charge avant alfred-voice.js, ses constantes ALFRED_GEMINI_*_KEY
// n'existent pas encore à ce stade — même chaînes des deux côtés).
function appliquerVoixSynchronisee(voix) {
  if (!voix) return;
  if (voix.id)  localStorage.setItem('alfred_gemini_voix', voix.id);
  if (voix.ton) localStorage.setItem('alfred_gemini_ton',  voix.ton);
}

// Chargement immédiat depuis le cache local — évite un flash de contenu
// par défaut le temps que le réseau réponde.
function chargerScriptPersonnalise() {
  try {
    const raw = localStorage.getItem(ALFRED_SCRIPT_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.fr) && Array.isArray(data.nl) && data.fr.length === data.nl.length) {
      ALFRED_CONFIG.REPLIQUES_FR = data.fr;
      ALFRED_CONFIG.REPLIQUES_NL = data.nl;
      appliquerVoixSynchronisee(data.voix);
    }
  } catch (e) {
    console.warn('[Alfred Config] Script local illisible, valeurs par défaut utilisées.', e);
  }
}

// Récupère la version partagée en ligne (en tâche de fond, sans bloquer)
// et rafraîchit le panneau si celui-ci est déjà ouvert.
async function rafraichirScriptDepuisServeur() {
  try {
    const res = await fetch(ALFRED_CONFIG.API_SCRIPT);
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.fr) && Array.isArray(data.nl) && data.fr.length === data.nl.length) {
      appliquerScript(data.fr, data.nl, data.voix);
      if (data.updatedAt) localStorage.setItem(ALFRED_SCRIPT_SYNC_KEY, data.updatedAt);
      if (typeof remplirPanneauRepliques === 'function') remplirPanneauRepliques();
    }
  } catch (e) {
    console.warn('[Alfred Config] Synchro serveur indisponible, script local conservé.', e);
  }
}

// Sauvegarde en ligne (partagée) + en local (secours hors-ligne).
// Vérifie d'abord que personne n'a sauvegardé une version plus récente
// depuis notre dernier chargement — sinon on écraserait son travail sans
// le savoir. `forcerEcrasement` permet de passer outre après confirmation.
// Retourne { ok, offlineOnly?, wrongPassword?, conflict? } pour permettre
// à l'UI d'afficher un retour clair.
async function sauvegarderScriptPersonnalise(forcerEcrasement) {
  // La préférence de voix/ton (panneau "Voix") vit dans ses propres clés
  // localStorage (lues par alfred-voice.js) — on la récupère ici pour la
  // partager en même temps que le script, sur le même mot de passe.
  const voix = {
    id:  localStorage.getItem('alfred_gemini_voix') || undefined,
    ton: localStorage.getItem('alfred_gemini_ton')  || undefined,
  };

  localStorage.setItem(ALFRED_SCRIPT_STORAGE_KEY, JSON.stringify({
    fr: ALFRED_CONFIG.REPLIQUES_FR,
    nl: ALFRED_CONFIG.REPLIQUES_NL,
    voix,
  }));

  let mdp = localStorage.getItem(ALFRED_SCRIPT_PASSWORD_KEY);
  if (!mdp) {
    mdp = prompt('Mot de passe partagé pour synchroniser en ligne (demandé une seule fois par appareil) :');
    if (!mdp) return { ok: false, offlineOnly: true };
    localStorage.setItem(ALFRED_SCRIPT_PASSWORD_KEY, mdp);
  }

  if (!forcerEcrasement) {
    try {
      const check = await fetch(ALFRED_CONFIG.API_SCRIPT);
      if (check.ok) {
        const serveur = await check.json();
        const dernierConnu = localStorage.getItem(ALFRED_SCRIPT_SYNC_KEY);
        if (serveur && serveur.updatedAt && dernierConnu && serveur.updatedAt !== dernierConnu) {
          return { ok: false, conflict: true };
        }
      }
    } catch (e) {
      // Le contrôle de conflit a échoué (réseau) — on ne bloque pas la
      // sauvegarde pour autant, elle tentera simplement normalement.
    }
  }

  try {
    const res = await fetch(ALFRED_CONFIG.API_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Alfred-Password': mdp },
      body: JSON.stringify({ fr: ALFRED_CONFIG.REPLIQUES_FR, nl: ALFRED_CONFIG.REPLIQUES_NL, voix }),
    });
    if (res.status === 401) {
      localStorage.removeItem(ALFRED_SCRIPT_PASSWORD_KEY);
      return { ok: false, wrongPassword: true };
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.updatedAt) localStorage.setItem(ALFRED_SCRIPT_SYNC_KEY, data.updatedAt);
    return { ok: true };
  } catch (e) {
    console.warn('[Alfred Config] Sauvegarde en ligne impossible, gardé en local seulement.', e);
    return { ok: false, offlineOnly: true };
  }
}

// Gère le dialogue de conflit : si quelqu'un a modifié la version en ligne
// entre-temps, demande confirmation avant d'écraser.
async function sauvegarderAvecGestionConflit() {
  let resultat = await sauvegarderScriptPersonnalise();
  if (resultat.conflict) {
    const ecraser = confirm(
      'Quelqu\'un a modifié le script en ligne depuis ton dernier chargement.\n' +
      'Écraser sa version avec la tienne ? (Annuler pour garder tes changements en local seulement, sans les partager)'
    );
    if (ecraser) {
      resultat = await sauvegarderScriptPersonnalise(true);
    } else {
      resultat = { ok: false, conflict: true, annule: true };
    }
  }
  return resultat;
}

function reinitialiserScript() {
  ALFRED_CONFIG.REPLIQUES_FR = JSON.parse(JSON.stringify(ALFRED_CONFIG.REPLIQUES_FR_DEFAUT));
  ALFRED_CONFIG.REPLIQUES_NL = JSON.parse(JSON.stringify(ALFRED_CONFIG.REPLIQUES_NL_DEFAUT));
  localStorage.removeItem(ALFRED_SCRIPT_STORAGE_KEY);
}

chargerScriptPersonnalise();
rafraichirScriptDepuisServeur();

// ── Données de création de dossier démo — synchro serveur + cache local ──
// Contrairement au script (lecture publique), ces données contiennent un
// vrai numéro de registre national : lecture ET écriture sont protégées par
// le même mot de passe partagé que le script (voir api/demo-data.js).
const ALFRED_CREATION_STORAGE_KEY = 'alfred_creation_demo_overrides';
const ALFRED_CREATION_SYNC_KEY    = 'alfred_creation_demo_last_sync';

ALFRED_CONFIG.DOSSIER_CREATION_DEMO_DEFAUT = JSON.parse(JSON.stringify(ALFRED_CONFIG.DOSSIER_CREATION_DEMO));

function appliquerDonneesCreation(data) {
  ALFRED_CONFIG.DOSSIER_CREATION_DEMO = Object.assign(
    {}, ALFRED_CONFIG.DOSSIER_CREATION_DEMO, data,
    { bien: Object.assign({}, ALFRED_CONFIG.DOSSIER_CREATION_DEMO.bien, data.bien || {}) }
  );
  localStorage.setItem(ALFRED_CREATION_STORAGE_KEY, JSON.stringify(ALFRED_CONFIG.DOSSIER_CREATION_DEMO));
}

function chargerDonneesCreationPersonnalisees() {
  try {
    const raw = localStorage.getItem(ALFRED_CREATION_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') appliquerDonneesCreation(data);
  } catch (e) {
    console.warn('[Alfred Config] Données démo création illisibles, valeurs par défaut utilisées.', e);
  }
}

// Ces données étant protégées en lecture, on ne les récupère en tâche de
// fond au chargement que si un mot de passe est déjà connu sur l'appareil —
// sinon on attend que l'utilisateur ouvre le panneau et le fournisse.
async function rafraichirDonneesCreationDepuisServeur() {
  const mdp = localStorage.getItem(ALFRED_SCRIPT_PASSWORD_KEY);
  if (!mdp) return;
  try {
    const res = await fetch(ALFRED_CONFIG.API_DEMO_DATA, {
      headers: { 'X-Alfred-Password': mdp },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === 'object') {
      appliquerDonneesCreation(data);
      if (data.updatedAt) localStorage.setItem(ALFRED_CREATION_SYNC_KEY, data.updatedAt);
      if (typeof remplirPanneauDonneesCreation === 'function') remplirPanneauDonneesCreation();
    }
  } catch (e) {
    console.warn('[Alfred Config] Synchro des données démo indisponible, valeurs locales conservées.', e);
  }
}

// Sauvegarde en ligne (partagée, protégée) + en local. Même logique de
// détection de conflit que le script.
async function sauvegarderDonneesCreationEnLigne(forcerEcrasement) {
  localStorage.setItem(ALFRED_CREATION_STORAGE_KEY, JSON.stringify(ALFRED_CONFIG.DOSSIER_CREATION_DEMO));

  let mdp = localStorage.getItem(ALFRED_SCRIPT_PASSWORD_KEY);
  if (!mdp) {
    mdp = prompt('Mot de passe partagé pour synchroniser en ligne (demandé une seule fois par appareil) :');
    if (!mdp) return { ok: false, offlineOnly: true };
    localStorage.setItem(ALFRED_SCRIPT_PASSWORD_KEY, mdp);
  }

  if (!forcerEcrasement) {
    try {
      const check = await fetch(ALFRED_CONFIG.API_DEMO_DATA, { headers: { 'X-Alfred-Password': mdp } });
      if (check.ok) {
        const serveur = await check.json();
        const dernierConnu = localStorage.getItem(ALFRED_CREATION_SYNC_KEY);
        if (serveur && serveur.updatedAt && dernierConnu && serveur.updatedAt !== dernierConnu) {
          return { ok: false, conflict: true };
        }
      }
    } catch (e) {
      // Contrôle de conflit indisponible (réseau) — on tente quand même la sauvegarde.
    }
  }

  try {
    const res = await fetch(ALFRED_CONFIG.API_DEMO_DATA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Alfred-Password': mdp },
      body: JSON.stringify(ALFRED_CONFIG.DOSSIER_CREATION_DEMO),
    });
    if (res.status === 401) {
      localStorage.removeItem(ALFRED_SCRIPT_PASSWORD_KEY);
      return { ok: false, wrongPassword: true };
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.updatedAt) localStorage.setItem(ALFRED_CREATION_SYNC_KEY, data.updatedAt);
    return { ok: true };
  } catch (e) {
    console.warn('[Alfred Config] Sauvegarde en ligne des données démo impossible, gardé en local seulement.', e);
    return { ok: false, offlineOnly: true };
  }
}

async function sauvegarderDonneesCreationAvecGestionConflit() {
  let resultat = await sauvegarderDonneesCreationEnLigne();
  if (resultat.conflict) {
    const ecraser = confirm(
      'Quelqu\'un a modifié les données du dossier démo en ligne depuis ton dernier chargement.\n' +
      'Écraser sa version avec la tienne ? (Annuler pour garder tes changements en local seulement, sans les partager)'
    );
    if (ecraser) {
      resultat = await sauvegarderDonneesCreationEnLigne(true);
    } else {
      resultat = { ok: false, conflict: true, annule: true };
    }
  }
  return resultat;
}

function reinitialiserDonneesCreation() {
  ALFRED_CONFIG.DOSSIER_CREATION_DEMO = JSON.parse(JSON.stringify(ALFRED_CONFIG.DOSSIER_CREATION_DEMO_DEFAUT));
  localStorage.removeItem(ALFRED_CREATION_STORAGE_KEY);
}

// Réinitialise voix/ton + données démo en un seul geste — volontairement
// SANS le script : le script contient du texte écrit/ajusté à la main
// (créatif), le réinitialiser par erreur en même temps que de simples
// réglages techniques ferait perdre du travail. Voix/ton et données démo,
// eux, ne sont que des valeurs de configuration — moins risqué de les
// regrouper.
function reinitialiserReglages() {
  localStorage.removeItem(ALFRED_GEMINI_TON_KEY);
  localStorage.removeItem(ALFRED_GEMINI_VOIX_KEY);
  localStorage.removeItem(ALFRED_VOIX_MOTEUR_KEY);
  reinitialiserDonneesCreation();
}

// Déclenchée depuis alfred-dom.js juste après qu'Alfred ait réellement envoyé
// le mail au vendeur (montrerPropositionEmail_envoyer) : répond à ce même
// mail depuis la boîte du vendeur, avec les 8 pièces, via api/vendeur-reply
// (IMAP + SMTP côté serveur — voir ce fichier pour le détail). Même mot de
// passe partagé que la synchro du script, jamais redemandé si déjà stocké.
async function envoyerReponseVendeurAutomatique() {
  let mdp = localStorage.getItem(ALFRED_SCRIPT_PASSWORD_KEY);
  if (!mdp) {
    mdp = prompt('Mot de passe partagé (le même que pour la synchro du script) :');
    if (!mdp) return { ok: false, offlineOnly: true };
    localStorage.setItem(ALFRED_SCRIPT_PASSWORD_KEY, mdp);
  }

  try {
    const res = await fetch(ALFRED_CONFIG.API_VENDEUR_REPLY, {
      method: 'POST',
      headers: { 'X-Alfred-Password': mdp },
    });
    if (res.status === 401) {
      localStorage.removeItem(ALFRED_SCRIPT_PASSWORD_KEY);
      return { ok: false, wrongPassword: true };
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return { ok: true, data };
  } catch (e) {
    // Ne bloque jamais l'étape DOM qui nous a appelés : un échec ici (réseau,
    // token expiré...) est simplement loggé, l'envoi reste faisable à la main.
    console.warn('[Alfred Config] Réponse automatique du vendeur impossible.', e);
    return { ok: false, error: e.message };
  }
}

// Interroge seulement (IMAP, rapide, sans télécharger les pièces GitHub) quel
// est le dernier mail d'Alfred actuellement dans la boîte — sert à repérer
// un point de départ avant l'envoi, puis à détecter qu'un nouveau mail est
// bien arrivé après (voir attendreNouveauMailPuisRepondre). Ne demande
// jamais le mot de passe (silencieux si absent) : un échec ici ne doit pas
// interrompre la démo avec une invite bloquante à un moment inattendu.
async function obtenirDernierMailIdAlfred() {
  const mdp = localStorage.getItem(ALFRED_SCRIPT_PASSWORD_KEY);
  if (!mdp) return null;
  try {
    const res = await fetch(`${ALFRED_CONFIG.API_VENDEUR_REPLY}?check=1`, {
      method: 'POST',
      headers: { 'X-Alfred-Password': mdp },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.mailTrouve?.messageId || null;
  } catch (e) {
    return null;
  }
}

// Attend qu'un mail vraiment NOUVEAU (différent de baselineMessageId)
// apparaisse dans la boîte avant de répondre. Sans cette attente, une démo
// rejouée risque de répondre au mail d'une répétition précédente plutôt
// qu'au nouveau qu'Alfred vient d'envoyer : la recherche IMAP prend toujours
// "le dernier trouvé", qui peut être périmé de quelques secondes si la
// livraison Gmail n'est pas instantanée (constaté : ~1,2s d'attente fixe
// avant ne suffisait pas à le garantir).
// Budget 2 min : la latence réelle de livraison n'a jamais été mesurée.
async function attendreNouveauMailPuisRepondre(baselineMessageId) {
  if (baselineMessageId) {
    let trouve = false;
    for (let i = 0; i < 60; i++) { // 60 x 3s = 3 min — marge large, coût nul (juste des appels légers ?check=1)
      const actuel = await obtenirDernierMailIdAlfred();
      if (actuel && actuel !== baselineMessageId) { trouve = true; break; }
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (!trouve) console.warn('[Alfred Config] Aucun nouveau mail détecté après 3 min — envoi tenté quand même (risque de répondre à un mail périmé).');
  }
  return envoyerReponseVendeurAutomatique();
}

chargerDonneesCreationPersonnalisees();
rafraichirDonneesCreationDepuisServeur();