const express = require("express");
const { getConnection } = require("../config/conection");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/**
 * ==========================
 *  Travas com TTL (memória)
 * ==========================
 * locks: Map<keyDoc, expiresAtMs>
 * userAdjusted: Map<userKey, Set<keyDoc>>
 * keyDoc = "COD_EMPRESA|IES_TIP_DOCUM|NUM_DOCUM"
 */
let LOCK_TTL_SECONDS = Number(process.env.LOCK_TTL_SECONDS || 1800);
// 30 min padrão
const locks = new Map();
const userAdjusted = new Map();

function getUserKey(req) {
    const u = req.user || {};
    return u.id || u.sub || u.email || u.username || "default";
}
function makeKey(codEmpresa, tipDocum, numDocum) {
    return `${String(codEmpresa).trim()}|${String(tipDocum).trim()}|${String(
        numDocum
    ).trim()}`;
}
function parseKey(key) {
    const [COD_EMPRESA, IES_TIP_DOCUM, NUM_DOCUM] = key.split("|");
    return { COD_EMPRESA, IES_TIP_DOCUM, NUM_DOCUM };
}
function isUniqueViolation(err) {
    return err && (err.errorNum === 1 || err.code === "ORA-00001");
}
function isLocked(key) {
    const exp = locks.get(key);
    if (!exp) return false;
    const now = Date.now();
    if (exp <= now) {
        locks.delete(key);
        // higieniza coleções por usuário
        for (const [uk, set] of userAdjusted) {
            if (set.has(key)) {
                set.delete(key);
                userAdjusted.set(uk, set);
            }
        }
        return false;
    }
    return true;
}
function lockKey(key, userKey) {
    const exp = Date.now() + LOCK_TTL_SECONDS * 1000;
    locks.set(key, exp);
    const set = userAdjusted.get(userKey) || new Set();
    set.add(key);
    userAdjusted.set(userKey, set);
}
function unlockKeys(keys, userKey) {
    const set = userAdjusted.get(userKey) || new Set();
    for (const k of keys) {
        locks.delete(k);
        set.delete(k);
    }
    userAdjusted.set(userKey, set);
}
// limpeza periódica
setInterval(() => {
    const now = Date.now();
    for (const [k, exp] of locks) if (exp <= now) locks.delete(k);
    for (const [uk, set] of userAdjusted) {
        for (const k of Array.from(set)) if (!locks.has(k)) set.delete(k);
        userAdjusted.set(uk, set);
    }
}, 60_000);

/**
 * GET /api/portador/ping
 */
router.get("/ping", (req, res) => {
    res.json({ ok: true, msg: "portadorRoute ativo" });
});

/**
 * POST /api/portador/pesquisar
 * body: { duplicatas: ["021244-004/25", ...] }
 */
