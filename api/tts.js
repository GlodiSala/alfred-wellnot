import crypto from 'crypto';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Gemini-TTS (modèle gemini-2.5-flash-tts, avec contrôle du ton) passe par
// Vertex AI derrière Cloud Text-to-Speech, et Vertex AI n'accepte pas
// l'authentification par simple clé API pour ce genre d'appel — il faut un
// jeton OAuth obtenu via un compte de service (JSON stocké dans la
// variable d'environnement GOOGLE_SERVICE_ACCOUNT_JSON, avec le rôle
// "Utilisateur Vertex AI" accordé côté Google Cloud). Reconstruit un JWT
// signé RS256 à la main (pas de dépendance externe) et l'échange contre un
// jeton d'accès de courte durée — refait à chaque appel, la latence
// supplémentaire (~200-500ms) est négligeable comparée à la génération TTS
// elle-même.
async function obtenirJetonAccesGoogle() {
  const brut = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!brut) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON non configurée');
  const compteService = JSON.parse(brut);

  const maintenant = Math.floor(Date.now() / 1000);
  const entete = { alg: 'RS256', typ: 'JWT' };
  const revendications = {
    iss:   compteService.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   maintenant + 3600,
    iat:   maintenant,
  };

  const nonSigne = base64url(JSON.stringify(entete)) + '.' + base64url(JSON.stringify(revendications));
  const signataire = crypto.createSign('RSA-SHA256');
  signataire.update(nonSigne);
  signataire.end();
  const signature = signataire.sign(compteService.private_key).toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = nonSigne + '.' + signature;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Échec obtention jeton OAuth Google: ' + JSON.stringify(data));
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // v1beta1, pas v1 : les voix Chirp3 HD/Gemini-TTS (les plus naturelles)
    // ne sont exposées que sur v1beta1 — un appel v1 leur renvoie une
    // erreur. v1beta1 reste compatible avec les requêtes existantes
    // (Wavenet, Neural2, etc.).
    const url = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize';
    const estGeminiTTS = !!(req.body && req.body.voice && req.body.voice.modelName);

    let response;
    if (estGeminiTTS) {
      // Auth par compte de service (Vertex AI) — voir obtenirJetonAccesGoogle.
      const jeton = await obtenirJetonAccesGoogle();
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jeton}` },
        body: JSON.stringify(req.body),
      });
    } else {
      // Auth par simple clé API — suffisant pour les voix Cloud TTS classiques.
      const key = process.env.TTS_KEY;
      response = await fetch(`${url}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
