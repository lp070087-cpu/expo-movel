/* ============================================================
   EXPO MÓVEL — cred.js
   Credenciamento interno (modal multi-etapa).

   IMPORTANTE — HONESTIDADE DA ENTREGA:
   Não existe endpoint real de servidor para este formulário.
   Nada aqui finge gravação: o envio monta o payload, valida,
   guarda em memória e oferece o resumo para cópia, além de
   abrir o e-mail do comercial já preenchido.

   Toda a integração com um backend futuro está centralizada em
   CRED_ENDPOINT + CredSubmit.submit(), que é o ÚNICO ponto que
   precisará ser ligado a uma API real.
   ============================================================ */
(function () {
  'use strict';

  var EXPO = window.EXPO;
  if (!EXPO) return;

  var $ = EXPO.$, $$ = EXPO.$$;

  var root = document.documentElement;
  var doc  = document;

  /* ============================================================
     1 · CONFIGURAÇÃO / DADOS
     ============================================================ */

  /* Ponto único de integração. Enquanto for null, o envio é
     local (resumo + e-mail) e a interface diz isso com clareza. */
  var CRED_ENDPOINT = null;

  var PERFIS = {
    expositor:     { label: 'Expositor' },
    representante: { label: 'Representante' },
    lojista:       { label: 'Lojista' }
  };

  var EVENTOS = {
    'caruaru-fev': {
      nome: 'Caruaru', uf: 'PE', local: 'Polo Caruaru',
      datas: '25 a 27 de fevereiro de 2027', marca: 'Expo Móvel Nordeste', mes: 'Fev 2027'
    },
    'sao-luis': {
      nome: 'São Luís', uf: 'MA', local: 'Multicenter Sebrae',
      datas: '10 a 12 de março de 2027', marca: 'Expo Móvel', mes: 'Mar 2027'
    },
    'fortaleza': {
      nome: 'Fortaleza', uf: 'CE', local: 'Centro de Convenções do Ceará',
      datas: '05 a 07 de maio de 2027', marca: 'Expo Móvel Ceará', mes: 'Mai 2027'
    },
    'caruaru-ago': {
      nome: 'Caruaru', uf: 'PE', local: 'Polo Caruaru',
      datas: '12 a 14 de agosto de 2027', marca: 'Expo Móvel Pernambuco', mes: 'Ago 2027'
    },
    'goiania': {
      nome: 'Goiânia', uf: 'GO', local: 'Centro de Convenções da PUC',
      datas: '15 a 17 de setembro de 2027', marca: 'Expo Móvel Goiás', mes: 'Set 2027'
    }
  };

  var EMPRESA_MAIL = 'comercial@expomovel.com.br';

  /* ============================================================
     2 · MÁSCARAS E VALIDAÇÕES
     ============================================================ */

  function onlyDigits(v) { return String(v || '').replace(/\D+/g, ''); }

  function maskCPF(v) {
    var d = onlyDigits(v).slice(0, 11);
    if (d.length > 9) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    if (d.length > 6) return d.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    if (d.length > 3) return d.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    return d;
  }

  function maskCNPJ(v) {
    var d = onlyDigits(v).slice(0, 14);
    if (d.length > 12) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    if (d.length > 8)  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    if (d.length > 5)  return d.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    if (d.length > 2)  return d.replace(/(\d{2})(\d{0,3})/, '$1.$2');
    return d;
  }

  /* Telefone: 10 dígitos = fixo (0000-0000), 11 = celular (00000-0000) */
  function maskTelefone(v) {
    var d = onlyDigits(v).slice(0, 11);
    if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    if (d.length > 6)  return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    if (d.length > 2)  return d.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    if (d.length > 0)  return '(' + d;
    return '';
  }

  /* DDDs realmente atribuídos no Brasil (Plano de Numeração).
     A lista é explícita de propósito: validar só a faixa 11–99
     aceitaria códigos que não existem (20, 23, 25, 26, 30...). */
  var DDD_OK = ('11 12 13 14 15 16 17 18 19 ' +
                '21 22 24 27 28 ' +
                '31 32 33 34 35 37 38 ' +
                '41 42 43 44 45 46 47 48 49 ' +
                '51 53 54 55 ' +
                '61 62 63 64 65 66 67 68 69 ' +
                '71 73 74 75 77 79 ' +
                '81 82 83 84 85 86 87 88 89 ' +
                '91 92 93 94 95 96 97 98 99').split(' ');

  function ddValido(d) {
    return DDD_OK.indexOf(String(d).slice(0, 2)) > -1;
  }

  function cpfValido(v) {
    var c = onlyDigits(v);
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    var i, soma = 0;
    for (i = 0; i < 9; i++) soma += parseInt(c.charAt(i), 10) * (10 - i);
    var d1 = (soma * 10) % 11; if (d1 === 10) d1 = 0;
    if (d1 !== parseInt(c.charAt(9), 10)) return false;
    soma = 0;
    for (i = 0; i < 10; i++) soma += parseInt(c.charAt(i), 10) * (11 - i);
    var d2 = (soma * 10) % 11; if (d2 === 10) d2 = 0;
    return d2 === parseInt(c.charAt(10), 10);
  }

  function cnpjValido(v) {
    var c = onlyDigits(v);
    if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;

    function dv(base) {
      var pesos = base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      var soma = 0;
      for (var i = 0; i < base.length; i++) soma += parseInt(base.charAt(i), 10) * pesos[i];
      var r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    }

    if (dv(c.slice(0, 12)) !== parseInt(c.charAt(12), 10)) return false;
    if (dv(c.slice(0, 13)) !== parseInt(c.charAt(13), 10)) return false;
    return true;
  }

  function emailValido(v) {
    var s = String(v || '').trim();
    if (!s || s.length > 160) return false;
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(s);
  }

  function telefoneValido(v) {
    var d = onlyDigits(v);
    return (d.length === 10 || d.length === 11) && ddValido(d);
  }

  /* ============================================================
     3 · ESTADO
     ============================================================ */
  var state = {
    perfil: '',
    evento: '',
    campos: {},      /* id -> valor (texto já limpo) */
    consent: false
  };

  var STEP_TOTAL = 5;

  /* Ordem das etapas, já pulando a etapa 4 para quem não é lojista. */
  function sequencia() {
    if (state.perfil === 'lojista') return [1, 2, 3, 4, 5];
    return [1, 2, 3, 5];
  }

  /* Quais campos pertencem a cada etapa, dado o perfil atual */
  var CAMPOS_ETAPA = {
    3: ['c-nome', 'c-cpf', 'c-credencial', 'c-cargo', 'c-email', 'c-telefone', 'c-whatsapp', 'c-fabrica'],
    4: ['c-cnpj', 'c-razao', 'c-fantasia', 'c-endereco', 'c-cidade', 'c-uf']
  };

  function campoAtivo(id) {
    var el = doc.getElementById(id);
    if (!el) return false;
    var box = el.closest('[data-when]');
    if (box) {
      var permitidos = (box.getAttribute('data-when') || '').split(/\s+/);
      return permitidos.indexOf(state.perfil) > -1;
    }
    return true;
  }

  /* ============================================================
     4 · ROBÔ DE VALIDAÇÃO
     ------------------------------------------------------------
     Um único validador por campo. A função devolve a mensagem de
     erro ou '' quando o campo está correto. É o ÚNICO lugar que
     decide o que é válido — a interface só mostra o recado.
     ============================================================ */
  var VALIDADORES = {
    required: function (id) {
      var el = doc.getElementById(id);
      var v = el ? String(el.value || '').trim() : '';
      if (!v) return 'Este campo é obrigatório.';
      if (id === 'c-credencial' && v.length < 3) return 'Use ao menos 3 caracteres na credencial.';
      if (id === 'c-nome' && v.length < 5) return 'Informe o nome completo.';
      return '';
    },

    cpf: function (id) {
      var el = doc.getElementById(id);
      var v = el ? el.value : '';
      if (!onlyDigits(v)) return 'Este campo é obrigatório.';
      if (onlyDigits(v).length !== 11) return 'O CPF precisa ter 11 dígitos.';
      if (!cpfValido(v)) return 'CPF inválido. Confira os números.';
      return '';
    },

    cnpj: function (id) {
      var el = doc.getElementById(id);
      var v = el ? el.value : '';
      if (!onlyDigits(v)) return 'Este campo é obrigatório.';
      if (onlyDigits(v).length !== 14) return 'O CNPJ precisa ter 14 dígitos.';
      if (!cnpjValido(v)) return 'CNPJ inválido. Confira os números.';
      return '';
    },

    email: function (id) {
      var el = doc.getElementById(id);
      var v = el ? el.value : '';
      if (!String(v).trim()) return 'Este campo é obrigatório.';
      if (!emailValido(v)) return 'E-mail inválido. Ex.: nome@empresa.com.br';
      return '';
    },

    tel: function (id) {
      var el = doc.getElementById(id);
      var v = el ? el.value : '';
      if (!onlyDigits(v)) return 'Este campo é obrigatório.';
      if (onlyDigits(v).length < 10) return 'Informe DDD e número.';
      if (!telefoneValido(v)) return 'Informe um telefone válido com DDD.';
      return '';
    }
  };

  function validaCampo(id) {
    var el = doc.getElementById(id);
    if (!el || !campoAtivo(id)) return '';
    var kind = el.getAttribute('data-f') || 'required';
    var fn = VALIDADORES[kind] || VALIDADORES.required;
    return fn(id) || '';
  }

  function pintaErro(id, msg) {
    var el  = doc.getElementById(id);
    var out = $('[data-err-for="' + id + '"]', cred);
    if (el) {
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
    if (out) out.textContent = msg || '';
  }

  /* Valida a etapa inteira. Devolve o primeiro campo com erro. */
  function validaEtapa(step) {
    if (step === 5) {
      var slot = $('[data-err-for="consent"]', cred);
      if (!state.consent) {
        if (slot) slot.textContent = 'É preciso confirmar para enviar.';
        return 'consent';
      }
      if (slot) slot.textContent = '';
      return null;
    }

    var ids = CAMPOS_ETAPA[step] || [];
    var primeiro = null;

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (!campoAtivo(id)) { pintaErro(id, ''); continue; }
      var msg = validaCampo(id);
      pintaErro(id, msg);
      if (msg && !primeiro) primeiro = id;
    }
    return primeiro;
  }

  function limpaEtapa(step) {
    var ids = CAMPOS_ETAPA[step] || [];
    for (var i = 0; i < ids.length; i++) pintaErro(ids[i], '');
    if (step === 5) {
      var slot = $('[data-err-for="consent"]', cred);
      if (slot) slot.textContent = '';
    }
  }

  /* ============================================================
     5 · MODAL — abrir, fechar, foco, scroll
     ============================================================ */
  var cred, panel, bodyEl, footEl, nextBtn, backBtn, progressEl;
  var lastFocus = null;
  var isOpen = false;

  var FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]),' +
                  ' select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

  function focusaveis() {
    return $$(FOCAVEIS, panel).filter(function (el) {
      if (el.hidden) return false;
      if (el.closest('[hidden]')) return false;
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el === doc.activeElement;
    });
  }

  function open(opts) {
    opts = opts || {};
    if (isOpen) return;
    isOpen = true;
    lastFocus = doc.activeElement;

    /* Cada abertura pelo CTA começa do zero. Reaproveitar o que
       ficou de uma visita abandonada faria o visitante cair no
       meio de um formulário com dados que ele não digitou agora. */
    reset();

    /* Pré-seleções vindas do CTA clicado */
    if (opts.perfil && PERFIS[opts.perfil]) state.perfil = opts.perfil;
    if (opts.evento && EVENTOS[opts.evento]) state.evento = opts.evento;

    cred.hidden = false;
    cred.classList.remove('is-closing');
    root.classList.add('is-locked');

    syncPicks();
    aplicarRegrasDePerfil();

    /* Com perfil e evento já escolhidos (CTA de evento), pula direto
       para os dados — mas só quando os dois vierem preenchidos. */
    var destino = 1;
    if (state.perfil && state.evento) destino = 3;
    else if (state.perfil) destino = 2;

    goTo(destino, true);

    window.setTimeout(function () {
      if (destino === 1) {
        var first = $('[data-pick-profile]', panel);
        if (first) first.focus();
      } else if (destino === 2) {
        var ev = $('[data-pick-event]', panel);
        if (ev) ev.focus();
      } else {
        var inp = doc.getElementById('c-nome');
        if (inp) inp.focus();
      }
    }, EXPO.prefersReduced() ? 0 : 180);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;

    if (EXPO.prefersReduced()) {
      finishClose();
      return;
    }
    cred.classList.add('is-closing');
    window.setTimeout(finishClose, 300);
  }

  function finishClose() {
    cred.hidden = true;
    cred.classList.remove('is-closing');
    root.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    lastFocus = null;

    /* Depois de concluído, o próximo acesso começa do zero para
       não reaproveitar os dados de quem já se credenciou. */
    if (currentStep === 'done') reset();
  }

  function reset() {
    state.perfil = '';
    state.evento = '';
    state.campos = {};
    state.consent = false;

    $$('input, select', cred).forEach(function (el) {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
      el.removeAttribute('aria-invalid');
    });
    $$('[data-err-for]', cred).forEach(function (p) { p.textContent = ''; });

    var consent = $('[data-cred-consent]', cred);
    if (consent) consent.checked = false;

    syncPicks();
    goTo(1, true);
  }

  /* Armadilha de foco dentro do painel */
  function onKeydown(e) {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;

    var list = focusaveis();
    if (!list.length) return;

    var first = list[0];
    var last  = list[list.length - 1];

    if (e.shiftKey && doc.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && doc.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  /* ============================================================
     6 · NAVEGAÇÃO ENTRE ETAPAS
     ============================================================ */
  var currentStep = 1;

  function goTo(step, instant) {
    currentStep = step;

    $$('.cred__view', cred).forEach(function (v) {
      var isTarget = String(v.getAttribute('data-step')) === String(step);
      v.hidden = !isTarget;
      if (isTarget && !instant) {
        /* reinicia a animação de entrada */
        v.style.animation = 'none';
        var altura = v.offsetHeight;   /* força o reflow e reinicia o keyframe */
        v.style.animation = '';
        if (altura < 0) { /* nunca acontece; mantém o reflow explícito */ }
      }
    });

    /* Rodapé só existe enquanto há um passo a dar */
    footEl.hidden = (step === 'done');
    nextBtn.hidden = false;
    backBtn.hidden = (step === 1);

    var rotulo = nextBtn.querySelector('span');
    if (rotulo) {
      rotulo.textContent = (step === 5) ? 'Enviar credenciamento' : 'Continuar';
    }
    if (step === 5) montarRevisao();

    pintarTrilha(step);
    pintarProgresso(step);

    if (!instant && bodyEl) bodyEl.scrollTop = 0;
  }

  function pintarTrilha(step) {
    var seq = sequencia();
    $$('[data-step-dot]', cred).forEach(function (dot) {
      var n = parseInt(dot.getAttribute('data-step-dot'), 10);
      var idx = seq.indexOf(n);
      dot.classList.toggle('is-skipped', idx === -1);
      dot.classList.remove('is-done', 'is-now');

      if (step === 'done') { dot.classList.add('is-done'); return; }
      var curIdx = seq.indexOf(step);
      if (idx === -1) return;
      if (idx < curIdx) dot.classList.add('is-done');
      else if (idx === curIdx) dot.classList.add('is-now');
    });
  }

  function pintarProgresso(step) {
    if (!progressEl) return;
    if (step === 'done') { progressEl.textContent = 'Concluído'; return; }
    var seq = sequencia();
    var i = seq.indexOf(step);
    progressEl.textContent = 'Etapa ' + (i + 1) + ' de ' + seq.length;
  }

  function next() {
    /* Etapas 1 e 2 são escolhas: exigem apenas a seleção */
    if (currentStep === 1) {
      if (!state.perfil) return avisoEscolha('[data-pick-profile]');
      aplicarRegrasDePerfil();
      goTo(2);
      return;
    }
    if (currentStep === 2) {
      if (!state.evento) return avisoEscolha('[data-pick-event]');
      goTo(3);
      return;
    }

    var falha = validaEtapa(currentStep);
    if (falha) {
      if (falha !== 'consent') {
        var el = doc.getElementById(falha);
        if (el) el.focus({ preventScroll: false });
      }
      return;
    }

    if (currentStep === 5) { enviar(); return; }

    var seq = sequencia();
    var i = seq.indexOf(currentStep);
    goTo(seq[i + 1]);
  }

  function back() {
    if (currentStep === 'done') return;
    var seq = sequencia();
    var i = seq.indexOf(currentStep);
    if (i <= 0) return;
    limpaEtapa(currentStep);
    goTo(seq[i - 1]);
  }

  function avisoEscolha(sel) {
    var alvo = $(sel, cred);
    if (!alvo) return;
    alvo.focus();
    var grupo = alvo.parentNode;
    if (grupo) {
      grupo.style.transition = 'none';
      grupo.style.transform = 'translate3d(-6px,0,0)';
      window.requestAnimationFrame(function () {
        grupo.style.transition = 'transform .42s cubic-bezier(.16,1,.3,1)';
        grupo.style.transform = '';
      });
    }
  }

  /* ============================================================
     7 · SELEÇÕES (perfil / evento)
     ============================================================ */
  function syncPicks() {
    $$('[data-pick-profile]', cred).forEach(function (b) {
      var on = b.getAttribute('data-pick-profile') === state.perfil;
      b.classList.toggle('is-picked', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $$('[data-pick-event]', cred).forEach(function (b) {
      var on = b.getAttribute('data-pick-event') === state.evento;
      b.classList.toggle('is-picked', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* Liga/desliga os campos condicionais conforme o perfil */
  function aplicarRegrasDePerfil() {
    $$('[data-when]', cred).forEach(function (box) {
      var permitidos = (box.getAttribute('data-when') || '').split(/\s+/);
      var on = permitidos.indexOf(state.perfil) > -1;
      /* O campo condicional (fábrica/empresa) só existe para
         expositor e representante. Esconder de verdade é `= !on`:
         a regra acima calcula `on` e em seguida os campos são
         limpos quando não valem — mas o wrapper ficava sempre
         visível, então o lojista via e podia preencher o campo
         que não é dele. `.field[hidden]` já tem a regra de
         display no cred.css. */
      box.hidden = !on;

      $$('input, select', box).forEach(function (el) {
        el.required = on;
        if (!on) {
          el.value = '';
          el.removeAttribute('aria-invalid');
          var slot = $('[data-err-for="' + el.id + '"]', cred);
          if (slot) slot.textContent = '';
        }
      });
    });
  }

  /* ============================================================
     8 · MÁSCARAS EM TEMPO REAL
     ============================================================ */
  function aplicarMascara(el) {
    var id = el.id;

    if (id === 'c-cpf')      { el.value = maskCPF(el.value); return; }
    if (id === 'c-cnpj')     { el.value = maskCNPJ(el.value); return; }
    if (id === 'c-telefone' || id === 'c-whatsapp') { el.value = maskTelefone(el.value); return; }
    if (id === 'c-uf')       { return; }
  }

  /* Valida no blur e limpa o erro ao digitar de novo */
  function onInput(e) {
    var el = e.target;
    if (!el || !el.id) return;

    aplicarMascara(el);

    /* Guarda o valor "cru" para o payload */
    if (el.id === 'c-cpf' || el.id === 'c-cnpj' ||
        el.id === 'c-telefone' || el.id === 'c-whatsapp') {
      state.campos[el.id] = onlyDigits(el.value);
    } else {
      state.campos[el.id] = String(el.value || '').trim();
    }

    if (el.getAttribute('aria-invalid') === 'true') {
      pintaErro(el.id, validaCampo(el.id));
    }
  }

  function onBlur(e) {
    var el = e.target;
    if (!el || !el.id) return;
    if (!campoAtivo(el.id)) return;
    if (!String(el.value || '').trim()) return;   /* não cobra campo vazio no blur */
    pintaErro(el.id, validaCampo(el.id));
  }

  /* ============================================================
     9 · REVISÃO
     ============================================================ */
  function linha(k, v) {
    var row = doc.createElement('div');
    row.className = 'review__row';
    var kk = doc.createElement('dt');
    kk.className = 'review__k';
    kk.textContent = k;
    var vv = doc.createElement('dd');
    vv.className = 'review__v';
    vv.textContent = v || '—';
    row.appendChild(kk);
    row.appendChild(vv);
    return row;
  }

  function valor(id) {
    var el = doc.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function montarRevisao() {
    var box = $('[data-cred-review]', cred);
    if (!box) return;
    box.innerHTML = '';

    var ev  = EVENTOS[state.evento] || {};
    var pf  = PERFIS[state.perfil]  || {};

    box.appendChild(linha('Perfil', pf.label || '—'));
    box.appendChild(linha('Feira', ev.nome ? (ev.nome + ' — ' + ev.uf) : '—'));
    box.appendChild(linha('Quando', ev.datas || '—'));
    box.appendChild(linha('Local', ev.local || '—'));

    box.appendChild(linha('Nome completo', valor('c-nome')));
    box.appendChild(linha('CPF', valor('c-cpf')));
    box.appendChild(linha('Credencial', valor('c-credencial')));
    box.appendChild(linha('Cargo', valor('c-cargo')));
    box.appendChild(linha('E-mail', valor('c-email')));
    box.appendChild(linha('Telefone', valor('c-telefone')));
    box.appendChild(linha('WhatsApp', valor('c-whatsapp')));

    if (campoAtivo('c-fabrica')) {
      box.appendChild(linha('Fábrica / empresa', valor('c-fabrica')));
    }
    if (state.perfil === 'lojista') {
      box.appendChild(linha('CNPJ', valor('c-cnpj')));
      box.appendChild(linha('Razão social', valor('c-razao')));
      box.appendChild(linha('Nome fantasia', valor('c-fantasia')));
      box.appendChild(linha('Endereço', valor('c-endereco')));
      box.appendChild(linha('Cidade / UF', (valor('c-cidade') + ' / ' + valor('c-uf')).trim()));
    }
  }

  /* ============================================================
     10 · PAYLOAD E ENVIO
     ------------------------------------------------------------
     O payload é o contrato. Quando existir uma API real, basta
     preencher CRED_ENDPOINT: CredSubmit.submit() já sabe o que
     fazer com ele.
     ============================================================ */
  function montarPayload() {
    var ev = EVENTOS[state.evento] || {};

    var p = {
      versao: 1,
      criadoEm: new Date().toISOString(),
      perfil: state.perfil,
      perfilLabel: (PERFIS[state.perfil] || {}).label || '',
      evento: {
        id: state.evento,
        cidade: ev.nome || '',
        uf: ev.uf || '',
        local: ev.local || '',
        datas: ev.datas || '',
        marca: ev.marca || ''
      },
      pessoa: {
        nome: valor('c-nome'),
        cpf: onlyDigits(valor('c-cpf')),
        credencial: valor('c-credencial'),
        cargo: valor('c-cargo'),
        email: valor('c-email'),
        telefone: onlyDigits(valor('c-telefone')),
        whatsapp: onlyDigits(valor('c-whatsapp'))
      },
      consentimento: state.consent
    };

    if (campoAtivo('c-fabrica')) {
      p.empresa = {
        tipo: 'fabrica',
        nome: valor('c-fabrica')
      };
    }

    if (state.perfil === 'lojista') {
      p.empresa = {
        tipo: 'loja',
        cnpj: onlyDigits(valor('c-cnpj')),
        razaoSocial: valor('c-razao'),
        nomeFantasia: valor('c-fantasia'),
        endereco: valor('c-endereco'),
        cidade: valor('c-cidade'),
        uf: valor('c-uf')
      };
    }

    return p;
  }

  var CredSubmit = {
    endpoint: CRED_ENDPOINT,

    /* Único ponto de integração com um backend real. */
    submit: function (payload) {
      if (!this.endpoint) {
        return Promise.resolve({ ok: true, offline: true, payload: payload });
      }
      return fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json().catch(function () { return {}; });
      });
    }
  };

  var ultimoPayload = null;

  function enviar() {
    var payload = montarPayload();
    ultimoPayload = payload;

    nextBtn.disabled = true;
    var rotulo = nextBtn.querySelector('span');
    var anterior = rotulo.textContent;
    rotulo.textContent = 'Enviando…';

    CredSubmit.submit(payload).then(function (res) {
      nextBtn.disabled = false;
      rotulo.textContent = anterior;

      if (res && res.offline) {
        /* Sem servidor: NÃO afirmamos que foi registrado. */
        var txt = $('[data-cred-done-text]', cred);
        if (txt) {
          txt.textContent =
            'Seus dados foram conferidos e o resumo está pronto para envio. ' +
            'Este credenciamento ainda não é enviado automaticamente — ' +
            'use "Copiar resumo dos dados" e encaminhe para ' + EMPRESA_MAIL +
            ', ou fale com o comercial. A integração com o servidor da Expo Móvel ' +
            'está preparada e será ligada assim que o endereço de envio for definido.';
        }
      } else {
        var ok = $('[data-cred-done-text]', cred);
        if (ok) {
          ok.textContent = 'Recebemos os seus dados. A equipe da Expo Móvel entrará em contato ' +
            'para confirmar o seu credenciamento.';
        }
      }

      goTo('done');
    }).catch(function () {
      nextBtn.disabled = false;
      rotulo.textContent = anterior;
      var slot = $('[data-err-for="consent"]', cred);
      if (slot) {
        slot.textContent = 'Não foi possível enviar agora. Copie o resumo e fale com o comercial pelo ' + EMPRESA_MAIL + '.';
      }
    });
  }

  /* ============================================================
     11 · RESUMO PARA CÓPIA / E-MAIL
     ============================================================ */
  var LABEL_CAMPO = {
    'c-nome': 'Nome completo',
    'c-cpf': 'CPF',
    'c-credencial': 'Nome para a credencial',
    'c-cargo': 'Cargo',
    'c-email': 'E-mail',
    'c-telefone': 'Telefone',
    'c-whatsapp': 'WhatsApp',
    'c-fabrica': 'Fábrica / empresa',
    'c-cnpj': 'CNPJ',
    'c-razao': 'Razão social',
    'c-fantasia': 'Nome fantasia',
    'c-endereco': 'Endereço',
    'c-cidade': 'Cidade',
    'c-uf': 'Estado'
  };

  function textoResumo() {
    var ev = EVENTOS[state.evento] || {};
    var pf = PERFIS[state.perfil] || {};
    var linhas = [];

    linhas.push('CREDENCIAMENTO EXPO MÓVEL 2027');
    linhas.push('');
    linhas.push('Perfil: ' + (pf.label || '—'));
    linhas.push('Feira: ' + (ev.nome || '—') + (ev.uf ? ' — ' + ev.uf : ''));
    linhas.push('Quando: ' + (ev.datas || '—'));
    linhas.push('Local: ' + (ev.local || '—'));
    linhas.push('');
    linhas.push('--- DADOS ---');

    var ordem = ['c-nome', 'c-cpf', 'c-credencial', 'c-cargo', 'c-email', 'c-telefone', 'c-whatsapp'];

    if (state.perfil === 'lojista') {
      ordem = ordem.concat(['c-cnpj', 'c-razao', 'c-fantasia', 'c-endereco', 'c-cidade', 'c-uf']);
    } else if (campoAtivo('c-fabrica')) {
      ordem = ordem.concat(['c-fabrica']);
    }

    ordem.forEach(function (id) {
      var v = valor(id);
      if (v) linhas.push(LABEL_CAMPO[id] + ': ' + v);
    });

    linhas.push('');
    linhas.push('Gerado em ' + new Date().toLocaleString('pt-BR'));
    return linhas.join('\n');
  }

  function copiarResumo() {
    var txt = textoResumo();
    var btn = $('[data-cred-copy]', cred);
    var rotulo = btn ? btn.querySelector('span') : null;

    function ok() {
      if (!rotulo) return;
      var antigo = rotulo.textContent;
      rotulo.textContent = 'Resumo copiado';
      window.setTimeout(function () { rotulo.textContent = antigo; }, 2400);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(ok).catch(function () { fallback(txt, ok); });
    } else {
      fallback(txt, ok);
    }
  }

  function fallback(txt, done) {
    var ta = doc.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    doc.body.appendChild(ta);
    ta.select();
    try { doc.execCommand('copy'); done(); } catch (e) { /* usuário copia manualmente */ }
    doc.body.removeChild(ta);
  }

  /* ============================================================
     12 · LIGAÇÕES
     ============================================================ */
  function bind() {
    /* Seletor de perfil */
    $$('[data-pick-profile]', cred).forEach(function (b) {
      b.addEventListener('click', function () {
        state.perfil = b.getAttribute('data-pick-profile');
        syncPicks();
        aplicarRegrasDePerfil();
      });
    });

    /* Seletor de evento */
    $$('[data-pick-event]', cred).forEach(function (b) {
      b.addEventListener('click', function () {
        state.evento = b.getAttribute('data-pick-event');
        syncPicks();
      });
    });

    /* Fechar */
    $$('[data-cred-close]', cred).forEach(function (b) {
      b.addEventListener('click', close);
    });

    /* Avançar / voltar */
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (backBtn) backBtn.addEventListener('click', back);

    /* Formulário */
    if (bodyEl) {
      bodyEl.addEventListener('input', onInput);
      bodyEl.addEventListener('blur', onBlur, true);

      bodyEl.addEventListener('change', function (e) {
        if (e.target && e.target.id === 'c-uf') {
          state.campos['c-uf'] = e.target.value;
        }
      });

      /* Enter em um campo avança em vez de recarregar */
      bodyEl.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var t = e.target;
        if (!t || t.tagName !== 'INPUT') return;
        e.preventDefault();
        next();
      });
    }

    /* Consentimento */
    var consent = $('[data-cred-consent]', cred);
    if (consent) {
      consent.addEventListener('change', function () {
        state.consent = !!consent.checked;
        if (state.consent) {
          var slot = $('[data-err-for="consent"]', cred);
          if (slot) slot.textContent = '';
        }
      });
    }

    /* "Mesmo número" do WhatsApp */
    var copyTel = $('[data-copy-tel]', cred);
    if (copyTel) {
      copyTel.addEventListener('click', function () {
        var tel = doc.getElementById('c-telefone');
        var zap = doc.getElementById('c-whatsapp');
        if (!tel || !zap) return;
        zap.value = tel.value;
        state.campos['c-whatsapp'] = onlyDigits(tel.value);
        pintaErro('c-whatsapp', '');
        zap.focus();
      });
    }

    /* Copiar resumo */
    var copyBtn = $('[data-cred-copy]', cred);
    if (copyBtn) copyBtn.addEventListener('click', copiarResumo);

    /* Teclado */
    doc.addEventListener('keydown', onKeydown);

    /* ---- Gatilhos de credenciamento em toda a página ---- */
    doc.addEventListener('click', function (e) {
      var trigger = e.target.closest ? e.target.closest('[data-credential]') : null;
      if (!trigger) return;

      var val = trigger.getAttribute('data-credential');
      if (!val) return;

      e.preventDefault();

      if (PERFIS[val]) {
        /* CTA de perfil: abre com o perfil já escolhido */
        open({ perfil: val });
      } else if (EVENTOS[val]) {
        /* CTA do calendário: abre com o evento já selecionado */
        open({ evento: val });
      } else {
        open();
      }
    });
  }

  /* Reabrir a partir do botão do rodapé, se necessário */
  window.EXPO.cred = {
    open: open,
    close: close,
    getPayload: function () { return ultimoPayload || montarPayload(); },
    submit: function (p) { return CredSubmit.submit(p); },
    setEndpoint: function (url) { CRED_ENDPOINT = url; CredSubmit.endpoint = url; }
  };

  /* ============================================================
     13 · BOOT
     ============================================================ */
  function init() {
    cred = $('[data-cred-panel]') ? doc.getElementById('cred') : null;
    if (!cred) return;

    panel      = $('[data-cred-panel]', cred);
    bodyEl     = $('[data-cred-body]', cred);
    footEl     = $('[data-cred-foot]', cred);
    nextBtn    = $('[data-cred-next]', cred);
    backBtn    = $('[data-cred-back]', cred);
    progressEl = $('[data-cred-progress]', cred);

    bind();
    goTo(1, true);
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
