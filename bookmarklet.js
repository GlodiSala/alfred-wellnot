(function() {
  if (document.getElementById('alfred-left-panel')) return;

  const BASE = 'https://glodisala.github.io/alfred-wellnot/';

  // ORDRE CRITIQUE : config → ui → voice → dom → brain
  const scripts = [
    'alfred-config.js',
    'alfred-ui.js',
    'alfred-voice.js',
    'alfred-dom.js',
    'alfred-brain.js',
  ];

  let idx = 0;
  function loadNext() {
    if (idx >= scripts.length) return;
    const s = document.createElement('script');
    s.src = BASE + scripts[idx] + '?v=' + Date.now();
    s.onload = () => { idx++; loadNext(); };
    s.onerror = (e) => console.error('Erreur chargement:', scripts[idx], e);
    document.head.appendChild(s);
  }
  loadNext();
})();