/* ============================================================
   EXPO MÓVEL — core.js
   Motor base: utilitários, reveals, contadores, parallax,
   luz de cursor, botões magnéticos, progresso e navegação.

   Padrão adotado (herdado do iron-man-main):
   - listener de scroll PASSIVO com trava por requestAnimationFrame;
   - valores contínuos escritos DIRETO no DOM via ref, nunca via state;
   - IntersectionObserver para eventos discretos (entra/sai da tela);
   - prefers-reduced-motion respeitado em todos os módulos.
   ============================================================ */
(function () {
  'use strict';

  var doc  = document;
  var root = doc.documentElement;

  /* ----------------------------------------------------------
     Utilidades
     ---------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  var clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };
  var lerp  = function (a, b, t) { return a + (b - a) * t; };

  /* Easing escolhido pelo usuário no SO */
  var mq          = window.matchMedia ? window.matchMedia.bind(window) : null;
  var reducedMQ   = mq ? mq('(prefers-reduced-motion: reduce)') : null;
  var fineMQ      = mq ? mq('(hover: hover) and (pointer: fine)') : null;

  function prefersReduced() { return !!(reducedMQ && reducedMQ.matches); }
  function hasFinePointer() { return !!(fineMQ && fineMQ.matches); }

  /* ----------------------------------------------------------
     Rastreador de scroll compartilhado
     Um único loop de rAF distribui o scroll para todos os
     módulos. Nenhum módulo registra o seu próprio listener.
     ---------------------------------------------------------- */
  var ScrollBus = (function () {
    var subs   = [];
    var frame  = 0;
    var queued = false;
    var y = 0, prevY = 0, docH = 0, winH = 0;

    function measure() {
      winH = window.innerHeight;
      docH = Math.max(
        doc.body ? doc.body.scrollHeight : 0,
        root.scrollHeight
      );
      y = window.pageYOffset || root.scrollTop || 0;
    }

    function run() {
      queued = false;
      prevY = y;
      measure();
      for (var i = 0; i < subs.length; i++) {
        try { subs[i](y, prevY, docH, winH); } catch (e) { /* módulo isolado */ }
      }
      frame = 0;
    }

    function schedule() {
      if (queued) return;
      queued = true;
      frame = window.requestAnimationFrame(run);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', function () { measure(); schedule(); }, { passive: true });
    window.addEventListener('orientationchange', function () { measure(); schedule(); }, { passive: true });

    /* O conteúdo cresce depois (fontes, imagens): remede periodicamente */
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(schedule);
      ro.observe(doc.documentElement);
    }
    window.addEventListener('load', schedule);
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) schedule(); });

    measure();

    return {
      subscribe: function (fn) {
        subs.push(fn);
        fn(y, y, docH, winH);          // dispara uma vez para o estado inicial valer
        return function () {
          var i = subs.indexOf(fn);
          if (i > -1) subs.splice(i, 1);
        };
      },
      poke: schedule,
      state: function () { return { y: y, docH: docH, winH: winH }; }
    };
  })();

  /* ----------------------------------------------------------
     Progresso de leitura (barra no topo)
     ---------------------------------------------------------- */
  function initProgress() {
    var fill = $('[data-progress-fill]');
    if (!fill) return;

    ScrollBus.subscribe(function (y, _py, docH, winH) {
      var total = docH - winH;
      var p = total > 0 ? clamp(y / total, 0, 1) : 0;
      fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    });
  }

  /* ----------------------------------------------------------
     Reveals por IntersectionObserver
     ---------------------------------------------------------- */
  function initReveals() {
    var els = $$('[data-reveal], [data-reveal-mask]');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el   = entry.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);

        if (delay > 0 && !prefersReduced()) {
          window.setTimeout(function () { el.classList.add('is-in'); }, delay);
        } else {
          el.classList.add('is-in');
        }

        io.unobserve(el);

        /* libera a camada de composição depois da transição */
        window.setTimeout(function () { el.classList.add('is-done'); }, 1400 + delay);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     Contadores animados
     Um incremento por frame, disparado uma única vez.
     Possui tolerância: se o número não for finito, escreve o alvo.
     ---------------------------------------------------------- */
  function initCounters() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;

    function animate(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var pad    = parseInt(el.getAttribute('data-count-pad') || '0', 10);
      if (!isFinite(target)) { el.textContent = el.getAttribute('data-count') || ''; return; }

      if (prefersReduced()) {
        el.textContent = pad ? String(target).padStart(pad, '0') : String(target);
        return;
      }

      el.classList.add('is-counting');

      var dur      = 1750;
      var start    = 0;
      var t0       = 0;
      var running  = true;

      function frame(now) {
        if (!running) return;
        if (!t0) t0 = now;
        var t = clamp((now - t0) / dur, 0, 1);

        /* easeOutQuart — começa rápido e assenta devagar */
        var eased = 1 - Math.pow(1 - t, 4);
        var value = Math.round(lerp(start, target, eased));

        el.textContent = pad ? String(value).padStart(pad, '0') : String(value);
        if (t < 1) window.requestAnimationFrame(frame);
      }
      window.requestAnimationFrame(frame);

      /* Se a aba perder o foco, garante o valor final */
      window.setTimeout(function () {
        if (el.textContent !== (pad ? String(target).padStart(pad, '0') : String(target))) {
          el.textContent = pad ? String(target).padStart(pad, '0') : String(target);
        }
      }, dur + 400);
    }

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(animate);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        animate(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.45 });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ----------------------------------------------------------
     Parallax por elemento
     Profundidade leve: cada elemento declara a sua velocidade.
     Só roda quando o elemento está na viewport.
     ---------------------------------------------------------- */
  function initParallax() {
    var items = $$('[data-parallax]');
    if (!items.length || prefersReduced()) return;

    var visible = [];
    var io = null;

    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var i = visible.indexOf(e.target);
          if (e.isIntersecting && i === -1) visible.push(e.target);
          else if (!e.isIntersecting && i > -1) visible.splice(i, 1);
        });
      }, { rootMargin: '18% 0px 18% 0px' });
      items.forEach(function (el) { io.observe(el); });
    } else {
      visible = items;
    }

    var factor = hasFinePointer() ? 1 : 0.55;

    ScrollBus.subscribe(function (_y, _py, _docH, winH) {
      for (var i = 0; i < visible.length; i++) {
        var el   = visible[i];
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > winH + 200) continue;

        var speed = parseFloat(el.getAttribute('data-parallax-speed') || '0.1');
        /* -1 (acabou de entrar) .. 1 (vai sair) */
        var progress = clamp(((rect.top + rect.height / 2) - winH / 2) / (winH / 2 + rect.height / 2), -1, 1);
        var shift = -progress * speed * 100 * factor;

        el.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
      }
    });
  }

  /* ----------------------------------------------------------
     Luz de cursor (iluminação reagindo ao ponteiro)
     ---------------------------------------------------------- */
  function initSpotlight() {
    if (!hasFinePointer() || prefersReduced()) return;

    var body = doc.body;
    var cur = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
    var target = { x: cur.x, y: cur.y };
    var active = false;

    window.addEventListener('pointermove', function (e) {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!active) {
        active = true;
        body.classList.add('has-pointer');
        loop();
      }
    }, { passive: true });

    function loop() {
      cur.x = lerp(cur.x, target.x, 0.12);
      cur.y = lerp(cur.y, target.y, 0.12);
      root.style.setProperty('--mx', cur.x.toFixed(1) + 'px');
      root.style.setProperty('--my', cur.y.toFixed(1) + 'px');

      var settled = Math.abs(cur.x - target.x) < 0.4 && Math.abs(cur.y - target.y) < 0.4;
      if (settled) {
        cur.x = target.x; cur.y = target.y;
        root.style.setProperty('--mx', cur.x.toFixed(1) + 'px');
        root.style.setProperty('--my', cur.y.toFixed(1) + 'px');
        return;                        // para o loop até o próximo movimento
      }
      window.requestAnimationFrame(loop);
    }

    window.addEventListener('pointerleave', function () {
      body.classList.remove('has-pointer');
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Botões magnéticos
     ---------------------------------------------------------- */
  function initMagnetic() {
    if (!hasFinePointer() || prefersReduced()) return;

    $$('[data-magnetic]').forEach(function (el) {
      var strength = 0.26;
      var raf = 0;

      function move(e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * strength;
        var dy = (e.clientY - (r.top + r.height / 2)) * strength;
        if (raf) window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(function () {
          el.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
        });
      }

      function reset() {
        if (raf) window.cancelAnimationFrame(raf);
        el.style.transform = '';
      }

      el.addEventListener('pointerenter', function () { el.classList.add('is-pulling'); });
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-pulling');
        reset();
      });
      el.addEventListener('blur', reset);
    });
  }

  /* ----------------------------------------------------------
     Profundidade das imagens reagindo ao ponteiro
     ---------------------------------------------------------- */
  function initDepthImages() {
    if (!hasFinePointer() || prefersReduced()) return;

    var targets = $$('.gallery__board .shot, .gallery__venues .venue');
    if (!targets.length) return;

    targets.forEach(function (card) {
      var img = $('img', card);
      if (!img) return;
      var raf = 0;
      var max = 9;   /* px — discreto de propósito */

      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(function () {
          img.style.transform = 'translate3d(' + (-px * max).toFixed(2) + 'px,' + (-py * max).toFixed(2) + 'px,0) scale(1.06)';
        });
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        if (raf) window.cancelAnimationFrame(raf);
        img.style.transform = '';
      });
    });
  }

  /* ----------------------------------------------------------
     Navegação: estado fixo, link ativo e pontos laterais
     ---------------------------------------------------------- */
  function initNav() {
    var nav = $('[data-nav]');
    var dots = $$('[data-dot]');

    var sections = $$('main section[id]').filter(function (s) { return s.id; });

    if (nav) {
      ScrollBus.subscribe(function (y) {
        nav.classList.toggle('is-stuck', y > 40);
      });
    }

    if (!sections.length) return;

    var currentId = '';

    function update(id) {
      if (!id || id === currentId) return;
      currentId = id;

      dots.forEach(function (d) {
        d.classList.toggle('is-active', d.getAttribute('data-dot') === id);
      });

      $$('.nav__links a').forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
    }

    /* O link ativo é decidido pela seção mais próxima do topo da viewport */
    ScrollBus.subscribe(function (_y, _py, _docH, winH) {
      var best = '';
      var bestDist = Infinity;
      var probe = winH * 0.32;

      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        var r = s.getBoundingClientRect();

        /* ignora seções que não têm altura utilizável */
        if (r.height < 40) continue;

        var d = Math.abs(r.top - probe);
        if (r.top <= probe && r.bottom >= probe) { best = s.id; bestDist = 0; break; }
        if (d < bestDist) { bestDist = d; best = s.id; }
      }
      update(best);
    });
  }

  /* ----------------------------------------------------------
     Menu mobile
     ----------------------------------------------------------
     Até 1180px os links viram um painel suspenso (o CSS cuida do
     visual). Aqui só se abre e se fecha — e o painel TEM de
     fechar em tudo que tira o foco dele, senão ele fica sobre o
     conteúdo depois do clique:
       · clique num link (o próprio initAnchors rola a página);
       · tecla Escape;
       · clique/toque fora do cabeçalho;
       · a viewport voltando para o desktop (>=1180px), onde o
         painel deixa de existir e o estado aberto só serviria
         para travar o layout.
     O ScrollBus não é tocado: nada aqui registra scroll.
     ---------------------------------------------------------- */
  function initNavToggle() {
    var nav    = $('[data-nav]');
    var botao  = $('[data-nav-toggle]');
    var painel = doc.getElementById('nav-links');
    if (!nav || !botao || !painel) return;

    var aberto = false;
    var larguraMQ = mq ? mq('(max-width: 1180px)') : null;

    function escrever(estado) {
      aberto = estado;
      painel.classList.toggle('is-open', estado);
      botao.setAttribute('aria-expanded', estado ? 'true' : 'false');
      botao.setAttribute('aria-label', estado ? 'Fechar menu' : 'Abrir menu');
    }

    botao.addEventListener('click', function (e) {
      e.preventDefault();
      escrever(!aberto);
    });

    /* Fecha ao escolher um destino — a rolagem fica com o initAnchors */
    painel.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (a) escrever(false);
    });

    doc.addEventListener('keydown', function (e) {
      if (!aberto) return;
      if (e.key === 'Escape' || e.keyCode === 27) {
        escrever(false);
        botao.focus();
      }
    });

    doc.addEventListener('click', function (e) {
      if (!aberto) return;
      if (nav.contains(e.target)) return;   /* clique dentro do cabeçalho */
      escrever(false);
    });

    /* Voltando ao desktop o painel não existe: zera o estado */
    function aoTrocarLargura() {
      if (aberto && larguraMQ && !larguraMQ.matches) escrever(false);
    }
    if (larguraMQ && larguraMQ.addEventListener) {
      larguraMQ.addEventListener('change', aoTrocarLargura);
    } else if (larguraMQ && larguraMQ.addListener) {
      larguraMQ.addListener(aoTrocarLargura);
    }
  }

  /* ----------------------------------------------------------
     Superfície sob a navegação
     ----------------------------------------------------------
     A barra flutua sobre fundo amarelo, off-white e preto. Em vez
     de manter uma lista de seções no JS, cada seção declara a sua
     superfície em data-surface e o JS só espelha o que já está no
     HTML. Uma única leitura por frame.
     ---------------------------------------------------------- */
  function initSurfaceState() {
    var nav = $('[data-nav]');
    if (!nav) return;

    var surf = $$('[data-surface]');
    if (!surf.length) return;

    var atual = '';

    function update() {
      var probe = navHeight() * 0.6;
      var achado = '';

      for (var i = 0; i < surf.length; i++) {
        var r = surf[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) achado = surf[i].getAttribute('data-surface') || '';
      }

      if (achado === atual) return;
      atual = achado;

      nav.classList.toggle('on-light',  achado === 'light' || achado === 'paper');
      nav.classList.toggle('on-yellow', achado === 'yellow');
      nav.classList.toggle('on-navy',   achado === 'navy');
    }

    ScrollBus.subscribe(update);
    update();
  }

  /* ----------------------------------------------------------
     Ano do rodapé
     ---------------------------------------------------------- */
  function initYear() {
    var el = $('[data-year]');
    if (!el) return;
    el.textContent = '2027';   /* ano do circuito apresentado */
  }

  /* ----------------------------------------------------------
     Rolagem suave para âncoras internas
     O scroll-behavior:smooth do CSS já cobre a maior parte,
     mas aqui garantimos a compensação pelo cabeçalho fixo.
     ---------------------------------------------------------- */
  function initAnchors() {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;

      var href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;

      var target = doc.getElementById(href.slice(1));
      if (!target) return;

      e.preventDefault();

      var navH = navHeight();
      var top = target.getBoundingClientRect().top + (window.pageYOffset || 0) - navH - 8;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReduced() ? 'auto' : 'smooth'
      });

      /* atualiza a URL sem empilhar histórico extra */
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', href);
      }

      /* move o foco para a seção (acessibilidade) */
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      window.setTimeout(function () { target.focus({ preventScroll: true }); }, prefersReduced() ? 0 : 520);
    });
  }

  function navHeight() {
    var nav = $('[data-nav]');
    return nav ? nav.getBoundingClientRect().height : 70;
  }

  /* ----------------------------------------------------------
     Failsafe: nada pode ficar invisível por causa de um reveal
     ---------------------------------------------------------- */
  function initFailsafe() {
    window.setTimeout(function () {
      $$('[data-reveal]:not(.is-in), [data-reveal-mask]:not(.is-in)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        /* só força o que já está dentro da tela — o resto segue animando */
        if (r.top < window.innerHeight * 0.95 && r.bottom > 0) {
          el.classList.add('is-in');
        }
      });
    }, 2600);
  }

  /* ----------------------------------------------------------
     Bootstrap
     ---------------------------------------------------------- */
  function boot() {
    initProgress();
    initReveals();
    initCounters();
    initParallax();
    initSpotlight();
    initMagnetic();
    initDepthImages();
    initNav();
    initNavToggle();
    initSurfaceState();
    initYear();
    initAnchors();
    initFailsafe();
  }

  /* ----------------------------------------------------------
     Campo de partículas douradas em canvas
     ----------------------------------------------------------
     Fábrica compartilhada: a abertura e o encerramento usam
     exatamente o mesmo motor, só mudando densidade e intensidade.
     A densidade é proporcional à área (com teto), o DPR é limitado
     a 2 e a animação pausa quando a aba não está visível.
     ---------------------------------------------------------- */
  function createField(canvas, opts) {
    var o = opts || {};
    var density   = o.density   || 26000;   /* área por partícula */
    var minCount  = o.minCount  || 18;
    var maxCount  = o.maxCount  || 62;
    var glowAt    = o.glowAt    || 1.35;    /* raio a partir do qual há halo */
    var haloMin   = o.haloMin   || 0.055;
    var haloBreathe = o.haloBreathe || 0.035;
    var maxAlpha  = o.maxAlpha  || 0.45;

    var empty = { start: function () {}, stop: function () {}, resize: function () {} };
    if (!canvas) return empty;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return empty;

    var dpr = 1, w = 0, h = 0, motes = [], raf = 0, running = false, t = 0;
    var dead = false;

    function resize() {
      dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      if (!w || !h) return;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var count = clamp(Math.round((w * h) / density), minCount, maxCount);
      motes = [];
      for (var i = 0; i < count; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.5 + Math.random() * 1.7,
          vy: -(0.05 + Math.random() * 0.3),
          vx: (Math.random() - 0.5) * 0.15,
          a: 0.1 + Math.random() * maxAlpha,
          tw: Math.random() * Math.PI * 2,
          tws: 0.006 + Math.random() * 0.019
        });
      }
    }

    function draw() {
      if (running === false || dead) return;
      t += 1;

      ctx.clearRect(0, 0, w, h);

      var breathe = 0.5 + Math.sin(t * 0.004) * 0.5;
      var g = ctx.createRadialGradient(
        w * 0.5, h * 0.52, 0,
        w * 0.5, h * 0.52, Math.max(w, h) * (0.34 + breathe * 0.06)
      );
      g.addColorStop(0, 'rgba(245,224,0,' + (haloMin + breathe * haloBreathe).toFixed(4) + ')');
      g.addColorStop(0.45, 'rgba(245,224,0,0.016)');
      g.addColorStop(1, 'rgba(245,224,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];

        m.y += m.vy; m.x += m.vx; m.tw += m.tws;

        if (m.y < -12) { m.y = h + 12; m.x = Math.random() * w; }
        if (m.x < -12) m.x = w + 12;
        if (m.x > w + 12) m.x = -12;

        var alpha = m.a * (0.55 + Math.sin(m.tw) * 0.45);

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,242,122,' + alpha.toFixed(3) + ')';
        ctx.fill();

        if (m.r > glowAt) {
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * 3.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(245,224,0,' + (alpha * 0.05).toFixed(3) + ')';
          ctx.fill();
        }
      }

      raf = window.requestAnimationFrame(draw);
    }

    function start() {
      /* prefersReduced() e não uma variável solta: aqui dentro não
         existe `reduced`, e sob 'use strict' isso lançava
         ReferenceError na montagem do campo de partículas — o que
         derrubava a abertura inteira. */
      if (prefersReduced() || running || dead) return;
      /* mede antes de iniciar: o canvas pode ter ficado pronto agora */
      if (!w || !h) resize();
      running = true;
      raf = window.requestAnimationFrame(draw);
    }
    function stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }
    function destroy() {
      stop();
      dead = true;
      if (window.ResizeObserver) ro.disconnect();
    }

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { if (running) resize(); });
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', function () { if (running) resize(); }, { passive: true });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (!dead) start();
    });

    return { start: start, stop: stop, resize: resize, destroy: destroy };
  }

  /* ----------------------------------------------------------
     API pública — usada pelos módulos intro/journey/main
     ---------------------------------------------------------- */
  window.EXPO = {
    $: $,
    $$: $$,
    clamp: clamp,
    lerp: lerp,
    ScrollBus: ScrollBus,
    prefersReduced: prefersReduced,
    hasFinePointer: hasFinePointer,
    navHeight: navHeight,
    createField: createField
  };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
