const { config } = require("dotenv");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const usersRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", app: "Groove 🎵" }));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", usersRoutes);

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada" }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erro interno" });
});

app.listen(PORT, () => {
  console.log(`\nGroove rodando em http://localhost:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || "development"}\n`);
});

module.exports = app;
