import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API de consulta processual rodando corretamente."
  });
});

app.post("/consultar-processo", (req, res) => {
  const { numeroProcesso } = req.body;

  if (!numeroProcesso) {
    return res.status(400).json({
      sucesso: false,
      erro: "Informe o número do processo."
    });
  }

  const numeroLimpo = numeroProcesso.replace(/\D/g, "");

  if (numeroLimpo.length !== 20) {
    return res.status(400).json({
      sucesso: false,
      erro: "Número de processo inválido. Informe um número no padrão CNJ."
    });
  }

  const justica = numeroLimpo.substring(13, 14);
  const tribunal = numeroLimpo.substring(14, 16);

  let tribunalIdentificado = "Tribunal não identificado";

  if (justica === "8" && tribunal === "05") {
    tribunalIdentificado = "Tribunal de Justiça do Estado da Bahia - TJBA";
  }

  return res.json({
    sucesso: true,
    numeroProcesso,
    numeroLimpo,
    tribunalIdentificado,
    statusConsulta: "API funcionando em fase inicial",
    ultimoAndamento: "Consulta real ao tribunal ainda não integrada",
    explicacaoSimples:
      "O número do processo foi recebido corretamente pela API. O sistema identificou o tribunal provável pelo padrão CNJ, mas ainda não está conectado à base real do CNJ/DataJud para buscar movimentações processuais.",
    providenciaRecomendada:
      "Realizar, por enquanto, a conferência manual no sistema oficial do tribunal. O próximo passo técnico é integrar esta API à base pública do DataJud/CNJ."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
