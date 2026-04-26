import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==========================================
// 🏛️ DICIONÁRIO COMPLETO DE TRIBUNAIS
// ==========================================
const TRIBUNAIS = {
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
  "4.01": { sigla: "TRF1", nome: "Tribunal Regional Federal da 1ª Região", endpoint: "api_publica_trf1", consulta: "https://pje1g.trf1.jus.br/consultapublica/ConsultaPublica/listView.seam" },
  "4.02": { sigla: "TRF2", nome: "Tribunal Regional Federal da 2ª Região", endpoint: "api_publica_trf2", consulta: "https://eproc.jfrj.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica" },
  "4.03": { sigla: "TRF3", nome: "Tribunal Regional Federal da 3ª Região", endpoint: "api_publica_trf3", consulta: "https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam" },
  "4.04": { sigla: "TRF4", nome: "Tribunal Regional Federal da 4ª Região", endpoint: "api_publica_trf4", consulta: "https://eproc.jfrs.jus.br/eprocV2/controlador.php?acao=processo_consulta_publica" },
  "4.05": { sigla: "TRF5", nome: "Tribunal Regional Federal da 5ª Região", endpoint: "api_publica_trf5", consulta: "https://pje1g.trf5.jus.br/pje/ConsultaPublica/listView.seam" },
  "4.06": { sigla: "TRF6", nome: "Tribunal Regional Federal da 6ª Região", endpoint: "api_publica_trf6", consulta: "https://pje1g.trf6.jus.br/consultapublica/ConsultaPublica/listView.seam" },
  "5.01": { sigla: "TRT1", nome: "TRT da 1ª Região", endpoint: "api_publica_trt1", consulta: "https://pje.trt1.jus.br/consultaprocessual/" },
  "5.02": { sigla: "TRT2", nome: "TRT da 2ª Região", endpoint: "api_publica_trt2", consulta: "https://pje.trt2.jus.br/consultaprocessual/" },
  "5.03": { sigla: "TRT3", nome: "TRT da 3ª Região", endpoint: "api_publica_trt3", consulta: "https://pje.trt3.jus.br/consultaprocessual/" },
  "5.04": { sigla: "TRT4", nome: "TRT da 4ª Região", endpoint: "api_publica_trt4", consulta: "https://pje.trt4.jus.br/consultaprocessual/" },
  "5.05": { sigla: "TRT5", nome: "TRT da 5ª Região", endpoint: "api_publica_trt5", consulta: "https://pje.trt5.jus.br/consultaprocessual/" },
  "5.06": { sigla: "TRT6", nome: "TRT da 6ª Região", endpoint: "api_publica_trt6", consulta: "https://pje.trt6.jus.br/consultaprocessual/" },
  "5.07": { sigla: "TRT7", nome: "TRT da 7ª Região", endpoint: "api_publica_trt7", consulta: "https://pje.trt7.jus.br/consultaprocessual/" },
  "5.08": { sigla: "TRT8", nome: "TRT da 8ª Região", endpoint: "api_publica_trt8", consulta: "https://pje.trt8.jus.br/consultaprocessual/" },
  "5.09": { sigla: "TRT9", nome: "TRT da 9ª Região", endpoint: "api_publica_trt9", consulta: "https://pje.trt9.jus.br/consultaprocessual/" },
  "5.10": { sigla: "TRT10", nome: "TRT da 10ª Região", endpoint: "api_publica_trt10", consulta: "https://pje.trt10.jus.br/consultaprocessual/" },
  "5.11": { sigla: "TRT11", nome: "TRT da 11ª Região", endpoint: "api_publica_trt11", consulta: "https://pje.trt11.jus.br/consultaprocessual/" },
  "5.12": { sigla: "TRT12", nome: "TRT da 12ª Região", endpoint: "api_publica_trt12", consulta: "https://pje.trt12.jus.br/consultaprocessual/" },
  "5.13": { sigla: "TRT13", nome: "TRT da 13ª Região", endpoint: "api_publica_trt13", consulta: "https://pje.trt13.jus.br/consultaprocessual/" },
  "5.14": { sigla: "TRT14", nome: "TRT da 14ª Região", endpoint: "api_publica_trt14", consulta: "https://pje.trt14.jus.br/consultaprocessual/" },
  "5.15": { sigla: "TRT15", nome: "TRT da 15ª Região", endpoint: "api_publica_trt15", consulta: "https://pje.trt15.jus.br/consultaprocessual/" },
  "5.16": { sigla: "TRT16", nome: "TRT da 16ª Região", endpoint: "api_publica_trt16", consulta: "https://pje.trt16.jus.br/consultaprocessual/" },
  "5.17": { sigla: "TRT17", nome: "TRT da 17ª Região", endpoint: "api_publica_trt17", consulta: "https://pje.trt17.jus.br/consultaprocessual/" },
  "5.18": { sigla: "TRT18", nome: "TRT da 18ª Região", endpoint: "api_publica_trt18", consulta: "https://pje.trt18.jus.br/consultaprocessual/" },
  "5.19": { sigla: "TRT19", nome: "TRT da 19ª Região", endpoint: "api_publica_trt19", consulta: "https://pje.trt19.jus.br/consultaprocessual/" },
  "5.20": { sigla: "TRT20", nome: "TRT da 20ª Região", endpoint: "api_publica_trt20", consulta: "https://pje.trt20.jus.br/consultaprocessual/" },
  "5.21": { sigla: "TRT21", nome: "TRT da 21ª Região", endpoint: "api_publica_trt21", consulta: "https://pje.trt21.jus.br/consultaprocessual/" },
  "5.22": { sigla: "TRT22", nome: "TRT da 22ª Região", endpoint: "api_publica_trt22", consulta: "https://pje.trt22.jus.br/consultaprocessual/" },
  "5.23": { sigla: "TRT23", nome: "TRT da 23ª Região", endpoint: "api_publica_trt23", consulta: "https://pje.trt23.jus.br/consultaprocessual/" },
  "5.24": { sigla: "TRT24", nome: "TRT da 24ª Região", endpoint: "api_publica_trt24", consulta: "https://pje.trt24.jus.br/consultaprocessual/" },
  "6.01": { sigla: "TRE-AC", nome: "Tribunal Regional Eleitoral do Acre", endpoint: "api_publica_tre-ac", consulta: "https://www.tre-ac.jus.br/servicos-judiciais/consulta-processual" },
  "6.02": { sigla: "TRE-AL", nome: "Tribunal Regional Eleitoral de Alagoas", endpoint: "api_publica_tre-al", consulta: "https://www.tre-al.jus.br/servicos-judiciais/consulta-processual" },
  "6.03": { sigla: "TRE-AP", nome: "Tribunal Regional Eleitoral do Amapá", endpoint: "api_publica_tre-ap", consulta: "https://www.tre-ap.jus.br/servicos-judiciais/consulta-processual" },
  "6.04": { sigla: "TRE-AM", nome: "Tribunal Regional Eleitoral do Amazonas", endpoint: "api_publica_tre-am", consulta: "https://www.tre-am.jus.br/servicos-judiciais/consulta-processual" },
  "6.05": { sigla: "TRE-BA", nome: "Tribunal Regional Eleitoral da Bahia", endpoint: "api_publica_tre-ba", consulta: "https://www.tre-ba.jus.br/servicos-judiciais/consulta-processual" },
  "6.06": { sigla: "TRE-CE", nome: "Tribunal Regional Eleitoral do Ceará", endpoint: "api_publica_tre-ce", consulta: "https://www.tre-ce.jus.br/servicos-judiciais/consulta-processual" },
  "6.07": { sigla: "TRE-DF", nome: "Tribunal Regional Eleitoral do Distrito Federal", endpoint: "api_publica_tre-df", consulta: "https://www.tre-df.jus.br/servicos-judiciais/consulta-processual" },
  "6.08": { sigla: "TRE-ES", nome: "Tribunal Regional Eleitoral do Espírito Santo", endpoint: "api_publica_tre-es", consulta: "https://www.tre-es.jus.br/servicos-judiciais/consulta-processual" },
  "6.09": { sigla: "TRE-GO", nome: "Tribunal Regional Eleitoral de Goiás", endpoint: "api_publica_tre-go", consulta: "https://www.tre-go.jus.br/servicos-judiciais/consulta-processual" },
  "6.10": { sigla: "TRE-MA", nome: "Tribunal Regional Eleitoral do Maranhão", endpoint: "api_publica_tre-ma", consulta: "https://www.tre-ma.jus.br/servicos-judiciais/consulta-processual" },
  "6.11": { sigla: "TRE-MT", nome: "Tribunal Regional Eleitoral de Mato Grosso", endpoint: "api_publica_tre-mt", consulta: "https://www.tre-mt.jus.br/servicos-judiciais/consulta-processual" },
  "6.12": { sigla: "TRE-MS", nome: "Tribunal Regional Eleitoral de Mato Grosso do Sul", endpoint: "api_publica_tre-ms", consulta: "https://www.tre-ms.jus.br/servicos-judiciais/consulta-processual" },
  "6.13": { sigla: "TRE-MG", nome: "Tribunal Regional Eleitoral de Minas Gerais", endpoint: "api_publica_tre-mg", consulta: "https://www.tre-mg.jus.br/servicos-judiciais/consulta-processual" },
  "6.14": { sigla: "TRE-PA", nome: "Tribunal Regional Eleitoral do Pará", endpoint: "api_publica_tre-pa", consulta: "https://www.tre-pa.jus.br/servicos-judiciais/consulta-processual" },
  "6.15": { sigla: "TRE-PB", nome: "Tribunal Regional Eleitoral da Paraíba", endpoint: "api_publica_tre-pb", consulta: "https://www.tre-pb.jus.br/servicos-judiciais/consulta-processual" },
  "6.16": { sigla: "TRE-PR", nome: "Tribunal Regional Eleitoral do Paraná", endpoint: "api_publica_tre-pr", consulta: "https://www.tre-pr.jus.br/servicos-judiciais/consulta-processual" },
  "6.17": { sigla: "TRE-PE", nome: "Tribunal Regional Eleitoral de Pernambuco", endpoint: "api_publica_tre-pe", consulta: "https://www.tre-pe.jus.br/servicos-judiciais/consulta-processual" },
  "6.18": { sigla: "TRE-PI", nome: "Tribunal Regional Eleitoral do Piauí", endpoint: "api_publica_tre-pi", consulta: "https://www.tre-pi.jus.br/servicos-judiciais/consulta-processual" },
  "6.19": { sigla: "TRE-RJ", nome: "Tribunal Regional Eleitoral do Rio de Janeiro", endpoint: "api_publica_tre-rj", consulta: "https://www.tre-rj.jus.br/servicos-judiciais/consulta-processual" },
  "6.20": { sigla: "TRE-RN", nome: "Tribunal Regional Eleitoral do Rio Grande do Norte", endpoint: "api_publica_tre-rn", consulta: "https://www.tre-rn.jus.br/servicos-judiciais/consulta-processual" },
  "6.21": { sigla: "TRE-RS", nome: "Tribunal Regional Eleitoral do Rio Grande do Sul", endpoint: "api_publica_tre-rs", consulta: "https://www.tre-rs.jus.br/servicos-judiciais/consulta-processual" },
  "6.22": { sigla: "TRE-RO", nome: "Tribunal Regional Eleitoral de Rondônia", endpoint: "api_publica_tre-ro", consulta: "https://www.tre-ro.jus.br/servicos-judiciais/consulta-processual" },
  "6.23": { sigla: "TRE-RR", nome: "Tribunal Regional Eleitoral de Roraima", endpoint: "api_publica_tre-rr", consulta: "https://www.tre-rr.jus.br/servicos-judiciais/consulta-processual" },
  "6.24": { sigla: "TRE-SC", nome: "Tribunal Regional Eleitoral de Santa Catarina", endpoint: "api_publica_tre-sc", consulta: "https://www.tre-sc.jus.br/servicos-judiciais/consulta-processual" },
  "6.25": { sigla: "TRE-SE", nome: "Tribunal Regional Eleitoral de Sergipe", endpoint: "api_publica_tre-se", consulta: "https://www.tre-se.jus.br/servicos-judiciais/consulta-processual" },
  "6.26": { sigla: "TRE-SP", nome: "Tribunal Regional Eleitoral de São Paulo", endpoint: "api_publica_tre-sp", consulta: "https://www.tre-sp.jus.br/servicos-judiciais/consulta-processual" },
  "6.27": { sigla: "TRE-TO", nome: "Tribunal Regional Eleitoral do Tocantins", endpoint: "api_publica_tre-to", consulta: "https://www.tre-to.jus.br/servicos-judiciais/consulta-processual" },
  "9.13": { sigla: "TJM-MG", nome: "Tribunal de Justiça Militar de Minas Gerais", endpoint: "api_publica_tjmmg", consulta: "https://www.tjmmg.jus.br/" },
  "9.21": { sigla: "TJM-RS", nome: "Tribunal de Justiça Militar do Rio Grande do Sul", endpoint: "api_publica_tjmrs", consulta: "https://www.tjmrs.jus.br/" },
  "9.26": { sigla: "TJM-SP", nome: "Tribunal de Justiça Militar de São Paulo", endpoint: "api_publica_tjmsp", consulta: "https://www.tjmsp.jus.br/" },
  "1.00": { sigla: "STF", nome: "Supremo Tribunal Federal", endpoint: "api_publica_stf", consulta: "https://portal.stf.jus.br/processos/listarProcessos.asp" },
  "2.00": { sigla: "CNJ", nome: "Conselho Nacional de Justiça", endpoint: "api_publica_cnj", consulta: "https://www.cnj.jus.br/pjecnj/ConsultaPublica/listView.seam" },
  "3.00": { sigla: "STJ", nome: "Superior Tribunal de Justiça", endpoint: "api_publica_stj", consulta: "https://processo.stj.jus.br/processo/pesquisa/" },
  "4.00": { sigla: "CJF", nome: "Conselho da Justiça Federal", endpoint: "api_publica_cjf", consulta: "https://www.cjf.jus.br/cjf/processo/consulta-processual" },
  "5.00": { sigla: "TST", nome: "Tribunal Superior do Trabalho", endpoint: "api_publica_tst", consulta: "https://consultaprocessual.tst.jus.br/" },
  "6.00": { sigla: "TSE", nome: "Tribunal Superior Eleitoral", endpoint: "api_publica_tse", consulta: "https://consultaunificadapje.tse.jus.br/" },
  "7.00": { sigla: "STM", nome: "Superior Tribunal Militar", endpoint: "api_publica_stm", consulta: "https://eproc2g.stm.jus.br/eproc_2g_prod/externo_controlador.php?acao=processo_consulta_publica" }
};

