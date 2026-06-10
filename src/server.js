const { config } = require("dotenv");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", app: "Groove 🎵" }));

app.use("/api/auth", authRoutes);

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada" }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erro interno" });
});

app.listen(PORT, () => {
  console.log(`\n🎵 Groove rodando em http://localhost:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || "development"}\n`);
});

module.exports = app;
