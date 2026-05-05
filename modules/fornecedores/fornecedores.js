// ================================================================
// fornecedores.js — Módulo Fornecedores
// ================================================================

window.Modules = window.Modules || {};

window.Modules.fornecedores = {
  _cancelarEscuta: null,
  _todos: [],
  _pagina: 1,
  _porPagina: 20,
  _debounceTimer: null,

  mount(container) {
    if (!exigirPermissao("fornecedores", container)) return;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    const acoes = container.querySelector("#forn-acoes-tabela");
    if (acoes)
      acoes.appendChild(
        criarBotaoExportar(
          "tabela-fornecedores",
          "Fornecedores",
          "fornecedores",
        ),
      );
  },

  _iniciarEscuta() {
    if (this._cancelarEscuta) {
      this._cancelarEscuta();
      this._cancelarEscuta = null;
    }
    const caminho = `${CAMINHOS.base}/fornecedores`;
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

  _filtrar() {
    const busca = (
      document.getElementById("forn-busca")?.value || ""
    ).toLowerCase();
    const cat = document.getElementById("forn-filtro-cat")?.value || "";
    return this._todos.filter((r) => {
      const mb =
        !busca ||
        r.nome?.toLowerCase().includes(busca) ||
        r.cnpj?.includes(busca) ||
        r.categoria?.toLowerCase().includes(busca);
      const mc = !cat || r.categoria === cat;
      return mb && mc;
    });
  },

  _renderTabela() {
    const tbody = document.getElementById("tbody-fornecedores");
    if (!tbody) return;
    const filtrados = this._filtrar();
    const inicio = (this._pagina - 1) * this._porPagina;
    const pagina = filtrados.slice(inicio, inicio + this._porPagina);

    if (pagina.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="6">
        <div class="table-empty">
          <i data-lucide="truck" width="40" height="40" aria-hidden="true"></i>
          <p>Nenhum fornecedor encontrado.</p>
        </div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      return;
    }

    tbody.innerHTML = pagina
      .map(
        (r) => `
      <tr>
        <td data-label="Nome"><strong>${r.nome || "—"}</strong></td>
        <td data-label="CNPJ"><code>${r.cnpj || "—"}</code></td>
        <td data-label="Categoria"><span class="badge badge-info">${r.categoria || "—"}</span></td>
        <td data-label="Contato">${r.contato || "—"}</td>
        <td data-label="Telefone">${r.telefone || "—"}</td>
        <td data-label="Ações">
          <button class="btn btn-ghost btn-sm" onclick="Modules.fornecedores._verDetalhes('${r._id}')" aria-label="Ver detalhes">
            <i data-lucide="eye" width="14" height="14" aria-hidden="true"></i> Detalhes
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.fornecedores._editar('${r._id}')" aria-label="Editar">
            <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm btn-danger" onclick="Modules.fornecedores._remover('${r._id}')" aria-label="Remover">
            <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
    lucide.createIcons({ nodes: [tbody] });

    const pag = document.getElementById("forn-paginacao");
    if (pag) {
      const total = Math.ceil(filtrados.length / this._porPagina);
      pag.innerHTML =
        total > 1
          ? `
        <button class="pagination-btn" onclick="Modules.fornecedores._irPagina(${this._pagina - 1})" ${this._pagina === 1 ? "disabled" : ""}>Anterior</button>
        <span class="pagination-info">${this._pagina} / ${total}</span>
        <button class="pagination-btn" onclick="Modules.fornecedores._irPagina(${this._pagina + 1})" ${this._pagina === total ? "disabled" : ""}>Próxima</button>
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

  _verDetalhes(id) {
    const r = this._todos.find((x) => x._id === id);
    if (!r) return;
    Modal.abrirModal({
      titulo: r.nome,
      icone: "truck",
      corpo: `
        <dl style="display:grid;grid-template-columns:auto 1fr;gap:.5rem 1rem;font-size:.875rem">
          <dt class="text-muted">CNPJ</dt><dd>${r.cnpj || "—"}</dd>
          <dt class="text-muted">Categoria</dt><dd>${r.categoria || "—"}</dd>
          <dt class="text-muted">Contato</dt><dd>${r.contato || "—"}</dd>
          <dt class="text-muted">Telefone</dt><dd>${r.telefone || "—"}</dd>
          <dt class="text-muted">E-mail</dt><dd>${r.email ? `<a href="mailto:${r.email}">${r.email}</a>` : "—"}</dd>
          ${r.observacoes ? `<dt class="text-muted">Obs.</dt><dd>${r.observacoes}</dd>` : ""}
        </dl>
      `,
      botoes: [
        {
          label: "Fechar",
          classe: "btn-secondary",
          onClick: () => Modal.fecharModal(),
        },
      ],
    });
  },

  _editar(id) {
    const r = this._todos.find((x) => x._id === id);
    if (!r) return;
    document.getElementById("forn-id").value = id;
    document.getElementById("forn-nome").value = r.nome || "";
    document.getElementById("forn-cnpj").value = r.cnpj || "";
    document.getElementById("forn-categoria").value = r.categoria || "";
    document.getElementById("forn-contato").value = r.contato || "";
    document.getElementById("forn-telefone").value = r.telefone || "";
    document.getElementById("forn-email").value = r.email || "";
    document.getElementById("forn-obs").value = r.observacoes || "";
    document.getElementById("forn-form-titulo").textContent =
      "Editar Fornecedor";
    document.getElementById("forn-btn-cancelar").style.display = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  _cancelarEdicao() {
    document.getElementById("form-fornecedores").reset();
    document.getElementById("forn-id").value = "";
    document.getElementById("forn-form-titulo").textContent = "Novo Fornecedor";
    document.getElementById("forn-btn-cancelar").style.display = "none";
  },

  _remover(id) {
    Modal.confirmar(
      "Remover este fornecedor permanentemente?",
      async () => {
        try {
          await remover(`${CAMINHOS.base}/fornecedores/${id}`);
          await registrarAuditoria("remover", "fornecedores", id);
          Alerts.sucesso("Fornecedor removido.");
        } catch (err) {
          Alerts.erro("Erro ao remover fornecedor.");
        }
      },
      "Confirmar Remoção",
    );
  },

  _aplicarMascaraCNPJ(value) {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
      .slice(0, 18);
  },

  _bindEventos(container) {
    container.querySelector("#forn-cnpj")?.addEventListener("input", (e) => {
      e.target.value = this._aplicarMascaraCNPJ(e.target.value);
    });

    container.querySelector("#forn-busca")?.addEventListener("input", () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._pagina = 1;
        this._renderTabela();
      }, 300);
    });

    container
      .querySelector("#forn-filtro-cat")
      ?.addEventListener("change", () => {
        this._pagina = 1;
        this._renderTabela();
      });

    container
      .querySelector("#forn-btn-cancelar")
      ?.addEventListener("click", () => this._cancelarEdicao());

    container
      .querySelector("#form-fornecedores")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("forn-id").value;
        const dados = {
          nome: document.getElementById("forn-nome").value.trim(),
          cnpj: document.getElementById("forn-cnpj").value.trim(),
          categoria: document.getElementById("forn-categoria").value,
          contato: document.getElementById("forn-contato").value.trim(),
          telefone: document.getElementById("forn-telefone").value.trim(),
          email: document.getElementById("forn-email").value.trim(),
          observacoes: document.getElementById("forn-obs").value.trim(),
        };
        if (!dados.nome || !dados.categoria) {
          Alerts.aviso("Preencha os campos obrigatórios.");
          return;
        }
        try {
          if (id) {
            await atualizar(`${CAMINHOS.base}/fornecedores/${id}`, dados);
            await registrarAuditoria("atualizar", "fornecedores", id);
            Alerts.sucesso("Fornecedor atualizado!");
          } else {
            const nid = await criar(`${CAMINHOS.base}/fornecedores`, dados);
            await registrarAuditoria("criar", "fornecedores", nid);
            Alerts.sucesso("Fornecedor cadastrado!");
          }
          this._cancelarEdicao();
        } catch (err) {
          Alerts.erro("Erro ao salvar fornecedor.");
        }
      });
  },
};
