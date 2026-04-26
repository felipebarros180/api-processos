import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// === DICIONÁRIO INTEGRAL DE TRIBUNAIS (Mapeamento Completo) ===
const TRIBUNAIS = {
  // === JUSTIÇA ESTADUAL (TJs) ===
  "8.01": { sigla: "TJAC", nome: "Tribunal de Justiça do Acre", endpoint: "api_publica_tjac", consulta: "https://esaj.tjac.jus.br/cpopg/open.do" },
  "8.02": { sigla: "TJAL", nome: "Tribunal de Justiça de Alagoas", endpoint: "api_publica_tjal", consulta: "https://www2.tjal.jus.br/cpopg/open.do" },
  "8.03": { sigla: "TJAP", nome: "Tribunal de Justiça do Amapá", endpoint: "api_publica_tjap", consulta: "https://tucujuris.tjap.jus.br/tucujuris/pages/consultar-processo/consultar-processo.html" },
  "8.04": { sigla: "TJAM", nome: "Tribunal de Justiça do Amazonas", endpoint: "api_publica_tjam", consulta: "https://consultasaj.tjam.jus.br/cpopg/open.do" },
  "8.05": { sigla: "TJBA", nome: "Tribunal de Justiça da Bahia", endpoint: "api_publica_tjba", consulta: "https://projudi.tjba.jus.br/projudi/" },
  "8.06": { sigla: "TJCE", nome: "Tribunal de Justiça do Ceará", endpoint: "api_publica_tjce", consulta: "https://esaj.tjce.jus.br/cpopg/open.do" },
  "8.07": { sigla: "TJDFT", nome: "Tribunal de Justiça do Distrito Federal e Territórios", endpoint: "api_publica_tjdft", consulta: "https://pje.tjdft.jus.br/consultapublica/ConsultaPublica/listView.seam" },
  "8.08": { sigla: "TJES", nome: "Tribunal de Justiça do Espírito Santo", endpoint: "api_publica_tjes", consulta: "https://sistemas.tjes.jus.br/consultaunificada/faces/pages/pesquisaSimplificada.xhtml" },
  "8.09": { sigla: "TJGO", nome: "Tribunal de Justiça de Goiás", endpoint: "api_publica_tjgo", consulta: "https://projudi.tjgo.jus.br/BuscaProcesso" },
  "8.10": { sigla: "TJMA", nome: "Tribunal de Justiça do Maranhão", endpoint: "api_publica_tjma", consulta: "https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam" },
  "8.11": { sigla: "TJMT", nome: "Tribunal de Justiça de Mato Grosso", endpoint: "api_publica_tjmt", consulta: "https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam" },
  "8.12": { sigla: "TJMS", nome: "Tribunal de Justiça de Mato Grosso do Sul", endpoint: "api_publica_tjms", consulta: "https://esaj.tjms.jus.br/cpopg/open.do" },
  "8.13": { sigla: "TJMG", nome: "Tribunal de Justiça de Minas Gerais", endpoint: "api_publica_tjmg", consulta: "https://www4.tjmg.jus.br/juridico/sf/proc_resultado.jsp" },
  "8.14": { sigla: "TJPA", nome: "Tribunal de Justiça do Pará", endpoint: "api_publica_tjpa", consulta: "https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam" },
  "8.15": { sigla: "TJPB", nome: "Tribunal de Justiça da Paraíba", endpoint: "api_publica_tjpb", consulta: "https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam" },
  "8.16": { sigla: "TJPR", nome: "Tribunal de Justiça do Paraná", endpoint: "api_publica_tjpr", consulta: "https://projudi.tjpr.jus.br/projudi/" },
  "8.17": { sigla: "TJPE", nome: "Tribunal de Justiça de Pernambuco", endpoint: "api_publica_tjpe", consulta: "https://pje.tjpe.jus.br/1g/ConsultaPublica/listView.seam" },
  "8.18": { sigla: "TJPI", nome: "Tribunal de Justiça do Piauí", endpoint: "api_publica_tjpi", consulta: "https://pje.tjpi.jus.br/1g/ConsultaPublica/listView.seam" },
  "8.19": { sigla: "TJRJ", nome: "Tribunal de Justiça do Rio de Janeiro", endpoint: "api_publica_tjrj", consulta: "https://www3.tjrj.jus.br/consultaprocessual/" },
  "8.20": { sigla: "TJRN", nome: "Tribunal de Justiça do Rio Grande do Norte", endpoint: "api_publica_tjrn", consulta: "https://pje1g.tjrn.jus.br/pje/ConsultaPublica/listView.seam" },
  "8.21": { sigla: "TJRS", nome: "Tribunal de Justiça do Rio Grande do Sul", endpoint: "api_publica_tjrs", consulta: "https://www.tjrs.jus.br/novo/buscas-solr/" },
  "8.22": { sigla: "TJRO", nome: "Tribunal de Justiça de Rondônia", endpoint: "api_publica_tjro", consulta: "https://pjepg.tjro.jus.br/consulta/ConsultaPublica/listView.seam" },
  "8.23": { sigla: "TJRR", nome: "Tribunal de Justiça de Roraima", endpoint: "api_publica_tjrr", consulta: "https://projudi.tjrr.jus.br/projudi/" },
  "8.24": { sigla: "TJSC", nome: "Tribunal de Justiça de Santa Catarina", endpoint: "api_publica_tjsc", consulta: "https://esaj.tjsc.jus.br/cpopg/open.do" },
  "8.25": { sigla: "TJSE", nome: "Tribunal de Justiça de Sergipe", endpoint: "api_publica_tjse", consulta: "https://www.tjse.jus.br/portal/consultas/consulta-processual" },
  "8.26": { sigla: "TJSP", nome: "Tribunal de Justiça de São Paulo", endpoint: "api_publica_tjsp", consulta: "https://esaj.tjsp.jus.br/cpopg/open.do" },
  "8.27": { sigla: "TJTO", nome: "Tribunal de Justiça do Tocantins", endpoint: "api_publica_tjto", consulta: "https://eproc1.tjto.jus.br/eprocV2_prod_1grau/externo_controlador.php?acao=processo_consulta_publica" },

  // === JUSTIÇA FEDERAL (TRFs) ===
  "4.01": { sigla: "TRF1", nome: "Tribunal Regional Federal da 1ª Região", endpoint: "api_publica_trf1" },
  "4.02": { sigla: "TRF2", nome: "Tribunal Regional Federal da 2ª Região", endpoint: "api_publica_trf2" },
  "4.03": { sigla: "TRF3", nome: "Tribunal Regional Federal da 3ª Região", endpoint: "api_publica_trf3" },
  "4.04": { sigla: "TRF4", nome: "Tribunal Regional Federal da 4ª Região", endpoint: "api_publica_trf4" },
  "4.05": { sigla: "TRF5", nome: "Tribunal Regional Federal da 5ª Região", endpoint: "api_publica_trf5" },
  "4.06": { sigla: "TRF6", nome: "Tribunal Regional Federal da 6ª Região", endpoint: "api_publica_trf6" },

  // === JUSTIÇA DO TRABALHO (TRTs) ===
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

  // === JUSTIÇA ELEITORAL (TREs) ===
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

  // === JUSTIÇA MILITAR (TJMs e STM) ===
  "9.13": { sigla: "TJM-MG", nome: "TJM de Minas Gerais", endpoint: "api_publica_tjmmg" },
  "9.21": { sigla: "TJM-RS", nome: "TJM do Rio Grande do Sul", endpoint: "api_publica_tjmrs" },
  "9.26": { sigla: "TJM-SP", nome: "TJM de São Paulo", endpoint: "api_publica_tjmsp" },
  "7.00": { sigla: "STM", nome: "Superior Tribunal Militar", endpoint: "api_publica_stm" },

  // === TRIBUNAIS SUPERIORES E CONSELHOS ===
  "1.00": { sigla: "STF", nome: "Supremo Tribunal Federal", endpoint: "api_publica_stf" },
  "3.00": { sigla: "STJ", nome: "Superior Tribunal de Justiça", endpoint: "api_publica_stj" },
  "5.00": { sigla: "TST", nome: "Tribunal Superior do Trabalho", endpoint: "api_publica_tst" },
  "6.00": { sigla: "TSE", nome: "Tribunal Superior Eleitoral", endpoint: "api_publica_tse" },
  "2.00": { sigla: "CNJ", nome: "Conselho Nacional de Justiça", endpoint: "api_publica_cnj" },
  "4.00": { sigla: "CJF", nome: "Conselho da Justiça Federal", endpoint: "api_publica_cjf" }
};

