# alfred-wellnot

Bookmarklet Alfred (démo Congrès des Notaires). Les fichiers `.js` de la racine
sont servis en statique par GitHub Pages ; le dossier `api/` regroupe les
fonctions serverless déployées sur Vercel.

## api/vendeur-reply.js — réponse automatique du vendeur

Répond au mail « Documents et informations nécessaires » envoyé par Alfred, dans
le même fil, avec les pièces du vendeur en pièces jointes. Les pièces sont tirées
à l'exécution du repo **privé** `alfred-demo-assets` : ce repo-ci étant public,
elles ne doivent jamais y être committées.

Appel : `POST /api/vendeur-reply`, en-tête `X-Alfred-Password` (même mot de passe
que `demo-data.js`). Ajouter `?dry=1` pour vérifier la configuration sans rien
envoyer : l'endpoint retrouve alors le mail et liste les pièces, puis s'arrête.

Variables d'environnement Vercel :

| Variable | Rôle |
| --- | --- |
| `GMAIL_USER` | Adresse Gmail du vendeur (celle reconnue par Alfred) |
| `GMAIL_APP_PASSWORD` | Mot de passe d'application Gmail (IMAP + SMTP) |
| `ASSETS_GITHUB_TOKEN` | Token GitHub en lecture sur `alfred-demo-assets` |
| `SCRIPT_PASSWORD` | Mot de passe protégeant l'endpoint (déjà utilisé ailleurs) |

Optionnelles : `ASSETS_REPO`, `ASSETS_PATH`, `ALFRED_SENDER`,
`ALFRED_SUBJECT_MATCH` pour surcharger le repo, le dossier, l'expéditeur
recherché et le fragment de sujet.
