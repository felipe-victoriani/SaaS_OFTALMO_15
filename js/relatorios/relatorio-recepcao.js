// ================================================================
// js/relatorios/relatorio-recepcao.js — Relatório da Recepção
// ALTERAÇÃO 6: busca, cálculos, renderização e exportação do relatório
// ================================================================

/* global buscarIntervalo, formatarMoeda, formatarData, registrarAuditoria, XLSX */

const RelatorioRecepcao = {
  // Dados do último relatório gerado (para exportação)
  _dados: null,

  /**
   * Gera o relatório com os filtros informados e injeta o HTML no container.
   * @param {string} de        — data início YYYY-MM-DD
   * @param {string} ate       — data fim YYYY-MM-DD
   * @param {string} medico    — nome do médico ou "todos"
   * @param {string} origem    — origem ou "todas"
   * @param {HTMLElement} container — elemento onde o resultado será injetado
   */
  async gerar(de, ate, medico, origem, container) {
    // Indicar carregamento
    container.innerHTML = `
      <div class="loading-wrapper">
        <div class="spinner"></div>
        Gerando relatório…
      </div>`;

    // Buscar registros da recepção no intervalo
    const registros = await buscarIntervalo("pacientes", de, ate);

    // Aplicar filtros de médico e origem
    let filtrado = registros;
    if (medico !== "todos") {
      filtrado = filtrado.filter((r) => r.medico === medico);
    }
    if (origem !== "todas") {
      filtrado = filtrado.filter((r) => r.origem === origem);
    }

    // Calcular cards de totais por origem
    const cards = {
      Base: { n: 0, v: 0 },
      Indicação: { n: 0, v: 0 },
      Lead: { n: 0, v: 0 },
      Convênio: { n: 0, v: 0 },
      total: { n: 0, v: 0 },
    };
    filtrado.forEach((r) => {
      const v = parseFloat(r.valor) || 0;
      cards.total.n++;
      cards.total.v += v;
      const o = r.origem || "Base";
      if (cards[o]) {
        cards[o].n++;
        cards[o].v += v;
      } else {
        cards["Base"].n++;
        cards["Base"].v += v;
      }
    });

    // Agrupar por médico (para resumo)
    const porMedico = {};
    filtrado.forEach((r) => {
      const m = r.medico || "Não informado";
      if (!porMedico[m]) porMedico[m] = { n: 0, v: 0 };
      porMedico[m].n++;
      porMedico[m].v += parseFloat(r.valor) || 0;
    });

    // Armazena dados para exportação
    this._dados = { de, ate, medico, origem, filtrado, cards, porMedico };

    // Renderizar resultado
    this._renderResultado(container);

    // Registrar geração no log de auditoria
    await registrarAuditoria("gerar_relatorio", "recepcao", `${de}_${ate}`, {
      medico,
      origem,
      total: cards.total.n,
    });
  },

  /** Injeta o HTML do relatório no container */
  _renderResultado(container) {
    const d = this._dados;
    if (!d) return;

    const semDados = d.filtrado.length === 0;

    container.innerHTML = `
      <!-- Cards de totais -->
      <div class="cards-grid cards-grid-4 mb-3">
        <div class="card">
          <div class="card-metric">
            <span class="metric-label">Total Base</span>
            <span class="metric-value">${formatarMoeda(d.cards["Base"].v)}</span>
            <span style="font-size:.75rem;color:var(--text-secondary)">${d.cards["Base"].n} paciente${d.cards["Base"].n !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <span class="metric-label">Total Indicações</span>
            <span class="metric-value">${formatarMoeda(d.cards["Indicação"].v)}</span>
            <span style="font-size:.75rem;color:var(--text-secondary)">${d.cards["Indicação"].n} paciente${d.cards["Indicação"].n !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <span class="metric-label">Total Leads</span>
            <span class="metric-value">${formatarMoeda(d.cards["Lead"].v)}</span>
            <span style="font-size:.75rem;color:var(--text-secondary)">${d.cards["Lead"].n} paciente${d.cards["Lead"].n !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <span class="metric-label">Total Geral</span>
            <span class="metric-value" style="color:var(--accent)">${formatarMoeda(d.cards.total.v)}</span>
            <span style="font-size:.75rem;color:var(--text-secondary)">${d.cards.total.n} paciente${d.cards.total.n !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <!-- Tabela de atendimentos -->
      <div class="card mb-3">
        <div class="card-header">
          <span class="card-title">Atendimentos no Período</span>
        </div>
        <div class="table-scroll table-mobile-cards">
          <table class="data-table" id="rel-rec-tabela-atend" aria-label="Atendimentos da recepção">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Paciente</th>
                <th scope="col">Médico</th>
                <th scope="col">Tipo</th>
                <th scope="col">Origem</th>
                <th scope="col">Convênio</th>
                <th scope="col" class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${
                semDados
                  ? `<tr><td colspan="7"><div class="table-empty"><p>Nenhum atendimento no período com os filtros selecionados.</p></div></td></tr>`
                  : d.filtrado
                      .slice()
                      .sort((a, b) => a._data.localeCompare(b._data))
                      .map(
                        (r) => `
                <tr>
                  <td data-label="Data">${formatarData(r._data)}</td>
                  <td data-label="Paciente">${r.nome || "—"}</td>
                  <td data-label="Médico">${r.medico || "—"}</td>
                  <td data-label="Tipo">${r.tipo_atendimento || "—"}</td>
                  <td data-label="Origem">${r.origem || "—"}</td>
                  <td data-label="Convênio">${r.convenio || "—"}</td>
                  <td data-label="Valor" class="table-number">${formatarMoeda(r.valor)}</td>
                </tr>`,
                      )
                      .join("")
              }
            </tbody>
            ${
              !semDados
                ? `<tfoot>
              <tr style="background:var(--bg-secondary);font-weight:700">
                <td colspan="6">TOTAL (${d.filtrado.length} atendimento${d.filtrado.length !== 1 ? "s" : ""})</td>
                <td class="table-number" style="color:var(--accent)">${formatarMoeda(d.cards.total.v)}</td>
              </tr>
            </tfoot>`
                : ""
            }
          </table>
        </div>
      </div>

      <!-- Resumo por médico (somente quando filtro = Todos os Médicos) -->
      ${
        d.medico === "todos" && Object.keys(d.porMedico).length > 0
          ? `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Resumo por Médico</span>
        </div>
        <div class="table-scroll">
          <table class="data-table" id="rel-rec-tabela-medico" aria-label="Resumo por médico">
            <thead>
              <tr>
                <th scope="col">Médico</th>
                <th scope="col" class="text-right">Atendimentos</th>
                <th scope="col" class="text-right">Receita Recepção</th>
                <th scope="col" class="text-right">% do Total</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(d.porMedico)
                .sort()
                .map((m) => {
                  const pct =
                    d.cards.total.v > 0
                      ? ((d.porMedico[m].v / d.cards.total.v) * 100).toFixed(1)
                      : "0.0";
                  return `
                  <tr>
                    <td><strong>${m}</strong></td>
                    <td class="table-number">${d.porMedico[m].n}</td>
                    <td class="table-number">${formatarMoeda(d.porMedico[m].v)}</td>
                    <td class="table-number">${pct}%</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`
          : ""
      }
    `;
  },

  /** Exporta o relatório em PDF */
  exportarPDF() {
    const d = this._dados;
    if (!d) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Cabeçalho com filtros aplicados
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Recepção", 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Período: ${formatarData(d.de)} a ${formatarData(d.ate)}  |  Médico: ${d.medico === "todos" ? "Todos" : d.medico}  |  Origem: ${d.origem === "todas" ? "Todas" : d.origem}`,
      14,
      22,
    );
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 27);

    // Cards de totais
    doc.autoTable({
      startY: 32,
      head: [["Total Base", "Total Indicações", "Total Leads", "Total Geral"]],
      body: [
        [
          `${formatarMoeda(d.cards["Base"].v)} (${d.cards["Base"].n})`,
          `${formatarMoeda(d.cards["Indicação"].v)} (${d.cards["Indicação"].n})`,
          `${formatarMoeda(d.cards["Lead"].v)} (${d.cards["Lead"].n})`,
          `${formatarMoeda(d.cards.total.v)} (${d.cards.total.n})`,
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    // Tabela de atendimentos
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [
        ["Data", "Paciente", "Médico", "Tipo", "Origem", "Convênio", "Valor"],
      ],
      body: d.filtrado
        .slice()
        .sort((a, b) => a._data.localeCompare(b._data))
        .map((r) => [
          formatarData(r._data),
          r.nome || "—",
          r.medico || "—",
          r.tipo_atendimento || "—",
          r.origem || "—",
          r.convenio || "—",
          formatarMoeda(r.valor),
        ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [100, 116, 139] },
    });

    // Resumo por médico (quando filtro = Todos)
    if (d.medico === "todos" && Object.keys(d.porMedico).length > 0) {
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [["Médico", "Atendimentos", "Receita Recepção", "% do Total"]],
        body: Object.keys(d.porMedico)
          .sort()
          .map((m) => [
            m,
            d.porMedico[m].n,
            formatarMoeda(d.porMedico[m].v),
            d.cards.total.v > 0
              ? ((d.porMedico[m].v / d.cards.total.v) * 100).toFixed(1) + "%"
              : "0%",
          ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [5, 150, 105] },
      });
    }

    // Nome do arquivo: relatorio-recepcao-{dataInicio}-{dataFim}.pdf
    const nomeDe = d.de.replace(/-/g, "");
    const nomeAte = d.ate.replace(/-/g, "");
    doc.save(`relatorio-recepcao-${nomeDe}-${nomeAte}.pdf`);
  },

  /** Exporta o relatório em Excel */
  exportarExcel() {
    const d = this._dados;
    if (!d) return;

    const wb = XLSX.utils.book_new();

    // Aba "Atendimentos"
    const wsAtend = XLSX.utils.aoa_to_sheet([
      [`Relatório de Recepção — ${d.de} a ${d.ate}`],
      [
        `Médico: ${d.medico === "todos" ? "Todos" : d.medico}  |  Origem: ${d.origem === "todas" ? "Todas" : d.origem}`,
      ],
      [],
      [
        "Data",
        "Paciente",
        "Médico",
        "Tipo",
        "Origem",
        "Convênio",
        "Valor (R$)",
      ],
      ...d.filtrado
        .slice()
        .sort((a, b) => a._data.localeCompare(b._data))
        .map((r) => [
          r._data,
          r.nome || "",
          r.medico || "",
          r.tipo_atendimento || "",
          r.origem || "",
          r.convenio || "",
          parseFloat(r.valor) || 0,
        ]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsAtend, "Atendimentos");

    // Aba "Resumo por Médico"
    const wsMed = XLSX.utils.aoa_to_sheet([
      ["Resumo por Médico"],
      [],
      ["Médico", "Atendimentos", "Receita Recepção (R$)", "% do Total"],
      ...Object.keys(d.porMedico)
        .sort()
        .map((m) => [
          m,
          d.porMedico[m].n,
          d.porMedico[m].v,
          d.cards.total.v > 0
            ? +((d.porMedico[m].v / d.cards.total.v) * 100).toFixed(1)
            : 0,
        ]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsMed, "Resumo por Médico");

    // Nome do arquivo: relatorio-recepcao-{dataInicio}-{dataFim}.xlsx
    const nomeDe = d.de.replace(/-/g, "");
    const nomeAte = d.ate.replace(/-/g, "");
    XLSX.writeFile(wb, `relatorio-recepcao-${nomeDe}-${nomeAte}.xlsx`);
  },
};
