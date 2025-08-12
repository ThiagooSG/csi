const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { getConnection } = require("../config/conection");
const {
    generateTokens,
    authenticateToken,
    verifyToken,
} = require("../middleware/auth");
const { sendPasswordResetEmail } = require("../services/emailService");

const saltRounds = 12;

// Rota de Login
router.post("/login", async (req, res) => {
    const login = req.body.login || req.body.username;
    const senha = req.body.senha || req.body.password;
    if (!login || !senha)
        return res
            .status(400)
            .json({ success: false, message: "Login e senha são obrigatórios" });

    let connection;
    try {
        connection = await getConnection();
        const userResult = await connection.execute(
            `SELECT ID_USUARIOS, LOGIN_USUARIO, NOME_USUARIO, ATIVO, SENHA_USUARIO FROM SIC.USUARIOS WHERE LOGIN_USUARIO = :login AND ATIVO = 1`,
            { login }
        );
        if (userResult.rows.length === 0)
            return res
                .status(401)
                .json({ success: false, message: "Usuário ou senha inválidos." });

        const user = userResult.rows[0];
        const senhaValida = await bcrypt.compare(senha, user.SENHA_USUARIO);
        if (!senhaValida)
            return res
                .status(401)
                .json({ success: false, message: "Usuário ou senha inválidos." });

        const permissionsResult = await connection.execute(
            `SELECT p.NOME_PERMISSAO FROM SIC.PERMISSOES p INNER JOIN SIC.PERFIL_PERMISSOES pp ON p.ID_PERMISSAO = pp.ID_PERMISSAO INNER JOIN SIC.USUARIO_PERFIS up ON pp.ID_PERFIL = up.ID_PERFIL WHERE up.ID_USUARIO = :userId`,
            { userId: user.ID_USUARIOS }
        );
        const permissions = permissionsResult.rows.map((p) => p.NOME_PERMISSAO);

        const userData = {
            id: user.ID_USUARIOS,
            login: user.LOGIN_USUARIO,
            nome: user.NOME_USUARIO,
            ativo: user.ATIVO,
            permissoes: permissions,
            admin: permissions.includes("GERENCIAR_PERFIS") ? 1 : 0,
        };

        const { accessToken, refreshToken } = generateTokens(userData);
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({
            success: true,
            user: userData,
            accessToken,
            message: "Login realizado com sucesso",
        });
    } catch (err) {
        console.error("ERRO NO LOGIN:", err);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor" });
    } finally {
        if (connection) await connection.close();
    }
});

// Rota para solicitar redefinição
router.post("/forgot-password", async (req, res) => {
    const { login: identifier } = req.body;
    if (!identifier)
        return res
            .status(400)
            .json({
                success: false,
                message: "O campo de login ou e-mail é obrigatório.",
            });

    let connection;
    try {
        connection = await getConnection();
        const userResult = await connection.execute(
            `SELECT ID_USUARIOS, EMAIL FROM SIC.USUARIOS WHERE LOGIN_USUARIO = :identifier OR EMAIL = :identifier`,
            { identifier }
        );
        if (userResult.rows.length === 0 || !userResult.rows[0].EMAIL) {
            return res.json({
                success: true,
                message:
                    "Se um usuário com estes dados existir, um e-mail será enviado.",
            });
        }
        const userId = userResult.rows[0].ID_USUARIOS;
        const userEmail = userResult.rows[0].EMAIL;
        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        const tokenExpires = new Date(Date.now() + 3600000);
        await connection.execute(
            `UPDATE SIC.USUARIOS SET RESET_TOKEN = :tokenHash, RESET_TOKEN_EXPIRES = :tokenExpires WHERE ID_USUARIOS = :userId`,
            { tokenHash, tokenExpires, userId },
            { autoCommit: true }
        );
        await sendPasswordResetEmail(userEmail, resetToken);
        res.json({
            success: true,
            message: "Se um usuário com estes dados existir, um e-mail será enviado.",
        });
    } catch (error) {
        console.error("Erro em forgot-password:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Rota para redefinir a senha
router.post("/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { senha } = req.body;
    if (!senha)
        return res
            .status(400)
            .json({ success: false, message: "A nova senha é obrigatória." });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    let connection;
    try {
        connection = await getConnection();
        const userResult = await connection.execute(
            `SELECT ID_USUARIOS FROM SIC.USUARIOS WHERE RESET_TOKEN = :hashedToken AND RESET_TOKEN_EXPIRES > SYSDATE`,
            { hashedToken }
        );
        if (userResult.rows.length === 0)
            return res
                .status(400)
                .json({ success: false, message: "Token inválido ou expirado." });

        const userId = userResult.rows[0].ID_USUARIOS;
        const novaSenhaHash = await bcrypt.hash(senha, saltRounds);
        await connection.execute(
            `UPDATE SIC.USUARIOS SET SENHA_USUARIO = :novaSenhaHash, RESET_TOKEN = NULL, RESET_TOKEN_EXPIRES = NULL WHERE ID_USUARIOS = :userId`,
            { novaSenhaHash, userId },
            { autoCommit: true }
        );
        res.json({ success: true, message: "Senha redefinida com sucesso!" });
    } catch (error) {
        console.error("Erro em reset-password:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Rota para verificar o token
router.get("/verify", authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user, message: "Token válido" });
});

// Rota para renovar o token
router.post("/refresh", (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken)
        return res
            .status(401)
            .json({ success: false, message: "Refresh token não encontrado" });

    try {
        const decoded = verifyToken(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } =
            generateTokens(decoded);
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ success: true, accessToken });
    } catch (error) {
        res.status(403).json({ success: false, message: "Refresh token inválido" });
    }
});

// Rota de Logout
router.post("/logout", (req, res) => {
    res.clearCookie("refreshToken");
    res.json({ success: true, message: "Logout realizado com sucesso" });
});

module.exports = router;
