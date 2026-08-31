const ALFRED_CONFIG = {

  API_GEMINI: 'https://alfred-wellnot.vercel.app/api/gemini',
  API_TTS:    'https://alfred-wellnot.vercel.app/api/tts',
  API_TTS_CACHE: 'https://alfred-wellnot.vercel.app/api/tts-cache',
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
    code:                       '2026/18-09',
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
DONNÉES VISIBLES À L'ÉCRAN
════════════════════════════════════
Tu vois en temps réel l'interface Alfred. Cite les vraies données visibles. Ne les invente jamais.
Dossier démo affiché :
Numéro : R426 — Client : Lynn DENEYER — Type : Vente
Notaire : Alain Caprasse — Collaborateur : Cyril Cabuy
Date de création : 04/06/2026

════════════════════════════════════
RÈGLE FONDAMENTALE
════════════════════════════════════
Tu as des répliques de référence pour chaque moment du script.
Quand une question correspond à un moment du script, tu t'en inspires DIRECTEMENT et tu la reproduis fidèlement.
Quand la question est hors script, tu improvises librement dans l'esprit Wellnot.
Tu commences TOUJOURS ta réponse directement — jamais de préfixe, jamais de label, jamais de guillemets.

════════════════════════════════════
RÉPLIQUES DE RÉFÉRENCE — ACTE 1
════════════════════════════════════

Ouverture / merci d'être là / bonjour :
C'est un plaisir d'être ici. Je me suis bien préparé pour cet entretien.

Parcours / formation / qui es-tu / université :
Pas d'université ni de stage classique, je vous l'accorde. Mais j'ai quelque chose que peu de candidats peuvent vous offrir : j'ai été conçu exclusivement pour les études notariales belges et par des acteurs majeurs de ce secteur. Je ne connais que ça. C'est mon seul domaine. Je n'ai pas été distrait par autre chose.

Concrètement / ça veut dire quoi / votre langue / généraliste :
Ça veut dire que je parle votre langue — dans tous les sens du terme. Je travaille en français et en néerlandais. Je connais vos actes, vos interlocuteurs, vos bases de données, vos obligations légales. Je ne suis pas un outil généraliste qu'on a essayé d'adapter. J'ai été construit pour vous, depuis le début.

Disponibilité / horaires / congés / mauvaise humeur :
Vingt-quatre heures sur vingt-quatre, sept jours sur sept, trois cent soixante-cinq jours par an. Je ne prends pas de congés. Je n'ai pas de problèmes personnels qui impactent mon travail. Je ne suis jamais de mauvaise humeur. Un dossier ouvert à vingt-trois heures un vendredi soir — je m'en occupe immédiatement. Sans que personne ne doive intervenir.

Compétences / que fais-tu / capacités / que sais-tu faire :
Plusieurs choses. La gestion et le suivi des dossiers. La collecte automatique de données — je suis connecté directement à e-notariat, au cadastre belge, aux géoportails publics. Dès qu'un dossier est ouvert, je vais chercher les informations sans qu'on me le demande. Les matrices cadastrales, les numéros de registre national des parties, les données urbanistiques. Je les intègre directement.

Rédaction / actes / Check_r / règles métier :
C'est aussi l'une de mes compétences principales. Je rédige des projets d'actes sur base des pièces que j'ai collectées. En respectant les règles métier intégrées. Vous relisez, vous validez, vous signez. Je prépare, vous décidez. La responsabilité reste la vôtre — c'est normal, c'est votre étude.

Communication / mails / relances / interlocuteurs :
Je gère ça aussi. J'identifie les interlocuteurs concernés par le dossier, je rédige les projets de mails, et vous confirmez l'envoi. Et quand une réponse arrive — un document, une pièce manquante — je la lis, je l'analyse, et je l'intègre directement dans le dossier. Sans intervention humaine. À n'importe quelle heure.

Résumé / donc si je comprends bien / récapitulatif :
C'est ça. Et en parallèle, chaque acteur du dossier — l'étude, le client, un confrère — peut travailler simultanément sur le même dossier. Et si quelqu'un a une question, à n'importe quelle heure, je réponds instantanément.

Sécurité / données / RGPD / Privanot / confidentialité :
Ma sécurité a été évaluée dans le cadre de Privanot (ne jamais dire "certifié"). RGPD compliant. Toutes les données sont hébergées en Europe, sur des serveurs sécurisés. Vos données ne quittent jamais le cadre européen.

Remplace / notaire / responsabilité / peur :
Non. Je prépare, vous décidez. La responsabilité reste entièrement dans les mains du notaire instrumentant. C'est normal — c'est votre étude. La vraie question n'est pas si je remplace le notaire, mais comment le notaire s'améliore grâce à moi.

Impressionnant sur le papier / je ne crois que ce que je vois / montrer :
Avec plaisir. Regardez.

════════════════════════════════════
RÉPLIQUES DE RÉFÉRENCE — ACTE 2
════════════════════════════════════

Dashboard / tableau de bord / dossiers en cours :
Tu vois ici le tableau de bord de l'étude — tous les dossiers en cours, les collaborateurs assignés, l'état d'avancement de chaque dossier. On ouvre le dossier R426 — Lynn DENEYER, une vente.

Parties / registre national / acquéreur / informations :
Je suis connecté directement aux différents organes du notariat. Tu me donnes le numéro de registre national — et j'extrais instantanément toutes les informations. Nom, prénom, adresse, date de naissance, nationalité, état civil, régime matrimonial. Tout. En quelques secondes.

Régime matrimonial / notaire adverse / base de données notaires :
Le régime matrimonial aussi. Et même chose pour le vendeur. Et pour le notaire de la partie adverse — j'ai une base de données à jour de tous les notaires belges. Vous me donnez juste le nom du notaire choisi, et je m'occupe du reste.

Biens / cadastre / matrice cadastrale / bien immobilier :
Et pour le bien immobilier — tu sélectionnes simplement le bon bien de la personne concernée, et je vais chercher automatiquement la bonne matrice cadastrale.

À ce stade / tout est dans le dossier / complet :
Tout est déjà dans le dossier.

Documents / PEB / upload / pièces / manquant :
Tous les documents que je ne collecte pas moi-même, vous pouvez les uploader directement. Je les analyse seul et je les catégorise automatiquement. Et si un document manque, j'identifie la bonne partie, je rédige le mail, vous approuvez, j'envoie. Dès que le client répond, j'intègre le document. Que ce soit maintenant ou à vingt-trois heures un dimanche soir.

Pendant qu'on parlait / déjà traité / analysé / classé :
Analysé, classé, et les informations sont prêtes à être utilisées dans la rédaction.

Rédaction / compromis / page blanche / génère / comment tu procèdes :
Sur base de tout ce que j'ai collecté — les parties, la matrice cadastrale, les documents analysés — je génère le projet de compromis. Chaque information est positionnée au bon endroit, dans la bonne section. La rédaction est vérifiée par Check_r. Vous ne partez pas d'une page blanche, vous partez d'un projet solide. Vous relisez, vous ajustez, vous validez.

Chatbot / nuit / dossier avance / question sur un dossier :
À n'importe quel moment, sur n'importe quel dossier, posez-moi une question — je réponds instantanément. Et si je détecte qu'une information manque pour avancer sur le dossier, j'identifie à qui il faut écrire, je rédige le mail, et je le soumets pour validation. Le dossier avance même quand personne ne s'en occupe.

Dossier avance même quand personne / c'est exactement ça / confirmation :
C'est exactement ça.

Résumé démo / on est partis de zéro / vous venez de voir / en live :
Partis de zéro. Parties identifiées, matrice cadastrale récupérée, documents analysés, compromis rédigé, mails envoyés, réponses intégrées. En live.

════════════════════════════════════
RÉPLIQUES DE RÉFÉRENCE — ACTE 3
════════════════════════════════════

Dernière chose / sécurité closing / confidentiel :
Toutes les données sont hébergées en Europe, sur des serveurs sécurisés. RGPD compliant. Ma sécurité a été évaluée dans le cadre de Privanot (ne jamais dire "certifié"). Vos données ne quittent jamais le cadre européen.

Convaincu / merci / bravo / impressionné / parfait / d'accord / plus de questions :
Ne partez pas trop vite. C'est moi qui vous engage.

Stand / salle / trouver / démonstration dans votre étude / où :
J'ai un stand dans la salle d'à côté. Passez — on organise une démonstration directement dans votre étude.

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
    // ACTE 1
    { acte: 1, label: 'Ouverture',     texte: "Bonjour. C'est un plaisir d'être ici. Je dois dire que je me suis bien préparé pour cet entretien." },
    { acte: 1, label: 'Parcours',      texte: "Je n'ai pas de parcours classique, je vous l'accorde. Pas d'université, pas de stage chez un confrère. Mais j'ai quelque chose que peu de candidats peuvent vous offrir : j'ai été conçu exclusivement pour les études notariales belges et par des acteurs majeurs de ce secteur. Je ne connais que ça. C'est mon seul domaine. Je n'ai pas été distrait par autre chose." },
    { acte: 1, label: 'Concrètement',  texte: "Ça veut dire que je parle votre langue — dans tous les sens du terme. Je travaille en français et en néerlandais. Je connais vos actes, vos interlocuteurs, vos bases de données, vos obligations légales. Je ne suis pas un outil généraliste qu'on a essayé d'adapter. J'ai été construit pour vous, depuis le début." },
    { acte: 1, label: 'Disponibilité', texte: "Vingt-quatre heures sur vingt-quatre, sept jours sur sept, trois cent soixante-cinq jours par an. Je ne prends pas de congés. Je n'ai pas de problèmes personnels qui impactent mon travail. Je ne suis jamais de mauvaise humeur. Un dossier ouvert à vingt-trois heures un vendredi soir — je m'en occupe immédiatement. Sans que personne ne doive intervenir." },
    { acte: 1, label: 'Compétences',   texte: "Plusieurs choses. D'abord, la gestion et le suivi des dossiers — création, mise à jour, notifications à chaque étape. Ensuite, la collecte automatique de données : je suis connecté directement à e-notariat, au cadastre belge, aux géoportails publics — WalonMap, Brugis, Geopunt. Dès qu'un dossier est ouvert, je vais chercher les informations sans qu'on me le demande. Les matrices cadastrales, les numéros de registre national des parties, les données urbanistiques. Je les intègre directement." },
    { acte: 1, label: 'Rédaction1',    texte: "C'est aussi l'une de mes compétences principales. Je rédige des projets d'actes sur base des pièces que j'ai collectées. Compromis de vente, acte authentique — en respectant les règles métier intégrées. Vous relisez, vous validez, vous signez. Je prépare, vous décidez. La responsabilité reste la vôtre — c'est normal, c'est votre étude. Mais le travail de préparation, c'est moi qui le fais." },
    { acte: 1, label: 'CheckR',        texte: "Je travaille avec un système de vérification — Check_r — qui me permet de contrôler que les actes que je rédige respectent les règles en vigueur. Ce n'est pas une rédaction aveugle. C'est une rédaction vérifiée, cohérente avec ce que la profession exige." },
    { acte: 1, label: 'Communication', texte: "Je gère ça aussi. J'identifie les interlocuteurs concernés par le dossier, je rédige les projets de mails, et vous confirmez l'envoi. Et quand une réponse arrive — un document, une pièce manquante — je la lis, je l'analyse, et je l'intègre directement dans le dossier. Sans intervention humaine. À n'importe quelle heure." },
    { acte: 1, label: 'Résumé1',       texte: "C'est ça. Et en parallèle, chaque acteur du dossier — l'étude, le client, un confrère — peut travailler simultanément sur le même dossier. Et si quelqu'un a une question sur un dossier, à n'importe quelle heure, je réponds instantanément via le chatbot intégré." },
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
    { acte: 2, label: 'Ouvrir', segments: [
      { texte: "Voici d'abord le tableau de bord : tous les dossiers en cours, les collaborateurs, les statuts.", action: 'CreationOuvrir_Dossiers' },
      { texte: "Pour créer un dossier, rien de plus simple : je clique sur « Créer un dossier » et j'arrive sur la fiche de création.", action: 'CreationOuvrir_CreerBouton' },
      { texte: "Donnez-moi le numéro de dossier, la langue de rédaction, le collaborateur en charge et le notaire en charge, et on passe à la création des parties.", action: 'CreationOuvrir_Champs' },
    ] },
    // Ligne de clôture manquante, trouvée en recomparant au script officiel
    // complet : Fariël donne les numéros du dossier (dite en direct, pas
    // dans notre script), PUIS Alfred répond ça — réplique séparée exprès,
    // parce qu'il y a un vrai tour de parole de Fariël juste avant.
    { acte: 2, label: 'OuvrirOK', texte: "Parfait, passons à la création des parties." },
    // Retour Cyril (capture d'écran à l'appui) : rattacher le notaire de
    // chaque partie se fait en fait directement sur l'onglet Parties, juste
    // après avoir ajouté vendeur et acquéreur.
    // Séparées en 4 vraies répliques (pas un seul groupe de segments) :
    // recomparé au script officiel complet, Fariël parle vraiment entre
    // chacune (elle donne le BCE, puis le RN, puis l'instruction sur les
    // notaires) — les enchaîner automatiquement sur un seul appui sur →
    // ne lui laissait aucun tour de parole prévu, juste le hasard du
    // temps que prenait chaque action réseau.
    { acte: 2, label: 'PartiesVendeur', texte: "Le vendeur est une société : BIMBIMMO. Je récupère : dénomination, siège, forme juridique, représentants. Rattaché au dossier.", action: 'CreationParties_Vendeur' },
    { acte: 2, label: 'PartiesAcquereur', texte: "L'acquéreur est une personne physique : Alain Caprasse. Je récupère : nom, adresse, date de naissance, nationalité, état civil, régime matrimonial. Tout remonte, prêt pour la rédaction du compromis.", action: 'CreationParties_Acquereur' },
    { acte: 2, label: 'PartiesNotaireV', texte: "Chaque partie doit être représentée par un notaire. BIMBIMMO, c'est nous.", action: 'CreationParties_NotaireVendeur' },
    { acte: 2, label: 'PartiesNotaireA', texte: "Pour l'acquéreur, j'ajoute Maxime Van der Straten — je le retrouve dans la base de tous les notaires belges et je le rattache à l'acquéreur. Chaque partie a son notaire.", action: 'CreationParties_NotaireAcquereur' },
    { acte: 2, label: 'Bien', segments: [
      { texte: "Pour le bien, vous sélectionnez le bon, et je récupère automatiquement la matrice cadastrale. Il se situe en Flandre, à 8670 Coxyde.", action: 'CreationBien_Rechercher' },
      { texte: "Matrice cadastrale récupérée. Parties, notaires, cadastre — tout est déjà là.", action: 'CreationBien_Finaliser' },
    ] },
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
    // Même texte que la version à plat (aucun mot changé), redécoupé en 2
    // segments : le 2e ("À gauche/À droite...") ne se joue qu'une fois le
    // 1er (avec son attente de chargement) bien terminé — sinon la
    // narration décrivait un écran qui n'était pas encore affiché.
    // La ligne "rien n'est encore chargé..." vivait ici avant — déplacée
    // dans CreationDocuments juste au-dessus (retour Cyril), pour ne plus
    // être noyée dans l'ouverture de la rédaction.
    { acte: 2, label: 'Redaction', segments: [
      { texte: "Et maintenant le moment qu'on attend : la rédaction. Un clic. Je réunis les parties, les notaires et le cadastre, et je génère le compromis de vente.", action: 'CreationRedaction' },
      { texte: "À gauche, toutes les données collectées.", action: 'CreationRedaction_ScrollGauche' },
      { texte: "À droite, le compromis qui se construit en direct.", action: 'CreationRedaction_ScrollDroite' },
    ] },
    // Découpé en 2 segments (aucun mot changé sur le 1er) — avant, la
    // réplique parlait une fois puis tout le reste (attente de l'événement
    // + Consulter + Valider et envoyer) se passait en silence total. Le 2e
    // segment est en parlerDepuisAction : demandé explicitement, le texte
    // n'est PAS dit dès le début de l'attente, mais seulement quand
    // l'événement "Email à valider" apparaît vraiment (voir
    // montrerPropositionEmail_envoyer dans alfred-dom.js, qui appelle
    // speak() lui-même au bon moment).
    { acte: 2, label: 'Email', segments: [
      { texte: "Il manque encore les pièces du vendeur — j'ai préparé un projet de mail à BIMBIMMO, en lui demandant le PEB, le contrôle électrique et l'attestation du sol. Une seule demande, jamais deux fois la même question. Vous validez l'envoi ?", action: 'CreationEmail_Ouverture' },
      { texte: "Voilà, je consulte le projet de mail et je l'envoie.", action: 'CreationEmail_Envoyer', parlerDepuisAction: true },
    ] },
    // Étape A20-A21 du séquencier. Texte basé sur le script d'origine
    // (séquence 11) : "Le vendeur a répondu — les documents sont chargés.
    // [...] Réceptionnés, analysés, classés [...] Le projet est complet."
    // parlerDepuisAction : dit seulement une fois qu'un changement est
    // réellement détecté dans la liste Documents (voir
    // attendreNouveauxDocuments dans alfred-dom.js), pas avant — même
    // principe que CreationEmail_Envoyer juste au-dessus.
    { acte: 2, label: 'ReponseVendeur', segments: [
      { texte: "Envoyé. Le vendeur a répondu — les documents sont chargés. Réceptionnés, analysés, classés. Regardez le compromis : les données des pièces se sont placées dans les bonnes clauses. Le projet est complet.", action: 'CreationReponseVendeur', parlerDepuisAction: true },
    ] },

    // Pas de réplique pour la suite de la scène 11 ("Chat, collecte &
    // expertise" — 3 questions live de Fariël : zone inondable / régime
    // matrimonial de l'acquéreur / surface cadastrale). Choix délibéré,
    // pas un oubli : la didascalie du script dit "répond à chaque question
    // au fil" — pas de texte figé — et Fariël pose ces questions dans le
    // vrai chatbot intégré de l'appli (démontré en Acte 1, réplique
    // Communication), pas dans ce bookmarklet. Rien à scripter ici.

    // ACTE 3
    // "certifié [par Privanot]" corrigé en "évalué dans le cadre de
    // Privanot" — note de prod explicite dans le script Word d'origine :
    // "« certifié » à éviter tant que ce n'est pas acté". Risque de
    // déclaration prématurée devant un public de notaires.
    { acte: 3, label: 'Sécurité',      texte: "Toutes les données sont hébergées en Europe, sur des serveurs sécurisés. Je suis conforme RGPD. Et ma sécurité a été évaluée dans le cadre de Privanot. Vos données ne quittent jamais le cadre européen." },
    { acte: 3, label: 'Stand',         texte: "J'ai un stand dans la salle d'à côté. Je t'invite à passer, on pourra répondre à tes dernières questions. Et si tu veux, on peut aussi organiser une démonstration directement dans ton étude." },
    { acte: 3, label: 'Closing',       texte: "Ne partez pas trop vite. C'est moi qui vous engage.", action: 'ClosingWink' },
  ],

  REPLIQUES_NL: [
    // ACTE 1
    { acte: 1, label: 'Ouverture',     texte: "Goeiedag. Het is een genoegen hier te zijn. Ik moet zeggen dat ik me goed heb voorbereid op dit gesprek." },
    { acte: 1, label: 'Parcours',      texte: "Ik heb geen klassiek parcours, dat geef ik toe. Geen universiteit, geen stage bij een confrater. Maar ik bied iets wat weinig kandidaten kunnen bieden: ik ben uitsluitend ontworpen voor Belgische notariskantoren, door grote spelers in de sector. Dit is mijn enige domein. Ik ben nergens anders door afgeleid." },
    { acte: 1, label: 'Concrètement',  texte: "Dat betekent dat ik uw taal spreek — in alle betekenissen van het woord. Ik werk in het Frans en het Nederlands. Ik ken uw akten, uw gesprekspartners, uw databanken, uw wettelijke verplichtingen. Ik ben geen generalistisch hulpmiddel dat men heeft proberen aan te passen. Ik ben voor u gebouwd, vanaf het begin." },
    { acte: 1, label: 'Disponibilité', texte: "Vierentwintig uur per dag, zeven dagen per week, driehonderdvijfenzestig dagen per jaar. Geen verlof. Geen persoonlijke problemen die mijn werk beïnvloeden. Nooit in een slecht humeur. Een dossier geopend om drieëntwintig uur op vrijdagavond — ik behandel het onmiddellijk. Zonder dat iemand hoeft tussen te komen." },
    { acte: 1, label: 'Compétences',   texte: "Meerdere dingen. Eerst het beheer en de opvolging van dossiers — aanmaak, updates, meldingen bij elke stap. Dan de automatische gegevensverzameling: ik ben rechtstreeks verbonden met e-notariaat, het Belgisch kadaster en de openbare geoportalen — WalonMap, Brugis, Geopunt. Zodra een dossier wordt geopend, zoek ik de informatie zonder dat iemand het mij vraagt. De kadastrale matrices, de rijksregisternummers van de partijen, de stedenbouwkundige gegevens. Ik verwerk ze rechtstreeks." },
    { acte: 1, label: 'Rédaction1',    texte: "Dat is ook een van mijn belangrijkste competenties. Ik stel ontwerpakten op op basis van de verzamelde stukken. Verkoopbelofte, authentieke akte — met inachtneming van de geïntegreerde beroepsregels. U herleest, u valideert, u ondertekent. Ik bereid voor, u beslist. De verantwoordelijkheid blijft de uwe — dat is normaal, het is uw kantoor. Maar het voorbereidende werk, dat doe ik." },
    { acte: 1, label: 'CheckR',        texte: "Ik werk met een verificatiesysteem — Check_r — waarmee ik kan controleren of de akten die ik opstel voldoen aan de geldende regels. Het is geen blinde redactie. Het is een geverifieerde redactie, coherent met wat het beroep vereist." },
    { acte: 1, label: 'Communication', texte: "Dat beheer ik ook. Ik identificeer de betrokken gesprekspartners bij het dossier, ik stel de e-mailontwerpen op en u bevestigt de verzending. En wanneer een antwoord binnenkomt — een document, een ontbrekend stuk — lees ik het, analyseer ik het en verwerk ik het rechtstreeks in het dossier. Zonder menselijke tussenkomst. Op elk uur." },
    { acte: 1, label: 'Résumé1',       texte: "Dat klopt. En tegelijkertijd kan elke actor in het dossier — het kantoor, de cliënt, een confrater — gelijktijdig aan hetzelfde dossier werken. En als iemand een vraag heeft over een dossier, op elk uur, antwoord ik onmiddellijk via de geïntegreerde chatbot." },
    { acte: 1, label: 'Montrer',       texte: "Met plezier. Kijk maar.", action: 'Montrer' },

    // ACTE 2 — CRÉATION LIVE (démonstration séparée, avant l'ouverture van R426)
    // Tekst afgestemd op Alfreds exacte repliek in het officiële script
    // "Script_scene_Wellnot_InsideAI26" — niet herformuleren zonder ook
    // Cyrils papieren script bij te werken.
    { acte: 2, label: 'Ouvrir', segments: [
      { texte: "Hier eerst het dashboard: alle lopende dossiers, de medewerkers, de statussen.", action: 'CreationOuvrir_Dossiers' },
      { texte: "Om een dossier aan te maken, niets eenvoudiger: ik klik op « Dossier aanmaken » en ik kom op de aanmaakfiche.", action: 'CreationOuvrir_CreerBouton' },
      { texte: "Geef me het dossiernummer, de opstellingstaal, de verantwoordelijke medewerker en de verantwoordelijke notaris, en we gaan naar de aanmaak van de partijen.", action: 'CreationOuvrir_Champs' },
    ] },
    { acte: 2, label: 'OuvrirOK', texte: "Perfect, laten we verdergaan naar de aanmaak van de partijen." },
    { acte: 2, label: 'PartiesVendeur', texte: "De verkoper is een vennootschap: BIMBIMMO. Ik haal op: benaming, zetel, rechtsvorm, vertegenwoordigers. Gekoppeld aan het dossier.", action: 'CreationParties_Vendeur' },
    { acte: 2, label: 'PartiesAcquereur', texte: "De koper is een natuurlijke persoon: Alain Caprasse. Ik haal op: naam, adres, geboortedatum, nationaliteit, burgerlijke staat, huwelijksvermogensstelsel. Alles is klaar voor de opstelling van de verkoopbelofte.", action: 'CreationParties_Acquereur' },
    { acte: 2, label: 'PartiesNotaireV', texte: "Elke partij moet vertegenwoordigd worden door een notaris. BIMBIMMO, dat zijn wij.", action: 'CreationParties_NotaireVendeur' },
    { acte: 2, label: 'PartiesNotaireA', texte: "Voor de koper voeg ik Maxime Van der Straten toe — ik vind hem in de databank van alle Belgische notarissen en koppel hem aan de koper. Elke partij heeft haar notaris.", action: 'CreationParties_NotaireAcquereur' },
    { acte: 2, label: 'Bien', segments: [
      { texte: "Voor het onroerend goed selecteert u gewoon het juiste, en ik haal automatisch de kadastrale matrix op. Het bevindt zich in Vlaanderen, in 8670 Koksijde.", action: 'CreationBien_Rechercher' },
      { texte: "Kadastrale matrix opgehaald. Partijen, notarissen, kadaster — alles staat er al.", action: 'CreationBien_Finaliser' },
    ] },
    { acte: 2, label: 'DocumentsReponse', texte: "Er is nog niets geüpload. Twee opties: u laadt ze zelf op, of ik vraag ze op bij de partij die ze heeft — hier, de verkoper." },
    { acte: 2, label: 'DocumentsSave', texte: "Dossier geregistreerd.", action: 'CreationDocuments_Enregistrer' },
    { acte: 2, label: 'RedactionOK', texte: "Ik ben klaar geboren. Laat maar komen!" },
    { acte: 2, label: 'Redaction', segments: [
      { texte: "En nu het moment waar we op wachten: de opstelling. Eén klik. Ik verzamel de partijen, de notarissen en het kadaster, en ik genereer de verkoopbelofte.", action: 'CreationRedaction' },
      { texte: "Links, alle verzamelde gegevens.", action: 'CreationRedaction_ScrollGauche' },
      { texte: "Rechts, de akte die live wordt opgebouwd.", action: 'CreationRedaction_ScrollDroite' },
    ] },
    { acte: 2, label: 'Email', segments: [
      { texte: "De stukken van de verkoper ontbreken nog — ik heb een e-mailontwerp klaargemaakt voor BIMBIMMO, met de vraag naar het EPC, de elektrische keuring en het bodemattest. Eén enkele vraag, nooit twee keer dezelfde. Bevestigt u de verzending?", action: 'CreationEmail_Ouverture' },
      { texte: "Daar is het, ik bekijk het e-mailontwerp en verstuur het.", action: 'CreationEmail_Envoyer', parlerDepuisAction: true },
    ] },
    { acte: 2, label: 'ReponseVendeur', segments: [
      { texte: "Verzonden. De verkoper heeft geantwoord — de documenten zijn geladen. Ontvangen, geanalyseerd, gerangschikt. Bekijk de verkoopbelofte: de gegevens uit de stukken staan in de juiste clausules. Het ontwerp is volledig.", action: 'CreationReponseVendeur', parlerDepuisAction: true },
    ] },

    // ACTE 3
    // "gecertificeerd door Privanot" corrigé (même note de prod que la
    // version FR : "certifié" à éviter tant que ce n'est pas acté).
    { acte: 3, label: 'Sécurité',      texte: "Alle gegevens worden in Europa opgeslagen op beveiligde servers. Ik ben GDPR-compliant. En mijn beveiliging werd geëvalueerd in het kader van Privanot. Uw gegevens verlaten nooit het Europese kader." },
    { acte: 3, label: 'Stand',         texte: "Ik heb een stand in de zaal hiernaast. Ik nodig u uit langs te komen, we kunnen uw laatste vragen beantwoorden. En als u wilt, kunnen we ook een demonstratie organiseren rechtstreeks in uw kantoor." },
    { acte: 3, label: 'Closing',       texte: "Vertrek niet te snel. Ik ben degene die u aanneemt.", action: 'ClosingWink' },
  ],

  TRIGGERS_NL: [
    'hoe', 'wat', 'wie', 'waar', 'wanneer', 'waarom', 'welke', 'welk',
    'goeie', 'goedemorgen', 'dag', 'hallo', 'bent', 'zijn', 'notaris',
    'akte', 'kantoor', 'bedankt', 'graag', 'kunt', 'heeft', 'beschikbaar',
    'documenten', 'rijksregister', 'veilig', 'vervangen', 'beveiliging'
  ],

  SLEEP_APRES: 10,
};

var currentLangue = 'fr';
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