router.post("/pesquisar", authenticateToken, async (req, res) => {
    const { duplicatas } = req.body;
    const duplicatasLimpas = (duplicatas || [])
        .map((d) => d.trim())
        .filter(Boolean);

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
    FROM LOGIX.DOCUM d
    LEFT JOIN LOGIX.PORTADOR p ON p.COD_PORTADOR = d.COD_PORTADOR
    LEFT JOIN COMERCIAL.CLIENTE c ON d.COD_CLIENTE = c.CLIENTE
    WHERE TRIM(d.NUM_DOCUM) IN (${placeholders})
  `;

    let connection;
    try {
        connection = await getConnection();

        const binds = {};
        duplicatasLimpas.forEach((dup, i) => (binds[`dup${i}`] = dup));

        const result = await connection.execute(sql, binds);

        const rows = result.rows.map((row) => ({
            cod_empresa: row.COD_EMPRESA,
            num_docum: String(row.NUM_DOCUM || "").trim(),
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

/**
 * GET /api/portador/obter-dados/:codigo
 */
router.get("/obter-dados/:codigo", authenticateToken, async (req, res) => {
    const { codigo } = req.params;
    const sql = `
    SELECT NOM_PORTADOR, IES_TIP_PORTADOR
    FROM LOGIX.PORTADOR
    WHERE COD_PORTADOR = :codigo
  `;

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

/**
 * GET /api/portador/ajustadas
 */
router.get("/ajustadas", authenticateToken, async (req, res) => {
    const userKey = getUserKey(req);
    const set = userAdjusted.get(userKey) || new Set();
    const lista = Array.from(set)
        .filter((k) => isLocked(k))
        .map(parseKey);
    return res.json({ success: true, duplicatas: lista });
});

/**
 * GET /api/portador/ttl  -> { ttl_seconds }
 * POST /api/portador/ttl -> { seconds, applyToExisting? }
 */
router.get("/ttl", authenticateToken, async (req, res) => {
    return res.json({ success: true, ttl_seconds: LOCK_TTL_SECONDS });
});

router.post("/ttl", authenticateToken, async (req, res) => {
    const { seconds, applyToExisting = false } = req.body || {};
    const s = Number(seconds);
    if (!Number.isFinite(s) || s < 60 || s > 86400) {
        return res.status(400).json({ success: false, message: "TTL inválido (60–86400 segundos)." });
    }
    LOCK_TTL_SECONDS = s;

    if (applyToExisting) {
        const now = Date.now();
        for (const k of Array.from(locks.keys())) {
            locks.set(k, now + LOCK_TTL_SECONDS * 1000);
        }
    }
    return res.json({ success: true, ttl_seconds: LOCK_TTL_SECONDS, appliedToExisting: !!applyToExisting });
});

/**
 * POST /api/portador/liberar
 * body: { duplicatas?: [{cod_empresa, ies_tip_docum, num_docum}], todas?: boolean }
 */
router.post("/liberar", authenticateToken, async (req, res) => {
    const { duplicatas = [], todas = false } = req.body || {};
    const userKey = getUserKey(req);
    const set = userAdjusted.get(userKey) || new Set();

    if (todas) {
        unlockKeys(Array.from(set), userKey);
        return res.json({
            success: true,
            message: "Todas as duplicatas foram liberadas.",
        });
    }

    const wanted = new Set(
        (duplicatas || []).map((d) =>
            makeKey(d.cod_empresa, d.ies_tip_docum, d.num_docum)
        )
    );

    const liberadas = [];
    for (const key of Array.from(set)) {
        if (wanted.has(key)) liberadas.push(key);
    }
    unlockKeys(liberadas, userKey);
    return res.json({
        success: true,
        message: `Liberadas ${liberadas.length} duplicata(s).`,
    });
});

/**
 * POST /api/portador/ajustar
 * body: { duplicatas: [...], codigoPortador: "xxxx", tipoPortador: "A|B|C|...", dryRun?: boolean }
 */
router.post("/ajustar", authenticateToken, async (req, res) => {
    const { duplicatas, codigoPortador, tipoPortador, dryRun = false } = req.body;
    const duplicatasLimpas = (duplicatas || [])
        .map((d) => d.trim())
        .filter(Boolean);

    if (duplicatasLimpas.length === 0 || !codigoPortador || !tipoPortador) {
        return res
            .status(400)
            .json({ success: false, message: "Dados insuficientes para o ajuste." });
    }

    let connection;
    try {
        connection = await getConnection();

        const alteradas = [];
        const preview = [];
        const nao_encontradas = [];
        const com_erro = [];

        for (const num_docum of duplicatasLimpas) {
            try {
                // inicia transação
                await connection.execute("BEGIN NULL; END;");

                // 1) DOCUM — base + portador original
                const rDocum = await connection.execute(
                    `
          SELECT 
            COD_EMPRESA, 
            IES_TIP_DOCUM, 
            VAL_SALDO,
            COD_PORTADOR       AS COD_PORTADOR_ORIG,
            IES_TIP_PORTADOR   AS IES_TIP_PORT_ORIG
          FROM LOGIX.DOCUM
          WHERE TRIM(NUM_DOCUM) = :NUM_DOCUM
        `,
                    { NUM_DOCUM: num_docum }
                );
                if (rDocum.rows.length === 0) {
                    nao_encontradas.push(num_docum);
                    await connection.rollback();
                    continue;
                }
                const {
                    COD_EMPRESA,
                    IES_TIP_DOCUM,
                    VAL_SALDO: VAL_SALDO_DOCUM,
                    COD_PORTADOR_ORIG,
                    IES_TIP_PORT_ORIG,
                } = rDocum.rows[0];

                const docKey = makeKey(COD_EMPRESA, IES_TIP_DOCUM, num_docum);

                // trava existente?
                if (isLocked(docKey)) {
                    await connection.rollback();
                    return res.status(423).json({
                        success: false,
                        status: 423,
                        message: `Duplicata ${num_docum} está travada para novo ajuste. Use "Liberar Duplicata".`,
                        duplicata: { COD_EMPRESA, IES_TIP_DOCUM, NUM_DOCUM: num_docum },
                    });
                }

                // lock na linha
                await connection.execute(
                    `
          SELECT 1
          FROM LOGIX.DOCUM
          WHERE COD_EMPRESA = :COD_EMPRESA
            AND TRIM(NUM_DOCUM) = :NUM_DOCUM
            AND IES_TIP_DOCUM = :IES_TIP_DOCUM
          FOR UPDATE
        `,
                    { COD_EMPRESA, NUM_DOCUM: num_docum, IES_TIP_DOCUM }
                );

                // 2) DOCUM_BANCO (opcional)
                const rBanco = await connection.execute(
                    `
          SELECT 1
          FROM LOGIX.DOCUM_BANCO
          WHERE COD_EMPRESA   = :COD_EMPRESA
            AND NUM_DOCUM     = :NUM_DOCUM
            AND IES_TIP_DOCUM = :IES_TIP_DOCUM
            AND COD_PORTADOR  = :COD_PORTADOR
            AND ROWNUM = 1
        `,
                    {
                        COD_EMPRESA,
                        NUM_DOCUM: num_docum,
                        IES_TIP_DOCUM,
                        COD_PORTADOR: codigoPortador,
                    }
                );
                const temBanco = rBanco.rows.length > 0;

                // 3) heranças para DOCUM_PORT
                let iesTipCobr = tipoPortador;
                let codAgencia = null;
                let digAgencia = null;

                const rLastPortInfo = await connection.execute(
                    `
          SELECT IES_TIP_COBR, COD_AGENCIA, DIG_AGENCIA
          FROM (
            SELECT IES_TIP_COBR, COD_AGENCIA, DIG_AGENCIA
            FROM LOGIX.DOCUM_PORT
            WHERE COD_EMPRESA   = :COD_EMPRESA
              AND TRIM(NUM_DOCUM) = :NUM_DOCUM
              AND IES_TIP_DOCUM = :IES_TIP_DOCUM
            ORDER BY NUM_SEQ_DOCUM DESC
          ) WHERE ROWNUM = 1
        `,
                    { COD_EMPRESA, NUM_DOCUM: num_docum, IES_TIP_DOCUM }
                );
                if (rLastPortInfo.rows.length > 0) {
                    iesTipCobr = rLastPortInfo.rows[0].IES_TIP_COBR || iesTipCobr;
                    codAgencia = rLastPortInfo.rows[0].COD_AGENCIA ?? null;
                    digAgencia = rLastPortInfo.rows[0].DIG_AGENCIA ?? null;
                }

                // --- último e próximo seqs (com TRIM) ---
                const rLastPort = await connection.execute(
                    `
          SELECT NVL(MAX(NUM_SEQ_DOCUM), 0) AS LAST_SEQ
          FROM LOGIX.DOCUM_PORT
          WHERE COD_EMPRESA   = :COD_EMPRESA
            AND TRIM(NUM_DOCUM) = :NUM_DOCUM
            AND IES_TIP_DOCUM = :IES_TIP_DOCUM
        `,
                    { COD_EMPRESA, NUM_DOCUM: num_docum, IES_TIP_DOCUM }
                );
                const lastPortSeq = Number(rLastPort.rows[0].LAST_SEQ) || 0;
                let nextPortSeq = lastPortSeq + 1;

                const rLastMov = await connection.execute(
                    `
          SELECT NVL(MAX(NUM_SEQ_DOCUM), 0) AS LAST_SEQ
          FROM LOGIX.DOCUM_MOVTO
          WHERE COD_EMPRESA   = :COD_EMPRESA
            AND TRIM(NUM_DOCUM) = :NUM_DOCUM
            AND IES_TIP_DOCUM = :IES_TIP_DOCUM
        `,
                    { COD_EMPRESA, NUM_DOCUM: num_docum, IES_TIP_DOCUM }
                );
                const lastMovSeq = Number(rLastMov.rows[0].LAST_SEQ) || 0;
                let nextMovSeq = lastMovSeq + 1;

                // saldo (último movto ou DOCUM)
                let valSaldo = Number(VAL_SALDO_DOCUM) || 0;
                const rSaldoLast = await connection.execute(
                    `
          SELECT VAL_SALDO
          FROM (
            SELECT VAL_SALDO
            FROM LOGIX.DOCUM_MOVTO
            WHERE COD_EMPRESA   = :COD_EMPRESA
              AND TRIM(NUM_DOCUM) = :NUM_DOCUM
              AND IES_TIP_DOCUM = :IES_TIP_DOCUM
            ORDER BY NUM_SEQ_DOCUM DESC
          ) WHERE ROWNUM = 1
        `,
                    { COD_EMPRESA, NUM_DOCUM: num_docum, IES_TIP_DOCUM }
                );
                if (rSaldoLast.rows.length > 0) {
                    valSaldo = Number(rSaldoLast.rows[0].VAL_SALDO) || valSaldo;
                }

                // =========================
                // DRY-RUN → retorna preview
                // =========================
                if (dryRun) {
                    await connection.rollback();
                    preview.push({
                        num_docum: num_docum,
                        empresa: COD_EMPRESA,
                        tip_docum: IES_TIP_DOCUM,
                        banco: temBanco ? "encontrado" : "não encontrado",
                        last_seq_port: lastPortSeq,
                        proximo_seq_port: nextPortSeq,
                        last_seq_mov: lastMovSeq,
                        proximo_seq_mov: nextMovSeq,
                        saldo_movto: valSaldo,
                        portador_orig: COD_PORTADOR_ORIG,
                        tip_port_orig: IES_TIP_PORT_ORIG,
                        portador_novo: codigoPortador,
                        tip_port_novo: tipoPortador,
                        ies_tip_cobr: iesTipCobr,
                        cod_agencia: codAgencia,
                        dig_agencia: digAgencia,
                    });
                    continue;
                }

                // 3.1) INSERT DOCUM_PORT (retry PK)
                for (let tries = 0; tries < 10; tries++) {
                    try {
                        await connection.execute(
                            `
              INSERT INTO LOGIX.DOCUM_PORT
                (COD_EMPRESA, NUM_DOCUM, IES_TIP_DOCUM, NUM_SEQ_DOCUM,
                 DAT_ALTER_PORTADOR, IES_TIP_COBR, COD_PORTADOR, IES_TIP_PORTADOR,
                 COD_AGENCIA, DIG_AGENCIA, DAT_ATUALIZ)
              VALUES
                (:COD_EMPRESA, :NUM_DOCUM, :IES_TIP_DOCUM, :NUM_SEQ_DOCUM,
                 TRUNC(SYSDATE), :IES_TIP_COBR, :COD_PORTADOR, :IES_TIP_PORTADOR,
                 :COD_AGENCIA, :DIG_AGENCIA, TRUNC(SYSDATE))
            `,
                            {
                                COD_EMPRESA,
                                NUM_DOCUM: num_docum,
                                IES_TIP_DOCUM,
                                NUM_SEQ_DOCUM: nextPortSeq,
                                IES_TIP_COBR: iesTipCobr,
                                COD_PORTADOR: codigoPortador,
                                IES_TIP_PORTADOR: tipoPortador,
                                COD_AGENCIA: codAgencia,
                                DIG_AGENCIA: digAgencia,
                            },
                            { autoCommit: false }
                        );
                        break;
                    } catch (e) {
                        if (isUniqueViolation(e)) {
                            nextPortSeq++;
                            continue;
                        }
                        throw e;
                    }
                }

                // 4) INSERT DOCUM_MOVTO (retry PK)
                for (let tries = 0; tries < 10; tries++) {
                    try {
                        await connection.execute(
                            `
              INSERT INTO LOGIX.DOCUM_MOVTO
                (COD_EMPRESA, NUM_DOCUM, IES_TIP_DOCUM, NUM_SEQ_DOCUM,
                 DAT_MOVIMENTACAO, IES_SITUACAO,
                 COD_PORTADOR_ATU, IES_TIP_PORT_ATU,
                 COD_PORTADOR_ORIG, IES_TIP_PORT_ORIG,
                 VAL_SALDO)
              VALUES
                (:COD_EMPRESA, :NUM_DOCUM, :IES_TIP_DOCUM, :NUM_SEQ_DOCUM,
                 TRUNC(SYSDATE), 'AL',
                 :COD_PORTADOR_ATU, :IES_TIP_PORT_ATU,
                 :COD_PORTADOR_ORIG, :IES_TIP_PORT_ORIG,
                 :VAL_SALDO)
            `,
                            {
                                COD_EMPRESA,
                                NUM_DOCUM: num_docum,
                                IES_TIP_DOCUM,
                                NUM_SEQ_DOCUM: nextMovSeq,
                                COD_PORTADOR_ATU: codigoPortador,
                                IES_TIP_PORT_ATU: tipoPortador,
                                COD_PORTADOR_ORIG,
                                IES_TIP_PORT_ORIG,
                                VAL_SALDO: valSaldo,
                            },
                            { autoCommit: false }
                        );
                        break;
                    } catch (e) {
                        if (isUniqueViolation(e)) {
                            nextMovSeq++;
                            continue;
                        }
                        throw e;
                    }
                }

                // 5) UPDATE DOCUM
                await connection.execute(
                    `
          UPDATE LOGIX.DOCUM
             SET COD_PORTADOR     = :COD_PORTADOR,
                 IES_TIP_PORTADOR = :IES_TIP_PORTADOR
           WHERE COD_EMPRESA = :COD_EMPRESA
             AND TRIM(NUM_DOCUM) = :NUM_DOCUM
        `,
                    {
                        COD_PORTADOR: codigoPortador,
                        IES_TIP_PORTADOR: tipoPortador,
                        COD_EMPRESA,
                        NUM_DOCUM: num_docum,
                    },
                    { autoCommit: false }
                );

                await connection.commit();

                // trava com TTL
                lockKey(docKey, getUserKey(req));

                alteradas.push({
                    num_docum,
                    empresa: COD_EMPRESA,
                    tip_docum: IES_TIP_DOCUM,
                    banco: temBanco ? "encontrado" : "não encontrado",
                    saldo_movto: valSaldo,
                    locked: true,
                });
            } catch (errDup) {
                try {
                    await connection.rollback();
                } catch { }
                console.error(`Erro ao ajustar duplicata ${num_docum}:`, errDup);
                com_erro.push(num_docum);
            }
        }

        return res.json({
            success: true,
            mode: dryRun ? "dryRun" : "commit",
            message: dryRun
                ? "Simulação concluída. Nenhuma alteração gravada."
                : "Processo de ajuste concluído.",
            alteradas,
            preview,
            nao_encontradas,
            com_erro,
        });
    } catch (error) {
        console.error("Erro geral em /ajustar:", error);
        return res
            .status(500)
            .json({ success: false, message: "Erro interno do servidor." });
    } finally {
        if (connection) await connection.close();
    }
});

module.exports = router;
