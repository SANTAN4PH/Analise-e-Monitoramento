const express = require("express");
const router = express.Router();

const db = require("../database/database");

// Buscar últimas leituras
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      id,
      corrente,
      potencia,
      consumo,
      valor_estimado,
      data_hora
    FROM leituras
    ORDER BY id DESC
    LIMIT 20
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar leituras:", err.message);
      return res.status(500).json({
        erro: "Erro ao buscar leituras"
      });
    }

    res.json(rows);
  });
});

// Buscar resumo
router.get("/resumo", (req, res) => {
  const sql = `
    SELECT 
      COALESCE(AVG(corrente), 0) AS corrente_media,
      COALESCE(AVG(potencia), 0) AS potencia_media,
      COALESCE(SUM(consumo), 0) AS consumo_total,
      COALESCE(SUM(valor_estimado), 0) AS valor_total
    FROM leituras
  `;

  db.get(sql, [], (err, row) => {
    if (err) {
      console.error("Erro ao buscar resumo:", err.message);
      return res.status(500).json({
        erro: "Erro ao buscar resumo"
      });
    }

    res.json(row);
  });
});

// Cadastrar nova leitura
router.post("/", (req, res) => {
  const { corrente, potencia, consumo, valor_estimado } = req.body;

  if (corrente === undefined || potencia === undefined) {
    return res.status(400).json({
      erro: "Corrente e potência são obrigatórias"
    });
  }

  const sql = `
    INSERT INTO leituras 
    (corrente, potencia, consumo, valor_estimado)
    VALUES (?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      Number(corrente),
      Number(potencia),
      Number(consumo || 0),
      Number(valor_estimado || 0)
    ],
    function (err) {
      if (err) {
        console.error("Erro ao inserir leitura:", err.message);
        return res.status(500).json({
          erro: "Erro ao inserir leitura"
        });
      }

      res.status(201).json({
        mensagem: "Leitura cadastrada com sucesso",
        id: this.lastID
      });
    }
  );
});

module.exports = router;