/* ============================================================
   EXPO MÓVEL — journey.js
   Jornada do Calendário 2027.

   Técnica: seção com pista longa (sticky-stage) + progresso de
   scroll normalizado + requestAnimationFrame. A rota é um <path>
   SVG cujo stroke-dashoffset é escrito direto no atributo,
   acompanhando exatamente o scroll do usuário.

   As posições das paradas vêm do próprio HTML (data-x / data-y),
   então a rota e os pontos nunca saem de sincronia: o path é
   construído a partir dos mesmos números.

   No mobile (<= 980px) o sticky é desligado pelo CSS e a rota
   vira uma timeline vertical — este módulo sai de cena.
   ============================================================ */
(function () {
  'use strict';

  var E = window.EXPO;
  if (!E) return;

  var $ = E.$, $$ = E.$$, clamp = E.clamp;
  var reduced = E.prefersReduced();

  var journey = $('[data-journey]');
  if (!journey) return;

  var rail   = $('[data-journey-rail]');
  var svg    = $('[data-journey-svg]');
  var path   = $('[data-journey-path]');
  var pathBg = $('[data-journey-path-bg]');
  var stops  = $$('.stop', journey);
  var hudIdx = $('[data-journey-index]');
  var hudBar = $('[data-journey-bar]');
  var list   = $('[data-journey-list]');

  if (!rail || !svg || !path || !stops.length) return;

  var VB_W = 1000, VB_H = 420;      /* precisa bater com o viewBox do HTML */
  var MOBILE_BP = 980;

  /* ----------------------------------------------------------
     Geometria
     ---------------------------------------------------------- */
  function readPoints() {
    return stops.map(function (el) {
      var x = parseFloat(el.getAttribute('data-x') || '50');
      var y = parseFloat(el.getAttribute('data-y') || '50');
      return { x: x, y: y, px: x / 100 * VB_W, py: y / 100 * VB_H };
    });
  }

  /* Catmull-Rom → Bézier cúbica: rota curva e natural */
  function smoothPathD(pts) {
    if (pts.length < 2) return '';
    var d = 'M' + pts[0].px.toFixed(2) + ' ' + pts[0].py.toFixed(2);

    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;

      var c1x = p1.px + (p2.px - p0.px) / 6;
      var c1y = p1.py + (p2.py - p0.py) / 6;
      var c2x = p2.px - (p3.px - p1.px) / 6;
      var c2y = p2.py - (p3.py - p1.py) / 6;

      d += ' C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) +
           ',' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) +
           ',' + p2.px.toFixed(2) + ' ' + p2.py.toFixed(2);
    }
    return d;
  }

  /* Fração do comprimento da rota em que cada parada cai.
     Busca binária sobre getPointAtLength — assim o ponto acende
     exatamente quando a linha chega nele, não por aproximação. */
  function computeFractions(pathEl, pts, total) {
    var out = [0];

    for (var i = 1; i < pts.length; i++) {
      var targetX = pts[i].px;
      var lo = 0, hi = total, mid = total, guard = 0;

      while (guard++ < 42) {
        mid = (lo + hi) / 2;
        var p = pathEl.getPointAtLength(mid);
        if (p.x < targetX) lo = mid; else hi = mid;
        if (hi - lo < 0.35) break;
      }
      out.push(clamp(mid / total, 0, 1));
    }

    /* garante monotonicidade crescente */
    for (var j = 1; j < out.length; j++) {
      if (out[j] <= out[j - 1]) out[j] = Math.min(1, out[j - 1] + 0.0001);
    }
    out[out.length - 1] = 1;
    return out;
  }

  /* ----------------------------------------------------------
     Construção
     ---------------------------------------------------------- */
  var pts = [];
  var fractions = [];
  var totalLen = 0;
  var ready = false;

  function build() {
    pts = readPoints();

    /* posições das paradas no palco */
    pts.forEach(function (p, i) {
      stops[i].style.setProperty('--sx', p.x + '%');
      stops[i].style.setProperty('--sy', p.y + '%');
    });

    var d = smoothPathD(pts);
    path.setAttribute('d', d);
    if (pathBg) pathBg.setAttribute('d', d);

    /* comprimento depois que o layout assentou */
    try {
      totalLen = path.getTotalLength();
    } catch (err) {
      totalLen = 0;
    }

    if (!totalLen || !isFinite(totalLen)) {
      ready = false;
      return;
    }

    path.style.strokeDasharray = totalLen + ' ' + totalLen;
    path.style.strokeDashoffset = totalLen;

    fractions = computeFractions(path, pts, totalLen);
    ready = true;
  }

  /* ----------------------------------------------------------
     Estado visual dirigido pelo progresso
     ---------------------------------------------------------- */
  var lastIndex = -1;

  function paint(progress) {
    if (!ready) return;

    path.style.strokeDashoffset = (totalLen * (1 - progress)).toFixed(2);

    if (hudBar) hudBar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';

    /* parada mais próxima do progresso atual */
    var nearest = 0;
    var bestDist = Infinity;

    for (var i = 0; i < fractions.length; i++) {
      var f = fractions[i];

      /* acende quando a rota alcança; mantém aceso depois */
      stops[i].classList.toggle('is-reached', progress >= f - 0.035);

      var dist = Math.abs(progress - f);
      if (dist < bestDist) { bestDist = dist; nearest = i; }
    }

    for (var k = 0; k < stops.length; k++) {
      stops[k].classList.toggle('is-current', k === nearest && progress > 0.004);
    }

    if (nearest !== lastIndex) {
      lastIndex = nearest;
      if (hudIdx) hudIdx.textContent = String(nearest + 1).padStart(2, '0');
    }
  }

  /* ----------------------------------------------------------
     Ciclo de vida
     ---------------------------------------------------------- */
  var isMobile = false;
  var unsubscribe = null;

  function enable() {
    if (isMobile) return;

    if (!ready) build();

    if (!unsubscribe) {
      unsubscribe = E.ScrollBus.subscribe(function (_y, _py, _docH, winH) {
        if (isMobile) return;

        var railH = rail.offsetHeight;
        var rect  = rail.getBoundingClientRect();
        var runway = railH - winH;

        var progress = runway > 0
          ? clamp(-rect.top / runway, 0, 1)
          : (rect.top <= winH * 0.5 ? 1 : 0);

        paint(progress);
      });
    }
  }

  function disable() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    lastIndex = -1;

    /* no mobile tudo já está visível pelo CSS */
    path.style.strokeDashoffset = 0;
    if (hudBar) hudBar.style.transform = 'scaleX(1)';
  }

  function applyMode() {
    var nowMobile = window.innerWidth <= MOBILE_BP;

    if (nowMobile !== isMobile) {
      isMobile = nowMobile;
      if (isMobile) disable();
      else { build(); enable(); }
      return;
    }

    isMobile = nowMobile;

    if (isMobile) {
      disable();
    } else {
      build();
      enable();
      if (!unsubscribe) {
        /* garante o listener mesmo no primeiro passo */
        unsubscribe = E.ScrollBus.subscribe(function (_y, _py, _docH, winH) {
          if (isMobile) return;
          var railH = rail.offsetHeight;
          var rect  = rail.getBoundingClientRect();
          var runway = railH - winH;
          var progress = runway > 0
            ? clamp(-rect.top / runway, 0, 1)
            : (rect.top <= winH * 0.5 ? 1 : 0);
          paint(progress);
        });
      }
    }
  }

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */
  function boot() {
    isMobile = window.innerWidth <= MOBILE_BP;

    if (isMobile) {
      disable();
    } else {
      build();
      enable();
    }

    /* A rota depende das fontes carregadas: reconstrói depois */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!isMobile) { build(); E.ScrollBus.poke(); }
      }).catch(function () {});
    }

    window.addEventListener('load', function () {
      if (!isMobile) { build(); E.ScrollBus.poke(); }
    });

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (reduced) return;
        applyMode();
        E.ScrollBus.poke();
      }, 180);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* Exposto para depuração/validação */
  window.EXPO.journey = {
    rebuild: build,
    fractions: function () { return fractions.slice(); },
    isMobile: function () { return isMobile; }
  };
})();
