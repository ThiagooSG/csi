import React from "react";
import { hasPermission } from "../../../services/authService";

interface Perfil {
    ID_PERFIL: number;
    NOME_PERFIL: string;
    DESCRICAO: string;
}

interface Props {
    perfis: Perfil[];
    onEdit: (perfil: Perfil) => void;
    onManagePermissions: (id: number) => void;
    onDelete: (id: number) => void; // Adicionada a propriedade de exclusão
}

export const ListaPerfis: React.FC<Props> = ({
    perfis,
    onEdit,
    onManagePermissions,
    onDelete, // Recebe a função
}) => {
    return (
        <table className="gestao-table">
            <thead>
                <tr>
                    <th>Nome do Perfil</th>
                    <th>Descrição</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                {perfis.map((perfil) => (
                    <tr key={perfil.ID_PERFIL}>
                        <td>{perfil.NOME_PERFIL}</td>
                        <td>{perfil.DESCRICAO}</td>
                        <td className="actions">
                            {hasPermission("GERENCIAR_PERFIS") && (
                                <>
                                    <button
                                        className="gestao-btn"
                                        onClick={() => onManagePermissions(perfil.ID_PERFIL)}
                                    >
                                        <i className="fas fa-lock"></i> Permissões
                                    </button>
                                    <button
                                        className="gestao-btn secondary"
                                        onClick={() => onEdit(perfil)}
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    {/* Adicionado o botão de exclusão */}
                                    <button
                                        className="gestao-btn danger"
                                        onClick={() => onDelete(perfil.ID_PERFIL)}
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
