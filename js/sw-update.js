"use strict";

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      // Previne múltiplos reloads na mesma sessão
      const SW_RELOAD_KEY = "sw-updated";
      
      if (sessionStorage.getItem(SW_RELOAD_KEY)) {
        sessionStorage.removeItem(SW_RELOAD_KEY);
        return;
      }

      let refreshing = false;

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        sessionStorage.setItem(SW_RELOAD_KEY, "true");
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
                // Atualiza automaticamente sem popup
                console.log("[SW] Nova versão disponível, atualizando...");
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch((err) => console.warn("[SW] Registro falhou:", err));
    },
    { once: true },
  );
}
