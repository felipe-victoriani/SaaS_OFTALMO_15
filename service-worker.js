// ================================================================
// service-worker.js — PWA Service Worker v5.0
// ================================================================
"use strict";

const CACHE_NAME = "oftalmo15-v10";
const CACHE_STATIC = "oftalmo15-static-v10";

// Assets para cache imediato (Cache First)
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/app.html",
  "/css/styles.css",
  "/firebase-config.js",
  "/js/auth.js",
  "/js/db.js",
  "/js/permissions.js",
  "/js/router.js",
  "/js/export.js",
  "/js/notifications.js",
  "/js/components/alerts.js",
  "/js/components/modal.js",
  "/js/components/navbar.js",
  "/js/modules/recepcao.js",
  "/js/modules/callcenter.js",
  "/js/modules/cirurgico.js",
  "/js/modules/honorarios.js",
  "/js/modules/faturamento.js",
  "/js/modules/patrimonio.js",
  "/js/modules/estoque.js",
  "/js/modules/fornecedores.js",
  "/js/modules/admin.js",
  "/manifest.json",
];

// URLs que nunca devem ser cacheadas (Firebase, CDNs com dados dinâmicos)
const NEVER_CACHE = [
  "firebaseio.com",
  "googleapis.com/identitytoolkit",
  "securetoken.googleapis.com",
  "gstatic.com/firebasejs",
];

// ---- INSTALL ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => {
        return cache.addAll(
          STATIC_ASSETS.map((url) => new Request(url, { cache: "reload" })),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

// ---- ACTIVATE ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== CACHE_STATIC)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---- FETCH ----
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  // Nunca cachear Firebase ou APIs dinâmicas
  if (NEVER_CACHE.some((pattern) => url.includes(pattern))) {
    event.respondWith(
      fetch(request).catch((err) => {
        if (url.includes("gstatic.com/firebasejs")) {
          console.warn(
            "[SW] Firebase CDN bloqueado ou indisponível:",
            url,
            err,
          );
        } else {
          console.warn("[SW] Falha em recurso não-cacheável:", url, err);
        }
        throw err;
      }),
    );
    return;
  }

  // Somente GET
  if (request.method !== "GET") return;

  // Cache First para assets estáticos
  if (STATIC_ASSETS.some((asset) => url.endsWith(asset))) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
              }
              return response;
            })
            .catch((err) => {
              console.warn("[SW] Falha ao carregar asset estático:", url, err);
              throw err;
            }),
      ),
    );
    return;
  }

  // Network First para navegação (HTML)
  if (request.destination === "document") {
    event.respondWith(
      fetch(request).catch((err) => {
        console.warn("[SW] Falha de navegação, servindo fallback:", url, err);
        return caches.match("/index.html");
      }),
    );
    return;
  }

  // Stale-while-revalidate para outros recursos
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch((err) => {
            console.warn("[SW] Falha ao atualizar recurso:", url, err);
            return cached;
          });
        return cached || fetchPromise;
      });
    }),
  );
});

// ---- MESSAGE (skip waiting) ----
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
