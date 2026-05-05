// ================================================================
// estoque.js — Módulo Estoque (colírios, materiais, LIO, etc.)
// ================================================================

window.Modules = window.Modules || {};

window.Modules.estoque = {
  _cancelarEscuta: null,
  _todos: [],
  _pagina: 1,
  _porPagina: 20,

  mount(container) {
    if (!exigirPermissao("estoque", container)) return;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    const acoes = container.querySelector("#est-acoes-tabela");
    if (acoes)
      acoes.appendChild(
        criarBotaoExportar("tabela-estoque", "Estoque", "estoque"),
      );
  },

  _iniciarEscuta() {
    if (this._cancelarEscuta) {
      this._cancelarEscuta();
      this._cancelarEscuta = null;
    }
    const caminho = `${CAMINHOS.base}/estoque`;
    const cancel = escutar(caminho, (snapshot) => {
      if (!snapshot) {
        this._todos = [];
      } else {
        this._todos = Object.entries(snapshot).map(([k, v]) => ({
          _id: k,
          ...v,
        }));
        this._todos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      }
      this._pagina = 1;
      this._renderTabela();
    });
    this._cancelarEscuta = cancel;
    registrarListener(() => {
      if (this._cancelarEscuta) this._cancelarEscuta();
    });
  },

  _calcStatus(qtd, minimo) {
    if (qtd <= 0) return "critico";
    if (qtd <= minimo) return "baixo";
    return "ok";
  },

  _statusBadge(qtd, minimo) {
    const s = this._calcStatus(qtd, minimo);
    const map = {
      critico: ["badge-danger", "Crítico"],
      baixo: ["badge-warning", "Baixo"],
      ok: ["badge-success", "OK"],
    };
    return `<span class="badge ${map[s][0]}">${map[s][1]}</span>`;
  },

  _filtrar() {
    const busca = (
      document.getElementById("est-busca")?.value || ""
    ).toLowerCase();
    const cat = document.getElementById("est-filtro-cat")?.value || "";
    const status = document.getElementById("est-filtro-status")?.value || "";
    return this._todos.filter((r) => {
      const mb = !busca || r.nome?.toLowerCase().includes(busca);
      const mc = !cat || r.categoria === cat;
      const ms =
        !status ||
        this._calcStatus(r.quantidade || 0, r.estoque_minimo || 0) === status;
      return mb && mc && ms;
    });
  },

  _renderTabela() {
    const tbody = document.getElementById("tbody-estoque");
    if (!tbody) return;
    const filtrados = this._filtrar();
    const inicio = (this._pagina - 1) * this._porPagina;
    const pagina = filtrados.slice(inicio, inicio + this._porPagina);

    if (pagina.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="7">
        <div class="table-empty">
          <i data-lucide="boxes" width="40" height="40" aria-hidden="true"></i>
          <p>Nenhum item encontrado.</p>
        </div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      return;
    }

    tbody.innerHTML = pagina
      .map(
        (r) => `
      <tr>
        <td data-label="Item"><strong>${r.nome || "—"}</strong>${r.observacoes ? `<br><small class="text-muted">${r.observacoes}</small>` : ""}</td>
        <td data-label="Categoria">${r.categoria || "—"}</td>
        <td data-label="Qtd" class="table-number">${r.quantidade || 0}</td>
        <td data-label="Mínimo" class="table-number">${r.estoque_minimo || 0}</td>
        <td data-label="Unidade">${r.unidade || "un"}</td>
        <td data-label="Status">${this._statusBadge(r.quantidade || 0, r.estoque_minimo || 0)}</td>
        <td data-label="Ações">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.estoque._abrirMovimentacao('${r._id}', 'entrada')" aria-label="Entrada">
            <i data-lucide="plus-circle" width="14" height="14" aria-hidden="true"></i>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm btn-warning" onclick="Modules.estoque._abrirMovimentacao('${r._id}', 'saida')" aria-label="Saída">
            <i data-lucide="minus-circle" width="14" height="14" aria-hidden="true"></i>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.estoque._editar('${r._id}')" aria-label="Editar">
            <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm btn-danger" onclick="Modules.estoque._remover('${r._id}')" aria-label="Remover">
            <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
    lucide.createIcons({ nodes: [tbody] });

    const paginacao = document.getElementById("est-paginacao");
    if (paginacao) {
      const totalPag = Math.ceil(filtrados.length / this._porPagina);
      paginacao.innerHTML =
        totalPag > 1
          ? `
        <button class="pagination-btn" onclick="Modules.estoque._irPagina(${this._pagina - 1})" ${this._pagina === 1 ? "disabled" : ""}>Anterior</button>
        <span class="pagination-info">${this._pagina} / ${totalPag}</span>
        <button class="pagination-btn" onclick="Modules.estoque._irPagina(${this._pagina + 1})" ${this._pagina === totalPag ? "disabled" : ""}>Próxima</button>
      `
          : "";
    }
  },

  _irPagina(p) {
    const total = Math.ceil(this._filtrar().length / this._porPagina);
    if (p < 1 || p > total) return;
    this._pagina = p;
    this._renderTabela();
  },

  _abrirMovimentacao(id, tipo) {
    const item = this._todos.find((x) => x._id === id);
    if (!item) return;
    Modal.abrirModal({
      titulo: tipo === "entrada" ? "Registrar Entrada" : "Registrar Saída",
      icone: tipo === "entrada" ? "plus-circle" : "minus-circle",
      corpo: `
        <p style="margin-bottom:.75rem"><strong>${item.nome}</strong> — Atual: <strong>${item.quantidade || 0} ${item.unidade || "un"}</strong></p>
        <div class="form-group">
          <label class="form-label required" for="mov-qtd">Quantidade</label>
          <input type="number" id="mov-qtd" class="form-input" min="1" value="1" autofocus>
        </div>
        <div class="form-group">
          <label class="form-label" for="mov-obs">Observação</label>
          <input type="text" id="mov-obs" class="form-input" maxlength="200" placeholder="Motivo, fornecedor, etc.">
        </div>
      `,
      botoes: [
        {
          label: "Cancelar",
          classe: "btn-secondary",
          onClick: () => Modal.fecharModal(),
        },
        {
          label: "Confirmar",
          classe: "btn-primary",
          onClick: () => this._confirmarMovimentacao(id, tipo),
        },
      ],
    });
  },

  async _confirmarMovimentacao(id, tipo) {
    const qtdMov = parseInt(document.getElementById("mov-qtd")?.value) || 0;
    if (qtdMov <= 0) {
      Alerts.aviso("Informe uma quantidade válida.");
      return;
    }
    const obs = document.getElementById("mov-obs")?.value.trim() || "";
    const item = this._todos.find((x) => x._id === id);
    if (!item) return;

    const novaQtd =
      tipo === "entrada"
        ? (item.quantidade || 0) + qtdMov
        : Math.max(0, (item.quantidade || 0) - qtdMov);

    try {
      await atualizar(`${CAMINHOS.base}/estoque/${id}`, {
        quantidade: novaQtd,
      });
      await criar(`${CAMINHOS.base}/movimentacoes_estoque`, {
        item_id: id,
        item_nome: item.nome,
        tipo,
        quantidade: qtdMov,
        observacao: obs,
        data: hoje(),
      });
      await registrarAuditoria(`movimentacao_${tipo}`, "estoque", id);
      Modal.fecharModal();
      Alerts.sucesso(`${tipo === "entrada" ? "Entrada" : "Saída"} registrada!`);
    } catch (err) {
      Alerts.erro("Erro ao registrar movimentação.");
    }
  },

  _editar(id) {
    const r = this._todos.find((x) => x._id === id);
    if (!r) return;
    document.getElementById("est-id").value = id;
    document.getElementById("est-nome").value = r.nome || "";
    document.getElementById("est-categoria").value = r.categoria || "";
    document.getElementById("est-unidade").value = r.unidade || "";
    document.getElementById("est-qtd").value = r.quantidade || 0;
    document.getElementById("est-minimo").value = r.estoque_minimo || 0;
    document.getElementById("est-obs").value = r.observacoes || "";
    document.getElementById("est-form-titulo").textContent = "Editar Item";
    document.getElementById("est-btn-cancelar").style.display = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  _cancelarEdicao() {
    document.getElementById("form-estoque").reset();
    document.getElementById("est-id").value = "";
    document.getElementById("est-form-titulo").textContent = "Novo Item";
    document.getElementById("est-btn-cancelar").style.display = "none";
  },

  _remover(id) {
    Modal.confirmar(
      "Remover este item do estoque permanentemente?",
      async () => {
        try {
          await remover(`${CAMINHOS.base}/estoque/${id}`);
          await registrarAuditoria("remover", "estoque", id);
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
      .querySelector("#form-estoque")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("est-id").value;
        const dados = {
          nome: document.getElementById("est-nome").value.trim(),
          categoria: document.getElementById("est-categoria").value,
          unidade: document.getElementById("est-unidade").value.trim() || "un",
          quantidade: parseInt(document.getElementById("est-qtd").value) || 0,
          estoque_minimo:
            parseInt(document.getElementById("est-minimo").value) || 0,
          observacoes: document.getElementById("est-obs").value.trim(),
        };
        if (!dados.nome || !dados.categoria) {
          Alerts.aviso("Preencha os campos obrigatórios.");
          return;
        }
        try {
          if (id) {
            await atualizar(`${CAMINHOS.base}/estoque/${id}`, dados);
            await registrarAuditoria("atualizar", "estoque", id);
            Alerts.sucesso("Item atualizado!");
          } else {
            const nid = await criar(`${CAMINHOS.base}/estoque`, dados);
            await registrarAuditoria("criar", "estoque", nid);
            Alerts.sucesso("Item cadastrado!");
          }
          this._cancelarEdicao();
        } catch (err) {
          Alerts.erro("Erro ao salvar item.");
        }
      });

    container
      .querySelector("#est-btn-cancelar")
      ?.addEventListener("click", () => this._cancelarEdicao());

    ["est-busca", "est-filtro-cat", "est-filtro-status"].forEach((fid) => {
      container.querySelector(`#${fid}`)?.addEventListener("input", () => {
        this._pagina = 1;
        this._renderTabela();
      });
    });
  },
};
