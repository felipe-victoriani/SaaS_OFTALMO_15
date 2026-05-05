// ================================================================
// faturamento.js — Módulo Faturamento / Dashboard Financeiro
// ================================================================

window.Modules = window.Modules || {};

window.Modules.faturamento = {
  _charts: [],
  _anoSelecionado: new Date().getFullYear(),
  _mesSelecionado: new Date().getMonth() + 1,

  render(container) {
    if (!exigirPermissao("faturamento", container)) return;

    const mesAtual = String(this._mesSelecionado).padStart(2, "0");
    container.innerHTML = `
      <div class="page-content">
        <div class="module-header">
          <h1 class="module-title">
            <i data-lucide="bar-chart-3" width="24" height="24" aria-hidden="true"></i>
            Faturamento
          </h1>
          <p class="module-subtitle">Visão financeira consolidada por médico e período</p>
        </div>

        <!-- Filtro -->
        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1.5rem">
          <label class="form-label" style="margin:0">Mês/Ano:</label>
          <input type="month" id="fat-mes" class="filter-input" value="${this._anoSelecionado}-${mesAtual}" style="width:auto">
        </div>

        <!-- Cardsméo médico -->
        <div class="cards-grid" id="fat-cards-medicos">
          <div class="card" style="grid-column:1/-1"><div class="loading-wrapper"><div class="spinner"></div>Carregando...</div></div>
        </div>

        <!-- Card Clínica CNPJ (admin) -->
        <div id="fat-card-clinica"></div>

        <!-- Charts -->
        <div class="cards-grid mt-3" style="grid-template-columns:2fr 1fr">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Faturamento por Médico</span>
            </div>
            <canvas id="chart-por-medico" height="180"></canvas>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Progresso de Metas</span>
            </div>
            <div id="fat-metas-progress"></div>
          </div>
        </div>
      </div>
    `;

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
    const [honorariosArr, metasSnap] = await Promise.all([
      buscarIntervalo("honorarios", inicio, fim),
      lerUmaVez(`${CAMINHOS.usuarios()}`),
    ]);

    const uid = AppState.uid;
    const isAdm = AppState.isAdmin;

    // Filtrar apenas lançados
    const lancados = honorariosArr.filter((r) => r.lancado);

    // Agrupar por cirurgião
    const porMedico = {};
    lancados.forEach((r) => {
      const nome = r.nome_cirurgiao || "Desconhecido";
      if (!isAdm && r.uid_cirurgiao && r.uid_cirurgiao !== uid) return;
      if (!porMedico[nome])
        porMedico[nome] = {
          cirurgiao: 0,
          lio_cir: 0,
          auxiliar: 0,
          instrumentador: 0,
          clinicaPF: 0,
        };
      porMedico[nome].cirurgiao += r.honorario_cirurgiao_pf || 0;
      porMedico[nome].lio_cir += r.lio_parte_cirurgiao || 0;
      porMedico[nome].auxiliar += r.honorario_auxiliar_pf || 0;
      porMedico[nome].instrumentador += r.honorario_instrumentador_pf || 0;
    });

    // Cards por médico
    const cardsEl = document.getElementById("fat-cards-medicos");
    if (!cardsEl) return;
    const nomes = Object.keys(porMedico);

    if (nomes.length === 0) {
      cardsEl.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="table-empty">
        <i data-lucide="bar-chart-3" width="32" height="32"></i>
        <p>Nenhum honorário lançado neste período.</p>
      </div></div>`;
      lucide.createIcons({ nodes: [cardsEl] });
      return;
    }

    cardsEl.innerHTML = nomes
      .map((nome) => {
        const d = porMedico[nome];
        const total = d.cirurgiao + d.lio_cir + d.auxiliar + d.instrumentador;
        return `
        <div class="card">
          <div class="card-header">
            <span class="card-title">${nome}</span>
          </div>
          <div class="metric-value" style="font-size:1.5rem">${formatarMoeda(total)}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:.5rem">
            <div style="display:flex;justify-content:space-between"><span>Como Cirurgião PF</span><strong>${formatarMoeda(d.cirurgiao)}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>LIO (parte cirurgião)</span><strong>${formatarMoeda(d.lio_cir)}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>Como Auxiliar</span><strong>${formatarMoeda(d.auxiliar)}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>Como Instrumentador</span><strong>${formatarMoeda(d.instrumentador)}</strong></div>
          </div>
        </div>
      `;
      })
      .join("");
    lucide.createIcons({ nodes: [cardsEl] });

    // Card Clínica CNPJ (admin only)
    if (isAdm) {
      const totalCNPJ = lancados.reduce(
        (s, r) => s + (r.valor_clinica_cnpj || 0),
        0,
      );
      const totalLioCli = lancados.reduce(
        (s, r) => s + (r.lio_parte_clinica || 0),
        0,
      );
      const cliEl = document.getElementById("fat-card-clinica");
      if (cliEl)
        cliEl.innerHTML = `
        <div class="card mt-2" style="max-width:360px">
          <div class="card-header"><span class="card-title">Clínica (CNPJ)</span></div>
          <div class="metric-value">${formatarMoeda(totalCNPJ + totalLioCli)}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:.5rem">
            <div style="display:flex;justify-content:space-between"><span>Honorários CNPJ</span><strong>${formatarMoeda(totalCNPJ)}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>LIO (parte clínica)</span><strong>${formatarMoeda(totalLioCli)}</strong></div>
          </div>
        </div>
      `;
    }

    // Chart por médico
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

    // Metas (do nó metas/ no Firebase)
    this._renderMetas(porMedico);
  },

  async _renderMetas(porMedico) {
    const snap = await lerUmaVez(CAMINHOS.metas());
    const el = document.getElementById("fat-metas-progress");
    if (!el) return;
    if (!snap) {
      el.innerHTML =
        '<p class="text-muted" style="font-size:.8rem">Nenhuma meta cadastrada.</p>';
      return;
    }

    const metas = Object.values(snap);
    if (metas.length === 0) {
      el.innerHTML =
        '<p class="text-muted" style="font-size:.8rem">Nenhuma meta cadastrada.</p>';
      return;
    }

    el.innerHTML = metas
      .map((m) => {
        const total = porMedico[m.nome] || {};
        const atual =
          (total.cirurgiao || 0) + (total.lio_cir || 0) + (total.auxiliar || 0);
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
