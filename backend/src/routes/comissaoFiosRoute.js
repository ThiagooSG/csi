const express = require("express");
const { getConnection } = require("../config/conection");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Função para normalizar duplicatas (remove espaços, força string)
function normaliza(dup) {
    return dup ? dup.toString().trim() : '';
}

// Rota para pesquisar múltiplas duplicatas (consulta)
router.post("/pesquisar", authenticateToken, async (req, res) => {
    const { duplicatas } = req.body;

    if (!duplicatas || !Array.isArray(duplicatas) || duplicatas.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Lista de duplicatas é obrigatória"
        });
    }

    // Limpar e filtrar duplicatas
    const duplicatasLimpas = duplicatas
        .map(normaliza)
        .filter(dup => dup.length > 0);

    if (duplicatasLimpas.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Nenhuma duplicata válida fornecida"
        });
    }

    // Monta placeholders dinâmicos para a query
    const placeholders = duplicatasLimpas.map((_, i) => `:dup${i}`).join(", ");

    const sql = `
        SELECT 
            TRIM(d.NUM_DOCUM) AS NUM_DOCUM,
            d.COD_EMPRESA,
            c.NOME_CLIENTE,
            d.COD_REPRES_1,
            r1.RAZ_SOCIAL AS Nome_Representante_1,
            d.PCT_COMIS_1
        FROM 
            logix.DOCUM d
        LEFT JOIN
            logix.REPRESENTANTE r1 ON r1.COD_REPRES = d.COD_REPRES_1
        LEFT JOIN
            COMERCIAL.CLIENTE c ON d.COD_CLIENTE = c.CLIENTE
        WHERE 
            TRIM(d.NUM_DOCUM) IN (${placeholders})
        ORDER BY d.NUM_DOCUM
    `;

    let connection;
    try {
        connection = await getConnection();

        // Prepara binds para as duplicatas
        const binds = {};
        duplicatasLimpas.forEach((dup, i) => {
            binds[`dup${i}`] = dup;
        });

        const result = await connection.execute(sql, binds);

        const duplicatasResult = (result.rows || []).map(row => ({
            num_docum: normaliza(row.NUM_DOCUM),
            cod_empresa: row.COD_EMPRESA || '-',
            nome_cliente: row.NOME_CLIENTE || '-',
            cod_repres_1: row.COD_REPRES_1 || '-',
            nome_representante_1: row.NOME_REPRESENTANTE_1 || '-',
            pct_comis_1: row.PCT_COMIS_1 || '-'
        }));

        // Normaliza ambos os lados para comparação
        const duplicatasEncontradas = duplicatasResult.map(d => normaliza(d.num_docum));
        const duplicatasNaoEncontradas = duplicatasLimpas.filter(
            d => !duplicatasEncontradas.includes(normaliza(d))
        );

        res.json({
            success: true,
            rows: duplicatasResult,
            total_pesquisadas: duplicatasLimpas.length,
            total_encontradas: duplicatasResult.length,
            encontradas: duplicatasEncontradas,
            nao_encontradas: duplicatasNaoEncontradas
        });
    } catch (error) {
        console.error("Erro ao pesquisar duplicatas:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Erro ao fechar conexão:", err);
            }
        }
    }
});

// Rota para obter nome do representante
router.get("/representante/:codigo", authenticateToken, async (req, res) => {
    const { codigo } = req.params;

    const sql = `
        SELECT RAZ_SOCIAL 
        FROM logix.REPRESENTANTE 
        WHERE COD_REPRES = :codigo
    `;

    let connection;
    try {
        connection = await getConnection();

        const result = await connection.execute(sql, { codigo });

        if (result.rows && result.rows.length > 0) {
            res.json({
                success: true,
                nome: result.rows[0].RAZ_SOCIAL
            });
        } else {
            res.json({
                success: false,
                message: "Representante não encontrado"
            });
        }

    } catch (error) {
        console.error("Erro ao buscar representante:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Erro ao fechar conexão:", err);
            }
        }
    }
});

// Rota para ajustar comissão de fios (com feedback detalhado)
router.post("/ajustar", authenticateToken, async (req, res) => {
    const { duplicatas, representante, comissao } = req.body;

    if (!duplicatas || !Array.isArray(duplicatas) || duplicatas.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Lista de duplicatas é obrigatória"
        });
    }
    if (!representante) {
        return res.status(400).json({
            success: false,
            message: "Código do representante é obrigatório"
        });
    }
    if (!comissao) {
        return res.status(400).json({
            success: false,
            message: "Percentual de comissão é obrigatório"
        });
    }

    const duplicatasLimpas = duplicatas
        .map(normaliza)
        .filter(dup => dup.length > 0);

    if (duplicatasLimpas.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Nenhuma duplicata válida fornecida"
        });
    }

    const placeholders = duplicatasLimpas.map((_, i) => `:dup${i}`).join(", ");
    const sqlBusca = `
        SELECT TRIM(NUM_DOCUM) AS NUM_DOCUM
        FROM logix.DOCUM
        WHERE TRIM(NUM_DOCUM) IN (${placeholders})
    `;

    let connection;
    try {
        connection = await getConnection();

        const bindsBusca = {};
        duplicatasLimpas.forEach((dup, i) => {
            bindsBusca[`dup${i}`] = dup;
        });

        const resultBusca = await connection.execute(sqlBusca, bindsBusca);
        const encontradas = (resultBusca.rows || []).map(row => normaliza(row.NUM_DOCUM));
        const nao_encontradas = duplicatasLimpas.filter(dup => !encontradas.includes(normaliza(dup)));

        let linhasAfetadas = 0;
        if (encontradas.length > 0) {
            const placeholdersUpdate = encontradas.map((_, i) => `:dupU${i}`).join(", ");
            const sqlUpdate = `
                UPDATE logix.DOCUM
                SET COD_REPRES_1 = :representante,
                    PCT_COMIS_1 = :comissao
                WHERE TRIM(NUM_DOCUM) IN (${placeholdersUpdate})
                    AND COD_EMPRESA = '01'
                    AND IES_TIP_DOCUM = 'DP'
            `;
            const bindsUpdate = {
                representante: representante.toString(),
                comissao: parseFloat(comissao)
            };
            encontradas.forEach((dup, i) => {
                bindsUpdate[`dupU${i}`] = dup;
            });

            const resultUpdate = await connection.execute(sqlUpdate, bindsUpdate, { autoCommit: true });
            linhasAfetadas = resultUpdate.rowsAffected || 0;
        }

        res.json({
            success: true,
            message: `${encontradas.length} duplicata(s) alterada(s) com sucesso.`,
            alteradas: encontradas, // <-- deve ser um array com as duplicatas ajustadas
            nao_encontradas,
            linhas_afetadas: linhasAfetadas,
        });

    } catch (error) {
        console.error("Erro ao ajustar comissão:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
            error: error.message
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Erro ao fechar conexão:", err);
            }
        }
    }
});

module.exports = router;
