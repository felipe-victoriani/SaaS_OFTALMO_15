// ================================================================
// notifications.js — Sistema de Notificações de Vencimento (Login)
// ================================================================

/**
 * Verifica itens de patrimônio vencidos ou próximos do vencimento.
 * Exibe toasts sequenciais após o login.
 * Executar após AppState estar pronto.
 */
async function verificarVencimentos() {
  const { isAdmin: admin, userData, uid } = window.AppState;
  const perm = userData?.permissoes || {};

  // Apenas admin ou usuário com permissão de patrimônio recebe alertas
  if (!admin && perm.patrimonio !== true) return;

  try {
    const snap = await db.ref(CAMINHOS.patrimonio()).get();
    const itens = snap.val();
    if (!itens) return;

    const alertas = [];

    Object.entries(itens).forEach(([id, item]) => {
      if (!item.data_vencimento) return;

      const dias = diasAteVencer(item.data_vencimento);

      if (dias < 0) {
        // Vencido
        alertas.push({
          tipo: "error",
          msg: `[VENCIDO] ${item.nome} — venceu em ${formatarData(item.data_vencimento)}`,
          id,
        });
      } else if (dias <= 30) {
        // Vence em breve
        alertas.push({
          tipo: "warning",
          msg: `[ATENÇÃO] ${item.nome} — vence em ${formatarData(item.data_vencimento)} (${dias} dia${dias !== 1 ? "s" : ""})`,
          id,
        });
      }
    });

    if (alertas.length === 0) return;

    const MAX = 5;
    const exibir = alertas.slice(0, MAX);
    const restantes = alertas.length - exibir.length;

    // Exibir toasts com intervalo de 800ms
    exibir.forEach((alerta, idx) => {
      setTimeout(() => {
        Alerts.vencimento(alerta.msg, alerta.tipo, null, 6000);
      }, idx * 800);
    });

    // Toast de resumo se houver mais itens
    if (restantes > 0) {
      setTimeout(() => {
        Alerts.vencimento(
          `+ ${restantes} outro${restantes > 1 ? "s" : ""} item${restantes > 1 ? "s" : ""} requer${restantes === 1 ? "" : "em"} atenção → <a href="#patrimonio" style="color:var(--accent);text-decoration:underline">ver Patrimônio</a>`,
          "warning",
          null,
          8000,
        );
      }, exibir.length * 800);
    }
  } catch (err) {
    console.warn("[notifications] Erro ao verificar vencimentos:", err);
  }
}

/**
 * Verifica metas atingidas ao salvar novos valores de honorários/faturamento.
 * Exibe toast de parabenização se a meta for atingida ou superada.
 * @param {string} medicoNome - nome do médico
 * @param {number} totalAtual - valor total atual no período
 * @param {number} meta - valor da meta
 */
function verificarMeta(medicoNome, totalAtual, meta) {
  if (meta <= 0) return;
  const pct = Math.round((totalAtual / meta) * 100);
  if (pct >= 100) {
    Alerts.sucesso(
      `Meta de ${formatarMoeda(meta)} atingida por ${medicoNome}! (${pct}%)`,
      6000,
    );
  }
}