// --- UTILITÁRIOS ---
const limparNum = (n) => String(n || "").replace(/\D/g, "");
const fmtCNJ = (n) => n.length !== 20 ? n : `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}`;

// --- BUSCA CNJ (Com Histórico) ---
async function buscarCNJ(trib, num) {
  try {
    const apiKey = process.env.DATAJUD_API_KEY || "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
    const res = await fetch(`https://api-publica.datajud.cnj.jus.br/${trib.endpoint}/_search`, {
      method: "POST",
      headers: { "Authorization": `APIKey ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: num } } })
    });
    const d = await res.json();
    const p = d?.hits?.hits?.[0]?._source;
    if (!p) return { ok: false };

    // Extrai as 3 últimas movimentações para contexto
    const movs = [...(p.movimentos || [])].sort((a,b) => new Date(b.dataHora) - new Date(a.dataHora)).slice(0, 3);
    
    return {
      ok: true,
      autor: p.polos?.find(x => x.polo === "ATIVO")?.partes[0]?.nome || "Não informado",
      reu: p.polos?.find(x => x.polo === "PASSIVO")?.partes[0]?.nome || "Não informado",
      historico: movs.map(m => `${m.dataHora.split('T')[0]}: ${m.nome}`),
      data_mov: movs[0]?.dataHora || null,
      classe: p.classe?.nome || "Não informada"
    };
  } catch (e) { return { ok: false }; }
}

// --- BUSCA ESCAVADOR (Recuperação de Nomes) ---
async function buscarEsc(numFmt) {
  try {
    const key = process.env.ESCAVADOR_API_KEY;
    if (!key) return { ok: false };
    const res = await fetch(`https://api.escavador.com/api/v2/processos/numero_cnj/${numFmt}`, {
      headers: { "Authorization": `Bearer ${key}`, "X-Requested-With": "XMLHttpRequest" }
    });
    const d = await res.json();
    const p = d?.items?.[0];
    if (!p) return { ok: false };
    const f = p.fontes?.[0] || {};
    return {
      ok: true,
      autor: f.partes?.find(x => x.polo === "ATIVO")?.nome || p.titulo_polo_ativo || "Não informado",
      reu: f.partes?.find(x => x.polo === "PASSIVO")?.nome || p.titulo_polo_passivo || "Não informado",
      mov: f.movimentacoes?.[0]?.conteudo || "Sem descrição"
    };
  } catch (e) { return { ok: false }; }
}

app.get("/consultar-processo", async (req, res) => {
  const num = limparNum(req.query.numero_processo);
  const numFmt = fmtCNJ(num);
  const trib = TRIBUNAIS[num.substring(13,14) + "." + num.substring(14,16)];

  if (!trib) return res.json({ encontrado: false, mensagem: "Tribunal não identificado." });

  const [resCNJ, resEsc] = await Promise.all([buscarCNJ(trib, num), buscarEsc(numFmt)]);

  // Fusão de Dados: Prioriza nomes do Escavador se o CNJ estiver censurado
  const autor = (resEsc.ok && resEsc.autor !== "Não informado") ? resEsc.autor : resCNJ.autor;
  const reu = (resEsc.ok && resEsc.reu !== "Não informado") ? resEsc.reu : resCNJ.reu;
  
  if (!resCNJ.ok && !resEsc.ok) return res.json({ encontrado: false });

  res.json({
    encontrado: true,
    numero_processo: numFmt,
    tribunal: trib.nome,
    classe: resCNJ.classe,
    partes: { autor, reu },
    historico_recente: resCNJ.historico || [resEsc.mov],
    data_ultima_movimentacao: resCNJ.data_mov
  });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Online na porta ${PORT}`));
