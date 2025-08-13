import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import AjusteTaxa from "./components/AjusteTaxa/AjusteTaxa";
import AjustePortador from "./components/AjustePortador/AjustePortador";
import AjusteComissao from "./components/AjusteComissao/AjusteComissao";
import "./financeiro.css";
// PARA:
import { logout } from "../../utils/api";

interface Usuario {
  id: number;
  nome: string;
  login: string;
  admin: number;
}

const Financeiro: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [routeKey, setRouteKey] = useState(0);

  // Adicionado para ajuste dinâmico da rolagem
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function checkScroll() {
      const container = containerRef.current;
      if (!container) return;
      const contentHeight = container.scrollHeight;
      const windowHeight = window.innerHeight;
      if (contentHeight > windowHeight) {
        container.classList.add("has-scroll");
      } else {
        container.classList.remove("has-scroll");
      }
    }
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  useEffect(() => {
    const usuarioData = sessionStorage.getItem("usuario");
    if (!usuarioData) {
      navigate("/");
      return;
    }
    setUsuario(JSON.parse(usuarioData));
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [navigate]);

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

  if (!usuario) return null;

  const isFinanceiroHome =
    location.pathname === "/financeiro" || location.pathname === "/financeiro/";

  const handleMenuClick = (path: string) => {
    const fullPath = path.startsWith("/") ? path : `/financeiro/${path}`;
    if (location.pathname === fullPath) {
      setRouteKey((k) => k + 1); // Força remontagem do componente
    } else {
      navigate(fullPath);
    }
  };

  return (
    <div
      className={`financeiro-container ${!isLoading ? "fade-in" : ""}`}
      ref={containerRef}
    >
      <header className="financeiro-header">
        <div className="header-left">
          <img src="/logo_cic.jpg" alt="Logo" className="header-logo" />
          <h1>Sistema Financeiro</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{usuario.nome}</span>
            <span className="user-role">
              {usuario.admin === 1 ? "Administrador" : "Usuário"}
            </span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            Sair
          </button>
        </div>
      </header>

      <nav className="sidebar">
        <div className="menu-section">
          <h3>Menu Financeiro</h3>
          <ul>
            <li>
              <a
                onClick={() => handleMenuClick("ajuste-comissao")}
                style={{ cursor: "pointer" }}
                className={
                  location.pathname === "/financeiro/ajuste-comissao"
                    ? "active"
                    : ""
                }
              >
                <i className="fas fa-percentage"></i>
                Ajuste Comissão
              </a>
            </li>
            <li>
              <a
                onClick={() => handleMenuClick("ajuste-portador")}
                style={{ cursor: "pointer" }}
                className={
                  location.pathname === "/financeiro/ajuste-portador"
                    ? "active"
                    : ""
                }
              >
                <i className="fas fa-university"></i>
                Ajuste do Portador
              </a>
            </li>
            <li>
              <a
                onClick={() => handleMenuClick("ajuste-taxa")}
                style={{ cursor: "pointer" }}
                className={
                  location.pathname === "/financeiro/ajuste-taxa"
                    ? "active"
                    : ""
                }
              >
                <i className="fas fa-calculator"></i>
                Ajuste de Taxa
              </a>
            </li>
            {!isFinanceiroHome && (
              <li>
                <a
                  onClick={() => handleMenuClick("/financeiro")}
                  style={{ cursor: "pointer" }}
                >
                  <i className="fas fa-arrow-left"></i>
                  Voltar ao Financeiro
                </a>
              </li>
            )}
            <li>
              <a
                onClick={() => handleMenuClick("/home")}
                style={{ cursor: "pointer" }}
              >
                <i className="fas fa-home"></i>
                Voltar para Home
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <main className="main-content">
        <Routes key={routeKey}>
          <Route
            index
            element={
              <>
                <div className="welcome-section">
                  <h2>
                    <i
                      className="fas fa-dollar-sign"
                      style={{ marginRight: "10px", color: "#2563eb" }}
                    ></i>
                    Gestão Financeira
                  </h2>
                  <p>Selecione uma opção no menu para começar</p>
                </div>
                <div className="quick-actions">
                  <h3>
                    <i
                      className="fas fa-bolt"
                      style={{ marginRight: "8px", color: "#f59e42" }}
                    ></i>
                    Ações Rápidas
                  </h3>
                  <div className="actions-grid">
                    <button
                      className="action-card"
                      onClick={() => handleMenuClick("ajuste-comissao")}
                    >
                      <i className="fas fa-percentage"></i>
                      <span>Comissão</span>
                    </button>
                    <button
                      className="action-card"
                      onClick={() => handleMenuClick("ajuste-portador")}
                    >
                      <i className="fas fa-university"></i>
                      <span>Portador</span>
                    </button>
                    <button
                      className="action-card"
                      onClick={() => handleMenuClick("ajuste-taxa")}
                    >
                      <i className="fas fa-calculator"></i>
                      <span>Taxa</span>
                    </button>
                  </div>
                </div>
              </>
            }
          />
          <Route path="ajuste-taxa" element={<AjusteTaxa key={routeKey} />} />
          <Route
            path="ajuste-portador"
            element={<AjustePortador key={routeKey} />}
          />
          <Route
            path="ajuste-comissao"
            element={<AjusteComissao key={routeKey} />}
          />
        </Routes>
      </main>
    </div>
  );
};

export default Financeiro;
