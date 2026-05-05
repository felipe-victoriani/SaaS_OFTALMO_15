"use strict";

/* ── Elementos ──────────────────────────────────────────────── */
const form = document.getElementById("form-login");
const errorEl = document.getElementById("error-msg");
const btnLbl = document.getElementById("btn-label");
const btn = document.getElementById("btn-login");

/* ── Helpers de UI ──────────────────────────────────────────── */
function mostrarErro(msg) {
  errorEl.textContent = msg;
  errorEl.removeAttribute("hidden");
}
function ocultarErro() {
  errorEl.setAttribute("hidden", "");
}
function setCarregando(val) {
  btn.disabled = val;
  btnLbl.innerHTML = val
    ? '<span class="spinner-inline" aria-hidden="true"></span> Entrando…'
    : "Entrar";
}

/* ── Mapeamento de erros Firebase → pt-BR ───────────────────── */
function mensagemErro(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Conta desabilitada.",
    "auth/user-not-found": "Credenciais inválidas.",
    "auth/wrong-password": "Credenciais inválidas.",
    "auth/invalid-credential": "Credenciais inválidas.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/network-request-failed": "Erro de conexão. Verifique a internet.",
  };
  return map[code] || "Erro ao entrar. Tente novamente.";
}

/* ── Primeira rota com permissão ────────────────────────────── */
function primeiraRota(perm) {
  const ordem = [
    "recepcao",
    "call_center",
    "cirurgico",
    "honorarios",
    "faturamento",
    "patrimonio",
    "estoque",
    "fornecedores",
  ];
  for (const m of ordem) {
    if (perm[m]) return m === "call_center" ? "callcenter" : m;
  }
  return "recepcao";
}

/* ── Submit ─────────────────────────────────────────────────── */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarErro();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    mostrarErro("Preencha e-mail e senha.");
    return;
  }

  setCarregando(true);
  try {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, senha);
    const snap = await firebase
      .database()
      .ref(`usuarios/${cred.user.uid}`)
      .get();
    const userData = snap.val() || {};
    const rota =
      userData.isAdmin === true
        ? "admin"
        : primeiraRota(userData.permissoes || {});
    window.location.href = `app.html#${rota}`;
  } catch (err) {
    setCarregando(false);
    mostrarErro(mensagemErro(err.code));
  }
});

/* ── Já autenticado: redirecionar ───────────────────────────── */
firebase.auth().onAuthStateChanged((user) => {
  if (!user) return;
  firebase
    .database()
    .ref(`usuarios/${user.uid}`)
    .get()
    .then((snap) => {
      const ud = snap.val() || {};
      const rota =
        ud.isAdmin === true ? "admin" : primeiraRota(ud.permissoes || {});
      window.location.href = `app.html#${rota}`;
    });
});
