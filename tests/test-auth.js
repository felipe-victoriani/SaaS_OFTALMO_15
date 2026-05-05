// ================================================================
// test-auth.js — Testes de lógica de autenticação (sem Firebase real)
// ================================================================
"use strict";

// Mock do AppState
window.AppState = null;

function _mockSetAppState(user, userData) {
  window.AppState = user
    ? {
        user,
        uid: user.uid,
        nome: userData.nome || "Usuário",
        isAdmin: userData.admin === true,
        userData,
      }
    : null;
}

function _mockIsAuthenticated() {
  return !!(window.AppState && window.AppState.user);
}

defineSuite("Auth — Lógica de Estado", [
  {
    name: "AppState é null antes do login",
    fn() {
      window.AppState = null;
      assert.equal(_mockIsAuthenticated(), false);
    },
  },
  {
    name: "AppState é preenchido após login com usuário comum",
    fn() {
      _mockSetAppState({ uid: "uid123" }, { nome: "João", admin: false });
      assert.ok(_mockIsAuthenticated());
      assert.equal(AppState.isAdmin, false);
      assert.equal(AppState.nome, "João");
      assert.equal(AppState.uid, "uid123");
    },
  },
  {
    name: "AppState.isAdmin é true para admin",
    fn() {
      _mockSetAppState({ uid: "adminUid" }, { nome: "Admin", admin: true });
      assert.equal(AppState.isAdmin, true);
    },
  },
  {
    name: "AppState é limpo no logout",
    fn() {
      _mockSetAppState({ uid: "uid123" }, { nome: "João", admin: false });
      window.AppState = null;
      assert.equal(_mockIsAuthenticated(), false);
    },
  },
  {
    name: "userData.admin=false não concede isAdmin",
    fn() {
      _mockSetAppState({ uid: "x" }, { admin: false });
      assert.equal(AppState.isAdmin, false);
    },
  },
  {
    name: "userData sem admin não concede isAdmin",
    fn() {
      _mockSetAppState({ uid: "x" }, {});
      assert.equal(AppState.isAdmin, false);
    },
  },
  {
    name: "AppState.uid corresponde ao uid do user",
    fn() {
      _mockSetAppState({ uid: "test-uid-456" }, {});
      assert.equal(AppState.uid, "test-uid-456");
    },
  },
]);
