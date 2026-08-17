// === ALFRED UI ===

let sleepTimer = null;
let eyeTargetX = 0, eyeTargetY = 0;
let eyeCurX    = 0, eyeCurY    = 0;
let rafEyes    = null;

const ALFRED_SVG = `
<div id="alfred-avatar-outer" style="position:relative;width:220px;height:230px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">

  <div id="alfred-shadow-ground" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:160px;height:22px;background:radial-gradient(ellipse,rgba(5,69,97,.5) 0%,transparent 70%);border-radius:50%;pointer-events:none;"></div>

  <div id="alfred-zzz" style="position:absolute;top:10px;right:10px;pointer-events:none;opacity:0;transition:opacity .4s;z-index:10;">
    <span class="alfred-z" style="font-size:12px;position:absolute;right:0;top:36px;color:rgba(5,69,97,.75);">z</span>
    <span class="alfred-z" style="font-size:16px;position:absolute;right:10px;top:18px;color:rgba(5,69,97,.75);">z</span>
    <span class="alfred-z" style="font-size:20px;position:absolute;right:20px;top:0;color:rgba(5,69,97,.75);">Z</span>
  </div>

  <div id="alfred-avatar-wrap" style="position:relative;width:195px;height:195px;overflow:visible;">

    <svg id="alfred-extrusion" viewBox="0 0 379.79 383.47" xmlns="http://www.w3.org/2000/svg"
         style="position:absolute;top:8px;left:8px;width:175px;height:175px;overflow:visible;pointer-events:none;opacity:1;transition:opacity .4s ease;">
      <circle cx="189.9" cy="191.74" r="191" fill="#0a6b7a"/>
      <path fill="#0a6b7a" d="M246.68,12.44C230.03,4.47,211.1,0,189.28,0h-.53c-22.96.09-42.76,5.17-59.94,14.02C53.98,39.52,0,110.33,0,193.66c0,104.72,85.18,189.81,189.9,189.81s189.9-85.18,189.9-189.81c0-84.91-56-156.95-133.02-181.13l-.09-.09ZM126.63,30.06h.26c16.83-10.95,37.68-16.56,62.13-16.65h.7c32.16,0,58.01,9.64,77.03,28.66,35.32,35.32,35.49,92.1,35.49,92.89v.44s2.8,29.36-9.64,43.03c-4.29,4.73-9.9,7.01-17.18,7.01H107.44c-6.22.18-11.57-1.93-15.95-6.31-13.76-13.58-14.02-44.25-14.02-44.6,0-.53-.7-56.35,33.83-91.75,4.73-4.82,9.81-9.03,15.42-12.71h-.09ZM109.71,264.56l-3.07,2.1v81.58c-54.94-29.71-92.45-87.81-92.45-154.58,0-58.71,29.09-110.68,73.43-142.58-24.19,37.42-23.66,81.32-23.57,83.51,0,1.49.09,36.28,17.96,53.89,6.84,6.75,15.25,10.17,24.97,10.17h.53c10.95-.18,26.9-.18,44.69-.18-4.12,14.2-16.12,47.76-42.5,66.16v-.09ZM257.46,355.7c-20.86,8.76-43.64,13.58-67.56,13.58s-47.76-5.08-68.88-14.11v-81.15c30.85-23.49,42.94-63.09,46.09-75.63h15.07v93.06c-12.01,3.24-21.03,13.67-21.03,26.73,0,15.6,12.62,28.22,28.22,28.22s28.22-12.62,28.22-28.22c0-13.06-9.03-23.49-21.03-26.73v-93.06h15.07c3.15,12.53,15.25,52.05,46.09,75.54v81.67l-.26.09ZM271.74,348.86v-82.2l-3.07-2.1c-26.29-18.31-38.29-51.79-42.5-66.07h49.07c11.04,0,20.16-3.86,26.99-11.39,15.86-17.53,13.32-49.42,12.97-52.84,0-5.52-.96-48.64-25.5-84.91,45.66,31.72,75.63,84.48,75.63,144.15,0,67.3-38.03,125.75-93.77,155.19l.18.18Z"/>
    </svg>

    <svg id="alfred-svg" viewBox="0 0 379.79 383.47" xmlns="http://www.w3.org/2000/svg"
         style="position:absolute;top:0;left:0;overflow:visible;width:175px;height:175px;">
      <circle cx="189.9" cy="191.74" r="191" fill="white"/>
      <ellipse cx="130" cy="55" rx="55" ry="35" fill="rgba(255,255,255,0.15)" style="pointer-events:none;"/>
      <g id="alfred-body-main" style="transform-origin:189.9px 191.74px;">
        <path fill="#14b0bd" d="M246.68,12.44C230.03,4.47,211.1,0,189.28,0h-.53c-22.96.09-42.76,5.17-59.94,14.02C53.98,39.52,0,110.33,0,193.66c0,104.72,85.18,189.81,189.9,189.81s189.9-85.18,189.9-189.81c0-84.91-56-156.95-133.02-181.13l-.09-.09ZM126.63,30.06h.26c16.83-10.95,37.68-16.56,62.13-16.65h.7c32.16,0,58.01,9.64,77.03,28.66,35.32,35.32,35.49,92.1,35.49,92.89v.44s2.8,29.36-9.64,43.03c-4.29,4.73-9.9,7.01-17.18,7.01H107.44c-6.22.18-11.57-1.93-15.95-6.31-13.76-13.58-14.02-44.25-14.02-44.6,0-.53-.7-56.35,33.83-91.75,4.73-4.82,9.81-9.03,15.42-12.71h-.09ZM109.71,264.56l-3.07,2.1v81.58c-54.94-29.71-92.45-87.81-92.45-154.58,0-58.71,29.09-110.68,73.43-142.58-24.19,37.42-23.66,81.32-23.57,83.51,0,1.49.09,36.28,17.96,53.89,6.84,6.75,15.25,10.17,24.97,10.17h.53c10.95-.18,26.9-.18,44.69-.18-4.12,14.2-16.12,47.76-42.5,66.16v-.09ZM257.46,355.7c-20.86,8.76-43.64,13.58-67.56,13.58s-47.76-5.08-68.88-14.11v-81.15c30.85-23.49,42.94-63.09,46.09-75.63h15.07v93.06c-12.01,3.24-21.03,13.67-21.03,26.73,0,15.6,12.62,28.22,28.22,28.22s28.22-12.62,28.22-28.22c0-13.06-9.03-23.49-21.03-26.73v-93.06h15.07c3.15,12.53,15.25,52.05,46.09,75.54v81.67l-.26.09ZM271.74,348.86v-82.2l-3.07-2.1c-26.29-18.31-38.29-51.79-42.5-66.07h49.07c11.04,0,20.16-3.86,26.99-11.39,15.86-17.53,13.32-49.42,12.97-52.84,0-5.52-.96-48.64-25.5-84.91,45.66,31.72,75.63,84.48,75.63,144.15,0,67.3-38.03,125.75-93.77,155.19l.18.18Z"/>
        <path fill="#14b0bd" d="M275.51,107.61H103.4l-.79-4.38c-.18-1.14-5-28.83,8.06-44.34,5.7-6.75,13.67-10.17,23.66-10.17h110.94c9.64,0,17.35,3.42,22.87,9.9,12.97,15.42,8.33,43.38,8.15,44.52l-.79,4.47h0ZM112.61,96.92h153.71c.61-7.54.88-22.87-6.31-31.37-3.42-4.12-8.24-6.05-14.63-6.13-.88,0-110.85,0-110.77,0h-.09c-6.84,0-11.92,2.1-15.51,6.4-6.75,8.06-7.1,22.61-6.31,31.2"/>
        <g id="alfred-eye-l" style="transform-origin:141.97px 78.17px;">
          <path fill="#14b0bd" d="M155.55,78.17c0,7.54-6.05,13.58-13.58,13.58s-13.58-6.13-13.58-13.58,6.05-13.58,13.58-13.58,13.58,6.13,13.58,13.58"/>
        </g>
        <g id="alfred-eye-r" style="transform-origin:238.10px 78.17px;">
          <path fill="#14b0bd" d="M251.68,78.17c0,7.54-6.05,13.58-13.58,13.58s-13.58-6.13-13.58-13.58,6.05-13.58,13.58-13.58,13.58,6.13,13.58,13.58"/>
        </g>
        <g id="alfred-lids" style="display:none;">
          <path stroke="#14b0bd" stroke-width="5" stroke-linecap="round" fill="none" d="M128.39,78.17 Q141.97,88.1 155.55,78.17"/>
          <line x1="134" y1="80" x2="131" y2="89" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="142" y1="83" x2="142" y2="92" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="150" y1="80" x2="153" y2="89" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <path stroke="#14b0bd" stroke-width="5" stroke-linecap="round" fill="none" d="M224.52,78.17 Q238.10,88.1 251.68,78.17"/>
          <line x1="230" y1="80" x2="227" y2="89" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="238" y1="83" x2="238" y2="92" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="246" y1="80" x2="249" y2="89" stroke="#14b0bd" stroke-width="2.5" stroke-linecap="round"/>
        </g>
        <path id="alfred-mouth" fill="#14b0bd" d="M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13"/>
        <ellipse id="alfred-mouth-talk" fill="#14b0bd" cx="189" cy="128" rx="20" ry="0" style="display:none;"/>
      </g>
      <ellipse cx="130" cy="55" rx="55" ry="35" fill="rgba(255,255,255,0.12)" style="pointer-events:none;"/>
    </svg>

    <div id="alfred-dots" style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:5px;opacity:0;transition:opacity .3s;z-index:3;">
      <div class="alfred-dot" id="alfred-dot1"></div>
      <div class="alfred-dot" id="alfred-dot2"></div>
      <div class="alfred-dot" id="alfred-dot3"></div>
    </div>

  </div>
</div>`;

