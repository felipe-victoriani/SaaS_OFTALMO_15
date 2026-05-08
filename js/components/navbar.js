// ================================================================
// navbar.js — Barra Lateral Dinâmica por Permissão
// ================================================================

// Definição de módulos com metadados
const MODULOS_NAV = [
  {
    id: "recepcao",
    label: "Recepção",
    icone: "clipboard-list",
    permissao: "recepcao",
  },
  {
    id: "callcenter",
    label: "Call Center",
    icone: "phone-call",
    permissao: "call_center",
  },
  {
    id: "cirurgico",
    label: "Cirúrgico",
    icone: "scissors",
    permissao: null,
    apenasAdmin: true,
  },
  {
    id: "honorarios",
    label: "Honorários",
    icone: "banknote",
    permissao: null,
    apenasAdmin: true,
  },
  {
    id: "faturamento",
    label: "Faturamento",
    icone: "bar-chart-2",
    permissao: "faturamento",
  },
  {
    id: "patrimonio",
    label: "Patrimônio",
    icone: "building-2",
    permissao: "patrimonio",
  },
  { id: "estoque", label: "Estoque", icone: "package", permissao: "estoque" },
  {
    id: "fornecedores",
    label: "Fornecedores",
    icone: "truck",
    permissao: "fornecedores",
  },
];

const ADMIN_NAV = { id: "admin", label: "Administração", icone: "settings" };

/**
 * Renderiza a barra lateral com base nas permissões do usuário.
 * @param {HTMLElement} sidebarNav - container .sidebar-nav
 * @param {HTMLElement} sidebarUser - container .sidebar-user
 */
function renderNavbar(sidebarNav, sidebarUser) {
  const admin = isAdmin();
  const perm = window.AppState.userData?.permissoes || {};

  // Montar links dos módulos
  const linksHtml = MODULOS_NAV.filter((m) => {
    if (m.apenasAdmin) return admin;
    return admin || perm[m.permissao] === true;
  })
    .map(
      (m) => `
      <button class="sidebar-link" data-rota="${m.id}" aria-label="Ir para ${m.label}">
        <i data-lucide="${m.icone}" width="18" height="18" aria-hidden="true"></i>
        <span>${m.label}</span>
      </button>
    `,
    )
    .join("");

  // Link admin
  const adminHtml = admin
    ? `
    <div class="sidebar-section" style="margin-top:0.5rem">
      <p class="sidebar-section-title">Sistema</p>
      <button class="sidebar-link" data-rota="${ADMIN_NAV.id}" aria-label="Ir para ${ADMIN_NAV.label}">
        <i data-lucide="${ADMIN_NAV.icone}" width="18" height="18" aria-hidden="true"></i>
        <span>${ADMIN_NAV.label}</span>
      </button>
    </div>
  `
    : "";

  sidebarNav.innerHTML = `
    <div class="sidebar-section">
      <p class="sidebar-section-title">Módulos</p>
      ${linksHtml}
    </div>
    ${adminHtml}
  `;

  // Perfil do usuário
  const nome = window.AppState.nome || "Usuário";
  const nomeEscapado = escapeHtml(nome);
  const papel = admin ? "Admin Master" : "Usuário";

  sidebarUser.innerHTML = `
    <div class="sidebar-user-info">
      <div class="sidebar-user-avatar" aria-hidden="true">
        <i data-lucide="user" width="16" height="16"></i>
      </div>
      <div>
        <div class="sidebar-user-name" title="${nomeEscapado}">${nomeEscapado}</div>
        <div class="sidebar-user-role">${papel}</div>
      </div>
    </div>
    <button class="sidebar-logout-btn" id="btn-logout" aria-label="Sair do sistema">
      <i data-lucide="log-out" width="14" height="14" aria-hidden="true"></i>
      <span>Sair</span>
    </button>
  `;

  // Inicializar ícones Lucide
  lucide.createIcons({ nodes: [sidebarNav, sidebarUser] });

  // Eventos de clique nos links
  sidebarNav.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", () => {
      const rota = link.dataset.rota;
      navegarPara(rota);
      // Fechar sidebar em mobile
      document.querySelector(".sidebar")?.classList.remove("open");
      document.querySelector(".sidebar-overlay")?.classList.remove("visible");
    });
  });

  // Botão logout
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    Modal.confirmar(
      "Tem certeza que deseja sair do sistema?",
      () => logout(),
      "Sair do Sistema",
    );
  });
}

/**
 * Inicializa o controle mobile (hambúrguer e overlay).
 */
function initMobileNav() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");

  if (!toggle || !sidebar || !overlay) return;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("visible");
    const aberto = sidebar.classList.contains("open");
    toggle.setAttribute("aria-expanded", aberto ? "true" : "false");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("visible");
    toggle.setAttribute("aria-expanded", "false");
  });
}
