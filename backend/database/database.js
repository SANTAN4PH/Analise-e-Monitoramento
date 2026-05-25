const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "wattwise.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco SQLite:", err.message);
  } else {
    console.log("Conectado ao banco SQLite:", dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS leituras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corrente REAL NOT NULL,
      potencia REAL NOT NULL,
      consumo REAL DEFAULT 0,
      valor_estimado REAL DEFAULT 0,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;