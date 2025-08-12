const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const loginRoute = require("./routes/loginRoute");
const comissaoFiosRoute = require("./routes/comissaoFiosRoute");
const comissaoRoute = require("./routes/comissaoRoute");
const portadorRoute = require("./routes/portadorRoute");
const usuarioRoute = require("./routes/usuarioRoute");
const perfilRoute = require("./routes/perfilRoute");

const app = express();

// Middlewares
app.use(cookieParser()); // Para trabalhar com cookies

app.use(
    cors({
        origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://10.10.2.141:5173"], 
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true, // Importante para cookies
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
        cookies: req.cookies,
    });
    next();
});

// Rotas
app.use("/api/auth", loginRoute);
app.use("/api/comissao-fios", comissaoFiosRoute);
app.use("/api/comissao", comissaoRoute);
app.use("/api/portador", portadorRoute);
app.use("/api/usuarios", usuarioRoute);
app.use("/api/perfis", perfilRoute);

// Rota de teste
app.get("/test", (req, res) => {
    res.json({ message: "API está funcionando!" });
});

// Rota protegida de exemplo
app.get(
    "/api/protected",
    require("./middleware/auth").authenticateToken,
    (req, res) => {
        res.json({
            message: "Acesso autorizado!",
            user: req.user,
        });
    }
);

// Log das rotas registradas
console.log("Rotas registradas:");
app._router.stack.forEach(function (r) {
    if (r.route && r.route.path) {
        console.log(
            `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`
        );
    }
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
    console.log(`Rota não encontrada: ${req.method} ${req.path}`);
    res.status(404).json({ mensagem: "Rota não encontrada" });
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
