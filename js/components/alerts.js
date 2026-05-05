// ================================================================
// alerts.js — Sistema de Notificações Toast (aria-live)
// ================================================================

(function () {
  // Criar container de toasts se não existir
  function garantirContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");
      container.setAttribute("role", "region");
      container.setAttribute("aria-label", "Notificações");
      document.body.appendChild(container);
    }
    return container;
  }

  // Ícones por tipo de toast
  const ICONES = {
    success: "check-circle",
    warning: "alert-triangle",
    error: "x-circle",
    info: "info",
  };

  // Fila de toasts ativos
  const fila = [];
  const MAX_VISIVEIS = 5;

  /**
   * Exibe um toast de notificação.
   * @param {string} mensagem - texto da notificação
   * @param {string} tipo - 'success' | 'warning' | 'error' | 'info'
   * @param {number} duracao - ms até fechar automaticamente (0 = não fecha)
   * @param {string|null} link - URL clicável (opcional)
   */
  function showToast(mensagem, tipo = "info", duracao = 4000, link = null) {
    const container = garantirContainer();

    // Remover toasts mais antigos se exceder o máximo
    while (fila.length >= MAX_VISIVEIS) {
      removerToast(fila[0]);
    }

    const id = Date.now() + Math.random();
    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.dataset.id = id;
    toast.setAttribute("role", tipo === "error" ? "alert" : "status");

    // Definir aria-live baseado no tipo
    if (tipo === "error") {
      toast.setAttribute("aria-live", "assertive");
    }

    const msgHtml = link
      ? `<a href="${link}" style="color:var(--accent);text-decoration:underline">${mensagem}</a>`
      : mensagem;

    toast.innerHTML = `
      <div class="toast-icon" aria-hidden="true">
        <i data-lucide="${ICONES[tipo] || "info"}" width="18" height="18"></i>
      </div>
      <div class="toast-content">
        <p class="toast-message">${msgHtml}</p>
      </div>
      <button class="toast-dismiss" aria-label="Fechar notificação" onclick="window.Alerts.fechar(${id})">
        <i data-lucide="x" width="14" height="14" aria-hidden="true"></i>
      </button>
    `;

    container.appendChild(toast);
    fila.push({ id, toast });
    lucide.createIcons({ nodes: [toast] });

    // Auto-dismiss
    if (duracao > 0) {
      setTimeout(() => removerToastPorId(id), duracao);
    }

    return id;
  }

  /**
   * Remove um toast pelo ID.
   */
  function removerToastPorId(id) {
    const item = fila.find((t) => t.id === id);
    if (item) removerToast(item);
  }

  function removerToast(item) {
    const idx = fila.indexOf(item);
    if (idx > -1) fila.splice(idx, 1);

    item.toast.classList.add("dismissing");
    setTimeout(() => {
      if (item.toast.parentNode) item.toast.parentNode.removeChild(item.toast);
    }, 280);
  }

  // Expor API global
  window.Alerts = {
    /**
     * Toast de sucesso (4s)
     */
    sucesso(msg, duracao = 4000) {
      return showToast(msg, "success", duracao);
    },
    /**
     * Toast de aviso (4s)
     */
    aviso(msg, duracao = 4000) {
      return showToast(msg, "warning", duracao);
    },
    /**
     * Toast de erro (6s)
     */
    erro(msg, duracao = 6000) {
      return showToast(msg, "error", duracao);
    },
    /**
     * Toast informativo (4s)
     */
    info(msg, duracao = 4000) {
      return showToast(msg, "info", duracao);
    },
    /**
     * Toast de vencimento (6s, link opcional)
     */
    vencimento(msg, tipo, link = null, duracao = 6000) {
      return showToast(msg, tipo, duracao, link);
    },
    /**
     * Fechar toast por ID
     */
    fechar(id) {
      removerToastPorId(Number(id));
    },
    /**
     * Fechar todos os toasts
     */
    fecharTodos() {
      [...fila].forEach((item) => removerToast(item));
    },
  };
})();
