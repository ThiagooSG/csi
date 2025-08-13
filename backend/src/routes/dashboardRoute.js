const express = require("express");
const { getConnection } = require("../config/conection");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Endpoint para buscar os dados consolidados para os gráficos do dashboard
router.get("/financeiro", authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const summarySql = `
            SELECT 
                -- Títulos a Vencer (Receber)
                SUM(CASE WHEN VENC_REAL = TRUNC(SYSDATE) THEN VALOR_DUP ELSE 0 END) AS A_VENCER_HOJE,
                SUM(CASE WHEN VENC_REAL = TRUNC(SYSDATE) + 1 THEN VALOR_DUP ELSE 0 END) AS A_VENCER_1_DIA,
                SUM(CASE WHEN VENC_REAL BETWEEN TRUNC(SYSDATE) + 2 AND TRUNC(SYSDATE) + 3 THEN VALOR_DUP ELSE 0 END) AS A_VENCER_3_DIAS,
                SUM(CASE WHEN VENC_REAL BETWEEN TRUNC(SYSDATE) + 4 AND TRUNC(SYSDATE) + 5 THEN VALOR_DUP ELSE 0 END) AS A_VENCER_5_DIAS,
                SUM(CASE WHEN VENC_REAL BETWEEN TRUNC(SYSDATE) + 6 AND TRUNC(SYSDATE) + 10 THEN VALOR_DUP ELSE 0 END) AS A_VENCER_10_DIAS,
                
                -- Títulos Vencidos (Receber)
                SUM(CASE WHEN VENC_REAL = TRUNC(SYSDATE) - 1 THEN VALOR_DUP ELSE 0 END) AS VENCIDOS_1_DIA,
                SUM(CASE WHEN VENC_REAL BETWEEN TRUNC(SYSDATE) - 3 AND TRUNC(SYSDATE) - 2 THEN VALOR_DUP ELSE 0 END) AS VENCIDOS_3_DIAS,
                SUM(CASE WHEN VENC_REAL BETWEEN TRUNC(SYSDATE) - 5 AND TRUNC(SYSDATE) - 4 THEN VALOR_DUP ELSE 0 END) AS VENCIDOS_5_DIAS,
                SUM(CASE WHEN VENC_REAL BETWEEN TRUNC(SYSDATE) - 10 AND TRUNC(SYSDATE) - 6 THEN VALOR_DUP ELSE 0 END) AS VENCIDOS_10_DIAS,
                
                -- Títulos a Pagar
                SUM(CASE WHEN IES_PAG_REC = 'P' AND VENC_REAL = TRUNC(SYSDATE) THEN VALOR_DUP ELSE 0 END) AS A_PAGAR_HOJE,
                SUM(CASE WHEN IES_PAG_REC = 'P' AND VENC_REAL = TRUNC(SYSDATE) + 1 THEN VALOR_DUP ELSE 0 END) AS A_PAGAR_1_DIA,
                SUM(CASE WHEN IES_PAG_REC = 'P' AND VENC_REAL BETWEEN TRUNC(SYSDATE) + 2 AND TRUNC(SYSDATE) + 3 THEN VALOR_DUP ELSE 0 END) AS A_PAGAR_3_DIAS,
                SUM(CASE WHEN IES_PAG_REC = 'P' AND VENC_REAL BETWEEN TRUNC(SYSDATE) + 4 AND TRUNC(SYSDATE) + 5 THEN VALOR_DUP ELSE 0 END) AS A_PAGAR_5_DIAS,
                SUM(CASE WHEN IES_PAG_REC = 'P' AND VENC_REAL BETWEEN TRUNC(SYSDATE) + 6 AND TRUNC(SYSDATE) + 10 THEN VALOR_DUP ELSE 0 END) AS A_PAGAR_10_DIAS

            FROM SIC.DUPLICAT
            WHERE IES_SITUACAO = 'A'
        `;

        const result = await connection.execute(summarySql);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard financeiro:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Endpoint para buscar os detalhes (duplicatas) de uma categoria clicada no gráfico
router.get(
    "/financeiro/detalhes/:categoria",
    authenticateToken,
    async (req, res) => {
        const { categoria } = req.params;
        let connection;

        try {
            connection = await getConnection();
            let whereClause = "";

            switch (categoria) {
                // A Vencer
                case "a_vencer_hoje":
                    whereClause = "VENC_REAL = TRUNC(SYSDATE) AND IES_PAG_REC = 'R'";
                    break;
                case "a_vencer_1_dia":
                    whereClause = "VENC_REAL = TRUNC(SYSDATE) + 1 AND IES_PAG_REC = 'R'";
                    break;
                case "a_vencer_3_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) + 2 AND TRUNC(SYSDATE) + 3 AND IES_PAG_REC = 'R'";
                    break;
                case "a_vencer_5_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) + 4 AND TRUNC(SYSDATE) + 5 AND IES_PAG_REC = 'R'";
                    break;
                case "a_vencer_10_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) + 6 AND TRUNC(SYSDATE) + 10 AND IES_PAG_REC = 'R'";
                    break;
                // Vencidos
                case "vencidos_1_dia":
                    whereClause = "VENC_REAL = TRUNC(SYSDATE) - 1 AND IES_PAG_REC = 'R'";
                    break;
                case "vencidos_3_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) - 3 AND TRUNC(SYSDATE) - 2 AND IES_PAG_REC = 'R'";
                    break;
                case "vencidos_5_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) - 5 AND TRUNC(SYSDATE) - 4 AND IES_PAG_REC = 'R'";
                    break;
                case "vencidos_10_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) - 10 AND TRUNC(SYSDATE) - 6 AND IES_PAG_REC = 'R'";
                    break;
                // A Pagar
                case "a_pagar_hoje":
                    whereClause = "VENC_REAL = TRUNC(SYSDATE) AND IES_PAG_REC = 'P'";
                    break;
                case "a_pagar_1_dia":
                    whereClause = "VENC_REAL = TRUNC(SYSDATE) + 1 AND IES_PAG_REC = 'P'";
                    break;
                case "a_pagar_3_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) + 2 AND TRUNC(SYSDATE) + 3 AND IES_PAG_REC = 'P'";
                    break;
                case "a_pagar_5_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) + 4 AND TRUNC(SYSDATE) + 5 AND IES_PAG_REC = 'P'";
                    break;
                case "a_pagar_10_dias":
                    whereClause =
                        "VENC_REAL BETWEEN TRUNC(SYSDATE) + 6 AND TRUNC(SYSDATE) + 10 AND IES_PAG_REC = 'P'";
                    break;
                default:
                    return res
                        .status(400)
                        .json({ success: false, message: "Categoria inválida." });
            }

            const detailsSql = `
            SELECT d.NUM_DOCUM, c.NOME_CLIENTE, d.VALOR_DUP, d.VENC_REAL
            FROM SIC.DUPLICAT d
            LEFT JOIN COMERCIAL.CLIENTE c ON d.COD_CLIENTE = c.CLIENTE
            WHERE d.IES_SITUACAO = 'A' AND ${whereClause}
            ORDER BY d.VENC_REAL, d.VALOR_DUP DESC
        `;

            const result = await connection.execute(detailsSql);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error(
                `Erro ao buscar detalhes para categoria ${categoria}:`,
                error
            );
            res
                .status(500)
                .json({ success: false, message: "Erro interno do servidor." });
        } finally {
            if (connection) await connection.close();
        }
    }
);

module.exports = router;
