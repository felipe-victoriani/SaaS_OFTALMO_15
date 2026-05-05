// ================================================================
// export.js — Exportação de Tabelas para PDF e Excel
// ================================================================

const NOME_CLINICA = "Gestão Clínica Oftalmológica";

/**
 * Exporta uma tabela HTML para um arquivo Excel (.xlsx) usando SheetJS.
 * Inclui cabeçalho com nome da clínica e data de geração.
 * @param {string} tableId - ID da tabela HTML
 * @param {string} nomeArquivo - nome do arquivo sem extensão
 */
function exportToExcel(tableId, nomeArquivo) {
  const tabela = document.getElementById(tableId);
  if (!tabela) {
    Alerts.erro("Tabela não encontrada para exportação.");
    return;
  }

  try {
    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Linha de cabeçalho com nome da clínica
    const aoa = [];
    aoa.push([NOME_CLINICA]);
    aoa.push([`Gerado em: ${new Date().toLocaleString("pt-BR")}`]);
    aoa.push([]); // linha vazia

    // Extrair cabeçalhos da tabela
    const headers = [];
    tabela.querySelectorAll("thead th").forEach((th) => {
      headers.push(th.textContent.trim());
    });
    aoa.push(headers);

    // Extrair linhas de dados
    tabela.querySelectorAll("tbody tr").forEach((tr) => {
      // Ignorar linhas de "vazio" ou rodapé de total se tiverem classe especial
      if (tr.classList.contains("table-empty-row")) return;
      const linha = [];
      tr.querySelectorAll("td").forEach((td) => {
        // Remover tags HTML (badges, botões de ação)
        linha.push(td.textContent.trim());
      });
      aoa.push(linha);
    });

    // Criar planilha
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Mesclar células do cabeçalho
    if (headers.length > 1) {
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      ];
    }

    // Largura automática das colunas
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...aoa.slice(3).map((row) => String(row[i] || "").length),
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${nomeArquivo}_${hoje()}.xlsx`);
    Alerts.sucesso("Arquivo Excel exportado com sucesso!");
  } catch (err) {
    console.error("[export] Excel:", err);
    Alerts.erro("Erro ao exportar Excel. Verifique o console.");
  }
}

/**
 * Exporta uma tabela HTML para PDF usando jsPDF + autoTable.
 * Inclui nome da clínica, título e data de geração no topo.
 * @param {string} tableId - ID da tabela HTML
 * @param {string} titulo - título do relatório
 * @param {string} nomeArquivo - nome do arquivo sem extensão
 */
function exportToPDF(tableId, titulo, nomeArquivo) {
  const tabela = document.getElementById(tableId);
  if (!tabela) {
    Alerts.erro("Tabela não encontrada para exportação.");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Cabeçalho do documento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(NOME_CLINICA, 14, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(titulo, 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);
    doc.setTextColor(0);

    // Extrair cabeçalhos
    const headers = [];
    tabela.querySelectorAll("thead th").forEach((th) => {
      headers.push(th.textContent.trim());
    });

    // Extrair linhas
    const rows = [];
    tabela.querySelectorAll("tbody tr").forEach((tr) => {
      if (tr.classList.contains("table-empty-row")) return;
      const linha = [];
      tr.querySelectorAll("td").forEach((td) => {
        linha.push(td.textContent.trim());
      });
      rows.push(linha);
    });

    // Gerar tabela com autoTable
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 33,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    // Rodapé com número de página
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${totalPages}`,
        doc.internal.pageSize.getWidth() - 30,
        doc.internal.pageSize.getHeight() - 8,
      );
    }

    doc.save(`${nomeArquivo}_${hoje()}.pdf`);
    Alerts.sucesso("Arquivo PDF exportado com sucesso!");
  } catch (err) {
    console.error("[export] PDF:", err);
    Alerts.erro("Erro ao exportar PDF. Verifique o console.");
  }
}

/**
 * Renderiza um botão dropdown de exportação (PDF/Excel).
 * @param {string} tableId - ID da tabela alvo
 * @param {string} titulo - título do relatório PDF
 * @param {string} nomeArquivo - base do nome do arquivo
 * @returns {HTMLElement} elemento do dropdown
 */
function criarBotaoExportar(tableId, titulo, nomeArquivo) {
  const wrapper = document.createElement("div");
  wrapper.className = "export-dropdown";
  wrapper.innerHTML = `
    <button class="btn btn-secondary btn-sm" id="btn-export-toggle-${tableId}" aria-haspopup="true" aria-expanded="false">
      <i data-lucide="download" width="16" height="16" aria-hidden="true"></i>
      Exportar
    </button>
    <div class="export-menu" id="export-menu-${tableId}" role="menu">
      <button class="export-menu-item" data-action="excel" role="menuitem">
        <i data-lucide="file-spreadsheet" width="16" height="16" aria-hidden="true"></i>
        Excel (.xlsx)
      </button>
      <button class="export-menu-item" data-action="pdf" role="menuitem">
        <i data-lucide="file-text" width="16" height="16" aria-hidden="true"></i>
        PDF
      </button>
    </div>
  `;

  const toggle = wrapper.querySelector(`#btn-export-toggle-${tableId}`);
  const menu = wrapper.querySelector(`#export-menu-${tableId}`);

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const aberto = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", aberto ? "true" : "false");
  });

  // Fechar ao clicar fora
  document.addEventListener("click", () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });

  wrapper
    .querySelector('[data-action="excel"]')
    .addEventListener("click", () => {
      menu.classList.remove("open");
      exportToExcel(tableId, nomeArquivo);
    });

  wrapper.querySelector('[data-action="pdf"]').addEventListener("click", () => {
    menu.classList.remove("open");
    exportToPDF(tableId, titulo, nomeArquivo);
  });

  lucide.createIcons({ nodes: [wrapper] });
  return wrapper;
}
