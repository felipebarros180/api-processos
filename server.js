import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";

const app = express();
app.use(cors());
app.use(express.json());

// =============================================================
// CONFIGURAÇÃO POR VARIÁVEIS DE AMBIENTE (.env)
// IMPORTANTE: Nunca commitar tokens no código. Use .env no servidor.
// =============================================================
const PORT = process.env.PORT || 3000;
const ESCAVADOR_API_KEY = process.env.ESCAVADOR_API_KEY;
const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY;
const JUSBRASIL_API_TOKEN = process.env.JUSBRASIL_API_TOKEN;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || "600000", 10);       // 10 min
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10); // 1 min
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "60", 10);       // 60 req/min

// =============================================================
// SEGURANÇA: rate limit global
// =============================================================
app.use(rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "RATE_LIMIT_EXCEDIDO", mensagem: "Muitas requisições. Tente novamente em instantes." }
}));

// =============================================================
// SEGURANÇA: middleware de autenticação interna por API key
// =============================================================
function autenticar(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!INTERNAL_API_KEY) {
    return res.status(500).json({
      erro: "INTERNAL_API_KEY_NAO_CONFIGURADA",
      mensagem: "A variável de ambiente INTERNAL_API_KEY não foi configurada no servidor."
    });
  }
  if (key !== INTERNAL_API_KEY) {
    return res.status(401).json({
      erro: "NAO_AUTORIZADO",
      mensagem: "Chave de API ausente ou inválida. Envie o header x-api-key."
    });
  }
  next();
}

// =============================================================
// CACHE EM MEMÓRIA (chave = número CNJ)
// Evita custo repetido de consulta ao CNJ/Escavador/JusBrasil
// Tem limite de tamanho para não crescer infinitamente em produção.
// =============================================================
const CACHE_MAX_ENTRADAS = parseInt(process.env.CACHE_MAX_ENTRADAS || "1000", 10);
const cache = new Map();

function cacheGet(numero) {
  const item = cache.get(numero);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL_MS) {
    cache.delete(numero);
    return null;
  }
  // LRU: re-insere para mover para o final (Map preserva ordem de inserção)
  cache.delete(numero);
  cache.set(numero, item);
  return item.data;
}

function cacheSet(numero, data) {
  // Se atingiu o limite, remove a entrada mais antiga (primeira do Map)
  if (cache.size >= CACHE_MAX_ENTRADAS) {
    const primeiraChave = cache.keys().next().value;
    if (primeiraChave !== undefined) cache.delete(primeiraChave);
  }
  cache.set(numero, { time: Date.now(), data });
}

// =============================================================
// LOG SIMPLES DE AUDITORIA (console — pronto para integrar com
// um logger real como pino/winston quando precisar)
// =============================================================
function logConsulta({ numero, ip, fontes, ok, erro }) {
  const entry = {
    ts: new Date().toISOString(),
    numero,
    ip,
    fontes,
    ok,
    erro: erro || null
  };
  console.log("[CONSULTA]", JSON.stringify(entry));
}

// =============================================================
// FETCH COM TIMEOUT + ERRO PADRONIZADO
// Evita que uma API externa lenta trave o endpoint.
// Sempre retorna { ok, status, json, erro } com códigos uniformes
// para o GPT entender qualquer falha de forma consistente.
// =============================================================
const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || "8000", 10);

async function fetchComTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const tId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        erro: "FALHA_CONSULTA_EXTERNA",
        detalhe: `HTTP ${res.status}`
      };
    }
    const json = await res.json();
    return { ok: true, status: res.status, json };
  } catch (e) {
    if (e.name === "AbortError") {
      return { ok: false, erro: "TIMEOUT_CONSULTA_EXTERNA", detalhe: `Timeout após ${timeoutMs}ms` };
    }
    return { ok: false, erro: "FALHA_CONSULTA_EXTERNA", detalhe: e.message };
  } finally {
    clearTimeout(tId);
  }
}

// =============================================================
// DICIONÁRIO INTEGRAL DE TRIBUNAIS (Datajud CNJ)
// =============================================================
const TRIBUNAIS = {
  // JUSTIÇA ESTADUAL
  "8.01": { sigla: "TJAC", nome: "Tribunal de Justiça do Acre", endpoint: "api_publica_tjac" },
  "8.02": { sigla: "TJAL", nome: "Tribunal de Justiça de Alagoas", endpoint: "api_publica_tjal" },
  "8.03": { sigla: "TJAP", nome: "Tribunal de Justiça do Amapá", endpoint: "api_publica_tjap" },
  "8.04": { sigla: "TJAM", nome: "Tribunal de Justiça do Amazonas", endpoint: "api_publica_tjam" },
  "8.05": { sigla: "TJBA", nome: "Tribunal de Justiça da Bahia", endpoint: "api_publica_tjba" },
  "8.06": { sigla: "TJCE", nome: "Tribunal de Justiça do Ceará", endpoint: "api_publica_tjce" },
  "8.07": { sigla: "TJDFT", nome: "Tribunal de Justiça do Distrito Federal e Territórios", endpoint: "api_publica_tjdft" },
  "8.08": { sigla: "TJES", nome: "Tribunal de Justiça do Espírito Santo", endpoint: "api_publica_tjes" },
  "8.09": { sigla: "TJGO", nome: "Tribunal de Justiça de Goiás", endpoint: "api_publica_tjgo" },
  "8.10": { sigla: "TJMA", nome: "Tribunal de Justiça do Maranhão", endpoint: "api_publica_tjma" },
  "8.11": { sigla: "TJMT", nome: "Tribunal de Justiça de Mato Grosso", endpoint: "api_publica_tjmt" },
  "8.12": { sigla: "TJMS", nome: "Tribunal de Justiça de Mato Grosso do Sul", endpoint: "api_publica_tjms" },
  "8.13": { sigla: "TJMG", nome: "Tribunal de Justiça de Minas Gerais", endpoint: "api_publica_tjmg" },
  "8.14": { sigla: "TJPA", nome: "Tribunal de Justiça do Pará", endpoint: "api_publica_tjpa" },
  "8.15": { sigla: "TJPB", nome: "Tribunal de Justiça da Paraíba", endpoint: "api_publica_tjpb" },
  "8.16": { sigla: "TJPR", nome: "Tribunal de Justiça do Paraná", endpoint: "api_publica_tjpr" },
  "8.17": { sigla: "TJPE", nome: "Tribunal de Justiça de Pernambuco", endpoint: "api_publica_tjpe" },
  "8.18": { sigla: "TJPI", nome: "Tribunal de Justiça do Piauí", endpoint: "api_publica_tjpi" },
  "8.19": { sigla: "TJRJ", nome: "Tribunal de Justiça do Rio de Janeiro", endpoint: "api_publica_tjrj" },
  "8.20": { sigla: "TJRN", nome: "Tribunal de Justiça do Rio Grande do Norte", endpoint: "api_publica_tjrn" },
  "8.21": { sigla: "TJRS", nome: "Tribunal de Justiça do Rio Grande do Sul", endpoint: "api_publica_tjrs" },
  "8.22": { sigla: "TJRO", nome: "Tribunal de Justiça de Rondônia", endpoint: "api_publica_tjro" },
  "8.23": { sigla: "TJRR", nome: "Tribunal de Justiça de Roraima", endpoint: "api_publica_tjrr" },
  "8.24": { sigla: "TJSC", nome: "Tribunal de Justiça de Santa Catarina", endpoint: "api_publica_tjsc" },
  "8.25": { sigla: "TJSE", nome: "Tribunal de Justiça de Sergipe", endpoint: "api_publica_tjse" },
  "8.26": { sigla: "TJSP", nome: "Tribunal de Justiça de São Paulo", endpoint: "api_publica_tjsp" },
  "8.27": { sigla: "TJTO", nome: "Tribunal de Justiça do Tocantins", endpoint: "api_publica_tjto" },
  // JUSTIÇA FEDERAL
  "4.01": { sigla: "TRF1", nome: "Tribunal Regional Federal da 1ª Região", endpoint: "api_publica_trf1" },
  "4.02": { sigla: "TRF2", nome: "Tribunal Regional Federal da 2ª Região", endpoint: "api_publica_trf2" },
  "4.03": { sigla: "TRF3", nome: "Tribunal Regional Federal da 3ª Região", endpoint: "api_publica_trf3" },
  "4.04": { sigla: "TRF4", nome: "Tribunal Regional Federal da 4ª Região", endpoint: "api_publica_trf4" },
  "4.05": { sigla: "TRF5", nome: "Tribunal Regional Federal da 5ª Região", endpoint: "api_publica_trf5" },
  "4.06": { sigla: "TRF6", nome: "Tribunal Regional Federal da 6ª Região", endpoint: "api_publica_trf6" },
  // JUSTIÇA DO TRABALHO
  "5.01": { sigla: "TRT1", nome: "TRT da 1ª Região", endpoint: "api_publica_trt1" },
  "5.02": { sigla: "TRT2", nome: "TRT da 2ª Região", endpoint: "api_publica_trt2" },
  "5.03": { sigla: "TRT3", nome: "TRT da 3ª Região", endpoint: "api_publica_trt3" },
  "5.04": { sigla: "TRT4", nome: "TRT da 4ª Região", endpoint: "api_publica_trt4" },
  "5.05": { sigla: "TRT5", nome: "TRT da 5ª Região", endpoint: "api_publica_trt5" },
  "5.06": { sigla: "TRT6", nome: "TRT da 6ª Região", endpoint: "api_publica_trt6" },
  "5.07": { sigla: "TRT7", nome: "TRT da 7ª Região", endpoint: "api_publica_trt7" },
  "5.08": { sigla: "TRT8", nome: "TRT da 8ª Região", endpoint: "api_publica_trt8" },
  "5.09": { sigla: "TRT9", nome: "TRT da 9ª Região", endpoint: "api_publica_trt9" },
  "5.10": { sigla: "TRT10", nome: "TRT da 10ª Região", endpoint: "api_publica_trt10" },
  "5.11": { sigla: "TRT11", nome: "TRT da 11ª Região", endpoint: "api_publica_trt11" },
  "5.12": { sigla: "TRT12", nome: "TRT da 12ª Região", endpoint: "api_publica_trt12" },
  "5.13": { sigla: "TRT13", nome: "TRT da 13ª Região", endpoint: "api_publica_trt13" },
  "5.14": { sigla: "TRT14", nome: "TRT da 14ª Região", endpoint: "api_publica_trt14" },
  "5.15": { sigla: "TRT15", nome: "TRT da 15ª Região", endpoint: "api_publica_trt15" },
  "5.16": { sigla: "TRT16", nome: "TRT da 16ª Região", endpoint: "api_publica_trt16" },
  "5.17": { sigla: "TRT17", nome: "TRT da 17ª Região", endpoint: "api_publica_trt17" },
  "5.18": { sigla: "TRT18", nome: "TRT da 18ª Região", endpoint: "api_publica_trt18" },
  "5.19": { sigla: "TRT19", nome: "TRT da 19ª Região", endpoint: "api_publica_trt19" },
  "5.20": { sigla: "TRT20", nome: "TRT da 20ª Região", endpoint: "api_publica_trt20" },
  "5.21": { sigla: "TRT21", nome: "TRT da 21ª Região", endpoint: "api_publica_trt21" },
  "5.22": { sigla: "TRT22", nome: "TRT da 22ª Região", endpoint: "api_publica_trt22" },
  "5.23": { sigla: "TRT23", nome: "TRT da 23ª Região", endpoint: "api_publica_trt23" },
  "5.24": { sigla: "TRT24", nome: "TRT da 24ª Região", endpoint: "api_publica_trt24" },
  // JUSTIÇA ELEITORAL
  "6.01": { sigla: "TRE-AC", nome: "TRE do Acre", endpoint: "api_publica_tre-ac" },
  "6.02": { sigla: "TRE-AL", nome: "TRE de Alagoas", endpoint: "api_publica_tre-al" },
  "6.03": { sigla: "TRE-AP", nome: "TRE do Amapá", endpoint: "api_publica_tre-ap" },
  "6.04": { sigla: "TRE-AM", nome: "TRE do Amazonas", endpoint: "api_publica_tre-am" },
  "6.05": { sigla: "TRE-BA", nome: "TRE da Bahia", endpoint: "api_publica_tre-ba" },
  "6.06": { sigla: "TRE-CE", nome: "TRE do Ceará", endpoint: "api_publica_tre-ce" },
  "6.07": { sigla: "TRE-DF", nome: "TRE do Distrito Federal", endpoint: "api_publica_tre-df" },
  "6.08": { sigla: "TRE-ES", nome: "TRE do Espírito Santo", endpoint: "api_publica_tre-es" },
  "6.09": { sigla: "TRE-GO", nome: "TRE de Goiás", endpoint: "api_publica_tre-go" },
  "6.10": { sigla: "TRE-MA", nome: "TRE do Maranhão", endpoint: "api_publica_tre-ma" },
  "6.11": { sigla: "TRE-MT", nome: "TRE de Mato Grosso", endpoint: "api_publica_tre-mt" },
  "6.12": { sigla: "TRE-MS", nome: "TRE de Mato Grosso do Sul", endpoint: "api_publica_tre-ms" },
  "6.13": { sigla: "TRE-MG", nome: "TRE de Minas Gerais", endpoint: "api_publica_tre-mg" },
  "6.14": { sigla: "TRE-PA", nome: "TRE do Pará", endpoint: "api_publica_tre-pa" },
  "6.15": { sigla: "TRE-PB", nome: "TRE da Paraíba", endpoint: "api_publica_tre-pb" },
  "6.16": { sigla: "TRE-PR", nome: "TRE do Paraná", endpoint: "api_publica_tre-pr" },
  "6.17": { sigla: "TRE-PE", nome: "TRE de Pernambuco", endpoint: "api_publica_tre-pe" },
  "6.18": { sigla: "TRE-PI", nome: "TRE do Piauí", endpoint: "api_publica_tre-pi" },
  "6.19": { sigla: "TRE-RJ", nome: "TRE do Rio de Janeiro", endpoint: "api_publica_tre-rj" },
  "6.20": { sigla: "TRE-RN", nome: "TRE do Rio Grande do Norte", endpoint: "api_publica_tre-rn" },
  "6.21": { sigla: "TRE-RS", nome: "TRE do Rio Grande do Sul", endpoint: "api_publica_tre-rs" },
  "6.22": { sigla: "TRE-RO", nome: "TRE de Rondônia", endpoint: "api_publica_tre-ro" },
  "6.23": { sigla: "TRE-RR", nome: "TRE de Roraima", endpoint: "api_publica_tre-rr" },
  "6.24": { sigla: "TRE-SC", nome: "TRE de Santa Catarina", endpoint: "api_publica_tre-sc" },
  "6.25": { sigla: "TRE-SE", nome: "TRE de Sergipe", endpoint: "api_publica_tre-se" },
  "6.26": { sigla: "TRE-SP", nome: "TRE de São Paulo", endpoint: "api_publica_tre-sp" },
  "6.27": { sigla: "TRE-TO", nome: "TRE do Tocantins", endpoint: "api_publica_tre-to" },
  // JUSTIÇA MILITAR E SUPERIORES
  "9.13": { sigla: "TJM-MG", nome: "TJM de Minas Gerais", endpoint: "api_publica_tjmmg" },
  "9.21": { sigla: "TJM-RS", nome: "TJM do Rio Grande do Sul", endpoint: "api_publica_tjmrs" },
  "9.26": { sigla: "TJM-SP", nome: "TJM de São Paulo", endpoint: "api_publica_tjmsp" },
  "7.00": { sigla: "STM", nome: "Superior Tribunal Militar", endpoint: "api_publica_stm" },
  "1.00": { sigla: "STF", nome: "Supremo Tribunal Federal", endpoint: "api_publica_stf" },
  "3.00": { sigla: "STJ", nome: "Superior Tribunal de Justiça", endpoint: "api_publica_stj" },
  "5.00": { sigla: "TST", nome: "Tribunal Superior do Trabalho", endpoint: "api_publica_tst" },
  "6.00": { sigla: "TSE", nome: "Tribunal Superior Eleitoral", endpoint: "api_publica_tse" },
  "2.00": { sigla: "CNJ", nome: "Conselho Nacional de Justiça", endpoint: "api_publica_cnj" },
  "4.00": { sigla: "CJF", nome: "Conselho da Justiça Federal", endpoint: "api_publica_cjf" }
};