// ==========================================
// 🛠️ FUNÇÕES AUXILIARES
// ==========================================
function limparNumero(numero) { return String(numero || "").replace(/\D/g, ""); }

function formatarNumeroCNJ(n) {
  if (n.length !== 20) return n;
  return `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}`;
}

function chaveTribunal(numeroLimpo) {
  if (numeroLimpo.length !== 20) return null;
  const segmento = numeroLimpo.substring(13, 14);
  const tribunal = numeroLimpo.substring(14, 16);
  if (["1", "2", "3", "4", "5", "6", "7"].includes(segmento) && tribunal === "00") return `${segmento}.00`;
  return `${segmento}.${tribunal}`;
}

function linkJusbrasil(numeroFormatado) { return `https://www.jusbrasil.com.br/processos/busca?q=${encodeURIComponent(numeroFormatado)}`; }

// 🧠 INTELIGÊNCIA: CLASSIFICAÇÃO DA MOVIMENTAÇÃO
function classificarAndamento(texto = "") {
  const t = texto.toLowerCase();
  let origem = "Não identificada (Pode ser petição interna ou documento genérico)";
  if (t.includes("réplica") || t.includes("inicial") || t.includes("emenda") || t.includes("agravo") || t.includes("apelação") || t.includes("cumprimento de sentença") || t.includes("requerimento")) {
    origem = "AUTOR (Polo Ativo)";
  } else if (t.includes("contestação") || t.includes("contrarrazões") || t.includes("impugnação") || t.includes("defesa") || t.includes("exceção")) {
    origem = "RÉU (Polo Passivo)";
  } else if (t.includes("sentença") || t.includes("decisão") || t.includes("despacho") || t.includes("intimação") || t.includes("concluso") || t.includes("pauta") || t.includes("expedição") || t.includes("certidão") || t.includes("citação") || t.includes("audiência")) {
    origem = "TRIBUNAL (Juiz / Cartório)";
  }

  let tipo = "movimentação processual comum";
  let providencia = "Acompanhamento de rotina.";

  if (t.includes("sentença") || t.includes("julgado")) {
    tipo = "decisão/sentença";
    providencia = "Verificar teor integral da decisão e analisar prazo recursal.";
  } else if (t.includes("intimação") || t.includes("prazo") || t.includes("vista")) {
    tipo = "intimação ou abertura de prazo";
    providencia = "Atenção ao prazo processual! Consultar sistema do tribunal urgente.";
  } else if (t.includes("concluso")) {
    tipo = "processo aguardando juiz";
    providencia = "Aguardar despacho ou sentença do juiz.";
  } else if (t.includes("audiência")) {
    tipo = "marcação de audiência";
    providencia = "Verificar data/horário e orientar o cliente.";
  }

  return { tipo, origem_movimentacao: origem, providencia };
}

