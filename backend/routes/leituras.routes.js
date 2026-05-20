const express = require("express");
const router = express.Router();

const db = require("../database/database");

// Configurações iniciais do cálculo
const TENSAO_PADRAO = 127;
const FATOR_POTENCIA_PADRAO = 0.92;
const TARIFA_KWH = 0.95;
const INTERVALO_SEGUNDOS = 5;

// Salvar leitura enviada pelo ESP32
router.post("/", (req, res) => {
  const { corrente } = req.body;

  const correnteNumero = Number(corrente);

  if (
    corrente === undefined ||
    corrente === null ||
    isNaN(correnteNumero) ||
    correnteNumero < 0
  ) {
    return res.status(400).json({
      erro: "Campo corrente é obrigatório e deve ser um número positivo."
    });
  }

  const tensao = TENSAO_PADRAO;
  const fatorPotencia = FATOR_POTENCIA_PADRAO;
  const intervaloSegundos = INTERVALO_SEGUNDOS;

  // Potência aparente/corrigida estimada em watts
  const potencia = correnteNumero * tensao * fatorPotencia;

  // Consumo referente ao intervalo da leitura
  const tempoHoras = intervaloSegundos / 3600;
  const consumoKwh = (potencia * tempoHoras) / 1000;

  // Custo estimado daquela leitura
  const valorEstimado = consumoKwh * TARIFA_KWH;

  const sql = `
    INSERT INTO leituras (
      corrente,
      tensao,
      fator_potencia,
      potencia,
      consumo_kwh,
      valor_estimado,
      intervalo_segundos
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    correnteNumero,
    tensao,
    fatorPotencia,
    potencia,
    consumoKwh,
    valorEstimado,
    intervaloSegundos
  ];

  db.run(sql, valores, function (erro) {
    if (erro) {
      console.error("Erro ao salvar leitura:", erro.message);

      return res.status(500).json({
        erro: "Erro ao salvar leitura no banco de dados."
      });
    }

    return res.status(201).json({
      mensagem: "Leitura salva com sucesso.",
      id: this.lastID,
      dados: {
        corrente: Number(correnteNumero.toFixed(3)),
        tensao,
        fator_potencia: fatorPotencia,
        potencia: Number(potencia.toFixed(2)),
        consumo_kwh: Number(consumoKwh.toFixed(8)),
        valor_estimado: Number(valorEstimado.toFixed(6)),
        intervalo_segundos: intervaloSegundos
      }
    });
  });
});

// Listar últimas leituras
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      id,
      corrente,
      tensao,
      fator_potencia,
      potencia,
      consumo_kwh,
      valor_estimado,
      intervalo_segundos,
      criado_em
    FROM leituras
    ORDER BY id DESC
    LIMIT 100
  `;

  db.all(sql, [], (erro, linhas) => {
    if (erro) {
      console.error("Erro ao buscar leituras:", erro.message);

      return res.status(500).json({
        erro: "Erro ao buscar leituras."
      });
    }

    return res.json(linhas);
  });
});

// Resumo geral para o dashboard
router.get("/resumo", (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total_leituras,
      AVG(corrente) AS corrente_media,
      MAX(corrente) AS corrente_maxima,
      AVG(potencia) AS potencia_media,
      MAX(potencia) AS potencia_maxima,
      SUM(consumo_kwh) AS consumo_total_kwh,
      SUM(valor_estimado) AS valor_total_estimado
    FROM leituras
  `;

  db.get(sql, [], (erro, resumo) => {
    if (erro) {
      console.error("Erro ao gerar resumo:", erro.message);

      return res.status(500).json({
        erro: "Erro ao gerar resumo."
      });
    }

    return res.json({
      total_leituras: resumo.total_leituras || 0,
      corrente_media: Number((resumo.corrente_media || 0).toFixed(3)),
      corrente_maxima: Number((resumo.corrente_maxima || 0).toFixed(3)),
      potencia_media: Number((resumo.potencia_media || 0).toFixed(2)),
      potencia_maxima: Number((resumo.potencia_maxima || 0).toFixed(2)),
      consumo_total_kwh: Number((resumo.consumo_total_kwh || 0).toFixed(6)),
      valor_total_estimado: Number((resumo.valor_total_estimado || 0).toFixed(2)),
      tarifa_kwh: TARIFA_KWH,
      tensao_padrao: TENSAO_PADRAO,
      fator_potencia_padrao: FATOR_POTENCIA_PADRAO
    });
  });
});

module.exports = router;