// ================================================================
// patrimonio.js — Módulo Patrimônio / Contratos / Vencimentos
// ================================================================

window.Modules = window.Modules || {};

window.Modules.patrimonio = {
  _cancelarEscuta: null,
  _todos: [],
  _pagina: 1,
  _porPagina: 20,

  CATEGORIAS: [
    "Equipamentos de Segurança",
    "Equipamentos Oftalmológicos",
    "Contratos",
    "Licenças de Software",
    "Seguros",
    "Outros",
  ],

  render(container) {
    if (!exigirPermissao("patrimonio", container)) return;

    container.innerHTML = `
      <div class="page-content">
        <div class="module-header">
          <h1 class="module-title">
            <i data-lucide="package" width="24" height="24" aria-hidden="true"></i>
            Patrimônio
          </h1>
          <p class="module-subtitle">Controle de equipamentos, contratos e vencimentos</p>
        </div>

        <!-- Formulário -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="card-title" id="pat-form-titulo">Novo Item</span>
          </div>
          <form id="form-patrimonio" novalidate>
            <input type="hidden" id="pat-id">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label required" for="pat-nome">Descrição do Item</label>
                <input type="text" id="pat-nome" class="form-input" required maxlength="120" placeholder="Ex: Microscópio Zeiss">
              </div>
              <div class="form-group">
                <label class="form-label required" for="pat-categoria">Categoria</label>
                <select id="pat-categoria" class="form-select" required>
                  <option value="">Selecione...</option>
                  ${this.CATEGORIAS.map((c) => `<option value="${c}">${c}</option>`).join("")}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="pat-fornecedor">Fornecedor</label>
                <input type="text" id="pat-fornecedor" class="form-input" maxlength="100" placeholder="Nome do fornecedor">
              </div>
              <div class="form-group">
                <label class="form-label required" for="pat-vencimento">Data de Vencimento</label>
                <input type="date" id="pat-vencimento" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="pat-valor">Valor (R$)</label>
                <input type="number" id="pat-valor" class="form-input" min="0" step="0.01" placeholder="0,00">
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label" for="pat-obs">Observações</label>
                <textarea id="pat-obs" class="form-input form-textarea" rows="2" maxlength="400" placeholder="Informações adicionais..."></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" id="pat-btn-cancelar" style="display:none">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                <i data-lucide="save" width="16" height="16" aria-hidden="true"></i>
                Salvar Item
              </button>
            </div>
          </form>
        </div>

        <!-- Filtros -->
        <div class="filter-bar mb-2">
          <input type="text" id="pat-busca" class="filter-input" placeholder="Buscar por descrição ou fornecedor…" aria-label="Buscar patrimônio">
          <select id="pat-filtro-cat" class="filter-input" aria-label="Filtrar por categoria">
            <option value="">Todas as categorias</option>
            ${this.CATEGORIAS.map((c) => `<option value="${c}">${c}</option>`).join("")}
          </select>
          <select id="pat-filtro-status" class="filter-input" aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            <option value="vencido">Vencido</option>
            <option value="breve">Vence em breve</option>
            <option value="regular">Regular</option>
          </select>
        </div>

        <!-- Tabela -->
        <div class="table-container">
          <div class="table-toolbar">
            <span class="table-toolbar-title">Itens Cadastrados</span>
            <div class="table-actions" id="pat-acoes-tabela"></div>
          </div>
          <div class="table-scroll table-mobile-cards">
            <table class="data-table" id="tabela-patrimonio" aria-label="Itens de patrimônio">
              <thead>
                <tr>
                  <th scope="col">Descrição</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Fornecedor</th>
                  <th scope="col">Vencimento</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody id="tbody-patrimonio">
                <tr><td colspan="7"><div class="loading-wrapper"><div class="spinner"></div>Carregando...</div></td></tr>
              </tbody>
            </table>
          </div>
          <div id="pat-paginacao" class="pagination-bar"></div>
        </div>
      </div>
    `;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    const acoes = container.querySelector("#pat-acoes-tabela");
    if (acoes)
      acoes.appendChild(
        criarBotaoExportar("tabela-patrimonio", "Patrimônio", "patrimonio"),
      );
  },

  _iniciarEscuta() {
    if (this._cancelarEscuta) {
      this._cancelarEscuta();
      this._cancelarEscuta = null;
    }
    const caminho = `${CAMINHOS.base}/patrimonio`;
    const cancel = escutar(caminho, (snapshot) => {
      if (!snapshot) {
        this._todos = [];
      } else {
        this._todos = Object.entries(snapshot).map(([k, v]) => ({
          _id: k,
          ...v,
        }));
        this._todos.sort((a, b) =>
          (a.data_vencimento || "").localeCompare(b.data_vencimento || ""),
        );
      }
      this._pagina = 1;
      this._renderTabela();
    });
    this._cancelarEscuta = cancel;
    registrarListener(() => {
      if (this._cancelarEscuta) this._cancelarEscuta();
    });
  },

  _filtrar() {
    const busca = (
      document.getElementById("pat-busca")?.value || ""
    ).toLowerCase();
    const cat = document.getElementById("pat-filtro-cat")?.value || "";
    const status = document.getElementById("pat-filtro-status")?.value || "";

    return this._todos.filter((r) => {
      const matchBusca =
        !busca ||
        r.nome?.toLowerCase().includes(busca) ||
        r.fornecedor?.toLowerCase().includes(busca);
      const matchCat = !cat || r.categoria === cat;
      const matchStatus =
        !status || this._calcStatus(r.data_vencimento) === status;
      return matchBusca && matchCat && matchStatus;
    });
  },

  _calcStatus(dataStr) {
    if (!dataStr) return "regular";
    const dias = diasAteVencer(dataStr);
    if (dias < 0) return "vencido";
    if (dias <= 30) return "breve";
    return "regular";
  },

  _statusBadge(dataStr) {
    const s = this._calcStatus(dataStr);
    const dias = diasAteVencer(dataStr);
    const labels = {
      vencido: "Vencido",
      breve: "Vence em breve",
      regular: "Regular",
    };
    const classes = {
      vencido: "badge-danger",
      breve: "badge-warning",
      regular: "badge-success",
    };
    const extra =
      s === "breve"
        ? ` (${dias}d)`
        : s === "vencido"
          ? ` (${Math.abs(dias)}d)`
          : "";
    return `<span class="badge ${classes[s]}">${labels[s]}${extra}</span>`;
  },

  _renderTabela() {
    const tbody = document.getElementById("tbody-patrimonio");
    if (!tbody) return;
    const filtrados = this._filtrar();
    const inicio = (this._pagina - 1) * this._porPagina;
    const pagina = filtrados.slice(inicio, inicio + this._porPagina);

    if (pagina.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="7">
        <div class="table-empty">
          <i data-lucide="package" width="40" height="40" aria-hidden="true"></i>
          <p>Nenhum item encontrado.</p>
        </div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
    } else {
      tbody.innerHTML = pagina
        .map(
          (r) => `
        <tr>
          <td data-label="Descrição"><strong>${r.nome || "—"}</strong></td>
          <td data-label="Categoria">${r.categoria || "—"}</td>
          <td data-label="Fornecedor">${r.fornecedor || "—"}</td>
          <td data-label="Vencimento">${r.data_vencimento || "—"}</td>
          <td data-label="Valor" class="table-number">${r.valor > 0 ? formatarMoeda(r.valor) : "—"}</td>
          <td data-label="Status">${this._statusBadge(r.data_vencimento)}</td>
          <td data-label="Ações">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.patrimonio._editar('${r._id}')" aria-label="Editar">
              <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm btn-danger" onclick="Modules.patrimonio._remover('${r._id}')" aria-label="Remover">
              <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
            </button>
          </td>
        </tr>
      `,
        )
        .join("");
      lucide.createIcons({ nodes: [tbody] });
    }

    // Paginação
    const paginacao = document.getElementById("pat-paginacao");
    if (paginacao) {
      const totalPag = Math.ceil(filtrados.length / this._porPagina);
      paginacao.innerHTML =
        totalPag > 1
          ? `
        <button class="pagination-btn" onclick="Modules.patrimonio._irPagina(${this._pagina - 1})" ${this._pagina === 1 ? "disabled" : ""}>Anterior</button>
        <span class="pagination-info">${this._pagina} / ${totalPag}</span>
        <button class="pagination-btn" onclick="Modules.patrimonio._irPagina(${this._pagina + 1})" ${this._pagina === totalPag ? "disabled" : ""}>Próxima</button>
      `
          : "";
    }
  },

  _irPagina(p) {
    const filtrados = this._filtrar();
    const totalPag = Math.ceil(filtrados.length / this._porPagina);
    if (p < 1 || p > totalPag) return;
    this._pagina = p;
    this._renderTabela();
  },

  _editar(id) {
    const r = this._todos.find((x) => x._id === id);
    if (!r) return;
    document.getElementById("pat-id").value = id;
    document.getElementById("pat-nome").value = r.nome || "";
    document.getElementById("pat-categoria").value = r.categoria || "";
    document.getElementById("pat-fornecedor").value = r.fornecedor || "";
    document.getElementById("pat-vencimento").value = r.data_vencimento || "";
    document.getElementById("pat-valor").value = r.valor || 0;
    document.getElementById("pat-obs").value = r.observacoes || "";
    document.getElementById("pat-form-titulo").textContent = "Editar Item";
    document.getElementById("pat-btn-cancelar").style.display = "";
    document.getElementById("pat-nome").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  _cancelarEdicao() {
    document.getElementById("form-patrimonio").reset();
    document.getElementById("pat-id").value = "";
    document.getElementById("pat-form-titulo").textContent = "Novo Item";
    document.getElementById("pat-btn-cancelar").style.display = "none";
  },

  _remover(id) {
    Modal.confirmar(
      "Remover este item do patrimônio permanentemente?",
      async () => {
        try {
          await remover(`${CAMINHOS.base}/patrimonio/${id}`);
          await registrarAuditoria("remover", "patrimonio", id);
          Alerts.sucesso("Item removido.");
        } catch (err) {
          Alerts.erro("Erro ao remover item.");
        }
      },
      "Confirmar Remoção",
    );
  },

  _bindEventos(container) {
    container
      .querySelector("#form-patrimonio")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("pat-id").value;
        const dados = {
          nome: document.getElementById("pat-nome").value.trim(),
          categoria: document.getElementById("pat-categoria").value,
          fornecedor: document.getElementById("pat-fornecedor").value.trim(),
          data_vencimento: document.getElementById("pat-vencimento").value,
          valor: parseFloat(document.getElementById("pat-valor").value) || 0,
          observacoes: document.getElementById("pat-obs").value.trim(),
        };
        if (!dados.nome || !dados.categoria || !dados.data_vencimento) {
          Alerts.aviso("Preencha os campos obrigatórios.");
          return;
        }
        try {
          if (id) {
            await atualizar(`${CAMINHOS.base}/patrimonio/${id}`, dados);
            await registrarAuditoria("atualizar", "patrimonio", id);
            Alerts.sucesso("Item atualizado!");
          } else {
            const novoId = await criar(`${CAMINHOS.base}/patrimonio`, dados);
            await registrarAuditoria("criar", "patrimonio", novoId);
            Alerts.sucesso("Item cadastrado!");
          }
          this._cancelarEdicao();
        } catch (err) {
          console.error("[patrimonio] salvar:", err);
          Alerts.erro("Erro ao salvar item.");
        }
      });

    container
      .querySelector("#pat-btn-cancelar")
      ?.addEventListener("click", () => this._cancelarEdicao());

    ["pat-busca", "pat-filtro-cat", "pat-filtro-status"].forEach((fid) => {
      container.querySelector(`#${fid}`)?.addEventListener("input", () => {
        this._pagina = 1;
        this._renderTabela();
      });
    });
  },
};
