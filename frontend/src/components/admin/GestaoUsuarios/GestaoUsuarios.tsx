import React, { useState, useEffect, useCallback } from "react";
import { ListaUsuarios } from "./ListaUsuarios";
import { FormUsuario } from "./FormUsuario";
import { apiGet, apiDelete } from "../../../utils/api";
import { hasPermission } from "../../../services/authService";
import { toastService } from "../../../services/toastService";
import "./gestaousuarios.css";

// --- Sub-Componente: Modal de Confirmação de Exclusão ---
const ConfirmacaoDeleteModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    userName: string;
}> = ({ onConfirm, onCancel, userName }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Confirmar Exclusão</h3>
                    <button onClick={onCancel} className="modal-close-btn">
                        &times;
                    </button>
                </div>
                <div className="confirmation-body">
                    <p>Você tem certeza que deseja excluir o usuário:</p>
                    <p>
                        <strong>{userName}</strong>?
                    </p>
                    <p>Esta ação não pode ser desfeita.</p>
                </div>
                <div className="modal-footer">
                    <button className="gestao-btn secondary" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button className="gestao-btn danger" onClick={onConfirm}>
                        Sim, Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

interface Usuario {
    ID_USUARIOS: number;
    NOME_USUARIO: string;
    LOGIN_USUARIO: string;
    EMAIL: string;
    SETOR: string;
    ATIVO: number;
    NOME_PERFIL: string;
    ID_PERFIS: number[];
}

interface Pagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
}

const GestaoUsuarios: React.FC = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(
        null
    );

    // Estados agora controlam os parâmetros da API
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [limit] = useState(10);

    // Estado para o modal de confirmação de exclusão
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
        useState(false);
    const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(
        null
    );

    // Função agora envia os parâmetros para o backend
    const fetchUsuarios = useCallback(
        async (page: number, search: string) => {
            setLoading(true);
            setError(null);
            try {
                const url = `/api/usuarios?page=${page}&limit=${limit}&search=${encodeURIComponent(
                    search
                )}`;
                const response = await apiGet<{
                    data: Usuario[];
                    pagination: Pagination;
                }>(url);

                if (response.success && response.data) {
                    setUsuarios(response.data.data);
                    setPagination(response.data.pagination);
                } else {
                    setError(response.message || "Falha ao carregar usuários.");
                    setUsuarios([]);
                    setPagination(null);
                }
            } catch (err) {
                setError("Erro de conexão ao buscar usuários.");
            } finally {
                setLoading(false);
            }
        },
        [limit]
    );

    // useEffect agora dispara a busca na API quando a página ou o filtro mudam
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchUsuarios(currentPage, searchTerm);
        }, 300); // Debounce de 300ms para a busca

        return () => {
            clearTimeout(handler);
        };
    }, [fetchUsuarios, currentPage, searchTerm]);

    const handleOpenModal = (usuario: Usuario | null) => {
        setUsuarioSelecionado(usuario);
        setIsFormModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsFormModalOpen(false);
        setUsuarioSelecionado(null);
    };
    const handleSave = () => {
        handleCloseModal();
        // Recarrega a página atual para refletir as mudanças
        fetchUsuarios(currentPage, searchTerm);
    };

    const handleDelete = (usuario: Usuario) => {
        setUsuarioParaExcluir(usuario);
        setIsConfirmDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!usuarioParaExcluir) return;
        const response = await apiDelete(
            `/api/usuarios/${usuarioParaExcluir.ID_USUARIOS}`
        );
        if (response.success) {
            toastService.success(
                `Usuário "${usuarioParaExcluir.NOME_USUARIO}" excluído com sucesso!`
            );
            // Se o item excluído era o último da página, volta para a página anterior
            if (usuarios.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            } else {
                fetchUsuarios(currentPage, searchTerm);
            }
        } else {
            toastService.error(response.message || "Falha ao excluir usuário.");
        }
        setIsConfirmDeleteModalOpen(false);
        setUsuarioParaExcluir(null);
    };

    return (
        <div className="gestao-container">
            <div className="gestao-header">
                <h2>Gestão de Usuários</h2>
                {hasPermission("GERENCIAR_USUARIOS") && (
                    <button className="gestao-btn" onClick={() => handleOpenModal(null)}>
                        <i className="fas fa-plus"></i> Novo Usuário
                    </button>
                )}
            </div>

            <div className="filter-controls">
                <input
                    type="text"
                    placeholder="Buscar por nome ou login..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {loading && <p>Carregando...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {!loading && !error && (
                <>
                    <ListaUsuarios
                        usuarios={usuarios}
                        onEdit={handleOpenModal}
                        onDelete={(id) => {
                            const user = usuarios.find((u) => u.ID_USUARIOS === id);
                            if (user) handleDelete(user);
                        }}
                    />
                    {pagination && pagination.totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                onClick={() => setCurrentPage((p) => p - 1)}
                                disabled={pagination.currentPage === 1}
                                className="gestao-btn"
                            >
                                Anterior
                            </button>
                            <span>
                                Página {pagination.currentPage} de {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((p) => p + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="gestao-btn"
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </>
            )}

            {isFormModalOpen && (
                <FormUsuario
                    usuarioParaEditar={usuarioSelecionado}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}
            {isConfirmDeleteModalOpen && usuarioParaExcluir && (
                <ConfirmacaoDeleteModal
                    onConfirm={executeDelete}
                    onCancel={() => setIsConfirmDeleteModalOpen(false)}
                    userName={usuarioParaExcluir.NOME_USUARIO}
                />
            )}
        </div>
    );
};

export default GestaoUsuarios;