// =============================================================
// UTILITÁRIOS
// =============================================================
const limparNum = (n) => String(n || "").replace(/\D/g, "");

const fmtCNJ = (n) => {
  if (n.length !== 20) return n;
  return `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}`;
};

const fmtDataBR = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch { return null; }
};

const diasDesde = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  } catch { return null; }
};

// Validação real do dígito verificador CNJ (Resolução CNJ nº 65/2008 — módulo 97 base 10)
// Formato: NNNNNNN-DD.AAAA.J.TR.OOOO  (NNNNNNN=sequencial, DD=dígito, AAAA=ano, J=segmento, TR=tribunal, OOOO=origem)
// Algoritmo: DV = 98 - ((NNNNNNN + AAAA + J + TR + OOOO + "00") mod 97)
// O sufixo "00" representa o lugar do próprio DV durante o cálculo.
const validarCNJ = (n) => {
  if (!n || n.length !== 20) {
    return { valido: false, motivo: "Número precisa ter exatamente 20 dígitos." };
  }
  if (!/^\d{20}$/.test(n)) {
    return { valido: false, motivo: "Número CNJ deve conter apenas dígitos." };
  }
  try {
    const seq = n.slice(0, 7);          // NNNNNNN
    const dv = n.slice(7, 9);           // DD
    const ano = n.slice(9, 13);         // AAAA
    const j = n.slice(13, 14);          // J
    const tr = n.slice(14, 16);         // TR
    const orig = n.slice(16, 20);       // OOOO

    // Concatena sem o DV e com sufixo "00" (placeholder do DV) e calcula resto mod 97
    // via aritmética dígito a dígito (o número é maior que 2^53).
    const concat = seq + ano + j + tr + orig + "00";
    let resto = 0;
    for (let i = 0; i < concat.length; i++) {
      resto = (resto * 10 + Number(concat[i])) % 97;
    }
    const dvCalc = 98 - resto;
    const dvCalcStr = String(dvCalc).padStart(2, "0");
    if (dvCalcStr !== dv) {
      return { valido: false, motivo: `Dígito verificador inválido (esperado ${dvCalcStr}, recebido ${dv}).` };
    }
    return { valido: true };
  } catch (e) {
    return { valido: false, motivo: `Erro ao validar dígito CNJ: ${e.message}` };
  }
};

