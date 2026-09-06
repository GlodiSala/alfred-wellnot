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
const ALFRED_BOUCHE_CY = 138;
const ALFRED_BOUCHE_RX = 14;
// Formes de bouche (mêmes 12 points que FORMES_OEIL, voir cheminOeil), en
// coordonnées locales autour de (ALFRED_BOUCHE_CX, ALFRED_BOUCHE_CY) :
//  repos  = sourire fin ; o = "o" rond ; ah = grande ouverte ; i = large et
//  plate ("i", sifflantes). animateMouth (alfred-voice.js) mélange ces
//  quatre formes selon le volume (ouverture) ET la brillance du son
//  (largeur : les aigus/sifflantes étirent la bouche, les voyelles graves
//  l'arrondissent) — remplace l'ellipse qui ne faisait que grandir.
const FORMES_BOUCHE = {
  repos:  [-14,-4, -9,0, -5,2.5, 0,3, 5,2.5, 9,0, 14,-4, 9,1, 5,5, 0,6.5, -5,5, -9,1],
  o:      [-10,2, -10,-3.5, -5.5,-8, 0,-8, 5.5,-8, 10,-3.5, 10,2, 10,7.5, 5.5,12, 0,12, -5.5,12, -10,7.5],
  ah:     [-19,3, -19,-4.4, -10.5,-11, 0,-11, 10.5,-11, 19,-4.4, 19,3, 19,10.4, 10.5,17, 0,17, -10.5,17, -19,10.4],
  i:      [-18,2, -18,-0.2, -10,-2, 0,-2, 10,-2, 18,-0.2, 18,2, 18,4.2, 10,6, 0,6, -10,6, -18,4.2],
  dormir: [-10,1, -6,1, -3,1, 0,1, 3,1, 6,1, 10,1, 6,2.5, 3,2.5, 0,2.5, -3,2.5, -6,2.5],
};
function cheminBouche(points) {
  return cheminOeil(points.map((v, i) => v + (i % 2 === 0 ? ALFRED_BOUCHE_CX : ALFRED_BOUCHE_CY)));
}
const ALFRED_BOUCHE_SOURIRE_D = cheminBouche(FORMES_BOUCHE.repos);
const ALFRED_BOUCHE_DORMIR_D  = cheminBouche(FORMES_BOUCHE.dormir);

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
        <linearGradient id="alfred-visiere" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0" stop-color="#0b4f5e"/>
          <stop offset="0.5" stop-color="#12697a"/>
          <stop offset="1" stop-color="#1c8b96"/>
        </linearGradient>
        <linearGradient id="alfred-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1f8f99"/>
          <stop offset="1" stop-color="#0f5f6c"/>
        </linearGradient>
        <linearGradient id="alfred-cou" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#1a8590"/>
          <stop offset="0.5" stop-color="#22a0a8"/>
          <stop offset="1" stop-color="#116370"/>
        </linearGradient>
        <radialGradient id="alfred-oeil" cx="0.5" cy="0.3" r="0.75">
          <stop offset="0" stop-color="#8dfff4"/>
          <stop offset="1" stop-color="#1ee6d6"/>
        </radialGradient>
        <linearGradient id="alfred-ombre-corps" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="1" stop-color="#d6dee1" stop-opacity="0.95"/>
        </linearGradient>
        <clipPath id="alfred-clip-corps">
          <path d="M90,270 C90,228 136,218 200,218 C264,218 310,228 310,270 C318,330 300,394 258,418 C226,434 174,434 142,418 C100,394 82,330 90,270 Z"/>
        </clipPath>
        <clipPath id="alfred-clip-visiere">
          <rect x="78" y="52" width="244" height="120" rx="40"/>
        </clipPath>
      </defs>

      <g id="alfred-body-main" style="transform-origin:200px 235px;">
      <!-- groupe de posture (penchés, redressements, ajustements d'appui) :
           animé par Web Animations API, rien d'autre n'y touche -->
      <g id="alfred-posture" style="transform-origin:200px 420px;">

        <!-- ── Bras (derrière le corps) ─────────────────────────── -->
        <g id="alfred-arm-l" style="transform-origin:76px 244px;">
          <g id="alfred-arm-l-base" transform="rotate(-16 76 244)">
            <rect x="46" y="230" width="60" height="196" rx="30" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
            <rect x="60" y="266" width="26" height="132" rx="13" fill="url(#alfred-teal)"/>
          </g>
        </g>
        <g id="alfred-arm-r" style="transform-origin:324px 244px;">
          <g id="alfred-arm-r-base" transform="rotate(16 324 244)">
            <rect x="294" y="230" width="60" height="196" rx="30" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
            <rect x="314" y="266" width="26" height="132" rx="13" fill="url(#alfred-teal)"/>
          </g>
        </g>

        <!-- ── Cou ─────────────────────────────────────────────── -->
        <path d="M154,184 L246,184 L246,228 L154,228 Z" fill="url(#alfred-cou)" stroke="#1b1b1b" stroke-width="3.5" stroke-linejoin="round"/>

        <!-- ── Corps ───────────────────────────────────────────── -->
        <g id="alfred-corps">
          <path d="M90,270 C90,228 136,218 200,218 C264,218 310,228 310,270 C318,330 300,394 258,418 C226,434 174,434 142,418 C100,394 82,330 90,270 Z" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <path d="M200,218 C264,218 310,228 310,270 C318,330 300,394 258,418 C240,426 220,434 200,434 Z" fill="url(#alfred-ombre-corps)" clip-path="url(#alfred-clip-corps)"/>
          <text x="200" y="324" text-anchor="middle" font-family="Poppins, Montserrat, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="35" font-weight="500" fill="#1b8590" letter-spacing="0.5">Alfred</text>
          <!-- ceinture avec boucle centrale -->
          <g clip-path="url(#alfred-clip-corps)">
            <path d="M76,356 L142,356 L142,374 L258,374 L258,356 L324,356" fill="none" stroke="#1b1b1b" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
            <path d="M76,356 L142,356 L142,374 L258,374 L258,356 L324,356" fill="none" stroke="#1b8590" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"/>
          </g>
        </g>

        <!-- ── Socle ───────────────────────────────────────────── -->
        <ellipse cx="200" cy="434" rx="50" ry="18" fill="url(#alfred-teal)" stroke="#1b1b1b" stroke-width="3.5"/>
        <rect x="160" y="416" width="80" height="22" rx="11" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>

        <!-- ── Tête ────────────────────────────────────────────── -->
        <g id="alfred-head" style="transform-origin:200px 188px;">
          <!-- bosse du dessus + oreilles (derrière la tête) -->
          <rect x="145" y="18" width="110" height="36" rx="18" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <rect x="40" y="92" width="32" height="58" rx="14" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <rect x="328" y="92" width="32" height="58" rx="14" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <!-- tête -->
          <rect x="68" y="40" width="264" height="150" rx="50" fill="#ffffff" stroke="#1b1b1b" stroke-width="3.5"/>
          <!-- visière -->
          <rect x="78" y="52" width="244" height="120" rx="40" fill="url(#alfred-visiere)" stroke="#1b1b1b" stroke-width="3"/>
          <g clip-path="url(#alfred-clip-visiere)" style="pointer-events:none;">
            <ellipse id="alfred-gloss-front" cx="150" cy="66" rx="66" ry="16" fill="rgba(255,255,255,0.09)"/>
            <path d="M88,96 Q90,62 122,58" stroke="rgba(255,255,255,0.35)" stroke-width="4" stroke-linecap="round" fill="none"/>
            <!-- écran qui s'assombrit en veille (voir setAlfredState 'sleep') -->
            <rect id="alfred-visiere-nuit" x="78" y="52" width="244" height="120" rx="40" fill="#03202a" opacity="0" style="transition:opacity .9s ease;"/>
          </g>

          <!-- yeux : chaque œil = un groupe déplaçable (regard) contenant un
               tracé unique (4 cubiques, voir FORMES_OEIL) morphé entre formes,
               + une pupille (visible seulement dans les formes rondes) -->
          <g id="alfred-eye-l" style="transform-origin:142px 104px;">
            <g transform="translate(142,104)">
              <path id="alfred-eye-l-cercle" d="M-25,0 C-25,-13.8 -13.8,-25 0,-25 C13.8,-25 25,-13.8 25,0 C25,0 16,0 0,0 C-16,0 -25,0 -25,0 Z" fill="url(#alfred-oeil)" stroke="#1ee6d6" stroke-width="3" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px rgba(30,230,214,.7));"/>
              <g id="alfred-pupille-l" style="opacity:0;transition:opacity .18s;">
                <circle cx="0" cy="-9" r="8.5" fill="#0b3f4a"/>
                <circle cx="3" cy="-12" r="2.8" fill="#ffffff"/>
              </g>
                </g>
          </g>
          <g id="alfred-eye-r" style="transform-origin:258px 104px;">
            <g transform="translate(258,104)">
              <path id="alfred-eye-r-cercle" d="M-25,0 C-25,-13.8 -13.8,-25 0,-25 C13.8,-25 25,-13.8 25,0 C25,0 16,0 0,0 C-16,0 -25,0 -25,0 Z" fill="url(#alfred-oeil)" stroke="#1ee6d6" stroke-width="3" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px rgba(30,230,214,.7));"/>
              <g id="alfred-pupille-r" style="opacity:0;transition:opacity .18s;">
                <circle cx="0" cy="-9" r="8.5" fill="#0b3f4a"/>
                <circle cx="3" cy="-12" r="2.8" fill="#ffffff"/>
              </g>
            </g>
          </g>
          <g id="alfred-lids" style="display:none;"></g>

          <!-- bouche -->
          <path id="alfred-mouth" d="${ALFRED_BOUCHE_SOURIRE_D}" fill="#1ee6d6" stroke="#1ee6d6" stroke-width="3" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px rgba(30,230,214,.7));"/>
          <!-- intérieur sombre visible quand la bouche s'ouvre franchement (voir animateMouth) -->
          <path id="alfred-mouth-int" d="${ALFRED_BOUCHE_SOURIRE_D}" fill="#083a44" opacity="0" style="pointer-events:none;"/>
          <ellipse id="alfred-mouth-talk" cx="200" cy="138" rx="14" ry="0" fill="#1ee6d6" style="display:none;"/>
        </g>
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

  // Refait le 06/09 ("il faudrait que ce soit clair que Gemini c'est pour
  // le FR et ElevenLabs pour le NL") : deux sections, chacune avec son
  // moteur, son test et ses réglages.
  function sectionTitre(texte, sousTexte) {
    const bloc = document.createElement('div');
    bloc.style.cssText = 'margin:14px 0 6px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12);';
    const t = document.createElement('div');
    t.textContent = texte;
    t.style.cssText = 'color:#5fe3ea;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;';
    bloc.appendChild(t);
    if (sousTexte) {
      const s = document.createElement('div');
      s.textContent = sousTexte;
      s.style.cssText = 'color:rgba(255,255,255,.45);font-size:10px;margin-top:3px;line-height:1.4;';
      bloc.appendChild(s);
    }
    return bloc;
  }
  const styleBouton = 'padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:12px;cursor:pointer;';

  // ══ FRANÇAIS — Gemini TTS ══════════════════════════════════════
  panel.appendChild(sectionTitre('🇫🇷 Français — Gemini TTS (Google)', 'Toutes les répliques FR. Voix + consigne de ton ci-dessous.'));

  panel.appendChild(champLabel('Voix Gemini'));
  const selectVoix = document.createElement('select');
  selectVoix.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:#0a3b52;color:#fff;font-size:12px;margin-bottom:10px;';
  GEMINI_VOIX_CATALOGUE.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id; opt.textContent = v.label;
    opt.style.cssText = 'background:#0a3b52;color:#fff;';
    selectVoix.appendChild(opt);
  });
  selectVoix.value = voixGeminiActuelle();
  selectVoix.onchange = () => {
    localStorage.setItem(ALFRED_GEMINI_VOIX_KEY, selectVoix.value);
    if (typeof appliquerChoixVoix === 'function') appliquerChoixVoix();
  };
  panel.appendChild(selectVoix);

  panel.appendChild(champLabel('Ton (consigne donnée à Gemini)'));
  const taTon = document.createElement('textarea');
  taTon.value = tonGemini();
  taTon.rows = 4;
  taTon.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:11px;font-family:sans-serif;resize:vertical;margin-bottom:8px;';
  taTon.oninput = () => localStorage.setItem(ALFRED_GEMINI_TON_KEY, taTon.value);
  panel.appendChild(taTon);

  // Test avec une vraie réplique du script (plus parlant qu'une phrase de
  // démo) et son émotion, pour juger la voix telle qu'elle sera en scène.
  function repliqueTest(langue) {
    const R = (typeof ALFRED_CONFIG !== 'undefined') && ALFRED_CONFIG[langue === 'nl' ? 'REPLIQUES_NL' : 'REPLIQUES_FR'];
    const r = Array.isArray(R) && R.find(x => x.label === 'ServeursAJour');
    return r ? { texte: r.texte, emotion: r.emotion } : { texte: langue === 'nl' ? "Goeiedag, ik ben Alfred." : "Bonjour, je suis Alfred.", emotion: undefined };
  }
  async function jouerTest(btn, generer) {
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = '… génération';
    try {
      if (typeof stopAudio === 'function') stopAudio();
      const audio = await generer();
      currentAudio = audio;
      await audio.play();
    } catch (e) {
      console.warn('[Alfred Voice] Test de voix échoué:', e);
      alert(e && e.quotaExceeded ? e.message : 'Cette voix n\'a pas pu être générée (réseau, Voice ID, ou clé API côté serveur). Regarde la console pour le détail.');
    } finally { btn.disabled = false; btn.textContent = original; }
  }
  const btnTesterFR = document.createElement('button');
  btnTesterFR.textContent = '▶ Tester la voix FR (réplique du script)';
  btnTesterFR.style.cssText = styleBouton + 'width:100%;margin-bottom:4px;';
  btnTesterFR.onclick = () => { const t = repliqueTest('fr'); jouerTest(btnTesterFR, () => genererAudioGemini(t.texte, selectVoix.value, taTon.value, 'fr')); };
  panel.appendChild(btnTesterFR);

  // ══ NÉERLANDAIS — ElevenLabs ═══════════════════════════════════
  panel.appendChild(sectionTitre('🇳🇱 Nederlands — ElevenLabs (voix flamandes)',
    'Toutes les répliques NL utilisent la voix cochée ci-dessous (modèle eleven_v3 + émotions). Sans voix cochée : repli Gemini nl-NL (accent Pays-Bas).'));

  const candidatsElevenLabs = chargerCandidatsElevenLabsNL();
  const voixActiveActuelle = (typeof voixElevenLabsNL === 'function') ? voixElevenLabsNL() : '';
  const infosElevenLabs = chargerInfosElevenLabs();
  const zoneCandidats = document.createElement('div');
  zoneCandidats.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin:8px 0 8px;';

  candidatsElevenLabs.forEach((candidat, i) => {
    const ligne = document.createElement('div');
    ligne.style.cssText = 'display:flex;gap:8px;align-items:flex-start;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 8px;';
    if (candidat.voiceId && candidat.voiceId === voixActiveActuelle) ligne.style.borderColor = 'rgba(95,227,234,.6)';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'alfred-elevenlabs-actif';
    radio.title = 'Utiliser cette voix pour le NL';
    radio.checked = !!candidat.voiceId && candidat.voiceId === voixActiveActuelle;
    radio.style.cssText = 'flex:none;cursor:pointer;margin-top:4px;';

    const colonne = document.createElement('div');
    colonne.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;';

    const info = candidat.voiceId ? infosElevenLabs[candidat.voiceId] : null;
    const nom = document.createElement('div');
    nom.style.cssText = 'color:#fff;font-size:12px;font-weight:600;';
    nom.textContent = (info && info.ok !== false && info.name) ? info.name : (candidat.label || (candidat.voiceId ? `Voix #${i + 1}` : 'Emplacement libre'));
    colonne.appendChild(nom);
    const desc = document.createElement('div');
    desc.style.cssText = 'color:rgba(255,255,255,.55);font-size:10px;line-height:1.35;';
    const txtDesc = decrireVoixElevenLabs(info);
    desc.textContent = txtDesc || (candidat.voiceId ? 'Description inconnue — clique « Récupérer noms et descriptions ».' : '');
    if (info && info.ok === false) desc.style.color = '#ffb4a2';
    if (txtDesc || candidat.voiceId) colonne.appendChild(desc);

    const inputId = document.createElement('input');
    inputId.type = 'text';
    inputId.placeholder = 'Voice ID (elevenlabs.io/voice-library)';
    inputId.value = candidat.voiceId || '';
    inputId.style.cssText = 'width:100%;box-sizing:border-box;padding:4px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.2);color:rgba(255,255,255,.7);font-size:10px;font-family:monospace;';
    colonne.appendChild(inputId);

    function sauverLigne() {
      candidatsElevenLabs[i] = { label: candidat.label || '', voiceId: inputId.value.trim() };
      enregistrerCandidatsElevenLabsNL(candidatsElevenLabs);
      if (radio.checked) localStorage.setItem(ALFRED_ELEVENLABS_VOIX_NL_KEY, inputId.value.trim());
    }
    inputId.oninput = sauverLigne;
    radio.onchange = () => { if (radio.checked) { localStorage.setItem(ALFRED_ELEVENLABS_VOIX_NL_KEY, inputId.value.trim()); ouvrirPanneauVoix(); } };

    const btnTester = document.createElement('button');
    btnTester.textContent = '▶';
    btnTester.title = 'Tester cette voix avec une réplique du script (NL)';
    btnTester.style.cssText = styleBouton + 'flex:none;padding:6px 10px;';
    btnTester.onclick = () => {
      const voiceId = inputId.value.trim();
      if (!voiceId) { alert('Colle d\'abord un Voice ID ElevenLabs (depuis elevenlabs.io/voice-library).'); return; }
      const t = repliqueTest('nl');
      jouerTest(btnTester, () => genererAudioElevenLabs(t.texte, voiceId, t.emotion));
    };

    ligne.appendChild(radio);
    ligne.appendChild(colonne);
    ligne.appendChild(btnTester);
    zoneCandidats.appendChild(ligne);
  });
  panel.appendChild(zoneCandidats);

  const zoneInfos = document.createElement('div');
  zoneInfos.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';
  const btnInfos = document.createElement('button');
  btnInfos.textContent = '↻ Récupérer noms et descriptions';
  btnInfos.title = 'Lit nom, description et étiquettes de chaque voix via l\'API ElevenLabs (la voix doit être ajoutée à ton compte : « Add to my voices »)';
  btnInfos.style.cssText = styleBouton + 'flex:1;';
  btnInfos.onclick = async () => {
    btnInfos.disabled = true; btnInfos.textContent = '… lecture';
    try {
      await recupererInfosElevenLabs(candidatsElevenLabs.map(c => c.voiceId));
      ouvrirPanneauVoix();
    } catch (e) {
      console.warn('[Alfred Voice] Infos ElevenLabs :', e);
      alert('Impossible de lire les infos des voix : ' + (e && e.message || e) + '\n(api/elevenlabs-voix.js doit être déployé sur Vercel.)');
      btnInfos.disabled = false; btnInfos.textContent = '↻ Récupérer noms et descriptions';
    }
  };
  zoneInfos.appendChild(btnInfos);
  const btnCompte = document.createElement('button');
  btnCompte.textContent = '☰ Voix du compte';
  btnCompte.title = 'Liste toutes les voix de ton compte ElevenLabs, pour en ajouter une dans un emplacement libre';
  btnCompte.style.cssText = styleBouton + 'flex:none;';
  btnCompte.onclick = async () => {
    btnCompte.disabled = true;
    try {
      const voix = await recupererInfosElevenLabs([], { toutes: true });
      const dejaLa = new Set(candidatsElevenLabs.map(c => c.voiceId));
      const choix = voix.filter(v => !dejaLa.has(v.voiceId));
      if (!choix.length) { alert('Toutes les voix du compte sont déjà dans la liste.'); return; }
      const liste = choix.map((v, k) => `${k + 1}. ${v.name} — ${decrireVoixElevenLabs(v) || v.category}`).join('\n');
      const rep = prompt('Voix du compte ElevenLabs — numéro à ajouter dans un emplacement libre :\n\n' + liste);
      const k = parseInt(rep, 10) - 1;
      if (!(k >= 0 && k < choix.length)) return;
      const vide = candidatsElevenLabs.find(c => !c.voiceId);
      if (!vide) { alert('Aucun emplacement libre : efface d\'abord un Voice ID.'); return; }
      vide.voiceId = choix[k].voiceId; vide.label = choix[k].name;
      enregistrerCandidatsElevenLabsNL(candidatsElevenLabs);
      ouvrirPanneauVoix();
    } catch (e) {
      alert('Impossible de lister les voix du compte : ' + (e && e.message || e));
    } finally { btnCompte.disabled = false; }
  };
  zoneInfos.appendChild(btnCompte);
  panel.appendChild(zoneInfos);

  // Première ouverture : si des voix n'ont pas encore d'infos, on les lit
  // automatiquement (une fois), sans bloquer le panneau.
  const sansInfos = candidatsElevenLabs.filter(c => c.voiceId && !infosElevenLabs[c.voiceId]).map(c => c.voiceId);
  if (sansInfos.length && (typeof ALFRED_CONFIG !== 'undefined') && ALFRED_CONFIG.API_ELEVENLABS_VOIX && !ouvrirPanneauVoix._infosTentees) {
    ouvrirPanneauVoix._infosTentees = true;
    recupererInfosElevenLabs(sansInfos).then(() => ouvrirPanneauVoix()).catch(e => console.warn('[Alfred Voice] Infos ElevenLabs (auto) :', e && e.message));
  }

  panel.appendChild(champLabel('Expressivité ElevenLabs v3 (NL)'));
  const selExpr = document.createElement('select');
  selExpr.style.cssText = 'width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:#0a3b52;color:#fff;font-size:12px;margin-bottom:14px;';
  [['naturel', 'Naturel — stable, une indication de jeu par réplique'], ['expressif', 'Expressif — stable, indication de jeu répétée à chaque phrase (recommandé)'], ['creatif', 'Créatif — le plus expressif mais instable (stabilité 0)']].forEach(([val, txt]) => {
    const o = document.createElement('option'); o.value = val; o.textContent = txt; o.style.cssText = 'background:#0a3b52;color:#fff;'; selExpr.appendChild(o);
  });
  selExpr.value = (typeof expressiviteElevenLabs === 'function') ? expressiviteElevenLabs() : 'naturel';
  selExpr.onchange = () => {
    localStorage.setItem(ALFRED_ELEVENLABS_EXPRESSIVITE_KEY, selExpr.value);
    console.log('[Alfred Voice] Expressivité ElevenLabs v3 :', selExpr.value, '— l\'audio NL sera régénéré (relancer le préchargement).');
  };
  panel.appendChild(selExpr);

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
const ALFRED_ELEVENLABS_NB_CANDIDATS = 8;
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
  '9kBSa5emtWArU7U0792v', // ajoutée le 06/09 (lien elevenlabs.io/voices/… envoyé par le client)
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
  // Un ID ajouté aux défauts APRÈS un premier enregistrement local (ex. la
  // voix envoyée le 06/09) n'apparaissait jamais : la liste locale prime.
  // On glisse les défauts manquants dans les emplacements vides.
  for (const id of ALFRED_ELEVENLABS_CANDIDATS_DEFAUT) {
    if (liste.some(l => l.voiceId === id)) continue;
    const vide = liste.find(l => !l.voiceId);
    if (vide) vide.voiceId = id;
  }
  return liste.slice(0, ALFRED_ELEVENLABS_NB_CANDIDATS);
}
// Infos (nom, description, étiquettes) des voix ElevenLabs, lues via
// api/elevenlabs-voix.js et gardées en local — voir ouvrirPanneauVoix.
const ALFRED_ELEVENLABS_INFOS_KEY = 'alfred_elevenlabs_infos';
function chargerInfosElevenLabs() {
  try { return JSON.parse(localStorage.getItem(ALFRED_ELEVENLABS_INFOS_KEY) || '{}') || {}; } catch (e) { return {}; }
}
async function recupererInfosElevenLabs(ids, opts) {
  const url = (typeof ALFRED_CONFIG !== 'undefined') && ALFRED_CONFIG.API_ELEVENLABS_VOIX;
  if (!url) throw new Error('API_ELEVENLABS_VOIX non configurée');
  const q = (opts && opts.toutes) ? 'all=1' : 'ids=' + encodeURIComponent(ids.filter(Boolean).join(','));
  const res = await fetch(url + '?' + q);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const infos = chargerInfosElevenLabs();
  for (const v of (data.voices || [])) infos[v.voiceId] = v;
  localStorage.setItem(ALFRED_ELEVENLABS_INFOS_KEY, JSON.stringify(infos));
  return data.voices || [];
}
function decrireVoixElevenLabs(info) {
  if (!info) return '';
  if (info.ok === false) return info.erreur || '';
  const l = info.labels || {};
  const morceaux = [l.gender, l.age, l.accent || l.language, l.use_case || l.usecase, l.descriptive || l.description].filter(Boolean);
  return [morceaux.join(' · '), info.description].filter(Boolean).join(' — ');
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
      50%      { transform:translateY(-7px) scale(1.024); }
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
  // Hors 'talk' : plus de jeu d'acteur en cours (temps forts programmés,
  // gestes de bras) et retour à l'expression neutre — voir demarrerJeuDActeur.
  if (state !== 'talk' && typeof arreterJeuDActeur === 'function') arreterJeuDActeur();

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
  if (head)   { head.style.animation='none'; head.style.transition = 'transform .5s ease'; head.style.transform=''; setTimeout(() => { if (head && curState !== 'sleep') head.style.transition = ''; }, 550); }
  { const nuit = document.getElementById('alfred-visiere-nuit'); if (nuit) nuit.setAttribute('opacity', '0'); }
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
      // Yeux ronds à pupille qui balayent de gauche à droite : "il cherche".
      if (typeof definirExpression === 'function') definirExpression('rond', 260);
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
      // Paupières qui se ferment lentement (morphing vers le trait), plus
      // d'yeux qui disparaissent en fondu.
      // Visage de veille (revu le 06/09, "pourquoi le visage a été simplifié
      // pour dormir ?") : paupières détendues en arc, écran de la visière
      // qui s'assombrit, tête qui tombe un peu sur le côté, respiration
      // lente (wrap) — pas un simple trait.
      if (typeof definirExpression === 'function') definirExpression('dormir', 900);
      if (mouth)  mouth.setAttribute('d', ALFRED_BOUCHE_DORMIR_D);
      { const nuit = document.getElementById('alfred-visiere-nuit'); if (nuit) nuit.setAttribute('opacity', '0.42'); }
      if (head)   { head.style.transition = 'transform 1.4s ease'; head.style.transform = 'rotate(5deg) translateY(5px)'; }
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
  const mouth      = document.getElementById('alfred-mouth');
  const mouthTalk  = document.getElementById('alfred-mouth-talk');
  if (!body || !eyeR || !eyeLCercle || typeof attendre !== 'function') {
    console.warn('[Alfred UI] clinDoeil() interrompue — élément(s) introuvable(s):', { body: !!body, eyeR: !!eyeR, eyeLCercle: !!eyeLCercle, attendre: typeof attendre });
    return;
  }
  console.log('[Alfred UI] clinDoeil() — tous les éléments trouvés, geste en cours.');

  clinDoeilActif = true;

  body.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)';
  body.style.transform  = 'rotate(8deg)';
  // Œil gauche fermé par morphing (voir FORMES_OEIL), l'œil droit reste
  // dans l'expression du moment.
  morpherOeil('l', 'ferme', 140);
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
  morpherOeil('l', etatYeux.r.forme, 200);

  clinDoeilActif = false;
}

