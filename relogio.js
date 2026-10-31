(function () {
  "use strict";

  var INTERVALO_SINCRONIZACAO = 60000;

  // opcoes.hora: elemento da hora (hh:mm:ss)
  // opcoes.data: elemento da data (dd/mm/aaaa - dia da semana), opcional
  // opcoes.url: se existir, o relógio acerta-se sozinho com o servidor
  function iniciar(opcoes) {
    var elHora = opcoes.hora;
    var elData = opcoes.data || null;
    var desvio = 0;      // hora do servidor menos a do telemóvel, em ms
    var fuso;            // fuso horário do servidor
    var fmtHora, fmtData;

    function criarFormatadores() {
      function novo(config) {
        try {
          if (fuso) config.timeZone = fuso;
          return new Intl.DateTimeFormat("pt-PT", config);
        } catch (e) {
          delete config.timeZone;
          return new Intl.DateTimeFormat("pt-PT", config);
        }
      }
      fmtHora = novo({ hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
      fmtData = novo({ day: "2-digit", month: "2-digit", year: "numeric", weekday: "long" });
    }

    function dataEscrita(instante) {
      var p = {};
      fmtData.formatToParts(instante).forEach(function (parte) { p[parte.type] = parte.value; });
      var dia = p.weekday.charAt(0).toUpperCase() + p.weekday.slice(1);
      return p.day + "/" + p.month + "/" + p.year + " - " + dia;
    }

    function mostrar() {
      var agora = new Date(Date.now() + desvio);
      elHora.textContent = fmtHora.format(agora);
      if (elData) elData.textContent = dataEscrita(agora);
    }

    // Actualiza no início de cada segundo do servidor.
    function agendar() {
      mostrar();
      var espera = 1000 - ((Date.now() + desvio) % 1000);
      setTimeout(agendar, espera + 5);
    }

    // dados: resposta do servidor com agoraMs e fuso; inicio e fim: instantes do pedido.
    function sincronizar(dados, inicio, fim) {
      if (!dados || typeof dados.agoraMs !== "number") return;
      desvio = dados.agoraMs - (inicio + (fim - inicio) / 2);
      if (dados.fuso && dados.fuso !== fuso) {
        fuso = dados.fuso;
        criarFormatadores();
      }
      mostrar();
    }

    function consultarServidor() {
      var inicio = Date.now();
      fetch(opcoes.url + "?accao=hora")
        .then(function (r) { return r.json(); })
        .then(function (dados) { sincronizar(dados, inicio, Date.now()); })
        .catch(function () {});
    }

    criarFormatadores();
    agendar();

    if (opcoes.url) {
      consultarServidor();
      setInterval(function () { if (!document.hidden) consultarServidor(); }, INTERVALO_SINCRONIZACAO);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) consultarServidor();
      });
    }

    return { sincronizar: sincronizar };
  }

  window.RelogioAcipol = { iniciar: iniciar };
})();
