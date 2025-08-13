const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// 1. Importação de todas as rotas
const loginRoute = require("./routes/loginRoute");
const comissaoFiosRoute = require("./routes/comissaoFiosRoute");
const comissaoRoute = require("./routes/comissaoRoute");
const portadorRoute = require("./routes/portadorRoute");
const usuarioRoute = require("./routes/usuarioRoute");
const perfilRoute = require("./routes/perfilRoute");
const dashboardRoute = require("./routes/dashboardRoute"); // Rota do dashboard importada

// 2. Inicialização do Express
const app = express();

// 3. Middlewares
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://10.10.2.141:5174",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Log para debug
app.use((req, res, next) => {
  console.log({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    body: req.body,
  });
  next();
});

// 4. Registro de todas as rotas
app.use("/api/auth", loginRoute);
app.use("/api/comissao-fios", comissaoFiosRoute);
app.use("/api/comissao", comissaoRoute);
app.use("/api/portador", portadorRoute);
app.use("/api/usuarios", usuarioRoute);
app.use("/api/perfis", perfilRoute);
app.use("/api/dashboard", dashboardRoute); // Rota do dashboard registrada no local correto

// Rota de teste
app.get("/test", (req, res) => {
  res.json({ message: "API está funcionando!" });
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  console.log(`Rota não encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ mensagem: "Rota não encontrada" });
});

// 5. Inicialização do servidor
const PORT = process.env.PORT || 3010;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
