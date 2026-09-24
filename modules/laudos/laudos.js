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
      titulo: "Imprimir Laudo CASSEMS",
      icone: "printer",
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
          label: "Gerar e Imprimir",
          classe: "btn-primary",
          id: "laudo-confirmar",
          icone: "printer",
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
    this._imprimirCassems(nome);
  },

  /**
   * Monta o formulário CASSEMS numa área fora do #app-shell (para não
   * disputar CSS de impressão com o layout do sistema) e dispara
   * window.print(). A área é removida assim que a impressão termina ou
   * é cancelada (evento afterprint), então nunca fica "presa" no DOM.
   * @param {string} nomePaciente
   */
  _imprimirCassems(nomePaciente) {
    const dataHoje = new Date().toLocaleDateString("pt-BR");

    document.getElementById("laudo-print-area")?.remove();

    const area = document.createElement("div");
    area.id = "laudo-print-area";
    area.innerHTML = this._templateCassems(nomePaciente, dataHoje);
    document.body.appendChild(area);

    const limpar = () => {
      area.remove();
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);

    // Pequeno atraso para garantir que o navegador pintou o layout antes do print.
    setTimeout(() => window.print(), 50);
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
