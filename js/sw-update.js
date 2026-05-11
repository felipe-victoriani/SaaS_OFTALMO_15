"use strict";

if ("serviceWorker" in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register("/service-worker.js")
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            if (confirm("Nova versão disponível! Recarregar para atualizar?")) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          }
        });
      });
    })
    .catch((err) => console.warn("[SW] Registro falhou:", err));
}
