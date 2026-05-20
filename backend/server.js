const express = require("express");
const cors = require("cors");

const leiturasRoutes = require("./routes/leituras.routes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensagem: "API WattWise funcionando.",
    rotas: {
      leituras: "/leituras",
      resumo: "/leituras/resumo"
    }
  });
});

app.use("/leituras", leiturasRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log("====================================");
  console.log("Servidor WattWise iniciado");
  console.log(`Rodando em: http://localhost:${PORT}`);
  console.log(`Rota de teste: http://localhost:${PORT}/`);
  console.log(`Rota de leituras: http://localhost:${PORT}/leituras`);
  console.log(`Rota de resumo: http://localhost:${PORT}/leituras/resumo`);
  console.log("Aguardando dados do ESP32...");
  console.log("====================================");
});