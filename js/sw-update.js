"use strict";

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      let refreshing = false;
      let shouldRefresh = false;

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!shouldRefresh) return;
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
                if (
                  confirm("Nova versão disponível! Recarregar para atualizar?")
                ) {
                  shouldRefresh = true;
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              }
            });
          });
        })
        .catch((err) => console.warn("[SW] Registro falhou:", err));
    },
    { once: true },
  );
}
