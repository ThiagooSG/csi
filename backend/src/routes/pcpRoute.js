const express = require("express");
const { getConnection } = require("../config/conection");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// ENDPOINT PARA A LISTA PAGINADA DE PEDIDOS (USANDO A VIEW)
router.get("/", authenticateToken, async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    let connection;
    try {
        connection = await getConnection();

        const countSql = `SELECT COUNT(*) AS TOTAL FROM comercial.vw_sgt_pedido_pendente`;
        const countResult = await connection.execute(countSql);
        const totalItems = countResult.rows[0].TOTAL;
        const totalPages = Math.ceil(totalItems / limit);

        const dataSql = `
            SELECT * FROM (
                SELECT 
                    pedido_cic,
                    nome_cliente,
                    data_pedido,
                    status,
                    ROW_NUMBER() OVER (ORDER BY data_pedido DESC, pedido_cic DESC) AS RNUM
                FROM comercial.vw_sgt_pedido_pendente
            )
            WHERE RNUM BETWEEN :startRow AND :endRow
        `;

        const result = await connection.execute(dataSql, {
            startRow: offset + 1,
            endRow: offset + limit,
        });

        res.json({
            success: true,
            data: result.rows,
            pagination: { currentPage: page, totalPages, totalItems, limit },
        });
    } catch (error) {
        console.error("Erro ao listar pedidos do PCP:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// ENDPOINT PARA OS DETALHES DE UM PEDIDO ESPECÍFICO (USANDO A VIEW)
router.get("/:pedido_cic", authenticateToken, async (req, res) => {
    const { pedido_cic } = req.params;
    let connection;
    try {
        connection = await getConnection();

        const detailSql = `SELECT * FROM comercial.vw_sgt_pedido_pendente WHERE pedido_cic = :pedido_cic`;

        const result = await connection.execute(detailSql, { pedido_cic });

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Pedido não encontrado." });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(`Erro ao buscar detalhes do pedido ${pedido_cic}:`, error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

module.exports = router;
