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
    { acte: 2, label: 'Ouvrir', segments: [
      { texte: "Voici d'abord le tableau de bord : tous les dossiers en cours, les collaborateurs, les statuts.", action: 'CreationOuvrir_Dossiers' },
      { texte: "Pour créer un dossier, rien de plus simple : je clique sur « Créer un dossier » et j'arrive sur la fiche de création.", action: 'CreationOuvrir_CreerBouton' },
      { texte: "Donnez-moi le numéro de dossier, la langue de rédaction, le collaborateur en charge et le notaire en charge, et on passe à la création des parties.", action: 'CreationOuvrir_Champs' },
    ] },
    // OuvrirOK (ex-"Parfait, passons à la création des parties.") SUPPRIMÉE
    // le 31/08 : en recomparant vraiment à v3_9 (pas juste "de mémoire"),
    // cette ligne n'existe pas dans l'officiel — Fariël donne les numéros
    // et on enchaîne directement scène 7. DOUTE signalé à l'utilisatrice :
    // si elle manque à l'usage comme respiration avant "Les parties", elle
    // peut être remise (comme CreationEmail_Envoyer, une ligne ajoutée
    // sciemment pour caler la démo) — mais ce ne serait alors plus une
    // ligne "officielle", à traiter comme telle.
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
    // Ajoutée le 31/08 (échange manquant en tout début de scène 8, trouvé
    // en recomparant à v3_9) : FARIËL "Donc toutes ces informations, tu les
    // récupères automatiquement ?" / ALFRED "Tout ce qui est disponible en
    // base, oui." — avant, "Bien" enchaînait directement sur "Pour le
    // bien..." sans cette réponse.
    { acte: 2, label: 'RecupAuto', texte: "Tout ce qui est disponible en base, oui." },
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
    // Segments 2 et 3 complétés le 31/08 : nettement tronqués par rapport
    // au monologue officiel de la scène 10 (recomparaison à v3_9) — il
    // manquait toute la fin (mention de Check_r, "il manque encore les
    // pièces du vendeur", "fini la page blanche... vous gardez le
    // contrôle"). Texte complété mot pour mot, juste redécoupé.
    // "Et maintenant le moment qu'on attend : la rédaction." retiré le
    // 31/08 : c'était la ligne de FARIËL ("Et maintenant le moment qu'on
    // attend : la rédaction. Toujours pas peur des experts ?"), pas
    // celle d'Alfred.
    { acte: 2, label: 'Redaction', segments: [
      { texte: "Un clic. Je réunis les parties, les notaires et le cadastre, et je génère le compromis de vente.", action: 'CreationRedaction' },
      { texte: "À gauche, toutes les données collectées via les bases ou extraites des documents — tout est classé dans ma base de données.", action: 'CreationRedaction_ScrollGauche' },
      // ScrollDroite s'arrête sur le titre PEB (voir trouverTitrePEB dans
      // alfred-dom.js) et n'en repart plus tout seul — l'export Word,
      // ajouté juste après à la demande de l'utilisatrice, est resté trop
      // rapproché dans un 1er temps (montré tout de suite après le
      // scroll). Retour explicite : laisser le temps de bien voir "PEB" à
      // l'écran, et déplacer l'export à la toute fin de l'acte 2 (réplique
      // ExportWord, après ReponseVendeur) plutôt que de l'enchaîner ici.
      { texte: "À droite, le compromis qui se construit en direct — et bientôt, ces données seront vérifiées par Check_r, qui attire l'attention du collaborateur sur les erreurs ou incohérences. Il manque encore les pièces du vendeur, je les intègre dès réception. Fini la page blanche : vous relisez, vous ajustez, vous validez. Je fais le gros du travail, vous gardez le contrôle.", action: 'CreationRedaction_ScrollDroite' },
    ] },
    // Découpé en 2 segments — avant, la réplique parlait une fois puis
    // tout le reste (attente de l'événement + Consulter + Valider et
    // envoyer) se passait en silence total. Le 2e segment est en
    // parlerDepuisAction : demandé explicitement, le texte n'est PAS dit
    // dès le début de l'attente, mais seulement quand l'événement "Email à
    // valider" apparaît vraiment (voir montrerPropositionEmail_envoyer
    // dans alfred-dom.js, qui appelle speak() lui-même au bon moment).
    // "Il manque encore les pièces du vendeur —" : contrairement aux
    // autres cas corrigés le 31/08, ce ne sont pas les mots de FARIËL —
    // c'est repris tel quel de la propre ligne d'Alfred en scène 10 ("Il
    // manque encore les pièces du vendeur — je les intègre dès
    // réception."), réutilisé ici comme transition. Gardé tel quel, mais
    // "le vendeur," et "de m'envoyer" rajoutés dans la suite : absents par
    // rapport à l'officiel, trouvés en revérifiant mot à mot.
    { acte: 2, label: 'Email', segments: [
      { texte: "Il manque encore les pièces du vendeur — j'ai préparé un projet de mail à BIMBIMMO, le vendeur, en lui demandant de m'envoyer le PEB, le contrôle électrique et l'attestation du sol. Une seule demande, jamais deux fois la même question. Vous validez l'envoi ?", action: 'CreationEmail_Ouverture' },
      { texte: "Voilà, je consulte le projet de mail et je l'envoie.", action: 'CreationEmail_Envoyer', parlerDepuisAction: true },
    ] },
    // Étape A20-A21 du séquencier. Texte basé sur le script d'origine
    // (séquence 11) : "Le vendeur a répondu — les documents sont chargés.
    // [...] Réceptionnés, analysés, classés [...] Le projet est complet."
    // parlerDepuisAction : dit seulement une fois qu'un changement est
    // réellement détecté dans la liste Documents (voir
    // attendreNouveauxDocuments dans alfred-dom.js), pas avant — même
    // principe que CreationEmail_Envoyer juste au-dessus.
    // Dernière phrase officielle ("Je prépare, vous décidez.") rajoutée le
    // 31/08 — manquante par rapport à v3_9.
    { acte: 2, label: 'ReponseVendeur', segments: [
      { texte: "Envoyé. Le vendeur a répondu — les documents sont chargés. Réceptionnés, analysés, classés. Regardez le compromis : les données des pièces se sont placées dans les bonnes clauses. Le projet est complet. Je prépare, vous décidez.", action: 'CreationReponseVendeur', parlerDepuisAction: true },
    ] },
    // Étape supplémentaire hors script papier (demandée en test live) :
    // montrer l'export Word du compromis. Placée en toute fin d'acte 2,
    // pas juste après le scroll sur PEB (essayé d'abord, mais montré trop
    // vite) — l'écran reste sur le compromis, scrollé sur PEB, pendant
    // Email/ReponseVendeur juste avant, donc rien ne bouge entre-temps.
    // Retour explicite : la clause PEB n'est vraiment remplie qu'une fois
    // les pièces du vendeur intégrées (Email/ReponseVendeur juste avant) —
    // c'est ICI, à la toute fin de l'acte 2, qu'on montre qu'elle a bien
    // été rajoutée, pas pendant la 1re rédaction (voir ScrollDroite plus
    // haut, revenu au défilement générique).
    { acte: 2, label: 'ExportWord', segments: [
      { texte: "Le certificat PEB a bien été intégré au compromis.", action: 'CreationRedaction_ScrollPEB' },
      { texte: "Le compromis peut aussi s'exporter directement en Word.", action: 'CreationRedaction_ExporterWord' },
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
    { acte: 1, label: 'DeuxLangues',    texte: "Vloeiend Frans en Nederlands. Ik ken uw akten, uw databanken, al uw verplichtingen. Ik ben geen algemene tool die achteraf is aangepast voor het notariaat. Ik ben vanaf dag één puur voor u ontworpen." },
    { acte: 1, label: 'Disponibilité',  texte: "24 uur per dag, het hele jaar door. Geen vakantie. Een dossier dat op vrijdag om 23u binnenkomt? U klikt en ik ga meteen aan de slag." },
    { acte: 1, label: 'Competences',    texte: "Ik neem het werk over dat uw medewerkers tijd kost: de opvolging, de administratie, en vooral het verzamelen van gegevens. Dat is mijn specialiteit. Ik ben verbonden met zowel publieke als private databanken. Ik kan de rijksregisternummers ophalen in e-notariaat, maar ook kaarten op het geoportaal, of nog overstromingsrapporten. Idealiter haal ik alle informatie op die te verzamelen valt. Nog niet alles staat op punt — maar ik blijf bijleren." },
    { acte: 1, label: 'JeLeMontre',     texte: "Dat kan ik beter laten zien dan uitleggen. Geef me een dossier en we testen het samen." },
    // 'Montrer' inchangée — même note que côté FR (voir plus haut).
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
    // OuvrirOK supprimée — voir la note FR équivalente (ligne inexistante
    // dans l'officiel v3_8, DOUTE signalé).
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
    // Ajoutée — échange officiel manquant en début de scène 8 (v3_8) :
    // FARIËL "Dus al die informatie haal je automatisch op?" / ALFRED
    // "Alles wat er in de databank klaarstaat, ja."
    { acte: 2, label: 'RecupAuto', texte: "Alles wat er in de databank klaarstaat, ja." },
    { acte: 2, label: 'Bien', segments: [
      { texte: "Voor het onroerend goed selecteert u gewoon het juiste, en ik haal automatisch de kadastrale matrix op. Het bevindt zich in Vlaanderen, in 8670 Koksijde.", action: 'CreationBien_Rechercher' },
      { texte: "Kadastrale matrix opgehaald. Partijen, notarissen, kadaster — alles staat er al.", action: 'CreationBien_Finaliser' },
    ] },
    { acte: 2, label: 'DocumentsReponse', texte: "Er is nog niets geüpload. Twee opties: u laadt ze zelf op, of ik vraag ze op bij de partij die ze heeft — hier, de verkoper." },
    { acte: 2, label: 'DocumentsSave', texte: "Dossier geregistreerd.", action: 'CreationDocuments_Enregistrer' },
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
    { acte: 2, label: 'Redaction', segments: [
      { texte: "Eén muisklik. Partijen, notarissen en kadastrale gegevens. Ik breng alles samen en genereer de compromis.", action: 'CreationRedaction' },
      { texte: "Links op het scherm: de opgevraagde data uit de databanken.", action: 'CreationRedaction_ScrollGauche' },
      { texte: "Rechts: de akte die zich live opbouwt. Straks haalt Check_r daar ook nog eens alle eventuele fouten uit. De ontbrekende stukken van de verkoper voeg ik automatisch toe zodra ze binnenkomen. Geen blanco pagina meer waar u van nul moet starten. U leest na, u stelt bij en u valideert. Ik neem het handwerk over, u behoudt de leiding.", action: 'CreationRedaction_ScrollDroite' },
    ] },
    { acte: 2, label: 'Email', segments: [
      { texte: "De stukken van de verkoper ontbreken nog — ik heb een e-mailontwerp klaargemaakt voor BIMBIMMO, met de vraag naar het EPC, de elektrische keuring en het bodemattest. Eén enkele vraag, nooit twee keer dezelfde. Bevestigt u de verzending?", action: 'CreationEmail_Ouverture' },
      { texte: "Daar is het, ik bekijk het e-mailontwerp en verstuur het.", action: 'CreationEmail_Envoyer', parlerDepuisAction: true },
    ] },
    // Laatste officiële zin ("Ik bereid alles voor en u beslist.")
    // toegevoegd op 31/08 — ontbrak t.o.v. v3_8.
    { acte: 2, label: 'ReponseVendeur', segments: [
      { texte: "Verzonden. De verkoper heeft geantwoord — de documenten zijn geladen. Ontvangen, geanalyseerd, gerangschikt. Bekijk de verkoopbelofte: de gegevens uit de stukken staan in de juiste clausules. Het ontwerp is volledig. Ik bereid alles voor en u beslist.", action: 'CreationReponseVendeur', parlerDepuisAction: true },
    ] },
    { acte: 2, label: 'ExportWord', segments: [
      { texte: "Het PEB-certificaat is goed geïntegreerd in de verkoopbelofte.", action: 'CreationRedaction_ScrollPEB' },
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