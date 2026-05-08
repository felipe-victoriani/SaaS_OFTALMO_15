// ================================================================
// admin.js — Módulo Administração (somente Admin Master)
// ================================================================

// Instância secundária do Firebase para criar usuários sem deslogar o admin
function _getSecondaryAuth() {
  const config = firebase.app().options;
  let app;
  try {
    app = firebase.app("secondary-auth");
  } catch (_) {
    app = firebase.initializeApp(config, "secondary-auth");
  }
  return app.auth();
}

window.Modules = window.Modules || {};

window.Modules.admin = {
  _abaAtiva: "usuarios",

  render(container) {
    if (!exigirPermissao("admin", container)) return;

    container.innerHTML = `
      <div class="page-content">
        <div class="module-header">
          <h1 class="module-title">
            <i data-lucide="shield" width="24" height="24" aria-hidden="true"></i>
            Administração
          </h1>
          <p class="module-subtitle">Gestão de usuários, metas e relatórios</p>
        </div>

        <!-- Cards de resumo -->
        <div class="cards-grid mb-3" id="admin-cards-resumo">
          <div class="card"><div class="loading-wrapper"><div class="spinner"></div></div></div>
        </div>

        <!-- Abas -->
        <div class="tabs-bar" role="tablist" aria-label="Módulos de administração">
          <button class="tab-btn active" role="tab" aria-selected="true" data-tab="usuarios">Usuários</button>
          <button class="tab-btn" role="tab" aria-selected="false" data-tab="metas">Metas</button>
          <button class="tab-btn" role="tab" aria-selected="false" data-tab="relatorios">Relatórios</button>

        </div>
        <div id="admin-tab-content" class="tab-content-area"></div>
      </div>
    `;

    lucide.createIcons({ nodes: [container] });
    this._carregarCards();
    this._renderAba("usuarios");

    container.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".tab-btn").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        this._renderAba(btn.dataset.tab);
      });
    });
  },

  // ---- CARDS DE RESUMO ----
  async _carregarCards() {
    const el = document.getElementById("admin-cards-resumo");
    if (!el) return;
    try {
      const [usuariosSnap, patrimonioSnap, estoqueSnap] = await Promise.all([
        lerUmaVez(CAMINHOS.usuarios()),
        lerUmaVez(`${CAMINHOS.base}/patrimonio`),
        lerUmaVez(`${CAMINHOS.base}/estoque`),
      ]);

      const totalUsuarios = usuariosSnap ? Object.keys(usuariosSnap).length : 0;
      const itensPat = patrimonioSnap ? Object.values(patrimonioSnap) : [];
      const vencendo = itensPat.filter((r) => {
        const d = diasAteVencer(r.data_vencimento);
        return d >= 0 && d <= 30;
      }).length;
      const itensEst = estoqueSnap ? Object.values(estoqueSnap) : [];
      const estoqCrit = itensEst.filter(
        (r) => (r.quantidade || 0) <= (r.estoque_minimo || 0),
      ).length;

      el.innerHTML = `
        <div class="card">
          <div class="card-metric">
            <i data-lucide="users" width="20" height="20" aria-hidden="true"></i>
            <span class="metric-label">Usuários</span>
            <span class="metric-value">${totalUsuarios}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <i data-lucide="alert-triangle" width="20" height="20" aria-hidden="true"></i>
            <span class="metric-label">Patrimônio a Vencer (30d)</span>
            <span class="metric-value" style="color:${vencendo > 0 ? "var(--warning)" : "inherit"}">${vencendo}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <i data-lucide="package" width="20" height="20" aria-hidden="true"></i>
            <span class="metric-label">Estoque Crítico / Baixo</span>
            <span class="metric-value" style="color:${estoqCrit > 0 ? "var(--danger)" : "inherit"}">${estoqCrit}</span>
          </div>
        </div>
      `;
      lucide.createIcons({ nodes: [el] });
    } catch (err) {
      el.innerHTML = "";
    }
  },

  // ---- ABAS ----
  _renderAba(aba) {
    this._abaAtiva = aba;
    const content = document.getElementById("admin-tab-content");
    if (!content) return;
    content.innerHTML = `<div class="loading-wrapper"><div class="spinner"></div>Carregando...</div>`;
    if (aba === "usuarios") this._renderUsuarios(content);
    if (aba === "metas") this._renderMetas(content);
    if (aba === "relatorios") this._renderRelatorios(content);
  },

  // ---- ABA: USUÁRIOS ----
  async _renderUsuarios(container) {
    const snap = await lerUmaVez(CAMINHOS.usuarios());
    const usuarios = snap
      ? Object.entries(snap).map(([uid, d]) => ({ uid, ...d }))
      : [];

    const MODULOS_PERM = [
      "recepcao",
      "call_center",
      "cirurgico",
      "honorarios",
      "faturamento",
      "patrimonio",
      "estoque",
      "fornecedores",
    ];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Usuários do Sistema</span>
          <button class="btn btn-primary btn-sm" id="btn-novo-usuario">
            <i data-lucide="user-plus" width="14" height="14" aria-hidden="true"></i> Novo Usuário
          </button>
        </div>
        <div class="table-scroll table-mobile-cards">
          <table class="data-table" aria-label="Usuários">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Perfil</th>
                <th scope="col">Módulos</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${
                usuarios.length === 0
                  ? `<tr><td colspan="5"><div class="table-empty"><p>Nenhum usuário cadastrado.</p></div></td></tr>`
                  : usuarios
                      .map(
                        (u) => `
                  <tr>
                    <td data-label="Nome">${escapeHtml(u.nome) || "—"}</td>
                    <td data-label="E-mail">${escapeHtml(u.email) || "—"}</td>
                    <td data-label="Perfil"><span class="badge ${u.isAdmin ? "badge-primary" : "badge-info"}">${u.isAdmin ? "Admin" : "Usuário"}</span></td>
                    <td data-label="Módulos" style="font-size:.75rem">${
                      Object.keys(u.permissoes || {})
                        .filter((m) => u.permissoes[m])
                        .join(", ") || "—"
                    }</td>
                    <td data-label="Ações">
                      <button class="btn btn-ghost btn-icon btn-sm btn-editar-usuario" data-uid="${escapeHtml(u.uid)}" aria-label="Editar usuário">
                        <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
                      </button>
                      <button class="btn btn-ghost btn-icon btn-sm btn-danger btn-excluir-usuario" data-uid="${escapeHtml(u.uid)}" data-nome="${escapeHtml(u.nome || "")}" aria-label="Excluir usuário">
                        <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                `,
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
    lucide.createIcons({ nodes: [container] });

    container
      .querySelector("#btn-novo-usuario")
      ?.addEventListener("click", () => this._modalUsuario(null));

    container.querySelectorAll(".btn-editar-usuario").forEach((btn) => {
      btn.addEventListener("click", () => this._editarUsuario(btn.dataset.uid));
    });
    container.querySelectorAll(".btn-excluir-usuario").forEach((btn) => {
      btn.addEventListener("click", () =>
        this._excluirUsuario(btn.dataset.uid, btn.dataset.nome),
      );
    });
  },

  _modalUsuario(uid) {
    const usuarios = {};
    lerUmaVez(CAMINHOS.usuarios()).then((snap) => {
      const user = snap && uid ? snap[uid] : null;
      const MODULOS_PERM = [
        "recepcao",
        "call_center",
        "cirurgico",
        "honorarios",
        "faturamento",
        "patrimonio",
        "estoque",
        "fornecedores",
      ];
      Modal.abrirModal({
        titulo: uid ? "Editar Usuário" : "Novo Usuário",
        icone: "user",
        tamanho: "md",
        corpo: `
          <div class="form-group">
            <label class="form-label required" for="adm-u-nome">Nome</label>
            <input type="text" id="adm-u-nome" class="form-input" value="${escapeHtml(user?.nome || "")}" required>
          </div>
          <div class="form-group">
            <label class="form-label required" for="adm-u-email">E-mail</label>
            <input type="email" id="adm-u-email" class="form-input" value="${escapeHtml(user?.email || "")}" ${uid ? "readonly" : ""} required>
          </div>
          ${
            !uid
              ? `
          <div class="form-group">
            <label class="form-label required" for="adm-u-senha">Senha inicial</label>
            <input type="password" id="adm-u-senha" class="form-input" minlength="6" autocomplete="new-password">
          </div>`
              : ""
          }
          <div class="form-check mb-1">
            <input type="checkbox" id="adm-u-admin" ${user?.isAdmin ? "checked" : ""}>
            <label for="adm-u-admin">Admin Master</label>
          </div>
          <div id="adm-u-perm-container">
            <p style="font-size:.8rem;font-weight:600;margin-bottom:.5rem">Permissões por módulo:</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem">
              ${MODULOS_PERM.map(
                (m) => `
                <label style="display:flex;align-items:center;gap:.4rem;font-size:.85rem;cursor:pointer">
                  <input type="checkbox" id="perm-${m}" ${user?.permissoes?.[m] ? "checked" : ""}>
                  ${m.replace(/_/g, " ")}
                </label>
              `,
              ).join("")}
            </div>
          </div>
        `,
        botoes: [
          {
            label: "Cancelar",
            classe: "btn-secondary",
            onClick: () => Modal.fecharModal(),
          },
          {
            label: "Salvar",
            classe: "btn-primary",
            onClick: () => this._salvarUsuario(uid, MODULOS_PERM),
          },
        ],
      });
    });
  },

  async _salvarUsuario(uid, MODULOS_PERM) {
    const nome = document.getElementById("adm-u-nome")?.value.trim();
    const email = document.getElementById("adm-u-email")?.value.trim();
    const senha = document.getElementById("adm-u-senha")?.value || "";
    const admin = document.getElementById("adm-u-admin")?.checked || false;
    const permissoes = {};
    MODULOS_PERM.forEach((m) => {
      permissoes[m] = !!document.getElementById(`perm-${m}`)?.checked;
    });
    if (admin) MODULOS_PERM.forEach((m) => (permissoes[m] = true));

    if (!nome || !email) {
      Alerts.aviso("Preencha nome e e-mail.");
      return;
    }

    try {
      if (uid) {
        await atualizar(`${CAMINHOS.usuarios()}/${uid}`, {
          nome,
          isAdmin: admin,
          permissoes,
        });
        Alerts.sucesso("Usuário atualizado!");
      } else {
        if (senha.length < 6) {
          Alerts.aviso("Senha deve ter no mínimo 6 caracteres.");
          return;
        }
        const cred = await _getSecondaryAuth().createUserWithEmailAndPassword(
          email,
          senha,
        );
        const novoUid = cred.user.uid;
        await _getSecondaryAuth().signOut(); // deslogar da instância secundária
        await atualizar(`${CAMINHOS.usuarios()}/${novoUid}`, {
          nome,
          email,
          isAdmin: admin,
          permissoes,
        });
        Alerts.sucesso("Usuário criado!");
      }
      Modal.fecharModal();
      this._renderAba("usuarios");
    } catch (err) {
      Alerts.erro("Erro ao salvar usuário: " + (err.message || ""));
    }
  },

  _editarUsuario(uid) {
    this._modalUsuario(uid);
  },

  _excluirUsuario(uid, nome) {
    Modal.confirmar(
      `Excluir o usuário "${escapeHtml(nome)}" e todos os seus dados? (LGPD Art. 18 — Direito ao Apagamento)`,
      async () => {
        try {
          await excluirContaUsuario(uid);
          Alerts.sucesso("Usuário e dados excluídos conforme LGPD.");
          this._renderAba("usuarios");
        } catch (err) {
          Alerts.erro("Erro ao excluir usuário: " + (err.message || ""));
        }
      },
      "Confirmar Exclusão de Conta",
    );
  },

  // ---- ABA: METAS ----
  async _renderMetas(container) {
    const snap = await lerUmaVez(CAMINHOS.metas());
    const metas = snap
      ? Object.entries(snap).map(([k, v]) => ({ _id: k, ...v }))
      : [];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Metas por Médico</span>
        </div>
        <form id="form-meta" novalidate>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label required" for="meta-nome">Nome do Médico</label>
              <input type="text" id="meta-nome" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label required" for="meta-valor">Meta Mensal (R$)</label>
              <input type="number" id="meta-valor" class="form-input" min="0" step="100" required>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <i data-lucide="plus" width="16" height="16" aria-hidden="true"></i> Adicionar Meta
            </button>
          </div>
        </form>
      </div>
      <div class="card mt-2">
        <div class="card-header"><span class="card-title">Metas Cadastradas</span></div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Médico</th><th>Meta Mensal</th><th>Ações</th></tr></thead>
            <tbody id="tbody-metas">
              ${
                metas.length === 0
                  ? `<tr><td colspan="3"><div class="table-empty"><p>Nenhuma meta cadastrada.</p></div></td></tr>`
                  : metas
                      .map(
                        (m) => `
                  <tr>
                    <td>${escapeHtml(m.nome)}</td>
                    <td class="table-number">${formatarMoeda(m.valor || 0)}</td>
                    <td>
                      <button class="btn btn-ghost btn-icon btn-sm btn-danger btn-remover-meta" data-id="${escapeHtml(m._id)}" aria-label="Remover meta">
                        <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                `,
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
    lucide.createIcons({ nodes: [container] });

    container.querySelectorAll(".btn-remover-meta").forEach((btn) => {
      btn.addEventListener("click", () => this._removerMeta(btn.dataset.id));
    });

    container
      .querySelector("#form-meta")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = document.getElementById("meta-nome").value.trim();
        const valor =
          parseFloat(document.getElementById("meta-valor").value) || 0;
        if (!nome || valor <= 0) {
          Alerts.aviso("Preencha nome e valor.");
          return;
        }
        try {
          await criar(CAMINHOS.metas(), { nome, valor });
          Alerts.sucesso("Meta adicionada!");
          this._renderAba("metas");
        } catch (err) {
          Alerts.erro("Erro ao salvar meta.");
        }
      });
  },

  async _removerMeta(id) {
    Modal.confirmar("Remover esta meta?", async () => {
      await remover(`${CAMINHOS.metas()}/${id}`);
      Alerts.sucesso("Meta removida.");
      this._renderAba("metas");
    });
  },

  // ---- ABA: RELATÓRIOS ----
  async _renderRelatorios(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">Relatórios</span></div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:1.5rem">
          <div class="form-group" style="min-width:160px;margin:0">
            <label class="form-label">Mês/Ano</label>
            <input type="month" id="rel-mes" class="filter-input" value="${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}">
          </div>
          <button class="btn btn-primary" id="btn-gerar-relatorio">
            <i data-lucide="file-text" width="16" height="16" aria-hidden="true"></i> Gerar Relatório
          </button>
        </div>
        <div id="rel-resultado"></div>
      </div>
    `;
    lucide.createIcons({ nodes: [container] });

    container
      .querySelector("#btn-gerar-relatorio")
      ?.addEventListener("click", async () => {
        const mesInput = document.getElementById("rel-mes")?.value;
        if (!mesInput) return;
        const [ano, mes] = mesInput.split("-").map(Number);
        const { inicio, fim } = intervaloMes(ano, mes);
        const resultEl = document.getElementById("rel-resultado");
        resultEl.innerHTML =
          '<div class="loading-wrapper"><div class="spinner"></div>Gerando...</div>';
        const [honorarios, cirurgias, recepcao] = await Promise.all([
          buscarIntervalo("honorarios", inicio, fim),
          buscarIntervalo("cirurgias", inicio, fim),
          buscarIntervalo("recepcao", inicio, fim),
        ]);
        const lancados = honorarios.filter((r) => r.lancado);
        const totalHon = lancados.reduce(
          (s, r) =>
            s +
            (r.honorario_cirurgiao_pf || 0) +
            (r.lio_parte_cirurgiao || 0) +
            (r.honorario_auxiliar_pf || 0) +
            (r.honorario_instrumentador_pf || 0),
          0,
        );
        const totalClinica = lancados.reduce(
          (s, r) =>
            s + (r.valor_clinica_cnpj || 0) + (r.lio_parte_clinica || 0),
          0,
        );
        const totalAtend = recepcao.length;
        resultEl.innerHTML = `
        <div class="cards-grid">
          <div class="card"><div class="card-metric"><span class="metric-label">Atendimentos</span><span class="metric-value">${totalAtend}</span></div></div>
          <div class="card"><div class="card-metric"><span class="metric-label">Cirurgias</span><span class="metric-value">${cirurgias.length}</span></div></div>
          <div class="card"><div class="card-metric"><span class="metric-label">Honorários PF Total</span><span class="metric-value">${formatarMoeda(totalHon)}</span></div></div>
          <div class="card"><div class="card-metric"><span class="metric-label">Clínica CNPJ Total</span><span class="metric-value">${formatarMoeda(totalClinica)}</span></div></div>
        </div>
      `;
      });
  },
};
