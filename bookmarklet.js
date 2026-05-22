// === BOOKMARKLET — charge Alfred sur app.alfred.be ===
(function() {
  if (document.getElementById('alfred-left-panel')) return;

  const BASE = 'https://glodisala.github.io/alfred-wellnot/';
  // OU si GitHub Pages pas encore actif :
  // const BASE = 'https://alfred-wellnot.vercel.app/';

  // Charge les scripts dans l'ordre correct
  const scripts = [
    'alfred-config.js',   // 1. Config + prompts
    'alfred-voice.js',    // 2. Voix TTS
    'alfred-brain.js',    // 3. Gemini + micro
    'alfred-dom.js',      // 4. Actions sur le site
    'alfred-ui.js',       // 5. UI en dernier — init tout
  ];

  let idx = 0;
  function loadNext() {
    if (idx >= scripts.length) return;
    const s = document.createElement('script');
    s.src = BASE + scripts[idx] + '?v=' + Date.now(); // Cache busting
    s.onload = () => { idx++; loadNext(); };
    s.onerror = (e) => console.error('Erreur chargement:', scripts[idx], e);
    document.head.appendChild(s);
    idx++;
  }
  loadNext();
})();