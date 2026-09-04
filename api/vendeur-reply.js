import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

// Télécharger 9,6 Mo de pièces puis les pousser en SMTP dépasse largement les
// quelques secondes des autres endpoints : on demande explicitement la durée max.
export const config = { maxDuration: 60 };

const REPO_PIECES  = process.env.ASSETS_REPO   || 'GlodiSala/alfred-demo-assets';
const CHEMIN_PIECES = process.env.ASSETS_PATH  || 'pieces-vendeur';
// 'alfred@alfred.be' → 'test@alfred.be' (04/09) — confirmé par capture de
// boîte réelle en test live : le vrai mail envoyé par l'appli pour CETTE
// démo ("Verkoop door BIMBIMMO aan Caprasse (C-...)") part bien de
// test@alfred.be, pas de alfred@alfred.be. Avec l'ancienne valeur, la
// recherche par expéditeur ne trouvait AUCUNE demande réelle — seulement
// un très vieux mail d'invitation ("Vous êtes invité(e) à rejoindre
// Alfred", 17/08) resté seul dans la boîte sous ce vieil expéditeur — et y
// répondait à chaque fois, sans jamais toucher le vrai fil de la démo. Le
// symptôme ("je ne vois pas de réponse auto") était donc un envoi réussi,
// mais sur le mauvais mail. ALFRED_SENDER reste disponible pour resserrer/
// changer sans toucher au code si l'adresse change encore.
const ADRESSE_ALFRED = process.env.ALFRED_SENDER || 'test@alfred.be';
// Vide par défaut (04/09) — l'ancienne valeur ('Documents et informations')
// ne correspondait à aucun vrai sujet observé : le vrai mail envoyé par
// l'appli suit le format "Verkoop door BIMBIMMO aan Caprasse
// (C-20260904-202749)" — vendeur/acquéreur/CODE DE DOSSIER, ce dernier
// généré à chaque lancement (voir seq_creationDossier_ouvrir_champs,
// alfred-dom.js) donc JAMAIS le même deux fois. Filtrer sur un sujet fixe
// ne pouvait plus jamais matcher après le tout premier test — d'où
// l'impression que "l'auto-réponse n'existe plus". On cherche donc par
// EXPÉDITEUR + le plus récent uniquement (voir trouverMailAlfred), fiable
// quel que soit le libellé exact du sujet ; ALFRED_SUBJECT_MATCH reste
// disponible pour resserrer la recherche si jamais plusieurs boîtes
// partagent la même adresse expéditrice.
const SUJET_RECHERCHE = process.env.ALFRED_SUBJECT_MATCH || '';

// Vide (04/09) — demandé explicitement : répondre SANS texte, seulement
// les pièces jointes.
const CORPS = '';

const TYPES_MIME = {
  pdf:  'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc:  'application/msword',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
};

function typeMime(nom) {
  const ext = nom.split('.').pop().toLowerCase();
  return TYPES_MIME[ext] || 'application/octet-stream';
}

// Retrouve le mail envoyé par Alfred et renvoie son Message-ID, indispensable
// pour que la réponse se greffe sur le fil plutôt que d'ouvrir une conversation
// séparée (le backend d'Alfred rattache la réponse au dossier par ce fil).
// codeDossier (optionnel, ex. "C-20260904-233504") : le code unique généré
// par le bookmarklet à l'ouverture de CE lancement (voir
// dernierCodeDossierGenere, alfred-dom.js), transmis en query ?code=... —
// demandé explicitement le 04/09 : se fier seulement à "le plus récent
// dans la boîte" est risqué si un autre test tourne en parallèle sur la
// même boîte partagée (plausible en plein salon, plusieurs stands/
// testeurs). Si fourni ET qu'un mail avec ce code existe, on l'utilise en
// PRIORITÉ ; sinon (absent, ou aucun match — ex. le dry-run tester_
// vendeur_reply_dry.js qui ne le passe pas) on retombe sur l'ancien
// comportement (expéditeur + plus récent), jamais bloquant.
async function trouverMailAlfred(user, pass, codeDossier) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();
  const verrou = await client.getMailboxLock('INBOX');
  try {
    // Filtre sujet seulement si explicitement configuré (voir la note sur
    // SUJET_RECHERCHE plus haut : le sujet réel contient un code de
    // dossier différent à chaque test, un filtre fixe ne matcherait
    // jamais deux fois).
    const criteres = SUJET_RECHERCHE ? { from: ADRESSE_ALFRED, subject: SUJET_RECHERCHE } : { from: ADRESSE_ALFRED };
    let uids = await client.search(criteres, { uid: true });

    let cibleParCode = false;
    if (codeDossier) {
      const uidsCode = await client.search({ from: ADRESSE_ALFRED, subject: codeDossier }, { uid: true });
      if (uidsCode && uidsCode.length) { uids = uidsCode; cibleParCode = true; }
    }

    if (!uids || uids.length === 0) {
      throw new Error(
        SUJET_RECHERCHE
          ? `Aucun mail de ${ADRESSE_ALFRED} avec « ${SUJET_RECHERCHE} » dans le sujet`
          : `Aucun mail de ${ADRESSE_ALFRED} trouvé dans la boîte`
      );
    }
    // Le dernier UID est le plus récent : une démo rejouée renvoie un nouveau
    // mail, il faut répondre à celui-là et pas à une répétition précédente.
    // (Sans effet si cibleParCode : uids ne contient déjà que le mail de ce
    // code, mais un seul uids[uids.length-1] reste correct dans les deux cas.)
    const dernier = uids[uids.length - 1];
    const message = await client.fetchOne(String(dernier), { envelope: true }, { uid: true });
    return {
      messageId: message.envelope.messageId,
      sujet: message.envelope.subject,
      date: message.envelope.date,
      total: uids.length,
      cibleParCode,
    };
  } finally {
    verrou.release();
    await client.logout();
  }
}

