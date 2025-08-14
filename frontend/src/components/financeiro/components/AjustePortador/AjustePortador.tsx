import React, { useState, useCallback } from "react";
import { apiGet, apiPost } from "../../../../utils/api";
import { toastService } from "../../../../services/toastService";
import "./ajusteportador.css";

// --- Interfaces ---
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

// --- Sub-Componentes (Modais) ---
const ModalLiberarDuplicatas: React.FC<{
    ajustadas: string[];
    onClose: () => void;
    onLiberarTodas: () => void;
    onLiberarSelecionadas: (selecionadas: Set<string>) => void;
}> = ({ ajustadas, onClose, onLiberarTodas, onLiberarSelecionadas }) => {
    const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

    const handleSelect = (num_docum: string, isChecked: boolean) => {
        const novaSelecao = new Set(selecionadas);
        if (isChecked) novaSelecao.add(num_docum);
        else novaSelecao.delete(num_docum);
        setSelecionadas(novaSelecao);
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
                    <button className="ajuste-portador-btn secondary" onClick={onLiberarTodas}>Liberar Todas</button>
                    <button className="ajuste-portador-btn primary" onClick={() => onLiberarSelecionadas(selecionadas)} disabled={selecionadas.size === 0}>
                        Liberar ({selecionadas.size}) Selecionadas
                    </button>
                </div>
            </div>
        </div>
    );
};
const ConfirmacaoAjusteModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    count: number;
    portador: Portador | null;
}> = ({ onConfirm, onCancel, count, portador }) => {
    return (
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
    const [duplicatasAjustadas, setDuplicatasAjustadas] = useState<Set<string>>(new Set());
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const atualizarTabela = useCallback(async () => {
        const duplicatasConsulta = consultaInput.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean);
        if (duplicatasConsulta.length === 0) return;
        try {
            const response = await apiPost("/api/portador/pesquisar", { duplicatas: duplicatasConsulta });
            if (response.success && response.data?.rows) {
                setDuplicatas(response.data.rows);
            }
        } catch (err) {
            console.error("Falha ao auto-atualizar a tabela:", err);
        }
    }, [consultaInput]);

    const handlePesquisar = async () => {
        setDuplicatas([]);
        setDuplicatasSelecionadas(new Set());
        const duplicatasConsulta = consultaInput.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean);
        if (duplicatasConsulta.length === 0) return;

        setLoading(true);
        try {
            const response = await apiPost("/api/portador/pesquisar", { duplicatas: duplicatasConsulta });
            if (response.success && response.data?.rows) {
                const encontradasCount = response.data.encontradas?.length || 0;
                const naoEncontradasCount = response.data.nao_encontradas?.length || 0;
                toastService.success(`${encontradasCount} duplicata(s) encontrada(s).`);
                if (naoEncontradasCount > 0) toastService.warn(`${naoEncontradasCount} duplicata(s) não encontrada(s).`);

                const duplicatasEncontradas = response.data.rows;
                setDuplicatas(duplicatasEncontradas);
                const numerosDaNovaConsulta = new Set(duplicatasEncontradas.map(d => d.num_docum));
                setDuplicatasAjustadas(prev => new Set([...prev].filter(dup => numerosDaNovaConsulta.has(dup))));
            } else {
                toastService.error(response.message || "Nenhuma duplicata encontrada.");
                setDuplicatasAjustadas(new Set());
            }
        } catch (err) {
            toastService.error("Erro de conexão ao pesquisar.");
            console.error("Erro ao pesquisar duplicatas:", err);
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
            const response = await apiGet(`/api/portador/obter-dados/${codigoPortador}`);
            if (response.success && response.data?.portadores?.length) {
                const portadores = response.data.portadores;
                setPortadoresEncontrados(portadores);
                if (portadores.length === 1) setPortadorSelecionado(portadores[0]);
                else setPortadorSelecionado(null);
            } else {
                toastService.error(response.message || "Portador não encontrado.");
                setPortadoresEncontrados([]);
                setPortadorSelecionado(null);
            }
        } catch (err) {
            toastService.error("Erro ao buscar portador.");
            console.error("Erro ao buscar portador:", err);
            setPortadoresEncontrados([]);
            setPortadorSelecionado(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAjustarPortador = () => {
        if (duplicatasSelecionadas.size > 0 && portadorSelecionado) {
            setIsConfirmModalOpen(true);
        }
    };

    const executeAjuste = async () => {
        setIsConfirmModalOpen(false);
        const duplicatasParaAjustar = Array.from(duplicatasSelecionadas);
        if (duplicatasParaAjustar.length === 0 || !codigoPortador || !portadorSelecionado) return;

        setLoading(true);
        try {
            const response = await apiPost("/api/portador/ajustar", {
                duplicatas: duplicatasParaAjustar,
                codigoPortador,
                tipoPortador: portadorSelecionado.tipo,
            });

            if (response.success && response.data?.alteradas) {
                toastService.success(`${response.data.alteradas.length} duplicata(s) ajustada(s) com sucesso!`);
                setDuplicatasAjustadas(prev => new Set([...prev, ...response.data.alteradas]));
                setDuplicatasSelecionadas(new Set());
                await atualizarTabela();
            } else {
                toastService.error(response.message || "Falha no ajuste.");
            }
        } catch (err) {
            toastService.error("Erro de conexão ao ajustar.");
            console.error("Erro ao conectar com o servidor para ajuste.", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLiberarTodas = () => {
        setDuplicatasAjustadas(new Set());
        setIsReleaseModalOpen(false);
    };

    const handleLiberarSelecionadas = (selecionadas: Set<string>) => {
        const novasAjustadas = new Set(duplicatasAjustadas);
        for (const dup of selecionadas) {
            novasAjustadas.delete(dup);
        }
        setDuplicatasAjustadas(novasAjustadas);
        setIsReleaseModalOpen(false);
    };

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
        const duplicatasParaSelecionar = duplicatas.filter(d => !duplicatasAjustadas.has(d.num_docum));
        const allSelected = duplicatasSelecionadas.size === duplicatasParaSelecionar.length && duplicatasParaSelecionar.length > 0;
        if (allSelected) {
            setDuplicatasSelecionadas(new Set());
        } else {
            setDuplicatasSelecionadas(new Set(duplicatasParaSelecionar.map(d => d.num_docum)));
        }
    };

    const handleSelectRow = (num_docum: string, isChecked: boolean) => {
        const novaSelecao = new Set(duplicatasSelecionadas);
        if (isChecked) novaSelecao.add(num_docum);
        else novaSelecao.delete(num_docum);
        setDuplicatasSelecionadas(novaSelecao);
    };

    const duplicatasParaSelecionar = duplicatas.filter(d => !duplicatasAjustadas.has(d.num_docum));
    const allSelectableChecked = duplicatasParaSelecionar.length > 0 && duplicatasSelecionadas.size === duplicatasParaSelecionar.length;

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
                        <textarea id="consulta-duplicatas" value={consultaInput} onChange={(e) => setConsultaInput(e.target.value)} placeholder="Informe os números separados por vírgula ou quebra de linha" className="ajuste-portador-textarea" disabled={loading} />
                        <button className="ajuste-portador-btn primary" onClick={handlePesquisar} disabled={loading || !consultaInput.trim()}>
                            <i className="fas fa-search"></i> Consultar
                        </button>
                    </div>

                    <div className="ajuste-portador-painel-ajuste">
                        <div className="ajuste-portador-ajuste-section">
                            <label className="ajuste-portador-label" htmlFor="codigo-portador">Código do Novo Portador</label>
                            <input id="codigo-portador" type="text" value={codigoPortador} onChange={(e) => setCodigoPortador(e.target.value)} onBlur={handleBuscarPortador} placeholder="Ex: 123" className="ajuste-portador-input" disabled={loading} />

                            {portadorSelecionado && <div className="ajuste-portador-info">{portadorSelecionado.nome} ({portadorSelecionado.tipo})</div>}

                            {portadoresEncontrados.length > 1 && (
                                <>
                                    <label className="ajuste-portador-label" htmlFor="tipo-portador">Selecione o Tipo</label>
                                    <select id="tipo-portador" value={portadorSelecionado?.tipo || ""} onChange={(e) => setPortadorSelecionado(portadoresEncontrados.find(p => p.tipo === e.target.value) || null)} className="ajuste-portador-select" disabled={loading}>
                                        <option value="">Selecione...</option>
                                        {portadoresEncontrados.map((p, i) => <option key={`${p.tipo}-${i}`} value={p.tipo}>{p.nome} ({p.tipo})</option>)}
                                    </select>
                                </>
                            )}
                            <hr />
                            <button className="ajuste-portador-btn primary full-width" onClick={handleAjustarPortador} disabled={loading || duplicatasSelecionadas.size === 0 || !portadorSelecionado}>
                                <i className="fas fa-exchange-alt"></i> Ajustar ({duplicatasSelecionadas.size}) Selecionada(s)
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
                            <h3>Duplicatas Encontradas ({duplicatas.length}) | Selecionadas ({duplicatasSelecionadas.size}) | Ajustadas ({duplicatasAjustadas.size})</h3>
                            {duplicatasAjustadas.size > 0 && (
                                <button className="ajuste-portador-btn tertiary" onClick={() => setIsReleaseModalOpen(true)}>
                                    <i className="fas fa-unlock"></i> Liberar Duplicatas
                                </button>
                            )}
                        </div>
                        <div className="ajuste-portador-table-wrapper">
                            <table className="ajuste-portador-table">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox" onChange={handleSelectAll} checked={allSelectableChecked} disabled={duplicatasParaSelecionar.length === 0} /></th>
                                        <th>Nº Duplicata</th>
                                        <th>Empresa</th>
                                        <th>Cliente</th>
                                        <th>Portador Atual</th>
                                        <th>Tipo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duplicatas.map((d, index) => {
                                        const isAdjusted = duplicatasAjustadas.has(d.num_docum);
                                        return (
                                            <tr key={`${d.num_docum}-${index}`} className={isAdjusted ? 'adjusted' : ''}>
                                                <td><input type="checkbox" checked={duplicatasSelecionadas.has(d.num_docum)} onChange={(e) => handleSelectRow(d.num_docum, e.target.checked)} disabled={isAdjusted} /></td>
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

            {isReleaseModalOpen && <ModalLiberarDuplicatas ajustadas={Array.from(duplicatasAjustadas)} onClose={() => setIsReleaseModalOpen(false)} onLiberarTodas={handleLiberarTodas} onLiberarSelecionadas={handleLiberarSelecionadas} />}
            {isConfirmModalOpen && <ConfirmacaoAjusteModal onConfirm={executeAjuste} onCancel={() => setIsConfirmModalOpen(false)} count={duplicatasSelecionadas.size} portador={portadorSelecionado} />}
        </div>
    );
};

export default AjustePortador;