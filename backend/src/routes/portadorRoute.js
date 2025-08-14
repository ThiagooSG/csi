const express = require("express");
const { getConnection } = require("../config/conection");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Rota para pesquisar duplicatas
router.post("/pesquisar", authenticateToken, async (req, res) => {
    const { duplicatas } = req.body;
    const duplicatasLimpas = (duplicatas || [])
        .map((d) => d.trim())
        .filter((d) => d);

    if (duplicatasLimpas.length === 0) {
        return res
            .status(400)
            .json({ success: false, message: "Nenhuma duplicata fornecida." });
    }

    const placeholders = duplicatasLimpas.map((_, i) => `:dup${i}`).join(", ");
    const sql = `
        SELECT 
            d.COD_EMPRESA, 
            d.NUM_DOCUM,
            c.NOME_CLIENTE,
            d.COD_PORTADOR,
            p.NOM_PORTADOR AS NOME_PORTADOR,
            p.IES_TIP_PORTADOR AS TIPO_PORTADOR
        FROM logix.DOCUM d
        LEFT JOIN logix.PORTADOR p ON p.COD_PORTADOR = d.COD_PORTADOR
        LEFT JOIN COMERCIAL.CLIENTE c ON d.COD_CLIENTE = c.CLIENTE
        WHERE TRIM(d.NUM_DOCUM) IN (${placeholders})
    `;

    let connection;
    try {
        connection = await getConnection();
        const binds = {};
        duplicatasLimpas.forEach((dup, i) => {
            binds[`dup${i}`] = dup;
        });
        const result = await connection.execute(sql, binds);

        const rows = result.rows.map((row) => ({
            cod_empresa: row.COD_EMPRESA,
            num_docum: String(row.NUM_DOCUM).trim(),
            nome_cliente: row.NOME_CLIENTE,
            cod_portador: row.COD_PORTADOR,
            nome_portador: row.NOME_PORTADOR,
            tipo_portador: row.TIPO_PORTADOR,
        }));

        const encontradas = rows.map((r) => r.num_docum.trim());
        const encontradasSet = new Set(encontradas);
        const nao_encontradas = duplicatasLimpas.filter(
            (d) => !encontradasSet.has(d.trim())
        );

        res.json({ success: true, rows, encontradas, nao_encontradas });
    } catch (error) {
        console.error("Erro ao pesquisar duplicatas:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Rota para obter dados do portador
router.get("/obter-dados/:codigo", authenticateToken, async (req, res) => {
    const { codigo } = req.params;
    const sql = `SELECT NOM_PORTADOR, IES_TIP_PORTADOR FROM logix.PORTADOR WHERE COD_PORTADOR = :codigo`;

    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, { codigo });

        if (result.rows.length > 0) {
            const portadores = result.rows.map((row) => ({
                nome: row.NOM_PORTADOR,
                tipo: row.IES_TIP_PORTADOR,
            }));
            res.json({ success: true, portadores });
        } else {
            res
                .status(404)
                .json({ success: false, message: "Portador não encontrado." });
        }
    } catch (error) {
        console.error("Erro ao obter dados do portador:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

// Rota para ajustar o portador (ATUALIZADA)
router.post("/ajustar", authenticateToken, async (req, res) => {
    // Agora recebe também o 'tipoPortador'
    const { duplicatas, codigoPortador, tipoPortador } = req.body;
    const duplicatasLimpas = (duplicatas || [])
        .map((d) => d.trim())
        .filter((d) => d);

    if (duplicatasLimpas.length === 0 || !codigoPortador || !tipoPortador) {
        return res
            .status(400)
            .json({ success: false, message: "Dados insuficientes para o ajuste." });
    }

    const placeholders = duplicatasLimpas.map((_, i) => `:dup${i}`).join(", ");

    // Query de UPDATE agora atualiza COD_PORTADOR e IES_TIP_PORTADOR
    const updateSql = `
        UPDATE logix.DOCUM
        SET COD_PORTADOR = :codigoPortador,
            IES_TIP_PORTADOR = :tipoPortador 
        WHERE TRIM(NUM_DOCUM) IN (${placeholders})
    `;

    let connection;
    try {
        connection = await getConnection();
        const bindsUpdate = { codigoPortador, tipoPortador };
        duplicatasLimpas.forEach((dup, i) => {
            bindsUpdate[`dup${i}`] = dup;
        });

        const updateResult = await connection.execute(updateSql, bindsUpdate, {
            autoCommit: true,
        });

        const rowsAffected = updateResult.rowsAffected || 0;

        const selectSql = `SELECT TRIM(NUM_DOCUM) AS NUM_DOCUM FROM logix.DOCUM WHERE TRIM(NUM_DOCUM) IN (${placeholders})`;
        const bindsSelect = {};
        duplicatasLimpas.forEach((dup, i) => {
            bindsSelect[`dup${i}`] = dup;
        });
        const selectResult = await connection.execute(selectSql, bindsSelect);
        const existentes = (selectResult.rows || []).map((r) =>
            String(r.NUM_DOCUM).trim()
        );
        const existentesSet = new Set(existentes);
        const nao_encontradas = duplicatasLimpas.filter(
            (d) => !existentesSet.has(d.trim())
        );

        if (rowsAffected === 0) {
            return res.json({
                success: false,
                message: "Nenhuma duplicata foi encontrada para atualização.",
                alteradas: [],
                nao_encontradas,
            });
        }

        res.json({
            success: true,
            message: `${rowsAffected} duplicata(s) atualizada(s) com sucesso!`,
            alteradas: duplicatasLimpas.filter((d) => existentesSet.has(d.trim())),
            nao_encontradas,
        });
    } catch (error) {
        console.error("Erro ao ajustar portador:", error);
        res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

module.exports = router;
