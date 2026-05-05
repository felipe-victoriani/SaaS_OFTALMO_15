// ================================================================
// test-permissions.js — Testes do sistema de permissões
// ================================================================
"use strict";

// Mock de AppState e funções de permissão
function _mockAppState(uid, admin, permissoes) {
  window.AppState = { uid, isAdmin: admin, userData: { admin, permissoes } };
}

// Versão local das funções de permissão para teste isolado
function _verificarPermissao(modulo) {
  if (!AppState) return false;
  if (AppState.isAdmin) return true;
  const perm = AppState.userData?.permissoes || {};
  const chave = modulo === "callcenter" ? "call_center" : modulo;
  return perm[chave] === true;
}

function _isAdmin() {
  return !!AppState?.isAdmin;
}

function _filtrarPorUsuario(registros) {
  if (!AppState) return [];
  if (AppState.isAdmin) return registros;
  return registros.filter((r) => r.registrado_por === AppState.uid);
}

function _modulosPermitidos() {
  if (!AppState) return [];
  const todos = [
    "recepcao",
    "call_center",
    "cirurgico",
    "honorarios",
    "faturamento",
    "patrimonio",
    "estoque",
    "fornecedores",
    "admin",
  ];
  if (AppState.isAdmin) return todos;
  const perm = AppState.userData?.permissoes || {};
  return todos.filter((m) => (m === "admin" ? false : perm[m] === true));
}

defineSuite("Permissions — Controle de Acesso", [
  {
    name: "Admin tem acesso a qualquer módulo",
    fn() {
      _mockAppState("admin1", true, {});
      assert.equal(_verificarPermissao("cirurgico"), true);
      assert.equal(_verificarPermissao("honorarios"), true);
      assert.equal(_verificarPermissao("admin"), true);
    },
  },
  {
    name: "Usuário sem permissão não acessa módulo restrito",
    fn() {
      _mockAppState("u1", false, { recepcao: true });
      assert.equal(_verificarPermissao("honorarios"), false);
      assert.equal(_verificarPermissao("admin"), false);
    },
  },
  {
    name: "Usuário com permissão acessa módulo",
    fn() {
      _mockAppState("u1", false, { recepcao: true, faturamento: true });
      assert.equal(_verificarPermissao("recepcao"), true);
      assert.equal(_verificarPermissao("faturamento"), true);
    },
  },
  {
    name: "callcenter mapeia para call_center nas permissões",
    fn() {
      _mockAppState("u1", false, { call_center: true });
      assert.equal(_verificarPermissao("callcenter"), true);
    },
  },
  {
    name: "isAdmin() retorna false para usuário comum",
    fn() {
      _mockAppState("u1", false, {});
      assert.equal(_isAdmin(), false);
    },
  },
  {
    name: "isAdmin() retorna true para admin",
    fn() {
      _mockAppState("a1", true, {});
      assert.equal(_isAdmin(), true);
    },
  },
  {
    name: "filtrarPorUsuario: admin vê todos os registros",
    fn() {
      _mockAppState("admin", true, {});
      const registros = [
        { registrado_por: "u1" },
        { registrado_por: "u2" },
        { registrado_por: "admin" },
      ];
      assert.equal(_filtrarPorUsuario(registros).length, 3);
    },
  },
  {
    name: "filtrarPorUsuario: usuário vê apenas seus registros",
    fn() {
      _mockAppState("u1", false, {});
      const registros = [
        { registrado_por: "u1" },
        { registrado_por: "u2" },
        { registrado_por: "u1" },
      ];
      const filtrado = _filtrarPorUsuario(registros);
      assert.equal(filtrado.length, 2);
      assert.ok(filtrado.every((r) => r.registrado_por === "u1"));
    },
  },
  {
    name: "modulosPermitidos: admin recebe todos os módulos incluindo admin",
    fn() {
      _mockAppState("a1", true, {});
      const modulos = _modulosPermitidos();
      assert.ok(modulos.includes("admin"));
      assert.ok(modulos.includes("cirurgico"));
    },
  },
  {
    name: "modulosPermitidos: usuário não recebe módulo admin",
    fn() {
      _mockAppState("u1", false, { recepcao: true, estoque: true });
      const modulos = _modulosPermitidos();
      assert.ok(!modulos.includes("admin"));
      assert.ok(modulos.includes("recepcao"));
      assert.ok(modulos.includes("estoque"));
    },
  },
]);
