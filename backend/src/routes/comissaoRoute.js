const express = require("express");
const oracledb = require("oracledb");
const { getConnection } = require("../config/conection");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

function getCleanDuplicates(duplicatas) {
    if (!duplicatas || !Array.isArray(duplicatas) || duplicatas.length === 0) {
        return [];
    }
    return duplicatas.map((d) => d.toString().trim()).filter((d) => d.length > 0);
}

// Rota para pesquisar duplicatas
router.post("/pesquisar", authenticateToken, async (req, res) => {
    // Limpa duplicatas (NÃO faz UPPER)
    const duplicatasLimpas = getCleanDuplicates(req.body.duplicatas);

    if (duplicatasLimpas.length === 0) {
        return res
            .status(400)
            .json({ success: false, message: "Nenhuma duplicata válida fornecida." });
    }

    // Cria placeholders e binds
    const placeholders = duplicatasLimpas.map((_, i) => `:dup${i}`).join(", ");
    const binds = {};
    duplicatasLimpas.forEach((dup, i) => {
        binds[`dup${i}`] = dup;
    });

    const sql = `
        SELECT 
            TRIM(d.NUM_DOCUM) AS NUM_DOCUM,
            d.COD_EMPRESA,
            c.NOME_CLIENTE,
            d.COD_PORTADOR,
            d.COD_REPRES_1, r1.RAZ_SOCIAL AS NOME_REPRES_1, d.PCT_COMIS_1,
            d.COD_REPRES_2, r2.RAZ_SOCIAL AS NOME_REPRES_2, d.PCT_COMIS_2,
            d.COD_REPRES_3, r3.RAZ_SOCIAL AS NOME_REPRES_3, d.PCT_COMIS_3
        FROM 
            logix.DOCUM d
        LEFT JOIN logix.REPRESENTANTE r1 ON r1.COD_REPRES = d.COD_REPRES_1
        LEFT JOIN logix.REPRESENTANTE r2 ON r2.COD_REPRES = d.COD_REPRES_2
        LEFT JOIN logix.REPRESENTANTE r3 ON r3.COD_REPRES = d.COD_REPRES_3
        LEFT JOIN COMERCIAL.CLIENTE c ON d.COD_CLIENTE = c.CLIENTE
        LEFT JOIN logix.PORTADOR p ON p.COD_PORTADOR = d.COD_PORTADOR
        WHERE TRIM(d.NUM_DOCUM) IN (${placeholders})
    `;

    let connection;
    try {
        connection = await getConnection();

        console.log("SQL:", sql);
        console.log("BINDS:", binds);

        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        console.log("Resultado da consulta:", result.rows);

        const rows = (result.rows || []).map((row) => ({
            num_docum: row.NUM_DOCUM,
            cod_empresa: row.COD_EMPRESA,
            nome_cliente: row.NOME_CLIENTE,
            cod_portador: row.COD_PORTADOR,
            cod_repres_1: row.COD_REPRES_1,
            nome_repres_1: row.NOME_REPRES_1,
            pct_comis_1: row.PCT_COMIS_1,
            cod_repres_2: row.COD_REPRES_2,
            nome_repres_2: row.NOME_REPRES_2,
            pct_comis_2: row.PCT_COMIS_2,
            cod_repres_3: row.COD_REPRES_3,
            nome_repres_3: row.NOME_REPRES_3,
            pct_comis_3: row.PCT_COMIS_3,
        }));

        const encontradas = rows.map((r) => r.num_docum?.toString().trim());
        const nao_encontradas = duplicatasLimpas.filter(
            (d) => !encontradas.includes(d)
        );

        // MANTENDO A ESTRUTURA ORIGINAL - SEM ENVOLVER EM "data"
        res.json({
            success: true,
            data: { rows }, // Frontend espera response.data.rows
            rows, // Compatibilidade com response.rows
            encontradas,
            nao_encontradas,
        });
    } catch (error) {
        console.error("Erro ao pesquisar duplicatas:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
            error: error.message,
            stack: error.stack,
        });
    } finally {
        if (connection) await connection.close();
    }
});

