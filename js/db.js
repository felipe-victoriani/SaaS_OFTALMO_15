// ================================================================
// db.js — Abstração Firebase CRUD + Paginação + Auditoria
// ================================================================

// ── Helpers de datas e IDs ──────────────────────────────────────

/** Retorna a data de hoje no formato YYYY-MM-DD */
function hoje() {
  return new Date().toISOString().split("T")[0];
}

/** Retorna timestamp atual */
function agora() {
  return Date.now();
}

/** Gera um ID push único compatível com Firebase */
function gerarId() {
  return db.ref().push().key;
}

// ── Caminhos dos nós Firebase ───────────────────────────────────

/** Caminho de dados diários: dados/{data}/{colecao} */
function caminhoData(colecao, data) {
  return `dados/${data || hoje()}/${colecao}`;
}

const CAMINHOS = {
  usuarios: () => "usuarios",
  usuario: (uid) => `usuarios/${uid}`,
  dadosDia: (col, data) => caminhoData(col, data),
  metas: () => "metas",
  metaMedico: (data, medicoId) => `metas/${data}/${medicoId}`,
  patrimonio: () => "patrimonio",
  patrimonioItem: (id) => `patrimonio/${id}`,
  estoque: () => "estoque",
  estoqueItem: (id) => `estoque/${id}`,
  movimentacoes: () => "movimentacoes_estoque",
  movimentacao: (id) => `movimentacoes_estoque/${id}`,
  fornecedores: () => "fornecedores",
  fornecedor: (id) => `fornecedores/${id}`,
  auditoria: () => "auditoria",
};

// ── CRUD Genérico ───────────────────────────────────────────────

/**
 * Lê um nó do Firebase uma vez.
 * @param {string} caminho
 * @returns {Promise<any>} valor do nó
 */
async function lerUmaVez(caminho) {
  const snap = await db.ref(caminho).get();
  return snap.val();
}

/**
 * Escuta um nó em tempo real.
 * @param {string} caminho
 * @param {Function} callback - chamado com o valor atualizado
 * @returns {Function} função para cancelar a escuta
 */
function escutar(caminho, callback) {
  const ref = db.ref(caminho);
  ref.on("value", (snap) => callback(snap.val()));
  return () => ref.off("value");
}

/**
 * Salva (cria ou atualiza) um registro em um caminho específico.
 * @param {string} caminho
 * @param {Object} dados
 */
async function salvar(caminho, dados) {
  await db.ref(caminho).set(dados);
}

/**
 * Atualiza campos específicos de um nó (merge parcial).
 * @param {string} caminho
 * @param {Object} campos
 */
async function atualizar(caminho, campos) {
  await db.ref(caminho).update(campos);
}

/**
 * Remove um nó do Firebase.
 * @param {string} caminho
 */
async function remover(caminho) {
  await db.ref(caminho).remove();
}

/**
 * Cria um novo registro com ID gerado pelo Firebase.
 * Adiciona automaticamente registrado_por e criado_em.
 * @param {string} caminhoPai - caminho do nó pai
 * @param {Object} dados
 * @returns {Promise<string>} ID gerado
 */
async function criar(caminhoPai, dados) {
  const id = gerarId();
  const registro = {
    ...dados,
    registrado_por: window.AppState.uid,
    criado_em: agora(),
  };
  await db.ref(`${caminhoPai}/${id}`).set(registro);
  return id;
}

// ── Paginação ───────────────────────────────────────────────────

const TAMANHO_PAGINA = 50;

/**
 * Busca dados paginados de um nó Firebase.
 * @param {string} caminho - caminho do nó
 * @param {number} tamanhoPagina - registros por página (padrão 50)
 * @param {string|null} ultimaChave - última chave da página anterior (cursor)
 * @returns {Promise<{dados: Object, ultimaChave: string|null, temMais: boolean}>}
 */
async function paginarDados(
  caminho,
  tamanhoPagina = TAMANHO_PAGINA,
  ultimaChave = null,
) {
  let query = db
    .ref(caminho)
    .orderByKey()
    .limitToFirst(tamanhoPagina + 1);

  if (ultimaChave) {
    query = db
      .ref(caminho)
      .orderByKey()
      .startAfter(ultimaChave)
      .limitToFirst(tamanhoPagina + 1);
  }

  const snap = await query.get();
  const raw = snap.val() || {};
  const entradas = Object.entries(raw);

  const temMais = entradas.length > tamanhoPagina;
  if (temMais) entradas.pop(); // remover item extra de sondagem

  const dados = Object.fromEntries(entradas);
  const novaUltimaChave =
    entradas.length > 0 ? entradas[entradas.length - 1][0] : null;

  return { dados, ultimaChave: novaUltimaChave, temMais };
}

