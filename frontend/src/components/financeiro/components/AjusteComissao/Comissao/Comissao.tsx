import React, { useState } from "react";
import { apiPost } from "../../../../../utils/api";
import "./comissao.css";

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

const Comissao: React.FC = () => {
    const [consultaInput, setConsultaInput] = useState("");
    const [ajusteInput, setAjusteInput] = useState("");
    const [duplicatas, setDuplicatas] = useState<Duplicata[]>([]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<any>(null);
    const [representantes, setRepresentantes] = useState<Representante[]>([
        { id: 1, percentual: "", tipo: "" },
    ]);

    const getAvailableOptions = (currentId: number) => {
        const selecionados = representantes
            .filter((rep) => rep.id !== currentId)
            .map((rep) => rep.tipo)
            .filter(Boolean);
        return REPRESENTANTE_OPTIONS.filter((opt) => !selecionados.includes(opt));
    };

    const handlePesquisar = async () => {
        setFeedback(null);
        setDuplicatas([]);
        const duplicatasConsulta = consultaInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter((d) => d.length > 0);

        if (duplicatasConsulta.length === 0) {
            setFeedback({
                type: "error",
                message: "Informe duplicatas para pesquisar.",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await apiPost("/api/comissao/pesquisar", {
                duplicatas: duplicatasConsulta,
            });

            console.log("Resposta completa da API:", response);

            if (response.success) {
                // Acessar os dados na estrutura correta: response.data.rows
                const duplicatasEncontradas = Array.isArray(response.data?.rows)
                    ? response.data.rows
                    : Array.isArray(response.rows)
                        ? response.rows
                        : Array.isArray(response.data)
                            ? response.data
                            : [];

                console.log("Duplicatas encontradas:", duplicatasEncontradas);
                console.log("Quantidade de duplicatas:", duplicatasEncontradas.length);

                setDuplicatas(duplicatasEncontradas);
                setFeedback({
                    type: "success",
                    encontradas:
                        response.data?.encontradas ||
                        duplicatasEncontradas.map((d: Duplicata) => d.num_docum),
                    nao_encontradas: response.data?.nao_encontradas || [],
                });
            } else {
                setFeedback({
                    type: "error",
                    message: response.message || "Erro na pesquisa.",
                });
            }
        } catch (err) {
            console.error("Erro na requisição:", err);
            setFeedback({
                type: "error",
                message: "Erro ao conectar com o servidor.",
            });
        }
        setLoading(false);
    };

    const handleAjustarComissao = async () => {
        setFeedback(null);
        const duplicatasAjuste = ajusteInput
            .split(/[\n,]+/)
            .map((d) => d.trim())
            .filter((d) => d.length > 0);
        const repsSelecionados = representantes.filter(
            (rep) => rep.tipo && rep.percentual
        );
        if (repsSelecionados.length === 0 || duplicatasAjuste.length === 0) {
            setFeedback({
                type: "error",
                message:
                    "Informe duplicatas e ao menos um representante com percentual.",
            });
            return;
        }
        setLoading(true);
        try {
            const response = await apiPost("/api/comissao/ajustar", {
                duplicatas: duplicatasAjuste,
                representantes: repsSelecionados.map((rep) => ({
                    tipo: rep.tipo,
                    percentual: rep.percentual,
                })),
            });
            if (response.success) {
                setFeedback({
                    type: "success",
                    alteradas: response.data.alteradas,
                    nao_encontradas: response.data.nao_encontradas,
                });
                setAjusteInput("");
                setRepresentantes([{ id: 1, percentual: "", tipo: "" }]);
            } else {
                setFeedback({
                    type: "error",
                    message: response.message || "Erro ao ajustar.",
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

    const handleLimpar = () => {
        setConsultaInput("");
        setAjusteInput("");
        setRepresentantes([{ id: 1, percentual: "", tipo: "" }]);
        setDuplicatas([]);
        setFeedback(null);
    };

    const adicionarRepresentante = () => {
        if (representantes.length < 3) {
            const novoId = (representantes[representantes.length - 1]?.id || 0) + 1;
            setRepresentantes([
                ...representantes,
                { id: novoId, percentual: "", tipo: "" },
            ]);
        }
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

    return (
        <>
            {/* Consulta de duplicatas */}
            <div className="comissao-form-row column">
                <label className="comissao-label" htmlFor="consulta-duplicatas">
                    Consultar Duplicatas
                </label>
                <textarea
                    id="consulta-duplicatas"
                    value={consultaInput}
                    onChange={(e) => setConsultaInput(e.target.value)}
                    placeholder="Informe os números separados por vírgula ou quebra de linha"
                    rows={5}
                    className="comissao-textarea"
                    disabled={loading}
                    style={{ minHeight: 110, maxHeight: 220 }}
                />
                <div className="comissao-btn-center">
                    <button
                        className="comissao-btn small"
                        onClick={handlePesquisar}
                        disabled={loading || !consultaInput}
                        type="button"
                    >
                        <i className="fas fa-search"></i> Consultar
                    </button>
                </div>

                {/* Tabela de duplicatas - AGORA DENTRO DO MESMO BLOCO DO BOTÃO CONSULTAR */}
                {duplicatas.length > 0 && (
                    <div className="comissao-table-card">
                        <h3>Duplicatas Encontradas ({duplicatas.length})</h3>
                        <div className="comissao-table-container">
                            <table className="comissao-table">
                                <thead>
                                    <tr>
                                        <th>Nº Duplicata</th>
                                        <th>Empresa</th>
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
                                    {duplicatas.map((d, index) => (
                                        <tr key={`${d.num_docum}-${index}`}>
                                            <td>{d.num_docum}</td>
                                            <td>{d.cod_empresa}</td>
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Duplicatas para ajuste */}
            <div className="comissao-form-row column">
                <label className="comissao-label" htmlFor="ajuste-duplicatas">
                    Duplicatas para Ajuste
                </label>
                <textarea
                    id="ajuste-duplicatas"
                    value={ajusteInput}
                    onChange={(e) => setAjusteInput(e.target.value)}
                    placeholder="Cole ou digite aqui apenas as duplicatas que deseja ajustar"
                    rows={5}
                    className="comissao-textarea"
                    disabled={loading}
                    style={{ minHeight: 110, maxHeight: 220 }}
                />
            </div>

            {/* Representantes e Percentuais */}
            <div className="comissao-representantes-container">
                {representantes.map((rep) => (
                    <div key={rep.id} className="comissao-representante-row">
                        <div className="comissao-select-container">
                            <label className="comissao-label">Representante</label>
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
                        </div>
                        <div className="comissao-percentual-container">
                            <label className="comissao-label">Percentual (%)</label>
                            <input
                                type="number"
                                value={rep.percentual}
                                onChange={(e) =>
                                    atualizarRepresentante(rep.id, "percentual", e.target.value)
                                }
                                placeholder="Ex: 1.5"
                                className="comissao-input-percentual"
                                disabled={loading || !rep.tipo}
                                min={0}
                                step={0.01}
                            />
                        </div>
                    </div>
                ))}
                {representantes.length < 3 && (
                    <button
                        className="comissao-btn adicionar"
                        onClick={adicionarRepresentante}
                        disabled={loading}
                        type="button"
                    >
                        <i className="fas fa-plus"></i> Adicionar Representante
                    </button>
                )}
            </div>

            {/* Botões finais */}
            <div className="comissao-actions">
                <button
                    className="comissao-btn"
                    onClick={handleAjustarComissao}
                    disabled={
                        loading ||
                        !ajusteInput ||
                        representantes.filter((rep) => rep.tipo && rep.percentual)
                            .length === 0
                    }
                    type="button"
                >
                    <i className="fas fa-exchange-alt"></i> Ajustar Comissão
                </button>
                <button
                    className="comissao-btn limpar"
                    onClick={handleLimpar}
                    disabled={loading}
                    type="button"
                >
                    <i className="fas fa-eraser"></i> Limpar
                </button>
            </div>

            {/* Feedback movido para o final da página */}
            {feedback && (
                <div className={`comissao-feedback ${feedback.type}`}>
                    <div>
                        {feedback.type === "error" && feedback.message}

                        {feedback.type === "success" && (
                            <>
                                {typeof feedback.encontradas !== "undefined" ? (
                                    <>
                                        {feedback.encontradas &&
                                            feedback.encontradas.length > 0 && (
                                                <>
                                                    <strong>
                                                        {feedback.encontradas.length} duplicata(s)
                                                        encontrada(s):
                                                    </strong>
                                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                        {feedback.encontradas.map((d: string) => (
                                                            <li key={`consulta-enc-${d}`}>{d}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        {feedback.nao_encontradas &&
                                            feedback.nao_encontradas.length > 0 && (
                                                <>
                                                    {feedback.encontradas &&
                                                        feedback.encontradas.length > 0 && <br />}
                                                    <strong>
                                                        {feedback.nao_encontradas.length} duplicata(s) não
                                                        encontrada(s):
                                                    </strong>
                                                    <ul
                                                        style={{
                                                            margin: 0,
                                                            paddingLeft: 18,
                                                            color: "#991b1b",
                                                        }}
                                                    >
                                                        {feedback.nao_encontradas.map((d: string) => (
                                                            <li key={`consulta-naoenc-${d}`}>{d}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        {(!feedback.encontradas ||
                                            feedback.encontradas.length === 0) &&
                                            (!feedback.nao_encontradas ||
                                                feedback.nao_encontradas.length === 0) && (
                                                <span>
                                                    Nenhuma informação de duplicata retornada pela
                                                    consulta.
                                                </span>
                                            )}
                                    </>
                                ) : typeof feedback.alteradas !== "undefined" ? (
                                    <>
                                        {feedback.alteradas && feedback.alteradas.length > 0 && (
                                            <>
                                                <strong>
                                                    {feedback.alteradas.length} duplicata(s) alterada(s)
                                                    com sucesso:
                                                </strong>
                                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                    {feedback.alteradas.map((d: string) => (
                                                        <li key={`ajuste-alt-${d}`}>{d}</li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                        {feedback.nao_encontradas &&
                                            feedback.nao_encontradas.length > 0 && (
                                                <>
                                                    {feedback.alteradas &&
                                                        feedback.alteradas.length > 0 && <br />}
                                                    <strong>
                                                        {feedback.nao_encontradas.length} duplicata(s) não
                                                        encontrada(s) para ajuste:
                                                    </strong>
                                                    <ul
                                                        style={{
                                                            margin: 0,
                                                            paddingLeft: 18,
                                                            color: "#991b1b",
                                                        }}
                                                    >
                                                        {feedback.nao_encontradas.map((d: string) => (
                                                            <li key={`ajuste-naoenc-${d}`}>{d}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        {(!feedback.alteradas || feedback.alteradas.length === 0) &&
                                            (!feedback.nao_encontradas ||
                                                feedback.nao_encontradas.length === 0) && (
                                                <span>
                                                    Ajuste processado. Nenhuma duplicata especificada foi
                                                    alterada ou listada como não encontrada. Verifique os
                                                    números fornecidos.
                                                </span>
                                            )}
                                    </>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Comissao;
