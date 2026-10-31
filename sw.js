// Service worker partilhado pelo formulário e pelo painel.
// Só trata pedidos GET da mesma origem; o Apps Script (outra origem) passa sem cache.
var CACHE_NAME = "acipol-refeicoes-v4";
var ARQUIVOS_BASE = [
  "./", "index.html", "painel.html", "inscricao.js", "painel.js", "relogio.js",
  "favicon.png", "icon-192.png", "icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Um ficheiro em falta não deve impedir a instalação.
      return Promise.all(ARQUIVOS_BASE.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(
        nomes.filter(function (n) { return n !== CACHE_NAME; })
             .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Rede primeiro; se falhar, usa a última cópia guardada.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(function (resp) {
      if (resp && resp.ok) {
        var copia = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copia); });
      }
      return resp;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (resp) {
        return resp || Response.error();
      });
    })
  );
});