// =============================================================
// CLASSIFICADOR DE MOVIMENTAÇÕES (TPU + texto descritivo)
// Recebe { nome (CNJ TPU), codigo, conteudo (Escavador/JusBrasil), complementos }
// Retorna { categoria, autor_do_ato, descricao_assertiva, urgencia }
// =============================================================
function classificarMovimento({ nome = "", codigo = null, conteudo = "", complementos = [] }) {
  const compStr = (complementos || []).join(" ");
  // Junta tudo em minúsculo, dando prioridade ao texto descritivo (conteudo)
  const txt = `${nome} ${compStr} ${conteudo}`.toLowerCase();

  // === Decisões judiciais (alta urgência) ===
  if (/sentença|julgad[oa] procedente|julgad[oa] improcedente|extin[gç]/i.test(txt)) {
    let resultado = "Sentença proferida";
    if (/procedente/i.test(txt) && !/improcedente/i.test(txt)) resultado = "Sentença julgou PROCEDENTE o pedido";
    else if (/improcedente/i.test(txt)) resultado = "Sentença julgou IMPROCEDENTE o pedido";
    else if (/parcialmente procedente/i.test(txt)) resultado = "Sentença julgou PARCIALMENTE PROCEDENTE";
    else if (/extin[gç]/i.test(txt)) resultado = "Sentença extinguiu o processo (sem julgamento de mérito)";
    else if (/homologa/i.test(txt)) resultado = "Sentença homologatória (acordo entre as partes)";
    return {
      categoria: "SENTENÇA",
      autor_do_ato: "Juiz(a)",
      descricao_assertiva: resultado,
      urgencia: "ALTA"
    };
  }

  if (/acórdão|acordam.*julgar|provimento.*recurso|negaram provimento|deram provimento/i.test(txt)) {
    let resultado = "Acórdão proferido pelo Tribunal";
    if (/deram provimento|provido/i.test(txt) && !/negaram/i.test(txt)) resultado = "Recurso PROVIDO pelo Tribunal";
    else if (/negaram provimento|não provido|improvido/i.test(txt)) resultado = "Recurso NÃO PROVIDO pelo Tribunal";
    else if (/parcial provimento/i.test(txt)) resultado = "Recurso PARCIALMENTE PROVIDO";
    return {
      categoria: "ACÓRDÃO",
      autor_do_ato: "Tribunal (órgão colegiado)",
      descricao_assertiva: resultado,
      urgencia: "ALTA"
    };
  }

  if (/decisão.*liminar|liminar.*deferid|tutela.*urgência|antecipação.*tutela|tutela.*deferid/i.test(txt)) {
    return {
      categoria: "DECISÃO LIMINAR / TUTELA",
      autor_do_ato: "Juiz(a)",
      descricao_assertiva: /deferid/i.test(txt) ? "Liminar/tutela DEFERIDA" : "Apreciação de pedido liminar",
      urgencia: "ALTA"
    };
  }

  if (/decisão|decidi[ru]/i.test(txt) && !/decisão.*colegiada/i.test(txt)) {
    return {
      categoria: "DECISÃO INTERLOCUTÓRIA",
      autor_do_ato: "Juiz(a)",
      descricao_assertiva: "Decisão interlocutória do juiz no curso do processo",
      urgencia: "MÉDIA"
    };
  }

  if (/despacho/i.test(txt)) {
    return {
      categoria: "DESPACHO",
      autor_do_ato: "Juiz(a)",
      descricao_assertiva: "Despacho de mero expediente do juiz",
      urgencia: "BAIXA"
    };
  }

  // === Atos das partes ===
  if (/contestação/i.test(txt)) {
    return {
      categoria: "CONTESTAÇÃO",
      autor_do_ato: "Réu (parte passiva)",
      descricao_assertiva: "O réu apresentou sua defesa (contestação)",
      urgencia: "MÉDIA"
    };
  }

  if (/réplica/i.test(txt)) {
    return {
      categoria: "RÉPLICA",
      autor_do_ato: "Autor (parte ativa)",
      descricao_assertiva: "O autor respondeu à contestação (réplica)",
      urgencia: "MÉDIA"
    };
  }

  if (/embargos.*declaração|embargos declaratórios/i.test(txt)) {
    return {
      categoria: "EMBARGOS DE DECLARAÇÃO",
      autor_do_ato: "Parte embargante",
      descricao_assertiva: "Foram opostos embargos de declaração contra decisão anterior",
      urgencia: "MÉDIA"
    };
  }

  if (/apelação|recurso.*apelação/i.test(txt)) {
    return {
      categoria: "APELAÇÃO",
      autor_do_ato: "Parte recorrente",
      descricao_assertiva: "Foi interposto recurso de apelação contra a sentença",
      urgencia: "ALTA"
    };
  }

  if (/agravo.*instrumento/i.test(txt)) {
    return {
      categoria: "AGRAVO DE INSTRUMENTO",
      autor_do_ato: "Parte agravante",
      descricao_assertiva: "Foi interposto agravo de instrumento contra decisão interlocutória",
      urgencia: "ALTA"
    };
  }

  if (/recurso.*especial|resp/i.test(txt) && /interposto|interposição/i.test(txt)) {
    return {
      categoria: "RECURSO ESPECIAL",
      autor_do_ato: "Parte recorrente",
      descricao_assertiva: "Recurso Especial dirigido ao STJ",
      urgencia: "ALTA"
    };
  }

  if (/recurso.*extraordinário|re\b/i.test(txt) && /interposto|interposição/i.test(txt)) {
    return {
      categoria: "RECURSO EXTRAORDINÁRIO",
      autor_do_ato: "Parte recorrente",
      descricao_assertiva: "Recurso Extraordinário dirigido ao STF",
      urgencia: "ALTA"
    };
  }

  if (/petição.*inicial/i.test(txt)) {
    return {
      categoria: "PETIÇÃO INICIAL",
      autor_do_ato: "Autor",
      descricao_assertiva: "Apresentação da petição inicial (início do processo)",
      urgencia: "BAIXA"
    };
  }

  if (/juntada.*petição|petição.*protocolada|peticionamento/i.test(txt)) {
    return {
      categoria: "PETIÇÃO",
      autor_do_ato: "Parte (advogado peticionante) — sem identificar qual lado pelo registro",
      descricao_assertiva: "Foi juntada uma petição aos autos",
      urgencia: "BAIXA"
    };
  }

  if (/manifestação/i.test(txt)) {
    return {
      categoria: "MANIFESTAÇÃO",
      autor_do_ato: "Parte do processo",
      descricao_assertiva: "Manifestação de uma das partes nos autos",
      urgencia: "BAIXA"
    };
  }

  // === Ministério Público ===
  if (/ministério público|parecer.*mp|manifestação.*ministerial/i.test(txt)) {
    return {
      categoria: "PARECER MP",
      autor_do_ato: "Ministério Público",
      descricao_assertiva: "Manifestação/parecer do Ministério Público",
      urgencia: "MÉDIA"
    };
  }

  // === Atos cartorários e secretaria ===
  if (/distribu[ií]/i.test(txt)) {
    return {
      categoria: "DISTRIBUIÇÃO",
      autor_do_ato: "Cartório / Distribuição",
      descricao_assertiva: "Processo distribuído ao órgão julgador",
      urgencia: "BAIXA"
    };
  }

  if (/intimação|intimad[oa]/i.test(txt)) {
    let alvo = "";
    if (/autor/i.test(txt)) alvo = " (autor)";
    else if (/réu|requerid[oa]/i.test(txt)) alvo = " (réu)";
    return {
      categoria: "INTIMAÇÃO",
      autor_do_ato: "Cartório / Secretaria",
      descricao_assertiva: `Parte foi intimada para tomar ciência ou se manifestar${alvo}`,
      urgencia: "MÉDIA"
    };
  }

  if (/citação|citad[oa]/i.test(txt)) {
    return {
      categoria: "CITAÇÃO",
      autor_do_ato: "Cartório / Oficial de Justiça",
      descricao_assertiva: "Citação do réu para integrar o processo",
      urgencia: "ALTA"
    };
  }

  if (/expedição.*mandado|mandado.*expedido/i.test(txt)) {
    return {
      categoria: "MANDADO EXPEDIDO",
      autor_do_ato: "Cartório",
      descricao_assertiva: "Mandado expedido para cumprimento por oficial de justiça",
      urgencia: "MÉDIA"
    };
  }

  if (/conclus[ãa]o|conclusos/i.test(txt)) {
    if (/conclus[ãa]o.*para.*senten|conclus[ãa]o.*para.*julgamento|conclusos.*para.*senten|conclus[ãa]o.*senten/i.test(txt)) {
      return {
        categoria: "CONCLUSO PARA SENTENÇA",
        autor_do_ato: "Cartório (envio ao juiz para sentenciar)",
        descricao_assertiva: "Autos enviados ao juiz especificamente para sentenciar (decisão final)",
        urgencia: "ALTA"
      };
    }
    return {
      categoria: "CONCLUSÃO",
      autor_do_ato: "Cartório (envio ao juiz)",
      descricao_assertiva: "Autos enviados ao juiz para análise/decisão",
      urgencia: "MÉDIA"
    };
  }

  if (/audiência designada|designação.*audiência/i.test(txt)) {
    return {
      categoria: "AUDIÊNCIA DESIGNADA",
      autor_do_ato: "Juiz(a) / Cartório",
      descricao_assertiva: "Audiência designada — fique atento à data marcada",
      urgencia: "ALTA"
    };
  }

  if (/audiência realizada|realização.*audiência/i.test(txt)) {
    return {
      categoria: "AUDIÊNCIA REALIZADA",
      autor_do_ato: "Juízo",
      descricao_assertiva: "Audiência foi realizada — verificar a ata",
      urgencia: "MÉDIA"
    };
  }

  if (/perícia|laudo pericial/i.test(txt)) {
    return {
      categoria: "PERÍCIA",
      autor_do_ato: "Perito judicial",
      descricao_assertiva: /laudo/i.test(txt) ? "Laudo pericial juntado aos autos" : "Atos relacionados à perícia judicial",
      urgencia: "MÉDIA"
    };
  }

  // === Penhora / execução / bloqueio (alta urgência financeira) ===
  if (/bloqueio.*on.?line|penhora.*on.?line|sisbajud|bacenjud/i.test(txt)) {
    return {
      categoria: "BLOQUEIO/PENHORA ONLINE",
      autor_do_ato: "Juízo (execução)",
      descricao_assertiva: "Bloqueio/penhora online de valores via SISBAJUD/BACENJUD",
      urgencia: "ALTA"
    };
  }

  if (/penhora/i.test(txt)) {
    return {
      categoria: "PENHORA",
      autor_do_ato: "Juízo / Oficial de Justiça",
      descricao_assertiva: "Ato de constrição patrimonial (penhora de bens)",
      urgencia: "ALTA"
    };
  }

  if (/leilão|hasta pública/i.test(txt)) {
    return {
      categoria: "LEILÃO/HASTA",
      autor_do_ato: "Juízo",
      descricao_assertiva: "Movimentação relativa a leilão/hasta pública de bens",
      urgencia: "ALTA"
    };
  }

  // === Encerramento ===
  if (/arquivamento|arquivad[oa]/i.test(txt)) {
    let detalhe = "Processo arquivado";
    if (/definitiv/i.test(txt)) detalhe = "Processo arquivado DEFINITIVAMENTE";
    else if (/provisór/i.test(txt)) detalhe = "Processo arquivado provisoriamente";
    return {
      categoria: "ARQUIVAMENTO",
      autor_do_ato: "Cartório",
      descricao_assertiva: detalhe,
      urgencia: "MÉDIA"
    };
  }

  if (/baixa definitiva|trânsito em julgado/i.test(txt)) {
    return {
      categoria: "TRÂNSITO EM JULGADO / BAIXA",
      autor_do_ato: "Cartório",
      descricao_assertiva: "Processo transitou em julgado / baixa definitiva (não cabe mais recurso)",
      urgencia: "ALTA"
    };
  }

  if (/conversão.*autos.*eletrônic/i.test(txt)) {
    return {
      categoria: "CONVERSÃO ELETRÔNICA",
      autor_do_ato: "Cartório",
      descricao_assertiva: "Conversão dos autos físicos para eletrônicos (ato administrativo)",
      urgencia: "BAIXA"
    };
  }

  // === Fallback inteligente: usa o nome bruto do TPU ou do conteúdo ===
  const nomeFormatado = (nome || conteudo || "Movimento processual sem descrição padronizada").trim();
  return {
    categoria: nomeFormatado.toUpperCase().slice(0, 60),
    autor_do_ato: "Não identificado pelo registro do tribunal",
    descricao_assertiva: nomeFormatado.charAt(0).toUpperCase() + nomeFormatado.slice(1),
    urgencia: "BAIXA"
  };
}

