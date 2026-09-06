// === ALFRED UI ===

let sleepTimer = null;
let eyeTargetX = 0, eyeTargetY = 0;
let eyeCurX    = 0, eyeCurY    = 0;
let rafEyes    = null;

// Avatar d'Alfred — REDESSINÉ le 05/09 : le petit robot proposé par Cyril
// (tête arrondie à visière sombre, yeux cyan lumineux, corps blanc à accents
// teal, deux bras, "Alfred" sur le torse), redessiné en SVG à partir de son
// illustration (pixels, donc pas animable telle quelle). Les repères
// utilisés par tout le reste du code sont conservés à l'identique
// (alfred-svg, alfred-body-main, alfred-eye-l/-r, alfred-eye-l-cercle/
// -ferme, alfred-lids, alfred-mouth, alfred-mouth-talk) : clignement,
// regard qui suit/balaye, bouche pilotée par le volume réel de l'audio,
// clin d'œil, sommeil — tout continue de marcher. Nouveaux groupes animés
// en plus : alfred-head (hochements en parlant) et alfred-arm-l/-r (bras
// qui bougent), voir setAlfredState et animateMouth.
// Coordonnées de la bouche (viewBox 400x470) — lues aussi par
// animateMouth/resetMouth (alfred-voice.js) et setAlfredState/resetSleepTimer
// ci-dessous, pour ne jamais recoder ces chiffres à plusieurs endroits.
const ALFRED_BOUCHE_CX = 200;
const ALFRED_BOUCHE_CY = 153;
const ALFRED_BOUCHE_RX = 14;
const ALFRED_BOUCHE_SOURIRE_D = 'M188,150 Q200,159 212,150';
const ALFRED_BOUCHE_DORMIR_D  = 'M190,154 Q200,155 210,154';

