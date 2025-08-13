import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Layout/Layout"; // Importa o Layout principal
import GestaoUsuarios from "./GestaoUsuarios/GestaoUsuarios";
import GestaoPerfis from "./GestaoPerfis/GestaoPerfis";
import "./GestaoUsuarios/gestaousuarios.css";

type Aba = "usuarios" | "perfis";

const PaginaAdmin: React.FC = () => {
    const [abaAtiva, setAbaAtiva] = useState<Aba>("usuarios");
    const navigate = useNavigate();

    return (
        <Layout>
            <div className="gestao-container">
                <div className="admin-page-header">
                    <h1>Gestão de Acessos</h1>
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
        </Layout>
    );
};

export default PaginaAdmin;