// Rota para ajustar comissão das duplicatas
router.post("/ajustar", authenticateToken, async (req, res) => {
    const duplicatas = req.body.duplicatas;
    const representantes = req.body.representantes;

    console.log("Dados recebidos para ajuste:", { duplicatas, representantes });

    if (!Array.isArray(duplicatas) || duplicatas.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Nenhuma duplicata enviada para ajuste.",
        });
    }

    if (!Array.isArray(representantes) || representantes.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Nenhum representante enviado para ajuste.",
        });
    }

    // Limpa duplicatas
    const duplicatasLimpas = getCleanDuplicates(duplicatas);
    if (duplicatasLimpas.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Nenhuma duplicata válida fornecida para ajuste.",
        });
    }

    let connection;
    try {
        connection = await getConnection();

        const duplicatasAlteradas = [];
        const duplicatasNaoEncontradas = [];
        let totalLinhasAfetadas = 0;

        // Para cada duplicata, tenta fazer o ajuste
        for (const num_docum of duplicatasLimpas) {
            try {
                // Primeiro verifica se a duplicata existe
                const checkSql = `
                    SELECT COUNT(*) as COUNT_DUP
                    FROM logix.DOCUM
                    WHERE TRIM(NUM_DOCUM) = :num_docum
                `;

                const checkResult = await connection.execute(
                    checkSql,
                    { num_docum },
                    {
                        outFormat: oracledb.OUT_FORMAT_OBJECT,
                    }
                );

                if (checkResult.rows[0].COUNT_DUP === 0) {
                    duplicatasNaoEncontradas.push(num_docum);
                    continue;
                }

                // Monta SET dinâmico baseado nos representantes selecionados
                let setClauses = [];
                let binds = { num_docum };

                representantes.forEach((rep, idx) => {
                    let campo = "";
                    if (rep.tipo === "Representante 1") campo = "PCT_COMIS_1";
                    else if (rep.tipo === "Representante 2") campo = "PCT_COMIS_2";
                    else if (rep.tipo === "Representante 3") campo = "PCT_COMIS_3";

                    if (campo) {
                        setClauses.push(`${campo} = :pct${idx}`);
                        binds[`pct${idx}`] = Number(rep.percentual) || 0;
                    }
                });

                if (setClauses.length === 0) {
                    console.log(
                        `Nenhum campo válido para atualizar na duplicata ${num_docum}`
                    );
                    continue;
                }

                const updateSql = `
                    UPDATE logix.DOCUM
                    SET ${setClauses.join(", ")}
                    WHERE TRIM(NUM_DOCUM) = :num_docum
                `;

                console.log(`Executando UPDATE para ${num_docum}:`, updateSql, binds);

                const updateResult = await connection.execute(updateSql, binds, {
                    autoCommit: false,
                });

                if (updateResult.rowsAffected > 0) {
                    duplicatasAlteradas.push(num_docum);
                    totalLinhasAfetadas += updateResult.rowsAffected;
                } else {
                    duplicatasNaoEncontradas.push(num_docum);
                }
            } catch (dupError) {
                console.error(`Erro ao processar duplicata ${num_docum}:`, dupError);
                duplicatasNaoEncontradas.push(num_docum);
            }
        }

        // Commit das alterações
        await connection.commit();

        console.log("Resultado do ajuste:", {
            duplicatasAlteradas,
            duplicatasNaoEncontradas,
        });

        res.json({
            success: true,
            message: `${duplicatasAlteradas.length} duplicata(s) alterada(s) com sucesso.`,
            alteradas: duplicatasAlteradas,
            nao_encontradas: duplicatasNaoEncontradas,
            linhas_afetadas: totalLinhasAfetadas,
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Erro no rollback:", rollbackError);
            }
        }
        console.error("Erro ao ajustar comissão:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor ao ajustar comissão.",
            error: error.message,
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error("Erro ao fechar conexão:", closeError);
            }
        }
    }
});

module.exports = router;