const ALFRED_SVG = `
<div id="alfred-avatar-outer" style="position:relative;width:220px;height:250px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">

  <div id="alfred-shadow-ground" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:160px;height:22px;background:radial-gradient(ellipse,rgba(5,69,97,.5) 0%,transparent 70%);border-radius:50%;pointer-events:none;"></div>

  <div id="alfred-zzz" style="position:absolute;top:10px;right:10px;pointer-events:none;opacity:0;transition:opacity .4s;z-index:10;">
    <span class="alfred-z" style="font-size:12px;position:absolute;right:0;top:36px;color:rgba(5,69,97,.75);">z</span>
    <span class="alfred-z" style="font-size:16px;position:absolute;right:10px;top:18px;color:rgba(5,69,97,.75);">z</span>
    <span class="alfred-z" style="font-size:20px;position:absolute;right:20px;top:0;color:rgba(5,69,97,.75);">Z</span>
  </div>

  <div id="alfred-avatar-wrap" style="position:relative;width:190px;height:223px;overflow:visible;">
    <svg id="alfred-svg" viewBox="0 0 400 470" xmlns="http://www.w3.org/2000/svg"
             style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 10px 10px rgba(5,45,58,.22));">
      <defs>
        <linearGradient id="alfred-visiere" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stop-color="#0d5563"/>
          <stop offset="0.55" stop-color="#136e7c"/>
          <stop offset="1" stop-color="#1b8590"/>
        </linearGradient>
        <linearGradient id="alfred-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1e8c96"/>
          <stop offset="1" stop-color="#0f5e6b"/>
        </linearGradient>
        <linearGradient id="alfred-cou" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#1a8590"/>
          <stop offset="1" stop-color="#116370"/>
        </linearGradient>
        <radialGradient id="alfred-oeil" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stop-color="#6ffff0"/>
          <stop offset="1" stop-color="#17e3d2"/>
        </radialGradient>
        <clipPath id="alfred-clip-corps">
          <path d="M124,250 C124,218 154,210 200,210 C246,210 276,218 276,250 C284,308 270,374 236,398 C218,408 182,408 164,398 C130,374 116,308 124,250 Z"/>
        </clipPath>
        <linearGradient id="alfred-ombre-corps" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="1" stop-color="#d9e0e3" stop-opacity="0.9"/>
        </linearGradient>
        <clipPath id="alfred-clip-tete">
          <rect x="88" y="48" width="224" height="146" rx="46"/>
        </clipPath>
      </defs>

      <g id="alfred-body-main" style="transform-origin:200px 235px;">

        <!-- ── Bras (derrière le corps) ─────────────────────────── -->
        <g id="alfred-arm-l" style="transform-origin:90px 236px;">
          <g transform="rotate(-16 90 236)">
            <rect x="64" y="228" width="50" height="156" rx="25" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
            <rect x="72" y="254" width="24" height="110" rx="12" fill="url(#alfred-teal)"/>
          </g>
        </g>
        <g id="alfred-arm-r" style="transform-origin:310px 236px;">
          <g transform="rotate(16 310 236)">
            <rect x="286" y="228" width="50" height="156" rx="25" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
            <rect x="304" y="254" width="24" height="110" rx="12" fill="url(#alfred-teal)"/>
          </g>
        </g>

        <!-- ── Cou ─────────────────────────────────────────────── -->
        <rect x="176" y="188" width="48" height="34" rx="7" fill="url(#alfred-cou)" stroke="#1b1b1b" stroke-width="3.5"/>

        <!-- ── Corps ───────────────────────────────────────────── -->
        <g id="alfred-corps">
          <path d="M124,250 C124,218 154,210 200,210 C246,210 276,218 276,250 C284,308 270,374 236,398 C218,408 182,408 164,398 C130,374 116,308 124,250 Z" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <!-- ombrage léger côté droit -->
          <path d="M200,212 C246,212 276,218 276,250 C284,308 270,374 236,398 C226,404 212,406 200,406 Z" fill="url(#alfred-ombre-corps)" clip-path="url(#alfred-clip-corps)"/>
          <text x="200" y="306" text-anchor="middle" font-family="Poppins, Montserrat, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="32" font-weight="500" fill="#1b8590" letter-spacing="0.5">Alfred</text>
          <!-- ceinture avec boucle centrale -->
          <path d="M128,334 L170,334 L170,348 L230,348 L230,334 L272,334" fill="none" stroke="#1b8590" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="M128,334 L170,334 L170,348 L230,348 L230,334 L272,334" fill="none" stroke="#1b1b1b" stroke-width="1.2" stroke-linejoin="round" opacity="0.5"/>
        </g>

        <!-- ── Socle ───────────────────────────────────────────── -->
        <ellipse cx="200" cy="406" rx="46" ry="22" fill="url(#alfred-teal)" stroke="#1b1b1b" stroke-width="3.5"/>
        <rect x="160" y="384" width="80" height="24" rx="12" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>

        <!-- ── Tête ────────────────────────────────────────────── -->
        <g id="alfred-head" style="transform-origin:200px 190px;">
          <!-- bosse du dessus + oreilles (derrière la tête) -->
          <rect x="158" y="26" width="84" height="34" rx="17" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <rect x="60" y="92" width="34" height="62" rx="14" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <rect x="306" y="92" width="34" height="62" rx="14" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <!-- tête -->
          <rect x="88" y="48" width="224" height="146" rx="46" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <!-- visière -->
          <rect x="106" y="66" width="188" height="110" rx="34" fill="url(#alfred-visiere)" stroke="#1b1b1b" stroke-width="3"/>
          <ellipse id="alfred-gloss-front" cx="150" cy="86" rx="46" ry="14" fill="rgba(255,255,255,0.10)" style="pointer-events:none;"/>

          <!-- yeux -->
          <g id="alfred-eye-l" style="transform-origin:160px 118px;">
            <path id="alfred-eye-l-cercle" d="M141,124 a19,17 0 0 1 38,0 Z" fill="url(#alfred-oeil)"/>
            <path id="alfred-eye-l-ferme" d="M143,120 Q160,130 177,120" stroke="#17e3d2" stroke-width="4" stroke-linecap="round" fill="none" style="display:none;"/>
          </g>
          <g id="alfred-eye-r" style="transform-origin:240px 118px;">
            <path d="M221,124 a19,17 0 0 1 38,0 Z" fill="url(#alfred-oeil)"/>
          </g>
          <g id="alfred-lids" style="display:none;">
            <path d="M143,120 Q160,130 177,120" stroke="#17e3d2" stroke-width="4" stroke-linecap="round" fill="none"/>
            <path d="M223,120 Q240,130 257,120" stroke="#17e3d2" stroke-width="4" stroke-linecap="round" fill="none"/>
          </g>

          <!-- bouche -->
          <path id="alfred-mouth" d="M188,150 Q200,159 212,150" stroke="#17e3d2" stroke-width="4.5" stroke-linecap="round" fill="none"/>
          <ellipse id="alfred-mouth-talk" cx="200" cy="153" rx="14" ry="0" fill="#17e3d2" style="display:none;"/>
        </g>
      </g>
    </svg>

    <div id="alfred-dots" style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);display:flex;gap:5px;opacity:0;transition:opacity .3s;z-index:3;">
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
  // max-height remonté (80vh → 92vh) : avec plus de répliques dans
  // l'acte 2 (retour Cyril, séparation des répliques groupées ce soir),
  // la colonne dépassait plus souvent la hauteur du panneau, forçant un
  // défilement interne même sur un écran qui aurait la place.
  // Largeur remontée un peu aussi (460-520 → 500-560) : la colonne acte 3
  // (voir alfred-col-3, flex:0.7) était trop étroite pour "⚡ Closing" sur
  // une ligne (le ⚡ ajouté ce soir devant les répliques à action).
  panel.style.cssText = `
    display:none; position:fixed;
    top:50%; left:270px; transform:translateY(-50%);
    background:rgba(5,69,97,0.97); border-radius:14px;
    padding:16px; z-index:500; min-width:500px; max-width:560px;
    max-height:92vh; overflow-y:auto;
    box-shadow:0 8px 40px rgba(0,0,0,0.5);
    font-family:sans-serif;
  `;
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="color:rgba(255,255,255,.35);font-size:8px;letter-spacing:2.5px;">SCRIPT · ALFRED</div>
      <div id="alfred-script-status" style="color:rgba(255,255,255,.4);font-size:9px;"></div>
      <!-- Avant : ↺ seule, sans texte — la portée (script uniquement) n'était
           lisible qu'en survolant l'infobulle. Les deux autres ↺ du panneau
           (juste plus bas) ont déjà un libellé visible ; celui-ci était le
           seul à ne pas en avoir. -->
      <span id="alfred-script-reset" title="Réinitialiser le script par défaut" style="color:rgba(255,255,255,.35);font-size:9px;cursor:pointer;white-space:nowrap;">↺ Réinit. script</span>
    </div>
    <button id="alfred-donnees-ouvrir" style="width:100%;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);font-size:11px;font-weight:600;cursor:pointer;">📋 Données du dossier démo</button>
    <button id="alfred-voix-ouvrir" style="width:100%;margin-bottom:6px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);font-size:11px;font-weight:600;cursor:pointer;">🔊 Voix d'Alfred</button>
    <div id="alfred-reglages-reset" style="text-align:center;color:rgba(255,255,255,.35);font-size:9px;margin-bottom:14px;cursor:pointer;">↺ Réinitialiser voix + données démo</div>
    <button id="alfred-lecture-auto" style="width:100%;margin-bottom:14px;padding:8px;border-radius:8px;border:1px solid rgba(20,176,189,.4);background:rgba(20,176,189,.12);color:#fff;font-size:11px;font-weight:600;cursor:pointer;">▶ Jouer tout (les 3 actes)</button>
    <div style="display:flex;gap:20px;align-items:flex-start;">
      <div id="alfred-col-1" style="flex:1;"></div>
      <div id="alfred-col-2" style="flex:1.2;"></div>
      <div id="alfred-col-3" style="flex:0.9;"></div>
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

// true si la réplique déclenche un vrai clic dans l'appli (elle-même ou
// l'un de ses segments) — sert à avertir avant de la déplacer par
// glisser-déposer : contrairement à une réplique de pure narration, son
// ORDRE relatif aux autres actions compte pour de vrai dans l'appli en
// direct (ex. rattacher un notaire doit se faire après le vrai clic
// Enregistrer, pas avant — remonté en test live ce soir).
function repliqueADesActions(r) {
  if (r.action) return true;
  if (Array.isArray(r.segments)) return r.segments.some(seg => seg.action);
  return false;
}

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
        // Avertissement avant de déplacer une réplique qui déclenche un
        // vrai clic dans l'appli : contrairement à une réplique de pure
        // narration, la changer de place peut casser une dépendance réelle
        // entre deux actions (ex. rattacher un notaire doit rester après le
        // vrai clic Enregistrer). Rien n'empêche le déplacement, juste un
        // rappel avant de le faire sans y penser.
        if (repliqueADesActions(list[dragSourceIdx])) {
          const ok = confirm(
            `« ${list[dragSourceIdx].label} » déclenche une vraie action dans l'appli.\n` +
            `Changer sa place peut casser l'ordre réel des clics en direct (ex. un rattachement qui doit se faire après un enregistrement).\n\n` +
            `Déplacer quand même ?`
          );
          if (!ok) { dragSourceIdx = null; return; }
        }
        deplacerReplique(dragSourceIdx, idx);
        dragSourceIdx = null;
      };

      const btn = document.createElement('div');
      // Le ⚡ était collé directement devant le texte : une réplique sans
      // action commençait donc son nom 2 caractères plus à gauche qu'une
      // réplique avec ⚡, ce qui désalignait le début des noms entre les
      // lignes (remonté en test live — pas le même problème que la
      // troncature réglée juste avant). Fix : un slot de largeur fixe pour
      // le symbole (vide si pas d'action), séparé du texte du nom — chaque
      // nom démarre maintenant toujours à la même position, avec ou sans ⚡.
      const aAction = repliqueADesActions(r);
      btn.style.cssText = 'flex:1;min-width:0;display:flex;align-items:center;color:rgba(255,255,255,.75);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;transition:background .15s,color .15s;';
      const symbole = document.createElement('span');
      symbole.textContent = aAction ? '⚡' : '';
      symbole.style.cssText = 'flex:0 0 14px;text-align:center;';
      const texte = document.createElement('span');
      texte.textContent = r.label;
      // white-space:nowrap + text-overflow:ellipsis : avant, un nom trop
      // long passait à la ligne, ce qui rendait les lignes du panneau
      // inégales et mal alignées entre elles (remonté en test live) —
      // maintenant chaque ligne garde la même hauteur, quitte à tronquer
      // avec "…" (le nom complet reste lisible au survol). min-width:0
      // est nécessaire : un enfant flex ne respecte pas overflow:hidden
      // sans ça.
      texte.style.cssText = 'flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      btn.appendChild(symbole);
      btn.appendChild(texte);
      // Toujours le nom complet en infobulle — utile maintenant que le
      // texte peut être tronqué (voir text-overflow ci-dessus) sur les
      // noms les plus longs.
      btn.title = r.label + (aAction ? ' — déclenche une action réelle dans l\'appli' : '');
      btn.onmouseover = () => { btn.style.background='rgba(255,255,255,.12)'; btn.style.color='#fff'; };
      btn.onmouseout  = () => { btn.style.background='transparent'; btn.style.color='rgba(255,255,255,.75)'; };
      btn.onclick = () => {
        // Pas de rattrapage automatique des étapes précédentes (essayé,
        // puis retiré à la demande — trop long/imprévisible). On tente
        // juste l'action cliquée telle quelle : si l'écran actuel
        // correspond déjà, ça marche ; sinon, tant pis, ça échoue avec
        // l'avertissement habituel en console plutôt que de tout rejouer.
        if (typeof secoursIdx !== 'undefined') secoursIdx = idx;
        document.getElementById('alfred-repliques-panel').style.display = 'none';
        if (typeof activerActe2SiBesoin === 'function') activerActe2SiBesoin(idx);
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
  // max-height + overflow-y : sans ça, une réplique à plusieurs segments
  // (une paire de champs FR/NL par segment) peut dépasser la hauteur de
  // l'écran des deux côtés (le panneau est centré verticalement) — le
  // bouton "Enregistrer" se retrouvait hors écran, impossible à cliquer.
  // Remonté en test live.
  panel.style.cssText = `
    display:none; position:fixed;
    top:50%; left:50%; transform:translate(-50%,-50%);
    background:rgba(5,69,97,0.99); border-radius:14px;
    padding:20px; z-index:500; width:460px; max-width:90vw;
    max-height:85vh; overflow-y:auto;
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
  // Persisté dès le changement, pas seulement au clic sur "Enregistrer" plus
  // bas : sans ça, choisir une voix puis aller directement éditer le script
  // (autre panneau, autre bouton "Enregistrer") perdait le choix — jamais
  // écrit en local avant ce moment-là. "On doit enregistrer la voix à
  // part" remonté explicitement — ce bouton reste utile pour le partage en
  // ligne + le préchargement TTS, mais le choix local ne dépend plus de lui.
  selectVoix.onchange = () => {
    localStorage.setItem(ALFRED_GEMINI_VOIX_KEY, selectVoix.value);
    // Sans ça, le repli Cloud TTS (voir appliquerChoixVoix dans
    // alfred-voice.js) ne se resynchronisait qu'au prochain rechargement
    // complet du bookmarklet — un changement de voix en cours de session ne
    // prenait effet nulle part avant ça.
    if (typeof appliquerChoixVoix === 'function') appliquerChoixVoix();
  };
  panel.appendChild(selectVoix);

  panel.appendChild(champLabel('Ton'));
  const taTon = document.createElement('textarea');
  taTon.value = tonGemini();
  taTon.rows = 4;
  taTon.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:11px;font-family:sans-serif;resize:vertical;margin-bottom:14px;';
  taTon.oninput = () => localStorage.setItem(ALFRED_GEMINI_TON_KEY, taTon.value);
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
        // stopAudio() AVANT de jouer : ce bouton de test jouait l'audio en
        // direct (audio.play()) sans jamais passer par currentAudio/speak()
        // — rien ne l'arrêtait donc si on lançait "Jouer tout" juste après
        // un test, pendant que ce clip jouait encore : les deux voix se
        // mélangeaient. Remonté en test live le 04/09 ("la première
        // réplique se mélange avec une autre réplique, seulement en Jouer
        // tout") — le vrai coupable n'était pas un audio caché défectueux
        // (déjà écarté : le bug persiste même après régénération), mais ce
        // test resté audible en arrière-plan. currentAudio = audio ici
        // permet à un stopAudio() ultérieur (voir le même filet ajouté au
        // début de jouerSecoursInterne, alfred-brain.js) de couper CE clip
        // aussi, pas seulement les vraies répliques.
        if (typeof stopAudio === 'function') stopAudio();
        const audio = await genererAudioGemini(texte, selectVoix.value, taTon.value, langue);
        currentAudio = audio;
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

  // ── Voix ElevenLabs pour le néerlandais BELGE (nl-BE) ──────
  // Ni Gemini-TTS ni Cloud TTS (Google) n'ont de voix nl-BE, seulement
  // nl-NL (accent différent, confirmé par une vraie erreur API) —
  // ElevenLabs a de vraies voix flamandes dans sa bibliothèque
  // (elevenlabs.io/voice-library, chercher "Flemish"). 5 emplacements pour
  // comparer plusieurs candidats "comme avant" (menu Gemini) : on ne peut
  // pas pré-remplir avec de vraies voix (bibliothèque ElevenLabs pas
  // consultable depuis ici), donc on colle soi-même les Voice ID trouvés en
  // écoutant sur elevenlabs.io (gratuit, pas besoin de compte payant pour
  // ça), on teste chacun, et on coche celui qu'on garde. Dès qu'un
  // emplacement est coché, obtenirAudio() (alfred-voice.js) l'utilise en
  // PREMIER pour le NL, avant même Gemini.
  panel.appendChild(champLabel(`Voix ElevenLabs — néerlandais BELGE (optionnel, jusqu'à ${ALFRED_ELEVENLABS_NB_CANDIDATS} candidats)`));

  const candidatsElevenLabs = chargerCandidatsElevenLabsNL();
  const voixActiveActuelle = (typeof voixElevenLabsNL === 'function') ? voixElevenLabsNL() : '';
  const zoneCandidats = document.createElement('div');
  zoneCandidats.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:14px;';

  candidatsElevenLabs.forEach((candidat, i) => {
    const ligne = document.createElement('div');
    ligne.style.cssText = 'display:flex;gap:6px;align-items:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px;';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'alfred-elevenlabs-actif';
    radio.title = 'Utiliser cette voix pour le NL';
    radio.checked = !!candidat.voiceId && candidat.voiceId === voixActiveActuelle;
    radio.style.cssText = 'flex:none;cursor:pointer;';

    const inputLabel = document.createElement('input');
    inputLabel.type = 'text';
    inputLabel.placeholder = 'Nom (ex. Sven)';
    inputLabel.value = candidat.label || '';
    inputLabel.style.cssText = 'width:70px;flex:none;box-sizing:border-box;padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:11px;';

    const inputId = document.createElement('input');
    inputId.type = 'text';
    inputId.placeholder = `Voice ID #${i + 1} (elevenlabs.io/voice-library)`;
    inputId.value = candidat.voiceId || '';
    inputId.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:11px;font-family:monospace;';

    function sauverLigne() {
      candidatsElevenLabs[i] = { label: inputLabel.value.trim(), voiceId: inputId.value.trim() };
      enregistrerCandidatsElevenLabsNL(candidatsElevenLabs);
      // Si la ligne cochée n'a plus d'ID (effacé), on désactive l'ElevenLabs actif.
      if (radio.checked) localStorage.setItem(ALFRED_ELEVENLABS_VOIX_NL_KEY, inputId.value.trim());
    }
    inputLabel.oninput = sauverLigne;
    inputId.oninput = sauverLigne;

    radio.onchange = () => {
      if (radio.checked) localStorage.setItem(ALFRED_ELEVENLABS_VOIX_NL_KEY, inputId.value.trim());
    };

    const btnTester = document.createElement('button');
    btnTester.textContent = '▶';
    btnTester.title = 'Tester cette voix';
    btnTester.style.cssText = 'flex:none;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:12px;cursor:pointer;';
    btnTester.onclick = async () => {
      const voiceId = inputId.value.trim();
      if (!voiceId) { alert('Colle d\'abord un Voice ID ElevenLabs (depuis elevenlabs.io/voice-library).'); return; }
      const original = btnTester.textContent;
      btnTester.disabled = true;
      btnTester.textContent = '…';
      try {
        // Voir la note équivalente sur testerVoix (Gemini) un peu plus
        // haut dans ce fichier — même correctif, même bug.
        if (typeof stopAudio === 'function') stopAudio();
        const audio = await genererAudioElevenLabs("Goeiedag, ik ben Alfred. Dit is een voorbeeld van mijn stem.", voiceId);
        currentAudio = audio;
        await audio.play();
      } catch (e) {
        console.warn('[Alfred Voice] Test de voix ElevenLabs échoué:', e);
        alert('Cette voix n\'a pas pu être générée — vérifie le Voice ID, ou que ELEVENLABS_API_KEY est bien configurée côté serveur (Vercel). Regarde la console pour le détail.');
      } finally {
        btnTester.disabled = false;
        btnTester.textContent = original;
      }
    };

    ligne.appendChild(radio);
    ligne.appendChild(inputLabel);
    ligne.appendChild(inputId);
    ligne.appendChild(btnTester);
    zoneCandidats.appendChild(ligne);
  });
  panel.appendChild(zoneCandidats);

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
    const resultat = await prechargerScript(selectVoix.value, selectVoix.value, taTon.value, (fait, total, echecs, phase) => {
      // 'attente-rattrapage' : les lignes en échec (limite Gemini "par
      // minute", le cas le plus courant) attendent qu'elle se débloque
      // toute seule avant un unique passage de rattrapage — sans ce
      // libellé, le bouton restait figé sur "xx/xx" pendant ~65s, comme
      // planté.
      btnSave.textContent = phase === 'attente-rattrapage'
        ? `⏳ Rattrapage de ${echecs} réplique(s)…`
        : `⏳ Préchargement ${fait}/${total}…`;
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

  // Pas de champ "Code du dossier" ici : il est généré automatiquement à
  // chaque lancement (C- + date + heure, voir seq_creationDossier_ouvrir_champs
  // dans alfred-dom.js) pour garantir l'unicité — un champ ici serait resté
  // sans effet, ce qui aurait été trompeur.
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
  // "aux valeurs par défaut" seul ne disait pas quoi précisément — cohérent
  // maintenant avec le libellé explicite des deux autres ↺ du panneau
  // principal ("Réinit. script" / "voix + données démo").
  btnReset.textContent = '↺ Réinitialiser les données démo';
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

// ── Emplacements de voix candidates ElevenLabs (NL) ──────────────
// Simple liste persistée en local (nom facultatif + Voice ID par ligne),
// distincte de ALFRED_ELEVENLABS_VOIX_NL_KEY qui ne retient que celle
// cochée comme active (c'est cette dernière que lit alfred-voice.js).
const ALFRED_ELEVENLABS_CANDIDATS_KEY = 'alfred_elevenlabs_candidats_nl';
const ALFRED_ELEVENLABS_NB_CANDIDATS = 6;
// Pré-rempli une seule fois (tant que rien n'est encore enregistré en
// local) avec les 6 ID trouvés sur elevenlabs.io/voice-library — évite
// d'avoir à les recopier à la main dans le panneau.
const ALFRED_ELEVENLABS_CANDIDATS_DEFAUT = [
  'tRyB8BgRzpNUv3o2XWD4',
  'W3tynvkIV6vLqFqVMaqT',
  'Yv0oyZ3obP9foTH7emqG',
  '9VFAPoHUQMWIBDOxYj22',
  'FpLGR2n1CcG1v7SHJFsa',
  'wqDY19Brqhu7UCoLadPh',
];
function chargerCandidatsElevenLabsNL() {
  const brut = localStorage.getItem(ALFRED_ELEVENLABS_CANDIDATS_KEY);
  let liste = [];
  if (brut === null) {
    // Rien enregistré encore : on démarre avec les candidats par défaut.
    liste = ALFRED_ELEVENLABS_CANDIDATS_DEFAUT.map((voiceId, i) => ({ label: `Voix ${i + 1}`, voiceId }));
  } else {
    try { liste = JSON.parse(brut); } catch (e) { liste = []; }
    if (!Array.isArray(liste)) liste = [];
  }
  while (liste.length < ALFRED_ELEVENLABS_NB_CANDIDATS) liste.push({ label: '', voiceId: '' });
  return liste.slice(0, ALFRED_ELEVENLABS_NB_CANDIDATS);
}
function enregistrerCandidatsElevenLabsNL(liste) {
  localStorage.setItem(ALFRED_ELEVENLABS_CANDIDATS_KEY, JSON.stringify(liste.slice(0, ALFRED_ELEVENLABS_NB_CANDIDATS)));
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

  // Une réplique "groupée" (r.segments — plusieurs bouts de texte, chacun
  // avec sa propre action) a son NOM verrouillé : alfred-dom.js retrouve
  // certaines d'entre elles (Email, ReponseVendeur) par ce
  // nom exact, codé en dur, pour savoir QUAND parler depuis l'action DOM
  // (parlerDepuisAction) plutôt qu'au début du segment. Un renommage ici
  // casserait ce lien silencieusement (l'action ne retrouverait plus rien,
  // sans erreur visible) — le texte de chaque segment, lui, reste éditable
  // librement, seul le nom est protégé.
  const estGroupee = !!(rFR.segments || rNL.segments);

  panel.appendChild(champLabel('Nom (identifiant interne)' + (estGroupee ? ' (réplique groupée — verrouillé)' : '')));
  const inputLabel = document.createElement('input');
  inputLabel.value = rFR.label;
  inputLabel.disabled = estGroupee;
  inputLabel.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:12px;';
  panel.appendChild(inputLabel);

  // Textes : un seul champ FR/NL pour une réplique classique, ou une paire
  // par segment pour une réplique groupée — chaque segment reste éditable
  // indépendamment (avant : tout était recollé en un bloc, verrouillé en
  // lecture seule pour ne pas écraser les segments par erreur).
  const taFRSegments = [];
  const taNLSegments = [];
  let taFR = null, taNL = null;

  if (estGroupee) {
    const segsFR = rFR.segments || [];
    const segsNL = rNL.segments || [];
    segsFR.forEach((seg, i) => {
      const segNL = segsNL[i] || segsNL[segsNL.length - 1] || {};
      const suffixe = seg.action ? ` — action : ${seg.action}` : '';
      panel.appendChild(champLabel(`Segment ${i + 1} · FR${suffixe}`));
      const ta = document.createElement('textarea');
      ta.value = seg.texte || '';
      ta.rows = 3;
      ta.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-family:sans-serif;resize:vertical;margin-bottom:8px;';
      panel.appendChild(ta);
      taFRSegments.push(ta);

      panel.appendChild(champLabel(`Segment ${i + 1} · NL`));
      const taN = document.createElement('textarea');
      taN.value = segNL.texte || '';
      taN.rows = 3;
      taN.style.cssText = ta.style.cssText;
      panel.appendChild(taN);
      taNLSegments.push(taN);
    });
  } else {
    panel.appendChild(champLabel('Texte FR'));
    taFR = document.createElement('textarea');
    taFR.value = rFR.texte;
    taFR.rows = 4;
    taFR.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-family:sans-serif;resize:vertical;';
    panel.appendChild(taFR);

    panel.appendChild(champLabel('Texte NL'));
    taNL = document.createElement('textarea');
    taNL.value = rNL.texte;
    taNL.rows = 4;
    taNL.style.cssText = taFR.style.cssText;
    panel.appendChild(taNL);
  }

  // Le sélecteur "action unique" ne s'applique pas à une réplique groupée
  // (chaque segment a déjà la sienne, affichée ci-dessus) — masqué dans ce
  // cas plutôt que de proposer un choix qui n'aurait aucun effet clair.
  let select = null;
  if (!estGroupee) {
    panel.appendChild(champLabel('Action déclenchée (optionnel)'));
    select = document.createElement('select');
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

    // Avertissement : contrairement à ce qu'on pourrait croire, une action
    // de cette liste n'est pas une brique réutilisable n'importe où — elle
    // a été écrite pour un point précis de la démo, en supposant un écran
    // déjà affiché à ce moment-là (ex. rattacher un notaire suppose que le
    // dossier vient d'être enregistré juste avant). La réassigner à une
    // autre réplique peut casser l'ordre réel des clics en direct.
    const avertAction = document.createElement('div');
    avertAction.textContent = '⚠️ Chaque action est programmée pour un point précis de la démo — la réassigner ailleurs peut casser l\'ordre réel des clics dans l\'appli.';
    avertAction.style.cssText = 'color:rgba(255,200,100,.75);font-size:10px;margin-top:6px;line-height:1.4;';
    panel.appendChild(avertAction);
  }

  const boutons = document.createElement('div');
  boutons.style.cssText = 'display:flex;gap:8px;margin-top:16px;';

  const btnSave = document.createElement('button');
  btnSave.textContent = 'Enregistrer';
  btnSave.style.cssText = 'flex:1;padding:10px;border-radius:8px;border:none;background:#14b0bd;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
  btnSave.onclick = async () => {
    // Le nom reste celui d'origine pour une réplique groupée (champ
    // désactivé plus haut, valeur jamais modifiée) — pas besoin de le
    // revalider différemment.
    const label = inputLabel.value.trim();
    if (!label) { alert('Le nom de la réplique est requis.'); return; }

    let nouvelleFR, nouvelleNL;
    if (estGroupee) {
      // Ne remplace que le texte de chaque segment — action/parlerDepuisAction
      // (et tout autre champ futur) restent ceux d'origine, jamais touchés
      // par ce panneau.
      nouvelleFR = { acte: rFR.acte, label, segments: rFR.segments.map((seg, i) => ({ ...seg, texte: taFRSegments[i].value.trim() })) };
      nouvelleNL = { acte: rNL.acte, label, segments: (rNL.segments || []).map((seg, i) => ({ ...seg, texte: (taNLSegments[i] || taNLSegments[taNLSegments.length - 1]).value.trim() })) };
    } else {
      const action = select.value || undefined;
      nouvelleFR = { acte: rFR.acte, label, texte: taFR.value.trim(), action };
      nouvelleNL = { acte: rNL.acte, label, texte: taNL.value.trim(), action };
      if (!nouvelleFR.action) delete nouvelleFR.action;
      if (!nouvelleNL.action) delete nouvelleNL.action;
    }

    if (estNouveau) {
      const idx = trouverIndexInsertion(ALFRED_CONFIG.REPLIQUES_FR, nouvelActe);
      ALFRED_CONFIG.REPLIQUES_FR.splice(idx, 0, nouvelleFR);
      ALFRED_CONFIG.REPLIQUES_NL.splice(idx, 0, nouvelleNL);
    } else {
      ALFRED_CONFIG.REPLIQUES_FR[index] = nouvelleFR;
      ALFRED_CONFIG.REPLIQUES_NL[index] = nouvelleNL;
    }
    if (typeof sauvegarderAvecGestionConflit === 'function') afficherStatutSauvegarde(sauvegarderAvecGestionConflit());

    // Avant : modifier le texte ici ne régénérait jamais son audio — la
    // réplique restait en cache sous l'ANCIEN texte jusqu'à ce que quelqu'un
    // clique "Enregistrer" dans le panneau Voix (le seul endroit qui
    // préchargeait). Résultat : soit l'ancien audio (texte périmé) jouait en
    // démo, soit un appel TTS en direct se déclenchait (lent, à éviter).
    // prechargerScript ne regénère que ce qui a vraiment changé (le cache
    // est gardé pour tout le reste, par texte+voix) — coût négligeable ici,
    // une ou deux répliques.
    if (typeof prechargerScript === 'function' && typeof voixGeminiActuelle === 'function') {
      btnSave.disabled = true;
      const original = btnSave.textContent;
      btnSave.textContent = '⏳ Mise à jour de l\'audio…';
      await prechargerScript(voixGeminiActuelle(), voixGeminiActuelle(), tonGemini(), (fait, total) => {
        btnSave.textContent = `⏳ Audio ${fait}/${total}…`;
      });
      btnSave.disabled = false;
      btnSave.textContent = original;
    }

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
    @keyframes alfred-gloss-drift {
      0%,100% { transform:translate(0,0); opacity:1; }
      50%      { transform:translate(-6px,4px); opacity:.7; }
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
    @keyframes alfred-sway-talk {
      0%,100% { transform:rotate(-1.2deg); }
      50%      { transform:rotate(1.2deg); }
    }
    @keyframes alfred-arm-float-l { 0%,100%{transform:rotate(0deg);} 50%{transform:rotate(-3deg);} }
    @keyframes alfred-arm-float-r { 0%,100%{transform:rotate(0deg);} 50%{transform:rotate(3deg);} }
    @keyframes alfred-arm-talk-l {
      0%,100% { transform:rotate(2deg) translateY(0); }
      35%      { transform:rotate(-9deg) translateY(-4px); }
      70%      { transform:rotate(-3deg) translateY(-1px); }
    }
    @keyframes alfred-arm-talk-r {
      0%,100% { transform:rotate(-2deg) translateY(0); }
      40%      { transform:rotate(9deg) translateY(-4px); }
      75%      { transform:rotate(3deg) translateY(-1px); }
    }
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
  creerScene();
  creerPanneauRepliques();
  creerPanneauEdition();
  creerPanneauDonneesCreation();
  creerPanneauVoix();
  startBlinking();
  startEyeLerp();
  balayageRegardEnParlant();
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
  const head   = document.getElementById('alfred-head');
  const armL   = document.getElementById('alfred-arm-l');
  const armR   = document.getElementById('alfred-arm-r');

  // Coupé ici (pas seulement au début du case 'talk') : en quittant l'état
  // 'talk' pour idle/think/sleep, cet intervalle continuait à tourner en
  // arrière-plan pour rien (mouthT étant caché, invisible mais actif quand
  // même) jusqu'à la prochaine fois où on repassait par 'talk' — accumulait
  // un setInterval oublié à chaque réplique.
  clearInterval(talkTick);

  if (wrap)   { wrap.style.animation='none'; void wrap.offsetWidth; }
  if (shadow) { shadow.style.animation='none'; shadow.style.width='160px'; shadow.style.opacity='1'; }
  if (ext)    { ext.style.opacity='1'; }
  if (body)   { body.style.animation='none'; void body.offsetWidth; body.style.transformOrigin='200px 235px'; }
  if (eyeL)   { eyeL.style.animation='none'; eyeL.style.transform=''; eyeL.style.opacity='1'; eyeL.style.transition=''; }
  if (eyeR)   { eyeR.style.animation='none'; eyeR.style.transform=''; eyeR.style.opacity='1'; eyeR.style.transition=''; }
  if (dots)   dots.style.opacity='0';
  if (zzz)    zzz.style.opacity='0';
  if (lids)   lids.style.display='none';
  if (mouth)  { mouth.style.display='block'; mouth.setAttribute('d', ALFRED_BOUCHE_SOURIRE_D); }
  if (mouthT) { mouthT.style.display='none'; mouthT.setAttribute('ry','0'); }
  // Tête et bras du robot : on coupe leurs animations d'état ; la tête
  // garde aussi son transform inline (hochements pilotés par animateMouth).
  if (head)   { head.style.animation='none'; head.style.transform=''; }
  if (armL)   { armL.style.animation='none'; }
  if (armR)   { armR.style.animation='none'; }

  const labels = { idle:'EN ATTENTE', think:'RÉFLEXION...', talk:'EN TRAIN DE PARLER', sleep:'VEILLE' };
  if (lbl) lbl.textContent = labels[state] || '';

  switch(state) {
    case 'idle':
      if (wrap)   wrap.style.animation   = 'alfred-breathe 4s ease-in-out infinite';
      if (shadow) shadow.style.animation = 'alfred-shadow-breathe 4s ease-in-out infinite';
      // Bras qui flottent à peine, en décalé — un robot posé immobile avec
      // les bras raides fait figé ; ici il "vit" un peu même au repos.
      if (armL)   armL.style.animation = 'alfred-arm-float-l 4s ease-in-out infinite';
      if (armR)   armR.style.animation = 'alfred-arm-float-r 4s ease-in-out infinite 2s';
      resetSleepTimer();
      break;

    case 'think':
      if (body) { body.style.transformOrigin='200px 400px'; body.style.animation='alfred-sway 1.4s ease-in-out infinite'; }
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
      // Demandé explicitement (Cyril) : "beaucoup plus bouger quand il
      // parle". En plus de la bouche (volume réel, voir animateMouth) et des
      // hochements de tête (idem) : les bras s'animent en alternance et le
      // corps se balance légèrement — comme quelqu'un qui parle avec les
      // mains, sans gesticuler.
      if (armL)   armL.style.animation = 'alfred-arm-talk-l 1.6s ease-in-out infinite';
      if (armR)   armR.style.animation = 'alfred-arm-talk-r 1.9s ease-in-out infinite .4s';
      if (body)   { body.style.transformOrigin='200px 400px'; body.style.animation='alfred-sway-talk 2.8s ease-in-out infinite'; }
      if (wrap)   wrap.style.animation = 'alfred-breathe 3s ease-in-out infinite';
      // Remplissage transitoire, le temps que speak() (alfred-voice.js) ait
      // l'audio prêt et prenne le relais avec l'amplitude réelle — passe par
      // animateMouth() plutôt qu'une logique dupliquée ici, pour que la
      // forme (largeur + hauteur) reste cohérente entre les deux, pas
      // seulement la hauteur comme avant.
      clearInterval(talkTick);
      if (typeof animateMouth === 'function') {
        talkTick = setInterval(() => animateMouth(0.3 + Math.random() * 0.5), 120);
      }
      break;

    case 'sleep':
      if (wrap)   wrap.style.animation   = 'alfred-sleep 5s ease-in-out infinite';
      if (shadow) shadow.style.animation = 'alfred-shadow-sleep 5s ease-in-out infinite';
      if (ext)    ext.style.opacity      = '0.3';
      if (eyeL)   { eyeL.style.transition='opacity .4s ease'; eyeL.style.opacity='0'; }
      if (eyeR)   { eyeR.style.transition='opacity .4s ease'; eyeR.style.opacity='0'; }
      if (mouth)  mouth.setAttribute('d', ALFRED_BOUCHE_DORMIR_D);
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

// true pendant le geste — startEyeLerp (plus bas) doit s'interrompre le
// temps du clin d'œil, sinon il réécrit style.transform de l'œil droit à
// chaque frame et annule aussitôt le plissement.
let clinDoeilActif = false;

// true pendant le geste "Montrer" (voir gesteMontrer plus bas) — empêche
// balayageRegardEnParlant de choisir une nouvelle cible de regard aléatoire
// par-dessus celle du geste pendant qu'il est tenu.
let gesteMontrerActif = false;

// Geste d'invitation confiante sur "Avec plaisir. Regardez." (acte 1) — le
// pivot où Alfred arrête d'expliquer et passe à la démo.
// Essayé d'abord en agrandissant les yeux (scale 1.25) : lu comme un
// "gonflement" bizarre plutôt qu'une émotion (retour utilisateur, testé en
// vrai). Remplacé par un regard dirigé — les yeux se tournent vers ce qu'il
// s'apprête à montrer, comme s'il désignait l'écran — plus un léger lean-in
// du corps, tenu pendant toute la ligne puis relâché. Le regard réutilise
// simplement eyeTargetX/Y et le lissage déjà en place (startEyeLerp/
// balayageRegardEnParlant) : aucun nouveau transform à gérer sur les yeux,
// donc aucun risque de conflit avec le suivi du regard existant.
async function gesteMontrer() {
  console.log('[Alfred UI] gesteMontrer() appelée.');
  const body = document.getElementById('alfred-body-main');
  if (!body || typeof attendre !== 'function') {
    console.warn('[Alfred UI] gesteMontrer() interrompue — élément(s) introuvable(s):', { body: !!body, attendre: typeof attendre });
    return;
  }
  console.log('[Alfred UI] gesteMontrer() — geste en cours. état actuel:', { curState });

  gesteMontrerActif = true;

  body.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1)';
  body.style.transform  = 'translateY(4px)';
  eyeTargetX = -5;
  eyeTargetY = 6;

  await attendre(1700);

  body.style.transform = 'translateY(0)';
  eyeTargetX = 0;
  eyeTargetY = 0;
  gesteMontrerActif = false;
  console.log('[Alfred UI] gesteMontrer() — geste terminé, retour à la normale.');
}

// Clin d'œil de clôture ("Ne partez pas trop vite. C'est moi qui vous
// engage.") — le seul moment de tout le script pensé pour faire sourire,
// jamais répété ailleurs. Contrairement au clignement (rapide, les deux
// yeux, presque invisible), ici : un œil complètement fermé, l'autre
// nettement plissé et TENU (pas un clignement), plus une vraie inclinaison
// de tête. Sur un personnage à formes simples sans membres, ce sont les
// yeux qui portent l'émotion, pas de petits déplacements du corps (voir la
// recherche sur les mascottes à formes géométriques simples, ex. Duolingo).
async function clinDoeil() {
  console.log('[Alfred UI] clinDoeil() appelée.');
  const body       = document.getElementById('alfred-body-main');
  const eyeR       = document.getElementById('alfred-eye-r');
  const eyeLCercle = document.getElementById('alfred-eye-l-cercle');
  const eyeLFerme  = document.getElementById('alfred-eye-l-ferme');
  const mouth      = document.getElementById('alfred-mouth');
  const mouthTalk  = document.getElementById('alfred-mouth-talk');
  if (!body || !eyeR || !eyeLCercle || !eyeLFerme || typeof attendre !== 'function') {
    console.warn('[Alfred UI] clinDoeil() interrompue — élément(s) introuvable(s):', { body: !!body, eyeR: !!eyeR, eyeLCercle: !!eyeLCercle, eyeLFerme: !!eyeLFerme, attendre: typeof attendre });
    return;
  }
  console.log('[Alfred UI] clinDoeil() — tous les éléments trouvés, geste en cours.');

  clinDoeilActif = true;

  body.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)';
  body.style.transform  = 'rotate(8deg)';
  eyeLCercle.style.display = 'none';
  eyeLFerme.style.display  = 'block';
  // L'œil droit reste tel quel (pas de plissement) : en scaleY(.35) il se
  // réduisait à un trait fin quasi identique à l'œil gauche fermé, donc les
  // deux yeux avaient l'air fermés/plissés au lieu d'un vrai clin d'œil (un
  // œil fermé, l'autre normal). Le contraste fermé/normal suffit à lire le
  // geste, pas besoin de toucher l'œil droit.
  // Sourire forcé pendant le geste : la réplique est encore en train de
  // parler (talkTick continue d'appeler animateMouth toutes les 120ms), donc
  // sans ce forçage la bouche resterait l'ellipse "qui parle" pendant tout
  // le clin d'œil. animateMouth() (alfred-voice.js) vérifie clinDoeilActif et
  // ne réécrit plus la bouche tant qu'il est vrai — ici on affiche le
  // sourire statique une bonne fois pour toutes pour la durée du geste.
  if (mouth)     mouth.style.display     = 'block';
  if (mouthTalk) mouthTalk.style.display = 'none';

  await attendre(1400);

  body.style.transform     = 'rotate(0deg)';
  eyeLCercle.style.display = 'block';
  eyeLFerme.style.display  = 'none';

  clinDoeilActif = false;
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
    // Étendu à 'talk' (avant : 'idle' seulement) — pendant qu'il parle, les
    // yeux restaient fixes, seul moment le plus regardé de toute la démo.
    // Suspendu pendant clinDoeil() : sinon ce lissage réécrit style.transform
    // à chaque frame et annule aussitôt le plissement de l'œil droit.
    // (gesteMontrer() ne touche plus directement ce transform — il passe
    // par eyeTargetX/Y, donc n'a pas besoin d'être exclu ici.)
    if (!clinDoeilActif && (curState === 'idle' || curState === 'talk')) {
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

// Pendant 'talk', le regard ne suit pas la souris (sa position réelle n'a
// aucun sens comme cible — le présentateur peut cliquer n'importe où sur
// l'écran) : un léger balayage autonome, vers un nouveau point discret
// toutes les 2 à 4s, donne l'impression qu'il regarde la salle en parlant.
// Réutilise eyeTargetX/Y et le lissage déjà en place (startEyeLerp) — cette
// fonction ne fait que choisir une nouvelle cible de temps en temps.
function balayageRegardEnParlant() {
  // Suspendu pendant gesteMontrer() : sinon ce balayage aléatoire peut
  // retomber pile pendant le geste et écraser le regard dirigé qu'il tient.
  if (curState === 'talk' && !gesteMontrerActif) {
    eyeTargetX = (Math.random() - 0.5) * 10;
    eyeTargetY = (Math.random() - 0.5) * 5;
  }
  setTimeout(balayageRegardEnParlant, 2000 + Math.random() * 2000);
}

function resetSleepTimer() {
  clearTimeout(sleepTimer);
  if (curState === 'sleep') {
    const mouth = document.getElementById('alfred-mouth');
    if (mouth) mouth.setAttribute('d', ALFRED_BOUCHE_SOURIRE_D);
    setAlfredState('idle');
  }
  sleepTimer = setTimeout(() => {
    if (curState==='idle') setAlfredState('sleep');
  }, (ALFRED_CONFIG?.SLEEP_APRES || 30) * 1000);
}

// ══════════════════════════════════════════════════════════════════════
// MODE SCÈNE — Alfred seul, en grand, plein écran (Actes 1 et 3)
// ══════════════════════════════════════════════════════════════════════
// Demandé par Cyril (03/09) après les retours "trop redondant" : pendant tout
// l'Acte 1 (l'entretien), rien ne se passe dans l'appli — la montrer à côté
// d'Alfred n'apporte rien. On ne voit donc QUE le robot, au centre, sur un
// fond léger et vivant. Sur la réplique "Montrer" ("Avec plaisir. Regardez."),
// Alfred "charge" l'interface : barre de chargement, puis il rétrécit et
// glisse dans le panneau latéral pendant que le site apparaît — Acte 2 normal.
// À la première réplique de l'Acte 3, l'appli "s'éteint" (flou, fondu) et
// Alfred revient seul au centre pour le closing.
//
// Mécanique : un calque fixe (#alfred-scene, sous les panneaux de réglage
// z-index 500, au-dessus du site et du panneau latéral) ; le NŒUD DOM de
// l'avatar (#alfred-avatar-outer) est DÉPLACÉ entre le panneau latéral et le
// centre de la scène (pas dupliqué) — tous ses ids/animations restent donc
// valables, et le déplacement est animé en FLIP (mesure avant/après, puis
// transition de transform) pour un vrai glissement continu d'une position à
// l'autre plutôt qu'un saut.
// Touche S : bascule manuelle (utile pour "monter sur scène" avant la toute
// première réplique, ou pour préparer l'appli sans le calque devant).
let modeSceneActif = false;
let transitionSceneEnCours = Promise.resolve();

function creerScene() {
  if (document.getElementById('alfred-scene')) return;
  const style = document.createElement('style');
  style.id = 'alfred-scene-styles';
  style.textContent = `
    #alfred-scene { position:fixed; inset:0; z-index:450; opacity:0; visibility:hidden; pointer-events:none;
      transition:opacity .7s ease, visibility 0s linear .7s; overflow:hidden; font-family:-apple-system,'Segoe UI',sans-serif; }
    #alfred-scene.actif { opacity:1; visibility:visible; pointer-events:all; transition:opacity .7s ease; }
    #alfred-scene-fond { position:absolute; inset:0;
      background:radial-gradient(ellipse at 50% 42%, #ffffff 0%, #f3fafb 40%, #e2f2f4 100%); }
    #alfred-scene-fond::after { content:''; position:absolute; inset:0; opacity:.35;
      background-image:linear-gradient(rgba(20,176,189,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(20,176,189,.08) 1px, transparent 1px);
      background-size:64px 64px; mask-image:radial-gradient(ellipse at 50% 45%, transparent 25%, #000 90%); -webkit-mask-image:radial-gradient(ellipse at 50% 45%, transparent 25%, #000 90%); }
    #alfred-scene-halo { position:absolute; left:50%; top:50%; width:78vmin; height:78vmin; transform:translate(-50%,-54%); border-radius:50%;
      background:radial-gradient(circle, rgba(20,176,189,.20) 0%, rgba(20,176,189,.09) 40%, rgba(20,176,189,0) 68%);
      animation:alfred-halo-pulse 6s ease-in-out infinite; }
    #alfred-scene-anneau { position:absolute; left:50%; top:50%; width:60vmin; height:60vmin; transform:translate(-50%,-54%); border-radius:50%;
      border:1.5px solid rgba(20,176,189,.18); animation:alfred-anneau-tourne 40s linear infinite; }
    #alfred-scene-anneau::before { content:''; position:absolute; top:-5px; left:50%; width:9px; height:9px; margin-left:-4px; border-radius:50%; background:#14b0bd; box-shadow:0 0 12px rgba(20,176,189,.8); }
    .alfred-scene-part { position:absolute; border-radius:50%; background:#14b0bd; filter:blur(1px); animation:alfred-part-derive ease-in-out infinite; }
    #alfred-scene-marque { position:absolute; top:30px; left:50%; transform:translateX(-50%); font-size:11px; font-weight:700; letter-spacing:4px; color:rgba(5,69,97,.45); }
    #alfred-scene-centre { position:absolute; left:50%; top:50%; transform:translate(-50%,-52%); }
    #alfred-scene-chargement { position:absolute; left:50%; bottom:14vh; transform:translateX(-50%); width:min(360px, 60vw); text-align:center; opacity:0; transition:opacity .35s ease; }
    #alfred-scene-chargement.actif { opacity:1; }
    .alfred-scene-barre { height:5px; border-radius:3px; background:rgba(5,69,97,.10); overflow:hidden; }
    .alfred-scene-barre-int { height:100%; width:0; border-radius:3px; background:linear-gradient(90deg,#0a6b7a,#14b0bd,#5fe3ea); box-shadow:0 0 12px rgba(20,176,189,.6); transition:width 1.5s cubic-bezier(.22,.61,.36,1); }
    #alfred-scene-chargement-txt { margin-top:12px; font-size:13px; letter-spacing:1.5px; color:rgba(5,69,97,.6); text-transform:uppercase; }
    #alfred-site-content { transition:filter .8s ease, transform .8s ease, opacity .8s ease; }
    #alfred-site-content.alfred-app-eteinte { filter:blur(8px) brightness(.7) saturate(.6); transform:scale(.965); opacity:0; }
    #alfred-site-content.alfred-app-demarrage { animation:alfred-app-boot .9s cubic-bezier(.22,.61,.36,1) both; }
    @keyframes alfred-app-boot { 0%{opacity:0; filter:blur(10px) brightness(1.4); transform:scale(1.03);} 60%{opacity:1; filter:blur(0) brightness(1.06);} 100%{opacity:1; filter:none; transform:scale(1);} }
    @keyframes alfred-halo-pulse { 0%,100%{transform:translate(-50%,-54%) scale(1); opacity:.9;} 50%{transform:translate(-50%,-54%) scale(1.08); opacity:1;} }
    @keyframes alfred-anneau-tourne { to { transform:translate(-50%,-54%) rotate(360deg); } }
    @keyframes alfred-part-derive { 0%,100%{transform:translate(0,0);} 33%{transform:translate(14px,-26px);} 66%{transform:translate(-10px,-48px);} }
  `;
  document.head.appendChild(style);

  const scene = document.createElement('div');
  scene.id = 'alfred-scene';
  scene.innerHTML = `
    <div id="alfred-scene-fond"></div>
    <div id="alfred-scene-particules"></div>
    <div id="alfred-scene-halo"></div>
    <div id="alfred-scene-anneau"></div>
    <div id="alfred-scene-marque">ALFRED · WELLNOT</div>
    <div id="alfred-scene-centre"></div>
    <div id="alfred-scene-chargement">
      <div class="alfred-scene-barre"><div class="alfred-scene-barre-int"></div></div>
      <div id="alfred-scene-chargement-txt"></div>
    </div>`;
  document.body.appendChild(scene);

  // Particules : quelques points teal translucides qui dérivent lentement —
  // juste assez pour que le fond ne soit pas un aplat mort, pas un feu
  // d'artifice qui volerait l'attention au robot.
  const parts = scene.querySelector('#alfred-scene-particules');
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('span');
    p.className = 'alfred-scene-part';
    const taille = 4 + Math.random() * 12;
    p.style.cssText = `left:${Math.random() * 100}%; top:${15 + Math.random() * 80}%; width:${taille}px; height:${taille}px;` +
      `opacity:${(.10 + Math.random() * .22).toFixed(2)}; animation-duration:${(16 + Math.random() * 18).toFixed(0)}s; animation-delay:-${(Math.random() * 20).toFixed(0)}s;`;
    parts.appendChild(p);
  }
}

// Échelle du robot sur scène : ~72% de la hauteur d'écran, plafonnée.
function echelleScene() {
  return Math.min(2.8, (window.innerHeight * 0.72) / 250);
}

// Déplace le nœud avatar d'un parent à l'autre avec une animation FLIP
// (First-Last-Invert-Play) : on mesure où il était, on le déplace, on
// mesure où il est, et on anime la différence — un vrai glissement continu.
async function deplacerAvatarAnime(nouveauParent, transformFinal, dureeMs, avantElement) {
  const outer = document.getElementById('alfred-avatar-outer');
  if (!outer) return;
  const first = outer.getBoundingClientRect();
  if (avantElement) nouveauParent.insertBefore(outer, avantElement); else nouveauParent.appendChild(outer);
  outer.style.transition = 'none';
  outer.style.transformOrigin = 'center center';
  outer.style.transform = transformFinal;
  const last = outer.getBoundingClientRect();
  // Point de départ hors écran/replié (panneau fermé) : pas de FLIP fiable,
  // simple apparition en douceur.
  if (first.width < 20 || last.width < 20) {
    outer.style.opacity = '0';
    outer.style.transform = transformFinal + ' scale(.85)';
    void outer.offsetWidth;
    outer.style.transition = `transform ${dureeMs}ms cubic-bezier(.32,.72,0,1), opacity ${dureeMs}ms ease`;
    outer.style.opacity = '1';
    outer.style.transform = transformFinal;
  } else {
    const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
    const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
    const k  = first.width / last.width;
    outer.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) ${transformFinal} scale(${k.toFixed(3)})`;
    void outer.offsetWidth;
    outer.style.transition = `transform ${dureeMs}ms cubic-bezier(.32,.72,0,1)`;
    outer.style.transform = transformFinal;
  }
  await new Promise(r => setTimeout(r, dureeMs + 30));
  outer.style.transition = '';
}

function texteChargementScene() {
  return (typeof currentLangue !== 'undefined' && currentLangue === 'nl') ? 'Interface wordt geladen' : "Chargement de l'interface";
}

// Entrée en scène. depuisApp = true (Acte 3) : l'appli "s'éteint" d'abord
// (flou + fondu + léger rétrécissement), puis Alfred revient au centre.
async function entrerScene(options = {}) {
  creerScene();
  if (modeSceneActif) return;
  modeSceneActif = true;
  const scene  = document.getElementById('alfred-scene');
  const centre = document.getElementById('alfred-scene-centre');
  const site   = document.getElementById('alfred-site-content');
  const left   = document.getElementById('alfred-left-panel');

  if (options.depuisApp && site) {
    site.classList.remove('alfred-app-demarrage');
    site.classList.add('alfred-app-eteinte');
    await new Promise(r => setTimeout(r, 450));
  }
  scene.classList.add('actif');
  const promesseAvatar = deplacerAvatarAnime(centre, `scale(${echelleScene().toFixed(3)})`, 900);
  if (left) left.classList.remove('visible');
  await promesseAvatar;
  if (site) { site.classList.remove('alfred-app-eteinte'); site.style.visibility = 'hidden'; }
  const tr = document.getElementById('alfred-transcript');
  if (tr) tr.textContent = '';
}

// Sortie de scène. chargement = true (réplique "Montrer") : barre de
// chargement "Alfred charge le site" puis apparition du site pendant que le
// robot rejoint le panneau. Sans chargement (saut direct à une réplique
// d'Acte 2) : transition rapide, sans mise en scène.
async function quitterScene(options = {}) {
  if (!modeSceneActif) return;
  const scene  = document.getElementById('alfred-scene');
  const site   = document.getElementById('alfred-site-content');
  const left   = document.getElementById('alfred-left-panel');
  const charg  = document.getElementById('alfred-scene-chargement');
  if (!scene) { modeSceneActif = false; return; }

  if (options.chargement && charg) {
    const barre = charg.querySelector('.alfred-scene-barre-int');
    const txt   = document.getElementById('alfred-scene-chargement-txt');
    if (txt) txt.textContent = texteChargementScene();
    if (barre) { barre.style.transition = 'none'; barre.style.width = '0'; void barre.offsetWidth; barre.style.transition = ''; }
    charg.classList.add('actif');
    if (typeof setAlfredState === 'function' && curState !== 'talk') setAlfredState('think');
    await new Promise(r => setTimeout(r, 80));
    if (barre) barre.style.width = '100%';
    await new Promise(r => setTimeout(r, 1600));
    charg.classList.remove('actif');
  }

  // Le site réapparaît (visible + animation de démarrage) et le panneau
  // latéral se rouvre ; on attend qu'il ait pris sa largeur avant de
  // mesurer la place du robot dedans (sinon le FLIP viserait un panneau
  // encore replié).
  if (site) {
    site.style.visibility = '';
    site.classList.remove('alfred-app-eteinte');
    site.classList.add('alfred-app-demarrage');
    setTimeout(() => site.classList.remove('alfred-app-demarrage'), 1000);
  }
  if (left) left.classList.add('visible');
  await new Promise(r => setTimeout(r, 620));

  const lbl = document.getElementById('alfred-state-lbl');
  await deplacerAvatarAnime(left, '', 800, lbl);
  scene.classList.remove('actif');
  modeSceneActif = false;
  if (typeof setAlfredState === 'function' && curState === 'think') setAlfredState('idle');
}

// Appelée par jouerSecoursInterne (alfred-brain.js) AVANT chaque réplique,
// avec son acte : garantit l'état de scène attendu, quel que soit le
// chemin (flèches dans l'ordre, clic direct sur une réplique, "Jouer tout").
// Le passage Acte 1 → 2 avec la mise en scène complète se fait lui sur
// l'action de la réplique "Montrer" (voir gesteMontrerEtOuvrirSite) — ici,
// pour l'Acte 2, on ne fait qu'un repli rapide si la scène est encore là.
function assurerModeScene(acte) {
  transitionSceneEnCours = transitionSceneEnCours.then(async () => {
    if (acte === 1 && !modeSceneActif) await entrerScene({ depuisApp: false });
    else if (acte === 2 && modeSceneActif) await quitterScene({ chargement: false });
    else if (acte === 3 && !modeSceneActif) await entrerScene({ depuisApp: true });
  }).catch(e => console.warn('[Alfred UI] Transition de scène échouée :', e));
  return transitionSceneEnCours;
}

function basculerModeScene() {
  transitionSceneEnCours = transitionSceneEnCours.then(() =>
    modeSceneActif ? quitterScene({ chargement: false }) : entrerScene({ depuisApp: true })
  ).catch(e => console.warn('[Alfred UI] Bascule de scène échouée :', e));
  return transitionSceneEnCours;
}

// Action de la réplique "Montrer" ("Avec plaisir. Regardez.") : le geste
// existant (il se penche, regarde vers le bas-gauche) puis "Alfred charge le
// site" — barre de chargement, apparition de l'interface, retour du robot
// dans le panneau. Remplace gesteMontrer seul dans DOM_ACTIONS.
async function gesteMontrerEtOuvrirSite() {
  await gesteMontrer();
  transitionSceneEnCours = transitionSceneEnCours.then(() => quitterScene({ chargement: true }))
    .catch(e => console.warn('[Alfred UI] Ouverture du site échouée :', e));
  await transitionSceneEnCours;
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