import React, { useState, useEffect } from "react";
import { apiPost, apiPut } from "../../../utils/api";

interface Perfil {
    ID_PERFIL?: number;
    NOME_PERFIL: string;
    DESCRICAO: string;
}

interface Props {
    perfilParaEditar: Perfil | null;
    onClose: () => void;
    onSave: () => void;
}

export const FormPerfil: React.FC<Props> = ({
    perfilParaEditar,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState({ NOME_PERFIL: "", DESCRICAO: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!perfilParaEditar;

    useEffect(() => {
        if (isEditing) {
            setFormData({
                NOME_PERFIL: perfilParaEditar.NOME_PERFIL,
                DESCRICAO: perfilParaEditar.DESCRICAO,
            });
        }
    }, [perfilParaEditar, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {
            nome_perfil: formData.NOME_PERFIL,
            descricao: formData.DESCRICAO,
        };

        try {
            const response = isEditing
                ? await apiPut(`/api/perfis/${perfilParaEditar?.ID_PERFIL}`, payload)
                : await apiPost("/api/perfis", payload);

            if (response.success) {
                onSave();
            } else {
                setError(response.message || "Ocorreu um erro.");
            }
        } catch (err) {
            setError("Erro de conexão ao salvar o perfil.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{isEditing ? "Editar Perfil" : "Novo Perfil"}</h3>
                    <button onClick={onClose} className="modal-close-btn">
                        &times;
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome do Perfil</label>
                        <input
                            type="text"
                            value={formData.NOME_PERFIL}
                            onChange={(e) =>
                                setFormData({ ...formData, NOME_PERFIL: e.target.value })
                            }
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Descrição</label>
                        <input
                            type="text"
                            value={formData.DESCRICAO}
                            onChange={(e) =>
                                setFormData({ ...formData, DESCRICAO: e.target.value })
                            }
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="gestao-btn secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button type="submit" className="gestao-btn" disabled={loading}>
                            {loading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