// =============================================================
// BUSCA CNJ DATAJUD (fonte primária — código TPU oficial)
// =============================================================
async function buscarCNJ(trib, num) {
  try {
    if (!DATAJUD_API_KEY) {
      return { ok: false, erro: "API CNJ Datajud não configurada (DATAJUD_API_KEY ausente no .env)" };
    }
    const r = await fetchComTimeout(`https://api-publica.datajud.cnj.jus.br/${trib.endpoint}/_search`, {
      method: "POST",
      headers: { "Authorization": `APIKey ${DATAJUD_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: num } } })
    });

    if (!r.ok) return { ok: false, erro: `${r.erro}${r.detalhe ? " — " + r.detalhe : ""} (CNJ Datajud)` };

    const d = r.json;
    const p = d?.hits?.hits?.[0]?._source;
    if (!p) return { ok: false, erro: "Processo não encontrado na base do CNJ" };

    // Movimentos ordenados do mais recente para o mais antigo — pega 30
    // (era 10, mas CONCLUSÃO/SENTENÇA podem estar em posições mais antigas
    //  quando há juntadas administrativas no topo do histórico)
    const movsOrdenados = [...(p.movimentos || [])].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
    const movsLimitados = movsOrdenados.slice(0, 30);

    const movimentos = movsLimitados.map(m => ({
      data: fmtDataBR(m.dataHora),
      data_iso: m.dataHora,
      nome: m.nome || "",
      codigo_tpu: m.codigo || null,
      complementos: (m.complementosTabelados || []).map(c => c?.descricao).filter(Boolean)
    }));

    return {
      ok: true,
      partes_polos: p.polos || null,
      autor: p.polos?.find(x => x.polo === "ATIVO")?.partes?.[0]?.nome || null,
      reu: p.polos?.find(x => x.polo === "PASSIVO")?.partes?.[0]?.nome || null,
      classe: p.classe?.nome || null,
      classe_codigo: p.classe?.codigo || null,
      assunto: p.assuntos?.[0]?.nome || null,
      assunto_codigo: p.assuntos?.[0]?.codigo || null,
      orgao_julgador: p.orgaoJulgador?.nome || null,
      grau: p.grau || null,
      data_ajuizamento: p.dataAjuizamento || null,
      sistema: p.sistema?.nome || null,
      formato: p.formato?.nome || null,
      movimentos
    };
  } catch (e) {
    return { ok: false, erro: `Erro de conexão com CNJ: ${e.message}` };
  }
}

// =============================================================
// BUSCA ESCAVADOR — capa do processo
// =============================================================
async function buscarEscCapa(numFmt) {
  try {
    if (!ESCAVADOR_API_KEY) return { ok: false, erro: "API Escavador não configurada (ESCAVADOR_API_KEY ausente no .env)" };

    const r = await fetchComTimeout(`https://api.escavador.com/api/v2/processos/numero_cnj/${numFmt}`, {
      headers: { "Authorization": `Bearer ${ESCAVADOR_API_KEY}`, "X-Requested-With": "XMLHttpRequest" }
    });

    if (!r.ok) return { ok: false, erro: `${r.erro}${r.detalhe ? " — " + r.detalhe : ""} (Escavador capa)` };

    const d = r.json;
    const p = d?.items?.[0] || d; // resposta pode vir solta também
    if (!p || (!p.numero_cnj && !p.fontes)) return { ok: false, erro: "Processo não encontrado no Escavador" };

    const f = p.fontes?.[0] || {};
    return {
      ok: true,
      autor: f.partes?.find(x => x.polo === "ATIVO")?.nome || p.titulo_polo_ativo || null,
      reu: f.partes?.find(x => x.polo === "PASSIVO")?.nome || p.titulo_polo_passivo || null,
      status_predito: f.status_predito || null,
      data_ultima_movimentacao: p.data_ultima_movimentacao || f.data_ultima_movimentacao || null,
      fontes_arquivadas: p.fontes_tribunais_estao_arquivadas ?? null,
      partes_completas: f.partes || []
    };
  } catch (e) {
    return { ok: false, erro: `Erro de conexão com Escavador (capa): ${e.message}` };
  }
}

// =============================================================
// BUSCA ESCAVADOR — movimentações com TEXTO DESCRITIVO
// É essa rota que dá o "conteudo" rico que o Datajud não tem
// =============================================================
async function buscarEscMovs(numFmt, limite = 30) {
  try {
    if (!ESCAVADOR_API_KEY) return { ok: false, erro: "API Escavador não configurada (ESCAVADOR_API_KEY ausente no .env)" };

    const r = await fetchComTimeout(`https://api.escavador.com/api/v2/processos/numero_cnj/${numFmt}/movimentacoes`, {
      headers: { "Authorization": `Bearer ${ESCAVADOR_API_KEY}`, "X-Requested-With": "XMLHttpRequest" }
    });

    if (!r.ok) return { ok: false, erro: `${r.erro}${r.detalhe ? " — " + r.detalhe : ""} (Escavador movs)` };

    const d = r.json;
    const items = d?.items || d?.data || [];
    if (!items.length) return { ok: false, erro: "Sem movimentações no Escavador" };

    const movs = items.slice(0, limite).map(m => ({
      data: fmtDataBR(m.data),
      data_iso: m.data || null,
      tipo: m.tipo || null,
      conteudo: m.conteudo || m.descricao || null,
      classificacao_predita: m.classificacao_predita?.nome || null
    }));

    return { ok: true, movimentos: movs };
  } catch (e) {
    return { ok: false, erro: `Erro de conexão com Escavador (movs): ${e.message}` };
  }
}

// =============================================================
// BUSCA JUSBRASIL (opcional — exige contrato/token comercial)
// Se não tiver token configurado, retorna inativa silenciosamente.
// Endpoint usado: API Jusbrasil Soluções (Consulta PRO)
// =============================================================
async function buscarJusBrasil(numFmt) {
  try {
    if (!JUSBRASIL_API_TOKEN) return { ok: false, erro: "API JusBrasil não configurada (JUSBRASIL_API_TOKEN ausente no .env)" };

    // Endpoint comercial - estrutura padrão da API Jusbrasil Soluções
    const r = await fetchComTimeout(`https://api.jusbrasil.com.br/v2/processos/numero_cnj/${numFmt}`, {
      headers: { "Authorization": `Bearer ${JUSBRASIL_API_TOKEN}`, "Content-Type": "application/json" }
    });

    if (!r.ok) return { ok: false, erro: `${r.erro}${r.detalhe ? " — " + r.detalhe : ""} (JusBrasil)` };

    const d = r.json;
    const p = d?.processo || d;
    if (!p) return { ok: false, erro: "Sem dados no JusBrasil" };

    const andamentos = (p.andamentos || []).slice(0, 30).map(a => ({
      data: fmtDataBR(a.data),
      data_iso: a.data,
      descricao: a.descricao,
      classificacao: a.classificacao || null
    }));

    return {
      ok: true,
      autor: (p.partes || []).find(x => /autor/i.test(x.tipo))?.nome || null,
      reu: (p.partes || []).find(x => /réu|reu/i.test(x.tipo))?.nome || null,
      classe: p.classe || null,
      status: p.status || null,
      andamentos
    };
  } catch (e) {
    return { ok: false, erro: `Erro de conexão com JusBrasil: ${e.message}` };
  }
}

// =============================================================
// FUSÃO INTELIGENTE: combina os movimentos do CNJ com o conteúdo
// descritivo do Escavador/JusBrasil pareando por DATA + SIMILARIDADE
// TEXTUAL. Quando há vários atos no mesmo dia, escolhe o melhor par
// e MARCA o item como consumido para não casar duas vezes.
// =============================================================

// Calcula afinidade simples entre nome TPU (ex.: "Sentença") e texto do Escavador
// (ex.: "Sentenciado em audiência..."): conta tokens compartilhados normalizados.
function _normalizar(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2);
}
function _afinidade(a, b) {
  const ta = new Set(_normalizar(a));
  const tb = new Set(_normalizar(b));
  if (!ta.size || !tb.size) return 0;
  let intersec = 0;
  for (const t of ta) if (tb.has(t)) intersec++;
  return intersec / Math.min(ta.size, tb.size);
}