// ==========================================
// 🚀 MOTORES DE BUSCA
// ==========================================

// --- MOTOR 1: BASE DATAJUD (CNJ) ---
async function buscarCNJ(tribunal, numeroLimpo) {
  try {
    const token = process.env.DATAJUD_API_KEY || "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
    const url = `https://api-publica.datajud.cnj.jus.br/${tribunal.endpoint}/_search`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `APIKey ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: numeroLimpo } } })
    });

    if (!response.ok) return { encontrado: false };
    const data = await response.json();
    const p = data?.hits?.hits?.[0]?._source;
    if (!p) return { encontrado: false };

    let autor = "Não informado";
    let reu = "Não informado";

    // Mapeamento à prova de falhas: procura os nomes direto na raiz ou no array de polos
    if (p.poloAtivo && p.poloAtivo.length > 0) {
      autor = p.poloAtivo[0].pessoa?.nome || p.poloAtivo[0].nome || autor;
    } else if (p.polos) {
      const poloA = p.polos.find(polo => polo.polo === "ATIVO" || polo.polo === "AT");
      if (poloA && poloA.partes && poloA.partes.length > 0) {
         autor = poloA.partes[0].pessoa?.nome || poloA.partes[0].nome || autor;
      }
    }
    
    if (p.poloPassivo && p.poloPassivo.length > 0) {
      reu = p.poloPassivo[0].pessoa?.nome || p.poloPassivo[0].nome || reu;
    } else if (p.polos) {
      const poloP = p.polos.find(polo => polo.polo === "PASSIVO" || polo.polo === "PA");
      if (poloP && poloP.partes && poloP.partes.length > 0) {
         reu = poloP.partes[0].pessoa?.nome || poloP.partes[0].nome || reu;
      }
    }

    const movs = [...(p.movimentos || [])].sort((a,b) => new Date(b.dataHora || 0) - new Date(a.dataHora || 0));
    
    return {
      encontrado: true,
      fonte: "DataJud / CNJ",
      autor: autor,
      reu: reu,
      ultimo_andamento: movs[0]?.nome || movs[0]?.descricao || "Movimentação registrada sem descrição.",
      data_movimentacao_raw: movs[0]?.dataHora || null
    };
  } catch (e) { 
    return { encontrado: false }; 
  }
}

// --- MOTOR 2: BASE ESCAVADOR ---
async function buscarEscavador(numeroFormatado) {
  try {
    const token = process.env.ESCAVADOR_API_KEY;
    if (!token) return { encontrado: false }; // Se não tiver a chave, ele ignora com segurança

    const response = await fetch(`https://api.escavador.com/api/v2/processos/numero_cnj/${numeroFormatado}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}`, "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/json" }
    });

    if (!response.ok) return { encontrado: false };
    const data = await response.json();
    const p = data?.items?.[0];
    if (!p) return { encontrado: false };

    // No Escavador, os nomes podem vir no título principal...
    let autor = p.titulo_polo_ativo || "Não informado";
    let reu = p.titulo_polo_passivo || "Não informado";

    // ...ou escondidos na aba de envolvidos
    if (autor === "Não informado" || reu === "Não informado") {
      const envolvidos = p.envolvidos || [];
      if (autor === "Não informado") {
         const envA = envolvidos.find(e => e.polo === "ATIVO" || e.tipo?.toLowerCase().includes("autor") || e.tipo?.toLowerCase().includes("requerente"));
         if (envA) autor = envA.nome;
      }
      if (reu === "Não informado") {
         const envR = envolvidos.find(e => e.polo === "PASSIVO" || e.tipo?.toLowerCase().includes("reu") || e.tipo?.toLowerCase().includes("requerido"));
         if (envR) reu = envR.nome;
      }
    }

    const f = p.fontes?.[0] || {};
    const mov = f.movimentacoes?.[0] || {};

    return {
      encontrado: true,
      fonte: "API Escavador",
      autor: autor,
      reu: reu,
      ultimo_andamento: mov.conteudo || mov.tipo || "Sem descrição processual.",
      data_movimentacao_raw: mov.data || null
    };
  } catch (e) { 
    return { encontrado: false }; 
  }
}

