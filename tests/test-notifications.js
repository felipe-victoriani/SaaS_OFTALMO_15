// ================================================================
// test-notifications.js — Testes de lógica de vencimentos e metas
// ================================================================
"use strict";

// Lógica de classificação de vencimentos (isolada)
function _classificarVencimento(dataStr) {
  if (!dataStr) return null;
  const dias = diasAteVencer(dataStr);
  if (dias < 0) return "vencido";
  if (dias === 0) return "vence_hoje";
  if (dias <= 7) return "critico";
  if (dias <= 30) return "breve";
  return "regular";
}

function _deveNotificar(dataStr) {
  const status = _classificarVencimento(dataStr);
  return ["vencido", "vence_hoje", "critico", "breve"].includes(status);
}

// Lógica de meta
function _calcularProgressoMeta(totalAtual, meta) {
  if (!meta || meta <= 0) return 0;
  return Math.round((totalAtual / meta) * 100);
}

function _metaAtingida(totalAtual, meta) {
  return meta > 0 && totalAtual >= meta;
}

// Datas auxiliares
function dataRelativa(deltaDias) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDias);
  return d.toISOString().slice(0, 10);
}

defineSuite("Notifications — Vencimentos e Metas", [
  {
    name: 'Vencimento passado = "vencido"',
    fn() {
      assert.equal(_classificarVencimento(dataRelativa(-5)), "vencido");
    },
  },
  {
    name: 'Vencimento hoje = "vence_hoje"',
    fn() {
      assert.equal(_classificarVencimento(dataRelativa(0)), "vence_hoje");
    },
  },
  {
    name: 'Vencimento em 3 dias = "critico"',
    fn() {
      assert.equal(_classificarVencimento(dataRelativa(3)), "critico");
    },
  },
  {
    name: 'Vencimento em 20 dias = "breve"',
    fn() {
      assert.equal(_classificarVencimento(dataRelativa(20)), "breve");
    },
  },
  {
    name: 'Vencimento em 60 dias = "regular"',
    fn() {
      assert.equal(_classificarVencimento(dataRelativa(60)), "regular");
    },
  },
  {
    name: "deveNotificar: vencido deve notificar",
    fn() {
      assert.equal(_deveNotificar(dataRelativa(-1)), true);
    },
  },
  {
    name: "deveNotificar: vence em 30 dias deve notificar",
    fn() {
      assert.equal(_deveNotificar(dataRelativa(30)), true);
    },
  },
  {
    name: "deveNotificar: vence em 90 dias não deve notificar",
    fn() {
      assert.equal(_deveNotificar(dataRelativa(90)), false);
    },
  },
  {
    name: "deveNotificar: data null retorna false",
    fn() {
      assert.equal(_deveNotificar(null), false);
    },
  },
  {
    name: "Progresso de meta 0% com total zero",
    fn() {
      assert.equal(_calcularProgressoMeta(0, 10000), 0);
    },
  },
  {
    name: "Progresso de meta 50%",
    fn() {
      assert.equal(_calcularProgressoMeta(5000, 10000), 50);
    },
  },
  {
    name: "Progresso de meta 100%",
    fn() {
      assert.equal(_calcularProgressoMeta(10000, 10000), 100);
    },
  },
  {
    name: "Progresso não ultrapassa 100% (cap na função de render)",
    fn() {
      const pct = Math.min(100, _calcularProgressoMeta(15000, 10000));
      assert.equal(pct, 100);
    },
  },
  {
    name: "metaAtingida: false quando total < meta",
    fn() {
      assert.equal(_metaAtingida(9999, 10000), false);
    },
  },
  {
    name: "metaAtingida: true quando total >= meta",
    fn() {
      assert.equal(_metaAtingida(10000, 10000), true);
      assert.equal(_metaAtingida(12000, 10000), true);
    },
  },
  {
    name: "metaAtingida: false quando meta é zero",
    fn() {
      assert.equal(_metaAtingida(5000, 0), false);
    },
  },
]);