// ── Sous-titres ───────────────────────────────────────────
function creerSousTitres() {
  if (document.getElementById('alfred-subtitles')) return;
  const sub = document.createElement('div');
  sub.id = 'alfred-subtitles';
  sub.style.cssText = `
    position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
    max-width:70%; background:rgba(0,0,0,0.72); color:#fff;
    font-size:20px; font-weight:500; line-height:1.5;
    padding:12px 28px; border-radius:10px;
    text-align:center; z-index:2147483647;
    opacity:0; transition:opacity .3s ease;
    pointer-events:none; font-family:sans-serif;
    letter-spacing:0.01em;
  `;
  document.body.appendChild(sub);
}

let subtitleInterval = null;
let subtitleText = '';
// cacherSousTitres() efface le texte 300ms APRÈS avoir baissé l'opacité (le
// temps que le fondu CSS se termine) — avec plusieurs répliques enchaînées
// (voir jouerSecours), la réplique suivante affiche déjà son propre
// sous-titre quand ce minuteur en retard se déclenche, et l'efface par
// erreur : "les sous-titres s'affichent au début, plus rien ensuite".
// masquageSousTitresTimer permet de l'annuler dès qu'un nouveau sous-titre
// est affiché.
let masquageSousTitresTimer = null;

function afficherSousTitres(text) {
  const sub = document.getElementById('alfred-subtitles');
  if (!sub || !text) return;
  clearInterval(subtitleInterval);
  clearTimeout(masquageSousTitresTimer);
  subtitleText = text;
  sub.textContent = text;
  sub.style.opacity = '1';
}

function syncSousTitres(dureeAudio) {
  const sub = document.getElementById('alfred-subtitles');
  if (!sub || !subtitleText) return;
  clearInterval(subtitleInterval);
  const phrases = subtitleText.match(/[^.!?]+[.!?]+/g) || [subtitleText];
  if (phrases.length <= 1) return;
  const delai = (dureeAudio * 1000) / phrases.length;
  let i = 0;
  sub.textContent = phrases[0].trim();
  subtitleInterval = setInterval(() => {
    i++;
    if (i < phrases.length) {
      sub.textContent = phrases[i].trim();
    } else {
      clearInterval(subtitleInterval);
    }
  }, delai);
}

function cacherSousTitres() {
  clearInterval(subtitleInterval);
  subtitleText = '';
  const sub = document.getElementById('alfred-subtitles');
  if (sub) {
    sub.style.opacity = '0';
    clearTimeout(masquageSousTitresTimer);
    masquageSousTitresTimer = setTimeout(() => { sub.textContent = ''; }, 300);
  }
}

// Reflète l'état de lectureAutomatique() sur le bouton "Jouer tout".
function majBoutonLectureAuto(active) {
  const btn = document.getElementById('alfred-lecture-auto');
  if (!btn) return;
  if (active) {
    btn.textContent = '⏸ Arrêter la lecture automatique';
    btn.style.background = 'rgba(220,80,80,.15)';
    btn.style.borderColor = 'rgba(220,80,80,.4)';
  } else {
    btn.textContent = '▶ Jouer tout (les 3 actes)';
    btn.style.background = 'rgba(20,176,189,.12)';
    btn.style.borderColor = 'rgba(20,176,189,.4)';
  }
}

