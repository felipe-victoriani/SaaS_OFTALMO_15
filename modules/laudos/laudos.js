// ================================================================
// laudos.js — Módulo Laudos (modelos de formulário para impressão)
// ================================================================

window.Modules = window.Modules || {};

window.Modules.laudos = {
  mount(container) {
    if (!exigirPermissao("laudos", container)) return;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
  },

  _bindEventos(container) {
    container
      .querySelector("#btn-imprimir-cassems")
      ?.addEventListener("click", () => this._solicitarNomeEImprimir());
  },

  /**
   * Abre o modal padrão do sistema pedindo o nome do paciente antes de
   * gerar a impressão do formulário CASSEMS.
   */
  _solicitarNomeEImprimir() {
    Modal.abrirModal({
      titulo: "Gerar Laudo CASSEMS (PDF)",
      icone: "file-down",
      tamanho: "sm",
      corpo: `
        <div class="form-group">
          <label class="form-label required" for="laudo-nome-paciente">
            Nome do paciente
          </label>
          <input
            type="text"
            id="laudo-nome-paciente"
            class="form-input"
            maxlength="150"
            autocomplete="off"
            required
          />
        </div>
      `,
      botoes: [
        {
          label: "Cancelar",
          classe: "btn-secondary",
          id: "laudo-cancelar",
          onClick: () => Modal.fecharModal(),
        },
        {
          label: "Gerar PDF",
          classe: "btn-primary",
          id: "laudo-confirmar",
          icone: "file-down",
          onClick: () => this._confirmarImpressao(),
        },
      ],
    });

    // Permitir confirmar com Enter direto no campo de nome.
    const input = document.getElementById("laudo-nome-paciente");
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this._confirmarImpressao();
      }
    });
  },

  _confirmarImpressao() {
    const input = document.getElementById("laudo-nome-paciente");
    const nome = (input?.value || "").trim();
    if (!nome) {
      Alerts.aviso("Informe o nome do paciente.");
      input?.focus();
      return;
    }
    Modal.fecharModal();
    this._gerarPdfCassems(nome);
  },

  /**
   * Monta o formulário CASSEMS numa área fora da tela (para não aparecer
   * na interface) e usa jsPDF + html2canvas para gerar um arquivo PDF de
   * verdade, que é baixado diretamente — sem passar por window.print().
   * Isso evita o cabeçalho/rodapé padrão do navegador (que mostraria a
   * URL do app, ex: 127.0.0.1:5500/app.html) na folha impressa.
   * @param {string} nomePaciente
   */
  async _gerarPdfCassems(nomePaciente) {
    const dataHoje = new Date().toLocaleDateString("pt-BR");

    document.getElementById("laudo-print-area")?.remove();

    const area = document.createElement("div");
    area.id = "laudo-print-area";
    area.innerHTML = this._templateCassems(nomePaciente, dataHoje);
    document.body.appendChild(area);

    const folha = area.querySelector(".cassems-folha");

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margemMm = 10;
      const larguraMm = doc.internal.pageSize.getWidth() - margemMm * 2;

      await doc.html(folha, {
        x: margemMm,
        y: margemMm,
        width: larguraMm,
        windowWidth: 800,
        autoPaging: "text",
      });

      const nomeArquivo = `laudo_cassems_${nomePaciente
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "_")}_${hoje()}`;
      doc.save(`${nomeArquivo}.pdf`);
      Alerts.sucesso("PDF do laudo gerado com sucesso!");
    } catch (err) {
      console.error("[laudos] Erro ao gerar PDF:", err);
      Alerts.erro("Erro ao gerar o PDF do laudo. Verifique o console.");
    } finally {
      area.remove();
    }
  },

  /**
   * HTML do formulário CASSEMS, fiel ao modelo oficial em PDF.
   * Nome do paciente e data vêm preenchidos; o restante fica em branco
   * para o médico preencher manualmente após a impressão.
   * @param {string} nomePaciente
   * @param {string} dataHoje - já formatada como DD/MM/AAAA
   * @returns {string}
   */
  _templateCassems(nomePaciente, dataHoje) {
    const nomeEscapado = escapeHtml(nomePaciente);

    const hipoteses = [
      "Retinopatia Diabética",
      "Degeneração Macular Relacionada à Idade (DMRI)",
      "Oclusão Venosa Retiniana",
      "Distrofias",
      "Membrana Epirretiniana",
      "Membrana Neovascular Sub-Retiniana",
      "Edema Macular",
      "Buraco Macular",
      "Diagnóstico Confirmado de Glaucoma",
      "Afinamento do Anel Neural",
    ];

    const linhasHipoteses = hipoteses
      .map(
        (h) => `
        <tr>
          <td class="cassems-td-label">${h}</td>
          <td class="cassems-td-simnao">( &nbsp;) Sim &nbsp; ( &nbsp;) Não</td>
        </tr>`,
      )
      .join("");

    return `
      <div class="cassems-folha">
        <header class="cassems-cabecalho">
          <p class="cassems-marca">CASSEMS</p>
          <p class="cassems-marca-sub">
            Caixa de Assistência dos Servidores do Estado de Mato Grosso do Sul
          </p>
          <h1 class="cassems-titulo">
            Formulário para Solicitação de Tomografia de Coerência Óptica
          </h1>
        </header>

        <table class="cassems-tabela cassems-tabela-topo">
          <tbody>
            <tr>
              <td class="cassems-td-rotulo">Beneficiário:</td>
              <td class="cassems-td-valor">${nomeEscapado}</td>
              <td class="cassems-td-rotulo cassems-td-rotulo-estreito">Idade:</td>
              <td class="cassems-td-valor"></td>
            </tr>
            <tr>
              <td class="cassems-td-rotulo">Matrícula CASSEMS:</td>
              <td class="cassems-td-valor" colspan="3"></td>
            </tr>
          </tbody>
        </table>

        <table class="cassems-tabela cassems-tabela-hipoteses">
          <thead>
            <tr>
              <th colspan="2">Hipótese Diagnóstica:</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHipoteses}
            <tr>
              <td colspan="2" class="cassems-td-outras">
                <p>Outras Hipóteses Diagnósticas – Mencionar Quais:</p>
                <div class="cassems-linha-preenchimento"></div>
                <div class="cassems-linha-preenchimento"></div>
              </td>
            </tr>
          </tbody>
        </table>

        <table class="cassems-tabela cassems-tabela-pergunta">
          <tbody>
            <tr>
              <td class="cassems-td-pergunta" colspan="2">
                <p class="cassems-pergunta-titulo">Suspeita de Glaucoma?</p>
                <p class="cassems-pergunta-opcoes">( &nbsp;) Sim &nbsp;&nbsp; ( &nbsp;) Não</p>
              </td>
            </tr>
            <tr>
              <td colspan="2" class="cassems-td-detalhe">
                <p>Se sim, informar:</p>
                <p>
                  Escavação do Disco Óptico OD:<span class="cassems-linha-curta"></span>
                  OE:<span class="cassems-linha-curta"></span>
                </p>
              </td>
            </tr>
            <tr>
              <td class="cassems-td-pergunta" colspan="2">
                <p class="cassems-pergunta-titulo">Hipertensão Ocular?</p>
                <p class="cassems-pergunta-opcoes">( &nbsp;) Sim &nbsp;&nbsp; ( &nbsp;) Não</p>
              </td>
            </tr>
            <tr>
              <td colspan="2" class="cassems-td-detalhe">
                <p>Se sim, informar:</p>
                <p>
                  PIO OD:<span class="cassems-linha-curta"></span>
                  &nbsp;&nbsp;&nbsp; PIO OE:<span class="cassems-linha-curta"></span>
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        <p class="cassems-obs">
          *Obs: É obrigatório o preenchimento de todos os campos para análise
          da auditoria médica.
        </p>

        <footer class="cassems-rodape">
          <p class="cassems-rodape-data">Data: ${dataHoje}</p>
          <div class="cassems-assinatura">
            <div class="cassems-linha-assinatura"></div>
            <p class="cassems-carimbo-nome">Dr. Dante Orondjian Verardo</p>
            <p class="cassems-carimbo-info">Médico Oftalmologista</p>
            <p class="cassems-carimbo-info">CRM/MS 5858 – RQE 4243</p>
          </div>
        </footer>

        <p class="cassems-endereco">
          Rua Antônio Maria Coelho, 6065 – Vivendas do Bosque – Campo Grande –
          MS – CEP 79021-170<br />
          (67) 3314-1010 – www.cassems.com.br
        </p>
      </div>
    `;
  },
};
