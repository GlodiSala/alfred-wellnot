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
    const key = process.env.TTS_KEY;

    // v1beta1, pas v1 : les voix Chirp3 HD (les plus naturelles) ne sont
    // exposées que sur v1beta1 — un appel v1 leur renvoie une erreur
    // (confirmé par la doc Google : le client officiel utilise
    // texttospeech_v1beta1.TextToSpeechClient pour Chirp3 HD). v1beta1 reste
    // compatible avec les requêtes existantes (Wavenet, Neural2, etc.).
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}