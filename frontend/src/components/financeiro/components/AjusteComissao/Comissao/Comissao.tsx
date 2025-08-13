import React, { useState } from "react";
import { apiPost } from "../../../../../utils/api";
import { toastService } from "../../../../../services/toastService";
import "./comissao.css";

// --- Interfaces ---
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
    percentual: string;
    tipo: string;
}

const REPRESENTANTE_OPTIONS = [
    "Representante 1",
    "Representante 2",
    "Representante 3",
];

// --- Sub-Componente: Modal para Liberar Duplicatas ---
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
                    <button className="comissao-btn secondary" onClick={onLiberarTodas}>
                        Liberar Todas
                    </button>
                    <button
                        className="comissao-btn primary"
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

// --- Sub-Componente: Modal de Confirmação de Ajuste ---
const ConfirmacaoAjusteModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    count: number;
    representantes: Representante[];
}> = ({ onConfirm, onCancel, count, representantes }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Confirmar Ajuste de Comissão</h3>
                    <button onClick={onCancel} className="modal-close-btn">
                        &times;
                    </button>
                </div>
                <div className="confirmation-body">
                    <p>
                        Você tem certeza que deseja ajustar{" "}
                        <strong>{count} duplicata(s)</strong> com as seguintes comissões?
                    </p>
                    <ul>
                        {representantes
                            .filter((r) => r.tipo && r.percentual)
                            .map((r) => (
                                <li key={r.id}>
                                    <strong>{r.tipo}:</strong> {r.percentual}%
                                </li>
                            ))}
                    </ul>
                </div>
                <div className="modal-footer">
                    <button className="comissao-btn secondary" onClick={onCancel}>
                        Não
                    </button>
                    <button className="comissao-btn primary" onClick={onConfirm}>
                        Sim, Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal ---
const Comissao: React.FC = () => {
    const [consultaInput, setConsultaInput] = useState("");
    const [duplicatas, setDuplicatas] = useState<Duplicata[]>([]);
    const [duplicatasSelecionadas, setDuplicatasSelecionadas] = useState<
        Set<string>
    >(new Set());
    const [duplicatasAjustadas, setDuplicatasAjustadas] = useState<Set<string>>(
        new Set()
    );
    const [loading, setLoading] = useState(false);
    const [representantes, setRepresentantes] = useState<Representante[]>([
        { id: 1, percentual: "", tipo: "Representante 1" },
    ]);
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const getAvailableOptions = (currentId: number) => {
        const selecionados = representantes
            .filter((rep) => rep.id !== currentId)
            .map((rep) => rep.tipo)
            .filter(Boolean);
        return REPRESENTANTE_OPTIONS.filter((opt) => !selecionados.includes(opt));
    };

    const handlePesquisar = async () => {
        setDuplicatas([]);
        setDuplicatasSelecionadas(new Set());
        const duplicatasConsulta = consultaInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter(Boolean);
        if (duplicatasConsulta.length === 0) return;

        setLoading(true);
        try {
            const response = await apiPost("/api/comissao/pesquisar", {
                duplicatas: duplicatasConsulta,
            });
            if (response.success && response.data?.rows) {
                const encontradas = response.data.encontradas?.length || 0;
                const naoEncontradas = response.data.nao_encontradas?.length || 0;
                toastService.success(`${encontradas} duplicata(s) encontrada(s).`);
                if (naoEncontradas > 0)
                    toastService.warn(`${naoEncontradas} não encontrada(s).`);

                const duplicatasEncontradas = response.data.rows;
                setDuplicatas(duplicatasEncontradas);
                const numerosDaNovaConsulta = new Set(
                    duplicatasEncontradas.map((d) => d.num_docum)
                );
                setDuplicatasAjustadas(
                    (prev) =>
                        new Set([...prev].filter((dup) => numerosDaNovaConsulta.has(dup)))
                );
            } else {
                toastService.error(response.message || "Nenhuma duplicata encontrada.");
                setDuplicatasAjustadas(new Set());
            }
        } catch (err) {
            toastService.error("Erro de conexão ao pesquisar.");
            console.error("Erro na requisição:", err);
        }
        setLoading(false);
    };

    const handleAjustarComissao = () => {
        const repsValidos = representantes.filter(
            (rep) => rep.tipo && rep.percentual
        );
        if (duplicatasSelecionadas.size > 0 && repsValidos.length > 0) {
            setIsConfirmModalOpen(true);
        } else {
            toastService.error(
                "Selecione duplicatas e preencha ao menos um representante."
            );
        }
    };

    const executeAjuste = async () => {
        setIsConfirmModalOpen(false);
        const duplicatasParaAjustar = Array.from(duplicatasSelecionadas);
        const repsValidos = representantes.filter(
            (rep) => rep.tipo && rep.percentual
        );

        setLoading(true);
        try {
            const response = await apiPost("/api/comissao/ajustar", {
                duplicatas: duplicatasParaAjustar,
                representantes: repsValidos,
            });

            if (response.success && response.data?.alteradas) {
                toastService.success(
                    `${response.data.alteradas.length} duplicata(s) ajustada(s)!`
                );
                setDuplicatasAjustadas(
                    (prev) => new Set([...prev, ...response.data.alteradas])
                );
                setDuplicatasSelecionadas(new Set());
            } else {
                toastService.error(response.message || "Falha no ajuste.");
            }
        } catch (err) {
            toastService.error("Erro de conexão ao ajustar.");
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
        for (const dup of selecionadas) novasAjustadas.delete(dup);
        setDuplicatasAjustadas(novasAjustadas);
        setIsReleaseModalOpen(false);
    };

    const handleLimpar = () => {
        setConsultaInput("");
        setRepresentantes([{ id: 1, percentual: "", tipo: "Representante 1" }]);
        setDuplicatas([]);
        setDuplicatasSelecionadas(new Set());
        setDuplicatasAjustadas(new Set());
    };

    const handleSelectAll = () => {
        const duplicatasParaSelecionar = duplicatas.filter(
            (d) => !duplicatasAjustadas.has(d.num_docum)
        );
        const allSelected =
            duplicatasSelecionadas.size === duplicatasParaSelecionar.length &&
            duplicatasParaSelecionar.length > 0;
        if (allSelected) setDuplicatasSelecionadas(new Set());
        else
            setDuplicatasSelecionadas(
                new Set(duplicatasParaSelecionar.map((d) => d.num_docum))
            );
    };

    const handleSelectRow = (num_docum: string, isChecked: boolean) => {
        const novaSelecao = new Set(duplicatasSelecionadas);
        if (isChecked) novaSelecao.add(num_docum);
        else novaSelecao.delete(num_docum);
        setDuplicatasSelecionadas(novaSelecao);
    };

    const adicionarRepresentante = () => {
        if (representantes.length < 3)
            setRepresentantes([
                ...representantes,
                { id: Date.now(), percentual: "", tipo: "" },
            ]);
    };

    const atualizarRepresentante = (
        id: number,
        campo: "tipo" | "percentual",
        valor: string
    ) => {
        setRepresentantes(
            representantes.map((rep) =>
                rep.id === id ? { ...rep, [campo]: valor } : rep
            )
        );
    };

    const duplicatasParaSelecionar = duplicatas.filter(
        (d) => !duplicatasAjustadas.has(d.num_docum)
    );
    const allSelectableChecked =
        duplicatasParaSelecionar.length > 0 &&
        duplicatasSelecionadas.size === duplicatasParaSelecionar.length;

    return (
        <div className="comissao-container">
            <div className="comissao-controles-superiores">
                <div className="comissao-painel-consulta">
                    <label className="comissao-label" htmlFor="consulta-duplicatas">
                        Consultar Duplicatas
                    </label>
                    <textarea
                        id="consulta-duplicatas"
                        value={consultaInput}
                        onChange={(e) => setConsultaInput(e.target.value)}
                        placeholder="Informe os números separados por vírgula ou quebra de linha"
                        className="comissao-textarea"
                        disabled={loading}
                    />
                    <button
                        className="comissao-btn primary"
                        onClick={handlePesquisar}
                        disabled={loading || !consultaInput.trim()}
                    >
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
                                        onChange={(e) =>
                                            atualizarRepresentante(rep.id, "tipo", e.target.value)
                                        }
                                        disabled={loading}
                                    >
                                        <option value="">Selecione...</option>
                                        {getAvailableOptions(rep.id).map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={rep.percentual}
                                        onChange={(e) =>
                                            atualizarRepresentante(
                                                rep.id,
                                                "percentual",
                                                e.target.value
                                            )
                                        }
                                        placeholder="%"
                                        className="comissao-input-percentual"
                                        disabled={loading || !rep.tipo}
                                        min={0}
                                        step={0.01}
                                    />
                                </div>
                            ))}
                            {representantes.length < 3 && (
                                <button
                                    className="comissao-btn adicionar"
                                    onClick={adicionarRepresentante}
                                    disabled={loading}
                                >
                                    <i className="fas fa-plus"></i> Adicionar
                                </button>
                            )}
                        </div>
                        <hr />
                        <button
                            className="comissao-btn primary full-width"
                            onClick={handleAjustarComissao}
                            disabled={
                                loading ||
                                duplicatasSelecionadas.size === 0 ||
                                representantes.filter((r) => r.tipo && r.percentual).length ===
                                0
                            }
                        >
                            <i className="fas fa-exchange-alt"></i> Ajustar (
                            {duplicatasSelecionadas.size}) Selecionada(s)
                        </button>
                        <button
                            className="comissao-btn secondary full-width"
                            onClick={handleLimpar}
                            disabled={loading}
                        >
                            <i className="fas fa-eraser"></i> Limpar Tudo
                        </button>
                    </div>
                </div>
            </div>

            {duplicatas.length > 0 && (
                <div className="comissao-table-card">
                    <div className="comissao-table-header">
                        <h3>
                            Duplicatas Encontradas ({duplicatas.length}) | Selecionadas (
                            {duplicatasSelecionadas.size}) | Ajustadas (
                            {duplicatasAjustadas.size})
                        </h3>
                        {duplicatasAjustadas.size > 0 && (
                            <button
                                className="comissao-btn tertiary"
                                onClick={() => setIsReleaseModalOpen(true)}
                            >
                                <i className="fas fa-unlock"></i> Liberar Duplicatas
                            </button>
                        )}
                    </div>
                    <div className="comissao-table-wrapper">
                        <table className="comissao-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={allSelectableChecked}
                                            disabled={duplicatasParaSelecionar.length === 0}
                                        />
                                    </th>
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
                                            <td title={d.nome_cliente}>{d.nome_cliente}</td>
                                            <td title={d.nome_repres_1 || ""}>
                                                {d.nome_repres_1?.trim() || "-"}
                                            </td>
                                            <td>{d.pct_comis_1 || 0}%</td>
                                            <td title={d.nome_repres_2 || ""}>
                                                {d.nome_repres_2?.trim() || "-"}
                                            </td>
                                            <td>{d.pct_comis_2 || 0}%</td>
                                            <td title={d.nome_repres_3 || ""}>
                                                {d.nome_repres_3?.trim() || "-"}
                                            </td>
                                            <td>{d.pct_comis_3 || 0}%</td>
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
            {isConfirmModalOpen && (
                <ConfirmacaoAjusteModal
                    onConfirm={executeAjuste}
                    onCancel={() => setIsConfirmModalOpen(false)}
                    count={duplicatasSelecionadas.size}
                    representantes={representantes}
                />
            )}
        </div>
    );
};

export default Comissao;
