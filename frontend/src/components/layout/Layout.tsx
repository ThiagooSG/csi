import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUsuario, hasPermission } from "../../services/authService";
import { logout } from "../../utils/api";
import type { Usuario } from "../../services/authService";
import "./layout.css";

const menuItems = [
    {
        label: "Dashboard",
        path: "/home",
        icon: "fa-chart-line",
        requiredPermission: null,
    },
    {
        label: "Financeiro",
        path: "/financeiro",
        icon: "fa-dollar-sign",
        requiredPermission: null,
    },
    {
        label: "Gestão de Acessos",
        path: "/admin",
        icon: "fa-users-cog",
        requiredPermission: "ACESSAR_GESTAO_ACESSOS",
    },
];

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const usuario = getUsuario() as Usuario | null;

    // Estado para controlar se a sidebar está FIXA (pinned) no modo expandido
    const [isSidebarPinned, setIsSidebarPinned] = useState(false);

    // Salva e carrega a preferência do usuário do localStorage
    useEffect(() => {
        const savedPinState = localStorage.getItem("sidebarPinned");
        if (savedPinState) {
            setIsSidebarPinned(JSON.parse(savedPinState));
        }
    }, []);

    const togglePinSidebar = () => {
        const newState = !isSidebarPinned;
        setIsSidebarPinned(newState);
        localStorage.setItem("sidebarPinned", JSON.stringify(newState));
    };

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    if (!usuario) return null;

    // A classe principal agora controla o estado 'pinned'
    return (
        <div
            className={`layout-container ${isSidebarPinned ? "sidebar-pinned" : ""}`}
        >
            <header className="layout-header">
                <div className="header-left">
                    <img src="/logo_cic.jpg" alt="Logo" className="header-logo" />
                    <h1>Sistema Corporativo</h1>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <span className="user-name">{usuario.nome}</span>
                        <span className="user-role">
                            {usuario.permissoes?.includes("GERENCIAR_PERFIS")
                                ? "Administrador"
                                : "Usuário"}
                        </span>
                    </div>
                    <button onClick={handleLogout} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i>
                        <span className="logout-text">Sair</span>
                    </button>
                </div>
            </header>

            <nav className="sidebar">
                <div className="menu-section">
                    <h3 className="menu-title">MENU</h3>
                    <ul>
                        {menuItems.map((item) => {
                            if (
                                item.requiredPermission &&
                                !hasPermission(item.requiredPermission)
                            ) {
                                return null;
                            }
                            const isActive =
                                location.pathname === item.path ||
                                (item.path !== "/home" &&
                                    location.pathname.startsWith(item.path));
                            return (
                                <li key={item.path} title={!isSidebarPinned ? item.label : ""}>
                                    <a
                                        onClick={() => navigate(item.path)}
                                        className={isActive ? "active" : ""}
                                    >
                                        <i className={`fas ${item.icon}`}></i>
                                        <span className="menu-label">{item.label}</span>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="sidebar-toggle-wrapper">
                    <button
                        className="sidebar-toggle"
                        onClick={togglePinSidebar}
                        title={isSidebarPinned ? "Liberar Menu" : "Fixar Menu"}
                    >
                        <i
                            className={`fas ${isSidebarPinned ? "fa-thumbtack" : "fa-thumbtack"
                                }`}
                        ></i>
                        <span className="menu-label">
                            {isSidebarPinned ? "Liberar Menu" : "Fixar Menu"}
                        </span>
                    </button>
                </div>
            </nav>

            <main className="main-content">{children}</main>
        </div>
    );
};

export default Layout;
