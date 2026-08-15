// ================================================================
// pacientes.js — Módulo Lista de Pacientes (busca por nome/CPF)
// ================================================================

window.Modules = window.Modules || {};

window.Modules.pacientes = {
  _cancelarEscuta: null,
  _todos: [],
  _limiteResultados: 200,

  mount(container) {
    if (!exigirPermissao("recepcao", container)) return;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();
  },

  _iniciarEscuta() {
    if (this._cancelarEscuta) {
      this._cancelarEscuta();
      this._cancelarEscuta = null;
    }
    const cancel = escutar(
      CAMINHOS.pacientesCadastro(),
      (snapshot) => {
        this._todos = snapshot
          ? Object.entries(snapshot).map(([k, v]) => ({ _id: k, ...v }))
          : [];
        this._renderResultados();
      },
      (err) => {
        const tbody = document.getElementById("tbody-pacientes");
        if (!tbody) return;
        tbody.innerHTML = `<tr class="table-empty-row"><td colspan="4">
          <div class="table-empty">
            <i data-lucide="alert-triangle" width="40" height="40" aria-hidden="true"></i>
            <p>Erro ao carregar a lista de pacientes (${err.code || "falha de permissão"}). Avise o administrador.</p>
          </div></td></tr>`;
        lucide.createIcons({ nodes: [tbody] });
      },
    );
    this._cancelarEscuta = cancel;
    registrarListener(() => {
      if (this._cancelarEscuta) this._cancelarEscuta();
    });
  },

  _normalizar(str) {
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  },

  _somenteDigitos(str) {
    return (str || "").toString().replace(/\D/g, "");
  },

  _formatarCpf(cpf) {
    const d = this._somenteDigitos(cpf);
    if (d.length !== 11) return cpf || "—";
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  },

  _filtrar(termo) {
    const termoNorm = this._normalizar(termo);
    const termoDigitos = this._somenteDigitos(termo);
    const buscaPorCpf = termoDigitos.length >= 3;
    return this._todos.filter((p) => {
      if (buscaPorCpf && this._somenteDigitos(p.cpf).includes(termoDigitos)) {
        return true;
      }
      return this._normalizar(p.nome).includes(termoNorm);
    });
  },

  _renderResultados() {
    const tbody = document.getElementById("tbody-pacientes");
    const statusEl = document.getElementById("pac-status");
    if (!tbody) return;

    const termo = (document.getElementById("pac-busca")?.value || "").trim();

    if (termo.length < 2) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="4">
        <div class="table-empty">
          <i data-lucide="search" width="40" height="40" aria-hidden="true"></i>
          <p>Digite ao menos 2 letras do nome, ou o CPF, para buscar.</p>
        </div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      if (statusEl) {
        statusEl.textContent = `${this._todos.length.toLocaleString("pt-BR")} pacientes na base.`;
      }
      return;
    }

    const encontrados = this._filtrar(termo);
    const exibidos = encontrados.slice(0, this._limiteResultados);

    if (statusEl) {
      statusEl.textContent =
        encontrados.length > this._limiteResultados
          ? `Mostrando ${this._limiteResultados} de ${encontrados.length} resultados — refine a busca para ver os demais.`
          : `${encontrados.length} resultado${encontrados.length === 1 ? "" : "s"}.`;
    }

    if (exibidos.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="4">
        <div class="table-empty">
          <i data-lucide="user-x" width="40" height="40" aria-hidden="true"></i>
          <p>Nenhum paciente encontrado.</p>
        </div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      return;
    }

    tbody.innerHTML = exibidos
      .map(
        (p) => `
      <tr>
        <td data-label="Nº">${p._id}</td>
        <td data-label="Nome"><strong>${p.nome || "—"}</strong></td>
        <td data-label="CPF">${this._formatarCpf(p.cpf)}</td>
        <td data-label="Ações">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.pacientes._editarCpf('${p._id}')" aria-label="Editar CPF">
            <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
    lucide.createIcons({ nodes: [tbody] });
  },

  _editarCpf(id) {
    const p = this._todos.find((x) => x._id === id);
    if (!p) return;
    Modal.abrirModal({
      titulo: `CPF — ${p.nome}`,
      icone: "id-card",
      tamanho: "sm",
      corpo: `
        <div class="form-group">
          <label class="form-label" for="pac-edit-cpf">CPF</label>
          <input type="text" inputmode="numeric" id="pac-edit-cpf" class="form-input"
            maxlength="14" placeholder="000.000.000-00"
            value="${p.cpf ? this._formatarCpf(p.cpf) : ""}">
        </div>
      `,
      botoes: [
        {
          id: "pac-edit-cancelar",
          label: "Cancelar",
          classe: "btn-secondary",
          onClick: () => Modal.fecharModal(),
        },
        {
          id: "pac-edit-salvar",
          label: "Salvar",
          classe: "btn-primary",
          icone: "save",
          onClick: async () => {
            const valor =
              document.getElementById("pac-edit-cpf")?.value || "";
            const digitos = this._somenteDigitos(valor);
            if (digitos && digitos.length !== 11) {
              Alerts.aviso("CPF precisa ter 11 dígitos.");
              return;
            }
            try {
              await atualizar(CAMINHOS.pacienteCadastro(id), {
                cpf: digitos,
              });
              await registrarAuditoria("editar", "pacientes_cadastro", id, {
                nome: p.nome,
              });
              Modal.fecharModal();
              Alerts.sucesso("CPF salvo!");
            } catch (err) {
              Alerts.erro("Erro ao salvar CPF.");
            }
          },
        },
      ],
    });
  },

  _bindEventos(container) {
    container.querySelector("#pac-busca")?.addEventListener("input", () => {
      this._renderResultados();
    });
  },
};
