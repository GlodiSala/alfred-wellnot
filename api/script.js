export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Alfred-Password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const KV_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const KEY = 'alfred_script';

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'Base KV non configurée (variables d\'environnement manquantes)' });
  }

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
    const password = req.headers['x-alfred-password'];
    const motDePasseAttendu = process.env.SCRIPT_PASSWORD || process.env.ALFRED_SCRIPT_PASSWORD;
    if (!motDePasseAttendu || password !== motDePasseAttendu) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    const body = req.body;
    if (!body || !Array.isArray(body.fr) || !Array.isArray(body.nl) || body.fr.length !== body.nl.length) {
      return res.status(400).json({ error: 'Format invalide' });
    }

    try {
      const updatedAt = new Date().toISOString();
      const value = JSON.stringify({ fr: body.fr, nl: body.nl, updatedAt });
      const r = await fetch(`${KV_URL}/set/${KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'text/plain' },
        body: value,
      });
      const data = await r.json();
      if (data.result !== 'OK') throw new Error('Échec de l\'écriture dans la base');
      return res.status(200).json({ ok: true, updatedAt });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
