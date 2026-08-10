// ================================================================
// faturamento.js — Módulo Faturamento / Dashboard Financeiro
// ================================================================

window.Modules = window.Modules || {};

window.Modules.faturamento = {
  _charts: [],
  _anoSelecionado: new Date().getFullYear(),
  _mesSelecionado: new Date().getMonth() + 1,

  mount(container) {
    if (!exigirPermissao("faturamento", container)) return;

    const mesAtual = String(this._mesSelecionado).padStart(2, "0");
    const mesInput = container.querySelector("#fat-mes");
    if (mesInput) mesInput.value = `${this._anoSelecionado}-${mesAtual}`;

    lucide.createIcons({ nodes: [container] });
    this._bindEventos(container);
    this._carregarDados();
  },

  async _carregarDados() {
    this._destruirCharts();
    const { inicio, fim } = intervaloMes(
      this._anoSelecionado,
      this._mesSelecionado,
    );

    const isAdm = AppState.isAdmin;
    const uid = AppState.uid;

    // Carregar honorários, metas e recepcao em paralelo
    // ALTERAÇÃO 4: busca dados da recepção para incluir nos cards dos médicos
    const [honorariosArr, metasSnap, recepcaoArr] = await Promise.all([
      buscarIntervalo("honorarios", inicio, fim),
      lerUmaVez(CAMINHOS.metas()),
      buscarIntervalo("pacientes", inicio, fim),
    ]);

    const lancados = honorariosArr.filter((r) => r.lancado);

    // Construir mapa por médico a partir dos lançamentos
    // CORRIGIDO: cada médico recebe seu próprio valor no papel que exerceu na cirurgia
    const porMedico = {};

    const _garantir = (nome) => {
      if (!nome || nome === "—") return;
      if (!porMedico[nome])
        porMedico[nome] = {
          cirurgiao: 0,
          lio_cir: 0,
          auxiliar: 0,
          instrumentador: 0,
          recepcao: 0, // ALTERAÇÃO 4: receita da recepção por médico
        };
    };

    lancados.forEach((r) => {
      // Cirurgião
      const nomeCir = r.nome_cirurgiao || "Desconhecido";
      if (isAdm || !r.uid_cirurgiao || r.uid_cirurgiao === uid) {
        _garantir(nomeCir);
        if (porMedico[nomeCir]) {
          porMedico[nomeCir].cirurgiao += r.honorario_cirurgiao_pf || 0;
          porMedico[nomeCir].lio_cir += r.lio_parte_cirurgiao || 0;
        }
      }

      // Auxiliar — acumula no card do próprio auxiliar
      const nomeAux = r.nome_auxiliar;
      if (nomeAux && nomeAux !== "—" && nomeAux !== "") {
        _garantir(nomeAux);
        porMedico[nomeAux].auxiliar += r.honorario_auxiliar_pf || 0;
      }

      // Instrumentador — acumula no card do próprio instrumentador
      const nomeInst = r.nome_instrumentador;
      if (nomeInst && nomeInst !== "—" && nomeInst !== "") {
        _garantir(nomeInst);
        porMedico[nomeInst].instrumentador +=
          r.honorario_instrumentador_pf || 0;
      }
    });

    // Garantir que médicos com meta cadastrada apareçam mesmo sem lançamentos
    if (metasSnap) {
      Object.values(metasSnap).forEach((m) => {
        if (m.nome && !porMedico[m.nome]) {
          porMedico[m.nome] = {
            cirurgiao: 0,
            lio_cir: 0,
            auxiliar: 0,
            instrumentador: 0,
            recepcao: 0, // ALTERAÇÃO 4
          };
        }
      });
    }

    // ALTERAÇÃO 4: acumular receita da recepção por médico
    recepcaoArr.forEach((r) => {
      const medico = r.medico;
      if (!medico) return;
      _garantir(medico);
      if (porMedico[medico]) {
        porMedico[medico].recepcao += parseFloat(r.valor) || 0;
      }
    });

    // ── Card Clínica CNPJ — em destaque, antes dos médicos, somente admin ──
    const cliEl = document.getElementById("fat-card-clinica");
    if (cliEl && isAdm) {
      const totalCNPJ = lancados.reduce(
        (s, r) => s + (r.valor_clinica_cnpj || 0),
        0,
      );
      const totalLioCli = lancados.reduce(
        (s, r) => s + (r.lio_parte_clinica || 0),
        0,
      );
      const numCirurgias = lancados.length;
      cliEl.innerHTML = `
        <div class="card" style="max-width:420px;border-left:4px solid var(--accent)">
          <div class="card-header">
            <span class="card-title" style="font-size:1rem">Clínica (CNPJ)</span>
            <div class="card-icon icon-blue">
              <i data-lucide="building-2" width="18" height="18" aria-hidden="true"></i>
            </div>
          </div>
          <div class="metric-value" style="font-size:1.75rem;margin-bottom:.75rem">${formatarMoeda(totalCNPJ + totalLioCli)}</div>
          <div style="display:flex;flex-direction:column;gap:.4rem;font-size:0.85rem;color:var(--text-secondary)">
            <div style="display:flex;justify-content:space-between">
              <span>Honorários Cirurgias</span><strong style="color:var(--text-primary)">${formatarMoeda(totalCNPJ)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>LIO (parte clínica)</span><strong style="color:var(--text-primary)">${formatarMoeda(totalLioCli)}</strong>
            </div>
            <div style="border-top:1px solid var(--border);margin:.25rem 0"></div>
            <div style="display:flex;justify-content:space-between">
              <span>Nº de Cirurgias</span><strong style="color:var(--text-primary)">${numCirurgias}</strong>
            </div>
          </div>
        </div>`;
      lucide.createIcons({ nodes: [cliEl] });
    } else if (cliEl) {
      cliEl.innerHTML = "";
    }

    // ── Cards por médico ──
    const cardsEl = document.getElementById("fat-cards-medicos");
    if (!cardsEl) return;

    const nomes = Object.keys(porMedico).sort();

    if (nomes.length === 0) {
      cardsEl.innerHTML = `
        <div class="card" style="grid-column:1/-1">
          <div class="table-empty">
            <i data-lucide="bar-chart-3" width="32" height="32" aria-hidden="true"></i>
            <p>Cadastre médicos em <strong>Administração → Metas</strong> para visualizar os cards.</p>
          </div>
        </div>`;
      lucide.createIcons({ nodes: [cardsEl] });
    } else {
      cardsEl.innerHTML = nomes
        .map((nome) => {
          const d = porMedico[nome];
          // ALTERAÇÃO 4: total inclui receita da recepção
          const total =
            d.cirurgiao +
            d.lio_cir +
            d.auxiliar +
            d.instrumentador +
            d.recepcao;
          const lioLine =
            d.lio_cir > 0
              ? `<div style="display:flex;justify-content:space-between">
                <span>LIO (parte ${nome.startsWith("Dra.") ? "dela" : "dele"})</span>
                <strong style="color:#7c3aed">${formatarMoeda(d.lio_cir)}</strong>
               </div>`
              : "";
          // ALTERAÇÃO 4: linha de receita da recepção (cor verde claro)
          const recLine =
            d.recepcao > 0
              ? `<div style="display:flex;justify-content:space-between">
                <span>Receita Recepção</span>
                <strong style="color:#16a34a">${formatarMoeda(d.recepcao)}</strong>
               </div>`
              : "";
          return `
          <div class="card" style="border-left:4px solid var(--accent)">
            <div class="card-header">
              <span class="card-title">${nome}</span>
              <div class="card-icon icon-blue">
                <i data-lucide="user" width="16" height="16" aria-hidden="true"></i>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:.35rem;font-size:0.85rem;color:var(--text-secondary);margin-bottom:.75rem">
              ${recLine}
              <div style="display:flex;justify-content:space-between">
                <span>Receita Cirurgia</span>
                <strong style="color:#2563eb">${formatarMoeda(d.cirurgiao)}</strong>
              </div>
              ${lioLine}
              <div style="display:flex;justify-content:space-between">
                <span>Como Auxiliar</span>
                <strong style="color:#8b5cf6">${formatarMoeda(d.auxiliar)}</strong>
              </div>
              <div style="border-top:1px solid var(--border);margin:.2rem 0"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:.9rem;font-weight:700">
              <span>Total</span>
              <span class="table-number" style="color:var(--accent)">${formatarMoeda(total)}</span>
            </div>
          </div>`;
        })
        .join("");
      lucide.createIcons({ nodes: [cardsEl] });
    }

    const chartEl = document.getElementById("chart-por-medico");
    if (chartEl && nomes.length > 0) {
      const c = new Chart(chartEl, {
        type: "bar",
        data: {
          labels: nomes,
          datasets: [
            {
              label: "Cirurgião PF",
              data: nomes.map((n) => porMedico[n].cirurgiao),
              backgroundColor: "#2563eb",
            },
            {
              label: "LIO Cirurgião",
              data: nomes.map((n) => porMedico[n].lio_cir),
              backgroundColor: "#7c3aed",
            },
            {
              label: "Auxiliar",
              data: nomes.map((n) => porMedico[n].auxiliar),
              backgroundColor: "#059669",
            },
            // ALTERAÇÃO 4: dataset de receita da recepção no gráfico de barras
            {
              label: "Recepção",
              data: nomes.map((n) => porMedico[n].recepcao),
              backgroundColor: "#10b981",
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } },
          scales: {
            y: {
              ticks: { callback: (v) => "R$" + (v / 1000).toFixed(0) + "k" },
            },
          },
        },
      });
      this._charts.push(c);
    }

    const anoMesAlvo = `${this._anoSelecionado}-${String(this._mesSelecionado).padStart(2, "0")}`;
    this._renderMetas(porMedico, anoMesAlvo);
    // ALTERAÇÃO 5: renderizar gráficos de receita da recepção
    this._renderizarGraficosRecepcao(recepcaoArr);
  },

  async _renderMetas(porMedico, anoMesAlvo) {
    const snap = await lerUmaVez(CAMINHOS.metas());
    const el = document.getElementById("fat-metas-progress");
    if (!el) return;
    const todasMetas = snap ? Object.values(snap) : [];
    if (todasMetas.length === 0) {
      el.innerHTML =
        '<p class="text-muted" style="font-size:.8rem">Nenhuma meta cadastrada.</p>';
      return;
    }

    // Uma meta "efetiva" por médico para o mês selecionado (carry-forward)
    const nomes = [...new Set(todasMetas.map((m) => m.nome))];
    const metas = nomes
      .map((nome) => metaEfetiva(todasMetas, nome, anoMesAlvo))
      .filter(Boolean);
    if (metas.length === 0) {
      el.innerHTML =
        '<p class="text-muted" style="font-size:.8rem">Nenhuma meta cadastrada para este mês.</p>';
      return;
    }

    el.innerHTML = metas
      .map((m) => {
        const total = porMedico[m.nome] || {};
        // CORRIGIDO: faltava somar "instrumentador" — deixava o "atual" da
        // meta menor que o total realmente mostrado nos cards por médico
        const atual =
          (total.cirurgiao || 0) +
          (total.lio_cir || 0) +
          (total.auxiliar || 0) +
          (total.instrumentador || 0) +
          (total.recepcao || 0);
        const meta = m.valor || 0;
        const pct =
          meta > 0 ? Math.min(100, Math.round((atual / meta) * 100)) : 0;
        const cor = pct >= 100 ? "#059669" : pct >= 70 ? "#d97706" : "#dc2626";
        return `
        <div style="margin-bottom:1rem">
          <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.25rem">
            <strong>${m.nome}</strong><span style="color:${cor}">${pct}%</span>
          </div>
          <div style="background:var(--bg-secondary);border-radius:4px;height:8px">
            <div style="background:${cor};border-radius:4px;height:8px;width:${pct}%;transition:width .4s"></div>
          </div>
          <div style="font-size:.75rem;color:var(--text-secondary);margin-top:.15rem">
            ${formatarMoeda(atual)} / ${formatarMoeda(meta)}
          </div>
        </div>
      `;
      })
      .join("");
  },

  // ALTERAÇÃO 5: renderiza os 3 gráficos de receita da recepção
  _renderizarGraficosRecepcao(recepcaoArr) {
    if (!recepcaoArr || recepcaoArr.length === 0) {
      const secao = document.getElementById("secao-graficos-recepcao");
      if (secao) secao.style.display = "none";
      return;
    }
    const secao = document.getElementById("secao-graficos-recepcao");
    if (secao) secao.style.display = "";

    // Agrupar por médico
    const porMedicoRec = {};
    recepcaoArr.forEach((r) => {
      const m = r.medico || "Não informado";
      porMedicoRec[m] = (porMedicoRec[m] || 0) + (parseFloat(r.valor) || 0);
    });

    // Agrupar por origem
    const origens = { Base: 0, Convênio: 0, Indicação: 0, Lead: 0 };
    recepcaoArr.forEach((r) => {
      const o = r.origem || "Base";
      if (origens[o] !== undefined) origens[o] += parseFloat(r.valor) || 0;
      else origens["Base"] += parseFloat(r.valor) || 0;
    });

    // Gráfico 1 — por médico (barras)
    const ctxMedico = document.getElementById("chart-recepcao-medico");
    if (ctxMedico) {
      const nomes = Object.keys(porMedicoRec);
      const c1 = new Chart(ctxMedico, {
        type: "bar",
        data: {
          labels: nomes,
          datasets: [
            {
              label: "Receita Recepção (R$)",
              data: nomes.map((n) => porMedicoRec[n]),
              backgroundColor: [
                "#2563eb",
                "#10b981",
                "#f59e0b",
                "#8b5cf6",
                "#ef4444",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (v) => "R$" + (v / 1000).toFixed(0) + "k" },
            },
          },
        },
      });
      this._charts.push(c1);
    }

    // Gráfico 2 — por origem (doughnut)
    const ctxOrigem = document.getElementById("chart-recepcao-origem");
    if (ctxOrigem) {
      const c2 = new Chart(ctxOrigem, {
        type: "doughnut",
        data: {
          labels: ["Base", "Indicação", "Lead", "Convênio"],
          datasets: [
            {
              data: [
                origens["Base"],
                origens["Indicação"],
                origens["Lead"],
                origens["Convênio"],
              ],
              backgroundColor: ["#dc2626", "#16a34a", "#2563eb", "#8b5cf6"],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${formatarMoeda(ctx.raw)}`,
              },
            },
          },
        },
      });
      this._charts.push(c2);
    }
  },

  _destruirCharts() {
    this._charts.forEach((c) => {
      try {
        c.destroy();
      } catch (_) {}
    });
    this._charts = [];
  },

  _bindEventos(container) {
    container.querySelector("#fat-mes")?.addEventListener("change", (e) => {
      const [ano, mes] = e.target.value.split("-");
      this._anoSelecionado = parseInt(ano);
      this._mesSelecionado = parseInt(mes);
      this._carregarDados();
    });
  },
};
