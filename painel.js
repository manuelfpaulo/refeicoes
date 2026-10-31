(function () {
  "use strict";

  var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4zTaR0zxbzubBIWCP21FRjBvby4CPK8CdS5ewglIMPfgA2VE0nKKcXB4tv1YKo0ja/exec";
  var CHAVE_SESSAO = "acipol_sessao";
  var INTERVALO_COZINHA = 10000;
  var INTERVALO_CHEFE = 30000;

  var sessao = null;
  var pollTimer = null;
  var ultimoPainel = null;
  var ultimaListaChefe = null;
  var filtroAtual = "";
  var aEnviar = false;

  // A versão anterior guardava a senha neste campo.
  localStorage.removeItem("acipol_auth");

  function $(id) { return document.getElementById(id); }

  // Só a hora; o dia já aparece no painel.
  window.RelogioAcipol.iniciar({ hora: $("relogio"), url: SCRIPT_URL });

  function esc(v) {
    var mapa = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return mapa[c]; });
  }

  function api(accao, params) {
    var corpo = new URLSearchParams(Object.assign({ accao: accao }, params || {}));
    if (sessao && accao !== "login") corpo.set("token", sessao.token);
    return fetch(SCRIPT_URL, { method: "POST", body: corpo })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.sessaoExpirada) terminarSessao("Sessão expirada. Entre novamente.");
        return data;
      });
  }

  // ----- Campos e mensagens -----

  function toggleFilled(inp) {
    inp.classList.toggle("filled", inp.value.trim() !== "");
  }
  var camposLogin = [$("username"), $("password")];
  camposLogin.forEach(function (inp) {
    inp.addEventListener("blur", function () { toggleFilled(inp); });
  });

  function marcarInvalido(fieldId, invalido) {
    var el = $(fieldId);
    el.classList.toggle("invalid", invalido);
    if (invalido) {
      el.classList.add("shake");
      setTimeout(function () { el.classList.remove("shake"); }, 400);
    }
  }

  var msgTimer = null;
  function mostrarMsg(texto, erro) {
    var el = $("msg-ok");
    clearInterval(msgTimer);
    el.className = erro ? "erro" : "";
    var restante = 5;
    el.textContent = texto + " (" + restante + ")";
    msgTimer = setInterval(function () {
      restante -= 1;
      if (restante <= 0) { clearInterval(msgTimer); el.textContent = ""; }
      else el.textContent = texto + " (" + restante + ")";
    }, 1000);
  }

  // ----- Sessão -----

  function fazerLogin() {
    var username = $("username").value.trim();
    var password = $("password").value;
    camposLogin.forEach(toggleFilled);

    var valido = true;
    marcarInvalido("field-username", !username);
    marcarInvalido("field-password", !password);
    if (!username || !password) valido = false;
    if (!valido) return;

    var btn = $("btnLogin");
    var textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Entrando...";
    $("login-msg").textContent = "";

    api("login", { username: username, password: password })
      .then(function (data) {
        btn.disabled = false;
        btn.textContent = textoOriginal;
        if (!data.ok) {
          $("login-msg").textContent = data.erro || "Login inválido.";
          return;
        }
        sessao = { token: data.token, nome: data.nome, role: data.role };
        localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
        $("password").value = "";
        entrarNoDashboard();
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = textoOriginal;
        $("login-msg").textContent = "Sem ligação. Tente novamente.";
      });
  }

  function entrarNoDashboard() {
    var ehChefe = sessao.role === "chefe";
    var ehAdmin = sessao.role === "admin";

    $("login-screen").style.display = "none";
    $("dashboard").style.display = "block";
    $("userLabel").textContent = sessao.nome + (ehAdmin ? " (admin)" : "");
    $("admin-panel").style.display = ehAdmin ? "block" : "none";
    $("tabelaCozinha").style.display = ehChefe ? "none" : "";
    $("chefe-view").style.display = ehChefe ? "block" : "none";
    $("btnPrint").style.display = ehChefe ? "" : "none";

    if (ehAdmin) carregarFeriados();
    carregarPainel();
    clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!document.hidden) carregarPainel();
    }, ehChefe ? INTERVALO_CHEFE : INTERVALO_COZINHA);
  }

  function terminarSessao(mensagem) {
    sessao = null;
    localStorage.removeItem(CHAVE_SESSAO);
    clearInterval(pollTimer);
    ultimoPainel = null;
    ultimaListaChefe = null;
    $("dashboard").style.display = "none";
    $("login-screen").style.display = "flex";
    $("password").value = "";
    $("login-msg").textContent = mensagem || "";
  }

  $("btnLogin").addEventListener("click", fazerLogin);
  [$("username"), $("password")].forEach(function (inp) {
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") fazerLogin();
    });
  });

  $("btnLogout").addEventListener("click", function () {
    api("logout").catch(function () {});
    terminarSessao("");
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && sessao) carregarPainel();
  });

  // ----- Pesquisa -----

  function normalizarBusca(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function filtrarLinhas(linhas, termo) {
    var t = normalizarBusca(termo);
    if (!t) return linhas;
    return linhas.filter(function (l) {
      return normalizarBusca(l.nome).indexOf(t) !== -1 || String(l.matricula).indexOf(t) !== -1;
    });
  }

  function destacar(texto, termo) {
    texto = String(texto == null ? "" : texto);
    if (!termo) return esc(texto);
    var i = texto.toLowerCase().indexOf(String(termo).toLowerCase());
    if (i === -1) return esc(texto);
    return esc(texto.slice(0, i)) + "<mark>" + esc(texto.slice(i, i + termo.length)) + "</mark>" +
      esc(texto.slice(i + termo.length));
  }

  $("buscaInput").addEventListener("input", function (e) {
    filtroAtual = e.target.value;
    if (!sessao) return;
    if (sessao.role === "chefe") { if (ultimaListaChefe) renderChefe(ultimaListaChefe); }
    else if (ultimoPainel) renderPainel(ultimoPainel);
  });

  // ----- Painel da cozinha -----

  function carregarPainel() {
    if (!sessao) return;
    if (sessao.role === "chefe") { carregarListaChefe(); return; }
    api("painel")
      .then(function (data) { if (data && data.ok) renderPainel(data); })
      .catch(function () { mostrarMsg("Sem ligação ao servidor.", true); });
  }

  function renderPainel(data) {
    ultimoPainel = data;
    $("dataBadge").textContent = data.colunas.length ? data.colunas[0].day : "Período de Inscrições";

    var thead = $("tableHead");
    var tbody = $("tableBody");

    if (!data.colunas.length) {
      var preview = filtrarLinhas(data.linhas, filtroAtual);
      thead.innerHTML = "<tr><th class='nome-col'>NOME COMPLETO</th><th>ANO</th><th>NURI</th></tr>";
      if (preview.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="padding:20px;color:var(--muted);">Ainda ninguém se inscreveu para o próximo fim de semana.</td></tr>';
      } else {
        tbody.innerHTML = preview.map(function (l) {
          return "<tr><td class='nome-col'>" + destacar(l.nome, filtroAtual) + "</td><td>" + esc(l.ano) +
            "</td><td>" + destacar(l.matricula, filtroAtual) + "</td></tr>";
        }).join("");
      }
      $("counterLabel").textContent = "Inscritos para o próximo fim de semana";
      $("counterValue").textContent = data.linhas.length;
      return;
    }

    thead.innerHTML = "<tr><th></th><th class='nome-col'>Nome completo</th><th>Ano</th>" +
      data.colunas.map(function (c) {
        var cls = c.key === data.colunaAtiva ? "active" : "";
        return "<th class='" + cls + "'>" + esc(c.meal) + "<br><span style='font-weight:400;font-size:11px;'>" +
          esc(c.inicio) + "–" + esc(c.fim) + "</span></th>";
      }).join("") + "</tr>";

    var linhas = filtrarLinhas(data.linhas, filtroAtual);
    if (linhas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + (data.colunas.length + 3) + '" style="padding:16px;color:var(--muted);">Nenhum cadete encontrado.</td></tr>';
    } else {
      tbody.innerHTML = linhas.map(function (l, i) {
        var celulas = data.colunas.map(function (c) {
          var cel = l.celulas[c.key];
          var ativa = c.key === data.colunaAtiva;
          var icone, titulo = "";
          if (cel.estado === "presente") {
            icone = "<span class='ok-icon'>&#10003;</span>";
            titulo = "Marcado por " + cel.marcadoPor;
          } else if (cel.estado === "ausente") {
            icone = "<span class='x-icon'>&#10007;</span>";
          } else {
            icone = "<span class='empty-icon'>&#9633;</span>";
          }
          var dados = "data-col='" + esc(c.key) + "' data-mat='" + esc(l.matricula) + "'";
          var clicavel = ativa && cel.estado === "vazio";
          var desfazer = (sessao.role === "admin" && cel.estado === "presente")
            ? "<span class='revert' " + dados + ">desfazer</span>" : "";
          return "<td class='" + (ativa ? "active" : "") + (clicavel ? " clickable" : "") + "' title='" + esc(titulo) + "' " +
            (clicavel ? dados : "") + ">" + icone + desfazer + "</td>";
        }).join("");
        return "<tr><td>" + (i + 1) + "</td><td class='nome-col'>" + destacar(l.nome, filtroAtual) +
          "</td><td>" + esc(l.ano) + "</td>" + celulas + "</tr>";
      }).join("");
    }

    if (data.colunaAtiva !== null) {
      var ativa = data.colunas.filter(function (c) { return c.key === data.colunaAtiva; })[0];
      $("counterLabel").textContent = "Restam sem " + ativa.meal;
      $("counterValue").textContent = data.restantes;
    } else {
      $("counterLabel").textContent = "Entre refeições";
      $("counterValue").textContent = "—";
    }
    $("counterLabel1").textContent = "Cadetes";

    if (data.feriadoHoje) $("dataBadge").textContent += " · Feriado";
  }

  // Um único ouvinte para marcar e desfazer.
  $("tableBody").addEventListener("click", function (ev) {
    if (aEnviar) return;
    var desfazer = ev.target.closest(".revert");
    var celula = desfazer ? null : ev.target.closest("td.clickable");
    var alvo = desfazer || celula;
    if (!alvo) return;

    var accao = desfazer ? "reverter" : "marcar";
    if (desfazer && !window.confirm("Desfazer esta marcação?")) return;

    aEnviar = true;
    api(accao, { matricula: alvo.getAttribute("data-mat"), colunaKey: alvo.getAttribute("data-col") })
      .then(function (res) {
        if (res.ok) {
          mostrarMsg(desfazer ? "Marcação revertida." : "Marcação registada.");
          carregarPainel();
        } else if (!res.sessaoExpirada) {
          mostrarMsg(res.erro || "Não foi possível concluir.", true);
        }
      })
      .catch(function () { mostrarMsg("Sem ligação ao servidor.", true); })
      .then(function () { aEnviar = false; });
  });

  // ----- Chefe dos Residentes -----

  function carregarListaChefe() {
    api("listaChefe")
      .then(function (res) {
        if (!res.ok) return;
        ultimaListaChefe = res;
        renderChefe(res);
      })
      .catch(function () { mostrarMsg("Sem ligação ao servidor.", true); });
  }

  function renderChefe(data) {
    var lista = data.lista;
    var t = normalizarBusca(filtroAtual);
    var visiveis = !t ? lista : lista.filter(function (l) {
      return normalizarBusca(l.nome).indexOf(t) !== -1 ||
        String(l.principal).indexOf(t) !== -1 || String(l.alternativo).indexOf(t) !== -1;
    });

    $("dataBadge").textContent = "Inscritos da semana";
    $("counterLabel").textContent = "Inscritos";
    $("counterValue").textContent = lista.length;
    $("counterLabel1").textContent = "Cadetes";

    $("chefeHead").innerHTML =
      "<tr><th></th><th class='nome-col'>Nome completo</th><th>Ano</th><th>Principal</th><th>Alternativo</th></tr>";
    var tbody = $("chefeBody");
    if (visiveis.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="padding:16px;color:var(--muted);">' +
        (lista.length ? "Nenhum cadete encontrado." : "Ainda ninguém se inscreveu.") + "</td></tr>";
      return;
    }
    tbody.innerHTML = visiveis.map(function (l, i) {
      return "<tr><td>" + (i + 1) + "</td><td class='nome-col'>" + destacar(l.nome, filtroAtual) +
        "</td><td>" + esc(l.ano) + "</td><td>" + esc(l.principal) + "</td><td>" + esc(l.alternativo) + "</td></tr>";
    }).join("");
  }



  $("btnPrint").addEventListener("click", function () {
    if (!ultimaListaChefe) return;
    api("exportou").catch(function () {});
    baixarPdfLista(ultimaListaChefe.lista);
  });

  // ----- Feriados (admin) -----

  function carregarFeriados() {
    api("feriados").then(function (res) {
      if (!res.ok) return;
      var ul = $("feriado-lista");
      if (!res.lista.length) {
        ul.innerHTML = "<li style='color:var(--muted);'>Nenhum feriado registado.</li>";
        return;
      }
      ul.innerHTML = res.lista.map(function (f) {
        return "<li>" + esc(f.data) + " — " + esc(f.nome) + "</li>";
      }).join("");
    }).catch(function () {});
  }

  $("btnAddFeriado").addEventListener("click", function () {
    var data = $("feriadoData").value;
    var nome = $("feriadoNome").value.trim();
    if (!data || !nome) { mostrarMsg("Indique a data e o nome do feriado.", true); return; }
    api("addFeriado", { data: data, nome: nome })
      .then(function (res) {
        if (res.ok) {
          $("feriadoData").value = "";
          $("feriadoNome").value = "";
          carregarFeriados();
          mostrarMsg("Feriado registado.");
        } else if (!res.sessaoExpirada) {
          mostrarMsg(res.erro || "Não foi possível registar.", true);
        }
      })
      .catch(function () { mostrarMsg("Sem ligação ao servidor.", true); });
  });

  // ----- Arranque -----

  (function restaurarSessao() {
    var salvo = localStorage.getItem(CHAVE_SESSAO);
    if (!salvo) return;
    try {
      var s = JSON.parse(salvo);
      if (!s || !s.token || !s.nome || !s.role) throw new Error("sessão inválida");
      sessao = s;
      entrarNoDashboard();
    } catch (e) {
      sessao = null;
      localStorage.removeItem(CHAVE_SESSAO);
    }
  })();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
