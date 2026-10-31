(function () {
  "use strict";

  var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4zTaR0zxbzubBIWCP21FRjBvby4CPK8CdS5ewglIMPfgA2VE0nKKcXB4tv1YKo0ja/exec";
  var INTERVALO_ESTADO = 30000;
  var REGEX_NOME = /^[\p{L}\p{M}][\p{L}\p{M}' .\-]*$/u;

  var formAberto = false;
  var aEnviar = false;
  var passo = 1;
  var timerSucesso = null;

  function $(id) { return document.getElementById(id); }

  // Hora e data; acertam-se com o servidor a cada consulta do estado.
  var relogio = window.RelogioAcipol.iniciar({ hora: $("relogio"), data: $("data-hoje") });

  var campos = [$("nome"), $("matricula"), $("principal"), $("alternativo"), $("ano")];
  var botoesAvancar = [$("btnProx1"), $("btnProx2"), $("btnEnviar")];
  var textoBotaoEnviar = $("btnEnviar").firstChild.textContent;

  // Guarda a mensagem padrão de cada campo, para a poder repor.
  Array.prototype.forEach.call(document.querySelectorAll(".field-error"), function (el) {
    el.setAttribute("data-padrao", el.textContent);
  });

  // ----- Campos -----

  function toggleFilled(inp) {
    inp.classList.toggle("filled", inp.value.trim() !== "");
  }

  function marcarInvalido(fieldId, invalido, texto) {
    var campo = $(fieldId);
    var erro = campo.querySelector(".field-error");
    erro.textContent = (invalido && texto) ? texto : erro.getAttribute("data-padrao");
    campo.classList.toggle("invalid", invalido);
    if (invalido) {
      campo.classList.remove("shake");
      void campo.offsetWidth;
      campo.classList.add("shake");
    }
  }

  campos.forEach(function (inp) {
    inp.addEventListener("blur", function () { toggleFilled(inp); });
    // Ao corrigir o valor, o erro desse campo desaparece.
    var evento = inp.tagName === "SELECT" ? "change" : "input";
    inp.addEventListener(evento, function () {
      var campo = inp.closest(".field");
      campo.classList.remove("invalid");
      if (inp.tagName === "SELECT") toggleFilled(inp);
    });
  });

  [["matricula", 4], ["principal", 9], ["alternativo", 9]].forEach(function (par) {
    $(par[0]).addEventListener("input", function (e) {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, par[1]);
    });
  });

  function valorNome() { return $("nome").value.replace(/\s+/g, " ").trim(); }

  function nomeValido(nome) {
    return nome.length >= 5 && nome.length <= 80 && nome.split(" ").length >= 2 && REGEX_NOME.test(nome);
  }

  // ----- Fases -----

  var pilha = $("pilha");

  function ajustarAltura() {
    var ativo = $("s" + passo);
    pilha.style.height = ativo.offsetHeight + "px";
  }

  function mostrarPasso(n, focar) {
    passo = n;
    for (var i = 1; i <= 3; i++) {
      var etapa = $("s" + i);
      etapa.className = "step " + (i === n ? "active" : (i < n ? "before" : "after"));
      etapa.inert = i !== n;
      $("g" + i).classList.toggle("on", i <= n);
      $("l" + i).classList.toggle("cur", i === n);
    }
    ajustarAltura();
    if (focar) {
      setTimeout(function () {
        var primeiro = $("s" + n).querySelector("input, select");
        if (primeiro) primeiro.focus({ preventScroll: true });
      }, 320);
    }
  }

  if (window.ResizeObserver) {
    var observador = new ResizeObserver(ajustarAltura);
    [1, 2, 3].forEach(function (i) { observador.observe($("s" + i)); });
  }

  function validarPasso(n) {
    var ok;
    if (n === 1) {
      ok = nomeValido(valorNome());
      marcarInvalido("field-nome", !ok);
      return ok;
    }
    if (n === 2) {
      var okNuri = /^\d{4}$/.test($("matricula").value.trim());
      var okAno = /^[1-4]$/.test($("ano").value);
      marcarInvalido("field-matricula", !okNuri);
      marcarInvalido("field-ano", !okAno);
      return okNuri && okAno;
    }
    var principal = $("principal").value.trim();
    var alternativo = $("alternativo").value.trim();
    var okPrincipal = /^\d{9}$/.test(principal);
    var okAlternativo = /^\d{9}$/.test(alternativo);
    var iguais = okPrincipal && okAlternativo && principal === alternativo;
    marcarInvalido("field-principal", !okPrincipal);
    marcarInvalido("field-alternativo", !okAlternativo || iguais,
      iguais ? "O contacto alternativo deve ser diferente do principal." : null);
    return okPrincipal && okAlternativo && !iguais;
  }

  function atualizarBotoes() {
    var bloqueado = !formAberto || aEnviar;
    botoesAvancar.forEach(function (b) { b.disabled = bloqueado; });
  }

  function avancar() {
    if (aEnviar || !formAberto) return;
    $("msg").textContent = "";
    if (!validarPasso(passo)) return;
    if (passo < 3) mostrarPasso(passo + 1, true);
    else enviar();
  }

  $("btnProx1").addEventListener("click", avancar);
  $("btnProx2").addEventListener("click", avancar);
  $("btnEnviar").addEventListener("click", avancar);
  $("btnVoltar2").addEventListener("click", function () { mostrarPasso(1, true); });
  $("btnVoltar3").addEventListener("click", function () { mostrarPasso(2, true); });

  // Enter avança de fase em vez de submeter o formulário.
  $("form").addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.target.tagName === "BUTTON") return;
    e.preventDefault();
    avancar();
  });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); });

  // ----- Envio -----

  function enviar() {
    var botao = $("btnEnviar");
    aEnviar = true;
    atualizarBotoes();
    botao.firstChild.textContent = "ENVIANDO...";

    var corpo = new URLSearchParams();
    corpo.append("accao", "inscrever");
    corpo.append("nome", valorNome());
    corpo.append("matricula", $("matricula").value.trim());
    corpo.append("principal", $("principal").value.trim());
    corpo.append("alternativo", $("alternativo").value.trim());
    corpo.append("ano", $("ano").value);

    fetch(SCRIPT_URL, { method: "POST", body: corpo })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) mostrarSucesso();
        else tratarErro(data.erro || "Impossível inscrever.");
      })
      .catch(function () {
        mostrarErro("Sem internet. Tente novamente.");
      })
      .then(function () {
        aEnviar = false;
        botao.firstChild.textContent = textoBotaoEnviar;
        atualizarBotoes();
        carregarStatus();
      });
  }

  function mostrarErro(texto) {
    var msg = $("msg");
    msg.className = "erro";
    msg.textContent = texto;
  }

  // Cada erro do servidor leva a pessoa à fase onde o pode corrigir.
  function tratarErro(texto) {
    if (/não reconhecidos|nome completo|Cadete já/i.test(texto)) {
      mostrarPasso(1, true);
      marcarInvalido("field-nome", true, texto);
    } else if (/NURI/i.test(texto)) {
      mostrarPasso(2, true);
      marcarInvalido("field-matricula", true, texto);
    } else {
      mostrarErro(texto);
    }
  }

  function mostrarSucesso() {
    var bloco = $("sucesso");
    $("wizard").hidden = true;
    bloco.hidden = false;
    bloco.classList.remove("run");
    void bloco.offsetWidth;
    bloco.classList.add("run");

    var restante = 5;
    $("contagem").textContent = "A voltar ao início (" + restante + ")";
    clearInterval(timerSucesso);
    timerSucesso = setInterval(function () {
      restante -= 1;
      if (restante > 0) {
        $("contagem").textContent = "A voltar ao início (" + restante + ")";
        return;
      }
      clearInterval(timerSucesso);
      campos.forEach(function (inp) {
        inp.value = "";
        inp.classList.remove("filled");
      });
      bloco.hidden = true;
      bloco.classList.remove("run");
      $("wizard").hidden = false;
      mostrarPasso(1, false);
    }, 1000);
  }

  // ----- Estado do formulário -----

  // O estado e a mensagem vêm do servidor, para não dependerem do relógio do telemóvel.
  function carregarStatus() {
    var inicio = Date.now();
    fetch(SCRIPT_URL + "?accao=statusFormulario")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        relogio.sincronizar(data, inicio, Date.now());
        formAberto = !!data.aberto;
        var statusEl = $("status");
        statusEl.textContent = data.mensagem || (formAberto ? "Inscrições abertas" : "Indisponível");
        statusEl.className = "status " + (formAberto ? "aberto" : "fechado");
        atualizarBotoes();
      })
      .catch(function () {
        $("status").textContent = "Sem Internet";
      });
  }

  mostrarPasso(1, false);
  atualizarBotoes();
  carregarStatus();
  setInterval(function () { if (!document.hidden) carregarStatus(); }, INTERVALO_ESTADO);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
