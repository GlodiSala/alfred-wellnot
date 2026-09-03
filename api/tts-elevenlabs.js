// Proxy vers ElevenLabs Text-to-Speech — ajouté pour disposer d'une voix
// néerlandaise BELGE (nl-BE/flamand) réaliste : ni Gemini-TTS ni Chirp3 HD
// (Google) ne proposent de voix nl-BE (confirmé par une vraie erreur API :
// "language code 'nl-BE' is not supported for Gemini voices") — seul
// nl-NL (Pays-Bas) existe côté Google. ElevenLabs, lui, a de vraies voix
// flamandes nommées dans sa bibliothèque.
//
// Clé API : variable d'environnement ELEVENLABS_API_KEY (jamais dans le
// code, même logique que TTS_KEY/GOOGLE_SERVICE_ACCOUNT_JSON pour Google).
//
// Contrairement à l'API Google (JSON avec audioContent en base64),
// ElevenLabs renvoie directement les octets MP3 bruts — reconverti ici en
// base64 pour renvoyer EXACTEMENT le même format que api/tts.js
// ({ audioContent }), afin que le code client (alfred-voice.js) puisse
// réutiliser la même logique de lecture/cache sans distinguer les moteurs.
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
    const { text, voiceId, modelId, stability, similarityBoost, style, useSpeakerBoost } = req.body || {};
    if (!text || !voiceId) {
      return res.status(400).json({ error: 'text et voiceId sont requis' });
    }

    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'ELEVENLABS_API_KEY non configurée' });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'xi-api-key': key,
      },
      body: JSON.stringify({
        text,
        // eleven_multilingual_v2 : seul modèle multilingue "haute qualité"
        // d'ElevenLabs couvrant le néerlandais (voir leur documentation) —
        // remplaçable via modelId si un autre est préférable à l'usage.
        model_id: modelId || 'eleven_multilingual_v2',
        // Valeurs par défaut alignées sur ELEVENLABS_REGLAGES_VOIX
        // (alfred-voice.js), qui les envoie explicitement à chaque appel —
        // ces défauts ne servent qu'en secours (appel direct à l'API sans
        // passer par le client, ex. test manuel).
        voice_settings: {
          stability:          typeof stability === 'number' ? stability : 0.42,
          similarity_boost:   typeof similarityBoost === 'number' ? similarityBoost : 0.75,
          style:              typeof style === 'number' ? style : 0.35,
          use_speaker_boost:  typeof useSpeakerBoost === 'boolean' ? useSpeakerBoost : true,
        },
      }),
    });

    if (!response.ok) {
      let detail;
      try { detail = await response.json(); } catch { detail = await response.text(); }
      return res.status(response.status).json({ error: `ElevenLabs: ${JSON.stringify(detail).slice(0, 500)}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioContent = Buffer.from(arrayBuffer).toString('base64');
    return res.status(200).json({ audioContent });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
