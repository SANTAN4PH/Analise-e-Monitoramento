const express = require("express");
const cors = require("cors");
const path = require("path");

const leiturasRoutes = require("./routes/leituras.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Servir o frontend que está fora da pasta backend
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

// Rotas da API
app.use("/api/leituras", leiturasRoutes);

// Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Porta correta para local e Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});