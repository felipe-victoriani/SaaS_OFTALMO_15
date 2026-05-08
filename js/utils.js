// ================================================================
// utils.js — Utilitários de formatação de campos monetários
// ================================================================

/**
 * Escapa caracteres especiais HTML para prevenir XSS.
 * Use sempre que inserir dados externos em innerHTML ou atributos.
 * @param {any} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Formata input como moeda BRL em tempo real.
 * Uso: <input type="text" inputmode="numeric" oninput="formatarMoedaInput(this)" data-valor="0">
 * // CORRIGIDO: formata automaticamente campos monetários evitando erros de entrada manual
 * @param {HTMLInputElement} input
 */
function formatarMoedaInput(input) {
  // Remove tudo que não é dígito
  let digits = input.value.replace(/\D/g, "");

  // Converte para centavos
  const valor = (parseInt(digits) || 0) / 100;

  // Formata como BRL
  input.value = valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Salva valor numérico puro no atributo data para uso no JS
  input.dataset.valor = valor;
}

/**
 * Retorna o valor numérico puro de um input formatado como moeda.
 * Funciona tanto para inputs type="text" (formatados) quanto type="number".
 * @param {HTMLInputElement|null} input
 * @returns {number}
 */
function getValorNumerico(input) {
  if (!input) return 0;
  // Se data-valor estiver disponível (input formatado com formatarMoedaInput), usa ele
  if (
    input.dataset &&
    input.dataset.valor !== undefined &&
    input.dataset.valor !== ""
  ) {
    return parseFloat(input.dataset.valor) || 0;
  }
  // Fallback: tenta parsear o valor direto (para inputs type=number ou não formatados)
  return parseFloat(input.value) || 0;
}

/**
 * Define valor inicial formatado em um input monetário.
 * @param {HTMLInputElement|null} input
 * @param {number} valor
 */
function setValorMoeda(input, valor) {
  if (!input) return;
  const v = parseFloat(valor) || 0;
  input.dataset.valor = v;
  input.value = v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