function fundirMovimentos({ movsCNJ = [], movsEsc = [], andJB = [] }) {
  const TOLERANCIA_MS = 24 * 60 * 60 * 1000;
  const escConsumidos = new Set();
  const jbConsumidos = new Set();

  // Procura o MELHOR par dentro da janela de 24h:
  //  - mesma data ganha prioridade
  //  - empate em data: maior afinidade textual com o nome TPU
  //  - índice consumido nunca é repetido
  function escolherMelhor(lista, consumidos, dataAlvoMs, nomeAlvo, getTexto) {
    let melhor = null;
    let melhorScore = -1;
    for (let i = 0; i < lista.length; i++) {
      if (consumidos.has(i)) continue;
      const it = lista[i];
      if (!it.data_iso) continue;
      const tIso = new Date(it.data_iso).getTime();
      if (Number.isNaN(tIso)) continue;
      const diff = Math.abs(tIso - dataAlvoMs);
      if (diff > TOLERANCIA_MS) continue;

      const proximidade = 1 - (diff / TOLERANCIA_MS);              // 0..1 (1 = mesmo instante)
      const afinidade = _afinidade(nomeAlvo, getTexto(it));        // 0..1
      const score = proximidade * 0.6 + afinidade * 0.4;

      if (score > melhorScore) {
        melhorScore = score;
        melhor = { idx: i, item: it };
      }
    }
    return melhor;
  }

  return movsCNJ.map(mc => {
    const dataAlvo = mc.data_iso ? new Date(mc.data_iso).getTime() : null;
    const nomeAlvo = [mc.nome, ...(mc.complementos || [])].filter(Boolean).join(" ");

    let matchEsc = null;
    let matchJB = null;

    if (dataAlvo !== null && !Number.isNaN(dataAlvo)) {
      const escolhaEsc = escolherMelhor(movsEsc, escConsumidos, dataAlvo, nomeAlvo, x => x.conteudo || x.tipo || "");
      if (escolhaEsc) {
        matchEsc = escolhaEsc.item;
        escConsumidos.add(escolhaEsc.idx);
      }
      const escolhaJB = escolherMelhor(andJB, jbConsumidos, dataAlvo, nomeAlvo, x => x.descricao || "");
      if (escolhaJB) {
        matchJB = escolhaJB.item;
        jbConsumidos.add(escolhaJB.idx);
      }
    }

    // Texto descritivo: prioriza Escavador SEMPRE que existir (mais rico),
    // depois JusBrasil, depois nome TPU + complementos
    const conteudoDescritivo =
      matchEsc?.conteudo ||
      matchJB?.descricao ||
      [mc.nome, ...(mc.complementos || [])].filter(Boolean).join(" — ") ||
      mc.nome;

    const classif = classificarMovimento({
      nome: mc.nome,
      codigo: mc.codigo_tpu,
      conteudo: conteudoDescritivo,
      complementos: mc.complementos
    });

    return {
      data: mc.data,
      data_iso: mc.data_iso,
      dias_atras: diasDesde(mc.data_iso),
      // Códigos oficiais do CNJ
      codigo_tpu_cnj: mc.codigo_tpu,
      nome_tpu_cnj: mc.nome,
      complementos_tabelados: mc.complementos,
      // Texto descritivo (Escavador/JusBrasil)
      texto_descritivo: conteudoDescritivo,
      tipo_escavador: matchEsc?.tipo || null,
      classificacao_escavador: matchEsc?.classificacao_predita || null,
      classificacao_jusbrasil: matchJB?.classificacao || null,
      // Análise determinística
      categoria: classif.categoria,
      autor_do_ato: classif.autor_do_ato,
      descricao_assertiva: classif.descricao_assertiva,
      urgencia: classif.urgencia
    };
  });
}

// =============================================================
// GLOSSÁRIO DE MOVIMENTAÇÕES — explicação leiga + impacto + próximo passo
// Cobre todas as categorias do classificador. Usado pelo GPT para traduzir
// atos jurídicos em linguagem que o atendente repassa ao cliente.
// =============================================================
const GLOSSARIO_MOVIMENTACOES = {
  "SENTENÇA": {
    explicacao_leiga: "O juiz analisou o caso e decidiu (sentença).",
    impacto_pratico: "Ato decisório principal de 1ª instância. Após a sentença, abre prazo (geralmente 15 dias) para apelação.",
    proximo_passo_tipico: "Conferir o conteúdo da sentença e avaliar recurso ou cumprimento.",
    nivel: "ALTA"
  },
  "ACÓRDÃO": {
    explicacao_leiga: "Os desembargadores (instância superior) julgaram o recurso.",
    impacto_pratico: "Ato decisório de 2ª instância. Pode ainda caber recurso especial (STJ) ou extraordinário (STF).",
    proximo_passo_tipico: "Avaliar cabimento de novo recurso ou aguardar trânsito em julgado.",
    nivel: "ALTA"
  },
  "DECISÃO LIMINAR / TUTELA": {
    explicacao_leiga: "O juiz analisou um pedido urgente (liminar/tutela).",
    impacto_pratico: "Ato urgente — produz efeitos imediatos se deferido.",
    proximo_passo_tipico: "Cumprir a decisão (se deferida) ou avaliar agravo de instrumento (se indeferida).",
    nivel: "ALTA"
  },
  "DECISÃO INTERLOCUTÓRIA": {
    explicacao_leiga: "O juiz tomou uma decisão sobre um ponto específico, sem julgar o caso todo.",
    impacto_pratico: "Pode ser atacada por agravo de instrumento em casos previstos no art. 1.015 do CPC.",
    proximo_passo_tipico: "Analisar a decisão e avaliar recurso ou cumprimento.",
    nivel: "MÉDIA"
  },
  "DESPACHO": {
    explicacao_leiga: "O juiz deu uma orientação no processo, sem decidir o mérito.",
    impacto_pratico: "Ato de mero expediente — geralmente não cabe recurso. Apenas conduz o processo.",
    proximo_passo_tipico: "Cumprir o que o juiz determinou no despacho.",
    nivel: "BAIXA"
  },
  "CONCLUSÃO": {
    explicacao_leiga: "O processo foi enviado ao juiz para análise/decisão.",
    impacto_pratico: "Quando há conclusão, o processo está nas mãos do juiz aguardando ato.",
    proximo_passo_tipico: "Aguardar o juiz. Se já passaram muitos dias, considerar petição de reiteração.",
    nivel: "MÉDIA"
  },
  "CONCLUSO PARA SENTENÇA": {
    explicacao_leiga: "O processo foi enviado ao juiz especificamente para sentenciar.",
    impacto_pratico: "Fase mais avançada — instrução encerrada e o juiz vai julgar o caso.",
    proximo_passo_tipico: "Aguardar a publicação da sentença.",
    nivel: "ALTA"
  },
  "CONTESTAÇÃO": {
    explicacao_leiga: "O réu apresentou a defesa dele.",
    impacto_pratico: "Inicia a fase de resposta — geralmente segue-se a réplica do autor.",
    proximo_passo_tipico: "Autor é intimado para apresentar réplica em 15 dias.",
    nivel: "MÉDIA"
  },
  "RÉPLICA": {
    explicacao_leiga: "O autor respondeu à defesa do réu.",
    impacto_pratico: "Encerra a fase postulatória; processo segue para saneamento ou julgamento.",
    proximo_passo_tipico: "Juiz analisa se há provas a produzir ou já julga antecipadamente.",
    nivel: "MÉDIA"
  },
  "PETIÇÃO INICIAL": {
    explicacao_leiga: "Apresentação da petição que inicia o processo.",
    impacto_pratico: "Início formal do processo. Após distribuição, o juiz analisa e determina citação.",
    proximo_passo_tipico: "Aguardar despacho inicial e citação do réu.",
    nivel: "BAIXA"
  },
  "PETIÇÃO": {
    explicacao_leiga: "Foi juntada uma petição ao processo.",
    impacto_pratico: "Pode ser de qualquer parte — exige leitura do documento para entender.",
    proximo_passo_tipico: "Conferir o conteúdo e ver se exige resposta.",
    nivel: "BAIXA"
  },
  "MANIFESTAÇÃO": {
    explicacao_leiga: "Uma das partes se manifestou nos autos.",
    impacto_pratico: "Cumprimento de intimação anterior. Conteúdo precisa ser conferido.",
    proximo_passo_tipico: "Ler o teor da manifestação. Pode haver intimação da parte contrária.",
    nivel: "BAIXA"
  },
  "EMBARGOS DE DECLARAÇÃO": {
    explicacao_leiga: "Foram opostos embargos contra uma decisão (pedido de esclarecimento ou correção).",
    impacto_pratico: "Suspende prazo de outros recursos. Tribunal/juiz precisa decidir os embargos antes.",
    proximo_passo_tipico: "Aguardar decisão dos embargos. Se rejeitados, recomeça o prazo de apelação.",
    nivel: "MÉDIA"
  },
  "APELAÇÃO": {
    explicacao_leiga: "Foi interposto recurso de apelação contra a sentença.",
    impacto_pratico: "Processo sobe para 2ª instância (tribunal). Efeito suspensivo na maioria dos casos.",
    proximo_passo_tipico: "Aguardar contrarrazões da outra parte e remessa ao tribunal.",
    nivel: "ALTA"
  },
  "AGRAVO DE INSTRUMENTO": {
    explicacao_leiga: "Foi interposto agravo contra uma decisão interlocutória.",
    impacto_pratico: "Recurso direto ao tribunal contra decisão que não é sentença.",
    proximo_passo_tipico: "Aguardar julgamento do agravo no tribunal.",
    nivel: "ALTA"
  },
  "RECURSO ESPECIAL": {
    explicacao_leiga: "Recurso para o STJ (Superior Tribunal de Justiça).",
    impacto_pratico: "Discute interpretação de lei federal. Passa por juízo de admissibilidade.",
    proximo_passo_tipico: "Aguardar admissão e remessa ao STJ.",
    nivel: "ALTA"
  },
  "RECURSO EXTRAORDINÁRIO": {
    explicacao_leiga: "Recurso para o STF (Supremo Tribunal Federal).",
    impacto_pratico: "Discute matéria constitucional. Exige repercussão geral.",
    proximo_passo_tipico: "Aguardar admissão e remessa ao STF.",
    nivel: "ALTA"
  },
  "PARECER MP": {
    explicacao_leiga: "O Ministério Público se manifestou no processo.",
    impacto_pratico: "Em causas com interesse público, o MP atua como fiscal da lei.",
    proximo_passo_tipico: "Ler o parecer e ver se há intimação para manifestação das partes.",
    nivel: "MÉDIA"
  },
  "DISTRIBUIÇÃO": {
    explicacao_leiga: "O processo foi cadastrado e enviado ao juízo competente.",
    impacto_pratico: "Ato de cartório que define qual vara/juiz vai conduzir.",
    proximo_passo_tipico: "Aguardar despacho inicial do juiz.",
    nivel: "BAIXA"
  },
  "INTIMAÇÃO": {
    explicacao_leiga: "Uma das partes foi avisada oficialmente e tem prazo para responder.",
    impacto_pratico: "Início do prazo processual para a parte intimada.",
    proximo_passo_tipico: "Verificar prazo e conteúdo da intimação para cumprir/responder.",
    nivel: "MÉDIA"
  },
  "CITAÇÃO": {
    explicacao_leiga: "O réu foi oficialmente avisado do processo e tem prazo para defesa.",
    impacto_pratico: "Marco processual importante — inicia o prazo de contestação (15 dias úteis).",
    proximo_passo_tipico: "Aguardar contestação do réu ou decretação de revelia.",
    nivel: "ALTA"
  },
  "MANDADO EXPEDIDO": {
    explicacao_leiga: "Cartório expediu um mandado para cumprimento por oficial de justiça.",
    impacto_pratico: "Pode ser citação, intimação, penhora, busca e apreensão etc.",
    proximo_passo_tipico: "Aguardar cumprimento e juntada do mandado pelo oficial.",
    nivel: "MÉDIA"
  },
  "AUDIÊNCIA DESIGNADA": {
    explicacao_leiga: "Foi marcada uma audiência (data e hora).",
    impacto_pratico: "Comparecimento obrigatório das partes. Anotar imediatamente na agenda.",
    proximo_passo_tipico: "Preparar para a audiência (provas, testemunhas, defesa).",
    nivel: "ALTA"
  },
  "AUDIÊNCIA REALIZADA": {
    explicacao_leiga: "A audiência foi realizada — verificar a ata.",
    impacto_pratico: "A ata define o que foi acordado, decidido ou determinado.",
    proximo_passo_tipico: "Ler a ata e cumprir o que foi determinado.",
    nivel: "MÉDIA"
  },
  "PERÍCIA": {
    explicacao_leiga: "Atos relacionados à perícia técnica (laudo, esclarecimentos).",
    impacto_pratico: "O laudo pericial é prova fundamental e pode definir o resultado.",
    proximo_passo_tipico: "Analisar o laudo e ver se exige impugnação.",
    nivel: "MÉDIA"
  },
  "BLOQUEIO/PENHORA ONLINE": {
    explicacao_leiga: "Foi feita ordem para bloquear/penhorar valores em conta bancária (SISBAJUD).",
    impacto_pratico: "Constrição patrimonial imediata. Pode haver impugnação em 5 dias.",
    proximo_passo_tipico: "Avaliar impugnação ou aguardar transferência dos valores.",
    nivel: "ALTA"
  },
  "PENHORA": {
    explicacao_leiga: "Foi feita penhora de bens (imóveis, veículos, faturamento etc.).",
    impacto_pratico: "Restrição sobre o bem penhorado. Pode levar a leilão.",
    proximo_passo_tipico: "Avaliar impugnação à penhora ou aguardar avaliação/leilão.",
    nivel: "ALTA"
  },
  "LEILÃO/HASTA": {
    explicacao_leiga: "O processo está na fase de leilão de bens penhorados.",
    impacto_pratico: "Bens serão vendidos para pagamento do crédito.",
    proximo_passo_tipico: "Acompanhar resultado do leilão e destinação dos valores.",
    nivel: "ALTA"
  },
  "ARQUIVAMENTO": {
    explicacao_leiga: "O processo foi arquivado (provisória ou definitivamente).",
    impacto_pratico: "Provisório pode ser desarquivado. Definitivo encerra o processo.",
    proximo_passo_tipico: "Verificar se cabe desarquivamento.",
    nivel: "MÉDIA"
  },
  "TRÂNSITO EM JULGADO / BAIXA": {
    explicacao_leiga: "Não cabe mais recurso — a decisão é definitiva.",
    impacto_pratico: "Encerra a fase de conhecimento. Pode iniciar cumprimento de sentença.",
    proximo_passo_tipico: "Iniciar cumprimento de sentença ou execução, se houver crédito a receber.",
    nivel: "ALTA"
  },
  "CONVERSÃO ELETRÔNICA": {
    explicacao_leiga: "Os autos físicos foram convertidos em eletrônicos (digitalização).",
    impacto_pratico: "Ato administrativo, sem efeito processual relevante.",
    proximo_passo_tipico: "Nenhum — apenas continuar acompanhando.",
    nivel: "BAIXA"
  }
};

