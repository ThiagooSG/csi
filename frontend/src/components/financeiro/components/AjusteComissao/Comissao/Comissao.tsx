import React, { useState, useCallback } from "react";
import { apiPost } from "../../../../../utils/api";
import { toastService } from "../../../../../services/toastService";
import "./comissao.css";

// --- Tipos ---
interface Duplicata {
    num_docum: string;
    cod_empresa: string;
    nome_cliente: string;
    cod_portador: number;
    cod_repres_1: number | null;
    nome_repres_1: string | null;
    pct_comis_1: number;
    cod_repres_2: number | null;
    nome_repres_2: string | null;
    pct_comis_2: number;
    cod_repres_3: number | null;
    nome_repres_3: string | null;
    pct_comis_3: number;
}

interface Representante {
    id: number;
    percentual: string; // string para permitir "1,5" etc
    tipo: string;       // "Representante 1" | "Representante 2" | "Representante 3"
}

const REPRESENTANTE_OPTIONS = ["Representante 1", "Representante 2", "Representante 3"];

// ===== Helpers: Preview/CSV =====
type PreviewRow = {
    num_docum: string;
    cod_empresa: string;
    rep1_before?: number; rep1_after?: number;
    rep2_before?: number; rep2_after?: number;
    rep3_before?: number; rep3_after?: number;
};

const toPct = (v?: number) =>
    typeof v === "number" && !Number.isNaN(v) ? `${v.toFixed(2)}%` : "-";

function buildPreview(dups: Duplicata[], selecionadas: Set<string>, reps: Representante[]): PreviewRow[] {
    // usa selecionadas se houver, senão todas as exibidas
    const universe = selecionadas.size > 0
        ? dups.filter(d => selecionadas.has(d.num_docum))
        : dups;

    const pctByRep: Record<string, number | undefined> = {};
    for (const r of reps) {
        if (!r.tipo || !r.percentual) continue;
        const n = Number(String(r.percentual).replace(",", "."));
        if (!Number.isFinite(n)) continue;
        if (r.tipo === "Representante 1") pctByRep["rep1"] = n;
        if (r.tipo === "Representante 2") pctByRep["rep2"] = n;
        if (r.tipo === "Representante 3") pctByRep["rep3"] = n;
    }

    return universe.map((d) => ({
        num_docum: d.num_docum,
        cod_empresa: d.cod_empresa,
        rep1_before: d.pct_comis_1,
        rep1_after: pctByRep["rep1"],
        rep2_before: d.pct_comis_2,
        rep2_after: pctByRep["rep2"],
        rep3_before: d.pct_comis_3,
        rep3_after: pctByRep["rep3"],
    }));
}

