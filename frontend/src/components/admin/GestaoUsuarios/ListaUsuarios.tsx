import React from "react";
import { hasPermission } from "../../../services/authService";

// 1. Atualize a interface para incluir os novos campos
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

interface Props {
    usuarios: Usuario[];
    onEdit: (usuario: Usuario) => void;
    onDelete: (id: number) => void;
}

export const ListaUsuarios: React.FC<Props> = ({
    usuarios,
    onEdit,
    onDelete,
}) => {
    return (
        <table className="gestao-table">
            <thead>
                <tr>
                    {/* 2. Adicione as novas colunas */}
                    <th>Nome</th>
                    <th>Login</th>
                    <th>E-mail</th>
                    <th>Setor</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                {usuarios.map((usuario) => (
                    <tr key={usuario.ID_USUARIOS}>
                        {/* 3. Renderize os novos dados */}
                        <td>{usuario.NOME_USUARIO}</td>
                        <td>{usuario.LOGIN_USUARIO}</td>
                        <td>{usuario.EMAIL || "-"}</td>
                        <td>{usuario.SETOR || "-"}</td>
                        <td>{usuario.NOME_PERFIL || "Não definido"}</td>
                        <td>
                            <span
                                className={`status-badge ${usuario.ATIVO === 1 ? "ativo" : "inativo"
                                    }`}
                            >
                                {usuario.ATIVO === 1 ? "Ativo" : "Inativo"}
                            </span>
                        </td>
                        <td className="actions">
                            {hasPermission("GERENCIAR_USUARIOS") && (
                                <>
                                    <button
                                        className="gestao-btn secondary"
                                        onClick={() => onEdit(usuario)}
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                        className="gestao-btn danger"
                                        onClick={() => onDelete(usuario.ID_USUARIOS)}
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
