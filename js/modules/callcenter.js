// ================================================================
// callcenter.js — Módulo Call Center (Reativação de Pacientes)
// ================================================================

window.Modules = window.Modules || {};

window.Modules.callcenter = {
  _cancelarEscuta: null,
  _registros: {},
  _dataSelecionada: hoje(),

  render(container) {
    if (!exigirPermissao("callcenter", container)) return;

    container.innerHTML = `
      <div class="page-content">
        <div class="module-header">
          <h1 class="module-title">
            <i data-lucide="phone-call" width="24" height="24" aria-hidden="true"></i>
            Call Center
          </h1>
          <p class="module-subtitle">Reativação de pacientes — registro de ligações</p>
        </div>

        <!-- Filtro de data -->
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
          <label class="form-label" for="data-callcenter" style="margin:0">Data:</label>
          <input type="date" id="data-callcenter" class="filter-input" value="${this._dataSelecionada}" style="width:auto">
        </div>

        <!-- Cards de controle -->
        <div class="cards-grid cards-grid-4" id="cards-cc">
          ${this._renderCards(0, 0, 0, 0)}
        </div>

        <!-- Layout dois painéis -->
        <div class="module-grid">
          <!-- Formulário -->
          <div>
            <div class="form-section">
              <h2 class="form-section-title">
                <i data-lucide="phone-outgoing" width="18" height="18" aria-hidden="true"></i>
                Nova Ativação
              </h2>
              <form id="form-callcenter" novalidate>
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label class="form-label" for="cc-paciente">Nome do Paciente <span class="required">*</span></label>
                    <input type="text" id="cc-paciente" class="form-input" required>
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label" for="cc-telefone">Telefone <span class="required">*</span></label>
                    <input type="tel" id="cc-telefone" class="form-input" placeholder="(00) 00000-0000" required>
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label" for="cc-ultimo">Último Atendimento</label>
                    <input type="date" id="cc-ultimo" class="form-input">
                  </div>
                  <div class="form-group full-width">
                    <label class="form-toggle">
                      <div class="toggle-switch">
                        <input type="checkbox" id="cc-atendeu">
                        <span class="toggle-track"></span>
                      </div>
                      <span class="toggle-label">Atendeu?</span>
                    </label>
                  </div>
                  <div class="form-group full-width" id="grupo-reagendou" style="opacity:0.5;pointer-events:none">
                    <label class="form-toggle">
                      <div class="toggle-switch">
                        <input type="checkbox" id="cc-reagendou" disabled>
                        <span class="toggle-track"></span>
                      </div>
                      <span class="toggle-label">Reagendou?</span>
                    </label>
                  </div>
                  <div class="form-group full-width" id="grupo-data-reag" style="display:none">
                    <label class="form-label" for="cc-data-reag">Data do Reagendamento</label>
                    <input type="date" id="cc-data-reag" class="form-input">
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label" for="cc-obs">Observações</label>
                    <textarea id="cc-obs" class="form-textarea" rows="3"></textarea>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary w-full mt-2" id="btn-salvar-cc">
                  <i data-lucide="save" width="16" height="16" aria-hidden="true"></i>
                  <span id="btn-cc-txt">Salvar Ativação</span>
                </button>
                <input type="hidden" id="cc-edit-id">
              </form>
            </div>
          </div>

          <!-- Tabela -->
          <div>
            <div class="table-container">
              <div class="table-toolbar">
                <span class="table-toolbar-title">Registros do Dia</span>
                <div class="table-actions" id="acoes-tabela-cc"></div>
              </div>
              <div class="table-scroll table-mobile-cards">
                <table class="data-table" id="tabela-callcenter" aria-label="Registros de call center">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Paciente</th>
                      <th scope="col">Telefone</th>
                      <th scope="col">Último Atend.</th>
                      <th scope="col">Atendeu</th>
                      <th scope="col">Reagendou</th>
                      <th scope="col">Data Reag.</th>
                      ${isAdmin() ? '<th scope="col">Atendente</th>' : ""}
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-cc">
                    <tr><td colspan="9"><div class="loading-wrapper"><div class="spinner"></div>Carregando...</div></td></tr>
                  </tbody>
                </table>
              </div>
              <div class="pagination" id="paginacao-cc"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    const acoes = container.querySelector("#acoes-tabela-cc");
    if (acoes)
      acoes.appendChild(
        criarBotaoExportar(
          "tabela-callcenter",
          "Call Center — Registros",
          "callcenter",
        ),
      );
  },

  _renderCards(total, atendidos, reagendados, ligacoes) {
    const taxa = ligacoes > 0 ? Math.round((reagendados / ligacoes) * 100) : 0;
    return `
      <div class="card">
        <div class="card-header">
          <span class="card-label">Ligações</span>
          <div class="card-icon icon-blue"><i data-lucide="phone" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="cc-total">${total}</div>
        <div class="card-meta">realizadas</div>
        <div class="card-bar bar-accent"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Atendidos</span>
          <div class="card-icon icon-green"><i data-lucide="phone-incoming" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="cc-atendidos">${atendidos}</div>
        <div class="card-meta">atenderam</div>
        <div class="card-bar bar-success"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Reagendados</span>
          <div class="card-icon icon-yellow"><i data-lucide="calendar-check" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="cc-reagendados">${reagendados}</div>
        <div class="card-meta">confirmados</div>
        <div class="card-bar bar-warning"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Conversão</span>
          <div class="card-icon icon-blue"><i data-lucide="trending-up" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="cc-taxa">${taxa}%</div>
        <div class="card-meta">reagend. / ligações</div>
        <div class="card-bar bar-info"></div>
      </div>
    `;
  },

  _atualizarCards(registros) {
    const lista = Object.values(registros);
    const total = lista.length;
    const atendidos = lista.filter((r) => r.atendeu).length;
    const reagendados = lista.filter((r) => r.reagendou).length;
    const taxa = total > 0 ? Math.round((reagendados / total) * 100) : 0;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set("cc-total", total);
    set("cc-atendidos", atendidos);
    set("cc-reagendados", reagendados);
    set("cc-taxa", taxa + "%");
  },

  _renderTabela(registros, usuariosMap) {
    const tbody = document.getElementById("tbody-cc");
    if (!tbody) return;
    const lista = Object.entries(registros);
    if (lista.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="9">
        <div class="table-empty">
          <i data-lucide="phone-off" width="40" height="40" aria-hidden="true"></i>
          <p>Nenhuma ativação registrada nesta data.</p>
        </div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      return;
    }

    tbody.innerHTML = lista
      .map(
        ([id, r], idx) => `
      <tr>
        <td data-label="#">${idx + 1}</td>
        <td data-label="Paciente">${r.paciente || "—"}</td>
        <td data-label="Telefone">${r.telefone || "—"}</td>
        <td data-label="Último Atend.">${r.ultimo_atendimento ? formatarData(r.ultimo_atendimento) : "—"}</td>
        <td data-label="Atendeu">
          <span class="badge ${r.atendeu ? "badge-success" : "badge-neutral"}">${r.atendeu ? "Sim" : "Não"}</span>
        </td>
        <td data-label="Reagendou">
          <span class="badge ${r.reagendou ? "badge-success" : "badge-neutral"}">${r.reagendou ? "Sim" : "Não"}</span>
        </td>
        <td data-label="Data Reag.">${r.data_reagendamento ? formatarData(r.data_reagendamento) : "—"}</td>
        ${isAdmin() ? `<td data-label="Atendente">${usuariosMap[r.registrado_por] || "—"}</td>` : ""}
        <td data-label="Ações">
          <div style="display:flex;gap:0.25rem">
            ${
              isAdmin() || r.registrado_por === window.AppState.uid
                ? `
              <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.callcenter._editarRegistro('${id}')" aria-label="Editar">
                <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm text-danger" onclick="Modules.callcenter._excluirRegistro('${id}','${(r.paciente || "").replace(/'/g, "\\'")}')" aria-label="Excluir">
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
    const caminho = caminhoData("call_center", this._dataSelecionada);
    this._cancelarEscuta = escutar(caminho, async (dados) => {
      const todos = dados || {};
      const filtrado = filtrarPorUsuario(todos);
      this._registros = filtrado;
      this._atualizarCards(filtrado);
      let usuariosMap = {};
      if (isAdmin()) {
        const u = await lerUmaVez("usuarios");
        if (u)
          Object.entries(u).forEach(([uid, usr]) => {
            usuariosMap[uid] = usr.nome || uid;
          });
      }
      this._renderTabela(filtrado, usuariosMap);
    });
    registrarListener(this._cancelarEscuta);
  },

  _bindEventos(container) {
    container
      .querySelector("#data-callcenter")
      ?.addEventListener("change", (e) => {
        this._dataSelecionada = e.target.value;
        this._iniciarEscuta();
      });

    // Aplicar máscara telefone
    container.querySelector("#cc-telefone")?.addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, "");
      if (v.length <= 10)
        v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
      else v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
      e.target.value = v;
    });

    const atendeuChk = container.querySelector("#cc-atendeu");
    const grpReag = container.querySelector("#grupo-reagendou");
    const reagendouChk = container.querySelector("#cc-reagendou");
    const grpDataReag = container.querySelector("#grupo-data-reag");

    atendeuChk?.addEventListener("change", (e) => {
      grpReag.style.opacity = e.target.checked ? "1" : "0.5";
      grpReag.style.pointerEvents = e.target.checked ? "" : "none";
      if (reagendouChk) reagendouChk.disabled = !e.target.checked;
      if (!e.target.checked) {
        reagendouChk.checked = false;
        grpDataReag.style.display = "none";
      }
    });

    reagendouChk?.addEventListener("change", (e) => {
      grpDataReag.style.display = e.target.checked ? "" : "none";
    });

    container
      .querySelector("#form-callcenter")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this._salvarRegistro();
      });
  },

  async _salvarRegistro() {
    const paciente = document.getElementById("cc-paciente")?.value.trim();
    const telefone = document.getElementById("cc-telefone")?.value.trim();
    const ultimo = document.getElementById("cc-ultimo")?.value;
    const atendeu = document.getElementById("cc-atendeu")?.checked;
    const reagendou = document.getElementById("cc-reagendou")?.checked;
    const dataReag = document.getElementById("cc-data-reag")?.value;
    const obs = document.getElementById("cc-obs")?.value.trim();
    const editId = document.getElementById("cc-edit-id")?.value;

    if (!paciente || !telefone) {
      Alerts.aviso("Preencha paciente e telefone.");
      return;
    }

    const btn = document.getElementById("btn-salvar-cc");
    const txt = document.getElementById("btn-cc-txt");
    if (btn) btn.disabled = true;
    if (txt) txt.textContent = "Salvando...";

    try {
      const dados = {
        paciente,
        telefone,
        ultimo_atendimento: ultimo || "",
        atendeu,
        reagendou,
        data_reagendamento: dataReag || "",
        observacoes: obs,
      };
      const caminho = caminhoData("call_center", this._dataSelecionada);

      if (editId) {
        const ant = this._registros[editId];
        await atualizar(`${caminho}/${editId}`, dados);
        await registrarAuditoria("editar", "callcenter", editId, ant);
        Alerts.sucesso("Registro atualizado!");
        document.getElementById("cc-edit-id").value = "";
        if (txt) txt.textContent = "Salvar Ativação";
      } else {
        const id = await criar(caminho, dados);
        await registrarAuditoria("criar", "callcenter", id, null);
        Alerts.sucesso("Ativação registrada!");
      }
      document.getElementById("form-callcenter")?.reset();
      document.getElementById("grupo-data-reag").style.display = "none";
    } catch (err) {
      Alerts.erro("Erro ao salvar.");
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  _editarRegistro(id) {
    const r = this._registros[id];
    if (!r) return;
    document.getElementById("cc-paciente").value = r.paciente || "";
    document.getElementById("cc-telefone").value = r.telefone || "";
    document.getElementById("cc-ultimo").value = r.ultimo_atendimento || "";
    document.getElementById("cc-atendeu").checked = r.atendeu || false;
    document.getElementById("cc-reagendou").checked = r.reagendou || false;
    document.getElementById("cc-data-reag").value = r.data_reagendamento || "";
    document.getElementById("cc-obs").value = r.observacoes || "";
    document.getElementById("cc-edit-id").value = id;
    // Atualizar estados
    const grpReag = document.getElementById("grupo-reagendou");
    grpReag.style.opacity = r.atendeu ? "1" : "0.5";
    grpReag.style.pointerEvents = r.atendeu ? "" : "none";
    document.getElementById("cc-reagendou").disabled = !r.atendeu;
    document.getElementById("grupo-data-reag").style.display = r.reagendou
      ? ""
      : "none";
    document.getElementById("btn-cc-txt").textContent = "Atualizar Ativação";
    document.getElementById("cc-paciente")?.focus();
  },

  _excluirRegistro(id, nome) {
    Modal.confirmar(
      `Excluir ativação de <strong>${nome}</strong>?`,
      async () => {
        try {
          const ant = this._registros[id];
          await remover(
            `${caminhoData("call_center", this._dataSelecionada)}/${id}`,
          );
          await registrarAuditoria("excluir", "callcenter", id, ant);
          Alerts.sucesso("Registro excluído.");
        } catch (err) {
          Alerts.erro("Erro ao excluir.");
        }
      },
      "Excluir Ativação",
    );
  },
};
