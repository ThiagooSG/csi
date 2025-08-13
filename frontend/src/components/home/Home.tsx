import React from "react";
import Layout from "../Layout/Layout"; // Importa o novo Layout
import { getUsuario } from "../../services/authService";
import type { Usuario } from "../../services/authService";
import "./Home.css"; // CSS apenas para o conteúdo da Home

const Home: React.FC = () => {
    const usuario = getUsuario() as Usuario | null;

    if (!usuario) {
        return (
            <Layout>
                <div>Carregando...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="welcome-card">
                <h2>
                    <i className="fas fa-hand-sparkles"></i>
                    Bem-vindo, {usuario.nome}!
                </h2>
                <p>
                    Selecione uma opção no menu à esquerda para começar a navegar no
                    sistema.
                </p>
            </div>

            <div className="quick-actions-card">
                <h3>Ações Rápidas</h3>
                <div className="actions-grid">
                    <div className="action-item">
                        <i className="fas fa-plus"></i>
                        <span>Novo Relatório</span>
                    </div>
                    <div className="action-item">
                        <i className="fas fa-user-cog"></i>
                        <span>Gerenciar Usuários</span>
                    </div>
                    <div className="action-item">
                        <i className="fas fa-file-invoice-dollar"></i>
                        <span>Ver Faturamento</span>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Home;
