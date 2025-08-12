import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 1. Importe o useNavigate
import GestaoUsuarios from "./GestaoUsuarios/GestaoUsuarios";
import GestaoPerfis from "./GestaoPerfis/GestaoPerfis";
import "./GestaoUsuarios/gestaousuarios.css";

type Aba = "usuarios" | "perfis";

const PaginaAdmin: React.FC = () => {
    const [abaAtiva, setAbaAtiva] = useState<Aba>("usuarios");
    const navigate = useNavigate(); // 2. Inicialize o hook de navegação

    return (
        <div className="gestao-container">
            {/* 3. Nova estrutura de cabeçalho para o título e o botão */}
            <div className="admin-page-header">
                <h1>Gestão de Acessos</h1>
                <button
                    className="gestao-btn secondary"
                    onClick={() => navigate("/home")}
                >
                    <i className="fas fa-home"></i> Voltar para a Home
                </button>
            </div>

            <div className="admin-tabs">
                <button
                    className={`tab-btn ${abaAtiva === "usuarios" ? "active" : ""}`}
                    onClick={() => setAbaAtiva("usuarios")}
                >
                    <i className="fas fa-users"></i> Gestão de Usuários
                </button>
                <button
                    className={`tab-btn ${abaAtiva === "perfis" ? "active" : ""}`}
                    onClick={() => setAbaAtiva("perfis")}
                >
                    <i className="fas fa-shield-alt"></i> Gestão de Perfis
                </button>
            </div>

            <div className="admin-content">
                {abaAtiva === "usuarios" && <GestaoUsuarios />}
                {abaAtiva === "perfis" && <GestaoPerfis />}
            </div>
        </div>
    );
};

export default PaginaAdmin;
