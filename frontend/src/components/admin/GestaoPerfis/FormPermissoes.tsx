import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPut } from "../../../utils/api";

// Tipos de dados
interface Permissao {
    ID_PERMISSAO: number;
    NOME_PERMISSAO: string;
    DESCRICAO: string;
}

interface Props {
    perfilId: number;
    perfilNome: string;
    onClose: () => void;
}

export const FormPermissoes: React.FC<Props> = ({
    perfilId,
    perfilNome,
    onClose,
}) => {
    const [todasPermissoes, setTodasPermissoes] = useState<Permissao[]>([]);
    const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<
        Set<number>
    >(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Busca todas as permissões disponíveis e as que o perfil já possui
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Busca todas as permissões que existem no sistema
            const resTodas = await apiGet<{ data: Permissao[] }>(
                "/api/perfis/permissoes"
            );
            if (resTodas.success && resTodas.data) {
                setTodasPermissoes(resTodas.data.data);
            } else {
                throw new Error("Falha ao carregar lista de permissões.");
            }

            // Busca os IDs das permissões que este perfil já tem
            const resPerfil = await apiGet<{ data: number[] }>(
                `/api/perfis/${perfilId}/permissoes`
            );
            if (resPerfil.success && resPerfil.data) {
                setPermissoesSelecionadas(new Set(resPerfil.data.data));
            } else {
                throw new Error("Falha ao carregar permissões do perfil.");
            }
        } catch (err: any) {
            setError(err.message || "Erro de conexão.");
        } finally {
            setLoading(false);
        }
    }, [perfilId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCheckboxChange = (permissaoId: number) => {
        const novasSelecoes = new Set(permissoesSelecionadas);
        if (novasSelecoes.has(permissaoId)) {
            novasSelecoes.delete(permissaoId);
        } else {
            novasSelecoes.add(permissaoId);
        }
        setPermissoesSelecionadas(novasSelecoes);
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiPut(`/api/perfis/${perfilId}/permissoes`, {
                permissoes: Array.from(permissoesSelecionadas), // Envia um array de IDs
            });

            if (response.success) {
                onClose(); // Fecha o modal com sucesso
            } else {
                setError(response.message || "Falha ao salvar permissões.");
            }
        } catch (err) {
            setError("Erro de conexão ao salvar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content permissions-modal">
                <div className="modal-header">
                    <h3>Permissões para o Perfil: {perfilNome}</h3>
                    <button onClick={onClose} className="modal-close-btn">
                        &times;
                    </button>
                </div>

                {loading && <p>Carregando permissões...</p>}
                {error && <p className="error-message">{error}</p>}

                {!loading && !error && (
                    <div className="permissions-list">
                        {todasPermissoes.map((permissao) => (
                            <div key={permissao.ID_PERMISSAO} className="permission-item">
                                <input
                                    type="checkbox"
                                    id={`perm-${permissao.ID_PERMISSAO}`}
                                    checked={permissoesSelecionadas.has(permissao.ID_PERMISSAO)}
                                    onChange={() => handleCheckboxChange(permissao.ID_PERMISSAO)}
                                />
                                <label htmlFor={`perm-${permissao.ID_PERMISSAO}`}>
                                    <strong>{permissao.NOME_PERMISSAO}</strong>
                                    <small>{permissao.DESCRICAO}</small>
                                </label>
                            </div>
                        ))}
                    </div>
                )}

                <div className="modal-footer">
                    <button
                        type="button"
                        className="gestao-btn secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="gestao-btn"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? "Salvando..." : "Salvar Permissões"}
                    </button>
                </div>
            </div>
        </div>
    );
};
