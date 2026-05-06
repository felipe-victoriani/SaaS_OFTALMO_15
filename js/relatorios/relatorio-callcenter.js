// ================================================================
// js/relatorios/relatorio-callcenter.js — Relatório do Call Center
// ALTERAÇÃO 6: busca, cálculos, renderização e exportação
// ================================================================

/* global lerUmaVez, buscarIntervalo, formatarData, registrarAuditoria, XLSX, lucide */

const RelatorioCallCenter = {
  // Dados do último relatório gerado (para exportação posterior)
  _dados: null,

  /**
   * Gera o relatório com os filtros informados e injeta o HTML no container.
   * @param {Object} filtros — { de, ate, medico, atendente }
   * @param {HTMLElement} container — elemento onde o resultado será injetado
   */
  async gerar(filtros, container) {
    // Indica carregamento
    container.innerHTML = `
      <div class="loading-wrapper">
        <div class="spinner"></div>
        Gerando relatório…
      </div>`;

    // Busca registros do call center no intervalo de datas
    const registros = await buscarIntervalo(
      "call_center",
      filtros.de,
      filtros.ate,
    );

    // Aplica filtros de médico e atendente
    let filtrado = registros;
    if (filtros.medico && filtros.medico !== "todos") {
      filtrado = filtrado.filter((r) => r.medico === filtros.medico);
    }
    if (filtros.atendente && filtros.atendente !== "todos") {
      filtrado = filtrado.filter((r) => r.registrado_por === filtros.atendente);
    }

    // Ordena por data decrescente
    filtrado.sort((a, b) => (b._data || "").localeCompare(a._data || ""));

    // Calcula totais e agrupamentos
    const totais = calcularTotaisCallCenter(filtrado);
    const porMedico = calcularResumoPorMedico(filtrado);
    const porAtendente = calcularResumoPorAtendente(filtrado);

    // Busca nomes dos atendentes para exibição amigável
    let usuariosMap = {};
    try {
      const u = await lerUmaVez("usuarios");
      if (u)
        Object.entries(u).forEach(([uid, usr]) => {
          usuariosMap[uid] = usr.nome || uid;
        });
    } catch (_) {}

    // Armazena dados para exportação
    this._dados = {
      filtros,
      filtrado,
      totais,
      porMedico,
      porAtendente,
      usuariosMap,
    };

    // Renderiza resultado
    this._renderResultado(container);

    // Registra no log de auditoria
    await registrarAuditoria(
      "gerar_relatorio",
      "callcenter",
      `${filtros.de}_${filtros.ate}`,
      {
        medico: filtros.medico,
        atendente: filtros.atendente,
        total: totais.ativacoes,
      },
    );
  },

  /** Injeta o HTML completo do relatório no container */
  _renderResultado(container) {
    const d = this._dados;
    if (!d) return;

    const { filtros, filtrado, totais, porMedico, porAtendente, usuariosMap } =
      d;
    const semDados = filtrado.length === 0;

    container.innerHTML = `
      <!-- Cards de totais gerais -->
      <div class="cards-grid cards-grid-4 mb-3">
        <div class="card">
          <div class="card-metric">
            <span class="metric-label">Ativações</span>
            <span class="metric-value">${totais.ativacoes}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <span class="metric-label">Atendidos</span>
            <span class="metric-value">${totais.atendidos}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <span class="metric-label">Agendados</span>
            <span class="metric-value">${totais.reagendamentos}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <span class="metric-label">Conversão</span>
            <span class="metric-value">${totais.conversao}%</span>
          </div>
        </div>
      </div>

      ${
        semDados
          ? `<div class="table-empty">
              <i data-lucide="phone-off" width="40" height="40" aria-hidden="true"></i>
              <p>Nenhuma ativação encontrada para o período e filtros selecionados.</p>
            </div>`
          : `
        <!-- Tabela de ativações do período -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="card-title">Ativações no Período</span>
          </div>
          <div class="table-scroll">
            <table class="data-table" id="tabela-rel-cc" aria-label="Ativações do call center">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Médico</th>
                  <th scope="col">Atendente</th>
                  <th scope="col">Atendeu</th>
                  <th scope="col">Agendou</th>
                  <th scope="col">Data Agend.</th>
                  <th scope="col">Observações</th>
                </tr>
              </thead>
              <tbody>
                ${filtrado
                  .map(
                    (r) => `
                  <tr>
                    <td data-label="Data">${r._data ? formatarData(r._data) : "—"}</td>
                    <td data-label="Paciente">${r.paciente || "—"}</td>
                    <td data-label="Médico">${r.medico || "—"}</td>
                    <td data-label="Atendente">${usuariosMap[r.registrado_por] || r.registrado_por || "—"}</td>
                    <td data-label="Atendeu">
                      <span class="badge ${r.atendeu ? "badge-success" : "badge-neutral"}">${r.atendeu ? "Sim" : "Não"}</span>
                    </td>
                    <td data-label="Agendou">
                      <span class="badge ${r.reagendou ? "badge-success" : "badge-neutral"}">${r.reagendou ? "Sim" : "Não"}</span>
                    </td>
                    <td data-label="Data Agend.">${r.data_reagendamento ? formatarData(r.data_reagendamento) : "—"}</td>
                    <td data-label="Observações">${r.observacoes || "—"}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Resumo por médico -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="card-title">Resumo por Médico</span>
          </div>
          <div class="table-scroll">
            <table class="data-table cc-medico-table" aria-label="Resumo por médico">
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
                ${porMedico
                  .map(
                    (g) => `
                  <tr>
                    <td>${g.medico}</td>
                    <td class="table-number">${g.ativacoes}</td>
                    <td class="table-number">${g.atendeu}</td>
                    <td class="table-number">${g.reagendou}</td>
                    <td class="table-number">
                      <span class="badge ${g.conversao >= 50 ? "badge-success" : "badge-warning"}">${g.conversao}%</span>
                    </td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr class="cc-total-row">
                  <td><strong>TOTAL</strong></td>
                  <td class="table-number"><strong>${totais.ativacoes}</strong></td>
                  <td class="table-number"><strong>${totais.atendidos}</strong></td>
                  <td class="table-number"><strong>${totais.reagendamentos}</strong></td>
                  <td class="table-number"><strong>${totais.conversao}%</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Resumo por atendente -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="card-title">Resumo por Atendente</span>
          </div>
          <div class="table-scroll">
            <table class="data-table" aria-label="Resumo por atendente">
              <thead>
                <tr>
                  <th scope="col">Atendente</th>
                  <th scope="col" class="table-number">Ativações</th>
                  <th scope="col" class="table-number">Atendeu</th>
                  <th scope="col" class="table-number">Agendou</th>
                  <th scope="col" class="table-number">Conversão</th>
                </tr>
              </thead>
              <tbody>
                ${porAtendente
                  .map(
                    (g) => `
                  <tr>
                    <td>${usuariosMap[g._uid] || g.atendente}</td>
                    <td class="table-number">${g.ativacoes}</td>
                    <td class="table-number">${g.atendeu}</td>
                    <td class="table-number">${g.reagendou}</td>
                    <td class="table-number">
                      <span class="badge ${g.conversao >= 50 ? "badge-success" : "badge-warning"}">${g.conversao}%</span>
                    </td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `
      }
    `;

    if (typeof lucide !== "undefined")
      lucide.createIcons({ nodes: [container] });
  },

  /** Exporta o relatório em PDF */
  exportarPDF() {
    if (!this._dados) {
      Alerts.aviso("Gere o relatório antes de exportar.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { filtros, filtrado, totais, porMedico, porAtendente, usuariosMap } =
      this._dados;

    // Cabeçalho
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório do Call Center", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Médico: ${filtros.medico === "todos" ? "Todos" : filtros.medico}`,
      14,
      30,
    );
    doc.text(
      `Atendente: ${filtros.atendente === "todos" ? "Todos" : usuariosMap[filtros.atendente] || filtros.atendente}`,
      14,
      36,
    );
    doc.text(`Período: ${filtros.de} a ${filtros.ate}`, 14, 42);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 48);

    // Resumo geral
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Geral", 14, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Ativações: ${totais.ativacoes}`, 14, 66);
    doc.text(`Atendidos: ${totais.atendidos}`, 14, 72);
    doc.text(`Agendamentos: ${totais.reagendamentos}`, 14, 78);
    doc.text(`Taxa de Conversão: ${totais.conversao}%`, 14, 84);

    // Tabela principal de ativações
    doc.autoTable({
      startY: 92,
      head: [
        [
          "Data",
          "Paciente",
          "Médico",
          "Atendente",
          "Atendeu",
          "Agendou",
          "Data Agend.",
        ],
      ],
      body: filtrado.map((r) => [
        r._data ? formatarData(r._data) : "—",
        r.paciente || "—",
        r.medico || "—",
        usuariosMap[r.registrado_por] || r.registrado_por || "—",
        r.atendeu ? "Sim" : "Não",
        r.reagendou ? "Sim" : "Não",
        r.data_reagendamento ? formatarData(r.data_reagendamento) : "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Resumo por médico
    const yMed = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Resumo por Médico", 14, yMed);
    doc.autoTable({
      startY: yMed + 6,
      head: [["Médico", "Ativações", "Atendeu", "Agendou", "Conversão"]],
      body: porMedico.map((g) => [
        g.medico,
        g.ativacoes,
        g.atendeu,
        g.reagendou,
        g.conversao + "%",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] },
    });

    // Resumo por atendente
    const yAtend = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Resumo por Atendente", 14, yAtend);
    doc.autoTable({
      startY: yAtend + 6,
      head: [["Atendente", "Ativações", "Atendeu", "Agendou", "Conversão"]],
      body: porAtendente.map((g) => [
        usuariosMap[g._uid] || g.atendente,
        g.ativacoes,
        g.atendeu,
        g.reagendou,
        g.conversao + "%",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] },
    });

    doc.save(`relatorio-callcenter-${filtros.de}-${filtros.ate}.pdf`);
  },

  /** Exporta o relatório em Excel */
  exportarExcel() {
    if (!this._dados) {
      Alerts.aviso("Gere o relatório antes de exportar.");
      return;
    }
    const wb = XLSX.utils.book_new();
    const { filtros, filtrado, totais, porMedico, porAtendente, usuariosMap } =
      this._dados;

    // Aba 1: Ativações detalhadas
    const linhas = [
      ["RELATÓRIO DO CALL CENTER"],
      [`Médico: ${filtros.medico === "todos" ? "Todos" : filtros.medico}`],
      [
        `Atendente: ${filtros.atendente === "todos" ? "Todos" : usuariosMap[filtros.atendente] || filtros.atendente}`,
      ],
      [`Período: ${filtros.de} a ${filtros.ate}`],
      [`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`],
      [],
      ["RESUMO GERAL"],
      ["Ativações", totais.ativacoes],
      ["Atendidos", totais.atendidos],
      ["Agendamentos", totais.reagendamentos],
      ["Taxa de Conversão", totais.conversao + "%"],
      [],
      [
        "Data",
        "Paciente",
        "Médico",
        "Atendente",
        "Atendeu",
        "Agendou",
        "Data Agend.",
        "Observações",
      ],
      ...filtrado.map((r) => [
        r._data ? formatarData(r._data) : "—",
        r.paciente || "—",
        r.medico || "—",
        usuariosMap[r.registrado_por] || r.registrado_por || "—",
        r.atendeu ? "Sim" : "Não",
        r.reagendou ? "Sim" : "Não",
        r.data_reagendamento ? formatarData(r.data_reagendamento) : "—",
        r.observacoes || "—",
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(linhas),
      "Ativações",
    );

    // Aba 2: Resumo por médico
    const linhasMed = [
      ["RESUMO POR MÉDICO"],
      ["Médico", "Ativações", "Atendeu", "Agendou", "Conversão (%)"],
      ...porMedico.map((g) => [
        g.medico,
        g.ativacoes,
        g.atendeu,
        g.reagendou,
        g.conversao,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(linhasMed),
      "Por Médico",
    );

    // Aba 3: Resumo por atendente
    const linhasAtend = [
      ["RESUMO POR ATENDENTE"],
      ["Atendente", "Ativações", "Atendeu", "Agendou", "Conversão (%)"],
      ...porAtendente.map((g) => [
        usuariosMap[g._uid] || g.atendente,
        g.ativacoes,
        g.atendeu,
        g.reagendou,
        g.conversao,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(linhasAtend),
      "Por Atendente",
    );

    XLSX.writeFile(
      wb,
      `relatorio-callcenter-${filtros.de}-${filtros.ate}.xlsx`,
    );
  },
};

// ── Funções auxiliares de cálculo (usadas também no painel do módulo) ────────

/** Calcula totais gerais da lista de ativações */
function calcularTotaisCallCenter(registros) {
  const ativacoes = registros.length;
  const atendidos = registros.filter((r) => r.atendeu).length;
  const reagendamentos = registros.filter((r) => r.reagendou).length;
  const conversao =
    ativacoes > 0 ? Math.round((reagendamentos / ativacoes) * 100) : 0;
  return { ativacoes, atendidos, reagendamentos, conversao };
}

/** Agrupa ativações por médico e calcula métricas */
function calcularResumoPorMedico(registros) {
  const grupos = {};
  registros.forEach((r) => {
    const m = r.medico || "Não informado";
    if (!grupos[m])
      grupos[m] = { medico: m, ativacoes: 0, atendeu: 0, reagendou: 0 };
    grupos[m].ativacoes++;
    if (r.atendeu) grupos[m].atendeu++;
    if (r.reagendou) grupos[m].reagendou++;
  });
  return Object.values(grupos)
    .map((g) => ({
      ...g,
      conversao:
        g.ativacoes > 0 ? Math.round((g.reagendou / g.ativacoes) * 100) : 0,
    }))
    .sort((a, b) => b.ativacoes - a.ativacoes);
}

/** Agrupa ativações por atendente (uid) e calcula métricas */
function calcularResumoPorAtendente(registros) {
  const grupos = {};
  registros.forEach((r) => {
    const key = r.registrado_por || "desconhecido";
    if (!grupos[key])
      grupos[key] = {
        _uid: key,
        atendente: key,
        ativacoes: 0,
        atendeu: 0,
        reagendou: 0,
      };
    grupos[key].ativacoes++;
    if (r.atendeu) grupos[key].atendeu++;
    if (r.reagendou) grupos[key].reagendou++;
  });
  return Object.values(grupos)
    .map((g) => ({
      ...g,
      conversao:
        g.ativacoes > 0 ? Math.round((g.reagendou / g.ativacoes) * 100) : 0,
    }))
    .sort((a, b) => b.ativacoes - a.ativacoes);
}
