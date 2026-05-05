// ================================================================
// router.js — Roteamento SPA Client-Side por Hash (fetch-based)
// ================================================================

const MODULOS_VALIDOS = [
  "recepcao",
  "callcenter",
  "cirurgico",
  "honorarios",
  "faturamento",
  "patrimonio",
  "estoque",
  "fornecedores",
  "admin",
];

// Referência ao listener ativo (para limpar escutas do Firebase)
window._activeListeners = [];

/**
 * Cancela todos os listeners Firebase ativos (ao trocar de módulo).
 */
function cancelarListenersAtivos() {
  window._activeListeners.forEach((fn) => {
    try {
      fn();
    } catch (_) {}
  });
  window._activeListeners = [];
}

/**
 * Registra um listener Firebase para ser cancelado na próxima navegação.
 * @param {Function} cancelFn - função retornada pelo escutar()
 */
function registrarListener(cancelFn) {
  window._activeListeners.push(cancelFn);
}

/** Retorna o container principal de conteúdo */
function getMainContainer() {
  return document.getElementById("main-content");
}

/** Obtém o hash atual sem o # */
function hashAtual() {
  return window.location.hash.replace("#", "") || "recepcao";
}

/**
 * Navega para um módulo atualizando o hash da URL.
 * @param {string} rota - ex: 'recepcao', 'admin'
 */
function navegarPara(rota) {
  window.location.hash = rota;
}

/**
 * Processa a rota atual, busca o HTML do módulo via fetch e chama mount().
 */
async function processarRota() {
  const rota = hashAtual();
  const container = getMainContainer();

  // Verificar permissão
  const modulosAdmin = ["admin", "honorarios", "cirurgico"];
  if (modulosAdmin.includes(rota) && !isAdmin()) {
    cancelarListenersAtivos();
    container.innerHTML = `
      <div class="page-content">
        <div class="table-empty" style="padding:4rem">
          <i data-lucide="shield-off" width="48" height="48" aria-hidden="true"></i>
          <p style="margin-top:1rem;font-size:1rem;font-weight:600">Acesso Restrito</p>
          <p>Somente administradores podem acessar este módulo.</p>
        </div>
      </div>`;
    lucide.createIcons();
    atualizarNavbarAtivo(rota);
    return;
  }

  cancelarListenersAtivos();
  atualizarNavbarAtivo(rota);

  if (!MODULOS_VALIDOS.includes(rota)) {
    const modulos = modulosPermitidos();
    if (modulos.length > 0) {
      navegarPara(modulos[0]);
    } else {
      container.innerHTML = `
        <div class="page-content">
          <div class="table-empty" style="padding:4rem">
            <i data-lucide="compass-off" width="48" height="48" aria-hidden="true"></i>
            <p style="margin-top:1rem">Nenhum módulo disponível.</p>
          </div>
        </div>`;
      lucide.createIcons();
    }
    return;
  }

  container.innerHTML =
    '<div class="loading-wrapper"><div class="spinner"></div></div>';

  try {
    const res = await fetch(`modules/${rota}/${rota}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    container.innerHTML = await res.text();

    // Injetar CSS do módulo caso exista (sem duplicar)
    const cssHref = `modules/${rota}/${rota}.css`;
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const cssRes = await fetch(cssHref, { method: "HEAD" });
      // CORRIGIDO: verifica content-type para evitar carregar HTML de 404 redirect como CSS
      const ct = cssRes.headers.get("content-type") || "";
      if (cssRes.ok && ct.includes("css")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cssHref;
        document.head.appendChild(link);
      }
    }

    if (window.Modules[rota]?.mount) {
      window.Modules[rota].mount(container);
    }
  } catch (err) {
    console.error("[router]", err);
    container.innerHTML = `
      <div class="page-content">
        <div class="table-empty">
          <p>Módulo não encontrado.</p>
        </div>
      </div>`;
  }
}

/**
 * Atualiza o estado visual do link ativo na navbar.
 * @param {string} rota
 */
function atualizarNavbarAtivo(rota) {
  document.querySelectorAll(".sidebar-link").forEach((el) => {
    el.classList.toggle("active", el.dataset.rota === rota);
  });
}

/**
 * Inicializa o roteador — deve ser chamado após AppState estar pronto.
 */
function initRouter() {
  // Escutar mudanças de hash
  window.addEventListener("hashchange", processarRota);
  // Processar rota inicial
  processarRota();
}
