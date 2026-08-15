"use strict";

const CAMINHO_DESTINO = "pacientes_cadastro";
const TAMANHO_LOTE = 500;

const formLogin = document.getElementById("login-form");
const inputEmail = document.getElementById("login-email");
const inputSenha = document.getElementById("login-senha");
const btnLogin = document.getElementById("btn-login");
const loginErroEl = document.getElementById("login-erro");
const areaImportacao = document.getElementById("area-importacao");
const usuarioLogadoEl = document.getElementById("usuario-logado");

const inputArquivo = document.getElementById("arquivo");
const btnImportar = document.getElementById("btn-importar");
const logEl = document.getElementById("log");

let registrosParaImportar = null;

function log(msg) {
  logEl.textContent += msg + "\n";
}

/** Faz o parse de "ID;Nome" (cabeçalho na primeira linha) para um objeto {id: {nome, cpf}}. */
function parseCsv(texto) {
  const linhas = texto.split(/\r?\n/);
  const registros = {};
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    const sep = linha.indexOf(";");
    if (sep === -1) continue;
    const id = linha.slice(0, sep).trim();
    const nome = linha.slice(sep + 1).trim();
    if (!id || !nome) continue;
    registros[id] = { nome, cpf: "" };
  }
  return registros;
}

// ── Login próprio da ferramenta (não depende de sessão de outra aba) ──
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    formLogin.hidden = true;
    loginErroEl.hidden = true;
    areaImportacao.hidden = false;
    usuarioLogadoEl.textContent = `Logado como ${user.email}`;
  } else {
    formLogin.hidden = false;
    areaImportacao.hidden = true;
  }
});

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginErroEl.hidden = true;
  btnLogin.disabled = true;
  try {
    await firebase
      .auth()
      .signInWithEmailAndPassword(inputEmail.value.trim(), inputSenha.value);
    inputSenha.value = "";
  } catch (err) {
    loginErroEl.textContent = "Login inválido: " + (err.message || err.code);
    loginErroEl.hidden = false;
  } finally {
    btnLogin.disabled = false;
  }
});

inputArquivo.addEventListener("change", async () => {
  const file = inputArquivo.files[0];
  logEl.textContent = "";
  btnImportar.disabled = true;
  if (!file) return;
  const texto = await file.text();
  registrosParaImportar = parseCsv(texto);
  const total = Object.keys(registrosParaImportar).length;
  log(`Arquivo lido: ${total} pacientes encontrados.`);
  btnImportar.disabled = total === 0;
});

btnImportar.addEventListener("click", async () => {
  if (!registrosParaImportar) return;
  if (!firebase.auth().currentUser) {
    log("Sessão expirou — faça login de novo.");
    return;
  }

  btnImportar.disabled = true;
  const entradas = Object.entries(registrosParaImportar);
  const total = entradas.length;
  let feitos = 0;

  for (let i = 0; i < entradas.length; i += TAMANHO_LOTE) {
    const lote = entradas.slice(i, i + TAMANHO_LOTE);
    const atualizacao = {};
    lote.forEach(([id, dados]) => {
      atualizacao[`${CAMINHO_DESTINO}/${id}`] = dados;
    });
    try {
      await db.ref().update(atualizacao);
      feitos += lote.length;
      log(`Importados ${feitos} / ${total}...`);
    } catch (err) {
      log(`Erro no lote (registros ${i} a ${i + lote.length}): ${err.message}`);
      log(
        "Importação interrompida. Registros já gravados não serão duplicados — corrija o problema (ex: permissão) e clique em Importar de novo.",
      );
      btnImportar.disabled = false;
      return;
    }
  }

  log(`Concluído! ${feitos} pacientes importados/atualizados.`);
  btnImportar.disabled = false;
});