// =============================================================
// MOTOR DE FASE REAL (STATE ENGINE)
// Não confia apenas na última movimentação — analisa o histórico inteiro
// e aplica regras de prioridade jurídica para identificar o ESTADO real
// do processo.
// =============================================================
function identificarFaseReal(historico) {
  if (!historico?.length) {
    return {
      fase: "SEM HISTÓRICO DISPONÍVEL",
      explicacao: "Não há movimentações suficientes para definir a fase real.",
      responsavel: "Indefinido",
      base: null,
      data_referencia: null,
      dias_nesta_fase: null
    };
  }

  // 1. TRÂNSITO EM JULGADO — encerra tudo
  const transito = historico.find(m => m.categoria === "TRÂNSITO EM JULGADO / BAIXA");
  if (transito) {
    return {
      fase: "TRANSITADO EM JULGADO",
      explicacao: "Processo já transitou em julgado — não cabe mais recurso. Decisão final definitiva.",
      responsavel: "Escritório (avaliar cumprimento de sentença, se for o caso)",
      base: transito,
      data_referencia: transito.data,
      dias_nesta_fase: transito.dias_atras
    };
  }

  // 2. SENTENÇA / ACÓRDÃO — verifica se já houve recurso depois
  const sentenca = historico.find(m => m.categoria === "SENTENÇA");
  const acordao = historico.find(m => m.categoria === "ACÓRDÃO");

  if (acordao && acordao.dias_atras !== null && acordao.dias_atras < 90) {
    return {
      fase: "ACÓRDÃO PROFERIDO",
      explicacao: "Tribunal de 2ª instância já julgou o recurso. Aguardando trânsito em julgado ou novo recurso.",
      responsavel: "Escritório (avaliar novo recurso)",
      base: acordao,
      data_referencia: acordao.data,
      dias_nesta_fase: acordao.dias_atras
    };
  }

  if (sentenca) {
    const recursoApos = historico.find(m =>
      ["APELAÇÃO", "AGRAVO DE INSTRUMENTO", "RECURSO ESPECIAL", "RECURSO EXTRAORDINÁRIO", "EMBARGOS DE DECLARAÇÃO"].includes(m.categoria)
      && m.data_iso && sentenca.data_iso
      && new Date(m.data_iso) > new Date(sentenca.data_iso)
    );
    if (recursoApos) {
      return {
        fase: "EM RECURSO",
        explicacao: `Sentença foi proferida em ${sentenca.data} e está sendo discutida em recurso (${recursoApos.categoria}).`,
        responsavel: "Tribunal (julgamento) / Escritório (acompanhar)",
        base: recursoApos,
        data_referencia: recursoApos.data,
        dias_nesta_fase: recursoApos.dias_atras
      };
    }
    return {
      fase: "SENTENÇA PROFERIDA",
      explicacao: "O processo já teve sentença. É necessário avaliar prazo e eventual recurso.",
      responsavel: "Escritório (avaliar recurso/cumprimento)",
      base: sentenca,
      data_referencia: sentenca.data,
      dias_nesta_fase: sentenca.dias_atras
    };
  }

  // 3. AUDIÊNCIA DESIGNADA (futura)
  const audienciaFutura = historico.find(m => {
    if (m.categoria !== "AUDIÊNCIA DESIGNADA") return false;
    if (!m.texto_descritivo) return true;
    const matchData = m.texto_descritivo.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!matchData) return true;
    const [d, mo, y] = matchData[1].split("/").map(Number);
    return new Date(y, mo - 1, d).getTime() > Date.now();
  });
  if (audienciaFutura) {
    return {
      fase: "AUDIÊNCIA DESIGNADA",
      explicacao: "Há audiência marcada — verificar data e preparar (anotar na agenda obrigatoriamente).",
      responsavel: "Escritório (preparar audiência)",
      base: audienciaFutura,
      data_referencia: audienciaFutura.data,
      dias_nesta_fase: audienciaFutura.dias_atras
    };
  }

  // 4. CONCLUSO — processo está com o juiz aguardando ato
  // (regex amplo cobre casos onde a categoria não foi classificada perfeitamente)
  const concluso = historico.find(m =>
    m.categoria === "CONCLUSÃO" ||
    m.categoria === "CONCLUSO PARA SENTENÇA" ||
    /conclus|autos enviados ao juiz/i.test(m.texto_descritivo || "") ||
    /conclus/i.test(m.nome_tpu_cnj || "")
  );
  if (concluso) {
    // Verifica se DEPOIS do concluso veio algum ato decisório
    const atoAposConcluso = historico.find(m =>
      ["SENTENÇA", "DECISÃO INTERLOCUTÓRIA", "DECISÃO LIMINAR / TUTELA", "DESPACHO"].includes(m.categoria)
      && m.data_iso && concluso.data_iso
      && new Date(m.data_iso) > new Date(concluso.data_iso)
    );
    if (!atoAposConcluso) {
      return {
        fase: "AGUARDANDO SENTENÇA/DECISÃO",
        explicacao: `O processo está com o juiz desde ${concluso.data} (${concluso.dias_atras} dias) para análise. Não depende de providência imediata do escritório, salvo se houver demora excessiva.`,
        responsavel: "Tribunal",
        base: concluso,
        data_referencia: concluso.data,
        dias_nesta_fase: concluso.dias_atras
      };
    }
  }

  // 5. PENHORA / BLOQUEIO — fase de execução
  const penhora = historico.find(m =>
    ["BLOQUEIO/PENHORA ONLINE", "PENHORA", "LEILÃO/HASTA"].includes(m.categoria)
  );
  if (penhora && penhora.dias_atras !== null && penhora.dias_atras < 180) {
    return {
      fase: "EXECUÇÃO/CONSTRIÇÃO PATRIMONIAL",
      explicacao: "Processo está em fase de execução com atos de constrição patrimonial.",
      responsavel: "Escritório (avaliar impugnação ou acompanhar)",
      base: penhora,
      data_referencia: penhora.data,
      dias_nesta_fase: penhora.dias_atras
    };
  }

  // 6. CITAÇÃO recente
  const citacao = historico.find(m => m.categoria === "CITAÇÃO");
  if (citacao && citacao.dias_atras !== null && citacao.dias_atras < 60) {
    return {
      fase: "AGUARDANDO CONTESTAÇÃO",
      explicacao: "Réu foi citado e está dentro do prazo (em regra 15 dias úteis) para apresentar defesa.",
      responsavel: "Réu (defesa) / Escritório autor (acompanhar)",
      base: citacao,
      data_referencia: citacao.data,
      dias_nesta_fase: citacao.dias_atras
    };
  }

  // 7. CONTESTAÇÃO recente — aguardando réplica
  const contestacao = historico.find(m => m.categoria === "CONTESTAÇÃO");
  if (contestacao && contestacao.dias_atras !== null && contestacao.dias_atras < 90) {
    const replicaApos = historico.find(m =>
      m.categoria === "RÉPLICA" && m.data_iso && contestacao.data_iso
      && new Date(m.data_iso) > new Date(contestacao.data_iso)
    );
    if (!replicaApos) {
      return {
        fase: "AGUARDANDO RÉPLICA",
        explicacao: "Réu apresentou contestação. Autor deve apresentar réplica no prazo.",
        responsavel: "Escritório autor (elaborar réplica)",
        base: contestacao,
        data_referencia: contestacao.data,
        dias_nesta_fase: contestacao.dias_atras
      };
    }
  }

  // 8. INTIMAÇÃO recente
  const intimacao = historico.find(m => m.categoria === "INTIMAÇÃO");
  if (intimacao && intimacao.dias_atras !== null && intimacao.dias_atras < 60) {
    return {
      fase: "AGUARDANDO CUMPRIMENTO DE INTIMAÇÃO",
      explicacao: "Há intimação recente que pode exigir conferência de prazo ou manifestação.",
      responsavel: "Escritório (verificar prazo e conteúdo)",
      base: intimacao,
      data_referencia: intimacao.data,
      dias_nesta_fase: intimacao.dias_atras
    };
  }

  // 9. ARQUIVAMENTO
  const arquivamento = historico.find(m => m.categoria === "ARQUIVAMENTO");
  if (arquivamento) {
    return {
      fase: "ARQUIVADO",
      explicacao: "Processo está arquivado. Verificar se é provisório (cabe desarquivamento) ou definitivo.",
      responsavel: "Escritório (avaliar desarquivamento)",
      base: arquivamento,
      data_referencia: arquivamento.data,
      dias_nesta_fase: arquivamento.dias_atras
    };
  }

  // 10. PETIÇÃO/MANIFESTAÇÃO — aguardando triagem
  const peticao = historico.find(m =>
    ["PETIÇÃO", "MANIFESTAÇÃO", "RÉPLICA", "CONTESTAÇÃO"].includes(m.categoria)
  );
  if (peticao) {
    return {
      fase: "AGUARDANDO TRIAGEM APÓS PETIÇÃO",
      explicacao: "Foi juntada manifestação/petição e o processo aguarda conferência da secretaria ou encaminhamento ao juiz.",
      responsavel: "Tribunal",
      base: peticao,
      data_referencia: peticao.data,
      dias_nesta_fase: peticao.dias_atras
    };
  }

  // Fallback
  return {
    fase: "EM TRAMITAÇÃO",
    explicacao: "Não foi identificado ato decisivo no histórico recente.",
    responsavel: "Tribunal",
    base: historico[0],
    data_referencia: historico[0].data,
    dias_nesta_fase: historico[0].dias_atras
  };
}

