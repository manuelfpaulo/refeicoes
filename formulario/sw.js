// Service worker mínimo — só o necessário pra ser reconhecido como PWA
// instalável. Não tenta funcionar offline de verdade, porque o formulário
// precisa sempre falar com o Apps Script ao vivo.
var CACHE_NAME = "inscricao-acipol-v1";
var ARQUIVOS_BASE = ["/", "/index.html", "/favicon.png", "/icon-192.png", "/icon-512.png"];

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
  // Só usa cache para o "casco" do app; tudo o que fala com o Apps Script
  // (fetch do SCRIPT_URL) vai sempre direto pra rede.
  if (event.request.url.indexOf("script.google.com") !== -1) return;
  event.respondWith(
    caches.match(event.request).then(function (resp) {
      return resp || fetch(event.request);
    })
  );
});
