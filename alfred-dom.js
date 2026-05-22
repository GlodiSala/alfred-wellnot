// === ALFRED DOM — Actions sur le vrai app.alfred.be ===

// === UTILITAIRES ANGULAR ===

// Remplir un input Angular correctement
function remplirInput(input, valeur) {
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  setter.call(input, valeur);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  return true;
}

// Cliquer un bouton par texte
function cliquerBouton(texte) {
  const btns = Array.from(document.querySelectorAll('button'));
  const btn = btns.find(b => b.textContent.trim().includes(texte));
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}

// Naviguer vers une page
function naviguer(path) {
  window.location.href = path;
}

// Attendre qu'un élément apparaisse
function attendreElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout: ${selector} introuvable`));
    }, timeout);
  });
}

// Attendre un délai
function attendre(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// === SÉQUENCES ACTE 2 ===

// SÉQUENCE 1 — Créer un dossier
async function seq_creerDossier() {
  showBubble(currentLangue === 'nl'
    ? "De eerste stap is het dossier aanmaken."
    : "La première étape, c'est créer le dossier.");

  await speak(naturaliserTexte(
    currentLangue === 'nl'
      ? "De eerste stap is het dossier aanmaken. Klik op Dossiers."
      : "La première étape c'est créer le dossier. On clique sur Dossiers."
  ), currentLangue);

  // Navigue vers création dossier
  await attendre(500);
  naviguer('/app/folders/new');
}

// SÉQUENCE 2 — Remplir infos générales
async function seq_remplirInfos() {
  try {
    // Attend que le formulaire soit chargé
    await attendreElement('input.p-component');
    await attendre(800);

    showBubble(currentLangue === 'nl'
      ? "Ik maak het dossier aan..."
      : "Je crée le dossier...");

    // Remplit le numéro de dossier
    const inputNum = document.querySelector('input.p-component');
    if (inputNum) {
      remplirInput(inputNum, 'DEMO-2026');
      await attendre(300);
    }

    // Clique Suivant
    await attendre(500);
    cliquerBouton('Suivant');

    await speak(naturaliserTexte(
      currentLangue === 'nl'
        ? "Dossier aangemaakt. Nu de partijen toevoegen."
        : "Dossier créé. Maintenant les parties."
    ), currentLangue);

  } catch(e) {
    console.error('seq_remplirInfos erreur:', e);
  }
}

// SÉQUENCE 3 — Ajouter les parties (Personnes)
async function seq_ajouterParties() {
  try {
    await attendreElement('button.p-step-header');
    await attendre(800);

    showBubble(currentLangue === 'nl'
      ? "Ik voeg de partijen toe via het rijksregister."
      : "J'identifie les parties via le registre national.");

    await speak(naturaliserTexte(
      currentLangue === 'nl'
        ? "U geeft me het rijksregisternummer — en ik extraheer onmiddellijk alle informatie. Naam, adres, burgerlijke staat, huwelijksvermogensstelsel. In enkele seconden."
        : "Vous me donnez le numéro de registre national — et j'extrais instantanément toutes les informations. Nom, prénom, adresse, régime matrimonial. En quelques secondes."
    ), currentLangue);

    // Clique sur étape 2 Personnes
    await attendre(500);
    const steps = document.querySelectorAll('button.p-step-header');
    if (steps[1]) steps[1].click();

  } catch(e) {
    console.error('seq_ajouterParties erreur:', e);
  }
}

// SÉQUENCE 4 — Documents
async function seq_documents() {
  try {
    showBubble(currentLangue === 'nl'
      ? "Ik analyseer de documenten..."
      : "J'analyse les documents...");

    await speak(naturaliserTexte(
      currentLangue === 'nl'
        ? "Documenten die ik niet zelf ophaal worden geüpload. Ik analyseer ze zelfstandig en categoriseer ze. Als er iets ontbreekt — ik identificeer wie ik moet schrijven en stel de mail op."
        : "Les documents que je ne collecte pas moi-même sont uploadés. Je les analyse seul, je les catégorise. Et si quelque chose manque — j'identifie à qui écrire et je rédige le mail."
    ), currentLangue);

    // Navigue vers documents d'un dossier existant
    await attendre(500);
    const steps = document.querySelectorAll('button.p-step-header');
    if (steps[3]) steps[3].click();

  } catch(e) {
    console.error('seq_documents erreur:', e);
  }
}

// SÉQUENCE 5 — Rédaction
async function seq_redaction() {
  try {
    showBubble(currentLangue === 'nl'
      ? "Ik genereer het akteontwerp..."
      : "Je génère le projet d'acte...");

    await speak(naturaliserTexte(
      currentLangue === 'nl'
        ? "Op basis van alles wat ik heb verzameld, genereer ik het ontwerp van de verkoopbelofte. U begint niet met een blanco pagina — u begint met een solide ontwerp gecontroleerd door Check-R."
        : "Sur base de tout ce que j'ai collecté, je génère le projet de compromis. Vous ne partez pas d'une page blanche — vous partez d'un projet solide vérifié par Check-R. Vous relisez, vous ajustez, vous validez."
    ), currentLangue);

  } catch(e) {
    console.error('seq_redaction erreur:', e);
  }
}

// SÉQUENCE 6 — Chatbot
async function seq_chatbot() {
  try {
    showBubble(currentLangue === 'nl'
      ? "Het dossier vordert zelfs 's nachts..."
      : "Le dossier avance même la nuit...");

    await speak(naturaliserTexte(
      currentLangue === 'nl'
        ? "Op elk moment, voor elk dossier, stel me een vraag — ik antwoord onmiddellijk. En het dossier vordert zelfs wanneer niemand er zich mee bezighoudt. Een document ontvangen om elf uur 's avonds op zondag — ik verwerk het onmiddellijk."
        : "À n'importe quel moment, sur n'importe quel dossier, posez-moi une question — je réponds instantanément. Et le dossier avance même quand personne ne s'en occupe. Un document reçu à vingt-trois heures un dimanche — je l'intègre immédiatement."
    ), currentLangue);

  } catch(e) {
    console.error('seq_chatbot erreur:', e);
  }
}

// === MAPPING RÉPLIQUES → ACTIONS DOM ===
// Quand Alfred joue une réplique du script, il fait aussi l'action sur le site
const DOM_ACTIONS = {
  'Dossier':    seq_creerDossier,
  'Dossier aanmaken': seq_creerDossier,
  'Parties':    seq_ajouterParties,
  'Partijen':   seq_ajouterParties,
  'Documents':  seq_documents,
  'Documenten': seq_documents,
  'Rédaction':  seq_redaction,
  'Redactie':   seq_redaction,
  'Chatbot':    seq_chatbot,
};

// Appelé depuis alfred-brain.js quand une réplique est jouée
async function executerActionDOM(label) {
  const action = DOM_ACTIONS[label];
  if (action) {
    await attendre(1000); // Laisse Alfred finir de parler
    await action();
  }
}

// === SURVEILLANCE URL — Alfred commente les changements de page ===
let lastURL = window.location.pathname;

setInterval(async () => {
  const currentURL = window.location.pathname;
  if (currentURL !== lastURL) {
    lastURL = currentURL;
    
    // Met à jour l'indicateur discret
    const secours = document.getElementById('alfred-secours');
    if (secours) {
      const page = currentURL.replace('/app/', '').split('/')[0];
      secours.textContent = `📍 ${page}`;
      setTimeout(() => {
        secours.textContent = '← → flèches';
      }, 3000);
    }
  }
}, 500);