function exportCsv(preview: PreviewRow[]) {
    const headers = [
        "DUPLICATA", "EMPRESA",
        "REP1_ANTES(%)", "REP1_DEPOIS(%)",
        "REP2_ANTES(%)", "REP2_DEPOIS(%)",
        "REP3_ANTES(%)", "REP3_DEPOIS(%)",
    ];
    const rows = preview.map(p => [
        p.num_docum, p.cod_empresa,
        p.rep1_before ?? "", p.rep1_after ?? "",
        p.rep2_before ?? "", p.rep2_after ?? "",
        p.rep3_before ?? "", p.rep3_after ?? "",
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
    a.download = `ajuste-comissao-preview-${new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== Modais =====
const ModalLiberarDuplicatas: React.FC<{
    ajustadas: string[];
    onClose: () => void;
    onLiberarTodas: () => void;
    onLiberarSelecionadas: (s: Set<string>) => void;
}> = ({ ajustadas, onClose, onLiberarTodas, onLiberarSelecionadas }) => {
    const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
    const handleSelect = (num_docum: string, isChecked: boolean) => {
        const nova = new Set(selecionadas);
        isChecked ? nova.add(num_docum) : nova.delete(num_docum);
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
                    {ajustadas.map((dup) => (
                        <div key={dup} className="release-item">
                            <input type="checkbox" id={`release-${dup}`} onChange={(e) => handleSelect(dup, e.target.checked)} />
                            <label htmlFor={`release-${dup}`}>{dup}</label>
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="comissao-btn secondary" onClick={onLiberarTodas}>Liberar Todas</button>
                    <button className="comissao-btn primary" onClick={() => onLiberarSelecionadas(selecionadas)} disabled={selecionadas.size === 0}>
                        Liberar ({selecionadas.size}) Selecionadas
                    </button>
                </div>
            </div>
        </div>
    );
};

const ModalConfirmacao: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    count: number;
    representantes: Representante[];
}> = ({ onConfirm, onCancel, count, representantes }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div className="modal-header">
                <h3>Confirmar Ajuste de Comissão</h3>
                <button onClick={onCancel} className="modal-close-btn">&times;</button>
            </div>
            <div className="confirmation-body">
                <p>Você tem certeza que deseja ajustar <strong>{count} duplicata(s)</strong> com as seguintes comissões?</p>
                <ul>
                    {representantes.filter(r => r.tipo && r.percentual).map(r => (
                        <li key={r.id}><strong>{r.tipo}:</strong> {r.percentual}%</li>
                    ))}
                </ul>
            </div>
            <div className="modal-footer">
                <button className="comissao-btn secondary" onClick={onCancel}>Não</button>
                <button className="comissao-btn primary" onClick={onConfirm}>Sim, Confirmar</button>
            </div>
        </div>
    </div>
);

const ModalSimulacao: React.FC<{
    preview: PreviewRow[];
    onClose: () => void;
}> = ({ preview, onClose }) => (
    <div className="modal-overlay">
        <div className="modal-content modal-xl">
            <div className="modal-header">
                <h3>Resultado da Simulação ({preview.length})</h3>
                <button onClick={onClose} className="modal-close-btn">&times;</button>
            </div>
            <div className="comissao-table-wrapper" style={{ maxHeight: 560 }}>
                <table className="comissao-table sim-table">
                    <thead>
                        <tr>
                            <th>DUPLICATA</th>
                            <th>EMPRESA</th>
                            <th>REP.1 (ANTES → DEPOIS)</th>
                            <th>REP.2 (ANTES → DEPOIS)</th>
                            <th>REP.3 (ANTES → DEPOIS)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preview.map((p, i) => (
                            <tr key={`${p.num_docum}-${i}`}>
                                <td>{p.num_docum}</td>
                                <td>{p.cod_empresa}</td>
                                <td>{toPct(p.rep1_before)} → <strong>{toPct(p.rep1_after)}</strong></td>
                                <td>{toPct(p.rep2_before)} → <strong>{toPct(p.rep2_after)}</strong></td>
                                <td>{toPct(p.rep3_before)} → <strong>{toPct(p.rep3_after)}</strong></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="modal-footer">
                <button className="comissao-btn tertiary" onClick={() => exportCsv(preview)}>Exportar CSV</button>
                <button className="comissao-btn primary" onClick={onClose}>Fechar</button>
            </div>
        </div>
    </div>
);

// ===== Componente Principal =====
const Comissao: React.FC = () => {
    const [consultaInput, setConsultaInput] = useState("");
    const [duplicatas, setDuplicatas] = useState<Duplicata[]>([]);
    const [duplicatasSelecionadas, setDuplicatasSelecionadas] = useState<Set<string>>(new Set());
    const [duplicatasAjustadas, setDuplicatasAjustadas] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const [representantes, setRepresentantes] = useState<Representante[]>([
        { id: 1, percentual: "", tipo: "Representante 1" },
    ]);

    // simulação
    const [dryRun, setDryRun] = useState(false);
    const [simPreview, setSimPreview] = useState<PreviewRow[]>([]);
    const [isSimModalOpen, setIsSimModalOpen] = useState(false);

    const atualizarTabela = useCallback(async () => {
        const lista = consultaInput.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean);
        if (lista.length === 0) return;
        try {
            const resp = await apiPost("/api/comissao/pesquisar", { duplicatas: lista });
            if (resp.success && resp.data?.rows) setDuplicatas(resp.data.rows);
        } catch (err) { console.error("Falha ao auto-atualizar a tabela:", err); }
    }, [consultaInput]);

    const getAvailableOptions = (currentId: number) => {
        const selecionados = representantes
            .filter((rep) => rep.id !== currentId)
            .map((rep) => rep.tipo)
            .filter(Boolean);
        return REPRESENTANTE_OPTIONS.filter((opt) => !selecionados.includes(opt));
    };

    const handlePesquisar = async () => {
        setDuplicatas([]); setDuplicatasSelecionadas(new Set());
        const lista = consultaInput.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean);
        if (lista.length === 0) return;

        setLoading(true);
        try {
            const response = await apiPost("/api/comissao/pesquisar", { duplicatas: lista });
            if (response.success && response.data?.rows) {
                const ok = response.data.encontradas?.length || 0;
                const ne = response.data.nao_encontradas?.length || 0;
                toastService.success(`${ok} duplicata(s) encontrada(s).`);
                if (ne > 0) toastService.warn(`${ne} não encontrada(s).`);

                const novas = response.data.rows;
                setDuplicatas(novas);
                const numeros = new Set(novas.map(d => d.num_docum));
                setDuplicatasAjustadas(prev => new Set([...prev].filter(dup => numeros.has(dup))));
            } else {
                toastService.error(response.message || "Nenhuma duplicata encontrada.");
                setDuplicatasAjustadas(new Set());
            }
        } catch {
            toastService.error("Erro de conexão ao pesquisar.");
        } finally {
            setLoading(false);
        }
    };

    const handleAjustarComissao = () => {
        const repsValidos = representantes.filter(rep => rep.tipo && rep.percentual);
        if (duplicatasSelecionadas.size > 0 && repsValidos.length > 0) {
            // modo simulação (preview client-side)
            if (dryRun) {
                const preview = buildPreview(duplicatas, duplicatasSelecionadas, representantes);
                setSimPreview(preview);
                setIsSimModalOpen(true);
                return;
            }
            // confirmação normal
            setIsConfirmModalOpen(true);
        } else {
            toastService.error("Selecione duplicatas e preencha ao menos um representante.");
        }
    };

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const executeAjuste = async () => {
        setIsConfirmModalOpen(false);
        const duplicatasParaAjustar = Array.from(duplicatasSelecionadas);
        const repsValidos = representantes.filter(rep => rep.tipo && rep.percentual);

        setLoading(true);
        try {
            const response = await apiPost("/api/comissao/ajustar", {
                duplicatas: duplicatasParaAjustar,
                representantes: repsValidos,
            });

            if (response.success && response.data?.alteradas) {
                toastService.success(`${response.data.alteradas.length} duplicata(s) ajustada(s)!`);
                setDuplicatasAjustadas(prev => new Set([...prev, ...response.data.alteradas]));
                setDuplicatasSelecionadas(new Set());
                await atualizarTabela();
            } else {
                toastService.error(response.message || "Falha no ajuste.");
            }
        } catch {
            toastService.error("Erro de conexão ao ajustar.");
        } finally {
            setLoading(false);
        }
    };

    const exportarCsvTabela = () => {
        const preview = buildPreview(duplicatas, duplicatasSelecionadas, representantes);
        if (preview.length === 0) {
            toastService.warn("Não há dados para exportar.");
            return;
        }
        exportCsv(preview);
        toastService.success(`Exportado CSV (${preview.length} linha(s)).`);
    };

    const handleLiberarTodas = () => {
        setDuplicatasAjustadas(new Set());
        setIsReleaseModalOpen(false);
    };
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);

    const handleLiberarSelecionadas = (selecionadas: Set<string>) => {
        const novasAjustadas = new Set(duplicatasAjustadas);
        for (const dup of selecionadas) novasAjustadas.delete(dup);
        setDuplicatasAjustadas(novasAjustadas);
        setIsReleaseModalOpen(false);
    };

    const handleLimpar = () => {
        setConsultaInput("");
        setRepresentantes([{ id: 1, percentual: "", tipo: "Representante 1" }]);
        setDuplicatas([]); setDuplicatasSelecionadas(new Set()); setDuplicatasAjustadas(new Set());
        setDryRun(false); setSimPreview([]); setIsSimModalOpen(false);
    };

    const handleSelectAll = () => {
        const elegiveis = duplicatas.filter(d => !duplicatasAjustadas.has(d.num_docum));
        const all = duplicatasSelecionadas.size === elegiveis.length && elegiveis.length > 0;
        setDuplicatasSelecionadas(all ? new Set() : new Set(elegiveis.map(d => d.num_docum)));
    };

    const handleSelectRow = (num_docum: string, isChecked: boolean) => {
        const nova = new Set(duplicatasSelecionadas);
        isChecked ? nova.add(num_docum) : nova.delete(num_docum);
        setDuplicatasSelecionadas(nova);
    };

    const duplicatasParaSelecionar = duplicatas.filter(d => !duplicatasAjustadas.has(d.num_docum));
    const allSelectableChecked = duplicatasParaSelecionar.length > 0 && duplicatasSelecionadas.size === duplicatasParaSelecionar.length;

    return (
        <div className="comissao-container">
            <div className="comissao-controles-superiores">
                <div className="comissao-painel-consulta">
                    <label className="comissao-label" htmlFor="consulta-duplicatas">Consultar Duplicatas</label>
                    <textarea
                        id="consulta-duplicatas"
                        value={consultaInput}
                        onChange={(e) => setConsultaInput(e.target.value)}
                        placeholder="Informe os números separados por vírgula ou quebra de linha"
                        className="comissao-textarea"
                        disabled={loading}
                    />
                    <button className="comissao-btn primary" onClick={handlePesquisar} disabled={loading || !consultaInput.trim()}>
                        <i className="fas fa-search"></i> Consultar
                    </button>
                </div>

                <div className="comissao-painel-ajuste">
                    <div className="comissao-ajuste-section">
                        <label className="comissao-label">Representantes para Ajuste</label>

                        <div className="comissao-representantes-container">
                            {representantes.map((rep) => (
                                <div key={rep.id} className="comissao-representante-row">
                                    <select
                                        className="comissao-select"
                                        value={rep.tipo}
                                        onChange={(e) => setRepresentantes(representantes.map(r => r.id === rep.id ? { ...r, tipo: e.target.value } : r))}
                                        disabled={loading}
                                    >
                                        <option value="">Selecione...</option>
                                        {getAvailableOptions(rep.id).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                    </select>
                                    <input
                                        type="number"
                                        value={rep.percentual}
                                        onChange={(e) => setRepresentantes(representantes.map(r => r.id === rep.id ? { ...r, percentual: e.target.value } : r))}
                                        placeholder="%"
                                        className="comissao-input-percentual"
                                        disabled={loading || !rep.tipo}
                                        min={0}
                                        step={0.01}
                                    />
                                </div>
                            ))}
                            {representantes.length < 3 && (
                                <button className="comissao-btn adicionar" onClick={() => setRepresentantes([...representantes, { id: Date.now(), percentual: "", tipo: "" }])} disabled={loading}>
                                    <i className="fas fa-plus"></i> Adicionar
                                </button>
                            )}
                        </div>

                        {/* Simular (sem gravar) */}
                        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={loading} />
                            <span>Simular (sem gravar)</span>
                        </label>

                        <hr />
                        <button
                            className="comissao-btn primary full-width"
                            onClick={handleAjustarComissao}
                            disabled={loading || duplicatasSelecionadas.size === 0 || representantes.filter(r => r.tipo && r.percentual).length === 0}
                        >
                            <i className="fas fa-exchange-alt"></i> {dryRun ? "Simular" : "Ajustar"} ({duplicatasSelecionadas.size}) Selecionada(s)
                        </button>
                        <button className="comissao-btn secondary full-width" onClick={handleLimpar} disabled={loading}>
                            <i className="fas fa-eraser"></i> Limpar Tudo
                        </button>
                    </div>
                </div>
            </div>

            {duplicatas.length > 0 && (
                <div className="comissao-table-card">
                    <div className="comissao-table-header">
                        <h3>
                            Duplicatas Encontradas ({duplicatas.length}) | Selecionadas ({duplicatasSelecionadas.size}) | Ajustadas ({duplicatasAjustadas.size})
                        </h3>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="comissao-btn tertiary" onClick={exportarCsvTabela}>
                                <i className="fas fa-file-csv"></i> Exportar CSV
                            </button>
                            {duplicatasAjustadas.size > 0 && (
                                <button className="comissao-btn tertiary" onClick={() => setIsReleaseModalOpen(true)}>
                                    <i className="fas fa-unlock"></i> Liberar Duplicatas
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="comissao-table-wrapper">
                        <table className="comissao-table">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" onChange={handleSelectAll} checked={allSelectableChecked} disabled={duplicatasParaSelecionar.length === 0} /></th>
                                    <th>Nº Duplicata</th>
                                    <th>Cliente</th>
                                    <th>Rep. 1</th>
                                    <th>% Com. 1</th>
                                    <th>Rep. 2</th>
                                    <th>% Com. 2</th>
                                    <th>Rep. 3</th>
                                    <th>% Com. 3</th>
                                </tr>
                            </thead>
                            <tbody>
                                {duplicatas.map((d, index) => {
                                    const isAdjusted = duplicatasAjustadas.has(d.num_docum);
                                    return (
                                        <tr key={`${d.num_docum}-${index}`} className={isAdjusted ? "adjusted" : ""}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={duplicatasSelecionadas.has(d.num_docum)}
                                                    onChange={(e) => handleSelectRow(d.num_docum, e.target.checked)}
                                                    disabled={isAdjusted}
                                                />
                                            </td>
                                            <td>{d.num_docum}</td>
                                            <td title={d.nome_cliente}>{d.nome_cliente}</td>
                                            <td title={d.nome_repres_1 || ""}>{d.nome_repres_1?.trim() || "-"}</td>
                                            <td>{d.pct_comis_1 || 0}%</td>
                                            <td title={d.nome_repres_2 || ""}>{d.nome_repres_2?.trim() || "-"}</td>
                                            <td>{d.pct_comis_2 || 0}%</td>
                                            <td title={d.nome_repres_3 || ""}>{d.nome_repres_3?.trim() || "-"}</td>
                                            <td>{d.pct_comis_3 || 0}%</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isReleaseModalOpen && (
                <ModalLiberarDuplicatas
                    ajustadas={Array.from(duplicatasAjustadas)}
                    onClose={() => setIsReleaseModalOpen(false)}
                    onLiberarTodas={handleLiberarTodas}
                    onLiberarSelecionadas={handleLiberarSelecionadas}
                />
            )}

            {isConfirmModalOpen && (
                <ModalConfirmacao
                    onConfirm={executeAjuste}
                    onCancel={() => setIsConfirmModalOpen(false)}
                    count={duplicatasSelecionadas.size}
                    representantes={representantes}
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

export default Comissao;
