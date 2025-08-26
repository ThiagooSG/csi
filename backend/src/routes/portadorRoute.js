const express = require("express");
const { getConnection } = require("../config/conection");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/* ===============================
   Locks de duplicata (TTL memória)
   =============================== */
const locks = new Map(); // key => expiresAt(ms)
let LOCK_TTL_SECONDS = Number(process.env.LOCK_TTL_SECONDS || 1800);

const s = (v) => (v == null ? "" : String(v).trim());
const keyOf = (emp, tip, num) => `${emp}|${tip}|${s(num)}`;

const isLocked = (key) => {
    const exp = locks.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
        locks.delete(key);
        return false;
    }
    return true;
};
const lockKey = (key, ttl = LOCK_TTL_SECONDS) =>
    locks.set(key, Date.now() + ttl * 1000);
const unlockKey = (key) => locks.delete(key);

/* ==========================================
   Descoberta dinâmica da coluna de sequência
   ========================================== */
let SEQCOL_PORT = null; // "NUM_SEQUENCIA" | "NUM_SEQ_DOCUM"
let SEQCOL_MOV = null;

async function tryFromDictionary(conn, table) {
    const q = `
    SELECT COLUMN_NAME
      FROM ALL_TAB_COLUMNS
     WHERE OWNER = SYS_CONTEXT('USERENV','CURRENT_SCHEMA')
       AND TABLE_NAME = :t
       AND COLUMN_NAME IN ('NUM_SEQUENCIA','NUM_SEQ_DOCUM')`;
    const r = await conn.execute(q, { t: table });
    const names = r.rows.map((row) => row.COLUMN_NAME || row[0]);
    if (names.includes("NUM_SEQUENCIA")) return "NUM_SEQUENCIA";
    if (names.includes("NUM_SEQ_DOCUM")) return "NUM_SEQ_DOCUM";
    return null;
}
async function probeColumn(conn, table, col) {
    try {
        await conn.execute(`SELECT ${col} FROM logix.${table} WHERE 1=0`);
        return true;
    } catch {
        return false;
    }
}
async function resolveSeqCols(conn) {
    if (!SEQCOL_PORT) {
        SEQCOL_PORT = await tryFromDictionary(conn, "DOCUM_PORT");
        if (!SEQCOL_PORT) {
            if (await probeColumn(conn, "DOCUM_PORT", "NUM_SEQUENCIA"))
                SEQCOL_PORT = "NUM_SEQUENCIA";
            else if (await probeColumn(conn, "DOCUM_PORT", "NUM_SEQ_DOCUM"))
                SEQCOL_PORT = "NUM_SEQ_DOCUM";
        }
    }
    if (!SEQCOL_MOV) {
        SEQCOL_MOV = await tryFromDictionary(conn, "DOCUM_MOVTO");
        if (!SEQCOL_MOV) {
            if (await probeColumn(conn, "DOCUM_MOVTO", "NUM_SEQUENCIA"))
                SEQCOL_MOV = "NUM_SEQUENCIA";
            else if (await probeColumn(conn, "DOCUM_MOVTO", "NUM_SEQ_DOCUM"))
                SEQCOL_MOV = "NUM_SEQ_DOCUM";
        }
    }
    if (!SEQCOL_PORT || !SEQCOL_MOV) {
        throw new Error(
            "Não foi possível detectar a coluna de sequência em DOCUM_PORT/DOCUM_MOVTO."
        );
    }
}

/* ======= Health ======= */
router.get("/ping", (_req, res) =>
    res.json({ ok: true, msg: "portadorRoute ativo" })
);

