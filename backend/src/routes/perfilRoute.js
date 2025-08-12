const express = require("express");
const { getConnection } = require("../config/conection");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// --- ROTAS PARA PERFIS ---

// Listar todos os perfis
router.get("/", authenticateToken, async (req, res) => {
    const sql = `SELECT ID_PERFIL, NOME_PERFIL, DESCRICAO FROM SIC.PERFIS ORDER BY NOME_PERFIL`;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Erro ao listar perfis:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Criar um novo perfil
router.post("/", authenticateToken, async (req, res) => {
    const { nome_perfil, descricao } = req.body;
    if (!nome_perfil) {
        return res
            .status(400)
            .json({ success: false, message: "O nome do perfil é obrigatório." });
    }
    const sql = `INSERT INTO SIC.PERFIS (NOME_PERFIL, DESCRICAO) VALUES (:nome_perfil, :descricao)`;
    let connection;
    try {
        connection = await getConnection();
        await connection.execute(
            sql,
            { nome_perfil, descricao },
            { autoCommit: true }
        );
        res
            .status(201)
            .json({ success: true, message: "Perfil criado com sucesso!" });
    } catch (error) {
        if (error.errorNum === 1) {
            return res
                .status(409)
                .json({ success: false, message: "Este nome de perfil já existe." });
        }
        console.error("Erro ao criar perfil:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// --- ROTAS PARA PERMISSÕES ---

// Listar todas as permissões disponíveis
router.get("/permissoes", authenticateToken, async (req, res) => {
    const sql = `SELECT ID_PERMISSAO, NOME_PERMISSAO, DESCRICAO FROM SIC.PERMISSOES ORDER BY NOME_PERMISSAO`;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Erro ao listar permissões:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Listar as permissões de um perfil específico
router.get("/:id/permissoes", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const sql = `SELECT ID_PERMISSAO FROM SIC.PERFIL_PERMISSOES WHERE ID_PERFIL = :id`;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { id });
        // Mapeia para retornar apenas um array de IDs
        const permissoesIds = result.rows.map((row) => row.ID_PERMISSAO);
        res.json({ success: true, data: permissoesIds });
    } catch (error) {
        console.error("Erro ao listar permissões do perfil:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Atualizar as permissões de um perfil
router.put("/:id/permissoes", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { permissoes } = req.body; // Espera um array de IDs de permissão, ex: [1, 5, 12]

    if (!Array.isArray(permissoes)) {
        return res
            .status(400)
            .json({ success: false, message: "Formato de permissões inválido." });
    }

    let connection;
    try {
        connection = await getConnection();
        // 1. Deleta todas as permissões antigas deste perfil
        const deleteSql = `DELETE FROM SIC.PERFIL_PERMISSOES WHERE ID_PERFIL = :id`;
        await connection.execute(deleteSql, { id });

        // 2. Insere as novas permissões
        if (permissoes.length > 0) {
            const insertSql = `INSERT INTO SIC.PERFIL_PERMISSOES (ID_PERFIL, ID_PERMISSAO) VALUES (:id_perfil, :id_permissao)`;
            const binds = permissoes.map((id_permissao) => ({
                id_perfil: id,
                id_permissao,
            }));
            await connection.executeMany(insertSql, binds);
        }

        // Efetiva as transações
        await connection.commit();

        res.json({
            success: true,
            message: "Permissões do perfil atualizadas com sucesso!",
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao atualizar permissões do perfil:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

module.exports = router;