// ── Panneau répliques (lecture + édition FR/NL) ───────────
function creerPanneauRepliques() {
  if (document.getElementById('alfred-repliques-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'alfred-repliques-panel';
  panel.style.cssText = `
    display:none; position:fixed;
    top:50%; left:270px; transform:translateY(-50%);
    background:rgba(5,69,97,0.97); border-radius:14px;
    padding:16px; z-index:500; min-width:460px; max-width:520px;
    max-height:80vh; overflow-y:auto;
    box-shadow:0 8px 40px rgba(0,0,0,0.5);
    font-family:sans-serif;
  `;
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="color:rgba(255,255,255,.35);font-size:8px;letter-spacing:2.5px;">SCRIPT · ALFRED</div>
      <div id="alfred-script-status" style="color:rgba(255,255,255,.4);font-size:9px;"></div>
      <span id="alfred-script-reset" title="Réinitialiser le script par défaut" style="color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;">↺</span>
    </div>
    <button id="alfred-donnees-ouvrir" style="width:100%;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);font-size:11px;font-weight:600;cursor:pointer;">📋 Données du dossier démo</button>
    <button id="alfred-voix-ouvrir" style="width:100%;margin-bottom:6px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);font-size:11px;font-weight:600;cursor:pointer;">🔊 Voix d'Alfred</button>
    <div id="alfred-reglages-reset" style="text-align:center;color:rgba(255,255,255,.35);font-size:9px;margin-bottom:14px;cursor:pointer;">↺ Réinitialiser voix + données démo</div>
    <button id="alfred-lecture-auto" style="width:100%;margin-bottom:14px;padding:8px;border-radius:8px;border:1px solid rgba(20,176,189,.4);background:rgba(20,176,189,.12);color:#fff;font-size:11px;font-weight:600;cursor:pointer;">▶ Jouer tout (les 3 actes)</button>
    <div style="display:flex;gap:20px;align-items:flex-start;">
      <div id="alfred-col-1" style="flex:1;"></div>
      <div id="alfred-col-2" style="flex:1.2;"></div>
      <div id="alfred-col-3" style="flex:0.7;"></div>
    </div>
  `;
  document.body.appendChild(panel);

  const btnDonnees = panel.querySelector('#alfred-donnees-ouvrir');
  btnDonnees.onmouseover = () => { btnDonnees.style.background = 'rgba(255,255,255,.18)'; };
  btnDonnees.onmouseout  = () => { btnDonnees.style.background = 'rgba(255,255,255,.08)'; };
  btnDonnees.onclick = () => {
    panel.style.display = 'none';
    ouvrirPanneauDonneesCreation();
  };

  const btnLectureAuto = panel.querySelector('#alfred-lecture-auto');
  btnLectureAuto.onclick = () => {
    // Le panneau doit se cacher comme pour un clic individuel — remonté
    // en test live ("l'interface ne disparaît pas, c'est pas agréable").
    panel.style.display = 'none';
    if (typeof lectureAutomatique === 'function') lectureAutomatique();
  };

  const btnVoix = panel.querySelector('#alfred-voix-ouvrir');
  btnVoix.onmouseover = () => { btnVoix.style.background = 'rgba(255,255,255,.18)'; };
  btnVoix.onmouseout  = () => { btnVoix.style.background = 'rgba(255,255,255,.08)'; };
  btnVoix.onclick = () => {
    panel.style.display = 'none';
    ouvrirPanneauVoix();
  };

  panel.querySelector('#alfred-script-reset').onclick = () => {
    if (!confirm('Réinitialiser le script au contenu par défaut, pour tout le monde ? Les modifications seront perdues.')) return;
    if (typeof reinitialiserScript === 'function') reinitialiserScript();
    remplirPanneauRepliques();
    // Pousse aussi la remise à zéro en ligne, sinon la prochaine synchro
    // ré-appliquerait l'ancienne version partagée par-dessus le reset local.
    if (typeof sauvegarderAvecGestionConflit === 'function') afficherStatutSauvegarde(sauvegarderAvecGestionConflit());
  };

  // Réinitialisation groupée voix + données démo — volontairement séparée
  // du reset du script (qui contient du texte écrit à la main, plus
  // risqué à effacer par erreur). Évite d'avoir à rouvrir chaque
  // sous-panneau juste pour cliquer son propre ↺ quand on veut juste
  // repartir des réglages par défaut.
  const btnReglagesReset = panel.querySelector('#alfred-reglages-reset');
  btnReglagesReset.onmouseover = () => { btnReglagesReset.style.color = '#fff'; };
  btnReglagesReset.onmouseout  = () => { btnReglagesReset.style.color = 'rgba(255,255,255,.35)'; };
  btnReglagesReset.onclick = () => {
    if (!confirm('Réinitialiser la voix, le ton et les données du dossier démo aux valeurs par défaut, pour tout le monde ? Le script (texte des répliques) n\'est pas touché.')) return;
    if (typeof reinitialiserReglages === 'function') reinitialiserReglages();
    if (typeof sauvegarderAvecGestionConflit === 'function') afficherStatutSauvegarde(sauvegarderAvecGestionConflit());
    if (typeof sauvegarderDonneesCreationAvecGestionConflit === 'function') sauvegarderDonneesCreationAvecGestionConflit();
  };

  const svgEl = document.getElementById('alfred-svg');
  if (svgEl) {
    svgEl.style.cursor = 'pointer';
    let lastClick = 0;
    svgEl.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastClick < 400) {
        const visible = panel.style.display !== 'none';
        if (visible) { panel.style.display = 'none'; }
        else { remplirPanneauRepliques(); panel.style.display = 'block'; }
      }
      lastClick = now;
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') panel.style.display = 'none';
  });
}

// Déplace la réplique à l'index `depuisIdx` juste avant celle à `versIdx`
// (indices communs à REPLIQUES_FR/REPLIQUES_NL), sauvegarde et resynchronise.
function deplacerReplique(depuisIdx, versIdx) {
  const fr = ALFRED_CONFIG.REPLIQUES_FR;
  const nl = ALFRED_CONFIG.REPLIQUES_NL;
  const [itemFr] = fr.splice(depuisIdx, 1);
  const [itemNl] = nl.splice(depuisIdx, 1);
  let cible = versIdx;
  if (depuisIdx < versIdx) cible -= 1; // le retrait a décalé les index suivants
  fr.splice(cible, 0, itemFr);
  nl.splice(cible, 0, itemNl);
  remplirPanneauRepliques();
  if (typeof sauvegarderAvecGestionConflit === 'function') afficherStatutSauvegarde(sauvegarderAvecGestionConflit());
}

let dragSourceIdx = null;

function remplirPanneauRepliques() {
  const list = ALFRED_CONFIG.REPLIQUES_FR; // l'index est commun aux listes FR et NL

  function renderCol(colId, acteNum) {
    const col = document.getElementById(colId);
    if (!col) return;
    col.innerHTML = '';
    const ligneTitre = document.createElement('div');
    ligneTitre.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
    const titre = document.createElement('span');
    titre.textContent = 'Acte ' + acteNum;
    titre.style.cssText = 'color:rgba(255,255,255,.3);font-size:8px;letter-spacing:2px;text-transform:uppercase;';
    ligneTitre.appendChild(titre);
    // Un peu plus mis en avant (pastille + libellé texte, pas juste un
    // triangle discret) — remonté en test live comme trop effacé, et un
    // petit message texte reste plus clair qu'une icône seule.
    const btnJouerActe = document.createElement('span');
    btnJouerActe.textContent = '▶ Jouer';
    btnJouerActe.title = 'Jouer tout l\'acte ' + acteNum;
    btnJouerActe.style.cssText = 'color:#14b0bd;background:rgba(20,176,189,.15);border:1px solid rgba(20,176,189,.35);border-radius:10px;font-size:9px;font-weight:600;cursor:pointer;padding:2px 8px;';
    btnJouerActe.onmouseover = () => { btnJouerActe.style.background = 'rgba(20,176,189,.3)'; };
    btnJouerActe.onmouseout  = () => { btnJouerActe.style.background = 'rgba(20,176,189,.15)'; };
    btnJouerActe.onclick = () => {
      document.getElementById('alfred-repliques-panel').style.display = 'none';
      if (typeof lectureAutomatique === 'function') lectureAutomatique({ acte: acteNum });
    };
    ligneTitre.appendChild(btnJouerActe);
    col.appendChild(ligneTitre);

    list.forEach((r, idx) => {
      if (r.acte !== acteNum) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:2px;border-top:2px solid transparent;';

      // Poignée de glisser-déposer — permet de réordonner les répliques au
      // sein d'un même acte, sans interférer avec le clic (jouer) ou ✎ (éditer).
      const handle = document.createElement('span');
      handle.textContent = '⠿';
      handle.title = 'Glisser pour réordonner';
      handle.draggable = true;
      handle.style.cssText = 'color:rgba(255,255,255,.3);font-size:11px;cursor:grab;padding:2px 4px;';
      handle.onmouseover = () => { handle.style.color = '#fff'; };
      handle.onmouseout  = () => { handle.style.color = 'rgba(255,255,255,.3)'; };
      handle.ondragstart = (e) => {
        dragSourceIdx = idx;
        e.dataTransfer.effectAllowed = 'move';
        row.style.opacity = '0.4';
      };
      handle.ondragend = () => { row.style.opacity = '1'; };

      row.ondragover = (e) => {
        if (dragSourceIdx === null || list[dragSourceIdx].acte !== acteNum) return;
        e.preventDefault();
        row.style.borderTop = '2px solid #14b0bd';
      };
      row.ondragleave = () => { row.style.borderTop = '2px solid transparent'; };
      row.ondrop = (e) => {
        e.preventDefault();
        row.style.borderTop = '2px solid transparent';
        if (dragSourceIdx === null || dragSourceIdx === idx) return;
        if (list[dragSourceIdx].acte !== acteNum) return; // pas de réordre entre actes différents
        deplacerReplique(dragSourceIdx, idx);
        dragSourceIdx = null;
      };

      const btn = document.createElement('div');
      btn.textContent = r.label;
      btn.style.cssText = 'flex:1;color:rgba(255,255,255,.75);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;transition:background .15s,color .15s;';
      btn.onmouseover = () => { btn.style.background='rgba(255,255,255,.12)'; btn.style.color='#fff'; };
      btn.onmouseout  = () => { btn.style.background='transparent'; btn.style.color='rgba(255,255,255,.75)'; };
      btn.onclick = async () => {
        if (typeof secoursIdx !== 'undefined') secoursIdx = idx;
        document.getElementById('alfred-repliques-panel').style.display = 'none';
        // La création de dossier (Acte 2) est un vrai enchaînement d'écrans —
        // cliquer directement sur une étape du milieu (ex: "CreationBien")
        // sans être passé par les précédentes échouerait sur le mauvais
        // écran. On rejoue d'abord les actions (sans les parler) des étapes
        // manquantes avant de jouer normalement celle cliquée.
        if (typeof rattraperActe2SiBesoin === 'function') await rattraperActe2SiBesoin(idx);
        if (typeof jouerSecours === 'function') jouerSecours();
      };

      const editBtn = document.createElement('span');
      editBtn.textContent = '✎';
      editBtn.title = 'Modifier';
      editBtn.style.cssText = 'color:rgba(255,255,255,.4);font-size:11px;cursor:pointer;padding:4px;';
      editBtn.onmouseover = () => { editBtn.style.color = '#fff'; };
      editBtn.onmouseout  = () => { editBtn.style.color = 'rgba(255,255,255,.4)'; };
      editBtn.onclick = (e) => { e.stopPropagation(); ouvrirEditionRéplique(idx); };

      row.appendChild(handle);
      row.appendChild(btn);
      row.appendChild(editBtn);
      col.appendChild(row);
    });

    const addBtn = document.createElement('div');
    addBtn.textContent = '+ Ajouter';
    addBtn.style.cssText = 'color:rgba(255,255,255,.35);font-size:10px;padding:6px 8px;cursor:pointer;margin-top:4px;';
    addBtn.onmouseover = () => { addBtn.style.color = '#fff'; };
    addBtn.onmouseout  = () => { addBtn.style.color = 'rgba(255,255,255,.35)'; };
    addBtn.onclick = () => ouvrirEditionRéplique(null, acteNum);
    col.appendChild(addBtn);
  }
  renderCol('alfred-col-1', 1);
  renderCol('alfred-col-2', 2);
  renderCol('alfred-col-3', 3);
}

// ── Édition d'une réplique (FR + NL + action liée) ────────
function creerPanneauEdition() {
  if (document.getElementById('alfred-edition-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'alfred-edition-panel';
  panel.style.cssText = `
    display:none; position:fixed;
    top:50%; left:50%; transform:translate(-50%,-50%);
    background:rgba(5,69,97,0.99); border-radius:14px;
    padding:20px; z-index:500; width:460px; max-width:90vw;
    box-shadow:0 8px 48px rgba(0,0,0,0.6);
    font-family:sans-serif;
  `;
  document.body.appendChild(panel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') panel.style.display = 'none';
  });
}

// Affiche un retour visuel après une tentative de sauvegarde en ligne
async function afficherStatutSauvegarde(resultatPromise, statusId) {
  const status = document.getElementById(statusId || 'alfred-script-status');
  const resultat = await resultatPromise;
  if (resultat.ok) {
    if (status) {
      status.textContent = '✓ Synchronisé';
      status.style.color = 'rgba(120,255,150,.8)';
      setTimeout(() => { if (status) status.textContent = ''; }, 4000);
    }
    return resultat;
  }
  // Échec de synchro en ligne : un petit texte de quelques secondes est trop
  // facile à manquer (le panneau se ferme souvent au même moment) — alerte
  // bloquante en plus, pour que ça ne passe jamais inaperçu. C'est ce qui
  // manquait probablement quand une modification "semblait" enregistrée
  // (mise à jour locale immédiate) sans être réellement partagée en ligne.
  if (resultat.wrongPassword) {
    if (status) { status.textContent = '✗ Mot de passe incorrect'; status.style.color = 'rgba(255,120,120,.8)'; }
    alert('Mot de passe incorrect : la modification N\'A PAS été partagée en ligne (gardée en local sur cet appareil seulement). Réessaie pour ressaisir le bon mot de passe.');
  } else if (resultat.conflict && resultat.annule) {
    if (status) { status.textContent = '⚠ Annulé (gardé en local seulement)'; status.style.color = 'rgba(255,200,120,.8)'; }
  } else {
    if (status) { status.textContent = '⚠ Enregistré localement (hors-ligne)'; status.style.color = 'rgba(255,200,120,.8)'; }
    alert('La modification N\'A PAS pu être partagée en ligne (réseau indisponible ou mot de passe non fourni) — elle reste seulement enregistrée sur cet appareil.');
  }
  if (status) setTimeout(() => { if (status) status.textContent = ''; }, 4000);
  return resultat;
}

// ── Panneau « Données du dossier démo » ───────────────────
function creerPanneauDonneesCreation() {
  if (document.getElementById('alfred-donnees-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'alfred-donnees-panel';
  panel.style.cssText = `
    display:none; position:fixed;
    top:50%; left:50%; transform:translate(-50%,-50%);
    background:rgba(5,69,97,0.99); border-radius:14px;
    padding:20px; z-index:500; width:420px; max-width:90vw;
    max-height:85vh; overflow-y:auto;
    box-shadow:0 8px 48px rgba(0,0,0,0.6);
    font-family:sans-serif;
  `;
  document.body.appendChild(panel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.style.display !== 'none') panel.style.display = 'none';
  });
}

// ── Panneau « Voix d'Alfred » ─────────────────────────────
// Choix de voix Google TTS purement local (préférence par appareil, pas de
// synchro partagée — contrairement au script/données démo, ça ne concerne
// que la personne qui teste/anime la démo sur cet écran-là).
function creerPanneauVoix() {
  if (document.getElementById('alfred-voix-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'alfred-voix-panel';
  panel.style.cssText = `
    display:none; position:fixed;
    top:50%; left:50%; transform:translate(-50%,-50%);
    background:rgba(5,69,97,0.99); border-radius:14px;
    padding:20px; z-index:500; width:380px; max-width:90vw;
    max-height:85vh; overflow-y:auto;
    box-shadow:0 8px 48px rgba(0,0,0,0.6);
    font-family:sans-serif;
  `;
  document.body.appendChild(panel);
}

// Panneau volontairement simple : peu de jargon visible (pas de "Chirp3
// HD", "Wavenet", "moteur"...) — pensé pour quelqu'un qui n'a aucune
// raison de connaître ce vocabulaire. Cloud TTS existe toujours dans le
// code comme repli automatique et silencieux si Gemini échoue (voir
// obtenirAudio dans alfred-voice.js), mais n'est plus un choix à l'écran.
function ouvrirPanneauVoix() {
  const panel = document.getElementById('alfred-voix-panel');
  if (!panel || typeof GEMINI_VOIX_CATALOGUE === 'undefined') return;
  panel.innerHTML = '';

  const enTete = document.createElement('div');
  enTete.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;';
  const titre = document.createElement('div');
  titre.textContent = 'Voix d\'Alfred';
  titre.style.cssText = 'color:rgba(255,255,255,.4);font-size:9px;letter-spacing:2px;text-transform:uppercase;';
  enTete.appendChild(titre);
  const statutVoix = document.createElement('div');
  statutVoix.id = 'alfred-voix-status';
  statutVoix.style.cssText = 'color:rgba(255,255,255,.4);font-size:9px;';
  enTete.appendChild(statutVoix);
  // Une fois un ton/une voix enregistrés, les mises à jour du ton par
  // défaut poussées dans le code (ex: affinages successifs suite aux
  // retours) ne s'appliquent plus jamais tant que ce bouton n'a pas été
  // utilisé — c'est ce qui causait "pourquoi ça affiche encore l'ancien
  // texte ?" après plusieurs itérations du prompt. Republie aussi le reset
  // en ligne, sinon la prochaine synchro ré-appliquerait l'ancienne
  // version par-dessus (même bug que celui corrigé sur le script).
  const btnReset = document.createElement('span');
  btnReset.textContent = '↺';
  btnReset.title = 'Revenir à la voix/au ton par défaut (les plus récents), pour tout le monde';
  btnReset.style.cssText = 'color:rgba(255,255,255,.35);font-size:13px;cursor:pointer;';
  btnReset.onclick = () => {
    localStorage.removeItem(ALFRED_GEMINI_TON_KEY);
    localStorage.removeItem(ALFRED_GEMINI_VOIX_KEY);
    localStorage.removeItem(ALFRED_VOIX_MOTEUR_KEY);
    ouvrirPanneauVoix();
    if (typeof sauvegarderAvecGestionConflit === 'function') {
      afficherStatutSauvegarde(sauvegarderAvecGestionConflit(), 'alfred-voix-status');
    }
  };
  enTete.appendChild(btnReset);
  panel.appendChild(enTete);

  panel.appendChild(champLabel('Voix'));
  const selectVoix = document.createElement('select');
  selectVoix.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:#0a3b52;color:#fff;font-size:12px;margin-bottom:14px;';
  GEMINI_VOIX_CATALOGUE.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id; opt.textContent = v.label;
    opt.style.cssText = 'background:#0a3b52;color:#fff;';
    selectVoix.appendChild(opt);
  });
  selectVoix.value = voixGeminiActuelle();
  panel.appendChild(selectVoix);

  panel.appendChild(champLabel('Ton'));
  const taTon = document.createElement('textarea');
  taTon.value = tonGemini();
  taTon.rows = 4;
  taTon.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:11px;font-family:sans-serif;resize:vertical;margin-bottom:14px;';
  panel.appendChild(taTon);

  const zoneTest = document.createElement('div');
  zoneTest.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
  const btnTesterFR = document.createElement('button');
  btnTesterFR.textContent = '▶ Tester en FR';
  const btnTesterNL = document.createElement('button');
  btnTesterNL.textContent = '▶ Tester en NL';
  [btnTesterFR, btnTesterNL].forEach(btn => {
    btn.style.cssText = 'flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:12px;cursor:pointer;';
  });
  function testerVoix(btn, texte, langue) {
    return async () => {
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = '… génération';
      try {
        const audio = await genererAudioGemini(texte, selectVoix.value, taTon.value, langue);
        await audio.play();
      } catch (e) {
        console.warn('[Alfred Voice] Test de voix échoué:', e);
        alert(e && e.quotaExceeded
          ? e.message
          : 'Cette voix n\'a pas pu être générée (réseau, ou clé API pas encore active côté serveur). Regarde la console pour le détail.');
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    };
  }
  btnTesterFR.onclick = testerVoix(btnTesterFR, "Bonjour, je suis Alfred. Voici un exemple de ma voix.", 'fr');
  btnTesterNL.onclick = testerVoix(btnTesterNL, "Goeiedag, ik ben Alfred. Dit is een voorbeeld van mijn stem.", 'nl');
  zoneTest.appendChild(btnTesterFR);
  zoneTest.appendChild(btnTesterNL);
  panel.appendChild(zoneTest);

  const boutons = document.createElement('div');
  boutons.style.cssText = 'display:flex;gap:8px;';

  // "Enregistrer" fait tout en une seule action : sauvegarde le choix, puis
  // précharge automatiquement tout le script (FR + NL) avec la nouvelle
  // voix/le nouveau ton, pour que la démo live ne rappelle plus jamais
  // l'API (Gemini TTS est plus lent qu'un TTS classique — pas gênant pour
  // un script connu à l'avance, tant que c'est généré une fois avant,
  // jamais ligne par ligne en direct). Coût négligeable même à chaque
  // sauvegarde : quelques dizaines de centimes pour tout le script, et
  // presque rien si la voix/le ton n'ont pas changé (déjà en cache).
  const btnSave = document.createElement('button');
  btnSave.textContent = 'Enregistrer';
  btnSave.style.cssText = 'flex:1;padding:10px;border-radius:8px;border:none;background:#14b0bd;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
  btnSave.onclick = async () => {
    localStorage.setItem(ALFRED_VOIX_MOTEUR_KEY, 'gemini');
    localStorage.setItem(ALFRED_GEMINI_VOIX_KEY, selectVoix.value);
    localStorage.setItem(ALFRED_GEMINI_TON_KEY, taTon.value);

    // Partage en ligne (même mot de passe que le script) — pour que Cyril
    // (ou n'importe qui d'autre) reçoive ce réglage automatiquement à sa
    // prochaine ouverture, sans devoir refaire les mêmes réglages.
    if (typeof sauvegarderAvecGestionConflit === 'function') {
      afficherStatutSauvegarde(sauvegarderAvecGestionConflit(), 'alfred-voix-status');
    }

    btnSave.disabled = true;
    btnCancel.style.display = 'none';
    const resultat = await prechargerScript(selectVoix.value, selectVoix.value, taTon.value, (fait, total) => {
      btnSave.textContent = `⏳ Préchargement ${fait}/${total}…`;
    });
    btnSave.disabled = false;

    panel.style.display = 'none';
    document.getElementById('alfred-repliques-panel').style.display = 'block';
    if (resultat.quotaDepasse) {
      alert(`Enregistré, mais le préchargement s'est arrêté en cours de route (${resultat.echecs}/${resultat.total} répliques manquantes) : quota Gemini gratuit dépassé pour aujourd'hui (100 requêtes/jour). Active la facturation sur le compte Google associé à la clé API (aistudio.google.com) pour lever cette limite, puis reclique "Enregistrer".`);
    } else if (resultat.echecs > 0) {
      alert(`Enregistré. Préchargement terminé avec ${resultat.echecs} échec(s) sur ${resultat.total} répliques — regarde la console pour le détail.`);
    }
  };

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Annuler';
  btnCancel.style.cssText = 'flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:transparent;color:rgba(255,255,255,.8);font-size:12px;cursor:pointer;';
  btnCancel.onclick = () => {
    panel.style.display = 'none';
    document.getElementById('alfred-repliques-panel').style.display = 'block';
  };

  boutons.appendChild(btnSave);
  boutons.appendChild(btnCancel);
  panel.appendChild(boutons);

  panel.style.display = 'block';
}

function champTexte(valeur, placeholder) {
  const input = document.createElement('input');
  input.value = valeur || '';
  if (placeholder) input.placeholder = placeholder;
  input.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:12px;';
  return input;
}

// Rafraîchit les champs affichés uniquement si le panneau est déjà ouvert
// (appelé après une synchro serveur en tâche de fond, sans forcer l'ouverture).
function remplirPanneauDonneesCreation() {
  const panel = document.getElementById('alfred-donnees-panel');
  if (!panel || panel.style.display === 'none') return;
  ouvrirPanneauDonneesCreation();
}

function ouvrirPanneauDonneesCreation() {
  const panel = document.getElementById('alfred-donnees-panel');
  if (!panel) return;
  const cfg = ALFRED_CONFIG.DOSSIER_CREATION_DEMO;
  panel.innerHTML = '';

  const titre = document.createElement('div');
  titre.textContent = 'Données du dossier démo (création automatique)';
  titre.style.cssText = 'color:rgba(255,255,255,.4);font-size:9px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;';
  panel.appendChild(titre);

  const champs = {};
  function ligne(label, cle, valeur, placeholder) {
    panel.appendChild(champLabel(label));
    const input = champTexte(valeur, placeholder);
    champs[cle] = input;
    panel.appendChild(input);
  }

  ligne('Code du dossier', 'code', cfg.code);
  ligne('Collaborateur en charge du dossier', 'collaborateur', cfg.collaborateur);
  ligne('Collaborateur administratif', 'collaborateur_administratif', cfg.collaborateur_administratif);
  ligne('Notaire en charge du dossier', 'notaire', cfg.notaire);
  ligne('Type de vendeur (physique ou morale)', 'vendeur_type', cfg.vendeur_type, 'physique / morale');
  ligne('Registre national — Vendeur (si physique)', 'vendeur_rn', cfg.vendeur_rn, '__.__.__-___.__');
  ligne('N° BCE — Vendeur (si morale)', 'vendeur_bce', cfg.vendeur_bce, '0653.910.157');
  // Pas de champ "Notaire du vendeur" : le séquencier indique que BIMBIMMO
  // est représenté par l'étude elle-même (coché sous "Mes clients" sur la
  // fiche du notaire déjà présent — champ "notaire" ci-dessus), pas par un
  // notaire externe recherché comme pour l'acquéreur.
  ligne('Registre national — Acquéreur', 'acquereur_rn', cfg.acquereur_rn, '__.__.__-___.__');
  ligne('Notaire de l’acquéreur', 'acquereur_notaire', cfg.acquereur_notaire);

  const sousTitreBien = document.createElement('div');
  sousTitreBien.textContent = 'Bien immobilier';
  sousTitreBien.style.cssText = 'color:rgba(255,255,255,.3);font-size:8px;letter-spacing:2px;text-transform:uppercase;margin-top:14px;';
  panel.appendChild(sousTitreBien);

  const champsBien = {};
  function ligneBien(label, cle, valeur, placeholder) {
    panel.appendChild(champLabel(label));
    const input = champTexte(valeur, placeholder);
    champsBien[cle] = input;
    panel.appendChild(input);
  }
  ligneBien('Type', 'type', cfg.bien.type);
  ligneBien('N° de parcelle', 'parcelle', cfg.bien.parcelle, '0419XP0000');
  ligneBien('Section', 'section', cfg.bien.section, 'A');
  ligneBien('Division', 'division', cfg.bien.division, '00141');
  ligneBien('Surface', 'surface', cfg.bien.surface);
  ligneBien('Revenu cadastral', 'revenu_cadastral', cfg.bien.revenu_cadastral);
  ligneBien('Rue', 'rue', cfg.bien.rue);
  ligneBien('N°', 'numero', cfg.bien.numero, '42');
  ligneBien('Commune', 'commune', cfg.bien.commune, 'Rechercher une commune par son nom ou son code postal');

  const boutons = document.createElement('div');
  boutons.style.cssText = 'display:flex;gap:8px;margin-top:16px;';

  const btnSave = document.createElement('button');
  btnSave.textContent = 'Enregistrer';
  btnSave.style.cssText = 'flex:1;padding:10px;border-radius:8px;border:none;background:#14b0bd;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
  btnSave.onclick = () => {
    Object.keys(champs).forEach(cle => { ALFRED_CONFIG.DOSSIER_CREATION_DEMO[cle] = champs[cle].value.trim(); });
    Object.keys(champsBien).forEach(cle => { ALFRED_CONFIG.DOSSIER_CREATION_DEMO.bien[cle] = champsBien[cle].value.trim(); });
    if (typeof sauvegarderDonneesCreationAvecGestionConflit === 'function') {
      afficherStatutSauvegarde(sauvegarderDonneesCreationAvecGestionConflit(), 'alfred-script-status');
    }
    panel.style.display = 'none';
    const repliques = document.getElementById('alfred-repliques-panel');
    if (repliques) repliques.style.display = 'block';
  };

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Annuler';
  btnCancel.style.cssText = 'flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:transparent;color:rgba(255,255,255,.8);font-size:12px;cursor:pointer;';
  btnCancel.onclick = () => {
    panel.style.display = 'none';
    const repliques = document.getElementById('alfred-repliques-panel');
    if (repliques) repliques.style.display = 'block';
  };

  boutons.appendChild(btnSave);
  boutons.appendChild(btnCancel);
  panel.appendChild(boutons);

  const btnReset = document.createElement('div');
  btnReset.textContent = '↺ Réinitialiser aux valeurs par défaut';
  btnReset.style.cssText = 'text-align:center;color:rgba(255,255,255,.4);font-size:10px;margin-top:12px;cursor:pointer;';
  btnReset.onmouseover = () => { btnReset.style.color = '#fff'; };
  btnReset.onmouseout  = () => { btnReset.style.color = 'rgba(255,255,255,.4)'; };
  btnReset.onclick = () => {
    if (!confirm('Réinitialiser les données du dossier démo, pour tout le monde ? Les modifications seront perdues.')) return;
    if (typeof reinitialiserDonneesCreation === 'function') reinitialiserDonneesCreation();
    ouvrirPanneauDonneesCreation();
    // Pousse aussi la remise à zéro en ligne, sinon la prochaine synchro
    // ré-appliquerait par-dessus l'ancienne version partagée (même bug que
    // celui corrigé sur le reset du script).
    if (typeof sauvegarderDonneesCreationAvecGestionConflit === 'function') {
      afficherStatutSauvegarde(sauvegarderDonneesCreationAvecGestionConflit(), 'alfred-script-status');
    }
  };
  panel.appendChild(btnReset);

  panel.style.display = 'block';
}

function champLabel(texte) {
  const l = document.createElement('label');
  l.textContent = texte;
  l.style.cssText = 'display:block;color:rgba(255,255,255,.5);font-size:9px;letter-spacing:1px;text-transform:uppercase;margin:10px 0 4px;';
  return l;
}

function ouvrirEditionRéplique(index, nouvelActe) {
  const panel = document.getElementById('alfred-edition-panel');
  if (!panel) return;
  document.getElementById('alfred-repliques-panel').style.display = 'none';

  const estNouveau = index === null || index === undefined;
  const rFR = estNouveau ? { acte: nouvelActe, label: '', texte: '', action: '' } : ALFRED_CONFIG.REPLIQUES_FR[index];
  const rNL = estNouveau ? { acte: nouvelActe, label: '', texte: '', action: '' } : ALFRED_CONFIG.REPLIQUES_NL[index];

  panel.innerHTML = '';

  const titre = document.createElement('div');
  titre.textContent = estNouveau ? 'Nouvelle réplique — Acte ' + nouvelActe : 'Modifier — ' + rFR.label;
  titre.style.cssText = 'color:rgba(255,255,255,.4);font-size:9px;letter-spacing:2px;text-transform:uppercase;';
  panel.appendChild(titre);

  panel.appendChild(champLabel('Nom (identifiant interne)'));
  const inputLabel = document.createElement('input');
  inputLabel.value = rFR.label;
  inputLabel.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:12px;';
  panel.appendChild(inputLabel);

  // Une réplique "groupée" (r.segments — plusieurs bouts de texte, chacun
  // avec sa propre action) ne peut pas être éditée correctement dans ce
  // panneau simple, pensé pour un texte + une action. On l'affiche quand
  // même (segments recollés) pour référence, mais on bloque l'enregistrement
  // pour ne pas écraser silencieusement les segments par un seul bloc.
  const estGroupee = !!(rFR.segments || rNL.segments);

  panel.appendChild(champLabel('Texte FR' + (estGroupee ? ' (réplique groupée — lecture seule)' : '')));
  const taFR = document.createElement('textarea');
  taFR.value = rFR.segments ? rFR.segments.map(s => s.texte).join('\n\n') : rFR.texte;
  taFR.rows = 4;
  taFR.disabled = estGroupee;
  taFR.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-family:sans-serif;resize:vertical;';
  panel.appendChild(taFR);

  panel.appendChild(champLabel('Texte NL' + (estGroupee ? ' (réplique groupée — lecture seule)' : '')));
  const taNL = document.createElement('textarea');
  taNL.value = rNL.segments ? rNL.segments.map(s => s.texte).join('\n\n') : rNL.texte;
  taNL.rows = 4;
  taNL.disabled = estGroupee;
  taNL.style.cssText = taFR.style.cssText;
  panel.appendChild(taNL);

  panel.appendChild(champLabel('Action déclenchée (optionnel)'));
  const select = document.createElement('select');
  select.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:#0a3b52;color:#fff;font-size:12px;';
  const optNone = document.createElement('option');
  optNone.value = ''; optNone.textContent = '— Aucune —';
  optNone.style.cssText = 'background:#0a3b52;color:#fff;';
  select.appendChild(optNone);
  // Plusieurs noms (FR/NL, alias historiques) pointent parfois vers la même
  // fonction d'action (ex: 'Parties' et 'Partijen' font la même chose) —
  // on ne garde qu'un nom par action réelle pour éviter les doublons.
  const actionsDispo = [];
  if (typeof DOM_ACTIONS !== 'undefined') {
    const dejaVues = new Set();
    Object.keys(DOM_ACTIONS).forEach(cle => {
      const fn = DOM_ACTIONS[cle];
      if (dejaVues.has(fn)) return;
      dejaVues.add(fn);
      actionsDispo.push(cle);
    });
  }
  actionsDispo.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    opt.style.cssText = 'background:#0a3b52;color:#fff;';
    select.appendChild(opt);
  });
  // Une réplique d'origine (sans champ `action` explicite) peut déjà être
  // reliée à une action via son `label` — on l'affiche pour que ce ne soit
  // pas invisible dans l'éditeur. Si ce label est un alias (ex: 'Partijen'),
  // on retombe sur le nom canonique retenu ci-dessus.
  const actionBrute = rFR.action || ((typeof DOM_ACTIONS !== 'undefined' && DOM_ACTIONS[rFR.label]) ? rFR.label : '');
  const actionImplicite = (actionBrute && typeof DOM_ACTIONS !== 'undefined')
    ? (actionsDispo.find(cle => DOM_ACTIONS[cle] === DOM_ACTIONS[actionBrute]) || actionBrute)
    : actionBrute;
  select.value = actionImplicite;
  panel.appendChild(select);

  const boutons = document.createElement('div');
  boutons.style.cssText = 'display:flex;gap:8px;margin-top:16px;';

  const btnSave = document.createElement('button');
  btnSave.textContent = 'Enregistrer';
  btnSave.style.cssText = 'flex:1;padding:10px;border-radius:8px;border:none;background:#14b0bd;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
  btnSave.onclick = () => {
    if (estGroupee) { alert('Réplique groupée : modifiable uniquement dans le code (alfred-brain.js).'); return; }
    const label = inputLabel.value.trim();
    if (!label) { alert('Le nom de la réplique est requis.'); return; }
    const action = select.value || undefined;
    const nouvelleFR = { acte: rFR.acte, label, texte: taFR.value.trim(), action };
    const nouvelleNL = { acte: rNL.acte, label, texte: taNL.value.trim(), action };
    if (!nouvelleFR.action) delete nouvelleFR.action;
    if (!nouvelleNL.action) delete nouvelleNL.action;

    if (estNouveau) {
      const idx = trouverIndexInsertion(ALFRED_CONFIG.REPLIQUES_FR, nouvelActe);
      ALFRED_CONFIG.REPLIQUES_FR.splice(idx, 0, nouvelleFR);
      ALFRED_CONFIG.REPLIQUES_NL.splice(idx, 0, nouvelleNL);
    } else {
      ALFRED_CONFIG.REPLIQUES_FR[index] = nouvelleFR;
      ALFRED_CONFIG.REPLIQUES_NL[index] = nouvelleNL;
    }
    if (typeof sauvegarderAvecGestionConflit === 'function') afficherStatutSauvegarde(sauvegarderAvecGestionConflit());
    panel.style.display = 'none';
    remplirPanneauRepliques();
    document.getElementById('alfred-repliques-panel').style.display = 'block';
  };

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Annuler';
  btnCancel.style.cssText = 'flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:transparent;color:rgba(255,255,255,.8);font-size:12px;cursor:pointer;';
  btnCancel.onclick = () => {
    panel.style.display = 'none';
    document.getElementById('alfred-repliques-panel').style.display = 'block';
  };

  boutons.appendChild(btnSave);
  boutons.appendChild(btnCancel);
  panel.appendChild(boutons);

  if (!estNouveau) {
    const btnDelete = document.createElement('div');
    btnDelete.textContent = 'Supprimer cette réplique';
    btnDelete.style.cssText = 'text-align:center;color:rgba(255,120,120,.7);font-size:11px;margin-top:12px;cursor:pointer;';
    btnDelete.onmouseover = () => { btnDelete.style.color = 'rgba(255,120,120,1)'; };
    btnDelete.onmouseout  = () => { btnDelete.style.color = 'rgba(255,120,120,.7)'; };
    btnDelete.onclick = () => {
      if (!confirm('Supprimer « ' + rFR.label + ' » du script (FR et NL) ?')) return;
      ALFRED_CONFIG.REPLIQUES_FR.splice(index, 1);
      ALFRED_CONFIG.REPLIQUES_NL.splice(index, 1);
      if (typeof sauvegarderAvecGestionConflit === 'function') afficherStatutSauvegarde(sauvegarderAvecGestionConflit());
      panel.style.display = 'none';
      remplirPanneauRepliques();
      document.getElementById('alfred-repliques-panel').style.display = 'block';
    };
    panel.appendChild(btnDelete);
  }

  panel.style.display = 'block';
}

// Trouve l'index où insérer une nouvelle réplique pour garder les actes groupés
function trouverIndexInsertion(list, acte) {
  let dernier = -1;
  list.forEach((r, i) => { if (r.acte === acte) dernier = i; });
  if (dernier !== -1) return dernier + 1;
  const idxActeSuivant = list.findIndex(r => r.acte > acte);
  return idxActeSuivant === -1 ? list.length : idxActeSuivant;
}

// ── Init UI ───────────────────────────────────────────────
function initAlfredUI() {
  if (document.getElementById('alfred-left-panel')) return;

  const style = document.createElement('style');
  style.id = 'alfred-styles';
  style.textContent = `
    body.alfred-active { margin:0; padding:0; overflow:hidden; }
    #alfred-wrapper { display:flex; height:100vh; width:100vw; position:fixed; top:0; left:0; z-index:400; pointer-events:none; }
    #alfred-left-panel {
      width:0; min-width:0; height:100vh;
      background:linear-gradient(180deg,#054561 0%,#14b0bd 50%,#ebe0c4 100%);
      display:flex; flex-direction:column; align-items:center;
      justify-content:center;
      padding:20px 0 16px;
      box-shadow:4px 0 32px rgba(5,69,97,.35);
      overflow:hidden; pointer-events:all; position:relative; flex-shrink:0;
      transition:width .6s cubic-bezier(.32,.72,0,1), min-width .6s cubic-bezier(.32,.72,0,1), padding .6s cubic-bezier(.32,.72,0,1);
    }
    #alfred-left-panel.visible { width:270px; min-width:270px; padding:20px 16px 16px; }
    #alfred-logo {
      color:rgba(255,255,255,.7); font-size:9px; font-weight:700;
      letter-spacing:2.5px; margin-bottom:20px; text-align:center;
      white-space:nowrap; opacity:0; transition:opacity .4s ease .3s;
      font-family:-apple-system,sans-serif;
    }
    #alfred-left-panel.visible #alfred-logo { opacity:1; }
    .alfred-dot { width:6px; height:6px; border-radius:50%; background:#14b0bd; }
    .alfred-z { position:absolute; font-weight:800; opacity:0; font-family:sans-serif; }
    #alfred-state-lbl {
      color:rgba(255,255,255,.4); font-size:8px; letter-spacing:1.5px;
      text-transform:uppercase; margin-top:12px; text-align:center; font-family:sans-serif;
    }
    #alfred-transcript {
      font-size:10px; color:rgba(255,255,255,.5); font-style:italic;
      text-align:center; margin-top:8px; min-height:13px; width:100%;
      font-family:sans-serif; padding:0 4px; box-sizing:border-box;
    }
    #alfred-vol-wrap { width:100%; height:2px; background:rgba(255,255,255,.1); border-radius:1px; margin-top:16px; overflow:hidden; }
    #alfred-vol-bar { height:100%; width:0%; background:rgba(255,255,255,.6); border-radius:1px; transition:width .04s linear; }
    #alfred-mic-btn {
      margin-top:16px; background:rgba(255,255,255,.15); color:rgba(255,255,255,.9);
      border:1px solid rgba(255,255,255,.3); border-radius:20px; padding:10px 16px;
      font-size:12px; font-weight:600; cursor:pointer; width:100%;
      transition:background .2s,transform .15s; font-family:sans-serif;
    }
    #alfred-mic-btn:hover { background:rgba(255,255,255,.25); transform:translateY(-1px); }
    #alfred-mic-btn.listening { background:rgba(255,255,255,.9); color:#054561; animation:alfred-pulse-mic 1.2s ease-in-out infinite; }
    #alfred-langue-lbl {
      font-size:9px; color:rgba(255,255,255,.3); margin-top:10px;
      cursor:pointer; transition:color .2s; font-family:sans-serif; user-select:none;
    }
    #alfred-langue-lbl:hover { color:rgba(255,255,255,.7); }
    #alfred-secours {
      position:absolute; bottom:10px; left:0; right:0; text-align:center;
      font-size:7px; color:rgba(255,255,255,.1); transition:color .3s;
      font-family:sans-serif; cursor:default;
    }
    #alfred-secours:hover { color:rgba(255,255,255,.45); }
    #alfred-site-content { flex:1; height:100vh; overflow:auto; pointer-events:all; min-width:0; }

    @keyframes alfred-breathe {
      0%,100% { transform:translateY(0) scale(1); }
      50%      { transform:translateY(-6px) scale(1.018); }
    }
    @keyframes alfred-shadow-breathe {
      0%,100% { width:160px; height:22px; opacity:1; }
      50%      { width:130px; height:14px; opacity:.5; }
    }
    @keyframes alfred-sway {
      0%,100% { transform:rotate(-2.5deg); }
      50%      { transform:rotate(2.5deg); }
    }
    @keyframes alfred-talk-vib {
      0%   { transform:translateX(-.7px); }
      100% { transform:translateX(.7px); }
    }
    @keyframes alfred-sleep {
      0%,100% { transform:translateY(0) rotate(0deg); }
      50%      { transform:translateY(6px) rotate(.4deg); }
    }
    @keyframes alfred-shadow-sleep {
      0%,100% { width:160px; opacity:.35; }
      50%      { width:175px; opacity:.18; }
    }
    @keyframes alfred-eye-lr   { 0%,100%{transform:translateX(-8px);} 50%{transform:translateX(8px);} }
    @keyframes alfred-blink    { 0%,100%{transform:scaleY(1);} 50%{transform:scaleY(.06);} }
    @keyframes alfred-dot-pop  { 0%,100%{opacity:0;transform:scale(.5);} 50%{opacity:1;transform:translateY(-3px) scale(1.1);} }
    @keyframes alfred-float-z  { 0%{opacity:0;transform:translate(0,0)rotate(-8deg);} 20%{opacity:.8;} 100%{opacity:0;transform:translate(14px,-30px)rotate(14deg);} }
    @keyframes alfred-pulse-mic{ 0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.25);} 50%{box-shadow:0 0 0 8px rgba(255,255,255,.04);} }
  `;
  document.head.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.id = 'alfred-wrapper';

  const left = document.createElement('div');
  left.id = 'alfred-left-panel';
  left.innerHTML = `
    <div id="alfred-logo">ALFRED · WELLNOT</div>
    ${ALFRED_SVG}
    <div id="alfred-state-lbl">EN ATTENTE</div>
    <div id="alfred-transcript"></div>
    <div id="alfred-vol-wrap"><div id="alfred-vol-bar"></div></div>
    <button id="alfred-mic-btn" onclick="toggleMic()">🎤 Parler</button>
    <div id="alfred-langue-lbl" onclick="toggleLangue()">🇧🇪 FR</div>
    <div id="alfred-secours">← →</div>
  `;

  const siteContent = document.createElement('div');
  siteContent.id = 'alfred-site-content';
  while (document.body.firstChild) siteContent.appendChild(document.body.firstChild);
  wrapper.appendChild(left);
  wrapper.appendChild(siteContent);
  document.body.appendChild(wrapper);
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;';
  document.body.classList.add('alfred-active');

  requestAnimationFrame(() => setTimeout(() => left.classList.add('visible'), 50));

  creerSousTitres();
  creerPanneauRepliques();
  creerPanneauEdition();
  creerPanneauDonneesCreation();
  creerPanneauVoix();
  startBlinking();
  startEyeLerp();
  resetSleepTimer();
  trackMouse();

  setTimeout(() => {
    setAlfredState('idle');
    // Pas de message vocal ici — la vraie première réplique du script
    // commence déjà par "Bonjour", en dire un second à froid au chargement
    // sonnait comme une répétition avant même le début du script.
    console.log('[Alfred] Prêt.');
  }, 700);
}

// ── États Alfred ──────────────────────────────────────────
function setAlfredState(state) {
  curState = state;
  const wrap   = document.getElementById('alfred-avatar-wrap');
  const shadow = document.getElementById('alfred-shadow-ground');
  const ext    = document.getElementById('alfred-extrusion');
  const body   = document.getElementById('alfred-body-main');
  const eyeL   = document.getElementById('alfred-eye-l');
  const eyeR   = document.getElementById('alfred-eye-r');
  const dots   = document.getElementById('alfred-dots');
  const zzz    = document.getElementById('alfred-zzz');
  const lbl    = document.getElementById('alfred-state-lbl');
  const lids   = document.getElementById('alfred-lids');
  const mouth  = document.getElementById('alfred-mouth');
  const mouthT = document.getElementById('alfred-mouth-talk');

  if (wrap)   { wrap.style.animation='none'; void wrap.offsetWidth; }
  if (shadow) { shadow.style.animation='none'; shadow.style.width='160px'; shadow.style.opacity='1'; }
  if (ext)    { ext.style.opacity='1'; }
  if (body)   { body.style.animation='none'; void body.offsetWidth; body.style.transformOrigin='189.9px 191.74px'; }
  if (eyeL)   { eyeL.style.animation='none'; eyeL.style.transform=''; eyeL.style.opacity='1'; eyeL.style.transition=''; }
  if (eyeR)   { eyeR.style.animation='none'; eyeR.style.transform=''; eyeR.style.opacity='1'; eyeR.style.transition=''; }
  if (dots)   dots.style.opacity='0';
  if (zzz)    zzz.style.opacity='0';
  if (lids)   lids.style.display='none';
  if (mouth)  { mouth.style.display='block'; mouth.setAttribute('d','M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13'); }
  if (mouthT) { mouthT.style.display='none'; mouthT.setAttribute('ry','0'); }

  const labels = { idle:'EN ATTENTE', think:'RÉFLEXION...', talk:'EN TRAIN DE PARLER', sleep:'VEILLE' };
  if (lbl) lbl.textContent = labels[state] || '';

  switch(state) {
    case 'idle':
      if (wrap)   wrap.style.animation   = 'alfred-breathe 4s ease-in-out infinite';
      if (shadow) shadow.style.animation = 'alfred-shadow-breathe 4s ease-in-out infinite';
      resetSleepTimer();
      break;

    case 'think':
      if (body) { body.style.transformOrigin='189.9px 320px'; body.style.animation='alfred-sway 1.4s ease-in-out infinite'; }
      if (eyeL) eyeL.style.animation = 'alfred-eye-lr 1.4s ease-in-out infinite';
      if (eyeR) eyeR.style.animation = 'alfred-eye-lr 1.4s ease-in-out infinite';
      if (dots) {
        dots.style.opacity='1';
        ['alfred-dot1','alfred-dot2','alfred-dot3'].forEach((id,i) => {
          const d = document.getElementById(id);
          if (d) d.style.animation = `alfred-dot-pop 1.1s ease-in-out ${i*.22}s infinite`;
        });
      }
      break;

    case 'talk':
      if (wrap)   wrap.style.animation = 'alfred-talk-vib .12s ease-in-out infinite alternate';
      if (mouth)  mouth.style.display  = 'none';
      if (mouthT) mouthT.style.display = 'block';
      clearInterval(talkTick);
      talkTick = setInterval(() => {
        if (!mouthT) return;
        const open = Math.random() > 0.4;
        mouthT.setAttribute('ry', open ? (3+Math.random()*9).toFixed(1) : '1');
        mouthT.setAttribute('cy', open ? '130' : '128');
      }, 120);
      break;

    case 'sleep':
      if (wrap)   wrap.style.animation   = 'alfred-sleep 5s ease-in-out infinite';
      if (shadow) shadow.style.animation = 'alfred-shadow-sleep 5s ease-in-out infinite';
      if (ext)    ext.style.opacity      = '0.3';
      if (eyeL)   { eyeL.style.transition='opacity .4s ease'; eyeL.style.opacity='0'; }
      if (eyeR)   { eyeR.style.transition='opacity .4s ease'; eyeR.style.opacity='0'; }
      if (mouth)  mouth.setAttribute('d','M163,130 Q189,132 216,130');
      setTimeout(() => { if (lids && curState==='sleep') lids.style.display='block'; }, 400);
      if (zzz) {
        zzz.style.opacity='1';
        zzz.querySelectorAll('.alfred-z').forEach((z,i) => {
          z.style.animation = `alfred-float-z 2.6s ease-in-out ${i*.75}s infinite`;
        });
      }
      break;
  }
}

function startBlinking() {
  function blink() {
    if (curState === 'idle') {
      const eL = document.getElementById('alfred-eye-l');
      const eR = document.getElementById('alfred-eye-r');
      if (eL && eR) {
        eL.style.animation = 'alfred-blink .18s ease-in-out';
        eR.style.animation = 'alfred-blink .18s ease-in-out .05s';
        setTimeout(() => {
          if (curState==='idle') { eL.style.animation='none'; eR.style.animation='none'; }
        }, 250);
      }
    }
    setTimeout(blink, 2500 + Math.random()*4500);
  }
  setTimeout(blink, 2000);
}

function trackMouse() {
  document.addEventListener('mousemove', e => {
    if (curState !== 'idle') return;
    const svg = document.getElementById('alfred-svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    eyeTargetX = Math.max(-8, Math.min(8,  (e.clientX-(rect.left+rect.width/2))/30));
    eyeTargetY = Math.max(-4, Math.min(4,  (e.clientY-(rect.top+rect.height*.22))/45));
    resetSleepTimer();
  });
  document.addEventListener('keydown', resetSleepTimer);
  document.addEventListener('click',   resetSleepTimer);
}

function startEyeLerp() {
  function lerp() {
    if (curState === 'idle') {
      eyeCurX += (eyeTargetX - eyeCurX) * .12;
      eyeCurY += (eyeTargetY - eyeCurY) * .12;
      const eL = document.getElementById('alfred-eye-l');
      const eR = document.getElementById('alfred-eye-r');
      if (eL) eL.style.transform = `translate(${eyeCurX.toFixed(2)}px,${eyeCurY.toFixed(2)}px)`;
      if (eR) eR.style.transform = `translate(${eyeCurX.toFixed(2)}px,${eyeCurY.toFixed(2)}px)`;
    }
    rafEyes = requestAnimationFrame(lerp);
  }
  rafEyes = requestAnimationFrame(lerp);
}

function resetSleepTimer() {
  clearTimeout(sleepTimer);
  if (curState === 'sleep') {
    const mouth = document.getElementById('alfred-mouth');
    if (mouth) mouth.setAttribute('d','M189.28,136.79c-6.31,0-13.32-1.49-20.51-6.13-2.45-1.58-3.24-4.91-1.58-7.36,1.58-2.45,4.91-3.15,7.36-1.58,15.07,9.64,30.23.35,30.85,0,2.45-1.58,5.78-.79,7.36,1.66s.88,5.78-1.58,7.36c-.61.35-9.73,6.13-21.91,6.13');
    setAlfredState('idle');
  }
  sleepTimer = setTimeout(() => {
    if (curState==='idle') setAlfredState('sleep');
  }, (ALFRED_CONFIG?.SLEEP_APRES || 30) * 1000);
}

// ── Helpers ───────────────────────────────────────────────
function showBubble(text)    { afficherSousTitres(text); }
function showTranscript(t)   { const el=document.getElementById('alfred-transcript'); if(el) el.textContent=t||''; }
function updateVolBar(amp)   { const b=document.getElementById('alfred-vol-bar'); if(b) b.style.width=(amp*100)+'%'; }
function updateMicBtn(on)    { const b=document.getElementById('alfred-mic-btn'); if(!b)return; b.textContent=on?'⏹ Stop':'🎤 Parler'; b.classList.toggle('listening',on); }
function toggleMic()         { if(typeof isListening!=='undefined'&&isListening) recognition?.stop(); else if(typeof startListening==='function') startListening(); }
function toggleLangue()      { if(typeof switchLangue==='function') switchLangue(currentLangue==='fr'?'nl':'fr'); }
function addToHistory(w,t)   { console.log(`%c[${w.toUpperCase()}]%c ${t.substring(0,100)}`,`color:${w==='alfred'?'#14b0bd':'#888'};font-weight:bold`,'color:inherit'); }
function updateSecoursLabel(label,acte,idx,total) {
  const el=document.getElementById('alfred-secours');
  if(el){ el.textContent=`A${acte} · ${label} · ${idx}/${total}`; setTimeout(()=>{ if(el) el.textContent='← →'; },4000); }
}

initAlfredUI();