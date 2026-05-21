// ================================================================
// modules/cirurgico/cirurgico.js — Módulo Cirúrgico
// ================================================================

window.Modules = window.Modules || {};

window.Modules.cirurgico = {
  _cancelarEscuta: null,
  _registros: {},
  _dataSelecionada: hoje(),

  mount(container) {
    if (!exigirPermissao("cirurgico", container)) return;

    const inputData = container.querySelector("#data-cirurgico");
    if (inputData) inputData.value = this._dataSelecionada;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    const acoes = container.querySelector("#acoes-tabela-cir");
    if (acoes) {
      acoes.appendChild(
        criarBotaoExportar(
          "tabela-cirurgico",
          "Cirurgias Registradas",
          "cirurgico",
        ),
      );
    }
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
      tbody.innerHTML = `<tr><td colspan="11">
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
        <td data-label="LIO"><span class="badge ${r.lio_implantada ? "badge-info" : "badge-neutral"}">${r.lio_implantada ? r.tipo_lio || "Sim" : "Não"}</span></td>
        <td data-label="Valor LIO" class="table-number">${r.lio_implantada ? formatarMoeda(r.valor_lio) : "—"}</td>
        <td data-label="Valor Total" class="table-number">${formatarMoeda(r.valor_total)}</td>
        <td data-label="Honorários"><span class="badge ${r.honorarios_lancados ? "badge-success" : "badge-warning"}">${r.honorarios_lancados ? "Lançado" : "Pendente"}</span></td>
        <td data-label="Ações">
          <div style="display:flex;gap:.25rem">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.cirurgico._editarRegistro('${id}')" aria-label="Editar">
              <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm text-danger" onclick="Modules.cirurgico._excluirRegistro('${id}','${(r.paciente || "").replace(/'/g, "\\'")}') " aria-label="Excluir">
              <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>`,
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
    // ALTERAÇÃO 3: exibir campo livre ao selecionar "Outra (descrever abaixo)"
    container
      .querySelector("#cir-tipo")
      ?.addEventListener("change", function () {
        const campoOutra = document.getElementById("campo-outra-cirurgia");
        const inputOutra = document.getElementById("input-outra-cirurgia");
        if (this.value === "Outra (descrever abaixo)") {
          if (campoOutra) campoOutra.style.display = "block";
          if (inputOutra) {
            inputOutra.required = true;
            inputOutra.focus();
          }
        } else {
          if (campoOutra) campoOutra.style.display = "none";
          if (inputOutra) {
            inputOutra.required = false;
            inputOutra.value = "";
          }
        }
      });
    container
      .querySelector("#form-cirurgico")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this._salvarRegistro();
      });
  },

  // ALTERAÇÃO 3: retorna o tipo de cirurgia correto (campo livre se "Outra" selecionado)
  _getTipoCirurgia() {
    const select = document.getElementById("cir-tipo");
    if (select?.value === "Outra (descrever abaixo)") {
      return (
        document.getElementById("input-outra-cirurgia")?.value.trim() || "Outra"
      );
    }
    return select?.value || "";
  },

  async _salvarRegistro() {
    const paciente = document.getElementById("cir-paciente")?.value.trim();
    const cirurgiao = document.getElementById("cir-cirurgiao")?.value;
    const auxiliar = document.getElementById("cir-auxiliar")?.value || "";
    const instrumentador =
      document.getElementById("cir-instrumentador")?.value.trim() || "";
    // ALTERAÇÃO 3: usa helper para obter tipo (inclui campo livre "Outra")
    const tipo = this._getTipoCirurgia();
    const olho = document.getElementById("cir-olho")?.value;
    const lio = document.getElementById("cir-lio")?.checked;
    const tipoLio = document.getElementById("cir-tipo-lio")?.value || "";
    const modeloLio =
      document.getElementById("cir-modelo-lio")?.value.trim() || "";
    const valorLio = lio
      ? // CORRIGIDO: usa getValorNumerico para ler campo formatado como moeda
        getValorNumerico(document.getElementById("cir-valor-lio"))
      : 0;
    // CORRIGIDO: usa getValorNumerico para ler campo formatado como moeda
    const valorTotal = getValorNumerico(
      document.getElementById("cir-valor-total"),
    );
    const editId = document.getElementById("cir-edit-id")?.value;

    if (!paciente || !cirurgiao || !tipo) {
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
      const caminho = caminhoData("cirurgias", this._dataSelecionada);

      if (editId) {
        await atualizar(`${caminho}/${editId}`, dados);
        await registrarAuditoria(
          "editar",
          "cirurgico",
          editId,
          this._registros[editId],
        );
        // CORRIGIDO: atualiza rascunho de honorários vinculado se ainda não lançado
        await this._atualizarRascunhoHonorarios(editId, dados);
        Alerts.sucesso("Cirurgia atualizada!");
        document.getElementById("cir-edit-id").value = "";
        if (txt) txt.textContent = "Registrar Cirurgia";
      } else {
        const id = await criar(caminho, dados);
        await registrarAuditoria("criar", "cirurgico", id, null);
        await this._criarRascunhoHonorarios(id, { ...dados, _id: id });
        Alerts.sucesso("Cirurgia registrada! Rascunho criado em Honorários.");
        if (txt) txt.textContent = "Registrar Cirurgia";
      }
      document.getElementById("form-cirurgico")?.reset();
      document.getElementById("grupo-lio").style.display = "none";
    } catch (err) {
      console.error("[cirurgico] salvar:", err);
      Alerts.erro("Erro ao salvar cirurgia.");
    } finally {
      if (btn) btn.disabled = false;
      // Garante que o texto volta ao padrão mesmo em caso de erro
      if (txt && !document.getElementById("cir-edit-id")?.value) {
        txt.textContent = "Registrar Cirurgia";
      }
    }
  },

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
      // CORRIGIDO: salva o valor total da cirurgia para exibir em honorários
      valor_total_cirurgia: cir.valor_total || 0,
      lio_parte_cirurgiao: cir.valor_lio || 0,
      lio_parte_clinica: 0,
      honorario_cirurgiao_pf: 0,
      honorario_auxiliar_pf: 0,
      honorario_instrumentador_pf: 0,
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
      // CORRIGIDO: usa setValorMoeda para preencher campo formatado
      setValorMoeda(document.getElementById("cir-valor-lio"), r.valor_lio || 0);
    }
    // CORRIGIDO: usa setValorMoeda para preencher campo formatado
    setValorMoeda(
      document.getElementById("cir-valor-total"),
      r.valor_total || 0,
    );
    // ALTERAÇÃO 3: ocultar campo "Outra" ao editar (tipo já vem preenchido no select)
    const campoOutra = document.getElementById("campo-outra-cirurgia");
    const inputOutra = document.getElementById("input-outra-cirurgia");
    if (campoOutra) campoOutra.style.display = "none";
    if (inputOutra) {
      inputOutra.required = false;
      inputOutra.value = "";
    }
    document.getElementById("cir-edit-id").value = id;
    document.getElementById("btn-cir-txt").textContent = "Atualizar Cirurgia";
    document.getElementById("cir-paciente")?.focus();
  },

  _excluirRegistro(id, nome) {
    Modal.confirmar(
      `Excluir cirurgia de <strong>${nome}</strong>?<br><br>⚠️ O registro de honorários vinculado também será excluído.`,
      async () => {
        try {
          const ant = this._registros[id];
          // CORRIGIDO: exclui honorários vinculados em paralelo com a cirurgia
          const honSnap = await lerUmaVez(
            caminhoData("honorarios", this._dataSelecionada),
          );
          const exclusoes = [
            remover(`${caminhoData("cirurgias", this._dataSelecionada)}/${id}`),
          ];
          if (honSnap) {
            const honEntry = Object.entries(honSnap).find(
              ([, h]) => h.cirurgia_id === id,
            );
            if (honEntry) {
              exclusoes.push(
                remover(
                  `${caminhoData("honorarios", this._dataSelecionada)}/${honEntry[0]}`,
                ),
              );
            }
          }
          await Promise.all(exclusoes);
          await registrarAuditoria("excluir", "cirurgico", id, ant);
          Alerts.sucesso("Cirurgia e honorários excluídos com sucesso.");
        } catch {
          Alerts.erro("Erro ao excluir.");
        }
      },
      "Excluir Cirurgia",
    );
  },

  /**
   * CORRIGIDO: atualiza o rascunho de honorários vinculado à cirurgia editada,
   * mas apenas se o honorário ainda não foi lançado.
   */
  async _atualizarRascunhoHonorarios(cirurgiaId, cir) {
    try {
      const honSnap = await lerUmaVez(
        caminhoData("honorarios", this._dataSelecionada),
      );
      if (!honSnap) return;
      const honEntry = Object.entries(honSnap).find(
        ([, h]) => h.cirurgia_id === cirurgiaId,
      );
      if (!honEntry) return;
      const [honId, honData] = honEntry;
      // Só atualiza dados operacionais se ainda não foi lançado
      if (honData.lancado) return;
      await atualizar(
        `${caminhoData("honorarios", this._dataSelecionada)}/${honId}`,
        {
          paciente: cir.paciente,
          nome_cirurgiao: cir.medico_cirurgiao,
          nome_auxiliar: cir.medico_auxiliar || "",
          nome_instrumentador: cir.instrumentador || "",
          tipo_cirurgia: cir.tipo_cirurgia,
          olho_operado: cir.olho_operado,
          valor_lio_total: cir.valor_lio || 0,
          // CORRIGIDO: mantém valor_total_cirurgia sincronizado ao editar cirurgia
          valor_total_cirurgia: cir.valor_total || 0,
          lio_parte_cirurgiao: cir.valor_lio || 0,
          lio_parte_clinica: 0,
        },
      );
    } catch (err) {
      console.warn(
        "[cirurgico] Falha ao atualizar rascunho de honorários:",
        err,
      );
    }
  },
};