/* ======= Pesquisar duplicatas (corrigido) ======= */
router.post("/pesquisar", authenticateToken, async (req, res) => {
    const duplicatas = (req.body.duplicatas || []).map(s).filter(Boolean);
    if (!duplicatas.length) {
        return res.status(400).json({ success: false, message: "Nenhuma duplicata." });
    }

    // placeholders :d0, :d1, ...
    const placeholders = duplicatas.map((_, i) => `:d${i}`).join(", ");

    // JOIN agora usa a chave completa do PORTADOR (COD + TIPO) e já traz o TIPO 'limpo'
    const sql = `
    SELECT DISTINCT
           d.COD_EMPRESA,
           TRIM(d.NUM_DOCUM)                       AS NUM_DOCUM,
           d.IES_TIP_DOCUM,
           c.NOME_CLIENTE,
           d.COD_PORTADOR,
           TRIM(d.IES_TIP_PORTADOR)               AS TIPO_DO_DOCUM,
           p.NOM_PORTADOR                         AS NOME_PORTADOR
      FROM logix.DOCUM d
 LEFT JOIN logix.PORTADOR p
        ON p.COD_PORTADOR     = d.COD_PORTADOR
       AND p.IES_TIP_PORTADOR = d.IES_TIP_PORTADOR   -- <<< evita duplicar por tipo
 LEFT JOIN COMERCIAL.CLIENTE c
        ON c.CLIENTE = d.COD_CLIENTE
     WHERE TRIM(d.NUM_DOCUM) IN (${placeholders})
  `;

    let conn;
    try {
        conn = await getConnection();
        const binds = {};
        duplicatas.forEach((dup, i) => (binds[`d${i}`] = dup));

        const r = await conn.execute(sql, binds);

        // Garante dados limpos e completos para a UI
        const rows = r.rows.map((row) => ({
            cod_empresa: row.COD_EMPRESA,
            num_docum: s(row.NUM_DOCUM),
            tip_docum: s(row.IES_TIP_DOCUM),
            nome_cliente: row.NOME_CLIENTE,
            cod_portador: row.COD_PORTADOR,
            nome_portador: row.NOME_PORTADOR,
            tipo_portador: s(row.TIPO_DO_DOCUM), // <<< agora vem TRIMado
        }));

        // calcula não encontradas por NUM_DOCUM
        const encontradasSet = new Set(rows.map((x) => x.num_docum));
        const nao_encontradas = duplicatas.filter((d) => !encontradasSet.has(d));

        res.json({
            success: true,
            rows,
            encontradas: Array.from(encontradasSet),
            nao_encontradas,
        });
    } catch (e) {
        console.error("Erro /pesquisar:", e);
        res.status(500).json({ success: false, message: "Erro interno." });
    } finally {
        if (conn) await conn.close();
    }
});


/* ======= Obter dados do portador ======= */
router.get("/obter-dados/:codigo", authenticateToken, async (req, res) => {
    const { codigo } = req.params;
    let conn;
    try {
        conn = await getConnection();
        const r = await conn.execute(
            `SELECT NOM_PORTADOR, IES_TIP_PORTADOR FROM logix.PORTADOR WHERE COD_PORTADOR = :codigo`,
            { codigo }
        );
        if (!r.rows.length)
            return res
                .status(404)
                .json({ success: false, message: "Portador não encontrado." });
        const portadores = r.rows.map((x) => ({
            nome: x.NOM_PORTADOR,
            tipo: x.IES_TIP_PORTADOR,
        }));
        res.json({ success: true, portadores });
    } catch (e) {
        console.error("Erro /obter-dados:", e);
        res.status(500).json({ success: false, message: "Erro interno." });
    } finally {
        if (conn) await conn.close();
    }
});

/* ======= TTL / travas ======= */
router.get("/ajustadas", authenticateToken, (req, res) => {
    const nums = String(req.query.nums || "")
        .split(",")
        .map(s)
        .filter(Boolean);
    const now = Date.now();
    const items = [];
    for (const [k, exp] of locks) {
        if (exp <= now) continue;
        const [emp, tip, num] = k.split("|");
        if (!nums.length || nums.includes(num)) {
            items.push({
                cod_empresa: emp,
                tip_docum: tip,
                num_docum: num,
                expires_in: Math.round((exp - now) / 1000),
            });
        }
    }
    res.json({ success: true, items });
});

router.post("/liberar", authenticateToken, (req, res) => {
    const dups = (req.body.duplicatas || []).map(s).filter(Boolean);
    let count = 0;
    for (const [k] of locks) {
        const num = k.split("|")[2];
        if (dups.includes(num)) {
            locks.delete(k);
            count++;
        }
    }
    res.json({ success: true, released: count });
});

router.post("/apply-ttl", authenticateToken, (req, res) => {
    const ttl = Number(req.body.ttlSeconds);
    const applyExisting = !!req.body.applyExisting;
    if (!Number.isFinite(ttl) || ttl <= 0)
        return res.status(400).json({ success: false, message: "TTL inválido." });
    LOCK_TTL_SECONDS = ttl;
    if (applyExisting) {
        const now = Date.now();
        for (const [k, exp] of locks) if (exp > now) locks.set(k, now + ttl * 1000);
    }
    res.json({ success: true, ttl: LOCK_TTL_SECONDS, applyExisting });
});

