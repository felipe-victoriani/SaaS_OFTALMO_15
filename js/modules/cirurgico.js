// ================================================================
// cirurgico.js — Módulo Cirúrgico (Somente Admin)
// ================================================================

window.Modules = window.Modules || {};

const TIPOS_CIRURGIA = [
  "Facoemulsificação",
  "Facoemulsificação com LIO Premium",
  "Vitrectomia Posterior",
  "Vitrectomia Anterior",
  "Trabeculectomia",
  "Implante de Válvula de Ahmed",
  "Pterigio",
  "Blefaroplastia",
  "Retina Descolada",
  "Membrana Epirretiniana",
  "Oclusão de Veia Retiniana",
  "Retinopatia Diabética (Laser)",
  "Cirurgia Refrativa (LASIK)",
  "Cirurgia Refrativa (PRK)",
  "Crosslinking Corneano",
  "Ceratoplastia (Transplante de Córnea)",
  "Estrabismo",
  "Dacriocistorrinostomia (DCR)",
];

const MEDICOS = [
  "Dra. Mariza",
  "Dra. Fabiana",
  "Dra. Mariana",
  "Dr. Dante",
  "Dr. Alberto",
];

window.Modules.cirurgico = {
  _cancelarEscuta: null,
  _registros: {},
  _dataSelecionada: hoje(),

  render(container) {
    if (!exigirPermissao("cirurgico", container)) return;

    container.innerHTML = `
      <div class="page-content">
        <div class="module-header">
          <h1 class="module-title">
            <i data-lucide="scissors" width="24" height="24" aria-hidden="true"></i>
            Cirúrgico
          </h1>
          <p class="module-subtitle">Registro de procedimentos cirúrgicos oftalmológicos (somente admin)</p>
        </div>

        <!-- Seletor de data -->
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
          <label class="form-label" for="data-cirurgico" style="margin:0">Data:</label>
          <input type="date" id="data-cirurgico" class="filter-input" value="${this._dataSelecionada}" style="width:auto">
        </div>

        <div class="module-grid">
          <!-- Formulário -->
          <div>
            <div class="form-section">
              <h2 class="form-section-title">
                <i data-lucide="plus-circle" width="18" height="18" aria-hidden="true"></i>
                Nova Cirurgia
              </h2>
              <form id="form-cirurgico" novalidate>
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label class="form-label" for="cir-paciente">Paciente <span class="required">*</span></label>
                    <input type="text" id="cir-paciente" class="form-input" required>
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label" for="cir-cirurgiao">Cirurgião <span class="required">*</span></label>
                    <select id="cir-cirurgiao" class="form-select" required>
                      <option value="">Selecione...</option>
                      ${MEDICOS.map((m) => `<option>${m}</option>`).join("")}
                    </select>
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label" for="cir-auxiliar">Auxiliar</label>
                    <select id="cir-auxiliar" class="form-select">
                      <option value="">Nenhum</option>
                      ${MEDICOS.map((m) => `<option>${m}</option>`).join("")}
                    </select>
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label" for="cir-instrumentador">Instrumentador</label>
                    <input type="text" id="cir-instrumentador" class="form-input" placeholder="Nome do instrumentador">
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label" for="cir-tipo">Tipo de Cirurgia <span class="required">*</span></label>
                    <select id="cir-tipo" class="form-select" required>
                      <option value="">Selecione...</option>
                      ${TIPOS_CIRURGIA.map((t) => `<option>${t}</option>`).join("")}
                    </select>
                  </div>
                  <div class="form-group full-width">
                    <label class="form-label" for="cir-olho">Olho Operado <span class="required">*</span></label>
                    <select id="cir-olho" class="form-select" required>
                      <option value="">Selecione...</option>
                      <option>Olho Direito (OD)</option>
                      <option>Olho Esquerdo (OE)</option>
                      <option>Ambos (AO)</option>
                    </select>
                  </div>

                  <!-- LIO -->
                  <div class="form-group full-width">
                    <label class="form-toggle">
                      <div class="toggle-switch">
                        <input type="checkbox" id="cir-lio">
                        <span class="toggle-track"></span>
                      </div>
                      <span class="toggle-label">LIO Implantada?</span>
                    </label>
                  </div>
                  <div id="grupo-lio" style="display:none" class="full-width">
                    <div class="form-grid form-grid-2" style="grid-column:1/-1">
                      <div class="form-group">
                        <label class="form-label" for="cir-tipo-lio">Tipo de LIO <span class="required">*</span></label>
                        <select id="cir-tipo-lio" class="form-select">
                          <option value="">Selecione...</option>
                          <option>Monofocal</option>
                          <option>Multifocal</option>
                          <option>Tórica</option>
                          <option>Multifocal Tórica</option>
                          <option>Premium</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="form-label" for="cir-modelo-lio">Modelo da LIO</label>
                        <input type="text" id="cir-modelo-lio" class="form-input" placeholder="Ex: AcrySof IQ">
                      </div>
                      <div class="form-group full-width">
                        <label class="form-label" for="cir-valor-lio">Valor da LIO (R$) <span class="required">*</span></label>
                        <input type="number" id="cir-valor-lio" class="form-input" min="0" step="0.01" placeholder="0,00">
                      </div>
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label" for="cir-valor-total">Valor Total da Cirurgia (R$) <span class="required">*</span></label>
                    <input type="number" id="cir-valor-total" class="form-input" min="0" step="0.01" required>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary w-full mt-2" id="btn-salvar-cir">
                  <i data-lucide="save" width="16" height="16" aria-hidden="true"></i>
                  <span id="btn-cir-txt">Registrar Cirurgia</span>
                </button>
                <input type="hidden" id="cir-edit-id">
              </form>
            </div>
          </div>

          <!-- Tabela -->
          <div>
            <div class="table-container">
              <div class="table-toolbar">
                <span class="table-toolbar-title">Cirurgias Registradas</span>
                <div class="table-actions" id="acoes-tabela-cir"></div>
              </div>
              <div class="table-scroll table-mobile-cards">
                <table class="data-table" id="tabela-cirurgico" aria-label="Cirurgias registradas">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Paciente</th>
                      <th scope="col">Cirurgião</th>
                      <th scope="col">Auxiliar</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Olho</th>
                      <th scope="col">LIO</th>
                      <th scope="col">Valor LIO</th>
                      <th scope="col">Valor Total</th>
                      <th scope="col">Honorários</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-cirurgico">
                    <tr><td colspan="11"><div class="loading-wrapper"><div class="spinner"></div>Carregando...</div></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    const acoes = container.querySelector("#acoes-tabela-cir");
    if (acoes)
      acoes.appendChild(
        criarBotaoExportar(
          "tabela-cirurgico",
          "Cirurgias Registradas",
          "cirurgico",
        ),
      );
  },

  _iniciarEscuta() {
    if (this._cancelarEscuta) this._cancelarEscuta();
    const caminho = caminhoData("cirurgias", this._dataSelecionada);
    this._cancelarEscuta = escutar(caminho, (dados) => {
      this._registros = dados || {};
      this._renderTabela(this._registros);
    });
    registrarListener(this._cancelarEscuta);
  },

  _renderTabela(registros) {
    const tbody = document.getElementById("tbody-cirurgico");
    if (!tbody) return;
    const lista = Object.entries(registros);
    if (lista.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="11">
        <div class="table-empty">
          <i data-lucide="scissors" width="40" height="40" aria-hidden="true"></i>
          <p>Nenhuma cirurgia registrada nesta data.</p>
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
        <td data-label="Cirurgião">${r.medico_cirurgiao || "—"}</td>
        <td data-label="Auxiliar">${r.medico_auxiliar || "Nenhum"}</td>
        <td data-label="Tipo">${r.tipo_cirurgia || "—"}</td>
        <td data-label="Olho">${r.olho_operado || "—"}</td>
        <td data-label="LIO">
          <span class="badge ${r.lio_implantada ? "badge-info" : "badge-neutral"}">${r.lio_implantada ? r.tipo_lio || "Sim" : "Não"}</span>
        </td>
        <td data-label="Valor LIO" class="table-number">${r.lio_implantada ? formatarMoeda(r.valor_lio) : "—"}</td>
        <td data-label="Valor Total" class="table-number">${formatarMoeda(r.valor_total)}</td>
        <td data-label="Honorários">
          <span class="badge ${r.honorarios_lancados ? "badge-success" : "badge-warning"}">${r.honorarios_lancados ? "Lançado" : "Pendente"}</span>
        </td>
        <td data-label="Ações">
          <div style="display:flex;gap:0.25rem">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.cirurgico._editarRegistro('${id}')" aria-label="Editar cirurgia">
              <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm text-danger" onclick="Modules.cirurgico._excluirRegistro('${id}','${(r.paciente || "").replace(/'/g, "\\'")}')" aria-label="Excluir cirurgia">
              <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");
    lucide.createIcons({ nodes: [tbody] });
  },

  _bindEventos(container) {
    container
      .querySelector("#data-cirurgico")
      ?.addEventListener("change", (e) => {
        this._dataSelecionada = e.target.value;
        this._iniciarEscuta();
      });

    container.querySelector("#cir-lio")?.addEventListener("change", (e) => {
      const grupo = document.getElementById("grupo-lio");
      if (grupo) grupo.style.display = e.target.checked ? "" : "none";
    });

    container
      .querySelector("#form-cirurgico")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this._salvarRegistro();
      });
  },

  async _salvarRegistro() {
    const paciente = document.getElementById("cir-paciente")?.value.trim();
    const cirurgiao = document.getElementById("cir-cirurgiao")?.value;
    const auxiliar = document.getElementById("cir-auxiliar")?.value || "";
    const instrumentador =
      document.getElementById("cir-instrumentador")?.value.trim() || "";
    const tipo = document.getElementById("cir-tipo")?.value;
    const olho = document.getElementById("cir-olho")?.value;
    const lio = document.getElementById("cir-lio")?.checked;
    const tipoLio = document.getElementById("cir-tipo-lio")?.value || "";
    const modeloLio =
      document.getElementById("cir-modelo-lio")?.value.trim() || "";
    const valorLio = lio
      ? parseFloat(document.getElementById("cir-valor-lio")?.value || 0)
      : 0;
    const valorTotal = parseFloat(
      document.getElementById("cir-valor-total")?.value || 0,
    );
    const editId = document.getElementById("cir-edit-id")?.value;

    if (!paciente || !cirurgiao || !tipo || !olho) {
      Alerts.aviso("Preencha todos os campos obrigatórios.");
      return;
    }
    if (lio && valorLio <= 0) {
      Alerts.aviso("Informe o valor da LIO.");
      return;
    }

    const btn = document.getElementById("btn-salvar-cir");
    const txt = document.getElementById("btn-cir-txt");
    if (btn) btn.disabled = true;
    if (txt) txt.textContent = "Salvando...";

    try {
      const dados = {
        paciente,
        medico_cirurgiao: cirurgiao,
        medico_auxiliar: auxiliar,
        instrumentador,
        tipo_cirurgia: tipo,
        olho_operado: olho,
        lio_implantada: lio,
        tipo_lio: tipoLio,
        modelo_lio: modeloLio,
        valor_lio: valorLio,
        valor_total: valorTotal,
        honorarios_lancados: false,
      };

      const caminhoCirurgias = caminhoData("cirurgias", this._dataSelecionada);

      if (editId) {
        const ant = this._registros[editId];
        await atualizar(`${caminhoCirurgias}/${editId}`, dados);
        await registrarAuditoria("editar", "cirurgico", editId, ant);
        Alerts.sucesso("Cirurgia atualizada!");
        document.getElementById("cir-edit-id").value = "";
        if (txt) txt.textContent = "Registrar Cirurgia";
      } else {
        const id = await criar(caminhoCirurgias, dados);
        await registrarAuditoria("criar", "cirurgico", id, null);

        // Criar rascunho automático em Honorários
        await this._criarRascunhoHonorarios(id, { ...dados, _id: id });
        Alerts.sucesso("Cirurgia registrada! Rascunho criado em Honorários.");
      }

      document.getElementById("form-cirurgico")?.reset();
      document.getElementById("grupo-lio").style.display = "none";
    } catch (err) {
      console.error("[cirurgico] salvar:", err);
      Alerts.erro("Erro ao salvar cirurgia.");
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  /**
   * Cria automaticamente um rascunho de honorários ao salvar cirurgia.
   */
  async _criarRascunhoHonorarios(cirurgiaId, cir) {
    const rascunho = {
      cirurgia_id: cirurgiaId,
      data_cirurgia: this._dataSelecionada,
      paciente: cir.paciente,
      nome_cirurgiao: cir.medico_cirurgiao,
      nome_auxiliar: cir.medico_auxiliar || "",
      nome_instrumentador: cir.instrumentador || "",
      tipo_cirurgia: cir.tipo_cirurgia,
      olho_operado: cir.olho_operado,
      valor_lio_total: cir.valor_lio || 0,
      lio_parte_cirurgiao: cir.valor_lio || 0, // padrão: total para cirurgião
      lio_parte_clinica: 0,
      honorario_cirurgiao_pf: 0,
      honorario_auxiliar_pf: 0,
      honorario_instrumentador_pf: 0,
      valor_clinica_cnpj: 0,
      valor_total: 0,
      lancado: false,
      registrado_por: window.AppState.uid,
      criado_em: agora(),
    };
    const id = await criar(
      caminhoData("honorarios", this._dataSelecionada),
      rascunho,
    );
    await registrarAuditoria("criar_rascunho", "honorarios", id, null);
  },

  _editarRegistro(id) {
    const r = this._registros[id];
    if (!r) return;
    document.getElementById("cir-paciente").value = r.paciente || "";
    document.getElementById("cir-cirurgiao").value = r.medico_cirurgiao || "";
    document.getElementById("cir-auxiliar").value = r.medico_auxiliar || "";
    document.getElementById("cir-instrumentador").value =
      r.instrumentador || "";
    document.getElementById("cir-tipo").value = r.tipo_cirurgia || "";
    document.getElementById("cir-olho").value = r.olho_operado || "";
    document.getElementById("cir-lio").checked = r.lio_implantada || false;
    document.getElementById("grupo-lio").style.display = r.lio_implantada
      ? ""
      : "none";
    if (r.lio_implantada) {
      document.getElementById("cir-tipo-lio").value = r.tipo_lio || "";
      document.getElementById("cir-modelo-lio").value = r.modelo_lio || "";
      document.getElementById("cir-valor-lio").value = r.valor_lio || 0;
    }
    document.getElementById("cir-valor-total").value = r.valor_total || 0;
    document.getElementById("cir-edit-id").value = id;
    document.getElementById("btn-cir-txt").textContent = "Atualizar Cirurgia";
    document.getElementById("cir-paciente")?.focus();
  },

  _excluirRegistro(id, nome) {
    Modal.confirmar(
      `Excluir cirurgia de <strong>${nome}</strong>?`,
      async () => {
        try {
          const ant = this._registros[id];
          await remover(
            `${caminhoData("cirurgias", this._dataSelecionada)}/${id}`,
          );
          await registrarAuditoria("excluir", "cirurgico", id, ant);
          Alerts.sucesso("Cirurgia excluída.");
        } catch (err) {
          Alerts.erro("Erro ao excluir.");
        }
      },
      "Excluir Cirurgia",
    );
  },
};
