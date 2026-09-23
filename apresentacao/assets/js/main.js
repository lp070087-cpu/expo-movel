/* ============================================================
   EXPO MÓVEL — main.js
   Módulos de seção: manifesto (scrub de texto), cadeia,
   final (digitação + canvas) e saneamento de imagens.

   Padrão: nenhum listener de scroll próprio — tudo passa pelo
   ScrollBus do core.js. Valores contínuos vão direto ao DOM.
   ============================================================ */
(function () {
  'use strict';

  var E = window.EXPO;
  if (!E) return;

  var $ = E.$, clamp = E.clamp, lerp = E.lerp;
  var reduced = E.prefersReduced();
  var started = false;

  /* ==========================================================
     0. HERO — campo de partículas discreto
     ==========================================================
     Menor densidade que a abertura: aqui a poeira dourada dá
     profundidade ao fundo, sem competir com a tipografia.
     ========================================================== */
  function initHeroField() {
    var canvas = document.querySelector('[data-hero-canvas]');
    if (!canvas) return null;

    var field = E.createField(canvas, {
      density: 52000,
      minCount: 10,
      maxCount: 34,
      maxAlpha: 0.32,
      haloMin: 0.03,
      haloBreathe: 0.022,
      glowAt: 1.5
    });

    /* Só anima quando o hero está visível */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) field.start();
          else field.stop();
        });
      }, { threshold: 0.02 });
      io.observe(canvas);
    } else {
      field.start();
    }

    return field;
  }

  /* ==========================================================
     1. MANIFESTO — as linhas se revelam conforme o scroll
     ==========================================================
     Cada linha tem a sua janela de progresso dentro da pista.
     O reveal visual compartilha a MESMA variável --p usada pelo
     core, então nunca há duas fontes de verdade para o mesmo
     valor.
     ========================================================== */
  function initManifesto() {
    var rail  = $('[data-manifesto-rail]');
    var lines = E.$$('[data-manifesto-line]');
    if (!rail || !lines.length) return;

    /* primeiro comportamento (fallback seguro): a linha ganha a
       máscara via classe, controlada pelo mesmo observer dos reveals */
    if (!('IntersectionObserver' in window)) {
      lines.forEach(function (l) { l.classList.add('is-on'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        var idx = lines.indexOf(el);
        var delay = idx * 90;

        if (e.isIntersecting) {
          window.setTimeout(function () { el.classList.add('is-on'); }, reduced ? 0 : delay);
        } else if (!reduced && e.boundingClientRect.top > 0) {
          /* ao rolar de volta para cima, a linha volta a se fechar */
          el.classList.remove('is-on');
        }
      });
    }, { rootMargin: '-18% 0px -22% 0px', threshold: 0.01 });

    lines.forEach(function (l) { io.observe(l); });

    /* Scrub horizontal do clip-path dirigido pelo scroll.
       É a versão contínua do reveal — roda só no desktop e só
       quando o manifesto está na tela. */
    if (reduced) return;

    var active = false;
    var trackIO = new IntersectionObserver(function (entries) {
      active = !!entries[0].isIntersecting;
    }, { rootMargin: '10% 0px 10% 0px' });
    trackIO.observe(rail);

    E.ScrollBus.subscribe(function (_y, _py, _docH, winH) {
      if (!active) return;
      if (window.innerWidth <= 980) return;   /* no mobile o reveal simples basta */

      var rect   = rail.getBoundingClientRect();
      var runway = rect.height - winH;
      var p      = runway > 0 ? clamp(-rect.top / runway, 0, 1) : 0;

      /* mapeia o progresso para as linhas: a última só termina já perto do fim */
      var span = 0.86 / Math.max(1, lines.length);

      for (var i = 0; i < lines.length; i++) {
        var spanEl = lines[i].firstElementChild;
        if (!spanEl) continue;

        var start = i * span;
        var local = clamp((p - start) / span, 0, 1);
        var eased = 1 - Math.pow(1 - local, 2.1);   /* easeOutQuad suave */

        spanEl.style.clipPath = 'inset(0 ' + ((1 - eased) * 100).toFixed(2) + '% 0 0)';

        /* o texto clareia junto */
        var t = clamp(local * 1.35, 0, 1);
        var from = [110, 116, 132];   /* --text-dim */
        var to   = [255, 255, 255];
        var col  = 'rgb(' +
          Math.round(lerp(from[0], to[0], t)) + ',' +
          Math.round(lerp(from[1], to[1], t)) + ',' +
          Math.round(lerp(from[2], to[2], t)) + ')';

        lines[i].style.color = col;

        /* sincroniza a classe para o caso de reduced-motion ou IO atrasado */
        lines[i].classList.toggle('is-on', eased > 0.05);
      }
    });
  }

  /* ==========================================================
     2. CADEIA — a linha se desenha ao entrar
     ========================================================== */
  function initChain() {
    var chain = $('[data-chain]');
    if (!chain) return;

    if (!('IntersectionObserver' in window)) {
      chain.classList.add('is-drawn');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          chain.classList.add('is-drawn');
          io.unobserve(chain);
        }
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -10% 0px' });

    io.observe(chain);
  }

  /* ==========================================================
     3. FINAL — texto digitado + campo de luz
     ==========================================================
     A digitação só começa quando a seção entra na viewport, para
     o usuário ver a frase sendo escrita e não encontrá-la pronta.
     ========================================================== */
  function initFinal() {
    var section = $('#final');
    var textEl  = $('[data-final-text]');
    var caret   = $('[data-final-caret]');
    if (!section || !textEl) return;

    var CANVAS = E.createField($('[data-final-canvas]'), {
      density: 34000,
      minCount: 12,
      maxCount: 44,
      maxAlpha: 0.38,
      haloMin: 0.045,
      haloBreathe: 0.032
    });

    var LINES = [
      { text: 'Grandes negócios começam com um encontro.', hold: 900 },
      { text: 'Nos vemos na Expo Móvel.', hold: 1100 }
    ];

    var timers = [];
    var done = false;

    function later(fn, ms) { timers.push(window.setTimeout(fn, ms)); }

    function typeLine(line, onDone) {
      var i = 0;
      function tick() {
        if (i >= line.text.length) { later(onDone, line.hold); return; }
        var ch = line.text.charAt(i);
        textEl.textContent = line.text.slice(0, i + 1);
        i++;
        var extra = ch === '.' ? 110 : ch === ',' ? 70 : 0;
        later(tick, 36 + extra);
      }
      tick();
    }

    function run() {
      if (done) return;
      done = true;

      section.classList.add('is-revealed');
      if (CANVAS) CANVAS.start();

      /* modo reduzido: sem digitação */
      if (reduced) {
        textEl.textContent = LINES[LINES.length - 1].text;
        return;
      }

      if (caret) caret.hidden = false;

      typeLine(LINES[0], function () {
        /* troca de frase: apaga, respira, escreve a segunda */
        textEl.textContent = '';
        later(function () {
          typeLine(LINES[1], function () {
            if (caret) caret.hidden = true;
          });
        }, 340);
      });
    }

    if (!('IntersectionObserver' in window)) { run(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(); io.unobserve(section); }
      });
    }, { threshold: 0.38 });

    io.observe(section);
  }

  /* ==========================================================
     4. IMAGENS — falha visível e honesta
     ==========================================================
     Se um arquivo não carregar, removemos o bloco em vez de
     deixar um retângulo vazio no layout.
     ========================================================== */
  function initImages() {
    E.$$('img').forEach(function (img) {
      function fail() {
        var host = img.closest('.shot, .venue');
        if (host) {
          host.classList.add('is-missing');
          host.style.display = 'none';
        } else {
          img.style.display = 'none';
        }
      }
      if (img.complete) {
        if (img.naturalWidth === 0) fail();
      } else {
        img.addEventListener('error', fail, { once: true });
      }
    });
  }

  /* ==========================================================
     5. BOOT
     ========================================================== */
  function boot() {
    if (started) return;
    started = true;

    initHeroField();
    initManifesto();
    initChain();
    initFinal();
    initImages();

    /* reavalia o manifesto quando o layout muda de altura */
    window.addEventListener('load', function () { E.ScrollBus.poke(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
