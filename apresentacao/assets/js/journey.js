/* ============================================================
   EXPO MÓVEL — journey.js
   Jornada do Calendário 2027.

   Técnica: seção com pista longa (sticky-stage) + progresso de
   scroll normalizado + requestAnimationFrame. A rota é um <path>
   SVG cujo stroke-dashoffset é escrito direto no atributo,
   acompanhando exatamente o scroll do usuário.

   DOIS MODOS, ESCOLHIDOS POR LARGURA
   ----------------------------------
   ROTA (a partir de 981px — desktop e tablet largo)
     A caixa da rota é um quadro só do tamanho do palco. As paradas
     ficam onde os `data-x`/`data-y` do HTML as puseram — a tabela de
     cinco pontos num quadro 16:9, que nunca se cruza. O progresso é
         p = (rolagem dentro da pista) / (pista - altura do palco)
     e `paint()` escreve o `stroke-dashoffset`, o HUD e as classes
     `is-reached`/`is-current`.

   LISTA (até 980px — celular, em pé ou deitado)
     O calendário é uma timeline vertical; o palco, o canvas e o HUD
     nem existem no fluxo (o layout.css esconde). Aqui o módulo faz
     UMA coisa: sair do caminho. `disable()` cancela a assinatura do
     ScrollBus e não sobra nenhuma leitura de layout por evento de
     rolagem. A revelação das praças, nesse modo, é estática e vem
     do CSS — todas as cinco já estão visíveis.

   O modo é reavaliado no `resize`, então girar o aparelho troca de
   um para o outro sem deixar resíduo do anterior.
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

  if (!rail || !svg || !path || !stops.length) return;

  var MOBILE_BP = 980;

  /* Abaixo de 981px o calendário é uma TIMELINE VERTICAL, não a
     rota animada. Quem decide isso é o CSS (`@media (max-width:980px)`
     no layout.css); aqui o módulo só precisa saber que, nessa faixa,
     não há pista nem caminho a desenhar — e que portanto ele NÃO pode
     assinar o ScrollBus.

     Por que isso importa para o bug do iOS: o subscriber chamava
     `rail.offsetHeight` e `rail.getBoundingClientRect()` a CADA
     evento de rolagem. Numa timeline vertical, `paint()` não tem o
     que pintar, mas a leitura de layout acontece do mesmo jeito —
     e medir o layout no meio da rolagem é a receita conhecida de
     salto no Safari do iOS. Desligado o modo, o módulo sai do
     caminho quente por completo: nenhuma leitura, nenhuma escrita.

     A geometria de retrato que existia aqui (camada de `300svh`, uma
     tabela de posições `PT_X`/`PT_Y` e o `--layer-shift`) foi
     REMOVIDA junto com o bloco de CSS que a sustentava. Não há mais
     caminho em que o módulo desenhe a rota no celular, então manter
     as duas tabelas de coordenadas só criaria a ilusão de que o
     retrato ainda é atendido por aqui. */

  /* ----------------------------------------------------------
     Estado
     ---------------------------------------------------------- */
  var canvasH = 0;        /* altura da caixa do SVG em px */
  var progress = 0;       /* último progresso pintado */
  var pts = [];           /* pontos em px da CAIXA */
  var fractions = [];
  var totalLen = 0;
  var ready = false;
  var lastIndex = -1;

  /* ----------------------------------------------------------
     Geometria
     ---------------------------------------------------------- */
  /* Pontos em coordenadas de VIEWPORT (0..100 nos dois eixos):
     0 = topo do palco, 100 = base do palco, -100 = uma tela acima. */
  function pontosViewport() {
    var x = [], y = [], i;

    for (i = 0; i < stops.length; i++) {
      var el = stops[i];
      x.push(parseFloat(el.getAttribute('data-x') || '50'));
      /* 50% é o centro do palco — a mesma âncora do CSS. */
      y.push(parseFloat(el.getAttribute('data-y') || '50') - 50);
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

  /* Posição de cada parada, em % do PALCO — o CSS posiciona dentro
     dele. As coordenadas vêm dos `data-x`/`data-y` do HTML, que são
     as mesmas no desktop aprovado. */
  function escreverPosicoes() {
    for (var i = 0; i < stops.length; i++) {
      var el = stops[i];
      el.style.setProperty('--sx',
        parseFloat(el.getAttribute('data-x') || '50') + '%');
      el.style.setProperty('--sy',
        parseFloat(el.getAttribute('data-y') || '50') + '%');
      el.style.setProperty('--ly', '0px');
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
    /* A caixa do SVG é o referencial de tudo. Medida de uma vez só:
       nenhum getter de layout dentro do laço de pintura. */
    canvasH = svg.getBoundingClientRect().height;
    if (!canvasH || canvasH < 2) {
      /* Sem layout ainda (ou display:none): o que o CSS promete —
         o palco é 100svh. */
      canvasH = window.innerHeight;
    }

    /* O viewBox é [0..100] em x e [0..canvasH] em y. Com
       `preserveAspectRatio="none"` isso dá uma transformação
       identidade entre unidades e px: o traço não é escalado de
       forma nenhuma e o `vector-effect:non-scaling-stroke` do CSS
       continua valendo. O primeiro build, antes de o layout
       assentar, pode cair no palpite acima; aí o número bate com os
       420 do HTML e o viewBox não muda de valor. */
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
  var isMobile = false;

  function enable() {
    if (isMobile) return;

    if (!ready) build();

    if (!unsubscribe) {
      unsubscribe = E.ScrollBus.subscribe(function (_y, _py, _docH, winH) {
        if (isMobile) return;

        var railH = rail.offsetHeight;
        var rect = rail.getBoundingClientRect();
        var runway = railH - winH;

        var p = runway > 0
          ? clamp(-rect.top / runway, 0, 1)
          : (rect.top <= winH * 0.5 ? 1 : 0);

        paint(p);
      });
    }
  }

  /* Sem rota animada as cinco praças já estão visíveis pela lista
     estática do CSS — então o módulo apenas sai do caminho: cancela
     a assinatura e deixa o caminho pintado por inteiro, para o caso
     de o aparelho ter girado no meio de uma rota já desenhada. */
  function disable() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    lastIndex = -1;

    if (path) path.style.strokeDashoffset = 0;
    if (hudBar) hudBar.style.transform = 'scaleX(1)';

    for (var i = 0; i < stops.length; i++) {
      stops[i].classList.add('is-reached');
      stops[i].classList.remove('is-current');
    }
  }

  function applyMode() {
    var agoraMobile = window.innerWidth <= MOBILE_BP;

    if (agoraMobile === isMobile) {
      if (isMobile) disable();
      else { build(); enable(); }
      return;
    }

    /* Mudou de faixa: ou o aparelho girou, ou a janela foi
       redimensionada. Um dos dois caminhos precisa ser DESFEITO —
       é isto que impede a rota de ficar desenhada em cima de uma
       lista vertical, e vice-versa. */
    isMobile = agoraMobile;
    if (isMobile) disable();
    else { build(); enable(); }
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

    /* Mesma guarda do main.js, e pelo mesmo motivo: no iOS a barra
       de endereço dispara `resize` durante a rolagem, sem que nada
       de layout tenha mudado. Aqui o custo de atender esse evento é
       pior ainda — `applyMode()` chama `build()`, que reescreve o
       `viewBox` do SVG, o `d` do caminho, o `strokeDasharray` e o
       `strokeDashoffset`. Ou seja: quatro escritas de geometria num
       SVG de 360vh, no meio do gesto. Era isso que fazia a página
       "pular" ao retomar o scroll.

       A barra do Safari muda a ALTURA, nunca a largura; girar o
       aparelho muda a largura. A guarda separa um do outro sem
       tocar no que acontece quando o layout muda de verdade. */
    var larguraVista = window.innerWidth;

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      if (window.innerWidth === larguraVista) return;
      larguraVista = window.innerWidth;

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
    isMobile: function () { return isMobile; },
    geometry: function () {
      return { canvasH: canvasH, viewBox: svg.getAttribute('viewBox'),
               progress: progress };
    }
  };
})();
