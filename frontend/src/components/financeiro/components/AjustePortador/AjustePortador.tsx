import React, { useState, useCallback } from "react";
import { apiGet, apiPost } from "../../../../utils/api";
import { toastService } from "../../../../services/toastService";
import "./ajusteportador.css";

/* ========================= Tipos ========================= */
interface Duplicata {
    num_docum: string;
    cod_empresa: string;
    nome_cliente: string;
    cod_portador: string;
    nome_portador: string;
    tipo_portador: string;
}
interface Portador {
    nome: string;
    tipo: string;
}
interface LockedDup {
    num_docum: string;
    cod_empresa: string;
    tip_docum: string;
    expires_in: number;
}
interface SimRow {
    num_docum: string;
    cod_empresa: string;
    tip_docum: string;
    banco: string;
    ult_seq_port: number;
    prox_seq_port: number;
    ult_seq_mov: number;
    prox_seq_mov: number;
    saldo: number;
    port_orig: string;
    tip_orig: string;
    port_novo: string;
    tip_novo: string;
}

/* ========================= Modais ========================= */
const ConfirmacaoAjusteModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    count: number;
    codigoPortador: string;
    portador: Portador | null;
}> = ({ onConfirm, onCancel, count, codigoPortador, portador }) => {
    const plural = count > 1 ? "s" : "";
    const textoPortador = [
        (codigoPortador || "").trim(),
        portador?.nome,
        portador?.tipo ? `(${portador.tipo})` : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Confirmar Ajuste</h3>
                    <button onClick={onCancel} className="modal-close-btn">
                        &times;
                    </button>
                </div>

                <div className="confirmation-body">
                    <p>
                        Você deseja ajustar <strong>{count} duplicata{plural}</strong>{" "}
                        mudando o portador para:
                    </p>
                    <p>
                        <strong>{textoPortador}</strong>?
                    </p>
                </div>

                <div className="modal-footer">
                    <button className="ajuste-portador-btn secondary" onClick={onCancel}>
                        Não
                    </button>
                    <button className="ajuste-portador-btn primary" onClick={onConfirm}>
                        Sim, Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ModalLiberarDuplicatas: React.FC<{
    locked: LockedDup[];
    onClose: () => void;
    onLiberarTodas: () => void;
    onLiberarSelecionadas: (selecionadas: Set<string>) => void;
}> = ({ locked, onClose, onLiberarTodas, onLiberarSelecionadas }) => {
    const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
    const all = locked.length > 0 && selecionadas.size === locked.length;

    const fmtTTL = (s: number) =>
        `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 700 }}>
                <div className="modal-header">
                    <h3>Liberar Duplicatas Travadas</h3>
                    <button onClick={onClose} className="modal-close-btn">
                        &times;
                    </button>
                </div>

                <div className="release-list">
                    {locked.length === 0 ? (
                        <div className="empty-muted">
                            Nenhuma duplicata travada entre as listadas.
                        </div>
                    ) : (
                        <>
                            <div className="release-item head">
                                <input
                                    type="checkbox"
                                    checked={all}
                                    onChange={(e) =>
                                        setSelecionadas(
                                            e.target.checked
                                                ? new Set(locked.map((l) => l.num_docum))
                                                : new Set()
                                        )
                                    }
                                />
                                <span style={{ width: 180, fontWeight: 600 }}>Duplicata</span>
                                <span style={{ width: 60, fontWeight: 600 }}>Emp.</span>
                                <span style={{ width: 60, fontWeight: 600 }}>Tip.</span>
                                <span style={{ width: 90, fontWeight: 600, textAlign: "right" }}>
                                    TTL
                                </span>
                            </div>

                            <div className="release-items-scroll">
                                {locked.map((l) => (
                                    <label key={l.num_docum} className="release-item">
                                        <input
                                            type="checkbox"
                                            checked={selecionadas.has(l.num_docum)}
                                            onChange={(e) => {
                                                const n = new Set(selecionadas);
                                                e.target.checked
                                                    ? n.add(l.num_docum)
                                                    : n.delete(l.num_docum);
                                                setSelecionadas(n);
                                            }}
                                        />
                                        <span style={{ width: 180 }}>{l.num_docum}</span>
                                        <span style={{ width: 60 }}>{l.cod_empresa}</span>
                                        <span style={{ width: 60 }}>{l.tip_docum}</span>
                                        <span style={{ width: 90, textAlign: "right" }}>
                                            {fmtTTL(l.expires_in)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="ajuste-portador-btn secondary" onClick={onClose}>
                        Fechar
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                        className="ajuste-portador-btn tertiary"
                        onClick={onLiberarTodas}
                        disabled={locked.length === 0}
                    >
                        Liberar Todas
                    </button>
                    <button
                        className="ajuste-portador-btn primary"
                        onClick={() => onLiberarSelecionadas(selecionadas)}
                        disabled={selecionadas.size === 0}
                    >
                        Liberar ({selecionadas.size}) Selecionadas
                    </button>
                </div>
            </div>
        </div>
    );
};

const SimulacaoModal: React.FC<{
    open: boolean;
    rows: SimRow[];
    onClose: () => void;
}> = ({ open, rows, onClose }) => {
    if (!open) return null;

    const exportCsv = () => {
        const header = [
            "DUPLICATA",
            "EMPRESA",
            "TIP.DOC",
            "BANCO",
            "ULT.SEQ.PORT",
            "PROX.SEQ.PORT",
            "ULT.SEQ.MOV",
            "PROX.SEQ.MOV",
            "SALDO",
            "PORT.ORIG",
            "TIP.ORIG",
            "PORT.NOVO",
            "TIP.NOVO",
        ];
        const lines = rows.map((r) => [
            r.num_docum,
            r.cod_empresa,
            r.tip_docum,
            r.banco,
            r.ult_seq_port,
            r.prox_seq_port,
            r.ult_seq_mov,
            r.prox_seq_mov,
            r.saldo,
            r.port_orig,
            r.tip_orig,
            r.port_novo,
            r.tip_novo,
        ]);
        const csv = [header.join(";"), ...lines.map((l) => l.join(";"))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "simulacao_portador.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-xl">
                <div className="modal-header">
                    <h3>Resultado da Simulação ({rows.length})</h3>
                    <button onClick={onClose} className="modal-close-btn">
                        &times;
                    </button>
                </div>

                <div className="ajuste-portador-table-wrapper">
                    <table className="ajuste-portador-table sim-table">
                        <thead>
                            <tr>
                                <th>Duplicata</th>
                                <th>Empresa</th>
                                <th>Tip.Doc</th>
                                <th>Banco</th>
                                <th>Ult.Seq.Port</th>
                                <th>Próx.Seq.Port</th>
                                <th>Ult.Seq.Mov</th>
                                <th>Próx.Seq.Mov</th>
                                <th>Saldo</th>
                                <th>Port.Orig</th>
                                <th>Tip.Orig</th>
                                <th>Port.Novo</th>
                                <th>Tip.Novo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={`${r.num_docum}-${i}`}>
                                    <td>{r.num_docum}</td>
                                    <td>{r.cod_empresa}</td>
                                    <td>{r.tip_docum}</td>
                                    <td>{r.banco}</td>
                                    <td>{r.ult_seq_port}</td>
                                    <td>{r.prox_seq_port}</td>
                                    <td>{r.ult_seq_mov}</td>
                                    <td>{r.prox_seq_mov}</td>
                                    <td>{r.saldo}</td>
                                    <td>{r.port_orig}</td>
                                    <td>{r.tip_orig}</td>
                                    <td>{r.port_novo}</td>
                                    <td>{r.tip_novo}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="modal-footer">
                    <button className="ajuste-portador-btn tertiary" onClick={exportCsv}>
                        <i className="fas fa-file-csv" /> Exportar CSV
                    </button>
                    <div style={{ flex: 1 }} />
                    <button className="ajuste-portador-btn secondary" onClick={onClose}>
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ========================= Componente Principal ========================= */
const AjustePortador: React.FC = () => {
    const [consultaInput, setConsultaInput] = useState("");
    const [codigoPortador, setCodigoPortador] = useState("");
    const [duplicatas, setDuplicatas] = useState<Duplicata[]>([]);
    const [portadoresEncontrados, setPortadoresEncontrados] = useState<Portador[]>(
        []
    );
    const [portadorSelecionado, setPortadorSelecionado] =
        useState<Portador | null>(null);

    const [loading, setLoading] = useState(false);
    const [duplicatasSelecionadas, setDuplicatasSelecionadas] = useState<
        Set<string>
    >(new Set());
    const [duplicatasAjustadas, setDuplicatasAjustadas] = useState<Set<string>>(
        new Set()
    );

    // simulação
    const [simulate, setSimulate] = useState<boolean>(false);
    const [simRows, setSimRows] = useState<SimRow[]>([]);
    const [simOpen, setSimOpen] = useState(false);

    // modal confirmar
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // liberar duplicatas
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [lockedServer, setLockedServer] = useState<LockedDup[]>([]);

    // opções avançadas (TTL)
    const [ttlSeconds, setTtlSeconds] = useState<number>(1800);
    const [applyExistingLocks, setApplyExistingLocks] = useState<boolean>(false);

    /* ------------ helpers ------------ */
    const atualizarTabela = useCallback(async () => {
        const lista = consultaInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter(Boolean);
        if (lista.length === 0) return;
        try {
            const r = await apiPost("/api/portador/pesquisar", {
                duplicatas: lista,
            });
            if (r.success && r.data?.rows) {
                setDuplicatas(r.data.rows);
                const vis = new Set<string>(
                    r.data.rows.map((x: Duplicata) => x.num_docum)
                );
                setDuplicatasAjustadas(
                    (prev) => new Set([...prev].filter((n) => vis.has(n)))
                );
            }
        } catch (e) {
            console.error(e);
        }
    }, [consultaInput]);

    /* ------------ ações ------------ */
    const handlePesquisar = async () => {
        setDuplicatas([]);
        setDuplicatasSelecionadas(new Set());

        const lista = consultaInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter(Boolean);
        if (lista.length === 0) return;

        setLoading(true);
        try {
            const r = await apiPost("/api/portador/pesquisar", {
                duplicatas: lista,
            });
            if (r.success && r.data?.rows) {
                const ok = r.data.encontradas?.length || 0;
                const nok = r.data.nao_encontradas?.length || 0;
                toastService.success(`${ok} duplicata(s) encontrada(s).`);
                if (nok > 0)
                    toastService.warn(`${nok} duplicata(s) não encontrada(s).`);
                setDuplicatas(r.data.rows);
                const vis = new Set<string>(
                    r.data.rows.map((x: Duplicata) => x.num_docum)
                );
                setDuplicatasAjustadas(
                    (prev) => new Set([...prev].filter((n) => vis.has(n)))
                );
            } else {
                toastService.error(r.message || "Nenhuma duplicata encontrada.");
                setDuplicatasAjustadas(new Set());
            }
        } catch (err) {
            toastService.error("Erro de conexão ao pesquisar.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscarPortador = async () => {
        if (!codigoPortador.trim()) {
            setPortadoresEncontrados([]);
            setPortadorSelecionado(null);
            return;
        }
        setLoading(true);
        try {
            const r = await apiGet(`/api/portador/obter-dados/${codigoPortador}`);
            if (r.success && r.data?.portadores?.length) {
                const ps: Portador[] = r.data.portadores;
                setPortadoresEncontrados(ps);
                setPortadorSelecionado(ps.length === 1 ? ps[0] : null);
            } else {
                toastService.error(r.message || "Portador não encontrado.");
                setPortadoresEncontrados([]);
                setPortadorSelecionado(null);
            }
        } catch (err) {
            toastService.error("Erro ao buscar portador.");
            console.error(err);
            setPortadoresEncontrados([]);
            setPortadorSelecionado(null);
        } finally {
            setLoading(false);
        }
    };

    const runSimulacao = async () => {
        const lista = Array.from(duplicatasSelecionadas);
        if (lista.length === 0 || !codigoPortador || !portadorSelecionado) {
            toastService.warn("Selecione duplicatas e um portador válido para simular.");
            return;
        }
        setLoading(true);
        try {
            const r = await apiPost("/api/portador/ajustar", {
                duplicatas: lista,
                codigoPortador,
                tipoPortador: portadorSelecionado.tipo,
                dryRun: true,
            });

            if (r.success) {
                const preview: any[] = r.data?.preview || r.data?.alteradas || [];
                const rows: SimRow[] = preview.map((p: any) => {
                    const num_docum = String(p.num_docum ?? p.NUM_DOCUM ?? "");
                    const cod_empresa = String(
                        p.cod_empresa ?? p.COD_EMPRESA ?? p.empresa ?? p.EMPRESA ?? ""
                    );
                    const tip_docum = String(p.tip_docum ?? p.IES_TIP_DOCUM ?? "DP");
                    const banco = String(p.banco ?? p.BANCO ?? "não encontrado");
                    const ult_seq_port = Number(p.ult_seq_port ?? p.ULT_SEQ_PORT ?? 0);
                    const prox_seq_port = Number(
                        p.prox_seq_port ?? p.PROX_SEQ_PORT ?? ult_seq_port + 1
                    );
                    const ult_seq_mov = Number(p.ult_seq_mov ?? p.ULT_SEQ_MOV ?? 0);
                    const prox_seq_mov = Number(
                        p.prox_seq_mov ?? p.PROX_SEQ_MOV ?? ult_seq_mov + 1
                    );
                    const saldo = Number(p.saldo ?? p.SALDO ?? 0);
                    const port_orig = String(p.port_orig ?? p.PORT_ORIG ?? "");
                    const tip_orig = String(p.tip_orig ?? p.TIP_ORIG ?? "");
                    const port_novo = String(p.port_novo ?? codigoPortador);
                    const tip_novo = String(p.tip_novo ?? portadorSelecionado.tipo);

                    return {
                        num_docum,
                        cod_empresa,
                        tip_docum,
                        banco,
                        ult_seq_port,
                        prox_seq_port,
                        ult_seq_mov,
                        prox_seq_mov,
                        saldo,
                        port_orig,
                        tip_orig,
                        port_novo,
                        tip_novo,
                    };
                });
                setSimRows(rows);
                setSimOpen(true);
            } else {
                toastService.error(r.message || "Falha na simulação.");
            }
        } catch (err) {
            console.error(err);
            toastService.error("Erro ao simular ajuste.");
        } finally {
            setLoading(false);
        }
    };

    const handleAjustarClick = () => {
        if (simulate) {
            runSimulacao();
        } else {
            if (duplicatasSelecionadas.size > 0 && portadorSelecionado) {
                setIsConfirmModalOpen(true);
            }
        }
    };

    const executeAjuste = async () => {
        setIsConfirmModalOpen(false);
        const lista = Array.from(duplicatasSelecionadas);
        if (lista.length === 0 || !codigoPortador || !portadorSelecionado) return;

        setLoading(true);
        try {
            const r = await apiPost("/api/portador/ajustar", {
                duplicatas: lista,
                codigoPortador,
                tipoPortador: portadorSelecionado.tipo,
                dryRun: false,
            });

            if (r.success) {
                const ok = r.data?.alteradas?.length || 0;
                const ignoradas = r.data?.ignoradas?.length || 0;
                const erros = r.data?.com_erro?.length || 0;

                if (ok > 0) {
                    toastService.success(`${ok} duplicata(s) ajustada(s).`);
                    const numsOk: string[] = (r.data.alteradas || []).map(
                        (a: any) => a.num_docum
                    );
                    setDuplicatasAjustadas((prev) => new Set([...prev, ...numsOk]));
                }
                if (ignoradas > 0) toastService.warn(`${ignoradas} ignorada(s).`);
                if (erros > 0) toastService.error(`${erros} com erro.`);

                setDuplicatasSelecionadas(new Set());
                await atualizarTabela();
            } else {
                toastService.error(r.message || "Falha no ajuste.");
            }
        } catch (err) {
            toastService.error("Erro de conexão ao ajustar.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /* ------------ liberar duplicatas (locks) ------------ */
    const openReleaseModal = async () => {
        try {
            const nums = duplicatas.map((d) => d.num_docum).filter(Boolean);
            if (nums.length === 0) {
                toastService.info("Não há duplicatas na lista atual.");
                return;
            }
            const qs = encodeURIComponent(nums.join(","));
            const r = await apiGet(`/api/portador/ajustadas?nums=${qs}`);
            if (r.success) {
                const items: LockedDup[] = (r.data?.items || []).map((i: any) => ({
                    num_docum: String(i.num_docum),
                    cod_empresa: String(i.cod_empresa ?? ""),
                    tip_docum: String(i.tip_docum ?? ""),
                    expires_in: Number(i.expires_in ?? 0),
                }));
                setLockedServer(items);
                setIsReleaseModalOpen(true);
            } else {
                toastService.error(r.message || "Falha ao consultar travas.");
            }
        } catch (err) {
            console.error(err);
            toastService.error("Erro ao consultar travas.");
        }
    };

    const handleLiberarTodas = async () => {
        try {
            const nums = lockedServer.map((l) => l.num_docum);
            if (nums.length === 0) {
                setIsReleaseModalOpen(false);
                return;
            }
            const r = await apiPost("/api/portador/liberar", { duplicatas: nums });
            if (r.success) {
                setDuplicatasAjustadas((prev) => {
                    const n = new Set(prev);
                    nums.forEach((x) => n.delete(x));
                    return n;
                });
                toastService.success("Travas liberadas.");
                setIsReleaseModalOpen(false);
                setLockedServer([]);
            } else {
                toastService.error(r.message || "Falha ao liberar travas.");
            }
        } catch (err) {
            console.error(err);
            toastService.error("Erro ao liberar travas.");
        }
    };

    const handleLiberarSelecionadas = async (selecionadas: Set<string>) => {
        try {
            const nums = Array.from(selecionadas);
            if (nums.length === 0) return;
            const r = await apiPost("/api/portador/liberar", { duplicatas: nums });
            if (r.success) {
                setDuplicatasAjustadas((prev) => {
                    const n = new Set(prev);
                    nums.forEach((x) => n.delete(x));
                    return n;
                });
                toastService.success(`Travas liberadas (${nums.length}).`);
                setLockedServer((prev) =>
                    prev.filter((l) => !selecionadas.has(l.num_docum))
                );
            } else {
                toastService.error(r.message || "Falha ao liberar as selecionadas.");
            }
        } catch (err) {
            console.error(err);
            toastService.error("Erro ao liberar selecionadas.");
        }
    };

    /* ------------ Opções avançadas: TTL ------------ */
    const applyTtl = async () => {
        try {
            if (!ttlSeconds || ttlSeconds <= 0) {
                toastService.warn("Informe um TTL (segundos) válido.");
                return;
            }
            const r = await apiPost("/api/portador/locks/ttl", {
                ttlSeconds,
                applyExisting: applyExistingLocks,
            });
            if (r.success) {
                toastService.success("Configuração de TTL aplicada.");
            } else {
                toastService.error(r.message || "Falha ao aplicar TTL.");
            }
        } catch (err) {
            console.error(err);
            toastService.error("Erro ao aplicar TTL.");
        }
    };

    /* ------------ utilidades UI ------------ */
    const handleLimpar = () => {
        setConsultaInput("");
        setCodigoPortador("");
        setDuplicatas([]);
        setPortadoresEncontrados([]);
        setPortadorSelecionado(null);
        setDuplicatasSelecionadas(new Set());
        setDuplicatasAjustadas(new Set());
    };

    const handleSelectAll = () => {
        const selecionaveis = duplicatas.filter(
            (d) => !duplicatasAjustadas.has(d.num_docum)
        );
        const all =
            selecionaveis.length > 0 &&
            duplicatasSelecionadas.size === selecionaveis.length;
        setDuplicatasSelecionadas(
            all ? new Set() : new Set(selecionaveis.map((d) => d.num_docum))
        );
    };

    const handleSelectRow = (num: string, checked: boolean) => {
        const n = new Set(duplicatasSelecionadas);
        checked ? n.add(num) : n.delete(num);
        setDuplicatasSelecionadas(n);
    };

    const handleExportCsv = () => {
        if (duplicatas.length === 0) {
            toastService.info("Nada para exportar.");
            return;
        }
        const header = [
            "NUMERO",
            "EMPRESA",
            "CLIENTE",
            "PORTADOR_ATUAL",
            "TIPO_ATUAL",
        ];
        const rows = duplicatas.map((d) => [
            d.num_docum,
            d.cod_empresa,
            (d.nome_cliente || "").replaceAll(";", ","),
            `${d.cod_portador} - ${(d.nome_portador || "").replaceAll(";", ",")}`,
            d.tipo_portador || "",
        ]);
        const csv = [header.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "duplicatas.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const selecionaveis = duplicatas.filter(
        (d) => !duplicatasAjustadas.has(d.num_docum)
    );
    const allSelectable =
        selecionaveis.length > 0 &&
        duplicatasSelecionadas.size === selecionaveis.length;

    /* ========================= Render ========================= */
    return (
        <div className="ajuste-portador-card">
            <div className="ajuste-portador-header">
                <i
                    className="fas fa-university"
                    style={{ marginRight: "1rem", color: "#2563eb" }}
                />
                <span className="ajuste-portador-title">Ajuste do Portador</span>
            </div>

            <div className="ajuste-portador-container">
                <div className="ajuste-portador-controles-superiores">
                    {/* Painel esquerda */}
                    <div className="ajuste-portador-painel-consulta">
                        <label
                            className="ajuste-portador-label"
                            htmlFor="consulta-duplicatas"
                        >
                            Consultar Duplicatas
                        </label>
                        <textarea
                            id="consulta-duplicatas"
                            value={consultaInput}
                            onChange={(e) => setConsultaInput(e.target.value)}
                            placeholder="Informe os números separados por vírgula ou quebra de linha"
                            className="ajuste-portador-textarea"
                            disabled={loading}
                        />
                        <button
                            className="ajuste-portador-btn primary"
                            onClick={handlePesquisar}
                            disabled={loading || !consultaInput.trim()}
                        >
                            <i className="fas fa-search" /> Consultar
                        </button>
                    </div>

                    {/* Painel direita */}
                    <div className="ajuste-portador-painel-ajuste">
                        <div className="ajuste-portador-ajuste-section">
                            <label
                                className="ajuste-portador-label"
                                htmlFor="codigo-portador"
                            >
                                Código do Novo Portador
                            </label>
                            <input
                                id="codigo-portador"
                                type="text"
                                value={codigoPortador}
                                onChange={(e) => setCodigoPortador(e.target.value)}
                                onBlur={handleBuscarPortador}
                                placeholder="Ex: 900"
                                className="ajuste-portador-input"
                                disabled={loading}
                            />

                            {portadorSelecionado && (
                                <div className="ajuste-portador-info">
                                    {portadorSelecionado.nome} ({portadorSelecionado.tipo})
                                </div>
                            )}

                            {portadoresEncontrados.length > 1 && (
                                <>
                                    <label
                                        className="ajuste-portador-label"
                                        htmlFor="tipo-portador"
                                    >
                                        Selecione o Tipo
                                    </label>
                                    <select
                                        id="tipo-portador"
                                        value={portadorSelecionado?.tipo || ""}
                                        onChange={(e) =>
                                            setPortadorSelecionado(
                                                portadoresEncontrados.find(
                                                    (p) => p.tipo === e.target.value
                                                ) || null
                                            )
                                        }
                                        className="ajuste-portador-select"
                                        disabled={loading}
                                    >
                                        <option value="">Selecione...</option>
                                        {portadoresEncontrados.map((p, i) => (
                                            <option key={`${p.tipo}-${i}`} value={p.tipo}>
                                                {p.nome} ({p.tipo})
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {/* Simular + Opções Avançadas */}
                            <div style={{ marginTop: 8 }}>
                                <label
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        cursor: "pointer",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={simulate}
                                        onChange={(e) => setSimulate(e.target.checked)}
                                        disabled={loading}
                                    />
                                    <span>Simular (sem gravar)</span>
                                </label>
                            </div>

                            <details className="ajp-advanced" style={{ marginTop: 6 }}>
                                <summary className="ajp-advanced-toggle">
                                    <i className="fas fa-cog" /> Opções avançadas
                                </summary>
                                <div className="ajp-advanced-panel">
                                    <div className="ajp-advanced-row">
                                        <label className="ajp-advanced-label">
                                            TTL das travas (segundos)
                                        </label>
                                        <div className="ajp-advanced-controls">
                                            <input
                                                type="number"
                                                min={60}
                                                value={ttlSeconds}
                                                onChange={(e) => setTtlSeconds(Number(e.target.value))}
                                                className="ajuste-portador-input"
                                                style={{ maxWidth: 160 }}
                                            />
                                            <label className="ajp-advanced-apply">
                                                <input
                                                    type="checkbox"
                                                    checked={applyExistingLocks}
                                                    onChange={(e) =>
                                                        setApplyExistingLocks(e.target.checked)
                                                    }
                                                    style={{ marginRight: 6 }}
                                                />
                                                Aplicar nas travas atuais
                                            </label>
                                            <button
                                                className="ajuste-portador-btn tertiary"
                                                onClick={applyTtl}
                                            >
                                                Aplicar TTL
                                            </button>
                                        </div>
                                        <div className="ajp-advanced-hint">
                                            Por padrão vale só para novas travas. Marque a opção para
                                            revalidar as travas abertas agora.
                                        </div>
                                    </div>
                                </div>
                            </details>

                            <hr />

                            <button
                                className="ajuste-portador-btn primary full-width"
                                onClick={handleAjustarClick}
                                disabled={
                                    loading ||
                                    duplicatasSelecionadas.size === 0 ||
                                    !portadorSelecionado
                                }
                            >
                                <i className="fas fa-exchange-alt" />{" "}
                                {simulate ? "Simular" : "Ajustar"} ({duplicatasSelecionadas.size}){" "}
                                Selecionada(s)
                            </button>

                            <button
                                className="ajuste-portador-btn secondary full-width"
                                onClick={handleLimpar}
                                disabled={loading}
                            >
                                <i className="fas fa-eraser" /> Limpar Tudo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabela */}
                {duplicatas.length > 0 && (
                    <div className="ajuste-portador-table-card">
                        <div className="ajuste-portador-table-header">
                            <h3>
                                Duplicatas Encontradas ({duplicatas.length}) | Selecionadas (
                                {duplicatasSelecionadas.size}) | Ajustadas (
                                {duplicatasAjustadas.size})
                            </h3>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    className="ajuste-portador-btn tertiary"
                                    onClick={openReleaseModal}
                                >
                                    <i className="fas fa-unlock" /> Liberar Duplicatas
                                </button>
                                <button
                                    className="ajuste-portador-btn export"
                                    onClick={handleExportCsv}
                                >
                                    <i className="fas fa-file-csv" /> Exportar CSV
                                </button>
                            </div>
                        </div>

                        <div className="ajuste-portador-table-wrapper">
                            <table className="ajuste-portador-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={allSelectable}
                                                disabled={selecionaveis.length === 0}
                                            />
                                        </th>
                                        <th>Nº Duplicata</th>
                                        <th>Empresa</th>
                                        <th>Cliente</th>
                                        <th>Portador Atual</th>
                                        <th>Tipo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duplicatas.map((d, idx) => {
                                        const travada = duplicatasAjustadas.has(d.num_docum);
                                        return (
                                            <tr
                                                key={`${d.num_docum}-${idx}`}
                                                className={travada ? "adjusted" : ""}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={duplicatasSelecionadas.has(d.num_docum)}
                                                        onChange={(e) =>
                                                            handleSelectRow(d.num_docum, e.target.checked)
                                                        }
                                                        disabled={travada}
                                                    />
                                                </td>
                                                <td>{d.num_docum}</td>
                                                <td>{d.cod_empresa}</td>
                                                <td title={d.nome_cliente}>{d.nome_cliente}</td>
                                                <td>{`${d.cod_portador} - ${d.nome_portador}`}</td>
                                                <td>{d.tipo_portador}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modais */}
            {isConfirmModalOpen && (
                <ConfirmacaoAjusteModal
                    onConfirm={executeAjuste}
                    onCancel={() => setIsConfirmModalOpen(false)}
                    count={duplicatasSelecionadas.size}
                    codigoPortador={codigoPortador}
                    portador={portadorSelecionado}
                />
            )}

            {isReleaseModalOpen && (
                <ModalLiberarDuplicatas
                    locked={lockedServer}
                    onClose={() => {
                        setIsReleaseModalOpen(false);
                        setLockedServer([]);
                    }}
                    onLiberarTodas={handleLiberarTodas}
                    onLiberarSelecionadas={handleLiberarSelecionadas}
                />
            )}

            <SimulacaoModal
                open={simOpen}
                rows={simRows}
                onClose={() => setSimOpen(false)}
            />
        </div>
    );
};

export default AjustePortador;
