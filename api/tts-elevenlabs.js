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

    // Modèle : eleven_v3 par défaut depuis le 05/09 (le plus expressif,
    // comprend les indications de jeu entre crochets dans le texte — voir
    // EMOTIONS_VOIX dans alfred-voice.js). eleven_multilingual_v2 reste
    // utilisable via modelId.
    const model = modelId || 'eleven_v3';
    const estV3 = /^eleven_v3/.test(model);
    // v3 n'a pas de réglage "style" et n'accepte pour stability que trois
    // crans (0 créatif / 0.5 naturel / 1 robuste) — on arrondit au plus
    // proche et on n'envoie que ce qu'il connaît. Un paramètre inconnu a
    // déjà fait tomber TOUS les appels d'un moteur une fois (voir "pitch"
    // dans alfred-voice.js) : on ne prend pas le risque.
    const stab = typeof stability === 'number' ? stability : (estV3 ? 0.5 : 0.42);
    const stabV3 = [0, 0.5, 1].reduce((a, b) => Math.abs(b - stab) < Math.abs(a - stab) ? b : a);
    const reglages = estV3
      ? { stability: stabV3, similarity_boost: typeof similarityBoost === 'number' ? similarityBoost : 0.75, use_speaker_boost: typeof useSpeakerBoost === 'boolean' ? useSpeakerBoost : true }
      : { stability: stab, similarity_boost: typeof similarityBoost === 'number' ? similarityBoost : 0.75, style: typeof style === 'number' ? style : 0.35, use_speaker_boost: typeof useSpeakerBoost === 'boolean' ? useSpeakerBoost : true };

    const appeler = (voice_settings) => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'audio/mpeg', 'xi-api-key': key },
      body: JSON.stringify({ text, model_id: model, voice_settings }),
    });

    let response = await appeler(reglages);
    // Repli : si l'API refuse les réglages (400/422 — ex. contrainte v3 non
    // anticipée), on retente une fois avec le strict minimum plutôt que de
    // laisser la démo sans voix.
    if (!response.ok && (response.status === 400 || response.status === 422)) {
      let detail = '';
      try { detail = JSON.stringify(await response.clone().json()); } catch { detail = await response.clone().text(); }
      if (/voice_settings|stability|style|similarity/i.test(detail)) {
        response = await appeler({ stability: estV3 ? 0.5 : 0.5 });
      }
    }

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
