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
     Cada linha tem a sua janela de progresso dentro da pista, e a
     revelação é CONTÍNUA: `clip-path` abrindo da esquerda para a
     direita, proporcional ao quanto a linha já andou dentro da
     própria janela. Não há temporizador nem animação paralela — o
     texto não anda sozinho, ele anda porque a página rolou.

     A JANELA DE CADA LINHA NÃO É UM NÚMERO FIXO
     -------------------------------------------
     O defeito que existia aqui: a janela era `i * 0.86/4`, um
     pedaço igual da pista por linha, e o `0.86` deixava os últimos
     14% da pista "já com tudo revelado". Isso depende de o palco
     ter sempre o mesmo desenho — o que era verdade no desktop, onde
     as quatro linhas e as cinco cápsulas cabem numa tela, e deixou
     de valer no celular, onde o palco é `justify-content:center` com
     `overflow:hidden` e o conteúdo passa a ser mais alto que a
     viewport: a metade de cima (o rótulo "01 Manifesto") e a de
     baixo (as cápsulas) são cortadas, e as linhas param em posições
     que não têm relação com 1/4, 2/4, 3/4 da pista.

     Agora a janela sai da POSIÇÃO REAL de cada linha dentro do
     palco, medida uma vez por build:

         w      = quanto a linha sobe, com o scroll, do ponto em que
                  fica pronta para o ponto em que sai de cena
         win[i] = (1 - w/maxW) * 0.86  ->  faixa de progresso em que
                  ela ESTÁ na posição crítica
         p[i]   = i * 0.86 / n         ->  quando ela começa a revelar

     Assim as linhas revelam na ORDEM em que estão empilhadas, da
     primeira (que mora no topo do palco) à última (na base), e todas
     terminam antes do fim da pista. No desktop o resultado é o
     mesmo de antes — o palco caber numa tela é justamente o caso
     em que as linhas ficam igualmente espaçadas.

     O `0.86` continua: a última linha acaba em p = 0.86 e os 14%
     finais da pista são a respiração antes da próxima seção. Sem
     âncora de posição (JS antigo, `overflow:hidden` sem layout, ou
     altura zero) o cálculo cai exatamente na fórmula antiga.
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

    /* Scrub dirigido pelo scroll — o MESMO caminho no desktop e no
       celular. O que muda por largura é a geometria das janelas,
       não a existência do scrub. */
    if (reduced) return;

    var active = false;
    var trackIO = new IntersectionObserver(function (entries) {
      active = !!entries[0].isIntersecting;
    }, { rootMargin: '10% 0px 10% 0px' });
    trackIO.observe(rail);

    var n = lines.length;
    var win = [];        /* fração da pista usada pela revelação da linha i */
    var p0 = [];         /* progresso em que a linha i começa a revelar */

    /* Monta a tabela. `spanEl` = a máscara de cada linha.

       A LARGURA DA JANELA É A MESMA PARA TODAS AS LINHAS — `0.86/n`.
       É o único valor geometricamente certo: o palco sobe inteiro com o
       scroll, então TODAS as linhas percorrem exatamente a mesma
       distância entre "chegou na faixa" e "saiu da faixa". Uma janela
       proporcional à posição (peso maior para quem está mais acima)
       dava 38% da pista para a primeira linha e 2% para a última — a
       última piscava em vez de se revelar, e isso valia também no
       desktop, que estava aprovado.

       O que muda de linha para linha é só QUANDO ela começa. Isso sim
       sai da MEDIÇÃO: se o palco recortado deixar as linhas em ordem
       visual diferente da ordem do DOM, quem manda é o que se vê.
       Quando as posições crescem com o índice — o caso normal, no
       desktop e no celular — a ordenação é a identidade e o resultado
       é exatamente `i * 0.86/n`, o mesmo de sempre. */
    function build() {
      var rect = rail.getBoundingClientRect();
      var H = rect.height;

      win = new Array(n);
      p0 = new Array(n);

      var span = 0.86 / n;

      if (!H || H < 4) {
        /* sem âncora: comportamento antigo, por índice */
        for (var i = 0; i < n; i++) { win[i] = span; p0[i] = i * span; }
        return;
      }

      /* Onde cada linha está DENTRO do palco: 0 = topo, 1 = base.
         Medido uma vez por build; nenhum getter de layout na pintura. */
      var centro = [];
      for (var k = 0; k < n; k++) {
        var r = lines[k].getBoundingClientRect();
        centro.push((r.top + r.height / 2 - rect.top) / H);
      }

      /* ordem visual: quem mora mais acima no palco revela primeiro */
      var ordem = [];
      var q;
      for (q = 0; q < n; q++) ordem.push(q);
      ordem.sort(function (a, b) { return centro[a] - centro[b]; });

      for (q = 0; q < n; q++) {
        var li = ordem[q];
        win[li] = span;
        p0[li] = q * span;
      }
    }

    build();

    E.ScrollBus.subscribe(function (_y, _py, _docH, winH) {
      if (!active) return;

      var rect = rail.getBoundingClientRect();
      var runway = rect.height - winH;
      var p = runway > 0 ? clamp(-rect.top / runway, 0, 1) : 0;
      if (rect.height <= 0) return;

      for (var i = 0; i < n; i++) {
        if (!win[i]) continue;

        var spanEl = lines[i].firstElementChild;
        if (!spanEl) continue;

        var local = clamp((p - p0[i]) / win[i], 0, 1);
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

    /* Reanexa ao barramento depois de um rebuild, para o novo layout
       valer sem esperar o próximo scroll. */
    return { rebuild: build };
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
    var manifesto = initManifesto();
    initChain();
    initFinal();
    initImages();

    /* Reavalia o manifesto quando o layout assenta (fontes, imagens,
       rotação). A tabela de janelas é medida do DOM, então precisa
       ser refeita quando a altura do palco muda. */
    function refazer() {
      if (manifesto && manifesto.rebuild) manifesto.rebuild();
      E.ScrollBus.poke();
    }
    window.addEventListener('load', refazer);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refazer).catch(function () {});
    }
    var t = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(t);
      t = window.setTimeout(refazer, 200);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
