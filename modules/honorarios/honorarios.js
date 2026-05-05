// ================================================================
// honorarios.js — Módulo Divisão de Honorários (Somente Admin)
// ================================================================

window.Modules = window.Modules || {};

window.Modules.honorarios = {
  _cancelarEscuta: null,
  _registros: {},
  _mesSelecionado: new Date().getMonth() + 1,
  _anoSelecionado: new Date().getFullYear(),

  mount(container) {
    if (!exigirPermissao("honorarios", container)) return;

    const mesAtual = String(this._mesSelecionado).padStart(2, "0");
    const mesInput = container.querySelector("#hon-mes");
    if (mesInput) mesInput.value = `${this._anoSelecionado}-${mesAtual}`;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._carregarDados();

    const acoes = container.querySelector("#acoes-tabela-hon");
    if (acoes)
      acoes.appendChild(
        criarBotaoExportar(
          "tabela-honorarios",
          "Honorários Médicos",
          "honorarios",
        ),
      );
  },

  async _carregarDados() {
    const { inicio, fim } = intervaloMes(
      this._anoSelecionado,
      this._mesSelecionado,
    );
    const [honorariosArr] = await Promise.all([
      buscarIntervalo("honorarios", inicio, fim),
    ]);

    const pendentes = honorariosArr.filter((r) => !r.lancado);
    const lancados = honorariosArr.filter((r) => r.lancado);

    this._registros = Object.fromEntries(honorariosArr.map((r) => [r._id, r]));

    this._renderPendentes(pendentes);
    this._renderLancados(lancados);
  },

  _renderPendentes(lista) {
    const tbody = document.getElementById("tbody-pendentes");
    const counter = document.getElementById("count-pendentes");
    if (!tbody) return;
    if (counter)
      counter.textContent = `${lista.length} pendente${lista.length !== 1 ? "s" : ""}`;

    if (lista.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="8">
        <div class="table-empty">
          <i data-lucide="check-circle" width="32" height="32" aria-hidden="true"></i>
          <p>Nenhum honorário pendente neste período.</p>
        </div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      return;
    }

    tbody.innerHTML = lista
      .map(
        (r) => `
      <tr>
        <td data-label="Data">${formatarData(r._data)}</td>
        <td data-label="Paciente">${r.paciente || "—"}</td>
        <td data-label="Cirurgião">${r.nome_cirurgiao || "—"}</td>
        <td data-label="Auxiliar">${r.nome_auxiliar || "Nenhum"}</td>
        <td data-label="Tipo">${r.tipo_cirurgia || "—"}</td>
        <td data-label="Vlr. Cirurgia" class="table-number">${r.valor_total_cirurgia > 0 ? formatarMoeda(r.valor_total_cirurgia) : "—"}</td>
        <td data-label="LIO" class="table-number">${r.valor_lio_total > 0 ? formatarMoeda(r.valor_lio_total) : "—"}</td>
        <td data-label="Ação">
          <button class="btn btn-primary btn-sm" onclick="Modules.honorarios._abrirModalLancar('${r._id}')">
            <i data-lucide="edit" width="14" height="14" aria-hidden="true"></i>
            Lançar Valores
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
    lucide.createIcons({ nodes: [tbody] });
  },

  _renderLancados(lista) {
    const tbody = document.getElementById("tbody-honorarios");
    const tfoot = document.getElementById("tfoot-honorarios");
    if (!tbody) return;

    if (lista.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="11">
        <div class="table-empty">
          <i data-lucide="banknote" width="40" height="40" aria-hidden="true"></i>
          <p>Nenhum honorário lançado neste período.</p>
        </div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      if (tfoot) tfoot.innerHTML = "";
      return;
    }

    tbody.innerHTML = lista
      .map((r) => {
        const total =
          (r.honorario_cirurgiao_pf || 0) +
          (r.lio_parte_cirurgiao || 0) +
          (r.honorario_auxiliar_pf || 0) +
          (r.honorario_instrumentador_pf || 0) +
          (r.valor_clinica_cnpj || 0) +
          (r.lio_parte_clinica || 0);
        return `
        <tr>
          <td data-label="Paciente">${r.paciente || "—"}</td>
          <td data-label="Cirurgião">${r.nome_cirurgiao || "—"}</td>
          <td data-label="Auxiliar">${r.nome_auxiliar || "—"}</td>
          <td data-label="Hon. Cirurgião PF" class="table-number">${formatarMoeda(r.honorario_cirurgiao_pf)}</td>
          <td data-label="LIO Cirurgião" class="table-number">${formatarMoeda(r.lio_parte_cirurgiao)}</td>
          <td data-label="LIO Clínica" class="table-number">${formatarMoeda(r.lio_parte_clinica)}</td>
          <td data-label="Hon. Auxiliar PF" class="table-number">${formatarMoeda(r.honorario_auxiliar_pf)}</td>
          <td data-label="Hon. Instrument." class="table-number">${formatarMoeda(r.honorario_instrumentador_pf)}</td>
          <td data-label="Clínica CNPJ" class="table-number">${formatarMoeda(r.valor_clinica_cnpj)}</td>
          <td data-label="Total" class="table-number fw-6">${formatarMoeda(total)}</td>
          <td data-label="Ações" style="white-space:nowrap">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.honorarios._abrirModalLancar('${r._id}')" aria-label="Editar honorário">
              <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
            </button>
            <!-- CORRIGIDO: botão de exclusão para honorários já lançados -->
            <button class="btn btn-ghost btn-icon btn-sm" style="color:var(--danger)" onclick="Modules.honorarios._excluirLancado('${r._id}')" aria-label="Excluir honorário">
              <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
    lucide.createIcons({ nodes: [tbody] });

    const totais = lista.reduce(
      (acc, r) => {
        acc.cirurgiaoPF += r.honorario_cirurgiao_pf || 0;
        acc.lioCirurgiao += r.lio_parte_cirurgiao || 0;
        acc.lioClinica += r.lio_parte_clinica || 0;
        acc.auxiliarPF += r.honorario_auxiliar_pf || 0;
        acc.instrumentador += r.honorario_instrumentador_pf || 0;
        acc.clinicaCNPJ += r.valor_clinica_cnpj || 0;
        return acc;
      },
      {
        cirurgiaoPF: 0,
        lioCirurgiao: 0,
        lioClinica: 0,
        auxiliarPF: 0,
        instrumentador: 0,
        clinicaCNPJ: 0,
      },
    );

    const totalGeral = Object.values(totais).reduce((a, b) => a + b, 0);
    if (tfoot) {
      tfoot.innerHTML = `
        <tr style="background:var(--bg-secondary);font-weight:700">
          <td colspan="3">Totais do Período</td>
          <td class="table-number">${formatarMoeda(totais.cirurgiaoPF)}</td>
          <td class="table-number">${formatarMoeda(totais.lioCirurgiao)}</td>
          <td class="table-number">${formatarMoeda(totais.lioClinica)}</td>
          <td class="table-number">${formatarMoeda(totais.auxiliarPF)}</td>
          <td class="table-number">${formatarMoeda(totais.instrumentador)}</td>
          <td class="table-number">${formatarMoeda(totais.clinicaCNPJ)}</td>
          <td class="table-number">${formatarMoeda(totalGeral)}</td>
          <td></td>
        </tr>
      `;
    }
  },

  // CORRIGIDO: modal único para lançar E editar honorários (detecta modo pelo campo lancado)
  _abrirModalLancar(id) {
    const r = this._registros[id];
    if (!r) return;

    const valorLioTotal = r.valor_lio_total || 0;
    // CORRIGIDO: detecta modo de edição — honorários já lançados
    const modoEdicao = !!r.lancado;

    // Função auxiliar para gerar valor BRL formatado para o value do input
    const toBRL = (v) =>
      (parseFloat(v) || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

    Modal.abrirModal({
      // CORRIGIDO: título diferente para edição x novo lançamento
      titulo: modoEdicao ? "Editar Honorários" : "Lançar Honorários",
      icone: "banknote",
      tamanho: "lg",
      corpo: `
        <div style="background:var(--bg-secondary);border-radius:var(--border-radius);padding:1rem;margin-bottom:1.25rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.875rem">
            <div><span class="text-muted">Paciente: </span><strong>${r.paciente}</strong></div>
            <div><span class="text-muted">Cirurgia: </span>${r.tipo_cirurgia || "—"}</div>
            <div><span class="text-muted">Cirurgião: </span><strong>${r.nome_cirurgiao}</strong></div>
            <div><span class="text-muted">Auxiliar: </span>${r.nome_auxiliar || "Nenhum"}</div>
            <div><span class="text-muted">Instrumentador: </span>${r.nome_instrumentador || "—"}</div>
            <div><span class="text-muted">Olho: </span>${r.olho_operado || "—"}</div>
            ${r.valor_total_cirurgia > 0 ? `<div><span class="text-muted">Valor Total Cirurgia: </span><strong class="table-number">${formatarMoeda(r.valor_total_cirurgia)}</strong></div>` : ""}
            ${valorLioTotal > 0 ? `<div><span class="text-muted">LIO Total: </span><strong class="table-number" data-lio-total="${valorLioTotal}">${formatarMoeda(valorLioTotal)}</strong></div>` : ""}
          </div>
          ${modoEdicao ? '<div style="margin-top:.5rem"><span class="badge badge-success" style="font-size:.75rem">✓ Já lançado — editando valores financeiros</span></div>' : ""}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem">
          <div>
            <h4 style="font-size:0.78rem;font-weight:700;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.75rem">Pessoa Física (PF)</h4>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="hon-cir-pf">Hon. Cirurgião PF (R$)</label>
                <!-- CORRIGIDO: type=text com inputmode para formatação automática -->
                <input type="text" inputmode="numeric" id="hon-cir-pf" class="form-input"
                  oninput="formatarMoedaInput(this)"
                  value="${toBRL(r.honorario_cirurgiao_pf || 0)}"
                  data-valor="${r.honorario_cirurgiao_pf || 0}">
              </div>
              <div class="form-group">
                <label class="form-label" for="hon-lio-cir">LIO — Parte Cirurgião (R$)</label>
                <!-- CORRIGIDO: type=text com inputmode para formatação automática -->
                <input type="text" inputmode="numeric" id="hon-lio-cir" class="form-input"
                  oninput="formatarMoedaInput(this)"
                  value="${toBRL(r.lio_parte_cirurgiao !== undefined ? r.lio_parte_cirurgiao : valorLioTotal)}"
                  data-valor="${r.lio_parte_cirurgiao !== undefined ? r.lio_parte_cirurgiao : valorLioTotal}"
                  data-lio-total="${valorLioTotal}">
              </div>
              <div class="form-group">
                <label class="form-label" for="hon-aux-pf">Hon. Auxiliar PF (R$)</label>
                <input type="text" inputmode="numeric" id="hon-aux-pf" class="form-input"
                  oninput="formatarMoedaInput(this)"
                  value="${toBRL(r.honorario_auxiliar_pf || 0)}"
                  data-valor="${r.honorario_auxiliar_pf || 0}">
              </div>
              <div class="form-group">
                <label class="form-label" for="hon-inst-pf">Hon. Instrumentador PF (R$)</label>
                <input type="text" inputmode="numeric" id="hon-inst-pf" class="form-input"
                  oninput="formatarMoedaInput(this)"
                  value="${toBRL(r.honorario_instrumentador_pf || 0)}"
                  data-valor="${r.honorario_instrumentador_pf || 0}">
              </div>
            </div>
          </div>
          <div>
            <h4 style="font-size:0.78rem;font-weight:700;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.75rem">Clínica (CNPJ)</h4>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="hon-lio-cli">LIO — Parte Clínica (R$)</label>
                <input type="text" inputmode="numeric" id="hon-lio-cli" class="form-input"
                  oninput="formatarMoedaInput(this)"
                  value="${toBRL(r.lio_parte_clinica || 0)}"
                  data-valor="${r.lio_parte_clinica || 0}"
                  data-lio-total="${valorLioTotal}">
              </div>
              <div class="form-group">
                <label class="form-label" for="hon-cli-cnpj">Valor Clínica CNPJ (R$)</label>
                <input type="text" inputmode="numeric" id="hon-cli-cnpj" class="form-input"
                  oninput="formatarMoedaInput(this)"
                  value="${toBRL(r.valor_clinica_cnpj || 0)}"
                  data-valor="${r.valor_clinica_cnpj || 0}">
              </div>
            </div>
          </div>
        </div>

        <div class="financial-preview mt-2" id="preview-honorarios">
          <h4>Preview</h4>
          <div class="financial-row"><span>Total Cirurgião</span><span class="financial-value" id="prev-cir">—</span></div>
          <div class="financial-row"><span>Total Auxiliar</span><span class="financial-value" id="prev-aux">—</span></div>
          <div class="financial-row"><span>Total Clínica</span><span class="financial-value" id="prev-cli">—</span></div>
          <div class="financial-row total"><span>Total Geral</span><span class="financial-value" id="prev-total">—</span></div>
        </div>
      `,
      botoes: [
        {
          label: "Cancelar",
          classe: "btn-secondary",
          id: "hon-modal-cancel",
          onClick: () => Modal.fecharModal(),
        },
        {
          // CORRIGIDO: rótulo do botão muda conforme modo
          label: modoEdicao ? "Salvar Edição" : "Confirmar Lançamento",
          classe: "btn-primary",
          id: "hon-modal-salvar",
          icone: "check",
          onClick: () => this._salvarLancamento(id, valorLioTotal, modoEdicao),
        },
      ],
    });

    // Vincular preview em tempo real (todos os campos)
    [
      "hon-cir-pf",
      "hon-lio-cir",
      "hon-aux-pf",
      "hon-inst-pf",
      "hon-lio-cli",
      "hon-cli-cnpj",
    ].forEach((fid) => {
      document
        .getElementById(fid)
        ?.addEventListener("input", () =>
          this._atualizarPreview(valorLioTotal),
        );
    });

    // CORRIGIDO: regra LIO — ao editar um lado, o outro é recalculado automaticamente
    document.getElementById("hon-lio-cir")?.addEventListener("input", () => {
      const cir = getValorNumerico(document.getElementById("hon-lio-cir"));
      const cli = Math.max(0, valorLioTotal - cir);
      setValorMoeda(document.getElementById("hon-lio-cli"), cli);
      this._atualizarPreview(valorLioTotal);
    });
    document.getElementById("hon-lio-cli")?.addEventListener("input", () => {
      const cli = getValorNumerico(document.getElementById("hon-lio-cli"));
      const cir = Math.max(0, valorLioTotal - cli);
      setValorMoeda(document.getElementById("hon-lio-cir"), cir);
      this._atualizarPreview(valorLioTotal);
    });

    this._atualizarPreview(valorLioTotal);
  },

  // CORRIGIDO: usa getValorNumerico para ler campos formatados como moeda
  _atualizarPreview(lioTotal) {
    const get = (id) => getValorNumerico(document.getElementById(id));
    const cirPF = get("hon-cir-pf");
    const lioCir = get("hon-lio-cir");
    const auxPF = get("hon-aux-pf");
    const instPF = get("hon-inst-pf");
    const lioCli = get("hon-lio-cli");
    const cliCNPJ = get("hon-cli-cnpj");

    const totalCir = cirPF + lioCir;
    const totalAux = auxPF;
    const totalCli = cliCNPJ + lioCli;
    const totalGeral = totalCir + totalAux + instPF + totalCli;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatarMoeda(val);
    };
    set("prev-cir", totalCir);
    set("prev-aux", totalAux);
    set("prev-cli", totalCli);
    set("prev-total", totalGeral);
  },

  // CORRIGIDO: valida divisão da LIO, suporta edição de lançados (modoEdicao)
  async _salvarLancamento(id, lioTotal, modoEdicao = false) {
    // CORRIGIDO: usa getValorNumerico para ler campos formatados como moeda
    const get = (fid) => getValorNumerico(document.getElementById(fid));
    const lioCir = get("hon-lio-cir");
    const lioCli = get("hon-lio-cli");

    // CORRIGIDO: validação da divisão da LIO antes de salvar
    if (lioTotal > 0) {
      const somaLio = lioCir + lioCli;
      if (Math.abs(somaLio - lioTotal) > 0.01) {
        Alerts.aviso(
          `A soma da LIO (${formatarMoeda(somaLio)}) não bate com o valor total (${formatarMoeda(lioTotal)}). Ajuste os campos antes de salvar.`,
        );
        return;
      }
    }

    const dados = {
      honorario_cirurgiao_pf: get("hon-cir-pf"),
      lio_parte_cirurgiao: lioCir,
      honorario_auxiliar_pf: get("hon-aux-pf"),
      honorario_instrumentador_pf: get("hon-inst-pf"),
      lio_parte_clinica: lioCli,
      valor_clinica_cnpj: get("hon-cli-cnpj"),
      valor_total:
        get("hon-cir-pf") +
        lioCir +
        get("hon-aux-pf") +
        get("hon-inst-pf") +
        lioCli +
        get("hon-cli-cnpj"),
      lancado: true, // CORRIGIDO: mantém lancado:true mesmo após edição
    };

    // CORRIGIDO: adiciona campos de auditoria quando for edição
    if (modoEdicao) {
      dados.editado_em = agora();
      dados.editado_por = window.AppState?.uid || "";
    }

    const btn = document.getElementById("hon-modal-salvar");
    if (btn) btn.disabled = true;

    try {
      const r = this._registros[id];
      const caminho = caminhoData("honorarios", r._data);
      await atualizar(`${caminho}/${id}`, dados);

      // Atualizar flag honorarios_lancados na cirurgia de origem
      if (r.cirurgia_id && r.data_cirurgia) {
        const caminhoCir = caminhoData("cirurgias", r.data_cirurgia);
        await atualizar(`${caminhoCir}/${r.cirurgia_id}`, {
          honorarios_lancados: true,
        });
      }

      // CORRIGIDO: auditoria diferenciada para edição x lançamento inicial
      await registrarAuditoria(
        modoEdicao ? "editar_honorario" : "lancar_honorarios",
        "honorarios",
        id,
        r,
      );
      Modal.fecharModal();
      Alerts.sucesso(
        modoEdicao
          ? "Honorários atualizados com sucesso!"
          : "Honorários lançados com sucesso!",
      );
      this._carregarDados();
    } catch (err) {
      console.error("[honorarios] salvar:", err);
      Alerts.erro("Erro ao salvar honorários.");
      if (btn) btn.disabled = false;
    }
  },

  // CORRIGIDO: exclusão de honorários já lançados com confirmação
  _excluirLancado(id) {
    const r = this._registros[id];
    if (!r) return;
    const desc = `${r.paciente || "paciente"} — ${r.nome_cirurgiao || "cirurgião"}`;
    Modal.confirmar(
      `Excluir o honorário lançado de <strong>${desc}</strong>?<br><br>⚠️ Esta ação não poderá ser desfeita.`,
      async () => {
        try {
          const caminho = caminhoData("honorarios", r._data);
          await remover(`${caminho}/${id}`);
          // Remove a flag da cirurgia de origem, se existir
          if (r.cirurgia_id && r.data_cirurgia) {
            await atualizar(
              `${caminhoData("cirurgias", r.data_cirurgia)}/${r.cirurgia_id}`,
              { honorarios_lancados: false },
            );
          }
          await registrarAuditoria("excluir", "honorarios", id, r);
          Alerts.sucesso("Honorário excluído com sucesso.");
          this._carregarDados();
        } catch (err) {
          console.error("[honorarios] excluir:", err);
          Alerts.erro("Erro ao excluir honorário.");
        }
      },
      "Excluir Honorário",
    );
  },

  _bindEventos(container) {
    container.querySelector("#hon-mes")?.addEventListener("change", (e) => {
      const [ano, mes] = e.target.value.split("-");
      this._anoSelecionado = parseInt(ano);
      this._mesSelecionado = parseInt(mes);
      this._carregarDados();
    });
  },
};
