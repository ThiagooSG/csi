import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ListaUsuarios } from "./ListaUsuarios";
import { FormUsuario } from "./FormUsuario";
import { apiGet, apiDelete } from "../../../utils/api";
import { hasPermission } from "../../../services/authService";
import "./gestaousuarios.css";

interface Usuario {
    ID_USUARIOS: number;
    NOME_USUARIO: string;
    LOGIN_USUARIO: string;
    EMAIL: string;
    SETOR: string;
    ATIVO: number;
    NOME_PERFIL: string; // Nomes dos perfis agregados
    ID_PERFIS: number[]; // IDs dos perfis agregados
}

const GestaoUsuarios: React.FC = () => {
    const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<any | null>(
        null
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [limit] = useState(10);

    // Função para buscar e processar os dados
    const fetchUsuarios = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiGet<{ data: any[] }>("/api/usuarios");
            if (response.success && response.data) {
                // LÓGICA DE AGRUPAMENTO NO FRONTEND
                const userMap = new Map<number, Usuario>();
                for (const row of response.data.data) {
                    const userId = row.ID_USUARIOS;
                    if (!userMap.has(userId)) {
                        userMap.set(userId, {
                            ID_USUARIOS: userId,
                            LOGIN_USUARIO: row.LOGIN_USUARIO,
                            NOME_USUARIO: row.NOME_USUARIO,
                            EMAIL: row.EMAIL,
                            SETOR: row.SETOR_USUARIO,
                            ATIVO: row.ATIVO,
                            ID_PERFIS: [],
                            NOME_PERFIL: "",
                        });
                    }
                    if (row.ID_PERFIL) {
                        const user = userMap.get(userId)!;
                        user.ID_PERFIS.push(row.ID_PERFIL);
                        user.NOME_PERFIL = user.NOME_PERFIL
                            ? `${user.NOME_PERFIL}, ${row.NOME_PERFIL}`
                            : row.NOME_PERFIL;
                    }
                }
                setTodosUsuarios(Array.from(userMap.values()));
            } else {
                setError(response.message || "Falha ao carregar utilizadores.");
            }
        } catch (err) {
            setError("Erro de conexão ao buscar utilizadores.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsuarios();
    }, [fetchUsuarios]);

    // LÓGICA DE FILTRO E PAGINAÇÃO NO FRONTEND
    const usuariosFiltrados = useMemo(() => {
        if (!searchTerm) return todosUsuarios;
        return todosUsuarios.filter(
            (user) =>
                user.NOME_USUARIO?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.LOGIN_USUARIO?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [todosUsuarios, searchTerm]);

    const totalPages = Math.ceil(usuariosFiltrados.length / limit);
    const usuariosPaginados = usuariosFiltrados.slice(
        (currentPage - 1) * limit,
        currentPage * limit
    );

    // ... (resto das funções handleOpenModal, handleCloseModal, etc. não mudam)
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
        fetchUsuarios();
    };
    const handleDelete = async (id: number) => {
        if (window.confirm("Tem certeza?")) {
            await apiDelete(`/api/usuarios/${id}`);
            fetchUsuarios();
        }
    };

    return (
        <div className="gestao-container">
            <div className="gestao-header">
                <h2>Gestão de Utilizadores</h2>
                {hasPermission("GERENCIAR_USUARIOS") && (
                    <button className="gestao-btn" onClick={() => handleOpenModal(null)}>
                        <i className="fas fa-plus"></i> Novo Utilizador
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

            {loading ? (
                <p>Carregando...</p>
            ) : error ? (
                <p style={{ color: "red" }}>{error}</p>
            ) : (
                <>
                    <ListaUsuarios
                        usuarios={usuariosPaginados}
                        onEdit={handleOpenModal}
                        onDelete={handleDelete}
                    />

                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                onClick={() => setCurrentPage((p) => p - 1)}
                                disabled={currentPage === 1}
                                className="gestao-btn"
                            >
                                Anterior
                            </button>
                            <span>
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((p) => p + 1)}
                                disabled={currentPage === totalPages}
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
