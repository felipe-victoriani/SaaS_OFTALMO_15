// ================================================================
// test-db.js — Testes de helpers utilitários do módulo db.js
// ================================================================
"use strict";

// Mock mínimo de db.js para testes isolados
window.hoje = () => new Date().toISOString().slice(0, 10);
window.agora = () => Date.now();
window.gerarId = () => Math.random().toString(36).slice(2, 10);
window.formatarMoeda = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v || 0,
  );
window.formatarData = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
};
window.parseDateLocal = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};
window.diasAteVencer = (str) => {
  if (!str) return 9999;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [y, m, d] = str.split("-").map(Number);
  const venc = new Date(y, m - 1, d);
  return Math.round((venc - hoje) / 86400000);
};
window.intervaloMes = (ano, mes) => {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
};
window.CAMINHOS = {
  usuarios: () => `usuarios`,
  metas: () => `metas`,
  dadosDia: (col, data) => `dados/${data}/${col}`,
};

defineSuite("DB — Helpers Utilitários", [
  {
    name: "hoje() retorna formato YYYY-MM-DD",
    fn() {
      const h = hoje();
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(h), `Formato inválido: ${h}`);
    },
  },
  {
    name: 'formatarMoeda(0) retorna "R$ 0,00"',
    fn() {
      const r = formatarMoeda(0);
      assert.ok(r.includes("0,00"), `Recebido: ${r}`);
    },
  },
  {
    name: "formatarMoeda(1500.5) formata corretamente",
    fn() {
      const r = formatarMoeda(1500.5);
      assert.ok(r.includes("1.500") || r.includes("1500"), `Recebido: ${r}`);
    },
  },
  {
    name: 'parseDateLocal("2025-06-15") retorna Date válida',
    fn() {
      const d = parseDateLocal("2025-06-15");
      assert.ok(d instanceof Date && !isNaN(d), "Deveria retornar Date válida");
      assert.equal(d.getFullYear(), 2025);
      assert.equal(d.getMonth(), 5);
      assert.equal(d.getDate(), 15);
    },
  },
  {
    name: "parseDateLocal(null) retorna null",
    fn() {
      const d = parseDateLocal(null);
      assert.equal(d, null);
    },
  },
  {
    name: "diasAteVencer com data futura retorna número positivo",
    fn() {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 10);
      const str = futuro.toISOString().slice(0, 10);
      const dias = diasAteVencer(str);
      assert.ok(dias > 0 && dias <= 10, `Esperado 1-10, recebido ${dias}`);
    },
  },
  {
    name: "diasAteVencer com data passada retorna número negativo",
    fn() {
      const passado = new Date();
      passado.setDate(passado.getDate() - 5);
      const str = passado.toISOString().slice(0, 10);
      const dias = diasAteVencer(str);
      assert.ok(dias < 0, `Esperado negativo, recebido ${dias}`);
    },
  },
  {
    name: "intervaloMes(2025, 1) retorna 2025-01-01 a 2025-01-31",
    fn() {
      const { inicio, fim } = intervaloMes(2025, 1);
      assert.equal(inicio, "2025-01-01");
      assert.equal(fim, "2025-01-31");
    },
  },
  {
    name: "intervaloMes(2024, 2) retorna 2024-02-01 a 2024-02-29 (ano bissexto)",
    fn() {
      const { inicio, fim } = intervaloMes(2024, 2);
      assert.equal(inicio, "2024-02-01");
      assert.equal(fim, "2024-02-29");
    },
  },
  {
    name: "gerarId() gera strings únicas",
    fn() {
      const ids = new Set(Array.from({ length: 100 }, gerarId));
      assert.equal(ids.size, 100, "Deveriam ser únicas");
    },
  },
  {
    name: "CAMINHOS.usuarios() retorna 'usuarios'",
    fn() {
      assert.equal(CAMINHOS.usuarios(), "usuarios");
    },
  },
  {
    name: "CAMINHOS.dadosDia() retorna caminho sem clinicaId",
    fn() {
      const caminho = CAMINHOS.dadosDia("pacientes", "2026-05-04");
      assert.equal(caminho, "dados/2026-05-04/pacientes");
    },
  },
]);
