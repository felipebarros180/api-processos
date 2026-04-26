import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API rodando corretamente"
  });
});

app.post("/consultar-processo", (req, res) => {
  const { numeroProcesso } = req.body;

  if (!numeroProcesso) {
    return res.status(400).json({
      erro: "Informe o número do processo"
    });
  }

  return res.json({
    numeroProcesso,
    mensagem: "Consulta recebida com sucesso"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
