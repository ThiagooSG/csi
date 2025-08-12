import React, { useState } from "react";
import { apiGet, apiPost } from "../../../../utils/api";
import "./ajusteportador.css";

// Interfaces (tipos de dados)
interface Duplicata {
    cod_empresa: string;
    nome_cliente: string;
    cod_portador: string;
    nome_portador: string;
    tipo_portador: string;
    num_docum: string;
}

interface Portador {
    nome: string;
    tipo: string;
    codigo: string;
}

interface FeedbackConsulta {
    type: "success" | "error" | "info";
    encontradas?: string[];
    nao_encontradas?: string[];
    message?: string;
}

interface FeedbackAjuste {
    type: "success" | "error" | "info";
    alteradas?: string[];
    nao_encontradas?: string[];
    message?: string;
}

const AjustePortador: React.FC = () => {
    // States do componente
    const [consultaInput, setConsultaInput] = useState("");
    const [ajusteInput, setAjusteInput] = useState("");
    const [codigoPortador, setCodigoPortador] = useState("");
    const [duplicatas, setDuplicatas] = useState<Duplicata[]>([]);
    const [portadoresEncontrados, setPortadoresEncontrados] = useState<
        Portador[]
    >([]);
    const [portadorSelecionado, setPortadorSelecionado] =
        useState<Portador | null>(null);
    const [loading, setLoading] = useState(false);

    // Feedbacks separados
    const [feedbackConsulta, setFeedbackConsulta] =
        useState<FeedbackConsulta | null>(null);
    const [feedbackAjuste, setFeedbackAjuste] = useState<FeedbackAjuste | null>(
        null
    );

    // Função para atualizar apenas a tabela de duplicatas (sem mexer nos feedbacks)
    const atualizarTabelaDuplicatas = async () => {
        const duplicatasConsulta = consultaInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter(Boolean);

        if (duplicatasConsulta.length === 0) return;

        setLoading(true);
        try {
            const response = await apiPost("/api/portador/pesquisar", {
                duplicatas: duplicatasConsulta,
            });

            if (response.success && response.data?.rows) {
                setDuplicatas(response.data.rows);
                // NÃO mexe nos feedbacks aqui - só atualiza a tabela
            }
        } catch (err) {
            // Não mexe nos feedbacks aqui - só falha silenciosamente na atualização da tabela
            console.error("Erro ao atualizar tabela:", err);
        } finally {
            setLoading(false);
        }
    };

    // Função de Pesquisa (limpa feedbacks e faz consulta completa)
    const handlePesquisar = async () => {
        setFeedbackAjuste(null); // limpa feedback de ajuste ao consultar
        setFeedbackConsulta(null); // limpa feedback de consulta anterior
        setDuplicatas([]);
        const duplicatasConsulta = consultaInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter(Boolean);

        if (duplicatasConsulta.length === 0) {
            setFeedbackConsulta({
                type: "error",
                message: "Informe duplicatas para pesquisar.",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await apiPost("/api/portador/pesquisar", {
                duplicatas: duplicatasConsulta,
            });

            if (response.success && response.data?.rows) {
                setDuplicatas(response.data.rows);
                setFeedbackConsulta({
                    type: "success",
                    encontradas: response.data.encontradas,
                    nao_encontradas: response.data.nao_encontradas,
                });
            } else {
                setFeedbackConsulta({
                    type: "error",
                    message: response.message || "Nenhuma duplicata encontrada.",
                });
            }
        } catch (err) {
            setFeedbackConsulta({
                type: "error",
                message: "Erro ao conectar com o servidor.",
            });
        } finally {
            setLoading(false);
        }
    };

    // Função para buscar dados do Portador
    const handleBuscarPortador = async () => {
        if (!codigoPortador.trim()) {
            setPortadoresEncontrados([]);
            setPortadorSelecionado(null);
            return;
        }

        setLoading(true);
        try {
            const response = await apiGet(
                `/api/portador/obter-dados/${codigoPortador}`
            );

            if (response.success && response.data?.portadores?.length) {
                const portadores = response.data.portadores;
                setPortadoresEncontrados(portadores);

                // Se há apenas um portador, seleciona automaticamente
                if (portadores.length === 1) {
                    setPortadorSelecionado(portadores[0]);
                } else {
                    // Se há múltiplos portadores, limpa a seleção para forçar escolha
                    setPortadorSelecionado(null);
                }
            } else {
                setPortadoresEncontrados([]);
                setPortadorSelecionado(null);
                setFeedbackConsulta({
                    type: "error",
                    message: response.message || "Portador não encontrado.",
                });
            }
        } catch (err) {
            setPortadoresEncontrados([]);
            setPortadorSelecionado(null);
            setFeedbackConsulta({
                type: "error",
                message: "Erro ao buscar portador.",
            });
        } finally {
            setLoading(false);
        }
    };

    // Função para selecionar tipo de portador
    const handleSelecionarPortador = (portador: Portador) => {
        setPortadorSelecionado(portador);
    };

    // Função para ajustar o Portador
    const handleAjustarPortador = async () => {
        setFeedbackAjuste(null);
        const duplicatasAjuste = ajusteInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter(Boolean);

        if (
            !codigoPortador ||
            !portadorSelecionado ||
            duplicatasAjuste.length === 0
        ) {
            setFeedbackAjuste({
                type: "error",
                message:
                    "Informe o código do portador, selecione o tipo e as duplicatas para ajuste.",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await apiPost("/api/portador/ajustar", {
                duplicatas: duplicatasAjuste,
                codigoPortador,
                tipoPortador: portadorSelecionado.tipo,
            });

            if (response.success) {
                setFeedbackAjuste({
                    type: "success",
                    alteradas: response.data?.alteradas || [],
                    nao_encontradas: response.data?.nao_encontradas || [],
                });
                setAjusteInput("");
                setCodigoPortador("");
                setPortadoresEncontrados([]);
                setPortadorSelecionado(null);
                // Atualiza apenas a tabela, SEM mexer nos feedbacks
                if (consultaInput) {
                    atualizarTabelaDuplicatas();
                }
            } else {
                setFeedbackAjuste({
                    type: "error",
                    message: response.message || "Erro no ajuste.",
                });
            }
        } catch (err) {
            setFeedbackAjuste({
                type: "error",
                message: "Erro ao conectar com o servidor.",
            });
        } finally {
            setLoading(false);
        }
    };

    // Função para limpar todos os campos
    const handleLimpar = () => {
        setConsultaInput("");
        setAjusteInput("");
        setCodigoPortador("");
        setDuplicatas([]);
        setPortadoresEncontrados([]);
        setPortadorSelecionado(null);
        setFeedbackConsulta(null);
        setFeedbackAjuste(null);
    };

    return (
        <div className="ajuste-portador-card">
            <div className="ajuste-portador-header">
                <i
                    className="fas fa-exchange-alt"
                    style={{ marginRight: 10, color: "#2563eb" }}
                ></i>
                <span className="ajuste-portador-title">Ajuste Portador</span>
            </div>
            {/* Consulta de duplicatas */}
            <div className="ajuste-portador-form-row column">
                <label className="ajuste-portador-label" htmlFor="consulta-duplicatas">
                    Consultar Duplicatas
                </label>
                <textarea
                    id="consulta-duplicatas"
                    value={consultaInput}
                    onChange={(e) => setConsultaInput(e.target.value)}
                    placeholder="Informe os números separados por vírgula ou quebra de linha"
                    rows={5}
                    className="ajuste-portador-textarea"
                    disabled={loading}
                    style={{ minHeight: 110, maxHeight: 220 }}
                />
                <div className="ajuste-portador-btn-center">
                    <button
                        className="ajuste-portador-btn small"
                        onClick={handlePesquisar}
                        disabled={loading || !consultaInput}
                        type="button"
                    >
                        <i className="fas fa-search"></i> Consultar
                    </button>
                </div>

                {/* Tabela de duplicatas */}
                {duplicatas.length > 0 && (
                    <div className="ajuste-portador-table-card">
                        <h3>Duplicatas Encontradas ({duplicatas.length})</h3>
                        <div className="ajuste-portador-table-container">
                            <table className="ajuste-portador-table">
                                <thead>
                                    <tr>
                                        <th>Nº Duplicata</th>
                                        <th>Empresa</th>
                                        <th>Cliente</th>
                                        <th>Portador Atual</th>
                                        <th>Tipo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duplicatas.map((d, index) => (
                                        <tr key={`${d.num_docum}-${index}`}>
                                            <td>{d.num_docum}</td>
                                            <td>{d.cod_empresa}</td>
                                            <td title={d.nome_cliente}>{d.nome_cliente}</td>
                                            <td>{`${d.cod_portador} - ${d.nome_portador}`}</td>
                                            <td>{d.tipo_portador}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Duplicatas para ajuste */}
            <div className="ajuste-portador-form-row column">
                <label className="ajuste-portador-label" htmlFor="ajuste-duplicatas">
                    Duplicatas para Ajuste
                </label>
                <textarea
                    id="ajuste-duplicatas"
                    value={ajusteInput}
                    onChange={(e) => setAjusteInput(e.target.value)}
                    placeholder="Cole ou digite aqui apenas as duplicatas que deseja ajustar"
                    rows={5}
                    className="ajuste-portador-textarea"
                    disabled={loading}
                    style={{ minHeight: 110, maxHeight: 220 }}
                />
            </div>

            {/* Código do Novo Portador */}
            <div className="ajuste-portador-form-row column">
                <label className="ajuste-portador-label" htmlFor="codigo-portador">
                    Código do Novo Portador
                </label>
                <div className="ajuste-portador-codigo-container">
                    <input
                        id="codigo-portador"
                        type="text"
                        value={codigoPortador}
                        onChange={(e) => setCodigoPortador(e.target.value)}
                        onBlur={handleBuscarPortador}
                        placeholder="Ex: 123"
                        className="ajuste-portador-input-codigo"
                        disabled={loading}
                    />
                    {portadorSelecionado && (
                        <div className="ajuste-portador-info-inline">
                            {portadorSelecionado.nome} ({portadorSelecionado.tipo})
                        </div>
                    )}
                </div>
            </div>

            {/* Seleção de tipo de portador quando há múltiplos */}
            {portadoresEncontrados.length > 1 && (
                <div className="ajuste-portador-form-row column">
                    <label className="ajuste-portador-label" htmlFor="tipo-portador">
                        Selecione o Tipo de Portador
                    </label>
                    <select
                        id="tipo-portador"
                        value={portadorSelecionado?.tipo || ""}
                        onChange={(e) => {
                            const portador = portadoresEncontrados.find(
                                (p) => p.tipo === e.target.value
                            );
                            if (portador) handleSelecionarPortador(portador);
                        }}
                        className="ajuste-portador-select"
                        disabled={loading}
                    >
                        <option value="">Selecione o tipo...</option>
                        {portadoresEncontrados.map((portador, index) => (
                            <option key={`${portador.tipo}-${index}`} value={portador.tipo}>
                                {portador.nome} ({portador.tipo})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Botões finais */}
            <div className="ajuste-portador-actions">
                <button
                    className="ajuste-portador-btn"
                    onClick={handleAjustarPortador}
                    disabled={
                        loading || !ajusteInput || !codigoPortador || !portadorSelecionado
                    }
                    type="button"
                >
                    <i className="fas fa-exchange-alt"></i> Ajustar Portador
                </button>
                <button
                    className="ajuste-portador-btn limpar"
                    onClick={handleLimpar}
                    disabled={loading}
                    type="button"
                >
                    <i className="fas fa-eraser"></i> Limpar
                </button>
            </div>

            {/* Feedback do ajuste (prioritário) */}
            {feedbackAjuste && (
                <div className={`ajuste-portador-feedback ${feedbackAjuste.type}`}>
                    <div>
                        {feedbackAjuste.type === "error" && feedbackAjuste.message}
                        {feedbackAjuste.type === "success" && (
                            <>
                                {feedbackAjuste.alteradas &&
                                    feedbackAjuste.alteradas.length > 0 && (
                                        <>
                                            <strong>
                                                {feedbackAjuste.alteradas.length} duplicata(s)
                                                alterada(s) com sucesso:
                                            </strong>
                                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                {feedbackAjuste.alteradas.map((d: string) => (
                                                    <li key={`ajuste-alt-${d}`}>{d}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                {feedbackAjuste.nao_encontradas &&
                                    feedbackAjuste.nao_encontradas.length > 0 && (
                                        <>
                                            {feedbackAjuste.alteradas &&
                                                feedbackAjuste.alteradas.length > 0 && <br />}
                                            <strong>
                                                {feedbackAjuste.nao_encontradas.length} duplicata(s) não
                                                encontrada(s) para ajuste:
                                            </strong>
                                            <ul
                                                style={{ margin: 0, paddingLeft: 18, color: "#991b1b" }}
                                            >
                                                {feedbackAjuste.nao_encontradas.map((d: string) => (
                                                    <li key={`ajuste-naoenc-${d}`}>{d}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                {(!feedbackAjuste.alteradas ||
                                    feedbackAjuste.alteradas.length === 0) &&
                                    (!feedbackAjuste.nao_encontradas ||
                                        feedbackAjuste.nao_encontradas.length === 0) && (
                                        <span>
                                            Ajuste processado. Nenhuma duplicata especificada foi
                                            alterada ou listada como não encontrada. Verifique os
                                            números fornecidos.
                                        </span>
                                    )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Feedback da consulta (só aparece se não houver feedback de ajuste) */}
            {!feedbackAjuste && feedbackConsulta && (
                <div className={`ajuste-portador-feedback ${feedbackConsulta.type}`}>
                    <div>
                        {feedbackConsulta.type === "error" && feedbackConsulta.message}
                        {feedbackConsulta.type === "success" && (
                            <>
                                {feedbackConsulta.encontradas &&
                                    feedbackConsulta.encontradas.length > 0 && (
                                        <>
                                            <strong>
                                                {feedbackConsulta.encontradas.length} duplicata(s)
                                                encontrada(s):
                                            </strong>
                                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                {feedbackConsulta.encontradas.map((d: string) => (
                                                    <li key={`consulta-enc-${d}`}>{d}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                {feedbackConsulta.nao_encontradas &&
                                    feedbackConsulta.nao_encontradas.length > 0 && (
                                        <>
                                            {feedbackConsulta.encontradas &&
                                                feedbackConsulta.encontradas.length > 0 && <br />}
                                            <strong>
                                                {feedbackConsulta.nao_encontradas.length} duplicata(s)
                                                não encontrada(s):
                                            </strong>
                                            <ul
                                                style={{ margin: 0, paddingLeft: 18, color: "#991b1b" }}
                                            >
                                                {feedbackConsulta.nao_encontradas.map((d: string) => (
                                                    <li key={`consulta-naoenc-${d}`}>{d}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                {(!feedbackConsulta.encontradas ||
                                    feedbackConsulta.encontradas.length === 0) &&
                                    (!feedbackConsulta.nao_encontradas ||
                                        feedbackConsulta.nao_encontradas.length === 0) && (
                                        <span>
                                            Nenhuma informação de duplicata retornada pela consulta.
                                        </span>
                                    )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AjustePortador;