// Les pièces vivent dans le repo privé alfred-demo-assets : ce repo-ci est
// public (GitHub Pages sert le bookmarklet), elles ne doivent jamais y entrer.
async function listerPieces(token) {
  const r = await fetch(
    `https://api.github.com/repos/${REPO_PIECES}/contents/${CHEMIN_PIECES}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'alfred-wellnot',
      },
    }
  );
  if (!r.ok) {
    throw new Error(`Listing GitHub impossible (${r.status} ${await r.text()})`);
  }
  const entrees = await r.json();
  return entrees
    .filter((e) => e.type === 'file')
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function telechargerPiece(entree, token) {
  // Accept "raw" et non le JSON base64 : l'API contents plafonne le base64 à
  // 1 Mo, or le PV électrique en fait plus de 6.
  const r = await fetch(
    `https://api.github.com/repos/${REPO_PIECES}/contents/${entree.path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.raw',
        'User-Agent': 'alfred-wellnot',
      },
    }
  );
  if (!r.ok) {
    throw new Error(`Téléchargement de ${entree.name} impossible (${r.status})`);
  }
  return {
    filename: entree.name,
    contentType: typeMime(entree.name),
    content: Buffer.from(await r.arrayBuffer()),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Alfred-Password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Cet endpoint envoie un vrai mail depuis la boîte personnelle : protégé par
  // le même mot de passe que demo-data.js, jamais ouvert au public.
  const motDePasseAttendu = process.env.SCRIPT_PASSWORD || process.env.ALFRED_SCRIPT_PASSWORD;
  if (!motDePasseAttendu || req.headers['x-alfred-password'] !== motDePasseAttendu) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const tokenGithub = process.env.ASSETS_GITHUB_TOKEN;

  // ?check=1 : ne fait QUE la recherche IMAP (rapide, pas de téléchargement
  // GitHub) — utilisé côté bookmarklet pour attendre qu'un mail réellement
  // nouveau apparaisse avant de déclencher l'envoi réel (voir
  // attendreNouveauMailPuisRepondre dans alfred-config.js). Ne nécessite donc
  // pas ASSETS_GITHUB_TOKEN.
  const verifierSeulement = req.query?.check === '1' || req.query?.check === 'true';

  const manquantes = [
    !user && 'GMAIL_USER',
    !pass && 'GMAIL_APP_PASSWORD',
    !verifierSeulement && !tokenGithub && 'ASSETS_GITHUB_TOKEN',
  ].filter(Boolean);
  if (manquantes.length) {
    return res.status(500).json({ error: `Variables d'environnement manquantes : ${manquantes.join(', ')}` });
  }

  // ?dry=1 : retrouve le mail et les pièces, mais n'envoie rien. Permet de
  // vérifier la configuration sans polluer le dossier côté Alfred.
  // Un GET reste toujours une simulation : un envoi réel ne doit pas pouvoir
  // partir sur une simple visite d'URL (préchargement, aperçu de lien...).
  const blanc = req.method !== 'POST' || req.query?.dry === '1' || req.query?.dry === 'true';

  // ?code=... : code de dossier de ce lancement (voir trouverMailAlfred).
  const codeDossier = typeof req.query?.code === 'string' ? req.query.code.trim() : '';

  try {
    const mail = await trouverMailAlfred(user, pass, codeDossier);

    if (verifierSeulement) {
      return res.status(200).json({ verification: true, mailTrouve: mail });
    }

    const entrees = await listerPieces(tokenGithub);
    if (entrees.length === 0) {
      throw new Error(`Aucune pièce trouvée dans ${REPO_PIECES}/${CHEMIN_PIECES}`);
    }
    const pieces = await Promise.all(entrees.map((e) => telechargerPiece(e, tokenGithub)));
    const octets = pieces.reduce((total, p) => total + p.content.length, 0);

    if (octets > 25 * 1024 * 1024) {
      throw new Error(`Pièces trop lourdes pour Gmail : ${Math.round(octets / 1024 / 1024)} Mo (max 25)`);
    }

    if (blanc) {
      return res.status(200).json({
        simulation: true,
        mailTrouve: mail,
        pieces: pieces.map((p) => ({ nom: p.filename, octets: p.content.length, type: p.contentType })),
        totalOctets: octets,
      });
    }

    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
    });

    const envoi = await transport.sendMail({
      from: user,
      to: ADRESSE_ALFRED,
      subject: mail.sujet.startsWith('Re:') ? mail.sujet : `Re: ${mail.sujet}`,
      text: CORPS,
      inReplyTo: mail.messageId,
      references: [mail.messageId],
      attachments: pieces,
    });

    return res.status(200).json({
      envoye: true,
      messageId: envoi.messageId,
      repondA: mail.messageId,
      pieces: pieces.map((p) => p.filename),
      totalOctets: octets,
    });
  } catch (error) {
    // imapflow ne met que "Command failed" dans error.message pour tout NO/BAD
    // IMAP — le vrai motif (identifiants refusés, mailbox absente...) vit dans
    // responseText. Sans ça, toute erreur IMAP est indiagnosticable à distance.
    const detail = error.responseText ? ` (${error.responseStatus}: ${error.responseText})` : '';
    return res.status(500).json({ error: error.message + detail });
  }
}
