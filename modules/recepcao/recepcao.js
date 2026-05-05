// ================================================================
// modules/recepcao/recepcao.js — Módulo Recepção
// ================================================================

window.Modules = window.Modules || {};

window.Modules.recepcao = {
  _cancelarEscuta: null,
  _registrosBrutos: {}, // ALTERAÇÃO 1: todos os registros sem filtro de médico
  _medicoSelecionado: "todos", // ALTERAÇÃO 1: filtro de médico ativo
  _usuariosMap: {}, // ALTERAÇÃO 1: cache do mapa de nomes de usuário
  _dataSelecionada: hoje(),

  mount(container) {
    if (!exigirPermissao("recepcao", container)) return;

    // Revelar colunas admin-only
    if (isAdmin()) {
      container.querySelectorAll(".admin-only").forEach((el) => {
        el.hidden = false;
      });
      // ALTERAÇÃO 1: exibir dropdown de médico somente para admin
      const filtroMedico = container.querySelector("#filtro-medico-recepcao");
      if (filtroMedico) filtroMedico.style.display = "flex";
    }

    // Definir data atual no seletor
    const inputData = container.querySelector("#data-recepcao");
    if (inputData) inputData.value = this._dataSelecionada;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    // Botão exportar
    const acoes = container.querySelector("#acoes-tabela-rec");
    if (acoes) {
      acoes.appendChild(
        criarBotaoExportar(
          "tabela-recepcao",
          "Atendimentos — Recepção",
          "recepcao",
        ),
      );
    }
  },

  _atualizarCards(registros) {
    let base = 0,
      indicacao = 0,
      lead = 0,
      geral = 0;
    let nBase = 0,
      nInd = 0,
      nLead = 0,
      nGeral = 0;

    Object.values(registros).forEach((r) => {
      const v = parseFloat(r.valor) || 0;
      geral += v;
      nGeral++;
      switch (r.origem) {
        case "Base":
        case "Convênio":
          base += v;
          nBase++;
          break;
        case "Indicação":
          indicacao += v;
          nInd++;
          break;
        case "Lead":
          lead += v;
          nLead++;
          break;
      }
    });

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set("val-base", formatarMoeda(base));
    set("val-ind", formatarMoeda(indicacao));
    set("val-lead", formatarMoeda(lead));
    set("val-geral", formatarMoeda(geral));
    set("meta-base", `${nBase} paciente${nBase !== 1 ? "s" : ""}`);
    set("meta-ind", `${nInd} paciente${nInd !== 1 ? "s" : ""}`);
    set("meta-lead", `${nLead} paciente${nLead !== 1 ? "s" : ""}`);
    set("meta-geral", `${nGeral} paciente${nGeral !== 1 ? "s" : ""}`);
  },

  // ALTERAÇÃO 1: aplica filtro de médico sobre os registros brutos e re-renderiza
  _aplicarFiltros() {
    let registros = { ...this._registrosBrutos };

    // Filtrar por médico somente para admin (não-admin já vê apenas os próprios)
    if (isAdmin() && this._medicoSelecionado !== "todos") {
      const filtrado = {};
      Object.entries(registros).forEach(([id, r]) => {
        if (r.medico === this._medicoSelecionado) filtrado[id] = r;
      });
      registros = filtrado;
    }

    this._atualizarCards(registros);
    this._renderTabela(registros, this._usuariosMap);
  },

  _badgeOrigem(origem) {
    const mapa = {
      Base: "badge-base",
      Convênio: "badge-convenio",
      Indicação: "badge-indicacao",
      Lead: "badge-lead",
    };
    return `<span class="badge ${mapa[origem] || "badge-neutral"}">${origem || "—"}</span>`;
  },

  _renderTabela(registros, usuariosMap) {
    const tbody = document.getElementById("tbody-recepcao");
    if (!tbody) return;

    const lista = Object.entries(registros);
    if (lista.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="table-empty">
            <i data-lucide="clipboard" width="40" height="40" aria-hidden="true"></i>
            <p>Nenhum atendimento registrado nesta data.</p>
          </div>
        </td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      return;
    }

    tbody.innerHTML = lista
      .map(
        ([id, r], idx) => `
        <tr>
          <td data-label="#">${idx + 1}</td>
          <td data-label="Paciente">${r.nome || "—"}</td>
          <td data-label="Médico">${r.medico || "—"}</td>
          <td data-label="Tipo">${r.tipo_atendimento || "—"}</td>
          <td data-label="Origem">${this._badgeOrigem(r.origem)}</td>
          <td data-label="Valor" class="table-number">${formatarMoeda(r.valor)}</td>
          ${isAdmin() ? `<td data-label="Registrado por">${usuariosMap[r.registrado_por] || r.registrado_por || "—"}</td>` : ""}
          <td data-label="Ações">
            <div style="display:flex;gap:.25rem">
              ${
                isAdmin() || r.registrado_por === window.AppState.uid
                  ? `<button class="btn btn-ghost btn-icon btn-sm"
                          onclick="Modules.recepcao._editarRegistro('${id}')"
                          aria-label="Editar ${(r.nome || "").replace(/"/g, "")}">
                    <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
                  </button>
                  <button class="btn btn-ghost btn-icon btn-sm text-danger"
                          onclick="Modules.recepcao._excluirRegistro('${id}','${(r.nome || "").replace(/'/g, "\\'")}')"
                          aria-label="Excluir ${(r.nome || "").replace(/"/g, "")}">
                    <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
                  </button>`
                  : "—"
              }
            </div>
          </td>
        </tr>`,
      )
      .join("");

    lucide.createIcons({ nodes: [tbody] });
  },

  _iniciarEscuta() {
    if (this._cancelarEscuta) this._cancelarEscuta();

    const caminho = caminhoData("pacientes", this._dataSelecionada);
    this._cancelarEscuta = escutar(caminho, async (dados) => {
      // ALTERAÇÃO 1: armazena registros brutos (sem filtro de médico)
      this._registrosBrutos = filtrarPorUsuario(dados || {});

      // Carregar mapa de usuários apenas para admin
      if (isAdmin()) {
        const usersSnap = await lerUmaVez("usuarios");
        this._usuariosMap = {};
        if (usersSnap) {
          Object.entries(usersSnap).forEach(([uid, u]) => {
            this._usuariosMap[uid] = u.nome || uid;
          });
        }
      }

      // ALTERAÇÃO 1: aplica filtros (data + médico) antes de renderizar
      this._aplicarFiltros();
    });
    registrarListener(this._cancelarEscuta);
  },

  _bindEventos(container) {
    container
      .querySelector("#data-recepcao")
      ?.addEventListener("change", (e) => {
        this._dataSelecionada = e.target.value;
        this._iniciarEscuta();
      });

    // ALTERAÇÃO 1: filtro de médico — reaplica filtros sem re-escutar Firebase
    container
      .querySelector("#select-medico-recepcao")
      ?.addEventListener("change", (e) => {
        this._medicoSelecionado = e.target.value;
        this._aplicarFiltros();
      });

    container.querySelector("#rec-origem")?.addEventListener("change", (e) => {
      const grp = document.getElementById("grupo-convenio");
      if (grp) grp.style.display = e.target.value === "Convênio" ? "" : "none";
    });

    container
      .querySelector("#form-recepcao")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this._salvarRegistro();
      });
  },

  async _salvarRegistro() {
    const nome = document.getElementById("rec-paciente")?.value.trim();
    const medico = document.getElementById("rec-medico")?.value;
    const tipo = document.getElementById("rec-tipo")?.value;
    const origem = document.getElementById("rec-origem")?.value;
    const conv = document.getElementById("rec-convenio")?.value;
    // CORRIGIDO: usa getValorNumerico para ler campo formatado como moeda
    const valor = getValorNumerico(document.getElementById("rec-valor"));
    const editId = document.getElementById("rec-edit-id")?.value;

    if (!nome || !medico || !tipo || !origem) {
      Alerts.aviso("Preencha todos os campos obrigatórios.");
      return;
    }

    const btn = document.getElementById("btn-salvar-recepcao");
    const txt = document.getElementById("btn-salvar-txt");
    if (btn) btn.disabled = true;
    if (txt) txt.textContent = "Salvando...";

    try {
      const dados = {
        nome,
        medico,
        tipo_atendimento: tipo,
        origem,
        convenio: conv || "",
        valor,
      };
      const caminho = caminhoData("pacientes", this._dataSelecionada);

      if (editId) {
        // ALTERAÇÃO 1: usa _registrosBrutos para obter estado anterior
        const anterior = this._registrosBrutos[editId];
        await atualizar(`${caminho}/${editId}`, dados);
        await registrarAuditoria("editar", "recepcao", editId, anterior);
        Alerts.sucesso("Atendimento atualizado!");
        document.getElementById("rec-edit-id").value = "";
        if (txt) txt.textContent = "Salvar Atendimento";
      } else {
        const id = await criar(caminho, dados);
        await registrarAuditoria("criar", "recepcao", id, null);
        Alerts.sucesso("Atendimento registrado!");
        if (txt) txt.textContent = "Salvar Atendimento";
      }

      document.getElementById("form-recepcao")?.reset();
      document.getElementById("grupo-convenio").style.display = "none";
    } catch (err) {
      console.error("[recepcao] salvar:", err);
      Alerts.erro("Erro ao salvar atendimento.");
    } finally {
      if (btn) btn.disabled = false;
      // Garante que o texto volta ao padrão mesmo em caso de erro
      if (txt && !document.getElementById("rec-edit-id")?.value) {
        txt.textContent = "Salvar Atendimento";
      }
    }
  },

  _editarRegistro(id) {
    // ALTERAÇÃO 1: usa _registrosBrutos para acessar qualquer registro (independente do filtro)
    const r = this._registrosBrutos[id];
    if (!r) return;
    document.getElementById("rec-paciente").value = r.nome || "";
    document.getElementById("rec-medico").value = r.medico || "";
    document.getElementById("rec-tipo").value = r.tipo_atendimento || "";
    document.getElementById("rec-origem").value = r.origem || "";
    // CORRIGIDO: usa setValorMoeda para preencher campo formatado
    setValorMoeda(document.getElementById("rec-valor"), r.valor || 0);
    document.getElementById("rec-edit-id").value = id;

    const grpConv = document.getElementById("grupo-convenio");
    if (r.origem === "Convênio") {
      grpConv.style.display = "";
      document.getElementById("rec-convenio").value = r.convenio || "";
    } else {
      grpConv.style.display = "none";
    }
    const txt = document.getElementById("btn-salvar-txt");
    if (txt) txt.textContent = "Atualizar Atendimento";
    document.getElementById("rec-paciente")?.focus();
  },

  _excluirRegistro(id, nome) {
    Modal.confirmar(
      `Deseja excluir o atendimento de <strong>${nome}</strong>? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          // ALTERAÇÃO 1: usa _registrosBrutos para obter estado anterior na exclusão
          const anterior = this._registrosBrutos[id];
          const caminho = caminhoData("pacientes", this._dataSelecionada);
          await remover(`${caminho}/${id}`);
          await registrarAuditoria("excluir", "recepcao", id, anterior);
          Alerts.sucesso("Atendimento excluído.");
        } catch {
          Alerts.erro("Erro ao excluir atendimento.");
        }
      },
      "Excluir Atendimento",
    );
  },
};
