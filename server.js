import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DATAJUD_API_KEY =
  process.env.DATAJUD_API_KEY ||
  "cDZHYzIZa0JadVREZDJCendQbXY6SkJTZnjLV9TRENyQk1RdnFKZGRQdw==";
const BASE_DATAJUD = "https://api-publica.datajud.cnj.jus.br";

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
  "8.21": { sigla: "TJRS", nome: "Tribunal de Justiça do Rio Grande do Sul", endpoint: "api_publica_tjrs", consulta: "https://www.tjrs.jus.br/novo/buscas-solr/?aba=jurisprudencia" },
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

  "3.00": { sigla: "STJ", nome: "Superior Tribunal de Justiça", endpoint: "api_publica_stj", consulta: "https://processo.stj.jus.br/processo/pesquisa/" },
  "1.00": { sigla: "STF", nome: "Supremo Tribunal Federal", endpoint: "api_publica_stf", consulta: "https://portal.stf.jus.br/processos/listarProcessos.asp" },
  "6.00": { sigla: "TSE", nome: "Tribunal Superior Eleitoral", endpoint: "api_publica_tse", consulta: "https://consultaunificadapje.tse.jus.br/" },
  "7.00": { sigla: "STM", nome: "Superior Tribunal Militar", endpoint: "api_publica_stm", consulta: "https://eproc2g.stm.jus.br/eproc_2g_prod/externo_controlador.php?acao=processo_consulta_publica" }
};

function limparNumero(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function formatarNumeroCNJ(numeroLimpo) {
  if (numeroLimpo.length !== 20) return numeroLimpo;
  return `${numeroLimpo.slice(0, 7)}-${numeroLimpo.slice(7, 9)}.${numeroLimpo.slice(9, 13)}.${numeroLimpo.slice(13, 14)}.${numeroLimpo.slice(14, 16)}.${numeroLimpo.slice(16, 20)}`;
}

function chaveTribunal(numeroLimpo) {
  if (numeroLimpo.length !== 20) return null;

  const segmento = numeroLimpo.substring(13, 14);
  const tribunal = numeroLimpo.substring(14, 16);

  if (["1", "3", "6", "7"].includes(segmento)) {
    return `${segmento}.00`;
  }

  return `${segmento}.${tribunal}`;
}

function linkJusbrasil(numeroFormatado) {
  return `https://www.jusbrasil.com.br/processos/busca?q=${encodeURIComponent(numeroFormatado)}`;
}

function montarQuery(numeroLimpo) {
  return {
    size: 1,
    query: {
      bool: {
        should: [
          { term: { "numeroProcesso.keyword": numeroLimpo } },
          { term: { numeroProcesso: numeroLimpo } },
          { match: { numeroProcesso: numeroLimpo } }
        ],
        minimum_should_match: 1
      }
    }
  };
}

async function consultarDataJud(tribunal, numeroLimpo) {
  const url = `${BASE_DATAJUD}/${tribunal.endpoint}/_search`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `APIKey ${DATAJUD_API_KEY}`
    },
    body: JSON.stringify(montarQuery(numeroLimpo))
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    processo: data?.hits?.hits?.[0] || null
  };
}

function ordenarMovimentos(movimentos) {
  return [...(movimentos || [])].sort((a, b) => {
    const da = new Date(a.dataHora || a.data || 0).getTime();
    const db = new Date(b.dataHora || b.data || 0).getTime();
    return db - da;
  });
}

function extrairUltimoAndamento(fonte) {
  const movimentos = ordenarMovimentos(fonte?.movimentos || []);
  const ultimo = movimentos[0];

  if (!ultimo) {
    return {
      nome: "Não foi localizado andamento detalhado na base DataJud.",
      data: null
    };
  }

  return {
    nome: ultimo.nome || ultimo.descricao || "Movimentação sem descrição detalhada.",
    data: ultimo.dataHora || ultimo.data || null
  };
}

function classificarAndamento(texto = "") {
  const t = texto.toLowerCase();

  if (t.includes("sentença") || t.includes("julgado")) {
    return {
      tipo: "decisão/sentença",
      risco: "alto",
      providencia: "Verificar teor integral da decisão e eventual prazo recursal imediatamente."
    };
  }

  if (t.includes("intimação") || t.includes("intimado") || t.includes("vista")) {
    return {
      tipo: "intimação/prazo",
      risco: "alto",
      providencia: "Conferir o teor da intimação e controlar o prazo processual."
    };
  }

  if (t.includes("concluso") || t.includes("conclusão")) {
    return {
      tipo: "aguardando análise do juiz",
      risco: "baixo",
      providencia: "Aguardar decisão, mantendo acompanhamento periódico."
    };
  }

  if (t.includes("audiência")) {
    return {
      tipo: "audiência",
      risco: "médio",
      providencia: "Verificar data, horário, modalidade e necessidade de preparação da parte."
    };
  }

  if (t.includes("perícia") || t.includes("pericial")) {
    return {
      tipo: "perícia",
      risco: "médio",
      providencia: "Conferir nomeação, data da perícia e necessidade de manifestação técnica."
    };
  }

  return {
    tipo: "movimentação processual",
    risco: "médio",
    providencia: "Conferir o teor no sistema oficial do tribunal antes de orientar o cliente."
  };
}

