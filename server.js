import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// === DICIONÁRIO INTEGRAL DE TRIBUNAIS ===
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

// === UTILITÁRIOS ===
const limparNum = (n) => String(n || "").replace(/\D/g, "");

const fmtCNJ = (n) => {
  if (n.length !== 20) return n;
  return `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}`;
};

// Formata data ISO -> dd/mm/aaaa
const fmtDataBR = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch { return null; }
};

// Calcula dias entre data ISO e hoje
const diasDesde = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  } catch { return null; }
};

// Validação de número CNJ (20 dígitos)
const validarCNJ = (n) => {
  if (!n || n.length !== 20) return { valido: false, motivo: "Número precisa ter exatamente 20 dígitos." };
  return { valido: true };
};

// Identifica quem fez o movimento com base no nome/código do movimento
// Os códigos TPU do CNJ seguem padronização nacional (Tabela Processual Unificada)
const identificarResponsavel = (mov) => {
  const nome = (mov?.nome || "").toLowerCase();
  const complementos = (mov?.complementosTabelados || []).map(c => (c?.descricao || "").toLowerCase()).join(" ");
  const texto = `${nome} ${complementos}`;

  // Padrões de identificação por palavras-chave do nome do movimento
  if (/petição inicial|distribuição|distribuído/.test(texto)) return "Cartório / Distribuição";
  if (/juntada de petição|petição protocolada|peticionamento/.test(texto)) {
    // Não dá para saber qual parte sem o conteúdo da petição — declarar incerteza
    return "Parte do processo (advogado peticionante)";
  }
  if (/juntada de manifestação|manifestação/.test(texto)) return "Parte do processo";
  if (/juntada de contestação|contestação apresentada/.test(texto)) return "Parte ré";
  if (/juntada de réplica|réplica/.test(texto)) return "Parte autora";
  if (/juntada de recurso|recurso interposto|apelação|agravo/.test(texto)) return "Parte do processo (recorrente)";
  if (/juntada de embargos/.test(texto)) return "Parte embargante";
  if (/parecer.*ministério público|manifestação.*mp|parecer ministerial/.test(texto)) return "Ministério Público";
  if (/despacho|decisão interlocutória/.test(texto)) return "Juiz(a)";
  if (/sentença|julgamento/.test(texto)) return "Juiz(a)";
  if (/acórdão|decisão colegiada/.test(texto)) return "Tribunal (Desembargadores)";
  if (/intimação|citação|expedição de mandado|mandado expedido/.test(texto)) return "Cartório / Secretaria";
  if (/conclusão|conclusos/.test(texto)) return "Cartório (envio ao juiz)";
  if (/audiência designada|designação de audiência/.test(texto)) return "Juiz(a) / Cartório";
  if (/realização de audiência|audiência realizada/.test(texto)) return "Juízo (audiência)";
  if (/perícia|laudo pericial/.test(texto)) return "Perito judicial";
  if (/arquivamento|arquivado/.test(texto)) return "Cartório (arquivamento)";
  if (/baixa definitiva|trânsito em julgado/.test(texto)) return "Cartório (baixa)";

  return "Não identificado pelo registro do tribunal";
};

