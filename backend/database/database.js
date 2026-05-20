const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "wattwise.db");

const db = new sqlite3.Database(dbPath, (erro) => {
  if (erro) {
    console.error("Erro ao conectar ao banco de dados:", erro.message);
  } else {
    console.log("Banco de dados conectado com sucesso.");
    console.log("Arquivo:", dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS leituras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corrente REAL NOT NULL,
      tensao REAL NOT NULL DEFAULT 127,
      fator_potencia REAL NOT NULL DEFAULT 0.92,
      potencia REAL NOT NULL DEFAULT 0,
      consumo_kwh REAL NOT NULL DEFAULT 0,
      valor_estimado REAL NOT NULL DEFAULT 0,
      intervalo_segundos INTEGER NOT NULL DEFAULT 5,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (erro) => {
    if (erro) {
      console.error("Erro ao criar tabela leituras:", erro.message);
    } else {
      console.log("Tabela leituras pronta para uso.");
    }
  });

  // Correção para quem já tinha criado a tabela antiga apenas com corrente.
  // Se as colunas já existirem, o SQLite vai retornar erro, mas não prejudica o sistema.
  const colunasExtras = [
    "ALTER TABLE leituras ADD COLUMN tensao REAL NOT NULL DEFAULT 127",
    "ALTER TABLE leituras ADD COLUMN fator_potencia REAL NOT NULL DEFAULT 0.92",
    "ALTER TABLE leituras ADD COLUMN potencia REAL NOT NULL DEFAULT 0",
    "ALTER TABLE leituras ADD COLUMN consumo_kwh REAL NOT NULL DEFAULT 0",
    "ALTER TABLE leituras ADD COLUMN valor_estimado REAL NOT NULL DEFAULT 0",
    "ALTER TABLE leituras ADD COLUMN intervalo_segundos INTEGER NOT NULL DEFAULT 5"
  ];

  colunasExtras.forEach((sql) => {
    db.run(sql, (erro) => {
      if (erro) {
        // Ignora erro de coluna duplicada
        if (!erro.message.includes("duplicate column name")) {
          console.error("Erro ao atualizar tabela:", erro.message);
        }
      }
    });
  });
});

module.exports = db;