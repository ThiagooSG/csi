import React, { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, apiPut } from "../../../utils/api";

// Tipos de dados
interface Perfil {
    ID_PERFIL: number;
    NOME_PERFIL: string;
}

// 1. Interface atualizada com os novos campos
interface UsuarioFormData {
    ID_USUARIOS?: number;
    NOME_USUARIO: string;
    LOGIN_USUARIO: string;
    EMAIL: string;
    SETOR: string;
    ATIVO: number;
    ID_PERFIS: number[];
    SENHA_USUARIO?: string;
}

interface Props {
    usuarioParaEditar: any;
    onClose: () => void;
    onSave: () => void;
}

export const FormUsuario: React.FC<Props> = ({
    usuarioParaEditar,
    onClose,
    onSave,
}) => {
    // 2. Estado inicial atualizado
    const [formData, setFormData] = useState<UsuarioFormData>({
        NOME_USUARIO: "",
        LOGIN_USUARIO: "",
        EMAIL: "",
        SETOR: "",
        ATIVO: 1,
        ID_PERFIS: [],
        SENHA_USUARIO: "",
    });
    const [todosPerfis, setTodosPerfis] = useState<Perfil[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!usuarioParaEditar;

    const fetchPerfis = useCallback(async () => {
        const response = await apiGet<{ data: Perfil[] }>("/api/perfis");
        if (response.success && response.data) {
            setTodosPerfis(response.data.data);
        }
    }, []);

    useEffect(() => {
        fetchPerfis();
        if (isEditing) {
            setFormData({
                ...usuarioParaEditar,
                NOME_USUARIO: usuarioParaEditar.NOME_USUARIO || "",
                LOGIN_USUARIO: usuarioParaEditar.LOGIN_USUARIO || "",
                EMAIL: usuarioParaEditar.EMAIL || "",
                SETOR: usuarioParaEditar.SETOR || "",
                ID_PERFIS: usuarioParaEditar.ID_PERFIS || [],
                SENHA_USUARIO: "",
            });
        }
    }, [fetchPerfis, usuarioParaEditar, isEditing]);

    const handleFieldChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "ATIVO" ? Number(value) : value,
        }));
    };

    const handleProfileChange = (perfilId: number) => {
        const currentProfileIds = new Set(formData.ID_PERFIS);
        if (currentProfileIds.has(perfilId)) {
            currentProfileIds.delete(perfilId);
        } else {
            currentProfileIds.add(perfilId);
        }
        setFormData((prev) => ({
            ...prev,
            ID_PERFIS: Array.from(currentProfileIds),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.ID_PERFIS.length === 0) {
            setError("O usuário deve ter pelo menos um perfil.");
            return;
        }

        setLoading(true);
        setError(null);

        // 3. Payload atualizado para enviar os novos dados
        const payload = {
            nome: formData.NOME_USUARIO,
            login: formData.LOGIN_USUARIO,
            email: formData.EMAIL,
            setor: formData.SETOR,
            ativo: formData.ATIVO,
            perfis: formData.ID_PERFIS,
            ...(formData.SENHA_USUARIO && { senha: formData.SENHA_USUARIO }),
        };

        try {
            const response = isEditing
                ? await apiPut(
                    `/api/usuarios/${usuarioParaEditar?.ID_USUARIOS}`,
                    payload
                )
                : await apiPost("/api/usuarios", payload);

            if (response.success) {
                onSave();
            } else {
                setError(response.message || "Ocorreu um erro.");
            }
        } catch (err) {
            setError("Erro de conexão ao salvar o usuário.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{isEditing ? "Editar Usuário" : "Novo Usuário"}</h3>
                    <button onClick={onClose} className="modal-close-btn">
                        &times;
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome</label>
                        <input
                            type="text"
                            name="NOME_USUARIO"
                            value={formData.NOME_USUARIO}
                            onChange={handleFieldChange}
                            required
                        />
                    </div>
                    {/* 4. Novos campos adicionados ao formulário */}
                    <div className="form-group">
                        <label>Login</label>
                        <input
                            type="text"
                            name="LOGIN_USUARIO"
                            value={formData.LOGIN_USUARIO}
                            onChange={handleFieldChange}
                            required
                            disabled={isEditing}
                        />
                    </div>
                    <div className="form-group">
                        <label>E-mail</label>
                        <input
                            type="email"
                            name="EMAIL"
                            value={formData.EMAIL}
                            onChange={handleFieldChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Setor</label>
                        <input
                            type="text"
                            name="SETOR"
                            value={formData.SETOR || ""}
                            onChange={handleFieldChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Senha</label>
                        <input
                            type="password"
                            name="SENHA_USUARIO"
                            value={formData.SENHA_USUARIO || ""}
                            onChange={handleFieldChange}
                            placeholder={isEditing ? "Deixe em branco para não alterar" : ""}
                            required={!isEditing}
                        />
                    </div>

                    <div className="form-group">
                        <label>Perfis</label>
                        <div className="profile-checkbox-list">
                            {todosPerfis.map((perfil) => (
                                <div key={perfil.ID_PERFIL} className="profile-checkbox-item">
                                    <input
                                        type="checkbox"
                                        id={`perfil-${perfil.ID_PERFIL}`}
                                        checked={formData.ID_PERFIS.includes(perfil.ID_PERFIL)}
                                        onChange={() => handleProfileChange(perfil.ID_PERFIL)}
                                    />
                                    <label htmlFor={`perfil-${perfil.ID_PERFIL}`}>
                                        {perfil.NOME_PERFIL}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <select
                            name="ATIVO"
                            value={formData.ATIVO}
                            onChange={handleFieldChange}
                        >
                            <option value={1}>Ativo</option>
                            <option value={0}>Inativo</option>
                        </select>
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
