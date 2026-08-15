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
  pacientesCadastro: () => "pacientes_cadastro",
  pacienteCadastro: (id) => `pacientes_cadastro/${id}`,
  campanhas: () => "campanhas",
  campanha: (id) => `campanhas/${id}`,
  campanhaContatos: (campanhaId) => `campanhas/${campanhaId}/contatos`,
  campanhaContato: (campanhaId, id) => `campanhas/${campanhaId}/contatos/${id}`,
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
 * @param {Function} [onError] - chamado se a leitura falhar (ex: permissão negada);
 *   sem isso, uma falha fica silenciosa e a tela trava no estado de "carregando"
 * @returns {Function} função para cancelar a escuta
 */
function escutar(caminho, callback, onError) {
  const ref = db.ref(caminho);
  ref.on(
    "value",
    (snap) => callback(snap.val()),
    (err) => {
      console.error(`[escutar] Erro em "${caminho}":`, err);
      if (onError) onError(err);
    },
  );
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

// ── Metas por médico/mês ─────────────────────────────────────────

/**
 * Retorna a meta "efetiva" de um médico para um mês (YYYY-MM): a mais
 * recente cadastrada até esse mês (carry-forward). Registros antigos
 * sem `anoMes` são tratados como base legada, sempre elegível.
 * Editar/criar a meta de um mês nunca altera o resultado de meses
 * anteriores, pois cada mês tem seu próprio registro.
 * @param {Array<{nome:string, valor:number, anoMes?:string}>} metas
 * @param {string} nome
 * @param {string} anoMesAlvo - "YYYY-MM"
 * @returns {{nome:string, valor:number, anoMes?:string, _id?:string}|null}
 */
function metaEfetiva(metas, nome, anoMesAlvo) {
  const candidatos = (metas || [])
    .filter((m) => m.nome === nome && (!m.anoMes || m.anoMes <= anoMesAlvo))
    .sort((a, b) => (a.anoMes || "0000-00").localeCompare(b.anoMes || "0000-00"));
  return candidatos.length ? candidatos[candidatos.length - 1] : null;
}

/**
 * Calcula o faturamento "realizado" por médico, atribuindo cada valor a
 * quem efetivamente o gerou (cirurgião, auxiliar, instrumentador e
 * recepção) — não tudo ao cirurgião da cirurgia. Usado como fonte única
 * de verdade para comparar com metas (Admin › Metas, Relatório e
 * Faturamento devem usar esta mesma função).
 * @param {Array} honorariosLancados - registros de honorarios com lancado=true
 * @param {Array} [recepcaoArr] - registros de recepção (coleção "pacientes") do período
 * @returns {Object<string, number>} total por nome de médico
 */
function realizadoPorMedico(honorariosLancados, recepcaoArr = []) {
  const totais = {};
  const soma = (nome, valor) => {
    if (!nome || nome === "—") return;
    totais[nome] = (totais[nome] || 0) + (valor || 0);
  };
  (honorariosLancados || []).forEach((r) => {
    soma(
      r.nome_cirurgiao,
      (r.honorario_cirurgiao_pf || 0) + (r.lio_parte_cirurgiao || 0),
    );
    soma(r.nome_auxiliar, r.honorario_auxiliar_pf || 0);
    soma(r.nome_instrumentador, r.honorario_instrumentador_pf || 0);
  });
  (recepcaoArr || []).forEach((r) => {
    soma(r.medico, parseFloat(r.valor) || 0);
  });
  return totais;
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
