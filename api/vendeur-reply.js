import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

// Télécharger 9,6 Mo de pièces puis les pousser en SMTP dépasse largement les
// quelques secondes des autres endpoints : on demande explicitement la durée max.
export const config = { maxDuration: 60 };

const REPO_PIECES  = process.env.ASSETS_REPO   || 'GlodiSala/alfred-demo-assets';
const CHEMIN_PIECES = process.env.ASSETS_PATH  || 'pieces-vendeur';
const ADRESSE_ALFRED = process.env.ALFRED_SENDER || 'alfred@alfred.be';
const SUJET_RECHERCHE = process.env.ALFRED_SUBJECT_MATCH || 'Documents et informations';

const CORPS = `Bonjour,

Suite à votre demande, vous trouverez ci-joint les documents en notre possession
concernant la vente du bien sis Daalakker 22, 2200 Herentals.

Nous restons à votre disposition pour tout complément d'information.

Bien à vous,
BIMBIMMO`;

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
async function trouverMailAlfred(user, pass) {
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
    const uids = await client.search(
      { from: ADRESSE_ALFRED, subject: SUJET_RECHERCHE },
      { uid: true }
    );
    if (!uids || uids.length === 0) {
      throw new Error(
        `Aucun mail de ${ADRESSE_ALFRED} avec « ${SUJET_RECHERCHE} » dans le sujet`
      );
    }
    // Le dernier UID est le plus récent : une démo rejouée renvoie un nouveau
    // mail, il faut répondre à celui-là et pas à une répétition précédente.
    const dernier = uids[uids.length - 1];
    const message = await client.fetchOne(String(dernier), { envelope: true }, { uid: true });
    return {
      messageId: message.envelope.messageId,
      sujet: message.envelope.subject,
      date: message.envelope.date,
      total: uids.length,
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

  const manquantes = [
    !user && 'GMAIL_USER',
    !pass && 'GMAIL_APP_PASSWORD',
    !tokenGithub && 'ASSETS_GITHUB_TOKEN',
  ].filter(Boolean);
  if (manquantes.length) {
    return res.status(500).json({ error: `Variables d'environnement manquantes : ${manquantes.join(', ')}` });
  }

  // ?dry=1 : retrouve le mail et les pièces, mais n'envoie rien. Permet de
  // vérifier la configuration sans polluer le dossier côté Alfred.
  const blanc = req.query?.dry === '1' || req.query?.dry === 'true';

  try {
    const mail = await trouverMailAlfred(user, pass);

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
    return res.status(500).json({ error: error.message });
  }
}
