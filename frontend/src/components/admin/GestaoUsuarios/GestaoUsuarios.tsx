import React, { useState, useEffect, useCallback } from "react";
import { ListaUsuarios } from "./ListaUsuarios";
import { FormUsuario } from "./FormUsuario";
import { apiGet, apiDelete } from "../../../utils/api";
import { hasPermission } from "../../../services/authService";
import "./gestaousuarios.css";

interface Usuario {
    ID_USUARIOS: number;
    NOME_USUARIO: string;
    LOGIN_USUARIO: string;
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

    // Estados para o formulário modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<any | null>(
        null
    );

    // --- NOVOS ESTADOS PARA PAGINAÇÃO E FILTRO ---
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [limit, setLimit] = useState(10); // Itens por página

    // Função para carregar ou recarregar os usuários com filtros
    const fetchUsuarios = useCallback(
        async (page: number, search: string) => {
            setLoading(true);
            setError(null);
            try {
                // Constrói a URL com os parâmetros de paginação e busca
                const url = `/api/usuarios?page=${page}&limit=${limit}&search=${search}`;
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
    ); // 'limit' é uma dependência

    // Efeito para buscar os dados quando a página ou o filtro mudam
    useEffect(() => {
        // Debounce: espera um pouco após o usuário parar de digitar para fazer a busca
        const handler = setTimeout(() => {
            fetchUsuarios(currentPage, searchTerm);
        }, 500); // 500ms de espera

        return () => {
            clearTimeout(handler); // Limpa o timeout se o usuário digitar novamente
        };
    }, [fetchUsuarios, currentPage, searchTerm]);

    // Funções para controlar o modal (sem alterações)
    const handleOpenModal = (usuario: any | null) => {
        setUsuarioSelecionado(usuario);
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setUsuarioSelecionado(null);
    };
    const handleSave = () => {
        handleCloseModal();
        fetchUsuarios(currentPage, searchTerm);
    };
    const handleDelete = async (id: number) => {
        if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
            const response = await apiDelete(`/api/usuarios/${id}`);
            if (response.success) {
                fetchUsuarios(currentPage, searchTerm);
            } else {
                alert(response.message || "Falha ao excluir usuário.");
            }
        }
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

            {/* --- NOVOS CONTROLES DE FILTRO --- */}
            <div className="filter-controls">
                <input
                    type="text"
                    placeholder="Buscar por nome ou login..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Volta para a primeira página ao buscar
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
                        onDelete={handleDelete}
                    />

                    {/* --- NOVOS CONTROLES DE PAGINAÇÃO --- */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                onClick={() => setCurrentPage((prev) => prev - 1)}
                                disabled={pagination.currentPage === 1}
                                className="gestao-btn"
                            >
                                Anterior
                            </button>
                            <span>
                                Página {pagination.currentPage} de {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="gestao-btn"
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </>
            )}

            {isModalOpen && (
                <FormUsuario
                    usuarioParaEditar={usuarioSelecionado}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default GestaoUsuarios;
