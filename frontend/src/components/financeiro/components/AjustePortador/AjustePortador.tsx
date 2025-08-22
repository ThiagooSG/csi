import React, { useState, useCallback, useMemo, useEffect } from "react";
import { apiGet, apiPost } from "../../../../utils/api";
import { toastService } from "../../../../services/toastService";
import "./ajusteportador.css";

// --- Tipos ---
interface Duplicata {
    num_docum: string;
    cod_empresa: string;
    nome_cliente: string;
    cod_portador: string;
    nome_portador: string;
    tipo_portador: string;
}
interface Portador { nome: string; tipo: string; }
interface Ajustada { cod_empresa: string; ies_tip_docum: string; num_docum: string; }

interface PreviewItem {
    num_docum: string;
    empresa: string;
    tip_docum: string;
    banco: string;
    last_seq_port: number;
    proximo_seq_port: number;
    last_seq_mov: number;
    proximo_seq_mov: number;
    saldo_movto: number;
    portador_orig: string;
    tip_port_orig: string;
    portador_novo: string;
    tip_port_novo: string;
    ies_tip_cobr: string | null;
    cod_agencia: string | null;
    dig_agencia: string | null;
}

// --- Helpers ---
const makeKey = (a: Ajustada) =>
    `${String(a.cod_empresa).trim()}|${String(a.ies_tip_docum).trim()}|${String(a.num_docum).trim()}`;

const normalizeAjustada = (d: any): Ajustada => ({
    cod_empresa: String(d.cod_empresa ?? d.COD_EMPRESA ?? d.empresa ?? ""),
    ies_tip_docum: String(d.ies_tip_docum ?? d.IES_TIP_DOCUM ?? d.tip_docum ?? ""),
    num_docum: String(d.num_docum ?? d.NUM_DOCUM ?? d.num ?? d.numero ?? ""),
});