// ==========================================
// 🔄 PROCESSADOR PRINCIPAL E ROTAS
// ==========================================
async function processarConsulta(numeroRecebido, res) {
  const numLimpo = limparNumero(numeroRecebido);
  const numFmt = formatarNumeroCNJ(numLimpo);

  if (!numeroRecebido || numLimpo.length !== 20) {
    return res.status(400).json({ encontrado: false, erro: "Número de processo inválido. Padrão exigido: 20 dígitos CNJ." });
  }

  const chave = chaveTribunal(numLimpo);
  const tribunal = TRIBUNAIS[chave];

  if (!tribunal) {
    return res.json({ encontrado: false, mensagem: "Tribunal não identificado." });
  }

  const [resCNJ, resEscavador] = await Promise.all([
    buscarCNJ(tribunal, numLimpo),
    buscarEscavador(numFmt)
  ]);
  
  let resultados = [];
  if (resCNJ.encontrado) resultados.push(resCNJ);
  if (resEscavador.encontrado) resultados.push(resEscavador);

  if (resultados.length === 0) {
    return res.json({ 
      encontrado: false, 
      numero_processo: numFmt,
      mensagem: "Processo não localizado ou em segredo absoluto."
    });
  }

  // 🔥 LÓGICA DE FUSÃO INTELIGENTE 🔥
  let nomeAutor = "Não informado";
  let nomeReu = "Não informado";

  // 1. Tenta pegar do Escavador primeiro (melhor em achar nomes)
  if (resEscavador.encontrado) {
     if (resEscavador.autor !== "Não informado") nomeAutor = resEscavador.autor;
     if (resEscavador.reu !== "Não informado") nomeReu = resEscavador.reu;
  }
  // 2. Se continuar vazio, tenta preencher com o CNJ
  if (resCNJ.encontrado) {
     if (nomeAutor === "Não informado" && resCNJ.autor !== "Não informado") nomeAutor = resCNJ.autor;
     if (nomeReu === "Não informado" && resCNJ.reu !== "Não informado") nomeReu = resCNJ.reu;
  }

  // Pega a movimentação MAIS RECENTE entre as duas bases
  resultados.sort((a, b) => new Date(b.data_movimentacao_raw || 0) - new Date(a.data_movimentacao_raw || 0));
  const vencedor = resultados[0];
  
  const classe = classificarAndamento(vencedor.ultimo_andamento);

  return res.json({
    encontrado: true,
    numero_processo: numFmt,
    tribunal: tribunal.nome,
    base_de_dados_utilizada: vencedor.fonte + (resEscavador.encontrado ? " (Fusão de Dados)" : ""),
    partes: {
      autor: nomeAutor,
      reu: nomeReu
    },
    dados_da_movimentacao: {
      data_registro: vencedor.data_movimentacao_raw,
      tipo_da_movimentacao: classe.tipo,
      texto_do_andamento: vencedor.ultimo_andamento,
      quem_fez_o_movimento: classe.origem_movimentacao
    },
    resumo_explicativo: `Trata-se de um processo entre ${nomeAutor} (Autor) e ${nomeReu} (Réu). A última atualização ocorreu em ${vencedor.data_movimentacao_raw}, feita por: ${classe.origem_movimentacao}.`,
    providencia_recomendada: classe.providencia
  });
}

// Rotas do Express
app.get("/", (req, res) => res.json({ status: "online" }));
app.get("/consultar-processo", (req, res) => processarConsulta(req.query.numeroProcesso || req.query.numero_processo, res));
app.post("/consultar-processo", (req, res) => processarConsulta(req.body.numeroProcesso || req.body.numero_processo, res));

app.listen(PORT, "0.0.0.0", () => console.log(`Rodando perfeitamente na porta ${PORT}`));
