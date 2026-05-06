// ================================================================
// modules/callcenter/callcenter.js — Módulo Call Center
// ================================================================

window.Modules = window.Modules || {};

window.Modules.callcenter = {
  _cancelarEscuta: null,
  _registros: {},
  _dataSelecionada: hoje(),
  _filtroMedico: "todos", // ALTERAÇÃO 2: filtro de médico na tabela
  _usuariosMap: {}, // ALTERAÇÃO: cache do mapa de usuários

  mount(container) {
    if (!exigirPermissao("callcenter", container)) return;

    if (isAdmin()) {
      container.querySelectorAll(".admin-only").forEach((el) => {
        el.hidden = false;
      });
    }

    const inputData = container.querySelector("#data-callcenter");
    if (inputData) inputData.value = this._dataSelecionada;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();

    const acoes = container.querySelector("#acoes-tabela-cc");
    if (acoes) {
      acoes.appendChild(
        criarBotaoExportar(
          "tabela-callcenter",
          "Call Center — Registros",
          "callcenter",
        ),
      );
    }
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
      tbody.innerHTML = `<tr><td colspan="10">
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
        <td data-label="Médico">${r.medico || "—"}</td>
        <td data-label="Telefone">${r.telefone || "—"}</td>
        <td data-label="Último Atend.">${r.ultimo_atendimento ? formatarData(r.ultimo_atendimento) : "—"}</td>
        <td data-label="Atendeu"><span class="badge ${r.atendeu ? "badge-success" : "badge-neutral"}">${r.atendeu ? "Sim" : "Não"}</span></td>
        <td data-label="Agendou"><span class="badge ${r.reagendou ? "badge-success" : "badge-neutral"}">${r.reagendou ? "Sim" : "Não"}</span></td>
        <td data-label="Data Agend.">${r.data_reagendamento ? formatarData(r.data_reagendamento) : "—"}</td>
        ${isAdmin() ? `<td data-label="Atendente">${usuariosMap[r.registrado_por] || "—"}</td>` : ""}
        <td data-label="Ações">
          <div style="display:flex;gap:.25rem">
            ${
              isAdmin() || r.registrado_por === window.AppState.uid
                ? `
              <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.callcenter._editarRegistro('${id}')" aria-label="Editar">
                <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm text-danger" onclick="Modules.callcenter._excluirRegistro('${id}','${(r.paciente || "").replace(/'/g, "\\'")}') " aria-label="Excluir">
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
    const caminho = caminhoData("call_center", this._dataSelecionada);
    this._cancelarEscuta = escutar(caminho, async (dados) => {
      const filtrado = filtrarPorUsuario(dados || {});
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

    // ALTERAÇÃO 2: filtro de médico na tabela (somente admin)
    container
      .querySelector("#filtro-medico-cc")
      ?.addEventListener("change", (e) => {
        this._filtroMedico = e.target.value;
        this._renderTabelaFiltrada();
      });

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
    const medico = document.getElementById("cc-medico")?.value; // ALTERAÇÃO 1: campo médico
    const telefone = document.getElementById("cc-telefone")?.value.trim();
    const ultimo = document.getElementById("cc-ultimo")?.value;
    const atendeu = document.getElementById("cc-atendeu")?.checked;
    const reagendou = document.getElementById("cc-reagendou")?.checked;
    const dataReag = document.getElementById("cc-data-reag")?.value;
    const editId = document.getElementById("cc-edit-id")?.value;

    if (!paciente || !telefone) {
      Alerts.aviso("Preencha paciente e telefone.");
      return;
    }
    // ALTERAÇÃO 1: validação do campo médico obrigatório
    if (!medico) {
      Alerts.aviso("Selecione o médico vinculado à ativação.");
      document.getElementById("cc-medico")?.focus();
      return;
    }

    const btn = document.getElementById("btn-salvar-cc");
    const txt = document.getElementById("btn-cc-txt");
    if (btn) btn.disabled = true;
    if (txt) txt.textContent = "Salvando...";

    try {
      const dados = {
        paciente,
        medico, // ALTERAÇÃO 1: médico vinculado à ativação
        telefone,
        ultimo_atendimento: ultimo || "",
        atendeu,
        reagendou,
        data_reagendamento: dataReag || "",
      };
      const caminho = caminhoData("call_center", this._dataSelecionada);

      if (editId) {
        await atualizar(`${caminho}/${editId}`, dados);
        await registrarAuditoria(
          "editar",
          "callcenter",
          editId,
          this._registros[editId],
        );
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
    } catch {
      Alerts.erro("Erro ao salvar.");
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  _editarRegistro(id) {
    const r = this._registros[id];
    if (!r) return;
    document.getElementById("cc-paciente").value = r.paciente || "";
    document.getElementById("cc-medico").value = r.medico || ""; // ALTERAÇÃO 1: restaura médico
    document.getElementById("cc-telefone").value = r.telefone || "";
    document.getElementById("cc-ultimo").value = r.ultimo_atendimento || "";
    document.getElementById("cc-atendeu").checked = r.atendeu || false;
    document.getElementById("cc-reagendou").checked = r.reagendou || false;
    document.getElementById("cc-data-reag").value = r.data_reagendamento || "";
    document.getElementById("cc-edit-id").value = id;
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
          await remover(
            `${caminhoData("call_center", this._dataSelecionada)}/${id}`,
          );
          await registrarAuditoria(
            "excluir",
            "callcenter",
            id,
            this._registros[id],
          );
          Alerts.sucesso("Registro excluído.");
        } catch {
          Alerts.erro("Erro ao excluir.");
        }
      },
      "Excluir Ativação",
    );
  },

  // ALTERAÇÃO 4: painel de métricas por médico — somente admin
  _renderMetricasPorMedico(registros) {
    const el = document.getElementById("metricas-medico-cc");
    if (!el || !isAdmin()) return;

    const lista = Object.values(registros);
    if (lista.length === 0) {
      el.innerHTML = "";
      return;
    }

    // Agrupa por médico
    const grupos = {};
    lista.forEach((r) => {
      const m = r.medico || "Não informado";
      if (!grupos[m])
        grupos[m] = { medico: m, ativacoes: 0, atendeu: 0, reagendou: 0 };
      grupos[m].ativacoes++;
      if (r.atendeu) grupos[m].atendeu++;
      if (r.reagendou) grupos[m].reagendou++;
    });

    const linhas = Object.values(grupos).sort(
      (a, b) => b.ativacoes - a.ativacoes,
    );
    const totAtiv = linhas.reduce((s, g) => s + g.ativacoes, 0);
    const totAtend = linhas.reduce((s, g) => s + g.atendeu, 0);
    const totReag = linhas.reduce((s, g) => s + g.reagendou, 0);
    const totConv = totAtiv > 0 ? Math.round((totReag / totAtiv) * 100) : 0;

    const nomeMes = new Date().toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    el.innerHTML = `
      <div class="card mt-3">
        <div class="card-header">
          <span class="card-title">
            <i data-lucide="bar-chart-2" width="18" height="18" aria-hidden="true"></i>
            Ativações por Médico — ${nomeMes}
          </span>
        </div>
        <div class="table-scroll">
          <table class="data-table cc-medico-table" aria-label="Métricas por médico">
            <thead>
              <tr>
                <th scope="col">Médico</th>
                <th scope="col" class="table-number">Ativações</th>
                <th scope="col" class="table-number">Atendeu</th>
                <th scope="col" class="table-number">Agendou</th>
                <th scope="col" class="table-number">Conversão</th>
              </tr>
            </thead>
            <tbody>
              ${linhas
                .map((g) => {
                  const conv =
                    g.ativacoes > 0
                      ? Math.round((g.reagendou / g.ativacoes) * 100)
                      : 0;
                  return `<tr>
                <td>${g.medico}</td>
                <td class="table-number">${g.ativacoes}</td>
                <td class="table-number">${g.atendeu}</td>
                <td class="table-number">${g.reagendou}</td>
                <td class="table-number">
                  <span class="badge ${conv >= 50 ? "badge-success" : "badge-warning"}">${conv}%</span>
                </td>
              </tr>`;
                })
                .join("")}
            </tbody>
            <tfoot>
              <tr class="cc-total-row">
                <td><strong>TOTAL</strong></td>
                <td class="table-number"><strong>${totAtiv}</strong></td>
                <td class="table-number"><strong>${totAtend}</strong></td>
                <td class="table-number"><strong>${totReag}</strong></td>
                <td class="table-number"><strong>${totConv}%</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
    lucide.createIcons({ nodes: [el] });
  },
};
