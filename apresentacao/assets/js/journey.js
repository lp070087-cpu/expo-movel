/* ============================================================
   EXPO MÓVEL — journey.js
   Jornada do Calendário 2027.

   Técnica: seção com pista longa (sticky-stage) + progresso de
   scroll normalizado + requestAnimationFrame. A rota é um <path>
   SVG cujo stroke-dashoffset é escrito direto no atributo,
   acompanhando exatamente o scroll do usuário.

   DUAS GEOMETRIAS, A MESMA EXPERIÊNCIA
   ------------------------------------
   PAISAGEM (desktop, tablet largo, celular deitado)
     A caixa da rota é um quadro só do tamanho do palco. As paradas
     ficam onde os `data-x`/`data-y` do HTML as puseram — a tabela de
     cinco pontos num quadro 16:9, que nunca se cruza.

   RETRATO (celular em pé)
     O mesmo quadro esticado para 390x844 dá escala 0,39 em x e 2,01
     em y, e aí cinco cartões de ~170px de altura se sobrepõem aos
     pares (medido em gerbench.py: 4 conflitos, o pior 275x138px, e
     duas caixas fora do palco). Não existe tabela que resolva — é
     falta de espaço, não de número.
     Então, SÓ em `@media (max-width:980px) and (orientation:portrait)`,
     a camada das paradas cresce por `svh` (300svh) e SOBE com o
     scroll. O palco segue sticky em 100svh, a rota segue desenhada
     por stroke-dashoffset casado com o progresso, e o `is-reached`
     segue acendendo cidade, data e CTA um a um — mas cada parada tem
     ~20svh de faixa só para ela, e a viagem acontece de verdade: a
     cidade seguinte entra por baixo, em vez de aparecer no mesmo
     lugar da anterior.

   Em ambos os modos o progresso é o MESMO:
       p = (rolagem dentro da pista) / (pista - altura do palco)
   Em retrato o deslocamento da camada é 100% desse progresso, então
   rota e cartões nunca se separam.

   A LISTA ESTÁTICA NÃO ESTÁ AQUI. Ela vive só em
   `prefers-reduced-motion`, onde é acessibilidade. Por largura de
   tela ela não é mais usada.
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
  var layer  = $('[data-journey-layer]');
  var stops  = $$('.stop', journey);
  var hudIdx = $('[data-journey-index]');
  var hudBar = $('[data-journey-bar]');

  if (!rail || !svg || !path || !stops.length) return;

  var MOBILE_BP = 980;

  /* Altura da camada em retrato, em svh. PRECISA bater com o
     `height:300svh` de `@media (max-width:980px) and
     (orientation:portrait)` no layout.css: é o referencial das
     coordenadas normalizadas. */
  var LAYER_SVH = 300;

  /* As cinco posições em RETRATO, em % da camada (0..100).
     Passo de 16,5% = 33% da altura da viewport. Assim a parada i
     fica centrada no palco quando p ≈ 0,05 / 0,28 / 0,515 / 0,748 /
     0,98 — e a folga entre paradas é de 433px em 430x932 e 264px em
     320x568, contra cartões de 189px a 150px.
     O ziguezague 30/70/30/70/50 dá 34px a 21px de folga lateral. */
  var PT_X = [30, 70, 30, 70, 50];
  var PT_Y = [20, 36.5, 53, 69.5, 86];

  /* ----------------------------------------------------------
     Estado
     ---------------------------------------------------------- */
  var portrait = false;   /* retrato = camada alta + rota normalizada */
  var canvasH = 0;        /* altura da caixa do SVG em px */
  var layerH = 0;         /* altura real da camada (= canvasH) */
  var passo = 0;          /* quanto a camada sobe do início ao fim */
  var progress = 0;       /* último progresso pintado */
  var layerShift = 0;     /* deslocamento atual da camada, em px */
  var pts = [];           /* pontos em px da CAIXA */
  var fractions = [];
  var totalLen = 0;
  var ready = false;
  var lastIndex = -1;

  /* ----------------------------------------------------------
     Modo
     ---------------------------------------------------------- */
  function ehRetrato() {
    return window.innerWidth <= MOBILE_BP &&
           window.innerHeight > window.innerWidth;
  }

  /* ----------------------------------------------------------
     Geometria
     ---------------------------------------------------------- */
  /* Pontos em coordenadas de VIEWPORT (0..100 nos dois eixos):
     0 = topo do palco, 100 = base do palco, -100 = uma tela acima. */
  function pontosViewport() {
    var x = [], y = [], i;

    if (portrait) {
      for (i = 0; i < stops.length; i++) {
        x.push(PT_X[i]);
        /* PT_Y é % da camada (0..100) -> % da viewport, e então o
           deslocamento da camada, medido pelo MESMO `progress` que
           move o `--layer-shift`. */
        y.push(PT_Y[i] / 100 * (layerH / window.innerHeight) * 100
               - progress * (passo / window.innerHeight) * 100);
      }
    } else {
      for (i = 0; i < stops.length; i++) {
        var el = stops[i];
        x.push(parseFloat(el.getAttribute('data-x') || '50'));
        /* 50% é o centro do palco — a mesma âncora do CSS. */
        y.push(parseFloat(el.getAttribute('data-y') || '50') - 50);
      }
    }
    return { x: x, y: y };
  }

  /* Converte viewport -> unidades da caixa do SVG.
     A caixa é sempre [0..100] em x e [0..canvasH] em y, com
     `preserveAspectRatio="none"`; então o desenho estica junto com a
     caixa e não perde o alinhamento com os cartões, que estão no
     mesmo referencial, por %. */
  function readPoints() {
    var pv = pontosViewport();
    var out = [];
    for (var i = 0; i < pv.x.length; i++) {
      var py = pv.y[i] / 100 * canvasH;
      out.push({ x: pv.x[i], y: py, px: pv.x[i], py: py });
    }
    return out;
  }

  /* Posição de cada parada, em % do REFERENCIAL DELA.
     - retrato: % da camada (o CSS posiciona dentro da camada);
     - paisagem: % do palco (o CSS posiciona dentro do palco). */
  function escreverPosicoes() {
    for (var i = 0; i < stops.length; i++) {
      if (portrait) {
        /* A camada se move por `transform`; o filho só precisa ficar
           na posição absoluta dentro dela. */
        stops[i].style.setProperty('--sx', PT_X[i] + '%');
        stops[i].style.setProperty('--sy', PT_Y[i] + '%');
        stops[i].style.setProperty('--ly', '0px');
      } else {
        var el = stops[i];
        stops[i].style.setProperty('--sx',
          parseFloat(el.getAttribute('data-x') || '50') + '%');
        stops[i].style.setProperty('--sy',
          parseFloat(el.getAttribute('data-y') || '50') + '%');
        stops[i].style.setProperty('--ly', '0px');
      }
    }
  }

  /* Catmull-Rom → Bézier cúbica: rota curva e natural */
  function smoothPathD(p) {
    if (p.length < 2) return '';
    var d = 'M' + p[0].px.toFixed(2) + ' ' + p[0].py.toFixed(2);

    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i];
      var p1 = p[i];
      var p2 = p[i + 1];
      var p3 = p[i + 2] || p2;

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
  function computeFractions(pathEl, p, total) {
    var out = [0];

    for (var i = 1; i < p.length; i++) {
      /* O caminho é monótono em Y (as paradas nunca voltam para trás
         na vertical, nas duas geometrias), então a busca é por Y. */
      var targetY = p[i].py;
      var lo = 0, hi = total, mid = total, guard = 0;

      while (guard++ < 42) {
        mid = (lo + hi) / 2;
        var q = pathEl.getPointAtLength(mid);
        if (q.y < targetY) lo = mid; else hi = mid;
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
  function build() {
    portrait = ehRetrato();

    /* A caixa do SVG é o referencial de tudo. Medida de uma vez só:
       nenhum getter de layout dentro do laço de pintura. */
    canvasH = svg.getBoundingClientRect().height;
    if (!canvasH || canvasH < 2) {
      /* Sem layout ainda (ou display:none): o que o CSS promete. */
      canvasH = portrait
        ? LAYER_SVH / 100 * window.innerHeight
        : window.innerHeight;
    }
    layerH = canvasH;
    /* Quanto a camada sobe do início ao fim do progresso. Zero em
       paisagem (a camada É o palco). É o MESMO número usado pelo
       `--layer-shift` e pelas coordenadas da rota. */
    passo = portrait ? Math.max(0, layerH - window.innerHeight) : 0;

    /* O viewBox é [0..100] em x e [0..canvasH] em y. Com
       `preserveAspectRatio="none"` isso dá uma transformação
       identidade entre unidades e px: o traço não é escalado de
       forma nenhuma e o `vector-effect:non-scaling-stroke` do CSS
       continua valendo. Em PAISAGEM o primeiro build (antes de o
       layout assentar) pode cair no palpite acima; aí o número bate
       com os 420 do HTML e o viewBox não muda de valor. */
    svg.setAttribute('viewBox', '0 0 100 ' + canvasH.toFixed(2));

    escreverPosicoes();

    pts = readPoints();
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

    /* Reconstrói com o progresso que já está na tela, para um resize
       não deixar a rota parada esperando o próximo scroll. */
    paint(progress);
  }

  /* ----------------------------------------------------------
     Estado visual dirigido pelo progresso
     ---------------------------------------------------------- */
  function paint(p) {
    progress = clamp(p, 0, 1);

    if (!ready) return;

    /* Em retrato a camada sobe junto com o progresso — com o MESMO
       `passo` que gerou as coordenadas do caminho, então rota e
       cartões nunca se separam. */
    if (portrait && layer) {
      layerShift = -progress * passo;
      layer.style.setProperty('--layer-shift', layerShift.toFixed(2) + 'px');
    }

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
      stops[k].classList.toggle('is-current',
        k === nearest && progress > 0.004);
    }

    if (nearest !== lastIndex) {
      lastIndex = nearest;
      if (hudIdx) hudIdx.textContent = String(nearest + 1).padStart(2, '0');
    }
  }

  /* ----------------------------------------------------------
     Ciclo de vida
     ---------------------------------------------------------- */
  var unsubscribe = null;
  var lastPortrait = null;

  function ligar() {
    if (unsubscribe) return;
    unsubscribe = E.ScrollBus.subscribe(function (_y, _py, _docH, winH) {
      var railH = rail.offsetHeight;
      var rect = rail.getBoundingClientRect();
      var runway = railH - winH;

      /* O modo pode ter virado com a rotação do aparelho. */
      var agora = ehRetrato();
      if (agora !== lastPortrait) {
        lastPortrait = agora;
        portrait = agora;
        build();
      }

      var p = runway > 0
        ? clamp(-rect.top / runway, 0, 1)
        : (rect.top <= winH * 0.5 ? 1 : 0);

      paint(p);
    });
  }

  /* Estado estático: só para quem pediu MENOS MOVIMENTO (ou não tem
     JS dependente de observer). Por largura de tela isto não é mais
     usado — ver o bloco de orientação no layout.css. */
  function estatico() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    lastIndex = -1;
    progress = 1;

    if (path) path.style.strokeDashoffset = 0;
    if (hudBar) hudBar.style.transform = 'scaleX(1)';
    for (var i = 0; i < stops.length; i++) {
      stops[i].classList.add('is-reached');
      stops[i].classList.remove('is-current');
    }
  }

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */
  function boot() {
    portrait = ehRetrato();
    lastPortrait = portrait;

    if (reduced) {
      estatico();
    } else {
      build();
      ligar();
    }

    /* A rota depende das fontes carregadas: reconstrói depois */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!reduced) { build(); E.ScrollBus.poke(); }
      }).catch(function () {});
    }

    window.addEventListener('load', function () {
      if (!reduced) { build(); E.ScrollBus.poke(); }
    });

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (reduced) return;
        portrait = ehRetrato();
        lastPortrait = portrait;
        build();
        if (!unsubscribe) ligar();
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
    isMobile: function () { return portrait; },
    geometry: function () {
      return { portrait: portrait, canvasH: canvasH, viewBox: svg.getAttribute('viewBox'),
               progress: progress, layerShift: layerShift };
    }
  };
})();
