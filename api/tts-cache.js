// Cache partagé d'audio TTS déjà généré (par Gemini ou Cloud TTS), en base
// KV — contrairement au cache IndexedDB du navigateur (alfred-voice.js),
// celui-ci est commun à tous les appareils ET à toutes les pages sur
// lesquelles tourne le bookmarklet (le stockage navigateur est isolé par
// site, pas ce cache-ci). Résultat : un texte/une voix générés une fois,
// par n'importe qui, sur n'importe quelle page, profitent ensuite à tout
// le monde sans repayer/rattendre la génération.
//
// Pas de mot de passe : ce n'est que de l'audio de synthèse d'un texte
// déjà public (le script de démo), pas une donnée sensible — même logique
// que la lecture publique du script (api/script.js en GET).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const KV_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'Base KV non configurée (variables d\'environnement manquantes)' });
  }

  const cle = (req.query && req.query.cle) || (req.body && req.body.cle);
  if (!cle || typeof cle !== 'string' || !/^[a-f0-9]{64}$/.test(cle)) {
    return res.status(400).json({ error: 'Clé invalide (attendu : hachage SHA-256 hexadécimal)' });
  }
  const KEY = 'alfred_tts_cache:' + cle;

  if (req.method === 'GET') {
    try {
      const r = await fetch(`${KV_URL}/get/${KEY}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      });
      const data = await r.json();
      if (!data.result) return res.status(200).json(null);
      return res.status(200).json(JSON.parse(data.result));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (!body || typeof body.base64 !== 'string' || !body.base64) {
      return res.status(400).json({ error: 'Format invalide' });
    }
    try {
      const value = JSON.stringify({ base64: body.base64, rate: body.rate || null, format: body.format || 'mp3' });
      const r = await fetch(`${KV_URL}/set/${KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'text/plain' },
        body: value,
      });
      const data = await r.json();
      if (data.result !== 'OK') throw new Error('Échec de l\'écriture dans la base');
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
