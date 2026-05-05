// ================================================================
// permissions.js — Controle de Acesso por Perfil
// ================================================================

/**
 * Verifica se o usuário atual tem permissão para acessar um módulo.
 * Admin sempre tem acesso a tudo.
 * @param {string} modulo - chave do módulo (ex: 'recepcao', 'call_center')
 * @returns {boolean}
 */
function verificarPermissao(modulo) {
  if (!window.AppState || !window.AppState.userData) return false;
  if (window.AppState.isAdmin) return true;
  const perm = window.AppState.userData.permissoes;
  if (!perm) return false;
  return perm[modulo] === true;
}

/**
 * Verifica se o usuário atual é Admin Master.
 * @returns {boolean}
 */
function isAdmin() {
  return window.AppState && window.AppState.isAdmin === true;
}

/**
 * Filtra uma lista de registros para exibir apenas os do usuário atual.
 * Admin recebe todos os registros sem filtro.
 * @param {Object} registros - objeto com registros do Firebase
 * @returns {Object} registros filtrados
 */
function filtrarPorUsuario(registros) {
  if (!registros) return {};
  if (isAdmin()) return registros;

  const uid = window.AppState.uid;
  const filtrado = {};
  Object.entries(registros).forEach(([id, dado]) => {
    if (dado.registrado_por === uid) {
      filtrado[id] = dado;
    }
  });
  return filtrado;
}

/**
 * Retorna a lista de módulos que o usuário atual pode acessar.
 * Usado pela navbar para renderizar apenas os links permitidos.
 * @returns {Array<string>} lista de identificadores de módulos
 */
function modulosPermitidos() {
  if (isAdmin()) {
    return [
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
  }

  const perm = window.AppState.userData?.permissoes || {};
  const mapa = {
    recepcao: "recepcao",
    call_center: "callcenter",
    cirurgico: "cirurgico",
    honorarios: "honorarios",
    faturamento: "faturamento",
    patrimonio: "patrimonio",
    estoque: "estoque",
    fornecedores: "fornecedores",
  };

  return Object.entries(mapa)
    .filter(([chave]) => perm[chave] === true)
    .map(([, rotaHash]) => rotaHash);
}

/**
 * Redireciona para a tela de login se não tiver permissão no módulo.
 * Exibe mensagem de acesso negado no container.
 * @param {string} modulo - chave interna do módulo
 * @param {HTMLElement} container
 * @returns {boolean} true se tem permissão
 */
function exigirPermissao(modulo, container) {
  // Módulos somente admin
  const apenasAdmin = ["admin", "honorarios", "cirurgico"];

  if (apenasAdmin.includes(modulo) && !isAdmin()) {
    container.innerHTML = `
      <div class="table-empty" style="padding:4rem">
        <i data-lucide="shield-off" width="48" height="48" aria-hidden="true"></i>
        <p style="margin-top:1rem;font-size:1rem;font-weight:600">Acesso Restrito</p>
        <p>Somente administradores podem acessar este módulo.</p>
      </div>
    `;
    lucide.createIcons();
    return false;
  }

  // Verificar permissão do módulo pelo nome de rota
  const chavePermissao = modulo === "callcenter" ? "call_center" : modulo;
  if (!verificarPermissao(chavePermissao) && !isAdmin()) {
    container.innerHTML = `
      <div class="table-empty" style="padding:4rem">
        <i data-lucide="lock" width="48" height="48" aria-hidden="true"></i>
        <p style="margin-top:1rem;font-size:1rem;font-weight:600">Sem Permissão</p>
        <p>Você não tem permissão para acessar este módulo.</p>
      </div>
    `;
    lucide.createIcons();
    return false;
  }

  return true;
}
