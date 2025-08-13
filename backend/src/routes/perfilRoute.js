const express = require("express");
const { getConnection } = require("../config/conection");
const { authenticateToken, requirePermission } = require("../middleware/auth");

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
router.post(
    "/",
    authenticateToken,
    requirePermission("GERENCIAR_PERFIS"),
    async (req, res) => {
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
    }
);

// =================================================================
// ROTA DE ATUALIZAÇÃO DE PERFIL (ADICIONADA)
// =================================================================
router.put(
    "/:id",
    authenticateToken,
    requirePermission("GERENCIAR_PERFIS"),
    async (req, res) => {
        const { id } = req.params;
        const { nome_perfil, descricao } = req.body;

        if (!nome_perfil) {
            return res
                .status(400)
                .json({ success: false, message: "O nome do perfil é obrigatório." });
        }

        const sql = `UPDATE SIC.PERFIS SET NOME_PERFIL = :nome_perfil, DESCRICAO = :descricao WHERE ID_PERFIL = :id`;
        let connection;
        try {
            connection = await getConnection();
            const result = await connection.execute(
                sql,
                { id, nome_perfil, descricao },
                { autoCommit: true }
            );

            if (result.rowsAffected === 0) {
                return res
                    .status(404)
                    .json({ success: false, message: "Perfil não encontrado." });
            }

            res.json({ success: true, message: "Perfil atualizado com sucesso!" });
        } catch (error) {
            if (error.errorNum === 1) {
                return res
                    .status(409)
                    .json({ success: false, message: "Este nome de perfil já existe." });
            }
            console.error("Erro ao atualizar perfil:", error);
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

// =================================================================
// ROTA DE EXCLUSÃO DE PERFIL (ADICIONADA)
// =================================================================
router.delete(
    "/:id",
    authenticateToken,
    requirePermission("GERENCIAR_PERFIS"),
    async (req, res) => {
        const { id } = req.params;
        let connection;
        try {
            connection = await getConnection();

            // Antes de excluir o perfil, remova as associações para evitar erros de chave estrangeira
            await connection.execute(
                `DELETE FROM SIC.USUARIO_PERFIS WHERE ID_PERFIL = :id`,
                { id }
            );
            await connection.execute(
                `DELETE FROM SIC.PERFIL_PERMISSOES WHERE ID_PERFIL = :id`,
                { id }
            );

            // Agora, exclua o perfil
            const result = await connection.execute(
                `DELETE FROM SIC.PERFIS WHERE ID_PERFIL = :id`,
                { id }
            );

            await connection.commit();

            if (result.rowsAffected === 0) {
                return res
                    .status(404)
                    .json({ success: false, message: "Perfil não encontrado." });
            }
            res.json({ success: true, message: "Perfil excluído com sucesso." });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error("Erro ao excluir perfil:", error);
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

// --- ROTAS PARA PERMISSÕES ---

// Listar todas as permissões disponíveis
router.get("/permissoes", authenticateToken, async (req, res) => {
    // ... (código existente)
});

// Listar as permissões de um perfil específico
router.get("/:id/permissoes", authenticateToken, async (req, res) => {
    // ... (código existente)
});

// Atualizar as permissões de um perfil
router.put(
    "/:id/permissoes",
    authenticateToken,
    requirePermission("GERENCIAR_PERFIS"),
    async (req, res) => {
        // ... (código existente)
    }
);

module.exports = router;
