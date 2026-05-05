// ================================================================
// test-honorarios.js — Testes de lógica dos honorários
// ================================================================
"use strict";

// Lógica de divisão de LIO (isolada para teste)
function _calcularLIO(lioTotal, parteCircurgiao) {
  const cir = Math.max(0, Math.min(lioTotal, parteCircurgiao));
  const cli = Math.max(0, lioTotal - cir);
  return { lio_parte_cirurgiao: cir, lio_parte_clinica: cli };
}

function _calcularTotalCirurgiao(honPF, lioCir) {
  return (honPF || 0) + (lioCir || 0);
}

function _calcularTotalGeral(cirPF, lioCir, auxPF, instPF, lioCli, cliCNPJ) {
  return (
    (cirPF || 0) +
    (lioCir || 0) +
    (auxPF || 0) +
    (instPF || 0) +
    (lioCli || 0) +
    (cliCNPJ || 0)
  );
}

function _validarLancamento(dados) {
  if (dados.honorario_cirurgiao_pf < 0) return false;
  if (dados.honorario_auxiliar_pf < 0) return false;
  if (dados.honorario_instrumentador_pf < 0) return false;
  if (dados.valor_clinica_cnpj < 0) return false;
  return true;
}

// Simular criação de rascunho de honorários a partir de uma cirurgia
function _criarRascunhoHonorarios(cirurgia) {
  return {
    paciente: cirurgia.paciente,
    nome_cirurgiao: cirurgia.nome_cirurgiao,
    nome_auxiliar: cirurgia.nome_auxiliar || null,
    nome_instrumentador: cirurgia.nome_instrumentador || null,
    tipo_cirurgia: cirurgia.tipo,
    olho_operado: cirurgia.olho,
    valor_lio_total: cirurgia.valor_lio_total || 0,
    lio_parte_cirurgiao: cirurgia.valor_lio_total || 0,
    lio_parte_clinica: 0,
    honorario_cirurgiao_pf: 0,
    honorario_auxiliar_pf: 0,
    honorario_instrumentador_pf: 0,
    valor_clinica_cnpj: 0,
    lancado: false,
    _data: cirurgia.data || hoje(),
  };
}

defineSuite("Honorários — Lógica de Divisão", [
  {
    name: "LIO: parte clínica = total - parte cirurgião",
    fn() {
      const { lio_parte_cirurgiao, lio_parte_clinica } = _calcularLIO(
        3000,
        2000,
      );
      assert.equal(lio_parte_cirurgiao, 2000);
      assert.equal(lio_parte_clinica, 1000);
    },
  },
  {
    name: "LIO: cirurgião não pode ser maior que total",
    fn() {
      const { lio_parte_cirurgiao, lio_parte_clinica } = _calcularLIO(
        1000,
        1500,
      );
      assert.equal(lio_parte_cirurgiao, 1000);
      assert.equal(lio_parte_clinica, 0);
    },
  },
  {
    name: "LIO: valores negativos são zerados",
    fn() {
      const { lio_parte_cirurgiao, lio_parte_clinica } = _calcularLIO(
        500,
        -100,
      );
      assert.ok(lio_parte_cirurgiao >= 0);
      assert.ok(lio_parte_clinica >= 0);
    },
  },
  {
    name: "Total cirurgião = honorário PF + LIO cirurgião",
    fn() {
      const total = _calcularTotalCirurgiao(1200, 800);
      assert.equal(total, 2000);
    },
  },
  {
    name: "Total geral soma todos os campos corretamente",
    fn() {
      const total = _calcularTotalGeral(1000, 500, 300, 200, 500, 1000);
      assert.equal(total, 3500);
    },
  },
  {
    name: "Total geral com todos zeros = 0",
    fn() {
      assert.equal(_calcularTotalGeral(0, 0, 0, 0, 0, 0), 0);
    },
  },
  {
    name: "Validação rejeita valores negativos",
    fn() {
      const ok = _validarLancamento({
        honorario_cirurgiao_pf: -1,
        honorario_auxiliar_pf: 0,
        honorario_instrumentador_pf: 0,
        valor_clinica_cnpj: 0,
      });
      assert.equal(ok, false);
    },
  },
  {
    name: "Validação aceita valores zerados",
    fn() {
      const ok = _validarLancamento({
        honorario_cirurgiao_pf: 0,
        honorario_auxiliar_pf: 0,
        honorario_instrumentador_pf: 0,
        valor_clinica_cnpj: 0,
      });
      assert.equal(ok, true);
    },
  },
  {
    name: "Rascunho de honorários criado com lancado=false",
    fn() {
      const cirurgia = {
        paciente: "Maria",
        nome_cirurgiao: "Dr. João",
        tipo: "Facoemulsificação",
        olho: "OD",
        valor_lio_total: 2500,
        data: "2025-06-01",
      };
      const rascunho = _criarRascunhoHonorarios(cirurgia);
      assert.equal(rascunho.lancado, false);
      assert.equal(rascunho.paciente, "Maria");
    },
  },
  {
    name: "Rascunho: lio_parte_cirurgiao = valor_lio_total por padrão",
    fn() {
      const cirurgia = {
        paciente: "X",
        nome_cirurgiao: "Dr.",
        tipo: "T",
        olho: "OE",
        valor_lio_total: 3000,
        data: "2025-01-01",
      };
      const rascunho = _criarRascunhoHonorarios(cirurgia);
      assert.equal(rascunho.lio_parte_cirurgiao, 3000);
      assert.equal(rascunho.lio_parte_clinica, 0);
    },
  },
  {
    name: "Rascunho: cirurgia sem LIO tem lio_parte_cirurgiao=0",
    fn() {
      const cirurgia = {
        paciente: "Y",
        nome_cirurgiao: "Dr.",
        tipo: "T",
        olho: "AO",
        data: "2025-01-15",
      };
      const rascunho = _criarRascunhoHonorarios(cirurgia);
      assert.equal(rascunho.lio_parte_cirurgiao, 0);
    },
  },
  {
    name: "LIO: cirurgião=0, tudo vai para clínica",
    fn() {
      const { lio_parte_cirurgiao, lio_parte_clinica } = _calcularLIO(2000, 0);
      assert.equal(lio_parte_cirurgiao, 0);
      assert.equal(lio_parte_clinica, 2000);
    },
  },
]);
