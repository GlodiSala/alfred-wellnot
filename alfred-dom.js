// === ALFRED DOM — Navigation + Curseur ===
// Sélecteurs basés sur le DOM réel de app.alfred.be

function creerCurseur() {
  if (document.getElementById('alfred-cursor')) return;
  const c = document.createElement('div');
  c.id = 'alfred-cursor';
  c.style.cssText = `
    position:fixed; width:16px; height:16px;
    background:#14b0bd; border-radius:50%;
    pointer-events:none; z-index:999999; opacity:0;
    box-shadow:0 0 10px rgba(20,176,189,0.8);
    transform:translate(-50%,-50%);
    transition:left .5s cubic-bezier(.25,.46,.45,.94),
               top  .5s cubic-bezier(.25,.46,.45,.94),
               opacity .2s ease;
  `;
  document.body.appendChild(c);
}

function curseurVers(el, callback) {
  const c = document.getElementById('alfred-cursor');
  if (!c || !el) { if (callback) callback(); return; }

  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width  / 2;
  const y = rect.top  + rect.height / 2;

  const alfred = document.getElementById('alfred-svg');
  if (alfred) {
    const ar = alfred.getBoundingClientRect();
    c.style.transition = 'none';
    c.style.left = (ar.left + ar.width  / 2) + 'px';
    c.style.top  = (ar.top  + ar.height / 2) + 'px';
  }

  c.style.opacity = '1';

  const safeHide = setTimeout(() => { c.style.opacity = '0'; }, 2000);

  setTimeout(() => {
    c.style.transition = `left .5s cubic-bezier(.25,.46,.45,.94),
                          top  .5s cubic-bezier(.25,.46,.45,.94),
                          opacity .2s ease`;
    c.style.left = x + 'px';
    c.style.top  = y + 'px';

    setTimeout(() => {
      c.style.transform = 'translate(-50%,-50%) scale(0.6)';
      setTimeout(() => {
        c.style.transform = 'translate(-50%,-50%) scale(1)';
        clearTimeout(safeHide);
        if (callback) callback();
        setTimeout(() => { c.style.opacity = '0'; }, 500);
      }, 150);
    }, 520);
  }, 60);
}

function attendre(ms) { return new Promise(r => setTimeout(r, ms)); }

function trouverNav(textes) {
  const candidats = Array.from(document.querySelectorAll(
    'a, button, [role="menuitem"], [role="tab"], li, span, div'
  )).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  for (const texte of textes) {
    const lower = texte.toLowerCase();
    const exact = candidats.find(b =>
      b.textContent.trim().toLowerCase() === lower
    );
    if (exact) return exact;
    const partial = candidats.find(b =>
      b.textContent.trim().toLowerCase().includes(lower)
    );
    if (partial) return partial;
  }
  return null;
}

async function naviguerVers(textes) {
  const el = trouverNav(textes);
  if (!el) {
    console.warn('[Alfred DOM] Élément non trouvé:', textes);
    return false;
  }
  return new Promise(resolve => {
    curseurVers(el, () => {
      el.click();
      resolve(true);
    });
  });
}

async function seq_montrerDossiers() {
  await naviguerVers(['Dossiers']);
  await attendre(800);
}

async function seq_montrerCreation() {
  await naviguerVers(['Dossiers']);
  await attendre(800);
  // Sélecteur direct sur action-card
  const btn = Array.from(document.querySelectorAll('a.action-card'))
    .find(el => el.textContent.includes('Créer un dossier') && el.getBoundingClientRect().width > 0);
  if (btn) {
    curseurVers(btn, () => btn.click());
    await attendre(800);
  }
}
async function seq_montrerPersonnes() {
  await naviguerVers(['Personnes']);
  await attendre(800);
}

async function seq_montrerNotaires() {
  await naviguerVers(['Notaires']);
  await attendre(800);
}

async function seq_montrerContacts() {
  await naviguerVers(['Contacts']);
  await attendre(800);
}

async function seq_montrerDossierExistant() {
  await naviguerVers(['Dossiers']);
  await attendre(1000);
  const lignes = Array.from(document.querySelectorAll(
    'tr, [class*="row"], [class*="item"], tbody tr'
  )).filter(el =>
    el.getBoundingClientRect().width > 0 &&
    el.textContent.trim().length > 5
  );
  if (lignes[0]) {
    curseurVers(lignes[0], () => lignes[0].click());
    await attendre(1000);
  }
}

async function seq_montrerDocuments() {
  const ok = await naviguerVers(['Documents', 'Documenten', 'Pièces']);
  if (!ok) {
    await seq_montrerDossierExistant();
    await attendre(800);
    await naviguerVers(['Documents', 'Documenten']);
  }
}

async function seq_montrerRedaction() {
  const ok = await naviguerVers(['Compromis', 'Acte de vente', 'Rédaction', 'Akte', 'Ontwerp']);
  if (!ok) {
    await seq_montrerDossierExistant();
    await attendre(800);
    await naviguerVers(['Compromis', 'Acte de vente', 'Rédaction']);
  }
}

async function seq_montrerChatbot() {
  await naviguerVers(['Chat', 'Message', 'Bericht', 'Chatbot']);
}

const DOM_ACTIONS = {
  'Dossier':          seq_montrerCreation,
  'Dossier aanmaken': seq_montrerCreation,
  'Parties':          seq_montrerPersonnes,
  'Partijen':         seq_montrerPersonnes,
  'Documents':        seq_montrerDocuments,
  'Documenten':       seq_montrerDocuments,
  'Rédaction':        seq_montrerRedaction,
  'Redactie':         seq_montrerRedaction,
  'Chatbot':          seq_montrerChatbot,
};

async function executerActionDOM(label) {
  const action = DOM_ACTIONS[label];
  if (action) {
    await attendre(600);
    await action();
  }
}

async function changerEcranAvecCurseur(categorie) {
  const mapping = {
    dashboard:  ['Home'],
    dossiers:   ['Dossiers'],
    parties:    ['Personnes'],
    notaires:   ['Notaires'],
    contacts:   ['Contacts'],
    documents:  ['Documents', 'Documenten'],
    redaction:  ['Compromis', 'Acte de vente', 'Rédaction'],
    chatbot:    ['Chat', 'Message'],
  };

  const textes = mapping[categorie];
  if (textes) await naviguerVers(textes);
}

creerCurseur();
console.log('[Alfred DOM] Prêt — curseur créé');