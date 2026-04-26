import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY;

app.get("/", (req, res) => {
  res.json({
    status: "API ativa",
    uso: "/consultar-processo?numero_processo=8005761-72.2025.8.05.0004"
  });
});

function limparNumeroProcesso(numero) {
  return String(numero || "").replace(/\D/g, "");
}

function identificarTribunal(numeroLimpo) {
  const segmento = numeroLimpo.substring(13, 14);
  const codigoTribunal = numeroLimpo.substring(14, 16);

  const tribunaisEstaduais = {
    "05": "tjba"
  };

  if (numeroLimpo.length !== 20) {
    return { valido: false };
  }

  if (segmento === "8" && tribunaisEstaduais[codigoTribunal]) {
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
    sigla: null,
    segmento: "Não configurado",
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

  const ultimo = movimentos[movimentos.length - 1];

  return {
    andamento: ultimo.nome || ultimo.descricao || "Movimentação sem descrição detalhada.",
    data: ultimo.dataHora || ultimo.data || null
  };
}

app.get("/consultar-processo", async (req, res) => {
  const numeroOriginal = req.query.numero_processo;
  const numeroLimpo = limparNumeroProcesso(numeroOriginal);

  const identificacao = identificarTribunal(numeroLimpo);

  if (!identificacao.valido) {
    return res.status(400).json({
      encontrado: false,
      numero_processo: numeroOriginal,
      mensagem: "Número do processo inválido ou incompleto."
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
        "Authorization": `ApiKey ${DATAJUD_API_KEY}`
      },
      body: JSON.stringify({
        query: {
          bool: {
            should: [
              { term: { "numeroProcesso.keyword": numeroLimpo } },
              { match: { numeroProcesso: numeroLimpo } }
            ]
          }
        }
      })
    });

    const dados = await resposta.json();
    const processo = dados?.hits?.hits?.[0];

    if (!processo) {
      return res.status(404).json({
        encontrado: false,
        numero_processo: numeroOriginal,
        tribunal_identificado: identificacao.tribunal,
        fonte_consultada: "DataJud/CNJ",
        resumo_formal: "O processo foi identificado como pertencente ao TJBA, mas não foi localizado andamento na base DataJud.",
        explicacao_simples: "O número parece correto, mas a base consultada não trouxe os movimentos do processo neste momento.",
        proximo_passo_provavel: "Consultar manualmente no site do TJBA ou encaminhar ao advogado responsável.",
        necessita_advogado: true
      });
    }

    const ultimo = extrairUltimoAndamento(processo);

    return res.json({
      encontrado: true,
      numero_processo: numeroOriginal,
      numero_limpo: numeroLimpo,
      tribunal_identificado: identificacao.tribunal,
      sigla_tribunal: identificacao.sigla,
      segmento_justica: identificacao.segmento,
      fonte_consultada: "DataJud/CNJ",
      ultimo_andamento: ultimo.andamento,
      data_ultimo_andamento: ultimo.data,
      resumo_formal: `O processo nº ${numeroOriginal} foi localizado na base DataJud/CNJ, vinculado ao ${identificacao.tribunal}. O último andamento identificado foi: ${ultimo.andamento}.`,
      explicacao_simples: "Isso significa que houve movimentação registrada no processo. A interpretação jurídica deve ser confirmada pelo advogado responsável.",
      proximo_passo_provavel: "Aguardar nova movimentação ou confirmar diretamente no sistema do tribunal.",
      necessita_advogado: true
    });

  } catch (erro) {
    return res.status(500).json({
      encontrado: false,
      numero_processo: numeroOriginal,
      erro: "Falha técnica na consulta ao DataJud/CNJ.",
      explicacao_simples: "O sistema tentou consultar o processo, mas não conseguiu acessar a base de dados neste momento.",
      necessita_advogado: true
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
