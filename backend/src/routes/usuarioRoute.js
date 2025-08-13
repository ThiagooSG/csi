const express = require("express");
const bcrypt = require("bcrypt");
const oracledb = require("oracledb");
const { getConnection } = require("../config/conection");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const router = express.Router();
const saltRounds = 12;

// ROTA ATUALIZADA COM QUERY DE PAGINAÇÃO CORRIGIDA E ROBUSTA
router.get("/", authenticateToken, async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    let connection;
    try {
        connection = await getConnection();

        let whereClause = "";
        const binds = {};
        if (search) {
            whereClause = `WHERE LOWER(u.NOME_USUARIO) LIKE :searchQuery OR LOWER(u.LOGIN_USUARIO) LIKE :searchQuery`;
            binds.searchQuery = `%${search.toLowerCase()}%`;
        }

        const countSql = `SELECT COUNT(*) AS TOTAL FROM SIC.USUARIOS u ${whereClause}`;
        const countResult = await connection.execute(countSql, binds);
        const totalItems = countResult.rows[0].TOTAL;
        const totalPages = Math.ceil(totalItems / limit);

        // --- CORREÇÃO APLICADA AQUI ---
        // Usando uma subquery com ROWNUM (ou ROW_NUMBER) para garantir a compatibilidade e a ordem correta das cláusulas.
        const startRow = offset + 1;
        const endRow = offset + limit;

        const usersSql = `
            SELECT * FROM (
                SELECT u.ID_USUARIOS, u.LOGIN_USUARIO, u.NOME_USUARIO, u.EMAIL, u.SETOR_USUARIO, u.ATIVO,
                    ROW_NUMBER() OVER (ORDER BY u.NOME_USUARIO) AS RNUM
                FROM SIC.USUARIOS u
                ${whereClause}
            )
            WHERE RNUM BETWEEN :startRow AND :endRow
        `;

        // Adiciona os binds de paginação
        binds.startRow = startRow;
        binds.endRow = endRow;

        const usersResult = await connection.execute(usersSql, binds);
        const usuarios = usersResult.rows;

        if (usuarios.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: { currentPage: page, totalPages, totalItems, limit },
            });
        }

        const userIds = usuarios.map((u) => u.ID_USUARIOS);
        const profilesPlaceholders = userIds.map((_, i) => `:id${i}`).join(",");
        const profilesBinds = {};
        userIds.forEach((id, i) => {
            profilesBinds[`id${i}`] = id;
        });

        const profilesSql = `
            SELECT up.ID_USUARIO, p.ID_PERFIL, p.NOME_PERFIL 
            FROM SIC.USUARIO_PERFIS up 
            JOIN SIC.PERFIS p ON up.ID_PERFIL = p.ID_PERFIL 
            WHERE up.ID_USUARIO IN (${profilesPlaceholders})
        `;
        const profilesResult = await connection.execute(profilesSql, profilesBinds);

        const profilesByUser = new Map();
        for (const profile of profilesResult.rows) {
            if (!profilesByUser.has(profile.ID_USUARIO)) {
                profilesByUser.set(profile.ID_USUARIO, []);
            }
            profilesByUser.get(profile.ID_USUARIO).push(profile);
        }

        const finalUserData = usuarios.map((user) => {
            const userProfiles = profilesByUser.get(user.ID_USUARIOS) || [];
            return {
                ...user,
                SETOR: user.SETOR_USUARIO,
                NOME_PERFIL: userProfiles.map((p) => p.NOME_PERFIL).join(", "),
                ID_PERFIS: userProfiles.map((p) => p.ID_PERFIL),
            };
        });

        res.json({
            success: true,
            data: finalUserData,
            pagination: { currentPage: page, totalPages, totalItems, limit },
        });
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});


// Rota para criar um novo usuário
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
                .json({
                    success: false,
                    message: "Todos os campos obrigatórios devem ser preenchidos.",
                });
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
                .json({ success: true, message: "Usuário criado com sucesso!" });
        } catch (error) {
            if (connection) await connection.rollback();
            if (error.errorNum === 1)
                return res
                    .status(409)
                    .json({ success: false, message: "Login ou e-mail já em uso." });
            console.error("Erro ao criar usuário:", error);
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

// Rota para atualizar um usuário
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
                    message: "O usuário deve ter pelo menos um perfil.",
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
            res.json({ success: true, message: "Usuário atualizado com sucesso!" });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error("Erro ao atualizar usuário:", error);
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

// Rota para excluir um usuário
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
                    .json({ success: false, message: "Usuário não encontrado." });
            }
            res.json({ success: true, message: "Usuário deletado com sucesso." });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error("Erro ao deletar usuário:", error);
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

module.exports = router;
