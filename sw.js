// Service worker compartilhado pelo formulário (index.html) e pelo painel
// (painel.html). Mínimo, só para o site ser reconhecido como PWA instalável.
// Só guarda em cache os ícones (que existem nos dois sites); as páginas HTML
// vão sempre buscar a versão mais recente na rede, e o Apps Script nunca
// passa pelo cache.
var CACHE_NAME = "acipol-refeicoes-v1";
var ARQUIVOS_BASE = ["favicon.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ARQUIVOS_BASE);
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

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  if (req.url.indexOf("script.google.com") !== -1) return;
  event.respondWith(
    fetch(req).catch(function () { return caches.match(req); })
  );
});
