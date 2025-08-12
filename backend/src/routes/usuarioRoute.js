const express = require("express");
const bcrypt = require("bcrypt");
const oracledb = require("oracledb");
const { getConnection } = require("../config/conection");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const saltRounds = 12;
const router = express.Router();

// Rota para listar utilizadores (método seguro e compatível)
router.get("/", authenticateToken, async (req, res) => {
    // A lógica de paginação e filtro será feita no frontend.
    // O backend agora envia todos os dados de forma otimizada com uma única query.
    let connection;
    try {
        connection = await getConnection();

        // UMA ÚNICA QUERY SIMPLES: Busca todos os utilizadores e os seus perfis.
        const sql = `
            SELECT 
                u.ID_USUARIOS, u.LOGIN_USUARIO, u.NOME_USUARIO, u.EMAIL, u.SETOR_USUARIO, u.ATIVO,
                p.ID_PERFIL, p.NOME_PERFIL
            FROM SIC.USUARIOS u
            LEFT JOIN SIC.USUARIO_PERFIS up ON u.ID_USUARIOS = up.ID_USUARIO
            LEFT JOIN SIC.PERFIS p ON up.ID_PERFIL = p.ID_PERFIL
            ORDER BY u.NOME_USUARIO, p.NOME_PERFIL
        `;

        const result = await connection.execute(sql);

        res.json({
            success: true,
            data: result.rows, // Envia os dados brutos para o frontend processar
        });
    } catch (error) {
        console.error("Erro ao listar utilizadores (método final):", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Rota para criar um novo utilizador
router.post(
    "/",
    authenticateToken,
    requirePermission("GERENCIAR_USUARIOS"),
    async (req, res) => {
        const { login, nome, senha, email, setor, ativo, perfis } = req.body;
        if (
            !login ||
            !nome ||
            !senha ||
            !email ||
            !Array.isArray(perfis) ||
            perfis.length === 0
        ) {
            return res
                .status(400)
                .json({ success: false, message: "Campos obrigatórios em falta." });
        }
        const senhaHash = await bcrypt.hash(senha, saltRounds);
        const sqlInsertUsuario = `
        INSERT INTO SIC.USUARIOS (LOGIN_USUARIO, NOME_USUARIO, SENHA_USUARIO, EMAIL, SETOR_USUARIO, ATIVO)
        VALUES (:login, :nome, :senhaHash, :email, :setor, :ativo)
        RETURNING ID_USUARIOS INTO :new_id
    `;
        let connection;
        try {
            connection = await getConnection();
            const result = await connection.execute(
                sqlInsertUsuario,
                {
                    login,
                    nome,
                    senhaHash,
                    email,
                    setor,
                    ativo,
                    new_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
                },
                { autoCommit: false }
            );
            const novoUsuarioId = result.outBinds.new_id[0];
            const sqlInsertPerfis = `INSERT INTO SIC.USUARIO_PERFIS (ID_USUARIO, ID_PERFIL) VALUES (:id_usuario, :id_perfil)`;
            const bindsPerfis = perfis.map((id_perfil) => ({
                id_usuario: novoUsuarioId,
                id_perfil,
            }));
            await connection.executeMany(sqlInsertPerfis, bindsPerfis);
            await connection.commit();
            res
                .status(201)
                .json({ success: true, message: "Utilizador criado com sucesso!" });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error("Erro ao criar utilizador:", error);
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

// Rota para atualizar um utilizador
router.put(
    "/:id",
    authenticateToken,
    requirePermission("GERENCIAR_USUARIOS"),
    async (req, res) => {
        const { id } = req.params;
        const { nome, email, setor, ativo, perfis, senha } = req.body;
        if (!Array.isArray(perfis) || perfis.length === 0)
            return res
                .status(400)
                .json({
                    success: false,
                    message: "O utilizador deve ter pelo menos um perfil.",
                });

        let connection;
        try {
            connection = await getConnection();
            let sqlUpdateUsuario =
                "UPDATE SIC.USUARIOS SET NOME_USUARIO = :nome, EMAIL = :email, SETOR_USUARIO = :setor, ATIVO = :ativo";
            const bindsUsuario = { id, nome, email, setor, ativo };
            if (senha) {
                const senhaHash = await bcrypt.hash(senha, saltRounds);
                sqlUpdateUsuario += ", SENHA_USUARIO = :senhaHash";
                bindsUsuario.senhaHash = senhaHash;
            }
            sqlUpdateUsuario += " WHERE ID_USUARIOS = :id";
            await connection.execute(sqlUpdateUsuario, bindsUsuario, {
                autoCommit: false,
            });

            await connection.execute(
                `DELETE FROM SIC.USUARIO_PERFIS WHERE ID_USUARIO = :id`,
                { id }
            );
            const sqlInsertPerfis = `INSERT INTO SIC.USUARIO_PERFIS (ID_USUARIO, ID_PERFIL) VALUES (:id_usuario, :id_perfil)`;
            const bindsPerfis = perfis.map((id_perfil) => ({
                id_usuario: id,
                id_perfil,
            }));
            await connection.executeMany(sqlInsertPerfis, bindsPerfis);

            await connection.commit();
            res.json({
                success: true,
                message: "Utilizador atualizado com sucesso!",
            });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error("Erro ao atualizar utilizador:", error);
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

// Rota para apagar um utilizador
router.delete(
    "/:id",
    authenticateToken,
    requirePermission("GERENCIAR_USUARIOS"),
    async (req, res) => {
        const { id } = req.params;
        let connection;
        try {
            connection = await getConnection();
            await connection.execute(
                `DELETE FROM SIC.USUARIO_PERFIS WHERE ID_USUARIO = :id`,
                { id },
                { autoCommit: false }
            );
            const result = await connection.execute(
                `DELETE FROM SIC.USUARIOS WHERE ID_USUARIOS = :id`,
                { id },
                { autoCommit: false }
            );
            await connection.commit();
            if (result.rowsAffected === 0) {
                return res
                    .status(404)
                    .json({ success: false, message: "Utilizador não encontrado." });
            }
            res.json({ success: true, message: "Utilizador apagado com sucesso." });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error("Erro ao apagar utilizador:", error);
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

module.exports = router;
