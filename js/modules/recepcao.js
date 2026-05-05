// ================================================================
// recepcao.js — Módulo Recepção (Registro de Atendimentos)
// ================================================================

window.Modules = window.Modules || {};

window.Modules.recepcao = {
  _cancelarEscuta: null,
  _registros: {},
  _paginaAtual: 1,
  _ultimaChave: null,
  _temMais: false,
  _dataSelecionada: hoje(),

  render(container) {
    if (!exigirPermissao("recepcao", container)) return;

    container.innerHTML = `
      <div class="page-content">
        <!-- Cabeçalho -->
        <div class="module-header">
          <h1 class="module-title">
            <i data-lucide="clipboard-list" width="24" height="24" aria-hidden="true"></i>
            Recepção
          </h1>
          <p class="module-subtitle">Registro de atendimentos do dia</p>
        </div>

        <!-- Seletor de data -->
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
          <label class="form-label" for="data-recepcao" style="margin:0">Data:</label>
          <input type="date" id="data-recepcao" class="filter-input" value="${this._dataSelecionada}" style="width:auto">
        </div>

        <!-- Cards de totais -->
        <div class="cards-grid cards-grid-4" id="cards-recepcao">
          ${this._renderCards({ base: 0, indicacao: 0, lead: 0, geral: 0, nBase: 0, nInd: 0, nLead: 0, nGeral: 0 })}
        </div>

        <!-- Layout dois painéis -->
        <div class="module-grid">
          <!-- Formulário -->
          <div>
            <div class="form-section">
              <h2 class="form-section-title">
                <i data-lucide="plus-circle" width="18" height="18" aria-hidden="true"></i>
                Novo Atendimento
              </h2>
              <form id="form-recepcao" novalidate>
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label class="form-label" for="rec-paciente">Nome do Paciente <span class="required">*</span></label>
                    <input type="text" id="rec-paciente" class="form-input" placeholder="Nome completo" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="rec-medico">Médico <span class="required">*</span></label>
                    <select id="rec-medico" class="form-select" required>
                      <option value="">Selecione...</option>
                      <option>Dra. Mariza</option>
                      <option>Dra. Fabiana</option>
                      <option>Dra. Mariana</option>
                      <option>Dr. Dante</option>
                      <option>Dr. Alberto</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="rec-tipo">Tipo de Atendimento <span class="required">*</span></label>
                    <select id="rec-tipo" class="form-select" required>
                      <option value="">Selecione...</option>
                      <option>Consulta</option>
                      <option>Retorno</option>
                      <option>Exame</option>
                      <option>Pré-operatório</option>
                      <option>Pós-operatório</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="rec-origem">Origem <span class="required">*</span></label>
                    <select id="rec-origem" class="form-select" required>
                      <option value="">Selecione...</option>
                      <option>Base</option>
                      <option>Indicação</option>
                      <option>Lead</option>
                      <option>Convênio</option>
                    </select>
                  </div>
                  <div class="form-group" id="grupo-convenio" style="display:none">
                    <label class="form-label" for="rec-convenio">Convênio</label>
                    <select id="rec-convenio" class="form-select">
                      <option value="">Selecione...</option>
                      <option>Particular</option>
                      <option>Unimed</option>
                      <option>Bradesco Saúde</option>
                      <option>SulAmérica</option>
                      <option>Amil</option>
                      <option>Outro</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="rec-valor">Valor (R$) <span class="required">*</span></label>
                    <input type="number" id="rec-valor" class="form-input" placeholder="0,00" min="0" step="0.01" required>
                  </div>
                </div>
                <div style="display:flex;gap:0.75rem;margin-top:1rem">
                  <button type="submit" class="btn btn-primary w-full" id="btn-salvar-recepcao">
                    <i data-lucide="save" width="16" height="16" aria-hidden="true"></i>
                    <span id="btn-salvar-txt">Salvar Atendimento</span>
                  </button>
                </div>
                <input type="hidden" id="rec-edit-id">
              </form>
            </div>
          </div>

          <!-- Tabela -->
          <div>
            <div class="table-container">
              <div class="table-toolbar">
                <span class="table-toolbar-title">Atendimentos do Dia</span>
                <div class="table-actions" id="acoes-tabela-rec"></div>
              </div>
              <div class="table-scroll table-mobile-cards">
                <table class="data-table" id="tabela-recepcao" aria-label="Atendimentos do dia">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Paciente</th>
                      <th scope="col">Médico</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Origem</th>
                      <th scope="col">Valor</th>
                      ${isAdmin() ? '<th scope="col">Registrado por</th>' : ""}
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-recepcao">
                    <tr><td colspan="8"><div class="loading-wrapper"><div class="spinner"></div>Carregando...</div></td></tr>
                  </tbody>
                </table>
              </div>
              <div class="pagination" id="paginacao-recepcao"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    // Adicionar botão exportar
    const acoes = container.querySelector("#acoes-tabela-rec");
    if (acoes) {
      const btnExport = criarBotaoExportar(
        "tabela-recepcao",
        "Atendimentos — Recepção",
        "recepcao",
      );
      acoes.appendChild(btnExport);
    }
  },

  _renderCards({ base, indicacao, lead, geral, nBase, nInd, nLead, nGeral }) {
    return `
      <div class="card">
        <div class="card-header">
          <span class="card-label">Total Base</span>
          <div class="card-icon icon-red"><i data-lucide="trending-up" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="val-base">${formatarMoeda(base)}</div>
        <div class="card-meta" id="meta-base">${nBase} paciente${nBase !== 1 ? "s" : ""}</div>
        <div class="card-bar bar-danger"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Total Indicações</span>
          <div class="card-icon icon-green"><i data-lucide="users" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="val-ind">${formatarMoeda(indicacao)}</div>
        <div class="card-meta" id="meta-ind">${nInd} paciente${nInd !== 1 ? "s" : ""}</div>
        <div class="card-bar bar-success"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Total Leads</span>
          <div class="card-icon icon-blue"><i data-lucide="activity" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="val-lead">${formatarMoeda(lead)}</div>
        <div class="card-meta" id="meta-lead">${nLead} paciente${nLead !== 1 ? "s" : ""}</div>
        <div class="card-bar bar-info"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Total Geral</span>
          <div class="card-icon icon-blue"><i data-lucide="dollar-sign" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="val-geral">${formatarMoeda(geral)}</div>
        <div class="card-meta" id="meta-geral">${nGeral} paciente${nGeral !== 1 ? "s" : ""}</div>
        <div class="card-bar bar-accent"></div>
      </div>
    `;
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

    // Atualizar valores nos cards sem re-renderizar tudo
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
        <tr class="table-empty-row"><td colspan="8">
          <div class="table-empty">
            <i data-lucide="clipboard" width="40" height="40" aria-hidden="true"></i>
            <p>Nenhum atendimento registrado nesta data.</p>
          </div>
        </td></tr>
      `;
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
          <div style="display:flex;gap:0.25rem">
            ${
              isAdmin() || r.registrado_por === window.AppState.uid
                ? `
              <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.recepcao._editarRegistro('${id}')" aria-label="Editar ${r.nome}">
                <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm text-danger" onclick="Modules.recepcao._excluirRegistro('${id}','${(r.nome || "").replace(/'/g, "\\'")}')" aria-label="Excluir ${r.nome}">
                <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
              </button>
            `
                : "—"
            }
          </div>
        </td>
      </tr>
    `,
      )
      .join("");

    lucide.createIcons({ nodes: [tbody] });
  },

  _iniciarEscuta() {
    if (this._cancelarEscuta) this._cancelarEscuta();

    const caminho = caminhoData("pacientes", this._dataSelecionada);
    this._cancelarEscuta = escutar(caminho, async (dados) => {
      const todos = dados || {};
      const filtrado = filtrarPorUsuario(todos);
      this._registros = filtrado;
      this._atualizarCards(filtrado);

      // Buscar nomes dos usuários para admin
      let usuariosMap = {};
      if (isAdmin()) {
        const usersSnap = await lerUmaVez("usuarios");
        if (usersSnap) {
          Object.entries(usersSnap).forEach(([uid, u]) => {
            usuariosMap[uid] = u.nome || uid;
          });
        }
      }
      this._renderTabela(filtrado, usuariosMap);
    });
    registrarListener(this._cancelarEscuta);
  },

  _bindEventos(container) {
    // Seletor de data
    container
      .querySelector("#data-recepcao")
      ?.addEventListener("change", (e) => {
        this._dataSelecionada = e.target.value;
        this._iniciarEscuta();
      });

    // Toggle do campo convênio
    container.querySelector("#rec-origem")?.addEventListener("change", (e) => {
      const grp = document.getElementById("grupo-convenio");
      if (grp) grp.style.display = e.target.value === "Convênio" ? "" : "none";
    });

    // Submissão do formulário
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
    const valor = parseFloat(document.getElementById("rec-valor")?.value || 0);
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
        const anterior = this._registros[editId];
        await atualizar(`${caminho}/${editId}`, dados);
        await registrarAuditoria("editar", "recepcao", editId, anterior);
        Alerts.sucesso("Atendimento atualizado!");
        document.getElementById("rec-edit-id").value = "";
        if (txt) txt.textContent = "Salvar Atendimento";
      } else {
        const id = await criar(caminho, dados);
        await registrarAuditoria("criar", "recepcao", id, null);
        Alerts.sucesso("Atendimento registrado!");
      }

      // Limpar formulário
      document.getElementById("form-recepcao")?.reset();
      document.getElementById("grupo-convenio").style.display = "none";
    } catch (err) {
      console.error("[recepcao] salvar:", err);
      Alerts.erro("Erro ao salvar atendimento.");
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  _editarRegistro(id) {
    const r = this._registros[id];
    if (!r) return;

    document.getElementById("rec-paciente").value = r.nome || "";
    document.getElementById("rec-medico").value = r.medico || "";
    document.getElementById("rec-tipo").value = r.tipo_atendimento || "";
    document.getElementById("rec-origem").value = r.origem || "";
    document.getElementById("rec-valor").value = r.valor || 0;
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
          const anterior = this._registros[id];
          const caminho = caminhoData("pacientes", this._dataSelecionada);
          await remover(`${caminho}/${id}`);
          await registrarAuditoria("excluir", "recepcao", id, anterior);
          Alerts.sucesso("Atendimento excluído.");
        } catch (err) {
          Alerts.erro("Erro ao excluir atendimento.");
        }
      },
      "Excluir Atendimento",
    );
  },
};
