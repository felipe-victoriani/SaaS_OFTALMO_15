// ================================================================
// modal.js — Modal Genérico Reutilizável
// ================================================================

(function () {
  let _overlay = null;
  let _fecharCallback = null;

  /**
   * Abre um modal com conteúdo customizável.
   * @param {Object} opcoes
   * @param {string}   opcoes.titulo    - Título do modal
   * @param {string}   opcoes.corpo     - HTML do corpo
   * @param {string}   opcoes.tamanho   - 'sm' | 'md' | 'lg' | 'xl' (padrão: 'md')
   * @param {Array}    opcoes.botoes    - [{label, classe, id, onClick}]
   * @param {Function} opcoes.onFechar  - callback ao fechar
   * @param {string}   opcoes.icone     - nome ícone Lucide para o título (opcional)
   */
  function abrirModal({
    titulo,
    corpo,
    tamanho = "md",
    botoes = [],
    onFechar,
    icone,
  }) {
    fecharModal(); // garantir que não há modal aberto

    _fecharCallback = onFechar;

    // Criar overlay
    _overlay = document.createElement("div");
    _overlay.className = "modal-overlay";
    _overlay.setAttribute("role", "dialog");
    _overlay.setAttribute("aria-modal", "true");
    _overlay.setAttribute("aria-labelledby", "modal-titulo");

    // Fechar ao clicar fora
    _overlay.addEventListener("click", (e) => {
      if (e.target === _overlay) fecharModal();
    });

    // Construir botões do rodapé
    const botoesHtml = botoes
      .map(
        (b) => `
      <button id="${b.id || ""}" class="btn ${b.classe || "btn-secondary"}" type="button">
        ${b.icone ? `<i data-lucide="${b.icone}" width="16" height="16" aria-hidden="true"></i>` : ""}
        ${b.label}
      </button>
    `,
      )
      .join("");

    _overlay.innerHTML = `
      <div class="modal modal-${tamanho}" role="document">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-titulo">
            ${icone ? `<i data-lucide="${icone}" width="20" height="20" aria-hidden="true"></i>` : ""}
            ${titulo}
          </h2>
          <button class="modal-close" aria-label="Fechar modal" id="modal-close-btn">
            <i data-lucide="x" width="18" height="18" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body" id="modal-body">
          ${corpo}
        </div>
        ${botoes.length > 0 ? `<div class="modal-footer">${botoesHtml}</div>` : ""}
      </div>
    `;

    document.body.appendChild(_overlay);
    lucide.createIcons({ nodes: [_overlay] });

    // Eventos dos botões
    botoes.forEach((b) => {
      if (b.id && b.onClick) {
        const btn = _overlay.querySelector(`#${b.id}`);
        if (btn) btn.addEventListener("click", b.onClick);
      }
    });

    // Botão fechar
    _overlay
      .querySelector("#modal-close-btn")
      .addEventListener("click", fecharModal);

    // Fechar com Escape
    document.addEventListener("keydown", _onKeyDown);

    // Focar primeiro elemento interativo
    setTimeout(() => {
      const primeiro = _overlay.querySelector(
        "input, select, textarea, button:not(#modal-close-btn)",
      );
      if (primeiro) primeiro.focus();
      else _overlay.querySelector("#modal-close-btn")?.focus();
    }, 50);
  }

  function _onKeyDown(e) {
    if (e.key === "Escape") fecharModal();

    // Armadilha de foco (trap focus dentro do modal)
    if (e.key === "Tab" && _overlay) {
      const focaveis = _overlay.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
  }

  /**
   * Fecha o modal atual.
   */
  function fecharModal() {
    if (!_overlay) return;
    document.removeEventListener("keydown", _onKeyDown);
    if (_overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
    _overlay = null;

    if (typeof _fecharCallback === "function") {
      _fecharCallback();
      _fecharCallback = null;
    }
  }

  /**
   * Retorna o corpo do modal para manipulação dinâmica.
   * @returns {HTMLElement|null}
   */
  function getCorpo() {
    return _overlay ? _overlay.querySelector("#modal-body") : null;
  }

  /**
   * Modal de confirmação simples (Sim/Não).
   * @param {string} mensagem
   * @param {Function} onConfirmar
   * @param {string} titulo
   */
  function confirmar(mensagem, onConfirmar, titulo = "Confirmar ação") {
    abrirModal({
      titulo,
      icone: "alert-triangle",
      tamanho: "sm",
      corpo: `<p style="font-size:0.9rem;color:var(--text-primary);line-height:1.5">${mensagem}</p>`,
      botoes: [
        {
          label: "Cancelar",
          classe: "btn-secondary",
          id: "modal-cancelar",
          onClick: fecharModal,
        },
        {
          label: "Confirmar",
          classe: "btn-danger",
          id: "modal-confirmar",
          onClick: () => {
            fecharModal();
            onConfirmar();
          },
        },
      ],
    });
  }

  // Expor API global
  window.Modal = { abrirModal, fecharModal, confirmar, getCorpo };
})();