// =============================================================
// RESUMO EXECUTIVO PARA O GPT (anti-genericidade)
// CORRIGIDO: agora recebe e usa faseReal — não pega só historico[0]
// =============================================================
function montarResumoExecutivo(historico, partes, classe, faseReal) {
  if (!historico?.length) return "Sem histórico de movimentações disponível.";

  const ult = historico[0];
  const altaUrg = historico.filter(h => h.urgencia === "ALTA");

  let resumo = `Processo de ${classe || "classe não informada"} entre ${partes.autor || "[autor]"} e ${partes.reu || "[réu]"}. `;
  resumo += `Última movimentação em ${ult.data}: ${ult.descricao_assertiva}. `;

  if (faseReal) {
    resumo += `FASE REAL IDENTIFICADA: ${faseReal.fase}. `;
    resumo += `EXPLICAÇÃO: ${faseReal.explicacao} `;
    resumo += `RESPONSÁVEL ATUAL: ${faseReal.responsavel}. `;
    if (faseReal.data_referencia) {
      resumo += `(Referência: ${faseReal.data_referencia}, há ${faseReal.dias_nesta_fase} dias). `;
    }
  }

  if (altaUrg.length) {
    resumo += `Há ${altaUrg.length} movimentação(ões) de alta urgência no histórico. `;
  }

  if (faseReal?.base?.texto_descritivo && faseReal.base.texto_descritivo !== faseReal.base.nome_tpu_cnj) {
    resumo += `Texto integral do ato de referência: "${faseReal.base.texto_descritivo}".`;
  }

  return resumo.trim();
}

