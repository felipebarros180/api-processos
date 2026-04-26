import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY;

app.get("/", (req, res) => {
  res.json({
    status: "API ativa",
    uso: "POST /consultar-processo"
  });
});

function limparNumeroProcesso(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function identificarTribunal(numeroLimpo) {
  if (numeroLimpo.length !== 20) {
    return { valido: false };
  }

  const segmento = numeroLimpo.substring(13, 14);
  const codigoTribunal = numeroLimpo.substring(14, 16);

  if (segmento === "8" && codigoTribunal === "05") {
    return {
      valido: true,
      tribunal: "Tribunal de Justiça do Estado da Bahia",
      sigla: "TJBA",
      segmento: "Justiça Estadual",
      endpoint: "https://api-publica.datajud.cnj.jus.br/api_publica_tjba/_search"
    };
  }

  return {
    valido: true,
    tribunal: "Tribunal identificado, mas ainda não configurado",
    endpoint: null
  };
}

function extrairUltimoAndamento(processo) {
  const movimentos = processo?._source?.movimentos || [];

  if (!movimentos.length) {
    return {
      andamento: "Não foi localizado andamento detalhado na base DataJud.",
      data: null
    };
  }

  const ordenados = movimentos.sort((a, b) => {
    return new Date(b.dataHora || b.data || 0) - new Date(a.dataHora || a.data || 0);
  });

  const ultimo = ordenados[0];

  return {
    andamento: ultimo.nome || ultimo.descricao || "Movimentação sem descrição detalhada.",
    data: ultimo.dataHora || ultimo.data || null
  };
}

app.post("/consultar-processo", async (req, res) => {
  const numeroOriginal = req.body.numeroProcesso || req.body.numero_processo;
  const numeroLimpo = limparNumeroProcesso(numeroOriginal);

  const identificacao = identificarTribunal(numeroLimpo);

  if (!identificacao.valido) {
    return res.status(400).json({
      encontrado: false,
      numero_processo: numeroOriginal,
      mensagem: "Número do processo inválido ou incompleto."
    });
  }

  if (!DATAJUD_API_KEY) {
    return res.status(500).json({
      encontrado: false,
      mensagem: "DATAJUD_API_KEY não configurada no Railway."
    });
  }

  if (!identificacao.endpoint) {
    return res.status(400).json({
      encontrado: false,
      numero_processo: numeroOriginal,
      tribunal_identificado: identificacao.tribunal,
      mensagem: "Tribunal ainda não configurado nesta API."
    });
  }

  try {
    const resposta = await fetch(identificacao.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `APIKey ${DATAJUD_API_KEY}`
      },
      body: JSON.stringify({
        query: {
          match: {
            numeroProcesso: numeroLimpo
          }
        }
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json({
        encontrado: false,
        erro: "Erro retornado pelo DataJud/CNJ.",
        status_datajud: resposta.status,
        detalhe: dados
      });
    }

    const processo = dados?.hits?.hits?.[0];

    if (!processo) {
      return res.status(404).json({
        encontrado: false,
        numero_processo: numeroOriginal,
        numero_limpo: numeroLimpo,
        tribunal_identificado: identificacao.tribunal,
        fonte_consultada: "DataJud/CNJ",
        resumo_formal: "O processo foi identificado como pertencente ao TJBA, mas não foi localizado na base DataJud.",
        explicacao_simples: "O número parece correto, mas a base consultada não retornou dados do processo neste momento.",
        proximo_passo_provavel: "Consultar manualmente no sistema oficial do TJBA.",
        necessita_advogado: true
      });
    }

    const fonte = processo._source;
    const ultimo = extrairUltimoAndamento(processo);

    return res.json({
      encontrado: true,
      numero_processo: numeroOriginal,
      numero_limpo: numeroLimpo,
      tribunal_identificado: identificacao.tribunal,
      sigla_tribunal: identificacao.sigla,
      segmento_justica: identificacao.segmento,
      fonte_consultada: "DataJud/CNJ",
      classe: fonte?.classe?.nome || null,
      grau: fonte?.grau || null,
      orgao_julgador: fonte?.orgaoJulgador?.nome || null,
      data_ajuizamento: fonte?.dataAjuizamento || null,
      ultimo_andamento: ultimo.andamento,
      data_ultimo_andamento: ultimo.data,
      resumo_formal: `O processo nº ${numeroOriginal} foi localizado na base DataJud/CNJ, vinculado ao ${identificacao.tribunal}. O último andamento identificado foi: ${ultimo.andamento}.`,
      explicacao_simples: "A consulta retornou dados públicos do DataJud/CNJ. A interpretação jurídica deve ser confirmada pelo advogado responsável antes de qualquer providência processual.",
      proximo_passo_provavel: "Analisar o andamento e conferir o processo no sistema oficial do tribunal.",
      necessita_advogado: true
    });

  } catch (erro) {
    return res.status(500).json({
      encontrado: false,
      numero_processo: numeroOriginal,
      erro: "Falha técnica na consulta ao DataJud/CNJ.",
      detalhe: erro.message,
      necessita_advogado: true
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