function startBlinking() {
  // Au repos seulement : pendant 'talk', c'est demarrerJeuDActeur qui
  // programme les clignements (calés sur les phrases). Avant : un scaleY
  // CSS sur le groupe de l'œil, qui écrasait le translate du regard le
  // temps du clignement (l'œil sautait au centre) — remplacé par le
  // morphing de forme (cligner, plus haut).
  function blink() {
    if (curState === 'idle' && typeof cligner === 'function' && !robotEteint) {
      cligner();
      if (Math.random() < 0.15) setTimeout(cligner, 260); // double clignement, de temps en temps
    }
    setTimeout(blink, 2000 + Math.random() * 4000);
  }
  setTimeout(blink, 2000);
}

let dernierMouvementSouris = 0;
function trackMouse() {
  document.addEventListener('mousemove', e => {
    if (curState !== 'idle') return;
    const svg = document.getElementById('alfred-svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Amplitude relevée (±8/±4 → ±12/±6) et diviseurs réduits le 06/09 : avec
    // le robot (yeux en "D" sans pupille), le suivi de la souris était à
    // peine perceptible. La tête suit aussi le regard (voir startEyeLerp).
    eyeTargetX = Math.max(-12, Math.min(12, (e.clientX-(rect.left+rect.width/2))/22));
    eyeTargetY = Math.max(-6,  Math.min(6,  (e.clientY-(rect.top+rect.height*.22))/35));
    dernierMouvementSouris = performance.now();
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
      // Saccade : quand la cible est loin, l'œil y saute vite (balistique),
      // puis se fixe avec une dérive lente — au lieu d'un glissement mou.
      const dist = Math.hypot(eyeTargetX - eyeCurX, eyeTargetY - eyeCurY);
      const k = dist > 1.5 ? 0.5 : 0.08;
      eyeCurX += (eyeTargetX - eyeCurX) * k;
      eyeCurY += (eyeTargetY - eyeCurY) * k;
      const eL = document.getElementById('alfred-eye-l');
      const eR = document.getElementById('alfred-eye-r');
      if (eL) eL.style.transform = `translate(${eyeCurX.toFixed(2)}px,${eyeCurY.toFixed(2)}px)`;
      if (eR) eR.style.transform = `translate(${eyeCurX.toFixed(2)}px,${eyeCurY.toFixed(2)}px)`;
      // Pupilles (visibles dans les formes rondes) : elles se déplacent un
      // peu plus que l'œil lui-même — c'est ce qui donne un vrai regard.
      const pL = document.getElementById('alfred-pupille-l');
      const pR = document.getElementById('alfred-pupille-r');
      const tp = `translate(${(eyeCurX * .9).toFixed(2)}px,${(eyeCurY * .7).toFixed(2)}px)`;
      if (pL) pL.style.transform = tp;
      if (pR) pR.style.transform = tp;
    }
    composerTete();
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
  // Revu le 06/09 : de vraies saccades — la plupart du temps un petit saut
  // (±4) autour de la cible actuelle toutes les 0,8–2 s, parfois (1 fois
  // sur 4) un vrai regard ailleurs, puis retour vers la salle (0).
  let prochain = 2000 + Math.random() * 2000;
  if (robotEteint || performance.now() < regardDirigeJusqua) {
    setTimeout(balayageRegardEnParlant, 600);
    return;
  }
  if (curState === 'talk' && !gesteMontrerActif) {
    if (Math.random() < 0.25) { eyeTargetX = (Math.random() - 0.5) * 16; eyeTargetY = (Math.random() - 0.5) * 6; prochain = 1200 + Math.random() * 1200; }
    else { eyeTargetX = Math.max(-10, Math.min(10, eyeTargetX * 0.5 + (Math.random() - 0.5) * 6)); eyeTargetY = Math.max(-4, Math.min(4, eyeTargetY * 0.5 + (Math.random() - 0.5) * 3)); prochain = 800 + Math.random() * 1200; }
  } else if (curState === 'idle' && performance.now() - dernierMouvementSouris > 3500) {
    // Au repos sans souris : un coup d'œil ailleurs de temps en temps,
    // puis retour devant — il "regarde la salle" au lieu de fixer le vide.
    eyeTargetX = (Math.random() - 0.5) * 14; eyeTargetY = (Math.random() - 0.5) * 5;
    setTimeout(() => { if (curState === 'idle' && performance.now() - dernierMouvementSouris > 3500) { eyeTargetX = 0; eyeTargetY = 0; } }, 900 + Math.random() * 900);
    prochain = 3500 + Math.random() * 4000;
  }
  setTimeout(balayageRegardEnParlant, prochain);
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
// JEU D'ACTEUR — expressions des yeux, gestes des bras, rythme du texte
// ══════════════════════════════════════════════════════════════════════
// Demandé par Cyril (06/09) après ses vidéos d'exemple : "qu'Alfred s'anime
// en fonction du script", de façon fluide. Choix : tout est CODÉ (SVG +
// interpolation JS + Web Animations API), pas de vidéos pré-rendues — une
// vidéo a une durée fixe alors que chaque réplique a la sienne (audio réel
// ElevenLabs/Gemini, vitesse par moteur), et ne peut ni suivre la souris ni
// réagir à ce qui se passe dans l'appli. Ici tout est calé sur la VRAIE
// durée de l'audio (voir demarrerJeuDActeur, appelé par speak()).
//
// Trois couches, du plus fin au plus large :
//  1. YEUX — chaque œil est UN tracé (4 courbes cubiques fermées, voir
//     FORMES_OEIL) morphé entre des formes : "D" normal, rond avec pupille
//     (regard qui se promène, comme dans la vidéo de Cyril), grand rond
//     (surprise), croissant "joie" (yeux fermés de plaisir), trait (fermé /
//     clignement / clin d'œil), plissé (assuré, taquin). Les clignements ne
//     passent plus par un scaleY CSS (qui écrasait le translate du regard et
//     faisait sauter l'œil) mais par le même morphing.
//  2. BRAS / TÊTE / CORPS — gestes courts via element.animate() (Web
//     Animations API) : ils passent PAR-DESSUS les animations CSS d'état
//     (bras qui bougent en parlant) le temps du geste, puis celles-ci
//     reprennent seules — aucun conflit d'inline style à gérer.
//  3. RYTHME DU TEXTE — au démarrage réel de l'audio, on découpe la réplique
//     en phrases, on estime le début de chacune (au prorata des caractères
//     sur la durée réelle) et on programme des "temps forts" : clignement +
//     léger mouvement de tête + regard qui change à chaque nouvelle phrase,
//     yeux ronds qui montent sur une question, gros yeux brefs sur une
//     exclamation, yeux plissés + regard de côté sur des points de
//     suspension. L'émotion de la réplique (voir EMOTIONS_VOIX, la même que
//     pour la voix) choisit l'expression de base, et un `geste` optionnel
//     par réplique (alfred-config.js) déclenche un geste de bras.

// 12 points (x,y) en coordonnées locales de l'œil : (0,0) = bas-centre.
// Tracé : M p0 C p1 p2 p3 C p4 p5 p6 C p7 p8 p9 C p10 p11 p0 Z
const FORMES_OEIL = {
  normal: [-25,0, -25,-13.8, -13.8,-25, 0,-25, 13.8,-25, 25,-13.8, 25,0, 25,0, 16,0, 0,0, -16,0, -25,0],
  douce:  [-25,0, -25,-10.5, -13.8,-19, 0,-19, 13.8,-19, 25,-10.5, 25,0, 25,0, 16,0, 0,0, -16,0, -25,0],
  plisse: [-25,0, -25,-6, -13.8,-11, 0,-11, 13.8,-11, 25,-6, 25,0, 25,0, 16,0, 0,0, -16,0, -25,0],
  rond:   [-16,-11, -16,-19.8, -8.8,-27, 0,-27, 8.8,-27, 16,-19.8, 16,-11, 16,-2.2, 8.8,5, 0,5, -8.8,5, -16,-2.2],
  grand:  [-20,-12, -20,-23, -11,-32, 0,-32, 11,-32, 20,-23, 20,-12, 20,-1, 11,8, 0,8, -11,8, -20,-1],
  joie:   [-25,-4, -18,-18, -8,-25, 0,-25, 8,-25, 18,-18, 25,-4, 22,-6, 10,-16, 0,-17, -10,-16, -22,-6],
  ferme:  [-22,-8, -14,-8, -6,-8, 0,-8, 6,-8, 14,-8, 22,-8, 14,-6.5, 6,-6.5, 0,-6.5, -6,-6.5, -14,-6.5],
  dormir: [-22,-7, -14,-2, -6,0.5, 0,1, 6,0.5, 14,-2, 22,-7, 14,-1, 6,3.5, 0,4, -6,3.5, -14,-1],
};
// Formes où la pupille est visible (yeux "ronds" de la vidéo de Cyril).
const FORMES_OEIL_AVEC_PUPILLE = { rond: true, grand: true };

function cheminOeil(p) {
  return `M${p[0]},${p[1]} C${p[2]},${p[3]} ${p[4]},${p[5]} ${p[6]},${p[7]} C${p[8]},${p[9]} ${p[10]},${p[11]} ${p[12]},${p[13]} C${p[14]},${p[15]} ${p[16]},${p[17]} ${p[18]},${p[19]} C${p[20]},${p[21]} ${p[22]},${p[23]} ${p[0]},${p[1]} Z`;
}

// État par œil : forme courante (points), nom de la forme visée, rAF en cours.
const etatYeux = {
  l: { points: FORMES_OEIL.normal.slice(), forme: 'normal', raf: null },
  r: { points: FORMES_OEIL.normal.slice(), forme: 'normal', raf: null },
};
// Expression "de repos" du moment (celle à laquelle reviennent les
// clignements) — 'normal' hors réplique, choisie par l'émotion pendant.
let expressionBase = 'normal';

function morpherOeil(cote, forme, dureeMs) {
  const etat  = etatYeux[cote];
  const cible = FORMES_OEIL[forme];
  const path  = document.getElementById(`alfred-eye-${cote}-cercle`);
  if (!etat || !cible || !path) return;
  etat.forme = forme;
  const pupille = document.getElementById(`alfred-pupille-${cote}`);
  if (pupille) pupille.style.opacity = FORMES_OEIL_AVEC_PUPILLE[forme] ? '1' : '0';
  if (etat.raf) cancelAnimationFrame(etat.raf);
  const depart = etat.points.slice();
  const duree  = Math.max(1, dureeMs == null ? 180 : dureeMs);
  const t0     = performance.now();
  function pas(now) {
    const k = Math.min(1, (now - t0) / duree);
    const e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k; // ease-in-out
    for (let i = 0; i < depart.length; i++) etat.points[i] = depart[i] + (cible[i] - depart[i]) * e;
    path.setAttribute('d', cheminOeil(etat.points));
    etat.raf = k < 1 ? requestAnimationFrame(pas) : null;
  }
  etat.raf = requestAnimationFrame(pas);
}

// Les deux yeux ensemble. `base: true` = c'est la nouvelle expression de
// repos (les clignements y reviendront) ; sinon expression passagère.
function definirExpression(forme, dureeMs, opts) {
  if (!FORMES_OEIL[forme]) forme = 'normal';
  if (opts && opts.base) expressionBase = forme;
  morpherOeil('l', forme, dureeMs);
  morpherOeil('r', forme, dureeMs);
}

// Clignement : fermeture rapide puis retour à l'expression de repos. Ignoré
// si les yeux sont déjà fermés (sommeil, clin d'œil) ou en pleine forme
// passagère marquée (question, surprise) pour ne pas la casser.
let clignementEnCours = false;
function cligner() {
  if (clignementEnCours || clinDoeilActif) return;
  const f = etatYeux.l.forme;
  if (f === 'ferme' || f === 'grand') return;
  clignementEnCours = true;
  const retour = f;
  definirExpression('ferme', 70);
  setTimeout(() => {
    // Si entre-temps quelqu'un a changé l'expression, on ne réécrase pas.
    if (etatYeux.l.forme === 'ferme') definirExpression(retour === 'ferme' ? expressionBase : retour, 130);
    clignementEnCours = false;
  }, 110);
}

// Expression de base selon l'émotion de la réplique (mêmes clés que
// EMOTIONS_VOIX dans alfred-voice.js). `entree` = forme tenue au tout début
// de la réplique avant de revenir à `base` (ex. amusé : yeux fermés de
// plaisir sur la première phrase, puis normaux).
const EXPRESSIONS_PAR_EMOTION = {
  amuse:      { entree: 'joie',   base: 'normal', entreeMs: 1600 },
  assure:     { entree: 'plisse', base: 'normal', entreeMs: 1400 },
  enjoue:     { entree: 'joie',   base: 'douce',  entreeMs: 1200 },
  taquin:     { entree: 'plisse', base: 'plisse', entreeMs: 0 },
  satisfait:  { entree: 'joie',   base: 'joie',   entreeMs: 0 },
  chaleureux: { entree: 'douce',  base: 'douce',  entreeMs: 0 },
  malicieux:  { entree: 'plisse', base: 'plisse', entreeMs: 0 },
  fier:       { entree: 'normal', base: 'normal', entreeMs: 0 },
};

// ── Gestes (bras / tête / corps) ─────────────────────────────────────
// Angles : origine de rotation à l'épaule (voir transform-origin des groupes
// alfred-arm-l/-r). Bras droit : angle NÉGATIF = s'ouvre vers l'extérieur
// (monte à droite) ; bras gauche : angle POSITIF = s'ouvre à gauche.
const animationsGestes = [];
function animerGeste(el, images, options) {
  if (!el || typeof el.animate !== 'function') return null;
  const a = el.animate(images, Object.assign({ fill: 'none', easing: 'ease-in-out' }, options));
  animationsGestes.push(a);
  a.finished.then(() => { const i = animationsGestes.indexOf(a); if (i >= 0) animationsGestes.splice(i, 1); }).catch(() => {});
  return a;
}
function annulerGestes() {
  animationsGestes.splice(0).forEach(a => { try { a.cancel(); } catch (e) {} });
}
function elementsGeste() {
  return {
    armL: document.getElementById('alfred-arm-l'),
    armR: document.getElementById('alfred-arm-r'),
    head: document.getElementById('alfred-head'),
    body: document.getElementById('alfred-body-main'),
  };
}
// Images-clés d'un geste de bras avec anticipation (petit mouvement inverse
// avant), tenue, et retour amorti (léger dépassement de l'autre côté avant
// de se poser) : rien ne part ni ne s'arrête net.
function imagesBras(pic) {
  const s = Math.sign(pic) || 1;
  return [
    { transform: 'rotate(0deg)', offset: 0 }, { transform: `rotate(${-s * 7}deg)`, offset: .07 },
    { transform: `rotate(${pic}deg)`, offset: .27 }, { transform: `rotate(${pic * .93}deg)`, offset: .78 },
    { transform: `rotate(${-s * 4}deg)`, offset: .94 }, { transform: 'rotate(0deg)', offset: 1 },
  ];
}
const GESTES = {
  // Petit salut de la main droite (Ouverture) — comme dans la vidéo de Cyril.
  saluer() {
    const { armR } = elementsGeste();
    animerGeste(armR, [
      { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(8deg)', offset: .05 },
      { transform: 'rotate(-158deg)', offset: .22 }, { transform: 'rotate(-136deg)', offset: .36 },
      { transform: 'rotate(-162deg)', offset: .50 }, { transform: 'rotate(-138deg)', offset: .64 },
      { transform: 'rotate(-156deg)', offset: .78 }, { transform: 'rotate(5deg)', offset: .95 },
      { transform: 'rotate(0deg)', offset: 1 },
    ], { duration: 2700 });
    setTimeout(() => { tangage -= 3; definirPostureTete(-4, 0, 0.08); }, 140);
    setTimeout(() => definirPostureTete(0, 0, 0.03), 2200);
  },
  // Bras droit tendu vers l'extérieur, tenu : "regardez", "au stand".
  presenter() {
    const { armR } = elementsGeste();
    animerGeste(armR, imagesBras(-82), { duration: 2400 });
    animerGeste(document.getElementById('alfred-posture'), [{ transform: 'none' }, { transform: autour('corps', 'rotate(2.5deg)'), offset: .25 }, { transform: autour('corps', 'rotate(2.3deg)'), offset: .8 }, { transform: 'none' }], { duration: 2400, delay: 180 });
  },
  // Les deux bras qui s'ouvrent ("Allez-y", "Stel ze maar") — invitation.
  ouvrir() {
    const { armL, armR } = elementsGeste();
    animerGeste(armL, imagesBras(74), { duration: 2400 });
    animerGeste(armR, imagesBras(-74), { duration: 2400, delay: 130 });
    setTimeout(() => definirPostureTete(0, -4, 0.08), 200);
    setTimeout(() => definirPostureTete(0, 0, 0.03), 1900);
  },
  // "Pas si vite !" — main droite levée, sèche, tenue un instant.
  stop() {
    const { armR } = elementsGeste();
    animerGeste(armR, [
      { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(9deg)', offset: .06 }, { transform: 'rotate(-122deg)', offset: .16 },
      { transform: 'rotate(-112deg)', offset: .24 }, { transform: 'rotate(-114deg)', offset: .75 }, { transform: 'rotate(4deg)', offset: .94 }, { transform: 'rotate(0deg)', offset: 1 },
    ], { duration: 1900 });
    setTimeout(() => { tangage += 4; definirPostureTete(6, 0, 0.1); }, 120);
    setTimeout(() => definirPostureTete(0, 0, 0.03), 1500);
  },
  // Fier : torse bombé, menton levé, bras légèrement en arrière.
  fier() {
    const { armL, armR } = elementsGeste();
    animerGeste(document.getElementById('alfred-posture'), [{ transform: 'none' }, { transform: autour('corps', 'translateY(2px) scale(.99)'), offset: .08 }, { transform: autour('corps', 'scale(1.035) translateY(-4px)'), offset: .3 }, { transform: autour('corps', 'scale(1.03) translateY(-3px)'), offset: .8 }, { transform: 'none' }], { duration: 2600 });
    animerGeste(armL, imagesBras(22), { duration: 2600, delay: 150 });
    animerGeste(armR, imagesBras(-22), { duration: 2600, delay: 270 });
    setTimeout(() => definirPostureTete(-2, -5, 0.07), 220);
    setTimeout(() => definirPostureTete(0, 0, 0.03), 2200);
  },
  // Hochement franc ("Exactement.", "Je suis né prêt.").
  hocher() {
    hochVel += 7; setTimeout(() => { hochVel += 6; }, 420);
  },
  // Réfléchir : tête penchée, regard en l'air, bras droit à demi levé.
  reflechir() {
    const { armR } = elementsGeste();
    animerGeste(armR, imagesBras(-48), { duration: 2400 });
    setTimeout(() => definirPostureTete(8, -2, 0.08), 150);
    definirExpression('rond', 220); eyeTargetX = 7; eyeTargetY = -6;
    setTimeout(() => { if (curState === 'talk') { definirExpression(expressionBase, 220); eyeTargetX = 0; eyeTargetY = 0; } definirPostureTete(0, 0, 0.03); }, 2000);
  },
  // Petit rebond joyeux (corps + bras) pour une exclamation.
  rebondir() {
    const { armL, armR } = elementsGeste();
    animerGeste(document.getElementById('alfred-posture'), [{ transform: 'none' }, { transform: autour('corps', 'translateY(3px) scale(.985)'), offset: .15 }, { transform: autour('corps', 'translateY(-9px)'), offset: .5 }, { transform: autour('corps', 'translateY(1px)'), offset: .85 }, { transform: 'none' }], { duration: 640 });
    animerGeste(armL, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-5deg)', offset: .15 }, { transform: 'rotate(28deg)', offset: .5 }, { transform: 'rotate(-3deg)', offset: .88 }, { transform: 'rotate(0deg)' }], { duration: 680, delay: 60 });
    animerGeste(armR, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(5deg)', offset: .15 }, { transform: 'rotate(-28deg)', offset: .5 }, { transform: 'rotate(3deg)', offset: .88 }, { transform: 'rotate(0deg)' }], { duration: 680, delay: 160 });
    hochVel += 3;
  },
  // Légère inclinaison de tête (changement de phrase), sens alterné.
  pencher(sens) {
    tangage += (sens || 1) * 4;
  },
};
function jouerGeste(nom, arg) {
  const g = GESTES[nom];
  if (!g) { if (nom) console.warn('[Alfred UI] geste inconnu :', nom); return; }
  try { g(arg); } catch (e) { console.warn('[Alfred UI] geste', nom, 'a échoué :', e); }
}

// ── Hologrammes ──────────────────────────────────────────────────────
// Petites cartes flottantes qui apparaissent à côté du robot, en mode scène
// (actes 1 et 3), au moment précis où il prononce un mot-clé — champ
// optionnel `hologrammes` par réplique (alfred-config.js) : [{ mots: [...],
// titre, sous, icone }]. Même estimation mot/durée que les surlignages de
// champs (programmerSurbrillanceMots, alfred-voice.js). Elles alternent
// gauche/droite sur trois hauteurs, flottent, et s'effacent à la fin de la
// réplique. Alfred jette un coup d'œil vers chaque carte qui apparaît.
const ICONES_HOLO = {
  id:        '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16.5c.6-1.8 1.7-2.7 3-2.7s2.4.9 3 2.7M14 10h4M14 13.5h4"/></svg>',
  carte:     '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.2-6-10.5a6 6 0 0 1 12 0C18 15.8 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/></svg>',
  inondation:'<svg viewBox="0 0 24 24"><path d="M3 12c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/><path d="M3 17c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/><path d="M3 7c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/></svg>',
  serveur:   '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01"/></svg>',
  bouclier:  '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  cadenas:   '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2.5"/></svg>',
  badge:     '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5"/><path d="M12 6.5v5M9.5 9h5"/><path d="M9 13.5L7 21l5-2 5 2-2-7.5"/></svg>',
  globe:     '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/></svg>',
  horloge:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  eclair:    '<svg viewBox="0 0 24 24"><path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/></svg>',
  acte:      '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15h5M9.5 18h3"/></svg>',
  notaires:  '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M3.5 19c.6-3.5 2.6-5.5 5.5-5.5S13.9 15.5 14.5 19"/><path d="M15 18.5c.4-2.2 1.5-3.5 3.2-3.5s2.4 1.3 2.8 3.5"/></svg>',
  etincelles:'<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
  ecran:     '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M10 8.5l4 2-4 2z"/></svg>',
  salle:     '<svg viewBox="0 0 24 24"><circle cx="6" cy="8" r="2.2"/><circle cx="12" cy="7" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M2.5 18c.4-3 1.7-4.5 3.5-4.5s3.1 1.5 3.5 4.5M8.5 17c.4-3 1.7-4.5 3.5-4.5s3.1 1.5 3.5 4.5M14.5 18c.4-3 1.7-4.5 3.5-4.5s3.1 1.5 3.5 4.5"/></svg>',
};
let holoCompteur = 0;
function afficherHologramme(h) {
  const zone = document.getElementById('alfred-scene-holos');
  if (!zone || !modeSceneActif || !h) return;
  const n = holoCompteur++;
  const cote = n % 2 === 0 ? 'droite' : 'gauche';
  const rang = Math.floor(n / 2) % 3;
  const demiRobot = 110 * echelleScene() + 34;
  const el = document.createElement('div');
  el.className = 'alfred-holo ' + cote;
  const icone = ICONES_HOLO[h.icone];
  el.innerHTML = (icone ? `<div class="alfred-holo-icone">${icone}</div>` : `<div class="alfred-holo-icone texte">${(h.icone || '').slice(0, 5)}</div>`) +
    `<div><div class="alfred-holo-titre">${h.titre || ''}</div>${h.sous ? `<div class="alfred-holo-sous">${h.sous}</div>` : ''}</div>`;
  el.style.top = `calc(50% - 25vh + ${rang * 17}vh)`;
  if (cote === 'droite') el.style.left = `calc(50% + ${demiRobot}px)`; else el.style.right = `calc(50% + ${demiRobot}px)`;
  zone.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
  // Coup d'œil vers la carte, puis retour.
  eyeTargetX = cote === 'droite' ? 9 : -9; eyeTargetY = rang === 0 ? -5 : (rang === 2 ? 4 : 0);
  jouerGeste('pencher', cote === 'droite' ? 1 : -1);
  setTimeout(() => { if (curState === 'talk') { eyeTargetX = 0; eyeTargetY = 0; } }, 1100);
  // Sécurité : jamais plus de ~9 s à l'écran, même si la réplique continue.
  setTimeout(() => retirerHologramme(el), 9000);
}
function retirerHologramme(el) {
  if (!el || !el.parentNode) return;
  el.classList.add('sortie');
  setTimeout(() => el.remove(), 500);
}
function effacerHologrammes() {
  holoCompteur = 0;
  document.querySelectorAll('.alfred-holo').forEach((el, i) => setTimeout(() => retirerHologramme(el), i * 90));
}
// Programme les hologrammes d'une réplique sur ses mots (même règle de
// nettoyage/estimation que programmerSurbrillanceMots, alfred-voice.js).
function programmerHologrammes(texteMots, dureeMs, hologrammes) {
  if (!hologrammes || !hologrammes.length || !texteMots || !modeSceneActif) return;
  const mots = String(texteMots).trim().split(/\s+/);
  const nettoie = (m) => m.toLowerCase().replace(/^[«"'‘“(]+|[»"'’”),.;:!?]+$/g, '');
  const motsNettoyes = mots.map(nettoie);
  const msParMot = (dureeMs / Math.max(1, mots.length)) * 0.93;
  const candidats = [];
  for (const h of hologrammes) {
    const cles = (h.mots || []).map((m) => m.toLowerCase());
    const idx = motsNettoyes.findIndex((m) => cles.some((c) => m === c || m.startsWith(c)));
    if (idx === -1) { console.warn('[Alfred UI] hologramme : mot introuvable dans la réplique —', h.mots); continue; }
    candidats.push({ delai: idx * msParMot, h });
  }
  candidats.sort((a, b) => a.delai - b.delai);
  let dernier = -Infinity;
  for (const c of candidats) {
    const delai = Math.max(c.delai, dernier + 1300);
    dernier = delai;
    programmerActeur(() => { if (curState === 'talk') afficherHologramme(c.h); }, delai);
  }
}

// ── Visèmes (forme de bouche déduite du texte) ────────────────────────
// La bouche ne fait plus "que du rond" : à chaque instant on estime quel
// mot (même règle mot/durée que les surlignages) et quelle lettre du mot
// Alfred est en train de dire, et on en déduit une forme de bouche —
// a/e ouverts, o/u/ou arrondis, i/é/s étirés, m/b/p fermés, f/v petits.
// Le VOLUME réel continue de piloter l'ouverture ; le texte ne donne que la
// forme. Précision au mot près, largement suffisante pour l'œil.
let acteurMots = null, acteurDebut = 0, acteurDureeMs = 0;
const VISEMES_DIGRAMMES = { ou: 'o', oe: 'o', eu: 'o', ui: 'o', oo: 'o', au: 'o', eau: 'o', ee: 'i', ij: 'i', ei: 'i', aa: 'ah', ie: 'i' };
const VISEMES_LETTRES = { a: 'ah', à: 'ah', â: 'ah', ä: 'ah', e: 'e', è: 'ah', ê: 'ah', é: 'i', ë: 'ah', o: 'o', ô: 'o', ö: 'o', u: 'o', ù: 'o', û: 'o', ü: 'o', i: 'i', î: 'i', ï: 'i', y: 'i',
  m: 'ferme', b: 'ferme', p: 'ferme', f: 'fv', v: 'fv', w: 'fv', s: 'i', z: 'i', j: 'i', c: 'i', ç: 'i' };
function visemeCourant() {
  if (!acteurMots || !acteurMots.length || !acteurDureeMs) return null;
  const ecoule = performance.now() - acteurDebut;
  const msParMot = (acteurDureeMs / acteurMots.length) * 0.93;
  const idx = Math.floor(ecoule / msParMot);
  if (idx < 0 || idx >= acteurMots.length) return null;
  const mot = acteurMots[idx];
  if (!mot.length) return { forme: 'ferme', gain: 0.2 };
  const progres = Math.min(0.999, (ecoule - idx * msParMot) / msParMot);
  // Les derniers 15 % de chaque mot : bouche qui se referme entre deux mots.
  if (progres > 0.85) return { forme: 'ferme', gain: 0.35 };
  const li = Math.floor((progres / 0.85) * mot.length);
  const tri = mot.slice(li, li + 3), duo = mot.slice(li, li + 2);
  const forme = VISEMES_DIGRAMMES[tri] || VISEMES_DIGRAMMES[duo] || VISEMES_LETTRES[mot[li]] || 'cons';
  if (forme === 'ferme') return { forme: 'ferme', gain: 0.15 };
  if (forme === 'fv')    return { forme: 'i', gain: 0.35 };
  if (forme === 'cons')  return { forme: 'ah', gain: 0.55 };
  if (forme === 'e')     return { forme: 'e', gain: 0.9 };
  return { forme, gain: 1 };
}

// ── Compositeur de tête ──────────────────────────────────────────────
// Une seule fonction écrit le transform de la tête (à chaque image, depuis
// startEyeLerp), en additionnant : la tête qui suit le regard avec retard,
// la respiration, la posture de l'émotion (entrée progressive, sortie plus
// lente), et les hochements — de vraies impulsions sur les attaques de
// syllabes (voir impulsionTete), amorties comme un ressort, plus un léger
// tangage continu. Avant, animateMouth écrivait la tête directement et
// écrasait tout le reste.
let teteLagX = 0, teteLagY = 0;
let hochPos = 0, hochVel = 0, tangage = 0, tangageCur = 0;
let postureTeteCible = { rot: 0, y: 0 }, postureTeteCur = { rot: 0, y: 0 }, postureTeteVitesse = 0.05;
let derniereImageTete = 0;
function composerTete() {
  const head = document.getElementById('alfred-head');
  if (!head || curState === 'sleep' || robotEteint) return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - (derniereImageTete || now)) / 1000);
  derniereImageTete = now;
  teteLagX += (eyeCurX - teteLagX) * 0.06;
  teteLagY += (eyeCurY - teteLagY) * 0.06;
  // ressort amorti pour les hochements
  const k = 180, c = 16;
  hochVel += (-k * hochPos - c * hochVel) * dt;
  hochPos += hochVel * dt;
  // tangage : cible qui s'éteint lentement, suivie avec inertie (pas de saut)
  tangage *= 0.975;
  tangageCur += (tangage - tangageCur) * 0.12;
  postureTeteCur.rot += (postureTeteCible.rot - postureTeteCur.rot) * postureTeteVitesse;
  postureTeteCur.y   += (postureTeteCible.y   - postureTeteCur.y)   * postureTeteVitesse;
  const respi = Math.sin(now / 4200 * Math.PI * 2 + 0.6) * (curState === 'idle' ? 1.8 : 0.8);
  const tx = teteLagX * 0.5;
  const ty = teteLagY * 0.4 + respi + hochPos * 14 + postureTeteCur.y;
  const rot = teteLagX * 0.28 + hochPos * 4 + tangageCur + postureTeteCur.rot;
  head.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
}
// Appelé par animateMouth (alfred-voice.js) avec le volume réel : une
// attaque nette (montée brusque au-dessus du niveau moyen) = une syllabe
// appuyée = un hochement ; pas plus d'un toutes les 320 ms.
let ampMoyenneLente = 0, dernierHochement = 0;
function impulsionTete(amp) {
  const now = performance.now();
  if (amp - ampMoyenneLente > 0.16 && now - dernierHochement > 320) {
    hochVel += 2.6 + Math.random() * 1.2;
    dernierHochement = now;
    tangage += (Math.random() - 0.5) * 2.4;
  }
  ampMoyenneLente += (amp - ampMoyenneLente) * 0.08;
}
function definirPostureTete(rot, y, vitesse) {
  postureTeteCible = { rot: rot || 0, y: y || 0 };
  postureTeteVitesse = vitesse || 0.05;
}

// ── Postures tenues (corps, bras) via Web Animations API ─────────────
// Chaque clé ('corps', 'brasL', 'brasR') garde une animation "forwards" ;
// tenir = aller vers la cible, relâcher = revenir à la base plus lentement
// puis rendre la main à l'attribut transform d'origine.
const posturesTenues = {};
// Centre de rotation explicite : mesuré en test, Chrome IGNORE
// transform-origin pour une animation WAAPI sur un groupe SVG qui porte
// déjà un attribut transform (la rotation partait du coin (0,0) du viewBox
// et les bras se retrouvaient n'importe où). On encadre donc chaque
// transform par translate(centre) … translate(-centre).
const CENTRES_POSTURE = { corps: [200, 420], brasL: [76, 244], brasR: [324, 244] };
function autour(cle, t) {
  if (!t || t === 'none') return 'none';
  const [cx, cy] = CENTRES_POSTURE[cle];
  return `translate(${cx}px,${cy}px) ${t} translate(${-cx}px,${-cy}px)`;
}
const BASES_POSTURE = { corps: 'none', brasL: autour('brasL', 'rotate(-16deg)'), brasR: autour('brasR', 'rotate(16deg)') };
function elementPosture(cle) {
  return document.getElementById(cle === 'corps' ? 'alfred-posture' : (cle === 'brasL' ? 'alfred-arm-l-base' : 'alfred-arm-r-base'));
}
// Point de départ d'une posture = la DERNIÈRE CIBLE demandée (chaîne), jamais
// la matrice calculée par le navigateur : pour un groupe SVG dont le
// transform d'origine est un attribut rotate(a cx cy), la matrice calculée
// contient déjà le décalage du centre de rotation, et la ré-appliquer avec
// un transform-origin CSS décalait les bras (bug vu en test : bras
// "ouverts" n'importe comment après chaque relâchement).
const posturesCourantes = {};
function tenirPosture(cle, transformCible, dureeMs, delaiMs) {
  const el = elementPosture(cle);
  if (!el || typeof el.animate !== 'function') return;
  const depart = posturesCourantes[cle] || BASES_POSTURE[cle];
  if (posturesTenues[cle]) { try { posturesTenues[cle].cancel(); } catch (e) {} }
  transformCible = autour(cle, transformCible);
  posturesCourantes[cle] = transformCible;
  posturesTenues[cle] = el.animate([{ transform: depart }, { transform: transformCible }], { duration: dureeMs || 500, delay: delaiMs || 0, fill: 'forwards', easing: 'cubic-bezier(.3,.9,.3,1)' });
}
function relacherPosture(cle, dureeMs, delaiMs) {
  const el = elementPosture(cle);
  if (!el || !posturesTenues[cle]) return;
  const depart = posturesCourantes[cle] || BASES_POSTURE[cle];
  try { posturesTenues[cle].cancel(); } catch (e) {}
  posturesCourantes[cle] = BASES_POSTURE[cle];
  const a = el.animate([{ transform: depart }, { transform: BASES_POSTURE[cle] }], { duration: dureeMs || 800, delay: delaiMs || 0, fill: 'forwards', easing: 'ease-in-out' });
  posturesTenues[cle] = a;
  a.finished.then(() => { if (posturesTenues[cle] === a) { try { a.cancel(); } catch (e) {} delete posturesTenues[cle]; } }).catch(() => {});
}
function relacherToutesPostures(dureeMs) {
  // Sortie plus lente que l'entrée, et décalée d'un élément à l'autre.
  definirPostureTete(0, 0, 0.03);
  relacherPosture('brasL', dureeMs || 900, 0);
  relacherPosture('brasR', dureeMs || 900, 120);
  relacherPosture('corps', (dureeMs || 900) + 200, 220);
}
// Posture complète d'une émotion : yeux (déjà), tête, bras, corps — entrée
// progressive et décalée (tête 0 ms, bras 150/270 ms, corps 250 ms).
const POSTURES_PAR_EMOTION = {
  amuse:      { tete: [4, 0],   bras: [8, -8],   corps: 'rotate(-1deg)' },
  assure:     { tete: [-1, -3], bras: [-10, 10], corps: 'translateY(-2px) scale(1.02)' },
  enjoue:     { tete: [0, -4],  bras: [14, -14], corps: 'translateY(-3px)' },
  taquin:     { tete: [-6, 0],  bras: [4, -26],  corps: 'rotate(1.5deg)' },
  satisfait:  { tete: [2, -2],  bras: [6, -6],   corps: 'none' },
  chaleureux: { tete: [3, 0],   bras: [12, -12], corps: 'translateY(2px)' },
  malicieux:  { tete: [-5, 1],  bras: [6, -18],  corps: 'rotate(2deg) translateY(2px)' },
  fier:       { tete: [-2, -5], bras: [-18, 18], corps: 'translateY(-4px) scale(1.03)' },
};
function prendrePostureEmotion(emotion) {
  const p = POSTURES_PAR_EMOTION[emotion];
  if (!p) return;
  definirPostureTete(p.tete[0], p.tete[1], 0.05);
  tenirPosture('brasL', `rotate(${-16 + p.bras[0]}deg)`, 650, 150);
  tenirPosture('brasR', `rotate(${16 + p.bras[1]}deg)`, 650, 270);
  tenirPosture('corps', p.corps, 700, 250);
}

// Ajustement de posture au repos, toutes les 20 à 40 s : il change d'appui
// (petit mouvement inverse d'abord, puis le vrai, puis retour amorti).
function ajustementPosture() {
  if (curState === 'idle' && !robotEteint) {
    const sens = Math.random() < 0.5 ? -1 : 1;
    const corps = document.getElementById('alfred-posture');
    animerGeste(corps, [
      { transform: 'none', offset: 0 }, { transform: autour('corps', `rotate(${-sens * 0.5}deg) translateX(${sens}px)`), offset: .12 },
      { transform: autour('corps', `rotate(${sens * 1.4}deg) translateX(${-sens * 4}px)`), offset: .45 }, { transform: autour('corps', `rotate(${sens * 1.1}deg) translateX(${-sens * 3}px)`), offset: .8 },
      { transform: autour('corps', `rotate(${-sens * 0.2}deg)`), offset: .94 }, { transform: 'none', offset: 1 },
    ], { duration: 2400 });
    if (!posturesTenues.brasL) animerGeste(document.getElementById('alfred-arm-l-base'), [{ transform: BASES_POSTURE.brasL }, { transform: autour('brasL', `rotate(${-16 + sens * 5}deg)`), offset: .45 }, { transform: BASES_POSTURE.brasL }], { duration: 2400, delay: 140 });
    if (!posturesTenues.brasR) animerGeste(document.getElementById('alfred-arm-r-base'), [{ transform: BASES_POSTURE.brasR }, { transform: autour('brasR', `rotate(${16 + sens * 5}deg)`), offset: .45 }, { transform: BASES_POSTURE.brasR }], { duration: 2400, delay: 260 });
    tangage += sens * 1.5;
  }
  setTimeout(ajustementPosture, 20000 + Math.random() * 20000);
}
setTimeout(ajustementPosture, 12000 + Math.random() * 10000);

// ── Regarder vers un élément de l'appli (acte 2) ──────────────────────
// Appelé par surlignerBrievement (alfred-dom.js) à chaque champ mis en
// évidence : les yeux (et la tête, qui suit) se tournent vers l'endroit
// surligné, puis reviennent vers la salle. Le balayage aléatoire du regard
// est suspendu pendant ce temps.
let regardDirigeJusqua = 0;
function regarderVers(el, dureeMs) {
  if (!el || robotEteint || curState === 'sleep') return;
  const svg = document.getElementById('alfred-svg');
  if (!svg) return;
  const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
  const s = svg.getBoundingClientRect();
  if (!r || !s.width) return;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const dx = cx - (s.left + s.width / 2), dy = cy - (s.top + s.height * 0.25);
  eyeTargetX = Math.max(-12, Math.min(12, dx / 40));
  eyeTargetY = Math.max(-6,  Math.min(6,  dy / 60));
  const duree = dureeMs || 1600;
  regardDirigeJusqua = performance.now() + duree;
  tangage += Math.sign(dx) * 0.8;
  setTimeout(() => { if (performance.now() >= regardDirigeJusqua - 20) { eyeTargetX = 0; eyeTargetY = 0; } }, duree);
}

// ── Réveil ────────────────────────────────────────────────────────────
// Le robot est "éteint" quand on entre en scène pour l'acte 1 (écran noir,
// paupières closes, tête tombée) et se réveille sur la première réplique :
// l'écran clignote et s'allume, les yeux s'ouvrent grand puis clignent,
// il s'étire (bras qui s'ouvrent lentement, torse qui se redresse), et
// regarde la salle. Version rapide (0,9 s) si on saute directement à une
// autre réplique de l'acte 1.
let robotEteint = false;
function eteindreRobot() {
  robotEteint = true;
  const nuit = document.getElementById('alfred-visiere-nuit');
  const head = document.getElementById('alfred-head');
  const mouth = document.getElementById('alfred-mouth');
  if (nuit) nuit.setAttribute('opacity', '0.9');
  definirExpression('ferme', 300, { base: true });
  if (mouth && typeof ALFRED_BOUCHE_DORMIR_D !== 'undefined') mouth.setAttribute('d', ALFRED_BOUCHE_DORMIR_D);
  if (head) { head.style.transition = 'transform .6s ease'; head.style.transform = 'rotate(6deg) translateY(7px)'; }
  tenirPosture('brasL', 'rotate(-8deg)', 600, 0);
  tenirPosture('brasR', 'rotate(8deg)', 600, 100);
  tenirPosture('corps', 'translateY(6px) scale(.985)', 700, 0);
}
async function reveil(rapide) {
  if (!robotEteint) return;
  const attendreMs = (ms) => new Promise(r => setTimeout(r, ms));
  const nuit = document.getElementById('alfred-visiere-nuit');
  const head = document.getElementById('alfred-head');
  const mouth = document.getElementById('alfred-mouth');
  if (rapide) {
    if (nuit) nuit.setAttribute('opacity', '0');
    robotEteint = false;
    if (head) { head.style.transition = 'transform .6s ease'; head.style.transform = ''; setTimeout(() => { head.style.transition = ''; }, 650); }
    definirExpression('normal', 400, { base: true });
    if (mouth && typeof ALFRED_BOUCHE_SOURIRE_D !== 'undefined') mouth.setAttribute('d', ALFRED_BOUCHE_SOURIRE_D);
    relacherToutesPostures(700);
    await attendreMs(700);
    return;
  }
  // 1. l'écran s'allume en clignotant
  if (nuit) {
    nuit.style.transition = 'opacity .12s ease';
    for (const o of ['0.35', '0.85', '0.2', '0.7', '0']) { nuit.setAttribute('opacity', o); await attendreMs(130); }
    nuit.style.transition = 'opacity .9s ease';
  }
  // 2. les yeux s'ouvrent grand, puis clignent, puis se posent
  definirExpression('grand', 380, { base: true });
  if (head) { head.style.transition = 'transform .7s cubic-bezier(.2,1.2,.4,1)'; head.style.transform = 'rotate(-3deg) translateY(-4px)'; }
  await attendreMs(450);
  definirExpression('ferme', 70); await attendreMs(110); definirExpression('grand', 120); await attendreMs(320);
  definirExpression('ferme', 70); await attendreMs(110); definirExpression('normal', 260, { base: true });
  if (mouth && typeof ALFRED_BOUCHE_SOURIRE_D !== 'undefined') mouth.setAttribute('d', ALFRED_BOUCHE_SOURIRE_D);
  // 3. il s'étire : bras qui s'ouvrent lentement (décalés), torse redressé
  tenirPosture('corps', 'translateY(-5px) scale(1.035)', 900, 0);
  tenirPosture('brasL', 'rotate(46deg)', 900, 120);
  tenirPosture('brasR', 'rotate(-46deg)', 900, 260);
  await attendreMs(1150);
  robotEteint = false;
  if (head) { head.style.transform = ''; setTimeout(() => { head.style.transition = ''; }, 700); }
  relacherToutesPostures(800);
  // 4. il regarde la salle : à gauche, à droite, devant
  eyeTargetX = -9; eyeTargetY = -2; regardDirigeJusqua = performance.now() + 1500;
  await attendreMs(520);
  eyeTargetX = 9; await attendreMs(520);
  eyeTargetX = 0; eyeTargetY = 0; await attendreMs(300);
}

// ── Rythme du texte ──────────────────────────────────────────────────
let acteurTimers = [];
let acteurGeneration = 0;
// Décalage appliqué à tous les temps forts programmés : "playing" précède le
// son perçu (latence de sortie + perception) — même délai que les
// sous-titres et surlignages (DELAI_AUDIO_PERCEPTIBLE_MS, alfred-voice.js).
let acteurRetardMs = 0;
function programmerActeur(fn, ms) { acteurTimers.push(setTimeout(fn, Math.max(0, ms + acteurRetardMs))); }
// Attend que la réplique en cours ait atteint une fraction de sa durée
// (0.7 = 70 %) — utilisé par les gestes de fin de réplique (clin d'œil du
// Closing). Résout aussi si la parole s'arrête avant, ou après 15 s.
function attendreMomentReplique(fraction) {
  const t0 = performance.now();
  return new Promise(resolve => {
    (function verifier() {
      const ecoule = performance.now() - t0;
      if (acteurDureeMs > 0 && performance.now() >= acteurDebut + acteurDureeMs * fraction) return resolve(true);
      if (ecoule > 1500 && curState !== 'talk') return resolve(false);
      if (ecoule > 15000) return resolve(false);
      setTimeout(verifier, 60);
    })();
  });
}
function attendreFinParole() {
  const t0 = performance.now();
  return new Promise(resolve => {
    (function verifier() {
      if (curState !== 'talk' || performance.now() - t0 > 20000) return resolve();
      setTimeout(verifier, 80);
    })();
  });
}

// Appelé par speak() (alfred-voice.js) dès que l'audio joue réellement,
// avec la durée RÉELLE (déjà divisée par la vitesse de lecture).
function demarrerJeuDActeur(opts) {
  arreterJeuDActeur();
  if (typeof retirerRideauFinal === 'function') retirerRideauFinal();
  const gen     = ++acteurGeneration;
  const texte   = String((opts && opts.texte) || '');
  const dureeMs = Math.max(600, Number(opts && opts.dureeMs) || texte.split(/\s+/).length * 400);
  const emo     = EXPRESSIONS_PAR_EMOTION[opts && opts.emotion] || { entree: 'normal', base: 'normal', entreeMs: 0 };
  const vivant  = () => gen === acteurGeneration && curState === 'talk';
  // Visèmes : mots du texte réellement prononcé (lettres seules, minuscules).
  acteurMots = String((opts && opts.texteMots) || texte).trim().split(/\s+/).map(m => m.toLowerCase().replace(/[^a-zà-ÿ]/g, ''));
  // Visèmes : latence physique seulement (~150 ms) — la bouche doit coller au
  // son ; les temps forts, eux, prennent le délai "perçu" complet.
  acteurDebut = performance.now() + 150;
  acteurDureeMs = dureeMs;
  acteurRetardMs = (typeof DELAI_AUDIO_PERCEPTIBLE_MS !== 'undefined') ? DELAI_AUDIO_PERCEPTIBLE_MS : 300;

  // Expression d'entrée puis de base — yeux tout de suite, posture (tête,
  // bras, corps) 150 ms après : jamais deux mouvements pile en même temps.
  expressionBase = emo.base;
  definirExpression(emo.entree, 240);
  if (emo.entree !== emo.base) programmerActeur(() => { if (vivant()) definirExpression(emo.base, 260); }, emo.entreeMs || 1200);
  if (opts && opts.emotion && POSTURES_PAR_EMOTION[opts.emotion]) programmerActeur(() => { if (vivant()) prendrePostureEmotion(opts.emotion); }, 150);

  // Geste de la réplique (facultatif) : soit un nom ('stop'), joué un peu
  // après le début de la voix ; soit { nom, mot } — le geste démarre 200 ms
  // AVANT le mot qu'il souligne (l'anticipation précède la parole).
  if (opts && opts.geste) {
    const g = (typeof opts.geste === 'string') ? { nom: opts.geste } : opts.geste;
    let quand = 250;
    if (g.mot) {
      const motsN = String((opts && opts.texteMots) || texte).trim().split(/\s+/).map(m => m.toLowerCase().replace(/^[«"'‘“(]+|[»"'’”),.;:!?]+$/g, ''));
      const cible = String(g.mot).toLowerCase();
      const idx = motsN.findIndex(m => m === cible || m.startsWith(cible));
      if (idx >= 0) quand = Math.max(0, idx * (dureeMs / Math.max(1, motsN.length)) * 0.93 - 200);
      else console.warn('[Alfred UI] geste : mot introuvable dans la réplique —', g.mot);
    }
    programmerActeur(() => { if (vivant()) jouerGeste(g.nom); }, quand);
  }
  // Hologrammes sur les mots-clés (mode scène seulement).
  if (opts && opts.hologrammes) programmerHologrammes(opts.texteMots || texte, dureeMs, opts.hologrammes);

  // Phrases → temps forts. Début estimé au prorata des caractères.
  const phrases = texte.match(/[^.!?…]+[.!?…]+["»]?|[^.!?…]+$/g) || [texte];
  const totalCar = phrases.reduce((a, p) => a + p.length, 0) || 1;
  let cursor = 0, sens = 1;
  phrases.forEach((p, i) => {
    const debut = dureeMs * (cursor / totalCar);
    const longueur = dureeMs * (p.length / totalCar);
    cursor += p.length;
    const finPhrase = p.trim().slice(-1);
    const suspension = /\.\.\.|…/.test(p);
    if (i > 0) {
      // Nouvelle phrase : clignement + tête qui se réoriente + regard neuf.
      sens = -sens;
      programmerActeur(() => { if (!vivant()) return; cligner(); jouerGeste('pencher', sens); eyeTargetX = (Math.random() - .5) * 10; eyeTargetY = (Math.random() - .5) * 4; }, debut - 120);
    }
    if (finPhrase === '?' && longueur > 900) {
      // Question : yeux ronds qui montent, tête un peu penchée, et le corps
      // se penche vers le public (tenu le temps de la question).
      programmerActeur(() => { if (!vivant()) return; definirExpression('rond', 220); eyeTargetX = 6; eyeTargetY = -6; }, debut + Math.min(300, longueur * .15));
      programmerActeur(() => { if (!vivant()) return; tenirPosture('corps', 'translateY(5px) scale(1.025)', 600, 0); }, debut + Math.min(300, longueur * .15) + 180);
      programmerActeur(() => { if (!vivant()) return; definirExpression(expressionBase, 260); eyeTargetX = 0; eyeTargetY = 0; }, debut + longueur - 150);
      // Il se redresse sur la phrase suivante (affirmation) — plus lentement.
      programmerActeur(() => { if (!vivant()) return; const p = POSTURES_PAR_EMOTION[opts && opts.emotion]; tenirPosture('corps', p ? p.corps : 'none', 900, 0); }, debut + longueur + 150);
    } else if (finPhrase === '!' && longueur > 700) {
      // Exclamation : gros yeux très brefs, redressement net + petit rebond.
      programmerActeur(() => { if (!vivant()) return; definirExpression('grand', 160); }, debut + longueur * .55);
      programmerActeur(() => { if (!vivant()) return; definirExpression(expressionBase, 220); jouerGeste('rebondir'); }, debut + longueur * .55 + 480);
    } else if (suspension && longueur > 1500) {
      // Points de suspension : yeux plissés + regard de côté, le temps du silence.
      programmerActeur(() => { if (!vivant()) return; definirExpression('plisse', 260); eyeTargetX = -8; eyeTargetY = 2; }, debut + longueur * .6);
      programmerActeur(() => { if (!vivant()) return; definirExpression(expressionBase, 260); eyeTargetX = 0; eyeTargetY = 0; }, debut + longueur - 100);
    }
  });

  // Clignements "physiologiques" en plus, toutes les 3 à 5 s.
  (function planifierClignement(t) {
    if (t >= dureeMs) return;
    programmerActeur(() => { if (vivant()) cligner(); }, t);
    planifierClignement(t + 3000 + Math.random() * 2000);
  })(2200 + Math.random() * 1500);
}

function arreterJeuDActeur() {
  acteurGeneration++;
  acteurMots = null; acteurDureeMs = 0;
  acteurTimers.splice(0).forEach(clearTimeout);
  annulerGestes();
  effacerHologrammes();
  if (robotEteint) return; // éteint : on garde paupières closes et posture affaissée
  relacherToutesPostures(900);
  expressionBase = 'normal';
  if (etatYeux.l.forme !== 'normal' || etatYeux.r.forme !== 'normal') definirExpression('normal', 260);
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
    .alfred-scene-nappe { position:absolute; border-radius:50%; filter:blur(60px); opacity:.55; animation:alfred-nappe-derive ease-in-out infinite alternate; pointer-events:none; }
    .alfred-scene-picto { position:absolute; width:54px; height:54px; opacity:0; color:#0a6b7a; animation:alfred-picto-flotte linear infinite; pointer-events:none; }
    .alfred-scene-picto svg { width:100%; height:100%; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
    #alfred-scene-ondes { position:absolute; left:50%; top:50%; width:0; height:0; pointer-events:none; }
    .alfred-scene-onde { position:absolute; left:0; top:0; width:60vmin; height:60vmin; margin:-30vmin 0 0 -30vmin; border-radius:50%; border:2px solid rgba(20,176,189,.45);
      transform:translateY(-4%) scale(.55); opacity:0; animation:alfred-onde-voix 1.6s ease-out forwards; }
    #alfred-scene-console { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(.9); width:min(420px, 70vw); padding:18px 22px 16px; box-sizing:border-box;
      background:rgba(255,255,255,.72); border:1.5px solid rgba(20,176,189,.45); border-radius:14px; box-shadow:0 20px 60px rgba(5,69,97,.18), 0 0 0 6px rgba(20,176,189,.06);
      backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); opacity:0; visibility:hidden; transition:opacity .35s ease, transform .45s cubic-bezier(.2,1.2,.4,1), visibility 0s linear .35s; font-family:-apple-system,'Segoe UI',sans-serif; }
    #alfred-scene-console.actif { opacity:1; visibility:visible; transform:translate(-50%,-50%) scale(1); transition:opacity .35s ease, transform .45s cubic-bezier(.2,1.2,.4,1); }
    #alfred-scene-console-titre { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:700; letter-spacing:2.5px; color:rgba(5,69,97,.6); text-transform:uppercase; margin-bottom:12px; }
    #alfred-scene-console-titre::before { content:''; width:8px; height:8px; border-radius:50%; background:#14b0bd; box-shadow:0 0 10px rgba(20,176,189,.9); animation:alfred-halo-pulse 1.2s ease-in-out infinite; }
    .alfred-scene-ligne { display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:14px; color:#054561; padding:5px 0; opacity:0; transform:translateX(-8px); transition:opacity .3s ease, transform .3s ease; }
    .alfred-scene-ligne.visible { opacity:1; transform:none; }
    .alfred-scene-ligne-etat { font-size:12px; color:rgba(5,69,97,.5); min-width:18px; text-align:right; }
    .alfred-scene-ligne.ok .alfred-scene-ligne-etat { color:#14b0bd; font-weight:700; }
    .alfred-scene-ligne.ok .alfred-scene-ligne-etat::after { content:'✓'; }
    .alfred-scene-ligne:not(.ok) .alfred-scene-ligne-etat::after { content:'…'; }
    #alfred-scene-console .alfred-scene-barre { margin-top:12px; }
    #alfred-scene-holos { position:absolute; inset:0; pointer-events:none; }
    #alfred-scene-final { position:absolute; left:50%; bottom:9vh; transform:translate(-50%, 20px); text-align:center; opacity:0; transition:opacity .9s ease, transform .9s cubic-bezier(.2,1,.4,1); pointer-events:none; font-family:-apple-system,'Segoe UI',sans-serif; }
    #alfred-scene-final.actif { opacity:1; transform:translate(-50%, 0); }
    #alfred-scene-final-merci { font-size:clamp(28px, 4.2vw, 64px); font-weight:800; color:#054561; letter-spacing:-.5px; }
    #alfred-scene-final-marque { margin-top:.35em; font-size:clamp(12px, 1.1vw, 18px); font-weight:700; letter-spacing:5px; color:#14b0bd; }
    #alfred-scene-final-stand { margin-top:.9em; display:inline-block; padding:.55em 1.1em; border-radius:999px; background:rgba(255,255,255,.75); border:1.5px solid rgba(20,176,189,.5); color:#054561; font-size:clamp(13px, 1.2vw, 20px); }
    .alfred-holo { position:absolute; width:clamp(230px, 20vw, 330px); font-size:clamp(13px, 1.15vw, 19px); padding:.85em 1em; box-sizing:border-box; display:flex; align-items:center; gap:.8em;
      background:rgba(255,255,255,.78); border:1.5px solid rgba(20,176,189,.55); border-radius:14px; box-shadow:0 14px 40px rgba(5,69,97,.16), 0 0 0 5px rgba(20,176,189,.07);
      backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); font-family:-apple-system,'Segoe UI',sans-serif; color:#054561;
      opacity:0; transform:translateY(14px) scale(.86); filter:blur(6px); transition:opacity .38s ease, transform .55s cubic-bezier(.2,1.3,.4,1), filter .38s ease; }
    .alfred-holo.visible { opacity:1; transform:none; filter:none; animation:alfred-holo-flotte 4.5s ease-in-out .6s infinite; }
    .alfred-holo.sortie { opacity:0; transform:translateY(-10px) scale(.92); filter:blur(4px); animation:none; transition:opacity .45s ease, transform .45s ease, filter .45s ease; }
    .alfred-holo-icone { flex:none; width:2.8em; height:2.8em; border-radius:.75em; background:linear-gradient(135deg, rgba(20,176,189,.18), rgba(20,176,189,.06)); display:flex; align-items:center; justify-content:center; color:#0a6b7a; }
    .alfred-holo-icone svg { width:1.7em; height:1.7em; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
    .alfred-holo-icone.texte { font-weight:800; font-size:.9em; letter-spacing:.5px; }
    .alfred-holo-titre { font-size:1em; font-weight:700; line-height:1.2; }
    .alfred-holo-sous { font-size:.82em; color:rgba(5,69,97,.62); margin-top:3px; line-height:1.3; }
    .alfred-holo::before { content:''; position:absolute; top:50%; width:26px; border-top:2px dotted rgba(20,176,189,.55); }
    .alfred-holo::after { content:''; position:absolute; top:50%; width:8px; height:8px; margin-top:-4px; border-radius:50%; background:#14b0bd; box-shadow:0 0 10px rgba(20,176,189,.9); }
    .alfred-holo.gauche::before { right:-28px; } .alfred-holo.gauche::after { right:-34px; }
    .alfred-holo.droite::before { left:-28px; }  .alfred-holo.droite::after { left:-34px; }
    @keyframes alfred-holo-flotte { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
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
    @keyframes alfred-nappe-derive { 0%{transform:translate(0,0) scale(1);} 100%{transform:translate(8vw,-6vh) scale(1.15);} }
    @keyframes alfred-picto-flotte { 0%{transform:translateY(0) rotate(-4deg); opacity:0;} 12%{opacity:.16;} 88%{opacity:.16;} 100%{transform:translateY(-38vh) rotate(5deg); opacity:0;} }
    @keyframes alfred-onde-voix { 0%{transform:translateY(-4%) scale(.55); opacity:.7;} 100%{transform:translateY(-4%) scale(1.25); opacity:0;} }
  `;
  document.head.appendChild(style);

  const scene = document.createElement('div');
  scene.id = 'alfred-scene';
  scene.innerHTML = `
    <div id="alfred-scene-fond"></div>
    <div id="alfred-scene-nappes"></div>
    <div id="alfred-scene-pictos"></div>
    <div id="alfred-scene-particules"></div>
    <div id="alfred-scene-halo"></div>
    <div id="alfred-scene-ondes"></div>
    <div id="alfred-scene-anneau"></div>
    <div id="alfred-scene-marque">ALFRED · WELLNOT</div>
    <div id="alfred-scene-holos"></div>
    <div id="alfred-scene-centre"></div>
    <div id="alfred-scene-final">
      <div id="alfred-scene-final-merci"></div>
      <div id="alfred-scene-final-marque">ALFRED · WELLNOT</div>
      <div id="alfred-scene-final-stand"></div>
    </div>
    <div id="alfred-scene-chargement">
      <div class="alfred-scene-barre"><div class="alfred-scene-barre-int"></div></div>
      <div id="alfred-scene-chargement-txt"></div>
    </div>
    <div id="alfred-scene-console">
      <div id="alfred-scene-console-titre"></div>
      <div id="alfred-scene-console-lignes"></div>
      <div class="alfred-scene-barre"><div class="alfred-scene-barre-int"></div></div>
    </div>`;
  document.body.appendChild(scene);

  // Nappes de couleur : deux grandes taches floues (teal / bleu) qui dérivent
  // très lentement — le fond "respire" au lieu d'être un dégradé fixe.
  const nappes = scene.querySelector('#alfred-scene-nappes');
  [['18%', '20%', '46vmin', 'rgba(20,176,189,.22)', 38], ['70%', '65%', '52vmin', 'rgba(5,69,97,.13)', 46], ['60%', '12%', '30vmin', 'rgba(95,227,234,.20)', 30]].forEach(([l, t, s, c, d], i) => {
    const n = document.createElement('div');
    n.className = 'alfred-scene-nappe';
    n.style.cssText = `left:${l}; top:${t}; width:${s}; height:${s}; background:${c}; animation-duration:${d}s; animation-delay:-${i * 11}s;`;
    nappes.appendChild(n);
  });

  // Pictos du métier (acte, maison, clé, sceau, signature, dossier) qui
  // montent lentement en filigrane derrière le robot — un décor qui parle
  // de notariat sans un mot, très discret (opacité 16 %).
  const PICTOS = [
    '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15h5M9.5 18h3"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15 12v2"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5"/><path d="M12 6.5v5M9.5 9h5"/><path d="M9 13.5L7 21l5-2 5 2-2-7.5"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M3 17c3-6 5-6 6-3s2 5 4 0 3-6 8-1"/><path d="M3 21h18"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v11H3z"/><path d="M3 11h18"/></svg>',
  ];
  const pictos = scene.querySelector('#alfred-scene-pictos');
  for (let i = 0; i < 10; i++) {
    const p = document.createElement('div');
    p.className = 'alfred-scene-picto';
    p.innerHTML = PICTOS[i % PICTOS.length];
    const gauche = i % 2 === 0 ? 4 + Math.random() * 22 : 74 + Math.random() * 22; // jamais devant le robot
    p.style.cssText = `left:${gauche.toFixed(0)}%; top:${(60 + Math.random() * 45).toFixed(0)}%; animation-duration:${(26 + Math.random() * 20).toFixed(0)}s; animation-delay:-${(Math.random() * 30).toFixed(0)}s; transform:scale(${(.7 + Math.random() * .7).toFixed(2)});`;
    pictos.appendChild(p);
  }

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
// Séquence de connexion affichée quand Alfred "ouvre" l'interface (réplique
// "Montrer") : ce n'est pas un navigateur qui s'ouvre, c'est Alfred qui se
// connecte à ses sources (celles qu'il vient de citer dans "Competences")
// puis allume l'interface Wellnot — chaque ligne se coche à son tour.
function lignesChargementScene() {
  const nl = (typeof currentLangue !== 'undefined' && currentLangue === 'nl');
  return nl
    ? { titre: 'Alfred verbindt', lignes: ['Verbinding met e-notariaat', 'Geoportaal en kadaster', 'Dossiers van het kantoor', 'Wellnot-interface'], fin: 'Interface klaar' }
    : { titre: 'Alfred se connecte', lignes: ['Connexion à e-notariat', 'Géoportail et cadastre', "Dossiers de l'étude", 'Interface Wellnot'], fin: 'Interface prête' };
}

// Onde de voix : un anneau qui s'élargit derrière le robot sur les temps
// forts de la voix (appelé par animateMouth, alfred-voice.js), seulement en
// mode scène — sur l'appli ça n'aurait aucun sens. Limité à un anneau
// toutes les ~450 ms pour rester un halo qui pulse, pas des ronds dans l'eau.
let derniereOndeVoix = 0;
function emettreOndeVoix(amp) {
  if (!modeSceneActif || amp < 0.42) return;
  const now = performance.now();
  if (now - derniereOndeVoix < 450) return;
  derniereOndeVoix = now;
  const zone = document.getElementById('alfred-scene-ondes');
  if (!zone) return;
  const o = document.createElement('span');
  o.className = 'alfred-scene-onde';
  o.style.borderColor = `rgba(20,176,189,${(0.25 + amp * 0.35).toFixed(2)})`;
  zone.appendChild(o);
  setTimeout(() => o.remove(), 1700);
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
  // Acte 1 : le robot arrive "éteint" (voir eteindreRobot / reveil).
  if (!options.depuisApp && typeof eteindreRobot === 'function' && curState !== 'talk') eteindreRobot();
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

  const console_ = document.getElementById('alfred-scene-console');
  if (options.chargement && console_) {
    // Console de connexion (voir lignesChargementScene) : le robot glisse un
    // peu vers la gauche pour lui laisser la place, les lignes se cochent
    // une à une pendant que la barre se remplit, puis "Interface prête".
    const textes = lignesChargementScene();
    const titre  = document.getElementById('alfred-scene-console-titre');
    const zoneL  = document.getElementById('alfred-scene-console-lignes');
    const barre  = console_.querySelector('.alfred-scene-barre-int');
    const centre = document.getElementById('alfred-scene-centre');
    if (titre) titre.textContent = textes.titre;
    if (zoneL) zoneL.innerHTML = textes.lignes.map(l => `<div class="alfred-scene-ligne"><span>${l}</span><span class="alfred-scene-ligne-etat"></span></div>`).join('');
    if (barre) { barre.style.transition = 'none'; barre.style.width = '0'; void barre.offsetWidth; barre.style.transition = 'width 2.4s cubic-bezier(.22,.61,.36,1)'; }
    if (centre) { centre.style.transition = 'transform .6s cubic-bezier(.32,.72,0,1)'; centre.style.transform = 'translate(-50%,-52%) translateX(-24vw)'; }
    console_.style.left = '62%';
    console_.classList.add('actif');
    if (typeof setAlfredState === 'function' && curState !== 'talk') setAlfredState('think');
    if (typeof definirExpression === 'function') { definirExpression('rond', 220); eyeTargetX = 8; eyeTargetY = 2; }
    await new Promise(r => setTimeout(r, 120));
    if (barre) barre.style.width = '100%';
    const lignes = zoneL ? Array.from(zoneL.children) : [];
    for (const l of lignes) {
      l.classList.add('visible');
      await new Promise(r => setTimeout(r, 330));
      l.classList.add('ok');
      await new Promise(r => setTimeout(r, 240));
    }
    if (titre) titre.textContent = textes.fin;
    if (typeof definirExpression === 'function') { definirExpression('joie', 220); eyeTargetX = 0; eyeTargetY = 0; }
    await new Promise(r => setTimeout(r, 520));
    console_.classList.remove('actif');
    if (centre) { centre.style.transform = 'translate(-50%,-52%)'; setTimeout(() => { centre.style.transition = ''; }, 700); }
    if (typeof definirExpression === 'function') definirExpression('normal', 200);
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
  retirerRideauFinal();
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
function assurerModeScene(acte, label) {
  transitionSceneEnCours = transitionSceneEnCours.then(async () => {
    if (acte === 1 && !modeSceneActif) await entrerScene({ depuisApp: false });
    else if (acte === 2 && modeSceneActif) await quitterScene({ chargement: false });
    else if (acte === 3 && !modeSceneActif) await entrerScene({ depuisApp: true });
    // Réveil : complet sur la toute première réplique, rapide si on saute
    // directement ailleurs dans l'acte 1.
    if (robotEteint && acte === 1) await reveil(label !== 'Ouverture');
    else if (robotEteint) await reveil(true);
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

// Fin de spectacle — action "ClosingWink" (alfred-dom.js). Avant : le clin
// d'œil partait 600 ms après le début de la réplique, donc bien avant "c'est
// moi qui vous engage". Maintenant : le clin d'œil tombe aux ~70 % de la
// réplique (sur la chute), puis quand Alfred a fini de parler il salue de
// la main et le rideau final apparaît sous lui (Merci / Bedankt, marque,
// rappel du stand). Reste affiché jusqu'à la prochaine réplique ou
// changement de scène.
async function finDeSpectacle() {
  await attendreMomentReplique(0.68);
  if (typeof clinDoeil === 'function') await clinDoeil();
  await attendreFinParole();
  const nl = (typeof currentLangue !== 'undefined' && currentLangue === 'nl');
  jouerGeste('saluer');
  const fin = document.getElementById('alfred-scene-final');
  const centre = document.getElementById('alfred-scene-centre');
  if (fin && modeSceneActif) {
    const merci = document.getElementById('alfred-scene-final-merci');
    const stand = document.getElementById('alfred-scene-final-stand');
    if (merci) merci.textContent = nl ? 'Bedankt!' : 'Merci !';
    if (stand) stand.textContent = nl ? 'Wellnot-stand · in de zaal hiernaast' : "Stand Wellnot · dans la salle d'à côté";
    if (centre) { centre.style.transition = 'transform 1s cubic-bezier(.2,1,.4,1)'; centre.style.transform = 'translate(-50%,-52%) translateY(-7vh)'; }
    fin.classList.add('actif');
    if (typeof definirExpression === 'function') setTimeout(() => { if (curState !== 'talk') definirExpression('joie', 300, { base: true }); }, 900);
  }
}
function retirerRideauFinal() {
  const fin = document.getElementById('alfred-scene-final');
  const centre = document.getElementById('alfred-scene-centre');
  if (fin && fin.classList.contains('actif')) {
    fin.classList.remove('actif');
    if (centre) centre.style.transform = 'translate(-50%,-52%)';
  }
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