// =============================================================
// ENDPOINT PRINCIPAL
// =============================================================
app.get("/consultar-processo", autenticar, async (req, res) => {
  const num = limparNum(req.query.numero_processo);
  const ipOrigem = req.ip || req.headers["x-forwarded-for"] || "desconhecido";

  // Validação
  const validacao = validarCNJ(num);
  if (!validacao.valido) {
    logConsulta({ numero: num, ip: ipOrigem, fontes: [], ok: false, erro: "NUMERO_INVALIDO" });
    return res.json({
      encontrado: false,
      erro: "NUMERO_INVALIDO",
      mensagem: validacao.motivo,
      orientacao_para_atendente: "Confirme com o cliente o número do processo. Deve ter 20 dígitos no padrão CNJ."
    });
  }

  const numFmt = fmtCNJ(num);
  const codTrib = num.substring(13, 14) + "." + num.substring(14, 16);
  const trib = TRIBUNAIS[codTrib];

  if (!trib) {
    logConsulta({ numero: numFmt, ip: ipOrigem, fontes: [], ok: false, erro: "TRIBUNAL_NAO_IDENTIFICADO" });
    return res.json({
      encontrado: false,
      erro: "TRIBUNAL_NAO_IDENTIFICADO",
      mensagem: `Código de tribunal "${codTrib}" não reconhecido.`,
      orientacao_para_atendente: "Confirme o número do processo com o cliente — pode haver dígito digitado errado."
    });
  }

  // Cache: se já temos resposta recente para este processo, retorna direto
  const cached = cacheGet(num);
  if (cached) {
    logConsulta({ numero: numFmt, ip: ipOrigem, fontes: cached.fontes_consultadas || [], ok: true, erro: "CACHE_HIT" });
    return res.json({ ...cached, _cache: true });
  }

  // Busca paralela em todas as fontes
  const [resCNJ, resEscCapa, resEscMovs, resJB] = await Promise.all([
    buscarCNJ(trib, num),
    buscarEscCapa(numFmt),
    buscarEscMovs(numFmt, 30),
    buscarJusBrasil(numFmt)
  ]);

  // Define base utilizada
  const fontesAtivas = [];
  if (resCNJ.ok) fontesAtivas.push("CNJ Datajud");
  if (resEscCapa.ok || resEscMovs.ok) fontesAtivas.push("Escavador");
  if (resJB.ok) fontesAtivas.push("JusBrasil");

  if (!fontesAtivas.length) {
    logConsulta({ numero: numFmt, ip: ipOrigem, fontes: [], ok: false, erro: "PROCESSO_NAO_LOCALIZADO" });
    return res.json({
      encontrado: false,
      erro: "PROCESSO_NAO_LOCALIZADO",
      numero_processo: numFmt,
      tribunal: trib.nome,
      mensagem: "O processo não foi localizado em nenhuma das bases consultadas (CNJ, Escavador, JusBrasil).",
      detalhes: {
        cnj: resCNJ.erro,
        escavador_capa: resEscCapa.erro,
        escavador_movimentacoes: resEscMovs.erro,
        jusbrasil: resJB.erro
      },
      orientacao_para_atendente: "Confirme o número com o cliente. Se estiver correto, o processo pode estar em segredo de justiça ou ainda não indexado."
    });
  }

  // Fusão de partes — Escavador e JusBrasil têm prioridade quando CNJ vem censurado
  const autor =
    (resEscCapa.ok && resEscCapa.autor) ||
    (resJB.ok && resJB.autor) ||
    resCNJ.autor ||
    "Não disponibilizado pelo tribunal";

  const reu =
    (resEscCapa.ok && resEscCapa.reu) ||
    (resJB.ok && resJB.reu) ||
    resCNJ.reu ||
    "Não disponibilizado pelo tribunal";

  // Funde os movimentos do CNJ com texto descritivo do Escavador/JusBrasil
  const historico = fundirMovimentos({
    movsCNJ: resCNJ.ok ? resCNJ.movimentos : [],
    movsEsc: resEscMovs.ok ? resEscMovs.movimentos : [],
    andJB: resJB.ok ? resJB.andamentos : []
  });

  // Se o CNJ falhou mas Escavador trouxe movimentos, usa Escavador como base
  const historicoFinal = historico.length
    ? historico
    : (resEscMovs.ok ? resEscMovs.movimentos.map(m => {
        const c = classificarMovimento({ nome: m.tipo || "", conteudo: m.conteudo || "" });
        return {
          data: m.data,
          data_iso: m.data_iso,
          dias_atras: diasDesde(m.data_iso),
          codigo_tpu_cnj: null,
          nome_tpu_cnj: null,
          texto_descritivo: m.conteudo,
          tipo_escavador: m.tipo,
          classificacao_escavador: m.classificacao_predita,
          categoria: c.categoria,
          autor_do_ato: c.autor_do_ato,
          descricao_assertiva: c.descricao_assertiva,
          urgencia: c.urgencia
        };
      }) : []);

  const ultima = historicoFinal[0] || null;
  const partes = { autor, reu };
  const classe = resCNJ.classe || resJB.classe || "Não informada";

  // === STATE ENGINE: identifica a fase real do processo ===
  const faseReal = identificarFaseReal(historicoFinal);

  // Glossário só dos atos que aparecem neste processo (economiza tokens)
  const categoriasNoProcesso = [...new Set(historicoFinal.map(h => h.categoria))];
  const glossarioDoProcesso = {};
  categoriasNoProcesso.forEach(cat => {
    if (GLOSSARIO_MOVIMENTACOES[cat]) glossarioDoProcesso[cat] = GLOSSARIO_MOVIMENTACOES[cat];
  });

  // Movimentações relevantes (urgência ALTA ou MÉDIA) para o GPT focar
  const movimentosRelevantes = historicoFinal
    .filter(h => h.urgencia === "ALTA" || h.urgencia === "MÉDIA")
    .slice(0, 10);

  // Resposta consolidada
  const resposta = {
    encontrado: true,
    numero_processo: numFmt,
    tribunal: trib.nome,
    sigla_tribunal: trib.sigla,
    fontes_consultadas: fontesAtivas,
    base_de_dados_utilizada: fontesAtivas.join(" + "),

    // Capa
    grau: resCNJ.grau || null,
    classe_processual: classe,
    codigo_classe: resCNJ.classe_codigo || null,
    assunto_principal: resCNJ.assunto || "Não informado",
    codigo_assunto: resCNJ.assunto_codigo || null,
    orgao_julgador: resCNJ.orgao_julgador || "Não informado",
    sistema_processual: resCNJ.sistema || null,
    formato: resCNJ.formato || null,
    data_ajuizamento: fmtDataBR(resCNJ.data_ajuizamento) || null,
    partes,
    status_predito_escavador: resEscCapa.ok ? resEscCapa.status_predito : null,
    fontes_arquivadas: resEscCapa.ok ? resEscCapa.fontes_arquivadas : null,

    // === ESTADO REAL DO PROCESSO (STATE ENGINE) ===
    // Este é o campo PRINCIPAL para o GPT entender em que fase o processo está.
    // NÃO usar apenas dados_da_movimentacao — esse pode ser ato administrativo irrelevante.
    fase_processual_real: faseReal.fase,
    explicacao_fase: faseReal.explicacao,
    responsavel_atual: faseReal.responsavel,
    base_fase_real: faseReal.base,
    data_referencia_fase: faseReal.data_referencia,
    dias_nesta_fase: faseReal.dias_nesta_fase,

    // Resumo executivo (string pronta pro GPT não inventar) — agora usa faseReal
    resumo_executivo: montarResumoExecutivo(historicoFinal, partes, classe, faseReal),

    // Última movimentação CRONOLÓGICA — pode ser irrelevante (juntada, conversão eletrônica etc).
    // Sempre cruzar com fase_processual_real antes de usar.
    dados_da_movimentacao: ultima ? {
      data_registro: ultima.data,
      data_iso: ultima.data_iso,
      dias_desde_movimentacao: ultima.dias_atras,
      categoria: ultima.categoria,
      tipo_da_movimentacao: ultima.nome_tpu_cnj || ultima.tipo_escavador,
      codigo_tpu: ultima.codigo_tpu_cnj,
      descricao_assertiva: ultima.descricao_assertiva,
      texto_completo_do_andamento: ultima.texto_descritivo,
      quem_fez_o_movimento: ultima.autor_do_ato,
      urgencia: ultima.urgencia,
      atencao: "Esta é apenas a movimentação cronologicamente mais recente. PODE ser ato administrativo. Use fase_processual_real para entender o estado do processo."
    } : null,

    // Movimentações relevantes (filtradas por urgência ALTA/MÉDIA)
    movimentos_relevantes: movimentosRelevantes,

    // Histórico das ÚLTIMAS 30 movimentações
    historico_ultimas_30: historicoFinal,

    // Glossário aplicável: explicação leiga + impacto + próximo passo
    glossario_aplicavel: glossarioDoProcesso,

    // Sinais de qualidade dos dados (anti-alucinação)
    qualidade_dos_dados: {
      cnj_disponivel: resCNJ.ok,
      escavador_capa_disponivel: resEscCapa.ok,
      escavador_movimentacoes_disponivel: resEscMovs.ok,
      jusbrasil_disponivel: resJB.ok,
      partes_completas: autor !== "Não disponibilizado pelo tribunal" && reu !== "Não disponibilizado pelo tribunal",
      historico_disponivel: historicoFinal.length > 0,
      total_movimentos_retornados: historicoFinal.length,
      tem_texto_descritivo: historicoFinal.some(h => h.texto_descritivo && h.texto_descritivo !== h.nome_tpu_cnj),
      fase_detectada_com_confianca: !["EM TRAMITAÇÃO", "SEM HISTÓRICO DISPONÍVEL"].includes(faseReal.fase)
    },

    // Instruções de uso para o LLM (anti-genericidade)
    instrucoes_para_gpt: {
      regra_principal: "USE fase_processual_real, explicacao_fase e responsavel_atual como base da resposta. NÃO use apenas dados_da_movimentacao.",
      ao_descrever_processo: "Diga: ESTADO ATUAL = fase_processual_real, baseado em base_fase_real de data_referencia_fase. Use o glossario_aplicavel para linguagem leiga.",
      ao_listar_movimentos: "Foque em movimentos_relevantes. Cite até 4 com data + descricao_assertiva.",
      proibido: "NÃO diga 'em movimentações iniciais', 'em análise interna', 'aguardando próximo andamento' a menos que fase_processual_real seja exatamente esse valor.",
      se_dado_faltar: "Se um campo for nulo ou 'Não disponibilizado', informe honestamente — não invente."
    },

    // GATILHO DA INTELIGÊNCIA ARTIFICIAL (O Segredo do Padrão ADVBOX)
    instrucoes_ocultas_modo_justine: {
      ordem_direta: "AVALIE OS MOVIMENTOS. Se no 'historico_ultimas_30' houver movimentações recentes com urgencia 'ALTA' ou 'MÉDIA' (Ex: Sentença, Intimação, Despacho, Liminar) E essas movimentações tiverem um texto longo no campo 'texto_descritivo', AJA COMO O ANALISTA JUSTIN-E DA ADVBOX. Você deve ler atenciosamente o texto desse juiz e entregar mastigado para a funcionária: 1. Qual foi a ordem/decisão; 2. Se há prazo para cumprir (ex: 5 dias); 3. Qual a recomendação exata (O que fazer) para não perder o prazo."
    }
  };

  // Salva no cache e registra log de auditoria
  cacheSet(num, resposta);
  logConsulta({ numero: numFmt, ip: ipOrigem, fontes: fontesAtivas, ok: true });

  res.json(resposta);
});

// =============================================================
// POLÍTICA DE PRIVACIDADE — exigido pelo GPT Actions público
// URL final: https://<seu-dominio>/privacy
// =============================================================
app.get("/privacy", (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Política de Privacidade</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #222; }
    h1 { color: #1B3A5C; border-bottom: 2px solid #2C5F8A; padding-bottom: 8px; }
    h2 { color: #2C5F8A; margin-top: 28px; }
    p { margin: 12px 0; }
    .meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Política de Privacidade</h1>
  <p class="meta">Última atualização: ${new Date().toLocaleDateString("pt-BR")}</p>

  <h2>1. Sobre a aplicação</h2>
  <p>Esta API realiza consultas processuais em bases públicas, especialmente CNJ/Datajud e Escavador, e fornece informações estruturadas sobre processos judiciais para fins de apoio jurídico-administrativo.</p>

  <h2>2. Dados tratados</h2>
  <p>A aplicação processa exclusivamente o número CNJ do processo informado pelo usuário e os dados públicos retornados pelas fontes oficiais consultadas. Não coletamos dados pessoais sensíveis fora do que já é divulgado publicamente pelos tribunais.</p>

  <h2>3. Registro de consultas</h2>
  <p>As consultas realizadas podem ser registradas (data, número de processo consultado, IP de origem) para fins de auditoria, prevenção de abuso e melhoria do serviço. Esses registros não são compartilhados com terceiros.</p>

  <h2>4. Compartilhamento</h2>
  <p>Os dados retornados são originários de fontes públicas (CNJ Datajud, Escavador) e seguem as condições de uso dessas plataformas. Nenhum dado é vendido ou cedido para terceiros.</p>

  <h2>5. Segurança</h2>
  <p>O acesso à API é protegido por chave interna (header <code>x-api-key</code>), limite de requisições por IP e cache temporário em memória. Os tokens de integração são armazenados como variáveis de ambiente, fora do código-fonte.</p>

  <h2>6. LGPD</h2>
  <p>Eventuais titulares de dados que constem em processos consultados podem exercer seus direitos previstos na Lei Geral de Proteção de Dados (Lei nº 13.709/2018) diretamente perante o tribunal de origem, fonte oficial dos dados.</p>

  <h2>7. Contato</h2>
  <p>Em caso de dúvidas sobre esta política, entre em contato pelo e-mail informado pelo responsável da aplicação.</p>
</body>
</html>`);
});

// =============================================================
// HEALTH CHECK — mostra status de configuração de segurança
// =============================================================
app.get("/health", (req, res) => res.json({
  status: "online",
  timestamp: new Date().toISOString(),
  seguranca: {
    autenticacao_interna_configurada: !!INTERNAL_API_KEY,
    rate_limit_ativo: true,
    rate_limit_max_por_janela: RATE_LIMIT_MAX,
    rate_limit_janela_ms: RATE_LIMIT_WINDOW_MS,
    cache_ativo: true,
    cache_ttl_ms: CACHE_TTL_MS,
    cache_max_entradas: CACHE_MAX_ENTRADAS,
    cache_entradas_atuais: cache.size,
    fetch_timeout_ms: FETCH_TIMEOUT_MS
  },
  apis_configuradas: {
    cnj_datajud: !!DATAJUD_API_KEY,
    escavador: !!ESCAVADOR_API_KEY,
    jusbrasil: !!JUSBRASIL_API_TOKEN
  }
}));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor online na porta ${PORT}`);
  if (!INTERNAL_API_KEY) console.warn("[ATENÇÃO] INTERNAL_API_KEY não configurada — endpoint /consultar-processo retornará 500.");
  if (!DATAJUD_API_KEY) console.warn("[ATENÇÃO] DATAJUD_API_KEY não configurada — consulta CNJ desativada.");
  if (!ESCAVADOR_API_KEY) console.warn("[ATENÇÃO] ESCAVADOR_API_KEY não configurada — consulta Escavador desativada.");
});