// === BUSCA CNJ ===
async function buscarCNJ(trib, num) {
  try {
    const apiKey = process.env.DATAJUD_API_KEY || "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
    const res = await fetch(`https://api-publica.datajud.cnj.jus.br/${trib.endpoint}/_search`, {
      method: "POST",
      headers: { "Authorization": `APIKey ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: num } } })
    });

    if (!res.ok) return { ok: false, erro: `CNJ retornou status ${res.status}` };

    const d = await res.json();
    const p = d?.hits?.hits?.[0]?._source;
    if (!p) return { ok: false, erro: "Processo não encontrado na base do CNJ" };

    // Movimentos ordenados do mais recente para o mais antigo
    const movsOrdenados = [...(p.movimentos || [])].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
    const movsLimitados = movsOrdenados.slice(0, 10);

    // Estrutura cada movimento com responsável e código
    const historico = movsLimitados.map(m => ({
      data: fmtDataBR(m.dataHora),
      data_iso: m.dataHora,
      nome_movimento: m.nome || "Movimento sem descrição",
      codigo_tpu: m.codigo || null,
      responsavel: identificarResponsavel(m),
      complementos: (m.complementosTabelados || []).map(c => c?.descricao).filter(Boolean)
    }));

    return {
      ok: true,
      autor: p.polos?.find(x => x.polo === "ATIVO")?.partes?.[0]?.nome || null,
      reu: p.polos?.find(x => x.polo === "PASSIVO")?.partes?.[0]?.nome || null,
      classe: p.classe?.nome || null,
      assunto: p.assuntos?.[0]?.nome || null,
      orgao_julgador: p.orgaoJulgador?.nome || null,
      grau: p.grau || null,
      historico
    };
  } catch (e) {
    return { ok: false, erro: `Erro de conexão com CNJ: ${e.message}` };
  }
}

// === BUSCA ESCAVADOR ===
async function buscarEsc(numFmt) {
  try {
    const key = process.env.ESCAVADOR_API_KEY;
    if (!key) return { ok: false, erro: "API Escavador não configurada" };

    const res = await fetch(`https://api.escavador.com/api/v2/processos/numero_cnj/${numFmt}`, {
      headers: { "Authorization": `Bearer ${key}`, "X-Requested-With": "XMLHttpRequest" }
    });

    if (!res.ok) return { ok: false, erro: `Escavador retornou status ${res.status}` };

    const d = await res.json();
    const p = d?.items?.[0];
    if (!p) return { ok: false, erro: "Processo não encontrado no Escavador" };

    const f = p.fontes?.[0] || {};
    return {
      ok: true,
      autor: f.partes?.find(x => x.polo === "ATIVO")?.nome || p.titulo_polo_ativo || null,
      reu: f.partes?.find(x => x.polo === "PASSIVO")?.nome || p.titulo_polo_passivo || null,
      ultimo_movimento: f.movimentacoes?.[0]?.conteudo || null
    };
  } catch (e) {
    return { ok: false, erro: `Erro de conexão com Escavador: ${e.message}` };
  }
}

// === ENDPOINT PRINCIPAL ===
app.get("/consultar-processo", async (req, res) => {
  const num = limparNum(req.query.numero_processo);

  // Validação de entrada
  const validacao = validarCNJ(num);
  if (!validacao.valido) {
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
    return res.json({
      encontrado: false,
      erro: "TRIBUNAL_NAO_IDENTIFICADO",
      mensagem: `Código de tribunal "${codTrib}" não reconhecido no número informado.`,
      orientacao_para_atendente: "Confirme o número do processo com o cliente — pode haver dígito digitado errado."
    });
  }

  // Busca paralela nas duas bases
  const [resCNJ, resEsc] = await Promise.all([
    buscarCNJ(trib, num),
    buscarEsc(numFmt)
  ]);

  // Define qual base alimentou o resultado
  let baseUtilizada;
  if (resCNJ.ok && resEsc.ok) baseUtilizada = "CNJ Datajud + Escavador (fusão de dados)";
  else if (resCNJ.ok) baseUtilizada = "CNJ Datajud";
  else if (resEsc.ok) baseUtilizada = "Escavador";
  else {
    return res.json({
      encontrado: false,
      erro: "PROCESSO_NAO_LOCALIZADO",
      numero_processo: numFmt,
      tribunal: trib.nome,
      mensagem: "O processo não foi localizado em nenhuma das bases consultadas (CNJ e Escavador).",
      detalhe_cnj: resCNJ.erro,
      detalhe_escavador: resEsc.erro,
      orientacao_para_atendente: "Confirme o número com o cliente. Se estiver correto, o processo pode estar em segredo de justiça ou ainda não indexado."
    });
  }

  // Fusão de partes — Escavador tem prioridade quando CNJ vem censurado/vazio
  const autor = (resEsc.ok && resEsc.autor) ? resEsc.autor : (resCNJ.autor || "Não disponibilizado pelo tribunal");
  const reu = (resEsc.ok && resEsc.reu) ? resEsc.reu : (resCNJ.reu || "Não disponibilizado pelo tribunal");

  // Extrai a movimentação mais recente como destaque
  const ultimaMov = resCNJ.historico?.[0] || null;
  const diasDecorridos = ultimaMov ? diasDesde(ultimaMov.data_iso) : null;

  // Monta a resposta estruturada
  const resposta = {
    encontrado: true,
    numero_processo: numFmt,
    tribunal: trib.nome,
    sigla_tribunal: trib.sigla,
    base_de_dados_utilizada: baseUtilizada,
    grau: resCNJ.grau || null,
    classe_processual: resCNJ.classe || "Não informada",
    assunto_principal: resCNJ.assunto || "Não informado",
    orgao_julgador: resCNJ.orgao_julgador || "Não informado",
    partes: { autor, reu },

    // Movimentação mais recente — destacada para o GPT
    dados_da_movimentacao: ultimaMov ? {
      data_registro: ultimaMov.data,
      data_iso: ultimaMov.data_iso,
      dias_desde_movimentacao: diasDecorridos,
      tipo_da_movimentacao: ultimaMov.nome_movimento,
      codigo_tpu: ultimaMov.codigo_tpu,
      texto_do_andamento: ultimaMov.complementos?.length > 0
        ? ultimaMov.complementos.join("; ")
        : ultimaMov.nome_movimento,
      quem_fez_o_movimento: ultimaMov.responsavel
    } : null,

    // Histórico completo (até 10 movimentos) para análise contextual
    historico_completo: resCNJ.historico || [],

    // Campo cru do Escavador como fallback descritivo
    descricao_escavador: resEsc.ok ? resEsc.ultimo_movimento : null,

    // Sinalização de qualidade dos dados (anti-alucinação)
    qualidade_dos_dados: {
      cnj_disponivel: resCNJ.ok,
      escavador_disponivel: resEsc.ok,
      partes_completas: autor !== "Não disponibilizado pelo tribunal" && reu !== "Não disponibilizado pelo tribunal",
      historico_disponivel: (resCNJ.historico?.length || 0) > 0
    }
  };

  res.json(resposta);
});

// Endpoint de saúde para monitoramento
app.get("/health", (req, res) => res.json({ status: "online", timestamp: new Date().toISOString() }));

app.listen(PORT, "0.0.0.0", () => console.log(`Servidor online na porta ${PORT}`));