/* ======= Ajustar / Simular ======= */
router.post("/ajustar", authenticateToken, async (req, res) => {
    const duplicatas = (req.body.duplicatas || []).map(s).filter(Boolean);
    const codigoPortador = s(req.body.codigoPortador);
    const tipoPortador = s(req.body.tipoPortador);
    const dryRun = !!req.body.dryRun;

    if (!duplicatas.length || !codigoPortador || !tipoPortador)
        return res
            .status(400)
            .json({ success: false, message: "Dados insuficientes." });

    const alteradas = [];
    const ignoradas = []; // [{ num_docum, reason }]
    const nao_encontradas = []; // ["num"]
    const com_erro = [];
    const preview = [];

    let conn;
    try {
        conn = await getConnection();

        // Detecta colunas de sequência (com tolerância)
        try {
            await resolveSeqCols(conn);
        } catch (e) {
            console.warn("Aviso: resolveSeqCols falhou:", e?.message);
        }

        for (const num_docum of duplicatas) {
            try {
                await conn.execute("BEGIN NULL; END;");

                // 1) DOCUM
                const rDoc = await conn.execute(
                    `SELECT COD_EMPRESA, IES_TIP_DOCUM, VAL_SALDO,
                  COD_PORTADOR AS COD_PORTADOR_ORIG,
                  IES_TIP_PORTADOR AS IES_TIP_PORT_ORIG
             FROM logix.DOCUM
            WHERE TRIM(NUM_DOCUM) = :NUM_DOCUM`,
                    { NUM_DOCUM: num_docum }
                );
                if (!rDoc.rows.length) {
                    nao_encontradas.push(num_docum);
                    await conn.rollback();
                    continue;
                }
                const {
                    COD_EMPRESA,
                    IES_TIP_DOCUM,
                    VAL_SALDO: VAL_SALDO_DOCUM,
                    COD_PORTADOR_ORIG,
                    IES_TIP_PORT_ORIG,
                } = rDoc.rows[0];

                const key = keyOf(COD_EMPRESA, IES_TIP_DOCUM, num_docum);

                // 2) Banco (opcional) — TRIM no NUM_DOCUM
                let banco = "não encontrado";
                try {
                    const rB = await conn.execute(
                        `SELECT 1 FROM logix.DOCUM_BANCO
              WHERE COD_EMPRESA=:COD_EMPRESA
                AND TRIM(NUM_DOCUM)=:NUM_DOCUM
                AND IES_TIP_DOCUM=:IES_TIP_DOCUM
                AND COD_PORTADOR=:COD_PORTADOR
              FETCH FIRST 1 ROWS ONLY`,
                        {
                            COD_EMPRESA,
                            NUM_DOCUM: num_docum,
                            IES_TIP_DOCUM,
                            COD_PORTADOR: codigoPortador,
                        }
                    );
                    banco = rB.rows.length ? "encontrado" : "não encontrado";
                } catch { }

                /* 3) Último DOCUM_PORT — robusto com agregação */
                let lastSeqPort = 0,
                    nextSeqPort = 1,
                    IES_TIP_COBR = null,
                    COD_AGENCIA = null,
                    DIG_AGENCIA = null;
                try {
                    if (SEQCOL_PORT) {
                        const qPortAgg = `
              SELECT
                NVL(MAX(${SEQCOL_PORT}),0) AS LAST_SEQ,
                MAX(IES_TIP_COBR)  KEEP (DENSE_RANK LAST ORDER BY ${SEQCOL_PORT}) AS LAST_IES_TIP_COBR,
                MAX(COD_AGENCIA)   KEEP (DENSE_RANK LAST ORDER BY ${SEQCOL_PORT}) AS LAST_COD_AGENCIA,
                MAX(DIG_AGENCIA)   KEEP (DENSE_RANK LAST ORDER BY ${SEQCOL_PORT}) AS LAST_DIG_AGENCIA
              FROM logix.DOCUM_PORT
              WHERE COD_EMPRESA = :COD_EMPRESA
                AND TRIM(NUM_DOCUM) = :NUM_DOCUM
                AND IES_TIP_DOCUM = :IES_TIP_DOCUM`;
                        const rLP = await conn.execute(qPortAgg, {
                            COD_EMPRESA,
                            NUM_DOCUM: num_docum,
                            IES_TIP_DOCUM,
                        });
                        const row = rLP.rows[0] || {};
                        lastSeqPort = Number(row.LAST_SEQ || 0);
                        IES_TIP_COBR = row.LAST_IES_TIP_COBR ?? null;
                        COD_AGENCIA = row.LAST_COD_AGENCIA ?? null;
                        DIG_AGENCIA = row.LAST_DIG_AGENCIA ?? null;
                    }
                    nextSeqPort = (lastSeqPort || 0) + 1;
                } catch (e) {
                    console.warn(`Aviso: DOCUM_PORT seq (${num_docum}):`, e?.message);
                    lastSeqPort = 0;
                    nextSeqPort = 1;
                }

                /* 4) Último DOCUM_MOVTO — robusto com agregação */
                let lastSeqMov = 0,
                    nextSeqMov = 1,
                    saldoMov = Number(VAL_SALDO_DOCUM) || 0;
                try {
                    if (SEQCOL_MOV) {
                        const qMovAgg = `
              SELECT
                NVL(MAX(${SEQCOL_MOV}),0) AS LAST_SEQ,
                MAX(VAL_SALDO) KEEP (DENSE_RANK LAST ORDER BY ${SEQCOL_MOV}) AS LAST_SALDO
              FROM logix.DOCUM_MOVTO
              WHERE COD_EMPRESA = :COD_EMPRESA
                AND TRIM(NUM_DOCUM) = :NUM_DOCUM
                AND IES_TIP_DOCUM = :IES_TIP_DOCUM`;
                        const rLM = await conn.execute(qMovAgg, {
                            COD_EMPRESA,
                            NUM_DOCUM: num_docum,
                            IES_TIP_DOCUM,
                        });
                        const row = rLM.rows[0] || {};
                        lastSeqMov = Number(row.LAST_SEQ || 0);
                        if (row.LAST_SALDO != null) saldoMov = Number(row.LAST_SALDO);
                    }
                    nextSeqMov = (lastSeqMov || 0) + 1;
                } catch (e) {
                    console.warn(`Aviso: DOCUM_MOVTO seq (${num_docum}):`, e?.message);
                    lastSeqMov = 0;
                    nextSeqMov = 1;
                }

                const samePortador =
                    String(COD_PORTADOR_ORIG) === String(codigoPortador) &&
                    String(IES_TIP_PORT_ORIG) === String(tipoPortador);
                const locked = isLocked(key);

                /* ---------- DRY RUN: sempre inclui no preview ---------- */
                if (dryRun) {
                    preview.push({
                        num_docum,
                        cod_empresa: COD_EMPRESA,
                        tip_docum: IES_TIP_DOCUM,
                        banco,
                        ult_seq_port: lastSeqPort,
                        prox_seq_port: nextSeqPort,
                        ult_seq_mov: lastSeqMov,
                        prox_seq_mov: nextSeqMov,
                        saldo: saldoMov,
                        port_orig: COD_PORTADOR_ORIG,
                        tip_orig: IES_TIP_PORT_ORIG,
                        port_novo: codigoPortador,
                        tip_novo: tipoPortador,
                    });
                    if (samePortador)
                        ignoradas.push({ num_docum, reason: "portador já é o informado" });
                    if (locked) ignoradas.push({ num_docum, reason: "trava ativa" });
                    await conn.rollback();
                    continue;
                }

                /* ---------- AJUSTE REAL ---------- */
                if (samePortador) {
                    ignoradas.push({ num_docum, reason: "portador já é o informado" });
                    await conn.rollback();
                    continue;
                }
                if (locked) {
                    ignoradas.push({ num_docum, reason: "trava ativa" });
                    await conn.rollback();
                    continue;
                }

                // (Fixa ORA-01002) Serializa DOCUM sem SELECT FOR UPDATE: usa UPDATE no-op para bloquear a linha
                await conn.execute(
                    `UPDATE logix.DOCUM
              SET NUM_DOCUM = NUM_DOCUM
            WHERE COD_EMPRESA=:COD_EMPRESA
              AND TRIM(NUM_DOCUM)=:NUM_DOCUM
              AND IES_TIP_DOCUM=:IES_TIP_DOCUM`,
                    { COD_EMPRESA, NUM_DOCUM: num_docum, IES_TIP_DOCUM },
                    { autoCommit: false }
                );

                // DOCUM_PORT
                await conn.execute(
                    `INSERT INTO logix.DOCUM_PORT
             (COD_EMPRESA, NUM_DOCUM, IES_TIP_DOCUM, ${SEQCOL_PORT || "NUM_SEQ_DOCUM"
                    },
              DAT_ALTER_PORTADOR, IES_TIP_COBR, COD_PORTADOR, IES_TIP_PORTADOR,
              COD_AGENCIA, DIG_AGENCIA, DAT_ATUALIZ)
           VALUES
             (:COD_EMPRESA, :NUM_DOCUM, :IES_TIP_DOCUM, :SEQ,
              TRUNC(SYSDATE), :IES_TIP_COBR, :COD_PORTADOR, :IES_TIP_PORTADOR,
              :COD_AGENCIA, :DIG_AGENCIA, TRUNC(SYSDATE))`,
                    {
                        COD_EMPRESA,
                        NUM_DOCUM: num_docum,
                        IES_TIP_DOCUM,
                        SEQ: (lastSeqPort || 0) + 1,
                        IES_TIP_COBR,
                        COD_PORTADOR: codigoPortador,
                        IES_TIP_PORTADOR: tipoPortador,
                        COD_AGENCIA,
                        DIG_AGENCIA,
                    },
                    { autoCommit: false }
                );

                // DOCUM_MOVTO
                await conn.execute(
                    `INSERT INTO logix.DOCUM_MOVTO
             (COD_EMPRESA, NUM_DOCUM, IES_TIP_DOCUM, ${SEQCOL_MOV || "NUM_SEQ_DOCUM"
                    },
              DAT_MOVIMENTACAO, IES_SITUACAO,
              COD_PORTADOR_ATU, IES_TIP_PORT_ATU,
              COD_PORTADOR_ORIG, IES_TIP_PORT_ORIG,
              VAL_SALDO)
           VALUES
             (:COD_EMPRESA, :NUM_DOCUM, :IES_TIP_DOCUM, :SEQ,
              TRUNC(SYSDATE), 'AL',
              :COD_PORTADOR_ATU, :IES_TIP_PORT_ATU,
              :COD_PORTADOR_ORIG, :IES_TIP_PORT_ORIG,
              :VAL_SALDO)`,
                    {
                        COD_EMPRESA,
                        NUM_DOCUM: num_docum,
                        IES_TIP_DOCUM,
                        SEQ: (lastSeqMov || 0) + 1,
                        COD_PORTADOR_ATU: codigoPortador,
                        IES_TIP_PORT_ATU: tipoPortador,
                        COD_PORTADOR_ORIG,
                        IES_TIP_PORT_ORIG,
                        VAL_SALDO: Number.isFinite(saldoMov)
                            ? saldoMov
                            : Number(VAL_SALDO_DOCUM) || 0,
                    },
                    { autoCommit: false }
                );

                // DOCUM
                await conn.execute(
                    `UPDATE logix.DOCUM
              SET COD_PORTADOR=:COD_PORTADOR, IES_TIP_PORTADOR=:IES_TIP_PORTADOR
            WHERE COD_EMPRESA=:COD_EMPRESA AND TRIM(NUM_DOCUM)=:NUM_DOCUM`,
                    {
                        COD_EMPRESA,
                        NUM_DOCUM: num_docum,
                        COD_PORTADOR: codigoPortador,
                        IES_TIP_PORTADOR: tipoPortador,
                    },
                    { autoCommit: false }
                );

                await conn.commit();
                lockKey(key);
                alteradas.push({
                    num_docum,
                    empresa: COD_EMPRESA,
                    tip_docum: IES_TIP_DOCUM,
                    saldo_movto: Number.isFinite(saldoMov)
                        ? saldoMov
                        : Number(VAL_SALDO_DOCUM) || 0,
                    prox_seq_port: (lastSeqPort || 0) + 1,
                    prox_seq_mov: (lastSeqMov || 0) + 1,
                    banco,
                });
            } catch (err) {
                try {
                    await conn.rollback();
                } catch { }
                console.error(`Erro em ${num_docum}:`, err);
                com_erro.push({
                    num_docum,
                    code: err.code || null,
                    message: err.message || "erro",
                });
            }
        }

        if (dryRun) {
            return res.json({
                success: true,
                mode: "dryRun",
                preview,
                ignored: ignoradas,
                not_found: nao_encontradas.map((n) => ({ num_docum: n })),
                errors: com_erro,
            });
        }

        res.json({
            success: true,
            message: "Processo concluído.",
            alteradas,
            ignoradas,
            nao_encontradas,
            com_erro,
        });
    } catch (e) {
        console.error("Erro geral /ajustar:", e);
        res.status(500).json({ success: false, message: "Erro interno." });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
