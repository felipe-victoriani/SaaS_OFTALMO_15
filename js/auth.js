// ================================================================
// auth.js — Gerenciamento de Autenticação e Sessão
// ================================================================

// Estado global do usuário — lido por todos os módulos
window.AppState = {
  user: null, // Objeto Firebase Auth
  userData: null, // Dados do nó usuarios/$uid (nome, isAdmin, permissoes)
  isAdmin: false,
  uid: null,
  nome: "",
};

/**
 * Inicializa listener de autenticação no app.html.
 * Redireciona para login se não autenticado.
 * Carrega dados do usuário no AppState.
 */
function initAuth(onReady) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      // Sem sessão — redirecionar para login
      window.location.href = "index.html";
      return;
    }

    try {
      const snapshot = await db.ref(`usuarios/${user.uid}`).get();
      const userData = snapshot.val();

      if (!userData) {
        // Usuário sem cadastro no sistema
        await auth.signOut();
        window.location.href = "index.html";
        return;
      }

      // Preencher estado global
      window.AppState.user = user;
      window.AppState.userData = userData;
      window.AppState.isAdmin = userData.isAdmin === true;
      window.AppState.uid = user.uid;
      window.AppState.nome = userData.nome || user.email;

      // Registrar login na auditoria
      await registrarAuditoria("login", "auth", user.uid, null);

      // Callback de pronto
      if (typeof onReady === "function") onReady(window.AppState);
    } catch (err) {
      console.error("[auth] Erro ao carregar dados do usuário:", err);
      window.location.href = "index.html";
    }
  });
}

/**
 * Realiza logout: limpa estado, registra auditoria e redireciona.
 */
async function logout() {
  try {
    await registrarAuditoria("logout", "auth", window.AppState.uid, null);
  } catch (_) {
    /* ignorar erros de auditoria no logout */
  }

  // Limpar estado em memória (LGPD)
  window.AppState.user = null;
  window.AppState.userData = null;
  window.AppState.isAdmin = false;
  window.AppState.uid = null;
  window.AppState.nome = "";

  await auth.signOut();
  window.location.href = "index.html";
}

/**
 * Retorna true se o usuário está autenticado.
 */
function isAuthenticated() {
  return !!window.AppState.user;
}
