import React, { useState, useEffect, useCallback } from "react";
import { ListaPerfis } from "./ListaPerfis";
import { FormPerfil } from "./FormPerfil";
import { FormPermissoes } from "./FormPermissoes"; // 1. Importe o novo componente
import { apiGet } from "../../../utils/api";
import { hasPermission } from "../../../services/authService";
import "../GestaoUsuarios/gestaousuarios.css";

interface Perfil {
    ID_PERFIL: number;
    NOME_PERFIL: string;
    DESCRICAO: string;
}

const GestaoPerfis: React.FC = () => {
    const [perfis, setPerfis] = useState<Perfil[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados para controlar os modais
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false); // 2. Novo estado

    const [perfilSelecionado, setPerfilSelecionado] = useState<Perfil | null>(
        null
    );

    const fetchPerfis = useCallback(async () => {
        setLoading(true);
        const response = await apiGet<{ data: Perfil[] }>("/api/perfis");
        if (response.success && response.data) {
            setPerfis(response.data.data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPerfis();
    }, [fetchPerfis]);

    // Funções para o modal de criar/editar perfil
    const handleOpenFormModal = (perfil: Perfil | null) => {
        setPerfilSelecionado(perfil);
        setIsFormModalOpen(true);
    };
    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setPerfilSelecionado(null);
    };
    const handleSaveForm = () => {
        handleCloseFormModal();
        fetchPerfis();
    };

    // 3. Funções para o modal de permissões
    const handleOpenPermissionsModal = (perfil: Perfil) => {
        setPerfilSelecionado(perfil);
        setIsPermissionsModalOpen(true);
    };
    const handleClosePermissionsModal = () => {
        setIsPermissionsModalOpen(false);
        setPerfilSelecionado(null);
    };

    return (
        <div className="gestao-container">
            <div className="gestao-header">
                <h2>Gestão de Perfis</h2>

                {/* 2. Adicione a condição aqui */}
                {hasPermission("GERENCIAR_PERFIS") && (
                    <button
                        className="gestao-btn"
                        onClick={() => handleOpenFormModal(null)}
                    >
                        <i className="fas fa-plus"></i> Novo Perfil
                    </button>
                )}
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : (
                <ListaPerfis
                    perfis={perfis}
                    onEdit={handleOpenFormModal}
                    // 4. Passa a função correta para o botão
                    onManagePermissions={(id) => {
                        const perfil = perfis.find((p) => p.ID_PERFIL === id);
                        if (perfil) handleOpenPermissionsModal(perfil);
                    }}
                />
            )}

            {isFormModalOpen && (
                <FormPerfil
                    perfilParaEditar={perfilSelecionado}
                    onClose={handleCloseFormModal}
                    onSave={handleSaveForm}
                />
            )}

            {/* 5. Renderiza o novo modal quando o estado for true */}
            {isPermissionsModalOpen && perfilSelecionado && (
                <FormPermissoes
                    perfilId={perfilSelecionado.ID_PERFIL}
                    perfilNome={perfilSelecionado.NOME_PERFIL}
                    onClose={handleClosePermissionsModal}
                />
            )}
        </div>
    );
};

export default GestaoPerfis;
