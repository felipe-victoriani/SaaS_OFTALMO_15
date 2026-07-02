// ================================================================
// marketing.js — Módulo Campanhas de Marketing
// ================================================================

window.Modules = window.Modules || {};

window.Modules.marketing = {
  _cancelarEscuta: null,
  _cancelarEscutaContatos: null,
  _campanhas: {},
  _campanhaAtiva: null, // ID da campanha sendo visualizada (contatos)

  mount(container) {
    if (!exigirPermissao("marketing", container)) return;
    this.render(container);
  },

  render(container) {
    container.innerHTML = `
      <div class="page-content">
        <div class="module-header">
          <h1 class="module-title">
            <i data-lucide="megaphone" width="24" height="24" aria-hidden="true"></i>
            Marketing — Campanhas
          </h1>
          <p class="module-subtitle">Gestão de campanhas de reativação e fidelização de pacientes</p>
        </div>

        <!-- Cards de resumo -->
        <div class="cards-grid cards-grid-4" id="cards-mkt">
          ${this._renderCards(0, 0, 0, 0)}
        </div>

        <!-- Layout: formulário + lista de campanhas -->
        <div class="module-grid">

          <!-- Formulário de campanha -->
          <div>
            <div class="form-section">
              <h2 class="form-section-title">
                <i data-lucide="plus-circle" width="18" height="18" aria-hidden="true"></i>
                <span id="form-mkt-titulo">Nova Campanha</span>
              </h2>
              <form id="form-campanha" novalidate>
                <div class="form-grid">

                  <div class="form-group full-width">
                    <label class="form-label" for="mkt-nome">Nome da Campanha <span class="required">*</span></label>
                    <input type="text" id="mkt-nome" class="form-input" placeholder="Ex: Reativação Junho 2026" required>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="mkt-tipo">Tipo <span class="required">*</span></label>
                    <select id="mkt-tipo" class="form-input" required>
                      <option value="">Selecione…</option>
                      <option value="reativacao">Reativação de Pacientes</option>
                      <option value="aniversario">Aniversariantes</option>
                      <option value="promocao">Promoção / Desconto</option>
                      <option value="pos_consulta">Pós-Consulta</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="mkt-status">Status</label>
                    <select id="mkt-status" class="form-input">
                      <option value="rascunho">Rascunho</option>
                      <option value="ativa">Ativa</option>
                      <option value="concluida">Concluída</option>
                      <option value="pausada">Pausada</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="mkt-inicio">Data de Início</label>
                    <input type="date" id="mkt-inicio" class="form-input">
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="mkt-fim">Data de Fim</label>
                    <input type="date" id="mkt-fim" class="form-input">
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label" for="mkt-objetivo">Objetivo / Descrição</label>
                    <textarea id="mkt-objetivo" class="form-textarea" rows="3" placeholder="Descreva o objetivo da campanha…"></textarea>
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label" for="mkt-msg-whatsapp">
                      <i data-lucide="message-circle" width="14" height="14" style="vertical-align:-2px;color:#25D366"></i>
                      Mensagem WhatsApp
                    </label>
                    <textarea id="mkt-msg-whatsapp" class="form-textarea" rows="3" placeholder="Ex: Olá {nome}, temos uma novidade especial para você! Entre em contato conosco. — {campanha}"></textarea>
                    <p style="font-size:0.72rem;color:var(--text-tertiary);margin:0.25rem 0 0">Use <strong>{nome}</strong> para o nome do contato e <strong>{campanha}</strong> para o nome da campanha.</p>
                  </div>

                </div>

                <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
                  <button type="submit" class="btn btn-primary" style="flex:1" id="btn-salvar-mkt">
                    <i data-lucide="save" width="16" height="16" aria-hidden="true"></i>
                    <span id="btn-mkt-txt">Salvar Campanha</span>
                  </button>
                  <button type="button" class="btn btn-ghost" id="btn-cancelar-mkt" style="display:none">
                    Cancelar
                  </button>
                </div>
                <input type="hidden" id="mkt-edit-id">
              </form>
            </div>
          </div>

          <!-- Tabela de campanhas -->
          <div>
            <div class="table-container">
              <div class="table-toolbar">
                <span class="table-toolbar-title">Campanhas</span>
                <div style="display:flex;gap:0.5rem;align-items:center">
                  <select id="filtro-status-mkt" class="filter-input" style="width:auto">
                    <option value="todos">Todos os status</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="ativa">Ativa</option>
                    <option value="concluida">Concluída</option>
                    <option value="pausada">Pausada</option>
                  </select>
                </div>
              </div>
              <div class="table-scroll table-mobile-cards">
                <table class="data-table" id="tabela-campanhas" aria-label="Lista de campanhas">
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Status</th>
                      <th scope="col">Período</th>
                      <th scope="col">Contatos</th>
                      <th scope="col">Conversão</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody id="tbody-campanhas">
                    <tr><td colspan="7"><div class="loading-wrapper"><div class="spinner"></div>Carregando…</div></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Painel de contatos da campanha (oculto por padrão) -->
        <div id="painel-contatos" style="display:none;margin-top:1.5rem">
          <div class="table-container">
            <div class="table-toolbar">
              <div>
                <span class="table-toolbar-title" id="titulo-painel-contatos">Contatos da Campanha</span>
                <p style="font-size:0.75rem;color:var(--text-tertiary);margin:0.1rem 0 0" id="subtitulo-painel-contatos"></p>
              </div>
              <div style="display:flex;gap:0.5rem;align-items:center">
                <button class="btn btn-primary btn-sm" id="btn-add-contato">
                  <i data-lucide="user-plus" width="14" height="14" aria-hidden="true"></i>
                  Adicionar Contato
                </button>
                <button class="btn btn-ghost btn-sm" id="btn-fechar-painel">
                  <i data-lucide="x" width="14" height="14" aria-hidden="true"></i>
                  Fechar
                </button>
              </div>
            </div>

            <!-- Formulário inline de contato -->
            <div id="form-contato-wrapper" style="display:none;padding:1rem;border-bottom:1px solid var(--border-light)">
              <form id="form-contato" novalidate>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:flex-end">
                  <div class="form-group" style="flex:1;min-width:160px;margin:0">
                    <label class="form-label" for="ct-nome">Nome <span class="required">*</span></label>
                    <input type="text" id="ct-nome" class="form-input" required>
                  </div>
                  <div class="form-group" style="flex:1;min-width:140px;margin:0">
                    <label class="form-label" for="ct-telefone">Telefone <span class="required">*</span></label>
                    <input type="tel" id="ct-telefone" class="form-input" placeholder="(00) 00000-0000" required>
                  </div>
                  <div class="form-group" style="flex:1;min-width:140px;margin:0">
                    <label class="form-label" for="ct-status">Status</label>
                    <select id="ct-status" class="form-input">
                      <option value="pendente">Pendente</option>
                      <option value="contactado">Contactado</option>
                      <option value="convertido">Convertido</option>
                      <option value="sem_retorno">Sem Retorno</option>
                    </select>
                  </div>
                  <div class="form-group" style="flex:2;min-width:180px;margin:0">
                    <label class="form-label" for="ct-obs">Observação</label>
                    <input type="text" id="ct-obs" class="form-input" placeholder="Opcional…">
                  </div>
                  <div style="display:flex;gap:0.5rem">
                    <button type="submit" class="btn btn-primary btn-sm">
                      <i data-lucide="save" width="14" height="14" aria-hidden="true"></i>
                      <span id="btn-ct-txt">Salvar</span>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" id="btn-cancelar-ct">Cancelar</button>
                  </div>
                  <input type="hidden" id="ct-edit-id">
                </div>
              </form>
            </div>

            <div class="table-scroll">
              <table class="data-table" id="tabela-contatos" aria-label="Contatos da campanha">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">Telefone</th>
                    <th scope="col">Status</th>
                    <th scope="col">Observação</th>
                    <th scope="col">WhatsApp</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody id="tbody-contatos">
                  <tr><td colspan="5"><div class="loading-wrapper"><div class="spinner"></div>Carregando…</div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    `;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._iniciarEscuta();
  },

  // ── Cards ──────────────────────────────────────────────────────

  _renderCards(total, ativas, contatos, convertidos) {
    const taxa = contatos > 0 ? Math.round((convertidos / contatos) * 100) : 0;
    return `
      <div class="card">
        <div class="card-header">
          <span class="card-label">Campanhas</span>
          <div class="card-icon icon-blue"><i data-lucide="megaphone" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="mkt-total">${total}</div>
        <div class="card-meta">cadastradas</div>
        <div class="card-bar bar-accent"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Ativas</span>
          <div class="card-icon icon-green"><i data-lucide="zap" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="mkt-ativas">${ativas}</div>
        <div class="card-meta">em andamento</div>
        <div class="card-bar bar-success"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Contatos</span>
          <div class="card-icon icon-yellow"><i data-lucide="users" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="mkt-contatos">${contatos}</div>
        <div class="card-meta">em campanhas ativas</div>
        <div class="card-bar bar-warning"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Conversão</span>
          <div class="card-icon icon-blue"><i data-lucide="trending-up" width="18" height="18" aria-hidden="true"></i></div>
        </div>
        <div class="card-value" id="mkt-taxa">${taxa}%</div>
        <div class="card-meta">convertidos / contatos</div>
        <div class="card-bar bar-info"></div>
      </div>
    `;
  },

  _atualizarCards(campanhas) {
    const lista = Object.values(campanhas);
    const total = lista.length;
    const ativas = lista.filter((c) => c.status === "ativa").length;

    // Contatos e convertidos apenas de campanhas ativas
    let contatos = 0;
    let convertidos = 0;
    lista
      .filter((c) => c.status === "ativa")
      .forEach((c) => {
        const cts = c.contatos ? Object.values(c.contatos) : [];
        contatos += cts.length;
        convertidos += cts.filter((ct) => ct.status === "convertido").length;
      });

    const taxa = contatos > 0 ? Math.round((convertidos / contatos) * 100) : 0;
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("mkt-total", total);
    set("mkt-ativas", ativas);
    set("mkt-contatos", contatos);
    set("mkt-taxa", taxa + "%");
  },

  // ── Firebase ───────────────────────────────────────────────────

  _iniciarEscuta() {
    if (this._cancelarEscuta) this._cancelarEscuta();

    this._cancelarEscuta = escutar("campanhas", (dados) => {
      this._campanhas = dados || {};
      this._renderTabela(this._campanhas);
      this._atualizarCards(this._campanhas);

      // Atualizar painel de contatos se estiver aberto
      if (this._campanhaAtiva && this._campanhas[this._campanhaAtiva]) {
        this._renderContatos(this._campanhas[this._campanhaAtiva]);
      }
    });
    registrarListener(this._cancelarEscuta);
  },

  // ── Tabela de Campanhas ────────────────────────────────────────

  _renderTabela(campanhas) {
    const tbody = document.getElementById("tbody-campanhas");
    if (!tbody) return;

    const filtro =
      document.getElementById("filtro-status-mkt")?.value || "todos";
    let lista = Object.entries(campanhas).map(([id, c]) => ({ id, ...c }));

    if (filtro !== "todos") {
      lista = lista.filter((c) => c.status === filtro);
    }

    // Ordenar: ativas primeiro, depois por criado_em desc
    lista.sort((a, b) => {
      const ordemStatus = { ativa: 0, rascunho: 1, pausada: 2, concluida: 3 };
      const diff = (ordemStatus[a.status] ?? 9) - (ordemStatus[b.status] ?? 9);
      return diff !== 0 ? diff : (b.criado_em || 0) - (a.criado_em || 0);
    });

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="table-empty"><i data-lucide="inbox" width="32" height="32" aria-hidden="true"></i><p>Nenhuma campanha encontrada.</p></div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      return;
    }

    tbody.innerHTML = lista
      .map((c) => {
        const contatos = c.contatos ? Object.values(c.contatos) : [];
        const convertidos = contatos.filter(
          (ct) => ct.status === "convertido",
        ).length;
        const taxa =
          contatos.length > 0
            ? Math.round((convertidos / contatos.length) * 100)
            : 0;

        const periodo =
          c.data_inicio && c.data_fim
            ? `${this._formatarData(c.data_inicio)} → ${this._formatarData(c.data_fim)}`
            : c.data_inicio
              ? `A partir de ${this._formatarData(c.data_inicio)}`
              : "—";

        return `
        <tr>
          <td>
            <div style="font-weight:500">${this._esc(c.nome)}</div>
            ${c.objetivo ? `<div style="font-size:0.75rem;color:var(--text-tertiary)">${this._esc(c.objetivo.substring(0, 60))}${c.objetivo.length > 60 ? "…" : ""}</div>` : ""}
          </td>
          <td>${this._badgeTipo(c.tipo)}</td>
          <td>${this._badgeStatus(c.status)}</td>
          <td style="font-size:0.8rem;white-space:nowrap">${periodo}</td>
          <td style="text-align:center">${contatos.length}</td>
          <td style="text-align:center">
            ${
              contatos.length > 0
                ? `<span style="font-size:0.8rem">${convertidos}/${contatos.length} (${taxa}%)</span>`
                : "—"
            }
          </td>
          <td>
            <div style="display:flex;gap:0.4rem">
              <button class="btn btn-ghost btn-sm btn-contatos" data-id="${c.id}" title="Ver Contatos" aria-label="Ver contatos da campanha ${this._esc(c.nome)}">
                <i data-lucide="users" width="14" height="14" aria-hidden="true"></i>
              </button>
              <button class="btn btn-ghost btn-sm btn-editar-campanha" data-id="${c.id}" title="Editar" aria-label="Editar campanha">
                <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
              </button>
              <button class="btn btn-ghost btn-sm btn-excluir-campanha" data-id="${c.id}" title="Excluir" aria-label="Excluir campanha" style="color:var(--danger)">
                <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    lucide.createIcons({ nodes: [tbody] });
  },

  // ── Painel de Contatos ─────────────────────────────────────────

  _abrirPainelContatos(campanhaId) {
    const campanha = this._campanhas[campanhaId];
    if (!campanha) return;

    this._campanhaAtiva = campanhaId;

    const painel = document.getElementById("painel-contatos");
    const titulo = document.getElementById("titulo-painel-contatos");
    const subtitulo = document.getElementById("subtitulo-painel-contatos");

    if (titulo) titulo.textContent = `Contatos — ${campanha.nome}`;
    if (subtitulo)
      subtitulo.textContent = `${this._labelTipo(campanha.tipo)} · ${this._labelStatus(campanha.status)}`;
    if (painel) {
      painel.style.display = "block";
      painel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    this._renderContatos(campanha);
  },

  _fecharPainelContatos() {
    this._campanhaAtiva = null;
    const painel = document.getElementById("painel-contatos");
    if (painel) painel.style.display = "none";
    this._resetFormContato();
  },

  _renderContatos(campanha) {
    const tbody = document.getElementById("tbody-contatos");
    if (!tbody) return;

    const contatos = campanha.contatos
      ? Object.entries(campanha.contatos).map(([id, c]) => ({ id, ...c }))
      : [];

    if (contatos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="table-empty"><i data-lucide="user-x" width="32" height="32" aria-hidden="true"></i><p>Nenhum contato. Adicione o primeiro.</p></div></td></tr>`;
      lucide.createIcons({ nodes: [tbody] });
      return;
    }

    // Ordenar: pendente primeiro
    const ordemCt = {
      pendente: 0,
      contactado: 1,
      sem_retorno: 2,
      convertido: 3,
    };
    contatos.sort(
      (a, b) => (ordemCt[a.status] ?? 9) - (ordemCt[b.status] ?? 9),
    );

    tbody.innerHTML = contatos
      .map(
        (c) => `
      <tr>
        <td style="font-weight:500">${this._esc(c.nome)}</td>
        <td>${this._esc(c.telefone)}</td>
        <td>${this._badgeStatusContato(c.status)}</td>
        <td style="font-size:0.8rem;color:var(--text-secondary)">${c.obs ? this._esc(c.obs) : "—"}</td>
        <td>
          ${
            c.telefone
              ? `
          <button class="btn btn-ghost btn-sm btn-whatsapp-contato" data-id="${c.id}" title="Enviar WhatsApp" aria-label="Enviar WhatsApp para ${this._esc(c.nome)}" style="color:#25D366">
            <i data-lucide="message-circle" width="14" height="14" aria-hidden="true"></i>
          </button>`
              : "—"
          }
        </td>
        <td>
          <div style="display:flex;gap:0.4rem">
            <button class="btn btn-ghost btn-sm btn-editar-contato" data-id="${c.id}" title="Editar" aria-label="Editar contato">
              <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
            </button>
            <button class="btn btn-ghost btn-sm btn-excluir-contato" data-id="${c.id}" title="Excluir" aria-label="Excluir contato" style="color:var(--danger)">
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

  // ── Eventos ────────────────────────────────────────────────────

  _bindEventos(container) {
    // Form campanha
    const form = container.querySelector("#form-campanha");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      this._salvarCampanha();
    });

    // Cancelar edição campanha
    container
      .querySelector("#btn-cancelar-mkt")
      ?.addEventListener("click", () => {
        this._resetFormCampanha();
      });

    // Filtro status
    container
      .querySelector("#filtro-status-mkt")
      ?.addEventListener("change", () => {
        this._renderTabela(this._campanhas);
      });

    // Delegação de eventos na tabela de campanhas
    container
      .querySelector("#tabela-campanhas")
      ?.addEventListener("click", (e) => {
        const btnContatos = e.target.closest(".btn-contatos");
        const btnEditar = e.target.closest(".btn-editar-campanha");
        const btnExcluir = e.target.closest(".btn-excluir-campanha");

        if (btnContatos) this._abrirPainelContatos(btnContatos.dataset.id);
        if (btnEditar) this._editarCampanha(btnEditar.dataset.id);
        if (btnExcluir) this._excluirCampanha(btnExcluir.dataset.id);
      });

    // Painel contatos — fechar
    container
      .querySelector("#btn-fechar-painel")
      ?.addEventListener("click", () => {
        this._fecharPainelContatos();
      });

    // Painel contatos — adicionar contato
    container
      .querySelector("#btn-add-contato")
      ?.addEventListener("click", () => {
        this._resetFormContato();
        const wrapper = document.getElementById("form-contato-wrapper");
        if (wrapper) wrapper.style.display = "block";
        document.getElementById("ct-nome")?.focus();
      });

    // Form contato
    container
      .querySelector("#form-contato")
      ?.addEventListener("submit", (e) => {
        e.preventDefault();
        this._salvarContato();
      });

    // Cancelar form contato
    container
      .querySelector("#btn-cancelar-ct")
      ?.addEventListener("click", () => {
        this._resetFormContato();
        const wrapper = document.getElementById("form-contato-wrapper");
        if (wrapper) wrapper.style.display = "none";
      });

    // Delegação na tabela de contatos
    container
      .querySelector("#tabela-contatos")
      ?.addEventListener("click", (e) => {
        const btnWhatsApp = e.target.closest(".btn-whatsapp-contato");
        const btnEditar = e.target.closest(".btn-editar-contato");
        const btnExcluir = e.target.closest(".btn-excluir-contato");

        if (btnWhatsApp) this._enviarWhatsApp(btnWhatsApp.dataset.id);
        if (btnEditar) this._editarContato(btnEditar.dataset.id);
        if (btnExcluir) this._excluirContato(btnExcluir.dataset.id);
      });
  },

  // ── CRUD Campanhas ─────────────────────────────────────────────

  async _salvarCampanha() {
    const nome = document.getElementById("mkt-nome")?.value.trim();
    const tipo = document.getElementById("mkt-tipo")?.value;
    const status = document.getElementById("mkt-status")?.value || "rascunho";
    const data_inicio = document.getElementById("mkt-inicio")?.value || null;
    const data_fim = document.getElementById("mkt-fim")?.value || null;
    const objetivo =
      document.getElementById("mkt-objetivo")?.value.trim() || "";
    const mensagem_whatsapp =
      document.getElementById("mkt-msg-whatsapp")?.value.trim() || "";
    const editId = document.getElementById("mkt-edit-id")?.value;

    if (!nome || !tipo) {
      Alerts.aviso("Preencha nome e tipo da campanha.");
      return;
    }

    const btn = document.getElementById("btn-salvar-mkt");
    if (btn) btn.disabled = true;

    try {
      const dados = { nome, tipo, status, objetivo, mensagem_whatsapp };
      if (data_inicio) dados.data_inicio = data_inicio;
      if (data_fim) dados.data_fim = data_fim;

      if (editId) {
        // Manter contatos existentes ao editar
        const existente = this._campanhas[editId] || {};
        await salvar(`campanhas/${editId}`, {
          ...existente,
          ...dados,
          atualizado_em: agora(),
        });
        Alerts.sucesso("Campanha atualizada!");
      } else {
        await criar("campanhas", dados);
        Alerts.sucesso("Campanha criada com sucesso!");
      }
      this._resetFormCampanha();
    } catch (err) {
      console.error("[marketing] _salvarCampanha:", err);
      Alerts.erro("Erro ao salvar campanha.");
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  _editarCampanha(id) {
    const c = this._campanhas[id];
    if (!c) return;

    document.getElementById("mkt-edit-id").value = id;
    document.getElementById("mkt-nome").value = c.nome || "";
    document.getElementById("mkt-tipo").value = c.tipo || "";
    document.getElementById("mkt-status").value = c.status || "rascunho";
    document.getElementById("mkt-inicio").value = c.data_inicio || "";
    document.getElementById("mkt-fim").value = c.data_fim || "";
    document.getElementById("mkt-objetivo").value = c.objetivo || "";
    document.getElementById("mkt-msg-whatsapp").value =
      c.mensagem_whatsapp || "";

    const titulo = document.getElementById("form-mkt-titulo");
    if (titulo) titulo.textContent = "Editar Campanha";
    const btnTxt = document.getElementById("btn-mkt-txt");
    if (btnTxt) btnTxt.textContent = "Atualizar Campanha";
    const btnCancelar = document.getElementById("btn-cancelar-mkt");
    if (btnCancelar) btnCancelar.style.display = "inline-flex";

    document
      .getElementById("mkt-nome")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("mkt-nome")?.focus();
  },

  async _excluirCampanha(id) {
    const c = this._campanhas[id];
    if (!c) return;
    const contatos = c.contatos ? Object.keys(c.contatos).length : 0;
    const aviso =
      contatos > 0
        ? ` Esta campanha possui ${contatos} contato(s) que também serão removidos.`
        : "";
    if (!confirm(`Excluir a campanha "${c.nome}"?${aviso}`)) return;

    try {
      await remover(`campanhas/${id}`);
      if (this._campanhaAtiva === id) this._fecharPainelContatos();
      Alerts.sucesso("Campanha removida.");
    } catch (err) {
      console.error("[marketing] _excluirCampanha:", err);
      Alerts.erro("Erro ao excluir campanha.");
    }
  },

  _resetFormCampanha() {
    document.getElementById("form-campanha")?.reset();
    const editId = document.getElementById("mkt-edit-id");
    if (editId) editId.value = "";
    const titulo = document.getElementById("form-mkt-titulo");
    if (titulo) titulo.textContent = "Nova Campanha";
    const btnTxt = document.getElementById("btn-mkt-txt");
    if (btnTxt) btnTxt.textContent = "Salvar Campanha";
    const btnCancelar = document.getElementById("btn-cancelar-mkt");
    if (btnCancelar) btnCancelar.style.display = "none";
  },

  // ── CRUD Contatos ──────────────────────────────────────────────

  async _salvarContato() {
    if (!this._campanhaAtiva) return;

    const nome = document.getElementById("ct-nome")?.value.trim();
    const telefone = document.getElementById("ct-telefone")?.value.trim();
    const status = document.getElementById("ct-status")?.value || "pendente";
    const obs = document.getElementById("ct-obs")?.value.trim() || "";
    const editId = document.getElementById("ct-edit-id")?.value;

    if (!nome || !telefone) {
      Alerts.aviso("Preencha nome e telefone do contato.");
      return;
    }

    const btn = document.querySelector("#form-contato [type=submit]");
    if (btn) btn.disabled = true;

    try {
      const dados = { nome, telefone, status, obs };

      if (editId) {
        await atualizar(`campanhas/${this._campanhaAtiva}/contatos/${editId}`, {
          ...dados,
          atualizado_em: agora(),
        });
        Alerts.sucesso("Contato atualizado!");
      } else {
        await criar(`campanhas/${this._campanhaAtiva}/contatos`, dados);
        Alerts.sucesso("Contato adicionado!");
      }

      this._resetFormContato();
      const wrapper = document.getElementById("form-contato-wrapper");
      if (wrapper) wrapper.style.display = "none";
    } catch (err) {
      console.error("[marketing] _salvarContato:", err);
      Alerts.erro("Erro ao salvar contato.");
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  _editarContato(id) {
    if (!this._campanhaAtiva) return;
    const campanha = this._campanhas[this._campanhaAtiva];
    const c = campanha?.contatos?.[id];
    if (!c) return;

    document.getElementById("ct-edit-id").value = id;
    document.getElementById("ct-nome").value = c.nome || "";
    document.getElementById("ct-telefone").value = c.telefone || "";
    document.getElementById("ct-status").value = c.status || "pendente";
    document.getElementById("ct-obs").value = c.obs || "";

    const btnTxt = document.getElementById("btn-ct-txt");
    if (btnTxt) btnTxt.textContent = "Atualizar";

    const wrapper = document.getElementById("form-contato-wrapper");
    if (wrapper) wrapper.style.display = "block";
    document.getElementById("ct-nome")?.focus();
  },

  async _excluirContato(id) {
    if (!this._campanhaAtiva) return;
    if (!confirm("Remover este contato da campanha?")) return;

    try {
      await remover(`campanhas/${this._campanhaAtiva}/contatos/${id}`);
      Alerts.sucesso("Contato removido.");
    } catch (err) {
      console.error("[marketing] _excluirContato:", err);
      Alerts.erro("Erro ao remover contato.");
    }
  },

  _resetFormContato() {
    document.getElementById("form-contato")?.reset();
    const editId = document.getElementById("ct-edit-id");
    if (editId) editId.value = "";
    const btnTxt = document.getElementById("btn-ct-txt");
    if (btnTxt) btnTxt.textContent = "Salvar";
  },

  // ── WhatsApp ───────────────────────────────────────────────────

  _enviarWhatsApp(id) {
    if (!this._campanhaAtiva) return;
    const campanha = this._campanhas[this._campanhaAtiva];
    const c = campanha?.contatos?.[id];
    if (!c) return;

    const tel = this._limparTelefone(c.telefone);
    if (!tel) {
      Alerts.aviso("Número de telefone inválido para WhatsApp.");
      return;
    }

    const template = campanha.mensagem_whatsapp || "";
    const msg = template
      .replace(/{nome}/gi, c.nome)
      .replace(/{campanha}/gi, campanha.nome);

    const url = msg
      ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/${tel}`;

    window.open(url, "_blank", "noopener,noreferrer");

    // Auto-atualizar status para "contactado" se ainda estava "pendente"
    if (c.status === "pendente") {
      atualizar(`campanhas/${this._campanhaAtiva}/contatos/${id}`, {
        status: "contactado",
        atualizado_em: agora(),
      }).catch((err) => console.warn("[marketing] auto-status whatsapp:", err));
    }
  },

  _limparTelefone(tel) {
    if (!tel) return "";
    const digits = tel.replace(/\D/g, "");
    if (!digits) return "";
    // Se já tem o DDI do Brasil (55) e comprimento correto (12 ou 13 dígitos)
    if (digits.startsWith("55") && digits.length >= 12) return digits;
    return "55" + digits;
  },

  // ── Badges e helpers ───────────────────────────────────────────

  _badgeTipo(tipo) {
    const map = {
      reativacao: ["icon-blue", "Reativação"],
      aniversario: ["icon-yellow", "Aniversário"],
      promocao: ["icon-green", "Promoção"],
      pos_consulta: ["icon-blue", "Pós-Consulta"],
      outro: ["", "Outro"],
    };
    const [cls, label] = map[tipo] || ["", tipo || "—"];
    return `<span class="badge ${cls}" style="font-size:0.72rem">${label}</span>`;
  },

  _badgeStatus(status) {
    const map = {
      rascunho: ["badge-neutral", "Rascunho"],
      ativa: ["badge-success", "Ativa"],
      concluida: ["badge-info", "Concluída"],
      pausada: ["badge-warning", "Pausada"],
    };
    const [cls, label] = map[status] || ["badge-neutral", status || "—"];
    return `<span class="badge ${cls}" style="font-size:0.72rem">${label}</span>`;
  },

  _badgeStatusContato(status) {
    const map = {
      pendente: ["badge-neutral", "Pendente"],
      contactado: ["badge-info", "Contactado"],
      convertido: ["badge-success", "Convertido"],
      sem_retorno: ["badge-warning", "Sem Retorno"],
    };
    const [cls, label] = map[status] || ["badge-neutral", status || "—"];
    return `<span class="badge ${cls}" style="font-size:0.72rem">${label}</span>`;
  },

  _labelTipo(tipo) {
    const map = {
      reativacao: "Reativação",
      aniversario: "Aniversário",
      promocao: "Promoção",
      pos_consulta: "Pós-Consulta",
      outro: "Outro",
    };
    return map[tipo] || tipo || "";
  },

  _labelStatus(status) {
    const map = {
      rascunho: "Rascunho",
      ativa: "Ativa",
      concluida: "Concluída",
      pausada: "Pausada",
    };
    return map[status] || status || "";
  },

  _formatarData(str) {
    if (!str) return "—";
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  },

  _esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
};