// ── Auditoria (LGPD) ────────────────────────────────────────────

/**
 * Registra uma ação crítica no log de auditoria do Firebase.
 * Chamada em toda operação de escrita.
 * @param {string} acao - ex: 'criar', 'editar', 'excluir', 'login', 'logout'
 * @param {string} modulo - ex: 'recepcao', 'usuarios'
 * @param {string} registroId - ID do registro afetado
 * @param {any} dadosAnteriores - estado anterior (para edições/exclusões)
 */
async function registrarAuditoria(acao, modulo, registroId, dadosAnteriores) {
  try {
    const id = gerarId();
    const log = {
      usuario_uid: window.AppState?.uid || "desconhecido",
      usuario_nome: window.AppState?.nome || "desconhecido",
      acao,
      modulo,
      registro_id: registroId || "",
      dados_anteriores: dadosAnteriores
        ? JSON.stringify(dadosAnteriores).substring(0, 500)
        : "",
      criado_em: agora(),
    };
    await db.ref(`auditoria/${id}`).set(log);
  } catch (err) {
    // Auditoria não deve quebrar o fluxo principal
    console.warn("[auditoria] Falha ao registrar:", err);
  }
}

// ── Helpers de formatação ────────────────────────────────────────

/**
 * Formata um valor numérico como moeda BRL.
 * @param {number} valor
 * @returns {string} ex: "R$ 1.234,56"
 */
function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

/**
 * Formata uma data timestamp (ms) como DD/MM/YYYY.
 * @param {number|string} ts
 * @returns {string}
 */
function formatarData(ts) {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

/**
 * Converte string de data YYYY-MM-DD para Date local.
 * @param {string} str
 * @returns {Date}
 */
function parseDateLocal(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calcula dias entre hoje e uma data futura/passada.
 * Negativo = passado, positivo = futuro.
 * @param {string} dataStr YYYY-MM-DD
 * @returns {number}
 */
function diasAteVencer(dataStr) {
  if (!dataStr) return Infinity;
  const alvo = parseDateLocal(dataStr);
  const agr = new Date();
  agr.setHours(0, 0, 0, 0);
  const diff = alvo - agr;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Busca todos os dados de um intervalo de datas para o módulo especificado.
 * @param {string} colecao - ex: 'pacientes', 'cirurgias', 'honorarios'
 * @param {string} dataInicio YYYY-MM-DD
 * @param {string} dataFim YYYY-MM-DD
 * @returns {Promise<Array>} lista de registros com id e data
 */
async function buscarIntervalo(colecao, dataInicio, dataFim) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const registros = [];

  // Iterar datas no intervalo
  let cur = new Date(inicio);
  const promises = [];
  while (cur <= fim) {
    const dataStr = cur.toISOString().split("T")[0];
    promises.push(
      lerUmaVez(caminhoData(colecao, dataStr)).then((dados) => {
        if (dados) {
          Object.entries(dados).forEach(([id, r]) =>
            registros.push({ ...r, _id: id, _data: dataStr }),
          );
        }
      }),
    );
    cur.setDate(cur.getDate() + 1);
  }
  await Promise.all(promises);
  return registros;
}

/**
 * Retorna o primeiro e último dia do mês informado.
 * @param {number} ano
 * @param {number} mes 1-based
 * @returns {{inicio: string, fim: string}}
 */
function intervaloMes(ano, mes) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

// ── Excluir conta de usuário (LGPD — Art. 18) ──────────────────

/**
 * Remove todos os dados de um usuário do Firebase (direito ao esquecimento).
 * ATENÇÃO: operação irreversível. Apenas admin pode chamar.
 * @param {string} uid
 */
async function excluirContaUsuario(uid) {
  if (!isAdmin())
    throw new Error("Apenas administradores podem excluir contas.");
  // Remover nó do usuário
  await remover(CAMINHOS.usuario(uid));
  await registrarAuditoria("excluir_conta", "usuarios", uid, null);
}
