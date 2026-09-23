/* ============================================================
   EXPO MÓVEL — intro.js
   Abertura cinematográfica: campo de partículas douradas,
   digitação letra por letra com cursor piscando, revelação da
   marca com flash de luz e transição para o site.

   Estrutura: uma linha do tempo declarativa (STEPS). Cada passo
   sabe o que digitar, quanto segurar e se deve sair de cena.
   Isso mantém o ritmo editável em um único lugar.
   ============================================================ */
(function () {
  'use strict';

  var E = window.EXPO;
  if (!E) return;

  var $ = E.$;
  var reduced = E.prefersReduced();

  var intro = $('#intro');
  if (!intro) return;

  /* ==========================================================
     1. LINHA DO TEMPO
     ==========================================================
     char  → ms por letra
     hold  → pausa depois de terminar de digitar
     pause → pausa extra quando a frase termina em pontuação
     ========================================================== */
  var START_DELAY  = 300;   /* respiro antes da primeira letra   */
  var OUT_DURATION = 300;   /* tempo do fade entre frases        */

  var STEPS = [
    { text: 'Seja bem-vindo...',                     char: 38, hold: 280, pause: 300 },
    { text: 'ao maior encontro de oportunidades...', char: 32, hold: 320, pause: 280 },
    { text: 'do mercado moveleiro.',                 char: 36, hold: 300, pause: 180 },
    { text: 'Bem-vindo à',                           char: 40, hold: 320, crest: true }
  ];

  var BRAND_ENTER_MS  = 1050;   /* subida das letras da marca   */
  var SITE_REVEAL_MS  = 620;    /* pausa após a marca antes de sair */

  /* ==========================================================
     2. REFERÊNCIAS DE DOM
     ========================================================== */
  var elTyped     = $('[data-intro-typed]');
  var elText      = $('[data-intro-text]');
  var elCaret     = $('[data-intro-caret]');
  var elBrand     = $('[data-intro-brand]');
  var elWelcome   = $('[data-intro-welcome]');
  var elWelcomeTx = $('[data-intro-welcome-text]');
  var elWelcomeCx = $('[data-intro-caret-2]');
  var elSkip      = $('[data-intro-skip]');
  var elFlash     = $('[data-intro-flash]');
  var elStage     = $('.intro__stage');

  var body = document.body;
  var root = document.documentElement;

  /* ==========================================================
     3. ESTADO / CONTROLE DE EXECUÇÃO
     ========================================================== */
  var timers    = [];
  var cancelled = false;
  var finished  = false;
  var progresso = 0;      /* incrementa a cada caractere digitado */

  /* Rede de segurança. NÃO é o mecanismo normal da animação — a
     sequência termina por conta própria em ~10,5s — serve para o
     caso de um erro inesperado na animação deixar o visitante
     preso na abertura para sempre, que foi exatamente o que
     aconteceu quando um ReferenceError derrubou a digitação.
     Vigia o progresso: enquanto houver caractere entrando ou o
     relógio avançando, espera; se a sequência parar de verdade,
     libera o site. */
  function vigiar() {
    if (reduced) return;
    var ultimoProgresso = -1;
    var estatico = 0;

    var vigia = window.setInterval(function () {
      if (finished || cancelled) { window.clearInterval(vigia); return; }

      if (progresso !== ultimoProgresso) {
        ultimoProgresso = progresso;
        estatico = 0;
        return;
      }

      if (++estatico >= 3) {          /* ~3s sem nada acontecendo */
        window.clearInterval(vigia);
        exitToSite();
      }
    }, 1000);
  }

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function wait(ms) {
    return new Promise(function (resolve) {
      if (cancelled) return resolve();
      later(resolve, ms);
    });
  }
  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  /* Trava o scroll enquanto a abertura acontece */
  function lockScroll() { root.classList.add('is-locked'); }
  function unlockScroll() { root.classList.remove('is-locked'); }

  /* ==========================================================
     4. CAMPO DE PARTÍCULAS DOURADAS
     Mesmo motor do encerramento — vem da fábrica do core.
     Densidade alta: é o único elemento vivo da tela preta.
     ========================================================== */
  var Particles = E.createField($('[data-intro-canvas]'), {
    density: 24000,
    minCount: 18,
    maxCount: 64,
    maxAlpha: 0.46,
    haloMin: 0.055,
    haloBreathe: 0.036
  });

  /* ==========================================================
     5. DIGITAÇÃO
     Cada letra entra individualmente, com micro-pausa em
     pontuação — é o que faz o ritmo soar humano.
     ========================================================== */
  function typeInto(node, text, charMs, onChar) {
    return new Promise(function (resolve) {
      var i = 0;

      function tick() {
        if (cancelled) return resolve();
        if (i >= text.length) return resolve();

        var ch = text.charAt(i);
        node.textContent = text.slice(0, i + 1);
        i++;
        progresso++;                    /* alimenta o detector de travamento */
        if (typeof onChar === 'function') onChar();

        /* micro-pausa depois de pontuação */
        var extra = 0;
        if (ch === '.') extra = 110;
        else if (ch === ',') extra = 70;

        later(tick, charMs + extra);
      }

      tick();
    });
  }

  function showCaret(el) { if (el) { el.hidden = false; el.classList.add('is-blinking'); } }
  function hideCaret(el) { if (el) { el.hidden = true; el.classList.remove('is-blinking'); } }

  /* ==========================================================
     6. CENAS
     ========================================================== */
  function revealBrand() {
    intro.classList.add('is-branded');
    if (elStage) elStage.classList.add('is-focused');

    /* flash de luz */
    if (elFlash && !reduced) {
      elFlash.classList.remove('is-flashing');
      void elFlash.offsetWidth;              /* reinicia a animação */
      elFlash.classList.add('is-flashing');
    }

    if (elBrand) elBrand.classList.add('is-in');
    if (elTyped) elTyped.classList.add('is-out');
  }

  function typeWelcome() {
    if (!elWelcome || !elWelcomeTx) return Promise.resolve();
    elWelcome.classList.add('is-on');
    showCaret(elWelcomeCx);
    return typeInto(elWelcomeTx, 'Negócios começam com encontros.', 34);
  }

  function exitToSite() {
    if (finished) return;
    finished = true;

    clearTimers();
    Particles.stop();
    hideCaret(elCaret);
    hideCaret(elWelcomeCx);

    intro.classList.add('is-leaving');
    unlockScroll();

    /* libera a entrada do site */
    body.classList.add('site-ready');

    var nav = $('[data-nav]');
    var dotnav = $('[data-dotnav]');
    /* pequeno atraso: o nav chega junto com o movimento da intro */
    later(function () {
      if (nav) nav.classList.add('is-in');
      if (dotnav) dotnav.classList.add('is-in');
    }, reduced ? 0 : 240);

    /* remove do fluxo depois da transição */
    later(function () {
      intro.classList.add('is-gone');
      intro.setAttribute('aria-hidden', 'true');
      if (document.activeElement && intro.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    }, reduced ? 60 : 1000);

    /* Se o usuário caiu direto numa âncora, o core já cuidou do scroll */
    if (E.ScrollBus && E.ScrollBus.poke) E.ScrollBus.poke();
  }

  /* ==========================================================
     7. ROTEIRO PRINCIPAL
     ========================================================== */
  async function run() {
    lockScroll();

    /* --- modo reduzido: sem digitação, mostra a marca e sai --- */
    if (reduced) {
      if (elTyped) elTyped.style.display = 'none';
      revealBrand();
      if (elSkip) elSkip.classList.add('is-in');
      later(exitToSite, 2200);
      return;
    }

    Particles.start();
    vigiar();
    if (elSkip) later(function () { elSkip.classList.add('is-in'); }, 700);

    await wait(START_DELAY);
    if (cancelled) return;

    showCaret(elCaret);

    for (var s = 0; s < STEPS.length; s++) {
      var step = STEPS[s];

      if (elTyped) elTyped.classList.remove('is-out');
      if (elText) elText.textContent = '';

      await typeInto(elText, step.text, step.char);
      if (cancelled) return;

      /* pausa de pontuação no fim da frase */
      if (step.pause) await wait(step.pause);
      if (cancelled) return;

      /* pausa dramática com a frase completa na tela */
      await wait(step.hold);
      if (cancelled) return;

      /* último passo: a marca entra no lugar de sair de cena */
      if (step.crest) {
        hideCaret(elCaret);
        revealBrand();
        break;
      }

      /* sai de cena */
      hideCaret(elCaret);
      if (elTyped) elTyped.classList.add('is-out');
      await wait(OUT_DURATION);
      if (cancelled) return;
    }

    /* frase final sob a marca */
    await wait(Math.round(BRAND_ENTER_MS * 0.62));
    if (cancelled) return;
    await typeWelcome();
    if (cancelled) return;

    await wait(SITE_REVEAL_MS);
    if (cancelled) return;

    hideCaret(elWelcomeCx);
    exitToSite();
  }

  /* ==========================================================
     8. PULAR
     ========================================================== */
  function skip() {
    if (cancelled || finished) return;
    cancelled = true;
    clearTimers();
    Particles.stop();

    hideCaret(elCaret);
    if (elTyped) elTyped.style.display = 'none';

    revealBrand();

    /* mostra a frase final rapidamente e sai */
    if (elWelcomeTx) elWelcomeTx.textContent = 'Negócios começam com encontros.';
    if (elWelcome) elWelcome.classList.add('is-on');

    later(function () {
      cancelled = false;
      finished = false;
      exitToSite();
    }, reduced ? 0 : 420);
  }

  if (elSkip) {
    elSkip.addEventListener('click', skip);
  }

  /* Enter / Esc / Espaço também pulam */
  function onKey(e) {
    if (finished || cancelled) return;
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      skip();
    }
  }
  document.addEventListener('keydown', onKey);

  /* Um clique/toque em qualquer lugar também acelera (após 1s) */
  var canTapSkip = false;
  later(function () { canTapSkip = true; }, 1000);
  intro.addEventListener('click', function (e) {
    if (!canTapSkip) return;
    if (e.target.closest && e.target.closest('[data-intro-skip]')) return;
    skip();
  });

  /* ==========================================================
     9. REVER A INTRODUÇÃO (botão no rodapé)
     ========================================================== */
  var replay = $('[data-replay-intro]');
  if (replay) {
    replay.addEventListener('click', function () {
      /* recarrega mantendo a rolagem no topo e sem âncora */
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.location.reload();
    });
  }

  /* ==========================================================
     10. PARTIDA
     ========================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  /* Exponho o término para o módulo do final poder se sincronizar */
  window.EXPO.intro = {
    isFinished: function () { return finished; },
    exit: exitToSite
  };
})();
