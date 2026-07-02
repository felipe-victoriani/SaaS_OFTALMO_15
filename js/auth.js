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
  let _cancelarEscutaUsuario = null;
  let _primeiroCarregamento = true;

  auth.onAuthStateChanged((user) => {
    // Cancelar escuta anterior se trocar de conta
    if (_cancelarEscutaUsuario) {
      _cancelarEscutaUsuario();
      _cancelarEscutaUsuario = null;
    }

    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const refUsuario = db.ref(`usuarios/${user.uid}`);

    _cancelarEscutaUsuario = () => refUsuario.off("value");

    refUsuario.on("value", async (snapshot) => {
      const userData = snapshot.val();

      if (!userData) {
        await auth.signOut();
        window.location.href = "index.html";
        return;
      }

      // Atualizar estado global
      window.AppState.user = user;
      window.AppState.userData = userData;
      window.AppState.isAdmin = userData.isAdmin === true;
      window.AppState.uid = user.uid;
      window.AppState.nome = userData.nome || user.email;

      if (_primeiroCarregamento) {
        _primeiroCarregamento = false;
        try {
          await registrarAuditoria("login", "auth", user.uid, null);
        } catch (_) { /* ignorar erro de auditoria */ }
        if (typeof onReady === "function") onReady(window.AppState);
      } else {
        // Permissões atualizadas em tempo real — re-renderizar navbar
        const sidebarNav = document.getElementById("sidebar-nav");
        const sidebarUser = document.getElementById("sidebar-user");
        if (sidebarNav && sidebarUser) {
          renderNavbar(sidebarNav, sidebarUser);
        }
      }
    }, (err) => {
      console.error("[auth] Erro ao escutar dados do usuário:", err);
      window.location.href = "index.html";
    });
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
