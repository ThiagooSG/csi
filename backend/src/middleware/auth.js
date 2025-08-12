const jwt = require('jsonwebtoken');

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "27bb144894f76ea9decc02d38ce854353356dfabc76be00fe5ac3e4c706f9f808b0fcaea5449432368d7437e135cf273bf2c9e90dad10a800f78949c4c20350f580e9fe7b2e0391925b06e6b7db5eda5a5a38833d9901f05f47ccb855f944d3b1e8a42a8595f910c53aa6028d1eb6d06b28060400ca31998f3d741f2ae3089fb63827f645e772c41bec4940a2521b4785268c493e52062e24893d4fbd11e0868e8b2501ccb9aed3518715b570b6e8856bb02f32800f062f762c8aba6d212c1733ecf876fc8b93f0fd0839dc7059d79c495b6ac4af01c9ed6f714a4475fd56543c0d893a8d6226e24a646f00a8f6fe40913d5f790b8d2538ad988db56f375066a";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Middleware para verificar o JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ success: false, message: "Token de acesso requerido" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log("Erro na verificação do token:", err.message);
            return res
                .status(403)
                .json({ success: false, message: "Token inválido ou expirado" });
        }
        // Anexa todo o payload decodificado do token ao objeto req
        req.user = user;
        next();
    });
};

// Função para verificar uma permissão específica
const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        // As permissões estão em req.user.permissoes
        const userPermissions = req.user?.permissoes || [];

        if (userPermissions.includes(requiredPermission)) {
            next(); // Permissão concedida
        } else {
            // Permissão negada
            res.status(403).json({
                success: false,
                message:
                    "Acesso negado. Você não tem permissão para realizar esta ação.",
            });
        }
    };
};

// Funções para gerar e verificar tokens
const generateTokens = (userData) => {
    const payload = {
        id: userData.id,
        login: userData.login,
        nome: userData.nome,
        permissoes: userData.permissoes, // Inclui as permissões no token
        admin: userData.admin,
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    const refreshToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
    return { accessToken, refreshToken };
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error("Token inválido");
    }
};

module.exports = {
    authenticateToken,
    requirePermission, // Exporta a função corrigida
    generateTokens,
    verifyToken,
    JWT_SECRET,
};
