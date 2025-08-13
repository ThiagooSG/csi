import React, { useState, useEffect, useCallback } from "react";
import { ListaPerfis } from "./ListaPerfis";
import { FormPerfil } from "./FormPerfil";
import { FormPermissoes } from "./FormPermissoes";
import { apiGet, apiDelete } from "../../../utils/api";
import { hasPermission } from "../../../services/authService";
import { toastService } from "../../../services/toastService";
import "../GestaoUsuarios/gestaousuarios.css";

// --- Sub-Componente: Modal de Confirmação de Exclusão ---
const ConfirmacaoDeleteModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    profileName: string;
}> = ({ onConfirm, onCancel, profileName }) => {
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
                    <p>Você tem certeza que deseja excluir o perfil:</p>
                    <p>
                        <strong>{profileName}</strong>?
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

interface Perfil {
    ID_PERFIL: number;
    NOME_PERFIL: string;
    DESCRICAO: string;
}

const GestaoPerfis: React.FC = () => {
    const [perfis, setPerfis] = useState<Perfil[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [perfilSelecionado, setPerfilSelecionado] = useState<Perfil | null>(
        null
    );
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
        useState(false);
    const [perfilParaExcluir, setPerfilParaExcluir] = useState<Perfil | null>(
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

    const handleOpenPermissionsModal = (perfil: Perfil) => {
        setPerfilSelecionado(perfil);
        setIsPermissionsModalOpen(true);
    };

    const handleClosePermissionsModal = () => {
        setIsPermissionsModalOpen(false);
        setPerfilSelecionado(null);
    };

    const handleDelete = (perfil: Perfil) => {
        setPerfilParaExcluir(perfil);
        setIsConfirmDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!perfilParaExcluir) return;
        const response = await apiDelete(
            `/api/perfis/${perfilParaExcluir.ID_PERFIL}`
        );
        if (response.success) {
            toastService.success(
                `Perfil "${perfilParaExcluir.NOME_PERFIL}" excluído com sucesso!`
            );
            fetchPerfis();
        } else {
            toastService.error(response.message || "Falha ao excluir perfil.");
        }
        setIsConfirmDeleteModalOpen(false);
        setPerfilParaExcluir(null);
    };

    return (
        <div className="gestao-container">
            <div className="gestao-header">
                <h2>Gestão de Perfis</h2>
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
                    onManagePermissions={(id) => {
                        const perfil = perfis.find((p) => p.ID_PERFIL === id);
                        if (perfil) handleOpenPermissionsModal(perfil);
                    }}
                    onDelete={(id) => {
                        const perfil = perfis.find((p) => p.ID_PERFIL === id);
                        if (perfil) handleDelete(perfil);
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

            {isPermissionsModalOpen && perfilSelecionado && (
                <FormPermissoes
                    perfilId={perfilSelecionado.ID_PERFIL}
                    perfilNome={perfilSelecionado.NOME_PERFIL}
                    onClose={handleClosePermissionsModal}
                />
            )}

            {isConfirmDeleteModalOpen && perfilParaExcluir && (
                <ConfirmacaoDeleteModal
                    onConfirm={executeDelete}
                    onCancel={() => setIsConfirmDeleteModalOpen(false)}
                    profileName={perfilParaExcluir.NOME_PERFIL}
                />
            )}
        </div>
    );
};

export default GestaoPerfis;