async function processarConsulta(numeroRecebido, res) {
  const numeroLimpo = limparNumero(numeroRecebido);
  const numeroFormatado = formatarNumeroCNJ(numeroLimpo);

  if (!numeroRecebido || numeroLimpo.length !== 20) {
    return res.status(400).json({
      encontrado: false,
      erro: "Número de processo inválido. Informe número no padrão CNJ.",
      exemplo: "8005761-72.2025.8.05.0004"
    });
  }

  if (!DATAJUD_API_KEY) {
    return res.status(500).json({
      encontrado: false,
      erro: "DATAJUD_API_KEY não configurada no Railway."
    });
  }

  const chave = chaveTribunal(numeroLimpo);
  const tribunal = TRIBUNAIS[chave];

  if (!tribunal) {
    return res.json({
      encontrado: false,
      numero_processo: numeroFormatado,
      mensagem: "Tribunal ainda não configurado nesta API.",
      links_de_conferencia: {
        jusbrasil: linkJusbrasil(numeroFormatado)
      },
      necessita_advogado: true
    });
  }

  try {
    const resultado = await consultarDataJud(tribunal, numeroLimpo);

    if (!resultado.ok) {
      return res.status(500).json({
        encontrado: false,
        numero_processo: numeroFormatado,
        tribunal_identificado: tribunal.nome,
        erro: "Erro retornado pela base DataJud/CNJ.",
        status_datajud: resultado.status,
        detalhe: resultado.data,
        links_de_conferencia: {
          tribunal_oficial: tribunal.consulta,
          jusbrasil: linkJusbrasil(numeroFormatado)
        },
        necessita_advogado: true
      });
    }

    if (!resultado.processo) {
      return res.json({
        encontrado: false,
        numero_processo: numeroFormatado,
        tribunal_identificado: tribunal.nome,
        sigla_tribunal: tribunal.sigla,
        fonte_primaria: "DataJud/CNJ",
        mensagem: "O processo não foi localizado automaticamente na base pública DataJud/CNJ.",
        explicacao_simples: "Isso pode ocorrer por ausência de indexação, atraso de atualização, restrição de acesso ou divergência entre os dados do tribunal e a base nacional.",
        providencia_recomendada: "Consultar manualmente no sistema oficial do tribunal antes de orientar o cliente.",
        links_de_conferencia: {
          tribunal_oficial: tribunal.consulta,
          jusbrasil: linkJusbrasil(numeroFormatado)
        },
        necessita_advogado: true
      });
    }

    const fonte = resultado.processo._source || {};
    const ultimo = extrairUltimoAndamento(fonte);
    const classificacao = classificarAndamento(ultimo.nome);

    return res.json({
      encontrado: true,
      numero_processo: numeroFormatado,
      numero_limpo: numeroLimpo,
      tribunal_identificado: tribunal.nome,
      sigla_tribunal: tribunal.sigla,
      fonte_primaria: "DataJud/CNJ",
      classe: fonte?.classe?.nome || null,
      grau: fonte?.grau || null,
      orgao_julgador: fonte?.orgaoJulgador?.nome || null,
      data_ajuizamento: fonte?.dataAjuizamento || null,
      assuntos: Array.isArray(fonte?.assuntos) ? fonte.assuntos.map(a => a.nome).filter(Boolean) : [],
      ultimo_andamento: ultimo.nome,
      data_ultimo_andamento: ultimo.data,
      classificacao_andamento: classificacao,
      resumo_formal: `O processo nº ${numeroFormatado} foi localizado na base pública DataJud/CNJ, vinculado ao ${tribunal.nome}. O último andamento identificado foi: ${ultimo.nome}.`,
      explicacao_simples: `Em linguagem simples, o processo teve movimentação registrada como "${ultimo.nome}". A classificação inicial é: ${classificacao.tipo}.`,
      providencia_recomendada: classificacao.providencia,
      links_de_conferencia: {
        tribunal_oficial: tribunal.consulta,
        jusbrasil: linkJusbrasil(numeroFormatado)
      },
      ressalva: "A consulta foi realizada em base pública. Antes de qualquer ato processual, recomenda-se conferência no sistema oficial do tribunal.",
      necessita_advogado: true
    });
  } catch (erro) {
    return res.status(500).json({
      encontrado: false,
      numero_processo: numeroFormatado,
      erro: "Falha técnica na consulta ao DataJud/CNJ.",
      detalhe: erro.message,
      necessita_advogado: true
    });
  }
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API profissional de consulta processual ativa",
    uso_get: "/consultar-processo?numero_processo=5001234-56.2023.8.26.0100",
    uso_post: "POST /consultar-processo com { numeroProcesso: \"5001234-56.2023.8.26.0100\" }"
  });
});

app.get("/consultar-processo", async (req, res) => {
  const numero = req.query.numeroProcesso || req.query.numero_processo;
  return processarConsulta(numero, res);
});

app.post("/consultar-processo", async (req, res) => {
  const numero = req.body.numeroProcesso || req.body.numero_processo;
  return processarConsulta(numero, res);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
