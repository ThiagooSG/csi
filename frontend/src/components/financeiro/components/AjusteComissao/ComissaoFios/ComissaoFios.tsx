import React, { useState } from "react";
import { apiGet, apiPost } from "../../../../../utils/api";
import "./comissaofios.css";

// --- DEFINIÇÃO DAS INTERFACES E CONSTANTES ---
interface Duplicata {
    num_docum: string;
    cod_empresa: string;
    nome_cliente: string;
    cod_repres_1: string;
    nome_representante_1: string;
    pct_comis_1: string;
}

const REPRESENTANTE_OPTIONS = [
    { value: "", label: "Selecione..." },
    { value: "142", label: "142" },
    { value: "182", label: "182" },
    { value: "214", label: "214" },
    { value: "221", label: "221" },
    { value: "233", label: "233" },
];

const COMISSAO_OPTIONS = [
    { value: "", label: "Selecione..." },
    { value: "1", label: "1%" },
    { value: "1.5", label: "1.5%" },
    { value: "2", label: "2%" },
];

// --- SUB-COMPONENTE: MODAL PARA LIBERAR DUPLICATAS ---
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
                    <button onClick={onClose} className="modal-close-btn">
                        &times;
                    </button>
                </div>
                <div className="release-list">
                    {ajustadas.map((dup) => (
                        <div key={dup} className="release-item">
                            <input
                                type="checkbox"
                                id={`release-${dup}`}
                                onChange={(e) => handleSelect(dup, e.target.checked)}
                            />
                            <label htmlFor={`release-${dup}`}>{dup}</label>
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button
                        className="comissao-fios-btn secondary"
                        onClick={onLiberarTodas}
                    >
                        Liberar Todas
                    </button>
                    <button
                        className="comissao-fios-btn primary"
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

// --- COMPONENTE PRINCIPAL ---
const ComissaoFios: React.FC = () => {
    const [consultaInput, setConsultaInput] = useState("");
    const [duplicatas, setDuplicatas] = useState<Duplicata[]>([]);
    const [duplicatasSelecionadas, setDuplicatasSelecionadas] = useState<
        Set<string>
    >(new Set());
    const [duplicatasAjustadas, setDuplicatasAjustadas] = useState<Set<string>>(
        new Set()
    );
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<any>(null);
    const [representante, setRepresentante] = useState("");
    const [comissao, setComissao] = useState("");
    const [nomeRepresentante, setNomeRepresentante] = useState("");

    /**
     * Lógica de pesquisa com o novo travamento inteligente.
     */
    const handlePesquisar = async () => {
        setFeedback(null);
        setDuplicatas([]);
        setDuplicatasSelecionadas(new Set());
        const duplicatasConsulta = consultaInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter(Boolean);
        if (duplicatasConsulta.length === 0) {
            setFeedback({
                type: "error",
                message: "Informe pelo menos uma duplicata para pesquisar.",
            });
            return;
        }
        setLoading(true);
        try {
            const response = await apiPost("/api/comissao-fios/pesquisar", {
                duplicatas: duplicatasConsulta,
            });
            if (response.success && response.data?.rows?.length > 0) {
                const novasDuplicatas = response.data.rows;
                setDuplicatas(novasDuplicatas);

                // --- LÓGICA DE TRAVAMENTO INTELIGENTE ---
                // 1. Cria um conjunto com os números das duplicatas da nova consulta.
                const numerosDaNovaConsulta = new Set(
                    novasDuplicatas.map((d) => d.num_docum)
                );
                // 2. Filtra a lista de ajustadas, mantendo apenas aquelas que também existem na nova consulta.
                setDuplicatasAjustadas((prevAjustadas) => {
                    const novasAjustadasFiltradas = new Set<string>();
                    for (const dup of prevAjustadas) {
                        if (numerosDaNovaConsulta.has(dup)) {
                            novasAjustadasFiltradas.add(dup);
                        }
                    }
                    return novasAjustadasFiltradas;
                });

                setFeedback({
                    type: "success",
                    encontradas: response.data.encontradas,
                    nao_encontradas: response.data.nao_encontradas,
                });
            } else {
                setFeedback({
                    type: "error",
                    message: response.data?.message || "Nenhuma duplicata encontrada.",
                });
                // Se a pesquisa não retornar nada, limpa a lista de ajustadas também.
                setDuplicatasAjustadas(new Set());
            }
        } catch (err) {
            setFeedback({
                type: "error",
                message: "Erro ao conectar com o servidor.",
            });
        }
        setLoading(false);
    };

    const handleAjustarComissao = async () => {
        setFeedback(null);
        const duplicatasParaAjustar = Array.from(duplicatasSelecionadas);
        if (duplicatasParaAjustar.length === 0) {
            setFeedback({
                type: "error",
                message: "Selecione pelo menos uma duplicata para ajustar.",
            });
            return;
        }
        if (!representante || !comissao) {
            setFeedback({
                type: "error",
                message: "Selecione um representante e a comissão.",
            });
            return;
        }
        setLoading(true);
        try {
            const response = await apiPost("/api/comissao-fios/ajustar", {
                duplicatas: duplicatasParaAjustar,
                representante,
                comissao,
            });
            if (response.success && response.data?.alteradas) {
                setDuplicatasAjustadas(
                    (prev) => new Set([...prev, ...response.data.alteradas])
                );
                setDuplicatasSelecionadas(new Set());
                setFeedback({ type: "success", ...response.data });
            } else {
                setFeedback({
                    type: "error",
                    message: response.data?.message || "Erro ao ajustar.",
                });
            }
        } catch (err) {
            setFeedback({
                type: "error",
                message: "Erro ao conectar com o servidor.",
            });
        }
        setLoading(false);
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
        setRepresentante("");
        setComissao("");
        setNomeRepresentante("");
        setDuplicatas([]);
        setDuplicatasSelecionadas(new Set());
        setDuplicatasAjustadas(new Set());
        setFeedback(null);
    };

    const handleRepresentanteChange = async (novoRepresentante: string) => {
        setRepresentante(novoRepresentante);
        setNomeRepresentante("");
        if (novoRepresentante) {
            try {
                const response = await apiGet(
                    `/api/comissao-fios/representante/${novoRepresentante}`
                );
                setNomeRepresentante(
                    response.success ? response.data.nome : "Nome não encontrado"
                );
            } catch (err) {
                setNomeRepresentante("Erro ao carregar nome.");
            }
        }
    };

    const duplicatasParaSelecionar = duplicatas.filter(
        (d) => !duplicatasAjustadas.has(d.num_docum)
    );

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setDuplicatasSelecionadas(
                new Set(duplicatasParaSelecionar.map((d) => d.num_docum))
            );
        } else {
            setDuplicatasSelecionadas(new Set());
        }
    };

    const handleSelectRow = (num_docum: string, isChecked: boolean) => {
        if (duplicatasAjustadas.has(num_docum)) return;
        const novaSelecao = new Set(duplicatasSelecionadas);
        if (isChecked) {
            novaSelecao.add(num_docum);
        } else {
            novaSelecao.delete(num_docum);
        }
        setDuplicatasSelecionadas(novaSelecao);
    };

    return (
        <div className="comissao-fios-container">
            <div className="fios-controles-superiores">
                <div className="fios-painel-consulta">
                    <label
                        className="comissao-fios-label"
                        htmlFor="consulta-duplicatas-fios"
                    >
                        Consultar Duplicatas
                    </label>
                    <textarea
                        id="consulta-duplicatas-fios"
                        value={consultaInput}
                        onChange={(e) => setConsultaInput(e.target.value)}
                        placeholder="Cole ou digite aqui as duplicatas..."
                        className="comissao-fios-textarea"
                        disabled={loading}
                    />
                    <button
                        className="comissao-fios-btn primary"
                        onClick={handlePesquisar}
                        disabled={loading || !consultaInput.trim()}
                        type="button"
                    >
                        <i className="fas fa-search"></i> Consultar
                    </button>
                </div>
                <div className="fios-painel-ajuste">
                    <div className="fios-ajuste-section">
                        <div>
                            <label className="comissao-fios-label">Novo Representante</label>
                            <select
                                className="comissao-fios-select"
                                value={representante}
                                onChange={(e) => handleRepresentanteChange(e.target.value)}
                                disabled={loading}
                            >
                                {REPRESENTANTE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {nomeRepresentante && (
                                <div className="comissao-fios-representante-nome">
                                    <strong>{nomeRepresentante}</strong>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="comissao-fios-label">Nova Comissão %</label>
                            <select
                                className="comissao-fios-select"
                                value={comissao}
                                onChange={(e) => setComissao(e.target.value)}
                                disabled={loading || !representante}
                            >
                                {COMISSAO_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <hr />
                        <button
                            className="comissao-fios-btn primary full-width"
                            onClick={handleAjustarComissao}
                            disabled={
                                loading ||
                                duplicatasSelecionadas.size === 0 ||
                                !representante ||
                                !comissao
                            }
                            type="button"
                        >
                            <i className="fas fa-exchange-alt"></i>
                            {loading
                                ? "Processando..."
                                : `Ajustar (${duplicatasSelecionadas.size}) Selecionada(s)`}
                        </button>
                        <button
                            className="comissao-fios-btn secondary full-width"
                            onClick={handleLimpar}
                            disabled={loading}
                            type="button"
                        >
                            <i className="fas fa-eraser"></i> Limpar Tudo
                        </button>
                    </div>
                </div>
            </div>

            {duplicatas.length > 0 && (
                <div className="comissao-fios-table-card">
                    <div className="comissao-fios-table-header">
                        <h3>
                            Duplicatas ({duplicatas.length}) | Selecionadas (
                            {duplicatasSelecionadas.size}) | Ajustadas (
                            {duplicatasAjustadas.size})
                        </h3>
                        {duplicatasAjustadas.size > 0 && (
                            <button
                                className="comissao-fios-btn tertiary"
                                onClick={() => setIsReleaseModalOpen(true)}
                            >
                                <i className="fas fa-unlock"></i> Liberar Duplicatas
                            </button>
                        )}
                    </div>
                    <div className="comissao-fios-table-wrapper">
                        <table className="comissao-fios-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={
                                                duplicatasParaSelecionar.length > 0 &&
                                                duplicatasSelecionadas.size ===
                                                duplicatasParaSelecionar.length
                                            }
                                            disabled={duplicatasParaSelecionar.length === 0}
                                        />
                                    </th>
                                    <th>Nº Duplicata</th>
                                    <th>Empresa</th>
                                    <th>Cliente</th>
                                    <th>Nome Rep.</th>
                                    <th>% Com.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {duplicatas.map((d, index) => {
                                    const isAdjusted = duplicatasAjustadas.has(d.num_docum);
                                    return (
                                        <tr
                                            key={`${d.num_docum}-${index}`}
                                            className={isAdjusted ? "adjusted" : ""}
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={duplicatasSelecionadas.has(d.num_docum)}
                                                    onChange={(e) =>
                                                        handleSelectRow(d.num_docum, e.target.checked)
                                                    }
                                                    disabled={isAdjusted}
                                                />
                                            </td>
                                            <td>{d.num_docum}</td>
                                            <td>{d.cod_empresa}</td>
                                            <td>{d.nome_cliente}</td>
                                            <td>{d.nome_representante_1}</td>
                                            <td>{d.pct_comis_1}</td>
                                        </tr>
                                    );
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
        </div>
    );
};

export default ComissaoFios;
