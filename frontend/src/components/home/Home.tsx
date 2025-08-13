import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { getUsuario, hasPermission } from "../../services/authService";
import { logout } from "../../utils/api";
import type { Usuario } from "../../services/authService";

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const usuarioData = getUsuario();
        if (!usuarioData) {
            navigate("/");
            return;
        }
        setUsuario(usuarioData);
        setIsLoading(false);
    }, [navigate]);

    // O useEffect para o scroll pode ser removido se não for essencial, para simplificar.
    useEffect(() => {
        function checkScroll() {
            const container = containerRef.current;
            if (!container) return;
            container.classList.toggle(
                "has-scroll",
                container.scrollHeight > window.innerHeight
            );
        }
        checkScroll();
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    if (isLoading || !usuario) {
        // Mostra um loading mais robusto para evitar a "tela branca"
        return <div>Carregando...</div>;
    }

    return (
        <div className="home-container fade-in" ref={containerRef}>
            <header className="home-header">
                <div className="header-left">
                    <img src="/logo_cic.jpg" alt="Logo" className="header-logo" />
                    <h1>Sistema Corporativo</h1>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <span className="user-name">{usuario.nome}</span>
                        {/* Exibe o primeiro perfil do usuário, se existir */}
                        <span className="user-role">
                            {usuario.permissoes?.includes("GERENCIAR_PERFIS")
                                ? "Administrador"
                                : "Usuário"}
                        </span>
                    </div>
                    <button onClick={handleLogout} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i> Sair
                    </button>
                </div>
            </header>

            <nav className="sidebar">
                <div className="menu-section">
                    <h3>Menu Principal</h3>
                    <ul>
                        <li>
                            <a href="#dashboard">
                                <i className="fas fa-chart-line"></i> Dashboard
                            </a>
                        </li>
                        <li>
                            <a href="#relatorios">
                                <i className="fas fa-file-alt"></i> Relatórios
                            </a>
                        </li>
                        <li>
                            <a
                                onClick={() => navigate("/financeiro")}
                                style={{ cursor: "pointer" }}
                            >
                                <i className="fas fa-dollar-sign"></i> Financeiro
                            </a>
                        </li>
                        <li>
                            <a href="#contabilidade">
                                <i className="fas fa-book"></i> Contabilidade
                            </a>
                        </li>

                        {/* <<-- ÚNICO LINK PARA GESTÃO DE ACESSOS, AGORA CORRETO -->> */}
                        {hasPermission("ACESSAR_GESTAO_ACESSOS") && (
                            <li>
                                <a
                                    onClick={() => navigate("/admin")}
                                    style={{ cursor: "pointer" }}
                                >
                                    <i className="fas fa-users-cog"></i> Gestão de Acessos
                                </a>
                            </li>
                        )}

                        {/* <<-- LINK DE CONFIGURAÇÕES USANDO O NOVO SISTEMA -->> */}
                        {hasPermission("GERENCIAR_PERFIS") && (
                            <li>
                                <a href="#configuracoes">
                                    <i className="fas fa-cog"></i> Configurações
                                </a>
                            </li>
                        )}
                    </ul>
                </div>
            </nav>

            <main className="main-content">
                <div className="welcome-section">
                    <h2>
                        <i
                            className="fas fa-home"
                            style={{ marginRight: "10px", color: "#2563eb" }}
                        ></i>
                        Bem-vindo, {usuario.nome}!
                    </h2>
                    <p>Selecione uma opção no menu para começar</p>
                </div>
                <div className="quick-actions">
                    {/* ... (o resto do conteúdo pode continuar como está) ... */}
                </div>
            </main>
        </div>
    );
};

export default Home;
