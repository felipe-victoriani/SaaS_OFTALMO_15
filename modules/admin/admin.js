// ================================================================
// admin.js — Módulo Administração (somente Admin Master)
// ================================================================

// CORRIGIDO: instância secundária do Firebase para criar usuários sem deslogar o admin
function _getSecondaryAuth() {
  let app;
  try {
    app = firebase.app("secondary-auth");
  } catch (_) {
    // Usa firebaseConfig definido em firebase-config.js
    app = firebase.initializeApp(firebaseConfig, "secondary-auth");
  }
  return app.auth();
}

window.Modules = window.Modules || {};

const MEDICOS_METAS = [
  "Dra. Mariza",
  "Dra. Fabiana",
  "Dra. Mariana",
  "Dr. Dante",
  "Dr. Alberto",
];

function _mesAtualStr() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

window.Modules.admin = {
  _abaAtiva: "usuarios",
  _chartsMetas: [],

  _destruirChartsMetas() {
    this._chartsMetas.forEach((c) => {
      try {
        c.destroy();
      } catch (_) {}
    });
    this._chartsMetas = [];
  },

  mount(container) {
    if (!exigirPermissao("admin", container)) return;

    lucide.createIcons({ nodes: [container] });
    this._carregarCards();
    this._renderAba("usuarios");

    container.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".tab-btn").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        this._renderAba(btn.dataset.tab);
      });
    });
  },

  // ---- CARDS DE RESUMO ----
  async _carregarCards() {
    const el = document.getElementById("admin-cards-resumo");
    if (!el) return;
    try {
      const [usuariosSnap, patrimonioSnap, estoqueSnap] = await Promise.all([
        lerUmaVez(CAMINHOS.usuarios()),
        lerUmaVez(`${CAMINHOS.base}/patrimonio`),
        lerUmaVez(`${CAMINHOS.base}/estoque`),
      ]);

      const totalUsuarios = usuariosSnap ? Object.keys(usuariosSnap).length : 0;
      const itensPat = patrimonioSnap ? Object.values(patrimonioSnap) : [];
      const vencendo = itensPat.filter((r) => {
        const d = diasAteVencer(r.data_vencimento);
        return d >= 0 && d <= 30;
      }).length;
      const itensEst = estoqueSnap ? Object.values(estoqueSnap) : [];
      const estoqCrit = itensEst.filter(
        (r) => (r.quantidade || 0) <= (r.estoque_minimo || 0),
      ).length;

      el.innerHTML = `
        <div class="card">
          <div class="card-metric">
            <i data-lucide="users" width="20" height="20" aria-hidden="true"></i>
            <span class="metric-label">Usuários</span>
            <span class="metric-value">${totalUsuarios}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <i data-lucide="alert-triangle" width="20" height="20" aria-hidden="true"></i>
            <span class="metric-label">Patrimônio a Vencer (30d)</span>
            <span class="metric-value" style="color:${vencendo > 0 ? "var(--warning)" : "inherit"}">${vencendo}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-metric">
            <i data-lucide="package" width="20" height="20" aria-hidden="true"></i>
            <span class="metric-label">Estoque Crítico / Baixo</span>
            <span class="metric-value" style="color:${estoqCrit > 0 ? "var(--danger)" : "inherit"}">${estoqCrit}</span>
          </div>
        </div>
      `;
      lucide.createIcons({ nodes: [el] });
    } catch (err) {
      el.innerHTML = "";
    }
  },

  // ---- ABAS ----
  _renderAba(aba) {
    this._abaAtiva = aba;
    const content = document.getElementById("admin-tab-content");
    if (!content) return;
    content.innerHTML = `<div class="loading-wrapper"><div class="spinner"></div>Carregando...</div>`;
    if (aba === "usuarios") this._renderUsuarios(content);
    if (aba === "metas") this._renderMetas(content);
    if (aba === "relatorios") this._renderRelatorios(content);
    if (aba === "auditoria") this._renderAuditoria(content);
    if (aba === "backup") this._renderBackup(content);
  },

  // ---- ABA: USUÁRIOS ----
  async _renderUsuarios(container) {
    const snap = await lerUmaVez(CAMINHOS.usuarios());
    const usuarios = snap
      ? Object.entries(snap).map(([uid, d]) => ({ uid, ...d }))
      : [];
    this._sincronizarDiretorio(usuarios);

    const MODULOS_PERM = [
      "recepcao",
      "call_center",
      "cirurgico",
      "honorarios",
      "faturamento",
      "patrimonio",
      "estoque",
      "fornecedores",
      "marketing",
    ];

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Usuários do Sistema</span>
          <button class="btn btn-primary btn-sm" id="btn-novo-usuario">
            <i data-lucide="user-plus" width="14" height="14" aria-hidden="true"></i> Novo Usuário
          </button>
        </div>
        <div class="table-scroll table-mobile-cards">
          <table class="data-table" aria-label="Usuários">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Perfil</th>
                <th scope="col">Módulos</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${
                usuarios.length === 0
                  ? `<tr><td colspan="5"><div class="table-empty"><p>Nenhum usuário cadastrado.</p></div></td></tr>`
                  : usuarios
                      .map(
                        (u) => `
                  <tr>
                    <td data-label="Nome">${u.nome || "—"}</td>
                    <td data-label="E-mail">${u.email || "—"}</td>
                    <td data-label="Perfil"><span class="badge ${u.isAdmin ? "badge-primary" : "badge-info"}">${u.isAdmin ? "Admin" : "Usuário"}</span></td>
                    <td data-label="Módulos" style="font-size:.75rem">${
                      Object.keys(u.permissoes || {})
                        .filter((m) => u.permissoes[m])
                        .join(", ") || "—"
                    }</td>
                    <td data-label="Ações">
                      <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.admin._editarUsuario('${u.uid}')" aria-label="Editar usuário">
                        <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
                      </button>
                      <button class="btn btn-ghost btn-icon btn-sm btn-danger" onclick="Modules.admin._excluirUsuario('${u.uid}', '${u.nome || ""}')" aria-label="Excluir usuário">
                        <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                `,
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
    lucide.createIcons({ nodes: [container] });

    container
      .querySelector("#btn-novo-usuario")
      ?.addEventListener("click", () => this._modalUsuario(null));
  },

  _modalUsuario(uid) {
    lerUmaVez(CAMINHOS.usuarios()).then((snap) => {
      const user = snap && uid ? snap[uid] : null;
      const MODULOS_PERM = [
        "recepcao",
        "call_center",
        "cirurgico",
        "honorarios",
        "faturamento",
        "patrimonio",
        "estoque",
        "fornecedores",
        "marketing",
      ];
      Modal.abrirModal({
        titulo: uid ? "Editar Usuário" : "Novo Usuário",
        icone: "user",
        tamanho: "md",
        corpo: `
          <div class="form-group">
            <label class="form-label required" for="adm-u-nome">Nome</label>
            <input type="text" id="adm-u-nome" class="form-input" value="${user?.nome || ""}" required>
          </div>
          <div class="form-group">
            <label class="form-label required" for="adm-u-email">E-mail</label>
            <input type="email" id="adm-u-email" class="form-input" value="${user?.email || ""}" ${uid ? "readonly" : ""} required>
          </div>
          ${
            !uid
              ? `
          <div class="form-group">
            <label class="form-label required" for="adm-u-senha">Senha inicial</label>
            <input type="password" id="adm-u-senha" class="form-input" minlength="6" autocomplete="new-password">
          </div>`
              : ""
          }
          <div class="form-check mb-1">
            <input type="checkbox" id="adm-u-admin" ${user?.isAdmin ? "checked" : ""}>
            <label for="adm-u-admin">Admin Master</label>
          </div>
          <div id="adm-u-perm-container">
            <p style="font-size:.8rem;font-weight:600;margin-bottom:.5rem">Permissões por módulo:</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem">
              ${MODULOS_PERM.map(
                (m) => `
                <label style="display:flex;align-items:center;gap:.4rem;font-size:.85rem;cursor:pointer">
                  <input type="checkbox" id="perm-${m}" ${user?.permissoes?.[m] ? "checked" : ""}>
                  ${m.replace(/_/g, " ")}
                </label>
              `,
              ).join("")}
            </div>
          </div>
        `,
        botoes: [
          {
            label: "Cancelar",
            classe: "btn-secondary",
            id: "adm-modal-cancelar",
            onClick: () => Modal.fecharModal(),
          },
          {
            label: "Salvar",
            classe: "btn-primary",
            id: "adm-modal-salvar",
            icone: "save",
            onClick: () => this._salvarUsuario(uid, MODULOS_PERM),
          },
        ],
      });
    });
  },

  async _salvarUsuario(uid, MODULOS_PERM) {
    const nome = document.getElementById("adm-u-nome")?.value.trim();
    const email = document.getElementById("adm-u-email")?.value.trim();
    const senha = document.getElementById("adm-u-senha")?.value || "";
    const admin = document.getElementById("adm-u-admin")?.checked || false;
    const permissoes = {};
    MODULOS_PERM.forEach((m) => {
      permissoes[m] = !!document.getElementById(`perm-${m}`)?.checked;
    });
    if (admin) MODULOS_PERM.forEach((m) => (permissoes[m] = true));

    if (!nome || !email) {
      Alerts.aviso("Preencha nome e e-mail.");
      return;
    }

    try {
      if (uid) {
        await atualizar(`${CAMINHOS.usuarios()}/${uid}`, {
          nome,
          isAdmin: admin,
          permissoes,
        });
        await atualizar(CAMINHOS.diretorioUsuario(uid), { nome });
        Alerts.sucesso("Usuário atualizado!");
      } else {
        if (senha.length < 6) {
          Alerts.aviso("Senha deve ter no mínimo 6 caracteres.");
          return;
        }
        // CORRIGIDO: usa instância secundária para não deslogar o admin logado
        const secondaryAuth = _getSecondaryAuth();
        let cred;
        try {
          cred = await secondaryAuth.createUserWithEmailAndPassword(
            email,
            senha,
          );
        } catch (firebaseErr) {
          // Traduz erros comuns do Firebase para mensagens amigáveis
          console.error(
            "[admin] createUser erro:",
            firebaseErr.code,
            firebaseErr.message,
          );
          const mapaErros = {
            "auth/email-already-in-use": "Este e-mail já está cadastrado.",
            "auth/invalid-email": "E-mail inválido.",
            "auth/weak-password": "Senha fraca — mínimo 6 caracteres.",
            "auth/too-many-requests":
              "Muitas tentativas. Aguarde e tente novamente.",
            "auth/operation-not-allowed":
              "Autenticação por e-mail/senha não está habilitada no Firebase Console. Ative em Authentication → Sign-in method.",
            "auth/admin-restricted-operation":
              "Criação de usuários não permitida. Verifique as configurações de Authentication no Firebase Console.",
          };
          Alerts.erro(
            mapaErros[firebaseErr.code] ||
              "Erro ao criar usuário: " + firebaseErr.message,
          );
          return;
        }
        const novoUid = cred.user.uid;
        // Desloga da instância secundária sem afetar o admin principal
        await secondaryAuth.signOut();
        await atualizar(`${CAMINHOS.usuarios()}/${novoUid}`, {
          nome,
          email,
          isAdmin: admin,
          permissoes,
        });
        await atualizar(CAMINHOS.diretorioUsuario(novoUid), { nome });
        Alerts.sucesso("Usuário criado com sucesso!");
      }
      Modal.fecharModal();
      this._renderAba("usuarios");
    } catch (err) {
      Alerts.erro("Erro ao salvar usuário: " + (err.message || ""));
    }
  },

  _editarUsuario(uid) {
    this._modalUsuario(uid);
  },

  _excluirUsuario(uid, nome) {
    Modal.confirmar(
      `Excluir o usuário "${nome}" e todos os seus dados? (LGPD Art. 18 — Direito ao Apagamento)`,
      async () => {
        try {
          await excluirContaUsuario(uid);
          Alerts.sucesso("Usuário e dados excluídos conforme LGPD.");
          this._renderAba("usuarios");
        } catch (err) {
          Alerts.erro("Erro ao excluir usuário: " + (err.message || ""));
        }
      },
      "Confirmar Exclusão de Conta",
    );
  },

  // Preenche o diretório (nome público, usado pelo chat) para usuários
  // criados antes dessa coleção existir — roda toda vez que a aba abre,
  // mas só grava quem realmente está faltando.
  async _sincronizarDiretorio(usuarios) {
    try {
      const dirSnap = await lerUmaVez(CAMINHOS.diretorio());
      const existentes = dirSnap || {};
      const faltando = usuarios.filter((u) => !existentes[u.uid]);
      await Promise.all(
        faltando.map((u) =>
          atualizar(CAMINHOS.diretorioUsuario(u.uid), { nome: u.nome }),
        ),
      );
    } catch (err) {
      console.warn("[admin] Falha ao sincronizar diretório:", err);
    }
  },

  // ---- ABA: METAS ----
  async _renderMetas(container, anoMesSelecionado) {
    this._destruirChartsMetas();
    const anoMes = anoMesSelecionado || _mesAtualStr();
    const [ano, mes] = anoMes.split("-").map(Number);
    const { inicio, fim } = intervaloMes(ano, mes);
    const nomeMes = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    const [snap, honorariosArr, recepcaoArr] = await Promise.all([
      lerUmaVez(CAMINHOS.metas()),
      buscarIntervalo("honorarios", inicio, fim),
      buscarIntervalo("pacientes", inicio, fim),
    ]);
    const todasMetas = snap
      ? Object.entries(snap).map(([k, v]) => ({ _id: k, ...v }))
      : [];

    // Realizado do mês por médico: honorários (atribuídos a quem ganhou
    // cada valor) + receita de recepção — mesma fonte usada no Faturamento
    const realizadoMap = realizadoPorMedico(
      honorariosArr.filter((r) => r.lancado),
      recepcaoArr,
    );

    const linhas = MEDICOS_METAS.map((nome) => {
      const efetiva = metaEfetiva(todasMetas, nome, anoMes);
      const realizado = realizadoMap[nome] || 0;
      const valorMeta = efetiva?.valor || 0;
      const propria = efetiva?.anoMes === anoMes;
      return { nome, efetiva, realizado, valorMeta, propria };
    });

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Metas por Médico</span>
        </div>
        <div class="form-group" style="max-width:220px">
          <label class="form-label" for="metas-mes">Mês de referência</label>
          <input type="month" id="metas-mes" class="filter-input" value="${anoMes}">
        </div>
        <form id="form-meta" novalidate>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label required" for="meta-nome">Nome do Médico</label>
              <select id="meta-nome" class="form-select" required>
                <option value="">Selecione...</option>
                ${MEDICOS_METAS.map((n) => `<option>${n}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required" for="meta-mes">Mês</label>
              <input type="month" id="meta-mes" class="form-input" value="${anoMes}" required>
            </div>
            <div class="form-group">
              <label class="form-label required" for="meta-valor">Meta do Mês (R$)</label>
              <input type="text" inputmode="numeric" id="meta-valor" class="form-input" oninput="formatarMoedaInput(this)" placeholder="R$ 0,00" data-valor="0" required>
            </div>
          </div>
          <p style="font-size:.78rem;color:var(--text-secondary);margin:-.5rem 0 .75rem">
            Cada mês tem seu próprio valor — salvar aqui não altera meses já passados.
          </p>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <i data-lucide="save" width="16" height="16" aria-hidden="true"></i> Salvar Meta do Mês
            </button>
          </div>
        </form>
      </div>

      <div class="card mt-2">
        <div class="card-header"><span class="card-title">Meta vs. Realizado — ${nomeMes}</span></div>
        <canvas id="chart-metas" height="90"></canvas>
      </div>

      <div class="card mt-2">
        <div class="card-header"><span class="card-title">Metas de ${nomeMes}</span></div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Médico</th><th>Meta</th><th>Realizado</th><th>%</th><th>Ações</th></tr></thead>
            <tbody>
              ${linhas
                .map((l) => {
                  const pct =
                    l.valorMeta > 0
                      ? Math.round((l.realizado / l.valorMeta) * 100)
                      : 0;
                  const origemMeta = l.valorMeta
                    ? l.propria
                      ? ""
                      : `<div style="font-size:.72rem;color:var(--text-secondary)">herdada de ${
                          l.efetiva.anoMes
                            ? (() => {
                                const [ay, am] = l.efetiva.anoMes
                                  .split("-")
                                  .map(Number);
                                return new Date(
                                  ay,
                                  am - 1,
                                  1,
                                ).toLocaleDateString("pt-BR", {
                                  month: "short",
                                  year: "numeric",
                                });
                              })()
                            : "período anterior"
                        }</div>`
                    : "";
                  return `
                  <tr>
                    <td>${l.nome}</td>
                    <td class="table-number">${l.valorMeta ? formatarMoeda(l.valorMeta) : "—"}${origemMeta}</td>
                    <td class="table-number">${formatarMoeda(l.realizado)}</td>
                    <td class="table-number">${l.valorMeta ? pct + "%" : "—"}</td>
                    <td>
                      <div class="btn-group">
                        ${
                          l.propria
                            ? `
                        <button class="btn btn-ghost btn-icon btn-sm" onclick="Modules.admin._editarMeta('${l.efetiva._id}', '${l.nome.replace(/'/g, "\\'")}', ${l.valorMeta}, '${anoMes}')" aria-label="Editar meta">
                          <i data-lucide="pencil" width="14" height="14" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-ghost btn-icon btn-sm btn-danger" onclick="Modules.admin._removerMeta('${l.efetiva._id}', '${l.nome.replace(/'/g, "\\'")}', '${anoMes}')" aria-label="Remover meta">
                          <i data-lucide="trash-2" width="14" height="14" aria-hidden="true"></i>
                        </button>
                        `
                            : `
                        <button class="btn btn-ghost btn-sm" onclick="Modules.admin._preencherMeta('${l.nome.replace(/'/g, "\\'")}', ${l.valorMeta})">
                          Definir meta deste mês
                        </button>
                        `
                        }
                      </div>
                    </td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
    lucide.createIcons({ nodes: [container] });

    const chartEl = document.getElementById("chart-metas");
    if (chartEl) {
      const c = new Chart(chartEl, {
        type: "bar",
        data: {
          labels: linhas.map((l) => l.nome),
          datasets: [
            {
              label: "Meta",
              data: linhas.map((l) => l.valorMeta),
              backgroundColor: "#94a3b8",
            },
            {
              label: "Realizado",
              data: linhas.map((l) => l.realizado),
              backgroundColor: linhas.map((l) =>
                l.valorMeta && l.realizado >= l.valorMeta
                  ? "#059669"
                  : "#0d9488",
              ),
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (v) => "R$" + (v / 1000).toFixed(0) + "k" },
            },
          },
        },
      });
      this._chartsMetas.push(c);
    }

    container
      .querySelector("#metas-mes")
      ?.addEventListener("change", (e) => {
        if (e.target.value) this._renderMetas(container, e.target.value);
      });

    container
      .querySelector("#form-meta")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = document.getElementById("meta-nome").value.trim();
        const mesForm = document.getElementById("meta-mes").value;
        const valor = getValorNumerico(document.getElementById("meta-valor"));
        if (!nome || !mesForm || valor <= 0) {
          Alerts.aviso("Preencha médico, mês e valor.");
          return;
        }
        try {
          const existente = todasMetas.find(
            (m) => m.nome === nome && m.anoMes === mesForm,
          );
          if (existente) {
            await atualizar(`${CAMINHOS.metas()}/${existente._id}`, {
              valor,
            });
            await registrarAuditoria("editar", "metas", existente._id, {
              nome,
              valor,
              anoMes: mesForm,
            });
          } else {
            await criar(CAMINHOS.metas(), { nome, valor, anoMes: mesForm });
          }
          Alerts.sucesso("Meta salva!");
          this._renderMetas(container, mesForm);
        } catch (err) {
          Alerts.erro("Erro ao salvar meta.");
        }
      });
  },

  _preencherMeta(nome, valorSugerido) {
    document.getElementById("meta-nome").value = nome;
    const campoValor = document.getElementById("meta-valor");
    if (campoValor && valorSugerido) {
      campoValor.dataset.valor = valorSugerido;
      campoValor.value = formatarMoeda(valorSugerido);
    }
    document
      .getElementById("form-meta")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  },

  _editarMeta(id, nome, valor, anoMes) {
    Modal.abrirModal({
      titulo: `Editar Meta — ${anoMes}`,
      icone: "pencil",
      tamanho: "sm",
      corpo: `
        <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:.75rem">
          Médico: <strong>${nome}</strong> — só afeta o mês <strong>${anoMes}</strong>.
        </p>
        <div class="form-group">
          <label class="form-label required" for="edit-meta-valor">Meta do Mês (R$)</label>
          <input type="text" inputmode="numeric" id="edit-meta-valor" class="form-input"
            oninput="formatarMoedaInput(this)"
            placeholder="R$ 0,00"
            data-valor="${valor}"
            value="${formatarMoeda(valor)}"
            required>
        </div>
      `,
      botoes: [
        {
          id: "edit-meta-cancelar",
          label: "Cancelar",
          classe: "btn-secondary",
          onClick: () => Modal.fecharModal(),
        },
        {
          id: "edit-meta-salvar",
          label: "Salvar",
          classe: "btn-primary",
          icone: "save",
          onClick: async () => {
            const novoValor = getValorNumerico(
              document.getElementById("edit-meta-valor"),
            );
            if (novoValor <= 0) {
              Alerts.aviso("Informe um valor válido.");
              return;
            }
            try {
              await atualizar(`${CAMINHOS.metas()}/${id}`, {
                valor: novoValor,
              });
              await registrarAuditoria("editar", "metas", id, {
                nome,
                valor: novoValor,
                anoMes,
              });
              Modal.fecharModal();
              Alerts.sucesso("Meta atualizada!");
              this._renderMetas(document.getElementById("admin-tab-content"), anoMes);
            } catch (err) {
              Alerts.erro("Erro ao atualizar meta.");
            }
          },
        },
      ],
    });
  },

  async _removerMeta(id, nomeMedico, anoMes) {
    Modal.confirmar(
      `Excluir a meta de <strong>${nomeMedico || "este médico"}</strong> para <strong>${anoMes}</strong>?`,
      async () => {
        await remover(`${CAMINHOS.metas()}/${id}`);
        await registrarAuditoria("excluir", "metas", id, {
          nome: nomeMedico,
          anoMes,
        });
        Alerts.sucesso("Meta removida.");
        this._renderMetas(document.getElementById("admin-tab-content"), anoMes);
      },
      "Excluir Meta",
    );
  },

  // ---- ABA: RELATÓRIOS ----
  async _renderRelatorios(container) {
    const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    // Calcular primeiro e último dia do mês atual para pré-preencher relatório de recepção
    const hoje = new Date();
    const primeiroDoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
    const ultimoDia = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0,
    ).getDate();
    const ultimoDoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    container.innerHTML = `
      <!-- ALTERAÇÃO 6: Relatório de Recepção com filtros De/Até, Médico e Origem -->
      <div class="card mb-3">
        <div class="card-header">
          <span class="card-title">
            <i data-lucide="clipboard-list" width="18" height="18" aria-hidden="true"></i>
            Relatório de Recepção
          </span>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="min-width:130px;margin:0">
            <label class="form-label">De:</label>
            <input type="date" id="rec-rel-de" class="filter-input" value="${primeiroDoMes}">
          </div>
          <div class="form-group" style="min-width:130px;margin:0">
            <label class="form-label">Até:</label>
            <input type="date" id="rec-rel-ate" class="filter-input" value="${ultimoDoMes}">
          </div>
          <div class="form-group" style="min-width:160px;margin:0">
            <label class="form-label">Médico:</label>
            <select id="rec-rel-medico" class="filter-input">
              <option value="todos">Todos os Médicos</option>
              <option>Dra. Mariza</option>
              <option>Dra. Fabiana</option>
              <option>Dra. Mariana</option>
              <option>Dr. Dante</option>
              <option>Dr. Alberto</option>
            </select>
          </div>
          <div class="form-group" style="min-width:130px;margin:0">
            <label class="form-label">Origem:</label>
            <select id="rec-rel-origem" class="filter-input">
              <option value="todas">Todas</option>
              <option>Base</option>
              <option>Indicação</option>
              <option>Lead</option>
              <option>Convênio</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-gerar-rel-recepcao">
            <i data-lucide="search" width="14" height="14" aria-hidden="true"></i> Gerar Relatório
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export-rec-pdf" style="display:none">
            <i data-lucide="file-down" width="14" height="14" aria-hidden="true"></i> PDF
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export-rec-excel" style="display:none">
            <i data-lucide="table" width="14" height="14" aria-hidden="true"></i> Excel
          </button>
        </div>
      </div>
      <div id="rel-recepcao-resultado" class="mb-3"></div>

      <!-- Separador entre relatórios -->
      <hr style="border:none;border-top:2px solid var(--border);margin:1.5rem 0">

      <div class="card mb-3">
        <div class="card-header">
          <span class="card-title">
            <i data-lucide="file-bar-chart" width="18" height="18" aria-hidden="true"></i>
            Relatórios Detalhados
          </span>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="min-width:160px;margin:0">
            <label class="form-label">Mês/Ano</label>
            <input type="month" id="rel-mes" class="filter-input" value="${mesAtual}">
          </div>
          <button class="btn btn-primary" id="btn-gerar-relatorio">
            <i data-lucide="search" width="16" height="16" aria-hidden="true"></i> Gerar Relatório
          </button>
          <button class="btn btn-secondary" id="btn-exportar-pdf" style="display:none">
            <i data-lucide="file-down" width="16" height="16" aria-hidden="true"></i> Exportar PDF
          </button>
          <button class="btn btn-secondary" id="btn-exportar-excel" style="display:none">
            <i data-lucide="table" width="16" height="16" aria-hidden="true"></i> Exportar Excel
          </button>
        </div>
      </div>
      <div id="rel-resultado"></div>

      <!-- ALTERAÇÃO 5: Relatório do Call Center -->
      <hr style="border:none;border-top:2px solid var(--border);margin:1.5rem 0">
      <div class="card mb-3">
        <div class="card-header">
          <span class="card-title">
            <i data-lucide="phone-call" width="18" height="18" aria-hidden="true"></i>
            Relatório do Call Center
          </span>
        </div>
        <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:1rem">Ativações por médico, atendente e período</p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="min-width:130px;margin:0">
            <label class="form-label">De:</label>
            <input type="date" id="cc-rel-de" class="filter-input" value="${primeiroDoMes}">
          </div>
          <div class="form-group" style="min-width:130px;margin:0">
            <label class="form-label">Até:</label>
            <input type="date" id="cc-rel-ate" class="filter-input" value="${ultimoDoMes}">
          </div>
          <div class="form-group" style="min-width:160px;margin:0">
            <label class="form-label">Médico:</label>
            <select id="cc-rel-medico" class="filter-input">
              <option value="todos">Todos os Médicos</option>
              <option>Dra. Mariza</option>
              <option>Dra. Fabiana</option>
              <option>Dra. Mariana</option>
              <option>Dr. Dante</option>
              <option>Dr. Alberto</option>
            </select>
          </div>
          <div class="form-group" style="min-width:160px;margin:0">
            <label class="form-label">Atendente:</label>
            <select id="cc-rel-atendente" class="filter-input">
              <option value="todos">Todos</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-gerar-rel-cc">
            <i data-lucide="search" width="14" height="14" aria-hidden="true"></i> Gerar
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export-cc-pdf" style="display:none">
            <i data-lucide="file-down" width="14" height="14" aria-hidden="true"></i> PDF
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export-cc-excel" style="display:none">
            <i data-lucide="table" width="14" height="14" aria-hidden="true"></i> Excel
          </button>
        </div>
      </div>
      <div id="rel-callcenter-resultado" class="mb-3"></div>
    `;
    lucide.createIcons({ nodes: [container] });

    // ALTERAÇÃO 5: popula dropdown de atendentes com acesso ao call center
    lerUmaVez(CAMINHOS.usuarios()).then((snap) => {
      const select = document.getElementById("cc-rel-atendente");
      if (!select || !snap) return;
      Object.entries(snap).forEach(([uid, u]) => {
        if (u.permissoes?.call_center || u.isAdmin) {
          const opt = document.createElement("option");
          opt.value = uid;
          opt.textContent = u.nome || uid;
          select.appendChild(opt);
        }
      });
    });

    // ALTERAÇÃO 6: listeners do relatório de recepção
    container
      .querySelector("#btn-gerar-rel-recepcao")
      ?.addEventListener("click", async () => {
        const de = document.getElementById("rec-rel-de")?.value;
        const ate = document.getElementById("rec-rel-ate")?.value;
        const medico =
          document.getElementById("rec-rel-medico")?.value || "todos";
        const origem =
          document.getElementById("rec-rel-origem")?.value || "todas";
        if (!de || !ate) {
          Alerts.aviso("Informe o período (De e Até).");
          return;
        }
        const resultEl = document.getElementById("rel-recepcao-resultado");
        await RelatorioRecepcao.gerar(de, ate, medico, origem, resultEl);
        document.getElementById("btn-export-rec-pdf").style.display = "";
        document.getElementById("btn-export-rec-excel").style.display = "";
      });

    container
      .querySelector("#btn-export-rec-pdf")
      ?.addEventListener("click", () => {
        RelatorioRecepcao.exportarPDF();
      });

    container
      .querySelector("#btn-export-rec-excel")
      ?.addEventListener("click", () => {
        RelatorioRecepcao.exportarExcel();
      });

    container
      .querySelector("#btn-gerar-relatorio")
      ?.addEventListener("click", async () => {
        const mesInput = document.getElementById("rel-mes")?.value;
        if (!mesInput) return;
        const [ano, mes] = mesInput.split("-").map(Number);
        const { inicio, fim } = intervaloMes(ano, mes);
        const resultEl = document.getElementById("rel-resultado");
        resultEl.innerHTML =
          '<div class="loading-wrapper"><div class="spinner"></div>Gerando relatório…</div>';

        const [honorariosArr, cirurgiasArr, recepcaoArr, metasSnap] =
          await Promise.all([
            buscarIntervalo("honorarios", inicio, fim),
            buscarIntervalo("cirurgias", inicio, fim),
            // CORRIGIDO: a coleção de recepção é "pacientes" (era "recepcao",
            // que não existe — kpiAtend e a meta com recepção ficavam zerados)
            buscarIntervalo("pacientes", inicio, fim),
            lerUmaVez(CAMINHOS.metas()),
          ]);

        const lancados = honorariosArr.filter((r) => r.lancado);
        const pendentes = honorariosArr.filter((r) => !r.lancado);
        const metas = metasSnap ? Object.values(metasSnap) : [];
        const nomeMes = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });

        // ── 1. KPIs gerais ──────────────────────────────────────────
        const kpiAtend = recepcaoArr.length;
        const kpiCirurg = cirurgiasArr.length;
        const kpiPend = pendentes.length;
        const kpiTotalPF = lancados.reduce(
          (s, r) =>
            s +
            (r.honorario_cirurgiao_pf || 0) +
            (r.lio_parte_cirurgiao || 0) +
            (r.honorario_auxiliar_pf || 0) +
            (r.honorario_instrumentador_pf || 0),
          0,
        );
        const kpiLioCli = lancados.reduce(
          (s, r) => s + (r.lio_parte_clinica || 0),
          0,
        );
        const kpiCNPJ = lancados.reduce(
          (s, r) => s + (r.valor_clinica_cnpj || 0),
          0,
        );
        const kpiClinica = kpiCNPJ + kpiLioCli;
        const kpiGeral = kpiTotalPF + kpiClinica;

        // ── 2. Por médico (como cirurgião) ───────────────────────────
        const porMedico = {};
        lancados.forEach((r) => {
          const n = r.nome_cirurgiao || "Desconhecido";
          if (!porMedico[n])
            porMedico[n] = {
              cirs: 0,
              honPF: 0,
              lioCir: 0,
              auxPF: 0,
              instPF: 0,
              total: 0,
              pend: 0,
            };
          porMedico[n].cirs++;
          porMedico[n].honPF += r.honorario_cirurgiao_pf || 0;
          porMedico[n].lioCir += r.lio_parte_cirurgiao || 0;
          porMedico[n].auxPF += r.honorario_auxiliar_pf || 0;
          porMedico[n].instPF += r.honorario_instrumentador_pf || 0;
          porMedico[n].total +=
            (r.honorario_cirurgiao_pf || 0) +
            (r.lio_parte_cirurgiao || 0) +
            (r.honorario_auxiliar_pf || 0) +
            (r.honorario_instrumentador_pf || 0);
        });
        pendentes.forEach((r) => {
          const n = r.nome_cirurgiao || "Desconhecido";
          if (!porMedico[n])
            porMedico[n] = {
              cirs: 0,
              honPF: 0,
              lioCir: 0,
              auxPF: 0,
              instPF: 0,
              total: 0,
              pend: 0,
            };
          porMedico[n].pend++;
        });

        // ── 3. Por tipo de cirurgia ──────────────────────────────────
        const porTipo = {};
        cirurgiasArr.forEach((c) => {
          const t = c.tipo_cirurgia || "Não informado";
          porTipo[t] = (porTipo[t] || 0) + 1;
        });

        // ── 4. Clínica CNPJ detalhado ────────────────────────────────
        const porMedicoCNPJ = {};
        lancados.forEach((r) => {
          const n = r.nome_cirurgiao || "Desconhecido";
          if (!porMedicoCNPJ[n])
            porMedicoCNPJ[n] = { cirs: 0, lioCli: 0, cnpj: 0, total: 0 };
          porMedicoCNPJ[n].cirs++;
          porMedicoCNPJ[n].lioCli += r.lio_parte_clinica || 0;
          porMedicoCNPJ[n].cnpj += r.valor_clinica_cnpj || 0;
          porMedicoCNPJ[n].total +=
            (r.lio_parte_clinica || 0) + (r.valor_clinica_cnpj || 0);
        });

        // Realizado por médico (honorários + recepção, atribuído a quem
        // ganhou cada valor) — mesma fonte usada na aba Metas e no Faturamento
        const realizadoMetas = realizadoPorMedico(lancados, recepcaoArr);

        // ── Função auxiliar: badge % meta ────────────────────────────
        const badgeMeta = (nome) => {
          const m = metaEfetiva(metas, nome, mesInput);
          if (!m || !m.valor) return "";
          const total = realizadoMetas[nome] || 0;
          const pct = Math.min(100, Math.round((total / m.valor) * 100));
          const cor =
            pct >= 100 ? "#059669" : pct >= 70 ? "#d97706" : "#dc2626";
          return `<div style="margin-top:.4rem"><div style="background:var(--bg-secondary);border-radius:3px;height:6px;width:100%"><div style="background:${cor};border-radius:3px;height:6px;width:${pct}%"></div></div><span style="font-size:.7rem;color:${cor}">${pct}% da meta (${formatarMoeda(m.valor)})</span></div>`;
        };

        const MEDICOS_SORTED = Object.keys(porMedico).sort();

        resultEl.innerHTML = `
        <!-- KPIs -->
        <div style="margin-bottom:1rem">
          <h3 style="font-size:.95rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem">
            Resumo Geral — ${nomeMes}
          </h3>
          <div class="cards-grid cards-grid-3" style="gap:.75rem">
            <div class="card" style="border-left:4px solid #2563eb">
              <div class="card-metric">
                <span class="metric-label">Atendimentos (Recepção)</span>
                <span class="metric-value">${kpiAtend}</span>
              </div>
            </div>
            <div class="card" style="border-left:4px solid #7c3aed">
              <div class="card-metric">
                <span class="metric-label">Cirurgias Registradas</span>
                <span class="metric-value">${kpiCirurg}</span>
              </div>
            </div>
            <div class="card" style="border-left:4px solid #f59e0b">
              <div class="card-metric">
                <span class="metric-label">Honorários Pendentes</span>
                <span class="metric-value" style="color:${kpiPend > 0 ? "#d97706" : "inherit"}">${kpiPend}</span>
              </div>
            </div>
            <div class="card" style="border-left:4px solid #059669">
              <div class="card-metric">
                <span class="metric-label">Total Pessoa Física (PF)</span>
                <span class="metric-value">${formatarMoeda(kpiTotalPF)}</span>
              </div>
            </div>
            <div class="card" style="border-left:4px solid #0891b2">
              <div class="card-metric">
                <span class="metric-label">Total Clínica (CNPJ)</span>
                <span class="metric-value">${formatarMoeda(kpiClinica)}</span>
              </div>
            </div>
            <div class="card" style="border-left:4px solid #1e293b">
              <div class="card-metric">
                <span class="metric-label">Faturamento Total</span>
                <span class="metric-value" style="color:var(--accent)">${formatarMoeda(kpiGeral)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Por médico -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="card-title">
              <i data-lucide="stethoscope" width="16" height="16" aria-hidden="true"></i>
              Honorários por Médico (PF)
            </span>
          </div>
          <div class="table-scroll">
            <table class="data-table" id="rel-tabela-medicos">
              <thead>
                <tr>
                  <th>Médico</th>
                  <th class="text-right">Cirurgias</th>
                  <th class="text-right">Pend.</th>
                  <th class="text-right">Hon. Cirurgião PF</th>
                  <th class="text-right">LIO (cirurgião)</th>
                  <th class="text-right">Como Auxiliar PF</th>
                  <th class="text-right">Como Instrument.</th>
                  <th class="text-right">Total PF</th>
                  <th>Meta</th>
                </tr>
              </thead>
              <tbody>
                ${
                  MEDICOS_SORTED.length === 0
                    ? `<tr><td colspan="9"><div class="table-empty"><p>Nenhum honorário lançado neste período.</p></div></td></tr>`
                    : MEDICOS_SORTED.map((n) => {
                        const d = porMedico[n];
                        return `<tr>
                        <td><strong>${n}</strong>${badgeMeta(n)}</td>
                        <td class="table-number">${d.cirs}</td>
                        <td class="table-number" style="color:${d.pend > 0 ? "#d97706" : "inherit"}">${d.pend}</td>
                        <td class="table-number">${formatarMoeda(d.honPF)}</td>
                        <td class="table-number">${formatarMoeda(d.lioCir)}</td>
                        <td class="table-number">${formatarMoeda(d.auxPF)}</td>
                        <td class="table-number">${formatarMoeda(d.instPF)}</td>
                        <td class="table-number fw-6" style="color:var(--accent)">${formatarMoeda(d.total)}</td>
                        <td style="min-width:140px">${(() => {
                          const m = metaEfetiva(metas, n, mesInput);
                          return m ? formatarMoeda(m.valor) : "—";
                        })()}</td>
                      </tr>`;
                      }).join("")
                }
              </tbody>
              ${
                MEDICOS_SORTED.length > 0
                  ? `
              <tfoot>
                <tr style="background:var(--bg-secondary);font-weight:700">
                  <td>TOTAIS</td>
                  <td class="table-number">${lancados.length}</td>
                  <td class="table-number">${pendentes.length}</td>
                  <td class="table-number">${formatarMoeda(lancados.reduce((s, r) => s + (r.honorario_cirurgiao_pf || 0), 0))}</td>
                  <td class="table-number">${formatarMoeda(lancados.reduce((s, r) => s + (r.lio_parte_cirurgiao || 0), 0))}</td>
                  <td class="table-number">${formatarMoeda(lancados.reduce((s, r) => s + (r.honorario_auxiliar_pf || 0), 0))}</td>
                  <td class="table-number">${formatarMoeda(lancados.reduce((s, r) => s + (r.honorario_instrumentador_pf || 0), 0))}</td>
                  <td class="table-number" style="color:var(--accent)">${formatarMoeda(kpiTotalPF)}</td>
                  <td></td>
                </tr>
              </tfoot>`
                  : ""
              }
            </table>
          </div>
        </div>

        <!-- Clínica CNPJ por médico -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="card-title">
              <i data-lucide="building-2" width="16" height="16" aria-hidden="true"></i>
              Faturamento Clínica (CNPJ) por Médico
            </span>
          </div>
          <div class="table-scroll">
            <table class="data-table" id="rel-tabela-clinica">
              <thead>
                <tr>
                  <th>Médico (Cirurgião)</th>
                  <th class="text-right">Cirurgias</th>
                  <th class="text-right">LIO (parte clínica)</th>
                  <th class="text-right">Honorários CNPJ</th>
                  <th class="text-right">Total Clínica</th>
                  <th class="text-right">% do Total</th>
                </tr>
              </thead>
              <tbody>
                ${
                  Object.keys(porMedicoCNPJ).length === 0
                    ? `<tr><td colspan="6"><div class="table-empty"><p>Sem dados.</p></div></td></tr>`
                    : Object.keys(porMedicoCNPJ)
                        .sort()
                        .map((n) => {
                          const d = porMedicoCNPJ[n];
                          const pct =
                            kpiClinica > 0
                              ? ((d.total / kpiClinica) * 100).toFixed(1)
                              : "0.0";
                          return `<tr>
                        <td><strong>${n}</strong></td>
                        <td class="table-number">${d.cirs}</td>
                        <td class="table-number">${formatarMoeda(d.lioCli)}</td>
                        <td class="table-number">${formatarMoeda(d.cnpj)}</td>
                        <td class="table-number fw-6" style="color:var(--accent)">${formatarMoeda(d.total)}</td>
                        <td class="table-number">${pct}%</td>
                      </tr>`;
                        })
                        .join("")
                }
              </tbody>
              ${
                Object.keys(porMedicoCNPJ).length > 0
                  ? `
              <tfoot>
                <tr style="background:var(--bg-secondary);font-weight:700">
                  <td>TOTAIS</td>
                  <td class="table-number">${lancados.length}</td>
                  <td class="table-number">${formatarMoeda(kpiLioCli)}</td>
                  <td class="table-number">${formatarMoeda(kpiCNPJ)}</td>
                  <td class="table-number" style="color:var(--accent)">${formatarMoeda(kpiClinica)}</td>
                  <td class="table-number">100%</td>
                </tr>
              </tfoot>`
                  : ""
              }
            </table>
          </div>
        </div>

        <!-- Por tipo de cirurgia -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="card-title">
              <i data-lucide="scissors" width="16" height="16" aria-hidden="true"></i>
              Cirurgias por Tipo
            </span>
          </div>
          <div class="table-scroll">
            <table class="data-table" id="rel-tabela-tipos">
              <thead>
                <tr>
                  <th>Tipo de Cirurgia</th>
                  <th class="text-right">Quantidade</th>
                  <th class="text-right">% do Total</th>
                </tr>
              </thead>
              <tbody>
                ${
                  Object.keys(porTipo).length === 0
                    ? `<tr><td colspan="3"><div class="table-empty"><p>Nenhuma cirurgia neste período.</p></div></td></tr>`
                    : Object.entries(porTipo)
                        .sort((a, b) => b[1] - a[1])
                        .map(([tipo, qtd]) => {
                          const pct =
                            kpiCirurg > 0
                              ? ((qtd / kpiCirurg) * 100).toFixed(1)
                              : "0.0";
                          const barW =
                            kpiCirurg > 0
                              ? Math.round((qtd / kpiCirurg) * 100)
                              : 0;
                          return `<tr>
                        <td>
                          ${tipo}
                          <div style="background:var(--bg-secondary);border-radius:3px;height:4px;margin-top:.3rem;width:100%">
                            <div style="background:var(--accent);border-radius:3px;height:4px;width:${barW}%"></div>
                          </div>
                        </td>
                        <td class="table-number fw-6">${qtd}</td>
                        <td class="table-number">${pct}%</td>
                      </tr>`;
                        })
                        .join("")
                }
              </tbody>
              ${
                Object.keys(porTipo).length > 0
                  ? `
              <tfoot>
                <tr style="background:var(--bg-secondary);font-weight:700">
                  <td>TOTAL</td>
                  <td class="table-number">${kpiCirurg}</td>
                  <td class="table-number">100%</td>
                </tr>
              </tfoot>`
                  : ""
              }
            </table>
          </div>
        </div>

        <!-- Detalhamento completo das cirurgias -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <i data-lucide="list" width="16" height="16" aria-hidden="true"></i>
              Detalhamento de Cirurgias — ${nomeMes}
            </span>
          </div>
          <div class="table-scroll">
            <table class="data-table" id="rel-tabela-detalhe">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Paciente</th>
                  <th>Cirurgião</th>
                  <th>Auxiliar</th>
                  <th>Tipo</th>
                  <th>Olho</th>
                  <th>LIO</th>
                  <th class="text-right">Valor LIO</th>
                  <th class="text-right">Valor Total</th>
                  <th>Honorários</th>
                </tr>
              </thead>
              <tbody>
                ${
                  cirurgiasArr.length === 0
                    ? `<tr><td colspan="10"><div class="table-empty"><p>Sem cirurgias neste período.</p></div></td></tr>`
                    : cirurgiasArr
                        .sort((a, b) => a._data.localeCompare(b._data))
                        .map(
                          (c) => `
                    <tr>
                      <td>${formatarData(c._data)}</td>
                      <td>${c.paciente || "—"}</td>
                      <td>${c.medico_cirurgiao || "—"}</td>
                      <td>${c.medico_auxiliar || "—"}</td>
                      <td>${c.tipo_cirurgia || "—"}</td>
                      <td>${c.olho_operado || "—"}</td>
                      <td><span class="badge ${c.lio_implantada ? "badge-info" : "badge-neutral"}">${c.lio_implantada ? c.tipo_lio || "Sim" : "Não"}</span></td>
                      <td class="table-number">${c.lio_implantada ? formatarMoeda(c.valor_lio) : "—"}</td>
                      <td class="table-number fw-6">${formatarMoeda(c.valor_total)}</td>
                      <td><span class="badge ${c.honorarios_lancados ? "badge-success" : "badge-warning"}">${c.honorarios_lancados ? "Lançado" : "Pendente"}</span></td>
                    </tr>`,
                        )
                        .join("")
                }
              </tbody>
            </table>
          </div>
        </div>
      `;

        lucide.createIcons({ nodes: [resultEl] });

        // Mostrar botões de exportação
        document.getElementById("btn-exportar-pdf").style.display = "";
        document.getElementById("btn-exportar-excel").style.display = "";

        // Guardar dados para export
        this._dadosRelatorio = {
          nomeMes,
          cirurgiasArr,
          lancados,
          pendentes,
          porMedico,
          porMedicoCNPJ,
          porTipo,
          kpiAtend,
          kpiCirurg,
          kpiPend,
          kpiTotalPF,
          kpiClinica,
          kpiGeral,
        };
      });

    // Export PDF
    container
      .querySelector("#btn-exportar-pdf")
      ?.addEventListener("click", () => this._exportarRelatorioPDF());
    // Export Excel
    container
      .querySelector("#btn-exportar-excel")
      ?.addEventListener("click", () => this._exportarRelatorioExcel());

    // ALTERAÇÃO 5: listeners do relatório do call center
    container
      .querySelector("#btn-gerar-rel-cc")
      ?.addEventListener("click", async () => {
        const de = document.getElementById("cc-rel-de")?.value;
        const ate = document.getElementById("cc-rel-ate")?.value;
        const medico =
          document.getElementById("cc-rel-medico")?.value || "todos";
        const atendente =
          document.getElementById("cc-rel-atendente")?.value || "todos";
        if (!de || !ate) {
          Alerts.aviso("Informe o período (De e Até).");
          return;
        }
        const resultEl = document.getElementById("rel-callcenter-resultado");
        await RelatorioCallCenter.gerar(
          { de, ate, medico, atendente },
          resultEl,
        );
        document.getElementById("btn-export-cc-pdf").style.display = "";
        document.getElementById("btn-export-cc-excel").style.display = "";
      });

    container
      .querySelector("#btn-export-cc-pdf")
      ?.addEventListener("click", () => RelatorioCallCenter.exportarPDF());

    container
      .querySelector("#btn-export-cc-excel")
      ?.addEventListener("click", () => RelatorioCallCenter.exportarExcel());
  },

  _exportarRelatorioPDF() {
    const d = this._dadosRelatorio;
    if (!d) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const titulo = `Relatório Detalhado — ${d.nomeMes}`;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(titulo, 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 22);

    // KPIs
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Geral", 14, 32);
    doc.autoTable({
      startY: 35,
      head: [
        [
          "Atendimentos",
          "Cirurgias",
          "Honorários Pendentes",
          "Total PF",
          "Total Clínica CNPJ",
          "Faturamento Total",
        ],
      ],
      body: [
        [
          d.kpiAtend,
          d.kpiCirurg,
          d.kpiPend,
          formatarMoeda(d.kpiTotalPF),
          formatarMoeda(d.kpiClinica),
          formatarMoeda(d.kpiGeral),
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    // Por médico PF
    doc.setFont("helvetica", "bold");
    doc.text("Honorários por Médico (PF)", 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 13,
      head: [
        [
          "Médico",
          "Cirurgias",
          "Pend.",
          "Hon. PF",
          "LIO Cirurgião",
          "Auxiliar PF",
          "Instrumentador",
          "Total PF",
        ],
      ],
      body: Object.keys(d.porMedico)
        .sort()
        .map((n) => {
          const m = d.porMedico[n];
          return [
            n,
            m.cirs,
            m.pend,
            formatarMoeda(m.honPF),
            formatarMoeda(m.lioCir),
            formatarMoeda(m.auxPF),
            formatarMoeda(m.instPF),
            formatarMoeda(m.total),
          ];
        }),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [124, 58, 237] },
    });

    // Clínica CNPJ
    doc.setFont("helvetica", "bold");
    doc.text("Faturamento Clínica (CNPJ)", 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 13,
      head: [
        ["Médico", "Cirurgias", "LIO Clínica", "Hon. CNPJ", "Total Clínica"],
      ],
      body: Object.keys(d.porMedicoCNPJ)
        .sort()
        .map((n) => {
          const m = d.porMedicoCNPJ[n];
          return [
            n,
            m.cirs,
            formatarMoeda(m.lioCli),
            formatarMoeda(m.cnpj),
            formatarMoeda(m.total),
          ];
        }),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [8, 145, 178] },
    });

    // Tipos de cirurgia
    doc.setFont("helvetica", "bold");
    doc.text("Cirurgias por Tipo", 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 13,
      head: [["Tipo de Cirurgia", "Quantidade", "%"]],
      body: Object.entries(d.porTipo)
        .sort((a, b) => b[1] - a[1])
        .map(([tipo, qtd]) => [
          tipo,
          qtd,
          d.kpiCirurg > 0 ? ((qtd / d.kpiCirurg) * 100).toFixed(1) + "%" : "0%",
        ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [5, 150, 105] },
    });

    // Detalhamento cirurgias
    if (d.cirurgiasArr.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Detalhamento de Cirurgias — ${d.nomeMes}`, 14, 16);
      doc.autoTable({
        startY: 22,
        head: [
          [
            "Data",
            "Paciente",
            "Cirurgião",
            "Auxiliar",
            "Tipo",
            "Olho",
            "LIO",
            "Valor LIO",
            "Valor Total",
            "Honorários",
          ],
        ],
        body: d.cirurgiasArr
          .sort((a, b) => a._data.localeCompare(b._data))
          .map((c) => [
            formatarData(c._data),
            c.paciente || "—",
            c.medico_cirurgiao || "—",
            c.medico_auxiliar || "—",
            c.tipo_cirurgia || "—",
            c.olho_operado || "—",
            c.lio_implantada ? c.tipo_lio || "Sim" : "Não",
            c.lio_implantada ? formatarMoeda(c.valor_lio) : "—",
            formatarMoeda(c.valor_total),
            c.honorarios_lancados ? "Lançado" : "Pendente",
          ]),
        styles: { fontSize: 6 },
        headStyles: { fillColor: [100, 116, 139] },
      });
    }

    doc.save(`relatorio-${d.nomeMes.replace(/ /g, "-")}.pdf`);
  },

  _exportarRelatorioExcel() {
    const d = this._dadosRelatorio;
    if (!d) return;
    const wb = XLSX.utils.book_new();

    // Aba KPIs
    const wsKpi = XLSX.utils.aoa_to_sheet([
      ["Resumo Geral", d.nomeMes],
      [],
      ["Atendimentos", d.kpiAtend],
      ["Cirurgias", d.kpiCirurg],
      ["Honorários Pendentes", d.kpiPend],
      ["Total PF", d.kpiTotalPF],
      ["Total Clínica CNPJ", d.kpiClinica],
      ["Faturamento Total", d.kpiGeral],
    ]);
    XLSX.utils.book_append_sheet(wb, wsKpi, "Resumo");

    // Aba por médico
    const wsMed = XLSX.utils.aoa_to_sheet([
      [
        "Médico",
        "Cirurgias",
        "Pendentes",
        "Hon. PF",
        "LIO Cirurgião",
        "Auxiliar PF",
        "Instrumentador",
        "Total PF",
      ],
      ...Object.keys(d.porMedico)
        .sort()
        .map((n) => {
          const m = d.porMedico[n];
          return [
            n,
            m.cirs,
            m.pend,
            m.honPF,
            m.lioCir,
            m.auxPF,
            m.instPF,
            m.total,
          ];
        }),
    ]);
    XLSX.utils.book_append_sheet(wb, wsMed, "Por Médico PF");

    // Aba clínica
    const wsCli = XLSX.utils.aoa_to_sheet([
      ["Médico", "Cirurgias", "LIO Clínica", "Hon. CNPJ", "Total Clínica"],
      ...Object.keys(d.porMedicoCNPJ)
        .sort()
        .map((n) => {
          const m = d.porMedicoCNPJ[n];
          return [n, m.cirs, m.lioCli, m.cnpj, m.total];
        }),
    ]);
    XLSX.utils.book_append_sheet(wb, wsCli, "Clínica CNPJ");

    // Aba tipos
    const wsTipo = XLSX.utils.aoa_to_sheet([
      ["Tipo de Cirurgia", "Quantidade", "%"],
      ...Object.entries(d.porTipo)
        .sort((a, b) => b[1] - a[1])
        .map(([tipo, qtd]) => [
          tipo,
          qtd,
          d.kpiCirurg > 0 ? +((qtd / d.kpiCirurg) * 100).toFixed(1) : 0,
        ]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsTipo, "Por Tipo");

    // Aba detalhamento
    const wsDet = XLSX.utils.aoa_to_sheet([
      [
        "Data",
        "Paciente",
        "Cirurgião",
        "Auxiliar",
        "Tipo",
        "Olho",
        "LIO",
        "Valor LIO",
        "Valor Total",
        "Honorários",
      ],
      ...d.cirurgiasArr
        .sort((a, b) => a._data.localeCompare(b._data))
        .map((c) => [
          c._data,
          c.paciente || "",
          c.medico_cirurgiao || "",
          c.medico_auxiliar || "",
          c.tipo_cirurgia || "",
          c.olho_operado || "",
          c.lio_implantada ? c.tipo_lio || "Sim" : "Não",
          c.lio_implantada ? c.valor_lio || 0 : 0,
          c.valor_total || 0,
          c.honorarios_lancados ? "Lançado" : "Pendente",
        ]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsDet, "Detalhamento");

    XLSX.writeFile(wb, `relatorio-${d.nomeMes.replace(/ /g, "-")}.xlsx`);
  },

  // ---- ABA: BACKUP ----
  _renderBackup(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Backup do Banco de Dados</span>
        </div>
        <p style="font-size:.9rem;color:var(--text-secondary);margin-bottom:1.5rem">
          Baixa todos os dados do sistema em um arquivo <strong>.json</strong>.
          Guarde em local seguro (nuvem pessoal, pen drive).
        </p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap">
          <button class="btn btn-primary" id="btn-backup-completo">
            <i data-lucide="download" width="16" height="16" aria-hidden="true"></i>
            Baixar Backup Completo
          </button>
        </div>
        <div id="backup-status" style="margin-top:1.25rem;font-size:.85rem;color:var(--text-secondary)"></div>
      </div>
    `;
    lucide.createIcons({ nodes: [container] });

    container
      .querySelector("#btn-backup-completo")
      ?.addEventListener("click", async () => {
        const btn = container.querySelector("#btn-backup-completo");
        const status = container.querySelector("#backup-status");
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-inline" aria-hidden="true"></span> Gerando backup…`;
        status.textContent = "";

        try {
          const [
            dados,
            usuarios,
            patrimonio,
            estoque,
            movimentacoes,
            fornecedores,
            metas,
          ] = await Promise.all([
            lerUmaVez("dados"),
            lerUmaVez("usuarios"),
            lerUmaVez("patrimonio"),
            lerUmaVez("estoque"),
            lerUmaVez("movimentacoes_estoque"),
            lerUmaVez("fornecedores"),
            lerUmaVez("metas"),
          ]);

          // Remover campos sensíveis de usuários antes de exportar
          const usuariosSanitizados = usuarios
            ? Object.fromEntries(
                Object.entries(usuarios).map(([uid, u]) => [
                  uid,
                  {
                    nome: u.nome,
                    email: u.email,
                    isAdmin: u.isAdmin,
                    permissoes: u.permissoes,
                  },
                ]),
              )
            : {};

          const backup = {
            _meta: {
              gerado_em: new Date().toISOString(),
              gerado_por: window.AppState?.nome || "admin",
              versao: "1.0",
            },
            dados: dados || {},
            usuarios: usuariosSanitizados,
            patrimonio: patrimonio || {},
            estoque: estoque || {},
            movimentacoes_estoque: movimentacoes || {},
            fornecedores: fornecedores || {},
            metas: metas || {},
          };

          const json = JSON.stringify(backup, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const dataHoje = new Date().toISOString().split("T")[0];
          a.href = url;
          a.download = `backup_oftalmo15_${dataHoje}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          const kb = (blob.size / 1024).toFixed(1);
          status.innerHTML = `<span style="color:var(--success)">✓ Backup gerado com sucesso — ${kb} KB</span>`;
          Alerts.sucesso("Backup baixado com sucesso!");
        } catch (err) {
          status.innerHTML = `<span style="color:var(--danger)">Erro ao gerar backup: ${escapeHtml(err.message || "")}</span>`;
          Alerts.erro("Erro ao gerar backup.");
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="download" width="16" height="16" aria-hidden="true"></i> Baixar Backup Completo`;
          lucide.createIcons({ nodes: [btn] });
        }
      });
  },

  // ---- ABA: AUDITORIA ----
  async _renderAuditoria(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Log de Auditoria</span>
          <div class="table-actions" id="audit-acoes"></div>
        </div>
        <div class="filter-bar mb-2">
          <input type="text" id="audit-busca" class="filter-input" placeholder="Buscar por ação, módulo ou usuário…">
        </div>
        <div class="loading-wrapper" id="audit-loading"><div class="spinner"></div>Carregando...</div>
        <div class="table-scroll" id="audit-table-wrap" style="display:none">
          <table class="data-table" id="tabela-auditoria" aria-label="Log de auditoria">
            <thead>
              <tr>
                <th scope="col">Data/Hora</th>
                <th scope="col">Usuário</th>
                <th scope="col">Ação</th>
                <th scope="col">Módulo</th>
                <th scope="col">ID Registro</th>
              </tr>
            </thead>
            <tbody id="tbody-auditoria"></tbody>
          </table>
        </div>
      </div>
    `;

    const acoes = container.querySelector("#audit-acoes");
    if (acoes)
      acoes.appendChild(
        criarBotaoExportar("tabela-auditoria", "Auditoria", "auditoria"),
      );
    lucide.createIcons({ nodes: [container] });

    let todosLogs = [];
    try {
      const snap = await lerUmaVez(`auditoria`);
      todosLogs = snap
        ? Object.values(snap).sort(
            (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
          )
        : [];
    } catch (_) {}

    document.getElementById("audit-loading").style.display = "none";
    document.getElementById("audit-table-wrap").style.display = "";

    const renderLog = (lista) => {
      const tbody = document.getElementById("tbody-auditoria");
      if (!tbody) return;
      tbody.innerHTML =
        lista
          .slice(0, 200)
          .map(
            (r) => `
        <tr>
          <td>${r.timestamp ? new Date(r.timestamp).toLocaleString("pt-BR") : "—"}</td>
          <td>${r.usuario_nome || r.uid || "—"}</td>
          <td><span class="badge badge-info">${r.acao || "—"}</span></td>
          <td>${r.modulo || "—"}</td>
          <td><code>${r.registro_id || "—"}</code></td>
        </tr>
      `,
          )
          .join("") ||
        `<tr><td colspan="5"><div class="table-empty"><p>Nenhum log encontrado.</p></div></td></tr>`;
    };

    renderLog(todosLogs);
    container.querySelector("#audit-busca")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      renderLog(
        todosLogs.filter(
          (r) =>
            (r.acao || "").includes(q) ||
            (r.modulo || "").includes(q) ||
            (r.usuario_nome || "").toLowerCase().includes(q),
        ),
      );
    });
  },
};
