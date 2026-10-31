(function () {
  "use strict";

  var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4zTaR0zxbzubBIWCP21FRjBvby4CPK8CdS5ewglIMPfgA2VE0nKKcXB4tv1YKo0ja/exec";
  var INTERVALO_ESTADO = 30000;

  var formAberto = false;
  var aEnviar = false;
  var msgTimer = null;

  function $(id) { return document.getElementById(id); }

  var camposFormulario = [$("nome"), $("matricula"), $("principal"), $("alternativo"), $("ano")];

  function toggleFilled(inp) {
    inp.classList.toggle("filled", inp.value.trim() !== "");
  }
  camposFormulario.forEach(function (inp) {
    inp.addEventListener("blur", function () { toggleFilled(inp); });
  });
  $("ano").addEventListener("change", function (e) { toggleFilled(e.target); });

  // Só dígitos nos campos numéricos.
  [["matricula", 4], ["principal", 9], ["alternativo", 9]].forEach(function (par) {
    $(par[0]).addEventListener("input", function (e) {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, par[1]);
    });
  });

  function marcarInvalido(fieldId, invalido) {
    var el = $(fieldId);
    el.classList.toggle("invalid", invalido);
    if (invalido) {
      el.classList.add("shake");
      setTimeout(function () { el.classList.remove("shake"); }, 400);
    }
  }

  function mostrarMsg(texto, ok, comContagem) {
    var msg = $("msg");
    clearInterval(msgTimer);
    msg.className = ok ? "ok" : "erro";
    if (!(ok && comContagem)) { msg.textContent = texto; return; }
    var restante = 5;
    msg.textContent = texto + " (" + restante + ")";
    msgTimer = setInterval(function () {
      restante -= 1;
      if (restante <= 0) { clearInterval(msgTimer); msg.textContent = ""; }
      else msg.textContent = texto + " (" + restante + ")";
    }, 1000);
  }

  // O estado e a mensagem vêm do servidor, para não dependerem do relógio do telemóvel.
  function carregarStatus() {
    fetch(SCRIPT_URL + "?accao=statusFormulario")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        formAberto = !!data.aberto;
        var statusEl = $("status");
        statusEl.textContent = data.mensagem || (formAberto ? "Inscrições abertas" : "Indisponível");
        statusEl.className = "status " + (formAberto ? "aberto" : "fechado");
        if (!aEnviar) $("btnEnviar").disabled = !formAberto;
      })
      .catch(function () {
        $("status").textContent = "Sem Internet";
      });
  }

  var REGEX_NOME = /^[\p{L}\p{M}][\p{L}\p{M}' .\-]*$/u;

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!formAberto || aEnviar) return;

    var nome = $("nome").value.replace(/\s+/g, " ").trim();
    var matricula = $("matricula").value.trim();
    var principal = $("principal").value.trim();
    var alternativo = $("alternativo").value.trim();
    var ano = $("ano").value;
    camposFormulario.forEach(toggleFilled);

    var okNome = nome.length >= 5 && nome.length <= 80 && nome.split(" ").length >= 2 && REGEX_NOME.test(nome);
    var okMatricula = /^\d{4}$/.test(matricula);
    var okAno = /^[1-4]$/.test(ano);
    var okPrincipal = /^\d{9}$/.test(principal);
    var okAlternativo = /^\d{9}$/.test(alternativo);
    var iguais = okPrincipal && okAlternativo && principal === alternativo;

    document.querySelector("#field-alternativo .field-error").textContent =
      iguais ? "O contacto alternativo deve ser diferente do principal." : "O contacto contém apenas 9 dígitos.";

    marcarInvalido("field-nome", !okNome);
    marcarInvalido("field-matricula", !okMatricula);
    marcarInvalido("field-ano", !okAno);
    marcarInvalido("field-principal", !okPrincipal);
    marcarInvalido("field-alternativo", !okAlternativo || iguais);
    if (!(okNome && okMatricula && okAno && okPrincipal && okAlternativo) || iguais) return;

    var btn = $("btnEnviar");
    var textoOriginal = btn.textContent;
    aEnviar = true;
    btn.disabled = true;
    btn.textContent = "Enviando...";

    var corpo = new URLSearchParams();
    corpo.append("accao", "inscrever");
    corpo.append("nome", nome);
    corpo.append("matricula", matricula);
    corpo.append("principal", principal);
    corpo.append("alternativo", alternativo);
    corpo.append("ano", ano);

    fetch(SCRIPT_URL, { method: "POST", body: corpo })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          mostrarMsg("Inscrição registada com sucesso.", true, true);
          camposFormulario.forEach(function (inp) {
            inp.value = "";
            inp.classList.remove("filled");
          });
        } else {
          mostrarMsg(data.erro || "Impossível inscrever.", false);
        }
      })
      .catch(function () {
        mostrarMsg("Sem internet. Tente novamente.", false);
      })
      .then(function () {
        aEnviar = false;
        btn.textContent = textoOriginal;
        btn.disabled = !formAberto;
        carregarStatus();
      });
  });

  carregarStatus();
  setInterval(function () { if (!document.hidden) carregarStatus(); }, INTERVALO_ESTADO);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
