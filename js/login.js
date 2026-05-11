"use strict";

/* ── Elementos ──────────────────────────────────────────────── */
const form = document.getElementById("form-login");
const errorEl = document.getElementById("error-msg");
const btnLbl = document.getElementById("btn-label");
const btn = document.getElementById("btn-login");

/* ── Helpers de UI ──────────────────────────────────────────── */
function mostrarErro(msg) {
  errorEl.className = "error-banner";
  errorEl.textContent = msg;
  errorEl.removeAttribute("hidden");
}
function ocultarErro() {
  errorEl.setAttribute("hidden", "");
  errorEl.className = "error-banner";
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
    "auth/network-request-failed":
      "Erro de conexão. Verifique sua internet e tente novamente.",
    "auth/timeout": "Tempo de conexão esgotado. Tente novamente.",
    "auth/unavailable":
      "Serviço temporariamente indisponível. Tente novamente em instantes.",
  };
  return map[code] || "Erro ao entrar. Tente novamente.";
}

function firebaseDisponivel() {
  return (
    typeof firebase !== "undefined" &&
    typeof firebase.auth === "function" &&
    typeof firebase.database === "function"
  );
}

function criarErroTimeout() {
  const err = new Error("Tempo limite de conexão atingido.");
  err.code = "auth/timeout";
  return err;
}

function comTimeout(promise, timeoutMs = 10000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(criarErroTimeout()), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId),
  );
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
  const lembrar = document.getElementById("lembrar-me").checked;

  if (!email || !senha) {
    mostrarErro("Preencha e-mail e senha.");
    return;
  }

  if (!firebaseDisponivel()) {
    mostrarErro(
      "Erro ao carregar componentes. Verifique sua conexão e recarregue a página.",
    );
    return;
  }

  console.log("[LOGIN] Iniciando autenticação...", { email, lembrar });
  setCarregando(true);
  try {
    await comTimeout(firebase.database().ref(".info/connected").once("value"));

    const persistence = lembrar
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;
    await comTimeout(firebase.auth().setPersistence(persistence));
    console.log("[LOGIN] Persistence configurada");

    const cred = await comTimeout(
      firebase.auth().signInWithEmailAndPassword(email, senha),
    );
    console.log("[LOGIN] Usuário autenticado:", cred.user.uid);

    console.log("[LOGIN] Buscando dados do usuário no banco...");
    const snap = await comTimeout(
      firebase
      .database()
      .ref(`usuarios/${cred.user.uid}`)
      .get(),
    );
    const userData = snap.val() || {};
    console.log("[LOGIN] Dados do usuário carregados:", userData);

    const rota =
      userData.isAdmin === true
        ? "admin"
        : primeiraRota(userData.permissoes || {});
    console.log("[LOGIN] Redirecionando para rota:", rota);
    window.location.href = `app.html#${rota}`;
  } catch (err) {
    setCarregando(false);
    console.error("[LOGIN] Erro detalhado:", {
      code: err?.code,
      message: err?.message,
      stack: err?.stack,
      error: err,
    });
    mostrarErro(mensagemErro(err?.code));
  }
});

/* ── Já autenticado: redirecionar ───────────────────────────── */
if (firebaseDisponivel()) {
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) return;
    console.log("[LOGIN] Usuário já autenticado:", user.uid);
    firebase
      .database()
      .ref(`usuarios/${user.uid}`)
      .get()
      .then((snap) => {
        const ud = snap.val() || {};
        const rota =
          ud.isAdmin === true ? "admin" : primeiraRota(ud.permissoes || {});
        console.log("[LOGIN] Redirecionando usuário autenticado para:", rota);
        window.location.href = `app.html#${rota}`;
      })
      .catch((err) => {
        console.error("[LOGIN] Erro ao carregar usuário autenticado:", err);
      });
  });
} else {
  console.warn("[LOGIN] Firebase não carregado no listener de autenticação.");
}
/* ── Toggle mostrar/ocultar senha ────────────────────────────── */
const senhaInput = document.getElementById("senha");
const toggleBtn = document.getElementById("toggle-senha");
const iconEye = document.getElementById("icon-eye");
const iconEyeOff = document.getElementById("icon-eye-off");

toggleBtn.addEventListener("click", () => {
  const visible = senhaInput.type === "text";
  senhaInput.type = visible ? "password" : "text";
  iconEye.hidden = !visible;
  iconEyeOff.hidden = visible;
  toggleBtn.setAttribute(
    "aria-label",
    visible ? "Mostrar senha" : "Ocultar senha",
  );
  senhaInput.focus();
});

/* ── Aviso de Caps Lock ─────────────────────────────────────── */
const capsWarn = document.getElementById("caps-warn");
senhaInput.addEventListener("keyup", (e) => {
  capsWarn.hidden = !e.getModifierState("CapsLock");
});
senhaInput.addEventListener("blur", () => {
  capsWarn.hidden = true;
});

/* ── Esqueci a senha ─────────────────────────────────────────── */
document.getElementById("link-esqueci").addEventListener("click", async (e) => {
  e.preventDefault();
  if (!firebaseDisponivel()) {
    mostrarErro(
      "Erro ao carregar componentes. Verifique sua conexão e recarregue a página.",
    );
    return;
  }
  const email = document.getElementById("email").value.trim();
  if (!email) {
    mostrarErro("Digite seu e-mail acima para receber o link de redefinição.");
    return;
  }
  try {
    await comTimeout(firebase.auth().sendPasswordResetEmail(email));
    errorEl.className = "error-banner success-banner";
    errorEl.textContent = `Link enviado para ${email}. Verifique sua caixa de entrada.`;
    errorEl.removeAttribute("hidden");
  } catch (err) {
    console.error("[LOGIN] Erro ao enviar redefinição de senha:", {
      code: err?.code,
      message: err?.message,
      stack: err?.stack,
      error: err,
    });
    mostrarErro(mensagemErro(err.code));
  }
});