// CSV builder (mesmos campos do preview)
function buildCsvFromPreview(preview: PreviewItem[]) {
    const headers = [
        "DUPLICATA", "EMPRESA", "TIP.DOC", "BANCO",
        "ULT.SEQ.PORT", "PROX.SEQ.PORT", "ULT.SEQ.MOV", "PROX.SEQ.MOV",
        "SALDO", "PORT.ORIG", "TIP.ORIG", "PORT.NOVO", "TIP.NOVO",
        "IES_TIP_COBR", "AGENCIA", "DIGITO"
    ];
    const rows = preview.map(p => [
        p.num_docum, p.empresa, p.tip_docum, p.banco,
        p.last_seq_port, p.proximo_seq_port, p.last_seq_mov, p.proximo_seq_mov,
        p.saldo_movto, p.portador_orig, p.tip_port_orig, p.portador_novo, p.tip_port_novo,
        p.ies_tip_cobr ?? "", p.cod_agencia ?? "", p.dig_agencia ?? ""
    ]);
    const esc = (v: any) => {
        const s = (v ?? "").toString();
        return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map(r => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ajuste-portador-preview-${new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Modal: Liberar Duplicatas ---
const ModalLiberarDuplicatas: React.FC<{
    ajustadas: Ajustada[];
    onClose: () => void;
    onLiberarTodas: () => Promise<void>;
    onLiberarSelecionadas: (selecionadasKeys: Set<string>) => Promise<void>;
}> = ({ ajustadas, onClose, onLiberarTodas, onLiberarSelecionadas }) => {
    const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
    const allChecked = ajustadas.length > 0 && selecionadas.size === ajustadas.length;

    const toggleAll = () => setSelecionadas(allChecked ? new Set() : new Set(ajustadas.map(makeKey)));
    const handleSelect = (key: string, isChecked: boolean) => {
        const nova = new Set(selecionadas);
        isChecked ? nova.add(key) : nova.delete(key);
        setSelecionadas(nova);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Liberar Duplicatas Ajustadas</h3>
                    <button onClick={onClose} className="modal-close-btn">&times;</button>
                </div>

                <div className="release-list">
                    <div className="release-item">
                        <input type="checkbox" id="release-all" checked={allChecked} onChange={toggleAll} />
                        <label htmlFor="release-all"><strong>Selecionar todas</strong></label>
                    </div>

                    {ajustadas.map((dup) => {
                        const key = makeKey(dup);
                        return (
                            <div key={key} className="release-item">
                                <input
                                    type="checkbox"
                                    id={`release-${key}`}
                                    checked={selecionadas.has(key)}
                                    onChange={(e) => handleSelect(key, e.target.checked)}
                                />
                                <label htmlFor={`release-${key}`}>
                                    {dup.num_docum || "(sem nº)"} &nbsp;|&nbsp; Emp: {dup.cod_empresa || "-"} &nbsp;|&nbsp; Tip: {dup.ies_tip_docum || "-"}
                                </label>
                            </div>
                        );
                    })}
                </div>

                <div className="modal-footer">
                    <button className="ajuste-portador-btn secondary" onClick={onLiberarTodas}>Liberar Todas</button>
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

// --- Modal: Confirmação ---
const ConfirmacaoAjusteModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    count: number;
    portador: Portador | null;
}> = ({ onConfirm, onCancel, count, portador }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div className="modal-header">
                <h3>Confirmar Ajuste</h3>
                <button onClick={onCancel} className="modal-close-btn">&times;</button>
            </div>
            <div className="confirmation-body">
                <p>Você tem certeza que deseja ajustar <strong>{count} duplicata(s)</strong> para o portador:</p>
                <p><strong>{portador?.nome} ({portador?.tipo})</strong>?</p>
            </div>
            <div className="modal-footer">
                <button className="ajuste-portador-btn secondary" onClick={onCancel}>Não</button>
                <button className="ajuste-portador-btn primary" onClick={onConfirm}>Sim, Confirmar</button>
            </div>
        </div>
    </div>
);

// --- Modal: Resultado da Simulação (maior + CSV) ---
const ModalSimulacao: React.FC<{
    preview: PreviewItem[];
    onClose: () => void;
}> = ({ preview, onClose }) => {

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-xl">
                <div className="modal-header">
                    <h3>Resultado da Simulação ({preview.length})</h3>
                    <button onClick={onClose} className="modal-close-btn">&times;</button>
                </div>

                <div className="ajuste-portador-table-wrapper" style={{ maxHeight: 560 }}>
                    <table className="ajuste-portador-table sim-table">
                        <thead>
                            <tr>
                                <th>DUPLICATA</th>
                                <th>EMPRESA</th>
                                <th>TIP.DOC</th>
                                <th>BANCO</th>
                                <th>ULT.SEQ.PORT</th>
                                <th>PRÓX.SEQ.PORT</th>
                                <th>ULT.SEQ.MOV</th>
                                <th>PRÓX.SEQ.MOV</th>
                                <th>SALDO</th>
                                <th>PORT.ORIG</th>
                                <th>TIP.ORIG</th>
                                <th>PORT.NOVO</th>
                                <th>TIP.NOVO</th>
                                <th>IES_TIP_COBR</th>
                                <th>AGENCIA</th>
                                <th>DÍGITO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.map((p, i) => (
                                <tr key={`${p.num_docum}-${i}`}>
                                    <td>{p.num_docum}</td>
                                    <td>{p.empresa}</td>
                                    <td>{p.tip_docum}</td>
                                    <td>{p.banco}</td>
                                    <td>{p.last_seq_port}</td>
                                    <td>{p.proximo_seq_port}</td>
                                    <td>{p.last_seq_mov}</td>
                                    <td>{p.proximo_seq_mov}</td>
                                    <td>{p.saldo_movto}</td>
                                    <td>{p.portador_orig}</td>
                                    <td>{p.tip_port_orig}</td>
                                    <td>{p.portador_novo}</td>
                                    <td>{p.tip_port_novo}</td>
                                    <td>{p.ies_tip_cobr ?? ""}</td>
                                    <td>{p.cod_agencia ?? ""}</td>
                                    <td>{p.dig_agencia ?? ""}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="modal-footer">
                    <button className="ajuste-portador-btn tertiary" onClick={() => buildCsvFromPreview(preview)}>Exportar CSV</button>
                    <button className="ajuste-portador-btn primary" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal ---
const AjustePortador: React.FC = () => {
    const [consultaInput, setConsultaInput] = useState("");
    const [codigoPortador, setCodigoPortador] = useState("");
    const [duplicatas, setDuplicatas] = useState<Duplicata[]>([]);
    const [portadoresEncontrados, setPortadoresEncontrados] = useState<Portador[]>([]);
    const [portadorSelecionado, setPortadorSelecionado] = useState<Portador | null>(null);
    const [loading, setLoading] = useState(false);
    const [duplicatasSelecionadas, setDuplicatasSelecionadas] = useState<Set<string>>(new Set());

    // Simulação
    const [dryRun, setDryRun] = useState(false);
    const [simPreview, setSimPreview] = useState<PreviewItem[]>([]);
    const [isSimModalOpen, setIsSimModalOpen] = useState(false);

    // TTL UI
    const [ttlSeconds, setTtlSeconds] = useState<number>(1800);
    const [ttlApplyExisting, setTtlApplyExisting] = useState<boolean>(false);

    // Travas reais
    const [ajustadas, setAjustadas] = useState<Ajustada[]>([]);
    const ajustadasNumsSet = useMemo(() => new Set(ajustadas.map((a) => a.num_docum)), [ajustadas]);

    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const loadAjustadas = useCallback(async () => {
        try {
            const resp = await apiGet("/api/portador/ajustadas");
            if (resp?.success && Array.isArray(resp.data?.duplicatas)) {
                setAjustadas(resp.data.duplicatas.map(normalizeAjustada));
            } else setAjustadas([]);
        } catch { setAjustadas([]); }
    }, []);

    const loadTtl = useCallback(async () => {
        try {
            const r = await apiGet("/api/portador/ttl");
            if (r?.success && r.data?.ttl_seconds) setTtlSeconds(Number(r.data.ttl_seconds));
        } catch { }
    }, []);

    useEffect(() => { loadAjustadas(); loadTtl(); }, [loadAjustadas, loadTtl]);

    const atualizarTabela = useCallback(async () => {
        const lst = consultaInput.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean);
        if (lst.length === 0) return;
        try {
            const r = await apiPost("/api/portador/pesquisar", { duplicatas: lst });
            if (r.success && r.data?.rows) {
                setDuplicatas(r.data.rows);
                await loadAjustadas();
            }
        } catch (e) { console.error(e); }
    }, [consultaInput, loadAjustadas]);

    const handlePesquisar = async () => {
        setDuplicatas([]); setDuplicatasSelecionadas(new Set());
        const lst = consultaInput.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean);
        if (lst.length === 0) return;

        setLoading(true);
        try {
            const r = await apiPost("/api/portador/pesquisar", { duplicatas: lst });
            if (r.success && r.data?.rows) {
                toastService.success(`${r.data.encontradas?.length || 0} duplicata(s) encontrada(s).`);
                const n = r.data.nao_encontradas?.length || 0;
                if (n > 0) toastService.warn(`${n} duplicata(s) não encontrada(s).`);
                setDuplicatas(r.data.rows);
                await loadAjustadas();
            } else {
                toastService.error(r.message || "Nenhuma duplicata encontrada.");
                setAjustadas([]);
            }
        } catch {
            toastService.error("Erro de conexão ao pesquisar.");
        } finally { setLoading(false); }
    };

    const handleBuscarPortador = async () => {
        if (!codigoPortador.trim()) {
            setPortadoresEncontrados([]); setPortadorSelecionado(null); return;
        }
        setLoading(true);
        try {
            const r = await apiGet(`/api/portador/obter-dados/${codigoPortador}`);
            if (r.success && r.data?.portadores?.length) {
                const L = r.data.portadores; setPortadoresEncontrados(L);
                setPortadorSelecionado(L.length === 1 ? L[0] : null);
            } else {
                toastService.error(r.message || "Portador não encontrado.");
                setPortadoresEncontrados([]); setPortadorSelecionado(null);
            }
        } catch {
            toastService.error("Erro ao buscar portador.");
            setPortadoresEncontrados([]); setPortadorSelecionado(null);
        } finally { setLoading(false); }
    };

    const handleAjustarPortador = () => {
        if (duplicatasSelecionadas.size > 0 && portadorSelecionado) setIsConfirmModalOpen(true);
    };

    // Exportar CSV direto da Tabela Principal (usa dry-run para obter preview)
    const exportarCsvTabelaPrincipal = async () => {
        try {
            if (!portadorSelecionado || !codigoPortador) {
                toastService.warn("Informe o novo portador e tipo antes de exportar.");
                return;
            }
            const docs = Array.from(duplicatasSelecionadas.size ? duplicatasSelecionadas : new Set(duplicatas.map(d => d.num_docum)));
            if (docs.length === 0) {
                toastService.warn("Nenhuma duplicata para exportar.");
                return;
            }
            const r = await apiPost("/api/portador/ajustar", {
                duplicatas: docs,
                codigoPortador,
                tipoPortador: portadorSelecionado.tipo,
                dryRun: true,
            });
            const preview: PreviewItem[] = Array.isArray(r?.data?.preview) ? r.data.preview : [];
            if (preview.length === 0) {
                toastService.warn("Nada a exportar.");
                return;
            }
            buildCsvFromPreview(preview);
            toastService.success(`Exportado CSV (${preview.length} linha(s)).`);
        } catch (e) {
            toastService.error("Falha ao gerar CSV.");
            console.error(e);
        }
    };

    const executeAjuste = async () => {
        setIsConfirmModalOpen(false);
        const docs = Array.from(duplicatasSelecionadas);
        if (docs.length === 0 || !codigoPortador || !portadorSelecionado) return;

        setLoading(true);
        try {
            const r = await apiPost("/api/portador/ajustar", {
                duplicatas: docs,
                codigoPortador,
                tipoPortador: portadorSelecionado.tipo,
                dryRun,
            });

            // DRY-RUN → abre modal com preview
            if (r?.success && r.data?.mode === "dryRun") {
                const preview = Array.isArray(r.data?.preview) ? (r.data.preview as PreviewItem[]) : [];
                setSimPreview(preview);
                setIsSimModalOpen(true);
                toastService.info(`Simulação: ${preview.length} duplicata(s). Nenhuma alteração gravada.`);
                return;
            }

            // sucesso
            if (r?.success && Array.isArray(r.data?.alteradas)) {
                toastService.success(`${r.data.alteradas.length} duplicata(s) ajustada(s) com sucesso!`);
                const novas = (r.data.alteradas as any[]).map((a) =>
                    normalizeAjustada({
                        cod_empresa: a.empresa ?? a.cod_empresa,
                        ies_tip_docum: a.tip_docum ?? a.ies_tip_docum,
                        num_docum: a.num_docum,
                    })
                );
                setAjustadas(prev => {
                    const map = new Map(prev.map(x => [makeKey(x), x]));
                    for (const n of novas) map.set(makeKey(n), n);
                    return Array.from(map.values());
                });
                setDuplicatasSelecionadas(new Set());
                await atualizarTabela();
                return;
            }

            // bloqueio 423
            if (r?.status === 423) {
                const dup = r?.duplicata ?? r?.data?.duplicata;
                if (dup) {
                    const n = normalizeAjustada(dup);
                    setAjustadas(prev => {
                        const map = new Map(prev.map(x => [makeKey(x), x]));
                        map.set(makeKey(n), n); return Array.from(map.values());
                    });
                }
                toastService.warn(r?.message || "Há duplicata(s) travada(s). Libere para novo ajuste.");
                setIsReleaseModalOpen(true);
                return;
            }

            toastService.error(r?.message || "Falha no ajuste.");
        } catch (err: any) {
            const status = err?.response?.status ?? err?.status;
            if (status === 423) {
                const dup = err?.response?.data?.duplicata;
                if (dup) {
                    const n = normalizeAjustada(dup);
                    setAjustadas(prev => {
                        const map = new Map(prev.map(x => [makeKey(x), x]));
                        map.set(makeKey(n), n); return Array.from(map.values());
                    });
                }
                toastService.warn(err?.response?.data?.message || "Há duplicata(s) travada(s). Libere para novo ajuste.");
                setIsReleaseModalOpen(true);
            } else {
                toastService.error("Erro de conexão ao ajustar.");
                console.error(err);
            }
        } finally { setLoading(false); }
    };

    // TTL handlers
    const aplicarTtl = async () => {
        const s = Number(ttlSeconds);
        if (!Number.isFinite(s) || s < 60 || s > 86400) {
            toastService.warn("TTL inválido (60–86400).");
            return;
        }
        try {
            const r = await apiPost("/api/portador/ttl", { seconds: s, applyToExisting: ttlApplyExisting });
            if (r?.success) {
                toastService.success(`TTL ajustado para ${r.data?.ttl_seconds || s}s${ttlApplyExisting ? " (aplicado às travas atuais)" : ""}.`);
            } else {
                toastService.error(r?.message || "Falha ao ajustar TTL.");
            }
        } catch (e) {
            toastService.error("Erro ao ajustar TTL.");
            console.error(e);
        }
    };

    const abrirModalLiberar = async () => { await loadAjustadas(); setIsReleaseModalOpen(true); };

    const handleLiberarTodas = async () => {
        try {
            const r = await apiPost("/api/portador/liberar", { todas: true });
            if (r.success) {
                toastService.success("Todas as duplicatas foram liberadas.");
                await loadAjustadas(); setIsReleaseModalOpen(false); await atualizarTabela();
            } else {
                toastService.error(r.message || "Falha ao liberar duplicatas.");
            }
        } catch { toastService.error("Erro ao liberar duplicatas."); }
    };

    const handleLiberarSelecionadas = async (selecionadasKeys: Set<string>) => {
        try {
            const wanted = new Set(selecionadasKeys);
            const payload = ajustadas
                .filter((a) => wanted.has(makeKey(a)))
                .map((a) => ({ cod_empresa: a.cod_empresa, ies_tip_docum: a.ies_tip_docum, num_docum: a.num_docum }));
            const r = await apiPost("/api/portador/liberar", { duplicatas: payload });
            if (r.success) {
                toastService.success("Duplicata(s) liberada(s).");
                await loadAjustadas(); setIsReleaseModalOpen(false); await atualizarTabela();
            } else {
                toastService.error(r.message || "Falha ao liberar duplicatas.");
            }
        } catch { toastService.error("Erro ao liberar duplicatas."); }
    };

    const handleLimpar = () => {
        setConsultaInput(""); setCodigoPortador(""); setDuplicatas([]);
        setPortadoresEncontrados([]); setPortadorSelecionado(null);
        setDuplicatasSelecionadas(new Set()); setAjustadas([]);
        setDryRun(false); setSimPreview([]); setIsSimModalOpen(false);
    };

    const handleSelectAll = () => {
        const candidates = duplicatas.filter(d => !ajustadasNumsSet.has(d.num_docum));
        const all = duplicatasSelecionadas.size === candidates.length && candidates.length > 0;
        setDuplicatasSelecionadas(all ? new Set() : new Set(candidates.map(d => d.num_docum)));
    };
    const handleSelectRow = (num: string, c: boolean) => {
        const s = new Set(duplicatasSelecionadas);
        c ? s.add(num) : s.delete(num);
        setDuplicatasSelecionadas(s);
    };

    const ajustadasCount = ajustadas.length;
    const candidates = duplicatas.filter(d => !ajustadasNumsSet.has(d.num_docum));
    const allSelectableChecked = candidates.length > 0 && duplicatasSelecionadas.size === candidates.length;

    return (
        <div className="ajuste-portador-card">
            <div className="ajuste-portador-header">
                <i className="fas fa-university" style={{ marginRight: '1rem', color: '#2563eb' }}></i>
                <span className="ajuste-portador-title">Ajuste do Portador</span>
            </div>

            <div className="ajuste-portador-container">
                <div className="ajuste-portador-controles-superiores">
                    <div className="ajuste-portador-painel-consulta">
                        <label className="ajuste-portador-label" htmlFor="consulta-duplicatas">Consultar Duplicatas</label>
                        <textarea
                            id="consulta-duplicatas"
                            value={consultaInput}
                            onChange={(e) => setConsultaInput(e.target.value)}
                            placeholder="Informe os números separados por vírgula ou quebra de linha"
                            className="ajuste-portador-textarea"
                            disabled={loading}
                        />
                        <button className="ajuste-portador-btn primary" onClick={handlePesquisar} disabled={loading || !consultaInput.trim()}>
                            <i className="fas fa-search"></i> Consultar
                        </button>
                    </div>

                    <div className="ajuste-portador-painel-ajuste">
                        <div className="ajuste-portador-ajuste-section">
                            <label className="ajuste-portador-label" htmlFor="codigo-portador">Código do Novo Portador</label>
                            <input
                                id="codigo-portador"
                                type="text"
                                value={codigoPortador}
                                onChange={(e) => setCodigoPortador(e.target.value)}
                                onBlur={handleBuscarPortador}
                                placeholder="Ex: 123"
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
                                    <label className="ajuste-portador-label" htmlFor="tipo-portador">Selecione o Tipo</label>
                                    <select
                                        id="tipo-portador"
                                        value={portadorSelecionado?.tipo || ""}
                                        onChange={(e) => setPortadorSelecionado(portadoresEncontrados.find((p) => p.tipo === e.target.value) || null)}
                                        className="ajuste-portador-select"
                                        disabled={loading}
                                    >
                                        <option value="">Selecione...</option>
                                        {portadoresEncontrados.map((p, i) => (
                                            <option key={`${p.tipo}-${i}`} value={p.tipo}>{p.nome} ({p.tipo})</option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {/* Simular (dry-run) + Opções avançadas */}
                            <div style={{ display: "grid", gap: 8 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input
                                        id="dry-run"
                                        type="checkbox"
                                        checked={dryRun}
                                        onChange={(e) => setDryRun(e.target.checked)}
                                        disabled={loading}
                                    />
                                    <span>Simular (sem gravar)</span>
                                </label>

                                {/* Opções avançadas (colapsadas por padrão) */}
                                <details className="ajp-advanced">
                                    <summary className="ajp-advanced-toggle">
                                        <i className="fas fa-cog"></i> Opções avançadas
                                    </summary>

                                    <div className="ajp-advanced-panel">
                                        <div className="ajp-advanced-row">
                                            <div className="ajp-advanced-label">TTL das travas (segundos)</div>

                                            <div className="ajp-advanced-controls">
                                                <input
                                                    type="number"
                                                    min={60}
                                                    max={86400}
                                                    step={60}
                                                    value={ttlSeconds}
                                                    onChange={(e) => setTtlSeconds(Number(e.target.value))}
                                                    className="ajuste-portador-input"
                                                    style={{ maxWidth: 140 }}
                                                />

                                                <label className="ajp-advanced-apply">
                                                    <input
                                                        type="checkbox"
                                                        checked={ttlApplyExisting}
                                                        onChange={(e) => setTtlApplyExisting(e.target.checked)}
                                                    />
                                                    <span>Aplicar nas travas atuais</span>
                                                </label>

                                                <button className="ajuste-portador-btn tertiary" onClick={aplicarTtl}>
                                                    Aplicar TTL
                                                </button>
                                            </div>
                                        </div>

                                        <div className="ajp-advanced-hint">
                                            Raramente necessário. O padrão vem do servidor.
                                        </div>
                                    </div>
                                </details>
                            </div>

                            <hr />
                            <button
                                className="ajuste-portador-btn primary full-width"
                                onClick={handleAjustarPortador}
                                disabled={loading || duplicatasSelecionadas.size === 0 || !portadorSelecionado}
                            >
                                <i className="fas fa-exchange-alt"></i> {dryRun ? "Simular" : "Ajustar"} ({duplicatasSelecionadas.size})
                            </button>
                            <button className="ajuste-portador-btn secondary full-width" onClick={handleLimpar} disabled={loading}>
                                <i className="fas fa-eraser"></i> Limpar Tudo
                            </button>
                        </div>
                    </div>
                </div>

                {duplicatas.length > 0 && (
                    <div className="ajuste-portador-table-card">
                        <div className="ajuste-portador-table-header">
                            <h3>
                                Duplicatas Encontradas ({duplicatas.length}) | Selecionadas ({duplicatasSelecionadas.size}) | Ajustadas ({ajustadasCount})
                            </h3>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="ajuste-portador-btn tertiary" onClick={exportarCsvTabelaPrincipal}>
                                    <i className="fas fa-file-csv"></i> Exportar CSV
                                </button>
                                {ajustadasCount > 0 && (
                                    <button className="ajuste-portador-btn tertiary" onClick={abrirModalLiberar}>
                                        <i className="fas fa-unlock"></i> Liberar Duplicatas
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="ajuste-portador-table-wrapper">
                            <table className="ajuste-portador-table">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox" onChange={handleSelectAll} checked={allSelectableChecked} disabled={candidates.length === 0} /></th>
                                        <th>Nº Duplicata</th>
                                        <th>Empresa</th>
                                        <th>Cliente</th>
                                        <th>Portador Atual</th>
                                        <th>Tipo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duplicatas.map((d, idx) => {
                                        const isAdjusted = ajustadasNumsSet.has(d.num_docum);
                                        return (
                                            <tr key={`${d.num_docum}-${idx}`} className={isAdjusted ? "adjusted" : ""}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={duplicatasSelecionadas.has(d.num_docum)}
                                                        onChange={(e) => handleSelectRow(d.num_docum, e.target.checked)}
                                                        disabled={isAdjusted}
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

            {isReleaseModalOpen && (
                <ModalLiberarDuplicatas
                    ajustadas={ajustadas}
                    onClose={() => setIsReleaseModalOpen(false)}
                    onLiberarTodas={handleLiberarTodas}
                    onLiberarSelecionadas={handleLiberarSelecionadas}
                />
            )}

            {isConfirmModalOpen && (
                <ConfirmacaoAjusteModal
                    onConfirm={executeAjuste}
                    onCancel={() => setIsConfirmModalOpen(false)}
                    count={duplicatasSelecionadas.size}
                    portador={portadorSelecionado}
                />
            )}

            {isSimModalOpen && (
                <ModalSimulacao
                    preview={simPreview}
                    onClose={() => setIsSimModalOpen(false)}
                />
            )}
        </div>
    );
};

export default AjustePortador;