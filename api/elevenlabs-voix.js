// Métadonnées des voix ElevenLabs (nom, description, étiquettes, extrait) —
// pour que le panneau "Voix d'Alfred" (alfred-ui.js) affiche des noms
// parlants au lieu d'ID opaques. Ajouté le 06/09 : "le code c'est pas très
// parlant, tu peux extraire le nom et voir la description non ?".
//
// GET ?ids=a,b,c  → infos de ces voix (GET /v1/voices/{id} pour chacune ;
//                   une voix de la bibliothèque doit avoir été ajoutée au
//                   compte — "Add to my voices" — pour être lisible ici).
// GET ?all=1      → toutes les voix du compte (GET /v1/voices).
// Même clé API que api/tts-elevenlabs.js (ELEVENLABS_API_KEY), jamais dans
// le code.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(500).json({ error: 'ELEVENLABS_API_KEY non configurée' });
  const entetes = { 'xi-api-key': key, 'Accept': 'application/json' };

  const resumer = (v) => ({
    voiceId: v.voice_id,
    name: v.name || '',
    description: v.description || '',
    labels: v.labels || {},
    category: v.category || '',
    previewUrl: v.preview_url || '',
    ok: true,
  });

  try {
    if (req.query && req.query.all) {
      const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: entetes });
      if (!r.ok) return res.status(r.status).json({ error: `ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}` });
      const data = await r.json();
      return res.status(200).json({ voices: (data.voices || []).map(resumer) });
    }

    const ids = String((req.query && req.query.ids) || '').split(',').map(s => s.trim()).filter(s => /^[A-Za-z0-9]{10,40}$/.test(s)).slice(0, 12);
    if (!ids.length) return res.status(400).json({ error: 'ids requis (liste de Voice ID séparés par des virgules)' });

    const voices = await Promise.all(ids.map(async (id) => {
      try {
        const r = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(id)}`, { headers: entetes });
        if (r.ok) return resumer(await r.json());
        const detail = (await r.text()).slice(0, 200);
        return { voiceId: id, ok: false, erreur: r.status === 404 || r.status === 400
          ? "Voix pas encore ajoutée à ton compte ElevenLabs (bouton « Add to my voices » sur elevenlabs.io)"
          : `ElevenLabs ${r.status}: ${detail}` };
      } catch (e) {
        return { voiceId: id, ok: false, erreur: String(e && e.message || e) };
      }
    }));
    return res.status(200).json({ voices });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
